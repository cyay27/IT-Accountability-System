import { SoftwareInventoryRecord } from "../types/softwareInventory";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safe = (value?: string) => esc(value?.trim() || "-");

export const buildSoftwareFormHtml = (record: SoftwareInventoryRecord) => {
  const now = new Date().toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Software-Inventory-${safe(record.softwareName)}</title>
    <style>
      body {
        font-family: "Poppins", "Segoe UI", Arial, sans-serif;
        color: #111;
        margin: 20px;
      }
      .sheet {
        max-width: 800px;
        margin: 0 auto;
        border: 1px solid #111;
        padding: 18px;
      }
      .head {
        border-bottom: 2px solid #111;
        margin-bottom: 12px;
        padding-bottom: 8px;
      }
      h1 {
        margin: 0;
        font-size: 18px;
      }
      p {
        margin: 4px 0;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th, td {
        border: 1px solid #111;
        text-align: left;
        padding: 8px;
        font-size: 12px;
      }
      th {
        width: 34%;
        background: #f5f7fb;
      }
      .foot {
        margin-top: 16px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <section class="sheet">
      <header class="head">
        <h1>IT SOFTWARE INVENTORY FORM</h1>
        <p>Makati Development Corporation - Information Technology Division</p>
        <p>Generated: ${safe(now)}</p>
      </header>

      <table>
        <tbody>
          <tr><th>Form No.</th><td>${safe(record.formNo)}</td></tr>
          <tr><th>Software Name</th><td>${safe(record.softwareName)}</td></tr>
          <tr><th>Version</th><td>${safe(record.softwareVersion)}</td></tr>
          <tr><th>Vendor</th><td>${safe(record.vendor)}</td></tr>
          <tr><th>License Type</th><td>${safe(record.licenseType)}</td></tr>
          <tr><th>License / Reference No.</th><td>${safe(record.licenseReference)}</td></tr>
          <tr><th>Seats Purchased / Used</th><td>${safe(record.seatsPurchased)} / ${safe(record.seatsUsed)}</td></tr>
          <tr><th>Assigned To</th><td>${safe(record.assignedTo)}</td></tr>
          <tr><th>Employee ID</th><td>${safe(record.employeeId)}</td></tr>
          <tr><th>Department</th><td>${safe(record.department)}</td></tr>
          <tr><th>Hostname</th><td>${safe(record.hostname)}</td></tr>
          <tr><th>Request Ticket</th><td>${safe(record.requestTicket)}</td></tr>
          <tr><th>Prepared By</th><td>${safe(record.preparedBy)}</td></tr>
          <tr><th>Approved By</th><td>${safe(record.approvedBy)}</td></tr>
          <tr><th>Expiry Date</th><td>${safe(record.expiryDate)}</td></tr>
          <tr><th>Status</th><td>${safe(record.status)}</td></tr>
          <tr><th>Remarks</th><td>${safe(record.remarks)}</td></tr>
        </tbody>
      </table>

      <div class="foot">
        <p>Prepared by: _______________________</p>
        <p>Approved by: _______________________</p>
      </div>
    </section>
  </body>
</html>`;
};

export const downloadSoftwareForm = (record: SoftwareInventoryRecord) => {
  const html = buildSoftwareFormHtml(record);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = record.softwareName.trim().replace(/\s+/g, "-") || "software";
  anchor.href = url;
  anchor.download = `software-inventory-${safeName}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
