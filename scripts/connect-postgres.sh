#!/bin/bash
# PostgreSQL 連接腳本
# 使用方式：bash scripts/connect-postgres.sh

# 資料庫連接資訊
DB_HOST="tpe1.clusters.zeabur.com"
DB_PORT="22704"
DB_NAME="zeabur"
DB_USER="root"
DB_PASSWORD="4if5Z3c87KolJ0Wnp1VIEbjmLC6X92FM"

# 連接字串
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "正在連接到 PostgreSQL 資料庫..."
echo "主機: ${DB_HOST}"
echo "資料庫: ${DB_NAME}"
echo ""
echo "連接成功後，您可以執行 SQL 命令。"
echo "輸入 \\q 退出 psql"
echo ""

# 使用 psql 連接
PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}"
