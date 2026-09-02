#!/usr/bin/env python3
"""Independent agreement gate for the two exact n=28, e=6 Delta2 censuses."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_REPORT = ROOT / "rank8_delta2_e6_n28_census_exact_root_20260826.json"
AUDIT_REPORT = ROOT / "rank8_delta2_e6_n28_census_independent_audit_root_20260826.json"
OUTPUT = ROOT / "rank8_delta2_e6_n28_census_agreement_gate_root_20260826.json"

PINNED_SHA256 = {
    "certify_rank8_delta2_e6_n28_census_root.rs": "5D52CC2BFBDD1D9BD3D781FD6C6E5435569D5EBD7967ECE183415B9CC6CF83BA",
    "certify_rank8_delta2_e6_n28_census_root.exe": "B1728E810C2B687E3E41749699C68DFFD0516EEF66D02640A4E6E47BD41E6D6F",
    PRIMARY_REPORT.name: "0DC9A209EDF14A70BACB3827B9A7A080347E0458AF024233C5095B880652FC0A",
    "audit_rank8_delta2_e6_n28_census_root.rs": "3BAF51E46356918EF81126C8A23317831B209FD78927F3F16165A536A5FC201E",
    "audit_rank8_delta2_e6_n28_census_root.exe": "81133338E612D38B9171B06624E3FC04D709AA1B5D3A364379EE1E1FBC4A388D",
    AUDIT_REPORT.name: "912CEB454A52E717605393A4A57ED5004ED8F9392E668FFAA03EF540ED80ADE6",
}

MATCH_FIELDS = (
    "index",
    "name",
    "raw_compositions",
    "canonical_trees",
    "rooted_evaluations",
    "minimum_delta2",
    "maximum_delta2",
    "sum_delta2",
    "delta2_stream_sha256",
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    observed_hashes = {}
    for name, expected in PINNED_SHA256.items():
        observed = sha256(ROOT / name)
        assert observed == expected, (name, expected, observed)
        observed_hashes[name] = observed

    primary = load(PRIMARY_REPORT)
    audit = load(AUDIT_REPORT)
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA2_E6_N28_ALL_ROOTED_TREES"
    assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_E6_N28_ALL_ROOTED_AUDIT"
    assert primary["source_sha256"] == PINNED_SHA256["certify_rank8_delta2_e6_n28_census_root.rs"]
    assert audit["source_sha256"] == PINNED_SHA256["audit_rank8_delta2_e6_n28_census_root.rs"]

    coverage_keys = {
        "raw_subdivision_vectors": "raw_subdivision_vectors",
        "canonical_trees": "canonical_subdivision_trees",
        "rooted_evaluations": "rooted_evaluations",
    }
    for audit_field, primary_field in coverage_keys.items():
        assert primary["coverage"][primary_field] == audit["coverage"][audit_field], audit_field
    assert primary["coverage"]["suppressed_skeletons"] == 10

    primary_skeletons = {item["index"]: item for item in primary["skeletons"]}
    audit_skeletons = {item["index"]: item for item in audit["skeletons"]}
    assert set(primary_skeletons) == set(range(1, 11)) == set(audit_skeletons)

    for index in range(1, 11):
        left = primary_skeletons[index]
        right = audit_skeletons[index]
        for field in MATCH_FIELDS:
            assert left[field] == right[field], (index, field, left[field], right[field])
        witness = left["minimum_witness"]
        assert witness["edge_lengths"] == right["minimum_edge_lengths"], index
        assert witness["root_vertex"] == right["minimum_root_vertex"], index
        assert int(left["minimum_delta2"]) > 0, index

    assert primary["global_minimum"] == audit["global_minimum"]
    assert int(primary["global_minimum"]["delta2"]) > 0

    totals = {
        "raw_subdivision_vectors": sum(item["raw_compositions"] for item in primary_skeletons.values()),
        "canonical_trees": sum(item["canonical_trees"] for item in primary_skeletons.values()),
        "rooted_evaluations": sum(item["rooted_evaluations"] for item in primary_skeletons.values()),
        "sum_delta2": str(sum(int(item["sum_delta2"]) for item in primary_skeletons.values())),
    }
    for field, primary_field in coverage_keys.items():
        assert totals[field] == primary["coverage"][primary_field], field
    assert totals["sum_delta2"] == primary["sum_delta2"]

    result = {
        "schema": "rank8-delta2-e6-n28-census-agreement-gate-root-v1",
        "status": "PASS_EXACT_INDEPENDENT_RANK8_DELTA2_E6_N28_CENSUS_AGREEMENT",
        "theorem": primary["theorem"],
        "agreement": {
            "suppressed_skeletons": 10,
            **totals,
            "matched_per_skeleton_fields": list(MATCH_FIELDS),
            "matched_minimum_witnesses": True,
            "matched_stream_sha256_digests": True,
        },
        "global_minimum": primary["global_minimum"],
        "pinned_sha256": observed_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This gate proves only the exact order-28 degree-surplus-six Delta2 layer; global assembly is separate.",
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print(
        "RAW",
        totals["raw_subdivision_vectors"],
        "CANONICAL",
        totals["canonical_trees"],
        "ROOTED",
        totals["rooted_evaluations"],
    )
    print("MINIMUM", primary["global_minimum"])
    print("SOURCE", result["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
