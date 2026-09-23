import re
import json
import time
from deep_translator import GoogleTranslator

# File paths
locales_path = "frontend/src/locales/ru.js"
exercises_path = "frontend/src/lib/exercises-data.js"
starter_path = "frontend/src/lib/starter.js"

# 1. Read existing translations
with open(locales_path, "r", encoding="utf-8") as f:
    ru_content = f.read()

# Very basic extraction of keys (assumes single quotes around keys)
existing_keys = set(re.findall(r"^\s*'([^']+)':", ru_content, re.MULTILINE))

# 2. Find all exercise names
with open(exercises_path, "r", encoding="utf-8") as f:
    ex_data_str = f.read()

# The file looks like: export const EXDB=[{"id":"0001","n":"3/4 sit-up",...}]
# We can extract all "n": "something"
exercise_names = re.findall(r'"n":\s*"([^"]+)"', ex_data_str)
exercise_names = list(set(exercise_names))

# Also add hardcoded ones
hardcoded = {
    "Ready-made programs": "Готовые программы",
    "Forge Upper": "Кузница: Верх",
    "Forge Lower": "Кузница: Низ",
    "Forge Full": "Кузница: Фулбади",
    "Replace your current week.": "Заменит вашу текущую неделю.",
    "Days that the plan leaves empty will become rest days.": "Дни, которые план оставляет пустыми, станут днями отдыха."
}

# Determine what needs translation
to_translate = []
for n in exercise_names:
    if n not in existing_keys and n not in hardcoded:
        to_translate.append(n)

print(f"Total exercises: {len(exercise_names)}")
print(f"Need to translate: {len(to_translate)} strings.")

translator = GoogleTranslator(source='en', target='ru')

new_translations = dict(hardcoded)

# Translate in chunks to avoid blocking/timeouts
batch_size = 50
for i in range(0, len(to_translate), batch_size):
    batch = to_translate[i:i+batch_size]
    print(f"Translating batch {i//batch_size + 1}/{(len(to_translate)+batch_size-1)//batch_size}...")
    try:
        # translator.translate_batch supports list of strings
        res = translator.translate_batch(batch)
        for original, translated in zip(batch, res):
            if translated:
                # capitalize first letter
                translated = translated.capitalize()
                new_translations[original] = translated
    except Exception as e:
        print(f"Error on batch {i}: {e}")
    time.sleep(1)

# Append to ru.js
if new_translations:
    print(f"Appending {len(new_translations)} new translations to ru.js...")
    to_add = ",\n"
    for k, v in new_translations.items():
        # Escape single quotes in keys and values
        k_esc = k.replace("'", "\\'")
        v_esc = v.replace("'", "\\'")
        to_add += f"  '{k_esc}': '{v_esc}',\n"
    
    # insert before the final '}'
    ru_content = ru_content.replace("\n}", to_add + "}")
    
    with open(locales_path, "w", encoding="utf-8") as f:
        f.write(ru_content)
        
    print("Done!")
else:
    print("Nothing to add.")
