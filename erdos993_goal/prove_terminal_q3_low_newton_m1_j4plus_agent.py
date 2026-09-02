#!/usr/bin/env python3
"""Exact tree-base Newton-m=1 terminal-q3 certificate for target j>=4.

The symbolic proof covers N=|G|-1>=15 (therefore |G|>=16).  The pinned
all-tree census supplies |G|=15.  The only use of the desired inequality is
on F=G-w, a strictly smaller forest: strong induction gives q_j(F)<=q_3(F),
and the pinned component lift gives q_3(F)<=q_2(F).  Thus the use is
noncircular inside the global strong-induction step.

This verifier deliberately does not claim target j=3, Newton m=0, the full
terminal payment, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path
import random

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py":
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6",
    "terminal_q3_payment_newton_tail_independent_20260828.json":
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212",
    "audit_terminal_q3_anchor_ordering_independent_agent.py":
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md":
        "495AB1C891C5CF6C542F80922C03A70F92BC6DC643F94611C95DB37316913481",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "ALL_FOREST_Q3_Q2_THEOREM_2026-08-29.md":
        "354323BF3E2EB4E60CD68441D1539B535C3A95D57F3E0DDF6B426AF99270C1B7",
    "ROOTED_FOREST_EXTENSION_FLOOR_2026-08-28.md":
        "8AA07C316270045F9CBFCA2B5A04E04994100DCF87F02EB99B84A61080A1458E",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def rank3(order, edges, wedges, connected_four):
    independent = C(order, 3) - edges * (order - 2) + wedges
    matchings = C(edges, 2) - wedges
    one_edge = (
        edges * C(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.expand(independent), sp.expand(one_edge)


def symbolic_lower():
    """Build the exact retained lower before and after the tau substitution."""
    N, j, r, d, R, B2, tau, y = sp.symbols(
        "N j r d R B2 tau y", nonnegative=True
    )
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = C(N, 2) - S
    wedges_forest = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * wedges_forest
    h2 = C(S, 2) - (S - R)
    c0 = sp.expand(a + z2 + h2)

    p0_check, R0 = rank3(N + 2, N, W, N - 2 + B2 + tau)
    assert sp.expand(p0_check - p0) == 0
    A0 = sp.expand(p0 * c0 - a * R0)
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    # The strictly-smaller induction input is
    # z_j/b <= j*z2/(2*a), equivalently q_j(F)<=q_2(F).
    ebar = sp.factor(1 + y + j * z2 / (2 * a))
    Q0 = sp.expand((j + 1) * (c0 + R0) - 3 * ebar * (p0 + a))
    Q1 = sp.expand(
        (j + 1) * (a + R1)
        - 3 * ebar * p1
        - 3 * (p0 + a + p1)
    )
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)

    # Rooted extension and shadow floors.  Here r=N-j>0 off the separately
    # treated star-centre top-support boundary.
    U1 = 1 + j / (r + 1) + j * y / r
    U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + j * y / r
    gap = sp.factor((j + 1) * (A0 * U1 + A1 * (U0 + U1)) + remainder)

    expected_tau_slope = 3 * (j + 1) * (p1 - a * U1)
    assert sp.factor(sp.diff(gap, tau) - expected_tau_slope) == 0
    lower = sp.factor(
        gap.subs({N: j + r, tau: (j + r - 3) * B2 / 3})
    )
    data = {
        "symbols": (N, j, r, d, R, B2, tau, y),
        "coordinates": (S, W, p0, p1, R0, R1, a, z2, h2, c0, A0, A1),
        "gap": gap,
        "lower": lower,
        "tau_slope": expected_tau_slope,
    }
    return data


def tensor_bernstein_2d(expression, u, v):
    polynomial = sp.Poly(sp.expand(expression), u, v)
    du, dv = polynomial.degree(u), polynomial.degree(v)
    output = {}
    for iu, iv in itertools.product(range(du + 1), range(dv + 1)):
        value = sp.Integer(0)
        for pu, pv in itertools.product(range(iu + 1), range(iv + 1)):
            value += (
                polynomial.coeff_monomial(u**pu * v**pv)
                * sp.binomial(iu, pu) / sp.binomial(du, pu)
                * sp.binomial(iv, pv) / sp.binomial(dv, pv)
            )
        output[(iu, iv)] = sp.factor(value)
    return (du, dv), output


def bernstein_1d(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    return degree, {
        index: sp.factor(sum(
            polynomial.coeff_monomial(variable**power)
            * sp.binomial(index, power) / sp.binomial(degree, power)
            for power in range(index + 1)
        ))
        for index in range(degree + 1)
    }


def split_vector(values):
    levels = [list(values)]
    while len(levels[-1]) > 1:
        previous = levels[-1]
        levels.append([
            (previous[index] + previous[index + 1]) / 2
            for index in range(len(previous) - 1)
        ])
    degree = len(values) - 1
    return (
        [levels[index][0] for index in range(degree + 1)],
        [levels[degree - index][index] for index in range(degree + 1)],
    )


def split_u_once(coefficients, degrees):
    du, dv = degrees
    children = [dict(), dict()]
    for iv in range(dv + 1):
        left, right = split_vector([
            coefficients[(iu, iv)] for iu in range(du + 1)
        ])
        for iu in range(du + 1):
            children[0][(iu, iv)] = left[iu]
            children[1][(iu, iv)] = right[iu]
    return children


def nonnegative_power(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    return bool(polynomial.coeffs()) and all(value >= 0 for value in polynomial.coeffs())


def axis_certificate(expression, k, q, maximum=8):
    if nonnegative_power(expression, (k, q)):
        return ("direct", 0, 0)
    for shift in range(1, maximum + 1):
        if nonnegative_power(expression.subs(k, k + shift), (k, q)) and all(
            nonnegative_power(expression.subs(k, value), (q,))
            for value in range(shift)
        ):
            return ("k_shift", shift, 0)
        if nonnegative_power(expression.subs(q, q + shift), (k, q)) and all(
            nonnegative_power(expression.subs(q, value), (k,))
            for value in range(shift)
        ):
            return ("q_shift", 0, shift)
    raise AssertionError(("no axis certificate", sp.factor(expression)))


def coefficient_summary(stream_items):
    encoded = "\n".join(stream_items).encode("ascii")
    return {
        "coefficient_stream_sha256": hashlib.sha256(encoded).hexdigest().upper(),
        "stream_records": len(stream_items),
    }


def cone_certificate(coefficient, j, r):
    """Certify j>=5,r>=1,j+r>=15 by one cone and ten strips."""
    k, q = sp.symbols("k q", nonnegative=True)
    main = sp.expand(coefficient.subs({j: 5 + k, r: 11 + q}))
    main_certificate = axis_certificate(main, k, q)
    strips = []
    for rv in range(1, 11):
        strip = sp.Poly(
            sp.expand(coefficient.subs({r: rv, j: 15 - rv + q})), q
        )
        assert strip.coeffs() and all(value >= 0 for value in strip.coeffs())
        strips.append((rv, strip.degree(), len(strip.terms()), min(strip.coeffs())))
    return main_certificate, strips


def b2_bernstein(lower, symbols, Nvalue=None):
    j, r, d, R, B2, y = symbols
    N = j + r if Nvalue is None else Nvalue
    S = N - d
    numerator, denominator = sp.together(lower).as_numer_denom()
    assert B2 not in denominator.free_symbols
    assert sp.Poly(numerator, B2).degree() == 2
    blo = C(d - 1, 2)
    bhi = sp.expand(blo + C(R, 2) + C(S - R, 2))
    width = sp.expand(bhi - blo)
    derivative = sp.diff(numerator, B2)
    return {
        "b0": numerator.subs(B2, blo),
        "b1": numerator.subs(B2, blo) + width * derivative.subs(B2, blo) / 2,
        "b2": numerator.subs(B2, bhi),
    }, sp.factor(denominator)


def j5plus_certificate(lower, symbols):
    j, r, d, R, _B2, y = symbols
    N = j + r
    S = N - d
    bmap, denominator = b2_bernstein(lower, symbols)
    u, v = sp.symbols("u v", nonnegative=True)
    records = {}
    global_stream = []
    for region in ("low_d", "high_d"):
        half = (N - 2) * u / 2
        if region == "low_d":
            dexpr = 1 + half
            Sexpr = N - dexpr
            yfaces = ("y0", "y1")
        else:
            Sexpr = 1 + half
            dexpr = N - Sexpr
            yfaces = ("y0", "yratio")
        Rexpr = 1 + (Sexpr - 1) * v
        for bname, base in bmap.items():
            for yface in yfaces:
                if yface == "yratio":
                    zero = base.subs(y, 0)
                    slope = sp.diff(base, y)
                    expression = (
                        dexpr * zero.subs({d: dexpr, R: Rexpr}, simultaneous=True)
                        + Sexpr * slope.subs({d: dexpr, R: Rexpr}, simultaneous=True)
                    )
                else:
                    yvalue = 0 if yface == "y0" else 1
                    expression = base.subs(
                        {d: dexpr, R: Rexpr, y: yvalue}, simultaneous=True
                    )
                numerator = sp.together(expression).as_numer_denom()[0]
                degrees, coefficients = tensor_bernstein_2d(numerator, u, v)
                modes = {}
                local_stream = []
                for index in sorted(coefficients):
                    coefficient = coefficients[index]
                    main, strips = cone_certificate(coefficient, j, r)
                    modes[main[0]] = modes.get(main[0], 0) + 1
                    item = f"{region}|{bname}|{yface}|{index}|{sp.srepr(coefficient)}|{main}|{strips}"
                    local_stream.append(item)
                    global_stream.append(item)
                records[f"{region}_{bname}_{yface}"] = {
                    "degrees": list(degrees),
                    "bernstein_coefficients": len(coefficients),
                    "main_cone_certificate_modes": modes,
                    **coefficient_summary(local_stream),
                }
    assert sum(value["bernstein_coefficients"] for value in records.values()) == 275
    return {
        "positive_denominator": str(denominator),
        "cases": records,
        **coefficient_summary(global_stream),
    }


def j4_certificate(lower, symbols):
    j, r, d, R, _B2, y = symbols
    q = sp.symbols("q", nonnegative=True)
    N = 15 + q
    specialized = sp.factor(lower.subs({j: 4, r: 11 + q}))
    bmap, denominator = b2_bernstein(specialized, symbols, Nvalue=N)
    records = {}
    global_stream = []

    # d=1,2,3: the elementary endpoint y<=1 is enough.
    v = sp.symbols("v", nonnegative=True)
    for dvalue in (1, 2, 3):
        Svalue = N - dvalue
        Rexpr = 1 + (Svalue - 1) * v
        for bname, base in bmap.items():
            for yface, yvalue in (("y0", 0), ("y1", 1)):
                expression = base.subs(
                    {d: dvalue, R: Rexpr, y: yvalue}, simultaneous=True
                )
                numerator = sp.together(expression).as_numer_denom()[0]
                degree, coefficients = bernstein_1d(numerator, v)
                local_stream = []
                for index in sorted(coefficients):
                    coefficient = coefficients[index]
                    assert nonnegative_power(coefficient, (q,))
                    item = f"small|{dvalue}|{bname}|{yface}|{index}|{sp.srepr(coefficient)}"
                    local_stream.append(item)
                    global_stream.append(item)
                records[f"small_d{dvalue}_{bname}_{yface}"] = {
                    "degree": degree,
                    "bernstein_coefficients": len(coefficients),
                    **coefficient_summary(local_stream),
                }

    # d>=4: h_4<=C(S,4), while the C(d,4) root-only four-sets are
    # disjoint from H, so y<=C(S,4)/(C(S,4)+C(d,4)).
    u = sp.symbols("u", nonnegative=True)
    dexpr = 4 + (N - 5) * u
    Sexpr = N - dexpr
    Rexpr = 1 + (Sexpr - 1) * v
    root4 = C(dexpr, 4)
    hcap = C(Sexpr, 4)
    for bname, base in bmap.items():
        zero = base.subs(y, 0)
        slope = sp.diff(base, y)
        for yface, expression in (
            ("y0", zero),
            ("ycap", (root4 + hcap) * zero + hcap * slope),
        ):
            boxed = expression.subs(
                {d: dexpr, R: Rexpr}, simultaneous=True
            )
            numerator = sp.together(boxed).as_numer_denom()[0]
            degrees, coefficients = tensor_bernstein_2d(numerator, u, v)
            cells = split_u_once(coefficients, degrees)
            local_stream = []
            for cell_index, cell in enumerate(cells):
                for index in sorted(cell):
                    coefficient = sp.factor(cell[index])
                    assert nonnegative_power(coefficient, (q,)), (
                        bname, yface, cell_index, index, coefficient
                    )
                    item = f"large|{bname}|{yface}|{cell_index}|{index}|{sp.srepr(coefficient)}"
                    local_stream.append(item)
                    global_stream.append(item)
            records[f"large_{bname}_{yface}"] = {
                "degrees": list(degrees),
                "u_midpoint_cells": 2,
                "bernstein_coefficients": len(local_stream),
                **coefficient_summary(local_stream),
            }

    small_total = sum(
        item["bernstein_coefficients"]
        for name, item in records.items() if name.startswith("small_")
    )
    large_total = sum(
        item["bernstein_coefficients"]
        for name, item in records.items() if name.startswith("large_")
    )
    assert (small_total, large_total) == (66, 352)
    return {
        "positive_denominator": str(denominator),
        "small_d_coefficients": small_total,
        "d4plus_coefficients": large_total,
        "cases": records,
        **coefficient_summary(global_stream),
    }


def star_center_certificate(lower, symbols):
    j, r, d, R, B2, y = symbols
    N = j + r
    center = sp.factor(lower.subs({
        d: N, R: 0, B2: C(N - 1, 2), y: 0,
    }, simultaneous=True))
    k, q = sp.symbols("k q", nonnegative=True)
    cases = {}
    stream = []
    substitutions = [("r11plus", {j: 4 + k, r: 11 + q}, (k, q))]
    for residual in range(11):
        minimum_j = max(4, 15 - residual)
        substitutions.append((
            f"r{residual}", {r: residual, j: minimum_j + q}, (q,)
        ))
    for label, substitution, variables in substitutions:
        numerator, denominator = sp.together(
            sp.factor(center.subs(substitution))
        ).as_numer_denom()
        polynomial = sp.Poly(sp.expand(numerator), *variables)
        assert polynomial.coeffs() and all(value >= 0 for value in polynomial.coeffs())
        cases[label] = {
            "positive_denominator": str(sp.factor(denominator)),
            "degrees": list(polynomial.degree_list()),
            "terms": len(polynomial.terms()),
            "minimum_coefficient": str(min(polynomial.coeffs())),
        }
        stream.append(f"{label}|{sp.srepr(numerator)}|{sp.srepr(denominator)}")
    return {"cases": cases, **coefficient_summary(stream)}


def add(left, right):
    output = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        output[index] += value
    for index, value in enumerate(right):
        output[index] += value
    return output


def multiply(left, right):
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    return output


def shift(row):
    return [0, *row]


def pair_product(l0, l1, r0, r1):
    return multiply(l0, r0), add(multiply(l1, r0), multiply(l0, r1))


class TreeRows:
    def __init__(self, tree):
        self.tree = tree
        self.cache = {}

    def message(self, vertex, parent):
        key = vertex, parent
        if key in self.cache:
            return self.cache[key]
        e0, e1, i0, i1 = [1], [0], [1], [0]
        for child in self.tree.neighbors(vertex):
            if child == parent:
                continue
            ce0, ce1, ci0, ci1 = self.message(child, vertex)
            e0, e1 = pair_product(e0, e1, add(ce0, ci0), add(ce1, ci1))
            i0, i1 = pair_product(i0, i1, ce0, add(ce1, ci0))
        self.cache[key] = e0, e1, shift(i0), shift(i1)
        return self.cache[key]

    @staticmethod
    def total(state):
        e0, e1, i0, i1 = state
        return add(e0, i0), add(e1, i1)

    def whole(self):
        return self.total(self.message(0, -1))

    def forest(self, root, closed=False):
        zero, one = [1], [0]
        for neighbor in self.tree.neighbors(root):
            state = self.message(neighbor, root)
            child = (state[0], state[1]) if closed else self.total(state)
            zero, one = pair_product(zero, one, *child)
        return zero, one


def coeff(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def with_isolates(row, rank, isolates):
    return sum(
        comb(isolates, used) * coeff(row, rank - used)
        for used in range(min(rank, isolates) + 1)
    )


def literal_check(tree, root, lower, symbols):
    j_sym, r_sym, d_sym, R_sym, B2_sym, y_sym = symbols
    rows = TreeRows(tree)
    whole_zero, whole_one = rows.whole()
    fzero, fone = rows.forest(root)
    hzero, _ = rows.forest(root, closed=True)
    N = len(tree) - 1
    d = tree.degree(root)
    R = sum(tree.degree(vertex) - 1 for vertex in tree.neighbors(root))
    B2 = sum(comb(degree - 1, 2) for _, degree in tree.degree())
    W = N - 1 + B2
    S = N - d
    a = coeff(fzero, 2)
    z2 = coeff(fone, 3)
    h2 = coeff(hzero, 2)
    assert a == comb(N, 2) - S
    assert z2 == S * (N - 2) - 2 * (W - comb(d, 2) - R)
    assert h2 == comb(S, 2) - (S - R)

    checks = []
    for target in range(4, len(fzero)):
        b = coeff(fzero, target)
        r = N - target
        if not b or r <= 0:
            continue
        zj = coeff(fone, target + 1)
        hj = coeff(hzero, target)
        assert 2 * a * zj <= target * b * z2

        delta = []
        ingredients = []
        for t in (1, 2):
            P = with_isolates(whole_zero, 3, t)
            Rrow = with_isolates(whole_one, 4, t)
            U = with_isolates(whole_zero, target + 1, t)
            c = z2 + h2 + t * a
            e = zj + hj + t * b
            A = P * c - a * Rrow
            Q = (target + 1) * b * (c + Rrow) - 3 * (P + a) * e
            value = a * ((target + 1) * A * U + P * Q)
            delta.append(value)
            ingredients.append((P, Rrow, U, c, e, A, Q))
        delta1 = delta[1] - delta[0]
        p0, R0, U0, c0, e0, A0, Q0 = ingredients[0]
        p1 = ingredients[1][0] - p0
        R1 = ingredients[1][1] - R0
        U1 = ingredients[1][2] - U0
        A1 = ingredients[1][5] - A0
        Q1 = ingredients[1][6] - Q0
        rebuilt = a * (
            (target + 1) * (A0 * U1 + A1 * U0 + A1 * U1)
            + p0 * Q1 + p1 * Q0 + p1 * Q1
        )
        assert rebuilt == delta1
        assert sp.Rational(p0) == (
            sp.Rational(N**3, 6) - sp.Rational(N**2, 2)
            + sp.Rational(N, 3) + W
        )
        assert p1 == (N**2 + N + 2) // 2
        assert R1 == N**2 - 2 * W
        assert A0 >= 0 and A1 >= 0
        yvalue = sp.Rational(hj, b)
        U1floor = 1 + sp.Rational(target, r + 1) + target * yvalue / r
        U0floor = (
            sp.Rational(N - 2 * target + 3, target + 1)
            + sp.Rational(target - 1, target + 1) * yvalue
            + target * yvalue / r
        )
        assert sp.Rational(U1, b) >= U1floor
        assert sp.Rational(U0, b) >= U0floor
        lower_value = lower.subs({
            j_sym: target, r_sym: r, d_sym: d, R_sym: R,
            B2_sym: B2, y_sym: yvalue,
        })
        # The tau cap used in lower is all-order only at |G|>=15.  Test the
        # final inequality only in that range; the raw identity above is
        # audited at every sampled order.
        if len(tree) >= 15:
            x = {vertex: tree.degree(vertex) - 1 for vertex in tree}
            B3 = sum(comb(value, 3) for value in x.values())
            E = sum(x[u] * x[v] for u, v in tree.edges())
            tau = B3 + E - (N - 2)
            assert 3 * tau <= (N - 3) * B2
            assert sp.Rational(delta1, a * b) >= lower_value
        checks.append((target, delta1, sp.factor(lower_value)))
    return checks


def literal_replay(lower, symbols):
    records = []
    trees = roots = ranks = 0
    # Exact raw identity on every root of every small unlabeled tree.
    for order in range(5, 11):
        for index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            trees += 1
            for root in tree:
                values = literal_check(tree, root, lower, symbols)
                roots += 1
                ranks += len(values)
                records.extend(
                    f"small|{order}|{index}|{root}|{target}|{delta}|{bound}"
                    for target, delta, bound in values
                )

    # Larger exact lower-bound replay: structured trees plus deterministic
    # Prufer trees, all roots.  This is a formula audit, not the proof.
    rng = random.Random(99301)
    for order in (15, 16, 18, 22):
        family = [nx.path_graph(order), nx.star_graph(order - 1)]
        for _ in range(8):
            family.append(nx.from_prufer_sequence([
                rng.randrange(order) for _ in range(order - 2)
            ]))
        for index, tree0 in enumerate(family):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            trees += 1
            for root in tree:
                values = literal_check(tree, root, lower, symbols)
                roots += 1
                ranks += len(values)
                records.extend(
                    f"large|{order}|{index}|{root}|{target}|{delta}|{bound}"
                    for target, delta, bound in values
                )
    return {
        "trees": trees,
        "roots": roots,
        "supported_j4plus_rank_checks": ranks,
        "value_stream_sha256": hashlib.sha256(
            "\n".join(records).encode("ascii")
        ).hexdigest().upper(),
    }


def main():
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS
    tail = json.loads((HERE / "terminal_q3_payment_newton_tail_independent_20260828.json").read_text())
    anchor = json.loads((HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json").read_text())
    forest_q32 = json.loads((HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json").read_text())
    finite = json.loads((HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json").read_text())
    assert tail["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION"
    assert anchor["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"
    assert forest_q32["status"] == "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0

    data = symbolic_lower()
    N, j, r, d, R, B2, tau, y = data["symbols"]
    S, W, p0, p1, R0, R1, a, z2, h2, c0, A0, A1 = data["coordinates"]

    # Sign-sensitive inputs, checked symbolically.
    ebar_symbol = sp.symbols("ebar", nonnegative=True)
    q0 = (j + 1) * (c0 + R0) - 3 * ebar_symbol * (p0 + a)
    q1 = (j + 1) * (a + R1) - 3 * ebar_symbol * p1 - 3 * (p0 + a + p1)
    remainder = p0 * q1 + p1 * q0 + p1 * q1
    adverse_ebar = sp.factor(-sp.diff(remainder, ebar_symbol))
    assert sp.factor(adverse_ebar - 3 * p1 * (2 * p0 + a + p1)) == 0

    # For j>=4, r<=N-4 and U1>=1+j/(r+1), while a>=C(N-1,2).
    tau_slope_margin = sp.factor(
        C(N - 1, 2) * (N + 1) / (N - 3) - p1
    )
    assert sp.factor(tau_slope_margin - 4 / (N - 3)) == 0

    # The pinned Zagreb input uses n=N+1:
    # 7X<=2(N-3)B2-6B3 and B3<=(N-3)B2/3.  Therefore
    # tau=B3+X<=(N-3)B2/3 exactly.
    B3, X = sp.symbols("B3 X", nonnegative=True)
    zagreb_x_cap = (2 * (N - 3) * B2 - 6 * B3) / 7
    tau_after_zagreb = sp.factor(B3 + zagreb_x_cap)
    tau_cap = sp.factor(tau_after_zagreb.subs(B3, (N - 3) * B2 / 3))
    assert sp.factor(tau_cap - (N - 3) * B2 / 3) == 0

    symbols = (j, r, d, R, B2, y)
    j5plus = j5plus_certificate(data["lower"], symbols)
    j4 = j4_certificate(data["lower"], symbols)
    star = star_center_certificate(data["lower"], symbols)
    literal = literal_replay(data["lower"], symbols)

    report = {
        "schema": "terminal-q3-low-newton-m1-j4plus-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP",
        "claim": (
            "In the strong-induction step for every tree base G of order n>=15, "
            "every marked vertex, and every supported target j>=4, the Newton "
            "m=1 coefficient of the normalized untruncated terminal included-payment "
            "margin is nonnegative. The only inductive input is q_j(F)<=q_3(F) on "
            "the strictly smaller deletion forest F=G-w; the pinned all-forest "
            "q_3<=q_2 theorem then supplies the cap used here."
        ),
        "scope_exclusions": [
            "target j=3 for a general marked vertex",
            "Newton degree m=0",
            "the full terminal payment",
            "Erdos Problem 993",
        ],
        "symbolic": {
            "lower_denominator": str(sp.factor(sp.together(data["lower"]).as_numer_denom()[1])),
            "lower_numerator_degrees": {
                str(variable): sp.Poly(sp.together(data["lower"]).as_numer_denom()[0], variable).degree()
                for variable in symbols
            },
            "adverse_ebar_slope": str(adverse_ebar),
            "tau_slope": str(sp.factor(data["tau_slope"])),
            "tau_slope_margin_floor": str(tau_slope_margin),
            "tau_cap": "tau<=((N-3)/3)B2",
            "root_B2_interval": "C(d-1,2)<=B2<=C(d-1,2)+C(R,2)+C(N-d-R,2)",
            "low_degree_y_cap": "0<=y<=1",
            "high_degree_y_cap": "0<=y<=(N-d)/d",
            "j4_binomial_y_cap": "y<=C(N-d,4)/(C(N-d,4)+C(d,4)) for d>=4",
        },
        "j5plus": j5plus,
        "j4": j4,
        "star_center": star,
        "literal_replay": literal,
        "order_boundary": {
            "symbolic_N_min": 15,
            "symbolic_tree_order_min": 16,
            "finite_tree_order": 15,
            "finite_m1_minimum": finite["newton_degrees"]["1"]["minimum_coefficient"],
            "finite_m1_negative_coefficients": 0,
        },
        "pins": observed,
    }
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
