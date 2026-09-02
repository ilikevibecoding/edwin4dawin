#!/usr/bin/env python3
"""Large-order same-mark exactly-three mixed-isolated-root theorem."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_mixed_isolated_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_N11_RANK7_G5_FINISH"
PATTERNS = {1: 8, 2: 7}
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_mixed_isolated_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "derive_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "probe_source": "BFCAA60935D50786371702B62213CCC490979BE55239C95F482635403EA35605",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    (1, "low_excess"): "EABD71F17170CDF59F257A8E84C0EF54B0EF540C166195C9A592CBA4840B5BF6",
    (1, "high_excess"): "D21595E0BFDEEE1FD542A0C4E4C1646E35B8F70A6BC783C4CE24823E1075BB85",
    (2, "low_excess"): "0EDB39DE29AE2F9E7ABD28D0781316646CC338A4F6A101377D4DCB48AEFD0072",
    (2, "high_excess"): "1B2B7910B578E5BE82F19F24C65CBC4EDB7629CDCB7AE057B0A5298C3DCCB880",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(isolated_roots: int, chart: str) -> Path:
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_{isolated_roots}isolated_{chart}_n11_probe_rank7_g5_finish_20260831.json"


def certify(expression, variables, h, threshold, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
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
    for key, digest in REPORT_HASHES.items():
        assert sha256(report_path(*key)) == digest, key
    certificates, c_certificates, denominators, algebra = {}, {}, {}, {}
    for isolated_roots, threshold in PATTERNS.items():
        certificates[str(isolated_roots)] = {}
        c_certificates[str(isolated_roots)] = {}
        for chart in CHARTS:
            probe = json.loads(report_path(isolated_roots, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_RANK7_G5_FINISH"
            assert probe["isolated_roots"] == isolated_roots and probe["chart"] == chart
            assert probe["threshold_h"] == threshold and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(isolated_roots, chart)
            h, variables, expression, c_value = values[:4]
            certificates[str(isolated_roots)][chart], denominators[f"{isolated_roots}:{chart}:main"] = certify(expression, variables, h, threshold, probe["summary"])
            c_certificates[str(isolated_roots)][chart], denominators[f"{isolated_roots}:{chart}:c"] = certify(-c_value, variables[:5], h, threshold, probe["negative_c_summary"])
            algebra[isolated_roots] = values[4:]

    tail = sp.Symbol("tail", nonnegative=True)
    sign_audit = {}
    for isolated_roots, values in algebra.items():
        base, coefficients, b, c, lower, rank2_cap = values
        del base, c, lower
        h = next(symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol) == "h")
        A = {int(str(symbol)[1:]): symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol).startswith("A")}
        threshold = PATTERNS[isolated_roots]
        d4_ceiling = sp.expand(coefficients[4].subs({A[2]: (h-1)*(h-2)/2, A[3]: 0, A[4]: 0}))
        assert all(value < 0 for value in sp.Poly(d4_ceiling.subs(h, tail+threshold), tail).coeffs())
        assert sp.expand(coefficients[3].subs({A[2]: 0, A[3]: 0, A[4]: 0})).subs(h, threshold) < 0
        assert sp.factor(b-(coefficients[3]+coefficients[4]*(h-4)/3)) == 0
        for rank in (5, 6, 7):
            floor = sp.expand(coefficients[rank].subs({A[2]: (h-1)*(h-2)/2}))
            assert all(value > 0 for value in sp.Poly(floor.subs(h, tail+threshold), tail).coeffs())
        assert sp.expand(rank2_cap-((h-2) if isolated_roots == 2 else (2*h-5))) == 0
        sign_audit[str(isolated_roots)] = {"d4_strictly_negative": True, "b_strictly_negative": True, "positive_ranks_5_7": True, "rank2_cap": str(rank2_cap)}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For same-mark exactly-three adjacent no-parent attachments with exactly one or two isolated roots, isolate-free H after deleting those roots, surviving roots nonisolated in distinct components, and n>=11, G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 3, "distribution": "same_mark_3plus0", "isolated_root_counts": [1, 2], "orders": "n>=11", "condition": "H isolate-free; surviving roots nonisolated in distinct components"},
        "certificates": certificates,
        "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "sign_audit": sign_audit,
        "coverage_gap_within_stated_same_mark_mixed_isolated_isolatefree_H_branch": None,
        "universal_same_mark_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{isolated_roots}:{chart}": REPORT_HASHES[(isolated_roots, chart)] for isolated_roots in PATTERNS for chart in CHARTS},
        "scope": "Same-mark exactly three attachments with exactly one or two isolated roots and isolate-free remainder H, n>=11; arbitrary further isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "isolated_root_counts": list(PATTERNS), "charts": list(CHARTS), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
