# Deployment Guide

This document describes the VPS infrastructure and CI/CD configuration for this fork
(`davidbugayov/gym`). Keep it up to date whenever you add or change an environment.

---

## Server

| Key | Value |
|-----|-------|
| Provider | VPS |
| IP | `144.31.68.9` |
| OS user | `root` |
| SSH key secret | `DEV_SSH_KEY` (GitHub Actions secret, shared across all envs) |

---

## Environments

### gym.emdrbilateral.online (`.online` production)

| Key | Value |
|-----|-------|
| URL | <https://gym.emdrbilateral.online> |
| Deploy path | `/opt/gym/gym-online` |
| systemd service | `gym-online` |
| Node port | `8091` |
| nginx upstream | `http://127.0.0.1:8091` |
| GitHub workflow | `.github/workflows/deploy-gym-online.yml` |
| Trigger | push to `main` or `workflow_dispatch` |
| SSH secret | `DEV_SSH_KEY` |

Deploy steps (run on server via SSH):
```sh
cd /opt/gym/gym-online
npm install --ignore-scripts
npm run build --workspace=frontend
systemctl restart gym-online
```

---

### gym.emdrbilateral.ru (redirect only)

The `.ru` hostname permanently redirects all paths and query strings to
`https://gym.emdrbilateral.online`. It has no application process, database, or deployment.
The DNS record and TLS certificate remain in place because they are required to serve the redirect.

> **Note**: nginx serves both `.ru` and `.online` from the same config file at
> `/etc/nginx/sites-enabled/gym`. SSL cert is shared:
> `/etc/letsencrypt/live/gym.emdrbilateral.online/`.

---

## Manual deploy (without CI)

```sh
ssh root@144.31.68.9

# gym-online
cd /opt/gym/gym-online
git pull
npm install --ignore-scripts
npm run build --workspace=frontend
systemctl restart gym-online
systemctl status gym-online
curl -s -o /dev/null -w '%{http_code}' http://localhost:8091/

```

---

## All active services on the VPS

```
emdrbilateral-dev.service      → dev.emdrbilateral.online   (bilateralbound repo)
emdrbilateral-online.service   → emdrbilateral.online       (bilateralbound repo)
emdrbilateral-ru.service       → emdrbilateral.ru           (bilateralbound repo)
gym-online.service             → gym.emdrbilateral.online   (this repo, gym)
```

---

## Adding a new environment

1. Create systemd service file on VPS: `/etc/systemd/system/<name>.service`
2. Create app directory: `/opt/gym/<name>/`
3. Clone or rsync the repo into that directory
4. Add a workflow `.github/workflows/deploy-<name>.yml` mirroring `deploy-gym-online.yml`
5. Update this file

---

## GitHub Actions secrets required

| Secret | Used by |
|--------|---------|
| `DEV_SSH_KEY` | All deploy workflows (private key for `root@144.31.68.9`) |
