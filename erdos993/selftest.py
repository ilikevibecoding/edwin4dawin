"""Internal consistency tests (run: python3 selftest.py [NMAX_CROSS] [NMAX_BRUTE])."""

from __future__ import annotations

import sys
from collections import Counter

from checks import L_cutoff, analyze, is_unimodal
from counts import forest_counts, free_tree_counts
from indpoly import (
    brute_force_independence_polynomial,
    poly_mul,
    tree_independence_polynomial,
)
from treegen import (
    canonical_form,
    center_rooted_trees,
    level_sequence_to_parents,
    parents_to_edges,
    rooted_to_parents,
    wrom_level_sequences,
)


def test_generators_agree(nmax: int) -> None:
    t = free_tree_counts(nmax)
    for n in range(1, nmax + 1):
        wrom = Counter(canonical_form(level_sequence_to_parents(ls)) for ls in wrom_level_sequences(n))
        centre = Counter(center_rooted_trees(n))
        assert all(v == 1 for v in wrom.values()), f"WROM produced a duplicate at n={n}"
        assert all(v == 1 for v in centre.values()), f"centre generator produced a duplicate at n={n}"
        assert wrom == centre, f"generators disagree at n={n}"
        assert len(wrom) == t[n], f"count mismatch at n={n}: {len(wrom)} vs Otter {t[n]}"
        # canonical_form must be idempotent on the centre representative
        for c in centre:
            assert canonical_form(rooted_to_parents(c)) == c, f"canonical form not idempotent at n={n}"
        print(f"  n={n:2d}: {t[n]:6d} trees, both generators agree, all canonical forms distinct")


def test_polynomials_vs_bruteforce(nmax: int) -> None:
    for n in range(1, nmax + 1):
        cnt = 0
        for ls in wrom_level_sequences(n):
            parents = level_sequence_to_parents(ls)
            dp = tree_independence_polynomial(parents)
            bf = brute_force_independence_polynomial(n, parents_to_edges(parents))
            assert dp == bf, f"DP/brute-force mismatch at n={n}: {dp} vs {bf} ({parents})"
            assert sum(dp) == sum(bf)
            cnt += 1
        print(f"  n={n:2d}: {cnt:5d} trees, DP == brute force")


def test_forest_count_formula(nmax: int) -> None:
    t = free_tree_counts(nmax)
    f = forest_counts(nmax)
    # number of multisets of trees with total order n, computed by DP on sizes
    ways = [0] * (nmax + 1)
    ways[0] = 1
    for size in range(1, nmax + 1):
        k = t[size]
        # multiply by 1/(1-x^size)^k  => choose multiset of trees of this size
        new = [0] * (nmax + 1)
        for m in range(nmax + 1):
            if ways[m] == 0:
                continue
            j = 0
            while m + j * size <= nmax:
                # multisets of size j from k types: C(k + j - 1, j)
                from math import comb

                new[m + j * size] += ways[m] * comb(k + j - 1, j)
                j += 1
        ways = new
    assert ways == f, (ways, f)
    print(f"  forest counts (Euler transform) agree with direct multiset counting up to n={nmax}")


def test_known_polynomials() -> None:
    # path P_4: 1 + 4x + 3x^2 ; star K_{1,3}: 1 + 4x + 3x^2 + x^3 ; P_5: 1+5x+6x^2+x^3
    assert tree_independence_polynomial([-1, 0, 1, 2]) == [1, 4, 3]
    assert tree_independence_polynomial([-1, 0, 0, 0]) == [1, 4, 3, 1]
    assert tree_independence_polynomial([-1, 0, 1, 2, 3]) == [1, 5, 6, 1]
    # product for forests: 2 K_2 = (1+2x)^2
    assert poly_mul([1, 2], [1, 2]) == [1, 4, 4]
    # L cutoff values: alpha=1..8 -> ceil((2a-1)/3)
    assert [L_cutoff(a) for a in range(1, 9)] == [1, 1, 2, 3, 3, 4, 5, 5]
    assert is_unimodal([1, 2, 2, 3, 1]) and not is_unimodal([1, 3, 2, 3]) and is_unimodal([5])
    rep = analyze([1, 4, 3, 1])
    assert rep.alpha == 3 and rep.L == 2 and rep.unimodal and rep.tail_ok
    print("  known polynomials and helper functions OK")


if __name__ == "__main__":
    nmax_cross = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    nmax_brute = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    print("[1] known values")
    test_known_polynomials()
    print("[2] WROM generator vs centre generator vs Otter counts")
    test_generators_agree(nmax_cross)
    print("[3] rooted DP vs brute force over all subsets")
    test_polynomials_vs_bruteforce(nmax_brute)
    print("[4] forest count formula")
    test_forest_count_formula(20)
    print("ALL SELFTESTS PASSED")
