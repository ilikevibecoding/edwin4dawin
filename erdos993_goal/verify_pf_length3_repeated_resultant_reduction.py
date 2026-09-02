"""Exact bounded-degree reduction of repeated PF length-three collisions.

At sharp reserve p-alpha=17, write the source derivative chain in its affine
Riccati coordinate T.  After the quadratic positive-root filter, let h_0,...,
h_3 be the four consecutive rows.  A repeated appended negative factor c>0
produces

    q0=c^2*h0+2*c*h1+h2,   q1=c^2*h1+2*c*h2+h3.

Both q0 and q1 are affine in T.  This verifier eliminates T exactly and
shows that their common-zero equation is one quartic in c whose multidegree
is fixed, independent of reserve.  It also constructs fixed-degree
polynomials M0,M1 whose signs at a common zero are exactly the two root
orientation signs.  The remaining repeated-boundary theorem is therefore

    c>0 and resultant(c)=0  ==>  M0(c)*M1(c)>0.

No numerical approximation enters this reduction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sympy import QQ
from sympy.polys.rings import ring


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_resultant_reduction_exact_20260807.json"


def digest(poly) -> str:
    value = hashlib.sha256()
    for monomial, coefficient in poly.terms():
        value.update(
            (",".join(map(str, monomial)) + ":" + str(coefficient) + ";").encode(
                "ascii"
            )
        )
    return value.hexdigest()


def build(
    parity: str,
    *,
    return_polynomials: bool = False,
    include_alternate: bool = True,
    include_second: bool = False,
    include_projective: bool = False,
):
    ambient, r, z, u, v, c, t = ring("r,z,u,v,c,T", QQ)
    reduced, rr, zz, uu, vv, cc = ring("r,z,u,v,c", QQ)
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    elif parity == "even":
        p, alpha = 2 * r + 18, 2 * r + 1
    else:
        raise ValueError(parity)

    numerators = [(ambient.one, ambient.zero), (ambient.zero, ambient.one)]
    denominators = [ambient.one, ambient.one]
    recurrence_denominators = []
    for j in range(4):
        current_p, current_alpha = p - 2 * j, alpha + j
        denominator = (1 + 4 * z) * (current_p - 2) * (current_p - 3)
        linear = (p + alpha - j - 1) * (
            z * (4 * current_p - 6) - (current_alpha + 1)
        )
        constant = (p + alpha - j - 1) * z * (current_p + current_alpha)
        previous = ambient.one if j == 0 else recurrence_denominators[-1]
        numerators.append(
            (
                linear * numerators[-1][0]
                - constant * previous * numerators[-2][0],
                linear * numerators[-1][1]
                - constant * previous * numerators[-2][1],
            )
        )
        denominators.append(denominator * denominators[-1])
        recurrence_denominators.append(denominator)

    source_sum, source_product = u + v, u * v
    row_numerators = []
    for j in range(4):
        row_denominator = denominators[j + 2]
        numerator = ambient.zero
        for coefficient, index in (
            (ambient.one, j),
            (-source_sum, j + 1),
            (source_product, j + 2),
        ):
            numerator += (
                coefficient
                * (numerators[index][0] + numerators[index][1] * t)
                * row_denominator.exquo(denominators[index])
            )
        row_numerators.append(numerator)

    # Clear q0 by D4 and q1 by D5.  Every cleared denominator is positive
    # for r>=0,z>0, so neither common zeros nor derivative signs change.
    q0 = (
        c**2 * row_numerators[0] * denominators[4].exquo(denominators[2])
        + 2 * c * row_numerators[1] * denominators[4].exquo(denominators[3])
        + row_numerators[2]
    )
    q1 = (
        c**2 * row_numerators[1] * denominators[5].exquo(denominators[3])
        + 2 * c * row_numerators[2] * denominators[5].exquo(denominators[4])
        + row_numerators[3]
    )
    assert q0.degree(t) == q1.degree(t) == 1

    def coefficient_in_t(poly, power):
        return reduced.from_dict(
            {
                monomial[:-1]: coefficient
                for monomial, coefficient in poly.terms()
                if monomial[-1] == power
            }
        )

    p0, s0 = coefficient_in_t(q0, 0), coefficient_in_t(q0, 1)
    p1, s1 = coefficient_in_t(q1, 0), coefficient_in_t(q1, 1)
    resultant = p0 * s1 - p1 * s0
    assert resultant.degree(cc) == 4
    assert resultant.degrees() == (14, 7, 2, 2, 4)

    flow_denominator = z * (1 + 4 * z) * (p + alpha)
    flow_numerator = (
        (p + alpha) * (z * (4 * p - 2) - alpha) * t
        - z * (p + alpha) ** 2
        - (1 + 4 * z) * p * (p - 1) * t**2
    )
    directional_derivatives = [
        flow_denominator * row.diff(z) + flow_numerator * row.diff(t)
        for row in (q0, q1)
    ]
    assert all(row.degree(t) <= 2 for row in directional_derivatives)
    second_directional_derivatives = None
    if include_second:
        second_directional_derivatives = [
            flow_denominator * row.diff(z) + flow_numerator * row.diff(t)
            for row in directional_derivatives
        ]
        assert all(row.degree(t) <= 3 for row in second_directional_derivatives)

    projective_directional_derivatives = None
    if include_projective:
        # U=1/T.  Multiplying q_i(1/U) by U gives S_i+P_i U, and
        # dU/dz=-U^2 dT/dz.  The resulting projective vector field is
        # polynomial and regular at U=0 (the source-pole chart).
        projective_rows = []
        for row in (q0, q1):
            reversed_terms = {}
            for monomial, coefficient in row.terms():
                reversed_monomial = monomial[:-1] + (1 - monomial[-1],)
                reversed_terms[reversed_monomial] = (
                    reversed_terms.get(reversed_monomial, 0) + coefficient
                )
            projective_rows.append(ambient.from_dict(reversed_terms))
        projective_flow_numerator = (
            z * (p + alpha) ** 2 * t**2
            - (p + alpha) * (z * (4 * p - 2) - alpha) * t
            + (1 + 4 * z) * p * (p - 1)
        )
        projective_directional_derivatives = [
            flow_denominator * row.diff(z) + projective_flow_numerator * row.diff(t)
            for row in projective_rows
        ]
        assert all(row.degree(t) <= 2 for row in projective_directional_derivatives)

    # Substitute T=-P0/S0 and multiply by S0^2.  At a resultant zero with
    # S0!=0 this is a positive square multiple of the actual orientation.
    directional_coefficients = [
        [coefficient_in_t(derivative, power) for power in range(3)]
        for derivative in directional_derivatives
    ]
    orientations = []
    alternate_orientations = []
    for coefficients in directional_coefficients:
        cleared = reduced.zero
        alternate_cleared = reduced.zero
        for power in range(3):
            cleared += (
                coefficients[power]
                * (-p0) ** power
                * s0 ** (2 - power)
            )
            if include_alternate:
                alternate_cleared += (
                    coefficients[power]
                    * (-p1) ** power
                    * s1 ** (2 - power)
                )
        orientations.append(cleared)
        if include_alternate:
            alternate_orientations.append(alternate_cleared)
    m0, m1 = orientations
    if include_alternate:
        n0, n1 = alternate_orientations

    expected_m_degrees = (
        ((20, 10, 3, 3, 6), (22, 11, 3, 3, 6))
    )
    assert (m0.degrees(), m1.degrees()) == expected_m_degrees

    # The second collision row supplies a complementary affine chart.  On
    # R=0 with S1!=0, substituting T=-P1/S1 and multiplying by S1^2 gives
    # the same two actual directional-derivative signs.  This chart remains
    # meaningful on the spurious first-pivot locus P0=S0=0.
    if include_alternate:
        assert n0.degrees() == (24, 12, 3, 3, 6), n0.degrees()
        assert n1.degrees() == (26, 13, 3, 3, 6), n1.degrees()

    # The eliminated value annihilates q0 identically and annihilates q1
    # precisely on the quartic resultant locus:
    #   S0*q0(T*)=0,  S0*q1(T*)=-resultant.
    q0_at = p0 * s0 - s0 * p0
    q1_at = p1 * s0 - s1 * p0
    assert q0_at == 0
    assert q1_at == -resultant

    if return_polynomials:
        output = {
            "ring": reduced,
            "resultant": resultant,
            "orientation0": m0,
            "orientation1": m1,
            "slope0": s0,
            "constant0": p0,
            "slope1": s1,
            "constant1": p1,
            "directional_derivative_coefficients": directional_coefficients,
        }
        if include_alternate:
            output["alternate_orientation0"] = n0
            output["alternate_orientation1"] = n1
        if include_second:
            second_coefficients = [
                [coefficient_in_t(derivative, power) for power in range(4)]
                for derivative in second_directional_derivatives
            ]
            second_orientations = []
            alternate_second_orientations = []
            for coefficients in second_coefficients:
                # The fourth power clears a cubic evaluation by a positive
                # even power of the pivot slope, so signs are preserved.
                cleared = reduced.zero
                alternate_cleared = reduced.zero
                for power in range(4):
                    cleared += coefficients[power] * (-p0) ** power * s0 ** (4 - power)
                    if include_alternate:
                        alternate_cleared += (
                            coefficients[power] * (-p1) ** power * s1 ** (4 - power)
                        )
                second_orientations.append(cleared)
                if include_alternate:
                    alternate_second_orientations.append(alternate_cleared)
            output["second_directional_derivative_coefficients"] = second_coefficients
            output["second_orientation0"] = second_orientations[0]
            output["second_orientation1"] = second_orientations[1]
            if include_alternate:
                output["alternate_second_orientation0"] = alternate_second_orientations[0]
                output["alternate_second_orientation1"] = alternate_second_orientations[1]
        if include_projective:
            projective_coefficients = [
                [coefficient_in_t(derivative, power) for power in range(3)]
                for derivative in projective_directional_derivatives
            ]
            projective_orientations = []
            alternate_projective_orientations = []
            for coefficients in projective_coefficients:
                cleared = reduced.zero
                alternate_cleared = reduced.zero
                for power in range(3):
                    # U=-S0/P0, cleared by the positive square P0^2.
                    cleared += coefficients[power] * (-s0) ** power * p0 ** (2 - power)
                    if include_alternate:
                        alternate_cleared += (
                            coefficients[power] * (-s1) ** power * p1 ** (2 - power)
                        )
                projective_orientations.append(cleared)
                if include_alternate:
                    alternate_projective_orientations.append(alternate_cleared)
            output["projective_directional_derivative_coefficients"] = projective_coefficients
            output["projective_orientation0"] = projective_orientations[0]
            output["projective_orientation1"] = projective_orientations[1]
            if include_alternate:
                output["alternate_projective_orientation0"] = alternate_projective_orientations[0]
                output["alternate_projective_orientation1"] = alternate_projective_orientations[1]
        return output

    return {
        "parity": parity,
        "resultant_multidegree_r_z_u_v_c": list(resultant.degrees()),
        "resultant_term_count": len(resultant.terms()),
        "orientation_multidegrees": [list(m0.degrees()), list(m1.degrees())],
        "orientation_term_counts": [len(m0.terms()), len(m1.terms())],
        "q0_q1_term_counts": [len(q0.terms()), len(q1.terms())],
        "digests": {
            "resultant": digest(resultant),
            "orientation0": digest(m0),
            "orientation1": digest(m1),
        },
    }


def main() -> None:
    records = [build(parity) for parity in ("odd", "even")]
    assert all(record["resultant_term_count"] == 4532 for record in records)
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_RESULTANT_REDUCTION",
        "records": records,
        "exact_statement": (
            "For each parity, every repeated positive-factor collision is "
            "encoded by one reserve-independent quartic resultant in c. "
            "Away from the separately testable slope-degenerate locus S0=0, "
            "the signs of M0 and M1 are exactly the two collision derivative "
            "signs because the clearing multiplier is S0^2 times positive "
            "Riccati and row denominators."
        ),
        "remaining_obligation": (
            "Prove resultant(c)=0 and c>0 imply M0(c)M1(c)>0, and exclude "
            "or directly orient the S0=0 sublocus.  This is a fixed-degree "
            "semialgebraic theorem in (r,z,u,v,c), with 0<z<r+5."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_PF_LENGTH3_REPEATED_RESULTANT_REDUCTION")
    print(OUTPUT)


if __name__ == "__main__":
    main()
