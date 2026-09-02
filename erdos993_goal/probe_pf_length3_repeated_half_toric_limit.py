"""Probe the interior accumulation cell in the odd B<0 q-dominant chart."""

from __future__ import annotations

import json
import math
from fractions import Fraction

from sympy import QQ

from certify_pf_length3_repeated_branch_core import strip_common_axis
from certify_pf_length3_repeated_half_toric_core import compactified
from certify_pf_length3_repeated_positive_root_orientation import remove_positive_content
from verify_pf_length3_repeated_resultant_reduction import build


def midpoint_box(address: str):
    intervals = [[Fraction(0), Fraction(1)] for _ in range(5)]
    for offset in range(0, len(address), 2):
        axis = int(address[offset])
        side = address[offset + 1]
        low, high = intervals[axis]
        middle = (low + high) / 2
        intervals[axis] = [middle, high] if side == "R" else [low, middle]
    return intervals


def exact_value(poly, generators, point):
    return poly.evaluate(
        [(generator, QQ(value.numerator, value.denominator)) for generator, value in zip(generators, point)]
    )


def magnitude(value):
    if not value:
        return None
    numerator = abs(int(value.numerator))
    denominator = int(value.denominator)
    return (numerator.bit_length() - denominator.bit_length()) * math.log10(2)


def main():
    checkpoint = json.loads(
        open("two_pivot_frontier_alt_wave2.stdout.log", encoding="utf-8").read().splitlines()[-1]
    )
    address = checkpoint["current_address"]
    intervals = midpoint_box(address)
    point = [(low + high) / 2 for low, high in intervals]

    source = build("odd", return_polynomials=True, include_alternate=True)
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    n0 = remove_positive_content(source["alternate_orientation0"])[0]
    n1 = remove_positive_content(source["alternate_orientation1"])[0]

    fr, target_data = compactified(resultant, "q_dominant", -1, "branch")
    fm0, _ = compactified(m0, "q_dominant", -1, "branch")
    fm1, _ = compactified(m1, "q_dominant", -1, "branch")
    fn0, _ = compactified(n0, "q_dominant", -1, "branch")
    fn1, _ = compactified(n1, "q_dominant", -1, "branch")
    a, x, y, u, v, c, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (c + 1) ** 7 * fm1 + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr

    polynomials = {}
    orders = {}
    for name, poly in (("R", fr), ("A0", fa0), ("A1", fa1), ("N0", fn0), ("N1", fn1)):
        poly, a_order = strip_common_axis(poly, 0)
        poly, x_order = strip_common_axis(poly, 1)
        polynomials[name] = poly
        orders[name] = [a_order, x_order]

    generators = (a, x, y, u, v)
    values = {name: exact_value(poly, generators, point) for name, poly in polynomials.items()}
    endpoint_signs = {}
    for axis, name in enumerate("axyuv"):
        endpoint_signs[name] = []
        for endpoint in intervals[axis]:
            test = list(point)
            test[axis] = endpoint
            value = exact_value(polynomials["R"], generators, test)
            endpoint_signs[name].append(0 if not value else (1 if value > 0 else -1))

    report = {
        "address": address,
        "intervals": {
            name: [str(low), str(high)] for name, (low, high) in zip("axyuv", intervals)
        },
        "midpoint": {name: str(value) for name, value in zip("axyuv", point)},
        "removed_a_x_orders": orders,
        "midpoint_signs": {
            name: 0 if not value else (1 if value > 0 else -1) for name, value in values.items()
        },
        "midpoint_log10_magnitude_estimates": {
            name: magnitude(value) for name, value in values.items()
        },
        "R_endpoint_signs_by_axis": endpoint_signs,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
