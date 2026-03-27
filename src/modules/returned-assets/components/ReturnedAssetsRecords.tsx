import { useMemo, useState } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";
import { ReassignIcon } from "../../../shared/components/ActionIcons";

interface ReturnedAssetsRecordsProps {
  records: AccountabilityRecord[];
  onReassign: (record: AccountabilityRecord) => void;
}

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();
const PORTABLE_DEVICE_TYPES = new Set(["ipad", "tablet"]);

export const ReturnedAssetsRecords = ({ records, onReassign }: ReturnedAssetsRecordsProps) => {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.department).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = normalize(search);

    return records.filter((item) => {
      const searchable = [
        item.empId,
        item.firstName,
        item.middleName,
        item.lastName,
        item.department,
        item.project,
        item.deviceType,
        item.serialNumber,
        item.deviceAssetNumber,
        item.returnedDate
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchable.includes(lowered);
      const byDepartment = !departmentFilter || item.department === departmentFilter;

      return bySearch && byDepartment;
    });
  }, [records, search, departmentFilter]);

  const getReturnedStatus = (record: AccountabilityRecord) => {
    const normalized = (record.deviceStatus ?? "").trim().toLowerCase();
    if (normalized === "defective") {
      return "Defective";
    }

    if (normalized === "deployed") {
      return "Deployed";
    }

    return "Available";
  };

  return (
    <section className="panel">
      <h2>Returned Assets</h2>

      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by employee, serial, asset number, project..."
        />

        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option value="">All Departments</option>
          {departmentOptions.map((department) => (
            <option key={department} value={department}>
              {department}
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
              <th>Department</th>
              <th>Project</th>
              <th>Device Type</th>
              <th>Serial Number</th>
              <th>Asset Number</th>
              <th>Returned On</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id ?? `${record.empId}-${record.serialNumber}`}>
                  <td>{record.empId || "-"}</td>
                  <td>{[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ") || "-"}</td>
                  <td>{record.department || "-"}</td>
                  <td>{record.project || "-"}</td>
                  <td>{record.deviceType || "-"}</td>
                  <td>{record.serialNumber || "-"}</td>
                  <td>
                    {PORTABLE_DEVICE_TYPES.has((record.deviceType || "").trim().toLowerCase())
                      ? "-"
                      : record.deviceAssetNumber || "-"}
                  </td>
                  <td>{record.returnedDate || "-"}</td>
                  <td>{getReturnedStatus(record)}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="ghost"
                      title="Edit or reassign returned asset"
                      aria-label="Edit or reassign returned asset"
                      onClick={() => onReassign(record)}
                    >
                      <ReassignIcon />
                    </button>
                  </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={10}>No returned assets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
