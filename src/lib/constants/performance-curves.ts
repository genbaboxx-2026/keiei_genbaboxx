export interface CurveBracket {
  position: string;
  ageFrom: number;
  ageTo: number;
  coefficient: number;
}

export const POSITIONS = [
  { value: "営業", label: "営業" },
  { value: "現場管理者", label: "現場管理者" },
  { value: "重機オペレーター", label: "重機オペレーター" },
  { value: "手元作業員", label: "手元作業員" },
  { value: "運転手", label: "運転手" },
  { value: "事務", label: "事務" },
  { value: "役員", label: "役員" },
] as const;

export const DEPARTMENTS = [
  { value: "営業部", label: "営業部" },
  { value: "工事部", label: "工事部" },
  { value: "管理部", label: "管理部" },
  { value: "経営", label: "経営" },
] as const;

export const DEFAULT_CURVES: CurveBracket[] = [
  // 重機オペレーター
  { position: "重機オペレーター", ageFrom: 18, ageTo: 29, coefficient: 0.85 },
  { position: "重機オペレーター", ageFrom: 30, ageTo: 39, coefficient: 1.00 },
  { position: "重機オペレーター", ageFrom: 40, ageTo: 49, coefficient: 0.95 },
  { position: "重機オペレーター", ageFrom: 50, ageTo: 54, coefficient: 0.85 },
  { position: "重機オペレーター", ageFrom: 55, ageTo: 59, coefficient: 0.70 },
  { position: "重機オペレーター", ageFrom: 60, ageTo: 64, coefficient: 0.55 },
  { position: "重機オペレーター", ageFrom: 65, ageTo: 99, coefficient: 0.40 },
  // 手元作業員
  { position: "手元作業員", ageFrom: 18, ageTo: 29, coefficient: 1.00 },
  { position: "手元作業員", ageFrom: 30, ageTo: 39, coefficient: 0.95 },
  { position: "手元作業員", ageFrom: 40, ageTo: 49, coefficient: 0.85 },
  { position: "手元作業員", ageFrom: 50, ageTo: 54, coefficient: 0.70 },
  { position: "手元作業員", ageFrom: 55, ageTo: 59, coefficient: 0.55 },
  { position: "手元作業員", ageFrom: 60, ageTo: 64, coefficient: 0.40 },
  { position: "手元作業員", ageFrom: 65, ageTo: 99, coefficient: 0.25 },
  // 営業
  { position: "営業", ageFrom: 18, ageTo: 29, coefficient: 0.60 },
  { position: "営業", ageFrom: 30, ageTo: 39, coefficient: 0.85 },
  { position: "営業", ageFrom: 40, ageTo: 49, coefficient: 1.00 },
  { position: "営業", ageFrom: 50, ageTo: 59, coefficient: 0.95 },
  { position: "営業", ageFrom: 60, ageTo: 64, coefficient: 0.80 },
  { position: "営業", ageFrom: 65, ageTo: 99, coefficient: 0.60 },
  // 現場管理者
  { position: "現場管理者", ageFrom: 18, ageTo: 29, coefficient: 0.50 },
  { position: "現場管理者", ageFrom: 30, ageTo: 39, coefficient: 0.85 },
  { position: "現場管理者", ageFrom: 40, ageTo: 49, coefficient: 1.00 },
  { position: "現場管理者", ageFrom: 50, ageTo: 59, coefficient: 0.90 },
  { position: "現場管理者", ageFrom: 60, ageTo: 64, coefficient: 0.75 },
  { position: "現場管理者", ageFrom: 65, ageTo: 99, coefficient: 0.55 },
];

export function getCoefficient(curves: CurveBracket[], position: string, age: number, override?: number | null): number {
  if (override != null) return override;
  const bracket = curves.find(c => c.position === position && age >= c.ageFrom && age <= c.ageTo);
  return bracket?.coefficient ?? 0.5;
}
