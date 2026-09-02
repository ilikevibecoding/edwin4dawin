#!/usr/bin/env python3
"""Test exact cross-mode lifts from collision to distinct isolated-q faces.

This is exploratory only.  It compares a distinct mark forest with q isolated
against the corresponding collision expression after adjoining q as one more
anonymous isolate.  A zero or coefficientwise-nonnegative difference would
transfer a frozen collision theorem to three distinct expression classes.
"""

from __future__ import annotations

import argparse
import hashlib

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    coefficient_profile,
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_g1_nonadjacent import (
    edge_label,
)


def expressions(mode, wanted, n, N, h, t, base):
    raw = build_mode(mode, n, t)
    result = {}
    for marks, edges in mark_forests(mode):
        label = edge_label(edges)
        if label in wanted:
            result[label] = exact_expression(
                mode, raw, marks, edges, n, N, h, t, base
            )
    assert set(result) == set(wanted)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", choices=("edgeless", "pu", "pv", "pu,pv"))
    args = parser.parse_args()
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    labels = (args.label,) if args.label else ("edgeless", "pu", "pv", "pu,pv")
    collision_labels = {
        "pu" if label == "pv" else label for label in labels
    }
    collision = expressions(
        "collision", collision_labels, n, N, h, t, base
    )
    distinct = expressions("distinct", labels, n, N, h, t, base)
    for label in labels:
        collision_label = "pu" if label == "pv" else label
        lifted = sp.expand(collision[collision_label].subs(h, h + 1))
        difference = sp.expand(distinct[label] - lifted)
        profile = coefficient_profile(difference, base[2:], (N, h, t))
        print(
            "CLASS", label,
            "ZERO", difference == 0,
            "TERMS", profile["terms"],
            "SIGNS", profile["signs"],
            "FIRST_BAD", profile["first_bad"],
            "SHA256", hashlib.sha256(sp.srepr(difference).encode()).hexdigest().upper(),
            flush=True,
        )
        print("FACTORED", sp.factor(difference), flush=True)
    print("EXPLORATORY_ONLY_NO_DISTINCT_COLLISION_ISOLATE_LIFT_THEOREM")


if __name__ == "__main__":
    main()
