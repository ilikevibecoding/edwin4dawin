#!/usr/bin/env python3
"""Independent fail-closed audit of the depth-two-star q4/q3 theorem.

The producer is never imported or executed.  The coefficient rows are
reconstructed through an independent truncated-series recurrence, the
two-level product-binomial certificate is rebuilt with eight stable
placeholder variables, and literal subsets are enumerated separately.
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
PRODUCER = ROOT / "verify_multitype_depth2_star_q4_q3_theorem_root.py"
PRIMARY = ROOT / "multitype_depth2_star_q4_q3_theorem_exact_root_20260828.json"
NOTE = ROOT / "MULTITYPE_DEPTH2_STAR_Q4_Q3_THEOREM_2026-08-28.md"
OUTPUT = ROOT / "multitype_depth2_star_q4_q3_theorem_independent_audit_20260828.json"

PINNED = {
    PRODUCER.name: "E5C822779525E4F5A686570A1239BCF47535E4D74EDA19456390A410D6CCA632",
    PRIMARY.name: "6D90D88BFD96D9956BD7FEFB1753639B26DBD1391B3C57E9B95392C69F3C0332",
    NOTE.name: "E0468E227AB083DF2C48BF58C84C0CB51550A600B5787523923A30E5DB1C3636",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling_binomial(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def sum_arm_polynomial(
    expression: sp.Expr,
    arm_variable: sp.Symbol,
    arm_count: sp.Symbol,
    moments: tuple[sp.Symbol, ...],
) -> sp.Expr:
    output = 0
    for (power,), coefficient in sp.Poly(sp.expand(expression), arm_variable).terms():
        output += coefficient * (arm_count if power == 0 else moments[power - 1])
    return sp.expand(output)


def derive_rows() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], sp.Expr, sp.Expr
]:
    x, arm = sp.symbols("x m")
    d, total, p2, p3, p4 = sp.symbols("d M S2 S3 S4")
    moments = (total, p2, p3, p4)

    # One branch contributes (1+x)^m+x.  Obtain the product coefficients
    # from log-derivative recurrence P_n=(1/n)sum_j j L_j P_(n-j), rather
    # than importing or calling the producer's exponential construction.
    branch = sum(falling_binomial(arm, rank) * x**rank for rank in range(5)) + x
    log_branch = sp.series(sp.log(branch), x, 0, 5).removeO().expand()
    log_coefficients = [sp.Integer(0)] + [
        sum_arm_polynomial(log_branch.coeff(x, rank), arm, d, moments)
        for rank in range(1, 5)
    ]
    product_coefficients = [sp.Integer(1)]
    for rank in range(1, 5):
        product_coefficients.append(
            sp.expand(
                sum(
                    index * log_coefficients[index] * product_coefficients[rank - index]
                    for index in range(1, rank + 1)
                )
                / rank
            )
        )

    i3 = sp.expand(product_coefficients[3] + falling_binomial(total, 2))
    i4 = sp.expand(product_coefficients[4] + falling_binomial(total, 3))

    # B/x^2 = sum_i (1+x)^(M-m_i) + P sum_i m_i/F_i.
    # Build 1/F_i independently as a truncated reciprocal series.
    inverse_branch = sp.series(1 / branch, x, 0, 4).removeO().expand()
    weighted_inverse = [
        sum_arm_polynomial(arm * inverse_branch.coeff(x, rank), arm, d, moments)
        for rank in range(4)
    ]
    leaf_edge_coefficients = []
    for rank in range(4):
        leaf_edge_coefficients.append(
            sp.expand(
                sum(
                    product_coefficients[index] * weighted_inverse[rank - index]
                    for index in range(rank + 1)
                )
            )
        )
    centre_edge_coefficients = [
        sum_arm_polynomial(falling_binomial(total - arm, rank), arm, d, moments)
        for rank in range(4)
    ]
    one_edge_over_x2 = [
        sp.expand(leaf_edge_coefficients[rank] + centre_edge_coefficients[rank])
        for rank in range(4)
    ]
    s3, s4 = one_edge_over_x2[2], one_edge_over_x2[3]

    margin = sp.factor(4 * i4 * s3 - 3 * i3 * s4)
    numerator, denominator = sp.fraction(margin)
    numerator, denominator = sp.expand(numerator), sp.expand(denominator)
    assert denominator == 12, denominator
    assert sp.Poly(numerator, d, total, p2, p3, p4).total_degree() == 7
    return (d, total, p2, p3, p4), (i3, i4, s3, s4), numerator, denominator


def forward_difference_at_zero(
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
    d, total, p2, p3, p4 = parameters
    i3, i4, s3, s4 = rows
    certificate = primary["symbolic_certificate"]
    expected = {
        "i3_formula": i3,
        "i4_formula": i4,
        "s3_formula": s3,
        "s4_formula": s4,
        "margin_numerator": numerator,
    }
    for field, expression in expected.items():
        assert sp.expand(sp.sympify(certificate[field]) - expression) == 0, field
    assert certificate["margin_denominator"] == int(denominator) == 12

    # Eight variables independently enter the stable range for total degree 7.
    s, t, v = sp.symbols("s t v", integer=True, nonnegative=True)
    y = sp.symbols("z0:8", integer=True, nonnegative=True)
    moment_substitutions = {d: s + t}
    for rank, moment in enumerate((total, p2, p3, p4), 1):
        moment_substitutions[moment] = s + sum(
            (1 + value) ** rank - 1 for value in y
        )
    shifted = sp.Poly(sp.expand(numerator.subs(moment_substitutions)), *y)

    # Convert ordinary powers to integer binomial polynomials independently:
    # z^p=sum_a a!*S(p,a)*C(z,a).
    product_binomial_terms: dict[tuple[int, ...], sp.Expr] = {}
    for powers, coefficient in shifted.terms():
        conversions = []
        for power in powers:
            conversions.append(
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
        for selection in itertools.product(*conversions):
            multiindex = tuple(item[0] for item in selection)
            factor = sp.prod(item[1] for item in selection)
            if factor:
                product_binomial_terms[multiindex] = sp.expand(
                    product_binomial_terms.get(multiindex, 0) + coefficient * factor
                )

    independent_partitions: dict[tuple[int, ...], sp.Expr] = {}
    for multiindex, coefficient in product_binomial_terms.items():
        partition = tuple(sorted((entry for entry in multiindex if entry), reverse=True))
        coefficient = sp.expand(coefficient)
        previous = independent_partitions.get(partition)
        if previous is None:
            independent_partitions[partition] = coefficient
        else:
            assert sp.expand(previous - coefficient) == 0

    reported_rows = certificate["product_binomial_partitions"]
    rows_by_partition = {
        tuple(row["product_binomial_partition"]): row for row in reported_rows
    }
    assert len(rows_by_partition) == len(reported_rows) == 41
    assert set(rows_by_partition) == set(independent_partitions)

    basis_terms = 0
    for partition, coefficient_at_s in independent_partitions.items():
        row = rows_by_partition[partition]
        support = max(1, len(partition))
        assert row["minimum_positive_arms"] == support
        coefficient = sp.expand(coefficient_at_s.subs(s, support + v))
        reported_coefficient = sp.sympify(
            row["coefficient_at_s_equals_support_plus_v"],
            locals={"v": v, "t": t},
        )
        assert sp.expand(reported_coefficient - coefficient) == 0

        polynomial = sp.Poly(coefficient, v, t)
        independent_basis = []
        reconstructed = 0
        for degree_v in range(polynomial.degree(v) + 1):
            for degree_t in range(polynomial.degree(t) + 1):
                value = forward_difference_at_zero(
                    coefficient, v, t, degree_v, degree_t
                )
                assert value.is_Integer and value >= 0
                if value:
                    independent_basis.append(
                        {
                            "v_choose": degree_v,
                            "t_choose": degree_t,
                            "coefficient": int(value),
                        }
                    )
                    reconstructed += (
                        value * sp.binomial(v, degree_v) * sp.binomial(t, degree_t)
                    )
        assert independent_basis == row["nonnegative_v_t_binomial_basis"]
        assert sp.expand(sp.expand_func(reconstructed) - coefficient) == 0
        basis_terms += len(independent_basis)

    assert basis_terms == certificate["nonzero_nonnegative_basis_coefficients"] == 268
    assert sp.expand(numerator.subs({total: 0, p2: 0, p3: 0, p4: 0})) == 0
    return (
        {
            "independent_derivation": {
                "i3": str(sp.factor(i3)),
                "i4": str(sp.factor(i4)),
                "s3": str(sp.factor(s3)),
                "s4": str(sp.factor(s4)),
                "margin_numerator": str(sp.factor(numerator)),
                "margin_denominator": int(denominator),
            },
            "stable_placeholder_variables": len(y),
            "product_binomial_partitions": len(independent_partitions),
            "nonzero_nonnegative_support_shifted_coefficients": basis_terms,
            "all_reported_rows_reconstructed": True,
            "exact_support_domains_checked": True,
            "star_case_verified": True,
        },
        rows,
    )


def poly_add(left: list[int], right: list[int], cap: int) -> list[int]:
    output = [0] * min(cap + 1, max(len(left), len(right)))
    for index in range(len(output)):
        output[index] = (left[index] if index < len(left) else 0) + (
            right[index] if index < len(right) else 0
        )
    return output


def poly_multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    output = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, first in enumerate(left):
        for j, second in enumerate(right):
            if i + j <= cap:
                output[i + j] += first * second
    return output


def binomial_row(order: int, cap: int) -> list[int]:
    return [math.comb(order, rank) for rank in range(min(order, cap) + 1)]


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def generating_function_rows(multiplicities: tuple[int, ...]) -> tuple[int, ...]:
    cap = 4
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
        product = poly_multiply(product, factor, cap)
    independent = poly_add(product, [0] + binomial_row(total, cap - 1), cap)

    one_edge = [0]
    for index, multiplicity in enumerate(multiplicities):
        one_edge = poly_add(one_edge, binomial_row(total - multiplicity, cap), cap)
        other_product = [1]
        for other, factor in enumerate(factors):
            if other != index:
                other_product = poly_multiply(other_product, factor, cap)
        one_edge = poly_add(
            one_edge, [multiplicity * value for value in other_product], cap
        )
    return (
        coefficient(independent, 3),
        coefficient(independent, 4),
        coefficient(one_edge, 2),
        coefficient(one_edge, 3),
    )


def literal_rows(multiplicities: tuple[int, ...]) -> tuple[tuple[int, ...], int]:
    edge_masks = []
    next_vertex = 1
    for multiplicity in multiplicities:
        arm = next_vertex
        next_vertex += 1
        edge_masks.append((1 << 0) | (1 << arm))
        for _ in range(multiplicity):
            leaf = next_vertex
            next_vertex += 1
            edge_masks.append((1 << arm) | (1 << leaf))

    def edge_count(vertices: tuple[int, ...]) -> int:
        mask = sum(1 << vertex for vertex in vertices)
        return sum((mask & edge) == edge for edge in edge_masks)

    i3 = i4 = s3 = s4 = checks = 0
    for rank in (3, 4, 5):
        for vertices in itertools.combinations(range(next_vertex), rank):
            induced = edge_count(vertices)
            if rank == 3:
                i3 += induced == 0
            elif rank == 4:
                i4 += induced == 0
                s3 += induced == 1
            else:
                s4 += induced == 1
            checks += 1
    return (i3, i4, s3, s4), checks


def formula_rows(multiplicities: tuple[int, ...], rows: tuple[sp.Expr, ...]) -> tuple[int, ...]:
    d, total, p2, p3, p4 = sp.symbols("d M S2 S3 S4")
    substitutions = {
        d: len(multiplicities),
        total: sum(multiplicities),
        p2: sum(value**2 for value in multiplicities),
        p3: sum(value**3 for value in multiplicities),
        p4: sum(value**4 for value in multiplicities),
    }
    return tuple(int(sp.expand(row).subs(substitutions)) for row in rows)


def literal_audit(rows: tuple[sp.Expr, ...]) -> dict[str, object]:
    cases = checks = supported = unsupported = 0
    minimum = minimum_positive = None
    for arm_count in range(1, 6):
        for multiplicities in itertools.combinations_with_replacement(range(4), arm_count):
            literal, local_checks = literal_rows(multiplicities)
            assert literal == formula_rows(multiplicities, rows)
            assert literal == generating_function_rows(multiplicities)
            i3, i4, s3, s4 = literal
            margin = 4 * i4 * s3 - 3 * i3 * s4
            assert margin >= 0
            if i4:
                supported += 1
                assert i3 > 0 and 3 * i3 * s4 <= 4 * i4 * s3
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
        assert values == generating_function_rows(multiplicities)
        i3, i4, s3, s4 = values
        assert 4 * i4 * s3 - 3 * i3 * s4 >= 0

    return {
        "literal_cases": cases,
        "literal_subset_checks": checks,
        "supported_q4_ratio_cases": supported,
        "unsupported_q4_cases": unsupported,
        "minimum_margin": minimum,
        "minimum_positive_margin": minimum_positive,
        "extreme_generating_function_cases": len(extremes),
    }


def main() -> None:
    observed = {path.name: sha256(path) for path in (PRODUCER, PRIMARY, NOTE)}
    assert observed == PINNED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q4_AT_MOST_Q3_THEOREM"
    )
    assert primary["source_sha256"] == PINNED[PRODUCER.name]
    assert "whenever i4>0" in primary["theorem"]
    note = NOTE.read_text(encoding="utf-8")
    assert "Whenever `i_4(T)>0`" in note
    assert "does not prove `q_r<=q_3` for `r>=5`" in note

    symbolic, rows = symbolic_audit(primary)
    literal = literal_audit(rows)
    payload = {
        "schema": "multitype-depth2-star-q4-q3-theorem-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q4_AT_MOST_Q3_AUDIT",
        "pinned_hashes": observed,
        "independence": "The producer was neither imported nor executed.",
        "theorem_verified": (
            "Every depth-two star has 4*i4*s3-3*i3*s4>=0; if i4>0, q4<=q3."
        ),
        "symbolic_audit": symbolic,
        "literal_audit": literal,
        "scope_warning": (
            "This audits only q4<=q3 on the complete nonuniform depth-two-star "
            "family. It does not prove q_r<=q3 for r>=5, either surviving "
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
