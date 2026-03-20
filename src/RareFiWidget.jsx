import React, { useState } from 'react';
import WidgetModal from './components/WidgetModal';
import { useWidgetData } from './hooks/useWidgetData';
import './styles/widget.css';

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
export default function RareFiWidget({
  asset = 'ALPHA',
  userAddress,
  signTransactions,
  apiUrl = 'https://api.rarefi.app/api',
  assetImageUrl,
  theme = 'light',
  renderTrigger,
}) {
  const [open, setOpen] = useState(false);

  const { pools, positions, transactions, loading, positionsLoading, refresh } =
    useWidgetData({ asset, userAddress, apiUrl });

  const handleOpen = () => {
    if (!userAddress) {
      console.warn('[RareFiWidget] No userAddress provided — wallet not connected in host app.');
      return;
    }
    setOpen(true);
  };

  const trigger = renderTrigger
    ? renderTrigger({ onClick: handleOpen })
    : (
      <button
        className="rfw-trigger-btn"
        data-theme={theme}
        onClick={handleOpen}
        disabled={!userAddress}
        title={userAddress ? `${asset} Vaults` : 'Connect wallet to use vaults'}
      >
        <span className="rfw-trigger-icon">⬡</span>
        <span className="rfw-trigger-label">{asset} Vaults</span>
      </button>
    );

  return (
    <>
      {trigger}
      <WidgetModal
        open={open}
        onClose={() => setOpen(false)}
        pools={pools}
        positions={positions}
        transactions={transactions}
        loading={loading}
        positionsLoading={positionsLoading}
        onRefresh={refresh}
        userAddress={userAddress}
        signTransactions={signTransactions}
        apiUrl={apiUrl}
        asset={asset}
        assetImageUrl={assetImageUrl}
        theme={theme}
      />
    </>
  );
}
