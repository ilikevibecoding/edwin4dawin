#!/usr/bin/env python3
"""Fail-closed q=2 checkpoint for disconnected-M5 unique sum16.

For an active rooted pair P=T-u, H=T-N[u], put
q=sum_{v in N(u)} deg_P(v).  On q=2, after removing isolated selected
vertices there are exactly two component modes:

  distinct: P0=(A1+xG1)(A2+xG2), H=A1*A2;
  shared:   P0=A1*A2+xG1*G2,       H=A1*A2,

where A_i are trees and G_i=A_i-w_i.  If t is the number of isolated
selected vertices, P=(1+x)^t P0.  Twice unique sum16 has the exact Newton
expansion sum_{j=0}^6 R_j binom(t,j).

This replay exhausts every component/attachment choice with |H|<=12 and
proves R3,...,R6 for every |H|>=13 by literal edge-union bounds.  It makes
no claim about R0,R1,R2 for |H|>=13 and hence is not a full q=2 theorem.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import add, mul, poly_forest
from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
    shift,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import at, choose


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_q2_partial_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_PARTIAL_ISO_N5_DISCONNECTED_M5_SUM16_Q2_G1_NONADJACENT"
DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent.py":
        "B938A7416091632E8725B34A029FA3F9260163CDD57CD6334C71D91A11435F59",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def finite_certificate(x, h, rows):
    evaluator = sp.lambdify((*x, *h), rows, modules="math")
    minima = {mode: [None] * 7 for mode in ("distinct", "shared")}
    witnesses = {mode: [None] * 7 for mode in minima}
    pair_counts = {mode: 0 for mode in minima}
    order_rows = {}
    cache = {}
    for order in range(1, 12):
        items = []
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            a = poly_forest(tree)
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for w in tree:
                lower = tree.copy()
                lower.remove_node(w)
                items.append((a, poly_forest(lower), graph6, w))
        cache[order] = items

    for total in range(2, 13):
        local_minima = {mode: [None] * 7 for mode in minima}
        local_pairs = {mode: 0 for mode in minima}
        for e1 in range(1, total):
            e2 = total - e1
            for a1, g1, graph1, w1 in cache[e1]:
                for a2, g2, graph2, w2 in cache[e2]:
                    hpoly = mul(a1, a2)
                    leaf1 = add(a1, shift(g1))
                    leaf2 = add(a2, shift(g2))
                    bases = {
                        "distinct": mul(leaf1, leaf2),
                        "shared": add(hpoly, shift(mul(g1, g2))),
                    }
                    for mode, xpoly in bases.items():
                        arguments = (
                            *(at(xpoly, rank) for rank in range(8)),
                            *(at(hpoly, rank) for rank in range(7)),
                        )
                        values = [int(round(value)) for value in evaluator(*arguments)]
                        assert all(value >= 0 for value in values), (
                            mode, total, e1, graph1, w1, graph2, w2, values,
                        )
                        for index, value in enumerate(values):
                            if minima[mode][index] is None or value < minima[mode][index]:
                                minima[mode][index] = value
                                witnesses[mode][index] = {
                                    "H_order": total,
                                    "component_orders": [e1, e2],
                                    "component_graph6": [graph1, graph2],
                                    "attachment_vertices": [w1, w2],
                                }
                            local_minima[mode][index] = (
                                value if local_minima[mode][index] is None
                                else min(local_minima[mode][index], value)
                            )
                        pair_counts[mode] += 1
                        local_pairs[mode] += 1
        order_rows[str(total)] = {
            "H_order": total,
            "ordered_marked_component_pairs": local_pairs,
            "minimum_R0_through_R6": local_minima,
        }
    return {
        "H_orders": [2, 12],
        "ordered_marked_component_pairs": pair_counts,
        "newton_row_checks": {mode: 7 * count for mode, count in pair_counts.items()},
        "global_minimum_R0_through_R6": minima,
        "minimizing_witnesses": witnesses,
        "rows": order_rows,
        "coverage_note": (
            "Ordered pairs include every unordered pair and every attachment vertex; "
            "duplicates are harmless.  This is the complete finite q=2 branch."
        ),
    }


def large_order_easy_rows(x, h, rows):
    e, t = sp.symbols("e t", integer=True, nonnegative=True)
    variables = (*x[3:7], *h[3:6])
    expected = {
        "distinct": [
            (11 * e**3 + 180 * e**2 + 835 * e + 846) / 3,
            2 * (14 * e**2 + 145 * e + 245),
            4 * (30 * e + 89),
            sp.Integer(98),
        ],
        "shared": [
            (11 * e**3 + 114 * e**2 + 382 * e + 150) / 3,
            4 * (7 * e**2 + 53 * e + 58),
            6 * (20 * e + 43),
            sp.Integer(98),
        ],
    }
    report = {}
    for mode in ("distinct", "shared"):
        order_x = e + (2 if mode == "distinct" else 1)
        substitutions = {
            x[1]: order_x,
            x[2]: choose(order_x, 2) - e,
            h[1]: e,
            h[2]: choose(e, 2) - (e - 2),
        }
        lower = {}
        upper = {}
        for rank in range(3, 7):
            lower[x[rank]] = choose(order_x, rank) - e * choose(order_x - 2, rank - 2)
            upper[x[rank]] = choose(order_x, rank)
        for rank in range(3, 6):
            lower[h[rank]] = choose(e, rank) - (e - 2) * choose(e - 2, rank - 2)
            upper[h[rank]] = choose(e, rank)

        mode_rows = []
        for row_index, expected_bound in zip(range(3, 7), expected[mode]):
            expression = sp.expand(rows[row_index].subs(substitutions))
            polynomial = sp.Poly(expression, *variables)
            bound = 0
            choices = []
            for monomial, coefficient in polynomial.terms():
                shifted_coefficient = sp.Poly(sp.expand(coefficient.subs(e, t + 13)), t)
                if all(value >= 0 for value in shifted_coefficient.coeffs()):
                    endpoint = lower
                    choices.append("lower")
                elif all(value <= 0 for value in shifted_coefficient.coeffs()):
                    endpoint = upper
                    choices.append("upper")
                else:
                    raise AssertionError((mode, row_index, monomial, coefficient))
                term = coefficient
                for variable, power in zip(variables, monomial):
                    term *= endpoint[variable] ** power
                bound += term
            bound = sp.factor(bound)
            assert sp.expand(bound - expected_bound) == 0
            shifted = sp.Poly(sp.expand(bound.subs(e, t + 13)), t)
            assert all(value > 0 for value in shifted.coeffs())
            mode_rows.append({
                "newton_row": row_index,
                "lower_bound": str(bound),
                "monomial_endpoint_choices": {
                    "lower": choices.count("lower"),
                    "upper": choices.count("upper"),
                },
                "at_e_equals_13_plus_t_power_coefficients": [
                    str(value) for value in shifted.all_coeffs()
                ],
            })
        report[mode] = {
            "P0_order": str(order_x),
            "P0_edges": "e",
            "H_order": "e",
            "H_edges": "e-2",
            "rows": mode_rows,
        }
    return {
        "domain": "e=|H|>=13",
        "bounds": (
            "For an N-vertex forest with E edges, i_k>=C(N,k)-E*C(N-2,k-2) "
            "by the edge-union bound, and i_k<=C(N,k)."
        ),
        "modes": report,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    x, h, rows = generic_newton_rows()
    finite = finite_certificate(x, h, rows)
    assert finite["ordered_marked_component_pairs"] == {
        "distinct": 30449,
        "shared": 30449,
    }
    assert finite["global_minimum_R0_through_R6"] == {
        "distinct": [8, 128, 702, 1436, 1350, 596, 98],
        "shared": [2, 21, 160, 553, 810, 498, 98],
    }
    easy = large_order_easy_rows(x, h, rows)
    report = {
        "marker": MARKER,
        "theorem": (
            "For q=2 active rooted pairs, every Newton row R0,...,R6 of twice "
            "unique sum16 is nonnegative when |H|<=12, and R3,...,R6 are "
            "strictly positive for every |H|>=13."
        ),
        "exact_q2_geometry": {
            "distinct_selected_vertices": (
                "P=(1+x)^t(A1+xG1)(A2+xG2), H=A1A2, Gi=Ai-wi, t=s-2"
            ),
            "one_shared_selected_vertex": (
                "P=(1+x)^t(A1A2+xG1G2), H=A1A2, Gi=Ai-wi, t=s-1"
            ),
            "exhaustiveness": (
                "The selected-root degrees are positive integers summing q=2: "
                "either 1+1 on distinct P-components or 2 on one P-component."
            ),
        },
        "newton_expansion": {
            "identity": "2*sum16=sum_{j=0}^6 R_j*binom(t,j)",
            "R0_through_R6": [str(sp.factor(row)) for row in rows],
        },
        "finite_certificate": finite,
        "large_order_R3_through_R6": easy,
        "remaining_obligation": (
            "Prove R0,R1,R2 for |H|>=13 in both q=2 component modes."
        ),
        "scope": (
            "Exact partial q=2 sum16 theorem only.  It is not a proof of all q=2, "
            "q>=3, all disconnected M5, M5+3C5, g1, N5, or Erdos Problem 993."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "ordered_pairs_per_mode": 30449,
        "row_checks_total": 426286,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
