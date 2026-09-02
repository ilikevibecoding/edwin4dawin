"""Framework consistency over all trees of order n <= 12.

Every tree must have a unimodal independence sequence, must satisfy the
Levit–Mandrescu tail property and the descent-propagation lemma must never be
inconsistent.  ``WR_r`` / ``ISO_r`` failures with ``r <= L(alpha)`` are *not*
assumed to be absent: they are collected and reported (as pytest properties
and on stdout) with the tree's parent array, ``n``, ``r`` and polynomial.
"""

import pytest

from erdos993.checks import (
    descent_propagation_check,
    is_unimodal,
    iso_failures,
    iso_values,
    tail_cutoff,
    tail_failures,
    unimodality_via_framework,
    wr_failures,
)
from erdos993.enumerate import iter_trees
from erdos993.indpoly import independence_polynomial_parent_array
from erdos993.scan import scan_order

MAX_N = 12


def collect(n):
    polys = []
    wr_bad = []
    iso_bad = []
    for parents in iter_trees(n):
        poly = independence_polynomial_parent_array(parents)
        cutoff = tail_cutoff(len(poly) - 1)
        polys.append((parents, poly))
        for r in wr_failures(poly):
            if r <= cutoff:
                wr_bad.append((n, r, parents, poly))
        for r in iso_failures(poly):
            iso_bad.append((n, r, parents, poly, iso_values(poly)[r - 1], r <= cutoff))
    return polys, wr_bad, iso_bad


@pytest.mark.parametrize("n", range(1, MAX_N + 1))
def test_all_trees_are_unimodal_and_framework_consistent(n, record_property):
    polys, wr_bad, iso_bad = collect(n)
    assert polys
    for parents, poly in polys:
        assert is_unimodal(poly), (parents, poly)
        assert tail_failures(poly) == [], (parents, poly)
        report = descent_propagation_check(poly)
        assert report.consistent, (parents, poly)
        result = unimodality_via_framework(poly)
        assert result.unimodal
        cutoff = tail_cutoff(len(poly) - 1)
        expect_hypotheses = not [r for r in wr_failures(poly) if r <= cutoff] and not [
            r for r in iso_failures(poly) if r <= cutoff
        ]
        assert result.hypotheses_hold == expect_hypotheses
        assert result.certified == expect_hypotheses

    record_property("trees", len(polys))
    record_property("wr_failures_below_cutoff", [(n, r, list(p), poly) for n, r, p, poly in wr_bad])
    record_property("iso_failures", [(n, r, list(p), poly, q, below) for n, r, p, poly, q, below in iso_bad])
    print(
        f"\nn={n}: {len(polys)} trees, WR failures with r<=L: {len(wr_bad)}, "
        f"ISO failures (any r): {len(iso_bad)}"
    )
    for item in wr_bad:
        print(f"  WR failure: n={item[0]} r={item[1]} parents={' '.join(map(str, item[2]))} poly={item[3]}")
    for item in iso_bad:
        print(
            f"  ISO failure: n={item[0]} r={item[1]} Q_r={item[4]} (r<=L: {item[5]}) "
            f"parents={' '.join(map(str, item[2]))} poly={item[3]}"
        )


def test_q1_equals_3n_minus_1_for_every_tree():
    for n in range(3, 11):
        for parents in iter_trees(n):
            poly = independence_polynomial_parent_array(parents)
            assert iso_values(poly)[0] == 3 * n - 1


def test_scan_statistics_agree_with_direct_collection():
    for n in range(1, 10):
        polys, wr_bad, iso_bad = collect(n)
        stats = scan_order(n)
        assert stats.trees == len(polys)
        assert stats.non_unimodal_trees == 0
        assert stats.tail_fail_pairs == 0
        assert stats.lemma_inconsistent_trees == 0
        assert stats.wr_fail_cut_pairs == len(wr_bad)
        assert stats.iso_fail_pairs == len(iso_bad)
        assert stats.framework_certified_trees + stats.framework_gap_trees == stats.trees
        if n >= 3:
            assert stats.min_q is not None and stats.min_q.value == 3 * n - 1 and stats.min_q.r == 1
            assert type(stats.min_q.value) is int
