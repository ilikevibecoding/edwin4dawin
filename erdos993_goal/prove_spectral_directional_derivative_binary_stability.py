"""Exact replay for the spectral directional-derivative stability lemma."""

from __future__ import annotations

import hashlib
import json
import random
from fractions import Fraction
from math import lcm
from pathlib import Path

from flint import ctx, fmpz_poly

from verify_aligned_endpoint_three_ray_reduction import add, gamma_from_palindromic


HERE = Path(__file__).resolve().parent
REPORT = HERE / "spectral_directional_derivative_binary_stability_exact_20260813.json"
ctx.prec = 180


def multiply(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return out


def spectrum_polynomial(lambdas: list[Fraction]) -> list[Fraction]:
    out = [Fraction(1)]
    for value in lambdas:
        out = multiply(out, [Fraction(1), value])
    return out


def directional_polynomial(
    lambdas: list[Fraction], directions: list[Fraction]
) -> list[Fraction]:
    answer = [Fraction(0)] * len(lambdas)
    for i, direction in enumerate(directions):
        deleted = spectrum_polynomial(lambdas[:i] + lambdas[i + 1 :])
        answer = add(answer, deleted, direction)
    return [Fraction(0)] + answer


def binary_row(left: list[Fraction], right: list[Fraction], s: int) -> list[Fraction]:
    return [
        (left[i] if i < len(left) else 0)
        * (right[s - i] if 0 <= s - i < len(right) else 0)
        for i in range(s + 1)
    ]


def integer_poly(poly: list[Fraction]) -> fmpz_poly:
    denominator = 1
    for value in poly:
        denominator = lcm(denominator, value.denominator)
    return fmpz_poly([
        value.numerator * (denominator // value.denominator) for value in poly
    ])


def real_negative_rooted(poly: list[Fraction]) -> bool:
    while len(poly) > 1 and poly[0] == 0:
        poly = poly[1:]
    while len(poly) > 1 and poly[-1] == 0:
        poly = poly[:-1]
    roots = integer_poly(poly).complex_roots()
    return all(root.imag.contains(0) and float(root.real.mid()) < 0 for root, _ in roots)


def main() -> None:
    rng = random.Random(20260813)
    identity_checks = gamma_checks = pencil_checks = 0
    for n in range(2, 13):
        for trial in range(20):
            lambdas = [
                Fraction(rng.randint(1, 50), rng.randint(1, 20)) for _ in range(n)
            ]
            directions = [
                Fraction(rng.randint(0, 30), rng.randint(1, 20)) for _ in range(n)
            ]
            if not any(directions):
                directions[0] = Fraction(1)
            P = spectrum_polynomial(lambdas)
            Q = directional_polynomial(lambdas, directions)
            for s in range(1, 2 * n):
                base = binary_row(P, P, s)
                derivative = add(binary_row(Q, P, s), binary_row(P, Q, s))

                # Direct coefficient derivative under lambda_i -> lambda_i+eps delta_i.
                direct = [Fraction(0)] * (s + 1)
                for i, direction in enumerate(directions):
                    deleted = spectrum_polynomial(lambdas[:i] + lambdas[i + 1 :])
                    dP = [Fraction(0)] + [direction * x for x in deleted]
                    direct = add(
                        direct,
                        add(binary_row(dP, P, s), binary_row(P, dP, s)),
                    )
                assert derivative == direct
                assert derivative == list(reversed(derivative))
                identity_checks += 1

                derivative_gamma = gamma_from_palindromic(derivative)
                assert real_negative_rooted(derivative_gamma)
                gamma_checks += 1
                base_gamma = gamma_from_palindromic(base)
                for weight in (Fraction(1, 1000), Fraction(1), Fraction(1000)):
                    assert real_negative_rooted(add(base_gamma, derivative_gamma, weight))
                    pencil_checks += 1

    payload = {
        "status": "PASS_EXACT_SPECTRAL_DIRECTIONAL_DERIVATIVE_STABILITY_REPLAY",
        "identity_checks": identity_checks,
        "negative_rooted_derivative_gamma_checks": gamma_checks,
        "base_derivative_positive_pencil_checks": pencil_checks,
        "all_order_lemma": (
            "For P(z)=product_i(1+lambda_i z), lambda_i>0, and delta_i>=0, "
            "D_delta(P(z)P(w))=P(z)P(w)(L(z)+L(w)), where "
            "L(z)=sum_i delta_i z/(1+lambda_i z). Since each summand maps "
            "the upper half-plane into itself, every fixed-total-degree "
            "binary component is stable; its symmetric gamma polynomial is "
            "negative-rooted, as is every positive pencil with the base slice."
        ),
        "remaining_endpoint_target": (
            "For K_c equal to the sum of the full Jacobi block and u times "
            "its principal-minor block, prove compatibility between the two "
            "separately negative-rooted block derivatives."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
