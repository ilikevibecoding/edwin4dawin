#!/usr/bin/env python3
"""Fast exact stress test of the two-block recursive Theta-core split.

For q>=4, the doubled unscaled recursive gap splits as

    A = root-indicator change + phi change + M-reserve change,
    B = psi change + chi change.

The enumeration-based derivation found A>=0 and B>=0 separately.
This script computes the same five blocks from residual moment jets,
allowing exact tests on much larger forests.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from scan_denominator_free_leaf_monotonicity import jet
from scan_edge_survival_ratio_dominance import random_forest
from verify_edge_survival_payment_reduction import galvin_tree


JET_CACHE: dict[
    tuple[tuple[int, ...], tuple[tuple[int, int], ...]],
    dict[int, tuple[int, int, int, int, int, int]],
] = {}


def signature(
    graph: nx.Graph,
) -> tuple[tuple[int, ...], tuple[tuple[int, int], ...]]:
    return (
        tuple(sorted(graph)),
        tuple(
            sorted(
                (min(left, right), max(left, right))
                for left, right in graph.edges()
            )
        ),
    )


def cached_jet(
    graph: nx.Graph,
) -> dict[int, tuple[int, int, int, int, int, int]]:
    key = signature(graph)
    if key not in JET_CACHE:
        JET_CACHE[key] = (
            jet(graph)
            if graph
            else {0: (1, 0, 0, 0, 0, 0)}
        )
    return JET_CACHE[key]


def row(graph: nx.Graph, rank: int) -> tuple[int, int, int, int]:
    """Return count, sum h, sum h^2, and sum components."""
    if rank < 0:
        return 0, 0, 0, 0
    data = cached_jet(graph).get(rank, (0, 0, 0, 0, 0, 0))
    count, mass, square, _, residual_edges, _ = data
    return count, mass, square, mass - residual_edges


def removed(graph: nx.Graph, vertices: set[int]) -> nx.Graph:
    return graph.subgraph(set(graph) - vertices).copy()


def core_blocks_from_moments(
    q: int,
    A: tuple[int, int, int, int, int, int, int],
    M: tuple[int, int, int, int],
    P: tuple[int, int, int, int],
) -> dict[str, int]:
    N, S, H, C, X, Y, HX = A
    m_count, T, J2, D = M
    p_count, U, K2, E = P
    root_block = -4 * X * (N - X)
    phi = 4 * (
        2 * m_count * (S - HX)
        - 2 * (N - X) * T
        + m_count * (X + Y)
    )
    psi = 2 * (
        2 * (q - 3) * N * p_count
        + p_count * C
        + 2 * p_count * Y
        + N * E
        - p_count * (H + 4 * HX + 4 * X)
        - N * K2
        + 2 * (S + 2 * X) * U
    )
    chi = 2 * (
        (2 * q - 6) * m_count * p_count
        + p_count * D
        + m_count * E
        - p_count * J2
        - m_count * K2
        - 2 * p_count * T
        + 2 * T * U
        + 2 * m_count * U
    )
    return {
        "root": root_block,
        "phi": phi,
        "psi": psi,
        "chi": chi,
        "mass": 8 * m_count * m_count,
    }


def recursive_blocks_fast(
    base: nx.Graph,
    root: int,
    support: int,
    q: int,
    subtract_lower: bool = True,
) -> dict[str, int]:
    J = removed(base, {root})
    L = removed(base, {support})
    K = removed(base, {root, support})
    Rv = removed(base, {root} | set(base[root]))
    Rs = removed(base, {support} | set(base[support]))
    RvL = removed(
        L,
        {root} | set(L[root]),
    )
    Js = removed(
        J,
        {support} | set(J[support]),
    )

    N, S, H, C = row(base, q)
    X = row(J, q)[0]
    root_residual = row(Rv, q)[0]
    Y = X - root_residual
    HX = row(J, q)[1] + root_residual
    old_A = (N, S, H, C, X, Y, HX)
    old_M = row(J, q - 1)
    old_P = row(J, q - 2)

    # Rank-q data in B updated by an absent new leaf at s.
    support_absent = row(L, q)[0]
    support_residual = row(Rs, q)[0]
    support_hit = support_absent - support_residual
    support_absent_mass = row(L, q)[1] + support_residual
    root_support_absent = row(K, q)[0]

    lower_N, lower_S, lower_H, lower_C = row(L, q - 1)
    lower_X = row(K, q - 1)[0]
    lower_root_residual = row(RvL, q - 1)[0]
    lower_Y = lower_X - lower_root_residual
    lower_HX = row(K, q - 1)[1] + lower_root_residual
    lower_A = (
        lower_N,
        lower_S,
        lower_H,
        lower_C,
        lower_X,
        lower_Y,
        lower_HX,
    )
    lower_M = row(K, q - 2)
    lower_P = row(K, q - 3)

    M, T, J2, D = old_M
    A1 = row(K, q - 1)[0]
    residual1 = row(Js, q - 1)[0]
    B1 = A1 - residual1
    HA1 = row(K, q - 1)[1] + residual1
    m, u, k2, e = lower_M

    P, U, K2, E = old_P
    A2 = row(K, q - 2)[0]
    residual2 = row(Js, q - 2)[0]
    B2 = A2 - residual2
    HA2 = row(K, q - 2)[1] + residual2
    p, V, L2, F = lower_P

    new_A = (
        N + lower_N,
        S + support_absent + lower_S,
        H + 2 * support_absent_mass + support_absent + lower_H,
        C + support_hit + lower_C,
        X + lower_X,
        Y + lower_Y,
        HX + root_support_absent + lower_HX,
    )
    new_M = (
        M + m,
        T + A1 + u,
        J2 + 2 * HA1 + A1 + k2,
        D + B1 + e,
    )
    new_P = (
        P + p,
        U + A2 + V,
        K2 + 2 * HA2 + A2 + L2,
        E + B2 + F,
    )

    old_blocks = core_blocks_from_moments(
        q, old_A, old_M, old_P
    )
    lower_blocks = core_blocks_from_moments(
        q - 1, lower_A, lower_M, lower_P
    )
    new_blocks = core_blocks_from_moments(
        q, new_A, new_M, new_P
    )
    return {
        name: (
            new_blocks[name]
            - old_blocks[name]
            - (lower_blocks[name] if subtract_lower else 0)
        )
        for name in old_blocks
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--random-forests", type=int, default=200)
    parser.add_argument("--random-maximum-order", type=int, default=120)
    parser.add_argument("--maximum-rank", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993799)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_recursive_phase_split_"
            "stress_20260729.json"
        ),
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        "shadow_phi": None,
        "component_square": None,
        "total": None,
    }
    checks = 0

    def audit(
        forest: nx.Graph,
        root: int,
        support: int,
        family: str,
        parameters: dict,
    ) -> None:
        nonlocal checks
        maximum = min(
            args.maximum_rank,
            max(cached_jet(forest), default=3) + 2,
        )
        for q in range(4, maximum + 1):
            blocks = recursive_blocks_fast(
                forest, root, support, q
            )
            values = {
                "shadow_phi": (
                    blocks["root"]
                    + blocks["phi"]
                    + blocks["mass"]
                ),
                "component_square": (
                    blocks["psi"] + blocks["chi"]
                ),
                "total": sum(blocks.values()),
            }
            record = {
                "family": family,
                "parameters": parameters,
                "root": root,
                "support": support,
                "rank_q": q,
                "blocks": blocks,
                "grouped_values": values,
            }
            for name, value in values.items():
                if value < 0:
                    failures.append(
                        {**record, "failed_group": name}
                    )
                if (
                    minima[name] is None
                    or value < minima[name][0]
                ):
                    minima[name] = (value, record)
            checks += 1

    for sample in range(args.random_forests):
        forest = random_forest(
            rng, 3, args.random_maximum_order
        )
        root, support = rng.sample(list(forest), 2)
        audit(
            forest,
            root,
            support,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
        )

    for s_value, ell_value in ((8, 5), (14, 8), (20, 12)):
        tree = galvin_tree(s_value, ell_value)
        candidates = list(tree)
        pairs = [
            (candidates[0], candidates[-1]),
            (max(tree, key=tree.degree), min(tree, key=tree.degree)),
        ]
        for root, support in pairs:
            if root == support:
                continue
            audit(
                tree,
                root,
                support,
                "galvin_tree",
                {
                    "s": s_value,
                    "ell": ell_value,
                    "order": len(tree),
                },
            )

    report = {
        "status": (
            "PASS_SIBLING_THETA_CORE_RECURSIVE_PHASE_SPLIT_STRESS"
            if not failures
            else "FAIL_SIBLING_THETA_CORE_RECURSIVE_PHASE_SPLIT_STRESS"
        ),
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "maximum_rank": args.maximum_rank,
        "checked_root_support_ranks": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_grouped_values": {
            name: item[1] if item is not None else None
            for name, item in minima.items()
        },
        "warning": (
            "The moment implementation is exact, but this remains "
            "finite evidence for the two nonnegativity claims."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
