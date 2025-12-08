# Monitoring & Alerts

This note explains how to wire the Virgo API into Grafana/Datadog via the new monitoring surface.

## Endpoints

| Path | Purpose |
|------|---------|
| `/monitoring/health` | JSON payload with service status (`ok`/`degraded`/`error`), DB ping latency, storage config summary, uptime, and reported `APP_VERSION`. Safe for load-balancer health probes. |
| `/monitoring/metrics` | Prometheus 0.0.4 text with default Node.js/process metrics plus `virgo_api_uptime_seconds` and `virgo_api_health_status` (2\=ok, 1\=degraded, 0\=error). |

> Set `APP_VERSION` in the API environment so the health payload mirrors the deployed build.

## Prometheus scrape examples

### Grafana Agent

```yaml
metrics:
  configs:
    - name: virgo-api
      scrape_configs:
        - job_name: virgo-api
          static_configs:
            - targets: ["api.virgo.school"]
          scheme: https
          metrics_path: /monitoring/metrics
          authorization:
            type: Bearer
            credentials: ${MONITORING_TOKEN}
```

### Datadog Autodiscovery (container)

```yaml
dd_prometheus_scrape:
  enabled: true
  configs:
    - metrics_path: /monitoring/metrics
      namespace: virgo
      label_joins: []
      openmetrics_endpoint: http://localhost:4000/monitoring/metrics
```

## Alerting ideas

| Metric | Condition | Suggested action |
|--------|-----------|------------------|
| `virgo_api_health_status` | `< 2` for 2 consecutive scrapes | Page on-call; check `/monitoring/health` for component details. |
| `process_resident_memory_bytes` | `> 800MB` for 5m | Capture heap snapshot before auto-restart. |
| `nodejs_eventloop_lag_seconds` | `> 0.15s` for 2m | Investigate slow Prisma queries or blocking work. |

## Dashboards

1. Add a Stat panel bound to `virgo_api_health_status{job="virgo-api"}` (value mapping to OK/Degraded/Error).
2. Plot `virgo_api_uptime_seconds` and annotate deploys using `APP_VERSION` labels from the health endpoint.
3. Overlay `process_cpu_user_seconds_total` with `nodejs_eventloop_lag_seconds` to surface CPU saturation.

## Future extensions

- Push SLO burn-rate alerts once Lighthouse CI lands (ties to DevOps roadmap step for LCP/CLS).
- Emit counter metrics for key API flows (orders created, payments succeeded) so BI dashboards can reuse Prometheus instead of ad-hoc SQL.
