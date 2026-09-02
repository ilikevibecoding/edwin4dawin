#!/usr/bin/env python3
"""Exact FLINT/Bernstein probe for the four adjacent-g2 Q3 endpoints."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_q3_endpoints_flint_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_Q3_ENDPOINTS_FLINT_ROOT"
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_q3_endpoint_reduction_exact_root_20260831.json"
REDUCTION_SHA256 = "9C034F1845A72E956DBEB3C593F0E8DA2EFE88C0D89D26B11A5B69DD956D3D11"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank, one):
    out = one
    for offset in range(rank):
        out *= value - offset
    return out * fmpq(1, math.factorial(rank))


def path_floor(order, rank, one):
    return choose(order - rank + 1, rank, one)


def pair_add(left, right, n):
    ln, ld = left
    rn, rd = right
    degree = max(ld, rd)
    return (ln * n**(degree - ld) + rn * n**(degree - rd), degree)


def pair_neg(value):
    return (-value[0], value[1])


def pair_scale(value, scalar):
    return (scalar * value[0], value[1])


def pair_mul(left, right):
    return (left[0] * right[0], left[1] + right[1])


def pair_sum(values, n, zero):
    out = zero
    for value in values:
        out = pair_add(out, value, n)
    return out


def a_ratio_row(n, ratios, one):
    r1, r2, r3, r4, r5, r6 = ratios
    return (
        (one, 0), (n, 0), (r1 * fmpq(1, 4), 0),
        (r1*r2 * fmpq(1, 24), 1),
        (r1*r2*r3 * fmpq(1, 192), 2),
        (r1*r2*r3*r4 * fmpq(1, 1920), 3),
        (r1*r2*r3*r4*r5 * fmpq(1, 23040), 4),
        (r1*r2*r3*r4*r5*r6 * fmpq(1, 322560), 5),
    )


def interval_pair(lower, upper, theta, n):
    lower_pair = (lower, 0)
    return pair_add(lower_pair, pair_scale(pair_add(upper, pair_neg(lower_pair), n), theta), n)


def a2(a, n, zero):
    terms = (
        (4, 1, 4), (-3, 1, 5), (-17, 1, 6), (-7, 1, 7),
        (12, 2, 3), (8, 2, 4), (-21, 2, 5), (-16, 2, 6),
        (11, 3, 3), (22, 3, 4), (-1, 3, 5), (8, 4, 4),
    )
    return pair_sum((pair_scale(pair_mul(a[i], a[j]), coefficient)
                     for coefficient, i, j in terms), n, zero)


def l2(a, b, n, zero):
    terms = (
        (4, 1, 3), (-1, 1, 4), (-16, 1, 5), (-7, 1, 6),
        (8, 2, 2), (9, 2, 3), (-4, 2, 4), (-9, 2, 5),
        (4, 3, 1), (9, 3, 2), (24, 3, 3), (8, 3, 4),
        (-1, 4, 1), (-4, 4, 2), (8, 4, 3),
        (-16, 5, 1), (-9, 5, 2), (-7, 6, 1),
    )
    return pair_sum((pair_scale(pair_mul(a[i], b[j]), coefficient)
                     for coefficient, i, j in terms), n, zero)


def k2(b, c, n, zero):
    terms = (
        (4, 1, 2), (1, 1, 3), (-15, 1, 4), (-7, 1, 5),
        (4, 2, 1), (6, 2, 2), (11, 2, 3), (-2, 2, 4),
        (1, 3, 1), (11, 3, 2), (10, 3, 3),
        (-15, 4, 1), (-2, 4, 2), (-7, 5, 1),
    )
    return pair_sum((pair_scale(pair_mul(b[i], c[j]), coefficient)
                     for coefficient, i, j in terms), n, zero)


def compactify(source, target_context, bounded_count):
    terms = list(source.terms())
    degree_p = int(max(monomial[-2] for monomial, _ in terms))
    degree_q = int(max(monomial[-1] for monomial, _ in terms))
    target_gens = target_context.gens()
    one = target_context.constant(1)
    P, Q = target_gens[-2:]
    degrees = [int(max(monomial[axis] for monomial, _ in terms))
               for axis in range(bounded_count)]
    powers = [[target_gens[axis]**exponent for exponent in range(degree + 1)]
              for axis, degree in enumerate(degrees)]
    p_powers = [P**exponent for exponent in range(degree_p + 1)]
    p_complements = [(one-P)**exponent for exponent in range(degree_p + 1)]
    q_powers = [Q**exponent for exponent in range(degree_q + 1)]
    q_complements = [(one-Q)**exponent for exponent in range(degree_q + 1)]

    def mapped_terms():
        for monomial, coefficient in terms:
            term = target_context.constant(coefficient)
            for axis in range(bounded_count):
                term *= powers[axis][monomial[axis]]
            ep, eq = monomial[-2:]
            term *= p_powers[ep] * p_complements[degree_p-ep]
            term *= q_powers[eq] * q_complements[degree_q-eq]
            yield term

    mapped = balanced_batched_sum(mapped_terms(), batch_size=128)
    return mapped, degree_p, degree_q, len(terms)


def endpoint_polynomial(context, upper_b: bool, upper_c: bool, theta_mask=None):
    (s, z, r0, r1, r2, r3, r4, tb2, tb3, tc2, tc3, p, q) = context.gens()
    one = context.constant(1)
    zero = (context.constant(0), 0)
    mb = 7 + p
    mc = 7 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    R1 = 2*n*(n-1) - 4*edges
    budget = R1 - 4*n
    terminal = budget*r0
    D5 = budget*(1-r0)*r1
    D4 = budget*(1-r0)*(1-r1)*r2
    D3 = budget*(1-r0)*(1-r1)*(1-r2)*r3
    D2 = budget*(1-r0)*(1-r1)*(1-r2)*(1-r3)*r4
    R2 = terminal + 4*n + D5+D4+D3+D2
    R3 = terminal + 3*n + D5+D4+D3
    R4 = terminal + 2*n + D5+D4
    R5 = terminal + n + D5
    R6 = terminal
    a = a_ratio_row(n, (R1, R2, R3, R4, R5, R6), one)

    def induced_row(order, theta2, theta3, bit_offset):
        row = [(one, 0), (order, 0)]
        lower2 = path_floor(order, 2, one)
        lower3 = path_floor(order, 3, one)
        if theta_mask is None:
            row.append(interval_pair(lower2, a[2], theta2, n))
            row.append(interval_pair(lower3, a[3], theta3, n))
        else:
            row.append(a[2] if theta_mask & (1 << bit_offset) else (lower2, 0))
            row.append(a[3] if theta_mask & (1 << (bit_offset + 1)) else (lower3, 0))
        row.append(zero)
        row.extend((a[5], a[6]))
        return tuple(row)

    b = induced_row(mb, tb2, tb3, 0)
    c = induced_row(mc, tc2, tc3, 2)
    base = pair_sum((a2(a, n, zero), l2(a, b, n, zero),
                     l2(a, c, n, zero), k2(b, c, n, zero)), n, zero)
    db = pair_sum((pair_scale(a[1], -1), pair_scale(a[2], -4),
                   pair_scale(a[3], 8), pair_scale(c[1], -15),
                   pair_scale(c[2], -2)), n, zero)
    dc = pair_sum((pair_scale(a[1], -1), pair_scale(a[2], -4),
                   pair_scale(a[3], 8), pair_scale(b[1], -15),
                   pair_scale(b[2], -2)), n, zero)

    def endpoint(row, order, upper):
        if not upper:
            return path_floor(order, 4, one), one, 0
        b2num, b2den = row[2]
        b3num, b3den = row[3]
        assert b2den == 0 and b3den == 1
        numerator = b3num * (6*b3num - b2num*n)
        return numerator, 8*b2num, 2

    bnum, bpolyden, bnden = endpoint(b, mb, upper_b)
    cnum, cpolyden, cnden = endpoint(c, mc, upper_c)
    common_n_degree = max(base[1], db[1]+bnden, dc[1]+cnden)
    polynomial = (
        base[0] * n**(common_n_degree-base[1]) * bpolyden * cpolyden
        + db[0] * bnum * n**(common_n_degree-db[1]-bnden) * cpolyden
        + dc[0] * cnum * n**(common_n_degree-dc[1]-cnden) * bpolyden
    )
    metadata = {
        "branch": f"B{'Q3' if upper_b else 'PATH'}_C{'Q3' if upper_c else 'PATH'}",
        "positive_multiplier": (
            f"N^{common_n_degree}"
            + ("*(8*b2)" if upper_b else "")
            + ("*(8*c2)" if upper_c else "")
        ),
        "common_N_degree": common_n_degree,
        "theta_mask": theta_mask,
    }
    return polynomial, metadata


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", choices=("00", "01", "10", "11"), default="00")
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--theta-mask", type=int, choices=range(16))
    args = parser.parse_args()
    assert sha256(REDUCTION) == REDUCTION_SHA256
    reduction = json.loads(REDUCTION.read_text(encoding="utf-8"))
    assert reduction["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_Q3_ENDPOINT_REDUCTION_ROOT"
    names = ("s", "z", "r0", "r1", "r2", "r3", "r4",
             "tb2", "tb3", "tc2", "tc3", "p", "q")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    upper_b, upper_c = map(lambda value: value == "1", args.endpoint)
    source, metadata = endpoint_polynomial(
        source_context, upper_b, upper_c, theta_mask=args.theta_mask
    )
    source_terms = list(source.terms())
    source_degrees = [int(max(monomial[axis] for monomial, _ in source_terms))
                      for axis in range(len(names))]
    record = {**metadata, "source_terms": len(source_terms),
              "source_degrees": dict(zip(names, source_degrees))}
    print(json.dumps(record, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return
    target_names = (*names[:-2], "P", "Q")
    target_context = fmpq_mpoly_ctx.get(target_names, "degrevlex")
    mapped, degree_p, degree_q, replay_terms = compactify(source, target_context, 11)
    assert replay_terms == len(source_terms)
    mapped_terms = list(mapped.terms())
    degrees, coefficients, replay_mapped = tensor_bernstein_from_flint_matrix(
        mapped, 13, chunk_columns=args.chunk_columns
    )
    assert replay_mapped == len(mapped_terms)
    minimum = min(coefficients.flat)
    negative = sum(1 for value in coefficients.flat if value < 0)
    zero_count = sum(1 for value in coefficients.flat if value == 0)
    stream = hashlib.sha256()
    for value in coefficients.flat:
        stream.update(f"{value};".encode())
    report = {
        "marker": MARKER, **record,
        "compactification_degrees_p_q": [degree_p, degree_q],
        "mapped_terms": len(mapped_terms),
        "bernstein_degrees": list(map(int, degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": negative, "zero": zero_count, "minimum": str(minimum),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "scope": "mB,mC>=7 ordered large-order relaxation; one endpoint only",
        "reduction_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / f"iso_n6_bundle_g2_adjacent_q3_endpoint_{args.endpoint}_flint_probe_root_20260831.json"
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "branch", "bernstein_coefficients", "negative", "zero", "minimum"
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
