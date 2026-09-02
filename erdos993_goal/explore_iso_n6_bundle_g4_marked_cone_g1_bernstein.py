#!/usr/bin/env python3
"""Explore a solver-free marked-partition cone for rank-six bundle g4.

Diagnostic only.  This file makes no theorem claim unless a later frozen
assembler supplies every sign and boundary proof.
"""

from __future__ import annotations

import sympy as sp
import random
import networkx as nx
import itertools

from audit_iso_n6_bundle_g6_g2_transfer_audit import (
    add_xd, forward_differences, isolate_multiply, nested,
)
from audit_iso_n6_bundle_algebra_finite_g2_transfer_audit import independence_row


def reconstruct():
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        gamma.append(sp.expand(
            nested(add_xd(isolate_multiply(crows, amount), drows), 6)
            - nested(base, 6)
            - sum(nested(isolate_multiply(crows, offset), 5)
                  for offset in range(amount))
        ))
    g4 = forward_differences(gamma)[4]
    n, q, eu, ev = sp.symbols("n q eu ev", integer=True, nonnegative=True)
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    partition = {}
    for rank in range(2, 7):
        w, a, b, z = sp.symbols(f"W{rank} A{rank} B{rank} Z{rank}")
        partition.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    return sp.expand(g4.subs(structural).subs(partition)), n


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= (
                        sp.binomial(location, exponent) / sp.binomial(degree, exponent)
                    )
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def main():
    form, n = reconstruct()
    names = {str(symbol): symbol for symbol in form.free_symbols}
    get = names.__getitem__
    W2, W3, W4, W5, W6 = map(get, ("W2", "W3", "W4", "W5", "W6"))
    A2, A3, A4, A5, A6 = map(get, ("A2", "A3", "A4", "A5", "A6"))
    B2, B3, B4, B5, B6 = map(get, ("B2", "B3", "B4", "B5", "B6"))
    Z2, Z3, Z4, Z5, Z6 = map(get, ("Z2", "Z3", "Z4", "Z5", "Z6"))
    dE4, dE5 = map(get, ("dE4", "dE5"))
    dU3, dU4, dU5 = map(get, ("dU3", "dU4", "dU5"))
    dV3, dV4, dV5 = map(get, ("dV3", "dV4", "dV5"))
    dW2, dW3, dW4 = map(get, ("dW2", "dW3", "dW4"))

    d_symbols = (dE4, dE5, dU3, dU4, dU5, dV3, dV4, dV5, dW2, dW3, dW4)
    c_part = form.subs({symbol: 0 for symbol in d_symbols})
    d_lower = (
        -7 * (n - 2) * (W4 + A4 + B4 + Z4)
        - (7 * B2 + 7 * W2 + n - 4) * (W3 + A3)
        - (7 * A2 + 7 * W2 + n - 4) * (W3 + B3)
        - 7 * (W5 + A5) - 7 * (W5 + B5)
        - (A2 + 7 * A3 + B2 + 7 * B3 + 2 * W2 + 7 * W3 + 7 * Z3) * W2
        - (7 * n + 2) * W4
    )
    relaxed = sp.expand(c_part + d_lower)
    print("D_RELAX_TERMS", len(sp.Poly(relaxed, *sorted(relaxed.free_symbols, key=str)).terms()))

    caps = [
        (A6, (n - 6) * A5 / 5), (B6, (n - 6) * B5 / 5),
        (W6, (n - 7) * W5 / 6), (Z6, (n - 5) * Z5 / 4),
        (A5, (n - 5) * A4 / 4), (B5, (n - 5) * B4 / 4),
        (W5, (n - 6) * W4 / 5), (Z5, (n - 4) * Z4 / 3),
    ]
    current = relaxed
    for variable, cap in caps:
        coefficient = sp.factor(sp.diff(current, variable))
        print("COEFF", variable, coefficient)
        current = sp.expand(current.subs(variable, cap))
    print("AFTER_TOP_CAPS_TERMS", len(sp.Poly(current, *sorted(current.free_symbols, key=str)).terms()))
    for variable in (A4, B4, W4, Z4, A3, B3, W3, Z3):
        print("REMAINING_COEFF", variable, sp.factor(sp.diff(current, variable)))
    reduced = sp.expand(current.subs({A4: 0, B4: 0, Z4: 0}))
    print("W4_SIGN", sp.factor(sp.diff(reduced, W4)))
    reduced = sp.expand(reduced.subs(W4, (n - 5) * W3 / 4))
    print("AFTER_W4_CAP_TERMS", len(sp.Poly(reduced, *sorted(reduced.free_symbols, key=str)).terms()))
    for variable in (A3, B3, W3, Z3, A2, B2, W2, Z2):
        print("LOW_COEFF", variable, sp.factor(sp.diff(reduced, variable)))
    print("LOW_REMAINDER", sp.factor(reduced))
    # Elementary forest floors valid for every integer order h>=0:
    # i2>=C(h,2)-h=h(h-3)/2 and
    # i3>=h(h-1)(h-8)/6.  For h>=2 this is one h below the
    # edge-bound floor C(h,3)-h(h-2); h=0,1 are then also valid.
    floor2 = lambda h: h * (h - 3) / 2
    floor3 = lambda h: h * (h - 1) * (h - 8) / 6
    strong = sp.expand(current.subs({
        A4: floor3(A2), B4: floor3(B2),
        Z4: Z2 * floor2(Z3),
        W4: (n - 5) * W3 / 4,
    }))
    print("STRONG_A3_COEFF", sp.factor(sp.diff(strong, A3)))
    strong = sp.expand(strong.subs(A3, floor2(A2)))
    print("STRONG_B3_COEFF", sp.factor(sp.diff(strong, B3)))
    strong = sp.expand(strong.subs(B3, floor2(B2)))
    print("STRONG_TERMS", len(sp.Poly(strong, *sorted(strong.free_symbols, key=str)).terms()))
    print("STRONG_W3_COEFF", sp.factor(sp.diff(strong, W3)))
    print("STRONG_FORM", sp.factor(strong))
    # Low-order alternative: discard only the +15*W2 part of the A4/B4
    # coefficients, and pay the remaining negative pieces with the exact
    # 3*A4<=(A2-2)*A3 (and B analogue) extension count.
    p4 = 108 * n**2 - 313 * n + 365
    ca4 = sp.diff(current, A4)
    cb4 = sp.diff(current, B4)
    loworder_pre = sp.expand(
        current - ca4 * A4 - cb4 * B4
        - (B2 + p4 / 20) * (A2 - 2) * A3 / 3
        - (A2 + p4 / 20) * (B2 - 2) * B3 / 3
    )
    loworder_pre = sp.expand(loworder_pre.subs({
        Z4: Z2 * floor2(Z3), W4: (n - 5) * W3 / 4,
    }))
    loworder_dA = sp.factor(sp.diff(loworder_pre, A3).subs(B3, 0))
    loworder_after_A = sp.expand(loworder_pre.subs(A3, floor2(A2)))
    loworder_dB = sp.factor(sp.diff(loworder_after_A, B3))
    print("LOWORDER_A3_COEFF", loworder_dA)
    print("LOWORDER_B3_AFTER_A_FLOOR", sp.factor(
        loworder_dB
    ))
    loworder = sp.expand(loworder_after_A.subs(B3, floor2(B2)))
    print("LOWORDER_TERMS", len(sp.Poly(loworder, *sorted(loworder.free_symbols, key=str)).terms()))
    t = sp.symbols("t", integer=True, nonnegative=True)
    aa, bb, cc, pp, rr = sp.symbols("aa bb cc pp rr", nonnegative=True)
    nn = t + 16
    mm = nn - 2
    common = mm * aa
    only_a = mm * (1 - aa) * bb
    only_b = mm * (1 - aa) * (1 - bb) * cc
    sub_a2 = common + only_a
    sub_b2 = common + only_b
    low_w2 = (nn - 3) * (nn - 4) / 2
    sub_w2 = low_w2 + (nn - 3) * pp
    low_w3 = (nn - 3) * (nn - 4) * (nn - 8) / 6
    sub_w3 = low_w3 + (nn - 3) * (nn - 4) * rr
    for zflag in (0, 1):
        box_form = sp.factor(strong.subs({
            n: nn, A2: sub_a2, B2: sub_b2,
            W2: sub_w2, W3: sub_w3,
            Z2: zflag, Z3: zflag * common,
        }))
        negative = 0
        minimum_at_zero = None
        count = 0
        profiles = set()
        witness = None
        for degrees, index, coefficient in tensor_bernstein(
            box_form, (aa, bb, cc, pp, rr)
        ):
            profiles.add(degrees)
            t_coeffs = sp.Poly(sp.expand(coefficient), t).all_coeffs()
            if any(value < 0 for value in t_coeffs):
                negative += 1
                if witness is None:
                    witness = (degrees, index, coefficient, t_coeffs)
            at_zero = coefficient.subs(t, 0)
            minimum_at_zero = at_zero if minimum_at_zero is None else min(
                minimum_at_zero, at_zero
            )
            count += 1
        print(
            "BERNSTEIN", zflag, count, profiles, "negative", negative,
            "min_t0", minimum_at_zero, "witness", witness,
        )

    # Geometry-aware edge/wedge cone.  Here x,y are the numbers of unmarked
    # neighbours of v,u and e is the edge count of W.  Forest acyclicity gives
    # e+x+y+adj<=n-1, while W3=C(m,3)-e(m-2)+wedges and
    # wedges<=e^2/2 (a deliberately coarse but branch-free cap).
    edge_a, edge_b, edge_c, edge_d = sp.symbols(
        "edge_a edge_b edge_c edge_d", nonnegative=True
    )
    edge_box = (edge_a, edge_b, edge_c, edge_d)
    branch_maps = []
    # adjacent: x+y+e<=m
    ex = mm * edge_a
    ey = mm * (1 - edge_a) * edge_b
    ee = mm * (1 - edge_a) * (1 - edge_b) * edge_c
    branch_maps.append(("adjacent", ex, ey, ee, 0, 0))
    # nonadjacent with one common neighbour: x=1+x', y=1+y',
    # x'+y'+e<=m-1 and Z3=m-1-x'-y'.
    budget = mm - 1
    xp = budget * edge_a
    yp = budget * (1 - edge_a) * edge_b
    ee = budget * (1 - edge_a) * (1 - edge_b) * edge_c
    branch_maps.append(("nonadj_common1", 1 + xp, 1 + yp, ee, 1, mm - 1 - xp - yp))
    # nonadjacent, no common neighbour, x+y=0 or 1.
    branch_maps.append(("nonadj_common0_s0", 0, 0, (mm - 1) * edge_c, 1, mm))
    branch_maps.append(("nonadj_common0_s1", 1, 0, (mm - 1) * edge_c, 1, mm - 1))
    # nonadjacent, no common neighbour, 2<=s=x+y<=m.
    ss = 2 + (mm - 2) * edge_a
    ex = ss * edge_b
    ey = ss * (1 - edge_b)
    ee = (mm + 1 - ss) * edge_c
    branch_maps.append(("nonadj_common0_sge2", ex, ey, ee, 1, mm - ss))
    for label, ex, ey, ee, zflag, zcount in branch_maps:
        ew2 = mm * (mm - 1) / 2 - ee
        ew3 = mm * (mm - 1) * (mm - 2) / 6 - ee * (mm - 2) + ee**2 * edge_d / 2
        edge_form = sp.factor(strong.subs({
            n: nn, A2: mm - ex, B2: mm - ey,
            W2: ew2, W3: ew3, Z2: zflag, Z3: zcount,
        }))
        used = tuple(
            variable for variable in edge_box if variable in edge_form.free_symbols
        )
        negative = 0
        minimum_at_zero = None
        count = 0
        witness = None
        profiles = set()
        for degrees, index, coefficient in tensor_bernstein(edge_form, used):
            profiles.add(degrees)
            t_coeffs = sp.Poly(sp.expand(coefficient), t).all_coeffs()
            if any(value < 0 for value in t_coeffs):
                negative += 1
                if witness is None:
                    witness = (degrees, index, coefficient, t_coeffs)
            at_zero = coefficient.subs(t, 0)
            minimum_at_zero = at_zero if minimum_at_zero is None else min(
                minimum_at_zero, at_zero
            )
            count += 1
        print(
            "EDGE_BERNSTEIN", label, "vars", used, "count", count,
            "profiles", profiles, "negative", negative,
            "min_t0", minimum_at_zero, "witness", witness,
        )
    # Fixed low orders n=8..15 under the more conservative A4/B4 payment.
    for order_value in range(8, 16):
        mm_fixed = sp.Integer(order_value - 2)
        fixed_maps = []
        ex = mm_fixed * edge_a
        ey = mm_fixed * (1 - edge_a) * edge_b
        ee = mm_fixed * (1 - edge_a) * (1 - edge_b) * edge_c
        fixed_maps.append(("adjacent", ex, ey, ee, 0, 0))
        budget = mm_fixed - 1
        xp = budget * edge_a
        yp = budget * (1 - edge_a) * edge_b
        ee = budget * (1 - edge_a) * (1 - edge_b) * edge_c
        fixed_maps.append(("nonadj_common1", 1 + xp, 1 + yp, ee, 1, mm_fixed - 1 - xp - yp))
        fixed_maps.append(("nonadj_common0_s0", 0, 0, (mm_fixed - 1) * edge_c, 1, mm_fixed))
        fixed_maps.append(("nonadj_common0_s1", 1, 0, (mm_fixed - 1) * edge_c, 1, mm_fixed - 1))
        ss = 2 + (mm_fixed - 2) * edge_a
        fixed_maps.append((
            "nonadj_common0_sge2", ss * edge_b, ss * (1 - edge_b),
            (mm_fixed + 1 - ss) * edge_c, 1, mm_fixed - ss,
        ))
        for label, ex, ey, ee, zflag, zcount in fixed_maps:
            ew2 = mm_fixed * (mm_fixed - 1) / 2 - ee
            ew3 = (
                mm_fixed * (mm_fixed - 1) * (mm_fixed - 2) / 6
                - ee * (mm_fixed - 2) + ee**2 * edge_d / 2
            )
            fixed_form = sp.factor(loworder.subs({
                n: order_value, A2: mm_fixed - ex, B2: mm_fixed - ey,
                W2: ew2, W3: ew3, Z2: zflag, Z3: zcount,
            }))
            used = tuple(vv for vv in edge_box if vv in fixed_form.free_symbols)
            derivative_forms = [
                sp.factor(loworder_dA.subs({
                    n: order_value, A2: mm_fixed - ex, B2: mm_fixed - ey,
                    W2: ew2, W3: ew3, Z2: zflag, Z3: zcount,
                })),
                sp.factor(loworder_dB.subs({
                    n: order_value, A2: mm_fixed - ex, B2: mm_fixed - ey,
                    W2: ew2, W3: ew3, Z2: zflag, Z3: zcount,
                })),
            ]
            derivative_negatives = []
            for derivative_form in derivative_forms:
                derivative_used = tuple(
                    vv for vv in edge_box if vv in derivative_form.free_symbols
                )
                derivative_negatives.append(sum(
                    coefficient.is_negative is True
                    for _degrees, _index, coefficient in tensor_bernstein(
                        derivative_form, derivative_used
                    )
                ))
            negative = 0
            minimum = None
            witness = None
            for degrees, index, coefficient in tensor_bernstein(fixed_form, used):
                if coefficient.is_negative is True:
                    negative += 1
                    if witness is None:
                        witness = (degrees, index, coefficient)
                minimum = coefficient if minimum is None else min(minimum, coefficient)
            print("LOW_FIXED", order_value, label,
                  "derivative_negatives", derivative_negatives,
                  "negative", negative,
                  "minimum", minimum, "witness", witness)
    print("REMAINDER", sp.factor(current))

    # Diagnostic only: actual forest rows, never a theorem certificate.
    ordered = (n,) + tuple(
        get(f"{family}{rank}") for family in "WABZ" for rank in range(2, 7)
    )
    evaluate = sp.lambdify(
        (n, A2, B2, W2, W3, Z2, Z3), strong, "math"
    )
    rng = random.Random(993604)
    minimum = None
    witness = None
    for _sample in range(4000):
        order = rng.randint(16, 60)
        graph = nx.Graph()
        graph.add_nodes_from(range(order))
        for vertex in range(1, order):
            if rng.random() < rng.random():
                graph.add_edge(vertex, rng.randrange(vertex))
        u, v = rng.sample(range(order), 2)
        rows = []
        for removed in ((), (u,), (v,), (u, v)):
            reduced_graph = graph.copy()
            reduced_graph.remove_nodes_from(removed)
            rows.append(independence_row(reduced_graph, 6))
        e, ru, rv, w = rows
        value = int(evaluate(
            order,
            ru[2] - w[2], rv[2] - w[2], w[2], w[3],
            e[2] - ru[2] - rv[2] + w[2],
            e[3] - ru[3] - rv[3] + w[3],
        ))
        if minimum is None or value < minimum:
            minimum = value
            witness = (order, graph.number_of_edges(), u, v, value)
    print("ACTUAL_FOREST_RANDOM_MIN", minimum, witness)


if __name__ == "__main__":
    main()
