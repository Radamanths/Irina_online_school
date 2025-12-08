import { Button } from "@virgo/ui";
import { PageHeader } from "../../../src/components/page-header";
import { UserDirectoryTable } from "../../../src/components/user-directory-table";
import { UserRoleSummary } from "../../../src/components/user-role-summary";
import { getAvailableRoles, getUserDirectory } from "../../../src/lib/api";

export default async function UsersPage() {
  const [users, roleOptions] = await Promise.all([getUserDirectory(), getAvailableRoles()]);

  return (
    <>
      <PageHeader
        eyebrow="Команда"
        title="Пользователи и роли"
        description="Следите за доступами и активностью аккаунтов, приглашайте новых членов команды."
        actions={
          <>
            <Button variant="ghost">Экспорт</Button>
            <Button>Пригласить пользователя</Button>
          </>
        }
      />
      <UserRoleSummary users={users} roleOptions={roleOptions} />
      <UserDirectoryTable users={users} roleOptions={roleOptions} />
    </>
  );
}
