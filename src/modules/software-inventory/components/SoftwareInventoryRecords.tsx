import { useMemo, useState } from "react";
import { SoftwareInventoryRecord } from "../types/softwareInventory";
import { DeleteIcon, EditIcon, PrintIcon, ViewIcon } from "../../../shared/components/ActionIcons";

interface SoftwareInventoryRecordsProps {
  records: SoftwareInventoryRecord[];
  loading: boolean;
  onEdit: (record: SoftwareInventoryRecord) => void;
  onDelete: (record: SoftwareInventoryRecord) => Promise<void>;
  onView: (record: SoftwareInventoryRecord) => void;
  onPrint: (record: SoftwareInventoryRecord) => void;
}

type SortKey = keyof SoftwareInventoryRecord;

interface GroupedSoftwareRow {
  key: string;
  baseRecord: SoftwareInventoryRecord;
  softwareNames: string[];
  licenseReferences: string[];
  searchBlob: string;
}

const toTime = (value?: string) => {
  const time = new Date(value ?? "").getTime();
  return Number.isNaN(time) ? 0 : time;
};

const groupSoftwareRows = (records: SoftwareInventoryRecord[]): GroupedSoftwareRow[] => {
  const groups = new Map<string, SoftwareInventoryRecord[]>();

  records.forEach((record, index) => {
    const groupKey = record.sourceAccountabilityRecordId
      ? `source:${record.sourceAccountabilityRecordId}`
      : `record:${record.id ?? index}`;

    const current = groups.get(groupKey) ?? [];
    current.push(record);
    groups.set(groupKey, current);
  });

  return Array.from(groups.entries()).map(([key, groupedRecords]) => {
    const sortedByNewest = [...groupedRecords].sort(
      (left, right) => toTime(right.updatedAt) - toTime(left.updatedAt)
    );
    const baseRecord = sortedByNewest[0];

    const softwarePairs = groupedRecords
      .map((record) => ({
        name: String(record.softwareName ?? "").trim(),
        license: String(record.licenseReference ?? "").trim()
      }))
      .filter((item) => item.name)
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

    const softwareNames = softwarePairs.map((item) => item.name);
    const licenseReferences = softwarePairs.map((item) => item.license);

    const searchBlob = [
      baseRecord.formNo,
      ...softwareNames,
      ...licenseReferences,
      baseRecord.assignedTo,
      baseRecord.employeeId,
      baseRecord.department,
      baseRecord.project,
      baseRecord.hostname,
      baseRecord.requestTicket
    ]
      .join(" ")
      .toLowerCase();

    return {
      key,
      baseRecord,
      softwareNames,
      licenseReferences,
      searchBlob
    };
  });
};

export const SoftwareInventoryRecords = ({
  records,
  loading,
  onEdit,
  onDelete,
  onView,
  onPrint
}: SoftwareInventoryRecordsProps) => {
  const groupedRows = useMemo(() => groupSoftwareRows(records), [records]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [ascending, setAscending] = useState(false);

  const options = useMemo(() => {
    const getUnique = (key: keyof SoftwareInventoryRecord) =>
      Array.from(
        new Set(groupedRows.map((item) => String(item.baseRecord[key] ?? "")).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

    return {
      statuses: getUnique("status"),
      departments: getUnique("department"),
      projects: getUnique("project")
    };
  }, [groupedRows]);

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();

    const base = groupedRows.filter((item) => {
      const bySearch = !lowered || item.searchBlob.includes(lowered);
      const byStatus = !status || item.baseRecord.status === status;
      const byDepartment = !department || item.baseRecord.department === department;
      const byProject = !project || item.baseRecord.project === project;

      return bySearch && byStatus && byDepartment && byProject;
    });

    return [...base].sort((a, b) => {
      const left =
        sortKey === "softwareName"
          ? a.softwareNames.join(" ").toLowerCase()
          : String(a.baseRecord[sortKey] ?? "").toLowerCase();
      const right =
        sortKey === "softwareName"
          ? b.softwareNames.join(" ").toLowerCase()
          : String(b.baseRecord[sortKey] ?? "").toLowerCase();
      const compared = left.localeCompare(right);
      return ascending ? compared : -compared;
    });
  }, [groupedRows, search, status, department, project, sortKey, ascending]);

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
            {filtered.map((row) => (
              <tr key={row.key}>
                <td>{row.baseRecord.formNo || "-"}</td>
                <td className="software-stack-cell">
                  {row.softwareNames.length > 0 ? (
                    <div className="software-stack">
                      {row.softwareNames.map((item, index) => (
                        <span className="software-stack-item" key={`${row.key}-software-${index}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="software-stack-cell">
                  {row.licenseReferences.some(Boolean) ? (
                    <div className="software-stack">
                      {row.licenseReferences.map((item, index) => (
                        <span className="software-stack-item" key={`${row.key}-license-${index}`}>
                          {item || "-"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{row.baseRecord.assignedTo}</td>
                <td>{row.baseRecord.status || "-"}</td>
                <td>{row.baseRecord.updatedAt ? new Date(row.baseRecord.updatedAt).toLocaleString() : "-"}</td>
                <td className="row-actions software-row-actions">
                  <button type="button" onClick={() => onView(row.baseRecord)} title="View" aria-label="View">
                    <ViewIcon />
                  </button>
                  <button type="button" onClick={() => onEdit(row.baseRecord)} title="Edit" aria-label="Edit">
                    <EditIcon />
                  </button>
                  <button type="button" className="ghost" onClick={() => void onDelete(row.baseRecord)} title="Delete" aria-label="Delete">
                    <DeleteIcon />
                  </button>
                  <button type="button" className="print" onClick={() => onPrint(row.baseRecord)} title="Print" aria-label="Print">
                    <PrintIcon />
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
