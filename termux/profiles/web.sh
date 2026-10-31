#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg update -y
pkg upgrade -y
pkg install -y git curl nodejs python
mkdir -p "$HOME/.zyvora"
printf '%s\n' web > "$HOME/.zyvora/profile"
echo "[ ZYVORA ] WEB STACK READY"
