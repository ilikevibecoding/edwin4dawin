#!/usr/bin/env python3
"""Seven-vertex local-profile simplex stress test for the sum-zero g4 branch.

This strengthens the failed five-vertex profile relaxation by retaining the
complete W2..W5 independence profile of every induced seven-vertex forest.
The full profile simplex is still a relaxation of globally consistent local
statistics.  Negative points falsify only that relaxation.
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
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_local7_simplex_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUM0_LOCAL7_SIMPLEX_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def profiles(order=7):
    answer = set()
    for graph in nx.graph_atlas_g():
        if len(graph) != order or not nx.is_forest(graph):
            continue
        answer.add(tuple(
            sum(
                graph.subgraph(vertices).number_of_edges() == 0
                for vertices in itertools.combinations(graph, rank)
            )
            for rank in range(2, 6)
        ))
    return tuple(sorted(answer))


def main():
    upstream = json.loads(SUM0_REPORT.read_text(encoding="utf-8"))
    n = sp.Symbol("n")
    W = {rank: sp.Symbol(f"W{rank}") for rank in range(2, 6)}
    exact = sp.sympify(
        upstream["exact_shift_residual"],
        locals={"n": n, **{f"W{rank}": W[rank] for rank in W}},
    )
    local_order = 7
    rows = profiles(local_order)
    assert len(rows) == 36
    p = sp.symbols(f"p0:{len(rows)}")
    m = n - 2
    total = choose_poly(m, local_order)
    substitution = {}
    for offset, rank in enumerate(range(2, 6)):
        average = sum(p[index] * row[offset] for index, row in enumerate(rows))
        substitution[W[rank]] = sp.cancel(
            total * average / choose_poly(m - rank, local_order - rank)
        )
    relaxed = sp.cancel(exact.subs(substitution, simultaneous=True))
    assert sp.Poly(sp.fraction(relaxed)[0], *p).total_degree() <= 2

    rng = np.random.default_rng(993070407)
    orders = list(range(9, 31)) + [40, 60, 100, 200, 500]
    per_support = 3000
    support_sizes = [1, 2, 3, 4, 5, 8, 16, 36]
    total_points = 0
    minimum = None
    negatives = []
    for order in orders:
        evaluate = sp.lambdify(p, relaxed.subs(n, order), "numpy")
        for support_size in support_sizes:
            points = np.zeros((per_support, len(rows)))
            if support_size == 1:
                for index in range(per_support):
                    points[index, index % len(rows)] = 1.0
            else:
                for index in range(per_support):
                    support = rng.choice(len(rows), size=support_size, replace=False)
                    points[index, support] = rng.dirichlet(np.ones(support_size))
            values = np.asarray(evaluate(*points.T), dtype=float)
            if values.ndim == 0:
                values = np.full(per_support, float(values))
            total_points += per_support
            local_index = int(np.argmin(values))
            record = {
                "value": float(values[local_index]),
                "order": order,
                "support_size": support_size,
                "nonzero_profile_weights": [
                    {"profile": list(rows[index]), "weight": float(points[local_index, index])}
                    for index in np.flatnonzero(points[local_index])
                ],
            }
            if minimum is None or record["value"] < minimum["value"]:
                minimum = record
            negative_indices = np.flatnonzero(values < -1e-8)
            for index in negative_indices[: max(0, 20 - len(negatives))]:
                negatives.append({
                    "value": float(values[index]),
                    "order": order,
                    "support_size": support_size,
                    "nonzero_profile_weights": [
                        {"profile": list(rows[j]), "weight": float(points[index, j])}
                        for j in np.flatnonzero(points[index])
                    ],
                })

    report = {
        "marker": MARKER,
        "local_order": local_order,
        "unique_profiles": [list(row) for row in rows],
        "identity": (
            "W_k=C(m,7)*sum_j p_j*i_k(H_j)/C(m-k,7-k), p in the profile simplex"
        ),
        "search": {
            "seed": 993070407,
            "orders": orders,
            "support_sizes": support_sizes,
            "points_per_order_support": per_support,
            "total_points": total_points,
            "minimum": minimum,
            "negative_count_retained": len(negatives),
            "negative_witnesses": negatives,
        },
        "verdict": (
            "local-seven profile simplex falsified" if negatives
            else "no sampled local-seven simplex negative; not yet a theorem"
        ),
        "scope_guard": "Profile-simplex negatives are not genuine forest counterexamples.",
        "dependencies_sha256": {SUM0_REPORT.name: sha256(SUM0_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "profiles": len(rows),
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
