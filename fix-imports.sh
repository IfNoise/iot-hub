#!/bin/bash

# Скрипт для добавления расширений .js к импортам в TypeScript файлах
# для совместимости с ESM модулями

echo "🔧 Исправление импортов в TypeScript файлах..."

# Функция для обработки файлов
fix_imports_in_file() {
    local file="$1"
    
    # Исправляем импорты вида: from './some-file' -> from './some-file.js'
    # Исправляем импорты вида: from '../some-file' -> from '../some-file.js'
    # НЕ трогаем импорты node_modules и пакетов без ./ или ../
    
    sed -i.bak -E \
        -e "s|from ['\"](\./[^'\"]*)['\"]|from '\1.js'|g" \
        -e "s|from ['\"](\.\./[^'\"]*)['\"]|from '\1.js'|g" \
        "$file"
    
    # Удаляем backup файл
    rm -f "$file.bak"
    
    echo "✅ Обработан: $file"
}

# Экспортируем функцию для доступа из find
export -f fix_imports_in_file

# Обрабатываем все .ts файлы в apps/backend
echo "📁 Обработка файлов в apps/backend..."
find apps/backend/src -name "*.ts" -type f -exec bash -c 'fix_imports_in_file "$0"' {} \;

# Обрабатываем все .ts файлы в apps/device-simulator  
echo "📁 Обработка файлов в apps/device-simulator..."
find apps/device-simulator/src -name "*.ts" -type f -exec bash -c 'fix_imports_in_file "$0"' {} \;

echo "✨ Исправление импортов завершено!"
