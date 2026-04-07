import { useMemo, useState } from "react";
import { PrintableForm } from "../../accountability/components/PrintableForm";
import { AccountabilityRecord } from "../../accountability/types/accountability";
import { ViewIcon } from "../../../shared/components/ActionIcons";

interface IPadInventoryProps {
  records: AccountabilityRecord[];
  onResolveAccountabilityRecord?: (record: AccountabilityRecord) => AccountabilityRecord | null;
}

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();

export const IPadInventory = ({ records, onResolveAccountabilityRecord }: IPadInventoryProps) => {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [previewRecord, setPreviewRecord] = useState<AccountabilityRecord | null>(null);

  const handleViewAccountability = (record: AccountabilityRecord) => {
    const resolved = onResolveAccountabilityRecord?.(record) ?? record;
    setPreviewRecord(resolved);
  };

  const options = useMemo(() => {
    return Array.from(
      new Set(records.map((item) => item.project).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = normalize(search);

    return records.filter((item) => {
      const searchable = [
        item.empId,
        item.firstName,
        item.middleName,
        item.lastName,
        item.hostname,
        item.serialNumber,
        item.deviceAssetNumber,
        item.project
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchable.includes(lowered);
      const byProject = !projectFilter || item.project === projectFilter;

      return bySearch && byProject;
    });
  }, [records, search, projectFilter]);

  return (
    <section className="panel">
      <h2>IPAD Inventory</h2>
      <p className="helper-text">
        Synced from IT Accountability records where Device Type is Ipad.
      </p>

      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by employee, hostname, serial number..."
        />

        <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value="">All Projects</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee</th>
              <th>Position</th>
              <th>Device Model</th>
              <th>Department</th>
              <th>Project</th>
              <th>Device Condition</th>
              <th>Status</th>
              <th>Serial Number</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id ?? `${record.empId}-${record.hostname}`}>
                <td>{record.empId}</td>
                <td>{[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")}</td>
                <td>{record.position || "-"}</td>
                <td>{record.deviceDescription || "-"}</td>
                <td>{record.department || "-"}</td>
                <td>{record.project || "-"}</td>
                <td>{record.deviceCondition || "-"}</td>
                <td>Deployed</td>
                <td>{record.serialNumber || "-"}</td>
                <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    title="View accountability form"
                    aria-label="View accountability form"
                    onClick={() => handleViewAccountability(record)}
                  >
                    <ViewIcon />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11}>No IPAD records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewRecord && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={() => setPreviewRecord(null)}
        >
          <section
            className="history-modal ipad-accountability-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ipad-accountability-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="ipad-accountability-preview-title">Accountability Form Preview</h3>
                <p className="helper-text">
                  Viewing accountability record for {[previewRecord.firstName, previewRecord.middleName, previewRecord.lastName].filter(Boolean).join(" ") || previewRecord.empId || "selected user"}.
                </p>
              </div>
              <button
                type="button"
                className="ghost ipad-preview-close-btn"
                aria-label="Close accountability preview"
                title="Close"
                onClick={() => setPreviewRecord(null)}
              >
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M5 5 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="history-modal-body ipad-accountability-preview-body">
              <PrintableForm record={previewRecord} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
};
