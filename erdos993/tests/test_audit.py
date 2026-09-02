"""Fast tests for the independent audit implementation (``audit/``) and its
agreement with ``erdos993lib``.  Total runtime is a few seconds."""

from __future__ import annotations

import os
import random
import sys
from fractions import Fraction
from math import ceil, comb

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from audit import checks_audit as A_checks  # noqa: E402
from audit import indpoly_audit as A_poly  # noqa: E402
from audit import trees_audit as A_trees  # noqa: E402
from erdos993lib import checks as L_checks  # noqa: E402
from erdos993lib import families as L_fam  # noqa: E402
from erdos993lib import indpoly as L_poly  # noqa: E402
from erdos993lib import trees as L_trees  # noqa: E402

try:  # optional third check
    import networkx as nx
except Exception:  # pragma: no cover
    nx = None


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def random_attachment_tree(n: int, rng: random.Random):
    edges = [(rng.randrange(v), v) for v in range(1, n)]
    return n, edges


def random_graph(n: int, p: float, rng: random.Random):
    return n, [(u, v) for u in range(n) for v in range(u + 1, n) if rng.random() < p]


def all_polys_both(n: int, edges):
    return (
        A_poly.indpoly_recursive(n, edges),
        A_poly.indpoly_recursive(n, edges, split_components=False),
        A_poly.indpoly_forest_recursive(n, edges, require_forest=False),
    )


# --------------------------------------------------------------------------- #
# deletion recursion vs brute force
# --------------------------------------------------------------------------- #
def test_recursion_matches_bruteforce_on_random_trees():
    rng = random.Random(2024)
    for _ in range(80):
        n = rng.randint(1, 12)
        n, edges = random_attachment_tree(n, rng)
        expected = L_poly.indpoly_bruteforce(n, edges)
        for p in all_polys_both(n, edges):
            assert p == expected, (n, edges)
        assert A_poly.indpoly_forest_recursive(n, edges) == expected
        assert p[-1] != 0 and p[0] == 1 and p[1] == n


def test_recursion_matches_bruteforce_on_prufer_trees():
    rng = random.Random(7)
    for _ in range(40):
        n, edges = L_fam.random_tree(rng.randint(2, 13), rng)
        assert A_poly.indpoly_recursive(n, edges) == L_poly.indpoly_bruteforce(n, edges)


def test_recursion_works_for_non_forests():
    graphs = []
    for n in range(3, 11):  # cycles
        graphs.append((n, [(i, (i + 1) % n) for i in range(n)]))
    for n in range(1, 9):  # complete graphs
        graphs.append((n, [(u, v) for u in range(n) for v in range(u + 1, n)]))
    graphs.append((6, [(u, v) for u in range(3) for v in range(3, 6)]))  # K_{3,3}
    petersen = [(i, (i + 1) % 5) for i in range(5)] + [(i, i + 5) for i in range(5)] + [(5 + i, 5 + (i + 2) % 5) for i in range(5)]
    graphs.append((10, petersen))
    graphs.append((7, [(0, i) for i in range(1, 7)] + [(i, i % 6 + 1) for i in range(1, 7)]))  # wheel W_6
    rng = random.Random(11)
    for _ in range(30):
        graphs.append(random_graph(rng.randint(1, 11), rng.choice([0.2, 0.4, 0.7]), rng))
    for n, edges in graphs:
        expected = L_poly.indpoly_bruteforce(n, edges)
        for p in all_polys_both(n, edges):
            assert p == expected, (n, edges)
    with pytest.raises(ValueError):
        A_poly.indpoly_forest_recursive(3, [(0, 1), (1, 2), (2, 0)])


def test_closed_forms():
    for n in range(1, 16):
        # path: p_k = C(n - k + 1, k); star: (1 + x)^(n-1) + x; K_n: 1 + n x
        assert A_poly.indpoly_recursive(*L_fam.path(n)) == [comb(n - k + 1, k) for k in range(0, (n + 1) // 2 + 1) if comb(n - k + 1, k)]
        star = [comb(n - 1, k) for k in range(n)]
        if n >= 2:
            star[1] += 1
        else:
            star = [1, 1]
        assert A_poly.indpoly_recursive(*L_fam.star(n)) == star
        assert A_poly.indpoly_recursive(n, [(u, v) for u in range(n) for v in range(u + 1, n)]) == ([1, n] if n >= 1 else [1])
    for n in range(3, 16):  # cycle: p_k = n/(n-k) C(n-k, k)
        cyc = [n * comb(n - k, k) // (n - k) for k in range(0, n // 2 + 1)]
        assert A_poly.indpoly_recursive(n, [(i, (i + 1) % n) for i in range(n)]) == cyc


def test_forest_of_many_small_components_n60():
    # 10 paths P_6 plus 0 isolated vertices: 60 vertices, product of ten copies of I(P_6)
    edges = []
    for c in range(10):
        base = 6 * c
        edges += [(base + i, base + i + 1) for i in range(5)]
    p = A_poly.indpoly_forest_recursive(60, edges)
    assert p == L_poly.indpoly_forest(60, edges)
    p6 = A_poly.indpoly_recursive(*L_fam.path(6))
    prod = [1]
    for _ in range(10):
        prod = A_poly.poly_mul(prod, p6)
    assert p == prod


def test_single_trees_of_order_30_and_40_are_fast_and_agree():
    rng = random.Random(30)
    for n in (30, 30, 30, 40, 40):
        n, edges = L_fam.random_tree(n, rng)
        rec = A_poly.DeletionRecursion(n, edges)
        assert rec.poly() == L_poly.indpoly_forest(n, edges)
        assert rec.calls < 5000
    for g in (L_fam.path(40), L_fam.star(40), L_fam.T3mn(6, 6), L_fam.caterpillar([2] * 13)):
        assert A_poly.indpoly_recursive(*g) == L_poly.indpoly_forest(*g)


def test_polynomial_helpers():
    assert A_poly.poly_add([1, 2], [0, 0, 3]) == [1, 2, 3]
    assert A_poly.poly_add([1, 2], [0, -2]) == [1]
    assert A_poly.poly_mul([1, 1], [1, 1]) == [1, 2, 1]
    assert A_poly.poly_mul([], [1]) == []
    assert A_poly.poly_times_x([1, 1]) == [0, 1, 1]
    assert A_poly.binomial_poly(4) == [1, 4, 6, 4, 1]
    assert A_poly.connected_components(5, [(0, 1), (3, 4)]) == [[0, 1], [2], [3, 4]]
    assert A_poly.is_forest(4, [(0, 1), (1, 2), (2, 3)])
    assert not A_poly.is_forest(3, [(0, 1), (1, 2), (2, 0)])
    assert not A_poly.is_forest(2, [(0, 1), (1, 0)])
    with pytest.raises(ValueError):
        A_poly.neighbour_masks(2, [(0, 0)])
    with pytest.raises(ValueError):
        A_poly.neighbour_masks(2, [(0, 2)])


# --------------------------------------------------------------------------- #
# tree / forest enumeration
# --------------------------------------------------------------------------- #
def test_beyer_hedetniemi_rooted_counts_A000081():
    for n in range(1, 13):
        assert A_trees.count_rooted_trees(n) == A_trees.A000081[n]
    assert list(A_trees.rooted_level_sequences(4)) == [[1, 2, 3, 4], [1, 2, 3, 3], [1, 2, 3, 2], [1, 2, 2, 2]]
    # every generated sequence is a canonical level sequence and distinct
    seqs = [tuple(s) for s in A_trees.rooted_level_sequences(9)]
    assert len(seqs) == len(set(seqs))
    for s in seqs:
        assert s[0] == 1 and all(1 <= s[i + 1] <= s[i] + 1 for i in range(len(s) - 1))


def test_free_tree_counts_A000055():
    for n in range(0, 13):
        assert A_trees.count_free_trees(n) == A_trees.A000055[n] == L_trees.A000055[n]


def test_free_tree_representatives_are_pairwise_non_isomorphic_trees():
    for n in range(1, 11):
        reps = A_trees.free_tree_list(n)
        codes = set()
        for parent in reps:
            assert parent[0] == -1 and all(0 <= parent[v] < v for v in range(1, n))
            edges = A_trees.parent_to_edges(parent)
            assert len(edges) == n - 1 and A_poly.is_forest(n, edges)
            code = A_trees.free_canonical_form(parent)
            assert code not in codes
            codes.add(code)
            # the representative is rooted at a centre
            assert 0 in A_trees.tree_centres(A_trees.parent_to_adjacency(parent))


def test_canonical_form_is_relabelling_invariant():
    rng = random.Random(5)
    for _ in range(50):
        n, edges = L_fam.random_tree(rng.randint(2, 14), rng)
        code = A_trees.free_canonical_form_edges(n, edges)
        perm = list(range(n))
        rng.shuffle(perm)
        relabelled = [(perm[u], perm[v]) for u, v in edges]
        assert A_trees.free_canonical_form_edges(n, relabelled) == code
    # different trees, different codes
    assert A_trees.free_canonical_form_edges(*L_fam.path(5)) != A_trees.free_canonical_form_edges(*L_fam.star(5))


def test_root_is_centre_matches_leaf_stripping():
    for n in range(1, 11):
        for seq in A_trees.rooted_level_sequences(n):
            parent = A_trees.level_sequence_to_parent(seq)
            flag, diam = A_trees.root_is_centre(parent)
            centres = A_trees.tree_centres(A_trees.parent_to_adjacency(parent))
            assert flag == (0 in centres), seq
            assert len(centres) in (1, 2) and (len(centres) == 2) == (diam % 2 == 1)


@pytest.mark.skipif(nx is None, reason="networkx not installed")
def test_free_trees_agree_with_networkx():
    for n in range(2, 11):
        nx_codes = set()
        for g in nx.nonisomorphic_trees(n):
            nx_codes.add(A_trees.free_canonical_form_edges(n, list(g.edges())))
        my_codes = {A_trees.free_canonical_form(p) for p in A_trees.free_trees(n)}
        assert nx_codes == my_codes and len(my_codes) == A_trees.A000055[n]


def test_forest_counts_A005195():
    counts = [1] + [A_trees.count_free_trees(s) for s in range(1, 11)]
    for n in range(0, 11):
        assert A_trees.count_forests(n, counts) == A_trees.A005195[n] == L_trees.A005195[n]
        assert A_trees.count_forests_formula(n, counts) == A_trees.A005195[n]


def test_forest_specs_build_forests_exactly_once():
    cache = {s: A_trees.free_tree_list(s) for s in range(1, 9)}
    counts = [1] + [len(cache[s]) for s in range(1, 9)]
    for n in range(1, 9):
        seen = set()
        for spec in A_trees.forest_specs(n, counts):
            order, edges = A_trees.forest_graph(spec, cache)
            assert order == n and A_poly.is_forest(order, edges)
            # canonical form of a forest: sorted component codes
            comps = A_poly.connected_components(order, edges)
            codes = []
            for comp in comps:
                local = {v: i for i, v in enumerate(comp)}
                sub = [(local[u], local[v]) for u, v in edges if u in local and v in local]
                codes.append(A_trees.free_canonical_form_edges(len(comp), sub))
            key = tuple(sorted(codes))
            assert key not in seen
            seen.add(key)
        assert len(seen) == A_trees.A005195[n]


# --------------------------------------------------------------------------- #
# agreement of polynomial multisets with the library enumeration
# --------------------------------------------------------------------------- #
def test_tree_polynomial_multisets_agree_n_le_10():
    for n in range(1, 11):
        mine = sorted(tuple(A_poly.indpoly_parent_array_recursive(p)) for p in A_trees.free_trees(n))
        theirs = sorted(tuple(q) for q in L_trees.tree_polys(n))
        assert mine == theirs, n
        for p in A_trees.free_trees(n):
            assert A_poly.indpoly_parent_array_recursive(p) == L_poly.indpoly_parent_array(p)


def test_forest_polynomial_multisets_agree_n_le_10():
    cache = {s: A_trees.free_tree_list(s) for s in range(1, 11)}
    counts = [1] + [len(cache[s]) for s in range(1, 11)]
    for n in range(1, 11):
        mine = []
        for spec in A_trees.forest_specs(n, counts):
            order, edges = A_trees.forest_graph(spec, cache)
            p = A_poly.indpoly_forest_recursive(order, edges)
            assert p == L_poly.indpoly_forest(order, edges)
            mine.append(tuple(p))
        theirs = sorted(tuple(q) for _s, _i, q in L_trees.forest_polys(n))
        assert sorted(mine) == theirs, n


# --------------------------------------------------------------------------- #
# checks
# --------------------------------------------------------------------------- #
def test_tail_cutoff_definition():
    for a in range(0, 40):
        assert A_checks.tail_cutoff(a) == ceil(Fraction(2 * a - 1, 3)) == L_checks.tail_cutoff(a)
    assert [A_checks.tail_cutoff(a) for a in range(0, 8)] == [0, 1, 1, 2, 3, 3, 4, 5]


def test_shape_predicates_on_synthetic_sequences():
    assert A_checks.is_unimodal([1])
    assert A_checks.is_unimodal([1, 5, 5, 2])
    assert A_checks.is_unimodal([5, 4, 3])
    assert not A_checks.is_unimodal([1, 3, 2, 3])
    assert not A_checks.is_unimodal([2, 1, 2])
    assert A_checks.is_log_concave([1, 4, 6, 4, 1])
    assert not A_checks.is_log_concave([1, 2, 5, 1])
    assert A_checks.log_concavity_failures([1, 1, 3, 1]) == [1]
    assert A_checks.modes([1, 3, 3, 2]) == [1, 2]
    assert A_checks.iso_quantity([1, 3, 2, 1], 1) == 1 * 9 + 1 - 2 * 1 * 2
    assert A_checks.wr_ratio([2, 4, 1], 1) == Fraction(1, 2)
    with pytest.raises(ValueError):
        A_checks.alpha([1, 0])


def test_checks_agree_with_library_on_trees_and_synthetic_polys():
    polys = [[1], [1, 1], [1, 2], [1, 2, 1], [1, 3, 2, 3, 1], [1, 2, 3, 3, 2, 1], [1, 5, 4, 6], [3, 1, 2], [1, 2, 5, 2],
             [1, 10, 30, 20, 40, 5, 1], [1, 7, 15, 10, 1, 1], [1, 3, 3, 1, 1, 1, 1], [1, 8, 20, 18, 5, 2]]
    for n in range(1, 11):
        polys.extend(A_poly.indpoly_parent_array_recursive(p) for p in A_trees.free_trees(n))
    for g in (L_fam.T3mn(4, 4), L_fam.T3mn_star(3, 4), L_fam.T3mn(5, 6), L_fam.path(33), L_fam.spider([3, 3, 3, 3, 3])):
        polys.append(A_poly.indpoly_recursive(*g))
    for p in polys:
        mine = A_checks.analyze(p)
        theirs = L_checks.analyze(p)
        assert set(mine) == set(theirs)
        for key in mine:
            assert mine[key] == theirs[key], (p, key, mine[key], theirs[key])
        assert A_checks.is_unimodal(p) == L_checks.is_unimodal(p)
        assert A_checks.is_log_concave(p) == L_checks.is_log_concave(p)
        a = A_checks.alpha(p)
        for r in range(1, a):
            assert A_checks.iso_quantity(p, r) == L_checks.iso_value(p, r)
            assert A_checks.iso_margin(p, r) == L_checks.iso_margin(p, r)
        for r in range(1, a + 1):
            assert A_checks.wr_holds(p, r) == (L_checks.wr_slack(p, r) >= 0)


def test_order_26_witnesses_not_log_concave_but_unimodal():
    for g in (L_fam.T3mn(4, 4), L_fam.T3mn_star(3, 4)):
        n, edges = g
        assert n == 26
        p = A_poly.indpoly_recursive(n, edges)
        assert p == L_poly.indpoly_forest(n, edges)
        a = A_checks.alpha(p)
        assert a == 14 and A_checks.tail_cutoff(a) == 9
        assert A_checks.log_concavity_failures(p) == [13] == [a - 1]
        assert not A_checks.is_log_concave(p)
        assert A_checks.is_unimodal(p)
        assert A_checks.wr_failures(p) == [] and A_checks.iso_failures(p) == [] and A_checks.tail_failures(p) == []
        assert A_checks.hypotheses_hold(p)
        assert p[13] ** 2 < p[12] * p[14]
