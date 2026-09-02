#!/usr/bin/env python3
"""All-rank low/low factorial-convolution cone by two matched payments.

For each low factor, the adjusted ratio row has one adverse natural pair,
(1,2).  The selected same-side pairs (0,1), (0,3), (2,3), together with the
opposite remote pair (k-3,k-2), pay that adverse term.  After rebasing the
tail capacity, the normalized selected payment coefficientwise dominates the
independently audited local inequality from the low/high strong theorem.
The two symmetric payment sets are disjoint for k>=8.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path
import random

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_low_matched_pair_convolution_exact_root_20260828.json"

PINNED = {
    "prove_uniform_low_high_tail_pairwise_reduction_root.py":
        "113C5BF29AC3299D6235D37E85E3356687FB62604F1B4D6DAE440DF072612BEF",
    "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json":
        "FD3408D7FB011604F87C67EA03B082B86FFD955AA778887B673E0A863303977B",
    "audit_uniform_low_high_tail_pairwise_reduction_independent_root.py":
        "61D2D86132AD33FBCEE450430359F52B996A47591EC67F55E03D0C8E0D8FFD17",
    "uniform_low_high_tail_pairwise_reduction_independent_audit_root_20260827.json":
        "0C58E55E8CBB350E436BC253E8C26FDF8C68FF7353C57A69878ACD32F25CE65E",
    "prove_uniform_low_high_matched_local_pair_payment_root.py":
        "811166967CB5479619F766B638FEA94077E0A2A4E75211AFCF8E8CABE77FB07B",
    "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json":
        "20278F5C3881A8066ECFAC21A87C3DAE9FBD662986EE074241F8EDE249DC3077",
    "UNIFORM_LOW_HIGH_MATCHED_LOCAL_PAIR_PAYMENT_2026-08-28.md":
        "645FEF475ED1F067C64A9C8BC9BD97E1379017B32D92D51216794A3222270356",
    "audit_uniform_low_high_matched_local_pair_payment_independent_agent.py":
        "C674306224042E4FCEE496FC11D7BE58D3658DC50C4243A73391E0FDD8C4E8D5",
    "uniform_low_high_matched_local_pair_payment_independent_audit_20260828.json":
        "93C8C614796B4D3B96810CC23E7412783390658B1CC90B3A7AC7DE89C1293E42",
}

EXPECTED_STATUSES = {
    "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json":
        "PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION",
    "uniform_low_high_tail_pairwise_reduction_independent_audit_root_20260827.json":
        "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION_AUDIT",
    "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json":
        "PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT",
    "uniform_low_high_matched_local_pair_payment_independent_audit_20260828.json":
        "PASS_INDEPENDENT_EXACT_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT_AUDIT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def value(row: list[Fraction], index: int) -> Fraction:
    return row[index] if 0 <= index < len(row) else Fraction(0)


def factorial_row(ratios: list[int]) -> list[Fraction]:
    row = [Fraction(1)]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * Fraction(ratio, index + 1))
    return row


def ordinary_row(ratios: list[int]) -> list[int]:
    row = [1]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def kernel(row: list[Fraction], rank: int, first: int, second: int) -> Fraction:
    return (
        value(row, rank - 1 - first) * value(row, rank - second)
        - value(row, rank - first) * value(row, rank - 1 - second)
    )


def pair_terms(
    left: list[Fraction],
    right: list[Fraction],
    left_ratios: list[int],
    right_ratios: list[int],
    rank: int,
    h: int,
) -> tuple[dict[tuple[int, int], Fraction], dict[tuple[int, int], Fraction]]:
    adjusted_left = [Fraction(left_ratios[i] + i * h) for i in range(rank + 1)]
    adjusted_right = [Fraction(right_ratios[i] + i * h) for i in range(rank + 1)]
    left_terms = {}
    right_terms = {}
    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            left_terms[(first, second)] = (
                left[first] * left[second]
                * (adjusted_left[first] - adjusted_left[second])
                * kernel(right, rank, first, second)
            )
            right_terms[(first, second)] = (
                right[first] * right[second]
                * (adjusted_right[first] - adjusted_right[second])
                * kernel(left, rank, first, second)
            )
    return left_terms, right_terms


def slice_sum(left: list[Fraction], right: list[Fraction], degree: int) -> Fraction:
    return sum(
        value(left, index) * value(right, degree - index)
        for index in range(degree + 1)
    )


def binomial_convolution(left: list[int], right: list[int], degree: int) -> int:
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def dependency_audit() -> dict:
    statuses = {}
    for name, expected_hash in PINNED.items():
        path = HERE / name
        assert path.is_file(), name
        assert sha256(path) == expected_hash, name
        if name in EXPECTED_STATUSES:
            report = json.loads(path.read_text(encoding="utf-8"))
            assert report["status"] == EXPECTED_STATUSES[name], name
            statuses[name] = report["status"]
    matched = json.loads(
        (HERE / "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json")
        .read_text(encoding="utf-8")
    )
    certificate = matched["symbolic_certificate"]
    assert certificate["central_slack_degree"] == 3
    assert [row["monomial_count"] for row in certificate["positive_central_slack_coefficients"]] == [90, 55, 29]
    assert certificate["case_floors"]["x_ge_4_total_floor"] == "19/18"
    return {
        "hashes": PINNED,
        "statuses": statuses,
        "matched_local_lemma_rechecked": {
            "rank_floor": 8,
            "central_slack_degree": 3,
            "strictly_positive_coefficient_counts": [90, 55, 29],
            "zero_slack_case_floor": "19/18",
        },
    }


def symbolic_dominance() -> dict:
    C, tau, s0, s2, d = sp.symbols(
        "C tau s0 s2 d", positive=True
    )
    A0 = C + 3 + s0
    alpha = sp.Rational(2) / ((C + 1) * (C + 3))
    eta = (C + 1) / (3 * (C + 3))
    beta = C * (C + 1) / 6
    gamma = (C + 1) / 6

    actual_01 = 2 * (1 + s0) / (tau * A0 * (C + 1))
    actual_03 = (C + tau) * (1 + s0 + s2) / (3 * tau * A0)
    actual_23 = (C + 1) * (C + tau) * (tau + s2) / (6 * tau)
    actual_remote = d * (C + 3 - 2 * tau) / (6 * tau)
    differences = {
        "pair_01": sp.factor(actual_01 - alpha),
        "pair_03": sp.factor(actual_03 - eta),
        "pair_23": sp.factor(actual_23 - beta),
        "remote_pair": sp.factor(actual_remote - gamma * d),
    }

    # Clear the known-positive denominators and express each difference in the
    # nonnegative generators C, s0, s2, 1-tau, tau.
    cleared = {
        "pair_01": sp.factor(
            differences["pair_01"]
            * tau * (C + 1) * (C + 3) * (C + 3 + s0) / 2
        ),
        "pair_03": sp.factor(
            differences["pair_03"]
            * 3 * tau * (C + 3) * (C + 3 + s0)
        ),
        "pair_23": sp.factor(differences["pair_23"] * 6 * tau / (C + 1)),
        "remote_pair": sp.factor(differences["remote_pair"] * 6 * tau),
    }
    expected = {
        "pair_01": (1 - tau) * (C + 3) + s0 * (C + 3 - tau),
        "pair_03": (
            C * (1 - tau) * (C + 3)
            + s0 * ((C + tau) * (C + 3) - tau * (C + 1))
            + s2 * (C + tau) * (C + 3)
        ),
        "pair_23": tau**2 + (C + tau) * s2,
        "remote_pair": d * (1 - tau) * (C + 3),
    }
    for key in cleared:
        assert sp.expand(cleared[key] - expected[key]) == 0, key

    return {
        "rebase": {
            "tau": "h-(A1-A2), with 0<=tau<=h",
            "capacity": "C=A2-tau",
            "normalized_h": 1,
            "base_ratios": "A1=C+1, A0>=C+3, A2=C+tau, A3<=C-1",
            "capacity_floor": "C>=k-2 from positivity and the remaining gaps",
        },
        "matched_coefficients": {
            "alpha": str(alpha),
            "eta": str(eta),
            "beta": str(beta),
            "gamma": str(gamma),
        },
        "actual_divided_by_tau": {
            "pair_01": str(actual_01),
            "pair_03": str(actual_03),
            "pair_23": str(actual_23),
            "remote_pair": str(actual_remote),
        },
        "cleared_nonnegative_differences": {
            key: str(value_) for key, value_ in expected.items()
        },
        "all_symbolic_remainders": "0",
    }


def sampled_slack(rng: random.Random) -> int:
    selector = rng.randrange(12)
    if selector < 5:
        return 0
    if selector < 8:
        return rng.randrange(1, 8)
    if selector < 10:
        return rng.randrange(8, 256)
    return rng.randrange(256, 10001)


def low_gaps(rng: random.Random, rank: int, h: int) -> tuple[list[int], int]:
    tau = rng.randrange(h + 1)
    gap1 = h - tau
    gaps = [2 * h + sampled_slack(rng), gap1, h + tau + sampled_slack(rng)]
    gaps.extend(h + sampled_slack(rng) for _ in range(3, rank))
    return gaps, tau


def exact_replays(cases: int = 512) -> dict:
    rng = random.Random(993_20260828_2)
    failures = []
    minimum_margin = None
    minimum_left_surplus = None
    minimum_right_surplus = None
    rank_counts = {rank: 0 for rank in range(8, 33)}
    samples = []
    for case_index in range(cases):
        rank = 8 + case_index % 25
        h = 1 + rng.randrange(5)
        left_gaps, left_tau = low_gaps(rng, rank, h)
        right_gaps, right_tau = low_gaps(rng, rank, h)
        left_ratios = ratios_from_gaps(left_gaps, 1 + sampled_slack(rng))
        right_ratios = ratios_from_gaps(right_gaps, 1 + sampled_slack(rng))
        left_factorial = factorial_row(left_ratios)
        right_factorial = factorial_row(right_ratios)
        left_terms, right_terms = pair_terms(
            left_factorial,
            right_factorial,
            left_ratios,
            right_ratios,
            rank,
            h,
        )
        negative_left = [key for key, item in left_terms.items() if item < 0]
        negative_right = [key for key, item in right_terms.items() if item < 0]
        expected_left = [(1, 2)] if left_tau else []
        expected_right = [(1, 2)] if right_tau else []
        assert negative_left == expected_left
        assert negative_right == expected_right

        s_minus = slice_sum(left_factorial, right_factorial, rank - 1)
        s_rank = slice_sum(left_factorial, right_factorial, rank)
        s_plus = slice_sum(left_factorial, right_factorial, rank + 1)
        direct_factorial = (
            rank * s_rank * s_rank
            - (rank + 1) * s_minus * s_plus
            - h * s_minus * s_rank
        )
        pair_total = sum(left_terms.values()) + sum(right_terms.values())
        assert direct_factorial == pair_total

        local = [(0, 1), (0, 3), (2, 3)]
        remote = (rank - 3, rank - 2)
        assert remote not in local and remote != (1, 2)
        left_surplus = (
            sum(left_terms[key] for key in local)
            + right_terms[remote]
            + left_terms[(1, 2)]
        )
        right_surplus = (
            sum(right_terms[key] for key in local)
            + left_terms[remote]
            + right_terms[(1, 2)]
        )
        assert left_surplus >= 0
        assert right_surplus >= 0

        left_ordinary = ordinary_row(left_ratios)
        right_ordinary = ordinary_row(right_ratios)
        c_previous = binomial_convolution(left_ordinary, right_ordinary, rank - 1)
        c_rank = binomial_convolution(left_ordinary, right_ordinary, rank)
        c_next = binomial_convolution(left_ordinary, right_ordinary, rank + 1)
        ordinary_margin = c_rank * c_rank - c_previous * c_next - h * c_previous * c_rank
        scale = math.factorial(rank - 1) * math.factorial(rank)
        assert Fraction(ordinary_margin, scale) == direct_factorial
        assert ordinary_margin >= 0

        minimum_margin = ordinary_margin if minimum_margin is None else min(minimum_margin, ordinary_margin)
        minimum_left_surplus = left_surplus if minimum_left_surplus is None else min(minimum_left_surplus, left_surplus)
        minimum_right_surplus = right_surplus if minimum_right_surplus is None else min(minimum_right_surplus, right_surplus)
        rank_counts[rank] += 1
        if len(samples) < 8:
            samples.append({
                "rank": rank,
                "h": h,
                "left_tau": left_tau,
                "right_tau": right_tau,
                "left_surplus": str(left_surplus),
                "right_surplus": str(right_surplus),
                "ordinary_margin": str(ordinary_margin),
            })
    return {
        "cases": cases,
        "rank_range": [8, 32],
        "rank_counts": rank_counts,
        "failures": failures,
        "minimum_ordinary_margin": str(minimum_margin),
        "minimum_left_selected_surplus": str(minimum_left_surplus),
        "minimum_right_selected_surplus": str(minimum_right_surplus),
        "sample": samples,
    }


def main() -> int:
    dependencies = dependency_audit()
    dominance = symbolic_dominance()
    replays = exact_replays()
    assert not replays["failures"]
    payload = {
        "schema": "uniform-low-low-matched-pair-convolution-root-v1",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_LOW_LOW_CONVOLUTION_CONE",
        "theorem": (
            "For every integer k>=8 and h>=0, let two positive rows have "
            "ratio gaps delta0>=2h, 0<=delta1<=h, delta1+delta2>=2h, "
            "and delta_i>=h for 3<=i<k. Their binomial convolution c obeys "
            "c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k>=0."
        ),
        "proof_chain": [
            "Factorial scaling gives the exact two-sided pair identity for the margin.",
            "Each low adjusted-ratio row has exactly one adverse pair, (1,2); all kernels are nonnegative because the underlying factorial rows are log-concave.",
            "For the left adverse pair set tau=h-(A1-A2) and rebase C=A2-tau. Positivity and the tail gaps give C/h>=k-2.",
            "After normalizing h=1 and dividing by tau, the selected pairs left (0,1),(0,3),(2,3) and right (k-3,k-2) coefficientwise dominate the four coefficients in the independently audited matched-local payment lemma.",
            "The symmetric selected set pays the right adverse pair. For k>=8 the two selected sets are disjoint, and every unused natural pair term is nonnegative.",
            "Therefore the complete pair sum, and hence the original binomial-convolution margin, is nonnegative. The tau=0 endpoints have no adverse term and follow directly.",
        ],
        "pair_partition": {
            "left_adverse": [1, 2],
            "left_payments": [[0, 1], [0, 3], [2, 3]],
            "left_matched_right_payment": ["k-3", "k-2"],
            "right_adverse": [1, 2],
            "right_payments": [[0, 1], [0, 3], [2, 3]],
            "right_matched_left_payment": ["k-3", "k-2"],
            "disjoint_for": "k>=8",
            "unselected_terms": "nonnegative",
        },
        "symbolic_dominance": dominance,
        "dependency_audit": dependencies,
        "exact_replays": replays,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the abstract all-rank low/low full-factor convolution "
            "cone. Connected Q_k, exceptional-component forest lifts, the "
            "pendant cascade, and Erdos Problem 993 remain separate."
        ),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", report_hash, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
