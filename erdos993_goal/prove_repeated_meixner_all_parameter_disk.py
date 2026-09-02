#!/usr/bin/env python3
"""Exact all-parameter disk proof for the repeated-Meixner boundary.

For repeated benign parameter d and symmetric outliers u=v=t, the monic
diagonal polynomial is

    f_r=m_{r+2}+((d+t)N/2)m_{r+1}+(d+t)^2 R^2 m_r,

where m_n is the monic Meixner family, N=B+r+1 and
R^2=N(N-1)/16.  The previous energy certificate covers b_*>=0.  The
remaining case b_*<0 has a much shorter root-product proof.

At every zero xi_i of m_r,

    f_r(xi_i)=(xi_i-b_*)m_{r+1}(xi_i).

Since b_*<0 and the Meixner zeros are positive and strictly interlace, these
values alternate, with f_r(xi_r)<0.  Hence f_r has one positive zero alpha_i
in each (xi_i,xi_{i+1}) and one in (xi_r,infinity), so alpha_i>xi_i.
Meanwhile

    f_r(0)=R^2 t^2 m_r(0).

If the two remaining roots are z and conjugate(z), Viète therefore gives

    |z|^2=R^2 t^2 product(xi_i)/product(alpha_i) <= R^2.

The r=0 case follows directly from f_0(0)=R^2t^2.  This script verifies the
all-rank symbolic identities underlying that argument and performs a small
exact-rational recurrence replay.  Interlacing itself follows from the
positive Jacobi coefficients a_n>0, not from the finite replay.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "repeated_meixner_all_parameter_disk_exact_20260809.json"


def monic_meixner_polynomials(
    rank: int, reserve: sp.Rational, parameter: sp.Rational
) -> tuple[sp.Symbol, list[sp.Poly]]:
    z = sp.Symbol("z")
    polynomials = [sp.Poly(1, z)]
    b_zero = parameter * reserve / 4
    polynomials.append(sp.Poly(z - b_zero, z))
    for n in range(1, rank + 2):
        b_n = n * (1 + parameter / 2) + parameter * reserve / 4
        a_n = parameter * (parameter + 4) * n * (n + reserve - 1) / 16
        polynomials.append(
            sp.Poly(
                sp.expand(
                    (z - b_n) * polynomials[-1].as_expr()
                    - a_n * polynomials[-2].as_expr()
                ),
                z,
            )
        )
    return z, polynomials


def main() -> None:
    r, B = sp.symbols("r B", integer=True, nonnegative=True)
    d, t = sp.symbols("d t", positive=True)
    N = B + r + 1
    radius_squared = N * (N - 1) / 16
    h = d + t

    b_star = r + 1 - d * B / 4 - t * N / 2
    b_next = (r + 1) * (1 + d / 2) + d * B / 4

    # Evaluation at a zero of m_r: the coefficient multiplying m_{r+1}
    # is xi-b_*.  This is the all-rank sign/interlacing identity.
    node_identity = sp.factor(b_next - h * N / 2 - b_star)
    assert node_identity == 0

    # The monic Meixner constant term is
    #   m_n(0)=(-d/4)^n (B)_n.
    # It follows either from the recurrence or directly from the Pochhammer
    # transform.  Check the two ratios needed for f_r(0).
    next_constant_ratio = -d * (B + r) / 4
    second_constant_ratio = d**2 * (B + r) * (B + r + 1) / 16
    diagonal_constant_ratio = sp.factor(
        second_constant_ratio
        + h * N / 2 * next_constant_ratio
        + h**2 * radius_squared
    )
    assert sp.factor(diagonal_constant_ratio - radius_squared * t**2) == 0

    # Positivity of the Jacobi coefficients gives positive simple zeros and
    # strict interlacing for the m_n family.
    n = sp.symbols("n", integer=True, positive=True)
    jacobi_a = sp.factor(d * (d + 4) * n * (n + B - 1) / 16)
    jacobi_b = sp.factor(n * (1 + d / 2) + d * B / 4)

    # Exact-rational recurrence replay.  This checks polynomial construction,
    # the node identity, and the constant identity without numerical roots.
    replay_cases = [
        (0, 4, sp.Rational(3, 2), sp.Rational(1, 2)),
        (1, 7, sp.Rational(5, 3), sp.Rational(2, 5)),
        (2, 10, sp.Rational(7, 5), sp.Rational(3, 4)),
        (3, 14, sp.Rational(7, 4), sp.Rational(4, 5)),
        (6, 25, sp.Rational(9, 5), sp.Rational(1, 10)),
    ]
    replay_records: list[dict[str, object]] = []
    for rank, reserve, parameter, outlier in replay_cases:
        z, ms = monic_meixner_polynomials(rank, reserve, parameter)
        case_N = reserve + rank + 1
        case_R2 = sp.Rational(case_N * (case_N - 1), 16)
        case_h = parameter + outlier
        f = sp.Poly(
            sp.expand(
                ms[rank + 2].as_expr()
                + case_h * case_N / 2 * ms[rank + 1].as_expr()
                + case_h**2 * case_R2 * ms[rank].as_expr()
            ),
            z,
        )
        case_b_star = (
            rank
            + 1
            - parameter * reserve / 4
            - outlier * case_N / 2
        )
        assert sp.factor(
            f.eval(0) - ms[rank].eval(0) * case_R2 * outlier**2
        ) == 0
        node_remainders: list[str] = []
        if rank:
            node_remainder = sp.rem(
                f.as_expr()
                - (z - case_b_star) * ms[rank + 1].as_expr(),
                ms[rank].as_expr(),
                domain=sp.QQ,
            )
            assert sp.factor(node_remainder) == 0
            node_remainders.append(str(node_remainder))
        replay_records.append(
            {
                "r": rank,
                "B": reserve,
                "d": str(parameter),
                "t": str(outlier),
                "b_*": str(case_b_star),
                "constant_identity": True,
                "node_congruence": rank == 0 or node_remainders == ["0"],
                "f_sha256": hashlib.sha256(
                    str(f.as_expr()).encode("utf-8")
                ).hexdigest(),
            }
        )

    payload = {
        "kind": "repeated_meixner_all_parameter_disk_theorem",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_RANK_REPEATED_MEIXNER_FULL_PARAMETER_THEOREM",
        "scope": (
            "analytic all-rank theorem for every repeated benign d>0, "
            "B>=3r+4 and symmetric outlier 0<=t<=1"
        ),
        "all_rank_identities": {
            "node_evaluation": "f_r(xi)=(xi-b_*)m_(r+1)(xi) when m_r(xi)=0",
            "constant_term": "f_r(0)=R^2*t^2*m_r(0)",
            "jacobi_a": str(jacobi_a),
            "jacobi_b": str(jacobi_b),
        },
        "negative_final_diagonal_argument": [
            "b_*<0 implies xi_i-b_*>0 at every positive zero xi_i of m_r",
            "strict Meixner interlacing makes the f_r(xi_i) signs alternate",
            "f_r(xi_r)<0 and f_r(+infinity)>0 supply the last of r positive roots",
            "the resulting roots alpha_i satisfy alpha_i>xi_i",
            "Viete gives |z|^2=R^2*t^2*product(xi_i)/product(alpha_i)<=R^2",
        ],
        "nonnegative_final_diagonal_argument": (
            "covered independently by the exact Bernstein energy certificate "
            "repeated_meixner_nonnegative_final_diagonal_exact_20260809.json"
        ),
        "replay_cases": replay_records,
        "remaining_scope": [
            "lift from repeated benign d to arbitrary structured benign lists d_i",
            "combine that lift with the topological two-outlier boundary reduction",
            "translate the fixed-disk lemma back through the forest reduction",
        ],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"replay_cases={len(replay_records)}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
