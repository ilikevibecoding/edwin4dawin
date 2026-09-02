#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent same-mark five attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{index}_report": f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_H{index}_h5_probe_rank7_g5_finish_20260831.json" for index in range(1, 9)},
}
EXPECTED = {
    "probe_source": "F5B1675F79E7A5B5D34C4CFF3E0D27F7AA5F1B6F6BFA63D6D8DAFCF2A552C77C",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "03DEA8BC34FEFB52A191412421C20DB5D97F209BFD7F60881A02D502E709B16A",
    "H2_report": "4927C119F035739BED3E9ABEDBE265D7C5D000094C5487C0467D50B3DB33A6D2",
    "H3_report": "7A3BBB4DCA28D6E3424433FCF00D99EA936E712FFECBF1D3E24F629E241C87D2",
    "H4_report": "B6E22186A76F0F8A030FFDD478051C88109AB1BB93EA6933B9D0D265ED2569A0",
    "H5_report": "3E91F316CC0F13DC67272BE6289895514BD0644450A8EDDB6991F914D629A654",
    "H6_report": "EC7C802954C526D5E63BC068BEA0B1C932A82E9B163A83E34E4898C235055E33",
    "H7_report": "90799AF27B35725A799AC5EEC0A00D0CE8B54ACF45415648693DFF32920FC28A",
    "H8_report": "ABC94E30523DB18DED3516CBE84BBE5DD57E96B3D1A838F8417015CB26F3C142",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index and probe["threshold_h"] == 5
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _independent, _rooted_union, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+5))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(value > 0 for value in sp.Poly(denominator, tail).all_coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local > 0 and certificate["exact_power_inversion"] is True
        minimum = local if minimum is None else min(minimum, local)
        controls += certificate["bernstein_coefficients"]
        scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "threshold_h": 5,
            "safe_lower": str(lower),
            "union_root_cap_audit": audit,
            **certificate,
        }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent same-mark exactly-five-attachment G3 is nonnegative.",
        "minimum_core_order": 5,
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": controls,
            "tail_power_coefficients": scalars,
            "minimum_large_safe_lower_coefficient": str(minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_same_mark_five_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly-five-attachment isolate padding only; H0 base positivity and split distributions separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_same_mark_five_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
