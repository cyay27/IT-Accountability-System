import { AccountabilityAttachment } from "./accountability";

export interface BorrowingReceiptData {
  borrowingNo: string;
  borrowerName: string;
  deviceType: string;
  attachments: AccountabilityAttachment[];
  signatureDataUrl: string | null;
  dateBorrowed: string;
  expectedReturnDate: string;
  purpose: string;
  contact: string;
  accessoriesIncluded: string;
  requestedBy: string;
  approvedBy: string;
  releasedBy: string;
  releaseDateTime: string;
  damageOrMissingItems: string;
  returnRemarks: string;
}

export const emptyBorrowingReceiptData = (): BorrowingReceiptData => ({
  borrowingNo: "",
  borrowerName: "",
  deviceType: "",
  attachments: [],
  signatureDataUrl: null,
  dateBorrowed: "",
  expectedReturnDate: "",
  purpose: "",
  contact: "",
  accessoriesIncluded: "",
  requestedBy: "",
  approvedBy: "",
  releasedBy: "",
  releaseDateTime: "",
  damageOrMissingItems: "",
  returnRemarks: ""
});
