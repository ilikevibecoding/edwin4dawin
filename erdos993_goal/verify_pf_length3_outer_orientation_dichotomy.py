"""Exact outer-orientation theorem for positive PF length-three collisions.

At sharp reserve ``p-alpha=17`` put ``z=r+5+w`` and write the four
quadratically filtered Riccati rows as

    h_j(T)=b_j+a_j T,  j=0,1,2,3.

For a positive appended quadratic kernel with sum C>0 and product D>0,
the two collision equations are

    D h_0+C h_1+h_2 = D h_1+C h_2+h_3 = 0.

This verifier proves exactly that every such common zero in the outer region
has ``a_0,a_1,a_2,a_3<0``.  Consequently both collision-curve slopes Q_0 and
Q_1 are negative, closing the orientation gap left by the outer Riccati
supersolution theorem.

The proof has two certificate layers.

1. Source Turan combinations force the slope signs to be a negative prefix
   followed by a positive suffix.  One smallest-order odd edge is split into
   two overlapping exact regions at w=200.
2. If a_3>=0, six affine-row determinant atoms are positive.  Their positive
   combination is the determinant of the two collision equations, so those
   equations cannot have a common zero.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from sympy import QQ
from sympy.polys.rings import ring


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_outer_orientation_dichotomy_exact_20260807.json"
SPLIT = 200


def tensor_bernstein_controls(poly, ambient, residual, variables, degrees):
    selected = [ambient.gens.index(variable) for variable in variables]
    residual_indices = list(range(len(residual.gens)))
    ignored = [
        index
        for index in range(len(ambient.gens))
        if index not in selected and index not in residual_indices
    ]
    slices = {}
    for powers in itertools.product(
        *[range(degree + 1) for degree in degrees]
    ):
        output = residual.zero
        for monomial, coefficient in poly.terms():
            if tuple(monomial[index] for index in selected) != powers:
                continue
            assert all(monomial[index] == 0 for index in ignored)
            residual_monomial = tuple(
                monomial[index] for index in residual_indices
            )
            output += coefficient * residual.from_dict(
                {residual_monomial: QQ(1)}
            )
        slices[powers] = output

    controls = []
    for index in itertools.product(
        *[range(degree + 1) for degree in degrees]
    ):
        control = residual.zero
        for powers in itertools.product(
            *[range(bound + 1) for bound in index]
        ):
            multiplier = QQ(1)
            for coordinate, power, degree in zip(index, powers, degrees):
                multiplier *= QQ(
                    math.comb(coordinate, power), math.comb(degree, power)
                )
            control += multiplier * slices[powers]
        controls.append(control)
    return controls


def scalar_bernstein_controls(poly, ambient):
    variables = ambient.gens
    degrees = [poly.degree(variable) for variable in variables]
    coefficient_map = dict(poly.terms())
    controls = []
    for index in itertools.product(
        *[range(degree + 1) for degree in degrees]
    ):
        value = QQ(0)
        for powers in itertools.product(
            *[range(bound + 1) for bound in index]
        ):
            multiplier = QQ(1)
            for coordinate, power, degree in zip(index, powers, degrees):
                multiplier *= QQ(
                    math.comb(coordinate, power), math.comb(degree, power)
                )
            value += coefficient_map.get(tuple(powers), QQ(0)) * multiplier
        controls.append(value)
    return controls


def digest_polynomials(polynomials) -> str:
    payload = []
    for index, polynomial in enumerate(polynomials):
        if hasattr(polynomial, "terms"):
            payload.extend(
                f"{index}:{','.join(map(str, monomial))}:{coefficient}"
                for monomial, coefficient in polynomial.terms()
            )
        else:
            payload.append(f"{index}:{polynomial}")
    return hashlib.sha256(";".join(payload).encode("ascii")).hexdigest()


def certify_tensor(
    poly, ambient, residual, variables, residual_variables, *, strict=True
):
    degrees = [poly.degree(variable) for variable in variables]
    controls = tensor_bernstein_controls(
        poly, ambient, residual, variables, degrees
    )
    coefficient_count = 0
    for control_index, control in enumerate(controls):
        coefficients = [coefficient for _, coefficient in control.terms()]
        assert all(coefficient >= 0 for coefficient in coefficients)
        coefficient_count += len(coefficients)
        if strict:
            assert coefficients
            constant = dict(control.terms()).get(
                (0,) * len(residual.gens), QQ(0)
            )
            assert constant > 0, (control_index, degrees, control)
    return {
        "degrees": degrees,
        "control_count": len(controls),
        "coefficient_count": coefficient_count,
        "all_coefficients_nonnegative": True,
        "all_controls_strict": strict,
        "digest": digest_polynomials(controls),
    }


def certify_scalar(poly, ambient):
    controls = scalar_bernstein_controls(poly, ambient)
    assert controls and all(control > 0 for control in controls)
    return {
        "degrees": [poly.degree(variable) for variable in ambient.gens],
        "control_count": len(controls),
        "all_controls_strict": True,
        "digest": digest_polynomials(controls),
    }


def coefficientwise_strict(poly, variables):
    coefficients = [coefficient for _, coefficient in poly.terms()]
    assert coefficients and all(coefficient >= 0 for coefficient in coefficients)
    assert dict(poly.terms()).get(
        (0,) * len(poly.ring.gens), QQ(0)
    ) > 0
    return {
        "coefficient_count": len(coefficients),
        "all_coefficients_nonnegative": True,
        "strict_at_origin": True,
        "digest": digest_polynomials([poly]),
    }


def retain_zero_power(poly, ambient, variable):
    index = ambient.gens.index(variable)
    return ambient.from_dict(
        {
            monomial: coefficient
            for monomial, coefficient in poly.terms()
            if monomial[index] == 0
        }
    )


def build_source(ambient, parity):
    r, w, _, _ = ambient.gens
    z = r + w + 5
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    elif parity == "even":
        p, alpha = 2 * r + 18, 2 * r + 1
    else:
        raise ValueError(parity)

    # K_j=(constant_numerator + slope_numerator*T)/denominator.
    numerators = [(ambient.one, ambient.zero), (ambient.zero, ambient.one)]
    denominators = [ambient.one, ambient.one]
    recurrence_denominators = []
    for j in range(4):
        current_p, current_alpha = p - 2 * j, alpha + j
        recurrence_denominator = (
            (1 + 4 * z) * (current_p - 2) * (current_p - 3)
        )
        recurrence_linear = (p + alpha - j - 1) * (
            z * (4 * current_p - 6) - (current_alpha + 1)
        )
        recurrence_constant = (
            (p + alpha - j - 1) * z * (current_p + current_alpha)
        )
        previous = ambient.one if j == 0 else recurrence_denominators[-1]
        numerators.append(
            (
                recurrence_linear * numerators[-1][0]
                - recurrence_constant * previous * numerators[-2][0],
                recurrence_linear * numerators[-1][1]
                - recurrence_constant * previous * numerators[-2][1],
            )
        )
        denominators.append(recurrence_denominator * denominators[-1])
        recurrence_denominators.append(recurrence_denominator)
    return numerators, denominators


def one_parity(parity: str) -> dict[str, object]:
    ambient, r, w, u, v = ring("r,w,u,v", QQ)
    residual, rr, ww = ring("r,w", QQ)
    numerators, denominators = build_source(ambient, parity)

    source_slope_records = []
    for j in range(1, 6):
        record = coefficientwise_strict(
            numerators[j][1], (r, w)
        )
        record["index"] = j
        source_slope_records.append(record)

    # Actual quadratic-filter variables u,v in [0,1].
    filtered = []
    for j in range(4):
        target = denominators[j + 2]
        filtered.append(
            tuple(
                numerators[j][coordinate]
                * target.exquo(denominators[j])
                - (u + v)
                * numerators[j + 1][coordinate]
                * target.exquo(denominators[j + 1])
                + u * v * numerators[j + 2][coordinate]
                for coordinate in (0, 1)
            )
        )

    slope_records = {
        "minus_a0": certify_tensor(
            -filtered[0][1], ambient, residual, (u, v), (rr, ww),
            strict=False,
        )
    }

    # If q_j denotes the T-slope of K_j, then
    #
    # a_{j+1}-(q_{j+2}/q_{j+1})a_j = Delta_j/q_{j+1},
    # Delta_j=q_{j+1}^2-q_j q_{j+2}
    #         +uv(q_{j+1}q_{j+3}-q_{j+2}^2).
    propagation = []
    for j in range(3):
        target = denominators[j + 3] ** 2

        def product_numerator(i, k):
            return (
                numerators[i][1]
                * numerators[k][1]
                * target.exquo(denominators[i] * denominators[k])
            )

        propagation.append(
            product_numerator(j + 1, j + 1)
            - product_numerator(j, j + 2)
            + u
            * v
            * (
                product_numerator(j + 1, j + 3)
                - product_numerator(j + 2, j + 2)
            )
        )

    for j in (0, 1):
        slope_records[f"delta_{j}"] = certify_tensor(
            propagation[j], ambient, residual, (u, v), (rr, ww)
        )

    exceptional_records = None
    if parity == "even":
        slope_records["delta_2"] = certify_tensor(
            propagation[2], ambient, residual, (u, v), (rr, ww)
        )
    else:
        slope_records["delta_2_r_at_least_1"] = certify_tensor(
            propagation[2].compose(r, r + 1),
            ambient,
            residual,
            (u, v),
            (rr, ww),
        )
        near_delta = retain_zero_power(
            propagation[2], ambient, r
        ).compose(w, SPLIT * w)
        far_a3 = retain_zero_power(
            filtered[3][1], ambient, r
        ).compose(w, w + SPLIT)
        exceptional_records = {
            "split": f"r=0: w<=${SPLIT} versus w>=${SPLIT}".replace("$", ""),
            "near_delta_2": certify_scalar(near_delta, ambient),
            "far_a3_uniformly_positive": certify_tensor(
                far_a3, ambient, residual, (u, v), (rr, ww)
            ),
        }

    # Symmetric coordinates s=u+v and q=uv, reusing the symbols u=s,v=q.
    # Put every K_j over D_5 so all determinant atoms have one normalization.
    common_denominator = denominators[5]
    common_k = [
        tuple(
            numerators[j][coordinate]
            * common_denominator.exquo(denominators[j])
            for coordinate in (0, 1)
        )
        for j in range(6)
    ]
    symmetric_rows = [
        tuple(
            common_k[j][coordinate]
            - u * common_k[j + 1][coordinate]
            + v * common_k[j + 2][coordinate]
            for coordinate in (0, 1)
        )
        for j in range(4)
    ]

    atoms = {}
    for i, j in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (0, 3)):
        atoms[(i, j)] = (
            symmetric_rows[i][0] * symmetric_rows[j][1]
            - symmetric_rows[j][0] * symmetric_rows[i][1]
        )
    atoms["03-12"] = atoms[(0, 3)] - atoms[(1, 2)]
    target_labels = ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), "03-12")

    q3 = common_k[3][1]
    q4 = common_k[4][1]
    q5 = common_k[5][1]
    boundary_numerator = q3 + v * q5

    def substitute_s_boundary(poly):
        degree = poly.degree(u)
        output = ambient.zero
        for monomial, coefficient in poly.terms():
            s_power = monomial[2]
            term = ambient.domain_new(coefficient)
            for index, variable in enumerate(ambient.gens):
                if index != 2:
                    term *= variable ** monomial[index]
            term *= (
                boundary_numerator**s_power
                * q4 ** (degree - s_power)
            )
            output += term
        return output

    def retain_s_zero(poly):
        return retain_zero_power(poly, ambient, u)

    derivative_records = []
    boundary_records = []
    for label in target_labels:
        negative_derivative = -atoms[label].diff(u)
        derivative_records.append(
            {
                "atom": str(label),
                "at_s_zero": certify_tensor(
                    retain_s_zero(negative_derivative),
                    ambient,
                    residual,
                    (v,),
                    (rr, ww),
                    strict=False,
                ),
                "at_a3_zero": certify_tensor(
                    substitute_s_boundary(negative_derivative),
                    ambient,
                    residual,
                    (v,),
                    (rr, ww),
                    strict=False,
                ),
            }
        )

        if parity == "odd" and label == (2, 3):
            continue
        boundary_records.append(
            {
                "atom": str(label),
                "at_a3_zero": certify_tensor(
                    substitute_s_boundary(atoms[label]),
                    ambient,
                    residual,
                    (v,),
                    (rr, ww),
                ),
            }
        )

    # The sole non-coefficientwise boundary is odd M_23.  It is positive
    # after r->r+1 and on the compact r=0,w<=200 cell.  In the complementary
    # r=0,w>=200 cell all six actual (u,v) atoms are directly positive.
    odd_m23_records = None
    if parity == "odd":
        boundary_m23 = substitute_s_boundary(atoms[(2, 3)])
        near_boundary_m23 = retain_zero_power(
            boundary_m23, ambient, r
        ).compose(w, SPLIT * w)

        actual_rows = [
            tuple(
                common_k[j][coordinate]
                - (u + v) * common_k[j + 1][coordinate]
                + u * v * common_k[j + 2][coordinate]
                for coordinate in (0, 1)
            )
            for j in range(4)
        ]
        actual_atoms = {}
        for i, j in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (0, 3)):
            actual_atoms[(i, j)] = (
                actual_rows[i][0] * actual_rows[j][1]
                - actual_rows[j][0] * actual_rows[i][1]
            )
        actual_atoms["03-12"] = (
            actual_atoms[(0, 3)] - actual_atoms[(1, 2)]
        )
        direct_far = []
        for label in target_labels:
            polynomial = retain_zero_power(
                actual_atoms[label], ambient, r
            ).compose(w, w + SPLIT)
            direct_far.append(
                {
                    "atom": str(label),
                    "certificate": certify_tensor(
                        polynomial,
                        ambient,
                        residual,
                        (u, v),
                        (rr, ww),
                    ),
                }
            )

        odd_m23_records = {
            "boundary_r_at_least_1": certify_tensor(
                boundary_m23.compose(r, r + 1),
                ambient,
                residual,
                (v,),
                (rr, ww),
            ),
            "boundary_r_zero_w_at_most_200": certify_scalar(
                near_boundary_m23, ambient
            ),
            "direct_r_zero_w_at_least_200": direct_far,
        }

    return {
        "parity": parity,
        "source_slopes_positive": source_slope_records,
        "slope_suffix_certificates": slope_records,
        "odd_smallest_order_split": exceptional_records,
        "atom_minus_s_derivative_endpoints": derivative_records,
        "atom_a3_zero_boundaries": boundary_records,
        "odd_m23_split": odd_m23_records,
    }


def main() -> None:
    records = [one_parity(parity) for parity in ("odd", "even")]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_OUTER_ORIENTATION_DICHOTOMY",
        "region": (
            "p-alpha=17; z=r+5+w; integer r>=0; w>=0; "
            "0<=u,v<=1; appended kernel C=c+d>0,D=cd>0"
        ),
        "records": records,
        "slope_theorem": (
            "Outside the directly excluded odd r=0,w>=200 cell, a_0<0 "
            "and a_j>=0 implies a_{j+1}>0.  Thus the four T-slopes have "
            "a negative prefix followed by a positive suffix."
        ),
        "determinant_theorem": (
            "If a_3>=0, all six atoms M01,M02,M12,M13,M23,M03-M12 are "
            "positive.  Hence D^2 M01+CD M02+D(M03-M12)+C^2 M12+" 
            "C M13+M23>0, so the two collision rows cannot vanish together."
        ),
        "collision_consequence": (
            "Every outer-region common zero has a_0,a_1,a_2,a_3<0.  "
            "Therefore Q_0=D a_0+C a_1+a_2<0 and "
            "Q_1=D a_1+C a_2+a_3<0, so Q_0 Q_1>0."
        ),
        "combined_consequence": (
            "Together with the exact outer Riccati supersolution theorem, "
            "every far-left positive-PF length-three collision has AB>0; "
            "the monotone Wronskian staircase is excluded there."
        ),
        "remaining_gap": (
            "Prove that every relevant positive-PF collision lies on the "
            "far-left source branch (equivalently, in the certified outer "
            "region with the required branch localization)."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_PF_LENGTH3_OUTER_ORIENTATION_DICHOTOMY")
    print(OUTPUT)


if __name__ == "__main__":
    main()
