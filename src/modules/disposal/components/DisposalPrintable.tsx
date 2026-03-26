import { forwardRef } from "react";
import { DisposalRecord } from "../types/disposal";

interface DisposalPrintableProps {
  record: DisposalRecord | null;
}

const valueOrDash = (value?: string) => value?.trim() || "-";

export const DisposalPrintable = forwardRef<HTMLDivElement, DisposalPrintableProps>(
  ({ record }, ref) => {
    if (!record) {
      return (
        <section className="panel">
          <h2>Disposal Printable Form</h2>
          <p className="helper-text">
            Select a disposal record first, then open Printable Form.
          </p>
        </section>
      );
    }

    return (
      <section className="panel print-shell">
        <h2 className="no-print">Disposal Printable</h2>

        <div className="print-form print-form--a4" ref={ref}>
          <header className="print-header">
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
                <h1>IT ASSET DISPOSAL FORM</h1>
                <p>MAKATI DEVELOPMENT CORPORATION - Information Technology Division</p>
              </div>
            </div>
          </header>

          <table className="pf-table" style={{ marginTop: "6px" }}>
            <tbody>
              <tr>
                <td className="pf-lbl" style={{ width: "20%" }}>UMAC No.</td>
                <td className="pf-val">{valueOrDash(record.disposalNo)}</td>
                <td className="pf-lbl" style={{ width: "20%" }}>Status</td>
                <td className="pf-val">{valueOrDash(record.status)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Employee ID</td>
                <td className="pf-val">{valueOrDash(record.empId)}</td>
                <td className="pf-lbl">Employee Name</td>
                <td className="pf-val">{valueOrDash(record.employeeName)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Department</td>
                <td className="pf-val">{valueOrDash(record.department)}</td>
                <td className="pf-lbl">Project</td>
                <td className="pf-val">{valueOrDash(record.project)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Device Type</td>
                <td className="pf-val">{valueOrDash(record.deviceType)}</td>
                <td className="pf-lbl">Serial Number</td>
                <td className="pf-val">{valueOrDash(record.serialNumber)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Asset Number</td>
                <td className="pf-val">{valueOrDash(record.assetNumber)}</td>
                <td className="pf-lbl">Condition at Disposal</td>
                <td className="pf-val">{valueOrDash(record.conditionAtDisposal)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Disposal Reason</td>
                <td className="pf-val">{valueOrDash(record.disposalReason)}</td>
                <td className="pf-lbl">Recommended Action</td>
                <td className="pf-val">{valueOrDash(record.recommendedAction)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Data Wipe Required</td>
                <td className="pf-val">{valueOrDash(record.dataWipeRequired)}</td>
                <td className="pf-lbl">Requested Date</td>
                <td className="pf-val">{valueOrDash(record.requestedDate)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Disposal Date</td>
                <td className="pf-val">{valueOrDash(record.disposalDate)}</td>
                <td className="pf-lbl">Requested By</td>
                <td className="pf-val">{valueOrDash(record.requestedBy)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Approved By</td>
                <td className="pf-val" colSpan={3}>{valueOrDash(record.approvedBy)}</td>
              </tr>
              <tr>
                <td className="pf-lbl">Notes</td>
                <td className="pf-val" colSpan={3}>{valueOrDash(record.notes)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }
);

DisposalPrintable.displayName = "DisposalPrintable";
