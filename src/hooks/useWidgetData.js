import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useWidgetData({ asset, userAddress, apiUrl }) {
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
    } catch {
      return [];
    }
  }, [asset, apiUrl]);

  const fetchPositions = useCallback(async (poolList, address) => {
    if (!address || poolList.length === 0) return {};
    const result = {};
    await Promise.all(
      poolList.map(async (pool) => {
        try {
          const res = await axios.get(`${apiUrl}/pools/${pool.id}/position/${address}`);
          if (res.data.position) result[pool.id] = res.data.position;
        } catch {}
      })
    );
    return result;
  }, [apiUrl]);

  const fetchTransactions = useCallback(async (address) => {
    if (!address) return [];
    try {
      const res = await axios.get(`${apiUrl}/pools/transactions/${address}`);
      return res.data.transactions || [];
    } catch {
      return [];
    }
  }, [apiUrl]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const poolList = await fetchPools();
    setPools(poolList);

    setPositionsLoading(true);
    const [pos, txns] = await Promise.all([
      fetchPositions(poolList, userAddress),
      fetchTransactions(userAddress),
    ]);
    setPositions(pos);
    setTransactions(txns);
    setPositionsLoading(false);
    setLoading(false);
  }, [fetchPools, fetchPositions, fetchTransactions, userAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pools, positions, transactions, loading, positionsLoading, refresh };
}
