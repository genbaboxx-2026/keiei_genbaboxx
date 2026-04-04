export type EquipmentType = "vehicle" | "heavy_machine" | "attachment";
export type OwnershipType = "owned" | "leased" | "rental";

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  vehicle: "車両",
  heavy_machine: "重機",
  attachment: "アタッチメント",
};

export const SIZE_CATEGORIES = [
  "ミニ",
  "0.25",
  "0.45",
  "0.7",
  "1.2",
  "1.6",
  "3.2",
] as const;

export const ATTACHMENT_TYPES = [
  "大割",
  "小割",
  "カッター",
  "フォーク",
  "バケット",
  "ブレーカー",
  "ハサミ",
  "スケルトン",
  "ペンチャー",
  "A-ロック",
  "回転ハサミ",
  "その他",
] as const;

export interface EquipmentFormData {
  equipmentType: EquipmentType;
  name: string;
  spec?: string;
  sizeCategory?: string;
  attachmentType?: string;
  insuranceLiability?: number;
  insuranceProperty?: number;
  insuranceVehicle?: number;
  insuranceCompulsory?: number;
  vehicleTax?: number;
  annualInspection?: number;
  repairMaintenance?: number;
  depreciationAmount?: number;
  leaseAmount?: number;
  isLeased: boolean;
  isFixedAsset: boolean;
  ownershipType: OwnershipType;
}

export interface EquipmentCalculated {
  annualTotalCost: number;
  dailyCost: number;
}
