#!/bin/sh
# 開発用のアプリのコンテナで、フロントエンドとバックエンドを起動する
set -e

# node_modules はコンテナ専用(Linux 用)。package-lock.json が変わったときだけ入れ直す
install() {
  dir=$1
  hash=$(sha256sum "$dir/package-lock.json" | cut -d' ' -f1)
  if [ "$(cat "$dir/node_modules/.lock-hash" 2>/dev/null)" != "$hash" ]; then
    echo "[$dir] npm ci"
    (cd "$dir" && npm ci)
    echo "$hash" > "$dir/node_modules/.lock-hash"
  fi
}
install /app/backend
install /app/frontend

# 未適用のマイグレーションと初期データ(管理者。既にいれば何もしない)を反映する
(cd /app/backend && npm run migrate && npm run seed)

# バックエンド(保存すると再起動)と、フロントエンド(保存すると画面に反映)を起動する。
# どちらかが止まったら、もう片方も止めてコンテナを終了する
(cd /app/backend && npm run dev) &
backend=$!
(cd /app/frontend && npm run dev -- --host 0.0.0.0) &
frontend=$!
trap 'kill $backend $frontend 2>/dev/null' INT TERM
while kill -0 $backend 2>/dev/null && kill -0 $frontend 2>/dev/null; do sleep 1; done
kill $backend $frontend 2>/dev/null || true
wait
