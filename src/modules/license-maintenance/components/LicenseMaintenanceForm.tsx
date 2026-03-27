import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  emptyLicenseMaintenanceRecord,
  LICENSE_REQUIRED_FIELDS,
  LicenseMaintenanceRecord,
  PRODUCT_TYPE_OPTIONS
} from "../types/licenseMaintenance";

interface LicenseMaintenanceFormProps {
  editingRecord: LicenseMaintenanceRecord | null;
  onSubmit: (record: LicenseMaintenanceRecord) => Promise<void>;
  onCancelEdit: () => void;
}

const SOFTWARE_NAME_OPTIONS = ["", "AEC", "AutoCad LT", "Bluebeam", "Primavera", "Procore", "SAP"];

const labelByField: Record<keyof LicenseMaintenanceRecord, string> = {
  id: "ID",
  softwareName: "Software Name",
  vendor: "Vendor",
  quantity: "Quantity",
  date: "Date",
  productType: "Product Type",
  productKey: "Product Key",
  proofOfPurchaseName: "Proof of Purchase",
  createdAt: "Created At",
  updatedAt: "Updated At"
};

export const LicenseMaintenanceForm = ({
  editingRecord,
  onSubmit,
  onCancelEdit
}: LicenseMaintenanceFormProps) => {
  const [form, setForm] = useState<LicenseMaintenanceRecord>(emptyLicenseMaintenanceRecord());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptyLicenseMaintenanceRecord());
      setErrors([]);
      return;
    }

    const base = emptyLicenseMaintenanceRecord();
    setForm({ ...base, ...editingRecord });
    setErrors([]);
  }, [editingRecord]);

  const isProductKeyRequired = form.productType === "Product Key";

  const validationErrors = useMemo(() => {
    const missing = LICENSE_REQUIRED_FIELDS
      .filter((key) => !String(form[key] ?? "").trim())
      .map((key) => `${labelByField[key]} is required.`);

    const parsedQuantity = Number(form.quantity);
    if (form.quantity && (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isInteger(parsedQuantity))) {
      missing.push("Quantity must be a whole number greater than 0.");
    }

    if (isProductKeyRequired && !form.productKey.trim()) {
      missing.push("Product Key is required when Product Type is Product Key.");
    }

    return missing;
  }, [form, isProductKeyRequired]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      await onSubmit({
        ...form,
        softwareName: form.softwareName.trim(),
        vendor: form.vendor.trim(),
        quantity: form.quantity.trim(),
        date: form.date,
        productType: form.productType,
        productKey: isProductKeyRequired ? form.productKey.trim() : "",
        proofOfPurchaseName: form.proofOfPurchaseName.trim()
      });

      setForm(emptyLicenseMaintenanceRecord());
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h2>{editingRecord ? "Edit License Record" : "License Maintenance Form"}</h2>
      <p className="helper-text">Track software licenses with product type-aware validation.</p>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field field-span-2">
          <span>Software Name</span>
          <select
            value={form.softwareName}
            onChange={(event) => setForm((prev) => ({ ...prev, softwareName: event.target.value }))}
          >
            <option value="">Select Software Name</option>
            {SOFTWARE_NAME_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-span-2">
          <span>Vendor</span>
          <input
            value={form.vendor}
            onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))}
            placeholder="Enter vendor/company"
          />
        </label>

        <label className="field">
          <span>Quantity</span>
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            placeholder="0"
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
        </label>

        <label className="field">
          <span>Product Type</span>
          <select
            value={form.productType}
            onChange={(event) => {
              const nextType = event.target.value as LicenseMaintenanceRecord["productType"];
              setForm((prev) => ({
                ...prev,
                productType: nextType,
                productKey: nextType === "Product Key" ? prev.productKey : ""
              }));
            }}
          >
            <option value="">Select product type</option>
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-span-3">
          <span>Product Key</span>
          <textarea
            value={form.productKey}
            disabled={!isProductKeyRequired}
            onChange={(event) => setForm((prev) => ({ ...prev, productKey: event.target.value }))}
            placeholder={
              isProductKeyRequired
                ? "Enter license product key"
                : "Product key is disabled for Email-Based License"
            }
          />
        </label>

        <label className="field field-span-3">
          <span>Proof of Purchase (Optional)</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setForm((prev) => ({ ...prev, proofOfPurchaseName: file?.name ?? "" }));
            }}
          />
          {form.proofOfPurchaseName && (
            <small className="helper-text">Selected: {form.proofOfPurchaseName}</small>
          )}
        </label>

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingRecord ? "Update License" : "Save License"}
          </button>
          {editingRecord && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setForm(emptyLicenseMaintenanceRecord());
                setErrors([]);
                onCancelEdit();
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
