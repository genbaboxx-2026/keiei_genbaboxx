import jsPDF from "jspdf";

interface ReportData {
  companyName: string;
  fiscalYear: number;
  financial?: { revenue: number; grossMarginRate: number; operatingMarginRate: number; operatingProfit: number; cogsTotal: number; sgaTotal: number };
  targets?: { targetGrossMarginRate: number | null; targetOperatingMarginRate: number | null };
  fiveStep?: { requiredGrossProfit: number; targetGrossMarginRate: number; requiredRevenue: number; currentGrossMarginRate: number };
  bsIndicators?: Record<string, number>;
  insights?: string[];
}

export function generateDashboardPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.text("経営レポート", W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.text(`${data.companyName} | ${data.fiscalYear}年度 | 出力日: ${new Date().toLocaleDateString("ja-JP")}`, W / 2, y, { align: "center" });
  y += 12;

  // Financial KPI
  doc.setFontSize(12);
  doc.text("財務KPI", 15, y);
  y += 7;
  doc.setFontSize(10);
  if (data.financial) {
    const f = data.financial;
    const lines = [
      `売上高: ${(f.revenue / 100000000).toFixed(2)}億円`,
      `粗利率: ${f.grossMarginRate}% ${data.targets?.targetGrossMarginRate ? `(目標: ${data.targets.targetGrossMarginRate}%)` : ""}`,
      `営業利益率: ${f.operatingMarginRate}%`,
      `営業利益: ${(f.operatingProfit / 10000).toFixed(0)}万円`,
    ];
    lines.forEach(l => { doc.text(l, 20, y); y += 6; });
  }
  y += 5;

  // Five Step
  if (data.fiveStep) {
    doc.setFontSize(12);
    doc.text("5ステップ分析", 15, y);
    y += 7;
    doc.setFontSize(10);
    const s = data.fiveStep;
    doc.text(`必要粗利額: ${(s.requiredGrossProfit / 10000).toFixed(0)}万円`, 20, y); y += 6;
    doc.text(`目標粗利率: ${s.targetGrossMarginRate}%`, 20, y); y += 6;
    doc.text(`必要売上高: ${(s.requiredRevenue / 100000000).toFixed(2)}億円`, 20, y); y += 6;
    doc.text(`現在粗利率: ${s.currentGrossMarginRate}%`, 20, y); y += 8;
  }

  // BS Indicators
  if (data.bsIndicators) {
    doc.setFontSize(12);
    doc.text("経営指標", 15, y);
    y += 7;
    doc.setFontSize(10);
    const b = data.bsIndicators;
    const items = [
      `自己資本比率: ${b.equityRatio?.toFixed(1)}%`,
      `流動比率: ${b.currentRatio?.toFixed(1)}%`,
      `ROE: ${b.roe?.toFixed(1)}%`,
      `借入金償還期間: ${b.debtRepaymentYears?.toFixed(1)}年`,
    ];
    items.forEach(l => { doc.text(l, 20, y); y += 6; });
    y += 5;
  }

  // AI Insights
  if (data.insights && data.insights.length > 0) {
    doc.setFontSize(12);
    doc.text("AI経営提案", 15, y);
    y += 7;
    doc.setFontSize(9);
    data.insights.slice(0, 3).forEach((insight, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${insight}`, W - 40);
      doc.text(lines, 20, y);
      y += lines.length * 4.5 + 3;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("四次元ポケット - 解体業経営シミュレーター", W / 2, 285, { align: "center" });

  return doc;
}
