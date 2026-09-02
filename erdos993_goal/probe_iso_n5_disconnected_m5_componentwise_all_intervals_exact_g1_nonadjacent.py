#!/usr/bin/env python3
"""Exact rank-truncated cone probe for componentwise-deletion Psi sums 9--16.

This is deliberately labelled a probe until the finite branch and the
geometric assembly are written down.  It proves individual large-order
Newton rows by exact tensor-Bernstein and simplex-homogeneous transforms.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_all_intervals_componentwise_transport_g1_nonadjacent import (
    generic_rows,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_componentwise_all_intervals_exact_probe_g1_nonadjacent_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_COMPONENTWISE_ALL_INTERVALS_G1_NONADJACENT"
FINITE_SUMS = (9, 10, 11, 12, 13, 14, 16)


def lowered_rows(index: int):
    """Return exact valid endpoint lowers for one zero-based unique sum."""
    x, h, rows = generic_rows(index)
    N, A, B, Q = sp.symbols("N A B Q", nonnegative=True)
    a = N * A / 2
    b = B * N * (1 - A)
    c = a + b
    e = N - a
    q = a + Q * N * (1 - A) * (1 - B)
    edges = N - c
    base = {
        x[1]: N,
        x[2]: choose(N, 2) - edges,
        h[1]: e,
        h[2]: choose(e, 2) - (edges - q),
    }
    h3_lower = choose(e, 3) - (edges - q) * (e - 2)
    h3_upper = choose(e, 3)
    d4_lower = (
        choose(a, 4) + e * choose(a, 3) - q * choose(a - 1, 2)
    )
    d5_lower = (
        choose(a, 5) + e * choose(a, 4) - q * choose(a - 1, 3)
    )
    endpoints = {
        8: {h[3]: h3_lower},
        9: {h[3]: h3_upper},
        10: {h[3]: h3_upper},
        11: {h[3]: h3_lower, h[4]: x[4] - d4_lower},
        12: {h[3]: h3_upper, h[4]: choose(e, 4)},
        13: {
            h[3]: h3_lower,
            h[4]: x[4] - d4_lower,
            h[5]: x[5] - d5_lower,
        },
        14: {h[3]: h3_lower, h[4]: x[4] - d4_lower},
        15: {
            h[3]: h3_lower,
            h[4]: x[4] - d4_lower,
            h[5]: x[5] - d5_lower,
        },
    }[index]
    lowered = [sp.expand(row.subs(base).subs(endpoints)) for row in rows]
    max_rank = max(
        rank
        for row in lowered
        for rank in range(2, 7)
        if row.has(x[rank])
    )
    return x, (N, A, B, Q), (a, b, c, e, q, edges), lowered, max_rank


def ratio_parameterization(sector: str, N, A, B, x, max_rank: int):
    """Exact forest-ratio cone, truncated at the largest used coefficient."""
    alpha, w = sp.symbols(f"{sector}_alpha {sector}_w", nonnegative=True)
    c = N * A / 2 + B * N * (1 - A)
    rho1_fixed = sp.factor(2 * N - 6 + 4 * c / N)

    if max_rank == 4:
        budget = rho1_fixed - 2
        if sector == "high":
            z = sp.symbols("high_z0:3", nonnegative=True)
            rho3 = budget * z[0]
            rho2 = rho3 + 1 + budget * z[1]
            rho1 = rho2 + 1 + budget * z[2]
            cubes = (A, B)
            cone = "delta1>=1, delta2>=1"
        else:
            z = sp.symbols("low_z0:2", nonnegative=True)
            rho3 = budget * z[0]
            rho2 = rho3 + 2 - alpha + budget * z[1]
            rho1 = rho2 + alpha
            cubes = (A, B, alpha)
            cone = "0<=delta1=alpha<=1, delta2>=2-alpha"
        ratios = (rho1, rho2, rho3)
    elif max_rank == 5:
        budget = rho1_fixed - 3
        if sector == "high":
            z = sp.symbols("high_z0:4", nonnegative=True)
            rho4 = budget * z[0]
            rho3 = rho4 + 1 + budget * z[1]
            rho2 = rho3 + 1 + budget * z[2]
            rho1 = rho2 + 1 + budget * z[3]
            cubes = (A, B)
            cone = "delta1>=1, delta2>=1, delta3>=1"
        else:
            z = sp.symbols("low_z0:3", nonnegative=True)
            rho4 = budget * z[0]
            rho3 = rho4 + 1 + budget * z[1]
            rho2 = rho3 + 2 - alpha + budget * z[2]
            rho1 = rho2 + alpha
            cubes = (A, B, alpha)
            cone = "0<=delta1=alpha<=1, delta2>=2-alpha, delta3>=1"
        ratios = (rho1, rho2, rho3, rho4)
    elif max_rank == 6:
        rho5 = 2 * (N - 5) * w
        budget = rho1_fixed - rho5 - 4
        if sector == "high":
            z = sp.symbols("high_z0:4", nonnegative=True)
            rho4 = rho5 + 1 + budget * z[0]
            rho3 = rho4 + 1 + budget * z[1]
            rho2 = rho3 + 1 + budget * z[2]
            rho1 = rho2 + 1 + budget * z[3]
            cubes = (A, B, w)
            cone = "delta1,delta2,delta3,delta4>=1"
        else:
            z = sp.symbols("low_z0:3", nonnegative=True)
            rho4 = rho5 + 1 + budget * z[0]
            rho3 = rho4 + 1 + budget * z[1]
            rho2 = rho3 + 2 - alpha + budget * z[2]
            rho1 = rho2 + alpha
            cubes = (A, B, w, alpha)
            cone = (
                "0<=delta1=alpha<=1, delta2>=2-alpha, "
                "delta3,delta4>=1"
            )
        ratios = (rho1, rho2, rho3, rho4, rho5)
    else:
        raise AssertionError(max_rank)

    assert sp.factor(ratios[0] - rho1_fixed - budget * (sum(z) - 1)) == 0
    product = 1
    substitutions = {}
    for rank, rho in zip(range(2, max_rank + 1), ratios):
        product *= rho
        substitutions[x[rank]] = (
            N * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    return cubes, z, substitutions, cone, rho1_fixed


def exact_row(index: int, sector: str, row_index: int):
    x, core, geometry, rows, max_rank = lowered_rows(index)
    N, A, B, Q = core
    cubes0, z, coefficient_substitutions, cone, rho1 = ratio_parameterization(
        sector, N, A, B, x, max_rank
    )
    cubes = (A, B, Q, *cubes0[2:])
    # A and B are already the first two variables in cubes0.
    assert cubes[:2] == cubes0[:2]
    expression = rows[row_index].subs(coefficient_substitutions)
    numerator, denominator = sp.fraction(sp.together(expression))
    polynomial = sp.Poly(numerator, N, *cubes, *z)
    cube_degrees, bernstein_rows = tensor_bernstein_sparse(
        polynomial, len(cubes)
    )
    homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
        bernstein_rows, len(z)
    )
    return {
        "unique_sum": index + 1,
        "newton_row": row_index,
        "sector": sector,
        "max_coefficient_rank": max_rank,
        "cone": cone,
        "rho1_edge_identity": str(rho1),
        "positive_denominator": str(denominator),
        "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "cube_variables": [str(value) for value in cubes],
        "cube_bernstein_degrees": cube_degrees,
        "cube_bernstein_rows": len(bernstein_rows),
        "simplex_variables": len(z),
        "homogeneous_terms": total_terms,
        "minimum": str(minimum),
        "homogeneous_hash": coefficient_rows_hash(homogeneous),
    }


def finite_certificate():
    """Every reduced componentwise-deletion core through N=12."""
    x, h, _rows = generic_rows(8)
    rows_by_sum = {}
    flat_rows = []
    slices = {}
    for unique_sum in FINITE_SUMS:
        x2, h2, rows = generic_rows(unique_sum - 1)
        assert x2 == x and h2 == h
        start = len(flat_rows)
        flat_rows.extend(rows)
        slices[unique_sum] = (start, len(flat_rows))
        rows_by_sum[unique_sum] = rows
    assert all(
        coefficient.q == 1
        for row in flat_rows
        for coefficient in sp.Poly(row, *x, *h).coeffs()
    )
    evaluator = sp.lambdify((*x, *h), flat_rows, modules="math")
    global_minima = {
        unique_sum: [None] * len(rows_by_sum[unique_sum])
        for unique_sum in FINITE_SUMS
    }
    witnesses = {
        unique_sum: [None] * len(rows_by_sum[unique_sum])
        for unique_sum in FINITE_SUMS
    }
    order_report = {}
    total_forests = total_patterns = total_checks = 0
    for order in range(13):
        forest_count = pattern_count = 0
        local_minima = {
            unique_sum: [None] * len(rows_by_sum[unique_sum])
            for unique_sum in FINITE_SUMS
        }
        for graph in forest_graphs(order):
            forest_count += 1
            base = tuple(poly_forest(graph))
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            choices = [
                (None, *(vertex for vertex in component if graph.degree(vertex) > 0))
                for component in components
            ]
            # Isolated selected vertices have already been extracted into the
            # Newton factor (1+x)^t, so only positive-degree selections remain.
            for selection in itertools.product(*choices):
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced = graph.copy()
                reduced.remove_nodes_from(selected)
                lower = tuple(poly_forest(reduced))
                arguments = (
                    *(base[rank] if rank < len(base) else 0 for rank in range(8)),
                    *(lower[rank] if rank < len(lower) else 0 for rank in range(7)),
                )
                values = [int(value) for value in evaluator(*arguments)]
                assert len(values) == len(flat_rows)
                for unique_sum in FINITE_SUMS:
                    start, stop = slices[unique_sum]
                    selected_values = values[start:stop]
                    assert all(value >= 0 for value in selected_values), (
                        order,
                        unique_sum,
                        nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        selected,
                        selected_values,
                    )
                    for row_index, value in enumerate(selected_values):
                        local = local_minima[unique_sum]
                        if local[row_index] is None or value < local[row_index]:
                            local[row_index] = value
                        if (
                            global_minima[unique_sum][row_index] is None
                            or value < global_minima[unique_sum][row_index]
                        ):
                            global_minima[unique_sum][row_index] = value
                            witnesses[unique_sum][row_index] = {
                                "core_order_N": order,
                                "graph6": nx.to_graph6_bytes(
                                    graph, header=False
                                ).decode().strip(),
                                "selected_positive_degree_one_per_component": list(selected),
                            }
                pattern_count += 1
        total_forests += forest_count
        total_patterns += pattern_count
        total_checks += pattern_count * len(flat_rows)
        order_report[str(order)] = {
            "core_order_N": order,
            "unlabeled_forests": forest_count,
            "reduced_componentwise_deletion_patterns": pattern_count,
            "minimum_newton_rows_by_unique_sum": local_minima,
        }
        print(
            "FINITE",
            order,
            forest_count,
            pattern_count,
            json.dumps(local_minima, sort_keys=True),
            flush=True,
        )
    return {
        "core_orders_N": [0, 12],
        "unique_sums": list(FINITE_SUMS),
        "unlabeled_forests": total_forests,
        "reduced_componentwise_deletion_patterns": total_patterns,
        "newton_row_checks": total_checks,
        "global_minimum_newton_rows_by_unique_sum": global_minima,
        "minimizing_witnesses": witnesses,
        "rows": order_report,
        "completeness": (
            "Every isolated selected component is uniquely extracted into t. "
            "The residual core is an arbitrary forest, with either no selected "
            "vertex or one positive-degree selected vertex per component."
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sum", type=int, action="append", dest="sums")
    parser.add_argument("--sector", choices=("high", "low"), action="append")
    parser.add_argument("--row", type=int, action="append", dest="rows")
    parser.add_argument("--finite", action="store_true")
    parser.add_argument("--finite-only", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    sums = args.sums or list(range(9, 17))
    sectors = args.sector or ["high", "low"]
    result = []
    if not args.finite_only:
        for sum_index in sums:
            _x, _core, _geometry, rows, _max_rank = lowered_rows(sum_index - 1)
            selected_rows = args.rows or list(range(len(rows)))
            for sector in sectors:
                for row_index in selected_rows:
                    if row_index >= len(rows):
                        continue
                    row = exact_row(sum_index - 1, sector, row_index)
                    result.append(row)
                    print(json.dumps(row, sort_keys=True), flush=True)
                    gc.collect()
    finite = finite_certificate() if (args.finite or args.finite_only) else None
    report = {
        "marker": MARKER,
        "scope": "individual exact large-order cone rows only; not a theorem assembly",
        "rows": result,
        "finite": finite,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    args.output.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
