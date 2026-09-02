#!/usr/bin/env python3
"""Exact edge-budget cone probe for adjacent-mark C5.

For adjacent marks, delete them and call the remaining forest A.  If B,C are
the two neighborhood-deleted forests, write their orders as

    mB=7+p, mC=7+p+q, r=mB+mC-|A|=mB*s.

Forest acyclicity implies that A has at least |A|-r components, hence its
edge count e is at most r; put e=r*z.  This fixes the first factorial ratio

    rho1=2(|A|-1)-4e/|A|.

The remaining exact forest drops delta1>=0, delta2>=1, delta3>=1 partition
rho1-2 by three stick-breaking variables.  Every coefficient of B,C at ranks
2..4 is independently set to its path-minimal or edgeless-maximal endpoint.

With no flag the source checks the large-large branch mB,mC>=7.  With
``--small-order m`` it checks the fixed smaller order m=0,...,6 against the
automatically large other order.  Each run is fail-closed: negative Bernstein
coefficients obstruct that relaxation but are not forest counterexamples;
all-positive rows still require every branch and the finite assembly before
becoming a C5 theorem.
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
OUTPUT = HERE / "iso_n5_c5_adjacent_order_box_edge_budget_flint_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_C5_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_G1_BERNSTEIN"


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


def row_corner_small(order, mask, context):
    row = [context.constant(1), context.constant(order)]
    for rank in range(2, 5):
        lower_top = order - rank + 1
        lower = math.comb(lower_top, rank) if lower_top >= rank else 0
        upper = math.comb(order, rank) if order >= rank else 0
        row.append(context.constant(upper if mask & (1 << (rank - 2)) else lower))
    return tuple(row)


def scaled_l(n, ratio_numerators, b):
    """Return 5760*n^2*L(A,B) after clearing ratio denominators."""
    R1, R2, R3, _R4 = ratio_numerators
    return (
        -5760 * n**3 * b[4]
        + 1440 * n**2 * R1 * b[3]
        + 240 * n * R1 * R2 * b[2]
        - 30 * R1 * R2 * R3 * b[1]
    )


def scaled_k(n, b, c):
    return 5760 * n**2 * (
        -b[1] * c[3] + 2 * b[2] * c[2] - b[3] * c[1]
    )


def compactify(source, target_context, bounded_count=5):
    terms = list(source.terms())
    degree_p = int(max(monomial[-2] for monomial, _ in terms))
    degree_q = int(max(monomial[-1] for monomial, _ in terms))
    target_gens = target_context.gens()
    one = target_context.constant(1)
    P, Q = target_gens[-2:]
    degrees = [int(max(monomial[axis] for monomial, _ in terms)) for axis in range(bounded_count)]
    powers = [
        [target_gens[axis] ** exponent for exponent in range(degree + 1)]
        for axis, degree in enumerate(degrees)
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

    return (
        balanced_batched_sum(mapped_terms(), batch_size=128),
        degree_p,
        degree_q,
        len(terms),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-corners", type=int, default=64)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--small-order", type=int, choices=range(7))
    args = parser.parse_args()

    source_context = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "p", "q"), "degrevlex")
    s, z, r0, r1, r2, p, q = source_context.gens()
    one = source_context.constant(1)
    if args.small_order is None:
        mb = 7 + p
        mc = 7 + p + q
        overlap = mb * s
        n = mb + mc - overlap
        branch_description = "adjacent marks, ordered mB<=mC, mB,mC>=7"
    else:
        mb = source_context.constant(args.small_order)
        n = 13 + q
        overlap = mb * s
        mc = n - mb + overlap
        branch_description = f"adjacent marks, mB={args.small_order}, mC>=7, |A|>=13"
    edges = overlap * z

    # Every ratio is represented by its numerator over the common positive n.
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 2 * n
    T = budget * r0
    D3 = budget * (1 - r0) * r1
    D2 = budget * (1 - r0) * (1 - r1) * r2
    D1 = budget * (1 - r0) * (1 - r1) * (1 - r2)
    R4 = T
    R3 = T + n + D3
    R2 = T + 2 * n + D3 + D2
    reconstructed_R1 = T + 2 * n + D3 + D2 + D1
    assert reconstructed_R1 == R1
    ratio_numerators = (R1, R2, R3, R4)

    # 5760*n^2*H_C(A)=10(R1R2)^2-3R1R2R3R4.
    scaled_h = 10 * (R1 * R2) ** 2 - 3 * R1 * R2 * R3 * R4
    brows = (
        [row_corner(mb, mask, one) for mask in range(8)]
        if args.small_order is None
        else [row_corner_small(args.small_order, mask, source_context) for mask in range(8)]
    )
    crows = [row_corner(mc, mask, one) for mask in range(8)]
    target_context = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "P", "Q"), "degrevlex")

    records = []
    digest = hashlib.sha256()
    for branch_index, (bmask, cmask) in enumerate(itertools.product(range(8), repeat=2)):
        if branch_index >= args.max_corners:
            break
        source = (
            scaled_h
            + scaled_l(n, ratio_numerators, brows[bmask])
            + scaled_l(n, ratio_numerators, crows[cmask])
            + scaled_k(n, brows[bmask], crows[cmask])
        )
        mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
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
            "compactification_degrees_p_q": [degree_p, degree_q],
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
        "branch": branch_description,
        "exact_geometry": (
            "A has at least |A|-(mB+mC-|A|) components, so e(A)<=mB+mC-|A|."
        ),
        "ratio_parameterization": (
            "rho1=2(N-1)-4e/N with e=(mB+mC-N)z; terminal rho4 and "
            "delta3-1,delta2-1,delta1 partition rho1-2 by r0,r1,r2."
        ),
        "positive_multiplier": "5760*N^2 and the p,q compactification denominators",
        "corner_pairs": len(records),
        "failing_corner_pairs": failing,
        "passing_corner_pairs": len(records) - failing,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": (
            "One exact all-order relaxation branch only; every order branch and "
            "the finite census must be assembled before making a C5 theorem claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = (
        OUTPUT if args.small_order is None else
        HERE / f"iso_n5_c5_adjacent_order_box_edge_budget_small{args.small_order}_flint_probe_g1_bernstein_20260830.json"
    )
    output.write_text(raw, encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "marker", "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
