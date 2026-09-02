#!/usr/bin/env python3
"""Exact all-order terminal-q3 Newton m=1 certificate at target j=3.

The symbolic cone covers a tree G of order n=N+1>=16 whose marked vertex
w has 2<=deg_G(w)<=N-1.  The marked-leaf sector, the marked-star-centre
boundary, and the complete n=15 boundary are pinned separately.

This proves one terminal-payment Newton coefficient.  It does not prove
Newton m=0, the full terminal payment, unimodality, or Erdos Problem 993.
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
OUTPUT = HERE / "terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json"
PINS = {
    "prove_terminal_q3_low_newton_m1_j3_leaf_independent_agent.py":
        "A2B0BCF7A3DD5DC9D9EC2D19123AB4191B4291B955AC26BFB254D2BBF7D86517",
    "terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json":
        "20521722242C30C421568E2CA6336F56AB4EDFE7A36DE3692E38AB03DCCD20F4",
    "TERMINAL_Q3_LOW_NEWTON_M1_J3_MARKED_LEAF_THEOREM_INDEPENDENT_2026-08-29.md":
        "321E302637AEE29D20B778EFEB27346040C9DE1AE75F9936E78DBA60D597E5A7",
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
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    output = {}
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = sp.Integer(0)
        for powers in itertools.product(*[range(item + 1) for item in index]):
            coefficient = polynomial.coeff_monomial(sp.prod(
                variable**power for variable, power in zip(variables, powers)
            ))
            value += coefficient * sp.prod(
                sp.binomial(index[k], powers[k])
                / sp.binomial(degrees[k], powers[k])
                for k in range(len(variables))
            )
        # Expanded form is the canonical exact coefficient stream used for
        # the q-power sign check.  Factoring hundreds of already-positive
        # coefficient polynomials is unnecessary and much slower.
        output[index] = sp.expand(value)
    return degrees, output


def symbolic_gap() -> dict[str, object]:
    N, d, R, B2, tau, y = sp.symbols(
        "N d R B2 tau y", nonnegative=True
    )
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = C(N, 2) - S
    P = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * P
    h2 = C(S, 2) - (S - R)
    b = C(N, 3) - S * (N - 2) + P
    c0 = a + z2 + h2
    R0 = (
        N * C(N, 2)
        - 2 * (W * (N - 1) + C(N, 2) - W)
        + 3 * (N - 2 + B2 + tau)
    )
    A0 = p0 * c0 - a * R0
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1

    # q3(F)<=q2(F) gives z3/b<=3*z2/(2*a).  The remainder is decreasing
    # in this ratio, so this is the only q-envelope substitution.
    ebar = 1 + y + 3 * z2 / (2 * a)
    Q0 = 4 * (c0 + R0) - 3 * ebar * (p0 + a)
    Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1

    U1 = 1 + 3 / (N - 2) + 3 * y / (N - 3)
    Uc = (N - 3 + 2 * y) / 4 + 3 * y / (N - 3)
    f4floor = (
        C(N, 4) - S * C(N - 2, 2) + P * (N - 4)
        + C(S, 2) - C(S, 3)
    )
    Ur = f4floor / b + 1 + y + h2 / b
    Ublend = (3 * Uc + Ur) / 4
    gap = sp.factor(4 * (A0 * U1 + A1 * (Ublend + U1)) + remainder)

    L = B2 - C(d - 1, 2)
    tcap = sp.factor(
        C(d - 1, 3) + (d - 2) * (R - 1)
        + 3 * L + 4 * (S - 2) * L / 3
    )
    hbin = sp.factor(C(S, 3) / b)
    return {
        "symbols": (N, d, R, B2, tau, y),
        "coordinates": (S, W, p0, p1, R0, R1, a, P, z2, h2, b, c0, A0, A1),
        "U1": U1,
        "Uc": Uc,
        "Ur": Ur,
        "Ublend": Ublend,
        "f4floor": f4floor,
        "gap": gap,
        "tcap": tcap,
        "hbin": hbin,
    }


def structural_identities(data: dict[str, object]) -> dict[str, str]:
    N, d, R, B2, tau, y = data["symbols"]
    S, W, p0, p1, R0, R1, a, P, z2, h2, b, c0, A0, A1 = data["coordinates"]
    x, child = sp.symbols("x child", integer=True, nonnegative=True)

    # Edgewise inequality used after orienting every component of F away
    # from its prescribed root.  C(x-child,2)>=0 for integer x-child.
    edge_identity = sp.factor(
        C(x, 2) + C(child, 2) - (x - 1) * child - C(x - child, 2)
    )
    assert edge_identity == 0
    moment_identity = sp.factor(x * C(x, 2) - 3 * C(x, 3) - 2 * C(x, 2))
    assert moment_identity == 0
    third_moment_identity = sp.factor(3 * C(x, 3) - (x - 2) * C(x, 2))
    assert third_moment_identity == 0
    internal_edge_identity = sp.factor(
        x * child - 1
        - ((x - 1) + (child - 1) + (x - 1) * (child - 1))
    )
    assert internal_edge_identity == 0

    EF = sp.symbols("EF")
    tau_split = sp.factor(
        (d - 1) * R + EF - (N - 2)
        - ((d - 2) * (R - 1) + EF - (S - R))
    )
    assert tau_split == 0

    # At the minimum P=0, b still dominates the entire C(S,3) shadow when
    # d>=2.  The displayed factor is coefficient-positive after S=N-d>=1.
    b_shadow = sp.factor((b - C(S, 3)).subs(P, 0))
    expected_shadow = sp.factor(
        (d - 2) * (3 * N**2 - 3 * N * d - 6 * N + d**2 + 5 * d) / 6
    )
    assert sp.factor(b_shadow - expected_shadow) == 0

    # Inclusion-exclusion for four-sets in a forest.  The only discarded
    # coordinate is T3(F), the number of connected three-edge subtrees, and
    # T3(F)<=C(S,3).
    T3 = sp.symbols("T3", nonnegative=True)
    f4_exact = C(N, 4) - S * C(N - 2, 2) + P * (N - 4) + C(S, 2) - T3
    assert sp.factor(
        f4_exact.subs(T3, C(S, 3)) - data["f4floor"]
    ) == 0

    return {
        "oriented_edge_square_identity":
            "C(x,2)+C(y,2)-(x-1)y=C(x-y,2)>=0 for integer x-y",
        "weighted_second_moment_identity": "x*C(x,2)=3*C(x,3)+2*C(x,2)",
        "third_moment_identity": "3*C(x,3)=(x-2)C(x,2)",
        "tau_lower_endpoint": (
            "tau=B3+E-(N-2)>=0: on a nontrivial internal-vertex skeleton, "
            "sum_edges(xu*xv-1)>=sum_v(xv-1)=leaves-2; the one-internal-"
            "vertex star is direct in the operative range"
        ),
        "tau_cap": (
            "tau<=C(d-1,3)+(d-2)(R-1)+3L+4(S-2)L/3, "
            "L=B2-C(d-1,2)"
        ),
        "b_minus_shadow_at_P0": str(expected_shadow),
        "rank4_floor": str(data["f4floor"]),
    }


def cone_certificate(data: dict[str, object]) -> dict[str, object]:
    N, d, R, B2, tau, y = data["symbols"]
    S, W, p0, p1, R0, R1, a, P, z2, h2, b, c0, A0, A1 = data["coordinates"]
    gap, tcap, hbin = data["gap"], data["tcap"], data["hbin"]
    q, u, v, w = sp.symbols("q u v w", nonnegative=True)

    # Corner reduction is valid because the retained rational function has
    # denominators independent of y,tau and is affine in either variable
    # after the other is fixed (equivalently, it is bilinear jointly).
    assert sp.factor(sp.diff(gap, y, 2)) == 0
    assert sp.factor(sp.diff(gap, tau, 2)) == 0

    Nbox = 15 + q
    dbox = 2 + (Nbox - 3) * u
    Sbox = Nbox - dbox
    Rbox = 1 + (Sbox - 1) * v
    blo = C(dbox - 1, 2)
    bhi = blo + C(Rbox, 2) + C(Sbox - Rbox, 2)
    Bbox = blo + (bhi - blo) * w
    box = {N: Nbox, d: dbox, R: Rbox, B2: Bbox}

    # Clear only denominators whose signs have been proved.  For N>=15,
    # a=i2(F)>0 and b=i3(F)>=C(S,3)>0 (strict also when S<3).
    D0 = sp.factor(576 * a * b * (N - 2))
    Dh = sp.factor(D0 * (N - 3))
    gap0 = sp.together(gap.subs(y, 0))
    gaph = sp.together(gap0 + hbin * sp.diff(gap, y))
    cleared0 = sp.cancel(D0 * gap0)
    clearedh = sp.cancel(Dh * gaph)
    assert sp.together(cleared0).as_numer_denom()[1] == 1
    assert sp.together(clearedh).as_numer_denom()[1] == 1

    faces = {}
    stream = []
    total = 0
    minimum = None
    zero_power_coefficients = 0
    for yname, cleared in (("y0", cleared0), ("yhbin", clearedh)):
        for tname, tvalue in (("t0", 0), ("tcap", tcap)):
            polynomial = sp.expand(cleared.subs(tau, tvalue).subs(box, simultaneous=True))
            degrees, coefficients = tensor_bernstein(polynomial, (u, v, w))
            face_stream = []
            for index in sorted(coefficients):
                qpoly = sp.Poly(sp.expand(coefficients[index]), q)
                values = qpoly.all_coeffs()
                assert values
                assert all(value >= 0 for value in values), (
                    yname, tname, index, coefficients[index]
                )
                assert any(value > 0 for value in values), (
                    yname, tname, index, coefficients[index]
                )
                zero_power_coefficients += sum(value == 0 for value in values)
                for value in values:
                    if value > 0 and (minimum is None or value < minimum):
                        minimum = value
                record = f"{yname}|{tname}|{index}|{sp.srepr(coefficients[index])}"
                stream.append(record)
                face_stream.append(record)
            label = f"{yname}_{tname}"
            faces[label] = {
                "degrees": list(degrees),
                "bernstein_coefficients": len(coefficients),
                "coefficient_stream_sha256": hashlib.sha256(
                    "\n".join(face_stream).encode("ascii")
                ).hexdigest().upper(),
            }
            total += len(coefficients)
            print(label, faces[label], flush=True)

    assert minimum is not None and minimum > 0
    return {
        "parameter_box": {
            "N": "15+q, q>=0",
            "d": "2+(N-3)u",
            "R": "1+(N-d-1)v",
            "B2": "C(d-1,2)+w[C(R,2)+C(N-d-R,2)]",
            "unit_variables": ["u", "v", "w"],
        },
        "positive_clearers": {
            "y0": "576*i2(F)*i3(F)*(N-2)",
            "yhbin": "576*i2(F)*i3(F)*(N-2)*(N-3)",
        },
        "faces": faces,
        "total_bernstein_coefficients": total,
        "minimum_positive_power_coefficient": str(minimum),
        "zero_power_coefficients": zero_power_coefficients,
        "coefficient_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def star_certificate(data: dict[str, object]) -> dict[str, str]:
    N, d, R, B2, tau, y = data["symbols"]
    q = sp.symbols("q", nonnegative=True)
    value = sp.factor(data["gap"].subs({
        d: N,
        R: 0,
        B2: C(N - 1, 2),
        tau: C(N - 1, 3) - (N - 2),
        y: 0,
    }))
    expected = sp.factor(
        (4 * N**5 + 25 * N**4 - 37 * N**3 + 104 * N**2 - 72 * N + 72)
        / (6 * (N - 2))
    )
    assert sp.factor(value - expected) == 0
    shifted = sp.factor(value.subs(N, 15 + q))
    shifted_expected = (
        4 * q**5 + 325 * q**4 + 10463 * q**3 + 167189 * q**2
        + 1328073 * q + 4200642
    ) / (6 * (q + 13))
    assert sp.factor(shifted - shifted_expected) == 0
    assert all(coefficient > 0 for coefficient in sp.Poly(
        sp.together(shifted_expected).as_numer_denom()[0], q
    ).all_coeffs())
    return {
        "exact_normalized_margin": str(expected),
        "N_equals_15_plus_q": str(sp.factor(shifted_expected)),
    }


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
    """Independent-set and exactly-one-edge rows by tree messages."""

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


def literal_check(tree, root, data):
    Nsym, dsym, Rsym, B2sym, tausym, ysym = data["symbols"]
    rows = TreeRows(tree)
    whole_zero, whole_one = rows.whole()
    fzero, fone = rows.forest(root)
    hzero, _ = rows.forest(root, closed=True)
    N = len(tree) - 1
    d = tree.degree(root)
    S = N - d
    R = sum(tree.degree(vertex) - 1 for vertex in tree.neighbors(root))
    B2 = sum(comb(degree - 1, 2) for _, degree in tree.degree())
    W = N - 1 + B2
    a = coeff(fzero, 2)
    b = coeff(fzero, 3)
    if not a or not b:
        return None
    z2 = coeff(fone, 3)
    z3 = coeff(fone, 4)
    h2 = coeff(hzero, 2)
    h3 = coeff(hzero, 3)
    f4 = coeff(fzero, 4)
    P = W - comb(d, 2) - R
    assert a == comb(N, 2) - S
    assert b == comb(N, 3) - S * (N - 2) + P
    assert z2 == S * (N - 2) - 2 * P
    assert h2 == comb(S, 2) - (S - R)
    assert 2 * a * z3 <= 3 * b * z2

    delta = []
    ingredients = []
    for t in (1, 2):
        p = with_isolates(whole_zero, 3, t)
        rrow = with_isolates(whole_one, 4, t)
        urow = with_isolates(whole_zero, 4, t)
        c = z2 + h2 + t * a
        e = z3 + h3 + t * b
        anchor = p * c - a * rrow
        qrow = 4 * b * (c + rrow) - 3 * (p + a) * e
        value = a * (4 * anchor * urow + p * qrow)
        delta.append(value)
        ingredients.append((p, rrow, urow, c, e, anchor, qrow))
    delta1 = delta[1] - delta[0]
    p0, r0, u0, c0, e0, A0, q0 = ingredients[0]
    p1 = ingredients[1][0] - p0
    r1 = ingredients[1][1] - r0
    u1 = ingredients[1][2] - u0
    A1 = ingredients[1][5] - A0
    q1 = ingredients[1][6] - q0
    rebuilt = a * (4 * (A0 * u1 + A1 * u0 + A1 * u1)
                   + p0 * q1 + p1 * q0 + p1 * q1)
    assert rebuilt == delta1
    assert A0 >= 0 and A1 >= 0

    yvalue = sp.Rational(h3, b)
    U1floor = 1 + sp.Rational(3, N - 2) + 3 * yvalue / (N - 3)
    Uc = sp.Rational(N - 3, 4) + yvalue / 2 + 3 * yvalue / (N - 3)
    f4floor = (
        comb(N, 4) - S * comb(N - 2, 2) + P * (N - 4)
        + comb(S, 2) - comb(S, 3)
    )
    Ur = sp.Rational(f4floor, b) + 1 + yvalue + sp.Rational(h2, b)
    assert sp.Rational(u1, b) >= U1floor
    assert sp.Rational(u0, b) >= Uc
    assert f4 >= f4floor
    assert sp.Rational(u0, b) >= Ur

    x = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    B3 = sum(comb(value, 3) for value in x.values())
    E = sum(x[u] * x[v] for u, v in tree.edges())
    tau = B3 + E - (N - 2)
    L = B2 - comb(d - 1, 2)
    # The path-surplus endpoint is pinned only from tree order 15 onward;
    # the symbolic cone begins at order 16.  Small trees above audit raw row
    # identities and extension floors only, never the large-order endpoint.
    if len(tree) >= 16:
        assert tau >= 0
        if 2 <= d <= N - 1:
            assert 1 <= R <= S
            assert comb(d - 1, 2) <= B2
            assert B2 <= comb(d - 1, 2) + comb(R, 2) + comb(S - R, 2)
            tcap = (
                comb(d - 1, 3) + (d - 2) * (R - 1)
                + 3 * L + sp.Rational(4 * (S - 2) * L, 3)
            )
            assert tau <= tcap
            assert h3 <= comb(S, 3)
            assert b >= comb(S, 3)
            gap_value = data["gap"].subs({
                Nsym: N, dsym: d, Rsym: R, B2sym: B2,
                tausym: tau, ysym: yvalue,
            })
            assert sp.Rational(delta1, a * b) >= gap_value
    return (d, delta1, tau, yvalue)


def literal_replay(data: dict[str, object]) -> dict[str, object]:
    records = []
    trees = roots = checks = cone_checks = 0
    for order in range(5, 11):
        for index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            trees += 1
            for root in tree:
                value = literal_check(tree, root, data)
                roots += 1
                if value is not None:
                    checks += 1
                    records.append(f"small|{order}|{index}|{root}|{value}")

    rng = random.Random(99313)
    for order in (16, 18, 22):
        family = [nx.path_graph(order), nx.star_graph(order - 1)]
        for _ in range(8):
            family.append(nx.from_prufer_sequence([
                rng.randrange(order) for _ in range(order - 2)
            ]))
        for index, tree0 in enumerate(family):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            trees += 1
            for root in tree:
                value = literal_check(tree, root, data)
                roots += 1
                if value is not None:
                    checks += 1
                    cone_checks += 2 <= value[0] <= order - 2
                    records.append(f"large|{order}|{index}|{root}|{value}")
    return {
        "trees": trees,
        "roots": roots,
        "target_j3_identity_checks": checks,
        "general_root_cone_checks": cone_checks,
        "value_stream_sha256": hashlib.sha256(
            "\n".join(records).encode("ascii")
        ).hexdigest().upper(),
    }


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS
    leaf = json.loads((HERE / "terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json").read_text())
    anchor = json.loads((HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json").read_text())
    forest_q32 = json.loads((HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json").read_text())
    finite = json.loads((HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json").read_text())
    rank4 = json.loads((HERE / "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json").read_text())
    assert leaf["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M1_J3_MARKED_LEAF"
    assert anchor["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"
    assert forest_q32["status"] == "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    assert rank4["status"] == "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT"
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0
    assert finite["coverage"]["finite"] == {
        "trees": 13_188,
        "roots": 188_260,
        "rank_cells": 1_222_653,
        "coefficients": 9_781_224,
    }

    data = symbolic_gap()
    structural = structural_identities(data)
    cone = cone_certificate(data)
    assert cone["total_bernstein_coefficients"] > 0
    star = star_certificate(data)
    literal = literal_replay(data)

    report = {
        "schema": "terminal-q3-low-newton-m1-j3-general-root-exact-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3",
        "claim": (
            "For every tree base G of order n>=15 and every marked vertex, "
            "the Newton m=1 coefficient at terminal target j=3 is nonnegative. "
            "The symbolic cone covers n>=16 and degrees 2..n-2; pinned exact "
            "certificates cover marked leaves, star centres, and n=15."
        ),
        "scope_exclusions": [
            "Newton degree m=0",
            "forest bases beyond the separately proved sectors",
            "the full terminal payment",
            "unimodality",
            "Erdos Problem 993",
        ],
        "structural_identities": structural,
        "endpoint_logic": (
            "The retained lower is bilinear in y and tau.  On every realizable "
            "rectangle 0<=y<=C(N-d,3)/i3(F), 0<=tau<=tau_cap, its minimum is "
            "attained at one of the four certified corners."
        ),
        "extension_floor": (
            "U0/i3(F) is at least both the coupled extension floor and the "
            "rank-four inclusion-exclusion floor, hence at least their fixed "
            "convex blend (3*coupled+rank4)/4."
        ),
        "cone": cone,
        "marked_star_center": star,
        "literal_replay": literal,
        "order_boundary": {
            "symbolic_N_min": 15,
            "symbolic_tree_order_min": 16,
            "finite_tree_order": 15,
            "finite_m1_minimum": finite["newton_degrees"]["1"]["minimum_coefficient"],
            "finite_m1_negative_coefficients": 0,
        },
        "pins": observed,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
