import { cookies } from "next/headers";

interface SessionUser {
  id: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get("vs_session")?.value;
  if (!token) {
    return null;
  }
  // Placeholder decode step — backend will expose /auth/me endpoint.
  return { id: "demo-user", email: "demo@virgoschool.com" };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthenticated");
  }
  return user;
}
