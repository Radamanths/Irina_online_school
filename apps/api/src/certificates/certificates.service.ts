import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";

export interface CertificateResponse {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  pdfUrl: string;
  hash: string;
  issuedAt: Date;
}

type CertificateWithRelations = Prisma.CertificateGetPayload<{
  include: { enrollment: { include: { course: true } } };
}>;

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listUserCertificates(userId: string, locale?: string): Promise<CertificateResponse[]> {
    if (!userId) {
      return [];
    }
    try {
      const delegate = (this.prisma as PrismaService & { certificate?: Prisma.CertificateDelegate }).certificate;
      if (!delegate) {
        return [];
      }

      const certificates = await delegate.findMany({
        where: { enrollment: { userId } },
        orderBy: { issuedAt: "desc" },
        include: { enrollment: { include: { course: true } } }
      });

      return certificates.map(record => this.mapCertificate(record, locale));
    } catch (error) {
      this.logger.error(
        `Failed to list certificates for user ${userId}`,
        error instanceof Error ? error.stack : error
      );
      return [];
    }
  }

  async getByEnrollment(enrollmentId: string, locale?: string): Promise<CertificateResponse | null> {
    try {
      const delegate = (this.prisma as PrismaService & { certificate?: Prisma.CertificateDelegate }).certificate;
      if (!delegate) {
        return null;
      }

      const certificate = await delegate.findUnique({
        where: { enrollmentId },
        include: { enrollment: { include: { course: true } } }
      });

      return certificate ? this.mapCertificate(certificate, locale) : null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch certificate for enrollment ${enrollmentId}`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  async verifyByHash(hash: string, locale?: string): Promise<CertificateResponse | null> {
    try {
      const delegate = (this.prisma as PrismaService & { certificate?: Prisma.CertificateDelegate }).certificate;
      if (!delegate) {
        return null;
      }

      const certificate = await delegate.findUnique({
        where: { hash },
        include: { enrollment: { include: { course: true } } }
      });

      return certificate ? this.mapCertificate(certificate, locale) : null;
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${hash}`, error instanceof Error ? error.stack : error);
      return null;
    }
  }

  async issueCertificate(dto: IssueCertificateDto, locale?: string): Promise<CertificateResponse> {
    const enrollmentDelegate = (this.prisma as PrismaService & { enrollment?: Prisma.EnrollmentDelegate }).enrollment;
    if (!enrollmentDelegate) {
      throw new Error("Prisma enrollment delegate is not available. Run prisma generate.");
    }

    const enrollment = await enrollmentDelegate.findUnique({
      where: { id: dto.enrollmentId },
      include: { course: true }
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${dto.enrollmentId} not found`);
    }

    const certificateDelegate = (this.prisma as PrismaService & { certificate?: Prisma.CertificateDelegate }).certificate;
    if (!certificateDelegate) {
      throw new Error("Prisma certificate delegate is not available. Run prisma generate.");
    }

    const hash = (dto.hash && dto.hash.trim()) || this.generateHash(dto.enrollmentId);
    const now = new Date();

    const record = await certificateDelegate.upsert({
      where: { enrollmentId: dto.enrollmentId },
      create: {
        enrollmentId: dto.enrollmentId,
        pdfUrl: dto.pdfUrl,
        hash,
        issuedAt: now
      },
      update: {
        pdfUrl: dto.pdfUrl,
        hash,
        issuedAt: now
      },
      include: { enrollment: { include: { course: true } } }
    });

    return this.mapCertificate(record as CertificateWithRelations, locale);
  }

  private mapCertificate(record: CertificateWithRelations, locale?: string): CertificateResponse {
    const courseTitle = this.pickCourseTitle(record.enrollment?.course, locale);

    return {
      id: record.id,
      enrollmentId: record.enrollmentId,
      userId: record.enrollment?.userId || "",
      courseId: record.enrollment?.courseId || "",
      courseTitle,
      pdfUrl: record.pdfUrl,
      hash: record.hash,
      issuedAt: record.issuedAt
    };
  }

  private pickCourseTitle(course?: CertificateWithRelations["enrollment"]["course"], locale?: string) {
    if (!course) {
      return "";
    }
    const ru = course.titleRu?.trim();
    const en = course.titleEn?.trim();
    if (locale === "en") {
      return en || ru || "";
    }
    return ru || en || "";
  }

  private generateHash(seed: string): string {
    const random = randomBytes(16).toString("hex");
    return createHash("sha256").update(`${seed}-${random}`).digest("hex");
  }
}
