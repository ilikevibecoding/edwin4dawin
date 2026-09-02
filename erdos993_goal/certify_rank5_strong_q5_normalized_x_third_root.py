#!/usr/bin/env python3
"""Exact normalized strong-Q5 payment certificate for X<=1/3.

On the terminal rank-five domain put

    X=d/e,  D=1-df/e^2,  r=h/d,  q=k/e,

where d,e,f are the rank 3,4,5 coefficients of the support-deleted
forest and h,k are the rooted correction coefficients.  The ordinary
rooted payment is M=5e^4 Phi.  Preservation of

    Q5 >= i4*i5/5

requires the sharper local inequality

    M >= (e+h)d e(e+h+d).

After normalization this is

    Phi >= X(1+Xr)(1+X+Xr)/5.

This verifier checks that inequality exactly on the full normalized domain
when 0<=X<=1/3.  Concavity reduces the domain to eight endpoint
polynomials, all of whose tensor Bernstein coefficients are nonnegative.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank5_leaf_induction_reduction import rooted_payment
from verify_rank5_normalized_algebra_lemma import D, PHI, X, q, r, rm, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_strong_q5_normalized_x_third_exact_root_20260826.json"
CAP = sp.Rational(1, 3)
TARGET = sp.Rational(1, 5) * X * (1 + X * r) * (1 + X + X * r)
PSI = sp.expand(PHI - TARGET)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_strong_normalization() -> str:
    d, e, f, h, k = sp.symbols("d e f h k", positive=True)
    payment = rooted_payment(e + h, f + k, d, e, f)
    required = (e + h) * d * e * (e + h + d)
    normalized = PSI.subs(
        {
            X: d / e,
            D: 1 - d * f / e**2,
            r: h / d,
            q: k / e,
        },
        simultaneous=True,
    )
    assert sp.factor(payment - required - 5 * e**4 * normalized) == 0
    return "M-(e+h)*d*e*(e+h+d)=5*e^4*Psi"


def verify_calculus_reduction() -> dict[str, str]:
    assert sp.diff(PSI, q, 2) == -20 * X**2
    half = sp.expand(PSI.subs(q, sp.Rational(1, 2)))
    curved = sp.expand(PSI.subs(q, r - D / 2))
    upper = sp.expand(PSI.subs(q, 1))
    assert sp.diff(half, D, 2) == -20
    assert sp.factor(sp.diff(curved, D, 2)) == -5 * (X + 2) ** 2
    assert sp.expand(half.subs(D, 2 * r - 1) - curved.subs(D, 2 * r - 1)) == 0
    assert sp.diff(upper, D, 2) == -20
    upper_r_second = sp.factor(sp.diff(upper, r, 2))
    expected_upper_r_second = -sp.Rational(12, 5) * X**2 * (
        10 * (1 - D) + X
    )
    assert sp.expand(upper_r_second - expected_upper_r_second) == 0
    return {
        "q_second_derivative": str(sp.diff(PSI, q, 2)),
        "half_branch_D_second_derivative": str(sp.diff(half, D, 2)),
        "curved_branch_D_second_derivative": str(sp.factor(sp.diff(curved, D, 2))),
        "upper_branch_D_second_derivative": str(sp.diff(upper, D, 2)),
        "upper_branch_r_second_derivative": str(upper_r_second),
    }


def endpoint_polynomials() -> dict[str, sp.Expr]:
    D0 = (2 + X) / 10
    r_first = sp.Rational(1, 2) + z / 2
    r_between = sp.Rational(1, 2) + (rm - sp.Rational(1, 2)) * z
    r_last = rm + (1 - rm) * z
    substitutions = {
        "P1": {D: 1, q: sp.Rational(1, 2), r: r_first},
        "P2": {D: D0, q: sp.Rational(1, 2), r: r_between},
        "P3": {D: 2 * r_last - 1, q: sp.Rational(1, 2), r: r_last},
        "C2": {D: D0, q: r_last - D0 / 2, r: r_last},
    }
    for d_name, d_value in (("D0", D0), ("D1", sp.S.One)):
        for r_name, r_value in (
            ("rhalf", sp.Rational(1, 2)),
            ("r1", sp.S.One),
        ):
            substitutions[f"Q1_{d_name}_{r_name}"] = {
                D: d_value,
                q: 1,
                r: r_value,
            }

    endpoints = {}
    for name, substitution in substitutions.items():
        rational = sp.cancel(PSI.subs(substitution, simultaneous=True))
        numerator, denominator = sp.fraction(rational)
        assert denominator.is_positive is not False
        endpoints[name] = sp.factor(numerator)
    assert len(endpoints) == 8
    return endpoints


def certify_endpoints() -> list[dict[str, object]]:
    rows = []
    for name, endpoint in endpoint_polynomials().items():
        polynomial = sp.expand(endpoint.subs(X, CAP * X))
        degrees, coefficients = tensor_bernstein_fast(polynomial, (X, z))
        minimum, index = minimum_with_index(coefficients)
        negatives = sum(1 for value in coefficients.flat if bool(value < 0))
        zeros = sum(1 for value in coefficients.flat if bool(value == 0))
        assert negatives == 0 and minimum >= 0
        rows.append({
            "endpoint": name,
            "degrees": [int(value) for value in degrees],
            "Bernstein_coefficients": int(coefficients.size),
            "negative_coefficients": negatives,
            "zero_coefficients": zeros,
            "minimum_coefficient": str(minimum),
            "minimum_index": [int(value) for value in index],
            "ordered_coefficients_sha256": hashlib.sha256(
                "\n".join(str(value) for value in coefficients.flat).encode("ascii")
            ).hexdigest().upper(),
        })
    return rows


def main() -> int:
    normalization = verify_strong_normalization()
    calculus = verify_calculus_reduction()
    rows = certify_endpoints()
    dependencies = {
        "verify_rank5_leaf_induction_reduction.py": sha256(
            HERE / "verify_rank5_leaf_induction_reduction.py"
        ),
        "verify_rank5_normalized_algebra_lemma.py": sha256(
            HERE / "verify_rank5_normalized_algebra_lemma.py"
        ),
        "explore_rank4_three_halves_grouped.py": sha256(
            HERE / "explore_rank4_three_halves_grouped.py"
        ),
    }
    payload = {
        "schema": "rank5-strong-q5-normalized-x-third-root-v1",
        "status": "PASS_EXACT_RANK5_STRONG_Q5_NORMALIZED_PAYMENT_X_AT_MOST_ONE_THIRD",
        "theorem": (
            "On 0<=X<=1/3, (2+X)/10<=D<=1, 1/2<=r<=1, "
            "1/2<=q<=1, and q>=r-D/2, the normalized payment satisfies "
            "Phi>=X(1+Xr)(1+X+Xr)/5. Equivalently "
            "M>=(e+h)*d*e*(e+h+d)."
        ),
        "domain": [
            "0<=X<=1/3",
            "(2+X)/10<=D<=1",
            "1/2<=r<=1",
            "1/2<=q<=1",
            "q>=r-D/2",
        ],
        "normalization_identity": normalization,
        "calculus_reduction": calculus,
        "endpoint_certificates": rows,
        "coverage": {
            "endpoints": len(rows),
            "Bernstein_coefficients": sum(
                row["Bernstein_coefficients"] for row in rows
            ),
            "negative_coefficients": sum(
                row["negative_coefficients"] for row in rows
            ),
        },
        "immutable_inputs": dependencies,
        "software": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the normalized terminal payment on the X<=1/3 tail. "
            "An all-order strong-Q5 theorem additionally needs the finite induction, "
            "the forest ratio tail, and the leaf-preservation assembly."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("ENDPOINTS", payload["coverage"]["endpoints"])
    print("COEFFICIENTS", payload["coverage"]["Bernstein_coefficients"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
