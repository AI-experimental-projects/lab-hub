#!/usr/bin/env bash
# Creates the SSH deploy key the CI uses to push "deploy:" commits to main.
#   - public half: repo deploy key with write access (the only ruleset bypass besides org admins)
#   - private half: secret DEPLOY_KEY in the "production" environment (main only)
# The private key never touches the repo or the terminal and is destroyed afterwards.
#
#   ./infra/github/setup-deploy-key.sh [owner/repo]
set -euo pipefail

REPO="${1:-AI-experimental-projects/lab-hub}"
DIR="$(mktemp -d)"
trap 'shred -u "$DIR"/key "$DIR"/key.pub 2>/dev/null; rmdir "$DIR"' EXIT

ssh-keygen -q -t ed25519 -N "" -C "ci-deploy ${REPO}" -f "$DIR/key"

gh api -X POST "repos/${REPO}/keys" \
  -f title="ci-deploy (bumps image tag on main)" \
  -f key="$(cat "$DIR/key.pub")" \
  -F read_only=false \
  --jq '"deploy key created: id=\(.id) read_only=\(.read_only)"'

gh secret set DEPLOY_KEY --env production -R "$REPO" < "$DIR/key"
echo "secret DEPLOY_KEY stored in environment 'production'"
