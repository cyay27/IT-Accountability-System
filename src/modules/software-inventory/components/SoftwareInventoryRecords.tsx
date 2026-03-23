import { useMemo, useState } from "react";
import { SoftwareInventoryRecord } from "../types/softwareInventory";

interface SoftwareInventoryRecordsProps {
  records: SoftwareInventoryRecord[];
  loading: boolean;
  onEdit: (record: SoftwareInventoryRecord) => void;
  onDelete: (record: SoftwareInventoryRecord) => Promise<void>;
  onView: (record: SoftwareInventoryRecord) => void;
  onPrint: (record: SoftwareInventoryRecord) => void;
}

type SortKey = keyof SoftwareInventoryRecord;

export const SoftwareInventoryRecords = ({
  records,
  loading,
  onEdit,
  onDelete,
  onView,
  onPrint
}: SoftwareInventoryRecordsProps) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [ascending, setAscending] = useState(false);

  const options = useMemo(() => {
    const getUnique = (key: keyof SoftwareInventoryRecord) =>
      Array.from(
        new Set(records.map((item) => String(item[key] ?? "")).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

    return {
      statuses: getUnique("status"),
      departments: getUnique("department"),
      projects: getUnique("project")
    };
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();

    const base = records.filter((item) => {
      const searchable = [
        item.formNo,
        item.softwareName,
        item.licenseReference,
        item.assignedTo,
        item.employeeId,
        item.department,
        item.project,
        item.hostname,
        item.requestTicket
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchable.includes(lowered);
      const byStatus = !status || item.status === status;
      const byDepartment = !department || item.department === department;
      const byProject = !project || item.project === project;

      return bySearch && byStatus && byDepartment && byProject;
    });

    return [...base].sort((a, b) => {
      const left = String(a[sortKey] ?? "").toLowerCase();
      const right = String(b[sortKey] ?? "").toLowerCase();
      const compared = left.localeCompare(right);
      return ascending ? compared : -compared;
    });
  }, [records, search, status, department, project, sortKey, ascending]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setAscending((prev) => !prev);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  return (
    <section className="panel">
      <h2>Software Inventory Records</h2>
      <p className="helper-text">Generated forms are ready for print per record.</p>

      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search software, assignee, license, ticket..."
        />

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All Status</option>
          {options.statuses.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">All Departments</option>
          {options.departments.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">All Projects</option>
          {options.projects.map((option) => (
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
              <th>
                <button type="button" onClick={() => toggleSort("formNo")}>
                  Form No.
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("softwareName")}>
                  Software
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("licenseReference")}>
                  License Ref
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("assignedTo")}>
                  Assigned To
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("status")}>
                  Status
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("updatedAt")}>
                  Updated
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id}>
                <td>{record.formNo || "-"}</td>
                <td>{record.softwareName}</td>
                <td>{record.licenseReference}</td>
                <td>{record.assignedTo}</td>
                <td>{record.status || "-"}</td>
                <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                <td className="row-actions">
                  <button type="button" onClick={() => onView(record)}>
                    View
                  </button>
                  <button type="button" onClick={() => onEdit(record)}>
                    Edit
                  </button>
                  <button type="button" className="ghost" onClick={() => void onDelete(record)}>
                    Delete
                  </button>
                  <button type="button" className="print" onClick={() => onPrint(record)}>
                    Print
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>{loading ? "Loading records..." : "No software forms found."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
