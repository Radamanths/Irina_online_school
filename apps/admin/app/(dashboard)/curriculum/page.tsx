import Link from "next/link";
import { Button } from "@virgo/ui";
import { getModuleDirectory } from "../../../src/lib/api";
import { PageHeader } from "../../../src/components/page-header";
import { ModuleDirectoryTable } from "../../../src/components/module-directory-table";

export default async function CurriculumPage() {
  const modules = await getModuleDirectory();

  return (
    <>
      <PageHeader
        eyebrow="Учебный план"
        title="Модули и уроки"
        description="Наводите порядок в структуре программ: фиксируйте владельцев модулей, статусы и актуальные правки."
        actions={
          <Link href="/courses/new?focus=modules">
            <Button>Создать модуль</Button>
          </Link>
        }
      />
      <ModuleDirectoryTable modules={modules} />
    </>
  );
}
