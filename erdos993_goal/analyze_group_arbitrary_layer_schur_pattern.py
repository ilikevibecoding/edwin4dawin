#!/usr/bin/env python3
"""Test the uniform Schur-tail coupling pattern beyond the proved layers."""

from __future__ import annotations

import argparse
import gc
import gzip
import json
from pathlib import Path

import sympy as sp
from flint import fmpq

from derive_group_fifth_homogeneous_tail_schur_flint import (
    A,
    CTX,
    ONE,
    Q,
    ZERO,
    Rat,
    falling,
    polynomial_add,
    polynomial_scale,
    polynomial_y_minus,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_arbitrary_layer_schur_pattern_20260804.json"
TERMINAL_CHECKPOINT: Path | None = None
TERMINAL_UNREDUCED = False


def write_polynomial(handle, label: str, polynomial) -> None:
    handle.write(f"{label}\t{len(polynomial)}\n")
    for position in range(len(polynomial)):
        monomial = polynomial.monomial(position)
        coefficient = polynomial.coefficient(position)
        handle.write(
            f"{monomial[0]},{monomial[1]}\t{coefficient}\n"
        )


def write_terminal_checkpoint(diagonal: Rat, constant: Rat, base: Rat) -> None:
    if TERMINAL_CHECKPOINT is None:
        return
    with gzip.open(TERMINAL_CHECKPOINT, "wt", encoding="utf-8") as handle:
        handle.write("S10_TERMINAL_RATIONAL_CHECKPOINT_V1\n")
        for label, value in (
            ("diagonal", diagonal),
            ("constant", constant),
            ("base", base),
        ):
            write_polynomial(handle, f"{label}.num", value.num)
            write_polynomial(handle, f"{label}.den", value.den)


def choose_fixed(top: sp.Expr, bottom: int) -> sp.Expr:
    if bottom < 0:
        return sp.S.Zero
    return sp.prod(top - h for h in range(bottom)) / sp.factorial(bottom)


def derive_selector(layer: int) -> tuple[sp.Symbol, sp.Symbol, list[sp.Expr]]:
    degree = layer // 2 + 2
    p, alpha = sp.symbols("p alpha", integer=True, positive=True)
    N = p + alpha
    values = []
    for j in range(degree + 1):
        defect = sp.S.Zero
        for deletion, sign in enumerate((1, -2, 1)):
            M = N - deletion
            for i in range(layer + 1):
                defect += (
                    sign
                    * choose_fixed(2 * M - i - 1, i)
                    * choose_fixed(2 * M - layer + i - 1, layer - i)
                    * choose_fixed(
                        p - layer - 2 * deletion,
                        i + j - layer - deletion,
                    )
                )
        values.append(sp.cancel(defect / choose_fixed(p, j)))
    nodes = [j * (p - j) for j in range(degree + 1)]
    coefficients: list[sp.Expr] = []
    for j in range(degree + 1):
        remainder = values[j] - sum(
            coefficients[h] * sp.prod(nodes[j] - nodes[k] for k in range(h))
            for h in range(j)
        )
        coefficients.append(
            sp.cancel(
                remainder / sp.prod(nodes[j] - nodes[k] for k in range(j))
            )
        )
    return p, alpha, coefficients


def flint_poly(poly: sp.Poly):
    return CTX.from_dict(
        {
            monomial: fmpq(str(coefficient))
            for monomial, coefficient in poly.terms()
        }
    )


def rat_from_sympy(expression: sp.Expr, alpha: sp.Symbol, slack: sp.Symbol) -> Rat:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    numerator_poly = sp.Poly(numerator, alpha, slack, domain=sp.QQ)
    denominator_poly = sp.Poly(denominator, alpha, slack, domain=sp.QQ)
    return Rat(flint_poly(numerator_poly), flint_poly(denominator_poly))


def upper_selector(layer: int) -> list[Rat]:
    p_symbol, alpha_symbol, coefficients = derive_selector(layer)
    a, q = sp.symbols("alpha slack", nonnegative=True, integer=True)
    p_value = a + q + 2 * layer + 5
    return [
        rat_from_sympy(
            coefficient.subs({p_symbol: p_value, alpha_symbol: a}), a, q
        )
        for coefficient in coefficients
    ]


def derive_tail(layer: int, selector: list[Rat], parity: str = "even"):
    tail_order = layer // 2 + 2
    bandwidth = tail_order + 1
    p = A + Q + 2 * layer + 5
    if parity not in ("even", "odd"):
        raise ValueError(parity)
    n = p / 2 if parity == "even" else (p - 1) / 2
    alpha = A
    beta = Rat(fmpq(-1, 2) if parity == "even" else fmpq(1, 2))
    ambient = p + alpha

    def top_coefficients(k: Rat):
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = k * (k - 1) * (k + alpha - 1) * (k + alpha) / (
            2 * (2 * k + total - 1) * (2 * k + total)
        )
        return c, e

    def recurrence(k: Rat):
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        return diagonal, e - e_next - diagonal * c

    actions = []
    for j in range(bandwidth):
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = Rat(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (k - 1) * c + (j + 2) * e - upper * e_next - diagonal * c
        actions.append((upper, diagonal, lower))
    falling_vectors = [[ONE] + [ZERO] * (bandwidth - 1)]
    for shift in range(bandwidth - 1):
        output = [ZERO] * bandwidth
        for j, coefficient in enumerate(falling_vectors[-1]):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < bandwidth - 1:
                output[j + 1] += coefficient * lower
        falling_vectors.append(output)
    vector = [
        sum(
            (
                selector[h]
                * falling(ambient, h)
                * falling_vectors[h][index]
                for h in range(bandwidth)
            ),
            ZERO,
        )
        for index in range(bandwidth)
    ]
    connection = [value / vector[0] for value in vector]

    m = n - tail_order
    U_previous, U = [ZERO], [ONE]
    V_previous, V = [-ONE], [ZERO]
    U_values, V_values = [U], [V]
    for step in range(tail_order):
        diagonal, subdiagonal = recurrence(m + step)
        U_next = polynomial_add(
            polynomial_y_minus(U, diagonal),
            polynomial_scale(U_previous, -subdiagonal),
        )
        V_next = polynomial_add(
            polynomial_y_minus(V, diagonal),
            polynomial_scale(V_previous, -subdiagonal),
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    tail_A, tail_B = [ZERO], [ZERO]
    for j in range(bandwidth):
        tail_A = polynomial_add(
            tail_A, polynomial_scale(U_values[tail_order - j], connection[j])
        )
        tail_B = polynomial_add(
            tail_B, polynomial_scale(V_values[tail_order - j], connection[j])
        )
    tail_B = [value / tail_B[-1] for value in tail_B]
    return tail_A, tail_B


def one_layer(layer: int) -> dict[str, object]:
    selector = upper_selector(layer)
    tail_A, tail_B = derive_tail(layer, selector)
    simple_records = []
    nonsimple_records = []
    simple_phase = True
    next_polynomial = tail_A
    current = tail_B
    del selector, tail_A, tail_B
    index = 0
    while len(current) > 1:
        degree = len(current) - 1
        diagonal = current[degree - 1] - next_polynomial[degree]
        terminal_denominator_factors = None
        if degree == 1:
            # For current=y+c0 and next=y^2+b1*y+b0, the y terms cancel.
            # Form only b1*c0-c0^2-b0, avoiding huge zero intermediates.
            write_terminal_checkpoint(diagonal, current[0], next_polynomial[0])
            if TERMINAL_UNREDUCED:
                # A positive common denominator is
                # diagonal.den*current.den*base.den.  Form only its
                # numerator, with no multivariate gcd normalization.
                first = -(
                    diagonal.num
                    * current[0].num
                    * next_polynomial[0].den
                )
                second = (
                    next_polynomial[0].num
                    * diagonal.den
                    * current[0].den
                )
                terminal_numerator = first - second
                coupling = None
                terminal_denominator_factors = [
                    diagonal.den,
                    current[0].den,
                    next_polynomial[0].den,
                ]
            else:
                coupling = -(diagonal * current[0]) - next_polynomial[0]
            residual = None
            previous = [ONE]
        else:
            residual = polynomial_add(
                polynomial_y_minus(current, diagonal),
                polynomial_scale(next_polynomial, -1),
            )
            coupling = residual[degree - 1]
            assert coupling
            previous = [value / coupling for value in residual]
            while len(previous) > 1 and not previous[-1]:
                previous.pop()
            assert len(previous) == degree and previous[-1].num == previous[-1].den
        assert coupling or terminal_denominator_factors is not None

        t = 2 * index + 2 * ((layer + 1) // 2) + 2
        expected = (
            (A + Q + t)
            * (A + Q + t + 1)
            * (3 * A + Q + t)
            * (3 * A + Q + t + 1)
            / (
                (4 * A + 2 * Q + 2 * t - 1)
                * (4 * A + 2 * Q + 2 * t + 1) ** 2
                * (4 * A + 2 * Q + 2 * t + 3)
            )
        )
        difference = coupling - expected if simple_phase else None
        if simple_phase and not difference:
            simple_records.append({"index": index, "t": t, "identity": True})
        else:
            simple_phase = False
            numerator = (
                terminal_numerator
                if terminal_denominator_factors is not None
                else coupling.num
            )
            numerator_terms = len(numerator)
            denominator_terms = (
                None
                if terminal_denominator_factors is not None
                else len(coupling.den)
            )
            numerator_positive = all(
                numerator.coefficient(position) > 0
                for position in range(numerator_terms)
            )
            if terminal_denominator_factors is None:
                denominator_positive = all(
                    coupling.den.coefficient(position) > 0
                    for position in range(denominator_terms)
                )
                denominator_factor_terms = None
            else:
                denominator_positive = all(
                    factor.coefficient(position) > 0
                    for factor in terminal_denominator_factors
                    for position in range(len(factor))
                )
                denominator_factor_terms = [
                    len(factor) for factor in terminal_denominator_factors
                ]
            nonsimple_records.append(
                {
                    "index": index,
                    "numerator_terms": numerator_terms,
                    "denominator_terms": denominator_terms,
                    "numerator_coefficientwise_positive": numerator_positive,
                    "denominator_coefficientwise_positive": denominator_positive,
                    "unreduced_common_denominator_certificate": (
                        terminal_denominator_factors is not None
                    ),
                    "denominator_factor_terms": denominator_factor_terms,
                }
            )
            print(
                "coupling",
                index,
                numerator_terms,
                denominator_terms,
                numerator_positive,
                denominator_positive,
                flush=True,
            )
            assert numerator_positive and denominator_positive
        next_polynomial, current = current, previous
        index += 1
        del residual, coupling, expected, difference, previous
        gc.collect()
    return {
        "layer_deficit": layer,
        "tail_order": layer // 2 + 2,
        "simple_couplings": simple_records,
        "nonsimple_couplings": nonsimple_records,
    }


def main() -> None:
    global TERMINAL_CHECKPOINT, TERMINAL_UNREDUCED
    parser = argparse.ArgumentParser()
    parser.add_argument("--first", type=int, default=4)
    parser.add_argument("--last", type=int, default=10)
    parser.add_argument("--output", type=Path, default=REPORT)
    parser.add_argument("--terminal-checkpoint", type=Path)
    parser.add_argument("--terminal-unreduced", action="store_true")
    args = parser.parse_args()
    TERMINAL_CHECKPOINT = args.terminal_checkpoint
    TERMINAL_UNREDUCED = args.terminal_unreduced
    records = []
    for layer in range(args.first, args.last + 1):
        record = one_layer(layer)
        records.append(record)
        print(
            layer,
            len(record["simple_couplings"]),
            [
                (
                    item["numerator_terms"],
                    item["denominator_terms"],
                    item["numerator_coefficientwise_positive"],
                )
                for item in record["nonsimple_couplings"]
            ],
            flush=True,
        )
    report = {
        "status": "ARBITRARY_LAYER_SCHUR_PATTERN_AUDIT",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
