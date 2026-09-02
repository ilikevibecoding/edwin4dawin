#!/usr/bin/env python3
"""Probe rank-five terminal rooted-star/double-broom Newton coefficients."""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_terminal_brooms_isolates_probe_root_20260829.json"
MAXIMUM = 6


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def add(*rows):
    return tuple(sum(at(row, index) for row in rows) for index in range(MAXIMUM + 1))


def shift(row, amount=1):
    return tuple(at(row, index - amount) for index in range(MAXIMUM + 1))


def convolution(left, right):
    return tuple(
        sum(at(left, index) * at(right, rank - index) for index in range(rank + 1))
        for rank in range(MAXIMUM + 1)
    )


def binomial_polynomial(variable, index):
    result = sp.Integer(1)
    for offset in range(index):
        result *= variable - offset
    return sp.expand(result / factorial(index))


def binomial_row(parameter):
    if isinstance(parameter, int):
        return tuple(comb(parameter, index) if index <= parameter else 0 for index in range(MAXIMUM + 1))
    return tuple(binomial_polynomial(parameter, index) for index in range(MAXIMUM + 1))


def path_count(order, index):
    if index < 0:
        return 0
    if order == -2:
        return 0
    if order == -1:
        return int(index == 0)
    assert order >= 0
    top = order - index + 1
    return comb(top, index) if top >= index else 0


def path_row(order):
    return tuple(path_count(order, index) for index in range(MAXIMUM + 1))


def n5(rows):
    e, u, v, w = rows
    r = 5
    return (
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def disconnected_rows(arm_u, arm_v, isolates):
    arow = binomial_row(arm_u)
    brow = binomial_row(arm_v)
    trow = binomial_row(isolates)
    singleton = (1,) + (0,) * MAXIMUM
    a_plus_x = add(arow, shift(singleton))
    b_plus_x = add(brow, shift(singleton))
    return (
        convolution(trow, convolution(a_plus_x, b_plus_x)),
        convolution(trow, convolution(arow, b_plus_x)),
        convolution(trow, convolution(a_plus_x, brow)),
        convolution(trow, convolution(arow, brow)),
    )


def connected_rows(path_order, arm_u, arm_v, isolates):
    internal = path_order - 2
    arow = binomial_row(arm_u)
    brow = binomial_row(arm_v)
    trow = binomial_row(isolates)
    ab = convolution(arow, brow)
    p0 = path_row(internal)
    p1 = path_row(internal - 1)
    p2 = path_row(internal - 2)
    e0 = add(
        convolution(ab, p0),
        shift(convolution(arow, p1)),
        shift(convolution(brow, p1)),
        shift(p2, 2),
    )
    u0 = convolution(arow, add(convolution(brow, p0), shift(p1)))
    v0 = convolution(brow, add(convolution(arow, p0), shift(p1)))
    w0 = convolution(ab, p0)
    return tuple(convolution(trow, row) for row in (e0, u0, v0, w0))


def mixed_difference(value, i, j, k):
    return sum(
        (-1) ** (i - aa + j - bb + k - tt)
        * comb(i, aa) * comb(j, bb) * comb(k, tt) * value(aa, bb, tt)
        for aa in range(i + 1)
        for bb in range(j + 1)
        for tt in range(k + 1)
    )


def coefficients(value, degree):
    return [
        (i, j, k, mixed_difference(value, i, j, k))
        for i in range(degree + 1)
        for j in range(degree + 1 - i)
        for k in range(degree + 1 - i - j)
    ]


def summary(records):
    values = [row[-1] for row in records]
    return {
        "cells": len(records),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values),
        "minimum_positive": min(value for value in values if value > 0),
        "nonzero": sum(value != 0 for value in values),
    }


def main():
    a, b, t = sp.symbols("a b t", integer=True, nonnegative=True)
    disconnected_expression = sp.expand(n5(disconnected_rows(a, b, t)))
    degree = sp.Poly(disconnected_expression, a, b, t).total_degree()
    disconnected = coefficients(lambda aa, bb, tt: int(n5(disconnected_rows(aa, bb, tt))), degree)

    connected = {}
    for order in range(2, 31):
        expression = sp.expand(n5(connected_rows(order, a, b, t)))
        assert sp.Poly(expression, a, b, t).total_degree() <= degree
        records = coefficients(lambda aa, bb, tt, n=order: int(n5(connected_rows(n, aa, bb, tt))), degree)
        connected[str(order)] = summary(records)

    report = {
        "marker": "PROBE_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_ROOT",
        "leaf_isolate_total_degree": degree,
        "disconnected": summary(disconnected),
        "connected_path_orders_2_to_30": connected,
        "negative_connected_orders": [order for order, row in connected.items() if row["negative"]],
        "scope_guard": "Finite path-order probe only; no all-order terminal N5 theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
