#!/usr/bin/env python3
"""Independent exact audit under construction for forest m=1, target j=3.

The target scope is the all-order N>=31 branch cover plus the exceptional
S=N-d in {2,3,4} strips.  No producer formula object is imported.
"""

from __future__ import annotations

import sympy as sy


def choose(value, rank):
    answer = sy.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sy.cancel(answer / sy.factorial(rank))


def build_branches():
    N, h, d, R, W, y = sy.symbols(
        "N h d R W y", real=True, nonnegative=True
    )
    m = N - h
    p0 = sy.expand(
        choose(N + 1, 3) - m * (N - 1) + W
        + choose(N + 1, 2) - m
    )
    p1 = sy.expand(choose(N + 1, 2) - m + N + 1)
    R1 = sy.expand(m * N - 2 * W)
    a = sy.expand(choose(N, 2) - (m - d))
    z2 = sy.expand(
        (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    )
    S = N - d
    h2 = sy.expand(choose(S, 2) - (m - d - R))
    c0 = sy.expand(a + z2 + h2)
    b = sy.expand(
        choose(N, 3) - (m - d) * (N - 2) + W - choose(d, 2) - R
    )
    A1 = sy.expand(p0 * a + p1 * c0 + p1 * a - a * R1)
    ebar = 1 + y + 3 * z2 / (2 * a)
    Q0 = 4 * c0 - 3 * ebar * (p0 + a)
    Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    gap = sy.expand(2 * p1 * c0 - 3 * a * R1)
    U1 = p0 / b

    U0_coupled = (N - 3 + 2 * y) / 4 + 3 * y / (N - 3)
    coarse_f4 = sy.expand(
        d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2)
        - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R
        + choose(d, 4)
    )
    U0_tangent = 1 + y + (h2 + coarse_f4) / b

    adverse_base = sy.expand(3 * p1 * (2 * p0 + a + p1))
    coupled_y_slope = sy.cancel(
        2 * A1 * (N + 3) / (N - 3) - adverse_base
    )
    tangent_y_slope = sy.expand(4 * A1 - adverse_base)
    tangent_adverse_slope = sy.expand(-tangent_y_slope)
    assert sy.factor(
        tangent_y_slope - coupled_y_slope
        - 2 * A1 * (N - 9) / (N - 3)
    ) == 0

    def retained(U0):
        return 4 * (
            sy.Rational(3, 2) * p0 * R1
            + p0 * U1 * gap / (2 * p1)
            + A1 * (U0 + U1)
        ) + remainder

    # All factors are strictly positive on a supported N>=31 cell:
    # a>0, p1>0, b=i3(F)>0, N-3>0.  Thus these two aligned polynomial
    # branches have exactly the signs of their retained lowers.
    common_scale = sy.expand(2 * a * p1 * b * (N - 3))
    coupled = sy.cancel(retained(U0_coupled) * common_scale)
    tangent = sy.cancel(retained(U0_tangent) * common_scale)
    coupled_num, coupled_den = sy.together(coupled).as_numer_denom()
    tangent_num, tangent_den = sy.together(tangent).as_numer_denom()
    assert coupled_den.is_number and coupled_den > 0, sy.factor(coupled_den)
    assert tangent_den.is_number and tangent_den > 0, sy.factor(tangent_den)

    eH = sy.expand(N - h - d - R)
    U3 = sy.expand(choose(S, 3) - eH * (S - 2) + choose(eH, 2))
    Bcap = sy.expand(
        d * choose(S - 1, 2) - R * (S - 2)
        + choose(d, 2) * S - (d - 1) * R + choose(d, 3)
    )
    A = sy.expand(choose(d, 2) + R)
    L = sy.expand(N - 2 * h - d - R)
    upper = sy.expand(A + choose(R + 1, 2) + choose(L + 1, 2))
    return {
        "symbols": (N, h, d, R, W, y),
        "rows": {
            "p0": p0, "p1": p1, "R1": R1, "a": a, "z2": z2,
            "h2": h2, "c0": c0, "b": b, "A1": A1,
            "gap": gap, "coarse_f4": coarse_f4,
        },
        "coupled": sy.expand(coupled_num),
        "tangent": sy.expand(tangent_num),
        "branch_numeric_denominators": (coupled_den, tangent_den),
        "common_scale": common_scale,
        "U3": U3,
        "Bcap": Bcap,
        "Wlow": A,
        "Whigh": upper,
        "L": L,
        "coupled_y_slope": coupled_y_slope,
        "tangent_y_slope": tangent_y_slope,
        "tangent_adverse_slope": tangent_adverse_slope,
    }


def tail_substitution(model):
    N, h, d, R, W, y = model["symbols"]
    E, u, v, r, w = sy.symbols("E u v r w", nonnegative=True)
    span = 28 + E
    H = span * u / 2
    Q = span * (1 - u)
    substitution = {
        N: 31 + E,
        h: 1 + H,
        d: 1 + Q * v,
        R: Q * (1 - v) * r,
    }
    Lvalue = Q * (1 - v) * (1 - r)
    Avalue = sy.expand(model["Wlow"].subs(substitution, simultaneous=True))
    Uvalue = sy.expand(
        (Avalue + choose(substitution[R] + 1, 2) + choose(Lvalue + 1, 2))
    )
    substitution[W] = Avalue + (Uvalue - Avalue) * w
    return (E, u, v, r, w, y), substitution


def main():
    model = build_branches()
    N, h, d, R, W, y = model["symbols"]
    print("common_degrees", {
        "coupled_W": sy.Poly(model["coupled"], W).degree(),
        "tangent_W": sy.Poly(model["tangent"], W).degree(),
        "coupled_y": sy.Poly(model["coupled"], y).degree(),
        "tangent_y": sy.Poly(model["tangent"], y).degree(),
    }, flush=True)

    # The tangent branch has the larger y slope.  It suffices to prove its
    # adverse-slope polynomial G=-dL_t/dy is nonnegative.  G is affine and
    # increasing in W, so its minimum is at W=A=C(d,2)+R.
    G = model["tangent_adverse_slope"]
    W_derivative = sy.factor(sy.diff(G, W))
    p1 = model["rows"]["p1"]
    a = model["rows"]["a"]
    assert sy.factor(W_derivative - (14 * p1 - 12 * a)) == 0
    H, D, L = sy.symbols("H D L", nonnegative=True)
    structural = {
        h: 1 + H,
        d: 1 + D,
        N: 2 * (1 + H) + (1 + D) + R + L,
    }
    endpoint = sy.expand(
        G.subs(W, model["Wlow"]).subs(structural, simultaneous=True)
    )
    endpoint_poly = sy.Poly(endpoint, H, D, R, L)
    print("slope_W_derivative", W_derivative, flush=True)
    print("slope_endpoint_terms", len(endpoint_poly.terms()),
          "degrees", endpoint_poly.degree_list(),
          "minimum", min(endpoint_poly.coeffs()), flush=True)
    negatives = [term for term in endpoint_poly.terms() if term[1] < 0]
    print("slope_endpoint_negatives", len(negatives),
          negatives[:10], flush=True)


if __name__ == "__main__":
    main()
