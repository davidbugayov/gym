const fs = require('fs');

// 1. Add translations to ru.js
const ruPath = 'frontend/src/locales/ru.js';
let ruContent = fs.readFileSync(ruPath, 'utf8');

const additions = `
  'Ready-made programs': 'Готовые программы',
  'Forge Upper': 'Кузница: Верх',
  'Forge Lower': 'Кузница: Низ',
  'Forge Full': 'Кузница: Фулбади',
  'dumbbell standing overhead press': 'Жим гантелей стоя',
  'dumbbell bench press': 'Жим гантелей лежа',
  'dumbbell hammer curl': 'Молотки с гантелями',
  'kettlebell goblet squat': 'Гоблет-приседания с гирей',
  'dumbbell lunge': 'Выпады с гантелями',
  'kettlebell swing': 'Махи гирей',
  'dumbbell one arm bent-over row': 'Тяга гантели в наклоне одной рукой',
  'bodyweight standing calf raise': 'Подъем на носки стоя (свой вес)',
  'Replace your current week.': 'Заменит вашу текущую неделю.',
  'Days that the plan leaves empty will become rest days.': 'Дни, которые план оставляет пустыми, станут днями отдыха.'
`;

ruContent = ruContent.replace('\n}', additions + '\n}');
fs.writeFileSync(ruPath, ruContent);

// 2. Wrap variables with t() in sheets.jsx
const sheetsPath = 'frontend/src/sheets.jsx';
let sheetsContent = fs.readFileSync(sheetsPath, 'utf8');

// Replace {ex.n} -> {t(ex.n)}
sheetsContent = sheetsContent.replace(/\{ex\.n\}/g, '{t(ex.n)}');
// Replace {e.n} -> {t(e.n)}
sheetsContent = sheetsContent.replace(/\{e\.n\}/g, '{t(e.n)}');
// Replace {current.n} -> {t(current.n)}
sheetsContent = sheetsContent.replace(/\{current\.n\}/g, '{t(current.n)}');

fs.writeFileSync(sheetsPath, sheetsContent);
console.log('Translations fixed!');
