export const COLLECTIONS = {
  accountability: "accountability_records",
  "accountability-records": "accountability_records",
  assets: "asset_inventory_records",
  "asset-inventory": "asset_inventory_records",
  borrowing: "borrowing_receipt_records",
  "borrowing-receipts": "borrowing_receipt_records",
  disposal: "disposal_records",
  ipad: "ipad_inventory_records",
  "ipad-inventory": "ipad_inventory_records",
  licenses: "license_maintenance_records",
  "license-maintenance": "license_maintenance_records",
  software: "software_inventory_records",
  "software-inventory": "software_inventory_records",
  "returned-assets": "returned_assets_records",
  "returned-assets-records": "returned_assets_records"
};

export const normalizePathSegment = (value = "") =>
  String(value).trim().replace(/^\/+|\/+$/g, "").toLowerCase();

export const resolveCollectionName = (value = "") => {
  const normalized = normalizePathSegment(value);
  if (!normalized) {
    return null;
  }

  if (COLLECTIONS[normalized]) {
    return COLLECTIONS[normalized];
  }

  if (Object.values(COLLECTIONS).includes(normalized)) {
    return normalized;
  }

  return null;
};

export const parseLimit = (value, fallback = 25, max = 100) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

export const nowIso = () => new Date().toISOString();
