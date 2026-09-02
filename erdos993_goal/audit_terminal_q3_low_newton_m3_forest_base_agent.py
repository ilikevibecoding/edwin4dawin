#!/usr/bin/env python3
"""Exact all-forest-base lift of terminal-payment Newton degree m=3.

The j>=4 proof keeps the component deficit symbolic.  The j=3 proof keeps
the forest wedge count coupled between the low remainder and the positive
anchor payment, uses all-forest q3<=q2 plus the rooted reserve, and closes the
small disconnected band by a complete component-multiset census.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m3_forest_base_audit_20260829.json"
PINS = {
    "audit_terminal_q3_low_newton_m3_all_order_agent.py": (
        "D08DC624367D1605157C67A3AB408837F5407346EB94433807D4F9EA13EBE843"
    ),
    "terminal_q3_low_newton_m3_all_order_independent_audit_20260829.json": (
        "F1BB22801458466AB2AAE90540C4B4F2951462E105C0F61C6D8347BF61107667"
    ),
    "prove_all_forest_q3_q2_component_lift_root.py": (
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00"
    ),
    "all_forest_q3_q2_component_lift_exact_root_20260829.json": (
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442"
    ),
    "audit_all_forest_q3_q2_component_lift_independent_agent.py": (
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815"
    ),
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json": (
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D"
    ),
    "assemble_rooted_forest_q3_reserve_all_rank_independent_agent.py": (
        "FA1980F1C539A13C477A1B4A3A5F9BDB7E9B9E49AE0A914E076BA9A31F558184"
    ),
    "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json": (
        "A013FF2C5E2C3401A661A27C3503797B8C2E06DDB74C5F78314F5400523E26F3"
    ),
    "prove_terminal_q3_low_newton_m6_conditional_independent_agent.py": (
        "A1225191B4224AB0ABDA3E94E6262C13F46E591BDCC9254609EC589AC9A3E3ED"
    ),
    "terminal_q3_low_newton_m6_exact_independent_20260829.json": (
        "0F0AB60B4E248EA6619BD06E471D4776B0D043605185B27DD9D6854B17DDEAC4"
    ),
    "prove_terminal_q3_forest_anchor_lift_agent.py": (
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D"
    ),
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json": (
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def overlap(left: int, right: int, union: int) -> int:
    if not max(left, right) <= union <= left + right:
        return 0
    return factorial(union) // (
        factorial(union - left)
        * factorial(union - right)
        * factorial(left + right - union)
    )


def add_rows(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    size = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    )


def convolve(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * (len(left) + len(right) - 1)
    for i, left_value in enumerate(left):
        for j, right_value in enumerate(right):
            result[i + j] += left_value * right_value
    return tuple(result)


def union_pair(
    left: tuple[tuple[int, ...], tuple[int, ...]],
    right: tuple[tuple[int, ...], tuple[int, ...]],
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    left_i, left_c = left
    right_i, right_c = right
    return (
        convolve(left_i, right_i),
        add_rows(convolve(left_c, right_i), convolve(left_i, right_c)),
    )


def coefficient(row: tuple[int, ...], degree: int) -> int:
    return row[degree] if 0 <= degree < len(row) else 0


def forward_difference(values: list[int]) -> int:
    while len(values) > 1:
        values = [right - left for left, right in zip(values, values[1:])]
    return values[0]


def tree_type_data(graph: nx.Graph) -> dict[str, object]:
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    order = len(graph)
    adjacency = [0] * order
    for left, right in graph.edges():
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
    full_mask = (1 << order) - 1

    @lru_cache(maxsize=None)
    def independence(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        vertex_bit = mask & -mask
        vertex = vertex_bit.bit_length() - 1
        without = independence(mask ^ vertex_bit)
        with_vertex = independence(mask & ~vertex_bit & ~adjacency[vertex])
        shifted = (0,) + with_vertex
        return add_rows(without, shifted)

    @lru_cache(maxsize=None)
    def edge_residual(mask: int) -> tuple[int, ...]:
        result: tuple[int, ...] = (0,)
        for left, right in graph.edges():
            if not ((mask >> left) & 1 and (mask >> right) & 1):
                continue
            forbidden = (
                (1 << left)
                | (1 << right)
                | adjacency[left]
                | adjacency[right]
            )
            result = add_rows(result, independence(mask & ~forbidden))
        return result

    roots = []
    for marked in range(order):
        f_mask = full_mask & ~(1 << marked)
        h_mask = full_mask & ~((1 << marked) | adjacency[marked])
        roots.append(
            {
                "marked": marked,
                "F": (independence(f_mask), edge_residual(f_mask)),
                "H": (independence(h_mask), edge_residual(h_mask)),
            }
        )
    return {
        "order": order,
        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
        "pair": (independence(full_mask), edge_residual(full_mask)),
        "roots": roots,
    }


def component_multisets(
    types: list[dict[str, object]], total: int, start: int = 0
):
    chosen: list[int] = []

    def recurse(remaining: int, lower: int):
        if remaining == 0:
            yield tuple(chosen)
            return
        for index in range(lower, len(types)):
            size = int(types[index]["order"])
            if size > remaining:
                break
            chosen.append(index)
            yield from recurse(remaining - size, index)
            chosen.pop()

    yield from recurse(total, start)


def finite_disconnected_j3_census(max_order: int = 13) -> dict[str, object]:
    types: list[dict[str, object]] = []
    tree_counts: dict[str, int] = {}
    for order in range(1, max_order + 1):
        graphs = (
            [nx.empty_graph(1)]
            if order == 1
            else list(nx.nonisomorphic_trees(order))
        )
        tree_counts[str(order)] = len(graphs)
        for graph in graphs:
            types.append(tree_type_data(graph))

    @lru_cache(maxsize=None)
    def forest_pair(components: tuple[int, ...]):
        pair: tuple[tuple[int, ...], tuple[int, ...]] = ((1,), (0,))
        for index in components:
            pair = union_pair(pair, types[index]["pair"])  # type: ignore[arg-type]
        return pair

    forest_counts: dict[str, int] = {}
    disconnected_forests = rooted_cells = supported_cells = 0
    identity_evaluations = positive = zero = 0
    minimum: int | None = None
    minimum_cell = ""

    for order in range(4, max_order + 1):
        forests = list(component_multisets(types, order))
        forest_counts[str(order)] = len(forests)
        for components in forests:
            if len(components) < 2:
                continue
            disconnected_forests += 1
            g_i, g_c = forest_pair(components)
            component_count = len(components)
            h_value = component_count - 1
            N_value = order - 1
            assert coefficient(g_i, 2) + coefficient(g_i, 1) == (
                N_value * (N_value + 1) // 2 + component_count
            )
            assert coefficient(g_c, 0) == N_value - h_value

            seen_types: set[int] = set()
            for position, type_index in enumerate(components):
                if type_index in seen_types:
                    continue
                seen_types.add(type_index)
                rest = components[:position] + components[position + 1 :]
                rest_pair = forest_pair(rest)
                root_type = types[type_index]
                for root in root_type["roots"]:  # type: ignore[union-attr]
                    rooted_cells += 1
                    f_i, f_c = union_pair(root["F"], rest_pair)  # type: ignore[index]
                    h_i, _ = union_pair(root["H"], rest_pair)  # type: ignore[index]
                    a_value = coefficient(f_i, 2)
                    b_value = coefficient(f_i, 3)
                    if b_value == 0:
                        continue
                    supported_cells += 1
                    alpha = coefficient(f_c, 1) + coefficient(h_i, 2)
                    beta = coefficient(f_c, 2) + coefficient(h_i, 3)
                    values: list[int] = []

                    for s_value in range(4):
                        t_value = s_value + 1
                        P = sum(
                            comb(t_value, shift) * coefficient(g_i, 3 - shift)
                            for shift in range(4)
                            if shift <= t_value
                        )
                        R = sum(
                            comb(t_value, shift) * coefficient(g_c, 2 - shift)
                            for shift in range(3)
                            if shift <= t_value
                        )
                        U = sum(
                            comb(t_value, shift) * coefficient(g_i, 4 - shift)
                            for shift in range(5)
                            if shift <= t_value
                        )
                        c_value = alpha + t_value * a_value
                        e_value = beta + t_value * b_value
                        anchor = P * c_value - a_value * R
                        Q = 4 * b_value * (c_value + R) - 3 * (P + a_value) * e_value
                        split = 4 * a_value * anchor * U + a_value * P * Q
                        M1 = 4 * b_value * c_value - 3 * a_value * e_value
                        original = (
                            P * (P + a_value) * M1
                            - 4 * anchor * (P * b_value - a_value * U)
                        )
                        assert split == original
                        identity_evaluations += 1
                        values.append(split)

                    m3 = forward_difference(values)
                    assert m3 >= 0
                    if m3:
                        positive += 1
                    else:
                        zero += 1
                    cell = (
                        f"n={order},components={components},"
                        f"marked_type={root_type['graph6']},w={root['marked']}"
                    )
                    if minimum is None or m3 < minimum:
                        minimum = m3
                        minimum_cell = cell

    return {
        "maximum_G_order": max_order,
        "tree_types_by_order": tree_counts,
        "forest_multisets_by_order": forest_counts,
        "disconnected_forest_multisets": disconnected_forests,
        "rooted_component_cells": rooted_cells,
        "supported_j3_cells": supported_cells,
        "payment_identity_evaluations": identity_evaluations,
        "positive_m3_cells": positive,
        "zero_m3_cells": zero,
        "minimum_m3": 0 if minimum is None else minimum,
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    tree_report = json.loads(
        (HERE / "terminal_q3_low_newton_m3_all_order_independent_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert tree_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M3_AUDIT"
    )
    fq32 = json.loads(
        (HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    reserve = json.loads(
        (HERE / "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert fq32["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    )
    assert reserve["status"] == "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_ASSEMBLY"

    N, j, h, W = sp.symbols("N j h W", integer=True, nonnegative=True)
    a, b, e0, p0 = sp.symbols("a b e0 p0", positive=True)
    p1_tree = (N**2 + N + 2) / 2
    p1 = p1_tree + h
    p2 = N + 2
    edge_count = N - h
    r2 = edge_count
    r1_floor = edge_count * (h + 1)
    a_low = (N - 1) * (N - 2) / 2
    p0_low = (N - 1) * (N**2 - 2 * N + 6) / 6
    p0_high = N * (N - 1) * (N + 1) / 6
    p0_upper = p0_high + h * (h + 1) / 2

    p0_base = (
        (N + 1) * N * (N - 1) / 6
        - N * (N - 1)
        + N * (N - 1) / 2
    )
    p0_exact = sp.expand(p0_base + h * N + W)
    r1_exact = edge_count * N - 2 * W
    wedge_cap = edge_count * (edge_count - 1) / 2
    assert sp.expand(p0_upper - p0_exact - (wedge_cap - W)) == 0
    assert sp.expand(r1_exact - r1_floor - 2 * (wedge_cap - W)) == 0
    assert sp.expand(p0_exact - p0_low - h - ((h - 1) * (N - 1) + W)) == 0

    # j>=4 remainder.  Every replacement below is checked in its monotone
    # direction: e0 and p0 have nonpositive coefficients, while a has a
    # positive coefficient on N>=j>=4.
    B0 = (j + 1) * b * a - 3 * e0 * (p0 + a)
    B1 = (
        (j + 1) * b * (a + r1_floor)
        - 3 * e0 * p1
        - 3 * b * (p1 + p0 + a)
    )
    B2 = (j + 1) * b * r2 - 3 * e0 * p2 - 6 * b * (p2 + p1)
    B3 = -3 * (e0 + 3 * b * (p2 + 1))
    pq3_lower = sp.expand(
        p0 * B3
        + 3 * p1 * B2
        + 3 * p1 * B3
        + 3 * p2 * B1
        + 6 * p2 * B2
        + 3 * p2 * B3
        + B0
        + 3 * B1
        + 3 * B2
        + B3
    )
    assert all(
        value <= 0
        for value in sp.Poly(sp.diff(pq3_lower, e0), N, j, h, a, b, p0).coeffs()
    )
    assert all(
        value <= 0
        for value in sp.Poly(sp.diff(pq3_lower, p0), N, j, h, b, e0).coeffs()
    )
    after_e = sp.expand(pq3_lower.subs(e0, (j + 2) * b))
    a_coefficient = sp.factor(sp.diff(after_e, a))
    assert sp.expand(
        a_coefficient - b * (3 * N * (j - 2) + 7 * j - 23)
    ) == 0

    forest_Q3 = sp.factor(
        -2 * after_e.subs({p0: p0_upper, a: a_low}) / b
    )
    tree_Q3 = sp.factor(forest_Q3.subs(h, 0))
    A1bar = p0_low + N + 2 + h * (N + 3)
    A2bar = N**2 + 3 * N + 8 + 3 * h
    A3bar = 3 * N + 10

    retained = {
        (1, 2): 3,
        (1, 3): 3,
        (2, 1): 3,
        (2, 2): 6,
        (2, 3): 3,
        (3, 0): 1,
        (3, 1): 3,
        (3, 2): 3,
        (3, 3): 1,
    }
    assert {pair: overlap(*pair, 3) for pair in retained} == retained

    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    R2 = j / (r + 1)
    R3 = j * (j - 1) / ((r + 1) * (r + 2))
    E = (
        A1bar * 3 * (R2 + R3)
        + A2bar * (3 + 6 * R2 + 3 * R3)
        + A3bar * (4 + 3 * R2 + R3)
    )
    general_gap = sp.cancel(2 * (j + 1) * a_low * E - forest_Q3)
    general_numerator, general_denominator = sp.fraction(
        sp.cancel(general_gap.subs(N, j + r).subs(j, k + 4))
    )
    general_numerator = sp.expand(general_numerator)
    general_denominator = sp.factor(general_denominator)
    assert sp.expand(general_denominator - 2 * (r + 1) * (r + 2)) == 0
    h2_coefficient = sp.Poly(general_numerator, h).coeff_monomial(h**2)
    h2_poly = sp.Poly(sp.expand(h2_coefficient), k, r)
    assert len(h2_poly.terms()) == 11
    assert all(value < 0 for value in h2_poly.coeffs())
    connected_endpoint = sp.Poly(sp.expand(general_numerator.subs(h, 0)), k, r)
    empty_endpoint = sp.Poly(
        sp.expand(general_numerator.subs(h, k + 4 + r)), k, r
    )
    assert len(connected_endpoint.terms()) == 42
    assert len(empty_endpoint.terms()) == 42
    assert min(connected_endpoint.coeffs()) == 1
    assert min(empty_endpoint.coeffs()) == 1

    # j=3: keep p0 and r1 coupled through W rather than using incompatible
    # upper/lower wedge extrema.  FQ32 and the rooted reserve give the
    # correlated e0 bound.  Incidence gives 0<=x<=(2a+a)/a=3.
    x = sp.symbols("x", nonnegative=True)
    correlated_e = sp.Rational(4, 3) * (1 + x) * b
    J3B0 = 4 * b * a * (1 + x) - 3 * correlated_e * (p0 + a)
    J3B1 = (
        4 * b * (a + r1_exact)
        - 3 * correlated_e * p1
        - 3 * b * (p1 + p0 + a)
    )
    J3B2 = 4 * b * r2 - 3 * correlated_e * p2 - 6 * b * (p2 + p1)
    J3B3 = -3 * (correlated_e + 3 * b * (p2 + 1))
    j3_pq = sp.expand(
        p0 * J3B3
        + 3 * p1 * J3B2
        + 3 * p1 * J3B3
        + 3 * p2 * J3B1
        + 6 * p2 * J3B2
        + 3 * p2 * J3B3
        + J3B0
        + 3 * J3B1
        + 3 * J3B2
        + J3B3
    )
    assert sp.expand(sp.diff(j3_pq, a) - 3 * b * (N + 3)) == 0
    j3_remainder = sp.cancel(
        j3_pq.subs({a: a_low, p0: p0_exact}) / b
    )
    j3_A1 = p0_exact + 2 * p1 - r1_exact + x * p1
    j3_A2 = N**2 + 3 * N + 8 + 3 * h + x * (N + 2)
    j3_A3 = 3 * N + 10 + x
    j3_R2 = 3 / (N - 2)
    j3_R3 = 6 / ((N - 1) * (N - 2))
    j3_E = (
        j3_A1 * 3 * (j3_R2 + j3_R3)
        + j3_A2 * (3 + 6 * j3_R2 + 3 * j3_R3)
        + j3_A3 * (4 + 3 * j3_R2 + j3_R3)
    )
    j3_gap = sp.expand(sp.cancel(4 * a_low * j3_E + j3_remainder))
    wedge_coefficient = sp.factor(sp.diff(j3_gap, W))
    assert sp.expand(wedge_coefficient - 4 * (3 * N - 2 * x - 20)) == 0
    assert sp.Poly(j3_gap, h).coeff_monomial(h**2) == -30
    assert sp.degree(j3_gap, x) == 1

    j3_at_W0_x0 = sp.factor(j3_gap.subs({W: 0, x: 0}))
    j3_at_W0_x3 = sp.factor(j3_gap.subs({W: 0, x: 3}))
    expected_x0 = (
        9 * N**4 + 37 * N**3 - 225 * N**2 - 2761 * N - 3600
    ) / 6 - 30 * h**2 - 2 * (61 * N + 171) * h
    expected_x3 = (
        9 * N**4 + 67 * N**3 - 441 * N**2 - 4807 * N - 6624
    ) / 6 - 30 * h**2 - 4 * (41 * N + 126) * h
    assert sp.expand(j3_at_W0_x0 - expected_x0) == 0
    assert sp.expand(j3_at_W0_x3 - expected_x3) == 0

    q = sp.symbols("q", integer=True, nonnegative=True)
    corner_records = []
    for h_label, h_value in (("1", sp.Integer(1)), ("N", N)):
        for x_value, expression in ((0, expected_x0), (3, expected_x3)):
            corner = sp.Poly(
                sp.expand((6 * expression.subs(h, h_value)).subs(N, 13 + q)),
                q,
            )
            assert min(corner.coeffs()) > 0
            corner_records.append(
                {
                    "h": h_label,
                    "x": x_value,
                    "polynomial": str(corner.as_expr()),
                    "minimum_coefficient": str(min(corner.coeffs())),
                }
            )

    finite = finite_disconnected_j3_census(13)
    assert finite["zero_m3_cells"] == 0

    report = {
        "schema": "terminal-q3-low-newton-m3-forest-base-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M3",
        "claim": (
            "For every supported terminal-payment cell j>=3 over an arbitrary "
            "forest base G, Newton coefficient m=3 is nonnegative."
        ),
        "forest_parameters": {
            "orders": "|G|=N+1, h=c(G)-1, m=|E(G)|=N-h",
            "P1": "P1=P1(tree)+h",
            "R2": "R2=N-h",
            "wedge_identities": {
                "p0": str(p0_exact),
                "r1": str(r1_exact),
                "wedge_range": "0<=W<=C(N-h,2)",
            },
            "bounds": {
                "p0_upper": str(p0_upper),
                "r1_lower": str(r1_floor),
                "p0_lower": "p0>=p0_low+h",
                "a_floor": "a=i2(G-w)>=C(N-1,2)",
            },
        },
        "j_at_least_4": {
            "remainder": "[P*Q]_3>=-(b/2)Q3(N,j,h)",
            "Q3": str(forest_Q3),
            "tree_Q3": str(tree_Q3),
            "anchor_bounds": {
                "A1": "A1>=a[p0_low+N+2+h(N+3)]",
                "A2": "A2>=a[N^2+3N+8+3h]",
                "A3": "A3>=a(3N+10)",
            },
            "denominator": str(general_denominator),
            "h_quadratic_terms": len(h2_poly.terms()),
            "h_quadratic_maximum_coefficient": str(max(h2_poly.coeffs())),
            "logic": (
                "The cleared gap is concave in 0<=h<=N.  Its h=0 and h=N "
                "endpoint polynomials each have 42 positive monomials with "
                "minimum coefficient 1."
            ),
        },
        "j_equals_3": {
            "correlation": (
                "x=(z2+h2)/a; all-forest q3<=q2 plus the rooted reserve gives "
                "e0/b<=4(1+x)/3; incidence and H subset F give 0<=x<=3"
            ),
            "coupled_wedge_coefficient": str(wedge_coefficient),
            "large_disconnected_domain": (
                "For N>=13 and x<=3 the wedge coefficient is positive, so W=0 "
                "is a lower bound.  The result is affine in x and concave in "
                "1<=h<=N; all four (x,h) endpoint polynomials are positive."
            ),
            "N_13_plus_corners": corner_records,
            "connected_domain": "Pinned all-order tree-base m3 theorem",
            "small_disconnected_domain": "Complete component-multiset census for |G|<=13",
        },
        "finite_disconnected_j3_census": finite,
        "dependencies": {
            "tree_m3": tree_report["status"],
            "all_forest_q3_q2": fq32["status"],
            "rooted_reserve": reserve["status"],
            "forest_incidence": "pinned m6 incidence theorem",
            "forest_anchor": "pinned all-forest terminal q3 anchor lift",
        },
        "pins": observed_pins,
        "scope": (
            "This closes only Newton degree m=3 for arbitrary forest bases. "
            "It does not close m=0,1,2, the whole terminal payment, the global "
            "q3 envelope, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"j4_endpoint_terms={len(connected_endpoint.terms())} "
        f"finite_j3_cells={finite['supported_j3_cells']}"
    )
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
