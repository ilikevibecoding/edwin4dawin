#!/usr/bin/env python3
"""Exact finite audit of inactive balanced-neighbor rows for d=2..j."""

from __future__ import annotations

from fractions import Fraction as F
import hashlib
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j4j5_balanced_cap_inactive_audit_20260829.json"


def C(n, k):
    return math.comb(n, k) if n >= k >= 0 else 0


def path_floor(n, k):
    return C(n - k + 1, k) if n >= 2 * k - 1 else 0


def lower(j, N, h, d, R, W, y):
    r = N - j
    m = N - h
    p0 = C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m
    p1 = C(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = C(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - C(d, 2) - R)
    h2 = C(N - d, 2) - (m - d - R)
    c0 = a + z2 + h2
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    ebar = F(1) + y + F(j * z2, 2 * a)
    Q0 = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    U1 = F(1) + F(j, r + 1) + F(j, r) * y
    U0 = F(N - 2 * j + 3, j + 1) + F(j - 1, j + 1) * y + F(j, r) * y
    gap = 2 * p1 * c0 - 3 * a * R1
    return ((j + 1) * (
        F(3, 2) * p0 * R1 + F(p0, 2 * p1) * U1 * gap
        + A1 * (U0 + U1)
    ) + remainder)


def linear_value(j, N, h, d, R, W, y):
    q0 = lower(j, N, h, d, R, F(0), y)
    q1 = lower(j, N, h, d, R, F(1), y)
    q2 = lower(j, N, h, d, R, F(2), y)
    w2 = (q2 - 2 * q1 + q0) / 2
    return lower(j, N, h, d, R, W, y) - w2 * W * W


def main():
    stream = hashlib.sha256()
    cells = values = 0
    minimum = None
    witness = ""
    records = {}
    for j in (4, 5):
        local_cells = local_values = 0
        for d in range(2, j + 1):
            for s in range(d):
                for h in range(1, j):
                    for q in range(0, 2 * j):
                        for L in range(0, 2 * j):
                            K = 2 * h + (d - 1) * q + s + L
                            if K >= 2 * j - 2:
                                continue
                            R = d * q + s
                            N = 2 * h + d + R + L
                            if N < 13:
                                continue
                            S = N - d
                            top = C(S, j)
                            if not top:
                                continue
                            center = ((d - s) * path_floor(S - q, j - 1)
                                      + s * path_floor(S - q - 1, j - 1))
                            ycap = F(top, top + center)
                            B = N - 2 * h - 1
                            assert B > 0
                            low = F((d - 1) * C(d, 2), B) + F(B - d + 1, 1)
                            high = F(C(N - 2 * h, 2), 1)
                            for name, W in (("low", low), ("high", high)):
                                value = linear_value(j, N, h, d, R, W, ycap)
                                assert value >= 0, (j, d, s, h, q, L, name, value)
                                local_values += 1
                                values += 1
                                key = f"j{j}|d{d}|s{s}|h{h}|q{q}|L{L}|{name}"
                                stream.update(f"{key}|{value.numerator}/{value.denominator}\n".encode())
                                if minimum is None or value < minimum:
                                    minimum = value
                                    witness = key
                            local_cells += 1
                            cells += 1
        records[f"j{j}"] = {"cells": local_cells, "endpoint_values": local_values}
    assert cells > 0 and minimum is not None
    report = {
        "schema": "terminal-q3-m1-j4j5-balanced-cap-inactive-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_FINITE_INACTIVE_BALANCED_CAP_D2_TO_J",
        "scope": (
            "Exact parameter audit for j=4,5, 2<=d<=j, N>=13, and "
            "K=S-floor(R/d)<=2j-3. The d=1 inactive strips and all active "
            "balanced-cap cones remain separate obligations."
        ),
        "records": records,
        "cells": cells,
        "endpoint_values": values,
        "minimum": f"{minimum.numerator}/{minimum.denominator}",
        "minimum_witness": witness,
        "ordered_value_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(), flush=True)


if __name__ == "__main__":
    main()
