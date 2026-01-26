#!/bin/bash
# 執行 SQL 文件腳本
# 使用方式：bash scripts/execute-sql.sh [sql-file]

# 資料庫連接資訊
DB_HOST="tpe1.clusters.zeabur.com"
DB_PORT="22704"
DB_NAME="zeabur"
DB_USER="root"
DB_PASSWORD="4if5Z3c87KolJ0Wnp1VIEbjmLC6X92FM"

# 連接字串
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 檢查是否提供了 SQL 文件
if [ -z "$1" ]; then
    echo "錯誤：請提供 SQL 文件路徑"
    echo "使用方式：bash scripts/execute-sql.sh scripts/create-tables.sql"
    exit 1
fi

SQL_FILE="$1"

if [ ! -f "$SQL_FILE" ]; then
    echo "錯誤：找不到文件 $SQL_FILE"
    exit 1
fi

echo "正在執行 SQL 文件: $SQL_FILE"
echo "連接到資料庫: ${DB_HOST}/${DB_NAME}"
echo ""

# 執行 SQL 文件
PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -f "${SQL_FILE}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SQL 執行成功！"
else
    echo ""
    echo "❌ SQL 執行失敗，請檢查錯誤訊息"
    exit 1
fi
