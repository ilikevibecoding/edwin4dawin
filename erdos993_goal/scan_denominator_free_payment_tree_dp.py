#!/usr/bin/env python3
"""All-rank tree DP audit of the denominator-free component payment.

For every independent set K, the DP tracks the residual-forest
statistics

    h_K = |V(T-N[K])|,  e_K = |E(T-N[K])|.

At each rank it sums 1, h, h^2, h^3, e, and h*e, which is enough to
evaluate the denominator-free payment exactly.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from itertools import combinations
from pathlib import Path

import networkx as nx

# count, sum(h), sum(h^2), sum(h^3), sum(e), sum(h*e)
Moment = tuple[int, int, int, int, int, int]
Jet = dict[int, Moment]


def jet_unit() -> Jet:
    return {0: (1, 0, 0, 0, 0, 0)}


def jet_add(left: Jet, right: Jet) -> Jet:
    result = dict(left)
    for rank, values in right.items():
        old = result.get(rank, (0, 0, 0, 0, 0, 0))
        result[rank] = tuple(
            old[index] + values[index] for index in range(6)
        )
    return {rank: values for rank, values in result.items() if values[0]}


def jet_subtract(left: Jet, right: Jet) -> Jet:
    result = dict(left)
    for rank, values in right.items():
        old = result.get(rank, (0, 0, 0, 0, 0, 0))
        result[rank] = tuple(
            old[index] - values[index] for index in range(6)
        )
    for values in result.values():
        if any(value < 0 for value in values):
            raise AssertionError(("negative jet subtraction", values))
    return {rank: values for rank, values in result.items() if values[0]}


def multiply_moments(left: Moment, right: Moment) -> Moment:
    wa, ha, h2a, h3a, ea, hea = left
    wb, hb, h2b, h3b, eb, heb = right
    return (
        wa * wb,
        ha * wb + wa * hb,
        h2a * wb + wa * h2b + 2 * ha * hb,
        (
            h3a * wb
            + wa * h3b
            + 3 * h2a * hb
            + 3 * ha * h2b
        ),
        ea * wb + wa * eb,
        hea * wb + wa * heb + ha * eb + ea * hb,
    )


def jet_multiply(left: Jet, right: Jet) -> Jet:
    result: Jet = {}
    for left_rank, left_values in left.items():
        for right_rank, right_values in right.items():
            rank = left_rank + right_rank
            values = multiply_moments(left_values, right_values)
            old = result.get(rank, (0, 0, 0, 0, 0, 0))
            result[rank] = tuple(
                old[index] + values[index] for index in range(6)
            )
    return result


def jet_shift_rank(jet: Jet, amount: int = 1) -> Jet:
    return {rank + amount: values for rank, values in jet.items()}


def jet_shift_h(jet: Jet, amount: int = 1) -> Jet:
    result: Jet = {}
    for rank, (w, h, h2, h3, e, he) in jet.items():
        result[rank] = (
            w,
            h + amount * w,
            h2 + 2 * amount * h + amount**2 * w,
            (
                h3
                + 3 * amount * h2
                + 3 * amount**2 * h
                + amount**3 * w
            ),
            e,
            he + amount * e,
        )
    return result


def jet_shift_e(jet: Jet, amount: int = 1) -> Jet:
    result: Jet = {}
    for rank, (w, h, h2, h3, e, he) in jet.items():
        result[rank] = (
            w,
            h,
            h2,
            h3,
            e + amount * w,
            he + amount * h,
        )
    return result


def tree_moment_jet(tree: nx.Graph) -> Jet:
    if not nx.is_tree(tree):
        raise ValueError("input must be a tree")
    root = next(iter(tree))
    parent = {root: None}
    order = [root]
    for vertex in order:
        for neighbor in tree[vertex]:
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            order.append(neighbor)

    # Each p0 entry has root states S, D, R.  A p1 message has the
    # root forced unselected and dominated by its selected parent.
    p0: dict[int, dict[str, Jet]] = {}
    p1: dict[int, Jet] = {}
    for vertex in reversed(order):
        children = [
            neighbor
            for neighbor in tree[vertex]
            if parent.get(neighbor) == vertex
        ]

        selected = jet_shift_rank(jet_unit())
        for child in children:
            selected = jet_multiply(selected, p1[child])

        total = jet_unit()
        no_selected_child = jet_unit()
        no_selected_child_with_edges = jet_unit()
        for child in children:
            states = p0[child]
            child_total = jet_add(
                states["S"], jet_add(states["D"], states["R"])
            )
            child_no_selected = jet_add(
                states["D"], states["R"]
            )
            child_no_selected_with_edge = jet_add(
                states["D"], jet_shift_e(states["R"])
            )
            total = jet_multiply(total, child_total)
            no_selected_child = jet_multiply(
                no_selected_child, child_no_selected
            )
            no_selected_child_with_edges = jet_multiply(
                no_selected_child_with_edges,
                child_no_selected_with_edge,
            )

        dominated = jet_subtract(total, no_selected_child)
        residual = jet_shift_h(no_selected_child_with_edges)
        p0[vertex] = {
            "S": selected,
            "D": dominated,
            "R": residual,
        }
        p1[vertex] = total

    states = p0[root]
    return jet_add(states["S"], jet_add(states["D"], states["R"]))


def payment_records(tree: nx.Graph) -> list[dict]:
    jet = tree_moment_jet(tree)
    records = []
    for q, (count, s, h2, h3, e0, he1) in sorted(jet.items()):
        if q < 1 or s == 0:
            continue
        c0 = s - e0
        c1 = h2 - he1
        payment = (
            (q - 1) * s * s
            - s * h3
            - 3 * s * c1
            + h2 * h2
            + 4 * h2 * c0
        )
        records.append(
            {
                "rank_q": q,
                "independent_sets": count,
                "mass_S": s,
                "H2": h2,
                "H3": h3,
                "C0": c0,
                "C1": c1,
                "payment": payment,
                "normalized_payment": Fraction(payment, s * s),
            }
        )
    return records


def brute_moment_jet(tree: nx.Graph) -> Jet:
    """Small-order independent implementation used as a self-check."""
    order = len(tree)
    adjacency = [0] * order
    closed = [0] * order
    edge_masks = []
    for left, right in tree.edges():
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
        edge_masks.append((1 << left) | (1 << right))
    for vertex in range(order):
        closed[vertex] = adjacency[vertex] | (1 << vertex)
    all_mask = (1 << order) - 1
    result: Jet = {}
    for rank in range(order + 1):
        count = h1 = h2 = h3 = e1 = he = 0
        for vertices in combinations(range(order), rank):
            mask = 0
            forbidden = 0
            valid = True
            for vertex in vertices:
                if adjacency[vertex] & mask:
                    valid = False
                    break
                mask |= 1 << vertex
                forbidden |= closed[vertex]
            if not valid:
                continue
            residual = all_mask & ~forbidden
            h = residual.bit_count()
            e = sum(
                edge & residual == edge for edge in edge_masks
            )
            count += 1
            h1 += h
            h2 += h * h
            h3 += h * h * h
            e1 += e
            he += h * e
        if count:
            result[rank] = (count, h1, h2, h3, e1, he)
    return result


def self_check() -> int:
    rng = random.Random(993207)
    checked = 0
    for order in range(2, 11):
        for _ in range(4):
            tree = (
                nx.path_graph(2)
                if order == 2
                else nx.from_prufer_sequence(
                    [
                        rng.randrange(order)
                        for _ in range(order - 2)
                    ]
                )
            )
            dynamic = tree_moment_jet(tree)
            brute = brute_moment_jet(tree)
            if dynamic != brute:
                raise AssertionError(
                    ("tree DP/brute mismatch", order, dynamic, brute)
                )
            checked += 1
    return checked


def random_caterpillar(rng: random.Random, hubs: int, maximum: int):
    tree = nx.path_graph(hubs)
    next_vertex = hubs
    loads = []
    for hub in range(hubs):
        leaves = rng.randrange(maximum + 1)
        loads.append(leaves)
        for _ in range(leaves):
            tree.add_edge(hub, next_vertex)
            next_vertex += 1
    return tree, loads


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--random-count", type=int, default=200)
    parser.add_argument("--minimum-order", type=int, default=20)
    parser.add_argument("--maximum-order", type=int, default=100)
    parser.add_argument("--caterpillar-count", type=int, default=200)
    parser.add_argument("--maximum-hubs", type=int, default=10)
    parser.add_argument("--maximum-hub-leaves", type=int, default=30)
    parser.add_argument(
        "--exhaustive-maximum-order", type=int, default=0
    )
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    self_checked_trees = self_check()
    rng = random.Random(args.seed)
    checked_trees = checked_ranks = failures = 0
    rank_floor_failures = 0
    component_moment_checks = component_moment_failures = 0
    scalar_cauchy_checks = scalar_cauchy_failures = 0
    best = None
    best_rank_floor = None
    best_component_moment = None
    best_scalar_cauchy = None
    failure_witness = None

    def audit(tree: nx.Graph, family: str, parameters: dict) -> None:
        nonlocal checked_trees, checked_ranks, failures
        nonlocal rank_floor_failures
        nonlocal component_moment_checks, component_moment_failures
        nonlocal scalar_cauchy_checks, scalar_cauchy_failures
        nonlocal best, best_rank_floor
        nonlocal best_component_moment, best_scalar_cauchy
        nonlocal failure_witness
        checked_trees += 1
        code = (
            nx.to_graph6_bytes(tree, header=False)
            .decode("ascii")
            .strip()
        )
        for record in payment_records(tree):
            checked_ranks += 1
            witness = {
                "family": family,
                "parameters": parameters,
                "tree_order": len(tree),
                "graph6": code,
                "degree_sequence": sorted(
                    (degree for _, degree in tree.degree()),
                    reverse=True,
                ),
                **{
                    key: (
                        str(value)
                        if isinstance(value, Fraction)
                        else value
                    )
                    for key, value in record.items()
                },
            }
            normalized = record["normalized_payment"]
            if best is None or normalized < best[0]:
                best = (normalized, witness)
            if record["payment"] < 0:
                failures += 1
                if failure_witness is None:
                    failure_witness = witness
            rank_floor_gap = (
                record["payment"]
                - record["rank_q"] * record["mass_S"] ** 2
            )
            rank_floor_normalized = Fraction(
                rank_floor_gap, record["mass_S"] ** 2
            )
            if rank_floor_gap < 0:
                rank_floor_failures += 1
            if (
                best_rank_floor is None
                or rank_floor_normalized < best_rank_floor[0]
            ):
                best_rank_floor = (
                    rank_floor_normalized,
                    witness,
                )
            if record["rank_q"] >= 2:
                component_moment_checks += 1
                s = record["mass_S"]
                variance_numerator = (
                    s * record["H3"] - record["H2"] ** 2
                )
                component_moment = (
                    2 * s * record["C1"]
                    - 3 * variance_numerator
                )
                component_normalized = Fraction(
                    component_moment, s * s
                )
                if component_moment < 0:
                    component_moment_failures += 1
                if (
                    best_component_moment is None
                    or component_normalized
                    < best_component_moment[0]
                ):
                    best_component_moment = (
                        component_normalized,
                        witness,
                    )

                scalar_numerator = (
                    (record["rank_q"] - 1) * s * s
                    + s * record["C1"]
                    - variance_numerator
                )
                scalar_square_slack = (
                    scalar_numerator**2
                    - 4 * variance_numerator * s * s
                )
                scalar_cauchy_checks += 1
                scalar_valid = (
                    scalar_numerator >= 0
                    and scalar_square_slack >= 0
                )
                if not scalar_valid:
                    scalar_cauchy_failures += 1
                scalar_normalized = Fraction(
                    scalar_square_slack, s**4
                )
                if (
                    best_scalar_cauchy is None
                    or scalar_normalized < best_scalar_cauchy[0]
                ):
                    best_scalar_cauchy = (
                        scalar_normalized,
                        {
                            **witness,
                            "scalar_numerator": scalar_numerator,
                            "variance_numerator": (
                                variance_numerator
                            ),
                        },
                    )

    for order in range(
        args.minimum_order,
        args.maximum_order + 1,
        max(1, (args.maximum_order - args.minimum_order) // 9),
    ):
        audit(nx.path_graph(order), "path", {"order": order})
        audit(nx.star_graph(order - 1), "star", {"order": order})

    for index in range(args.random_count):
        order = rng.randrange(
            args.minimum_order, args.maximum_order + 1
        )
        sequence = [rng.randrange(order) for _ in range(order - 2)]
        audit(
            nx.from_prufer_sequence(sequence),
            "random_prufer",
            {"index": index, "order": order},
        )

    for index in range(args.caterpillar_count):
        hubs = rng.randrange(2, args.maximum_hubs + 1)
        tree, loads = random_caterpillar(
            rng, hubs, args.maximum_hub_leaves
        )
        audit(
            tree,
            "random_caterpillar",
            {"index": index, "leaf_loads": loads},
        )

    for order in range(1, args.exhaustive_maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for index, tree in enumerate(trees):
            audit(
                tree,
                "exhaustive_unlabeled_tree",
                {"order": order, "index": index},
            )
        print(
            f"exhaustive_order={order} "
            f"checked_trees={checked_trees} "
            f"checked_ranks={checked_ranks} failures={failures}",
            flush=True,
        )

    if (
        best is None
        or best_rank_floor is None
        or best_component_moment is None
        or best_scalar_cauchy is None
    ):
        raise AssertionError("no positive-mass rank checked")
    report = {
        "status": (
            "NO_DENOMINATOR_FREE_PAYMENT_FAILURE_FOUND"
            if failures == 0
            else "DENOMINATOR_FREE_PAYMENT_FAILURE_FOUND"
        ),
        "scope": (
            "Exact all-rank tree-DP audit over the stated structured "
            "and pseudorandom families; not a general proof."
        ),
        "seed": args.seed,
        "brute_force_self_checked_trees": self_checked_trees,
        "checked_trees": checked_trees,
        "checked_ranks": checked_ranks,
        "failures": failures,
        "rank_floor_failures": rank_floor_failures,
        "component_moment_checks_q_ge_2": component_moment_checks,
        "component_moment_failures": component_moment_failures,
        "scalar_cauchy_checks_q_ge_2": scalar_cauchy_checks,
        "scalar_cauchy_failures": scalar_cauchy_failures,
        "minimum_normalized_payment": {
            "exact": str(best[0]),
            "decimal": float(best[0]),
            **best[1],
        },
        "minimum_normalized_rank_floor_gap": {
            "exact": str(best_rank_floor[0]),
            "decimal": float(best_rank_floor[0]),
            **best_rank_floor[1],
        },
        "minimum_normalized_component_moment_slack": {
            "exact": str(best_component_moment[0]),
            "decimal": float(best_component_moment[0]),
            **best_component_moment[1],
        },
        "minimum_normalized_scalar_cauchy_square_slack": {
            "exact": str(best_scalar_cauchy[0]),
            "decimal": float(best_scalar_cauchy[0]),
            **best_scalar_cauchy[1],
        },
        "first_failure": failure_witness,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
