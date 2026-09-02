#!/usr/bin/env python3
"""Assemble the all-rank simultaneous right gap0+gap1 theorem."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from probe_uniform_low_high_right_gap01_h2_field_root import direct_strong


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_slack_exact_root_20260827.json"
DEPENDENCIES = {
    "probe_uniform_low_high_right_gap01_normalized_lift_root.py":
        "446CD87FB6D5EA9D84B2927FEE6E198A677FE01E4EDF8852B242481A42441CC8",
    "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json":
        "5C4AE307561634F6E583FEE6F2C3FC4C1333465E09C6BAB39235C2B202DC8501",
    "probe_uniform_low_high_right_gap01_h2_field_root.py":
        "606EE39FED2325291825665C33CC947EB4CE0A70F7E68A771D8E0C35ED38C833",
    "uniform_low_high_right_gap01_h2_field_probe_root_20260827.json":
        "BD1C1159462C6731B8C37228DA7B376C8D365F8EE5A417D9CECD8B31F38D4F4C",
    "uniform_low_high_right_gap1_slack_exact_root_20260827.json":
        "AB958CE36ED840E4CA9A10B70979BAEA464113B1632D4BBA1E2E86FB881D0684",
    "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json":
        "598A179F63D5CB1354B79EDAB1469B57FEBD2E8A2571B28163FA29AC450E9088",
    "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json":
        "087A2A14F69F349E550F118F91AA24C1A7CAD32904ED82AF922C981E7DD9591D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual

    lift = json.loads(
        (HERE / "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    h2 = json.loads(
        (HERE / "uniform_low_high_right_gap01_h2_field_probe_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    gap1 = json.loads(
        (HERE / "uniform_low_high_right_gap1_slack_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    row_audit = json.loads(
        (HERE / "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    payment_audit = json.loads(
        (HERE / "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert lift["status"] == "PASS_EXACT_RIGHT_GAP01_UNIVERSAL_QUADRATIC_LIFT_IDENTITY"
    assert h2["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP01_H2_PAYMENT_CERTIFICATE"
    assert gap1["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_STRONG_BOUNDARY"
    assert row_audit["status"] == "PASS_INDEPENDENT_EXACT_RIGHT_GAP1_ROWS_TENSOR_INTERPOLATION_AUDIT"
    assert payment_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP1_PAYMENTS_SPARSE_AUDIT"

    checks = []
    for rank, x, y, gap0, gap1_slack in (
        (8, 0, 0, 1, 1), (8, 3, 11, 17, 29),
        (11, 1, 100, 7, 43), (15, 29, 2, 100, 5),
        (23, 7, 31, 3, 71),
    ):
        value = direct_strong(rank, x, y, gap0, gap1_slack)
        assert value > 0
        checks.append({
            "rank": rank, "x": x, "y": y,
            "right_gap0_slack": gap0,
            "right_gap1_slack": gap1_slack,
            "strong_auxiliary": str(value),
        })

    payload = {
        "schema": "uniform-low-high-right-gap01-slack-root-v1",
        "status": "PASS_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_STRONG_BOUNDARY",
        "theorem": (
            "For every integer k>=8 and real x,y,s,t>=0, with left ratios "
            "(x+k+1,x+k-1,x+k-2,...,x) and right ratios "
            "(y+k+1+s+t,y+k-1+s,y+k-2,...,y), the complete strong "
            "auxiliary (x+k-2)M(c)+B(c,v) is strictly positive."
        ),
        "proof_assembly": {
            "normalization": "q=t/(y+k+1+s)>=0",
            "quadratic_expansion": "H(q)=H0+q*H1+q^2*H2",
            "universal_identity": "H1=H0+H2 because the removed vector A has Q(A)=0",
            "factorization": "H(q)=(1+q)*H0+q*(1+q)*H2",
            "base_sign": "H0>0 by the independently audited all-rank right-gap1 theorem",
            "new_sign": "H2>0 by the canonical-field payment certificate",
        },
        "direct_exact_checks": checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes two simultaneous right-row gap coordinates on the "
            "translated low/high boundary.  Other coordinates and the full "
            "Erdos conjecture remain separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
