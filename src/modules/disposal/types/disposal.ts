export interface DisposalRecord {
  id: string;
  disposalNo: string;
  empId: string;
  employeeName: string;
  department: string;
  project: string;
  deviceType: string;
  serialNumber: string;
  assetNumber: string;
  conditionAtDisposal: string;
  disposalReason: string;
  recommendedAction: string;
  dataWipeRequired: string;
  status: string;
  requestedBy: string;
  approvedBy: string;
  requestedDate: string;
  disposalDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const emptyDisposalRecord = (): DisposalRecord => ({
  id: "",
  disposalNo: "",
  empId: "",
  employeeName: "",
  department: "",
  project: "",
  deviceType: "",
  serialNumber: "",
  assetNumber: "",
  conditionAtDisposal: "",
  disposalReason: "",
  recommendedAction: "",
  dataWipeRequired: "No",
  status: "Draft",
  requestedBy: "",
  approvedBy: "",
  requestedDate: "",
  disposalDate: "",
  notes: "",
  createdAt: "",
  updatedAt: ""
});
