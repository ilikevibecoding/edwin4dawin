#!/usr/bin/env python3
"""Exact edge-budget Bernstein probe for adjacent-mark no-parent g2.

For adjacent marks the exact occupation split is

  g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C).

Write mB<=mC, N=|A|, and r=mB+mC-N.  Forest acyclicity gives
e(A)<=r.  This source fixes rho1 from e=r*z, parameterizes the remaining
rank-five factorial drops by a stick-breaking box, and independently places
each coefficient of B,C at its path-minimal or edgeless-maximal endpoint.

The result is a fail-closed relaxation probe.  Passing every corner still
needs the small-order branches and finite assembly before it is a theorem.
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import hashlib
import itertools
import json
import math
import os
from pathlib import Path
import time

import msvcrt

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_order_box_edge_budget_flint_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
SCALE = 46080
N_POWER = 4
LOCK_PATH = HERE / ".iso_n5_g2_adjacent_flint_probe.exclusive.lock"
LOCK_ACQUIRED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_ACQUIRED"
LOCK_RELEASED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_RELEASED"


@contextmanager
def exclusive_process_lock():
    """Prevent overlapping FLINT tensor workers on this Windows host."""
    with LOCK_PATH.open("a+b") as handle:
        handle.seek(0, 2)
        if handle.tell() == 0:
            handle.write(b"\0")
            handle.flush()
        while True:
            try:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                time.sleep(0.25)
        print(f"{LOCK_ACQUIRED_MARKER} PID={os.getpid()}", flush=True)
        try:
            yield
        finally:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            print(f"{LOCK_RELEASED_MARKER} PID={os.getpid()}", flush=True)


def choose(value, rank, one):
    out = one
    for offset in range(rank):
        out *= value - offset
    return out * fmpq(1, math.factorial(rank))


def path_floor(order, rank, one):
    return choose(order - rank + 1, rank, one)


def row_corner(order, mask, one):
    row = [one, order]
    for rank in range(2, 6):
        row.append(
            choose(order, rank, one)
            if mask & (1 << (rank - 2))
            else path_floor(order, rank, one)
        )
    return tuple((value, 0) for value in row)


def row_corner_small(order, mask, context):
    values = [1, order]
    for rank in range(2, 6):
        lower_top = order - rank + 1
        lower = math.comb(lower_top, rank) if lower_top >= rank else 0
        upper = math.comb(order, rank) if order >= rank else 0
        values.append(upper if mask & (1 << (rank - 2)) else lower)
    return tuple((context.constant(value), 0) for value in values)


def a_ratio_row(n, ratios):
    r1, r2, r3, r4, r5 = ratios
    return (
        (n**0, 0),
        (n, 0),
        (r1 * fmpq(1, 4), 0),
        (r1 * r2 * fmpq(1, 24), 1),
        (r1 * r2 * r3 * fmpq(1, 192), 2),
        (r1 * r2 * r3 * r4 * fmpq(1, 1920), 3),
        (r1 * r2 * r3 * r4 * r5 * fmpq(1, 23040), 4),
    )


def scaled_product(left, right, n):
    value_left, denominator_left = left
    value_right, denominator_right = right
    power = N_POWER - denominator_left - denominator_right
    assert power >= 0
    return value_left * value_right * n**power


def at(row, rank):
    return row[rank]


def scaled_a2(a, n):
    return SCALE * (
        4 * scaled_product(at(a, 0), at(a, 3), n)
        - 3 * scaled_product(at(a, 0), at(a, 4), n)
        - 15 * scaled_product(at(a, 0), at(a, 5), n)
        - 6 * scaled_product(at(a, 0), at(a, 6), n)
        + 12 * scaled_product(at(a, 1), at(a, 2), n)
        + 8 * scaled_product(at(a, 1), at(a, 3), n)
        - 19 * scaled_product(at(a, 1), at(a, 4), n)
        - 14 * scaled_product(at(a, 1), at(a, 5), n)
        + 11 * scaled_product(at(a, 2), at(a, 2), n)
        + 18 * scaled_product(at(a, 2), at(a, 3), n)
        - 2 * scaled_product(at(a, 2), at(a, 4), n)
        + 6 * scaled_product(at(a, 3), at(a, 3), n)
    )


def scaled_l2(a, b, n):
    return SCALE * (
        4 * scaled_product(at(a, 0), at(b, 2), n)
        - scaled_product(at(a, 0), at(b, 3), n)
        - 14 * scaled_product(at(a, 0), at(b, 4), n)
        - 6 * scaled_product(at(a, 0), at(b, 5), n)
        + 8 * scaled_product(at(a, 1), at(b, 1), n)
        + 9 * scaled_product(at(a, 1), at(b, 2), n)
        - 4 * scaled_product(at(a, 1), at(b, 3), n)
        - 8 * scaled_product(at(a, 1), at(b, 4), n)
        + 4 * scaled_product(at(a, 2), at(b, 0), n)
        + 9 * scaled_product(at(a, 2), at(b, 1), n)
        + 20 * scaled_product(at(a, 2), at(b, 2), n)
        + 6 * scaled_product(at(a, 2), at(b, 3), n)
        - scaled_product(at(a, 3), at(b, 0), n)
        - 4 * scaled_product(at(a, 3), at(b, 1), n)
        + 6 * scaled_product(at(a, 3), at(b, 2), n)
        - 14 * scaled_product(at(a, 4), at(b, 0), n)
        - 8 * scaled_product(at(a, 4), at(b, 1), n)
        - 6 * scaled_product(at(a, 5), at(b, 0), n)
    )


def scaled_k2(b, c, n):
    return SCALE * (
        4 * scaled_product(at(b, 0), at(c, 1), n)
        + scaled_product(at(b, 0), at(c, 2), n)
        - 13 * scaled_product(at(b, 0), at(c, 3), n)
        - 6 * scaled_product(at(b, 0), at(c, 4), n)
        + 4 * scaled_product(at(b, 1), at(c, 0), n)
        + 6 * scaled_product(at(b, 1), at(c, 1), n)
        + 9 * scaled_product(at(b, 1), at(c, 2), n)
        - 2 * scaled_product(at(b, 1), at(c, 3), n)
        + scaled_product(at(b, 2), at(c, 0), n)
        + 9 * scaled_product(at(b, 2), at(c, 1), n)
        + 8 * scaled_product(at(b, 2), at(c, 2), n)
        - 13 * scaled_product(at(b, 3), at(c, 0), n)
        - 2 * scaled_product(at(b, 3), at(c, 1), n)
        - 6 * scaled_product(at(b, 4), at(c, 0), n)
    )


def compactify(source, target_context, bounded_count=6):
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

    return balanced_batched_sum(mapped_terms(), batch_size=128), degree_p, degree_q, len(terms)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-corner", type=int, default=0)
    parser.add_argument("--max-corners", type=int, default=256)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--small-order", type=int, choices=range(7))
    args = parser.parse_args()

    source_context = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "r3", "p", "q"), "degrevlex")
    s, z, r0, r1, r2, r3, p, q = source_context.gens()
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

    # Rj=n*rho_j.  The constants in delta2,delta3,delta4 consume 3n.
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 3 * n
    T = budget * r0
    D4 = budget * (1 - r0) * r1
    D3 = budget * (1 - r0) * (1 - r1) * r2
    D2 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
    D1 = budget * (1 - r0) * (1 - r1) * (1 - r2) * (1 - r3)
    R5 = T
    R4 = T + n + D4
    R3 = T + 2 * n + D4 + D3
    R2 = T + 3 * n + D4 + D3 + D2
    reconstructed_R1 = T + 3 * n + D4 + D3 + D2 + D1
    assert reconstructed_R1 == R1
    arow = a_ratio_row(n, (R1, R2, R3, R4, R5))

    brows = (
        [row_corner(mb, mask, one) for mask in range(16)]
        if args.small_order is None
        else [row_corner_small(args.small_order, mask, source_context) for mask in range(16)]
    )
    crows = [row_corner(mc, mask, one) for mask in range(16)]
    target_context = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "r3", "P", "Q"), "degrevlex")

    records = []
    digest = hashlib.sha256()
    for branch_index, (bmask, cmask) in enumerate(itertools.product(range(16), repeat=2)):
        if branch_index < args.start_corner:
            continue
        if branch_index >= args.start_corner + args.max_corners:
            break
        source = (
            scaled_a2(arow, n)
            + scaled_l2(arow, brows[bmask], n)
            + scaled_l2(arow, crows[cmask], n)
            + scaled_k2(brows[bmask], crows[cmask], n)
        )
        mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
        mapped_terms = list(mapped.terms())
        degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 8, chunk_columns=args.chunk_columns
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
        "identity": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C) for adjacent marks",
        "exact_geometry": "A has at least |A|-(mB+mC-|A|) components, so e(A)<=mB+mC-|A|.",
        "ratio_parameterization": (
            "rho1=2(N-1)-4e/N with e=(mB+mC-N)z; terminal rho5 and "
            "delta4-1,delta3-1,delta2-1,delta1 partition rho1-3 by r0..r3."
        ),
        "positive_multiplier": "46080*N^4 and the p,q compactification denominators",
        "corner_pairs": len(records),
        "failing_corner_pairs": failing,
        "passing_corner_pairs": len(records) - failing,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "Exact relaxation probe only; no theorem unless all branches and finite assembly pass.",
        "exclusive_process_lock": {
            "lock_file": LOCK_PATH.name,
            "acquired_marker": LOCK_ACQUIRED_MARKER,
            "released_marker": LOCK_RELEASED_MARKER,
            "held_for_entire_main": True,
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    stop_corner = args.start_corner + len(records)
    if args.small_order is None and args.start_corner == 0 and args.max_corners >= 256:
        output = OUTPUT
    elif args.small_order is None:
        output = HERE / (
            f"iso_n5_g2_adjacent_order_box_edge_budget_large_{args.start_corner}_{stop_corner}_"
            "flint_probe_rank5_g2_alt_20260830.json"
        )
    else:
        output = HERE / (
            f"iso_n5_g2_adjacent_order_box_edge_budget_small{args.small_order}_"
            f"{args.start_corner}_{stop_corner}_flint_probe_rank5_g2_alt_20260830.json"
        )
    output.write_text(raw, encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "marker", "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    with exclusive_process_lock():
        main()
