#!/usr/bin/env python3
"""Frozen G2--G3 cells on the adjacent common-compatible marked minor."""

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
from derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root import state_rows
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_adjacent_common_low_frozen_cells_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_LOW_FROZEN_CELLS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def adjacent_common_low_constraints(names, s):
    rorder = sp.expand(names["CA2"] + names["CB2"] - (s + 6))
    return (
        [("R_in_W_r7", sp.expand(names["CW7"] - names["CR7"]))],
        [("extension_R7", sp.expand((rorder - 6) * names["CR6"] - 7 * names["CR7"]))],
    )


def common_marked_rows(names, s):
    rorder = sp.expand(names["CA2"] + names["CB2"] - (s + 6))
    r = [sp.Integer(1), rorder] + [names[f"CR{rank}"] for rank in range(2, 8)]
    e = tuple(sp.expand(r[k] + (2 * r[k - 1] if k else 0)) for k in range(8))
    u = tuple(sp.expand(r[k] + (r[k - 1] if k else 0)) for k in range(8))
    return e, u, u, tuple(r)


def adjacent_common_low_frozen_cells(variables):
    names = {str(variable): variable for variable in variables}
    missing = [name for name in [
        "s", "CA2", "CB2", *(f"CR{rank}" for rank in range(2, 8))
    ] if name not in names]
    if missing:
        raise RuntimeError(("missing low common-minor variables", missing))
    generic = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    original_states = state_rows(generic)
    minor_states = state_rows(common_marked_rows(names, names["s"]))
    zero = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    n = sp.Symbol("n")
    structural = {sp.Symbol(f"c{family}0"): 1 for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
    })
    partition, _ = partition_substitution("C", "c", 7)
    nonzero_pairs = [
        ("E", "E"), ("E", "U"), ("E", "V"), ("E", "W"),
        ("U", "U"), ("U", "W"), ("V", "V"), ("V", "W"), ("W", "W"),
    ]
    internal_pairs = [
        ("E", "0"), *nonzero_pairs[:4],
        ("U", "0"), *nonzero_pairs[4:6],
        ("V", "0"), *nonzero_pairs[6:8],
        ("W", "0"), nonzero_pairs[8],
    ]
    cells = []
    for index in (2, 3):
        coefficient = reconstruct(index)
        for superstate, minorstate in nonzero_pairs:
            expression = substitute(
                coefficient, original_states[superstate], minor_states[minorstate]
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
                    raise RuntimeError(f"unexpected low C-to-M symbol {symbol_name}")
            cells.append((
                f"G{index}(C{superstate},M{minorstate})",
                sp.expand(expression.xreplace(replacements)),
            ))
        for superstate, minorstate in internal_pairs:
            drows = zero if minorstate == "0" else minor_states[minorstate]
            cells.append((
                f"G{index}(M{superstate},M{minorstate})",
                sp.expand(substitute(coefficient, minor_states[superstate], drows)),
            ))
    return cells


def independence_row(graph, nodes, maximum=7):
    return tuple(
        sum(
            all(not graph.has_edge(a, b) for a, b in itertools.combinations(subset, 2))
            for subset in itertools.combinations(sorted(nodes), rank)
        )
        for rank in range(maximum + 1)
    )


def main() -> None:
    variable_names = [
        "s", *(f"CA{rank}" for rank in range(2, 8)),
        *(f"CB{rank}" for rank in range(2, 8)),
        *(f"CW{rank}" for rank in range(2, 8)),
        *(f"CR{rank}" for rank in range(2, 8)),
    ]
    variables = tuple(sp.Symbol(name, integer=True, nonnegative=True) for name in variable_names)
    names = {str(variable): variable for variable in variables}
    linear, quadratic = adjacent_common_low_constraints(names, names["s"])
    cells = adjacent_common_low_frozen_cells(variables)
    expressions = [("linear:" + name, value) for name, value in linear]
    expressions += [("quadratic:" + name, value) for name, value in quadratic]
    expressions += [("frozen:" + name, value) for name, value in cells]
    evaluators = []
    for name, expression in expressions:
        args = tuple(sorted(expression.free_symbols, key=str))
        evaluators.append((name, args, sp.lambdify(args, expression, "math")))

    catalog = tree_catalog(9)
    counts = Counter()
    minima = {name: None for name, _, _ in evaluators}
    failures = []
    stream = hashlib.sha256()
    for order in range(8, 10):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if not graph.has_edge(u, v):
                    continue
                h_nodes = set(graph) - {u, v}
                uset = {node for node in h_nodes if graph.has_edge(v, node)}
                vset = {node for node in h_nodes if graph.has_edge(u, node)}
                rnodes = h_nodes - (uset | vset)
                rrow = independence_row(graph, rnodes)
                values = {**categories(rows(graph, u, v)), "s": order - 8}
                values.update({f"CR{rank}": rrow[rank] for rank in range(2, 8)})
                for name, args, evaluate in evaluators:
                    value = int(evaluate(*(values[str(arg)] for arg in args)))
                    if value < 0:
                        failures.append((order, graph6, u, v, name, value))
                    counts[f"{name}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                    minima[name] = value if minima[name] is None else min(minima[name], value)
                    stream.update(f"{order}|{forest_index}|{graph6}|{u}|{v}|{name}|{value};".encode())

    marker = MARKER if not failures else "FAIL_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_COMMON_LOW_FROZEN_CELLS_ROOT"
    report = {
        "marker": marker,
        "proof": (
            "CR7=i_7(R) is a genuine nonnegative forest coordinate. It satisfies "
            "CR7<=CW7 and 7*CR7<=(|R|-6)CR6. With this coordinate the exact "
            "K2(u,v) disjoint union R rows import every C-to-M and M-internal frozen G2,G3 cell."
        ),
        "constraint_count": {"linear": len(linear), "quadratic": len(quadratic)},
        "frozen_cell_count": len(cells),
        "frozen_cell_partition": {"C_to_M": 2 * 9, "M_internal": 2 * 13},
        "coverage": "Implementation replay on every nonisomorphic forest of orders 8 and 9 and every adjacent marked edge.",
        "negative_cells": len(failures),
        "failures": failures,
        "minima": minima,
        "counts": dict(counts),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The forest and induced-minor arguments are universal; the finite census checks implementation. "
            "The cells strengthen a cone but do not alone prove its target."
        ),
        "dependencies_sha256": {
            "adjacent_common_frozen_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root.py"
            ),
            "frozen_g2_g10_assembly": sha256(
                HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "constraint_count": report["constraint_count"],
        "frozen_cell_count": len(cells),
        "negative_cells": len(failures),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
