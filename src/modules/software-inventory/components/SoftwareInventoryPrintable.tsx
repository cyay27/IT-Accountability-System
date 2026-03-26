import { forwardRef } from "react";
import { SoftwareInventoryRecord } from "../types/softwareInventory";

interface SoftwareInventoryPrintableProps {
  record: SoftwareInventoryRecord | null;
}

type SoftwarePrintableKey = Exclude<
  keyof SoftwareInventoryRecord,
  "id" | "createdAt" | "updatedAt" | "preparedSignature" | "approvedSignature"
>;

const rows: Array<{ key: SoftwarePrintableKey; label: string }> = [
  { key: "formNo", label: "Form No." },
  { key: "softwareName", label: "Software Name" },
  { key: "softwareVersion", label: "Software Version" },
  { key: "vendor", label: "Vendor / Publisher" },
  { key: "licenseType", label: "License Type" },
  { key: "licenseReference", label: "License / Reference No." },
  { key: "seatsPurchased", label: "Seats Purchased" },
  { key: "seatsUsed", label: "Seats Used" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "employeeId", label: "Employee ID" },
  { key: "department", label: "Department" },
  { key: "hostname", label: "Device Hostname" },
  { key: "requestTicket", label: "Request Ticket No." },
  { key: "preparedBy", label: "Prepared By" },
  { key: "approvedBy", label: "Approved By" },
  { key: "expiryDate", label: "Expiry / Renewal Date" },
  { key: "status", label: "Status" },
  { key: "remarks", label: "Remarks" }
];

const splitSoftwareNames = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const SoftwareInventoryPrintable = forwardRef<
  HTMLDivElement,
  SoftwareInventoryPrintableProps
>(({ record }, ref) => {
  if (!record) {
    return (
      <section className="panel">
        <h2>Software Form</h2>
        <p className="helper-text">
          Select a software record from the table and click View or Print.
        </p>
      </section>
    );
  }

  return (
    <section className="panel print-shell">
      <h2 className="no-print">Software Inventory Form</h2>

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
              <h1>IT SOFTWARE INVENTORY FORM</h1>
              <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
              <p>
                Generated on{" "}
                {new Date().toLocaleDateString("en-PH", {
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
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="pf-lbl" style={{ width: "35%" }}>
                  {row.label}
                </td>
                <td className="pf-val">
                  {row.key === "softwareName" ? (
                    (() => {
                      const softwareNames = splitSoftwareNames(record.softwareName);
                      if (softwareNames.length === 0) {
                        return "-";
                      }

                      return softwareNames.map((softwareName, index) => (
                        <div key={`${softwareName}-${index}`}>{softwareName}</div>
                      ));
                    })()
                  ) : (
                    record[row.key] || "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pf-legal">
          <p>
            This software is for official business use only and is governed by company
            software compliance, copyright, and security policies.
          </p>
          <p>
            Any transfer, sharing, or unauthorized installation requires prior approval
            from the IT Division.
          </p>
        </div>

        <table className="pf-table pf-sigs software-pf-sigs" style={{ marginTop: "8px" }}>
          <thead>
            <tr>
              <th className="pf-th">Prepared by</th>
              <th className="pf-th">Approved by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pf-sig-cell software-pf-sig-top-cell">
                {record.preparedSignature?.signatureDataUrl ? (
                  <>
                    <img
                      src={record.preparedSignature.signatureDataUrl}
                      alt="Prepared by signature"
                      style={{ maxHeight: "28px", maxWidth: "100%", marginBottom: "1px" }}
                    />
                    <p style={{ margin: "2px 0", fontSize: "8px" }}>
                      {record.preparedSignature.date || ""}
                    </p>
                    <p style={{ margin: "2px 0", fontSize: "8px" }}>
                      <strong>{record.preparedBy || record.preparedSignature.name || ""}</strong>
                    </p>
                  </>
                ) : (
                  <p style={{ margin: "2px 0", fontSize: "8px" }}>
                    <strong>{record.preparedBy || ""}</strong>
                  </p>
                )}
              </td>
              <td className="pf-sig-cell software-pf-sig-top-cell">
                {record.approvedSignature?.signatureDataUrl ? (
                  <>
                    <img
                      src={record.approvedSignature.signatureDataUrl}
                      alt="Approved by signature"
                      style={{ maxHeight: "28px", maxWidth: "100%", marginBottom: "1px" }}
                    />
                    <p style={{ margin: "2px 0", fontSize: "8px" }}>
                      {record.approvedSignature.date || ""}
                    </p>
                    <p style={{ margin: "2px 0", fontSize: "8px" }}>
                      <strong>{record.approvedBy || record.approvedSignature.name || ""}</strong>
                    </p>
                  </>
                ) : (
                  <p style={{ margin: "2px 0", fontSize: "8px" }}>
                    <strong>{record.approvedBy || ""}</strong>
                  </p>
                )}
              </td>
            </tr>
            <tr>
              <td className="pf-sig-cell">Name and Signature / Date</td>
              <td className="pf-sig-cell">Name and Signature / Date</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
});

SoftwareInventoryPrintable.displayName = "SoftwareInventoryPrintable";
