import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountabilityRecord } from "../../accountability/types/accountability";

interface ReturnedAssetsReassignFormProps {
  record: AccountabilityRecord | null;
  onSave: (record: AccountabilityRecord) => Promise<void> | void;
  onCancel: () => void;
}

const PORTABLE_DEVICE_TYPES = new Set(["ipad", "tablet"]);

export const ReturnedAssetsReassignForm = ({ record, onSave, onCancel }: ReturnedAssetsReassignFormProps) => {
  const [draft, setDraft] = useState<AccountabilityRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(record ? { ...record } : null);
  }, [record]);

  const employeeName = useMemo(() => {
    if (!draft) return "-";
    return [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" ") || "-";
  }, [draft]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    try {
      setSaving(true);
      await Promise.resolve(
        onSave({
          ...draft
        })
      );
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <section className="panel">
        <h2>Returned Asset Reassign Form</h2>
        <p className="helper-text">Select a record from Returned Assets and click Edit/Reassign to open this form.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Returned Asset Reassign Form</h2>
      <p className="helper-text">Update assignee and unit status without leaving the Returned Assets module.</p>

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field">
          <span>Emp ID</span>
          <input
            value={draft.empId}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, empId: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>First Name</span>
          <input
            value={draft.firstName}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Middle Name</span>
          <input
            value={draft.middleName}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, middleName: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Last Name</span>
          <input
            value={draft.lastName}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Department</span>
          <input
            value={draft.department}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, department: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Project</span>
          <input
            value={draft.project}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, project: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Returned On</span>
          <input
            type="date"
            value={draft.returnedDate}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, returnedDate: event.target.value } : prev))}
          />
        </label>

        <label className="field">
          <span>Status</span>
          <input value="Deployed to new user" readOnly />
        </label>

        <section className="field field-span">
          <span>Unit Summary</span>
          <p className="helper-text">
            Employee: {employeeName} • Device: {draft.deviceType || "-"} • Serial: {draft.serialNumber || "-"} • Asset: {PORTABLE_DEVICE_TYPES.has((draft.deviceType || "").trim().toLowerCase()) ? "-" : draft.deviceAssetNumber || "-"}
          </p>
        </section>

        <div className="actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          <button type="button" className="ghost" disabled={saving} onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
};
