import { LicenseMaintenanceRecord } from "../types/licenseMaintenance";

interface LicenseMaintenanceViewProps {
  record: LicenseMaintenanceRecord | null;
}

const rows: Array<{ key: keyof LicenseMaintenanceRecord; label: string }> = [
  { key: "softwareName", label: "Software Name" },
  { key: "vendor", label: "Vendor" },
  { key: "quantity", label: "Quantity" },
  { key: "date", label: "Date" },
  { key: "contractOrPoNumber", label: "Contract Number / PO" },
  { key: "purchaseMonthYear", label: "Month/Year of Purchase" },
  { key: "expirationDate", label: "Expiration Date" },
  { key: "renewalStatus", label: "Renewal Status" },
  { key: "productType", label: "Product Type" },
  { key: "productKey", label: "Product Key" },
  { key: "proofOfPurchaseName", label: "Proof of Purchase" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" }
];

export const LicenseMaintenanceView = ({ record }: LicenseMaintenanceViewProps) => {
  const renewalBadgeClass = (() => {
    const normalized = String(record?.renewalStatus ?? "").trim().toLowerCase();
    if (normalized === "active") return "license-renewal-badge active";
    if (normalized === "expired") return "license-renewal-badge expired";
    if (normalized === "for renewal") return "license-renewal-badge renewal";
    return "license-renewal-badge";
  })();

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
            const isRenewalStatus = row.key === "renewalStatus";

            let renderedValue: string | JSX.Element = isProductKeyHidden ? "Not applicable" : value || "-";

            if (isRenewalStatus) {
              renderedValue = <span className={renewalBadgeClass}>{value || "-"}</span>;
            }

            return (
              <tr key={row.key}>
                <td className="pf-lbl" style={{ width: "35%" }}>
                  {row.label}
                </td>
                <td className="pf-val">{renderedValue}</td>
              </tr>
            );
          })}

          <tr>
            <td className="pf-lbl" style={{ width: "35%" }}>
              PO File
            </td>
            <td className="pf-val">
              {record.poAttachment?.dataUrl ? (
                <div className="license-doc-links">
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
                    Preview
                  </button>
                  <button
                    type="button"
                    className="doc-link-btn"
                    onClick={() =>
                      downloadDataUrl(
                        record.poAttachment?.dataUrl || "",
                        record.poAttachment?.name || "PO file"
                      )
                    }
                  >
                    Download
                  </button>
                </div>
              ) : (
                "-"
              )}
            </td>
          </tr>

          <tr>
            <td className="pf-lbl" style={{ width: "35%" }}>
              Contract File
            </td>
            <td className="pf-val">
              {record.contractAttachment?.dataUrl ? (
                <div className="license-doc-links">
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
                    Preview
                  </button>
                  <button
                    type="button"
                    className="doc-link-btn"
                    onClick={() =>
                      downloadDataUrl(
                        record.contractAttachment?.dataUrl || "",
                        record.contractAttachment?.name || "Contract file"
                      )
                    }
                  >
                    Download
                  </button>
                </div>
              ) : (
                "-"
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};
