"""Tests for tree and forest enumeration and OEIS count verification."""

import networkx as nx
import pytest

from erdos993.enumerate import (
    A000055,
    A005195,
    components_to_forest,
    count_forests,
    count_forests_formula,
    count_trees,
    gentreeg_executable,
    independence_polynomial_components,
    iter_forests,
    iter_trees,
    iter_trees_gentreeg,
    iter_trees_networkx,
    nx_tree_to_parent_array,
    partitions,
    verify_forest_counts,
    verify_tree_counts,
)
from erdos993.indpoly import (
    independence_polynomial_forest,
    independence_polynomial_parent_array,
    parent_array_to_nx,
    validate_parent_array,
)

needs_gentreeg = pytest.mark.skipif(gentreeg_executable() is None, reason="nauty-gentreeg not installed")


def test_oeis_tables_match_task_statement():
    assert A000055[:13] == (1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551)
    assert A005195 == (1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514)


@needs_gentreeg
@pytest.mark.parametrize("n", range(1, 13))
def test_tree_counts_match_A000055_via_gentreeg(n):
    assert count_trees(n, backend="gentreeg") == A000055[n]


@needs_gentreeg
def test_verify_tree_counts_helper():
    result = verify_tree_counts(12, backend="gentreeg")
    assert all(found == expected for found, expected in result.values())
    assert len(result) == 12


@needs_gentreeg
def test_gentreeg_parent_arrays_are_valid_and_distinct():
    trees = list(iter_trees_gentreeg(8))
    assert len(trees) == 23
    assert len(set(trees)) == 23
    for parents in trees:
        assert validate_parent_array(parents) == parents
        graph = parent_array_to_nx(parents)
        assert nx.is_tree(graph) and graph.number_of_nodes() == 8


@needs_gentreeg
def test_gentreeg_res_mod_splitting_partitions_the_output():
    full = list(iter_trees_gentreeg(10))
    pieces = [list(iter_trees_gentreeg(10, res=r, mod=3)) for r in range(3)]
    combined = [t for piece in pieces for t in piece]
    assert len(combined) == len(full) == 106
    assert set(combined) == set(full)
    with pytest.raises(ValueError):
        list(iter_trees_gentreeg(5, res=3, mod=3))
    with pytest.raises(ValueError):
        list(iter_trees_gentreeg(5, res=0))


@needs_gentreeg
def test_gentreeg_stream_can_be_abandoned_early():
    gen = iter_trees_gentreeg(14)
    first = next(gen)
    assert len(first) == 14
    gen.close()


@pytest.mark.parametrize("n", range(1, 10))
def test_networkx_fallback_counts(n):
    assert sum(1 for _ in iter_trees_networkx(n)) == A000055[n]


@needs_gentreeg
@pytest.mark.parametrize("n", range(1, 9))
def test_networkx_fallback_gives_same_isomorphism_classes(n):
    from_nauty = [parent_array_to_nx(t) for t in iter_trees_gentreeg(n)]
    from_nx = [parent_array_to_nx(t) for t in iter_trees_networkx(n)]
    assert len(from_nauty) == len(from_nx)
    unmatched = list(from_nx)
    for graph in from_nauty:
        for i, other in enumerate(unmatched):
            if nx.is_isomorphic(graph, other):
                del unmatched[i]
                break
        else:
            pytest.fail("a gentreeg tree has no isomorphic networkx counterpart")
    assert not unmatched


def test_networkx_fallback_res_mod():
    full = list(iter_trees_networkx(8))
    pieces = [list(iter_trees_networkx(8, res=r, mod=2)) for r in range(2)]
    assert sorted(pieces[0] + pieces[1]) == sorted(full)


def test_nx_tree_to_parent_array_roundtrip():
    tree = nx.balanced_tree(2, 3)
    parents = nx_tree_to_parent_array(tree)
    assert validate_parent_array(parents) == parents
    assert nx.is_isomorphic(parent_array_to_nx(parents), tree)
    with pytest.raises(ValueError):
        nx_tree_to_parent_array(nx.empty_graph(3))


def test_iter_trees_backend_argument():
    assert list(iter_trees(4, backend="networkx"))
    with pytest.raises(ValueError):
        list(iter_trees(4, backend="magic"))
    with pytest.raises(ValueError):
        list(iter_trees(0))


def test_partitions():
    assert list(partitions(4)) == [(4,), (3, 1), (2, 2), (2, 1, 1), (1, 1, 1, 1)]
    assert sum(1 for _ in partitions(10)) == 42
    assert list(partitions(0)) == [()]


@pytest.mark.parametrize("n", range(0, 14))
def test_forest_counts_match_A005195_by_enumeration(n):
    assert count_forests(n) == A005195[n]


@pytest.mark.parametrize("n", range(0, 16))
def test_forest_count_formula_matches_A005195(n):
    assert count_forests_formula(n) == A005195[n]


def test_verify_forest_counts_helper():
    by_enumeration = verify_forest_counts(9, method="enumerate")
    by_formula = verify_forest_counts(15, method="formula")
    assert all(found == expected for found, expected in by_enumeration.values())
    assert all(found == expected for found, expected in by_formula.values())
    assert list(by_enumeration) == list(range(0, 10)) and list(iter_forests(0)) == [()]


def test_forests_are_pairwise_non_isomorphic_and_cover_all_forests():
    n = 7
    forests = list(iter_forests(n))
    graphs = []
    for components in forests:
        size, edges = components_to_forest(components)
        assert size == n
        graph = nx.Graph()
        graph.add_nodes_from(range(n))
        graph.add_edges_from(edges)
        assert nx.is_forest(graph)
        graphs.append(graph)
    for i in range(len(graphs)):
        for j in range(i + 1, len(graphs)):
            assert not nx.is_isomorphic(graphs[i], graphs[j])
    assert len(graphs) == A005195[n]


def test_component_polynomial_matches_direct_computation():
    cache = {}
    for components in iter_forests(8):
        n, edges = components_to_forest(components)
        direct = independence_polynomial_forest(n, edges)
        assert independence_polynomial_components(components, cache) == direct
        assert independence_polynomial_components(components) == direct
    assert cache and all(independence_polynomial_parent_array(k) == v for k, v in cache.items())
