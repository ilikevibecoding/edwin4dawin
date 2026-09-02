#!/usr/bin/env python3
"""Assemble and independently replay the exact all-root C7 order-24 census."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

from verify_rank7_rooted_cross_order23_replay import (
    ROW,
    adjacency,
    poly_mul,
    rooted_state,
)


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank7_rooted_cross_order24_exact_20260820.log"
FRESH = HERE / "rank7_rooted_cross_order24_fresh_replay_20260820.log"
OUTPUT = HERE / "rank7_rooted_cross_order24_exact_20260820.json"
SOURCE = HERE / "verify_rank7_rooted_cross_order24.rs"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    assert raw.endswith("PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDER_24\n")
    match = next((ROW.match(line) for line in raw.splitlines() if ROW.match(line)), None)
    assert match is not None
    row = match.groupdict()
    return {
        "order": int(row["n"]), "free_trees": int(row["trees"]),
        "rooted_checks": int(row["roots"]), "negative": int(row["negative"]),
        "minimum_C7": int(row["minimum"]), "root": int(row["root"]),
        "root_degree": int(row["degree"]), "B2": int(row["b2"]),
        "layout": ast.literal_eval(row["layout"]),
        "polynomial": ast.literal_eval(row["poly"]),
        "deletion": ast.literal_eval(row["deletion"]),
    }


def main() -> int:
    primary, fresh = parse(PRIMARY), parse(FRESH)
    assert primary == fresh
    assert (primary["order"], primary["free_trees"], primary["rooted_checks"]) == (
        24, 39_299_897, 943_197_528
    )
    assert primary["negative"] == 0 and primary["minimum_C7"] > 0
    graph = adjacency(primary["layout"])
    assert sum(map(len, graph)) == 46
    root = primary["root"]
    assert len(graph[root]) == primary["root_degree"]
    b2 = sum(max(len(v) - 1, 0) * max(len(v) - 2, 0) // 2 for v in graph)
    assert b2 == primary["B2"]
    excluded, included = rooted_state(graph, 0, -1)
    polynomial = [x + y for x, y in zip(excluded, included)]
    assert polynomial == primary["polynomial"]
    deletion = [1] + [0] * 7
    for neighbor in graph[root]:
        ex, inc = rooted_state(graph, neighbor, root)
        deletion = poly_mul(deletion, [x + y for x, y in zip(ex, inc)])
    assert deletion == primary["deletion"]
    d, e, f = polynomial[5:8]
    h, k = deletion[5:7]
    c7 = d * (e * e - d * f) - 2 * e * (e * h - d * k)
    assert c7 == primary["minimum_C7"]
    report = {
        "status": "PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_ALL_ROOTS_ORDER_24",
        "coverage": {
            "order": 24, "free_trees": primary["free_trees"],
            "rooted_checks": primary["rooted_checks"], "negative": 0,
            "minimum_C7": c7,
        },
        "minimum_witness": {
            "root": root, "root_degree": primary["root_degree"], "B2": b2,
            "WROM_layout": primary["layout"],
            "independence_coefficients_i0_through_i7": polynomial,
            "root_deleted_coefficients_i0_through_i7": deletion,
        },
        "fresh_replay_matches_primary": True,
        "independent_witness_reconstruction": True,
        "artifacts": {
            path.name: sha256(path)
            for path in (SOURCE, PRIMARY, FRESH, Path(__file__).resolve())
        },
        "scope_warning": "This closes order 24 only; orders 25 through 38 remain.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
