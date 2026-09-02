#!/usr/bin/env python3
"""Independent literal replay of the 105 finite mask-1 middle cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent import (
    independent_blossom,
    independently_clear,
    literal_base,
    sparse_sha256,
    split_power,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_n26_39_middle_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_n26_39_middle_agent.py": "2AB6AEE4888F633870C1E56E6D43AA26BAA799C9295737C4440C93CBFC3EA7D3",
    "rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json": "EADDEDDF23EE824C038A577E12A772A67BA0C7F429B69CE59CAF927A2A97C23E",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE"
    base = literal_base()
    cleared, _ = independently_clear(base)
    ring, power = split_power(cleared)
    degrees, controls = independent_blossom(ring, power)
    assert degrees == (5, 5, 4) and len(controls) == 180
    assert sparse_sha256(sorted(controls.items())) == primary["bernstein_sha256"]
    rows = []
    minimum = None
    for N in range(26, 40):
        for r in range(10, N - 15):
            values = [int(polynomial(N, r)) for polynomial in controls.values()]
            assert all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            rows.append((N, r, N - r))
    assert len(rows) == 105
    assert rows == [(row["N"], row["r"], row["m"]) for row in primary["rows"]]
    assert all(row["status"] == "SEALED" for row in primary["rows"])
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-n26-39-middle-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "cells": len(rows),
        "controls_per_cell": len(controls),
        "exact_evaluations": len(rows) * len(controls),
        "minimum_control": str(minimum),
        "bernstein_sha256": primary["bernstein_sha256"],
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "EVALUATIONS", payload["exact_evaluations"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
