#!/usr/bin/env python3
"""Exact nonadjacent endpoint-parent G2 coefficient-box census, N=9..13."""

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
from census_iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_root import (
    d_corner,
    full_row_corner,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import path_floor
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    L2_TERMS,
)
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import (
    M2_TERMS,
    R2_TERMS,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_forest_jets_n9_13_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "FOREST_JETS_N9_13_ROOT"
)
OBSTRUCTION = (
    "OBSTRUCTION_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "FOREST_JETS_N9_13_ROOT"
)
OCCUPATION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
    "exact_root_20260831.json"
)
OCCUPATION_SHA256 = (
    "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bilinear(left, right, terms) -> int:
    return sum(
        scalar * int(left[i]) * int(right[j]) for scalar, i, j in terms
    )


def ordered_feasible_pairs(n: int, geometry: str):
    union_order = n if geometry == "common0" else n - 1
    for mb in range(union_order + 1):
        for mc in range(max(0, union_order - mb), union_order + 1):
            d = mb + mc - union_order
            assert 0 <= d <= min(mb, mc) <= union_order
            yield mb, mc, d


def audit_order(n: int, polynomials: set[tuple[int, ...]], geometry: str) -> dict:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    maximum_order = n if geometry == "common0" else n - 1
    rows = {
        order: np.asarray(
            [full_row_corner(order, mask) for mask in range(32)],
            dtype=np.int64,
        )
        for order in range(maximum_order + 1)
    }
    pair_data = {}
    for mb, mc, d in ordered_feasible_pairs(n, geometry):
        left, right = rows[mb], rows[mc]
        matrix = np.zeros((32, 32), dtype=np.int64)
        for scalar, i, j in R2_TERMS:
            matrix += scalar * left[:, i, None] * right[None, :, j]
        pair_data[(mb, mc, d)] = matrix

    checks = negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        assert a[0] == 1 and a[1] == n
        # The D3 coefficient is a1-a2+10a3.  For N>=9, use
        # a2<=C(N,2) and the forest path floor for a3; the resulting integer
        # lower bound is positive.  Hence D3=0 is a safe lower endpoint.
        d3_derivative = a[1] - a[2] + 10 * a[3]
        path_bound = n - math.comb(n, 2) + 10 * int(path_floor(n, 3, 1))
        assert path_bound > 0 and d3_derivative >= path_bound

        a2_piece = bilinear(a, a, A2_TERMS)
        l_vectors = {}
        m_vectors = {}
        for order, matrix in rows.items():
            left = np.zeros(32, dtype=np.int64)
            right = np.zeros(32, dtype=np.int64)
            for scalar, i, j in L2_TERMS:
                left += scalar * int(a[i]) * matrix[:, j]
            for scalar, i, j in M2_TERMS:
                right += scalar * int(a[i]) * matrix[:, j]
            l_vectors[order] = left
            m_vectors[order] = right
        rd_vectors = {
            d: np.asarray([
                bilinear(a, d_corner(d, dmask), R2_TERMS)
                for dmask in (0, 1)
            ], dtype=np.int64)
            for d in range(maximum_order + 1)
        }

        local_minimum = None
        local_record = None
        for (mb, mc, d), r_matrix in pair_data.items():
            values = (
                a2_piece
                + l_vectors[mb][:, None, None]
                + m_vectors[mc][None, :, None]
                + r_matrix[:, :, None]
                + rd_vectors[d][None, None, :]
            )
            checks += int(values.size)
            negative += int(np.count_nonzero(values < 0))
            flat = int(np.argmin(values))
            bmask, cmask, dmask = map(
                int, np.unravel_index(flat, values.shape)
            )
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
                    "B_mask_ranks2_through6": bmask,
                    "C_mask_ranks2_through6": cmask,
                    "D2_endpoint": "EDGELESS" if dmask else "ZERO",
                }
        assert local_minimum is not None and local_record is not None
        stream.update(
            (
                "|".join(map(str, a)) + ":"
                + "|".join(map(str, local_minimum)) + ";"
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
        "feasible_ordered_order_pairs": len(pair_data),
        "B_C_masks_each": 32,
        "D2_endpoints": 2,
        "literal_g2_checks": checks,
        "negative_relaxation_corners": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    assert occupation["endpoint_u_split"] == (
        "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
    )
    absolute_scalar_sum = sum(abs(value) for value, _, _ in A2_TERMS)
    absolute_scalar_sum += sum(abs(value) for value, _, _ in L2_TERMS)
    absolute_scalar_sum += sum(abs(value) for value, _, _ in M2_TERMS)
    absolute_scalar_sum += 2 * sum(abs(value) for value, _, _ in R2_TERMS)
    int64_bound = absolute_scalar_sum * math.comb(13, 6) ** 2
    assert int64_bound < 2**63

    forests, enumeration = enumerate_forest_polynomials(13)
    orders = {}
    total_checks = total_negative = 0
    global_minimum = None
    global_witness = None
    for n in range(9, 14):
        orders[str(n)] = {}
        for geometry in ("common0", "common1"):
            result = audit_order(n, forests[n], geometry)
            orders[str(n)][geometry] = result
            total_checks += result["literal_g2_checks"]
            total_negative += result["negative_relaxation_corners"]
            candidate = (result["minimum"], n, geometry)
            if global_minimum is None or candidate < global_minimum:
                global_minimum = candidate
                global_witness = {
                    "N": n, "geometry": geometry,
                    **result["minimum_witness"],
                }
            print(
                f"AUDITED N={n} geometry={geometry} "
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
            "PASS exact nonadjacent endpoint-parent coefficient-box census"
            if total_negative == 0
            else "obstruction to the independent endpoint-box relaxation"
        ),
        "theorem": (
            "For every nonadjacent endpoint-parent rank-six geometry with "
            "common order 9<=N<=13, G2 is nonnegative."
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
                "all 32*32 PATH/EDGELESS B,C corners and both affine D2 "
                "endpoints are checked"
            ),
            "order_geometry": (
                "both ordered B,C orientations; common0 union order N and "
                "common1 union order N-1"
            ),
            "D_rows": (
                "D3 uses the proved-positive coefficient and floor zero; "
                "D4,D5 use edgeless ceilings; D2 uses both endpoints"
            ),
            "int64_absolute_bound": int64_bound,
        },
        "occupation_report": {
            "file": OCCUPATION.name,
            "sha256": OCCUPATION_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "checks": total_checks,
        "negative": total_negative,
        "minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
