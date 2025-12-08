import clsx from "clsx";
import type { OrderTimelineEvent } from "../lib/api";

interface TimelineProps {
  events: OrderTimelineEvent[];
}

const toneClassMap: Record<OrderTimelineEvent["tone"], string> = {
  info: "timeline__indicator--info",
  success: "timeline__indicator--success",
  warning: "timeline__indicator--warning",
  danger: "timeline__indicator--danger",
  muted: "timeline__indicator--muted"
};

export function Timeline({ events }: TimelineProps) {
  if (!events.length) {
    return <p className="detail-empty">История пока пуста</p>;
  }

  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={event.id} className="timeline__item">
          <span
            className={clsx("timeline__indicator", toneClassMap[event.tone])}
            aria-hidden="true"
          />
          <div className="timeline__content">
            <div className="timeline__header">
              <strong>{event.label}</strong>
              <time>{event.timestamp}</time>
            </div>
            <p>{event.description}</p>
            {index !== events.length - 1 && <span className="timeline__line" aria-hidden="true" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
