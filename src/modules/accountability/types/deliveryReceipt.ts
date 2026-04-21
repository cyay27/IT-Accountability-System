export interface DeliveryReceiptDocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface DeliveryReceiptRecord {
  id: string;
  inputBy?: string;
  item?: string;
  customItemName?: string;
  invoiceNumber?: string;
  proofOfPurchaseName?: string;
  poAttachment?: DeliveryReceiptDocumentAttachment | null;
  contractAttachment?: DeliveryReceiptDocumentAttachment | null;
  purchaseNumber: string;
  supplier: string;
  deliveryDate: string;
  warranty: string;
  itemDescription: string;
  otherDetails: string;
  createdAt: string;
  updatedAt: string;
}
