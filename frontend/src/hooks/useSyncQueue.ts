import { useState, useEffect, useCallback, useRef } from 'react';
import {
  syncPendingCheckIns,
  syncPendingReports,
  getAllLocalCheckIns,
  getAllLocalReports,
} from '../db/offlineStore';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function useSyncQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const [checkins, reports] = await Promise.all([
      getAllLocalCheckIns(),
      getAllLocalReports(),
    ]);
    const unsynced =
      checkins.filter((c) => !c.synced).length +
      reports.filter((r) => !r.synced).length;
    setPendingCount(unsynced);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await syncPendingCheckIns(API_URL);
      await syncPendingReports(API_URL);
    } finally {
      await refreshPendingCount();
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
    if (navigator.onLine) {
      triggerSync();
    }

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshPendingCount]);

  return { isOnline, pendingCount, isSyncing, triggerSync, refreshPendingCount };
}