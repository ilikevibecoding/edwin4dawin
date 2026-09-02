#!/usr/bin/env python3
"""Compare two full connected n=8 census runs modulo live resource telemetry."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
RUN1 = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_exact_agent_20260831.json"
RUN2 = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_exact_agent_run2_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_replay_audit_root_20260831.json"
MARKER = "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_ROOT"
PINS = {
    RUN1.name: "7D471877BF239DABFA818EA4F8F846FAFBD59A4CA77FB697690B52B01B1574D2",
    RUN2.name: "A3D7A41243CC8282015C8584F4F6C8F9B94C16CF7035A821DB6E0A3D26F0BF38",
    "census_iso_n6_bundle_g1_leaf_deletion_connected_n8_agent.py":
        "31742B607F06EE45720035E477A2E8C8B20783C1AFFBD2C2BB256A08BB40CC52",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def theorem_projection(report: dict) -> dict:
    projection = dict(report)
    projection.pop("resource_guard")
    return projection


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"hash mismatch for {name}: {actual}")
    run1 = json.loads(RUN1.read_text(encoding="utf-8"))
    run2 = json.loads(RUN2.read_text(encoding="utf-8"))
    projection1 = theorem_projection(run1)
    projection2 = theorem_projection(run2)
    require(projection1 == projection2, "theorem payload changed between full runs")
    require(run1["ordered_stream_sha256"] ==
            "8531D22B739CBBBE1A1F34539C575FF324BE35B217186DF05C6284C7ACEE5AF2",
            "ordered value stream hash mismatch")
    require(run1["signs"] == {"positive": 542976}, "replayed signs are not all positive")
    require(run1["minimum"] == [108, 3, "Gp`?GC", 4, 7, 0, 3, 2, 122, 14],
            "replayed minimum mismatch")

    projection_bytes = (json.dumps(projection1, sort_keys=True, separators=(",", ":")) + "\n").encode()
    report = {
        "marker": MARKER,
        "full_run_report_sha256": [PINS[RUN1.name], PINS[RUN2.name]],
        "theorem_payload_identical": True,
        "dynamic_field_excluded": "resource_guard",
        "reason_full_report_hashes_differ": (
            "Each run records live physical-memory, commit, and disk headroom at launch."
        ),
        "theorem_projection_sha256": hashlib.sha256(projection_bytes).hexdigest().upper(),
        "ordered_stream_sha256": run1["ordered_stream_sha256"],
        "signs": run1["signs"],
        "minimum": run1["minimum"],
        "scope": run1["scope"],
        "scope_guard": (
            "This freezes a two-run replay of the connected order-8 bounded sublemma "
            "only.  It does not cover disconnected order 8, larger orders, or the "
            "universal rank-six g1 leaf theorem."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
