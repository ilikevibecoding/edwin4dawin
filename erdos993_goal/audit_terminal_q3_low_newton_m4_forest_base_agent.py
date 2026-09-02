#!/usr/bin/env python3
"""Exact all-forest-base lift of terminal-payment Newton degree m=4."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_terminal_q3_low_newton_m5_forest_base_agent import (
    coefficient,
    edge_residual_counts,
    forward_difference,
    independence_counts,
)
from prove_terminal_q3_low_newton_m4_agent import kernel


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m4_forest_base_audit_20260829.json"
PINS = {
    "audit_terminal_q3_low_newton_m4_large_order_agent.py": (
        "050CEC978233F374726830C14A2FF3C1B5017311EAA325369A4318A73F0AC9BA"
    ),
    "terminal_q3_low_newton_m4_all_order_independent_audit_20260829.json": (
        "89A59DCD3B4377C62C7D2AE0FCCECC8C4D5EF0CE64ED72C6BDB25912BEC6BF59"
    ),
    "prove_terminal_q3_low_newton_m6_conditional_independent_agent.py": (
        "A1225191B4224AB0ABDA3E94E6262C13F46E591BDCC9254609EC589AC9A3E3ED"
    ),
    "terminal_q3_low_newton_m6_exact_independent_20260829.json": (
        "0F0AB60B4E248EA6619BD06E471D4776B0D043605185B27DD9D6854B17DDEAC4"
    ),
    "prove_terminal_q3_forest_anchor_lift_agent.py": (
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D"
    ),
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json": (
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF"
    ),
    "audit_terminal_q3_low_newton_m5_forest_base_agent.py": (
        "2EC37476F7E056463913DEDCAB277536BE77C43537F12272BE88F1CBE318C15E"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_m4_atlas_audit() -> dict[str, int | str]:
    forests = rooted_bases = supported_cells = identity_checks = 0
    disconnected_cells = positive = zero = 0
    minimum: int | None = None
    minimum_cell = ""

    for graph in nx.graph_atlas_g():
        if not 1 <= len(graph) <= 7 or not nx.is_forest(graph):
            continue
        graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
        forests += 1
        component_count = nx.number_connected_components(graph)
        g_ind = independence_counts(graph)
        g_edge = edge_residual_counts(graph)

        for marked in graph:
            rooted_bases += 1
            F = graph.copy()
            F.remove_node(marked)
            H = graph.subgraph(
                set(graph) - ({marked} | set(graph.neighbors(marked)))
            ).copy()
            f_ind = independence_counts(F)
            f_edge = edge_residual_counts(F)
            h_ind = independence_counts(H)
            a = coefficient(f_ind, 2)

            for j in range(3, len(F) + 1):
                b = coefficient(f_ind, j)
                if b == 0:
                    continue
                supported_cells += 1
                if component_count > 1:
                    disconnected_cells += 1
                alpha = coefficient(f_edge, 1) + coefficient(h_ind, 2)
                beta = coefficient(f_edge, j - 1) + coefficient(h_ind, j)
                values: list[int] = []

                for s_value in range(5):
                    t_value = s_value + 1
                    P = sum(
                        comb(t_value, shift) * coefficient(g_ind, 3 - shift)
                        for shift in range(4)
                        if shift <= t_value
                    )
                    R = sum(
                        comb(t_value, shift) * coefficient(g_edge, 2 - shift)
                        for shift in range(3)
                        if shift <= t_value
                    )
                    U = sum(
                        comb(t_value, shift) * coefficient(g_ind, j + 1 - shift)
                        for shift in range(j + 2)
                        if shift <= t_value
                    )
                    c_value = alpha + t_value * a
                    e_value = beta + t_value * b
                    anchor = P * c_value - a * R
                    Q = (j + 1) * b * (c_value + R) - 3 * (P + a) * e_value
                    split = (j + 1) * a * anchor * U + a * P * Q
                    M1 = (j + 1) * b * c_value - 3 * a * e_value
                    original = (
                        P * (P + a) * M1
                        - (j + 1) * anchor * (P * b - a * U)
                    )
                    assert split == original
                    identity_checks += 1
                    values.append(split)

                m4 = forward_difference(values)
                assert m4 >= 0
                if m4:
                    positive += 1
                else:
                    zero += 1
                graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
                cell = f"graph6={graph6},w={marked},j={j},c={component_count}"
                if minimum is None or m4 < minimum:
                    minimum = m4
                    minimum_cell = cell

    return {
        "atlas_forests_order_at_most_7": forests,
        "rooted_bases": rooted_bases,
        "supported_j_cells": supported_cells,
        "disconnected_supported_cells": disconnected_cells,
        "payment_identity_evaluations": identity_checks,
        "positive_m4_cells": positive,
        "zero_m4_cells": zero,
        "minimum_m4": 0 if minimum is None else minimum,
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    tree_report = json.loads(
        (HERE / "terminal_q3_low_newton_m4_all_order_independent_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert tree_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M4_AUDIT"
    )
    incidence_report = json.loads(
        (HERE / "terminal_q3_low_newton_m6_exact_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert incidence_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M6"
    )

    N, j, a, b, e0, p0, h = sp.symbols(
        "N j a b e0 p0 h", integer=True, nonnegative=True
    )
    p1 = (N**2 + N + 2) / 2 + h
    p2 = N + 2
    p3 = sp.Integer(1)

    q1_lower = -3 * (e0 * p1 + b * (p0 + a + p1))
    q2_lower = -3 * e0 * p2 - 6 * b * (p1 + p2)
    q3 = -3 * (e0 + 3 * b * (p2 + 1))
    q4 = -12 * b
    p = [p0, p1, p2, p3]
    q_lower = [sp.Integer(0), q1_lower, q2_lower, q3, q4]
    pq4_lower = sp.expand(
        sum(
            kernel(left, right, 4) * p[left] * q_lower[right]
            for left in range(4)
            for right in range(5)
        )
    )

    tree_Q4 = (
        20 * N**3
        + 15 * N**2 * j
        + 207 * N**2
        + 78 * N * j
        + 739 * N
        + 138 * j
        + 1158
    )
    forest_Q4 = tree_Q4 + 12 * h * (3 * N + j + 15)
    substituted = sp.factor(
        pq4_lower.subs(
            {
                e0: (j + 2) * b,
                a: N * (N - 1) / 2,
                p0: N * (N + 1) * (N + 2) / 6,
            }
        )
    )
    assert sp.expand(substituted + 2 * b * forest_Q4) == 0

    r, k, q = sp.symbols("r k q", integer=True, nonnegative=True)
    R2 = j / (r + 1)
    R3 = j * (j - 1) / ((r + 1) * (r + 2))
    R4 = j * (j - 1) * (j - 2) / ((r + 1) * (r + 2) * (r + 3))
    anchor2 = N**2 + 3 * N + 8 + 3 * h
    anchor3 = 3 * N + 10
    E4 = (
        anchor2 * (6 * R2 + 12 * R3 + 6 * R4)
        + anchor3 * (4 + 12 * R2 + 12 * R3 + 4 * R4)
        + 4 * (5 + 6 * R2 + 4 * R3 + R4)
    )
    pair_floor = (N - 1) * (N - 2) / 2
    sufficient = sp.factor((j + 1) * pair_floor * E4 - 2 * forest_Q4)
    numerator, denominator = sp.together(sufficient.subs(N, j + r)).as_numer_denom()
    numerator = sp.expand(numerator)
    denominator = sp.factor(denominator)
    assert denominator == (r + 1) * (r + 2) * (r + 3)

    h_coefficient = sp.Poly(numerator, h).coeff_monomial(h)
    h_poly = sp.Poly(sp.expand(h_coefficient.subs(j, k + 3)), k, r)
    assert len(h_poly.terms()) == 25
    assert min(h_poly.coeffs()) == 9
    assert all(value > 0 for value in h_poly.coeffs())

    # Reproduce the connected/tree N>=14 cone, now the h=0 slice.
    constant_slice = sp.expand(numerator.subs({h: 0, j: k + 3}))
    high_r = sp.Poly(sp.expand(constant_slice.subs(r, 11 + q)), k, q)
    assert min(high_r.coeffs()) > 0
    boundary_rows = []
    for residual in range(11):
        row = sp.Poly(
            sp.expand(constant_slice.subs({r: residual, k: 11 - residual + q})),
            q,
        )
        assert min(row.coeffs()) > 0
        boundary_rows.append(
            {
                "r": residual,
                "minimum_coefficient": str(min(row.coeffs())),
                "constant": str(row.eval(0)),
            }
        )

    # For disconnected bases h>=1.  Since the h coefficient is positive,
    # it suffices below the large-order cone to check h=1.  N=7,...,13 is
    # finite algebra; N<=6 is covered literally by the graph atlas replay.
    middle_rows = []
    for order_F in range(7, 14):
        values = []
        for target in range(3, order_F + 1):
            residual = order_F - target
            value = sp.factor(
                sufficient.subs(
                    {N: order_F, j: target, r: residual, h: 1}
                )
            )
            assert value > 0
            values.append((value, target))
        minimum_value, minimum_target = min(values)
        middle_rows.append(
            {
                "N": order_F,
                "minimum_h1_gap": str(minimum_value),
                "attained_at_j": minimum_target,
            }
        )

    atlas = literal_m4_atlas_audit()
    assert atlas["disconnected_supported_cells"] > 0
    assert atlas["zero_m4_cells"] == 0

    report = {
        "schema": "terminal-q3-low-newton-m4-forest-base-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M4",
        "claim": (
            "For every supported terminal-payment cell j>=3 over an arbitrary "
            "forest base G, Newton coefficient m=4 is nonnegative."
        ),
        "forest_component_correction": {
            "parameters": "|G|=N+1, h=c(G)-1, p1=p1(tree)+h, r2=N-h",
            "low_remainder": "L4>=-2ab Q4(h)",
            "Q4_h": str(forest_Q4),
            "Q4_minus_tree_Q4": str(sp.factor(forest_Q4 - tree_Q4)),
            "anchor_A2": "A2>=a(N^2+3N+8+3h)",
            "anchor_A3": "A3>=a(3N+10)",
            "anchor_A4": "A4=4a",
            "h_cleared_terms": len(h_poly.terms()),
            "h_minimum_coefficient": str(min(h_poly.coeffs())),
            "direction": "strictly favorable after payment and remainder are combined",
        },
        "domain_assembly": {
            "connected_bases": (
                "The pinned all-order m4 tree-base theorem covers h=0."
            ),
            "disconnected_N_at_least_14": (
                "The h=0 large-order cone is positive and the h coefficient "
                "is coefficientwise positive."
            ),
            "disconnected_N_7_through_13": middle_rows,
            "disconnected_N_at_most_6": (
                "Covered by the literal all-forest graph-atlas replay."
            ),
            "large_order_tree_boundary_rows": boundary_rows,
            "large_r_minimum_coefficient": str(min(high_r.coeffs())),
        },
        "literal_forest_atlas_replay": atlas,
        "combinatorial_inputs": {
            "incidence": "e0<=z_j+h_j+b<=(j+2)b for every forest",
            "trivial_uppers": "a<=C(N,2), p0<=C(N+2,3)",
            "pair_floor": "a=i2(G-w)>=C(N-1,2)",
            "shadows": "standard set-shadow lower bounds for U0,...,U4",
            "anchor": "the pinned all-forest terminal q3 anchor lift",
        },
        "pins": observed_pins,
        "scope": (
            "This closes only Newton degree m=4 for arbitrary forest bases. "
            "It does not close m=0,...,3, the whole terminal payment, the "
            "global q3 envelope, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"h_terms={len(h_poly.terms())} h_min={min(h_poly.coeffs())} "
        f"atlas_cells={atlas['supported_j_cells']}"
    )
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
