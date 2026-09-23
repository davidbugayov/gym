import re
import os

locales_dir = "/Users/dsbugaev/StudioProject/gym/frontend/src/locales"
starter_js_path = "/Users/dsbugaev/StudioProject/gym/frontend/src/lib/starter.js"

# 1. Update starter.js
with open(starter_js_path, "r") as f:
    starter = f.read()

starter = starter.replace("name: 'АХИЛЛЕС', detail: '3 дня · Гантели и скамья (Superbiceps)'", "name: 'Achilles', detail: '3 days · Dumbbells and bench (SB)'")
starter = starter.replace("name: 'АХИЛЛЕС-2', detail: '3 дня · Продолжение Ахиллеса (Superbiceps)'", "name: 'Achilles 2', detail: '3 days · Achilles continuation (SB)'")
starter = starter.replace("name: 'ЗЕВС', detail: '3 дня · Универсальная турник, брусья (Superbiceps)'", "name: 'Zeus', detail: '3 days · Universal bodyweight (SB)'")
starter = starter.replace("name: 'ТЕСЕЙ', detail: '3 дня · Базовые упражнения в зале (Superbiceps)'", "name: 'Theseus', detail: '3 days · Basic gym exercises (SB)'")
starter = starter.replace("name: 'ТЕСЕЙ-2', detail: '3 дня · Новый уровень силы и массы (Superbiceps)'", "name: 'Theseus 2', detail: '3 days · Advanced strength and mass (SB)'")
starter = starter.replace("name: 'ЯСОН', detail: '3 дня · Без становой и приседа (Superbiceps)'", "name: 'Jason', detail: '3 days · No deadlift and squat (SB)'")
starter = starter.replace("name: 'Универсальный спортсмен', detail: '2 дня · Бюджетная программа (Superbiceps)'", "name: 'Universal Athlete', detail: '2 days · Budget program (SB)'")
starter = starter.replace("name: 'Акцент на жим лежа', detail: '3 дня · Сниженная нагрузка на ноги (Superbiceps)'", "name: 'Bench Press Focus', detail: '3 days · Reduced leg load (SB)'")
starter = starter.replace("name: 'КОЛОСС', detail: '7 дней · Универсальная программа (Superbiceps)'", "name: 'Colossus', detail: '7 days · Universal program (SB)'")

with open(starter_js_path, "w") as f:
    f.write(starter)

# 2. Add keys to all locale files
translations = {
    "ru": {
        "Achilles": "АХИЛЛЕС", "3 days · Dumbbells and bench (SB)": "3 дня · Гантели и скамья (Superbiceps)",
        "Achilles 2": "АХИЛЛЕС-2", "3 days · Achilles continuation (SB)": "3 дня · Продолжение Ахиллеса (Superbiceps)",
        "Zeus": "ЗЕВС", "3 days · Universal bodyweight (SB)": "3 дня · Универсальная турник, брусья (Superbiceps)",
        "Theseus": "ТЕСЕЙ", "3 days · Basic gym exercises (SB)": "3 дня · Базовые упражнения в зале (Superbiceps)",
        "Theseus 2": "ТЕСЕЙ-2", "3 days · Advanced strength and mass (SB)": "3 дня · Новый уровень силы и массы (Superbiceps)",
        "Jason": "ЯСОН", "3 days · No deadlift and squat (SB)": "3 дня · Без становой и приседа (Superbiceps)",
        "Universal Athlete": "Универсальный спортсмен", "2 days · Budget program (SB)": "2 дня · Бюджетная программа (Superbiceps)",
        "Bench Press Focus": "Акцент на жим лежа", "3 days · Reduced leg load (SB)": "3 дня · Сниженная нагрузка на ноги (Superbiceps)",
        "Colossus": "КОЛОСС", "7 days · Universal program (SB)": "7 дней · Универсальная программа (Superbiceps)"
    }
}

files = [f for f in os.listdir(locales_dir) if f.endswith('.js')]
for file in files:
    path = os.path.join(locales_dir, file)
    with open(path, "r") as f:
        content = f.read()
    
    lang = file.replace('.js', '')
    
    to_add = ",\n"
    for eng, trans in translations["ru"].items():
        val = trans if lang == "ru" else eng  # Default to English for other languages
        to_add += f"  '{eng}': '{val}',\n"
    
    # insert before the final '}'
    content = content.replace("\n}", to_add + "}")
    
    with open(path, "w") as f:
        f.write(content)

