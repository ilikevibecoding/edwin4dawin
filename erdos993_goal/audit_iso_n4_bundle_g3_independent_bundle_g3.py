#!/usr/bin/env python3
"""Independent exact audit of the forest proof for the bundle g3 coefficient.

This audit deliberately does not import the proposed g3 proof.  It obtains
g3 as the third forward difference of the defining bundle payment, redoes the
forest-invariant substitution, checks every lower-bound identity, and compares
the result with exact independence-polynomial calculations on genuine forest
bundle cells.
"""

from __future__ import annotations

import functools
import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
TARGET_SOURCE = HERE / "derive_iso_n4_bundle_g3_invariants_root.py"
TARGET_REPORT = HERE / "iso_n4_bundle_g3_forest_invariants_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g3_independent_audit_bundle_g3_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row: tuple[sp.Expr, ...] | tuple[int, ...], rank: int):
    return row[rank] if 0 <= rank < len(row) else 0


def nested_rank(rows, rank: int):
    """The defining nine-line nested form, copied independently."""
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_rows(rows, number: int, maximum: int):
    return tuple(
        tuple(
            sp.expand(
                sum(comb(number, i) * at(row, k - i) for i in range(k + 1))
            )
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(sp.expand(at(row, k) + at(drow, k - 1)) for k in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def gamma_value(crows, drows, number: int):
    tm = add_xd(isolate_rows(crows, number, 5), drows)
    t0 = add_xd(isolate_rows(crows, 0, 5), drows)
    lower = sum(
        nested_rank(isolate_rows(crows, t, 4), 3) for t in range(number)
    )
    return sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower)


def nested_rank_numeric(rows, rank: int) -> int:
    e, u, v, w = rows
    r = rank
    return int(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_rows_numeric(rows, number: int, maximum: int):
    return tuple(
        tuple(
            sum(comb(number, i) * at(row, k - i) for i in range(k + 1))
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd_numeric(rows, drows):
    return tuple(
        tuple(at(row, k) + at(drow, k - 1) for k in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def gamma_value_numeric(crows, drows, number: int) -> int:
    tm = add_xd_numeric(isolate_rows_numeric(crows, number, 5), drows)
    t0 = add_xd_numeric(isolate_rows_numeric(crows, 0, 5), drows)
    lower = sum(
        nested_rank_numeric(isolate_rows_numeric(crows, t, 4), 3)
        for t in range(number)
    )
    return nested_rank_numeric(tm, 4) - nested_rank_numeric(t0, 4) - lower


def raw_g3():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    values = [gamma_value(crows, drows, number) for number in range(4)]
    assert values[0] == 0
    return sp.expand(values[3] - 3 * values[2] + 3 * values[1] - values[0])


def choose2(x):
    return sp.expand(sp.Rational(1, 2) * x * (x - 1))


def choose3(x):
    return sp.expand(sp.Rational(1, 6) * x * (x - 1) * (x - 2))


def independent_three(order, edges, wedges):
    return sp.expand(choose3(order) - edges * (order - 2) + wedges)


def symbolic_audit():
    n, q, e, du, dv, a = sp.symbols(
        "n q edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    wedge, su, sv, common = sp.symbols(
        "wedge_sum neighbor_excess_u neighbor_excess_v common_neighbor",
        integer=True,
        nonnegative=True,
    )
    removed, hit_u, hit_v = sp.symbols(
        "removed_degree_sum hit_u hit_v", integer=True, nonnegative=True
    )
    deleted = sp.symbols("deleted_count", integer=True, nonnegative=True)

    # Re-derived wedge counts after one or both marked vertices are deleted.
    wedge_u = wedge - choose2(du) - su
    wedge_v = wedge - choose2(dv) - sv
    wedge_uv = (
        wedge
        - choose2(du)
        - choose2(dv)
        - su
        - sv
        + a * (du + dv - 2)
        + common
    )
    d_edges = e - removed
    substitution = {
        **{sp.symbols(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.symbols(f"d{name}0"): 1 for name in "EUVW"},
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - eu,
        sp.symbols("dV1"): q - ev,
        sp.symbols("dW1"): q - eu - ev,
        sp.symbols("cE2"): choose2(n) - e,
        sp.symbols("cU2"): choose2(n - 1) - e + du,
        sp.symbols("cV2"): choose2(n - 1) - e + dv,
        sp.symbols("cW2"): choose2(n - 2) - e + du + dv - a,
        sp.symbols("cE3"): independent_three(n, e, wedge),
        sp.symbols("cU3"): independent_three(n - 1, e - du, wedge_u),
        sp.symbols("cV3"): independent_three(n - 1, e - dv, wedge_v),
        sp.symbols("cW3"): independent_three(
            n - 2, e - du - dv + a, wedge_uv
        ),
        sp.symbols("dE2"): choose2(q) - d_edges,
        sp.symbols("dU2"): choose2(q - eu) - d_edges + eu * (du - hit_u),
        sp.symbols("dV2"): choose2(q - ev) - d_edges + ev * (dv - hit_v),
        sp.symbols("dW2"): (
            choose2(q - eu - ev)
            - d_edges
            + eu * (du - hit_u)
            + ev * (dv - hit_v)
            - eu * ev * a
        ),
    }
    invariant_g3 = sp.expand(raw_g3().subs(substitution))
    invariant_g3 = sp.rem(
        sp.Poly(invariant_g3, eu), sp.Poly(eu**2 - eu, eu)
    ).as_expr()
    invariant_g3 = sp.rem(
        sp.Poly(invariant_g3, ev), sp.Poly(ev**2 - ev, ev)
    ).as_expr()
    invariant_g3 = sp.expand(invariant_g3)

    expected = sp.expand(
        a * (-5 * du - 5 * dv + 5 * eu * ev + 12 * n + 3)
        - 5 * common
        + 6 * du**2
        + 3 * du * eu
        - 15 * du * n
        + 16 * du
        + 6 * dv**2
        + 3 * dv * ev
        - 15 * dv * n
        + 16 * dv
        + 10 * e * n
        - 36 * e
        - 5 * eu * ev
        - 3 * eu * hit_u
        - 3 * eu * n
        - 3 * eu * q
        - 5 * eu
        - 3 * ev * hit_v
        - 3 * ev * n
        - 3 * ev * q
        - 5 * ev
        + 25 * n**2
        - 2 * n * q
        - 7 * n
        + 12 * su
        + 12 * sv
        + 3 * q**2
        + 9 * q
        + 6 * removed
        - 15 * wedge
        + 4
    )
    assert sp.expand(invariant_g3 - expected) == 0

    target = json.loads(TARGET_REPORT.read_text(encoding="utf-8"))
    assert target["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_BINOMIAL_COEFFICIENT_G3"
    target_locals = {
        str(symbol): symbol
        for symbol in (
            n,
            q,
            e,
            du,
            dv,
            a,
            eu,
            ev,
            wedge,
            su,
            sv,
            common,
            removed,
            hit_u,
            hit_v,
        )
    }
    target_expression = sp.sympify(
        target["boolean_reduced_g3"], locals=target_locals
    )
    assert sp.expand(target_expression - expected) == 0

    after_delete = sp.expand(expected.subs(q, n - deleted))
    adjacency = sp.expand(a * (-5 * (du + dv) + 5 * eu * ev + 12 * n + 3))
    degree = sp.expand(6 * du**2 + 6 * dv**2 - 15 * n * (du + dv) + 16 * (du + dv))
    edge_wedge = sp.expand(10 * e * n - 36 * e - 15 * wedge)
    epsilon = sp.expand(
        -5 * eu * ev
        + eu * (-3 * hit_u - 6 * n + 3 * deleted - 5)
        + ev * (-3 * hit_v - 6 * n + 3 * deleted - 5)
    )
    base = sp.expand(26 * n**2 - 4 * n * deleted + 3 * deleted**2 + 2 * n - 9 * deleted + 4)
    nonnegative = sp.expand(3 * du * eu + 3 * dv * ev + 12 * su + 12 * sv + 6 * removed)
    grouped = sp.expand(adjacency - 5 * common + degree + edge_wedge + epsilon + base + nonnegative)
    assert sp.expand(after_delete - grouped) == 0

    base_lower = sp.Rational(74, 3) * n**2 - 4 * n - sp.Rational(11, 4)
    assert sp.expand(base - base_lower - (6 * deleted - 4 * n - 9) ** 2 / 12) == 0
    degree_lower = -12 * n**2 + 16 * n
    degree_residual = sp.expand(
        3 * (du - dv) ** 2
        + (n - du - dv) * (12 * n - 3 * (du + dv) - 16)
    )
    assert sp.expand(degree - degree_lower - degree_residual) == 0

    edge_floor = sp.expand(e * (10 * n - sp.Rational(57, 2) - sp.Rational(15, 2) * e))
    edge_small = sp.expand((n - 1) * (5 * n - 42) / 2)
    edge_endpoint_residual = sp.expand(
        (n - 1 - e) * (15 * e - 5 * n + 42) / 2
    )
    assert sp.expand(edge_floor - edge_small - edge_endpoint_residual) == 0

    large_total = sp.expand(base_lower + degree_lower - 12 * n - 26)
    small_total = sp.expand(large_total + edge_small)
    assert large_total == sp.Rational(38, 3) * n**2 - sp.Rational(115, 4)
    assert sp.expand(
        small_total - sp.Rational(71, 12) - (n - 2) * (91 * n + 41) / 6
    ) == 0

    # Exhaust the discrete side conditions far beyond the small-n split.
    abstract_checks = 0
    for nn in range(2, 41):
        for dd in range(nn + 1):
            # Twelve times the exact base residual is a square.
            assert (6 * dd - 4 * nn - 9) ** 2 >= 0
            for ee in range(nn):
                # Twice the edge floor and small-n endpoint floor.
                floor_twice = ee * (20 * nn - 57 - 15 * ee)
                small_twice = (nn - 1) * (5 * nn - 42)
                if nn >= 9:
                    assert floor_twice >= 0
                else:
                    assert floor_twice >= small_twice
                abstract_checks += 1
        for duu in range(nn + 1):
            for dvv in range(nn - duu + 1):
                degree_residual_value = (
                    3 * (duu - dvv) ** 2
                    + (nn - duu - dvv) * (12 * nn - 3 * (duu + dvv) - 16)
                )
                assert degree_residual_value >= 0
                for aa in (0, 1):
                    for euu in (0, 1):
                        for evv in (0, 1):
                            adjacency_value = aa * (
                                -5 * (duu + dvv) + 5 * euu * evv + 12 * nn + 3
                            )
                            assert adjacency_value >= 0
                abstract_checks += 1
        for dd in range(nn + 1):
            for euu, evv, huu, hvv in itertools.product((0, 1), repeat=4):
                value = (
                    -5 * euu * evv
                    + euu * (-3 * huu - 6 * nn + 3 * dd - 5)
                    + evv * (-3 * hvv - 6 * nn + 3 * dd - 5)
                )
                assert value >= -12 * nn - 21
                abstract_checks += 1

    symbols = {
        "n": n,
        "q": q,
        "e": e,
        "du": du,
        "dv": dv,
        "a": a,
        "eu": eu,
        "ev": ev,
        "wedge": wedge,
        "su": su,
        "sv": sv,
        "common": common,
        "removed": removed,
        "hit_u": hit_u,
        "hit_v": hit_v,
    }
    return expected, symbols, abstract_checks


def add_rows(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    length = max(len(a), len(b))
    return tuple(at(a, i) + at(b, i) for i in range(length))


def graph_polynomial_oracle(graph: nx.Graph):
    vertices = tuple(sorted(graph))
    index = {vertex: i for i, vertex in enumerate(vertices)}
    neighbour_masks = [0] * len(vertices)
    for vertex in vertices:
        mask = 0
        for neighbour in graph.neighbors(vertex):
            mask |= 1 << index[neighbour]
        neighbour_masks[index[vertex]] = mask

    @functools.lru_cache(maxsize=None)
    def polynomial(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        i = bit.bit_length() - 1
        without = polynomial(mask ^ bit)
        without_closed = polynomial(mask & ~bit & ~neighbour_masks[i])
        return add_rows(without, (0,) + without_closed)

    def mask_of(nodes) -> int:
        result = 0
        for vertex in nodes:
            result |= 1 << index[vertex]
        return result

    return polynomial, mask_of


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode("ascii").strip()


def genuine_cell_census(expected, symbols, max_tree_order: int = 10):
    symbol_order = tuple(symbols[key] for key in (
        "n", "q", "e", "du", "dv", "a", "eu", "ev", "wedge", "su",
        "sv", "common", "removed", "hit_u", "hit_v"
    ))
    invariant_evaluator = sp.lambdify(symbol_order, expected, modules="math")
    sources: list[tuple[str, nx.Graph]] = []
    for order in range(3, max_tree_order + 1):
        sources.extend(
            ("nonisomorphic_tree", nx.convert_node_labels_to_integers(graph))
            for graph in nx.nonisomorphic_trees(order)
        )
    sources.extend(
        ("atlas_forest", nx.convert_node_labels_to_integers(graph))
        for graph in nx.graph_atlas_g()
        if 3 <= len(graph) <= 7 and nx.is_forest(graph)
    )

    cells = symbolic_matches = wedge_matches = d_pair_matches = 0
    source_counts = {"nonisomorphic_tree": 0, "atlas_forest": 0}
    minimum = None
    for source, base in sources:
        source_counts[source] += 1
        polynomial, mask_of = graph_polynomial_oracle(base)
        all_nodes = set(base)
        for u, v in itertools.combinations(sorted(base), 2):
            for support in sorted(all_nodes - {u, v}):
                g_nodes = all_nodes - {support}
                support_neighbours = set(base.neighbors(support)) & g_nodes
                d_nodes = g_nodes - support_neighbours
                g = base.subgraph(g_nodes)
                n = len(g_nodes)
                q = len(d_nodes)
                edges = g.number_of_edges()
                du = g.degree(u)
                dv = g.degree(v)
                adjacent = int(g.has_edge(u, v))
                wedge = sum(comb(g.degree(x), 2) for x in g)
                su = sum(g.degree(x) - 1 for x in g.neighbors(u))
                sv = sum(g.degree(x) - 1 for x in g.neighbors(v))
                common = len(set(g.neighbors(u)) & set(g.neighbors(v)))
                removed = sum(g.degree(x) for x in support_neighbours)
                eu = int(u in d_nodes)
                ev = int(v in d_nodes)
                hit_u = len(set(g.neighbors(u)) & support_neighbours)
                hit_v = len(set(g.neighbors(v)) & support_neighbours)

                # Verify every structural condition used by the proof.
                components = list(nx.connected_components(g))
                assert all(len(component & support_neighbours) <= 1 for component in components)
                assert nx.is_forest(g)
                assert len(list(g.subgraph(support_neighbours).edges())) == 0
                assert 2 <= n and 0 <= q <= n and edges <= n - 1
                assert du + dv <= n
                assert wedge <= comb(edges, 2)
                assert common <= 1
                assert hit_u <= 1 and hit_v <= 1
                assert removed >= 0 and su >= 0 and sv >= 0
                d = base.subgraph(d_nodes)
                assert d.number_of_edges() == edges - removed

                c_masks = [g_nodes, g_nodes - {u}, g_nodes - {v}, g_nodes - {u, v}]
                d_masks = [d_nodes, d_nodes - {u}, d_nodes - {v}, d_nodes - {u, v}]
                crows = tuple(polynomial(mask_of(nodes)) for nodes in c_masks)
                drows = tuple(polynomial(mask_of(nodes)) for nodes in d_masks)

                # Check the delicate wedge/common-neighbour formulas directly.
                wedge_u = wedge - comb(du, 2) - su
                wedge_v = wedge - comb(dv, 2) - sv
                wedge_uv = (
                    wedge
                    - comb(du, 2)
                    - comb(dv, 2)
                    - su
                    - sv
                    + adjacent * (du + dv - 2)
                    + common
                )
                assert at(crows[0], 3) == independent_three(n, edges, wedge)
                assert at(crows[1], 3) == independent_three(n - 1, edges - du, wedge_u)
                assert at(crows[2], 3) == independent_three(n - 1, edges - dv, wedge_v)
                assert at(crows[3], 3) == independent_three(
                    n - 2, edges - du - dv + adjacent, wedge_uv
                )
                wedge_matches += 4

                d_edges = edges - removed
                if at(drows[0], 2) != choose2(q) - d_edges:
                    raise AssertionError(
                        {
                            "kind": "dE2",
                            "source": source,
                            "graph6": graph6(base),
                            "marks": [u, v],
                            "support": support,
                            "d_nodes": sorted(d_nodes),
                            "q": q,
                            "edges": edges,
                            "removed": removed,
                            "d_edges_direct": d.number_of_edges(),
                            "drow": drows[0],
                            "expected": str(choose2(q) - d_edges),
                        }
                    )
                assert at(drows[1], 2) == choose2(q - eu) - d_edges + eu * (du - hit_u)
                assert at(drows[2], 2) == choose2(q - ev) - d_edges + ev * (dv - hit_v)
                assert at(drows[3], 2) == (
                    choose2(q - eu - ev)
                    - d_edges
                    + eu * (du - hit_u)
                    + ev * (dv - hit_v)
                    - eu * ev * adjacent
                )
                d_pair_matches += 4

                direct_values = [gamma_value_numeric(crows, drows, m) for m in range(4)]
                direct_g3 = direct_values[3] - 3 * direct_values[2] + 3 * direct_values[1]
                invariant_value = int(
                    invariant_evaluator(
                        n, q, edges, du, dv, adjacent, eu, ev, wedge, su, sv,
                        common, removed, hit_u, hit_v
                    )
                )
                assert direct_g3 == invariant_value
                assert direct_g3 > 0
                symbolic_matches += 1

                witness = {
                    "g3": direct_g3,
                    "source": source,
                    "base_order": len(base),
                    "graph6": graph6(base),
                    "marks": [u, v],
                    "support": support,
                    "gamma_0_to_3": direct_values,
                    "n": n,
                    "q": q,
                }
                if minimum is None or direct_g3 < minimum["g3"]:
                    minimum = witness
                cells += 1

    return {
        "nonisomorphic_tree_base_orders": [3, max_tree_order],
        "atlas_forest_base_orders": [3, 7],
        "source_graph_counts": source_counts,
        "genuine_mark_support_cells": cells,
        "direct_vs_invariant_matches": symbolic_matches,
        "wedge_formula_matches": wedge_matches,
        "D_pair_formula_matches": d_pair_matches,
        "minimum_observed_g3": minimum,
        "scope": "finite exact replay, supplementary to the symbolic proof audit",
    }


def main():
    expected, symbols, abstract_checks = symbolic_audit()
    census = genuine_cell_census(expected, symbols)
    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G3_FOREST_PROOF_AUDIT_BUNDLE_G3",
        "target": {
            "source": TARGET_SOURCE.name,
            "source_sha256": sha256(TARGET_SOURCE),
            "report": TARGET_REPORT.name,
            "report_sha256": sha256(TARGET_REPORT),
            "target_marker": "PASS_EXACT_ISO_N4_BUNDLE_BINOMIAL_COEFFICIENT_G3",
        },
        "independent_derivation": (
            "g3=Gamma_3-3*Gamma_2+3*Gamma_1-Gamma_0, evaluated directly "
            "from the defining N4 and N3 forms; no import from the target proof"
        ),
        "exact_checks": {
            "raw_forward_difference_to_invariants": "PASS",
            "target_boolean_reduced_expression": "PASS",
            "wedge_deletion_common_neighbor_correction": "PASS",
            "D_induced_forest_pair_formulas": "PASS",
            "q_to_deleted_count_grouping": "PASS",
            "base_completion_square": "PASS",
            "degree_sum_residual": "PASS",
            "edge_wedge_endpoint_bounds": "PASS",
            "epsilon_common_bound": "PASS",
            "large_and_small_n_total_arithmetic": "PASS",
            "abstract_discrete_bound_checks_n_2_to_40": abstract_checks,
        },
        "proof_scope": {
            "theorem": (
                "For every genuine forest base, distinct marks u,v, and unmarked "
                "support s, the binom(M,3) coefficient g3 of the rank-four "
                "whole-sibling-bundle payment is strictly positive."
            ),
            "analytic_lower_bound": (
                "g3 >= 38*n^2/3-115/4 for n>=9; for 2<=n<=8, "
                "g3 >= 71/12+(n-2)(91*n+41)/6 > 0."
            ),
            "not_proved": "The binom(M,1) and binom(M,2) coefficients remain open.",
        },
        "finite_replay": census,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    # Byte write keeps the reported SHA-256 identical to the on-disk artifact
    # on Windows (Path.write_text would translate LF to CRLF).
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
