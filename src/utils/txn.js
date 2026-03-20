import algosdk from 'algosdk';
import axios from 'axios';
import { Buffer } from 'buffer';

/**
 * Decode base64-encoded unsigned transactions for validation purposes.
 */
export function decodeTxns(b64Txns) {
  return b64Txns.map(b64 => algosdk.decodeUnsignedTransaction(Buffer.from(b64, 'base64')));
}

/**
 * Sign and submit transactions — same pattern as the main RareFi app.
 * Passes decoded Transaction objects to signTransactions.
 */
export async function signAndSubmit(b64Txns, signTransactions, apiUrl) {
  const txnGroup = decodeTxns(b64Txns);
  const signedTxns = await signTransactions(txnGroup);
  const signedTxnsBase64 = signedTxns.map(t => Buffer.from(t).toString('base64'));
  const response = await axios.post(`${apiUrl}/pools/submit`, { signedTxns: signedTxnsBase64 });
  return response.data.txId;
}

/**
 * Convenience: decode, sign, and submit without validation.
 */
export async function decodeSignAndSubmit(b64Txns, signTransactions, apiUrl) {
  return signAndSubmit(b64Txns, signTransactions, apiUrl);
}
