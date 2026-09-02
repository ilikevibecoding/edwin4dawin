#!/usr/bin/env python3
"""Fail-closed preflight for five-cubic-T long-outer-pendant-internal engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_newton_reduction_agent.py": "943568E71E533F8B2180AF31AE48AE178330EC84295A41B715A98AE638575D32",
    "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_newton_reduction_exact_agent_20260824.json": "00B318CAD3D8604A95FACDA40C114283D5811201AC512504F4E5CC915C23B50B",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_agent.rs": "FB69524D1B99DB74D7E90F91E31F634B6BD91138E30B92E01C13F7F05BA47C66",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_agent.exe": "1E8A3959D76861FCEDEFCC9C584AAAD8BBA88BF9923B88A20888C14CAA9C0752",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_literal_i256_agent.rs": "BE16106A0B34FC3D927D4DB323C11444F1F587433E5C7C908115B778393F398F",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_literal_i256_agent.exe": "AC7F4C06B65EDDA108B98B638C60E359EDD2038E5790C04250FA1C283AB6FE37",
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
    records = "SMOKE_RECORDS 107 405"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 45ABC89B939DC22A179FE5EED46E5F59CDAD49C9956739AC516791B3481771D8 1DF7A9D23F00FD36D5BD3563747C91333DADFDF62833AFC4BF2DF61461256AEE"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records, gate, stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records, gate, stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-pendant-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_LONG_OUTER_PENDANT_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:long_outer_pendant_internal",
        "exact_workload": {
            "canonical_keys": 4_425_523_200,
            "all_short": 805_929_264,
            "order27": 775_131,
            "eligible_finite_n28_plus": 804_108_046,
            "mixed_rays": 3_619_593_935,
            "all_long_rays": 1,
            "total_rays": 3_619_593_936,
            "unseen_rank_checks_per_engine": 14_478_375_744,
            "independent_literal_trees": 11_662_889_854,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [107, 405],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 109_391_926_126,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The selected long-outer pendant is split at its internal root into a near gap with domain 0..7 and sentinel 7 plus a tail with domain 1..7 and sentinel 7; its sibling pendant remains ordered, while the two short-outer arms retain their unordered arm-pair quotient.",
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
