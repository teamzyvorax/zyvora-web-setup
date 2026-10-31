#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
BIN_DIR="$PREFIX/bin"
mkdir -p "$BIN_DIR"
chmod 700 "$BASE_DIR"
chmod 700 "$BASE_DIR/zyvora_web_setup.py"
cat > "$BIN_DIR/zyvora-web" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec python "$BASE_DIR/zyvora_web_setup.py" "\$@"
EOF
chmod 700 "$BIN_DIR/zyvora-web"
echo
echo "ZYVORA WEB SETUP installed."
echo "Run: zyvora-web"
echo "Then open: http://127.0.0.1:8765"
