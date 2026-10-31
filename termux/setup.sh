#!/data/data/com.termux/files/usr/bin/bash
set -e
PROFILE="${1:-core}"
log(){ printf '\n[ZYVORA] %s\n' "$1"; }
log "Starting ZYVORA Termux setup: $PROFILE"
case "$PROFILE" in
  core) PACKAGES="git curl python nodejs" ;;
  web) PACKAGES="git curl nodejs python" ;;
  tools) PACKAGES="git curl python" ;;
  *) echo "Unknown setup profile: $PROFILE"; exit 2 ;;
esac
pkg update -y
pkg upgrade -y
pkg install -y $PACKAGES
mkdir -p "$HOME/.zyvora"
printf '%s\n' "$PROFILE" > "$HOME/.zyvora/profile"
log "Setup complete. Installed profile: $PROFILE"
log "ZYVORA environment is ready."
