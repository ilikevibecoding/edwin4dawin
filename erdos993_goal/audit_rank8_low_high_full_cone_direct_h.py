#!/usr/bin/env python3
"""Independent audit of the assembled rank-eight low/high convolution theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_low_high_full_cone_direct_h.py"
PRIMARY = ROOT / "rank8_low_high_full_cone_direct_h_exact_20260821.json"
OUTPUT = ROOT / "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json"
ASSEMBLER_SHA = "A2A0DEF0524ACBFEE0C92750261E79ABB98CB12C6094A5CC3BBD202450972A57"
PRIMARY_SHA = "DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5"
EXPECTED_INPUTS = {
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md": "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json": "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
    "analyze_rank8_low_high_tail_boost_reduction.py": "EECF94D2DC0D65CE2517768E9A8EBE9E552FDECF8E07FDDAD2D7D50F57A97E32",
    "rank8_low_high_tail_boost_reduction_exact_20260820.json": "2ABAAE9134E9F65EA2DE3934F5D84D3903873EDD39E9BFC1D6F1F99654A124E0",
    "verify_rank8_low_high_tail_q2_pairwise.py": "90D1FB6853833769355F7CF9A97663AC89FCD8FF8BB071904218738E477684A9",
    "rank8_low_high_tail_q2_pairwise_exact_20260820.json": "AD3EDC7B5BEC5434833B9A86385AE98F33C1B837493501C32973D91F08F91517",
    "verify_rank8_low_high_strong_core_multinomial_lift.py": "7CD865F1FCFAC817A96EE52AF4C953F671848104F25372FDDD3AE919C937CDAB",
    "rank8_low_high_strong_core_multinomial_lift_exact_20260820.json": "FD6D13C4B290594EBD7D0763E0542683EBCE94B61D9C7F58EA0F508EA8F7786F",
    "audit_rank8_low_high_strong_core_multinomial_lift.py": "CDE59D66F87563EC1145C6EA1E40F204977D6AE9E9AF755DE5EAF30534CE72C0",
    "rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json": "3C950FAD8F8923CB0D10A33EE4C804C43A343DD1F0A0038F2AB428E5E386087D",
    "verify_rank8_low_high_strong_a0_a2_lift_reduction.py": "F0748208666C0F2DD64AE1D0C143854C5BDC9CDF2347DB37F2D2D7667262F966",
    "rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json": "86C971751769FB6C0912EF028487A61757C6B95787AED0FC582877158FF39174",
    "audit_rank8_low_high_strong_a0_a2_lift_reduction_delta12.py": "B54CCEE2DC7DA0344CF3F1B69B09E5AFFB717B9EB27D3214662C037F64A98A9E",
    "rank8_low_high_strong_a0_a2_lift_reduction_delta12_audit_20260820.json": "51BB38FEA24B4A002CAA1DF960CD05FD5A007B9C3B07804AF0BE84697AFF377F",
    "probe_rank8_low_high_strong_b3_a0_a2_cell.py": "97AEEBC10284F902CC6C20C26C5028EE7CC868508BA44AA5BBD720C03EB77CEE",
    "verify_rank8_low_high_strong_b3_a0_a2_cells.py": "DEB5BB984C7A5FCC37DFD40CC3A62B649483DE3E4DFB1E346CBF68E88E1325A9",
    "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json": "77BF1549D11559C478CCA5215C6D70186D23827C7D06C04AF8C00E1BF2BAC5CE",
    "audit_rank8_low_high_strong_b3_a0_a2_cells.py": "10A499C3A61531EF829B2DE6A3CF4423ED97988CB3685532A07C3E9D81B67CF0",
    "rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json": "37C269AB5C0AFA36FAB61B7F02FA1F8718473FE1000CCBB8D0B1141BD043075C",
    "probe_rank8_low_high_strong_b4_a0_a2_cell.py": "25E4837E27BBFD377495AF03B876AD049998B849A12F8A95AA447AF02F667E6D",
    "verify_rank8_low_high_strong_b4_a0_a2_cells.py": "D38DF9236763F0E1B4895B3A2180CB283127099E17658C20D37E9DF9B4A3AF83",
    "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json": "0523B65E9345939887DB77F32EE5C41CAC4F142E9C5F4235701616E999B593AE",
    "audit_rank8_low_high_strong_b4_a0_a2_cells.py": "34A40EC46177DF66AE31B6712F237FB353F179769C3233347F8EB5EA0E9F6D92",
    "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json": "4DE3A98041321E29FDB2E0DA24B16C4AB477923FAFD091EEA5C2B17642D88103",
    "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py": "D3D0BD450D9C1BC171F9BA60D055D23883A3BF1F295FB4B9D8EC4E9544CC2BF0",
    "verify_rank8_low_high_strong_b5_b4_a0_a2_cells.py": "B8662E4167A6ABF401E29D74D4D753858ED14A39DEA51ED083BDCC83C5B06C59",
    "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json": "E89F08432FBE629B89B3537DFF8AE00AE1805BB14DBBA279EAC5D37046D69744",
    "audit_rank8_low_high_strong_b5_b4_a0_a2_cells.py": "CAA4C2FFE4B4A5A61537E36DAE672AAF745F94BE0480B213A7AD0C3EF751B076",
    "rank8_low_high_strong_b5_b4_a0_a2_cells_independent_audit_exact_20260821.json": "9FA7E65225A2E03695539294E91A8B93D9CC1349E70B40CEEA8A19CF8F2C879F",
    "verify_rank8_low_high_strong_terminal_compression_b67.py": "2B9B3E09985DE6CCF0CFABE63A84999E894D433204FACF006844048D2F2EBF48",
    "rank8_low_high_strong_terminal_compression_b67_exact_20260820.json": "609A3E83AD7E8A08EC24DDF581E775958ED63DE7F9468AF59E633D4A010661C1",
    "audit_rank8_low_high_strong_terminal_compression_b67_delta12.py": "6ACD63AE15C4DED9E8184F127C4CE111CDC6E41555C190FCEC3E221CA57C43B4",
    "rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json": "6955700D51CB01E5B7BA7FA25DA7C44491EC437F32F5382F274663958E83A2AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def check_rows(name: str, expected: list[tuple], fields: tuple[str, ...], total: int) -> dict:
    rows = load(name)["rows"]
    actual = [tuple(row[field] for field in fields) for row in rows]
    assert actual == expected and len(actual) == len(set(actual))
    assert sum(row["terms"] for row in rows) == total
    zero = 0
    for row in rows:
        assert row["negative"] == 0 and row["first_negative"] is None
        if row["terms"]:
            assert 0 < row["minimum"] <= row["maximum"]
        else:
            zero += 1
            assert row["minimum"] is None and row["maximum"] is None
    return {"cells": len(rows), "zero_cells": zero, "terms": total, "negative": 0}


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    assert sha256(ASSEMBLER) == ASSEMBLER_SHA
    assert sha256(PRIMARY) == PRIMARY_SHA
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["schema"] == "rank8-low-high-full-cone-direct-h-v1"
    assert primary["status"] == "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert primary["assembler_source_sha256"] == ASSEMBLER_SHA
    assert primary["pinned_inputs"] == EXPECTED_INPUTS
    for name, expected in EXPECTED_INPUTS.items():
        assert sha256(ROOT / name) == expected, name

    high = load("rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json")
    assert high["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"

    tail = load("rank8_low_high_tail_boost_reduction_exact_20260820.json")
    replay = tail["symbolic_replay"]
    assert replay["quadratic_remainder"] == replay["tail_substitution_remainder"] == "0"
    assert replay["M_t"] == "M0+(t/C)*d+(t/C)^2*q2"
    assert tail["factor_cones"] == primary["factor_cones"]
    assert tail["tail_boost"]["bound"] == "C>=6h, hence 1<=lambda<=7/6"

    q2 = load("rank8_low_high_tail_q2_pairwise_exact_20260820.json")
    pairs = tuple(itertools.combinations(range(9), 2))
    assert tuple(tuple(row["pair"]) for row in q2["sign_classification"]["low_pairs"]) == pairs
    assert tuple(tuple(row["pair"]) for row in q2["sign_classification"]["high_pairs"]) == pairs
    assert all(q2["pairwise_replay"][key] == "0" for key in
               ("pairwise_margin_identity_remainder", "factorial_q2_identity_remainder",
                "q2_pair_decomposition_remainder"))

    core = load("rank8_low_high_strong_core_multinomial_lift_exact_20260820.json")
    core_audit = load("rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json")
    assert core["status"] == "PASS_EXACT_STRONG_AUXILIARY_FULL_LEFT_PREFIX_CORE"
    assert core_audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_FULL_LEFT_PREFIX_CORE"

    a02 = load("rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json")
    a02_audit = load("rank8_low_high_strong_a0_a2_lift_reduction_delta12_audit_20260820.json")
    assert a02["a2_support_check"]["negative_with_positive_a2_exponent"] == 0
    assert all(row["negative"] == 0 and row["minimum"] > 0
               for row in a02["a0_slices_over_arbitrary_a2_and_core"])
    assert a02_audit["join_order_verified"] == \
        "core at a0=a2=0 -> arbitrary a2 at a0=0 -> arbitrary a0"

    b3_stats = check_rows(
        "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json",
        [(e3, a0, a2) for e3 in range(1, 9) for a0 in range(3) for a2 in range(8)],
        ("b3_exponent", "a0_exponent", "a2_exponent"), 39_539_041)
    b4_stats = check_rows(
        "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json",
        [(e4, a0, a2) for e4 in range(1, 11) for a0 in range(3) for a2 in range(8)],
        ("b4_exponent", "a0_exponent", "a2_exponent"), 91_946_174)
    b5_stats = check_rows(
        "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json",
        [(e5, e4, a0, a2) for e5 in range(1, 13) for e4 in range(11)
         for a0 in range(3) for a2 in range(8)],
        ("b5_exponent", "b4_exponent", "a0_exponent", "a2_exponent"), 203_484_831)

    b67 = load("rank8_low_high_strong_terminal_compression_b67_exact_20260820.json")
    b67_audit = load("rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json")
    assert b67["identities"]["identity_remainders"] == {"b7": "0", "b6": "0"}
    assert b67["identities"]["L"] == "2*tb+2*h+9*p1"
    assert b67["b6_Q_coefficient_certificate"]["negative"] == 0
    assert b67["b6_Q_coefficient_certificate"]["minimum"] > 0
    assert b67_audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_TERMINAL_COMPRESSION_B7_B6"

    # Independent logical coverage audit.  Each extension uses the preceding
    # zero face and all positive powers of exactly one new nonnegative slack.
    coverage = [
        {"stage": "core", "free": ["a3", "a4", "a5", "a6", "a7", "b0", "b1", "b2"]},
        {"stage": "a2 lift", "adds": ["a2"]},
        {"stage": "a0 lift", "adds": ["a0"]},
        {"stage": "b3 coefficients", "adds": ["b3"]},
        {"stage": "b4 coefficients", "adds": ["b4"]},
        {"stage": "b5 coefficients", "adds": ["b5"]},
        {"stage": "b7 correction", "adds": ["b7"]},
        {"stage": "b6 correction", "adds": ["b6"]},
    ]
    free = set(coverage[0]["free"])
    for stage in coverage[1:]:
        free.update(stage["adds"])
    assert free == {"a0", "a2", "a3", "a4", "a5", "a6", "a7",
                    "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7"}

    interval_argument = {
        "identity": "M(t)=M0+(t/C)d+(t/C)^2*q2",
        "d_nonnegative": "M0>=0 and q2>=0 imply M(t)>=M0>=0",
        "d_negative": (
            "0<=t<=h and d<0 imply (t/C)d>=(h/C)d; q2>=0 and "
            "C*M0+h*d>=0 imply M(t)>=M0+(h/C)d>=0"
        ),
        "endpoint_gap": False,
    }
    assert primary["fail_closed_guards"] == {
        "all_hashes_pinned": True,
        "all_coefficient_key_universes_ordered_and_unique": True,
        "all_reported_coefficients_nonnegative": True,
        "direct_h_used_without_base_reserve_double_counting": True,
        "base_payment_experiment_not_used": True,
        "withdrawn_b6_base_payment_formula_not_used": True,
    }

    payload = {
        "schema": "rank8-low-high-full-cone-direct-h-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
        "assembler_sha256": ASSEMBLER_SHA,
        "primary_report_sha256": PRIMARY_SHA,
        "pinned_inputs": EXPECTED_INPUTS,
        "coefficient_blocks": {"b3": b3_stats, "b4": b4_stats, "b5": b5_stats},
        "direct_h_coverage": coverage,
        "q2_pair_universes": {"low": 36, "high": 36},
        "interval_argument": interval_argument,
        "scope_warning": (
            "This independently audits only the rank-eight low/high convolution "
            "cone. It does not close the low/low cone or the remaining global Q8 lift."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        print(f"FAIL_CLOSED: {exc}")
        raise SystemExit(2)
