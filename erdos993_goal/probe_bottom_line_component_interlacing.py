#!/usr/bin/env python3
"""Test linewise interlacing of the positive and negative endpoint blocks."""

from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np
import sympy as sp

from probe_rankone_laguerre_sample_pencil import derivative_sum_line
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("bottom_line_component_interlacing_probe_20260802.json")


def ascending(poly: sp.Expr) -> np.ndarray:
    p = sp.Poly(poly, X)
    return np.array([float(p.nth(k)) for k in range(p.degree()+1)])


def roots_real(coefficients: np.ndarray) -> list[float] | None:
    coefficients = np.trim_zeros(coefficients, "b")
    coefficients = coefficients/np.max(np.abs(coefficients))
    roots = np.roots(coefficients[::-1])
    if any(abs(z.imag) > 2e-5*(1+abs(z.real)) for z in roots):
        return None
    return sorted(float(z.real) for z in roots)


def alternates(left: list[float], right: list[float]) -> bool:
    if len(left) != len(right):
        return False
    merged = sorted([(x, 0) for x in left]+[(x, 1) for x in right])
    return all(merged[i][1] != merged[i+1][1] for i in range(len(merged)-1))


def main() -> None:
    rng = random.Random(993_20260802 + 227)
    records = []
    witnesses = []
    for m in range(1, 16):
        N = 3*m+3
        d = 2*m+3
        g = ascending(hypergeometric_form(N, 3))
        h = ascending(hypergeometric_form(N-1, 3))
        failures = 0
        numerical_nonreal = 0
        for trial in range(1000):
            bases = (rng.randint(-300, 300), rng.randint(-300, 300))
            directions = (rng.randint(1, 80), rng.randint(1, 80))
            positive = derivative_sum_line(g, g, d, bases, directions)
            negative = derivative_sum_line(h, h, d-2, bases, directions)
            rp = roots_real(positive)
            rq = roots_real(negative)
            if rp is None or rq is None:
                numerical_nonreal += 1
                continue
            if not alternates(rp, rq):
                failures += 1
                if len(witnesses) < 30:
                    witnesses.append({
                        "m": m,
                        "trial": trial,
                        "bases": bases,
                        "directions": directions,
                        "positive_roots": rp,
                        "negative_roots": rq,
                    })
        record = {"m": m, "N": N, "d": d, "trials": 1000, "alternation_failures": failures, "numerical_nonreal_skips": numerical_nonreal}
        records.append(record)
        print(json.dumps(record), flush=True)
        if failures:
            break
    report = {
        "kind": "bottom_line_component_interlacing_probe",
        "date": "2026-08-02",
        "status": "LINEWISE_INTERLACING_FALSE" if witnesses else "NO_LINEWISE_INTERLACING_FAILURE_FOUND",
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Floating-point route selection only; any witness needs exact replay.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")


if __name__ == "__main__":
    main()
