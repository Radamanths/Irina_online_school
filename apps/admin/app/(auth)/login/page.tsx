import { Button } from "@virgo/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const error = query?.error;
  const errorMessage =
    error === "missing"
      ? "Введите email и пароль"
      : error === "invalid"
        ? "Неверные данные"
        : null;

  return (
    <main className="login-screen">
      <div>
        <p className="eyebrow">Virgo Admin</p>
        <h1>Вход для команды</h1>
        <p>Используйте корпоративную учетную запись, чтобы попасть в панель управления.</p>
      </div>
      <form className="stack" action="/api/login" method="post">
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" placeholder="team@virgoschool.com" required />
        <label className="sr-only" htmlFor="password">
          Пароль
        </label>
        <input id="password" name="password" type="password" placeholder="********" required />
        <Button type="submit" fullWidth>
          Войти
        </Button>
      </form>
    </main>
  );
}
