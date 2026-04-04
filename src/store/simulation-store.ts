import { create } from "zustand";
import type {
  GrowthRates,
  SimulationResult,
  FutureProjection,
} from "@/types/simulation";

interface SimulationStore {
  growthRates: GrowthRates;
  targetOperatingProfit: number;
  targetGrossMargin: number;
  simulationYears: number;
  result: SimulationResult | null;
  futureProjections: FutureProjection[];
  setGrowthRates: (rates: Partial<GrowthRates>) => void;
  setTargetOperatingProfit: (value: number) => void;
  setTargetGrossMargin: (value: number) => void;
  setSimulationYears: (years: number) => void;
  setResult: (result: SimulationResult) => void;
  setFutureProjections: (projections: FutureProjection[]) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  growthRates: {
    laborCost: 2.5,
    fuelCost: 3.0,
    wasteCost: 4.0,
    subcontractCost: 2.0,
    cpi: 2.0,
    revenueGrowth: 5.0,
  },
  targetOperatingProfit: 7000000,
  targetGrossMargin: 20.0,
  simulationYears: 5,
  result: null,
  futureProjections: [],
  setGrowthRates: (rates) =>
    set((state) => ({
      growthRates: { ...state.growthRates, ...rates },
    })),
  setTargetOperatingProfit: (value) =>
    set({ targetOperatingProfit: value }),
  setTargetGrossMargin: (value) => set({ targetGrossMargin: value }),
  setSimulationYears: (years) => set({ simulationYears: years }),
  setResult: (result) => set({ result }),
  setFutureProjections: (projections) =>
    set({ futureProjections: projections }),
}));
