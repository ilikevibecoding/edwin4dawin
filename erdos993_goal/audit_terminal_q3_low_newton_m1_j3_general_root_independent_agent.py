#!/usr/bin/env python3
"""Independent exact audit of tree terminal-q3 Newton m=1 at target j=3.

This source does not import the producer or its symbolic helpers.  It rebuilds
the retained Newton row, the four endpoint polynomials, every tensor-
Bernstein coefficient, and a direct-subset literal replay independently.

Exact scope: tree bases only, target j=3, Newton m=1.  It does not claim m=0,
the full terminal payment, unimodality, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path
import random

import networkx as nx
import sympy as sy


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "terminal_q3_low_newton_m1_j3_general_root_independent_audit_20260829.json"
PINS = {
    # Filled only after the producer's atomic PASS report is frozen.
    "prove_terminal_q3_low_newton_m1_j3_general_root.py":
        "5C73254AB22746911187FFCF38E79560D9C250173969D92700AB1B752AD70E61",
    "terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json":
        "012F97B1DD1E7DC42C4733DB67F7C7D77B8F10D89E4198190B1EE08F0CA01385",
    "TERMINAL_Q3_LOW_NEWTON_M1_J3_ALL_ROOT_THEOREM_2026-08-29.md":
        "AFC8C00254B4CB108CB7F0E82E2146DF7143345E7683E299C957AD83C8A31D4C",
    "prove_terminal_q3_low_newton_m1_j3_leaf_independent_agent.py":
        "A2B0BCF7A3DD5DC9D9EC2D19123AB4191B4291B955AC26BFB254D2BBF7D86517",
    "terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json":
        "20521722242C30C421568E2CA6336F56AB4EDFE7A36DE3692E38AB03DCCD20F4",
    "audit_terminal_q3_anchor_ordering_independent_agent.py":
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(x, k: int):
    answer = sy.Integer(1)
    for offset in range(k):
        answer *= x - offset
    return sy.cancel(answer / sy.factorial(k))


def reconstruct_lower():
    """Rebuild the retained lower directly from Newton degree-one products."""
    M, D, T, E, Z, Y = sy.symbols("M D T E Z Y", nonnegative=True)
    H = M - D
    wedge = M - 1 + Z

    # P=i3(G+K_(1+s)) and the one-edge four-row R.
    p_0 = M**3 / 6 - M**2 / 2 + M / 3 + wedge
    p_1 = (M**2 + M + 2) / 2
    r_1 = M**2 - 2 * wedge
    r_0 = (
        M * choose(M, 2)
        - 2 * (wedge * (M - 1) + choose(M, 2) - wedge)
        + 3 * (M - 2 + Z + T)
    )

    low_a = choose(M, 2) - H
    forest_wedges = wedge - choose(D, 2) - E
    one3 = H * (M - 2) - 2 * forest_wedges
    h2 = choose(H, 2) - (H - E)
    high_b = choose(M, 3) - H * (M - 2) + forest_wedges
    c_0 = low_a + one3 + h2

    anchor_0 = sy.expand(p_0 * c_0 - low_a * r_0)
    anchor_1 = sy.expand(
        p_0 * low_a + p_1 * c_0 + p_1 * low_a - low_a * r_1
    )

    # The independent all-forest q3<=q2 theorem gives
    # z3/b <= 3*z2/(2*a).  Rebuild the two Q rows after this substitution.
    edge_ratio_cap = 1 + Y + 3 * one3 / (2 * low_a)
    q_0 = 4 * (c_0 + r_0) - 3 * (p_0 + low_a) * edge_ratio_cap
    q_1 = (
        4 * (low_a + r_1)
        - 3 * p_1 * edge_ratio_cap
        - 3 * (p_0 + low_a + p_1)
    )
    low_remainder = sy.expand(p_0 * q_1 + p_1 * q_0 + p_1 * q_1)

    # Two independent U0 floors and their fixed convex blend.
    u_1 = 1 + 3 / (M - 2) + 3 * Y / (M - 3)
    u_coupled = (M - 3 + 2 * Y) / 4 + 3 * Y / (M - 3)
    f4_floor = (
        choose(M, 4)
        - H * choose(M - 2, 2)
        + forest_wedges * (M - 4)
        + choose(H, 2)
        - choose(H, 3)
    )
    u_rank4 = f4_floor / high_b + 1 + Y + h2 / high_b
    u_0 = (3 * u_coupled + u_rank4) / 4

    retained = sy.factor(
        4 * (anchor_0 * u_1 + anchor_1 * (u_0 + u_1))
        + low_remainder
    )

    excess = Z - choose(D - 1, 2)
    tau_ceiling = sy.factor(
        choose(D - 1, 3)
        + (D - 2) * (E - 1)
        + 3 * excess
        + sy.Rational(4, 3) * (H - 2) * excess
    )
    y_ceiling = sy.factor(choose(H, 3) / high_b)
    return {
        "symbols": (M, D, E, Z, T, Y),
        "rows": (
            H, wedge, p_0, p_1, r_0, r_1, low_a, forest_wedges,
            one3, h2, high_b, c_0, anchor_0, anchor_1,
        ),
        "floors": (u_1, u_coupled, f4_floor, u_rank4, u_0),
        "retained": retained,
        "tau_ceiling": tau_ceiling,
        "y_ceiling": y_ceiling,
    }


def audit_structural_lemmas(model):
    M, D, E, Z, T, Y = model["symbols"]
    H, wedge, p0, p1, r0, r1, a, P, z2, h2, b, c0, A0, A1 = model["rows"]
    x, child, Svar = sy.symbols("x child Svar", integer=True, nonnegative=True)

    assert sy.expand(
        choose(x, 2) + choose(child, 2)
        - (x - 1) * child - choose(x - child, 2)
    ) == 0
    assert sy.expand(x * choose(x, 2) - 3 * choose(x, 3) - 2 * choose(x, 2)) == 0
    assert sy.expand(3 * choose(x, 3) - (x - 2) * choose(x, 2)) == 0
    assert sy.expand(
        x * child - 1
        - (x - 1) - (child - 1) - (x - 1) * (child - 1)
    ) == 0

    # Exact split of tau at the marked root.
    EF = sy.symbols("EF")
    left = (D - 1) * E + EF - (M - 2)
    right = (D - 2) * (E - 1) + EF - (H - E)
    assert sy.expand(left - right) == 0

    # The high-row cap b>=C(H,3) is not assumed: prove it.  P is the
    # nonnegative wedge count of F.  At P=0 the difference factors below.
    # b-C(H,3) is affine with coefficient one in the literal forest-wedge
    # count P, so subtract P algebraically instead of relying on a structural
    # SymPy substitution of a compound expression.
    difference_at_zero = sy.factor(b - choose(H, 3) - P)
    inner = D**2 + 3 * D * H - D + 3 * H**2 - 6 * H
    assert sy.factor(
        difference_at_zero - (D - 2) * inner / 6
    ) == 0
    assert sy.expand(
        inner - (3 * H**2 + 2 + (D - 2) * (D + 3 * H + 1))
    ) == 0

    # Rebuild the rank-four forest inclusion-exclusion identity.  A connected
    # triple of forest edges is the only third-order correction.
    triples = sy.symbols("triples", nonnegative=True)
    exact_i4 = (
        choose(M, 4) - H * choose(M - 2, 2)
        + P * (M - 4) + choose(H, 2) - triples
    )
    assert sy.expand(
        exact_i4.subs(triples, choose(H, 3)) - model["floors"][2]
    ) == 0

    # The retained expression is genuinely bilinear in the two endpoint
    # variables, so a rectangle minimum is at a corner.
    retained = model["retained"]
    assert sy.factor(sy.diff(retained, Y, 2)) == 0
    assert sy.factor(sy.diff(retained, T, 2)) == 0

    # The q-envelope direction is independently recovered from the degree-one
    # product: increasing e0/b decreases the low remainder.
    ebar = sy.symbols("ebar")
    Q0 = 4 * (c0 + r0) - 3 * (p0 + a) * ebar
    Q1 = 4 * (a + r1) - 3 * p1 * ebar - 3 * (p0 + a + p1)
    rem = p0 * Q1 + p1 * Q0 + p1 * Q1
    adverse = sy.factor(-sy.diff(rem, ebar))
    assert sy.factor(adverse - 3 * p1 * (2 * p0 + a + p1)) == 0

    return {
        "edge_square_identity": "C(x,2)+C(y,2)-(x-1)y=C(x-y,2)",
        "tau_split_verified": True,
        "b_minus_C_H_3_at_P0": str(difference_at_zero),
        "inner_positive_decomposition": str(
            3 * H**2 + 2 + (D - 2) * (D + 3 * H + 1)
        ),
        "rank4_inclusion_exclusion_verified": True,
        "bilinear_endpoint_reduction_verified": True,
        "adverse_q_envelope_slope": str(adverse),
    }


def bernstein_tensor_independent(expression, variables):
    """Sequential power-to-Bernstein transform, independently implemented."""
    polynomial = sy.Poly(sy.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    current = {
        powers: coefficient
        for powers, coefficient in polynomial.terms()
    }
    # Poly.terms keys are complete exponent tuples.  Transform one axis at a
    # time, keeping sparse dictionaries of exact expressions.
    for axis, degree in enumerate(degrees):
        transformed = {}
        other_axes = [index for index in range(len(variables)) if index != axis]
        other_ranges = [range(degrees[index] + 1) for index in other_axes]
        for other_powers in itertools.product(*other_ranges):
            base = [0] * len(variables)
            for index, power in zip(other_axes, other_powers):
                base[index] = power
            power_values = []
            for power in range(degree + 1):
                base[axis] = power
                power_values.append(current.get(tuple(base), sy.Integer(0)))
            for endpoint in range(degree + 1):
                value = sy.Integer(0)
                for power in range(endpoint + 1):
                    value += (
                        power_values[power]
                        * sy.binomial(endpoint, power)
                        / sy.binomial(degree, power)
                    )
                base[axis] = endpoint
                transformed[tuple(base)] = sy.expand(value)
        current = transformed
    return degrees, current


def audit_four_faces(model):
    M, D, E, Z, T, Y = model["symbols"]
    H, wedge, p0, p1, r0, r1, a, P, z2, h2, b, c0, A0, A1 = model["rows"]
    retained = model["retained"]
    tau_cap = model["tau_ceiling"]
    y_cap = model["y_ceiling"]
    q, u, v, w = sy.symbols("q u v w", nonnegative=True)

    Mbox = 15 + q
    Dbox = 2 + (Mbox - 3) * u
    Hbox = Mbox - Dbox
    Ebox = 1 + (Hbox - 1) * v
    lower_B2 = choose(Dbox - 1, 2)
    upper_width = choose(Ebox, 2) + choose(Hbox - Ebox, 2)
    Zbox = lower_B2 + w * upper_width
    box = {M: Mbox, D: Dbox, E: Ebox, Z: Zbox}

    zero_face = retained.subs(Y, 0)
    slope_y = sy.diff(retained, Y)
    # Use independently chosen positive constant multiples of the natural
    # denominator clearers.  Only physical integer cells need denominator
    # positivity; there a=i2(F)>0, b=i3(F)>0, M>=15.
    clear_zero = sy.factor(48 * a * b * (M - 2))
    clear_high = sy.factor(clear_zero * (M - 3))
    zero_cleared = sy.cancel(clear_zero * zero_face)
    high_cleared = sy.cancel(clear_high * (zero_face + y_cap * slope_y))
    zero_num, zero_den = sy.together(zero_cleared).as_numer_denom()
    high_num, high_den = sy.together(high_cleared).as_numer_denom()
    # A residual positive integer constant is harmless and recorded.
    assert not zero_den.free_symbols and zero_den > 0
    assert not high_den.free_symbols and high_den > 0

    faces = {}
    global_stream = []
    minimum = None
    zeros = 0
    for y_label, cleared, residual_den in (
        ("low_y", zero_num, zero_den),
        ("high_y", high_num, high_den),
    ):
        for tau_label, tau_value in (("low_tau", 0), ("high_tau", tau_cap)):
            boxed = sy.expand(
                cleared.subs(T, tau_value).subs(box, simultaneous=True)
            )
            degrees, coefficients = bernstein_tensor_independent(boxed, (u, v, w))
            local = []
            for index in sorted(coefficients):
                q_polynomial = sy.Poly(sy.expand(coefficients[index]), q)
                values = q_polynomial.all_coeffs()
                assert values and all(value >= 0 for value in values), (
                    y_label, tau_label, index, coefficients[index]
                )
                assert any(value > 0 for value in values)
                zeros += sum(value == 0 for value in values)
                positive = [value for value in values if value > 0]
                if positive:
                    candidate = min(positive)
                    minimum = candidate if minimum is None else min(minimum, candidate)
                # Canonical audit stream differs from the producer: record the
                # q-power dictionary rather than SymPy's expression tree.
                qdict = sorted((power[0], str(value)) for power, value in q_polynomial.as_dict().items())
                record = f"{y_label}|{tau_label}|{index}|{qdict}"
                local.append(record)
                global_stream.append(record)
            label = f"{y_label}_{tau_label}"
            faces[label] = {
                "degrees": list(degrees),
                "coefficients": len(coefficients),
                "audit_stream_sha256": hashlib.sha256(
                    "\n".join(local).encode("ascii")
                ).hexdigest().upper(),
            }
            print("AUDIT_FACE", label, faces[label], flush=True)

    assert sum(face["coefficients"] for face in faces.values()) == 952
    assert minimum is not None and minimum > 0
    return {
        "faces": faces,
        "total_coefficients": 952,
        "minimum_positive_q_power_coefficient": str(minimum),
        "zero_q_power_coefficients": zeros,
        "audit_stream_sha256": hashlib.sha256(
            "\n".join(global_stream).encode("ascii")
        ).hexdigest().upper(),
        "residual_positive_denominators": {
            "low_y": str(zero_den),
            "high_y": str(high_den),
        },
    }


def subset_table(tree):
    vertices = sorted(tree)
    assert vertices == list(range(len(vertices)))
    edges = list(tree.edges())
    table = []
    for mask in range(1 << len(vertices)):
        induced = sum(
            ((mask >> left) & 1) and ((mask >> right) & 1)
            for left, right in edges
        )
        if induced <= 1:
            table.append((mask, mask.bit_count(), induced))
    return table


def rows_from_table(table, order, allowed_mask):
    independent = [0] * (order + 1)
    one_edge = [0] * (order + 1)
    forbidden = ((1 << order) - 1) ^ allowed_mask
    for mask, size, induced in table:
        if mask & forbidden:
            continue
        (independent if induced == 0 else one_edge)[size] += 1
    return independent, one_edge


def isolate_value(row, rank, count):
    return sum(
        comb(count, used) * (row[rank - used] if 0 <= rank - used < len(row) else 0)
        for used in range(min(count, rank) + 1)
    )


def literal_cell(tree, root, model, table):
    Mv = len(tree) - 1
    all_mask = (1 << len(tree)) - 1
    fmask = all_mask ^ (1 << root)
    removed = {root, *tree.neighbors(root)}
    hmask = all_mask
    for vertex in removed:
        hmask ^= 1 << vertex
    whole0, whole1 = rows_from_table(table, len(tree), all_mask)
    f0, f1 = rows_from_table(table, len(tree), fmask)
    h0, _ = rows_from_table(table, len(tree), hmask)

    a = f0[2]
    b = f0[3]
    if not a or not b:
        return None
    z2, z3 = f1[3], f1[4]
    h2, h3 = h0[2], h0[3]
    f4 = f0[4]
    values = []
    raw = []
    for isolates in (1, 2):
        p = isolate_value(whole0, 3, isolates)
        rrow = isolate_value(whole1, 4, isolates)
        urow = isolate_value(whole0, 4, isolates)
        c = z2 + h2 + isolates * a
        edge = z3 + h3 + isolates * b
        anchor = p * c - a * rrow
        qrow = 4 * b * (c + rrow) - 3 * (p + a) * edge
        values.append(a * (4 * anchor * urow + p * qrow))
        raw.append((p, rrow, urow, c, edge, anchor, qrow))
    delta1 = values[1] - values[0]
    p0, rr0, u0, c0, e0, A0, Q0 = raw[0]
    p1 = raw[1][0] - p0
    rr1 = raw[1][1] - rr0
    u1 = raw[1][2] - u0
    A1 = raw[1][5] - A0
    Q1 = raw[1][6] - Q0
    rebuilt = a * (4 * (A0 * u1 + A1 * u0 + A1 * u1)
                   + p0 * Q1 + p1 * Q0 + p1 * Q1)
    assert rebuilt == delta1

    d = tree.degree(root)
    Hcount = Mv - d
    Rcount = sum(tree.degree(vertex) - 1 for vertex in tree.neighbors(root))
    B2 = sum(comb(degree - 1, 2) for _, degree in tree.degree())
    W = Mv - 1 + B2
    Pcount = W - comb(d, 2) - Rcount
    assert a == comb(Mv, 2) - Hcount
    assert z2 == Hcount * (Mv - 2) - 2 * Pcount
    assert h2 == comb(Hcount, 2) - (Hcount - Rcount)
    assert b == comb(Mv, 3) - Hcount * (Mv - 2) + Pcount
    assert 2 * a * z3 <= 3 * b * z2
    assert A0 >= 0 and A1 >= 0

    yvalue = sy.Rational(h3, b)
    U1floor = 1 + sy.Rational(3, Mv - 2) + 3 * yvalue / (Mv - 3)
    Ucoupled = sy.Rational(Mv - 3, 4) + yvalue / 2 + 3 * yvalue / (Mv - 3)
    f4floor = (
        comb(Mv, 4) - Hcount * comb(Mv - 2, 2)
        + Pcount * (Mv - 4) + comb(Hcount, 2) - comb(Hcount, 3)
    )
    Urank4 = sy.Rational(f4floor, b) + 1 + yvalue + sy.Rational(h2, b)
    assert sy.Rational(u1, b) >= U1floor
    assert sy.Rational(u0, b) >= Ucoupled
    assert f4 >= f4floor
    assert sy.Rational(u0, b) >= Urank4

    xvalues = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    B3 = sum(comb(value, 3) for value in xvalues.values())
    edge_product = sum(xvalues[left] * xvalues[right] for left, right in tree.edges())
    tau = B3 + edge_product - (Mv - 2)
    if len(tree) >= 16 and 2 <= d <= Mv - 1:
        L = B2 - comb(d - 1, 2)
        tcap = (
            comb(d - 1, 3) + (d - 2) * (Rcount - 1)
            + 3 * L + sy.Rational(4 * (Hcount - 2) * L, 3)
        )
        assert 0 <= tau <= tcap
        assert 0 <= h3 <= comb(Hcount, 3) <= b
        M, D, E, Z, T, Y = model["symbols"]
        lower = model["retained"].subs({
            M: Mv, D: d, E: Rcount, Z: B2, T: tau, Y: yvalue,
        })
        assert sy.Rational(delta1, a * b) >= lower
        corners = [
            model["retained"].subs({
                M: Mv, D: d, E: Rcount, Z: B2,
                T: tvalue, Y: yend,
            })
            for tvalue in (0, tcap)
            for yend in (0, sy.Rational(comb(Hcount, 3), b))
        ]
        assert lower >= min(corners)
    return (len(tree), root, d, delta1, tau, yvalue)


def literal_replay_independent(model):
    records = []
    trees = roots = large_cone = 0
    for order in range(5, 10):
        for index, source in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(source, ordering="sorted")
            table = subset_table(tree)
            trees += 1
            for root in tree:
                value = literal_cell(tree, root, model, table)
                roots += 1
                if value is not None:
                    records.append(f"small|{order}|{index}|{value}")

    rng = random.Random(9931301)
    order = 16
    family = [nx.path_graph(order), nx.star_graph(order - 1)]
    for _ in range(5):
        family.append(nx.from_prufer_sequence([
            rng.randrange(order) for _ in range(order - 2)
        ]))
    for index, source in enumerate(family):
        tree = nx.convert_node_labels_to_integers(source, ordering="sorted")
        table = subset_table(tree)
        candidates = sorted({
            0,
            order // 2,
            max(tree, key=tree.degree),
            min(tree, key=tree.degree),
        })
        trees += 1
        for root in candidates:
            value = literal_cell(tree, root, model, table)
            roots += 1
            if value is not None:
                large_cone += 2 <= tree.degree(root) <= order - 2
                records.append(f"large|{order}|{index}|{value}")

    return {
        "trees": trees,
        "roots": roots,
        "literal_cells": len(records),
        "large_general_root_cone_cells": large_cone,
        "audit_value_stream_sha256": hashlib.sha256(
            "\n".join(records).encode("ascii")
        ).hexdigest().upper(),
    }


def star_boundary_independent(model):
    M, D, E, Z, T, Y = model["symbols"]
    q = sy.symbols("q", nonnegative=True)
    specialized = sy.factor(model["retained"].subs({
        D: M,
        E: 0,
        Z: choose(M - 1, 2),
        T: choose(M - 1, 3) - (M - 2),
        Y: 0,
    }))
    numerator, denominator = sy.together(specialized.subs(M, 15 + q)).as_numer_denom()
    polynomial = sy.Poly(sy.expand(numerator), q)
    assert polynomial.coeffs() and all(value > 0 for value in polynomial.coeffs())
    assert sy.Poly(sy.expand(denominator), q).coeffs()
    assert all(value >= 0 for value in sy.Poly(sy.expand(denominator), q).coeffs())
    assert denominator.subs(q, 0) > 0
    return {
        "specialized": str(specialized),
        "q_numerator_coefficients": [str(value) for value in polynomial.all_coeffs()],
        "positive_denominator": str(sy.factor(denominator)),
    }


def main():
    observed = {name: digest(BASE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)
    producer = json.loads(
        (BASE / "terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == "PASS_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3"
    assert producer["source_sha256"] == PINS["prove_terminal_q3_low_newton_m1_j3_general_root.py"]
    leaf = json.loads(
        (BASE / "terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert leaf["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M1_J3_MARKED_LEAF"
    finite = json.loads(
        (BASE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0

    model = reconstruct_lower()
    structural = audit_structural_lemmas(model)
    cone = audit_four_faces(model)
    literal = literal_replay_independent(model)
    star = star_boundary_independent(model)

    # Counts agree, but coefficient/value streams are independently encoded
    # and are deliberately not copied from the producer.
    assert producer["cone"]["total_bernstein_coefficients"] == cone["total_coefficients"] == 952
    report = {
        "schema": "terminal-q3-low-newton-m1-j3-general-root-independent-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3_AUDIT",
        "claim": (
            "Independent exact reconstruction confirms the tree-base terminal-q3 "
            "Newton m=1 coefficient at target j=3 for every marked vertex and "
            "tree order n>=15."
        ),
        "scope_exclusions": [
            "Newton degree m=0",
            "general forest bases",
            "the full terminal payment",
            "unimodality",
            "Erdos Problem 993",
        ],
        "independence": (
            "No producer helper or coefficient stream is imported. The Newton row, "
            "four endpoint polynomials, sequential Bernstein transform, q-power "
            "stream encoding, and literal subset enumeration are rebuilt here."
        ),
        "structural": structural,
        "four_face_cone": cone,
        "literal_replay": literal,
        "marked_star_center": star,
        "boundary_inputs": {
            "marked_leaf_status": leaf["status"],
            "finite_n15_m1_minimum": finite["newton_degrees"]["1"]["minimum_coefficient"],
            "finite_n15_m1_negatives": 0,
        },
        "pins": observed,
        "auditor_source": Path(__file__).name,
        "auditor_source_sha256": digest(Path(__file__)),
    }
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
