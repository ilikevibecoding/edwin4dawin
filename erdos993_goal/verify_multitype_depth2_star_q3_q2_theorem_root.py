#!/usr/bin/env python3
"""Exact theorem: q_3 <= q_2 for every nonuniform depth-two star.

For a tree T let i_r count independent r-sets and let s_r count
(r+1)-sets inducing exactly one edge.  Put q_r=s_r/(r*i_r).  This replay
proves the cross-multiplied inequality for every tree consisting of a centre
whose branches have depth at most two, with completely arbitrary leaf
multiplicities.  Consequently q_3(T)<=q_2(T) whenever i_3(T)>0, so both
ratios are defined.

The proof is a symbolic nonnegative integer-binomial certificate, followed
by a literal subset audit of small instances.  It does not assert q_r<=q_3
for r>3 and does not prove the full tree conjecture.
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
OUTPUT = ROOT / "multitype_depth2_star_q3_q2_theorem_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_certificate() -> dict[str, object]:
    d, M, S2, S3 = sp.symbols("d M S2 S3", integer=True, nonnegative=True)

    i3 = (
        M**3
        + 3 * M**2 * d
        - 6 * M**2
        + 3 * M * d**2
        - 12 * M * d
        + 8 * M
        + 3 * S2
        + d**3
        - 3 * d**2
        + 2 * d
    ) / 6
    s3 = (
        M**3
        + 3 * M**2 * d
        - 7 * M**2
        - 2 * M * S2
        + M * d**2
        - 4 * M * d
        + 3 * M
        - 2 * S2 * d
        + 6 * S2
        + S3
    ) / 2
    m2 = (M**2 + 2 * M * d - 2 * M - S2) / 2
    i2 = (M + d) * (M + d - 1) / 2
    Q = sp.factor(4 * (3 * m2 * i3 - i2 * s3))
    assert sp.Poly(Q, d, M, S2, S3).total_degree() == 5

    # There are t direct leaves (multiplicity zero) and s positive arms.
    # Write every positive multiplicity as m_i=y_i+1.  Five placeholders
    # suffice because Q has total y-degree at most five; any further y_i may
    # be set to zero when reading the coefficient of a fixed monomial type.
    t, u = sp.symbols("t u", integer=True, nonnegative=True)
    s = u + 1
    y = sp.symbols("y0:5", integer=True, nonnegative=True)
    p1 = sum(y)
    p2 = sum(value**2 for value in y)
    p3 = sum(value**3 for value in y)
    shifted = sp.Poly(
        sp.expand(
            Q.subs(
                {
                    d: s + t,
                    M: s + p1,
                    S2: s + 2 * p1 + p2,
                    S3: s + 3 * p1 + 3 * p2 + p3,
                }
            )
        ),
        *y,
    )

    by_partition: dict[tuple[int, ...], sp.Expr] = {}
    for monomial, coefficient in shifted.terms():
        partition = tuple(sorted((power for power in monomial if power), reverse=True))
        coefficient = sp.expand(coefficient)
        if partition in by_partition:
            assert sp.expand(by_partition[partition] - coefficient) == 0
        else:
            by_partition[partition] = coefficient

    def difference_at_zero(poly: sp.Expr, a: int, b: int) -> sp.Expr:
        out = sp.expand(poly)
        for _ in range(a):
            out = sp.expand(out.subs(u, u + 1) - out)
        for _ in range(b):
            out = sp.expand(out.subs(t, t + 1) - out)
        return sp.expand(out.subs({u: 0, t: 0}))

    partition_rows = []
    for partition in sorted(by_partition, key=lambda item: (sum(item), item)):
        coefficient = by_partition[partition]
        degree_u = sp.degree(coefficient, u)
        degree_t = sp.degree(coefficient, t)
        basis = []
        reconstructed = 0
        for a in range(degree_u + 1):
            for b in range(degree_t + 1):
                value = difference_at_zero(coefficient, a, b)
                assert value.is_Integer
                assert value >= 0
                if value:
                    basis.append({"u_choose": a, "t_choose": b, "coefficient": int(value)})
                    reconstructed += value * sp.binomial(u, a) * sp.binomial(t, b)
        reconstructed = sp.expand_func(reconstructed)
        assert sp.expand(reconstructed - coefficient) == 0
        partition_rows.append(
            {
                "partition": list(partition),
                "coefficient_polynomial": str(sp.factor(coefficient)),
                "nonnegative_binomial_basis": basis,
            }
        )

    # If there are no positive arms, the tree is a star and both sides vanish.
    star_value = sp.expand(Q.subs({M: 0, S2: 0, S3: 0}))
    assert star_value == 0
    assert len(partition_rows) == 17

    return {
        "i3_formula": str(sp.factor(i3)),
        "s3_formula": str(sp.factor(s3)),
        "m2_formula": str(sp.factor(m2)),
        "i2_formula": str(sp.factor(i2)),
        "four_times_margin_formula": str(Q),
        "positive_arm_substitution": {
            "d": "s+t",
            "M": "s+sum_i y_i",
            "S2": "s+2 sum_i y_i+sum_i y_i^2",
            "S3": "s+3 sum_i y_i+3 sum_i y_i^2+sum_i y_i^3",
            "domain": "s>=1, t>=0, y_i>=0 integers; u=s-1",
        },
        "monomial_symmetric_partition_coefficients": partition_rows,
        "star_case_four_times_margin": int(star_value),
    }


def literal_audit() -> dict[str, int]:
    cases = 0
    subset_checks = 0
    minimum_margin = None
    minimum_positive_margin = None
    for d in range(1, 5):
        for multiplicities in itertools.combinations_with_replacement(range(4), d):
            edges = []
            next_vertex = 1
            for multiplicity in multiplicities:
                arm = next_vertex
                next_vertex += 1
                edges.append((0, arm))
                for _ in range(multiplicity):
                    edges.append((arm, next_vertex))
                    next_vertex += 1
            n = next_vertex
            edge_sets = tuple(frozenset(edge) for edge in edges)

            def induced_edges(chosen: tuple[int, ...]) -> int:
                selected = frozenset(chosen)
                return sum(edge <= selected for edge in edge_sets)

            i2_literal = sum(
                induced_edges(chosen) == 0
                for chosen in itertools.combinations(range(n), 2)
            )
            i3_literal = sum(
                induced_edges(chosen) == 0
                for chosen in itertools.combinations(range(n), 3)
            )
            s3_literal = sum(
                induced_edges(chosen) == 1
                for chosen in itertools.combinations(range(n), 4)
            )
            m2_literal = sum(
                first.isdisjoint(second)
                for first, second in itertools.combinations(edge_sets, 2)
            )
            subset_checks += (
                math.comb(n, 2) + math.comb(n, 3) + math.comb(n, 4)
            )

            M = sum(multiplicities)
            S2 = sum(value**2 for value in multiplicities)
            S3 = sum(value**3 for value in multiplicities)
            i2_formula = (M + d) * (M + d - 1) // 2
            i3_numerator = (
                M**3 + 3 * M**2 * d - 6 * M**2 + 3 * M * d**2
                - 12 * M * d + 8 * M + 3 * S2 + d**3 - 3 * d**2 + 2 * d
            )
            assert i3_numerator % 6 == 0
            i3_formula = i3_numerator // 6
            s3_numerator = (
                M**3 + 3 * M**2 * d - 7 * M**2 - 2 * M * S2
                + M * d**2 - 4 * M * d + 3 * M - 2 * S2 * d
                + 6 * S2 + S3
            )
            assert s3_numerator % 2 == 0
            s3_formula = s3_numerator // 2
            m2_numerator = M**2 + 2 * M * d - 2 * M - S2
            assert m2_numerator % 2 == 0
            m2_formula = m2_numerator // 2
            assert (i2_literal, i3_literal, s3_literal, m2_literal) == (
                i2_formula, i3_formula, s3_formula, m2_formula
            )

            margin = 3 * m2_literal * i3_literal - i2_literal * s3_literal
            assert margin >= 0
            minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
            if margin > 0:
                minimum_positive_margin = (
                    margin
                    if minimum_positive_margin is None
                    else min(minimum_positive_margin, margin)
                )
            cases += 1
    return {
        "cases": cases,
        "literal_subset_checks": subset_checks,
        "minimum_margin": minimum_margin,
        "minimum_positive_margin": minimum_positive_margin,
    }


def main() -> None:
    certificate = symbolic_certificate()
    audit = literal_audit()
    payload = {
        "schema": "multitype-depth2-star-q3-q2-theorem-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q3_AT_MOST_Q2_THEOREM",
        "theorem": (
            "For every depth-two star with arbitrary arm leaf multiplicities, "
            "3*m2*i3-i2*s3>=0; whenever i3>0, q3=s3/(3*i3) is at most "
            "q2=m2/i2."
        ),
        "equivalent_margin": "3*m2*i3-i2*s3>=0",
        "symbolic_certificate": certificate,
        "literal_audit": audit,
        "proof_boundary": (
            "This proves only q3<=q2 on the full nonuniform depth-two-star family. "
            "It does not prove q_r<=q3 for r>3, the token-surplus inequality for "
            "all trees, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("partitions", len(certificate["monomial_symmetric_partition_coefficients"]))
    print("literal_cases", audit["cases"], "subset_checks", audit["literal_subset_checks"])
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
