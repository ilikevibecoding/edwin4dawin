#!/usr/bin/env python3
"""Symbolically expose the all-rank left gap-0 slack coefficients.

If q>=0 scales every positive-degree coefficient of the left minimal row by
1+q, this is exactly the permitted extra slack in its first ratio gap.  The
script keeps the three product terms T,L,R symbolic and records the exact
q-coefficients of the complete strong auxiliary.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_slack_symbolic_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def polar(left, right):
    return sp.expand(
        2 * left[1] * right[1]
        - left[0] * right[2] - left[2] * right[0]
        - left[0] * right[1] - left[1] * right[0]
    )


def main() -> int:
    k, x, y = sp.symbols("k x y", real=True)
    t = sp.Symbol("t", nonnegative=True)
    T, L, R = sp.symbols("T L R", positive=True)
    N = x + k
    M = y + k

    ws = (N + 1) * (M + 1) * T
    wl = (N + 1) * L
    wr = (M + 1) * R
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = (
        (ws - wl - wr) / (N * M),
        (ws * rs - wl * rl - wr * rr) / (N * M),
        (
            ws * rs * (rs - 1)
            - wl * rl * (rl - 1)
            - wr * rr * (rr - 1)
        ) / (N * M),
    )

    right_prev = (M + 1) * R / M
    right = (
        right_prev,
        right_prev * (y + 1),
        right_prev * y * (y + 1),
    )
    head = (
        right_prev * (
            1 + (k - 1) * (N + 1) / (y + 2)
            + ((k - 1) * (k - 2) / 2) * (N ** 2 - 1)
            / ((y + 2) * (y + 3))
        ),
        right_prev * (
            y + 1 + k * (N + 1)
            + (k * (k - 1) / 2) * (N ** 2 - 1) / (y + 2)
        ),
        right_prev * (
            y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
            + (k * (k + 1) / 2) * (N ** 2 - 1)
        ),
    )
    tail = tuple(sp.expand(c[index] - head[index]) for index in range(3))

    # Adding slack s to the first gap replaces a_i by (1+q)a_i for i>=1,
    # where q=s/(N+1).  Thus c(q)=c+q(c-b) and v(q)=(1+q)v.
    direction = tuple(sp.cancel(c[index] - right[index]) for index in range(3))
    # Expand by bilinearity instead of asking SymPy to expand the full
    # q-polynomial.  For M(z)=B(z,z)/2,
    # M(c+qd)=M(c)+qB(c,d)+q^2 M(d), while
    # B(c+qd,(1+q)v)=B(c,v)+q(B(c,v)+B(d,v))+q^2 B(d,v).
    q_coefficients = {
        1: (N - 2) * polar(c, direction) + polar(c, tail) + polar(direction, tail),
        2: (N - 2) * margin(direction) + polar(direction, tail),
    }

    coefficient_rows = []
    all_shift_positive = True
    payment_rows = []
    for degree in (1, 2):
        coefficient = sp.cancel(q_coefficients[degree] * (N * M) ** 2)
        product_poly = sp.Poly(coefficient, T, L, R)
        terms = []
        for monomial, product_coefficient in product_poly.terms():
            numerator, denominator = sp.fraction(sp.cancel(product_coefficient))
            shifted = sp.Poly(sp.expand(numerator.subs(k, t + 8)), t, x, y)
            values = [int(value) for _, value in shifted.terms()]
            sign = (
                "strictly_positive" if values and min(values) > 0
                else "nonnegative" if values and min(values) >= 0
                else "mixed_or_negative"
            )
            all_shift_positive &= sign in {"strictly_positive", "nonnegative"}
            terms.append({
                "product_monomial_TLR": list(monomial),
                "coefficient_factored": str(sp.factor(product_coefficient)),
                "denominator_factored": str(sp.factor(denominator)),
                "shifted_numerator_term_count": len(values),
                "shifted_numerator_minimum_coefficient": min(values),
                "shifted_numerator_sign": sign,
            })
        coefficient_rows.append({
            "q_degree": degree,
            "product_term_count": len(terms),
            "product_terms": terms,
        })
        print("Q_DEGREE", degree, "PRODUCT_TERMS", len(terms), flush=True)
        for item in terms:
            print(
                item["product_monomial_TLR"], item["shifted_numerator_sign"],
                item["shifted_numerator_minimum_coefficient"],
                item["coefficient_factored"], flush=True,
            )

        alpha = sp.cancel(product_poly.coeff_monomial(T * L))
        beta = sp.cancel(product_poly.coeff_monomial(T * R))
        gamma = sp.cancel(-product_poly.coeff_monomial(L * R))
        delta = sp.cancel(-product_poly.coeff_monomial(R ** 2))
        assert all(value != 0 for value in (alpha, beta, gamma, delta))
        ratio_lower = (
            1 + (k - 1) * N / M
            + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
            + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
        )
        payment_one = sp.cancel(alpha * ratio_lower - gamma)
        payment_two = sp.cancel(beta - delta)
        payment_record = {"q_degree": degree}
        for label, expression in (
            ("payment_one_cubic_ratio_lower", payment_one),
            ("payment_two_unit_ratio_lower", payment_two),
        ):
            numerator, denominator = sp.fraction(expression)
            shifted = sp.Poly(sp.expand(numerator.subs(k, t + 8)), t, x, y)
            values = [int(value) for _, value in shifted.terms()]
            payment_record[label] = {
                "denominator_factored": str(sp.factor(denominator)),
                "shifted_numerator_term_count": len(values),
                "shifted_numerator_minimum_coefficient": min(values),
                "shifted_numerator_negative_coefficients": sum(value < 0 for value in values),
            }
            print(
                "PAYMENT", degree, label, "TERMS", len(values),
                "MIN", min(values), "NEG", sum(value < 0 for value in values),
                "DEN", sp.factor(denominator), flush=True,
            )
        payment_rows.append(payment_record)

    payload = {
        "schema": "uniform-low-high-left-gap0-slack-symbolic-probe-root-v1",
        "status": (
            "PASS_ALL_PRODUCT_COEFFICIENT_NUMERATORS_SHIFT_NONNEGATIVE"
            if all_shift_positive else
            "PRODUCT_COEFFICIENT_PAYMENT_REQUIRED"
        ),
        "parameterization": "q=s/(x+k+1)>=0 for extra left gap-0 slack s",
        "identity": "c(q)=c+q(c-b), v(q)=(1+q)v",
        "positive_scale_removed": "((x+k)(y+k))^2",
        "q_coefficients": coefficient_rows,
        "pairwise_payment_probes": payment_rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Symbolic structural probe; product signs must still be proved and independently audited.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
