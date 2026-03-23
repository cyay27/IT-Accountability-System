import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../../shared/firebase/firebase";
import { DisposalRecord } from "../types/disposal";

const COLLECTION_NAME = "disposal_records";
const LOCAL_STORAGE_KEY = "ias-disposal-records";

const stampNow = () => new Date().toISOString();

const readLocal = (): DisposalRecord[] => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DisposalRecord[];
  } catch {
    return [];
  }
};

const writeLocal = (records: DisposalRecord[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

export const useDisposalRecords = () => {
  const [records, setRecords] = useState<DisposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const useLocalMode = useMemo(() => !isFirebaseConfigured, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      setRecords(readLocal());
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map((item) => ({
        ...(item.data() as DisposalRecord),
        id: item.id
      }));
      setRecords(loaded);
    } catch {
      setError("Access denied or unable to load disposal records from Firestore.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [useLocalMode]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const createRecord = async (record: DisposalRecord) => {
    const payload: DisposalRecord = {
      ...record,
      createdAt: stampNow(),
      updatedAt: stampNow()
    };

    if (useLocalMode) {
      const localRecord = { ...payload, id: crypto.randomUUID() };
      const next = [localRecord, ...records];
      setRecords(next);
      writeLocal(next);
      return;
    }

    const result = await addDoc(collection(db, COLLECTION_NAME), payload);
    setRecords((prev) => [{ ...payload, id: result.id }, ...prev]);
  };

  const updateRecord = async (id: string, record: DisposalRecord) => {
    const payload: DisposalRecord = {
      ...record,
      updatedAt: stampNow()
    };

    if (useLocalMode) {
      const next = records.map((item) =>
        item.id === id
          ? {
              ...payload,
              id,
              createdAt: item.createdAt ?? stampNow()
            }
          : item
      );
      setRecords(next);
      writeLocal(next);
      return;
    }

    await updateDoc(doc(db, COLLECTION_NAME, id), payload as never);
    setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload, id } : item)));
  };

  const removeRecord = async (id: string) => {
    if (useLocalMode) {
      const next = records.filter((item) => item.id !== id);
      setRecords(next);
      writeLocal(next);
      return;
    }

    await deleteDoc(doc(db, COLLECTION_NAME, id));
    setRecords((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    records,
    loading,
    error,
    useLocalMode,
    createRecord,
    updateRecord,
    removeRecord,
    reload: loadRecords
  };
};
