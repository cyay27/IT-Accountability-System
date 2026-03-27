import { useMemo, useState } from "react";
import { DisposalRecord } from "../types/disposal";
import { DeleteIcon, EditIcon, PrintIcon, ViewIcon } from "../../../shared/components/ActionIcons";

interface DisposalRecordsProps {
  records: DisposalRecord[];
  onEdit: (record: DisposalRecord) => void;
  onDelete: (record: DisposalRecord) => void;
  onView: (record: DisposalRecord) => void;
  onPrint: (record: DisposalRecord) => void;
}

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();

export const DisposalRecords = ({ records, onEdit, onDelete, onView, onPrint }: DisposalRecordsProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statusOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.status).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = normalize(search);

    return records.filter((item) => {
      const searchable = [
        item.disposalNo,
        item.deviceType,
        item.serialNumber,
        item.assetNumber,
        item.disposalReason,
        item.status
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchable.includes(lowered);
      const byStatus = !statusFilter || item.status === statusFilter;
      return bySearch && byStatus;
    });
  }, [records, search, statusFilter]);

  return (
    <section className="panel">
      <h2>Disposal Records</h2>
      <p className="helper-text">Track disposal requests, approvals, and final disposal status.</p>

      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by UMAC no, device, serial..."
        />

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>UMAC No.</th>
              <th>Department</th>
              <th>Device Type</th>
              <th>Serial Number</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested Date</th>
              <th>Disposal Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id}>
                <td>{record.disposalNo || "-"}</td>
                <td>{record.department || "-"}</td>
                <td>{record.deviceType || "-"}</td>
                <td>{record.serialNumber || "-"}</td>
                <td>{record.disposalReason || "-"}</td>
                <td>{record.status || "-"}</td>
                <td>{record.requestedDate || "-"}</td>
                <td>{record.disposalDate || "-"}</td>
                <td className="row-actions">
                  <button type="button" onClick={() => onView(record)} title="View" aria-label="View">
                    <ViewIcon />
                  </button>
                  <button type="button" onClick={() => onEdit(record)} title="Edit" aria-label="Edit">
                    <EditIcon />
                  </button>
                  <button type="button" className="ghost" onClick={() => onDelete(record)} title="Delete" aria-label="Delete">
                    <DeleteIcon />
                  </button>
                  <button type="button" className="print" onClick={() => onPrint(record)} title="Print" aria-label="Print">
                    <PrintIcon />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9}>No disposal records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
