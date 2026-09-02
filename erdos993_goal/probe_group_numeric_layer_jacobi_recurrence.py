#!/usr/bin/env python3
"""Cheap exact scalar probe of the Jacobi couplings across many layers."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from flint import fmpq


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_numeric_layer_jacobi_recurrence_probe_20260805.json"


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def falling(x: fmpq, order: int) -> fmpq:
    value = fmpq(1)
    for j in range(order):
        value *= x - j
    return value


def selector(layer: int, alpha: int, slack: int) -> tuple[int, list[fmpq]]:
    order = layer // 2 + 2
    p = alpha + slack + 2 * layer + 5
    N = p + alpha
    d = p - layer
    values: list[fmpq] = []
    for j in range(order + 1):
        coefficient = 0
        for deletion, sign in enumerate((1, -2, 1)):
            M = N - deletion
            for i in range(layer + 1):
                coefficient += (
                    sign
                    * choose(2 * M - i - 1, i)
                    * choose(2 * M - layer + i - 1, layer - i)
                    * choose(d - 2 * deletion, p - deletion - i - j)
                )
        values.append(fmpq(coefficient, choose(p, j)))
    nodes = [j * (p - j) for j in range(order + 1)]
    coefficients: list[fmpq] = []
    for j in range(order + 1):
        remainder = values[j]
        for h, coefficient in enumerate(coefficients):
            product = 1
            for k in range(h):
                product *= nodes[j] - nodes[k]
            remainder -= coefficient * product
        denominator = 1
        for k in range(j):
            denominator *= nodes[j] - nodes[k]
        coefficients.append(remainder / denominator)
    return p, coefficients


def poly_add(left: list[fmpq], right: list[fmpq]) -> list[fmpq]:
    size = max(len(left), len(right))
    output = [fmpq(0) for _ in range(size)]
    for j, value in enumerate(left):
        output[j] += value
    for j, value in enumerate(right):
        output[j] += value
    while len(output) > 1 and not output[-1]:
        output.pop()
    return output


def poly_scale(poly: list[fmpq], scalar: fmpq) -> list[fmpq]:
    return [scalar * value for value in poly]


def poly_y_minus(poly: list[fmpq], scalar: fmpq) -> list[fmpq]:
    return poly_add([fmpq(0)] + poly, poly_scale(poly, -scalar))


def couplings(
    layer: int,
    alpha: int,
    slack: int,
    return_details: bool = False,
    top_selector_multiplier: fmpq | None = None,
    zero_top_selector_count: int = 0,
    selector_override: list[fmpq] | None = None,
) -> list[fmpq] | dict[str, object]:
    tail_order = layer // 2 + 2
    bandwidth = tail_order + 1
    p_int, selector_values = selector(layer, alpha, slack)
    if selector_override is not None:
        if len(selector_override) != len(selector_values):
            raise ValueError("selector override has the wrong length")
        selector_values = list(selector_override)
    if top_selector_multiplier is not None:
        selector_values[-1] *= top_selector_multiplier
    if zero_top_selector_count:
        if not 0 <= zero_top_selector_count <= len(selector_values):
            raise ValueError(zero_top_selector_count)
        selector_values[-zero_top_selector_count:] = [
            fmpq(0)
        ] * zero_top_selector_count
    p = fmpq(p_int)
    a = fmpq(alpha)
    n = p / 2
    beta = fmpq(-1, 2)
    ambient = p + a

    def top_coefficients(k: fmpq) -> tuple[fmpq, fmpq]:
        total = a + beta
        c = -k * (k + a) / (2 * k + total)
        e = k * (k - 1) * (k + a - 1) * (k + a) / (
            2 * (2 * k + total - 1) * (2 * k + total)
        )
        return c, e

    def recurrence(k: fmpq) -> tuple[fmpq, fmpq]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        return diagonal, e - e_next - diagonal * c

    actions = []
    for j in range(bandwidth):
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = fmpq(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (k - 1) * c + (j + 2) * e - upper * e_next - diagonal * c
        actions.append((upper, diagonal, lower))
    vectors = [[fmpq(1)] + [fmpq(0)] * (bandwidth - 1)]
    for shift in range(bandwidth - 1):
        output = [fmpq(0)] * bandwidth
        for j, coefficient in enumerate(vectors[-1]):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < bandwidth - 1:
                output[j + 1] += coefficient * lower
        vectors.append(output)
    vector = [
        sum(
            (
                selector_values[h]
                * falling(ambient, h)
                * vectors[h][index]
                for h in range(bandwidth)
            ),
            fmpq(0),
        )
        for index in range(bandwidth)
    ]
    connection = [value / vector[0] for value in vector]

    m = n - tail_order
    u_previous, u = [fmpq(0)], [fmpq(1)]
    v_previous, v = [fmpq(-1)], [fmpq(0)]
    u_values, v_values = [u], [v]
    for step in range(tail_order):
        diagonal, subdiagonal = recurrence(m + step)
        u_next = poly_add(
            poly_y_minus(u, diagonal), poly_scale(u_previous, -subdiagonal)
        )
        v_next = poly_add(
            poly_y_minus(v, diagonal), poly_scale(v_previous, -subdiagonal)
        )
        u_previous, u = u, u_next
        v_previous, v = v, v_next
        u_values.append(u)
        v_values.append(v)
    tail_a, tail_b = [fmpq(0)], [fmpq(0)]
    for j in range(bandwidth):
        tail_a = poly_add(
            tail_a, poly_scale(u_values[tail_order - j], connection[j])
        )
        tail_b = poly_add(
            tail_b, poly_scale(v_values[tail_order - j], connection[j])
        )
    tail_b = [value / tail_b[-1] for value in tail_b]

    answer: list[fmpq] = []
    next_polynomial, current = tail_a, tail_b
    while len(current) > 1:
        degree = len(current) - 1
        diagonal = current[degree - 1] - next_polynomial[degree]
        residual = poly_add(
            poly_y_minus(current, diagonal), poly_scale(next_polynomial, -1)
        )
        coupling = residual[degree - 1]
        answer.append(coupling)
        current, next_polynomial = (
            [value / coupling for value in residual],
            current,
        )
    if return_details:
        return {
            "couplings": answer,
            "connection": connection,
            "raw_connection": vector,
            "connection_scale": vector[0],
            "tail_a": tail_a,
            "tail_b": tail_b,
        }
    return answer


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--first", type=int, default=4)
    parser.add_argument("--last", type=int, default=40)
    parser.add_argument("--alpha", type=int, default=0)
    parser.add_argument("--slack", type=int, default=0)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    records = []
    for layer in range(args.first, args.last + 1):
        values = couplings(layer, args.alpha, args.slack)
        assert all(value > 0 for value in values)
        record = {
            "layer": layer,
            "tail_order": layer // 2 + 2,
            "couplings": [str(value) for value in values],
        }
        records.append(record)
        print(layer, len(values), flush=True)
    report = {
        "status": "EXACT_SCALAR_ALL_LAYER_POSITIVE_JACOBI_PROBE",
        "alpha": args.alpha,
        "slack": args.slack,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
