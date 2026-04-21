import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DeliveryReceiptDocumentAttachment,
  DeliveryReceiptRecord
} from "../types/deliveryReceipt";

interface DeliveryReceiptFormProps {
  editingRecord: DeliveryReceiptRecord | null;
  onSave: (record: Omit<DeliveryReceiptRecord, "id" | "createdAt" | "updatedAt">) => void;
  onCancelEdit: () => void;
  currentUserLabel?: string;
  itemOptionsFromAccountability?: string[];
}

type DeliveryReceiptState = {
  inputBy: string;
  item: string;
  customItemName: string;
  proofOfPurchaseName: string;
  poAttachment: DeliveryReceiptDocumentAttachment | null;
  contractAttachment: DeliveryReceiptDocumentAttachment | null;
  purchaseNumber: string;
  supplier: string;
  deliveryDate: string;
  warranty: string;
  itemDescription: string;
  otherDetails: string;
};

const emptyState = (): DeliveryReceiptState => ({
  inputBy: "",
  item: "",
  customItemName: "",
  proofOfPurchaseName: "",
  poAttachment: null,
  contractAttachment: null,
  purchaseNumber: "",
  supplier: "",
  deliveryDate: "",
  warranty: "",
  itemDescription: "",
  otherDetails: ""
});

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_DELIVERY_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png"
]);
const ACCEPTED_DELIVERY_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

const buildProofOfPurchaseName = (
  poAttachment: DeliveryReceiptDocumentAttachment | null | undefined,
  contractAttachment: DeliveryReceiptDocumentAttachment | null | undefined
) => {
  const parts: string[] = [];
  if (poAttachment?.name) {
    parts.push(`PO: ${poAttachment.name}`);
  }
  if (contractAttachment?.name) {
    parts.push(`Contract: ${contractAttachment.name}`);
  }
  return parts.join(" | ");
};

export function DeliveryReceiptForm({
  editingRecord,
  onSave,
  onCancelEdit,
  currentUserLabel,
  itemOptionsFromAccountability = []
}: DeliveryReceiptFormProps) {
  const [form, setForm] = useState<DeliveryReceiptState>(emptyState());
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOtherItemDialog, setShowOtherItemDialog] = useState(false);
  const [otherItemDraft, setOtherItemDraft] = useState("");
  const [previousItem, setPreviousItem] = useState("");
  const [previousCustomItemName, setPreviousCustomItemName] = useState("");
  const [attachmentError, setAttachmentError] = useState("");

  const itemOptions = useMemo(() => {
    const defaults = ["Desktop", "Laptop", "Tablet", "Ipad"];
    const merged = Array.from(
      new Set([
        ...defaults,
        ...itemOptionsFromAccountability
          .map((item) => item.trim())
          .filter(Boolean)
      ])
    ).sort((a, b) => a.localeCompare(b));

    return [...merged.filter((item) => item.toLowerCase() !== "others"), "Others"];
  }, [itemOptionsFromAccountability]);

  const shouldSuggestMsOffice = useMemo(() => {
    const normalizedItem = form.item.trim().toLowerCase();
    return normalizedItem === "desktop" || normalizedItem === "laptop";
  }, [form.item]);

  useEffect(() => {
    if (!editingRecord) {
      setForm({ ...emptyState(), inputBy: currentUserLabel ?? "" });
      setIsEditMode(false);
      return;
    }

    setForm({
      inputBy: editingRecord.inputBy ?? currentUserLabel ?? "",
      item: editingRecord.item ?? editingRecord.invoiceNumber ?? "",
      customItemName: editingRecord.customItemName ?? "",
      proofOfPurchaseName: editingRecord.proofOfPurchaseName ?? "",
      poAttachment: editingRecord.poAttachment ?? null,
      contractAttachment: editingRecord.contractAttachment ?? null,
      purchaseNumber: editingRecord.purchaseNumber ?? "",
      supplier: editingRecord.supplier ?? "",
      deliveryDate: editingRecord.deliveryDate ?? "",
      warranty: editingRecord.warranty ?? "",
      itemDescription: editingRecord.itemDescription ?? "",
      otherDetails: editingRecord.otherDetails ?? ""
    });
    setAttachmentError("");
    setIsEditMode(false);
  }, [editingRecord, currentUserLabel]);

  const canEdit = !editingRecord || isEditMode;

  const handleChange = (key: keyof DeliveryReceiptState, value: string) => {
    if (key === "item") {
      if (value === "Others") {
        setPreviousItem(form.item);
        setPreviousCustomItemName(form.customItemName);
        setOtherItemDraft(form.customItemName);
        setForm((prev) => ({
          ...prev,
          item: value
        }));
        setShowOtherItemDialog(true);
        return;
      }

      setForm((prev) => ({
        ...prev,
        item: value,
        customItemName: ""
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirmOtherItem = () => {
    if (!otherItemDraft.trim()) {
      window.alert("Please specify the item name when selecting Others.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      item: "Others",
      customItemName: otherItemDraft.trim()
    }));
    setShowOtherItemDialog(false);
  };

  const handleCancelOtherItem = () => {
    setForm((prev) => ({
      ...prev,
      item: previousItem,
      customItemName: previousCustomItemName
    }));
    setShowOtherItemDialog(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingRecord && !isEditMode) {
      window.alert("Click Edit to modify this record.");
      return;
    }

    if (!form.item.trim() || !form.purchaseNumber.trim()) {
      window.alert("Item and Purchase Number are required.");
      return;
    }

    if (form.item === "Others" && !form.customItemName.trim()) {
      window.alert("Please specify the item name when selecting Others.");
      return;
    }

    if (!form.poAttachment || !form.contractAttachment) {
      window.alert("Please upload both PO and Contract files.");
      return;
    }

    onSave({
      inputBy: form.inputBy.trim(),
      item: form.item.trim(),
      customItemName: form.item === "Others" ? form.customItemName.trim() : "",
      proofOfPurchaseName: buildProofOfPurchaseName(form.poAttachment, form.contractAttachment),
      poAttachment: form.poAttachment,
      contractAttachment: form.contractAttachment,
      purchaseNumber: form.purchaseNumber.trim(),
      supplier: form.supplier.trim(),
      deliveryDate: form.deliveryDate,
      warranty: form.warranty.trim(),
      itemDescription: form.itemDescription.trim(),
      otherDetails: form.otherDetails.trim()
    });

    setForm(emptyState());
    setAttachmentError("");
    window.alert(editingRecord ? "Delivery receipt updated successfully!" : "Delivery receipt saved successfully!");
  };

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
    const byMime = ACCEPTED_DELIVERY_FILE_TYPES.has(file.type);
    const lowerName = file.name.toLowerCase();
    const byExtension = ACCEPTED_DELIVERY_EXTENSIONS.some((extension) =>
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
      const nextAttachment: DeliveryReceiptDocumentAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };

      setForm((prev) => {
        const nextPoAttachment = targetField === "poAttachment" ? nextAttachment : prev.poAttachment;
        const nextContractAttachment =
          targetField === "contractAttachment" ? nextAttachment : prev.contractAttachment;

        return {
          ...prev,
          [targetField]: nextAttachment,
          proofOfPurchaseName: buildProofOfPurchaseName(nextPoAttachment, nextContractAttachment)
        };
      });
    } catch {
      setAttachmentError(`${file.name}: failed to process file.`);
    }
  };

  const handleDocumentRemove = (targetField: "poAttachment" | "contractAttachment") => {
    setAttachmentError("");
    setForm((prev) => {
      const nextPoAttachment = targetField === "poAttachment" ? null : prev.poAttachment;
      const nextContractAttachment =
        targetField === "contractAttachment" ? null : prev.contractAttachment;

      return {
        ...prev,
        [targetField]: null,
        proofOfPurchaseName: buildProofOfPurchaseName(nextPoAttachment, nextContractAttachment)
      };
    });
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2>{editingRecord ? "Edit Delivery Receipt" : "Input Delivery Receipt"}</h2>
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
      <p className="helper-text">Fill in item, purchase number, and other delivery details.</p>
      <p className="helper-text">Input by: <strong>{currentUserLabel || form.inputBy || "Unknown user"}</strong></p>
      {isEditMode && (
        <p className="helper-text">Edit mode is enabled. Use the `x` buttons to clear individual fields.</p>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Item</span>
          <div className="field-input-wrap">
            <select
              value={form.item}
              onChange={(event) => handleChange("item", event.target.value)}
              disabled={!canEdit}
            >
              <option value="">Select an item</option>
              {itemOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Item"
              aria-label="Clear Item"
              onClick={() => {
                setForm((prev) => ({ ...prev, item: "", customItemName: "" }));
              }}
              style={{ display: isEditMode ? "block" : "none" }}
            >
              x
            </button>
          </div>
        </label>

        <label className="field">
          <span>Input By</span>
          <div className="field-input-wrap">
            <input
              value={form.inputBy}
              onChange={(event) => handleChange("inputBy", event.target.value)}
              placeholder={currentUserLabel ? `Logged in as ${currentUserLabel}` : "Enter your name or email"}
              disabled={!canEdit}
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Input By"
              aria-label="Clear Input By"
              onClick={() => handleChange("inputBy", "")}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
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

        <label className="field">
          <span>Other Details</span>
          <div className="field-input-wrap">
            <textarea
              className="delivery-other-details"
              value={form.otherDetails}
              onChange={(event) => handleChange("otherDetails", event.target.value)}
              rows={1}
              placeholder={shouldSuggestMsOffice ? "Ms Office" : undefined}
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              disabled={!canEdit}
            />
            <button
              type="button"
              className="field-convert-btn"
              title="Clear Other Details"
              aria-label="Clear Other Details"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setForm((prev) => ({ ...prev, otherDetails: "" }));
              }}
              style={{ display: isEditMode ? "block" : "none", alignSelf: "start" }}
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
              disabled={!canEdit}
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

        <section className="field field-span attachments-panel" aria-label="Delivery receipt documents section">
          <span>Proof of Purchase Documents *</span>
          <p className="helper-text attachments-helper">
            Upload both PO and Contract files. Allowed: PDF, DOC, DOCX, JPG, PNG. Max 5 MB per file.
          </p>

          <div className="license-doc-grid">
            <div>
              <label className="attachment-upload" htmlFor="delivery-po-attachment">
                <input
                  id="delivery-po-attachment"
                  className="attachment-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    void handleDocumentUpload("poAttachment", event.target.files);
                    event.target.value = "";
                  }}
                  disabled={!canEdit}
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
                    {canEdit && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleDocumentRemove("poAttachment")}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="attachment-upload" htmlFor="delivery-contract-attachment">
                <input
                  id="delivery-contract-attachment"
                  className="attachment-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    void handleDocumentUpload("contractAttachment", event.target.files);
                    event.target.value = "";
                  }}
                  disabled={!canEdit}
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
                    {canEdit && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleDocumentRemove("contractAttachment")}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {attachmentError && <p className="attachment-error">{attachmentError}</p>}
        </section>

        <div className="actions">
          <button type="submit" disabled={!canEdit}>
            {editingRecord ? "Update Delivery Receipt" : "Save Delivery Receipt"}
          </button>
          {editingRecord && (
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => setForm({ ...emptyState(), inputBy: currentUserLabel ?? "" })}
          >
            Reset
          </button>
        </div>
      </form>

      {showOtherItemDialog && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={handleCancelOtherItem}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="other-item-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)" }}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="other-item-dialog-title">Specify Other Equipment Type</h3>
                <p className="helper-text">Provide equipment type for Item = Others.</p>
              </div>
            </header>

            <div className="history-modal-body">
              <label className="field">
                <span>Equipment Type *</span>
                <input
                  type="text"
                  value={otherItemDraft}
                  onChange={(event) => setOtherItemDraft(event.target.value)}
                  autoFocus
                />
              </label>

              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="ghost" onClick={handleCancelOtherItem}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmOtherItem}>
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
