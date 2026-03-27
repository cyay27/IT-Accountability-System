export const PRODUCT_TYPE_OPTIONS = ["Email-Based License", "Product Key"] as const;

export type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number];

export interface LicenseMaintenanceRecord {
  id?: string;
  softwareName: string;
  vendor: string;
  quantity: string;
  date: string;
  productType: ProductType | "";
  productKey: string;
  proofOfPurchaseName: string;
  createdAt?: string;
  updatedAt?: string;
}

export const LICENSE_REQUIRED_FIELDS: Array<keyof LicenseMaintenanceRecord> = [
  "softwareName",
  "vendor",
  "quantity",
  "date",
  "productType"
];

export const emptyLicenseMaintenanceRecord = (): LicenseMaintenanceRecord => ({
  softwareName: "",
  vendor: "",
  quantity: "",
  date: "",
  productType: "",
  productKey: "",
  proofOfPurchaseName: ""
});
