export interface AccountabilityAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface SignatureField {
  name: string;
  signatureDataUrl: string | null;
  date: string;
}

export interface AccountabilityRecord {
  id?: string;
  no: string;
  empId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  position: string;
  group: string;
  department: string;
  opCen: string;
  division: string;
  project: string;
  costCenter: string;
  projectLocation: string;
  employmentStatus: string;
  deviceType: string;
  deviceDescription: string;
  hostname: string;
  serialNumber: string;
  deviceCondition: string;
  deviceAssetNumber: string;
  monitorModel: string;
  monitorSerialNumber: string;
  monitorAssetNumber: string;
  tarf: string;
  softwareName: string;
  softwareLicense: string;
  phr: string;
  amld: string;
  it: string;
  cato: string;
  attachments: AccountabilityAttachment[];
  returnedDate: string;
  assigneeSignature: SignatureField;
  assigneeReturnedSignature: SignatureField;
  phrSignature: SignatureField;
  amldSignature: SignatureField;
  itSignature: SignatureField;
  catoSignature: SignatureField;
  createdAt?: string;
  updatedAt?: string;
}

export const REQUIRED_FIELDS: Array<keyof AccountabilityRecord> = [
  "empId",
  "firstName",
  "lastName",
  "department",
  "hostname",
  "serialNumber",
  "deviceAssetNumber"
];

export const emptyRecord = (): AccountabilityRecord => ({
  no: "",
  empId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  position: "",
  group: "",
  department: "",
  opCen: "",
  division: "",
  project: "",
  costCenter: "",
  projectLocation: "",
  employmentStatus: "",
  deviceType: "",
  deviceDescription: "",
  hostname: "",
  serialNumber: "",
  deviceCondition: "",
  deviceAssetNumber: "",
  monitorModel: "",
  monitorSerialNumber: "",
  monitorAssetNumber: "",
  tarf: "",
  softwareName: "",
  softwareLicense: "",
  returnedDate: "",
  assigneeSignature: { name: "", signatureDataUrl: null, date: "" },
  assigneeReturnedSignature: { name: "", signatureDataUrl: null, date: "" },
  phrSignature: { name: "", signatureDataUrl: null, date: "" },
  amldSignature: { name: "", signatureDataUrl: null, date: "" },
  itSignature: { name: "", signatureDataUrl: null, date: "" },
  catoSignature: { name: "", signatureDataUrl: null, date: "" },
  phr: "",
  amld: "",
  it: "",
  cato: "",
  attachments: []
});

