#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T middle-branch producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_middle_branch_newton_reduction_agent.py": "0B16AA96DF711E2472A344DCFD58F72F90FDD11E00E421E05E4D643FB9BE4A5F",
    "rank8_delta03_e5_five_cubic_t_middle_branch_newton_reduction_exact_agent_20260823.json": "0181BED93E802DE77C5AED6CF0A3789D32701FA9FC4ED0CB9DAEE0B9E42DFD4D",
    "certify_rank8_delta03_e5_five_cubic_t_middle_branch_preflight_agent.py": "7E80FAF84F8CF6DDDEAD2B4B2015694EA476578A74C7E2BD1DB1AB9F481C8ED8",
    "rank8_delta03_e5_five_cubic_t_middle_branch_preflight_exact_agent_20260823.json": "AAB8648AADA15B89B3A2AC2C573942819E5DD37608F38B5FD7D3AB74E52B9E75",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_middle_branch_i256_agent.rs": "A794C56F0001CD99B09C251DD9924531DA6BAA31AB8ED2955C11180B959A386B",
    "produce_rank8_delta03_e5_five_cubic_t_middle_branch_i256_agent.exe": "AE570F27656CA2B595EA549A831C7752C9D4369016A940251250F9AC1518C4FB",
    "rank8_delta03_e5_five_cubic_t_middle_branch_i256_raw_agent_20260823.txt": "CF058252686A0D7AF51A70A4A7E42A5AF05A5DD3069E3BDC0FC116578033F967",
}
OBSERVED_RUNTIME_SECONDS = 10_869


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_MIDDLE_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "67160772 66375425 248948027 1 248948028"
    assert rows["UNSEEN"] == "995792112"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_N28_PLUS",
        "theorem": "For a middle-branch root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:middle_branch",
        "quotient_counts": {
            "all_short_total": 67_160_772,
            "all_short_n28_plus": 66_375_425,
            "mixed_rays": 248_948_027,
            "all_long_rays": 1,
            "non_all_short_rays": 248_948_028,
        },
        "rank_ray_samples": 28_877_971_248,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 995_792_112,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly five_cubic_t:middle_branch for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
