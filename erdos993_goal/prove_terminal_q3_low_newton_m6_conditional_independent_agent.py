#!/usr/bin/env python3
"""Exact standalone all-order m=6 terminal-payment proof.

The earlier draft treated q_j(F)<=1 as a strong-induction input.  This replay
now proves that bound unconditionally for every forest from the pinned
prescribed-root incidence injection and an exact endpoint-deletion count.
"""

from __future__ import annotations

import hashlib
from itertools import combinations
import json
from math import factorial
from pathlib import Path

import sympy as sp
import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m6_exact_independent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "terminal_q3_payment_newton_tail_independent_20260828.json": (
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212"
    ),
    "audit_terminal_q3_anchor_ordering_independent_agent.py": (
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C"
    ),
    "terminal_q3_anchor_ordering_independent_audit_20260828.json": (
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C"
    ),
    "RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM_2026-08-28.md": (
        "682282B6D01BB7D5D14758AD4AC1076886A6E82E93F0012F8DC637DF669875E0"
    ),
    "audit_rank4_edge_local_component_surplus_independent_agent.py": (
        "AD02235331B8233A36754DF78970BD0E5FA3922220DEC17D89B03B7319191832"
    ),
    "rank4_edge_local_component_surplus_independent_audit_20260828.json": (
        "8F2BEF58AD6ADAB96066B47EF8BFEAA494CD2E0433CCB7C4A2977F86643A08E4"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def basis(s: sp.Symbol, degree: int) -> sp.Expr:
    return sp.prod(s - offset for offset in range(degree)) / factorial(degree)


def newton_coefficient(expression: sp.Expr, s: sp.Symbol, degree: int) -> sp.Expr:
    values = [sp.expand(expression.subs(s, point)) for point in range(degree + 1)]
    for _ in range(degree):
        values = [sp.expand(right - left) for left, right in zip(values, values[1:])]
    return sp.factor(values[0])


def overlap(left: int, right: int, union: int) -> int:
    if not max(left, right) <= union <= left + right:
        return 0
    return factorial(union) // (
        factorial(union - left)
        * factorial(union - right)
        * factorial(left + right - union)
    )


def literal_incidence_audit() -> dict[str, int]:
    """Independent small-forest replay of 2z_j<=D_j<=2U_j<=2j f_j."""
    forests = ranks = independent_sets = one_edge_sets = 0
    endpoint_pairs = selected_degree_incidences = 0
    for graph in nx.graph_atlas_g():
        if not 1 <= len(graph) <= 7 or not nx.is_forest(graph):
            continue
        graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
        roots = {
            min(component)
            for component in nx.connected_components(graph)
        }
        vertices = list(graph)
        forests += 1
        for j_value in range(1, len(graph) + 1):
            independent = []
            for chosen in combinations(vertices, j_value):
                chosen_set = set(chosen)
                if graph.subgraph(chosen_set).number_of_edges() == 0:
                    independent.append(chosen_set)
            f_j = len(independent)
            if not f_j:
                continue
            ranks += 1
            independent_sets += f_j

            D = sum(
                sum(graph.degree(vertex) for vertex in chosen)
                for chosen in independent
            )
            U = sum(len(chosen - roots) for chosen in independent)
            extensions = sum(
                sum(
                    sum(neighbor in chosen for neighbor in graph.neighbors(outside)) == 1
                    for outside in set(vertices) - chosen
                )
                for chosen in independent
            )
            z = 0
            deletion_pairs = 0
            for chosen in combinations(vertices, j_value + 1):
                induced = graph.subgraph(chosen)
                if induced.number_of_edges() != 1:
                    continue
                z += 1
                left, right = next(iter(induced.edges()))
                for endpoint in (left, right):
                    remainder = set(chosen) - {endpoint}
                    assert graph.subgraph(remainder).number_of_edges() == 0
                    assert sum(neighbor in remainder for neighbor in graph.neighbors(endpoint)) == 1
                    deletion_pairs += 1
            assert deletion_pairs == 2 * z
            assert deletion_pairs == extensions
            assert extensions <= D <= 2 * U <= 2 * j_value * f_j
            one_edge_sets += z
            endpoint_pairs += deletion_pairs
            selected_degree_incidences += D
    return {
        "atlas_forests_order_at_most_7": forests,
        "supported_ranks": ranks,
        "independent_sets": independent_sets,
        "one_edge_sets": one_edge_sets,
        "endpoint_deletion_pairs": endpoint_pairs,
        "selected_degree_incidences": selected_degree_incidences,
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    incidence_audit = literal_incidence_audit()

    s = sp.symbols("s", integer=True, nonnegative=True)
    a, b, c0, e0, j = sp.symbols("a b c0 e0 j", positive=True)
    p0, p1, p2 = sp.symbols("p0 p1 p2", nonnegative=True)
    r0, r1, r2 = sp.symbols("r0 r1 r2", nonnegative=True)
    P = p0 + p1 * basis(s, 1) + p2 * basis(s, 2) + basis(s, 3)
    R = r0 + r1 * basis(s, 1) + r2 * basis(s, 2)
    c = c0 + a * basis(s, 1)
    e = e0 + b * basis(s, 1)
    A = sp.expand(P * c - a * R)
    Q = sp.expand((j + 1) * b * (c + R) - 3 * (P + a) * e)
    L = sp.expand(a * P * Q)

    q3 = newton_coefficient(Q, s, 3)
    q4 = newton_coefficient(Q, s, 4)
    l6 = newton_coefficient(L, s, 6)
    a4 = newton_coefficient(A, s, 4)
    assert sp.expand(q3 + 3 * (e0 + 3 * b * (p2 + 1))) == 0
    assert sp.expand(q4 + 12 * b) == 0
    assert sp.expand(l6 + 60 * a * (e0 + (6 * p2 + 15) * b)) == 0
    assert sp.expand(a4 - 4 * a) == 0
    assert overlap(4, 2, 6) == 15
    assert overlap(4, 3, 6) == 60

    # Verify the shadow-payment inequality after putting j=3+k, N=j+r.
    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    symbolic_j = k + 3
    N = symbolic_j + r
    denominator = 2 * (r + 1) * (r + 2)
    # (j+1) C(N-1,2) * (j/(r+1)+4 C(j,2)/C(r+2,2))
    # minus (6N+j+29), cleared by denominator.
    cleared_gap = sp.expand(
        symbolic_j
        * (symbolic_j + 1)
        * (N - 1)
        * (N - 2)
        * (r + 4 * symbolic_j - 2)
        - denominator * (6 * N + symbolic_j + 29)
    )
    gap_poly = sp.Poly(cleared_gap, k, r)
    assert all(coefficient > 0 for coefficient in gap_poly.coeffs())
    assert cleared_gap.subs({k: 0, r: 0}) == 40

    report = {
        "schema": "terminal-q3-low-newton-m6-exact-independent-v2",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M6",
        "claim": (
            "For every supported terminal cell j>=3, Newton coefficient m=6 "
            "is nonnegative.  The formerly conditional input q_j(F)<=1 is "
            "proved for every forest by the prescribed-root incidence lemma."
        ),
        "unconditional_q_bound": {
            "endpoint_deletion_count": (
                "Every one-edge (j+1)-set has exactly two endpoint deletions, "
                "giving independent j-sets with an added vertex having exactly "
                "one selected neighbor; hence 2z_j equals the number of such pairs."
            ),
            "incidence_chain": "2z_j<=D_j<=2U_j<=2j f_j",
            "conclusion": "z_j<=j f_j, equivalently q_j(F)<=1",
            "literal_atlas_replay": incidence_audit,
        },
        "exact_algebra": {
            "Q3": str(q3),
            "Q4": str(q4),
            "L6": str(l6),
            "P2_at_forest_order_N": "p2=i1(G)+1=N+2",
            "L6_order_form": "-60a[e0+3b(2N+9)]",
            "A4": str(a4),
            "positive_kernel_terms": (
                "[A*U]_6>=15 A4 U2+60 A4 U3=60a(U2+4U3)"
            ),
        },
        "combinatorial_bounds": {
            "numerator_bound": (
                "The unconditional incidence count gives z_j<=j b; H induced in F gives h_j<=b; "
                "therefore e0=z_j+h_j+b<=(j+2)b"
            ),
            "forest_pair_floor": "a>=C(N-1,2)",
            "first_shadow": "(N-j+1)f_(j-1)>=j b and U2>=f_(j-1)",
            "second_shadow": (
                "C(N-j+2,2)f_(j-2)>=C(j,2)b and U3>=f_(j-2)"
            ),
            "sufficient_inequality": (
                "(j+1)a(U2+4U3)>=b(6N+j+29)"
            ),
        },
        "cleared_gap": {
            "substitution": "j=3+k, N=j+r, k,r>=0",
            "positive_denominator": str(denominator),
            "numerator": str(cleared_gap),
            "terms": len(gap_poly.terms()),
            "minimum_coefficient": str(min(gap_poly.coeffs())),
            "constant": "40",
        },
        "final_margin": (
            "delta_6>=60a[(j+1)a(U2+4U3)-e0-3b(2N+9)]>=0"
        ),
        "edge_cases": (
            "Support gives b>0 and N>=j>=3. If b=0 the target is vacuous. "
            "No division by a occurs; support implies a>=C(j,2)>0."
        ),
        "pins": observed_pins,
        "scope": (
            "This closes only m=6.  It does not prove m=0,...,5, the whole "
            "terminal payment, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"L6={l6}")
    print(f"positive_gap_terms={len(gap_poly.terms())} constant=40")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
