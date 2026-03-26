import { forwardRef } from "react";
import { DeliveryReceiptRecord } from "../types/deliveryReceipt";

interface DeliveryReceiptPrintableProps {
  record: DeliveryReceiptRecord | null;
}

const valueOrDash = (value?: string) => value?.trim() || "-";

export const DeliveryReceiptPrintable = forwardRef<
  HTMLDivElement,
  DeliveryReceiptPrintableProps
>(({ record }, ref) => {
  if (!record) {
    return (
      <section className="panel">
        <h2>Delivery Receipt Printable</h2>
        <p className="helper-text">
          Select a record first, then click Print to generate the printable receipt.
        </p>
      </section>
    );
  }

  return (
    <section className="panel print-shell">
      <h2 className="no-print">Delivery Receipt Printable</h2>

      <div className="print-form print-form--a4 receipt-container" ref={ref}>
        {/* Receipt Header */}
        <div className="receipt-header">
          <div className="receipt-logo">
            <img
              src="/assets/mdclogo.png?v=20260319"
              alt="MDC Logo"
              className="receipt-logo-img"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="receipt-title">
            <h1>DELIVERY RECEIPT</h1>
            <p className="receipt-company">MAKATI DEVELOPMENT CORPORATION</p>
            <p className="receipt-department">Information Technology Division</p>
          </div>
        </div>

        {/* Receipt Number and Date */}
        <div className="receipt-meta">
          <div className="receipt-meta-item">
            <span className="receipt-label">Receipt No.:</span>
            <span className="receipt-value">{valueOrDash(record.invoiceNumber)}</span>
          </div>
          <div className="receipt-meta-item">
            <span className="receipt-label">Date:</span>
            <span className="receipt-value">{valueOrDash(record.deliveryDate)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="receipt-divider"></div>

        {/* Supplier Information Section */}
        <div className="receipt-section">
          <h3 className="receipt-section-title">SUPPLIER INFORMATION</h3>
          <div className="receipt-grid receipt-grid-2">
            <div className="receipt-field">
              <span className="receipt-label">Supplier:</span>
              <span className="receipt-value">{valueOrDash(record.supplier)}</span>
            </div>
            <div className="receipt-field">
              <span className="receipt-label">Purchase Number:</span>
              <span className="receipt-value">{valueOrDash(record.purchaseNumber)}</span>
            </div>
          </div>
        </div>

        {/* Item Information Section */}
        <div className="receipt-section">
          <h3 className="receipt-section-title">ITEM DETAILS</h3>
          <div className="receipt-field" style={{ marginBottom: "8px" }}>
            <span className="receipt-label">Description:</span>
            <span className="receipt-value" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {valueOrDash(record.itemDescription)}
            </span>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="receipt-section">
          <h3 className="receipt-section-title">WARRANTY & DETAILS</h3>
          <div className="receipt-grid receipt-grid-2">
            <div className="receipt-field">
              <span className="receipt-label">Warranty:</span>
              <span className="receipt-value">{valueOrDash(record.warranty)}</span>
            </div>
            <div className="receipt-field">
              <span className="receipt-label">Status:</span>
              <span className="receipt-value">DELIVERED</span>
            </div>
          </div>
        </div>

        {/* Other Details Section */}
        {record.otherDetails && record.otherDetails.trim() && (
          <div className="receipt-section">
            <h3 className="receipt-section-title">ADDITIONAL REMARKS</h3>
            <div className="receipt-remarks">
              <p>{record.otherDetails}</p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="receipt-divider"></div>

        {/* Signature Section */}
        <div className="receipt-section">
          <h3 className="receipt-section-title">ACKNOWLEDGMENT</h3>
          <div className="receipt-grid receipt-grid-2">
            <div className="receipt-signature-box">
              <div className="receipt-signature-label">Received By</div>
              <div className="receipt-signature-line"></div>
              <div className="receipt-signature-date">Signature & Date</div>
            </div>
            <div className="receipt-signature-box">
              <div className="receipt-signature-label">Delivered By</div>
              <div className="receipt-signature-line"></div>
              <div className="receipt-signature-date">Signature & Date</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p>Thank you for your business</p>
          <p className="receipt-footer-date">Generated on: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </section>
  );
});

DeliveryReceiptPrintable.displayName = "DeliveryReceiptPrintable";
