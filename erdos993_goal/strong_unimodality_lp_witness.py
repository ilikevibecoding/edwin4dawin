#!/usr/bin/env python3
"""Construct a unimodal convolution witness for a non-log-concave sequence.

A classical strong-unimodality theorem says that a non-log-concave
probability sequence has a unimodal convolution partner whose convolution is
not unimodal.  This script finds a finite witness by linear programming for a
given positive sequence ``p``.

For each proposed mode ``m`` of a length-``q_length`` sequence q and each
proposed valley rank ``b`` of c = p*q, it maximizes epsilon subject to

    q[0] <= ... <= q[m] >= ... >= q[-1],
    q >= 0, sum(q) = 1,
    c[b-1] - c[b] >= epsilon,
    c[b+1] - c[b] >= epsilon.

The LP is only a shape-discovery tool.  Any reported rationalized witness is
replayed with integer convolution before it is called a certificate.
"""

from __future__ import annotations

import argparse
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.optimize import linprog

from verify_strong_lc_32_tree import EXPECTED


def convolution(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, left_value in enumerate(left):
        for j, right_value in enumerate(right):
            result[i + j] += left_value * right_value
    return result


def is_unimodal(values: list[int]) -> bool:
    descending = False
    for left, right in zip(values, values[1:]):
        if right < left:
            descending = True
        elif descending and right > left:
            return False
    return True


def coefficient_row(
    p: np.ndarray, q_length: int, rank: int
) -> np.ndarray:
    row = np.zeros(q_length)
    for q_index in range(q_length):
        p_index = rank - q_index
        if 0 <= p_index < len(p):
            row[q_index] = p[p_index]
    return row


def solve(
    p_values: list[int],
    q_length: int,
    initial_ratio: int | None = None,
    minimum_entry: float = 0.0,
    subset_bound_order: int | None = None,
    forest_order: int | None = None,
    symmetric: bool = False,
) -> dict | None:
    # Scaling p does not affect feasibility and prevents avoidable numerical
    # conditioning problems in HiGHS.
    p = np.asarray(p_values, dtype=float)
    p /= p.max()
    variable_count = q_length + 1  # final variable is epsilon
    objective = np.zeros(variable_count)
    objective[-1] = -1.0
    bounds = [(minimum_entry, None)] * q_length + [(None, None)]
    equality_rows = []
    equality_rhs = []
    normalization = np.zeros(variable_count)
    if subset_bound_order is None:
        normalization[:q_length] = 1.0
    else:
        # Once coefficientwise graph bounds are present the feasible cone is
        # bounded after fixing q[0].  Anchor q[0]=1, exactly matching graph
        # coefficient normalization.  This also avoids feasibility-tolerance
        # artifacts caused by q[0] being exponentially tiny in probability
        # normalization.
        normalization[0] = 1.0
    equality_rows.append(normalization)
    equality_rhs.append(1.0)
    if initial_ratio is not None:
        if q_length < 2:
            raise ValueError("an initial ratio requires q_length >= 2")
        initial = np.zeros(variable_count)
        initial[1] = 1.0
        initial[0] = -float(initial_ratio)
        equality_rows.append(initial)
        equality_rhs.append(0.0)
    if symmetric:
        for index in range(q_length // 2):
            row = np.zeros(variable_count)
            row[index] = 1.0
            row[q_length - 1 - index] = -1.0
            equality_rows.append(row)
            equality_rhs.append(0.0)
    equality = np.vstack(equality_rows)

    best = None
    convolution_length = len(p_values) + q_length - 1
    subset_rows = []
    if subset_bound_order is not None:
        if subset_bound_order < q_length - 1:
            raise ValueError(
                "subset_bound_order must be at least q_length - 1"
            )
        # A graph on n vertices has at most C(n,i) independent i-sets.
        # Since q[0] is the common scaling of the coefficient sequence,
        # enforce q[i] <= C(n,i) q[0].  Divide by the binomial coefficient
        # to keep the LP rows numerically moderate.
        for index in range(2, q_length):
            row = np.zeros(variable_count)
            row[index] = 1.0 / math.comb(subset_bound_order, index)
            row[0] = -1.0
            subset_rows.append(row)
        # Every simplicial complex on n vertices, hence every independence
        # complex, satisfies
        #   (i+1) f_{i+1} <= (n-i) f_i.
        # Count incidences between its independent i-sets and (i+1)-sets.
        for index in range(q_length - 1):
            row = np.zeros(variable_count)
            row[index + 1] = index + 1
            row[index] = -(subset_bound_order - index)
            subset_rows.append(row)
    if forest_order is not None:
        if subset_bound_order not in (None, forest_order):
            raise ValueError(
                "forest_order and subset_bound_order must agree"
            )
        if forest_order < q_length - 1:
            raise ValueError("forest_order must be at least q_length - 1")
        forest_alpha = q_length - 1
        if forest_order > 2 * forest_alpha:
            raise ValueError(
                "a forest of order n has alpha at least ceil(n/2)"
            )
        # By König's theorem a forest with independence number alpha has a
        # matching of size n-alpha.  Deleting every other edge produces that
        # matching plus 2*alpha-n isolates, and edge deletion can only add
        # independent sets.  Hence, coefficientwise,
        #
        #   I_F(x) <= (1+2x)^(n-alpha) (1+x)^(2alpha-n).
        #
        # This is much sharper than the generic C(n,k) bound when alpha is
        # fixed, and couples the low ranks to the declared degree.
        matching_size = forest_order - forest_alpha
        isolate_count = 2 * forest_alpha - forest_order
        matching_upper = [1]
        for _ in range(matching_size):
            updated = [0] * (len(matching_upper) + 1)
            for index, value in enumerate(matching_upper):
                updated[index] += value
                updated[index + 1] += 2 * value
            matching_upper = updated
        for _ in range(isolate_count):
            updated = [0] * (len(matching_upper) + 1)
            for index, value in enumerate(matching_upper):
                updated[index] += value
                updated[index + 1] += value
            matching_upper = updated
        assert len(matching_upper) == q_length
        for index in range(2, q_length):
            row = np.zeros(variable_count)
            row[index] = 1.0 / matching_upper[index]
            row[0] = -1.0
            subset_rows.append(row)
        # A forest has at most n-1 edges.  A union bound over the edges gives
        # the rigorous coefficient lower bound
        #   i_k >= C(n,k) - (n-1) C(n-2,k-2).
        # It is exact at k=2 for a tree and remains useful at the low ranks
        # where a generic down-set LP otherwise admits impossibly flat
        # sequences.
        for index in range(2, q_length):
            lower = math.comb(forest_order, index) - (
                (forest_order - 1)
                * math.comb(forest_order - 2, index - 2)
            )
            if lower > 0:
                row = np.zeros(variable_count)
                row[0] = 1.0
                row[index] = -1.0 / lower
                subset_rows.append(row)
        # Every forest has alpha >= ceil(n/2), so these ranks must be
        # nonempty.  With integer graph coefficients, i_k >= i_0 = 1.
        forced_degree = (forest_order + 1) // 2
        for index in range(1, min(q_length, forced_degree + 1)):
            row = np.zeros(variable_count)
            row[0] = 1.0
            row[index] = -1.0
            subset_rows.append(row)
        if q_length >= 4:
            # Exact low-rank forest identities add a coupling that separate
            # coefficient bounds miss.  If e is the number of edges, then
            #
            #   i_2 = C(n,2)-e,
            #   i_3 = C(n,3)-e(n-2)+sum_v C(deg(v),2).
            #
            # Convexity of the degree counts gives
            # sum_v C(deg(v),2) >= max(0, 2e-n).  Substituting
            # e=C(n,2)-i_2 yields the following two linear lower bounds.
            n = forest_order
            choose2 = math.comb(n, 2)
            choose3 = math.comb(n, 3)

            first = np.zeros(variable_count)
            first[0] = choose3 - (n - 2) * choose2
            first[2] = n - 2
            first[3] = -1.0
            subset_rows.append(first)

            second = np.zeros(variable_count)
            second[0] = choose3 - (n - 4) * choose2 - n
            second[2] = n - 4
            second[3] = -1.0
            subset_rows.append(second)
    for mode in range(q_length):
        shape_rows = list(subset_rows)
        for index in range(mode):
            row = np.zeros(variable_count)
            row[index] = 1.0
            row[index + 1] = -1.0
            shape_rows.append(row)
        for index in range(mode, q_length - 1):
            row = np.zeros(variable_count)
            row[index + 1] = 1.0
            row[index] = -1.0
            shape_rows.append(row)

        for valley in range(1, convolution_length - 1):
            left = coefficient_row(p, q_length, valley - 1)
            middle = coefficient_row(p, q_length, valley)
            right = coefficient_row(p, q_length, valley + 1)

            # epsilon <= c[left] - c[middle]
            first = np.zeros(variable_count)
            first[:q_length] = middle - left
            first[-1] = 1.0
            # epsilon <= c[right] - c[middle]
            second = np.zeros(variable_count)
            second[:q_length] = middle - right
            second[-1] = 1.0
            inequalities = np.vstack(shape_rows + [first, second])
            rhs = np.zeros(len(inequalities))
            result = linprog(
                objective,
                A_ub=inequalities,
                b_ub=rhs,
                A_eq=equality,
                b_eq=np.asarray(equality_rhs),
                bounds=bounds,
                method="highs",
            )
            if not result.success:
                continue
            epsilon = result.x[-1]
            if best is None or epsilon > best["epsilon"]:
                best = {
                    "mode": mode,
                    "valley": valley,
                    "epsilon": float(epsilon),
                    "q_float": result.x[:q_length].tolist(),
                }
    return best


def rationalize(values: list[float], max_denominator: int) -> list[int]:
    fractions = [
        Fraction(float(value)).limit_denominator(max_denominator)
        for value in values
    ]
    denominator = 1
    for value in fractions:
        denominator = math.lcm(denominator, value.denominator)
    integers = [
        int(value.numerator * (denominator // value.denominator))
        for value in fractions
    ]
    common = 0
    for value in integers:
        common = math.gcd(common, value)
    if common > 1:
        integers = [value // common for value in integers]
    return integers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--q-length", type=int, default=24)
    parser.add_argument(
        "--initial-ratio",
        type=int,
        default=0,
        help=(
            "If positive, require q[1]/q[0] to equal this integer, "
            "as an independence polynomial would have q[1]/q[0]=|V|."
        ),
    )
    parser.add_argument(
        "--minimum-entry",
        type=float,
        default=0.0,
        help="Lower bound on every normalized q coefficient.",
    )
    parser.add_argument(
        "--subset-bound-order",
        type=int,
        default=0,
        help=(
            "If positive, impose q[i]/q[0] <= binom(n,i), the universal "
            "coefficient bound for a graph on n vertices."
        ),
    )
    parser.add_argument(
        "--forest-order",
        type=int,
        default=0,
        help=(
            "If positive, impose additional coefficient lower bounds valid "
            "for every forest of this order."
        ),
    )
    parser.add_argument(
        "--symmetric",
        action="store_true",
        help="Require q[i]=q[d-i].",
    )
    parser.add_argument("--max-denominator", type=int, default=1_000_000)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("strong_unimodality_lp_witness.json"),
    )
    args = parser.parse_args()
    p = [int(value) for value in EXPECTED]
    best = solve(
        p,
        args.q_length,
        args.initial_ratio if args.initial_ratio > 0 else None,
        args.minimum_entry,
        (
            args.subset_bound_order
            if args.subset_bound_order > 0
            else None
        ),
        args.forest_order if args.forest_order > 0 else None,
        args.symmetric,
    )
    if best is None or best["epsilon"] <= 1e-10:
        payload = {
            "status": "no_lp_witness",
            "q_length": args.q_length,
            "initial_ratio": args.initial_ratio,
            "minimum_entry": args.minimum_entry,
            "subset_bound_order": args.subset_bound_order,
            "forest_order": args.forest_order,
            "symmetric": args.symmetric,
            "best": best,
        }
        args.output.write_text(
            json.dumps(payload, indent=2), encoding="utf-8"
        )
        print(json.dumps(payload, indent=2))
        return 0

    q = rationalize(best["q_float"], args.max_denominator)
    product = convolution(p, q)
    valley = best["valley"]
    exact_witness = (
        0 < valley < len(product) - 1
        and product[valley - 1] > product[valley]
        and product[valley + 1] > product[valley]
    )
    q_unimodal = is_unimodal(q)
    payload = {
        "status": (
            "exact_witness"
            if exact_witness and q_unimodal
            else "lp_only"
        ),
        "q_length": args.q_length,
        "initial_ratio": args.initial_ratio,
        "minimum_entry": args.minimum_entry,
        "subset_bound_order": args.subset_bound_order,
        "forest_order": args.forest_order,
        "symmetric": args.symmetric,
        "lp": best,
        "q_integer": q,
        "q_unimodal": q_unimodal,
        "product_unimodal": is_unimodal(product),
        "exact_valley": {
            "rank": valley,
            "left": product[valley - 1],
            "middle": product[valley],
            "right": product[valley + 1],
            "left_gap": product[valley - 1] - product[valley],
            "right_gap": product[valley + 1] - product[valley],
        },
    }
    args.output.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload, indent=2))
    return 0 if payload["status"] == "exact_witness" else 1


if __name__ == "__main__":
    raise SystemExit(main())
