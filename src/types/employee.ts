export interface EmployeeCostInput {
  monthlyGrossSalary: number;
  monthlyHealthInsurance: number;
  monthlyPension: number;
  monthlyDcPension: number;
  monthlySafetyFund: number;
  monthlyOther: number;
}

export interface EmployeeFormData extends EmployeeCostInput {
  employeeNo: number;
  nameOrTitle: string;
  jobCategory: JobCategory;
}

export type JobCategory =
  | "manager"
  | "operator"
  | "fieldWorker"
  | "driver"
  | "gasCutter"
  | "other";

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  manager: "責任者",
  operator: "オペレーター",
  fieldWorker: "手元",
  driver: "運転手",
  gasCutter: "ガス工",
  other: "その他",
};

export interface EmployeeCalculated {
  monthlySubtotal: number;
  annualTotal: number;
  dailyCost: number;
}

export interface EmployeeProfile {
  birthDate?: string;
  hireDate?: string;
  department?: string;
  position?: string;
  retirementAge: number;
  plannedRetirementDate?: string;
  performanceOverride?: number;
  notes?: string;
}
