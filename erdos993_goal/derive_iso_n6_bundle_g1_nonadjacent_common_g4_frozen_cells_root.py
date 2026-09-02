#!/usr/bin/env python3
"""Frozen G4 cells on the nonadjacent common-compatible marked minor."""

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
from derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root import independence_row
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON_G4_FROZEN_CELLS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def nonadjacent_common_g4_constraints(names, _s):
    linear = [
        ("R6_in_A7", sp.expand(names["CA7"] - names["CR6"])),
        ("R6_in_B7", sp.expand(names["CB7"] - names["CR6"])),
        ("R6_in_W6", sp.expand(names["CW6"] - names["CR6"])),
        (
            "R6_AB_union_W6",
            sp.expand(names["CW6"] - names["CA7"] - names["CB7"] + names["CR6"]),
        ),
    ]
    quadratic = [
        (
            "extension_R6",
            sp.expand((names["CZ3"] - 5) * names["CZ7"] - 6 * names["CR6"]),
        ),
    ]
    return linear, quadratic


def common_marked_rows(names):
    # CZ_(r+2)=i_r(R), and CR6=i_6(R).
    r = [
        sp.Integer(1), names["CZ3"], names["CZ4"], names["CZ5"],
        names["CZ6"], names["CZ7"], names["CR6"], sp.Integer(0),
    ]
    e = tuple(sp.expand(
        r[k]
        + (2 * r[k - 1] if k >= 1 else 0)
        + (r[k - 2] if k >= 2 else 0)
    ) for k in range(8))
    u = tuple(sp.expand(r[k] + (r[k - 1] if k else 0)) for k in range(8))
    return e, u, u, tuple(r)


def nonadjacent_common_g4_frozen_cells(variables):
    names = {str(variable): variable for variable in variables}
    missing = [name for name in [
        "s", "CR6", *(f"CZ{rank}" for rank in range(3, 8))
    ] if name not in names]
    if missing:
        raise RuntimeError(("missing G4 common-minor variables", missing))
    generic = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    original_states = state_rows(generic)
    minor_states = state_rows(common_marked_rows(names))
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
    coefficient = reconstruct(4)
    if any(str(symbol)[-1:] == "7" for symbol in coefficient.free_symbols):
        raise RuntimeError("G4 unexpectedly uses a row above rank six")
    cells = []
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
            elif symbol_name == "CZ2":
                replacements[symbol] = 1
            else:
                raise RuntimeError(f"unexpected G4 C-to-M symbol {symbol_name}")
        cells.append((
            f"G4(C{superstate},M{minorstate})",
            sp.expand(expression.xreplace(replacements)),
        ))
    for superstate, minorstate in internal_pairs:
        drows = zero if minorstate == "0" else minor_states[minorstate]
        cells.append((
            f"G4(M{superstate},M{minorstate})",
            sp.expand(substitute(coefficient, minor_states[superstate], drows)),
        ))
    return cells


def main() -> None:
    variable_names = [
        "s", *(f"CA{rank}" for rank in range(2, 8)),
        *(f"CB{rank}" for rank in range(2, 8)),
        *(f"CW{rank}" for rank in range(2, 8)),
        *(f"CZ{rank}" for rank in range(3, 8)), "CR6", "HX",
    ]
    variables = tuple(sp.Symbol(name, integer=True, nonnegative=True) for name in variable_names)
    names = {str(variable): variable for variable in variables}
    linear, quadratic = nonadjacent_common_g4_constraints(names, names["s"])
    cells = nonadjacent_common_g4_frozen_cells(variables)
    expressions = [("linear:" + name, value) for name, value in linear]
    expressions += [("quadratic:" + name, value) for name, value in quadratic]
    expressions += [("frozen:" + name, value) for name, value in cells]
    evaluators = []
    for name, expression in expressions:
        arguments = tuple(sorted(expression.free_symbols, key=str))
        evaluators.append((name, arguments, sp.lambdify(arguments, expression, "math")))

    catalog = tree_catalog(9)
    counts = Counter()
    minima = {name: None for name, _, _ in evaluators}
    failures = []
    row_failures = []
    stream = hashlib.sha256()
    for order in range(8, 10):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if graph.has_edge(u, v):
                    continue
                rnodes = {
                    node for node in graph if node not in {u, v}
                    and not graph.has_edge(node, u) and not graph.has_edge(node, v)
                }
                rrow = independence_row(graph, rnodes)
                values = {**categories(rows(graph, u, v)), "s": order - 8, "CR6": rrow[6], "HX": 0}
                if any(values[f"CZ{rank}"] != rrow[rank - 2] for rank in range(3, 8)):
                    row_failures.append((order, graph6, u, v))
                    continue
                for name, arguments, evaluate in evaluators:
                    value = int(evaluate(*(values[str(argument)] for argument in arguments)))
                    if value < 0:
                        failures.append((order, graph6, u, v, name, value))
                    counts[f"{name}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                    minima[name] = value if minima[name] is None else min(minima[name], value)
                    stream.update(f"{order}|{forest_index}|{graph6}|{u}|{v}|{name}|{value};".encode())

    marker = MARKER if not failures and not row_failures else "FAIL_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON_G4_FROZEN_CELLS_ROOT"
    report = {
        "marker": marker,
        "proof": (
            "CR6=i_6(R) for the vertices adjacent to neither nonadjacent mark.  "
            "It is contained in the A7, B7, and W6 families, satisfies their "
            "two-set union bound, and obeys 6*i_6(R)<=(|R|-5)*i_5(R).  These "
            "coordinates give every C-to-M and M-internal frozen G4 cell."
        ),
        "constraint_count": {"linear": len(linear), "quadratic": len(quadratic)},
        "frozen_cell_count": len(cells),
        "frozen_cell_partition": {"C_to_M": 9, "M_internal": 13},
        "coverage": "Implementation replay on every nonisomorphic forest of orders 8 and 9 and every nonadjacent marked pair.",
        "row_formula_failures": row_failures,
        "negative_cells": len(failures),
        "failures": failures,
        "minima": minima,
        "counts": dict(counts),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The structural arguments are universal and the finite census checks "
            "the implementation.  These cells strengthen a cone but do not prove its target."
        ),
        "dependencies_sha256": {
            "nonadjacent_common_frozen_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root.py"
            ),
            "frozen_g2_g10_assembly": sha256(
                HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"
            ),
        },
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": marker,
        "constraint_count": report["constraint_count"],
        "frozen_cell_count": len(cells),
        "row_formula_failures": len(row_failures),
        "negative_cells": len(failures),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(marker)


if __name__ == "__main__":
    main()
