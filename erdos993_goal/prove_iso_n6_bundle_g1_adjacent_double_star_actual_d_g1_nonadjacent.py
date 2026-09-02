#!/usr/bin/env python3
"""Exact all-order rank-six g1 theorem for adjacent marked double-stars.

This is the full five-parameter calculation: both marked arms and the common
isolate class may be nonempty, and D may retain arbitrary subsets of all
three unmarked orbits and either marked vertex.  The certificate uses an
exact separable tensor-Bernstein transform and verifies its inverse before
accepting any sign.
"""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_adjacent_double_star_actual_d_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_ACTUAL_D_G1_NONADJACENT"
RECONSTRUCTION_SOURCE = HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def marked_rows(total, x_count, y_count, keep_u, keep_v):
    rows = []
    for remove_u, remove_v in ((0, 0), (1, 0), (0, 1), (1, 1)):
        ku = keep_u and not remove_u
        kv = keep_v and not remove_v
        rows.append(tuple(
            sp.binomial(total, rank)
            + int(ku) * sp.binomial(total - x_count, rank - 1)
            + int(kv) * sp.binomial(total - y_count, rank - 1)
            for rank in range(8)
        ))
    return tuple(rows)


def build(expression, names, keep_u: int, keep_v: int):
    t, a, b, rx, ry, rz = sp.symbols("t a b rx ry rz", nonnegative=True)
    n, m = t + 8, t + 6
    x_count = m * a
    y_count = m * (1 - a) * b
    z_count = m * (1 - a) * (1 - b)
    crows = marked_rows(m, x_count, y_count, 1, 1)
    retained_x = x_count * rx
    retained_y = y_count * ry
    retained_z = z_count * rz
    drows = marked_rows(
        retained_x + retained_y + retained_z,
        retained_x,
        retained_y,
        keep_u,
        keep_v,
    )
    substitutions = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for family, row in zip("EUVW", rows):
            for rank in range(8):
                name = f"{prefix}{family}{rank}"
                if name in names:
                    substitutions[names[name]] = row[rank]
    value = sp.expand_func(expression.subs(substitutions))
    return value, t, (a, b, rx, ry, rz)


def transform_axis(values, degrees, axis):
    degree = degrees[axis]
    grouped = {}
    for index, value in values.items():
        key = index[:axis] + index[axis + 1 :]
        grouped.setdefault(key, {})[index[axis]] = value
    answer = {}
    for key, source in grouped.items():
        for location in range(degree + 1):
            value = sum(
                source.get(exponent, 0)
                * sp.binomial(location, exponent)
                / sp.binomial(degree, exponent)
                for exponent in range(location + 1)
            )
            index = key[:axis] + (location,) + key[axis:]
            answer[index] = sp.expand(value)
    return answer


def invert_axis(values, degrees, axis):
    degree = degrees[axis]
    grouped = {}
    for index, value in values.items():
        key = index[:axis] + index[axis + 1 :]
        grouped.setdefault(key, {})[index[axis]] = value
    answer = {}
    for key, source in grouped.items():
        for exponent in range(degree + 1):
            value = sp.binomial(degree, exponent) * sum(
                (-1) ** (exponent - location)
                * sp.binomial(exponent, location)
                * source[location]
                for location in range(exponent + 1)
            )
            index = key[:axis] + (exponent,) + key[axis:]
            answer[index] = sp.expand(value)
    return answer


def certify(value, tail, variables):
    polynomial = sp.Poly(value, *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    original = {
        index: sp.expand(coefficient)
        for index, coefficient in polynomial.terms()
    }
    values = dict(original)
    for axis in range(len(variables)):
        values = transform_axis(values, degrees, axis)
    stream = hashlib.sha256()
    minimum = None
    at_zero_minimum = None
    scalar_count = 0
    for index in sorted(values):
        row = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(row)};".encode())
        coefficients = sp.Poly(row, tail).all_coeffs()
        assert all(coefficient >= 0 for coefficient in coefficients), (
            degrees,
            index,
            row,
            coefficients,
        )
        scalar_count += len(coefficients)
        local = min(coefficients)
        minimum = local if minimum is None else min(minimum, local)
        at_zero = sp.expand(row.subs(tail, 0))
        at_zero_minimum = (
            at_zero if at_zero_minimum is None else min(at_zero_minimum, at_zero)
        )
    recovered = dict(values)
    for axis in reversed(range(len(variables))):
        recovered = invert_axis(recovered, degrees, axis)
    full_indices = itertools.product(*(range(degree + 1) for degree in degrees))
    assert all(
        sp.expand(recovered[index] - original.get(index, 0)) == 0
        for index in full_indices
    )
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "power_terms": len(original),
        "bernstein_coefficients": len(values),
        "tail_power_coefficients": scalar_count,
        "minimum_at_tail_zero": str(at_zero_minimum),
        "minimum_tail_power_coefficient": str(minimum),
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    expression = reconstruct(1)
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    cases = []
    total_rows = total_scalars = 0
    global_minimum = None
    for keep_u in (0, 1):
        for keep_v in (0, 1):
            value, tail, variables = build(expression, names, keep_u, keep_v)
            certificate = certify(value, tail, variables)
            local = sp.Rational(certificate["minimum_tail_power_coefficient"])
            global_minimum = local if global_minimum is None else min(global_minimum, local)
            total_rows += certificate["bernstein_coefficients"]
            total_scalars += certificate["tail_power_coefficients"]
            cases.append({"keep_u": keep_u, "keep_v": keep_v, **certificate})
            print(
                "CASE", keep_u, keep_v,
                "ROWS", certificate["bernstein_coefficients"],
                "SCALARS", certificate["tail_power_coefficients"],
                "MIN", certificate["minimum_tail_power_coefficient"],
                flush=True,
            )
            del value
            gc.collect()
    report = {
        "marker": MARKER,
        "scope": (
            "all adjacent marked double-stars C of order n>=8 with arbitrary "
            "numbers x,y of leaves in the two marked arms and z common isolates, "
            "and every actual induced marked minor D"
        ),
        "claim": "rank-six bundle g1 is nonnegative",
        "parameterization": (
            "m=n-2=t+6, x=ma, y=m(1-a)b, z=m(1-a)(1-b); "
            "rx,ry,rz are the three retained orbit fractions"
        ),
        "cases": cases,
        "bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(global_minimum),
        "reconstruction_source": RECONSTRUCTION_SOURCE.name,
        "reconstruction_source_sha256": sha256(RECONSTRUCTION_SOURCE),
        "source_sha256": sha256(Path(__file__)),
        "proof": (
            "The hierarchical (a,b) box parametrizes every nonnegative triple "
            "x+y+z=n-2.  Each induced D is determined by the two mark-retention "
            "bits and retained fractions rx,ry,rz.  Literal E,U,V,W rows are "
            "substituted before expansion.  A separable exact tensor-Bernstein "
            "conversion in (a,b,rx,ry,rz), its exact inverse on the full tensor, "
            "and nonnegative power coefficients in t=n-8 prove all four cases."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", global_minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
