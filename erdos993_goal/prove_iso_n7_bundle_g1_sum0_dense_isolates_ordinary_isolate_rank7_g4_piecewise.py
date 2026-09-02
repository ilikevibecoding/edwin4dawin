#!/usr/bin/env python3
"""Exact dense-isolate G1 theorem for deletion of an isolated ordinary parent."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    choose,
    efficient_certify_bernstein,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise import (
    rows_with_two_marks,
    substitute_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_ISOLATE_RANK7_G4_PIECEWISE"
THRESHOLD_N = 11
THRESHOLD_M = THRESHOLD_N-2
CORE_FRACTION = sp.Rational(1, 10)
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "dense_no_parent_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "dense_no_parent_report": "iso_n7_bundle_g1_sum0_dense_isolates_exact_rank7_g4_piecewise_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise.py",
    "endpoint_report": "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_rank7_g4_piecewise.py",
    "probe_report": "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "dense_no_parent_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "dense_no_parent_report": "683A7ACF848B0C415834C4C3382DC28883CE734230910AA4DE2D87FB80B724C7",
    "endpoint_source": "E86BDA463214959A97FD83D443B7B96721ACBDCD06412AD62916D6644BA481C1",
    "endpoint_report": "D698613BD1A3866D78F9E8532506682ABD1217603AB2500B6B2544F4724DE53D",
    "probe_source": "418E618DE28BA3F3DF00A5FC411A41E22343295A4F5D7155E08A4373CBCC9BF7",
    "probe_report": "C5794096C1CBC825311526539EB80C0C7A8A49BEE5C9BB9660AA6F4C982949F5",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolve(core, isolates, maximum=8):
    return {
        k: sp.expand(sum(choose(isolates, k-j)*core[j] for j in range(k+1)))
        for k in range(maximum+1)
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_ISOLATE_RANK7_G4_PIECEWISE"
    )
    assert probe["negative_tail_scalar_coefficients"] == 0
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m, tail, core_parameter = sp.symbols("m tail core_parameter", nonnegative=True)
    level_parameter = {
        k: sp.Symbol(f"level{k}_parameter", nonnegative=True)
        for k in range(2, 9)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    core = {
        0: sp.Integer(1), 1: h,
        **{
            k: h**k*level_parameter[k]/sp.factorial(k)
            for k in range(2, 9)
        },
    }
    W = convolve(core, isolates)
    W_deleted = convolve(core, isolates-1)
    assert all(
        sp.expand(W[k]-W_deleted[k]-W_deleted[k-1]) == 0
        for k in range(1, 9)
    )
    value = substitute_rows(
        generic, rows_with_two_marks(W), rows_with_two_marks(W_deleted)
    )
    shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
    variables = (core_parameter, *(level_parameter[k] for k in range(2, 9)))
    certificate = efficient_certify_bernstein(shifted, variables, tail=tail)
    assert certificate["degree_profile"] == probe["summary"]["degree_profile"]
    assert sp.Rational(certificate["minimum_tail_power_coefficient"]) > 0
    assert certificate["minimum_tail_power_coefficient"] == probe["summary"][
        "minimum_tail_scalar_coefficient"
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let C consist of two isolated marked vertices and W=H+rK1, with "
            "|H|<=|W|/10. If the ordinary deleted parent p is one of the r "
            "isolates, then rank-seven bundle G1 is nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive finite certificate"},
            {
                "orders": "n>=11",
                "condition": "W=H+rK1, |H|<=|W|/10, and p is isolated",
                "method": "literal reconstruction and exact rational Bernstein certificate",
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "certificate": certificate,
        "proof_facts": {
            "deletion_recurrence": "i_k(W)=i_k(W-p)+i_{k-1}(W-p)",
            "exact_convolution": "i_k(W)=sum_j C(r,k-j)i_j(H)",
            "universal_box": "0<=i_k(H)<=C(h,k)<=h^k/k! for k=2,...,8",
            "forest_use": "None in the large-order cone; H may be arbitrary.",
        },
        "exact_power_inversion": True,
        "coverage_gap_within_dense_isolate_ordinary_isolate_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1, common0/sum0, ordinary parent p isolated in W, "
            "with at least 90 percent isolated unmarked vertices. Ordinary "
            "parents in H and cores with a larger non-isolated fraction remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_dense_isolate_ordinary_isolate_G1": None,
        "degree_profile": certificate["degree_profile"],
        "bernstein_coefficients": certificate["bernstein_coefficients"],
        "minimum_tail_power_coefficient": certificate[
            "minimum_tail_power_coefficient"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
