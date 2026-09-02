#!/usr/bin/env python3
"""Derive coefficient cones for the exact d=1, j=4 low-block scalar.

This remains a derivation script until every domain cone is covered with
nonnegative coefficients and a fail-closed replay is frozen separately.
"""

from __future__ import annotations

import hashlib

import sympy as sp


def C(n, k: int):
    return sp.prod(n - i for i in range(k)) / sp.factorial(k) if k >= 0 else 0


def linear_q3_symbolic(S, R, T, Y, long3):
    edges = T
    wedges = T - Y
    f3 = C(S, 3) - edges * (S - 2) + wedges
    matchings = C(edges, 2) - wedges
    connected4 = T - Y - long3
    z3 = (
        edges * C(S - 2, 2)
        - 2 * (wedges * (S - 3) + matchings)
        + 3 * connected4
    )
    return sp.together(z3 / (3 * f3))


def linear_q2_symbolic(T, Y, long2):
    edges = T - Y
    wedges = T - Y - long2
    f2 = C(T, 2) - edges
    z2 = edges * (T - 2) - 2 * wedges
    return sp.together(z2 / (2 * f2))


def scalar_expressions(
    R,
    T,
    Y,
    *,
    long3,
    long2,
    h_d4_boundary: bool = False,
    kmin4_boundary: bool = False,
):
    S = sp.expand(R + T)
    a = S * (S - 1) / 2
    P = (3 * R**2 - 3 * R + S**3 + 5 * S) / 6
    c0 = -R**2 + 4 * R + 2 * S**2 - 5 * S
    R0 = (
        R**3
        - 2 * R**2 * S
        + 2 * R**2
        + 2 * R * S
        + 6 * R * Y
        - 9 * R
        + S**3
        - 4 * S**2
        + 9 * S
        - 6 * Y
    ) / 2
    A0 = sp.expand(P * c0 - a * R0)
    lead = 5 * A0
    qH = linear_q3_symbolic(S, R, T, Y, long3)
    BH = sp.together(
        10 * A0
        + 5 * P * (c0 + R0)
        - 6 * P * (P + a)
        - 12 * P * (P + a) * qH
    )
    qK = linear_q2_symbolic(T, Y, long2)
    included = (3 * qK + R) / 4
    BK = sp.together(
        5 * A0
        + 5 * P * (c0 + R0)
        - 3 * P * (P + a)
        - 12 * P * (P + a) * included
    )

    p3, p4, p5 = C(S - 2, 3), C(S - 3, 4), C(S - 4, 5)
    d3 = R * S - 3 * R - S - Y + 4
    d4 = (
        R**2
        + R * S**2
        - 9 * R * S
        + 17 * R
        - S**2
        - 2 * S * Y
        + 11 * S
        + 10 * Y
        - 28
    ) / 2
    if h_d4_boundary:
        # P_2 has no x^4 term.  The polynomial continuation
        # C(3-4,4)=C(-1,4)=1 creates exactly one spurious unit at T=Y.
        d4 -= 1
    sigma = sp.together(C(S - 6, 3) / C(S - 5, 2))
    H = sp.together(
        lead * (p3 + p5)
        + BH * p4
        + lead * d3
        + (BH + lead * sigma) * d4
    )
    graft_common = sp.together(BH + lead * (S - 8))
    Kmax3 = sp.expand(
        C(T, 3) - (T - Y) * (T - 2) + (T - Y - 1)
        if long3
        else C(Y, 3)
    )
    if long2 == Y:
        path_vertices = sp.expand(T - 2 * Y + 2)
        Kmin4 = sp.expand(sum(
            C(Y - 1, selected) * 2**selected
            * C(path_vertices + 1 - (4 - selected), 4 - selected)
            for selected in range(5)
        ))
        if kmin4_boundary:
            # At B=Y the long factor is P_2.  As above, its polynomial
            # continuation contributes one spurious x^4 unit.
            Kmin4 -= 1
    else:
        short_edges = sp.expand(T - Y)
        isolates = sp.expand(2 * Y - T)
        Kmin4 = sp.expand(sum(
            C(short_edges, selected) * 2**selected
            * C(isolates, 4 - selected)
            for selected in range(5)
        ))
    J = sp.together(H + lead * Kmin4)
    G = sp.together(J + BK * Kmax3)
    return graft_common, H, J, G


def polynomial_status(expression, variables):
    # Every caller substitutes into an expression already normalized by
    # scalar_expressions.  Avoid an expensive fresh multivariate cancel in
    # each cone; substitution preserves the displayed numerator/denominator.
    numerator, denominator = sp.fraction(expression)
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    negative = [(monomial, coefficient) for monomial, coefficient in polynomial.terms() if coefficient < 0]
    denominator_polynomial = sp.Poly(sp.expand(denominator), *variables)
    denominator_negative = [
        (monomial, coefficient)
        for monomial, coefficient in denominator_polynomial.terms()
        if coefficient < 0
    ]
    numerator_stream = hashlib.sha256()
    for monomial, coefficient in polynomial.terms():
        numerator_stream.update(f"{monomial}:{coefficient}\n".encode())
    denominator_stream = hashlib.sha256()
    for monomial, coefficient in denominator_polynomial.terms():
        denominator_stream.update(f"{monomial}:{coefficient}\n".encode())
    origin = {variable: 0 for variable in variables}
    denominator_at_origin = denominator_polynomial.as_expr().subs(origin)
    return {
        "denominator_terms": len(denominator_polynomial.terms()),
        "denominator_negative": len(denominator_negative),
        "denominator_at_origin": denominator_at_origin,
        "denominator_stream_sha256": denominator_stream.hexdigest().upper(),
        "terms": len(polynomial.terms()),
        "negative": len(negative),
        "minimum_coefficient": min(coefficient for _, coefficient in polynomial.terms()),
        "numerator_stream_sha256": numerator_stream.hexdigest().upper(),
        "first_negative": negative[:5],
    }


def cover_three(expression, variables, weights, threshold, prefix):
    """Coefficient cones covering w0*x0+w1*x1+w2*x2>=threshold."""
    x0, x1, x2 = variables
    w0, w1, w2 = weights
    assert w0 == 1
    q = sp.symbols("q", nonnegative=True, integer=True)
    records = []
    records.append((
        f"{prefix}_x0_high",
        polynomial_status(expression.subs(x0, threshold + q), (q, x1, x2)),
    ))
    for fixed0 in range(threshold):
        remaining1 = threshold - fixed0
        high1 = (remaining1 + w1 - 1) // w1
        records.append((
            f"{prefix}_x0_{fixed0}_x1_high",
            polynomial_status(expression.subs({x0: fixed0, x1: high1 + q}), (q, x2)),
        ))
        for fixed1 in range(high1):
            remaining2 = threshold - fixed0 - w1 * fixed1
            high2 = max(0, (remaining2 + w2 - 1) // w2)
            records.append((
                f"{prefix}_x0_{fixed0}_x1_{fixed1}_x2_{high2}+",
                polynomial_status(expression.subs({x0: fixed0, x1: fixed1, x2: high2 + q}), (q,)),
            ))
    return records


def cover_two(expression, variables, weights, threshold, prefix):
    x0, x1 = variables
    w0, w1 = weights
    assert w0 == 1
    q = sp.symbols("q", nonnegative=True, integer=True)
    records = [(
        f"{prefix}_x0_high",
        polynomial_status(expression.subs(x0, threshold + q), (q, x1)),
    )]
    for fixed0 in range(threshold):
        high1 = (threshold - fixed0 + w1 - 1) // w1
        records.append((
            f"{prefix}_x0_{fixed0}_x1_{high1}+",
            polynomial_status(expression.subs({x0: fixed0, x1: high1 + q}), (q,)),
        ))
    return records


def supported_b_ge_y_cones():
    """B=T-Y>=Y.  Split Y>=2 and the supported Y=1,C>=3 face."""
    A, Cc, y = sp.symbols("A C y", nonnegative=True, integer=True)
    groups = {}

    # Y=2+y, B=Y+C.  Split the short-path boundary C=0 from C>=1.
    Y = 2 + y
    B_positive = Y + 1 + Cc
    _, _, J, G = scalar_expressions(
        Y + A, Y + B_positive, Y, long3=1, long2=Y
    )
    # S=7+A+C+3y, so A+C+3y>=7.
    groups["BgeY_Yge2_Cpositive_J"] = cover_three(
        J, (A, Cc, y), (1, 1, 3), 7, "J"
    )
    groups["BgeY_Yge2_Cpositive_G"] = cover_three(
        G, (A, Cc, y), (1, 1, 3), 7, "G"
    )

    B_zero = Y
    _, _, J0, G0 = scalar_expressions(
        Y + A,
        Y + B_zero,
        Y,
        long3=1,
        long2=Y,
        kmin4_boundary=True,
    )
    # S=6+A+3y, so A+3y>=8.
    groups["BgeY_Yge2_Czero_J"] = cover_two(J0, (A, y), (1, 3), 8, "J")
    groups["BgeY_Yge2_Czero_G"] = cover_two(G0, (A, y), (1, 3), 8, "G")

    # Y=1,B=4+C is the supported remainder; S=A+6+C, A+C>=8.
    Y1 = sp.Integer(1)
    B1 = 4 + Cc
    _, _, J1, G1 = scalar_expressions(Y1 + A, Y1 + B1, Y1, long3=1, long2=Y1)
    groups["BgeY_Y1_J"] = cover_two(J1, (A, Cc), (1, 1), 8, "J")
    groups["BgeY_Y1_G"] = cover_two(G1, (A, Cc), (1, 1), 8, "G")
    return groups


def supported_b_lt_y_cones():
    """1<=B<Y, with the two small unsupported faces removed."""
    A, b, qd = sp.symbols("A b qd", nonnegative=True, integer=True)
    groups = {}

    # B=2+b, Y=B+1+qd.  S=A+5+3b+2qd plus the extra B shift:
    # directly, S=A+3B+2(1+qd)=A+8+3b+2qd, so threshold 6.
    B = 2 + b
    Y = B + 1 + qd
    _, _, J, G = scalar_expressions(Y + A, Y + B, Y, long3=1, long2=B)
    groups["BltY_Bge2_J"] = cover_three(J, (A, b, qd), (1, 3, 2), 6, "J")
    groups["BltY_Bge2_G"] = cover_three(G, (A, b, qd), (1, 3, 2), 6, "G")

    # B=1,Y=3+q; S=A+7+2q, so A+2q>=7.
    B1 = sp.Integer(1)
    Y1 = 3 + qd
    _, _, J1, G1 = scalar_expressions(Y1 + A, Y1 + B1, Y1, long3=1, long2=B1)
    groups["BltY_B1_J"] = cover_two(J1, (A, qd), (1, 2), 7, "J")
    groups["BltY_B1_G"] = cover_two(G1, (A, qd), (1, 2), 7, "G")
    return groups


def supported_b_zero_cones():
    A, y = sp.symbols("A y", nonnegative=True, integer=True)
    Y = 3 + y
    _, _, J, G = scalar_expressions(
        Y + A, Y, Y, long3=0, long2=0, h_d4_boundary=True
    )
    # S=A+6+2y>=14.
    return {
        "B0_J": cover_two(J, (A, y), (1, 2), 8, "J"),
        "B0_G": cover_two(G, (A, y), (1, 2), 8, "G"),
    }


def unsupported_k_cones():
    """T+Y<6: K_3=K_4=0, so only the H functional remains."""
    A, q = sp.symbols("A q", nonnegative=True, integer=True)
    groups = {}
    for Y_value, B_value in ((1, 0), (1, 1), (1, 2), (1, 3), (2, 0), (2, 1)):
        long3 = int(B_value > 0)
        # The qK argument is irrelevant to H; choose a nonzero formal branch.
        _, H, _, _ = scalar_expressions(
            Y_value + A,
            Y_value + B_value,
            sp.Integer(Y_value),
            long3=long3,
            long2=sp.Integer(0),
            h_d4_boundary=not long3,
        )
        minimum_a = 14 - (2 * Y_value + B_value)
        groups[f"unsupported_Y{Y_value}_B{B_value}"] = [(
            "A_tail",
            polynomial_status(H.subs(A, minimum_a + q), (q,)),
        )]
    return groups


def graft_common_cones():
    """Show BH+lead*(S-8)>=0, so actual H is bounded by canonical H."""
    A, b, y = sp.symbols("A b y", nonnegative=True, integer=True)
    groups = {}

    # B=1+b,Y=1+y gives S=A+b+2y+3 and threshold A+b+2y>=11.
    B = 1 + b
    Y = 1 + y
    common, _, _, _ = scalar_expressions(Y + A, Y + B, Y, long3=1, long2=1)
    groups["H_graft_common_Bpositive"] = cover_three(
        common, (A, b, y), (1, 1, 2), 11, "common"
    )

    # B=0,Y=1+y gives S=A+2y+2 and threshold A+2y>=12.
    Y0 = 1 + y
    common0, _, _, _ = scalar_expressions(Y0 + A, Y0, Y0, long3=0, long2=0)
    groups["H_graft_common_Bzero"] = cover_two(
        common0, (A, y), (1, 2), 12, "common"
    )
    return groups


def all_cone_groups():
    groups = {}
    groups.update(supported_b_ge_y_cones())
    groups.update(supported_b_lt_y_cones())
    groups.update(supported_b_zero_cones())
    groups.update(unsupported_k_cones())
    groups.update(graft_common_cones())
    return groups


def main() -> None:
    groups = all_cone_groups()
    for group, records in groups.items():
        bad = [
            (name, status)
            for name, status in records
            if status["negative"]
            or status["denominator_negative"]
            or status["denominator_at_origin"] <= 0
        ]
        print(group, "cones", len(records), "bad", len(bad))
        for name, status in bad[:20]:
            print("BAD", group, name, status)
        if not bad:
            print("PASS_COEFFICIENTWISE", group)


if __name__ == "__main__":
    main()
