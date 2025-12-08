import type { DashboardWidget as DashboardWidgetType } from "../lib/types";

export function DashboardWidget({ widget }: { widget: DashboardWidgetType }) {
  return (
    <article className="dashboard-widget">
      <header>
        <p className="eyebrow">{widget.eyebrow}</p>
        <h3>{widget.title}</h3>
      </header>
      <p>{widget.description}</p>
      {widget.cta && (
        <a className="button button--ghost" href={widget.cta.href}>
          {widget.cta.label}
        </a>
      )}
    </article>
  );
}
