import { forwardRef, useMemo } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface IPadInventoryPrintableProps {
  records: AccountabilityRecord[];
}

export const IPadInventoryPrintable = forwardRef<
  HTMLDivElement,
  IPadInventoryPrintableProps
>(({ records }, ref) => {
  const totals = useMemo(() => {
    const total = records.length;
    return { total };
  }, [records]);

  return (
    <section className="panel print-shell">
      <h2 className="no-print">IPAD Inventory Printable</h2>

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
              <h1>IPAD INVENTORY FORM</h1>
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
              <td className="pf-lbl" style={{ width: "25%" }}>Total IPAD Devices</td>
              <td className="pf-val">{totals.total}</td>
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
              <th className="pf-th">Device Condition</th>
              <th className="pf-th">Status</th>
              <th className="pf-th">Serial Number</th>
              <th className="pf-th">Updated</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id ?? `${record.empId}-${record.serialNumber}`}>
                <td className="pf-val">{record.empId || "-"}</td>
                <td className="pf-val">
                  {[record.firstName, record.lastName].filter(Boolean).join(" ") || "-"}
                </td>
                <td className="pf-val">{record.department || "-"}</td>
                <td className="pf-val">{record.project || "-"}</td>
                <td className="pf-val">{record.deviceCondition || "-"}</td>
                <td className="pf-val">Deployed</td>
                <td className="pf-val">{record.serialNumber || "-"}</td>
                <td className="pf-val">{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td className="pf-val" colSpan={8}>No IPAD inventory records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});

IPadInventoryPrintable.displayName = "IPadInventoryPrintable";
