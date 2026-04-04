import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
}

/**
 * Get the current session user, throws if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  const user = session.user as Record<string, unknown>;
  return {
    id: user.id as string,
    email: user.email as string,
    name: user.name as string,
    companyId: user.companyId as string,
    role: user.role as string,
  };
}
