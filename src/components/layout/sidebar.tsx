"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, BarChart3, ClipboardList, Target, Sparkles,
  Users, PieChart, Bot, FileOutput, Settings, Menu, LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "見る",
    items: [
      { label: "ダッシュボード", href: "/", icon: <LayoutDashboard size={16} />, children: [
        { label: "経営ダッシュボード", href: "/" },
        { label: "事業ダッシュボード", href: "/dashboard/business" },
      ]},
      { label: "分析", href: "/analysis", icon: <BarChart3 size={16} />, children: [
        { label: "5ステップ分析", href: "/analysis/five-steps" },
        { label: "PL詳細ビュー", href: "/analysis/pl-detail" },
        { label: "1人あたり分析", href: "/analysis/per-capita" },
        { label: "経営指標詳細", href: "/analysis/financial-metrics" },
      ]},
      { label: "コストマスタ", href: "/cost-master", icon: <ClipboardList size={16} /> },
    ],
  },
  {
    title: "考える",
    items: [
      { label: "目標設定", href: "/targets", icon: <Target size={16} /> },
      { label: "シミュレーション", href: "/simulation", icon: <Sparkles size={16} />, children: [
        { label: "将来予測", href: "/simulation/future" },
        { label: "目標逆算", href: "/simulation/target" },
        { label: "What-if分析", href: "/simulation/what-if" },
      ]},
      { label: "要員計画", href: "/workforce", icon: <Users size={16} />, children: [
        { label: "組織パワー分析", href: "/workforce" },
        { label: "従業員タイムライン", href: "/workforce/timeline" },
        { label: "採用計画", href: "/workforce/hiring-plan" },
      ]},
      { label: "売上按分", href: "/revenue-attribution", icon: <PieChart size={16} /> },
      { label: "AI相談", href: "/ai", icon: <Bot size={16} />, children: [
        { label: "経営提案", href: "/ai/insights" },
        { label: "市場動向分析", href: "/ai/market" },
        { label: "要員計画AI相談", href: "/ai/workforce" },
        { label: "チャット相談", href: "/ai/chat" },
      ]},
    ],
  },
  {
    title: "出す",
    items: [
      { label: "レポート出力", href: "/reports", icon: <FileOutput size={16} /> },
    ],
  },
  {
    title: "設定",
    items: [
      { label: "設定", href: "/settings", icon: <Settings size={16} />, children: [
        { label: "企業情報", href: "/settings/company" },
        { label: "決算書読込", href: "/settings/financial-import" },
        { label: "従業員管理", href: "/settings/employees" },
        { label: "重機・車両・AT", href: "/settings/equipment" },
        { label: "パフォーマンス曲線", href: "/settings/performance-curves" },
        { label: "年度管理", href: "/settings/fiscal-year" },
        { label: "ゴミ箱", href: "/settings/trash" },
      ]},
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">四次元ポケット</h1>
        <p className="text-xs text-slate-400 mt-1">解体業経営シミュレーター</p>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={section.title}>
            {si > 0 && <div className="border-t border-slate-700 mx-3 my-2" />}
            <div className="px-4 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {section.title}
            </div>
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => (
                <NavItemComponent key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </div>
    </div>
  );
}

function NavItemComponent({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const isActive = pathname === item.href || item.children?.some((c) => pathname === c.href);

  return (
    <li>
      <Link
        href={item.children ? item.children[0].href : item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-slate-800 text-white border-l-[3px] border-blue-500 pl-[9px]"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span>{item.label}</span>
      </Link>
      {item.children && isActive && (
        <ul className="ml-4 mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block pl-4 pr-3 py-1 rounded-md text-xs transition-colors",
                  pathname === child.href
                    ? "bg-slate-700 text-white border-l-2 border-blue-400 pl-[14px]"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:block w-60 min-h-screen flex-shrink-0">
      <div className="fixed w-60 h-screen overflow-hidden">
        <SidebarContent />
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-60 border-0">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="text-sm font-bold">四次元ポケット</h1>
    </header>
  );
}
