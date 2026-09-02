#!/usr/bin/env python3
"""Independent replay of both coupled marked-parent q-free reductions."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_g1_marked_parent_qfree_lower_independent_root import (
    add_u_leaf,
    evaluator,
    negative_part,
    partition,
    reconstruct_g1,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_audit_root_20260901.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT"
EXPECTED_INPUT_SHA256 = "715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def signed_parts(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    expression = sp.expand(expression)
    if not variables:
        if expression.is_negative is True:
            return sp.Integer(0), expression
        return expression, sp.Integer(0)
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        term = sp.Integer(coefficient)
        for variable, power in zip(variables, powers):
            term *= variable**power
        if coefficient < 0:
            negative += term
        else:
            positive += term
    return sp.expand(positive), sp.expand(negative)


def align(expression, reference):
    names = {str(symbol): symbol for symbol in reference.free_symbols}
    return expression.xreplace({
        symbol: names[str(symbol)]
        for symbol in expression.free_symbols if str(symbol) in names
    })


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    g1 = reconstruct_g1()
    crows = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    targets = {
        0: sp.expand(substitute(g1, add_u_leaf(crows), drows) - substitute(g1, crows, drows)),
        1: sp.expand(
            substitute(g1, add_u_leaf(crows), add_u_leaf(drows))
            - substitute(g1, crows, drows)
        ),
    }
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
    structural = {sp.Symbol(f"{prefix}{family}0"): 1 for prefix in ("c", "d") for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })

    branch_expressions = {}
    branch_hashes = {}
    for eta, target in targets.items():
        expression = sp.expand(
            target.subs(structural).subs(partition("C", "c")).subs(partition("D", "d"))
        )
        dvars = tuple(sorted(
            (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
            key=str,
        ))
        if not all(sp.diff(expression, a, b) == 0 for a in dvars for b in dvars):
            raise RuntimeError(("D nonlinearity", eta))
        names = {str(symbol): symbol for symbol in expression.free_symbols}
        lower = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
        for dvar in dvars:
            lower += negative_part(sp.diff(expression, dvar)) * names["C" + str(dvar)[1:]]
        lower = sp.expand(lower)
        for geometry in ("adjacent", "nonadjacent"):
            for uvalue, vvalue in itertools.product((0, 1), repeat=2):
                label = f"{geometry}_t{eta}_u{uvalue}_v{vvalue}"
                rules = {eu: uvalue, ev: vvalue}
                if geometry == "adjacent":
                    rules.update({
                        symbol: 0 for symbol in lower.free_symbols if str(symbol).startswith("CZ")
                    })
                branch = sp.expand(lower.subs(rules))
                slope = sp.expand(sp.diff(branch, q))
                if sp.diff(slope, q) != 0:
                    raise RuntimeError(("q nonlinearity", label))
                _positive, negative = signed_parts(slope)
                retained = uvalue + vvalue
                qfree = sp.expand(branch.subs(q, retained) + (n - retained) * negative)
                recorded = align(
                    sp.sympify(source["branches"][label]["lower_expression"]), qfree
                )
                if sp.expand(qfree - recorded) != 0:
                    raise RuntimeError(("recorded mismatch", label))
                digest = hashlib.sha256(sp.srepr(qfree).encode()).hexdigest().upper()
                if digest != source["branches"][label]["class_sha256"]:
                    raise RuntimeError(("class hash mismatch", label, digest))
                branch_expressions[label] = qfree
                branch_hashes[label] = digest

    # Direct atlas check of each actual coupled increment against its branch
    # lower.  eta=1 uses the actual induced-minor leaf recurrence D+x(D-u).
    exact_values = {eta: evaluator(target) for eta, target in targets.items()}
    lower_values = {}
    for label, expression in branch_expressions.items():
        variables = tuple(sorted(expression.free_symbols, key=str))
        lower_values[label] = (variables, sp.lambdify(variables, expression, "math"))
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
            cvalues = {**categories(cactual), "n": len(graph)}
            for mask in range(1 << len(nodes)):
                retained_nodes = {
                    node for index, node in enumerate(nodes) if mask & (1 << index)
                }
                dgraph = graph.subgraph(retained_nodes).copy()
                dactual = rows(dgraph, u, v)
                uvalue, vvalue = int(u in retained_nodes), int(v in retained_nodes)
                for eta in (0, 1):
                    label = f"{geometry}_t{eta}_u{uvalue}_v{vvalue}"
                    variables, evaluate_lower = lower_values[label]
                    lower = int(evaluate_lower(*(cvalues[str(variable)] for variable in variables)))
                    exact = exact_values[eta](cactual, dactual)
                    slack = exact - lower
                    minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                    counts["negative" if slack < 0 else "nonnegative"] += 1
                    if slack < 0:
                        failures.append((len(graph), code, u, v, mask, eta, exact, lower, slack))
                    stream.update(
                        f"{len(graph)}|{code}|{u}|{v}|{mask}|{eta}|{exact}|{lower}|{slack};".encode()
                    )
                    cells += 1

    marker = MARKER if not failures else "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT"
    report = {
        "marker": marker,
        "checks": {
            "literal_G1_reconstruction": True,
            "both_targets_D_linear": True,
            "all_sixteen_recorded_branches_match": True,
            "all_class_hashes_match": True,
        },
        "branch_sha256": branch_hashes,
        "direct_atlas_audit": {
            "orders": [2, 7],
            "cells": cells,
            "counts": dict(counts),
            "minimum_exact_minus_lower": minimum_slack,
            "failures": failures,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "scope_guard": (
            "This independently proves the two coupled lower reductions, not "
            "all-order nonnegativity of any of the eight q-free classes."
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
