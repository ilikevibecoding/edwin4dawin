#!/usr/bin/env python3
"""Prove the ISO four-minor base for two disjoint rooted stars.

The generic rank expression separates into BB, BX, BY, and XY products of
three binomial rows.  Each active-row chamber is normalized by its lowest
binomial coefficient and shifted to a nonnegative orthant.  We then require
coefficientwise nonnegativity of the resulting exact numerator.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


r = sp.symbols("r", integer=True, positive=True)


def make_rows():
    B = {j: sp.Symbol(f"B{j:+d}") for j in range(-3, 2)}
    X = {j: sp.Symbol(f"X{j:+d}") for j in range(-3, 2)}
    Y = {j: sp.Symbol(f"Y{j:+d}") for j in range(-3, 2)}
    E = {j: B[j] + X[j] + Y[j] for j in B}
    U = {j: B[j] + X[j] for j in B}
    V = {j: B[j] + Y[j] for j in B}
    W = B
    expr = sp.expand(
        2 * r * E[0] * W[-2]
        - (r + 1) * E[1] * W[-3]
        + E[-1] * (2 * W[-3] - (r + 1) * W[-1])
        + U[0] * (-(r + 1) * V[-2] - W[-3])
        + U[-1] * (2 * r * V[-1] + 2 * W[-2])
        + U[-2] * (-(r + 1) * V[0] + 2 * V[-2] - W[-1])
        - V[0] * W[-3]
        + 2 * V[-1] * W[-2]
        - V[-2] * W[-1]
    )
    groups = {"BB": 0, "BX": 0, "BY": 0, "XY": 0, "other": 0}
    for term in sp.Add.make_args(expr):
        powers = term.as_powers_dict()
        letters = "".join(
            sorted(
                str(x)[0]
                for x, exponent in powers.items()
                if getattr(x, "is_Symbol", False) and str(x)[0] in "BXY"
                for _ in range(int(exponent))
            )
        )
        if letters in groups:
            groups[letters] += term
        else:
            groups["other"] += term
    assert groups["other"] == 0
    return B, X, Y, {k: sp.expand(v) for k, v in groups.items() if k != "other"}


def ratios(total, base_offset, offsets):
    """C(total,r+j)/C(total,r+base_offset), as an exact product."""
    out = {}
    for j in offsets:
        if j == base_offset:
            out[j] = sp.Integer(1)
        elif j > base_offset:
            value = sp.Integer(1)
            for q in range(base_offset + 1, j + 1):
                value *= (total - r - q + 1) / (r + q)
            out[j] = sp.factor(value)
        else:
            value = sp.Integer(1)
            for q in range(j + 1, base_offset + 1):
                value *= (r + q) / (total - r - q + 1)
            out[j] = sp.factor(value)
    return out


def positive_poly(expr, variables):
    together = sp.cancel(expr)
    num, den = map(sp.factor, sp.fraction(together))
    poly = sp.Poly(sp.expand(num), *variables)
    negatives = [(mon, int(coef)) for mon, coef in poly.terms() if coef < 0]
    return {
        "numerator": str(num),
        "denominator": str(den),
        "term_count": len(poly.terms()),
        "negative_coefficients": negatives,
        "pass": not negatives,
    }


def direct_boundary(rank):
    a, b = sp.symbols("a b", integer=True, nonnegative=True)
    s = a + b

    def coeffs(k):
        delta = 1 if k == 2 else 0
        E = sp.binomial(s, k) + sp.binomial(a, k - 1) + sp.binomial(b, k - 1) + delta
        U = sp.binomial(s, k) + sp.binomial(a, k - 1)
        V = sp.binomial(s, k) + sp.binomial(b, k - 1)
        W = sp.binomial(s, k)
        return E, U, V, W

    rows = {j: coeffs(rank + j) for j in range(-3, 2)}
    E = {j: rows[j][0] for j in rows}
    U = {j: rows[j][1] for j in rows}
    V = {j: rows[j][2] for j in rows}
    W = {j: rows[j][3] for j in rows}
    value = sp.expand(
        2 * rank * E[0] * W[-2]
        - (rank + 1) * E[1] * W[-3]
        + E[-1] * (2 * W[-3] - (rank + 1) * W[-1])
        + U[0] * (-(rank + 1) * V[-2] - W[-3])
        + U[-1] * (2 * rank * V[-1] + 2 * W[-2])
        + U[-2] * (-(rank + 1) * V[0] + 2 * V[-2] - W[-1])
        - V[0] * W[-3]
        + 2 * V[-1] * W[-2]
        - V[-2] * W[-1]
    )
    value = sp.factor(sp.expand_func(value))
    poly = sp.Poly(sp.expand(value), a, b)
    negatives = [(mon, int(coef)) for mon, coef in poly.terms() if coef < 0]
    return {
        "rank": rank,
        "expression": str(value),
        "terms": len(poly.terms()),
        "negative_coefficients": negatives,
        "pass": not negatives,
    }


def main() -> None:
    Bsym, Xsym, Ysym, groups = make_rows()
    s, a, b = sp.symbols("s a b", integer=True, nonnegative=True)
    # B_j=C(s,r+j), base B_-3=C(s,r-3).
    Br = ratios(s, -3, range(-3, 2))
    # X_j=C(a,r+j-1), base X_-2=C(a,r-3); similarly Y.
    Xr = ratios(a, -2, range(-3, 2))
    Yr = ratios(b, -2, range(-3, 2))
    normalized = {
        name: sp.expand(expr.subs({**{Bsym[j]: Br[j] for j in Bsym},
                                    **{Xsym[j]: Xr[j] for j in Xsym},
                                    **{Ysym[j]: Yr[j] for j in Ysym}}))
        for name, expr in groups.items()
    }

    R, S, A, C = sp.symbols("R S A C", integer=True, nonnegative=True)
    audits = {}
    # BB active when s=r-3+S.
    audits["BB"] = positive_poly(normalized["BB"].subs({r: R + 4, s: R + 1 + S}), (R, S))
    # BX active when a=r-3+A and b=C, hence s=r-3+A+C.
    audits["BX"] = positive_poly(
        normalized["BX"].subs({r: R + 4, a: R + 1 + A, b: C, s: R + 1 + A + C}),
        (R, A, C),
    )
    audits["BY"] = positive_poly(
        normalized["BY"].subs({r: R + 4, b: R + 1 + A, a: C, s: R + 1 + A + C}),
        (R, A, C),
    )
    # XY active when both leaf counts are at least r-3.
    audits["XY"] = positive_poly(
        normalized["XY"].subs(
            {r: R + 4, a: R + 1 + A, b: R + 1 + C, s: 2 * R + 2 + A + C}
        ),
        (R, A, C),
    )

    boundaries = [direct_boundary(2), direct_boundary(3)]
    passed = all(x["pass"] for x in audits.values()) and all(x["pass"] for x in boundaries)
    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_DISJOINT_ROOTED_STARS_BASE" if passed else "FAIL_ISO_DISJOINT_ROOTED_STARS_GROUPING",
        "statement": "N_r(K1,a disjoint-union K1,b; marked centers)>=0 for all a,b>=0 and r>=2",
        "generic_group_expressions": {k: str(v) for k, v in groups.items()},
        "normalized_audits": audits,
        "rank_2_3": boundaries,
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_disjoint_rooted_stars_base_exact_root_20260829.json").write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "groups": {k: {"pass": v["pass"], "terms": v["term_count"], "negative_count": len(v["negative_coefficients"])} for k, v in audits.items()},
        "boundaries": boundaries,
    }, indent=2, sort_keys=True))
    print(f"REPORT_LOGICAL_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print(report["marker"])
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
