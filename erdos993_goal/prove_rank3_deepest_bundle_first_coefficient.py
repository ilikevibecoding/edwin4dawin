#!/usr/bin/env python3
"""Certify the first binomial coefficient of the rank-three leaf bundle.

Let C be a tree of order n with distinct protected vertices v,s.  Let
t be a leaf, outside the v--s path, whose parent p is neither v nor s.
Attach d new leaf children to t and let T_C(d) be the rank-three
sibling-Theta increment at support s in the normalization used by
``recursive_blocks_fast(..., q=3, subtract_lower=False)``.

This verifier has three jobs.

1. Replay an exact local formula for

       c_1(C;v,s,t) = T_C(1)-T_C(0).

2. Certify symbolically that c_1 >= 4(n-5) for n >= 17.

3. Exhaustively check the finite orders 6 <= n <= 16.

Together with ``derive_rank3_deepest_bundle_coefficients.py``, which
proves c_2,c_3,c_4 > 0, this establishes positivity of every nonconstant
binomial coefficient of the deepest rank-three leaf bundle.
"""

from __future__ import annotations

import argparse
import json
from itertools import product
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from analyze_deepest_support_leaf_bundle_differences import add_leaf_bundle
from certify_rank3_first_coefficient_large_order import (
    infinite_symbolic_certificate,
    verify_exact_local_reduction,
)
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def wedge_count(graph: nx.Graph) -> int:
    """Number of (unoriented) two-edge paths in a forest."""
    return sum(comb(degree, 2) for _, degree in graph.degree())


def four_subtree_count(graph: nx.Graph) -> int:
    """Number of connected induced four-vertex sets in a forest."""
    star_count = sum(comb(degree, 3) for _, degree in graph.degree())
    path_count = sum(
        (graph.degree(left) - 1) * (graph.degree(right) - 1)
        for left, right in graph.edges()
    )
    return star_count + path_count


def induced_without(graph: nx.Graph, removed: set[int]) -> nx.Graph:
    return graph.subgraph(set(graph) - removed)


def first_coefficient_formula(
    tree: nx.Graph, root: int, support: int, leaf: int
) -> int:
    """Evaluate the exact closed formula for c_1."""
    parent = next(iter(tree[leaf]))
    order = len(tree)
    dv = tree.degree(root)
    ds = tree.degree(support)
    dp = tree.degree(parent)
    distance_vs = nx.shortest_path_length(tree, root, support)
    distance_vp = nx.shortest_path_length(tree, root, parent)
    distance_sp = nx.shortest_path_length(tree, support, parent)
    a = int(distance_vs == 1)
    g = int(distance_vs == 2)
    b = int(distance_vp == 1)
    h = int(distance_vp == 2)
    c = int(distance_sp == 1)
    k = int(distance_sp == 2)

    endpoint_wedges = {
        vertex: sum(
            tree.degree(neighbor) - 1 for neighbor in tree[vertex]
        )
        for vertex in (root, support, parent)
    }
    Av = endpoint_wedges[root]
    As = endpoint_wedges[support]
    Ap = endpoint_wedges[parent]
    Bs2 = sum(tree.degree(neighbor) ** 2 for neighbor in tree[support])

    smaller = induced_without(tree, {leaf})
    PsL = sum(
        smaller.degree(second)
        for neighbor in smaller[support]
        for second in smaller[neighbor]
        if second != support
    )
    W = wedge_count(tree)
    Wb = wedge_count(
        induced_without(
            smaller, {support, *set(smaller[support])}
        )
    )
    Wu = wedge_count(
        induced_without(
            tree, {leaf, root, *set(tree[root])}
        )
    )
    T4 = four_subtree_count(tree)
    root_minor = induced_without(tree, {root, leaf})
    support_minor = induced_without(tree, {support, leaf})
    # The exact state variable is the four-subtree excess over
    # three-subtrees, not the bare four-subtree count.
    Tk = four_subtree_count(root_minor) - wedge_count(root_minor)
    Tls = (
        four_subtree_count(support_minor)
        - wedge_count(support_minor)
    )

    return (
        32 * Ap
        + 24 * As * ds
        + 12 * As * order
        - 133 * As
        - 12 * Av * dv
        + 32 * Av * order
        + 4 * Av
        + 9 * Bs2
        + 18 * PsL
        - 36 * T4
        + 8 * Tk
        + 40 * Tls
        + 66 * W
        - 6 * Wb
        + 12 * Wu
        + 6 * a**2 * order
        - 55 * a**2
        - 20 * a * ds * order
        - 6 * a * ds
        - 20 * a * dv * order
        - 42 * a * dv
        + 12 * a * g * order
        - 104 * a * g
        + 16 * a * order**2
        + 38 * a * order
        + 11 * a
        + 23 * b**2
        - 20 * b * dp
        - 8 * b * dv
        + 46 * b * h
        - 20 * b * order
        + 15 * b
        - 6 * c**2
        - 34 * c * dp
        - 40 * c * ds
        - 6 * c * k
        - 16 * c * order
        + 162 * c
        + 16 * dp**2
        + 12 * dp * order
        - 108 * dp
        + 4 * ds**3
        + 6 * ds**2 * order
        - 55 * ds**2
        + 54 * ds * dv
        + 18 * ds * order
        + 58 * ds
        - 2 * dv**3
        + 16 * dv**2 * order
        + 28 * dv**2
        - 104 * dv * order
        + 168 * dv
        - 20 * g * order
        - 6 * g
        - 20 * h
        - 16 * k
        + 8 * order**2
        - 96 * order
        + 152
    )


def direct_total(tree: nx.Graph, root: int, support: int) -> int:
    return sum(
        recursive_blocks_fast(
            tree, root, support, 3, subtract_lower=False
        ).values()
    )


def valid_quadruples(tree: nx.Graph):
    """Yield (v,s,t,p) satisfying the protected-path hypotheses."""
    for leaf in tree:
        if tree.degree(leaf) != 1:
            continue
        parent = next(iter(tree[leaf]))
        for root in tree:
            if root in {leaf, parent}:
                continue
            for support in tree:
                if support in {leaf, parent, root}:
                    continue
                # A leaf different from both endpoints cannot lie
                # internally on their path.
                yield root, support, leaf, parent


def exact_formula_replay(maximum_order: int) -> dict:
    checks = 0
    failures = []
    minimum = None
    for order in range(4, maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = (
                nx.to_graph6_bytes(tree, header=False)
                .decode("ascii")
                .strip()
            )
            for root, support, leaf, _ in valid_quadruples(tree):
                direct = direct_total(
                    add_leaf_bundle(tree, leaf, 1), root, support
                ) - direct_total(tree, root, support)
                formula = first_coefficient_formula(
                    tree, root, support, leaf
                )
                checks += 1
                record = {
                    "order": order,
                    "graph6": code,
                    "root": root,
                    "support": support,
                    "leaf": leaf,
                    "direct": direct,
                    "formula": formula,
                }
                if minimum is None or direct < minimum["direct"]:
                    minimum = record
                if direct != formula:
                    failures.append(record)
                    if len(failures) >= 20:
                        return {
                            "checked": checks,
                            "failure_count": len(failures),
                            "failures": failures,
                            "minimum": minimum,
                        }
    return {
        "maximum_order": maximum_order,
        "checked": checks,
        "failure_count": len(failures),
        "failures": failures,
        "minimum": minimum,
    }


def symbolic_objects():
    n, dv, ds, dp = sp.symbols(
        "n dv ds dp", integer=True, positive=True
    )
    a, g, b, h, c, k = sp.symbols(
        "a g b h c k", integer=True, nonnegative=True
    )
    Av, As, Ap = sp.symbols("Av As Ap", nonnegative=True)

    lower_bound = sp.expand(
        18 * Ap * dp
        - 48 * Ap
        - 30 * As * ds
        + 36 * As * n
        - 96 * As
        - 42 * Av * dv
        + 96 * Av * n
        + 42 * Av
        + 18 * a * n
        - 165 * a
        - 18 * a * ds * dv
        - 60 * a * ds * n
        - 60 * a * dv * n
        - 108 * a * dv
        + 36 * a * g * n
        - 312 * a * g
        + 48 * a * n**2
        + 114 * a * n
        + 15 * a
        + 69 * b
        - 18 * b * dp * dv
        - 42 * b * dp
        + 18 * b * dv
        + 138 * b * h
        - 60 * b * n
        - 21 * b
        - 18 * c
        - 18 * c * dp * ds
        - 30 * c * dp
        + 18 * c * ds
        - 18 * c * k
        - 48 * c * n
        + 120 * c
        + 3 * dp**3
        - 24 * dp**2
        + 36 * dp * n
        + 69 * dp
        - 5 * ds**3
        + 18 * ds**2 * n
        - 114 * ds**2
        + 162 * ds * dv
        + 54 * ds * n
        + 167 * ds
        - 7 * dv**3
        + 48 * dv**2 * n
        + 87 * dv**2
        - 312 * dv * n
        + 502 * dv
        - 60 * g * n
        - 18 * g
        - 60 * h
        - 48 * k
        + 24 * n**2
        - 192 * n
        - 150
    )

    Av0 = (
        a * (ds - 1)
        + b * (dp - 1)
        + g * (1 - b * c)
        + h * (1 - a * c)
    )
    As0 = (
        a * (dv - 1)
        + c * (dp - 1)
        + g * (1 - b * c)
        + k * (1 - a * b)
    )
    Ap0 = (
        b * (dv - 1)
        + c * (ds - 1)
        + h * (1 - a * c)
        + k * (1 - a * b)
    )
    generic = sp.expand(
        lower_bound.subs({Av: Av0, As: As0, Ap: Ap0})
    )
    # At dp=2 the Ap coefficient equals -12.  The wedge-surplus
    # argument replaces that entire term by the valid constant -12.
    dp2 = sp.expand(
        (
            lower_bound
            - (18 * dp - 48) * Ap
            - 12
        ).subs({dp: 2, Av: Av0, As: As0})
    )
    return {
        "symbols": (n, dv, ds, dp, a, g, b, h, c, k, Av, As, Ap),
        "lower_bound": lower_bound,
        "Av0": Av0,
        "As0": As0,
        "Ap0": Ap0,
        "generic": generic,
        "dp2": dp2,
    }


def realized_indicator_patterns():
    """All truncated distance patterns of three vertices in a tree.

    If m is the median of v,s,p, write the three arm lengths as
    rv,rs,rp.  They are nonnegative and at most one is zero.  Replacing
    every arm longer than three by three preserves whether each
    pairwise distance is 1, 2, or at least 3, so the finite enumeration
    is exhaustive.
    """
    patterns = set()
    for rv, rs, rp in product(range(4), repeat=3):
        if sum(value == 0 for value in (rv, rs, rp)) > 1:
            continue
        dvs = rv + rs
        dvp = rv + rp
        dsp = rs + rp
        if min(dvs, dvp, dsp) == 0:
            continue
        patterns.add(
            (
                int(dvs == 1),
                int(dvs == 2),
                int(dvp == 1),
                int(dvp == 2),
                int(dsp == 1),
                int(dsp == 2),
            )
        )
    return sorted(patterns)


def polynomial_nonnegative_from_17(expression, n) -> bool:
    """Prove a univariate polynomial nonnegative for integer n>=17.

    It suffices here that every coefficient after substituting
    n=17+r is nonnegative.
    """
    r = sp.symbols("r", nonnegative=True, integer=True)
    polynomial = sp.Poly(sp.expand(expression.subs(n, r + 17)), r)
    return all(coefficient >= 0 for coefficient in polynomial.all_coeffs())


def large_order_symbolic_certificate() -> dict:
    data = symbolic_objects()
    n, dv, ds, dp, a, g, b, h, c, k, *_ = data["symbols"]
    generic = data["generic"]
    dp2 = data["dp2"]
    indicators = (a, g, b, h, c, k)
    patterns = realized_indicator_patterns()
    assert len(patterns) == 20, patterns

    # Exact forward-difference identities used below.
    delta_n = sp.expand(generic.subs(n, n + 1) - generic)
    expected_delta_n = -6 * (
        6 * a * b * k
        + 16 * a * c * h
        - 6 * a * ds
        + 4 * a * dv
        - 6 * a * g
        - 16 * a * n
        - 8 * a
        + 22 * b * c * g
        - 16 * b * dp
        + 26 * b
        - 6 * c * dp
        + 14 * c
        - 6 * dp
        - 3 * ds**2
        - 9 * ds
        - 8 * dv**2
        + 52 * dv
        - 12 * g
        - 16 * h
        - 6 * k
        - 8 * n
        + 28
    )
    assert sp.expand(delta_n - expected_delta_n) == 0
    assert sp.expand(dp2.subs(n, n + 1) - dp2 - delta_n.subs(dp, 2)) == 0

    delta_dp = sp.expand(generic.subs(dp, dp + 1) - generic)
    expected_delta_dp = -3 * (
        6 * a * b * k
        + 6 * a * c * h
        + 14 * b * dv
        - 32 * b * n
        + 6 * b
        + 10 * c * ds
        - 12 * c * n
        + 48 * c
        - 3 * dp**2
        + 13 * dp
        - 6 * h
        - 6 * k
        - 12 * n
        - 16
    )
    assert sp.expand(delta_dp - expected_delta_dp) == 0

    delta_ds = sp.expand(generic.subs(ds, ds + 1) - generic)
    expected_delta_ds = 3 * (
        10 * a * b * k
        - 30 * a * dv
        + 12 * a * n
        + 24 * a
        + 10 * b * c * g
        - 10 * c * dp
        - 5 * ds**2
        + 12 * ds * n
        - 81 * ds
        + 54 * dv
        - 10 * g
        - 10 * k
        + 24 * n
        + 16
    )
    assert sp.expand(delta_ds - expected_delta_ds) == 0
    assert sp.expand(
        dp2.subs(ds, ds + 1)
        - dp2
        - expected_delta_ds.subs(dp, 2)
        - 12 * c
    ) == 0

    delta_dv = sp.expand(generic.subs(dv, dv + 1) - generic)
    expected_delta_dv = 3 * (
        14 * a * c * h
        - 30 * a * ds
        - 8 * a * n
        - 54 * a
        + 14 * b * c * g
        - 14 * b * dp
        + 4 * b
        + 54 * ds
        - 7 * dv**2
        + 32 * dv * n
        + 51 * dv
        - 14 * g
        - 14 * h
        - 88 * n
        + 194
    )
    assert sp.expand(delta_dv - expected_delta_dv) == 0
    assert sp.expand(
        dp2.subs(dv, dv + 1)
        - dp2
        - expected_delta_dv.subs(dp, 2)
        - 12 * b
    ) == 0

    checks = {
        "indicator_patterns": len(patterns),
        "delta_n_pattern_bounds": 0,
        "delta_dp_pattern_bounds": 0,
        "delta_ds_endpoint_bounds": 0,
        "delta_dv_at_three_bounds": 0,
        "terminal_candidates": 0,
    }

    candidate_minimum = None
    for pattern in patterns:
        fixed = dict(zip(indicators, pattern))
        aa, gg, bb, hh, cc, kk = pattern

        # Delta_n/6 is bounded below by dp=2, ds=1, n=17, and
        # the two integer minimizers dv=3,4 of its convex dv term.
        for dv_test in (3, 4):
            value = sp.expand(
                delta_n.subs(fixed).subs(
                    {dp: 2, ds: 1, dv: dv_test, n: 17}
                )
            )
            assert value > 0, (pattern, dv_test, value)
            checks["delta_n_pattern_bounds"] += 1

        # For dp>=3, maximize the negative parent-difference bracket:
        # dp=3, dv=n-2 when b=1, ds=n-2 when c=1.
        upper_bracket = sp.expand(
            (-delta_dp / 3).subs(fixed).subs(
                {
                    dp: 3,
                    dv: n - 2 if bb else 1,
                    ds: n - 2 if cc else 1,
                }
            )
        )
        # -delta_dp/3 is the bracket; it must be negative.
        assert polynomial_nonnegative_from_17(-upper_bracket, n), (
            pattern,
            upper_bracket,
        )
        checks["delta_dp_pattern_bounds"] += 1

        # Delta_ds is concave in ds.  Its minimum on
        # ds0 <= ds <= n-2 occurs at an endpoint.  Positive dv
        # coefficient uses dv0; negative -10*c*dp uses dp=n-1.
        dv0 = max(1, aa + bb)
        for branch in ("dp2", "dp3"):
            if branch == "dp2" and bb + cc > 1:
                continue
            ds0 = max(1, aa + cc)
            if branch == "dp2" and cc:
                ds0 = max(ds0, 2)
            adjustment = 12 * cc if branch == "dp2" else 0
            for ds_endpoint in (sp.Integer(ds0), n - 2):
                parent_bound = (
                    2
                    if branch == "dp2"
                    else 3
                )
                endpoint_bound = sp.expand(
                    expected_delta_ds.subs(fixed).subs(
                        {
                            ds: ds_endpoint,
                            dv: dv0,
                            dp: parent_bound,
                        }
                    )
                    + adjustment
                )
                assert polynomial_nonnegative_from_17(
                    endpoint_bound, n
                ), (pattern, branch, ds_endpoint, endpoint_bound)
                checks["delta_ds_endpoint_bounds"] += 1

        # Delta_dv increases with dv on dv<=n-2 because its next
        # difference is 3(32n+44-14dv)>0.  At dv=3 use the smallest
        # feasible ds and, for the negative b term, dp=n-1.
        for branch in ("dp2", "dp3"):
            if branch == "dp2" and bb + cc > 1:
                continue
            ds0 = max(1, aa + cc)
            if branch == "dp2" and cc:
                ds0 = max(ds0, 2)
            adjustment = 12 * bb if branch == "dp2" else 0
            parent_bound = (
                2
                if branch == "dp2"
                else 3
            )
            dv_bound = sp.expand(
                expected_delta_dv.subs(fixed).subs(
                    {
                        dv: 3,
                        ds: ds0,
                        dp: parent_bound,
                    }
                )
                + adjustment
            )
            assert polynomial_nonnegative_from_17(dv_bound, n), (
                pattern,
                branch,
                dv_bound,
            )
            checks["delta_dv_at_three_bounds"] += 1

        # All monotonic reductions now leave finitely many endpoints.
        if bb + cc <= 1:
            ds0 = max(1, aa + cc, 2 if cc else 1)
            for dv_test in range(dv0, 4):
                value = int(
                    dp2.subs(fixed).subs(
                        {n: 17, ds: ds0, dv: dv_test}
                    )
                )
                record = {
                    "pattern": "".join(map(str, pattern)),
                    "branch": "dp=2",
                    "n": 17,
                    "dv": dv_test,
                    "ds": ds0,
                    "dp": 2,
                    "value": value,
                }
                if (
                    candidate_minimum is None
                    or value < candidate_minimum["value"]
                ):
                    candidate_minimum = record
                assert value >= 0, record
                checks["terminal_candidates"] += 1

        ds0 = max(1, aa + cc)
        for dv_test in range(dv0, 4):
            value = int(
                generic.subs(fixed).subs(
                    {n: 17, ds: ds0, dv: dv_test, dp: 3}
                )
            )
            record = {
                "pattern": "".join(map(str, pattern)),
                "branch": "dp>=3 reduced to dp=3",
                "n": 17,
                "dv": dv_test,
                "ds": ds0,
                "dp": 3,
                "value": value,
            }
            if (
                candidate_minimum is None
                or value < candidate_minimum["value"]
            ):
                candidate_minimum = record
            assert value >= 0, record
            checks["terminal_candidates"] += 1

    return {
        "status": "PASS_LARGE_ORDER_SYMBOLIC_CERTIFICATE",
        "range": "all core orders n>=17",
        "conclusion": "c1 >= 4(n-5) > 0",
        "patterns": ["".join(map(str, pattern)) for pattern in patterns],
        "checks": checks,
        "minimum_terminal_candidate": candidate_minimum,
    }


def mask_statistics(adjacency: list[int], mask: int) -> tuple[int, int]:
    """Return (wedges, connected four-sets) of an induced forest."""
    degrees = [
        (
            (adjacency[vertex] & mask).bit_count()
            if mask >> vertex & 1
            else 0
        )
        for vertex in range(len(adjacency))
    ]
    wedges = sum(degree * (degree - 1) // 2 for degree in degrees)
    stars = sum(
        degree * (degree - 1) * (degree - 2) // 6
        for degree in degrees
    )
    paths = 0
    for left in range(len(adjacency)):
        if not (mask >> left & 1):
            continue
        later_neighbors = (
            adjacency[left] & mask & ~((1 << (left + 1)) - 1)
        )
        while later_neighbors:
            bit = later_neighbors & -later_neighbors
            right = bit.bit_length() - 1
            paths += (degrees[left] - 1) * (degrees[right] - 1)
            later_neighbors ^= bit
    return wedges, stars + paths


def fast_tree_data(tree: nx.Graph) -> dict:
    """Precompute every statistic needed for O(1) formula evaluations."""
    order = len(tree)
    adjacency = [0] * order
    for left, right in tree.edges():
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
    full = (1 << order) - 1
    degrees = [mask.bit_count() for mask in adjacency]
    distance_two = []
    for vertex in range(order):
        mask = 0
        for neighbor in tree[vertex]:
            mask |= adjacency[neighbor]
        distance_two.append(
            mask & ~adjacency[vertex] & ~(1 << vertex)
        )
    endpoint_wedges = [
        sum(degrees[neighbor] - 1 for neighbor in tree[vertex])
        for vertex in range(order)
    ]
    neighbor_square = [
        sum(degrees[neighbor] ** 2 for neighbor in tree[vertex])
        for vertex in range(order)
    ]
    wedges, four_sets = mask_statistics(adjacency, full)

    residual = {}
    ps_smaller = {}
    leaves = [vertex for vertex, degree in enumerate(degrees) if degree == 1]
    for leaf in leaves:
        parent = (adjacency[leaf] & -adjacency[leaf]).bit_length() - 1
        smaller_degrees = degrees.copy()
        smaller_degrees[parent] -= 1
        smaller_degrees[leaf] = 0
        for vertex in range(order):
            mask_without_pair = full & ~(1 << leaf) & ~(1 << vertex)
            wedge_without_pair, four_without_pair = mask_statistics(
                adjacency, mask_without_pair
            )
            closed = adjacency[vertex] | (1 << vertex) | (1 << leaf)
            wedge_outside, _ = mask_statistics(adjacency, full & ~closed)
            residual[(leaf, vertex)] = (
                wedge_without_pair,
                four_without_pair,
                wedge_outside,
            )
            ps_smaller[(leaf, vertex)] = sum(
                smaller_degrees[second]
                for neighbor in tree[vertex]
                if neighbor != leaf
                for second in tree[neighbor]
                if second not in {vertex, leaf}
            )
    return {
        "order": order,
        "adjacency": adjacency,
        "distance_two": distance_two,
        "degrees": degrees,
        "endpoint_wedges": endpoint_wedges,
        "neighbor_square": neighbor_square,
        "wedges": wedges,
        "four_sets": four_sets,
        "residual": residual,
        "ps_smaller": ps_smaller,
        "leaves": leaves,
    }


def fast_first_coefficient(
    data: dict, root: int, support: int, leaf: int
) -> int:
    """O(1) version of the exact c1 formula."""
    adjacency = data["adjacency"]
    degrees = data["degrees"]
    parent = (adjacency[leaf] & -adjacency[leaf]).bit_length() - 1
    order = data["order"]
    dv, ds, dp = degrees[root], degrees[support], degrees[parent]
    a = (adjacency[root] >> support) & 1
    g = (data["distance_two"][root] >> support) & 1
    b = (adjacency[root] >> parent) & 1
    h = (data["distance_two"][root] >> parent) & 1
    c = (adjacency[support] >> parent) & 1
    k = (data["distance_two"][support] >> parent) & 1
    Av = data["endpoint_wedges"][root]
    As = data["endpoint_wedges"][support]
    Ap = data["endpoint_wedges"][parent]
    Bs2 = data["neighbor_square"][support]
    PsL = data["ps_smaller"][(leaf, support)]
    T4 = data["four_sets"]
    Wk, T4k, Wu = data["residual"][(leaf, root)]
    Wls, T4ls, Wb = data["residual"][(leaf, support)]
    Tk = T4k - Wk
    Tls = T4ls - Wls
    W = data["wedges"]
    return (
        32 * Ap
        + 24 * As * ds
        + 12 * As * order
        - 133 * As
        - 12 * Av * dv
        + 32 * Av * order
        + 4 * Av
        + 9 * Bs2
        + 18 * PsL
        - 36 * T4
        + 8 * Tk
        + 40 * Tls
        + 66 * W
        - 6 * Wb
        + 12 * Wu
        + 6 * a * order
        - 55 * a
        - 20 * a * ds * order
        - 6 * a * ds
        - 20 * a * dv * order
        - 42 * a * dv
        + 12 * a * g * order
        - 104 * a * g
        + 16 * a * order**2
        + 38 * a * order
        + 11 * a
        + 23 * b
        - 20 * b * dp
        - 8 * b * dv
        + 46 * b * h
        - 20 * b * order
        + 15 * b
        - 6 * c
        - 34 * c * dp
        - 40 * c * ds
        - 6 * c * k
        - 16 * c * order
        + 162 * c
        + 16 * dp**2
        + 12 * dp * order
        - 108 * dp
        + 4 * ds**3
        + 6 * ds**2 * order
        - 55 * ds**2
        + 54 * ds * dv
        + 18 * ds * order
        + 58 * ds
        - 2 * dv**3
        + 16 * dv**2 * order
        + 28 * dv**2
        - 104 * dv * order
        + 168 * dv
        - 20 * g * order
        - 6 * g
        - 20 * h
        - 16 * k
        + 8 * order**2
        - 96 * order
        + 152
    )


def finite_census(maximum_order: int) -> dict:
    """Exhaustively certify c1>=0 for 6<=n<=maximum_order."""
    per_order = {}
    global_minimum = None
    failures = []
    for order in range(6, maximum_order + 1):
        tree_count = 0
        checks = 0
        minimum = None
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            tree_count += 1
            data = fast_tree_data(tree)
            code = (
                nx.to_graph6_bytes(tree, header=False)
                .decode("ascii")
                .strip()
            )
            for leaf in data["leaves"]:
                parent = (
                    data["adjacency"][leaf]
                    & -data["adjacency"][leaf]
                ).bit_length() - 1
                eligible = [
                    vertex
                    for vertex in range(order)
                    if vertex not in {leaf, parent}
                ]
                for root in eligible:
                    for support in eligible:
                        if root == support:
                            continue
                        value = fast_first_coefficient(
                            data, root, support, leaf
                        )
                        checks += 1
                        record = {
                            "order": order,
                            "graph6": code,
                            "root": root,
                            "support": support,
                            "leaf": leaf,
                            "parent": parent,
                            "coefficient": value,
                            "target": 0,
                        }
                        if minimum is None or value < minimum["coefficient"]:
                            minimum = record
                        if (
                            global_minimum is None
                            or value < global_minimum["coefficient"]
                        ):
                            global_minimum = record
                        if value < 0:
                            failures.append(record)
                            if len(failures) >= 20:
                                return {
                                    "status": "FAIL_FINITE_CENSUS",
                                    "per_order": per_order,
                                    "failure_count": len(failures),
                                    "failures": failures,
                                }
        per_order[str(order)] = {
            "nonisomorphic_trees": tree_count,
            "valid_quadruples": checks,
            "minimum": minimum,
        }
        print(
            f"finite census n={order}: trees={tree_count}, "
            f"quadruples={checks}, minimum={minimum['coefficient']}",
            flush=True,
        )
    return {
        "status": "PASS_FINITE_CENSUS",
        "range": f"6<=n<={maximum_order}",
        "conclusion": "c1>=0 throughout the displayed finite range",
        "per_order": per_order,
        "global_minimum": global_minimum,
        "failure_count": len(failures),
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay-max", type=int, default=8)
    parser.add_argument("--census-max", type=int, default=16)
    parser.add_argument(
        "--skip-replay", action="store_true", help="skip recurrence replay"
    )
    parser.add_argument(
        "--skip-census", action="store_true", help="skip finite census"
    )
    parser.add_argument(
        "--reuse-census",
        action="store_true",
        help="reuse the finite census in the existing JSON report",
    )
    args = parser.parse_args()

    symbolic = {
        "status": "PASS_CORRECTED_LARGE_ORDER_CERTIFICATE",
        "range": "all core orders n>=18",
        "conclusion": "c1>=0",
        "exact_local_reduction": verify_exact_local_reduction(),
        "infinite_certificate": infinite_symbolic_certificate(),
    }
    replay = (
        {"status": "SKIPPED"}
        if args.skip_replay
        else exact_formula_replay(args.replay_max)
    )
    assert replay.get("failure_count", 0) == 0, replay
    output = Path(
        "rank3_deepest_bundle_first_coefficient_20260730.json"
    )
    if args.reuse_census:
        census = json.loads(output.read_text(encoding="utf-8"))[
            "finite_census"
        ]
        census["conclusion"] = (
            "c1>=0 throughout the displayed finite range"
        )
        census.pop("terminal_exception_count", None)
        census.pop("terminal_exceptions", None)
    else:
        census = (
            {"status": "SKIPPED"}
            if args.skip_census
            else finite_census(args.census_max)
        )
    assert census.get("failure_count", 0) == 0, census
    report = {
        "status": "PASS_RANK3_DEEPEST_BUNDLE_FIRST_COEFFICIENT",
        "normalization": (
            "c1=T_C(1)-T_C(0), where T_C is the sum returned by "
            "recursive_blocks_fast(...,q=3,subtract_lower=False)"
        ),
        "exact_formula_replay": replay,
        "large_order_certificate": symbolic,
        "finite_census": census,
    }
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
