"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialsInput from "@/app/(dashboard)/input/financials/page";
import BalanceSheetInput from "@/app/(dashboard)/input/balance-sheet/page";
import UploadInput from "@/app/(dashboard)/input/upload/page";

export default function FinancialImportPage() {
  const [activeTab, setActiveTab] = useState("pdf");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">決算書読込</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pdf">📄 PDFから読取</TabsTrigger>
          <TabsTrigger value="manual-pl">✏️ PL手入力</TabsTrigger>
          <TabsTrigger value="manual-bs">✏️ BS手入力</TabsTrigger>
        </TabsList>

        <TabsContent value="pdf">
          <UploadInput />
        </TabsContent>

        <TabsContent value="manual-pl">
          <FinancialsInput />
        </TabsContent>

        <TabsContent value="manual-bs">
          <BalanceSheetInput />
        </TabsContent>
      </Tabs>
    </div>
  );
}
