#!/bin/bash
# Скрипт для легковесного деплоя на VPS без Docker

# Настройки сервера
SERVER="root@144.31.68.9"
REMOTE_PATH="/var/www/gym"

echo "🚀 Начинаем сборку Frontend..."
cd frontend
npm run build
cd ..

echo "📦 Копируем файлы на сервер..."
# Создаем директорию на сервере, если ее нет
ssh $SERVER "mkdir -p $REMOTE_PATH/frontend/dist $REMOTE_PATH/api"

# Копируем билд фронтенда
rsync -avz --delete frontend/dist/ $SERVER:$REMOTE_PATH/frontend/dist/

# Копируем бэкенд (исключая node_modules)
rsync -avz --exclude 'node_modules' --exclude 'test' api/ $SERVER:$REMOTE_PATH/api/

echo "⚙️  Обновляем зависимости и перезапускаем Backend..."
ssh $SERVER "cd $REMOTE_PATH/api && npm install --production && pm2 restart gym-api || pm2 start server.js --name gym-api"

echo "✅ Деплой успешно завершен!"
