import { forwardRef } from "react";
import { AccountabilityRecord } from "../types/accountability";

interface PrintableFormProps {
  record: AccountabilityRecord | null;
}

const DEVICE_TYPES = ["Desktop", "Laptop", "Tablet", "Ipad", "Others"];

const Checkbox = ({ label, checked }: { label: string; checked: boolean }) => (
  <span className="mdc-aaf-checkbox">
    <span className="mdc-aaf-checkbox-box">{checked ? "X" : ""}</span>
    {label}
  </span>
);

const formatAttachmentSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (mimeType: string) => mimeType.startsWith("image/");
const isPdfAttachment = (mimeType: string) => mimeType === "application/pdf";

const dataUrlToBlob = (dataUrl: string) => {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    return null;
  }

  const mimeMatch = parts[0].match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const openAttachmentInNewTab = (dataUrl: string) => {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    window.alert("Unable to open attachment.");
    return;
  }

  const blobUrl = URL.createObjectURL(blob);
  const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.alert("Pop-up blocked. Please allow pop-ups for this site.");
    URL.revokeObjectURL(blobUrl);
    return;
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60_000);
};

const formatDate = (value?: string) => {
  if (!value?.trim()) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

const lineValue = (value?: string) => (value?.trim() ? value : "\u00a0");

const splitSoftwareNames = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const splitSoftwareLicenses = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim());

export const PrintableForm = forwardRef<HTMLDivElement, PrintableFormProps>(({ record }, ref) => {
  if (!record) {
    return (
      <section className="panel">
        <h2>Printable Form</h2>
        <p className="helper-text">Select a record from the table and click Print to generate the official MDC IT Assets Accountability Form.</p>
      </section>
    );
  }

  const attachments = record.attachments ?? [];
  const assigneeName = [record.firstName, record.middleName, record.lastName]
    .filter((value) => value?.trim())
    .join(" ");
  const issuedDate = formatDate(record.createdAt);
  const returnedDate = formatDate(record.returnedDate);
  const formattedName = [record.lastName, record.firstName, record.middleName]
    .filter((value) => value?.trim())
    .join(", ");
  const normalizedDeviceType = record.deviceType.trim().toLowerCase();
  const hasMonitor = [record.monitorModel, record.monitorSerialNumber, record.monitorAssetNumber]
    .some((value) => value?.trim());

  const knownDeviceOptions = DEVICE_TYPES.slice(0, 4).map((value) => value.toLowerCase());

  const deviceRows = [
    {
      type:
        normalizedDeviceType === "others" && record.otherDeviceSpecification?.trim()
          ? `Others - ${record.otherDeviceSpecification.trim()}`
          : record.deviceType,
      description: record.deviceDescription,
      hostname: record.hostname,
      serial: record.serialNumber,
      condition: record.deviceCondition,
      asset: record.deviceAssetNumber
    }
  ];

  if (hasMonitor) {
    deviceRows.push({
      type: "Monitor",
      description: record.monitorModel,
      hostname: "",
      serial: record.monitorSerialNumber,
      condition: "",
      asset: record.monitorAssetNumber
    });
  }

  while (deviceRows.length < 6) {
    deviceRows.push({ type: "", description: "", hostname: "", serial: "", condition: "", asset: "" });
  }

  const parsedSoftwareNames = splitSoftwareNames(record.softwareName);
  const parsedSoftwareLicenses = splitSoftwareLicenses(record.softwareLicense);

  const softwareRows = parsedSoftwareNames.length
    ? parsedSoftwareNames.map((softwareName, index) => ({
        app: softwareName,
        license: parsedSoftwareLicenses[index] ?? ""
      }))
    : [
        {
          app: "",
          license: ""
        }
      ];

  while (softwareRows.length < 5) {
    softwareRows.push({ app: "", license: "" });
  }

  const renderSignature = (
    signatureDataUrl: string | null | undefined,
    alt: string,
    dateValue: string,
    nameValue = ""
  ) => (
    <div className="mdc-aaf-signature-wrap">
      {signatureDataUrl ? <img src={signatureDataUrl} alt={alt} className="mdc-aaf-signature" /> : null}
      <p>{lineValue(dateValue)}</p>
      {nameValue.trim() ? <p className="mdc-aaf-signature-name">{nameValue}</p> : null}
    </div>
  );

  return (
    <section className="panel print-shell">
      <h2 className="no-print">Printable Form</h2>
      <div className="print-form print-form--a4 mdc-aaf" ref={ref}>
        <section className={`mdc-aaf-page${attachments.length > 0 ? " mdc-aaf-page--with-attachments" : ""}`}>
          <header className="mdc-aaf-header">
            <div className="mdc-aaf-header-logo-wrap">
              <img src="/assets/mdclogo.png?v=20260319" alt="MDC logo" className="mdc-aaf-header-logo" />
            </div>
            <p className="mdc-aaf-ref-line">
              <strong>Reference#:</strong> MDC-ITAAF-26-
              <span className="mdc-aaf-ref-blank">{lineValue(record.no)}</span>
              <span>-</span>
              <span className="mdc-aaf-ref-blank">&nbsp;</span>
            </p>
            <div className="mdc-aaf-header-seal">
              <img
                src="/assets/pqa-logo.png"
                alt="Philippine Quality Award"
                className="mdc-aaf-seal-image"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <p>Recognition for Maturity in Quality Management 2023</p>
            </div>
            <h1 className="mdc-aaf-title">IT Assets Accountability Form</h1>
          </header>

          <section className="mdc-aaf-identity">
            <div className="mdc-aaf-line-row mdc-aaf-line-row--name">
              <div className="mdc-aaf-line-label">Name:</div>
              <div className="mdc-aaf-name-grid">
                <div className="mdc-aaf-name-cell">
                  <span className="mdc-aaf-line-value">{lineValue(record.lastName)}</span>
                  <span className="mdc-aaf-sub-label">&lt;last name&gt;</span>
                </div>
                <div className="mdc-aaf-name-cell">
                  <span className="mdc-aaf-line-value">{lineValue(record.firstName)}</span>
                  <span className="mdc-aaf-sub-label">&lt;first name&gt;</span>
                </div>
                <div className="mdc-aaf-name-cell">
                  <span className="mdc-aaf-line-value">{lineValue(record.middleName)}</span>
                  <span className="mdc-aaf-sub-label">&lt;middle name&gt;</span>
                </div>
              </div>
              <div className="mdc-aaf-inline-field mdc-aaf-inline-field--small">
                <span className="mdc-aaf-inline-label">Employee ID:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.empId)}</span>
              </div>
            </div>

            <div className="mdc-aaf-line-row">
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">OpCen:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.opCen)}</span>
              </div>
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Group:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.group)}</span>
              </div>
            </div>

            <div className="mdc-aaf-line-row">
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Department:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.department)}</span>
              </div>
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Position:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.position)}</span>
              </div>
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Project:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.project)}</span>
              </div>
            </div>

            <div className="mdc-aaf-line-row">
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Email Account Assigned (Office 365):</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.email)}</span>
              </div>
              <div className="mdc-aaf-inline-field mdc-aaf-inline-field--status">
                <span className="mdc-aaf-inline-label">Employment Status:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.employmentStatus)}</span>
              </div>
            </div>

            <div className="mdc-aaf-device-line">
              <span className="mdc-aaf-inline-label">Company Device Provision (check if applicable):</span>
              <div className="mdc-aaf-checkboxes">
                {DEVICE_TYPES.map((deviceType) => {
                  const deviceTypeValue = deviceType.toLowerCase();
                  const isOthers = deviceTypeValue === "others";
                  const checked = isOthers
                    ? normalizedDeviceType === "others" || (!!normalizedDeviceType && !knownDeviceOptions.includes(normalizedDeviceType))
                    : normalizedDeviceType === deviceTypeValue;

                  return <Checkbox key={deviceType} label={deviceType} checked={checked} />;
                })}
              </div>
            </div>

            <div className="mdc-aaf-line-row">
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Location of Asset (Project /Address):</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.projectLocation)}</span>
              </div>
            </div>

            <div className="mdc-aaf-line-row">
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">Cost Center:</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.costCenter)}</span>
              </div>
              <div className="mdc-aaf-inline-field">
                <span className="mdc-aaf-inline-label">TARF Reference # (if applicable):</span>
                <span className="mdc-aaf-inline-value">{lineValue(record.tarf)}</span>
              </div>
            </div>
          </section>

          <table className="mdc-aaf-table mdc-aaf-table--assets">
            <thead>
              <tr>
                <th>
                  Device Type
                  <span>(Desktop, Laptop, Tablet, Phone, etc.)</span>
                </th>
                <th>
                  Description/ Device Model
                  <span>(e.g. Lenovo Workstation P350, Samsung S22B300H Monitor, APC BV650i UPS, etc)</span>
                </th>
                <th>Serial Number</th>
                <th>
                  Condition
                  <span>(indicate new or age of the device)</span>
                </th>
                <th>Asset Number</th>
              </tr>
            </thead>
            <tbody>
              {deviceRows.map((row, index) => (
                <tr key={`${row.type}-${index}`}>
                  <td>{lineValue(row.type)}</td>
                  <td>
                    {lineValue(row.description)}
                    {row.hostname?.trim() ? (
                      <span className="mdc-aaf-hostname-line">Hostname: {row.hostname.trim()}</span>
                    ) : null}
                  </td>
                  <td>{lineValue(row.serial)}</td>
                  <td>{lineValue(row.condition)}</td>
                  <td>{lineValue(row.asset)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mdc-aaf-soft-label">
            Software Accountability (e.g. AutoDesk, Adobe, Tsla or other premium/subscription apps)
          </p>

          <table className="mdc-aaf-table mdc-aaf-table--software">
            <thead>
              <tr>
                <th>Application Name ( e.g. Adobe Acrobat Pro X)</th>
                <th>License / Reference #</th>
              </tr>
            </thead>
            <tbody>
              {softwareRows.map((row, index) => (
                <tr key={`${row.app}-${index}`}>
                  <td>{lineValue(row.app)}</td>
                  <td>{lineValue(row.license)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="mdc-aaf-legal">
            <p>
              All equipment and devices that has been issued to you is to be used only for business purposes related to
              company operations. You, as an MDC employee, are solely responsible for the equipment checked out to you
              and will be accountable to fund the replacement of any lost or damaged equipment in your care for any reason,
              such as theft or negligence.
            </p>
            <p>
              Portable devices and equipment issued to you is to be used only by you as assignee, only for official
              business purposes.
            </p>
            <p>
              Unless otherwise explicitly authorized by MDC Information Technology Division, all employees are prohibited
              from installing additional software or hardware into their assigned devices due to copyright and license
              agreements. Any additional software and hardware requirements will need to be requested through and approved
              by the IT Division.
            </p>
          </section>

          <section className="mdc-aaf-conforme">
            <strong>CONFORME:</strong>
            <p>
              I hereby confirm that I have received the assets with the conditions indicated above in accordance with my
              role at Makati Development Corporation (MDC) and/or any of its subsidiary and partners. I acknowledge my
              accountability for the device hardware and software entrusted to me and will conform to all the information
              security policies set by the company, subject to all company &amp; government governing rules &amp; policies.
            </p>
          </section>

          <div className="mdc-aaf-assignee-strip">
            <div className="mdc-aaf-assignee-box">
              <div className="mdc-aaf-assignee-signature-wrap">
                {record.assigneeSignature?.signatureDataUrl ? (
                  <img
                    src={record.assigneeSignature.signatureDataUrl}
                    alt="Assignee signature"
                    className="mdc-aaf-assignee-signature"
                  />
                ) : null}
                <span>{lineValue(formattedName || assigneeName)}</span>
              </div>
              <div className="mdc-aaf-sign-line" />
              <p>Assignee&apos;s Complete Name &amp; Signature</p>
            </div>
            <div className="mdc-aaf-assignee-box mdc-aaf-assignee-box--date">
              <div className="mdc-aaf-assignee-signature-wrap">
                <span>{lineValue(issuedDate)}</span>
              </div>
              <div className="mdc-aaf-sign-line" />
              <p>Date</p>
            </div>
          </div>

          <table className="mdc-aaf-table mdc-aaf-table--signatories">
            <thead>
              <tr>
                <th colSpan={3}>Releasing Unit:</th>
                <th colSpan={2}>Assignee</th>
                <th>Custodian</th>
              </tr>
              <tr>
                <th>HR/PHR Representative</th>
                <th>AMLD Representative</th>
                <th>IT Representative</th>
                <th>Received on</th>
                <th colSpan={2}>Returned on</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{renderSignature(record.phrSignature?.signatureDataUrl, "HR/PHR signature", formatDate(record.phrSignature?.date), record.phr)}</td>
                <td>{renderSignature(record.amldSignature?.signatureDataUrl, "AMLD signature", formatDate(record.amldSignature?.date), record.amld)}</td>
                <td>{renderSignature(record.itSignature?.signatureDataUrl, "IT signature", formatDate(record.itSignature?.date), record.it)}</td>
                <td>{renderSignature(record.assigneeSignature?.signatureDataUrl, "Assignee signature", formatDate(record.assigneeSignature?.date || issuedDate), formattedName)}</td>
                <td>
                  {renderSignature(
                    record.assigneeReturnedSignature?.signatureDataUrl,
                    "Assignee returned signature",
                    returnedDate || formatDate(record.assigneeReturnedSignature?.date),
                    formattedName
                  )}
                </td>
                <td>
                  {renderSignature(
                    record.catoSignature?.signatureDataUrl,
                    "IT/Warehouse signature",
                    returnedDate || formatDate(record.catoSignature?.date),
                    record.cato || "IT/ Warehouse"
                  )}
                </td>
              </tr>
              <tr>
                <td>Name and Signature<br />Date</td>
                <td>Name and Signature<br />Date</td>
                <td>Name and Signature<br />Date</td>
                <td>Date and Signature</td>
                <td>Date and Signature</td>
                <td>IT/ Warehouse</td>
              </tr>
            </tbody>
          </table>

          <footer className="mdc-aaf-footer">
            <div className="mdc-aaf-footer-left">
              <p>MAKATI DEVELOPMENT CORPORATION</p>
              <p>2/F MDC Corporate Center, Radialn Street, Arca South</p>
              <p>Western Bicutan, Taguig City, Philippines 1630</p>
              <p>www.mdc.com.ph</p>
            </div>
            <div className="mdc-aaf-footer-certs">
              <img src="/assets/certification.png" alt="Certifications" className="cert-logo" />
            </div>
          </footer>
        </section>

        {attachments.length > 0 && (
          <section className="print-page-break">
            <header className="print-header" style={{ marginTop: "0" }}>
              <div className="print-header-main">
                <div className="print-logo-wrap">
                  <img
                    src="/assets/mdclogo.png?v=20260319"
                    alt="MDC Logo"
                    className="print-logo"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="print-header-copy">
                  <h1>IT Assets Accountability Form - ATTACHMENTS</h1>
                  <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
                </div>
              </div>
            </header>

            <div>
              {attachments.map((file) => (
                <article className="pf-attachment-sheet" key={file.id}>
                  <div className="pf-attachment-meta">
                    <strong>{file.name}</strong>
                    <span>
                      {(file.type || "Unknown type")} | {formatAttachmentSize(file.size || 0)}
                    </span>
                  </div>

                  <div className="pf-attachment-link-row">
                    <button
                      type="button"
                      className="pf-attachment-link pf-attachment-link-btn no-print"
                      onClick={() => openAttachmentInNewTab(file.dataUrl)}
                    >
                      Open Attachment For Manual Printing
                    </button>
                  </div>

                  <div className="pf-attachment-body-full">
                    {isImageAttachment(file.type || "") && (
                      <img src={file.dataUrl} alt={file.name} className="pf-attachment-image-full" />
                    )}

                    {isPdfAttachment(file.type || "") && (
                      <iframe
                        src={`${file.dataUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="pf-attachment-pdf-full"
                        title={file.name}
                      />
                    )}

                    {!isImageAttachment(file.type || "") && !isPdfAttachment(file.type || "") && (
                      <p className="pf-attachment-fallback">
                        View is unavailable for this file type.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
});

PrintableForm.displayName = "PrintableForm";
