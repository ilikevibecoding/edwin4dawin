#!/usr/bin/env python3
"""Exact forest-jet endpoint census for nonadjacent rank-six g2, N=9..18.

For N=9..13 every PATH/EDGELESS endpoint of ranks 2..6 in B and C is
checked.  For N=14..18 the frozen derivative reduction leaves only the two
rank-2 endpoints in each row.  The additional K2(A,D) term is affine in D2;
both universal endpoints D2=0,C(d,2) are checked, while D3=0 is the valid
lower floor and D4,D5 use their edgeless ceilings.
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
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_FOREST_JETS_N9_18_ROOT"
OBSTRUCTION = "OBSTRUCTION_ISO_N6_BUNDLE_G2_NONADJACENT_FOREST_JETS_N9_18_ROOT"
CORNER_REPORT = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_REPORT_SHA256 = "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def full_row_corner(order: int, mask: int) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = bool(mask & (1 << (rank - 2)))
        value = choose(order, rank, 1) if use_edgeless else path_floor(order, rank, 1)
        row.append(int(value))
    return tuple(row)


def reduced_row_corner(order: int, mask: int) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = (rank == 2 and bool(mask)) or rank in (5, 6)
        value = choose(order, rank, 1) if use_edgeless else path_floor(order, rank, 1)
        row.append(int(value))
    return tuple(row)


def d_corner(order: int, mask: int) -> tuple[int, ...]:
    return (
        1,
        order,
        int(choose(order, 2, 1)) if mask else 0,
        0,
        int(choose(order, 4, 1)),
        int(choose(order, 5, 1)),
        int(choose(order, 6, 1)),
    )


def bilinear(left, right, terms) -> int:
    return sum(scalar * int(left[i]) * int(right[j]) for scalar, i, j in terms)


def feasible_pairs(n: int, geometry: str):
    union_order = n if geometry == "common0" else n - 1
    for mb in range(union_order + 1):
        for mc in range(max(mb, union_order - mb), union_order + 1):
            d = mb + mc - union_order
            assert 0 <= d <= mb <= mc <= union_order
            yield mb, mc, d


def audit_order(n: int, polynomials: set[tuple[int, ...]], geometry: str) -> dict:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    mask_count = 32 if n <= 13 else 2
    row_builder = full_row_corner if n <= 13 else reduced_row_corner
    maximum_order = n if geometry == "common0" else n - 1
    rows = {
        order: np.asarray(
            [row_builder(order, mask) for mask in range(mask_count)], dtype=np.int64
        )
        for order in range(maximum_order + 1)
    }
    pair_data = {}
    for mb, mc, d in feasible_pairs(n, geometry):
        left = rows[mb]
        right = rows[mc]
        k_matrix = np.zeros((mask_count, mask_count), dtype=np.int64)
        for scalar, i, j in K2_TERMS:
            k_matrix += scalar * left[:, i, None] * right[None, :, j]
        pair_data[(mb, mc, d)] = k_matrix

    checks = 0
    negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        assert a[0] == 1 and a[1] == n
        a2_piece = bilinear(a, a, A2_TERMS)
        l_vectors = {}
        for order, row_matrix in rows.items():
            vector = np.zeros(mask_count, dtype=np.int64)
            for scalar, i, j in L2_TERMS:
                vector += scalar * int(a[i]) * row_matrix[:, j]
            l_vectors[order] = vector
        kd_vectors = {
            d: np.asarray([
                bilinear(a, d_corner(d, dmask), K2_TERMS) for dmask in (0, 1)
            ], dtype=np.int64)
            for d in range(maximum_order + 1)
        }

        local_minimum = None
        local_record = None
        for (mb, mc, d), k_matrix in pair_data.items():
            values = (
                a2_piece
                + l_vectors[mb][:, None, None]
                + l_vectors[mc][None, :, None]
                + k_matrix[:, :, None]
                + kd_vectors[d][None, None, :]
            )
            checks += int(values.size)
            negative += int(np.count_nonzero(values < 0))
            flat_index = int(np.argmin(values))
            bmask, cmask, dmask = map(int, np.unravel_index(flat_index, values.shape))
            value = int(values[bmask, cmask, dmask])
            record = (value, mb, mc, d, bmask, cmask, dmask)
            if local_minimum is None or record < local_minimum:
                local_minimum = record
                local_record = {
                    "value": value,
                    "A_jet_i0_through_i7": list(a),
                    "mB": mb,
                    "mC": mc,
                    "d": d,
                    "B_mask": bmask,
                    "C_mask": cmask,
                    "D2_endpoint": "EDGELESS" if dmask else "ZERO",
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
        "geometry": geometry,
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "feasible_order_pairs_after_B_C_sort": len(pair_data),
        "B_C_masks_each": mask_count,
        "D2_endpoints": 2,
        "literal_g2_checks": checks,
        "negative_relaxation_corners": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(CORNER_REPORT) == CORNER_REPORT_SHA256
    corner = json.loads(CORNER_REPORT.read_text(encoding="utf-8"))
    assert corner["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"
    )
    assert corner["corner_count"] == 4

    absolute_scalar_sum = sum(abs(value) for value, _, _ in A2_TERMS)
    absolute_scalar_sum += 2 * sum(abs(value) for value, _, _ in L2_TERMS)
    absolute_scalar_sum += 2 * sum(abs(value) for value, _, _ in K2_TERMS)
    maximum_row_entry = math.comb(18, 6)
    int64_bound = absolute_scalar_sum * maximum_row_entry**2
    assert int64_bound < 2**63

    forests, enumeration = enumerate_forest_polynomials(18)
    orders = {}
    total_checks = 0
    total_negative = 0
    global_minimum = None
    global_witness = None
    for n in range(9, 19):
        orders[str(n)] = {}
        for geometry in ("common0", "common1"):
            result = audit_order(n, forests[n], geometry)
            orders[str(n)][geometry] = result
            total_checks += result["literal_g2_checks"]
            total_negative += result["negative_relaxation_corners"]
            candidate = (result["minimum"], n, geometry)
            if global_minimum is None or candidate < global_minimum:
                global_minimum = candidate
                global_witness = {"N": n, **result["minimum_witness"], "geometry": geometry}
            print(
                f"AUDITED n={n} geometry={geometry} "
                f"jets={result['distinct_i0_through_i7_jets']} "
                f"checks={result['literal_g2_checks']} "
                f"negative={result['negative_relaxation_corners']} "
                f"min={result['minimum']}",
                flush=True,
            )
    assert global_minimum is not None and global_witness is not None
    marker = MARKER if total_negative == 0 else OBSTRUCTION
    report = {
        "marker": marker,
        "status": (
            "PASS exact nonadjacent forest-jet endpoint census"
            if total_negative == 0 else
            "exact obstruction to the independent endpoint relaxation"
        ),
        "theorem": (
            "For every nonadjacent-mark canonical no-parent rank-six bundle "
            "geometry whose common forest row A has order 9<=N<=18, g2 is nonnegative."
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
        "coverage_argument": {
            "geometries": (
                "common0 uses union order N and d=mB+mC-N; common1 uses union "
                "order N-1 and d=mB+mC-N+1; every ordered feasible integer pair is checked"
            ),
            "orders_9_13": (
                "all 32 PATH/EDGELESS rank2..6 endpoint rows for each of B,C"
            ),
            "orders_14_18": (
                "the proven B,C derivative reduction is unchanged by the added "
                "K2(A,D), which contains no B or C variable; four B,C rank2 corners"
            ),
            "D_reduction": (
                "K2(A,D) is affine in D2 so both 0 and C(d,2) are checked; its "
                "D3 derivative A1+11A2+10A3 is positive so D3=0 is a lower floor; "
                "D4,D5 derivatives are negative so edgeless ceilings are used"
            ),
        },
        "exactness": {
            "int64_absolute_bound": int64_bound,
            "int64_limit": 2**63,
        },
        "scope_guard": (
            "If negative corners occur, they obstruct only this endpoint relaxation "
            "and are not graph counterexamples."
        ),
        "corner_report": {"file": CORNER_REPORT.name, "sha256": CORNER_REPORT_SHA256},
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
