#!/usr/bin/env python3
"""Exact symbolic audit of the marked-support collision increment on two stars.

For B(a+1,b) obtained from B(a,b) by adding a leaf at the first marked
centre, this derives N_r(a+1,b)-N_r(a,b), separates the binomial row
products, and checks simple normalized chambers.  This is exploratory: a
failed coefficientwise chamber is not a counterexample to the inequality.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


r = sp.symbols("r", integer=True, positive=True)
OFF = range(-4, 2)


def row(name):
    return {j: sp.Symbol(f"{name}{j:+d}") for j in OFF}


def n_form(rank, e, u, v, w):
    return sp.expand(
        2 * rank * e[0] * w[-2]
        - (rank + 1) * e[1] * w[-3]
        + e[-1] * (2 * w[-3] - (rank + 1) * w[-1])
        + u[0] * (-(rank + 1) * v[-2] - w[-3])
        + u[-1] * (2 * rank * v[-1] + 2 * w[-2])
        + u[-2] * (-(rank + 1) * v[0] + 2 * v[-2] - w[-1])
        - v[0] * w[-3]
        + 2 * v[-1] * w[-2]
        - v[-2] * w[-1]
    )


def shifted_sum(a, b):
    return {j: a[j] + b[j - 1] for j in OFF if j - 1 in b}


def ratios(total, base, offsets):
    out = {}
    for j in offsets:
        value = sp.Integer(1)
        if j > base:
            for q in range(base + 1, j + 1):
                value *= (total - r - q + 1) / (r + q)
        elif j < base:
            for q in range(j + 1, base + 1):
                value *= (r + q) / (total - r - q + 1)
        out[j] = sp.factor(value)
    return out


def audit(expr, variables):
    value = sp.cancel(expr)
    num, den = map(sp.factor, sp.fraction(value))
    poly = sp.Poly(sp.expand(num), *variables)
    neg = [(m, str(c)) for m, c in poly.terms() if c < 0]
    return {
        "numerator": str(num),
        "denominator": str(den),
        "terms": len(poly.terms()),
        "negative_count": len(neg),
        "negative_coefficients": neg,
        "pass": not neg,
    }


def main():
    B, X, Y = row("B"), row("X"), row("Y")
    E = {j: B[j] + X[j] + Y[j] for j in OFF}
    U = {j: B[j] + X[j] for j in OFF}
    V = {j: B[j] + Y[j] for j in OFF}
    W = B

    # Add one leaf at marked u: E'=E+xU, U'=(1+x)U,
    # V'=V+xW, W'=(1+x)W.
    Ep = shifted_sum(E, U)
    Up = shifted_sum(U, U)
    Vp = shifted_sum(V, W)
    Wp = shifted_sum(W, W)
    inc = sp.expand(n_form(r, Ep, Up, Vp, Wp) - n_form(r, E, U, V, W))

    groups = {}
    for term in sp.Add.make_args(inc):
        letters = []
        for atom, power in term.as_powers_dict().items():
            if getattr(atom, "is_Symbol", False) and str(atom)[0] in "BXY":
                letters.extend(str(atom)[0] for _ in range(int(power)))
        key = "".join(sorted(letters))
        groups[key] = sp.expand(groups.get(key, 0) + term)

    s, a, b = sp.symbols("s a b", integer=True, nonnegative=True)
    # Relevant lowest rows are B_-4=C(s,r-4), X_-3=C(a,r-4),
    # and Y_-2=C(b,r-3).  Normalize each product separately.
    Br = ratios(s, -4, OFF)
    Xr = ratios(a, -3, OFF)
    Yr = ratios(b, -2, OFF)
    normalized = {
        key: sp.expand(value.subs({
            **{B[j]: Br[j] for j in OFF},
            **{X[j]: Xr[j] for j in OFF},
            **{Y[j]: Yr[j] for j in OFF},
        }))
        for key, value in groups.items()
    }

    R, S, A, C = sp.symbols("R S A C", integer=True, nonnegative=True)
    # r=R+5 makes every chosen base order nonnegative.  The surplus shifts
    # match the corresponding lowest binomial row.
    shifts = {
        "BB": {r: R + 5, s: R + 1 + S},
        "BX": {r: R + 5, a: R + 1 + A, b: C, s: R + 1 + A + C},
        "BY": {r: R + 5, b: R + 2 + A, a: C, s: R + 2 + A + C},
        "XX": {r: R + 5, a: R + 1 + A, b: C, s: R + 1 + A + C},
        "XY": {r: R + 5, a: R + 1 + A, b: R + 2 + C, s: 2 * R + 3 + A + C},
    }
    audits = {
        key: audit(value.subs(shifts[key]), (R, S) if key == "BB" else (R, A, C))
        for key, value in normalized.items()
        if key in shifts
    }
    report = {
        "marker": "AUDIT_EXACT_ISO_DISJOINT_STAR_MARKED_COLLISION_GROUPS",
        "increment_term_count": len(sp.Add.make_args(inc)),
        "groups": {key: str(value) for key, value in groups.items()},
        "audits": audits,
    }
    Path("iso_disjoint_star_collision_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "marker": report["marker"],
        "increment_terms": report["increment_term_count"],
        "groups": {k: {"pass": v["pass"], "terms": v["terms"], "negative_count": v["negative_count"]} for k, v in audits.items()},
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
