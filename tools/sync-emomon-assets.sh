#!/usr/bin/env bash
# Copies the EmoMonster files Gamblers needs at runtime into ./emomon/
#   engine scripts (battle, stats, traits, type chart, sprites, config) + monster / icon / item images.
# Run from the Gamblers folder whenever the EmoMonster source folder changes:  bash tools/sync-emomon-assets.sh [path-to-EmoMonster]
set -e
SRC="${1:-EmoMonster}"
DST="emomon"
[ -d "$SRC/js" ] || { echo "EmoMonster folder not found: $SRC"; exit 1; }
rm -rf "$DST"; mkdir -p "$DST/js" "$DST/images"
for f in gameConfig.js typeChart.js statCalculator.js traitManager.js battleEngine.js spriteManager.js; do cp "$SRC/js/$f" "$DST/js/"; done
for d in monsters icons items; do cp -r "$SRC/images/$d" "$DST/images/"; done
echo "copied: $(find "$DST" -type f | wc -l) files, $(du -sh "$DST" | cut -f1)"
