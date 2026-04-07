import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  emptyLicenseMaintenanceRecord,
  LICENSE_REQUIRED_FIELDS,
  LicenseDocumentAttachment,
  LicenseMaintenanceRecord,
  PRODUCT_TYPE_OPTIONS,
  RENEWAL_STATUS_OPTIONS
} from "../types/licenseMaintenance";

interface LicenseMaintenanceFormProps {
  editingRecord: LicenseMaintenanceRecord | null;
  onSubmit: (record: LicenseMaintenanceRecord) => Promise<void>;
  onCancelEdit: () => void;
}

const SOFTWARE_NAME_OPTIONS = ["", "AEC", "AutoCad LT", "Bluebeam", "Primavera", "Procore", "SAP"];
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LICENSE_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png"
]);
const ACCEPTED_LICENSE_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
const LEGACY_OPTIONAL_REQUIRED_FIELDS: Array<keyof LicenseMaintenanceRecord> = [
  "contractOrPoNumber",
  "purchaseMonthYear",
  "expirationDate",
  "renewalStatus"
];

const labelByField: Record<keyof LicenseMaintenanceRecord, string> = {
  id: "ID",
  softwareName: "Software Name",
  vendor: "Vendor",
  quantity: "Quantity",
  date: "Date",
  contractOrPoNumber: "Contract Number / PO",
  purchaseMonthYear: "Month/Year of Purchase",
  expirationDate: "Expiration Date",
  renewalStatus: "Renewal Status",
  productType: "Product Type",
  productKey: "Product Key",
  proofOfPurchaseName: "Proof of Purchase",
  poAttachment: "PO File",
  contractAttachment: "Contract File",
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
  const [attachmentError, setAttachmentError] = useState("");
  const [saving, setSaving] = useState(false);

  const isLegacyEditWithoutRenewalData = useMemo(() => {
    if (!editingRecord) {
      return false;
    }

    return LEGACY_OPTIONAL_REQUIRED_FIELDS.every(
      (key) => !String(editingRecord[key] ?? "").trim()
    );
  }, [editingRecord]);

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptyLicenseMaintenanceRecord());
      setErrors([]);
      setAttachmentError("");
      return;
    }

    const base = emptyLicenseMaintenanceRecord();
    setForm({ ...base, ...editingRecord });
    setErrors([]);
    setAttachmentError("");
  }, [editingRecord]);

  const isProductKeyRequired = form.productType === "Product Key";

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(`Unable to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });

  const formatBytes = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAcceptedFileType = (file: File) => {
    const byMime = ACCEPTED_LICENSE_FILE_TYPES.has(file.type);
    const lowerName = file.name.toLowerCase();
    const byExtension = ACCEPTED_LICENSE_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension)
    );
    return byMime || byExtension;
  };

  const handleDocumentUpload = async (
    targetField: "poAttachment" | "contractAttachment",
    files: FileList | null
  ) => {
    if (!files?.length) return;

    const file = files[0];
    setAttachmentError("");

    if (!isAcceptedFileType(file)) {
      setAttachmentError(`${file.name}: only PDF, DOC, DOCX, JPG, and PNG are allowed.`);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachmentError(`${file.name}: file exceeds 5 MB limit.`);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const nextAttachment: LicenseDocumentAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };

      setForm((prev) => ({
        ...prev,
        [targetField]: nextAttachment,
        proofOfPurchaseName:
          targetField === "poAttachment"
            ? file.name
            : prev.proofOfPurchaseName || prev.poAttachment?.name || ""
      }));
    } catch {
      setAttachmentError(`${file.name}: failed to process file.`);
    }
  };

  const handleDocumentRemove = (targetField: "poAttachment" | "contractAttachment") => {
    setAttachmentError("");
    setForm((prev) => ({
      ...prev,
      [targetField]: null,
      proofOfPurchaseName:
        targetField === "poAttachment"
          ? ""
          : prev.proofOfPurchaseName
    }));
  };

  const validationErrors = useMemo(() => {
    const requiredFields = isLegacyEditWithoutRenewalData
      ? LICENSE_REQUIRED_FIELDS.filter((key) => !LEGACY_OPTIONAL_REQUIRED_FIELDS.includes(key))
      : LICENSE_REQUIRED_FIELDS;

    const missing = requiredFields
      .filter((key) => !String(form[key] ?? "").trim())
      .map((key) => `${labelByField[key]} is required.`);

    const parsedQuantity = Number(form.quantity);
    if (form.quantity && (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isInteger(parsedQuantity))) {
      missing.push("Quantity must be a whole number greater than 0.");
    }

    if (isProductKeyRequired && !form.productKey.trim()) {
      missing.push("Product Key is required when Product Type is Product Key.");
    }

    const parsedDate = new Date(form.date);
    if (form.date && Number.isNaN(parsedDate.getTime())) {
      missing.push("Date must be a valid date.");
    }

    const parsedExpirationDate = new Date(form.expirationDate);
    if (form.expirationDate && Number.isNaN(parsedExpirationDate.getTime())) {
      missing.push("Expiration Date must be a valid date.");
    }

    const purchaseMonthDate = form.purchaseMonthYear ? new Date(`${form.purchaseMonthYear}-01`) : null;
    if (form.purchaseMonthYear && (!purchaseMonthDate || Number.isNaN(purchaseMonthDate.getTime()))) {
      missing.push("Month/Year of Purchase must be a valid month.");
    }

    if (
      purchaseMonthDate &&
      !Number.isNaN(parsedExpirationDate.getTime()) &&
      parsedExpirationDate.getTime() < purchaseMonthDate.getTime()
    ) {
      missing.push("Expiration Date cannot be earlier than Month/Year of Purchase.");
    }

    return missing;
  }, [form, isLegacyEditWithoutRenewalData, isProductKeyRequired]);

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
        contractOrPoNumber: form.contractOrPoNumber.trim(),
        purchaseMonthYear: form.purchaseMonthYear,
        expirationDate: form.expirationDate,
        renewalStatus: form.renewalStatus,
        productType: form.productType,
        productKey: isProductKeyRequired ? form.productKey.trim() : "",
        proofOfPurchaseName: form.poAttachment?.name || form.proofOfPurchaseName.trim(),
        poAttachment: form.poAttachment ?? null,
        contractAttachment: form.contractAttachment ?? null
      });

      setForm(emptyLicenseMaintenanceRecord());
      setAttachmentError("");
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

        <label className="field field-span-2">
          <span>Contract Number / Purchase Order (PO)</span>
          <input
            value={form.contractOrPoNumber}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, contractOrPoNumber: event.target.value }))
            }
            placeholder="Enter contract or PO number"
          />
        </label>

        <label className="field">
          <span>Month/Year of Purchase</span>
          <input
            type="month"
            value={form.purchaseMonthYear}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, purchaseMonthYear: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Expiration Date</span>
          <input
            type="date"
            value={form.expirationDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, expirationDate: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Renewal Status</span>
          <select
            value={form.renewalStatus}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                renewalStatus: event.target.value as LicenseMaintenanceRecord["renewalStatus"]
              }))
            }
          >
            <option value="">Select renewal status</option>
            {RENEWAL_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

        <section className="field field-span attachments-panel" aria-label="License documents section">
          <span>Proof of Purchase Documents (Optional)</span>
          <p className="helper-text attachments-helper">
            Upload PO and Contract files. Allowed: PDF, DOC, DOCX, JPG, PNG. Max 5 MB per file.
          </p>

          <div className="license-doc-grid">
            <div>
              <label className="attachment-upload" htmlFor="license-po-attachment">
                <input
                  id="license-po-attachment"
                  className="attachment-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    void handleDocumentUpload("poAttachment", event.target.files);
                    event.target.value = "";
                  }}
                />
                <span className="attachment-upload-btn">Upload PO File</span>
              </label>

              {form.poAttachment && (
                <div className="attachment-item" style={{ marginTop: "0.4rem" }}>
                  <div>
                    <p className="attachment-name">{form.poAttachment.name}</p>
                    <p className="attachment-meta">{formatBytes(form.poAttachment.size)}</p>
                  </div>
                  <div className="attachment-actions">
                    <a href={form.poAttachment.dataUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleDocumentRemove("poAttachment")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="attachment-upload" htmlFor="license-contract-attachment">
                <input
                  id="license-contract-attachment"
                  className="attachment-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    void handleDocumentUpload("contractAttachment", event.target.files);
                    event.target.value = "";
                  }}
                />
                <span className="attachment-upload-btn">Upload Contract File</span>
              </label>

              {form.contractAttachment && (
                <div className="attachment-item" style={{ marginTop: "0.4rem" }}>
                  <div>
                    <p className="attachment-name">{form.contractAttachment.name}</p>
                    <p className="attachment-meta">{formatBytes(form.contractAttachment.size)}</p>
                  </div>
                  <div className="attachment-actions">
                    <a href={form.contractAttachment.dataUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleDocumentRemove("contractAttachment")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {attachmentError && <p className="attachment-error">{attachmentError}</p>}
        </section>

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
