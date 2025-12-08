import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface AdminSession {
  email: string;
  role: "admin";
  token: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("vs_admin")?.value;
  if (!token) {
    return null;
  }
  return { email: "admin@virgoschool.com", role: "admin", token };
}

export async function ensureAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
