import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { Card } from "@virgo/ui";
import type { CertificateSummary } from "../lib/types";

interface CertificateCardProps {
  certificate: CertificateSummary;
  locale: string;
  issuedLabel: string;
  downloadLabel: string;
}

export function CertificateCard({ certificate, locale, issuedLabel, downloadLabel }: CertificateCardProps) {
  const issuedDate = formatIssuedDate(certificate.issuedAt, locale, issuedLabel);

  return (
    <Card className="certificate-card">
      <header>
        <p className="eyebrow">{certificate.courseTitle}</p>
        <h3>{certificate.id.slice(0, 8).toUpperCase()}</h3>
      </header>
      <p>{issuedDate}</p>
      <p className="certificate-card__hash">{certificate.hash}</p>
      <div className="certificate-card__actions">
        <a className="button button--ghost" href={certificate.pdfUrl} target="_blank" rel="noreferrer">
          {downloadLabel}
        </a>
      </div>
    </Card>
  );
}

function formatIssuedDate(date: string, locale: string, issuedLabel: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return `${issuedLabel}: —`;
  }

  const formatterLocale = locale === "ru" ? ru : enUS;
  const formatted = format(parsed, "d MMMM yyyy", { locale: formatterLocale });
  return `${issuedLabel}: ${formatted}`;
}
