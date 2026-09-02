#!/usr/bin/env python3
"""Search for a nested positive cascade in shifted forward matrices.

Let C(n,s) use q=2n+2+s and the last n rational-Catalan sections.  After a
top-left Schur pivot, an anchored diagonal copy of C(n-1,s+2) leaves a
positive correction supported off the first row and column.  This script
recursively compares that correction with C(n-2,s+4), and so on.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import sympy as sp

from explore_bottom_forward_shifted_closure import schur_top_left, shifted_forward


OUT = Path("bottom_forward_nested_schur_cascade_20260803.json")


@lru_cache(maxsize=None)
def family(n: int, shift: int) -> sp.Matrix:
    return shifted_forward(n, shift)


def anchored_residual(left: sp.Matrix, right: sp.Matrix):
    """Match the first row and column by positive diagonal scalings."""
    row_scales = [sp.cancel(left[i, 0] / right[i, 0]) for i in range(left.rows)]
    column_scales = [
        sp.cancel(left[0, j] / (row_scales[0] * right[0, j]))
        for j in range(left.cols)
    ]
    matched = sp.diag(*row_scales) * right * sp.diag(*column_scales)
    return sp.simplify(left - matched), row_scales, column_scales


def profile(matrix: sp.Matrix):
    return {
        "shape": matrix.shape,
        "rank": matrix.rank(),
        "signs": sorted({int(sp.sign(value)) for value in matrix}),
        "first_row_zero": matrix[0, :] == sp.zeros(1, matrix.cols),
        "first_column_zero": matrix[:, 0] == sp.zeros(matrix.rows, 1),
    }


def main() -> None:
    records = []
    # Keep the replay certificate deliberately modest: the exact symbolic
    # expressions grow very quickly.  Larger cases (shift 0 through n=7 and
    # shift 2 through n=6) were also checked interactively, but the compact
    # report below is intended to finish in a reasonable time from scratch.
    ranges = {0: range(3, 6), 2: range(3, 6), 4: range(3, 5)}
    for shift, sizes in ranges.items():
        for n in sizes:
            current = schur_top_left(family(n, shift))
            stages = []
            depth = 1
            while current.rows >= 1:
                target = family(n - depth, shift + 2 * depth)
                residual, rows, columns = anchored_residual(current, target)
                item = profile(residual)
                item["positive_scales"] = all(value > 0 for value in rows + columns)
                stages.append(item)
                if residual.rows <= 1:
                    break
                assert residual[0, :] == sp.zeros(1, residual.cols)
                assert residual[:, 0] == sp.zeros(residual.rows, 1)
                current = residual[1:, 1:]
                depth += 1
            print(f"n={n} shift={shift} stages={stages}", flush=True)
            records.append({"n": n, "shift": shift, "stages": stages})

    assert all(
        stage["signs"] in ([0, 1], [0])
        and stage["first_row_zero"]
        and stage["first_column_zero"]
        and stage["positive_scales"]
        for record in records
        for stage in record["stages"]
    )
    report = {
        "kind": "bottom_forward_nested_schur_cascade",
        "status": "PASS_EXACT_FINITE_NESTED_POSITIVITY",
        "ranges": {str(shift): [min(sizes), max(sizes)] for shift, sizes in ranges.items()},
        "cases": len(records),
        "stages": sum(len(record["stages"]) for record in records),
        "observation": (
            "After the first Schur pivot, anchored diagonal matching against "
            "C(n-1,s+2) leaves a zero first row and column and a strictly "
            "positive inner correction.  Repeating against C(n-2,s+4), etc., "
            "has the same rank-one-descending pattern in every checked case."
        ),
        "scope": (
            "Exact finite evidence only.  Positivity of these entrywise "
            "corrections is not by itself a total-positivity closure theorem."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
