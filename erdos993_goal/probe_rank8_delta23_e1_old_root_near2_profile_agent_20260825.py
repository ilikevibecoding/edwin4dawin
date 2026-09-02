#!/usr/bin/env python3
"""Exact routing profile for the e=1 old-root near=2 orbit.

This is a sign/basis profile, not a theorem.  It reconstructs the full
threshold-17 ordered-arm partition at Delta2 and Delta3 and records every
cell whose initial Newton basis has a negative coefficient.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from certify_rank8_e1_new_leaf_newton_cell import evaluator
from certify_rank8_e1_old_root_increment_ordered_near_cell import certify_cell


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e1_old_root_near2_profile_exact_agent_20260825.json"
NEAR = 2
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
    for tail in range(THRESHOLD):
        remainder = THRESHOLD - tail
        short_lower = (remainder + 1) // 2
        rows.append(
            certify_cell(
                evaluate,
                rank,
                extension,
                NEAR,
                f"tail={tail}, short>=ceil({remainder}/2)={short_lower}",
                lambda index, t=tail, s=short_lower: (t, index[0] + s, index[1]),
                2,
            )
        )
        for short in range(short_lower):
            difference_lower = remainder - 2 * short
            rows.append(
                certify_cell(
                    evaluate,
                    rank,
                    extension,
                    NEAR,
                    f"tail={tail}, short={short}, difference>={difference_lower}",
                    lambda index, t=tail, s=short, d=difference_lower: (
                        t,
                        s,
                        index[0] + d,
                    ),
                    1,
                )
            )
    assert len(rows) == 99
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
                "coefficientwise_cells": len(rows) - len(obstructed),
                "obstructed_cells": len(obstructed),
                "obstructed_by_dimension": {
                    str(dimension): sum(
                        row["dimension"] == dimension for row in obstructed
                    )
                    for dimension in (1, 2, 3)
                },
                "minimum_sampled_increment": str(
                    min(int(row["minimum_sampled_increment"]) for row in rows)
                ),
                "minimum_origin": str(
                    min(int(row["origin_coefficient"]) for row in rows)
                ),
                "minimum_coefficient": str(
                    min(int(row["minimum_coefficient"]) for row in rows)
                ),
                "obstructed_rows": obstructed,
            }
            assert int(record["minimum_sampled_increment"]) > 0
            assert int(record["minimum_origin"]) > 0
            profiles.append(record)
            print(
                "PROFILE",
                f"Delta{rank}",
                extension,
                "CELLS",
                len(rows),
                "OBSTRUCTED",
                len(obstructed),
                record["obstructed_by_dimension"],
                flush=True,
            )

    payload = {
        "schema": "rank8-delta23-e1-old-root-near2-profile-agent-v1",
        "status": "EXACT_ROUTING_PROFILE_NO_THEOREM_CLAIM",
        "scope": (
            "Subdivided claws of source order at least 23; old root has near=2; "
            "ordered other arms; all three extension orbits; Delta2 and Delta3."
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
