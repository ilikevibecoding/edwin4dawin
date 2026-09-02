#!/usr/bin/env python3
"""Independent fail-closed audit of the depth-two-star q5/q3 theorem."""

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
PRODUCER = ROOT / "verify_multitype_depth2_star_q5_q3_theorem_root.py"
PRIMARY = ROOT / "multitype_depth2_star_q5_q3_theorem_exact_root_20260828.json"
NOTE = ROOT / "MULTITYPE_DEPTH2_STAR_Q5_Q3_THEOREM_2026-08-28.md"
OUTPUT = ROOT / "multitype_depth2_star_q5_q3_theorem_independent_audit_20260828.json"

PINNED = {
    PRODUCER.name: "A9A0CC9DD7A02891482894557B9876447D1C9AD98268C310A8D3AACE10E2B026",
    PRIMARY.name: "BBDBD7F25E81864BC7F7340CC76634BE54807717773A69245C0E3C014EC0AEAC",
    NOTE.name: "2DDBB9AC88532075F05A9BAF239831B9C783D1289951E44163661F28A70FBD06",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def arm_sum(
    expression: sp.Expr,
    arm: sp.Symbol,
    count: sp.Symbol,
    moments: tuple[sp.Symbol, ...],
) -> sp.Expr:
    return sp.expand(
        sum(
            coefficient * (count if exponent[0] == 0 else moments[exponent[0] - 1])
            for exponent, coefficient in sp.Poly(sp.expand(expression), arm).terms()
        )
    )


def derive_rows() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], sp.Expr, sp.Expr
]:
    x, arm = sp.symbols("x m")
    parameters = sp.symbols("d M S2 S3 S4 S5")
    d, total, *_ = parameters
    moments = tuple(parameters[1:])

    branch = sum(choose(arm, degree) * x**degree for degree in range(RANK + 1)) + x
    log_branch = sp.series(sp.log(branch), x, 0, RANK + 1).removeO().expand()
    log_product = [sp.Integer(0)] + [
        arm_sum(log_branch.coeff(x, degree), arm, d, moments)
        for degree in range(1, RANK + 1)
    ]
    product = [sp.Integer(1)]
    for degree in range(1, RANK + 1):
        product.append(
            sp.expand(
                sum(
                    index * log_product[index] * product[degree - index]
                    for index in range(1, degree + 1)
                )
                / degree
            )
        )

    i3 = sp.expand(product[3] + choose(total, 2))
    i5 = sp.expand(product[5] + choose(total, 4))

    # Independently use P*sum_i(m_i/F_i), rather than the producer's
    # arm-quotient recurrence, for the leaf-edge part of B/x^2.
    inverse = sp.series(1 / branch, x, 0, RANK).removeO().expand()
    weighted_inverse = [
        arm_sum(arm * inverse.coeff(x, degree), arm, d, moments)
        for degree in range(RANK)
    ]
    leaf = [
        sp.expand(
            sum(product[index] * weighted_inverse[degree - index] for index in range(degree + 1))
        )
        for degree in range(RANK)
    ]
    centre = [
        arm_sum(choose(total - arm, degree), arm, d, moments)
        for degree in range(RANK)
    ]
    one_edge = [sp.expand(leaf[degree] + centre[degree]) for degree in range(RANK)]
    s3, s5 = one_edge[2], one_edge[4]

    margin = sp.factor(5 * i5 * s3 - 3 * i3 * s5)
    numerator, denominator = sp.fraction(margin)
    numerator = sp.expand(numerator)
    assert denominator == 48
    assert sp.Poly(numerator, *parameters).total_degree() == 8
    return parameters, (i3, i5, s3, s5), numerator, denominator


def difference_at_zero(
    expression: sp.Expr, v: sp.Symbol, t: sp.Symbol, dv: int, dt: int
) -> sp.Expr:
    output = sp.expand(expression)
    for _ in range(dv):
        output = sp.expand(output.subs(v, v + 1) - output)
    for _ in range(dt):
        output = sp.expand(output.subs(t, t + 1) - output)
    return sp.expand(output.subs({v: 0, t: 0}))


def symbolic_audit(primary: dict[str, object]) -> tuple[dict[str, object], tuple[sp.Expr, ...]]:
    parameters, rows, numerator, denominator = derive_rows()
    d, total, *higher = parameters
    i3, i5, s3, s5 = rows
    certificate = primary["symbolic_certificate"]
    for field, expression in {
        "i3_formula": i3,
        "i5_formula": i5,
        "s3_formula": s3,
        "s5_formula": s5,
        "margin_numerator": numerator,
    }.items():
        assert sp.expand(sp.sympify(certificate[field]) - expression) == 0, field
    assert certificate["margin_denominator"] == int(denominator) == 48

    # Degree eight is audited in the stable range with eight active y variables.
    s, t, v = sp.symbols("s t v", integer=True, nonnegative=True)
    y = sp.symbols("z0:8", integer=True, nonnegative=True)
    substitutions = {d: s + t, total: s + sum(y)}
    for degree, moment in enumerate(higher, 2):
        substitutions[moment] = s + sum((1 + value) ** degree - 1 for value in y)
    shifted = sp.Poly(sp.expand(numerator.subs(substitutions)), *y)

    product_binomial: dict[tuple[int, ...], sp.Expr] = {}
    for powers, coefficient in shifted.terms():
        conversions = [
            [
                (
                    index,
                    sp.factorial(index)
                    * sp.functions.combinatorial.numbers.stirling(power, index, kind=2),
                )
                for index in range(power + 1)
            ]
            for power in powers
        ]
        for selection in itertools.product(*conversions):
            factor = sp.prod(item[1] for item in selection)
            if factor:
                multiindex = tuple(item[0] for item in selection)
                product_binomial[multiindex] = sp.expand(
                    product_binomial.get(multiindex, 0) + coefficient * factor
                )

    partitions: dict[tuple[int, ...], sp.Expr] = {}
    for multiindex, coefficient in product_binomial.items():
        partition = tuple(sorted((entry for entry in multiindex if entry), reverse=True))
        coefficient = sp.expand(coefficient)
        previous = partitions.get(partition)
        if previous is None:
            partitions[partition] = coefficient
        else:
            assert sp.expand(previous - coefficient) == 0

    reported = certificate["product_binomial_partitions"]
    by_partition = {tuple(row["product_binomial_partition"]): row for row in reported}
    assert len(by_partition) == len(reported) == 63
    assert set(by_partition) == set(partitions)

    basis_count = 0
    for partition, coefficient_at_s in partitions.items():
        row = by_partition[partition]
        support = max(1, len(partition))
        assert row["minimum_positive_arms"] == support
        coefficient = sp.expand(coefficient_at_s.subs(s, support + v))
        reported_coefficient = sp.sympify(
            row["coefficient_at_s_equals_support_plus_v"], locals={"v": v, "t": t}
        )
        assert sp.expand(reported_coefficient - coefficient) == 0

        polynomial = sp.Poly(coefficient, v, t)
        independent_basis = []
        reconstructed = 0
        for dv in range(polynomial.degree(v) + 1):
            for dt in range(polynomial.degree(t) + 1):
                value = difference_at_zero(coefficient, v, t, dv, dt)
                assert value.is_Integer and value >= 0
                if value:
                    independent_basis.append(
                        {"v_choose": dv, "t_choose": dt, "coefficient": int(value)}
                    )
                    reconstructed += value * sp.binomial(v, dv) * sp.binomial(t, dt)
        assert independent_basis == row["nonnegative_v_t_binomial_basis"]
        assert sp.expand(sp.expand_func(reconstructed) - coefficient) == 0
        basis_count += len(independent_basis)

    assert basis_count == certificate["nonzero_nonnegative_basis_coefficients"] == 446
    star_substitutions = {total: 0} | {moment: 0 for moment in higher}
    assert sp.expand(numerator.subs(star_substitutions)) == 0
    return (
        {
            "independent_derivation": {
                "i3": str(sp.factor(i3)),
                "i5": str(sp.factor(i5)),
                "s3": str(sp.factor(s3)),
                "s5": str(sp.factor(s5)),
                "margin_numerator": str(sp.factor(numerator)),
                "margin_denominator": int(denominator),
            },
            "stable_placeholder_variables": len(y),
            "product_binomial_partitions": len(partitions),
            "nonzero_nonnegative_support_shifted_coefficients": basis_count,
            "exact_support_domains_checked": True,
            "all_reported_rows_reconstructed": True,
            "star_case_verified": True,
        },
        rows,
    )


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    output = [0] * min(cap + 1, max(len(left), len(right)))
    for index in range(len(output)):
        output[index] = (left[index] if index < len(left) else 0) + (
            right[index] if index < len(right) else 0
        )
    return output


def multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    output = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, first in enumerate(left):
        for j, second in enumerate(right):
            if i + j <= cap:
                output[i + j] += first * second
    return output


def binomial_row(order: int, cap: int) -> list[int]:
    return [math.comb(order, degree) for degree in range(min(order, cap) + 1)]


def coefficient(row: list[int], degree: int) -> int:
    return row[degree] if degree < len(row) else 0


def generating_rows(multiplicities: tuple[int, ...]) -> tuple[int, ...]:
    cap = 5
    total = sum(multiplicities)
    factors = []
    product = [1]
    for multiplicity in multiplicities:
        factor = binomial_row(multiplicity, cap)
        if len(factor) == 1:
            factor.append(1)
        else:
            factor[1] += 1
        factors.append(factor)
        product = multiply(product, factor, cap)
    independent = add(product, [0] + binomial_row(total, cap - 1), cap)

    one_edge = [0]
    for index, multiplicity in enumerate(multiplicities):
        one_edge = add(one_edge, binomial_row(total - multiplicity, cap), cap)
        other_product = [1]
        for other, factor in enumerate(factors):
            if other != index:
                other_product = multiply(other_product, factor, cap)
        one_edge = add(one_edge, [multiplicity * value for value in other_product], cap)
    return (
        coefficient(independent, 3),
        coefficient(independent, 5),
        coefficient(one_edge, 2),
        coefficient(one_edge, 4),
    )


def literal_rows(multiplicities: tuple[int, ...]) -> tuple[tuple[int, ...], int]:
    edges = []
    next_vertex = 1
    for multiplicity in multiplicities:
        arm = next_vertex
        next_vertex += 1
        edges.append((1 << 0) | (1 << arm))
        for _ in range(multiplicity):
            leaf = next_vertex
            next_vertex += 1
            edges.append((1 << arm) | (1 << leaf))

    def induced(vertices: tuple[int, ...]) -> int:
        mask = sum(1 << vertex for vertex in vertices)
        return sum((mask & edge) == edge for edge in edges)

    i3 = i5 = s3 = s5 = checks = 0
    for size in (3, 4, 5, 6):
        for vertices in itertools.combinations(range(next_vertex), size):
            edge_count = induced(vertices)
            if size == 3:
                i3 += edge_count == 0
            elif size == 4:
                s3 += edge_count == 1
            elif size == 5:
                i5 += edge_count == 0
            else:
                s5 += edge_count == 1
            checks += 1
    return (i3, i5, s3, s5), checks


def formula_rows(multiplicities: tuple[int, ...], rows: tuple[sp.Expr, ...]) -> tuple[int, ...]:
    parameters = sp.symbols("d M S2 S3 S4 S5")
    values = [len(multiplicities), sum(multiplicities)] + [
        sum(value**degree for value in multiplicities) for degree in range(2, 6)
    ]
    substitutions = dict(zip(parameters, values))
    return tuple(int(sp.expand(row).subs(substitutions)) for row in rows)


def literal_audit(rows: tuple[sp.Expr, ...]) -> dict[str, object]:
    cases = checks = supported = unsupported = 0
    minimum = minimum_positive = None
    for arm_count in range(1, 6):
        for multiplicities in itertools.combinations_with_replacement(range(4), arm_count):
            literal, local_checks = literal_rows(multiplicities)
            assert literal == formula_rows(multiplicities, rows)
            assert literal == generating_rows(multiplicities)
            i3, i5, s3, s5 = literal
            margin = 5 * i5 * s3 - 3 * i3 * s5
            assert margin >= 0
            if i5:
                supported += 1
                assert i3 > 0 and 3 * i3 * s5 <= 5 * i5 * s3
            else:
                unsupported += 1
            minimum = margin if minimum is None else min(minimum, margin)
            if margin > 0:
                minimum_positive = (
                    margin if minimum_positive is None else min(minimum_positive, margin)
                )
            cases += 1
            checks += local_checks

    extremes = (
        (0,),
        (1,),
        (0, 0, 0, 0, 0, 0, 0),
        (0, 1, 2, 7, 31),
        tuple([1] * 18),
        (0, 0, 3, 100, 1000),
        tuple(range(20)),
    )
    for multiplicities in extremes:
        values = formula_rows(multiplicities, rows)
        assert values == generating_rows(multiplicities)
        i3, i5, s3, s5 = values
        assert 5 * i5 * s3 - 3 * i3 * s5 >= 0
    return {
        "literal_cases": cases,
        "literal_subset_checks": checks,
        "supported_q5_ratio_cases": supported,
        "unsupported_q5_cases": unsupported,
        "minimum_margin": minimum,
        "minimum_positive_margin": minimum_positive,
        "extreme_generating_function_cases": len(extremes),
    }


def main() -> None:
    observed = {path.name: sha256(path) for path in (PRODUCER, PRIMARY, NOTE)}
    assert observed == PINNED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q5_AT_MOST_Q3_THEOREM"
    )
    assert primary["source_sha256"] == PINNED[PRODUCER.name]
    assert "whenever i5>0" in primary["theorem"]
    note = NOTE.read_text(encoding="utf-8")
    assert "Whenever `i_5(T)>0`" in note
    assert "does not prove `q_r<=q_3` for `r>=6`" in note

    symbolic, rows = symbolic_audit(primary)
    literal = literal_audit(rows)
    payload = {
        "schema": "multitype-depth2-star-q5-q3-theorem-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q5_AT_MOST_Q3_AUDIT",
        "pinned_hashes": observed,
        "independence": "The producer was neither imported nor executed.",
        "theorem_verified": (
            "Every depth-two star has 5*i5*s3-3*i3*s5>=0; if i5>0, q5<=q3."
        ),
        "symbolic_audit": symbolic,
        "literal_audit": literal,
        "scope_warning": (
            "This audits only q5<=q3 on the complete nonuniform depth-two-star "
            "family. It does not prove q_r<=q3 for r>=6, either surviving "
            "token-sliding target for every tree, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("partitions", symbolic["product_binomial_partitions"])
    print("basis", symbolic["nonzero_nonnegative_support_shifted_coefficients"])
    print("literal", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
