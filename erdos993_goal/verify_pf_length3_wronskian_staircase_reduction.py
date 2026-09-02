"""Exact Wronskian reduction for a PF length-three collision.

Let ``h_0,...,h_3`` be four consecutive quadratic-input rows.  If a
positive PF length-three kernel has roots ``-c,-d`` with ``c,d>0``, then at
a common root the rows satisfy

    c*d*h_j + (c+d)*h_(j+1) + h_(j+2) = 0,  j=0,1.

After the first negative factor put ``f_j=c*h_j+h_(j+1)``.  This script
proves, with completely generic row values and derivatives, that the final
collision derivative product has the opposite sign from the product of the
two adjacent cubic Wronskians ``W(f_0,f_1) W(f_1,f_2)``.  Thus the remaining
orientation issue is exactly the exclusion of a monotone root-count
staircase across the two already-compatible cubic pairs.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_wronskian_staircase_reduction_exact_20260807.json"


def main() -> None:
    c, d = sp.symbols("c d", positive=True)
    h0, h1 = sp.symbols("h0 h1", nonzero=True)
    hp = sp.symbols("h0p:4")

    # Impose the two value recurrences, but leave all four x-derivatives
    # independent: c and d are held fixed when the two window polynomials
    # are differentiated.
    h2 = sp.expand(-c * d * h0 - (c + d) * h1)
    h3 = sp.expand(-c * d * h1 - (c + d) * h2)
    h = [h0, h1, h2, h3]

    d0 = sp.expand(h1**2 - h0 * h2)
    d2 = sp.expand(h2**2 - h1 * h3)
    e = sp.expand(h0 * h3 - h1 * h2)
    discriminant = sp.expand(e**2 - 4 * d0 * d2)

    f = [sp.expand(c * h[j] + h[j + 1]) for j in range(3)]
    fp = [sp.expand(c * hp[j] + hp[j + 1]) for j in range(3)]
    w0 = sp.expand(f[0] * fp[1] - fp[0] * f[1])
    w1 = sp.expand(f[1] * fp[2] - fp[1] * f[2])

    q0p = sp.expand(c * d * hp[0] + (c + d) * hp[1] + hp[2])
    q1p = sp.expand(c * d * hp[1] + (c + d) * hp[2] + hp[3])
    a = sp.expand(d2 * hp[0] + e * hp[1] + d0 * hp[2])
    b = sp.expand(d2 * hp[1] + e * hp[2] + d0 * hp[3])

    checks = {
        "D0=(c*h0+h1)*(d*h0+h1)": sp.factor(
            d0 - (c * h0 + h1) * (d * h0 + h1)
        ),
        "D2=c*d*D0": sp.factor(d2 - c * d * d0),
        "E=(c+d)*D0": sp.factor(e - (c + d) * d0),
        "H=(c-d)^2*D0^2": sp.factor(
            discriminant - (c - d) ** 2 * d0**2
        ),
        "f1=-d*f0": sp.factor(f[1] + d * f[0]),
        "f2=-d*f1": sp.factor(f[2] + d * f[1]),
        "W0=f0*q0prime": sp.factor(w0 - f[0] * q0p),
        "W1=f1*q1prime": sp.factor(w1 - f[1] * q1p),
        "A=D0*q0prime": sp.factor(a - d0 * q0p),
        "B=D0*q1prime": sp.factor(b - d0 * q1p),
        "AB=-(d*h0+h1)^2*W0*W1/d": sp.factor(
            a * b + (d * h0 + h1) ** 2 * w0 * w1 / d
        ),
    }
    assert all(value == 0 for value in checks.values())

    # If the two adjacent cubic pairs have common interlacers and all three
    # leading coefficients are positive, their root counts at a point with
    # alternating values differ by exactly one.  The four possibilities are
    # finite; the exact identity above says that positive AB occurs exactly
    # for the valley/peak patterns and negative AB for the two staircases.
    count_patterns = []
    for epsilon0 in (-1, 1):
        for epsilon2 in (-1, 1):
            # N0=N1+epsilon0 and N2=N1+epsilon2.
            shape = (
                "valley_or_peak"
                if epsilon0 == epsilon2
                else "monotone_staircase"
            )
            # sign(W0)=sign(N0-N1), sign(W1)=sign(N1-N2).
            w_product_sign = -epsilon0 * epsilon2
            ab_sign = -w_product_sign
            count_patterns.append(
                {
                    "N0_minus_N1": epsilon0,
                    "N2_minus_N1": epsilon2,
                    "shape": shape,
                    "W0W1_sign": w_product_sign,
                    "AB_sign": ab_sign,
                }
            )
    assert all(
        (record["AB_sign"] > 0)
        == (record["shape"] == "valley_or_peak")
        for record in count_patterns
    )

    payload = ";".join(f"{key}:{value}" for key, value in checks.items())
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_WRONSKIAN_STAIRCASE_REDUCTION",
        "exact_identities": list(checks),
        "identity_digest": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "root_count_patterns": count_patterns,
        "theorem": (
            "At a positive PF length-three collision, AB has the opposite "
            "sign from W(f0,f1)W(f1,f2), where f_j=c*h_j+h_(j+1). "
            "Because both adjacent cubic pairs already have common "
            "interlacers, AB>0 is equivalent to N(f0)=N(f2); the only "
            "remaining bad case is a monotone one-step root-count staircase."
        ),
        "remaining_obligation": (
            "Exclude N(f0),N(f1),N(f2)=(k+1,k,k-1) and its reverse at an "
            "actual positive-PF collision.  Far-left localization would do "
            "this once the three cubic rows are shown to have only the two "
            "outer root-count states available there."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
