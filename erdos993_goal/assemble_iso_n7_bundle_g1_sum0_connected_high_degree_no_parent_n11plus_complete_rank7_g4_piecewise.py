#!/usr/bin/env python3
"""Gapless all-order assembly of the residual connected high-degree G1 cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11plus_complete_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N11PLUS_COMPLETE_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_rank7_g4_piecewise.py":
        "18AB6138274C7DBA35F4C9454EF7C45F6B3ADC6EB2F4095BAC741F194B9C38F9",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_exact_rank7_g4_piecewise_20260831.json":
        "902A66F073D3FDC1E2F4C3F7FBC64F1945778CD2C029B22A25A025FCC2BDE8D4",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_rank7_g4_piecewise.py":
        "C8AEEB585B50E2A7FB1F2D8C0AEEACB20A345973B29D7AAE2109179F29BCB29A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_exact_rank7_g4_piecewise_20260831.json":
        "FC9E6DD4C64C57C06FE0C3FFFCCC25CF7C463D0740961A89E287FD7F75132E2B",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise.py":
        "10FEF70517F6CA46E1E7AB1534511FBFC396D466F96041D76E4E692F41D3E56B",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_exact_rank7_g4_piecewise_20260831.json":
        "3E812C9827389ABC54ED90144F977DD5D013F10644A16CAC034742155557FBBE",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_rank7_g4_piecewise.py":
        "46A456E71C85D1ECDAA5E3271E1B8FCB5BA9BAA76A3585CBF048F2349FF7DDD4",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_exact_rank7_g4_piecewise_20260831.json":
        "6C98B889D0A23B39FBA909CA55C325A379FF5EFF5A66DC2B4EC0DD17238FD4B5",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_rank7_g4_piecewise.py":
        "8F591FE6BABBBA2A458346C5BBF1C10E17CDCAFB08A7468E7A3A5FE90F93D5FD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_exact_rank7_g4_piecewise_20260831.json":
        "8CABC6621CDC3A5BA8CB86318DB740997A186F403798140FF5A26B9B3A84BA92",
    "assemble_iso_n7_bundle_g1_no_parent_n26_complete_rank7_g4_piecewise.py":
        "047EC9DAEBA8C6F1CBE5072FC33AD5B8EEA92CBB24CDA2E567BAB3E773D1B5CB",
    "iso_n7_bundle_g1_no_parent_n26_complete_exact_rank7_g4_piecewise_20260831.json":
        "6DA22678C1C15973F9E45EE33AD5A64DCBBA102422DD5F324A238F9BD7C40AA9",
    "assemble_iso_n7_bundle_g1_no_parent_n27_31_complete_rank7_g4_piecewise.py":
        "43FB6335F51BA241FF24BD1CD4F95E5CB7FA1AE14429A80CB178A9D784B90AD9",
    "iso_n7_bundle_g1_no_parent_n27_31_complete_exact_rank7_g4_piecewise_20260831.json":
        "5F9DF066CACE8B5655D8A197F7D4AC5CCA9E0EE850826F9FF2A9DE3096CABE03",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_rank7_g4_piecewise.py":
        "5ABAF915C509EAB5896528EBDCD75A8FD152454B660BA7DC1F0197ACE9D0ADBB",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_exact_rank7_g4_piecewise_20260831.json":
        "99CDEE5FB673ECFECD1C098D5DF9112049379385A4F4D96514C495B6E04571D7",
    "audit_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_root.py":
        "5C459956CA61E06A48E138D7A561DFC48732AA745A0E0D3A8B4278D9E5B9C2FC",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_independent_audit_exact_root_20260831.json":
        "A3E4F5EF1FD62FDC0B53C8D2B84F07637CDA005C297EC03EB3A5E4A62144FB0A",
}
REPORTS = [
    ("11..20", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n11_20_census_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n11_20_scope"),
    ("21..22", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n21_22_scope"),
    ("23", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n23_scope"),
    ("24", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n24_scope"),
    ("25", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n25_scope"),
    ("26", "iso_n7_bundle_g1_no_parent_n26_complete_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_n26_scope"),
    ("27..31", "iso_n7_bundle_g1_no_parent_n27_31_complete_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_orders_27_31_scope"),
    ("32+", "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_exact_rank7_g4_piecewise_20260831.json", "coverage_gap_within_stated_actual_tail_scope"),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    intervals = []
    for interval, name, gap_key in REPORTS:
        report = json.loads((HERE / name).read_text(encoding="utf-8"))
        assert report["status"] == "proved exact", name
        assert report[gap_key] is None, name
        intervals.append({
            "orders": interval,
            "marker": report["marker"],
            "coverage_gap": None,
        })
    audit = json.loads((
        HERE /
        "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32plus_"
        "independent_audit_exact_root_20260831.json"
    ).read_text(encoding="utf-8"))
    assert audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_"
        "DEGREE_NO_PARENT_N32PLUS_ROOT"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W of every order m>=11 with maximum "
            "degree at least four and at least three branching vertices, "
            "the exact rank-seven common0/sum0 no-parent coefficient G1 is "
            "nonnegative."
        ),
        "gapless_order_partition": intervals,
        "partition_check": (
            "11..20, 21..22, 23, 24, 25, 26, 27..31, and 32+ are "
            "pairwise disjoint consecutive intervals whose union is every "
            "integer order m>=11."
        ),
        "n32plus_independent_audit_marker": audit["marker"],
        "coverage_gap_within_stated_actual_n11plus_scope": None,
        "scope_guard": (
            "Rank-seven G1 only, actual connected trees, nonadjacent "
            "common0/sum0 no-parent only, maximum degree>=4, and at least "
            "three branching vertices. Other G1 geometries/parent modes and "
            "rank-seven G2/G3 remain separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": "all m>=11",
        "connected_high_degree_G1_cell": "proved exact",
        "coverage_gap_within_stated_actual_n11plus_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
