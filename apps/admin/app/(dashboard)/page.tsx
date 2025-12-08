import { ensureAdmin } from "../../src/lib/auth";
import { getDashboardStats } from "../../src/lib/api";
import { StatCard } from "../../src/components/stat-card";
import { PageHeader } from "../../src/components/page-header";

export default async function AdminDashboard() {
  const admin = await ensureAdmin();
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader
        eyebrow="Сводка"
        title={`Добро пожаловать, ${admin.email}`}
        description="Следите за потоками, оплатами и качеством обучения в одном месте."
      />
      <div className="stat-grid">
        {stats.map(stat => (
          <StatCard key={stat.id} label={stat.label} value={stat.value} trend={stat.trend} />
        ))}
      </div>
    </>
  );
}
