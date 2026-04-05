"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimelineView from "./timeline-view";
import PerformanceCurvesView from "@/app/(dashboard)/settings/performance-curves/page";

export default function TimelinePage() {
  const [activeTab, setActiveTab] = useState("timeline");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">従業員タイムライン</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">📊 タイムライン</TabsTrigger>
          <TabsTrigger value="curves">📈 パフォーマンス曲線</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <TimelineView />
        </TabsContent>

        <TabsContent value="curves">
          <PerformanceCurvesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
