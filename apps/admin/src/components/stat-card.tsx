import { Card } from "@virgo/ui";

interface Props {
  label: string;
  value: string;
  trend: string;
}

export function StatCard({ label, value, trend }: Props) {
  return (
    <Card className="stat-card">
      <p className="eyebrow">{label}</p>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__trend">{trend}</p>
    </Card>
  );
}
