#!/usr/bin/env python3
"""Exact replay for the all-order H graft-residual tangent theorem.

The theorem prevents the invalid independent use of Hmax_j and the Hconc
adjacent ratio.  This is a structural row theorem, not the terminal m=0 sign.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_h_graft_residual_tangent_exact_adversary_20260829.json"
DEPENDENCIES = (
    ROOT / "prove_balanced_subdivided_star_h_adjacent_ratio_concentration_adversary.py",
    ROOT / "balanced_subdivided_star_h_adjacent_ratio_concentration_exact_adversary_20260829.json",
)


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


def concentrated(T: int, Y: int, isolates: int) -> list[int]:
    row = power(path(1), isolates)
    row = multiply(row, path(T - Y + 2))
    row = multiply(row, power(path(2), Y - 1))
    return row


def hmax_allocation(T: int, Y: int) -> tuple[int, ...]:
    if T >= 2 * Y:
        return (T - 2 * Y + 2,) + (2,) * (Y - 1)
    return (2,) * (T - Y) + (1,) * (2 * Y - T)


def tangent_ratio(S: int, rank: int) -> tuple[int, int]:
    vertices = max(0, S - 8)
    residual_rank = rank - 4
    denominator = C(vertices + 1 - residual_rank, residual_rank)
    numerator = C(vertices - residual_rank, residual_rank + 1)
    return (numerator, denominator) if denominator else (0, 1)


def local_join_audit() -> dict[str, object]:
    identities = crosses = 0
    minimum_cross = None
    for a in range(1, 61):
        for b in range(1, a + 1):
            old = multiply(path(a), path(b))
            joined = path(a + b)
            residual = [0, 0] + multiply(path(a - 2), path(b - 2))
            maximum = max(len(old), len(joined), len(residual))
            assert all(
                coefficient(old, k)
                == coefficient(joined, k) + coefficient(residual, k)
                for k in range(maximum)
            )
            identities += 1
            for rank in range(maximum + 1):
                cross = (
                    coefficient(old, rank + 1) * coefficient(joined, rank)
                    - coefficient(old, rank) * coefficient(joined, rank + 1)
                )
                assert cross >= 0
                minimum_cross = cross if minimum_cross is None else min(minimum_cross, cross)
                crosses += 1
    return {
        "path_join_identities": identities,
        "path_join_adjacent_crosses": crosses,
        "minimum_path_join_cross": minimum_cross,
    }


def allocation_tangent_audit() -> dict[str, object]:
    allocation_rows = tangent_crosses = endpoint_checks = 0
    minimum_tangent = None
    former_witness = None
    for T in range(1, 23):
        for Y in range(1, min(T, 6) + 1):
            for isolates in range(0, 7):
                S = T + Y + isolates
                canonical = concentrated(T, Y, isolates)
                endpoint_allocations = {
                    (T - Y + 1,) + (1,) * (Y - 1),
                    hmax_allocation(T, Y),
                }
                for allocation in positive_compositions(T, Y):
                    actual = power(path(1), isolates)
                    for value in allocation:
                        actual = multiply(actual, path(value + 1))
                    maximum = max(len(actual), len(canonical))
                    for rank in range(4, maximum + 1):
                        numerator, denominator = tangent_ratio(S, rank)
                        tangent = (
                            denominator
                            * (
                                coefficient(actual, rank + 1)
                                - coefficient(canonical, rank + 1)
                            )
                            - numerator
                            * (
                                coefficient(actual, rank)
                                - coefficient(canonical, rank)
                            )
                        )
                        assert tangent >= 0
                        minimum_tangent = (
                            tangent if minimum_tangent is None else min(minimum_tangent, tangent)
                        )
                        tangent_crosses += 1
                    if allocation in endpoint_allocations:
                        endpoint_checks += 1
                    if (T, Y, isolates, allocation) == (
                        22,
                        5,
                        0,
                        (14, 2, 2, 2, 2),
                    ):
                        rank = 10
                        numerator, denominator = tangent_ratio(S, rank)
                        former_witness = {
                            "parameters": {"S": S, "rank": rank, "T": T, "Y": Y},
                            "Hconc_pair": [
                                coefficient(canonical, rank),
                                coefficient(canonical, rank + 1),
                            ],
                            "Hmax_pair": [
                                coefficient(actual, rank),
                                coefficient(actual, rank + 1),
                            ],
                            "residual_ratio": [numerator, denominator],
                            "tangent_slack": (
                                denominator
                                * (
                                    coefficient(actual, rank + 1)
                                    - coefficient(canonical, rank + 1)
                                )
                                - numerator
                                * (
                                    coefficient(actual, rank)
                                    - coefficient(canonical, rank)
                                )
                            ),
                        }
                    allocation_rows += 1
    assert former_witness == {
        "parameters": {"S": 27, "rank": 10, "T": 22, "Y": 5},
        "Hconc_pair": [115281, 44624],
        "Hmax_pair": [144953, 70426],
        "residual_ratio": [1716, 3003],
        "tangent_slack": 26566254,
    }
    return {
        "allocation_rows": allocation_rows,
        "tangent_crosses": tangent_crosses,
        "endpoint_allocation_checks": endpoint_checks,
        "minimum_tangent_slack": minimum_tangent,
        "former_N28_relaxation_witness": former_witness,
    }


def main() -> None:
    local = local_join_audit()
    allocations = allocation_tangent_audit()
    payload = {
        "schema": "balanced-subdivided-star-H-graft-residual-tangent-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_H_GRAFT_RESIDUAL_TANGENT",
        "theorem": {
            "canonical": "C=(1+x)^(R-Y)P_(T-Y+2)P2^(Y-1)",
            "ratio": (
                "rho=P_(S-8)[j-3]/P_(S-8)[j-4], with rho=0 if the "
                "denominator is unsupported"
            ),
            "tangent": "h_(j+1)-c_(j+1) >= rho*(h_j-c_j), j>=4",
        },
        "all_order_proof": {
            "join_identity": "P_aP_b=P_(a+b)+x^2P_(a-2)P_(b-2)",
            "two_odds_count": (
                "At threshold u, P_(a+b) has at most two more root odds than "
                "P_(a-2)P_(b-2), since floor(frac(au)+frac(bu)+2u)<=2."
            ),
            "linear_forest_extremum": (
                "Repeated joins show every n-vertex linear forest LR-dominates P_n."
            ),
            "graft_residual": (
                "Every concentration residual is x^4 times a linear forest on "
                "at least max(0,S-8) vertices; the P_n adjacent ratio increases "
                "with n, and summing the residual inequalities gives the tangent."
            ),
        },
        "exact_bounded_adversarial_replay": {
            "local_join": local,
            "allocations": allocations,
        },
        "dependency_sha256": {
            path.name: sha256(path) for path in DEPENDENCIES if path.exists()
        },
        "scope_warning": (
            "This proves the all-order H row tangent only.  It does not prove "
            "terminal Newton m=0, the terminal-payment theorem, or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("local", local)
    print("allocations", allocations)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
