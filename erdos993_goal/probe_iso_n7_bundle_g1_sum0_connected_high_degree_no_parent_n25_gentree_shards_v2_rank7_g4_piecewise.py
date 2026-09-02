#!/usr/bin/env python3
"""Fast binary-stream replay probe for the exact order-25 G1 census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise as engine


HERE = Path(__file__).resolve().parent
V2_SOURCE = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
    "gentree_stream_v2_rank7_g4_piecewise.rs"
)
V2_BINARY = V2_SOURCE.with_suffix(".exe")
V1_REPORT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_"
    "gentree_shards_rank7_g4_piecewise_20260831.json"
)
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_"
    "gentree_shards_v2_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N25_GENTREE_SHARDS_V2_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    V2_SOURCE.name:
        "84CA389F1B79B56E2921838841FE99F1FB65BB9A10AFD5FB6133F26F537ECAD4",
    V2_BINARY.name:
        "7A0C891C6FC1BE85872686E72034D8B9FB3E6CD103B7D2FCD59C2079FD8626BE",
    "audit_iso_n7_bundle_g1_gentree_stream_v2_binary_rank7_g4_piecewise.py":
        "3893CFED799DDEBD7C0279CF955EA41C6981A4E1072649F815489AFA2070EB71",
    "iso_n7_bundle_g1_gentree_stream_v2_binary_independent_audit_exact_rank7_g4_piecewise_20260831.json":
        "6E4BC045AF5692AE201369FB92A40B9DEFBFF5A43841B562875449752FB277A2",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_rank7_g4_piecewise.py":
        "E8C9ADD4041101D52277AFD49A45310C10EC87574E0A23BB796AD8AA5F3E425F",
    V1_REPORT.name:
        "33A15D3881AAE60085909B89112404435102477B3AA8784F1279A248BA8C7C35",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    audit = json.loads((HERE / list(DEPENDENCIES)[3]).read_text(encoding="utf-8"))
    assert audit["status"] == "proved exact"
    assert audit["coverage_gap_within_binary_stream_audit_scope"] is None
    baseline = json.loads(V1_REPORT.read_text(encoding="utf-8"))
    assert baseline["order"] == 25
    assert baseline["totals"]["negative"] == 0

    engine.frozen.EVALUATOR_SOURCE = V2_SOURCE
    engine.frozen.EVALUATOR = V2_BINARY
    engine.ORDER = 25
    engine.OUTPUT = OUTPUT
    engine.MARKER = MARKER
    engine.EXPECTED_TOTAL = 104_636_890
    engine.__file__ = str(Path(__file__).resolve())
    engine.main()
    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert report["order"] == 25
    assert report["totals"] == baseline["totals"]
    assert report["global_minimum"]["minimum_value"] == baseline["global_minimum"]["minimum_value"]
    assert report["global_minimum"]["minimum_degrees"] == baseline["global_minimum"]["minimum_degrees"]
    assert report["global_minimum"]["minimum_row"] == baseline["global_minimum"]["minimum_row"]
    report["scope"] = (
        "Actual connected trees of order 25, common0/sum0 no-parent, "
        "maximum degree>=4, and at least three branching vertices."
    )
    report["v1_baseline_comparison"] = {
        "report_sha256": DEPENDENCIES[V1_REPORT.name],
        "identical_fields": [
            "free_trees", "eligible_trees", "negative", "crosschecks",
            "global_minimum_value", "global_minimum_degrees", "global_minimum_row",
        ],
    }
    report["parameterized_engine"] = {
        "engine_source": Path(engine.__spec__.origin).name,
        "evaluator_source": V2_SOURCE.name,
        "evaluator_source_sha256": DEPENDENCIES[V2_SOURCE.name],
        "parameters": {"order": 25, "shards": 4, "free_trees": 104_636_890},
    }
    report["wrapper_dependencies_sha256"] = DEPENDENCIES
    report["source_sha256"] = sha256(Path(__file__))
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print("FINAL_SOURCE_SHA256", report["source_sha256"])
    print("FINAL_REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
