#!/usr/bin/env python3
"""Map Q/P for the actual bottom endpoint in the product upper half-plane."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("bottom_endpoint_ratio_region_probe_20260802.json")


def derivative_coefficients(poly: sp.Expr, degree: int) -> list[np.ndarray]:
    result = []
    for k in range(degree+1):
        p = sp.Poly(sp.diff(poly, X, k), X)
        result.append(np.array([float(c) for c in p.all_coeffs()], dtype=float))
    return result


def value(coefficients: np.ndarray, z: complex) -> complex:
    return complex(np.polyval(coefficients, z))


def main() -> None:
    rng = random.Random(993_20260802 + 133)
    records = []
    for m in range(1, 7):
        N = 3*m+3
        d = 2*m+3
        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N-1, 3)
        gd = derivative_coefficients(g, d)
        hd = derivative_coefficients(h, d-2)
        max_real = -math.inf
        max_modulus = 0.0
        min_real = math.inf
        min_distance_one = math.inf
        max_real_witness = None
        trials = 0
        for _ in range(30000):
            scale_x = 10 ** rng.uniform(-3, 4)
            scale_y = 10 ** rng.uniform(-3, 4)
            x = complex(rng.uniform(-3, 3)*scale_x, 10**rng.uniform(-4, 3)*scale_x)
            y = complex(rng.uniform(-3, 3)*scale_y, 10**rng.uniform(-4, 3)*scale_y)
            positive = sum(
                math.comb(d, k)*value(gd[k], x)*value(gd[d-k], y)
                for k in range(d+1)
            )
            negative = sum(
                math.comb(d-2, k)*value(hd[k], x)*value(hd[d-2-k], y)
                for k in range(d-1)
            )
            if positive == 0:
                continue
            ratio = negative/positive
            trials += 1
            max_modulus = max(max_modulus, abs(ratio))
            min_real = min(min_real, ratio.real)
            min_distance_one = min(min_distance_one, abs(1-ratio))
            if ratio.real > max_real:
                max_real = ratio.real
                max_real_witness = {"X": [x.real, x.imag], "Y": [y.real, y.imag], "ratio": [ratio.real, ratio.imag]}
        record = {
            "m": m,
            "N": N,
            "d": d,
            "trials": trials,
            "max_real_Q_over_P": max_real,
            "min_real_Q_over_P": min_real,
            "max_modulus_Q_over_P": max_modulus,
            "min_distance_to_one": min_distance_one,
            "max_real_witness": max_real_witness,
        }
        records.append(record)
        print(json.dumps(record), flush=True)
    report = {
        "kind": "bottom_endpoint_ratio_region_probe",
        "date": "2026-08-02",
        "status": "FINITE_NUMERICAL_REGION_MAP",
        "ratio": "Q/P=S^(d-2)(h tensor h)/S^d(g tensor g)",
        "cases": records,
        "warning": "This is numerical route selection only, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")


if __name__ == "__main__":
    main()
