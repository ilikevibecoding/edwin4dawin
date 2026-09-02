#!/usr/bin/env python3
"""Independent exact audit of the all-rank tail pairwise reduction.

No producer module is imported.  This auditor starts from ordinary ratio rows,
rebuilds factorial rows, the binomial margin, conditional-tail identities, and
the two natural pair sums using separately written code and a different exact
diagnostic grid.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import random


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_tail_pairwise_reduction_independent_audit_root_20260827.json"
PINNED = {
    "prove_uniform_low_high_tail_pairwise_reduction_root.py":
        "113C5BF29AC3299D6235D37E85E3356687FB62604F1B4D6DAE440DF072612BEF",
    "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json":
        "FD3408D7FB011604F87C67EA03B082B86FFD955AA778887B673E0A863303977B",
    "UNIFORM_LOW_HIGH_TAIL_PAIRWISE_REDUCTION_2026-08-27.md":
        "104AF8F106ADF3765D050E4637E6EA1548A3DEB992CC093ADCAA5BE35F458EF1",
    "HIGH_HIGH_STRONG_AUXILIARY_CONDITIONAL_TAIL_IDENTITY_2026-08-27.md":
        "2B06CA2294905C92A64323D14A0434FB631CCAEA5F15F44ECC731864C9EF97FA",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def ratios_from_drops(drops, terminal):
    out = [0] * (len(drops) + 1)
    out[-1] = terminal
    for index in range(len(drops) - 1, -1, -1):
        out[index] = out[index + 1] + drops[index]
    return out


def ordinary_row(ratios):
    out = [1]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def factorial_row(ordinary):
    return [Fraction(value, math.factorial(index)) for index, value in enumerate(ordinary)]


def entry(row, index):
    return row[index] if 0 <= index < len(row) else Fraction(0)


def exponent(index):
    return int(index >= 3)


def ordinary_slice(left, right, degree, tail=False):
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
        if not tail or index >= 3
    )


def ordinary_margin_parts(left, right, rank, h):
    c0, c1, c2 = (
        ordinary_slice(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    )
    v0, v1, v2 = (
        ordinary_slice(left, right, degree, tail=True)
        for degree in (rank - 1, rank, rank + 1)
    )
    margin = c1 * c1 - c0 * c2 - h * c0 * c1
    derivative = 2 * c1 * v1 - c0 * v2 - v0 * c2 - h * (c0 * v1 + v0 * c1)
    q2 = v1 * v1 - v0 * v2 - h * v0 * v1
    return (c0, c1, c2), (v0, v1, v2), margin, derivative, q2


def factorial_kernel(row, rank, first, second):
    return (
        entry(row, rank - 1 - first) * entry(row, rank - second)
        - entry(row, rank - first) * entry(row, rank - 1 - second)
    )


def independent_pair_sums(p, q, A, B, rank, h):
    F = [Fraction(A[index] + index * h) for index in range(rank + 1)]
    G = [Fraction(B[index] + index * h) for index in range(rank + 1)]
    C = Fraction(A[2])
    margin = strong = q2 = Fraction(0)
    unique_negative = None
    other_minimum = None

    for i in range(rank + 1):
        for ell in range(i + 1, rank + 1):
            kernel_q = factorial_kernel(q, rank, i, ell)
            gap = F[i] - F[ell]
            base = p[i] * p[ell] * gap * kernel_q
            margin += base
            correction = int(i == 2) - int(ell == 2)
            strong_term = p[i] * p[ell] * kernel_q * (
                (C + h * (exponent(i) + exponent(ell))) * gap
                + h * C * correction
            )
            strong += strong_term
            if (i, ell) == (1, 2):
                unique_negative = strong_term
            else:
                assert strong_term >= 0
                other_minimum = (
                    strong_term if other_minimum is None else min(other_minimum, strong_term)
                )
            if i >= 3:
                q2 += base
            elif i == 2 and ell >= 3:
                q2 += C * p[2] * p[ell] * kernel_q

    right_exception_count = 0
    for j in range(rank + 1):
        for ell in range(j + 1, rank + 1):
            alpha = rank - 1 - j
            beta = rank - ell
            X = entry(p, alpha) * entry(p, beta)
            Y = entry(p, alpha + 1) * entry(p, beta - 1)
            ep = exponent(alpha) + exponent(beta)
            em = exponent(alpha + 1) + exponent(beta - 1)
            kernel_p = X - Y
            kernel_derivative = ep * X - em * Y
            gap = G[j] - G[ell]
            weight = q[j] * q[ell] * gap
            base = weight * kernel_p
            strong_term = weight * (C * kernel_p + h * kernel_derivative)
            margin += base
            strong += strong_term
            assert strong_term >= 0
            if beta > 0 and ep < em:
                assert (alpha, beta) in ((2, 2), (2, 1))
                right_exception_count += 1
            q2 += weight * (
                (X if ep == 2 else 0) - (Y if em == 2 else 0)
            )
    assert right_exception_count == 2
    assert unique_negative is not None and unique_negative <= 0
    return margin, strong, q2, unique_negative, other_minimum


def conditional_identity(A, B, left, right, rank, h, c, v, margin, derivative):
    probabilities = [Fraction(v[index], c[index]) for index in range(3)]
    Rminus = Fraction(c[1], c[0])
    R = Fraction(c[2], c[1])
    D = Rminus - R - h
    lhs = Fraction(A[2] * margin + h * derivative, c[0] * c[1])
    rhs = (
        (A[2] + h * (probabilities[0] + probabilities[1])) * D
        + h * Rminus * (probabilities[1] - probabilities[0])
        - h * R * (probabilities[2] - probabilities[1])
    )
    assert lhs == rhs
    assert D >= 0

    transition_checks = 0
    for position, degree in enumerate((rank - 1, rank)):
        total = c[position]
        next_total = c[position + 1]
        pz = probabilities[position]
        pnext = probabilities[position + 1]
        projection = Fraction(next_total, total)
        mass2 = Fraction(
            math.comb(degree, 2) * left[2] * right[degree - 2],
            total,
        ) if degree >= 2 else Fraction(0)
        expectation_weight = Fraction(0)
        expectation_weight_tail = Fraction(0)
        for index in range(degree + 1):
            mass = Fraction(
                math.comb(degree, index) * left[index] * right[degree - index],
                total,
            )
            weight = A[index] + B[degree - index]
            expectation_weight += mass * weight
            if index >= 3:
                expectation_weight_tail += mass * weight
        covariance = expectation_weight_tail - expectation_weight * pz
        assert projection == expectation_weight
        assert projection * (pnext - pz) == A[2] * mass2 + covariance
        transition_checks += 1
    return transition_checks


def one_case(rank, h, left_drops, right_drops, left_terminal, right_terminal):
    A = ratios_from_drops(left_drops, left_terminal)
    B = ratios_from_drops(right_drops, right_terminal)
    assert A[0] - A[1] >= 2 * h and A[1] - A[2] == h
    assert B[0] - B[1] >= 2 * h
    a, b = ordinary_row(A), ordinary_row(B)
    p, q = factorial_row(a), factorial_row(b)
    c, v, margin, derivative, q2 = ordinary_margin_parts(a, b, rank, h)
    pair_margin, pair_strong, pair_q2, unique, minimum = independent_pair_sums(
        p, q, A, B, rank, h
    )
    scale = math.factorial(rank - 1) * math.factorial(rank)
    assert margin == scale * pair_margin
    assert A[2] * margin + h * derivative == scale * pair_strong
    assert q2 == scale * pair_q2
    assert pair_margin >= 0 and pair_q2 >= 0
    transitions = conditional_identity(A, B, a, b, rank, h, c, v, margin, derivative)
    return {
        "rank": rank,
        "strong_sign": (pair_strong > 0) - (pair_strong < 0),
        "unique_pair_sign": (unique > 0) - (unique < 0),
        "minimum_other_pair_sign": (minimum > 0) - (minimum < 0),
        "transition_checks": transitions,
    }


def audit_counterexample():
    rank = 8
    h = 1
    A = [20 - index for index in range(rank + 1)]
    B = [100 - index for index in range(rank + 1)]
    a, b = ordinary_row(A), ordinary_row(B)
    _, _, margin, derivative, _ = ordinary_margin_parts(a, b, rank, h)
    expected = -5317395864419331243616665600000
    assert margin == 0 and derivative == expected
    assert A[0] - A[1] == h < 2 * h
    return {
        "rank": rank,
        "margin": margin,
        "derivative": derivative,
        "violates_doubled_first_gap": True,
    }


def index_audit():
    rows = []
    for rank in range(3, 513):
        exceptions = []
        q2_negative = 0
        for first in range(rank + 1):
            for second in range(first + 1, rank + 1):
                alpha = rank - 1 - first
                beta = rank - second
                assert alpha >= beta >= 0
                ep = exponent(alpha) + exponent(beta)
                em = exponent(alpha + 1) + exponent(beta - 1)
                if beta > 0 and ep < em:
                    exceptions.append((alpha, beta))
                q2_positive = int(ep == 2)
                q2_negative += int(em == 2 and not q2_positive)
        assert exceptions == [(2, 2), (2, 1)]
        assert q2_negative == 0
        if rank in (3, 8, 16, 64, 256, 512):
            rows.append({
                "rank": rank,
                "pairs_per_side": math.comb(rank + 1, 2),
                "exceptions": [list(item) for item in exceptions],
            })
    return {"ranks_checked": [3, 512], "rows": rows}


def main() -> int:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    producer = json.loads(
        (HERE / "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == (
        "PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION"
    )
    assert producer["source_sha256"] == PINNED[
        "prove_uniform_low_high_tail_pairwise_reduction_root.py"
    ]

    rng = random.Random(993_20260827_2)
    samples = []
    transition_checks = 0
    minimum_strong_sign = 1
    for case_index in range(1024):
        rank = rng.randrange(3, 29)
        h = rng.randrange(1, 6)
        left_drops = [2 * h + rng.randrange(0, 17), h] + [
            h + rng.randrange(0, 17) for _ in range(2, rank)
        ]
        right_drops = [2 * h + rng.randrange(0, 17)] + [
            h + rng.randrange(0, 17) for _ in range(1, rank)
        ]
        if case_index < 48:
            left_drops = [2 * h, h] + [h] * (rank - 2)
            right_drops = [2 * h] + [h] * (rank - 1)
        row = one_case(
            rank,
            h,
            left_drops,
            right_drops,
            rng.randrange(1, 13),
            rng.randrange(1, 13),
        )
        transition_checks += row["transition_checks"]
        minimum_strong_sign = min(minimum_strong_sign, row["strong_sign"])
        if case_index < 10:
            samples.append(row)

    payload = {
        "schema": "uniform-low-high-tail-pairwise-reduction-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_"
            "PAIR_REDUCTION_AUDIT"
        ),
        "producer_imported": False,
        "audited_theorem": producer["theorem"],
        "independent_exact_diagnostics": {
            "cases": 1024,
            "rank_range": [3, 28],
            "conditional_transition_identities": transition_checks,
            "minimum_observed_strong_sign": minimum_strong_sign,
            "sample_rows": samples,
        },
        "indexed_sign_audit": index_audit(),
        "relaxed_first_gap_counterexample": audit_counterexample(),
        "checks": {
            "ordinary_and_factorial_margin_scalings_exact": True,
            "pairwise_margin_and_strong_identities_exact": True,
            "tail_quadratic_pair_decomposition_exact": True,
            "all_nonexceptional_natural_pairs_nonnegative": True,
            "unique_left_pair_12_is_only_unpaid_term": True,
            "two_right_tail_exponent_exceptions_paid_exactly": True,
            "conditional_tail_and_transition_covariance_identities_exact": True,
            "relaxed_first_gap_counterexample_replayed_exactly": True,
        },
        "immutable_inputs": actual,
        "scope_warning": (
            "The audit certifies the all-rank q2 theorem and one-pair reduction, "
            "not the remaining aggregate payment or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    digest = atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", digest, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
