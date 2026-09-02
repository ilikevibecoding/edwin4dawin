#!/usr/bin/env python3
"""Coefficient-convolution route for the independent right-gap1 audit.

This wrapper reuses only the independent audit's sign and Bernstein replay
machinery.  It replaces its slow full-expression slack expansion with a
separate exact polynomial-array convolution derived directly from c(s),v(s).
No producer code is imported.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import audit_uniform_low_high_right_gap1_slack_independent_root as audit


HERE = Path(__file__).resolve().parent
HELPER = HERE / "audit_uniform_low_high_right_gap1_slack_independent_root.py"
HELPER_SHA256 = "616E75B679C63AE959B88EEE19CAB734BBA1CACDCAE763BC043EF19D17A19852"
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_independent_convolution_audit_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_poly(*rows):
    size = max(len(row) for row in rows)
    return tuple(sum((row[index] if index < len(row) else 0) for row in rows)
                 for index in range(size))


def scale_poly(row, scalar):
    return tuple(scalar * value for value in row)


def multiply_poly(first, second):
    result = [sp.S.Zero] * (len(first) + len(second) - 1)
    for i, left in enumerate(first):
        for j, right in enumerate(second):
            result[i + j] += left * right
    return tuple(result)


def quadratic_poly(row):
    return add_poly(
        multiply_poly(row[1], row[1]),
        scale_poly(multiply_poly(row[0], row[2]), -1),
        scale_poly(multiply_poly(row[0], row[1]), -1),
    )


def bilinear_poly(first, second):
    return add_poly(
        scale_poly(multiply_poly(first[1], second[1]), 2),
        scale_poly(multiply_poly(first[0], second[2]), -1),
        scale_poly(multiply_poly(first[2], second[0]), -1),
        scale_poly(multiply_poly(first[0], second[1]), -1),
        scale_poly(multiply_poly(first[1], second[0]), -1),
    )


def build_rows_by_convolution(k, x, y, unused_s):
    N, M = k + x, k + y
    D = M**2 - 1
    zero = (sp.S.Zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    base = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_previous = (N + 1) / N
    left_high = {
        "T": zero,
        "L": (left_previous, left_previous * (x + 1),
              left_previous * x * (x + 1)),
        "R": zero,
    }
    prior = (left_previous / (x + 2), left_previous,
             left_previous * (x + 1))
    first = {
        "T": zero,
        "L": tuple((k - 1 + index) * prior[index] for index in range(3)),
        "R": zero,
    }
    right_previous = (M + 1) / M
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (1 + (k - 1) * (N + 1) / (y + 2)
                + ((k - 1) * (k - 2) / 2) * (N**2 - 1)
                  / ((y + 2) * (y + 3))),
            right_previous * (y + 1 + k * (N + 1)
                + (k * (k - 1) / 2) * (N**2 - 1) / (y + 2)),
            right_previous * (y * (y + 1)
                + (k + 1) * (N + 1) * (y + 1)
                + (k * (k + 1) / 2) * (N**2 - 1)),
        ),
    }
    zero_tail = {
        basis: tuple(base[basis][index] - removed[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole_remainder = {
        basis: tuple(base[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_remainder = {
        basis: tuple(zero_tail[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }

    # Coefficients in s of high+(M+1+s)first+
    # (1+2Ms/D+s^2/D)remainder.
    whole = {}
    tail = {}
    for basis in ("T", "L", "R"):
        whole[basis] = tuple(
            (
                base[basis][index],
                first[basis][index] + 2 * M * whole_remainder[basis][index] / D,
                whole_remainder[basis][index] / D,
            )
            for index in range(3)
        )
        tail[basis] = tuple(
            (
                zero_tail[basis][index],
                first[basis][index] + 2 * M * tail_remainder[basis][index] / D,
                tail_remainder[basis][index] / D,
            )
            for index in range(3)
        )

    rows = {f"s{degree}": {} for degree in range(1, 5)}
    for first_basis, second_basis in audit.PRODUCTS:
        if first_basis == second_basis:
            polynomial = add_poly(
                scale_poly(quadratic_poly(whole[first_basis]), N - 2),
                bilinear_poly(whole[first_basis], tail[first_basis]),
            )
        else:
            polynomial = add_poly(
                scale_poly(bilinear_poly(
                    whole[first_basis], whole[second_basis]
                ), N - 2),
                bilinear_poly(whole[first_basis], tail[second_basis]),
                bilinear_poly(whole[second_basis], tail[first_basis]),
            )
        for degree in range(1, 5):
            scale = (N * M) ** 2 * (D if degree == 1 else D**2)
            rows[f"s{degree}"][(first_basis, second_basis)] = sp.cancel(
                polynomial[degree] * scale
            )
    return rows


def main() -> int:
    assert sha256(HELPER) == HELPER_SHA256
    audit.build_independent_rows = build_rows_by_convolution
    audit.OUTPUT = OUTPUT
    audit.__file__ = str(Path(__file__).resolve())
    result = audit.main()
    payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    payload["independent_helper_source_sha256"] = HELPER_SHA256
    payload["independent_reconstruction"]["coefficient_extraction"] = (
        "separate exact convolution of the degree-two slack coefficient arrays"
    )
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print("FINAL_REPORT", sha256(OUTPUT), flush=True)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
