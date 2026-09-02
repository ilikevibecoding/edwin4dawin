"""Numerical discovery audit for the consecutive-seed spectral residues.

For the monic polynomial p_N=N! g_N and q_N=N! g_(N-1)=N p_(N-1),
the positive residues in q_N/p_N are

    w_i = N p_(N-1)(lambda_i) / p_N'(lambda_i).

Both polynomials have a common zero at the origin.  For every nonzero root,
the common factor cancels and the residue can be evaluated stably from the
two interlacing root sets using logarithms of root differences.  This is a
discovery calculation, not a proof of any uniform bound.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from flint import ctx, fmpz_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "defect1_spectral_weight_profile_20260804.json"


def monic_seed(n: int) -> fmpz_poly:
    # p_N = sum_(k=0)^(N-1) (N)_k binom(2N-k-1,k) X^(N-k).
    coefficients = [0] * (n + 1)
    falling = 1
    for k in range(n):
        if k:
            falling *= n - k + 1
        coefficients[n - k] = falling * math.comb(2 * n - k - 1, k)
    return fmpz_poly(coefficients)


def nonzero_real_roots(n: int) -> list[float]:
    roots: list[float] = []
    for root, multiplicity in monic_seed(n).complex_roots():
        if not root.imag.is_zero():
            raise AssertionError(f"nonreal root for N={n}: {root}")
        value = float(root.real)
        if abs(value) > 1e-40:
            roots.extend([value] * multiplicity)
    roots.sort()
    if len(roots) != n - 1:
        raise AssertionError((n, len(roots)))
    return roots


def residues(n: int) -> tuple[list[float], list[float]]:
    current = nonzero_real_roots(n)
    previous = nonzero_real_roots(n - 1)
    weights = []
    for i, root in enumerate(current):
        log_weight = math.log(n)
        for old_root in previous:
            log_weight += math.log(abs(root - old_root))
        for j, other_root in enumerate(current):
            if i != j:
                log_weight -= math.log(abs(root - other_root))
        weights.append(math.exp(log_weight))
    return current, weights


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=100)
    parser.add_argument("--step", type=int, default=5)
    parser.add_argument("--precision", type=int, default=192)
    args = parser.parse_args()
    ctx.prec = args.precision

    sizes = sorted(set(range(3, args.max_n + 1, args.step)) | {args.max_n})
    records = []
    global_max = (0.0, None, None)
    for n in sizes:
        roots, weights = residues(n)
        maximum = max(weights)
        max_index = weights.index(maximum)
        positive_sum = sum(weights)
        record = {
            "N": n,
            "positive_weight_count": len(weights),
            "sum_positive_weights": positive_sum,
            "max_weight": maximum,
            "max_weight_index_from_most_negative_root": max_index,
            "root_at_max_weight": roots[max_index],
            "min_weight": min(weights),
            "effective_support": positive_sum * positive_sum / sum(w * w for w in weights),
            "weights": weights if n <= 18 else None,
        }
        records.append(record)
        if maximum > global_max[0]:
            global_max = (maximum, n, max_index)
        print(
            f"N={n} max={maximum:.12g} sum={positive_sum:.12g} "
            f"effective_support={record['effective_support']:.8g}",
            flush=True,
        )

    report = {
        "status": "PASS_DISCOVERY_PROFILE",
        "precision_bits": args.precision,
        "records": records,
        "largest_observed_weight": global_max[0],
        "largest_observed_weight_N": global_max[1],
        "largest_observed_weight_index": global_max[2],
        "comparison_e": math.e,
        "scope": (
            "Numerical root-difference evaluation of exact integer polynomials. "
            "The profile suggests conjectures but proves no uniform residue bound."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
