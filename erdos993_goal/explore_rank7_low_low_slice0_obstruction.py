#!/usr/bin/env python3
"""Reconstruct and classify every raw negative in low/low slice (0,0,0,0)."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from verify_rank7_low_convolution_sliced import Construction, TOTAL_DEGREE, target_product


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_low_low_slice0_obstruction_exact_20260816.json"


def main() -> int:
    construction = Construction("low-low")
    q6, q7, q8 = construction.product_coefficients()
    h = construction.h()
    target = (0, 0, 0, 0)
    margin = target_product(q7, q7, target, construction.zero)
    margin -= target_product(q6, q8, target, construction.zero)
    for hkey, hvalue in h.items():
        residual = tuple(t - x for t, x in zip(target, hkey))
        if min(residual) >= 0:
            margin -= hvalue * target_product(q6, q7, residual, construction.zero)

    rows = []
    support = Counter()
    term_count = 0
    total_negative = 0
    for monomial, coefficient_raw in margin.terms():
        term_count += 1
        coefficient = int(coefficient_raw)
        if coefficient >= 0:
            continue
        total_negative += 1
        retained = tuple(map(int, monomial))
        b_exponent = TOTAL_DEGREE - sum(retained)
        assert b_exponent >= 0
        exponents = {name: value for name, value in zip(construction.remaining_names, retained)}
        exponents["b"] = b_exponent
        active_off = tuple(name for name in ("b3", "b4", "b5", "b6") if exponents[name])
        support[active_off] += 1
        rows.append({
            "coefficient": coefficient,
            "remaining_monomial": list(retained),
            "b_exponent": b_exponent,
            "active_off": list(active_off),
        })

    assert term_count == 8269679
    assert total_negative == 655
    hard = sum(count for active, count in support.items() if not active)
    assert hard == 594
    result = {
        "status": "EXACT_OBSTRUCTION_TO_OLD_LOW_LOW_HARD_FACE",
        "slice_variables": list(construction.slice_names),
        "slice_exponents": list(target),
        "remaining_variables": list(construction.remaining_names),
        "terms": term_count,
        "negative": total_negative,
        "hard_face_negative": hard,
        "outside_hard_face_negative": total_negative - hard,
        "outside_support_counts": [
            {"active_off": list(active), "count": count}
            for active, count in sorted(support.items()) if active
        ],
        "negative_rows": rows,
    }
    REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print("outside_support_counts", result["outside_support_counts"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
