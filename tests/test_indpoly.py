"""Tests for exact independence polynomials of forests."""

import random
from math import comb

import networkx as nx
import pytest

from erdos993.enumerate import iter_trees
from erdos993.indpoly import (
    attach_leaf,
    broom,
    caterpillar,
    double_broom,
    independence_number,
    independence_polynomial,
    independence_polynomial_bruteforce,
    independence_polynomial_forest,
    independence_polynomial_nx,
    independence_polynomial_parent_array,
    parent_array_to_edges,
    parent_array_to_nx,
    path,
    poly_add,
    poly_mul,
    poly_prod,
    poly_to_string,
    product,
    spider,
    star,
    validate_parent_array,
)


def path_edges(n):
    return [(i, i + 1) for i in range(n - 1)]


def star_edges(m):
    return [(0, i) for i in range(1, m + 1)]


def random_forest(rng, n):
    """Random labelled forest on ``n`` vertices (random attachment, shuffled labels)."""
    labels = list(range(n))
    rng.shuffle(labels)
    edges = []
    for i in range(1, n):
        if rng.random() < 0.8:
            edges.append((labels[i], labels[rng.randrange(i)]))
    rng.shuffle(edges)
    return edges


# ---------------------------------------------------------------------------
# Known closed forms
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("n", range(1, 16))
def test_path_coefficients_are_binomials(n):
    poly = independence_polynomial_forest(n, path_edges(n))
    expected = [comb(n - k + 1, k) for k in range((n + 1) // 2 + 1)]
    assert poly == expected


@pytest.mark.parametrize("m", range(1, 12))
def test_star_polynomial(m):
    poly = independence_polynomial_forest(m + 1, star_edges(m))
    expected = [comb(m, k) for k in range(m + 1)]
    expected[1] += 1
    assert poly == expected


def test_k2_and_single_vertex_and_empty():
    assert independence_polynomial_forest(2, [(0, 1)]) == [1, 2]
    assert independence_polynomial_forest(1, []) == [1, 1]
    assert independence_polynomial_forest(0, []) == [1]


@pytest.mark.parametrize("n", range(0, 9))
def test_empty_graph_is_binomial_expansion(n):
    assert independence_polynomial_forest(n, []) == [comb(n, k) for k in range(n + 1)]


def test_disjoint_union_is_product():
    p3 = independence_polynomial_forest(3, path_edges(3))
    star = independence_polynomial_forest(4, star_edges(3))
    union_edges = path_edges(3) + [(u + 3, v + 3) for u, v in star_edges(3)]
    assert independence_polynomial_forest(7, union_edges) == poly_mul(p3, star)
    assert poly_prod([p3, star, [1, 1]]) == poly_mul(poly_mul(p3, star), [1, 1])
    assert poly_prod([]) == [1]


def test_product_equals_disjoint_union():
    parts = [path(4), star(3), path(0), path(1)]
    polys = [independence_polynomial_forest(*f) for f in parts]
    n, edges = 0, []
    for k, es in parts:
        edges += [(u + n, v + n) for u, v in es]
        n += k
    assert product(polys) == independence_polynomial_forest(n, edges) == poly_prod(polys)
    assert product([]) == [1]


def test_builders_have_expected_shape():
    assert path(0) == (0, []) and path(1) == (1, []) and path(3) == (3, [(0, 1), (1, 2)])
    assert star(0) == (1, []) and star(3) == (4, [(0, 1), (0, 2), (0, 3)])
    assert attach_leaf((2, [(0, 1)]), 1) == (3, [(0, 1), (1, 2)])
    with pytest.raises(ValueError):
        attach_leaf((2, [(0, 1)]), 2)
    assert broom(1, 4) == star(4)
    assert broom(3, 2) == (5, [(0, 1), (1, 2), (2, 3), (2, 4)])
    assert nx.is_isomorphic(nx.Graph(double_broom(2, 1, 1)[1]), nx.path_graph(4))
    assert double_broom(2, 2, 2) == (6, [(0, 1), (0, 2), (0, 3), (1, 4), (1, 5)])
    assert spider([1, 1, 1]) == star(3) and spider([2]) == path(3) and spider([]) == (1, [])
    assert caterpillar([1, 0, 2]) == (6, [(0, 1), (1, 2), (0, 3), (2, 4), (2, 5)])
    for n, edges in (broom(4, 3), double_broom(5, 2, 3), spider([1, 2, 3]), caterpillar([2, 1, 0, 3])):
        assert nx.is_tree(nx.Graph(edges)) and len(edges) == n - 1


def test_builders_polynomials_match_bruteforce():
    for n, edges in (broom(4, 3), double_broom(5, 2, 3), spider([1, 2, 3, 1]), caterpillar([2, 1, 0, 3])):
        assert independence_polynomial_forest(n, edges) == independence_polynomial_bruteforce(n, edges)
    assert independence_polynomial_forest(*spider([1, 1, 1, 1])) == [1, 5, 6, 4, 1]
    assert independence_polynomial_forest(*attach_leaf(path(4), 1)) == [1, 5, 6, 2]


def test_large_inputs_are_fast_enough():
    n = 200
    assert independence_polynomial_forest(*path(n)) == [comb(n - k + 1, k) for k in range(n // 2 + 1)]
    assert independence_polynomial_forest(*star(n - 1))[1] == n
    poly = independence_polynomial_forest(*caterpillar([3] * 50))
    assert len(poly) == 151 and all(type(c) is int for c in poly)


def test_poly_helpers():
    assert poly_add([1, 2], [0, 0, 5]) == [1, 2, 5]
    assert poly_mul([1, 1], [1, 1]) == [1, 2, 1]
    assert poly_mul([], [1]) == []
    assert poly_to_string([1, 3, 1]) == "1 + 3x + x^2"
    assert poly_to_string([0, 0, 2]) == "2x^2"
    assert independence_number([1, 5, 6, 2, 0]) == 3


# ---------------------------------------------------------------------------
# Input formats
# ---------------------------------------------------------------------------


def test_parent_array_matches_edge_list():
    parents = (0, 1, 2, 2, 1)
    edges = parent_array_to_edges(parents)
    assert sorted(edges) == [(0, 1), (0, 4), (1, 2), (1, 3)]
    assert independence_polynomial_parent_array(parents) == independence_polynomial_forest(5, edges)
    assert independence_polynomial_parent_array(parents) == [1, 5, 6, 2]


def test_parent_array_validation():
    assert validate_parent_array([0]) == (0,)
    with pytest.raises(ValueError):
        validate_parent_array([])
    with pytest.raises(ValueError):
        validate_parent_array([1, 1])
    with pytest.raises(ValueError):
        validate_parent_array([0, 2])
    with pytest.raises(ValueError):
        validate_parent_array([0, 1, 3])
    with pytest.raises(TypeError):
        validate_parent_array([0, 1.0])


def test_networkx_interface():
    star = nx.star_graph(4)
    assert independence_polynomial_nx(star) == [1, 5, 6, 4, 1]
    relabelled = nx.relabel_nodes(nx.path_graph(5), {i: f"v{i}" for i in range(5)})
    assert independence_polynomial_nx(relabelled) == [1, 5, 6, 1]
    assert independence_polynomial_nx(parent_array_to_nx((0, 1, 1, 1))) == [1, 4, 3, 1]
    assert independence_polynomial_nx(nx.Graph()) == [1]
    with pytest.raises(ValueError):
        independence_polynomial_nx(nx.cycle_graph(5))
    with pytest.raises(TypeError):
        independence_polynomial_nx(nx.DiGraph([(0, 1)]))
    with pytest.raises(TypeError):
        independence_polynomial_nx(nx.MultiGraph([(0, 1)]))


def test_dispatcher():
    assert independence_polynomial(3, [(0, 1), (1, 2)]) == [1, 3, 1]
    assert independence_polynomial((0, 1, 1)) == [1, 3, 1]
    assert independence_polynomial(nx.path_graph(3)) == [1, 3, 1]


def test_non_forest_edge_lists_are_rejected():
    with pytest.raises(ValueError):
        independence_polynomial_forest(3, [(0, 1), (1, 2), (2, 0)])
    with pytest.raises(ValueError):
        independence_polynomial_forest(2, [(0, 1), (1, 0)])
    with pytest.raises(ValueError):
        independence_polynomial_forest(2, [(0, 0)])
    with pytest.raises(ValueError):
        independence_polynomial_forest(2, [(0, 2)])
    with pytest.raises(TypeError):
        independence_polynomial_forest(2, [(0, 1.0)])


def test_result_entries_are_python_ints():
    poly = independence_polynomial_forest(12, path_edges(12))
    assert all(type(c) is int for c in poly)


# ---------------------------------------------------------------------------
# Brute-force cross checks
# ---------------------------------------------------------------------------


def test_bruteforce_on_cycle_matches_known_values():
    assert independence_polynomial_bruteforce(4, [(0, 1), (1, 2), (2, 3), (3, 0)]) == [1, 4, 2]
    assert independence_polynomial_bruteforce(5, [(i, (i + 1) % 5) for i in range(5)]) == [1, 5, 5]
    with pytest.raises(ValueError):
        independence_polynomial_bruteforce(21, [])


@pytest.mark.parametrize("n", range(1, 11))
def test_dp_matches_bruteforce_on_all_trees(n):
    count = 0
    for parents in iter_trees(n):
        edges = parent_array_to_edges(parents)
        dp = independence_polynomial_parent_array(parents)
        assert dp == independence_polynomial_forest(n, edges)
        assert dp == independence_polynomial_bruteforce(n, edges)
        count += 1
    assert count >= 1


def test_dp_matches_bruteforce_on_random_forests():
    rng = random.Random(20260902)
    for _ in range(300):
        n = rng.randint(1, 14)
        edges = random_forest(rng, n)
        dp = independence_polynomial_forest(n, edges)
        assert dp == independence_polynomial_bruteforce(n, edges)
        graph = nx.Graph()
        graph.add_nodes_from(range(n))
        graph.add_edges_from(edges)
        assert independence_polynomial_nx(graph) == dp
