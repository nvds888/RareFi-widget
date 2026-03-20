import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import algosdk from 'algosdk';

function formatTokenAmount(amount, decimals = 6) {
  if (!amount && amount !== 0) return '0.00';
  const val = amount / Math.pow(10, decimals);
  if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
  return val.toFixed(2);
}
function parseTokenAmount(value, decimals = 6) {
  if (!value) return 0;
  const str = String(value).trim();
  if (str.startsWith('-') || /[eE]/.test(str)) return 0;
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1e15) return 0;
  return Math.floor(parsed * Math.pow(10, decimals));
}
function formatMaxAmount(balanceInBaseUnits, decimals = 6) {
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
async function decodeSignAndSubmit(b64Txns, signTransactions, apiUrl) {
  const txnGroup = b64Txns.map(b64 => algosdk.decodeUnsignedTransaction(Buffer.from(b64, 'base64')));
  const signedTxns = await signTransactions(txnGroup);
  const signedTxnsBase64 = signedTxns.map(t => Buffer.from(t).toString('base64'));
  const response = await axios.post(`${apiUrl}/pools/submit`, {
    signedTxns: signedTxnsBase64
  });
  return response.data.txId;
}

const EXPLORER_URL = 'https://explorer.perawallet.app';
const INDEXER_URL = 'https://mainnet-idx.algonode.cloud';

// ── Asset avatar ──────────────────────────────────────────────────────────────
function AssetAvatar({
  name,
  imageUrl,
  size = 28
}) {
  const [err, setErr] = useState(false);
  if (imageUrl && !err) {
    return /*#__PURE__*/React.createElement("img", {
      src: imageUrl,
      alt: name,
      onError: () => setErr(true),
      style: {
        width: size,
        height: size,
        borderRadius: 6,
        objectFit: 'cover',
        flexShrink: 0
      }
    });
  }
  return /*#__PURE__*/React.createElement("span", {
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
function Spinner({
  size = 20
}) {
  return /*#__PURE__*/React.createElement("span", {
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
function TxStatus({
  step,
  txId,
  label,
  onDone
}) {
  if (step === 'signing' || step === 'submitting') {
    return /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus"
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 36
    }), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-title"
    }, step === 'signing' ? 'Waiting for signature' : 'Broadcasting…'), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-sub"
    }, step === 'signing' ? 'Confirm in your wallet' : 'Submitting to Algorand'));
  }
  if (step === 'success') {
    return /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus-check"
    }, "\u2713"), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-title"
    }, label), txId && /*#__PURE__*/React.createElement("a", {
      href: `${EXPLORER_URL}/tx/${txId}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-explorer-link",
      style: {
        marginBottom: 4
      }
    }, "View on Explorer \u2197"), /*#__PURE__*/React.createElement("button", {
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
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    if (!userAddress || !assetId) return;
    fetch(`${INDEXER_URL}/v2/accounts/${userAddress}`).then(r => r.json()).then(data => {
      var _data$account, _found$amount;
      const assets = ((_data$account = data.account) == null ? void 0 : _data$account.assets) || [];
      const found = assets.find(a => a['asset-id'] === assetId);
      setBalance((_found$amount = found == null ? void 0 : found.amount) != null ? _found$amount : 0);
    }).catch(() => setBalance(null));
  }, [userAddress, assetId]);
  return balance;
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel({
  pools,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  const [selectedPool, setSelectedPool] = useState(pools[0] || null);
  const [amount, setAmount] = useState('');
  const [isOptedIn, setIsOptedIn] = useState(null);
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const walletBalance = useWalletBalance(userAddress, selectedPool == null ? void 0 : selectedPool.depositAssetId);
  useEffect(() => {
    if (!selectedPool || !userAddress) {
      setIsOptedIn(false);
      return;
    }
    setIsOptedIn(null);
    axios.get(`${apiUrl}/pools/${selectedPool.id}/position/${userAddress}`).then(r => {
      var _r$data$position;
      return setIsOptedIn(((_r$data$position = r.data.position) == null ? void 0 : _r$data$position.isOptedIn) || false);
    }).catch(() => setIsOptedIn(false));
  }, [selectedPool == null ? void 0 : selectedPool.id, userAddress, apiUrl]);
  const handleOptIn = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/opt-in`, {
        userAddress
      });
      await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setIsOptedIn(true);
      setStep('input');
    } catch (err) {
      var _err$response;
      setError(((_err$response = err.response) == null || (_err$response = _err$response.data) == null ? void 0 : _err$response.error) || err.message || 'Opt-in failed');
      setStep('input');
    }
  };
  const handleDeposit = async e => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (units < 1000000) {
      setError('Minimum deposit is 1 ' + assetName);
      return;
    }
    if (walletBalance !== null && units > walletBalance) {
      setError('Insufficient balance');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/deposit`, {
        userAddress,
        amount: units
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response2;
      setError(((_err$response2 = err.response) == null || (_err$response2 = _err$response2.data) == null ? void 0 : _err$response2.error) || err.message || 'Deposit failed');
      setStep('input');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Deposit successful",
    onDone: onSuccess
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Deposit ", assetName), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "Receive yield in"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, pools.map(p => {
    const isCompound = p.poolType === 'compound';
    const yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, yieldAsset), isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-sub"
    }, "auto"));
  })), isOptedIn === null && /*#__PURE__*/React.createElement("p", {
    className: "rfw-muted"
  }, "Checking vault\u2026"), isOptedIn === false && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rfw-info-box"
  }, "Opt into this vault first to start depositing."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    onClick: handleOptIn
  }, "Opt In to Vault")), isOptedIn === true && /*#__PURE__*/React.createElement("form", {
    onSubmit: handleDeposit
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      margin: 0
    }
  }, "Amount"), walletBalance !== null && /*#__PURE__*/React.createElement("span", {
    className: "rfw-balance-hint"
  }, "Balance: ", /*#__PURE__*/React.createElement("strong", null, formatTokenAmount(walletBalance), " ", assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-input-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rfw-input",
    type: "number",
    placeholder: "0.00",
    value: amount,
    onChange: e => setAmount(e.target.value),
    step: "0.01",
    min: "0"
  }), walletBalance !== null && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: () => setAmount(formatMaxAmount(walletBalance))
  }, "MAX"))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    disabled: !amount || parseFloat(amount) <= 0
  }, "Deposit ", assetName)));
}

// ── Withdraw panel ────────────────────────────────────────────────────────────
function WithdrawPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  var _positions$selectedPo, _positions$selectedPo2;
  const poolsWithDeposits = pools.filter(p => {
    var _positions$p$id;
    return (((_positions$p$id = positions[p.id]) == null ? void 0 : _positions$p$id.depositedAmount) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithDeposits[0] || null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const deposited = selectedPool ? ((_positions$selectedPo = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo.depositedAmount) || 0 : 0;
  const pendingYield = selectedPool ? ((_positions$selectedPo2 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo2.pendingYield) || 0 : 0;
  const handleWithdraw = async e => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (units > deposited) {
      setError('Exceeds deposited balance');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/withdraw`, {
        userAddress,
        amount: units
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response3;
      setError(((_err$response3 = err.response) == null || (_err$response3 = _err$response3.data) == null ? void 0 : _err$response3.error) || err.message || 'Withdraw failed');
      setStep('input');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Withdrawal successful",
    onDone: onSuccess
  });
  if (poolsWithDeposits.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No deposits to withdraw."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Withdraw ", assetName), poolsWithDeposits.length > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "From vault"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithDeposits.map(p => {
    var _positions$p$id2;
    const isCompound = p.poolType === 'compound';
    const yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setAmount('');
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, yieldAsset), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id2 = positions[p.id]) == null ? void 0 : _positions$p$id2.depositedAmount)));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      margin: 0
    }
  }, "Amount"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-balance-hint"
  }, "Deposited: ", /*#__PURE__*/React.createElement("strong", null, formatTokenAmount(deposited), " ", assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-input-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rfw-input",
    type: "number",
    placeholder: "0.00",
    value: amount,
    onChange: e => setAmount(e.target.value),
    step: "0.01",
    min: "0"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: () => setAmount(formatMaxAmount(deposited))
  }, "MAX"))), pendingYield > 0 && (selectedPool == null ? void 0 : selectedPool.poolType) !== 'compound' && /*#__PURE__*/React.createElement("div", {
    className: "rfw-info-box"
  }, "You have ", formatTokenAmount(pendingYield), " ", selectedPool == null ? void 0 : selectedPool.swapAssetName, " pending \u2014 still claimable after withdrawal."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-secondary rfw-btn-full",
    disabled: !amount || parseFloat(amount) <= 0,
    onClick: handleWithdraw
  }, "Withdraw"));
}

// ── Claim panel ───────────────────────────────────────────────────────────────
function ClaimPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  onBack,
  onSuccess
}) {
  var _positions$selectedPo3;
  const poolsWithYield = pools.filter(p => {
    var _positions$p$id3;
    return (((_positions$p$id3 = positions[p.id]) == null ? void 0 : _positions$p$id3.pendingYield) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithYield[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const pending = selectedPool ? ((_positions$selectedPo3 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo3.pendingYield) || 0 : 0;
  const yieldAsset = (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA';
  const handleClaim = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/claim`, {
        userAddress
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response4;
      setError(((_err$response4 = err.response) == null || (_err$response4 = _err$response4.data) == null ? void 0 : _err$response4.error) || err.message || 'Claim failed');
      setStep('confirm');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Yield claimed",
    onDone: onSuccess
  });
  if (poolsWithYield.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No pending yield to claim."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Claim Yield"), poolsWithYield.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid",
    style: {
      marginBottom: 16
    }
  }, poolsWithYield.map(p => {
    var _positions$p$id4;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, p.swapAssetName || 'ASA'), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id4 = positions[p.id]) == null ? void 0 : _positions$p$id4.pendingYield)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card-label"
  }, "Claimable now"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card-amount"
  }, formatTokenAmount(pending), " ", /*#__PURE__*/React.createElement("span", null, yieldAsset))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-success rfw-btn-full",
    onClick: handleClaim,
    disabled: pending <= 0
  }, "Claim ", formatTokenAmount(pending), " ", yieldAsset));
}

// ── Switch vault panel ────────────────────────────────────────────────────────
function SwitchPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  const poolsWithDeposits = pools.filter(p => {
    var _positions$p$id5;
    return (((_positions$p$id5 = positions[p.id]) == null ? void 0 : _positions$p$id5.depositedAmount) || 0) > 0;
  });
  const [fromPool, setFromPool] = useState(poolsWithDeposits[0] || null);
  const [toPool, setToPool] = useState(null);
  const [step, setStep] = useState('select');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const availableTargets = pools.filter(p => p.id !== (fromPool == null ? void 0 : fromPool.id));
  const handleSwitch = async () => {
    if (!fromPool || !toPool) {
      setError('Select source and target vault');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/switch-pool`, {
        userAddress,
        fromPoolId: fromPool.id,
        toPoolId: toPool.id
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response5;
      setError(((_err$response5 = err.response) == null || (_err$response5 = _err$response5.data) == null ? void 0 : _err$response5.error) || err.message || 'Switch failed');
      setStep('select');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Vault switched",
    onDone: onSuccess
  });
  if (poolsWithDeposits.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No deposits to switch."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Switch Vault"), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "From"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithDeposits.map(p => {
    var _positions$p$id6;
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(fromPool == null ? void 0 : fromPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setFromPool(p);
        setToPool(null);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id6 = positions[p.id]) == null ? void 0 : _positions$p$id6.depositedAmount)));
  })), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      marginTop: 8
    }
  }, "To"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, availableTargets.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(toPool == null ? void 0 : toPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setToPool(p);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label));
  })), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    onClick: handleSwitch,
    disabled: !fromPool || !toPool,
    style: {
      marginTop: 8
    }
  }, "Switch Vault"));
}

// ── Exit panel ────────────────────────────────────────────────────────────────
function ExitPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  const poolsWithPosition = pools.filter(p => {
    const pos = positions[p.id];
    return ((pos == null ? void 0 : pos.depositedAmount) || 0) > 0 || ((pos == null ? void 0 : pos.pendingYield) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithPosition[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const pos = selectedPool ? positions[selectedPool.id] : null;
  const handleExit = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/close-out`, {
        userAddress
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response6;
      setError(((_err$response6 = err.response) == null || (_err$response6 = _err$response6.data) == null ? void 0 : _err$response6.error) || err.message || 'Exit failed');
      setStep('confirm');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Exited vault",
    onDone: onSuccess
  });
  if (poolsWithPosition.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No active position to exit."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Exit Vault"), poolsWithPosition.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithPosition.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-summary"
  }, (pos == null ? void 0 : pos.depositedAmount) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-row"
  }, /*#__PURE__*/React.createElement("span", null, "Deposit returned"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-exit-row-value"
  }, formatTokenAmount(pos.depositedAmount), " ", assetName)), (pos == null ? void 0 : pos.pendingYield) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-row"
  }, /*#__PURE__*/React.createElement("span", null, "Yield claimed"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-exit-row-value rfw-positive"
  }, formatTokenAmount(pos.pendingYield), " ", (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA'))), /*#__PURE__*/React.createElement("p", {
    className: "rfw-warning"
  }, "Closes your position and opts you out of the vault."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-danger rfw-btn-full",
    onClick: handleExit
  }, "Exit & Withdraw All"));
}

// ── Activity panel (transaction history) ─────────────────────────────────────
const TX_CONFIG = {
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
function ActivityPanel({
  transactions,
  assetName,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Activity"), transactions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No transactions yet.") : /*#__PURE__*/React.createElement("div", {
    className: "rfw-activity-list"
  }, transactions.map(tx => {
    var _tx$pool, _tx$pool2;
    const cfg = TX_CONFIG[tx.type] || {
      label: 'Transaction',
      color: '#6b7280',
      bg: '#f9fafb'
    };
    const poolLabel = ((_tx$pool = tx.pool) == null ? void 0 : _tx$pool.poolType) === 'compound' ? assetName + ' Vault (auto)' : `${((_tx$pool2 = tx.pool) == null ? void 0 : _tx$pool2.swapAssetName) || 'ASA'} Vault`;
    return /*#__PURE__*/React.createElement("div", {
      key: tx.id,
      className: "rfw-activity-item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-badge",
      style: {
        background: cfg.bg,
        color: cfg.color
      }
    }, cfg.label), /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-main"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-activity-pool"
    }, poolLabel), tx.amount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "rfw-activity-amount",
      style: {
        color: cfg.color
      }
    }, ['deposit', 'withdraw', 'closeOut'].includes(tx.type) ? '' : '+', formatTokenAmount(tx.amount))), /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-meta"
    }, tx.timestamp && /*#__PURE__*/React.createElement("span", null, new Date(tx.timestamp * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })), /*#__PURE__*/React.createElement("a", {
      href: `${EXPLORER_URL}/tx/${tx.id}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-explorer-link"
    }, "\u2197"))));
  })));
}

// ── Yield history panel ───────────────────────────────────────────────────────
function YieldHistoryPanel({
  userAddress,
  apiUrl,
  assetName,
  onBack
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    axios.get(`${apiUrl}/pools/yield-history/${userAddress}`).then(r => {
      const filtered = (r.data.yieldHistory || []).filter(item => item.poolType === 'compound' || item.yieldAsset);
      setHistory(filtered);
    }).catch(() => setError('Failed to load yield history')).finally(() => setLoading(false));
  }, [userAddress, apiUrl]);
  const totalByToken = {};
  history.forEach(item => {
    const token = item.poolType === 'compound' ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
    totalByToken[token] = (totalByToken[token] || 0) + (item.yieldAmount || 0);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Yield History"), loading && /*#__PURE__*/React.createElement("div", {
    className: "rfw-loading",
    style: {
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement(Spinner, null)), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), !loading && !error && history.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No yield history yet.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11
    }
  }, "Deposit to start earning.")), !loading && !error && history.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, Object.keys(totalByToken).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals-label"
  }, "Total earned"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals-amounts"
  }, Object.entries(totalByToken).map(([token, amt]) => /*#__PURE__*/React.createElement("div", {
    key: token,
    className: "rfw-yield-total-row"
  }, /*#__PURE__*/React.createElement("span", null, token), /*#__PURE__*/React.createElement("span", {
    className: "rfw-positive"
  }, "+", formatTokenAmount(amt)))))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-list"
  }, history.map((item, i) => {
    var _item$swapDays;
    const isCompound = item.poolType === 'compound';
    const yieldToken = isCompound ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
    const vaultLabel = isCompound ? assetName + ' Vault (auto-compound)' : yieldToken + ' Vault';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rfw-yield-item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-vault"
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-dot"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", null, vaultLabel))), /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-rows"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, isCompound ? 'Compounded' : 'Claimed'), /*#__PURE__*/React.createElement("span", {
      className: "rfw-positive"
    }, "+", formatTokenAmount(item.yieldAmount), " ", yieldToken)), item.pendingYield > 0 && /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, "Pending"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-pending"
    }, "+", formatTokenAmount(item.pendingYield), " ", yieldToken)), ((_item$swapDays = item.swapDays) == null ? void 0 : _item$swapDays.length) > 0 && /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, "Distributions"), /*#__PURE__*/React.createElement("span", null, item.swapDays.length, "\xD7"))));
  }))));
}

// ── Home view ─────────────────────────────────────────────────────────────────
function HomeView({
  pools,
  positions,
  positionsLoading,
  assetName,
  assetImageUrl,
  onAction
}) {
  const totalDeposit = Object.values(positions).reduce((s, p) => s + (p.depositedAmount || 0), 0);
  const hasDeposit = totalDeposit > 0;
  const pendingByToken = {};
  pools.forEach(pool => {
    const pos = positions[pool.id];
    if ((pos == null ? void 0 : pos.pendingYield) > 0) {
      const token = pool.swapAssetName || 'ASA';
      pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
    }
  });
  const hasPendingYield = Object.keys(pendingByToken).length > 0;
  const activeVaults = pools.filter(p => {
    var _positions$p$id7;
    return (((_positions$p$id7 = positions[p.id]) == null ? void 0 : _positions$p$id7.depositedAmount) || 0) > 0;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-home"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-card"
  }, positionsLoading ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#9ca3af'
    }
  }, "Loading\u2026")) : hasDeposit || hasPendingYield ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-label"
  }, "Your Deposit"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-value"
  }, formatTokenAmount(totalDeposit), " ", /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-asset"
  }, assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-label"
  }, "Pending Yield"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-value rfw-positive"
  }, hasPendingYield ? Object.entries(pendingByToken).map(([t, a]) => `+${formatTokenAmount(a)} ${t}`).join(' · ') : '—')), activeVaults.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-vaults"
  }, activeVaults.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
    return /*#__PURE__*/React.createElement("span", {
      key: p.id,
      className: "rfw-vault-tag"
    }, label);
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "rfw-no-position"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-no-position-icon"
  }, "\u2B21"), /*#__PURE__*/React.createElement("p", null, "No active position"), /*#__PURE__*/React.createElement("span", null, "Deposit to start earning yield"))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-actions-primary"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary",
    onClick: () => onAction('deposit')
  }, "Deposit"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-secondary",
    onClick: () => onAction('withdraw'),
    disabled: !hasDeposit
  }, "Withdraw"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-success",
    onClick: () => onAction('claim'),
    disabled: !hasPendingYield
  }, "Claim Yield")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-actions-secondary"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-outline",
    onClick: () => onAction('switch'),
    disabled: !hasDeposit || pools.length <= 1
  }, "Switch Vault"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-danger-outline",
    onClick: () => onAction('exit'),
    disabled: !hasDeposit && !hasPendingYield
  }, "Exit")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-links"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: () => onAction('activity')
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), " Activity"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: () => onAction('yieldHistory')
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8"), " Yield History")));
}

// ── Main modal ────────────────────────────────────────────────────────────────
function WidgetModal({
  open,
  onClose,
  pools,
  positions,
  transactions,
  loading,
  positionsLoading,
  onRefresh,
  userAddress,
  signTransactions,
  apiUrl,
  asset,
  assetImageUrl
}) {
  const [view, setView] = useState('home');
  if (!open) return null;
  const goHome = () => {
    setView('home');
    onRefresh();
  };
  const common = {
    pools,
    positions,
    userAddress,
    signTransactions,
    apiUrl,
    assetName: asset,
    onBack: () => setView('home'),
    onSuccess: goHome
  };
  const renderView = () => {
    switch (view) {
      case 'deposit':
        return /*#__PURE__*/React.createElement(DepositPanel, common);
      case 'withdraw':
        return /*#__PURE__*/React.createElement(WithdrawPanel, common);
      case 'claim':
        return /*#__PURE__*/React.createElement(ClaimPanel, common);
      case 'switch':
        return /*#__PURE__*/React.createElement(SwitchPanel, common);
      case 'exit':
        return /*#__PURE__*/React.createElement(ExitPanel, common);
      case 'activity':
        return /*#__PURE__*/React.createElement(ActivityPanel, {
          transactions: transactions,
          assetName: asset,
          onBack: () => setView('home')
        });
      case 'yieldHistory':
        return /*#__PURE__*/React.createElement(YieldHistoryPanel, {
          userAddress: userAddress,
          apiUrl: apiUrl,
          assetName: asset,
          onBack: () => setView('home')
        });
      default:
        return /*#__PURE__*/React.createElement(HomeView, {
          pools: pools,
          positions: positions,
          positionsLoading: positionsLoading,
          assetName: asset,
          assetImageUrl: assetImageUrl,
          onAction: setView
        });
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-title"
  }, /*#__PURE__*/React.createElement(AssetAvatar, {
    name: asset,
    imageUrl: assetImageUrl,
    size: 28
  }), /*#__PURE__*/React.createElement("span", null, asset, " Vaults")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-header-right"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://rarefi.app",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "rfw-powered"
  }, "Powered by RareFi \u2197"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-close",
    onClick: onClose
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-body"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "rfw-loading"
  }, /*#__PURE__*/React.createElement(Spinner, null), /*#__PURE__*/React.createElement("span", null, "Loading vaults\u2026")) : renderView())));
}

function useWidgetData({
  asset,
  userAddress,
  apiUrl
}) {
  const [pools, setPools] = useState([]);
  const [positions, setPositions] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const fetchPools = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/pools`);
      const all = res.data.pools || [];
      return all.filter(p => (p.depositAssetName || 'ALPHA') === asset);
    } catch (_unused) {
      return [];
    }
  }, [asset, apiUrl]);
  const fetchPositions = useCallback(async (poolList, address) => {
    if (!address || poolList.length === 0) return {};
    const result = {};
    await Promise.all(poolList.map(async pool => {
      try {
        const res = await axios.get(`${apiUrl}/pools/${pool.id}/position/${address}`);
        if (res.data.position) result[pool.id] = res.data.position;
      } catch (_unused2) {}
    }));
    return result;
  }, [apiUrl]);
  const fetchTransactions = useCallback(async address => {
    if (!address) return [];
    try {
      const res = await axios.get(`${apiUrl}/pools/transactions/${address}`);
      return res.data.transactions || [];
    } catch (_unused3) {
      return [];
    }
  }, [apiUrl]);
  const refresh = useCallback(async () => {
    setLoading(true);
    const poolList = await fetchPools();
    setPools(poolList);
    setPositionsLoading(true);
    const [pos, txns] = await Promise.all([fetchPositions(poolList, userAddress), fetchTransactions(userAddress)]);
    setPositions(pos);
    setTransactions(txns);
    setPositionsLoading(false);
    setLoading(false);
  }, [fetchPools, fetchPositions, fetchTransactions, userAddress]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return {
    pools,
    positions,
    transactions,
    loading,
    positionsLoading,
    refresh
  };
}

const CSS = `
@keyframes rfw-spin { to { transform: rotate(360deg); } }
@keyframes rfw-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Trigger */
.rfw-trigger-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; letter-spacing: 0.01em; }
.rfw-trigger-btn:hover:not(:disabled) { opacity: 0.82; }
.rfw-trigger-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rfw-trigger-icon { font-size: 14px; }

/* Overlay */
.rfw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }

/* Modal */
.rfw-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 380px; box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07); animation: rfw-fadein 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }

/* Header */
.rfw-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
.rfw-modal-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #111; }
.rfw-modal-header-right { display: flex; align-items: center; gap: 10px; }
.rfw-powered { font-size: 10px; color: #c4c4c4; text-decoration: none; transition: color 0.15s; letter-spacing: 0.02em; }
.rfw-powered:hover { color: #888; }
.rfw-close { background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: #c4c4c4; padding: 0 2px; transition: color 0.15s; }
.rfw-close:hover { color: #111; }

/* Body */
.rfw-modal-body { padding: 16px; max-height: 540px; overflow-y: auto; }
.rfw-loading { display: flex; align-items: center; gap: 10px; padding: 32px 0; color: #9ca3af; font-size: 13px; justify-content: center; }

/* Position card */
.rfw-pos-card { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
.rfw-pos-row { display: flex; justify-content: space-between; align-items: center; }
.rfw-pos-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
.rfw-pos-value { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.rfw-pos-asset { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); margin-left: 2px; }
.rfw-pos-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 10px 0; }
.rfw-pos-vaults { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.rfw-vault-tag { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
.rfw-positive { color: #4ade80 !important; }
.rfw-pending { color: #fbbf24 !important; }
.rfw-no-position { text-align: center; padding: 8px 0; }
.rfw-no-position-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.3; color: #fff; }
.rfw-no-position p { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; margin: 0 0 3px; }
.rfw-no-position span { color: rgba(255,255,255,0.35); font-size: 11px; }

/* Actions */
.rfw-actions-primary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 7px; }
.rfw-actions-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 12px; }

/* Buttons */
.rfw-btn { border: none; border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: center; white-space: nowrap; letter-spacing: 0.01em; }
.rfw-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.rfw-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.rfw-btn-full { width: 100%; padding: 11px; font-size: 13px; }
.rfw-btn-primary { background: #111; color: #fff; }
.rfw-btn-secondary { background: #f0f0f0; color: #111; }
.rfw-btn-success { background: #16a34a; color: #fff; }
.rfw-btn-outline { background: transparent; color: #111; border: 1.5px solid #e0e0e0; }
.rfw-btn-danger { background: #dc2626; color: #fff; }
.rfw-btn-danger-outline { background: transparent; color: #dc2626; border: 1.5px solid #fca5a5; }

/* History links */
.rfw-history-links { display: flex; align-items: center; border: 1.5px solid #f0f0f0; border-radius: 10px; overflow: hidden; }
.rfw-history-link { flex: 1; background: none; border: none; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s, color 0.15s; }
.rfw-history-link:hover { background: #f9fafb; color: #111; }
.rfw-history-divider { width: 1px; height: 32px; background: #f0f0f0; }

/* Panel */
.rfw-panel { display: flex; flex-direction: column; }
.rfw-back { background: none; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; padding: 0; margin-bottom: 14px; font-family: inherit; text-align: left; transition: color 0.15s; display: inline-flex; align-items: center; gap: 3px; }
.rfw-back:hover { color: #111; }
.rfw-panel-title { font-size: 15px; font-weight: 700; color: #111; margin: 0 0 16px; }
.rfw-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }

/* Vault selector grid */
.rfw-vault-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
.rfw-vault-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 14px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 9px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; font-family: inherit; min-width: 64px; }
.rfw-vault-btn:hover { border-color: #9ca3af; background: #f3f4f6; }
.rfw-vault-btn--selected { border-color: #111; background: #f0f0f0; }
.rfw-vault-btn-label { font-size: 12px; font-weight: 700; color: #111; }
.rfw-vault-btn-sub { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.rfw-vault-btn-amount { font-size: 10px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rfw-compound-badge { position: absolute; top: -5px; right: -5px; background: #6366f1; color: #fff; font-size: 9px; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }

/* Amount input block */
.rfw-amount-block { margin-bottom: 12px; }
.rfw-amount-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
.rfw-balance-hint { font-size: 11px; color: #9ca3af; }
.rfw-balance-hint strong { color: #374151; }
.rfw-input-row { display: flex; gap: 7px; }
.rfw-input { flex: 1; padding: 10px 13px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 15px; font-family: inherit; color: #111; background: #fff; transition: border-color 0.15s; outline: none; }
.rfw-input:focus { border-color: #111; }
.rfw-max-btn { padding: 0 12px; background: #f0f0f0; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; color: #111; cursor: pointer; font-family: inherit; letter-spacing: 0.03em; }
.rfw-max-btn:hover { background: #e5e7eb; }

/* Info & states */
.rfw-info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #111; border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #374151; margin-bottom: 12px; line-height: 1.45; }
.rfw-helper { font-size: 11px; color: #9ca3af; margin: 0 0 12px; }
.rfw-muted { font-size: 13px; color: #9ca3af; margin: 0 0 12px; }
.rfw-error { font-size: 12px; color: #dc2626; background: #fef2f2; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }
.rfw-warning { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }
.rfw-empty-state { text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px; line-height: 1.6; }

/* Claim card */
.rfw-claim-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 14px; text-align: center; }
.rfw-claim-card-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px; }
.rfw-claim-card-amount { font-size: 26px; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums; }
.rfw-claim-card-amount span { font-size: 14px; font-weight: 600; margin-left: 4px; }

/* Exit summary */
.rfw-exit-summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 15px; margin-bottom: 12px; }
.rfw-exit-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #374151; padding: 4px 0; }
.rfw-exit-row-value { font-weight: 600; }

/* Activity list */
.rfw-activity-list { display: flex; flex-direction: column; gap: 8px; }
.rfw-activity-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 11px 13px; background: #fff; }
.rfw-activity-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 0.03em; }
.rfw-activity-body {}
.rfw-activity-main { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.rfw-activity-pool { font-size: 13px; font-weight: 600; color: #111; }
.rfw-activity-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rfw-activity-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; }
.rfw-explorer-link { color: #c4c4c4; text-decoration: none; transition: color 0.15s; font-size: 12px; }
.rfw-explorer-link:hover { color: #111; }

/* Yield history */
.rfw-yield-totals { background: #111; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.rfw-yield-totals-label { font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 8px; }
.rfw-yield-totals-amounts {}
.rfw-yield-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #fff; padding: 2px 0; }
.rfw-yield-list { display: flex; flex-direction: column; gap: 8px; }
.rfw-yield-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; }
.rfw-yield-item-header { margin-bottom: 10px; }
.rfw-yield-item-vault { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111; }
.rfw-compound-dot { background: #6366f1; color: #fff; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rfw-yield-item-rows { display: flex; flex-direction: column; gap: 5px; }
.rfw-yield-stat { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #374151; }
.rfw-yield-stat-label { color: #9ca3af; }

/* Tx status */
.rfw-txstatus { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 16px; text-align: center; }
.rfw-txstatus-title { font-size: 15px; font-weight: 700; color: #111; margin: 0; }
.rfw-txstatus-sub { font-size: 12px; color: #9ca3af; margin: 0; }
.rfw-txstatus-check { width: 48px; height: 48px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
`;
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('rarefi-widget-styles')) return;
  const style = document.createElement('style');
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
function RareFiWidget({
  asset = 'ALPHA',
  userAddress,
  signTransactions,
  apiUrl = 'https://api.rarefi.app/api',
  assetImageUrl,
  theme = 'light',
  renderTrigger
}) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const {
    pools,
    positions,
    transactions,
    loading,
    positionsLoading,
    refresh
  } = useWidgetData({
    asset,
    userAddress,
    apiUrl
  });
  const handleOpen = () => {
    if (!userAddress) {
      console.warn('[RareFiWidget] No userAddress provided — wallet not connected in host app.');
      return;
    }
    setOpen(true);
  };
  const trigger = renderTrigger ? renderTrigger({
    onClick: handleOpen
  }) : /*#__PURE__*/React.createElement("button", {
    className: "rfw-trigger-btn",
    "data-theme": theme,
    onClick: handleOpen,
    disabled: !userAddress,
    title: userAddress ? `${asset} Vaults` : 'Connect wallet to use vaults'
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-icon"
  }, "\u2B21"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-label"
  }, asset, " Vaults"));
  return /*#__PURE__*/React.createElement(React.Fragment, null, trigger, /*#__PURE__*/React.createElement(WidgetModal, {
    open: open,
    onClose: () => setOpen(false),
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

export { RareFiWidget };
//# sourceMappingURL=index.js.map
