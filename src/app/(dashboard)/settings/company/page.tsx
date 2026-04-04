"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  companySettingsSchema,
  type CompanySettingsFormData,
  INDUSTRY_SUB_TYPES,
  FISCAL_MONTHS,
} from "@/lib/validations/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CompanySettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: "",
      industrySubType: "",
      fiscalYearStartMonth: 4,
      annualWorkingDays: 278,
      bonusCount: 0,
    },
  });

  const bonusCount = watch("bonusCount");
  const annualWorkingDays = watch("annualWorkingDays");
  const monthlyWorkingDays = annualWorkingDays
    ? (annualWorkingDays / 12).toFixed(2)
    : "0";

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch("/api/companies/me");
        if (res.ok) {
          const { data } = await res.json();
          setValue("name", data.name || "");
          setValue("industrySubType", data.industrySubType || "");
          setValue("fiscalYearStartMonth", data.fiscalYearStartMonth);
          setValue("annualWorkingDays", data.annualWorkingDays);
          setValue("bonusCount", data.bonusCount);
        }
      } catch {
        toast.error("企業情報の取得に失敗しました");
      } finally {
        setIsFetching(false);
      }
    }
    fetchCompany();
  }, [setValue]);

  const onSubmit = async (data: CompanySettingsFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/companies/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error?.message || "保存に失敗しました");
        return;
      }

      toast.success("企業情報を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">企業情報設定</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">企業情報設定</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">企業名</Label>
              <Input
                id="name"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>業種（解体業の細分類）</Label>
              <Select
                value={watch("industrySubType") || ""}
                onValueChange={(value) => setValue("industrySubType", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_SUB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>決算期開始月</Label>
              <Select
                value={String(watch("fiscalYearStartMonth"))}
                onValueChange={(value) =>
                  setValue("fiscalYearStartMonth", Number(value))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_MONTHS.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fiscalYearStartMonth && (
                <p className="text-sm text-red-500">
                  {errors.fiscalYearStartMonth.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 原価計算設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">原価計算設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="annualWorkingDays">年間稼働日数</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="annualWorkingDays"
                  type="number"
                  className="w-32"
                  {...register("annualWorkingDays", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                <span className="text-sm text-slate-500">日</span>
                <span className="text-sm text-slate-400 ml-4">
                  → 1ヶ月の稼働日数: {monthlyWorkingDays} 日
                </span>
              </div>
              {errors.annualWorkingDays && (
                <p className="text-sm text-red-500">
                  {errors.annualWorkingDays.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>賞与回数</Label>
              <div className="flex gap-4">
                {[
                  { value: 0, label: "なし（12ヶ月分）" },
                  { value: 1, label: "1回（13ヶ月分）" },
                  { value: 2, label: "2回（14ヶ月分）" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      checked={bonusCount === option.value}
                      onChange={() => setValue("bonusCount", option.value)}
                      disabled={isLoading}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.bonusCount && (
                <p className="text-sm text-red-500">
                  {errors.bonusCount.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
