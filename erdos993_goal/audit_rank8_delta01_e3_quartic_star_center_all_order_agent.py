#!/usr/bin/env python3
"""Independent no-gap and literal-constant audit of the center-root theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    build_star,
    deltas,
    forest_polynomial,
)


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json"
EXPECTED = {
    "verify_rank8_delta01_e3_quartic_star_center_all_order_agent.py":
        "F1281058A018ADDFE11F26700BEF14EC6C96A79E461BE19EBD86D2EB40AA1F11",
    PRIMARY.name:
        "BECC0BD392E70EF54CAE44155C334C79A669379CAB3EC578D45C0C317DFB1A34",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json":
        "B85734614D101BB6E83B4BA73DDEFF782597DB755F33EE033BD035F1D09A95AD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key(long_count: int, shorts: tuple[int, ...]):
    return long_count, shorts


def origin_arms(long_count: int, shorts: tuple[int, ...], shift: int):
    return tuple(sorted((7 + shift, *([7] * (long_count - 1)), *shorts)))


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert primary["no_gap_short_long_partition"]["total_cells"] == 84
    expected_keys = {
        key(long_count, shorts)
        for long_count in range(1, 5)
        for shorts in itertools.combinations_with_replacement(
            range(1, 7), 4 - long_count
        )
    }
    actual_keys = {
        key(cell["long_arms"], tuple(cell["short_arms"]))
        for cell in primary["cells"]
    }
    assert actual_keys == expected_keys and len(actual_keys) == 84

    literal_rows = []
    for cell in primary["cells"]:
        long_count = cell["long_arms"]
        shorts = tuple(cell["short_arms"])
        baseline = 1 + 7 * long_count + sum(shorts)
        needed = max(0, 27 - baseline)
        shift = math.ceil(needed / long_count)
        assert cell["baseline_order_before_shift"] == baseline
        assert cell["offset_total_needed"] == needed
        assert cell["shift"] == shift
        # Every target offset vector with sum>=needed has a coordinate at
        # least ceil(needed/long_count); arm symmetry moves it to the shifted
        # representative.  Zero-long cells have maximum order 25.
        assert long_count >= 1
        arms = origin_arms(long_count, shorts, shift)
        adjacency, descriptors = build_star(arms)
        assert descriptors[0] == ("center",)
        core = forest_polynomial(adjacency)
        deletion = forest_polynomial(adjacency, 0)
        values = deltas(core, deletion)
        for rank, value in enumerate(values):
            row = cell["ranks"][str(rank)]
            assert row["negative_coefficients"] == 0
            assert row["zero_coefficients"] == 0
            assert value == int(row["constant_coefficient"])
            assert value > 0
        literal_rows.append({
            "long_arms": long_count,
            "short_arms": list(shorts),
            "shift": shift,
            "literal_origin_arms": list(arms),
            "literal_origin_order": len(adjacency),
            "Delta0": values[0],
            "Delta1": values[1],
        })

    assert primary["rank_totals"] == {
        "0": {
            "cells": 84,
            "coefficients": 4998,
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": "1/2633637888000",
        },
        "1": {
            "cells": 84,
            "coefficients": 4998,
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": "1/2304433152000",
        },
    }
    all_long = json.loads(
        (ROOT / "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json").read_text(encoding="utf-8")
    )
    four_long = [cell for cell in primary["cells"] if cell["long_arms"] == 4]
    assert len(four_long) == 1
    for rank in ("0", "1"):
        assert four_long[0]["ranks"][rank] == {
            key: value
            for key, value in all_long["ranks"][rank].items()
            if key != "positive_coefficients"
        }

    payload = {
        "schema": "rank8-delta01-e3-quartic-star-center-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
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
            "engine": "separately transcribed tree DP and residual identity",
            "cells": len(literal_rows),
            "rank_constants": 2 * len(literal_rows),
            "all_exact_matches": True,
            "rows": literal_rows,
        },
        "all_long_report_exactly_embedded": True,
        "remaining_quartic_star_scope": (
            "only noncenter roots with a short near/tail segment or a short "
            "other arm; the center orbit is now complete for all n>=27"
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This does not close the arm-root boundary, other e=3 skeleton, or connected Q8.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
