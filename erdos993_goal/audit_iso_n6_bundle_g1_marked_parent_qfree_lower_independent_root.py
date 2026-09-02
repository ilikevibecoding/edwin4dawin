#!/usr/bin/env python3
"""Independent exact replay of the marked-parent q-free lower reduction."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import (
    add_xd,
    forward_differences,
    isolate_multiply,
    nested,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_marked_parent_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_qfree_lower_independent_audit_root_20260901.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_QFREE_LOWER_ROOT"
EXPECTED_INPUT_SHA256 = "8C49DEA1D1E06AE00DD8582D202220277C568D4FF45FF17A80E90C6B30BDCB9E"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reconstruct_g1():
    crows = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(2):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower = sum(nested(isolate_multiply(crows, offset), 5) for offset in range(amount))
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - lower))
    return forward_differences(gamma)[1]


def add_u_leaf(rowset):
    e, u, v, w = rowset
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(rowset, (u, u, w, w)))


def partition(prefix, raw_prefix):
    rules = {}
    for rank in range(2, 8):
        w, a, b, z = sp.symbols(
            f"{prefix}W{rank} {prefix}A{rank} {prefix}B{rank} {prefix}Z{rank}",
            integer=True,
            nonnegative=True,
        )
        rules.update({
            sp.Symbol(f"{raw_prefix}W{rank}"): w,
            sp.Symbol(f"{raw_prefix}U{rank}"): w + a,
            sp.Symbol(f"{raw_prefix}V{rank}"): w + b,
            sp.Symbol(f"{raw_prefix}E{rank}"): w + a + b + z,
        })
    return rules


def negative_part(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    answer = sp.Integer(0)
    for powers, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        if coefficient < 0:
            term = sp.Integer(coefficient)
            for variable, power in zip(variables, powers):
                term *= variable**power
            answer += term
    return sp.expand(answer)


def evaluator(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, rowset in (("c", crows), ("d", drows)):
            for family, row in zip("EUVW", rowset):
                for rank, item in enumerate(row):
                    data[f"{prefix}{family}{rank}"] = item
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    g1 = reconstruct_g1()
    crows = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    omega = sp.expand(substitute(g1, add_u_leaf(crows), drows) - substitute(g1, crows, drows))
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
    structural = {sp.Symbol(f"{prefix}{family}0"): 1 for prefix in ("c", "d") for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    expression = sp.expand(
        omega.subs(structural).subs(partition("C", "c")).subs(partition("D", "d"))
    )
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    if not all(sp.diff(expression, a, b) == 0 for a in dvars for b in dvars):
        raise RuntimeError("independent replay found D nonlinearity")
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    lower = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    for dvar in dvars:
        lower += negative_part(sp.diff(expression, dvar)) * names["C" + str(dvar)[1:]]
    lower = sp.expand(lower)

    replayed = {}
    for geometry in ("adjacent", "nonadjacent"):
        expected = None
        for uvalue, vvalue in itertools.product((0, 1), repeat=2):
            label = f"{geometry}_u{uvalue}_v{vvalue}"
            rules = {eu: uvalue, ev: vvalue}
            if geometry == "adjacent":
                rules.update({
                    symbol: 0 for symbol in lower.free_symbols if str(symbol).startswith("CZ")
                })
            branch = sp.expand(lower.subs(rules))
            if q in branch.free_symbols:
                raise RuntimeError(("q survived", label))
            expected = branch if expected is None else expected
            if sp.expand(branch - expected) != 0:
                raise RuntimeError(("retention masks differ", label))
            recorded = sp.sympify(source["branches"][label]["lower_expression"])
            branch_names = {str(symbol): symbol for symbol in branch.free_symbols}
            recorded = recorded.xreplace({
                symbol: branch_names[str(symbol)]
                for symbol in recorded.free_symbols
                if str(symbol) in branch_names
            })
            if sp.expand(branch - recorded) != 0:
                raise RuntimeError(("recorded branch mismatch", label))
            replayed[label] = hashlib.sha256(sp.srepr(branch).encode()).hexdigest().upper()

    # Direct graph/minor inequality audit on every atlas forest through order
    # seven.  It checks the reconstructed Omega value against the independently
    # reconstructed lower for the actual branch.
    omega_value = evaluator(omega)
    lower_evaluators = {}
    for geometry in ("adjacent", "nonadjacent"):
        branch = sp.sympify(source["branches"][f"{geometry}_u0_v0"]["lower_expression"])
        variables = tuple(sorted(branch.free_symbols, key=str))
        lower_evaluators[geometry] = (variables, sp.lambdify(variables, branch, "math"))
    counts = Counter()
    minimum_slack = None
    failures = []
    stream = hashlib.sha256()
    cells = 0
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        nodes = tuple(graph)
        for u, v in itertools.permutations(nodes, 2):
            geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
            cactual = rows(graph, u, v)
            variables, evaluate_lower = lower_evaluators[geometry]
            values = {**categories(cactual), "n": len(graph)}
            lower_value = int(evaluate_lower(*(values[str(variable)] for variable in variables)))
            for mask in range(1 << len(nodes)):
                retained = {node for index, node in enumerate(nodes) if mask & (1 << index)}
                dgraph = graph.subgraph(retained).copy()
                exact = omega_value(cactual, rows(dgraph, u, v))
                slack = exact - lower_value
                minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                counts["negative" if slack < 0 else "nonnegative"] += 1
                if slack < 0:
                    failures.append((len(graph), code, u, v, mask, exact, lower_value, slack))
                stream.update(
                    f"{len(graph)}|{code}|{u}|{v}|{mask}|{exact}|{lower_value}|{slack};".encode()
                )
                cells += 1

    marker = MARKER if not failures else "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_QFREE_LOWER_ROOT"
    report = {
        "marker": marker,
        "checks": {
            "literal_G1_reconstruction": True,
            "exact_D_linearity": True,
            "all_eight_recorded_branches_match": True,
            "retention_masks_identical_within_geometry": True,
        },
        "branch_sha256": replayed,
        "direct_atlas_audit": {
            "orders": [2, 7],
            "cells": cells,
            "counts": dict(counts),
            "minimum_exact_minus_lower": minimum_slack,
            "failures": failures,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "scope_guard": (
            "This independently proves the algebraic lower reduction, not all-order "
            "nonnegativity of either q-free full-forest target."
        ),
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "checks": report["checks"],
        "direct_cells": cells,
        "minimum_exact_minus_lower": minimum_slack,
        "failure_count": len(failures),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
