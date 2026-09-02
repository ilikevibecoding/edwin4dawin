#!/usr/bin/env python3
"""Exact full endpoint-box census for adjacent rank-six g2, N=0..13.

For these orders the N>=14 derivative reduction is unavailable, so every one
of the 32 PATH/EDGELESS choices for ranks 2..6 of each induced row is checked.
The occupation polynomial is multi-affine in those ten entries, hence the
1,024 corner pairs contain the minimum over the entire coefficient box.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np

from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import (
    enumerate_forest_polynomials,
    truncate,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import (
    choose,
    path_floor,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_forest_jets_n0_13_box_exact_root_20260831.json"
PASS_MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_FOREST_JETS_N0_13_BOX_ROOT"
OBSTRUCTION_MARKER = "OBSTRUCTION_ISO_N6_BUNDLE_G2_ADJACENT_FOREST_JETS_N0_13_BOX_ROOT"


def row_corner(order: int, mask: int) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = bool(mask & (1 << (rank - 2)))
        value = choose(order, rank, 1) if use_edgeless else path_floor(order, rank, 1)
        row.append(int(value))
    return tuple(row)


def bilinear(left, right, terms) -> int:
    return sum(coefficient * int(left[i]) * int(right[j])
               for coefficient, i, j in terms)


def audit_order(n: int, polynomials: set[tuple[int, ...]]) -> dict[str, object]:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    rows = {
        order: np.asarray([row_corner(order, mask) for mask in range(32)], dtype=np.int64)
        for order in range(n + 1)
    }
    k_matrices = {}
    for mb in range(n + 1):
        for mc in range(max(mb, n - mb), n + 1):
            left = rows[mb]
            right = rows[mc]
            matrix = np.zeros((32, 32), dtype=np.int64)
            for scalar, i, j in K2_TERMS:
                matrix += scalar * left[:, i, None] * right[None, :, j]
            k_matrices[(mb, mc)] = matrix

    feasible_pairs = len(k_matrices)
    checks = 0
    negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        assert a[0] == 1 and a[1] == n
        a2_piece = bilinear(a, a, A2_TERMS)
        l_vectors = {}
        for order in range(n + 1):
            row_matrix = rows[order]
            vector = np.zeros(32, dtype=np.int64)
            for scalar, i, j in L2_TERMS:
                vector += scalar * int(a[i]) * row_matrix[:, j]
            l_vectors[order] = vector

        local_minimum = None
        local_record = None
        for (mb, mc), k_matrix in k_matrices.items():
            values = (
                a2_piece
                + l_vectors[mb][:, None]
                + l_vectors[mc][None, :]
                + k_matrix
            )
            checks += values.size
            negative += int(np.count_nonzero(values < 0))
            flat_index = int(np.argmin(values))
            bmask, cmask = map(int, np.unravel_index(flat_index, values.shape))
            value = int(values[bmask, cmask])
            record = (value, mb, mc, bmask, cmask)
            if local_minimum is None or record < local_minimum:
                local_minimum = record
                local_record = {
                    "value": value,
                    "A_jet_i0_through_i7": list(a),
                    "mB": mb,
                    "mC": mc,
                    "B_mask_ranks2_through6": bmask,
                    "C_mask_ranks2_through6": cmask,
                }
        assert local_minimum is not None and local_record is not None
        stream.update(
            ("|".join(map(str, a)) + ":" + "|".join(map(str, local_minimum)) + ";").encode()
        )
        candidate = (local_minimum[0], tuple(a), local_minimum[1:])
        if minimum is None or candidate < minimum:
            minimum = candidate
            witness = local_record
    assert minimum is not None and witness is not None
    return {
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "feasible_order_pairs_after_B_C_sort": feasible_pairs,
        "corner_pairs_per_order_pair": 1024,
        "literal_g2_checks": checks,
        "negative_relaxation_corners": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    absolute_scalar_sum = sum(abs(value) for value, _, _ in A2_TERMS)
    absolute_scalar_sum += 2 * sum(abs(value) for value, _, _ in L2_TERMS)
    absolute_scalar_sum += sum(abs(value) for value, _, _ in K2_TERMS)
    maximum_row_entry = math.comb(13, 6)
    int64_bound = absolute_scalar_sum * maximum_row_entry**2
    assert int64_bound < 2**63

    forests, enumeration = enumerate_forest_polynomials(13)
    orders = {}
    total_checks = 0
    total_negative = 0
    global_minimum = None
    global_witness = None
    for n in range(14):
        result = audit_order(n, forests[n])
        orders[str(n)] = result
        total_checks += result["literal_g2_checks"]
        total_negative += result["negative_relaxation_corners"]
        candidate = (result["minimum"], n)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = {"N": n, **result["minimum_witness"]}
        print(
            f"AUDITED n={n} jets={result['distinct_i0_through_i7_jets']} "
            f"checks={result['literal_g2_checks']} "
            f"negative={result['negative_relaxation_corners']} min={result['minimum']}",
            flush=True,
        )
    assert global_minimum is not None and global_witness is not None
    marker = PASS_MARKER if total_negative == 0 else OBSTRUCTION_MARKER
    report = {
        "marker": marker,
        "status": (
            "PASS exact full coefficient-box census"
            if total_negative == 0
            else "exact obstruction to the independent endpoint-box relaxation"
        ),
        "theorem": (
            "For every adjacent-mark canonical no-parent rank-six bundle geometry "
            "whose common forest row A has order 0<=N<=13, g2 is nonnegative."
            if total_negative == 0 else None
        ),
        "enumeration": enumeration,
        "orders": orders,
        "aggregate": {
            "literal_g2_checks": total_checks,
            "negative_relaxation_corners": total_negative,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
        },
        "exactness": {
            "multi_affine_box": (
                "g2 is multi-affine in b2,...,b6,c2,...,c6, so every minimum "
                "over the independent PATH/EDGELESS coefficient box is at one of "
                "the 32*32 checked corners."
            ),
            "int64_absolute_bound": int64_bound,
            "int64_limit": 2**63,
        },
        "scope_guard": (
            "If negative corners occur, they obstruct only this independent "
            "coefficient-box relaxation and are not graph counterexamples."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "literal_g2_checks": total_checks,
        "negative_relaxation_corners": total_negative,
        "global_minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
