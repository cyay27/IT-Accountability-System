export const PRODUCT_TYPE_OPTIONS = ["Email-Based License", "Product Key"] as const;
export const RENEWAL_STATUS_OPTIONS = ["For Renewal", "Active", "Expired"] as const;

export type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number];
export type RenewalStatus = (typeof RENEWAL_STATUS_OPTIONS)[number];

export interface LicenseDocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface LicenseMaintenanceRecord {
  id?: string;
  softwareName: string;
  vendor: string;
  quantity: string;
  date: string;
  contractOrPoNumber: string;
  purchaseMonthYear: string;
  expirationDate: string;
  renewalStatus: RenewalStatus | "";
  productType: ProductType | "";
  productKey: string;
  proofOfPurchaseName: string;
  poAttachment?: LicenseDocumentAttachment | null;
  contractAttachment?: LicenseDocumentAttachment | null;
  createdAt?: string;
  updatedAt?: string;
}

export const LICENSE_REQUIRED_FIELDS: Array<keyof LicenseMaintenanceRecord> = [
  "softwareName",
  "vendor",
  "quantity",
  "date",
  "contractOrPoNumber",
  "purchaseMonthYear",
  "expirationDate",
  "renewalStatus",
  "productType"
];

export const emptyLicenseMaintenanceRecord = (): LicenseMaintenanceRecord => ({
  softwareName: "",
  vendor: "",
  quantity: "",
  date: "",
  contractOrPoNumber: "",
  purchaseMonthYear: "",
  expirationDate: "",
  renewalStatus: "",
  productType: "",
  productKey: "",
  proofOfPurchaseName: "",
  poAttachment: null,
  contractAttachment: null
});
