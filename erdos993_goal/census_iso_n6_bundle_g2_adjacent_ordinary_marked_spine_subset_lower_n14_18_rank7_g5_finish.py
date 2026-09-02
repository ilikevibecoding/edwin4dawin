#!/usr/bin/env python3
"""Exact finite N=14..18 census for the ordinary marked-spine lower.

The all-order certificate starts at N=19.  Here every distinct forest
independence jet of the common row A is enumerated.  The exact N>=14
four-corner row reduction leaves only the PATH/EDGELESS rank-two choices
for B and C.  Both orientations of their orders are retained because the
ordinary parent distinguishes the B row.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np

from census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root import (
    enumerate_forest_polynomials,
    row_corner,
    truncate,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_n14_18_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_N14_18_RANK7_G5_FINISH"
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "D7B0817B10EECB89D5D5E7E676F0178A4976B647E9A2B6A3B179CD4EC36E8CDB"
CORNER = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_SHA256 = "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bilinear(left, right, terms) -> int:
    return sum(coefficient * int(left[i]) * int(right[j])
               for coefficient, i, j in terms)


def audit_signs(n: int) -> dict[str, int]:
    c = math.comb
    path = lambda order, rank: c(order - rank + 1, rank) if order - rank + 1 >= rank else 0
    values = {
        "PA3_derivative_floor": -2*c(n, 2) + path(n, 3) + 7*path(n, 4) - 2*n,
        "PW2_derivative_floor": -2*c(n, 3) + 2*path(n, 4) + 7*path(n, 5) - 4*c(n, 2),
        "minus_PA5_derivative_floor": -(8*n - 5*path(n, 2)),
        "minus_PW4_derivative_floor": 2*path(n, 2) + 10*path(n, 3),
        "B3_C3_derivative_floor": 4*n + 9*path(n, 2) - 5*c(n, 2),
    }
    assert all(value > 0 for value in values.values()), (n, values)
    return values


def audit_order(n: int, polynomials: set[tuple[int, ...]]) -> dict[str, object]:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    row_keys = [(order, mask) for order in range(n + 1) for mask in (0, 1)]
    rows = np.asarray([row_corner(order, bool(mask)) for order, mask in row_keys], dtype=np.int64)
    row_index = {key: index for index, key in enumerate(row_keys)}

    configurations = []
    for mb in range(n + 1):
        for mc in range(n + 1):
            if mb + mc < n:
                continue
            for bmask in (0, 1):
                for cmask in (0, 1):
                    configurations.append((mb, mc, bmask, cmask))
    mb = np.asarray([q[0] for q in configurations], dtype=np.int64)
    mc = np.asarray([q[1] for q in configurations], dtype=np.int64)
    bmask = np.asarray([q[2] for q in configurations], dtype=np.int64)
    cmask = np.asarray([q[3] for q in configurations], dtype=np.int64)
    bind = np.asarray([row_index[(q[0], q[2])] for q in configurations], dtype=np.int64)
    cind = np.asarray([row_index[(q[1], q[3])] for q in configurations], dtype=np.int64)
    brows = rows[bind]
    crows = rows[cind]

    k_values = np.zeros(len(configurations), dtype=np.int64)
    for scalar, i, j in K2_TERMS:
        k_values += scalar * brows[:, i] * crows[:, j]
    mb2 = mb * (mb - 1) // 2
    mb3 = mb * (mb - 1) * (mb - 2) // 6
    n2 = math.comb(n, 2)
    n3 = math.comb(n, 3)

    checks = 0
    negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        assert a[0] == 1 and a[1] == n
        a2_piece = bilinear(a, a, A2_TERMS)
        l_values = np.zeros(len(rows), dtype=np.int64)
        for scalar, i, j in L2_TERMS:
            l_values += scalar * int(a[i]) * rows[:, j]
        no_parent = a2_piece + l_values[bind] + l_values[cind] + k_values

        # Exact subset-payment lower from the pinned reduction.  PA4, PA5,
        # PW3 and PW4 are paid at their exact combinatorial caps; every other
        # parent-loss coordinate has a nonnegative derivative at this order.
        dy2 = -2*n - 2*a[2] - 5*a[3] - 12*crows[:, 2]
        dy3 = n - 5*a[2] + 7*mc
        neg_pw3 = (
            4*a[2] + 2*a[3] + 2*mb + 2*brows[:, 2] + 5*brows[:, 3]
            + 2*mc + 2*crows[:, 2] + 5*crows[:, 3]
        )
        dx3 = -2*n - 2*a[2] - 10*a[3] + mb - 5*brows[:, 2] + mc - 5*crows[:, 2]
        values = no_parent + dy2*mb2 + dy3*mb3 - neg_pw3*n2 + dx3*n3

        checks += int(values.size)
        negative += int(np.count_nonzero(values < 0))
        index = int(np.argmin(values))
        value = int(values[index])
        record = (value, *configurations[index])
        stream.update(("|".join(map(str, a)) + ":" + "|".join(map(str, record)) + ";").encode())
        candidate = (value, tuple(a), configurations[index])
        if minimum is None or candidate < minimum:
            minimum = candidate
            q = configurations[index]
            witness = {
                "value": value,
                "A_jet_i0_through_i7": list(a),
                "mB": q[0],
                "mC": q[1],
                "B2_endpoint": "EDGELESS" if q[2] else "PATH",
                "C2_endpoint": "EDGELESS" if q[3] else "PATH",
            }
    assert minimum is not None and witness is not None
    return {
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "oriented_feasible_order_pairs": len(configurations) // 4,
        "rank2_corner_pairs": 4,
        "lower_checks": checks,
        "negative": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
        "sign_audit": audit_signs(n),
    }


def main() -> None:
    assert sha256(REDUCTION) == REDUCTION_SHA256
    assert sha256(CORNER) == CORNER_SHA256
    reduction = json.loads(REDUCTION.read_text(encoding="utf-8"))
    corner = json.loads(CORNER.read_text(encoding="utf-8"))
    assert reduction["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_RANK7_G5_FINISH"
    assert reduction["ordinary_lower_sha256"] == "9F8FBE4708710EBFA95CC7D008A8A744627D6C240C4B1060391976F9EBD996B1"
    assert corner["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"
    assert corner["corner_count"] == 4

    forests, enumeration = enumerate_forest_polynomials(18)
    orders = {}
    total_checks = 0
    global_minimum = None
    global_witness = None
    for n in range(14, 19):
        result = audit_order(n, forests[n])
        assert result["negative"] == 0, (n, result["minimum_witness"])
        orders[str(n)] = result
        total_checks += result["lower_checks"]
        candidate = (result["minimum"], n)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = {"N": n, **result["minimum_witness"]}
        print(f"AUDITED n={n} jets={result['distinct_i0_through_i7_jets']} checks={result['lower_checks']} negative=0 min={result['minimum']}", flush=True)
    assert global_minimum is not None and global_witness is not None

    report = {
        "marker": MARKER,
        "status": "PASS exact finite ordinary-parent marked-spine subset lower",
        "theorem": "For every forest with adjacent marks u,v and ordinary deleted parent p adjacent to exactly u, G2>=0 for 14<=N=|G-{u,v}|<=18.",
        "orientation": "B is the parent-containing row. Both mB<=mC and mB>=mC are audited; swapping marks covers the symmetric pv orientation.",
        "enumeration": enumeration,
        "orders": orders,
        "aggregate": {"lower_checks": total_checks, "negative": 0, "global_minimum": global_minimum[0], "global_minimum_witness": global_witness},
        "finite_extension": {
            "subset_payment": "The four cap substitutions are the exact pinned N>=19 reduction; their derivative signs are re-audited separately at each N=14,...,18.",
            "row_reduction": "Pinned adjacent four-corner theorem applies from N=14; b3,b4,c3,c4 are PATH, b5,b6,c5,c6 are EDGELESS, and b2,c2 take both endpoints.",
            "forest_jets": "Every distinct independence polynomial of an N-vertex forest is enumerated, then deduplicated through i0,...,i7, the full dependency of this lower.",
        },
        "pins": {"reduction": {"file": REDUCTION.name, "sha256": REDUCTION_SHA256}, "four_corner": {"file": CORNER.name, "sha256": CORNER_SHA256}},
        "scope_guard": "This closes the marked-spine ordinary-parent mode only for N=14..18. N=9..13 and p nonadjacent to both adjacent marks remain separate; universal G2 is not claimed.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "lower_checks": total_checks, "negative": 0, "minimum": global_minimum[0]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
