#!/usr/bin/env python3
"""Exact prefix Q-leaf scan on Galvin's subdivided-star tree family.

For

    E_t(x) = (1+2x)^t,
    A_t(x) = E_t(x) + x(1+x)^t,
    P_{m,t}(x) = A_t(x)^m + x E_t(x)^m,

test attaching a leaf at each of the four vertex orbits: the central
vertex, a branch root, an intermediate support, and an outer leaf.
Every decision uses exact integer arithmetic.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from flint import fmpz_poly as Poly
import networkx as nx

from verify_prefix_two_over_k_variance_reduction import (
    forest_independence_polynomial,
)


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def coefficient(poly: Poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank < len(poly) else 0


def q_reserve(poly: Poly, rank: int) -> int:
    lower = coefficient(poly, rank - 1)
    middle = coefficient(poly, rank)
    upper = coefficient(poly, rank + 1)
    return (
        2 * rank * middle * middle
        - lower * middle
        - 2 * (rank + 1) * lower * upper
    )


def build_tree(m: int, t: int) -> tuple[nx.Graph, dict[str, int]]:
    tree = nx.Graph()
    central = 0
    tree.add_node(central)
    next_vertex = 1
    representatives: dict[str, int] = {"central": central}
    for branch_index in range(m):
        root = next_vertex
        next_vertex += 1
        tree.add_edge(central, root)
        if branch_index == 0:
            representatives["branch_root"] = root
        for arm_index in range(t):
            support = next_vertex
            leaf = next_vertex + 1
            next_vertex += 2
            tree.add_edge(root, support)
            tree.add_edge(support, leaf)
            if branch_index == 0 and arm_index == 0:
                representatives["support"] = support
                representatives["outer_leaf"] = leaf
    return tree, representatives


def poly_from_tuple(values: tuple[int, ...]) -> Poly:
    return Poly(list(values))


def deletion_polynomials(
    t: int,
    a: Poly,
    e: Poly,
    a_previous: Poly,
    e_previous: Poly,
    a_power_previous: Poly,
    e_power_previous: Poly,
) -> dict[str, Poly]:
    one_plus_x = ONE + X
    affected_support_deleted = one_plus_x * a_previous
    affected_leaf_deleted = (
        one_plus_x * e_previous
        + X * one_plus_x**(t - 1)
    )
    central_deleted = a * a_power_previous
    branch_root_deleted = (
        e * a_power_previous + X * e * e_power_previous
    )
    support_deleted = (
        affected_support_deleted * a_power_previous
        + X
        * one_plus_x
        * e_previous
        * e_power_previous
    )
    outer_leaf_deleted = (
        affected_leaf_deleted * a_power_previous
        + X
        * one_plus_x
        * e_previous
        * e_power_previous
    )
    return {
        "central": central_deleted,
        "branch_root": branch_root_deleted,
        "support": support_deleted,
        "outer_leaf": outer_leaf_deleted,
    }


def self_check() -> None:
    for t in range(1, 4):
        e = (ONE + 2 * X) ** t
        a = e + X * (ONE + X) ** t
        a_previous = (ONE + 2 * X) ** (t - 1) + X * (
            ONE + X
        ) ** (t - 1)
        e_previous = (ONE + 2 * X) ** (t - 1)
        a_power_previous = ONE
        e_power_previous = ONE
        for m in range(1, 4):
            tree, representatives = build_tree(m, t)
            old = poly_from_tuple(forest_independence_polynomial(tree))
            expected_old = (
                a * a_power_previous
                + X * e * e_power_previous
            )
            assert old == expected_old
            deletions = deletion_polynomials(
                t,
                a,
                e,
                a_previous,
                e_previous,
                a_power_previous,
                e_power_previous,
            )
            for orbit, vertex in representatives.items():
                deleted_tree = tree.copy()
                deleted_tree.remove_node(vertex)
                direct = poly_from_tuple(
                    forest_independence_polynomial(deleted_tree)
                )
                assert direct == deletions[orbit], (m, t, orbit)
            a_power_previous *= a
            e_power_previous *= e


def better_delta(candidate: dict, incumbent: dict | None) -> bool:
    return (
        incumbent is None
        or candidate["delta_Q"] < incumbent["delta_Q"]
    )


def better_boundary(candidate: dict, incumbent: dict | None) -> bool:
    return (
        incumbent is None
        or candidate["new_boundary_Q"]
        < incumbent["new_boundary_Q"]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t-min", type=int, default=1)
    parser.add_argument("--t-max", type=int, default=12)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=100)
    parser.add_argument(
        "--window",
        type=int,
        default=0,
        help="If positive, test only this many ranks below the cutoff.",
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    self_check()
    checks = 0
    boundary_checks = 0
    first_negative_delta = None
    first_negative_boundary = None
    smallest_delta = None
    smallest_boundary = None

    for t in range(args.t_min, args.t_max + 1):
        e = (ONE + 2 * X) ** t
        a = e + X * (ONE + X) ** t
        e_previous = (ONE + 2 * X) ** (t - 1)
        a_previous = (
            e_previous + X * (ONE + X) ** (t - 1)
        )
        a_power_previous = ONE
        e_power_previous = ONE
        for m in range(1, args.m_max + 1):
            old = (
                a * a_power_previous
                + X * e * e_power_previous
            )
            if m >= args.m_min:
                old_alpha = m * (t + 1)
                old_cutoff = (2 * old_alpha + 1) // 3
                deletions = deletion_polynomials(
                    t,
                    a,
                    e,
                    a_previous,
                    e_previous,
                    a_power_previous,
                    e_power_previous,
                )
                for orbit, deleted in deletions.items():
                    new = old + X * deleted
                    new_alpha = max(
                        old_alpha,
                        len(deleted),
                    )
                    assert new_alpha == len(new) - 1
                    new_cutoff = (2 * new_alpha + 1) // 3
                    first_rank = 3
                    if args.window > 0:
                        first_rank = max(
                            first_rank,
                            old_cutoff - args.window,
                        )
                    for rank in range(first_rank, old_cutoff):
                        checks += 1
                        old_q = q_reserve(old, rank)
                        new_q = q_reserve(new, rank)
                        item = {
                            "m": m,
                            "t": t,
                            "orbit": orbit,
                            "old_order": 1 + m * (1 + 2 * t),
                            "old_alpha": old_alpha,
                            "new_alpha": new_alpha,
                            "rank": rank,
                            "old_cutoff": old_cutoff,
                            "new_cutoff": new_cutoff,
                            "old_Q": old_q,
                            "new_Q": new_q,
                            "delta_Q": new_q - old_q,
                        }
                        if better_delta(item, smallest_delta):
                            smallest_delta = item
                        if (
                            item["delta_Q"] < 0
                            and first_negative_delta is None
                        ):
                            first_negative_delta = item
                    if (
                        new_cutoff == old_cutoff + 1
                        and old_cutoff >= 3
                    ):
                        boundary_checks += 1
                        boundary_q = q_reserve(new, old_cutoff)
                        item = {
                            "m": m,
                            "t": t,
                            "orbit": orbit,
                            "old_order": 1 + m * (1 + 2 * t),
                            "old_alpha": old_alpha,
                            "new_alpha": new_alpha,
                            "rank": old_cutoff,
                            "old_cutoff": old_cutoff,
                            "new_cutoff": new_cutoff,
                            "new_boundary_Q": boundary_q,
                        }
                        if better_boundary(item, smallest_boundary):
                            smallest_boundary = item
                        if (
                            boundary_q < 0
                            and first_negative_boundary is None
                        ):
                            first_negative_boundary = item
            a_power_previous *= a
            e_power_previous *= e
        print(
            f"t={t}: checks={checks:,}, boundary={boundary_checks:,}, "
            f"delta_failure={first_negative_delta is not None}, "
            f"boundary_failure={first_negative_boundary is not None}",
            flush=True,
        )
        if first_negative_delta or first_negative_boundary:
            break

    report = {
        "status": (
            "FAIL"
            if first_negative_delta or first_negative_boundary
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            "t_min": args.t_min,
            "t_max": args.t_max,
            "m_min": args.m_min,
            "m_max": args.m_max,
            "window": args.window,
        },
        "self_check": "PASS",
        "checks": checks,
        "boundary_checks": boundary_checks,
        "first_negative_delta": first_negative_delta,
        "first_negative_boundary": first_negative_boundary,
        "smallest_delta": smallest_delta,
        "smallest_boundary": smallest_boundary,
    }
    if args.output:
        args.output.write_text(
            json.dumps(report, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
