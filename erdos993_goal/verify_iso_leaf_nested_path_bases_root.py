#!/usr/bin/env python3
"""Verify exact ISO leaf/nested identities and their terminal bases.

This freezes a conditional induction route.  It proves the algebraic leaf
and nonsibling nested reductions, the rooted-star base for the leaf
remainder, and the two-terminal-path base for the four-minor remainder.
The forest nested recurrences themselves remain conjectural.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from probe_iso_leaf_cross_remainder_root import iso, poly_forest
from probe_iso_four_minor_third_leaf_root import four_minor_vector


def coeff(row: list[int], k: int) -> int:
    return row[k] if 0 <= k < len(row) else 0


def shifted(row: list[int]) -> list[int]:
    return [0] + row


def add_rows(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    return out


def q_symbolic(row: dict[int, sp.Expr], rank: sp.Expr) -> sp.Expr:
    return (
        rank * row[0] ** 2
        + row[-1] ** 2
        - (rank + 1) * row[-1] * row[1]
    )


def symbolic_leaf_identity() -> dict[str, str]:
    r = sp.symbols("r", integer=True, positive=True)
    a = {i: sp.symbols(f"a_{i}") for i in (-2, -1, 0, 1)}
    c = {i: sp.symbols(f"c_{i}") for i in (-2, -1, 0, 1)}
    p = {
        -1: a[-1] + c[-2],
        0: a[0] + c[-1],
        1: a[1] + c[0],
    }
    lower = {-1: c[-2], 0: c[-1], 1: c[0]}
    margin = sp.expand(
        q_symbolic(p, r) - q_symbolic({-1: a[-1], 0: a[0], 1: a[1]}, r)
        - q_symbolic(lower, r - 1)
    )
    expected = (
        c[-1] ** 2
        + 2 * r * a[0] * c[-1]
        + 2 * a[-1] * c[-2]
        - (r + 1) * a[-1] * c[0]
        - (r + 1) * c[-2] * a[1]
        - c[-2] * c[0]
    )
    assert sp.expand(margin - expected) == 0
    return {"leaf_remainder": str(expected)}


def symbolic_nested_identity() -> dict[str, str]:
    r = sp.symbols("r", integer=True, positive=True)
    e = {i: sp.symbols(f"E_{i}") for i in range(-3, 2)}
    u = {i: sp.symbols(f"U_{i}") for i in range(-3, 2)}
    v = {i: sp.symbols(f"V_{i}") for i in range(-3, 2)}
    w = {i: sp.symbols(f"W_{i}") for i in range(-3, 2)}

    def m(rank: sp.Expr, left: dict[int, sp.Expr], right: dict[int, sp.Expr]) -> sp.Expr:
        return (
            right[-1] ** 2
            + 2 * rank * left[0] * right[-1]
            + 2 * left[-1] * right[-2]
            - (rank + 1) * left[-1] * right[0]
            - (rank + 1) * right[-2] * left[1]
            - right[-2] * right[0]
        )

    eu = {i: e[i] + u[i - 1] for i in (-2, -1, 0, 1)}
    vw = {i: v[i] + w[i - 1] for i in (-2, -1, 0, 1)}
    lower_u = {-2: u[-3], -1: u[-2], 0: u[-1], 1: u[0]}
    lower_w = {-2: w[-3], -1: w[-2], 0: w[-1], 1: w[0]}
    nested = sp.expand(m(r, eu, vw) - m(r, e, v) - m(r - 1, lower_u, lower_w))
    expected = (
        2 * r * e[0] * w[-2]
        - (r + 1) * e[1] * w[-3]
        + e[-1] * (2 * w[-3] - (r + 1) * w[-1])
        + u[0] * (-(r + 1) * v[-2] - w[-3])
        + u[-1] * (2 * r * v[-1] + 2 * w[-2])
        + u[-2] * (-(r + 1) * v[0] + 2 * v[-2] - w[-1])
        - v[0] * w[-3]
        + 2 * v[-1] * w[-2]
        - v[-2] * w[-1]
    )
    assert sp.expand(nested - expected) == 0
    return {"four_minor_remainder": str(expected)}


def star_base() -> dict[str, str]:
    m, r = sp.symbols("m r", integer=True, positive=True)
    c = lambda k: sp.binomial(m - 1, k)
    generic = (
        c(r - 1) ** 2
        + 2 * r * c(r) * c(r - 1)
        + 2 * c(r - 1) * c(r - 2)
        - (r + 1) * c(r - 1) * c(r)
        - (r + 1) * c(r - 2) * c(r + 1)
        - c(r - 2) * c(r)
    )
    target = (
        (2 * r - 1)
        * sp.binomial(m, r)
        * sp.factorial(m - 1)
        / (sp.factorial(r - 1) * sp.factorial(m - r + 1))
    )
    assert sp.simplify(sp.combsimp(generic - target)) == 0

    # Rank two sees the exceptional center singleton in I(K_{1,m-1}).
    rank_two = 3 * m - 1
    for leaves in range(1, 501):
        import networkx as nx

        graph = nx.star_graph(leaves)
        ell = leaves
        support = 0
        a = graph.copy()
        a.remove_node(ell)
        c_graph = graph.copy()
        c_graph.remove_nodes_from([ell, support])
        pg, pa, pc = map(poly_forest, [graph, a, c_graph])
        for rank in range(2, len(pg)):
            value = iso(pg, rank) - iso(pa, rank) - iso(pc, rank - 1)
            if rank == 2:
                assert value == rank_two.subs(m, leaves)
            elif rank <= leaves:
                assert value == target.subs({m: leaves, r: rank})
            assert value >= 0
    return {
        "rank_two": str(rank_two),
        "rank_at_least_three": str(target),
    }


def path_base() -> dict[str, object]:
    n, r, x, y = sp.symbols("n r x y", integer=True, nonnegative=True)
    p = lambda order, rank: sp.binomial(order - rank + 1, rank)
    e = lambda k: p(n, k)
    u = lambda k: p(n - 1, k)
    w = lambda k: p(n - 2, k)
    value = (
        2 * r * e(r) * w(r - 2)
        - (r + 1) * e(r + 1) * w(r - 3)
        + e(r - 1) * (2 * w(r - 3) - (r + 1) * w(r - 1))
        + u(r) * (-(r + 1) * u(r - 2) - w(r - 3))
        + u(r - 1) * (2 * r * u(r - 1) + 2 * w(r - 2))
        + u(r - 2) * (-(r + 1) * u(r) + 2 * u(r - 2) - w(r - 1))
        - u(r) * w(r - 3)
        + 2 * u(r - 1) * w(r - 2)
        - u(r - 2) * w(r - 1)
    )
    simplified = sp.factor(sp.combsimp(value))

    h = (
        6 * x**5 * y + 3 * x**5
        + 10 * x**4 * y**2 + 134 * x**4 * y + 73 * x**4
        + 6 * x**3 * y**3 + 180 * x**3 * y**2 + 1204 * x**3 * y + 691 * x**3
        + 6 * x**2 * y**4 + 80 * x**2 * y**3 + 1208 * x**2 * y**2 + 5432 * x**2 * y + 3197 * x**2
        + 2 * x * y**5 + 56 * x * y**4 + 350 * x * y**3 + 3580 * x * y**2 + 12286 * x * y + 7256 * x
        + 11 * y**5 + 127 * y**4 + 501 * y**3 + 3953 * y**2 + 11128 * y + 6480
    )
    assert all(coefficient > 0 for coefficient in sp.Poly(h, x, y).coeffs())
    interior = (
        2
        * h
        * sp.factorial(r + x + 1)
        * sp.factorial(r + x + 2)
        / (
            sp.factorial(r)
            * sp.factorial(r - 2)
            * sp.factorial(x + 5)
            * sp.factorial(x + 6)
        )
    )
    assert sp.simplify(
        sp.combsimp(simplified.subs(n, 2 * r + 1 + x) - interior.subs(y, r - 1))
    ) == 0

    odd_boundary = r * (r - 1) * (7 * r**4 + 4 * r**3 - 13 * r**2 + 290 * r + 12) / 72
    even_boundary = (
        r
        * (r - 1)
        * (r + 1)
        * (9 * r**5 + 32 * r**4 + 7 * r**3 + 1108 * r**2 + 788 * r - 144)
        / 1440
    )
    assert sp.simplify(sp.combsimp(value.subs(n, 2 * r - 1) - odd_boundary)) == 0
    assert sp.simplify(sp.combsimp(value.subs(n, 2 * r) - even_boundary)) == 0
    # Positivity after r=z+2 is coefficientwise for both boundary polynomials.
    z = sp.symbols("z", integer=True, nonnegative=True)
    assert all(c > 0 for c in sp.Poly(sp.expand(odd_boundary.subs(r, z + 2)), z).coeffs())
    assert all(c > 0 for c in sp.Poly(sp.expand(even_boundary.subs(r, z + 2)), z).coeffs())

    import networkx as nx

    literal_checks = 0
    for order in range(2, 501):
        path = nx.path_graph(order)
        vector = four_minor_vector(path, 0, order - 1)
        for rank in range(2, len(poly_forest(path))):
            assert vector[rank] >= 0
            literal_checks += 1
    return {
        "interior_positive_polynomial": str(h),
        "odd_boundary": str(odd_boundary),
        "even_boundary": str(even_boundary),
        "literal_path_checks_through_500": literal_checks,
    }


def universal_negative_control() -> dict[str, object]:
    facet_sizes = [10, 4, 24, 13]
    link_sizes = [1, 3, 9, 0]
    max_rank = max(facet_sizes)
    c = [1] + [sum(comb(size, k) for size in facet_sizes if size >= k) for k in range(1, max_rank + 1)]
    j = [1] + [sum(comb(size, k) for size in link_sizes if size >= k) for k in range(1, max(link_sizes) + 1)]
    a = add_rows(c, shifted(j))
    p = add_rows(add_rows(c, shifted(c)), shifted(j))
    rank = 3
    value = iso(p, rank) - iso(a, rank) - iso(c, rank - 1)
    assert value == -351679
    return {
        "construction": "complete multipartite independence complex with an induced link",
        "facet_sizes": facet_sizes,
        "link_sizes": link_sizes,
        "rank": rank,
        "leaf_remainder": value,
        "scope": "not a forest; disproves only the universal graph/downset extension",
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_LEAF_NESTED_IDENTITIES_AND_TERMINAL_BASES",
        "status": "conditional reduction; forest nested recurrences remain open",
        "leaf_identity": symbolic_leaf_identity(),
        "nested_identity": symbolic_nested_identity(),
        "rooted_star_base": star_base(),
        "two_terminal_path_base": path_base(),
        "universal_negative_control": universal_negative_control(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = Path("iso_leaf_nested_path_bases_exact_root_20260829.json")
    output.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print("PASS_EXACT_ISO_LEAF_NESTED_IDENTITIES_AND_TERMINAL_BASES")


if __name__ == "__main__":
    main()
