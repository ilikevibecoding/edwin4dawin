#!/usr/bin/env python3
"""Exact affine-box probe for dense-isolate G1 and an ordinary core parent.

Let W=H+rK1, |H|<=|W|/10, and p lie in H.  Write L=H-N[p].  The exact rows
of sets containing p are the isolate convolution of the rows of L.  We relax
the H and L rows independently by their universal vertex-count boxes.  The L
parameters enter affinely, so their whole cube is eliminated coefficientwise
after an exact Bernstein transform in the H variables.  No theorem is asserted
by this probe.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import choose


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_CORE_RANK7_G4_PIECEWISE"
THRESHOLD_M = 20
CORE_FRACTION = sp.Rational(1, 10)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_controls(expression, variables, degrees):
    """Convert into a prescribed tensor Bernstein degree and invert exactly."""
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert all(
        polynomial.degree(variable) <= degree
        for variable, degree in zip(variables, degrees)
    )
    shape = tuple(degree+1 for degree in degrees)
    power = np.empty(shape, dtype=object)
    power.fill(sp.Integer(0))
    for index, coefficient in polynomial.terms():
        power[index] = sp.expand(coefficient)

    controls = power.copy()
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree+1, -1))
        target = np.empty_like(source)
        for index in range(degree+1):
            target[index] = sum(
                source[exponent]
                * sp.Rational(math.comb(index, exponent), math.comb(degree, exponent))
                for exponent in range(index+1)
            )
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)

    recovered = controls.copy()
    for axis in range(len(degrees)-1, -1, -1):
        degree = degrees[axis]
        moved = np.moveaxis(recovered, axis, 0)
        source = moved.reshape((degree+1, -1))
        target = np.empty_like(source)
        for exponent in range(degree+1):
            target[exponent] = math.comb(degree, exponent)*sum(
                (-1)**(exponent-index)*math.comb(exponent, index)*source[index]
                for index in range(exponent+1)
            )
        recovered = np.moveaxis(target.reshape(moved.shape), 0, axis)
    assert all(
        sp.expand(recovered[index]-power[index]) == 0
        for index in np.ndindex(shape)
    )
    return controls


def certify_affine_box(expression, base_variables, affine_variables, tail):
    """Sufficient exact certificate on [0,1]^(base+affine), tail>=0.

    The expression must be jointly affine with no cross-products in the affine
    variables.  After exact Bernstein conversion in the base variables, each
    tail coefficient is bounded below by its constant part plus every negative
    affine coefficient.  This eliminates the entire affine cube at once.
    """
    base = sp.expand(expression.subs({variable: 0 for variable in affine_variables}))
    parts = [sp.expand(sp.diff(expression, variable)) for variable in affine_variables]
    assert all(not (part.free_symbols & set(affine_variables)) for part in parts)
    assert sp.expand(
        expression-base-sum(variable*part for variable, part in zip(affine_variables, parts))
    ) == 0
    full = sp.Poly(sp.expand(expression), *base_variables)
    degrees = tuple(full.degree(variable) for variable in base_variables)
    labels = ["constant", *map(str, affine_variables)]
    arrays = [tensor_controls(piece, base_variables, degrees) for piece in (base, *parts)]
    shape = arrays[0].shape
    tail_degree = max(
        sp.Poly(value, tail).degree()
        for array in arrays for value in array.flat
    )
    control_stream = hashlib.sha256()
    worst_stream = hashlib.sha256()
    negative_count = 0
    scalar_count = 0
    minimum = None
    first_negative = []
    for label, array in zip(labels, arrays):
        for index in np.ndindex(shape):
            control_stream.update(
                f"{degrees}|{label}|{index}|{sp.srepr(sp.expand(array[index]))};".encode()
            )
    for index in np.ndindex(shape):
        coefficient_maps = [
            {power[0]: coefficient for power, coefficient in sp.Poly(
                sp.expand(array[index]), tail
            ).terms()}
            for array in arrays
        ]
        for exponent in range(tail_degree+1):
            constant = coefficient_maps[0].get(exponent, sp.Integer(0))
            affine = [mapping.get(exponent, sp.Integer(0)) for mapping in coefficient_maps[1:]]
            worst = sp.expand(constant+sum(min(sp.Integer(0), value) for value in affine))
            worst_stream.update(f"{index}|{exponent}|{sp.srepr(worst)};".encode())
            scalar_count += 1
            minimum = worst if minimum is None else min(minimum, worst)
            if worst < 0:
                negative_count += 1
                if len(first_negative) < 20:
                    first_negative.append({
                        "index": list(index),
                        "tail_exponent": exponent,
                        "constant": str(constant),
                        "affine_coefficients": list(map(str, affine)),
                        "worst": str(worst),
                    })
    return {
        "base_variables": list(map(str, base_variables)),
        "affine_variables": list(map(str, affine_variables)),
        "base_degree_profile": list(degrees),
        "bernstein_controls": int(np.prod(shape)),
        "affine_cube_vertices_eliminated": 2**len(affine_variables),
        "tail_degree": tail_degree,
        "worst_tail_scalar_coefficients": scalar_count,
        "negative_worst_tail_scalar_coefficients": negative_count,
        "minimum_worst_tail_scalar_coefficient": str(minimum),
        "first_negative": first_negative,
        "exact_power_inversion": True,
        "ordered_component_control_stream_sha256": control_stream.hexdigest().upper(),
        "ordered_worst_stream_sha256": worst_stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols.update({
        f"P{family}{rank}": sp.Symbol(f"P{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(3, 8)
    })
    W = {k: symbols[f"W{k}"] for k in range(2, 9)}
    T = {k: sp.Symbol(f"T{k}", nonnegative=True) for k in range(1, 8)}
    shifts = {symbols[f"A{k}"]: W[k-1] for k in range(4, 9)}
    shifts.update({symbols[f"B{k}"]: W[k-1] for k in range(4, 9)})
    shifts.update({symbols[f"Z{k}"]: W[k-2] for k in range(5, 9)})
    for k in range(3, 8):
        shifts[symbols[f"PW{k}"]] = T[k]
        shifts[symbols[f"PA{k}"]] = T[k-1]
        shifts[symbols[f"PB{k}"]] = T[k-1]
        shifts[symbols[f"PZ{k}"]] = T[k-2]
    expression = sp.expand(sp.sympify(
        source["modes"]["ordinary_parent"]["expression"], locals=symbols
    ))
    reduced = sp.factor(expression.subs(shifts, simultaneous=True))
    assert all(sp.diff(reduced, T[k], 2) == 0 for k in range(3, 8))

    m, tail, core_parameter = sp.symbols("m tail core_parameter", nonnegative=True)
    hlevel = {
        k: sp.Symbol(f"H{k}_parameter", nonnegative=True) for k in range(2, 9)
    }
    llevel = {
        k: sp.Symbol(f"L{k}_parameter", nonnegative=True) for k in range(1, 7)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    H = {
        0: sp.Integer(1), 1: h,
        **{k: h**k*hlevel[k]/sp.factorial(k) for k in range(2, 9)},
    }
    L = {
        0: sp.Integer(1),
        **{k: h**k*llevel[k]/sp.factorial(k) for k in range(1, 7)},
    }
    Wrows = {
        k: sp.expand(sum(choose(isolates, k-j)*H[j] for j in range(k+1)))
        for k in range(2, 9)
    }
    Trows = {
        k: sp.expand(sum(choose(isolates, k-1-j)*L[j] for j in range(k)))
        for k in range(3, 8)
    }
    value = sp.factor(reduced.subs({
        **{W[k]: Wrows[k] for k in range(2, 9)},
        **{T[k]: Trows[k] for k in range(3, 8)},
    }, simultaneous=True))
    shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
    base_variables = (core_parameter, *(hlevel[k] for k in range(2, 9)))
    affine_variables = tuple(llevel[k] for k in range(1, 7))
    print("CERT_START", base_variables, affine_variables, flush=True)
    summary = certify_affine_box(shifted, base_variables, affine_variables, tail)
    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "mode": "ordinary_parent_in_nonisolated_core",
        "threshold_n": THRESHOLD_M+2,
        "core_fraction": str(CORE_FRACTION),
        "decomposition": "W=H+rK1, p in H, L=H-N[p]",
        "universal_boxes": [
            "0<=i_k(H)<=h^k/k! independently for k=2,...,8",
            "0<=i_k(L)<=h^k/k! independently for k=1,...,6",
        ],
        "exact_containing_p_rows": "T_k=sum_j C(r,k-1-j)i_j(L)",
        "summary": summary,
        "negative_worst_tail_scalar_coefficients": summary[
            "negative_worst_tail_scalar_coefficients"
        ],
        "status": "diagnostic exact relaxation; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, ordinary p in the nonisolated core, "
            "n>=22, with at least 90 percent of W vertices isolated."
        ),
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "base_degree_profile": summary["base_degree_profile"],
        "bernstein_controls": summary["bernstein_controls"],
        "affine_cube_vertices_eliminated": summary[
            "affine_cube_vertices_eliminated"
        ],
        "negative_worst_tail_scalar_coefficients": summary[
            "negative_worst_tail_scalar_coefficients"
        ],
        "minimum_worst_tail_scalar_coefficient": summary[
            "minimum_worst_tail_scalar_coefficient"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
