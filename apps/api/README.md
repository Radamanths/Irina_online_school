# Virgo API

NestJS service powering the Virgo School platform. Ships Graph-backed HTTP endpoints for the marketing site, LMS dashboard, and admin tooling.

## Commands

```powershell
pnpm --filter @virgo/api install   # install deps for the API package
pnpm --filter @virgo/api prisma:generate
pnpm --filter @virgo/api start:dev
pnpm --filter @virgo/api test:e2e   # run mocked e2e suite
```

### Environment

Copy `.env.example` to `.env` and provide `DATABASE_URL`, `PORT`, and payment provider keys. Defaults fall back to local URLs defined in `@virgo/config`.

**Neon example**

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-your-host.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Payments**

| Variable | Purpose |
|----------|---------|
| `PAYMENTS_PROVIDER` | Default provider (`stripe`, `yookassa`, `cloudpayments`, `manual`). |
| `YOO_KASSA_SHOP_ID` / `YOO_KASSA_SECRET_KEY` | Credentials for the YooKassa Payments API. |
| `CLOUDPAYMENTS_PUBLIC_ID` / `CLOUDPAYMENTS_API_SECRET` | Credentials for CloudPayments invoices. |
| `FRONTEND_BASE_URL` | Used for building provider return URLs. |

**Media uploads**

| Variable | Purpose |
|----------|---------|
| `ASSETS_S3_BUCKET` | Target S3 (or S3-compatible) bucket for uploaded media. |
| `ASSETS_CDN_BASE` | Optional CDN/base URL that will be prepended to asset keys for public links. |
| `AWS_REGION` | Region for the bucket/S3 endpoint. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials for signing presigned PUT URLs. |
| `AWS_S3_ENDPOINT` | Optional custom endpoint (e.g., MinIO, Yandex Cloud). |
| `AWS_S3_FORCE_PATH_STYLE` | Set to `true` for providers that require path-style requests. |
| `AWS_S3_PUBLIC_ENDPOINT` | Override for the public hostname if it differs from the signing endpoint. |

After updating the URL, run `pnpm --filter @virgo/api prisma:migrate` so the remote Neon database has the required tables.

## HTTP surface (WIP)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/courses?locale=ru` | Публичный каталог курсов. |
| GET | `/courses/:slug?locale=en` | Детальная страница курса с outline. |
| GET | `/modules?courseId=...&locale=ru` | Модули выбранного курса с упорядоченными уроками. |
| GET | `/modules/:moduleId?locale=en` | Данные модуля и вложенных уроков. |
| GET | `/lessons?moduleId=...&locale=ru` | Список уроков конкретного модуля. |
| GET | `/lessons/:lessonId?locale=en` | Детали урока, включая тело и видео. |
| GET | `/progress/:userId?courseId=...` | Сводка прогресса пользователя по курсу. |
| PATCH | `/progress` | Upsert статуса просмотра урока. |
| GET | `/certificates/user/:userId?locale=ru` | Список сертификатов пользователя. |
| GET | `/certificates/verify/:hash?locale=en` | Публичная верификация сертификата по хэшу. |
| POST | `/certificates?locale=ru` | Выпуск/обновление сертификата для enrollment. |
| GET | `/monitoring/health` | JSON health-check (DB latency, storage config, uptime). |
| GET | `/monitoring/metrics` | Prometheus текст с процессными/пользовательскими метриками. |

### Observability

- **Health** — `/monitoring/health` возвращает статус `ok/degraded/error`, latency пинга базы и краткое описание конфигурации стораджа. Подходит для ALB/Nginx healthcheck и алертов.
- **Metrics** — `/monitoring/metrics` отдаёт Prometheus 0.0.4 формат (подключен `prom-client`, включены дефолтные процессные метрики + `virgo_api_uptime_seconds`/`virgo_api_health_status`). Точку можно скрейпить Grafana Agent / Datadog Prom integration.
- **Versioning** — задайте `APP_VERSION` для подписи health-response и облегчения раскатки.
