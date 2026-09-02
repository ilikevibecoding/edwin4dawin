#!/usr/bin/env python3
"""Fail-closed dense-isolate theorem for rank-seven G1 endpoint parents.

The two marked vertices are isolated in C and D is obtained by deleting either
marked endpoint.  Write the unmarked graph as W=H plus isolated vertices, with
|H|<=|W|/10.  Only 0<=i_k(H)<=h^k/k! is used, so H may be arbitrary.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    choose,
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ENDPOINT_RANK7_G4_PIECEWISE"
THRESHOLD_N = 11
THRESHOLD_M = THRESHOLD_N-2
CORE_FRACTION = sp.Rational(1, 10)
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "dense_no_parent_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "dense_no_parent_report": "iso_n7_bundle_g1_sum0_dense_isolates_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise.py",
    "probe_report": "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "dense_no_parent_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "dense_no_parent_report": "683A7ACF848B0C415834C4C3382DC28883CE734230910AA4DE2D87FB80B724C7",
    "probe_source": "F9E8F46A99B8CB0D1B4DF10BDA2E7A8539A870919A455E2A3713945CEF2870B6",
    "probe_report": "EBF3A6BF913A0B733B6CAD8B09FC38D0775BABA66452AF276082C18F65682E2C",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows_with_two_marks(W):
    def at(k):
        return W.get(k, sp.Integer(0))
    return {
        "E": {k: at(k)+2*at(k-1)+at(k-2) for k in range(9)},
        "U": {k: at(k)+at(k-1) for k in range(9)},
        "V": {k: at(k)+at(k-1) for k in range(9)},
        "W": {k: at(k) for k in range(9)},
    }


def rows_with_one_mark(W, missing):
    def at(k):
        return W.get(k, sp.Integer(0))
    with_mark = {k: at(k)+at(k-1) for k in range(9)}
    without = {k: at(k) for k in range(9)}
    if missing == "u":
        return {"E": with_mark, "U": with_mark, "V": without, "W": without}
    if missing == "v":
        return {"E": with_mark, "U": without, "V": with_mark, "W": without}
    raise AssertionError(missing)


def substitute_rows(expression, crows, drows):
    substitutions = {
        sp.Symbol(f"{prefix}{family}{rank}"): rows[family][rank]
        for prefix, rows in (("c", crows), ("d", drows))
        for family in "EUVW" for rank in range(9)
    }
    return sp.factor(expression.subs(substitutions, simultaneous=True))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ENDPOINT_RANK7_G4_PIECEWISE"
    )
    assert probe["negative_tail_scalar_coefficients"] == 0
    assert probe["core_fraction"] == "1/10"
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m = sp.Symbol("m", nonnegative=True)
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(9)}
    W[0] = sp.Integer(1)
    W[1] = m
    crows = rows_with_two_marks(W)
    reduced_u = substitute_rows(generic, crows, rows_with_one_mark(W, "u"))
    reduced_v = substitute_rows(generic, crows, rows_with_one_mark(W, "v"))
    assert sp.expand(reduced_u-reduced_v) == 0
    expected_reduced = (
        4*W[3]**2+20*W[3]*W[4]-30*W[3]*W[5]-90*W[3]*W[6]
        -51*W[3]*W[7]-8*W[3]*W[8]+50*W[4]**2+78*W[4]*W[5]
        -12*W[4]*W[6]-10*W[4]*W[7]+39*W[5]**2+10*W[5]*W[6]
    )
    assert sp.expand(reduced_u-expected_reduced) == 0

    tail, core_parameter = sp.symbols("tail core_parameter", nonnegative=True)
    level_parameter = {
        k: sp.Symbol(f"level{k}_parameter", nonnegative=True)
        for k in range(2, 9)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    core_rows = {
        0: sp.Integer(1), 1: h,
        **{
            k: h**k*level_parameter[k]/sp.factorial(k)
            for k in range(2, 9)
        },
    }
    rows = {
        k: sp.expand(sum(
            choose(isolates, k-j)*core_rows[j] for j in range(k+1)
        ))
        for k in range(3, 9)
    }
    value = sp.factor(reduced_u.subs({W[k]: rows[k] for k in range(3, 9)}))
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
            "Let C consist of two isolated marked vertices and W, and let D "
            "be obtained by deleting either marked endpoint. If at least nine "
            "tenths of W are isolated, then rank-seven bundle G1 is nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive finite certificate"},
            {
                "orders": "n>=11",
                "condition": "W=H+rK1 with |H|<=|W|/10",
                "method": "literal reconstruction and exact rational Bernstein certificate",
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "parent_modes": ["delete marked endpoint u", "delete marked endpoint v"],
        "endpoint_symmetry_checked": True,
        "certificate": certificate,
        "proof_facts": {
            "exact_convolution": "i_k(W)=sum_j C(r,k-j)i_j(H)",
            "universal_box": "0<=i_k(H)<=C(h,k)<=h^k/k! for k=2,...,8",
            "core_fraction": "h<=|W|/10",
            "forest_use": "None in the large-order cone; H may be arbitrary.",
        },
        "exact_power_inversion": True,
        "coverage_gap_within_dense_isolate_endpoint_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1, common0/sum0, endpoint-parent modes, with at least "
            "90 percent isolated unmarked vertices. Ordinary parents and cores "
            "with a larger non-isolated fraction remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_dense_isolate_endpoint_G1": None,
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
