#!/usr/bin/env python3
"""Verify the Catalan lower-Neville factor of checker((L^-1 C)^-1)."""

from fractions import Fraction as F
import json
from pathlib import Path

from fast_bottom_forward import catalan
from probe_confluent_transition_sections import inverse_matrix
from probe_newton_full_neville_patterns import neville_parameters, transformed


OUT = Path("newton_checker_catalan_neville_20260803.json")


def checker_inverse_newton_quotient(q):
    inverse = inverse_matrix(transformed(q))
    return [
        [(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
        for i in range(q)
    ]


def checker_reversed_catalan_inverse(q):
    hankel = [
        [F(catalan(i + j + 3)) for j in range(q)] for i in range(q)
    ]
    inverse = inverse_matrix(hankel)
    return [
        [
            (-1 if (i + j) % 2 else 1)
            * inverse[q - 1 - i][q - 1 - j]
            for j in range(q)
        ]
        for i in range(q)
    ]


def predicted_multiplier(q, column, row):
    i = q - row
    return F(
        2 * i * (2 * i + 5) * (q + i + 3),
        (q - i)
        * (q + i + 3 - column)
        * (q + i + 2 - column),
    )


def main():
    checks = 0
    records = []
    for q in range(2, 31):
        catalan_factor = checker_reversed_catalan_inverse(q)
        complete = checker_inverse_newton_quotient(q)
        catalan_neville, _ = neville_parameters(catalan_factor)
        complete_neville, _ = neville_parameters(complete)
        assert catalan_neville == complete_neville
        for column, level in enumerate(catalan_neville):
            for row, value in level:
                assert value == predicted_multiplier(q, column, row)
                assert value > 0
                checks += 1
        records.append({"q": q, "positive_formula_checks": checks})
        print(f"q={q} PASS cumulative_checks={checks}", flush=True)

    report = {
        "status": "PASS",
        "range": [2, 30],
        "positive_multiplier_checks": checks,
        "formula": (
            "m(q,c,r)=2*i*(2*i+5)*(q+i+3)/"
            "((q-i)*(q+i+3-c)*(q+i+2-c)), i=q-r"
        ),
        "records": records,
        "scope": (
            "The common lower Neville factor is explained by the reversed "
            "checker inverse of the shifted Catalan Hankel moment matrix. "
            "The hard terminal upper factor remains conjecturally TN."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
