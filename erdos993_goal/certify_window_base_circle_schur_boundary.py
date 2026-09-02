"""Exact Bernstein certificate for the base two-outlier circle theorem.

For L >= 7 and 0 <= u,v,t <= 1, put

    R(z) = 16 z^2 + 4 ((L+2)(u+v)-4) z
           + uv(L+2)(L+1),
    C_t(z) = z R(z-1) - t(z+L)R(z),
    rho^2 = L(L+1)/16.

If C_t has a conjugate pair z,zbar whose product is rho^2, Vieta gives a
real third root and a quadratic Schur-boundary equation N=0.  The pair is
nonreal exactly when W=(Re z)^2-rho^2 < 0.  This program certifies, using
only exact integer Bernstein arithmetic, that

                       N = 0  ==>  W >= 0.

Consequently C_t has no nonreal zero on |z|=rho for 0<t<1.  Equivalently,
the rational function z R(z-1)/((z+L)R(z)) never takes a value in (0,1)
on the open upper target semicircle.

The unbounded interval L>=7 is compactified by L=7/(1-a), 0<=a<=1;
the common denominator (1-a)^2 is cleared from N and W.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp

from certify_pf_length3_repeated_branch_core import (
    integer_power_to_bernstein_reduced,
)
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "window_base_circle_schur_boundary_exact_20260809.json"


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int]
    address: str


def divide_common_gcd(array: np.ndarray) -> np.ndarray:
    common = 0
    for value in array.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return array
    if common <= 1:
        return array
    result = np.empty_like(array)
    for index, value in enumerate(array.flat):
        result.flat[index] = int(value) // common
    return result


def polynomial_to_power_array(poly: sp.Poly) -> tuple[np.ndarray, dict]:
    degrees = tuple(poly.degree(variable) for variable in poly.gens)
    result = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    denominators = [coefficient.q for _, coefficient in poly.terms()]
    common = math.lcm(*map(int, denominators)) if denominators else 1
    for monomial, coefficient in poly.terms():
        result[monomial] = int(coefficient * common)
    result = divide_common_gcd(result)
    return result, {
        "degrees": list(degrees),
        "terms": len(poly.terms()),
        "clearing_denominator": common,
    }


def build_polynomials() -> tuple[sp.Poly, sp.Poly, dict]:
    a, u, v, t = sp.symbols("a u v t")
    L, z = sp.symbols("L z")
    S, P = u + v, u * v
    rho2 = L * (L + 1) / 16
    R = lambda argument: (
        16 * argument**2
        + 4 * ((L + 2) * S - 4) * argument
        + P * (L + 2) * (L + 1)
    )
    cubic = sp.Poly(sp.expand(z * R(z - 1) - t * (z + L) * R(z)), z)
    leading, quadratic, linear, constant = cubic.all_coeffs()

    # If the first two roots have product rho2, the third root is w.
    w = sp.factor(-constant / (leading * rho2))
    schur = sp.factor(linear / leading - rho2 + w * quadratic / leading + w**2)
    real_part = sp.factor((-quadratic / leading - w) / 2)
    discriminant = sp.factor(real_part**2 - rho2)
    schur_num, schur_den = map(sp.factor, sp.together(schur).as_numer_denom())
    discr_num, discr_den = map(sp.factor, sp.together(discriminant).as_numer_denom())

    # Both denominators are positive for 0<t<1 and L>=7.  Projectivize L.
    d = 1 - a
    projective_L = sp.Rational(7, 1) / d
    projected_schur = sp.cancel(d**2 * schur_num.subs(L, projective_L))
    projected_discr = sp.cancel(d**2 * discr_num.subs(L, projective_L))
    assert sp.denom(projected_schur) == 1
    assert sp.denom(projected_discr) == 1
    projected_schur = sp.Poly(sp.expand(projected_schur), a, u, v, t, domain=sp.QQ)
    projected_discr = sp.Poly(sp.expand(projected_discr), a, u, v, t, domain=sp.QQ)

    metadata = {
        "variables": ["a", "u", "v", "t"],
        "compactification": "L=7/(1-a)",
        "domain": "0<=a,u,v,t<=1",
        "schur_denominator": str(schur_den),
        "discriminant_denominator": str(discr_den),
        "vieta_third_root": str(w),
        "real_part": str(real_part),
        "projected_schur_sha256": hashlib.sha256(
            str(projected_schur.as_expr()).encode("utf-8")
        ).hexdigest(),
        "projected_discriminant_sha256": hashlib.sha256(
            str(projected_discr.as_expr()).encode("utf-8")
        ).hexdigest(),
    }
    return projected_schur, projected_discr, metadata


def controls_for(poly: sp.Poly) -> tuple[np.ndarray, dict]:
    power, metadata = polynomial_to_power_array(poly)
    return integer_power_to_bernstein_reduced(power), metadata


def bounds(array: np.ndarray) -> tuple[int, int]:
    return min(map(int, array.flat)), max(map(int, array.flat))


def nonnegative_modulo_constraint(target: np.ndarray, constraint: np.ndarray) -> bool:
    """Find rational lambda with target-lambda*constraint >= 0 coefficientwise."""

    lower: Fraction | None = None
    upper: Fraction | None = None
    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value = int(target_value)
        constraint_value = int(constraint_value)
        if constraint_value == 0:
            if target_value < 0:
                return False
            continue
        bound = Fraction(target_value, constraint_value)
        if constraint_value > 0:
            if upper is None or bound < upper:
                upper = bound
        elif lower is None or lower < bound:
            lower = bound
    return lower is None or upper is None or lower <= upper


def leaf_reason(controls: dict[str, np.ndarray]) -> str | None:
    low, high = bounds(controls["N"])
    if low > 0:
        return "N>0"
    if high < 0:
        return "N<0"
    if nonnegative_modulo_constraint(controls["W"], controls["N_for_W"]):
        return "W>=0_on_N=0"
    return None


def choose_axis(controls: dict[str, np.ndarray], depth: tuple[int, ...]) -> int:
    target = controls["N"]
    low, high = bounds(target)
    if not (low <= 0 <= high):
        target = controls["W"]
    scores = []
    for axis in range(target.ndim):
        variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(target.ndim), key=lambda axis: scores[axis])


def certify(max_cells: int, max_depth: int, progress_every: int) -> dict:
    started = time.monotonic()
    schur, discr, derivation = build_polynomials()
    n_controls, n_meta = controls_for(schur)
    w_controls, w_meta = controls_for(discr)

    # Degree-elevate N to W's tensor shape by rebuilding N with W's degrees.
    target_shape = tuple(max(a, b) for a, b in zip(n_controls.shape, w_controls.shape))
    from certify_pf_length3_repeated_positive_root_orientation import elevate_tensor_to_shape

    n_controls = elevate_tensor_to_shape(n_controls, target_shape, exact=True)
    w_controls = elevate_tensor_to_shape(w_controls, target_shape, exact=True)

    # Independent compact replay of the certificate.  The reduced Bernstein
    # tensors represent 8*N and 2*W, respectively (checked at the origin).
    # Hence the following two coefficientwise inequalities are precisely
    # W-6N >= 0 on u in [0,1/2] and W-8N >= 0 on u in [1/2,1].
    origin = {generator: 0 for generator in schur.gens}
    n_scale = Fraction(int(n_controls[(0, 0, 0, 0)]), int(schur.eval(origin)))
    w_scale = Fraction(int(w_controls[(0, 0, 0, 0)]), int(discr.eval(origin)))
    assert n_scale == 8 and w_scale == 2
    n_halves = midpoint_split_exact(n_controls, 1)
    w_halves = midpoint_split_exact(w_controls, 1)
    left_identity = 2 * w_halves[0] - 3 * n_halves[0]
    right_identity = w_halves[1] - 2 * n_halves[1]
    assert min(map(int, left_identity.flat)) >= 0
    assert min(map(int, right_identity.flat)) >= 0
    explicit_identity_audit = {
        "bernstein_tensor_shape": list(target_shape),
        "normalized_control_scales": {"N": str(n_scale), "W": str(w_scale)},
        "u_in_[0,1/2]": {
            "polynomial": "W-6*N",
            "integer_control_combination": "2*W_controls-3*N_controls",
            "minimum_control": min(map(int, left_identity.flat)),
            "maximum_control": max(map(int, left_identity.flat)),
            "zero_controls": sum(int(value) == 0 for value in left_identity.flat),
        },
        "u_in_[1/2,1]": {
            "polynomial": "W-8*N",
            "integer_control_combination": "W_controls-2*N_controls",
            "minimum_control": min(map(int, right_identity.flat)),
            "maximum_control": max(map(int, right_identity.flat)),
            "zero_controls": sum(int(value) == 0 for value in right_identity.flat),
        },
    }
    controls = {"N": n_controls, "W": w_controls, "N_for_W": n_controls.copy()}

    stack = [Cell(controls, (0, 0, 0, 0), "")]
    reasons: Counter[str] = Counter()
    deepest = [0, 0, 0, 0]
    unresolved = None
    processed = 0
    while stack:
        cell = stack.pop()
        processed += 1
        if progress_every and processed % progress_every == 0:
            print(
                json.dumps(
                    {
                        "processed": processed,
                        "stack": len(stack),
                        "leaves": sum(reasons.values()),
                        "deepest": deepest,
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                    }
                ),
                flush=True,
            )
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason = leaf_reason(cell.controls)
        if reason:
            reasons[reason] += 1
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.controls, cell.depth)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        stack.append(Cell(children[1], tuple(next_depth), cell.address + f"{axis}R"))
        stack.append(Cell(children[0], tuple(next_depth), cell.address + f"{axis}L"))

    return {
        "status": "PASS_EXACT_BASE_CIRCLE_SCHUR_BOUNDARY" if unresolved is None else "INCOMPLETE",
        "claim": "For L>=7 and 0<=u,v,t<=1, N=0 implies W>=0.",
        "consequence": (
            "zR(z-1)/((z+L)R(z)) avoids (0,1) on the nonreal target circle "
            "|z|=sqrt(L(L+1))/4."
        ),
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "deepest": deepest,
        "polynomials": {"N": n_meta, "W": w_meta},
        "explicit_identity_audit": explicit_identity_audit,
        "derivation": derivation,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=160)
    parser.add_argument("--progress-every", type=int, default=500)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = certify(args.max_cells, args.max_depth, args.progress_every)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
