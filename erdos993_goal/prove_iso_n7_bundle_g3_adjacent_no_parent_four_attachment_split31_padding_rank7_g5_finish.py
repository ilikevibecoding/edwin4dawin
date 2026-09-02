#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent split 3+1 four attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT31_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{index}_report": f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_31_H{index}_h4_probe_rank7_g5_finish_20260831.json" for index in range(1, 9)},
}
EXPECTED = {
    "probe_source": "AED5B1BBFD412E72AE1FD2BE089208FB95FA6E5D4255759FC41CEDD7BE30829A",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "5410E2261966E17800656AB0467853BCBEAB8411AB862BDA64E89FE9386F4B64",
    "H2_report": "658CCAFEDE510D43B2C7612ED1229B5BF61165269A62DB714F0C6CD1C9532DE2",
    "H3_report": "68E826D20A7236F0AC04F37B3647218865CE5D17B6B9ADA4A1466FFD059ADF95",
    "H4_report": "305337F101B8BF7F800572A594C1B3814B74BCC5BD2AD763153B7BEB06DDDEC8",
    "H5_report": "85203E47FB6606D4E816F0AFCEBC6529D3A3B587A1F5CF287AC82FAF4B59E87A",
    "H6_report": "E999FC51DD82C689E651F6B64B329F7D6DCE73D51E568E495EC677AE1B2954EE",
    "H7_report": "E8525F715D125A7401383ED7B683285F5135A961F3939241F26BBF6BDF6A5E34",
    "H8_report": "6F602EE121F10B82BF73AC99CB6E53DE5E034074AF24936F29E6A1603DEA592A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["distribution"] == "3+1"
        assert probe["newton_index"] == index and probe["threshold_h"] == 4
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe

    h, _I, _JP, _JQ, coefficients, _distribution = padding_coefficients("3+1")
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value("3+1", index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+4))))
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
            "threshold_h": 4,
            "safe_lower": str(lower),
            "root_monomial_cap_audit": audit,
            **certificate,
        }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent split 3+1 exactly-four-attachment G3 is nonnegative.",
        "minimum_core_order": 4,
        "forest_edge_ceiling": "e<=h-4 because all four attachment roots lie in distinct components",
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
        "coverage_gap_within_positive_order_split31_four_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Split 3+1 exactly-four-attachment isolate padding only; base positivity, 2+2, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_split31_four_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
