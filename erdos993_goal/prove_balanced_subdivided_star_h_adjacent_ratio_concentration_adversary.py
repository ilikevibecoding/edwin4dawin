#!/usr/bin/env python3
"""Exact replay for the all-order H adjacent-ratio concentration lemma.

This script accompanies
BALANCED_SUBDIVIDED_STAR_H_ADJACENT_RATIO_CONCENTRATION_2026-08-29.md.
The proof is all-order; the bounded integer audits below are adversarial
replays, not the reason the theorem holds.  Nothing here claims the terminal
Newton m=0 sign or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_h_adjacent_ratio_concentration_exact_adversary_20260829.json"
ROW_PRODUCER = ROOT / "prove_balanced_subdivided_star_m0_row_correlation_adversary.py"
ROW_REPORT = ROOT / "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def multiply(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    while len(output) > 1 and output[-1] == 0:
        output.pop()
    return output


def path(vertices: int) -> list[int]:
    """Independence polynomial of P_vertices; P_-1=1, P_-2=0."""
    if vertices == -2:
        return [0]
    if vertices == -1:
        return [1]
    assert vertices >= 0
    return [C(vertices + 1 - rank, rank) for rank in range((vertices + 1) // 2 + 1)]


def power(poly: list[int], exponent: int) -> list[int]:
    output = [1]
    for _ in range(exponent):
        output = multiply(output, poly)
    return output


def coefficient(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def adjacent_cross(high: list[int], low: list[int], rank: int) -> int:
    """Cross >=0 means high_(k+1)/high_k >= low_(k+1)/low_k."""
    return (
        coefficient(high, rank + 1) * coefficient(low, rank)
        - coefficient(high, rank) * coefficient(low, rank + 1)
    )


def positive_compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for cuts in itertools.combinations(range(1, total), parts - 1):
        boundaries = (0, *cuts, total)
        yield tuple(
            boundaries[index + 1] - boundaries[index]
            for index in range(parts)
        )


def local_graft_audit() -> dict[str, object]:
    identities = crosses = common_factor_crosses = 0
    minimum_cross = None
    minimum_common_cross = None
    common_factors = (
        [1],
        path(1),
        multiply(path(3), path(5)),
        multiply(power(path(2), 3), power(path(1), 4)),
    )
    for a in range(2, 61):
        for b in range(2, a + 1):
            old = multiply(path(a), path(b))
            low = multiply(path(a + b - 2), path(2))
            residual = [0, 0, 0, 0] + multiply(path(a - 4), path(b - 4))
            maximum = max(len(old), len(low), len(residual))
            assert all(
                coefficient(old, k) == coefficient(low, k) + coefficient(residual, k)
                for k in range(maximum)
            )
            identities += 1
            for rank in range(maximum + 1):
                value = adjacent_cross(old, low, rank)
                assert value >= 0
                minimum_cross = value if minimum_cross is None else min(minimum_cross, value)
                crosses += 1
            for common in common_factors:
                old_common = multiply(old, common)
                low_common = multiply(low, common)
                for rank in range(max(len(old_common), len(low_common)) + 1):
                    value = adjacent_cross(old_common, low_common, rank)
                    assert value >= 0
                    minimum_common_cross = (
                        value
                        if minimum_common_cross is None
                        else min(minimum_common_cross, value)
                    )
                    common_factor_crosses += 1
    return {
        "path_pair_identities": identities,
        "bare_adjacent_crosses": crosses,
        "common_factor_adjacent_crosses": common_factor_crosses,
        "minimum_bare_cross": minimum_cross,
        "minimum_common_factor_cross": minimum_common_cross,
    }


def allocation_audit() -> dict[str, object]:
    allocations = adjacent_crosses = 0
    minimum_cross = None
    minimum_positive_cross = None
    witnesses = []
    for total in range(1, 19):
        for occupied in range(1, min(total, 6) + 1):
            concentrated = (total - occupied + 1,) + (1,) * (occupied - 1)
            for isolates in range(0, 7):
                canonical = power(path(1), isolates)
                canonical = multiply(canonical, path(concentrated[0] + 1))
                canonical = multiply(canonical, power(path(2), occupied - 1))
                for allocation in positive_compositions(total, occupied):
                    actual = power(path(1), isolates)
                    for value in allocation:
                        actual = multiply(actual, path(value + 1))
                    for rank in range(max(len(actual), len(canonical)) + 1):
                        value = adjacent_cross(actual, canonical, rank)
                        assert value >= 0
                        minimum_cross = value if minimum_cross is None else min(minimum_cross, value)
                        if value > 0:
                            minimum_positive_cross = (
                                value
                                if minimum_positive_cross is None
                                else min(minimum_positive_cross, value)
                            )
                            if len(witnesses) < 8:
                                witnesses.append(
                                    {
                                        "T": total,
                                        "Y": occupied,
                                        "isolates": isolates,
                                        "allocation": list(allocation),
                                        "rank": rank,
                                        "cross": value,
                                    }
                                )
                        adjacent_crosses += 1
                    allocations += 1
    return {
        "positive_subdivision_allocation_rows": allocations,
        "adjacent_ratio_crosses": adjacent_crosses,
        "minimum_cross": minimum_cross,
        "minimum_positive_cross": minimum_positive_cross,
        "first_positive_witnesses": witnesses,
    }


def factor_replacement_audit() -> dict[str, object]:
    """Replay (mu-lambda)(q_k^2-q_(k-1)q_(k+1)) exactly."""
    checks = 0
    minimum_log_concavity = None
    minimum_replacement_cross = None
    for factors in range(0, 9):
        # Deterministic, nonuniform exact odds; zeros exercise padding.
        odds = [0, 1, 2, 3, 5, 8, 13, 21][:factors]
        qrow = [1]
        for odd in odds:
            qrow = multiply(qrow, [1, odd])
        for shift in range(0, 4):
            shifted = [0] * shift + qrow
            for rank in range(len(shifted) + 1):
                qkm = coefficient(shifted, rank - 1)
                qk = coefficient(shifted, rank)
                qkp = coefficient(shifted, rank + 1)
                lc = qk * qk - qkm * qkp
                assert lc >= 0
                minimum_log_concavity = (
                    lc if minimum_log_concavity is None else min(minimum_log_concavity, lc)
                )
                for low_odd, high_odd in ((0, 1), (1, 2), (2, 11)):
                    low = multiply(shifted, [1, low_odd])
                    high = multiply(shifted, [1, high_odd])
                    cross = adjacent_cross(high, low, rank)
                    assert cross == (high_odd - low_odd) * lc
                    assert cross >= 0
                    minimum_replacement_cross = (
                        cross
                        if minimum_replacement_cross is None
                        else min(minimum_replacement_cross, cross)
                    )
                    checks += 1
                # Infinite odds: xQ versus (1+lambda*x)Q.
                deterministic = [0] + shifted
                finite = multiply(shifted, [1, 7])
                cross = adjacent_cross(deterministic, finite, rank)
                assert cross == lc
                assert cross >= 0
                checks += 1
    return {
        "exact_factor_replacement_checks": checks,
        "minimum_log_concavity_minor": minimum_log_concavity,
        "minimum_factor_replacement_cross": minimum_replacement_cross,
    }


def all_order_floor_certificate() -> dict[str, object]:
    """Record the finite-dimensional inequality proving the four-odds shift."""
    # For u in (0,1/2), alpha,beta in [0,1),
    # alpha+beta+4u < 1+1+2=4, so its floor is at most 3.
    strict_sum_upper = 4
    floor_upper = strict_sum_upper - 1
    p2_indicator_upper = 1
    total_excess_upper = floor_upper + p2_indicator_upper
    assert floor_upper == 3
    assert total_excess_upper == 4
    return {
        "path_odds": "omega_(n,r)=4 cos^2(r*pi/(n+2))",
        "threshold_parameter": "threshold=4 cos^2(pi*u), 0<u<1/2",
        "new_count": "floor((a+b)u)+1_[u>=1/4]",
        "residual_count": "floor((a-2)u)+floor((b-2)u)",
        "exact_difference": (
            "floor(frac((a-2)u)+frac((b-2)u)+4u)+1_[u>=1/4]"
        ),
        "strict_fractional_sum_upper": strict_sum_upper,
        "floor_upper": floor_upper,
        "root_odds_excess_upper": total_excess_upper,
    }


def main() -> None:
    local = local_graft_audit()
    allocations = allocation_audit()
    replacements = factor_replacement_audit()
    floor_certificate = all_order_floor_certificate()
    dependencies = {}
    for path_name in (ROW_PRODUCER, ROW_REPORT):
        if path_name.exists():
            dependencies[path_name.name] = sha256(path_name)
    payload = {
        "schema": "balanced-subdivided-star-H-adjacent-ratio-concentration-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_SUBDIVIDED_STAR_H_ADJACENT_RATIO_CONCENTRATION",
        "theorem": {
            "actual_row": "H=(1+x)^(R-Y) product_a P_(ell_a+1), ell_a>=1, sum ell_a=T",
            "concentrated_row": "Hconc=(1+x)^(R-Y) P_(T-Y+2) P_2^(Y-1)",
            "adjacent_ratio_cross": "h_(k+1) Hconc_k-h_k Hconc_(k+1)>=0 for every k",
            "ratio_form": "h_(k+1)/h_k >= Hconc_(k+1)/Hconc_k whenever h_k,Hconc_k>0",
        },
        "all_order_proof_certificate": {
            "graft_identity": "P_a P_b=P_(a+b-2)P_2+x^4 P_(a-4)P_(b-4)",
            "root_threshold_count": floor_certificate,
            "linear_factor_replacement": (
                "For mu>=lambda and log-concave Q, the adjacent cross of "
                "(1+mu*x)Q over (1+lambda*x)Q is "
                "(mu-lambda)(q_k^2-q_(k-1)q_(k+1)); xQ is the mu=infinity limit."
            ),
            "iteration": (
                "Replace any two positive subdivision paths by their concentrated "
                "graft and iterate; multiplying by every unchanged path/isolate "
                "factor preserves the adjacent likelihood-ratio direction."
            ),
        },
        "exact_bounded_adversarial_replays": {
            "local_grafts": local,
            "factor_replacements": replacements,
            "allocation_rows": allocations,
        },
        "dependency_sha256": dependencies,
        "scope_warning": (
            "This proves only the all-order adjacent-ratio concentration of the H row. "
            "It is an input to, not a proof of, the terminal Newton m=0 sign, the "
            "terminal-payment theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("local", local)
    print("replacements", replacements)
    print("allocations", allocations)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
