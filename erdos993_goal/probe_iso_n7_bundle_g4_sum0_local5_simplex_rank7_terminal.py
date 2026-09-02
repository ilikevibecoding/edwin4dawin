#!/usr/bin/env python3
"""Five-vertex local-profile simplex probe for the exact-shift g4 branch.

Every global independent k-set of W is counted in exactly C(m-k,5-k)
induced five-vertex subforests.  The ten possible independence profiles of a
five-vertex forest therefore give exact shared variables for W2,W3,W4,W5.
Relaxing their global counts to the full nonnegative simplex preserves every
forest and all cross-rank identities.  This script checks the resulting exact
quadratic coefficient signs; it does not overstate a failed simplex test.
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
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_local5_simplex_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G4_SUM0_LOCAL5_SIMPLEX_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def five_vertex_profiles():
    profiles = set()
    for graph in nx.graph_atlas_g():
        if len(graph) != 5 or not nx.is_forest(graph):
            continue
        row = []
        for rank in range(2, 6):
            row.append(sum(
                graph.subgraph(vertices).number_of_edges() == 0
                for vertices in itertools.combinations(graph, rank)
            ))
        profiles.add(tuple(row))
    return tuple(sorted(profiles))


def main():
    upstream = json.loads(SUM0_REPORT.read_text(encoding="utf-8"))
    n = sp.Symbol("n", integer=True, nonnegative=True)
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(2, 6)}
    exact = sp.sympify(
        upstream["exact_shift_residual"],
        locals={"n": n, **{f"W{rank}": W[rank] for rank in W}},
    )
    profiles = five_vertex_profiles()
    assert len(profiles) == 10
    probabilities = sp.symbols(f"p0:{len(profiles)}", nonnegative=True)
    m = n - 2
    total_five = choose_poly(m, 5)
    substitution = {}
    for offset, rank in enumerate(range(2, 6)):
        local_average = sum(
            probabilities[index] * profile[offset]
            for index, profile in enumerate(profiles)
        )
        substitution[W[rank]] = sp.cancel(
            total_five * local_average / choose_poly(m - rank, 5 - rank)
        )
    simplex = sp.cancel(exact.subs(substitution, simultaneous=True))
    numerator, denominator = map(sp.factor, sp.fraction(simplex))
    assert denominator.subs(n, 7) > 0
    polynomial = sp.Poly(sp.expand(numerator), *probabilities)
    assert polynomial.total_degree() <= 2

    coefficient_records = []
    all_tail_positive = True
    tail = sp.Symbol("t", integer=True, nonnegative=True)
    for monomial, coefficient in polynomial.terms():
        shifted = sp.Poly(sp.expand(coefficient.subs(n, tail + 7)), tail)
        scalar_coefficients = shifted.all_coeffs()
        passes = all(value >= 0 for value in scalar_coefficients)
        all_tail_positive &= passes
        coefficient_records.append({
            "monomial": list(monomial),
            "coefficient": str(sp.factor(coefficient)),
            "shift_n_equals_t_plus_7": str(sp.factor(shifted.as_expr())),
            "tail_negative_scalar_coefficients": sum(bool(value < 0) for value in scalar_coefficients),
            "tail_minimum_scalar_coefficient": str(min(scalar_coefficients)),
        })

    fixed = {}
    for order in range(7, 20):
        fixed_poly = sp.Poly(sp.expand(numerator.subs(n, order)), *probabilities)
        values = fixed_poly.coeffs()
        fixed[str(order)] = {
            "terms": len(fixed_poly.terms()),
            "negative_coefficients": sum(bool(value < 0) for value in values),
            "minimum_coefficient": str(min(values)),
        }

    rng = np.random.default_rng(993070406)
    sampled = {}
    simplex_function = sp.lambdify((n, *probabilities), simplex, "numpy")
    for order in list(range(7, 31)) + [40, 60, 100, 200, 500]:
        points = rng.dirichlet(np.ones(len(probabilities)), size=100000)
        values = np.asarray(simplex_function(order, *points.T), dtype=float)
        index = int(np.argmin(values))
        sampled[str(order)] = {
            "minimum": float(values[index]),
            "point": points[index].tolist(),
            "negative_count": int(np.sum(values < -1e-8)),
        }

    report = {
        "marker": MARKER,
        "profiles_W2_W3_W4_W5": [list(profile) for profile in profiles],
        "local_to_global_identity": (
            "W_k=C(m,5)*sum_j p_j*i_k(H_j)/C(m-k,5-k), p_j>=0, sum_j p_j=1"
        ),
        "simplex_numerator": str(numerator),
        "positive_denominator": str(denominator),
        "degree_in_profile_weights": polynomial.total_degree(),
        "coefficient_records": coefficient_records,
        "tail_from_n7_all_power_coefficients_nonnegative": all_tail_positive,
        "fixed_order_power_coefficients": fixed,
        "sampled_full_simplex": {
            "seed": 993070406,
            "points_per_order": 100000,
            "orders": sampled,
        },
        "verdict": (
            "full local-profile simplex has nonnegative coefficient certificate"
            if all_tail_positive
            else "local-profile simplex still has negative coefficient directions"
        ),
        "scope_guard": (
            "This probe concerns only the exact no-mark-neighbour branch of the valid g4 residual."
        ),
        "dependencies_sha256": {SUM0_REPORT.name: sha256(SUM0_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "profiles": len(profiles),
        "numerator_terms": len(polynomial.terms()),
        "tail_all_nonnegative": all_tail_positive,
        "fixed": fixed,
        "sampled_minimum": min(
            (value["minimum"], order) for order, value in sampled.items()
        ),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
