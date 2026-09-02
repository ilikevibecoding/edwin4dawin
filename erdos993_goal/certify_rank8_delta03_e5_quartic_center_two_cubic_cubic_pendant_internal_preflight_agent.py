#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_newton_reduction_agent.py": "5402FD69DAA3B4CE6A277E19B2B405E62D19F61079D7BB65EB7E080F0C4D3AF7",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json": "92634CE2FEEA49469AF3A0D292969E99D1D48D09F852B188D3C354F1F287B1C0",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_exact_agent_20260823.json": "0FCBABF9F2A14E06F8C5BCE7316F97F636E66FF32370BF844D1D607B903A83E1",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_independent_audit_agent_20260823.json": "F14CF20662843BD3CB7340019887600C21493C574537AA28109D761C5A511221",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_agent.rs": "BF9AE3FABC0501A49228DF9E5122BF79A842A82E633AFA09FA371A501920EF34",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_agent.exe": "9BE8822D1A55B292D38E9D7948B2F452FE18769A8DC9B5BB009D6E751547DE66",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_literal_i256_agent.rs": "94D2FC078A00390219B4FD70F5B0AF3A6E0A371050265C71480D0A068D64D6FC",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_literal_i256_agent.exe": "F02D29B03565E308E9831E6D6484BB8CD224B09B4F9AFE5F257BC4AE8039230D",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def run(name: str) -> list[str]:
    return subprocess.run(
        [str(ROOT / name), "smoke"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=180,
    ).stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    records = "SMOKE_RECORDS 116 381"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM D717D08100CF457F16991FE676EDF260AD60A381BF3C2B858C612DA8A8B2D037 6314F94455F3414E3846B47CD359E4B3FA817C39074E27E60926E3D4A012F72D"
    assert run("produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_i256_agent.exe") == [
        "PASS_E5_CUBIC_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert run("audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_literal_i256_agent.exe") == [
        "PASS_E5_CUBIC_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-pendant-internal-preflight-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_EXACT_ENGINES",
        "root_orbit": "quartic_center_two_cubic:cubic_pendant_internal",
        "counts": {
            "keys": 19_668_992,
            "all_short": 5_445_468,
            "eligible_finite": 4_768_380,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "rays": 14_223_524,
        },
        "sealed_order27": {"canonical": 379_665, "nonpositive": [0, 0, 0, 0]},
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [116, 381],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 431_474_100,
            "audit_literal_trees": 47_438_952,
            "unseen_checks": 56_894_096,
            "leaf_bytes": 607_740_928,
            "threads": 6,
            "ordered_tasks": 56,
        },
        "memory_gate_bytes": 805_306_368,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only; full primary and audit streams are required.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
