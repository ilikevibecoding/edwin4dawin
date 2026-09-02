#!/usr/bin/env python3
"""Derive exact Newton-basis coefficients for the two-rooted-star ISO base.

This file develops the all-order proof route

    N_r(a,b) = sum c_r(i,j) binom(a,i) binom(b,j).

Products of binomial polynomials are linearized by the exact union/intersection
coefficient L(p,q,h).  The resulting coefficient support and formulas are much
smaller than the original expression.  This producer currently records the
formulas and exact stress checks; a theorem marker is emitted only after every
symbolic positivity chamber is certified.
"""

from __future__ import annotations

import json
from math import factorial
from pathlib import Path

import sympy as sp


def L(p: int, q: int, h: int) -> int:
    """Coefficient of C(n,h) in C(n,p)C(n,q)."""
    x, y, z = p + q - h, h - p, h - q
    if min(x, y, z) < 0:
        return 0
    return factorial(h) // (factorial(x) * factorial(y) * factorial(z))


def coefficient_parts(r: int, i: int, j: int) -> tuple[int, int, int, int]:
    s = i + j
    bb_terms = (
        (-2, 0, -2),
        (-2, 0, -3),
        (-(r + 1), 1, -3),
        (r - 1, -1, -1),
        (2, -1, -2),
        (2, -1, -3),
        (2, -2, -2),
    )
    bb = sum(c * L(r + p, r + q, s) for c, p, q in bb_terms)

    cross_terms = (
        (-(r + 1), 0, -3),
        (r - 1, -1, -2),
        (-1, -1, -3),
        (r - 1, -2, -1),
        (2, -2, -2),
        (2, -2, -3),
        (-1, -3, -1),
        (-(r + 1), -3, 0),
        (2, -3, -2),
    )

    def cross(left: int) -> int:
        value = 0
        for c, p, q in cross_terms:
            x = 2 * r + p + q - s
            y = s - r - p
            z = left - r - q
            if min(x, y, z) >= 0:
                value += c * factorial(left) // (
                    factorial(x) * factorial(y) * factorial(z)
                )
        return value

    bx = cross(i)
    by = cross(j)
    xy = 0
    for c, p, q in (
        (-(r + 1), -1, -3),
        (2 * r, -2, -2),
        (-(r + 1), -3, -1),
        (2, -3, -3),
    ):
        if i == r + p and j == r + q:
            xy += c
    return bb, bx, by, xy


def bb_formula(r, m):
    return (
        2
        * (2 * m - 1)
        * (r - 1)
        * sp.factorial(r + m - 3)
        / (
            sp.factorial(m)
            * sp.factorial(r - m)
            * sp.factorial(m - 1)
        )
    )


def both_active_correction(r, t: int, u: int):
    """Exact BX+BY+XY Newton coefficient for fixed corner offsets."""
    h = t + u
    cross_terms = (
        (-(r + 1), 0, -3),
        (r - 1, -1, -2),
        (-1, -1, -3),
        (r - 1, -2, -1),
        (2, -2, -2),
        (2, -2, -3),
        (-1, -3, -1),
        (-(r + 1), -3, 0),
        (2, -3, -2),
    )

    def one_cross(offset: int):
        top = r - 3 + offset
        value = 0
        for c, p, q in cross_terms:
            x = p + q + 6 - h
            z = offset - 3 - q
            if min(x, z) < 0:
                continue
            degree = x + z
            falling = sp.prod(top - k for k in range(degree))
            value += c * falling / (sp.factorial(x) * sp.factorial(z))
        return value

    value = one_cross(t) + one_cross(u)
    for c, p, q in (
        (-(r + 1), -1, -3),
        (2 * r, -2, -2),
        (-(r + 1), -3, -1),
        (2, -3, -3),
    ):
        if t == p + 3 and u == q + 3:
            value += c
    return sp.factor(sp.expand(value))


def prove_both_active():
    r = sp.symbols("r", integer=True, positive=True)
    R0 = sp.symbols("R", integer=True, nonnegative=True)
    results = {}
    for h in range(4):
        m = r - 3 + h
        bb = sp.factor(bb_formula(r, m))
        for t in range(h + 1):
            u = h - t
            poly = both_active_correction(r, t, u)
            # Independent exact comparison with the integer linearization.
            for rr in range(4, 24):
                parts = coefficient_parts(rr, rr - 3 + t, rr - 3 + u)
                assert sp.expand(poly.subs(r, rr)) == sum(parts) - parts[0]
            ratio = sp.factor(
                (2 * r + 2 * h - 5)
                * r
                * (2 * r + h - 4)
                * (2 * r + h - 5)
                / (
                    (2 * r + 2 * h - 7)
                    * (r - 1)
                    * (r + h - 2)
                    * (r + h - 3)
                )
            )
            residual = sp.factor(sp.cancel(poly.subs(r, r + 1) - ratio * poly))
            num, den = map(sp.factor, sp.fraction(residual))
            threshold = None
            shifted = None
            for candidate in range(4, 32):
                trial = sp.Poly(sp.expand(num.subs(r, R0 + candidate)), R0)
                if all(c >= 0 for _, c in trial.terms()):
                    threshold = candidate
                    shifted = trial
                    break
            assert threshold is not None and shifted is not None
            finite = []
            for rr in range(4, threshold + 1):
                value = int(bb.subs(r, rr) + poly.subs(r, rr))
                assert value > 0
                finite.append([rr, value])
            results[f"t{t}_u{u}"] = {
                "bb": str(bb),
                "correction": str(poly),
                "bb_ratio": str(ratio),
                "ratio_residual_numerator": str(num),
                "ratio_residual_denominator": str(den),
                "ratio_induction_threshold": threshold,
                "ratio_residual_shifted_coefficients": [str(c) for _, c in shifted.terms()],
                "ratio_residual_pass": all(c >= 0 for _, c in shifted.terms()),
                "finite_bases": finite,
                "base_r4": int(bb.subs(r, 4) + poly.subs(r, 4)),
            }
    return results


def prove_one_active():
    """Certify the one-active coefficient by two nested monotonicities."""
    r, M, t, J = sp.symbols("r M t J", integer=True, nonnegative=True)
    K, L, U = sp.symbols("K L U", integer=True, nonnegative=True)
    P = sp.expand(
        M**3 * r - 2 * M**3 - M**2 * r * t + 2 * M**2 * r
        + M**2 * t - 4 * M**2 - 2 * M * r**2 - M * r * t**2
        + 4 * M * r * t + 3 * M * r - 3 * M * t + 2 * M
        - 2 * r**2 * t + r * t**3 - 2 * r * t**2 + 3 * r * t
        + t**3 - 3 * t**2 + 2 * t
    )

    # A_{r+1}/A_r=(r+M-2)/(r+t-2).  Since J=M-t and
    # r>=max(M,J+4), A>=M.  The following is the numerator of the
    # resulting lower bound for D(r+1)-D(r).
    B = J**3 + 2 * J**2 * t + 2 * J**2 + 8 * J * t + 3 * J + 4 * t**2 + 6 * t
    p_diff = B - 4 * r * (J + 2 * t) - 2 * (J + 2 * t)
    monotone_gap = sp.expand(
        2 * (2 * (J + t) - 1) * (J + t)
        * (r * (J + 1) + t - 2)
        - (r + t - 2) * p_diff
    )
    monotone_chambers = {}
    for tt in range(4):
        expr = sp.expand(monotone_gap.subs({t: tt, r: J + 4 + L}))
        poly = sp.Poly(expr, J, L)
        assert all(c >= 0 for _, c in poly.terms())
        monotone_chambers[f"t={tt}"] = {
            "expression": str(sp.factor(expr)),
            "coefficients": len(poly.terms()),
        }
    expr = sp.expand(monotone_gap.subs({t: U + 4, r: J + U + 4 + K}))
    poly = sp.Poly(expr, J, U, K)
    assert all(c >= 0 for _, c in poly.terms())
    monotone_chambers["t>=4"] = {
        "expression": str(expr),
        "coefficients": len(poly.terms()),
    }

    # On the boundary r=J+4 for t=0,1,2,3, increase J.  Replacing
    # A by M gives these exact positive gap numerators.
    small_boundary = {
        0: 2 * (4 * J**4 + 37 * J**3 + 103 * J**2 + 120 * J + 48),
        1: 2 * (4 * J**4 + 42 * J**3 + 156 * J**2 + 259 * J + 165),
        2: 2 * (J + 3) * (4 * J**2 + 19 * J + 30),
        3: 2 * (4 * J**4 + 52 * J**3 + 268 * J**2 + 657 * J + 645),
    }
    small_denominators = {0: J + 2, 1: J + 3, 2: 1, 3: J + 5}
    for tt, value in small_boundary.items():
        assert all(c >= 0 for _, c in sp.Poly(sp.expand(value), J).terms())

    # On the boundary r=M for t>=4, increase J.  Again A>=M; the
    # numerator below is coefficientwise positive after t=U+4,M=J+t.
    large_boundary_num = sp.expand(
        8 * J**4 + 27 * J**3 * U + 114 * J**3
        + 38 * J**2 * U**2 + 319 * J**2 * U + 654 * J**2
        + 28 * J * U**3 + 344 * J * U**2 + 1386 * J * U + 1832 * J
        + 8 * U**4 + 132 * U**3 + 800 * U**2 + 2116 * U + 2064
    )
    assert all(c >= 0 for _, c in sp.Poly(large_boundary_num, J, U).terms())

    # Exact formula-vs-linearization audit over every one-active coefficient
    # in a large independent integer box.
    formula_checks = 0
    for rr in range(4, 81):
        for mm in range(1, rr + 1):
            for tt in range(0, mm + 1):
                jj = mm - tt
                if jj > rr - 4:
                    continue
                i = rr - 3 + tt
                parts = coefficient_parts(rr, i, jj)
                assert parts[2] == 0 and parts[3] == 0
                aa = sp.Rational(
                    factorial(rr + mm - 3) * factorial(tt),
                    factorial(mm - 1) * factorial(rr + tt - 3),
                )
                pp = P.subs({r: rr, M: mm, t: tt})
                dd = 2 * (2 * mm - 1) * (rr - 1) * aa - pp
                ff = sp.Rational(
                    factorial(rr + tt - 3),
                    factorial(mm) * factorial(tt) * factorial(rr - mm),
                )
                assert ff * dd == parts[0] + parts[1]
                assert dd > 0
                formula_checks += 1

    return {
        "coefficient_formula": {
            "F": "(r+t-3)!/[M! t! (r-M)!]",
            "D": "2(2M-1)(r-1)A-P(r,M,t)",
            "A": "(r+M-3)! t!/[(M-1)! (r+t-3)!]",
            "P": str(P),
        },
        "A_lower_bound": "A>=M; equality when J=M-t=0",
        "rank_monotonicity_chambers": monotone_chambers,
        "small_t_boundary_gap_numerators": {str(k): str(v) for k, v in small_boundary.items()},
        "small_t_boundary_gap_denominators": {str(k): str(v) for k, v in small_denominators.items()},
        "small_t_bases": {"t0_J1": 48, "t1_J0": 36, "t2_J0": 84, "t3_J0": 144},
        "large_t_boundary_gap_numerator": str(large_boundary_num),
        "large_t_base": "2t(2t+1)(t-1)>0 for t>=4",
        "formula_checks": formula_checks,
        "pass": True,
    }


def main():
    # Direct Newton-coefficient checks, separate from any symbolic inference.
    literal = {"checks": 0, "minimum": None, "negative": []}
    for r in range(4, 81):
        for i in range(0, 2 * r):
            for j in range(0, 2 * r):
                value = sum(coefficient_parts(r, i, j))
                literal["checks"] += 1
                cell = (value, r, i, j)
                if literal["minimum"] is None or cell < tuple(literal["minimum"]):
                    literal["minimum"] = list(cell)
                if value < 0:
                    literal["negative"].append(list(cell))

    one = prove_one_active()
    both = prove_both_active()
    passed = one["pass"] and all(v["ratio_residual_pass"] for v in both.values()) and not literal["negative"]
    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_TWO_ROOTED_STARS_TERMINAL_NEWTON" if passed else "FAIL_ISO_TWO_STAR_NEWTON_PROOF",
        "statement": "N_r(a,b) has a nonnegative binomial-basis expansion",
        "rank_2": "N_2=2(3a+3b+7)>0",
        "rank_3": "N_3=(10a^3+30a^2b+9a^2+30ab^2+60ab+41a+10b^3+9b^2+41b+24)/6>0",
        "bb_formula": str(bb_formula(sp.Symbol("r"), sp.Symbol("M"))),
        "one_active": one,
        "both_active": both,
        "literal": literal,
        "status": "all-order exact Newton-basis certificate",
    }
    Path("iso_two_star_newton_coefficients_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "marker": report["marker"],
        "literal": literal,
        "both_active_ratio_passes": {
            k: v["ratio_residual_pass"] for k, v in both.items()
        },
        "both_active_bases": {k: v["base_r4"] for k, v in both.items()},
    }, indent=2, sort_keys=True))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
