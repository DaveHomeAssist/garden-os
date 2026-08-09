#!/bin/bash
# Rebuild of the missing sync-registry.sh: GitHub-side Pages snapshot for DaveHomeAssist
set -uo pipefail
OWNER=DaveHomeAssist
OUT=/tmp/gh-pages-snapshot.json

repos=$(gh repo list "$OWNER" --limit 200 --json name,isArchived -q '.[] | "\(.name)\t\(.isArchived)"')

echo '{"generated":"'"$(date +%Y-%m-%d)"'","repos":[' > "$OUT.tmp"
first=1
while IFS=$'\t' read -r name archived; do
  pages=$(gh api "repos/$OWNER/$name/pages" 2>/dev/null)
  if [ -n "$pages" ]; then
    has_pages=true
    status=$(echo "$pages" | jq -r '.status // "unknown"')
    cname=$(echo "$pages" | jq -r '.cname // empty')
    last_deploy=$(gh api "repos/$OWNER/$name/pages/builds/latest" -q '.updated_at' 2>/dev/null || echo "")
  else
    has_pages=false; status=""; cname=""; last_deploy=""
  fi
  served_files="[]"
  if [ "$name" = "garden-os" ] && [ "$has_pages" = "true" ]; then
    served_files=$(gh api "repos/$OWNER/$name/contents/" -q '[.[] | select(.name | endswith(".html")) | .name]' 2>/dev/null || echo "[]")
  fi
  [ $first -eq 0 ] && echo ',' >> "$OUT.tmp"
  first=0
  jq -n --arg name "$name" --argjson archived "$archived" --argjson has_pages "$has_pages" \
        --arg status "$status" --arg cname "$cname" --arg last_deploy "$last_deploy" \
        --argjson served_files "$served_files" \
        '{name:$name, archived:$archived, has_pages:$has_pages, pages_status:$status, cname:$cname, last_deploy:$last_deploy, served_files:$served_files}' >> "$OUT.tmp"
done <<< "$repos"
echo ']}' >> "$OUT.tmp"
jq . "$OUT.tmp" > "$OUT" && rm "$OUT.tmp"
echo "Wrote $OUT ($(jq '.repos | length' "$OUT") repos)"
