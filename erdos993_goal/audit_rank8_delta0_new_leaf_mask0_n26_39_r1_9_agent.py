#!/usr/bin/env python3
"""Independent literal audit of the 126 finite low-r mask-0 cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import audit_rank8_delta0_new_leaf_mask0_19_diagonal_agent as literal


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "rank8_delta0_new_leaf_mask0_n26_39_r1_9_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_n26_39_r1_9_agent.py":
        "F2E781BE981223EC4BCCCF270A2448A42913C0C4E5FBC411D11DAABB5B23227D",
    "rank8_delta0_new_leaf_mask0_n26_39_r1_9_exact_agent_20260823.json":
        "9F3E2DBF88F757B4AD4742607CF3A0C56E6A94D2B998E729397F85B1B59148CC",
    "audit_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py":
        "FC0B6FC05F24186B29C4FF780D58349573BD65D010C3D93C90DA67325BECBC89",
    "rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json":
        "264DF9A4D588E0EF8779D4F1F7FFC9596F72B324C93CCE9A9C5829D82D83D0D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask0_n26_39_r1_9_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N26_39_R1_9_ALL_126"
    base = literal.literal_base_polynomial()
    replay = []
    for row in reversed(primary["rows"]):
        current = literal.replay_row(base, row["N"], row["r"], False)
        expected = row["bernstein"]
        for key in (
            "degrees", "blocks", "negative", "zero", "positive", "negative_indices"
        ):
            assert current[key] == expected[key], (row["N"], row["r"], key)
        assert current["negative"] == 0
        replay.append(
            {"N": row["N"], "r": row["r"], "m": row["m"], **current}
        )
    replay.reverse()
    coordinates = [(row["N"], row["r"], row["m"]) for row in replay]
    assert coordinates == [
        (N, r, N - r) for N in range(26, 40) for r in range(1, 10)
    ]
    convexity_checks = literal.audit_edge_concentration_induction()
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-r1-9-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_N26_39_R1_9_ALL_126",
        "hashes": hashes,
        "counts": {
            "cells": len(replay),
            "open": 0,
            "edge_concentration_induction_convexity_checks": convexity_checks,
        },
        "rows": replay,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 126 OPEN 0 CONVEXITY", convexity_checks)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
