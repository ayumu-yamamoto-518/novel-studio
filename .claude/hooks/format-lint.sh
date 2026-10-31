#!/bin/bash
# PostToolUse hook (Edit|Write): 編集したファイルを Prettier で整形し、
# ts/tsx/js/jsx は ESLint も実行する。lint 違反は exit 2 で Claude に返す。
# 依存: jq

input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
project=${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}

[ -n "$file" ] && [ -f "$file" ] || exit 0

# プロジェクト外・生成物・依存は対象にしない
case "$file" in
  "$project"/node_modules/* | "$project"/dist/* | "$project"/coverage/*) exit 0 ;;
  "$project"/*) ;;
  *) exit 0 ;;
esac

case "$file" in
  *.ts | *.tsx | *.js | *.jsx) lint=1 ;;
  *.json | *.css | *.md | *.yml | *.html) lint=0 ;;
  *) exit 0 ;;
esac

cd "$project" || exit 0

if ! output=$(npx --no-install prettier --write --ignore-unknown "$file" 2>&1); then
  echo "Prettier failed for $file:" >&2
  echo "$output" >&2
  exit 2
fi

if [ "$lint" = 1 ]; then
  if ! output=$(npx --no-install eslint --max-warnings 0 --no-warn-ignored "$file" 2>&1); then
    echo "ESLint errors in $file:" >&2
    echo "$output" >&2
    exit 2
  fi
fi

exit 0
