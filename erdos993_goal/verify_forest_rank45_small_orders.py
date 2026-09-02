#!/usr/bin/env python3
"""Regenerate sharp i5/i4 minima for every forest order at most 17."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

from replay_rank7_pgc_census_wave14 import enumerate_rows


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    5: Fraction(1, 5),
    6: Fraction(1, 6),
    7: Fraction(1, 8),
    8: Fraction(1, 12),
    9: Fraction(1, 20),
    10: Fraction(6, 35),
    11: Fraction(3, 10),
    12: Fraction(4, 9),
    13: Fraction(3, 5),
    14: Fraction(42, 55),
    15: Fraction(14, 15),
    16: Fraction(72, 65),
    17: Fraction(9, 7),
}


def main() -> int:
    _, _, _, forests = enumerate_rows(17)
    rows = []
    for order in range(5, 18):
        candidates = [
            (Fraction(poly[5], poly[4]), poly)
            for poly in forests[order]
            if len(poly) > 5 and poly[4] > 0
        ]
        minimum, witness = min(candidates)
        assert minimum == EXPECTED[order]
        rows.append(
            {
                "order": order,
                "distinct_forest_polynomials": len(forests[order]),
                "minimum_i5_over_i4": [minimum.numerator, minimum.denominator],
                "witness_polynomial": list(witness),
            }
        )
        print("PASS", order, minimum, witness, flush=True)
    report = {
        "schema": "forest-rank45-small-order-minima-v1",
        "status": "PASS_EXACT_FOREST_RANK45_SMALL_ORDERS",
        "scope": "every distinct forest independence polynomial of each exact order 5..17",
        "rows": rows,
        "enumerator": "replay_rank7_pgc_census_wave14.enumerate_rows",
        "enumerator_sha256": hashlib.sha256(
            (ROOT / "replay_rank7_pgc_census_wave14.py").read_bytes()
        ).hexdigest(),
    }
    output = ROOT / "forest_rank45_small_orders_exact_20260820.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"], output.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
