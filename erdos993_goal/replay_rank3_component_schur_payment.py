#!/usr/bin/env python3
"""Exact replay for the all-forest rank-three component Schur payment.

For a forest G with pendant edge lp, put F=G-{l,p}.  The theorem checked
symbolically here is

    9 Delta_3(I(G))/i_2(G) >= 4 Delta_2(I(F))/i_1(F)

whenever rank three lies in the PGC prefix (equivalently alpha(G)>=6).
The proof is an exact forest degree-moment certificate.  The optional finite
census is only an independent consistency audit, not part of the theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent


def coeff(poly: Polynomial, k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, av in enumerate(a):
        for j, bv in enumerate(b):
            out[i + j] += av * bv
    return tuple(out)


def delta(poly: Polynomial, k: int) -> int:
    return coeff(poly, k) ** 2 - coeff(poly, k - 1) * coeff(poly, k + 1)


def normalized_schur(poly: Polynomial, k: int) -> Fraction:
    return Fraction(k * k * delta(poly, k), coeff(poly, k - 1))


def h_reserve(poly: Polynomial, k: int) -> Fraction:
    return normalized_schur(poly, k) + k * (
        coeff(poly, k) - coeff(poly, k + 1)
    )


def frac(value: Fraction) -> dict[str, int | str]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
    }


def bernstein_coefficients(expr: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    poly = sp.Poly(sp.expand(expr), variable)
    degree = poly.degree()
    return [
        sp.expand(
            sum(
                poly.coeff_monomial(variable**power)
                * sp.Rational(comb(index, power), comb(degree, power))
                for power in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def positive_power_terms(expr: sp.Expr, variables: tuple[sp.Symbol, ...]) -> int:
    poly = sp.Poly(sp.expand(expr), *variables)
    assert poly.as_expr() != 0
    assert all(value >= 0 for _, value in poly.terms())
    return len(poly.terms())


def shifted_power_terms(
    expr: sp.Expr,
    variables: tuple[sp.Symbol, ...],
    root: tuple[int, ...],
) -> int:
    return positive_power_terms(
        sp.expand(
            expr.subs(
                {
                    variable: variable + offset
                    for variable, offset in zip(variables, root)
                }
            )
        ),
        variables,
    )


def symbolic_certificate() -> dict[str, object]:
    n, e, c, h = sp.symbols("n e c h", integer=True, nonnegative=True)
    z_stat, t_stat, d, s_stat = sp.symbols(
        "Z T d S", integer=True, nonnegative=True
    )
    choose2 = lambda q: q * (q - 1) / 2
    choose3 = lambda q: q * (q - 1) * (q - 2) / 6
    choose4 = lambda q: q * (q - 1) * (q - 2) * (q - 3) / 24

    p2 = choose2(n) - e
    p3 = choose3(n) - e * (n - 2) + z_stat
    p4 = (
        choose4(n)
        - e * choose2(n - 2)
        + z_stat * (n - 3)
        + choose2(e)
        - z_stat
        - t_stat
    )
    nf = n - 2
    ef = e - d
    zf = z_stat - choose2(d) - s_stat
    f2 = choose2(nf) - ef
    f3 = choose3(nf) - ef * (nf - 2) + zf

    # Gamma/(p2*(n-2)) is exactly the normalized Schur payment.
    gamma = sp.expand(
        9 * nf * (p3**2 - p2 * p4)
        - 4 * p2 * (f2**2 - nf * f3)
    )

    m2, m3, j_stat, x = sp.symbols("M2 M3 J x", nonnegative=True)
    excess = e - h
    moment_gamma = sp.expand(
        gamma.subs(
            {
                n: e + c,
                z_stat: (m2 + excess) / 2,
                t_stat: (m3 - excess) / 6 + j_stat,
                d: x + 1,
            }
        )
    )
    k2 = (e + c) ** 2 - (e + c) - 2 * e
    assert sp.factor(
        sp.diff(moment_gamma, j_stat)
        - sp.Rational(9, 2) * (e + c - 2) * k2
    ) == 0
    assert sp.factor(
        sp.diff(moment_gamma, s_stat) + 2 * (e + c - 2) * k2
    ) == 0
    assert sp.factor(
        sp.diff(moment_gamma, m3)
        - sp.Rational(3, 4) * (e + c - 2) * k2
    ) == 0

    # For x>=1, J>=xS makes (9/2)J-2S nonnegative.  For x=0 the
    # pendant component is K2 and S=0.  Thus J and S can be dropped.
    relaxed = sp.expand(moment_gamma.subs({j_stat: 0, s_stat: 0}))

    # Moment region 1: E<=M2<=2E, M3>=3M2-2E.
    t = sp.symbols("t", nonnegative=True)
    region1 = sp.expand(
        relaxed.subs(
            {
                m2: excess * (1 + t),
                m3: excess * (1 + 3 * t),
            }
        )
    )

    big_h, isolates, other, local = sp.symbols(
        "H v a X", nonnegative=True
    )
    many_sub = {
        h: 2 + big_h,
        c: 2 + big_h + isolates,
        x: 1 + local,
        e: 3 + local + other + big_h,
    }
    one_component_sub = {
        h: 1,
        c: 2 + isolates,
        x: 1 + local,
        e: 2 + local + other,
    }
    roots_many = [
        (2, 0, 0, 0),
        (0, 2, 0, 0),
        (0, 0, 1, 0),
        (0, 0, 0, 2),
        (1, 1, 0, 0),
        (1, 0, 0, 1),
        (0, 1, 0, 1),
    ]
    roots_one = [
        (first, second, 3 - first - second)
        for first in range(4)
        for second in range(4 - first)
    ]
    exceptional_root = (3, 0, 0)
    exceptional_shifts = ((4, 0, 0), (3, 1, 0), (3, 0, 1))
    term_checks = 0

    many_bcs = bernstein_coefficients(region1.subs(many_sub), t)
    one_bcs = bernstein_coefficients(region1.subs(one_component_sub), t)
    assert len(many_bcs) == len(one_bcs) == 3
    for bc in many_bcs:
        for root in roots_many:
            term_checks += shifted_power_terms(
                bc, (local, other, big_h, isolates), root
            )
    for bc in one_bcs:
        for root in roots_one:
            if root != exceptional_root:
                term_checks += shifted_power_terms(
                    bc, (local, other, isolates), root
                )
        for root in exceptional_shifts:
            term_checks += shifted_power_terms(
                bc, (local, other, isolates), root
            )

    # Moment region 2: M2>=2E, M3>=M2^2/E.  The result is a convex
    # quadratic.  Its unconstrained vertex is a valid lower bound.
    quadratic_a = sp.factor(
        sp.diff(relaxed, m2, 2) / 2 + sp.diff(relaxed, m3) / excess
    )
    quadratic_b = sp.expand(sp.diff(relaxed, m2).subs(m2, 0))
    quadratic_d = sp.expand(relaxed.subs({m2: 0, m3: 0}))
    vertex_value = sp.factor(
        quadratic_d - quadratic_b**2 / (4 * quadratic_a)
    )
    vertex_numerator, vertex_denominator = sp.together(
        vertex_value
    ).as_numer_denom()
    assert sp.factor(
        vertex_denominator
        - 48 * (c**2 + 2 * c * e - c + e**2 - 3 * h)
    ) == 0

    for root in roots_many:
        term_checks += shifted_power_terms(
            vertex_numerator.subs(many_sub),
            (local, other, big_h, isolates),
            root,
        )
    for root in roots_one:
        if root != exceptional_root:
            term_checks += shifted_power_terms(
                vertex_numerator.subs(one_component_sub),
                (local, other, isolates),
                root,
            )
    for root in exceptional_shifts:
        term_checks += shifted_power_terms(
            vertex_numerator.subs(one_component_sub),
            (local, other, isolates),
            root,
        )

    # The sole uncovered point is K_{1,5} disjoint union K1, with the
    # pendant support at the star centre.  M2=16 is forced.
    region2 = sp.expand(relaxed.subs(m3, m2**2 / excess))
    exceptional_value = sp.factor(
        region2.subs({e: 5, c: 2, h: 1, x: 4, m2: 16})
    )
    assert exceptional_value == 4000

    # A pendant K2 component with E>0.  Then another nontrivial component
    # exists: E=1+a, h=2+H, c=h+v.
    k2_sub = {
        h: 2 + big_h,
        c: 2 + big_h + isolates,
        e: 3 + other + big_h,
        x: 0,
    }
    for bc in bernstein_coefficients(region1.subs(k2_sub), t):
        term_checks += positive_power_terms(bc, (other, big_h, isolates))
    term_checks += positive_power_terms(
        vertex_numerator.subs(k2_sub), (other, big_h, isolates)
    )

    # If E=0, the forest is a matching plus isolates.  Here alpha=c>=6
    # and 1<=h<=c.  Bernstein expansion in h closes the whole interval.
    alpha, y, u = sp.symbols("alpha y u", nonnegative=True)
    matching_gamma = sp.factor(
        gamma.subs(
            {
                n: 2 * h + (alpha - h),
                e: h,
                z_stat: 0,
                t_stat: 0,
                d: 1,
                s_stat: 0,
            }
        )
    )
    matching_transformed = sp.expand(
        matching_gamma.subs(
            {alpha: 6 + y, h: 1 + u * (5 + y)}
        )
    )
    matching_bcs = bernstein_coefficients(matching_transformed, u)
    assert len(matching_bcs) == 8
    for bc in matching_bcs:
        term_checks += positive_power_terms(bc, (y,))

    # Connected trees.  First isolate the exact degree-moment bracket.
    tree_gamma = sp.factor(
        gamma.subs(
            {
                n: e + 1,
                z_stat: (m2 + e - 1) / 2,
                t_stat: (m3 - e + 1) / 6 + j_stat,
                d: x + 1,
            }
        )
    )
    linear_m2 = -3 * e**3 + 4 * e**2 + 17 * e - 18
    constant = (
        e**6 / 4
        - 17 * e**5 / 12
        - e**4 / 12
        + 17 * e**3 / 12
        - 4 * e**2 * x**2
        + 4 * e**2 * x
        + 65 * e**2 / 6
        - 4 * e * x**2
        - 4 * e * x
        - 20 * e
        + 9
    )
    tree_bracket = (
        18 * e * (e - 1) * j_stat
        - 8 * e * (e - 1) * s_stat
        + 9 * m2**2
        + linear_m2 * m2
        + 3 * e * (e - 1) * m3
        + constant
    )
    assert sp.factor(tree_gamma - (e - 1) * tree_bracket / 4) == 0

    # For a nonstar tree J>=xS and J>=e-2.  Thus its local contribution
    # is at least (18-8/x)e(e-1)(e-2).
    reduced_constant = sp.factor(
        constant + (18 - 8 / x) * e * (e - 1) * (e - 2)
    )
    tree_a = 9 + 3 * e
    tree_vertex = sp.factor(
        reduced_constant - linear_m2**2 / (4 * tree_a)
    )
    tree_vertex_num, tree_vertex_den = sp.together(
        tree_vertex
    ).as_numer_denom()
    assert sp.factor(tree_vertex_den - 12 * x * (e + 3)) == 0

    # Rank three requires alpha>=6.  A connected nonstar then has e>=7,
    # and 1<=x<=e-2.  The four Bernstein coefficients are positive.
    tree_y, tree_u = sp.symbols("tree_y tree_u", nonnegative=True)
    tree_transformed = sp.Poly(
        sp.expand(
            tree_vertex_num.subs(
                {
                    e: 7 + tree_y,
                    x: 1 + tree_u * (4 + tree_y),
                }
            )
        ),
        tree_u,
    )
    assert tree_transformed.degree() == 3
    tree_bernstein = []
    for index in range(4):
        bc = sp.expand(
            sum(
                tree_transformed.coeff_monomial(tree_u**power)
                * sp.Rational(comb(index, power), comb(3, power))
                for power in range(index + 1)
            )
        )
        poly = sp.Poly(bc, tree_y)
        assert all(value > 0 for _, value in poly.terms())
        term_checks += len(poly.terms())
        tree_bernstein.append(str(sp.factor(bc)))

    # In region 1 the quadratic is decreasing up to M2=2(e-1), where
    # it meets the already certified region-2 quadratic.
    boundary_derivative = sp.factor(
        18 * (e - 1) + linear_m2 + 9 * e * (e - 1)
    )
    assert sp.expand(
        boundary_derivative + (e - 1) * (3 * e**2 - 10 * e - 36)
    ) == 0

    # The only connected e=6 tree with alpha>=6 is K_{1,6}.  In fact
    # every connected star has an explicit positive payment.
    star_schur = sp.factor(
        e * (e - 1) * (e - 2) * (3 * e - 5) / 24
    )
    star_transport = sp.factor(
        -(e - 1) * (e - 2) * (3 * e**2 - 29 * e + 48) / 24
    )
    star_pgc = sp.factor((e - 1) * (e - 2) ** 2)
    assert sp.factor(star_schur + star_transport - star_pgc) == 0

    return {
        "cleared_gap": str(gamma),
        "moment_coefficients": {
            "J": "(9/2)*(n-2)*(n^2-n-2e)",
            "S": "-2*(n-2)*(n^2-n-2e)",
            "M3": "(3/4)*(n-2)*(n^2-n-2e)",
        },
        "nonnegative_power_terms_checked": term_checks,
        "disconnected_exception_gamma": int(exceptional_value),
        "connected_tree_vertex_denominator": str(tree_vertex_den),
        "connected_tree_bernstein_coefficients": tree_bernstein,
        "star": {
            "normalized_schur_payment": str(star_schur),
            "first_difference_transport": str(star_transport),
            "pgc_margin": str(star_pgc),
        },
    }


def finite_audit(max_order: int) -> dict[str, object]:
    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(max_order + 1)
    ]
    pendant_pairs: list[set[tuple[Polynomial, Polynomial]]] = [
        set() for _ in range(max_order + 1)
    ]
    tree_polynomials[1].add((1, 1))
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = ip.polynomial(full_mask)
            tree_polynomials[order].add(full)
            for leaf in (vertex for vertex in tree if tree.degree(vertex) == 1):
                support = next(iter(tree.neighbors(leaf)))
                deletion_mask = (
                    full_mask
                    ^ (1 << ip.position[leaf])
                    ^ (1 << ip.position[support])
                )
                pendant_pairs[order].add((full, ip.polynomial(deletion_mask)))

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    for order in range(1, max_order + 1):
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    forest_polynomials[order].add(multiply(component, rest))

    checks = 0
    negative_transports = 0
    minima: dict[str, tuple[Fraction, dict[str, object]] | None] = {
        "schur": None,
        "transport": None,
        "pgc": None,
    }
    for component_order in range(2, max_order + 1):
        for component, deletion in pendant_pairs[component_order]:
            for common_order in range(max_order - component_order + 1):
                for common in forest_polynomials[common_order]:
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    alpha = len(full) - 1
                    if alpha < 6:
                        continue
                    checks += 1
                    schur = normalized_schur(full, 3) - normalized_schur(
                        reduced, 2
                    )
                    transport = Fraction(
                        3 * (coeff(full, 3) - coeff(full, 4))
                        - 2 * (coeff(reduced, 2) - coeff(reduced, 3))
                    )
                    pgc = schur + transport
                    if transport < 0:
                        negative_transports += 1
                    values = {
                        "schur": schur,
                        "transport": transport,
                        "pgc": pgc,
                    }
                    for name, value in values.items():
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
                            "value": frac(value),
                        }
                        if minima[name] is None or value < minima[name][0]:
                            minima[name] = (value, item)

    assert checks > 0
    assert minima["schur"] is not None and minima["schur"][0] >= 0
    assert minima["pgc"] is not None and minima["pgc"][0] >= 0
    return {
        "max_order": max_order,
        "rank_three_pair_checks": checks,
        "negative_first_difference_transports": negative_transports,
        "minima": {name: value[1] for name, value in minima.items()},
        "scope": "finite consistency evidence only; theorem is symbolic",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank3_component_schur_payment_exact_20260813.json",
    )
    args = parser.parse_args()
    assert 7 <= args.max_order <= 18

    certificate = symbolic_certificate()
    audit = finite_audit(args.max_order)
    result = {
        "status": "PASS_ALL_FOREST_RANK3_SCHUR_PAYMENT_AND_TRANSPORT_AUDIT",
        "theorem": {
            "scope": (
                "every forest G with pendant edge lp and alpha(G)>=6; "
                "F=G-{l,p}"
            ),
            "statement": (
                "9*Delta_3(I(G))/i_2(G) >= "
                "4*Delta_2(I(F))/i_1(F)"
            ),
            "certificate": certificate,
        },
        "transport_conclusion": {
            "identity": (
                "H_3(I(G))-H_2(I(F)) = SchurPayment + "
                "3*(p3-p4)-2*(f2-f3)"
            ),
            "rigorous_payment": (
                "The proved three-quarters rank-three cascade gives "
                "3H_3(I(G))>=4H_2(I(F)); rank-two positivity gives "
                "SchurPayment+Transport>=H_2(I(F))/3>=0."
            ),
            "negative_transport_literal_example": "K1,8 at rank 3",
        },
        "bounded_audit": audit,
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(result["status"])
    print(f"output={args.output}")
    print(f"output_sha256={digest}")
    print(
        "rank_three_checks={} negative_transports={}".format(
            audit["rank_three_pair_checks"],
            audit["negative_first_difference_transports"],
        )
    )
    print(
        "minimum_schur_payment={}".format(
            audit["minima"]["schur"]["value"]["text"]
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
