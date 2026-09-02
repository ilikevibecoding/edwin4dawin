import random
from fractions import Fraction
from math import comb

import pytest

from erdos993lib.checks import (
    alpha,
    analyze,
    is_log_concave,
    is_unimodal,
    iso_margin,
    iso_value,
    tail_cutoff,
    wr_slack,
)
from erdos993lib.families import (
    T3mn,
    T3mn_star,
    bush,
    double_broom,
    path,
    random_tree,
    spider,
    star,
)
from erdos993lib.indpoly import indpoly_bruteforce, indpoly_forest, indpoly_parent_array, poly_mul
from erdos993lib.trees import (
    A000055,
    A005195,
    canonical_form,
    euler_transform,
    forest_polys,
    free_tree_layouts,
    free_trees,
    layout_to_parent,
    parent_to_edges,
)


def test_poly_mul_and_bruteforce_agree_on_random_trees():
    rng = random.Random(12345)
    for _ in range(300):
        n = rng.randrange(1, 14)
        g = random_tree(n, rng)
        assert indpoly_forest(*g) == indpoly_bruteforce(*g)


def test_known_polynomials():
    assert indpoly_forest(*path(1)) == [1, 1]
    assert indpoly_forest(*path(2)) == [1, 2]
    assert indpoly_forest(*path(3)) == [1, 3, 1]
    # path P_n: p_r = C(n-r+1, r)
    for n in range(1, 15):
        p = indpoly_forest(*path(n))
        assert p == [comb(n - r + 1, r) for r in range(0, (n + 1) // 2 + 1)]
    # star K_{1,m}: (1+x)^m + x
    for m in range(2, 12):
        p = indpoly_forest(*star(m + 1))
        expected = [comb(m, r) for r in range(m + 1)]
        expected[1] += 1
        assert p == expected
    # empty forest on n vertices: (1+x)^n
    assert indpoly_forest(5, []) == [comb(5, r) for r in range(6)]


def test_forest_polynomial_is_product_of_components():
    g1 = star(6)
    g2 = path(7)
    n1, e1 = g1
    n2, e2 = g2
    edges = e1 + [(u + n1, v + n1) for u, v in e2]
    assert indpoly_forest(n1 + n2, edges) == poly_mul(indpoly_forest(*g1), indpoly_forest(*g2))


def test_non_forest_rejected():
    with pytest.raises(ValueError):
        indpoly_forest(3, [(0, 1), (1, 2), (2, 0)])


def test_tree_counts_and_canonical_forms():
    for n in range(1, 14):
        parents = list(free_trees(n))
        assert len(parents) == A000055[n]
        assert len({canonical_form(p) for p in parents}) == A000055[n]
        for p in parents:
            assert p[0] == -1 and all(0 <= p[v] < v for v in range(1, n))


def test_forest_counts_and_euler_transform():
    assert euler_transform(A000055[:20]) == A005195[:20]
    for n in range(1, 12):
        assert sum(1 for _ in forest_polys(n)) == A005195[n]


def test_layout_to_parent_matches_edges():
    for layout in free_tree_layouts(9):
        parent = layout_to_parent(layout)
        edges = parent_to_edges(parent)
        assert len(edges) == 8
        assert indpoly_parent_array(parent) == indpoly_forest(9, edges)


def test_tail_cutoff():
    assert [tail_cutoff(a) for a in range(0, 10)] == [0, 1, 1, 2, 3, 3, 4, 5, 5, 6]


def test_checks_basic():
    assert is_unimodal([1, 3, 3, 1]) and is_unimodal([1, 2, 2, 1, 1]) and not is_unimodal([1, 2, 1, 2])
    assert is_log_concave([1, 3, 3, 1]) and not is_log_concave([1, 1, 2])
    p = [1, 5, 6, 4, 1]  # star K_{1,4}
    assert iso_value(p, 2) == 2 * 36 + 25 - 3 * 5 * 4
    assert wr_slack(p, 2) == 2 * 6 - 5
    assert alpha(p) == 4


def test_star_iso2_closed_form():
    for n in range(4, 60):
        p = indpoly_forest(*star(n))
        assert iso_value(p, 2) == (n - 1) * (n - 2) + n * n
        assert iso_margin(p, 2) == Fraction(2, n) + Fraction(2 * n, (n - 1) * (n - 2))


def test_iso1_iso2_closed_forms_all_trees_small():
    # Q_1 = n + 1 + 2e and Q_2 = 2 p_2^2 + n^2 - 3 n p_3 with p_3 = C(n,3) - e(n-2) + S
    for n in range(4, 12):
        for parent in free_trees(n):
            edges = parent_to_edges(parent)
            p = indpoly_parent_array(parent)
            e = n - 1
            deg = [0] * n
            for u, v in edges:
                deg[u] += 1
                deg[v] += 1
            S = sum(comb(d, 2) for d in deg)
            coef = lambda k: p[k] if k < len(p) else 0  # noqa: E731
            assert coef(2) == comb(n, 2) - e
            assert coef(3) == comb(n, 3) - e * (n - 2) + S
            assert iso_value(p, 1) == n + 1 + 2 * e
            if len(p) > 3:
                assert iso_value(p, 2) > 0
            else:
                assert 2 * coef(2) ** 2 + n * n - 3 * n * coef(3) > 0


def test_known_non_log_concave_trees():
    for g, order in ((T3mn(4, 4), 26), (T3mn_star(3, 4), 26)):
        assert g[0] == order
        p = indpoly_forest(*g)
        a = analyze(p)
        assert not a["log_concave"] and a["lc_failures"] == [a["alpha"] - 1]
        assert a["unimodal"]
        assert a["iso_failures_prefix"] == [] and a["iso_failures_all_indices"] == []
        assert a["wr_failures_prefix"] == [] and a["tail_failures"] == []
    assert bush([3, 4, 4]) == T3mn(4, 4)


def test_analyze_hypotheses_imply_unimodal_on_all_small_trees():
    for n in range(1, 13):
        for parent in free_trees(n):
            a = analyze(indpoly_parent_array(parent))
            assert a["wr_iso_tail_hypotheses_hold"]
            assert a["unimodal"]


def test_wr3_bounds_all_small_forests_and_trees():
    # Theorem 11.2 of docs/REDUCTION_LEMMA_AND_PROVED_CASES.md:
    # forests: 3 p_3 - p_2 >= (n-1)(n-2)(n-7)/2 (n >= 7); trees: >= ((n-2)(n-3)(n-4) - (n-1)(n-2))/2 (n >= 6)
    for n in range(1, 13):
        for sizes, idxs, p in forest_polys(n):
            coef = lambda k: p[k] if k < len(p) else 0  # noqa: E731
            e = n - len(sizes)
            lhs = 3 * coef(3) - coef(2)
            assert 2 * lhs >= n * (n - 1) * (n - 2) - n * (n - 1) - 2 * e * (3 * n - 7)
            if n >= 7:
                assert 2 * lhs >= (n - 1) * (n - 2) * (n - 7)
            a = len(p) - 1
            if 3 <= tail_cutoff(a) - 1:
                assert lhs >= 0
    for n in range(6, 15):
        for parent in free_trees(n):
            p = indpoly_parent_array(parent)
            assert 2 * (3 * p[3] - p[2]) >= (n - 2) * (n - 3) * (n - 4) - (n - 1) * (n - 2) >= 0


def test_spider_and_double_broom_shapes():
    n, edges = spider([1, 2, 3])
    assert n == 7 and len(edges) == 6
    n, edges = double_broom(3, 3, 2)
    assert n == 8 and len(edges) == 7
