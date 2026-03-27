import { forwardRef } from "react";
import { AccountabilityRecord } from "../types/accountability";
import { BorrowingReceiptData } from "../types/borrowingReceipt";

interface BorrowingReceiptPrintableProps {
  record: AccountabilityRecord | null;
  data: BorrowingReceiptData;
}

const valueOrDash = (value?: string) => value?.trim() || "-";
const isImageAttachment = (mimeType: string) => mimeType.startsWith("image/");
const isPdfAttachment = (mimeType: string) => mimeType === "application/pdf";
const formatAttachmentSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const toDate = (value?: string) => {
  const date = new Date(String(value ?? "").trim());
  return Number.isNaN(date.getTime()) ? null : date;
};

const getBorrowingDuration = (dateBorrowed?: string, returnedDate?: string) => {
  const start = toDate(dateBorrowed);
  if (!start) {
    return "-";
  }

  const end = toDate(returnedDate) ?? new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(Math.floor((endDay.getTime() - startDay.getTime()) / msPerDay), 0);
  return `${days} day${days === 1 ? "" : "s"}`;
};

const getBorrowingReturnStatus = (
  expectedReturnDate?: string,
  returnedDate?: string,
  returnRemarks?: string
) => {
  if (String(returnedDate ?? "").trim() || String(returnRemarks ?? "").trim()) {
    return "Returned";
  }

  const expected = toDate(expectedReturnDate);
  if (!expected) {
    return "Borrowed";
  }

  const now = new Date();
  return now.getTime() > expected.getTime() ? "Overdue" : "Borrowed";
};

export const BorrowingReceiptPrintable = forwardRef<
  HTMLDivElement,
  BorrowingReceiptPrintableProps
>(({ record, data }, ref) => {
  if (!record) {
    return (
      <section className="panel">
        <h2>Borrowing Receipt Printable</h2>
        <p className="helper-text">
          Select a record first, then open Borrowing Receipt to generate the A4 printable page.
        </p>
      </section>
    );
  }

  return (
    <section className="panel print-shell">
      <h2 className="no-print">Borrowing Receipt Printable</h2>

      <div className="print-form print-form--a4 print-form--compact" ref={ref}>
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
              <h1>IT ASSET BORROWING RECEIPT FORM</h1>
              <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
            </div>
          </div>
        </header>

        <table className="pf-table" style={{ marginTop: "6px" }}>
          <thead>
            <tr>
              <th className="pf-th">Borrowing No.</th>
              <th className="pf-th">Emp ID</th>
              <th className="pf-th">Name</th>
              <th className="pf-th">Device Type</th>
              <th className="pf-th">Date Borrowed</th>
              <th className="pf-th">Expected Return</th>
              <th className="pf-th">Duration</th>
              <th className="pf-th">Return Status</th>
              <th className="pf-th">Purpose</th>
              <th className="pf-th">Contact</th>
              <th className="pf-th">Requested By</th>
              <th className="pf-th">Approved By</th>
              <th className="pf-th">Released By</th>
              <th className="pf-th">Release Date/Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pf-val">{valueOrDash(data.borrowingNo)}</td>
              <td className="pf-val">{valueOrDash(record.empId)}</td>
              <td className="pf-val">{valueOrDash(data.borrowerName)}</td>
              <td className="pf-val">{valueOrDash(data.deviceType)}</td>
              <td className="pf-val">{valueOrDash(data.dateBorrowed)}</td>
              <td className="pf-val">{valueOrDash(data.expectedReturnDate)}</td>
              <td className="pf-val">{getBorrowingDuration(data.dateBorrowed, record.returnedDate)}</td>
              <td className="pf-val">{getBorrowingReturnStatus(data.expectedReturnDate, record.returnedDate, data.returnRemarks)}</td>
              <td className="pf-val">{valueOrDash(data.purpose)}</td>
              <td className="pf-val">{valueOrDash(data.contact)}</td>
              <td className="pf-val">{valueOrDash(data.requestedBy)}</td>
              <td className="pf-val">{valueOrDash(data.approvedBy)}</td>
              <td className="pf-val">{valueOrDash(data.releasedBy)}</td>
              <td className="pf-val">{valueOrDash(data.releaseDateTime)}</td>
            </tr>
          </tbody>
        </table>

        <table className="pf-table" style={{ marginTop: "8px" }}>
          <thead>
            <tr>
              <th className="pf-th" colSpan={2}>Borrower Signature</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pf-lbl" style={{ width: "20%" }}>Signature</td>
              <td className="pf-val pf-borrowing-signature-cell">
                {data.signatureDataUrl ? (
                  <div className="pf-borrowing-signature-wrap">
                    <img src={data.signatureDataUrl} alt="Borrower signature" className="pf-borrowing-signature" />
                  </div>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {(data.attachments?.length ?? 0) > 0 && (
          <section className="print-page-break">
            <header className="print-header" style={{ marginTop: "0" }}>
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
                  <h1>IT ASSET BORROWING RECEIPT FORM - ATTACHMENTS</h1>
                  <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
                </div>
              </div>
            </header>

            <div>
              {data.attachments.map((file) => (
                <article className="pf-attachment-sheet" key={file.id}>
                  <div className="pf-attachment-meta">
                    <strong>{file.name}</strong>
                    <span>
                      {(file.type || "Unknown type")} | {formatAttachmentSize(file.size || 0)}
                    </span>
                  </div>

                  <div className="pf-attachment-body-full">
                    {isImageAttachment(file.type || "") && (
                      <img src={file.dataUrl} alt={file.name} className="pf-attachment-image-full" />
                    )}

                    {isPdfAttachment(file.type || "") && (
                      <iframe src={file.dataUrl} title={file.name} className="pf-attachment-pdf-full" />
                    )}

                    {!isImageAttachment(file.type || "") && !isPdfAttachment(file.type || "") && (
                      <p className="pf-attachment-fallback">Attachment view is not available for this file type.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
});

BorrowingReceiptPrintable.displayName = "BorrowingReceiptPrintable";
