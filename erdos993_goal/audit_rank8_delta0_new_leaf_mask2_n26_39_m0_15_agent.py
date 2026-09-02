#!/usr/bin/env python3
"""Independent literal audit of all 224 finite mask-2 small-m cells."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import audit_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent as rational
from audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_n26_39_m0_15_independent_audit_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask2_n26_39_m0_15_agent.py": "B56C9438D36DBF37306E6541B8E38311D55520C842CD07A2E20F00432FCD5202",
    "rank8_delta0_new_leaf_mask2_n26_39_m0_15_exact_agent_20260823.json": "CEE4F34F1BC00C2A763690E9C4F8C64A5FEEB1214930A90B784E3B6A8D668600",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json": "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json": "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "audit_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent.py": "E915AA710569374E11FEE42D706A68F9713EDF69FEA52CA9FD386E3C68760368",
    "audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "2ABD786B10A01DABCDA464F033924055D7D4AB893ADB2517421EC20F15F91CFA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_fraction(value: str) -> Fraction:
    numerator, slash, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if slash else 1)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask2_n26_39_m0_15_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_M0_15_ALL_224"
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = literal_base()
    replay = []
    subboxes = 0
    minimum = None
    for row in reversed(primary["rows"]):
        audited = []
        for branch in reversed(row["branches"]):
            t_upper = None
            if branch["branch"] == "f6_positive":
                t_upper = parse_fraction(
                    global_rows[row["m"]]["f6_positive_maximum_f5_over_f6"]
                )
            polynomial = rational.direct_polynomial(
                base, row["N"], row["m"], branch["branch"], t_upper
            )
            current = rational.sign(polynomial)
            expected = branch["bernstein"]
            for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
                assert current[key] == expected[key], (row["N"], row["m"], branch["branch"], key)
            assert current["negative"] == 0
            value = Fraction(current["minimum_literal_fraction"])
            minimum = value if minimum is None else min(minimum, value)
            audited.append({"branch": branch["branch"], **current})
            subboxes += 1
        audited.reverse()
        replay.append({"N": row["N"], "m": row["m"], "r": row["r"], "branches": audited})
    replay.reverse()
    assert len(replay) == 224 and subboxes == 294
    assert [(row["N"], row["m"], row["r"]) for row in replay] == [
        (N, m, N - m) for N in range(26, 40) for m in range(16)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-n26-39-m0-15-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N26_39_M0_15_ALL_224",
        "scope": primary["scope"],
        "hashes": actual,
        "method": "direct rational substitution and unscaled Fraction Bernstein replay",
        "counts": {"cells": len(replay), "bernstein_subboxes": subboxes, "open": 0},
        "minimum_literal_fraction": str(minimum),
        "rows": replay,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(replay), "SUBBOXES", subboxes, "OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
