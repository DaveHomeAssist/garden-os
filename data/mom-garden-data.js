// Generated from data/mom-garden-data.json for file:// fallback.
(function () {
  window.GOS_MOM_GARDEN_DATA = {
    "version": 2,
    "source": "Mom planner sample JSON exports",
    "comment": "Mom-first cell-level demo data. Derived 2026-04-27 from garden planner sample.json and grow bag planner sample.json in C:/Users/Dave RambleOn/Desktop/01-Projects. Preserves planted cells from the exports instead of collapsing planting groups to one cell each.",
    "loadedAt": null,
    "sourceFiles": [
      "C:/Users/Dave RambleOn/Desktop/01-Projects/garden planner sample.json",
      "C:/Users/Dave RambleOn/Desktop/01-Projects/grow bag planner sample.json"
    ],
    "sourceExportCounts": {
      "mainBed": {
        "planted": 32,
        "total": 32
      },
      "growBags": {
        "planted": 12,
        "total": 12
      }
    },
    "beds": [
      {
        "id": "raised_bed_left",
        "name": "Raised Bed Left",
        "type": "raised_bed",
        "dimensions": {
          "rows": 4,
          "cols": 4
        },
        "wallSide": "back",
        "comment": "Left half of the 8x4 Main Bed in garden planner sample.json.",
        "plantings": [
          {
            "id": "mom_left_peas_wando",
            "cropId": "peas",
            "displayName": "Peas",
            "varietyName": "Wando",
            "status": "Sprouted",
            "bedLocation": "Main Bed row 1, left half",
            "cells": [
              "r0c0",
              "r0c1",
              "r0c2",
              "r0c3"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample. Variety preserved from Mom Outdoor Plant Beds Tracker."
          },
          {
            "id": "mom_left_red_lettuce_marvel",
            "cropId": "red_lettuce",
            "displayName": "Lettuce, Butterhead Red",
            "varietyName": "Marvel of Four Seasons",
            "status": "Planted",
            "bedLocation": "Main Bed row 2, left half",
            "cells": [
              "r1c0",
              "r1c1",
              "r1c2",
              "r1c3"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample. Variety preserved from Mom Outdoor Plant Beds Tracker."
          },
          {
            "id": "mom_left_head_lettuce_parris",
            "cropId": "head_lettuce",
            "displayName": "Lettuce, Romaine",
            "varietyName": "Parris Island Cos",
            "status": "Planted",
            "bedLocation": "Main Bed row 3, left half",
            "cells": [
              "r2c0",
              "r2c1",
              "r2c2",
              "r2c3"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample. Variety preserved from Mom Outdoor Plant Beds Tracker."
          },
          {
            "id": "mom_left_carrot",
            "cropId": "carrot",
            "displayName": "Carrot",
            "varietyName": null,
            "status": "Sprouted",
            "bedLocation": "Main Bed row 4, left half",
            "cells": [
              "r3c0",
              "r3c1",
              "r3c2",
              "r3c3"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          }
        ]
      },
      {
        "id": "raised_bed_right",
        "name": "Raised Bed Right",
        "type": "raised_bed",
        "dimensions": {
          "rows": 4,
          "cols": 4
        },
        "wallSide": "back",
        "comment": "Right half of the 8x4 Main Bed in garden planner sample.json.",
        "plantings": [
          {
            "id": "mom_right_snap_peas",
            "cropId": "peas",
            "displayName": "Snap Peas",
            "varietyName": null,
            "status": "Sprouted",
            "bedLocation": "Main Bed row 1, right half",
            "cells": [
              "r0c0",
              "r0c1",
              "r0c2",
              "r0c3"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Filled the four previously-unfilled source cells in the right half of the main bed."
          },
          {
            "id": "mom_right_onion_rows_2_3",
            "cropId": "oni",
            "displayName": "Onion",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Main Bed rows 2-3, right half",
            "cells": [
              "r1c0",
              "r1c1",
              "r1c2",
              "r1c3",
              "r2c0",
              "r2c1",
              "r2c2",
              "r2c3"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_right_leaf_lettuce",
            "cropId": "let",
            "displayName": "Leaf Lettuce",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Main Bed row 4, right half",
            "cells": [
              "r3c0",
              "r3c1",
              "r3c2"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_right_chives",
            "cropId": "chv",
            "displayName": "Chives",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Main Bed row 4, far right",
            "cells": [
              "r3c3"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          }
        ]
      },
      {
        "id": "grow_bags",
        "name": "Grow Bags",
        "type": "grow_bags",
        "dimensions": {
          "rows": 6,
          "cols": 2
        },
        "wallSide": "none",
        "comment": "Six grow bags from grow bag planner sample.json, modeled as six rows with two planting slots per bag.",
        "plantings": [
          {
            "id": "mom_grow_bag_head_lettuce",
            "cropId": "head_lettuce",
            "displayName": "Head Lettuce",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Bags 1, 2, 3, and 5",
            "cells": [
              "r0c0",
              "r1c0",
              "r2c0",
              "r4c1"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_grow_bag_kale_dwarf_blue_curled",
            "cropId": "kale",
            "displayName": "Kale",
            "varietyName": "Dwarf Blue Curled",
            "status": "Planted",
            "bedLocation": "Bag 1",
            "cells": [
              "r0c1"
            ],
            "plantedOnStart": "2026-04-11",
            "plantedOnEnd": "2026-04-19",
            "season": "Spring 2026",
            "notes": "Brassica oleracea, 21-55 days, USDA Organic. Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_grow_bag_carrot",
            "cropId": "carrot",
            "displayName": "Carrot",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Bags 2, 3, and 4",
            "cells": [
              "r1c1",
              "r2c1",
              "r3c1"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_grow_bag_garlic",
            "cropId": "garlic",
            "displayName": "Garlic",
            "varietyName": null,
            "status": "Growing",
            "bedLocation": "Bags 4 and 5",
            "cells": [
              "r3c0",
              "r4c0"
            ],
            "plantedOnStart": "2025-10-15",
            "plantedOnEnd": null,
            "season": "Fall 2025",
            "notes": "Fall 2025 planting, overwintered. Cell-level expansion from JSON sample."
          },
          {
            "id": "mom_grow_bag_onion",
            "cropId": "oni",
            "displayName": "Onion",
            "varietyName": null,
            "status": "Planted",
            "bedLocation": "Bag 6",
            "cells": [
              "r5c0",
              "r5c1"
            ],
            "plantedOnStart": "2026-05-06",
            "plantedOnEnd": null,
            "season": "Spring 2026",
            "notes": "Cell-level expansion from JSON sample."
          }
        ]
      }
    ]
  };
})();
