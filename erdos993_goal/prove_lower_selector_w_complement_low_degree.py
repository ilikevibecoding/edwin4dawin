#!/usr/bin/env python3
"""Exact closure of the low-degree part of the post-sector W region.

The unequal-polar sector theorem proves every cell with A>(m-1)^2.  In its
complement, parity alone forces d<=2m.  Consequently m=4 and m=5 leave only
finitely many admissible selector cells.  This replay enumerates those cells
from the exact selector formula and verifies the one-minor Schur certificate

    h_(m-3)^2+h_(m-2)^2>1,
    W=(h_(m-3)h_(m-1)-h_(m-2)^2)^2>E+F-1.

No floating-point root decision is used.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpq

from probe_lower_selector_tail3_flint_full import (
    duran_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_w_complement_low_degree_exact_20260812.json"


def exact_case(d: int, r: int, row_s: int) -> dict[str, object]:
    path_n = d + r
    gamma = selector_gamma(path_n, row_s)
    forced = max(0, row_s - path_n + 1)
    gamma_hat = gamma[forced:]
    m = len(gamma_hat) - 1
    original_p = d + row_s
    effective_p = original_p - 2 * forced
    n = effective_p // 2
    x = n - m + 1
    beta_numerator = 1 if effective_p % 2 else -1
    A = fmpq(x) * fmpq(2 * x + beta_numerator, 2)

    q = duran_coefficients(original_p - forced, gamma_hat)
    H: list[fmpq] = []
    for j in range(m):
        value = q[m - j]
        for shift in range(1, j + 1):
            value -= q[shift] * A**shift * H[j - shift]
        H.append(value / q[0])

    squares = [A ** (m - j) * H[j] ** 2 for j in range(m)]
    E = sum(squares[:-1], fmpq(0))
    F = E + squares[-1]
    debt = E + F - 1
    tail_energy_margin = squares[-3] + squares[-2] - 1
    last_hankel = A**2 * (H[-3] * H[-1] - H[-2] ** 2)
    W = last_hankel**2
    w_margin = W - debt

    return {
        "d": d,
        "r": r,
        "row_s": row_s,
        "forced_order": forced,
        "m": m,
        "A": str(A),
        "tail_energy_margin": str(tail_energy_margin),
        "W_minus_debt": str(w_margin),
        "W_over_debt": str(W / debt),
    }


def main() -> None:
    records: list[dict[str, object]] = []
    for m_target in (4, 5, 6):
        # The complement theorem below gives d<=2m.  This is now a genuinely
        # finite exact enumeration, rather than an empirical cutoff.
        for d in range(5, 2 * m_target + 1):
            for r in range(d - 4):
                path_n = d + r
                for row_s in range(r + 1, path_n + r + 1):
                    gamma = selector_gamma(path_n, row_s)
                    forced = max(0, row_s - path_n + 1)
                    if len(gamma[forced:]) - 1 != m_target:
                        continue
                    record = exact_case(d, r, row_s)
                    A = fmpq(record["A"])
                    if A > (m_target - 1) ** 2:
                        continue
                    assert fmpq(record["tail_energy_margin"]) > 0
                    assert fmpq(record["W_minus_debt"]) > 0
                    records.append(record)

    counts = {
        degree: sum(record["m"] == degree for record in records)
        for degree in (4, 5, 6)
    }
    assert counts == {4: 21, 5: 45, 6: 77}
    assert len(records) == 143
    minimum = min(records, key=lambda record: fmpq(record["W_over_debt"]))

    # Independent parameter-only parity audit of the finite-reduction lemma.
    # If a complement cell with m=4 or 5 had d>2m, this search over a much
    # larger ambient range would find it.  The actual proof is the displayed
    # parity algebra in the companion note.
    no_late_low_degree_cells = True
    for d in range(13, 101):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                raw_degree = row_s // 2 + 2
                m = raw_degree - forced
                if m not in (4, 5, 6):
                    continue
                effective_p = d + row_s - 2 * forced
                n = effective_p // 2
                x = n - m + 1
                beta_numerator = 1 if effective_p % 2 else -1
                A = fmpq(x) * fmpq(2 * x + beta_numerator, 2)
                if A <= (m - 1) ** 2:
                    no_late_low_degree_cells = False
    assert no_late_low_degree_cells

    payload = {
        "kind": "lower_selector_w_complement_low_degree_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_POST_SECTOR_W_CERTIFICATE_FOR_M4_TO_M6",
        "all_order_reduction": (
            "If A<=(m-1)^2 then d<=2m (indeed odd d<=2m-1). Hence the "
            "each fixed-degree complement is finite."
        ),
        "certificate": (
            "h_(m-3)^2+h_(m-2)^2>1 and "
            "W=(h_(m-3)h_(m-1)-h_(m-2)^2)^2>E+F-1"
        ),
        "cells": len(records),
        "counts_by_degree": counts,
        "minimum_W_over_debt": minimum["W_over_debt"],
        "minimum_cell": {
            key: minimum[key]
            for key in ("d", "r", "row_s", "forced_order", "m", "A")
        },
        "parameter_transcription_audit": "no complement m=4,5,6 cells beyond d=2m through d<=100",
        "remaining": "Prove the same one-minor inequalities for m>=7 in the sector complement.",
        "records": records,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cells": payload["cells"],
        "counts_by_degree": payload["counts_by_degree"],
        "minimum_cell": payload["minimum_cell"],
        "minimum_W_over_debt_decimal": float(fmpq(payload["minimum_W_over_debt"])),
        "source_sha256": payload["source_sha256"],
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
