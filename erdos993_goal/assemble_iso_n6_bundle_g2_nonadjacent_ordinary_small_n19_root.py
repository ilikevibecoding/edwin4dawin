#!/usr/bin/env python3
"""Fail-closed N>=19 small-induced-order ordinary-parent G2 assembly."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_small_n19_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "SMALL_N19_ROOT"
)
SHARD_MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SAFE_ABS_"
    "WEDGE_SMALL_ORDER_FLINT_ROOT"
)

PINS = {
    "producer": (
        "probe_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_"
        "wedge_small_order_flint_root.py",
        "0A8DEA7AD8E0E56FA17CCFD613CD943975AACA5272FBC61812163FC16F7CB729",
    ),
    "runner": (
        "run_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_small_matrix_root.py",
        "A3FFA7E38AF4BFBB140754E4BF66C8BC9107096F2ACCAD89592ABE3040FEBD02",
    ),
    "matrix": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_small_matrix_"
        "probe_root_20260831.json",
        "ED328EB69640BC5CE29F6747D823D01BFC8729742E0F4E10076A5DBF92F2FC31",
    ),
    "replay_source": (
        "replay_iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_"
        "small_matrix_root.py",
        "BA6F9E8679E404177B3F3F80F7BCEF53D7689BD4A9B2D217CF62139226347FBA",
    ),
    "replay": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_small_matrix_"
        "replay_exact_root_20260831.json",
        "86A882C0E2A8464EC5B6210FA5A17582A100003CFB454B622E5E81298D20BF41",
    ),
    "occupation": (
        "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json",
        "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83",
    ),
    "loss": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json",
        "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6",
    ),
    "balanced_sum_helper": (
        "balanced_flint_mpoly_sum_root.py",
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
    ),
    "wedge_helper": (
        "probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py",
        "DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88",
    ),
    "q3_helper": (
        "probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py",
        "83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797",
    ),
    "ordinary_helper": (
        "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py",
        "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E",
    ),
    "nonadjacent_helper": (
        "probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root.py",
        "D361E4EAB471FA4C791C490CCEC6E80CF458A189AA073451EED2BBD026AB5FF4",
    ),
    "bernstein_helper": (
        "tensor_bernstein_flint_matrix_root.py",
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def main() -> None:
    pins = {}
    for label, (filename, expected) in PINS.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (label, expected, actual)
        pins[label] = {"file": filename, "sha256": actual}

    occupation = load("occupation")
    loss = load("loss")
    matrix = load("matrix")
    replay = load("replay")
    assert occupation["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    )
    assert loss["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    )
    assert matrix["marker"] == (
        "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SAFE_ABS_"
        "SMALL_MATRIX_ROOT"
    )
    assert replay["marker"] == (
        "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "SAFE_ABS_SMALL_MATRIX_ROOT"
    )
    assert matrix["source_sha256"] == PINS["producer"][1]
    assert matrix["runner_source_sha256"] == PINS["runner"][1]
    assert replay["producer_sha256"] == PINS["producer"][1]
    assert replay["source_sha256"] == PINS["replay_source"][1]

    expected_cases = set(itertools.product(
        ("common0", "common1"), range(7), (0, 1), (0, 1), (0, 1)
    ))
    matrix_by_case = {
        (
            row["geometry"], row["small_B_order"], row["B_mask"],
            row["C_mask"], row["D2_mask"],
        ): row
        for row in matrix["rows"]
    }
    replay_by_case = {tuple(row["case"]): row for row in replay["rows"]}
    assert set(matrix_by_case) == expected_cases
    assert set(replay_by_case) == expected_cases
    assert len(matrix["rows"]) == len(matrix_by_case) == 112
    assert len(replay["rows"]) == len(replay_by_case) == 112

    total_controls = 0
    total_simplex = 0
    minimum = None
    shard_rows = []
    for case in sorted(expected_cases):
        matrix_row = matrix_by_case[case]
        replay_row = replay_by_case[case]
        filename = matrix_row["report"]
        assert replay_row["report"] == filename
        actual_hash = sha256(HERE / filename)
        assert actual_hash == matrix_row["report_sha256"]
        assert replay_row["before_sha256"] == actual_hash
        assert replay_row["after_sha256"] == actual_hash
        assert replay_row["byte_identical"] is True
        assert replay_row["negative_betas"] == 0
        assert replay_row["negative_controls"] == 0

        shard = json.loads((HERE / filename).read_text(encoding="utf-8"))
        geometry, order, bmask, cmask, d2mask = case
        assert shard["marker"] == SHARD_MARKER
        assert shard["source_sha256"] == PINS["producer"][1]
        assert shard["occupation_report_sha256"] == PINS["occupation"][1]
        assert shard["loss_report_sha256"] == PINS["loss"][1]
        assert (
            shard["geometry"], shard["small_B_order"], shard["B_mask"],
            shard["C_mask"], shard["D2_mask"],
        ) == case
        assert shard["simplex_degree"] == 4
        assert shard["homogeneous_simplex_coefficients"] == 70
        assert shard["start_beta"] == 0
        assert shard["stop_beta"] == 70
        assert shard["processed_betas"] == 70
        assert shard["negative_betas"] == 0
        assert shard["negative_controls"] == 0
        assert len(shard["records"]) == 70
        assert [row["beta_index"] for row in shard["records"]] == list(range(70))
        betas = [tuple(row["beta"]) for row in shard["records"]]
        assert len(set(betas)) == 70
        assert all(len(beta) == 5 and sum(beta) == 4 for beta in betas)
        assert all(row["negative"] == 0 for row in shard["records"])
        local_controls = sum(
            row["bernstein_coefficients"] for row in shard["records"]
        )
        local_minimum = min(Fraction(row["minimum"]) for row in shard["records"])
        assert local_controls == matrix_row["bernstein_coefficients"]
        assert local_minimum == Fraction(matrix_row["minimum"])
        assert local_minimum > 0
        assert shard["ordered_record_sha256"] == matrix_row["ordered_record_sha256"]
        total_controls += local_controls
        total_simplex += 70
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        shard_rows.append({
            "case": list(case),
            "file": filename,
            "sha256": actual_hash,
            "bernstein_coefficients": local_controls,
            "minimum": str(local_minimum),
            "byte_identical_replay": True,
        })

    assert matrix["shards"] == replay["shards"] == 112
    assert replay["byte_identical_shards"] == 112
    assert matrix["simplex_coefficients"] == total_simplex == 7840
    assert matrix["bernstein_coefficients"] == total_controls == 87_241_624
    assert matrix["negative"] == replay["negative_controls"] == 0
    assert matrix["zero"] == 0
    assert minimum == Fraction(matrix["minimum"]) == Fraction(1, 11520)

    report = {
        "marker": MARKER,
        "status": "PASS exact replayed N>=19 small-induced-order subtheorem",
        "theorem_component": (
            "For every rank-six nonadjacent ordinary-parent forest bundle with "
            "N>=19 and min(mB,mC)<=6, the coefficient G2 is nonnegative."
        ),
        "coverage": {
            "ambient_order": "N=19+h for every integer h>=0",
            "small_induced_order": (
                "swap the two marks if necessary so mB=min(mB,mC); "
                "the seven cases mB=0,...,6 are exhaustive"
            ),
            "mark_geometry": (
                "common0 and common1; two nonadjacent vertices of a forest "
                "cannot have two common neighbors"
            ),
            "row_endpoints": (
                "both B2 corners, both C2 corners, and both D2 endpoints"
            ),
            "ordinary_parent": (
                "five positive loss coordinates discarded, three negative "
                "coordinates paid at exact subset ceilings, and all eight "
                "remaining coordinates paid by unconditional absolute envelopes"
            ),
        },
        "certificate": {
            "shards": 112,
            "simplex_coefficients": total_simplex,
            "tensor_bernstein_coefficients": total_controls,
            "negative": 0,
            "zero": 0,
            "minimum": str(minimum),
            "byte_identical_replay_shards": 112,
        },
        "shard_rows": shard_rows,
        "pins": pins,
        "scope_guard": (
            "This closes only N>=19 with min(mB,mC)<=6 in the nonadjacent "
            "ordinary-parent G2 mode. The complementary min(mB,mC)>=7 "
            "matrix, finite N<=18, and universal rank-six assembly are separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        **report["certificate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
