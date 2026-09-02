#!/usr/bin/env python3
"""Exact diagnostic for the terminal-support q3-envelope recurrence.

This is not an all-tree proof.  It independently derives and literally
checks the leaf-bundle recurrence, then tests several natural anchor
dominance statements needed by a simple inductive-mixture proof.  The
uniform subdivided 18-star is replayed as an explicit guard against the
already-refuted adjacent-rank monotonicity shortcut.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_support_q3_envelope_recurrence_probe_independent_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def trim(row: list[int]) -> list[int]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    return trim(out)


def scale(row: list[int], multiplier: int) -> list[int]:
    return trim([multiplier * value for value in row])


def shift(row: list[int], amount: int = 1) -> list[int]:
    return [0] * amount + row


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return trim(out)


def derivative(row: list[int]) -> list[int]:
    return trim([index * row[index] for index in range(1, len(row))] or [0])


def binomial_row(power: int) -> list[int]:
    row = [1]
    for _ in range(power):
        row = multiply(row, [1, 1])
    return row


def zero_one_edge_polynomials(graph: nx.Graph) -> tuple[list[int], list[int]]:
    """Count induced vertex sets having zero and exactly one edge."""
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

            free_zero, free_one = add(ce0, ci0), add(ce1, ci1)
            old_zero, old_one = excluded_zero, excluded_one
            excluded_zero = multiply(old_zero, free_zero)
            excluded_one = add(
                multiply(old_one, free_zero), multiply(old_zero, free_one)
            )

            old_zero, old_one = included_zero, included_one
            included_zero = multiply(old_zero, ce0)
            included_one = add(
                multiply(old_one, ce0), multiply(old_zero, add(ce1, ci0))
            )
        return excluded_zero, excluded_one, shift(included_zero), shift(included_one)

    total_zero, total_one = [1], [0]
    for vertex in graph.nodes():
        if vertex in seen:
            continue
        e0, e1, i0, i1 = visit(vertex, None)
        component_zero, component_one = add(e0, i0), add(e1, i1)
        old_zero, old_one = total_zero, total_one
        total_zero = multiply(old_zero, component_zero)
        total_one = add(
            multiply(old_one, component_zero),
            multiply(old_zero, component_one),
        )
    return total_zero, total_one


def rows(graph: nx.Graph) -> tuple[list[int], list[int], list[int]]:
    independent, one_edge = zero_one_edge_polynomials(graph)
    # C_j=s_(j+1) is the one-edge polynomial shifted down by two.
    residual_sum = one_edge[2:] if len(one_edge) > 2 else [0]
    return independent, trim(residual_sum), derivative(independent)


def delete_vertices(graph: nx.Graph, vertices: set[int]) -> nx.Graph:
    return graph.subgraph([v for v in graph if v not in vertices]).copy()


def closed_neighborhood(graph: nx.Graph, vertex: int) -> set[int]:
    return {vertex, *graph.neighbors(vertex)}


def terminal_extension(base: nx.Graph, support_neighbor: int, leaves: int) -> nx.Graph:
    tree = nx.convert_node_labels_to_integers(base, ordering="sorted")
    # Relabeling is identity for every base used below, but map defensively.
    support_neighbor = list(sorted(base.nodes())).index(support_neighbor)
    support = len(tree)
    tree.add_edge(support_neighbor, support)
    for index in range(leaves):
        tree.add_edge(support, support + 1 + index)
    return tree


def recurrence_rows(base: nx.Graph, w: int, leaves: int) -> tuple[list[int], list[int]]:
    independent_g, residual_g, _ = rows(base)
    minus_w = delete_vertices(base, {w})
    minus_closed = delete_vertices(base, closed_neighborhood(base, w))
    independent_minus_w, residual_minus_w, _ = rows(minus_w)
    independent_minus_closed, _, _ = rows(minus_closed)
    binomial = binomial_row(leaves)

    independent_t = add(
        multiply(binomial, independent_g),
        shift(independent_minus_w),
    )
    residual_t = add(
        add(
            multiply(binomial, residual_g),
            shift(residual_minus_w),
        ),
        add(independent_minus_closed, scale(independent_minus_w, leaves)),
    )
    return independent_t, residual_t


def recurrence_components(
    base: nx.Graph, w: int, leaves: int
) -> tuple[tuple[list[int], list[int]], tuple[list[int], list[int]]]:
    """Return the v-excluded and v-included (I,C) recurrence blocks."""
    independent_g, residual_g, _ = rows(base)
    minus_w = delete_vertices(base, {w})
    minus_closed = delete_vertices(base, closed_neighborhood(base, w))
    independent_minus_w, residual_minus_w, _ = rows(minus_w)
    independent_minus_closed, _, _ = rows(minus_closed)
    binomial = binomial_row(leaves)
    excluded = (
        multiply(binomial, independent_g),
        multiply(binomial, residual_g),
    )
    included = (
        shift(independent_minus_w),
        add(
            shift(residual_minus_w),
            add(independent_minus_closed, scale(independent_minus_w, leaves)),
        ),
    )
    return excluded, included


def q3(graph: nx.Graph) -> Fraction | None:
    independent, residual, derivative_row = rows(graph)
    if len(derivative_row) <= 2 or not derivative_row[2]:
        return None
    numerator = residual[2] if len(residual) > 2 else 0
    return Fraction(numerator, derivative_row[2])


def q_profile(graph: nx.Graph) -> dict[int, Fraction]:
    independent, residual, derivative_row = rows(graph)
    profile = {}
    for index, denominator in enumerate(derivative_row):
        if denominator:
            numerator = residual[index] if index < len(residual) else 0
            profile[index + 1] = Fraction(numerator, denominator)
    return profile


def witness_row(
    base: nx.Graph,
    w: int,
    leaves: int,
    left: Fraction,
    right: Fraction,
) -> dict[str, object]:
    return {
        "base_order": len(base),
        "extended_order": len(base) + leaves + 1,
        "w": w,
        "leaves": leaves,
        "left": str(left),
        "right": str(right),
        "cross": left.numerator * right.denominator - right.numerator * left.denominator,
        "base_graph6": nx.to_graph6_bytes(base, header=False).decode().strip(),
    }


def subdivided_star(arms: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(2 * arms + 1))
    for arm in range(arms):
        root = arm + 1
        leaf = arms + arm + 1
        graph.add_edge(0, root)
        graph.add_edge(root, leaf)
    return graph


def main() -> None:
    recurrence_checks = 0
    envelope_checks = 0
    envelope_failures: list[dict[str, object]] = []
    q4_envelope_failure: dict[str, object] | None = None
    candidates = {
        "q3_extension_at_least_q3_base": [],
        "q3_extension_at_least_q3_base_minus_w": [],
        "q3_extension_at_least_q3_base_plus_isolates": [],
    }
    component_candidates: dict[str, dict[str, object] | None] = {
        "excluded_block_qr_at_most_its_q3": None,
        "included_block_qr_at_most_its_q3": None,
        "excluded_block_qr_at_most_q3_T": None,
        "included_block_qr_at_most_q3_T": None,
        "included_block_adjacent_nonincreasing_from_rank3": None,
        "included_to_excluded_denominator_weight_nonincreasing_from_rank3": None,
        "included_rank3_anchor_at_least_excluded_rank3_anchor": None,
        "included_self_slack_alone_pays_adverse_weight_shift": None,
        "excluded_self_slack_alone_pays_adverse_weight_shift": None,
    }

    for order in range(2, 11):
        for base in nx.nonisomorphic_trees(order):
            base = nx.convert_node_labels_to_integers(base, ordering="sorted")
            for w in base.nodes():
                minus_w = delete_vertices(base, {w})
                base_q3 = q3(base)
                minus_w_q3 = q3(minus_w)
                for leaves in range(1, 6):
                    extended = terminal_extension(base, w, leaves)
                    direct_i, direct_c, _ = rows(extended)
                    recurrence_i, recurrence_c = recurrence_rows(base, w, leaves)
                    assert direct_i == recurrence_i
                    assert direct_c == recurrence_c
                    recurrence_checks += 1

                    profile = q_profile(extended)
                    anchor = profile.get(3)
                    if anchor is not None:
                        excluded, included = recurrence_components(base, w, leaves)
                        component_profiles: list[dict[int, Fraction]] = []
                        for component_i, component_c in (excluded, included):
                            component_d = derivative(component_i)
                            component_profiles.append({
                                index + 1: Fraction(
                                    component_c[index] if index < len(component_c) else 0,
                                    denominator,
                                )
                                for index, denominator in enumerate(component_d)
                                if denominator
                            })
                        excluded_profile, included_profile = component_profiles
                        excluded_anchor = excluded_profile.get(3)
                        included_anchor = included_profile.get(3)
                        if (
                            excluded_anchor is not None
                            and included_anchor is not None
                            and included_anchor < excluded_anchor
                            and component_candidates[
                                "included_rank3_anchor_at_least_excluded_rank3_anchor"
                            ] is None
                        ):
                            component_candidates[
                                "included_rank3_anchor_at_least_excluded_rank3_anchor"
                            ] = witness_row(
                                base, w, leaves, included_anchor, excluded_anchor
                            )
                        for rank, ratio in excluded_profile.items():
                            if (
                                rank >= 4
                                and excluded_anchor is not None
                                and ratio > excluded_anchor
                                and component_candidates[
                                    "excluded_block_qr_at_most_its_q3"
                                ] is None
                            ):
                                component_candidates[
                                    "excluded_block_qr_at_most_its_q3"
                                ] = {
                                    "rank": rank,
                                    "block_ratio": str(ratio),
                                    "block_q3": str(excluded_anchor),
                                    **witness_row(base, w, leaves, ratio, excluded_anchor),
                                }
                            if rank >= 4 and ratio > anchor and component_candidates[
                                "excluded_block_qr_at_most_q3_T"
                            ] is None:
                                component_candidates["excluded_block_qr_at_most_q3_T"] = {
                                    "rank": rank,
                                    "block_ratio": str(ratio),
                                    "q3_T": str(anchor),
                                    **witness_row(base, w, leaves, ratio, anchor),
                                }
                        for rank, ratio in included_profile.items():
                            if (
                                rank >= 4
                                and included_anchor is not None
                                and ratio > included_anchor
                                and component_candidates[
                                    "included_block_qr_at_most_its_q3"
                                ] is None
                            ):
                                component_candidates[
                                    "included_block_qr_at_most_its_q3"
                                ] = {
                                    "rank": rank,
                                    "block_ratio": str(ratio),
                                    "block_q3": str(included_anchor),
                                    **witness_row(base, w, leaves, ratio, included_anchor),
                                }
                            if rank >= 4 and ratio > anchor and component_candidates[
                                "included_block_qr_at_most_q3_T"
                            ] is None:
                                component_candidates["included_block_qr_at_most_q3_T"] = {
                                    "rank": rank,
                                    "block_ratio": str(ratio),
                                    "q3_T": str(anchor),
                                    **witness_row(base, w, leaves, ratio, anchor),
                                }
                        included_ranks = sorted(rank for rank in included_profile if rank >= 3)
                        for lower, upper in zip(included_ranks, included_ranks[1:]):
                            if upper != lower + 1:
                                continue
                            if included_profile[upper] > included_profile[lower] and component_candidates[
                                "included_block_adjacent_nonincreasing_from_rank3"
                            ] is None:
                                component_candidates[
                                    "included_block_adjacent_nonincreasing_from_rank3"
                                ] = {
                                    "lower_rank": lower,
                                    "upper_rank": upper,
                                    "q_lower": str(included_profile[lower]),
                                    "q_upper": str(included_profile[upper]),
                                    **witness_row(
                                        base,
                                        w,
                                        leaves,
                                        included_profile[lower],
                                        included_profile[upper],
                                    ),
                                }
                        excluded_d = derivative(excluded[0])
                        included_d = derivative(included[0])
                        if len(excluded_d) > 2 and len(included_d) > 2 and excluded_d[2]:
                            anchor_weight = Fraction(included_d[2], excluded_d[2])
                            for index in range(3, max(len(excluded_d), len(included_d))):
                                left_den = excluded_d[index] if index < len(excluded_d) else 0
                                right_num = included_d[index] if index < len(included_d) else 0
                                if not left_den:
                                    continue
                                weight = Fraction(right_num, left_den)
                                if weight > anchor_weight and component_candidates[
                                    "included_to_excluded_denominator_weight_nonincreasing_from_rank3"
                                ] is None:
                                    component_candidates[
                                        "included_to_excluded_denominator_weight_nonincreasing_from_rank3"
                                    ] = {
                                        "rank": index + 1,
                                        "weight": str(weight),
                                        "rank3_weight": str(anchor_weight),
                                        **witness_row(base, w, leaves, weight, anchor_weight),
                                    }
                            d0, d1 = excluded_d[2], included_d[2]
                            c0 = excluded[1][2] if len(excluded[1]) > 2 else 0
                            c1 = included[1][2] if len(included[1]) > 2 else 0
                            anchor_gap = c1 * d0 - c0 * d1
                            for index in range(3, max(len(excluded_d), len(included_d))):
                                D0 = excluded_d[index] if index < len(excluded_d) else 0
                                D1 = included_d[index] if index < len(included_d) else 0
                                if not D0 and not D1:
                                    continue
                                C0 = excluded[1][index] if index < len(excluded[1]) else 0
                                C1 = included[1][index] if index < len(included[1]) else 0
                                weight_shift = d0 * D1 - d1 * D0
                                adverse = max(0, anchor_gap * weight_shift)
                                M0 = c0 * D0 - d0 * C0
                                M1 = c1 * D1 - d1 * C1
                                assert M0 >= 0 and M1 >= 0
                                if (
                                    (d0 + d1) * d0 * M1 < adverse
                                    and component_candidates[
                                        "included_self_slack_alone_pays_adverse_weight_shift"
                                    ] is None
                                ):
                                    component_candidates[
                                        "included_self_slack_alone_pays_adverse_weight_shift"
                                    ] = {
                                        "rank": index + 1,
                                        "included_payment": (d0 + d1) * d0 * M1,
                                        "adverse_weight_term": adverse,
                                        **witness_row(base, w, leaves, Fraction(M1, 1), Fraction(adverse, 1)),
                                    }
                                if (
                                    (d0 + d1) * d1 * M0 < adverse
                                    and component_candidates[
                                        "excluded_self_slack_alone_pays_adverse_weight_shift"
                                    ] is None
                                ):
                                    component_candidates[
                                        "excluded_self_slack_alone_pays_adverse_weight_shift"
                                    ] = {
                                        "rank": index + 1,
                                        "excluded_payment": (d0 + d1) * d1 * M0,
                                        "adverse_weight_term": adverse,
                                        **witness_row(base, w, leaves, Fraction(M0, 1), Fraction(adverse, 1)),
                                    }
                        for rank, ratio in profile.items():
                            if rank < 4:
                                continue
                            envelope_checks += 1
                            if ratio > anchor and len(envelope_failures) < 25:
                                envelope_failures.append({
                                    "rank": rank,
                                    "q_rank": str(ratio),
                                    "q3": str(anchor),
                                    **witness_row(base, w, leaves, ratio, anchor),
                                })
                        rank4_anchor = profile.get(4)
                        if rank4_anchor is not None:
                            for rank, ratio in profile.items():
                                if (
                                    rank >= 5
                                    and ratio > rank4_anchor
                                    and q4_envelope_failure is None
                                ):
                                    q4_envelope_failure = {
                                        "rank": rank,
                                        "q_rank": str(ratio),
                                        "q4": str(rank4_anchor),
                                        **witness_row(base, w, leaves, ratio, rank4_anchor),
                                    }

                        if base_q3 is not None and anchor < base_q3 and not candidates[
                            "q3_extension_at_least_q3_base"
                        ]:
                            candidates["q3_extension_at_least_q3_base"].append(
                                witness_row(base, w, leaves, anchor, base_q3)
                            )
                        if minus_w_q3 is not None and anchor < minus_w_q3 and not candidates[
                            "q3_extension_at_least_q3_base_minus_w"
                        ]:
                            candidates["q3_extension_at_least_q3_base_minus_w"].append(
                                witness_row(base, w, leaves, anchor, minus_w_q3)
                            )

                        isolates = nx.disjoint_union(base, nx.empty_graph(leaves))
                        isolates_q3 = q3(isolates)
                        if isolates_q3 is not None and anchor < isolates_q3 and not candidates[
                            "q3_extension_at_least_q3_base_plus_isolates"
                        ]:
                            candidates["q3_extension_at_least_q3_base_plus_isolates"].append(
                                witness_row(base, w, leaves, anchor, isolates_q3)
                            )

    s18 = subdivided_star(18)
    profile18 = q_profile(s18)
    adjacent = []
    for lower in (15, 16):
        upper = lower + 1
        cross = (
            profile18[lower].numerator * profile18[upper].denominator
            - profile18[upper].numerator * profile18[lower].denominator
        )
        assert cross < 0
        adjacent.append({
            "lower_rank": lower,
            "upper_rank": upper,
            "q_lower": str(profile18[lower]),
            "q_upper": str(profile18[upper]),
            "reduced_fraction_cross": cross,
        })
        assert profile18[upper] <= profile18[3]

    payload = {
        "schema": "terminal-support-q3-envelope-recurrence-probe-independent-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_Q3_ENVELOPE"
            if envelope_failures
            else "PASS_EXACT_TERMINAL_SUPPORT_RECURRENCE_DIAGNOSTIC"
        ),
        "recurrence": {
            "construction": "T is obtained from (G,w) by adjoining w-v and t leaves at v",
            "I_T": "(1+x)^t*I_G+x*I_(G-w)",
            "C_T": "(1+x)^t*C_G+x*C_(G-w)+I_(G-N[w])+t*I_(G-w)",
            "D_T": "(1+x)^t*D_G+t*(1+x)^(t-1)*I_G+I_(G-w)+x*D_(G-w)",
            "blocker_K_T": "(1+x)^t*K_G+x*K_(G-w)+t*((1+x)^(t-1)*I_G-I_(G-w))+(I_(G-w)-I_(G-N[w]))",
        },
        "exact_checks": {
            "base_orders": "2..10",
            "all_base_vertices": True,
            "leaf_bundle_sizes": "1..5",
            "recurrence_checks": recurrence_checks,
            "q3_envelope_rank_checks": envelope_checks,
            "q3_envelope_failures": envelope_failures,
            "q4_envelope_first_failure": q4_envelope_failure,
        },
        "simple_anchor_dominance_candidates": {
            name: {
                "survives_test": not rows,
                "first_counterexample": rows[0] if rows else None,
            }
            for name, rows in candidates.items()
        },
        "two_block_mixture_candidates": {
            name: {
                "survives_test": row is None,
                "first_counterexample": row,
            }
            for name, row in component_candidates.items()
        },
        "S18_guard": {
            "q3": str(profile18[3]),
            "adjacent_failures": adjacent,
            "q3_envelope_survives_all_supported_ranks": all(
                ratio <= profile18[3]
                for rank, ratio in profile18.items()
                if rank >= 4
            ),
        },
        "scope_warning": (
            "The recurrence is an exact identity. The finite checks are diagnostic only. "
            "They do not prove that the q3 envelope is preserved by terminal extension "
            "or that it holds for every tree."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("RECURRENCE_CHECKS", recurrence_checks, "ENVELOPE_CHECKS", envelope_checks)
    for name, row in payload["simple_anchor_dominance_candidates"].items():
        print(name, "PASS" if row["survives_test"] else "FAIL", row["first_counterexample"])
    for name, row in payload["two_block_mixture_candidates"].items():
        print(name, "PASS" if row["survives_test"] else "FAIL", row["first_counterexample"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
