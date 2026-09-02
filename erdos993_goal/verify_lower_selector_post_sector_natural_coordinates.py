#!/usr/bin/env python3
"""Replay the exact natural coordinates and rational W formulas."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpq

from probe_lower_selector_tail3_flint_full import (
    duran_coefficients,
    rising_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_post_sector_natural_coordinates_exact_20260812.json"


def parameters(d: int, r: int, s: int, m: int, a: int):
    sigma = s % 2
    e = 2 * m - d
    p = d + s - 2 * a
    n = p // 2
    beta_num = 1 if p % 2 else -1
    x = n - m + 1
    A = fmpq(x) * fmpq(2 * x + beta_num, 2)
    return sigma, e, x, beta_num, A


def replay_actual_formula(d: int, r: int, s: int) -> None:
    path_n = d + r
    gamma = selector_gamma(path_n, s)
    a = max(0, s - path_n + 1)
    gamma_hat = gamma[a:]
    m = len(gamma_hat) - 1
    if m < 4:
        return
    sigma, e, x, beta_num, A = parameters(d, r, s, m, a)
    duran_n = d + s - a
    q = duran_coefficients(duran_n, gamma_hat)

    # Formula (8): rising-factorial coefficients are unsigned Stirling
    # numbers of the first kind.
    q_again = []
    fall = 1
    falls = []
    for h in range(m + 1):
        if h:
            fall *= duran_n - h + 1
        falls.append(fall)
    for k in range(m + 1):
        value = fmpq(0)
        for h in range(m - k + 1):
            value += fmpq(gamma_hat[h] * falls[h], 4**h) * rising_coefficients(m - h)[k]
        q_again.append(value)
    assert q_again == q

    # Formulas (9)--(10), compared with the direct quotient recurrence.
    reciprocal = [fmpq(1)]
    for j in range(1, m):
        reciprocal.append(-sum(
            (q[ell] * A**ell / q[0]) * reciprocal[j - ell]
            for ell in range(1, j + 1)
        ))
    H_closed = [
        sum(q[m - k] * reciprocal[j - k] for k in range(j + 1)) / q[0]
        for j in range(m)
    ]
    H_direct = []
    for j in range(m):
        value = q[m - j]
        for ell in range(1, j + 1):
            value -= q[ell] * A**ell * H_direct[j - ell]
        H_direct.append(value / q[0])
    assert H_closed == H_direct


def main() -> None:
    complement_m6 = 0
    chart_counts = {"unforced": 0, "forced": 0}
    for d in range(5, 51):
        for r in range(d - 4):
            path_n = d + r
            for s in range(r + 1, path_n + r + 1):
                a = max(0, s - path_n + 1)
                raw_degree = 3 if (d, r, s) == (5, 0, 5) else s // 2 + 2
                m = raw_degree - a
                if m < 6:
                    continue
                sigma, e, x, beta_num, A = parameters(d, r, s, m, a)
                if A > (m - 1) ** 2:
                    continue
                complement_m6 += 1
                assert d == 2 * m - e
                assert s == 2 * m + 2 * a - 4 + sigma
                assert d + s - a == 4 * m + a - e - 4 + sigma
                assert x == (d + sigma) // 2 - 1
                assert e >= 0 and not (e == 0 and sigma == 1)
                if a == 0:
                    g = path_n - s
                    assert g >= 1
                    assert r == e + g - 4 + sigma
                    assert max(1, 4 - e - sigma) <= g <= 2 * m - 2 * e - 1 - sigma
                    chart_counts["unforced"] += 1
                else:
                    assert r == e + a - 3 + sigma
                    assert 1 <= a <= 2 * m - 2 * e - 2 - sigma
                    assert e + sigma >= 2
                    chart_counts["forced"] += 1

                # An independent exact check of (8)--(10) on a compact
                # actual diamond.  The identities themselves are algebraic.
                if d <= 12:
                    replay_actual_formula(d, r, s)

    assert complement_m6 == 36683
    assert sum(chart_counts.values()) == complement_m6
    payload = {
        "kind": "lower_selector_post_sector_natural_coordinates_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_POST_SECTOR_NATURAL_COORDINATE_REDUCTION",
        "all_order_coordinates": (
            "d=2m-e, s=2m+2a-4+sigma, N_D=4m+a-e-4+sigma; "
            "the complement has e>=0 except (e,sigma)=(0,1)."
        ),
        "unforced_chart": (
            "r=e+g-4+sigma, max(1,4-e-sigma)<=g<=2m-2e-1-sigma"
        ),
        "forced_chart": (
            "r=e+a-3+sigma, 1<=a<=2m-2e-2-sigma, e+sigma>=2"
        ),
        "rational_formula": (
            "q_k is the gamma/Stirling sum (8); reciprocal coefficients v_j "
            "give H_j=q0^-1 sum_(k<=j) q_(m-k)v_(j-k)."
        ),
        "finite_transcription_scope": "d<=50, m>=6, A<=(m-1)^2",
        "finite_transcription_cells": complement_m6,
        "chart_counts": chart_counts,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cells": complement_m6,
        "chart_counts": chart_counts,
        "source_sha256": payload["source_sha256"],
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
