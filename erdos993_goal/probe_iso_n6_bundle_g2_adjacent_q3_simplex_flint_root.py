#!/usr/bin/env python3
"""Simplex-Bernstein exact probe for adjacent rank-six g2 endpoints."""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import itertools
import json
import math
from pathlib import Path

from flint import fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from tensor_bernstein_degree_elevation_root import tensor_bernstein_degree_elevated
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import (
    REDUCTION,
    REDUCTION_SHA256,
    a2,
    a_ratio_row,
    choose,
    compactify,
    interval_pair,
    k2,
    l2,
    pair_scale,
    pair_sum,
    path_floor,
    sha256,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_Q3_SIMPLEX_FLINT_ROOT"


def weak_compositions(total, parts, prefix=()):
    if parts == 1:
        yield (*prefix, total)
        return
    for value in range(total + 1):
        yield from weak_compositions(total - value, parts - 1, (*prefix, value))


def multinomial(exponents):
    total = sum(exponents)
    out = math.factorial(total)
    for exponent in exponents:
        out //= math.factorial(exponent)
    return out


def endpoint_polynomial(context, upper_b, upper_c, theta_mask=None):
    (s, z, u0, u1, u2, u3, u4, tb2, tb3, tc2, tc3, p, q) = context.gens()
    one = context.constant(1)
    zero = (context.constant(0), 0)
    mb = 7 + p
    mc = 7 + p + q
    overlap = mb*s
    n = mb + mc - overlap
    edges = overlap*z
    R1 = 2*n*(n-1) - 4*edges
    budget = R1 - 4*n
    terminal = budget*u0
    D5, D4, D3, D2 = budget*u1, budget*u2, budget*u3, budget*u4
    R2 = terminal + 4*n + D5+D4+D3+D2
    R3 = terminal + 3*n + D5+D4+D3
    R4 = terminal + 2*n + D5+D4
    R5 = terminal + n + D5
    R6 = terminal
    a = a_ratio_row(n, (R1, R2, R3, R4, R5, R6), one)

    def induced_row(order, theta2, theta3, bit_offset):
        lower2 = path_floor(order, 2, one)
        lower3 = path_floor(order, 3, one)
        if theta_mask is None:
            value2 = interval_pair(lower2, a[2], theta2, n)
            value3 = interval_pair(lower3, a[3], theta3, n)
        else:
            value2 = a[2] if theta_mask & (1 << bit_offset) else (lower2, 0)
            value3 = a[3] if theta_mask & (1 << (bit_offset + 1)) else (lower3, 0)
        return ((one, 0), (order, 0), value2, value3, zero, a[5], a[6])

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
        return b3num*(6*b3num-b2num*n), 8*b2num, 2

    bnum, bpolyden, bnden = endpoint(b, mb, upper_b)
    cnum, cpolyden, cnden = endpoint(c, mc, upper_c)
    common_n_degree = max(base[1], db[1]+bnden, dc[1]+cnden)
    polynomial = (
        base[0]*n**(common_n_degree-base[1])*bpolyden*cpolyden
        + db[0]*bnum*n**(common_n_degree-db[1]-bnden)*cpolyden
        + dc[0]*cnum*n**(common_n_degree-dc[1]-cnden)*bpolyden
    )
    return polynomial, {
        "branch": f"B{'Q3' if upper_b else 'PATH'}_C{'Q3' if upper_c else 'PATH'}",
        "theta_mask": theta_mask,
        "common_N_degree": common_n_degree,
        "positive_multiplier": (
            f"N^{common_n_degree}"
            + ("*(8*b2)" if upper_b else "")
            + ("*(8*c2)" if upper_c else "")
        ),
        "simplex": "u0,u1,u2,u3,u4,u5>=0, sum=1; u5 is the D1 residual",
    }


def split_simplex_coefficients(source, coefficient_context, elevation=0):
    # Source axes: s,z,u0..u4,tb2,tb3,tc2,tc3,p,q.
    grouped_terms = defaultdict(list)
    for monomial, coefficient in source.terms():
        alpha = tuple(map(int, monomial[2:7]))
        remaining = (*monomial[0:2], *monomial[7:13])
        term = coefficient_context.constant(coefficient)
        for variable, exponent in zip(coefficient_context.gens(), remaining):
            term *= variable**int(exponent)
        grouped_terms[alpha].append(term)
    grouped = {alpha: balanced_batched_sum(terms, batch_size=128)
               for alpha, terms in grouped_terms.items()}
    raw_degree = max(map(sum, grouped))
    degree = raw_degree + elevation
    betas = list(weak_compositions(degree, 6))
    coefficients = []
    for beta in betas:
        terms = []
        for alpha, polynomial in grouped.items():
            if any(alpha[index] > beta[index] for index in range(5)):
                continue
            gaps = tuple(beta[index]-alpha[index] for index in range(5)) + (beta[5],)
            if sum(gaps) != degree-sum(alpha):
                continue
            terms.append(polynomial*multinomial(gaps))
        coefficients.append(balanced_batched_sum(terms, batch_size=128))
    return raw_degree, degree, betas, coefficients, len(grouped)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", choices=("00", "01", "10", "11"), default="00")
    parser.add_argument("--theta-mask", type=int, choices=range(16))
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1000000)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--simplex-elevation", type=int, default=0)
    parser.add_argument("--box-elevation", type=int, default=0)
    args = parser.parse_args()
    assert sha256(REDUCTION) == REDUCTION_SHA256
    names = ("s", "z", "u0", "u1", "u2", "u3", "u4",
             "tb2", "tb3", "tc2", "tc3", "p", "q")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    upper_b, upper_c = (value == "1" for value in args.endpoint)
    source, metadata = endpoint_polynomial(
        source_context, upper_b, upper_c, theta_mask=args.theta_mask
    )
    source_terms = list(source.terms())
    source_degrees = [int(max(monomial[axis] for monomial, _ in source_terms))
                      for axis in range(len(names))]
    coefficient_names = ("s", "z", "tb2", "tb3", "tc2", "tc3", "p", "q")
    coefficient_context = fmpq_mpoly_ctx.get(coefficient_names, "degrevlex")
    raw_simplex_degree, simplex_degree, betas, simplex_coefficients, raw_simplex_monomials = (
        split_simplex_coefficients(
            source, coefficient_context, elevation=args.simplex_elevation
        )
    )
    summary = {
        **metadata, "source_terms": len(source_terms),
        "source_degrees": dict(zip(names, source_degrees)),
        "raw_simplex_degree": raw_simplex_degree,
        "simplex_elevation": args.simplex_elevation,
        "simplex_degree": simplex_degree,
        "raw_simplex_monomials": raw_simplex_monomials,
        "homogeneous_simplex_coefficients": len(betas),
    }
    print(json.dumps(summary, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    stop = min(len(betas), args.start_beta + args.max_betas)
    target_names = (*coefficient_names[:-2], "P", "Q")
    target_context = fmpq_mpoly_ctx.get(target_names, "degrevlex")
    records = []
    digest = hashlib.sha256()
    for beta_index in range(args.start_beta, stop):
        coefficient = simplex_coefficients[beta_index]
        mapped, degree_p, degree_q, coefficient_terms = compactify(
            coefficient, target_context, 6
        )
        mapped_terms = list(mapped.terms())
        if args.box_elevation:
            mapped_term_list = list(mapped.terms())
            native_degrees = [
                int(max(monomial[axis] for monomial, _ in mapped_term_list))
                for axis in range(8)
            ]
            target_degrees = [
                degree + args.box_elevation if degree else 0
                for degree in native_degrees
            ]
            degrees, values, replay_terms = tensor_bernstein_degree_elevated(
                mapped, 8, target_degrees, chunk_columns=args.chunk_columns
            )
        else:
            degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
                mapped, 8, chunk_columns=args.chunk_columns
            )
        assert replay_terms == len(mapped_terms)
        minimum = min(values.flat)
        minimum_flat_index = min(range(values.size), key=lambda index: values.flat[index])
        minimum_multiindex = list(map(int, __import__("numpy").unravel_index(
            minimum_flat_index, values.shape
        )))
        negative = sum(1 for value in values.flat if value < 0)
        zero = sum(1 for value in values.flat if value == 0)
        stream = hashlib.sha256()
        for value in values.flat:
            stream.update(f"{value};".encode())
        record = {
            "beta_index": beta_index, "beta": betas[beta_index],
            "coefficient_terms": coefficient_terms,
            "compactification_degrees_p_q": [degree_p, degree_q],
            "mapped_terms": len(mapped_terms),
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(values.size),
            "negative": negative, "zero": zero, "minimum": str(minimum),
            "minimum_multiindex": minimum_multiindex,
            "coefficient_stream_sha256": stream.hexdigest().upper(),
        }
        records.append(record)
        digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
        print(json.dumps(record, sort_keys=True), flush=True)

    report = {
        "marker": MARKER, **summary,
        "start_beta": args.start_beta, "stop_beta": stop,
        "box_elevation": args.box_elevation,
        "processed_betas": len(records),
        "negative_betas": sum(row["negative"] > 0 for row in records),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "mB,mC>=7 ordered branch; simplex/Bernstein endpoint probe only",
        "reduction_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    suffix = "alltheta" if args.theta_mask is None else f"mask{args.theta_mask}"
    output = HERE / (
        f"iso_n6_bundle_g2_adjacent_q3_simplex_{args.endpoint}_{suffix}_"
        f"simplexelev{args.simplex_elevation}_boxelev{args.box_elevation}_"
        f"beta{args.start_beta}_{stop}_flint_probe_root_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "branch", "theta_mask", "processed_betas", "negative_betas"
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
