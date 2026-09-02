"""Explore exact outer-region slope ordering for the PF length-three route.

This is a diagnostic script.  It constructs the affine-in-T source rows

    h_j = K_j-(u+v)K_{j+1}+uv K_{j+2}

at sharp reserve and checks candidate coefficient/Bernstein certificates for
the statement that the T-slopes of h_0,...,h_3 have a single sign change.
"""

from __future__ import annotations

import math
import itertools

from sympy import QQ
from sympy.polys.rings import ring


def bernstein_controls(poly, ambient, residual, variables, degrees):
    """Tensor Bernstein controls in selected unit-interval variables."""
    selected = [ambient.gens.index(variable) for variable in variables]
    slices = {}
    for powers in __import__("itertools").product(
        *[range(degree + 1) for degree in degrees]
    ):
        out = residual.zero
        for monomial, coefficient in poly.terms():
            if tuple(monomial[index] for index in selected) != powers:
                continue
            residual_monomial = []
            for index, power in enumerate(monomial):
                if index not in selected:
                    residual_monomial.append(power)
            out += coefficient * residual.from_dict({tuple(residual_monomial): QQ(1)})
        slices[powers] = out

    controls = []
    for index in __import__("itertools").product(
        *[range(degree + 1) for degree in degrees]
    ):
        control = residual.zero
        for powers in __import__("itertools").product(
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


def compactify_nonnegative(poly, ambient, variables):
    """Map each selected x>=0 to X/(1-X), clearing top degree."""
    indices = [ambient.gens.index(variable) for variable in variables]
    degrees = [poly.degree(variable) for variable in variables]
    out = ambient.zero
    for monomial, coefficient in poly.terms():
        term = ambient.domain_new(coefficient)
        for index, (variable, degree) in enumerate(zip(variables, degrees)):
            power = monomial[indices[index]]
            term *= variable**power * (1 - variable) ** (degree - power)
        for index, variable in enumerate(ambient.gens):
            if index not in indices:
                term *= variable ** monomial[index]
        out += term
    return out


def scalar_bernstein_audit(poly, ambient):
    variables = ambient.gens
    degrees = [poly.degree(variable) for variable in variables]
    coefficient_map = dict(poly.terms())
    values = []
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = QQ(0)
        for powers in itertools.product(*[range(bound + 1) for bound in index]):
            coefficient = coefficient_map.get(tuple(powers), QQ(0))
            multiplier = QQ(1)
            for coordinate, power, degree in zip(index, powers, degrees):
                multiplier *= QQ(
                    math.comb(coordinate, power), math.comb(degree, power)
                )
            value += coefficient * multiplier
        values.append(value)
    return (
        sum(value < 0 for value in values),
        min(values),
        len(values),
    )


def audit(poly, ambient, residual, u, v):
    degrees = [poly.degree(u), poly.degree(v)]
    controls = bernstein_controls(poly, ambient, residual, (u, v), degrees)
    values = [coefficient for control in controls for _, coefficient in control.terms()]
    return {
        "degrees": degrees,
        "controls": len(controls),
        "coefficients": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": min(values) if values else None,
        "negative_controls": [
            index
            for index, control in enumerate(controls)
            if any(value < 0 for _, value in control.terms())
        ],
    }


def one_parity(parity):
    ambient, r, w, u, v = ring("r,w,u,v", QQ)
    residual, rr, ww = ring("r,w", QQ)
    z = r + 5 + w
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    else:
        p, alpha = 2 * r + 18, 2 * r + 1

    numerators = [(ambient.one, ambient.zero), (ambient.zero, ambient.one)]
    denominators = [ambient.one, ambient.one]
    recurrence_denominators = []
    for j in range(5):
        current_p, current_alpha = p - 2 * j, alpha + j
        denominator = (1 + 4 * z) * (current_p - 2) * (current_p - 3)
        linear = (p + alpha - j - 1) * (
            z * (4 * current_p - 6) - (current_alpha + 1)
        )
        constant = (p + alpha - j - 1) * z * (current_p + current_alpha)
        previous = ambient.one if j == 0 else recurrence_denominators[-1]
        numerators.append(
            (
                linear * numerators[-1][0] - constant * previous * numerators[-2][0],
                linear * numerators[-1][1] - constant * previous * numerators[-2][1],
            )
        )
        denominators.append(denominator * denominators[-1])
        recurrence_denominators.append(denominator)

    h = []
    for j in range(4):
        target = denominators[j + 2]
        parts = []
        for coordinate in (0, 1):
            parts.append(
                numerators[j][coordinate] * target.exquo(denominators[j])
                - (u + v)
                * numerators[j + 1][coordinate]
                * target.exquo(denominators[j + 1])
                + u * v * numerators[j + 2][coordinate]
            )
        h.append(tuple(parts))

    print("PARITY", parity)
    print("-a0", audit(-h[0][1], ambient, residual, u, v))

    # Phi_j = slope(h_j)/slope(K_{j+1}).  Strict increase of Phi_j
    # forces the slope signs to be a suffix.
    propagation = []
    for j in range(3):
        left = (
            h[j + 1][1]
            * numerators[j + 1][1]
            * denominators[j + 2] ** 2
        )
        right = (
            h[j][1]
            * numerators[j + 2][1]
            * denominators[j + 3]
            * denominators[j + 1]
        )
        cross = left - right
        print(f"phi{j+1}-phi{j}", audit(cross, ambient, residual, u, v))
        if parity == "odd" and j == 2:
            controls = bernstein_controls(
                cross, ambient, residual, (u, v),
                [cross.degree(u), cross.degree(v)]
            )
            for index, control in enumerate(controls):
                negatives = [term for term in control.terms() if term[1] < 0]
                if negatives:
                    print("phi3 negative control", index, negatives)

    # A_{j+1}-(q_{j+2}/q_{j+1})A_j has the sign of the following
    # source-only Turan combination.  Positivity proves sign propagation.
    for j in range(3):
        target = denominators[j + 3] ** 2

        def product_numerator(i, k):
            return (
                numerators[i][1]
                * numerators[k][1]
                * target.exquo(denominators[i] * denominators[k])
            )

        delta = (
            product_numerator(j + 1, j + 1)
            - product_numerator(j, j + 2)
            + u * v
            * (
                product_numerator(j + 1, j + 3)
                - product_numerator(j + 2, j + 2)
            )
        )
        propagation.append(delta)
        print(f"propagation delta {j}", audit(delta, ambient, residual, u, v))

    if parity == "odd":
        residual_r, r_only = ring("r", QQ)

        def audit_selected(poly, variables):
            degrees = [poly.degree(variable) for variable in variables]
            controls = bernstein_controls(
                poly, ambient, residual_r, variables, degrees
            )
            values = [
                coefficient
                for control in controls
                for _, coefficient in control.terms()
            ]
            return (
                sum(value < 0 for value in values),
                min(values) if values else None,
                len(values),
            )

        # The two nontrivial Bernstein corner values of a_3 are
        # q_3-q_4 and q_3-2q_4+q_5.
        target5 = denominators[5]
        q3 = numerators[3][1] * target5.exquo(denominators[3])
        q4 = numerators[4][1] * target5.exquo(denominators[4])
        q5 = numerators[5][1]
        far_corners = (q3 - q4, q3 - 2 * q4 + q5)

        shifted_delta = propagation[2].compose(r, r + 1)
        print(
            "odd r>=1 delta",
            audit(shifted_delta, ambient, residual, u, v),
        )

        def at_r_zero(poly):
            return ambient.from_dict(
                {
                    monomial: coefficient
                    for monomial, coefficient in poly.terms()
                    if monomial[0] == 0
                }
            )

        for bound in (200, 300, 350, 400, 500, 1000):
            near_r0 = at_r_zero(propagation[2]).compose(w, bound * w)
            far_r0 = at_r_zero(h[3][1]).compose(w, w + bound)
            print(
                "odd r0 split", bound,
                "near-delta", scalar_bernstein_audit(near_r0, ambient),
                "far-a3", audit(far_r0, ambient, residual, u, v),
            )

        for bound in (
            1, 2, 3, 4, 5, 8, 10, 16, 20, 32, 50, 100,
            200, 300, 400, 500, 1000,
        ):
            near = propagation[2].compose(w, bound * w)
            far = h[3][1].compose(w, w + bound)
            print(
                "odd split", bound,
                "near-delta", audit_selected(near, (w, u, v)),
                "far-a3", audit_selected(far, (u, v)),
            )
            near_compact = compactify_nonnegative(near, ambient, (r,))
            far_compact = compactify_nonnegative(far, ambient, (r, w))
            corner_audits = [
                scalar_bernstein_audit(
                    compactify_nonnegative(
                        corner.compose(w, w + bound), ambient, (r, w)
                    ),
                    ambient,
                )
                for corner in far_corners
            ]
            print(
                "odd projective split", bound,
                "near-delta", scalar_bernstein_audit(near_compact, ambient),
                "far-a3", scalar_bernstein_audit(far_compact, ambient),
                "far-corners", corner_audits,
            )

        for ratio_bound in (1, 2, 5, 10, 20, 50, 100, 200, 400, 1000):
            threshold = ratio_bound * (r + 1)
            near = propagation[2].compose(w, threshold * w)
            near_compact = compactify_nonnegative(near, ambient, (r,))
            corner_audits = [
                scalar_bernstein_audit(
                    compactify_nonnegative(
                        corner.compose(w, w + threshold), ambient, (r, w)
                    ),
                    ambient,
                )
                for corner in far_corners
            ]
            print(
                "odd ratio split", ratio_bound,
                "near-delta", scalar_bernstein_audit(near_compact, ambient),
                "far-corners", corner_audits,
            )

    for i, j in ((2, 3), (3, 4), (4, 5)):
        target = denominators[j]
        difference = (
            numerators[i][1] * target.exquo(denominators[i])
            - numerators[j][1]
        )
        print(f"source slope q{i}-q{j}", audit(difference, ambient, residual, u, v))

    # Reuse u=s and v=q for the symmetric filter coordinates.  Put all K_j
    # over the single positive denominator D_5, so every minor has a common
    # normalization and M_03-M_12 is represented correctly.
    common_denominator = denominators[5]
    common_k = [
        tuple(
            numerators[j][coordinate]
            * common_denominator.exquo(denominators[j])
            for coordinate in (0, 1)
        )
        for j in range(6)
    ]
    symmetric_h = [
        tuple(
            common_k[j][coordinate]
            - u * common_k[j + 1][coordinate]
            + v * common_k[j + 2][coordinate]
            for coordinate in (0, 1)
        )
        for j in range(4)
    ]
    symmetric_atoms = {}
    for i, j in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (0, 3)):
        symmetric_atoms[(i, j)] = (
            symmetric_h[i][0] * symmetric_h[j][1]
            - symmetric_h[j][0] * symmetric_h[i][1]
        )
    symmetric_atoms["03-12"] = (
        symmetric_atoms[(0, 3)] - symmetric_atoms[(1, 2)]
    )

    print("SYMMETRIC CONDITION AUDITS", parity)
    for label in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), "03-12"):
        derivative = -symmetric_atoms[label].diff(u)
        controls = bernstein_controls(
            derivative, ambient, residual, (v,), [derivative.degree(v)]
        )
        values = [value for control in controls for _, value in control.terms()]
        print(
            "minus-s-derivative", label,
            {"negative": sum(x < 0 for x in values), "zero": sum(x == 0 for x in values),
             "minimum": min(values), "count": len(values)},
        )

    q3_common = common_k[3][1]
    q4_common = common_k[4][1]
    q5_common = common_k[5][1]
    boundary_numerator = q3_common + v * q5_common

    def substitute_s_boundary(poly):
        degree = poly.degree(u)
        out = ambient.zero
        for monomial, coefficient in poly.terms():
            s_power = monomial[2]
            term = ambient.domain_new(coefficient)
            for index, variable in enumerate(ambient.gens):
                if index != 2:
                    term *= variable ** monomial[index]
            term *= boundary_numerator**s_power * q4_common ** (degree - s_power)
            out += term
        return out

    def at_s_zero(poly):
        return ambient.from_dict(
            {
                monomial: coefficient
                for monomial, coefficient in poly.terms()
                if monomial[2] == 0
            }
        )

    for label in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), "03-12"):
        negative_derivative = -symmetric_atoms[label].diff(u)
        for endpoint, endpoint_poly in (
            ("s0", at_s_zero(negative_derivative)),
            ("a3-boundary", substitute_s_boundary(negative_derivative)),
        ):
            controls = bernstein_controls(
                endpoint_poly,
                ambient,
                residual,
                (v,),
                [endpoint_poly.degree(v)],
            )
            values = [
                value for control in controls for _, value in control.terms()
            ]
            print(
                "minus-s-derivative-endpoint", label, endpoint,
                {"negative": sum(x < 0 for x in values),
                 "zero": sum(x == 0 for x in values),
                 "minimum": min(values), "count": len(values)},
            )

    for label in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), "03-12"):
        boundary = substitute_s_boundary(symmetric_atoms[label])
        controls = bernstein_controls(
            boundary, ambient, residual, (v,), [boundary.degree(v)]
        )
        values = [value for control in controls for _, value in control.terms()]
        print(
            "a3-boundary", label,
            {"negative": sum(x < 0 for x in values), "zero": sum(x == 0 for x in values),
             "minimum": min(values), "count": len(values)},
        )

    for name, polynomial in (
        ("b3", symmetric_h[3][0]),
        ("minus-a2", -symmetric_h[2][1]),
    ):
        boundary = substitute_s_boundary(polynomial)
        controls = bernstein_controls(
            boundary, ambient, residual, (v,), [boundary.degree(v)]
        )
        values = [value for control in controls for _, value in control.terms()]
        print(
            "a3-boundary-component", name,
            {"negative": sum(x < 0 for x in values),
             "zero": sum(x == 0 for x in values),
             "minimum": min(values), "count": len(values)},
        )

    boundary_m23 = substitute_s_boundary(symmetric_atoms[(2, 3)])
    if parity == "odd":
        shifted = boundary_m23.compose(r, r + 1)
        controls = bernstein_controls(
            shifted, ambient, residual, (v,), [shifted.degree(v)]
        )
        values = [value for control in controls for _, value in control.terms()]
        print(
            "odd boundary-m23 r>=1",
            {"negative": sum(x < 0 for x in values),
             "minimum": min(values), "count": len(values)},
        )

        boundary_r0_near = at_r_zero(boundary_m23).compose(w, 200 * w)
        print(
            "odd boundary-m23 r0 w<=200",
            scalar_bernstein_audit(boundary_r0_near, ambient),
        )

        actual_h_common = [
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
                actual_h_common[i][0] * actual_h_common[j][1]
                - actual_h_common[j][0] * actual_h_common[i][1]
            )
        actual_atoms["03-12"] = (
            actual_atoms[(0, 3)] - actual_atoms[(1, 2)]
        )
        for label in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), "03-12"):
            far = at_r_zero(actual_atoms[label]).compose(w, w + 200)
            controls = bernstein_controls(
                far, ambient, residual, (u, v),
                [far.degree(u), far.degree(v)]
            )
            values = [value for control in controls for _, value in control.terms()]
            print(
                "odd direct-atom r0 w>=200", label,
                {"negative": sum(x < 0 for x in values),
                 "minimum": min(values), "count": len(values)},
            )

    # Raw affine-row determinant atoms, with their positive denominators
    # suppressed.  Their signs are unchanged.
    atoms = {}
    for i, j in ((0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (0, 3)):
        atoms[(i, j)] = h[i][0] * h[j][1] - h[j][0] * h[i][1]
    atoms["03-12"] = atoms[(0, 3)] - atoms[(1, 2)]
    for label, atom in atoms.items():
        print("atom", label, audit(atom, ambient, residual, u, v))


def main():
    for parity in ("odd", "even"):
        one_parity(parity)


if __name__ == "__main__":
    main()
