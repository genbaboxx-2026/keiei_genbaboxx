"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/",
    children: [
      { label: "経営ダッシュボード", href: "/" },
      { label: "事業ダッシュボード", href: "/dashboard/business" },
    ],
  },
  {
    label: "データ入力",
    href: "/input",
    children: [
      { label: "人工入力", href: "/input/employees" },
      { label: "重機・車両入力", href: "/input/equipment" },
      { label: "決算データ入力", href: "/input/financials" },
      { label: "貸借対照表入力", href: "/input/balance-sheet" },
      { label: "売上按分入力", href: "/input/revenue-attribution" },
      { label: "従業員プロファイル", href: "/input/employee-profiles" },
      { label: "ファイル一括入力", href: "/input/upload" },
    ],
  },
  { label: "コストマスタ", href: "/cost-master" },
  {
    label: "経営分析",
    href: "/analysis",
    children: [
      { label: "5ステップ分析", href: "/analysis/five-steps" },
      { label: "PL詳細ビュー", href: "/analysis/pl-detail" },
      { label: "1人あたり分析", href: "/analysis/per-capita" },
      { label: "経営指標詳細", href: "/analysis/financial-metrics" },
    ],
  },
  {
    label: "シミュレーション",
    href: "/simulation",
    children: [
      { label: "シミュレーション一覧", href: "/simulation/list" },
      { label: "将来予測", href: "/simulation/future" },
      { label: "目標逆算", href: "/simulation/target" },
      { label: "What-if分析", href: "/simulation/what-if" },
    ],
  },
  {
    label: "要員計画",
    href: "/workforce",
    children: [
      { label: "要員計画ダッシュボ���ド", href: "/workforce" },
      { label: "従業員タイムライン", href: "/workforce/timeline" },
      { label: "採用計画シミュレーション", href: "/workforce/hiring-plan" },
    ],
  },
  {
    label: "AI相談",
    href: "/ai",
    children: [
      { label: "経営提案", href: "/ai/insights" },
      { label: "市場動向分析", href: "/ai/market" },
      { label: "要員計画AI相談", href: "/ai/workforce" },
      { label: "チャット相談", href: "/ai/chat" },
    ],
  },
  { label: "レポート出力", href: "/reports" },
  {
    label: "設定",
    href: "/settings",
    children: [
      { label: "企業情報", href: "/settings/company" },
      { label: "目標設定", href: "/settings/targets" },
      { label: "パフォーマンス曲線", href: "/settings/performance-curves" },
      { label: "年度管理", href: "/settings/fiscal-year" },
      { label: "ユーザー管理", href: "/settings/users" },
      { label: "コスト分類設定", href: "/settings/cost-classification" },
      { label: "ゴミ箱", href: "/settings/trash" },
    ],
  },
];

// Hamburger icon
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">四次元ポケット</h1>
        <p className="text-xs text-slate-400 mt-1">解体業経営シミュレーター</p>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-left"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

// Desktop sidebar - always visible
export function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 min-h-screen flex-shrink-0">
      <div className="fixed w-64 h-screen overflow-hidden">
        <SidebarContent />
      </div>
    </aside>
  );
}

// Mobile/tablet header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">メニューを開く</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="text-base font-bold">四次元ポケット</h1>
    </header>
  );
}

function NavItemComponent({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive =
    pathname === item.href ||
    item.children?.some((child) => pathname === child.href);

  return (
    <li>
      <Link
        href={item.children ? item.children[0].href : item.href}
        onClick={onNavigate}
        className={cn(
          "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        {item.label}
      </Link>
      {item.children && isActive && (
        <ul className="ml-4 mt-1 space-y-1">
          {item.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-xs transition-colors",
                  pathname === child.href
                    ? "bg-slate-700 text-white"
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
