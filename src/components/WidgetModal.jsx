import React, { useState } from 'react';
import axios from 'axios';
import { formatTokenAmount, parseTokenAmount, formatMaxAmount } from '../utils/format';
import { decodeSignAndSubmit } from '../utils/txn';

const EXPLORER_URL = 'https://explorer.perawallet.app';

// ── Tiny asset avatar ─────────────────────────────────────────────────────────
function AssetAvatar({ name, imageUrl, size = 28 }) {
  const [err, setErr] = useState(false);
  if (imageUrl && !err) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: 6, background: '#e5e7eb',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#6b7280', flexShrink: 0
    }}>
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid #e5e7eb`, borderTopColor: '#111',
      borderRadius: '50%', animation: 'rfw-spin 0.7s linear infinite'
    }} />
  );
}

// ── Tx status screen (signing / submitting / success / error) ─────────────────
function TxStatus({ step, txId, label, onDone }) {
  if (step === 'signing' || step === 'submitting') {
    return (
      <div className="rfw-txstatus">
        <Spinner size={32} />
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
        {txId && (
          <a href={`${EXPLORER_URL}/tx/${txId}`} target="_blank" rel="noopener noreferrer" className="rfw-explorer-link">
            View on Explorer ↗
          </a>
        )}
        <button className="rfw-btn rfw-btn-primary" style={{ marginTop: 12 }} onClick={onDone}>Done</button>
      </div>
    );
  }
  return null;
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel({ pools, userAddress, signTransactions, apiUrl, assetName, assetImageUrl, onBack, onSuccess }) {
  const [selectedPool, setSelectedPool] = useState(pools[0] || null);
  const [amount, setAmount] = useState('');
  const [isOptedIn, setIsOptedIn] = useState(null); // null = loading
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!selectedPool || !userAddress) { setIsOptedIn(false); return; }
    axios.get(`${apiUrl}/pools/${selectedPool.id}/position/${userAddress}`)
      .then(r => setIsOptedIn(r.data.position?.isOptedIn || false))
      .catch(() => setIsOptedIn(false));
  }, [selectedPool, userAddress, apiUrl]);

  const handleOptIn = async () => {
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/opt-in`, { userAddress });
      const txId = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setIsOptedIn(true);
      setStep('input');
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
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/deposit`, { userAddress, amount: units });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
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

      {/* Vault selector */}
      <label className="rfw-label">Receive yield in</label>
      <div className="rfw-vault-grid">
        {pools.map(p => {
          const isCompound = p.poolType === 'compound';
          const yieldAsset = isCompound ? assetName : (p.swapAssetName || 'ASA');
          return (
            <button
              key={p.id}
              className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setSelectedPool(p); setError(''); }}
            >
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{yieldAsset}</span>
            </button>
          );
        })}
      </div>

      {isOptedIn === null && <p className="rfw-muted">Checking vault status…</p>}

      {isOptedIn === false && (
        <div>
          <p className="rfw-muted" style={{ marginBottom: 8 }}>You need to opt into this vault first.</p>
          {error && <p className="rfw-error">{error}</p>}
          <button className="rfw-btn rfw-btn-primary" onClick={handleOptIn}>Opt In</button>
        </div>
      )}

      {isOptedIn === true && (
        <form onSubmit={handleDeposit}>
          <label className="rfw-label">Amount</label>
          <div className="rfw-input-row">
            <input
              className="rfw-input"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>
          {error && <p className="rfw-error">{error}</p>}
          <button type="submit" className="rfw-btn rfw-btn-primary" disabled={!amount || parseFloat(amount) <= 0}>
            Deposit
          </button>
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

  const position = selectedPool ? positions[selectedPool.id] : null;
  const deposited = position?.depositedAmount || 0;

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) { setError('Enter a valid amount'); return; }
    if (units > deposited) { setError('Exceeds deposited balance'); return; }
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/withdraw`, { userAddress, amount: units });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Withdraw failed');
      setStep('input');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Withdrawal successful" onDone={onSuccess} />;

  if (poolsWithDeposits.length === 0) {
    return (
      <div className="rfw-panel">
        <button className="rfw-back" onClick={onBack}>← Back</button>
        <p className="rfw-muted">No deposits to withdraw.</p>
      </div>
    );
  }

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
              const pos = positions[p.id];
              return (
                <button
                  key={p.id}
                  className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
                  onClick={() => { setSelectedPool(p); setAmount(''); setError(''); }}
                >
                  {isCompound && <span className="rfw-compound-badge">↻</span>}
                  <span className="rfw-vault-btn-label">{yieldAsset}</span>
                  <span className="rfw-vault-btn-amount">{formatTokenAmount(pos?.depositedAmount)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <form onSubmit={handleWithdraw}>
        <label className="rfw-label">Amount</label>
        <div className="rfw-input-row">
          <input
            className="rfw-input"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
          <button type="button" className="rfw-max-btn" onClick={() => setAmount(formatMaxAmount(deposited))}>MAX</button>
        </div>
        <p className="rfw-helper">Deposited: {formatTokenAmount(deposited)} {assetName}</p>
        {error && <p className="rfw-error">{error}</p>}
        <button type="submit" className="rfw-btn rfw-btn-secondary" disabled={!amount || parseFloat(amount) <= 0}>
          Withdraw
        </button>
      </form>
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

  const position = selectedPool ? positions[selectedPool.id] : null;
  const pending = position?.pendingYield || 0;
  const yieldAsset = selectedPool?.swapAssetName || 'ASA';

  const handleClaim = async () => {
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/claim`, { userAddress });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Claim failed');
      setStep('confirm');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Yield claimed" onDone={onSuccess} />;

  if (poolsWithYield.length === 0) {
    return (
      <div className="rfw-panel">
        <button className="rfw-back" onClick={onBack}>← Back</button>
        <p className="rfw-muted">No pending yield to claim.</p>
      </div>
    );
  }

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Claim Yield</p>

      {poolsWithYield.length > 1 && (
        <div className="rfw-vault-grid">
          {poolsWithYield.map(p => {
            const pos = positions[p.id];
            return (
              <button
                key={p.id}
                className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
                onClick={() => { setSelectedPool(p); setError(''); }}
              >
                <span className="rfw-vault-btn-label">{p.swapAssetName || 'ASA'}</span>
                <span className="rfw-vault-btn-amount">{formatTokenAmount(pos?.pendingYield)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rfw-claim-summary">
        <span>Claimable</span>
        <span className="rfw-claim-amount">{formatTokenAmount(pending)} {yieldAsset}</span>
      </div>

      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-success" onClick={handleClaim} disabled={pending <= 0}>
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
  const [step, setStep] = useState('select');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');

  const availableTargets = pools.filter(p => p.id !== fromPool?.id);

  const handleSwitch = async () => {
    if (!fromPool || !toPool) { setError('Select source and target vault'); return; }
    setStep('signing'); setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/switch-pool`, {
        userAddress,
        fromPoolId: fromPool.id,
        toPoolId: toPool.id,
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Switch failed');
      setStep('select');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Vault switched" onDone={onSuccess} />;

  if (poolsWithDeposits.length === 0) {
    return (
      <div className="rfw-panel">
        <button className="rfw-back" onClick={onBack}>← Back</button>
        <p className="rfw-muted">No deposits to switch.</p>
      </div>
    );
  }

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
            <button
              key={p.id}
              className={`rfw-vault-btn ${fromPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setFromPool(p); setToPool(null); setError(''); }}
            >
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{label}</span>
              <span className="rfw-vault-btn-amount">{formatTokenAmount(positions[p.id]?.depositedAmount)}</span>
            </button>
          );
        })}
      </div>

      <label className="rfw-label" style={{ marginTop: 12 }}>To</label>
      <div className="rfw-vault-grid">
        {availableTargets.map(p => {
          const isCompound = p.poolType === 'compound';
          const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA');
          return (
            <button
              key={p.id}
              className={`rfw-vault-btn ${toPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
              onClick={() => { setToPool(p); setError(''); }}
            >
              {isCompound && <span className="rfw-compound-badge">↻</span>}
              <span className="rfw-vault-btn-label">{label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-primary" onClick={handleSwitch} disabled={!fromPool || !toPool} style={{ marginTop: 12 }}>
        Switch Vault
      </button>
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
      setTxId(id);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Exit failed');
      setStep('confirm');
    }
  };

  if (step === 'signing' || step === 'submitting') return <TxStatus step={step} />;
  if (step === 'success') return <TxStatus step="success" txId={txId} label="Exited vault" onDone={onSuccess} />;

  if (poolsWithPosition.length === 0) {
    return (
      <div className="rfw-panel">
        <button className="rfw-back" onClick={onBack}>← Back</button>
        <p className="rfw-muted">No active position to exit.</p>
      </div>
    );
  }

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
              <button
                key={p.id}
                className={`rfw-vault-btn ${selectedPool?.id === p.id ? 'rfw-vault-btn--selected' : ''}`}
                onClick={() => { setSelectedPool(p); setError(''); }}
              >
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
            <span>{formatTokenAmount(pos.depositedAmount)} {assetName}</span>
          </div>
        )}
        {pos?.pendingYield > 0 && (
          <div className="rfw-exit-row">
            <span>Yield claimed</span>
            <span>{formatTokenAmount(pos.pendingYield)} {selectedPool?.swapAssetName || 'ASA'}</span>
          </div>
        )}
      </div>

      <p className="rfw-warning">This will close your position and opt you out of the vault.</p>
      {error && <p className="rfw-error">{error}</p>}
      <button className="rfw-btn rfw-btn-danger" onClick={handleExit}>
        Exit &amp; Withdraw All
      </button>
    </div>
  );
}

// ── History panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ transactions, assetName, onBack }) {
  const TX_LABELS = {
    deposit: 'Deposit', withdraw: 'Withdraw', claim: 'Claimed Yield',
    claimYield: 'Claimed Yield', optIn: 'Opt In', closeOut: 'Exit',
    compoundYield: 'Swap Yield', swapYield: 'Swap Yield', unknown: 'Transaction'
  };

  return (
    <div className="rfw-panel">
      <button className="rfw-back" onClick={onBack}>← Back</button>
      <p className="rfw-panel-title">Yield History</p>
      {transactions.length === 0 && <p className="rfw-muted">No transactions yet.</p>}
      <div className="rfw-history-list">
        {transactions.map(tx => {
          const label = TX_LABELS[tx.type] || 'Transaction';
          const poolLabel = tx.pool?.poolType === 'compound'
            ? assetName + ' Vault'
            : `${tx.pool?.swapAssetName || 'ASA'} Vault`;
          return (
            <div key={tx.id} className="rfw-history-item">
              <div className="rfw-history-main">
                <span className="rfw-history-label">{label}</span>
                {tx.amount > 0 && (
                  <span className="rfw-history-amount">{formatTokenAmount(tx.amount)}</span>
                )}
              </div>
              <div className="rfw-history-meta">
                <span>{poolLabel}</span>
                {tx.timestamp && (
                  <span>{new Date(tx.timestamp * 1000).toLocaleDateString()}</span>
                )}
                <a href={`${EXPLORER_URL}/tx/${tx.id}`} target="_blank" rel="noopener noreferrer" className="rfw-explorer-link">↗</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Home view (position summary + action buttons) ─────────────────────────────
function HomeView({
  pools, positions, transactions, loading, positionsLoading,
  userAddress, assetName, assetImageUrl, onAction
}) {
  const totalDeposit = Object.values(positions).reduce((s, p) => s + (p.depositedAmount || 0), 0);
  const hasDeposit = totalDeposit > 0;

  // pending yield per token
  const pendingByToken = {};
  pools.forEach(pool => {
    const pos = positions[pool.id];
    if (pos?.pendingYield > 0) {
      const token = pool.swapAssetName || 'ASA';
      pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
    }
  });
  const hasPendingYield = Object.keys(pendingByToken).length > 0;

  // active vaults breakdown
  const activeVaults = pools.filter(p => (positions[p.id]?.depositedAmount || 0) > 0);

  return (
    <div className="rfw-home">
      {/* Position */}
      <div className="rfw-position-card">
        {positionsLoading ? (
          <p className="rfw-muted">Loading position…</p>
        ) : hasDeposit || hasPendingYield ? (
          <>
            <div className="rfw-stat-row">
              <span className="rfw-stat-label">Your Deposit</span>
              <span className="rfw-stat-value">{formatTokenAmount(totalDeposit)} {assetName}</span>
            </div>
            <div className="rfw-stat-row">
              <span className="rfw-stat-label">Pending Yield</span>
              <span className="rfw-stat-value">
                {hasPendingYield
                  ? Object.entries(pendingByToken).map(([token, amt]) =>
                      `${formatTokenAmount(amt)} ${token}`
                    ).join(' · ')
                  : '0'}
              </span>
            </div>
            {activeVaults.length > 0 && (
              <div className="rfw-vaults-in">
                {activeVaults.map(p => {
                  const isCompound = p.poolType === 'compound';
                  const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
                  return (
                    <span key={p.id} className="rfw-vault-tag">{label}</span>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="rfw-muted rfw-no-position">No active position — deposit to start earning yield.</p>
        )}
      </div>

      {/* Actions */}
      <div className="rfw-actions">
        <button className="rfw-btn rfw-btn-primary" onClick={() => onAction('deposit')}>
          Deposit
        </button>
        <button className="rfw-btn rfw-btn-secondary" onClick={() => onAction('withdraw')} disabled={!hasDeposit}>
          Withdraw
        </button>
        <button className="rfw-btn rfw-btn-success" onClick={() => onAction('claim')} disabled={!hasPendingYield}>
          Claim Yield
        </button>
      </div>
      <div className="rfw-actions rfw-actions--row2">
        <button className="rfw-btn rfw-btn-outline" onClick={() => onAction('switch')} disabled={!hasDeposit || pools.length <= 1}>
          Switch Vault
        </button>
        <button className="rfw-btn rfw-btn-danger-outline" onClick={() => onAction('exit')} disabled={!hasDeposit && !hasPendingYield}>
          Exit
        </button>
        <button className="rfw-btn rfw-btn-ghost" onClick={() => onAction('history')}>
          History
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function WidgetModal({
  open, onClose,
  pools, positions, transactions, loading, positionsLoading, onRefresh,
  userAddress, signTransactions, apiUrl,
  asset, assetImageUrl,
}) {
  const [view, setView] = useState('home');

  if (!open) return null;

  const goHome = () => {
    setView('home');
    onRefresh();
  };

  const renderView = () => {
    const common = { pools, positions, userAddress, signTransactions, apiUrl, assetName: asset, assetImageUrl, onBack: () => setView('home'), onSuccess: goHome };
    switch (view) {
      case 'deposit':  return <DepositPanel  {...common} />;
      case 'withdraw': return <WithdrawPanel {...common} />;
      case 'claim':    return <ClaimPanel    {...common} />;
      case 'switch':   return <SwitchPanel   {...common} />;
      case 'exit':     return <ExitPanel     {...common} />;
      case 'history':  return <HistoryPanel  transactions={transactions} assetName={asset} onBack={() => setView('home')} />;
      default: return (
        <HomeView
          pools={pools} positions={positions} transactions={transactions}
          loading={loading} positionsLoading={positionsLoading}
          userAddress={userAddress} assetName={asset} assetImageUrl={assetImageUrl}
          onAction={setView}
        />
      );
    }
  };

  return (
    <div className="rfw-overlay" onClick={onClose}>
      <div className="rfw-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="rfw-modal-header">
          <div className="rfw-modal-title">
            <AssetAvatar name={asset} imageUrl={assetImageUrl} size={26} />
            <span>{asset} Vaults</span>
          </div>
          <div className="rfw-modal-header-right">
            <a href="https://rarefi.app" target="_blank" rel="noopener noreferrer" className="rfw-powered">
              Powered by RareFi
            </a>
            <button className="rfw-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Body */}
        <div className="rfw-modal-body">
          {loading ? (
            <div className="rfw-loading"><Spinner /> <span>Loading vaults…</span></div>
          ) : (
            renderView()
          )}
        </div>
      </div>
    </div>
  );
}
