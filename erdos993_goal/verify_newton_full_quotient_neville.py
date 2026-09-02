#!/usr/bin/env python3
"""Exact two-sided Neville audit of Y_q=L_q^(-1)C_q through q=60."""

import json
from pathlib import Path

from probe_beta_newton_compressed_factor import neville_pair
from probe_newton_full_neville_patterns import transformed


OUT = Path("newton_full_quotient_neville_20260803.json")


def main():
    records = []
    forward_total = transpose_total = pivot_total = 0
    for q in range(2, 61):
        forward, transpose = neville_pair(transformed(q))
        assert forward["status"] == transpose["status"] == "PASS"
        assert forward["zero"] == transpose["zero"] == 0
        forward_total += forward["positive"]
        transpose_total += transpose["positive"]
        pivot_total += forward["positive_pivots"]
        records.append({"q": q, "forward": forward, "transpose": transpose})
        print(f"q={q} PASS", flush=True)

    report = {
        "status": "PASS",
        "matrix": "Y_q=L_q^(-1) C_q",
        "range": [2, 60],
        "forward_positive_multipliers": forward_total,
        "transpose_positive_multipliers": transpose_total,
        "positive_pivots_each_orientation": pivot_total,
        "records": records,
        "scope": (
            "This is exact finite evidence.  It does not prove total "
            "positivity for every q."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
