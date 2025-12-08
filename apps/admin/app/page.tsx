import { ensureAdmin } from "../src/lib/auth";
import { getDashboardStats } from "../src/lib/api";
import { Sidebar } from "../src/components/sidebar";
import { Topbar } from "../src/components/topbar";
import { StatCard } from "../src/components/stat-card";

export default async function AdminDashboard() {
  const admin = await ensureAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="admin-shell">
      <Sidebar />
      <section className="main-area">
        <Topbar />
        <header>
          <h1>Добро пожаловать, {admin.email}</h1>
          <p>Следите за потоками, оплатами и качеством обучения в одном месте.</p>
        </header>
        <div className="stat-grid">
          {stats.map(stat => (
            <StatCard key={stat.id} label={stat.label} value={stat.value} trend={stat.trend} />
          ))}
        </div>
      </section>
    </div>
  );
}
