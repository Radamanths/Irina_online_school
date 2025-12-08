import { Button } from "@virgo/ui";

export function Topbar() {
  return (
    <header className="topbar">
      <form>
        <label className="sr-only" htmlFor="admin-search">
          Поиск
        </label>
        <input id="admin-search" placeholder="Поиск по студентам, курсам, транзакциям" />
      </form>
      <div className="topbar__actions">
        <Button variant="ghost">Создать</Button>
        <form action="/api/logout" method="post">
          <Button type="submit" variant="ghost">
            Выйти
          </Button>
        </form>
      </div>
    </header>
  );
}
