#!/usr/bin/env python3
"""Run and seal one exact Delta2/Delta3 cubic mixed-boundary chunk."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.exe"
AUDIT_REPORT = ROOT / "rank8_delta23_e3_cubic_mixed_newton_i256_root_independent_audit_20260823.json"
EXPECTED = {
    "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.rs": "9CC9AE7EE9918E518C18FE51AA5502CF1F10B3786650E5402DE09F51146D92C8",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.exe": "C17732570536D457C97DC4B81C32884870D0C171C006CB249B6365C95F282152",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
    "rank8_delta23_e3_cubic_mixed_newton_i256_root_independent_audit_20260823.json": "26E6F58421394D09F57BBD83841771D09A8D101AF24C4C1182943801A77444C0",
}
UNIVERSE = {
    "outer_branch": 592_271,
    "middle_branch": 296_693,
    "outer_leaf": 1_184_543,
    "middle_leaf": 329_795,
    "outer_pendant_internal": 10_365_407,
    "middle_pendant_internal": 2_893_391,
    "spine_internal": 5_236_991,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, choices=tuple(UNIVERSE))
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    assert args.start >= 0
    limit = UNIVERSE[args.root] - args.start if args.limit is None else args.limit
    assert 0 < limit <= UNIVERSE[args.root] - args.start
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    route_audit = json.loads(AUDIT_REPORT.read_text(encoding="utf-8"))
    assert route_audit["status"] == "PASS_INDEPENDENT_LITERAL_TREE_DELTA23_I256_ROUTE_AUDIT"

    started = time.perf_counter()
    completed = subprocess.run(
        [str(EXE), args.root, str(args.start), str(limit)],
        cwd=ROOT, check=False, capture_output=True, text=True, timeout=14_400,
    )
    elapsed = time.perf_counter() - started
    assert completed.returncode == 0, completed.stderr
    assert not completed.stderr, completed.stderr
    lines = [line for line in completed.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    scan = json.loads(lines[0])
    assert scan["status"] == "PASS_EXACT_DELTA23_MIXED_NEWTON_I256_CHUNK"
    assert scan["root"] == args.root
    assert scan["start"] == args.start
    assert scan["stop"] == args.start + limit
    assert scan["processed"] == limit
    assert scan["universe"] == UNIVERSE[args.root]
    assert scan["negative2"] == scan["negative3"] == 0
    for key in ("minimum_base2", "minimum_base3", "minimum_first2", "minimum_first3"):
        assert int(scan[key]) > 0

    payload = {
        "schema": "rank8-delta23-e3-cubic-mixed-newton-i256-chunk-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_MIXED_NEWTON_CHUNK",
        "scope": {
            "root_location_orbit": args.root,
            "start": args.start,
            "stop": args.start + limit,
            "processed": limit,
            "full_orbit_universe": UNIVERSE[args.root],
        },
        "acceptance": {
            "Delta2_negative_or_failed_rays": scan["negative2"],
            "Delta3_negative_or_failed_rays": scan["negative3"],
            "minimum_Delta2_base": scan["minimum_base2"],
            "minimum_Delta3_base": scan["minimum_base3"],
            "minimum_Delta2_first_difference": scan["minimum_first2"],
            "minimum_Delta3_first_difference": scan["minimum_first3"],
            "zero_higher_newton_coefficients": scan["zero_higher"],
            "witness_base2": scan["witness_base2"],
            "witness_base3": scan["witness_base3"],
            "witness_first2": scan["witness_first2"],
            "witness_first3": scan["witness_first3"],
        },
        "exact_route": {
            "degree_bound": 29,
            "samples_per_ray": 30,
            "arithmetic": "checked i128 matching vectors plus checked signed i256 residuals and Newton differences",
            "independent_route_audit_sha256": EXPECTED[AUDIT_REPORT.name],
        },
        "runtime_seconds": elapsed,
        "scanner_runtime_seconds": scan["runtime_seconds"],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "A chunk closes only its stated quotient-ray interval. Full cubic Delta2/Delta3 closure requires no-gap assembly of all seven mixed orbits plus the all-short and all-long sectors and independent final audits.",
    }
    output = ROOT / (
        f"rank8_delta23_e3_cubic_mixed_{args.root}_{args.start}_{args.start + limit}_exact_root_20260823.json"
    )
    atomic_json(output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))
    print("SECONDS", f"{elapsed:.6f}")


if __name__ == "__main__":
    main()
