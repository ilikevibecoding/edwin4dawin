#!/usr/bin/env python3
"""Exact replay for the all-forest rank-four component Schur theorem.

For a forest G with pendant edge lp, put B=G-{l,p}.  This replay proves

    16 Delta_4(I(G))/i_3(G) >= 9 Delta_3(I(B))/i_2(B)

whenever alpha(G)>=7.  It also proves H_4(I(G))>=H_3(I(B)).  The new
inputs are two literal-configuration inequalities for a single forest;
the only imported all-order theorem is the already certified rank-four
three-halves reserve Q_4>=0.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
FOREST_COUNTS_THROUGH_19 = (
    1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348, 2974,
    6777, 15739, 37524, 90965, 224562, 561475,
)


def coeff(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return tuple(out)


def normalized_schur(poly: Polynomial, rank: int) -> Fraction:
    delta = coeff(poly, rank) ** 2 - coeff(poly, rank - 1) * coeff(poly, rank + 1)
    return Fraction(rank * rank * delta, coeff(poly, rank - 1))


def h_reserve(poly: Polynomial, rank: int) -> Fraction:
    return normalized_schur(poly, rank) + rank * (
        coeff(poly, rank) - coeff(poly, rank + 1)
    )


def q4(poly: Polynomial) -> int:
    p3, p4, p5 = (coeff(poly, rank) for rank in (3, 4, 5))
    return 8 * p4 * p4 - p3 * p4 - 10 * p3 * p5


def upper_u(poly: Polynomial) -> int:
    b2, b3, b4 = (coeff(poly, rank) for rank in (2, 3, 4))
    return b2 * b3 + 6 * b2 * b4 - 3 * b3 * b3


def upper_l(poly: Polynomial) -> int:
    b2, b3, b4, b5 = (coeff(poly, rank) for rank in (2, 3, 4, 5))
    return 2 * b2 * b3 + 15 * b2 * b4 + 4 * b2 * b5 - 9 * b3 * b3


def frac(value: Fraction) -> dict[str, int | str]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
    }


def bernstein_coefficients(expr: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    polynomial = sp.Poly(sp.expand(expr), variable)
    degree = polynomial.degree()
    return [
        sp.expand(
            sum(
                polynomial.coeff_monomial(variable**power)
                * sp.Rational(comb(index, power), comb(degree, power))
                for power in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def nonnegative_y_terms(expr: sp.Expr, y: sp.Symbol) -> int:
    terms = sp.Poly(sp.expand(expr), y).terms()
    assert terms and all(coefficient >= 0 for _, coefficient in terms)
    return len(terms)


def large_order_certificate() -> dict[str, object]:
    """Prove the U and L inequalities for every forest of order >=20."""

    n, e, s_stat, r_stat, h_stat, w_stat = sp.symbols(
        "n e S R H W", nonnegative=True
    )
    choose = lambda z, k: sp.prod(z - j for j in range(k)) / sp.factorial(k)
    b2 = choose(n, 2) - e
    b3 = choose(n, 3) - e * (n - 2) + s_stat
    b4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + s_stat * (n - 4)
        + choose(e, 2)
        - r_stat
    )
    b5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + s_stat * choose(n - 3, 2)
        + (choose(e, 2) - s_stat) * (n - 4)
        - r_stat * (n - 4)
        - (s_stat * (e - 2) - 2 * r_stat - h_stat)
        + w_stat
    )
    u_expr = sp.expand(b2 * b3 + 6 * b2 * b4 - 3 * b3**2)
    l_expr = sp.expand(
        2 * b2 * b3 + 15 * b2 * b4 + 4 * b2 * b5 - 9 * b3**2
    )

    # Q=S(e-2)-2R-H counts an adjacent edge-pair plus a disjoint edge.
    # Thus R<=(S(e-2)-H)/2.  The coefficients below justify replacing R
    # by this upper bound; W can be replaced by zero in L.
    assert sp.factor(sp.diff(u_expr, r_stat) + 6 * b2) == 0
    assert sp.factor(sp.diff(l_expr, r_stat) + (4 * n - 9) * b2) == 0
    assert sp.factor(sp.diff(l_expr, w_stat) - 4 * b2) == 0
    r_upper = (s_stat * (e - 2) - h_stat) / 2
    relaxed = {
        "U": sp.expand(u_expr.subs(r_stat, r_upper)),
        "L": sp.expand(l_expr.subs({r_stat: r_upper, w_stat: 0})),
    }

    # With x_v=d(v)-1 on nonisolated vertices, E=sum x_v=e-h,
    # S=(M2+E)/2 and H=(M3-E)/6.  The elementary moment bounds used in
    # the rank-three proof give the following three valid lower bounds.
    h_bounds = (
        ("S_le_e", 0),
        ("e_le_S_le_3e_over_2", s_stat - e),
        ("S_ge_3e_over_2", 2 * s_stat * (s_stat - e) / (3 * e)),
    )

    y, t = sp.symbols("y t", nonnegative=True)
    # A nonempty forest can have as many as n-1 edges (the connected-tree
    # endpoint).  Parameterize the full interval 1 <= e <= n-1.
    substitution = {n: 20 + y, e: 1 + t * (19 + y)}
    result: dict[str, object] = {}
    total_terms = 0
    for name, expression in relaxed.items():
        region0 = sp.expand(expression.subs(h_stat, h_bounds[0][1]))
        region1 = sp.expand(expression.subs(h_stat, h_bounds[1][1]))
        region2 = sp.expand(expression.subs(h_stat, h_bounds[2][1]))
        assert sp.diff(region0, s_stat, 2) < 0
        assert sp.diff(region1, s_stat, 2) < 0

        # The first two regions are concave in S, so only 0,e,3e/2 are
        # needed.  The last is a convex quadratic and is bounded by its
        # unrestricted vertex.
        checks = {
            "S=0": region0.subs(s_stat, 0),
            "S=e": region0.subs(s_stat, e),
            "S=3e/2": region1.subs(s_stat, sp.Rational(3, 2) * e),
        }
        quadratic_a = sp.factor(sp.diff(region2, s_stat, 2) / 2)
        quadratic_b = sp.expand(sp.diff(region2, s_stat).subs(s_stat, 0))
        quadratic_d = sp.expand(region2.subs(s_stat, 0))
        vertex_numerator = sp.factor(
            4 * quadratic_a * quadratic_d - quadratic_b**2
        )
        checks["vertex_numerator"] = vertex_numerator
        checks["quadratic_coefficient"] = quadratic_a

        check_record: dict[str, object] = {}
        for check_name, check_expr in checks.items():
            numerator, denominator = sp.together(
                check_expr.subs(substitution)
            ).as_numer_denom()
            coefficients = bernstein_coefficients(numerator, t)
            term_count = sum(nonnegative_y_terms(value, y) for value in coefficients)
            total_terms += term_count
            check_record[check_name] = {
                "t_degree": len(coefficients) - 1,
                "nonnegative_y_power_terms": term_count,
                "denominator": str(sp.factor(denominator)),
            }
        result[name] = check_record

    # The edgeless forest was excluded by e=1+t(n-1); verify it directly.
    edgeless_u = sp.factor(u_expr.subs({e: 0, s_stat: 0, r_stat: 0}))
    edgeless_l = sp.factor(
        l_expr.subs({e: 0, s_stat: 0, r_stat: 0, h_stat: 0, w_stat: 0})
    )
    assert edgeless_u == n**2 * (n - 3) * (n - 2) * (n - 1) ** 2 / 24
    assert edgeless_l == (
        n**2 * (n - 2) * (n - 1) ** 2 * (n + 1) * (4 * n - 17) / 240
    )
    return {
        "configuration_coefficients": {
            "dU_dR": str(sp.factor(sp.diff(u_expr, r_stat))),
            "dL_dR": str(sp.factor(sp.diff(l_expr, r_stat))),
            "dL_dW": str(sp.factor(sp.diff(l_expr, w_stat))),
        },
        "configuration_bound": "2R+H <= S(e-2)",
        "moment_bounds_for_H": [
            "H>=0 for S<=e",
            "H>=S-e for e<=S<=3e/2",
            "H>=2S(S-e)/(3e) for S>=3e/2",
        ],
        "bernstein_checks": result,
        "nonnegative_power_terms_checked": total_terms,
        "edgeless_U": str(edgeless_u),
        "edgeless_L": str(edgeless_l),
    }


def enumerate_polynomials(max_order: int, pair_order: int):
    tree_polynomials: list[set[Polynomial]] = [set() for _ in range(max_order + 1)]
    pendant_pairs: list[set[tuple[Polynomial, Polynomial]]] = [
        set() for _ in range(pair_order + 1)
    ]
    tree_counts = [0] * (max_order + 1)
    tree_polynomials[1].add((1, 1))
    tree_counts[1] = 1
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            tree_counts[order] += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            tree_polynomials[order].add(full)
            if order <= pair_order:
                for leaf in (v for v in tree if tree.degree(v) == 1):
                    support = next(iter(tree.neighbors(leaf)))
                    deletion_mask = (
                        full_mask
                        ^ (1 << engine.position[leaf])
                        ^ (1 << engine.position[support])
                    )
                    pendant_pairs[order].add(
                        (full, engine.polynomial(deletion_mask))
                    )
            # polynomial() uses a method-level unbounded lru_cache whose keys
            # retain each engine instance.  Clear it per tree so the combined
            # order-19 forest census and pendant-pair census stay bounded.
            engine.polynomial.cache_clear()

    forest_polynomials: list[set[Polynomial]] = [set() for _ in range(max_order + 1)]
    forest_polynomials[0].add((1,))
    for order in range(1, max_order + 1):
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    forest_polynomials[order].add(multiply(component, rest))
    return tree_counts, tree_polynomials, pendant_pairs, forest_polynomials


def finite_lemmas(forests: list[set[Polynomial]]) -> dict[str, object]:
    assert tuple(len(forests[n]) for n in range(1, 20)) == FOREST_COUNTS_THROUGH_19
    record: dict[str, object] = {}
    for name, threshold, functional in (
        ("U", 6, upper_u),
        ("L", 7, upper_l),
    ):
        checks = 0
        minimum: tuple[int, int, Polynomial] | None = None
        for order in range(1, 20):
            for polynomial in forests[order]:
                if len(polynomial) - 1 < threshold:
                    continue
                checks += 1
                value = functional(polynomial)
                assert value >= 0
                if minimum is None or value < minimum[0]:
                    minimum = (value, order, polynomial)
        assert minimum is not None
        record[name] = {
            "alpha_threshold": threshold,
            "checks": checks,
            "minimum": {
                "value": minimum[0],
                "order": minimum[1],
                "polynomial": minimum[2],
            },
        }
    assert record["U"]["minimum"] == {
        "value": 450,
        "order": 6,
        "polynomial": (1, 6, 15, 20, 15, 6, 1),
    }
    assert record["L"]["minimum"] == {
        "value": 1656,
        "order": 11,
        "polynomial": (1, 11, 45, 86, 80, 36, 9, 1),
    }
    record["forest_polynomials_by_order"] = FOREST_COUNTS_THROUGH_19
    return record


def c_polynomial(full: Polynomial, reduced: Polynomial) -> Polynomial:
    # P=(1+x)B+xC, hence c_j=p_{j+1}-b_{j+1}-b_j.
    values = [
        coeff(full, j + 1) - coeff(reduced, j + 1) - coeff(reduced, j)
        for j in range(len(full) - 1)
    ]
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    assert all(value >= 0 for value in values)
    return tuple(values)


def pendant_audit(
    max_order: int,
    pairs: list[set[tuple[Polynomial, Polynomial]]],
    forests: list[set[Polynomial]],
) -> dict[str, object]:
    checks = 0
    boundary_checks = 0
    boundary_minimum: tuple[Fraction, dict[str, object]] | None = None
    negative_transports = 0
    minima: dict[str, tuple[Fraction, dict[str, object]] | None] = {
        "schur": None,
        "transport": None,
        "pgc": None,
    }
    for component_order in range(2, max_order + 1):
        for component, deletion in pairs[component_order]:
            for common_order in range(max_order - component_order + 1):
                for common in forests[common_order]:
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    alpha = len(full) - 1
                    if alpha < 7:
                        continue
                    checks += 1
                    cpoly = c_polynomial(full, reduced)
                    schur = normalized_schur(full, 4) - normalized_schur(reduced, 3)
                    transport = Fraction(
                        4 * (coeff(full, 4) - coeff(full, 5))
                        - 3 * (coeff(reduced, 3) - coeff(reduced, 4))
                    )
                    pgc = schur + transport

                    # Replay both exact nonnegative decompositions.
                    schur_decomposition = (
                        Fraction(2 * q4(full), coeff(full, 3))
                        + 2 * coeff(cpoly, 3)
                        + 4 * coeff(cpoly, 4)
                        + Fraction(upper_l(reduced), coeff(reduced, 2))
                    )
                    pgc_decomposition = (
                        Fraction(2 * q4(full), coeff(full, 3))
                        + 6 * coeff(cpoly, 3)
                        + Fraction(3 * upper_u(reduced), coeff(reduced, 2))
                    )
                    assert schur == schur_decomposition
                    assert pgc == pgc_decomposition
                    assert q4(full) >= 0 and upper_u(reduced) >= 0
                    if alpha >= 8:
                        assert upper_l(reduced) >= 0
                    assert schur >= 0 and pgc >= 0
                    if transport < 0:
                        negative_transports += 1
                    for name, value in (
                        ("schur", schur),
                        ("transport", transport),
                        ("pgc", pgc),
                    ):
                        item = {
                            "total_order": component_order + common_order,
                            "component_order": component_order,
                            "common_order": common_order,
                            "alpha": alpha,
                            "component": component,
                            "component_deletion": deletion,
                            "common": common,
                            "full": full,
                            "reduced": reduced,
                            "C": cpoly,
                            "value": frac(value),
                        }
                        if minima[name] is None or value < minima[name][0]:
                            minima[name] = (value, item)
                    if alpha == 7:
                        # Every alpha-seven forest has order at most fourteen
                        # by bipartiteness.  With max_order>=14 this is the
                        # complete boundary, not bounded evidence.
                        assert component_order + common_order <= 14
                        boundary_checks += 1
                        if boundary_minimum is None or schur < boundary_minimum[0]:
                            boundary_minimum = (schur, {
                                "total_order": component_order + common_order,
                                "component_order": component_order,
                                "common_order": common_order,
                                "alpha": alpha,
                                "full": full,
                                "reduced": reduced,
                                "C": cpoly,
                                "value": frac(schur),
                            })
    assert checks > 0
    assert boundary_checks > 0 and boundary_minimum is not None
    return {
        "max_order": max_order,
        "rank_four_pair_checks": checks,
        "negative_first_difference_transports": negative_transports,
        "complete_alpha_seven_boundary": {
            "checks": boundary_checks,
            "minimum": boundary_minimum[1],
            "reason_complete": "forest bipartiteness gives order<=2*alpha=14",
        },
        "minima": {name: value[1] for name, value in minima.items()},
        "scope": "independent finite consistency audit; theorem is all-order",
    }


def symbolic_decompositions() -> dict[str, str]:
    p3, p4, p5, b2, b3, b4, b5, c3, c4 = sp.symbols(
        "p3 p4 p5 b2 b3 b4 b5 c3 c4", positive=True
    )
    q = 8 * p4**2 - p3 * p4 - 10 * p3 * p5
    u = b2 * b3 + 6 * b2 * b4 - 3 * b3**2
    ell = 2 * b2 * b3 + 15 * b2 * b4 + 4 * b2 * b5 - 9 * b3**2
    schur = 16 * (p4**2 - p3 * p5) / p3 - 9 * (b3**2 - b2 * b4) / b2
    pgc = schur + 4 * (p4 - p5) - 3 * (b3 - b4)
    substitutions = {p4: b3 + b4 + c3, p5: b4 + b5 + c4}
    assert sp.factor(
        schur - (2 * q / p3 + 2 * c3 + 4 * c4 + ell / b2)
    ).subs(substitutions) == 0
    assert sp.factor(
        pgc - (2 * q / p3 + 6 * c3 + 3 * u / b2)
    ).subs(substitutions) == 0
    return {
        "schur": "2*Q4(P)/p3 + 2*c3 + 4*c4 + L(B)/b2",
        "pgc": "2*Q4(P)/p3 + 6*c3 + 3*U(B)/b2",
        "U": "b2*b3+6*b2*b4-3*b3^2",
        "L": "2*b2*b3+15*b2*b4+4*b2*b5-9*b3^2",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit-max-order", type=int, default=16)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank4_component_schur_payment_exact_20260813.json",
    )
    args = parser.parse_args()
    assert 14 <= args.audit_max_order <= 16

    started = time.perf_counter()
    decompositions = symbolic_decompositions()
    large = large_order_certificate()
    print(f"symbolic_seconds={time.perf_counter()-started:.3f}", flush=True)
    census_started = time.perf_counter()
    tree_counts, _, pairs, forests = enumerate_polynomials(19, args.audit_max_order)
    print(f"enumeration_seconds={time.perf_counter()-census_started:.3f}", flush=True)
    finite_started = time.perf_counter()
    finite = finite_lemmas(forests)
    print(f"finite_lemma_seconds={time.perf_counter()-finite_started:.3f}", flush=True)
    audit_started = time.perf_counter()
    audit = pendant_audit(args.audit_max_order, pairs, forests)
    print(f"pendant_audit_seconds={time.perf_counter()-audit_started:.3f}", flush=True)

    # The first connected-star example with genuinely negative transport.
    star = (1, 11, 45, 120, 210, 252, 210, 120, 45, 10, 1)  # K1,10
    star_b = tuple(comb(9, j) for j in range(10))
    star_schur = normalized_schur(star, 4) - normalized_schur(star_b, 3)
    star_transport = Fraction(
        4 * (coeff(star, 4) - coeff(star, 5))
        - 3 * (coeff(star_b, 3) - coeff(star_b, 4))
    )
    assert (star_schur, star_transport, star_schur + star_transport) == (
        Fraction(1218), Fraction(-42), Fraction(1176)
    )

    result = {
        "status": "PASS_ALL_FOREST_RANK4_SCHUR_PAYMENT_AND_TRANSPORT_THEOREM",
        "theorem": {
            "scope": "every forest G with pendant edge lp and alpha(G)>=7; B=G-{l,p}",
            "statement": "16*Delta4(I(G))/i3(G) >= 9*Delta3(I(B))/i2(B)",
            "transport_statement": "H4(I(G))>=H3(I(B))",
            "decompositions": decompositions,
            "dependency": (
                "Q4(P)>=0 for forest alpha(P)>=7, proved in "
                "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md"
            ),
            "new_single_forest_lemmas": {
                "U": "U(B)>=0 when alpha(B)>=6",
                "L": "L(B)>=0 when alpha(B)>=7",
                "large_order_certificate": large,
                "finite_certificate": finite,
            },
        },
        "negative_transport_example": {
            "forest": "K1,10",
            "schur_payment": frac(star_schur),
            "transport": frac(star_transport),
            "pgc_margin": frac(star_schur + star_transport),
        },
        "bounded_audit": audit,
        "unlabeled_tree_counts_through_19": tree_counts[1:],
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    output_digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    script_digest = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    print(result["status"])
    print(f"output={args.output}")
    print(f"script_sha256={script_digest}")
    print(f"output_sha256={output_digest}")
    print(
        "finite_U_checks={} finite_L_checks={} rank4_pairs={} negative_transports={}".format(
            finite["U"]["checks"],
            finite["L"]["checks"],
            audit["rank_four_pair_checks"],
            audit["negative_first_difference_transports"],
        )
    )
    print(
        "minimum_schur={} minimum_pgc={}".format(
            audit["minima"]["schur"]["value"]["text"],
            audit["minima"]["pgc"]["value"]["text"],
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
