interface DashboardMetricCardProps {
  label: string;
  value: string;
  description?: string;
}

export function DashboardMetricCard({ label, value, description }: DashboardMetricCardProps) {
  return (
    <article className="dashboard-metric">
      <p className="eyebrow">{label}</p>
      <p className="dashboard-metric__value">{value}</p>
      {description && <p className="dashboard-metric__description">{description}</p>}
    </article>
  );
}
