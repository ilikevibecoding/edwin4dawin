#!/usr/bin/env python3
"""Search synthetic full-rooted branching states with exact low coefficients.

For a genuine rooted state let U=E, D=xJ, A=U+D and V=U+2D.  If the root has
q children and the forest counted by U has N vertices, then

    u_1 = N,   d_1 = 1,   d_2 = N-q,
    u_2 + d_2 = binom(N,2).

This falsifier generates abstract child pairs satisfying these identities,
log-concavity, and the live full minor invariant, then combines two or more
children using the exact rooted recurrence.  A failure would identify which
additional tree/forest structure is needed beyond the order-two identity.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from functools import lru_cache
from math import comb, isqrt
from pathlib import Path

from toeplitz_pair_closure_search import (
    add,
    invariant_failure,
    is_log_concave,
    minor,
    mul,
    partial_failure,
    shift,
)


def ceil_sqrt(value: int) -> int:
    root = isqrt(value)
    return root if root * root == value else root + 1


def extend_forest_like(
    rng: random.Random, prefix: list[int], vertices: int, degree: int
) -> list[int] | None:
    """Extend an LC prefix using unavoidable independence-polynomial bounds.

    A graph on ``vertices`` vertices with independence number ``degree`` has
    binom(degree,k) <= a_k <= binom(vertices,k): a maximum independent set
    supplies the lower bound, while all k-subsets supply the upper bound.
    Forest bipartiteness separately forces degree >= ceil(vertices/2).
    """
    p = prefix[:]
    while len(p) - 1 < degree:
        k = len(p)
        lower = comb(degree, k)
        upper = comb(vertices, k)
        if len(p) >= 2:
            upper = min(upper, p[-1] * p[-1] // p[-2])
        if k < degree:
            # Leave enough LC room for the unavoidable next coefficient.
            lower = max(
                lower,
                ceil_sqrt(p[-1] * comb(degree, k + 1)),
            )
        if lower > upper:
            return None
        if rng.random() < 0.55:
            lower_high = max(lower, upper - max(1, upper // 5))
            p.append(rng.randint(lower_high, upper))
        else:
            p.append(rng.randint(lower, upper))
    return p


@lru_cache(maxsize=None)
def forest_degree_moments_feasible(
    vertices: int, edges: int, square_sum: int
) -> bool:
    """Whether any forest-compatible degree multiset has these moments.

    This is only a necessary test: it enforces the handshake identity,
    the second degree moment, and that isolated vertices cannot outnumber
    the ``vertices-edges`` components.
    """
    components = vertices - edges

    @lru_cache(maxsize=None)
    def dp(slots: int, degree_sum: int, squares: int, zeros: int) -> bool:
        if slots == 0:
            return degree_sum == 0 and squares == 0
        if degree_sum < 0 or squares < 0 or zeros > components:
            return False
        if degree_sum > slots * edges or squares > slots * edges * edges:
            return False
        for degree in range(min(edges, degree_sum), -1, -1):
            if degree * degree > squares:
                continue
            if dp(
                slots - 1,
                degree_sum - degree,
                squares - degree * degree,
                zeros + (degree == 0),
            ):
                return True
        return False

    return dp(vertices, 2 * edges, square_sum, 0)


def forest_first3_valid(p: list[int], vertices: int) -> bool:
    """Necessary order-three coefficient identities for a forest."""
    p2 = p[2] if len(p) > 2 else 0
    p3 = p[3] if len(p) > 3 else 0
    edges = comb(vertices, 2) - p2
    if edges < 0 or edges > max(0, vertices - 1):
        return False
    # Selecting a vertex cover with at most one endpoint per edge gives
    # alpha >= n-e for every graph (and hence every forest).
    if len(p) - 1 < vertices - edges:
        return False
    # In a triangle-free graph,
    # i_3=C(n,3)-e(n-2)+sum_v C(deg(v),2).
    wedges = p3 - comb(vertices, 3) + edges * (vertices - 2)
    # With sum(deg)=2e, convexity gives the lower bound; all adjacent
    # edge-pairs are among the C(e,2) unordered edge pairs.
    if not max(0, 2 * edges - vertices) <= wedges <= comb(edges, 2):
        return False
    return forest_degree_moments_feasible(
        vertices, edges, 2 * wedges + 2 * edges
    )


def candidate_child(rng: random.Random, max_degree: int):
    while True:
        n = rng.randint(2, min(2 * max_degree, 120))
        q = rng.randint(2, min(n, 16))
        d2 = n - q
        u2 = comb(n, 2) - d2
        alpha_u = rng.randint((n + 1) // 2, min(n, max_degree))
        u = extend_forest_like(rng, [1, n, u2], n, alpha_u)
        if u is None:
            continue
        if not forest_first3_valid(u, n):
            continue
        j_vertices = d2
        if j_vertices == 0:
            j = [1]
        else:
            alpha_j = rng.randint(
                (j_vertices + 1) // 2,
                min(j_vertices, max_degree - 1),
            )
            j = extend_forest_like(
                rng, [1, j_vertices], j_vertices, alpha_j
            )
            if j is None:
                continue
        if not forest_first3_valid(j, j_vertices):
            continue
        d = shift(j)
        a = add(u, d)
        v = add(a, d)
        if not all(
            is_log_concave(p) for p in (u, j, a, v)
        ):
            continue
        if invariant_failure(a, d):
            continue
        # Exact HIT data also satisfy T ~_p E.  This relation is independent
        # of the occupied-root minor invariant and is a plausible second
        # inductive reserve.
        if partial_failure(a, u):
            continue
        return {
            "N": n,
            "q": q,
            "U": u,
            "J": j,
            "D": d,
            "A": a,
            "V": v,
        }


def combine(children):
    u_parent = [1]
    j_parent = [1]
    for child in children:
        u_parent = mul(u_parent, child["A"])
        j_parent = mul(j_parent, child["U"])
    d_parent = shift(j_parent)
    a_parent = add(u_parent, d_parent)
    v_parent = add(a_parent, d_parent)
    return {
        "U": u_parent,
        "J": j_parent,
        "D": d_parent,
        "A": a_parent,
        "V": v_parent,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--max-degree", type=int, default=10)
    parser.add_argument("--max-children", type=int, default=4)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("synthetic_branching_identity_search.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.time()
    child_states = 0
    parent_minor_checks = 0
    first_failure = None
    first_prefix_diagonal_failure = None
    first_v_lc_failure = None
    first_parent_partial_failure = None

    for trial in range(args.trials):
        count = rng.randint(2, args.max_children)
        children = [
            candidate_child(rng, args.max_degree) for _ in range(count)
        ]
        child_states += count
        parent = combine(children)
        if not is_log_concave(parent["V"]) and first_v_lc_failure is None:
            first_v_lc_failure = {
                "trial": trial,
                "children": children,
                "parent": parent,
            }
        partial = partial_failure(parent["A"], parent["U"])
        if partial and first_parent_partial_failure is None:
            first_parent_partial_failure = {
                "trial": trial,
                "children": children,
                "parent": parent,
                **partial,
            }
        failure = invariant_failure(parent["A"], parent["D"])
        upper = max(len(parent["A"]), len(parent["D"]))
        parent_minor_checks += (upper + 1) * (upper + 2) // 2
        if failure and first_failure is None:
            first_failure = {
                "trial": trial,
                "child_count": count,
                "children": children,
                "parent": parent,
                **failure,
            }
        alpha = len(parent["A"]) - 1
        tail_start = (2 * alpha + 1) // 3
        for k in range(tail_start):
            reserve = minor(parent["A"], k, k) - minor(
                parent["D"], k, k
            )
            if reserve < 0:
                first_prefix_diagonal_failure = {
                    "trial": trial,
                    "child_count": count,
                    "children": children,
                    "parent": parent,
                    "alpha": alpha,
                    "tail_start": tail_start,
                    "k": k,
                    "reserve": reserve,
                }
                break
        if first_prefix_diagonal_failure is not None:
            break

    report = {
        "status": (
            "prefix_counterexample"
            if first_prefix_diagonal_failure
            else "no_prefix_failure"
        ),
        "seed": args.seed,
        "trials_requested": args.trials,
        "trials_completed": (
            first_prefix_diagonal_failure["trial"] + 1
            if first_prefix_diagonal_failure
            else args.trials
        ),
        "child_states_generated": child_states,
        "parent_minor_checks": parent_minor_checks,
        "first_parent_invariant_failure": first_failure,
        "first_prefix_diagonal_failure": first_prefix_diagonal_failure,
        "first_parent_V_lc_failure": first_v_lc_failure,
        "first_parent_partial_failure": first_parent_partial_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
