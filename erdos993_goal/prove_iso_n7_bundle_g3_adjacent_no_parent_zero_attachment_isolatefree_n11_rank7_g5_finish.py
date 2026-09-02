#!/usr/bin/env python3
"""Large-order zero-attachment adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_ISOLATEFREE_N11_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_intersected_tau_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "classifier_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "probe_source": "151E0C15F23B88E44E59515E9823F2AACB61514BA4A5AC22C1520B7FF1ECC409",
    "low_report": "71B8626A5B8C44288558A8032A9D2EA5CBBECCD56FF46CBE8F8EBC0EE71693EA",
    "high_report": "061CFA4ACBBCFC0FE20D0EC7B322CA5191CB6396BB4A48BE967EC4B3EF69C21A",
    "classifier_source": "755D99C5A7348990A3CE254C47BBAAF34D7EE9F9973644F97B36E8C608666AF5",
    "classifier_report": "01DA8DA65E252C5BFA46D17021775EE0A168526A6CF164A325D2B84C01005F74",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    tail = sp.Symbol("tail", nonnegative=True)
    certificates, denominators = {}, {}
    reduced = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_INTERSECTED_TAU_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, reduced = build_value(chart)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(m, tail+9))))
        assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probe["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        certificates[chart], denominators[chart] = certificate, str(sp.factor(denominator))
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "If u,v are adjacent, X=N_W(u)=empty, Y=N_W(v)=empty, W is isolate-free, and n>=11, then no-parent G3>=0.",
        "coverage": {
            "geometry": "adjacent", "mode": "no_parent", "attachments": "X=Y=empty",
            "orders": "n>=11", "unmarked_orders": "m>=9", "condition": "W isolate-free",
        },
        "reduced_expression": str(reduced),
        "moment_charts": {"certificates": certificates, "positive_denominators": denominators},
        "coarse_cone_guard": "The earlier W4 extension box failed and is not promoted; exact W4 plus the two tau-upper charts is used.",
        "coverage_gap_within_stated_zero_attachment_isolatefree_branch": None,
        "universal_adjacent_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Only adjacent no-parent X=Y=empty, isolate-free W, n>=11; padding, finite bases, and nonempty attachments remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "charts": list(certificates),
        "total_bernstein_controls": sum(v["bernstein_coefficients"] for v in certificates.values()),
        "coverage_gap_within_stated_zero_attachment_isolatefree_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
