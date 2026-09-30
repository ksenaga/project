# フロントエンドとバックエンドをまとめたアプリのコンテナ(app-project)
# ビルドしたフロントエンドを Express が API と一緒に配る(同じオリジンになるので Cookie・CORS の設定が今のまま使える)

# 1. フロントエンドをビルドする(frontend/dist に静的ファイルができる)
FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. バックエンドを TypeScript から JavaScript にビルドする(dist にできる)
FROM node:24-slim AS backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# 3. 実行用
# マイグレーション・初期データは TypeScript のまま tsx で実行する
# (開発と同じファイル名で knex_migrations に記録されるため、開発で使っている DB にもそのまま使える)
FROM node:24-slim
ENV NODE_ENV=production \
    TZ=Asia/Tokyo \
    PORT=3000 \
    STATIC_DIR=/app/public
WORKDIR /app/backend
COPY --from=backend /app/backend ./
COPY --from=frontend /app/frontend/dist /app/public
USER node
EXPOSE 3000
# 起動するたびに、未適用のマイグレーションと初期データ(管理者。既にいれば何もしない)を反映してから起動する
CMD ["sh", "-c", "npm run migrate && npm run seed && exec node dist/src/server.js"]
