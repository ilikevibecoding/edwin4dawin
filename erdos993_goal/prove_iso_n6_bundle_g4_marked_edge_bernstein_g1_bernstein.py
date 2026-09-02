#!/usr/bin/env python3
"""Independent universal theorem for the rank-six bundle coefficient g4.

The proof reconstructs g4 from eleven literal Gamma nodes, partitions the C
rows into W/A/B/Z marked-set categories, pays the induced-D block by genuine
containment, and eliminates high ranks by elementary consecutive-count bounds.
The remaining expression is certified on the exact marked-neighbour edge
budget in five geometries by rational tensor-Bernstein coefficients.

Orders 2..7 are replayed exhaustively over every atlas forest, marked pair,
and induced D subset.  Orders 8..15 use fixed-order exact Bernstein cones;
orders >=16 use a single tail cone with nonnegative power coefficients in
t=n-16.  Only rank-six g4 is claimed.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import (
    add_xd,
    forward_differences,
    independence_row,
    isolate_multiply,
    nested,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / (
    "iso_n6_bundle_g4_marked_edge_bernstein_exact_"
    "g1_bernstein_20260830.json"
)
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G4_MARKED_EDGE_BERNSTEIN_G1_BERNSTEIN"
FILES = {
    "algebra_source": "derive_iso_n6_bundle_polynomial_root.py",
    "algebra_report": "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
    "independent_algebra_source": "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py",
    "independent_algebra_report": (
        "iso_n6_bundle_algebra_finite_independent_audit_exact_"
        "g2_transfer_audit_20260830.json"
    ),
    "generic_helper_source": "audit_iso_n6_bundle_g6_g2_transfer_audit.py",
    "generic_helper_report": "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json",
}
EXPECTED_HASHES = {
    "algebra_source": "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    "algebra_report": "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    "independent_algebra_source": "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
    "independent_algebra_report": "C08ED6BB86ADCB6F4F49726C7F1C2E436DCCBDFF1343FA12EFD1EA399613BEEC",
    "generic_helper_source": "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    "generic_helper_report": "1284A8D96FB8F5E4A619EE5C60C5BD93DA67A06BB15F52DB4298B13D0C1E3F3A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reconstruct_g4():
    """Literal Gamma values and forward differences; no producer formula."""
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower_payment = sum(
            nested(isolate_multiply(crows, offset), 5)
            for offset in range(amount)
        )
        gamma.append(
            sp.expand(nested(bundled, 6) - nested(base, 6) - lower_payment)
        )
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    m = sp.symbols("M", integer=True, nonnegative=True)
    interpolation = sum(
        coefficients[index] * sp.binomial(m, index)
        for index in range(11)
    )
    for amount, value in enumerate(gamma):
        assert sp.expand(interpolation.subs(m, amount) - value) == 0
    return coefficients[4]


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    values = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= (
                        sp.binomial(location, exponent)
                        / sp.binomial(degree, exponent)
                    )
                value += coefficient * multiplier
        values[index] = sp.factor(value)
    # Exact inverse conversion to the original power coefficients.
    recovered = {}
    for monomial in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for index in itertools.product(*(range(power + 1) for power in monomial)):
            multiplier = sp.Integer(1)
            for degree, exponent, location in zip(degrees, monomial, index):
                multiplier *= (
                    sp.binomial(degree, exponent)
                    * (-1) ** (exponent - location)
                    * sp.binomial(exponent, location)
                )
            value += multiplier * values[index]
        recovered[monomial] = sp.expand(value)
    assert all(
        sp.expand(recovered[index] - power.get(index, 0)) == 0
        for index in recovered
    )
    return degrees, values


def certify_bernstein(expression, variables, tail=None, strict=False):
    degrees, values = tensor_bernstein(expression, variables)
    stream = hashlib.sha256()
    minimum = None
    scalar_minimum = None
    scalar_count = 0
    for index in sorted(values):
        value = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        if tail is None:
            assert value.is_nonnegative is True, (degrees, index, value)
            minimum = value if minimum is None else min(minimum, value)
        else:
            polynomial = sp.Poly(sp.expand(value), tail)
            assert polynomial.free_symbols <= {tail}
            coefficients = polynomial.all_coeffs()
            assert all(coefficient >= 0 for coefficient in coefficients), (
                degrees, index, value, coefficients
            )
            scalar_count += len(coefficients)
            local_minimum = min(coefficients)
            scalar_minimum = (
                local_minimum if scalar_minimum is None
                else min(scalar_minimum, local_minimum)
            )
            at_zero = sp.expand(value.subs(tail, 0))
            minimum = at_zero if minimum is None else min(minimum, at_zero)
    if strict:
        assert minimum > 0
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_coefficients": len(values),
        "minimum_at_tail_zero" if tail is not None else "minimum_coefficient": str(minimum),
        "tail_power_coefficients": scalar_count,
        "minimum_tail_power_coefficient": (
            str(scalar_minimum) if scalar_minimum is not None else None
        ),
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def marked_geometry_branches(m, a, b, c, d):
    """Five exhaustive boxes for marked-neighbour counts and W edges."""
    branches = []
    # uv adjacent.  Triangle-freeness makes marked neighbour sets disjoint,
    # and e(W)+x+y<=m.
    x = m * a
    y = m * (1 - a) * b
    edges = m * (1 - a) * (1 - b) * c
    branches.append(("adjacent", (a, b, c, d), x, y, edges, 0, 0))

    # uv nonadjacent with their unique possible common neighbour.
    budget = m - 1
    xp = budget * a
    yp = budget * (1 - a) * b
    edges = budget * (1 - a) * (1 - b) * c
    branches.append((
        "nonadjacent_common1", (a, b, c, d),
        1 + xp, 1 + yp, edges, 1, m - 1 - xp - yp,
    ))

    # uv nonadjacent without a common neighbour.  For s=x+y equal to 0 or 1,
    # the independent W-forest cap e<=m-1 is active.
    branches.append((
        "nonadjacent_common0_sum0", (c, d),
        sp.Integer(0), sp.Integer(0), (m - 1) * c, 1, m,
    ))
    branches.append((
        "nonadjacent_common0_sum1", (c, d),
        sp.Integer(1), sp.Integer(0), (m - 1) * c, 1, m - 1,
    ))

    # For 2<=s<=m, the full forest edge budget e+s<=m+1 is active.
    total = 2 + (m - 2) * a
    x = total * b
    y = total * (1 - b)
    edges = (m + 1 - total) * c
    branches.append((
        "nonadjacent_common0_sum_ge2", (a, b, c, d),
        x, y, edges, 1, m - total,
    ))
    return branches


def substitute_edge_geometry(expression, n, n_value, branch):
    label, variables, x, y, edges, z2, z3 = branch
    m = n_value - 2
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    wedge_parameter = variables[-1]
    # In a forest, W3=C(m,3)-e(m-2)+Omega and
    # 0<=Omega<=C(e,2)<=e^2/2.  The box parameter covers this superset.
    ww2 = m * (m - 1) / 2 - edges
    ww3 = (
        m * (m - 1) * (m - 2) / 6
        - edges * (m - 2)
        + edges**2 * wedge_parameter / 2
    )
    formulas = {
        "A2": m - x,
        "B2": m - y,
        "W2": ww2,
        "W3": ww3,
        "Z2": z2,
        "Z3": z3,
    }
    replacements = {n: n_value}
    replacements.update(
        (names[name], formula) for name, formula in formulas.items()
        if name in names
    )
    value = sp.factor(expression.subs(replacements))
    return label, tuple(variable for variable in variables if variable in value.free_symbols), value


def finite_atlas_replay(partitioned, n):
    names = {str(symbol): symbol for symbol in partitioned.free_symbols}
    argument_names = (
        "n", "W2", "W3", "W4", "W5", "W6",
        "A2", "A3", "A4", "A5", "A6",
        "B2", "B3", "B4", "B5", "B6",
        "Z2", "Z3", "Z4", "Z5", "Z6",
        "dE4", "dE5", "dU3", "dU4", "dU5",
        "dV3", "dV4", "dV5", "dW2", "dW3", "dW4",
    )
    evaluate = sp.lambdify(
        tuple(names[name] for name in argument_names), partitioned, "math"
    )
    marked_cells = partition_checks = induced_cells = 0
    minimum = None
    witness = None
    per_order = {}
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        nodes = tuple(graph)
        order = len(graph)
        order_row = per_order.setdefault(
            str(order), {"marked_cells": 0, "induced_D_cells": 0, "minimum_g4": None}
        )
        for u, v in itertools.combinations(nodes, 2):
            marked_cells += 1
            order_row["marked_cells"] += 1
            crows = []
            for removed in ((), (u,), (v,), (u, v)):
                reduced = graph.copy()
                reduced.remove_nodes_from(removed)
                crows.append(independence_row(reduced, 6))
            e, ru, rv, w = crows
            categories = {}
            for rank in range(2, 7):
                categories[("W", rank)] = w[rank]
                categories[("A", rank)] = ru[rank] - w[rank]
                categories[("B", rank)] = rv[rank] - w[rank]
                categories[("Z", rank)] = e[rank] - ru[rank] - rv[rank] + w[rank]
                literal = {family: 0 for family in "WABZ"}
                for chosen in itertools.combinations(nodes, rank):
                    if any(
                        graph.has_edge(left, right)
                        for left, right in itertools.combinations(chosen, 2)
                    ):
                        continue
                    has_u, has_v = u in chosen, v in chosen
                    family = (
                        "Z" if has_u and has_v else
                        "B" if has_u else "A" if has_v else "W"
                    )
                    literal[family] += 1
                assert all(
                    categories[(family, rank)] == literal[family]
                    for family in "WABZ"
                )
                partition_checks += 4
            assert categories[("Z", 2)] in (0, 1)

            for mask in range(1 << order):
                retained = [node for node in nodes if mask & (1 << node)]
                dgraph = graph.subgraph(retained).copy()
                drows = []
                for removed in ((), (u,), (v,), (u, v)):
                    reduced = dgraph.copy()
                    reduced.remove_nodes_from(removed)
                    drows.append(independence_row(reduced, 6))
                de, du, dv, dw = drows
                values = {
                    "n": order,
                    **{
                        f"{family}{rank}": categories[(family, rank)]
                        for family in "WABZ" for rank in range(2, 7)
                    },
                    "dE4": de[4], "dE5": de[5],
                    "dU3": du[3], "dU4": du[4], "dU5": du[5],
                    "dV3": dv[3], "dV4": dv[4], "dV5": dv[5],
                    "dW2": dw[2], "dW3": dw[3], "dW4": dw[4],
                }
                value = int(evaluate(*(values[name] for name in argument_names)))
                assert value > 0
                stream.update(f"{order}|{graph6}|{u}|{v}|{mask}|{value};".encode())
                induced_cells += 1
                order_row["induced_D_cells"] += 1
                order_row["minimum_g4"] = (
                    value if order_row["minimum_g4"] is None
                    else min(order_row["minimum_g4"], value)
                )
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "order": order, "graph6": graph6,
                        "u": u, "v": v, "retained_mask": mask,
                        "g4": value,
                    }
    assert marked_cells == 1224
    assert induced_cells == 122512
    assert minimum == 22
    return {
        "orders": [2, 7],
        "unlabeled_forest_marked_cells": marked_cells,
        "literal_partition_checks": partition_checks,
        "all_induced_D_cells": induced_cells,
        "negative_cells": 0,
        "minimum_g4": minimum,
        "minimum_witness": witness,
        "per_order": per_order,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "exhaustiveness": (
            "The NetworkX graph atlas contains every unlabeled graph through "
            "order seven. Filtering forests, testing every unordered marked pair, "
            "and every induced vertex subset for D exhausts this finite scope."
        ),
    }


def main():
    actual_hashes = {label: sha256(HERE / name) for label, name in FILES.items()}
    assert actual_hashes == EXPECTED_HASHES
    algebra = json.loads((HERE / FILES["algebra_report"]).read_text(encoding="utf-8"))
    assert algebra["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"

    generic_g4 = reconstruct_g4()
    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for family in "EUVW":
        structural[sp.Symbol(f"c{family}0")] = 1
        structural[sp.Symbol(f"d{family}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - epsilon_u,
        sp.Symbol("dV1"): q - epsilon_v,
        sp.Symbol("dW1"): q - epsilon_u - epsilon_v,
    })
    raw = sp.factor(generic_g4.subs(structural))
    algebra_g4 = algebra["binomial_coefficients"][4]
    assert algebra_g4["binomial_rank"] == 4
    generic_symbols = {str(symbol): symbol for symbol in generic_g4.free_symbols}
    assert sp.expand(
        generic_g4 - sp.sympify(algebra_g4["factor"], locals=generic_symbols)
    ) == 0
    raw_symbols = {str(symbol): symbol for symbol in raw.free_symbols}
    assert sp.expand(
        raw - sp.sympify(
            algebra_g4["first_order_structural_factor"], locals=raw_symbols
        )
    ) == 0

    rows = {
        family: {
            rank: sp.symbols(f"{family}{rank}", integer=True, nonnegative=True)
            for rank in range(2, 7)
        }
        for family in "WABZ"
    }
    partition_rules = {}
    for rank in range(2, 7):
        w, a, b, z = (rows[family][rank] for family in "WABZ")
        partition_rules.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    partitioned = sp.expand(raw.subs(partition_rules))
    names = {str(symbol): symbol for symbol in partitioned.free_symbols}
    W2, W3, W4, W5, W6 = (names[f"W{rank}"] for rank in range(2, 7))
    A2, A3, A4, A5, A6 = (names[f"A{rank}"] for rank in range(2, 7))
    B2, B3, B4, B5, B6 = (names[f"B{rank}"] for rank in range(2, 7))
    Z2, Z3, Z4, Z5, Z6 = (names[f"Z{rank}"] for rank in range(2, 7))
    dE4, dE5 = names["dE4"], names["dE5"]
    dU3, dU4, dU5 = names["dU3"], names["dU4"], names["dU5"]
    dV3, dV4, dV5 = names["dV3"], names["dV4"], names["dV5"]
    dW2, dW3, dW4 = names["dW2"], names["dW3"], names["dW4"]

    # D is an induced subgraph of C.  Split every positive D contribution off
    # and apply rowwise containment only to a negative contribution.
    d_symbols = (dE4, dE5, dU3, dU4, dU5, dV3, dV4, dV5, dW2, dW3, dW4)
    c_part = partitioned.subs({symbol: 0 for symbol in d_symbols})
    d_lower = sp.expand(
        -7 * (n - 2) * (W4 + A4 + B4 + Z4)
        - (7 * B2 + 7 * W2 + n - 4) * (W3 + A3)
        - (7 * A2 + 7 * W2 + n - 4) * (W3 + B3)
        - 7 * (W5 + A5) - 7 * (W5 + B5)
        - (A2 + 7 * A3 + B2 + 7 * B3 + 2 * W2 + 7 * W3 + 7 * Z3) * W2
        - (7 * n + 2) * W4
    )
    relaxed = sp.expand(c_part + d_lower)
    d_coefficients = {str(symbol): sp.factor(sp.diff(partitioned, symbol)) for symbol in d_symbols}
    expected_d_coefficients = {
        "dE4": -7 * (n - 2), "dE5": 12,
        "dU3": -7 * B2 - 7 * W2 - n + 4,
        "dU4": 12 * n - 10, "dU5": -7,
        "dV3": -7 * A2 - 7 * W2 - n + 4,
        "dV4": 12 * n - 10, "dV5": -7,
        "dW2": -A2 - 7 * A3 - B2 - 7 * B3 - 2 * W2 - 7 * W3 - 7 * Z3 + 2 * n,
        "dW3": 12 * A2 + 12 * B2 + 12 * W2 + 12 * Z2 + 4 * n - 4,
        "dW4": -7 * n - 2,
    }
    assert set(d_coefficients) == set(expected_d_coefficients)
    assert all(
        sp.expand(d_coefficients[label] - expected_d_coefficients[label]) == 0
        for label in d_coefficients
    )

    # Pay ranks six and five by consecutive-set upper bounds.
    top_steps = (
        (A6, (n - 6) * A5 / 5, -23),
        (B6, (n - 6) * B5 / 5, -23),
        (W6, (n - 7) * W5 / 6, -30),
        (Z6, (n - 5) * Z5 / 4, -16),
    )
    current = relaxed
    top_coefficients = []
    for variable, cap, expected in top_steps:
        coefficient = sp.factor(sp.diff(current, variable))
        assert coefficient == expected
        top_coefficients.append({"variable": str(variable), "coefficient": str(coefficient)})
        current = sp.expand(current.subs(variable, cap))
    second_steps = (
        (A5, (n - 5) * A4 / 4, -(108 * n + 67) / 5),
        (B5, (n - 5) * B4 / 4, -(108 * n + 67) / 5),
        (W5, (n - 6) * W4 / 5, -45 * n - 23),
        (Z5, (n - 4) * Z4 / 3, -5 * n - 6),
    )
    for variable, cap, expected in second_steps:
        coefficient = sp.factor(sp.diff(current, variable))
        assert sp.expand(coefficient - expected) == 0
        top_coefficients.append({"variable": str(variable), "coefficient": str(coefficient)})
        current = sp.expand(current.subs(variable, cap))

    p4 = 108 * n**2 - 313 * n + 365
    cA4 = sp.factor(sp.diff(current, A4))
    cB4 = sp.factor(sp.diff(current, B4))
    cW4 = sp.factor(sp.diff(current, W4))
    cZ4 = sp.factor(sp.diff(current, Z4))
    assert sp.expand(cA4 - (15 * W2 - B2 - p4 / 20)) == 0
    assert sp.expand(cB4 - (15 * W2 - A2 - p4 / 20)) == 0
    assert sp.expand(cW4 + (
        85 * A2 + 85 * B2 + 10 * W2 + 80 * Z2
        + 45 * n**2 + 93 * n + 52
    ) / 5) == 0
    assert sp.expand(cZ4 - (16 * W2 - (5 * n**2 - 71 * n + 84) / 3)) == 0

    floor2 = lambda h: h * (h - 3) / 2
    floor3 = lambda h: h * (h - 1) * (h - 8) / 6

    # High-order signs.  W2>=(n-3)(n-4)/2, A2,B2<=n-2.
    high_A4_scalar = sp.factor(
        15 * (n - 3) * (n - 4) / 2 - (n - 2) - p4 / 20
    )
    assert sp.expand(
        high_A4_scalar - (42 * n**2 - 757 * n + 1475) / 20
    ) == 0
    t = sp.symbols("t", integer=True, nonnegative=True)
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(
            sp.expand(high_A4_scalar.subs(n, t + 16)), t
        ).all_coeffs()
    )
    z4_scalar = sp.factor(
        16 * (n - 3) * (n - 4) / 2
        - (5 * n**2 - 71 * n + 84) / 3
    )
    assert sp.expand(z4_scalar - (19 * n**2 - 97 * n + 204) / 3) == 0
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(sp.expand(z4_scalar.subs(n, t + 8)), t).all_coeffs()
    )

    # For n>=16, A4,B4,Z4 have nonnegative coefficients; use elementary
    # forest lower floors.  W4 has a negative coefficient; use its extension cap.
    strong = sp.expand(current.subs({
        A4: floor3(A2), B4: floor3(B2),
        Z4: Z2 * floor2(Z3), W4: (n - 5) * W3 / 4,
    }))
    strong_dA = sp.factor(sp.diff(strong, A3))
    assert strong_dA == 19 * B2 + 16 * B3 + 42 * W2 + 15 * W3 + 55 * n - 84
    strong_after_A = sp.expand(strong.subs(A3, floor2(A2)))
    strong_dB = sp.factor(sp.diff(strong_after_A, B3))
    assert strong_dB == 8 * A2**2 - 5 * A2 + 42 * W2 + 15 * W3 + 55 * n - 84
    strong = sp.expand(strong_after_A.subs(B3, floor2(B2)))

    # For 8<=n<=15, discard the positive 15W2*A4/B4 pieces and pay the
    # negative remainder with 3A4<=(A2-2)A3 and its symmetric counterpart.
    loworder_pre = sp.expand(
        current - cA4 * A4 - cB4 * B4
        - (B2 + p4 / 20) * (A2 - 2) * A3 / 3
        - (A2 + p4 / 20) * (B2 - 2) * B3 / 3
    )
    loworder_pre = sp.expand(loworder_pre.subs({
        Z4: Z2 * floor2(Z3), W4: (n - 5) * W3 / 4,
    }))
    # The +16B3 contribution to d/dA3 is nonnegative and may be dropped.
    low_dA = sp.factor(sp.diff(loworder_pre, A3).subs(B3, 0))
    low_after_A = sp.expand(loworder_pre.subs(A3, floor2(A2)))
    low_dB = sp.factor(sp.diff(low_after_A, B3))
    loworder = sp.expand(low_after_A.subs(B3, floor2(B2)))
    assert sp.expand(
        strong.xreplace({A2: B2, B2: A2}) - strong
    ) == 0
    assert sp.expand(
        loworder.xreplace({A2: B2, B2: A2}) - loworder
    ) == 0

    box_a, box_b, box_c, box_d = sp.symbols(
        "a b c d", nonnegative=True
    )
    high_summaries = []
    n_high = t + 16
    for branch in marked_geometry_branches(n_high - 2, box_a, box_b, box_c, box_d):
        label, variables, expression = substitute_edge_geometry(
            strong, n, n_high, branch
        )
        summary = certify_bernstein(expression, variables, tail=t, strict=True)
        summary["geometry"] = label
        high_summaries.append(summary)

    fixed_summaries = []
    for order in range(8, 16):
        order_value = sp.Integer(order)
        for branch in marked_geometry_branches(
            order_value - 2, box_a, box_b, box_c, box_d
        ):
            label, variables, derivative_A = substitute_edge_geometry(
                low_dA, n, order_value, branch
            )
            _label, variables_B, derivative_B = substitute_edge_geometry(
                low_dB, n, order_value, branch
            )
            _label, variables_target, target = substitute_edge_geometry(
                loworder, n, order_value, branch
            )
            derivative_A_summary = certify_bernstein(
                derivative_A, variables, strict=False
            )
            derivative_B_summary = certify_bernstein(
                derivative_B, variables_B, strict=False
            )
            target_summary = certify_bernstein(
                target, variables_target, strict=True
            )
            fixed_summaries.append({
                "order": order,
                "geometry": label,
                "A3_monotonicity": derivative_A_summary,
                "B3_monotonicity_after_A_floor": derivative_B_summary,
                "target": target_summary,
            })

    # Exact n=2 boundary follows before any relaxation.
    n2_rules = {n: 2}
    for family in "WAB":
        for rank in range(2, 7):
            n2_rules[rows[family][rank]] = 0
    for rank in range(3, 7):
        n2_rules[rows["Z"][rank]] = 0
    for symbol in d_symbols:
        n2_rules[symbol] = 0
    n2_value = sp.factor(partitioned.subs(n2_rules))
    assert sp.expand(n2_value - (22 + 14 * Z2)) == 0

    finite = finite_atlas_replay(partitioned, n)
    high_total = sum(row["bernstein_coefficients"] for row in high_summaries)
    fixed_target_total = sum(
        row["target"]["bernstein_coefficients"] for row in fixed_summaries
    )
    fixed_derivative_total = sum(
        row["A3_monotonicity"]["bernstein_coefficients"]
        + row["B3_monotonicity_after_A_floor"]["bernstein_coefficients"]
        for row in fixed_summaries
    )
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g4",
        "theorem": (
            "For every forest-realizable marked rank-six sibling-bundle cell, "
            "the binomial coefficient g4 is strictly positive."
        ),
        "raw_g4_reconstruction": {
            "direct_Gamma_nodes": 11,
            "literal_forward_difference_rank": 4,
            "exact_match_to_algebra_report": True,
            "partitioned_terms": len(sp.Poly(
                partitioned, *sorted(partitioned.free_symbols, key=str)
            ).terms()),
        },
        "marked_partition": {
            "Wk": "independent k-sets containing neither mark",
            "Ak": "independent k-sets containing v but not u",
            "Bk": "independent k-sets containing u but not v",
            "Zk": "independent k-sets containing both marks; Z2 is 0 or 1",
        },
        "D_payment": {
            "exact_coefficients": {key: str(value) for key, value in d_coefficients.items()},
            "facts": [
                "D is induced inside C, so every D-row independent set is contained in the corresponding C row.",
                "Only negative D contributions use containment; dE5,dU4,dV4,dW3 and the +2n*dW2 piece are dropped as nonnegative.",
                "All negative scalar factors used here have the stated sign for n>=8.",
            ],
        },
        "high_rank_payments": {
            "coefficient_sequence": top_coefficients,
            "facts": [
                "5A6<=(n-6)A5, 4A5<=(n-5)A4 and the symmetric B inequalities.",
                "6W6<=(n-7)W5, 5W5<=(n-6)W4.",
                "4Z6<=(n-5)Z5, 3Z5<=(n-4)Z4.",
                "4W4<=(n-5)W3 and 3A4<=(A2-2)A3.",
            ],
            "forest_floors": {
                "i2_order_h": "i2>=h*(h-3)/2 from e<=h",
                "i3_order_h": (
                    "i3>=h*(h-1)*(h-8)/6; for h>=2 this is one h below "
                    "C(h,3)-h(h-2), and h=0,1 are direct"
                ),
            },
            "A4_high_order_coefficient_floor": str(high_A4_scalar),
            "Z4_coefficient_floor": str(z4_scalar),
        },
        "edge_wedge_geometry": {
            "variables": (
                "m=n-2; x,y are unmarked neighbours of v,u; e is edges in W; "
                "Omega is the W wedge count"
            ),
            "identity": "W2=C(m,2)-e; W3=C(m,3)-e*(m-2)+Omega",
            "wedge_cap": "0<=Omega<=C(e,2)<=e^2/2",
            "common_neighbour": (
                "Adjacent marks have none; nonadjacent marks have at most one, "
                "else the forest contains a cycle."
            ),
            "five_branches": [row["geometry"] for row in high_summaries],
            "coverage": (
                "Adjacent: e+x+y<=m. Nonadjacent/common1: after removing one "
                "edge from each marked degree, e+x'+y'<=m-1. Nonadjacent/common0 "
                "splits x+y=0,1,or >=2 so both e<=m-1 and e+x+y<=m+1 are exact."
            ),
        },
        "orders_16_and_above": {
            "tail": "t=n-16>=0",
            "branches": high_summaries,
            "total_bernstein_coefficients": high_total,
            "all_tail_power_coefficients_nonnegative": True,
        },
        "orders_8_through_15": {
            "branches": fixed_summaries,
            "target_bernstein_coefficients": fixed_target_total,
            "monotonicity_bernstein_coefficients": fixed_derivative_total,
            "all_exact_nonnegative": True,
        },
        "orders_2_through_7": finite,
        "n_equals_2": {"exact_value": str(n2_value), "minimum": 22},
        "dependencies_sha256": EXPECTED_HASHES,
        "scope": (
            "Universal exact sign theorem only for rank-six bundle g4. "
            "Coefficients g1..g3, the complete rank-six Bundle Payment Lemma, "
            "all-N6, higher ranks, and Erdos Problem 993 are not claimed."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_induced_D_cells": finite["all_induced_D_cells"],
        "finite_minimum": finite["minimum_g4"],
        "fixed_target_coefficients": fixed_target_total,
        "fixed_monotonicity_coefficients": fixed_derivative_total,
        "high_tail_coefficients": high_total,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
