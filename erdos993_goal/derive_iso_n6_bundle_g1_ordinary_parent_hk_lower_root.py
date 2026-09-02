#!/usr/bin/env python3
"""Reduce the ordinary-parent square while preserving H--K coupling.

J is bounded inside H and L inside K by exact affine sign splitting, and their
orders are eliminated on their valid intervals.  Unlike the rejected H-only
relaxation, K and its order remain explicit.
"""

from __future__ import annotations

from collections import defaultdict
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
)
from derive_iso_n6_bundle_g1_ordinary_parent_hfree_lower_root import (
    eliminate_categories,
    eliminate_order,
)
from derive_iso_n6_bundle_g1_retained_isolate_coarse_lower_root import polynomial_summary
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_LOWER_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    pieces = build_expressions()
    n, k, q, ell = sp.symbols("n k q ell", integer=True, nonnegative=True)
    ku, kv, ju, jv, lu, lv = sp.symbols(
        "kappa_u kappa_v j_u j_v l_u l_v", integer=True, nonnegative=True
    )
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in "HKJL" for family in "EUVW"
    }
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
    unique: dict[str, sp.Expr] = {}
    class_members: dict[str, list[str]] = defaultdict(list)
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
                            if str(symbol).startswith(("HZ", "KZ"))
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
                    expression = sp.expand(expression)
                    leftovers = {
                        symbol for symbol in expression.free_symbols
                        if str(symbol)[0] in "JL" and len(str(symbol)) > 1
                    } | (expression.free_symbols & {q, ell})
                    if leftovers:
                        raise RuntimeError(("elimination incomplete", label, leftovers))
                    digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
                    unique.setdefault(digest, expression)
                    class_members[digest].append(label)
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
                        },
                    }

    classes = {
        digest: {
            "geometry": members[0].split("_", 1)[0],
            "members": members,
            "member_count": len(members),
            "lower_expression": str(unique[digest]),
            "lower_summary": polynomial_summary(unique[digest]),
        }
        for digest, members in class_members.items()
    }
    report = {
        "marker": MARKER,
        "target_family": "g2_6(H,J)+F(H,K)+epsilon Q(H,L)+eta Phi_J((1+x)H+xK)",
        "relations": (
            "K is induced in H, J is induced in H, L=J intersect K.  "
            "Only J<=H, L<=K, q<=n, and ell<=k are used; K is retained."
        ),
        "branch_count": len(branches),
        "expression_class_count": len(classes),
        "branches": branches,
        "classes": classes,
        "status": "exact H--K sufficient lowers derived; universal signs remain open",
        "scope_guard": (
            "The displayed expressions are valid lower bounds under the stated "
            "induced-minor relations.  Their all-order nonnegativity is not asserted."
        ),
        "dependencies_sha256": {
            "ordinary_split_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_g1_nonadjacent.py"
            ),
            "hfree_relaxation_source": sha256(
                HERE / "derive_iso_n6_bundle_g1_ordinary_parent_hfree_lower_root.py"
            ),
        },
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "branch_count": len(branches),
        "expression_class_count": len(classes),
        "minimum_scalar_coefficient": min(
            int(row["lower_summary"]["minimum_scalar_coefficient"])
            for row in classes.values()
        ),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
