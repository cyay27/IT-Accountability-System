import { useMemo, useState } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";
import { DeliveryReceiptRecord } from "../../accountability/types/deliveryReceipt";

interface ITAssetInventoryProps {
  records: AccountabilityRecord[];
  newItemRecords: DeliveryReceiptRecord[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
}

const normalize = (value?: string) => String(value ?? "").trim().toLowerCase();
const DEFAULT_DEVICE_TYPES = ["Desktop", "Laptop", "Tablet", "Ipad", "Others", "Monitor"];
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
        (value) => Boolean(value) && !isRemovedProjectOption(String(value))
      ) ?? []
    );
  } catch {
    return [] as string[];
  }
};

export const ITAssetInventory = ({ records, newItemRecords, loading, onRefresh }: ITAssetInventoryProps) => {
  const [hostnameSearch, setHostnameSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || loading) {
      return;
    }

    try {
      setRefreshing(true);
      await Promise.resolve(onRefresh());
    } catch {
      window.alert("Unable to refresh records right now.");
    } finally {
      setRefreshing(false);
    }
  };

  const options = useMemo(() => {
    const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const deviceTypeOptions = unique([...DEFAULT_DEVICE_TYPES, ...records.map((item) => item.deviceType)]);
    const projectOptionsFromForm = readProjectOptionsFromEmployeeForm();

    return {
      status: unique(records.map((item) => item.deviceCondition)),
      deviceTypes: deviceTypeOptions,
      projects: unique([...records.map((item) => item.project), ...projectOptionsFromForm]).filter(
        (option) => !isRemovedProjectOption(option)
      )
    };
  }, [records]);

  const filtered = useMemo(() => {
    const hostname = normalize(hostnameSearch);
    const monitorFilterSelected = deviceTypeFilter.trim().toLowerCase() === "monitor";

    return records.filter((item) => {
      const byHostname = !hostname || normalize(item.hostname).includes(hostname);
      const byStatus = !statusFilter || item.deviceCondition === statusFilter;
      const hasMonitor = [item.monitorModel, item.monitorSerialNumber, item.monitorAssetNumber].some(
        (value) => String(value ?? "").trim() !== ""
      );
      const baseDeviceMatches = !deviceTypeFilter || item.deviceType === deviceTypeFilter;
      const monitorMatches = monitorFilterSelected && hasMonitor;
      const byDeviceType = baseDeviceMatches || monitorMatches;
      const byProject = !projectFilter || item.project === projectFilter;

      return byHostname && byStatus && byDeviceType && byProject;
    });
  }, [records, hostnameSearch, statusFilter, deviceTypeFilter, projectFilter]);

  const expandedRows = useMemo(() => {
    const monitorFilterSelected = deviceTypeFilter.trim().toLowerCase() === "monitor";

    return filtered.flatMap((record) => {
      const baseRow = {
        key: `${record.id ?? `${record.empId}-${record.hostname}`}-base`,
        hostname: record.hostname,
        employee: [record.firstName, record.lastName].filter(Boolean).join(" "),
        deviceType: record.deviceType || "-",
        status: record.deviceCondition || "-",
        deviceStatus: record.deviceStatus || "-",
        project: record.project || "-",
        serialNumber: record.serialNumber || "-",
        assetNumber: record.deviceAssetNumber || "-",
        updatedAt: record.updatedAt
      };

      const hasMonitor = [record.monitorModel, record.monitorSerialNumber, record.monitorAssetNumber].some(
        (value) => String(value ?? "").trim() !== ""
      );
      const monitorRow = hasMonitor
        ? {
            key: `${record.id ?? `${record.empId}-${record.hostname}`}-monitor`,
            hostname: record.monitorModel || "-",
            employee: [record.firstName, record.lastName].filter(Boolean).join(" "),
            deviceType: "Monitor",
            status: "-",
            deviceStatus: record.deviceStatus || "-",
            project: record.project || "-",
            serialNumber: record.monitorSerialNumber || "-",
            assetNumber: record.monitorAssetNumber || "-",
            updatedAt: record.updatedAt
          }
        : null;

      if (monitorFilterSelected) {
        return monitorRow ? [monitorRow] : [];
      }

      return monitorRow ? [baseRow, monitorRow] : [baseRow];
    });
  }, [filtered, deviceTypeFilter]);

  return (
    <section className="panel">
      <h2>IT Asset Inventory</h2>
      <p className="helper-text">Asset inventory view with quick filters and hostname search.</p>

      <div className="inventory-toolbar">
        <input
          value={hostnameSearch}
          onChange={(event) => setHostnameSearch(event.target.value)}
          placeholder="Search by hostname..."
        />

        <button
          type="button"
          className="ghost icon-button inventory-refresh-btn"
          onClick={() => void handleRefresh()}
          title="Refresh"
          aria-label="Refresh"
          disabled={loading || refreshing}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            aria-hidden="true"
            className={loading || refreshing ? "spin" : undefined}
          >
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All Status</option>
          {options.status.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select value={deviceTypeFilter} onChange={(event) => setDeviceTypeFilter(event.target.value)}>
          <option value="">All Device Types</option>
          {options.deviceTypes.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value="">All Projects</option>
          {options.projects.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <section className="inventory-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Employee</th>
                <th>Device Type</th>
                <th>Status</th>
                <th>Device Status</th>
                <th>Project</th>
                <th>Serial Number</th>
                <th>Asset Number</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {expandedRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.hostname}</td>
                  <td>{row.employee}</td>
                  <td>{row.deviceType}</td>
                  <td>{row.status}</td>
                  <td>{row.deviceStatus}</td>
                  <td>{row.project}</td>
                  <td>{row.serialNumber}</td>
                  <td>{row.assetNumber}</td>
                  <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {expandedRows.length === 0 && (
                <tr>
                  <td colSpan={9}>No assets found for current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && <p className="warning-text">Refreshing records...</p>}
      </section>

      <section className="inventory-table-card" style={{ marginTop: "0.85rem" }}>
        <h3 style={{ margin: "0 0 0.65rem", fontSize: "1rem", fontWeight: 700 }}>New Item Records</h3>
        <p className="helper-text" style={{ marginBottom: "0.75rem" }}>
          Data entered from the New Item module is listed here.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Purchase Number</th>
                <th>Supplier</th>
                <th>Delivery Date</th>
                <th>Item Description</th>
                <th>Warranty</th>
                <th>Other Details</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {newItemRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.invoiceNumber || "-"}</td>
                  <td>{record.purchaseNumber || "-"}</td>
                  <td>{record.supplier || "-"}</td>
                  <td>{record.deliveryDate || "-"}</td>
                  <td>{record.itemDescription || "-"}</td>
                  <td>{record.warranty || "-"}</td>
                  <td>{record.otherDetails || "-"}</td>
                  <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {newItemRecords.length === 0 && (
                <tr>
                  <td colSpan={8}>No New Item records found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
