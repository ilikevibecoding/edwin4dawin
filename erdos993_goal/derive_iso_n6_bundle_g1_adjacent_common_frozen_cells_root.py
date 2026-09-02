#!/usr/bin/env python3
"""Frozen G4--G10 cells induced by the adjacent common-compatible minor.

For adjacent marks u,v in a forest C, put H=C-{u,v},
U=N_H(v), V=N_H(u), and R=H-(U union V).  The induced marked forest
M=C[R union {u,v}] is the disjoint union of the marked edge uv and R.
Consequently its four deletion rows are determined by the independence row of
R.  This module exposes every theorem-valid G4--G10 cell internal to M and
between the four natural deletion states of C and M.
"""

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
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_adjacent_common_frozen_cells_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_FROZEN_CELLS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def state_rows(generic):
    e, u, v, w = generic
    return {
        "E": generic,
        "U": (u, u, w, w),
        "V": (v, w, v, w),
        "W": (w, w, w, w),
    }


def common_marked_rows(names: dict[str, sp.Symbol], s: sp.Symbol):
    """Rows of M=K2(u,v) disjoint union R, through rank six.

    G4--G10 use no row coordinate above rank six.  The rank-seven slot is a
    harmless zero placeholder and is asserted unused before a cell is kept.
    """
    rorder = sp.expand(names["CA2"] + names["CB2"] - (s + 6))
    r = [sp.Integer(1), rorder] + [names[f"CR{rank}"] for rank in range(2, 7)] + [sp.Integer(0)]
    e = tuple(sp.expand(r[k] + (2 * r[k - 1] if k else 0)) for k in range(8))
    u = tuple(sp.expand(r[k] + (r[k - 1] if k else 0)) for k in range(8))
    v = u
    w = tuple(r)
    return e, u, v, w


def adjacent_common_frozen_cells(
    variables: tuple[sp.Symbol, ...],
) -> list[tuple[str, sp.Expr]]:
    """Return theorem-valid G4--G10 polynomials involving the minor M."""
    names = {str(variable): variable for variable in variables}
    missing = [name for name in [
        "s", "CA2", "CB2", *(f"CR{rank}" for rank in range(2, 7))
    ] if name not in names]
    if missing:
        raise RuntimeError(("missing common-minor variables", missing))

    generic = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    original_states = state_rows(generic)
    minor_generic = common_marked_rows(names, names["s"])
    minor_states = state_rows(minor_generic)
    zero = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")

    n = sp.Symbol("n")
    structural = {sp.Symbol(f"c{family}0"): 1 for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
    })
    partition, _ = partition_substitution("C", "c", 7)

    # The same deletion-state inclusion poset used by the canonical frozen
    # cells.  The nine nonzero pairs are valid from C to M; all thirteen pairs
    # (including zero boundaries) are valid internally to M.
    nonzero_pairs = [
        ("E", "E"), ("E", "U"), ("E", "V"), ("E", "W"),
        ("U", "U"), ("U", "W"),
        ("V", "V"), ("V", "W"),
        ("W", "W"),
    ]
    internal_pairs = [
        ("E", "0"), *nonzero_pairs[:4],
        ("U", "0"), *nonzero_pairs[4:6],
        ("V", "0"), *nonzero_pairs[6:8],
        ("W", "0"), nonzero_pairs[8],
    ]

    cells: list[tuple[str, sp.Expr]] = []
    for index in range(4, 11):
        coefficient = reconstruct(index)
        if any(str(symbol)[-1:] == "7" for symbol in coefficient.free_symbols):
            raise RuntimeError(f"G{index} unexpectedly uses rank seven")
        for superstate, minorstate in nonzero_pairs:
            expression = substitute(
                coefficient,
                original_states[superstate],
                minor_states[minorstate],
            )
            expression = sp.expand(
                expression.subs(structural).subs(partition).subs(n, names["s"] + 8)
            )
            replacements = {}
            for symbol in expression.free_symbols:
                symbol_name = str(symbol)
                if symbol_name in names:
                    replacements[symbol] = names[symbol_name]
                elif symbol_name.startswith("CZ"):
                    replacements[symbol] = 0
                else:
                    raise RuntimeError(f"unexpected C-to-M symbol {symbol_name}")
            cells.append((
                f"G{index}(C{superstate},M{minorstate})",
                sp.expand(expression.xreplace(replacements)),
            ))

        for superstate, minorstate in internal_pairs:
            drows = zero if minorstate == "0" else minor_states[minorstate]
            expression = sp.expand(substitute(
                coefficient,
                minor_states[superstate],
                drows,
            ))
            cells.append((
                f"G{index}(M{superstate},M{minorstate})",
                expression,
            ))
    return cells


def independence_row(graph: nx.Graph, nodes: set[int], maximum: int = 7):
    return tuple(
        sum(
            all(not graph.has_edge(a, b) for a, b in itertools.combinations(subset, 2))
            for subset in itertools.combinations(sorted(nodes), rank)
        )
        for rank in range(maximum + 1)
    )


def main() -> None:
    s = sp.Symbol("s", integer=True, nonnegative=True)
    variable_names = [
        "s",
        *(f"CA{rank}" for rank in range(2, 8)),
        *(f"CB{rank}" for rank in range(2, 8)),
        *(f"CW{rank}" for rank in range(2, 8)),
        *(f"CR{rank}" for rank in range(2, 7)),
    ]
    variables = tuple(sp.Symbol(name, integer=True, nonnegative=True) for name in variable_names)
    cells = adjacent_common_frozen_cells(variables)
    evaluators = []
    for name, expression in cells:
        args = tuple(sorted(expression.free_symbols, key=str))
        evaluators.append((name, args, sp.lambdify(args, expression, "math")))

    catalog = tree_catalog(9)
    counts = Counter()
    minima = {name: None for name, _, _ in evaluators}
    stream = hashlib.sha256()
    row_failures = []
    for order in range(8, 10):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if not graph.has_edge(u, v):
                    continue
                h_nodes = set(graph) - {u, v}
                u_set = {node for node in h_nodes if graph.has_edge(v, node)}
                v_set = {node for node in h_nodes if graph.has_edge(u, node)}
                r_nodes = h_nodes - (u_set | v_set)
                mgraph = graph.subgraph(r_nodes | {u, v}).copy()
                direct = rows(mgraph, u, v)
                rrow = independence_row(graph, r_nodes)
                formula = (
                    tuple(rrow[k] + (2 * rrow[k - 1] if k else 0) for k in range(8)),
                    tuple(rrow[k] + (rrow[k - 1] if k else 0) for k in range(8)),
                    tuple(rrow[k] + (rrow[k - 1] if k else 0) for k in range(8)),
                    rrow,
                )
                if direct != formula:
                    row_failures.append((order, graph6, u, v))
                    continue
                values = {**categories(rows(graph, u, v)), "s": order - 8}
                values.update({f"CR{rank}": rrow[rank] for rank in range(2, 7)})
                for name, args, evaluate in evaluators:
                    value = int(evaluate(*(values[str(arg)] for arg in args)))
                    counts[f"{name}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                    minima[name] = value if minima[name] is None else min(minima[name], value)
                    stream.update(f"{order}|{forest_index}|{graph6}|{u}|{v}|{name}|{value};".encode())

    negatives = sum(value for key, value in counts.items() if key.endswith(":negative"))
    passed = not row_failures and not negatives
    marker = MARKER if passed else "FAIL_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_FROZEN_CELLS_ROOT"
    report = {
        "marker": marker,
        "proof": (
            "M=C[R union {u,v}] is an actual induced marked minor. Since adjacent u,v "
            "have no neighbor in R, M is K2(u,v) disjoint union R, giving the four "
            "displayed deletion-row formulas. Every listed C-to-M and M-internal "
            "G4--G10 cell is therefore an instance of a frozen universal theorem."
        ),
        "cell_count": len(cells),
        "cell_partition": {"C_to_M": 7 * 9, "M_internal": 7 * 13},
        "coverage": "Implementation replay on every nonisomorphic forest of orders 8 and 9 and every adjacent marked edge.",
        "row_formula_failures": row_failures,
        "negative_cells": negatives,
        "minima": minima,
        "counts": dict(counts),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The induced-minor argument is universal; the finite census checks the implementation. "
            "These cells strengthen the retained-isolate cone but do not alone prove its target."
        ),
        "dependencies_sha256": {
            "adjacent_common_constraints": sha256(HERE / "derive_iso_n6_bundle_g1_adjacent_common_compatible_constraints_root.py"),
            "frozen_g2_g10_assembly": sha256(HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "cell_count": len(cells),
        "row_formula_failures": len(row_failures),
        "negative_cells": negatives,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
