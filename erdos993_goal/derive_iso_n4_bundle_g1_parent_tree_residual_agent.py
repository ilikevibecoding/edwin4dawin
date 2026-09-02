#!/usr/bin/env python3
"""Specialize the exact deepest-ordinary g1 residual to a parent-rooted tree.

This is an exact algebraic reduction only.  Starting from the parent-rooted
forest residual after the separately proved high-motif payment, impose the
connected-tree identity e=n-1.  A second form uses

    m2=C(n-1,2)-W

for the number of two-edge matchings.  Neither form is declared positive.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_tree_residual_exact_agent_20260829.json"


def choose2(value):
    return sp.expand(value * (value - 1) / sp.Integer(2))


def term_count(expression):
    return len(sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str)).terms())


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == (
        "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT"
    )
    residual = sp.sympify(dependency["parent_rooted_form"])
    symbols = {str(symbol): symbol for symbol in residual.free_symbols}
    n = symbols["n"]
    edges = symbols["edge_count"]
    wedges = symbols["C_wedges_E"]

    tree_form = sp.factor(sp.expand(residual.subs(edges, n - 1)))
    matching2 = sp.symbols("tree_two_edge_matchings", integer=True, nonnegative=True)
    matching_form = sp.factor(
        sp.expand(tree_form.subs(wedges, choose2(n - 1) - matching2))
    )
    matching_coefficient = sp.factor(sp.diff(matching_form, matching2))
    assert sp.diff(matching_form, matching2, 2) == 0

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_TREE_RESIDUAL_REDUCTION_AGENT",
        "tree_identity": "edge_count=n-1",
        "tree_form": str(tree_form),
        "tree_form_term_count": term_count(tree_form),
        "matching_identity": "C_wedges_E=C(n-1,2)-tree_two_edge_matchings",
        "matching_form": str(matching_form),
        "matching_form_term_count": term_count(matching_form),
        "matching_coefficient": str(matching_coefficient),
        "scope": (
            "Exact specialization to connected G only, after the independently "
            "proved high-motif payment. This is not a sign theorem and does not "
            "cover a disconnected support-deleted forest."
        ),
        "dependency": {
            "report": DEPENDENCY.name,
            "report_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "tree_form_term_count": report["tree_form_term_count"],
        "matching_form_term_count": report["matching_form_term_count"],
        "matching_coefficient": report["matching_coefficient"],
        "dependency": report["dependency"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
