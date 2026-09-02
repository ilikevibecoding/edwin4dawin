#!/usr/bin/env python3
"""Run and seal the checked-i256 cubic-pendant literal audit."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXE = HERE / "audit_rank8_delta03_e4_bistar_cubic_pendant_internal_literal_i256_agent.exe"
PRIMARY = HERE / "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_bistar_cubic_pendant_internal_literal_i256_agent.rs": "D1B5000F6B60F84A5C4011D3526ACF4CCFDDBA04624215B0CAFBA4E31C247316",
    "audit_rank8_delta03_e4_bistar_cubic_pendant_internal_literal_i256_agent.exe": "5A6C99976E9C45AD1259BD680242CE5BAFE53CB09927B43A82D4DE902D30212B",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "scan_rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_agent.py": "4475AA47FED3FD9E443E01F3CFC2C27E68150AE20D0F8FE230A9ED8B4170DA83",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json": "0AEB790B1D0E681A6223B7B5E98560C7958460F0F1DB3FCD6CE3503BC890934A",
    "rank8_delta03_e4_bistar_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json": "E31938DEC4B76FB15029AA50CEC097EF83E1CD6755A5314EC1972AB2F817E18D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CUBIC_PENDANT_INTERNAL_N27_PLUS"
    started = time.perf_counter()
    completed = subprocess.run([str(EXE)], cwd=HERE, check=True, text=True, capture_output=True, timeout=1200)
    runtime = time.perf_counter() - started
    rows = {}
    status = None
    for line in completed.stdout.splitlines():
        if line == "PASS_LITERAL_I256_CUBIC_PENDANT_INTERNAL":
            status = line
        elif " " in line:
            key, value = line.split(" ", 1)
            rows[key] = value
    assert status == "PASS_LITERAL_I256_CUBIC_PENDANT_INTERNAL"
    assert rows["COUNTS"] == "98784 49392 164639 1 164640"
    assert rows["UNSEEN"] == "658560"
    assert rows["COEFFICIENT_STREAM"] == primary["coefficient_stream_sha256"]
    assert rows["FINITE_STREAM"] == primary["finite_value_stream_sha256"]
    assert not completed.stderr
    payload = {
        "schema": "rank8-delta03-e4-bistar-cubic-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_CUBIC_PENDANT_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine rebuilt every literal tree, deleted the pendant-internal root, independently recomputed the detached-tail forest, asserted literal/formula equality, and matched both primary streams.",
        "counts": {
            "all_short_total": 98784,
            "all_short_n27_plus": 49392,
            "mixed_rays": 164639,
            "all_long_rays": 1,
            "non_all_short_rays": 164640,
            "literal_trees_evaluated": 49392 + 30 * 164640,
            "unseen_S29_rank_checks": 658560,
        },
        "matching_coefficient_stream_sha256": rows["COEFFICIENT_STREAM"],
        "matching_finite_value_stream_sha256": rows["FINITE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "runtime_seconds": runtime,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_cubic_bistar:cubic_pendant_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_STREAM"], rows["FINITE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
