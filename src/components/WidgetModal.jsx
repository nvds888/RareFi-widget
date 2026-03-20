import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatTokenAmount, parseTokenAmount, formatMaxAmount } from '../utils/format';
import { decodeSignAndSubmit } from '../utils/txn';

const EXPLORER_URL = 'https://explorer.perawallet.app';
const INDEXER_URL = 'https://mainnet-idx.algonode.cloud';

// ── Asset avatar ──────────────────────────────────────────────────────────────
function AssetAvatar({ name, imageUrl, size = 28 }) {
  const [err, setErr] = useState(false);
  if (imageUrl && !err) {
    return <img src={imageUrl} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: 6, background: '#e5e7eb',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#6b7280', flexShrink: 0,
    }}>{(name || '?')[0].toUpperCase()}</span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return <span style={{
    display: 'inline-block', width: size, height: size,
    border: '2px solid #e5e7eb', borderTopColor: '#111',
    borderRadius: '50%', animation: 'rfw-spin 0.7s linear infinite',
  }} />;
}

// ── Tx status ─────────────────────────────────────────────────────────────────
function TxStatus({ step, txId, label, onDone }) {
  if (step === 'signing' || step === 'submitting') {
    return (
      <div className="rfw-txstatus">
        <Spinner size={36} />
        <p className="rfw-txstatus-title">{step === 'signing' ? 'Waiting for signature' : 'Broadcasting…'}</p>
        <p className="rfw-txstatus-sub">{step === 'signing' ? 'Confirm in your wallet' : 'Submitting to Algorand'}</p>
      </div>
    );
  }
  if (step === 'success') {
    return (
      <div className="rfw-txstatus">
        <div className="rfw-txstatus-check">✓</div>
        <p className="rfw-txstatus-title">{label}</p>
        {txId && <a href={`${EXPLORER_URL}/tx/${txId}`} target="_blank" rel="noopener noreferrer" className="rfw-explorer-link" style={{ marginBottom: 4 }}>View on Explorer ↗</a>}
        <button className="rfw-btn rfw-btn-primary" style={{ marginTop: 8 }} onClick={onDone}>Done</button>
      </div>
    );
  }
  return null;
}

// ── Fetch wallet balance from Algorand indexer ────────────────────────────────
function useWalletBalance(userAddress, assetId) {
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    if (!userAddress || !assetId) return;
    fetch(`${INDEXER_URL}/v2/accounts/${userAddress}`)
      .then(r => r.json())
      .then(data => {
        const assets = data.account?.assets || [];
        const found = assets.find(a => a['asset-id'] === assetId);
        setBalance(found?.amount ?? 0);
      })
      .catch(() => setBalance(null));
  }, [userAddress, assetId]);
  return balance;
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel({ pools, userAddress, signTransactions, apiUrl, assetName, onBack, onSuccess }) {
  const [selectedPool, setSelectedPool] = useState(pools[0] || null);
  const [amount, setAmount] = useState('');
  const [isOptedIn, setIsOptedIn] = useState(null);
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  const walletBalance = useWalletBalance(userAddress, selectedPool?.depositAssetId);

  useEffect(() => {
    if (!selectedPool || !userAddress) { setIsOptedIn(false); return; }
    setIsOptedIn(null);
    axios.get(`${apiUrl}/pools/${selectedPool.id}/position/${userAddress}`)
      .then(r => setIsOptedIn(r.data.position?.isOptedIn || false))
      .catch(() => setIsOptedIn(false));
  }, [selectedPool?.id, userAddress, apiUrl]);

  const handleOptIn = async () => {
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/opt-in`, { userAddress });
      await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setIsOptedIn(true); setStep('input');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Opt-in failed');
      setStep('input');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) { setError('Enter a valid amount'); return; }
    if (units < 1_000_000) { setError('Minimum deposit is 1 ' + assetName); return; }
    if (walletBalance !== null && units > walletBalance) { setError('Insufficient balance'); return; }
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/deposit`, { userAddress, amount: units });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id); setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Deposit failed');
      setStep('input');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Deposit successful" onDone={onSuccess} />;

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Deposit {assetName}</p>

      <label className="rfw-label">Receive yield in</label>
      <div className="rfw-vault-grid">
        {pools.map(p => {
          const isCompound = p.poolType === 'compound';
          const yieldAsset = isCompound ? assetName : (p.swapAssetName || 'ASA');
          return (
            <button key={p.id}
              className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setSelectedPool(p); setError(''); }}>
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{yieldAsset}</span>
              {isCompound && <span className="rfw-vault-btn-sub">auto</span>}
            </button>
          );
        })}
      </div>

      {isOptedIn === null && <p className="rfw-muted">Checking vault…</p>}

      {isOptedIn === false && (
        <>
          <div className="rfw-info-box">Opt into this vault first to start depositing.</div>
          {error && <p className="rfw-error">{error}</p>}
          <button className="rfw-btn rfw-btn-primary rfw-btn-full" onClick={handleOptIn}>Opt In to Vault</button>
        </>
      )}

      {isOptedIn === true && (
        <form onSubmit={handleDeposit}>
          <div className="rfw-amount-block">
            <div className="rfw-amount-top">
              <label className="rfw-label" style={{ margin: 0 }}>Amount</label>
              {walletBalance !== null && (
                <span className="rfw-balance-hint">
                  Balance: <strong>{formatTokenAmount(walletBalance)} {assetName}</strong>
                </span>
              )}
            </div>
            <div className="rfw-input-row">
              <input className="rfw-input" type="number" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
              {walletBalance !== null && (
                <button type="button" className="rfw-max-btn"
                  onClick={() => setAmount(formatMaxAmount(walletBalance))}>MAX</button>
              )}
            </div>
          </div>
          {error && <p className="rfw-error">{error}</p>}
          <button type="submit" className="rfw-btn rfw-btn-primary rfw-btn-full"
            disabled={!amount || parseFloat(amount) <= 0}>Deposit {assetName}</button>
        </form>
      )}
    </div>
  );
}

// ── Withdraw panel ────────────────────────────────────────────────────────────
function WithdrawPanel({ pools, positions, userAddress, signTransactions, apiUrl, assetName, onBack, onSuccess }) {
  const poolsWithDeposits = pools.filter(p => (positions[p.id]?.depositedAmount || 0) > 0);
  const [selectedPool, setSelectedPool] = useState(poolsWithDeposits[0] || null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  const deposited = selectedPool ? (positions[selectedPool.id]?.depositedAmount || 0) : 0;
  const pendingYield = selectedPool ? (positions[selectedPool.id]?.pendingYield || 0) : 0;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) { setError('Enter a valid amount'); return; }
    if (units > deposited) { setError('Exceeds deposited balance'); return; }
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/withdraw`, { userAddress, amount: units });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id); setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Withdraw failed');
      setStep('input');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Withdrawal successful" onDone={onSuccess} />;
  if (poolsWithDeposits.length === 0) return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <div className="rfw-empty-state">No deposits to withdraw.</div>
    </div>
  );

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Withdraw {assetName}</p>

      {poolsWithDeposits.length > 1 && (
        <>
          <label className="rfw-label">From vault</label>
          <div className="rfw-vault-grid">
            {poolsWithDeposits.map(p => {
              const isCompound = p.poolType === 'compound';
              const yieldAsset = isCompound ? assetName : (p.swapAssetName || 'ASA');
              return (
                <button key={p.id}
                  className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
                  onClick={() => { setSelectedPool(p); setAmount(''); setError(''); }}>
                  {isCompound && <span className="rfw-compound-badge">↻</span>}
                  <span className="rfw-vault-btn-label">{yieldAsset}</span>
                  <span className="rfw-vault-btn-amount">{formatTokenAmount(positions[p.id]?.depositedAmount)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="rfw-amount-block">
        <div className="rfw-amount-top">
          <label className="rfw-label" style={{ margin: 0 }}>Amount</label>
          <span className="rfw-balance-hint">Deposited: <strong>{formatTokenAmount(deposited)} {assetName}</strong></span>
        </div>
        <div className="rfw-input-row">
          <input className="rfw-input" type="number" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
          <button type="button" className="rfw-max-btn" onClick={() => setAmount(formatMaxAmount(deposited))}>MAX</button>
        </div>
      </div>

      {pendingYield > 0 && selectedPool?.poolType !== 'compound' && (
        <div className="rfw-info-box">
          You have {formatTokenAmount(pendingYield)} {selectedPool?.swapAssetName} pending — still claimable after withdrawal.
        </div>
      )}

      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-secondary rfw-btn-full"
        disabled={!amount || parseFloat(amount) <= 0} onClick={handleWithdraw}>Withdraw</button>
    </div>
  );
}

// ── Claim panel ───────────────────────────────────────────────────────────────
function ClaimPanel({ pools, positions, userAddress, signTransactions, apiUrl, onBack, onSuccess }) {
  const poolsWithYield = pools.filter(p => (positions[p.id]?.pendingYield || 0) > 0);
  const [selectedPool, setSelectedPool] = useState(poolsWithYield[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  const pending = selectedPool ? (positions[selectedPool.id]?.pendingYield || 0) : 0;
  const yieldAsset = selectedPool?.swapAssetName || 'ASA';

  const handleClaim = async () => {
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/claim`, { userAddress });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id); setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Claim failed');
      setStep('confirm');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Yield claimed" onDone={onSuccess} />;
  if (poolsWithYield.length === 0) return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <div className="rfw-empty-state">No pending yield to claim.</div>
    </div>
  );

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Claim Yield</p>

      {poolsWithYield.length > 1 && (
        <div className="rfw-vault-grid" style={{ marginBottom: 16 }}>
          {poolsWithYield.map(p => (
            <button key={p.id}
              className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setSelectedPool(p); setError(''); }}>
              <span className="rfw-vault-btn-label">{p.swapAssetName || 'ASA'}</span>
              <span className="rfw-vault-btn-amount">{formatTokenAmount(positions[p.id]?.pendingYield)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rfw-claim-card">
        <div className="rfw-claim-card-label">Claimable now</div>
        <div className="rfw-claim-card-amount">{formatTokenAmount(pending)} <span>{yieldAsset}</span></div>
      </div>

      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-success rfw-btn-full" onClick={handleClaim} disabled={pending <= 0}>
        Claim {formatTokenAmount(pending)} {yieldAsset}
      </button>
    </div>
  );
}

// ── Switch vault panel ────────────────────────────────────────────────────────
function SwitchPanel({ pools, positions, userAddress, signTransactions, apiUrl, assetName, onBack, onSuccess }) {
  const poolsWithDeposits = pools.filter(p => (positions[p.id]?.depositedAmount || 0) > 0);
  const [fromPool, setFromPool] = useState(poolsWithDeposits[0] || null);
  const [toPool, setToPool] = useState(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('select');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  const availableTargets = pools.filter(p => p.id !== fromPool?.id);
  const deposited = fromPool ? (positions[fromPool.id]?.depositedAmount || 0) : 0;

  const handleSwitch = async () => {
    if (!fromPool || !toPool) { setError('Select source and target vault'); return; }
    const units = parseTokenAmount(amount);
    if (units <= 0) { setError('Enter a valid amount'); return; }
    if (units > deposited) { setError('Exceeds deposited balance'); return; }
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/switch-pool`, { userAddress, fromPoolId: fromPool.id, toPoolId: toPool.id, amount: units });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id); setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Switch failed');
      setStep('select');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Vault switched" onDone={onSuccess} />;
  if (poolsWithDeposits.length === 0) return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <div className="rfw-empty-state">No deposits to switch.</div>
    </div>
  );

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Switch Vault</p>
      <label className="rfw-label">From</label>
      <div className="rfw-vault-grid">
        {poolsWithDeposits.map(p => {
          const isCompound = p.poolType === 'compound';
          const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA');
          return (
            <button key={p.id}
              className={`rfw-vault-btn ${fromPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setFromPool(p); setToPool(null); setError(''); }}>
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{label}</span>
              <span className="rfw-vault-btn-amount">{formatTokenAmount(positions[p.id]?.depositedAmount)}</span>
            </button>
          );
        })}
      </div>
      <label className="rfw-label" style={{ marginTop: 8 }}>To</label>
      <div className="rfw-vault-grid">
        {availableTargets.map(p => {
          const isCompound = p.poolType === 'compound';
          const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA');
          return (
            <button key={p.id}
              className={`rfw-vault-btn ${toPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setToPool(p); setError(''); }}>
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="rfw-amount-block">
        <div className="rfw-amount-top">
          <label className="rfw-label" style={{ margin: 0 }}>Amount to switch</label>
          <span className="rfw-balance-hint">Deposited: <strong>{formatTokenAmount(deposited)} {assetName}</strong></span>
        </div>
        <div className="rfw-input-row">
          <input className="rfw-input" type="number" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
          <button type="button" className="rfw-max-btn" onClick={() => setAmount(formatMaxAmount(deposited))}>MAX</button>
        </div>
      </div>

      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-primary rfw-btn-full" onClick={handleSwitch}
        disabled={!fromPool || !toPool || !amount || parseFloat(amount) <= 0} style={{ marginTop: 8 }}>Switch Vault</button>
    </div>
  );
}

// ── Exit panel ────────────────────────────────────────────────────────────────
function ExitPanel({ pools, positions, userAddress, signTransactions, apiUrl, assetName, onBack, onSuccess }) {
  const poolsWithPosition = pools.filter(p => {
    const pos = positions[p.id];
    return (pos?.depositedAmount || 0) > 0 || (pos?.pendingYield || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithPosition[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const pos = selectedPool ? positions[selectedPool.id] : null;

  const handleExit = async () => {
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/close-out`, { userAddress });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id); setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Exit failed');
      setStep('confirm');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Exited vault" onDone={onSuccess} />;
  if (poolsWithPosition.length === 0) return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <div className="rfw-empty-state">No active position to exit.</div>
    </div>
  );

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Exit Vault</p>
      {poolsWithPosition.length > 1 && (
        <div className="rfw-vault-grid">
          {poolsWithPosition.map(p => {
            const isCompound = p.poolType === 'compound';
            const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA');
            return (
              <button key={p.id}
                className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
                onClick={() => { setSelectedPool(p); setError(''); }}>
                <span className="rfw-vault-btn-label">{label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="rfw-exit-summary">
        {pos?.depositedAmount > 0 && (
          <div className="rfw-exit-row">
            <span>Deposit returned</span>
            <span className="rfw-exit-row-value">{formatTokenAmount(pos.depositedAmount)} {assetName}</span>
          </div>
        )}
        {pos?.pendingYield > 0 && (
          <div className="rfw-exit-row">
            <span>Yield claimed</span>
            <span className="rfw-exit-row-value rfw-positive">{formatTokenAmount(pos.pendingYield)} {selectedPool?.swapAssetName || 'ASA'}</span>
          </div>
        )}
      </div>
      <p className="rfw-warning">Closes your position and opts you out of the vault.</p>
      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-danger rfw-btn-full" onClick={handleExit}>Exit &amp; Withdraw All</button>
    </div>
  );
}

// ── Activity panel (transaction history) ─────────────────────────────────────
const TX_CONFIG = {
  deposit:      { label: 'Deposit',      color: '#2563eb', bg: '#eff6ff' },
  withdraw:     { label: 'Withdraw',     color: '#6b7280', bg: '#f9fafb' },
  claim:        { label: 'Claimed Yield',color: '#16a34a', bg: '#f0fdf4' },
  claimYield:   { label: 'Claimed Yield',color: '#16a34a', bg: '#f0fdf4' },
  optIn:        { label: 'Opt In',       color: '#9ca3af', bg: '#f9fafb' },
  closeOut:     { label: 'Exit',         color: '#dc2626', bg: '#fef2f2' },
  compoundYield:{ label: 'Compounded',   color: '#7c3aed', bg: '#f5f3ff' },
  swapYield:    { label: 'Swap Yield',   color: '#7c3aed', bg: '#f5f3ff' },
};

function ActivityPanel({ transactions, assetName, onBack }) {
  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Activity</p>
      {transactions.length === 0
        ? <div className="rfw-empty-state">No transactions yet.</div>
        : (
          <div className="rfw-activity-list">
            {transactions.map(tx => {
              const cfg = TX_CONFIG[tx.type] || { label: 'Transaction', color: '#6b7280', bg: '#f9fafb' };
              const poolLabel = tx.pool?.poolType === 'compound'
                ? assetName + ' Vault (auto)'
                : `${tx.pool?.swapAssetName || 'ASA'} Vault`;
              return (
                <div key={tx.id} className="rfw-activity-item">
                  <div className="rfw-activity-badge" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </div>
                  <div className="rfw-activity-body">
                    <div className="rfw-activity-main">
                      <span className="rfw-activity-pool">{poolLabel}</span>
                      {tx.amount > 0 && (
                        <span className="rfw-activity-amount" style={{ color: cfg.color }}>
                          {['deposit','withdraw','closeOut'].includes(tx.type) ? '' : '+'}
                          {formatTokenAmount(tx.amount)}
                        </span>
                      )}
                    </div>
                    <div className="rfw-activity-meta">
                      {tx.timestamp && <span>{new Date(tx.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      <a href={`${EXPLORER_URL}/tx/${tx.id}`} target="_blank" rel="noopener noreferrer" className="rfw-explorer-link">↗</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── Yield history panel ───────────────────────────────────────────────────────
function YieldHistoryPanel({ userAddress, apiUrl, assetName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    axios.get(`${apiUrl}/pools/yield-history/${userAddress}`)
      .then(r => {
        const filtered = (r.data.yieldHistory || []).filter(
          item => item.poolType === 'compound' || item.yieldAsset
        );
        setHistory(filtered);
      })
      .catch(() => setError('Failed to load yield history'))
      .finally(() => setLoading(false));
  }, [userAddress, apiUrl]);

  const totalByToken = {};
  history.forEach(item => {
    const token = item.poolType === 'compound' ? assetName : (item.yieldAsset || item.swapAssetName || 'ASA');
    totalByToken[token] = (totalByToken[token] || 0) + (item.yieldAmount || 0);
  });

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Yield History</p>

      {loading && <div className="rfw-loading" style={{ padding: '24px 0' }}><Spinner /></div>}
      {error && <p className="rfw-error">{error}</p>}

      {!loading && !error && history.length === 0 && (
        <div className="rfw-empty-state">No yield history yet.<br /><span style={{ fontSize: 11 }}>Deposit to start earning.</span></div>
      )}

      {!loading && !error && history.length > 0 && (
        <>
          {/* Total earned summary */}
          {Object.keys(totalByToken).length > 0 && (
            <div className="rfw-yield-totals">
              <div className="rfw-yield-totals-label">Total earned</div>
              <div className="rfw-yield-totals-amounts">
                {Object.entries(totalByToken).map(([token, amt]) => (
                  <div key={token} className="rfw-yield-total-row">
                    <span>{token}</span>
                    <span className="rfw-positive">+{formatTokenAmount(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-vault breakdown */}
          <div className="rfw-yield-list">
            {history.map((item, i) => {
              const isCompound = item.poolType === 'compound';
              const yieldToken = isCompound ? assetName : (item.yieldAsset || item.swapAssetName || 'ASA');
              const vaultLabel = isCompound ? assetName + ' Vault (auto-compound)' : yieldToken + ' Vault';
              return (
                <div key={i} className="rfw-yield-item">
                  <div className="rfw-yield-item-header">
                    <div className="rfw-yield-item-vault">
                      {isCompound && <span className="rfw-compound-dot">↻</span>}
                      <span>{vaultLabel}</span>
                    </div>
                  </div>
                  <div className="rfw-yield-item-rows">
                    <div className="rfw-yield-stat">
                      <span className="rfw-yield-stat-label">{isCompound ? 'Compounded' : 'Claimed'}</span>
                      <span className="rfw-positive">+{formatTokenAmount(item.yieldAmount)} {yieldToken}</span>
                    </div>
                    {item.pendingYield > 0 && (
                      <div className="rfw-yield-stat">
                        <span className="rfw-yield-stat-label">Pending</span>
                        <span className="rfw-pending">+{formatTokenAmount(item.pendingYield)} {yieldToken}</span>
                      </div>
                    )}
                    {item.swapDays?.length > 0 && (
                      <div className="rfw-yield-stat">
                        <span className="rfw-yield-stat-label">Distributions</span>
                        <span>{item.swapDays.length}×</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Home view ─────────────────────────────────────────────────────────────────
function HomeView({ pools, positions, positionsLoading, assetName, assetImageUrl, onAction }) {
  const totalDeposit = Object.values(positions).reduce((s, p) => s + (p.depositedAmount || 0), 0);
  const hasDeposit = totalDeposit > 0;

  const pendingByToken = {};
  pools.forEach(pool => {
    const pos = positions[pool.id];
    if (pos?.pendingYield > 0) {
      const token = pool.swapAssetName || 'ASA';
      pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
    }
  });
  const hasPendingYield = Object.keys(pendingByToken).length > 0;
  const activeVaults = pools.filter(p => (positions[p.id]?.depositedAmount || 0) > 0);

  return (
    <div className="rfw-home">
      {/* Position card */}
      <div className="rfw-pos-card">
        {positionsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 13, color: '#9ca3af' }}>Loading…</span></div>
        ) : hasDeposit || hasPendingYield ? (
          <>
            <div className="rfw-pos-row">
              <span className="rfw-pos-label">Your Deposit</span>
              <span className="rfw-pos-value">{formatTokenAmount(totalDeposit)} <span className="rfw-pos-asset">{assetName}</span></span>
            </div>
            <div className="rfw-pos-divider" />
            <div className="rfw-pos-row">
              <span className="rfw-pos-label">Pending Yield</span>
              <span className="rfw-pos-value rfw-positive">
                {hasPendingYield
                  ? Object.entries(pendingByToken).map(([t, a]) => `+${formatTokenAmount(a)} ${t}`).join(' · ')
                  : '—'}
              </span>
            </div>
            {activeVaults.length > 0 && (
              <div className="rfw-pos-vaults">
                {activeVaults.map(p => {
                  const isCompound = p.poolType === 'compound';
                  const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
                  return <span key={p.id} className="rfw-vault-tag">{label}</span>;
                })}
              </div>
            )}
          </>
        ) : (
          <div className="rfw-no-position">
            <div className="rfw-no-position-icon">⬡</div>
            <p>No active position</p>
            <span>Deposit to start earning yield</span>
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="rfw-actions-primary">
        <button className="rfw-btn rfw-btn-primary" onClick={() => onAction('deposit')}>Deposit</button>
        <button className="rfw-btn rfw-btn-secondary" onClick={() => onAction('withdraw')} disabled={!hasDeposit}>Withdraw</button>
        <button className="rfw-btn rfw-btn-success" onClick={() => onAction('claim')} disabled={!hasPendingYield}>Claim Yield</button>
      </div>

      {/* Secondary actions */}
      <div className="rfw-actions-secondary">
        <button className="rfw-btn rfw-btn-outline" onClick={() => onAction('switch')} disabled={!hasDeposit || pools.length <= 1}>Switch Vault</button>
        <button className="rfw-btn rfw-btn-danger-outline" onClick={() => onAction('exit')} disabled={!hasDeposit && !hasPendingYield}>Exit</button>
      </div>

      {/* History links */}
      <div className="rfw-history-links">
        <button className="rfw-history-link" onClick={() => onAction('activity')}>
          <span>📋</span> Activity
        </button>
        <div className="rfw-history-divider" />
        <button className="rfw-history-link" onClick={() => onAction('yieldHistory')}>
          <span>📈</span> Yield History
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function WidgetModal({
  open, onClose,
  pools, positions, transactions, loading, positionsLoading, onRefresh,
  userAddress, signTransactions, apiUrl, asset, assetImageUrl,
}) {
  const [view, setView] = useState('home');
  if (!open) return null;

  const goHome = () => { setView('home'); onRefresh(); };
  const common = { pools, positions, userAddress, signTransactions, apiUrl, assetName: asset, onBack: () => setView('home'), onSuccess: goHome };

  const renderView = () => {
    switch (view) {
      case 'deposit':      return <DepositPanel {...common} />;
      case 'withdraw':     return <WithdrawPanel {...common} />;
      case 'claim':        return <ClaimPanel {...common} />;
      case 'switch':       return <SwitchPanel {...common} />;
      case 'exit':         return <ExitPanel {...common} />;
      case 'activity':     return <ActivityPanel transactions={transactions} assetName={asset} onBack={() => setView('home')} />;
      case 'yieldHistory': return <YieldHistoryPanel userAddress={userAddress} apiUrl={apiUrl} assetName={asset} onBack={() => setView('home')} />;
      default: return <HomeView pools={pools} positions={positions} positionsLoading={positionsLoading} assetName={asset} assetImageUrl={assetImageUrl} onAction={setView} />;
    }
  };

  return (
    <div className="rfw-overlay" onClick={onClose}>
      <div className="rfw-modal" onClick={e => e.stopPropagation()}>
        <div className="rfw-modal-header">
          <div className="rfw-modal-title">
            <AssetAvatar name={asset} imageUrl={assetImageUrl} size={28} />
            <span>{asset} Vaults</span>
          </div>
          <div className="rfw-modal-header-right">
            <a href="https://rarefi.app" target="_blank" rel="noopener noreferrer" className="rfw-powered">Powered by RareFi ↗</a>
            <button className="rfw-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="rfw-modal-body">
          {loading
            ? <div className="rfw-loading"><Spinner /><span>Loading vaults…</span></div>
            : renderView()}
        </div>
      </div>
    </div>
  );
}
