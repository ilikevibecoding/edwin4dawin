#!/usr/bin/env python3
"""Exact obstruction profile for the next e=1 old-root orbit, near=1.

This is a routing probe, not a theorem.  It applies the established no-gap
ordered-arm partition at ranks Delta2 and Delta3 and records exactly which
Newton cells still need refinement.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from certify_rank8_e1_new_leaf_newton_cell import evaluator
from certify_rank8_e1_old_root_increment_ordered_near_cell import certify_cell


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json"
NEAR = 1
THRESHOLD = 19 - NEAR
EXTENSIONS = ("root", "short", "long")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def partition(evaluate, rank: int, extension: str) -> list[dict[str, object]]:
    rows = [
        certify_cell(
            evaluate,
            rank,
            extension,
            NEAR,
            f"tail>={THRESHOLD}",
            lambda index: (index[0] + THRESHOLD, index[1], index[2]),
            3,
        )
    ]
    for fixed_tail in range(THRESHOLD):
        remainder = THRESHOLD - fixed_tail
        bulk_short = (remainder + 1) // 2
        rows.append(
            certify_cell(
                evaluate,
                rank,
                extension,
                NEAR,
                f"tail={fixed_tail}, short>=ceil({remainder}/2)={bulk_short}",
                lambda index, t=fixed_tail, s=bulk_short: (t, index[0] + s, index[1]),
                2,
            )
        )
        for fixed_short in range(bulk_short):
            lower = remainder - 2 * fixed_short
            rows.append(
                certify_cell(
                    evaluate,
                    rank,
                    extension,
                    NEAR,
                    f"tail={fixed_tail}, short={fixed_short}, difference>={lower}",
                    lambda index, t=fixed_tail, s=fixed_short, d=lower: (t, s, index[0] + d),
                    1,
                )
            )
    return rows


def main() -> None:
    profiles = []
    for rank in (2, 3):
        evaluate, source_terms = evaluator(rank)
        for extension in EXTENSIONS:
            rows = partition(evaluate, rank, extension)
            obstructed = [row for row in rows if int(row["negative"]) > 0]
            record = {
                "rank": rank,
                "extension": extension,
                "source_expression_terms": source_terms,
                "cells": len(rows),
                "obstructed_cells": len(obstructed),
                "obstructed_by_dimension": {
                    str(dimension): sum(row["dimension"] == dimension for row in obstructed)
                    for dimension in (1, 2, 3)
                },
                "minimum_sampled_increment": str(
                    min(int(row["minimum_sampled_increment"]) for row in rows)
                ),
                "minimum_origin": str(min(int(row["origin_coefficient"]) for row in rows)),
                "minimum_coefficient": str(min(int(row["minimum_coefficient"]) for row in rows)),
                "obstructed_rows": obstructed,
            }
            profiles.append(record)
            print(
                "PROFILE",
                f"Delta{rank}",
                extension,
                "OBSTRUCTED",
                len(obstructed),
                record["obstructed_by_dimension"],
                flush=True,
            )

    payload = {
        "schema": "rank8-delta23-e1-old-root-near1-profile-agent-v1",
        "status": "EXACT_ROUTING_PROFILE_NO_THEOREM_CLAIM",
        "scope": (
            "Subdivided claws of source order at least 23; old root has near=1; "
            "ordered other arms; each extension orbit; Delta2 and Delta3."
        ),
        "near": NEAR,
        "source_order_condition": f"tail+2*short+difference>={THRESHOLD}",
        "partition": [
            f"tail>={THRESHOLD}",
            "fixed smaller tail and short>=ceil((threshold-tail)/2)",
            "fixed smaller tail,short and difference>=threshold-tail-2*short",
        ],
        "profiles": profiles,
        "warning": (
            "Negative Newton coefficients are basis obstructions only.  Positive "
            "sampled increments are not by themselves an all-order proof."
        ),
        "dependency_sha256": {
            name: sha256(HERE / name)
            for name in (
                "certify_rank8_e1_new_leaf_newton_cell.py",
                "certify_rank8_e1_old_root_increment_ordered_near_cell.py",
                "scan_rank8_delta3_n28_e1_subdivided_claws.py",
            )
        },
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
