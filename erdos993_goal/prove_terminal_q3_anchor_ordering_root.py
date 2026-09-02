#!/usr/bin/env python3
"""Prove the terminal-bundle rank-three anchor ordering for every order.

Let G be a tree, let w be a vertex of G, and let T be obtained by adding
an edge wv and t >= 1 new leaves adjacent to v.  Put Q=G disjoint union
t isolated vertices.  This verifier proves

    q_3(T) >= q_3(Q),

equivalently

    s_3(T) i_3(Q) - s_3(Q) i_3(T) >= 0.

Orders |G| <= 14 are certified by exact shifted-coefficient enumeration.
Orders |G| >= 15 use the pinned Zagreb inequality, a concave B2 reduction,
and two exact endpoint positivity certificates.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_anchor_ordering_exact_root_20260828.json"
PINNED = {
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
}


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def rank3_coordinates(
    order: sp.Expr,
    edges: sp.Expr,
    wedges: sp.Expr,
    connected_four: sp.Expr,
) -> tuple[sp.Expr, sp.Expr]:
    """Return i3 and s3 from the exact three-set motif identities."""
    i3 = choose(order, 3) - edges * (order - 2) + wedges
    matchings = choose(edges, 2) - wedges
    s3 = (
        edges * choose(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.expand(i3), sp.expand(s3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def check_pins() -> dict[str, str]:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    return actual


def all_nonnegative_power_coefficients(
    expression: sp.Expr, variables: tuple[sp.Symbol, ...]
) -> bool:
    return all(
        coefficient.is_nonnegative
        for coefficient in sp.Poly(sp.expand(expression), *variables).coeffs()
    )


def bernstein_coefficients(
    expression: sp.Expr,
    variable: sp.Symbol,
    left: sp.Expr,
    right: sp.Expr,
    target_degree: int | None = None,
) -> list[sp.Expr]:
    """Bernstein coefficients on [left,right], optionally degree elevated."""
    y = sp.symbols("y", real=True)
    power = sp.Poly(
        sp.expand(expression.subs(variable, left + (right - left) * y)), y
    )
    source_degree = power.degree()
    degree = source_degree if target_degree is None else target_degree
    assert degree >= source_degree
    ascending = [power.coeff_monomial(y**k) for k in range(source_degree + 1)]
    return [
        sp.factor(
            sum(
                ascending[k]
                * sp.binomial(index, k)
                / sp.binomial(degree, k)
                for k in range(min(index, source_degree) + 1)
            )
        )
        for index in range(degree + 1)
    ]


def symbolic_cross() -> tuple[sp.Expr, tuple[sp.Symbol, ...]]:
    n, d, t, p, v4, neighbor = sp.symbols(
        "n d t p v4 neighbor", integer=True, nonnegative=True
    )
    iq, sq = rank3_coordinates(n + t, n - 1, p, v4)
    p_t = p + d + choose(t + 1, 2)
    v4_t = v4 + choose(d, 2) + choose(t + 1, 3) + neighbor + d * t
    it, st = rank3_coordinates(n + t + 1, n + t, p_t, v4_t)
    cross = sp.expand(st * iq - sq * it)
    return cross, (n, d, t, p, v4, neighbor)


def finite_base(
    cross: sp.Expr, symbols: tuple[sp.Symbol, ...]
) -> dict[str, object]:
    """Prove every marked tree of order at most 14 for all integer t>=1."""
    n, d, t, p, v4, neighbor = symbols
    s = sp.symbols("s", integer=True, nonnegative=True)
    shifted = sp.Poly(sp.expand(12 * cross.subs(t, s + 1)), s)
    assert shifted.degree() == 4
    coefficients = [shifted.coeff_monomial(s**k) for k in range(5)]
    assert all(
        all(term.is_Integer for term in sp.Poly(item, *symbols[:2], p, v4, neighbor).coeffs())
        for item in coefficients
    )
    evaluators = [
        sp.lambdify((n, d, p, v4, neighbor), item, modules="math")
        for item in coefficients
    ]

    stream = hashlib.sha256()
    per_order: list[dict[str, int]] = []
    total_trees = 0
    total_marked = 0
    minimum: int | None = None
    minimum_witness: dict[str, object] | None = None
    zero_coefficients = 0

    for order in range(1, 15):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        tree_count = 0
        marked_count = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            degrees = dict(tree.degree())
            wedges = sum(comb(value, 2) for value in degrees.values())
            stars = sum(comb(value, 3) for value in degrees.values())
            paths = sum(
                (degrees[u] - 1) * (degrees[v] - 1)
                for u, v in tree.edges()
            )
            connected_four = stars + paths
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for root in sorted(tree.nodes()):
                marked_count += 1
                root_degree = degrees[root]
                root_neighbor_excess = sum(
                    degrees[vertex] - 1 for vertex in tree.neighbors(root)
                )
                values = tuple(
                    int(evaluator(
                        order,
                        root_degree,
                        wedges,
                        connected_four,
                        root_neighbor_excess,
                    ))
                    for evaluator in evaluators
                )
                assert all(value >= 0 for value in values), (
                    order, tree_index, root, graph6, values
                )
                zero_coefficients += sum(value == 0 for value in values)
                local_minimum = min(values)
                if minimum is None or local_minimum < minimum:
                    minimum = local_minimum
                    minimum_witness = {
                        "order": order,
                        "tree_index": tree_index,
                        "root": root,
                        "graph6": graph6,
                        "cleared_shifted_coefficients_low_to_high": list(values),
                    }
                stream.update(
                    (
                        f"{order},{tree_index},{root},{graph6},"
                        + ",".join(map(str, values))
                        + "\n"
                    ).encode()
                )
        total_trees += tree_count
        total_marked += marked_count
        per_order.append({
            "order": order,
            "trees": tree_count,
            "marked_trees": marked_count,
        })
        print(f"finite n={order}: trees={tree_count:,} marked={marked_count:,}")

    return {
        "orders": [1, 14],
        "tree_count": total_trees,
        "marked_tree_count": total_marked,
        "shifted_coefficient_count": 5 * total_marked,
        "minimum_cleared_shifted_coefficient": minimum,
        "zero_coefficient_count": zero_coefficients,
        "minimum_witness": minimum_witness,
        "ordered_coefficient_sha256": stream.hexdigest().upper(),
        "per_order": per_order,
    }


def analytic_certificate(
    cross_generic: sp.Expr, symbols: tuple[sp.Symbol, ...]
) -> dict[str, object]:
    """Prove the anchor cross for n>=15 by exact endpoint reduction."""
    n, d, t, p, v4, neighbor = symbols
    b2, b3, x, b, r, s = sp.symbols(
        "b2 b3 x b r s", integer=True, nonnegative=True
    )
    cross = sp.expand(cross_generic.subs({p: n - 2 + b2, v4: n - 3 + b2 + b}))

    b_slope = sp.factor(sp.diff(cross, b))
    expected_b_slope = -sp.Rational(3, 2) * (2 * d + n**2 - 5 * n + 4)
    assert sp.expand(b_slope - expected_b_slope) == 0
    assert all_nonnegative_power_coefficients(
        (-expected_b_slope).subs({n: r + 15, d: 1}), (r,)
    )

    neighbor_slope = sp.factor(sp.diff(cross, neighbor))
    expected_neighbor_slope = (
        6 * b2
        + n**3 + 3 * n**2 * t - 9 * n**2
        + 3 * n * t**2 - 12 * n * t + 26 * n
        + t**3 - 3 * t**2 + 8 * t - 24
    ) / 2
    assert sp.expand(neighbor_slope - expected_neighbor_slope) == 0
    neighbor_shift = sp.expand(
        neighbor_slope.subs({n: r + 15, t: s + 1})
    )
    assert all_nonnegative_power_coefficients(neighbor_shift, (r, s, b2))

    # Pinned Zagreb: 7X <= 2(n-4)B2-6B3.  Together with
    # 3B3 <= (n-4)B2 this gives B3+X <= (n-4)B2/3.
    zagreb_upper = sp.factor(
        b3 + (2 * (n - 4) * b2 - 6 * b3) / 7
    )
    final_b_upper = sp.factor(
        zagreb_upper.subs(b3, (n - 4) * b2 / 3)
    )
    assert final_b_upper == (n - 4) * b2 / 3

    lower = sp.expand(cross.subs({b: final_b_upper, neighbor: 0}))
    lower_poly = sp.Poly(lower, b2)
    assert lower_poly.degree() == 2
    assert lower_poly.LC() == -2

    b2_low = choose(d - 1, 2)
    b2_high = b2_low + choose(n - d - 1, 2)
    endpoint_low = sp.expand(lower.subs(b2, b2_low))
    endpoint_high = sp.expand(lower.subs(b2, b2_high))
    endpoint_data: dict[str, object] = {}

    for name, endpoint in (("low", endpoint_low), ("high", endpoint_high)):
        shifted_t = sp.Poly(sp.expand(endpoint.subs(t, s + 1)), s)
        assert shifted_t.degree() == 4
        coefficient_records: list[dict[str, object]] = []
        for rank in range(5):
            coefficient = shifted_t.coeff_monomial(s**rank)
            if name == "low" and rank == 0:
                coefficient_records.append({
                    "power": rank,
                    "method": "centered-square-negative-discriminant",
                })
                continue
            target_degree = 6 if name == "high" and rank == 0 else None
            bernstein = bernstein_coefficients(
                coefficient, d, 1, n - 1, target_degree
            )
            shifted_bernstein = [
                sp.Poly(sp.expand(item.subs(n, r + 15)), r)
                for item in bernstein
            ]
            assert all(
                all(value.is_nonnegative for value in item.coeffs())
                for item in shifted_bernstein
            ), (name, rank, bernstein)
            stream = hashlib.sha256()
            for item in bernstein:
                stream.update((sp.srepr(item) + "\n").encode())
            coefficient_records.append({
                "power": rank,
                "method": "bernstein-on-d-interval",
                "bernstein_degree": len(bernstein) - 1,
                "bernstein_coefficient_count": len(bernstein),
                "bernstein_sha256": stream.hexdigest().upper(),
            })
        endpoint_data[name] = {
            "shifted_t_degree": shifted_t.degree(),
            "coefficient_certificates": coefficient_records,
        }

    # The only non-Bernstein coefficient is the t=1 low endpoint.  With
    # c=2d-n, its numerator is a square plus a positive quadratic.
    c = sp.symbols("c", real=True)
    low_constant = sp.Poly(
        sp.expand(endpoint_low.subs(t, 1)), d
    )
    centered = sp.factor(low_constant.as_expr().subs(d, (n + c) / 2))
    centered_numerator, centered_denominator = sp.together(centered).as_numer_denom()
    assert centered_denominator == 192
    centered_poly = sp.Poly(centered_numerator, c)
    quadratic_a = sp.factor(centered_poly.coeff_monomial(c**2) - 48)
    quadratic_b = sp.factor(centered_poly.coeff_monomial(c))
    quadratic_c = sp.factor(centered_poly.coeff_monomial(1))
    square_part = 3 * c**2 * (c + 4)**2
    assert sp.expand(
        centered_numerator
        - square_part
        - quadratic_a * c**2
        - quadratic_b * c
        - quadratic_c
    ) == 0
    expected_quadratic_a = 2 * (8 * n**3 - 57 * n**2 + 148 * n - 186)
    assert sp.expand(quadratic_a - expected_quadratic_a) == 0, quadratic_a
    discriminant = sp.factor(quadratic_b**2 - 4 * quadratic_a * quadratic_c)
    discriminant_factor = sp.factor(-discriminant / 8)
    assert all_nonnegative_power_coefficients(
        quadratic_a.subs(n, r + 15), (r,)
    )
    assert all_nonnegative_power_coefficients(
        discriminant_factor.subs(n, r + 15), (r,)
    )
    assert quadratic_a.subs(n, 15) > 0
    assert discriminant_factor.subs(n, 15) > 0

    endpoint_data["low"]["centered_certificate"] = {
        "center_variable": "c=2d-n",
        "identity": "192*E_low(t=1)=3*c^2*(c+4)^2+A(n)c^2+B(n)c+C(n)",
        "quadratic_a": str(quadratic_a),
        "quadratic_discriminant": str(discriminant),
        "negative_discriminant_factor": str(discriminant_factor),
        "n15_shift_a_coefficients": [
            str(item)
            for item in sp.Poly(sp.expand(quadratic_a.subs(n, r + 15)), r).all_coeffs()
        ],
        "n15_shift_negative_discriminant_factor_coefficients": [
            str(item)
            for item in sp.Poly(
                sp.expand(discriminant_factor.subs(n, r + 15)), r
            ).all_coeffs()
        ],
    }

    return {
        "orders": "n>=15",
        "b3_plus_x_slope": str(b_slope),
        "neighbor_excess_slope": str(neighbor_slope),
        "zagreb_derived_b3_plus_x_upper": str(final_b_upper),
        "b2_interval": [str(b2_low), str(b2_high)],
        "b2_quadratic_leading_coefficient": str(lower_poly.LC()),
        "endpoint_certificates": endpoint_data,
    }


def main() -> None:
    pins = check_pins()
    cross, symbols = symbolic_cross()
    analytic = analytic_certificate(cross, symbols)
    finite = finite_base(cross, symbols)
    report = {
        "schema": "terminal-q3-anchor-ordering-exact-root-v1",
        "date": "2026-08-28",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING",
        "claim": (
            "For every tree G, marked vertex w, and integer t>=1, if T is "
            "formed by adjoining wv and t leaves at v and Q=G disjoint union "
            "t isolates, then q3(T)>=q3(Q) whenever the ratios are defined."
        ),
        "cross": "s3(T)*i3(Q)-s3(Q)*i3(T)",
        "pinned_inputs": pins,
        "analytic_certificate": analytic,
        "finite_certificate": finite,
        "scope": (
            "This proves the anchor ordering used by the terminal two-block "
            "mixture reduction.  It does not prove the remaining target-rank "
            "cross-block payment and does not by itself resolve Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"report={OUTPUT.name}")
    print(f"marked finite cells={finite['marked_tree_count']:,}")
    print(f"ordered finite stream={finite['ordered_coefficient_sha256']}")


if __name__ == "__main__":
    main()
