"""Inspect the Gasca--Pena initial minors of the actual forward matrix.

For an entrywise positive square matrix, strict total positivity is certified
by the initial minors: consecutive row blocks using the first k columns, and
consecutive column blocks using the first k rows.  This script computes only
those determinants for the balanced forward-difference matrix D_m and records
their exact factorizations and adjacent-size ratios.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_matrix


OUT = Path("bottom_actual_initial_minors_20260803.json")


def initial_minors(matrix: sp.Matrix):
    m = matrix.rows
    records = []
    for k in range(1, m + 1):
        first_columns = list(range(k))
        for start in range(m - k + 1):
            rows = list(range(start, start + k))
            value = sp.factor(matrix.extract(rows, first_columns).det(method="domain-ge"))
            records.append(("L", k, start, value))

        first_rows = list(range(k))
        # start=0 duplicates the north-west initial minor above.
        for start in range(1, m - k + 1):
            columns = list(range(start, start + k))
            value = sp.factor(matrix.extract(first_rows, columns).det(method="domain-ge"))
            records.append(("T", k, start, value))
    assert len(records) == m * m
    return records


def factor_dict(value: sp.Expr):
    numerator, denominator = map(int, sp.fraction(value))
    return {
        "numerator": sp.factorint(abs(numerator)),
        "denominator": sp.factorint(abs(denominator)),
        "sign": 1 if value > 0 else (-1 if value < 0 else 0),
    }


def main() -> None:
    report = {"kind": "balanced_actual_initial_minors", "sizes": []}
    for m in range(1, 11):
        differences = forward_matrix(m)[2]
        records = initial_minors(differences)
        assert all(value > 0 for _, _, _, value in records)
        print(f"m={m} initial_minors={len(records)} all_positive=True", flush=True)
        if m <= 3:
            for side, k, start, value in records:
                print(
                    f" {side} k={k} start={start} value={value} "
                    f"factors={factor_dict(value)}",
                    flush=True,
                )
        report["sizes"].append(
            {
                "m": m,
                "count": len(records),
                "all_positive": True,
                "records": [
                    {
                        "side": side,
                        "order": k,
                        "start": start,
                        "value": str(value),
                    }
                    for side, k, start, value in records
                ],
            }
        )
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
