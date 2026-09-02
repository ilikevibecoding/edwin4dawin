#!/usr/bin/env python3
"""Exact certificate scan for a factorial reserve suggested by Erdős 993.

For a rooted (planted) tree state write

    U = product(A_i),       J = product(U_i),
    D = x J,                A = U + D,             V = A + D,

where the children have total-state polynomials A_i and root-excluded
polynomials U_i.  For P=sum p_k x^k let F(P)_k = k! p_k.

The scan tests the following exact properties.

1. Ordered log-concavity (also ULC(infinity)):

       k p_k^2 >= (k+1) p_{k-1} p_{k+1}.              (OLC)

   Equivalently F(P) is log-concave.

2. The factorial wide-minor dominance

       M_F(A)(m,n) >= M_F(D)(m,n),                    (WMD)

   where M_p(m,n)=p_m p_n-p_{m+1}p_{n-1}, for every m >= n.
   Its diagonal and OLC of D imply OLC of A.

Equivalently, F(U) and F(V) have nonnegative mixed minors

       p_m q_n + q_m p_n
          >= p_{m+1} q_{n-1} + q_{m+1} p_{n-1}.       (PS)

because 2(M_F(A)-M_F(D)) is exactly that mixed minor for (F(U),F(V)).

The exhaustive lane enumerates every unlabeled core tree through the requested
order, adds exactly max(0,3-deg(v)) leaves at each core vertex, and tests every
directed planted state plus every possible internal root.  These are the
minimally leaf-padded homeomorphically irreducible trees (HITs).

Optional random trials add arbitrary extra leaves.  All arithmetic is exact
Python integer arithmetic.  Passing is evidence, not a proof.

The auxiliary claim that V itself is OLC is recorded only as a diagnostic:
it is false for some arbitrarily leaf-padded HIT states and is not needed
for WMD.  Two controls prevent accidental overstatement:

* K_1,4 satisfies OLC but fails the stronger ULC(n) normalization.
* A standard degree-two broom fails OLC in its tail, so OLC is not claimed for
  all rooted trees.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from math import factorial
from pathlib import Path
from typing import Iterable

import networkx as nx

from hit_curvature_reserve_stress import (
    State,
    core_generator,
    degree_two_broom,
    make_hit,
    planted_state,
    random_core,
    tree_certificate,
)


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for k, value in enumerate(a):
        out[k] += value
    for k, value in enumerate(b):
        out[k] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def shift(p: list[int]) -> list[int]:
    return [0] + p


def factorial_transform(p: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(p)]


def first_ordered_lc_failure(p: list[int]) -> dict | None:
    for k in range(1, len(p) - 1):
        gap = (
            k * p[k] * p[k]
            - (k + 1) * p[k - 1] * p[k + 1]
        )
        if gap < 0:
            return {"k": k, "gap": gap}
    return None


def first_ulc_n_failure(p: list[int], n: int) -> dict | None:
    """Test log-concavity of p_k / C(n,k), a deliberately stronger control."""
    for k in range(1, len(p) - 1):
        gap = (
            k * (n - k) * p[k] * p[k]
            - (k + 1)
            * (n - k + 1)
            * p[k - 1]
            * p[k + 1]
        )
        if gap < 0:
            return {"k": k, "gap": gap}
    return None


def mixed_minor(p: list[int], q: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(q, n)
        + coeff(q, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(q, n - 1)
        - coeff(q, m + 1) * coeff(p, n - 1)
    )


def toeplitz_minor(p: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(p, n - 1)
    )


def first_wmd_failure(
    a: list[int], d: list[int]
) -> tuple[dict | None, int]:
    upper = max(len(a), len(d))
    checks = 0
    for m in range(upper + 1):
        for n in range(m + 1):
            checks += 1
            reserve = toeplitz_minor(a, m, n) - toeplitz_minor(d, m, n)
            if reserve < 0:
                return {"m": m, "n": n, "reserve": reserve}, checks
    return None, checks


def state_polynomials(state: State) -> dict[str, list[int]]:
    u = state.e
    d = shift(state.j)
    a = state.t
    v = add(a, d)
    return {"A": a, "U": u, "J": state.j, "D": d, "V": v}


def empty_stats() -> dict:
    return {
        "trees": 0,
        "states": 0,
        "ordered_lc_rank_checks": 0,
        "factorial_wmd_checks": 0,
        "auxiliary_v_olc_failures": 0,
        "first_auxiliary_v_olc_failure": None,
        "max_tree_order": 0,
        "max_polynomial_degree": 0,
    }


def merge_stats(target: dict, source: dict) -> None:
    for key in (
        "trees",
        "states",
        "ordered_lc_rank_checks",
        "factorial_wmd_checks",
        "auxiliary_v_olc_failures",
    ):
        target[key] += source[key]
    if (
        target["first_auxiliary_v_olc_failure"] is None
        and source["first_auxiliary_v_olc_failure"] is not None
    ):
        target["first_auxiliary_v_olc_failure"] = source[
            "first_auxiliary_v_olc_failure"
        ]
    for key in ("max_tree_order", "max_polynomial_degree"):
        target[key] = max(target[key], source[key])


def state_failure(
    state: State,
) -> tuple[dict | None, dict]:
    polynomials = state_polynomials(state)
    stats = empty_stats()
    stats["states"] = 1
    stats["max_polynomial_degree"] = max(
        len(p) - 1 for p in polynomials.values()
    )

    # These are the polynomials needed by the recursive proof candidate.
    # J and D have the same coefficients up to a shift, but OLC is not
    # shift-invariant, so both checks are material.
    for name in ("A", "U", "J", "D"):
        p = polynomials[name]
        stats["ordered_lc_rank_checks"] += max(0, len(p) - 2)
        failure = first_ordered_lc_failure(p)
        if failure is not None:
            return {
                "kind": "ordered_log_concavity",
                "polynomial": name,
                "coefficients": p,
                **failure,
            }, stats

    v_failure = first_ordered_lc_failure(polynomials["V"])
    stats["ordered_lc_rank_checks"] += max(0, len(polynomials["V"]) - 2)
    if v_failure is not None:
        stats["auxiliary_v_olc_failures"] = 1
        stats["first_auxiliary_v_olc_failure"] = {
            "coefficients": polynomials["V"],
            **v_failure,
        }

    transforms = {
        name: factorial_transform(polynomials[name])
        for name in ("A", "U", "D", "V")
    }
    failure, checks = first_wmd_failure(transforms["A"], transforms["D"])
    stats["factorial_wmd_checks"] += checks
    if failure is not None:
        return {
            "kind": "factorial_wide_minor_dominance",
            "A": polynomials["A"],
            "D": polynomials["D"],
            **failure,
        }, stats

    return None, stats


def records_for_hit(
    graph: nx.Graph, core_order: int
) -> Iterable[tuple[int, int | None, State]]:
    """Every directed edge-state and every full state rooted in the core."""
    memo: dict[tuple[int, int | None], State] = {}
    for vertex in graph:
        for parent in graph[vertex]:
            yield vertex, parent, planted_state(graph, vertex, parent, memo)
        if vertex < core_order:
            yield vertex, None, planted_state(graph, vertex, None, memo)


def scan_hit(
    graph: nx.Graph,
    core_order: int,
    context: dict,
) -> tuple[dict | None, dict]:
    stats = empty_stats()
    stats["trees"] = 1
    stats["max_tree_order"] = graph.number_of_nodes()
    for vertex, parent, state in records_for_hit(graph, core_order):
        failure, part = state_failure(state)
        merge_stats(stats, part)
        if failure is not None:
            return {
                "context": context,
                "vertex": vertex,
                "parent": parent,
                "children": state.children,
                "tree": tree_certificate(graph),
                **failure,
            }, stats
    return None, stats


def exhaustive_lane(max_core: int) -> tuple[dict, dict | None]:
    total = empty_stats()
    per_order: list[dict] = []
    for h in range(1, max_core + 1):
        order_stats = empty_stats()
        for core_index, core in enumerate(core_generator(h)):
            graph, leaf_counts = make_hit(core)
            failure, part = scan_hit(
                graph,
                h,
                {
                    "lane": "exhaustive_minimal_hit",
                    "core_order": h,
                    "core_index": core_index,
                    "leaf_counts": leaf_counts,
                },
            )
            merge_stats(order_stats, part)
            if failure is not None:
                merge_stats(total, order_stats)
                per_order.append({"core_order": h, **order_stats})
                return {
                    "summary": total,
                    "per_core_order": per_order,
                }, failure
        merge_stats(total, order_stats)
        per_order.append({"core_order": h, **order_stats})
        print(
            f"exact h={h}: trees={order_stats['trees']:,} "
            f"states={order_stats['states']:,} "
            f"WMD minors={order_stats['factorial_wmd_checks']:,}",
            flush=True,
        )
    return {"summary": total, "per_core_order": per_order}, None


def random_lane(
    trials: int,
    max_core: int,
    max_extra_leaves: int,
    seed: int,
) -> tuple[dict, dict | None]:
    rng = random.Random(seed)
    total = empty_stats()
    for trial in range(trials):
        h = rng.randint(1, max_core)
        core = random_core(rng, h)
        extras = [rng.randint(0, max_extra_leaves) for _ in range(h)]
        graph, leaf_counts = make_hit(core, extras)
        vertex = rng.randrange(h)
        possible_parents = [None, *graph[vertex]]
        parent = rng.choice(possible_parents)
        state = planted_state(graph, vertex, parent, {})
        failure, part = state_failure(state)
        part["trees"] = 1
        part["max_tree_order"] = graph.number_of_nodes()
        context = {
            "lane": "random_arbitrarily_padded_hit",
            "trial": trial,
            "seed": seed,
            "core_order": h,
            "extra_leaves": extras,
            "leaf_counts": leaf_counts,
            "vertex": vertex,
            "parent": parent,
        }
        if failure is not None:
            failure = {
                "context": context,
                "children": state.children,
                "tree": tree_certificate(graph),
                **failure,
            }
        merge_stats(total, part)
        if failure is not None:
            return total, failure
        if (trial + 1) % 100 == 0:
            print(
                f"random {trial + 1:,}/{trials:,}: "
                f"states={total['states']:,}",
                flush=True,
            )
    return total, None


def controls() -> dict:
    star = nx.star_graph(4)
    star_polynomial = planted_state(star, 0, None, {}).t

    broom = degree_two_broom(branches=3, twigs=4)
    broom_polynomial = planted_state(broom, 0, None, {}).t

    return {
        "K1_4": {
            "polynomial": star_polynomial,
            "ordered_lc_failure": first_ordered_lc_failure(star_polynomial),
            "ULC_n_failure": first_ulc_n_failure(
                star_polynomial, star.number_of_nodes()
            ),
            "expected": "OLC passes; ULC(n) fails at rank 2",
        },
        "degree_two_broom_3_4": {
            "tree": tree_certificate(broom),
            "polynomial": broom_polynomial,
            "ordered_lc_failure": first_ordered_lc_failure(broom_polynomial),
            "expected": "OLC fails in the tail",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-core", type=int, default=14)
    parser.add_argument("--random", type=int, default=0)
    parser.add_argument("--random-max-core", type=int, default=50)
    parser.add_argument("--max-extra-leaves", type=int, default=6)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    exact, failure = exhaustive_lane(args.max_core)
    random_result = None
    if failure is None and args.random:
        random_result, failure = random_lane(
            args.random,
            args.random_max_core,
            args.max_extra_leaves,
            args.seed,
        )

    report = {
        "claim_tested": (
            "For every tested planted HIT state, A,U,J,D satisfy ordered "
            "log-concavity and factorial(A) wide-minor-dominates "
            "factorial(D). Algebraically this is equivalent to nonnegative "
            "U,V factorial mixed minors. V ordered log-concavity is "
            "diagnostic only."
        ),
        "scope": (
            "Exhaustive only for minimally leaf-padded HITs built from all "
            "unlabeled cores through max_core; optional random arbitrary "
            "leaf padding."
        ),
        "exact_integer_arithmetic": True,
        "parameters": vars(args) | {"output": str(args.output)},
        "exhaustive_minimal_hit": exact,
        "random_arbitrary_padding": random_result,
        "controls": controls(),
        "failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "summary": exact["summary"],
                "failure": failure,
                "controls": report["controls"],
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
