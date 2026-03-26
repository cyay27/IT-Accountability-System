import { FormEvent, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import { useReactToPrint } from "react-to-print";
import { EmployeeForm } from "./modules/accountability/components/EmployeeForm";
import { BorrowingReceiptForm } from "./modules/accountability/components/BorrowingReceiptForm";
import { BorrowingReceiptPrintable } from "./modules/accountability/components/BorrowingReceiptPrintable";
import { DeliveryReceiptForm } from "./modules/accountability/components/DeliveryReceiptForm";
import { DeliveryReceiptPrintable } from "./modules/accountability/components/DeliveryReceiptPrintable";
import { PrintableForm } from "./modules/accountability/components/PrintableForm";
import { RecordsList } from "./modules/accountability/components/RecordsList";
import { DeliveryReceiptRecord } from "./modules/accountability/types/deliveryReceipt";
import { useAccountabilityRecords } from "./modules/accountability/hooks/useAccountabilityRecords";
import { useBorrowingReceiptRecords } from "./modules/accountability/hooks/useBorrowingReceiptRecords";
import { AccountabilityRecord } from "./modules/accountability/types/accountability";
import {
  BorrowingReceiptData,
  emptyBorrowingReceiptData
} from "./modules/accountability/types/borrowingReceipt";
import { ITAssetChart } from "./modules/asset-inventory/components/ITAssetChart";
import { ITAssetInventory } from "./modules/asset-inventory/components/ITAssetInventory";
import { ITAssetInventoryPrintable } from "./modules/asset-inventory/components/ITAssetInventoryPrintable";
import { useAssetInventoryRecords } from "./modules/asset-inventory/hooks/useAssetInventoryRecords";
import { DisposalForm } from "./modules/disposal/components/DisposalForm";
import { DisposalPrintable } from "./modules/disposal/components/DisposalPrintable";
import { DisposalRecords } from "./modules/disposal/components/DisposalRecords";
import { useDisposalRecords } from "./modules/disposal/hooks/useDisposalRecords";
import { DisposalRecord } from "./modules/disposal/types/disposal";
import { IPadInventory } from "./modules/ipad-inventory/components/IPadInventory";
import { IPadInventoryPrintable } from "./modules/ipad-inventory/components/IPadInventoryPrintable";
import { useIpadInventoryRecords } from "./modules/ipad-inventory/hooks/useIpadInventoryRecords";
import { LandingPage } from "./modules/navigation/components/LandingPage";
import { SelectionPage } from "./modules/navigation/components/SelectionPage";
import { ReturnedAssetsChart } from "./modules/returned-assets/components/ReturnedAssetsChart";
import { ReturnedAssetsPrintable } from "./modules/returned-assets/components/ReturnedAssetsPrintable";
import { ReturnedAssetsRecords } from "./modules/returned-assets/components/ReturnedAssetsRecords";
import { ReturnedAssetsReassignForm } from "./modules/returned-assets/components/ReturnedAssetsReassignForm";
import { useReturnedAssetsRecords } from "./modules/returned-assets/hooks/useReturnedAssetsRecords";
import { SoftwareInventoryChart } from "./modules/software-inventory/components/SoftwareInventoryChart";
import { SoftwareInventoryForm } from "./modules/software-inventory/components/SoftwareInventoryForm";
import { SoftwareInventoryPrintable } from "./modules/software-inventory/components/SoftwareInventoryPrintable";
import { SoftwareInventoryRecords } from "./modules/software-inventory/components/SoftwareInventoryRecords";
import { useSoftwareInventoryRecords } from "./modules/software-inventory/hooks/useSoftwareInventoryRecords";
import { SoftwareInventoryRecord } from "./modules/software-inventory/types/softwareInventory";
import { HeaderBar } from "./shared/components/HeaderBar";
import {
  adminUid,
  auth,
  isAdminUidConfigured,
  isFirebaseConfigured
} from "./shared/firebase/firebase";

const trimRecord = (record: AccountabilityRecord): AccountabilityRecord => {
  const next = { ...record };
  Object.keys(next).forEach((key) => {
    const typedKey = key as keyof AccountabilityRecord;
    if (typeof next[typedKey] === "string") {
      next[typedKey] = String(next[typedKey]).trim() as never;
    }
  });
  return next;
};

const RESIGNED_KEYWORDS = ["resign", "resigned", "terminated", "separated", "inactive"];
const TRANSFERRED_KEYWORDS = ["transfer", "transferred"];
const TRANSFER_DECISION_GOES_WITH_USER = "device goes with user";
const TRANSFER_DECISION_STAYS_REASSIGNED = "device stays and is reassigned";

const buildHolderName = (record: AccountabilityRecord) =>
  [record.firstName, record.middleName, record.lastName]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

const isTransferDecisionReassign = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === TRANSFER_DECISION_STAYS_REASSIGNED || normalized.includes("reassign");
};

const isTransferDecisionKeepDevice = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === TRANSFER_DECISION_GOES_WITH_USER;
};

const isClosedReassignedWorkflow = (value?: string) =>
  String(value ?? "").trim().toLowerCase() === "closed - reassigned";

const appendStatusDecisionHistory = (record: AccountabilityRecord): AccountabilityRecord => {
  const now = new Date().toISOString();
  const nextHistory = [...(record.history ?? [])];

  if (isResignedEmploymentStatus(record.employmentStatus)) {
    nextHistory.push({
      id: crypto.randomUUID(),
      action: "returned",
      summary: "Asset returned due to employee resignation.",
      timestamp: now
    });
  }

  if (isTransferredEmploymentStatus(record.employmentStatus)) {
    if (isTransferDecisionKeepDevice(record.transferDecision)) {
      nextHistory.push({
        id: crypto.randomUUID(),
        action: "updated",
        summary: "Device retained by user due to project transfer.",
        timestamp: now
      });
    }

    if (isTransferDecisionReassign(record.transferDecision)) {
      nextHistory.push({
        id: crypto.randomUUID(),
        action: "returned",
        summary: "Asset marked returned for reassignment due to project transfer.",
        timestamp: now
      });
    }
  }

  if (nextHistory.length === (record.history ?? []).length) {
    return record;
  }

  return {
    ...record,
    history: nextHistory
  };
};

const isResignedEmploymentStatus = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return RESIGNED_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const isTransferredEmploymentStatus = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return TRANSFERRED_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const applyEmployeeStatusRules = (record: AccountabilityRecord): AccountabilityRecord => {
  const normalizedDeviceStatus = String(record.deviceStatus ?? "").trim().toLowerCase();
  const normalizedReturnedDate = String(record.returnedDate ?? "").trim();
  const nextDeviceStatus = normalizedDeviceStatus === "defective" ? "Defective" : "Active";
  const today = new Date().toISOString().split("T")[0];

  if (isResignedEmploymentStatus(record.employmentStatus)) {
    return {
      ...record,
      deviceStatus: nextDeviceStatus,
      returnedDate: normalizedReturnedDate || today
    };
  }

  if (isTransferredEmploymentStatus(record.employmentStatus)) {
    if (isTransferDecisionReassign(record.transferDecision)) {
      return {
        ...record,
        deviceStatus: nextDeviceStatus,
        returnedDate: normalizedReturnedDate || today
      };
    }

    if (isTransferDecisionKeepDevice(record.transferDecision)) {
      return {
        ...record,
        deviceStatus: "Deployed",
        returnedDate: ""
      };
    }
  }

  return record;
};

const DELIVERY_RECEIPT_STORAGE_KEY = "ias:delivery-receipt-records";

const readDeliveryReceiptRecords = (): DeliveryReceiptRecord[] => {
  try {
    const raw = localStorage.getItem(DELIVERY_RECEIPT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as DeliveryReceiptRecord[];
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
};

type ActiveView =
  | "form"
  | "inventory"
  | "chart"
  | "records"
  | "printable"
  | "borrowing-form"
  | "borrowing-printable"
  | "delivery-receipt-form"
  | "delivery-receipt-printable";
type ModuleKey =
  | "new-item"
  | "it-accountability-form"
  | "it-asset-inventory"
  | "it-software-inventory"
  | "ipad-inventory"
  | "disposal"
  | "returned-assets";

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleKey | null>(null);
  const {
    records,
    loading: accountabilityLoading,
    error: accountabilityError,
    useLocalMode,
    createRecord,
    updateRecord,
    removeRecord,
    reload: reloadAccountabilityRecords
  } =
    useAccountabilityRecords();
  const [editingRecord, setEditingRecord] = useState<AccountabilityRecord | null>(null);
  const [prefillRecord, setPrefillRecord] = useState<AccountabilityRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AccountabilityRecord | null>(null);
  const {
    records: assetInventoryRecords,
    error: assetInventoryError,
    upsertRecord: upsertAssetInventoryRecord,
    removeRecord: removeAssetInventoryRecord,
  } = useAssetInventoryRecords();
  const {
    records: ipadInventoryRecords,
    error: ipadInventoryError,
    upsertRecord: upsertIpadInventoryRecord,
    removeRecord: removeIpadInventoryRecord
  } = useIpadInventoryRecords();
  const {
    records: returnedAssetsRecords,
    error: returnedAssetsError,
    upsertRecord: upsertReturnedAssetsRecord,
    removeRecord: removeReturnedAssetsRecord
  } = useReturnedAssetsRecords();
  const {
    borrowingReceiptByRecordId,
    error: borrowingError,
    saveBorrowingReceipt,
    removeBorrowingReceipt
  } = useBorrowingReceiptRecords();
  const [borrowingFormInitialData, setBorrowingFormInitialData] = useState<BorrowingReceiptData | null>(null);
  const [recordsInitialTable, setRecordsInitialTable] = useState<"accountability" | "borrowing" | "delivery" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("records");
  const [pendingPrint, setPendingPrint] = useState(false);
  const [pendingBorrowingPrint, setPendingBorrowingPrint] = useState(false);
  const [printActionType, setPrintActionType] = useState<"accountability" | "borrowing" | null>(null);
  const [pendingAssetPrint, setPendingAssetPrint] = useState(false);
  const {
    records: softwareRecords,
    loading: softwareLoading,
    error: softwareError,
    createRecord: createSoftwareRecord,
    updateRecord: updateSoftwareRecord,
    removeRecord: removeSoftwareRecord
  } = useSoftwareInventoryRecords();
  const [editingSoftwareRecord, setEditingSoftwareRecord] =
    useState<SoftwareInventoryRecord | null>(null);
  const [selectedSoftwareRecord, setSelectedSoftwareRecord] =
    useState<SoftwareInventoryRecord | null>(null);
  const [pendingSoftwarePrint, setPendingSoftwarePrint] = useState(false);
  const [pendingIpadPrint, setPendingIpadPrint] = useState(false);
  const [pendingReturnedAssetsPrint, setPendingReturnedAssetsPrint] = useState(false);
  const [pendingDisposalPrint, setPendingDisposalPrint] = useState(false);
  const {
    records: disposalRecords,
    error: disposalError,
    createRecord: createDisposalRecord,
    updateRecord: updateDisposalRecord,
    removeRecord: removeDisposalRecord
  } = useDisposalRecords();
  const [editingDisposalRecord, setEditingDisposalRecord] = useState<DisposalRecord | null>(null);
  const [selectedDisposalRecord, setSelectedDisposalRecord] = useState<DisposalRecord | null>(null);
  const [editingDeliveryReceiptRecord, setEditingDeliveryReceiptRecord] = useState<DeliveryReceiptRecord | null>(null);
  const [selectedDeliveryReceiptRecord, setSelectedDeliveryReceiptRecord] = useState<DeliveryReceiptRecord | null>(null);
  const [editingReturnedAssetRecord, setEditingReturnedAssetRecord] = useState<AccountabilityRecord | null>(null);
  const [pendingDeliveryReceiptPrint, setPendingDeliveryReceiptPrint] = useState(false);
  const [deliveryReceiptRecords, setDeliveryReceiptRecords] = useState<DeliveryReceiptRecord[]>(
    () => readDeliveryReceiptRecords()
  );

  const printRef = useRef<HTMLDivElement>(null);
  const borrowingPrintRef = useRef<HTMLDivElement>(null);
  const deliveryReceiptPrintRef = useRef<HTMLDivElement>(null);
  const assetPrintRef = useRef<HTMLDivElement>(null);
  const softwarePrintRef = useRef<HTMLDivElement>(null);
  const ipadPrintRef = useRef<HTMLDivElement>(null);
  const returnedAssetsPrintRef = useRef<HTMLDivElement>(null);
  const disposalPrintRef = useRef<HTMLDivElement>(null);
  const lastReturnedAssetsSyncKeyRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!isFirebaseConfigured || !isAdminUidConfigured) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.uid !== adminUid) {
        setAuthError("Not authorized. Only the configured admin can access this system.");
        setAuthUser(null);
        void signOut(auth);
        setAuthReady(true);
        return;
      }

      setAuthUser(user);
      setAuthError("");
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    try {
      setIsLoggingIn(true);
      const credential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      if (credential.user.uid !== adminUid) {
        await signOut(auth);
        setAuthError("Not authorized. This account is not the configured admin.");
        return;
      }
      setLoginPassword("");
    } catch {
      setAuthError("Login failed. Check your admin email/password and Firebase config.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: selectedRecord
      ? `IT-Accountability-${selectedRecord.empId}-${selectedRecord.lastName}`
      : "IT-Accountability"
  });

  const handleBorrowingPrint = useReactToPrint({
    content: () => borrowingPrintRef.current,
    documentTitle: selectedRecord
      ? `IT-Borrowing-Receipt-${selectedRecord.empId}-${selectedRecord.lastName}`
      : "IT-Borrowing-Receipt"
  });

  const handleDeliveryReceiptPrint = useReactToPrint({
    content: () => deliveryReceiptPrintRef.current,
    documentTitle: selectedDeliveryReceiptRecord
      ? `IT-Delivery-Receipt-${selectedDeliveryReceiptRecord.invoiceNumber || selectedDeliveryReceiptRecord.id}`
      : "IT-Delivery-Receipt"
  });

  const handleSoftwarePrint = useReactToPrint({
    content: () => softwarePrintRef.current,
    documentTitle: selectedSoftwareRecord
      ? `IT-Software-Inventory-${selectedSoftwareRecord.softwareName}`
      : "IT-Software-Inventory"
  });

  const handleAssetPrint = useReactToPrint({
    content: () => assetPrintRef.current,
    documentTitle: "IT-Asset-Inventory"
  });

  const handleIpadPrint = useReactToPrint({
    content: () => ipadPrintRef.current,
    documentTitle: "IPAD-Inventory"
  });

  const handleReturnedAssetsPrint = useReactToPrint({
    content: () => returnedAssetsPrintRef.current,
    documentTitle: "Returned-Assets-Availability"
  });

  const handleDisposalPrint = useReactToPrint({
    content: () => disposalPrintRef.current,
    documentTitle: selectedDisposalRecord
      ? `IT-Disposal-${selectedDisposalRecord.disposalNo || selectedDisposalRecord.id}`
      : "IT-Disposal"
  });

  const syncReturnedAssetsForAccountability = async (record: AccountabilityRecord) => {
    const id = record.id;
    if (!id) return;

    const normalizedDeviceStatus = (record.deviceStatus ?? "").trim().toLowerCase();
    const shouldStayInReturnedAssets =
      Boolean(record.returnedDate?.trim()) &&
      normalizedDeviceStatus !== "deployed" &&
      !isClosedReassignedWorkflow(record.workflowStatus);

    if (shouldStayInReturnedAssets) {
      await upsertReturnedAssetsRecord({ ...record, id });
      return;
    }

    await removeReturnedAssetsRecord(id);
  };

  const syncSectionRecordsForAccountability = async (
    record: AccountabilityRecord,
    options?: { skipReturnedAssetsSync?: boolean }
  ) => {
    const id = record.id;
    if (!id) return;

    const inventorySyncTask = upsertAssetInventoryRecord({ ...record, id });

    const ipadSyncTask =
      record.deviceType.trim().toLowerCase() === "ipad"
        ? upsertIpadInventoryRecord({ ...record, id })
        : removeIpadInventoryRecord(id);

    const returnedAssetsSyncTask = options?.skipReturnedAssetsSync
      ? Promise.resolve()
      : syncReturnedAssetsForAccountability(record);

    const linkedDisposalRecord = disposalRecords.find(
      (item) => item.sourceAccountabilityRecordId === id
    );
    const isForDisposal = (record.deviceStatus ?? "").trim().toLowerCase() === "for disposal";
    const employeeName = [record.firstName, record.middleName, record.lastName]
      .filter(Boolean)
      .join(" ");
    const today = new Date().toISOString().split("T")[0];

    const disposalSyncTask = (async () => {
      if (isForDisposal) {
        const syncedDisposalRecord: DisposalRecord = {
          id: linkedDisposalRecord?.id ?? "",
          sourceAccountabilityRecordId: id,
          disposalNo: linkedDisposalRecord?.disposalNo || record.no || `AUTO-${record.empId || id.slice(0, 8)}`,
          empId: record.empId || "",
          employeeName: employeeName || linkedDisposalRecord?.employeeName || "",
          department: record.department || "",
          project: record.project || "",
          deviceType: record.deviceType || "",
          serialNumber: record.serialNumber || "",
          assetNumber: record.deviceAssetNumber || "",
          conditionAtDisposal: linkedDisposalRecord?.conditionAtDisposal || "",
          disposalReason: linkedDisposalRecord?.disposalReason || "",
          recommendedAction: linkedDisposalRecord?.recommendedAction || "",
          dataWipeRequired: linkedDisposalRecord?.dataWipeRequired || "No",
          status: linkedDisposalRecord?.status || "Draft",
          requestedBy: linkedDisposalRecord?.requestedBy || employeeName || "",
          approvedBy: linkedDisposalRecord?.approvedBy || "",
          requestedDate: linkedDisposalRecord?.requestedDate || today,
          disposalDate: linkedDisposalRecord?.disposalDate || "",
          notes: linkedDisposalRecord?.notes || "Synced from IT Accountability Form",
          createdAt: linkedDisposalRecord?.createdAt || "",
          updatedAt: linkedDisposalRecord?.updatedAt || ""
        };

        if (linkedDisposalRecord?.id) {
          await updateDisposalRecord(linkedDisposalRecord.id, syncedDisposalRecord);
          return;
        }

        await createDisposalRecord(syncedDisposalRecord);
        return;
      }

      if (linkedDisposalRecord?.id) {
        await removeDisposalRecord(linkedDisposalRecord.id);
      }
    })();

    const linkedSoftwareRecords = softwareRecords.filter(
      (item) => item.sourceAccountabilityRecordId === id
    );
    const softwareNames = record.softwareName
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const softwareLicenses = record.softwareLicense
      .split(/[\n,]/)
      .map((item) => item.trim());
    const hasSoftwareName = softwareNames.length > 0;

    const softwareSyncTask = (async () => {
      if (hasSoftwareName) {
        const unmatchedExisting = [...linkedSoftwareRecords];
        const upsertTasks: Promise<void>[] = [];

        for (const [index, softwareName] of softwareNames.entries()) {
          const matchedIndex = unmatchedExisting.findIndex(
            (item) => item.softwareName.trim().toLowerCase() === softwareName.toLowerCase()
          );
          const matchedRecord = matchedIndex >= 0 ? unmatchedExisting.splice(matchedIndex, 1)[0] : null;
          const mappedLicenseReference =
            softwareLicenses[index] || matchedRecord?.licenseReference || "";

          const syncedSoftwareRecord: SoftwareInventoryRecord = {
            sourceAccountabilityRecordId: id,
            formNo: record.no || "",
            softwareName,
            softwareVersion: matchedRecord?.softwareVersion || "",
            vendor: matchedRecord?.vendor || "",
            licenseType: matchedRecord?.licenseType || "N/A",
            licenseReference: mappedLicenseReference,
            seatsPurchased: matchedRecord?.seatsPurchased || "",
            seatsUsed: matchedRecord?.seatsUsed || "",
            assignedTo: [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" "),
            employeeId: record.empId || "",
            department: record.department || "",
            project: record.project || "",
            hostname: record.hostname || "",
            requestTicket: matchedRecord?.requestTicket || "",
            preparedBy: matchedRecord?.preparedBy || "",
            approvedBy: matchedRecord?.approvedBy || "",
            preparedSignature: matchedRecord?.preparedSignature ?? { name: "", signatureDataUrl: null, date: "" },
            approvedSignature: matchedRecord?.approvedSignature ?? { name: "", signatureDataUrl: null, date: "" },
            expiryDate: matchedRecord?.expiryDate || "",
            status: matchedRecord?.status || "Active",
            remarks: matchedRecord?.remarks || "Synced from IT Accountability Form"
          };

          if (matchedRecord?.id) {
            upsertTasks.push(
              updateSoftwareRecord(matchedRecord.id, {
                ...matchedRecord,
                ...syncedSoftwareRecord,
                id: matchedRecord.id,
                createdAt: matchedRecord.createdAt
              })
            );
          } else {
            upsertTasks.push(createSoftwareRecord(syncedSoftwareRecord));
          }
        }

        await Promise.all(upsertTasks);

        if (unmatchedExisting.length > 0) {
          await Promise.all(
            unmatchedExisting
              .filter((item) => Boolean(item.id))
              .map((item) => removeSoftwareRecord(item.id as string))
          );
        }
        return;
      }

      if (linkedSoftwareRecords.length > 0) {
        await Promise.all(
          linkedSoftwareRecords
            .filter((item) => Boolean(item.id))
            .map((item) => removeSoftwareRecord(item.id as string))
        );
      }
    })();

    await Promise.all([
      inventorySyncTask,
      ipadSyncTask,
      returnedAssetsSyncTask,
      disposalSyncTask,
      softwareSyncTask
    ]);
  };

  useEffect(() => {
    const syncReturnedAssetsToInventory = async () => {
      if (showLanding || !selectedModule) {
        return;
      }

      for (const record of returnedAssetsRecords) {
        if (!record.id) {
          continue;
        }

        const existingInventoryRecord = assetInventoryRecords.find((item) => item.id === record.id);
        const isMissingInInventory = !existingInventoryRecord;
        const returnedUpdatedAt = new Date(record.updatedAt ?? 0).getTime();
        const inventoryUpdatedAt = new Date(existingInventoryRecord?.updatedAt ?? 0).getTime();
        const hasNewerReturnedRecord = returnedUpdatedAt > inventoryUpdatedAt;

        if (isMissingInInventory || hasNewerReturnedRecord) {
          await upsertAssetInventoryRecord({ ...record, id: record.id });
        }
      }
    };

    void syncReturnedAssetsToInventory();
  }, [showLanding, selectedModule, returnedAssetsRecords, assetInventoryRecords, upsertAssetInventoryRecord]);

  useEffect(() => {
    const syncChangedAccountabilityRecordsToReturnedAssets = async () => {
      if (showLanding || !selectedModule) {
        return;
      }

      const nextSyncKeyMap: Record<string, string> = {};

      for (const record of records) {
        const id = record.id;
        if (!id) {
          continue;
        }

        const syncKey = [
          record.returnedDate,
          record.deviceStatus,
          record.workflowStatus,
          record.transferDecision,
          record.employmentStatus,
          record.updatedAt
        ].join("|");

        nextSyncKeyMap[id] = syncKey;

        if (lastReturnedAssetsSyncKeyRef.current[id] === syncKey) {
          continue;
        }

        await syncReturnedAssetsForAccountability(record);
      }

      lastReturnedAssetsSyncKeyRef.current = nextSyncKeyMap;
    };

    void syncChangedAccountabilityRecordsToReturnedAssets();
  }, [showLanding, selectedModule, records]);

  const snapshotPreviousInventoryRecord = async (recordId: string, reason: string) => {
    const previous = records.find((item) => item.id === recordId);
    if (!previous) {
      return;
    }

    const snapshotAt = new Date();
    const snapshotKey = snapshotAt.toISOString().replace(/[-:.TZ]/g, "");
    const snapshotId = `${recordId}-hist-${snapshotKey}`;

    await upsertAssetInventoryRecord({
      ...previous,
      id: snapshotId,
      inventoryEntryType: "history",
      inventorySourceRecordId: recordId,
      inventorySnapshotReason: reason,
      createdAt: previous.createdAt ?? snapshotAt.toISOString(),
      updatedAt: snapshotAt.toISOString()
    });
  };

  const handleSubmit = async (record: AccountabilityRecord) => {
    const cleaned = appendStatusDecisionHistory(
      applyEmployeeStatusRules(trimRecord(record))
    );
    if (editingRecord?.id) {
      void snapshotPreviousInventoryRecord(
        editingRecord.id,
        "Edited from IT Accountability form"
      );
      const updated = { ...cleaned, id: editingRecord.id };
      await updateRecord(editingRecord.id, cleaned);
      await syncReturnedAssetsForAccountability(updated);
      void syncSectionRecordsForAccountability(updated, { skipReturnedAssetsSync: true });
      setEditingRecord(null);
      setSelectedRecord((prev) => {
        if (!prev || prev.id !== editingRecord.id) return prev;
        return { ...cleaned, id: prev.id };
      });
      setSelectedModule("it-accountability-form");
      setActiveView("records");
      return;
    }
    const created = await createRecord(cleaned);
    await syncReturnedAssetsForAccountability(created);
    void syncSectionRecordsForAccountability(created, { skipReturnedAssetsSync: true });
    setPrefillRecord(null);
    setSelectedModule("it-accountability-form");
    setActiveView("records");
  };

  const handleReturnedAssetSaveEdit = async (record: AccountabilityRecord) => {
    if (!record.id) {
      return;
    }
    const sourceAccountabilityRecord = records.find((item) => item.id === record.id) ?? null;
    const sourceRecord = sourceAccountabilityRecord ?? record;

    void snapshotPreviousInventoryRecord(
      record.id,
      "Edited from Returned Assets reassign form"
    );

    const cleaned = trimRecord(record);
    const now = new Date().toISOString();
    const previousHolderName = buildHolderName(sourceRecord) || sourceRecord.empId || "previous holder";
    const newHolderName = buildHolderName(cleaned) || cleaned.empId || "new holder";
    const transferContext = isTransferredEmploymentStatus(sourceRecord.employmentStatus)
      ? " due to project transfer"
      : "";

    const closeSummary = `Accountability record closed: device reassigned from ${previousHolderName} to ${newHolderName}${transferContext}.`;
    const createSummary = `Device reassigned from ${previousHolderName} to ${newHolderName}${transferContext}.`;

    const closedRecord: AccountabilityRecord = {
      ...sourceRecord,
      workflowStatus: "Closed - Reassigned",
      history: [
        ...(sourceRecord.history ?? []),
        {
          id: crypto.randomUUID(),
          action: "updated",
          summary: closeSummary,
          timestamp: now
        }
      ]
    };

    const previousHolders = [...(sourceRecord.previousHolders ?? [])];
    const sourceEmpIdKey = String(sourceRecord.empId ?? "").trim().toLowerCase();
    const previousHolderNameKey = String(previousHolderName ?? "").trim().toLowerCase();
    const hasPreviousHolder = previousHolders.some(
      (entry) =>
        String(entry.empId ?? "").trim().toLowerCase() === sourceEmpIdKey &&
        String(entry.holderName ?? "").trim().toLowerCase() === previousHolderNameKey
    );

    if (!hasPreviousHolder) {
      previousHolders.push({
        id: crypto.randomUUID(),
        holderName: previousHolderName,
        empId: sourceRecord.empId || "-",
        department: sourceRecord.department || "-",
        project: sourceRecord.project || "-",
        releasedAt: now
      });
    }

    const reassignmentRecordInput: AccountabilityRecord = {
      ...cleaned,
      id: undefined,
      no: "",
      employmentStatus: "Deployed",
      transferDecision: "",
      deviceStatus: "Deployed",
      returnedDate: "",
      workflowStatus: "Pending Employee Signature",
      signatureRouteTo: "",
      attachments: [],
      assigneeSignature: { name: "", signatureDataUrl: null, date: "" },
      assigneeReturnedSignature: { name: "", signatureDataUrl: null, date: "" },
      phrSignature: { name: "", signatureDataUrl: null, date: "" },
      amldSignature: { name: "", signatureDataUrl: null, date: "" },
      itSignature: { name: "", signatureDataUrl: null, date: "" },
      catoSignature: { name: "", signatureDataUrl: null, date: "" },
      history: [
        {
          id: crypto.randomUUID(),
          action: "updated",
          summary: createSummary,
          timestamp: now
        }
      ],
      previousHolders,
      returnHistory: [...(sourceRecord.returnHistory ?? [])],
      archivedAssignments: [...(sourceRecord.archivedAssignments ?? [])]
    };

    let archivedClosedRecord: AccountabilityRecord;
    try {
      if (sourceAccountabilityRecord?.id) {
        archivedClosedRecord = { ...closedRecord, id: sourceAccountabilityRecord.id };
        await updateRecord(sourceAccountabilityRecord.id, closedRecord);
      } else {
        const createdArchivedRecord = await createRecord({
          ...closedRecord,
          id: undefined
        });
        archivedClosedRecord = createdArchivedRecord;
      }

      await syncReturnedAssetsForAccountability(archivedClosedRecord);
      void syncSectionRecordsForAccountability(archivedClosedRecord, { skipReturnedAssetsSync: true });
    } catch (error) {
      console.error("Unable to archive previous reassigned record", error);
      const reason = error instanceof Error ? error.message : "Unknown error";
      window.alert(`Unable to archive previous record. Reason: ${reason}`);
      return;
    }

    let createdRecord: AccountabilityRecord;
    try {
      createdRecord = await createRecord(reassignmentRecordInput);
    } catch (error) {
      console.error("Unable to create reassigned accountability record", error);
      const reason = error instanceof Error ? error.message : "Unknown error";
      window.alert(`Unable to save reassignment right now. Reason: ${reason}`);
      return;
    }

    try {
      await syncReturnedAssetsForAccountability(createdRecord);
      void syncSectionRecordsForAccountability(createdRecord, { skipReturnedAssetsSync: true });
    } catch (error) {
      console.error("Unable to finalize reassignment sync", error);
    }

    setPrefillRecord(null);
    setEditingRecord(null);
    setEditingReturnedAssetRecord(null);
    setSelectedModule("it-accountability-form");
    setActiveView("records");
  };

  const handleReturnedAssetOpenReassignForm = (record: AccountabilityRecord) => {
    setEditingReturnedAssetRecord(record);
    setActiveView("form");
  };

  const handleCreateNewFormFromPreviousRecord = (record: AccountabilityRecord) => {
    const reassignmentPrefill: AccountabilityRecord = {
      ...record,
      id: undefined,
      no: "",
      empId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      position: "",
      group: "",
      employmentStatus: "Deployed",
      transferDecision: "",
      returnedDate: "",
      attachments: [],
      assigneeSignature: { name: "", signatureDataUrl: null, date: "" },
      assigneeReturnedSignature: { name: "", signatureDataUrl: null, date: "" },
      phrSignature: { name: "", signatureDataUrl: null, date: "" },
      amldSignature: { name: "", signatureDataUrl: null, date: "" },
      itSignature: { name: "", signatureDataUrl: null, date: "" },
      catoSignature: { name: "", signatureDataUrl: null, date: "" },
      workflowStatus: "Pending Employee Signature",
      signatureRouteTo: "",
      history: [],
      previousHolders: record.previousHolders ?? [],
      returnHistory: record.returnHistory ?? [],
      archivedAssignments: record.archivedAssignments ?? [],
      createdAt: undefined,
      updatedAt: undefined
    };

    setEditingRecord(null);
    setPrefillRecord(reassignmentPrefill);
    setSelectedModule("it-accountability-form");
    setActiveView("form");
  };

  const handleDelete = async (record: AccountabilityRecord) => {
    if (!record.id) return;
    const confirmed = window.confirm(`Delete record for ${record.empId} - ${record.lastName}?`);
    if (!confirmed) return;
    await removeRecord(record.id);
    await removeAssetInventoryRecord(record.id);
    await removeIpadInventoryRecord(record.id);
    await removeReturnedAssetsRecord(record.id);
    const linkedDisposalRecords = disposalRecords.filter(
      (item) => item.sourceAccountabilityRecordId === record.id
    );
    for (const linkedDisposalRecord of linkedDisposalRecords) {
      await removeDisposalRecord(linkedDisposalRecord.id);
    }
    await removeBorrowingReceipt(record.id);
    const linkedSoftwareRecords = softwareRecords.filter(
      (item) => item.sourceAccountabilityRecordId === record.id || item.id === record.id
    );
    for (const linkedSoftwareRecord of linkedSoftwareRecords) {
      if (linkedSoftwareRecord.id) {
        await removeSoftwareRecord(linkedSoftwareRecord.id);
      }
    }
    if (selectedRecord?.id === record.id) setSelectedRecord(null);
    if (editingRecord?.id === record.id) setEditingRecord(null);
  };

  const handleSoftwareSubmit = async (record: SoftwareInventoryRecord) => {
    const cleaned: SoftwareInventoryRecord = { ...record };
    Object.keys(cleaned).forEach((key) => {
      const typedKey = key as keyof SoftwareInventoryRecord;
      if (typeof cleaned[typedKey] === "string") {
        cleaned[typedKey] = String(cleaned[typedKey]).trim() as never;
      }
    });

    if (editingSoftwareRecord?.id) {
      await updateSoftwareRecord(editingSoftwareRecord.id, cleaned);
      setEditingSoftwareRecord(null);
      setSelectedSoftwareRecord((prev) => {
        if (!prev || prev.id !== editingSoftwareRecord.id) return prev;
        return { ...cleaned, id: prev.id };
      });
      setSelectedModule("it-software-inventory");
      setActiveView("records");
      return;
    }

    await createSoftwareRecord(cleaned);
    setSelectedModule("it-software-inventory");
    setActiveView("records");
  };

  const handleSoftwareDelete = async (record: SoftwareInventoryRecord) => {
    if (!record.id) return;
    const confirmed = window.confirm(
      `Delete software form for ${record.softwareName} - ${record.assignedTo}?`
    );
    if (!confirmed) return;
    await removeSoftwareRecord(record.id);
    if (selectedSoftwareRecord?.id === record.id) setSelectedSoftwareRecord(null);
    if (editingSoftwareRecord?.id === record.id) setEditingSoftwareRecord(null);
  };

  const handlePrintRecord = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setActiveView("printable");
    setPrintActionType("accountability");
    setPendingPrint(true);
  };

  useEffect(() => {
    if (!pendingPrint || activeView !== "printable" || !selectedRecord) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handlePrint();
      setPendingPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingPrint, activeView, selectedRecord, handlePrint]);

  useEffect(() => {
    if (!pendingBorrowingPrint || activeView !== "borrowing-printable" || !selectedRecord) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleBorrowingPrint();
      setPendingBorrowingPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingBorrowingPrint, activeView, selectedRecord, handleBorrowingPrint]);

  useEffect(() => {
    if (!pendingDeliveryReceiptPrint || activeView !== "delivery-receipt-printable" || !selectedDeliveryReceiptRecord) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleDeliveryReceiptPrint();
      setPendingDeliveryReceiptPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingDeliveryReceiptPrint, activeView, selectedDeliveryReceiptRecord, handleDeliveryReceiptPrint]);

  useEffect(() => {
    if (
      !pendingAssetPrint ||
      activeView !== "printable" ||
      selectedModule !== "it-asset-inventory"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleAssetPrint();
      setPendingAssetPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingAssetPrint, activeView, selectedModule, handleAssetPrint]);

  useEffect(() => {
    if (
      !pendingIpadPrint ||
      activeView !== "printable" ||
      selectedModule !== "ipad-inventory"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleIpadPrint();
      setPendingIpadPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingIpadPrint, activeView, selectedModule, handleIpadPrint]);

  useEffect(() => {
    if (
      !pendingReturnedAssetsPrint ||
      activeView !== "printable" ||
      selectedModule !== "returned-assets"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleReturnedAssetsPrint();
      setPendingReturnedAssetsPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingReturnedAssetsPrint, activeView, selectedModule, handleReturnedAssetsPrint]);

  useEffect(() => {
    if (!pendingSoftwarePrint || activeView !== "printable" || !selectedSoftwareRecord) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSoftwarePrint();
      setPendingSoftwarePrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingSoftwarePrint, activeView, selectedSoftwareRecord, handleSoftwarePrint]);

  useEffect(() => {
    if (!pendingDisposalPrint || activeView !== "printable" || selectedModule !== "disposal") {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleDisposalPrint();
      setPendingDisposalPrint(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pendingDisposalPrint, activeView, selectedModule, handleDisposalPrint]);

  useEffect(() => {
    const isBorrowingViewInSupportedModule =
      activeView === "borrowing-form" &&
      (selectedModule === "it-accountability-form" || selectedModule === "it-asset-inventory");

    if (!isBorrowingViewInSupportedModule) {
      return;
    }

    if (!selectedRecord && records.length > 0) {
      setSelectedRecord(records[0]);
    }
  }, [selectedModule, activeView, selectedRecord, records]);

  const handleViewRecord = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setActiveView("printable");
  };

  const handleEditRecord = (record: AccountabilityRecord) => {
    setPrefillRecord(null);
    setEditingRecord(record);
    setActiveView("form");
  };

  const handleBorrowingRecord = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setBorrowingFormInitialData(record.id ? borrowingReceiptByRecordId[record.id] ?? null : null);
    setActiveView("borrowing-form");
  };

  const handleViewBorrowingRecord = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setPrintActionType("borrowing");
    setActiveView("borrowing-printable");
  };

  const handlePrintBorrowingRecord = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setPrintActionType("borrowing");
    setActiveView("borrowing-printable");
    setPendingBorrowingPrint(true);
  };

  const handleDeleteBorrowingRecord = async (record: AccountabilityRecord) => {
    if (!record.id) return;
    const confirmed = window.confirm(`Delete borrowing receipt for ${record.empId} - ${record.lastName}?`);
    if (!confirmed) return;

    await removeBorrowingReceipt(record.id);

    if (selectedRecord?.id === record.id && activeView === "borrowing-printable") {
      setActiveView("borrowing-form");
    }
  };

  const handleSaveBorrowingForm = async (recordId: string, data: BorrowingReceiptData) => {
    try {
      await saveBorrowingReceipt(recordId, data);
      setBorrowingFormInitialData(null);
      setRecordsInitialTable("borrowing");
      setActiveView("records");
      window.alert("Borrowing receipt saved successfully!");
    } catch {
      window.alert("Unable to save borrowing receipt to Firestore. Please check permissions and try again.");
    }
  };

  const handleViewSoftwareRecord = (record: SoftwareInventoryRecord) => {
    setSelectedSoftwareRecord(record);
    setActiveView("printable");
  };

  const handleEditSoftwareRecord = (record: SoftwareInventoryRecord) => {
    setEditingSoftwareRecord(record);
    setActiveView("form");
  };

  const handlePrintSoftwareRecord = (record: SoftwareInventoryRecord) => {
    setSelectedSoftwareRecord(record);
    setActiveView("printable");
    setPendingSoftwarePrint(true);
  };

  const handleDisposalSubmit = async (record: DisposalRecord) => {
    if (editingDisposalRecord?.id) {
      await updateDisposalRecord(editingDisposalRecord.id, record);
      setEditingDisposalRecord(null);
      setActiveView("records");
      return;
    }

    await createDisposalRecord(record);
    setActiveView("records");
  };

  const handleDisposalDelete = async (record: DisposalRecord) => {
    const confirmed = window.confirm(`Delete disposal record ${record.disposalNo || record.id}?`);
    if (!confirmed) return;
    await removeDisposalRecord(record.id);
    if (editingDisposalRecord?.id === record.id) {
      setEditingDisposalRecord(null);
    }
  };

  const handleDisposalEdit = (record: DisposalRecord) => {
    setEditingDisposalRecord(record);
    setActiveView("form");
  };

  const handleDisposalView = (record: DisposalRecord) => {
    setSelectedDisposalRecord(record);
    setActiveView("printable");
  };

  const handleDisposalPrintRecord = (record: DisposalRecord) => {
    setSelectedDisposalRecord(record);
    setActiveView("printable");
    setPendingDisposalPrint(true);
  };

  const persistDeliveryReceiptRecords = (next: DeliveryReceiptRecord[]) => {
    setDeliveryReceiptRecords(next);
    localStorage.setItem(DELIVERY_RECEIPT_STORAGE_KEY, JSON.stringify(next));
  };

  const handleSaveDeliveryReceipt = (record: Omit<DeliveryReceiptRecord, "id" | "createdAt" | "updatedAt">) => {
    if (editingDeliveryReceiptRecord) {
      const updatedAt = new Date().toISOString();
      const next = deliveryReceiptRecords.map((item) =>
        item.id === editingDeliveryReceiptRecord.id
          ? {
              ...item,
              ...record,
              updatedAt
            }
          : item
      );

      persistDeliveryReceiptRecords(next);
      setEditingDeliveryReceiptRecord(null);
      setRecordsInitialTable("delivery");
      setActiveView("records");
      return;
    }

    const now = new Date().toISOString();
    const newRecord: DeliveryReceiptRecord = {
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...record,
      createdAt: now,
      updatedAt: now
    };

    const next = [newRecord, ...deliveryReceiptRecords];
    persistDeliveryReceiptRecords(next);
    setRecordsInitialTable("delivery");
    setActiveView("records");
  };

  const handleEditDeliveryReceiptRecord = (record: DeliveryReceiptRecord) => {
    setEditingDeliveryReceiptRecord(record);
    setActiveView("delivery-receipt-form");
  };

  const handleViewDeliveryReceiptRecord = (record: DeliveryReceiptRecord) => {
    setSelectedDeliveryReceiptRecord(record);
    setActiveView("delivery-receipt-printable");
  };

  const handleDeleteDeliveryReceiptRecord = (record: DeliveryReceiptRecord) => {
    const confirmed = window.confirm(`Delete delivery receipt ${record.invoiceNumber || record.id}?`);
    if (!confirmed) return;

    const next = deliveryReceiptRecords.filter((item) => item.id !== record.id);
    persistDeliveryReceiptRecords(next);
    if (editingDeliveryReceiptRecord?.id === record.id) {
      setEditingDeliveryReceiptRecord(null);
    }
  };

  const handlePrintDeliveryReceiptRecord = (record: DeliveryReceiptRecord) => {
    setSelectedDeliveryReceiptRecord(record);
    setActiveView("delivery-receipt-printable");
    setPendingDeliveryReceiptPrint(true);
  };

  const handleModuleSelect = (moduleKey: string) => {
    const typed = moduleKey as ModuleKey;
    setSelectedModule(typed);
    if (typed === "new-item") {
      setActiveView("delivery-receipt-form");
      return;
    }
    if (typed === "it-accountability-form") {
      setActiveView("form");
      return;
    }
    if (typed === "it-asset-inventory") {
      setActiveView("inventory");
      return;
    }
    if (typed === "it-software-inventory") {
      setActiveView("form");
      return;
    }
    if (typed === "ipad-inventory") {
      setActiveView("inventory");
      return;
    }
    if (typed === "disposal") {
      setActiveView("form");
      return;
    }
    if (typed === "returned-assets") {
      setActiveView("records");
      return;
    }

    window.alert("This module will be available soon.");
    setSelectedModule(null);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="app-shell">
        <section className="panel">
          <h2>Firebase Setup Required</h2>
          <p className="helper-text">
            Configure Firebase environment values before using this admin-only system.
          </p>
          <div className="error-box">
            <p>Set these environment variables and restart the dev server:</p>
            <p>VITE_FIREBASE_API_KEY</p>
            <p>VITE_FIREBASE_AUTH_DOMAIN</p>
            <p>VITE_FIREBASE_PROJECT_ID</p>
            <p>VITE_FIREBASE_STORAGE_BUCKET</p>
            <p>VITE_FIREBASE_MESSAGING_SENDER_ID</p>
            <p>VITE_FIREBASE_APP_ID</p>
            <p>VITE_FIREBASE_ADMIN_UID</p>
          </div>
        </section>
      </div>
    );
  }

  if (!isAdminUidConfigured) {
    return (
      <div className="app-shell">
        <section className="panel">
          <h2>Admin UID Required</h2>
          <p className="helper-text">
            Set VITE_FIREBASE_ADMIN_UID to the Firebase Authentication UID of your admin user.
          </p>
        </section>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <section className="panel">
          <h2>Checking Admin Session...</h2>
          <p className="helper-text">Please wait while authentication is validated.</p>
        </section>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <section className="panel" style={{ maxWidth: "460px", margin: "32px auto" }}>
          <h2>Admin Login</h2>
          <p className="helper-text">Sign in with the configured admin account to access this system.</p>

          {authError && (
            <div className="error-box">
              <p>{authError}</p>
            </div>
          )}

          <form className="form-grid" onSubmit={handleLogin}>
            <label className="field field-span">
              <span>Email</span>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
              />
            </label>

            <label className="field field-span">
              <span>Password</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
            </label>

            <div className="actions">
              <button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  if (showLanding) {
    return (
      <LandingPage
        onEnter={() => {
          setShowLanding(false);
        }}
      />
    );
  }

  if (!selectedModule) {
    return <SelectionPage onSelect={handleModuleSelect} />;
  }

  const isAccountabilityModule = selectedModule === "it-accountability-form";
  const isNewItemModule = selectedModule === "new-item";
  const isAssetInventoryModule = selectedModule === "it-asset-inventory";
  const isSoftwareInventoryModule = selectedModule === "it-software-inventory";
  const isIpadInventoryModule = selectedModule === "ipad-inventory";
  const isDisposalModule = selectedModule === "disposal";
  const isReturnedAssetsModule = selectedModule === "returned-assets";
  const accountabilityProjectOptions = Array.from(
    new Set(records.map((item) => String(item.project ?? "").trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
  const accountabilityDepartmentOptions = Array.from(
    new Set(records.map((item) => String(item.department ?? "").trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
  const accountabilitySoftwareNameOptions = Array.from(
    new Set(records.map((item) => String(item.softwareName ?? "").trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
  const moduleThemeClass = selectedModule ? `theme-${selectedModule}` : "";

  const visibleRecords = records.filter(
    (item) => item.inventoryEntryType !== "history"
  );

  const bySource = new Map<string, AccountabilityRecord>();
  const getTime = (value?: string) => {
    const parsed = new Date(value ?? "").getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  visibleRecords.forEach((item) => {
    const key =
      item.inventorySourceRecordId ||
      `${item.empId}-${item.hostname}-${item.deviceAssetNumber}-${item.serialNumber}`;

    const existing = bySource.get(key);
    if (!existing || getTime(item.updatedAt) >= getTime(existing.updatedAt)) {
      bySource.set(key, item);
    }
  });

  const activeAssetInventoryRecords = Array.from(bySource.values()).sort(
    (left, right) => getTime(right.updatedAt) - getTime(left.updatedAt)
  );

  const headerTitle = isNewItemModule
    ? "New Item"
    : isAssetInventoryModule
    ? "IT Asset Inventory"
    : isSoftwareInventoryModule
      ? "IT Software Inventory"
      : isIpadInventoryModule
        ? "IPAD Inventory"
        : isDisposalModule
          ? "Disposal"
          : isReturnedAssetsModule
            ? "Returned Assets"
      : "IT Accountability Form";

  return (
    <div className={`app-shell ${moduleThemeClass}`}>
      <HeaderBar
        localMode={useLocalMode}
        title={headerTitle}
        userEmail={authUser.email ?? "Admin"}
        onLogout={() => {
          void handleLogout();
        }}
      />
      <div className="layout">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {isAccountabilityModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "form" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setEditingRecord(null);
                    setPrefillRecord(null);
                    setActiveView("form");
                  }}
                >
                  <span className="nav-icon">✦</span>
                  Create Accountability Form
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "records" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setRecordsInitialTable(null);
                    setActiveView("records");
                  }}
                >
                  <span className="nav-icon">☰</span>
                  Records
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" || activeView === "borrowing-printable" || activeView === "delivery-receipt-printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setSelectedRecord(null);
                    setActiveView("printable");
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isNewItemModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "delivery-receipt-form" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setEditingDeliveryReceiptRecord(null);
                    setActiveView("delivery-receipt-form");
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 3.5h8.2l2.8 2.8v13.2l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2V5.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  Create Delivery Receipt
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "records" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setRecordsInitialTable("delivery");
                    setActiveView("records");
                  }}
                >
                  <span className="nav-icon">☰</span>
                  Records
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "delivery-receipt-printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    if (!selectedDeliveryReceiptRecord && deliveryReceiptRecords.length > 0) {
                      setSelectedDeliveryReceiptRecord(deliveryReceiptRecords[0]);
                    }
                    setActiveView("delivery-receipt-printable");
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isAssetInventoryModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "inventory" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("inventory")}
                >
                  <span className="nav-icon">▦</span>
                  Asset
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "borrowing-form" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setBorrowingFormInitialData(null);
                    setActiveView("borrowing-form");
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 4h8l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9 9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  Create Borrowing Receipt
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "chart" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("chart")}
                >
                  <span className="nav-icon">◔</span>
                  Chart
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setActiveView("printable");
                    setPendingAssetPrint(true);
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isSoftwareInventoryModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "form" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("form")}
                >
                  <span className="nav-icon">✦</span>
                  New Software Form
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "records" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("records")}
                >
                  <span className="nav-icon">☰</span>
                  Records
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "chart" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("chart")}
                >
                  <span className="nav-icon">◔</span>
                  Chart
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("printable")}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isIpadInventoryModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "inventory" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("inventory")}
                >
                  <span className="nav-icon">▦</span>
                  IPAD Records
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setActiveView("printable");
                    setPendingIpadPrint(true);
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isDisposalModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "form" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setEditingDisposalRecord(null);
                    setActiveView("form");
                  }}
                >
                  <span className="nav-icon">✦</span>
                  New Disposal Form
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "records" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("records")}
                >
                  <span className="nav-icon">☰</span>
                  Disposal Records
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    if (!selectedDisposalRecord && disposalRecords.length > 0) {
                      setSelectedDisposalRecord(disposalRecords[0]);
                    }
                    setActiveView("printable");
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}

            {isReturnedAssetsModule && (
              <>
                <button
                  type="button"
                  className={`nav-btn${activeView === "records" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("records")}
                >
                  <span className="nav-icon">☰</span>
                  Returned Assets
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "form" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("form")}
                >
                  <span className="nav-icon">✎</span>
                  Reassign Form
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "chart" ? " nav-btn--active" : ""}`}
                  onClick={() => setActiveView("chart")}
                >
                  <span className="nav-icon">◔</span>
                  Chart
                </button>
                <button
                  type="button"
                  className={`nav-btn${activeView === "printable" ? " nav-btn--active" : ""}`}
                  onClick={() => {
                    setActiveView("printable");
                    setPendingReturnedAssetsPrint(true);
                  }}
                >
                  <span className="nav-icon">⎙</span>
                  Printable Form
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-bottom">
            <button
              type="button"
              className="nav-btn nav-btn-danger"
              onClick={() => {
                setSelectedModule(null);
              }}
            >
              <span className="nav-icon">↩</span>
              Back
            </button>
          </div>
        </aside>

        <main className="main-content">
          {(accountabilityError || softwareError || borrowingError || assetInventoryError || ipadInventoryError || returnedAssetsError || disposalError) && (
            <div className="error-box">
              {accountabilityError && <p>{accountabilityError}</p>}
              {softwareError && <p>{softwareError}</p>}
              {borrowingError && <p>{borrowingError}</p>}
              {assetInventoryError && <p>{assetInventoryError}</p>}
              {ipadInventoryError && <p>{ipadInventoryError}</p>}
              {returnedAssetsError && <p>{returnedAssetsError}</p>}
              {disposalError && <p>{disposalError}</p>}
            </div>
          )}

          {isNewItemModule && activeView === "delivery-receipt-form" && (
            <DeliveryReceiptForm
              editingRecord={editingDeliveryReceiptRecord}
              onSave={handleSaveDeliveryReceipt}
              onCancelEdit={() => {
                setEditingDeliveryReceiptRecord(null);
                setRecordsInitialTable("delivery");
                setActiveView("records");
              }}
            />
          )}

          {isAccountabilityModule && activeView === "form" && (
            <EmployeeForm
              editingRecord={editingRecord}
              prefillRecord={prefillRecord}
              onSubmit={handleSubmit}
              onCancelEdit={() => {
                setEditingRecord(null);
                setPrefillRecord(null);
                setActiveView("records");
              }}
            />
          )}

          {isAccountabilityModule && activeView === "delivery-receipt-form" && (
            <DeliveryReceiptForm
              editingRecord={editingDeliveryReceiptRecord}
              onSave={handleSaveDeliveryReceipt}
              onCancelEdit={() => {
                setEditingDeliveryReceiptRecord(null);
                setRecordsInitialTable("delivery");
                setActiveView("records");
              }}
            />
          )}

          {isNewItemModule && activeView === "records" && (
            <RecordsList
              records={records}
              borrowingReceiptByRecordId={borrowingReceiptByRecordId}
              deliveryReceiptRecords={deliveryReceiptRecords}
              initialTable={recordsInitialTable ?? "delivery"}
              onEdit={handleEditRecord}
              onDelete={handleDelete}
              onPrint={handlePrintRecord}
              onView={handleViewRecord}
              onBorrowing={handleBorrowingRecord}
              onBorrowingView={handleViewBorrowingRecord}
              onBorrowingDelete={handleDeleteBorrowingRecord}
              onBorrowingPrint={handlePrintBorrowingRecord}
              onDeliveryView={handleViewDeliveryReceiptRecord}
              onDeliveryEdit={handleEditDeliveryReceiptRecord}
              onDeliveryDelete={handleDeleteDeliveryReceiptRecord}
              onDeliveryPrint={handlePrintDeliveryReceiptRecord}
              printActionType={printActionType}
              deliveryOnly
            />
          )}

          {isAssetInventoryModule && activeView === "inventory" && (
            <ITAssetInventory
              records={activeAssetInventoryRecords}
              newItemRecords={deliveryReceiptRecords}
              loading={accountabilityLoading}
              onRefresh={reloadAccountabilityRecords}
            />
          )}

          {isAssetInventoryModule && activeView === "chart" && (
            <ITAssetChart records={activeAssetInventoryRecords} />
          )}

          {isAssetInventoryModule && activeView === "printable" && (
            <ITAssetInventoryPrintable records={activeAssetInventoryRecords} ref={assetPrintRef} />
          )}

          {isAssetInventoryModule && activeView === "borrowing-form" && (
            <BorrowingReceiptForm
              record={selectedRecord}
              initialData={borrowingFormInitialData}
              onSave={handleSaveBorrowingForm}
            />
          )}

          {isIpadInventoryModule && activeView === "inventory" && (
            <IPadInventory records={ipadInventoryRecords} />
          )}

          {isIpadInventoryModule && activeView === "printable" && (
            <IPadInventoryPrintable records={ipadInventoryRecords} ref={ipadPrintRef} />
          )}

          {isSoftwareInventoryModule && activeView === "form" && (
            <SoftwareInventoryForm
              editingRecord={editingSoftwareRecord}
              onSubmit={handleSoftwareSubmit}
              softwareNameOptionsFromAccountability={accountabilitySoftwareNameOptions}
              projectOptionsFromAccountability={accountabilityProjectOptions}
              departmentOptionsFromAccountability={accountabilityDepartmentOptions}
              onCancelEdit={() => {
                setEditingSoftwareRecord(null);
                setActiveView("records");
              }}
            />
          )}

          {isAccountabilityModule && activeView === "records" && (
            <RecordsList
              records={records}
              borrowingReceiptByRecordId={borrowingReceiptByRecordId}
              deliveryReceiptRecords={deliveryReceiptRecords}
              initialTable={recordsInitialTable}
              onEdit={handleEditRecord}
              onDelete={handleDelete}
              onPrint={handlePrintRecord}
              onView={handleViewRecord}
              onBorrowing={handleBorrowingRecord}
              onBorrowingView={handleViewBorrowingRecord}
              onBorrowingDelete={handleDeleteBorrowingRecord}
              onBorrowingPrint={handlePrintBorrowingRecord}
              onCreateFromPreviousRecord={handleCreateNewFormFromPreviousRecord}
              onDeliveryView={handleViewDeliveryReceiptRecord}
              onDeliveryEdit={handleEditDeliveryReceiptRecord}
              onDeliveryDelete={handleDeleteDeliveryReceiptRecord}
              onDeliveryPrint={handlePrintDeliveryReceiptRecord}
              printActionType={printActionType}
              accountabilityOnly
            />
          )}

          {isAccountabilityModule && activeView === "borrowing-form" && (
            <BorrowingReceiptForm
              record={selectedRecord}
              initialData={borrowingFormInitialData}
              onSave={handleSaveBorrowingForm}
            />
          )}

          {isSoftwareInventoryModule && activeView === "records" && (
            <SoftwareInventoryRecords
              records={softwareRecords}
              loading={softwareLoading}
              onEdit={handleEditSoftwareRecord}
              onDelete={handleSoftwareDelete}
              onView={handleViewSoftwareRecord}
              onPrint={handlePrintSoftwareRecord}
            />
          )}

          {isSoftwareInventoryModule && activeView === "chart" && (
            <SoftwareInventoryChart records={softwareRecords} />
          )}

          {isAccountabilityModule && activeView === "printable" && (
            <PrintableForm record={selectedRecord} ref={printRef} />
          )}

          {isAccountabilityModule && activeView === "borrowing-printable" && (
            <BorrowingReceiptPrintable
              record={selectedRecord}
              data={selectedRecord?.id ? borrowingReceiptByRecordId[selectedRecord.id] ?? emptyBorrowingReceiptData() : emptyBorrowingReceiptData()}
              ref={borrowingPrintRef}
            />
          )}

          {isAccountabilityModule && activeView === "delivery-receipt-printable" && (
            <DeliveryReceiptPrintable
              record={selectedDeliveryReceiptRecord}
              ref={deliveryReceiptPrintRef}
            />
          )}

          {isNewItemModule && activeView === "delivery-receipt-printable" && (
            <DeliveryReceiptPrintable
              record={selectedDeliveryReceiptRecord}
              ref={deliveryReceiptPrintRef}
            />
          )}

          {isSoftwareInventoryModule && activeView === "printable" && (
            <SoftwareInventoryPrintable
              record={selectedSoftwareRecord}
              ref={softwarePrintRef}
            />
          )}

          {isDisposalModule && activeView === "form" && (
            <DisposalForm
              editingRecord={editingDisposalRecord}
              onSubmit={handleDisposalSubmit}
              onCancelEdit={() => {
                setEditingDisposalRecord(null);
                setActiveView("records");
              }}
            />
          )}

          {isDisposalModule && activeView === "records" && (
            <DisposalRecords
              records={disposalRecords}
              onEdit={handleDisposalEdit}
              onDelete={handleDisposalDelete}
              onView={handleDisposalView}
              onPrint={handleDisposalPrintRecord}
            />
          )}

          {isDisposalModule && activeView === "printable" && (
            <DisposalPrintable record={selectedDisposalRecord} ref={disposalPrintRef} />
          )}

          {isReturnedAssetsModule && activeView === "form" && (
            <ReturnedAssetsReassignForm
              record={editingReturnedAssetRecord}
              onSave={handleReturnedAssetSaveEdit}
              onCancel={() => {
                setEditingReturnedAssetRecord(null);
                setActiveView("records");
              }}
            />
          )}

          {isReturnedAssetsModule && activeView === "records" && (
            <ReturnedAssetsRecords
              records={returnedAssetsRecords}
              onReassign={handleReturnedAssetOpenReassignForm}
            />
          )}

          {isReturnedAssetsModule && activeView === "chart" && (
            <ReturnedAssetsChart records={returnedAssetsRecords} />
          )}

          {isReturnedAssetsModule && activeView === "printable" && (
            <ReturnedAssetsPrintable records={returnedAssetsRecords} ref={returnedAssetsPrintRef} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
