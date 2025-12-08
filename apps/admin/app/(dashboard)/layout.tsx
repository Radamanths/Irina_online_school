import type { ReactNode } from "react";
import { ensureAdmin } from "../../src/lib/auth";
import { Sidebar } from "../../src/components/sidebar";
import { Topbar } from "../../src/components/topbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await ensureAdmin();

  return (
    <div className="admin-shell">
      <Sidebar />
      <section className="main-area">
        <Topbar />
        {children}
      </section>
    </div>
  );
}
