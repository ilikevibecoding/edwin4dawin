#!/usr/bin/env python3
"""Independent literal replay of all 126 coarse low-r mask-3 boxes."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base
import audit_rank8_delta0_new_leaf_mask3_n26_39_middle_layers_agent as direct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_independent_audit_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_agent.py":
        "A3B4DE472F60284DE15FF2F56BDA50AE614A310CF3DDC4769305740EA8C4A89A",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json":
        "275EB56A82B6CD020C8D79E64415E21BE970BD883EB23A7CCF658A6363A262BB",
    "audit_rank8_delta0_new_leaf_mask3_n26_39_middle_layers_agent.py":
        "A87A3D07012D75DAE09CF14307EA6F1EF0AF39DD9A27D694531EBCE53D18D716",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json").read_text(encoding="utf-8"))
    base_terms = literal_base().terms()
    replay = []
    for row in reversed(primary["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        cap = math.comb(N - 1, 6) + (math.comb(r - 1, 5) if r >= 6 else 0)
        current = direct.sign(direct.controls(base_terms, N, r, cap, Fraction(6 * m, m * m - 15 * m + 10)))
        expected = row["bernstein"]
        for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
            assert current[key] == expected[key], (N, r, key)
        replay.append({"N": N, "r": r, "m": m, **current})
    replay.reverse()
    assert len(replay) == 126
    open_cells = [(row["N"], row["r"], row["m"]) for row in replay if row["negative"]]
    assert open_cells == [tuple(row) for row in primary["open_cells"]] == [(26, 7, 19), (26, 8, 18), (26, 9, 17), (27, 9, 18)]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_MASK3_N26_39_R1_9_COARSE_122_PLUS_4_OPEN",
        "hashes": hashes,
        "counts": {"cells": 126, "zero_negative": 122, "open": 4, "bernstein_controls": 126 * 270},
        "open_cells": [list(cell) for cell in open_cells],
        "proof_boundary": "This credits 122 coarse cells and confirms exactly four residual cells; their component audit is separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 126 ZERO_NEGATIVE 122 OPEN 4")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
