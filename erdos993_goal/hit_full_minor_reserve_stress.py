#!/usr/bin/env python3
"""Exact stress test for two full Toeplitz-minor reserves on planted HIT trees.

For a polynomial P(x) = sum p_k x^k, put

    M_P(m,n) = p_m p_n - p_{m+1} p_{n-1}       (m >= n).

At a rooted vertex v, let

    E_v = product(T_c),  J_v = product(E_c),  T_v = E_v + x J_v,

where c ranges over the children.  The primary candidate full reserve is

    M_{T_v}(m,n) >= M_{J_v}(m-1,n-1)           (MD)

for every m >= n.  A companion candidate at every internal state is

    M_{E_v}(m,n) >= M_{J_v}(m,n)               (ED)

for every m >= n.  The diagonal of (MD) is exactly the curvature reserve

    C_{T_v}(n) >= C_{J_v}(n-1)

tested in hit_curvature_reserve_stress.py.  Thus (MD) implies log-concavity
of every T_v, while (ED) supplies extra product-level information that may
be needed to prove (MD) inductively.

This is a falsification program, not a proof.  It exhausts every minimally
leaf-padded homeomorphically irreducible tree whose internal core has at most
``--max-core`` vertices, in every directed planted state and every internal
rooting.  It also includes random extra-leaf padding and a known degree-two
broom as a mandatory negative control.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path
from typing import Iterable

import networkx as nx

from hit_curvature_reserve_stress import (
    State,
    coeff,
    core_generator,
    degree_two_broom,
    make_hit,
    planted_state,
    random_core,
    tree_certificate,
)


def toeplitz_minor(poly: list[int], m: int, n: int) -> int:
    return coeff(poly, m) * coeff(poly, n) - coeff(poly, m + 1) * coeff(
        poly, n - 1
    )


def minor_reserve(state: State, m: int, n: int) -> int:
    return toeplitz_minor(state.t, m, n) - toeplitz_minor(
        state.j, m - 1, n - 1
    )


def internal_minor_reserve(state: State, m: int, n: int) -> int:
    return toeplitz_minor(state.e, m, n) - toeplitz_minor(
        state.j, m, n
    )


def state_records(
    graph: nx.Graph, internal_vertices: Iterable[int]
) -> list[tuple[int, int | None, State]]:
    memo: dict[tuple[int, int | None], State] = {}
    records: list[tuple[int, int | None, State]] = []
    for vertex in graph:
        for parent in graph[vertex]:
            records.append(
                (
                    vertex,
                    parent,
                    planted_state(graph, vertex, parent, memo),
                )
            )
    for root in internal_vertices:
        records.append((root, None, planted_state(graph, root, None, memo)))
    return records


def empty_stats() -> dict:
    return {
        "trees": 0,
        "rootings": 0,
        "states": 0,
        "minor_checks": 0,
        "diagonal_checks": 0,
        "internal_minor_checks": 0,
        "internal_diagonal_checks": 0,
        "one_child_states": 0,
        "minimum_reserve": None,
        "minimum_reserve_context": None,
        "minimum_internal_reserve": None,
        "minimum_internal_reserve_context": None,
    }


def merge_stats(total: dict, part: dict) -> None:
    for key in (
        "trees",
        "rootings",
        "states",
        "minor_checks",
        "diagonal_checks",
        "internal_minor_checks",
        "internal_diagonal_checks",
        "one_child_states",
    ):
        total[key] += part[key]
    value = part["minimum_reserve"]
    if value is not None and (
        total["minimum_reserve"] is None or value < total["minimum_reserve"]
    ):
        total["minimum_reserve"] = value
        total["minimum_reserve_context"] = part["minimum_reserve_context"]
    value = part["minimum_internal_reserve"]
    if value is not None and (
        total["minimum_internal_reserve"] is None
        or value < total["minimum_internal_reserve"]
    ):
        total["minimum_internal_reserve"] = value
        total["minimum_internal_reserve_context"] = part[
            "minimum_internal_reserve_context"
        ]


def check_records(
    graph: nx.Graph,
    records: Iterable[tuple[int, int | None, State]],
    context: dict,
    require_no_one_child: bool,
) -> tuple[dict, dict | None]:
    stats = empty_stats()
    for vertex, parent, state in records:
        stats["states"] += 1
        if state.children == 1:
            stats["one_child_states"] += 1
            if require_no_one_child:
                return stats, {
                    "kind": "unexpected_one_child_state",
                    "context": context,
                    "vertex": vertex,
                    "parent": parent,
                    "tree": tree_certificate(graph),
                }

        # If d=max(deg(T),deg(J)+1), all minors beyond m=d vanish.
        degree_t = len(state.t) - 1
        degree_shift_j = len(state.j)
        upper = max(degree_t, degree_shift_j)
        for m in range(upper + 1):
            for n in range(m + 1):
                stats["minor_checks"] += 1
                if m == n:
                    stats["diagonal_checks"] += 1
                reserve = minor_reserve(state, m, n)
                if (
                    stats["minimum_reserve"] is None
                    or reserve < stats["minimum_reserve"]
                ):
                    stats["minimum_reserve"] = reserve
                    stats["minimum_reserve_context"] = {
                        "context": context,
                        "vertex": vertex,
                        "parent": parent,
                        "children": state.children,
                        "m": m,
                        "n": n,
                    }
                if reserve < 0:
                    return stats, {
                        "kind": "minor_reserve_failure",
                        "context": context,
                        "vertex": vertex,
                        "parent": parent,
                        "children": state.children,
                        "m": m,
                        "n": n,
                        "reserve": reserve,
                        "T_minor": toeplitz_minor(state.t, m, n),
                        "shifted_J_minor": toeplitz_minor(
                            state.j, m - 1, n - 1
                        ),
                        "E": state.e,
                        "J": state.j,
                        "T": state.t,
                        "tree": tree_certificate(graph),
                    }

        if state.children >= 2:
            upper_internal = max(len(state.e) - 1, len(state.j) - 1)
            for m in range(upper_internal + 1):
                for n in range(m + 1):
                    stats["internal_minor_checks"] += 1
                    if m == n:
                        stats["internal_diagonal_checks"] += 1
                    reserve = internal_minor_reserve(state, m, n)
                    if (
                        stats["minimum_internal_reserve"] is None
                        or reserve < stats["minimum_internal_reserve"]
                    ):
                        stats["minimum_internal_reserve"] = reserve
                        stats["minimum_internal_reserve_context"] = {
                            "context": context,
                            "vertex": vertex,
                            "parent": parent,
                            "children": state.children,
                            "m": m,
                            "n": n,
                        }
                    if reserve < 0:
                        return stats, {
                            "kind": "internal_minor_reserve_failure",
                            "context": context,
                            "vertex": vertex,
                            "parent": parent,
                            "children": state.children,
                            "m": m,
                            "n": n,
                            "reserve": reserve,
                            "E_minor": toeplitz_minor(state.e, m, n),
                            "J_minor": toeplitz_minor(state.j, m, n),
                            "E": state.e,
                            "J": state.j,
                            "T": state.t,
                            "tree": tree_certificate(graph),
                        }
    return stats, None


def exhaustive_lane(max_core: int) -> tuple[dict, dict | None]:
    total = empty_stats()
    per_core_order = []
    for core_order in range(1, max_core + 1):
        order_stats = empty_stats()
        for core_index, core in enumerate(core_generator(core_order)):
            graph, leaves = make_hit(core)
            context = {
                "lane": "exhaustive_minimal_hit",
                "core_order": core_order,
                "core_index": core_index,
                "leaf_counts": leaves,
            }
            records = state_records(graph, range(core_order))
            part, failure = check_records(
                graph, records, context, require_no_one_child=True
            )
            part["trees"] = 1
            part["rootings"] = core_order
            merge_stats(order_stats, part)
            if failure is not None:
                merge_stats(total, order_stats)
                return {
                    "summary": total,
                    "per_core_order": per_core_order
                    + [{"core_order": core_order, **order_stats}],
                }, failure
        merge_stats(total, order_stats)
        per_core_order.append({"core_order": core_order, **order_stats})
        print(
            f"exhaustive h={core_order}: trees={order_stats['trees']:,} "
            f"states={order_stats['states']:,} "
            f"MD={order_stats['minor_checks']:,} "
            f"ED={order_stats['internal_minor_checks']:,}",
            flush=True,
        )
    return {"summary": total, "per_core_order": per_core_order}, None


def random_lane(
    count: int, max_core: int, max_extra: int, seed: int
) -> tuple[dict, dict | None]:
    rng = random.Random(seed)
    total = empty_stats()
    for trial in range(count):
        core_order = rng.randint(1, max_core)
        core = random_core(rng, core_order)
        extras = [rng.randint(0, max_extra) for _ in range(core_order)]
        graph, leaves = make_hit(core, extras)
        context = {
            "lane": "random_hit",
            "trial": trial,
            "core_order": core_order,
            "leaf_counts": leaves,
            "seed": seed,
        }
        part, failure = check_records(
            graph,
            state_records(graph, range(core_order)),
            context,
            require_no_one_child=True,
        )
        part["trees"] = 1
        part["rootings"] = core_order
        merge_stats(total, part)
        if failure is not None:
            return total, failure
        if (trial + 1) % 250 == 0:
            print(
                f"random {trial + 1:,}/{count:,}: "
                f"MD={total['minor_checks']:,} "
                f"ED={total['internal_minor_checks']:,}",
                flush=True,
            )
    return total, None


def negative_control() -> dict:
    graph = degree_two_broom()
    memo: dict[tuple[int, int | None], State] = {}
    records = [
        (vertex, None, planted_state(graph, vertex, None, memo))
        for vertex in graph
    ]
    stats, failure = check_records(
        graph,
        records,
        {"lane": "degree_two_broom_control"},
        require_no_one_child=False,
    )
    stats["trees"] = 1
    stats["rootings"] = graph.number_of_nodes()
    return {
        "tree": tree_certificate(graph),
        "summary": stats,
        "failure_count": int(failure is not None),
        "first_failure": failure,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-core", type=int, default=12)
    parser.add_argument("--random", type=int, default=1000)
    parser.add_argument("--random-max-core", type=int, default=45)
    parser.add_argument("--max-extra-leaves", type=int, default=4)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    exhaustive, failure = exhaustive_lane(args.max_core)
    random_result = None
    if failure is None and args.random:
        random_result, failure = random_lane(
            args.random,
            args.random_max_core,
            args.max_extra_leaves,
            args.seed,
        )
    control = negative_control()
    if control["failure_count"] != 1:
        raise AssertionError("mandatory degree-two negative control did not fail")

    report = {
        "claim_tested": (
            "For every valid planted state of a homeomorphically irreducible "
            "tree, M_T(m,n) >= M_J(m-1,n-1) for all m >= n; and at every "
            "internal state, M_E(m,n) >= M_J(m,n) for all m >= n."
        ),
        "exact_arithmetic": True,
        "parameters": vars(args) | {"output": str(args.output)},
        "elapsed_seconds": time.time() - started,
        "exhaustive_minimal_hit": exhaustive,
        "random_hit": random_result,
        "degree_two_negative_control": control,
        "hit_failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "failure": failure}, indent=2))


if __name__ == "__main__":
    main()
