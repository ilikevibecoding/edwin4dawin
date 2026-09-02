"""Search and exactly replay affine-multiplier certificates on the slow cell."""

from __future__ import annotations

import json
import math
from fractions import Fraction

import numpy as np
from scipy.optimize import linprog

from certify_pf_length3_repeated_branch_core import (
    integer_power_array,
    integer_power_to_bernstein_reduced,
    strip_common_axis,
)
from certify_pf_length3_repeated_half_toric_core import compactified, restrict_to_address
from certify_pf_length3_repeated_positive_root_orientation import (
    elevate_tensor_to_shape,
    remove_positive_content,
)
from verify_pf_length3_repeated_resultant_reduction import build


def local_controls(poly, address):
    poly, a_order = strip_common_axis(poly, 0)
    poly, x_order = strip_common_axis(poly, 1)
    power, degrees, terms = integer_power_array(poly)
    controls = integer_power_to_bernstein_reduced(power)
    restricted, depth, _ = restrict_to_address(
        {"P": controls},
        (0, 0, 0, 0, 0),
        ((False, True), (False, True), (True, True), (True, True), (True, True)),
        address,
    )
    return restricted["P"], [a_order, x_order], list(degrees), terms, list(depth)


def coordinate_times(array, axis):
    """Controls for (d+1)*t_axis*p, hence a positive scaling of t_axis*p."""

    degree = array.shape[axis] - 1
    moved = np.moveaxis(array, axis, 0)
    result = np.zeros((degree + 2,) + moved.shape[1:], dtype=object)
    for index in range(degree + 1):
        result[index + 1] = (index + 1) * moved[index]
    return np.moveaxis(result, 0, axis)


def rational_certificate(target, resultant, max_denominator=1_000_000):
    bases = [elevate_tensor_to_shape(resultant, target.shape, exact=True)]
    for axis in range(target.ndim):
        product = coordinate_times(resultant, axis)
        bases.append(elevate_tensor_to_shape(product, target.shape, exact=True))

    target_scale = max(abs(int(value)) for value in target.flat)
    basis_scales = [max(abs(int(value)) for value in basis.flat) for basis in bases]
    target_numeric = np.fromiter(
        (float(Fraction(int(value), target_scale)) for value in target.flat),
        dtype=float,
        count=target.size,
    )
    basis_numeric = np.column_stack(
        [
            np.fromiter(
                (float(Fraction(int(value), scale)) for value in basis.flat),
                dtype=float,
                count=basis.size,
            )
            for basis, scale in zip(bases, basis_scales)
        ]
    )
    # target - B*lambda >= margin  <=>  B*lambda + margin <= target.
    inequalities = np.column_stack((basis_numeric, np.ones(target.size)))
    objective = np.zeros(len(bases) + 1)
    objective[-1] = -1.0
    result = linprog(
        objective,
        A_ub=inequalities,
        b_ub=target_numeric,
        bounds=[(-1_000_000.0, 1_000_000.0)] * len(bases) + [(None, None)],
        method="highs",
        options={"presolve": True},
    )
    record = {
        "lp_success": bool(result.success),
        "lp_message": str(result.message),
        "lp_margin": float(result.x[-1]) if result.success else None,
        "lp_multipliers_normalized": [float(value) for value in result.x[:-1]]
        if result.success
        else None,
        "target_shape": list(target.shape),
        "constraint_count": int(target.size),
    }
    if not result.success or result.x[-1] <= 1e-10:
        record["exact_pass"] = False
        return record

    multipliers = [
        Fraction(float(value)).limit_denominator(max_denominator) for value in result.x[:-1]
    ]
    denominators = [target_scale] + [
        multiplier.denominator * scale
        for multiplier, scale in zip(multipliers, basis_scales)
    ]
    common = math.lcm(*denominators)
    target_weight = common // target_scale
    basis_weights = [
        multiplier.numerator * (common // (multiplier.denominator * scale))
        for multiplier, scale in zip(multipliers, basis_scales)
    ]
    minimum = None
    nonpositive = 0
    for index in np.ndindex(target.shape):
        value = target_weight * int(target[index])
        for weight, basis in zip(basis_weights, bases):
            value -= weight * int(basis[index])
        minimum = value if minimum is None or value < minimum else minimum
        if value <= 0:
            nonpositive += 1
    record.update(
        {
            "rational_multipliers_normalized": [str(value) for value in multipliers],
            "exact_common_denominator_bits": common.bit_length(),
            "exact_minimum_control": str(minimum),
            "exact_nonpositive_controls": nonpositive,
            "exact_pass": nonpositive == 0,
        }
    )
    return record


def main():
    checkpoint = json.loads(
        open("two_pivot_frontier_alt_wave2.stdout.log", encoding="utf-8").read().splitlines()[-1]
    )
    address = checkpoint["current_address"]
    source = build("odd", return_polynomials=True, include_alternate=True)
    resultant = remove_positive_content(source["resultant"])[0]
    n0 = remove_positive_content(source["alternate_orientation0"])[0]
    n1 = remove_positive_content(source["alternate_orientation1"])[0]
    fr, _ = compactified(resultant, "q_dominant", -1, "branch")
    fn0, _ = compactified(n0, "q_dominant", -1, "branch")
    fn1, _ = compactified(n1, "q_dominant", -1, "branch")
    r_controls, r_orders, r_degrees, r_terms, depth = local_controls(fr, address)
    report = {
        "address": address,
        "depth": depth,
        "resultant_orders": r_orders,
        "resultant_degrees": r_degrees,
        "resultant_terms": r_terms,
        "targets": {},
    }
    for name, poly in (("N0", fn0), ("N1", fn1)):
        target, orders, degrees, terms, _ = local_controls(poly, address)
        certificate = rational_certificate(target, r_controls)
        certificate.update({"orders": orders, "degrees": degrees, "terms": terms})
        report["targets"][name] = certificate
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
