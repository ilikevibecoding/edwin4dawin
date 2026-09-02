#!/usr/bin/env python3
"""Exact minor-free lower reduction for the rank-six marked-parent Omega pair."""

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
from derive_iso_n6_bundle_g1_mark_parent_omega_targets_agent import add_u_leaf
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    substitute,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root import (
    negative_part,
    polynomial_summary,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root import signed_parts
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_qfree_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_QFREE_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    g1 = reconstruct(1)
    cgeneric = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    dgeneric = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    target = sp.expand(
        substitute(g1, add_u_leaf(cgeneric), dgeneric)
        - substitute(g1, cgeneric, dgeneric)
    )

    n, q, eu, ev = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in ("c", "d") for family in "EUVW"
    }
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    cpart, _ = partition_substitution("C", "c", 7)
    dpart, _ = partition_substitution("D", "d", 7)
    expression = sp.expand(target.subs(structural).subs(cpart).subs(dpart))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    d_linear = all(
        sp.diff(expression, left, right) == 0 for left in dvars for right in dvars
    )
    if not d_linear:
        raise RuntimeError("Omega unexpectedly nonlinear in induced-minor categories")

    coarse = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    derivatives = {}
    for dvar in dvars:
        derivative = sp.expand(sp.diff(expression, dvar))
        negative = negative_part(derivative)
        cap = names["C" + str(dvar)[1:]]
        coarse += negative * cap
        derivatives[str(dvar)] = {
            "derivative": polynomial_summary(derivative),
            "negative_part": polynomial_summary(negative),
            "cap": str(cap),
        }
    coarse = sp.expand(coarse)

    branches = {}
    branch_expressions = {}
    for geometry in ("adjacent", "nonadjacent"):
        for uvalue in (0, 1):
            for vvalue in (0, 1):
                label = f"{geometry}_u{uvalue}_v{vvalue}"
                rules = {eu: uvalue, ev: vvalue}
                if geometry == "adjacent":
                    rules.update({
                        names[f"CZ{rank}"]: 0
                        for rank in range(2, 8) if f"CZ{rank}" in names
                    })
                branch = sp.expand(coarse.subs(rules))
                slope = sp.expand(sp.diff(branch, q))
                if sp.diff(slope, q) != 0:
                    raise RuntimeError(f"q nonlinearity in {label}")
                positive, negative = signed_parts(slope)
                retained_marks = uvalue + vvalue
                lower = sp.expand(
                    branch.subs(q, retained_marks)
                    + (n - retained_marks) * negative
                )
                branch_expressions[label] = lower
                branches[label] = {
                    "retained_mark_count": retained_marks,
                    "q_slope_expression": str(sp.factor(slope)),
                    "q_slope_positive_part": str(sp.factor(positive)),
                    "q_slope_negative_part": str(sp.factor(negative)),
                    "lower_expression": str(lower),
                    "lower_summary": polynomial_summary(lower),
                }

    domination = {}
    for geometry in ("adjacent", "nonadjacent"):
        base_label = f"{geometry}_u0_v0"
        base_expression = branch_expressions[base_label]
        for uvalue, vvalue in ((0, 1), (1, 0), (1, 1)):
            label = f"{geometry}_u{uvalue}_v{vvalue}"
            difference = sp.expand(branch_expressions[label] - base_expression)
            coefficients = sp.Poly(
                difference, *tuple(sorted(difference.free_symbols, key=str))
            ).coeffs() if difference else []
            domination[label] = {
                "difference_summary": polynomial_summary(difference),
                "coefficientwise_nonnegative": all(value >= 0 for value in coefficients),
            }

    # Exact implementation collar for every branch.  This is evidence for the
    # unbounded lower targets, not a replacement for their all-order proof.
    evaluators = {}
    for label, lower in branch_expressions.items():
        variables = tuple(sorted(lower.free_symbols, key=str))
        evaluators[label] = (variables, sp.lambdify(variables, lower, "math"))
    counts = {label: Counter() for label in branches}
    minima = {label: None for label in branches}
    stream = hashlib.sha256()
    catalog = tree_catalog(10)
    cells = 0
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(tuple(graph), 2):
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                values = {**categories(rows(graph, u, v)), "n": order}
                for uvalue in (0, 1):
                    for vvalue in (0, 1):
                        label = f"{geometry}_u{uvalue}_v{vvalue}"
                        variables, evaluate = evaluators[label]
                        value = int(evaluate(*(values[str(variable)] for variable in variables)))
                        sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
                        counts[label][sign] += 1
                        record = (value, order, graph6, u, v, forest_index)
                        minima[label] = record if minima[label] is None or record < minima[label] else minima[label]
                        stream.update(
                            f"{order}|{forest_index}|{graph6}|{u}|{v}|{label}|{value};".encode()
                        )
                        cells += 1

    negative_cells = sum(counter["negative"] for counter in counts.values())
    report = {
        "marker": MARKER,
        "target": "Omega_u(A,B)=G1_6(A+x(A-u),B)-G1_6(A,B)",
        "exact_D_linearity": d_linear,
        "containment_lower_rule": (
            "For each induced-minor category D_F,r with 0<=D_F,r<=C_F,r, "
            "retain only the negative-coefficient part of its exact derivative and cap it by C_F,r."
        ),
        "q_elimination_rule": (
            "On each retained-mark branch q=e+t, 0<=t<=n-e; pay the negative "
            "coefficient part of the affine q-slope at t=n-e."
        ),
        "expression_summary": polynomial_summary(expression),
        "coarse_lower_summary": polynomial_summary(coarse),
        "branches": branches,
        "zero_retention_domination": domination,
        "derivative_rows": derivatives,
        "finite_collar": {
            "orders": [8, 10],
            "cells": cells,
            "negative_cells": negative_cells,
            "counts": {label: dict(counter) for label, counter in counts.items()},
            "minima": {label: list(value) for label, value in minima.items()},
            "ordered_stream_sha256": stream.hexdigest().upper(),
            "scope_guard": "Finite exact evidence only; all-order positivity is not inferred.",
        },
        "status": (
            "exact q-free lower targets derived; universal positivity remains open"
            if not negative_cells else
            "the coarse q-free reduction has an actual negative forest cell and is insufficient"
        ),
        "scope_guard": (
            "The reductions are valid sufficient lower bounds. A negative lower is not a "
            "counterexample to Omega; a nonnegative finite collar is not an all-order proof."
        ),
        "dependencies_sha256": {
            "marked_parent_target_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_mark_parent_omega_targets_agent.py"
            ),
            "qfree_retained_isolate_reduction": sha256(
                HERE / "derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "D_linear": d_linear,
        "branch_summaries": {label: row["lower_summary"] for label, row in branches.items()},
        "domination": domination,
        "finite_collar_negative_cells": negative_cells,
        "finite_collar_minima": report["finite_collar"]["minima"],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
