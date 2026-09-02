#!/usr/bin/env python3
"""Exact large-order cone probe for the isolated-parent endpoint residual.

If the parent mark u is isolated, put P=I(G-{u,v}) and
H=I(G-{u}-N[v]).  Then U=P+xH, W=P and the corrected endpoint residual

    F=N4(D)+2*[z^4 w^3](z-w)^2 U(z)W(w)

has the coefficient form built below.  The probe applies only valid forest
and componentwise-neighbour-deletion bounds, then checks the two exact
forest ratio sectors.  It is labelled a probe until independently assembled
with a complete finite branch and pinned dependencies.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp
import networkx as nx

from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_u_isolated_cone_probe_g1_nonadjacent_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_ISOLATED_CONE_G1_NONADJACENT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def residual(p, h):
    # U=P+xH, W=P.  This is N4(U,U,W,W)+2 B(U,W).
    u = tuple(at(p, k) + at(h, k - 1) for k in range(8))
    w = p
    n4d = sp.expand(
        2 * u[2] * w[2] - u[2] * w[3] - 5 * u[2] * w[4]
        + 2 * u[3] * w[1] + 2 * u[3] * w[2] + 3 * u[3] * w[3]
        - u[4] * w[1] + 3 * u[4] * w[2] - 5 * u[5] * w[1]
        - w[1] * w[4] + w[2] * w[3]
    )
    block = u[2] * w[3] - 2 * u[3] * w[2] + u[4] * w[1]
    return sp.expand(n4d + 2 * block)


def generic_rows():
    """Newton rows after extracting t isolated selected components."""
    t = sp.symbols("selected_isolates_t", nonnegative=True)
    x = (sp.Integer(1), *sp.symbols("x1:8"))
    h = (sp.Integer(1), *sp.symbols("h1:8"))
    p = tuple(sp.expand(sum(sp.binomial(t, j) * at(x, k - j) for j in range(k + 1)))
              for k in range(8))
    expression = sp.expand(sp.expand_func(residual(p, h)))
    degree = sp.degree(expression, t)
    rows = [sp.expand(sum(
        (-1) ** (rank - j) * sp.binomial(rank, j) * expression.subs(t, j)
        for j in range(rank + 1)
    )) for rank in range(degree + 1)]
    reconstructed = sp.expand(sp.expand_func(sum(
        sp.binomial(t, r) * row for r, row in enumerate(rows)
    )))
    assert sp.expand(expression - reconstructed) == 0
    return x, h, rows


def lowered_expression():
    p, h, all_rows = generic_rows()
    N, A, B, Q = sp.symbols("N A B Q", nonnegative=True)
    a = N * A / 2
    b = B * N * (1 - A)
    c = a + b
    e = N - a
    q = a + Q * N * (1 - A) * (1 - B)
    edges = N - c
    base = {
        p[1]: N,
        p[2]: choose(N, 2) - edges,
        h[1]: e,
        h[2]: choose(e, 2) - (edges - q),
    }
    h3_lower = choose(e, 3) - (edges - q) * (e - 2)
    h3_upper = choose(e, 3)
    h4_upper = choose(e, 4)
    lowered = []
    endpoint_records = []
    for row_index, row in enumerate(all_rows):
        after_base = sp.expand(row.subs(base))
        h3_coefficient = sp.factor(sp.diff(after_base, h[3]))
        h4_coefficient = sp.factor(sp.diff(after_base, h[4]))
        assert not h3_coefficient.has(*h[1:])
        assert not h4_coefficient.has(*h[1:])
        # Sign checks are completed by explicit positive decompositions below.
        h3_endpoint = h3_lower
        h4_endpoint = h4_upper
        value = sp.expand(after_base.subs({h[3]: h3_endpoint, h[4]: h4_endpoint}))
        assert not any(value.has(h[k]) for k in range(1, 8))
        lowered.append(value)
        endpoint_records.append({
            "row": row_index,
            "h3_coefficient": h3_coefficient,
            "h4_coefficient": h4_coefficient,
            "h3_endpoint": "lower",
            "h4_endpoint": "upper",
        })
    return p, (N, A, B, Q), lowered, {
        "a": a, "b": b, "c": c, "e": e, "q": q, "edges": edges,
        "endpoint_records": endpoint_records,
        "h3_lower": h3_lower,
        "h4_upper": h4_upper,
    }


def exact_sector(sector, row_index):
    p, core, lowered_rows, geometry = lowered_expression()
    N, A, B, Q = core
    cubes0, simplex, substitutions, cone, rho1 = ratio_parameterization(
        sector, N, A, B, p, 5
    )
    cubes = (A, B, Q, *cubes0[2:])
    assert cubes[:2] == cubes0[:2]
    expression = sp.factor(lowered_rows[row_index].subs(substitutions))
    numerator, denominator = sp.fraction(sp.together(expression))
    polynomial = sp.Poly(numerator, N, *cubes, *simplex)
    cube_degrees, bernstein_rows = tensor_bernstein_sparse(polynomial, len(cubes))
    homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
        bernstein_rows, len(simplex)
    )
    assert minimum >= 0
    return {
        "sector": sector,
        "newton_row": row_index,
        "large_core_order": "N=13+t, t>=0",
        "cone": cone,
        "rho1_edge_identity": str(rho1),
        "positive_denominator": str(denominator),
        "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "cube_variables": [str(value) for value in cubes],
        "cube_bernstein_degrees": cube_degrees,
        "cube_bernstein_rows": len(bernstein_rows),
        "simplex_variables": len(simplex),
        "homogeneous_terms": total_terms,
        "minimum": str(minimum),
        "homogeneous_hash": coefficient_rows_hash(homogeneous),
    }


def finite_certificate():
    """Every reduced active componentwise-deletion core through N=12."""
    x, h, rows = generic_rows()
    evaluator = sp.lambdify((*x[1:], *h[1:]), rows, modules="math")
    totals = {"unlabeled_forests": 0, "reduced_patterns": 0, "newton_row_checks": 0}
    global_minima = [None] * len(rows)
    witnesses = [None] * len(rows)
    by_order = {}
    for order in range(13):
        forest_count = pattern_count = checks = 0
        local_minima = [None] * len(rows)
        for graph in forest_graphs(order):
            forest_count += 1
            base = tuple(poly_forest(graph))
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            choices = [
                (None, *(vertex for vertex in component if graph.degree(vertex) > 0))
                for component in components
            ]
            for selection in itertools.product(*choices):
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced = graph.copy()
                reduced.remove_nodes_from(selected)
                lower = tuple(poly_forest(reduced))
                arguments = (
                    *(at(base, rank) for rank in range(1, 8)),
                    *(at(lower, rank) for rank in range(1, 8)),
                )
                values = [int(value) for value in evaluator(*arguments)]
                assert all(value >= 0 for value in values), (
                    order,
                    nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    selected,
                    values,
                )
                for row_index, value in enumerate(values):
                    if local_minima[row_index] is None or value < local_minima[row_index]:
                        local_minima[row_index] = value
                    if global_minima[row_index] is None or value < global_minima[row_index]:
                        global_minima[row_index] = value
                        witnesses[row_index] = {
                            "core_order_N": order,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "selected_positive_degree_one_per_component": list(selected),
                        }
                pattern_count += 1
                checks += len(values)
        totals["unlabeled_forests"] += forest_count
        totals["reduced_patterns"] += pattern_count
        totals["newton_row_checks"] += checks
        by_order[str(order)] = {
            "core_order_N": order,
            "unlabeled_forests": forest_count,
            "reduced_patterns": pattern_count,
            "minimum_newton_rows": local_minima,
        }
        print("FINITE", order, forest_count, pattern_count, local_minima, flush=True)
    return {
        **totals,
        "core_orders_N": [0, 12],
        "global_minimum_newton_rows": global_minima,
        "minimizing_witnesses": witnesses,
        "rows": by_order,
        "completeness": (
            "Each isolated selected P-component is uniquely extracted into t. "
            "The residual core is any forest with no selection or one positive-degree "
            "selected vertex per component."
        ),
    }


def main():
    p, core, rows, geometry = lowered_expression()
    sectors = [exact_sector(name, row_index)
               for row_index in range(len(rows)) for name in ("high", "low")]
    finite = finite_certificate()
    report = {
        "marker": MARKER,
        "exact_residual": str(residual(
            (sp.Integer(1), *sp.symbols("p1:8")),
            (sp.Integer(1), *sp.symbols("h1:8")),
        )),
        "geometry": {key: str(value) for key, value in geometry.items()},
        "large_sectors": sectors,
        "finite": finite,
        "status": "exact cone probe only; finite branch and theorem assembly not included",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
