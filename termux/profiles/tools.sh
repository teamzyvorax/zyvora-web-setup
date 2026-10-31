#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg update -y
pkg upgrade -y
pkg install -y git curl python
mkdir -p "$HOME/.zyvora"
printf '%s\n' tools > "$HOME/.zyvora/profile"
echo "[ ZYVORA ] TOOLS READY"
