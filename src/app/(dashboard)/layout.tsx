import { Sidebar, MobileHeader } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 bg-slate-50 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
