import { LicenseMaintenanceRecord } from "../types/licenseMaintenance";

interface LicenseMaintenanceViewProps {
  record: LicenseMaintenanceRecord | null;
}

const rows: Array<{ key: keyof LicenseMaintenanceRecord; label: string }> = [
  { key: "softwareName", label: "Software Name" },
  { key: "vendor", label: "Vendor" },
  { key: "quantity", label: "Quantity" },
  { key: "date", label: "Date" },
  { key: "productType", label: "Product Type" },
  { key: "productKey", label: "Product Key" },
  { key: "proofOfPurchaseName", label: "Proof of Purchase" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" }
];

export const LicenseMaintenanceView = ({ record }: LicenseMaintenanceViewProps) => {
  if (!record) {
    return (
      <section className="panel">
        <h2>License Details</h2>
        <p className="helper-text">Select a license record and click View.</p>
      </section>
    );
  }

  return (
    <section className="panel print-shell">
      <h2>License Details</h2>

      <table className="pf-table" style={{ marginTop: "8px" }}>
        <tbody>
          {rows.map((row) => {
            const rawValue = record[row.key];
            const value = String(rawValue ?? "").trim();
            const isProductKeyHidden = row.key === "productKey" && record.productType !== "Product Key";

            return (
              <tr key={row.key}>
                <td className="pf-lbl" style={{ width: "35%" }}>
                  {row.label}
                </td>
                <td className="pf-val">{isProductKeyHidden ? "Not applicable" : value || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="helper-text" style={{ marginTop: "10px" }}>
        Expiration tracking and assignment mapping can be added in future updates.
      </p>
    </section>
  );
};
