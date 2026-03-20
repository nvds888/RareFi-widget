import algosdk from 'algosdk';
import axios from 'axios';

/**
 * Decode base64-encoded unsigned transactions from the RareFi backend,
 * sign them using the provided signer, and submit them.
 *
 * @param {string[]} b64Txns - Array of base64-encoded unsigned transactions
 * @param {Function} signTransactions - Signer from host wallet (e.g. useWallet().signTransactions)
 * @param {string} apiUrl - RareFi backend base URL
 * @returns {Promise<string>} transaction ID
 */
export async function decodeSignAndSubmit(b64Txns, signTransactions, apiUrl) {
  const txnGroup = b64Txns.map(b64 =>
    algosdk.decodeUnsignedTransaction(Buffer.from(b64, 'base64'))
  );

  const signedTxns = await signTransactions(txnGroup);

  const signedTxnsBase64 = signedTxns.map(t => Buffer.from(t).toString('base64'));
  const response = await axios.post(`${apiUrl}/pools/submit`, {
    signedTxns: signedTxnsBase64
  });

  return response.data.txId;
}
