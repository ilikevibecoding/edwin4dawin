#!/usr/bin/env python3
"""Prove bundle coefficient g2 for a deepest ordinary sibling bundle.

Let G=H-s be the support-deleted forest, with distinct marks u,v.  For a
canonical deepest support, s has one non-bundle neighbour p.  This theorem
handles the ordinary case p not in {u,v}, so D=G-p and both marks survive.

The exact configuration form is imported from the separately replayable
derivation.  Elementary forest bounds prove every order n>=8.  Every forest
of orders 3..7 and every placement of u,v,p is then enumerated exactly.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_leaf_bundle_telescope_agent import bundle_components
from probe_iso_leaf_cross_remainder_root import graph6


HERE = Path(__file__).resolve().parent
DEPENDENCY_SOURCE = HERE / "derive_iso_n4_bundle_g2_configuration_root.py"
DEPENDENCY_REPORT = HERE / "iso_n4_bundle_g2_configuration_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g2_deepest_ordinary_exact_root_20260829.json"


def connected_three_edge_subsets(graph: nx.Graph) -> int:
    count = 0
    edges = tuple(graph.edges())
    for chosen in itertools.combinations(edges, 3):
        vertices = set(itertools.chain.from_iterable(chosen))
        if len(vertices) != 4:
            continue
        test = nx.Graph()
        test.add_edges_from(chosen)
        count += int(nx.is_connected(test))
    return count


def neighbor_excess(graph: nx.Graph, vertex: int) -> int:
    return sum(graph.degree(x) - 1 for x in graph.neighbors(vertex))


def wedge_sum(graph: nx.Graph) -> int:
    return sum(comb(degree, 2) for _, degree in graph.degree())


def direct_g2(graph: nx.Graph, u: int, v: int, parent: int) -> tuple[int, list[int]]:
    support = max(graph.nodes(), default=-1) + 1
    base = graph.copy()
    base.add_edge(parent, support)
    values = [0]
    for number in (1, 2):
        values.append(sum(bundle_components(base, (u, v), support, number, 4)))
    return values[2] - 2 * values[1], values


def invariant_substitution(
    evaluator, graph: nx.Graph, u: int, v: int, parent: int
) -> int:
    dgraph = graph.copy()
    dgraph.remove_node(parent)
    gu = graph.copy()
    gu.remove_node(u)
    gv = graph.copy()
    gv.remove_node(v)
    values = {
        "n": len(graph),
        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
        "C_connected3_E": connected_three_edge_subsets(graph),
        "C_connected3_U": connected_three_edge_subsets(gu),
        "C_connected3_V": connected_three_edge_subsets(gv),
        "C_neighbor_excess_u": neighbor_excess(graph, u),
        "C_neighbor_excess_v": neighbor_excess(graph, v),
        "C_wedges_E": wedge_sum(graph),
        "D_degree_u": dgraph.degree(u),
        "D_degree_v": dgraph.degree(v),
        "D_edges": dgraph.number_of_edges(),
        "D_neighbor_excess_u": neighbor_excess(dgraph, u),
        "D_neighbor_excess_v": neighbor_excess(dgraph, v),
        "D_wedges_E": wedge_sum(dgraph),
        "adjacent": int(graph.has_edge(u, v)),
        "degree_u": graph.degree(u),
        "degree_v": graph.degree(v),
        "edge_count": graph.number_of_edges(),
    }
    return evaluator(values)


def exact_polynomial_evaluator(expression: sp.Expr):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(2 * expression), *symbols)
    terms = [
        (monomial, int(coefficient))
        for monomial, coefficient in polynomial.terms()
    ]
    assert all(coefficient.q == 1 for coefficient in polynomial.coeffs())

    def evaluate(values: dict[str, int]) -> int:
        assert set(values) == set(names)
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            value = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    value *= base**exponent
            numerator += value
        assert numerator % 2 == 0
        return numerator // 2

    return evaluate


def symbolic_large_order_proof(expression: sp.Expr) -> dict[str, str]:
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    common = names["C_common_neighbor"]
    re, ru, rv = (names[f"C_connected3_{row}"] for row in "EUV")
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    wedges = names["C_wedges_E"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    de = names["D_edges"]
    dxu, dxv = names["D_neighbor_excess_u"], names["D_neighbor_excess_v"]
    d_wedges = names["D_wedges_E"]
    adjacent = names["adjacent"]
    du, dv = names["degree_u"], names["degree_v"]
    edges = names["edge_count"]
    degree_sum = du + dv

    numerator = sp.expand(2 * expression)
    adjacency_part = sp.expand(
        adjacent
        * (
            12 * n**2
            + 4 * n
            - (10 * n + 4) * degree_sum
            - 4 * edges
        )
    )
    degree_part = sp.expand(
        (12 * n - 24) * (du**2 + dv**2)
        + 12 * du * dv
        + (2 * edges - 15 * n**2 + 37 * n + 8) * degree_sum
    )
    edge_wedge_part = sp.expand(
        (70 - 30 * n) * wedges
        - 4 * edges**2
        + 10 * edges * n**2
        - 66 * edges * n
        + 60 * edges
    )
    d_degree_part = sp.expand(
        5 * (ddu**2 + ddv**2) + (19 - 4 * n) * (ddu + ddv)
    )
    d_edge_wedge_part = sp.expand(-(8 * n + 24) * de - 4 * d_wedges)
    positive_part = sp.expand(
        4 * re
        + 10 * ru
        + 10 * rv
        + (24 * n - 38) * (xu + xv)
        + 10 * (dxu + dxv)
    )
    base_part = 20 * n**3 - 30 * n**2 - 28 * n + 16
    grouped = sp.expand(
        -(10 * n + 4) * common
        + positive_part
        + (70 - 30 * n) * wedges
        + d_degree_part
        -(8 * n + 24) * de
        - 4 * d_wedges
        + adjacency_part
        + degree_part
        - 4 * edges**2
        + 10 * edges * n**2
        - 66 * edges * n
        + 60 * edges
        + base_part
    )
    assert sp.expand(numerator - grouped) == 0

    # Exact square identity for the marked-degree quadratic.
    degree_quadratic = sp.expand(
        (12 * n - 24) * (du**2 + dv**2) + 12 * du * dv
    )
    assert sp.expand(
        degree_quadratic
        - (6 * n - 9) * degree_sum**2
        - (6 * n - 15) * (du - dv) ** 2
    ) == 0

    # For n>=8, the resulting convex function of degree_sum is decreasing
    # on [0,n].  Its endpoint lower bound retains the +2*n*edges term.
    degree_endpoint = sp.expand(
        -9 * n**3 + 28 * n**2 + 8 * n + 2 * n * edges
    )
    endpoint_identity = sp.factor(
        (6 * n - 9) * degree_sum**2
        + (2 * edges - 15 * n**2 + 37 * n + 8) * degree_sum
        - degree_endpoint
    )
    assert sp.expand(
        endpoint_identity
        - (n - degree_sum)
        * (
            -(6 * n - 9) * degree_sum
            + 9 * n**2
            - 28 * n
            - 2 * edges
            - 8
        )
    ) == 0

    # After wedges<=C(edges,2), combine +2*n*edges from the endpoint.
    edge_floor = sp.expand(
        (70 - 30 * n) * edges * (edges - 1) / 2
        - 4 * edges**2
        + 10 * edges * n**2
        - 64 * edges * n
        + 60 * edges
    )
    edge_endpoint = sp.expand(-(n - 1) * (5 * n**2 + 3 * n + 6))
    assert sp.expand(
        edge_floor
        - edge_endpoint
        + (edges - n + 1)
        * (15 * edges * n - 31 * edges + 5 * n**2 + 3 * n + 6)
    ) == 0

    # The D-degree quadratic is bounded by its unrestricted real minimum.
    d_degree_floor = -(4 * n - 19) ** 2 / 10
    assert sp.expand(
        d_degree_part
        - d_degree_floor
        - sp.Rational(5, 2)
        * (ddu - ddv) ** 2
        - (5 * (ddu + ddv) - 4 * n + 19) ** 2 / 10
    ) == 0

    d_edge_floor = -10 * n**2 + 2 * n + 36
    lower = sp.factor(
        base_part
        + (-9 * n**3 + 28 * n**2 + 8 * n)
        + edge_endpoint
        + d_degree_floor
        + d_edge_floor
        - (10 * n + 4)
    )
    expected_lower = (60 * n**3 - 116 * n**2 - 158 * n + 179) / 10
    assert sp.expand(lower - expected_lower) == 0
    y = sp.symbols("y", nonnegative=True)
    shifted = sp.expand((10 * expected_lower).subs(n, y + 8))
    assert shifted == 60 * y**3 + 1324 * y**2 + 9506 * y + 22211

    return {
        "normalization": "the displayed lower bound is for 2*g2",
        "adjacency_lower": "2*n^2-4*n+4 >= 0",
        "marked_degree_square_residual": str((6 * n - 15) * (du - dv) ** 2),
        "marked_degree_endpoint": str(degree_endpoint),
        "edge_wedge_endpoint": str(edge_endpoint),
        "D_degree_floor": str(d_degree_floor),
        "D_edge_wedge_floor": str(d_edge_floor),
        "total_lower": str(expected_lower),
        "shift_n_equals_8_plus_y": str(shifted),
    }


def finite_census(expression: sp.Expr) -> dict[str, object]:
    evaluator = exact_polynomial_evaluator(expression)
    cells = 0
    minimum = None
    by_order = {}
    for order in range(3, 8):
        local = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    value, gamma = direct_g2(graph, u, v, parent)
                    invariant = invariant_substitution(evaluator, graph, u, v, parent)
                    assert value == invariant
                    assert value >= 0
                    witness = {
                        "g2": value,
                        "order_G": order,
                        "G_graph6": graph6(graph),
                        "G_edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                        "marks": [u, v],
                        "parent": parent,
                        "Gamma_0_to_2": gamma,
                    }
                    if minimum is None or value < minimum["g2"]:
                        minimum = witness
                    cells += 1
                    local += 1
        by_order[str(order)] = local
    assert cells > 0 and minimum is not None
    return {
        "orders_G": [3, 7],
        "marked_parent_cells": cells,
        "minimum": minimum,
        "by_order": by_order,
        "coverage": "all unlabeled forests through order seven from the graph atlas",
        "cross_check": "direct finite difference equals the configuration form in every cell",
    }


def main() -> None:
    dependency = json.loads(DEPENDENCY_REPORT.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G2_CONFIGURATION_FORM"
    expression = sp.sympify(dependency["deepest_singleton_ordinary"]["form"])
    proof = symbolic_large_order_proof(expression)
    census = finite_census(expression)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY",
        "theorem": (
            "For every deepest sibling-bundle cell whose unique parent is "
            "distinct from the two marks, binom(M,2) coefficient g2 is nonnegative."
        ),
        "large_order_proof": proof,
        "finite_census": census,
        "dependency": {
            "source": DEPENDENCY_SOURCE.name,
            "source_sha256": hashlib.sha256(DEPENDENCY_SOURCE.read_bytes()).hexdigest().upper(),
            "report": DEPENDENCY_REPORT.name,
            "report_sha256": hashlib.sha256(DEPENDENCY_REPORT.read_bytes()).hexdigest().upper(),
        },
        "scope": (
            "Exact theorem for g2 in the singleton-parent, parent-not-mark case. "
            "It does not prove g1, endpoint-parent cases, arbitrary supports, all N4, "
            "or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "finite_census"}, indent=2, sort_keys=True))
    print("FINITE_CENSUS", json.dumps({key: value for key, value in census.items() if key != "by_order"}, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
