import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AccountabilityAttachment,
  AccountabilityRecord,
  emptyRecord,
  REQUIRED_FIELDS
} from "../types/accountability";
import { SignaturePad } from "./SignaturePad";
import { useSoftwareInventoryRecords } from "../../software-inventory/hooks/useSoftwareInventoryRecords";

interface EmployeeFormProps {
  editingRecord: AccountabilityRecord | null;
  prefillRecord?: AccountabilityRecord | null;
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
    options: ["", "ASB", "MAKATI", "Sloc", "Nloc", "Qc", "East", "Mdbi", "Vismin", "Alcav", "Corporate"]
  },
  {
    key: "employmentStatus",
    label: "Employment Status",
    type: "select",
    options: ["", "Deployed", "Resigned", "Transferred Project"]
  },
  {
    key: "transferDecision",
    label: "Transfer Decision",
    type: "select",
    options: ["", "Device goes with user", "Device stays and is reassigned"]
  },
  { key: "project", label: "Project" },
  { key: "costCenter", label: "Cost Center" },
  { key: "projectLocation", label: "Location of Asset (Project/Address)" },
  { key: "tarf", label: "TARF Reference # (if applicable)" },
  { key: "deviceType", label: "Device Type", type: "select", options: ["", "Desktop", "Laptop", "Tablet", "Ipad", "Others"] },
  { key: "deviceDescription", label: "Description / Device Model" },
  { key: "hostname", label: "Hostname" },
  { key: "serialNumber", label: "Serial Number" },
  { key: "deviceCondition", label: "Device Condition", type: "select", options: ["", "New", "Old", "Aged"] },
  { key: "deviceStatus", label: "Device Status", type: "select", options: ["", "Active", "Defective", "For Disposal", "Deployed"] },
  { key: "deviceAssetNumber", label: "Asset Number (Device)" },
  { key: "monitorModel", label: "Monitor Model" },
  { key: "monitorSerialNumber", label: "Monitor Serial Number" },
  { key: "monitorAssetNumber", label: "Asset Number (Monitor)" },
  { key: "softwareName", label: "Software Application Name" },
  { key: "softwareLicense", label: "Software License / Reference #" },
  { key: "phr", label: "HR/PHR Representative" },
  { key: "amld", label: "AMLD Representative" },
  { key: "it", label: "IT Representative" },
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
const EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY = "ias:employee-form:dropdown-config";
const REMOVED_PROJECT_OPTIONS = new Set([
  "onboarding 2026",
  "arca opcen",
  "avida south pie",
  "erp rollput",
  "erp rollout"
]);
const BULK_SOFTWARE_OPTION_VALUE = "__bulk_software_option__";

const isTransferredEmploymentStatus = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.includes("transfer");
};

const isResignedEmploymentStatus = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.includes("resign");
};

const isDeviceStaysForReassignDecision = (value?: string) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "device stays and is reassigned" || normalized.includes("reassign");
};

const splitDelimitedValues = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim());

const isBulkSoftwareValue = (value: string) => splitDelimitedValues(value).filter(Boolean).length > 1;

const isRemovedProjectOption = (value: string) =>
  REMOVED_PROJECT_OPTIONS.has(value.trim().toLowerCase());

const buildEmployeeDefaultDropdownFields = () => {
  const initial: Record<string, boolean> = {};
  labels.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = true;
    }
  });
  return initial;
};

const buildEmployeeDefaultSelectOptions = () => {
  const initial: Record<string, string[]> = {};
  labels.forEach((field) => {
    if (field.type === "select") {
      initial[String(field.key)] = [...(field as { options: string[] }).options];
    }
  });
  return initial;
};

const loadEmployeeDropdownConfig = () => {
  const defaultDropdownFields = buildEmployeeDefaultDropdownFields();
  const defaultSelectOptions = buildEmployeeDefaultSelectOptions();

  const sanitizeProjectOptions = (options: Record<string, string[]>) => {
        const currentDeviceStatusOptions = options.deviceStatus ?? [];
        const hasBlankDeviceStatus = currentDeviceStatusOptions.includes("");
        const normalizedDeviceStatusOptions = [
          ...(hasBlankDeviceStatus ? [""] : []),
          ...Array.from(
            new Set(
              currentDeviceStatusOptions
                .filter((option) => option.trim() !== "")
                .map((option) => option.trim())
            )
          )
        ];
    const currentProjectOptions = options.project ?? [];
    const cleanedProjectOptions = currentProjectOptions.filter(
      (option) => option === "" || !isRemovedProjectOption(option)
    );

    const currentDeviceConditionOptions = options.deviceCondition ?? [];
    const hasBlank = currentDeviceConditionOptions.includes("");
    const normalizedDeviceConditionOptions = [
      ...(hasBlank ? [""] : []),
      ...Array.from(
        new Set(
          currentDeviceConditionOptions
            .filter((option) => option.trim() !== "")
            .map((option) => option.trim())
        )
      )
    ];

    const ensureOption = (list: string[], option: string) => {
      const exists = list.some((item) => item.toLowerCase() === option.toLowerCase());
      if (!exists) {
        list.push(option);
      }
    };

    ensureOption(normalizedDeviceConditionOptions, "New");
    ensureOption(normalizedDeviceConditionOptions, "Old");
    ensureOption(normalizedDeviceConditionOptions, "Aged");
    ensureOption(normalizedDeviceStatusOptions, "Active");
    ensureOption(normalizedDeviceStatusOptions, "Defective");
    ensureOption(normalizedDeviceStatusOptions, "For Disposal");
    ensureOption(normalizedDeviceStatusOptions, "Deployed");

    return {
      ...options,
      project: cleanedProjectOptions,
      deviceCondition: normalizedDeviceConditionOptions,
      deviceStatus: normalizedDeviceStatusOptions
    };
  };

  try {
    const raw = localStorage.getItem(EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY);
    if (!raw) {
      return {
        dropdownFields: defaultDropdownFields,
        selectOptions: sanitizeProjectOptions(defaultSelectOptions)
      };
    }

    const parsed = JSON.parse(raw) as {
      dropdownFields?: Record<string, boolean>;
      selectOptions?: Record<string, string[]>;
    };

    return {
      dropdownFields: { ...defaultDropdownFields, ...(parsed.dropdownFields ?? {}) },
      selectOptions: sanitizeProjectOptions({ ...defaultSelectOptions, ...(parsed.selectOptions ?? {}) })
    };
  } catch {
    return {
      dropdownFields: defaultDropdownFields,
      selectOptions: sanitizeProjectOptions(defaultSelectOptions)
    };
  }
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

const deriveDeviceConditionFromHostname = (hostname: string): "New" | "Old" | "Aged" | null => {
  const match = hostname.trim().match(/(\d{2})$/);
  if (!match) {
    return null;
  }

  const lastTwoDigits = Number(match[1]);
  if (Number.isNaN(lastTwoDigits)) {
    return null;
  }

  const manufacturedYear = 2000 + lastTwoDigits;
  const age = new Date().getFullYear() - manufacturedYear;

  if (age > 3) {
    return "Aged";
  }

  if (age === 3) {
    return "Old";
  }

  return "New";
};

export const EmployeeForm = ({ editingRecord, prefillRecord = null, onSubmit, onCancelEdit }: EmployeeFormProps) => {
  const persistedDropdownConfig = loadEmployeeDropdownConfig();
  const { records: softwareInventoryRecords } = useSoftwareInventoryRecords();
  const [form, setForm] = useState<AccountabilityRecord>(emptyRecord());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOtherDeviceDialog, setShowOtherDeviceDialog] = useState(false);
  const [otherDeviceDraft, setOtherDeviceDraft] = useState("");
  const [showBulkSoftwareDialog, setShowBulkSoftwareDialog] = useState(false);
  const [bulkSoftwareDrafts, setBulkSoftwareDrafts] = useState<string[]>([""]);
  const [showBulkLicenseDialog, setShowBulkLicenseDialog] = useState(false);
  const [bulkLicenseDrafts, setBulkLicenseDrafts] = useState<string[]>([""]);
  const [previousSoftwareName, setPreviousSoftwareName] = useState("");
  const [previousSoftwareLicense, setPreviousSoftwareLicense] = useState("");
  const [previousDeviceType, setPreviousDeviceType] = useState("");
  const [previousOtherSpecification, setPreviousOtherSpecification] = useState("");
  const [dropdownFields, setDropdownFields] = useState<Record<string, boolean>>(
    persistedDropdownConfig.dropdownFields
  );
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>(
    persistedDropdownConfig.selectOptions
  );

  useEffect(() => {
    const sourceRecord = editingRecord ?? prefillRecord;
    if (!sourceRecord) {
      setForm(emptyRecord());
      setErrors([]);
      return;
    }

    const base = emptyRecord();
    setForm({
      ...base,
      ...sourceRecord,
      attachments: sourceRecord.attachments ?? [],
      assigneeSignature: sourceRecord.assigneeSignature ?? base.assigneeSignature,
      assigneeReturnedSignature: sourceRecord.assigneeReturnedSignature ?? base.assigneeReturnedSignature,
      phrSignature: sourceRecord.phrSignature ?? base.phrSignature,
      amldSignature: sourceRecord.amldSignature ?? base.amldSignature,
      itSignature: sourceRecord.itSignature ?? base.itSignature,
      catoSignature: sourceRecord.catoSignature ?? base.catoSignature
    });
    setErrors([]);
  }, [editingRecord, prefillRecord]);

  useEffect(() => {
    localStorage.setItem(
      EMPLOYEE_FORM_DROPDOWN_STORAGE_KEY,
      JSON.stringify({ dropdownFields, selectOptions })
    );
  }, [dropdownFields, selectOptions]);

  const inventorySoftwareByName = useMemo(() => {
    const map = new Map<string, string>();

    softwareInventoryRecords.forEach((record) => {
      const name = record.softwareName.trim();
      if (!name || isBulkSoftwareValue(name)) {
        return;
      }

      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, record.licenseReference.trim());
      }
    });

    return map;
  }, [softwareInventoryRecords]);

  const softwareNameOptions = useMemo(() => {
    const normalized = softwareInventoryRecords
      .map((record) => record.softwareName.trim())
      .filter((name) => Boolean(name) && !isBulkSoftwareValue(name));

    const uniqueNames = Array.from(new Set(normalized)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    const currentValue = form.softwareName.trim();
    const currentValueIsBulk = isBulkSoftwareValue(currentValue);
    const hasCurrentValue = currentValue
      ? uniqueNames.some((option) => option.toLowerCase() === currentValue.toLowerCase())
      : false;

    return [
      "",
      ...uniqueNames,
      ...(currentValue && !hasCurrentValue && !currentValueIsBulk ? [currentValue] : []),
      BULK_SOFTWARE_OPTION_VALUE
    ];
  }, [softwareInventoryRecords, form.softwareName]);

  const softwareNameSelectValue = useMemo(() => {
    const currentValue = form.softwareName.trim();
    if (!currentValue) {
      return "";
    }

    return isBulkSoftwareValue(currentValue) ? BULK_SOFTWARE_OPTION_VALUE : currentValue;
  }, [form.softwareName]);

  useEffect(() => {
    const derivedDeviceCondition = deriveDeviceConditionFromHostname(form.hostname);
    if (!derivedDeviceCondition) {
      return;
    }

    setForm((prev) =>
      prev.deviceCondition === derivedDeviceCondition
        ? prev
        : {
            ...prev,
            deviceCondition: derivedDeviceCondition
          }
    );
  }, [form.hostname]);

  const isPortableDevice = PORTABLE_DEVICE_TYPES.has(form.deviceType.trim().toLowerCase());
  const isOtherDeviceType = form.deviceType.trim().toLowerCase() === "others";
  const isTransferredProject = isTransferredEmploymentStatus(form.employmentStatus);
  const isResigned = isResignedEmploymentStatus(form.employmentStatus);
  const requiresReturnedSignOff =
    isResigned || (isTransferredProject && isDeviceStaysForReassignDecision(form.transferDecision));

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

    if (isOtherDeviceType && !String(form.otherDeviceSpecification ?? "").trim()) {
      nextErrors.push("please specify the equipment type when Device Type is Others.");
    }

    if (requiresReturnedSignOff) {
      if (!String(form.returnedDate ?? "").trim()) {
        nextErrors.push("return date is required for resigned or transfer-reassign records.");
      }

      if (!form.assigneeReturnedSignature?.signatureDataUrl) {
        nextErrors.push(
          "Assignee - Returned on signature is required for resigned or transfer-reassign records."
        );
      }
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
    if (key === "employmentStatus") {
      setForm((prev) => ({
        ...prev,
        employmentStatus: value,
        transferDecision: isTransferredEmploymentStatus(value) ? prev.transferDecision : ""
      }));
      return;
    }

    if (key === "hostname") {
      const derivedDeviceCondition = deriveDeviceConditionFromHostname(value);
      setForm((prev) => ({
        ...prev,
        hostname: value,
        deviceCondition: derivedDeviceCondition ?? prev.deviceCondition
      }));
      return;
    }

    if (key === "deviceType") {
      const nextDevice = value.trim().toLowerCase();
      if (PORTABLE_DEVICE_TYPES.has(nextDevice)) {
        setForm((prev) => {
          const next = { ...prev, deviceType: value, otherDeviceSpecification: "" };
          EXCLUDED_ON_PORTABLE.forEach((fieldKey) => {
            next[fieldKey] = "" as never;
          });
          return next;
        });
        return;
      }

      if (nextDevice === "others") {
        setPreviousDeviceType(form.deviceType);
        setPreviousOtherSpecification(String(form.otherDeviceSpecification ?? ""));
        setOtherDeviceDraft(String(form.otherDeviceSpecification ?? ""));
        setForm((prev) => ({
          ...prev,
          deviceType: value
        }));
        setShowOtherDeviceDialog(true);
        return;
      }

      setForm((prev) => ({
        ...prev,
        deviceType: value,
        otherDeviceSpecification: ""
      }));
      return;
    }

    if (key === "softwareName") {
      if (value === BULK_SOFTWARE_OPTION_VALUE) {
        handleOpenBulkSoftwareDialog();
        return;
      }

      const mappedLicense = inventorySoftwareByName.get(value.trim().toLowerCase()) ?? "";

      setForm((prev) => ({
        ...prev,
        softwareName: value,
        softwareLicense: mappedLicense || prev.softwareLicense
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleOpenBulkSoftwareDialog = () => {
    setPreviousSoftwareName(form.softwareName);
    const existingBulkValues = splitDelimitedValues(form.softwareName).filter(Boolean);
    const rowCount = Math.max(existingBulkValues.length, 1);

    setBulkSoftwareDrafts(
      Array.from({ length: rowCount }, (_, index) => existingBulkValues[index] ?? "")
    );
    setShowBulkSoftwareDialog(true);
  };

  const handleConfirmOtherDeviceSpecification = () => {
    setForm((prev) => ({
      ...prev,
      otherDeviceSpecification: otherDeviceDraft.trim()
    }));
    setShowOtherDeviceDialog(false);
  };

  const handleConfirmBulkSoftware = () => {
    const combinedSoftwareNames = bulkSoftwareDrafts
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    setForm((prev) => ({
      ...prev,
      softwareName: combinedSoftwareNames
    }));
    setShowBulkSoftwareDialog(false);
  };

  const handleCancelBulkSoftware = () => {
    setForm((prev) => ({
      ...prev,
      softwareName: previousSoftwareName
    }));
    setShowBulkSoftwareDialog(false);
  };

  const handleOpenBulkLicenseDialog = () => {
    setPreviousSoftwareLicense(form.softwareLicense);
    const existingBulkLicenseValues = splitDelimitedValues(form.softwareLicense);
    const rowCount = Math.max(existingBulkLicenseValues.length, 1);
    setBulkLicenseDrafts(
      Array.from({ length: rowCount }, (_, index) => existingBulkLicenseValues[index] ?? "")
    );
    setShowBulkLicenseDialog(true);
  };

  const handleConfirmBulkLicense = () => {
    const combinedLicenses = bulkLicenseDrafts
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    setForm((prev) => ({
      ...prev,
      softwareLicense: combinedLicenses
    }));
    setShowBulkLicenseDialog(false);
  };

  const handleCancelBulkLicense = () => {
    setForm((prev) => ({
      ...prev,
      softwareLicense: previousSoftwareLicense
    }));
    setShowBulkLicenseDialog(false);
  };

  const handleAddBulkSoftwareInput = () => {
    setBulkSoftwareDrafts((prev) => [...prev, ""]);
  };

  const handleBulkSoftwareDraftChange = (index: number, value: string) => {
    setBulkSoftwareDrafts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const handleAddBulkLicenseInput = () => {
    setBulkLicenseDrafts((prev) => [...prev, ""]);
  };

  const handleBulkLicenseDraftChange = (index: number, value: string) => {
    setBulkLicenseDrafts((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const handleCancelOtherDeviceSpecification = () => {
    setForm((prev) => ({
      ...prev,
      deviceType: previousDeviceType,
      otherDeviceSpecification: previousOtherSpecification
    }));
    setShowOtherDeviceDialog(false);
  };

  const handleAddSelectOption = (key: keyof AccountabilityRecord, label: string) => {
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

    handleFieldChange(key, next);
  };

  const handleRemoveSelectOption = (key: keyof AccountabilityRecord, label: string) => {
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

    handleFieldChange(key, "");
  };

  const handleConvertTextboxToDropdown = (key: keyof AccountabilityRecord, label: string) => {
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
      handleFieldChange(key, "");
    }
  };

  return (
    <section className="panel" style={{ position: "relative" }}>
      <h2>{editingRecord ? "Edit Accountability Record" : "Create Accountability Record"}</h2>
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
        {labels.map((fieldDef) => {
          const { key, label, type } = fieldDef;
          if (key === "transferDecision" && !isTransferredProject) {
            return null;
          }

          if (isPortableDevice && EXCLUDED_ON_PORTABLE.includes(key)) {
            return null;
          }

          const required = REQUIRED_FIELDS.includes(key);
          const isSoftwareNameField = key === "softwareName";
          const isSoftwareLicenseField = key === "softwareLicense";
          const isSelect = isSoftwareNameField ? true : Boolean(dropdownFields[String(key)]);
          const options = isSelect
            ? isSoftwareNameField
              ? softwareNameOptions
              : (
                  selectOptions[String(key)] ??
                  (fieldDef.type === "select" ? (fieldDef as { options: string[] }).options : [""])
                )
            : [];
          return (
            <label key={String(key)} className="field">
              <span>
                {label}
                {required ? " *" : ""}
              </span>
              {isSelect ? (
                <div className="field-select-wrap">
                  <select
                    value={isSoftwareNameField ? softwareNameSelectValue : String(form[key] ?? "")}
                    onChange={(e) =>
                      handleFieldChange(key, e.target.value)
                    }
                  >
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o === BULK_SOFTWARE_OPTION_VALUE
                          ? "Bulk"
                          : o || `Select ${label}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="field-select-add-btn"
                    title={`Add ${label} option`}
                    aria-label={`Add ${label} option`}
                    onClick={() => handleAddSelectOption(key, label)}
                    style={{ display: isEditMode && !isSoftwareNameField ? "block" : "none" }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="field-select-remove-btn"
                    title={`Remove selected ${label} option`}
                    aria-label={`Remove selected ${label} option`}
                    onClick={() => handleRemoveSelectOption(key, label)}
                    style={{ display: isEditMode && !isSoftwareNameField ? "block" : "none" }}
                  >
                    -
                  </button>
                </div>
              ) : (
                <div className="field-input-wrap">
                  <input
                    type={type ?? "text"}
                    value={String(form[key] ?? "")}
                    onChange={(e) =>
                      handleFieldChange(key, e.target.value)
                    }
                    placeholder={key === "cato" ? "" : label}
                  />
                  {isSoftwareLicenseField && (
                    <button
                      type="button"
                      className="field-convert-btn"
                      title="Bulk input license values"
                      aria-label="Bulk input license values"
                      onClick={handleOpenBulkLicenseDialog}
                      style={{ display: "block", right: "36px" }}
                    >
                      +
                    </button>
                  )}
                  <button
                    type="button"
                    className="field-convert-btn"
                    title={`Convert ${label} to dropdown`}
                    aria-label={`Convert ${label} to dropdown`}
                    onClick={() => handleConvertTextboxToDropdown(key, label)}
                    style={{ display: isEditMode && !isSoftwareLicenseField ? "block" : "none" }}
                  >
                    v
                  </button>
                </div>
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
        <section className="field field-span return-signature-panel" style={{ padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "6px", borderLeft: "4px solid #3b82f6" }}>
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
            {saving ? "Saving..." : editingRecord ? "Update Record" : prefillRecord ? "Create Reassignment Record" : "Save Record"}
          </button>
          {(editingRecord || prefillRecord) && (
            <button type="button" className="ghost" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {showOtherDeviceDialog && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={handleCancelOtherDeviceSpecification}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="other-device-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)" }}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="other-device-dialog-title">Specify Other Equipment Type</h3>
                <p className="helper-text">Provide equipment type for Device Type = Others.</p>
              </div>
            </header>

            <div className="history-modal-body">
              <label className="field">
                <span>Equipment Type *</span>
                <input
                  type="text"
                  value={otherDeviceDraft}
                  onChange={(event) => setOtherDeviceDraft(event.target.value)}
                  placeholder="e.g. Docking station"
                  autoFocus
                />
              </label>

              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="ghost" onClick={handleCancelOtherDeviceSpecification}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmOtherDeviceSpecification}>
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {showBulkSoftwareDialog && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={handleCancelBulkSoftware}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-software-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)" }}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="bulk-software-dialog-title">Specify Software Application (Bulk)</h3>
                <p className="helper-text">Provide software application details for bulk assignment.</p>
              </div>
            </header>

            <div className="history-modal-body">
              <div className="field">
                <span>Software Application Name *</span>
                {bulkSoftwareDrafts.map((softwareDraft, index) => (
                  <div key={`bulk-software-row-${index}`} style={{ marginTop: index === 0 ? "8px" : "10px" }}>
                    <input
                      type="text"
                      value={softwareDraft}
                      onChange={(event) => handleBulkSoftwareDraftChange(index, event.target.value)}
                      placeholder={`e.g. Software ${index + 1}`}
                      autoFocus={index === 0}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="ghost"
                  onClick={handleAddBulkSoftwareInput}
                  style={{ marginTop: "10px" }}
                >
                  + Add another software
                </button>
              </div>

              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="ghost" onClick={handleCancelBulkSoftware}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmBulkSoftware}>
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {showBulkLicenseDialog && (
        <div
          className="history-modal-backdrop"
          role="presentation"
          onClick={handleCancelBulkLicense}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-license-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)" }}
          >
            <header className="history-modal-header">
              <div>
                <h3 id="bulk-license-dialog-title">Specify Software Licenses (Bulk)</h3>
                <p className="helper-text">Provide license/reference value per software entry.</p>
              </div>
            </header>

            <div className="history-modal-body">
              <div className="field">
                <span>Software License / Reference #</span>
                {bulkLicenseDrafts.map((licenseDraft, index) => (
                  <input
                    key={`bulk-license-${index}`}
                    type="text"
                    value={licenseDraft}
                    onChange={(event) => handleBulkLicenseDraftChange(index, event.target.value)}
                    placeholder={`License / Reference # ${index + 1}`}
                    autoFocus={index === 0}
                    style={{ marginTop: index === 0 ? "8px" : "10px" }}
                  />
                ))}
                <button
                  type="button"
                  className="ghost"
                  onClick={handleAddBulkLicenseInput}
                  style={{ marginTop: "10px" }}
                >
                  + Add another license
                </button>
              </div>

              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="ghost" onClick={handleCancelBulkLicense}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmBulkLicense}>
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};
