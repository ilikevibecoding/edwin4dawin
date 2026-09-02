#!/usr/bin/env python3
"""Exact four-corner forest-jet census for endpoint-parent g2, N=14..18."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import enumerate_forest_polynomials, truncate
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, path_floor
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS, L2_TERMS
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import M2_TERMS, R2_TERMS


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_forest_jets_n14_18_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_FOREST_JETS_N14_18_RANK7_G5_FINISH"
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "CC5E2172087C7CE76992B680F1CC84E1E44A2A31F64FCA92ED0C9AFA989E9E38"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row_corner(order, rank2_edgeless):
    row = [1, order]
    for rank in range(2, 7):
        upper = (rank == 2 and rank2_edgeless) or rank in (5, 6)
        row.append(int(choose(order, rank, 1) if upper else path_floor(order, rank, 1)))
    return tuple(row)


def bilinear(left, right, terms):
    return sum(coefficient*int(left[i])*int(right[j]) for coefficient, i, j in terms)


def audit_order(n, polynomials):
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    rows = {order: np.asarray([row_corner(order, False), row_corner(order, True)], dtype=np.int64)
            for order in range(n+1)}
    r_matrices = {}
    for mb in range(n+1):
        for mc in range(max(0, n-mb), n+1):
            left, right = rows[mb], rows[mc]
            matrix = np.zeros((2, 2), dtype=np.int64)
            for scalar, i, j in R2_TERMS:
                matrix += scalar*left[:, i, None]*right[None, :, j]
            r_matrices[(mb, mc)] = matrix
    checks = negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        a2_piece = bilinear(a, a, A2_TERMS)
        left_vectors = {}
        right_vectors = {}
        for order in range(n+1):
            matrix = rows[order]
            left = np.zeros(2, dtype=np.int64)
            right = np.zeros(2, dtype=np.int64)
            for scalar, i, j in L2_TERMS:
                left += scalar*int(a[i])*matrix[:, j]
            for scalar, i, j in M2_TERMS:
                right += scalar*int(a[i])*matrix[:, j]
            left_vectors[order] = left
            right_vectors[order] = right
        local_minimum = None
        local_record = None
        for (mb, mc), matrix in r_matrices.items():
            values = a2_piece + left_vectors[mb][:, None] + right_vectors[mc][None, :] + matrix
            checks += 4
            negative += int(np.count_nonzero(values < 0))
            flat = int(np.argmin(values))
            bmask, cmask = map(int, np.unravel_index(flat, values.shape))
            value = int(values[bmask, cmask])
            record = (value, mb, mc, bmask, cmask)
            if local_minimum is None or record < local_minimum:
                local_minimum = record
                local_record = {
                    "value": value, "A_jet_i0_through_i7": list(a),
                    "mB": mb, "mC": mc,
                    "B2_endpoint": "EDGELESS" if bmask else "PATH",
                    "C2_endpoint": "EDGELESS" if cmask else "PATH",
                }
        stream.update(("|".join(map(str, a))+":"+"|".join(map(str, local_minimum))+";").encode())
        candidate = (local_minimum[0], tuple(a), local_minimum[1:])
        if minimum is None or candidate < minimum:
            minimum = candidate
            witness = local_record
    return {
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "feasible_ordered_order_pairs": len(r_matrices),
        "rank2_corner_pairs": 4,
        "literal_g2_checks": checks,
        "negative": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    assert sha256(REDUCTION) == REDUCTION_SHA256
    forests, enumeration = enumerate_forest_polynomials(18)
    orders = {}
    total_checks = total_negative = 0
    global_minimum = None
    global_witness = None
    for n in range(14, 19):
        row = audit_order(n, forests[n])
        assert row["negative"] == 0
        orders[str(n)] = row
        total_checks += row["literal_g2_checks"]
        total_negative += row["negative"]
        candidate = (row["minimum"], n)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = {"N": n, **row["minimum_witness"]}
        print(f"AUDITED N={n} jets={row['distinct_i0_through_i7_jets']} checks={row['literal_g2_checks']} min={row['minimum']}", flush=True)
    report = {
        "marker": MARKER,
        "status": "PASS exact finite forest-jet census",
        "theorem": (
            "For every adjacent endpoint-parent rank-six geometry with common order 14<=N<=18, g2 is nonnegative."
        ),
        "enumeration": enumeration,
        "orders": orders,
        "aggregate": {
            "literal_g2_checks": total_checks,
            "negative": total_negative,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
        },
        "coverage_argument": {
            "forest_polynomials": "every distinct forest independence polynomial through order 18 is enumerated",
            "order_geometry": "every ordered 0<=mB,mC<=N with mB+mC>=N is checked",
            "four_corner_reduction": "the pinned N>=14 endpoint reduction leaves only the four b2,c2 endpoint choices",
        },
        "reduction_report": {"file": REDUCTION.name, "sha256": REDUCTION_SHA256},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "checks": total_checks, "negative": 0, "minimum": global_minimum[0]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
