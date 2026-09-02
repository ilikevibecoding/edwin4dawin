#!/usr/bin/env python3
"""Verify the finite and symbolic parts of the star entropy theorem."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from find_min_star_root_pird_failure import build, partitions_with_cost


def symbolic_checks() -> dict[str, bool]:
    u, s, p, r = sp.symbols("u s p r")

    a1 = sp.expand(
        9 * (sp.Rational(2, 3) + 2 * u) ** 2
        - 32 * u * (1 + u)
    )
    a1_expected = 4 * (u - 1) ** 2

    f2 = sp.Rational(2, 3) + sp.Rational(3, 2) * s + p / 2
    d2 = 1 + s + p
    e2 = sp.factor(9 * f2**2 - 16 * s * d2)
    e2_expected = (
        9 * p**2
        - 10 * p * s
        + 24 * p
        + 17 * s**2
        + 8 * s
        + 16
    ) / 4
    p_vertex = (5 * s - 12) / 9
    e2_vertex = sp.factor(e2.subs(p, p_vertex))

    f3 = (
        sp.Rational(2, 3)
        + sp.Rational(4, 3) * s
        + p / 2
        + r / 4
    )
    d3 = 1 + s + p + r
    e3 = sp.factor(27 * f3**2 - 32 * s * d3)
    q3 = sp.expand(16 * e3)
    q3_expected = (
        108 * p**2
        + 108 * p * r
        + 64 * p * s
        + 288 * p
        + 27 * r**2
        - 224 * r * s
        + 144 * r
        + 256 * s**2
        + 256 * s
        + 192
    )
    r_vertex = -2 * p + sp.Rational(112, 27) * s - sp.Rational(8, 3)
    e3_vertex = sp.factor(e3.subs(r, r_vertex))
    e3_boundary = sp.factor(e3.subs(r, p**2 / (3 * s)))

    return {
        "a1_identity": sp.simplify(a1 - a1_expected) == 0,
        "a2_identity": sp.simplify(e2 - e2_expected) == 0,
        "a2_vertex": (
            sp.simplify(
                e2_vertex - sp.Rational(16, 9) * s * (2 * s + 3)
            )
            == 0
        ),
        "a3_identity": sp.simplify(q3 - q3_expected) == 0,
        "a3_vertex": (
            sp.simplify(
                e3_vertex
                - sp.Rational(32, 27) * s * (27 * p - 11 * s + 45)
            )
            == 0
        ),
        "a3_boundary_positive_coefficients": all(
            coefficient >= 0
            for coefficient in sp.Poly(
                sp.together(e3_boundary * 48 * s**2), p, s
            ).coeffs()
        ),
    }


def hypergeometric_checks(limit: int) -> dict:
    checks = 0
    minimum = None
    first_failure = None

    for a in range(1, limit + 1):
        for n in range(0, limit + 1):
            total = a + n
            for k in range(1, min(total, n + 1) + 1):
                denominator = comb(total, k)
                probabilities = {
                    t: Fraction(
                        comb(a, t) * comb(n, k - t),
                        denominator,
                    )
                    for t in range(max(0, k - n), min(a, k) + 1)
                }
                pi0 = probabilities.get(0, Fraction(0))
                pi1 = probabilities.get(1, Fraction(0))
                value = Fraction(2, 3) * pi0
                value += Fraction(a + 1, a) * pi1
                value += sum(
                    Fraction(1, 2 ** (t - 1)) * probability
                    for t, probability in probabilities.items()
                    if t >= 2
                )
                slack = value * value - Fraction(32, 9 * a) * pi1
                checks += 1
                record = (slack, a, n, k, value, pi1)
                if minimum is None or slack < minimum[0]:
                    minimum = record
                if slack < 0 and first_failure is None:
                    first_failure = record

    def encode(record):
        if record is None:
            return None
        slack, a, n, k, value, pi1 = record
        return {
            "a": a,
            "N": n,
            "k": k,
            "value": [value.numerator, value.denominator],
            "pi1": [pi1.numerator, pi1.denominator],
            "slack": [slack.numerator, slack.denominator],
            "slack_decimal": float(slack),
        }

    return {
        "parameter_limit": limit,
        "checks": checks,
        "minimum": encode(minimum),
        "first_failure": encode(first_failure),
    }


def star_forest_checks(order_limit: int) -> dict:
    branch_multisets = 0
    rank_branch_checks = 0
    minimum = None
    first_failure = None

    for rooted_order in range(2, order_limit + 1):
        for branches in partitions_with_cost(rooted_order - 1):
            if not branches:
                continue
            branch_multisets += 1
            leaf_total = sum(branches)
            polynomial = build(branches)[0]
            deleted = [
                build(branches[:i] + branches[i + 1 :])[0]
                for i in range(len(branches))
            ]

            for k in range(1, leaf_total + 1):
                for i, a in enumerate(branches):
                    h = (
                        deleted[i][k - 1]
                        if k - 1 < len(deleted[i])
                        else 0
                    )
                    if h == 0:
                        continue
                    p_i = Fraction(2 * h, polynomial[k])
                    r_i = Fraction(
                        comb(leaf_total - a, k - 1),
                        comb(leaf_total, k),
                    )
                    slack = Fraction(9, 8) * r_i - p_i * p_i
                    rank_branch_checks += 1
                    record = (
                        slack,
                        rooted_order,
                        branches,
                        k,
                        i,
                        p_i,
                        r_i,
                    )
                    if minimum is None or slack < minimum[0]:
                        minimum = record
                    if slack < 0 and first_failure is None:
                        first_failure = record

    def encode(record):
        if record is None:
            return None
        slack, order, branches, k, i, p_i, r_i = record
        return {
            "rooted_tree_order": order,
            "branches": list(branches),
            "k": k,
            "branch_index": i,
            "p_i": [p_i.numerator, p_i.denominator],
            "r_i": [r_i.numerator, r_i.denominator],
            "slack": [slack.numerator, slack.denominator],
            "slack_decimal": float(slack),
        }

    return {
        "order_limit": order_limit,
        "branch_multisets": branch_multisets,
        "rank_branch_checks": rank_branch_checks,
        "minimum": encode(minimum),
        "first_failure": encode(first_failure),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order-limit", type=int, default=34)
    parser.add_argument("--parameter-limit", type=int, default=80)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "star_root_entropy_jensen_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_checks()
    hypergeometric = hypergeometric_checks(args.parameter_limit)
    forests = star_forest_checks(args.order_limit)

    passed = (
        all(symbolic.values())
        and hypergeometric["first_failure"] is None
        and forests["first_failure"] is None
    )
    report = {
        "status": "PASS" if passed else "FAIL",
        "symbolic": symbolic,
        "hypergeometric": hypergeometric,
        "star_forests": forests,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
