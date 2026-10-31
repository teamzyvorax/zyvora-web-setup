# ZYVORA ULTRA — WEB SETUP

![ZYVORA ULTRA logo](web/logo.svg)

**Select packages. Review your choices. Install to Termux with one confirmed action.**

A local-only browser dashboard for selecting Termux packages and installing them through a small Python bridge running on the same Android device.

## Install in Termux

```bash
pkg update -y
pkg install python git -y
git clone https://github.com/teamzyvorax/zyvora-web-setup.git
cd zyvora-web-setup
bash install.sh
```

## Start

```bash
zyvora-web
```

Open **http://127.0.0.1:8765** in the same phone's browser. Stop with `Ctrl+C` in Termux.

## Auto Update option

On the setup selection screen, enable **AUTO UPDATE** to run these fixed commands before the selected package installs:

```bash
pkg update -y
pkg upgrade -y
```

This refreshes package indexes and upgrades already-installed Termux packages. It is optional and is shown in the review step before execution.

## Security

- Binds only to `127.0.0.1`, not Wi-Fi or the public internet.
- Uses a random per-run API token and same-origin validation.
- Accepts only predefined package IDs; no arbitrary shell commands or user-supplied package names.
- Requires review and explicit confirmation before installation.

Do not expose this service through a public tunnel or change its bind address to `0.0.0.0`.

## Notes

Package availability can vary by Termux repository, version, and architecture. The live log reports package-manager errors and continues. PHP Server and Node.js Server are usage presets; select PHP or Node.js to install the runtime first.
