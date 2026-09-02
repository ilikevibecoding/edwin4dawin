#!/usr/bin/env python3
"""Exact moment-DP probe for the all-rank forest covariance candidate.

For an independent r-set S of a tree, let x_j(S) be the number of vertices
outside S with exactly j neighbours in S.  The candidate

    Cov_{S in I_r}(x_0(S), x_1(S)) <= 0

is a sufficient (but not necessary) condition for the token-sliding ratio
s_r/(r i_r) to decrease with r.  This program computes the four exact
moments count, sum(x_0), sum(x_1), and sum(x_0*x_1) by a rooted-tree DP.
It independently validates that DP by literal subset enumeration before
running exhaustive and random searches.  A finite PASS is evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path
import random
import subprocess
import sys

import networkx as nx


ROOT = Path(__file__).resolve().parent
Record = tuple[int, int, int, int]  # count, sum x0, sum x1, sum x0*x1
Polynomial = list[Record | None]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_record(left: Record | None, right: Record | None) -> Record | None:
    if left is None:
        return right
    if right is None:
        return left
    return tuple(a + b for a, b in zip(left, right))  # type: ignore[return-value]


def multiply_record(left: Record, right: Record) -> Record:
    n1, a1, b1, c1 = left
    n2, a2, b2, c2 = right
    return (
        n1 * n2,
        a1 * n2 + n1 * a2,
        b1 * n2 + n1 * b2,
        c1 * n2 + n1 * c2 + a1 * b2 + b1 * a2,
    )


def mark_record(record: Record, add_x0: int, add_x1: int) -> Record:
    count, sum_x0, sum_x1, sum_product = record
    return (
        count,
        sum_x0 + add_x0 * count,
        sum_x1 + add_x1 * count,
        sum_product
        + add_x0 * sum_x1
        + add_x1 * sum_x0
        + add_x0 * add_x1 * count,
    )


def zero_polynomial(cap: int) -> Polynomial:
    return [None] * (cap + 1)


def singleton_polynomial(rank: int, cap: int) -> Polynomial:
    out = zero_polynomial(cap)
    if rank <= cap:
        out[rank] = (1, 0, 0, 0)
    return out


def add_polynomials(left: Polynomial, right: Polynomial) -> Polynomial:
    assert len(left) == len(right)
    return [add_record(a, b) for a, b in zip(left, right)]


def multiply_polynomials(left: Polynomial, right: Polynomial, cap: int) -> Polynomial:
    out = zero_polynomial(cap)
    for left_rank, left_record in enumerate(left):
        if left_record is None:
            continue
        for right_rank, right_record in enumerate(right[: cap + 1 - left_rank]):
            if right_record is None:
                continue
            rank = left_rank + right_rank
            out[rank] = add_record(
                out[rank], multiply_record(left_record, right_record)
            )
    return out


def mark_polynomial(poly: Polynomial, add_x0: int, add_x1: int) -> Polynomial:
    return [
        None if record is None else mark_record(record, add_x0, add_x1)
        for record in poly
    ]


def exact_moments(tree: nx.Graph, cap: int) -> Polynomial:
    """Return exact fixed-rank moments of x0 and x1 for a tree."""
    n = tree.number_of_nodes()
    if n == 0:
        out = zero_polynomial(cap)
        out[0] = (1, 0, 0, 0)
        return out
    mapping = {vertex: index for index, vertex in enumerate(tree.nodes())}
    adjacency = [[] for _ in range(n)]
    for raw_left, raw_right in tree.edges():
        left, right = mapping[raw_left], mapping[raw_right]
        adjacency[left].append(right)
        adjacency[right].append(left)

    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if neighbor == parent[vertex]:
                continue
            assert parent[neighbor] == -2, "input must be a tree"
            parent[neighbor] = vertex
            order.append(neighbor)
    assert len(order) == n
    children = [[] for _ in range(n)]
    for vertex in order[1:]:
        children[parent[vertex]].append(vertex)

    # dp[v][parent_selected, vertex_selected]
    dp: list[dict[tuple[int, int], Polynomial]] = [dict() for _ in range(n)]
    for vertex in reversed(order):
        for selected in (0, 1):
            by_selected_children = {0: singleton_polynomial(selected, cap)}
            for child in children[vertex]:
                updated: dict[int, Polynomial] = {}
                allowed_child_states = (0,) if selected else (0, 1)
                for selected_children, prefix in by_selected_children.items():
                    for child_selected in allowed_child_states:
                        suffix = dp[child][(selected, child_selected)]
                        count = min(2, selected_children + child_selected)
                        product = multiply_polynomials(prefix, suffix, cap)
                        updated[count] = (
                            product
                            if count not in updated
                            else add_polynomials(updated[count], product)
                        )
                by_selected_children = updated

            for parent_selected in (0, 1):
                if selected and parent_selected:
                    dp[vertex][(parent_selected, selected)] = zero_polynomial(cap)
                    continue
                total = zero_polynomial(cap)
                for selected_children, poly in by_selected_children.items():
                    selected_neighbors = parent_selected + selected_children
                    add_x0 = int(not selected and selected_neighbors == 0)
                    add_x1 = int(not selected and selected_neighbors == 1)
                    total = add_polynomials(
                        total, mark_polynomial(poly, add_x0, add_x1)
                    )
                dp[vertex][(parent_selected, selected)] = total

    return add_polynomials(dp[0][(0, 0)], dp[0][(0, 1)])


def literal_moments(tree: nx.Graph, cap: int) -> Polynomial:
    vertices = list(tree.nodes())
    adjacency = {vertex: set(tree.neighbors(vertex)) for vertex in vertices}
    out = zero_polynomial(cap)
    for rank in range(min(cap, len(vertices)) + 1):
        for chosen_tuple in itertools.combinations(vertices, rank):
            chosen = set(chosen_tuple)
            if any(left in chosen and right in chosen for left, right in tree.edges()):
                continue
            x0 = 0
            x1 = 0
            for vertex in vertices:
                if vertex in chosen:
                    continue
                selected_neighbors = len(adjacency[vertex] & chosen)
                x0 += selected_neighbors == 0
                x1 += selected_neighbors == 1
            out[rank] = add_record(out[rank], (1, x0, x1, x0 * x1))
    return out


def row_margins(tree: nx.Graph, moments: Polynomial) -> list[dict]:
    n = tree.number_of_nodes()
    w = math.comb(n - 2, 2) if n >= 4 else 0
    surplus = sum(
        math.comb(tree.degree(vertex) - 1, 2) for vertex in tree.nodes()
    )
    m2 = w - surplus
    rows = []
    previous = None
    for rank, record in enumerate(moments):
        if rank < 1 or record is None or record[0] == 0:
            continue
        count, sum_x0, sum_x1, sum_product = record
        covariance_margin = sum_x0 * sum_x1 - count * sum_product
        averaged_margin_twice = 2 * rank * m2 * count - w * sum_x1
        ratio_cross = None
        if previous is not None:
            lower_rank, lower_count, lower_sum_x1 = previous
            ratio_cross = (
                lower_sum_x1 * rank * count
                - sum_x1 * lower_rank * lower_count
            )
        rows.append(
            {
                "rank": rank,
                "count": count,
                "sum_x0": sum_x0,
                "sum_x1": sum_x1,
                "sum_x0_x1": sum_product,
                "covariance_margin": covariance_margin,
                "averaged_margin_twice": averaged_margin_twice,
                "ratio_cross_from_previous": ratio_cross,
            }
        )
        previous = (rank, count, sum_x1)
    return rows


def graph6(tree: nx.Graph) -> str:
    return nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()


def validate_dp(maximum_order: int, cap: int) -> dict:
    trees = 0
    rows = 0
    for n in range(2, maximum_order + 1):
        for tree in nx.nonisomorphic_trees(n):
            exact = exact_moments(tree, min(cap, n))
            literal = literal_moments(tree, min(cap, n))
            assert exact == literal, (n, graph6(tree), exact, literal)
            trees += 1
            rows += sum(record is not None for record in exact)
    return {"maximum_order": maximum_order, "trees": trees, "rows": rows}


def consume_tree(
    name: str,
    tree: nx.Graph,
    rank_cap: int,
    state: dict,
) -> bool:
    cap = min(rank_cap, tree.number_of_nodes())
    moments = exact_moments(tree, cap)
    state["trees"] += 1
    encoded = graph6(tree)
    failed = False
    for row in row_margins(tree, moments):
        if row["rank"] < 2:
            continue
        state["rows"] += 1
        decorated = {
            "name": name,
            "order": tree.number_of_nodes(),
            "graph6": encoded,
            **row,
        }
        covariance_scale = row["count"] ** 2
        covariance_score = row["covariance_margin"] / covariance_scale
        if (
            state["minimum_covariance_score"] is None
            or covariance_score < state["minimum_covariance_score"]
        ):
            state["minimum_covariance_score"] = covariance_score
            state["minimum_covariance_row"] = decorated
        if row["covariance_margin"] < 0:
            state["covariance_failures"].append(decorated)
            failed = True
        if row["averaged_margin_twice"] < 0:
            state["averaged_failures"].append(decorated)
            failed = True
        if (
            row["ratio_cross_from_previous"] is not None
            and row["ratio_cross_from_previous"] < 0
        ):
            state["ratio_failures"].append(decorated)
            failed = True
    return failed


def empty_state() -> dict:
    return {
        "trees": 0,
        "rows": 0,
        "minimum_covariance_score": None,
        "minimum_covariance_row": None,
        "covariance_failures": [],
        "averaged_failures": [],
        "ratio_failures": [],
    }


def exhaustive_search(
    maximum_order: int, rank_cap: int, geng_path: Path
) -> tuple[dict, list[dict]]:
    state = empty_state()
    orders = []
    for n in range(4, maximum_order + 1):
        count = 0
        process = subprocess.Popen(
            [str(geng_path), "-cq", str(n), f"{n - 1}:{n - 1}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        assert process.stdout is not None
        for raw in process.stdout:
            if not raw.strip():
                continue
            tree = nx.from_graph6_bytes(raw.strip())
            count += 1
            if consume_tree(f"geng-{n}-{count}", tree, rank_cap, state):
                process.kill()
                break
        _, stderr = process.communicate()
        if process.returncode not in (0, -9, 1):
            raise RuntimeError(stderr.decode(errors="replace"))
        orders.append({"order": n, "trees": count})
        print(
            "EXHAUSTIVE",
            n,
            count,
            "ROWS",
            state["rows"],
            "MIN",
            state["minimum_covariance_score"],
            flush=True,
        )
        if any(
            state[key]
            for key in ("covariance_failures", "averaged_failures", "ratio_failures")
        ):
            break
    return state, orders


def random_search(
    cases: int,
    maximum_order: int,
    rank_cap: int,
    seed: int,
) -> dict:
    state = empty_state()
    rng = random.Random(seed)
    for case in range(cases):
        n = rng.randint(4, maximum_order)
        tree = nx.random_labeled_tree(n, seed=rng.randrange(2**63))
        if consume_tree(f"random-{case}", tree, rank_cap, state):
            break
        if (case + 1) % 100 == 0:
            print(
                "RANDOM",
                case + 1,
                "ROWS",
                state["rows"],
                "MIN",
                state["minimum_covariance_score"],
                flush=True,
            )
    return state


def main() -> None:
    sys.setrecursionlimit(10_000)
    parser = argparse.ArgumentParser()
    parser.add_argument("--validation-maximum-order", type=int, default=9)
    parser.add_argument("--exhaustive-maximum-order", type=int, default=16)
    parser.add_argument("--random-cases", type=int, default=1500)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--rank-cap", type=int, default=36)
    parser.add_argument("--seed", type=int, default=993_20260828)
    parser.add_argument(
        "--geng",
        type=Path,
        default=ROOT / "nauty2_8_9" / "geng.exe",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "independent_residual_x0_x1_covariance_probe_root_20260828.json",
    )
    args = parser.parse_args()

    validation = validate_dp(args.validation_maximum_order, args.rank_cap)
    print("VALIDATED", validation, flush=True)
    exhaustive, orders = exhaustive_search(
        args.exhaustive_maximum_order, args.rank_cap, args.geng
    )
    random_state = empty_state()
    if not any(
        exhaustive[key]
        for key in ("covariance_failures", "averaged_failures", "ratio_failures")
    ):
        random_state = random_search(
            args.random_cases,
            args.random_maximum_order,
            args.rank_cap,
            args.seed,
        )

    any_covariance_failure = bool(
        exhaustive["covariance_failures"] or random_state["covariance_failures"]
    )
    any_averaged_failure = bool(
        exhaustive["averaged_failures"] or random_state["averaged_failures"]
    )
    any_ratio_failure = bool(
        exhaustive["ratio_failures"] or random_state["ratio_failures"]
    )
    report = {
        "schema": "independent-residual-x0-x1-covariance-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_X0_X1_COVARIANCE"
            if any_covariance_failure
            else (
                "COUNTEREXAMPLE_EXACT_UNIFORM_TOKEN_SLIDING_SURPLUS"
                if any_averaged_failure
                else (
                    "COUNTEREXAMPLE_EXACT_TOKEN_SLIDING_RATIO_MONOTONICITY"
                    if any_ratio_failure
                    else "PASS_EXACT_FINITE_X0_X1_COVARIANCE_NO_COUNTEREXAMPLE"
                )
            )
        ),
        "candidate": "Cov_{uniform independent r-set}(x0,x1) <= 0",
        "sufficient_for": (
            "s_(r+1)/((r+1)i_(r+1)) <= s_r/(r i_r); this ratio in turn "
            "implies the uniform token-sliding component-surplus candidate"
        ),
        "validation": validation,
        "exhaustive_orders": orders,
        "exhaustive": exhaustive,
        "random": random_state,
        "parameters": {
            "exhaustive_maximum_order": args.exhaustive_maximum_order,
            "random_cases": args.random_cases,
            "random_maximum_order": args.random_maximum_order,
            "rank_cap": args.rank_cap,
            "seed": args.seed,
        },
        "geng_sha256": sha256(args.geng),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A finite PASS is diagnostic only. A covariance failure refutes only "
            "this sufficient route unless one of the separately recorded broader "
            "margins also fails."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"], flush=True)
    print("SOURCE_SHA256", report["source_sha256"], flush=True)
    print("REPORT_SHA256", sha256(args.output), flush=True)


if __name__ == "__main__":
    main()
