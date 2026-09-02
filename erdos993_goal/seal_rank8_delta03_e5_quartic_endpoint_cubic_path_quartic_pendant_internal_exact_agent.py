#!/usr/bin/env python3
"""Fail-closed seal for the e=5 quartic-pendant-internal checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_newton_reduction_agent.py": "07413AA78C05CF0EBBD3B3762B015466866C68EA41BD0EA9C4B855E1BEEE3FA5",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json": "A3D3CA5B439995B4879DD3B58697821FB8F0604B8A1FB603DA570B8C6765064B",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_preflight_agent.py": "DA428074EBBB3C4EE854AFFE28995385D8DD4ABCA3A5802606D4D716DCA6B82D",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_preflight_exact_agent_20260823.json": "012DF1A77AF78634C2F00C34AF9B824372E5249B827FD86BECC5CCED04EA6206",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_agent.rs": "8E0211BA99C89710D771757E49440A0D9CAEC4F0B870F406890AA581FEFF52DB",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_agent.exe": "A76A077D20C8B311299BA6E7435BF1F678B5443C3BE44F1B88CE1C5D65891743",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_raw_agent_20260823.txt": "E733BA12915432B1307492E50354C8C350A2C1FA84816FBF8ACE3FB985F842E1",
}
OBSERVED_RUNTIME_SECONDS = 700.312
EXPECTED_LITERAL_CHECKS = 210


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert EXPECTED_LITERAL_CHECKS is not None
    assert 168 <= EXPECTED_LITERAL_CHECKS <= 224
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_PENDANT_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4768380 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_CHECKS"] == str(EXPECTED_LITERAL_CHECKS)
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-pendant-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_PENDANT_INTERNAL_N28_PLUS",
        "theorem": "For a quartic-pendant-internal root in every subdivision of the quartic-endpoint-cubic-path e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_pendant_internal",
        "quotient_counts": {
            "all_short_total": 5_445_468,
            "all_short_n28_plus": 4_768_380,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "non_all_short_rays": 14_223_524,
        },
        "rank_ray_samples": 1_649_928_784,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 56_894_096,
        "literal_formula_spot_checks": EXPECTED_LITERAL_CHECKS,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_endpoint_cubic_path:quartic_pendant_internal for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n28_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
