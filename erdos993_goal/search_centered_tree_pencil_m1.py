#!/usr/bin/env python3
"""Exhaust all labeled tree pencils for the first nontrivial centered endpoint.

At (N,d)=(7,7), Q(x,c)=G(x+c,x-c) has degree seven and is even in c.
If

    Q/kappa = det(xI + diag(lambda) + c A_T)

for a weighted tree T, then the coefficient of a=c^2 uniquely determines
the six squared edge weights for a fixed labeled tree, while coefficients of
a^2 and a^3 are predictions.  Cayley's formula gives only 7^5=16807 labeled
trees, so this script checks all of them numerically and records the closest
candidate.  An exact match would expose a concrete Hermitian-pencil proof;
failure rules out this fixed-diagonal weighted-tree ansatz at the first
nontrivial endpoint.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import numpy as np
import sympy as sp

from probe_centered_path_pencil import centered_polynomial
from probe_group_equal_direction_subdiscriminants import a, x


HERE = Path(__file__).resolve().parent
REPORT = HERE / "centered_tree_pencil_m1_exhaustive_20260804.json"


def prufer_edges(sequence: tuple[int, ...], n: int) -> tuple[tuple[int, int], ...]:
    degree = [1] * n
    for vertex in sequence:
        degree[vertex] += 1
    edges = []
    for vertex in sequence:
        leaf = next(index for index, value in enumerate(degree) if value == 1)
        edges.append(tuple(sorted((leaf, vertex))))
        degree[leaf] -= 1
        degree[vertex] -= 1
    remaining = [index for index, value in enumerate(degree) if value == 1]
    edges.append(tuple(sorted(remaining)))
    return tuple(sorted(edges))


def product_excluding(lambdas: np.ndarray, excluded: set[int]) -> np.ndarray:
    result = np.array([1.0])
    for index, value in enumerate(lambdas):
        if index not in excluded:
            result = np.convolve(result, np.array([value, 1.0]))
    return result


def main() -> None:
    _, polynomial = centered_polynomial(1)
    n = polynomial.degree(x)
    assert n == 7
    at_zero = sp.Poly(polynomial.as_expr().subs(a, 0), x)
    roots = np.sort(np.array([float(sp.re(root)) for root in sp.nroots(at_zero.as_expr(), n=40)]))
    lambdas = -roots

    target = {}
    for a_degree in range(polynomial.degree(a) + 1):
        target[a_degree] = np.array([
            float(polynomial.coeff_monomial(x**x_degree * a**a_degree))
            for x_degree in range(n - 2 * a_degree + 1)
        ])

    pair_basis = {
        (i, j): product_excluding(lambdas, {i, j})
        for i in range(n)
        for j in range(i + 1, n)
    }
    rhs = -target[1]
    best = None
    checked = 0
    unique_trees = set()
    for sequence in itertools.product(range(n), repeat=n - 2):
        edges = prufer_edges(sequence, n)
        if edges in unique_trees:
            continue
        unique_trees.add(edges)
        checked += 1
        matrix = np.column_stack([pair_basis[edge] for edge in edges])
        try:
            weights = np.linalg.solve(matrix, rhs)
        except np.linalg.LinAlgError:
            continue

        predicted = {
            0: target[0].copy(),
            1: target[1].copy(),
            2: np.zeros_like(target[2]),
            3: np.zeros_like(target[3]),
        }
        for mask in range(1, 1 << len(edges)):
            chosen = [index for index in range(len(edges)) if mask & (1 << index)]
            if len(chosen) < 2:
                continue
            covered: set[int] = set()
            valid = True
            weight = 1.0
            for index in chosen:
                left, right = edges[index]
                if left in covered or right in covered:
                    valid = False
                    break
                covered.update((left, right))
                weight *= weights[index]
            if not valid:
                continue
            size = len(chosen)
            predicted[size] += ((-1.0) ** size) * weight * product_excluding(lambdas, covered)

        residuals = []
        for degree in (2, 3):
            scale = np.maximum(1.0, np.abs(target[degree]))
            residuals.append(float(np.max(np.abs(predicted[degree] - target[degree]) / scale)))
        score = max(residuals)
        positive = bool(np.all(weights > 0))
        key = (score, not positive)
        if best is None or key < best[0]:
            best = (
                key,
                {
                    "edges": [list(edge) for edge in edges],
                    "weights": [float(value) for value in weights],
                    "all_weights_positive": positive,
                    "relative_residual_a2": residuals[0],
                    "relative_residual_a3": residuals[1],
                    "max_relative_residual": score,
                },
            )

    assert checked == n ** (n - 2)
    report = {
        "status": "EXHAUSTIVE_TREE_PENCIL_SEARCH",
        "N": 7,
        "d": 7,
        "degree": n,
        "labeled_trees_checked": checked,
        "best": best[1],
        "conclusion": (
            "An exact residual would support a weighted-tree determinant; "
            "a nonzero exhaustive minimum rules out this fixed-diagonal ansatz."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
