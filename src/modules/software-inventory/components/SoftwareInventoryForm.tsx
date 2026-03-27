import { FormEvent, useEffect, useState } from "react";
import {
  SoftwareInventoryRecord,
  SOFTWARE_REQUIRED_FIELDS,
  emptySoftwareRecord
} from "../types/softwareInventory";
import { SignaturePad } from "../../accountability/components/SignaturePad";

interface SoftwareInventoryFormProps {
  editingRecord: SoftwareInventoryRecord | null;
  onSubmit: (record: SoftwareInventoryRecord) => Promise<void>;
  softwareNameAvailability?: Record<string, number>;
  projectOptionsFromAccountability?: string[];
  departmentOptionsFromAccountability?: string[];
  onCancelEdit: () => void;
}

type FieldDef =
  | { key: keyof SoftwareInventoryRecord; label: string; type?: string }
  | {
      key: keyof SoftwareInventoryRecord;
      label: string;
      type: "select";
      options: string[];
    };

const labels: FieldDef[] = [
  { key: "formNo", label: "Form No." },
  {
    key: "softwareName",
    label: "Software Name",
    type: "select",
    options: ["", "AEC", "AutoCad LT", "Bluebeam", "Primavera", "Procore", "SAP"]
  },
  { key: "softwareVersion", label: "Software Version" },
  { key: "vendor", label: "Vendor / Publisher" },
  { key: "licenseType", label: "License Type / Model" },
  { key: "licenseReference", label: "License / Reference No." },
  { key: "seatsPurchased", label: "Seats Purchased", type: "number" },
  { key: "seatsUsed", label: "Seats Used", type: "number" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "employeeId", label: "Employee ID" },
  { key: "department", label: "Department", type: "select", options: [""] },
  { key: "project", label: "Project" },
  { key: "hostname", label: "Device Hostname" },
  { key: "requestTicket", label: "Request Ticket No." },
  { key: "preparedBy", label: "Prepared By" },
  { key: "approvedBy", label: "Approved By" },
  { key: "expiryDate", label: "Expiry / Renewal Date", type: "date" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["", "Active", "Expiring Soon", "Expired", "Suspended"]
  },
  { key: "remarks", label: "Remarks" }
];
const SOFTWARE_FORM_DROPDOWN_STORAGE_KEY = "ias:software-form:dropdown-config";
const EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY = "ias:employee-form:dropdown-config";

const readProjectOptionsFromEmployeeForm = () => {
  try {
    const raw = localStorage.getItem(EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY);
    if (!raw) return [] as string[];

    const parsed = JSON.parse(raw) as {
      selectOptions?: Record<string, string[]>;
    };

    return parsed.selectOptions?.project?.filter(Boolean) ?? [];
  } catch {
    return [] as string[];
  }
};

const readDepartmentOptionsFromEmployeeForm = () => {
  try {
    const raw = localStorage.getItem(EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY);
    if (!raw) return [] as string[];

    const parsed = JSON.parse(raw) as {
      selectOptions?: Record<string, string[]>;
    };

    return parsed.selectOptions?.department?.filter(Boolean) ?? [];
  } catch {
    return [] as string[];
  }
};

const buildSoftwareDefaultDropdownFields = () => {
  const initial: Record<string, boolean> = {};
  labels.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = true;
    }
  });
  return initial;
};

const buildSoftwareDefaultSelectOptions = () => {
  const initial: Record<string, string[]> = {};
  const projectOptionsFromEmployeeForm = readProjectOptionsFromEmployeeForm();
  const departmentOptionsFromEmployeeForm = readDepartmentOptionsFromEmployeeForm();
  labels.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = [...(field as { options: string[] }).options];
    }
  });

  initial.department = Array.from(
    new Set([...(initial.department ?? [""]), ...departmentOptionsFromEmployeeForm])
  ).filter((option) => option === "" || Boolean(option.trim()));

  initial.project = Array.from(new Set([...(initial.project ?? [""]), ...projectOptionsFromEmployeeForm]))
    .filter((option) => option === "" || Boolean(option.trim()));

  return initial;
};

const loadSoftwareDropdownConfig = () => {
  const defaultDropdownFields = buildSoftwareDefaultDropdownFields();
  const defaultSelectOptions = buildSoftwareDefaultSelectOptions();

  try {
    const raw = localStorage.getItem(SOFTWARE_FORM_DROPDOWN_STORAGE_KEY);
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
      dropdownFields: {
        ...defaultDropdownFields,
        ...(parsed.dropdownFields ?? {}),
        project: false
      },
      selectOptions: {
        ...defaultSelectOptions,
        ...(parsed.selectOptions ?? {}),
        // Keep Software Name choices fixed to defaults to avoid bulk/multi-software sync pollution.
        softwareName: [...(defaultSelectOptions.softwareName ?? [""])]
      }
    };
  } catch {
    return {
      dropdownFields: defaultDropdownFields,
      selectOptions: defaultSelectOptions
    };
  }
};

export const SoftwareInventoryForm = ({
  editingRecord,
  softwareNameAvailability = {},
  projectOptionsFromAccountability = [],
  departmentOptionsFromAccountability = [],
  onSubmit,
  onCancelEdit
}: SoftwareInventoryFormProps) => {
  const persistedDropdownConfig = loadSoftwareDropdownConfig();
  const [form, setForm] = useState<SoftwareInventoryRecord>(emptySoftwareRecord());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dropdownFields, setDropdownFields] = useState<Record<string, boolean>>(
    persistedDropdownConfig.dropdownFields
  );
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>(
    persistedDropdownConfig.selectOptions
  );

  useEffect(() => {
    if (!editingRecord) {
      setForm(emptySoftwareRecord());
      setErrors([]);
      return;
    }

    const base = emptySoftwareRecord();
    setForm({
      ...base,
      ...editingRecord,
      preparedSignature: editingRecord.preparedSignature ?? base.preparedSignature,
      approvedSignature: editingRecord.approvedSignature ?? base.approvedSignature
    });
    setErrors([]);
  }, [editingRecord]);

  useEffect(() => {
    localStorage.setItem(
      SOFTWARE_FORM_DROPDOWN_STORAGE_KEY,
      JSON.stringify({ dropdownFields, selectOptions })
    );
  }, [dropdownFields, selectOptions]);

  useEffect(() => {
    setSelectOptions((prev) => {
      const normalize = (options: string[]) =>
        Array.from(new Set(options.map((item) => item.trim()).filter((item) => item === "" || Boolean(item))));

      return {
        ...prev,
        project: normalize([...(prev.project ?? [""]), ...projectOptionsFromAccountability]),
        department: normalize([...(prev.department ?? [""]), ...departmentOptionsFromAccountability])
      };
    });
  }, [projectOptionsFromAccountability, departmentOptionsFromAccountability]);

  const handleSignatureSave = (
    role: "prepared" | "approved",
    signatureDataUrl: string
  ) => {
    const field = role === "prepared" ? "preparedSignature" : "approvedSignature";
    const signatureName =
      role === "prepared" ? form.preparedBy.trim() : form.approvedBy.trim();

    setForm((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] ?? { name: "", signatureDataUrl: null, date: "" }),
        name: signatureName,
        signatureDataUrl,
        date: new Date().toISOString().split("T")[0]
      }
    }));
  };

  const handleAddSelectOption = (key: keyof SoftwareInventoryRecord, label: string) => {
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

  const handleRemoveSelectOption = (key: keyof SoftwareInventoryRecord, label: string) => {
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

  const handleConvertTextboxToDropdown = (key: keyof SoftwareInventoryRecord, label: string) => {
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

  const validate = () => {
    const nextErrors: string[] = [];

    SOFTWARE_REQUIRED_FIELDS.forEach((field) => {
      if (!String(form[field] ?? "").trim()) {
        nextErrors.push(`${field} is required.`);
      }
    });

    const purchased = Number(form.seatsPurchased || 0);
    const used = Number(form.seatsUsed || 0);
    if (used > purchased && purchased > 0) {
      nextErrors.push("seatsUsed cannot be greater than seatsPurchased.");
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
        setForm(emptySoftwareRecord());
      }
      setErrors([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2>{editingRecord ? "Edit Software Inventory Form" : "Create Software Inventory Form"}</h2>
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
      <p className="helper-text">
        Encode software details, then use Records to print or download the generated form.
      </p>
      

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
          const required = SOFTWARE_REQUIRED_FIELDS.includes(key);
          const isSelect = Boolean(dropdownFields[String(key)]);
          const isRemarks = key === "remarks";
          const options = isSelect
            ? (
                selectOptions[String(key)] ??
                (fieldDef.type === "select" ? (fieldDef as { options: string[] }).options : [""])
              )
            : [];

          return (
            <label key={key} className={`field${isRemarks ? " field-span" : ""}`}>
              <span>
                {label}
                {required ? " *" : ""}
              </span>

              {isSelect ? (
                <div className="field-select-wrap" style={{ position: "relative" }}>
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
                  {key === "softwareName" && String(form[key] ?? "").trim() && (
                    <div
                      style={{
                        position: "absolute",
                        right: "32px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#999",
                        fontSize: "13px",
                        pointerEvents: "none",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {typeof softwareNameAvailability[String(form[key] ?? "")] === "number"
                        ? `${softwareNameAvailability[String(form[key] ?? "")]} available`
                        : ""}
                    </div>
                  )}
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
              ) : isRemarks ? (
                <textarea
                  value={String(form[key] ?? "")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [key]: event.target.value
                    }))
                  }
                  placeholder={label}
                  rows={3}
                />
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
                    placeholder={
                      key === "licenseType"
                        ? "e.g. Named User, Concurrent User, Engine/Package"
                        : label
                    }
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

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingRecord
                ? "Update Software Form"
                : "Save Software Form"}
          </button>

          {editingRecord && (
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>

        <section
          className="field field-span software-signature-panel"
          style={{
            padding: "16px",
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
            borderLeft: "4px solid #3b82f6"
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 600 }}>
            Signature Information (Optional)
          </h3>
          <p className="helper-text" style={{ marginBottom: "16px" }}>
            Signatures will appear in the printable software inventory form.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
              gap: "12px"
            }}
          >
            <SignaturePad
              label="Prepared By Signature"
              existingSignature={form.preparedSignature?.signatureDataUrl}
              onSave={(sig) => handleSignatureSave("prepared", sig)}
            />

            <SignaturePad
              label="Approved By Signature"
              existingSignature={form.approvedSignature?.signatureDataUrl}
              onSave={(sig) => handleSignatureSave("approved", sig)}
            />
          </div>
        </section>
      </form>
    </section>
  );
};
