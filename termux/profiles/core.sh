#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg update -y
pkg upgrade -y
pkg install -y git curl python nodejs
mkdir -p "$HOME/.zyvora"
printf '%s\n' core > "$HOME/.zyvora/profile"
echo "[ ZYVORA ] CORE READY"
