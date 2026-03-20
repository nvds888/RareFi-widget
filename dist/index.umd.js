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
  var INDEXER_URL = 'https://mainnet-idx.algonode.cloud';

  // ── Asset avatar ──────────────────────────────────────────────────────────────
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
        border: '2px solid #e5e7eb',
        borderTopColor: '#111',
        borderRadius: '50%',
        animation: 'rfw-spin 0.7s linear infinite'
      }
    });
  }

  // ── Tx status ─────────────────────────────────────────────────────────────────
  function TxStatus(_ref3) {
    var step = _ref3.step,
      txId = _ref3.txId,
      label = _ref3.label,
      onDone = _ref3.onDone;
    if (step === 'signing' || step === 'submitting') {
      return /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-txstatus"
      }, /*#__PURE__*/React__default["default"].createElement(Spinner, {
        size: 36
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
        className: "rfw-explorer-link",
        style: {
          marginBottom: 4
        }
      }, "View on Explorer \u2197"), /*#__PURE__*/React__default["default"].createElement("button", {
        className: "rfw-btn rfw-btn-primary",
        style: {
          marginTop: 8
        },
        onClick: onDone
      }, "Done"));
    }
    return null;
  }

  // ── Fetch wallet balance from Algorand indexer ────────────────────────────────
  function useWalletBalance(userAddress, assetId) {
    var _useState2 = React.useState(null),
      balance = _useState2[0],
      setBalance = _useState2[1];
    React.useEffect(function () {
      if (!userAddress || !assetId) return;
      fetch(INDEXER_URL + "/v2/accounts/" + userAddress).then(function (r) {
        return r.json();
      }).then(function (data) {
        var _data$account, _found$amount;
        var assets = ((_data$account = data.account) == null ? void 0 : _data$account.assets) || [];
        var found = assets.find(function (a) {
          return a['asset-id'] === assetId;
        });
        setBalance((_found$amount = found == null ? void 0 : found.amount) != null ? _found$amount : 0);
      })["catch"](function () {
        return setBalance(null);
      });
    }, [userAddress, assetId]);
    return balance;
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
    var _useState3 = React.useState(pools[0] || null),
      selectedPool = _useState3[0],
      setSelectedPool = _useState3[1];
    var _useState4 = React.useState(''),
      amount = _useState4[0],
      setAmount = _useState4[1];
    var _useState5 = React.useState(null),
      isOptedIn = _useState5[0],
      setIsOptedIn = _useState5[1];
    var _useState6 = React.useState('input'),
      step = _useState6[0],
      setStep = _useState6[1];
    var _useState7 = React.useState(''),
      txId = _useState7[0],
      setTxId = _useState7[1];
    var _useState8 = React.useState(''),
      error = _useState8[0],
      setError = _useState8[1];
    var walletBalance = useWalletBalance(userAddress, selectedPool == null ? void 0 : selectedPool.depositAssetId);
    React.useEffect(function () {
      if (!selectedPool || !userAddress) {
        setIsOptedIn(false);
        return;
      }
      setIsOptedIn(null);
      axios__default["default"].get(apiUrl + "/pools/" + selectedPool.id + "/position/" + userAddress).then(function (r) {
        var _r$data$position;
        return setIsOptedIn(((_r$data$position = r.data.position) == null ? void 0 : _r$data$position.isOptedIn) || false);
      })["catch"](function () {
        return setIsOptedIn(false);
      });
    }, [selectedPool == null ? void 0 : selectedPool.id, userAddress, apiUrl]);
    var handleOptIn = function handleOptIn() {
      try {
        setStep('signing');
        setError('');
        var _temp = _catch$1(function () {
          return Promise.resolve(axios__default["default"].post(apiUrl + "/pools/" + selectedPool.id + "/opt-in", {
            userAddress: userAddress
          })).then(function (res) {
            return Promise.resolve(decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl)).then(function () {
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
        if (walletBalance !== null && units > walletBalance) {
          setError('Insufficient balance');
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
      }, yieldAsset), isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-vault-btn-sub"
      }, "auto"));
    })), isOptedIn === null && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-muted"
    }, "Checking vault\u2026"), isOptedIn === false && /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-info-box"
    }, "Opt into this vault first to start depositing."), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-primary rfw-btn-full",
      onClick: handleOptIn
    }, "Opt In to Vault")), isOptedIn === true && /*#__PURE__*/React__default["default"].createElement("form", {
      onSubmit: handleDeposit
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-amount-block"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-amount-top"
    }, /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label",
      style: {
        margin: 0
      }
    }, "Amount"), walletBalance !== null && /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-balance-hint"
    }, "Balance: ", /*#__PURE__*/React__default["default"].createElement("strong", null, formatTokenAmount(walletBalance), " ", assetName))), /*#__PURE__*/React__default["default"].createElement("div", {
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
    }), walletBalance !== null && /*#__PURE__*/React__default["default"].createElement("button", {
      type: "button",
      className: "rfw-max-btn",
      onClick: function onClick() {
        return setAmount(formatMaxAmount(walletBalance));
      }
    }, "MAX"))), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      type: "submit",
      className: "rfw-btn rfw-btn-primary rfw-btn-full",
      disabled: !amount || parseFloat(amount) <= 0
    }, "Deposit ", assetName)));
  }

  // ── Withdraw panel ────────────────────────────────────────────────────────────
  function WithdrawPanel(_ref5) {
    var _positions$selectedPo, _positions$selectedPo2;
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
    var _useState9 = React.useState(poolsWithDeposits[0] || null),
      selectedPool = _useState9[0],
      setSelectedPool = _useState9[1];
    var _useState0 = React.useState(''),
      amount = _useState0[0],
      setAmount = _useState0[1];
    var _useState1 = React.useState('input'),
      step = _useState1[0],
      setStep = _useState1[1];
    var _useState10 = React.useState(''),
      txId = _useState10[0],
      setTxId = _useState10[1];
    var _useState11 = React.useState(''),
      error = _useState11[0],
      setError = _useState11[1];
    var deposited = selectedPool ? ((_positions$selectedPo = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo.depositedAmount) || 0 : 0;
    var pendingYield = selectedPool ? ((_positions$selectedPo2 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo2.pendingYield) || 0 : 0;
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
    if (poolsWithDeposits.length === 0) return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No deposits to withdraw."));
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
      var _positions$p$id2;
      var isCompound = p.poolType === 'compound';
      var yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
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
      }, formatTokenAmount((_positions$p$id2 = positions[p.id]) == null ? void 0 : _positions$p$id2.depositedAmount)));
    }))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-amount-block"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-amount-top"
    }, /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label",
      style: {
        margin: 0
      }
    }, "Amount"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-balance-hint"
    }, "Deposited: ", /*#__PURE__*/React__default["default"].createElement("strong", null, formatTokenAmount(deposited), " ", assetName))), /*#__PURE__*/React__default["default"].createElement("div", {
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
    }, "MAX"))), pendingYield > 0 && (selectedPool == null ? void 0 : selectedPool.poolType) !== 'compound' && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-info-box"
    }, "You have ", formatTokenAmount(pendingYield), " ", selectedPool == null ? void 0 : selectedPool.swapAssetName, " pending \u2014 still claimable after withdrawal."), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-secondary rfw-btn-full",
      disabled: !amount || parseFloat(amount) <= 0,
      onClick: handleWithdraw
    }, "Withdraw"));
  }

  // ── Claim panel ───────────────────────────────────────────────────────────────
  function ClaimPanel(_ref6) {
    var _positions$selectedPo3;
    var pools = _ref6.pools,
      positions = _ref6.positions,
      userAddress = _ref6.userAddress,
      signTransactions = _ref6.signTransactions,
      apiUrl = _ref6.apiUrl,
      onBack = _ref6.onBack,
      onSuccess = _ref6.onSuccess;
    var poolsWithYield = pools.filter(function (p) {
      var _positions$p$id3;
      return (((_positions$p$id3 = positions[p.id]) == null ? void 0 : _positions$p$id3.pendingYield) || 0) > 0;
    });
    var _useState12 = React.useState(poolsWithYield[0] || null),
      selectedPool = _useState12[0],
      setSelectedPool = _useState12[1];
    var _useState13 = React.useState('confirm'),
      step = _useState13[0],
      setStep = _useState13[1];
    var _useState14 = React.useState(''),
      txId = _useState14[0],
      setTxId = _useState14[1];
    var _useState15 = React.useState(''),
      error = _useState15[0],
      setError = _useState15[1];
    var pending = selectedPool ? ((_positions$selectedPo3 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo3.pendingYield) || 0 : 0;
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
    if (poolsWithYield.length === 0) return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No pending yield to claim."));
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Claim Yield"), poolsWithYield.length > 1 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-vault-grid",
      style: {
        marginBottom: 16
      }
    }, poolsWithYield.map(function (p) {
      var _positions$p$id4;
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
      }, formatTokenAmount((_positions$p$id4 = positions[p.id]) == null ? void 0 : _positions$p$id4.pendingYield)));
    })), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-claim-card"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-claim-card-label"
    }, "Claimable now"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-claim-card-amount"
    }, formatTokenAmount(pending), " ", /*#__PURE__*/React__default["default"].createElement("span", null, yieldAsset))), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-success rfw-btn-full",
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
      var _positions$p$id5;
      return (((_positions$p$id5 = positions[p.id]) == null ? void 0 : _positions$p$id5.depositedAmount) || 0) > 0;
    });
    var _useState16 = React.useState(poolsWithDeposits[0] || null),
      fromPool = _useState16[0],
      setFromPool = _useState16[1];
    var _useState17 = React.useState(null),
      toPool = _useState17[0],
      setToPool = _useState17[1];
    var _useState18 = React.useState('select'),
      step = _useState18[0],
      setStep = _useState18[1];
    var _useState19 = React.useState(''),
      txId = _useState19[0],
      setTxId = _useState19[1];
    var _useState20 = React.useState(''),
      error = _useState20[0],
      setError = _useState20[1];
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
    if (poolsWithDeposits.length === 0) return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No deposits to switch."));
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
      var _positions$p$id6;
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
      }, formatTokenAmount((_positions$p$id6 = positions[p.id]) == null ? void 0 : _positions$p$id6.depositedAmount)));
    })), /*#__PURE__*/React__default["default"].createElement("label", {
      className: "rfw-label",
      style: {
        marginTop: 8
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
      className: "rfw-btn rfw-btn-primary rfw-btn-full",
      onClick: handleSwitch,
      disabled: !fromPool || !toPool,
      style: {
        marginTop: 8
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
    var _useState21 = React.useState(poolsWithPosition[0] || null),
      selectedPool = _useState21[0],
      setSelectedPool = _useState21[1];
    var _useState22 = React.useState('confirm'),
      step = _useState22[0],
      setStep = _useState22[1];
    var _useState23 = React.useState(''),
      txId = _useState23[0],
      setTxId = _useState23[1];
    var _useState24 = React.useState(''),
      error = _useState24[0],
      setError = _useState24[1];
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
    if (poolsWithPosition.length === 0) return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No active position to exit."));
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
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "Deposit returned"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-exit-row-value"
    }, formatTokenAmount(pos.depositedAmount), " ", assetName)), (pos == null ? void 0 : pos.pendingYield) > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-exit-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "Yield claimed"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-exit-row-value rfw-positive"
    }, formatTokenAmount(pos.pendingYield), " ", (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA'))), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-warning"
    }, "Closes your position and opts you out of the vault."), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-btn rfw-btn-danger rfw-btn-full",
      onClick: handleExit
    }, "Exit & Withdraw All"));
  }

  // ── Activity panel (transaction history) ─────────────────────────────────────
  var TX_CONFIG = {
    deposit: {
      label: 'Deposit',
      color: '#2563eb',
      bg: '#eff6ff'
    },
    withdraw: {
      label: 'Withdraw',
      color: '#6b7280',
      bg: '#f9fafb'
    },
    claim: {
      label: 'Claimed Yield',
      color: '#16a34a',
      bg: '#f0fdf4'
    },
    claimYield: {
      label: 'Claimed Yield',
      color: '#16a34a',
      bg: '#f0fdf4'
    },
    optIn: {
      label: 'Opt In',
      color: '#9ca3af',
      bg: '#f9fafb'
    },
    closeOut: {
      label: 'Exit',
      color: '#dc2626',
      bg: '#fef2f2'
    },
    compoundYield: {
      label: 'Compounded',
      color: '#7c3aed',
      bg: '#f5f3ff'
    },
    swapYield: {
      label: 'Swap Yield',
      color: '#7c3aed',
      bg: '#f5f3ff'
    }
  };
  function ActivityPanel(_ref9) {
    var transactions = _ref9.transactions,
      assetName = _ref9.assetName,
      onBack = _ref9.onBack;
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Activity"), transactions.length === 0 ? /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No transactions yet.") : /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-activity-list"
    }, transactions.map(function (tx) {
      var _tx$pool, _tx$pool2;
      var cfg = TX_CONFIG[tx.type] || {
        label: 'Transaction',
        color: '#6b7280',
        bg: '#f9fafb'
      };
      var poolLabel = ((_tx$pool = tx.pool) == null ? void 0 : _tx$pool.poolType) === 'compound' ? assetName + ' Vault (auto)' : (((_tx$pool2 = tx.pool) == null ? void 0 : _tx$pool2.swapAssetName) || 'ASA') + " Vault";
      return /*#__PURE__*/React__default["default"].createElement("div", {
        key: tx.id,
        className: "rfw-activity-item"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-activity-badge",
        style: {
          background: cfg.bg,
          color: cfg.color
        }
      }, cfg.label), /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-activity-body"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-activity-main"
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-activity-pool"
      }, poolLabel), tx.amount > 0 && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-activity-amount",
        style: {
          color: cfg.color
        }
      }, ['deposit', 'withdraw', 'closeOut'].includes(tx.type) ? '' : '+', formatTokenAmount(tx.amount))), /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-activity-meta"
      }, tx.timestamp && /*#__PURE__*/React__default["default"].createElement("span", null, new Date(tx.timestamp * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })), /*#__PURE__*/React__default["default"].createElement("a", {
        href: EXPLORER_URL + "/tx/" + tx.id,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "rfw-explorer-link"
      }, "\u2197"))));
    })));
  }

  // ── Yield history panel ───────────────────────────────────────────────────────
  function YieldHistoryPanel(_ref0) {
    var userAddress = _ref0.userAddress,
      apiUrl = _ref0.apiUrl,
      assetName = _ref0.assetName,
      onBack = _ref0.onBack;
    var _useState25 = React.useState(true),
      loading = _useState25[0],
      setLoading = _useState25[1];
    var _useState26 = React.useState([]),
      history = _useState26[0],
      setHistory = _useState26[1];
    var _useState27 = React.useState(null),
      error = _useState27[0],
      setError = _useState27[1];
    React.useEffect(function () {
      if (!userAddress) return;
      setLoading(true);
      axios__default["default"].get(apiUrl + "/pools/yield-history/" + userAddress).then(function (r) {
        var filtered = (r.data.yieldHistory || []).filter(function (item) {
          return item.poolType === 'compound' || item.yieldAsset;
        });
        setHistory(filtered);
      })["catch"](function () {
        return setError('Failed to load yield history');
      })["finally"](function () {
        return setLoading(false);
      });
    }, [userAddress, apiUrl]);
    var totalByToken = {};
    history.forEach(function (item) {
      var token = item.poolType === 'compound' ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
      totalByToken[token] = (totalByToken[token] || 0) + (item.yieldAmount || 0);
    });
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-panel"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-back",
      onClick: onBack
    }, "\u2190 Back"), /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-panel-title"
    }, "Yield History"), loading && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-loading",
      style: {
        padding: '24px 0'
      }
    }, /*#__PURE__*/React__default["default"].createElement(Spinner, null)), error && /*#__PURE__*/React__default["default"].createElement("p", {
      className: "rfw-error"
    }, error), !loading && !error && history.length === 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-empty-state"
    }, "No yield history yet.", /*#__PURE__*/React__default["default"].createElement("br", null), /*#__PURE__*/React__default["default"].createElement("span", {
      style: {
        fontSize: 11
      }
    }, "Deposit to start earning.")), !loading && !error && history.length > 0 && /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, Object.keys(totalByToken).length > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-yield-totals"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-yield-totals-label"
    }, "Total earned"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-yield-totals-amounts"
    }, Object.entries(totalByToken).map(function (_ref1) {
      var token = _ref1[0],
        amt = _ref1[1];
      return /*#__PURE__*/React__default["default"].createElement("div", {
        key: token,
        className: "rfw-yield-total-row"
      }, /*#__PURE__*/React__default["default"].createElement("span", null, token), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-positive"
      }, "+", formatTokenAmount(amt)));
    }))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-yield-list"
    }, history.map(function (item, i) {
      var _item$swapDays;
      var isCompound = item.poolType === 'compound';
      var yieldToken = isCompound ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
      var vaultLabel = isCompound ? assetName + ' Vault (auto-compound)' : yieldToken + ' Vault';
      return /*#__PURE__*/React__default["default"].createElement("div", {
        key: i,
        className: "rfw-yield-item"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-item-header"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-item-vault"
      }, isCompound && /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-compound-dot"
      }, "\u21BB"), /*#__PURE__*/React__default["default"].createElement("span", null, vaultLabel))), /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-item-rows"
      }, /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-stat"
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-yield-stat-label"
      }, isCompound ? 'Compounded' : 'Claimed'), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-positive"
      }, "+", formatTokenAmount(item.yieldAmount), " ", yieldToken)), item.pendingYield > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-stat"
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-yield-stat-label"
      }, "Pending"), /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-pending"
      }, "+", formatTokenAmount(item.pendingYield), " ", yieldToken)), ((_item$swapDays = item.swapDays) == null ? void 0 : _item$swapDays.length) > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
        className: "rfw-yield-stat"
      }, /*#__PURE__*/React__default["default"].createElement("span", {
        className: "rfw-yield-stat-label"
      }, "Distributions"), /*#__PURE__*/React__default["default"].createElement("span", null, item.swapDays.length, "\xD7"))));
    }))));
  }

  // ── Home view ─────────────────────────────────────────────────────────────────
  function HomeView(_ref10) {
    var pools = _ref10.pools,
      positions = _ref10.positions,
      positionsLoading = _ref10.positionsLoading,
      assetName = _ref10.assetName,
      onAction = _ref10.onAction;
    var totalDeposit = Object.values(positions).reduce(function (s, p) {
      return s + (p.depositedAmount || 0);
    }, 0);
    var hasDeposit = totalDeposit > 0;
    var pendingByToken = {};
    pools.forEach(function (pool) {
      var pos = positions[pool.id];
      if ((pos == null ? void 0 : pos.pendingYield) > 0) {
        var token = pool.swapAssetName || 'ASA';
        pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
      }
    });
    var hasPendingYield = Object.keys(pendingByToken).length > 0;
    var activeVaults = pools.filter(function (p) {
      var _positions$p$id7;
      return (((_positions$p$id7 = positions[p.id]) == null ? void 0 : _positions$p$id7.depositedAmount) || 0) > 0;
    });
    return /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-home"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-pos-card"
    }, positionsLoading ? /*#__PURE__*/React__default["default"].createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React__default["default"].createElement(Spinner, {
      size: 16
    }), /*#__PURE__*/React__default["default"].createElement("span", {
      style: {
        fontSize: 13,
        color: '#9ca3af'
      }
    }, "Loading\u2026")) : hasDeposit || hasPendingYield ? /*#__PURE__*/React__default["default"].createElement(React__default["default"].Fragment, null, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-pos-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-pos-label"
    }, "Your Deposit"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-pos-value"
    }, formatTokenAmount(totalDeposit), " ", /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-pos-asset"
    }, assetName))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-pos-divider"
    }), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-pos-row"
    }, /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-pos-label"
    }, "Pending Yield"), /*#__PURE__*/React__default["default"].createElement("span", {
      className: "rfw-pos-value rfw-positive"
    }, hasPendingYield ? Object.entries(pendingByToken).map(function (_ref11) {
      var t = _ref11[0],
        a = _ref11[1];
      return "+" + formatTokenAmount(a) + " " + t;
    }).join(' · ') : '—')), activeVaults.length > 0 && /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-pos-vaults"
    }, activeVaults.map(function (p) {
      var isCompound = p.poolType === 'compound';
      var label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
      return /*#__PURE__*/React__default["default"].createElement("span", {
        key: p.id,
        className: "rfw-vault-tag"
      }, label);
    }))) : /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-no-position"
    }, /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-no-position-icon"
    }, "\u2B21"), /*#__PURE__*/React__default["default"].createElement("p", null, "No active position"), /*#__PURE__*/React__default["default"].createElement("span", null, "Deposit to start earning yield"))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-actions-primary"
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
      className: "rfw-actions-secondary"
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
    }, "Exit")), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-history-links"
    }, /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-history-link",
      onClick: function onClick() {
        return onAction('activity');
      }
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "\uD83D\uDCCB"), " Activity"), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-history-divider"
    }), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-history-link",
      onClick: function onClick() {
        return onAction('yieldHistory');
      }
    }, /*#__PURE__*/React__default["default"].createElement("span", null, "\uD83D\uDCC8"), " Yield History")));
  }

  // ── Main modal ────────────────────────────────────────────────────────────────
  function WidgetModal(_ref12) {
    var open = _ref12.open,
      onClose = _ref12.onClose,
      pools = _ref12.pools,
      positions = _ref12.positions,
      transactions = _ref12.transactions,
      loading = _ref12.loading,
      positionsLoading = _ref12.positionsLoading,
      onRefresh = _ref12.onRefresh,
      userAddress = _ref12.userAddress,
      signTransactions = _ref12.signTransactions,
      apiUrl = _ref12.apiUrl,
      asset = _ref12.asset,
      assetImageUrl = _ref12.assetImageUrl;
    var _useState28 = React.useState('home'),
      view = _useState28[0],
      setView = _useState28[1];
    if (!open) return null;
    var goHome = function goHome() {
      setView('home');
      onRefresh();
    };
    var common = {
      pools: pools,
      positions: positions,
      userAddress: userAddress,
      signTransactions: signTransactions,
      apiUrl: apiUrl,
      assetName: asset,
      onBack: function onBack() {
        return setView('home');
      },
      onSuccess: goHome
    };
    var renderView = function renderView() {
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
        case 'activity':
          return /*#__PURE__*/React__default["default"].createElement(ActivityPanel, {
            transactions: transactions,
            assetName: asset,
            onBack: function onBack() {
              return setView('home');
            }
          });
        case 'yieldHistory':
          return /*#__PURE__*/React__default["default"].createElement(YieldHistoryPanel, {
            userAddress: userAddress,
            apiUrl: apiUrl,
            assetName: asset,
            onBack: function onBack() {
              return setView('home');
            }
          });
        default:
          return /*#__PURE__*/React__default["default"].createElement(HomeView, {
            pools: pools,
            positions: positions,
            positionsLoading: positionsLoading,
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
      size: 28
    }), /*#__PURE__*/React__default["default"].createElement("span", null, asset, " Vaults")), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-header-right"
    }, /*#__PURE__*/React__default["default"].createElement("a", {
      href: "https://rarefi.app",
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-powered"
    }, "Powered by RareFi \u2197"), /*#__PURE__*/React__default["default"].createElement("button", {
      className: "rfw-close",
      onClick: onClose
    }, "\xD7"))), /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-modal-body"
    }, loading ? /*#__PURE__*/React__default["default"].createElement("div", {
      className: "rfw-loading"
    }, /*#__PURE__*/React__default["default"].createElement(Spinner, null), /*#__PURE__*/React__default["default"].createElement("span", null, "Loading vaults\u2026")) : renderView())));
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

  var CSS = "\n@keyframes rfw-spin { to { transform: rotate(360deg); } }\n@keyframes rfw-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }\n\n/* Trigger */\n.rfw-trigger-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; letter-spacing: 0.01em; }\n.rfw-trigger-btn:hover:not(:disabled) { opacity: 0.82; }\n.rfw-trigger-btn:disabled { opacity: 0.35; cursor: not-allowed; }\n.rfw-trigger-icon { font-size: 14px; }\n\n/* Overlay */\n.rfw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }\n\n/* Modal */\n.rfw-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 380px; box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07); animation: rfw-fadein 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }\n\n/* Header */\n.rfw-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }\n.rfw-modal-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #111; }\n.rfw-modal-header-right { display: flex; align-items: center; gap: 10px; }\n.rfw-powered { font-size: 10px; color: #c4c4c4; text-decoration: none; transition: color 0.15s; letter-spacing: 0.02em; }\n.rfw-powered:hover { color: #888; }\n.rfw-close { background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: #c4c4c4; padding: 0 2px; transition: color 0.15s; }\n.rfw-close:hover { color: #111; }\n\n/* Body */\n.rfw-modal-body { padding: 16px; max-height: 540px; overflow-y: auto; }\n.rfw-loading { display: flex; align-items: center; gap: 10px; padding: 32px 0; color: #9ca3af; font-size: 13px; justify-content: center; }\n\n/* Position card */\n.rfw-pos-card { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 14px; }\n.rfw-pos-row { display: flex; justify-content: space-between; align-items: center; }\n.rfw-pos-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }\n.rfw-pos-value { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }\n.rfw-pos-asset { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); margin-left: 2px; }\n.rfw-pos-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 10px 0; }\n.rfw-pos-vaults { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }\n.rfw-vault-tag { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }\n.rfw-positive { color: #4ade80 !important; }\n.rfw-pending { color: #fbbf24 !important; }\n.rfw-no-position { text-align: center; padding: 8px 0; }\n.rfw-no-position-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.3; color: #fff; }\n.rfw-no-position p { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; margin: 0 0 3px; }\n.rfw-no-position span { color: rgba(255,255,255,0.35); font-size: 11px; }\n\n/* Actions */\n.rfw-actions-primary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 7px; }\n.rfw-actions-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 12px; }\n\n/* Buttons */\n.rfw-btn { border: none; border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: center; white-space: nowrap; letter-spacing: 0.01em; }\n.rfw-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }\n.rfw-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }\n.rfw-btn-full { width: 100%; padding: 11px; font-size: 13px; }\n.rfw-btn-primary { background: #111; color: #fff; }\n.rfw-btn-secondary { background: #f0f0f0; color: #111; }\n.rfw-btn-success { background: #16a34a; color: #fff; }\n.rfw-btn-outline { background: transparent; color: #111; border: 1.5px solid #e0e0e0; }\n.rfw-btn-danger { background: #dc2626; color: #fff; }\n.rfw-btn-danger-outline { background: transparent; color: #dc2626; border: 1.5px solid #fca5a5; }\n\n/* History links */\n.rfw-history-links { display: flex; align-items: center; border: 1.5px solid #f0f0f0; border-radius: 10px; overflow: hidden; }\n.rfw-history-link { flex: 1; background: none; border: none; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s, color 0.15s; }\n.rfw-history-link:hover { background: #f9fafb; color: #111; }\n.rfw-history-divider { width: 1px; height: 32px; background: #f0f0f0; }\n\n/* Panel */\n.rfw-panel { display: flex; flex-direction: column; }\n.rfw-back { background: none; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; padding: 0; margin-bottom: 14px; font-family: inherit; text-align: left; transition: color 0.15s; display: inline-flex; align-items: center; gap: 3px; }\n.rfw-back:hover { color: #111; }\n.rfw-panel-title { font-size: 15px; font-weight: 700; color: #111; margin: 0 0 16px; }\n.rfw-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }\n\n/* Vault selector grid */\n.rfw-vault-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }\n.rfw-vault-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 14px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 9px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; font-family: inherit; min-width: 64px; }\n.rfw-vault-btn:hover { border-color: #9ca3af; background: #f3f4f6; }\n.rfw-vault-btn--selected { border-color: #111; background: #f0f0f0; }\n.rfw-vault-btn-label { font-size: 12px; font-weight: 700; color: #111; }\n.rfw-vault-btn-sub { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }\n.rfw-vault-btn-amount { font-size: 10px; color: #9ca3af; font-variant-numeric: tabular-nums; }\n.rfw-compound-badge { position: absolute; top: -5px; right: -5px; background: #6366f1; color: #fff; font-size: 9px; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }\n\n/* Amount input block */\n.rfw-amount-block { margin-bottom: 12px; }\n.rfw-amount-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }\n.rfw-balance-hint { font-size: 11px; color: #9ca3af; }\n.rfw-balance-hint strong { color: #374151; }\n.rfw-input-row { display: flex; gap: 7px; }\n.rfw-input { flex: 1; padding: 10px 13px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 15px; font-family: inherit; color: #111; background: #fff; transition: border-color 0.15s; outline: none; }\n.rfw-input:focus { border-color: #111; }\n.rfw-max-btn { padding: 0 12px; background: #f0f0f0; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; color: #111; cursor: pointer; font-family: inherit; letter-spacing: 0.03em; }\n.rfw-max-btn:hover { background: #e5e7eb; }\n\n/* Info & states */\n.rfw-info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #111; border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #374151; margin-bottom: 12px; line-height: 1.45; }\n.rfw-helper { font-size: 11px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-muted { font-size: 13px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-error { font-size: 12px; color: #dc2626; background: #fef2f2; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }\n.rfw-warning { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }\n.rfw-empty-state { text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px; line-height: 1.6; }\n\n/* Claim card */\n.rfw-claim-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 14px; text-align: center; }\n.rfw-claim-card-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px; }\n.rfw-claim-card-amount { font-size: 26px; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums; }\n.rfw-claim-card-amount span { font-size: 14px; font-weight: 600; margin-left: 4px; }\n\n/* Exit summary */\n.rfw-exit-summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 15px; margin-bottom: 12px; }\n.rfw-exit-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #374151; padding: 4px 0; }\n.rfw-exit-row-value { font-weight: 600; }\n\n/* Activity list */\n.rfw-activity-list { display: flex; flex-direction: column; gap: 8px; }\n.rfw-activity-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 11px 13px; background: #fff; }\n.rfw-activity-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 0.03em; }\n.rfw-activity-body {}\n.rfw-activity-main { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }\n.rfw-activity-pool { font-size: 13px; font-weight: 600; color: #111; }\n.rfw-activity-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }\n.rfw-activity-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; }\n.rfw-explorer-link { color: #c4c4c4; text-decoration: none; transition: color 0.15s; font-size: 12px; }\n.rfw-explorer-link:hover { color: #111; }\n\n/* Yield history */\n.rfw-yield-totals { background: #111; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }\n.rfw-yield-totals-label { font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 8px; }\n.rfw-yield-totals-amounts {}\n.rfw-yield-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #fff; padding: 2px 0; }\n.rfw-yield-list { display: flex; flex-direction: column; gap: 8px; }\n.rfw-yield-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; }\n.rfw-yield-item-header { margin-bottom: 10px; }\n.rfw-yield-item-vault { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111; }\n.rfw-compound-dot { background: #6366f1; color: #fff; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }\n.rfw-yield-item-rows { display: flex; flex-direction: column; gap: 5px; }\n.rfw-yield-stat { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #374151; }\n.rfw-yield-stat-label { color: #9ca3af; }\n\n/* Tx status */\n.rfw-txstatus { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 16px; text-align: center; }\n.rfw-txstatus-title { font-size: 15px; font-weight: 700; color: #111; margin: 0; }\n.rfw-txstatus-sub { font-size: 12px; color: #9ca3af; margin: 0; }\n.rfw-txstatus-check { width: 48px; height: 48px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }\n";
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
