#!/bin/bash
# CORE Suits を公開するための設定を、Vercel の本番へ一度だけ登録する。
#
#   bash scripts/setup-vercel-env.sh
#
# ★このスクリプトの中に秘密の値は1文字も書いていない。
#   読むのは手元の .env.local（git には入っていない）で、値はそのまま Vercel へ渡すだけ。
#   画面にも出さない。
#
# ★なぜ人が実行するのか
#   `vercel env add` は AI-COMPANY の保護フック（~/AI-COMPANY/.claude/hooks/guard-dangerous.sh）が
#   機械的に止める。CLAUDE.md 第3章「人間承認が必須の操作」に環境変数の変更が入っているため。
#   Claude はこのフックを迂回しない。だから「1コマンドで済む形」だけを用意してある。
#
# 登録が済んだら、そのまま本番へ出す:
#   vercel --prod
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "NG  .env.local が見つかりません。ここに値が入っている前提です。" >&2
  exit 1
fi

# .env.example に書いてある名前だけを登録する（増やす時は .env.example に足す）
NAMES=$(grep -oE '^[A-Z_]+' .env.example)

for NAME in $NAMES; do
  VAL=$(grep -m1 "^${NAME}=" .env.local | cut -d= -f2- | sed 's/^"//; s/"$//' || true)
  if [ -z "${VAL:-}" ]; then
    echo "とばした  $NAME （.env.local に値がありません）"
    continue
  fi
  # 既に入っていれば入れ直す（同じ名前を二重に持たせない）
  vercel env rm "$NAME" production --yes >/dev/null 2>&1 || true
  if printf '%s' "$VAL" | vercel env add "$NAME" production >/dev/null 2>&1; then
    echo "登録した  $NAME"
  else
    echo "失敗した  $NAME" >&2
  fi
done

echo
echo "いま入っているもの:"
vercel env ls production
echo
echo "つぎ: vercel --prod  で本番に出せます。"
