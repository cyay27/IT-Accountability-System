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
  viewMode?: "records" | "status";
}

type SortKey = keyof LicenseMaintenanceRecord;

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();

const getDerivedRenewalStatus = (record: LicenseMaintenanceRecord) => {
  const explicitStatus = normalize(record.renewalStatus);
  if (explicitStatus === "active" || explicitStatus === "expired" || explicitStatus === "for renewal") {
    return record.renewalStatus;
  }

  if (!record.expirationDate.trim()) {
    return "";
  }

  const parsedExpiration = new Date(record.expirationDate);
  if (Number.isNaN(parsedExpiration.getTime())) {
    return "";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedExpiration.setHours(0, 0, 0, 0);

  if (parsedExpiration < today) {
    return "Expired";
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiration = Math.ceil((parsedExpiration.getTime() - today.getTime()) / msPerDay);
  if (daysUntilExpiration <= 30) {
    return "For Renewal";
  }

  return "Active";
};

export const LicenseMaintenanceRecords = ({
  records,
  softwareRecords,
  loading,
  onView,
  onEdit,
  onDelete,
  viewMode = "records"
}: LicenseMaintenanceRecordsProps) => {
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");
  const [productType, setProductType] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [ascending, setAscending] = useState(false);

  const toBadgeClass = (status?: string) => {
    const normalized = normalize(status);
    if (normalized === "active") return "license-renewal-badge active";
    if (normalized === "expired") return "license-renewal-badge expired";
    if (normalized === "for renewal") return "license-renewal-badge renewal";
    return "license-renewal-badge";
  };

  const isPreviewable = (mimeType?: string) => {
    const normalized = String(mimeType ?? "").toLowerCase();
    return normalized.startsWith("image/") || normalized === "application/pdf";
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const parts = dataUrl.split(",");
    if (parts.length < 2) {
      return null;
    }

    const meta = parts[0];
    const base64 = parts.slice(1).join(",");
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || "application/octet-stream";

    try {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type: mimeType });
    } catch {
      return null;
    }
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      window.alert("Unable to download document. The file data is missing or invalid.");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  const previewDataUrl = (dataUrl: string, fileName: string, mimeType?: string) => {
    if (!String(dataUrl).trim()) {
      window.alert("Unable to open document. No file data was saved for this record.");
      return;
    }

    if (!isPreviewable(mimeType)) {
      downloadDataUrl(dataUrl, fileName);
      return;
    }

    const blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      window.alert("Unable to preview document. The file data is invalid.");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(objectUrl);
      window.alert("Unable to open document preview. Please allow pop-ups.");
      return;
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };

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
    const renewalStatuses = Array.from(
      new Set(records.map((item) => getDerivedRenewalStatus(item)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return { vendors, productTypes, renewalStatuses };
  }, [records]);

  const statusCounts = useMemo(() => {
    const counts = records.reduce(
      (accumulator, record) => {
        const normalized = normalize(getDerivedRenewalStatus(record));
        if (normalized === "active") {
          accumulator.active += 1;
        } else if (normalized === "expired") {
          accumulator.expired += 1;
        } else if (normalized === "for renewal") {
          accumulator.forRenewal += 1;
        }
        return accumulator;
      },
      { active: 0, expired: 0, forRenewal: 0 }
    );

    return counts;
  }, [records]);

  const filtered = useMemo(() => {
    const lowered = normalize(search);

    const base = records.filter((record) => {
      const searchBlob = [
        record.softwareName,
        record.vendor,
        record.productType,
        record.productKey,
        record.contractOrPoNumber,
        record.expirationDate,
        getDerivedRenewalStatus(record),
        record.poAttachment?.name,
        record.contractAttachment?.name
      ]
        .join(" ")
        .toLowerCase();

      const bySearch = !lowered || searchBlob.includes(lowered);
      const byVendor = !vendor || record.vendor === vendor;
      const byProductType = !productType || record.productType === productType;
      const byRenewalStatus = !renewalStatus || getDerivedRenewalStatus(record) === renewalStatus;

      return bySearch && byVendor && byProductType && byRenewalStatus;
    });

    return [...base].sort((left, right) => {
      const leftValue =
        sortKey === "renewalStatus"
          ? normalize(getDerivedRenewalStatus(left))
          : normalize(String(left[sortKey] ?? ""));
      const rightValue =
        sortKey === "renewalStatus"
          ? normalize(getDerivedRenewalStatus(right))
          : normalize(String(right[sortKey] ?? ""));
      const compared = leftValue.localeCompare(rightValue);
      return ascending ? compared : -compared;
    });
  }, [records, search, vendor, productType, renewalStatus, sortKey, ascending]);

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
      <h2>{viewMode === "status" ? "License Status" : "License Maintenance Records"}</h2>
      <p className="helper-text">
        {viewMode === "status"
          ? "Review licenses by renewal state: Active, Expired, or For Renewal."
          : "Search and filter by software, vendor, or product type."}
      </p>

      {viewMode === "status" && (
        <div className="status-summary-grid">
          <div className="status-summary-card">
            <span className="license-renewal-badge active">Active</span>
            <strong>{statusCounts.active}</strong>
          </div>
          <div className="status-summary-card">
            <span className="license-renewal-badge expired">Expired</span>
            <strong>{statusCounts.expired}</strong>
          </div>
          <div className="status-summary-card">
            <span className="license-renewal-badge renewal">For Renewal</span>
            <strong>{statusCounts.forRenewal}</strong>
          </div>
        </div>
      )}

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

        <select value={renewalStatus} onChange={(event) => setRenewalStatus(event.target.value)}>
          <option value="">{viewMode === "status" ? "All Statuses" : "All Renewal Statuses"}</option>
          {options.renewalStatuses.map((option) => (
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
                <button type="button" onClick={() => toggleSort("contractOrPoNumber")}>Contract / PO</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("expirationDate")}>Expiration Date</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("renewalStatus")}>Status</button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("productType")}>Product Type</button>
              </th>
              <th>Documents</th>
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
                <td>{record.contractOrPoNumber || "-"}</td>
                <td>{record.expirationDate || "-"}</td>
                <td>
                  <span className={toBadgeClass(getDerivedRenewalStatus(record))}>
                    {getDerivedRenewalStatus(record) || "-"}
                  </span>
                </td>
                <td>{record.productType || "-"}</td>
                <td>
                  <div className="license-doc-links">
                    {record.poAttachment?.dataUrl ? (
                      <button
                        type="button"
                        className="doc-link-btn"
                        onClick={() =>
                          previewDataUrl(
                            record.poAttachment?.dataUrl || "",
                            record.poAttachment?.name || "PO file",
                            record.poAttachment?.type
                          )
                        }
                      >
                        PO
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                    {record.contractAttachment?.dataUrl ? (
                      <button
                        type="button"
                        className="doc-link-btn"
                        onClick={() =>
                          previewDataUrl(
                            record.contractAttachment?.dataUrl || "",
                            record.contractAttachment?.name || "Contract file",
                            record.contractAttachment?.type
                          )
                        }
                      >
                        Contract
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </td>
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
                <td colSpan={12}>{loading ? "Loading records..." : "No license records found."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
