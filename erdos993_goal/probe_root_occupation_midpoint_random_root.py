#!/usr/bin/env python3
"""Random exact probe of the sharp root-occupation midpoint inequality.

For a forest B with one marked root in every component, let C=B-S and
q_j=c_j/b_j.  The candidate used in the pendant-variance bridge is

    8 q_j >= 3(q_{j-1}+q_{j+1})

whenever k=j+1 lies in the required two-thirds prefix
k < floor((2 alpha(B)+3)/3).  All comparisons below are cleared integer
identities; floating point is used only for the human-readable ratio.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(max(len(left), len(right)))
    ]


def multiply(left: list[int], right: list[int]) -> list[int]:
    answer = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            answer[i + j] += a * b
    return answer


def independence_polynomial(forest: nx.Graph) -> list[int]:
    if forest.number_of_nodes() == 0:
        return [1]
    assert nx.is_forest(forest)
    seen: set[int] = set()
    total = [1]

    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in forest.neighbors(vertex):
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, included

    for vertex in forest:
        if vertex in seen:
            continue
        excluded, included = visit(vertex, None)
        total = multiply(total, add(excluded, included))
    return total


def positive_composition(total: int, parts: int, rng: random.Random) -> list[int]:
    if parts == 1:
        return [total]
    cuts = sorted(rng.sample(range(1, total), parts - 1))
    return [right - left for left, right in zip([0, *cuts], [*cuts, total])]


def random_tree(order: int, rng: random.Random) -> nx.Graph:
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        return graph
    prufer = [rng.randrange(order) for _ in range(order - 2)]
    return nx.from_prufer_sequence(prufer)


def random_rooted_forest(
    order: int, max_components: int, mark_probability: float, rng: random.Random
) -> tuple[nx.Graph, list[int], list[int]]:
    component_count = rng.randint(1, min(order, max_components))
    sizes = positive_composition(order, component_count, rng)
    forest = nx.Graph()
    roots: list[int] = []
    offset = 0
    for size in sizes:
        component = nx.relabel_nodes(
            random_tree(size, rng), {vertex: vertex + offset for vertex in range(size)}
        )
        forest = nx.compose(forest, component)
        if rng.random() < mark_probability:
            roots.append(offset + rng.randrange(size))
        offset += size
    return forest, roots, sizes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--min-order", type=int, default=4)
    parser.add_argument("--max-order", type=int, default=90)
    parser.add_argument("--max-components", type=int, default=12)
    parser.add_argument("--mark-probability", type=float, default=1.0)
    parser.add_argument("--min-j", type=int, default=1)
    parser.add_argument("--seed", type=int, default=993_20260829)
    parser.add_argument("--constant-numerator", type=int, default=3)
    parser.add_argument("--constant-denominator", type=int, default=4)
    parser.add_argument(
        "--comparison",
        choices=("average", "next", "previous", "next_rank"),
        default="average",
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument("--fail-fast", action="store_true")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = 0
    outside_prefix_failures = 0
    first_outside_prefix_failure = None
    minimum_ratio: Fraction | None = None
    minimum_witness: dict[str, object] | None = None
    failure: dict[str, object] | None = None
    failure_count = 0

    for sample in range(args.samples):
        order = rng.randint(args.min_order, args.max_order)
        forest, roots, sizes = random_rooted_forest(
            order, args.max_components, args.mark_probability, rng
        )
        b = independence_polynomial(forest)
        root_deleted = forest.copy()
        root_deleted.remove_nodes_from(roots)
        c = independence_polynomial(root_deleted)
        alpha = len(b) - 1
        cutoff = (2 * alpha + 3) // 3

        for j in range(args.min_j, alpha):
            bjm1, bj, bjp1 = b[j - 1], b[j], b[j + 1]
            cjm1 = c[j - 1] if j - 1 < len(c) else 0
            cj = c[j] if j < len(c) else 0
            cjp1 = c[j + 1] if j + 1 < len(c) else 0
            if args.comparison == "average":
                left = (
                    2
                    * args.constant_denominator
                    * cj
                    * bjm1
                    * bjp1
                )
                right = args.constant_numerator * (
                    cjm1 * bj * bjp1 + cjp1 * bj * bjm1
                )
            elif args.comparison == "next":
                left = args.constant_denominator * cj * bjp1
                right = args.constant_numerator * cjp1 * bj
            elif args.comparison == "next_rank":
                left = (j + 2) * cj * bjp1
                right = (j + 1) * cjp1 * bj
            else:
                left = args.constant_denominator * cj * bjm1
                right = args.constant_numerator * cjm1 * bj
            in_prefix = j + 1 < cutoff
            if not in_prefix:
                if left < right:
                    outside_prefix_failures += 1
                    if first_outside_prefix_failure is None:
                        first_outside_prefix_failure = {
                            "sample": sample,
                            "order": order,
                            "component_sizes": sizes,
                            "graph6_components": [
                                nx.to_graph6_bytes(
                                    forest.subgraph(component).copy(), header=False
                                ).decode().strip()
                                for component in nx.connected_components(forest)
                            ],
                            "roots": roots,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "j": j,
                            "b_window": [b[j], b[j + 1]],
                            "c_window": [c[j], c[j + 1]],
                            "left": left,
                            "right": right,
                        }
                continue
            checks += 1
            neighbor_sum_num = cjm1 * bjp1 + cjp1 * bjm1
            neighbor_sum_den = bjm1 * bjp1
            if args.comparison == "average" and neighbor_sum_num:
                ratio = Fraction(2 * cj * neighbor_sum_den, bj * neighbor_sum_num)
            elif args.comparison in ("next", "next_rank") and cjp1:
                ratio = Fraction(cj * bjp1, cjp1 * bj)
            elif args.comparison == "previous" and cjm1:
                ratio = Fraction(cj * bjm1, cjm1 * bj)
            else:
                ratio = None
            if ratio is not None:
                if minimum_ratio is None or ratio < minimum_ratio:
                    minimum_ratio = ratio
                    minimum_witness = {
                        "sample": sample,
                        "order": order,
                        "component_sizes": sizes,
                        "roots": roots,
                        "j": j,
                        "alpha": alpha,
                        "cutoff": cutoff,
                        "ratio": [ratio.numerator, ratio.denominator],
                        "b_window": [bjm1, bj, bjp1],
                        "c_window": [cjm1, cj, cjp1],
                        "graph6_components": [
                            nx.to_graph6_bytes(
                                forest.subgraph(component).copy(), header=False
                            ).decode().strip()
                            for component in nx.connected_components(forest)
                        ],
                    }
            if left < right:
                failure_count += 1
                current_failure = {
                    "sample": sample,
                    "order": order,
                    "component_sizes": sizes,
                    "roots": roots,
                    "j": j,
                    "alpha": alpha,
                    "cutoff": cutoff,
                    "left": left,
                    "right": right,
                    "b_window": [bjm1, bj, bjp1],
                    "c_window": [cjm1, cj, cjp1],
                }
                if failure is None:
                    failure = current_failure
                if args.fail_fast:
                    break
        if failure is not None and args.fail_fast:
            break

    result = {
        "status": (
            "PASS_EXACT_RANDOM_ROOT_OCCUPATION_MIDPOINT_PREFIX"
            if failure is None
            else "FAIL_EXACT_RANDOM_ROOT_OCCUPATION_MIDPOINT_PREFIX"
        ),
        "seed": args.seed,
        "candidate_constant": [
            args.constant_numerator,
            args.constant_denominator,
        ],
        "comparison": args.comparison,
        "requested_samples": args.samples,
        "completed_samples": sample + 1,
        "prefix_checks": checks,
        "outside_prefix_failures": outside_prefix_failures,
        "first_outside_prefix_failure": first_outside_prefix_failure,
        "prefix_failure_count": failure_count,
        "minimum_ratio_qj_over_neighbor_average": (
            [minimum_ratio.numerator, minimum_ratio.denominator]
            if minimum_ratio is not None
            else None
        ),
        "minimum_witness": minimum_witness,
        "failure": failure,
    }
    rendered = json.dumps(result, indent=2, sort_keys=True)
    if args.output is not None:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    if failure is not None:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
