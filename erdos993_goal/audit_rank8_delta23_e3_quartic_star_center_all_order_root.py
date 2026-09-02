#!/usr/bin/env python3
"""Independent no-gap and literal audit of center-root quartic Delta2/Delta3."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import build_star, forest_polynomial
from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import residual


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_center_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "CAAE528760816A3E5B00294E5E868D04122263266D7B18A84680E109D0048259",
    "verify_rank8_delta23_e3_quartic_star_center_all_order_root.py": "E2AB9BE86DBC21AEF719B0EF6F2BDE34DE98CA8180741CBCD0238B19F04778C4",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py": "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def delta23(core, deleted):
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert primary["no_gap_short_long_partition"]["total_cells"] == 84
    expected_keys = {
        (long_count, shorts)
        for long_count in range(1, 5)
        for shorts in itertools.combinations_with_replacement(range(1, 7), 4 - long_count)
    }
    by_key = {
        (cell["long_arms"], tuple(cell["short_arms"])): cell
        for cell in primary["cells"]
    }
    assert set(by_key) == expected_keys and len(by_key) == 84
    literal_rows = []
    for key, cell in by_key.items():
        long_count, shorts = key
        baseline = 1 + 7 * long_count + sum(shorts)
        needed = max(0, 27 - baseline)
        shift = math.ceil(needed / long_count)
        assert cell["baseline_order_before_shift"] == baseline
        assert cell["offset_total_needed"] == needed
        assert cell["shift"] == shift
        arms = tuple(sorted((7 + shift, *([7] * (long_count - 1)), *shorts)))
        adjacency, descriptors = build_star(arms)
        assert descriptors[0] == ("center",)
        values = delta23(
            forest_polynomial(adjacency),
            forest_polynomial(adjacency, 0),
        )
        for rank in (2, 3):
            row = cell["ranks"][str(rank)]
            assert row["negative_coefficients"] == row["zero_coefficients"] == 0
            assert values[rank - 2] == int(row["constant_coefficient"]) > 0
        literal_rows.append({
            "long_arms": long_count,
            "short_arms": list(shorts),
            "shift": shift,
            "literal_origin_arms": list(arms),
            "literal_origin_order": len(adjacency),
            "Delta2": values[0],
            "Delta3": values[1],
        })
    for rank in (2, 3):
        totals = primary["rank_totals"][str(rank)]
        assert totals["cells"] == 84
        assert totals["negative_coefficients"] == totals["zero_coefficients"] == 0
    payload = {
        "schema": "rank8-delta23-e3-quartic-star-center-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
        "no_gap_reconstruction": {
            "cell_keys": 84,
            "four_long": 1,
            "three_long_one_short": 6,
            "two_long_two_short": 21,
            "one_long_three_short": 56,
            "zero_long_maximum_order": 25,
            "order_threshold_and_shift_rechecked": True,
        },
        "coefficient_recheck": primary["rank_totals"],
        "independent_literal_constants": {
            "cells": len(literal_rows),
            "rank_constants": 2 * len(literal_rows),
            "all_exact_matches": True,
            "rows": literal_rows,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Center-root quartic-star Delta2/Delta3 only; arm roots and other connected sectors are separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
