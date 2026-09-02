#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent split 2+2 four attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_padding_H1_joint_floor_rank7_g5_finish import build_value as build_H1
from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT22_PADDING_RANK7_G5_FINISH"
BASE_PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_PADDING_RANK7_G5_FINISH"
H1_PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_22_PADDING_H1_JOINT_FLOOR_RANK7_G5_FINISH"
FILES = {
    "base_probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_rank7_g5_finish.py",
    "H1_probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_padding_H1_joint_floor_rank7_g5_finish.py",
    "H1_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_padding_H1_joint_floor_h4_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{index}_report": f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_padding_22_H{index}_h4_probe_rank7_g5_finish_20260831.json" for index in range(2, 9)},
}
EXPECTED = {
    "base_probe_source": "AED5B1BBFD412E72AE1FD2BE089208FB95FA6E5D4255759FC41CEDD7BE30829A",
    "H1_probe_source": "31BF106E9FB6093C53C4B9D68EEBE2C694231242C77EBBF0DD1709CCB1D6BA52",
    "H1_report": "B03AC8360C06CAA5510921F877BE64B74801B04284F2CDB6CE69EA4C336D3FDD",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H2_report": "F0747B709687EF7F0F8ADCE50590074900284070362056B6B74BE335884D2FAC",
    "H3_report": "EF1309F27BE41A916AC1DC5F8958274A97AAD292B8BCDB3E63774FF57DEB10A8",
    "H4_report": "B02BFEBBA3AB247BD4D698F019345FAD3FE3837B4721FFD12D87A19BEBE30FAC",
    "H5_report": "7E9E2016042D6404619FD7F4FE62C926A62F922F923C0C166C46035284C3A9C4",
    "H6_report": "5A434675B44FB499A0B08D50EF2E858116AF91AE963D22360D3D71F5165F6158",
    "H7_report": "26E702CDE6298211C803D92A275A5BEC5B7D6DB74D1A0F0F5C0052015176BEE4",
    "H8_report": "61688097E458CD727E57FC35D370756DF3048F97B408D688C9BCD1A98B00D84C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(value, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+4))))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail).all_coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == summary["degree_profile"]
    assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
    assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
    assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
    assert certificate["exact_power_inversion"] is True
    return certificate


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    h, _I, _JP, _JQ, coefficients, _distribution = padding_coefficients("2+2")
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        if index == 1:
            assert probe["marker"] == H1_PROBE_MARKER
            vh, variables, value, exact, lower, audit, retained = build_H1()
            local_audit = {"baseline": audit, "retained_joint_floor": str(retained)}
        else:
            assert probe["marker"] == BASE_PROBE_MARKER and probe["distribution"] == "2+2"
            vh, variables, value, exact, lower, audit = extension_value("2+2", index)
            local_audit = audit
        assert probe["newton_index"] == index and probe["threshold_h"] == 4
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        certificate = certify(value, variables, h, probe["summary"])
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local > 0
        minimum = local if minimum is None else min(minimum, local)
        controls += certificate["bernstein_coefficients"]
        scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {"threshold_h": 4, "safe_lower": str(lower), "audit": local_audit, **certificate}
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent split 2+2 exactly-four-attachment G3 is nonnegative.",
        "minimum_core_order": 4,
        "forest_edge_ceiling": "e<=h-4 because all four attachment roots lie in distinct components",
        "H1_joint_floor": "The positive rank2/rank3 bilinear block is retained using J2>=h+1 and J3>=(h^2-2h+8)/4; H2..H8 use the shared monomial-cap lower.",
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {"newton_coefficients": 8, "bernstein_controls": controls, "tail_power_coefficients": scalars, "minimum_large_safe_lower_coefficient": str(minimum), "exact_power_inversion": True, "exact_newton_recomposition": True},
        "coverage_gap_within_positive_order_split22_four_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Split 2+2 exactly-four-attachment isolate padding only; base positivity, 3+1, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_split22_four_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
