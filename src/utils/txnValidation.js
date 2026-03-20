import algosdk from 'algosdk';
import arc56Swap from '../artifacts/RareFiVault.arc56.json';
import arc56Compound from '../artifacts/RareFiAlphaCompoundingVault.arc56.json';

const abiSwap     = new algosdk.ABIContract(arc56Swap);
const abiCompound = new algosdk.ABIContract(arc56Compound);

function getSelector(methodName, poolType = 'swap') {
  const contract = poolType === 'compound' ? abiCompound : abiSwap;
  const actualName = (poolType === 'compound' && methodName === 'swapYield') ? 'compoundYield' : methodName;
  return contract.getMethodByName(actualName).getSelector();
}

const DEPOSIT_SELECTOR  = getSelector('deposit');
const WITHDRAW_SELECTOR = getSelector('withdraw');
const CLAIM_SELECTOR    = getSelector('claim');

const MAX_TXN_FEE_UALGOS = 50_000;

function getSender(txn) {
  if (!txn.sender) return '';
  return txn.sender.toString();
}

function validateSafety(txnGroup) {
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.rekeyTo) return { valid: false, error: `Transaction ${i} has a rekey — refusing to sign` };
    if (txn.assetTransfer?.closeRemainderTo) return { valid: false, error: `Transaction ${i} has close-remainder-to on asset transfer — refusing to sign` };
    if (txn.payment?.closeRemainderTo) return { valid: false, error: `Transaction ${i} has close-remainder-to on payment — refusing to sign` };
  }
  return { valid: true };
}

export function validateOptInTxn(txnGroup, { sender, appId }) {
  if (!txnGroup?.length) return { valid: false, error: 'Empty transaction group' };
  if (txnGroup.length > 1) return { valid: false, error: `Opt-in should be 1 transaction, got ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  const txn = txnGroup[0];
  if (txn.type !== 'appl') return { valid: false, error: `Opt-in should be an app call, got: ${txn.type}` };
  if (sender && getSender(txn) !== sender) return { valid: false, error: 'Transaction sender does not match your wallet' };
  if (appId && txn.applicationCall && Number(txn.applicationCall.appIndex) !== appId) {
    return { valid: false, error: `App call targets wrong vault: ${txn.applicationCall.appIndex} (expected ${appId})` };
  }
  if (txn.applicationCall?.onComplete !== 1) return { valid: false, error: 'Opt-in app call should have OptIn on-complete' };

  return { valid: true };
}

export function validateDepositTxn(txnGroup, { sender, appId, appAddress, amount, depositAssetId }) {
  if (!txnGroup || txnGroup.length < 2) return { valid: false, error: 'Deposit requires at least 2 transactions' };
  if (txnGroup.length > 4) return { valid: false, error: `Deposit has too many transactions: ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  if (sender) {
    for (let i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return { valid: false, error: `Transaction ${i} has unexpected sender` };
    }
  }

  let foundAxfer = false;
  let foundAppCall = false;
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) {
      return { valid: false, error: `Transaction ${i} fee is too high: ${txn.fee} µALGO` };
    }

    if (txn.type === 'axfer' && txn.assetTransfer) {
      const txnAmount = Number(txn.assetTransfer.amount);
      const receiver = txn.assetTransfer.receiver?.toString();
      if (txnAmount === 0) {
        if (sender && receiver !== sender) return { valid: false, error: 'Asset opt-in receiver is not the user — possible theft attempt' };
      } else {
        if (foundAxfer) return { valid: false, error: 'Deposit should have only one asset transfer with value' };
        foundAxfer = true;
        if (appAddress && receiver && receiver !== appAddress) return { valid: false, error: 'Asset transfer is not going to the vault address' };
        if (depositAssetId && Number(txn.assetTransfer.assetIndex) !== depositAssetId) return { valid: false, error: `Wrong asset being transferred` };
        if (amount && txnAmount !== amount) return { valid: false, error: `Transfer amount mismatch: ${txnAmount} (expected ${amount})` };
      }
    } else if (txn.type === 'appl' && txn.applicationCall) {
      if (foundAppCall) return { valid: false, error: 'Deposit should have only one app call' };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return { valid: false, error: `App call targets wrong vault` };
      if (txn.applicationCall.onComplete !== 0) return { valid: false, error: 'Deposit app call should be NoOp' };
      const args = txn.applicationCall.appArgs;
      if (!args?.length || args[0]?.length !== 4) return { valid: false, error: 'Deposit app call missing method selector' };
      for (let j = 0; j < 4; j++) {
        if (args[0][j] !== DEPOSIT_SELECTOR[j]) return { valid: false, error: 'App call method does not match deposit — refusing to sign' };
      }
    } else {
      return { valid: false, error: `Unexpected transaction type in deposit group: ${txn.type}` };
    }
  }

  if (!foundAxfer) return { valid: false, error: 'No deposit asset transfer found' };
  if (!foundAppCall) return { valid: false, error: 'No app call found in deposit group' };
  return { valid: true };
}

export function validateWithdrawTxn(txnGroup, { sender, appId }) {
  if (!txnGroup?.length) return { valid: false, error: 'Empty transaction group' };
  if (txnGroup.length > 2) return { valid: false, error: `Withdraw has too many transactions: ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  if (sender) {
    for (let i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return { valid: false, error: `Transaction ${i} has unexpected sender` };
    }
  }

  let foundAppCall = false;
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return { valid: false, error: `Transaction ${i} fee is too high` };

    if (txn.type === 'appl' && txn.applicationCall) {
      if (foundAppCall) return { valid: false, error: 'Withdraw should have only one app call' };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return { valid: false, error: `App call targets wrong vault` };
      if (txn.applicationCall.onComplete !== 0) return { valid: false, error: 'Withdraw app call should be NoOp' };
      const args = txn.applicationCall.appArgs;
      if (!args?.length || args[0]?.length !== 4) return { valid: false, error: 'Withdraw app call missing method selector' };
      for (let j = 0; j < 4; j++) {
        if (args[0][j] !== WITHDRAW_SELECTOR[j]) return { valid: false, error: 'App call method does not match withdraw — refusing to sign' };
      }
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      if (Number(txn.assetTransfer.amount) !== 0) return { valid: false, error: 'Unexpected asset transfer in withdraw group' };
      if (sender && txn.assetTransfer.receiver?.toString() !== sender) return { valid: false, error: 'Asset transfer receiver is not the user' };
    } else {
      return { valid: false, error: `Unexpected transaction type in withdraw group: ${txn.type}` };
    }
  }

  if (!foundAppCall) return { valid: false, error: 'No app call found in withdraw group' };
  return { valid: true };
}

export function validateClaimTxn(txnGroup, { sender, appId }) {
  if (!txnGroup?.length) return { valid: false, error: 'Empty transaction group' };
  if (txnGroup.length > 3) return { valid: false, error: `Claim has too many transactions: ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  if (sender) {
    for (let i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return { valid: false, error: `Transaction ${i} has unexpected sender` };
    }
  }

  let foundAppCall = false;
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return { valid: false, error: `Transaction ${i} fee is too high` };

    if (txn.type === 'appl' && txn.applicationCall) {
      if (foundAppCall) return { valid: false, error: 'Claim should have only one app call' };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return { valid: false, error: `App call targets wrong vault` };
      if (txn.applicationCall.onComplete !== 0) return { valid: false, error: 'Claim app call should be NoOp' };
      const args = txn.applicationCall.appArgs;
      if (!args?.length || args[0]?.length !== 4) return { valid: false, error: 'Claim app call missing method selector' };
      for (let j = 0; j < 4; j++) {
        if (args[0][j] !== CLAIM_SELECTOR[j]) return { valid: false, error: 'App call method does not match claim — refusing to sign' };
      }
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      if (Number(txn.assetTransfer.amount) !== 0) return { valid: false, error: 'Unexpected asset transfer in claim group' };
      if (sender && txn.assetTransfer.receiver?.toString() !== sender) return { valid: false, error: 'Asset transfer receiver is not the user' };
    } else {
      return { valid: false, error: `Unexpected transaction type in claim group: ${txn.type}` };
    }
  }

  if (!foundAppCall) return { valid: false, error: 'No app call found in claim group' };
  return { valid: true };
}

export function validateCloseOutTxn(txnGroup, { sender, appId }) {
  if (!txnGroup?.length) return { valid: false, error: 'Empty transaction group' };
  if (txnGroup.length > 2) return { valid: false, error: `Close-out has too many transactions: ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  if (sender) {
    for (let i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return { valid: false, error: `Transaction ${i} has unexpected sender` };
    }
  }

  let foundAppCall = false;
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return { valid: false, error: `Transaction ${i} fee is too high` };

    if (txn.type === 'appl' && txn.applicationCall) {
      if (foundAppCall) return { valid: false, error: 'Close-out should have only one app call' };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return { valid: false, error: `App call targets wrong vault` };
      if (txn.applicationCall.onComplete !== 2) return { valid: false, error: 'Close-out app call should have CloseOut on-complete' };
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      if (Number(txn.assetTransfer.amount) !== 0) return { valid: false, error: 'Unexpected asset transfer in close-out group' };
      if (sender && txn.assetTransfer.receiver?.toString() !== sender) return { valid: false, error: 'Asset transfer receiver is not the user' };
    } else {
      return { valid: false, error: `Unexpected transaction type in close-out group: ${txn.type}` };
    }
  }

  if (!foundAppCall) return { valid: false, error: 'No app call found in close-out group' };
  return { valid: true };
}

export function validateSwitchPoolTxn(txnGroup, { sender, fromAppId, toAppId }) {
  if (!txnGroup || txnGroup.length < 3) return { valid: false, error: 'Switch pool requires at least 3 transactions' };
  if (txnGroup.length > 6) return { valid: false, error: `Switch pool has too many transactions: ${txnGroup.length}` };

  const safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;

  if (sender) {
    for (let i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return { valid: false, error: `Transaction ${i} has unexpected sender` };
    }
  }

  const referencedAppIds = new Set();
  let hasAxfer = false;
  for (let i = 0; i < txnGroup.length; i++) {
    const txn = txnGroup[i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return { valid: false, error: `Transaction ${i} fee is too high` };

    if (txn.type === 'appl' && txn.applicationCall) {
      const callAppId = Number(txn.applicationCall.appIndex);
      referencedAppIds.add(callAppId);
      if (fromAppId && toAppId && callAppId !== 0 && callAppId !== fromAppId && callAppId !== toAppId) {
        return { valid: false, error: `App call targets unexpected app: ${callAppId}` };
      }
    } else if (txn.type === 'axfer') {
      hasAxfer = true;
    } else {
      return { valid: false, error: `Unexpected transaction type in switch group: ${txn.type}` };
    }
  }

  if (referencedAppIds.size < 2) return { valid: false, error: 'Switch vault should reference at least 2 different apps' };
  if (!hasAxfer) return { valid: false, error: 'Switch vault should include an asset transfer' };

  return { valid: true };
}
