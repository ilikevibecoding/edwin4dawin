#!/usr/bin/env python3
"""Per-pattern exact shard for same-mark five-attachment mixed isolated roots."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_n11_rank7_g5_finish import (
    EXPECTED,
    FILES,
    HERE,
    THRESHOLDS,
    build_value,
    certify,
    sha256,
)


PARENT_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_n11_rank7_g5_finish.py"
PARENT_SOURCE_SHA = "03EA02FC5C6C86FEE93E8F509F398203270B9DBD49DAD7D5DAEA11FAC8114BD3"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_SHARD_RANK7_G5_FINISH"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--isolated", type=int, choices=tuple(THRESHOLDS), required=True)
    args = parser.parse_args()
    isolated = args.isolated
    threshold = THRESHOLDS[isolated]
    assert sha256(PARENT_SOURCE) == PARENT_SOURCE_SHA
    for key in ("derive_source", "derive_report", "probe_source", "bernstein_source"):
        assert sha256(HERE / FILES[key]) == EXPECTED[key], key
    certificates = {}
    denominators = {}
    signs = {}
    dependency_hashes = {"parent_source": PARENT_SOURCE_SHA}
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        key = f"z{isolated}_{short}_report"
        assert sha256(HERE / FILES[key]) == EXPECTED[key], key
        dependency_hashes[key] = EXPECTED[key]
        probe = json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))
        assert probe["isolated_roots"] == isolated and probe["remaining_nonisolated_roots"] == 5-isolated
        assert probe["chart"] == chart and probe["threshold_h"] == threshold
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(isolated, chart)
        variables = values["variables"]
        certificates[chart], denominators[chart] = certify(
            values["value"], variables, values["h"], probe["summary"], threshold
        )
        sign_variables = (variables[0], variables[1], variables[2], *variables[-4:-2])
        b_certificate, _ = certify(
            -values["b_value"], sign_variables[:4], values["h"], probe["negative_b_summary"], threshold
        )
        c_certificate, _ = certify(
            -values["c_value"], sign_variables, values["h"], probe["negative_c_summary"], threshold
        )
        signs[chart] = {"minus_nested_b": b_certificate, "minus_nested_c": c_certificate}
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_z{isolated}_exact_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "isolated_roots": isolated,
        "remaining_nonisolated_roots": 5-isolated,
        "threshold_h": threshold,
        "threshold_n": threshold+isolated+2,
        "certificates": certificates,
        "positive_denominators": denominators,
        "nested_sign_certificates": signs,
        "coverage_gap_within_stated_pattern": None,
        "dependencies_sha256": dependency_hashes,
        "scope": f"Exactly-five same-mark adjacent no-parent G3 with exactly {isolated} isolated attachment roots and isolate-free H from h={threshold} onward.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "isolated_roots": isolated, "charts": list(certificates), "coverage_gap_within_stated_pattern": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
