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
import { LicenseMaintenanceRecord } from "../types/licenseMaintenance";

const COLLECTION_NAME = "license_maintenance_records";
const LOCAL_STORAGE_KEY = "ias-license-maintenance-records";

const stampNow = () => new Date().toISOString();

const readLocal = (): LicenseMaintenanceRecord[] => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LicenseMaintenanceRecord[];
  } catch {
    return [];
  }
};

const writeLocal = (records: LicenseMaintenanceRecord[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

export const useLicenseMaintenanceRecords = () => {
  const [records, setRecords] = useState<LicenseMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const useLocalMode = useMemo(() => !isFirebaseConfigured, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      const local = readLocal();
      setRecords(local);
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map((item) => ({
        ...(item.data() as LicenseMaintenanceRecord),
        id: item.id
      }));
      setRecords(loaded);
    } catch {
      setError("Access denied or unable to load license maintenance records from Firestore.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [useLocalMode]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const createRecord = async (record: LicenseMaintenanceRecord) => {
    const payload: LicenseMaintenanceRecord = {
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

  const updateRecord = async (id: string, record: LicenseMaintenanceRecord) => {
    const payload: LicenseMaintenanceRecord = {
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
