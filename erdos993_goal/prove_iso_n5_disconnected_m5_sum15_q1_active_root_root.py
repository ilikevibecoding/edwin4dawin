#!/usr/bin/env python3
"""Exact q=1 active-root theorem for disconnected-M5 unique sum15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_sum15_q1_ratio_root import (
    hard_lowers,
    ratio_probe,
    symbolic_rows,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    at,
    choose,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q1_active_root_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q1_ACTIVE_ROOT_ROOT"

DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum15_q1_ratio_root.py":
        "BBD02C06515C8BAE050C2456E06ED172F0B930C28652B9555D2DE59AA4EF052A",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

EXPECTED_RATIO = {
    "high": [(1032, "20"), (626, "20"), (312, "240")],
    "low": [(3096, "20"), (1252, "20"), (624, "240")],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def finite_certificate(a, g, rows):
    evaluator = sp.lambdify((*a, *g), rows, modules="math")
    tree_total = marked_total = checks = 0
    global_minima = [None] * 6
    order_rows = {}
    for e in range(1, 13):
        candidates = [nx.empty_graph(1)] if e == 1 else nx.nonisomorphic_trees(e)
        trees = marked = 0
        local_minima = [None] * 6
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            trees += 1
            a_values = poly_forest(tree)
            for w in tree:
                lower = tree.copy()
                lower.remove_node(w)
                g_values = poly_forest(lower)
                arguments = (
                    *(at(a_values, rank) for rank in range(7)),
                    *(at(g_values, rank) for rank in range(6)),
                )
                values = [int(round(value)) for value in evaluator(*arguments)]
                assert all(value >= 0 for value in values), (e, w, values)
                for index, value in enumerate(values):
                    local_minima[index] = (
                        value if local_minima[index] is None
                        else min(local_minima[index], value)
                    )
                    global_minima[index] = (
                        value if global_minima[index] is None
                        else min(global_minima[index], value)
                    )
                marked += 1
        tree_total += trees
        marked_total += marked
        checks += 6 * marked
        order_rows[str(e)] = {
            "H_order": e,
            "unlabeled_trees": trees,
            "marked_vertices": marked,
            "minimum_R0_through_R5": local_minima,
        }
    return {
        "H_orders": [1, 12],
        "unlabeled_trees": tree_total,
        "marked_vertices": marked_total,
        "newton_row_checks": checks,
        "global_minimum_R0_through_R5": global_minima,
        "rows": order_rows,
    }


def easy_rows(a, g, rows):
    e, t = sp.symbols("e t", nonnegative=True)
    expression3 = sp.expand(rows[3].subs({
        a[1]: e,
        a[2]: choose(e - 1, 2),
        a[3]: choose(e, 3),
        g[2]: choose(e - 1, 2),
    }))
    expression4 = sp.expand(rows[4].subs({
        a[1]: e,
        a[2]: choose(e - 1, 2),
    }))
    expression5 = sp.expand(rows[5])
    expected = [
        (13 * e**2 + 131 * e + 90) / 2,
        35 * e + 72,
        sp.Integer(30),
    ]
    actual = [expression3, expression4, expression5]
    assert all(sp.expand(left - right) == 0 for left, right in zip(actual, expected))
    shifted = [sp.Poly(sp.expand(value.subs(e, t + 13)), t) for value in expected]
    assert all(coefficient > 0 for row in shifted for coefficient in row.coeffs())
    return {
        "rules": (
            "R3 uses a3<=binom(e,3), g2<=binom(e-1,2); R4 uses the "
            "tree identity a2=binom(e-1,2); R5=30"
        ),
        "lower_bounds_R3_R4_R5": [str(value) for value in expected],
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    a, g, twice, rows = symbolic_rows()
    finite = finite_certificate(a, g, rows)
    assert finite["marked_vertices"] == 11006
    assert finite["newton_row_checks"] == 66036
    easy = easy_rows(a, g, rows)
    symbols, lowers, b_coefficients = hard_lowers(a, g, rows)
    ratio = ratio_probe(a, symbols, lowers)
    for mode, expected_rows in EXPECTED_RATIO.items():
        actual = [
            (row["homogeneous_terms"], row["minimum"])
            for row in ratio[mode]
        ]
        assert actual == expected_rows

    report = {
        "marker": MARKER,
        "theorem": (
            "Every active rooted pair P=T-u, H=T-N[u] with "
            "q=sum_{v in N(u)}deg_P(v)=1 has nonnegative unique Psi interval sum15."
        ),
        "q1_geometry": (
            "P consists of t=s-1 isolated selected vertices and one tree X "
            "whose selected vertex is a leaf; I(P)=(1+x)^t I(X), "
            "I(X)=I(H)+xI(H-w)."
        ),
        "newton_expansion": {
            "identity": "2*sum15=sum_{j=0}^5 R_j*binom(t,j)",
            "twice_sum15": str(sp.factor(twice)),
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
        },
        "finite_certificate": finite,
        "large_order_domain": "e=|H|>=13",
        "easy_R3_through_R5": easy,
        "hard_R0_through_R2": {
            "b2_b3_b4_coefficients": b_coefficients,
            "all_nonnegative_so_discarded": True,
            "lower_bounds": [str(value) for value in lowers],
            "ratio_certificates": ratio,
        },
        "coverage": (
            "The finite branch proves every R_j for e<=12. For e>=13, "
            "R3-R5 have elementary positive lower bounds and R0-R2 have exact "
            "high/low homogeneous-simplex certificates. Since binom(t,j)>=0, "
            "the Newton expansion proves sum15>=0."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "scope": (
            "Exact q=1 active-root theorem for unique sum15 only. No claim for "
            "q>=2, transported common factors, all disconnected M5, g1, or "
            "Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_marked_vertices": finite["marked_vertices"],
        "finite_newton_checks": finite["newton_row_checks"],
        "hard_ratio_terms": sum(
            row["homogeneous_terms"] for mode in ratio.values() for row in mode
        ),
        "negative_coefficients": 0,
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
