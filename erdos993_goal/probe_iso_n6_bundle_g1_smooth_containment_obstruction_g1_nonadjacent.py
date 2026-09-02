#!/usr/bin/env python3
"""Find a simple exact separator for the smooth rank-six g1 D relaxation."""

from __future__ import annotations

import itertools
import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1
from explore_iso_n6_bundle_g1_universal_cone_g1_nonadjacent import coarse_containment_lower
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


def main():
    _, partitioned, _, _ = doubly_partitioned_g1()
    lower, _, _ = coarse_containment_lower(partitioned)
    dvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("D")), key=str))
    cvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("C")), key=str))
    zero = sp.expand(partitioned.subs({x: 0 for x in dvars}))
    base_eval = sp.lambdify(cvars, zero, "math")
    coarse_eval = sp.lambdify(cvars, lower, "math")
    derivatives = [sp.lambdify(cvars, sp.diff(partitioned, x), "math") for x in dvars]
    first = None
    for family in ("path", "star"):
        for order in range(2, 101):
            graph = nx.path_graph(order) if family == "path" else nx.star_graph(order - 1)
            if family == "path":
                points = sorted(set((0, 1, 2, order//3, order//2, order-3, order-2, order-1)))
                mark_pairs = itertools.combinations((x for x in points if 0 <= x < order), 2)
            else:
                mark_pairs = ((0, 1), (1, 2)) if order >= 3 else ((0, 1),)
            for u, v in mark_pairs:
                cat = categories(rows(graph, u, v))
                values = tuple(cat[str(x)] for x in cvars)
                coarse = int(coarse_eval(*values))
                if coarse >= 0:
                    continue
                box = int(base_eval(*values))
                selections = {}
                for dvar, derivative in zip(dvars, derivatives):
                    coefficient = int(derivative(*values))
                    cap = cat["C" + str(dvar)[1:]]
                    selections[str(dvar)] = cap if coefficient < 0 else 0
                    box += coefficient * selections[str(dvar)]
                first = {
                    "family": family,
                    "order": order,
                    "marks": [u, v],
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "smooth_lower": coarse,
                    "exact_independent_containment_box": box,
                    "box_selection": selections,
                }
                break
            if first:
                break
        if first:
            break
    assert first is not None and first["smooth_lower"] < 0
    assert first["exact_independent_containment_box"] >= 0
    marker = "OBSTRUCTION_EXACT_ISO_N6_BUNDLE_G1_SMOOTH_D_RELAXATION_G1_NONADJACENT"
    report = {
        "marker": marker,
        "status": "exact method-only separator; not a graph counterexample",
        "scope": "monomialwise negative-part D-category containment relaxation for universal rank-six bundle g1",
        "witness": first,
        "assertions": {
            "witness_is_forest": True,
            "smooth_lower_is_negative": True,
            "exact_independent_containment_box_is_nonnegative": True,
            "no_claim_about_g1_failure": True,
        },
        "partitioned_expression_sha256": hashlib.sha256(str(sp.factor(partitioned)).encode()).hexdigest().upper(),
        "smooth_lower_expression_sha256": hashlib.sha256(str(sp.factor(lower)).encode()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = Path("iso_n6_bundle_g1_smooth_containment_obstruction_exact_g1_nonadjacent_20260831.json")
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8")
    print(json.dumps(first, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
