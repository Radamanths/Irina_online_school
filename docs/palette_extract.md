# Palette Extraction Utility

`palette_extract.py` помогает быстро собрать доминирующие цвета из брендовых SVG/растровых файлов и выгрузить их в JSON.

## Установка зависимостей

Pillow уже добавлен в `.venv`. Если запускаете вне окружения, установите:

```powershell
pip install pillow
```

## Быстрый старт

```powershell
D:/Develops/online_school_Irina/.venv/Scripts/python.exe palette_extract.py
```

По умолчанию скрипт сканирует папку `Сайт_Брендбук/Брендбук/градиенты` и печатает словарь вида `{stem: [hex...]}`.

## Полезные параметры

- `inputs` — список файлов или директорий для сканирования (можно комбинировать).
- `--top` — сколько уникальных цветов возвращать для каждого файла (по умолчанию 6).
- `--sample` — размер квадрата для даунсемплинга перед подсчетом цветов (умолчание 80px).
- `--flatten` — выводить простой словарь вместо подробного объекта с метаданными.
- `-o, --output` — путь к JSON-файлу. Папки создаются автоматически.

### Примеры

Собрать расширенный отчёт: 

```powershell
D:/Develops/online_school_Irina/.venv/Scripts/python.exe palette_extract.py \
  "Сайт_Брендбук/Брендбук/градиенты" "Сайт_Брендбук/Брендбук/svg" \
  --top 8 --sample 100 --output design_tokens/palette_snapshot.json
```

Получить плоский словарь для быстрого копипаста:

```powershell
D:/Develops/online_school_Irina/.venv/Scripts/python.exe palette_extract.py градиент-01.svg --flatten
```

## Интеграция

- JSON, сохранённый в `design_tokens`, можно напрямую импортировать в Figma Tokens или синхронизировать с `colors.json`.
- Планируется дополнить pipeline автоматическим обновлением `web/styles/base.css` при изменении токенов.
