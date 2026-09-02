#!/usr/bin/env python3
"""Independent fail-closed audit of the depth-two-star q3/q2 theorem.

This auditor never imports or executes the producer.  It derives the four
enumerative formulas from tree incidence identities, reconstructs the full
nonnegative symmetric/binomial certificate with six independent placeholder
variables, and separately enumerates literal vertex subsets.
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
PRODUCER = ROOT / "verify_multitype_depth2_star_q3_q2_theorem_root.py"
PRIMARY = ROOT / "multitype_depth2_star_q3_q2_theorem_exact_root_20260828.json"
NOTE = ROOT / "MULTITYPE_DEPTH2_STAR_Q3_Q2_THEOREM_2026-08-28.md"
OUTPUT = ROOT / "multitype_depth2_star_q3_q2_theorem_independent_audit_20260828.json"

PINNED = {
    PRODUCER.name: "77D23DC0AC9608D0219810C56CE1475B63AEFD4C6FEA94A98AD382DF7E241D71",
    PRIMARY.name: "93B6EAD181C09EEC879A211ACC9E35DF91BA0943335BF04E8B522C193251B4A2",
    NOTE.name: "65D4EDCD20E6A7D1AE9F2871C3E990DA86111EA7EF130EA0CBEE1D3AF747E7A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose2(value: sp.Expr) -> sp.Expr:
    return sp.expand(value * (value - 1) / 2)


def choose3(value: sp.Expr) -> sp.Expr:
    return sp.expand(value * (value - 1) * (value - 2) / 6)


def forward_difference_at_zero(
    expression: sp.Expr, u: sp.Symbol, t: sp.Symbol, du: int, dt: int
) -> sp.Expr:
    value = sp.expand(expression)
    for _ in range(du):
        value = sp.expand(value.subs(u, u + 1) - value)
    for _ in range(dt):
        value = sp.expand(value.subs(t, t + 1) - value)
    return sp.expand(value.subs({u: 0, t: 0}))


def symbolic_audit(primary: dict[str, object]) -> dict[str, object]:
    d, total, square_sum, cube_sum = sp.symbols("d M S2 S3")
    order = 1 + d + total

    # A tree has d+M edges.  Its adjacent edge pairs are the wedges at the
    # centre and arm roots.  Inclusion-exclusion on edges gives i3, while
    # subtracting wedges from all edge pairs gives m2.
    wedges = sp.expand((d * (d - 1) + square_sum + total) / 2)
    i2 = sp.expand(choose2(order) - (order - 1))
    i3 = sp.expand(choose3(order) - (order - 2) * (order - 1) + wedges)
    m2 = sp.expand(choose2(order - 1) - wedges)

    # For a centre-arm edge i, T-N[e] consists of M-m_i isolated leaves.
    # For any one of the m_i arm-leaf edges, T-N[e] has
    # (d-1)+(M-m_i) vertices and M-m_i edges.  Summing its independent
    # pairs over i and reducing power sums gives s3=B4.
    central_edge_part = sp.expand(
        (d * (total**2 - total) - 2 * total**2 + square_sum + total) / 2
    )
    residual_order_base = d - 1 + total
    leaf_edge_part = sp.expand(
        (
            (residual_order_base**2 - residual_order_base - 2 * total) * total
            + (-2 * residual_order_base + 3) * square_sum
            + cube_sum
        )
        / 2
    )
    s3 = sp.expand(central_edge_part + leaf_edge_part)
    margin_times_four = sp.expand(4 * (3 * m2 * i3 - i2 * s3))

    certificate = primary["symbolic_certificate"]
    expected_formulas = {
        "i3_formula": i3,
        "s3_formula": s3,
        "m2_formula": m2,
        "i2_formula": i2,
        "four_times_margin_formula": margin_times_four,
    }
    for field, expected in expected_formulas.items():
        reported = sp.sympify(certificate[field])
        assert sp.expand(reported - expected) == 0, field

    # Use six placeholders, independently of the producer's five.  Total
    # y-degree is five, so this is already in the stable symmetric range.
    u, direct_leaves = sp.symbols("u t", integer=True, nonnegative=True)
    positive_arms = u + 1
    y = sp.symbols("z0:6", integer=True, nonnegative=True)
    p1 = sum(y)
    p2 = sum(value**2 for value in y)
    p3 = sum(value**3 for value in y)
    shifted = sp.Poly(
        sp.expand(
            margin_times_four.subs(
                {
                    d: positive_arms + direct_leaves,
                    total: positive_arms + p1,
                    square_sum: positive_arms + 2 * p1 + p2,
                    cube_sum: positive_arms + 3 * p1 + 3 * p2 + p3,
                }
            )
        ),
        *y,
    )

    independent_partition_coefficients: dict[tuple[int, ...], sp.Expr] = {}
    for monomial, coefficient in shifted.terms():
        partition = tuple(sorted((power for power in monomial if power), reverse=True))
        coefficient = sp.expand(coefficient)
        previous = independent_partition_coefficients.get(partition)
        if previous is None:
            independent_partition_coefficients[partition] = coefficient
        else:
            assert sp.expand(previous - coefficient) == 0

    reported_rows = certificate["monomial_symmetric_partition_coefficients"]
    rows_by_partition = {tuple(row["partition"]): row for row in reported_rows}
    assert len(rows_by_partition) == len(reported_rows) == 17
    assert set(rows_by_partition) == set(independent_partition_coefficients)

    nonzero_binomial_terms = 0
    for partition, coefficient in independent_partition_coefficients.items():
        row = rows_by_partition[partition]
        reported_polynomial = sp.sympify(
            row["coefficient_polynomial"], locals={"u": u, "t": direct_leaves}
        )
        assert sp.expand(reported_polynomial - coefficient) == 0

        polynomial = sp.Poly(coefficient, u, direct_leaves)
        reconstructed = 0
        independent_basis = []
        for degree_u in range(polynomial.degree(u) + 1):
            for degree_t in range(polynomial.degree(direct_leaves) + 1):
                value = forward_difference_at_zero(
                    coefficient, u, direct_leaves, degree_u, degree_t
                )
                assert value.is_Integer and value >= 0
                if value:
                    independent_basis.append(
                        {
                            "u_choose": degree_u,
                            "t_choose": degree_t,
                            "coefficient": int(value),
                        }
                    )
                    reconstructed += (
                        value
                        * sp.binomial(u, degree_u)
                        * sp.binomial(direct_leaves, degree_t)
                    )
        assert independent_basis == row["nonnegative_binomial_basis"]
        assert sp.expand(sp.expand_func(reconstructed) - coefficient) == 0
        nonzero_binomial_terms += len(independent_basis)

    # With no positive arm, all multiplicities vanish and the tree is a star.
    assert sp.expand(
        margin_times_four.subs({total: 0, square_sum: 0, cube_sum: 0})
    ) == 0

    return {
        "independent_derivation": {
            "i2": str(sp.factor(i2)),
            "i3": str(sp.factor(i3)),
            "m2": str(sp.factor(m2)),
            "s3": str(sp.factor(s3)),
            "four_times_margin": str(sp.factor(margin_times_four)),
        },
        "stable_placeholder_variables": len(y),
        "symmetric_partitions": len(independent_partition_coefficients),
        "nonzero_nonnegative_binomial_terms": nonzero_binomial_terms,
        "all_reported_partition_polynomials_reconstructed": True,
        "all_forward_difference_coefficients_nonnegative": True,
        "star_case_verified": True,
    }


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


def generating_function_stats(multiplicities: tuple[int, ...]) -> tuple[int, int, int]:
    cap = 3
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

    one_edge_over_x2 = [0]
    for index, multiplicity in enumerate(multiplicities):
        one_edge_over_x2 = add(
            one_edge_over_x2, binomial_row(total - multiplicity, cap), cap
        )
        other_product = [1]
        for other, factor in enumerate(factors):
            if other != index:
                other_product = multiply(other_product, factor, cap)
        one_edge_over_x2 = add(
            one_edge_over_x2,
            [multiplicity * value for value in other_product],
            cap,
        )
    coefficient = lambda row, degree: row[degree] if degree < len(row) else 0
    return (
        coefficient(independent, 2),
        coefficient(independent, 3),
        coefficient(one_edge_over_x2, 2),
    )


def closed_stats(multiplicities: tuple[int, ...]) -> tuple[int, int, int, int]:
    d = len(multiplicities)
    total = sum(multiplicities)
    square_sum = sum(value**2 for value in multiplicities)
    cube_sum = sum(value**3 for value in multiplicities)
    i2 = (total + d) * (total + d - 1) // 2
    i3_numerator = (
        total**3
        + 3 * total**2 * d
        - 6 * total**2
        + 3 * total * d**2
        - 12 * total * d
        + 8 * total
        + 3 * square_sum
        + d**3
        - 3 * d**2
        + 2 * d
    )
    s3_numerator = (
        total**3
        + 3 * total**2 * d
        - 7 * total**2
        - 2 * total * square_sum
        + total * d**2
        - 4 * total * d
        + 3 * total
        - 2 * square_sum * d
        + 6 * square_sum
        + cube_sum
    )
    m2_numerator = total**2 + 2 * total * d - 2 * total - square_sum
    assert i3_numerator % 6 == s3_numerator % 2 == m2_numerator % 2 == 0
    return i2, i3_numerator // 6, s3_numerator // 2, m2_numerator // 2


def literal_stats(multiplicities: tuple[int, ...]) -> tuple[tuple[int, int, int, int], int]:
    edges: list[int] = []
    next_vertex = 1
    for multiplicity in multiplicities:
        arm = next_vertex
        next_vertex += 1
        edges.append((1 << 0) | (1 << arm))
        for _ in range(multiplicity):
            leaf = next_vertex
            next_vertex += 1
            edges.append((1 << arm) | (1 << leaf))

    def induced_edge_count(vertices: tuple[int, ...]) -> int:
        mask = sum(1 << vertex for vertex in vertices)
        return sum((mask & edge) == edge for edge in edges)

    independent_counts = {}
    subset_checks = 0
    for rank in (2, 3):
        independent_counts[rank] = 0
        for vertices in itertools.combinations(range(next_vertex), rank):
            independent_counts[rank] += induced_edge_count(vertices) == 0
            subset_checks += 1
    one_edge_four = 0
    for vertices in itertools.combinations(range(next_vertex), 4):
        one_edge_four += induced_edge_count(vertices) == 1
        subset_checks += 1
    matchings = sum(
        first & second == 0 for first, second in itertools.combinations(edges, 2)
    )
    return (
        independent_counts[2],
        independent_counts[3],
        one_edge_four,
        matchings,
    ), subset_checks


def literal_audit() -> dict[str, object]:
    cases = 0
    subset_checks = 0
    supported_ratio_cases = 0
    unsupported_rank_three_cases = 0
    minimum_margin = None
    minimum_positive_margin = None
    for arm_count in range(1, 6):
        for multiplicities in itertools.combinations_with_replacement(range(5), arm_count):
            literal, local_checks = literal_stats(multiplicities)
            closed = closed_stats(multiplicities)
            gf_i2, gf_i3, gf_s3 = generating_function_stats(multiplicities)
            assert literal == closed
            assert literal[:3] == (gf_i2, gf_i3, gf_s3)
            i2, i3, s3, m2 = literal
            margin = 3 * m2 * i3 - i2 * s3
            assert margin >= 0
            if i3:
                supported_ratio_cases += 1
                assert i2 > 0 and s3 * i2 <= 3 * i3 * m2
            else:
                unsupported_rank_three_cases += 1
            minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
            if margin > 0:
                minimum_positive_margin = (
                    margin
                    if minimum_positive_margin is None
                    else min(minimum_positive_margin, margin)
                )
            subset_checks += local_checks
            cases += 1

    # Non-literal coefficient extraction on asymmetric and large endpoints.
    extreme_vectors = (
        (0,),
        (1,),
        (0, 0, 0, 0, 0, 0),
        (0, 1, 2, 7, 31),
        (1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
        (0, 0, 3, 100, 1000),
        tuple(range(20)),
    )
    for multiplicities in extreme_vectors:
        i2, i3, s3, m2 = closed_stats(multiplicities)
        assert (i2, i3, s3) == generating_function_stats(multiplicities)
        assert 3 * m2 * i3 - i2 * s3 >= 0

    return {
        "literal_cases": cases,
        "literal_subset_checks": subset_checks,
        "supported_ratio_cases": supported_ratio_cases,
        "unsupported_rank_three_cases": unsupported_rank_three_cases,
        "minimum_margin": minimum_margin,
        "minimum_positive_margin": minimum_positive_margin,
        "extreme_generating_function_cases": len(extreme_vectors),
    }


def main() -> None:
    observed_hashes = {path.name: sha256(path) for path in (PRODUCER, PRIMARY, NOTE)}
    assert observed_hashes == PINNED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q3_AT_MOST_Q2_THEOREM"
    )
    assert primary["source_sha256"] == PINNED[PRODUCER.name]
    assert primary["equivalent_margin"] == "3*m2*i3-i2*s3>=0"
    assert "whenever i3>0" in primary["theorem"]
    note = NOTE.read_text(encoding="utf-8")
    assert "whenever `i_3(T)>0`" in note
    assert "does not yet prove `q_r<=q_3` for `r>3`" in note

    symbolic = symbolic_audit(primary)
    literal = literal_audit()
    payload = {
        "schema": "multitype-depth2-star-q3-q2-theorem-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q3_AT_MOST_Q2_AUDIT",
        "pinned_hashes": observed_hashes,
        "independence": "The producer was neither imported nor executed.",
        "theorem_verified": (
            "For every depth-two star with arbitrary nonnegative integer arm "
            "multiplicities, 3*m2*i3-i2*s3>=0. If i3>0, q3<=q2."
        ),
        "symbolic_audit": symbolic,
        "literal_audit": literal,
        "scope_warning": (
            "This audits only the rank-three/rank-two comparison on the complete "
            "nonuniform depth-two-star family. It does not prove q_r<=q3 for "
            "r>3, either surviving token-sliding target for every tree, a forest "
            "coefficient theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("partitions", symbolic["symmetric_partitions"])
    print("literal", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
