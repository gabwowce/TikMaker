#!/usr/bin/env bash
# Publishes City Flight (game.html) to its own public repo, served by GitHub
# Pages: https://gabwowce.github.io/city-flight/
# Only the built game goes there – TikMaker's code stays private.
#
#   npm run game:deploy
set -euo pipefail

REPO="${GAME_REPO:-https://github.com/gabwowce/city-flight.git}"

npm run game:build

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R dist/game/. "$STAGE"
touch "$STAGE/.nojekyll"
cat > "$STAGE/README.md" <<'README'
# City Flight ✈

Fly a paper plane through a tiny 3D city at night, collect all 22 lights and
shoot through the rings. Play in the browser – phone or computer:

**https://gabwowce.github.io/city-flight/**

Drag to steer (or arrow keys / WASD).

The city and the game were built with Claude Code (React Three Fiber + three.js).
README

cd "$STAGE"
git init -q -b main
git add -A
git commit -q -m "City Flight $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin "$REPO"
git push -f origin main
echo "Published to $REPO"
