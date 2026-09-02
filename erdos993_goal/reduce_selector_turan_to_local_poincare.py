#!/usr/bin/env python3
"""Exact replay for a Poisson-binomial reduction of selector Turan positivity.

Write A_h=g_(M,s,h), B_h=g_(M-1,s,h), C_h=g_(M-2,s,h), and

    x_h=A_h/B_h,             y_h=B_h/C_h,
    Delta_h=y_h-y_(h+1),     d=floor(s/2).

Since C(t) is negative-rooted, the probability law proportional to C_h t^h
is Poisson-binomial.  For H with this law,

    (B(t)^2-A(t)C(t))/C(t)^2
      = E[y_H]^2-E[y_H x_H]
      = E[y_H(y_H-x_H)]-Var(y_H).

Efron--Stein and two elementary deletion identities reduce positivity to
the local, t-independent inequality

    y_h(y_h-x_h) >= 1/2 ((d-h) Delta_h^2
                              + h Delta_(h-1)^2).       (L)

Missing boundary differences are zero.  This file verifies (L) exactly
through a selectable layer and proves its h=0, h=1, h=2, and h=3 layers in all
orders by positive-coefficient expansions in the forest excess and both
parities.

The all-order Efron--Stein implication is proved in the accompanying
notebook.  The h=0, h=1, h=2, and h=3 layers are proved here; the all-order
proof of (L) for h>=4 remains an explicit lemma.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_selector_turan_fixedpoint_reduction import G
from prove_selector_normalized_ratio_reduction import polynomial_p


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_turan_local_poincare_reduction_exact_20260809.json"


def local_case(s: int, excess: int) -> dict[str, object]:
    d = s // 2
    M = 2 * s + 5 + excess
    current, previous, older = G(M, s), G(M - 1, s), G(M - 2, s)
    x = [Fraction(a, b) for a, b in zip(current, previous)]
    y = [Fraction(b, c) for b, c in zip(previous, older)]
    forward = [y[h] - y[h + 1] for h in range(d)]
    margins: list[Fraction] = []
    for h in range(d + 1):
        energy = Fraction(0)
        if h < d:
            energy += (d - h) * forward[h] ** 2
        if h > 0:
            energy += h * forward[h - 1] ** 2
        margin = y[h] * (y[h] - x[h]) - energy / 2
        assert margin > 0
        margins.append(margin)
    return {
        "s": s,
        "M": M,
        "forest_excess": excess,
        "degree": d,
        "strict_local_margins": len(margins),
        "minimum_margin": str(min(margins)),
    }


def ratio_from_p(h: int, rr: sp.Expr, ss: sp.Expr, P: sp.Expr) -> sp.Expr:
    return sp.cancel(
        (2 * rr + ss - 1)
        * (2 * rr + ss - 2)
        * P.subs({R: rr, S: ss})
        / (
            2
            * (rr + h - 1)
            * (2 * rr + 2 * h - 1)
            * P.subs({R: rr - 1, S: ss})
        )
    )


R, S, Q, D = sp.symbols("r s q d", integer=True, nonnegative=True)


def h0_symbolic_certificate() -> list[dict[str, object]]:
    P0 = polynomial_p(0).subs({sp.Symbol("r"): R, sp.Symbol("s"): S})
    P1 = polynomial_p(1).subs({sp.Symbol("r"): R, sp.Symbol("s"): S})
    # polynomial_p uses module-level symbols with the same names; direct
    # substitution above makes that dependence explicit for this replay.
    x0 = ratio_from_p(0, R, S, P0)
    y0 = ratio_from_p(0, R - 1, S, P0)
    y1 = ratio_from_p(1, R - 1, S, P1)
    expression = sp.cancel(y0 * (y0 - x0) - D * (y0 - y1) ** 2 / 2)

    records: list[dict[str, object]] = []
    for parity in (0, 1):
        shifted = sp.cancel(
            expression.subs(R, S + 5 + Q).subs(S, 2 * D + parity)
        )
        numerator, denominator = map(sp.factor, sp.together(shifted).as_numer_denom())
        numerator_poly = sp.Poly(sp.expand(numerator), Q, D)
        denominator_poly = sp.Poly(sp.expand(denominator), Q, D)
        assert all(value >= 0 for value in numerator_poly.coeffs())
        assert all(value > 0 for value in denominator_poly.coeffs())
        assert numerator != 0
        records.append(
            {
                "parity": parity,
                "numerator_terms": len(numerator_poly.terms()),
                "denominator_terms": len(denominator_poly.terms()),
                "minimum_numerator_coefficient": str(min(numerator_poly.coeffs())),
                "positive_coefficient_certificate": True,
            }
        )
    return records


def fixed_layer_symbolic_certificate(h: int) -> list[dict[str, object]]:
    """Prove one fixed positive h layer in both parities and both regimes."""
    k = sp.symbols("k", integer=True, nonnegative=True)
    polynomials = [polynomial_p(index) for index in range(h + 2)]

    def one_ratio(index: int, rr: sp.Expr, ss: sp.Expr) -> sp.Expr:
        P = polynomials[index]
        return sp.factor(
            (2 * rr + ss - 1)
            * (2 * rr + ss - 2)
            * P.subs({R: rr, S: ss})
            / (
                2
                * (rr + index - 1)
                * (2 * rr + 2 * index - 1)
                * P.subs({R: rr - 1, S: ss})
            )
        )

    records: list[dict[str, object]] = []
    for top_boundary in (False, True):
        for parity in (0, 1):
            degree = sp.Integer(h) if top_boundary else h + k + 1
            ss = 2 * degree + parity
            rr = ss + 5 + Q
            x = one_ratio(h, rr, ss)
            y = one_ratio(h, rr - 1, ss)
            backward = one_ratio(h - 1, rr - 1, ss) - y
            expression = y * (y - x) - sp.Rational(h, 2) * backward**2
            if not top_boundary:
                forward = y - one_ratio(h + 1, rr - 1, ss)
                expression -= sp.Rational(1, 2) * (degree - h) * forward**2
            numerator, denominator = map(
                sp.factor, sp.together(expression).as_numer_denom()
            )
            variables = (Q,) if top_boundary else (Q, k)
            numerator_poly = sp.Poly(sp.expand(numerator), *variables)
            denominator_poly = sp.Poly(sp.expand(denominator), *variables)
            assert all(value > 0 for value in numerator_poly.coeffs())
            assert all(value > 0 for value in denominator_poly.coeffs())
            records.append(
                {
                    "h": h,
                    "parity": parity,
                    "top_boundary": top_boundary,
                    "numerator_terms": len(numerator_poly.terms()),
                    "denominator_terms": len(denominator_poly.terms()),
                    "minimum_numerator_coefficient": str(min(numerator_poly.coeffs())),
                    "positive_coefficient_certificate": True,
                }
            )
    return records


def bernoulli_deletion_replay() -> dict[str, object]:
    probabilities = [Fraction(1, 7), Fraction(2, 7), Fraction(4, 9), Fraction(5, 8)]
    d = len(probabilities)

    def convolution(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
        out = [Fraction(0)] * (len(left) + len(right) - 1)
        for i, a in enumerate(left):
            for j, b in enumerate(right):
                out[i + j] += a * b
        return out

    mu = [Fraction(1)]
    for p in probabilities:
        mu = convolution(mu, [1 - p, p])

    checks = 0
    for h in range(d):
        conductance = Fraction(0)
        occupied = Fraction(0)
        unoccupied = Fraction(0)
        for j, p in enumerate(probabilities):
            deleted = [Fraction(1)]
            for k, q in enumerate(probabilities):
                if k != j:
                    deleted = convolution(deleted, [1 - q, q])
            conductance += p * (1 - p) * deleted[h]
            occupied += p * deleted[h]
            unoccupied += (1 - p) * deleted[h]
        assert occupied == (h + 1) * mu[h + 1]
        assert unoccupied == (d - h) * mu[h]
        assert conductance <= occupied
        assert conductance <= unoccupied
        checks += 4
    return {
        "rational_probabilities": [str(value) for value in probabilities],
        "exact_deletion_identity_and_bound_checks": checks,
    }


def turan_expectation_replay() -> int:
    checks = 0
    for s in (2, 3, 6, 11, 20):
        for excess in (0, 5, 17):
            M = 2 * s + 5 + excess
            current, previous, older = G(M, s), G(M - 1, s), G(M - 2, s)
            for t in (Fraction(1, 7), Fraction(1), Fraction(19, 3)):
                weights = [Fraction(value) * t**h for h, value in enumerate(older)]
                partition = sum(weights)
                mu = [value / partition for value in weights]
                x = [Fraction(a, b) for a, b in zip(current, previous)]
                y = [Fraction(b, c) for b, c in zip(previous, older)]
                mean_y = sum(probability * value for probability, value in zip(mu, y))
                mean_yx = sum(
                    probability * yy * xx
                    for probability, yy, xx in zip(mu, y, x)
                )
                mean_y2 = sum(probability * value**2 for probability, value in zip(mu, y))
                variance = mean_y2 - mean_y**2
                expectation_form = sum(
                    probability * yy * (yy - xx)
                    for probability, yy, xx in zip(mu, y, x)
                ) - variance
                assert expectation_form == mean_y**2 - mean_yx

                eval_current = sum(Fraction(value) * t**h for h, value in enumerate(current))
                eval_previous = sum(Fraction(value) * t**h for h, value in enumerate(previous))
                eval_older = sum(Fraction(value) * t**h for h, value in enumerate(older))
                direct = (eval_previous**2 - eval_current * eval_older) / eval_older**2
                assert direct == expectation_form
                checks += 2
    return checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=150)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    excesses = (0, 1, 5, 17, 73, 200)
    records = [
        local_case(s, excess)
        for s in range(2, args.max_layer + 1)
        for excess in excesses
    ]
    h0_records = h0_symbolic_certificate()
    fixed_layer_records = [
        record
        for h in (1, 2, 3)
        for record in fixed_layer_symbolic_certificate(h)
    ]
    deletion = bernoulli_deletion_replay()
    expectation_checks = turan_expectation_replay()
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_TURAN_LOCAL_POINCARE_REDUCTION_REPLAY",
        "all_order_reduction": [
            "negative-rooted C(t) makes its tilted coefficient law Poisson-binomial",
            "the normalized Turan gap equals E[y(y-x)]-Var(y)",
            "Efron-Stein plus deletion identities bounds Var(y) by the half-weighted adjacent difference energy",
            "the displayed local inequality at every h therefore implies strict Turan positivity for every t>0",
            "the h=0 local inequality is proved in both parities by positive coefficients",
            "the h=1 local inequality is proved in both parities, in the interior and at the top boundary",
            "the h=2 local inequality is proved in both parities, in the interior and at the top boundary",
            "the h=3 local inequality is proved in both parities, in the interior and at the top boundary",
        ],
        "symbolic_h0_certificate": h0_records,
        "symbolic_fixed_layer_certificates": fixed_layer_records,
        "finite_local_lemma_scope": {
            "layers": [2, args.max_layer],
            "forest_excesses": list(excesses),
            "cases": len(records),
            "strict_local_margins": sum(record["strict_local_margins"] for record in records),
        },
        "bernoulli_deletion_replay": deletion,
        "exact_turan_expectation_identity_checks": expectation_checks,
        "remaining_target": (
            "Prove the local Poincare-dominance inequality in all orders for 4<=h<=floor(s/2); "
            "its h=0, h=1, h=2, and h=3 layers are already proved here."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                "cases": len(records),
                "strict_local_margins": report["finite_local_lemma_scope"]["strict_local_margins"],
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
