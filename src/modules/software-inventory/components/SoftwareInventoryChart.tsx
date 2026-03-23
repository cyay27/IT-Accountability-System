import { useMemo } from "react";
import { SoftwareInventoryRecord } from "../types/softwareInventory";

interface SoftwareInventoryChartProps {
  records: SoftwareInventoryRecord[];
}

const COLOR_PALETTE = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
  "#f97316",
  "#14b8a6"
];

const colorFromLabel = (label: string) => {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return "#6b7280";

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
};

export const SoftwareInventoryChart = ({ records }: SoftwareInventoryChartProps) => {
  const chart = useMemo(() => {
    const counts = new Map<string, number>();

    records.forEach((item) => {
      const key = item.softwareName?.trim() || "Unspecified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const rows = Array.from(counts.entries())
      .map(([label, value]) => ({
        label,
        value,
        color: colorFromLabel(label)
      }))
      .sort((a, b) => b.value - a.value);

    const total = rows.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
      return {
        rows,
        total,
        pie: "conic-gradient(#e5e7eb 0deg 360deg)"
      };
    }

    let current = 0;
    const segments = rows.map((item) => {
      const start = current;
      const angle = (item.value / total) * 360;
      const end = start + angle;
      current = end;
      return `${item.color} ${start}deg ${end}deg`;
    });

    return {
      rows,
      total,
      pie: `conic-gradient(${segments.join(", ")})`
    };
  }, [records]);

  return (
    <section className="panel">
      <h2>Software Chart</h2>
      <p className="helper-text">Color-coded distribution by software name.</p>

      <div className="inventory-pie-layout">
        <div className="inventory-pie-wrap">
          <div
            className="inventory-pie"
            style={{ backgroundImage: chart.pie }}
            aria-label="Software inventory distribution"
          />
          <div className="inventory-pie-center">
            <strong>{chart.total}</strong>
            <span>Total</span>
          </div>
        </div>

        <div className="inventory-pie-legend">
          {chart.rows.length === 0 ? (
            <p className="helper-text">No chart data available.</p>
          ) : (
            chart.rows.map((item) => (
              <div key={item.label} className="inventory-legend-item">
                <span
                  className="inventory-legend-swatch"
                  style={{ backgroundColor: item.color }}
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
