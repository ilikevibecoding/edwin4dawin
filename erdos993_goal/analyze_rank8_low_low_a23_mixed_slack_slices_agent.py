#!/usr/bin/env python3
"""Exact slice-factorization probe for the two rank-eight mixed faces.

This is a diagnostic, not a theorem verifier.  It builds a mixed face with a
chosen subset of the ten ordinary gap slacks, groups coefficients by the exact
slack monomial, and tests whether each nonzero-slack slice contains a positive
scalar monomial translate of the corresponding zero-slack polynomial with a
coefficientwise-nonnegative residual.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
from flint import fmpz_mpoly_ctx
from scipy.optimize import linprog
from scipy.sparse import coo_array

from search_rank8_low_low_a23_mixed_zero_slack_young_agent import ratio_menu


BASE_NAMES = ("h", "ta", "tb", "P", "Q")
SLACK_NAMES = (
    "a0", "a4", "a5", "a6", "a7",
    "b0", "b4", "b5", "b6", "b7",
)
ROOT = Path(__file__).resolve().parent
ZERO_CERTIFICATE = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json"


def factor_row(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    value = zero
    for index in range(rank + 1):
        value += math.comb(rank, index) * left[index] * right[rank - index]
    return value


def curvature(values, h):
    return values[8] ** 2 - values[7] * values[9] - h * values[7] * values[8]


def cross(base, direction, h):
    return (
        2 * base[8] * direction[8]
        - base[7] * direction[9]
        - direction[7] * base[9]
        - h * (base[7] * direction[8] + direction[7] * base[8])
    )


def derivative(c_values, v_values, h):
    return (
        2 * c_values[8] * v_values[8]
        - v_values[7] * c_values[9]
        - c_values[7] * v_values[9]
        - h * (v_values[7] * c_values[8] + c_values[7] * v_values[8])
    )


def derivative_cross(base_c, direction_c, base_v, direction_v, h):
    return (
        2 * (base_c[8] * direction_v[8] + direction_c[8] * base_v[8])
        - base_v[7] * direction_c[9]
        - direction_v[7] * base_c[9]
        - base_c[7] * direction_v[9]
        - direction_c[7] * base_v[9]
        - h * (
            base_v[7] * direction_c[8]
            + direction_v[7] * base_c[8]
            + base_c[7] * direction_v[8]
            + direction_c[7] * base_v[8]
        )
    )


def build(face, active_slacks, only_label=None):
    names = BASE_NAMES + tuple(active_slacks)
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = dict(zip(names, context.gens()))
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    zero, one = context.constant(0), context.constant(1)
    slack = {name: variables.get(name, zero) for name in SLACK_NAMES}
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + slack["a0"], h, h + a2, h + a3,
        h + slack["a4"], h + slack["a5"],
        h + slack["a6"], h + slack["a7"],
    ]
    right_gaps = [
        2 * h + slack["b0"], h, h + b2, h + b3,
        h + slack["b4"], h + slack["b5"],
        h + slack["b6"], h + slack["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]
    base_c = {rank: convolution(left, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_c = {
        rank: convolution(left, right_direction, rank, zero) for rank in (7, 8, 9)
    }
    base_v = {rank: convolution(tail, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero) for rank in (7, 8, 9)
    }
    curvature_base = curvature(base_v, h)
    curvature_linear = cross(base_v, direction_v, h)
    curvature_direction = curvature(direction_v, h)
    curvature_rows = {
        "curvature_middle_times_4": lambda: 4 * curvature_base + 2 * curvature_linear,
        "curvature_far": lambda: curvature_base + curvature_linear + curvature_direction,
    }
    if only_label in curvature_rows:
        return names, {only_label: curvature_rows[only_label]()}
    capacity = left_ratios[2]
    margin_base = capacity * curvature(base_c, h)
    margin_linear = capacity * cross(base_c, direction_c, h)
    margin_direction = capacity * curvature(direction_c, h)
    derivative_base = derivative(base_c, base_v, h)
    derivative_linear = derivative_cross(
        base_c, direction_c, base_v, direction_v, h
    )
    derivative_direction = derivative(direction_c, direction_v, h)
    strong_base = margin_base + h * derivative_base
    strong_linear = margin_linear + h * derivative_linear
    strong_direction = margin_direction + h * derivative_direction
    strong_rows = {
        "strong_middle_times_4": lambda: 4 * strong_base + 2 * strong_linear,
        "strong_far": lambda: strong_base + strong_linear + strong_direction,
    }
    if only_label in strong_rows:
        return names, {only_label: strong_rows[only_label]()}
    assert only_label is None
    return names, {
        label: maker() for label, maker in {**curvature_rows, **strong_rows}.items()
    }


def split_slices(polynomial, slack_count):
    slices = {}
    for monomial, coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        base = monomial[: len(BASE_NAMES)]
        slack = monomial[len(BASE_NAMES):]
        assert len(slack) == slack_count
        slices.setdefault(slack, {})[base] = int(coefficient)
    return slices


def translate(poly, delta):
    return {
        tuple(index + shift for index, shift in zip(monomial, delta)): coefficient
        for monomial, coefficient in poly.items()
    }


def factor_test(zero_poly, candidate):
    """Find c>0 and delta with candidate-c*x^delta*zero >= 0."""
    zero_negative = {m: -c for m, c in zero_poly.items() if c < 0}
    candidate_negative = {m: -c for m, c in candidate.items() if c < 0}
    if not candidate_negative:
        return {"status": "COEFFICIENTWISE_NONNEGATIVE"}
    possible_deltas = set()
    first = min(candidate_negative)
    for source in zero_negative:
        delta = tuple(a - b for a, b in zip(first, source))
        if all(
            min(monomial[index] + delta[index] for monomial in zero_poly) >= 0
            for index in range(len(BASE_NAMES))
        ):
            possible_deltas.add(delta)
    witnesses = []
    for delta in sorted(possible_deltas):
        shifted = translate(zero_poly, delta)
        shifted_negative = {m: -c for m, c in shifted.items() if c < 0}
        if not set(candidate_negative) <= set(shifted_negative):
            continue
        lower = max(
            Fraction(demand, shifted_negative[m])
            for m, demand in candidate_negative.items()
        )
        upper_bounds = [
            Fraction(candidate.get(m, 0), coefficient)
            for m, coefficient in shifted.items() if coefficient > 0
        ]
        upper = min(upper_bounds) if upper_bounds else None
        if upper is None or lower <= upper:
            residual = {
                m: Fraction(candidate.get(m, 0)) - lower * shifted.get(m, 0)
                for m in set(candidate) | set(shifted)
            }
            assert min(residual.values()) >= 0
            witnesses.append({
                "delta": list(delta),
                "scalar": [lower.numerator, lower.denominator],
                "upper": None if upper is None else [upper.numerator, upper.denominator],
                "residual_terms": sum(value > 0 for value in residual.values()),
                "residual_zero_terms": sum(value == 0 for value in residual.values()),
            })
    return {
        "status": "PASS_TRANSLATED_ZERO_PLUS_NONNEGATIVE" if witnesses else "NO_SINGLE_TRANSLATE",
        "negative_terms": len(candidate_negative),
        "witnesses": witnesses,
    }


def as_fraction(pair):
    return Fraction(int(pair[0]), int(pair[1]))


def template_test(certificate_row, candidate):
    """LP using only translated/scaled zero-slack Young payment packages."""
    candidate_positive = {m: c for m, c in candidate.items() if c > 0}
    candidate_negative = {m: -c for m, c in candidate.items() if c < 0}
    if not candidate_negative:
        return {"status": "COEFFICIENTWISE_NONNEGATIVE"}
    grouped = {}
    for allocation in certificate_row["allocations"]:
        grouped.setdefault(tuple(allocation["target"]), []).append(allocation)
    paid = {
        tuple(item["monomial"]): as_fraction(item["paid"])
        for item in certificate_row["target_audit"]
    }
    assert set(grouped) == set(paid)
    candidates = []
    per_target = {target: 0 for target in candidate_negative}
    for target, demand in candidate_negative.items():
        for seed_target, allocations in grouped.items():
            delta = tuple(a - b for a, b in zip(target, seed_target))
            scale = Fraction(demand, 1) / paid[seed_target]
            costs = {}
            valid = True
            for allocation in allocations:
                for source_key, cost_key in (
                    ("source_low", "low_cost"),
                    ("source_high", "high_cost"),
                ):
                    source = tuple(
                        int(value) + shift
                        for value, shift in zip(allocation[source_key], delta)
                    )
                    if min(source) < 0 or source not in candidate_positive:
                        valid = False
                        break
                    costs[source] = costs.get(source, Fraction(0)) + scale * as_fraction(
                        allocation[cost_key]
                    )
                if not valid:
                    break
            if valid:
                candidates.append((target, seed_target, delta, costs))
                per_target[target] += 1
    if min(per_target.values(), default=0) == 0:
        return {
            "status": "NO_TEMPLATE_FOR_SOME_TARGET",
            "negative_terms": len(candidate_negative),
            "uncovered_targets": [
                list(target) for target, count in per_target.items() if not count
            ],
            "candidate_range": [min(per_target.values()), max(per_target.values())],
        }
    sources = sorted({source for *_, costs in candidates for source in costs})
    target_row = {target: index for index, target in enumerate(candidate_negative)}
    source_row = {
        source: len(target_row) + index for index, source in enumerate(sources)
    }
    row_indices, column_indices, values = [], [], []
    for column, (target, _, _, costs) in enumerate(candidates):
        row_indices.append(target_row[target])
        column_indices.append(column)
        values.append(-1.0)
        for source, cost in costs.items():
            row_indices.append(source_row[source])
            column_indices.append(column)
            values.append(float(cost / candidate_positive[source]))
    matrix = coo_array(
        (values, (row_indices, column_indices)),
        shape=(len(target_row) + len(source_row), len(candidates)),
    ).tocsc()
    bounds = np.array([-1.0] * len(target_row) + [1.0] * len(source_row))
    solution = linprog(
        np.ones(len(candidates)), A_ub=matrix, b_ub=bounds,
        bounds=(0, None), method="highs",
    )
    if not solution.success:
        return {
            "status": "TEMPLATE_CAPACITY_LP_INFEASIBLE",
            "negative_terms": len(candidate_negative),
            "candidate_count": len(candidates),
            "candidate_range": [min(per_target.values()), max(per_target.values())],
            "message": solution.message,
        }
    used = np.flatnonzero(solution.x > 1e-9)
    return {
        "status": "PASS_FLOATING_TRANSLATED_ZERO_YOUNG_TEMPLATES",
        "negative_terms": len(candidate_negative),
        "candidate_count": len(candidates),
        "candidate_range": [min(per_target.values()), max(per_target.values())],
        "templates_used": int(len(used)),
        "maximum_weight": float(max(solution.x)),
    }


def direct_test(candidate):
    """Discover and then exactly replay a rational Young certificate."""
    positive = {m: c for m, c in candidate.items() if c > 0}
    negative = {m: -c for m, c in candidate.items() if c < 0}
    if not negative:
        return {"status": "COEFFICIENTWISE_NONNEGATIVE"}
    positive_keys = set(positive)

    def midpoint_pairs(target):
        doubled = tuple(2 * value for value in target)
        total = sum(target)
        order = sorted(range(len(target)), key=lambda index: doubled[index])
        low = [0] * len(target)
        pairs = []

        def visit(position, remaining):
            if position == len(order) - 1:
                index = order[position]
                if 0 <= remaining <= doubled[index]:
                    low[index] = remaining
                    low_tuple = tuple(low)
                    high_tuple = tuple(doubled[i] - low_tuple[i] for i in range(len(target)))
                    if low_tuple < high_tuple and low_tuple in positive_keys and high_tuple in positive_keys:
                        pairs.append((low_tuple, high_tuple))
                return
            index = order[position]
            later_max = sum(doubled[item] for item in order[position + 1:])
            lower = max(0, remaining - later_max)
            upper = min(doubled[index], remaining)
            for value in range(lower, upper + 1):
                low[index] = value
                visit(position + 1, remaining - value)

        visit(0, total)
        return pairs

    candidates = []
    per_target = {target: 0 for target in negative}
    for target in negative:
        for low, high in midpoint_pairs(target):
            for ratio in ratio_menu(positive[low], positive[high]):
                candidates.append((target, low, high, ratio))
            per_target[target] += 1
    if min(per_target.values(), default=0) == 0:
        return {
            "status": "NO_MIDPOINT_PAIR_FOR_SOME_TARGET",
            "negative_terms": len(negative),
            "uncovered_targets": [list(t) for t, count in per_target.items() if not count],
        }
    targets = sorted(negative)
    sources = sorted({s for _, low, high, _ in candidates for s in (low, high)})
    target_row = {target: index for index, target in enumerate(targets)}
    source_row = {source: len(targets) + index for index, source in enumerate(sources)}
    row_indices, column_indices, values = [], [], []
    for column, (target, low, high, ratio) in enumerate(candidates):
        for row, value in (
            (target_row[target], -1.0 / negative[target]),
            (source_row[low], float(ratio / (2 * positive[low]))),
            (source_row[high], float(1 / (2 * ratio * positive[high]))),
        ):
            row_indices.append(row)
            column_indices.append(column)
            values.append(value)
    matrix = coo_array(
        (values, (row_indices, column_indices)),
        shape=(len(targets) + len(sources), len(candidates)),
    ).tocsc()
    solution = None
    safety_used = None
    for safety in (1e-4, 1e-5, 1e-6, 0.0):
        bounds = np.array([-(1 + safety)] * len(targets) + [(1 - safety)] * len(sources))
        trial = linprog(
            np.ones(len(candidates)), A_ub=matrix, b_ub=bounds,
            bounds=(0, None), method="highs", options={"time_limit": 120},
        )
        if trial.success:
            solution, safety_used = trial, safety
            break
    if solution is None:
        return {
            "status": "DIRECT_YOUNG_LP_INFEASIBLE",
            "negative_terms": len(negative),
            "midpoint_pairs": sum(per_target.values()),
            "ratio_candidates": len(candidates),
            "message": trial.message,
        }
    exact = None
    for denominator in (10**6, 10**8, 10**10):
        allocations = []
        for value, candidate_block in zip(solution.x, candidates):
            if value <= 1e-10:
                continue
            payment = Fraction(math.ceil(value * denominator - 1e-12), denominator)
            if payment:
                allocations.append((payment, candidate_block))
        target_paid = {target: Fraction(0) for target in targets}
        source_used = {source: Fraction(0) for source in sources}
        for payment, (target, low, high, ratio) in allocations:
            target_paid[target] += payment
            source_used[low] += payment * ratio / 2
            source_used[high] += payment / (2 * ratio)
        if (
            all(target_paid[target] >= negative[target] for target in targets)
            and all(source_used[source] <= positive[source] for source in sources)
        ):
            exact = (denominator, allocations, target_paid, source_used)
            break
    if exact is None:
        return {
            "status": "DIRECT_FLOATING_PASS_EXACT_ROUNDING_FAIL",
            "negative_terms": len(negative),
            "ratio_candidates": len(candidates),
        }
    denominator, allocations, target_paid, source_used = exact
    return {
        "status": "PASS_EXACT_DIRECT_YOUNG_AMGM",
        "negative_terms": len(negative),
        "midpoint_pairs": sum(per_target.values()),
        "pair_range": [min(per_target.values()), max(per_target.values())],
        "ratio_candidates": len(candidates),
        "allocations_used": len(allocations),
        "rational_grid_denominator": denominator,
        "floating_safety": safety_used,
        "minimum_target_surplus": str(min(target_paid[t] - negative[t] for t in targets)),
        "minimum_source_reserve": str(min(positive[s] - source_used[s] for s in sources)),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--slacks", default="")
    parser.add_argument("--summary", action="store_true")
    parser.add_argument("--template", action="store_true")
    parser.add_argument("--direct", action="store_true")
    parser.add_argument("--exact-support", action="store_true")
    parser.add_argument("--positive-union", action="store_true")
    parser.add_argument("--count-only", action="store_true")
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    active = tuple(filter(None, args.slacks.split(",")))
    assert len(set(active)) == len(active) and set(active) <= set(SLACK_NAMES)
    _, zero_rows = build(face, ())
    _, rows = build(face, active)
    zero_certificate = None
    if args.template:
        payload = json.loads(ZERO_CERTIFICATE.read_text(encoding="utf-8"))
        zero_certificate = payload["faces"][args.face]
    if args.exact_support:
        support_report = {
            "face": list(face), "active_slacks": list(active), "rows": {},
        }
        for label, polynomial in rows.items():
            terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in polynomial.terms()
                if all(int(value) > 0 for value in monomial[len(BASE_NAMES):])
            }
            support_report["rows"][label] = {
                "terms": len(terms),
                "negative_terms": sum(value < 0 for value in terms.values()),
                "certificate": direct_test(terms),
            }
        print(json.dumps(support_report, separators=(",", ":")), flush=True)
        return

    if args.positive_union:
        union_report = {
            "face": list(face), "active_slacks": list(active), "rows": {},
        }
        for label, polynomial in rows.items():
            terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in polynomial.terms()
                if any(int(value) > 0 for value in monomial[len(BASE_NAMES):])
            }
            union_report["rows"][label] = {
                "terms": len(terms),
                "positive_terms": sum(value > 0 for value in terms.values()),
                "negative_terms": sum(value < 0 for value in terms.values()),
                "certificate": (
                    {"status": "COUNT_ONLY"} if args.count_only else direct_test(terms)
                ),
            }
        print(json.dumps(union_report, separators=(",", ":")), flush=True)
        return

    report = {"face": list(face), "active_slacks": list(active), "rows": {}}
    for label, polynomial in rows.items():
        zero = split_slices(zero_rows[label], 0)[()]
        slices = split_slices(polynomial, len(active))
        row = {}
        for slack_monomial, candidate in sorted(slices.items()):
            if not any(slack_monomial):
                assert candidate == zero
                continue
            row[",".join(map(str, slack_monomial))] = (
                direct_test(candidate) if args.direct else
                template_test(zero_certificate[label], candidate) if args.template else
                factor_test(zero, candidate)
            )
        report["rows"][label] = {
            "terms": len(polynomial.coeffs()),
            "slices": row,
            "slice_count": len(row),
            "negative_slice_count": sum(
                value.get("negative_terms", 0) > 0 for value in row.values()
            ),
            "single_translate_pass_count": sum(
                value["status"] != "NO_SINGLE_TRANSLATE" for value in row.values()
            ),
        }
    if args.summary:
        summary = {
            "face": report["face"],
            "active_slacks": report["active_slacks"],
            "rows": {
                label: {
                    "terms": row["terms"],
                    "slice_count": row["slice_count"],
                    "negative_slice_count": row["negative_slice_count"],
                    "negative_slices": {
                        key: value for key, value in row["slices"].items()
                        if value.get("negative_terms", 0)
                    },
                }
                for label, row in report["rows"].items()
            },
        }
        print(json.dumps(summary, separators=(",", ":")), flush=True)
    else:
        print(json.dumps(report, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
