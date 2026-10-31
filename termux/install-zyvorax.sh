#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE="https://raw.githubusercontent.com/teamzyvorax/zyvora-web-setup/main/termux/setup.sh"
PROFILE="${1:-core}"
case "$PROFILE" in core|web|tools) ;; *) echo "Usage: bash install-zyvorax.sh [core|web|tools]"; exit 2;; esac
curl -fsSL "$BASE" -o "$PREFIX/tmp/zyvora-setup.sh"
bash "$PREFIX/tmp/zyvora-setup.sh" "$PROFILE"
rm -f "$PREFIX/tmp/zyvora-setup.sh"
