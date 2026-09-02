#!/usr/bin/env python3
"""Exact Bernstein relaxation for the nonadjacent no-parent g2 remainder.

For nonadjacent marks put A=G-u-v, B=A-N(v), C=A-N(u), and
D=A-(N(u) union N(v)).  The exact occupation split is

  g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D).

There are three forest geometries.  With d=|D| and mB<=mC:

* disconnected marks: d=mB+mC-N and e(A)<=d;
* a path of length at least three between the marks:
  d=mB+mC-N and e(A)<=d+1;
* one common neighbour: d=mB+mC-N+1 and e(A)<=d.

For fixed d, K2(A,D) is increasing in i2(D) and decreasing in i3(D),
i4(D).  We therefore use the path floor for i2 and the edgeless ceilings
for i3,i4.  The exceptional d=0 value is split from d>=1 because the
polynomial path-floor formula binom(d-1,2) has a spurious value at zero.
This is a relaxation probe only until every branch and the finite range are
assembled fail-closed.
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import hashlib
import itertools
import json
import os
from pathlib import Path
import time

import msvcrt
from flint import fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt import (
    a_ratio_row,
    choose,
    path_floor,
    row_corner,
    row_corner_small,
    scaled_a2,
    scaled_k2,
    scaled_l2,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G2_NONADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
LOCK_PATH = HERE / ".iso_n5_g2_nonadjacent_flint_probe.exclusive.lock"
LOCK_ACQUIRED_MARKER = "ISO_N5_G2_NONADJACENT_EXCLUSIVE_LOCK_ACQUIRED"
LOCK_RELEASED_MARKER = "ISO_N5_G2_NONADJACENT_EXCLUSIVE_LOCK_RELEASED"
HELPER_SOURCE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"

GEOMETRY = {
    "disconnected": {
        "common_neighbor": 0,
        "edge_extra": 0,
        "description": "u,v in distinct components; d=mB+mC-N; e(A)<=d",
    },
    "connected_long": {
        "common_neighbor": 0,
        "edge_extra": 1,
        "description": "u-v path length at least 3; d=mB+mC-N; e(A)<=d+1",
    },
    "common_neighbor": {
        "common_neighbor": 1,
        "edge_extra": 0,
        "description": "u,v have their unique common neighbour; d=mB+mC-N+1; e(A)<=d",
    },
}


@contextmanager
def exclusive_process_lock():
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


def compactify(source, target_context, bounded_count=6):
    terms = list(source.terms())
    degree_p = int(max(monomial[-2] for monomial, _ in terms))
    degree_q = int(max(monomial[-1] for monomial, _ in terms))
    target_gens = target_context.gens()
    one = target_context.constant(1)
    P, Q = target_gens[-2:]
    degrees = [
        int(max(monomial[axis] for monomial, _ in terms))
        for axis in range(bounded_count)
    ]
    powers = [
        [target_gens[axis] ** exponent for exponent in range(degree + 1)]
        for axis, degree in enumerate(degrees)
    ]
    p_powers = [P ** exponent for exponent in range(degree_p + 1)]
    p_complements = [(one - P) ** exponent for exponent in range(degree_p + 1)]
    q_powers = [Q ** exponent for exponent in range(degree_q + 1)]
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


def d_worst_row(d, d_branch, one):
    if d_branch == "zero":
        return tuple((one if rank == 0 else one * 0, 0) for rank in range(5))
    if d_branch == "coarse":
        return (
            (one, 0), (d, 0), (one * 0, 0),
            (choose(d, 3, one), 0), (choose(d, 4, one), 0),
        )
    return (
        (one, 0),
        (d, 0),
        (path_floor(d, 2, one), 0),
        (choose(d, 3, one), 0),
        (choose(d, 4, one), 0),
    )


def output_path(geometry, d_branch, small_order, start, stop):
    order_label = "large" if small_order is None else f"small{small_order}"
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_{d_branch}_{order_label}_{start}_{stop}_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=tuple(GEOMETRY), required=True)
    parser.add_argument("--d-branch", choices=("zero", "positive", "coarse"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7))
    parser.add_argument("--start-corner", type=int, default=0)
    parser.add_argument("--max-corners", type=int, default=256)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()

    if args.d_branch == "positive" and args.small_order == 0:
        raise ValueError("d>=1 is impossible when mB=0")

    spec = GEOMETRY[args.geometry]
    common_neighbor = spec["common_neighbor"]
    edge_extra = spec["edge_extra"]
    source_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "p", "q"), "degrevlex"
    )
    s, z, r0, r1, r2, r3, p, q = source_context.gens()
    one = source_context.constant(1)

    if args.small_order is None:
        mb = 7 + p
        mc = 7 + p + q
        d = (
            one * 0 if args.d_branch == "zero"
            else (mb * s if args.d_branch == "coarse" else 1 + (mb - 1) * s)
        )
        n = mb + mc - d + common_neighbor
        order_description = "ordered mB<=mC with mB,mC>=7"
    else:
        mb = source_context.constant(args.small_order)
        n = 13 + q
        d = (
            one * 0 if args.d_branch == "zero"
            else (mb * s if args.d_branch == "coarse" else 1 + (mb - 1) * s)
        )
        mc = n - mb + d - common_neighbor
        order_description = f"mB={args.small_order}, N=13+q"

    edges = (d + edge_extra) * z
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
    assert T + 3 * n + D4 + D3 + D2 + D1 == R1
    arow = a_ratio_row(n, (R1, R2, R3, R4, R5))

    brows = (
        [row_corner(mb, mask, one) for mask in range(16)]
        if args.small_order is None
        else [row_corner_small(args.small_order, mask, source_context) for mask in range(16)]
    )
    crows = [row_corner(mc, mask, one) for mask in range(16)]
    drow = d_worst_row(d, args.d_branch, one)
    target_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "P", "Q"), "degrevlex"
    )

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
            + scaled_k2(arow, drow, n)
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
    stop = args.start_corner + len(records)
    report = {
        "marker": MARKER,
        "geometry": args.geometry,
        "geometry_description": spec["description"],
        "d_branch": args.d_branch,
        "order_branch": order_description,
        "identity": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)",
        "D_monotone_lower_bound": {
            "coefficient_i2_D": (
                "1+9N+8*i2(A)>0; use universal zero floor"
                if args.d_branch == "coarse" else
                "1+9N+8*i2(A)>0; use path floor"
            ),
            "coefficient_i3_D": "-13-2N<0; use edgeless ceiling",
            "coefficient_i4_D": "-6<0; use edgeless ceiling",
            "d_zero_split": True,
        },
        "ratio_parameterization": (
            "rho1=2(N-1)-4e/N with e=(d+edge_extra)z; terminal rho5 and "
            "delta4-1,delta3-1,delta2-1,delta1 partition rho1-3."
        ),
        "positive_multiplier": "46080*N^4 and p,q compactification denominators",
        "corner_pairs": len(records),
        "passing_corner_pairs": len(records) - failing,
        "failing_corner_pairs": failing,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "Exact relaxation probe only; no theorem without all branches, finite census, and deterministic assembly.",
        "exclusive_process_lock": {
            "lock_file": LOCK_PATH.name,
            "acquired_marker": LOCK_ACQUIRED_MARKER,
            "released_marker": LOCK_RELEASED_MARKER,
            "held_for_entire_main": True,
        },
        "dependencies_sha256": {HELPER_SOURCE.name: hashlib.sha256(HELPER_SOURCE.read_bytes()).hexdigest().upper()},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = output_path(args.geometry, args.d_branch, args.small_order, args.start_corner, stop)
    output.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "geometry": args.geometry,
        "d_branch": args.d_branch,
        "corner_pairs": len(records),
        "passing_corner_pairs": len(records) - failing,
        "failing_corner_pairs": failing,
        "output": output.name,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    with exclusive_process_lock():
        main()
