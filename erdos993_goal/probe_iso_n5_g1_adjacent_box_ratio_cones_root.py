#!/usr/bin/env python3
"""Exact cone probe for the adjacent no-mark-root g1 box relaxation.

When the protected marks are adjacent, epsilon=0 and the sufficient block is

  H(A)+L(A,B)+L(A,C)+K(B,C).

Actual deletion rows satisfy 0<=B,C<=A coefficientwise.  The expression is
multi-affine in those ten bounded coordinates, so it suffices to inspect the
528 unordered box-corner pairs.  This script substitutes the proved high/low
factorial-drop cones at every corner and audits exact power/Bernstein signs.
It is a probe until finite exceptions and theorem dependencies are assembled.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_no_mark_root_compact_components_root import h_block, k_block, l_block


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_box_ratio_cones_probe_root_20260829.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_BOX_RATIO_CONES_ROOT"


def corner(a, mask):
    return tuple(a[rank] if rank == 0 or mask & (1 << (rank - 1)) else 0 for rank in range(6))


def main() -> None:
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), sp.Integer(1)]
    for value in rho:
        q.append(sp.expand(q[-1] * value))
    a = tuple(q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(7))
    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    r = sp.Symbol("r", nonnegative=True)
    high_rules = {
        rho[4]: t, rho[3]: t + 1 + d4, rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 3 + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2 + d1,
    }
    low_rules = {
        rho[4]: t, rho[3]: t + 1 + d4, rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 4 - r + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2,
    }
    failures = []
    high_coefficients = low_coefficients = 0
    high_minimum = low_minimum = None
    branches = 0
    for bmask in range(32):
        b = corner(a, bmask)
        for cmask in range(bmask, 32):
            c = corner(a, cmask)
            expression = sp.expand(46080 * (
                h_block(a) + l_block(a, b) + l_block(a, c) + k_block(b, c)
            ))
            assert all(value.q == 1 for value in sp.Poly(expression, *rho).coeffs())
            high = sp.Poly(sp.expand(expression.subs(high_rules)), t, d1, d2, d3, d4)
            high_bad = [value for value in high.coeffs() if value < 0]
            high_coefficients += len(high.terms())
            high_minimum = min(high.coeffs()) if high_minimum is None else min(high_minimum, *high.coeffs())

            low = sp.expand(expression.subs(low_rules))
            degree = int(sp.degree(low, r))
            power = [low.coeff(r, j) for j in range(degree + 1)]
            bernstein = [sp.expand(sum(
                sp.Rational(sp.binomial(k, j), sp.binomial(degree, j)) * power[j]
                for j in range(k + 1)
            )) for k in range(degree + 1)]
            low_bad = []
            for index, coefficient in enumerate(bernstein):
                polynomial = sp.Poly(coefficient, t, d2, d3, d4)
                low_coefficients += len(polynomial.terms())
                low_minimum = (
                    min(polynomial.coeffs()) if low_minimum is None
                    else min(low_minimum, *polynomial.coeffs())
                )
                if any(value < 0 for value in polynomial.coeffs()):
                    low_bad.append(index)
            if high_bad or low_bad:
                failures.append({
                    "B_mask": bmask, "C_mask": cmask,
                    "high_negative_coefficients": len(high_bad),
                    "low_bad_bernstein_indices": low_bad,
                })
            branches += 1
    assert branches == 528
    report = {
        "marker": MARKER,
        "corner_pairs": branches,
        "high_total_coefficients": high_coefficients,
        "low_total_bernstein_coefficients": low_coefficients,
        "high_minimum_scalar_coefficient": str(high_minimum),
        "low_minimum_scalar_coefficient": str(low_minimum),
        "failing_corner_pairs": len(failures),
        "failures": failures,
        "scope": (
            "Exact high/low cone probe for the adjacent coefficientwise box. "
            "No finite-exception or dependency assembly is asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
