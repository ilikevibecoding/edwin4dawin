#!/usr/bin/env python3
"""Fail-closed dense-isolate theorem for rank-seven G1, sum-zero/no-parent.

Write the unmarked graph as W=H plus isolated vertices, with |H|<=|W|/10.
Only the universal inequalities 0<=i_k(H)<=h^k/k! are used, so the large-
order certificate holds for arbitrary H, not merely forests.  The literal G1
coefficient is independently reconstructed and the eight-dimensional rational
Bernstein tensor is inverted exactly before promotion.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_RANK7_G4_PIECEWISE"
THRESHOLD_N = 11
THRESHOLD_M = THRESHOLD_N-2
CORE_FRACTION = sp.Rational(1, 10)
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "bernstein_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
    "probe_source": "probe_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "probe_report": "iso_n7_bundle_g1_sum0_dense_isolates_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "bernstein_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "probe_source": "AF7502CEBFAD151567D5CC46962AB2E03906116C50E19133302E137092D62530",
    "probe_report": "E4B48E53E7F0245B8DCB159F33815936ABF45CCBFD08CE2879CE3473438E2B7E",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def efficient_certify_bernstein(expression, variables, tail):
    """Exact tensor conversion plus axiswise inverse, with polynomial controls."""
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
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

    stream = hashlib.sha256()
    scalar_count = 0
    minimum = None
    minimum_at_tail_zero = None
    for index in np.ndindex(shape):
        value = sp.expand(controls[index])
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        coefficients = sp.Poly(value, tail).all_coeffs()
        assert all(coefficient >= 0 for coefficient in coefficients), (index, value)
        scalar_count += len(coefficients)
        local_minimum = min(coefficients)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        at_zero = value.subs(tail, 0)
        minimum_at_tail_zero = (
            at_zero if minimum_at_tail_zero is None
            else min(minimum_at_tail_zero, at_zero)
        )
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_coefficients": int(np.prod(shape)),
        "minimum_at_tail_zero": str(minimum_at_tail_zero),
        "tail_power_coefficients": scalar_count,
        "minimum_tail_power_coefficient": str(minimum),
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_RANK7_G4_PIECEWISE"
    )
    assert probe["negative_tail_scalar_coefficients"] == 0
    assert probe["core_fraction"] == "1/10"
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m = sp.Symbol("m", nonnegative=True)
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(9)}
    W[0] = sp.Integer(1)
    W[1] = m
    crows = {
        "E": {rank: W.get(rank, 0)+2*W.get(rank-1, 0)+W.get(rank-2, 0) for rank in range(9)},
        "U": {rank: W.get(rank, 0)+W.get(rank-1, 0) for rank in range(9)},
        "V": {rank: W.get(rank, 0)+W.get(rank-1, 0) for rank in range(9)},
        "W": {rank: W.get(rank, 0) for rank in range(9)},
    }
    substitutions = {
        sp.Symbol(f"{prefix}{family}{rank}"): crows[family][rank]
        for prefix in ("c", "d") for family in "EUVW" for rank in range(9)
    }
    reduced = sp.factor(generic.subs(substitutions, simultaneous=True))
    expected_reduced = (
        8*W[3]**2+24*W[3]*W[4]-64*W[3]*W[5]-106*W[3]*W[6]
        -51*W[3]*W[7]-8*W[3]*W[8]+80*W[4]**2+90*W[4]*W[5]
        -12*W[4]*W[6]-10*W[4]*W[7]+39*W[5]**2+10*W[5]*W[6]
    )
    assert sp.expand(reduced-expected_reduced) == 0

    tail, core_parameter = sp.symbols("tail core_parameter", nonnegative=True)
    level_parameter = {
        k: sp.Symbol(f"level{k}_parameter", nonnegative=True)
        for k in range(2, 9)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    core_rows = {
        0: sp.Integer(1), 1: h,
        **{
            k: h**k*level_parameter[k]/sp.factorial(k)
            for k in range(2, 9)
        },
    }
    rows = {
        k: sp.expand(sum(
            choose(isolates, k-j)*core_rows[j] for j in range(k+1)
        ))
        for k in range(3, 9)
    }
    value = sp.factor(reduced.subs({W[k]: rows[k] for k in range(3, 9)}))
    shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
    variables = (core_parameter, *(level_parameter[k] for k in range(2, 9)))
    certificate = efficient_certify_bernstein(shifted, variables, tail=tail)
    assert certificate["degree_profile"] == probe["summary"]["degree_profile"]
    assert sp.Rational(certificate["minimum_tail_power_coefficient"]) > 0
    assert certificate["minimum_tail_power_coefficient"] == probe["summary"][
        "minimum_tail_scalar_coefficient"
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let C consist of two isolated marked vertices and W, and use "
            "no-parent mode D=C. If at least nine tenths of the vertices of W "
            "are isolated, then the exact rank-seven bundle coefficient G1 is "
            "nonnegative."
        ),
        "coverage": [
            {
                "orders": "2<=n<=10",
                "method": "pinned exhaustive all-forest/all-parent finite certificate",
            },
            {
                "orders": "n>=11",
                "condition": "W=H+rK1 with |H|<=|W|/10",
                "method": (
                    "literal reconstruction and exact eight-variable rational "
                    "Bernstein certificate on the universal core-count box"
                ),
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "certificate": certificate,
        "proof_facts": {
            "exact_convolution": "i_k(W)=sum_j C(r,k-j)i_j(H)",
            "universal_box": "0<=i_k(H)<=C(h,k)<=h^k/k! for k=2,...,8",
            "core_fraction": "h<=|W|/10",
            "forest_use": (
                "None in the large-order cone; H may be an arbitrary graph."
            ),
        },
        "exact_power_inversion": True,
        "coverage_gap_within_dense_isolate_no_parent_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1, common0/sum0, no-parent mode, with at least 90 "
            "percent isolated unmarked vertices. Other parent modes and cores "
            "with a larger non-isolated fraction remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_dense_isolate_no_parent_G1": None,
        "degree_profile": certificate["degree_profile"],
        "bernstein_coefficients": certificate["bernstein_coefficients"],
        "minimum_tail_power_coefficient": certificate[
            "minimum_tail_power_coefficient"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
