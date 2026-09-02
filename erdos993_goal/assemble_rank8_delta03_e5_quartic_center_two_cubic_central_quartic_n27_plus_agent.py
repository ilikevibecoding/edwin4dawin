#!/usr/bin/env python3
"""Narrow n>=27 theorem for the central-quartic e=5 root orbit only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "n27_plus_exact_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_exact_agent_20260823.json":
        "FD2EE225730754AA3C7D7D5C9590EAE819DBC5FD8454A53BFCBCFF2E740E5909",
    "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_independent_audit_agent_20260823.json":
        "2C914639CF876D2D0DD436A6088A79E417A14D94A894EFFAC1E6C683E84BE443",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_exact_agent_20260823.json":
        "61A13D8740D7C4D69AF77AF0DE3A64C37B41C55E77B2FEA96BBECF9C5C90D5E7",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_exact_agent.py":
        "C98884E52B2A28FDFDB7E12BA58143DD0B291665C17A406476B7EAB77F0D6D24",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_all_order_exact_agent_20260823.json":
        "AB9F6F6838701F43E013330833AEFC969850E4783C58708FF0D02DDD0A0E3258",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_independent_audit_agent.py":
        "DE908FCDB8C71003E4B0E3BE6F68E5C2297B13AFDF32378126EAC771CD6D63C0",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_all_order_independent_audit_agent_20260823.json":
        "FAEBB5EE9A2CF16A09921E895606434567A97AF35A1C907A77A772AF6CA7D80D",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    order27 = load(
        "rank8_delta03_e5_quartic_center_two_cubic_"
        "central_root_order27_exact_agent_20260823.json"
    )
    order27_audit = load(
        "rank8_delta03_e5_quartic_center_two_cubic_"
        "central_root_order27_independent_audit_agent_20260823.json"
    )
    all_order = load(
        "rank8_delta03_e5_quartic_center_two_cubic_"
        "central_quartic_all_order_exact_agent_20260823.json"
    )
    all_order_audit = load(
        "rank8_delta03_e5_quartic_center_two_cubic_"
        "central_quartic_all_order_independent_audit_agent_20260823.json"
    )

    assert order27["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_ROOT_ORDER27"
    )
    assert order27["order"] == 27
    assert order27["degree_surplus"] == 5
    assert order27["suppressed_skeleton"] == "quartic_center_two_cubic"
    assert order27["root_orbit"] == "central_quartic"
    assert order27["canonical_subdivisions"] == 46_685
    assert order27["literal_root_checks"] == 46_685
    assert order27["nonpositive"] == [0, 0, 0, 0]
    assert order27_audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_ROOT_ORDER27_AUDIT"
    )
    assert order27_audit["no_gap_enumeration"]["burnside_orbits"] == 46_685
    assert order27_audit["no_gap_enumeration"]["direct_canonical_representatives"] == 46_685
    assert order27_audit["exact_checks"]["literal_tree_checks"] == 46_685
    assert order27_audit["exact_checks"]["literal_deletion_forest_checks"] == 46_685
    assert order27_audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]

    assert all_order["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_QUARTIC_N28_PLUS"
    )
    assert all_order_audit["status"] == (
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
        "CENTRAL_QUARTIC_N28_PLUS_AUDIT"
    )
    assert all_order["root_orbit"] == (
        "quartic_center_two_cubic:central_quartic"
    )
    assert all_order_audit["root_orbit"] == all_order["root_orbit"]
    assert all_order_audit["matching_coefficient_merkle_stream_sha256"] == (
        all_order["coefficient_merkle_stream_sha256"]
    )
    assert all_order_audit["matching_finite_merkle_stream_sha256"] == (
        all_order["finite_merkle_stream_sha256"]
    )
    assert all_order["quotient_counts"] == {
        "all_short_total": 228_438,
        "all_short_n28_plus": 154_941,
        "mixed_rays": 477_161,
        "all_long_rays": 1,
        "non_all_short_rays": 477_162,
    }

    # These disjoint order bands have union exactly all integers n>=27.
    order_bands = [
        {"minimum": 27, "maximum": 27, "evidence": "exhaustive finite"},
        {"minimum": 28, "maximum": None, "evidence": "transfer/Newton all-order"},
    ]
    assert order_bands[0]["maximum"] + 1 == order_bands[1]["minimum"]

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-central-quartic-"
            "n27-plus-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_"
            "QUARTIC_CENTER_TWO_CUBIC_CENTRAL_QUARTIC_N27_PLUS"
        ),
        "theorem": (
            "For the central-quartic root in every subdivision of the "
            "quartic-center-two-cubic degree-surplus-e=5 suppressed skeleton "
            "and every order n>=27, Delta0, Delta1, Delta2, and Delta3 are "
            "strictly positive."
        ),
        "root_orbit": "quartic_center_two_cubic:central_quartic",
        "order_partition": order_bands,
        "order27_evidence": {
            "canonical_subdivisions": 46_685,
            "primary_literal_checks": 46_685,
            "independent_literal_tree_checks": 46_685,
            "independent_deletion_forest_checks": 46_685,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "eligible_finite": 154_941,
            "mixed_rays": 477_161,
            "all_long_rays": 1,
            "non_all_short_rays": 477_162,
            "unseen_S29_rank_checks_per_engine": 1_908_648,
            "independent_literal_trees": 1_586_427,
            "coefficient_merkle_stream_sha256": all_order[
                "coefficient_merkle_stream_sha256"
            ],
            "finite_merkle_stream_sha256": all_order[
                "finite_merkle_stream_sha256"
            ],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "This theorem credits exactly one of the 42 e=5 root-location "
            "orbits: quartic_center_two_cubic:central_quartic. The other 41 "
            "e=5 orbits, every e>=6 family, forests, and the full conjecture "
            "remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORDER27", payload["order27_evidence"]["canonical_subdivisions"])
    print("N28_FINITE", payload["n28_plus_evidence"]["eligible_finite"])
    print("N28_RAYS", payload["n28_plus_evidence"]["non_all_short_rays"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
