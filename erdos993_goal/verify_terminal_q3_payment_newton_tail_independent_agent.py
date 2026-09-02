#!/usr/bin/env python3
"""Exact all-order Newton-tail reduction for the terminal q3 payment.

This proves only that the binomial/Newton coefficients of the normalized
untruncated included-payment margin are nonnegative from index 8 onward.
The eight coefficients at indices 0,...,7 remain separate obligations.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_payment_newton_tail_independent_20260828.json"
PINS = {
    "TERMINAL_SUPPORT_Q3_ENVELOPE_RECURRENCE_INDEPENDENT_2026-08-28.md": (
        "ED1733748294AF20E9C2A465C012C0B74A9CE4AB6235E269BF65E1F4DC78110D"
    ),
    "audit_terminal_q3_anchor_ordering_independent_agent.py": (
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C"
    ),
    "terminal_q3_anchor_ordering_independent_audit_20260828.json": (
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C"
    ),
}
ANCHOR_STATUS = "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def overlap_coefficient(left: int, right: int, union: int) -> sp.Integer:
    if not max(left, right) <= union <= left + right:
        return sp.Integer(0)
    return sp.factorial(union) // (
        sp.factorial(union - left)
        * sp.factorial(union - right)
        * sp.factorial(left + right - union)
    )


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    anchor = json.loads(
        (HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert anchor["status"] == ANCHOR_STATUS
    assert anchor["independent_reconstruction"]["finite"]["coefficient_checks"] == 360_725
    analytic = anchor["independent_reconstruction"]["analytic"]
    assert analytic["orders"] == "n>=15"
    for endpoint in ("low", "high"):
        powers = analytic["endpoint_certificate_replay"][endpoint]
        assert [entry["power"] for entry in powers] == [0, 1, 2, 3, 4]

    s = sp.symbols("s")
    j, a, b, alpha, beta = sp.symbols(
        "j a b alpha beta", integer=True, nonnegative=True
    )
    p = sp.symbols("p0:4")
    r = sp.symbols("r0:3")
    u = sp.symbols("u0:13")
    P = sum(p[index] * s**index for index in range(4))
    R = sum(r[index] * s**index for index in range(3))
    U = sum(u[index] * s**index for index in range(13))
    c = alpha + a * (1 + s)
    e = beta + b * (1 + s)
    M = sp.expand((j + 1) * b * c - 3 * a * e)
    d0, d1 = 3 * P, 3 * a
    c0, c1 = R, c
    D0, D1 = (j + 1) * U, (j + 1) * b
    original = sp.expand(
        (d0 + d1) * d0 * M
        - (c1 * d0 - c0 * d1) * (d0 * D1 - d1 * D0)
    )
    A = sp.expand(P * c - a * R)
    delta = sp.expand(P * (P + a) * M - (j + 1) * A * (P * b - a * U))
    assert sp.expand(original - 9 * delta) == 0

    low = sp.expand(P * ((P + a) * M - (j + 1) * b * A))
    decomposition = sp.expand((j + 1) * a * A * U + low)
    assert sp.expand(delta - decomposition) == 0
    assert sp.Poly(low, s).degree() <= 7

    # Exact nonnegative structure constants for the Newton basis.
    kernel_checks = 0
    for left in range(13):
        for right in range(13):
            lhs = sp.binomial(s, left) * sp.binomial(s, right)
            rhs = sum(
                overlap_coefficient(left, right, union) * sp.binomial(s, union)
                for union in range(max(left, right), left + right + 1)
            )
            assert sp.expand_func(lhs - rhs).expand() == 0
            kernel_checks += 1

    # U_r(1+s) has manifestly nonnegative Newton coefficients by Pascal.
    rank = 12
    g = sp.symbols(f"g0:{rank + 1}")
    direct_u = sum(
        sp.binomial(s + 1, isolates) * g[rank - isolates]
        for isolates in range(rank + 1)
    )
    newton_u = sum(
        sp.binomial(s, isolates)
        * (
            g[rank - isolates]
            + (g[rank - isolates - 1] if rank - isolates - 1 >= 0 else 0)
        )
        for isolates in range(rank + 1)
    )
    assert sp.expand_func(direct_u - newton_u).expand() == 0

    # Nonnegative ordinary coefficients imply nonnegative Newton coefficients.
    stirling_checks = 0
    for power in range(13):
        rhs = sum(
            sp.factorial(index)
            * sp.functions.combinatorial.numbers.stirling(power, index, kind=2)
            * sp.binomial(s, index)
            for index in range(power + 1)
        )
        assert sp.expand_func(s**power - rhs).expand() == 0
        stirling_checks += 1

    report = {
        "schema": "terminal-q3-payment-newton-tail-independent-v1",
        "date": "2026-08-28",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION",
        "claim": (
            "For every terminal-support tree cell covered by the pinned "
            "coefficientwise anchor theorem, every Newton coefficient "
            "[binom(s,m)] of the normalized untruncated included-payment "
            "margin delta is nonnegative for m>=8.  Therefore only m=0..7 "
            "remain to prove for the integer parameter s=t-1>=0."
        ),
        "identities": {
            "normalization": (
                "Delta=9*delta; delta=P(P+a)M-(j+1)(P*c-aR)(P*b-aU)"
            ),
            "tail_split": (
                "delta=(j+1)a*A*U+L, A=P*c-aR, "
                "L=P((P+a)M-(j+1)bA), deg_s(L)<=7"
            ),
            "U_newton": (
                "[binom(s,m)]U_r=i_(r-m)(G)+i_(r-m-1)(G)>=0"
            ),
            "product_kernel": (
                "binom(s,p)binom(s,q)=sum_m "
                "m!/((m-p)!(m-q)!(p+q-m)!) binom(s,m)"
            ),
            "power_to_newton": (
                "s^k=sum_m m!*S(k,m)*binom(s,m), all coefficients nonnegative"
            ),
        },
        "exact_checks": {
            "normalization_and_tail_split": True,
            "low_remainder_degree": 7,
            "product_kernel_pairs": kernel_checks,
            "generic_U_rank": rank,
            "power_to_newton_identities": stirling_checks,
        },
        "pins": observed_pins,
        "remaining": [
            "prove Newton coefficients m=0,1,2,3,4,5,6,7 of delta",
            "assemble with the pinned anchor and included-block M1 positivity",
        ],
        "scope": (
            "This is only the Newton-tail reduction for the terminal included "
            "payment.  It does not prove the eight low Newton coefficients, "
            "the full q3 envelope, the averaged surplus target, or Erdos "
            "Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["exact_checks"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()

