const fs = require('fs');

// 1. Add translations to ru.js
const ruPath = 'frontend/src/locales/ru.js';
let ruContent = fs.readFileSync(ruPath, 'utf8');

const additions = `
  'Training Program & Schedule': 'Программа тренировок и расписание',
  'Show program': 'Показать программу',
  'Hero Rounds Training': 'ТРЕНИРОВКА HERO ROUNDS',
  'Named 5-Round Workouts': 'Именные 5-раундовые тренировки',
  'High-intensity bodyweight rounds with rapid set transitions.': 'Высокоинтенсивные круговые тренировки с собственным весом и быстрыми переходами.',
  'Blaze': 'Блейз',
  'Burpees · Jump Squats · Sit-ups · 5 rounds': 'Берпи · Выпрыгивания · Пресс · 5 раундов',
  'Titan': 'Титан',
  'Push-ups · Jumping Jacks · Lunges · 5 rounds': 'Отжимания · Джампинг Джеки · Выпады · 5 раундов',
  'Vortex': 'Вортекс',
  'Climbers · Sit-ups · Jump Squats · 5 rounds': 'Скалолаз · Пресс · Выпрыгивания · 5 раундов'
`;

ruContent = ruContent.replace('\n}', additions + '\n}');
fs.writeFileSync(ruPath, ruContent);

// 2. Wrap strings in Workout.jsx
const wPath = 'frontend/src/views/Workout.jsx';
let wContent = fs.readFileSync(wPath, 'utf8');

wContent = wContent.replace('<div className="fl-god-name">⚡ Blaze</div>', '<div className="fl-god-name">⚡ {t(\'Blaze\')}</div>');
wContent = wContent.replace('<div className="fl-god-desc">Burpees · Jump Squats · Sit-ups · 5 rounds</div>', '<div className="fl-god-desc">{t(\'Burpees · Jump Squats · Sit-ups · 5 rounds\')}</div>');

wContent = wContent.replace('<div className="fl-god-name">⚡ Titan</div>', '<div className="fl-god-name">⚡ {t(\'Titan\')}</div>');
wContent = wContent.replace('<div className="fl-god-desc">Push-ups · Jumping Jacks · Lunges · 5 rounds</div>', '<div className="fl-god-desc">{t(\'Push-ups · Jumping Jacks · Lunges · 5 rounds\')}</div>');

wContent = wContent.replace('<div className="fl-god-name">⚡ Vortex</div>', '<div className="fl-god-name">⚡ {t(\'Vortex\')}</div>');
wContent = wContent.replace('<div className="fl-god-desc">Climbers · Sit-ups · Jump Squats · 5 rounds</div>', '<div className="fl-god-desc">{t(\'Climbers · Sit-ups · Jump Squats · 5 rounds\')}</div>');

fs.writeFileSync(wPath, wContent);
console.log('Fixes applied!');
