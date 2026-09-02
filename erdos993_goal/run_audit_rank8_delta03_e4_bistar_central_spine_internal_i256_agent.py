#!/usr/bin/env python3
"""Run and seal the independent checked-i256 central-spine literal audit."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXE = HERE / "audit_rank8_delta03_e4_bistar_central_spine_internal_literal_i256_agent.exe"
PRIMARY = HERE / "rank8_delta03_e4_bistar_central_spine_internal_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_central_spine_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "audit_rank8_delta03_e4_bistar_central_spine_internal_literal_i256_agent.rs": "440AA98FC1E3E6ECB4F3FC6A1E2E1AE1B470D82603B669CA06AAB78B993E2F38",
    "audit_rank8_delta03_e4_bistar_central_spine_internal_literal_i256_agent.exe": "6EAB60A55361D93869ED30C35DD75C7F7F29940B8FE3DB00793227DDB3F30261",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "scan_rank8_delta03_e4_bistar_central_spine_internal_all_order_agent.py": "D2270CB51EBC9EC4F09563D4219D93361A047E42698CC40D92F50941E6458CC7",
    "rank8_delta03_e4_bistar_central_spine_internal_all_order_exact_agent_20260823.json": "AF622411169946C7C49D0D3A8AFE0388C80693F308EAC43AA64E563D24845B97",
    "rank8_delta03_e4_bistar_central_spine_internal_newton_reduction_exact_agent_20260823.json": "E32C0D5685317EBB702BCB9EFA65C7CEA543EB308D88DF1A3F1A60414EDAD0B9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CENTRAL_SPINE_INTERNAL_N27_PLUS"
    started = time.perf_counter()
    completed = subprocess.run([str(EXE)], cwd=HERE, check=True, text=True, capture_output=True, timeout=900)
    runtime = time.perf_counter() - started
    rows = {}
    status = None
    for line in completed.stdout.splitlines():
        if line == "PASS_LITERAL_I256_CENTRAL_SPINE_INTERNAL":
            status = line
        elif " " in line:
            key, value = line.split(" ", 1)
            rows[key] = value
    assert status == "PASS_LITERAL_I256_CENTRAL_SPINE_INTERNAL"
    assert rows["COUNTS"] == "57624 28812 92903 1 92904"
    assert rows["UNSEEN"] == "371616"
    assert rows["COEFFICIENT_STREAM"] == primary["coefficient_stream_sha256"]
    assert rows["FINITE_STREAM"] == primary["finite_value_stream_sha256"]
    assert not completed.stderr
    payload = {
        "schema": "rank8-delta03-e4-bistar-central-spine-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_CENTRAL_SPINE_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine rebuilt every literal tree, deleted the internal root, recomputed the resulting two-component forest, asserted literal/formula equality, replayed all Newton signs, and matched both primary streams exactly.",
        "counts": {
            "all_short_total": 57624,
            "all_short_n27_plus": 28812,
            "mixed_rays": 92903,
            "all_long_rays": 1,
            "non_all_short_rays": 92904,
            "literal_trees_evaluated": 28812 + 30 * 92904,
            "unseen_S29_rank_checks": 371616,
        },
        "matching_coefficient_stream_sha256": rows["COEFFICIENT_STREAM"],
        "matching_finite_value_stream_sha256": rows["FINITE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic with checked i128 independence-vector arithmetic",
        "sha256_self_tests": ["abc single block", "1000 one-byte incremental updates"],
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "runtime_seconds": runtime,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_cubic_bistar:central_spine_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_STREAM"], rows["FINITE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
