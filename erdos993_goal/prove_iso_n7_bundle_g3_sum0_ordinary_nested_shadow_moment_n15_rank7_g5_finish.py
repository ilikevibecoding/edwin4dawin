#!/usr/bin/env python3
"""Fail-closed nested-shadow ordinary-parent G3 theorem from n=15."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n15_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_NESTED_SHADOW_MOMENT_N15_RANK7_G5_FINISH"
THRESHOLD_N = 15
THRESHOLD_M = 13
NEAR_TAIL_MAX = 13
FAR_THRESHOLD_N = THRESHOLD_N + NEAR_TAIL_MAX
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_rank7_g5_finish.py",
    "near_probe_report": (
        "iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n15_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "far_probe_report": (
        "iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n28_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "630722D4B22FB92A533EC2C44D794B467B42D89E82DE102F53928347D882D27C",
    "near_probe_report": "C9C61D17099E9A1884CFE42BDFE6FC3EC91BE0498EFAE047DB7B15C355C19BAF",
    "far_probe_report": "34DB5F39EF46FA373666C305BDF1AD4F6B6DA3074F97B9C25975CE79C6F4D239",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multivariate_bernstein_controls(expression, variables):
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
    return degrees, shape, controls


def certify_near_tail(numerator, variables, tail, expected_stream):
    degrees, shape, controls = multivariate_bernstein_controls(
        numerator, variables
    )
    stream = hashlib.sha256()
    near_stream = hashlib.sha256()
    tail_degree = int(max(
        sp.degree(sp.expand(controls[index]), tail) for index in np.ndindex(shape)
    ))
    minimum = None
    scalar_count = 0
    for index in np.ndindex(shape):
        polynomial = sp.expand(controls[index])
        stream.update(f"{degrees}|{index}|{sp.srepr(polynomial)};".encode())
        power = [polynomial.coeff(tail, exponent) for exponent in range(tail_degree+1)]
        scaled_power = [power[exponent]*NEAR_TAIL_MAX**exponent for exponent in range(tail_degree+1)]
        bernstein = [
            sp.factor(sum(
                scaled_power[exponent]
                * sp.Rational(math.comb(level, exponent), math.comb(tail_degree, exponent))
                for exponent in range(level+1)
            ))
            for level in range(tail_degree+1)
        ]
        # Axiswise exact inverse for P(NEAR_TAIL_MAX*x).
        recovered = [
            math.comb(tail_degree, exponent)*sum(
                (-1)**(exponent-level)*math.comb(exponent, level)*bernstein[level]
                for level in range(exponent+1)
            )
            for exponent in range(tail_degree+1)
        ]
        assert all(
            sp.expand(recovered[exponent]-scaled_power[exponent]) == 0
            for exponent in range(tail_degree+1)
        )
        assert all(coefficient > 0 for coefficient in bernstein), (index, bernstein)
        for level, coefficient in enumerate(bernstein):
            near_stream.update(
                f"{degrees}|{tail_degree}|{index}|{level}|{sp.srepr(coefficient)};".encode()
            )
        local_minimum = min(bernstein)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        scalar_count += len(bernstein)
    assert stream.hexdigest().upper() == expected_stream
    return {
        "variables": list(map(str, variables)),
        "degree_profile": [int(degree) for degree in degrees],
        "multivariate_bernstein_controls": int(np.prod(shape)),
        "tail_interval": f"0<=tail<={NEAR_TAIL_MAX}",
        "tail_bernstein_degree": tail_degree,
        "tail_bernstein_controls": scalar_count,
        "minimum_tail_bernstein_control": str(minimum),
        "exact_multivariate_power_inversion": True,
        "exact_tail_power_inversion": True,
        "multivariate_control_stream_sha256": stream.hexdigest().upper(),
        "near_tensor_stream_sha256": near_stream.hexdigest().upper(),
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    near_probe = json.loads((HERE / FILES["near_probe_report"]).read_text(encoding="utf-8"))
    far_probe = json.loads((HERE / FILES["far_probe_report"]).read_text(encoding="utf-8"))
    moment = json.loads((HERE / FILES["moment_report"]).read_text(encoding="utf-8"))
    assert near_probe["threshold_n"] == THRESHOLD_N
    assert near_probe["summary"]["negative_tail_scalar_coefficients"] == 2
    assert far_probe["threshold_n"] == FAR_THRESHOLD_N
    assert far_probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert far_probe["summary"]["first_negative"] == []
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )

    m, variables, value, exact, coefficients, lower, a3, a2, c5_ceiling = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(2, 9)}
    lower_w2 = choose_poly(m, 2)-(m-1)
    lower_w3 = choose_poly(m, 3)-(m-1)*(m-2)
    a3_upper = sp.expand(a3.subs({
        W[2]: lower_w2, W[3]: lower_w3, W[4]: choose_poly(m, 4)
    }))
    a2_upper = sp.expand(a2.subs({
        W[2]: lower_w2, W[3]: lower_w3,
        W[4]: choose_poly(m, 4), W[5]: choose_poly(m, 5),
    }))
    for bound in (c5_ceiling, a3_upper, a2_upper):
        assert all(coefficient < 0 for coefficient in sp.Poly(
            bound.subs(m, tail+THRESHOLD_M), tail
        ).all_coeffs())

    near_value = sp.cancel(value.subs(m, tail+THRESHOLD_M))
    near_numerator, near_denominator = map(sp.expand, sp.fraction(near_value))
    if sp.LC(sp.Poly(near_denominator, tail)) < 0:
        near_numerator, near_denominator = -near_numerator, -near_denominator
    assert sp.factor(near_denominator) == 80640*(tail+THRESHOLD_M)**4
    assert all(coefficient > 0 for coefficient in sp.Poly(
        near_denominator, tail
    ).all_coeffs())
    near_certificate = certify_near_tail(
        near_numerator, variables, tail,
        near_probe["summary"]["ordered_stream_sha256"],
    )
    assert near_certificate["degree_profile"] == near_probe["summary"]["degree_profile"]

    # Reuse the canonical symbol name from the pinned probe so the exact
    # ordered-control stream is byte-for-byte comparable.
    far_tail = tail
    far_value = sp.cancel(value.subs(m, far_tail+FAR_THRESHOLD_N-2))
    far_numerator, far_denominator = map(sp.expand, sp.fraction(far_value))
    if sp.LC(sp.Poly(far_denominator, far_tail)) < 0:
        far_numerator, far_denominator = -far_numerator, -far_denominator
    assert sp.factor(far_denominator) == 80640*(far_tail+FAR_THRESHOLD_N-2)**4
    assert all(coefficient > 0 for coefficient in sp.Poly(
        far_denominator, far_tail
    ).all_coeffs())
    far_certificate = efficient_certify_bernstein(far_numerator, variables, far_tail)
    far_summary = far_probe["summary"]
    assert far_certificate["degree_profile"] == far_summary["degree_profile"]
    assert far_certificate["bernstein_coefficients"] == far_summary["bernstein_controls"]
    assert far_certificate["tail_power_coefficients"] == far_summary["tail_scalar_coefficients"]
    assert far_certificate["minimum_tail_power_coefficient"] == far_summary[
        "minimum_tail_scalar_coefficient"
    ]
    assert far_certificate["ordered_stream_sha256"] == far_summary["ordered_stream_sha256"]
    assert far_certificate["exact_power_inversion"] is True

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be an isolate-free unmarked forest, with nonadjacent marked "
            "vertices in common0/sum0 geometry, and let p be a nonisolated ordinary "
            "parent in the forced mask p_u0_v0. If n=|W|+2>=15, then G3>=0."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "ordinary_parent_p_u0_v0",
            "ordinary_parent": "nonisolated",
            "orders": "n>=15",
            "unmarked_core_orders": "m>=13",
        },
        "tail_partition": {
            "near": "15<=n<=28, exact tail Bernstein tensor on 0<=m-13<=13",
            "far": "n>=28, exact shifted-tail power certificate",
            "overlap": "n=28",
        },
        "near_certificate": near_certificate,
        "far_certificate": far_certificate,
        "positive_denominators": {
            "near": str(sp.factor(near_denominator)),
            "far": str(sp.factor(far_denominator)),
        },
        "proof_facts": {
            "exact_ordinary_expression": str(exact),
            "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
            "nested_shadow": (
                "In U=W-N[p], R3=T2,R4=T3,R5=T4. Since p is nonisolated, "
                "|U|<=m-2. Drop positive R6,R7; use 4T4<=(|U|-3)T3 and "
                "3T3<=(|U|-2)T2. The exact negative coefficients a3 and a2 "
                "then give parent loss at least a2*T2>=a2*C(m-2,2)."
            ),
            "c5_negative_ceiling": str(c5_ceiling),
            "a3_exact": str(a3),
            "a3_negative_ceiling": str(a3_upper),
            "a2_exact": str(a2),
            "a2_negative_ceiling": str(a2_upper),
            "safe_lower": str(lower),
            "moment_embedding": (
                "The safe lower is certified on the exact W4 edge/wedge/subtree "
                "cone and the coupled W5,...,W8 blocked-extension intervals."
            ),
        },
        "finite_seam_guard": (
            "This theorem does not close 11<=n<=14 (equivalently 9<=m<=12)."
        ),
        "coverage_gap_within_stated_large_order_nonisolated_ordinary_G3": None,
        "universal_ordinary_G3_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only nonisolated ordinary-parent p_u0_v0 nonadjacent/common0/sum0 "
            "rank-seven G3 for n>=15. The four finite orders n=11..14, isolated "
            "parent, other geometries, and other modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "near_tail_bernstein_controls": near_certificate["tail_bernstein_controls"],
        "near_minimum": near_certificate["minimum_tail_bernstein_control"],
        "far_tail_power_coefficients": far_certificate["tail_power_coefficients"],
        "far_minimum": far_certificate["minimum_tail_power_coefficient"],
        "finite_seam": "n=11..14",
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
