import { z } from "zod";

export const companySettingsSchema = z.object({
  name: z
    .string()
    .min(1, "企業名を入力してください")
    .max(255, "企業名は255文字以内で入力してください"),
  industrySubType: z
    .string()
    .optional(),
  fiscalYearStartMonth: z
    .number()
    .min(1, "1〜12の値を入力してください")
    .max(12, "1〜12の値を入力してください"),
  annualWorkingDays: z
    .number()
    .min(200, "年間稼働日数は200〜365の間で入力してください")
    .max(365, "年間稼働日数は200〜365の間で入力してください"),
  bonusCount: z
    .number()
    .min(0, "賞与回数は0〜2の間で入力してください")
    .max(2, "賞与回数は0〜2の間で入力してください"),
});

export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;

export const INDUSTRY_SUB_TYPES = [
  "総合解体",
  "RC造専門",
  "木造専門",
  "内装解体専門",
  "プラント解体",
  "その他",
] as const;

export const FISCAL_MONTHS = [
  { value: 1, label: "1月" },
  { value: 2, label: "2月" },
  { value: 3, label: "3月" },
  { value: 4, label: "4月" },
  { value: 5, label: "5月" },
  { value: 6, label: "6月" },
  { value: 7, label: "7月" },
  { value: 8, label: "8月" },
  { value: 9, label: "9月" },
  { value: 10, label: "10月" },
  { value: 11, label: "11月" },
  { value: 12, label: "12月" },
] as const;
