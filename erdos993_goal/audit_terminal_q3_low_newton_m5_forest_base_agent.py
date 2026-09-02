#!/usr/bin/env python3
"""Exact forest-base lift of the terminal-payment Newton coefficient m=5.

This is a separate replay of the tree-base m=5 proof.  It keeps the component
deficit h=c(G)-1 symbolic and verifies that the resulting correction to the
cleared shadow gap is coefficientwise positive.  A literal graph-atlas replay
reconstructs the normalized payment directly from independence and edge-
residual counts for every supported rooted forest cell of order at most seven.
"""

from __future__ import annotations

import hashlib
from itertools import combinations
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m5_forest_base_audit_20260829.json"
PINS = {
    "audit_terminal_q3_low_newton_m5_conditional_agent.py": (
        "717A210EC3ED95873F9E28F7951E0F953E059521FC552BD3C23EC19DA53C298F"
    ),
    "terminal_q3_low_newton_m5_independent_audit_20260829.json": (
        "71DBC90A467813DFEFDF88F990318B106B46CD61576E655700D2B35ACF65F5F0"
    ),
    "prove_terminal_q3_forest_anchor_lift_agent.py": (
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D"
    ),
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json": (
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def basis(s: sp.Symbol, degree: int) -> sp.Expr:
    return sp.prod(s - offset for offset in range(degree)) / factorial(degree)


def newton_coefficient(expression: sp.Expr, s: sp.Symbol, degree: int) -> sp.Expr:
    values = [sp.expand(expression.subs(s, value)) for value in range(degree + 1)]
    for _ in range(degree):
        values = [sp.expand(right - left) for left, right in zip(values, values[1:])]
    return sp.factor(values[0])


def independence_counts(graph: nx.Graph) -> list[int]:
    vertices = list(graph)
    counts = [0] * (len(vertices) + 1)
    for size in range(len(vertices) + 1):
        for chosen in combinations(vertices, size):
            if graph.subgraph(chosen).number_of_edges() == 0:
                counts[size] += 1
    return counts


def edge_residual_counts(graph: nx.Graph) -> list[int]:
    """Coefficients of C_G(x)=sum_(uv in E) I_(G-(N[u] union N[v]))."""
    vertices = set(graph)
    counts = [0] * (len(graph) + 1)
    for left, right in graph.edges():
        forbidden = (
            {left, right}
            | set(graph.neighbors(left))
            | set(graph.neighbors(right))
        )
        residual = graph.subgraph(vertices - forbidden)
        row = independence_counts(residual)
        for degree, value in enumerate(row):
            counts[degree] += value
    return counts


def coefficient(row: list[int], degree: int) -> int:
    return row[degree] if 0 <= degree < len(row) else 0


def forward_difference(values: list[int]) -> int:
    while len(values) > 1:
        values = [right - left for left, right in zip(values, values[1:])]
    return values[0]


def literal_forest_payment_audit() -> dict[str, int | str]:
    """Rebuild [binom(s,5)]delta for all supported atlas forest bases."""
    forests = rooted_bases = supported_cells = identity_checks = 0
    nonnegative_m5 = positive_m5 = zero_m5 = 0
    minimum: int | None = None
    minimum_cell = ""

    for graph in nx.graph_atlas_g():
        if not 1 <= len(graph) <= 7 or not nx.is_forest(graph):
            continue
        graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
        forests += 1
        g_ind = independence_counts(graph)
        g_edge = edge_residual_counts(graph)
        component_count = nx.number_connected_components(graph)
        N = len(graph) - 1

        for marked in graph:
            rooted_bases += 1
            F = graph.copy()
            F.remove_node(marked)
            closed = {marked} | set(graph.neighbors(marked))
            H = graph.subgraph(set(graph) - closed).copy()
            f_ind = independence_counts(F)
            f_edge = edge_residual_counts(F)
            h_ind = independence_counts(H)
            a = coefficient(f_ind, 2)

            expected_a = comb(N, 2) - (N + 1 - component_count - graph.degree(marked))
            assert a == expected_a
            assert coefficient(g_ind, 2) + coefficient(g_ind, 1) == N * (N + 1) // 2 + component_count
            assert coefficient(g_edge, 0) == N + 1 - component_count

            for j in range(3, len(F) + 1):
                b = coefficient(f_ind, j)
                if b == 0:
                    continue
                supported_cells += 1
                alpha = coefficient(f_edge, 1) + coefficient(h_ind, 2)
                beta = coefficient(f_edge, j - 1) + coefficient(h_ind, j)

                delta_values: list[int] = []
                for s_value in range(6):
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
                    split_delta = (j + 1) * a * anchor * U + a * P * Q
                    M1 = (j + 1) * b * c_value - 3 * a * e_value
                    original_delta = (
                        P * (P + a) * M1
                        - (j + 1) * anchor * (P * b - a * U)
                    )
                    assert split_delta == original_delta
                    identity_checks += 1
                    delta_values.append(split_delta)

                m5 = forward_difference(delta_values)
                assert m5 >= 0
                nonnegative_m5 += 1
                if m5:
                    positive_m5 += 1
                else:
                    zero_m5 += 1
                graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
                cell = f"graph6={graph6},w={marked},j={j},c={component_count}"
                if minimum is None or m5 < minimum:
                    minimum = m5
                    minimum_cell = cell

    return {
        "atlas_forests_order_at_most_7": forests,
        "rooted_bases": rooted_bases,
        "supported_j_cells": supported_cells,
        "payment_identity_evaluations": identity_checks,
        "nonnegative_m5_cells": nonnegative_m5,
        "positive_m5_cells": positive_m5,
        "zero_m5_cells": zero_m5,
        "minimum_m5": 0 if minimum is None else minimum,
        "minimum_cell": minimum_cell,
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS

    s = sp.symbols("s", integer=True, nonnegative=True)
    a, b, c0, e0, j = sp.symbols("a b c0 e0 j", positive=True)
    p0, p1, p2 = sp.symbols("p0 p1 p2", nonnegative=True)
    r0, r1, r2 = sp.symbols("r0 r1 r2", nonnegative=True)
    N, h = sp.symbols("N h", integer=True, nonnegative=True)

    P = p0 + p1 * basis(s, 1) + p2 * basis(s, 2) + basis(s, 3)
    R = r0 + r1 * basis(s, 1) + r2 * basis(s, 2)
    c_poly = c0 + a * basis(s, 1)
    e_poly = e0 + b * basis(s, 1)
    A = sp.expand(P * c_poly - a * R)
    Q = sp.expand((j + 1) * b * (c_poly + R) - 3 * (P + a) * e_poly)
    L = sp.expand(a * P * Q)
    l5 = newton_coefficient(L, s, 5)

    tree_values = {
        p1: (N**2 + N + 2) / 2,
        p2: N + 2,
        r2: N,
    }
    forest_values = {
        p1: (N**2 + N + 2) / 2 + h,
        p2: N + 2,
        r2: N - h,
    }
    l5_tree = sp.expand(l5.subs(tree_values))
    l5_forest = sp.expand(l5.subs(forest_values))
    forest_correction = sp.factor(l5_forest - l5_tree)
    assert sp.expand(forest_correction + 10 * a * b * h * (j + 13)) == 0

    positive_q2_piece = 10 * (j + 1) * b * (N - h)
    P5 = 5 * N**2 + 2 * N * j + 40 * N + 7 * j + 95
    lower_l5 = sp.factor(
        (l5_forest - a * positive_q2_piece).subs(e0, (j + 2) * b)
    )
    assert sp.expand(lower_l5 + 30 * a * b * (P5 + 4 * h)) == 0

    a2 = newton_coefficient(A, s, 2).subs(forest_values)
    a3 = newton_coefficient(A, s, 3).subs(forest_values)
    a4 = newton_coefficient(A, s, 4).subs(forest_values)
    a2_lower = a * (N**2 + 3 * N + 8 + 3 * h)
    a3_lower = a * (3 * N + 10)
    assert sp.expand(a2 - a2_lower - (N + 2) * (c0 - a)) == 0
    assert sp.expand(a3 - a3_lower - (c0 - a)) == 0
    assert sp.expand(a4 - 4 * a) == 0

    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    symbolic_j = k + 3
    symbolic_N = symbolic_j + r
    U2 = symbolic_j / (r + 1)
    U3 = symbolic_j * (symbolic_j - 1) / ((r + 1) * (r + 2))
    U4 = (
        symbolic_j * (symbolic_j - 1) * (symbolic_j - 2)
        / ((r + 1) * (r + 2) * (r + 3))
    )
    A2bar = symbolic_N**2 + 3 * symbolic_N + 8 + 3 * h
    A3bar = 3 * symbolic_N + 10
    E = (
        A2bar * (10 * U3 + 20 * U4)
        + A3bar * (10 * U2 + 30 * U3 + 30 * U4)
        + 4 * (5 + 20 * U2 + 30 * U3 + 20 * U4)
    )
    forest_P5 = (P5 + 4 * h).subs({N: symbolic_N, j: symbolic_j})
    gap = sp.cancel(
        (symbolic_j + 1)
        * ((symbolic_N - 1) * (symbolic_N - 2) / 2)
        * E
        - 30 * forest_P5
    )
    numerator, denominator = sp.fraction(gap)
    numerator = sp.expand(numerator)
    denominator = sp.factor(denominator)
    gap_poly = sp.Poly(numerator, k, r, h)
    assert denominator == (r + 1) * (r + 2) * (r + 3)
    assert len(gap_poly.terms()) == 61
    assert min(gap_poly.coeffs()) == 5
    assert all(value > 0 for value in gap_poly.coeffs())

    h_coefficient = sp.Poly(numerator, h).coeff_monomial(h)
    h_poly = sp.Poly(sp.expand(h_coefficient), k, r)
    assert len(h_poly.terms()) == 22
    assert min(h_poly.coeffs()) == 15
    corner = sp.factor(numerator.subs({k: 0, r: 0}))
    assert sp.expand(corner - 60 * (48 * h + 1043)) == 0

    atlas = literal_forest_payment_audit()

    report = {
        "schema": "terminal-q3-low-newton-m5-forest-base-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M5",
        "claim": (
            "For every supported terminal-payment cell j>=3 over an arbitrary "
            "forest base G, Newton coefficient m=5 is nonnegative.  The exact "
            "component-deficit correction is absorbed coefficientwise by the "
            "improved A2 anchor lower bound."
        ),
        "forest_parameters": {
            "orders": "|G|=N+1, h=c(G)-1>=0",
            "P1": "N(N+1)/2+1+h",
            "P2": "N+2",
            "R2": "N-h",
            "pair_floor": "a=i2(G-w)>=C(N-1,2)",
        },
        "exact_low_remainder": {
            "forest_minus_tree_L5": str(forest_correction),
            "dropped_nonnegative_piece_before_outer_a": str(positive_q2_piece),
            "e0_bound": "e0<=z_j+h_j+b<=(j+2)b",
            "lower_bound": "L5>=-30ab(P5+4h)",
            "P5": str(P5),
        },
        "anchor_lower_bounds": {
            "A2": "A2>=a(N^2+3N+8+3h)",
            "A3": "A3>=a(3N+10)",
            "A4": "A4=4a",
        },
        "shadow_gap": {
            "substitution": "j=3+k, N=j+r, k,r,h>=0",
            "denominator": str(denominator),
            "positive_numerator_terms": len(gap_poly.terms()),
            "minimum_numerator_coefficient": str(min(gap_poly.coeffs())),
            "h_coefficient_terms": len(h_poly.terms()),
            "minimum_h_coefficient": str(min(h_poly.coeffs())),
            "small_corner": str(corner),
        },
        "literal_forest_atlas_replay": atlas,
        "pins": observed_pins,
        "scope": (
            "This closes only Newton degree m=5 for arbitrary forest bases. "
            "It does not by itself close m=0,...,4, the whole terminal payment, "
            "the global q3 envelope, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"gap_terms={len(gap_poly.terms())} min_coeff={min(gap_poly.coeffs())} "
        f"atlas_cells={atlas['supported_j_cells']}"
    )
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
