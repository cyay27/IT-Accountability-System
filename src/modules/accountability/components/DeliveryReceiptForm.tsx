import { FormEvent, useEffect, useState } from "react";
import { DeliveryReceiptRecord } from "../types/deliveryReceipt";

interface DeliveryReceiptFormProps {
  editingRecord: DeliveryReceiptRecord | null;
  onSave: (record: Omit<DeliveryReceiptRecord, "id" | "createdAt" | "updatedAt">) => void;
  onCancelEdit: () => void;
}

type DeliveryReceiptState = {
  invoiceNumber: string;
  purchaseNumber: string;
  supplier: string;
  deliveryDate: string;
  warranty: string;
  itemDescription: string;
  otherDetails: string;
};

const emptyState = (): DeliveryReceiptState => ({
  invoiceNumber: "",
  purchaseNumber: "",
  supplier: "",
  deliveryDate: "",
  warranty: "",
  itemDescription: "",
  otherDetails: ""
});

export function DeliveryReceiptForm({ editingRecord, onSave, onCancelEdit }: DeliveryReceiptFormProps) {
  const [form, setForm] = useState<DeliveryReceiptState>(emptyState());
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptyState());
      return;
    }

    setForm({
      invoiceNumber: editingRecord.invoiceNumber ?? "",
      purchaseNumber: editingRecord.purchaseNumber ?? "",
      supplier: editingRecord.supplier ?? "",
      deliveryDate: editingRecord.deliveryDate ?? "",
      warranty: editingRecord.warranty ?? "",
      itemDescription: editingRecord.itemDescription ?? "",
      otherDetails: editingRecord.otherDetails ?? ""
    });
  }, [editingRecord]);

  const handleChange = (key: keyof DeliveryReceiptState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.invoiceNumber.trim() || !form.purchaseNumber.trim()) {
      window.alert("Invoice Number and Purchase Number are required.");
      return;
    }

    onSave({
      invoiceNumber: form.invoiceNumber.trim(),
      purchaseNumber: form.purchaseNumber.trim(),
      supplier: form.supplier.trim(),
      deliveryDate: form.deliveryDate,
      warranty: form.warranty.trim(),
      itemDescription: form.itemDescription.trim(),
      otherDetails: form.otherDetails.trim()
    });

    setForm(emptyState());
    window.alert(editingRecord ? "Delivery receipt updated successfully!" : "Delivery receipt saved successfully!");
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2>{editingRecord ? "Edit Delivery Receipt" : "Create Delivery Receipt"}</h2>
      <button
        type="button"
        className="ghost"
        onClick={() => setIsEditMode(!isEditMode)}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          padding: "4px 12px",
          fontSize: "12px",
          whiteSpace: "nowrap"
        }}
        title={isEditMode ? "Done editing" : "Enable edit mode"}
      >
        {isEditMode ? "Done" : "Edit"}
      </button>
      <p className="helper-text">Fill in invoice, purchase number, and other delivery details.</p>
      {isEditMode && (
        <p className="helper-text">Edit mode is enabled. Use the `x` buttons to clear individual fields.</p>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Invoice Number</span>
          <div className="field-input-wrap">
            <input
              value={form.invoiceNumber}
              onChange={(event) => handleChange("invoiceNumber", event.target.value)}
              placeholder="Enter invoice number"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Invoice Number"
              aria-label="Clear Invoice Number"
              onClick={() => handleChange("invoiceNumber", "")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field">
          <span>Purchase Number</span>
          <div className="field-input-wrap">
            <input
              value={form.purchaseNumber}
              onChange={(event) => handleChange("purchaseNumber", event.target.value)}
              placeholder="Enter purchase number"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Purchase Number"
              aria-label="Clear Purchase Number"
              onClick={() => handleChange("purchaseNumber", "")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field">
          <span>Supplier</span>
          <div className="field-input-wrap">
            <input
              value={form.supplier}
              onChange={(event) => handleChange("supplier", event.target.value)}
              placeholder="Enter supplier"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Supplier"
              aria-label="Clear Supplier"
              onClick={() => handleChange("supplier", "")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field">
          <span>Delivery Date</span>
          <div className="field-input-wrap">
            <input
              type="date"
              value={form.deliveryDate}
              onChange={(event) => handleChange("deliveryDate", event.target.value)}
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Delivery Date"
              aria-label="Clear Delivery Date"
              onClick={() => handleChange("deliveryDate", "")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field">
          <span>Warranty</span>
          <div className="field-input-wrap">
            <input
              value={form.warranty}
              onChange={(event) => handleChange("warranty", event.target.value)}
              placeholder="Enter warranty details"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Warranty"
              aria-label="Clear Warranty"
              onClick={() => handleChange("warranty", "")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field field-span">
          <span>Item Description</span>
          <div className="field-input-wrap">
            <textarea
              value={form.itemDescription}
              onChange={(event) => handleChange("itemDescription", event.target.value)}
              rows={3}
              placeholder="Enter item description"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Item Description"
              aria-label="Clear Item Description"
              onClick={() => handleChange("itemDescription", "")}
              style={{ display: isEditMode ? "block" : "none", alignSelf: "start" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field field-span">
          <span>Other Details</span>
          <div className="field-input-wrap">
            <textarea
              value={form.otherDetails}
              onChange={(event) => handleChange("otherDetails", event.target.value)}
              rows={3}
              placeholder="Add other details"
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Other Details"
              aria-label="Clear Other Details"
              onClick={() => handleChange("otherDetails", "")}
              style={{ display: isEditMode ? "block" : "none", alignSelf: "start" }}
            >
              x
            </button>
          </div>
        </label>

        <div className="actions">
          <button type="submit">{editingRecord ? "Update Delivery Receipt" : "Save Delivery Receipt"}</button>
          {editingRecord && (
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button type="button" className="ghost" onClick={() => setForm(emptyState())}>
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
