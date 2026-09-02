#!/usr/bin/env python3
"""Independent literal-tree audit of one complete mixed Delta2/Delta3 orbit."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path

from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import (
    forward,
    literal_delta23,
)


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.exe"
COUNTS = {
    "outer_branch": 592_271,
    "middle_branch": 296_693,
    "outer_leaf": 1_184_543,
    "middle_leaf": 329_795,
    "outer_pendant_internal": 10_365_407,
    "middle_pendant_internal": 2_893_391,
    "spine_internal": 5_236_991,
}
EXPECTED = {
    "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.rs": "9CC9AE7EE9918E518C18FE51AA5502CF1F10B3786650E5402DE09F51146D92C8",
    "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.exe": "C17732570536D457C97DC4B81C32884870D0C171C006CB249B6365C95F282152",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
    "rank8_delta23_e3_cubic_mixed_newton_i256_root_independent_audit_20260823.json": "26E6F58421394D09F57BBD83841771D09A8D101AF24C4C1182943801A77444C0",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json": "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cell_audit(label: str, scan: dict) -> dict:
    witnesses = [
        scan["witness_base2"], scan["witness_base3"],
        scan["witness_first2"], scan["witness_first3"],
    ]
    assert all(witness == witnesses[0] for witness in witnesses)
    witness = witnesses[0]
    values, long_mask = witness["values"], witness["long_mask"]
    samples2, samples3 = [], []
    order0 = root0 = None
    for offset in range(31):
        d2, d3, order, root = literal_delta23(label, values, long_mask, offset)
        if offset == 0:
            order0, root0 = order, root
        samples2.append(d2)
        samples3.append(d3)
    n2, n3 = forward(samples2[:30]), forward(samples3[:30])
    assert n2[0] > 0 and n2[1] > 0 and all(value >= 0 for value in n2)
    assert n3[0] > 0 and n3[1] > 0 and all(value >= 0 for value in n3)
    assert sum(n2[k] * math.comb(30, k) for k in range(30)) == samples2[30]
    assert sum(n3[k] * math.comb(30, k) for k in range(30)) == samples3[30]
    assert n2[0] == int(scan["minimum_base2"])
    assert n3[0] == int(scan["minimum_base3"])
    assert n2[1] == int(scan["minimum_first2"])
    assert n3[1] == int(scan["minimum_first3"])
    return {
        "values": values,
        "long_mask": long_mask,
        "literal_order_S0": order0,
        "literal_root": root0,
        "base2": n2[0],
        "base3": n3[0],
        "first2": n2[1],
        "first3": n3[1],
        "delta2_newton_sha256": hashlib.sha256(json.dumps(n2).encode("ascii")).hexdigest().upper(),
        "delta3_newton_sha256": hashlib.sha256(json.dumps(n3).encode("ascii")).hexdigest().upper(),
        "unseen_S30_match": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, choices=tuple(COUNTS))
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    count = COUNTS[args.root]
    report_path = ROOT / f"rank8_delta23_e3_cubic_mixed_{args.root}_0_{count}_exact_root_20260823.json"
    report_hash = sha256(report_path)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_MIXED_NEWTON_CHUNK"
    assert report["scope"] == {
        "root_location_orbit": args.root,
        "start": 0,
        "stop": count,
        "processed": count,
        "full_orbit_universe": count,
    }
    acceptance = report["acceptance"]
    assert acceptance["Delta2_negative_or_failed_rays"] == 0
    assert acceptance["Delta3_negative_or_failed_rays"] == 0

    global_scan = {
        "witness_base2": acceptance["witness_base2"],
        "witness_base3": acceptance["witness_base3"],
        "witness_first2": acceptance["witness_first2"],
        "witness_first3": acceptance["witness_first3"],
        "minimum_base2": acceptance["minimum_Delta2_base"],
        "minimum_base3": acceptance["minimum_Delta3_base"],
        "minimum_first2": acceptance["minimum_Delta2_first_difference"],
        "minimum_first3": acceptance["minimum_Delta3_first_difference"],
    }
    # Global extrema need not share one cell, so replay each one independently.
    global_replays = []
    for metric in ("base2", "base3", "first2", "first3"):
        rank = metric[-1]
        prefix = "base" if metric.startswith("base") else "first"
        witness = global_scan[f"witness_{prefix}{rank}"]
        single = {
            "witness_base2": witness, "witness_base3": witness,
            "witness_first2": witness, "witness_first3": witness,
        }
        # Fill all four expected fields from one independent literal pass; only
        # the selected metric is compared with the global report below.
        values, long_mask = witness["values"], witness["long_mask"]
        s2, s3 = [], []
        for offset in range(31):
            d2, d3, _, _ = literal_delta23(args.root, values, long_mask, offset)
            s2.append(d2); s3.append(d3)
        n2, n3 = forward(s2[:30]), forward(s3[:30])
        assert all(value >= 0 for value in n2) and all(value >= 0 for value in n3)
        replayed = {"base2": n2[0], "base3": n3[0], "first2": n2[1], "first3": n3[1]}[metric]
        expected = int(global_scan[f"minimum_{metric}"])
        assert replayed == expected > 0
        assert sum(n2[k] * math.comb(30, k) for k in range(30)) == s2[30]
        assert sum(n3[k] * math.comb(30, k) for k in range(30)) == s3[30]
        global_replays.append({
            "metric": metric,
            "values": values,
            "long_mask": long_mask,
            "expected_and_replayed_value": expected,
            "unseen_S30_match": True,
        })

    spread_indices = sorted({0, count - 1, *(count * numerator // 6 for numerator in range(1, 6))})
    spread = []
    for index in spread_indices:
        completed = subprocess.run(
            [str(EXE), args.root, str(index), "1"],
            cwd=ROOT, check=True, capture_output=True, text=True,
        )
        assert not completed.stderr
        scan = json.loads(completed.stdout.strip().splitlines()[-1])
        assert scan["processed"] == 1 and scan["start"] == index and scan["stop"] == index + 1
        assert scan["universe"] == count and scan["negative2"] == scan["negative3"] == 0
        spread.append({"index": index, **cell_audit(args.root, scan)})
        print("PASS", args.root, index, flush=True)

    payload = {
        "schema": "rank8-delta23-e3-cubic-mixed-newton-chunk-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_MIXED_ORBIT_AUDIT",
        "root_location_orbit": args.root,
        "exhaustive_report": report_path.name,
        "exhaustive_report_sha256": report_hash,
        "coverage": {
            "exhaustive_rays": count,
            "global_extremal_literal_replays": len(global_replays),
            "spread_literal_replays": len(spread),
            "unseen_S30_checks": len(global_replays) + len(spread),
        },
        "global_extremal_replays": global_replays,
        "spread_replays": spread,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits one complete mixed root orbit only. Full cubic Delta2/Delta3 closure requires all seven mixed orbits plus finite, all-short, and all-long endpoints.",
    }
    output = ROOT / f"rank8_delta23_e3_cubic_mixed_{args.root}_independent_audit_root_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()
