import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@virgo/ui";
import { getCourseDetail } from "../../../../src/lib/api";
import { saveCourseDraftAction } from "../../../../src/actions/course-drafts";
import { PageHeader } from "../../../../src/components/page-header";
import { CourseEditor } from "../../../../src/components/course-editor";

type CourseEditorPageProps = {
  params: { courseId: string };
};

export default async function CourseEditorPage({ params }: CourseEditorPageProps) {
  const course = await getCourseDetail(params.courseId);

  if (!course) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Курсы"
        title={`Редактор: ${course.title}`}
        description="Измените программу, обновите расписание и сохраните изменения для команд продаж и контента."
        actions={
          <>
            <Link href="/courses">
              <Button variant="ghost">Назад к списку</Button>
            </Link>
            <Link
              href={`/api/courses/${course.id}/progress-export?format=csv`}
              prefetch={false}
              target="_blank"
            >
              <Button>Экспорт прогресса (CSV)</Button>
            </Link>
          </>
        }
      />
      <CourseEditor course={course} onSaveDraft={saveCourseDraftAction} />
    </>
  );
}
