import { useMemo, useState } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface IPadInventoryProps {
  records: AccountabilityRecord[];
}

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();

export const IPadInventory = ({ records }: IPadInventoryProps) => {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

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
              <th>Department</th>
              <th>Project</th>
              <th>Device Condition</th>
              <th>Status</th>
              <th>Serial Number</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id ?? `${record.empId}-${record.hostname}`}>
                <td>{record.empId}</td>
                <td>{[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")}</td>
                <td>{record.department || "-"}</td>
                <td>{record.project || "-"}</td>
                <td>{record.deviceCondition || "-"}</td>
                <td>Deployed</td>
                <td>{record.serialNumber || "-"}</td>
                <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>No IPAD records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
