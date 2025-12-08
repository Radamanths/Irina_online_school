# Virgo School — типографика

## Гарнитуры
| Token | Stack | Роль | Источник |
| --- | --- | --- | --- |
| `font.family.display` | `"Baskerville Cyrillic LT Std", "Times New Roman", serif` | Церемониальные заголовки, герои | `Сайт_Брендбук/Брендбук/Baskerville` |
| `font.family.primary` | `"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Основной UI и текст | `Сайт_Брендбук/Брендбук/Noto_Sans` |
| `font.family.accent` | `"PP Cirka", "Poppins", "Noto Sans", sans-serif` | Плашки, цитаты, бейджи | `Сайт_Брендбук/Брендбук/символы и лого` |

- **Baskerville Cyrillic LT Std** — используется в презентации бренда для крупных хедеров, поддерживает кириллицу.
- **Noto Sans** (variable) покрывает все веса от 300 до 700; выбираем Light/Regular/Medium/SemiBold/Bold для контраста.
- **PP Cirka / Poppins** применяются точечно для декоративных акцентов и цифр.

## Иерархия размеров (desktop)
| Token | Family | Weight | Size / Line | Использование |
| --- | --- | --- | --- | --- |
| `type.display.hero` | Display | 600 | 64 / 72 | Главный хедер landing |
| `type.heading.h1` | Display | 400 | 48 / 58 | Ключевые секции |
| `type.heading.h2` | Primary | 600 | 36 / 44 | Титулы блоков курсов |
| `type.heading.h3` | Primary | 500 | 28 / 36 | Карточки, преимущества |
| `type.heading.h4` | Primary | 500 | 22 / 30 | Подзаголовки, FAQ |
| `type.body.lead` | Primary | 400 | 20 / 32 | Интро-текст |
| `type.body.base` | Primary | 400 | 16 / 26 | Основной текст |
| `type.body.small` | Primary | 400 | 14 / 22 | Подписи, дисклеймеры |
| `type.ui.button` | Primary | 600 | 16 / 20 | CTA, строки caps |
| `type.ui.label` | Primary | 500 | 12 / 16 | Формы, бейджи |
| `type.display.kicker` | Accent | 500 | 18 / 24 (ls 2) | Eyebrow/eyeliner |
| `type.quote.pull` | Accent | 500 | 24 / 34 | Цитаты студентов |

## Настройки
- **База**: 16px, сетка 4px. Line-height кратен 2px для выравнивания.
- **Letter-spacing**: у hero и h1 отрицательный кернинг (−0.5 / −0.25px) для плотных титулов; кнопки и ярлыки получают +1…+1.2px.
- **Регистр**: kicker, button, label — uppercase.
- **Fallbacks**: serif блоки сходятся на `Times New Roman`, sans — на системные стекcы.

## Практика внедрения
1. Добавьте токены из `design_tokens/typography.json` в тему (CSS custom properties или JSON → style-dictionary).
2. Для web используйте `font-feature-settings: "liga" on;` для Baskerville, `font-variation-settings: "wght"` для тонкой настройки Noto Sans.
3. Протестируйте line-height в многоязычных блоках (рус/лат) — Noto Sans поддерживает оба сценария.
4. Проверяйте контраст текста с токенами цвета (см. `docs/brand_palette.md`).
