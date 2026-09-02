#!/usr/bin/env python3
"""Exact d=1 terminal-m0 H/K arm-exchange identity and replay.

This freezes the coupled identity that replaces independent H and K endpoint
relaxations.  It is a structural reduction, not an all-order sign proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path

import sympy as sp

from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    balanced_motifs,
    exact_coefficients,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_d1_m0_hk_exchange_exact_adversary_20260829.json"
DEPENDENCY = ROOT / "scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def path(vertices: int, maximum: int) -> list[int]:
    if vertices == -1:
        return [1] + [0] * maximum
    assert vertices >= 0
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def multiply(left: list[int], right: list[int], maximum: int) -> list[int]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= maximum:
                output[i + j] += a * b
    return output


def rows(lengths: tuple[int, ...], zero_arms: int, maximum: int) -> tuple[list[int], list[int]]:
    H = path(1, maximum)
    H = power(H, zero_arms, maximum)
    K = [1] + [0] * maximum
    for value in lengths:
        H = multiply(H, path(value + 1, maximum), maximum)
        K = multiply(K, path(value, maximum), maximum)
    return H, K


def power(poly: list[int], exponent: int, maximum: int) -> list[int]:
    output = [1] + [0] * maximum
    for _ in range(exponent):
        output = multiply(output, poly, maximum)
    return output


def objective(H: list[int], K: list[int], j: int, A: int, B: int, D: int) -> int:
    return A * H[j + 1] + D * H[j] + A * K[j] + B * K[j - 1]


def positive_compositions(total: int, parts: int):
    for cuts in itertools.combinations(range(1, total), parts - 1):
        bounds = (0, *cuts, total)
        yield tuple(bounds[i + 1] - bounds[i] for i in range(parts))


def symbolic_exchange() -> dict[str, object]:
    x = sp.symbols("x")
    P: dict[int, sp.Expr] = {-1: sp.Integer(1), 0: sp.Integer(1), 1: 1 + x}
    for n in range(2, 29):
        P[n] = sp.expand(P[n - 1] + x * P[n - 2])

    unit_checks = two_step_checks = 0
    for v in range(2, 13):
        for u in range(v, 25):
            q = P[u - v - 1]
            h = sp.expand(
                P[u + 1] * P[v + 1]
                - P[u + 2] * P[v]
                - (-1) ** v * x ** (v + 2) * q
            )
            k = sp.expand(
                P[u] * P[v]
                - P[u + 1] * P[v - 1]
                - (-1) ** (v + 1) * x ** (v + 1) * q
            )
            assert h == 0 and k == 0
            unit_checks += 1
            if v >= 3:
                q2 = P[u - v]
                h2 = sp.expand(
                    P[u + 1] * P[v + 1]
                    - P[u + 3] * P[v - 1]
                    - (-1) ** (v + 1) * x ** (v + 1) * q2
                )
                k2 = sp.expand(
                    P[u] * P[v]
                    - P[u + 2] * P[v - 2]
                    - (-1) ** v * x**v * q2
                )
                assert h2 == 0 and k2 == 0
                two_step_checks += 1

    return {
        "unit_transfer_formula_replays": unit_checks,
        "two_step_transfer_formula_replays": two_step_checks,
        "recurrence_closure": (
            "Both residuals obey P_n=P_(n-1)+xP_(n-2) in u; the displayed "
            "u=v and u=v+1 bases therefore prove each identity for all u>=v."
        ),
    }


def literal_exchange_audit() -> dict[str, object]:
    checks = 0
    minimum_identity_slack = None
    for R in range(2, 6):
        for Y in range(2, R + 1):
            zero_arms = R - Y
            for T in range(Y, 11):
                for allocation in positive_compositions(T, Y):
                    for left in range(Y):
                        for right in range(Y):
                            if left == right:
                                continue
                            u, v = allocation[left], allocation[right]
                            if u < v or v < 2:
                                continue
                            maximum = R + T + 1
                            old_H, old_K = rows(allocation, zero_arms, maximum)
                            changed = list(allocation)
                            changed[left] += 1
                            changed[right] -= 1
                            new_H, new_K = rows(tuple(changed), zero_arms, maximum)
                            rest = tuple(
                                value
                                for index, value in enumerate(allocation)
                                if index not in (left, right)
                            )
                            rest_H, rest_K = rows(rest, zero_arms, maximum)
                            q = path(u - v - 1, maximum)
                            predicted_H_row = multiply(q, rest_H, maximum)
                            predicted_K_row = multiply(q, rest_K, maximum)
                            for rank in range(maximum + 1):
                                predicted_H = (
                                    (-1) ** v
                                    * coefficient(predicted_H_row, rank - v - 2)
                                )
                                predicted_K = (
                                    (-1) ** (v + 1)
                                    * coefficient(predicted_K_row, rank - v - 1)
                                )
                                slack_H = old_H[rank] - new_H[rank] - predicted_H
                                slack_K = old_K[rank] - new_K[rank] - predicted_K
                                assert slack_H == 0 and slack_K == 0
                                local = min(slack_H, slack_K)
                                minimum_identity_slack = (
                                    local
                                    if minimum_identity_slack is None
                                    else min(minimum_identity_slack, local)
                                )
                                checks += 2
    return {
        "literal_row_identity_checks": checks,
        "minimum_identity_slack": minimum_identity_slack,
    }


def coefficient(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def former_relaxation_witness() -> dict[str, object]:
    N, j, R, T, Y, tau = 29, 9, 5, 23, 5, 26
    A2, B2, _, _ = balanced_motifs(1, R)
    data = exact_coefficients(N, j, 1, R, T, Y, B2, A2, tau)
    A, B, D = data["Cf"], data["Cb"], data["Cb"] + data["Ch"]
    best = None
    allocations = 0
    maximum = j + 1
    for allocation in positive_compositions(T, Y):
        H, K = rows(allocation, R - Y, maximum)
        value = objective(H, K, j, A, B, D)
        record = (value, tuple(sorted(allocation)))
        if best is None or record < best:
            best = record
        allocations += 1
    assert best == (357461420921854200, (1, 3, 3, 3, 13))

    allocation = (13, 3, 3, 3, 1)
    H, K = rows(allocation, 0, maximum)
    changed = (14, 2, 3, 3, 1)
    H2, K2 = rows(changed, 0, maximum)
    delta_unit = objective(H, K, j, A, B, D) - objective(H2, K2, j, A, B, D)
    changed2 = (15, 1, 3, 3, 1)
    H3, K3 = rows(changed2, 0, maximum)
    delta_second = objective(H2, K2, j, A, B, D) - objective(H3, K3, j, A, B, D)
    delta_two = objective(H, K, j, A, B, D) - objective(H3, K3, j, A, B, D)
    assert delta_unit == -7720457836767480
    assert delta_second == 5199568801680960
    assert delta_two == -2520889035086520
    assert delta_two == delta_unit + delta_second
    return {
        "parameters": {"N": N, "j": j, "d": 1, "R": R, "T": T, "Y": Y, "tau": tau},
        "positive_allocations": allocations,
        "exact_minimum": best[0],
        "minimizing_sorted_allocation": list(best[1]),
        "unit_delta_13_3_to_14_2": delta_unit,
        "unit_delta_14_2_to_15_1": delta_second,
        "two_step_delta_13_3_to_15_1": delta_two,
    }


def main() -> None:
    symbolic = symbolic_exchange()
    literal = literal_exchange_audit()
    witness = former_relaxation_witness()
    payload = {
        "schema": "balanced-subdivided-star-d1-m0-hk-exchange-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_M0_COUPLED_HK_EXCHANGE_IDENTITY",
        "statement": {
            "rows": "H=prod P_(ell+1), K=prod P_ell, M=A H_(j+1)+(B+Ch)H_j+A K_j+B K_(j-1)",
            "unit_transfer": (
                "For u>=v>=2, (u,v)->(u+1,v-1): "
                "Delta M=(-1)^v [x^(j-v-2)]P_(u-v-1)V"
            ),
            "residual": (
                "V=A(H0-K0)/x+(B+Ch)H0-BK0="
                "(A+xB)(H0-K0)/x+Ch H0"
            ),
            "two_step_transfer": (
                "For u>=v>=3, (u,v)->(u+2,v-2): "
                "Delta M=(-1)^(v+1)[x^(j-v-1)]P_(u-v)V"
            ),
        },
        "all_order_symbolic_proof": symbolic,
        "bounded_literal_audit": literal,
        "former_relaxation_witness": witness,
        "dependency_sha256": sha256(DEPENDENCY),
        "scope_warning": (
            "The exchange identities are all-order exact, but no sign is asserted "
            "for the residual coefficient. This does not prove terminal m=0, the "
            "terminal-payment theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic", symbolic)
    print("literal", literal)
    print("witness", witness)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
