#!/usr/bin/env python3
"""Edge-budgeted seven-local-profile probe for the sum-zero g4 branch.

For a forest W on m vertices, the expected number of edges in a uniformly
chosen seven-set is mu=42e/(m(m-1))<=42/m.  Write the nonempty local-profile
weights as p_j=mu*y_j/e_j, where e_j is the local edge count and y lies in a
simplex.  This imposes the exact missing global sparsity constraint on the
otherwise false local-seven profile relaxation.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
SUM0_REPORT = HERE / "iso_n7_bundle_g4_sum0_exact_shift_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_local7_edge_budget_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUM0_LOCAL7_EDGE_BUDGET_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def local_profiles(order=7):
    rows = set()
    for graph in nx.graph_atlas_g():
        if len(graph) != order or not nx.is_forest(graph):
            continue
        rows.add(tuple(
            sum(
                graph.subgraph(vertices).number_of_edges() == 0
                for vertices in itertools.combinations(graph, rank)
            )
            for rank in range(2, 6)
        ))
    return tuple(sorted(rows))


def main():
    upstream = json.loads(SUM0_REPORT.read_text(encoding="utf-8"))
    n = sp.Symbol("n")
    m = n - 2
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(2, 6)}
    exact = sp.sympify(
        upstream["exact_shift_residual"],
        locals={"n": n, **{f"W{rank}": W[rank] for rank in W}},
    )
    profiles = local_profiles()
    edgeless = (21, 35, 35, 21)
    assert edgeless in profiles and len(profiles) == 36
    nonempty = tuple(profile for profile in profiles if profile != edgeless)
    edge_counts = tuple(21 - profile[0] for profile in nonempty)
    assert min(edge_counts) == 1 and max(edge_counts) == 6

    edge_scale = sp.Symbol("edge_scale", nonnegative=True)
    y = sp.symbols(f"y0:{len(nonempty)}", nonnegative=True)
    mu = 42 * edge_scale / m
    local_weights = [
        sp.cancel(mu * y[index] / edge_counts[index])
        for index in range(len(nonempty))
    ]
    edgeless_weight = 1 - sum(local_weights)
    substitution = {}
    for offset, rank in enumerate(range(2, 6)):
        average = edgeless_weight * edgeless[offset] + sum(
            local_weights[index] * profile[offset]
            for index, profile in enumerate(nonempty)
        )
        substitution[W[rank]] = sp.cancel(
            choose_poly(m, 7) * average / choose_poly(m - rank, 7 - rank)
        )
    budgeted = sp.cancel(exact.subs(substitution, simultaneous=True))
    numerator, denominator = map(sp.factor, sp.fraction(budgeted))
    # The original profile polynomial is quadratic.  Since every nonempty
    # profile weight is edge_scale*y_j, the reparameterized total degree is 4.
    assert sp.Poly(sp.expand(numerator), edge_scale, *y).total_degree() <= 4

    rng = np.random.default_rng(993070408)
    orders = list(range(44, 81)) + [100, 140, 200, 300, 500, 800, 1200]
    support_sizes = [1, 2, 3, 5, 10, 20, len(nonempty)]
    points_per_cell = 4000
    total_points = 0
    minimum = None
    negatives = []
    for order in orders:
        evaluate = sp.lambdify((edge_scale, *y), budgeted.subs(n, order), "numpy")
        for support_size in support_sizes:
            points = np.zeros((points_per_cell, len(nonempty)))
            for index in range(points_per_cell):
                support = rng.choice(len(nonempty), size=support_size, replace=False)
                points[index, support] = rng.dirichlet(np.ones(support_size))
            scales = rng.random(points_per_cell)
            values = np.asarray(evaluate(scales, *points.T), dtype=float)
            if values.ndim == 0:
                values = np.full(points_per_cell, float(values))
            total_points += points_per_cell
            local_index = int(np.argmin(values))
            record = {
                "value": float(values[local_index]),
                "order": order,
                "support_size": support_size,
                "edge_scale": float(scales[local_index]),
                "nonzero_y": [
                    {
                        "profile": list(nonempty[j]),
                        "local_edges": edge_counts[j],
                        "weight": float(points[local_index, j]),
                    }
                    for j in np.flatnonzero(points[local_index])
                ],
            }
            if minimum is None or record["value"] < minimum["value"]:
                minimum = record
            for index in np.flatnonzero(values < -1e-8)[: max(0, 20 - len(negatives))]:
                negatives.append({
                    "value": float(values[index]),
                    "order": order,
                    "support_size": support_size,
                    "edge_scale": float(scales[index]),
                    "nonzero_y": [
                        {
                            "profile": list(nonempty[j]),
                            "local_edges": edge_counts[j],
                            "weight": float(points[index, j]),
                        }
                        for j in np.flatnonzero(points[index])
                    ],
                })

    report = {
        "marker": MARKER,
        "local_order": 7,
        "nonempty_profiles": [
            {"profile": list(profile), "edges": edges}
            for profile, edges in zip(nonempty, edge_counts)
        ],
        "parameterization": {
            "mu": "42*edge_scale/m",
            "p_j": "mu*y_j/e_j",
            "simplex": "y_j>=0, sum_j y_j=1, 0<=edge_scale<=1",
            "edgeless_weight": str(edgeless_weight),
            "validity": (
                "mu is the expected local edge count; e<=m-1 gives mu<=42/m. "
                "For m>=42 the relaxed edgeless weight is nonnegative."
            ),
        },
        "positive_denominator": str(denominator),
        "search": {
            "seed": 993070408,
            "orders": orders,
            "support_sizes": support_sizes,
            "points_per_order_support": points_per_cell,
            "total_points": total_points,
            "minimum": minimum,
            "negative_count_retained": len(negatives),
            "negative_witnesses": negatives,
        },
        "verdict": (
            "edge-budgeted local-seven relaxation falsified" if negatives
            else "no sampled edge-budgeted local-seven negative; not yet a theorem"
        ),
        "scope_guard": "Only the no-mark-neighbour residual branch is tested.",
        "dependencies_sha256": {SUM0_REPORT.name: sha256(SUM0_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "tested": total_points,
        "minimum": minimum,
        "negative_count_retained": len(negatives),
        "verdict": report["verdict"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
