"""Extract numerical training prescriptions from the downloaded athlete.ru XLS files.

Run with a Python environment containing xlrd and olefile:
python scripts/extract-athlete-cycles.py /path/to/downloaded/xls
"""
import hashlib
import json
from pathlib import Path
import re
import struct
import sys

import olefile
import xlrd

root = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'frontend/src/catalog/athlete-cycles.json'
source = 'http://forum.athlete.ru/t7249/'


def formula_map(path):
    ole = olefile.OleFileIO(path)
    stream = ole.openstream('Workbook').read()
    i, sheet, result = 0, -1, {}
    while i + 4 <= len(stream):
        code, size = struct.unpack_from('<HH', stream, i)
        data = stream[i + 4:i + 4 + size]
        i += 4 + size
        if code == 0x809:
            sheet += 1
        if code == 6:
            row, col = struct.unpack_from('<HH', data)
            result[sheet - 1, row, col] = data[22:]
    ole.close()
    return result


def metadata(file, sheet, attach):
    path = root / file
    return {'source': source, 'file': file, 'sheet': sheet,
            'download': f'http://forum.athlete.ru/index.php?app=core&module=attach&section=attach&attach_id={attach}',
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'reviewedAt': '2026-10-03'}


def numeric_sets(value, order='sets-reps'):
    if isinstance(value, (int, float)) and value > 0:
        return 1, int(value)
    parts = re.findall(r'\d+', str(value))
    if len(parts) == 1:
        return 1, int(parts[0])
    if len(parts) == 2:
        a, b = map(int, parts)
        return (a, b) if order == 'sets-reps' else (b, a)
    raise ValueError(f'Unsupported prescription: {value!r}')


programs = []
file = '2.xls'
book = xlrd.open_workbook(str(root / file))
sheet = book.sheet_by_name('Русский цикл')
formulas = formula_map(root / file)
sessions = []
exercise_ids = {'Присед': '0043', 'Жим': '0025', 'Становая': '0032'}
for week in range(1, 10):
    row = 8 + (week - 1) * 3
    for day, col in enumerate([2, 5, 8], 1):
        entries = []
        for r in [row, row + 1]:
            label = str(sheet.cell_value(r, col)).strip()
            if not label:
                continue
            count, reps = numeric_sets(sheet.cell_value(r, col + 2))
            tokens = formulas[4, r, col + 1]
            factor = struct.unpack_from('<d', tokens, 1)[0] if tokens[0] == 0x1f else 1
            ex_id = exercise_ids[label]
            baseline = {'0043': 165, '0025': 105, '0032': 180}[ex_id]
            assert round(baseline * factor / 2.5) * 2.5 == sheet.cell_value(r, col + 1)
            entries.append({'id': ex_id, 'sets': [{'pct': round(factor * 100, 2), 'reps': reps} for _ in range(count)]})
        sessions.append({'week': week, 'day': day, 'weekday': [1, 3, 5][day - 1], 'ex': entries})
programs.append({'id': 'russian-cycle', 'title': 'Русский цикл — 9 недель', 'titleEn': 'Russian cycle — 9 weeks',
                 'description': 'Три тренировки в неделю: присед, жим и тяга. Нагрузка по формуле исходного листа.',
                 'duration': '9 недель', 'lifts': ['0043', '0025', '0032'], 'rounding': 'nearest', 'sessions': sessions,
                 **metadata(file, sheet.name, 4579)})

for sheet_name, program_id in [('4 недели', 'butenko-4'), ('16 недель', 'butenko-16')]:
    file = '4.xls'
    sheet = xlrd.open_workbook(str(root / file)).sheet_by_name(sheet_name)
    sessions, week, day, current = [], 0, 0, None
    for row in range(3, 37 if sheet_name == '16 недель' else 19):
        raw_week = sheet.cell_value(row, 0)
        if isinstance(raw_week, (int, float)):
            week, day = int(raw_week), 0
        if str(sheet.cell_value(row, 1)).strip():
            day += 1
            current = {'week': week, 'day': day, 'weekday': {'Пн': 1, 'Ср': 3, 'Пт': 5}[sheet.cell_value(row, 2)], 'ex': []}
            sessions.append(current)
        sets = []
        for col in range(4, sheet.ncols - 1):
            value = sheet.cell_value(row, col)
            if value == '':
                continue
            percent = sheet.cell_value(1, col)
            if not isinstance(percent, (int, float)):
                raise ValueError(f'Unresolved intensity range at {sheet_name}!{row},{col}')
            count, reps = numeric_sets(value)
            sets.extend({'pct': round(percent * 100, 2), 'reps': reps} for _ in range(count))
        if sets:
            current['ex'].append({'id': '0025', 'sets': sets})
    programs.append({'id': program_id, 'title': f'Бутенко — {sheet_name}', 'titleEn': f'Butenko — {sheet_name}',
                     'description': 'Жим лёжа: все блоки подходов и проценты из исходной таблицы, включая разминку.',
                     'duration': '4 недели' if program_id == 'butenko-4' else '16 недель + выход (17-я неделя)',
                     'lifts': ['0025'], 'rounding': 'down', 'sessions': sessions,
                     **metadata(file, sheet_name, 4581)})

file = '5.xls'
sheet = xlrd.open_workbook(str(root / file)).sheet_by_index(0)
sessions, week, day, current = [], 0, 0, None
for row in range(5, 21):
    if sheet.cell_value(row, 0) != '':
        week = int(sheet.cell_value(row, 0))
    if sheet.cell_value(row, 1) != '':
        day = int(sheet.cell_value(row, 1))
        current = {'week': week, 'day': day, 'weekday': [1, 3, 5][day - 1], 'ex': []}
        sessions.append(current)
    sets = []
    for col in range(3, 12):
        value = str(sheet.cell_value(row, col)).strip()
        if not value:
            continue
        # This workbook uses x repetitions x sets (unlike 4.xls).
        count, reps = numeric_sets(value, 'reps-sets')
        sets.extend({'pct': round(sheet.cell_value(3, col) * 100, 2), 'reps': reps} for _ in range(count))
    if sets:
        current['ex'].append({'id': '0025', 'sets': sets})
programs.append({'id': 'butenko-peak', 'title': 'Пиковый цикл Бутенко — 4 недели', 'titleEn': 'Butenko peaking cycle — 4 weeks',
                 'description': 'Жим лёжа с паузой. Проценты и последовательность подходов перенесены из 5.xls.',
                 'duration': '4 недели', 'lifts': ['0025'], 'rounding': 'nearest', 'sessions': sessions,
                 **metadata(file, sheet.name, 4582)})
out.write_text(json.dumps(programs, ensure_ascii=False, indent=2) + '\n')
print([(p['id'], len(p['sessions'])) for p in programs])
