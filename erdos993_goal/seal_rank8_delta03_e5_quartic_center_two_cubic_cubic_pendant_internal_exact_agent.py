#!/usr/bin/env python3
"""Fail-closed seal for the e=5 cubic-pendant-internal checked-i256 producer."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_newton_reduction_agent.py": "5402FD69DAA3B4CE6A277E19B2B405E62D19F61079D7BB65EB7E080F0C4D3AF7",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json": "92634CE2FEEA49469AF3A0D292969E99D1D48D09F852B188D3C354F1F287B1C0",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_preflight_agent.py": "D0A33886E80D5456187A9D7C1C5D94532A42527A5BED9B5C25E0ADE9BA1C2858",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_preflight_exact_agent_20260823.json": "D26B3AF74EC5D108F8843885486DBE20364E4283D602C5947683A1A98E3A6458",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_agent.rs": "BF9AE3FABC0501A49228DF9E5122BF79A842A82E633AFA09FA371A501920EF34",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_agent.exe": "9BE8822D1A55B292D38E9D7948B2F452FE18769A8DC9B5BB009D6E751547DE66",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_raw_agent_20260823.txt": "6C5C2E80A77F5DAA870B7F7AD5BCADFA662CF651774BFDFF732F01544A402959",
}
OBSERVED_RUNTIME_SECONDS = 696.533


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4768380 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_CHECKS"] == "217"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-pendant-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_N28_PLUS",
        "theorem": "For a cubic-pendant-internal root in every subdivision of the quartic-center-two-cubic e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:cubic_pendant_internal",
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
        "literal_formula_spot_checks": 217,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_center_two_cubic:cubic_pendant_internal for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
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
