import { useMemo, useState } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface ITAssetChartProps {
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

export const ITAssetChart = ({ records }: ITAssetChartProps) => {
  const [projectFilter, setProjectFilter] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("");

  const projectOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.project).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const deviceTypeOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.deviceType).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const byProject = !projectFilter || item.project === projectFilter;
      const byDeviceType = !deviceTypeFilter || item.deviceType === deviceTypeFilter;
      return byProject && byDeviceType;
    });
  }, [records, projectFilter, deviceTypeFilter]);

  const chart = useMemo(() => {
    const counts = new Map<string, number>();

    filteredRecords.forEach((item) => {
      const key = item.deviceType?.trim() || "Unspecified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const rows = Array.from(counts.entries())
      .map(([label, value]) => ({
        label,
        value,
        color: getDeviceColor(label)
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
  }, [filteredRecords]);

  return (
    <section className="panel">
      <div className="inventory-chart-header">
        <div>
          <h2>Asset Chart</h2>
          <p className="helper-text">Pie chart distribution by device type.</p>
        </div>

        <div className="inventory-chart-filter">
          <div className="inventory-chart-filter-control">
            <span className="inventory-chart-filter-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16l-6.5 7.1V18l-3 1.8v-6.7L4 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="">All Projects</option>
              {projectOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="inventory-chart-filter-control">
            <span className="inventory-chart-filter-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16l-6.5 7.1V18l-3 1.8v-6.7L4 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <select value={deviceTypeFilter} onChange={(event) => setDeviceTypeFilter(event.target.value)}>
              <option value="">All Device Types</option>
              {deviceTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="inventory-pie-layout">
        <div className="inventory-pie-wrap">
          <div className="inventory-pie" style={{ backgroundImage: chart.pie }} aria-label="Asset device type distribution" />
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
                <span className="inventory-legend-swatch" style={{ backgroundColor: item.color }} />
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
