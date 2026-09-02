#!/usr/bin/env python3
"""Eliminate J,L,K from the coupled ordinary-parent square by valid caps."""

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
from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root import (
    negative_part,
    polynomial_summary,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root import signed_parts
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hfree_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HFREE_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def category_variables(expression: sp.Expr, prefix: str):
    return tuple(sorted(
        (
            symbol for symbol in expression.free_symbols
            if str(symbol).startswith(prefix)
            and len(str(symbol)) >= 3
            and str(symbol)[1] in "WABZ"
            and str(symbol)[2:].isdigit()
        ),
        key=str,
    ))


def eliminate_categories(
    expression: sp.Expr,
    prefix: str,
    cap_prefix: str,
) -> tuple[sp.Expr, dict[str, object]]:
    variables = category_variables(expression, prefix)
    linear = all(
        sp.diff(expression, left, right) == 0
        for left in variables for right in variables
    )
    if not linear:
        raise RuntimeError(f"{prefix} category block is nonlinear")
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    lower = sp.expand(expression.subs({symbol: 0 for symbol in variables}))
    rows = {}
    for variable in variables:
        derivative = sp.expand(sp.diff(expression, variable))
        negative = negative_part(derivative)
        cap_name = cap_prefix + str(variable)[1:]
        cap = names.get(cap_name, sp.Symbol(cap_name, integer=True, nonnegative=True))
        lower += negative * cap
        rows[str(variable)] = {
            "cap": cap_name,
            "derivative": polynomial_summary(derivative),
            "negative_part": polynomial_summary(negative),
        }
    return sp.expand(lower), {
        "variable_count": len(variables),
        "exact_linearity": linear,
        "rows": rows,
    }


def eliminate_order(
    expression: sp.Expr,
    variable: sp.Symbol,
    lower_endpoint: int,
    upper: sp.Expr,
) -> tuple[sp.Expr, dict[str, object]]:
    slope = sp.expand(sp.diff(expression, variable))
    if sp.diff(slope, variable) != 0:
        raise RuntimeError(f"{variable} is nonlinear")
    positive, negative = signed_parts(slope)
    lower = sp.expand(
        expression.subs(variable, lower_endpoint)
        + (upper - lower_endpoint) * negative
    )
    return lower, {
        "interval": f"{lower_endpoint}<={variable}<={upper}",
        "slope": str(sp.factor(slope)),
        "positive_part": str(sp.factor(positive)),
        "negative_part": str(sp.factor(negative)),
    }


def main() -> None:
    pieces = build_expressions()
    n, k, q, ell = sp.symbols("n k q ell", integer=True, nonnegative=True)
    ku, kv, ju, jv, lu, lv = sp.symbols(
        "kappa_u kappa_v j_u j_v l_u l_v", integer=True, nonnegative=True
    )
    structural = {sp.Symbol(f"{prefix}{family}0"): 1 for prefix in "HKJL" for family in "EUVW"}
    structural.update({
        sp.Symbol("HE1"): n, sp.Symbol("HU1"): n - 1,
        sp.Symbol("HV1"): n - 1, sp.Symbol("HW1"): n - 2,
        sp.Symbol("KE1"): k, sp.Symbol("KU1"): k - ku,
        sp.Symbol("KV1"): k - kv, sp.Symbol("KW1"): k - ku - kv,
        sp.Symbol("JE1"): q, sp.Symbol("JU1"): q - ju,
        sp.Symbol("JV1"): q - jv, sp.Symbol("JW1"): q - ju - jv,
        sp.Symbol("LE1"): ell, sp.Symbol("LU1"): ell - lu,
        sp.Symbol("LV1"): ell - lv, sp.Symbol("LW1"): ell - lu - lv,
    })
    partition = {}
    for prefix in "HKJL":
        rules, _ = partition_substitution(prefix, prefix, 7)
        partition.update(rules)

    raw_targets = {}
    for epsilon in (0, 1):
        for eta in (0, 1):
            raw_targets[(epsilon, eta)] = sp.expand(
                pieces["g2"] + pieces["F"]
                + epsilon * pieces["QHL"]
                + eta * (pieces["QHJ"] + pieces["QKJ"] + pieces["T"])
            ).subs(structural).subs(partition)

    branches = {}
    unique = {}
    class_members = defaultdict(list)
    for geometry in ("adjacent", "nonadjacent"):
        for epsilon in (0, 1):
            for eta in (0, 1):
                for ku_value, kv_value, ju_value, jv_value in itertools.product((0, 1), repeat=4):
                    lu_value = ku_value * ju_value
                    lv_value = kv_value * jv_value
                    label = (
                        f"{geometry}_e{epsilon}_t{eta}_"
                        f"k{ku_value}{kv_value}_j{ju_value}{jv_value}"
                    )
                    rules = {
                        ku: ku_value, kv: kv_value,
                        ju: ju_value, jv: jv_value,
                        lu: lu_value, lv: lv_value,
                    }
                    if geometry == "adjacent":
                        rules.update({
                            symbol: 0
                            for symbol in raw_targets[(epsilon, eta)].free_symbols
                            if str(symbol).startswith("HZ")
                        })
                    expression = sp.expand(raw_targets[(epsilon, eta)].subs(rules))

                    expression, j_audit = eliminate_categories(expression, "J", "H")
                    expression, l_audit = eliminate_categories(expression, "L", "K")
                    expression, q_audit = eliminate_order(
                        expression, q, ju_value + jv_value, n
                    )
                    expression, ell_audit = eliminate_order(
                        expression, ell, lu_value + lv_value, k
                    )
                    expression, k_audit = eliminate_categories(expression, "K", "H")
                    expression, k_order_audit = eliminate_order(
                        expression, k, ku_value + kv_value, n
                    )
                    expression = sp.expand(expression)
                    if any(
                        str(symbol)[0] in "KJL" and len(str(symbol)) > 1
                        for symbol in expression.free_symbols
                    ) or expression.free_symbols & {k, q, ell}:
                        raise RuntimeError(("elimination incomplete", label, expression.free_symbols))
                    digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
                    class_members[digest].append(label)
                    unique.setdefault(digest, expression)
                    branches[label] = {
                        "geometry": geometry,
                        "epsilon": epsilon,
                        "eta": eta,
                        "K_mark_mask": [ku_value, kv_value],
                        "J_mark_mask": [ju_value, jv_value],
                        "L_mark_mask": [lu_value, lv_value],
                        "class_sha256": digest,
                        "lower_summary": polynomial_summary(expression),
                        "audits": {
                            "J_categories": j_audit,
                            "L_categories": l_audit,
                            "q_order": q_audit,
                            "ell_order": ell_audit,
                            "K_categories": k_audit,
                            "k_order": k_order_audit,
                        },
                    }

    # Finite exact implementation collar on every distinct H-only class in
    # its correct mark geometry.
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
    catalog = tree_catalog(10)
    cells = 0
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                cvalues = categories(rows(graph, u, v))
                values = {
                    **{"H" + name[1:]: value for name, value in cvalues.items()},
                    "n": order,
                }
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
        "target_family": (
            "g2_6(H,J)+F(H,K)+epsilon Q(H,L)+eta Phi_J((1+x)H+xK)"
        ),
        "relations": (
            "K is induced in H, J is induced in H, L=J intersect K; category caps "
            "J<=H, L<=K, K<=H and order intervals are applied only to exact affine blocks."
        ),
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
            "exact H-only sufficient lower classes derived; universal positivity remains open"
            if not negative_cells else
            "the H-only coarse reduction has actual negative forest cells and is insufficient"
        ),
        "scope_guard": (
            "Every reduction is a valid lower bound under the displayed induced-minor relations. "
            "Negative lower cells do not refute the original coupled square; finite positive cells "
            "would not prove its unbounded tail."
        ),
        "dependencies_sha256": {
            "ordinary_split_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_g1_nonadjacent.py"
            ),
            "retained_coarse_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root.py"
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
        "class_summaries": {
            digest: {
                "geometry": row["geometry"],
                "member_count": row["member_count"],
                "lower_summary": row["lower_summary"],
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
