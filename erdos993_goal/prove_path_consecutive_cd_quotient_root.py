#!/usr/bin/env python3
"""Replay the positive consecutive-path Christoffel--Darboux quotient.

The all-order proof is the displayed two-step recurrence.  The finite loop is
an independent exact replay of its polynomial identities, not a substitute
for the induction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "path_consecutive_cd_quotient_exact_root_20260829.json"
z, w = sp.symbols("z w")


def path_poly(n: int, variable: sp.Symbol) -> sp.Expr:
    if n == 0:
        return sp.Integer(1)
    if n == 1:
        return 1 + variable
    previous2, previous1 = sp.Integer(1), 1 + variable
    for _ in range(2, n + 1):
        previous2, previous1 = previous1, sp.expand(previous1 + variable * previous2)
    return previous1


def quotient(n: int) -> sp.Expr:
    numerator = sp.expand(
        path_poly(n, z) * path_poly(n - 1, w)
        - path_poly(n, w) * path_poly(n - 1, z)
    )
    value, remainder = sp.div(numerator, z - w, domain=sp.ZZ)
    assert remainder == 0
    return sp.expand(value)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    checked = 0
    minimum = None
    for n in range(1, 41):
        d_n = quotient(n)
        if n in (1, 2):
            assert d_n == 1
        else:
            rhs = sp.expand(
                path_poly(n - 2, z) * path_poly(n - 2, w)
                + z * w * quotient(n - 2)
            )
            assert sp.expand(d_n - rhs) == 0
        polynomial = sp.Poly(d_n, z, w)
        for _, coefficient in polynomial.terms():
            coefficient = int(coefficient)
            assert coefficient >= 0
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            checked += 1

    report = {
        "marker": "PASS_EXACT_ALL_ORDER_PATH_CONSECUTIVE_CD_QUOTIENT_POSITIVITY",
        "theorem": (
            "D_n(z,w)=[P_n(z)P_(n-1)(w)-P_n(w)P_(n-1)(z)]/(z-w) "
            "has nonnegative integer coefficients for every n>=1."
        ),
        "recurrence": "D_n=P_(n-2)(z)P_(n-2)(w)+zw D_(n-2), with D_1=D_2=1",
        "proof": (
            "Substitute P_n=P_(n-1)+xP_(n-2), then substitute the same "
            "recurrence for P_(n-1); division by z-w gives the recurrence. "
            "Induction is coefficientwise nonnegative."
        ),
        "literal_replay": {
            "orders": "1..40",
            "coefficient_cells": checked,
            "minimum_coefficient": minimum,
        },
        "scope": (
            "This is an exact path-polynomial lemma. Its substitution into "
            "the double-broom ISO remainder is a separate obligation."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
