import { useAccountabilityCollectionRecords } from "../../accountability/hooks/useAccountabilityCollectionRecords";

export const useIpadInventoryRecords = () =>
  useAccountabilityCollectionRecords(
    "ipad_inventory_records",
    "ias-ipad-inventory-records",
    "Access denied or unable to load iPad inventory records from Firestore."
  );
