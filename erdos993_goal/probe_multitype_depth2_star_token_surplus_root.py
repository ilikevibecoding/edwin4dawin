#!/usr/bin/env python3
"""Exact stress test of the two surviving token-surplus targets.

The tree has a central vertex and groups of depth-two arms.  A group
``(d, m)`` consists of ``d`` neighbours of the centre, each with ``m`` leaf
children.  Different groups allow highly nonuniform arm sizes while retaining
closed zero-edge and one-edge generating functions.

This is a finite diagnostic only.  A PASS is not an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import random


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def trim(poly: list[int]) -> list[int]:
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    return poly


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    out = [0] * min(cap + 1, max(len(left), len(right)))
    for index in range(len(out)):
        out[index] = (left[index] if index < len(left) else 0) + (
            right[index] if index < len(right) else 0
        )
    return trim(out)


def multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    out = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        if not a:
            continue
        stop = min(len(right), cap + 1 - i)
        for j in range(stop):
            b = right[j]
            if b:
                out[i + j] += a * b
    return trim(out)


def power(base: list[int], exponent: int, cap: int) -> list[int]:
    result = [1]
    factor = base
    while exponent:
        if exponent & 1:
            result = multiply(result, factor, cap)
        exponent >>= 1
        if exponent:
            factor = multiply(factor, factor, cap)
    return result


def binomial_poly(order: int, cap: int) -> list[int]:
    return [math.comb(order, degree) for degree in range(min(order, cap) + 1)]


def scaled(poly: list[int], factor: int) -> list[int]:
    return [factor * value for value in poly]


def depth_two_rows(groups: tuple[tuple[int, int], ...], cap: int):
    """Return I(T) and J(T)/x^2 through ``cap`` exactly."""
    groups = tuple((d, m) for d, m in groups if d)
    arm_count = sum(d for d, _ in groups)
    leaf_count = sum(d * m for d, m in groups)
    n = 1 + arm_count + leaf_count

    factors = []
    powers = []
    lowered_powers = []
    for d, m in groups:
        factor = binomial_poly(m, cap)
        if len(factor) < 2:
            factor.append(1)
        else:
            factor[1] += 1
        factors.append(factor)
        powers.append(power(factor, d, cap))
        lowered_powers.append(power(factor, d - 1, cap))

    prefix = [[1]]
    for group_power in powers:
        prefix.append(multiply(prefix[-1], group_power, cap))
    suffix = [[1] for _ in range(len(groups) + 1)]
    for index in range(len(groups) - 1, -1, -1):
        suffix[index] = multiply(powers[index], suffix[index + 1], cap)

    product = prefix[-1]
    centre_selected = [0] + binomial_poly(leaf_count, max(0, cap - 1))
    independent = add(product, centre_selected, cap)

    one_edge_over_x2 = [0]
    for index, (d, m) in enumerate(groups):
        others = multiply(prefix[index], suffix[index + 1], cap)
        product_without_one_arm = multiply(
            multiply(others, lowered_powers[index], cap), [1], cap
        )
        leaf_edges = scaled(product_without_one_arm, d * m)
        centre_edges = scaled(binomial_poly(leaf_count - m, cap), d)
        one_edge_over_x2 = add(one_edge_over_x2, leaf_edges, cap)
        one_edge_over_x2 = add(one_edge_over_x2, centre_edges, cap)

    w = math.comb(n - 2, 2) if n >= 4 else 0
    degree_surplus = math.comb(arm_count - 1, 2) + sum(
        d * math.comb(m, 2) for d, m in groups
    )
    m2 = w - degree_surplus
    i2 = math.comb(n - 1, 2)
    return independent, one_edge_over_x2, n, w, m2, i2


def better_fraction(numerator: int, denominator: int, row: dict | None) -> bool:
    return row is None or numerator * row["denominator"] > row["numerator"] * denominator


def evaluate(groups: tuple[tuple[int, int], ...], cap: int):
    independent, one_edge, n, w, m2, i2 = depth_two_rows(groups, cap)
    if m2 <= 0:
        return [], None, None, None, None
    failures = []
    best_actual = None
    best_actual_rank3plus = None
    best_q2 = None
    best_q3_domination = None
    q3_i = independent[3] if len(independent) > 3 else 0
    q3_s = one_edge[2] if len(one_edge) > 2 else 0
    for rank in range(2, len(independent)):
        if not independent[rank] or rank - 1 >= len(one_edge):
            continue
        slides = one_edge[rank - 1]
        denominator = rank * m2 * independent[rank]
        actual_numerator = w * slides
        q2_numerator = i2 * slides
        common = {
            "groups": [list(group) for group in groups],
            "order": n,
            "rank": rank,
            "i_rank": independent[rank],
            "s_rank": slides,
            "W": w,
            "m2": m2,
            "i2": i2,
        }
        if better_fraction(actual_numerator, denominator, best_actual):
            best_actual = {
                **common,
                "numerator": actual_numerator,
                "denominator": denominator,
                "cross_margin": denominator - actual_numerator,
            }
        if rank >= 3 and better_fraction(
            actual_numerator, denominator, best_actual_rank3plus
        ):
            best_actual_rank3plus = {
                **common,
                "numerator": actual_numerator,
                "denominator": denominator,
                "cross_margin": denominator - actual_numerator,
            }
        if rank >= 3 and better_fraction(q2_numerator, denominator, best_q2):
            best_q2 = {
                **common,
                "numerator": q2_numerator,
                "denominator": denominator,
                "cross_margin": denominator - q2_numerator,
            }
        if rank >= 4 and q3_i and q3_s:
            q3_test_numerator = 3 * q3_i * slides
            q3_test_denominator = q3_s * rank * independent[rank]
            if better_fraction(
                q3_test_numerator, q3_test_denominator, best_q3_domination
            ):
                best_q3_domination = {
                    **common,
                    "q3_i": q3_i,
                    "q3_s": q3_s,
                    "numerator": q3_test_numerator,
                    "denominator": q3_test_denominator,
                    "cross_margin": q3_test_denominator - q3_test_numerator,
                }
            if q3_test_numerator > q3_test_denominator:
                failures.append({"target": "q_r_at_most_q3", **common})
        if actual_numerator > denominator:
            failures.append({"target": "actual_averaged", **common})
        if q2_numerator > denominator:
            failures.append({"target": "q2_domination", **common})
    return failures, best_actual, best_actual_rank3plus, best_q2, best_q3_domination


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-cases", type=int, default=4000)
    parser.add_argument("--rank-cap", type=int, default=48)
    parser.add_argument("--maximum-groups", type=int, default=4)
    parser.add_argument("--maximum-multiplicity", type=int, default=80)
    parser.add_argument("--maximum-leaves-per-arm", type=int, default=180)
    parser.add_argument("--seed", type=int, default=993_20260828)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    cases = []
    for d in (2, 3, 5, 10, 20, 40, 80):
        for m in (0, 1, 2, 5, 10, 30, 80, 180):
            cases.append(((d, m),))
    for _ in range(args.random_cases):
        type_count = rng.randint(2, args.maximum_groups)
        groups = []
        used_sizes = set()
        for _ in range(type_count):
            m = rng.choice(
                (
                    rng.randint(0, min(8, args.maximum_leaves_per_arm)),
                    rng.randint(0, args.maximum_leaves_per_arm),
                    int(args.maximum_leaves_per_arm * rng.random() ** 3),
                )
            )
            while m in used_sizes and len(used_sizes) <= args.maximum_leaves_per_arm:
                m = (m + 1) % (args.maximum_leaves_per_arm + 1)
            used_sizes.add(m)
            d = rng.randint(1, args.maximum_multiplicity)
            groups.append((d, m))
        cases.append(tuple(sorted(groups, key=lambda item: item[1])))

    best_actual = None
    best_actual_rank3plus = None
    best_q2 = None
    best_q3_domination = None
    failures = []
    rank_checks = 0
    maximum_order = 0
    for index, groups in enumerate(cases):
        (
            local_failures,
            local_actual,
            local_actual_rank3plus,
            local_q2,
            local_q3_domination,
        ) = evaluate(groups, args.rank_cap)
        maximum_order = max(maximum_order, 1 + sum(d * (m + 1) for d, m in groups))
        if local_actual:
            rank_checks += max(0, args.rank_cap - 1)
            if better_fraction(local_actual["numerator"], local_actual["denominator"], best_actual):
                best_actual = local_actual
            if local_actual_rank3plus and better_fraction(
                local_actual_rank3plus["numerator"],
                local_actual_rank3plus["denominator"],
                best_actual_rank3plus,
            ):
                best_actual_rank3plus = local_actual_rank3plus
            if local_q2 and better_fraction(
                local_q2["numerator"], local_q2["denominator"], best_q2
            ):
                best_q2 = local_q2
            if local_q3_domination and better_fraction(
                local_q3_domination["numerator"],
                local_q3_domination["denominator"],
                best_q3_domination,
            ):
                best_q3_domination = local_q3_domination
        failures.extend(local_failures[: max(0, 20 - len(failures))])
        if failures:
            break
        if (index + 1) % 500 == 0:
            print(f"CASES {index + 1} BEST_Q2_MARGIN {best_q2['cross_margin']}", flush=True)

    report = {
        "schema": "multitype-depth2-star-token-surplus-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_MULTITYPE_DEPTH2_STAR_TOKEN_SURPLUS"
            if failures
            else "PASS_EXACT_FINITE_MULTITYPE_DEPTH2_STAR_TOKEN_SURPLUS"
        ),
        "cases": index + 1,
        "approximate_rank_checks": rank_checks,
        "maximum_order": maximum_order,
        "rank_cap": args.rank_cap,
        "random_seed": args.seed,
        "best_actual_ratio": best_actual,
        "best_actual_ratio_rank3plus": best_actual_rank3plus,
        "best_q2_ratio": best_q2,
        "best_qr_over_q3_ratio_rank4plus": best_q3_domination,
        "failures": failures,
        "scope_warning": "Finite structured-family evidence only; not an all-order proof.",
        "source_sha256": sha256(Path(__file__)),
    }
    output = ROOT / "multitype_depth2_star_token_surplus_probe_root_20260828.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("cases", report["cases"], "maximum_order", maximum_order)
    print("best_actual", best_actual)
    print("best_actual_rank3plus", best_actual_rank3plus)
    print("best_q2", best_q2)
    print("best_qr_over_q3_rank4plus", best_q3_domination)
    print("source_sha256", report["source_sha256"])
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
