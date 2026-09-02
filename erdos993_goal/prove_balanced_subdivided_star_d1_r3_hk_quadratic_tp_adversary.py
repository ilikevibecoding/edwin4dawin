#!/usr/bin/env python3
"""Exact R=3 H/K residual quadratic and transfer-kernel TP reduction.

This proves a structural finite-candidate reduction for each parity class of
arm transfers.  It does not prove the remaining candidate margins positive.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path

import sympy as sp

from prove_balanced_subdivided_star_d1_m0_hk_exchange_adversary import (
    multiply,
    path,
    rows,
)
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    balanced_motifs,
    exact_coefficients,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_d1_r3_hk_quadratic_tp_exact_adversary_20260829.json"
DEPENDENCY = ROOT / "prove_balanced_subdivided_star_d1_m0_hk_exchange_adversary.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def sign_changes(row: list[int]) -> int:
    signs = [value > 0 for value in row if value]
    return sum(signs[i] != signs[i - 1] for i in range(1, len(signs)))


def quadratic_G(w: int, r: int, A: int, B: int, Ch: int) -> int:
    return (
        A * (w + 2 - 2 * r) * (w + 1 - 2 * r)
        + B * r * (w + 1 - r)
        + Ch * (w + 2 - r) * (w + 1 - r)
    )


def V_row(w: int, maximum: int, A: int, B: int, Ch: int) -> list[int]:
    H = path(w + 1, maximum)
    K = path(w, maximum)
    J = path(w - 1, maximum)
    return [
        A * J[r] + B * (J[r - 1] if r else 0) + Ch * H[r]
        for r in range(maximum + 1)
    ]


def symbolic_quadratic() -> dict[str, object]:
    w, r, A, B, Ch = sp.symbols("w r A B Ch")
    G = sp.expand(
        A * (w + 2 - 2 * r) * (w + 1 - 2 * r)
        + B * r * (w + 1 - r)
        + Ch * (w + 2 - r) * (w + 1 - r)
    )
    polynomial = sp.Poly(G, r)
    assert polynomial.degree() == 2
    return {
        "G_expanded": str(G),
        "r_coefficients_high_to_low": [str(value) for value in polynomial.all_coeffs()],
        "degree_in_r": polynomial.degree(),
        "sign_consequence": (
            "For w>=1 and supported r, (w+2-r)(w+1-r)V_r=H_r G(r). "
            "The multiplier and H_r are positive, so V has at most two sign changes."
        ),
        "w0_boundary": "V=(A+Ch)+x(B+Ch), hence at most one sign change.",
    }


def exact_row_audit() -> dict[str, object]:
    checks = 0
    minimum_identity_slack = None
    maximum_changes = 0
    parameter_sets = (
        (7, 11, -13),
        (31, -5, -19),
        (101, 83, -127),
        (40902619413019842, 38265704414794026, -32403699956468034),
    )
    for w in range(0, 81):
        maximum = (w + 3) // 2 + 2
        H = path(w + 1, maximum)
        for A, B, Ch in parameter_sets:
            V = V_row(w, maximum, A, B, Ch)
            if w == 0:
                assert V[0] == A + Ch and V[1] == B + Ch
            else:
                for r in range(maximum + 1):
                    if H[r] == 0:
                        continue
                    denominator = (w + 2 - r) * (w + 1 - r)
                    left = denominator * V[r]
                    right = H[r] * quadratic_G(w, r, A, B, Ch)
                    slack = left - right
                    assert slack == 0
                    minimum_identity_slack = (
                        slack if minimum_identity_slack is None else min(minimum_identity_slack, slack)
                    )
                    checks += 1
            maximum_changes = max(maximum_changes, sign_changes(V))
            assert sign_changes(V) <= 2
    return {
        "quadratic_row_identity_checks": checks,
        "minimum_identity_slack": minimum_identity_slack,
        "maximum_observed_V_sign_changes": maximum_changes,
    }


def kernel(delta: int, r: int, s: int) -> int:
    return C(r + delta + s, r - s)


def tp_audit() -> dict[str, object]:
    minors = 0
    minimum = None
    size = 7
    for delta in range(0, 7):
        matrix = sp.Matrix([
            [kernel(delta, r, s) for s in range(size)]
            for r in range(size)
        ])
        for order in range(1, 4):
            for row_indices in itertools.combinations(range(size), order):
                for column_indices in itertools.combinations(range(size), order):
                    determinant = int(matrix.extract(row_indices, column_indices).det())
                    assert determinant >= 0
                    minimum = determinant if minimum is None else min(minimum, determinant)
                    minors += 1
    return {
        "exact_TN_minors": minors,
        "minimum_minor": minimum,
        "planar_network": (
            "K_delta(r,s)=C(r+delta+s,r-s) counts north/east lattice paths "
            "from S_s=(s,-2s) to T_r=(r,delta). Ordered sources and sinks "
            "are nonpermutable; Lindstrom-Gessel-Viennot makes every minor nonnegative."
        ),
        "variation_diminishing": (
            "Every finite truncation of this totally nonnegative kernel does not "
            "increase sign variation."
        ),
    }


def transfer_transform_audit() -> dict[str, object]:
    checks = 0
    maximum_output_changes = 0
    examples = []
    for N, j, u, v, w in (
        (23, 9, 13, 3, 3),
        (37, 18, 8, 6, 19),
        (68, 33, 40, 20, 4),
    ):
        R, T, Y = 3, u + v + w, 3
        assert N == 1 + R + T
        A2, B2, B3, _ = balanced_motifs(1, R)
        data = exact_coefficients(N, j, 1, R, T, Y, B2, A2, B3 + 4)
        A, B, Ch = data["Cf"], data["Cb"], data["Ch"]
        maximum = N + 2
        V = V_row(w, maximum, A, B, Ch)

        # Unit transfer has L=u-v-1, rank r=j-v-2.
        L, rank = u - v - 1, j - v - 2
        product = multiply(path(L, maximum), V, maximum)
        delta = L + 1 - 2 * rank
        shift = max(0, (-delta + 1) // 2)
        reduced_delta = delta + 2 * shift
        transformed = []
        for rr in range(maximum + 1):
            transformed.append(sum(
                V[shift + s] * kernel(reduced_delta, rr, s)
                for s in range(maximum + 1 - shift)
            ))
        # rr=rank-shift is the constant-deficiency transform coordinate.
        assert product[rank] == transformed[rank - shift]
        checks += 1
        maximum_output_changes = max(maximum_output_changes, sign_changes(transformed))
        assert sign_changes(transformed) <= sign_changes(V)
        examples.append({
            "parameters": [N, j, u, v, w],
            "V_sign_changes": sign_changes(V),
            "transformed_sign_changes": sign_changes(transformed),
            "relevant_coefficient": product[rank],
            "deficiency": delta,
            "unsupported_prefix_shift": shift,
        })
    return {
        "literal_transform_checks": checks,
        "maximum_output_sign_changes": maximum_output_changes,
        "examples": examples,
    }


def main() -> None:
    symbolic = symbolic_quadratic()
    rows_audit = exact_row_audit()
    tp = tp_audit()
    transfers = transfer_transform_audit()
    payload = {
        "schema": "balanced-subdivided-star-d1-r3-hk-quadratic-tp-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_R3_HK_QUADRATIC_TP_REDUCTION",
        "theorem": {
            "quadratic": symbolic,
            "constant_deficiency": (
                "For a fixed-sum two-step transfer, L=u-v, r=j-v-1, so "
                "delta=L+1-2r=u+v-2j+3 is constant."
            ),
            "kernel": (
                "After shift s0=max(0,ceil(-delta/2)), the transfer coefficient "
                "sequence is K_delta'(r',s)V_(s0+s), K=C(r'+delta'+s,r'-s)."
            ),
            "candidate_reduction": (
                "On each parity class, the exact two-step first-difference sequence "
                "has at most two sign changes. A minimum is therefore at a parity "
                "endpoint or adjacent to a negative-to-positive crossing; there are "
                "at most two such crossings."
            ),
        },
        "exact_row_audit": rows_audit,
        "tp_kernel_audit": tp,
        "transfer_audit": transfers,
        "dependency_sha256": sha256(DEPENDENCY),
        "scope_warning": (
            "This is an all-order R=3 finite-candidate reduction only. It does not "
            "prove the remaining critical margins positive, terminal m=0, the "
            "terminal-payment theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("rows", rows_audit)
    print("tp", tp)
    print("transfers", transfers)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
