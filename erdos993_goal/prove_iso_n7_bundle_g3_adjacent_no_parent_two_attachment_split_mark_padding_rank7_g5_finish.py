#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent split-mark two attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_tiny_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{i}_report": f"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_H{i}_h{7 if i == 1 else 3 if i == 2 else 2}_probe_rank7_g5_finish_20260831.json" for i in range(1, 9)},
}
EXPECTED = {
    "probe_source": "015D5F73BC5B8F1509F0A6237B8BC6044819D3CBA4E86BBF37B34E5DC6E6C265",
    "tiny_source": "3F755D7CD33B8DB329BF9C407771223A6283C261E2D265336ADC1AFB67D8A146",
    "tiny_report": "84A6C6D544FAA78E0D11537A3FBFFA5C7B73B27D46BE37A49A505F80D62FEFF3",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "B32EBB5F89BB2D231E4AC0B146B81F3FCD7912A0E3334B2072C9E2340252DDE7",
    "H2_report": "CE4248612D280B1F5642D7D940BB142EED0CA0EF28AB8A342F7AD2CF2D6C1809",
    "H3_report": "F020563167A58C2D509C9FBB09CA4F4C77EBBE2FFD79249D10E905BCB4C1D78F",
    "H4_report": "500D67D4D6F1E38E257FD51C24A92372A58CC008C9A2CC6F72E27E012594B575",
    "H5_report": "3C853A6529DB5A5EAE640B0B86E6366C7D6190D54840D0C04CE96AFEF8F79983",
    "H6_report": "0437C8B64C26FBC03A03DDC8B16BB70C77A943B9A303EF51D03812E301F89948",
    "H7_report": "B229D089B199F3B0972541C9314C4C2D05E178DB1E2E06E4844E9B50970C76EE",
    "H8_report": "3F30C54173EB5D7AA25D54EE1F7C5BED825DEE0288A74F35FF555D91F276782F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    thresholds = {1: 7, 2: 3, **{i: 2 for i in range(3, 9)}}
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index and probe["threshold_h"] == thresholds[index]
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _I, _Jx, _Jy, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        threshold = thresholds[index]
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+threshold))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(v > 0 for v in sp.Poly(denominator, tail).all_coeffs())
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
        certificates[f"H{index}"] = {"threshold_h": threshold, "safe_lower": str(lower), "root_monomial_cap_audit": audit, **certificate}
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["coverage_gap_within_tiny_padding_audit"] is None and tiny["aggregate"]["negative_count"] == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent split-mark exactly-two-attachment G3 is nonnegative.",
        "bilinear_guard": "The exact Newton coefficients retain both rooted families and every bilinear term before the sign-safe monomial cap; no term is silently omitted.",
        "tiny_exact_audit": tiny["aggregate"],
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {"newton_coefficients": 8, "bernstein_controls": controls, "tail_power_coefficients": scalars, "minimum_large_safe_lower_coefficient": str(minimum), "exact_power_inversion": True, "exact_newton_recomposition": True},
        "coverage_gap_within_positive_order_split_mark_two_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Split-mark exactly-two-attachment isolate padding only; base positivity and >=3 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_split_mark_two_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
