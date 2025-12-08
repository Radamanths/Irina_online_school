import Link from "next/link";
import { Button } from "@virgo/ui";
import { getCourseSummaries } from "../../../src/lib/api";
import { PageHeader } from "../../../src/components/page-header";
import { CourseDirectoryTable } from "../../../src/components/course-directory-table";

export default async function CoursesPage() {
  const courses = await getCourseSummaries();

  return (
    <>
      <PageHeader
        eyebrow="Курсы"
        title="Текущие программы"
        description="Следите за статусом потоков, нагрузкой кураторов и обновлением учебных материалов."
        actions={
          <Link href="/courses/new">
            <Button>Добавить курс</Button>
          </Link>
        }
      />
      <CourseDirectoryTable courses={courses} />
    </>
  );
}
