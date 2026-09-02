#!/usr/bin/env python3
"""Exact all-order ISO four-minor base for two disjoint rooted stars.

For B=K_(1,a) disjoint_union K_(1,b), mark the two star centres u,v.
This proves that the exact nonsibling four-minor remainder N_r(B;u,v)
is nonnegative for every a,b>=0 and r>=2.  The proof uses the bivariate
Newton basis C(a,i)C(b,j); every coefficient is proved nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_disjoint_rooted_stars_newton_exact_agent_20260829.json"
r = sp.symbols("r", integer=True, positive=True)
h, ii = sp.symbols("h ii", integer=True, nonnegative=True)
OFF = range(-3, 2)


def row(name: str) -> dict[int, sp.Symbol]:
    return {j: sp.Symbol(f"{name}{j:+d}") for j in OFF}


def abstract_groups():
    B, X, Y = row("B"), row("X"), row("Y")
    E = {j: B[j] + X[j] + Y[j] for j in OFF}
    U = {j: B[j] + X[j] for j in OFF}
    V = {j: B[j] + Y[j] for j in OFF}
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
    groups = {"BB": 0, "BX": 0, "BY": 0, "XY": 0}
    for term in sp.Add.make_args(expr):
        letters = []
        for atom, power in term.as_powers_dict().items():
            if getattr(atom, "is_Symbol", False) and str(atom)[0] in "BXY":
                letters.extend(str(atom)[0] for _ in range(int(power)))
        key = "".join(sorted(letters))
        assert key in groups
        groups[key] += term
    return B, X, Y, {key: sp.expand(value) for key, value in groups.items()}


def offset(symbol: sp.Symbol) -> int:
    return int(str(symbol)[1:])


def L(p, q, total):
    """Newton coefficient of C(s,total) in C(s,p)C(s,q)."""
    return sp.factorial(total) / (
        sp.factorial(p + q - total)
        * sp.factorial(total - p)
        * sp.factorial(total - q)
    )


def derive_newton_kernels(groups):
    f_raw = 0
    for term in sp.Add.make_args(groups["BB"]):
        powers = term.as_powers_dict()
        symbols = [z for z in term.free_symbols if str(z).startswith("B")]
        product = sp.prod(z ** powers[z] for z in symbols)
        coefficient = sp.cancel(term / product)
        offsets = []
        for z in symbols:
            offsets.extend([offset(z)] * int(powers[z]))
        assert len(offsets) == 2
        f_raw += coefficient * L(r + offsets[0], r + offsets[1], h)

    def mixed_L(p, q, total, a_index):
        # C(a+b,p)C(a,q): choose total-a_index vertices from b first.
        return sp.factorial(a_index) / (
            sp.factorial(p + q - total)
            * sp.factorial(total - p)
            * sp.factorial(a_index - q)
        )

    g_raw = 0
    for term in sp.Add.make_args(groups["BX"]):
        bs = [z for z in term.free_symbols if str(z).startswith("B")]
        xs = [z for z in term.free_symbols if str(z).startswith("X")]
        assert len(bs) == len(xs) == 1
        coefficient = sp.cancel(term / (bs[0] * xs[0]))
        p = r + offset(bs[0])
        q = r + offset(xs[0]) - 1
        g_raw += coefficient * mixed_L(p, q, h, ii)

    f_target = (
        2
        * (r - 1)
        * (2 * h - 2 * r + 5)
        * sp.factorial(h)
        / (
            sp.factorial(2 * r - 3 - h)
            * sp.factorial(h - r + 2)
            * sp.factorial(h - r + 3)
        )
    )
    P = (
        h**3 * r
        - 2 * h**3
        - h**2 * ii * r
        + h**2 * ii
        - 2 * h**2 * r**2
        + 13 * h**2 * r
        - 19 * h**2
        - h * ii**2 * r
        + 4 * h * ii * r**2
        - 10 * h * ii * r
        + 3 * h * ii
        - 14 * h * r**2
        + 62 * h * r
        - 67 * h
        + ii**3 * r
        + ii**3
        - 2 * ii**2 * r**2
        + ii**2 * r
        + 6 * ii**2
        + 2 * ii * r**2
        - 12 * ii * r
        + 11 * ii
        + 8 * r**3
        - 52 * r**2
        + 110 * r
        - 78
    )
    g_target = -P * sp.factorial(ii) / (
        sp.factorial(2 * r - 3 - h)
        * sp.factorial(h - r + 3)
        * sp.factorial(ii - r + 3)
    )
    assert sp.factor(sp.combsimp(f_raw - f_target)) == 0
    assert sp.factor(sp.combsimp(g_raw - g_target)) == 0
    return f_target, g_target, P


def nonnegative_poly(expr, variables):
    poly = sp.Poly(sp.expand(expr), *variables)
    negative = [(monomial, str(coefficient)) for monomial, coefficient in poly.terms() if coefficient < 0]
    assert not negative
    return {"terms": len(poly.terms()), "minimum_coefficient": str(min(c for _, c in poly.terms()))}


def prove_one_active(f, g, P):
    x, j = sp.symbols("x j", integer=True, nonnegative=True)
    i_shift = r - 3 + x
    h_shift = i_shift + j
    P_shift = sp.factor(sp.expand(P.subs({h: h_shift, ii: i_shift})))
    P_expected = (
        j**3 * r
        - 2 * j**3
        + 2 * j**2 * r * x
        + 2 * j**2 * r
        - 5 * j**2 * x
        - 4 * j**2
        - 2 * j * r**2
        + 8 * j * r * x
        + 3 * j * r
        - 4 * j * x**2
        - 11 * j * x
        + 2 * j
        - 4 * r**2 * x
        + 4 * r * x**2
        + 6 * r * x
        - 10 * x**2
        + 4 * x
    )
    assert sp.expand(P_shift - P_expected) == 0

    # Relative to the common positive prefactor, f+g has bracket
    # 2(r-1)(2h-2r+5)R-P, where
    # R=h!/i! * x!/(h-r+2)!.
    prefactor = sp.factorial(i_shift) / (
        sp.factorial(2 * r - 3 - h_shift)
        * sp.factorial(h_shift - r + 3)
        * sp.factorial(x)
    )
    R_exact = (
        sp.factorial(h_shift)
        * sp.factorial(x)
        / (sp.factorial(i_shift) * sp.factorial(h_shift - r + 2))
    )
    bracket = 2 * (r - 1) * (2 * h_shift - 2 * r + 5) * R_exact - P_shift
    assert sp.factor(sp.combsimp((f + g).subs({h: h_shift, ii: i_shift}) - prefactor * bracket)) == 0

    # j=0: support forces x>=1 and R=x.
    gap_j0 = sp.factor(
        2 * (r - 1) * (2 * h_shift - 2 * r + 5) * x - P_shift
    ).subs(j, 0)
    target_j0 = 2 * x * (2 * r**2 - 4 * r + 3 * x - 1)
    assert sp.expand(gap_j0 - target_j0) == 0

    # j=1: the product for R is empty, so R=h.  Here r>=5.
    gap_j1 = sp.factor(
        (2 * (r - 1) * (2 * h_shift - 2 * r + 5) * h_shift - P_shift).subs(j, 1)
    )
    target_j1 = 2 * (
        5 * x**2 + (4 * r - 9) * (r - 1) * x + 2 * (r - 1) * (r - 2)
    )
    assert sp.expand(gap_j1 - target_j1) == 0

    # For j>=2,
    # R=h prod_{q=1}^{j-1}(1+(r-3)/(x+q))
    #  >= h(1+(r-3)(j-1)/(x+j-1)).
    R_lower = h_shift * (1 + (r - 3) * (j - 1) / (x + j - 1))
    averaged_gap = sp.factor(
        sp.together(2 * (r - 1) * (2 * h_shift - 2 * r + 5) * R_lower - P_shift)
    )
    numerator, denominator = map(sp.factor, sp.fraction(averaged_gap))
    assert denominator == j + x - 1

    J, L = sp.symbols("J L", integer=True, nonnegative=True)
    small_x = {}
    # Put j=J+2 and r=j+4+L.  The remaining support condition is x<=L+4.
    for value in range(5):
        cone = sp.expand(numerator.subs({j: J + 2, r: J + 6 + L, x: value}))
        small_x[str(value)] = nonnegative_poly(cone, (J, L))

    # If x>=5, write x=X+5 and r=x+j+M; this is exactly x+j<=r.
    X, M = sp.symbols("X M", integer=True, nonnegative=True)
    large_cone = sp.expand(
        numerator.subs({j: J + 2, x: X + 5, r: J + X + 7 + M})
    )
    large_x = nonnegative_poly(large_cone, (J, X, M))
    return {
        "j0_gap": str(target_j0),
        "j1_gap": str(target_j1),
        "averaged_denominator": str(denominator),
        "small_x_cones": small_x,
        "large_x_cone": large_x,
    }


def prove_both_active(f, g):
    central = sp.binomial(2 * r, r)
    P00 = 64*r**7 - 992*r**6 + 5968*r**5 - 18056*r**4 + 28936*r**3 - 23216*r**2 + 7728*r - 720
    P01 = 16*r**5 - 144*r**4 + 428*r**3 - 596*r**2 + 400*r - 96
    P02 = 2*r**4 - 13*r**3 + 22*r**2 - 12*r + 2
    P03 = r**4 - 5*r**3 - r**2 + 17*r + 12
    targets = {
        (0, 0): (central * r*(r-3)*(r-2)*(r-1)**2*(2*r-7) - P00) / (24*(2*r-5)*(2*r-3)*(2*r-1)),
        (0, 1): (r-1) * (central * r*(r-1)*(2*r-5) - P01) / (8*(2*r-3)*(2*r-1)),
        (0, 2): (r-1) * (central*r - P02) / (2*(2*r-1)),
        (0, 3): (3*central - P03) / 6,
        (1, 1): r*(r-1) * (central - (8*r**2-36*r+16)) / (2*(2*r-1)),
        (1, 2): (central - (r**3-2*r**2-3*r)) / 2,
    }
    xy_correction = {(0, 0): 2, (0, 2): -(r + 1), (1, 1): 2 * r, (2, 0): -(r + 1)}
    exact = {}
    for x in range(4):
        for y in range(x, 4 - x):
            hh = 2 * r - 6 + x + y
            left = sp.factor(
                sp.combsimp(
                    f.subs(h, hh)
                    + g.subs({h: hh, ii: r - 3 + x})
                    + g.subs({h: hh, ii: r - 3 + y})
                    + xy_correction.get((x, y), 0)
                )
            )
            target = targets[(x, y)]
            assert sp.factor(sp.combsimp(left - target)) == 0
            exact[f"{x},{y}"] = str(target)

    # Vandermonde gives C(2r,r)=sum_k C(r,k)^2 >= C(r,3)^2.
    k = sp.symbols("k", integer=True, nonnegative=True)
    assert sp.simplify(sp.summation(sp.binomial(r, k) ** 2, (k, 0, r))) == central
    lower_central = (r * (r - 1) * (r - 2) / 6) ** 2
    lower_numerators = {
        "0,0": lower_central*r*(r-3)*(r-2)*(r-1)**2*(2*r-7) - P00,
        "0,1": lower_central*r*(r-1)*(2*r-5) - P01,
        "0,2": lower_central*r - P02,
        "0,3": 3*lower_central - P03,
        "1,1": lower_central - (8*r**2-36*r+16),
        "1,2": lower_central - (r**3-2*r**2-3*r),
    }
    R = sp.symbols("R", integer=True, nonnegative=True)
    cones = {}
    for key, value in lower_numerators.items():
        cutoff = 5 if key == "1,2" else 4
        cone = sp.together(value.subs(r, R + cutoff))
        numerator = sp.fraction(cone)[0]
        cones[key] = {"cutoff": cutoff, **nonnegative_poly(numerator, (R,))}
    assert sp.simplify(targets[(1, 2)].subs(r, 4)) == 25
    return {"exact_cases": exact, "vandermonde_lower_cones": cones, "rank4_exception_1,2": 25}


def direct_symbolic_boundaries():
    a, b = sp.symbols("a b", integer=True, nonnegative=True)

    def c(n, k):
        return sp.binomial(n, k)

    def rows(rank, off):
        q = rank + off
        E = c(a+b, q) + c(a, q-1) + c(b, q-1) + (1 if q == 2 else 0)
        U = c(a+b, q) + c(a, q-1)
        V = c(a+b, q) + c(b, q-1)
        W = c(a+b, q)
        return E, U, V, W

    def value(rank):
        z = {off: rows(rank, off) for off in OFF}
        E = {q: z[q][0] for q in z}; U = {q: z[q][1] for q in z}
        V = {q: z[q][2] for q in z}; W = {q: z[q][3] for q in z}
        return sp.factor(sp.expand_func(sp.expand(
            2*rank*E[0]*W[-2]-(rank+1)*E[1]*W[-3]
            +E[-1]*(2*W[-3]-(rank+1)*W[-1])
            +U[0]*(-(rank+1)*V[-2]-W[-3])
            +U[-1]*(2*rank*V[-1]+2*W[-2])
            +U[-2]*(-(rank+1)*V[0]+2*V[-2]-W[-1])
            -V[0]*W[-3]+2*V[-1]*W[-2]-V[-2]*W[-1]
        )))

    rank2 = 2 * (3*a + 3*b + 7)
    rank3 = (
        10*a**3 + 30*a**2*b + 9*a**2 + 30*a*b**2 + 60*a*b + 41*a
        + 10*b**3 + 9*b**2 + 41*b + 24
    ) / 6
    assert sp.expand(value(2) - rank2) == 0
    assert sp.expand(value(3) - rank3) == 0
    return {"rank2": str(rank2), "rank3": str(rank3)}


def numeric_N(a: int, b: int, rank: int) -> int:
    C = lambda n, q: comb(n, q) if 0 <= q <= n else 0
    z = {}
    for off in OFF:
        q = rank + off
        z[off] = (
            C(a+b, q)+C(a, q-1)+C(b, q-1)+(1 if q == 2 else 0),
            C(a+b, q)+C(a, q-1),
            C(a+b, q)+C(b, q-1),
            C(a+b, q),
        )
    E={q:z[q][0] for q in z}; U={q:z[q][1] for q in z}; V={q:z[q][2] for q in z}; W={q:z[q][3] for q in z}
    return (
        2*rank*E[0]*W[-2]-(rank+1)*E[1]*W[-3]+E[-1]*(2*W[-3]-(rank+1)*W[-1])
        +U[0]*(-(rank+1)*V[-2]-W[-3])+U[-1]*(2*rank*V[-1]+2*W[-2])
        +U[-2]*(-(rank+1)*V[0]+2*V[-2]-W[-1])-V[0]*W[-3]
        +2*V[-1]*W[-2]-V[-2]*W[-1]
    )


def literal_newton_replay():
    stream = hashlib.sha256(); cells = 0; minimum = None; supports = {}
    for rank in range(2, 19):
        n = 2 * rank
        values = [[numeric_N(a, b, rank) for b in range(n+1)] for a in range(n+1)]
        # First Newton-transform a, then b.
        by_a = [[0]*(n+1) for _ in range(n+1)]
        for b in range(n+1):
            seq = [values[a][b] for a in range(n+1)]
            for i in range(n+1):
                by_a[i][b] = seq[0]
                seq = [seq[q+1]-seq[q] for q in range(len(seq)-1)]
        coeffs = {}
        for i in range(n+1):
            seq = by_a[i][:]
            for j in range(n+1):
                value = seq[0]
                if value:
                    coeffs[i, j] = value
                    assert value > 0
                cells += 1
                stream.update(f"{rank},{i},{j},{value};".encode())
                if minimum is None or value < minimum["value"]:
                    minimum = {"value": value, "rank": rank, "i": i, "j": j}
                seq = [seq[q+1]-seq[q] for q in range(len(seq)-1)]
        if rank >= 4:
            assert min(i+j for i,j in coeffs) == rank-2
            assert max(i+j for i,j in coeffs) == 2*rank-3
        supports[str(rank)] = len(coeffs)
    return {"cells": cells, "nonzero_support_counts": supports, "minimum": minimum, "stream_sha256": stream.hexdigest().upper()}


def main():
    B, X, Y, groups = abstract_groups()
    f, g, P = derive_newton_kernels(groups)
    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_DISJOINT_ROOTED_STARS_NEWTON_BASE",
        "statement": "N_r(K_(1,a) disjoint_union K_(1,b); marked centres)>=0 for all a,b>=0,r>=2.",
        "boundary_ranks": direct_symbolic_boundaries(),
        "generic_newton_kernel": {"f_h": str(f), "g_hi": str(g), "P": str(P)},
        "one_active": prove_one_active(f, g, P),
        "both_active": prove_both_active(f, g),
        "literal_newton_replay": literal_newton_replay(),
        "scope_warning": "This closes the disconnected two-root terminal base only; the arbitrary-forest third-leaf recurrence remains open.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({"marker": report["marker"], "one_active": report["one_active"], "both_active_cones": report["both_active"]["vandermonde_lower_cones"], "literal": report["literal_newton_replay"]}, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print(report["marker"])


if __name__ == "__main__":
    main()
