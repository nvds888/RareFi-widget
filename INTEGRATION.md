# RareFi Widget — Integration Guide

## Install

```bash
npm install @rarefi/widget algosdk axios
```

## Usage (Alpha Arcade example)

```jsx
import { RareFiWidget } from '@rarefi/widget';
import { useWallet } from '@txnlab/use-wallet-react';

function MyApp() {
  const { activeAddress, signTransactions } = useWallet();

  return (
    <RareFiWidget
      asset="ALPHA"
      userAddress={activeAddress}
      signTransactions={signTransactions}
      apiUrl="https://api.rarefi.app/api"
      assetImageUrl="/alphalogo.png"
      theme="light"
    />
  );
}
```

That's it. The widget renders a button. When clicked, a modal appears on top of
the host app. The user's already-connected wallet is used to sign — no separate
wallet connection step.

## Props

| Prop               | Type       | Required | Description                                                    |
|--------------------|------------|----------|----------------------------------------------------------------|
| `asset`            | `string`   | yes      | Deposit asset name, e.g. `'ALPHA'`                             |
| `userAddress`      | `string`   | yes      | Connected wallet address from host app                         |
| `signTransactions` | `Function` | yes      | `wallet.signTransactions` from `@txnlab/use-wallet-react`      |
| `apiUrl`           | `string`   | no       | RareFi backend URL (default: `https://api.rarefi.app/api`)     |
| `assetImageUrl`    | `string`   | no       | URL to asset logo                                              |
| `theme`            | `string`   | no       | `'light'` or `'dark'` (default: `'light'`)                     |
| `renderTrigger`    | `Function` | no       | Custom trigger: `({ onClick }) => <YourButton onClick={onClick} />` |

## Custom trigger button

```jsx
<RareFiWidget
  asset="ALPHA"
  userAddress={activeAddress}
  signTransactions={signTransactions}
  renderTrigger={({ onClick }) => (
    <button className="my-arcade-button" onClick={onClick}>
      Earn Yield
    </button>
  )}
/>
```

## Signing interface

`signTransactions` must satisfy:
```ts
(txns: algosdk.Transaction[]) => Promise<Uint8Array[]>
```

This is exactly what `@txnlab/use-wallet-react`'s `useWallet()` returns.
If your app uses a different wallet library, wrap it to match this signature.
