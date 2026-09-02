#!/usr/bin/env python3
"""Exact obstruction to the t=3 actual selected direct quotient.

For q=2m+2, the last m columns of G_q(t)^(-1) C_q are sufficient for the
actual-size coefficient reduction.  They pass two-sided Neville elimination
for t=3 through m=24 and fail at m=25.  The failure is witnessed directly by
a negative 6-by-6 minor.  The t=1 candidate still passes at m=25.
"""

from fractions import Fraction as F
import json
from pathlib import Path

from fast_bottom_forward import determinant
from probe_beta_newton_compressed_factor import neville_pair
from probe_direct_confluent_quotient import direct_confluent_quotient


OUT = Path("t3_selected_direct_obstruction_20260803.json")


def selected_direct(m, root):
    q = 2 * m + 2
    return [row[q - m :] for row in direct_confluent_quotient(q, root)]


def rational_record(value):
    return {
        "sign": 1 if value > 0 else -1 if value < 0 else 0,
        "numerator": str(value.numerator),
        "denominator": str(value.denominator),
    }


def minor(matrix, rows, columns):
    return determinant([[matrix[i][j] for j in columns] for i in rows])


def main():
    finite_audit = []
    for m in range(1, 26):
        matrix = selected_direct(m, F(3))
        forward, transpose = neville_pair(matrix)
        finite_audit.append(
            {"m": m, "forward": forward, "transpose": transpose}
        )
        if m < 25:
            assert forward["status"] == transpose["status"] == "PASS"
        else:
            assert forward["status"] == "PASS"
            assert transpose == {
                "status": "NEGATIVE_MULTIPLIER",
                "column": 5,
                "row": 20,
                "positive": 114,
                "zero": 0,
            }
        print(
            f"t=3 m={m} forward={forward['status']} "
            f"transpose={transpose['status']}",
            flush=True,
        )

    failing = selected_direct(25, F(3))
    # In selected-column coordinates, the negative Neville pivot is the
    # determinant on rows 0..5 and columns 15..20.  In the full q=52 quotient
    # these are columns 42..47.
    witness = minor(failing, range(0, 6), range(15, 21))
    left_neighbor = minor(failing, range(0, 6), range(14, 20))
    inner_denominator = minor(failing, range(0, 5), range(16, 21))
    assert witness < 0 < left_neighbor
    assert inner_denominator > 0

    surviving = selected_direct(25, F(1))
    t1_forward, t1_transpose = neville_pair(surviving)
    assert t1_forward["status"] == t1_transpose["status"] == "PASS"

    report = {
        "statement": (
            "The t=3 selected direct quotient passes through m=24 and "
            "fails at m=25; the t=1 quotient passes at m=25."
        ),
        "finite_audit": finite_audit,
        "negative_minor": {
            "m": 25,
            "q": 52,
            "rows_zero_based": list(range(0, 6)),
            "selected_columns_zero_based": list(range(15, 21)),
            "full_columns_zero_based": list(range(42, 48)),
            "value": rational_record(witness),
        },
        "positive_neighbor_minor": rational_record(left_neighbor),
        "positive_inner_denominator_minor": rational_record(inner_denominator),
        "t1_m25": {"forward": t1_forward, "transpose": t1_transpose},
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
