import { useEffect, useMemo, useState } from "react";
import { AccountabilityRecord } from "../types/accountability";
import { BorrowingReceiptData } from "../types/borrowingReceipt";
import { DeliveryReceiptRecord } from "../types/deliveryReceipt";

interface RecordsListProps {
  records: AccountabilityRecord[];
  borrowingReceiptByRecordId: Record<string, BorrowingReceiptData>;
  deliveryReceiptRecords: DeliveryReceiptRecord[];
  initialTable?: "accountability" | "borrowing" | "delivery" | null;
  onEdit: (record: AccountabilityRecord) => void;
  onDelete: (record: AccountabilityRecord) => Promise<void>;
  onPrint: (record: AccountabilityRecord) => void;
  onView: (record: AccountabilityRecord) => void;
  onBorrowing: (record: AccountabilityRecord) => void;
  onBorrowingView: (record: AccountabilityRecord) => void;
  onBorrowingDelete: (record: AccountabilityRecord) => void;
  onBorrowingPrint: (record: AccountabilityRecord) => void;
  onDeliveryView: (record: DeliveryReceiptRecord) => void;
  onDeliveryEdit: (record: DeliveryReceiptRecord) => void;
  onDeliveryDelete: (record: DeliveryReceiptRecord) => void;
  onDeliveryPrint: (record: DeliveryReceiptRecord) => void;
  printActionType?: "accountability" | "borrowing" | null;
  deliveryOnly?: boolean;
  accountabilityOnly?: boolean;
}

type SortKey = keyof AccountabilityRecord;
const EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY = "ias:employee-form:dropdown-config";
const REMOVED_PROJECT_OPTIONS = new Set([
  "onboarding 2026",
  "arca opcen",
  "avida south pie",
  "erp rollput",
  "erp rollout"
]);

const isRemovedProjectOption = (value: string) =>
  REMOVED_PROJECT_OPTIONS.has(value.trim().toLowerCase());

const readProjectOptionsFromEmployeeForm = () => {
  try {
    const raw = localStorage.getItem(EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY);
    if (!raw) return [] as string[];

    const parsed = JSON.parse(raw) as {
      selectOptions?: Record<string, string[]>;
    };

    return (
      parsed.selectOptions?.project?.filter(
        (option) => Boolean(option) && !isRemovedProjectOption(String(option))
      ) ?? []
    );
  } catch {
    return [] as string[];
  }
};

const AccountabilityIcon = () => (
  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
    <path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M15 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="m10 16 4.5-4.5 1.5 1.5L11.5 17.5H10z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const BorrowingIcon = () => (
  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
    <path d="M7 4h8l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M15 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const DeliveryReceiptIcon = () => (
  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
    <path d="M7 3.5h8.2l2.8 2.8v13.2l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2V5.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const RecordsList = ({
  records,
  borrowingReceiptByRecordId,
  deliveryReceiptRecords,
  initialTable,
  onEdit,
  onDelete,
  onPrint,
  onView,
  onBorrowing,
  onBorrowingView,
  onBorrowingDelete,
  onBorrowingPrint,
  onDeliveryView,
  onDeliveryEdit,
  onDeliveryDelete,
  onDeliveryPrint,
  printActionType,
  deliveryOnly = false,
  accountabilityOnly = false
}: RecordsListProps) => {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [ascending, setAscending] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AccountabilityRecord | null>(null);
  const [historyModalRecord, setHistoryModalRecord] = useState<AccountabilityRecord | null>(null);
  const [activeTable, setActiveTable] = useState<"accountability" | "borrowing" | "delivery" | null>(null);

  useEffect(() => {
    if (deliveryOnly) {
      setActiveTable("delivery");
      return;
    }

    if (accountabilityOnly) {
      setActiveTable("accountability");
      return;
    }

    if (initialTable !== undefined) {
      setActiveTable(initialTable);
    }
  }, [initialTable, deliveryOnly, accountabilityOnly]);

  const options = useMemo(() => {
    const getUnique = (key: keyof AccountabilityRecord) =>
      Array.from(new Set(records.map((item) => String(item[key] ?? "")).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );

    const projectOptionsFromForm = readProjectOptionsFromEmployeeForm();

    return {
      departments: getUnique("department"),
      projects: Array.from(
        new Set([...getUnique("project"), ...projectOptionsFromForm])
      )
        .filter((option) => !isRemovedProjectOption(option))
        .sort((a, b) => a.localeCompare(b))
    };
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();

    const base = records.filter((item) => {
      const searchable = [
        item.empId,
        item.firstName,
        item.middleName,
        item.lastName,
        item.department,
        item.project,
        item.hostname,
        item.serialNumber
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchable.includes(lowered);
      const byDepartment = !department || item.department === department;
      const byProject = !project || item.project === project;

      return bySearch && byDepartment && byProject;
    });

    return [...base].sort((a, b) => {
      const left = String(a[sortKey] ?? "").toLowerCase();
      const right = String(b[sortKey] ?? "").toLowerCase();
      const compared = left.localeCompare(right);
      return ascending ? compared : -compared;
    });
  }, [records, search, department, project, sortKey, ascending]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAscending((prev) => !prev);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  const handleViewHistory = (record: AccountabilityRecord) => {
    setHistoryModalRecord(record);
  };

  useEffect(() => {
    if (!historyModalRecord) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryModalRecord(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyModalRecord]);

  const historyName = historyModalRecord
    ? [historyModalRecord.firstName, historyModalRecord.middleName, historyModalRecord.lastName]
        .filter(Boolean)
        .join(" ") || historyModalRecord.empId || "Record"
    : "";

  const historyEdits = useMemo(() => {
    if (!historyModalRecord) {
      return [];
    }

    return [...(historyModalRecord.history ?? [])].sort((a, b) =>
      String(b.timestamp).localeCompare(String(a.timestamp))
    );
  }, [historyModalRecord]);

  const historyHolders = useMemo(() => {
    if (!historyModalRecord) {
      return [];
    }

    return [...(historyModalRecord.previousHolders ?? [])].sort((a, b) =>
      String(b.releasedAt).localeCompare(String(a.releasedAt))
    );
  }, [historyModalRecord]);

  const historyReturns = useMemo(() => {
    if (!historyModalRecord) {
      return [];
    }

    return [...(historyModalRecord.returnHistory ?? [])].sort((a, b) =>
      String(b.recordedAt).localeCompare(String(a.recordedAt))
    );
  }, [historyModalRecord]);

  const historyArchivedAssignments = useMemo(() => {
    if (!historyModalRecord) {
      return [];
    }

    return [...(historyModalRecord.archivedAssignments ?? [])].sort((a, b) =>
      String(b.archivedAt).localeCompare(String(a.archivedAt))
    );
  }, [historyModalRecord]);

  const borrowingRows = useMemo(() => {
    return records
      .map((record) => {
        if (!record.id) return null;
        const borrowing = borrowingReceiptByRecordId[record.id];
        if (!borrowing) return null;

        return {
          record,
          borrowing
        };
      })
      .filter(Boolean) as Array<{ record: AccountabilityRecord; borrowing: BorrowingReceiptData }>;
  }, [records, borrowingReceiptByRecordId]);

  const effectiveTable = deliveryOnly
    ? "delivery"
    : accountabilityOnly
      ? "accountability"
      : activeTable;

  return (
    <section className={`panel${deliveryOnly || accountabilityOnly ? "" : " records-with-sidebar"}`}>
      {!deliveryOnly && !accountabilityOnly && (
        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-btn delivery"
            onClick={() => setActiveTable("delivery")}
            title="Delivery Receipt Records"
            aria-label="Open Delivery Receipt Records"
          >
            <span className="icon">
              <DeliveryReceiptIcon />
            </span>
          </button>
          <button
            type="button"
            className="sidebar-btn accountability"
            onClick={() => setActiveTable("accountability")}
            title="Accountability Records"
            aria-label="Open Accountability Records"
          >
            <span className="icon">
              <AccountabilityIcon />
            </span>
          </button>
          <button
            type="button"
            className="sidebar-btn borrowing"
            onClick={() => setActiveTable("borrowing")}
            title="Borrowing Receipt Records"
            aria-label="Open Borrowing Receipt Records"
          >
            <span className="icon">
              <BorrowingIcon />
            </span>
          </button>
        </div>
      )}
      <div className="records-main">
        {effectiveTable === null ? (
          <p className="helper-text">Select an icon on the left to show Delivery Receipt, Accountability and Borrowing Receipt records.</p>
        ) : (
          <>
        <h2>
          {effectiveTable === "borrowing"
            ? "Borrowing Receipt Records"
            : effectiveTable === "delivery"
              ? "Delivery Receipt Records"
              : "IT Accountability Form Records"}
        </h2>
        {effectiveTable !== "delivery" && (
        <div className="filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee, project, hostname..."
        />

        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {options.departments.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All Projects</option>
          {options.projects.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
        )}

      {printActionType && effectiveTable !== "delivery" && (
        <div className={`action-type-sidebar action-${printActionType}`}>
          <strong>Mode:</strong> {printActionType === "accountability" ? "Accountability Form" : "Borrowing Receipt"}
        </div>
      )}

      {effectiveTable === "accountability" ? (
        <div className="table-wrap">
          <table className="accountability-table">
            <thead>
              <tr>
                <th><button type="button" onClick={() => toggleSort("empId")}>Emp ID</button></th>
                <th><button type="button" onClick={() => toggleSort("lastName")}>Name</button></th>
                <th><button type="button" onClick={() => toggleSort("department")}>Department</button></th>
                <th><button type="button" onClick={() => toggleSort("project")}>Project</button></th>
                <th>Attachments</th>
                <th>Workflow</th>
                <th>Previous Holders</th>
                <th>User History</th>
                <th>Returns</th>
                <th><button type="button" onClick={() => toggleSort("updatedAt")}>Updated</button></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className={selectedRecord?.id === record.id ? "selected" : ""} onClick={() => setSelectedRecord(record)}>
                  <td>{record.empId}</td>
                  <td>{[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")}</td>
                  <td>{record.department}</td>
                  <td>{record.project}</td>
                  <td>{record.attachments?.length ?? 0}</td>
                  <td>{record.workflowStatus || "Pending Employee Signature"}</td>
                  <td>{record.previousHolders?.length ?? 0}</td>
                  <td>{record.archivedAssignments?.length ?? 0}</td>
                  <td>{record.returnHistory?.length ?? 0}</td>
                  <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                  <td className="row-actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onView(record); }} title="View accountability form">View</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(record); }} title="Edit accountability record">Edit</button>
                    <button type="button" className="ghost" onClick={(e) => { e.stopPropagation(); handleViewHistory(record); }} title="View edit, holder, and return history">History</button>
                    <button type="button" className="ghost" onClick={(e) => { e.stopPropagation(); void onDelete(record); }}>Delete</button>
                    <button type="button" className="print" onClick={(e) => { e.stopPropagation(); onPrint(record); }} title="Print accountability form">Print</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : effectiveTable === "borrowing" ? (
        <div className="table-wrap">
          <table className="borrowing-table">
            <thead>
              <tr>
                <th>Borrowing No.</th>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Device Type</th>
                <th>Date Borrowed</th>
                <th>Expected Return</th>
                <th>Purpose</th>
                <th>Contact</th>
                <th>Attachments</th>
                <th>Signature</th>
                <th>Requested By</th>
                <th>Approved By</th>
                <th>Released By</th>
                <th>Release Date/Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {borrowingRows.length === 0 ? (
                <tr>
                  <td colSpan={15}>No borrowing receipt records found yet. Fill and save a Borrowing Receipt first.</td>
                </tr>
              ) : (
                borrowingRows
                  .map(({ record, borrowing }) => (
                    <tr key={`borrowing-${record.id}`}>
                      <td>{borrowing.borrowingNo || "-"}</td>
                      <td>{record.empId || "-"}</td>
                      <td>{borrowing.borrowerName || "-"}</td>
                      <td>{borrowing.deviceType || "-"}</td>
                      <td>{borrowing.dateBorrowed || "-"}</td>
                      <td>{borrowing.expectedReturnDate || "-"}</td>
                      <td>{borrowing.purpose || "-"}</td>
                      <td>{borrowing.contact || "-"}</td>
                      <td>{(borrowing.attachments?.length ?? 0) > 0 ? `${borrowing.attachments.length} file(s)` : "-"}</td>
                      <td>{borrowing.signatureDataUrl ? "Signed" : "-"}</td>
                      <td>{borrowing.requestedBy || "-"}</td>
                      <td>{borrowing.approvedBy || "-"}</td>
                      <td>{borrowing.releasedBy || "-"}</td>
                      <td>{borrowing.releaseDateTime || "-"}</td>
                      <td className="row-actions">
                        <button type="button" onClick={() => onBorrowingView(record)} title="View borrowing receipt preview">View</button>
                        <button type="button" onClick={() => onBorrowing(record)} title="Edit borrowing receipt">Edit</button>
                        <button type="button" className="ghost" onClick={() => onBorrowingDelete(record)} title="Delete borrowing receipt">Delete</button>
                        <button type="button" className="print" onClick={() => onBorrowingPrint(record)} title="Print borrowing receipt">Print</button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="delivery-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Purchase Number</th>
                <th>Supplier</th>
                <th>Delivery Date</th>
                <th>Item Description</th>
                <th>Other Details</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryReceiptRecords.length === 0 ? (
                <tr>
                  <td colSpan={8}>No delivery receipt records found yet. Create and save a Delivery Receipt first.</td>
                </tr>
              ) : (
                deliveryReceiptRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.invoiceNumber || "-"}</td>
                    <td>{record.purchaseNumber || "-"}</td>
                    <td>{record.supplier || "-"}</td>
                    <td>{record.deliveryDate || "-"}</td>
                    <td>{record.itemDescription || "-"}</td>
                    <td>{record.otherDetails || "-"}</td>
                    <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => onDeliveryView(record)} title="View delivery receipt">View</button>
                      <button type="button" onClick={() => onDeliveryEdit(record)} title="Edit delivery receipt">Edit</button>
                      <button type="button" className="ghost" onClick={() => onDeliveryDelete(record)} title="Delete delivery receipt">Delete</button>
                      <button type="button" className="print" onClick={() => onDeliveryPrint(record)} title="Print delivery receipt">Print</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
          </>
        )}
      </div>

      {historyModalRecord && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={() => setHistoryModalRecord(null)}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="history-modal-title">History for {historyName}</h3>
                <p className="helper-text">Track edits, previous holders, and return events.</p>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => setHistoryModalRecord(null)}
              >
                Close
              </button>
            </header>

            <div className="history-modal-body">
              <section className="history-section">
                <h4>Edit History</h4>
                {historyEdits.length === 0 ? (
                  <p className="helper-text">No edit history yet.</p>
                ) : (
                  <ul>
                    {historyEdits.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "-"}</strong>
                        <span>{entry.action}</span>
                        <span>{entry.summary}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="history-section">
                <h4>Previous Holders</h4>
                {historyHolders.length === 0 ? (
                  <p className="helper-text">No previous holders tracked yet.</p>
                ) : (
                  <ul>
                    {historyHolders.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.holderName || "Unknown Holder"}</strong>
                        <span>Emp ID: {entry.empId || "-"}</span>
                        <span>Dept: {entry.department || "-"}</span>
                        <span>Project: {entry.project || "-"}</span>
                        <span>Released: {entry.releasedAt ? new Date(entry.releasedAt).toLocaleString() : "-"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="history-section">
                <h4>Return History</h4>
                {historyReturns.length === 0 ? (
                  <p className="helper-text">No return history yet.</p>
                ) : (
                  <ul>
                    {historyReturns.map((entry) => (
                      <li key={entry.id}>
                        <strong>Return Date: {entry.returnedDate || "-"}</strong>
                        <span>Recorded: {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : "-"}</span>
                        <span>Condition: {entry.assetCondition || "-"}</span>
                        <span>{entry.notes || "-"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="history-section">
                <h4>User History</h4>
                {historyArchivedAssignments.length === 0 ? (
                  <p className="helper-text">No user history snapshots yet.</p>
                ) : (
                  <ul>
                    {historyArchivedAssignments.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.fullName || "-"} ({entry.empId || "-"})</strong>
                        <span>Archived: {entry.archivedAt ? new Date(entry.archivedAt).toLocaleString() : "-"}</span>
                        <span>Reason: {entry.reason || "-"}</span>
                        <span>Device: {[entry.deviceType, entry.deviceDescription].filter(Boolean).join(" - ") || "-"}</span>
                        <span>Asset: {entry.deviceAssetNumber || "-"} | Serial: {entry.serialNumber || "-"}</span>
                        <span>Dept/Project: {entry.department || "-"} / {entry.project || "-"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};
