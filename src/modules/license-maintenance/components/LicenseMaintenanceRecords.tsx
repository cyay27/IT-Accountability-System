import { useMemo, useState } from "react";
import { LicenseMaintenanceRecord } from "../types/licenseMaintenance";
import { SoftwareInventoryRecord } from "../../software-inventory/types/softwareInventory";
import { DeleteIcon, EditIcon, ViewIcon } from "../../../shared/components/ActionIcons";

interface LicenseMaintenanceRecordsProps {
  records: LicenseMaintenanceRecord[];
  softwareRecords: SoftwareInventoryRecord[];
  loading: boolean;
  onView: (record: LicenseMaintenanceRecord) => void;
  onEdit: (record: LicenseMaintenanceRecord) => void;
  onDelete: (record: LicenseMaintenanceRecord) => Promise<void>;
}

type SortKey = keyof LicenseMaintenanceRecord;

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();

export const LicenseMaintenanceRecords = ({
  records,
  softwareRecords,
  loading,
  onView,
  onEdit,
  onDelete
}: LicenseMaintenanceRecordsProps) => {
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");
  const [productType, setProductType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [ascending, setAscending] = useState(false);

  // Calculate used quantities per software name
  const usedByName = useMemo(() => {
    const used: Record<string, number> = {};
    softwareRecords.forEach((record) => {
      const seatsUsed = parseInt(record.seatsUsed || "0", 10) || 0;
      used[record.softwareName] = (used[record.softwareName] || 0) + seatsUsed;
    });
    return used;
  }, [softwareRecords]);

  const options = useMemo(() => {
    const vendors = Array.from(new Set(records.map((item) => item.vendor).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    const productTypes = Array.from(
      new Set(records.map((item) => item.productType).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return { vendors, productTypes };
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = normalize(search);

    const base = records.filter((record) => {
      const searchBlob = [record.softwareName, record.vendor, record.productType, record.productKey]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchBlob.includes(lowered);
      const byVendor = !vendor || record.vendor === vendor;
      const byProductType = !productType || record.productType === productType;

      return bySearch && byVendor && byProductType;
    });

    return [...base].sort((left, right) => {
      const leftValue = normalize(String(left[sortKey] ?? ""));
      const rightValue = normalize(String(right[sortKey] ?? ""));
      const compared = leftValue.localeCompare(rightValue);
      return ascending ? compared : -compared;
    });
  }, [records, search, vendor, productType, sortKey, ascending]);

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
      <h2>License Maintenance Records</h2>
      <p className="helper-text">Search and filter by software, vendor, or product type.</p>

      <div className="filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search software, vendor, type, or key..."
        />

        <select value={vendor} onChange={(event) => setVendor(event.target.value)}>
          <option value="">All Vendors</option>
          {options.vendors.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={productType} onChange={(event) => setProductType(event.target.value)}>
          <option value="">All Product Types</option>
          {options.productTypes.map((option) => (
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
                <button type="button" onClick={() => toggleSort("softwareName")}>Software Name</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("vendor")}>Vendor</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("quantity")}>Available Quantity</button>
              </th>
              <th>Used</th>
              <th>
                <button type="button" onClick={() => toggleSort("date")}>Date</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("productType")}>Product Type</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("updatedAt")}>Updated</button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id ?? `${record.softwareName}-${record.vendor}-${record.date}`}>
                <td>{record.softwareName || "-"}</td>
                <td>{record.vendor || "-"}</td>
                <td>{record.quantity || "-"}</td>
                <td>{usedByName[record.softwareName] || 0}</td>
                <td>{record.date || "-"}</td>
                <td>{record.productType || "-"}</td>
                <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                <td className="row-actions">
                  <button type="button" onClick={() => onView(record)} title="View" aria-label="View">
                    <ViewIcon />
                  </button>
                  <button type="button" onClick={() => onEdit(record)} title="Edit" aria-label="Edit">
                    <EditIcon />
                  </button>
                  <button type="button" className="ghost" onClick={() => void onDelete(record)} title="Delete" aria-label="Delete">
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>{loading ? "Loading records..." : "No license records found."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
