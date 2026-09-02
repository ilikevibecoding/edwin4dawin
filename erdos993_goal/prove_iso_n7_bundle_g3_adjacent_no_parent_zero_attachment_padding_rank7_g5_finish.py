#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent no-parent zero attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{i}_report": f"iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_H{i}_h2_probe_rank7_g5_finish_20260831.json" for i in range(1, 9)},
}
EXPECTED = {
    "probe_source": "6B831945C910ADDFE8F58206A5C2B2840650F3460560A15EEDA87B632A6AB81E",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "54B162071056243B5894C1F7F674D53B582AF6CCC37C525C8EFDE7C32065DD1D",
    "H2_report": "AB138F29555BB8CD8CAA39BC208BD0A38C6E242E6169F5ED35D3FEA81AE21958",
    "H3_report": "55E7760D8F0A5A41D044DDFFB17DCF4C7654416E910BFAA17694BDFBAF8F600C",
    "H4_report": "4360AE11E44DCC201CE9958BA85BDF5027B8EF69F88983D3127AF5C63FFBD243",
    "H5_report": "A9F16C1CFC1CF99E53C04CC52547BC8C4DB50DBA0D5FAB8B2026F2D540FF465C",
    "H6_report": "2D1D6B466BDBBE4764A5EBBF4699ED5A6789F21708FDC93AF1EA72D1E98E8EBA",
    "H7_report": "3BC9D1843E8F752B6A30D957A6B1095FE9E2E881780F7E15382B231886FB5E48",
    "H8_report": "675DA9F22EAB9F80083A5ACF461858F567C29AAB31DF0577BE605458F33D3FDF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index
        assert probe["threshold_h"] == 2 and probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _I, coefficients = padding_coefficients()
    certificates = {}
    controls = scalars = 0
    minimum = None
    for index in range(1, 9):
        vh, variables, value, exact = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+2))))
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
        assert certificate["exact_power_inversion"] is True
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local > 0
        minimum = local if minimum is None else min(minimum, local)
        controls += certificate["bernstein_coefficients"]
        scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {"threshold_h": 2, "positive_denominator": str(sp.factor(denominator)), **certificate}
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "For every forest H on h>=2 vertices, every positive-order Newton coefficient of adjacent no-parent zero-attachment G3(H+sK1) is positive.",
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8, "bernstein_controls": controls,
            "tail_power_coefficients": scalars, "minimum_tail_power_coefficient": str(minimum),
            "exact_power_inversion": True, "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_zero_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Adjacent no-parent X=Y=empty isolate padding only; base positivity and nonempty attachments remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_zero_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
