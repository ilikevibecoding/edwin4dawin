#!/usr/bin/env python3
"""Fail-closed preflight for five-cubic-T center-short-outer-spine engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_newton_reduction_agent.py": "72018CF74B10A828E9DB9E10EEC0C92C05234BE3AC4E923F6787C452118556BE",
    "rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_newton_reduction_exact_agent_20260824.json": "BEF9976006B698C6FC9F943F86FA6BDF270CD6F58407575237811922621259B6",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_i256_agent.rs": "B972EEEB2C13FFAE0571589733008D88B5016916FD559BA5336687B104E169D2",
    "produce_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_i256_agent.exe": "D40EE9B1FC96E4D675642FEA1F46C10015C1916C4DAB65325D198162DF86D64C",
    "audit_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_literal_i256_agent.rs": "DEB24785D879B1F785DB9BF92D014AC841F77AEC9E1658901D60222E899BE2A2",
    "audit_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_literal_i256_agent.exe": "94B38E9047629898B5B5DFA2254D766642C19109446060842A10E15E39F1E6E4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run(name: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / name), "smoke"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=300,
    )
    assert completed.stderr == ""
    return completed.stdout.strip().splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    records = "SMOKE_RECORDS 107 404"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 7050C231949710D0049515BB33A6D3810FFA4789BC26A6596A50D5963997B8E4 D404E14FEE2F9F4F7E61816C0C860DAA1ED936906457C85D11546CDBC9272F48"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records, gate, stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records, gate, stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-center-short-outer-spine-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_CENTER_SHORT_OUTER_SPINE_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:center_short_outer_spine_internal",
        "exact_workload": {
            "canonical_keys": 5_035_261_952,
            "all_short": 933_897_762,
            "order27": 954_004,
            "eligible_finite_n28_plus": 931_636_700,
            "mixed_rays": 4_101_364_189,
            "all_long_rays": 1,
            "total_rays": 4_101_364_190,
            "unseen_rank_checks_per_engine": 16_405_456_760,
            "independent_literal_trees": 13_235_729_270,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [107, 404],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 123_972_562_400,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The selected center-short-outer spine is split into ordered center-side and selected-outer-side gaps, each with domain 0..7 and sentinel 7; the selected short-outer pendant pair, the other short-outer arm, and the long-outer pendant pair retain separate quotients.",
        "memory_gate_bytes": 536_870_912,
        "independence": "Primary and audit are separately compiled and separately transcribed; the audit uses its own messages, adjacency builder, literal tree evaluation, and exact finite/coefficient stream replay.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only. Full primary and full independent audit are both required before this single orbit receives n>=28 credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
