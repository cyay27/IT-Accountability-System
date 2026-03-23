import { useAccountabilityCollectionRecords } from "../../accountability/hooks/useAccountabilityCollectionRecords";

export const useAssetInventoryRecords = () =>
  useAccountabilityCollectionRecords(
    "asset_inventory_records",
    "ias-asset-inventory-records",
    "Access denied or unable to load asset inventory records from Firestore."
  );
