import { FormEvent, useEffect, useMemo, useState } from "react";
import { DisposalRecord, emptyDisposalRecord } from "../types/disposal";

interface DisposalFormProps {
  editingRecord: DisposalRecord | null;
  onSubmit: (record: DisposalRecord) => Promise<void> | void;
  onCancelEdit: () => void;
}

type DisposalField =
  | { key: keyof DisposalRecord; label: string; type?: string }
  | { key: keyof DisposalRecord; label: string; type: "select"; options: string[] };

const fields: DisposalField[] = [
  { key: "disposalNo", label: "UMAC No." },
  {
    key: "department",
    label: "Department",
    type: "select",
    options: ["", "IT", "Procore", "QS", "BIMD", "AMLD", "PHR", "Finance"]
  },
  { key: "project", label: "Project" },
  {
    key: "deviceType",
    label: "Device Type",
    type: "select",
    options: ["", "Desktop", "Laptop", "Tablet", "Ipad", "Others"]
  },
  { key: "serialNumber", label: "Serial Number" },
  { key: "assetNumber", label: "Asset Number" },
  {
    key: "conditionAtDisposal",
    label: "Condition at Disposal",
    type: "select",
    options: ["", "Working", "For Repair", "Beyond Repair", "Lost"]
  },
  {
    key: "disposalReason",
    label: "Disposal Reason",
    type: "select",
    options: ["", "Obsolete", "Damaged", "Lost", "Beyond Economic Repair", "Upgrade / Replacement"]
  },
  {
    key: "recommendedAction",
    label: "Recommended Action",
    type: "select",
    options: ["", "Recycle", "Scrap", "Auction", "Donate", "Return to Vendor"]
  },
  {
    key: "dataWipeRequired",
    label: "Data Wipe Required",
    type: "select",
    options: ["No", "Yes"]
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Draft", "For Review", "For Approval", "Approved", "Disposed", "Rejected"]
  },
  { key: "requestedBy", label: "Requested By" },
  { key: "approvedBy", label: "Approved By" },
  { key: "requestedDate", label: "Requested Date", type: "date" },
  { key: "disposalDate", label: "Disposal Date", type: "date" }
];

const REQUIRED_KEYS: Array<keyof DisposalRecord> = [
  "deviceType",
  "serialNumber",
  "assetNumber",
  "disposalReason",
  "recommendedAction",
  "requestedBy",
  "requestedDate"
];
const DISPOSAL_FORM_DROPDOWN_STORAGE_KEY = "ias:disposal-form:dropdown-config";

const buildDisposalDefaultDropdownFields = () => {
  const initial: Record<string, boolean> = {};
  fields.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = true;
    }
  });
  return initial;
};

const buildDisposalDefaultSelectOptions = () => {
  const initial: Record<string, string[]> = {};
  fields.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = [...(field as { options: string[] }).options];
    }
  });
  return initial;
};

const loadDisposalDropdownConfig = () => {
  const defaultDropdownFields = buildDisposalDefaultDropdownFields();
  const defaultSelectOptions = buildDisposalDefaultSelectOptions();

  try {
    const raw = localStorage.getItem(DISPOSAL_FORM_DROPDOWN_STORAGE_KEY);
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

export const DisposalForm = ({ editingRecord, onSubmit, onCancelEdit }: DisposalFormProps) => {
  const persistedDropdownConfig = loadDisposalDropdownConfig();
  const [form, setForm] = useState<DisposalRecord>(emptyDisposalRecord());
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dropdownFields, setDropdownFields] = useState<Record<string, boolean>>(
    persistedDropdownConfig.dropdownFields
  );
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>(
    persistedDropdownConfig.selectOptions
  );

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptyDisposalRecord());
      setErrors([]);
      return;
    }

    setForm(editingRecord);
    setErrors([]);
  }, [editingRecord]);

  useEffect(() => {
    localStorage.setItem(
      DISPOSAL_FORM_DROPDOWN_STORAGE_KEY,
      JSON.stringify({ dropdownFields, selectOptions })
    );
  }, [dropdownFields, selectOptions]);

  const preview = useMemo(() => {
    if (!form.disposalNo.trim() && !form.deviceType.trim()) {
      return "-";
    }
    return [form.disposalNo, form.deviceType].filter(Boolean).join(" • ");
  }, [form.disposalNo, form.deviceType]);

  const validate = () => {
    const nextErrors: string[] = [];
    REQUIRED_KEYS.forEach((key) => {
      if (!String(form[key] ?? "").trim()) {
        nextErrors.push(`${key} is required.`);
      }
    });

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString();
    try {
      await onSubmit({
        ...form,
        createdAt: form.createdAt || now,
        updatedAt: now
      });

      if (!editingRecord) {
        setForm(emptyDisposalRecord());
      }
    } catch {
      window.alert("Unable to save disposal record right now. Please try again.");
    }
  };

  const handleAddSelectOption = (key: keyof DisposalRecord, label: string) => {
    const next = window.prompt(`Add new option for ${label}`)?.trim();
    if (!next) return;

    setSelectOptions((prev) => {
      const current = prev[String(key)] ?? [];
      const exists = current.some((option) => option.trim().toLowerCase() === next.toLowerCase());
      if (exists) {
        window.alert(`"${next}" already exists in ${label}.`);
        return prev;
      }

      return {
        ...prev,
        [String(key)]: [...current, next]
      };
    });

    setForm((prev) => ({
      ...prev,
      [key]: next
    }));
  };

  const handleRemoveSelectOption = (key: keyof DisposalRecord, label: string) => {
    const currentValue = String(form[key] ?? "").trim();
    if (!currentValue) {
      window.alert(`Select a ${label} option first before removing.`);
      return;
    }

    const confirmed = window.confirm(`Remove "${currentValue}" from ${label} options?`);
    if (!confirmed) return;

    setSelectOptions((prev) => {
      const current = prev[String(key)] ?? [];
      const nextOptions = current.filter(
        (option) => option.trim().toLowerCase() !== currentValue.toLowerCase()
      );

      const hasBlankOption = current.some((option) => option === "");
      if (hasBlankOption && !nextOptions.includes("")) {
        nextOptions.unshift("");
      }

      return {
        ...prev,
        [String(key)]: nextOptions
      };
    });

    setForm((prev) => ({
      ...prev,
      [key]: ""
    }));
  };

  const handleConvertTextboxToDropdown = (key: keyof DisposalRecord, label: string) => {
    const fieldKey = String(key);
    if (dropdownFields[fieldKey]) {
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
      [fieldKey]: ["", ...uniqueOptions]
    }));

    setDropdownFields((prev) => ({
      ...prev,
      [fieldKey]: true
    }));

    const currentValue = String(form[key] ?? "").trim();
    const hasCurrentValue = uniqueOptions.some(
      (option) => option.toLowerCase() === currentValue.toLowerCase()
    );

    if (!hasCurrentValue) {
      setForm((prev) => ({
        ...prev,
        [key]: ""
      }));
    }
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2>{editingRecord ? "Edit Disposal Form" : "Create Disposal Form"}</h2>
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
      <p className="helper-text">Disposal: <strong>{preview}</strong></p>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        {fields.map((field) => {
          const { key, label, type } = field;
          const isSelect = Boolean(dropdownFields[String(key)]);
          const isRequired = REQUIRED_KEYS.includes(key);
          const options = isSelect
            ? (
                selectOptions[String(key)] ??
                (field.type === "select" ? (field as { options: string[] }).options : [""])
              )
            : [];
          return (
            <label key={key} className="field">
              <span>
                {label}
                {isRequired ? " *" : ""}
              </span>

              {isSelect ? (
                <div className="field-select-wrap">
                  <select
                    value={String(form[key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.value
                      }))
                    }
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option || `Select ${label}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="field-select-add-btn"
                    title={`Add ${label} option`}
                    aria-label={`Add ${label} option`}
                    onClick={() => handleAddSelectOption(key, label)}
                    style={{ display: isEditMode ? "block" : "none" }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="field-select-remove-btn"
                    title={`Remove selected ${label} option`}
                    aria-label={`Remove selected ${label} option`}
                    onClick={() => handleRemoveSelectOption(key, label)}
                    style={{ display: isEditMode ? "block" : "none" }}
                  >
                    -
                  </button>
                </div>
              ) : (
                <div className="field-input-wrap">
                  <input
                    type={type ?? "text"}
                    value={String(form[key] ?? "")}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.value
                      }))
                    }
                    placeholder={key === "disposalNo" ? "UMAC" : label}
                  />
                  <button
                    type="button"
                    className="field-convert-btn"
                    title={`Convert ${label} to dropdown`}
                    aria-label={`Convert ${label} to dropdown`}
                    onClick={() => handleConvertTextboxToDropdown(key, label)}
                    style={{ display: isEditMode ? "block" : "none" }}
                  >
                    v
                  </button>
                </div>
              )}
            </label>
          );
        })}

        <label className="field field-span">
          <span>Notes</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                notes: event.target.value
              }))
            }
            placeholder="Add disposal remarks, evidence references, or approval notes..."
          />
        </label>

        <div className="actions">
          <button type="submit">{editingRecord ? "Update Disposal" : "Save Disposal"}</button>
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
