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

  const loadBorrowingRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    if (useLocalMode) {
      setBorrowingReceiptByRecordId(readLocal());
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
  }, [useLocalMode]);

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
