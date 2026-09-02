#!/usr/bin/env python3
"""Search for Rayleigh violations of the fully polarized bottom target.

This is a route-control experiment.  If the multiaffine leaf polynomial were
stable before the diagonal specializations x_i=X+r_i and y_i=Y+r_i, every
Rayleigh difference p_i p_j-p p_ij would be nonnegative on R^(2N).
"""

from __future__ import annotations

import itertools
import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("multiaffine_bottom_rayleigh_probe_20260802.json")


def actual_weights(N: int) -> list[float]:
    raw_g = hypergeometric_form(N, 3)
    raw_h = hypergeometric_form(N - 1, 3)
    leading = sp.Poly(raw_g, X).LC()
    a = sp.Poly(sp.expand((raw_g + raw_h) / leading), X)
    roots = [complex(z) for z in sp.nroots(a, n=40, maxsteps=300)]
    magnitudes = sorted([-z.real for z in roots])
    assert max(abs(z.imag) for z in roots) < 1e-25
    L = 2 * N - 3
    assert abs(sum(magnitudes) - N * L) < 1e-7
    return [r / L for r in magnitudes]


def add_term(poly: dict[int, float], mask: int, coefficient: float) -> None:
    poly[mask] = poly.get(mask, 0.0) + coefficient


def derivative_level(poly: dict[int, float], order: int) -> dict[int, float]:
    if order == 0:
        return dict(poly)
    out: dict[int, float] = {}
    factor = math.factorial(order)
    for mask, coefficient in poly.items():
        present = [i for i in range(mask.bit_length()) if mask & (1 << i)]
        for deleted in itertools.combinations(present, order):
            new_mask = mask
            for i in deleted:
                new_mask ^= 1 << i
            add_term(out, new_mask, factor * coefficient)
    return out


def target_polynomial(N: int, d: int, weights: list[float]) -> dict[int, float]:
    full = (1 << (2 * N)) - 1
    star: dict[int, float] = {full: 1.0}
    edge_edge: dict[int, float] = {}
    for i, wi in enumerate(weights):
        add_term(star, full ^ (1 << i), -wi)
        for j, wj in enumerate(weights):
            mask = full ^ (1 << i) ^ (1 << (N + j))
            add_term(star, mask, wi * wj)
            add_term(edge_edge, mask, wi * wj)
    for j, wj in enumerate(weights):
        add_term(star, full ^ (1 << (N + j)), -wj)
    positive = derivative_level(star, d)
    negative = derivative_level(edge_edge, d - 2)
    for mask, coefficient in negative.items():
        add_term(positive, mask, -coefficient)
    return {mask: c for mask, c in positive.items() if c != 0.0}


def value_and_derivatives(
    poly: dict[int, float], values: np.ndarray
) -> tuple[float, np.ndarray, np.ndarray]:
    """Evaluate p, every first partial, and every mixed second partial."""
    nvars = len(values)
    total = 0.0
    first = np.zeros(nvars)
    second = np.zeros((nvars, nvars))
    for mask, coefficient in poly.items():
        active = mask
        term = coefficient
        indices = []
        while active:
            bit = active & -active
            i = bit.bit_length() - 1
            indices.append(i)
            term *= values[i]
            active ^= bit
        total += term
        for i in indices:
            quotient_i = term / values[i]
            first[i] += quotient_i
            for j in indices:
                if j > i:
                    second[i, j] += quotient_i / values[j]
    return total, first, second


def main() -> None:
    rng = random.Random(993_20260802 + 91)
    report: dict[str, object] = {
        "kind": "multiaffine_bottom_rayleigh_probe",
        "date": "2026-08-02",
        "criterion": "Delta_ij=p_i*p_j-p*p_ij must be nonnegative on every real assignment",
        "cases": [],
    }
    first_witness = None
    for m in range(1, 4):
        N = 3 * m + 3
        d = 2 * m + 3
        weights = actual_weights(N)
        poly = target_polynomial(N, d, weights)
        assert abs(weights[0]) < 1e-25 and abs(weights[1]) < 1e-25
        structured_witness = None
        structured_trials = 0
        zero_pairs = [(0, 1), (N, N + 1)] + [
            (i, j) for i in (0, 1) for j in (N, N + 1)
        ]
        for _ in range(2000):
            # The positive-weight leaves on each side receive a common value.
            # Rayleigh differences in zero-weight coordinates then depend only
            # on symmetric functions of the positive weights and admit an
            # exact rational replay.
            choices = [rng.randint(-30, 30) or 1 for _ in range(6)]
            values = np.array(
                [choices[0], choices[1]] + [choices[2]] * (N - 2)
                + [choices[3], choices[4]] + [choices[5]] * (N - 2),
                dtype=float,
            )
            structured_trials += 1
            p0, first0, second0 = value_and_derivatives(poly, values)
            for i, j in zero_pairs:
                delta0 = first0[i] * first0[j] - p0 * second0[i, j]
                norm0 = max(1.0, abs(first0[i] * first0[j]), abs(p0 * second0[i, j]))
                ratio0 = delta0 / norm0
                if ratio0 < -1e-7:
                    structured_witness = {
                        "group_values": choices,
                        "pair": [i, j],
                        "p": p0,
                        "pi": first0[i],
                        "pj": first0[j],
                        "pij": second0[i, j],
                        "delta": delta0,
                        "normalized_delta": ratio0,
                    }
                    break
            if structured_witness:
                break
        smallest = math.inf
        witness = None
        trials = 0
        for scale in (1.0, 3.0, 10.0, 30.0, 100.0):
            for _ in range(100):
                trials += 1
                values = np.array([rng.uniform(-scale, scale) for _ in range(2 * N)])
                p, first, second = value_and_derivatives(poly, values)
                for i in range(2 * N):
                    pi = first[i]
                    for j in range(i + 1, 2 * N):
                        pj = first[j]
                        pij = second[i, j]
                        delta = pi * pj - p * pij
                        normalization = max(1.0, abs(pi * pj), abs(p * pij))
                        ratio = delta / normalization
                        if ratio < smallest:
                            smallest = ratio
                        if ratio < -1e-7:
                            witness = {
                                "scale": scale,
                                "assignment": values.tolist(),
                                "pair": [i, j],
                                "p": p,
                                "pi": pi,
                                "pj": pj,
                                "pij": pij,
                                "delta": delta,
                                "normalized_delta": ratio,
                            }
                            break
                    if witness:
                        break
                if witness:
                    break
            if witness:
                break
        case = {
            "m": m,
            "N": N,
            "d": d,
            "monomials": len(poly),
            "structured_trials": structured_trials,
            "structured_zero_weight_witness": structured_witness,
            "trials": trials,
            "smallest_normalized_delta": smallest,
            "rayleigh_violation": witness,
        }
        report["cases"].append(case)
        print(json.dumps(case))
        if witness and first_witness is None:
            first_witness = case
            break
    report["status"] = (
        "FOUND_NUMERICAL_MULTIAFFINE_RAYLEIGH_VIOLATION"
        if first_witness
        else "NO_VIOLATION_IN_FINITE_NUMERICAL_SEARCH"
    )
    report["significance"] = (
        "A violation rules out proving the diagonal target merely by showing the fully polarized leaf polynomial stable."
        if first_witness
        else "No conclusion beyond the tested assignments."
    )
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
