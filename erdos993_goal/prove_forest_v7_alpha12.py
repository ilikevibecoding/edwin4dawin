#!/usr/bin/env python3
"""Assemble the all-order V7 theorem for forests with alpha >= 12.

Exact finite generation is replayed separately by
``verify_forest_v7_medium_trees.py`` and
``scan_rank7_forest_residual_n20.py``.  This fast assembler validates
their reports and reruns the analytic n>=25 certificate.
"""

from __future__ import annotations

import json
from pathlib import Path

import prove_forest_v7_order25


HERE = Path(__file__).resolve().parent
MEDIUM = HERE / "forest_v7_medium_orders21_24_exact_20260813.json"
SMALL = HERE / "rank7_forest_residual_n20_exact_20260813.json"
OUTPUT = HERE / "forest_v7_alpha12_exact_20260813.json"


def main() -> int:
    # Rerun all symbolic, quantitative order-25, and exceptional-spider
    # checks and refresh the large-order report.
    prove_forest_v7_order25.main()
    large = json.loads(prove_forest_v7_order25.REPORT.read_text(encoding="utf-8"))
    medium = json.loads(MEDIUM.read_text(encoding="utf-8"))
    small = json.loads(SMALL.read_text(encoding="utf-8"))

    assert large["status"] == "PASS_EXACT_ALL_FOREST_V7_ORDER_AT_LEAST_25"
    assert medium["status"] == "PASS_EXACT_FOREST_V7_ALPHA12_ORDERS21_24"
    assert medium["total_trees"] == 61_896_232
    assert medium["total_eligible_forests"] == 142_706_310
    assert [medium["orders"][str(order)]["minimum_V7"] for order in range(21, 25)] == [
        139_197_240, 343_390_824, 874_809_936, 2_590_346_304,
    ]

    assert small["status"] == "PASS_EXACT_FOREST_RANK7_RESIDUAL_CENSUS_THROUGH_ORDER_20_NOT_THEOREM"
    negative_rows = small["required_range_negative_rows"]["V7"]
    assert len(negative_rows) == 15
    assert all(row["alpha"] == 11 for row in negative_rows)
    # The small census is exhaustive over alpha>=11; since all its negative
    # rows have alpha exactly 11, its alpha>=12 subrange is nonnegative.

    report = {
        "status": "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12",
        "theorem": "9*i5*i6+105*i5*i7-72*i6^2 >= 0 for every forest with alpha>=12",
        "coverage": {
            "orders_at_most_20": {
                "source": SMALL.name,
                "exhaustive_range": "alpha>=11",
                "negative_rows": 15,
                "all_negative_rows_have_alpha": 11,
                "conclusion": "alpha>=12 subrange is nonnegative",
            },
            "orders_21_through_24": medium,
            "orders_at_least_25": {
                "source": prove_forest_v7_order25.REPORT.name,
                "conclusion": "all forests, without an alpha restriction",
            },
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
