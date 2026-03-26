import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../../shared/firebase/firebase";
import { mockRecords } from "../data/mockData";
import { AccountabilityRecord } from "../types/accountability";

const COLLECTION_NAME = "accountability_records";
const LOCAL_STORAGE_KEY = "ias-local-records";

const stampNow = () => new Date().toISOString();

const sanitizeForFirestore = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const buildHolderName = (record: AccountabilityRecord) =>
  [record.firstName, record.middleName, record.lastName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

const hasAssigneeSignature = (record: AccountabilityRecord) =>
  Boolean(record.assigneeSignature?.signatureDataUrl);

const getRouteTarget = (record: AccountabilityRecord) =>
  record.email?.trim() || buildHolderName(record) || "Employee/User";

const getWorkflowStatus = (record: AccountabilityRecord) =>
  hasAssigneeSignature(record) ? "Signed by Employee" : "Pending Employee Signature";

const isClosedOrArchivedWorkflowStatus = (workflowStatus?: string) => {
  const normalized = String(workflowStatus ?? "").trim().toLowerCase();
  return normalized.includes("closed") || normalized.includes("archived");
};

const resolveWorkflowStatus = (record: AccountabilityRecord) =>
  isClosedOrArchivedWorkflowStatus(record.workflowStatus)
    ? String(record.workflowStatus)
    : getWorkflowStatus(record);

const buildArchivedAssignment = (record: AccountabilityRecord, archivedAt: string) => ({
  id: crypto.randomUUID(),
  archivedAt,
  reason: "Reassigned to another employee",
  no: record.no || "",
  empId: record.empId || "",
  fullName: buildHolderName(record) || "",
  department: record.department || "",
  project: record.project || "",
  employmentStatus: record.employmentStatus || "",
  deviceType: record.deviceType || "",
  deviceDescription: record.deviceDescription || "",
  hostname: record.hostname || "",
  serialNumber: record.serialNumber || "",
  deviceAssetNumber: record.deviceAssetNumber || ""
});

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

const scheduleWriteLocal = (records: AccountabilityRecord[]) => {
  const write = () => writeLocal(records);

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(
      write
    );
    return;
  }

  setTimeout(write, 0);
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
    const now = stampNow();
    const routeTarget = getRouteTarget(record);
    const withSystemFields: AccountabilityRecord = {
      ...record,
      workflowStatus: resolveWorkflowStatus(record),
      signatureRouteTo: routeTarget,
      archivedAssignments: [...(record.archivedAssignments ?? [])],
      returnHistory: [...(record.returnHistory ?? [])],
      previousHolders: [...(record.previousHolders ?? [])],
      history: [
        ...(record.history ?? []),
        {
          id: crypto.randomUUID(),
          action: "created",
          summary: "Accountability record created by IT.",
          timestamp: now
        }
      ]
    };

    if (!hasAssigneeSignature(withSystemFields)) {
      withSystemFields.history = [
        ...(withSystemFields.history ?? []),
        {
          id: crypto.randomUUID(),
          action: "signature-routed",
          summary: `Signature request routed to ${routeTarget}.`,
          timestamp: now
        }
      ];
    }

    if (withSystemFields.returnedDate?.trim()) {
      withSystemFields.returnHistory = [
        ...(withSystemFields.returnHistory ?? []),
        {
          id: crypto.randomUUID(),
          returnedDate: withSystemFields.returnedDate,
          recordedAt: now,
          assetCondition: withSystemFields.deviceCondition || "Unspecified",
          notes: "Return recorded from accountability form."
        }
      ];
      withSystemFields.history = [
        ...(withSystemFields.history ?? []),
        {
          id: crypto.randomUUID(),
          action: "returned",
          summary: `Asset return logged for ${withSystemFields.returnedDate}.`,
          timestamp: now
        }
      ];
    }

    const payload: AccountabilityRecord = {
      ...withSystemFields,
      createdAt: now,
      updatedAt: now
    };

    if (useLocalMode) {
      const localRecord = { ...payload, id: crypto.randomUUID() };
      const next = [localRecord, ...records];
      setRecords(next);
      scheduleWriteLocal(next);
      return localRecord;
    }

    const createdId = crypto.randomUUID();
    const createdRecord = { ...payload, id: createdId };
    setRecords((prev) => [createdRecord, ...prev]);
    const firestorePayload = sanitizeForFirestore(payload);

    void setDoc(doc(collection(db, COLLECTION_NAME), createdId), firestorePayload).catch(() => {
      setError("Unable to save record to Firestore. Please retry.");
      setRecords((prev) => prev.filter((item) => item.id !== createdId));
    });

    return createdRecord;
  };

  const updateRecord = async (id: string, record: AccountabilityRecord) => {
    const now = stampNow();
    const existing = records.find((item) => item.id === id) ?? null;
    const routeTarget = getRouteTarget(record);
    const nextHistory = [
      ...(record.history ?? existing?.history ?? []),
      {
        id: crypto.randomUUID(),
        action: "updated" as const,
        summary: "Accountability record updated by IT.",
        timestamp: now
      }
    ];

    let nextPreviousHolders = [...(record.previousHolders ?? existing?.previousHolders ?? [])];
    let nextArchivedAssignments = [...(record.archivedAssignments ?? existing?.archivedAssignments ?? [])];
    if (existing) {
      const previousHolderName = buildHolderName(existing);
      const nextHolderName = buildHolderName(record);
      const holderChanged =
        existing.empId.trim().toLowerCase() !== record.empId.trim().toLowerCase() ||
        previousHolderName.trim().toLowerCase() !== nextHolderName.trim().toLowerCase();

      if (holderChanged && (existing.empId.trim() || previousHolderName.trim())) {
        const alreadyTracked = nextPreviousHolders.some(
          (entry) =>
            entry.empId.trim().toLowerCase() === existing.empId.trim().toLowerCase() &&
            entry.holderName.trim().toLowerCase() === previousHolderName.trim().toLowerCase()
        );

        if (!alreadyTracked) {
          nextPreviousHolders = [
            ...nextPreviousHolders,
            {
              id: crypto.randomUUID(),
              holderName: previousHolderName || "Unknown Holder",
              empId: existing.empId || "-",
              department: existing.department || "-",
              project: existing.project || "-",
              releasedAt: now
            }
          ];
        }

        nextArchivedAssignments = [
          buildArchivedAssignment(existing, now),
          ...nextArchivedAssignments
        ];

        nextHistory.push({
          id: crypto.randomUUID(),
          action: "updated",
          summary: `Device reassigned from ${previousHolderName || existing.empId || "previous holder"} to ${nextHolderName || record.empId || "new holder"}. Previous record snapshot archived.`,
          timestamp: now
        });
      }
    }

    let nextReturnHistory = [...(record.returnHistory ?? existing?.returnHistory ?? [])];
    const hasReturnRecord = nextReturnHistory.some((entry) => entry.returnedDate === record.returnedDate);
    if (record.returnedDate?.trim() && !hasReturnRecord) {
      nextReturnHistory = [
        ...nextReturnHistory,
        {
          id: crypto.randomUUID(),
          returnedDate: record.returnedDate,
          recordedAt: now,
          assetCondition: record.deviceCondition || "Unspecified",
          notes: "Return recorded from accountability form."
        }
      ];

      nextHistory.push({
        id: crypto.randomUUID(),
        action: "returned",
        summary: `Asset return logged for ${record.returnedDate}.`,
        timestamp: now
      });
    }

    if (!hasAssigneeSignature(record)) {
      nextHistory.push({
        id: crypto.randomUUID(),
        action: "signature-routed",
        summary: `Signature request routed to ${routeTarget}.`,
        timestamp: now
      });
    }

    const payload: AccountabilityRecord = {
      ...record,
      workflowStatus: resolveWorkflowStatus(record),
      signatureRouteTo: routeTarget,
      history: nextHistory,
      previousHolders: nextPreviousHolders,
      returnHistory: nextReturnHistory,
      archivedAssignments: nextArchivedAssignments,
      updatedAt: now
    };

    if (useLocalMode) {
      const next = records.map((item) =>
        item.id === id ? { ...payload, id, createdAt: item.createdAt ?? stampNow() } : item
      );
      setRecords(next);
      scheduleWriteLocal(next);
      return;
    }

    const previousRecord = records.find((item) => item.id === id) ?? null;
    setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload, id } : item)));
    const firestorePayload = sanitizeForFirestore(payload);

    void setDoc(doc(db, COLLECTION_NAME, id), firestorePayload as never, { merge: true }).catch(() => {
      setError("Unable to update record in Firestore. Local changes were reverted.");
      if (!previousRecord) {
        return;
      }

      setRecords((prev) => prev.map((item) => (item.id === id ? previousRecord : item)));
    });
  };

  const removeRecord = async (id: string) => {
    if (useLocalMode) {
      const next = records.filter((item) => item.id !== id);
      setRecords(next);
      scheduleWriteLocal(next);
      return;
    }

    const previousRecord = records.find((item) => item.id === id) ?? null;
    setRecords((prev) => prev.filter((item) => item.id !== id));

    void deleteDoc(doc(db, COLLECTION_NAME, id)).catch(() => {
      setError("Unable to delete record from Firestore. Record was restored.");
      if (!previousRecord) {
        return;
      }

      setRecords((prev) => [previousRecord, ...prev]);
    });
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
