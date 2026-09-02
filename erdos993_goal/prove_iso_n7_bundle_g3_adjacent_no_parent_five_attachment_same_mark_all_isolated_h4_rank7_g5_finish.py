#!/usr/bin/env python3
"""All-order theorem for five same-mark isolated attachment roots."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_all_isolated_h4_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_ALL_ISOLATED_H4_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated5_low_excess_h4_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated5_high_excess_h4_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "201D903A576B4A93058E8117154A2B8BDCC3F0ACEDD673E9D606DF36A0E42BA7",
    "derive_report": "39A01A35A0C3E521608604F8F72BDC01293D5BDBA1B91E4E6B911F25451D86F7",
    "probe_source": "7C4068DED3B944FC6E716A6FAA47C15B4BE6A77F7343AA6ABD0220B10CAB19C3",
    "low_report": "07BCC659E3E1C641A31462B438E8DBD6E7270BB2F955ECDE36935505B9440CF9",
    "high_report": "D044A8037ECEDAC65F7B25D6A9563E2E188ADCEE958DEE4CD545D56926D8CA01",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+4))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == summary["degree_profile"]
    assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
    assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
    assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
    assert certificate["exact_power_inversion"] is True
    return certificate, str(sp.factor(denominator))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    certificates = {}
    denominators = {}
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["isolated_roots"] == 5 and probe["remaining_nonisolated_roots"] == 0
        assert probe["chart"] == chart and probe["threshold_h"] == 4
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(5, chart)
        certificates[chart], denominators[chart] = certify(
            values["value"], values["variables"], values["h"], probe["summary"]
        )
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For exactly five same-mark isolated attachment roots and isolate-free H of order h>=4, adjacent no-parent rank-seven G3 is nonnegative.",
        "coverage": {
            "isolated_attachment_roots": 5,
            "remaining_nonisolated_attachment_roots": 0,
            "base_H": "isolate-free, h>=4",
            "orders": "n=h+7>=11",
        },
        "certificates": certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_all_isolated_H_branch": None,
        "universal_same_mark_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly-five same-mark adjacent no-parent G3 with all five attachment roots isolated; unrelated isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
