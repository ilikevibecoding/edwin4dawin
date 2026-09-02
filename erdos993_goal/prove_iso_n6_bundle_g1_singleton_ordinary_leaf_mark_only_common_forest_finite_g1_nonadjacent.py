#!/usr/bin/env python3
"""Fail-closed finite-core theorem for every mark-only forest component.

For both singleton-ordinary collision modes, the distinguished vertices span
an arbitrary labelled forest disjoint from an arbitrary unmarked common forest
K and h extra isolates.  This source exhausts every such labelled mark forest,
every unlabeled K through order thirteen, and every low-sibling tau Bernstein
row exactly.  It is only the finite N<=13 side of a future all-order assembly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_g1_nonadjacent import (
    edge_label,
    finite_probe,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_"
    "exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_MARK_ONLY_"
    "COMMON_FOREST_FINITE_N0_13_G1_NONADJACENT"
)


DEPENDENCIES = {
    "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent.py":
        "DEA01339260C835DB8707D5549A624E8B0A47EEE174A82620E2AF194DBBD8BA7",
    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_g1_nonadjacent.py":
        "F1153EB44B542126BE40320D96C19722CC2F4CCFD4F99EC7DA5EEDFACCD59E5F",
    "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py":
        "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015",
    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_finite_g1_nonadjacent.py":
        "6AEF4F8F1EABC1E898E6228ED21B6500E962B0D3B4943C9A8C9155DE2B63C29F",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
}


EXPECTED = {
    "collision": {
        "edgeless": "E50853546A694BA3EC28311F8C8BB2B2EBF942625807BEFA4BFCA680D9866FF8",
        "pu": "D11238D9A3B9849F749B19F369B1E6CC0419F081F0B91846C4D981907376DAA1",
        "pv": "D11238D9A3B9849F749B19F369B1E6CC0419F081F0B91846C4D981907376DAA1",
        "pu,pv": "577075AB478E51E5E83221332822DBD6AA589E91655BF4443963FF91AEA11D59",
    },
    "distinct": {
        "edgeless": "321BDF81EFA192AA29892B1F264744DFCB66410DCE8E3331090AC8ECAA42C2AC",
        "pq": "F5DA5BBAEF8478B710D694A1083C8A9E50D3FE022BD7805342334CF684CFCE9F",
        "pu": "F7FA78D2A71E692BEFDDB8CBEA9BEAADAAF19D7CFD0B117E33A49D232F513374",
        "pv": "F7FA78D2A71E692BEFDDB8CBEA9BEAADAAF19D7CFD0B117E33A49D232F513374",
        "qu": "DC6354B6216BF731310F02E5592C1D92916E27EE6ECCBB2D13D7148EA4E9C126",
        "qv": "DC6354B6216BF731310F02E5592C1D92916E27EE6ECCBB2D13D7148EA4E9C126",
        "pq,pu": "6F575359CCE11E48304903AEF208A5267F3B29D57573DFAD27166FBB4A7F04DF",
        "pq,pv": "6F575359CCE11E48304903AEF208A5267F3B29D57573DFAD27166FBB4A7F04DF",
        "pq,qu": "DA718283DC06508D37E7990D371F6D048705A2C38B6B1790675E1D5E34D6584D",
        "pq,qv": "DA718283DC06508D37E7990D371F6D048705A2C38B6B1790675E1D5E34D6584D",
        "pu,pv": "15AF51822F6A54BDFB936FD7697AE2117654A14E9331C4B67BCFCFC4C88C71A0",
        "pu,qu": "79672F73D5C941568828B0BC6AC1D274EFB3A0B694E82B8C8CE419EFC1965AF1",
        "pv,qv": "79672F73D5C941568828B0BC6AC1D274EFB3A0B694E82B8C8CE419EFC1965AF1",
        "pu,qv": "76F1DD349AA4091D74020B3B1541579086DA3DF2BA4F3EAD73C5ACE425B8A886",
        "pv,qu": "76F1DD349AA4091D74020B3B1541579086DA3DF2BA4F3EAD73C5ACE425B8A886",
        "qu,qv": "BE321B3FAC4B0747B5560CDABC9E071BA456668511AC4258D7F229C3294932C2",
        "pq,pu,pv": "42E64C6664A8171C290BC121E5E6F0E9F722C0C9A30612BCE6221637B474C91A",
        "pq,pv,qu": "BF02B56AABCD53B839048CA236CD89E01E854B8EF3969908BFAF4A46E441204F",
        "pq,pu,qv": "BF02B56AABCD53B839048CA236CD89E01E854B8EF3969908BFAF4A46E441204F",
        "pu,pv,qu": "7683E949DFFBC26E576DF477416C081713B74E5F2B0C95D66ECB7B2B469018C7",
        "pu,pv,qv": "7683E949DFFBC26E576DF477416C081713B74E5F2B0C95D66ECB7B2B469018C7",
        "pq,qu,qv": "D65BD7AE1236C3BEC674B73E9B5C8ECD3FA6771392B1D30E00946F366B7125AF",
        "pu,qu,qv": "B5CBE27526BE095455163C0787F5F19563DEFD1C0FACC43A9FD7B41E4D9D1E5C",
        "pv,qu,qv": "B5CBE27526BE095455163C0787F5F19563DEFD1C0FACC43A9FD7B41E4D9D1E5C",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    for filename, expected in DEPENDENCIES.items():
        assert sha256(HERE / filename) == expected, filename

    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    results = {}
    for mode, expected_rows in EXPECTED.items():
        raw = build_mode(mode, n, t)
        rows = {}
        for marks, edges in mark_forests(mode):
            label = edge_label(edges)
            result = finite_probe(mode, marks, edges, raw, n, N, h, t, base)
            assert result["tau_degree"] == 7
            assert result["rows"] == 64
            assert result["scale"] == 75600000000
            assert result["forests"] == 6607
            assert result["checks"] == 422848
            assert result["negative"] == 0
            assert result["stream_sha256"] == expected_rows[label], (mode, label)
            rows[label] = result
        assert set(rows) == set(expected_rows)
        assert len(rows) == (4 if mode == "collision" else 24)
        results[mode] = rows

    report = {
        "marker": MARKER,
        "theorem": (
            "For each collision/distinct singleton-ordinary mark-only forest component, "
            "every unmarked common forest K of order 0<=N<=13, every h>=0, and "
            "the full low-sibling interval 0<=10t<=11(N+h+marks), all exact leaf-delta "
            "Bernstein coefficients are nonnegative."
        ),
        "geometry": {
            "collision_labelled_mark_forests": 4,
            "distinct_labelled_mark_forests": 24,
            "protected_edge_forbidden": "uv",
            "mark_component_disjoint_from_K": True,
            "common_forest_orders_N": [0, 13],
            "extra_isolates_h": "all nonnegative integers",
        },
        "checks": {
            "labelled_mark_forest_lists_exhausted": True,
            "all_unlabeled_K_through_13_exhausted": True,
            "all_tau_and_h_coefficient_rows_nonnegative": True,
            "all_28_value_stream_hashes_locked": True,
        },
        "results": results,
        "remaining_obligation": (
            "N>=14 for mark-only components, all geometries where a distinguished mark "
            "shares a component with an unmarked core vertex, and the other rank-six G1 modes"
        ),
        "scope_guard": (
            "This is an exact finite-core boundary theorem only. It does not prove the "
            "all-order mark-only slice, universal rank-six G1, N6, or Erdos Problem 993."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
