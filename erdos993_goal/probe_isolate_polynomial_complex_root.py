#!/usr/bin/env python3
"""Search abstract complexes with n<=2*alpha for isolate-polynomial signs."""

from __future__ import annotations

from itertools import combinations
import random

from probe_isolate_polynomial_bipartite_root import (
    Poly,
    add,
    scale,
    shifted_binomials,
)


def row_from_facets(n: int, facets: list[frozenset[int]]) -> list[int]:
    faces: set[frozenset[int]] = {frozenset()}
    for facet in facets:
        values = sorted(facet)
        for rank in range(len(values) + 1):
            faces.update(frozenset(chosen) for chosen in combinations(values, rank))
    row = [0] * (n + 1)
    for face in faces:
        row[len(face)] += 1
    return row


def failure(row: list[int]) -> tuple[int, int, object] | None:
    alpha = max(rank for rank, value in enumerate(row) if value)
    bins = shifted_binomials(alpha + 1)
    for rank in range(alpha + 2):
        polynomial: Poly = [0]
        for isolates in range(rank + 1):
            source = rank - isolates
            if source < len(row):
                polynomial = add(polynomial, scale(bins[isolates], row[source]))
        for power, value in enumerate(polynomial):
            if value < 0:
                return rank, power, value
    return None


def main() -> None:
    generator = random.Random(993993)
    checks = 0
    for n in range(2, 61):
        for alpha in range((n + 1) // 2, n + 1):
            for skeleton_rank in range(0, alpha):
                row = [
                    (
                        __import__("math").comb(n, rank)
                        if rank <= skeleton_rank
                        else __import__("math").comb(alpha, rank)
                    )
                    for rank in range(alpha + 1)
                ]
                result = failure(row)
                checks += 1
                if result:
                    print(
                        "SKELETON_PLUS_SIMPLEX_FAIL",
                        n,
                        alpha,
                        skeleton_rank,
                        row,
                        result,
                        flush=True,
                    )
                    return
    print(f"skeleton_plus_simplex_checks={checks:,}: no failure", flush=True)

    for n in range(4, 13):
        for alpha in range((n + 1) // 2, n + 1):
            ground = list(range(n))
            mandatory = frozenset(ground[:alpha])
            candidates = [
                frozenset(chosen)
                for rank in range(1, alpha + 1)
                for chosen in combinations(ground, rank)
                if not set(chosen) <= mandatory
            ]
            for _ in range(3000):
                facets = [mandatory]
                for candidate in generator.sample(
                    candidates, min(len(candidates), generator.randrange(0, 20))
                ):
                    if generator.random() < 0.55:
                        facets.append(candidate)
                row = row_from_facets(n, facets)
                result = failure(row)
                checks += 1
                if result:
                    print("FAIL", n, alpha, row, result, facets, flush=True)
                    return
        print(f"n={n}: checks={checks:,}", flush=True)
    print(f"PASS_RANDOM_COMPLEX_DIAGNOSTIC checks={checks:,}", flush=True)


if __name__ == "__main__":
    main()
