import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../../shared/firebase/firebase";
import { useFirestoreAdminAccess } from "../../../shared/hooks/useFirestoreAdminAccess";
import {
  deleteApiCollectionRecord,
  getApiCollectionRecords,
  isApiConfigured,
  updateApiCollectionRecord
} from "../../../shared/services/apiService";
import { BorrowingReceiptData } from "../types/borrowingReceipt";

const COLLECTION_NAME = "borrowing_receipt_records";
const ACCOUNTABILITY_COLLECTION_NAME = "accountability_records";
const LOCAL_STORAGE_KEY = "ias-borrowing-receipt-records";

type BorrowingReceiptByRecordId = Record<string, BorrowingReceiptData>;

const stampNow = () => new Date().toISOString();

const readLocal = (): BorrowingReceiptByRecordId => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as BorrowingReceiptByRecordId;
  } catch {
    return {};
  }
};

const writeLocal = (records: BorrowingReceiptByRecordId) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

export const useBorrowingReceiptRecords = () => {
  const [borrowingReceiptByRecordId, setBorrowingReceiptByRecordId] =
    useState<BorrowingReceiptByRecordId>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const useLocalMode = useMemo(() => !isFirebaseConfigured, []);
  const canQueryFirestore = useFirestoreAdminAccess();
  const useApiMode = isApiConfigured;

  const loadBorrowingRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      setBorrowingReceiptByRecordId(readLocal());
      setLoading(false);
      return;
    }

    if (useApiMode) {
      if (!canQueryFirestore) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getApiCollectionRecords<BorrowingReceiptData>(COLLECTION_NAME, {
          orderBy: "updatedAt",
          direction: "desc",
          limit: 100
        });
        const next: BorrowingReceiptByRecordId = {};

        snapshot.records.forEach((item) => {
          const { createdAt: _createdAt, updatedAt: _updatedAt, id: recordId, ...receipt } = item as BorrowingReceiptData & {
            id: string;
            createdAt?: string;
            updatedAt?: string;
          };

          next[recordId] = receipt as BorrowingReceiptData;
        });

        setBorrowingReceiptByRecordId(next);

        if (Object.keys(next).length === 0) {
          const accountabilitySnapshot = await getApiCollectionRecords<{ borrowingReceipt?: BorrowingReceiptData }>(
            ACCOUNTABILITY_COLLECTION_NAME,
            { orderBy: "updatedAt", direction: "desc", limit: 100 }
          );
          const fallback: BorrowingReceiptByRecordId = {};

          accountabilitySnapshot.records.forEach((item) => {
            if (item.borrowingReceipt) {
              fallback[item.id] = item.borrowingReceipt;
            }
          });

          if (Object.keys(fallback).length > 0) {
            setBorrowingReceiptByRecordId(fallback);
          }
        }
      } catch {
        setError("Access denied or unable to load borrowing records from API.");
        setBorrowingReceiptByRecordId({});
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!canQueryFirestore) {
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const next: BorrowingReceiptByRecordId = {};

      snapshot.docs.forEach((item) => {
        const payload = item.data() as BorrowingReceiptData & {
          createdAt?: string;
          updatedAt?: string;
        };

        const { createdAt: _createdAt, updatedAt: _updatedAt, ...receipt } = payload;
        next[item.id] = receipt as BorrowingReceiptData;
      });

      setBorrowingReceiptByRecordId(next);

      if (Object.keys(next).length === 0) {
        const accountabilitySnapshot = await getDocs(collection(db, ACCOUNTABILITY_COLLECTION_NAME));
        const fallback: BorrowingReceiptByRecordId = {};

        accountabilitySnapshot.docs.forEach((item) => {
          const payload = item.data() as {
            borrowingReceipt?: BorrowingReceiptData;
          };

          if (payload.borrowingReceipt) {
            fallback[item.id] = payload.borrowingReceipt;
          }
        });

        if (Object.keys(fallback).length > 0) {
          setBorrowingReceiptByRecordId(fallback);
        }
      }
    } catch {
      setError("Access denied or unable to load borrowing records from Firestore.");
      setBorrowingReceiptByRecordId({});
    } finally {
      setLoading(false);
    }
  }, [canQueryFirestore, useApiMode, useLocalMode]);

  useEffect(() => {
    void loadBorrowingRecords();
  }, [loadBorrowingRecords]);

  const saveBorrowingReceipt = async (recordId: string, data: BorrowingReceiptData) => {
    if (useLocalMode) {
      setBorrowingReceiptByRecordId((prev) => {
        const next = {
          ...prev,
          [recordId]: data
        };
        writeLocal(next);
        return next;
      });
      return;
    }

    if (useApiMode) {
      await updateApiCollectionRecord(COLLECTION_NAME, recordId, {
        ...data,
        updatedAt: stampNow()
      }).catch(() => {
        setError("Unable to save borrowing receipt to API. Please retry.");
        return;
      });

      await updateApiCollectionRecord(ACCOUNTABILITY_COLLECTION_NAME, recordId, {
        borrowingReceipt: data,
        borrowingReceiptUpdatedAt: stampNow()
      }).catch(() => {
        setError("Unable to sync borrowing receipt to API. Please retry.");
      });

      setBorrowingReceiptByRecordId((prev) => ({
        ...prev,
        [recordId]: data
      }));

      return;
    }

    await setDoc(
      doc(db, COLLECTION_NAME, recordId),
      {
        ...data,
        updatedAt: stampNow()
      },
      { merge: true }
    );

    await updateDoc(doc(db, ACCOUNTABILITY_COLLECTION_NAME, recordId), {
      borrowingReceipt: data,
      borrowingReceiptUpdatedAt: stampNow()
    });

    setBorrowingReceiptByRecordId((prev) => ({
      ...prev,
      [recordId]: data
    }));
  };

  const removeBorrowingReceipt = async (recordId: string) => {
    if (useLocalMode) {
      setBorrowingReceiptByRecordId((prev) => {
        const next = { ...prev };
        delete next[recordId];
        writeLocal(next);
        return next;
      });
      return;
    }

    if (useApiMode) {
      await deleteApiCollectionRecord(COLLECTION_NAME, recordId).catch(() => {
        setError("Unable to delete borrowing receipt from API. Please retry.");
      });

      await updateApiCollectionRecord(ACCOUNTABILITY_COLLECTION_NAME, recordId, {
        borrowingReceipt: null,
        borrowingReceiptUpdatedAt: null
      }).catch(() => {
        setError("Unable to clear borrowing receipt sync on API. Please retry.");
      });

      setBorrowingReceiptByRecordId((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });

      return;
    }

    await deleteDoc(doc(db, COLLECTION_NAME, recordId));

    await updateDoc(doc(db, ACCOUNTABILITY_COLLECTION_NAME, recordId), {
      borrowingReceipt: deleteField(),
      borrowingReceiptUpdatedAt: deleteField()
    });

    setBorrowingReceiptByRecordId((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  };

  return {
    borrowingReceiptByRecordId,
    loading,
    error,
    useLocalMode,
    saveBorrowingReceipt,
    removeBorrowingReceipt,
    reload: loadBorrowingRecords
  };
};
