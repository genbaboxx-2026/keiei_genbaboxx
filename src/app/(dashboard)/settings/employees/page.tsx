"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeesInput from "@/app/(dashboard)/input/employees/page";
import EmployeeProfilesInput from "@/app/(dashboard)/input/employee-profiles/page";

export default function EmployeesManagementPage() {
  const [activeTab, setActiveTab] = useState("salary");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">従業員管理</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="salary">💰 給与データ</TabsTrigger>
          <TabsTrigger value="profile">👤 プロファイル</TabsTrigger>
        </TabsList>

        <TabsContent value="salary">
          <EmployeesInput />
        </TabsContent>

        <TabsContent value="profile">
          <EmployeeProfilesInput />
        </TabsContent>
      </Tabs>
    </div>
  );
}
