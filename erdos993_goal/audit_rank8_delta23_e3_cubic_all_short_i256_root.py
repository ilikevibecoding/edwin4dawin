#!/usr/bin/env python3
"""Independent literal-tree route audit for the all-short Delta2/Delta3 scan."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import (
    FIELDS,
    forest_polynomial,
    residual,
    subdivision_with_paths,
)


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "probe_rank8_delta23_e3_cubic_all_short_i256_root.exe"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_all_short_i256_root_independent_audit_20260823.json"
SAMPLE_CELLS = 1000
EXPECTED_COUNTS = {
    "outer_branch": 80_652,
    "middle_branch": 40_553,
    "outer_leaf": 182_356,
    "middle_leaf": 53_218,
    "outer_pendant_internal": 2_349_983,
    "middle_pendant_internal": 676_950,
    "spine_internal": 1_286_834,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_tree(label: str, values: list[int]):
    raw = dict(zip(FIELDS[label], values, strict=True))
    if label == "outer_pendant_internal":
        lengths = {**raw, "a1": raw["near"] + raw["tail"] + 1}
    elif label == "middle_pendant_internal":
        lengths = {**raw, "m": raw["near"] + raw["tail"] + 1}
    elif label == "spine_internal":
        lengths = {**raw, "u": raw["near"] + raw["tail"] + 2}
    else:
        lengths = raw
    adjacency, paths = subdivision_with_paths(lengths)
    if label == "outer_branch":
        root = 0
    elif label == "middle_branch":
        root = 1
    elif label == "outer_leaf":
        root = 3
    elif label == "middle_leaf":
        root = 5
    elif label == "outer_pendant_internal":
        root = paths["a1"][raw["near"] + 1]
    elif label == "middle_pendant_internal":
        root = paths["m"][raw["near"] + 1]
    elif label == "spine_internal":
        root = paths["u"][raw["near"] + 1]
    else:
        raise AssertionError(label)
    return adjacency, root


def delta23(label: str, values: list[int]):
    adjacency, root = literal_tree(label, values)
    c = forest_polynomial(adjacency)
    h = forest_polynomial(adjacency, root)
    r1 = residual(c, h, 1)
    r2 = residual(c, h, 2)
    r3 = residual(c, h, 3)
    r4 = residual(c, h, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1, len(adjacency), root


def main() -> None:
    rows = []
    for label, universe in EXPECTED_COUNTS.items():
        completed = subprocess.run(
            [str(EXE), label, "0", str(SAMPLE_CELLS)],
            check=True, capture_output=True, text=True,
        )
        scan = json.loads(completed.stdout.strip().splitlines()[-1])
        assert scan["status"] == "PASS_EXACT_DELTA23_ALL_SHORT_I256_CHUNK"
        assert scan["processed"] == SAMPLE_CELLS and scan["universe"] == universe
        assert scan["negative2"] == scan["negative3"] == 0
        witnesses = []
        for rank in (2, 3):
            values = scan[f"witness{rank}"]
            d2, d3, order, root = delta23(label, values)
            replayed = d2 if rank == 2 else d3
            expected = int(scan[f"minimum{rank}"])
            assert replayed == expected > 0
            assert order >= 37
            witnesses.append({
                "rank": rank,
                "values": values,
                "literal_order": order,
                "literal_root": root,
                "expected_and_replayed_value": expected,
            })
        rows.append({
            "root_location_orbit": label,
            "sampled_prefix_cells": SAMPLE_CELLS,
            "full_universe_count_replayed": universe,
            "witnesses": witnesses,
        })
        print("PASS", label, flush=True)

    payload = {
        "schema": "rank8-delta23-e3-cubic-all-short-i256-root-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_DELTA23_ALL_SHORT_I256_ROUTE_AUDIT",
        "scope": "Diagnostic validation of 1,000-cell prefixes and both reported extrema per root orbit; not exhaustive closure.",
        "root_orbits": rows,
        "totals": {
            "sampled_prefix_cells": len(rows) * SAMPLE_CELLS,
            "literal_extremal_witnesses": len(rows) * 2,
        },
        "methods": [
            "literal vertex-by-vertex subdivided-tree construction",
            "generic rooted-forest independence-polynomial DP",
            "independently evaluated Delta2 and Delta3 residual differences",
        ],
        "immutable_inputs": {
            EXE.name: sha256(EXE),
            "probe_rank8_delta23_e3_cubic_all_short_i256_root.rs": sha256(ROOT / "probe_rank8_delta23_e3_cubic_all_short_i256_root.rs"),
            "rank8_delta03_e3_cubic_exact_i256_core_root.rs": sha256(ROOT / "rank8_delta03_e3_cubic_exact_i256_core_root.rs"),
            "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": sha256(ROOT / "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py"),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This validates the arithmetic route but does not replace exhaustive no-gap evaluation of all 4,670,546 all-short patterns and its final audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
