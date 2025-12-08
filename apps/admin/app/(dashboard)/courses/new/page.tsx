import Link from "next/link";
import { Button } from "@virgo/ui";
import { PageHeader } from "../../../../src/components/page-header";
import { CourseEditor } from "../../../../src/components/course-editor";
import { saveCourseDraftAction } from "../../../../src/actions/course-drafts";

export default function NewCoursePage() {
  return (
    <>
      <PageHeader
        eyebrow="Курсы"
        title="Создать курс"
        description="Соберите карточку программы, добавьте расписание и сохраните черновик для команды контента."
        actions={
          <Link href="/courses">
            <Button variant="ghost">Назад к списку</Button>
          </Link>
        }
      />
      <CourseEditor onSaveDraft={saveCourseDraftAction} />
    </>
  );
}
