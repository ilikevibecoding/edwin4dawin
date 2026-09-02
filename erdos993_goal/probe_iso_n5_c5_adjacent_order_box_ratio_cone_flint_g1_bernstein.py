#!/usr/bin/env python3
"""FLINT exact Bernstein probe for the adjacent C5 order-box cone.

This is the memory-bounded implementation of the large-large branch in the
companion SymPy probe.  It constructs the polynomial directly in a FLINT
rational multivariate ring, compactifies the two unbounded order surpluses,
and applies an exact seven-dimensional tensor Bernstein transform.

The output is fail-closed: a PASS concerns only this large-large relaxation
branch, while any negative coefficient is merely a box-certificate failure.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_adjacent_order_box_ratio_cone_flint_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_C5_ADJACENT_ORDER_BOX_RATIO_CONE_FLINT_G1_BERNSTEIN"


def choose(value, rank, one):
    out = one
    for offset in range(rank):
        out *= value - offset
    return out * fmpq(1, math.factorial(rank))


def path_floor(order, rank, one):
    return choose(order - rank + 1, rank, one)


def row_corner(order, mask, one):
    row = [one, order]
    for rank in range(2, 5):
        row.append(
            choose(order, rank, one)
            if mask & (1 << (rank - 2))
            else path_floor(order, rank, one)
        )
    return tuple(row)


def h(a):
    return a[3] ** 2 - a[1] * a[5]


def ell(a, b):
    return -a[1] * b[4] + a[2] * b[3] + a[3] * b[2] - a[4] * b[1]


def k(b, c):
    return -b[1] * c[3] + 2 * b[2] * c[2] - b[3] * c[1]


def compactify(source, source_context, target_context, bounded_count=5):
    terms = list(source.terms())
    degree_p = max(monomial[-2] for monomial, _ in terms)
    degree_q = max(monomial[-1] for monomial, _ in terms)
    target_gens = target_context.gens()
    one = target_context.constant(1)
    P, Q = target_gens[-2:]
    powers = [
        [target_gens[axis] ** exponent for exponent in range(max(monomial[axis] for monomial, _ in terms) + 1)]
        for axis in range(bounded_count)
    ]
    p_powers = [P**exponent for exponent in range(degree_p + 1)]
    p_complements = [(one - P) ** exponent for exponent in range(degree_p + 1)]
    q_powers = [Q**exponent for exponent in range(degree_q + 1)]
    q_complements = [(one - Q) ** exponent for exponent in range(degree_q + 1)]

    def mapped_terms():
        for monomial, coefficient in terms:
            term = target_context.constant(coefficient)
            for axis in range(bounded_count):
                term *= powers[axis][monomial[axis]]
            ep, eq = monomial[-2:]
            term *= p_powers[ep] * p_complements[degree_p - ep]
            term *= q_powers[eq] * q_complements[degree_q - eq]
            yield term

    return balanced_batched_sum(mapped_terms(), batch_size=128), degree_p, degree_q, len(terms)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-corners", type=int, default=64)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()

    source_context = fmpq_mpoly_ctx.get(("s", "r0", "r1", "r2", "r3", "p", "q"), "degrevlex")
    s, r0, r1, r2, r3, p, q = source_context.gens()
    zero, one = source_context.constant(0), source_context.constant(1)
    mb = 7 + p
    mc = 7 + p + q
    n = mb + mc - mb * s
    budget = 2 * n - 4
    t = budget * r0
    d3 = budget * (1 - r0) * r1
    d2 = budget * (1 - r0) * (1 - r1) * r2
    d1 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
    rho4 = t
    rho3 = t + 1 + d3
    rho2 = t + 2 + d3 + d2
    rho1 = t + 2 + d3 + d2 + d1
    scaled = [one, 2 * n]
    for ratio in (rho1, rho2, rho3, rho4):
        scaled.append(scaled[-1] * ratio)
    a = tuple(scaled[rank] * fmpq(1, 2**rank * math.factorial(rank)) for rank in range(6))
    h_a = h(a)
    brows = [row_corner(mb, mask, one) for mask in range(8)]
    crows = [row_corner(mc, mask, one) for mask in range(8)]

    target_context = fmpq_mpoly_ctx.get(("s", "r0", "r1", "r2", "r3", "P", "Q"), "degrevlex")
    records = []
    digest = hashlib.sha256()
    for branch_index, (bmask, cmask) in enumerate(itertools.product(range(8), repeat=2)):
        if branch_index >= args.max_corners:
            break
        source = h_a + ell(a, brows[bmask]) + ell(a, crows[cmask]) + k(brows[bmask], crows[cmask])
        mapped, degree_p, degree_q, source_terms = compactify(source, source_context, target_context)
        mapped_terms = list(mapped.terms())
        degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 7, chunk_columns=args.chunk_columns
        )
        assert replay_terms == len(mapped_terms)
        minimum = min(coefficients.flat)
        negative = sum(1 for value in coefficients.flat if value < 0)
        zero_count = sum(1 for value in coefficients.flat if value == 0)
        stream = hashlib.sha256()
        for value in coefficients.flat:
            stream.update(f"{value};".encode())
        record = {
            "B_mask": bmask,
            "C_mask": cmask,
            "source_terms": source_terms,
            "compactification_degrees_p_q": [int(degree_p), int(degree_q)],
            "mapped_terms": len(mapped_terms),
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(coefficients.size),
            "negative": negative,
            "zero": zero_count,
            "minimum": str(minimum),
            "coefficient_stream_sha256": stream.hexdigest().upper(),
        }
        records.append(record)
        digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
        print(json.dumps(record, sort_keys=True), flush=True)

    failing = sum(record["negative"] > 0 for record in records)
    report = {
        "marker": MARKER,
        "branch": "adjacent marks, ordered mB<=mC, mB,mC>=7",
        "parameterization": (
            "mB=7+p,mC=7+p+q,N=mB+mC-mB*s; p,q>=0 and s in [0,1]. "
            "The four ratio slacks plus terminal ratio are a stick-breaking "
            "partition of 2N-4, encoding rho1<=2(N-1)."
        ),
        "compactification": "p=P/(1-P), q=Q/(1-Q), with positive denominator powers retained",
        "corner_pairs": len(records),
        "failing_corner_pairs": failing,
        "passing_corner_pairs": len(records) - failing,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "Exact large-large relaxation probe only; no full adjacent C5 theorem unless all other branches are assembled.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "marker", "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
