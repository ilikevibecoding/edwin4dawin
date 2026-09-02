#!/usr/bin/env python3
"""Narrow n>=27 theorem for cubic-pendant-internal roots only."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_n27_plus_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_exact_agent.py": "A9A23D8CB8287705E1AB7CD949EC7C8D0E09B28178F67F4B0765419530AB43FE",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_exact_agent_20260823.json": "F4DC4A27E9FB70587EEBB5A1E749C88A48C0C49D5351A325C3CC7241966662C1",
    "seal_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_independent_audit_agent.py": "BE855F5BFF5F4D31E21258D70A4C82E5C45E722DFA407C6188ED7FE1E8B7A521",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json": "EEBD43006EFBC1F71F5C26B9CF793521FE6A14BF175E21476A8FE07735C9C037",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text())


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    n27 = load("rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json")
    n27_audit = load("rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json")
    primary = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_exact_agent_20260823.json")
    audit = load("rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json")

    assert n27["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27["scope"]["core_order"] == 27
    assert n27["scope"]["all_rooted_pairs"] == 20278767420
    assert n27["acceptance"]["negative_counts"] == [0, 0, 0, 0]
    assert n27_audit["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert n27_audit["scope"] == n27["scope"]
    assert n27_audit["threaded_no_gap_coverage"]["adjacent_no_gap_no_overlap"] is True

    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_N28_PLUS"
    assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_N28_PLUS_AUDIT"
    assert primary["root_orbit"] == audit["root_orbit"] == "quartic_center_two_cubic:cubic_pendant_internal"
    assert audit["matching_coefficient_merkle_stream_sha256"] == primary["coefficient_merkle_stream_sha256"]
    assert audit["matching_finite_merkle_stream_sha256"] == primary["finite_merkle_stream_sha256"]
    assert primary["quotient_counts"] == {
        "all_short_total": 5445468,
        "all_short_n28_plus": 4768380,
        "mixed_rays": 14223523,
        "all_long_rays": 1,
        "non_all_short_rays": 14223524,
    }
    assert audit["counts"]["literal_trees_evaluated"] == 47438952
    assert audit["counts"]["unseen_S29_rank_checks"] == 56894096

    output = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-pendant-internal-n27-plus-exact-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_N27_PLUS",
        "theorem": "For a cubic-pendant-internal root in every subdivision of the quartic-center-two-cubic degree-surplus-e=5 suppressed skeleton and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:cubic_pendant_internal",
        "order_partition": [
            {"minimum": 27, "maximum": 27, "evidence": "independently audited exhaustive all-root finite census"},
            {"minimum": 28, "maximum": None, "evidence": "independently audited transfer/Newton all-order orbit census"},
        ],
        "order27_shared_evidence": {
            "all_rooted_pairs": 20278767420,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "n28_plus_evidence": {
            "eligible_finite": 4768380,
            "mixed_rays": 14223523,
            "all_long_rays": 1,
            "non_all_short_rays": 14223524,
            "unseen_S29_rank_checks_per_engine": 56894096,
            "independent_literal_trees": 47438952,
            "coefficient_merkle_stream_sha256": primary["coefficient_merkle_stream_sha256"],
            "finite_merkle_stream_sha256": primary["finite_merkle_stream_sha256"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This theorem credits exactly quartic_center_two_cubic:cubic_pendant_internal. With the sixteen previously sealed e=5 root orbits this makes 17/42 closed; the other 25 and all broader obligations remain separate.",
    }
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n")
    print(output["status"])
    print("SOURCE", output["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
