#!/usr/bin/env python3
"""Finite exact census of the five unresolved small-endpoint parent forms.

The interval-sum cone leaves five Newton cells at (ell,k-index) =
(1,0),(1,1),(2,0),(3,0),(4,0).  This probe evaluates them on every forest
R through order 12 and every literal componentwise deletion Q (none or one
selected vertex per component, including isolated components).  It is
finite evidence only unless a negative exact obstruction is found.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_small_unresolved_finite_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_SMALL_UNRESOLVED_FINITE_ROOT"
TARGETS = ((1, 0), (1, 1), (2, 0), (3, 0), (4, 0))


def main() -> None:
    expression, rows = endpoint_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    forms = {}
    for length in range(1, 5):
        x, u, y, z = child_rows(length, k)
        substitutions = {}
        for rank in range(1, 7):
            substitutions.update({
                rows["X"][rank]: x[rank],
                rows["U"][rank]: u[rank],
                rows["Y"][rank]: y[rank],
                rows["Z"][rank]: z[rank],
            })
        reduced = sp.expand(expression.subs(substitutions))
        _degrees, coefficients = tensor_binomial(reduced, (k,))
        for target in TARGETS:
            if target[0] == length:
                forms[target] = coefficients[(target[1],)]
    assert set(forms) == set(TARGETS)

    variables = tuple(list(rows["Q"][1:6]) + list(rows["R"][1:7]))
    ordered_targets = list(TARGETS)
    evaluator = sp.lambdify(variables, [forms[target] for target in ordered_targets], modules="math")
    minima = {target: None for target in ordered_targets}
    witnesses = {target: None for target in ordered_targets}
    negative = []
    total_forests = total_patterns = total_checks = 0
    per_order = {}
    digest = hashlib.sha256()

    for order in range(13):
        forest_count = pattern_count = 0
        local_minima = {target: None for target in ordered_targets}
        for graph in forest_graphs(order):
            forest_count += 1
            base = tuple(poly_forest(graph))
            components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
            choices = [(None, *component) for component in components]
            for selection in itertools.product(*choices):
                selected = tuple(vertex for vertex in selection if vertex is not None)
                reduced_graph = graph.copy()
                reduced_graph.remove_nodes_from(selected)
                lower = tuple(poly_forest(reduced_graph))
                arguments = (
                    *(lower[rank] if rank < len(lower) else 0 for rank in range(1, 6)),
                    *(base[rank] if rank < len(base) else 0 for rank in range(1, 7)),
                )
                values = tuple(int(value) for value in evaluator(*arguments))
                digest.update(f"{order}:{base}:{lower}:{selected}:{values};".encode())
                for target, value in zip(ordered_targets, values):
                    if minima[target] is None or value < minima[target]:
                        minima[target] = value
                        witnesses[target] = {
                            "order": order,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "selected_one_per_component": list(selected),
                            "R": list(base),
                            "Q": list(lower),
                        }
                    if local_minima[target] is None or value < local_minima[target]:
                        local_minima[target] = value
                    if value < 0 and len(negative) < 20:
                        negative.append({
                            "ell": target[0], "k_index": target[1], "value": value,
                            "order": order,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "selected_one_per_component": list(selected),
                        })
                pattern_count += 1
        total_forests += forest_count
        total_patterns += pattern_count
        total_checks += pattern_count * len(ordered_targets)
        per_order[str(order)] = {
            "forests": forest_count,
            "literal_componentwise_patterns": pattern_count,
            "minima": {f"ell{target[0]}_k{target[1]}": local_minima[target] for target in ordered_targets},
        }
        print("FINITE", order, forest_count, pattern_count, per_order[str(order)]["minima"], flush=True)

    report = {
        "marker": MARKER,
        "orders": [0, 12],
        "targets": [[ell, index] for ell, index in ordered_targets],
        "unlabeled_forests": total_forests,
        "literal_componentwise_patterns": total_patterns,
        "exact_form_checks": total_checks,
        "minima": {f"ell{target[0]}_k{target[1]}": minima[target] for target in ordered_targets},
        "minimizing_witnesses": {f"ell{target[0]}_k{target[1]}": witnesses[target] for target in ordered_targets},
        "negative_count_stored": len(negative),
        "first_negatives": negative,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "per_order": per_order,
        "scope": "finite componentwise-deletion evidence only; no all-order sign claim",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "forests": total_forests,
        "patterns": total_patterns,
        "checks": total_checks,
        "minima": report["minima"],
        "negative_count_stored": len(negative),
        "first_negative": negative[0] if negative else None,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
