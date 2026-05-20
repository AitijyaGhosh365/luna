#!/bin/bash
set -e

SESSION_NAME="luna"

if ! command -v tmux &> /dev/null; then
  echo "tmux not found. Install tmux or run: bun run src/index.tsx"
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux attach -t "$SESSION_NAME"
else
  tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)" "bun run src/index.tsx"
  tmux set-option -t "$SESSION_NAME" status off
  tmux attach -t "$SESSION_NAME"
fi