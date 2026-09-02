#!/usr/bin/env python3
"""Search chordal graphs for TI failures with a unimodal root deletion."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    size = max(len(left), len(right))
    return tuple(
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(size)
    )


def shift(values: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *values)


def independence_polynomials(neighbors: list[int]):
    cache: dict[int, tuple[int, ...]] = {0: (1,)}

    def polynomial(mask: int) -> tuple[int, ...]:
        if mask in cache:
            return cache[mask]
        vertices = [
            vertex
            for vertex in range(len(neighbors))
            if mask & (1 << vertex)
        ]
        vertex = max(
            vertices,
            key=lambda item: (neighbors[item] & mask).bit_count(),
        )
        without = mask & ~(1 << vertex)
        closed = (neighbors[vertex] | (1 << vertex)) & mask
        result = add(
            polynomial(without),
            shift(polynomial(mask & ~closed)),
        )
        cache[mask] = result
        return result

    return polynomial


def random_chordal(order: int, rng: random.Random) -> list[int]:
    neighbors = [0] * order
    cliques: list[tuple[int, ...]] = [(0,)]
    for vertex in range(1, order):
        parent_clique = rng.choice(cliques)
        selected = tuple(
            old
            for old in parent_clique
            if rng.random() < 0.75
        )
        if not selected and rng.random() < 0.9:
            selected = (rng.choice(parent_clique),)
        for old in selected:
            neighbors[vertex] |= 1 << old
            neighbors[old] |= 1 << vertex
        new_clique = tuple(sorted((*selected, vertex)))
        cliques.append(new_clique)
        if rng.random() < 0.25:
            cliques.append((vertex,))
    return neighbors


def unimodal(values: tuple[int, ...]) -> bool:
    peak = values.index(max(values))
    return all(
        values[index] >= values[index - 1]
        for index in range(1, peak + 1)
    ) and all(
        values[index] <= values[index - 1]
        for index in range(peak + 1, len(values))
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=24)
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--roots", type=int, default=4)
    parser.add_argument("--minimum-rank", type=int, default=1)
    parser.add_argument("--seed", type=int, default=993_20260728)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = rooted = unimodal_deletions = 0
    first = None
    maximum = None
    maximum_item = None

    for sample in range(args.samples):
        neighbors = random_chordal(args.order, rng)
        polynomial = independence_polynomials(neighbors)
        full_mask = (1 << args.order) - 1
        base = polynomial(full_mask)
        total = add(base, shift(base))
        candidates = sorted(
            range(args.order),
            key=lambda vertex: (neighbors[vertex].bit_count(), rng.random()),
            reverse=True,
        )[: args.roots]
        for root in candidates:
            rooted += 1
            deletion = polynomial(full_mask & ~(1 << root))
            if not unimodal(deletion):
                continue
            unimodal_deletions += 1
            for rank in range(args.minimum_rank, len(total)):
                bm = total[rank - 1]
                br = total[rank] if rank < len(total) else 0
                if not bm or not br or br < bm:
                    continue
                cm = (
                    deletion[rank - 1]
                    if rank - 1 < len(deletion)
                    else 0
                )
                cr = deletion[rank] if rank < len(deletion) else 0
                u = Fraction(rank * br, bm)
                rho_previous = Fraction(bm - cm, bm)
                rho = Fraction(br - cr, br)
                burden = (
                    rank * (u + 1) * rho_previous
                    - (rank + 1) * u * rho
                )
                checks += 1
                item = {
                    "sample": sample,
                    "root": root,
                    "root_degree": neighbors[root].bit_count(),
                    "rank": rank,
                    "burden": str(burden),
                    "deletion_coefficients": deletion,
                    "edges": [
                        [left, right]
                        for left in range(args.order)
                        for right in range(left + 1, args.order)
                        if neighbors[left] & (1 << right)
                    ],
                }
                if maximum is None or burden > maximum:
                    maximum = burden
                    maximum_item = item
                if burden > 0:
                    first = item
                    break
            if first is not None:
                break
        if first is not None:
            break
        if (sample + 1) % 500 == 0:
            print(
                f"samples={sample + 1} rooted={rooted} "
                f"unimodal={unimodal_deletions} checks={checks} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "rooted_graphs": rooted,
        "unimodal_deletions": unimodal_deletions,
        "checks": checks,
        "maximum_burden": (
            None
            if maximum is None
            else {"exact": str(maximum), **maximum_item}
        ),
        "first_failure": first,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "rooted_graphs": rooted,
                "unimodal_deletions": unimodal_deletions,
                "checks": checks,
                "maximum_burden": (
                    None if maximum is None else str(maximum)
                ),
            },
            indent=2,
        )
    )
    return 1 if first else 0


if __name__ == "__main__":
    raise SystemExit(main())

