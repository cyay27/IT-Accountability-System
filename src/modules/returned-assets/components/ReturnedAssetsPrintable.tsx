import { forwardRef } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface ReturnedAssetsPrintableProps {
  records: AccountabilityRecord[];
}

const PORTABLE_DEVICE_TYPES = new Set(["ipad", "tablet"]);

export const ReturnedAssetsPrintable = forwardRef<HTMLDivElement, ReturnedAssetsPrintableProps>(
  ({ records }, ref) => {
    return (
      <section className="panel print-shell">
        <h2 className="no-print">Returned Assets Printable</h2>

        <div className="print-form" ref={ref}>
          <header className="print-header">
            <div className="print-header-main">
              <div className="print-logo-wrap">
                <img
                  src="/assets/mdclogo.png?v=20260319"
                  alt="MDC Logo"
                  className="print-logo"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="print-header-copy">
                <h1>RETURNED ASSETS AVAILABILITY FORM</h1>
                <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
                <p>
                  Generated on {new Date().toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
            </div>
          </header>

          <table className="pf-table" style={{ marginTop: "8px" }}>
            <tbody>
              <tr>
                <td className="pf-lbl" style={{ width: "25%" }}>Total Available Assets</td>
                <td className="pf-val">{records.length}</td>
              </tr>
            </tbody>
          </table>

          <table className="pf-table" style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th className="pf-th">Emp ID</th>
                <th className="pf-th">Employee</th>
                <th className="pf-th">Department</th>
                <th className="pf-th">Project</th>
                <th className="pf-th">Device Type</th>
                <th className="pf-th">Serial Number</th>
                <th className="pf-th">Asset Number</th>
                <th className="pf-th">Returned On</th>
                <th className="pf-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id ?? `${record.empId}-${record.serialNumber}`}>
                  <td className="pf-val">{record.empId || "-"}</td>
                  <td className="pf-val">
                    {[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="pf-val">{record.department || "-"}</td>
                  <td className="pf-val">{record.project || "-"}</td>
                  <td className="pf-val">{record.deviceType || "-"}</td>
                  <td className="pf-val">{record.serialNumber || "-"}</td>
                  <td className="pf-val">
                    {PORTABLE_DEVICE_TYPES.has((record.deviceType || "").trim().toLowerCase())
                      ? "-"
                      : record.deviceAssetNumber || "-"}
                  </td>
                  <td className="pf-val">{record.returnedDate || "-"}</td>
                  <td className="pf-val">Available</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td className="pf-val" colSpan={9}>No returned assets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
);

ReturnedAssetsPrintable.displayName = "ReturnedAssetsPrintable";
