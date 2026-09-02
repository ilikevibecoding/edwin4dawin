#!/usr/bin/env python3
"""Run and seal the checked-i256 quartic-pendant literal audit."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXE = HERE / "audit_rank8_delta03_e4_bistar_quartic_pendant_internal_literal_i256_agent.exe"
PRIMARY = HERE / "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_bistar_quartic_pendant_internal_literal_i256_agent.rs": "73C8C9793A553993A9B9D723682224C822538A94D743534D0A67CA5C268344C7",
    "audit_rank8_delta03_e4_bistar_quartic_pendant_internal_literal_i256_agent.exe": "9AA7F64DA193D52A6A6FD933B54B47D693730219F390F856B94FE09E7282D948",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "scan_rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_agent.py": "C7781AF37884C125CCBE0486119F4D8CC9B45CF815DE033E628FE658365C39B0",
    "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_exact_agent_20260823.json": "3558718215333BD49C156333F98A693F1746E72CE6D725FBDC1E1E1C4F8F8DC4",
    "rank8_delta03_e4_bistar_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json": "D41486B9BD40844C2A3CBCA8E7F311407DB1689589BDAE5BC17F1FDBAC655AD2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_QUARTIC_PENDANT_INTERNAL_N27_PLUS"
    started = time.perf_counter()
    completed = subprocess.run([str(EXE)], cwd=HERE, check=True, text=True, capture_output=True, timeout=1500)
    runtime = time.perf_counter() - started
    rows = {}
    status = None
    for line in completed.stdout.splitlines():
        if line == "PASS_LITERAL_I256_QUARTIC_PENDANT_INTERNAL":
            status = line
        elif " " in line:
            key, value = line.split(" ", 1)
            rows[key] = value
    assert status == "PASS_LITERAL_I256_QUARTIC_PENDANT_INTERNAL"
    assert rows["COUNTS"] == "129654 64827 221577 1 221578"
    assert rows["UNSEEN"] == "886312"
    assert rows["COEFFICIENT_STREAM"] == primary["coefficient_stream_sha256"]
    assert rows["FINITE_STREAM"] == primary["finite_value_stream_sha256"]
    assert not completed.stderr
    payload = {
        "schema": "rank8-delta03-e4-bistar-quartic-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_QUARTIC_PENDANT_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine rebuilt every literal tree, deleted the quartic-pendant internal root, recomputed the detached-tail forest, asserted literal/formula equality, and matched both primary streams.",
        "counts": {
            "all_short_total": 129654,
            "all_short_n27_plus": 64827,
            "mixed_rays": 221577,
            "all_long_rays": 1,
            "non_all_short_rays": 221578,
            "literal_trees_evaluated": 64827 + 30 * 221578,
            "unseen_S29_rank_checks": 886312,
        },
        "matching_coefficient_stream_sha256": rows["COEFFICIENT_STREAM"],
        "matching_finite_value_stream_sha256": rows["FINITE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "runtime_seconds": runtime,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_cubic_bistar:quartic_pendant_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_STREAM"], rows["FINITE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
