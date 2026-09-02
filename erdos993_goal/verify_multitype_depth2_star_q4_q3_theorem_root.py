#!/usr/bin/env python3
"""Exact theorem: q_4 <= q_3 for every nonuniform depth-two star.

The universal statement is the cross-multiplied margin

    4*i_4*s_3 - 3*i_3*s_4 >= 0.

Whenever i_4>0, this is exactly q_4<=q_3 for
q_r=s_r/(r*i_r).  The proof is a complete multivariate integer-binomial
certificate, with a separate literal subset audit of small instances.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "multitype_depth2_star_q4_q3_theorem_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def derive_rows():
    x, m = sp.symbols("x m")
    d, M, S2, S3, S4 = sp.symbols(
        "d M S2 S3 S4", integer=True, nonnegative=True
    )
    power_sums = {0: d, 1: M, 2: S2, 3: S3, 4: S4}

    factor = 1 + (m + 1) * x
    for rank in range(2, 5):
        falling = sp.prod(m - offset for offset in range(rank))
        factor += falling * x**rank / sp.factorial(rank)
    log_factor = sp.series(sp.log(factor), x, 0, 5).removeO().expand()

    def sum_over_arms(expression: sp.Expr) -> sp.Expr:
        polynomial = sp.Poly(sp.expand(expression), m)
        return sp.expand(
            sum(
                coefficient * power_sums[exponent[0]]
                for exponent, coefficient in polynomial.terms()
            )
        )

    log_product = sum(
        sum_over_arms(log_factor.coeff(x, rank)) * x**rank
        for rank in range(1, 5)
    )
    product = sp.series(sp.exp(log_product), x, 0, 5).removeO().expand()
    p = [sp.expand(product.coeff(x, rank)) for rank in range(5)]

    i3 = sp.expand(p[3] + M * (M - 1) / 2)
    i4 = sp.expand(p[4] + M * (M - 1) * (M - 2) / 6)

    f1 = m + 1
    f2 = m * (m - 1) / 2
    f3 = m * (m - 1) * (m - 2) / 6
    g1 = sp.expand(p[1] - f1)
    g2 = sp.expand(p[2] - f1 * g1 - f2)
    g3 = sp.expand(p[3] - f1 * g2 - f2 * g1 - f3)
    s3 = sp.expand(
        sum_over_arms((M - m) * (M - m - 1) / 2)
        + sum_over_arms(m * g2)
    )
    s4 = sp.expand(
        sum_over_arms((M - m) * (M - m - 1) * (M - m - 2) / 6)
        + sum_over_arms(m * g3)
    )

    known_s3 = (
        M**3 + 3 * M**2 * d - 7 * M**2 - 2 * M * S2
        + M * d**2 - 4 * M * d + 3 * M - 2 * S2 * d
        + 6 * S2 + S3
    ) / 2
    assert sp.expand(s3 - known_s3) == 0
    margin = sp.factor(4 * i4 * s3 - 3 * i3 * s4)
    numerator, denominator = sp.fraction(margin)
    assert denominator == 12
    assert sp.Poly(numerator, d, M, S2, S3, S4).total_degree() == 7
    return (d, M, S2, S3, S4), (i3, i4, s3, s4), sp.expand(numerator), denominator


def symbolic_certificate() -> tuple[
    dict[str, object], tuple[sp.Symbol, ...], tuple[sp.Expr, ...]
]:
    parameters, rows, numerator, denominator = derive_rows()
    d, M, S2, S3, S4 = parameters
    i3, i4, s3, s4 = rows

    # Separate t zero arms from s positive arms, and put m_i=y_i+1 on
    # the positive arms.  Seven placeholders suffice because the margin has
    # total y-degree seven.  Coefficients with further variables are obtained
    # by setting the unmentioned y_i to zero.
    t, u = sp.symbols("t u", integer=True, nonnegative=True)
    s = u + 1
    y = sp.symbols("y0:7", integer=True, nonnegative=True)
    ps = {rank: sum(value**rank for value in y) for rank in range(1, 5)}
    substituted = sp.Poly(
        sp.expand(
            numerator.subs(
                {
                    d: s + t,
                    M: s + ps[1],
                    S2: s + 2 * ps[1] + ps[2],
                    S3: s + 3 * ps[1] + 3 * ps[2] + ps[3],
                    S4: s + 4 * ps[1] + 6 * ps[2] + 4 * ps[3] + ps[4],
                }
            )
        ),
        *y,
    )

    # Convert the y monomials to the product-binomial basis.  The identity
    # y^p=sum_a a! S(p,a) binom(y,a) makes this exact over the integers.
    binomial_terms: dict[tuple[int, ...], sp.Expr] = {}
    for powers, coefficient in substituted.terms():
        choices = []
        for power in powers:
            choices.append(
                [
                    (
                        index,
                        sp.factorial(index)
                        * sp.functions.combinatorial.numbers.stirling(
                            power, index, kind=2
                        ),
                    )
                    for index in range(power + 1)
                ]
            )
        for selected in itertools.product(*choices):
            multiindex = tuple(item[0] for item in selected)
            factor = sp.prod(item[1] for item in selected)
            if factor:
                binomial_terms[multiindex] = sp.expand(
                    binomial_terms.get(multiindex, 0) + coefficient * factor
                )

    by_partition: dict[tuple[int, ...], sp.Expr] = {}
    for multiindex, coefficient in binomial_terms.items():
        partition = tuple(
            sorted((index for index in multiindex if index), reverse=True)
        )
        coefficient = sp.expand(coefficient)
        if partition in by_partition:
            assert sp.expand(by_partition[partition] - coefficient) == 0
        else:
            by_partition[partition] = coefficient

    v = sp.symbols("v", integer=True, nonnegative=True)

    def difference_at_zero(poly: sp.Expr, a: int, b: int) -> sp.Expr:
        out = sp.expand(poly)
        for _ in range(a):
            out = sp.expand(out.subs(v, v + 1) - out)
        for _ in range(b):
            out = sp.expand(out.subs(t, t + 1) - out)
        return sp.expand(out.subs({v: 0, t: 0}))

    partition_rows = []
    total_nonzero = 0
    for partition in sorted(by_partition, key=lambda item: (sum(item), item)):
        # A product-binomial term of support length ell only occurs if s>=ell.
        # For the empty term the positive-arm case has s>=1.  Shift by the
        # exact domain boundary before taking the (v,t) binomial expansion.
        support = max(1, len(partition))
        coefficient = sp.expand(by_partition[partition].subs(u, v + support - 1))
        degree_v = sp.degree(coefficient, v)
        degree_t = sp.degree(coefficient, t)
        basis = []
        reconstructed = 0
        for a in range(degree_v + 1):
            for b in range(degree_t + 1):
                value = difference_at_zero(coefficient, a, b)
                assert value.is_Integer
                assert value >= 0
                if value:
                    basis.append(
                        {"v_choose": a, "t_choose": b, "coefficient": int(value)}
                    )
                    reconstructed += value * sp.binomial(v, a) * sp.binomial(t, b)
                    total_nonzero += 1
        assert sp.expand(sp.expand_func(reconstructed) - coefficient) == 0
        partition_rows.append(
            {
                "product_binomial_partition": list(partition),
                "minimum_positive_arms": support,
                "coefficient_at_s_equals_support_plus_v": str(sp.factor(coefficient)),
                "nonnegative_v_t_binomial_basis": basis,
            }
        )

    star_value = sp.expand(
        numerator.subs({M: 0, S2: 0, S3: 0, S4: 0})
    )
    assert star_value == 0
    assert len(partition_rows) == 41
    assert total_nonzero == 268
    certificate = {
        "i3_formula": str(sp.factor(i3)),
        "i4_formula": str(sp.factor(i4)),
        "s3_formula": str(sp.factor(s3)),
        "s4_formula": str(sp.factor(s4)),
        "margin_numerator": str(sp.factor(numerator)),
        "margin_denominator": int(denominator),
        "product_binomial_partitions": partition_rows,
        "partition_count": len(partition_rows),
        "nonzero_nonnegative_basis_coefficients": total_nonzero,
        "star_case_margin_numerator": int(star_value),
    }
    return certificate, parameters, rows


def literal_audit(
    symbolic_parameters: tuple[sp.Symbol, ...], rows: tuple[sp.Expr, ...]
) -> dict[str, int]:
    cases = 0
    supported_ratio_cases = 0
    subset_checks = 0
    minimum_margin = None
    minimum_positive_margin = None
    for d_value in range(1, 5):
        for multiplicities in itertools.combinations_with_replacement(range(4), d_value):
            edges = []
            next_vertex = 1
            for multiplicity in multiplicities:
                arm = next_vertex
                next_vertex += 1
                edges.append((0, arm))
                for _ in range(multiplicity):
                    edges.append((arm, next_vertex))
                    next_vertex += 1
            edge_sets = tuple(frozenset(edge) for edge in edges)

            def induced_edges(chosen: tuple[int, ...]) -> int:
                selected = frozenset(chosen)
                return sum(edge <= selected for edge in edge_sets)

            counts = {}
            for size in (3, 4, 5):
                zero = 0
                one = 0
                for chosen in itertools.combinations(range(next_vertex), size):
                    induced = induced_edges(chosen)
                    zero += induced == 0
                    one += induced == 1
                counts[(size, 0)] = zero
                counts[(size, 1)] = one
                subset_checks += math.comb(next_vertex, size)
            literal = (
                counts[(3, 0)],
                counts[(4, 0)],
                counts[(4, 1)],
                counts[(5, 1)],
            )
            M_value = sum(multiplicities)
            substitutions = dict(
                zip(
                    symbolic_parameters,
                    (
                        d_value,
                        M_value,
                        sum(value**2 for value in multiplicities),
                        sum(value**3 for value in multiplicities),
                        sum(value**4 for value in multiplicities),
                    ),
                )
            )
            formula = tuple(int(sp.expand(row).subs(substitutions)) for row in rows)
            assert literal == formula
            i3, i4, s3, s4 = literal
            margin = 4 * i4 * s3 - 3 * i3 * s4
            assert margin >= 0
            if i4:
                supported_ratio_cases += 1
            minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
            if margin > 0:
                minimum_positive_margin = (
                    margin if minimum_positive_margin is None
                    else min(minimum_positive_margin, margin)
                )
            cases += 1
    return {
        "cases": cases,
        "supported_q4_ratio_cases": supported_ratio_cases,
        "literal_subset_checks": subset_checks,
        "minimum_margin": minimum_margin,
        "minimum_positive_margin": minimum_positive_margin,
    }


def main() -> None:
    certificate, parameters, rows = symbolic_certificate()
    audit = literal_audit(parameters, rows)
    payload = {
        "schema": "multitype-depth2-star-q4-q3-theorem-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q4_AT_MOST_Q3_THEOREM",
        "theorem": (
            "Every depth-two star satisfies 4*i4*s3-3*i3*s4>=0; whenever "
            "i4>0 this is q4<=q3."
        ),
        "symbolic_certificate": certificate,
        "literal_audit": audit,
        "proof_boundary": (
            "This proves q4<=q3 only on the full nonuniform depth-two-star "
            "family. It does not prove q_r<=q3 for r>=5, the token-surplus "
            "inequality for all trees, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print(
        "partitions", certificate["partition_count"],
        "basis_coefficients", certificate["nonzero_nonnegative_basis_coefficients"],
    )
    print("literal_cases", audit["cases"], "subset_checks", audit["literal_subset_checks"])
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
