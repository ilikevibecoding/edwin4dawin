#!/usr/bin/env python3
"""Fail-closed preflight for five-cubic-T short-outer-pendant-internal engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_newton_reduction_agent.py": "3C143336E7AFAC92BCF2F663B6F3AC3ECECEDAC8EA2AF9B9053CB6D896DE950C",
    "rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_newton_reduction_exact_agent_20260824.json": "8F56A2299C0B67FA65F210A867205A6D92DFDA405E6191449070421DEBC7471D",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_i256_agent.rs": "7D058A6829C08AD07B4398723F0599DE27A08ED5E8251AF1A1D36AB0C9E0F68B",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_i256_agent.exe": "418A6F49CE326E88C43820D01D0EB6B11959A970D76FA67D9E2E37087F75B74A",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_literal_i256_agent.rs": "AEC3DFDB7FE847AD7025B99FC8983D4F071B7B6B878E1829603920F94B977113",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_literal_i256_agent.exe": "D4A79F2D1D5EB66A0D7557AADCBDB5CA76090CD5A8B5BC0921A18BA7702BF72D",
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
    records = "SMOKE_RECORDS 103 409"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 8E74144DF6BB986BC7BADCD4AF8BC3D6203C2910AB7D9F7FA0B5F3D9AA2E17AE DA817B955A53BC5FBEB1B2BDA5176E933A2AB1783A2755E3B8AEE3FDF2EADA4E"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records, gate, stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records, gate, stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-short-outer-pendant-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_SHORT_OUTER_PENDANT_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:short_outer_pendant_internal",
        "exact_workload": {
            "canonical_keys": 8_811_708_416,
            "all_short": 1_600_967_592,
            "order27": 1_513_615,
            "eligible_finite_n28_plus": 1_597_435_864,
            "mixed_rays": 7_210_740_823,
            "all_long_rays": 1,
            "total_rays": 7_210_740_824,
            "unseen_rank_checks_per_engine": 28_842_963_296,
            "independent_literal_trees": 23_229_658_336,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [103, 409],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 217_919_660_584,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The selected short-outer pendant is split at its internal root into a near gap with domain 0..7 and sentinel 7 plus a tail with domain 1..7 and sentinel 7; the same cubic vertex's other pendant remains ordered, while the other short-outer and long-outer pendant pairs remain separate unordered quotients.",
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
