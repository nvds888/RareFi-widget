(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('axios'), require('algosdk')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react', 'axios', 'algosdk'], factory) :
  (global = global || self, factory(global.widget = {}, global.react, global.axios, global.algosdk));
})(this, (function (exports, React, axios, algosdk) {
  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
  var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);
  var algosdk__default = /*#__PURE__*/_interopDefaultLegacy(algosdk);

  function formatTokenAmount(amount, decimals) {
    if (decimals === void 0) {
      decimals = 6;
    }
    if (!amount && amount !== 0) return '0.00';
    var val = amount / Math.pow(10, decimals);
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
    return val.toFixed(2);
  }
  function parseTokenAmount(value, decimals) {
    if (decimals === void 0) {
      decimals = 6;
    }
    if (!value) return 0;
    var str = String(value).trim();
    if (str.startsWith('-') || /[eE]/.test(str)) return 0;
    var parsed = parseFloat(str);
    if (isNaN(parsed) || parsed <= 0 || parsed > 1e15) return 0;
    return Math.floor(parsed * Math.pow(10, decimals));
  }
  function formatMaxAmount(balanceInBaseUnits, decimals) {
    if (decimals === void 0) {
      decimals = 6;
    }
    return (Math.floor(balanceInBaseUnits / Math.pow(10, decimals - 2)) / 100).toFixed(2);
  }

  /**
   * Decode base64-encoded unsigned transactions from the RareFi backend,
   * sign them using the provided signer, and submit them.
   *
   * @param {string[]} b64Txns - Array of base64-encoded unsigned transactions
   * @param {Function} signTransactions - Signer from host wallet (e.g. useWallet().signTransactions)
   * @param {string} apiUrl - RareFi backend base URL
   * @returns {Promise<string>} transaction ID
   */
  var decodeSignAndSubmit = function decodeSignAndSubmit(b64Txns, signTransactions, apiUrl) {
    try {
      var txnGroup = b64Txns.map(function (b64) {
        return algosdk__default["default"].decodeUnsignedTransaction(Buffer.from(b64, 'base64'));
      });
      return Promise.resolve(signTransactions(txnGroup)).then(function (signedTxns) {
        var signedTxnsBase64 = signedTxns.map(function (t) {
          return Buffer.from(t).toString('base64');
        });
        return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/submit", {
          signedTxns: signedTxnsBase64
        })).then(function (response) {
          return response.data.txId;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  function _catch$1(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }
    if (result && result.then) {
      return result.then(void 0, recover);
    }
    return result;
  }
  var EXPLORER_URL = 'https://explorer.perawallet.app';

  // ── Tiny asset avatar ─────────────────────────────────────────────────────────
  function AssetAvatar(_ref) {
    var name = _ref.name,
      imageUrl = _ref.imageUrl,
      _ref$size = _ref.size,
      size = _ref$size === void 0 ? 28 : _ref$size;
    var _useState = React.useState(false),
      err = _useState[0],
      setErr = _useState[1];
    if (imageUrl && !err) {
      return /*#__PURE__*/React__default["default"].createElement("img", {
        src: imageUrl,
        alt: name,
        onError: function onError() {
          return setErr(true);
        },
        style: {
          width: size,
          height: size,
          borderRadius: 6,
          objectFit: 'cover',
          flexShrink: 0
        }
      });
    }
    return /*#__PURE__*/React__default["default"].createElement("span", {
      style: {
        width: size,
        height: size,
        borderRadius: 6,
        background: '#e5e7eb',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        color: '#6b7280',
        flexShrink: 0
      }
    }, (name || '?')[0].toUpperCase());
  }

  // ── Spinner ───────────────────────────────────────────────────────────────────
  function Spinner(_ref2) {
    var _ref2$size = _ref2.size,
      size = _ref2$size === void 0 ? 20 : _ref2$size;
    return /*#__PURE__*/React__default["default"].createElement("span", {
      style: {
        display: 'inline-block',
        width: size,
        height: size,
        border: "2px solid #e5e7eb",
        borderTopColor: '#111',
        borderRadius: '50%',
        animation: 'rfw-spin 0.7s linear infinite'
      }
    });
  }

  // ── Tx status screen (signing / submitting / success / error) ─────────────────
  function TxStatus(_ref3) {
    var step = _ref3.step,
      txId = _ref3.txId,
      label = _ref3.label,
      onDone = _ref3.onDone;
    if (step === 'signing' || step === 'submitting') {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-txstatus"
      }, /*#__PURE__*/React__default["default"].createElement(Spinner, {
        size: 32
      }), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-txstatus-title"
      }, step === 'signing' ? 'Waiting for signature' : 'Broadcasting…'), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-txstatus-sub"
      }, step === 'signing' ? 'Confirm in your wallet' : 'Submitting to Algorand'));
    }
    if (step === 'success') {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-txstatus"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-txstatus-check"
      }, "\u2713"), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-txstatus-title"
      }, label), txId && /*#__PURE__*/React__default["default"].createElement("a", {
        href: EXPLORER_URL + "/tx/" + txId,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "rfw-explorer-link"
      }, "View on Explorer \u2197"), /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-btn rfw-btn-primary",
        style: {
          marginTop: 12
        },
        onClick: onDone
      }, "Done"));
    }
    return null;
  }

  // ── Deposit panel ─────────────────────────────────────────────────────────────
  function DepositPanel(_ref4) {
    var pools = _ref4.pools,
      userAddress = _ref4.userAddress,
      signTransactions = _ref4.signTransactions,
      apiUrl = _ref4.apiUrl,
      assetName = _ref4.assetName,
      onBack = _ref4.onBack,
      onSuccess = _ref4.onSuccess;
    var _useState2 = React.useState(pools[0] || null),
      selectedPool = _useState2[0],
      setSelectedPool = _useState2[1];
    var _useState3 = React.useState(''),
      amount = _useState3[0],
      setAmount = _useState3[1];
    var _useState4 = React.useState(null),
      isOptedIn = _useState4[0],
      setIsOptedIn = _useState4[1]; // null = loading
    var _useState5 = React.useState('input'),
      step = _useState5[0],
      setStep = _useState5[1];
    var _useState6 = React.useState(''),
      txId = _useState6[0],
      setTxId = _useState6[1];
    var _useState7 = React.useState(''),
      error = _useState7[0],
      setError = _useState7[1];
    React__default["default"].useEffect(function () {
      if (!selectedPool || !userAddress) {
        setIsOptedIn(false);
        return;
      }
      axios__default["default"].get(apiUrl + "/pools/" + selectedPool.id + "/position/" + userAddress).then(function (r) {
        var _r$data$position;
        return setIsOptedIn(((_r$data$position = r.data.position) == null ? void 0 : _r$data$position.isOptedIn) || false);
      })["catch"](function () {
        return setIsOptedIn(false);
      });
    }, [selectedPool, userAddress, apiUrl]);
    var handleOptIn = function handleOptIn() {
      try {
        setStep('signing');
        setError('');
        var _temp = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/opt-in", {
            userAddress: userAddress
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (txId) {
              setIsOptedIn(true);
              setStep('input');
            });
          });
        }, function (err) {
          var _err$response;
          setError(((_err$response = err.response) == null || (_err$response = _err$response.data) == null ? void 0 : _err$response.error) || err.message || 'Opt-in failed');
          setStep('input');
        });
        return Promise.resolve(_temp && _temp.then ? _temp.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    var handleDeposit = function handleDeposit(e) {
      try {
        e.preventDefault();
        var units = parseTokenAmount(amount);
        if (units <= 0) {
          setError('Enter a valid amount');
          return Promise.resolve();
        }
        if (units < 1000000) {
          setError('Minimum deposit is 1 ' + assetName);
          return Promise.resolve();
        }
        setStep('signing');
        setError('');
        var _temp2 = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/deposit", {
            userAddress: userAddress,
            amount: units
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (id) {
              setTxId(id);
              setStep('success');
            });
          });
        }, function (err) {
          var _err$response2;
          setError(((_err$response2 = err.response) == null || (_err$response2 = _err$response2.data) == null ? void 0 : _err$response2.error) || err.message || 'Deposit failed');
          setStep('input');
        });
        return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: step
    });
    if (step === 'success') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: "success",
      txId: txId,
      label: "Deposit successful",
      onDone: onSuccess
    });
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Deposit ", assetName), /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label"
    }, "Receive yield in"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, pools.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setSelectedPool(p);
          setError('');
        }
      }, isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-compound-badge"
      }, "\u21BB"), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, yieldAsset));
    })), isOptedIn === null && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted"
    }, "Checking vault status\u2026"), isOptedIn === false && /*#__PURE__*/React__default["default"].createElement("div", null, /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted",
      style: {
        marginBottom: 8
      }
    }, "You need to opt into this vault first."), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-primary",
      onClick: handleOptIn
    }, "Opt In")), isOptedIn === true && /*#__PURE__*/React__default["default"].createElement("form", {
      onSubmit: handleDeposit
    }, /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label"
    }, "Amount"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-input-row"
    }, /*#__PURE__*/React__default["default"].createElement("input", {
      className: "rfw-input",
      type: "number",
      placeholder: "0.00",
      value: amount,
      onChange: function onChange(e) {
        return setAmount(e.target.value);
      },
      step: "0.01",
      min: "0"
    })), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      type: "submit",
      className: "rfw-btn rfw-btn-primary",
      disabled: !amount || parseFloat(amount) <= 0
    }, "Deposit")));
  }

  // ── Withdraw panel ────────────────────────────────────────────────────────────
  function WithdrawPanel(_ref5) {
    var pools = _ref5.pools,
      positions = _ref5.positions,
      userAddress = _ref5.userAddress,
      signTransactions = _ref5.signTransactions,
      apiUrl = _ref5.apiUrl,
      assetName = _ref5.assetName,
      onBack = _ref5.onBack,
      onSuccess = _ref5.onSuccess;
    var poolsWithDeposits = pools.filter(function (p) {
      var _positions$p$id;
      return (((_positions$p$id = positions[p.id]) == null ? void 0 : _positions$p$id.depositedAmount) || 0) > 0;
    });
    var _useState8 = React.useState(poolsWithDeposits[0] || null),
      selectedPool = _useState8[0],
      setSelectedPool = _useState8[1];
    var _useState9 = React.useState(''),
      amount = _useState9[0],
      setAmount = _useState9[1];
    var _useState0 = React.useState('input'),
      step = _useState0[0],
      setStep = _useState0[1];
    var _useState1 = React.useState(''),
      txId = _useState1[0],
      setTxId = _useState1[1];
    var _useState10 = React.useState(''),
      error = _useState10[0],
      setError = _useState10[1];
    var position = selectedPool ? positions[selectedPool.id] : null;
    var deposited = (position == null ? void 0 : position.depositedAmount) || 0;
    var handleWithdraw = function handleWithdraw(e) {
      try {
        e.preventDefault();
        var units = parseTokenAmount(amount);
        if (units <= 0) {
          setError('Enter a valid amount');
          return Promise.resolve();
        }
        if (units > deposited) {
          setError('Exceeds deposited balance');
          return Promise.resolve();
        }
        setStep('signing');
        setError('');
        var _temp3 = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/withdraw", {
            userAddress: userAddress,
            amount: units
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (id) {
              setTxId(id);
              setStep('success');
            });
          });
        }, function (err) {
          var _err$response3;
          setError(((_err$response3 = err.response) == null || (_err$response3 = _err$response3.data) == null ? void 0 : _err$response3.error) || err.message || 'Withdraw failed');
          setStep('input');
        });
        return Promise.resolve(_temp3 && _temp3.then ? _temp3.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: step
    });
    if (step === 'success') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: "success",
      txId: txId,
      label: "Withdrawal successful",
      onDone: onSuccess
    });
    if (poolsWithDeposits.length === 0) {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-panel"
      }, /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-back",
        onClick: onBack
      }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-muted"
      }, "No deposits to withdraw."));
    }
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Withdraw ", assetName), poolsWithDeposits.length > 1 && /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label"
    }, "From vault"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, poolsWithDeposits.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
      var pos = positions[p.id];
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setSelectedPool(p);
          setAmount('');
          setError('');
        }
      }, isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-compound-badge"
      }, "\u21BB"), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, yieldAsset), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-amount"
      }, formatTokenAmount(pos == null ? void 0 : pos.depositedAmount)));
    }))), /*#__PURE__*/React__default["default"].createElement("form", {
      onSubmit: handleWithdraw
    }, /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label"
    }, "Amount"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-input-row"
    }, /*#__PURE__*/React__default["default"].createElement("input", {
      className: "rfw-input",
      type: "number",
      placeholder: "0.00",
      value: amount,
      onChange: function onChange(e) {
        return setAmount(e.target.value);
      },
      step: "0.01",
      min: "0"
    }), /*#__PURE__*/React__default["default"].createElement("button", {
      type: "button",
      className: "rfw-max-btn",
      onClick: function onClick() {
        return setAmount(formatMaxAmount(deposited));
      }
    }, "MAX")), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-helper"
    }, "Deposited: ", formatTokenAmount(deposited), " ", assetName), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      type: "submit",
      className: "rfw-btn rfw-btn-secondary",
      disabled: !amount || parseFloat(amount) <= 0
    }, "Withdraw")));
  }

  // ── Claim panel ───────────────────────────────────────────────────────────────
  function ClaimPanel(_ref6) {
    var pools = _ref6.pools,
      positions = _ref6.positions,
      userAddress = _ref6.userAddress,
      signTransactions = _ref6.signTransactions,
      apiUrl = _ref6.apiUrl,
      onBack = _ref6.onBack,
      onSuccess = _ref6.onSuccess;
    var poolsWithYield = pools.filter(function (p) {
      var _positions$p$id2;
      return (((_positions$p$id2 = positions[p.id]) == null ? void 0 : _positions$p$id2.pendingYield) || 0) > 0;
    });
    var _useState11 = React.useState(poolsWithYield[0] || null),
      selectedPool = _useState11[0],
      setSelectedPool = _useState11[1];
    var _useState12 = React.useState('confirm'),
      step = _useState12[0],
      setStep = _useState12[1];
    var _useState13 = React.useState(''),
      txId = _useState13[0],
      setTxId = _useState13[1];
    var _useState14 = React.useState(''),
      error = _useState14[0],
      setError = _useState14[1];
    var position = selectedPool ? positions[selectedPool.id] : null;
    var pending = (position == null ? void 0 : position.pendingYield) || 0;
    var yieldAsset = (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA';
    var handleClaim = function handleClaim() {
      try {
        setStep('signing');
        setError('');
        var _temp4 = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/claim", {
            userAddress: userAddress
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (id) {
              setTxId(id);
              setStep('success');
            });
          });
        }, function (err) {
          var _err$response4;
          setError(((_err$response4 = err.response) == null || (_err$response4 = _err$response4.data) == null ? void 0 : _err$response4.error) || err.message || 'Claim failed');
          setStep('confirm');
        });
        return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: step
    });
    if (step === 'success') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: "success",
      txId: txId,
      label: "Yield claimed",
      onDone: onSuccess
    });
    if (poolsWithYield.length === 0) {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-panel"
      }, /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-back",
        onClick: onBack
      }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-muted"
      }, "No pending yield to claim."));
    }
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Claim Yield"), poolsWithYield.length > 1 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, poolsWithYield.map(function (p) {
      var pos = positions[p.id];
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setSelectedPool(p);
          setError('');
        }
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, p.swapAssetName || 'ASA'), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-amount"
      }, formatTokenAmount(pos == null ? void 0 : pos.pendingYield)));
    })), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-claim-summary"
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "Claimable"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-claim-amount"
    }, formatTokenAmount(pending), " ", yieldAsset)), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-success",
      onClick: handleClaim,
      disabled: pending <= 0
    }, "Claim ", formatTokenAmount(pending), " ", yieldAsset));
  }

  // ── Switch vault panel ────────────────────────────────────────────────────────
  function SwitchPanel(_ref7) {
    var pools = _ref7.pools,
      positions = _ref7.positions,
      userAddress = _ref7.userAddress,
      signTransactions = _ref7.signTransactions,
      apiUrl = _ref7.apiUrl,
      assetName = _ref7.assetName,
      onBack = _ref7.onBack,
      onSuccess = _ref7.onSuccess;
    var poolsWithDeposits = pools.filter(function (p) {
      var _positions$p$id3;
      return (((_positions$p$id3 = positions[p.id]) == null ? void 0 : _positions$p$id3.depositedAmount) || 0) > 0;
    });
    var _useState15 = React.useState(poolsWithDeposits[0] || null),
      fromPool = _useState15[0],
      setFromPool = _useState15[1];
    var _useState16 = React.useState(null),
      toPool = _useState16[0],
      setToPool = _useState16[1];
    var _useState17 = React.useState('select'),
      step = _useState17[0],
      setStep = _useState17[1];
    var _useState18 = React.useState(''),
      txId = _useState18[0],
      setTxId = _useState18[1];
    var _useState19 = React.useState(''),
      error = _useState19[0],
      setError = _useState19[1];
    var availableTargets = pools.filter(function (p) {
      return p.id !== (fromPool == null ? void 0 : fromPool.id);
    });
    var handleSwitch = function handleSwitch() {
      try {
        if (!fromPool || !toPool) {
          setError('Select source and target vault');
          return Promise.resolve();
        }
        setStep('signing');
        setError('');
        var _temp5 = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/switch-pool", {
            userAddress: userAddress,
            fromPoolId: fromPool.id,
            toPoolId: toPool.id
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (id) {
              setTxId(id);
              setStep('success');
            });
          });
        }, function (err) {
          var _err$response5;
          setError(((_err$response5 = err.response) == null || (_err$response5 = _err$response5.data) == null ? void 0 : _err$response5.error) || err.message || 'Switch failed');
          setStep('select');
        });
        return Promise.resolve(_temp5 && _temp5.then ? _temp5.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: step
    });
    if (step === 'success') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: "success",
      txId: txId,
      label: "Vault switched",
      onDone: onSuccess
    });
    if (poolsWithDeposits.length === 0) {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-panel"
      }, /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-back",
        onClick: onBack
      }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-muted"
      }, "No deposits to switch."));
    }
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Switch Vault"), /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label"
    }, "From"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, poolsWithDeposits.map(function (p) {
      var _positions$p$id4;
      var isCompound = p.poolType === 'compound';
      var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((fromPool == null ? void 0 : fromPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setFromPool(p);
          setToPool(null);
          setError('');
        }
      }, isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-compound-badge"
      }, "\u21BB"), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, label), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-amount"
      }, formatTokenAmount((_positions$p$id4 = positions[p.id]) == null ? void 0 : _positions$p$id4.depositedAmount)));
    })), /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label",
      style: {
        marginTop: 12
      }
    }, "To"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, availableTargets.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((toPool == null ? void 0 : toPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setToPool(p);
          setError('');
        }
      }, isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-compound-badge"
      }, "\u21BB"), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, label));
    })), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-primary",
      onClick: handleSwitch,
      disabled: !fromPool || !toPool,
      style: {
        marginTop: 12
      }
    }, "Switch Vault"));
  }

  // ── Exit panel ────────────────────────────────────────────────────────────────
  function ExitPanel(_ref8) {
    var pools = _ref8.pools,
      positions = _ref8.positions,
      userAddress = _ref8.userAddress,
      signTransactions = _ref8.signTransactions,
      apiUrl = _ref8.apiUrl,
      assetName = _ref8.assetName,
      onBack = _ref8.onBack,
      onSuccess = _ref8.onSuccess;
    var poolsWithPosition = pools.filter(function (p) {
      var pos = positions[p.id];
      return ((pos == null ? void 0 : pos.depositedAmount) || 0) > 0 || ((pos == null ? void 0 : pos.pendingYield) || 0) > 0;
    });
    var _useState20 = React.useState(poolsWithPosition[0] || null),
      selectedPool = _useState20[0],
      setSelectedPool = _useState20[1];
    var _useState21 = React.useState('confirm'),
      step = _useState21[0],
      setStep = _useState21[1];
    var _useState22 = React.useState(''),
      txId = _useState22[0],
      setTxId = _useState22[1];
    var _useState23 = React.useState(''),
      error = _useState23[0],
      setError = _useState23[1];
    var pos = selectedPool ? positions[selectedPool.id] : null;
    var handleExit = function handleExit() {
      try {
        setStep('signing');
        setError('');
        var _temp6 = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/close-out", {
            userAddress: userAddress
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function (id) {
              setTxId(id);
              setStep('success');
            });
          });
        }, function (err) {
          var _err$response6;
          setError(((_err$response6 = err.response) == null || (_err$response6 = _err$response6.data) == null ? void 0 : _err$response6.error) || err.message || 'Exit failed');
          setStep('confirm');
        });
        return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: step
    });
    if (step === 'success') return /*#__PURE__*/React__default["default"].createElement(TxStatus, {
      step: "success",
      txId: txId,
      label: "Exited vault",
      onDone: onSuccess
    });
    if (poolsWithPosition.length === 0) {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-panel"
      }, /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-back",
        onClick: onBack
      }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
        className: "rfw-muted"
      }, "No active position to exit."));
    }
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Exit Vault"), poolsWithPosition.length > 1 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid"
    }, poolsWithPosition.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
      return /*#__PURE__*/React__default["default"].createElement("button", {
        key: p.id,
        className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
        onClick: function onClick() {
          setSelectedPool(p);
          setError('');
        }
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-label"
      }, label));
    })), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-exit-summary"
    }, (pos == null ? void 0 : pos.depositedAmount) > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-exit-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "Deposit returned"), /*#__PURE__*/React__default["default"].createElement("span", null, formatTokenAmount(pos.depositedAmount), " ", assetName)), (pos == null ? void 0 : pos.pendingYield) > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-exit-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "Yield claimed"), /*#__PURE__*/React__default["default"].createElement("span", null, formatTokenAmount(pos.pendingYield), " ", (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA'))), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-warning"
    }, "This will close your position and opt you out of the vault."), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-danger",
      onClick: handleExit
    }, "Exit & Withdraw All"));
  }

  // ── History panel ─────────────────────────────────────────────────────────────
  function HistoryPanel(_ref9) {
    var transactions = _ref9.transactions,
      assetName = _ref9.assetName,
      onBack = _ref9.onBack;
    var TX_LABELS = {
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      claim: 'Claimed Yield',
      claimYield: 'Claimed Yield',
      optIn: 'Opt In',
      closeOut: 'Exit',
      compoundYield: 'Swap Yield',
      swapYield: 'Swap Yield',
      unknown: 'Transaction'
    };
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Yield History"), transactions.length === 0 && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted"
    }, "No transactions yet."), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-history-list"
    }, transactions.map(function (tx) {
      var _tx$pool, _tx$pool2;
      var label = TX_LABELS[tx.type] || 'Transaction';
      var poolLabel = ((_tx$pool = tx.pool) == null ? void 0 : _tx$pool.poolType) === 'compound' ? assetName + ' Vault' : (((_tx$pool2 = tx.pool) == null ? void 0 : _tx$pool2.swapAssetName) || 'ASA') + " Vault";
      return /*#__PURE__*/React__default["default"].createElement("div", {
        key: tx.id,
        className: "rfw-history-item"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-history-main"
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-history-label"
      }, label), tx.amount > 0 && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-history-amount"
      }, formatTokenAmount(tx.amount))), /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-history-meta"
      }, /*#__PURE__*/React__default["default"].createElement("span", null, poolLabel), tx.timestamp && /*#__PURE__*/React__default["default"].createElement("span", null, new Date(tx.timestamp * 1000).toLocaleDateString()), /*#__PURE__*/React__default["default"].createElement("a", {
        href: EXPLORER_URL + "/tx/" + tx.id,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "rfw-explorer-link"
      }, "\u2197")));
    })));
  }

  // ── Home view (position summary + action buttons) ─────────────────────────────
  function HomeView(_ref0) {
    var pools = _ref0.pools,
      positions = _ref0.positions,
      positionsLoading = _ref0.positionsLoading,
      assetName = _ref0.assetName,
      onAction = _ref0.onAction;
    var totalDeposit = Object.values(positions).reduce(function (s, p) {
      return s + (p.depositedAmount || 0);
    }, 0);
    var hasDeposit = totalDeposit > 0;

    // pending yield per token
    var pendingByToken = {};
    pools.forEach(function (pool) {
      var pos = positions[pool.id];
      if ((pos == null ? void 0 : pos.pendingYield) > 0) {
        var token = pool.swapAssetName || 'ASA';
        pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
      }
    });
    var hasPendingYield = Object.keys(pendingByToken).length > 0;

    // active vaults breakdown
    var activeVaults = pools.filter(function (p) {
      var _positions$p$id5;
      return (((_positions$p$id5 = positions[p.id]) == null ? void 0 : _positions$p$id5.depositedAmount) || 0) > 0;
    });
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-home"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-position-card"
    }, positionsLoading ? /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted"
    }, "Loading position\u2026") : hasDeposit || hasPendingYield ? /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-stat-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-stat-label"
    }, "Your Deposit"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-stat-value"
    }, formatTokenAmount(totalDeposit), " ", assetName)), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-stat-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-stat-label"
    }, "Pending Yield"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-stat-value"
    }, hasPendingYield ? Object.entries(pendingByToken).map(function (_ref1) {
      var token = _ref1[0],
        amt = _ref1[1];
      return formatTokenAmount(amt) + " " + token;
    }).join(' · ') : '0')), activeVaults.length > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vaults-in"
    }, activeVaults.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
      return /*#__PURE__*/React__default["default"].createElement("span", {
        key: p.id,
        className: "rfw-vault-tag"
      }, label);
    }))) : /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted rfw-no-position"
    }, "No active position \u2014 deposit to start earning yield.")), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-actions"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-primary",
      onClick: function onClick() {
        return onAction('deposit');
      }
    }, "Deposit"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-secondary",
      onClick: function onClick() {
        return onAction('withdraw');
      },
      disabled: !hasDeposit
    }, "Withdraw"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-success",
      onClick: function onClick() {
        return onAction('claim');
      },
      disabled: !hasPendingYield
    }, "Claim Yield")), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-actions rfw-actions--row2"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-outline",
      onClick: function onClick() {
        return onAction('switch');
      },
      disabled: !hasDeposit || pools.length <= 1
    }, "Switch Vault"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-danger-outline",
      onClick: function onClick() {
        return onAction('exit');
      },
      disabled: !hasDeposit && !hasPendingYield
    }, "Exit"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-ghost",
      onClick: function onClick() {
        return onAction('history');
      }
    }, "History")));
  }

  // ── Main modal ────────────────────────────────────────────────────────────────
  function WidgetModal(_ref10) {
    var open = _ref10.open,
      onClose = _ref10.onClose,
      pools = _ref10.pools,
      positions = _ref10.positions,
      transactions = _ref10.transactions,
      loading = _ref10.loading,
      positionsLoading = _ref10.positionsLoading,
      onRefresh = _ref10.onRefresh,
      userAddress = _ref10.userAddress,
      signTransactions = _ref10.signTransactions,
      apiUrl = _ref10.apiUrl,
      asset = _ref10.asset,
      assetImageUrl = _ref10.assetImageUrl;
    var _useState24 = React.useState('home'),
      view = _useState24[0],
      setView = _useState24[1];
    if (!open) return null;
    var goHome = function goHome() {
      setView('home');
      onRefresh();
    };
    var renderView = function renderView() {
      var common = {
        pools: pools,
        positions: positions,
        userAddress: userAddress,
        signTransactions: signTransactions,
        apiUrl: apiUrl,
        assetName: asset,
        assetImageUrl: assetImageUrl,
        onBack: function onBack() {
          return setView('home');
        },
        onSuccess: goHome
      };
      switch (view) {
        case 'deposit':
          return /*#__PURE__*/React__default["default"].createElement(DepositPanel, common);
        case 'withdraw':
          return /*#__PURE__*/React__default["default"].createElement(WithdrawPanel, common);
        case 'claim':
          return /*#__PURE__*/React__default["default"].createElement(ClaimPanel, common);
        case 'switch':
          return /*#__PURE__*/React__default["default"].createElement(SwitchPanel, common);
        case 'exit':
          return /*#__PURE__*/React__default["default"].createElement(ExitPanel, common);
        case 'history':
          return /*#__PURE__*/React__default["default"].createElement(HistoryPanel, {
            transactions: transactions,
            assetName: asset,
            onBack: function onBack() {
              return setView('home');
            }
          });
        default:
          return /*#__PURE__*/React__default["default"].createElement(HomeView, {
            pools: pools,
            positions: positions,
            transactions: transactions,
            loading: loading,
            positionsLoading: positionsLoading,
            userAddress: userAddress,
            assetName: asset,
            assetImageUrl: assetImageUrl,
            onAction: setView
          });
      }
    };
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-overlay",
      onClick: onClose
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal",
      onClick: function onClick(e) {
        return e.stopPropagation();
      }
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-header"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-title"
    }, /*#__PURE__*/React__default["default"].createElement(AssetAvatar, {
      name: asset,
      imageUrl: assetImageUrl,
      size: 26
    }), /*#__PURE__*/React__default["default"].createElement("span", null, asset, " Vaults")), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-header-right"
    }, /*#__PURE__*/React__default["default"].createElement("a", {
      href: "https://rarefi.app",
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-powered"
    }, "Powered by RareFi"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-close",
      onClick: onClose
    }, "\xD7"))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-body"
    }, loading ? /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-loading"
    }, /*#__PURE__*/React__default["default"].createElement(Spinner, null), " ", /*#__PURE__*/React__default["default"].createElement("span", null, "Loading vaults\u2026")) : renderView())));
  }

  function _catch(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }
    if (result && result.then) {
      return result.then(void 0, recover);
    }
    return result;
  }
  function useWidgetData(_ref) {
    var asset = _ref.asset,
      userAddress = _ref.userAddress,
      apiUrl = _ref.apiUrl;
    var _useState = React.useState([]),
      pools = _useState[0],
      setPools = _useState[1];
    var _useState2 = React.useState({}),
      positions = _useState2[0],
      setPositions = _useState2[1];
    var _useState3 = React.useState([]),
      transactions = _useState3[0],
      setTransactions = _useState3[1];
    var _useState4 = React.useState(true),
      loading = _useState4[0],
      setLoading = _useState4[1];
    var _useState5 = React.useState(false),
      positionsLoading = _useState5[0],
      setPositionsLoading = _useState5[1];
    var fetchPools = React.useCallback(function () {
      return Promise.resolve(_catch(function () {
        return Promise.resolve(axios__default["default"].get(apiUrl + "/pools")).then(function (res) {
          var all = res.data.pools || [];
          return all.filter(function (p) {
            return (p.depositAssetName || 'ALPHA') === asset;
          });
        });
      }, function () {
        return [];
      }));
    }, [asset, apiUrl]);
    var fetchPositions = React.useCallback(function (poolList, address) {
      try {
        if (!address || poolList.length === 0) return Promise.resolve({});
        var result = {};
        return Promise.resolve(Promise.all(poolList.map(function (pool) {
          try {
            var _temp = _catch(function () {
              return Promise.resolve(axios__default["default"].get(apiUrl + "/pools/" + pool.id + "/position/" + address)).then(function (res) {
                if (res.data.position) result[pool.id] = res.data.position;
              });
            }, function () {});
            return Promise.resolve(_temp && _temp.then ? _temp.then(function () {}) : void 0);
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          return result;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }, [apiUrl]);
    var fetchTransactions = React.useCallback(function (address) {
      return address ? Promise.resolve(_catch(function () {
        return Promise.resolve(axios__default["default"].get(apiUrl + "/pools/transactions/" + address)).then(function (res) {
          return res.data.transactions || [];
        });
      }, function () {
        return [];
      })) : Promise.resolve([]);
    }, [apiUrl]);
    var refresh = React.useCallback(function () {
      try {
        setLoading(true);
        return Promise.resolve(fetchPools()).then(function (poolList) {
          setPools(poolList);
          setPositionsLoading(true);
          return Promise.resolve(Promise.all([fetchPositions(poolList, userAddress), fetchTransactions(userAddress)])).then(function (_ref2) {
            var pos = _ref2[0],
              txns = _ref2[1];
            setPositions(pos);
            setTransactions(txns);
            setPositionsLoading(false);
            setLoading(false);
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }, [fetchPools, fetchPositions, fetchTransactions, userAddress]);
    React.useEffect(function () {
      refresh();
    }, [refresh]);
    return {
      pools: pools,
      positions: positions,
      transactions: transactions,
      loading: loading,
      positionsLoading: positionsLoading,
      refresh: refresh
    };
  }

  var CSS = "\n@keyframes rfw-spin { to { transform: rotate(360deg); } }\n@keyframes rfw-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }\n.rfw-trigger-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: #111111; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; }\n.rfw-trigger-btn:hover:not(:disabled) { opacity: 0.85; }\n.rfw-trigger-btn:disabled { opacity: 0.4; cursor: not-allowed; }\n.rfw-trigger-icon { font-size: 15px; line-height: 1; }\n.rfw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; }\n.rfw-modal { background: #ffffff; border-radius: 16px; width: 100%; max-width: 360px; box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06); animation: rfw-fadein 0.18s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }\n.rfw-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 12px; border-bottom: 1px solid #f0f0f0; }\n.rfw-modal-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #111; }\n.rfw-modal-header-right { display: flex; align-items: center; gap: 10px; }\n.rfw-powered { font-size: 10px; color: #9ca3af; text-decoration: none; transition: color 0.15s; }\n.rfw-powered:hover { color: #6b7280; }\n.rfw-close { background: none; border: none; font-size: 20px; line-height: 1; cursor: pointer; color: #9ca3af; padding: 0 2px; transition: color 0.15s; }\n.rfw-close:hover { color: #111; }\n.rfw-modal-body { padding: 16px; max-height: 520px; overflow-y: auto; }\n.rfw-loading { display: flex; align-items: center; gap: 10px; padding: 24px 0; color: #6b7280; font-size: 13px; justify-content: center; }\n.rfw-position-card { background: #f9fafb; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; border: 1px solid #f0f0f0; }\n.rfw-stat-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }\n.rfw-stat-row:last-child { margin-bottom: 0; }\n.rfw-stat-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }\n.rfw-stat-value { font-size: 13px; font-weight: 700; color: #111; font-variant-numeric: tabular-nums; }\n.rfw-vaults-in { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; }\n.rfw-vault-tag { background: #111; color: #fff; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.03em; }\n.rfw-no-position { text-align: center; padding: 4px 0; }\n.rfw-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px; }\n.rfw-actions--row2 { margin-bottom: 0; }\n.rfw-btn { border: none; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s, transform 0.1s; font-family: inherit; text-align: center; white-space: nowrap; }\n.rfw-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }\n.rfw-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }\n.rfw-btn-primary { background: #111; color: #fff; }\n.rfw-btn-secondary { background: #e5e7eb; color: #111; }\n.rfw-btn-success { background: #16a34a; color: #fff; }\n.rfw-btn-outline { background: transparent; color: #111; border: 1.5px solid #d1d5db; }\n.rfw-btn-danger { background: #dc2626; color: #fff; }\n.rfw-btn-danger-outline { background: transparent; color: #dc2626; border: 1.5px solid #fca5a5; }\n.rfw-btn-ghost { background: transparent; color: #6b7280; border: 1.5px solid #e5e7eb; }\n.rfw-panel { display: flex; flex-direction: column; gap: 0; }\n.rfw-back { background: none; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; padding: 0; margin-bottom: 12px; font-family: inherit; text-align: left; transition: color 0.15s; }\n.rfw-back:hover { color: #111; }\n.rfw-panel-title { font-size: 14px; font-weight: 700; color: #111; margin: 0 0 14px; }\n.rfw-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }\n.rfw-vault-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }\n.rfw-vault-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 12px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; font-family: inherit; min-width: 60px; }\n.rfw-vault-btn:hover { border-color: #9ca3af; }\n.rfw-vault-btn--selected { border-color: #111; background: #f0f0f0; }\n.rfw-vault-btn-label { font-size: 11px; font-weight: 700; color: #111; }\n.rfw-vault-btn-amount { font-size: 10px; color: #9ca3af; font-variant-numeric: tabular-nums; }\n.rfw-compound-badge { position: absolute; top: -5px; right: -5px; background: #6366f1; color: #fff; font-size: 9px; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }\n.rfw-input-row { display: flex; gap: 6px; margin-bottom: 4px; }\n.rfw-input { flex: 1; padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: inherit; color: #111; background: #fff; transition: border-color 0.15s; outline: none; }\n.rfw-input:focus { border-color: #111; }\n.rfw-max-btn { padding: 0 10px; background: #f0f0f0; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; color: #111; cursor: pointer; font-family: inherit; }\n.rfw-max-btn:hover { background: #e5e7eb; }\n.rfw-helper { font-size: 11px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-muted { font-size: 13px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-error { font-size: 12px; color: #dc2626; background: #fef2f2; border-radius: 6px; padding: 8px 10px; margin: 0 0 10px; }\n.rfw-warning { font-size: 11px; color: #b45309; background: #fffbeb; border-radius: 6px; padding: 8px 10px; margin: 0 0 10px; }\n.rfw-claim-summary { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #166534; }\n.rfw-claim-amount { font-weight: 700; }\n.rfw-exit-summary { background: #f9fafb; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }\n.rfw-exit-row { display: flex; justify-content: space-between; font-size: 12px; color: #374151; margin-bottom: 4px; }\n.rfw-exit-row:last-child { margin-bottom: 0; }\n.rfw-history-list { display: flex; flex-direction: column; gap: 8px; }\n.rfw-history-item { background: #f9fafb; border-radius: 8px; padding: 10px 12px; }\n.rfw-history-main { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #111; margin-bottom: 3px; }\n.rfw-history-amount { font-variant-numeric: tabular-nums; }\n.rfw-history-meta { display: flex; gap: 8px; font-size: 11px; color: #9ca3af; align-items: center; }\n.rfw-explorer-link { color: #9ca3af; text-decoration: none; font-size: 11px; transition: color 0.15s; }\n.rfw-explorer-link:hover { color: #111; }\n.rfw-txstatus { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; text-align: center; }\n.rfw-txstatus-title { font-size: 15px; font-weight: 700; color: #111; margin: 0; }\n.rfw-txstatus-sub { font-size: 12px; color: #9ca3af; margin: 0; }\n.rfw-txstatus-check { width: 44px; height: 44px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }\n";
  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('rarefi-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'rarefi-widget-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /**
   * RareFiWidget
   *
   * Drop-in yield vault widget. The host app passes wallet info — no separate
   * wallet connection is needed inside the widget.
   *
   * Props:
   *   asset           {string}   Deposit asset name, e.g. 'ALPHA'
   *   userAddress     {string}   Connected wallet address from the host app
   *   signTransactions {Function} wallet.signTransactions from @txnlab/use-wallet-react
   *                               (txns: Transaction[]) => Promise<Uint8Array[]>
   *   apiUrl          {string}   RareFi backend URL (default: https://api.rarefi.app)
   *   assetImageUrl   {string?}  URL to the asset logo image (optional)
   *   theme           {'light'|'dark'} (default: 'light')
   *   renderTrigger   {Function?} Custom trigger renderer: ({ onClick }) => ReactNode
   *                               If omitted, a default button is rendered.
   */
  function RareFiWidget(_ref) {
    var _ref$asset = _ref.asset,
      asset = _ref$asset === void 0 ? 'ALPHA' : _ref$asset,
      userAddress = _ref.userAddress,
      signTransactions = _ref.signTransactions,
      _ref$apiUrl = _ref.apiUrl,
      apiUrl = _ref$apiUrl === void 0 ? 'https://api.rarefi.app/api' : _ref$apiUrl,
      assetImageUrl = _ref.assetImageUrl,
      _ref$theme = _ref.theme,
      theme = _ref$theme === void 0 ? 'light' : _ref$theme,
      renderTrigger = _ref.renderTrigger;
    injectStyles();
    var _useState = React.useState(false),
      open = _useState[0],
      setOpen = _useState[1];
    var _useWidgetData = useWidgetData({
        asset: asset,
        userAddress: userAddress,
        apiUrl: apiUrl
      }),
      pools = _useWidgetData.pools,
      positions = _useWidgetData.positions,
      transactions = _useWidgetData.transactions,
      loading = _useWidgetData.loading,
      positionsLoading = _useWidgetData.positionsLoading,
      refresh = _useWidgetData.refresh;
    var handleOpen = function handleOpen() {
      if (!userAddress) {
        console.warn('[RareFiWidget] No userAddress provided — wallet not connected in host app.');
        return;
      }
      setOpen(true);
    };
    var trigger = renderTrigger ? renderTrigger({
      onClick: handleOpen
    }) : /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-trigger-btn",
      "data-theme": theme,
      onClick: handleOpen,
      disabled: !userAddress,
      title: userAddress ? asset + " Vaults" : 'Connect wallet to use vaults'
    }, /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-trigger-icon"
    }, "\u2B21"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-trigger-label"
    }, asset, " Vaults"));
    return /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, trigger, /*#__PURE__*/React__default["default"].createElement(WidgetModal, {
      open: open,
      onClose: function onClose() {
        return setOpen(false);
      },
      pools: pools,
      positions: positions,
      transactions: transactions,
      loading: loading,
      positionsLoading: positionsLoading,
      onRefresh: refresh,
      userAddress: userAddress,
      signTransactions: signTransactions,
      apiUrl: apiUrl,
      asset: asset,
      assetImageUrl: assetImageUrl,
      theme: theme
    }));
  }

  exports.RareFiWidget = RareFiWidget;

}));
//# sourceMappingURL=index.umd.js.map
