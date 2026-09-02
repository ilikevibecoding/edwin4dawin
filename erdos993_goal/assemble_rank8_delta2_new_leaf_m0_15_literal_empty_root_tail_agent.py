#!/usr/bin/env python3
"""Assemble the exact and independent Delta2 new-leaf endpoint tail for 0<=|F|<=15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta2_new_leaf_m0_15_literal_empty_root_tail_assembled_agent_20260824.json"
EXPECTED = {
    "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "6B533FFBCF504FFB3CAB5BF1B08FF6BB1BC70B8AB773DF3C4C0A4751C14BC2E1",
    "audit_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "A81909B99E0CD09B6F0BF698972E18F226C0C858DEA88A11BD5091B749467BEE",
    "prove_rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_agent.py": "9AFB3ECD684397B32B4DEE694E2F28B3CD7B768887EFA87877FE56E636F53D4A",
    "audit_rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_agent.py": "2A92F3B3602D53A85FDABFB4807A1E0BDC5E19F8BDBA68455A2E3575BE55F262",
    "prove_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent.py": "AA21F0AF4121715E64DA360C32AD995751943B05EBC032A576364C431400C68C",
    "audit_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent.py": "370968C96662FF32F2B193C4B0399B241099E9A867164EA1B851173BEDE8A31D",
    "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_exact_agent_20260823.json": "FA54677293ED1726E8092B3799808552D404BB71E98486C03170C5AF3B245CE1",
    "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_independent_audit_agent_20260823.json": "4CB7A151B49A5BE76CF043E39A5915E07BD0B1988D682811BEB61599258CC31B",
    "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_exact_agent_20260823.json": "2A0EA6145ACC420225B89AD4AF7025CDB87B45A1B30C3BA2AD2A403F02A0047E",
    "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_independent_audit_agent_20260823.json": "EA88DCFCBA2A338BB2DC618F09BC2A9AF04A1E8906AD66E043B68EB9CF8870CF",
    "rank8_delta2_new_leaf_m11_literal_empty_root_tail_exact_agent_20260823.json": "EF17AB91DF6C1CB63591FF646F6456605EAFD7B75B4763EED56ABAC3E67E8B12",
    "rank8_delta2_new_leaf_m11_literal_empty_root_tail_independent_audit_agent_20260823.json": "E129C3803AE00C2A9DB87C00F8B144E0362233A5FB415C5F0A84C503B48F036F",
    "rank8_delta2_new_leaf_m12_literal_empty_root_tail_exact_agent_20260823.json": "74E638AECCE2EC2BAE59C7FC18DA4DB53EAC7635CE8711500611365AC8308AA7",
    "rank8_delta2_new_leaf_m12_literal_empty_root_tail_independent_audit_agent_20260823.json": "7C5140A45992F4DB35086C7C27C69A17D854791499120001DBBB32EE33885C01",
    "rank8_delta2_new_leaf_m13_literal_empty_root_tail_exact_agent_20260823.json": "302FA3C791ECF69DBDCEC92F0E1DEFF39EDFBBD7146DDD4E86A9B5AE12CE86E7",
    "rank8_delta2_new_leaf_m13_literal_empty_root_tail_independent_audit_agent_20260823.json": "2EF9E80C67B7C2EDE66A0B07AFFA9F2030A158CB38293DEB97E1CF088D760299",
    "rank8_delta2_new_leaf_m14_literal_empty_root_tail_exact_agent_20260823.json": "747E0D432BDAB3846165C1EFC55FEEFCC212DD1E6FCB49454FF0ED576A2C6AAD",
    "rank8_delta2_new_leaf_m14_literal_empty_root_tail_independent_audit_agent_20260823.json": "78BC851DAAEFF24E7A69537C056F2DBD903CA3C2F9A050045B7C536B1C0620D8",
    "rank8_delta2_new_leaf_m15_literal_empty_root_tail_exact_agent_20260823.json": "943C55C596A0EB4A999FC929D9086A41FB90226D4E369A68C89F532D37F5ADD2",
    "rank8_delta2_new_leaf_m15_literal_empty_root_tail_independent_audit_agent_20260823.json": "5B4C08EA521319CA4F0DAB3E6F66204D887CE8A3EB18806F3281C258CEF94011",
}


SEGMENTS = (
    (tuple(range(0, 7)), "m0_6", "PASS_EXACT_DELTA2_NEW_LEAF_M0_6_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL", "PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M0_6_ALL_ORDER_TAIL"),
    (tuple(range(7, 11)), "m7_10", "PASS_EXACT_DELTA2_NEW_LEAF_M7_10_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL", "PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M7_10_ALL_ORDER_TAIL"),
    *(
        (
            (m,),
            f"m{m}",
            f"PASS_EXACT_DELTA2_NEW_LEAF_M{m}_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL",
            f"PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M{m}_ALL_ORDER_TAIL",
        )
        for m in range(11, 16)
    ),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def report_names(label: str) -> tuple[str, str]:
    prefix = f"rank8_delta2_new_leaf_{label}_literal_empty_root_tail"
    return (
        f"{prefix}_exact_agent_20260823.json",
        f"{prefix}_independent_audit_agent_20260823.json",
    )


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    rows = []
    covered: set[int] = set()
    totals = {
        "forest_types": 0,
        "quotient_cases": 0,
        "negative_values_at_minimum_order": 0,
        "negative_forward_differences": 0,
    }
    common_count_fields = tuple(totals)
    for orders, label, exact_status, audit_status in SEGMENTS:
        exact_name, audit_name = report_names(label)
        exact = load(exact_name)
        audit = load(audit_name)
        assert exact["status"] == exact_status
        assert audit["status"] == audit_status
        assert exact["scope"] == audit["scope"]
        assert exact["degree_in_empty_roots"] == audit["degree_in_empty_roots"] == 52
        assert exact["canonical_quotient_fingerprint_mod_2_256"] == audit["canonical_quotient_fingerprint_mod_2_256"]
        for field in common_count_fields:
            assert exact["counts"][field] == audit["counts"][field]
            totals[field] += exact["counts"][field]
        assert exact["counts"]["negative_values_at_minimum_order"] == 0
        assert exact["counts"]["negative_forward_differences"] == 0
        assert covered.isdisjoint(orders)
        covered.update(orders)
        rows.append(
            {
                "complement_orders": list(orders),
                "scope": exact["scope"],
                "forest_types": exact["counts"]["forest_types"],
                "quotient_cases": exact["counts"]["quotient_cases"],
                "exact_report_sha256": actual[exact_name],
                "independent_audit_report_sha256": actual[audit_name],
                "canonical_quotient_fingerprint_mod_2_256": exact["canonical_quotient_fingerprint_mod_2_256"],
            }
        )
    assert covered == set(range(16))
    assert totals["negative_values_at_minimum_order"] == 0
    assert totals["negative_forward_differences"] == 0
    payload = {
        "schema": "rank8-delta2-new-leaf-m0-15-literal-empty-root-tail-assembled-agent-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_DELTA2_NEW_LEAF_M0_15_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL",
        "scope": "Delta2 new-leaf Q7(C)-upper/Q6(D)-upper endpoint corner, source n>=27, 0<=|F|<=15",
        "coverage": {
            "minimum_complement_order": 0,
            "maximum_complement_order": 15,
            "no_gap_no_overlap": True,
            "segments": rows,
        },
        "aggregate_counts": totals,
        "degree_in_empty_roots": 52,
        "method": "Exact endpoint-polynomial forward-difference certificates with separately implemented nauty/geng literal audits for every complement-forest order 0 through 15.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This closes only the stated Delta2 new-leaf endpoint corner for 0<=|F|<=15. It does not cover |F|>=16, other endpoint masks, other ranks/root positions, the arbitrary-leaf induction, the full forest theorem, or Problem 993.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", totals["forest_types"], totals["quotient_cases"], "NEGATIVE 0")
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
