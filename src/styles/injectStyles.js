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

export default function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('rarefi-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'rarefi-widget-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
