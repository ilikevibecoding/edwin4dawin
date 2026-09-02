#!/usr/bin/env python3
"""Regression certificate for retaining tiny but genuine leading terms.

An ill-scaled positive-direction line in the aligned N=4 model has a full
exact quintic target whose leading coefficient is tiny relative to its
middle coefficients.  Relative trimming used to lower it spuriously to a
quartic and manufacture a complex pair in the numerical finder.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import sympy as sp

from probe_common_double_root_random_fast import nonreal_count, target_line


OUT = Path("affine_line_screen_degree_regression_certificate_20260802.json")


def main() -> None:
    X, Y, z = sp.symbols("X Y z")
    v = sp.Integer(60)
    g = X**4+16*X**3+sp.Rational(3, 5)*v*X**2
    h = 4*X**3+sp.Rational(2, 5)*v*X**2
    d = 3
    line = (-195, sp.Rational(11, 100), 27, sp.Rational(56, 100))

    target = sp.expand(sum(
        sp.binomial(d, k)*sp.diff(g, X, k)
        * sp.diff(g.subs(X, Y), Y, d-k)
        for k in range(d+1)
    )-(sp.diff(h, X)*h.subs(X, Y)+h*sp.diff(h.subs(X, Y), Y)))
    exact = sp.Poly(sp.expand(target.subs({
        X: line[0]+line[1]*z,
        Y: line[2]+line[3]*z,
    })), z)
    assert exact.degree() == 5
    assert int(exact.count_roots(-sp.oo, sp.oo)) == 5

    gf = np.array([0.0, 0.0, 36.0, 16.0, 1.0])
    hf = np.array([0.0, 0.0, 24.0, 4.0])
    floating = target_line(gf, hf, d, -195, .11, 27, .56)
    assert len(floating)-1 == 5
    assert nonreal_count(floating) == 0
    leading_ratio = abs(float(floating[-1]))/float(np.max(np.abs(floating)))
    assert leading_ratio < 1e-10

    report = {
        "kind": "affine_line_screen_degree_regression",
        "date": "2026-08-02",
        "status": "PASS_FULL_DEGREE_RETAINED_AND_EXACTLY_REAL_ROOTED",
        "model": "N=4, d=3, normalized multiplier pair with v=rs=60",
        "line": "X=-195+(11/100)z, Y=27+(56/100)z",
        "exact_degree": exact.degree(),
        "exact_real_roots": int(exact.count_roots(-sp.oo, sp.oo)),
        "floating_degree_after_fix": len(floating)-1,
        "floating_nonreal_count_after_fix": int(nonreal_count(floating)),
        "leading_to_max_coefficient_ratio": leading_ratio,
        "regression": (
            "Never trim a leading affine-line coefficient merely because it "
            "is small relative to a middle coefficient."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
