import { useAccountabilityCollectionRecords } from "../../accountability/hooks/useAccountabilityCollectionRecords";

export const useReturnedAssetsRecords = () =>
  useAccountabilityCollectionRecords(
    "returned_assets_records",
    "ias-returned-assets-records",
    "Access denied or unable to load returned assets records from Firestore."
  );
