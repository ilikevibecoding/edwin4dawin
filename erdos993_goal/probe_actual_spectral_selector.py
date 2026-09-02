#!/usr/bin/env python3
"""Probe the principal-minor selector for the actual defect-one spectra.

The generic target-Gram selector can have negative coefficients in the
conjectured smoothing cone.  The actual determinant representation has
additional root/residue/phase alignment.  This script constructs every
scalar spectral factor of H=q^2-pr at small endpoint sizes and checks the
minimum selector coefficient

 d! - 2(d-2)! A(Sx)A(Sy) + (d-4)! B(Sx)B(Sy),

where A(S)=sum w_i and B(S)=A(S)^2-|sum w_i theta_i|^2.

This is a high-precision discovery probe, not an exact proof.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
from pathlib import Path

import mpmath as mp
import sympy as sp

from verify_defect1_phi_spectral_determinant import scaled_seed
from verify_umbral_hypergeometric_finite_free_structure import X


def roots(poly: sp.Poly, digits: int) -> list[mp.mpc]:
    values = sp.nroots(poly.as_expr(), n=digits, maxsteps=800)
    return [mp.mpc(str(sp.re(value)), str(sp.im(value))) for value in values]


def eval_poly(poly: sp.Poly, value: mp.mpc) -> mp.mpc:
    out = mp.mpc(0)
    for coefficient in poly.all_coeffs():
        out = out * value + mp.mpf(str(coefficient))
    return out


def conjugate_pairs(values: list[mp.mpc], tolerance: mp.mpf):
    positive = sorted(
        [value for value in values if mp.im(value) > tolerance],
        key=lambda value: (float(mp.re(value)), float(mp.im(value))),
    )
    negative = [value for value in values if mp.im(value) < -tolerance]
    real = [value for value in values if abs(mp.im(value)) <= tolerance]
    if len(positive) != len(negative):
        raise ValueError("nonreal roots did not pair")
    real.sort(key=lambda value: float(mp.re(value)))
    if len(real) % 2:
        raise ValueError("odd total multiplicity among real H roots")
    real_half = []
    for index in range(0, len(real), 2):
        if abs(real[index] - real[index + 1]) > mp.sqrt(tolerance):
            raise ValueError("real H roots were not paired with even multiplicity")
        real_half.append((real[index] + real[index + 1]) / 2)
    return positive, real_half


def subset_data(weights, phases):
    n = len(weights)
    sizes = [0] * (1 << n)
    avals = [mp.mpf(0)] * (1 << n)
    cvals = [mp.mpc(0)] * (1 << n)
    bvals = [mp.mpf(0)] * (1 << n)
    for mask in range(1, 1 << n):
        bit = mask & -mask
        index = bit.bit_length() - 1
        previous = mask ^ bit
        sizes[mask] = sizes[previous] + 1
        avals[mask] = avals[previous] + weights[index]
        cvals[mask] = cvals[previous] + weights[index] * phases[index]
        bvals[mask] = avals[mask] ** 2 - abs(cvals[mask]) ** 2
    return sizes, avals, bvals


def minimum_selector(N: int, d: int, data):
    sizes, avals, bvals = data
    by_size = [[] for _ in range(N + 1)]
    for mask, size in enumerate(sizes):
        by_size[size].append(mask)
    f0 = mp.mpf(math.factorial(d))
    f1 = mp.mpf(math.factorial(d - 2))
    f2 = mp.mpf(math.factorial(d - 4))
    minimum = None
    witness = None
    negative = 0
    zeroish = 0
    checks = 0
    for sx in range(max(0, d - N), min(N, d) + 1):
        sy = d - sx
        for left in by_size[sx]:
            ax, bx = avals[left], bvals[left]
            for right in by_size[sy]:
                value = f0 - 2 * f1 * ax * avals[right] + f2 * bx * bvals[right]
                checks += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (left, right, sx, sy)
                if value < -mp.mpf("1e-40"):
                    negative += 1
                elif abs(value) <= mp.mpf("1e-40"):
                    zeroish += 1
    return minimum, witness, checks, negative, zeroish


def one_size(N: int, d: int, digits: int, all_factors: bool):
    mp.mp.dps = digits
    p = scaled_seed(N, N)
    q = scaled_seed(N - 1, N)
    r = scaled_seed(N - 2, N)
    H = sp.Poly(sp.expand(q.as_expr() ** 2 - p.as_expr() * r.as_expr()), X)
    p_roots = sorted(roots(p, digits), key=lambda value: float(mp.re(value)))
    h_upper, h_real_half = conjugate_pairs(
        roots(H, digits), mp.mpf(10) ** (-(digits // 2))
    )
    if len(h_upper) + len(h_real_half) != N - 1:
        raise ValueError(
            f"expected {N-1} H half-factors, got "
            f"{len(h_upper) + len(h_real_half)}"
        )

    derivative = p.diff()
    weights = []
    for root in p_roots:
        qvalue = eval_poly(q, root)
        if abs(qvalue) < mp.mpf(10) ** (-(digits // 3)):
            weights.append(mp.mpf(0))
        else:
            weight = qvalue / eval_poly(derivative, root)
            weights.append(mp.re(weight))
    weight_error = abs(sum(weights) - N)

    choice_count = 1 << len(h_upper)
    choices = range(choice_count) if all_factors else [0]
    best = None
    first_nonnegative = None
    records = []
    sqrt_lc = mp.sqrt(mp.mpf(str(H.LC())))
    for choice in choices:
        selected = [
            mp.conj(root) if choice & (1 << index) else root
            for index, root in enumerate(h_upper)
        ] + h_real_half
        phases = []
        phase_error = mp.mpf(0)
        for root, weight in zip(p_roots, weights, strict=True):
            qvalue = eval_poly(q, root)
            if weight == 0 or abs(qvalue) < mp.mpf(10) ** (-(digits // 3)):
                phases.append(mp.mpc(1))
                continue
            bvalue = sqrt_lc
            for zero in selected:
                bvalue *= root - zero
            theta = bvalue / qvalue
            phase_error = max(phase_error, abs(abs(theta) - 1))
            phases.append(theta / abs(theta))
        data = subset_data(weights, phases)
        minimum, witness, checks, negative, zeroish = minimum_selector(N, d, data)
        item = {
            "choice": choice,
            "minimum": mp.nstr(minimum, 35),
            "minimum_over_d_factorial": mp.nstr(minimum / math.factorial(d), 35),
            "negative_coefficients": negative,
            "zeroish_coefficients": zeroish,
            "coefficient_checks": checks,
            "witness": {
                "left_mask": witness[0],
                "right_mask": witness[1],
                "left_size": witness[2],
                "right_size": witness[3],
            },
            "phase_modulus_error": mp.nstr(phase_error, 8),
        }
        records.append(item)
        if best is None or minimum > mp.mpf(best[0]["minimum"]):
            best = (item, phases)
        if negative == 0 and first_nonnegative is None:
            first_nonnegative = item
        print(
            f"N={N} d={d} choice={choice}/{len(list(choices))-1} "
            f"min/d!={item['minimum_over_d_factorial']} neg={negative}",
            flush=True,
        )
        if first_nonnegative is not None and all_factors:
            # Existence is the immediate question; stop after the first.
            break
    return {
        "N": N,
        "d": d,
        "spectral_factor_choices": choice_count,
        "choices_tested": len(records),
        "weight_sum_error": mp.nstr(weight_error, 8),
        "best": best[0],
        "first_nonnegative": first_nonnegative,
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sizes", default="7:7,10:9")
    parser.add_argument("--digits", type=int, default=80)
    parser.add_argument("--first-factor-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    checks = []
    for cell in args.sizes.split(","):
        N, d = (int(value) for value in cell.split(":"))
        checks.append(one_size(N, d, args.digits, not args.first_factor_only))
    report = {
        "status": "DISCOVERY_PROBE_ONLY",
        "checks": checks,
        "scope": "High-precision root and selector evaluation; not an exact sign certificate or stability proof.",
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
