#!/usr/bin/env python3
"""Exact falsification tests for a Toeplitz-minor closure lemma.

For P=(p_k), put

    M_P(m,n) = p_m p_n - p_{m+1} p_{n-1}.

A rooted independence state has a total polynomial A and an occupied-root
part D=xJ, with A-D=E coefficientwise nonnegative.  The live HIT invariant
is

    M_A(m,n) >= M_D(m,n)                         (m >= n).

If a new root has r leaf children and the old state as its remaining child,
then K=(1+x)^r and

    A' = K A + x(A-D),     D' = x(A-D).

This program searches for an abstract counterexample to the proposed closure

    (A,D satisfy the invariant) => (A',D' satisfy the invariant), r >= 2.

It also independently verifies:

* the telescoping/cancellation decomposition of every 2x2 upper-Toeplitz
  minor into adjacent M_P terms with ordered indices; and
* preservation of the invariant when both A and D are convolved by the same
  log-concave kernel.

All arithmetic is exact Python integer arithmetic.  This is a falsifier, not
a proof.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from math import comb
from pathlib import Path


def trim(p: list[int]) -> list[int]:
    while len(p) > 1 and p[-1] == 0:
        p.pop()
    return p


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return trim(out)


def sub(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] -= value
    return trim(out)


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return trim(out)


def shift(a: list[int]) -> list[int]:
    return [0] + a


def minor(p: list[int], m: int, n: int) -> int:
    return coeff(p, m) * coeff(p, n) - coeff(p, m + 1) * coeff(p, n - 1)


def mixed_minor(p: list[int], q: list[int], m: int, n: int) -> int:
    """Polarization M_{p+q}-M_p-M_q."""
    return (
        coeff(p, m) * coeff(q, n)
        + coeff(q, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(q, n - 1)
        - coeff(q, m + 1) * coeff(p, n - 1)
    )


def generalized_minor(p: list[int], m: int, n: int, delta: int) -> int:
    """p_m p_n-p_{m+delta}p_{n-delta}, with zero extension."""
    return coeff(p, m) * coeff(p, n) - coeff(p, m + delta) * coeff(
        p, n - delta
    )


def toeplitz_minor(
    p: list[int], row0: int, row1: int, col0: int, col1: int
) -> int:
    assert row0 < row1 and col0 < col1
    return coeff(p, col0 - row0) * coeff(
        p, col1 - row1
    ) - coeff(p, col1 - row0) * coeff(p, col0 - row1)


def ordered_adjacent_decomposition(
    row0: int, row1: int, col0: int, col1: int
) -> list[tuple[int, int]]:
    """Indices (m,n) whose adjacent minors sum to the Toeplitz minor.

    Put delta=row1-row0 and g=col1-col0.  Direct telescoping begins with
    m=col1-row1 and n=col0-row0.  If delta>g, the first delta-g terms cancel
    in antisymmetric pairs, leaving exactly g ordered adjacent minors.
    """
    delta = row1 - row0
    gap = col1 - col0
    m = col1 - row1
    n = col0 - row0
    first = max(0, delta - gap)
    result = [(m + t, n - t) for t in range(first, delta)]
    assert all(a >= b for a, b in result)
    return result


def invariant_failure(a: list[int], d: list[int]) -> dict | None:
    upper = max(len(a), len(d))
    for m in range(upper + 1):
        for n in range(m + 1):
            reserve = minor(a, m, n) - minor(d, m, n)
            if reserve < 0:
                return {"m": m, "n": n, "reserve": reserve}
    return None


def is_log_concave(p: list[int]) -> bool:
    return all(minor(p, k, k) >= 0 for k in range(len(p) + 1))


def partial_failure(p: list[int], q: list[int]) -> dict | None:
    upper = max(len(p), len(q))
    for m in range(upper + 1):
        for n in range(m + 1):
            value = mixed_minor(p, q, m, n)
            if value < 0:
                return {"m": m, "n": n, "value": value}
    return None


def binomial_kernel(r: int) -> list[int]:
    return [comb(r, k) for k in range(r + 1)]


def cherry_transform(
    a: list[int], d: list[int], r: int
) -> tuple[list[int], list[int]]:
    b = sub(a, d)
    if any(value < 0 for value in b):
        raise ValueError("A-D is not coefficientwise nonnegative")
    occupied = shift(b)
    total = add(mul(binomial_kernel(r), a), occupied)
    return total, occupied


def random_pf_polynomial(rng: random.Random, factors: int) -> list[int]:
    p = [1]
    for _ in range(factors):
        weight = rng.randint(1, 12)
        multiplicity = rng.randint(1, 3)
        for _ in range(multiplicity):
            p = mul(p, [1, weight])
    return p


def random_log_concave_polynomial(
    rng: random.Random, degree: int, first_max: int = 80
) -> list[int]:
    """Generate a positive integer LC sequence with constant coefficient one."""
    if degree <= 0:
        return [1]
    p = [1, rng.randint(1, first_max)]
    for _ in range(1, degree):
        upper = p[-1] * p[-1] // p[-2]
        if upper < 1:
            break
        # Mix values near the curvature boundary with values well below it.
        if rng.random() < 0.5:
            low = max(1, upper - max(1, upper // 8))
            value = rng.randint(low, upper)
        else:
            value = rng.randint(1, upper)
        p.append(value)
    return p


def verify_decomposition(rng: random.Random, trials: int) -> int:
    checks = 0
    for _ in range(trials):
        p = [rng.randint(0, 100) for _ in range(rng.randint(1, 15))]
        row0 = rng.randint(-3, 5)
        row1 = row0 + rng.randint(1, 9)
        col0 = rng.randint(row0 - 3, row0 + 16)
        col1 = col0 + rng.randint(1, 9)
        direct = toeplitz_minor(p, row0, row1, col0, col1)
        pieces = ordered_adjacent_decomposition(row0, row1, col0, col1)
        reconstructed = sum(minor(p, m, n) for m, n in pieces)
        if direct != reconstructed:
            raise AssertionError(
                {
                    "kind": "decomposition_failure",
                    "p": p,
                    "rows": [row0, row1],
                    "columns": [col0, col1],
                    "direct": direct,
                    "pieces": pieces,
                    "reconstructed": reconstructed,
                }
            )
        checks += 1
    return checks


def verify_common_convolution(
    rng: random.Random, accepted_pairs: list[tuple[list[int], list[int]]]
) -> int:
    checks = 0
    for a, d in accepted_pairs:
        for _ in range(3):
            kernel = random_pf_polynomial(rng, rng.randint(0, 5))
            ka = mul(kernel, a)
            kd = mul(kernel, d)
            failure = invariant_failure(ka, kd)
            if failure:
                raise AssertionError(
                    {
                        "kind": "common_convolution_failure",
                        "A": a,
                        "D": d,
                        "kernel": kernel,
                        "KA": ka,
                        "KD": kd,
                        "failure": failure,
                    }
                )
            checks += 1
    return checks


def random_candidate_pair(
    rng: random.Random, family: str
) -> tuple[list[int], list[int], dict]:
    """Build A=E+xJ from independently generated LC E and J."""
    if family == "pf":
        e = random_pf_polynomial(rng, rng.randint(0, 7))
        j = random_pf_polynomial(rng, rng.randint(0, 7))
    elif family == "lc":
        e = random_log_concave_polynomial(rng, rng.randint(0, 12))
        j = random_log_concave_polynomial(rng, rng.randint(0, 12))
    elif family == "raw":
        e = [1] + [
            rng.randint(0, 30) for _ in range(rng.randint(0, 9))
        ]
        j = [1] + [
            rng.randint(0, 30) for _ in range(rng.randint(0, 9))
        ]
        e = trim(e)
        j = trim(j)
    else:
        raise ValueError(f"unknown family {family!r}")
    d = shift(j)
    a = add(e, d)
    return a, d, {"family": family, "E": e, "J": j}


def run(args: argparse.Namespace) -> dict:
    started = time.time()
    rng = random.Random(args.seed)
    decomposition_checks = verify_decomposition(rng, args.decomposition_trials)

    accepted: list[tuple[list[int], list[int]]] = []
    candidate_pairs = 0
    rejected_invariant = 0
    rejected_non_lc_a = 0
    cherry_checks = 0
    first_failure = None
    first_reduced_failure = None
    first_leaf_addition_failure = None
    first_aplusd_lc_failure = None
    first_three_sequence_failure = None
    first_paired_convolution_failure = None
    closest = None

    families = args.families
    for trial in range(args.trials):
        a, d, provenance = random_candidate_pair(
            rng, families[trial % len(families)]
        )
        candidate_pairs += 1
        if not is_log_concave(a):
            rejected_non_lc_a += 1
            continue
        base_failure = invariant_failure(a, d)
        if base_failure:
            rejected_invariant += 1
            continue
        accepted.append((a, d))
        aplusd = add(a, d)
        if not is_log_concave(aplusd) and first_aplusd_lc_failure is None:
            first_aplusd_lc_failure = {
                "A": a,
                "D": d,
                **provenance,
                "A_plus_D": aplusd,
            }

        # A separate closure question: once a rooted pair (A,D) is valid,
        # does adding one new leaf at the same root preserve it?  The new
        # total is A+x(A-D), while D is unchanged.
        leaf_added = add(a, shift(sub(a, d)))
        leaf_failure = invariant_failure(leaf_added, d)
        if leaf_failure and first_leaf_addition_failure is None:
            first_leaf_addition_failure = {
                "A": a,
                "D": d,
                **provenance,
                "A_prime": leaf_added,
                **leaf_failure,
            }

        for r in args.r_values:
            total, occupied = cherry_transform(a, d, r)
            kd = mul(binomial_kernel(r), d)
            ka = mul(binomial_kernel(r), a)
            if is_log_concave(aplusd) and (
                first_three_sequence_failure is None
                or first_paired_convolution_failure is None
            ):
                u = sub(a, d)
                v = aplusd
                kv = mul(binomial_kernel(r), v)
                if first_three_sequence_failure is None:
                    kernel_l = binomial_kernel(r)
                    if len(kernel_l) < 2:
                        kernel_l += [0] * (2 - len(kernel_l))
                    kernel_l[1] += 4
                    lu = mul(kernel_l, u)
                    found_three = partial_failure(kv, lu)
                    if found_three:
                        first_three_sequence_failure = {
                            "A": a,
                            "D": d,
                            "U": u,
                            "V": v,
                            "r": r,
                            "K_times_V": kv,
                            "L_times_U": lu,
                            **provenance,
                            **found_three,
                        }
                if first_paired_convolution_failure is None:
                    kernel_l2 = binomial_kernel(r)
                    if len(kernel_l2) < 2:
                        kernel_l2 += [0] * (2 - len(kernel_l2))
                    kernel_l2[1] += 2
                    l2u = mul(kernel_l2, u)
                    found_paired = partial_failure(l2u, kv)
                    if found_paired:
                        first_paired_convolution_failure = {
                            "A": a,
                            "D": d,
                            "U": u,
                            "V": v,
                            "r": r,
                            "L2_times_U": l2u,
                            "K_times_V": kv,
                            **provenance,
                            **found_paired,
                        }
            upper = max(len(total), len(occupied))
            for m in range(upper + 1):
                for n in range(m + 1):
                    reserve = minor(total, m, n) - minor(occupied, m, n)
                    reduced = minor(kd, m, n) + mixed_minor(
                        ka, occupied, m, n
                    )
                    cherry_checks += 1
                    record = {
                        "reserve": reserve,
                        "m": m,
                        "n": n,
                        "r": r,
                        "A": a,
                        "D": d,
                        **provenance,
                        "A_prime": total,
                        "D_prime": occupied,
                    }
                    if closest is None or reserve < closest["reserve"]:
                        closest = record
                    if reduced < 0 and first_reduced_failure is None:
                        first_reduced_failure = {
                            **record,
                            "reduced_reserve": reduced,
                            "common_convolution_reserve": (
                                minor(ka, m, n) - minor(kd, m, n)
                            ),
                        }
                    if reserve < 0:
                        first_failure = record
                        break
                if first_failure:
                    break
            if first_failure:
                break
        if first_failure:
            break

    convolution_checks = verify_common_convolution(rng, accepted)
    result = {
        "status": "counterexample" if first_failure else "no_failure",
        "seed": args.seed,
        "trials_requested": args.trials,
        "candidate_pairs": candidate_pairs,
        "accepted_pairs": len(accepted),
        "rejected_non_lc_A": rejected_non_lc_a,
        "rejected_invariant": rejected_invariant,
        "r_values": args.r_values,
        "decomposition_checks": decomposition_checks,
        "common_convolution_checks": convolution_checks,
        "cherry_minor_checks": cherry_checks,
        "closest_reserve": closest,
        "first_reduced_failure": first_reduced_failure,
        "first_leaf_addition_failure": first_leaf_addition_failure,
        "first_AplusD_lc_failure": first_aplusd_lc_failure,
        "first_KV_LU_partial_failure": first_three_sequence_failure,
        "first_L2U_KV_partial_failure": first_paired_convolution_failure,
        "first_failure": first_failure,
        "elapsed_seconds": time.time() - started,
    }
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--decomposition-trials", type=int, default=10_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--r-values", type=int, nargs="+", default=[2, 3, 4, 5, 8, 12]
    )
    parser.add_argument(
        "--families",
        nargs="+",
        choices=["pf", "lc", "raw"],
        default=["pf", "lc", "raw"],
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("toeplitz_pair_closure_search_20260726.json"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = run(args)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
