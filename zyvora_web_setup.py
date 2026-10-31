#!/data/data/com.termux/files/usr/bin/python
import json
import secrets
import shutil
import threading
import subprocess
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = 8765
BASE = Path(__file__).resolve().parent
WEB = BASE / "web"
PREFIX = Path(__import__("os").environ.get("PREFIX", "/data/data/com.termux/files/usr"))
TOKEN = secrets.token_urlsafe(32)
PKG = shutil.which("pkg") or str(PREFIX / "bin" / "pkg")
GIT = shutil.which("git") or str(PREFIX / "bin" / "git")

PACKAGES = {
    "git": ["git"], "python": ["python"], "nodejs": ["nodejs"], "curl": ["curl"],
    "ruby": ["ruby"], "php": ["php"], "zip": ["zip"], "nano": ["nano"],
    "wget": ["wget"], "vim": ["vim"], "unzip": ["unzip"], "cpp": ["clang"],
    "golang": ["golang"], "build-tools": ["make", "pkg-config", "autoconf", "automake", "libtool"],
    "rust": ["rust"], "java": ["openjdk-21"], "cmake": ["cmake"], "apache": ["apache2"],
    "sqlite": ["sqlite"], "nginx": ["nginx"], "openssh": ["openssh"],
    "dns-tools": ["dnsutils"], "tailscale": ["tailscale"], "netcat": ["netcat-openbsd"],
    "openssl": ["openssl"], "figlet": ["figlet"], "fastfetch": ["fastfetch"],
    "tmux": ["tmux"], "htop": ["htop"], "toilet": ["toilet"], "zsh": ["zsh"],
}
LABELS = {
    "git":"Git", "python":"Python", "nodejs":"Node.js", "curl":"cURL", "ruby":"Ruby",
    "php":"PHP", "zip":"ZIP", "nano":"Nano", "wget":"Wget", "vim":"Vim", "unzip":"Unzip",
    "cpp":"C/C++ (Clang)", "golang":"Go", "build-tools":"Build Tools", "rust":"Rust",
    "java":"Java (OpenJDK 21)", "cmake":"CMake", "apache":"Apache", "sqlite":"SQLite",
    "nginx":"Nginx", "openssh":"OpenSSH", "dns-tools":"DNS Tools", "tailscale":"Tailscale",
    "netcat":"Netcat", "openssl":"OpenSSL", "figlet":"Figlet", "fastfetch":"Neofetch alternative (Fastfetch)",
    "tmux":"tmux", "htop":"htop", "toilet":"Toilet", "zsh":"Zsh",
    "php-server":"PHP built-in server preset", "node-server":"Node.js server preset",
}
PRESETS = {"php-server": [], "node-server": []}
state_lock = threading.Lock()
state = {"running": False, "finished": False, "success": None, "current": "", "logs": [], "total": 0, "done": 0}

def log(message, kind="info"):
    line = {"time": time.strftime("%H:%M:%S"), "message": str(message), "kind": kind}
    with state_lock:
        state["logs"].append(line)
        state["logs"] = state["logs"][-500:]

def run_command(args, title, continue_on_error=False):
    log("$ " + " ".join(args), "command")
    try:
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                bufsize=1, env=__import__("os").environ.copy())
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                log(line)
        code = proc.wait()
        if code != 0:
            log(f"{title} failed (exit code {code}).", "warn" if continue_on_error else "error")
        else:
            log(f"{title} completed.", "success")
        return code
    except Exception as exc:
        log(f"{title} could not run: {exc}", "error")
        return -1

def run_update_command(args, title):
    return run_command(args, title, continue_on_error=True)

def update_repository():
    if not (BASE / ".git").exists():
        log("Repository update skipped: this folder is not a Git checkout.", "warn")
        return -1
    return run_update_command([GIT, "-C", str(BASE), "pull", "--ff-only"], "ZYVORA repository update")

def package_worker(keys, auto_update=False, update_repo=False):
    with state_lock:
        state.update(running=True, finished=False, success=None, current="", logs=[], total=0, done=0)
    failures = []
    if update_repo:
        log("Repository update selected: fetching the latest ZYVORA WEB SETUP files.", "info")
        if update_repository() != 0:
            failures.append("ZYVORA repository update")
    if auto_update:
        log("AUTO UPDATE enabled: refreshing Termux package lists and upgrading installed packages.", "info")
        if run_update_command([PKG, "update", "-y"], "Package list update") != 0:
            failures.append("pkg update")
        if run_update_command([PKG, "upgrade", "-y"], "Installed package upgrade") != 0:
            failures.append("pkg upgrade")
    expanded = []
    for key in keys:
        expanded.extend(PACKAGES.get(key, []))
    expanded = list(dict.fromkeys(expanded))
    with state_lock:
        state["total"] = len(expanded)
    if not expanded:
        log("No installable packages selected. Runtime presets need their matching runtime selected.", "warn")
    for package in expanded:
        with state_lock:
            state["current"] = package
        code = run_command([PKG, "install", "-y", package], f"Installing {package}")
        if code == 0:
            log(f"SUCCESS: {package}", "success")
        else:
            failures.append(package)
            log(f"FAILED: {package} (exit code {code})", "error")
        with state_lock:
            state["done"] += 1
    for key in keys:
        if key == "php-server":
            log("PHP server preset selected: after PHP installs, run: php -S 127.0.0.1:8000", "info")
        elif key == "node-server":
            log("Node.js server preset selected: after Node.js installs, run your app with: node app.js", "info")
    with state_lock:
        state["running"] = False
        state["finished"] = True
        state["success"] = len(failures) == 0
        state["current"] = ""
    log("REAL TERMUX SETUP COMPLETED SUCCESSFULLY." if not failures else "SETUP FINISHED WITH ERRORS: " + ", ".join(failures),
        "success" if not failures else "error")

class Handler(BaseHTTPRequestHandler):
    server_version = "ZYVORA-LocalBridge/1.1"

    def _headers(self, status=200, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:")
        self.end_headers()

    def _json(self, obj, status=200):
        self._headers(status)
        self.wfile.write(json.dumps(obj).encode())

    def _authorized(self):
        origin = self.headers.get("Origin")
        if origin and origin not in (f"http://{HOST}:{PORT}", f"http://localhost:{PORT}"):
            return False
        return secrets.compare_digest(self.headers.get("X-Zyvora-Token", ""), TOKEN)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            html = (WEB / "index.html").read_text(encoding="utf-8").replace("__ZYVORA_TOKEN__", TOKEN)
            self._headers(200, "text/html; charset=utf-8")
            self.wfile.write(html.encode())
        elif path in ("/app.js", "/style.css", "/logo.svg"):
            asset = {"/app.js": ("app.js", "text/javascript; charset=utf-8"),
                     "/style.css": ("style.css", "text/css; charset=utf-8"),
                     "/logo.svg": ("logo.svg", "image/svg+xml; charset=utf-8")}[path]
            self._headers(200, asset[1])
            self.wfile.write((WEB / asset[0]).read_bytes())
        elif path == "/api/health":
            self._json({"ok": True, "bridge": "online", "pkg": PKG, "pkg_exists": Path(PKG).exists(), "project": str(BASE)})
        elif path == "/api/status":
            with state_lock:
                snapshot = dict(state)
            self._json(snapshot)
        elif path == "/api/catalog":
            self._json({"labels": LABELS, "packages": PACKAGES, "presets": list(PRESETS)})
        else:
            self._json({"error": "Not found"}, 404)

    def do_POST(self):
        if urlparse(self.path).path != "/api/setup":
            return self._json({"error": "Not found"}, 404)
        if not self._authorized():
            return self._json({"error": "Unauthorized local request"}, 403)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 2 or length > 12000:
                return self._json({"error": "Invalid request size"}, 400)
            payload = json.loads(self.rfile.read(length))
            keys = payload.get("packages", [])
            auto_update = payload.get("auto_update", False)
            update_repo = payload.get("update_repo", False)
            if not isinstance(update_repo, bool) or not isinstance(auto_update, bool):
                return self._json({"error": "Invalid update setting"}, 400)
            if payload.get("confirmed") is not True:
                return self._json({"error": "Review and confirm before installing"}, 400)
            if not isinstance(keys, list) or not keys or len(keys) > 60:
                return self._json({"error": "Select at least one item"}, 400)
            if any(not isinstance(k, str) or k not in LABELS for k in keys):
                return self._json({"error": "Unknown selection rejected"}, 400)
            if not Path(PKG).exists():
                return self._json({"error": f"Termux pkg executable not found: {PKG}"}, 503)
            with state_lock:
                if state["running"]:
                    return self._json({"error": "A setup is already running"}, 409)
            threading.Thread(target=package_worker, args=(keys, auto_update, update_repo), daemon=True).start()
            self._json({"ok": True, "message": "REAL Termux setup started"})
        except (ValueError, json.JSONDecodeError):
            self._json({"error": "Invalid JSON"}, 400)

    def log_message(self, fmt, *args):
        pass

def main():
    print("\n  ZYVORA ULTRA — WEB SETUP")
    print("  REAL local Termux package installer")
    print(f"\n  Open: http://{HOST}:{PORT}")
    print(f"  pkg: {PKG} {'[OK]' if Path(PKG).exists() else '[MISSING]'}")
    print("  This service is accessible only on this device.")
    print("  Press Ctrl+C to stop.\n")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ZYVORA WEB SETUP...")
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
