import { forwardRef, useMemo } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface ITAssetInventoryPrintableProps {
  records: AccountabilityRecord[];
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#2563eb",
  laptop: "#10b981",
  tablet: "#f59e0b",
  "mobile phone": "#ec4899",
  others: "#8b5cf6",
  unspecified: "#6b7280"
};

const getDeviceColor = (label: string) => DEVICE_COLORS[label.trim().toLowerCase()] ?? "#0ea5e9";

export const ITAssetInventoryPrintable = forwardRef<
  HTMLDivElement,
  ITAssetInventoryPrintableProps
>(({ records }, ref) => {
  const totals = useMemo(() => {
    const total = records.length;
    const byType = new Map<string, number>();

    records.forEach((item) => {
      const key = item.deviceType?.trim() || "Unspecified";
      byType.set(key, (byType.get(key) ?? 0) + 1);
    });

    const rows = Array.from(byType.entries())
      .map(([label, value]) => ({
        label,
        value,
        color: getDeviceColor(label)
      }))
      .sort((a, b) => b.value - a.value);

    let current = 0;
    const segments = rows.map((item) => {
      const start = current;
      const angle = total === 0 ? 0 : (item.value / total) * 360;
      const end = start + angle;
      current = end;
      return `${item.color} ${start}deg ${end}deg`;
    });

    return {
      total,
      byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]),
      rows,
      pie: total === 0 ? "conic-gradient(#e5e7eb 0deg 360deg)" : `conic-gradient(${segments.join(", ")})`
    };
  }, [records]);

  return (
    <section className="panel print-shell">
      <h2 className="no-print">IT Asset Inventory Printable</h2>

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
              <h1>IT ASSET INVENTORY FORM</h1>
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
              <td className="pf-lbl" style={{ width: "25%" }}>Total Assets</td>
              <td className="pf-val">{totals.total}</td>
            </tr>
          </tbody>
        </table>

        <table className="pf-table" style={{ marginTop: "8px" }}>
          <thead>
            <tr>
              <th className="pf-th">Hostname</th>
              <th className="pf-th">Employee</th>
              <th className="pf-th">Type</th>
              <th className="pf-th">Condition</th>
              <th className="pf-th">Project</th>
              <th className="pf-th">Serial No.</th>
              <th className="pf-th">Asset No.</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id ?? `${record.empId}-${record.hostname}`}>
                <td className="pf-val">{record.hostname || "-"}</td>
                <td className="pf-val">
                  {[record.firstName, record.lastName].filter(Boolean).join(" ") || "-"}
                </td>
                <td className="pf-val">{record.deviceType || "-"}</td>
                <td className="pf-val">{record.deviceCondition || "-"}</td>
                <td className="pf-val">{record.project || "-"}</td>
                <td className="pf-val">{record.serialNumber || "-"}</td>
                <td className="pf-val">{record.deviceAssetNumber || "-"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td className="pf-val" colSpan={7}>No asset inventory records found.</td>
              </tr>
            )}
          </tbody>
        </table>

        <section style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "fit-content", maxWidth: "100%" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 600, textAlign: "right" }}>
              Asset Distribution by Device Type
            </p>
            <div
              style={{
                display: "inline-grid",
                gridTemplateColumns: "160px max-content",
                gap: "12px",
                alignItems: "start",
                width: "fit-content",
                maxWidth: "100%"
              }}
            >
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  borderRadius: "999px",
                  backgroundImage: totals.pie,
                  border: "1px solid #d1d5db",
                  margin: "0 auto"
                }}
                aria-label="Asset type distribution pie chart"
              />

              <div style={{ display: "grid", gap: "6px", width: "max-content", maxWidth: "100%" }}>
                {totals.rows.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "12px" }}>No chart data available.</p>
                ) : (
                  totals.rows.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "12px 1fr auto",
                        alignItems: "center",
                        gap: "8px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "12px"
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "2px",
                          backgroundColor: item.color,
                          display: "inline-block"
                        }}
                      />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
});

ITAssetInventoryPrintable.displayName = "ITAssetInventoryPrintable";
