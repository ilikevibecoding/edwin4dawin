#!/usr/bin/env python3
"""Exact positive-Jacobi audit of all boundary families for one layer."""

from __future__ import annotations

import argparse
import gc
import json
from pathlib import Path

import sympy as sp
from flint import fmpq

from analyze_group_arbitrary_layer_schur_pattern import (
    derive_selector,
    rat_from_sympy,
)
from analyze_group_schur_tail_jacobi_parameters import extract
from derive_group_fifth_homogeneous_tail_schur_flint import (
    A,
    ONE,
    Q,
    ZERO,
    Rat,
    falling,
    polynomial_add,
    polynomial_scale,
    polynomial_y_minus,
    product,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_ninth_homogeneous_boundary_jacobi_20260804.json"
LAYER = 8
TAIL_ORDER = 6
BANDWIDTH = 7


def selector_at(
    p_symbol: sp.Symbol,
    alpha_symbol: sp.Symbol,
    coefficients: list[sp.Expr],
    p_value: sp.Expr,
    alpha_value: sp.Expr,
    a: sp.Symbol,
    q: sp.Symbol,
) -> list[Rat]:
    return [
        rat_from_sympy(
            coefficient.subs(
                {p_symbol: p_value, alpha_symbol: alpha_value}
            ),
            a,
            q,
        )
        for coefficient in coefficients
    ]


def shifted_boundary_selector(
    offset: int,
    parity: str,
    minimum: int,
    symbolic_selector: tuple[sp.Symbol, sp.Symbol, list[sp.Expr]],
) -> tuple[Rat, Rat, Rat, list[Rat]]:
    p_symbol, alpha_symbol, coefficients = symbolic_selector
    a, q = sp.symbols("alpha slack", nonnegative=True, integer=True)
    parity_bit = 0 if parity == "even" else 1
    n = Q + minimum
    p = 2 * n + parity_bit
    p_expression = 2 * (q + minimum) + parity_bit
    kshift = LAYER - offset
    formal_selector = selector_at(
        p_symbol,
        alpha_symbol,
        coefficients,
        p_expression + 2 * kshift,
        -kshift,
        a,
        q,
    )
    formal_p = p + 2 * kshift
    ambient = p + kshift
    formal_nodes = [Rat(j) * (formal_p - j) for j in range(BANDWIDTH)]
    residual_nodes = [Rat(j) * (p - j) for j in range(BANDWIDTH)]
    values = []
    for h in range(BANDWIDTH):
        point = kshift * ambient + residual_nodes[h]
        values.append(
            sum(
                (
                    formal_selector[order]
                    * product(point - formal_nodes[j] for j in range(order))
                    for order in range(BANDWIDTH)
                ),
                ZERO,
            )
        )
    shifted: list[Rat] = []
    for h in range(BANDWIDTH):
        remainder = values[h] - sum(
            (
                shifted[order]
                * product(
                    residual_nodes[h] - residual_nodes[j]
                    for j in range(order)
                )
                for order in range(h)
            ),
            ZERO,
        )
        shifted.append(
            remainder
            / product(
                residual_nodes[h] - residual_nodes[j] for j in range(h)
            )
        )
    return p, n, Rat(kshift), shifted


def derive_tail(
    p: Rat,
    n: Rat,
    alpha: Rat,
    beta: Rat,
    selector: list[Rat],
) -> tuple[list[Rat], list[Rat]]:
    ambient = p + alpha

    def top_coefficients(k: Rat) -> tuple[Rat, Rat]:
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = k * (k - 1) * (k + alpha - 1) * (k + alpha) / (
            2 * (2 * k + total - 1) * (2 * k + total)
        )
        return c, e

    def recurrence(k: Rat) -> tuple[Rat, Rat]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        return diagonal, e - e_next - diagonal * c

    actions = []
    for j in range(BANDWIDTH):
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = Rat(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (
            (k - 1) * c
            + (j + 2) * e
            - upper * e_next
            - diagonal * c
        )
        actions.append((upper, diagonal, lower))
    falling_vectors = [[ONE] + [ZERO] * (BANDWIDTH - 1)]
    for shift in range(BANDWIDTH - 1):
        output = [ZERO] * BANDWIDTH
        for j, coefficient in enumerate(falling_vectors[-1]):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < BANDWIDTH - 1:
                output[j + 1] += coefficient * lower
        falling_vectors.append(output)
    vector = [
        sum(
            (
                selector[h]
                * falling(ambient, h)
                * falling_vectors[h][index]
                for h in range(BANDWIDTH)
            ),
            ZERO,
        )
        for index in range(BANDWIDTH)
    ]
    connection = [value / vector[0] for value in vector]
    m = n - TAIL_ORDER
    U_previous, U = [ZERO], [ONE]
    V_previous, V = [-ONE], [ZERO]
    U_values, V_values = [U], [V]
    for step in range(TAIL_ORDER):
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
    for j in range(BANDWIDTH):
        tail_A = polynomial_add(
            tail_A,
            polynomial_scale(U_values[TAIL_ORDER - j], connection[j]),
        )
        tail_B = polynomial_add(
            tail_B,
            polynomial_scale(V_values[TAIL_ORDER - j], connection[j]),
        )
    assert len(tail_A) == TAIL_ORDER + 1
    assert len(tail_B) == TAIL_ORDER
    tail_B = [value / tail_B[-1] for value in tail_B]
    return tail_A, tail_B


def boundary_minimum(offset: int, parity: str) -> int:
    threshold = 3 * offset + 5 - LAYER
    cone_minimum = (
        (threshold + 1) // 2 if parity == "even" else threshold // 2
    )
    return max(TAIL_ORDER + 1, cone_minimum)


def audit_polynomial(polynomial) -> tuple[int, bool]:
    count = len(polynomial)
    positive = all(
        polynomial.coefficient(position) > 0 for position in range(count)
    )
    return count, positive


def audit_case(
    offset: int,
    parity: str,
    symbolic_selector: tuple[sp.Symbol, sp.Symbol, list[sp.Expr]],
) -> dict[str, object]:
    minimum = boundary_minimum(offset, parity)
    p, n, alpha, selector = shifted_boundary_selector(
        offset, parity, minimum, symbolic_selector
    )
    beta = Rat(fmpq(-1, 2) if parity == "even" else fmpq(1, 2))
    tail_A, tail_B = derive_tail(p, n, alpha, beta, selector)
    diagonals, couplings = extract(tail_A, tail_B)
    del p, n, alpha, selector, tail_A, tail_B, diagonals
    gc.collect()
    records = []
    for index, coupling in enumerate(couplings):
        numerator_terms, numerator_positive = audit_polynomial(coupling.num)
        denominator_terms, denominator_positive = audit_polynomial(coupling.den)
        assert numerator_positive and denominator_positive
        records.append(
            {
                "index": index,
                "numerator_terms": numerator_terms,
                "denominator_terms": denominator_terms,
                "numerator_coefficientwise_positive": numerator_positive,
                "denominator_coefficientwise_positive": denominator_positive,
            }
        )
        couplings[index] = None
        del coupling
        gc.collect()
    return {
        "offset": offset,
        "parity": parity,
        "jacobi_degree_shift": minimum,
        "couplings": records,
    }


def main() -> None:
    global LAYER, TAIL_ORDER, BANDWIDTH
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", type=int, default=8)
    parser.add_argument("--offset", type=int)
    parser.add_argument("--parity", choices=("even", "odd"))
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    LAYER = args.layer
    if LAYER < 0:
        parser.error("layer must be nonnegative")
    TAIL_ORDER = LAYER // 2 + 2
    BANDWIDTH = TAIL_ORDER + 1
    if args.offset is not None and not 0 <= args.offset < LAYER:
        parser.error(f"offset must satisfy 0 <= offset < {LAYER}")
    symbolic_selector = derive_selector(LAYER)
    offsets = [args.offset] if args.offset is not None else list(range(LAYER))
    parities = [args.parity] if args.parity is not None else ["even", "odd"]
    cases = []
    for offset in offsets:
        for parity in parities:
            case = audit_case(offset, parity, symbolic_selector)
            cases.append(case)
            print(
                offset,
                parity,
                case["jacobi_degree_shift"],
                [
                    (item["numerator_terms"], item["denominator_terms"])
                    for item in case["couplings"]
                ],
                flush=True,
            )
    report = {
        "status": f"EXACT_S{LAYER}_BOUNDARY_POSITIVE_JACOBI_AUDIT",
        "layer_deficit": LAYER,
        "tail_order": TAIL_ORDER,
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
