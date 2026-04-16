# Garden OS → Notion Sync

One-way push from the Raised Bed Planner to the Outdoor Plant Beds Tracker in Notion.

## How it works

1. **Planner** exports a sync snapshot (`garden-os-sync-{date}.json`) via the Manage menu
2. **Connector** reads the snapshot, diffs against current Notion rows, and upserts changes
3. **GitHub Actions** runs the connector on manual dispatch or when a snapshot is pushed

## Field mapping

See `mapping.json` for the machine-readable spec. Summary:

| Planner → | Notion | Transform |
|---|---|---|
| plantingId | Planting ID (text) | Direct (sync key) |
| cropName | Plant (relation) | Name lookup in DB \| Plants |
| cropName + bedName | Planting (title) | Format: "Crop — Bed" |
| bedName | Bed (select) | Direct |
| status | Status (select) | Status map (see below) |
| plantedAt | Planted On (date) | Strip time component |
| season | Season (select) | Capitalize |
| cellId | Bed Location (text) | "Row N, Col N" |
| events + notes | Notes (text) | Flatten events + append notes |
| bedId | Bed ID (text) | Direct (round-trip key) |

## Status mapping

| Planner | Notion |
|---|---|
| planned | Planned |
| started_indoors | Planted |
| direct_sown | Planted |
| transplanted | Planted |
| growing | Growing |
| harvesting | Harvesting |
| finished | Done |
| failed | Failed |

## Plant relation resolution

The connector resolves `cropName` to a Plant relation by matching against `Common Name` in DB | Plants. If no exact match is found, the planting is created without a Plant relation and flagged in the run report.

## Safety rules

- **Sync key**: Planting ID is the unique identifier. No duplicates.
- **Idempotent**: Running twice with the same snapshot produces zero changes.
- **Dry run**: Default mode. Pass `--apply` to write.
- **No deletes**: Removed plantings are marked inactive, not deleted.
- **Schema guard**: Connector verifies expected Notion properties exist before writing.

## Usage

```bash
# Dry run (default)
node sync/connector.js sync/snapshot/latest.json

# Apply changes
node sync/connector.js sync/snapshot/latest.json --apply

# Via GitHub Actions
# Go to Actions → Sync Planner to Notion → Run workflow
```

## Required secrets (GitHub Actions)

| Secret | Value |
|---|---|
| `NOTION_TOKEN` | Notion integration token |
| `NOTION_OUTDOOR_DB_ID` | Outdoor Plant Beds Tracker database ID |
| `NOTION_PLANTS_DB_ID` | DB \| Plants database ID |
