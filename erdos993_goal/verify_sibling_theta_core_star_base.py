#!/usr/bin/env python3
"""Prove the terminal-star base for the sibling Theta core.

Let H be a star centered at v with one distinguished leaf w and k
other leaves.  Equivalently, the base S=H-w is K_(1,k), and
J=S-v consists of k isolated vertices.  For q>=3 put

    N = binom(k,q), M = binom(k,q-1), P = binom(k,q-2).

All independent q-sets of S choose q leaves.  Their residual
statistics, and those of the two lower phases in J, are deterministic.
The exact phase identity therefore reduces to

    2 D_q(H,v,w)/(q!)^2
      = 8 N M + 4(k-1)N P + 4(k-1)M P + 8 M^2 >= 0.

This is a symbolic proof, including the zero-support boundary cases.
The finite replay compares the formula with the independent factorial
implementation.
"""

from __future__ import annotations

import argparse
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_sibling_theta_core_pruning import theta_core
from verify_sibling_uniform_phase_kernel_identity import (
    symbolic_verification as verify_phase_identity,
)


def choose(order: int, rank: int) -> int:
    return comb(order, rank) if 0 <= rank <= order else 0


def star_formula(k: int, q: int) -> int:
    N = choose(k, q)
    M = choose(k, q - 1)
    P = choose(k, q - 2)
    doubled_unscaled = (
        8 * N * M
        + 4 * (k - 1) * N * P
        + 4 * (k - 1) * M * P
        + 8 * M * M
    )
    return factorial(q) ** 2 * doubled_unscaled // 2


def symbolic_proof() -> dict[str, str]:
    # Reprove the general phase identity imported by the specialization.
    verify_phase_identity()
    k, q, N, M, P = sp.symbols(
        "k q N M P", integer=True, nonnegative=True
    )
    h_a = k - q
    h_m = k - q + 1
    h_p = k - q + 2
    c_a, c_m, c_p = h_a, h_m, h_p
    x = y = 1
    phi = sp.expand(
        y
        + 1
        - (h_a + 2 * x - h_m - 1) ** 2
        + (h_a + x - h_m) ** 2
    )
    psi = sp.expand(
        2 * (q - 3)
        + c_a
        + 2 * y
        + c_p
        - (h_a + 2 * x - h_p) ** 2
    )
    chi = sp.expand(
        2 * (q - 3)
        + c_m
        + c_p
        + 1
        - (h_m + 1 - h_p) ** 2
    )
    assert phi == 2
    assert sp.expand(psi - 2 * (k - 1)) == 0
    assert sp.expand(chi - 2 * (k - 1)) == 0
    doubled = sp.expand(
        4 * N * M * phi
        + 2 * N * P * psi
        + 2 * M * P * chi
        + 8 * M * M
    )
    displayed = (
        8 * N * M
        + 4 * (k - 1) * N * P
        + 4 * (k - 1) * M * P
        + 8 * M * M
    )
    assert sp.expand(doubled - displayed) == 0
    return {
        "phi": str(phi),
        "psi": str(psi),
        "chi": str(chi),
        "doubled_theta_core": str(displayed),
    }


def finite_replay(maximum_other_leaves: int) -> dict:
    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    for k in range(maximum_other_leaves + 1):
        # networkx.star_graph(k+1) has center 0 and k+1 leaves:
        # k ordinary leaves plus the distinguished one.
        graph = nx.star_graph(k + 1)
        root = 0
        distinguished = k + 1
        values = theta_core(graph, root, distinguished)
        for q in range(3, k + 5):
            direct = values.get(q, 0)
            formula = star_formula(k, q)
            record = {
                "ordinary_leaf_count_k": k,
                "rank_q": q,
                "direct_factorial_theta_core": direct,
                "star_formula": formula,
            }
            if direct != formula:
                failures.append(record)
            if minimum is None or formula < minimum[0]:
                minimum = (formula, record)
            checks += 1
    return {
        "maximum_other_leaves": maximum_other_leaves,
        "checked_star_ranks": checks,
        "identity_failure_count": len(failures),
        "identity_failures": failures[:20],
        "minimum_formula": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-other-leaves", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_star_base_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_proof()
    replay = finite_replay(args.maximum_other_leaves)
    report = {
        "status": (
            "PASS_SIBLING_THETA_CORE_STAR_BASE_THEOREM"
            if not replay["identity_failure_count"]
            else "FAIL_SIBLING_THETA_CORE_STAR_BASE_THEOREM"
        ),
        "symbolic_proof": True,
        "nonnegativity_reason": (
            "Whenever N or M or P is supported, k-1 is "
            "nonnegative; every displayed summand is nonnegative."
        ),
        **symbolic,
        **replay,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
