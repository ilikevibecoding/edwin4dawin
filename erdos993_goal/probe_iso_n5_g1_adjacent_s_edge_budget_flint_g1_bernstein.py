#!/usr/bin/env python3
"""Exact cone probe for adjacent-mark S=M5+3*C5.

This is a diagnostic companion to the proved adjacent C5 theorem.  It uses
the same actual neighborhood-deletion edge budget and coefficient boxes, but
adds the rank-five ratio drop delta4>=1.  Both the high delta1>=1 sector and
the low 0<=delta1<=1 sector are supported.  A negative Bernstein coefficient
only obstructs the relaxation; a passing partial run is not a theorem.
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
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_S_EDGE_BUDGET_FLINT_G1_BERNSTEIN"


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
    return tuple(row)


def row_corner_small(order, mask, context):
    row = [context.constant(1), context.constant(order)]
    for rank in range(2, 6):
        lower_top = order - rank + 1
        lower = math.comb(lower_top, rank) if lower_top >= rank else 0
        upper = math.comb(order, rank) if order >= rank else 0
        row.append(context.constant(upper if mask & (1 << (rank - 2)) else lower))
    return tuple(row)


def scaled_h(n, ratios):
    """Return 46080*n^4*H(A) in common-numerator ratio coordinates."""
    R1, R2, R3, R4, R5 = ratios
    return (
        480 * n**3 * R1 * R2 * R3
        - 120 * n**2 * R1 * R2 * R3 * R4
        - 12 * n * R1 * R2 * R3 * R4 * R5
        + 2880 * n**3 * R1**2 * R2
        - 48 * n * R1**2 * R2 * R3 * R4
        + 400 * n**2 * R1**2 * R2**2
        + 60 * n * R1**2 * R2**2 * R3
    )


def scaled_l(n, ratios, b):
    """Return 46080*n^4*L(A,B)."""
    R1, R2, R3, R4, _R5 = ratios
    return (
        92160 * n**5 * b[3]
        - 184320 * n**5 * b[4]
        - 276480 * n**5 * b[5]
        + 46080 * n**4 * R1 * b[2]
        + 46080 * n**4 * R1 * b[3]
        - 23040 * n**4 * R1 * b[4]
        + 3840 * n**3 * R1 * R2 * b[1]
        + 7680 * n**3 * R1 * R2 * b[2]
        + 15360 * n**3 * R1 * R2 * b[3]
        - 960 * n**2 * R1 * R2 * R3 * b[1]
        - 480 * n**2 * R1 * R2 * R3 * b[2]
        - 144 * n * R1 * R2 * R3 * R4 * b[1]
    )


def scaled_k(n, b, c):
    return 46080 * n**4 * (
        2 * b[1] * c[2]
        - 3 * b[1] * c[3]
        - 6 * b[1] * c[4]
        + 2 * b[2] * c[1]
        + 6 * b[2] * c[2]
        + 4 * b[2] * c[3]
        - 3 * b[3] * c[1]
        + 4 * b[3] * c[2]
        - 6 * b[4] * c[1]
    )


def scaled_coefficient_margin(n, edges, ratios, rank, kind, one):
    """Return 46080*n^4*n^(6-rank)*(a_rank-lower_rank)."""
    products = {
        3: 1920 * n**6 * ratios[0] * ratios[1],
        4: 240 * n**4 * ratios[0] * ratios[1] * ratios[2],
        5: 24 * n**2 * ratios[0] * ratios[1] * ratios[2] * ratios[3],
        6: 2 * ratios[0] * ratios[1] * ratios[2] * ratios[3] * ratios[4],
    }
    if kind == "path":
        lower = path_floor(n, rank, one)
    elif kind == "incidence":
        lower = choose(n, rank, one) - edges * choose(n - 2, rank - 2, one)
    else:
        raise ValueError(kind)
    lower_scales = {
        3: 46080 * n**7,
        4: 46080 * n**6,
        5: 46080 * n**5,
        6: 46080 * n**4,
    }
    return products[rank] - lower_scales[rank] * lower


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
    parser.add_argument("--sector", choices=("high", "low"), default="high")
    parser.add_argument("--max-corners", type=int, default=1)
    parser.add_argument("--start-corner", type=int, default=0)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--small-order", type=int, choices=range(7))
    parser.add_argument(
        "--payment",
        action="append",
        default=[],
        help="subtract a valid margin from S, e.g. incidence3=1 or path5=2",
    )
    args = parser.parse_args()

    if args.sector == "high":
        names = ("s", "z", "r0", "r1", "r2", "r3", "p", "q")
    else:
        names = ("s", "z", "r", "r0", "r1", "r2", "p", "q")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    generators = source_context.gens()
    s, z = generators[:2]
    p, q = generators[-2:]
    one = source_context.constant(1)
    if args.small_order is None:
        mb = 7 + p
        mc = 7 + p + q
        overlap = mb * s
        n = mb + mc - overlap
        order_branch = "large-large"
    else:
        mb = source_context.constant(args.small_order)
        n = 13 + q
        overlap = mb * s
        mc = n - mb + overlap
        order_branch = f"small-{args.small_order}"
    edges = overlap * z
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 4 * n
    if args.sector == "high":
        r0, r1, r2, r3 = generators[2:6]
        R5 = budget * r0
        D4 = budget * (1 - r0) * r1
        D3 = budget * (1 - r0) * (1 - r1) * r2
        D2 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
        D1 = budget * (1 - r0) * (1 - r1) * (1 - r2) * (1 - r3)
        R4 = R5 + n + D4
        R3 = R4 + n + D3
        R2 = R3 + n + D2
        assert R2 + n + D1 == R1
    else:
        bounded_r, r0, r1, r2 = generators[2:6]
        R5 = budget * r0
        D4 = budget * (1 - r0) * r1
        D3 = budget * (1 - r0) * (1 - r1) * r2
        D2 = budget * (1 - r0) * (1 - r1) * (1 - r2)
        R4 = R5 + n + D4
        R3 = R4 + n + D3
        R2 = R3 + 2 * n - n * bounded_r + D2
        assert R2 + n * bounded_r == R1
    ratios = (R1, R2, R3, R4, R5)
    payments = []
    for item in args.payment:
        name, raw_weight = item.split("=", 1)
        kind = "incidence" if name.startswith("incidence") else "path"
        rank = int(name.removeprefix(kind))
        if rank not in range(3, 7):
            raise ValueError(item)
        numerator, separator, denominator = raw_weight.partition("/")
        weight = fmpq(int(numerator), int(denominator) if separator else 1)
        if weight < 0:
            raise ValueError(item)
        payments.append((kind, rank, weight))

    brows = (
        [row_corner(mb, mask, one) for mask in range(16)]
        if args.small_order is None
        else [row_corner_small(args.small_order, mask, source_context) for mask in range(16)]
    )
    crows = [row_corner(mc, mask, one) for mask in range(16)]
    target_context = fmpq_mpoly_ctx.get(names[:-2] + ("P", "Q"), "degrevlex")

    records = []
    for corner_index, (bmask, cmask) in enumerate(itertools.product(range(16), repeat=2)):
        if corner_index < args.start_corner:
            continue
        if len(records) >= args.max_corners:
            break
        source = (
            scaled_h(n, ratios)
            + scaled_l(n, ratios, brows[bmask])
            + scaled_l(n, ratios, crows[cmask])
            + scaled_k(n, brows[bmask], crows[cmask])
        )
        for kind, rank, weight in payments:
            source -= weight * scaled_coefficient_margin(
                n, edges, ratios, rank, kind, one
            )
        mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
        mapped_terms = list(mapped.terms())
        degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 8, chunk_columns=args.chunk_columns
        )
        assert replay_terms == len(mapped_terms)
        record = {
            "corner_index": corner_index,
            "B_mask": bmask,
            "C_mask": cmask,
            "source_terms": source_terms,
            "mapped_terms": len(mapped_terms),
            "compactification_degrees_p_q": [degree_p, degree_q],
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(coefficients.size),
            "negative": sum(1 for value in coefficients.flat if value < 0),
            "zero": sum(1 for value in coefficients.flat if value == 0),
            "minimum": str(min(coefficients.flat)),
        }
        records.append(record)
        print(json.dumps(record, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "sector": args.sector,
        "order_branch": order_branch,
        "start_corner": args.start_corner,
        "corner_count": len(records),
        "failing_corners": sum(row["negative"] > 0 for row in records),
        "payments": [f"{kind}{rank}={weight}" for kind, rank, weight in payments],
        "records": records,
        "scope": "Partial exact relaxation probe only; no theorem claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        f"iso_n5_g1_adjacent_s_edge_budget_{args.sector}_{order_branch}_"
        f"corners{args.start_corner}_{args.start_corner + len(records) - 1}_g1_bernstein_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "marker", "sector", "order_branch", "corner_count", "failing_corners",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
