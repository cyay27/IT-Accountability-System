import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AccountabilityAttachment,
  AccountabilityRecord,
  emptyRecord,
  REQUIRED_FIELDS
} from "../types/accountability";
import { SignaturePad } from "./SignaturePad";

interface EmployeeFormProps {
  editingRecord: AccountabilityRecord | null;
  onSubmit: (record: AccountabilityRecord) => Promise<void>;
  onCancelEdit: () => void;
}

type FieldDef =
  | { key: keyof AccountabilityRecord; label: string; type?: string }
  | { key: keyof AccountabilityRecord; label: string; type: "select"; options: string[] };

const labels: FieldDef[] = [
  { key: "no", label: "No." },
  { key: "empId", label: "Employee ID" },
  { key: "lastName", label: "Last Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "email", label: "Email (Office 365)", type: "email" },
  { key: "position", label: "Position" },
  { key: "group", label: "Group" },
  {
    key: "department",
    label: "Department",
    type: "select",
    options: ["", "IT", "Procore", "QS", "BIMD", "AMLD", "PHR", "Finance"]
  },
  {
    key: "opCen",
    label: "OpCen",
    type: "select",
    options: ["", "ASB", "MAKATI", "Sloc", "Nloc", "Qc", "East", "Mdbi", "Vismin", "Alcav", "Hq"]
  },
  { key: "employmentStatus", label: "Employment Status" },
  { key: "project", label: "Project" },
  { key: "costCenter", label: "Cost Center" },
  { key: "projectLocation", label: "Location of Asset (Project/Address)" },
  { key: "tarf", label: "TARF Reference # (if applicable)" },
  { key: "deviceType", label: "Device Type", type: "select", options: ["", "Desktop", "Laptop", "Tablet", "Ipad", "Others"] },
  { key: "deviceDescription", label: "Description / Device Model" },
  { key: "hostname", label: "Hostname" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "deviceCondition", label: "Device Condition", type: "select", options: ["", "New", "Old"] },
  { key: "deviceAssetNumber", label: "Asset Number (Device)" },
  { key: "monitorModel", label: "Monitor Model" },
  { key: "monitorSerialNumber", label: "Monitor Serial Number" },
  { key: "monitorAssetNumber", label: "Asset Number (Monitor)" },
  { key: "softwareName", label: "Software Application Name" },
  { key: "softwareLicense", label: "Software License / Reference #" },
  { key: "phr", label: "HR/PHR Representative" },
  { key: "amld", label: "AMLD Representative" },
  { key: "it", label: "IT Representative" },
  { key: "cato", label: "CATO" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const PORTABLE_DEVICE_TYPES = new Set(["ipad", "tablet"]);
const EXCLUDED_ON_PORTABLE: Array<keyof AccountabilityRecord> = [
  "hostname",
  "deviceAssetNumber",
  "monitorModel",
  "monitorSerialNumber",
  "monitorAssetNumber",
  "softwareName",
  "softwareLicense",
  "cato"
];

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

export const EmployeeForm = ({ editingRecord, onSubmit, onCancelEdit }: EmployeeFormProps) => {
  const [form, setForm] = useState<AccountabilityRecord>(emptyRecord());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptyRecord());
      setErrors([]);
      return;
    }

    const base = emptyRecord();
    setForm({
      ...base,
      ...editingRecord,
      attachments: editingRecord.attachments ?? [],
      assigneeSignature: editingRecord.assigneeSignature ?? base.assigneeSignature,
      assigneeReturnedSignature: editingRecord.assigneeReturnedSignature ?? base.assigneeReturnedSignature,
      phrSignature: editingRecord.phrSignature ?? base.phrSignature,
      amldSignature: editingRecord.amldSignature ?? base.amldSignature,
      itSignature: editingRecord.itSignature ?? base.itSignature,
      catoSignature: editingRecord.catoSignature ?? base.catoSignature
    });
    setErrors([]);
  }, [editingRecord]);

  const fullName = useMemo(
    () => [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" "),
    [form.firstName, form.middleName, form.lastName]
  );

  const isPortableDevice = PORTABLE_DEVICE_TYPES.has(form.deviceType.trim().toLowerCase());

  const validate = () => {
    const nextErrors: string[] = [];

    const requiredFields = REQUIRED_FIELDS.filter(
      (field) => !(isPortableDevice && EXCLUDED_ON_PORTABLE.includes(field))
    );

    requiredFields.forEach((field) => {
      if (!String(form[field] ?? "").trim()) {
        nextErrors.push(`${field} is required.`);
      }
    });

    if (form.email.trim() && !emailRegex.test(form.email.trim())) {
      nextErrors.push("email must be a valid email address.");
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      await onSubmit(form);
      if (!editingRecord) {
        setForm(emptyRecord());
      }
      setErrors([]);
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setAttachmentError("");
    const existing = form.attachments ?? [];
    if (existing.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`Maximum of ${MAX_ATTACHMENTS} attachments is allowed.`);
      return;
    }

    const remainingSlots = MAX_ATTACHMENTS - existing.length;
    const selected = Array.from(files).slice(0, remainingSlots);
    const added: AccountabilityAttachment[] = [];
    const fileErrors: string[] = [];

    for (const file of selected) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        fileErrors.push(`${file.name}: only PDF, PNG, and JPG are allowed.`);
        continue;
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        fileErrors.push(`${file.name}: file exceeds 2 MB limit.`);
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString()
        });
      } catch {
        fileErrors.push(`${file.name}: failed to process file.`);
      }
    }

    if (added.length > 0) {
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments ?? []), ...added]
      }));
    }

    if (fileErrors.length > 0) {
      setAttachmentError(fileErrors.join(" "));
    }
  };

  const handleAttachmentRemove = (id: string) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).filter((item) => item.id !== id)
    }));
  };

  const handleSignatureSave = (
    representativeType: "assignee" | "assigneeReturned" | "phr" | "amld" | "it" | "cato",
    signatureDataUrl: string
  ) => {
    const signatureFieldMap = {
      assignee: "assigneeSignature",
      assigneeReturned: "assigneeReturnedSignature",
      phr: "phrSignature",
      amld: "amldSignature",
      it: "itSignature",
      cato: "catoSignature"
    } as const;

    const field = signatureFieldMap[representativeType];
    const effectiveDate =
      (representativeType === "assigneeReturned" || representativeType === "cato") && form.returnedDate
        ? form.returnedDate
        : new Date().toISOString().split("T")[0];

    setForm((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] ?? { name: "", signatureDataUrl: null, date: "" }),
        signatureDataUrl,
        date: effectiveDate
      }
    }));
  };

  const handleFieldChange = (key: keyof AccountabilityRecord, value: string) => {
    if (key === "deviceType") {
      const nextDevice = value.trim().toLowerCase();
      if (PORTABLE_DEVICE_TYPES.has(nextDevice)) {
        setForm((prev) => {
          const next = { ...prev, deviceType: value };
          EXCLUDED_ON_PORTABLE.forEach((fieldKey) => {
            next[fieldKey] = "" as never;
          });
          return next;
        });
        return;
      }
    }

    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <section className="panel">
      <h2>{editingRecord ? "Edit Accountability Record" : "Create Accountability Record"}</h2>
      <p className="helper-text">Full Name Preview: <strong>{fullName || "-"}</strong></p>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        {labels.map((fieldDef) => {
          const { key, label, type } = fieldDef;
          if (isPortableDevice && EXCLUDED_ON_PORTABLE.includes(key)) {
            return null;
          }

          const required = REQUIRED_FIELDS.includes(key);
          const isSelect = type === "select";
          const options = isSelect ? (fieldDef as { options: string[] }).options : [];
          return (
            <label key={key} className="field">
              <span>
                {label}
                {required ? " *" : ""}
              </span>
              {isSelect ? (
                <select
                  value={String(form[key] ?? "")}
                  onChange={(e) =>
                    handleFieldChange(key, e.target.value)
                  }
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o || `Select ${label}`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type ?? "text"}
                  value={String(form[key] ?? "")}
                  onChange={(e) =>
                    handleFieldChange(key, e.target.value)
                  }
                  placeholder={label}
                />
              )}
            </label>
          );
        })}

        <section className="field field-span attachments-panel" aria-label="Attachments section">
          <span>Attachments (optional)</span>
          <p className="helper-text attachments-helper">
            Upload signed forms, device photos, or supporting docs. Allowed: PDF, PNG, JPG. Max 2 MB each, up to 5 files.
          </p>

          <label className="attachment-upload" htmlFor="accountability-attachments">
            <input
              id="accountability-attachments"
              className="attachment-input"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => {
                void handleAttachmentUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <span className="attachment-upload-btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M8 13.5 13.5 8a3 3 0 1 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.1-7.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add Attachments
            </span>
            <span className="attachment-upload-count">
              {(form.attachments ?? []).length} / {MAX_ATTACHMENTS} attached
            </span>
          </label>

          {attachmentError && <p className="attachment-error">{attachmentError}</p>}

          <div className="attachments-list">
            {(form.attachments ?? []).length === 0 && (
              <p className="attachments-empty">No attachments uploaded.</p>
            )}

            {(form.attachments ?? []).map((file) => (
              <div key={file.id} className="attachment-item">
                <div>
                  <p className="attachment-name">{file.name}</p>
                  <p className="attachment-meta">{formatBytes(file.size)}</p>
                </div>
                <div className="attachment-actions">
                  <a href={file.dataUrl} download={file.name}>
                    Download
                  </a>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleAttachmentRemove(file.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SIGNATURES SECTION ── */}
        <section className="field field-span" style={{ padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "6px", borderLeft: "4px solid #3b82f6" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 600 }}>Device Return & Signature Information (Optional)</h3>
          <p className="helper-text" style={{ marginBottom: "16px" }}>
            Collect digital signatures from all representatives when returning devices. Signatures will appear in the printable form.
          </p>

          <label className="field" style={{ marginBottom: "12px" }}>
            <span>Return Date</span>
            <input
              type="date"
              value={form.returnedDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  returnedDate: e.target.value
                }))
              }
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: "12px" }}>
            <SignaturePad
              label="Assignee - Received on (Left)"
              existingSignature={form.assigneeSignature?.signatureDataUrl}
              onSave={(sig) => handleSignatureSave("assignee", sig)}
            />

            <SignaturePad
              label="Assignee - Returned on (Right)"
              existingSignature={form.assigneeReturnedSignature?.signatureDataUrl}
              onSave={(sig) => handleSignatureSave("assigneeReturned", sig)}
            />
          </div>

          <SignaturePad
            label="HR/PHR Representative Signature & Printed Name"
            existingSignature={form.phrSignature?.signatureDataUrl}
            onSave={(sig) => handleSignatureSave("phr", sig)}
          />

          <SignaturePad
            label="AMLD Representative Signature & Printed Name"
            existingSignature={form.amldSignature?.signatureDataUrl}
            onSave={(sig) => handleSignatureSave("amld", sig)}
          />

          <SignaturePad
            label="IT Representative Signature & Printed Name"
            existingSignature={form.itSignature?.signatureDataUrl}
            onSave={(sig) => handleSignatureSave("it", sig)}
          />

          <SignaturePad
            label="IT / Warehouse Signature"
            existingSignature={form.catoSignature?.signatureDataUrl}
            onSave={(sig) => handleSignatureSave("cato", sig)}
          />
        </section>

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingRecord ? "Update Record" : "Save Record"}
          </button>
          {editingRecord && (
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
