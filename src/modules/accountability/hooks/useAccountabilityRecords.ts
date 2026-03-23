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
import { mockRecords } from "../data/mockData";
import { AccountabilityRecord } from "../types/accountability";

const COLLECTION_NAME = "accountability_records";
const LOCAL_STORAGE_KEY = "ias-local-records";

const stampNow = () => new Date().toISOString();

const readLocal = (): AccountabilityRecord[] => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [...mockRecords];
  try {
    return JSON.parse(raw) as AccountabilityRecord[];
  } catch {
    return [...mockRecords];
  }
};

const writeLocal = (records: AccountabilityRecord[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

export const useAccountabilityRecords = () => {
  const [records, setRecords] = useState<AccountabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const useLocalMode = useMemo(() => !isFirebaseConfigured, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      const local = readLocal();
      setRecords(local);
      writeLocal(local);
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map((item) => ({
        ...(item.data() as AccountabilityRecord),
        id: item.id
      }));
      setRecords(loaded);
    } catch {
      setError("Access denied or unable to load records from Firestore.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [useLocalMode]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const createRecord = async (record: AccountabilityRecord) => {
    const payload: AccountabilityRecord = {
      ...record,
      createdAt: stampNow(),
      updatedAt: stampNow()
    };

    if (useLocalMode) {
      const localRecord = { ...payload, id: crypto.randomUUID() };
      const next = [localRecord, ...records];
      setRecords(next);
      writeLocal(next);
      return localRecord;
    }

    const result = await addDoc(collection(db, COLLECTION_NAME), payload);
    const createdRecord = { ...payload, id: result.id };
    setRecords((prev) => [createdRecord, ...prev]);
    return createdRecord;
  };

  const updateRecord = async (id: string, record: AccountabilityRecord) => {
    const payload: AccountabilityRecord = {
      ...record,
      updatedAt: stampNow()
    };

    if (useLocalMode) {
      const next = records.map((item) =>
        item.id === id ? { ...payload, id, createdAt: item.createdAt ?? stampNow() } : item
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
