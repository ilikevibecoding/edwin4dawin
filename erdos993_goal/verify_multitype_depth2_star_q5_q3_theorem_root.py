#!/usr/bin/env python3
"""Exact theorem: q_5 <= q_3 for every nonuniform depth-two star."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp


RANK = 5
ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "multitype_depth2_star_q5_q3_theorem_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def derive_rows():
    x, m = sp.symbols("x m")
    parameters = sp.symbols(
        "d M " + " ".join(f"S{degree}" for degree in range(2, RANK + 1)),
        integer=True,
        nonnegative=True,
    )
    d, M, *higher_sums = parameters
    power_sums = {0: d, 1: M} | {
        degree: higher_sums[degree - 2] for degree in range(2, RANK + 1)
    }

    factor = 1 + (m + 1) * x
    for degree in range(2, RANK + 1):
        falling = sp.prod(m - offset for offset in range(degree))
        factor += falling * x**degree / sp.factorial(degree)
    log_factor = sp.series(sp.log(factor), x, 0, RANK + 1).removeO().expand()

    def sum_over_arms(expression: sp.Expr) -> sp.Expr:
        polynomial = sp.Poly(sp.expand(expression), m)
        return sp.expand(
            sum(
                coefficient * power_sums[exponent[0]]
                for exponent, coefficient in polynomial.terms()
            )
        )

    log_product = sum(
        sum_over_arms(log_factor.coeff(x, degree)) * x**degree
        for degree in range(1, RANK + 1)
    )
    product = sp.series(sp.exp(log_product), x, 0, RANK + 1).removeO().expand()
    p = [sp.expand(product.coeff(x, degree)) for degree in range(RANK + 1)]
    i3 = sp.expand(p[3] + sp.expand_func(sp.binomial(M, 2)))
    ir = sp.expand(p[RANK] + sp.expand_func(sp.binomial(M, RANK - 1)))

    factor_coefficients = [sp.Integer(1), m + 1] + [
        sp.prod(m - offset for offset in range(degree)) / sp.factorial(degree)
        for degree in range(2, RANK)
    ]
    quotient = [sp.Integer(1)]
    for degree in range(1, RANK):
        quotient.append(
            sp.expand(
                p[degree]
                - sum(
                    factor_coefficients[index] * quotient[degree - index]
                    for index in range(1, degree + 1)
                )
            )
        )
    s3 = sp.expand(
        sum_over_arms(sp.expand_func(sp.binomial(M - m, 2)))
        + sum_over_arms(m * quotient[2])
    )
    sr = sp.expand(
        sum_over_arms(sp.expand_func(sp.binomial(M - m, RANK - 1)))
        + sum_over_arms(m * quotient[RANK - 1])
    )
    margin = sp.factor(RANK * ir * s3 - 3 * i3 * sr)
    numerator, denominator = sp.fraction(margin)
    numerator = sp.expand(numerator)
    assert denominator == 48
    assert sp.Poly(numerator, *parameters).total_degree() == RANK + 3
    return parameters, (i3, ir, s3, sr), numerator, denominator


def symbolic_certificate():
    parameters, rows, numerator, denominator = derive_rows()
    d, M, *higher_sums = parameters
    i3, ir, s3, sr = rows
    t, u = sp.symbols("t u", integer=True, nonnegative=True)
    s = u + 1
    placeholder_count = RANK + 3
    y = sp.symbols(f"y0:{placeholder_count}", integer=True, nonnegative=True)
    y_power_sums = {
        degree: sum(value**degree for value in y)
        for degree in range(1, RANK + 1)
    }
    substitutions = {d: s + t, M: s + y_power_sums[1]}
    for degree in range(2, RANK + 1):
        substitutions[higher_sums[degree - 2]] = s + sum(
            math.comb(degree, exponent) * y_power_sums[exponent]
            for exponent in range(1, degree + 1)
        )
    substituted = sp.Poly(sp.expand(numerator.subs(substitutions)), *y)

    product_binomial: dict[tuple[int, ...], sp.Expr] = {}
    for powers, coefficient in substituted.terms():
        choices = [
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
            for power in powers
        ]
        for selected in itertools.product(*choices):
            multiindex = tuple(item[0] for item in selected)
            factor = sp.prod(item[1] for item in selected)
            if factor:
                product_binomial[multiindex] = sp.expand(
                    product_binomial.get(multiindex, 0) + coefficient * factor
                )

    by_partition: dict[tuple[int, ...], sp.Expr] = {}
    for multiindex, coefficient in product_binomial.items():
        partition = tuple(sorted((entry for entry in multiindex if entry), reverse=True))
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
        support = max(1, len(partition))
        coefficient = sp.expand(by_partition[partition].subs(u, v + support - 1))
        basis = []
        reconstructed = 0
        for a in range(sp.degree(coefficient, v) + 1):
            for b in range(sp.degree(coefficient, t) + 1):
                value = difference_at_zero(coefficient, a, b)
                assert value.is_Integer and value >= 0
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

    star_substitutions = {M: 0} | {symbol: 0 for symbol in higher_sums}
    assert sp.expand(numerator.subs(star_substitutions)) == 0
    assert len(partition_rows) == 63
    assert total_nonzero == 446
    return (
        {
            "i3_formula": str(sp.factor(i3)),
            "i5_formula": str(sp.factor(ir)),
            "s3_formula": str(sp.factor(s3)),
            "s5_formula": str(sp.factor(sr)),
            "margin_numerator": str(sp.factor(numerator)),
            "margin_denominator": int(denominator),
            "placeholder_count": placeholder_count,
            "product_binomial_partitions": partition_rows,
            "partition_count": len(partition_rows),
            "nonzero_nonnegative_basis_coefficients": total_nonzero,
        },
        parameters,
        rows,
    )


def literal_audit(parameters: tuple[sp.Symbol, ...], rows: tuple[sp.Expr, ...]):
    cases = 0
    supported = 0
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
            for size in (3, 4, 5, 6):
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
                counts[(3, 0)], counts[(5, 0)], counts[(4, 1)], counts[(6, 1)]
            )
            values = [d_value, sum(multiplicities)] + [
                sum(value**degree for value in multiplicities)
                for degree in range(2, RANK + 1)
            ]
            substitutions = dict(zip(parameters, values))
            formula = tuple(int(sp.expand(row).subs(substitutions)) for row in rows)
            assert literal == formula
            i3, ir, s3, sr = literal
            margin = RANK * ir * s3 - 3 * i3 * sr
            assert margin >= 0
            supported += ir > 0
            minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
            if margin > 0:
                minimum_positive_margin = (
                    margin if minimum_positive_margin is None
                    else min(minimum_positive_margin, margin)
                )
            cases += 1
    return {
        "cases": cases,
        "supported_q5_ratio_cases": supported,
        "literal_subset_checks": subset_checks,
        "minimum_margin": minimum_margin,
        "minimum_positive_margin": minimum_positive_margin,
    }


def main() -> None:
    certificate, parameters, rows = symbolic_certificate()
    audit = literal_audit(parameters, rows)
    payload = {
        "schema": "multitype-depth2-star-q5-q3-theorem-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q5_AT_MOST_Q3_THEOREM",
        "theorem": (
            "Every depth-two star satisfies 5*i5*s3-3*i3*s5>=0; whenever "
            "i5>0 this is q5<=q3."
        ),
        "symbolic_certificate": certificate,
        "literal_audit": audit,
        "proof_boundary": (
            "This proves q5<=q3 only on the full nonuniform depth-two-star "
            "family. It does not prove q_r<=q3 for r>=6, the token-surplus "
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
