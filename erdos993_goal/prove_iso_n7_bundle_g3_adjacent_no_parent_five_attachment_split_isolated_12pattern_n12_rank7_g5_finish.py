#!/usr/bin/env python3
"""Promote twelve completed split/isolated-root pattern pairs at n>=12.

This is intentionally a partial, dependency-pinned theorem.  It neither
asserts the eight unfinished classifier patterns nor unrelated-isolate
padding.  Each promoted pattern has both exhaustive forest-moment charts and
all nested shadow signs certified exactly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish import (
    CONFIG,
    MARKER as PROBE_MARKER,
    rank2_cap,
    safe_lower,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_12PATTERN_N12_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
PATTERNS = (
    "32_ix0_iy1",
    "32_ix0_iy2",
    "32_ix1_iy0",
    "32_ix2_iy0",
    "32_ix2_iy1",
    "32_ix2_iy2",
    "41_ix0_iy1",
    "41_ix1_iy0",
    "41_ix1_iy1",
    "41_ix2_iy0",
    "41_ix2_iy1",
    "41_ix4_iy1",
)
FILES = {
    "classifier_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish.py",
}
EXPECTED = {
    "classifier_source": "A4736C06D1E5C20EC0FF2ADF3F3D984C3A2026D456D55D8C2F44520763610BEB",
    "classifier_report": "237A3CBFAAB75947BB3DBABCA4B53C896552C76AB8B9BD991A7B92D99CAAFD27",
    "probe_source": "FB70065863699E1C941C53ADA69167C0C5312D90583CA721F543F69A26FF2D10",
}
REPORT_HASHES = {
    ("32_ix0_iy1", "low_excess"): "AD7C1507231E1279E737B2F15C165E5E16CEC13CD90679EE00C845C5FC0ED947",
    ("32_ix0_iy1", "high_excess"): "74BDC2C23FD0B2DEC5ADB8C00A32F4D423CFB7A6EB769153A0DC5159C6AF4BE9",
    ("32_ix0_iy2", "low_excess"): "CCE91BD2F22EF0DE91E213611A958E028A60AA175834422C56747A98094F51B6",
    ("32_ix0_iy2", "high_excess"): "AA3AE7D0096E3F6C7B8797AE5986A9D1B92FDC8DE3E46F6BBF52434E2948787E",
    ("32_ix1_iy0", "low_excess"): "4AA5104AB020B45431490AC143F99AA4164C903A803CCAC54EA74EEC9E0677C3",
    ("32_ix1_iy0", "high_excess"): "1FB1F2222460CEF0888A86C37881403A045FE2E0905639720FF0797F5BE077AD",
    ("32_ix2_iy0", "low_excess"): "1E18651037D6EF25F2B9AFCD0C4169308CB1187D68415A123A0327F5A211ACEB",
    ("32_ix2_iy0", "high_excess"): "F2E944E140DE546292D340C40BE0D9F2B2892D929B3E1B8CCAC514115F85784C",
    ("32_ix2_iy1", "low_excess"): "EE2391BED5554A8BB080FBF785710900AFF026E16F9E3901995C22991A3A49CC",
    ("32_ix2_iy1", "high_excess"): "0B674E098E768695BEA51F148044F53DBA3ED33A6018D7DB089A9A3396C8BD7D",
    ("32_ix2_iy2", "low_excess"): "15ABBB1C88229B3FE15EE1B0662ECCEAE59E1BAA02004D2386549A2FBB9253DF",
    ("32_ix2_iy2", "high_excess"): "D21A03FA64BBFB3C9F8716EDC33B60DED0D3B20BFFAE7CD597D8631FD25639B1",
    ("41_ix0_iy1", "low_excess"): "71E6EFB5261392D5BD3450E129EEB67FA80601028BA79CDD5A4DBAB6E47F8A1F",
    ("41_ix0_iy1", "high_excess"): "E82B0FF24F45C2699AC663188DA3E20B46F23A1A453B60A7CEC9627984323108",
    ("41_ix1_iy0", "low_excess"): "891F2BCD762262B198534FB36D19A736885874F37DC4A85B13451C8D83CFB939",
    ("41_ix1_iy0", "high_excess"): "71D6B5CB2F6E841CD70A5CA16A2FDC180BE98A876251A534A603E259872E5903",
    ("41_ix1_iy1", "low_excess"): "3AB3AF1C8C7ED4396C0FDBDC726C5FFA00BD12A450246192F8BF203E8AFA5AFE",
    ("41_ix1_iy1", "high_excess"): "8B7C7B0D12EE9A03053237BA2723C1A01DF7AB07A6947D1984CAC708328288E7",
    ("41_ix2_iy0", "low_excess"): "BF400A4CF4E78F535DA7BFC5ABF7583AF4033CF36377A9B405BE848946525075",
    ("41_ix2_iy0", "high_excess"): "E02129F2D5267F552217D15D248836178D0B35729CD144341A0EA536BB0537F8",
    ("41_ix2_iy1", "low_excess"): "BEBC8DB9A338EBC09CC3E8F3DA9BEF4B035C463D612B49813032F1CF45C63873",
    ("41_ix2_iy1", "high_excess"): "34687D5A0BB2DFC74F8EC8D5502E302548F8D340D821531C51A8B3486790E166",
    ("41_ix4_iy1", "low_excess"): "F7E64B9F2B0720753984B330F06AC8FCB8FB58A7E897A74A72BA3B0BFB3E2E21",
    ("41_ix4_iy1", "high_excess"): "39E2ED49C7BA71F8887B8E8C368748A610CA8712527E0CE8C25C001A3B21B36E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(config_key: str, chart: str) -> Path:
    threshold = CONFIG[config_key]["threshold_h"]
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_{config_key}_{chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"


def positive_polynomial(expression, variables) -> bool:
    return all(value >= 0 for value in sp.Poly(sp.expand(expression), *variables).coeffs())


def algebra_audit(config_key: str) -> dict:
    config = CONFIG[config_key]
    # The chart reports already pin the full moment substitutions.  The
    # promotion audit needs only the shared pre-substitution safe-lower
    # algebra, so avoid rebuilding the two large rational chart expressions.
    values = safe_lower(config_key)
    h, A = values["h"], values["A"]
    variables = (h, *(A[k] for k in range(2, 9)))
    assert sp.expand(values["exact"] - values["lower"]) == 0 if values["kind"] == "base" else True
    if values["kind"] == "base":
        return {"kind": "base", "exact_equals_safe_lower": True}

    derivative_families = (
        {values["family"]: values["effective_coefficients"]}
        if values["kind"] == "linear"
        else {"U": values["effective_du"], "V": values["effective_dv"]}
    )
    family_audit = {}
    for label, derivatives in derivative_families.items():
        assert all(value <= 0 for value in sp.Poly(derivatives[4], *variables).coeffs())
        for rank in (5, 6, 7):
            assert positive_polynomial(derivatives[rank], variables)
        family_audit[label] = {
            "rank4_safe_coefficient_nonpositive": True,
            "ranks5_through7_nonnegative": True,
        }
    for label, roots in (("U", config["U_roots"]), ("V", config["V_roots"])):
        if roots:
            assert values["rank2_caps"][label] == rank2_cap(h, roots)

    if values["kind"] == "bilinear":
        for (i, j), coefficient in values["bilinear"].items():
            if coefficient < 0:
                assert i == 2 or j == 2
            else:
                assert coefficient >= 0
        assert len(values["negative_absorption"]) == sum(
            1 for coefficient in values["bilinear"].values() if coefficient < 0
        )
    return {
        "kind": values["kind"],
        "family_signs": family_audit,
        "negative_bilinear_terms_absorbed_by_exact_rank2_caps": values["negative_absorption"],
        "remaining_bilinear_terms_nonnegative": values["kind"] != "bilinear" or all(
            coefficient >= 0 or i == 2 or j == 2
            for (i, j), coefficient in values["bilinear"].items()
        ),
    }


def validate_report(config_key: str, chart: str) -> dict:
    path = report_path(config_key, chart)
    assert sha256(path) == REPORT_HASHES[(config_key, chart)]
    report = json.loads(path.read_text(encoding="utf-8"))
    config = CONFIG[config_key]
    assert report["marker"] == PROBE_MARKER
    assert report["config"] == config_key and report["configuration"] == config
    assert report["chart"] == chart
    assert report["threshold_h"] == config["threshold_h"]
    assert report["threshold_n"] == 12
    assert report["classifier_sha256"] == EXPECTED["classifier_report"]
    assert report["summary"]["negative_tail_scalar_coefficients"] == 0
    assert report["summary"]["first_negative"] == []
    assert int(report["summary"]["minimum_tail_scalar_coefficient"]) > 0
    for summary in report["sign_summaries"].values():
        assert summary["negative_tail_scalar_coefficients"] == 0
        assert summary["first_negative"] == []
        assert int(summary["minimum_tail_scalar_coefficient"]) > 0
    return {
        "threshold_h": report["threshold_h"],
        "threshold_n": report["threshold_n"],
        "kind": report["kind"],
        "bernstein_controls": report["summary"]["bernstein_controls"],
        "tail_scalar_coefficients": report["summary"]["tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": report["summary"]["minimum_tail_scalar_coefficient"],
        "ordered_stream_sha256": report["summary"]["ordered_stream_sha256"],
        "nested_streams": {label: item["ordered_stream_sha256"] for label, item in sorted(report["sign_summaries"].items())},
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    assert set(PATTERNS) < set(CONFIG)
    certificates = {}
    audits = {}
    for config_key in PATTERNS:
        certificates[config_key] = {chart: validate_report(config_key, chart) for chart in CHARTS}
        audits[config_key] = algebra_audit(config_key)
    remaining = sorted(set(CONFIG) - set(PATTERNS))
    assert remaining == [
        "32_ix1_iy1", "32_ix1_iy2", "32_ix3_iy0", "32_ix3_iy1", "32_ix3_iy2",
        "41_ix3_iy0", "41_ix3_iy1", "41_ix4_iy0",
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "The twelve listed split exactly-five adjacent/no-parent G3 isolated-attachment-root patterns are nonnegative for isolate-free H from total order n=12 onward.",
        "promoted_patterns": {key: CONFIG[key] for key in PATTERNS},
        "chart_certificates": certificates,
        "safe_lower_audits": audits,
        "exact_chart_partition": ["low_excess", "high_excess"],
        "coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H": None,
        "unpromoted_classifier_patterns": remaining,
        "finite_seam": "Total order n<=11 is separate.",
        "unrelated_isolate_padding_guard": False,
        "universal_split_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {
            f"report:{config_key}:{chart}": REPORT_HASHES[(config_key, chart)]
            for config_key in PATTERNS for chart in CHARTS
        },
        "scope": "Exactly the twelve listed split five-attachment patterns, isolate-free H, n>=12; no unrelated-isolate padding, finite n<=11, other eight patterns, or >=6 attachments asserted.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "promoted_patterns": len(PATTERNS),
        "remaining_classifier_patterns": remaining,
        "coverage_gap_within_each_promoted_pattern": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
