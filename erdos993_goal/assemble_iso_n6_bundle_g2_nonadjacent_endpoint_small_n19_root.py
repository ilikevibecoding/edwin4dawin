#!/usr/bin/env python3
"""Fail-closed N>=19 small-induced-order endpoint-parent G2 assembly."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_n19_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "SMALL_N19_ROOT"
)
SHARD_MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "WEDGE_SMALL_ORDER_FLINT_ROOT"
)

PINS = {
    "producer": (
        "probe_iso_n6_bundle_g2_nonadjacent_endpoint_"
        "wedge_small_order_flint_root.py",
        "1EE93DCD0A1DF79655654026C0442C4445AC96286D64B61868F1EEFC19A8E1EE",
    ),
    "runner": (
        "run_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root.py",
        "0D37447B2E94C341B576EEEA286D0AC04EEA849A239614C0F9E2F50FC9E5F1D0",
    ),
    "matrix": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
        "exact_root_20260831.json",
        "FF6E5F7A02CA74A2ADDAC14F029871B2648119C9551B6CD78557A06096E1A1B9",
    ),
    "replay_source": (
        "replay_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root.py",
        "1E5758E9DD0D5D6F44444C0A709EED286A51AD927A9624B1C203C64B534CF3B2",
    ),
    "replay": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
        "replay_exact_root_20260831.json",
        "6602F8A151397EF13DBB986A296EF3178AD8432BA4223FFA24D7A231BECAD979",
    ),
    "occupation_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_root.py",
        "6316FB51C60CA4F592B0148A16F041FB39245047F62626BAF4AF10D775593677",
    ),
    "occupation": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
        "exact_root_20260831.json",
        "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437",
    ),
    "reduction_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_root.py",
        "4FA64742C54885B19798E6C6ABBBCE10AD3D14347486D195041506BB29D7BCCF",
    ),
    "reduction": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
        "exact_root_20260831.json",
        "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69",
    ),
    "balanced_sum_helper": (
        "balanced_flint_mpoly_sum_root.py",
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
    ),
    "endpoint_helper": (
        "probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish.py",
        "0650BA253F5DCB6079AB19C5F01D125D01874EFC2B58321BEEB1F66FDBD07156",
    ),
    "q3_helper": (
        "probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py",
        "83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797",
    ),
    "wedge_helper": (
        "probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py",
        "DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88",
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
    reduction = load("reduction")
    matrix = load("matrix")
    replay = load("replay")
    assert occupation["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_PARENT_"
        "OCCUPATION_ROOT"
    )
    assert occupation["endpoint_u_split"] == (
        "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
    )
    assert reduction["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_LARGE_"
        "CORNER_REDUCTION_ROOT"
    )
    assert reduction["corner_count_per_orientation"] == 8
    assert matrix["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "SMALL_ORDER_MATRIX_ROOT"
    )
    assert replay["marker"] == (
        "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "SMALL_ORDER_MATRIX_ROOT"
    )
    assert matrix["source_sha256"] == PINS["producer"][1]
    assert matrix["runner_source_sha256"] == PINS["runner"][1]
    assert replay["producer_sha256"] == PINS["producer"][1]
    assert replay["source_sha256"] == PINS["replay_source"][1]

    expected_cases = set(itertools.product(
        ("common0", "common1"), range(7),
        ("B_small", "C_small"), (0, 1), (0, 1), (0, 1)
    ))
    matrix_by_case = {
        (
            row["geometry"], row["small_order"], row["orientation"],
            row["B_mask"], row["C_mask"], row["D2_mask"],
        ): row
        for row in matrix["rows"]
    }
    replay_by_case = {tuple(row["case"]): row for row in replay["rows"]}
    assert set(matrix_by_case) == expected_cases
    assert set(replay_by_case) == expected_cases
    assert len(matrix["rows"]) == len(matrix_by_case) == 224
    assert len(replay["rows"]) == len(replay_by_case) == 224

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
        assert replay_row["negative_controls"] == 0

        shard = json.loads((HERE / filename).read_text(encoding="utf-8"))
        geometry, order, orientation, bmask, cmask, d2mask = case
        assert shard["marker"] == SHARD_MARKER
        assert shard["source_sha256"] == PINS["producer"][1]
        assert shard["occupation_report_sha256"] == PINS["occupation"][1]
        assert shard["reduction_report_sha256"] == PINS["reduction"][1]
        assert (
            shard["geometry"], shard["small_order"], shard["orientation"],
            shard["B_mask"], shard["C_mask"], shard["D2_mask"],
        ) == case
        assert shard["functional"] == occupation["endpoint_u_split"]
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

    assert matrix["shards"] == replay["shards"] == 224
    assert replay["byte_identical_shards"] == 224
    assert matrix["simplex_coefficients"] == total_simplex == 15_680
    assert matrix["bernstein_coefficients"] == total_controls == 174_483_248
    assert matrix["negative"] == replay["negative_controls"] == 0
    assert minimum == Fraction(matrix["minimum"]) == Fraction(1, 11520)

    report = {
        "marker": MARKER,
        "status": "PASS exact replayed N>=19 small-induced-order subtheorem",
        "theorem_component": (
            "For every rank-six nonadjacent endpoint-parent forest bundle "
            "with N>=19 and min(mB,mC)<=6, the coefficient G2 is nonnegative."
        ),
        "coverage": {
            "ambient_order": "N=19+h for every integer h>=0",
            "small_induced_order": (
                "k=min(mB,mC) is one of 0,...,6; both assignments of the "
                "asymmetric B,C rows are explicitly enumerated"
            ),
            "mark_geometry": (
                "common0 and common1; two nonadjacent vertices of a forest "
                "cannot have two common neighbors"
            ),
            "row_endpoints": (
                "both B2 corners, both C2 corners, and both D2 endpoints"
            ),
            "endpoint_parent": occupation["endpoint_u_split"],
        },
        "certificate": {
            "shards": 224,
            "simplex_coefficients": total_simplex,
            "tensor_bernstein_coefficients": total_controls,
            "negative": 0,
            "zero": 0,
            "minimum": str(minimum),
            "byte_identical_replay_shards": 224,
        },
        "shard_rows": shard_rows,
        "pins": pins,
        "scope_guard": (
            "This closes only N>=19 with min(mB,mC)<=6 in the nonadjacent "
            "endpoint-parent G2 mode. The complementary min(mB,mC)>=7 "
            "matrix, finite N<=18, and universal rank-six assembly are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
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
