#!/usr/bin/env python3
"""Exact one-unrelated-isolate increment theorem for both split distributions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_rank7_g5_finish import (
    DISTRIBUTIONS,
    extension_value,
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_increment_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_PADDING_INCREMENT_RANK7_G5_FINISH"
FILES = {
    "identity_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "identity_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "41_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_41_H1_h5_probe_rank7_g5_finish_20260831.json",
    "32_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_32_H1_h5_probe_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "identity_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "identity_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "probe_source": "FD7BC77C7BCF8BEA937DEFBD89829A85102361736035BB2482863CB552B164D1",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "41_report": "E75DE0A25C359A081E798C9E2538B3BF48D8C52A7453F48CDF9280F9A27E822A",
    "32_report": "C24C4E8EB690905EE8B80221A64D5D44925C85F0563B9F91722DA06A02917461",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+5))))
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
    certificates, denominators, safe_lowers, cap_audits, exact_increments = {}, {}, {}, {}, {}
    for distribution in ("41", "32"):
        probe = json.loads((HERE / FILES[f"{distribution}_report"]).read_text(encoding="utf-8"))
        assert probe["distribution"] == distribution
        assert probe["newton_index"] == 1 and probe["threshold_h"] == 5
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["summary"]["first_negative"] == []
        assert int(probe["summary"]["minimum_tail_scalar_coefficient"]) > 0
        h, variables, value, exact, lower, audit = extension_value(distribution, 1)
        ph, _I, _R, _S, newton = padding_coefficients(distribution)
        assert ph == h and sp.expand(exact-newton[1]) == 0
        assert str(exact) == probe["exact_newton_coefficient"]
        assert str(lower) == probe["safe_lower"]
        assert audit == probe["root_cap_audit"]
        certificate, denominator = certify(value, variables, h, probe["summary"])
        assert sp.Rational(certificate["minimum_tail_power_coefficient"]) > 0
        certificates[distribution] = certificate
        denominators[distribution] = denominator
        safe_lowers[distribution] = str(lower)
        cap_audits[distribution] = audit
        exact_increments[distribution] = str(exact)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For either split distribution 4+1 or 3+2, adding one unrelated isolated vertex to any forest W of order h>=5 whose five attachment roots lie in distinct components cannot decrease adjacent/no-parent G3.",
        "operator_identity": "The first Newton coefficient is exactly G3(W plus one unrelated isolate)-G3(W).",
        "distributions": {key: {"X_roots": value[0], "Y_roots": value[1]} for key, value in DISTRIBUTIONS.items()},
        "safe_lower_logic": {
            "root_rows": "R_k and S_k count independent k-sets meeting their side's attachment-root union.",
            "caps": "R_k<=C(h,k)-C(h-b,k) and S_k<=C(h,k)-C(h-a,k).",
            "monomial_payment": "Every negative rooted monomial is paid at the product of its exact root-row caps; every nonnegative rooted monomial is dropped; root-free monomials are retained.",
            "forest_moment_domain": "0<=e<=h-5, 2e^2/h-e<=Omega<=e^2/2, followed by exact extension-incidence intervals for I4 through I8.",
        },
        "exact_increment_identities": exact_increments,
        "safe_lowers": safe_lowers,
        "root_cap_audits": cap_audits,
        "certificates": certificates,
        "positive_denominators": denominators,
        "inductive_corollary": "Repeatedly applying the theorem shows G3(W plus r unrelated isolates)>=G3(W) for every integer r>=0; the five roots remain in distinct components after every step.",
        "coverage_gap_within_split_unrelated_isolate_padding_operator": None,
        "base_value_guard": "The theorem propagates a separately proved unpadded base value; it does not prove H0.",
        "attachment_count_guard": "Exactly five attachment roots only; >=6 is separate.",
        "dependencies_sha256": EXPECTED,
        "scope": "Both split distributions, any isolated/nonisolated status of the five roots, any forest base h>=5 with roots in distinct components, arbitrary unrelated-isolate count by induction.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "distributions": sorted(certificates),
        "minimum_coefficients": {key: value["minimum_tail_power_coefficient"] for key, value in certificates.items()},
        "coverage_gap_within_padding_operator": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
