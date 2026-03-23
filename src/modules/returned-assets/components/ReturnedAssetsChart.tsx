import { useMemo } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface ReturnedAssetsChartProps {
  records: AccountabilityRecord[];
}

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#7c3aed",
  "#0ea5e9",
  "#14b8a6",
  "#6b7280"
];

export const ReturnedAssetsChart = ({ records }: ReturnedAssetsChartProps) => {
  const chartData = useMemo(() => {
    const total = records.length;
    const byDeviceType = new Map<string, number>();

    records.forEach((record) => {
      const key = record.deviceType?.trim() || "Unspecified";
      byDeviceType.set(key, (byDeviceType.get(key) ?? 0) + 1);
    });

    const rows = Array.from(byDeviceType.entries())
      .map(([label, value], index) => ({
        label,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length]
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

    const pie =
      total === 0
        ? "conic-gradient(#e5e7eb 0deg 360deg)"
        : `conic-gradient(${segments.join(", ")})`;

    return { total, rows, pie };
  }, [records]);

  return (
    <section className="panel">
      <h2>Returned Assets Availability Chart</h2>
      <p className="helper-text">
        Device type distribution for returned assets currently available for deployment.
      </p>

      <table className="pf-table" style={{ marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td className="pf-lbl" style={{ width: "30%" }}>Total Available Devices</td>
            <td className="pf-val">{chartData.total}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "14px", alignItems: "start" }}>
        <div
          style={{
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            backgroundImage: chartData.pie,
            border: "1px solid #d1d5db",
            margin: "0 auto"
          }}
          aria-label="Returned assets by device type pie chart"
        />

        <div style={{ display: "grid", gap: "7px" }}>
          {chartData.rows.length === 0 ? (
            <p className="helper-text" style={{ margin: 0 }}>No returned assets available yet.</p>
          ) : (
            chartData.rows.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px 1fr auto",
                  alignItems: "center",
                  gap: "8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "13px"
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
    </section>
  );
};
