import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../../shared/firebase/firebase";
import { AccountabilityRecord } from "../types/accountability";

const stampNow = () => new Date().toISOString();

const sortByUpdatedAt = (records: AccountabilityRecord[]) =>
  [...records].sort((left, right) => {
    const leftTime = new Date(left.updatedAt ?? 0).getTime();
    const rightTime = new Date(right.updatedAt ?? 0).getTime();
    return rightTime - leftTime;
  });

export const useAccountabilityCollectionRecords = (
  collectionName: string,
  localStorageKey: string,
  loadErrorMessage: string
) => {
  const [records, setRecords] = useState<AccountabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const useLocalMode = useMemo(() => !isFirebaseConfigured, []);

  const readLocal = useCallback((): AccountabilityRecord[] => {
    const raw = localStorage.getItem(localStorageKey);
    if (!raw) return [];
    try {
      return sortByUpdatedAt(JSON.parse(raw) as AccountabilityRecord[]);
    } catch {
      return [];
    }
  }, [localStorageKey]);

  const writeLocal = useCallback(
    (items: AccountabilityRecord[]) => {
      localStorage.setItem(localStorageKey, JSON.stringify(items));
    },
    [localStorageKey]
  );

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      setRecords(readLocal());
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const loaded = sortByUpdatedAt(
        snapshot.docs.map((item) => ({
          ...(item.data() as AccountabilityRecord),
          id: item.id
        }))
      );
      setRecords(loaded);
    } catch {
      setError(loadErrorMessage);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [collectionName, loadErrorMessage, readLocal, useLocalMode]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const upsertRecord = useCallback(
    async (record: AccountabilityRecord) => {
      const id = record.id ?? crypto.randomUUID();
      const payload: AccountabilityRecord = {
        ...record,
        id,
        createdAt: record.createdAt ?? stampNow(),
        updatedAt: stampNow()
      };

      if (useLocalMode) {
        const existing = readLocal();
        const withoutCurrent = existing.filter((item) => item.id !== id);
        const next = sortByUpdatedAt([{ ...payload, id }, ...withoutCurrent]);
        setRecords(next);
        writeLocal(next);
        return;
      }

      setRecords((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== id);
        return sortByUpdatedAt([{ ...payload, id }, ...withoutCurrent]);
      });

      void setDoc(doc(db, collectionName, id), payload, { merge: true }).catch(() => {
        setError(loadErrorMessage);
        void loadRecords();
      });
    },
    [collectionName, loadErrorMessage, loadRecords, readLocal, useLocalMode, writeLocal]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (useLocalMode) {
        const next = readLocal().filter((item) => item.id !== id);
        setRecords(next);
        writeLocal(next);
        return;
      }

      setRecords((prev) => prev.filter((item) => item.id !== id));

      void deleteDoc(doc(db, collectionName, id)).catch(() => {
        setError(loadErrorMessage);
        void loadRecords();
      });
    },
    [collectionName, loadErrorMessage, loadRecords, readLocal, useLocalMode, writeLocal]
  );

  return {
    records,
    loading,
    error,
    useLocalMode,
    upsertRecord,
    removeRecord,
    reload: loadRecords
  };
};
