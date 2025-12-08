import Link from "next/link";
import type { CourseDetail, EnrollmentAccessCheck } from "../lib/types";
import type { TranslationShape } from "../lib/i18n.config";

interface LessonGateNoticeProps {
  locale: string;
  courseSlug: string;
  course: CourseDetail;
  access: EnrollmentAccessCheck;
  copy: TranslationShape["lessonPlayer"]["locked"];
}

export function LessonGateNotice({ locale, courseSlug, course, access, copy }: LessonGateNoticeProps) {
  const unlockAt = access.unlockAt ? new Date(access.unlockAt) : null;
  const prerequisiteModule = access.prerequisiteModuleId
    ? course.modules.find(module => module.id === access.prerequisiteModuleId)
    : null;

  const showDrip = access.reason === "DRIP_LOCKED";
  const showPrerequisite = access.reason === "PREREQUISITE_PENDING";

  return (
    <div className="lesson-gate">
      <header className="lesson-gate__header">
        <p className="eyebrow">{course.title}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <div className="lesson-gate__cards">
        {showDrip && (
          <GateCard
            title={copy.dripTitle}
            description={unlockAt ? formatDripDescription(copy.dripSubtitle, unlockAt, locale) : copy.dripFallback}
          />
        )}
        {showPrerequisite && (
          <GateCard
            title={copy.prerequisiteTitle}
            description={
              prerequisiteModule
                ? formatPrerequisiteDescription(copy.prerequisiteSubtitle, prerequisiteModule.title)
                : copy.prerequisiteFallback
            }
          />
        )}
      </div>
      <p className="lesson-gate__note">{copy.genericReason}</p>
      <div className="lesson-gate__actions">
        <Link className="button" href={`/${locale}/dashboard/course/${courseSlug}`}>
          {copy.backCta}
        </Link>
      </div>
    </div>
  );
}

function GateCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="lesson-gate__card">
      <p className="lesson-gate__card-title">{title}</p>
      <p className="lesson-gate__card-description">{description}</p>
    </div>
  );
}

function formatDripDescription(template: string, date: Date, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    dateStyle: "long",
    timeStyle: "short"
  });
  return template.replace("{date}", formatter.format(date));
}

function formatPrerequisiteDescription(template: string, moduleTitle: string) {
  return template.replace("{module}", moduleTitle);
}
