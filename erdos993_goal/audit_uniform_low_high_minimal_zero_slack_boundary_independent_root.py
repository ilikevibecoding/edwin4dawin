#!/usr/bin/env python3
"""Independent exact audit of the all-rank minimal strong-boundary theorem.

This does not import the producer.  It reconstructs the finite-rank rows from
their exponential generating functions, repeats the symbolic A/B/D reduction,
and replaces the producer's projective k=10,11 certificates by exact Sturm
root counts for the relevant derivatives.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = (
    "uniform_low_high_minimal_zero_slack_boundary_theorem_exact_root_20260826.json",
    "ECB419E90D6304C22703D83BD12279E7C7D3987C5D24398D928CB625BFA1BB07",
)
PRODUCER_SOURCE = (
    "prove_uniform_low_high_minimal_zero_slack_boundary_root.py",
    "382D3DBF104D57138CC3B525A72DAAE354EE919602EBC20EA6C14D3522BFEEF2",
)
OUTPUT = (
    HERE
    / "uniform_low_high_minimal_zero_slack_boundary_independent_audit_root_20260826.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling(value: sp.Expr, length: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(length))


def convolution_coefficient(rank: int, parameter: sp.Symbol, degree: int) -> sp.Expr:
    n = parameter + rank
    assert degree >= 1
    return sp.cancel((
        (rank + 1) * (n + 1) * falling(rank + n, degree)
        - (rank + 1) * falling(sp.Integer(rank), degree)
        - (n + 1) * falling(n, degree)
    ) / (rank * n))


def right_coefficient(rank: int, parameter: sp.Symbol, degree: int) -> sp.Expr:
    if degree == 0:
        return sp.Integer(1)
    n = parameter + rank
    return sp.cancel((n + 1) * falling(n, degree) / n)


def direct_egf_boundary(rank: int, parameter: sp.Symbol) -> sp.Expr:
    c = {
        degree: convolution_coefficient(rank, parameter, degree)
        for degree in (rank - 1, rank, rank + 1)
    }
    u = {}
    for degree in (rank - 1, rank, rank + 1):
        u[degree] = sp.expand(
            right_coefficient(rank, parameter, degree)
            + degree * (rank + 1) * right_coefficient(
                rank, parameter, degree - 1
            )
            + math.comb(degree, 2) * (rank ** 2 - 1) * right_coefficient(
                rank, parameter, degree - 2
            )
        )
    margin = c[rank] ** 2 - c[rank - 1] * c[rank + 1] - c[rank - 1] * c[rank]
    polarization = (
        2 * c[rank] * u[rank]
        - c[rank - 1] * u[rank + 1]
        - u[rank - 1] * c[rank + 1]
        - c[rank - 1] * u[rank]
        - u[rank - 1] * c[rank]
    )
    return sp.factor(rank * margin - polarization)


def coefficient_list(expression: sp.Expr, variable: sp.Symbol) -> list[int]:
    return [int(item) for item in sp.Poly(sp.expand(expression), variable).all_coeffs()]


def shifted_coefficients(expression: sp.Expr, variable: sp.Symbol, shift: int) -> list[int]:
    t = sp.Symbol("audit_t", nonnegative=True)
    return coefficient_list(expression.subs(variable, t + shift), t)


def sign_variations(signs: list[int]) -> int:
    filtered = [sign for sign in signs if sign]
    return sum(left != right for left, right in zip(filtered, filtered[1:]))


def sturm_positive_half_line(polynomial: sp.Expr, variable: sp.Symbol) -> dict:
    sequence = sp.sturm(sp.Poly(polynomial, variable).as_expr(), variable)
    zero_signs = []
    infinity_signs = []
    for member in sequence:
        at_zero = sp.Poly(member, variable).eval(0)
        zero_signs.append((int(bool(at_zero > 0)) - int(bool(at_zero < 0))))
        leading = sp.LC(sp.Poly(member, variable))
        infinity_signs.append((
            int(bool(leading > 0)) - int(bool(leading < 0))
        ))
    zero_variations = sign_variations(zero_signs)
    infinity_variations = sign_variations(infinity_signs)
    root_count = zero_variations - infinity_variations
    assert root_count == 0
    assert sp.Poly(polynomial, variable).eval(0) > 0
    return {
        "sturm_sequence_length": len(sequence),
        "signs_at_zero": zero_signs,
        "signs_at_positive_infinity": infinity_signs,
        "variations_at_zero": zero_variations,
        "variations_at_positive_infinity": infinity_variations,
        "positive_root_count": root_count,
    }


def main() -> int:
    report_path = HERE / PRODUCER_REPORT[0]
    source_path = HERE / PRODUCER_SOURCE[0]
    assert sha256(report_path) == PRODUCER_REPORT[1]
    assert sha256(source_path) == PRODUCER_SOURCE[1]
    producer = json.loads(report_path.read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_MINIMAL_ZERO_SLACK_STRONG_BOUNDARY"
    assert producer["source_sha256"] == PRODUCER_SOURCE[1]

    k, m = sp.symbols("k m", real=True)
    A, B, D = sp.symbols("A B D", real=True)
    n = k + m

    # Independent finite-rank replay from the EGF product, not ratio iteration.
    direct_rows = []
    producer_rows = {
        row["rank"]: row
        for row in producer["sign_certificate"]["direct_k8_k9"]
    }
    for rank in (8, 9):
        strong = direct_egf_boundary(rank, m)
        divisor = (rank - 2) * (rank + 1) * (m + rank + 1)
        quotient = sp.cancel(strong / divisor)
        assert sp.denom(quotient) == 1
        coefficients = coefficient_list(quotient, m)
        assert min(coefficients) > 0
        assert coefficients == producer_rows[rank]["quotient_coefficients_descending"]
        direct_rows.append({
            "rank": rank,
            "quotient_degree": int(sp.degree(quotient, m)),
            "coefficient_count": len(coefficients),
            "minimum_coefficient": min(coefficients),
        })

    # Generic symbolic replay.  These c and u formulas follow directly from
    # r![z^r] of the two EGF factors; no producer code is imported.
    c0 = ((k + 1) * (n + 1) * A - (k + 1) * D - (n + 1) * B) / (k * n)
    c1 = (
        (k + 1) * (n + 1) ** 2 * A
        - (k + 1) * D
        - (n + 1) * (m + 1) * B
    ) / (k * n)
    c2 = (
        (k + 1) * (n + 1) ** 2 * n * A
        - (n + 1) * m * (m + 1) * B
    ) / (k * n)
    br3 = (n + 1) * B / (n * (m + 2) * (m + 3))
    br2 = (n + 1) * B / (n * (m + 2))
    br1 = (n + 1) * B / n
    br0 = (n + 1) * (m + 1) * B / n
    brp = (n + 1) * m * (m + 1) * B / n
    u0 = (
        br1 + (k - 1) * (k + 1) * br2
        + ((k - 1) * (k - 2) / 2) * (k ** 2 - 1) * br3
    )
    u1 = (
        br0 + k * (k + 1) * br1
        + (k * (k - 1) / 2) * (k ** 2 - 1) * br2
    )
    u2 = (
        brp + (k + 1) ** 2 * br0
        + (k * (k + 1) / 2) * (k ** 2 - 1) * br1
    )
    margin = c1 ** 2 - c0 * c2 - c0 * c1
    polarization = 2 * c1 * u1 - c0 * u2 - u0 * c2 - c0 * u1 - u0 * c1
    strong = k * margin - polarization

    P = (
        k ** 5 - 6 * k ** 4 - 2 * k ** 3 * m + 5 * k ** 3
        + 4 * k ** 2 * m + 10 * k ** 2 + 2 * k * m ** 2
        + 12 * k * m + 6 * k - 4 * m - 4
    )
    CAD = 2 * (k + 1) ** 2 * n ** 2 * (m + 2) * (m + 3) * (n + 1)
    CAB = (k - 1) * (k + 1) * (n + 1) ** 2 * P
    Q = (
        k ** 4 * m ** 2 + 4 * k ** 4 * m + 4 * k ** 4
        + k ** 3 * m ** 2 + 6 * k ** 3 * m + 6 * k ** 3
        + 2 * k ** 2 * m ** 3 + 9 * k ** 2 * m ** 2
        + 10 * k ** 2 * m + 4 * k ** 2 + 4 * k * m ** 3
        + 21 * k * m ** 2 + 28 * k * m + 6 * k
        + 4 * m ** 4 + 22 * m ** 3 + 36 * m ** 2 + 20 * m + 4
    )
    CDB = (k + 1) * (n + 1) * Q
    CBB = 2 * (k + 1) * (n + 1) ** 3 * (2 * k ** 2 + k * m - k + 2)
    numerator = A * D * CAD + A * B * CAB - D * B * CDB - B ** 2 * CBB
    denominator = 2 * k * n ** 2 * (m + 2) * (m + 3)
    assert sp.factor(sp.together(strong - numerator / denominator)) == 0

    W = sp.cancel((CAB - CBB) / (k * (k + 1) * (n + 1) ** 2))
    W_core = k ** 6 - 12 * k ** 5 + 43 * k ** 4 - 64 * k ** 3 + 31 * k ** 2 + 16 * k - 16
    assert sp.expand(sp.discriminant(W, m) + 4 * W_core) == 0
    W_core_shift = shifted_coefficients(W_core, k, 8)
    assert min(W_core_shift) > 0
    assert W_core_shift == producer["sign_certificate"][
        "CAB_minus_CBB_quadratic_discriminant_core_shift8_coefficients_descending"
    ]

    Wlower = sp.expand((k ** 3 + k ** 2 * m) * CAB - CDB)
    w = [sp.Poly(Wlower, m).coeff_monomial(m ** degree) for degree in range(6)]
    shifted_w = {
        str(index): shifted_coefficients(w[index], k, 10)
        for index in (0, 1, 2, 3, 5)
    }
    assert all(min(values) > 0 for values in shifted_w.values())
    assert shifted_w == producer["sign_certificate"][
        "Wlower_positive_coefficient_shifts_at_k10"
    ]
    R = sp.cancel((4 * w[3] * w[5] - w[4] ** 2) / (4 * (k + 1) ** 2))
    R_shift = shifted_coefficients(R, k, 12)
    assert min(R_shift) > 0
    assert R_shift == producer["sign_certificate"][
        "tail_discriminant_core_shift12_coefficients_descending"
    ]

    # Different finite-case method: exact Sturm counts show the derivatives
    # of Wlower(k,m) never vanish on m>0 for k=10,11.
    sturm_rows = {}
    for rank in (10, 11):
        specialized = sp.Poly(Wlower.subs(k, rank), m)
        derivative = sp.diff(specialized.as_expr(), m)
        certificate = sturm_positive_half_line(derivative, m)
        certificate["Wlower_at_zero"] = int(specialized.eval(0))
        sturm_rows[str(rank)] = certificate

    # Replay the two Catalan base cases and every polynomial induction margin.
    catalan_10 = math.comb(20, 10) // 11
    assert catalan_10 - 1 >= 10 ** 3
    assert catalan_10 >= 4 * 10 ** 2
    induction = {
        "cubic_bound": shifted_coefficients(
            2 * k ** 3 - 3 * k ** 2 - 3 * k + 1, k, 10
        ),
        "quadratic_bound": shifted_coefficients(
            2 * k ** 2 - 2 * k - 1, k, 10
        ),
        "harmonic_remainder": shifted_coefficients(
            k ** 2 - 3 * k + 1, k, 10
        ),
    }
    assert all(min(values) > 0 for values in induction.values())
    assert induction == producer["sign_certificate"][
        "catalan_induction_shift_coefficients_descending"
    ]

    payload = {
        "schema": "uniform-low-high-minimal-zero-slack-boundary-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_MINIMAL_ZERO_SLACK_STRONG_BOUNDARY_AUDIT",
        "producer_report": {
            "path": str(report_path),
            "sha256": PRODUCER_REPORT[1],
        },
        "producer_source": {
            "path": str(source_path),
            "sha256": PRODUCER_SOURCE[1],
        },
        "independent_checks": {
            "egf_direct_k8_k9": direct_rows,
            "generic_symbolic_rational_identity": True,
            "quadratic_discriminant_shift_k8": W_core_shift,
            "Wlower_coefficient_shifts_k10": shifted_w,
            "tail_discriminant_shift_k12": R_shift,
            "finite_k10_k11_sturm": sturm_rows,
            "catalan_induction": induction,
        },
        "scope": producer["scope"],
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
