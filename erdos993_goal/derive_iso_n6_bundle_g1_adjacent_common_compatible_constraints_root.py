#!/usr/bin/env python3
"""Exact common-compatible induced-forest constraints for adjacent marks."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_adjacent_common_compatible_constraints_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_COMPATIBLE_CONSTRAINTS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def adjacent_common_constraints(
    names: dict[str, sp.Symbol],
    s: sp.Symbol,
) -> tuple[
    list[tuple[str, sp.Expr]],
    list[tuple[str, sp.Expr]],
    list[tuple[str, sp.Expr]],
    list[tuple[str, sp.Expr]],
]:
    """Return linear through quartic constraints for R=H-(U union V)."""
    m = s + 6
    rorder = sp.expand(names["CA2"] + names["CB2"] - m)
    linear: list[tuple[str, sp.Expr]] = []
    quadratic: list[tuple[str, sp.Expr]] = []
    cubic: list[tuple[str, sp.Expr]] = []
    quartic: list[tuple[str, sp.Expr]] = []
    for rank in range(2, 7):
        rr = names[f"CR{rank}"]
        linear.extend([
            (f"R_in_A_r{rank}", names[f"CA{rank + 1}"] - rr),
            (f"R_in_B_r{rank}", names[f"CB{rank + 1}"] - rr),
            (f"R_in_W_r{rank}", names[f"CW{rank}"] - rr),
            (
                f"AB_intersection_W_r{rank}",
                names[f"CW{rank}"] - names[f"CA{rank + 1}"]
                - names[f"CB{rank + 1}"] + rr,
            ),
        ])
        previous = rorder if rank == 2 else names[f"CR{rank - 1}"]
        quadratic.append((
            f"extension_R{rank}",
            sp.expand((rorder - rank + 1) * previous - rank * rr),
        ))
    quadratic.extend([
        ("R_pair_lower", sp.expand(2 * names["CR2"] - rorder * (rorder - 3))),
        ("R_pair_upper", sp.expand(rorder * (rorder - 1) - 2 * names["CR2"])),
    ])
    cubic.extend([
        (
            "R_triple_lower",
            sp.expand(6 * names["CR3"] - (rorder - 2) * (rorder - 3) * (rorder - 4)),
        ),
        (
            "R_triple_upper",
            sp.expand(rorder * (rorder - 1) * (rorder - 2) - 6 * names["CR3"]),
        ),
    ])
    quartic.extend([
        (
            "R_quadruple_lower",
            sp.expand(
                24 * names["CR4"]
                - (rorder - 3) * (rorder - 4) * (rorder - 5) * (rorder - 6)
                + 360
            ),
        ),
        (
            "R_quadruple_upper",
            sp.expand(
                rorder * (rorder - 1) * (rorder - 2) * (rorder - 3)
                - 24 * names["CR4"]
            ),
        ),
    ])
    return linear, quadratic, cubic, quartic


def independence_row(graph: nx.Graph, nodes: set[int], maximum: int = 6) -> list[int]:
    return [
        sum(
            all(not graph.has_edge(left, right) for left, right in itertools.combinations(subset, 2))
            for subset in itertools.combinations(sorted(nodes), rank)
        )
        for rank in range(maximum + 1)
    ]


def main() -> None:
    s = sp.Symbol("s", nonnegative=True)
    names = {
        name: sp.Symbol(name, integer=True, nonnegative=True)
        for name in [
            *(f"CA{rank}" for rank in range(2, 8)),
            *(f"CB{rank}" for rank in range(2, 8)),
            *(f"CW{rank}" for rank in range(2, 7)),
            *(f"CR{rank}" for rank in range(2, 7)),
        ]
    }
    groups = adjacent_common_constraints(names, s)
    constraints = [item for group in groups for item in group]
    evaluators = []
    for name, expression in constraints:
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators.append((name, variables, sp.lambdify(variables, expression, "math")))

    catalog = tree_catalog(10)
    counts = Counter()
    minima = {name: None for name, _, _ in evaluators}
    size_failures = []
    stream = hashlib.sha256()
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if not graph.has_edge(u, v):
                    continue
                h_nodes = set(graph) - {u, v}
                u_set = {node for node in h_nodes if graph.has_edge(v, node)}
                v_set = {node for node in h_nodes if graph.has_edge(u, node)}
                r_nodes = h_nodes - (u_set | v_set)
                rrow = independence_row(graph, r_nodes)
                values = {**categories(rows(graph, u, v)), "s": order - 8}
                values.update({f"CR{rank}": rrow[rank] for rank in range(2, 7)})
                expected_order = values["CA2"] + values["CB2"] - (order - 2)
                if expected_order != len(r_nodes):
                    size_failures.append((order, graph6, u, v, expected_order, len(r_nodes)))
                for name, variables, evaluate in evaluators:
                    value = int(evaluate(*(values[str(variable)] for variable in variables)))
                    counts[f"{name}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                    minima[name] = value if minima[name] is None else min(minima[name], value)
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{name}|{value};".encode()
                    )

    negatives = sum(value for key, value in counts.items() if key.endswith(":negative"))
    passed = not negatives and not size_failures
    marker = MARKER if passed else "FAIL_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_COMPATIBLE_CONSTRAINTS_ROOT"
    report = {
        "marker": marker,
        "constraint_counts": {
            "linear": len(groups[0]),
            "quadratic": len(groups[1]),
            "cubic": len(groups[2]),
            "quartic": len(groups[3]),
        },
        "proof": (
            "For adjacent marks, U=N_H(v) and V=N_H(u) are disjoint.  "
            "R=H-(U union V) is an induced forest of order CA2+CB2-m; its r-sets "
            "are exactly the intersection of the A and B compatible r-set families."
        ),
        "coverage": "Every nonisomorphic forest of orders 8,9,10 and every adjacent marked pair.",
        "negative_cells": negatives,
        "size_failures": size_failures,
        "minima": minima,
        "counts": dict(counts),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The combinatorial construction is universal; the finite census is an implementation replay."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "negative_cells": negatives,
        "size_failures": len(size_failures),
        "constraint_counts": report["constraint_counts"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
