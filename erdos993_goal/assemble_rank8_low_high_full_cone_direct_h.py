#!/usr/bin/env python3
"""Fail-closed assembler for the exact rank-eight low/high convolution cone."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_low_high_full_cone_direct_h_exact_20260821.json"
PINNED = {
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md":
        "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json":
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
    "analyze_rank8_low_high_tail_boost_reduction.py":
        "EECF94D2DC0D65CE2517768E9A8EBE9E552FDECF8E07FDDAD2D7D50F57A97E32",
    "rank8_low_high_tail_boost_reduction_exact_20260820.json":
        "2ABAAE9134E9F65EA2DE3934F5D84D3903873EDD39E9BFC1D6F1F99654A124E0",
    "verify_rank8_low_high_tail_q2_pairwise.py":
        "90D1FB6853833769355F7CF9A97663AC89FCD8FF8BB071904218738E477684A9",
    "rank8_low_high_tail_q2_pairwise_exact_20260820.json":
        "AD3EDC7B5BEC5434833B9A86385AE98F33C1B837493501C32973D91F08F91517",
    "verify_rank8_low_high_strong_core_multinomial_lift.py":
        "7CD865F1FCFAC817A96EE52AF4C953F671848104F25372FDDD3AE919C937CDAB",
    "rank8_low_high_strong_core_multinomial_lift_exact_20260820.json":
        "FD6D13C4B290594EBD7D0763E0542683EBCE94B61D9C7F58EA0F508EA8F7786F",
    "audit_rank8_low_high_strong_core_multinomial_lift.py":
        "CDE59D66F87563EC1145C6EA1E40F204977D6AE9E9AF755DE5EAF30534CE72C0",
    "rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json":
        "3C950FAD8F8923CB0D10A33EE4C804C43A343DD1F0A0038F2AB428E5E386087D",
    "verify_rank8_low_high_strong_a0_a2_lift_reduction.py":
        "F0748208666C0F2DD64AE1D0C143854C5BDC9CDF2347DB37F2D2D7667262F966",
    "rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json":
        "86C971751769FB6C0912EF028487A61757C6B95787AED0FC582877158FF39174",
    "audit_rank8_low_high_strong_a0_a2_lift_reduction_delta12.py":
        "B54CCEE2DC7DA0344CF3F1B69B09E5AFFB717B9EB27D3214662C037F64A98A9E",
    "rank8_low_high_strong_a0_a2_lift_reduction_delta12_audit_20260820.json":
        "51BB38FEA24B4A002CAA1DF960CD05FD5A007B9C3B07804AF0BE84697AFF377F",
    "probe_rank8_low_high_strong_b3_a0_a2_cell.py":
        "97AEEBC10284F902CC6C20C26C5028EE7CC868508BA44AA5BBD720C03EB77CEE",
    "verify_rank8_low_high_strong_b3_a0_a2_cells.py":
        "DEB5BB984C7A5FCC37DFD40CC3A62B649483DE3E4DFB1E346CBF68E88E1325A9",
    "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json":
        "77BF1549D11559C478CCA5215C6D70186D23827C7D06C04AF8C00E1BF2BAC5CE",
    "audit_rank8_low_high_strong_b3_a0_a2_cells.py":
        "10A499C3A61531EF829B2DE6A3CF4423ED97988CB3685532A07C3E9D81B67CF0",
    "rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json":
        "37C269AB5C0AFA36FAB61B7F02FA1F8718473FE1000CCBB8D0B1141BD043075C",
    "probe_rank8_low_high_strong_b4_a0_a2_cell.py":
        "25E4837E27BBFD377495AF03B876AD049998B849A12F8A95AA447AF02F667E6D",
    "verify_rank8_low_high_strong_b4_a0_a2_cells.py":
        "D38DF9236763F0E1B4895B3A2180CB283127099E17658C20D37E9DF9B4A3AF83",
    "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json":
        "0523B65E9345939887DB77F32EE5C41CAC4F142E9C5F4235701616E999B593AE",
    "audit_rank8_low_high_strong_b4_a0_a2_cells.py":
        "34A40EC46177DF66AE31B6712F237FB353F179769C3233347F8EB5EA0E9F6D92",
    "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json":
        "4DE3A98041321E29FDB2E0DA24B16C4AB477923FAFD091EEA5C2B17642D88103",
    "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py":
        "D3D0BD450D9C1BC171F9BA60D055D23883A3BF1F295FB4B9D8EC4E9544CC2BF0",
    "verify_rank8_low_high_strong_b5_b4_a0_a2_cells.py":
        "B8662E4167A6ABF401E29D74D4D753858ED14A39DEA51ED083BDCC83C5B06C59",
    "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json":
        "E89F08432FBE629B89B3537DFF8AE00AE1805BB14DBBA279EAC5D37046D69744",
    "audit_rank8_low_high_strong_b5_b4_a0_a2_cells.py":
        "CAA4C2FFE4B4A5A61537E36DAE672AAF745F94BE0480B213A7AD0C3EF751B076",
    "rank8_low_high_strong_b5_b4_a0_a2_cells_independent_audit_exact_20260821.json":
        "9FA7E65225A2E03695539294E91A8B93D9CC1349E70B40CEEA8A19CF8F2C879F",
    "verify_rank8_low_high_strong_terminal_compression_b67.py":
        "2B9B3E09985DE6CCF0CFABE63A84999E894D433204FACF006844048D2F2EBF48",
    "rank8_low_high_strong_terminal_compression_b67_exact_20260820.json":
        "609A3E83AD7E8A08EC24DDF581E775958ED63DE7F9468AF59E633D4A010661C1",
    "audit_rank8_low_high_strong_terminal_compression_b67_delta12.py":
        "6ACD63AE15C4DED9E8184F127C4CE111CDC6E41555C190FCEC3E221CA57C43B4",
    "rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json":
        "6955700D51CB01E5B7BA7FA25DA7C44491EC437F32F5382F274663958E83A2AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_rows(rows: list[dict], expected_keys: list[tuple], fields: tuple[str, ...]) -> dict:
    actual = [tuple(row[field] for field in fields) for row in rows]
    require(actual == expected_keys, "ordered coefficient-key universe changed")
    require(len(actual) == len(set(actual)), "duplicate coefficient keys")
    nonzero = zero = terms = 0
    for row in rows:
        require(row["negative"] == 0 and row["first_negative"] is None,
                "negative coefficient or witness in a direct-H block")
        terms += row["terms"]
        if row["terms"]:
            nonzero += 1
            require(0 < row["minimum"] <= row["maximum"], "bad nonzero extrema")
        else:
            zero += 1
            require(row["minimum"] is None and row["maximum"] is None,
                    "zero slice has non-null extrema")
    return {"ordered_unique_cells": len(actual), "nonzero_cells": nonzero,
            "zero_cells": zero, "aggregate_terms": terms, "negative": 0}


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    actual_pins = {}
    for name, expected in PINNED.items():
        path = ROOT / name
        require(path.is_file(), f"missing input: {name}")
        actual_pins[name] = sha256(path)
        require(actual_pins[name] == expected, f"hash mismatch: {name}")

    high = load("rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json")
    require(high["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
            "high/high base theorem is not PASS")

    tail = load("rank8_low_high_tail_boost_reduction_exact_20260820.json")
    require(tail["status"] == "EXACT_REDUCTION_WITH_METHOD_OBSTRUCTIONS_NOT_LOW_HIGH_CONE_THEOREM",
            "tail reduction status changed")
    replay = tail["symbolic_replay"]
    require(replay["quadratic_remainder"] == replay["tail_substitution_remainder"] == "0",
            "tail identity remainder is nonzero")
    require(replay["M_t"] == "M0+(t/C)*d+(t/C)^2*q2", "tail polynomial changed")
    require(replay["sufficient_auxiliaries"] == ["q2>=0", "C*M0+h*d>=0"],
            "tail sufficiency conditions changed")
    require(tail["tail_boost"]["bound"] == "C>=6h, hence 1<=lambda<=7/6",
            "tail range bound changed")

    q2 = load("rank8_low_high_tail_q2_pairwise_exact_20260820.json")
    require(q2["status"] ==
            "PASS_EXACT_Q2_THEOREM_AND_SINGLE_PAYMENT_REDUCTION_NOT_LOW_HIGH_THEOREM",
            "q2 theorem is not PASS")
    pairwise = q2["pairwise_replay"]
    for key in ("pairwise_margin_identity_remainder", "factorial_q2_identity_remainder",
                "q2_pair_decomposition_remainder"):
        require(pairwise[key] == "0", f"q2 replay failed: {key}")
    signs = q2["sign_classification"]
    pairs = tuple(itertools.combinations(range(9), 2))
    require(tuple(tuple(row["pair"]) for row in signs["low_pairs"]) == pairs,
            "low q2 pair universe changed")
    require(tuple(tuple(row["pair"]) for row in signs["high_pairs"]) == pairs,
            "high q2 pair universe changed")

    core = load("rank8_low_high_strong_core_multinomial_lift_exact_20260820.json")
    require(core["status"] == "PASS_EXACT_STRONG_AUXILIARY_FULL_LEFT_PREFIX_CORE",
            "direct-H core is not PASS")
    core_audit = load("rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json")
    require(core_audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_FULL_LEFT_PREFIX_CORE",
            "direct-H core audit is not PASS")

    a02 = load("rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json")
    require(a02["status"] == "PASS_EXACT_STRONG_A0_A2_COEFFICIENT_LIFT_REDUCTION",
            "a0/a2 lift is not PASS")
    require(a02["a2_support_check"]["negative_with_positive_a2_exponent"] == 0,
            "a2-positive slice is not coefficientwise nonnegative")
    require([row["a0_exponent"] for row in a02["a0_slices_over_arbitrary_a2_and_core"]] == [1, 2],
            "a0 degree split changed")
    for row in a02["a0_slices_over_arbitrary_a2_and_core"]:
        require(row["negative"] == 0 and row["minimum"] > 0 and row["first_negative"] is None,
                "a0-positive slice is not coefficientwise positive")
    a02_audit = load("rank8_low_high_strong_a0_a2_lift_reduction_delta12_audit_20260820.json")
    require(a02_audit["status"] ==
            "PASS_INDEPENDENT_LIGHTWEIGHT_ALGEBRA_HASH_SCOPE_AUDIT_A0_A2_LIFT",
            "a0/a2 lift audit is not PASS")

    b3 = load("rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json")
    require(b3["status"] == "PASS_EXACT_STRONG_B3_FULL_LEFT_COEFFICIENT_EXTENSION",
            "b3 extension is not PASS")
    b3_stats = validate_rows(
        b3["rows"],
        [(e3, a0, a2) for e3 in range(1, 9) for a0 in range(3) for a2 in range(8)],
        ("b3_exponent", "a0_exponent", "a2_exponent"))
    require(b3_stats["aggregate_terms"] == 39_539_041, "b3 aggregate changed")
    b3_audit = load("rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json")
    require(b3_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_EXTENSION",
            "b3 audit is not PASS")

    b4 = load("rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json")
    require(b4["status"] == "PASS_EXACT_STRONG_B3_B4_FULL_LEFT_COEFFICIENT_EXTENSION",
            "b4 extension is not PASS")
    b4_stats = validate_rows(
        b4["rows"],
        [(e4, a0, a2) for e4 in range(1, 11) for a0 in range(3) for a2 in range(8)],
        ("b4_exponent", "a0_exponent", "a2_exponent"))
    require(b4_stats["aggregate_terms"] == 91_946_174, "b4 aggregate changed")
    b4_audit = load("rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json")
    require(b4_audit["status"] ==
            "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_B4_EXTENSION",
            "b4 audit is not PASS")

    b5 = load("rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json")
    require(b5["status"] == "PASS_EXACT_STRONG_B3_B4_B5_FULL_LEFT_COEFFICIENT_EXTENSION",
            "b5 extension is not PASS")
    b5_stats = validate_rows(
        b5["rows"],
        [(e5, e4, a0, a2) for e5 in range(1, 13) for e4 in range(11)
         for a0 in range(3) for a2 in range(8)],
        ("b5_exponent", "b4_exponent", "a0_exponent", "a2_exponent"))
    require(b5_stats["aggregate_terms"] == 203_484_831, "b5 aggregate changed")
    b5_audit = load("rank8_low_high_strong_b5_b4_a0_a2_cells_independent_audit_exact_20260821.json")
    require(b5_audit["status"] ==
            "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_B4_B5_EXTENSION",
            "b5 audit is not PASS")

    b67 = load("rank8_low_high_strong_terminal_compression_b67_exact_20260820.json")
    require(b67["status"] == "PASS_EXACT_STRONG_TERMINAL_COMPRESSION_B7_B6",
            "b6/b7 direct-H compression is not PASS")
    require(b67["identities"]["identity_remainders"] == {"b7": "0", "b6": "0"},
            "b6/b7 identity remainder is nonzero")
    require(b67["identities"]["L"] == "2*tb+2*h+9*p1", "direct-H b6 L changed")
    require(b67["b6_Q_coefficient_certificate"]["negative"] == 0 and
            b67["b6_Q_coefficient_certificate"]["minimum"] > 0,
            "b6 direct-H correction is not coefficientwise positive")
    b67_audit = load("rank8_low_high_strong_terminal_compression_b67_delta12_independent_audit_20260820.json")
    require(b67_audit["status"] ==
            "PASS_INDEPENDENT_AUDIT_STRONG_TERMINAL_COMPRESSION_B7_B6",
            "b6/b7 audit is not PASS")

    direct_h_join = [
        "The independently audited multinomial AM-GM certificate proves H_str=C*M0+h*d>=0 on a0=a2=b3=...=b7=0 with arbitrary a3..a7,b0..b2.",
        "The exact a2-positive support and quadratic a0 slices extend the core to arbitrary a0,a2 while b3..b7 remain zero.",
        "The ordered b3, then b4, then b5 coefficient extensions cover arbitrary b3,b4,b5 with b6=b7=0; each zero face is the preceding theorem.",
        "The exact nonnegative b7 and then b6 correction identities extend H_str>=0 to arbitrary b6,b7 without constraining any earlier slack.",
    ]
    tail_join = [
        "High/high gives M0>=0 on the base row.",
        "The exact pairwise theorem gives q2>=0.",
        "The direct-H chain gives C*M0+h*d>=0 on the full high-base/high-partner cone.",
        "For d>=0, M(t)>=M0; for d<0 and 0<=t<=h, M(t)>=M0+(h/C)d>=0. Thus every low/high row is covered.",
    ]
    payload = {
        "schema": "rank8-low-high-full-cone-direct-h-v1",
        "status": "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
        "theorem": (
            "For every rank-eight low factor row and every rank-eight high factor "
            "row in the exact pinned convolution cones, the rank-eight terminal "
            "margin is nonnegative for the entire interval 0<=t<=h."
        ),
        "assembler_source_sha256": sha256(Path(__file__)),
        "pinned_inputs": actual_pins,
        "factor_cones": tail["factor_cones"],
        "tail_identity": replay,
        "direct_h_chain": {
            "core": "PASS",
            "a0_a2_lift": "PASS",
            "b3": b3_stats,
            "b4": b4_stats,
            "b5": b5_stats,
            "b6_b7_compression": "PASS",
            "logical_join": direct_h_join,
        },
        "q2_pairwise": {"low_pairs": 36, "high_pairs": 36,
                         "identity_remainders": 0, "status": "PASS"},
        "low_high_logical_join": tail_join,
        "fail_closed_guards": {
            "all_hashes_pinned": True,
            "all_coefficient_key_universes_ordered_and_unique": True,
            "all_reported_coefficients_nonnegative": True,
            "direct_h_used_without_base_reserve_double_counting": True,
            "base_payment_experiment_not_used": True,
            "withdrawn_b6_base_payment_formula_not_used": True,
        },
        "scope_warning": (
            "This closes only the rank-eight low/high convolution cone. The low/low "
            "cone, remaining connected Q8 inputs, exceptional first crossings, "
            "forest lift, PGC boundary, and Problem 993 remain separate dependencies."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["assembler_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        print(f"FAIL_CLOSED: {exc}")
        raise SystemExit(2)
