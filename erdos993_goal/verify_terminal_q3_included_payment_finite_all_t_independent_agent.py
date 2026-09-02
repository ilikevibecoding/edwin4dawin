#!/usr/bin/env python3
"""Exact finite-base, all-real-t terminal included-payment certificate.

For every unlabelled base tree G of order at most 14, every marked vertex w,
and every supported target rank, this verifier reconstructs the two recurrence
blocks without importing another script.  It proves coefficientwise in
s=t-1>=0 the stronger untruncated payment

  (d0+d1)d0 M1 >= (c1 d0-c0 d1)(d0 D1-d1 D0).

Together with the independently audited all-order anchor ordering and direct
M1 positivity, this implies the original positive-part payment throughout the
finite base for every real t>=1.  It is not an all-order proof in |G|.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_included_payment_finite_all_t_independent_20260828.json"
PINS = {
    "TERMINAL_SUPPORT_Q3_ENVELOPE_RECURRENCE_INDEPENDENT_2026-08-28.md": (
        "ED1733748294AF20E9C2A465C012C0B74A9CE4AB6235E269BF65E1F4DC78110D"
    ),
    "audit_terminal_q3_anchor_ordering_independent_agent.py": (
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C"
    ),
    "terminal_q3_anchor_ordering_independent_audit_20260828.json": (
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C"
    ),
}
ANCHOR_STATUS = "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def trim(row: list[int]) -> list[int]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def row_add(left: list[int], right: list[int]) -> list[int]:
    output = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        output[index] += value
    for index, value in enumerate(right):
        output[index] += value
    return trim(output)


def row_shift(row: list[int]) -> list[int]:
    return [0] + row


def row_multiply(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for left_index, left_value in enumerate(left):
        for right_index, right_value in enumerate(right):
            output[left_index + right_index] += left_value * right_value
    return trim(output)


def zero_one_edge_rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    """Independent-set and exactly-one-edge vertex-set rows for a forest."""
    if not graph:
        return [1], [0]
    seen: set[int] = set()

    def visit(vertex: int, parent: int | None):
        seen.add(vertex)
        excluded_zero, excluded_one = [1], [0]
        included_zero, included_one = [1], [0]
        for child in graph.neighbors(vertex):
            if child == parent or child in seen:
                continue
            ce0, ce1, ci0, ci1 = visit(child, vertex)
            free_zero, free_one = row_add(ce0, ci0), row_add(ce1, ci1)
            old_zero, old_one = excluded_zero, excluded_one
            excluded_zero = row_multiply(old_zero, free_zero)
            excluded_one = row_add(
                row_multiply(old_one, free_zero),
                row_multiply(old_zero, free_one),
            )
            old_zero, old_one = included_zero, included_one
            included_zero = row_multiply(old_zero, ce0)
            included_one = row_add(
                row_multiply(old_one, ce0),
                row_multiply(old_zero, row_add(ce1, ci0)),
            )
        return excluded_zero, excluded_one, row_shift(included_zero), row_shift(included_one)

    total_zero, total_one = [1], [0]
    for vertex in graph.nodes():
        if vertex in seen:
            continue
        e0, e1, i0, i1 = visit(vertex, None)
        component_zero, component_one = row_add(e0, i0), row_add(e1, i1)
        old_zero, old_one = total_zero, total_one
        total_zero = row_multiply(old_zero, component_zero)
        total_one = row_add(
            row_multiply(old_one, component_zero),
            row_multiply(old_zero, component_one),
        )
    return total_zero, total_one


def rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    independent, one_edge = zero_one_edge_rows(graph)
    # C_k=s_(k+1), so remove the two mandatory endpoints of the unique edge.
    residual = one_edge[2:] if len(one_edge) > 2 else [0]
    return independent, trim(residual)


def delete_vertices(graph: nx.Graph, vertices: set[int]) -> nx.Graph:
    return graph.subgraph([vertex for vertex in graph if vertex not in vertices]).copy()


def closed_neighborhood(graph: nx.Graph, vertex: int) -> set[int]:
    return {vertex, *graph.neighbors(vertex)}


# Polynomials below are ordinary power rows in s=t-1, low degree first.
Poly = list[Fraction]


def poly_trim(row: Poly) -> Poly:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def poly_add(left: Poly, right: Poly) -> Poly:
    output = [Fraction(0)] * max(len(left), len(right))
    for index, value in enumerate(left):
        output[index] += value
    for index, value in enumerate(right):
        output[index] += value
    return poly_trim(output)


def poly_scale(row: Poly, multiplier: int | Fraction) -> Poly:
    return poly_trim([value * multiplier for value in row])


def poly_subtract(left: Poly, right: Poly) -> Poly:
    return poly_add(left, poly_scale(right, -1))


def poly_multiply(left: Poly, right: Poly) -> Poly:
    output = [Fraction(0)] * (len(left) + len(right) - 1)
    for left_index, left_value in enumerate(left):
        for right_index, right_value in enumerate(right):
            output[left_index + right_index] += left_value * right_value
    return poly_trim(output)


def shifted_binomial_polynomials(maximum: int) -> list[Poly]:
    """Return ordinary power rows of C(s+1,l), 0<=l<=maximum."""
    output: list[Poly] = [[Fraction(1)]]
    for rank in range(1, maximum + 1):
        output.append(poly_scale(
            poly_multiply(output[-1], [Fraction(2 - rank), Fraction(1)]),
            Fraction(1, rank),
        ))
    return output


def isolate_convolution_coefficient(
    row: list[int], rank: int, binomials: list[Poly]
) -> Poly:
    output: Poly = [Fraction(0)]
    for isolates in range(min(rank, len(binomials) - 1) + 1):
        source_rank = rank - isolates
        if source_rank < len(row):
            output = poly_add(
                output,
                poly_scale(binomials[isolates], row[source_rank]),
            )
    return output


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    anchor = json.loads(
        (HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert anchor["status"] == ANCHOR_STATUS
    assert anchor["source_sha256"] == PINS[
        "audit_terminal_q3_anchor_ordering_independent_agent.py"
    ]

    trees_total = marked_total = rank_polynomials = coefficient_checks = 0
    m1_coefficient_checks = 0
    zero_coefficients = 0
    minimum: Fraction | None = None
    minimum_witness: dict[str, object] | None = None
    stream = hashlib.sha256()
    per_order = []

    for order in range(1, 15):
        binomials = shifted_binomial_polynomials(order + 3)
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        order_trees = order_marked = order_ranks = order_coefficients = 0
        for tree_index, tree in enumerate(trees):
            order_trees += 1
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            independent_g, residual_g = rows(tree)
            A3 = isolate_convolution_coefficient(independent_g, 3, binomials)
            d0 = poly_scale(A3, 3)
            c0 = isolate_convolution_coefficient(residual_g, 2, binomials)
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()

            for root in tree.nodes():
                order_marked += 1
                F = delete_vertices(tree, {root})
                H = delete_vertices(tree, closed_neighborhood(tree, root))
                f, z = rows(F)
                h, _ = rows(H)
                f2 = f[2] if len(f) > 2 else 0
                z2 = z[1] if len(z) > 1 else 0
                h2 = h[2] if len(h) > 2 else 0
                d1 = 3 * f2
                # t=1+s.
                c1 = [Fraction(z2 + h2 + f2), Fraction(f2)]
                anchor_gap = poly_subtract(
                    poly_multiply(c1, d0),
                    poly_scale(c0, d1),
                )

                for index in range(3, len(f)):
                    fj = f[index]
                    zj = z[index - 1] if index - 1 < len(z) else 0
                    hj = h[index] if index < len(h) else 0
                    D1 = (index + 1) * fj
                    C1 = [Fraction(zj + hj + fj), Fraction(fj)]
                    M1 = poly_subtract(
                        poly_scale(c1, D1),
                        poly_scale(C1, d1),
                    )
                    assert all(value >= 0 for value in M1)
                    m1_coefficient_checks += len(M1)

                    D0 = poly_scale(
                        isolate_convolution_coefficient(
                            independent_g, index + 1, binomials
                        ),
                        index + 1,
                    )
                    weight_shift = poly_subtract(
                        poly_scale(d0, D1),
                        poly_scale(D0, d1),
                    )
                    lhs = poly_multiply(
                        poly_multiply(poly_add(d0, [Fraction(d1)]), d0),
                        M1,
                    )
                    margin = poly_subtract(
                        lhs,
                        poly_multiply(anchor_gap, weight_shift),
                    )
                    assert all(value >= 0 for value in margin), (
                        order,
                        tree_index,
                        root,
                        index + 1,
                        graph6,
                        margin,
                    )
                    rank_polynomials += 1
                    order_ranks += 1
                    coefficient_checks += len(margin)
                    order_coefficients += len(margin)
                    for power, value in enumerate(margin):
                        zero_coefficients += value == 0
                        if minimum is None or value < minimum:
                            minimum = value
                            minimum_witness = {
                                "order": order,
                                "tree_index": tree_index,
                                "graph6": graph6,
                                "marked_vertex": root,
                                "target_rank": index + 1,
                                "power_of_s": power,
                                "coefficient": str(value),
                            }
                        stream.update(
                            (
                                f"{order},{tree_index},{graph6},{root},{index + 1},"
                                f"{power},{value.numerator}/{value.denominator}\n"
                            ).encode()
                        )
        trees_total += order_trees
        marked_total += order_marked
        per_order.append({
            "order": order,
            "trees": order_trees,
            "marked_trees": order_marked,
            "rank_polynomials": order_ranks,
            "coefficient_checks": order_coefficients,
        })
        print(
            f"n={order}: trees={order_trees:,} marked={order_marked:,} "
            f"rank-polynomials={order_ranks:,} coefficients={order_coefficients:,}"
        )

    assert trees_total == 5447
    assert marked_total == 72145
    assert rank_polynomials > 0 and coefficient_checks > 0
    report = {
        "status": "PASS_EXACT_FINITE_N14_ALL_REAL_T_TERMINAL_Q3_INCLUDED_PAYMENT_COEFFICIENTS_NOT_ALL_ORDER",
        "claim": (
            "For every tree G with 1<=|G|<=14, every marked vertex w, every "
            "supported target rank, and every real t>=1, the terminal two-block "
            "included-self-slack payment holds."
        ),
        "stronger_polynomial": (
            "With s=t-1, every ordinary power coefficient of "
            "Delta=(d0+d1)d0*M1-(c1*d0-c0*d1)(d0*D1-d1*D0) is nonnegative."
        ),
        "logic": (
            "The pinned all-order anchor theorem gives c1*d0-c0*d1>=0. "
            "Direct coefficientwise M1>=0 handles nonpositive denominator "
            "weight shift; nonnegative Delta handles positive weight shift."
        ),
        "exact_counts": {
            "orders": [1, 14],
            "trees": trees_total,
            "marked_trees": marked_total,
            "rank_polynomials": rank_polynomials,
            "payment_coefficient_checks": coefficient_checks,
            "M1_coefficient_checks": m1_coefficient_checks,
            "zero_payment_coefficients": zero_coefficients,
            "minimum_payment_coefficient": str(minimum),
            "minimum_witness": minimum_witness,
            "ordered_payment_coefficient_sha256": stream.hexdigest().upper(),
            "per_order": per_order,
        },
        "frozen_dependencies": {
            name: {
                "expected_sha256": PINS[name],
                "observed_sha256": observed_pins[name],
            }
            for name in PINS
        },
        "scope": (
            "This is an exact finite-order theorem with an unbounded real bundle "
            "parameter.  It does not prove the payment for |G|>=15, the full "
            "q3 envelope, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["exact_counts"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
