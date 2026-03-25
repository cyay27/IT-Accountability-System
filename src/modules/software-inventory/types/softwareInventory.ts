export interface SoftwareSignatureField {
  name: string;
  signatureDataUrl: string | null;
  date: string;
}

export interface SoftwareInventoryRecord {
  id?: string;
  sourceAccountabilityRecordId?: string;
  formNo: string;
  softwareName: string;
  softwareVersion: string;
  vendor: string;
  licenseType: string;
  licenseReference: string;
  seatsPurchased: string;
  seatsUsed: string;
  assignedTo: string;
  employeeId: string;
  department: string;
  project: string;
  hostname: string;
  requestTicket: string;
  preparedBy: string;
  approvedBy: string;
  preparedSignature: SoftwareSignatureField;
  approvedSignature: SoftwareSignatureField;
  expiryDate: string;
  status: string;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

export const SOFTWARE_REQUIRED_FIELDS: Array<keyof SoftwareInventoryRecord> = [
  "softwareName",
  "licenseType",
  "licenseReference",
  "assignedTo",
  "department",
  "status"
];

export const emptySoftwareRecord = (): SoftwareInventoryRecord => ({
  formNo: "",
  softwareName: "",
  softwareVersion: "",
  vendor: "",
  licenseType: "",
  licenseReference: "",
  seatsPurchased: "",
  seatsUsed: "",
  assignedTo: "",
  employeeId: "",
  department: "",
  project: "",
  hostname: "",
  requestTicket: "",
  preparedBy: "",
  approvedBy: "",
  preparedSignature: { name: "", signatureDataUrl: null, date: "" },
  approvedSignature: { name: "", signatureDataUrl: null, date: "" },
  expiryDate: "",
  status: "",
  remarks: ""
});
