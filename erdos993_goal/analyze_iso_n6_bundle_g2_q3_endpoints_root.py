#!/usr/bin/env python3
"""Symbolic diagnostics for the four Q3/path endpoints of adjacent g2."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8", positive=True)
    b = sp.symbols("b0:7", positive=True)
    c = sp.symbols("c0:7", positive=True)
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(sp.sympify(source["pieces"][label], locals=locals_)
                               for label in ("A2", "L2_AB", "L2_AC", "K2_BC")))
    expression = sp.expand(expression.subs({b[5]: a[5], b[6]: a[6],
                                            c[5]: a[5], c[6]: a[6]}))
    qb = b[3] * (6*b[3] - b[2]) / (8*b[2])
    qc = c[3] * (6*c[3] - c[2]) / (8*c[2])
    for upper_b in (0, 1):
        for upper_c in (0, 1):
            rules = {}
            if upper_b:
                rules[b[4]] = qb
            if upper_c:
                rules[c[4]] = qc
            endpoint = sp.cancel(expression.subs(rules))
            numerator, denominator = sp.fraction(endpoint)
            numerator = sp.expand(numerator)
            print("ENDPOINT", upper_b, upper_c,
                  "TERMS", len(sp.Poly(numerator).terms()),
                  "DEN", denominator,
                  "DEGREES", {str(x): sp.Poly(numerator, x).degree()
                              for x in (b[2], b[3], c[2], c[3])})
            print("FACTOR", sp.factor(numerator))


if __name__ == "__main__":
    main()
