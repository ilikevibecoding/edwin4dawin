#!/usr/bin/env python3
"""Exact finite N=9..13 census for the ordinary marked-spine lower.

Ranks two through four of the B,C rows use the full PATH/EDGELESS box.
The only derivative whose sign is not uniform in this range is PW2.  Since
PW2=|X| with X contained in the N-vertex common row A, its exact contribution
is bounded below by min(0,N*K_PW2).  The resulting function is separately
concave in every boxed row coefficient, so its minimum is attained at one of
the 8*8 checked endpoint pairs.
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
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, path_floor
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS, K2_TERMS, L2_TERMS


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_n9_13_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_N9_13_RANK7_G5_FINISH"
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "D7B0817B10EECB89D5D5E7E676F0178A4976B647E9A2B6A3B179CD4EC36E8CDB"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row_corner(order: int, mask: int) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = rank >= 5 or bool(mask & (1 << (rank - 2)))
        row.append(int(choose(order, rank, 1) if use_edgeless else path_floor(order, rank, 1)))
    return tuple(row)


def bilinear(left, right, terms) -> int:
    return sum(coefficient * int(left[i]) * int(right[j]) for coefficient, i, j in terms)


def sign_audit(n: int) -> dict[str, int]:
    c = math.comb
    path = lambda order, rank: c(order - rank + 1, rank) if order - rank + 1 >= rank else 0
    values = {
        "PA3_derivative_floor": -2*c(n, 2) + path(n, 3) + 7*path(n, 4) - 2*n,
        "minus_PA5_derivative_floor": -(8*n - 5*path(n, 2)),
        "minus_PW4_derivative_floor": 2*path(n, 2) + 10*path(n, 3),
    }
    assert all(value > 0 for value in values.values()), (n, values)
    return values


def audit_order(n: int, polynomials: set[tuple[int, ...]]) -> dict[str, object]:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    row_keys = [(order, mask) for order in range(n + 1) for mask in range(8)]
    rows = np.asarray([row_corner(order, mask) for order, mask in row_keys], dtype=np.int64)
    row_index = {key: index for index, key in enumerate(row_keys)}

    configurations = []
    for mb in range(n + 1):
        for mc in range(n + 1):
            if mb + mc < n:
                continue
            for bmask in range(8):
                for cmask in range(8):
                    configurations.append((mb, mc, bmask, cmask))
    mb = np.asarray([q[0] for q in configurations], dtype=np.int64)
    mc = np.asarray([q[1] for q in configurations], dtype=np.int64)
    bind = np.asarray([row_index[(q[0], q[2])] for q in configurations], dtype=np.int64)
    cind = np.asarray([row_index[(q[1], q[3])] for q in configurations], dtype=np.int64)
    brows = rows[bind]
    crows = rows[cind]
    k_values = np.zeros(len(configurations), dtype=np.int64)
    for scalar, i, j in K2_TERMS:
        k_values += scalar * brows[:, i] * crows[:, j]
    mb2 = mb * (mb - 1) // 2
    mb3 = mb * (mb - 1) * (mb - 2) // 6
    n2, n3 = math.comb(n, 2), math.comb(n, 3)

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

        dy2 = -2*n - 2*a[2] - 5*a[3] - 12*crows[:, 2]
        dy3 = n - 5*a[2] + 7*mc
        neg_pw3 = 4*a[2] + 2*a[3] + 2*mb + 2*brows[:, 2] + 5*brows[:, 3] + 2*mc + 2*crows[:, 2] + 5*crows[:, 3]
        dx3 = -2*n - 2*a[2] - 10*a[3] + mb - 5*brows[:, 2] + mc - 5*crows[:, 2]
        dx1 = -2*a[3] + 2*a[4] + 7*a[5] - 2*brows[:, 2] + brows[:, 3] + 7*brows[:, 4] - 2*crows[:, 2] + crows[:, 3] + 7*crows[:, 4]
        values = no_parent + dy2*mb2 + dy3*mb3 - neg_pw3*n2 + dx3*n3 + np.minimum(0, n*dx1)

        checks += int(values.size)
        negative += int(np.count_nonzero(values < 0))
        index = int(np.argmin(values))
        value = int(values[index])
        record = (value, *configurations[index], int(dx1[index]))
        stream.update(("|".join(map(str, a)) + ":" + "|".join(map(str, record)) + ";").encode())
        candidate = (value, tuple(a), configurations[index])
        if minimum is None or candidate < minimum:
            minimum = candidate
            q = configurations[index]
            witness = {"value": value, "A_jet_i0_through_i7": list(a), "mB": q[0], "mC": q[1], "B_mask_ranks2_through4": q[2], "C_mask_ranks2_through4": q[3], "K_PW2": int(dx1[index]), "PW2_payment": min(0, n*int(dx1[index]))}
    assert minimum is not None and witness is not None
    return {
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "oriented_feasible_order_pairs": len(configurations) // 64,
        "corner_pairs_per_order_pair": 64,
        "lower_checks": checks,
        "negative": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
        "sign_audit": sign_audit(n),
    }


def main() -> None:
    assert sha256(REDUCTION) == REDUCTION_SHA256
    reduction = json.loads(REDUCTION.read_text(encoding="utf-8"))
    assert reduction["ordinary_lower_sha256"] == "9F8FBE4708710EBFA95CC7D008A8A744627D6C240C4B1060391976F9EBD996B1"
    forests, enumeration = enumerate_forest_polynomials(13)
    orders = {}
    total_checks = 0
    global_minimum = None
    global_witness = None
    for n in range(9, 14):
        result = audit_order(n, forests[n])
        orders[str(n)] = result
        total_checks += result["lower_checks"]
        candidate = (result["minimum"], n)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = {"N": n, **result["minimum_witness"]}
        print(f"AUDITED n={n} jets={result['distinct_i0_through_i7_jets']} checks={result['lower_checks']} negative={result['negative']} min={result['minimum']}", flush=True)
    assert global_minimum is not None and global_witness is not None
    total_negative = sum(result["negative"] for result in orders.values())
    marker = MARKER if total_negative == 0 else "OBSTRUCTION_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_N9_13_RANK7_G5_FINISH"
    report = {
        "marker": marker,
        "status": "PASS exact finite ordinary-parent marked-spine subset lower" if total_negative == 0 else "exact obstruction to the finite coefficient-box lower",
        "theorem": "For every forest with adjacent marks u,v and ordinary deleted parent p adjacent to exactly u, G2>=0 for 9<=N=|G-{u,v}|<=13." if total_negative == 0 else None,
        "orientation": "B is the parent-containing row; both order orientations are checked.",
        "enumeration": enumeration,
        "orders": orders,
        "aggregate": {"lower_checks": total_checks, "negative": total_negative, "global_minimum": global_minimum[0], "global_minimum_witness": global_witness},
        "exact_lower": {
            "ordinary_subset_payment": "PA4, PA5, PW3 and PW4 use the pinned exact caps; PA3, PA6, PW5 and PW6 have audited nonnegative derivatives.",
            "PW2": "PW2=i1(X)=|X| with X subseteq A, hence 0<=PW2<=N and its contribution is at least min(0,N*K_PW2).",
            "endpoint_argument": "After adding min(0,N*K_PW2), the lower is separately concave in b2,b3,b4,c2,c3,c4. A separately concave function on a box attains a minimum at a vertex. Ranks5,6 retain nonpositive derivatives and take EDGELESS.",
            "row_corners": "All 8*8 PATH/EDGELESS choices at ranks2,3,4 are checked for every oriented feasible order pair.",
        },
        "pin": {"file": REDUCTION.name, "sha256": REDUCTION_SHA256},
        "scope_guard": "A negative value would obstruct only this safe relaxation, not exhibit a graph counterexample. This report covers only the marked-spine mode and N=9..13.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": marker, "lower_checks": total_checks, "negative": total_negative, "minimum": global_minimum[0]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
