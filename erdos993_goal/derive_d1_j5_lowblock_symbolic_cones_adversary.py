#!/usr/bin/env python3
"""Derive exact shifted coefficient cones for d=1,j=5 terminal m=0.

This is a derivation source.  A separate fail-closed verifier must pin and
replay it before the sector can be called closed.
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
    d5_case: str,
    kmin_case: str,
    kmax_case: str,
):
    """Return graft common, Hlower, J, and G on one exact boundary branch."""
    S = sp.expand(R + T)
    B = sp.expand(T - Y)
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
    lead = 6 * A0
    qH = linear_q3_symbolic(S, R, T, Y, long3)
    BH = sp.together(
        12 * A0
        + 6 * P * (c0 + R0)
        - 6 * P * (P + a)
        - 15 * P * (P + a) * qH
    )
    qK = linear_q2_symbolic(T, Y, long2)
    included = (4 * qK + R) / 5
    BK = sp.together(
        6 * A0
        + 6 * P * (c0 + R0)
        - 3 * P * (P + a)
        - 15 * P * (P + a) * included
    )

    p4, p5, p6 = C(S - 3, 4), C(S - 4, 5), C(S - 5, 6)
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
    d5 = (
        3 * R**2 * S
        - 18 * R**2
        + R * S**3
        - 18 * R * S**2
        + 98 * R * S
        - 6 * R * Y
        - 150 * R
        - S**3
        - 3 * S**2 * Y
        + 21 * S**2
        + 39 * S * Y
        - 140 * S
        - 114 * Y
        + 288
    ) / 6
    if d5_case == "B0":
        # P_2 boundary: exact D4 loses one unit and exact D5 differs from
        # its generalized-binomial continuation by -(R+Y-8).
        d4 -= 1
        d5 -= R + Y - 8
    elif d5_case == "B1":
        d5 += 1
    else:
        assert d5_case == "Bge2"

    sigma = sp.together(C(S - 7, 4) / C(S - 6, 3))
    H = sp.together(
        lead * (p4 + p6)
        + BH * p5
        + lead * d4
        + (BH + lead * sigma) * d5
    )
    rho = sp.together((S - 9) * (S - 10) / (2 * (S - 8)))
    graft_common = sp.together(BH + lead * rho)

    if kmin_case.startswith("BgeY"):
        path_vertices = sp.expand(T - 2 * Y + 2)
        Kmin5 = sp.expand(sum(
            C(Y - 1, selected)
            * 2**selected
            * C(path_vertices + 1 - (5 - selected), 5 - selected)
            for selected in range(6)
        ))
        if kmin_case == "BgeY_C0":
            # P_2 boundary correction to the polynomial continuation.
            Kmin5 -= 2 * Y - 8
        elif kmin_case == "BgeY_C1":
            # P_3 boundary correction.
            Kmin5 += 1
        else:
            assert kmin_case == "BgeY_Cge2"
    else:
        assert kmin_case == "BltY"
        short_edges = sp.expand(T - Y)
        isolates = sp.expand(2 * Y - T)
        Kmin5 = sp.expand(sum(
            C(short_edges, selected)
            * 2**selected
            * C(isolates, 5 - selected)
            for selected in range(6)
        ))

    if kmax_case == "Bge2":
        Kmax4 = sp.expand(
            C(T, 4)
            - B * C(T - 2, 2)
            + C(B, 2)
            + (B - 1) * (T - 4)
            - (B - 2)
        )
    elif kmax_case == "B1":
        Kmax4 = sp.expand(C(T, 4) - C(T - 2, 2))
    else:
        assert kmax_case == "B0"
        Kmax4 = sp.expand(C(Y, 4))

    J = sp.together(H + lead * Kmin5)
    G = sp.together(J + BK * Kmax4)
    return graft_common, H, J, G


def polynomial_status(expression, variables):
    numerator, denominator = sp.fraction(expression)
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in polynomial.terms()
        if coefficient < 0
    ]
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
        high1 = (threshold - fixed0 + w1 - 1) // w1
        records.append((
            f"{prefix}_x0_{fixed0}_x1_high",
            polynomial_status(expression.subs({x0: fixed0, x1: high1 + q}), (q, x2)),
        ))
        for fixed1 in range(high1):
            remaining2 = threshold - fixed0 - w1 * fixed1
            high2 = max(0, (remaining2 + w2 - 1) // w2)
            records.append((
                f"{prefix}_x0_{fixed0}_x1_{fixed1}_x2_{high2}+",
                polynomial_status(
                    expression.subs({x0: fixed0, x1: fixed1, x2: high2 + q}),
                    (q,),
                ),
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
    A, Cc, y = sp.symbols("A C y", nonnegative=True, integer=True)
    groups = {}

    # Y>=2,C=B-Y>=2.
    Y = 2 + y
    B = Y + 2 + Cc
    _, _, J, G = scalar_expressions(
        Y + A, Y + B, Y,
        long3=1, long2=Y, d5_case="Bge2",
        kmin_case="BgeY_Cge2", kmax_case="Bge2",
    )
    groups["BgeY_Yge2_Cge2_J"] = cover_three(
        J, (A, Cc, y), (1, 1, 3), 6, "J"
    )
    groups["BgeY_Yge2_Cge2_G"] = cover_three(
        G, (A, Cc, y), (1, 1, 3), 6, "G"
    )

    # C=1 is supported exactly from Y=3 onward.
    Y1 = 3 + y
    B1 = Y1 + 1
    _, _, J1, G1 = scalar_expressions(
        Y1 + A, Y1 + B1, Y1,
        long3=1, long2=Y1, d5_case="Bge2",
        kmin_case="BgeY_C1", kmax_case="Bge2",
    )
    groups["BgeY_C1_J"] = cover_two(J1, (A, y), (1, 3), 4, "J")
    groups["BgeY_C1_G"] = cover_two(G1, (A, y), (1, 3), 4, "G")

    # C=0 is supported exactly from Y=3 onward.
    Y0 = 3 + y
    B0 = Y0
    _, _, J0, G0 = scalar_expressions(
        Y0 + A, Y0 + B0, Y0,
        long3=1, long2=Y0, d5_case="Bge2",
        kmin_case="BgeY_C0", kmax_case="Bge2",
    )
    groups["BgeY_C0_J"] = cover_two(J0, (A, y), (1, 3), 5, "J")
    groups["BgeY_C0_G"] = cover_two(G0, (A, y), (1, 3), 5, "G")

    # Y=1 is supported from B=6, equivalently C>=5.
    Ystar = sp.Integer(1)
    Bstar = 6 + Cc
    _, _, Js, Gs = scalar_expressions(
        Ystar + A, Ystar + Bstar, Ystar,
        long3=1, long2=Ystar, d5_case="Bge2",
        kmin_case="BgeY_Cge2", kmax_case="Bge2",
    )
    groups["BgeY_Y1_J"] = cover_two(Js, (A, Cc), (1, 1), 6, "J")
    groups["BgeY_Y1_G"] = cover_two(Gs, (A, Cc), (1, 1), 6, "G")
    return groups


def supported_b_lt_y_cones():
    A, b, qd = sp.symbols("A b qd", nonnegative=True, integer=True)
    groups = {}

    # B=2+b,Y=B+1+qd.
    B = 2 + b
    Y = B + 1 + qd
    _, _, J, G = scalar_expressions(
        Y + A, Y + B, Y,
        long3=1, long2=B, d5_case="Bge2",
        kmin_case="BltY", kmax_case="Bge2",
    )
    groups["BltY_Bge2_J"] = cover_three(J, (A, b, qd), (1, 3, 2), 6, "J")
    groups["BltY_Bge2_G"] = cover_three(G, (A, b, qd), (1, 3, 2), 6, "G")

    # B=1,Y>=4.
    B1 = sp.Integer(1)
    Y1 = 4 + qd
    _, _, J1, G1 = scalar_expressions(
        Y1 + A, Y1 + B1, Y1,
        long3=1, long2=B1, d5_case="B1",
        kmin_case="BltY", kmax_case="B1",
    )
    groups["BltY_B1_J"] = cover_two(J1, (A, qd), (1, 2), 5, "J")
    groups["BltY_B1_G"] = cover_two(G1, (A, qd), (1, 2), 5, "G")
    return groups


def supported_b_zero_cones():
    A, y = sp.symbols("A y", nonnegative=True, integer=True)
    Y = 4 + y
    _, _, J, G = scalar_expressions(
        Y + A, Y, Y,
        long3=0, long2=0, d5_case="B0",
        kmin_case="BltY", kmax_case="B0",
    )
    return {
        "B0_J": cover_two(J, (A, y), (1, 2), 6, "J"),
        "B0_G": cover_two(G, (A, y), (1, 2), 6, "G"),
    }


def unsupported_k_cones():
    """2Y+B<8: K_4=K_5=0, so only Hlower remains."""
    A, q = sp.symbols("A q", nonnegative=True, integer=True)
    groups = {}
    pairs = (
        *((1, B) for B in range(6)),
        *((2, B) for B in range(4)),
        *((3, B) for B in range(2)),
    )
    for Y_value, B_value in pairs:
        d5_case = "B0" if B_value == 0 else ("B1" if B_value == 1 else "Bge2")
        kmax_case = d5_case
        if kmax_case == "Bge2":
            kmax_case = "Bge2"
        _, H, _, _ = scalar_expressions(
            Y_value + A,
            2 * Y_value + B_value - Y_value,
            sp.Integer(Y_value),
            long3=int(B_value > 0),
            long2=min(Y_value, B_value),
            d5_case=d5_case,
            kmin_case=(
                "BgeY_Cge2" if B_value >= Y_value else "BltY"
            ),
            kmax_case=kmax_case,
        )
        minimum_a = 14 - (2 * Y_value + B_value)
        groups[f"unsupported_Y{Y_value}_B{B_value}"] = [(
            "A_tail",
            polynomial_status(H.subs(A, minimum_a + q), (q,)),
        )]
    return groups


def graft_common_cones():
    A, b, y = sp.symbols("A b y", nonnegative=True, integer=True)
    groups = {}

    B = 1 + b
    Y = 1 + y
    common, _, _, _ = scalar_expressions(
        Y + A, Y + B, Y,
        long3=1, long2=1, d5_case="B1",
        kmin_case="BltY", kmax_case="B1",
    )
    groups["H_graft_common_Bpositive"] = cover_three(
        common, (A, b, y), (1, 1, 2), 11, "common"
    )

    Y0 = 1 + y
    common0, _, _, _ = scalar_expressions(
        Y0 + A, Y0, Y0,
        long3=0, long2=0, d5_case="B0",
        kmin_case="BltY", kmax_case="B0",
    )
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
    total = 0
    for group, records in groups.items():
        bad = [
            (name, status)
            for name, status in records
            if status["negative"]
            or status["denominator_negative"]
            or status["denominator_at_origin"] <= 0
        ]
        total += len(records)
        print(group, "cones", len(records), "bad", len(bad))
        for name, status in bad[:20]:
            print("BAD", group, name, status)
        if not bad:
            print("PASS_COEFFICIENTWISE", group)
    print("TOTAL_CONES", total)


if __name__ == "__main__":
    main()
