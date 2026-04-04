import { create } from "zustand";
import type { EquipmentType, OwnershipType } from "@/types/equipment";

interface EquipmentRow {
  id?: string;
  equipmentType: EquipmentType;
  name: string;
  spec?: string;
  sizeCategory?: string;
  attachmentType?: string;
  insuranceLiability: number;
  insuranceProperty: number;
  insuranceVehicle: number;
  insuranceCompulsory: number;
  vehicleTax: number;
  annualInspection: number;
  repairMaintenance: number;
  depreciationAmount: number;
  leaseAmount: number;
  isLeased: boolean;
  isFixedAsset: boolean;
  ownershipType: OwnershipType;
  annualTotalCost: number;
  dailyCost: number;
}

interface EquipmentStore {
  equipment: EquipmentRow[];
  fiscalYear: number;
  activeTab: EquipmentType;
  setFiscalYear: (year: number) => void;
  setActiveTab: (tab: EquipmentType) => void;
  setEquipment: (equipment: EquipmentRow[]) => void;
  addEquipment: (item: EquipmentRow) => void;
  updateEquipment: (index: number, item: EquipmentRow) => void;
  removeEquipment: (index: number) => void;
}

export const useEquipmentStore = create<EquipmentStore>((set) => ({
  equipment: [],
  fiscalYear: new Date().getFullYear(),
  activeTab: "vehicle",
  setFiscalYear: (year) => set({ fiscalYear: year }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setEquipment: (equipment) => set({ equipment }),
  addEquipment: (item) =>
    set((state) => ({ equipment: [...state.equipment, item] })),
  updateEquipment: (index, item) =>
    set((state) => ({
      equipment: state.equipment.map((e, i) => (i === index ? item : e)),
    })),
  removeEquipment: (index) =>
    set((state) => ({
      equipment: state.equipment.filter((_, i) => i !== index),
    })),
}));
