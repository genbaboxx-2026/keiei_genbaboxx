import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Sidebar, MobileHeader } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check if company setup is complete (has industrySubType set)
  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { industrySubType: true },
  });

  // If company setup not done and not already on settings page, redirect
  const isSetupIncomplete = !company?.industrySubType;

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 bg-slate-50 p-4 md:p-6 overflow-auto">
            {isSetupIncomplete && (
              <SetupBanner />
            )}
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}

function SetupBanner() {
  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <p className="text-sm text-amber-800">
        企業情報の初期設定がまだ完了していません。{" "}
        <a
          href="/settings/company"
          className="font-medium underline hover:text-amber-900"
        >
          企業情報設定
        </a>
        {" "}から設定を完了してください。
      </p>
    </div>
  );
}
