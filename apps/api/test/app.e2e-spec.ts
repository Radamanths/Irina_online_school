import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { createPrismaMock } from "./prisma.mock";

describe("Virgo API e2e", () => {
  let app: INestApplication;
  const prismaMock = createPrismaMock();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns localized course list", async () => {
    const response = await request(app.getHttpServer()).get("/courses").query({ locale: "en" }).expect(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toMatchObject({ slug: "intro-design", title: "Design from Scratch" });
  });

  it("returns module outline with lessons", async () => {
    const response = await request(app.getHttpServer()).get("/modules").query({ courseId: "course-1", locale: "ru" }).expect(200);
    expect(response.body[0].lessons).toHaveLength(2);
  });

  it("returns lesson detail", async () => {
    const response = await request(app.getHttpServer())
      .get("/lessons/lesson-1")
      .set("x-user-id", "user-1")
      .query({ locale: "ru" })
      .expect(200);
    expect(response.body).toMatchObject({ id: "lesson-1", moduleId: "module-1" });
  });

  it("lists user progress", async () => {
    const response = await request(app.getHttpServer()).get("/progress/user-1").query({ courseId: "course-1" }).expect(200);
    expect(response.body[0]).toMatchObject({ userId: "user-1", lessonId: "lesson-1" });
  });

  it("upserts lesson progress", async () => {
    const response = await request(app.getHttpServer())
      .patch("/progress")
      .send({ userId: "user-1", lessonId: "lesson-2", status: "completed", watchedSeconds: 1200 })
      .expect(200);

    expect(response.body).toMatchObject({ lessonId: "lesson-2", status: "completed" });
  });

  it("lists user certificates", async () => {
    const response = await request(app.getHttpServer()).get("/certificates/user/user-1").expect(200);
    expect(response.body[0]).toMatchObject({ enrollmentId: "enroll-1" });
  });

  it("verifies certificate by hash", async () => {
    const response = await request(app.getHttpServer()).get("/certificates/verify/hash-123").expect(200);
    expect(response.body).toMatchObject({ hash: "hash-123" });
  });

  it("issues or updates certificate", async () => {
    const response = await request(app.getHttpServer())
      .post("/certificates")
      .send({ enrollmentId: "enroll-1", pdfUrl: "https://cdn.example.com/cert-1-new.pdf" })
      .expect(201);

    expect(response.body.pdfUrl).toBe("https://cdn.example.com/cert-1-new.pdf");
  });

  it("processes Stripe webhook events", async () => {
    const payload = {
      id: "evt_test",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test",
          amount_received: 50000,
          currency: "usd",
          status: "succeeded",
          metadata: { orderId: "order-1" }
        }
      }
    };

    const response = await request(app.getHttpServer())
      .post("/payments/webhooks/stripe")
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({ received: true });

    const payment = await prismaMock.payment.findUnique({ where: { id: "payment-1" } });
    expect(payment?.status).toBe("succeeded");
    expect(payment?.processedAt).toBeInstanceOf(Date);

    const order = await prismaMock.order.findUnique({
      where: { id: "order-1" },
      include: { enrollment: { select: { courseId: true } } }
    });
    expect(order?.status).toBe("completed");
  });

  it("allows manual refunds via API", async () => {
    const response = await request(app.getHttpServer())
      .post("/payments/payment-1/refund")
      .send({ reason: "duplicate payment" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "payment-1",
      status: "refunded",
      orderId: "order-1",
      reason: "duplicate payment"
    });

    const payment = await prismaMock.payment.findUnique({ where: { id: "payment-1" } });
    const metadata = (payment?.webhookPayload as Record<string, any> | null) ?? null;
    expect(payment?.status).toBe("refunded");
    expect(metadata?.manualRefund?.reason).toBe("duplicate payment");

    const order = await prismaMock.order.findUnique({ where: { id: "order-1" } });
    expect(order?.status).toBe("refunded");
  });

  describe("Admin orders feed", () => {
    it("returns paginated metadata for admin orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/orders")
        .query({ limit: 1, offset: 0 })
        .expect(200);

      expect(response.body).toMatchObject({ limit: 1, offset: 0 });
      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
    });

    it("supports filtering admin orders by status and payment state", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/orders")
        .query({ status: "completed", paymentStatus: "paid", method: "stripe" })
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      response.body.items.forEach((order: any) => {
        expect(order.status).toBe("completed");
        expect(order.paymentStatus).toBe("paid");
        expect(order.method).toBe("Stripe");
      });
      expect(Array.isArray(response.body.facets?.methods)).toBe(true);
    });

    it("filters admin orders by cohort, currency, and date range", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/orders")
        .query({ courseSlug: "intro-design", currency: "usd", from: "2025-01-01", to: "2025-01-02" })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].cohort).toBe("INTRO-DESIGN");
      expect(response.body.items[0].currency).toBe("USD");
      expect(response.body.facets?.cohorts).toContain("INTRO-DESIGN");
    });
  });

  describe("Monitoring", () => {
    it("exposes aggregated health information", async () => {
      const response = await request(app.getHttpServer()).get("/monitoring/health").expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded|error)$/),
        services: expect.any(Object),
        uptimeSeconds: expect.any(Number)
      });
      expect(response.body.services).toHaveProperty("database");
      expect(response.body.services).toHaveProperty("storage");
    });

    it("exports Prometheus metrics", async () => {
      const response = await request(app.getHttpServer()).get("/monitoring/metrics").expect(200);
      expect(response.headers["content-type"]).toContain("text/plain");
      expect(response.text).toContain("virgo_api_uptime_seconds");
    });
  });
});
