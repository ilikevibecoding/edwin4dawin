#!/usr/bin/env python3
"""Freeze the exact coupled-moment sum>=2 g5 certificate from n=11 onward."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
import prove_iso_n7_bundle_g5_sumge2_coupled_moment_rank7_g5_finish as engine


HERE = Path(__file__).resolve().parent
ENGINE_SOURCE = HERE / "prove_iso_n7_bundle_g5_sumge2_coupled_moment_rank7_g5_finish.py"
ENGINE_OUTPUT = HERE / "iso_n7_bundle_g5_sumge2_coupled_moment_n11_engine_rank7_g5_finish_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_sumge2_coupled_moment_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_SUMGE2_COUPLED_MOMENT_N11_RANK7_G5_FINISH"
ENGINE_MARKER = "ENGINE_EXACT_ISO_N7_BUNDLE_G5_SUMGE2_COUPLED_MOMENT_N11_RANK7_G5_FINISH"
EXPECTED_ENGINE_SHA256 = "4AF39998E392702A15F3F79025B5B2F87D1F77A851B27CAF155BAD4E699D32FD"
THRESHOLD = 11


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(ENGINE_SOURCE) == EXPECTED_ENGINE_SHA256
    engine.THRESHOLD = THRESHOLD
    base.THRESHOLD = THRESHOLD
    engine.OUTPUT = ENGINE_OUTPUT
    engine.MARKER = ENGINE_MARKER
    engine.main()

    inner = json.loads(ENGINE_OUTPUT.read_text(encoding="utf-8"))
    shadow = inner["floor_summaries"]["shadow"]
    assert inner["threshold"] == THRESHOLD
    assert shadow["negative_tail_scalar_coefficients"] == 0
    report = {
        **inner,
        "marker": MARKER,
        "status": MARKER,
        "theorem": (
            "For every forest C of order n>=11 in no-parent mode, with "
            "nonadjacent marks having no common neighbor and total marked "
            "ordinary-neighbor count at least two, the exact rank-seven "
            "bundle coefficient g5 is nonnegative."
        ),
        "scope": (
            "Exact no-parent nonadjacent/common0/sum>=2 theorem for n>=11 only."
        ),
        "engine_source_sha256": EXPECTED_ENGINE_SHA256,
        "engine_report_sha256": sha256(ENGINE_OUTPUT),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    digest = hashlib.sha256(encoded.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "threshold": THRESHOLD,
        "negative_tail_scalar_coefficients": shadow["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": shadow["minimum_tail_scalar_coefficient"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", digest)
    print(MARKER)


if __name__ == "__main__":
    main()
