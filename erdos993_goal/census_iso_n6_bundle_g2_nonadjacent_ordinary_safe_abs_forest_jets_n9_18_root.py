#!/usr/bin/env python3
"""Exact N=9..18 ordinary-parent corner-paid forest-jet census.

The frozen no-parent endpoint reduction is reused.  For every feasible order
triple and every row endpoint, each of the sixteen parent-loss coefficients is
evaluated exactly.  Its subset ceiling is paid iff that coefficient is
negative.  The resulting coordinatewise-concave lower function is minimized
at row endpoints and is a rigorous lower bound for every ordinary parent.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np

from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import (
    enumerate_forest_polynomials,
    truncate,
)
from census_iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_root import (
    bilinear,
    d_corner,
    feasible_pairs,
    full_row_corner,
    reduced_row_corner,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)
from probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root import (
    coefficient_terms,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_corner_paid_forest_jets_"
    "n9_18_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_CORNER_PAID_"
    "FOREST_JETS_N9_18_ROOT"
)
OBSTRUCTION = (
    "OBSTRUCTION_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_CORNER_PAID_"
    "FOREST_JETS_N9_18_ROOT"
)
NO_PARENT_REPORT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_exact_root_20260831.json"
)
NO_PARENT_REPORT_SHA256 = (
    "DD3FB434BB669C49DC329D24810694CAF66CBD87ACCA030B44BE2FD3FFB3F5D5"
)
LOSS_REPORT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_REPORT_SHA256 = (
    "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_int(order: int, rank: int) -> int:
    return math.comb(order, rank) if 0 <= rank <= order else 0


def middle_row_corner(order: int, mask: int) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = (
            (rank <= 4 and bool(mask & (1 << (rank - 2))))
            or rank in (5, 6)
        )
        if use_edgeless:
            value = choose_int(order, rank)
        else:
            from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import (
                path_floor,
            )
            value = int(path_floor(order, rank, 1))
        row.append(value)
    return tuple(row)


def corner_paid_correction(a, left, right, drows,
                           n: int, mb: int, mc: int, d: int) -> np.ndarray:
    """Independent parent-loss box minimum at one B,C,D endpoint block."""
    arow, brow, crow, drow = object(), object(), object(), object()
    terms = coefficient_terms(arow, brow, crow, drow)
    shape = (left.shape[0], right.shape[0], drows.shape[0])
    correction = np.zeros(shape, dtype=np.int64)
    for label, pieces in terms.items():
        coefficient_values = np.zeros(shape, dtype=np.int64)
        for scalar, row, rank in pieces:
            if row is arow:
                coefficient_values += scalar * int(a[rank])
            elif row is brow:
                coefficient_values += scalar * left[:, rank, None, None]
            elif row is crow:
                coefficient_values += scalar * right[None, :, rank, None]
            else:
                assert row is drow
                coefficient_values += scalar * drows[None, None, :, rank]
        rank = int(label[-1])
        if label.startswith("PA"):
            cap = choose_int(mb, rank - 2)
        elif label.startswith("PB"):
            cap = choose_int(mc, rank - 2)
        elif label.startswith("PW"):
            cap = choose_int(n, rank - 1)
        else:
            assert label.startswith("PZ")
            cap = choose_int(d, rank - 3)
        correction += np.minimum(coefficient_values, 0) * cap
    return correction


def audit_order(n: int, polynomials: set[tuple[int, ...]], geometry: str) -> dict:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    mask_count = 32 if n <= 13 else 8
    row_builder = full_row_corner if n <= 13 else middle_row_corner
    maximum_order = n if geometry == "common0" else n - 1
    rows = {
        order: np.asarray(
            [row_builder(order, mask) for mask in range(mask_count)],
            dtype=np.int64,
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
    negative_by_pair = {}
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
        drows_by_order = {
            d: np.asarray([d_corner(d, dmask) for dmask in (0, 1)], dtype=np.int64)
            for d in range(maximum_order + 1)
        }
        kd_vectors = {
            d: np.asarray([
                bilinear(a, row, K2_TERMS) for row in drows_by_order[d]
            ], dtype=np.int64)
            for d in range(maximum_order + 1)
        }

        local_minimum = None
        local_record = None
        for (mb, mc, d), k_matrix in pair_data.items():
            correction = corner_paid_correction(
                a, rows[mb], rows[mc], drows_by_order[d], n, mb, mc, d
            )
            values = (
                a2_piece
                + l_vectors[mb][:, None, None]
                + l_vectors[mc][None, :, None]
                + k_matrix[:, :, None]
                + kd_vectors[d][None, None, :]
                + correction
            )
            checks += int(values.size)
            pair_negative = int(np.count_nonzero(values < 0))
            negative += pair_negative
            if pair_negative:
                key = (mb, mc, d)
                row = negative_by_pair.setdefault(key, {
                    "negative": 0,
                    "minimum": None,
                })
                row["negative"] += pair_negative
                pair_minimum = int(values.min())
                row["minimum"] = (
                    pair_minimum if row["minimum"] is None
                    else min(row["minimum"], pair_minimum)
                )
            flat_index = int(np.argmin(values))
            bmask, cmask, dmask = map(
                int, np.unravel_index(flat_index, values.shape)
            )
            value = int(values[bmask, cmask, dmask])
            record = (value, mb, mc, d, bmask, cmask, dmask)
            if local_minimum is None or record < local_minimum:
                local_minimum = record
                local_record = {
                    "value": value,
                    "no_parent_value": value - int(correction[bmask, cmask, dmask]),
                    "corner_paid_correction": int(correction[bmask, cmask, dmask]),
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
            (
                "|".join(map(str, a))
                + ":"
                + "|".join(map(str, local_minimum))
                + ";"
            ).encode()
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
        "literal_corner_paid_checks": checks,
        "negative_corner_paid_corners": negative,
        "negative_order_pairs": [
            {
                "mB": key[0],
                "mC": key[1],
                "d": key[2],
                **value,
            }
            for key, value in sorted(negative_by_pair.items())
        ],
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-n", type=int, default=9, choices=range(9, 19))
    parser.add_argument("--stop-n", type=int, default=18, choices=range(9, 19))
    args = parser.parse_args()
    assert args.start_n <= args.stop_n
    assert sha256(NO_PARENT_REPORT) == NO_PARENT_REPORT_SHA256
    assert sha256(LOSS_REPORT) == LOSS_REPORT_SHA256
    no_parent = json.loads(NO_PARENT_REPORT.read_text(encoding="utf-8"))
    assert no_parent["aggregate"]["negative_relaxation_corners"] == 0

    forests, enumeration = enumerate_forest_polynomials(18)
    orders = {}
    total_checks = 0
    total_negative = 0
    global_minimum = None
    global_witness = None
    for n in range(args.start_n, args.stop_n + 1):
        orders[str(n)] = {}
        for geometry in ("common0", "common1"):
            result = audit_order(n, forests[n], geometry)
            orders[str(n)][geometry] = result
            total_checks += result["literal_corner_paid_checks"]
            total_negative += result["negative_corner_paid_corners"]
            candidate = (result["minimum"], n, geometry)
            if global_minimum is None or candidate < global_minimum:
                global_minimum = candidate
                global_witness = {
                    "N": n,
                    **result["minimum_witness"],
                    "geometry": geometry,
                }
            print(
                f"AUDITED n={n} geometry={geometry} "
                f"checks={result['literal_corner_paid_checks']} "
                f"negative={result['negative_corner_paid_corners']} "
                f"min={result['minimum']}",
                flush=True,
            )
    assert global_minimum is not None and global_witness is not None
    marker = MARKER if total_negative == 0 else OBSTRUCTION
    report = {
        "marker": marker,
        "status": (
            "PASS exact ordinary-parent corner-paid forest-jet census"
            if total_negative == 0
            else "obstruction to the independent corner-paid relaxation"
        ),
        "theorem": (
            "For every nonadjacent-mark ordinary-parent rank-six bundle "
            "geometry with common order 9<=N<=18, g2 is nonnegative."
            if total_negative == 0
            else None
        ),
        "enumeration": enumeration,
        "audited_order_range": [args.start_n, args.stop_n],
        "orders": orders,
        "aggregate": {
            "literal_corner_paid_checks": total_checks,
            "negative_corner_paid_corners": total_negative,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
        },
        "coverage_argument": {
            "base": "the frozen no-parent N=9..18 endpoint reduction",
            "ordinary_parent": (
                "at every endpoint, each exact coefficient c and parent-loss P "
                "satisfy cP >= min(c,0)C, where C is the universal "
                "parent-containing subset ceiling"
            ),
            "coordinatewise_concavity": (
                "the no-parent form is affine in each row coordinate and each "
                "min(c,0)C payment is concave in that coordinate, so a minimum "
                "over every endpoint interval occurs at an endpoint"
            ),
            "orders_9_13": "all rank2..6 PATH/EDGELESS endpoints are checked",
            "orders_14_18": (
                "rank2..4 endpoints are checked; correction coefficients contain "
                "no rank5 or rank6 row variable, so the frozen no-parent rank5/6 "
                "derivative choices remain unchanged"
            ),
            "coordinates": "all sixteen parent-loss coordinates are paid",
        },
        "scope_guard": (
            "A negative corner would obstruct only this corner-paid route and "
            "would not be a graph counterexample."
        ),
        "no_parent_report": {
            "file": NO_PARENT_REPORT.name,
            "sha256": NO_PARENT_REPORT_SHA256,
        },
        "loss_report": {
            "file": LOSS_REPORT.name,
            "sha256": LOSS_REPORT_SHA256,
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = (
        OUTPUT
        if (args.start_n, args.stop_n) == (9, 18)
        else HERE / (
            "iso_n6_bundle_g2_nonadjacent_ordinary_corner_paid_forest_jets_"
            f"n{args.start_n}_{args.stop_n}_probe_root_20260831.json"
        )
    )
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "literal_corner_paid_checks": total_checks,
        "negative_corner_paid_corners": total_negative,
        "global_minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
