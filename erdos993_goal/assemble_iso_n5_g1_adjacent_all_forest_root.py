#!/usr/bin/env python3
"""Fail-closed assembly of the adjacent-mark M5+3*C5 theorem.

This combines exact finite enumeration through order twelve with the
zero-deficit, one-sided, and two-positive-deficit all-order certificates.
It proves the adjacent canonical placement only; the other placements and
the full Erdos Problem #993 remain separate obligations.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_all_forest_assembled_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_ADJACENT_ALL_FOREST_ROOT"

DEPENDENCIES = {
    "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py":
        "39243EEEB2C22ABE711401959804C839C5AFE3A7882691EB9FA8FC91CBE7E3E7",
    "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json":
        "9954176009C063BC69511A8DA6FF90B0E0B6ADC02BF007045E8ADF168014088B",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein.py":
        "B02137FDD268600EE30DF575BC6FFEB8C2EB5A1D9B8CC7859CDD981A36BA9182",
    "iso_n5_g1_adjacent_zero_deletion_face_exact_g1_bernstein_20260830.json":
        "0DA34FB7A8B3474EC9CB4B2325CE59794B714BDE958B4F8A42D5FA16A80301E7",
    "prove_iso_n5_g1_adjacent_one_sided_face_g1_bernstein.py":
        "17566DDBC60F784AD59F5A8C42D890F7EE6AC4E1307BFA2133D2DBE650CABD25",
    "iso_n5_g1_adjacent_one_sided_face_exact_g1_bernstein_20260830.json":
        "83238D8AA02ED1A7BA78494EC3682D1D4D51FFE3A6C071A7C5F3EE05CC24D3DA",
    "explore_iso_n5_g1_adjacent_two_deficit_interaction_g1_bernstein.py":
        "FFECBBF3198F80FB20C85CDC39DA64A2FA923C6C6C6625939E52AD632562C4CD",
    "iso_n5_g1_adjacent_two_deficit_finite_census_exact_g1_bernstein_20260830.json":
        "4C9E007B33F5A4D4BF7430104E82EF359807C01FC9FFEFD6A69B2C1788C8CE3A",
    "derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py":
        "B45D369DB8A5FF26FC1D43C22198D693581A23C8D283F79757BEBC949688AD48",
    "derive_iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein.py":
        "0E4726EC2CF58513AA43DD3FF53465BC3CFA804765E8CD32EB604FCA40A9EAF5",
    "iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein_20260830.json":
        "F03DA3CD24F4440C9175210181C2236F7F4746D063D20EAEE5CB8AEA7FCAE677",
    "derive_iso_n5_g1_adjacent_endpoint_symmetry_root.py":
        "FD414E7B6CD9B49AF5F1F03E5116109385AC1D830643BC5C2A328E0AF25381FA",
    "iso_n5_g1_adjacent_two_deficit_endpoint_symmetry_exact_root_20260830.json":
        "A299941453086F467DD906B650946B45C03ECAB7A928BBFCCD4997515486A683",
    "prove_iso_n5_g1_adjacent_two_deficit_adaptive_cones_g1_bernstein.py":
        "8B885E62CC3698F7FD5F7C8F5C403B8FD2FABB5DF4FF54FB66E4AB28EE1E4FE5",
    "iso_n5_g1_adjacent_two_deficit_adaptive_cones_exact_g1_bernstein_20260830.json":
        "E4742625150D97C264BEA6C91DE8C27939CFFF21F063482969FACCB29FA1CEC0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    compact = load("iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json")
    zero = load("iso_n5_g1_adjacent_zero_deletion_face_exact_g1_bernstein_20260830.json")
    one = load("iso_n5_g1_adjacent_one_sided_face_exact_g1_bernstein_20260830.json")
    finite = load("iso_n5_g1_adjacent_two_deficit_finite_census_exact_g1_bernstein_20260830.json")
    reduction = load("iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein_20260830.json")
    symmetry = load("iso_n5_g1_adjacent_two_deficit_endpoint_symmetry_exact_root_20260830.json")
    cones = load("iso_n5_g1_adjacent_two_deficit_adaptive_cones_exact_g1_bernstein_20260830.json")

    assert compact["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    assert compact["rank_five_identity"] == "g1(no-mark-root)=M5+3*C5+2*N4"
    assert compact["mark_inclusion_partition"]["identity"] == (
        "M5+3C5=H(A)+L(A,B)+L(A,C)+K(B,C)+epsilon*K(A,D)"
    )
    assert compact["mark_inclusion_partition"]["epsilon"] == (
        "1 when u,v are nonadjacent and 0 when they are adjacent"
    )
    assert zero["marker"] == "PASS_EXACT_ISO_N5_G1_ADJACENT_ZERO_DELETION_FACE_G1_BERNSTEIN"
    assert one["marker"] == "PASS_EXACT_ISO_N5_G1_ADJACENT_ONE_SIDED_FACE_G1_BERNSTEIN"
    assert finite["marker"] == "PASS_EXACT_FINITE_ISO_N5_G1_ADJACENT_TWO_DEFICIT_G1_BERNSTEIN"
    assert reduction["marker"] == "DERIVED_INDEPENDENT_EXACT_ISO_N5_G1_ADJACENT_ADAPTIVE_ENDPOINT_REDUCTION_G1_BERNSTEIN"
    assert symmetry["marker"] == "DERIVED_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ENDPOINT_SYMMETRY_ROOT"
    assert cones["marker"] == "PASS_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ADAPTIVE_CONES_G1_BERNSTEIN"

    assert finite["orders"] == [0, 12]
    assert finite["forests"] == 2949
    assert finite["deletion_states"] == 3804017
    assert finite["negative_S"] == 0
    assert finite["ordered_stream_sha256"] == "D2283A56A4D561FAB762303579DC55705162CA86D9A84BE74B4481E573BA3C5E"
    assert reduction["rank2"]["vertices"] == ["(0,0)", "(e,0)", "(0,e)"]
    assert reduction["rank2"]["hypotenuse_second_derivative"] == -12

    expected_branches = {
        "high_none": (1011780, "2/15", "19ECCFC8265AA52DA4739DCAB8225611D5AFEC1DA844E22DD3B822BEE22875C9"),
        "high_x": (1011780, "2/15", "C5702C82CF0663CE5A320836D0D57BB2F5198A6B80E841CB7F181958B13B5E2A"),
        "low_none": (1218360, "2/15", "596EBFB8FE47B687E78A99E494B942F19594DFA08501629A44EE07B0BD17DA77"),
        "low_x": (1218360, "2/15", "A2D8F0721FE987A071B2D97BF539340F4F5E3F3BF91BBAEC852B4CDEAAFCC6FA"),
    }
    for name, (count, minimum, stream) in expected_branches.items():
        branch = cones["branches"][name]
        assert branch["homogeneous_coefficients"] == count
        assert branch["negative"] == 0
        assert Fraction(branch["minimum"]) == Fraction(minimum) > 0
        assert branch["coefficient_stream_sha256"] == stream

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite adjacent-mark forest state, the rank-five residual "
            "S=M5+3*C5 is nonnegative."
        ),
        "case_partition": {
            "orders_0_through_12": (
                "Complete exact enumeration of every unlabeled forest and every "
                "componentwise two-sided deletion assignment."
            ),
            "orders_13_plus_zero_deficits": "S(A,A,A)>=0 by the zero-deletion theorem.",
            "orders_13_plus_one_positive_deficit": (
                "S(A,B,A)>=0 and its exchanged copy by the one-sided theorem."
            ),
            "orders_13_plus_two_positive_deficits": (
                "The exact adaptive/path reduction is minimized at three coupled "
                "edge-budget vertices. High/low factorial-drop sectors exhaust the "
                "forest ratio domain; none and x are coefficientwise positive in "
                "both sectors, and y follows by exact deletion-family exchange."
            ),
        },
        "finite_certificate": {
            "orders": finite["orders"],
            "unlabeled_forests": finite["forests"],
            "deletion_states": finite["deletion_states"],
            "negative": finite["negative_S"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_order_certificate": {
            "order_floor": 13,
            "coupled_vertices": reduction["rank2"]["vertices"],
            "endpoint_symmetry": symmetry["identity"],
            "ratio_input": (
                "Rank-five forest drops delta1>=0, delta2>=1, "
                "delta1+delta2>=2, delta3>=1, delta4>=1, split "
                "exhaustively at delta1=1."
            ),
            "branches": cones["branches"],
        },
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Adjacent-mark M5+3*C5 only. This does not prove the connected- or "
            "disconnected-nonadjacent M5 blocks, all g1 modes, g2, all N5, or "
            "Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "finite_deletion_states": finite["deletion_states"],
        "large_order_branches": list(expected_branches),
        "global_cone_minimum": "2/15",
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
