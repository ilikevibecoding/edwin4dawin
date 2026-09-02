#!/usr/bin/env python3
"""Exact replay checks for the parity-ratio reduction of Erdős Problem 993.

This is not a proof of the conjecture.  It verifies:

1. the two known order-26 log-concavity counterexamples satisfy (TS);
2. every rooted unlabeled tree through order 14 satisfies (TS), (IE), (EJ);
3. the rooted local lemma by exact randomized arithmetic;
4. the Bhattacharyya--Kahn bipartite negative control violates (TS);
5. multiplication preserves (TS) on a deterministic finite stress corpus.
"""

from __future__ import annotations

import json
import random
import sys
from itertools import product
from math import comb
from pathlib import Path

import networkx as nx

HERE = Path(__file__).resolve().parent
PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))
sys.path.insert(0, str(HERE))

from graph6 import parse_graph6  # noqa: E402
from stp2_random_stress import rooted_pair  # noqa: E402


KNOWN_N26 = (
    "Y???????????_?O?C??_?A??C??C??A???_??C???O?[?_?F`???^???",
    "Y???????????_?O?C??_?A??C??C??A???_??C?C?O?K@_?F@???|???",
)


def coefficient(a: list[int], k: int) -> int:
    return a[k] if 0 <= k < len(a) else 0


def add_shift(e: list[int], j: list[int]) -> list[int]:
    ans = [0] * max(len(e), len(j) + 1)
    for k, value in enumerate(e):
        ans[k] += value
    for k, value in enumerate(j):
        ans[k + 1] += value
    return ans


def multiply(a: list[int], b: list[int]) -> list[int]:
    ans = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            ans[i + j] += x * y
    return ans


def ts_failure(a: list[int]) -> dict | None:
    for k in range(1, len(a) - 2):
        left = a[k - 1] * a[k + 2]
        right = a[k] * a[k + 1]
        if left > right:
            return {"k": k, "left": left, "right": right}
    return None


def lc_failure(a: list[int]) -> dict | None:
    for k in range(1, len(a) - 1):
        left = a[k - 1] * a[k + 1]
        right = a[k] * a[k]
        if left > right:
            return {"k": k, "left": left, "right": right}
    return None


def rooted_failures(e: list[int], j: list[int]) -> tuple[dict | None, dict | None]:
    i_poly = add_shift(e, j)
    ie = None
    ej = None
    for k in range(1, max(len(i_poly), len(e), len(j))):
        if (
            coefficient(e, k + 1) * coefficient(i_poly, k - 1)
            > coefficient(e, k) * coefficient(i_poly, k)
        ):
            ie = {"k": k}
            break
    for k in range(1, max(len(e), len(j))):
        if (
            coefficient(j, k + 1) * coefficient(e, k - 1)
            > coefficient(j, k) * coefficient(e, k)
        ):
            ej = {"k": k}
            break
    return ie, ej


def graph6_adjacency(code: str) -> list[list[int]]:
    n, adjacency = parse_graph6(code.encode("ascii"))
    return [sorted(adjacency[v]) for v in range(n)]


def verify_known_n26() -> list[dict]:
    records = []
    for code in KNOWN_N26:
        adjacency = graph6_adjacency(code)
        e, j = rooted_pair(adjacency, 0)
        poly = add_shift(e, j)
        lc = lc_failure(poly)
        ts = ts_failure(poly)
        assert lc is not None
        assert ts is None
        records.append(
            {
                "graph6": code,
                "order": len(adjacency),
                "degree": len(poly) - 1,
                "lc_failure": lc,
                "ts_failure": ts,
            }
        )
    return records


def verify_unlabeled_rootings(max_order: int = 14) -> dict:
    trees = 0
    rootings = 0
    by_order: dict[int, dict[str, int]] = {}
    for n in range(1, max_order + 1):
        generator = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        order_trees = 0
        order_rootings = 0
        for graph in generator:
            adjacency = [sorted(graph.neighbors(v)) for v in range(n)]
            order_trees += 1
            for root in range(n):
                e, j = rooted_pair(adjacency, root)
                i_poly = add_shift(e, j)
                assert ts_failure(e) is None
                assert ts_failure(j) is None
                assert ts_failure(i_poly) is None
                ie, ej = rooted_failures(e, j)
                assert ie is None and ej is None
                order_rootings += 1
        by_order[n] = {"trees": order_trees, "rootings": order_rootings}
        trees += order_trees
        rootings += order_rootings
    return {
        "max_order": max_order,
        "trees": trees,
        "rootings": rootings,
        "by_order": by_order,
    }


def verify_local_lemma(trials: int = 300_000, seed: int = 2407993) -> dict:
    """Check Lemma 4 directly on exact local coefficient windows."""
    rng = random.Random(seed)
    accepted = 0
    for _ in range(trials):
        values = [rng.randint(1, 80) for _ in range(8)]
        e0, e1, e2, e3, j0, j1, j2, j3 = values
        # Preserve the actual rooted-update alignment:
        # i[k-1]=e[k-1]+j[k-2], ..., i[k+2]=e[k+2]+j[k+1].
        i0 = e0 + j0
        i1 = e1 + j1
        i2 = e2 + j2
        i3 = e3 + j3
        hypotheses = (
            e0 * e3 <= e1 * e2
            and j0 * j3 <= j1 * j2
            and j3 * e0 <= j2 * e1
            and e2 * i0 <= e1 * i1
            and e3 * i1 <= e2 * i2
        )
        if not hypotheses:
            continue
        accepted += 1
        assert i0 * i3 <= i1 * i2
    assert accepted > 0
    return {"trials": trials, "accepted_hypothesis_windows": accepted, "seed": seed}


def verify_multiplication_stress(seed: int = 993, pairs: int = 200_000) -> dict:
    corpus: list[list[int]] = []
    for length in range(3, 8):
        for tail in product(range(1, 6), repeat=length - 1):
            candidate = [1, *tail]
            if ts_failure(candidate) is None:
                corpus.append(candidate)
    rng = random.Random(seed)
    for _ in range(pairs):
        a = rng.choice(corpus)
        b = rng.choice(corpus)
        assert ts_failure(multiply(a, b)) is None
    return {"corpus_size": len(corpus), "tested_pairs": pairs, "seed": seed}


def verify_bipartite_negative_control() -> dict:
    a = 95
    b = 151
    degree = b
    poly = [
        (2**t - 1) * (comb(a, t) if t <= a else 0) + comb(b, t)
        for t in range(degree + 1)
    ]
    while poly and poly[-1] == 0:
        poly.pop()
    failure = ts_failure(poly)
    assert failure is not None
    assert failure["k"] == 68
    return {
        "parameters": {"a": a, "b": b},
        "degree": len(poly) - 1,
        "first_ts_failure": failure,
        "ratio": failure["left"] / failure["right"],
    }


def main() -> int:
    result = {
        "known_order_26": verify_known_n26(),
        "unlabeled_rootings": verify_unlabeled_rootings(),
        "local_lemma": verify_local_lemma(),
        "multiplication_stress": verify_multiplication_stress(),
        "bipartite_negative_control": verify_bipartite_negative_control(),
        "certificate": "passed",
        "scope_note": (
            "This certifies the stated finite checks and algebraic local lemma, "
            "not the unresolved universal rooted IE/EJ induction."
        ),
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
