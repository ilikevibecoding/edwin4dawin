#!/usr/bin/env python3
"""Q-free full-forest lowers for both coupled marked-parent leaf states."""

from __future__ import annotations

from collections import Counter, defaultdict
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
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root import (
    negative_part,
    polynomial_summary,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root import signed_parts
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coarse_minor_lower(expression: sp.Expr):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    linear = all(sp.diff(expression, a, b) == 0 for a in dvars for b in dvars)
    if not linear:
        raise RuntimeError("marked-parent coupled target is nonlinear in D")
    lower = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    rows_audit = {}
    for dvar in dvars:
        derivative = sp.expand(sp.diff(expression, dvar))
        negative = negative_part(derivative)
        cap = names["C" + str(dvar)[1:]]
        lower += negative * cap
        rows_audit[str(dvar)] = {
            "cap": str(cap),
            "derivative": polynomial_summary(derivative),
            "negative_part": polynomial_summary(negative),
        }
    return sp.expand(lower), {"exact_D_linearity": linear, "rows": rows_audit}


def main() -> None:
    g1 = reconstruct(1)
    crows = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
    structural = {sp.Symbol(f"{prefix}{family}0"): 1 for prefix in ("c", "d") for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    cpart, _ = partition_substitution("C", "c", 7)
    dpart, _ = partition_substitution("D", "d", 7)

    targets = {
        0: sp.expand(substitute(g1, add_u_leaf(crows), drows) - substitute(g1, crows, drows)),
        1: sp.expand(
            substitute(g1, add_u_leaf(crows), add_u_leaf(drows))
            - substitute(g1, crows, drows)
        ),
    }
    lowers = {}
    target_audits = {}
    for eta, target in targets.items():
        expression = sp.expand(target.subs(structural).subs(cpart).subs(dpart))
        lowers[eta], audit = coarse_minor_lower(expression)
        target_audits[str(eta)] = {
            "target_summary": polynomial_summary(expression),
            "coarse_summary": polynomial_summary(lowers[eta]),
            **audit,
        }

    branches = {}
    unique = {}
    class_members = defaultdict(list)
    for eta in (0, 1):
        lower = lowers[eta]
        names = {str(symbol): symbol for symbol in lower.free_symbols}
        for geometry in ("adjacent", "nonadjacent"):
            for uvalue, vvalue in itertools.product((0, 1), repeat=2):
                label = f"{geometry}_t{eta}_u{uvalue}_v{vvalue}"
                rules = {eu: uvalue, ev: vvalue}
                if geometry == "adjacent":
                    rules.update({
                        names[f"CZ{rank}"]: 0
                        for rank in range(2, 8) if f"CZ{rank}" in names
                    })
                branch = sp.expand(lower.subs(rules))
                slope = sp.expand(sp.diff(branch, q))
                if sp.diff(slope, q) != 0:
                    raise RuntimeError(("q nonlinearity", label))
                positive, negative = signed_parts(slope)
                retained_marks = uvalue + vvalue
                qfree = sp.expand(
                    branch.subs(q, retained_marks)
                    + (n - retained_marks) * negative
                )
                digest = hashlib.sha256(sp.srepr(qfree).encode()).hexdigest().upper()
                unique.setdefault(digest, qfree)
                class_members[digest].append(label)
                branches[label] = {
                    "geometry": geometry,
                    "eta": eta,
                    "retained_mark_mask": [uvalue, vvalue],
                    "retained_mark_count": retained_marks,
                    "q_slope": str(sp.factor(slope)),
                    "q_slope_positive_part": str(sp.factor(positive)),
                    "q_slope_negative_part": str(sp.factor(negative)),
                    "class_sha256": digest,
                    "lower_expression": str(qfree),
                    "lower_summary": polynomial_summary(qfree),
                }

    evaluators = {}
    for digest, expression in unique.items():
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators[digest] = (variables, sp.lambdify(variables, expression, "math"))
    class_geometry = {
        digest: next(label.split("_", 1)[0] for label in members)
        for digest, members in class_members.items()
    }
    counts = {digest: Counter() for digest in unique}
    minima = {digest: None for digest in unique}
    stream = hashlib.sha256()
    cells = 0
    catalog = tree_catalog(10)
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(tuple(graph), 2):
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                values = {**categories(rows(graph, u, v)), "n": order}
                for digest in unique:
                    if class_geometry[digest] != geometry:
                        continue
                    variables, evaluate = evaluators[digest]
                    value = int(evaluate(*(values[str(variable)] for variable in variables)))
                    sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
                    counts[digest][sign] += 1
                    record = (value, order, graph6, u, v, forest_index)
                    minima[digest] = record if minima[digest] is None or record < minima[digest] else minima[digest]
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{digest}|{value};".encode()
                    )
                    cells += 1

    negative_cells = sum(counter["negative"] for counter in counts.values())
    classes = {
        digest: {
            "geometry": class_geometry[digest],
            "members": members,
            "member_count": len(members),
            "lower_expression": str(unique[digest]),
            "lower_summary": polynomial_summary(unique[digest]),
            "finite_counts": dict(counts[digest]),
            "finite_minimum": list(minima[digest]),
        }
        for digest, members in class_members.items()
    }
    report = {
        "marker": MARKER,
        "targets": {
            "eta0": "G1_6(A+x(A-u),B)-G1_6(A,B)",
            "eta1": "G1_6(A+x(A-u),B+x(B-u))-G1_6(A,B)",
        },
        "target_audits": target_audits,
        "branch_count": len(branches),
        "expression_class_count": len(classes),
        "branches": branches,
        "classes": classes,
        "finite_collar": {
            "orders": [8, 10],
            "cells": cells,
            "negative_cells": negative_cells,
            "ordered_stream_sha256": stream.hexdigest().upper(),
            "scope_guard": "Finite exact implementation evidence only.",
        },
        "status": (
            "both marked-parent states reduced to q-free full-forest classes; universal signs remain open"
            if not negative_cells else
            "the coupled coarse lower has actual negative forest cells and is insufficient"
        ),
        "scope_guard": (
            "The eta=1 reduction keeps the complete response coupled inside the direct leaf increment. "
            "Negative lower cells would not refute that increment; finite positivity would not prove its tail."
        ),
        "dependencies_sha256": {
            "marked_parent_omega_reduction": sha256(
                HERE / "iso_n6_bundle_g1_marked_parent_qfree_lower_exact_root_20260901.json"
            ),
            "rank6_reconstruction": sha256(
                HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "branch_count": len(branches),
        "expression_class_count": len(classes),
        "classes": {
            digest: {
                "geometry": row["geometry"],
                "member_count": row["member_count"],
                "summary": row["lower_summary"],
                "finite_minimum": row["finite_minimum"],
                "finite_counts": row["finite_counts"],
            }
            for digest, row in classes.items()
        },
        "finite_negative_cells": negative_cells,
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
