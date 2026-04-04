import { create } from "zustand";
import type { JobCategory } from "@/types/employee";

interface EmployeeRow {
  id?: string;
  employeeNo: number;
  nameOrTitle: string;
  jobCategory: JobCategory;
  monthlyGrossSalary: number;
  monthlyHealthInsurance: number;
  monthlyPension: number;
  monthlyDcPension: number;
  monthlySafetyFund: number;
  monthlyOther: number;
  monthlySubtotal: number;
  annualTotal: number;
  dailyCost: number;
}

interface EmployeeStore {
  employees: EmployeeRow[];
  fiscalYear: number;
  setFiscalYear: (year: number) => void;
  setEmployees: (employees: EmployeeRow[]) => void;
  addEmployee: (employee: EmployeeRow) => void;
  updateEmployee: (index: number, employee: EmployeeRow) => void;
  removeEmployee: (index: number) => void;
}

export const useEmployeeStore = create<EmployeeStore>((set) => ({
  employees: [],
  fiscalYear: new Date().getFullYear(),
  setFiscalYear: (year) => set({ fiscalYear: year }),
  setEmployees: (employees) => set({ employees }),
  addEmployee: (employee) =>
    set((state) => ({ employees: [...state.employees, employee] })),
  updateEmployee: (index, employee) =>
    set((state) => ({
      employees: state.employees.map((e, i) => (i === index ? employee : e)),
    })),
  removeEmployee: (index) =>
    set((state) => ({
      employees: state.employees.filter((_, i) => i !== index),
    })),
}));
