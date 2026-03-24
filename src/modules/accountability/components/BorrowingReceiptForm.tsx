import { FormEvent, useEffect, useState } from "react";
import { AccountabilityRecord } from "../types/accountability";
import {
  BorrowingReceiptData,
  emptyBorrowingReceiptData
} from "../types/borrowingReceipt";
import { AccountabilityAttachment } from "../types/accountability";
import { SignaturePad } from "./SignaturePad";

interface BorrowingReceiptFormProps {
  record: AccountabilityRecord | null;
  initialData: BorrowingReceiptData | null;
  onSave: (recordId: string, data: BorrowingReceiptData) => Promise<void> | void;
}

type BorrowingTextFieldKey = Exclude<keyof BorrowingReceiptData, "attachments" | "signatureDataUrl">;
const BORROWING_FORM_DROPDOWN_STORAGE_KEY = "ias:borrowing-form:dropdown-config";
const BORROWING_DEFAULT_DEVICE_TYPES = ["", "Desktop", "Laptop", "Tablet", "Ipad", "Others"];

const loadBorrowingDropdownConfig = () => {
  const defaultDropdownFields: Record<string, boolean> = {
    deviceType: true
  };
  const defaultSelectOptions: Record<string, string[]> = {
    deviceType: [...BORROWING_DEFAULT_DEVICE_TYPES]
  };

  try {
    const raw = localStorage.getItem(BORROWING_FORM_DROPDOWN_STORAGE_KEY);
    if (!raw) {
      return {
        dropdownFields: defaultDropdownFields,
        selectOptions: defaultSelectOptions
      };
    }

    const parsed = JSON.parse(raw) as {
      dropdownFields?: Record<string, boolean>;
      selectOptions?: Record<string, string[]>;
    };

    return {
      dropdownFields: { ...defaultDropdownFields, ...(parsed.dropdownFields ?? {}) },
      selectOptions: { ...defaultSelectOptions, ...(parsed.selectOptions ?? {}) }
    };
  } catch {
    return {
      dropdownFields: defaultDropdownFields,
      selectOptions: defaultSelectOptions
    };
  }
};

export const BorrowingReceiptForm = ({
  record,
  initialData,
  onSave
}: BorrowingReceiptFormProps) => {
  const persistedDropdownConfig = loadBorrowingDropdownConfig();
  const [form, setForm] = useState<BorrowingReceiptData>(emptyBorrowingReceiptData());
  const [errors, setErrors] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const DEVICE_TYPE_OPTIONS = BORROWING_DEFAULT_DEVICE_TYPES;
  const [dropdownFields, setDropdownFields] = useState<Record<string, boolean>>({
    ...persistedDropdownConfig.dropdownFields
  });
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>({
    ...persistedDropdownConfig.selectOptions
  });
  const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;
  const MAX_ATTACHMENTS = 5;
  const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

  const REQUIRED_FIELDS: Array<{ key: keyof BorrowingReceiptData; label: string }> = [
    { key: "borrowingNo", label: "Borrowing No." },
    { key: "borrowerName", label: "Full Name" },
    { key: "dateBorrowed", label: "Date Borrowed" },
    { key: "expectedReturnDate", label: "Expected Return Date" },
    { key: "purpose", label: "Purpose" },
    { key: "contact", label: "Contact" },
    { key: "requestedBy", label: "Requested By" },
    { key: "approvedBy", label: "Approved By" },
    { key: "releasedBy", label: "Released By (IT/Warehouse)" },
    { key: "releaseDateTime", label: "Release Date/Time" }
  ];

  useEffect(() => {
    if (initialData) {
      setForm({
        ...emptyBorrowingReceiptData(),
        ...initialData,
        attachments: Array.isArray(initialData.attachments) ? initialData.attachments : [],
        signatureDataUrl: initialData.signatureDataUrl ?? null
      });
      setErrors([]);
      setAttachmentError("");
      return;
    }

    setForm(emptyBorrowingReceiptData());
    setErrors([]);
    setAttachmentError("");
  }, [record?.id, initialData]);

  useEffect(() => {
    localStorage.setItem(
      BORROWING_FORM_DROPDOWN_STORAGE_KEY,
      JSON.stringify({ dropdownFields, selectOptions })
    );
  }, [dropdownFields, selectOptions]);

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

  const handleFieldChange = (key: BorrowingTextFieldKey, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddSelectOption = (key: BorrowingTextFieldKey, label: string) => {
    const next = window.prompt(`Add new option for ${label}`)?.trim();
    if (!next) return;

    setSelectOptions((prev) => {
      const current = prev[key] ?? [];
      const exists = current.some((option) => option.trim().toLowerCase() === next.toLowerCase());
      if (exists) {
        window.alert(`"${next}" already exists in ${label}.`);
        return prev;
      }

      return {
        ...prev,
        [key]: [...current, next]
      };
    });

    handleFieldChange(key, next);
  };

  const handleRemoveSelectOption = (key: BorrowingTextFieldKey, label: string) => {
    const currentValue = String(form[key] ?? "").trim();
    if (!currentValue) {
      window.alert(`Select a ${label} option first before removing.`);
      return;
    }

    const confirmed = window.confirm(`Remove "${currentValue}" from ${label} options?`);
    if (!confirmed) return;

    setSelectOptions((prev) => {
      const current = prev[key] ?? [];
      const nextOptions = current.filter(
        (option) => option.trim().toLowerCase() !== currentValue.toLowerCase()
      );

      const hasBlankOption = current.some((option) => option === "");
      if (hasBlankOption && !nextOptions.includes("")) {
        nextOptions.unshift("");
      }

      return {
        ...prev,
        [key]: nextOptions
      };
    });

    handleFieldChange(key, "");
  };

  const handleConvertTextboxToDropdown = (key: BorrowingTextFieldKey, label: string) => {
    if (dropdownFields[key]) {
      return;
    }

    const rawOptions = window
      .prompt(`Enter dropdown options for ${label} (comma-separated)`)
      ?.trim();

    if (!rawOptions) {
      return;
    }

    const parsedOptions = rawOptions
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    if (parsedOptions.length === 0) {
      window.alert("Please provide at least one valid option.");
      return;
    }

    const uniqueOptions = Array.from(new Set(parsedOptions));

    setSelectOptions((prev) => ({
      ...prev,
      [key]: ["", ...uniqueOptions]
    }));

    setDropdownFields((prev) => ({
      ...prev,
      [key]: true
    }));

    const currentValue = String(form[key] ?? "").trim();
    const hasCurrentValue = uniqueOptions.some(
      (option) => option.toLowerCase() === currentValue.toLowerCase()
    );

    if (!hasCurrentValue) {
      handleFieldChange(key, "");
    }
  };

  const validate = () => {
    const nextErrors = REQUIRED_FIELDS
      .filter(({ key }) => !String(form[key] ?? "").trim())
      .map(({ label }) => `${label} is required.`);

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record?.id) {
      window.alert("Please create an IT accountability record first before saving a borrowing receipt.");
      return;
    }
    if (!validate()) return;
    try {
      await onSave(record.id, form);
      setForm(emptyBorrowingReceiptData());
      setErrors([]);
    } catch {
      window.alert("Failed to save borrowing receipt. Please try again.");
    }
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2> Create Borrowing Receipt Form</h2>
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

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field">
          <span>Borrowing No. *</span>
          {dropdownFields.borrowingNo ? (
            <div className="field-select-wrap">
              <select
                value={form.borrowingNo}
                onChange={(event) => handleFieldChange("borrowingNo", event.target.value)}
              >
                {(selectOptions.borrowingNo ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Borrowing No."}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Borrowing No. option"
                aria-label="Add Borrowing No. option"
                onClick={() => handleAddSelectOption("borrowingNo", "Borrowing No.")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Borrowing No. option"
                aria-label="Remove selected Borrowing No. option"
                onClick={() => handleRemoveSelectOption("borrowingNo", "Borrowing No.")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.borrowingNo}
                onChange={(event) => handleFieldChange("borrowingNo", event.target.value)}
                placeholder="BR-2026-0001"
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Borrowing No. to dropdown"
                aria-label="Convert Borrowing No. to dropdown"
                onClick={() => handleConvertTextboxToDropdown("borrowingNo", "Borrowing No.")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Date Borrowed *</span>
          <input
            type="date"
            value={form.dateBorrowed}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, dateBorrowed: event.target.value }))
            }
            required
          />
        </label>

        <label className="field">
          <span>Full Name *</span>
          {dropdownFields.borrowerName ? (
            <div className="field-select-wrap">
              <select
                value={form.borrowerName}
                onChange={(event) => handleFieldChange("borrowerName", event.target.value)}
              >
                {(selectOptions.borrowerName ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Full Name"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Full Name option"
                aria-label="Add Full Name option"
                onClick={() => handleAddSelectOption("borrowerName", "Full Name")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Full Name option"
                aria-label="Remove selected Full Name option"
                onClick={() => handleRemoveSelectOption("borrowerName", "Full Name")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.borrowerName}
                onChange={(event) => handleFieldChange("borrowerName", event.target.value)}
                placeholder="Borrower full name"
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Full Name to dropdown"
                aria-label="Convert Full Name to dropdown"
                onClick={() => handleConvertTextboxToDropdown("borrowerName", "Full Name")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Device Type</span>
          <div className="field-select-wrap">
            <select
              value={form.deviceType}
              onChange={(event) => handleFieldChange("deviceType", event.target.value)}
            >
              {(selectOptions.deviceType ?? DEVICE_TYPE_OPTIONS).map((option) => (
                <option key={option} value={option}>
                  {option || "Select Device Type"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="field-select-add-btn"
              title="Add Device Type option"
              aria-label="Add Device Type option"
              onClick={() => handleAddSelectOption("deviceType", "Device Type")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              +
            </button>
            <button
              type="button"
              className="field-select-remove-btn"
              title="Remove selected Device Type option"
              aria-label="Remove selected Device Type option"
              onClick={() => handleRemoveSelectOption("deviceType", "Device Type")}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              -
            </button>
          </div>
        </label>

        <label className="field">
          <span>Expected Return Date *</span>
          <input
            type="date"
            value={form.expectedReturnDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, expectedReturnDate: event.target.value }))
            }
            required
          />
        </label>

        <label className="field">
          <span>Purpose *</span>
          {dropdownFields.purpose ? (
            <div className="field-select-wrap">
              <select
                value={form.purpose}
                onChange={(event) => handleFieldChange("purpose", event.target.value)}
              >
                {(selectOptions.purpose ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Purpose"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Purpose option"
                aria-label="Add Purpose option"
                onClick={() => handleAddSelectOption("purpose", "Purpose")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Purpose option"
                aria-label="Remove selected Purpose option"
                onClick={() => handleRemoveSelectOption("purpose", "Purpose")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.purpose}
                onChange={(event) => handleFieldChange("purpose", event.target.value)}
                placeholder="Official business / temporary deployment"
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Purpose to dropdown"
                aria-label="Convert Purpose to dropdown"
                onClick={() => handleConvertTextboxToDropdown("purpose", "Purpose")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Contact *</span>
          {dropdownFields.contact ? (
            <div className="field-select-wrap">
              <select
                value={form.contact}
                onChange={(event) => handleFieldChange("contact", event.target.value)}
              >
                {(selectOptions.contact ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Contact"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Contact option"
                aria-label="Add Contact option"
                onClick={() => handleAddSelectOption("contact", "Contact")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Contact option"
                aria-label="Remove selected Contact option"
                onClick={() => handleRemoveSelectOption("contact", "Contact")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.contact}
                onChange={(event) => handleFieldChange("contact", event.target.value)}
                placeholder="Email or mobile"
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Contact to dropdown"
                aria-label="Convert Contact to dropdown"
                onClick={() => handleConvertTextboxToDropdown("contact", "Contact")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Accessories Included</span>
          {dropdownFields.accessoriesIncluded ? (
            <div className="field-select-wrap">
              <select
                value={form.accessoriesIncluded}
                onChange={(event) => handleFieldChange("accessoriesIncluded", event.target.value)}
              >
                {(selectOptions.accessoriesIncluded ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Accessories Included"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Accessories Included option"
                aria-label="Add Accessories Included option"
                onClick={() => handleAddSelectOption("accessoriesIncluded", "Accessories Included")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Accessories Included option"
                aria-label="Remove selected Accessories Included option"
                onClick={() =>
                  handleRemoveSelectOption("accessoriesIncluded", "Accessories Included")
                }
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.accessoriesIncluded}
                onChange={(event) => handleFieldChange("accessoriesIncluded", event.target.value)}
                placeholder="Charger, bag, mouse"
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Accessories Included to dropdown"
                aria-label="Convert Accessories Included to dropdown"
                onClick={() =>
                  handleConvertTextboxToDropdown("accessoriesIncluded", "Accessories Included")
                }
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Requested By *</span>
          {dropdownFields.requestedBy ? (
            <div className="field-select-wrap">
              <select
                value={form.requestedBy}
                onChange={(event) => handleFieldChange("requestedBy", event.target.value)}
              >
                {(selectOptions.requestedBy ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Requested By"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Requested By option"
                aria-label="Add Requested By option"
                onClick={() => handleAddSelectOption("requestedBy", "Requested By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Requested By option"
                aria-label="Remove selected Requested By option"
                onClick={() => handleRemoveSelectOption("requestedBy", "Requested By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.requestedBy}
                onChange={(event) => handleFieldChange("requestedBy", event.target.value)}
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Requested By to dropdown"
                aria-label="Convert Requested By to dropdown"
                onClick={() => handleConvertTextboxToDropdown("requestedBy", "Requested By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Approved By *</span>
          {dropdownFields.approvedBy ? (
            <div className="field-select-wrap">
              <select
                value={form.approvedBy}
                onChange={(event) => handleFieldChange("approvedBy", event.target.value)}
              >
                {(selectOptions.approvedBy ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Approved By"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Approved By option"
                aria-label="Add Approved By option"
                onClick={() => handleAddSelectOption("approvedBy", "Approved By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Approved By option"
                aria-label="Remove selected Approved By option"
                onClick={() => handleRemoveSelectOption("approvedBy", "Approved By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.approvedBy}
                onChange={(event) => handleFieldChange("approvedBy", event.target.value)}
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Approved By to dropdown"
                aria-label="Convert Approved By to dropdown"
                onClick={() => handleConvertTextboxToDropdown("approvedBy", "Approved By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Released By (IT/Warehouse) *</span>
          {dropdownFields.releasedBy ? (
            <div className="field-select-wrap">
              <select
                value={form.releasedBy}
                onChange={(event) => handleFieldChange("releasedBy", event.target.value)}
              >
                {(selectOptions.releasedBy ?? [""]).map((option) => (
                  <option key={option} value={option}>
                    {option || "Select Released By"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="field-select-add-btn"
                title="Add Released By option"
                aria-label="Add Released By option"
                onClick={() => handleAddSelectOption("releasedBy", "Released By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                +
              </button>
              <button
                type="button"
                className="field-select-remove-btn"
                title="Remove selected Released By option"
                aria-label="Remove selected Released By option"
                onClick={() => handleRemoveSelectOption("releasedBy", "Released By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                -
              </button>
            </div>
          ) : (
            <div className="field-input-wrap">
              <input
                value={form.releasedBy}
                onChange={(event) => handleFieldChange("releasedBy", event.target.value)}
                required
              />
              <button
                type="button"
                className="field-convert-btn"
                title="Convert Released By to dropdown"
                aria-label="Convert Released By to dropdown"
                onClick={() => handleConvertTextboxToDropdown("releasedBy", "Released By")}
                style={{ display: isEditMode ? "block" : "none" }}
              >
                v
              </button>
            </div>
          )}
        </label>

        <label className="field">
          <span>Release Date/Time *</span>
          <input
            type="datetime-local"
            value={form.releaseDateTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, releaseDateTime: event.target.value }))
            }
            required
          />
        </label>

        <label className="field field-span">
          <span>Damage / Missing Items</span>
          <textarea
            rows={3}
            value={form.damageOrMissingItems}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, damageOrMissingItems: event.target.value }))
            }
            placeholder="Leave blank if none"
          />
        </label>

        <label className="field field-span">
          <span>Return Remarks</span>
          <textarea
            rows={3}
            value={form.returnRemarks}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, returnRemarks: event.target.value }))
            }
            placeholder="Condition and notes upon return"
          />
        </label>

        <div className="field field-span">
          <span>Attachments</span>
          <div className="attachments-panel" style={{ marginTop: "6px" }}>
            <p className="helper-text attachments-helper" style={{ marginBottom: "8px" }}>
              Upload signed forms, device photos, or supporting docs. Allowed: PDF, PNG, JPG. Max 2 MB each, up to 5 files.
            </p>

            <label className="attachment-upload" htmlFor="borrowing-attachments">
              <input
                id="borrowing-attachments"
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
          </div>
        </div>

        <div className="field field-span">
          <span>Signature</span>
          <div style={{ marginTop: "6px" }}>
            <SignaturePad
              label="Borrower Signature"
              existingSignature={form.signatureDataUrl}
              onSave={(signatureDataUrl) => {
                setForm((prev) => ({
                  ...prev,
                  signatureDataUrl
                }));
              }}
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit">Save Borrowing Receipt</button>
        </div>
      </form>
    </section>
  );
};
