#!/usr/bin/env python3
"""Fail-closed all-order theorem for nonadjacent-mark no-parent rank-five g2.

For a forest G with distinct nonadjacent marked vertices u,v, put

    A=G-u-v,
    B=A-N(v),
    C=A-N(u),
    D=A-(N(u) union N(v)).

The exact occupation split is

    g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D).

Orders |A|<=12 are exhausted exactly.  For |A|>=13, two exhaustive
geometry relaxations, the correlated edge budget, the exact factorial-ratio
drop cone for A, coefficient boxes for B,C, a monotone lower bound for D,
and all 256 B,C corners yield exact tensor-Bernstein certificates on sixteen
order branches.  Every branch is admitted only after two locked fresh-process
serial replays at distinct transform chunk sizes agree record-for-record.

This proves only the nonadjacent subcase of canonical mode no_parent_k0.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import itertools
import json
import math
from pathlib import Path
import subprocess
import sys

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_nonadjacent_all_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_ALL_FOREST_RANK5_G2_ALT"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_NONADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
FINITE_MARKER = "PASS_EXACT_FINITE_ISO_N5_G2_NONADJACENT_ALL_FOREST_RANK5_G2_ALT"
DETERMINISM_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"

PROBE_SOURCE = HERE / "probe_iso_n5_g2_nonadjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
HELPER_SOURCE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
RUNNER_SOURCE = HERE / "run_iso_n5_g2_nonadjacent_serial_replay_rank5_g2_alt.py"
AUDIT_SOURCE = HERE / "audit_iso_n5_g2_nonadjacent_serial_replays_rank5_g2_alt.py"
AUDIT_REPORT = HERE / "iso_n5_g2_nonadjacent_serial_determinism_audit_rank5_g2_alt_20260830.json"
FINITE_SOURCE = HERE / "census_iso_n5_g2_nonadjacent_all_forest_rank5_g2_alt.py"
FINITE_REPORT = HERE / "iso_n5_g2_nonadjacent_all_forest_finite_census_rank5_g2_alt_20260830.json"
GEOMETRIES = ("connected_long", "common_neighbor")
ORDERS = (None, *range(7))


def order_label(order: int | None) -> str:
    return "large" if order is None else f"small{order}"


def canonical_report(geometry: str, order: int | None) -> Path:
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{order_label(order)}_0_256_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def frozen_report(
    geometry: str, order: int | None, start: int, stop: int,
    replay: int, subbatch: bool = False,
) -> Path:
    suffix = "_subbatch" if subbatch else ""
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{order_label(order)}_{start}_{stop}_"
        f"serial_replay{replay}{suffix}_rank5_g2_alt_20260830.json"
    )


def execution_evidence(
    geometry: str, order: int | None, start: int, stop: int, replay: int,
) -> Path:
    return HERE / (
        f"iso_n5_g2_nonadjacent_{geometry}_coarse_{order_label(order)}_"
        f"{start}_{stop}_serial_replay{replay}_execution_evidence_"
        "rank5_g2_alt_20260830.json"
    )


# Filled after the two complete serial replays and the deterministic audit.
# The theorem deliberately fails closed until this table is frozen.
EXPECTED_HASHES: dict[str, str] = {
    "probe_iso_n5_g2_nonadjacent_order_box_edge_budget_flint_rank5_g2_alt.py":
        "7B00AF9A62A128C20C1C0BF0F51A790D57B1C82D7ED912BAEA6779E6F33B661F",
    "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py":
        "A1F32B17DBF73589EB1E11C76FF0567EED379FB3EA0A16CB3C48A1303D0EB478",
    "run_iso_n5_g2_nonadjacent_serial_replay_rank5_g2_alt.py":
        "679E08B6874244207A3A0063439FCBE59F3E60EE2B8FEF24CD3E4CDA8A8F38F1",
    "audit_iso_n5_g2_nonadjacent_serial_replays_rank5_g2_alt.py":
        "59EA02621437AAA6AEEB32D68EB7032E0FC6FC0D08B2592AC970308D3A3ED220",
    "iso_n5_g2_nonadjacent_serial_determinism_audit_rank5_g2_alt_20260830.json":
        "351DEA1ED340DCF2C16A603F0B1F698D9359EDBA32E30DE65B56197D7237611A",
    "census_iso_n5_g2_nonadjacent_all_forest_rank5_g2_alt.py":
        "0739CC2E0CB9ADC0D46271B7CE011E3172F405591AAB8F0E29E9EF0C23C0FF9B",
    "iso_n5_g2_nonadjacent_all_forest_finite_census_rank5_g2_alt_20260830.json":
        "88C383E9B7AD03BC7AE462898F5E9F4D52C98D33DB321274EA231033B3E6E03B",
    "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py":
        "A9A8C45130DECE486F08B1B78127B1D73D6891139DE5C1A3D102189EF8CC6268",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_large_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "0C9316F7D8CA946935E00FE12CC0762E468B1919B58F7F49B90169A21BECC2D0",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small0_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "15399D41CBF094ADBCA32D03EBCA925E101B5D85170C9AF6FD38CED45C8055A7",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small1_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "0BC42675BFEACEE3B7399E57C9CED1E7D3BC66CBDAFC1EB50D88206AF53C880D",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small2_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "030539D67C1A375CBF557E9E94E7DE67EB1A4010E49C4A5170561B58F1163D1A",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small3_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "A27A6C1CEA19EFEA12A5D1DF448940F43A1F40F27EE9E44C916B320E46F550C0",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small4_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "D7439CA2A5FBA1D22628C5357C77B015C286FF069E2C8962F9FEC974A575C483",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small5_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "3671280398EBAB18271966DA0E7D157B1FEBA05539B0781ADDFEF1FAB73E81E9",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_connected_long_coarse_small6_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "6A4C46F2CE4B2346EEA9E168ACFFE4C2C77E8012D557CE1550AAA66C6C240371",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_large_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "C301521F335F63BBD88933D6F74F50177150BD6478EACA1E807D287C0D8E37B3",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small0_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "81FD4477C3FCF0863BD031A72479C5942C940DE2BFD218BF3A01E49CF46CEC59",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small1_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "DDDF69A09A84EF56A9F546CEF517CAD8297817EE00CEE48B651F157C2B3288CA",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small2_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "B3B16BFA39534BD7E87EA0A2CBEC83F5EBEA68FA125E64EDF3ED67571F8A1E52",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small3_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "7A0DE0595A62DEABF04270BA70AE7CAB23352B183F19650DF453B4601D9C2540",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small4_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "B13D9D5E25BA9E1D77B693C5628FB1C7CE366FEFD50051397E46E831ECF43BA1",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small5_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "23B1780B53D40FBFFD4283067D060209B0D962EDD2F365948C3399389641C797",
    "iso_n5_g2_nonadjacent_order_box_edge_budget_common_neighbor_coarse_small6_0_256_flint_probe_rank5_g2_alt_20260830.json":
        "606FB508C8F98B6156500F0DBC98CB6421850F5223545D7818C49B6764624ECC",
}

FOUNDATIONAL_HASHES = {
    "RANK8_ROOT_DELETION_RATIO_FLOOR_THEOREM_2026-08-25.md":
        "07B04ED37C1C1FC4DBBCCF834B2D8BB32BDEF0827BD72A4A926342E2998FE998",
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rerun(command: list[str], expected_marker: str) -> None:
    result = subprocess.run(
        [sys.executable, *command], cwd=HERE, text=True,
        capture_output=True, check=False,
    )
    if result.returncode != 0 or expected_marker not in result.stdout:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError((command, result.returncode, expected_marker))
    print(json.dumps({"replayed": command, "marker": expected_marker}), flush=True)


def regenerate_dependencies() -> None:
    rerun([FINITE_SOURCE.name], FINITE_MARKER)
    for replay, chunk_columns in ((1, 4096), (2, 8192)):
        rerun([
            RUNNER_SOURCE.name, "--replay", str(replay),
            "--chunk-columns", str(chunk_columns),
            "--geometries", *GEOMETRIES,
            "--orders", "large", *map(str, range(7)),
            "--subbatch-size", "16",
        ], RUNNER_MARKER)
    rerun([AUDIT_SOURCE.name], DETERMINISM_MARKER)


def algebra_certificate() -> dict:
    """Reconstruct the occupation split and the D monotone elimination."""
    from census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt import (
        a2, k2, l2, raw_g2,
    )

    direct_e = sp.symbols("direct_e0:7")
    direct_u = sp.symbols("direct_u0:7")
    direct_v = sp.symbols("direct_v0:7")
    direct_w = sp.symbols("direct_w0:7")
    direct_raw = sp.expand(raw_g2((direct_e, direct_u, direct_v, direct_w)))
    direct_raw_terms = len(sp.Poly(
        direct_raw, *(direct_e + direct_u + direct_v + direct_w)
    ).terms())
    assert direct_raw_terms == 42

    ga = sp.symbols("ga0:7")
    gb = sp.symbols("gb0:6")
    gc = sp.symbols("gc0:6")
    gd = sp.symbols("gd0:5")

    def shift(row, rank, amount=1):
        index = rank - amount
        return row[index] if 0 <= index < len(row) else sp.Integer(0)

    w = ga
    u = tuple(ga[rank] + shift(gb, rank) for rank in range(7))
    v = tuple(ga[rank] + shift(gc, rank) for rank in range(7))
    e = tuple(
        ga[rank] + shift(gb, rank) + shift(gc, rank) + shift(gd, rank, 2)
        for rank in range(7)
    )
    raw = sp.expand(raw_g2((e, u, v, w)))
    partition = sp.expand(
        a2(ga) + l2(ga, gb) + l2(ga, gc) + k2(gb, gc) + k2(ga, gd)
    )
    assert sp.expand(raw - partition) == 0
    assert sp.expand(k2(gb, gc) - k2(gc, gb)) == 0
    live = (*gb[2:6], *gc[2:6])
    live_polynomial = sp.Poly(partition, *live)
    live_degrees = {str(variable): live_polynomial.degree(variable) for variable in live}
    assert all(degree <= 1 for degree in live_degrees.values())

    kad = sp.expand(k2(ga, gd))
    coefficients = {
        "i2_D": sp.diff(kad, gd[2]),
        "i3_D": sp.diff(kad, gd[3]),
        "i4_D": sp.diff(kad, gd[4]),
    }
    assert sp.expand(coefficients["i2_D"] - (ga[0] + 9 * ga[1] + 8 * ga[2])) == 0
    assert sp.expand(coefficients["i3_D"] - (-13 * ga[0] - 2 * ga[1])) == 0
    assert sp.expand(coefficients["i4_D"] - (-6 * ga[0])) == 0

    n, r1 = sp.symbols("N R1", positive=True)
    forest_specialization = {
        ga[0]: 1, ga[1]: n, ga[2]: r1 / 4,
    }
    specialized = {
        key: sp.expand(value.subs(forest_specialization))
        for key, value in coefficients.items()
    }
    assert specialized == {
        "i2_D": 1 + 9 * n + 2 * r1,
        "i3_D": -13 - 2 * n,
        "i4_D": -6,
    }
    return {
        "occupation_rows": "W=A, U=A+xB, V=A+xC, E=A+xB+xC+x^2D",
        "occupation_split": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)",
        "direct_raw_to_occupation_residual_zero": True,
        "direct_raw_terms": direct_raw_terms,
        "K2_BC_symmetric": True,
        "BC_live_coefficient_degrees": live_degrees,
        "BC_multi_affine": True,
        "expanded_raw_terms": len(sp.Poly(raw, *(ga + gb + gc + gd)).terms()),
        "D_coefficients_before_specialization": {
            key: str(value) for key, value in coefficients.items()
        },
        "D_coefficients_on_A_forest_ratio_row": {
            key: str(value) for key, value in specialized.items()
        },
        "D_lower_bound": (
            "Set i2(D)=0, i3(D)=binom(d,3), i4(D)=binom(d,4), while "
            "i0(D)=1 and i1(D)=d remain exact."
        ),
        "D_lower_bound_signs_exact": True,
    }


def ratio_coordinate_certificate() -> dict:
    """Audit the factorial-ratio coordinates and drop-simplex identity."""
    n = sp.symbols("N", positive=True)
    ratios = sp.symbols("R1:6", nonnegative=True)
    r1, r2, r3, r4, r5 = ratios
    row = (
        sp.Integer(1), n, r1 / 4, r1 * r2 / (24 * n),
        r1 * r2 * r3 / (192 * n**2),
        r1 * r2 * r3 * r4 / (1920 * n**3),
        r1 * r2 * r3 * r4 * r5 / (23040 * n**4),
    )
    q = tuple(sp.expand(2**rank * math.factorial(rank) * row[rank]) for rank in range(7))
    for index, ratio in enumerate(ratios, start=1):
        assert sp.expand(n * q[index + 1] - ratio * q[index]) == 0

    terminal, d4, d3, d2, d1 = sp.symbols(
        "terminal D4 D3 D2 D1", nonnegative=True
    )
    reconstructed = (
        terminal + 3 * n + d4 + d3 + d2 + d1,
        terminal + 3 * n + d4 + d3 + d2,
        terminal + 2 * n + d4 + d3,
        terminal + n + d4,
        terminal,
    )
    assert sp.expand(reconstructed[0] - 3 * n - sum(
        (terminal, d4, d3, d2, d1), sp.Integer(0)
    )) == 0
    assert sp.expand(reconstructed[0] - reconstructed[1] - d1) == 0
    assert sp.expand(reconstructed[1] - reconstructed[2] - n - d2) == 0
    assert sp.expand(reconstructed[2] - reconstructed[3] - n - d3) == 0
    assert sp.expand(reconstructed[3] - reconstructed[4] - n - d4) == 0
    return {
        "normalized_row": [str(value) for value in row],
        "ratio_identities": "N*q_(j+1)=R_j*q_j for j=1,...,5",
        "ratio_identities_exact": True,
        "drop_simplex_coordinates": {
            "R5": "terminal",
            "R4": "terminal+N+D4",
            "R3": "terminal+2N+D4+D3",
            "R2": "terminal+3N+D4+D3+D2",
            "R1": "terminal+3N+D4+D3+D2+D1",
        },
        "drop_simplex_identity_exact": True,
    }


def validate_finite() -> dict:
    report = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == FINITE_MARKER
    assert report["orders"] == [2, 14]
    assert report["unlabeled_forests"] == 15204
    assert report["nonadjacent_mark_cells"] == 1070270
    assert report["global_minimum"]["value"] == 0
    assert report["global_smallest_positive"]["value"] == 4
    assert report["algebra"]["raw_reconstruction_checked_cellwise"] is True
    assert report["completeness"]["known_unlabeled_forest_counts_checked"] is True
    assert report["completeness"]["every_unordered_nonedge_checked"] is True
    assert report["source_sha256"] == sha256(FINITE_SOURCE)
    assert sum(row["unlabeled_forests"] for row in report["rows"].values()) == 15204
    assert sum(row["nonadjacent_mark_cells"] for row in report["rows"].values()) == 1070270
    return {
        "orders_of_G": report["orders"],
        "orders_of_A": [0, 12],
        "unlabeled_forests": report["unlabeled_forests"],
        "nonadjacent_mark_cells": report["nonadjacent_mark_cells"],
        "zero_cells": report["global_zero_cells"],
        "minimum": report["global_minimum"],
        "smallest_positive": report["global_smallest_positive"],
        "ordered_cell_stream_sha256": report["ordered_cell_stream_sha256"],
    }


def expected_order_description(order: int | None) -> str:
    return (
        "ordered mB<=mC with mB,mC>=7"
        if order is None else f"mB={order}, N=13+q"
    )


def expected_bernstein_degrees(geometry: str, order: int | None) -> list[int]:
    if order is None:
        return [10, 5, 4, 3, 2, 2, 10, 10]
    if order == 0 and geometry == "connected_long":
        return [0, 5, 4, 3, 2, 2, 0, 10]
    if order == 0 and geometry == "common_neighbor":
        return [0, 0, 4, 3, 2, 2, 0, 10]
    return [5, 5, 4, 3, 2, 2, 0, 10]


def validate_cone_report(path: Path, geometry: str, order: int | None) -> dict:
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == PROBE_MARKER
    assert report["geometry"] == geometry
    assert report["d_branch"] == "coarse"
    assert report["order_branch"] == expected_order_description(order)
    assert report["corner_pairs"] == 256
    assert report["passing_corner_pairs"] == 256
    assert report["failing_corner_pairs"] == 0
    assert report["source_sha256"] == sha256(PROBE_SOURCE)
    assert report["dependencies_sha256"] == {HELPER_SOURCE.name: sha256(HELPER_SOURCE)}
    assert report["D_monotone_lower_bound"]["coefficient_i2_D"].endswith(
        "use universal zero floor"
    )
    records = report["records"]
    assert len(records) == 256
    assert [(row["B_mask"], row["C_mask"]) for row in records] == list(
        itertools.product(range(16), repeat=2)
    )
    digest = hashlib.sha256()
    coefficient_count = 0
    zero_count = 0
    degrees = None
    minimum = None
    for row in records:
        assert row["negative"] == 0
        value = Fraction(row["minimum"])
        assert value >= 0
        minimum = value if minimum is None else min(minimum, value)
        row_degrees = list(map(int, row["bernstein_degrees"]))
        degrees = row_degrees if degrees is None else degrees
        assert row_degrees == degrees
        assert row["bernstein_coefficients"] > 0
        assert row["bernstein_coefficients"] == math.prod(
            degree + 1 for degree in row_degrees
        )
        coefficient_count += row["bernstein_coefficients"]
        zero_count += row["zero"]
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]
    assert degrees == expected_bernstein_degrees(geometry, order)
    return {
        "geometry": geometry,
        "order_branch": order_label(order),
        "corner_pairs": 256,
        "bernstein_degrees": degrees,
        "bernstein_coefficients": coefficient_count,
        "zero_coefficients": zero_count,
        "minimum": str(minimum),
        "ordered_record_sha256": report["ordered_record_sha256"],
        "report_sha256": sha256(path),
    }


def validate_cones() -> list[dict]:
    rows = [
        validate_cone_report(canonical_report(geometry, order), geometry, order)
        for geometry in GEOMETRIES
        for order in ORDERS
    ]
    assert len(rows) == 16
    assert sum(row["corner_pairs"] for row in rows) == 4096
    return rows


def validate_determinism() -> dict:
    report = json.loads(AUDIT_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == DETERMINISM_MARKER
    assert report["geometries"] == list(GEOMETRIES)
    assert report["order_branches_per_geometry"] == [
        "large", *[f"small{order}" for order in range(7)]
    ]
    assert report["branch_count"] == 16
    assert report["corner_pairs"] == 4096
    assert report["all_coefficients_nonnegative"] is True
    assert report["replay_chunk_columns"] == {"1": 4096, "2": 8192}
    assert report["parallel_reports_admitted"] is False
    assert report["pre_lock_reports_admitted"] is False
    assert report["probe_source_sha256"] == sha256(PROBE_SOURCE)
    assert report["runner_source_sha256"] == sha256(RUNNER_SOURCE)
    assert report["helper_source_sha256"] == sha256(HELPER_SOURCE)
    assert report["source_sha256"] == sha256(AUDIT_SOURCE)
    assert report["large_subbatch_pairs"] == 32
    assert report["large_execution_evidence_records"] == 64
    assert report["small_execution_evidence_records"] == 28
    assert len(report["branches"]) == 16
    for row in report["branches"]:
        assert row["record_identical_across_replays"] is True
        assert row["corner_pairs"] == 256
        assert Fraction(row["minimum"]) >= 0
        assert len(row["replays"]) == 2
        geometry = row["geometry"]
        label = row["order_branch"]
        order = None if label == "large" else int(label.removeprefix("small"))
        canonical = json.loads(canonical_report(geometry, order).read_text(encoding="utf-8"))
        assert canonical["ordered_record_sha256"] == row["ordered_record_sha256"]
        for replay_row in row["replays"]:
            replay = replay_row["replay"]
            full_path = frozen_report(geometry, order, 0, 256, replay)
            assert sha256(full_path) == replay_row["full_report_sha256"]
            if order is None:
                assert len(replay_row["subbatches"]) == 16
                executions = replay_row["subbatches"]
                for start, execution in zip(range(0, 256, 16), executions):
                    subpath = frozen_report(
                        geometry, order, start, start + 16, replay, subbatch=True
                    )
                    evidence_path = execution_evidence(
                        geometry, order, start, start + 16, replay
                    )
                    assert sha256(subpath) == execution["report_sha256"]
                    assert sha256(evidence_path) == execution["evidence_sha256"]
            else:
                executions = [replay_row["execution"]]
                execution = executions[0]
                evidence_path = execution_evidence(
                    geometry, order, 0, 256, replay
                )
                assert sha256(full_path) == execution["report_sha256"]
                assert sha256(evidence_path) == execution["evidence_sha256"]
            assert all(
                execution["lock_acquired"] is True
                and execution["lock_released"] is True
                and execution["post_batch_probe_worker_count"] == 0
                for execution in executions
            )
    return {
        "branch_count": 16,
        "corner_pairs": 4096,
        "replay_chunk_columns": report["replay_chunk_columns"],
        "ordered_branch_stream_sha256": report["ordered_branch_stream_sha256"],
        "parallel_reports_admitted": False,
        "pre_lock_reports_admitted": False,
        "audit_report_sha256": sha256(AUDIT_REPORT),
    }


def validate_hashes() -> dict[str, str]:
    paths = [
        PROBE_SOURCE, HELPER_SOURCE, RUNNER_SOURCE, AUDIT_SOURCE, AUDIT_REPORT,
        FINITE_SOURCE, FINITE_REPORT,
        HERE / "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py",
        HERE / "probe_iso_leaf_cross_remainder_root.py",
        *[canonical_report(geometry, order) for geometry in GEOMETRIES for order in ORDERS],
    ]
    actual = {path.name: sha256(path) for path in paths}
    assert EXPECTED_HASHES, "dependency hash table has not been frozen"
    assert actual == EXPECTED_HASHES
    foundational_actual = {name: sha256(HERE / name) for name in FOUNDATIONAL_HASHES}
    assert foundational_actual == FOUNDATIONAL_HASHES
    return actual | foundational_actual


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--regenerate", action="store_true",
        help="regenerate the finite census and both complete serial cone replays",
    )
    args = parser.parse_args()
    if args.regenerate:
        regenerate_dependencies()

    hashes = validate_hashes()
    algebra = algebra_certificate()
    ratio_algebra = ratio_coordinate_certificate()
    finite = validate_finite()
    cones = validate_cones()
    assert sum(row["bernstein_coefficients"] for row in cones) == 958510080
    assert sum(row["zero_coefficients"] for row in cones) == 354388736
    determinism = validate_determinism()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G with distinct nonadjacent marked vertices "
            "u,v, the exact canonical no_parent_k0 rank-five whole-bundle "
            "coefficient g2 is nonnegative."
        ),
        "algebra_certificate": algebra,
        "geometry_certificate": {
            "definitions": (
                "N=|A|, Su=N_G(u), Sv=N_G(v), B=A-Sv, C=A-Su, "
                "D=A-(Su union Sv), mB=|B|, mC=|C|, d=|D|"
            ),
            "common_neighbor_count": (
                "h=|Su intersect Sv| is 0 or 1, since two common neighbors "
                "would form a 4-cycle."
            ),
            "order_identity": "d=mB+mC-N+h",
            "common_neighbor_case": (
                "If h=1, every distinct vertex of Su union Sv lies in a distinct "
                "A-component: joining any pair inside A closes a cycle through u, "
                "v, and their common neighbor. Thus components(A)>=N-d and e(A)<=d."
            ),
            "connected_no_common_case": (
                "If h=0 and u,v are connected, their unique path has length at "
                "least 3. Exactly its two endpoint neighbors may share an A-component; "
                "any second shared pair or same-side pair closes a cycle. Hence "
                "components(A)>=N-d-1 and e(A)<=d+1."
            ),
            "disconnected_case": (
                "If h=0 and u,v are disconnected, even a cross-side pair cannot "
                "share an A-component. Hence e(A)<=d, which is contained in the "
                "certified connected_long relaxation e(A)<=d+1."
            ),
            "exhaustive_certified_geometries": {
                "connected_long": "h=0, d=mB+mC-N, e(A)<=d+1; also covers disconnected",
                "common_neighbor": "h=1, d=mB+mC-N+1, e(A)<=d",
            },
            "D_range": "D is a subforest of both B and C, so 0<=d<=min(mB,mC).",
            "coefficient_box": (
                "For every m-vertex forest F and 2<=k<=5, "
                "binom(m-k+1,k)<=i_k(F)<=binom(m,k)."
            ),
            "path_floor_proof": (
                "Join components to a tree, which can only decrease independent-set "
                "counts, then use leaf deletion and Pascal induction; the path attains "
                "the lower bound, and the subset ceiling gives the upper bound."
            ),
            "D_monotone_elimination": algebra["D_lower_bound"],
            "lower_bound_chain": (
                "For each actual cell, exact monotonicity gives g2>=g2_coarse. "
                "The B,C box corner reduction and Bernstein certificates prove "
                "g2_coarse>=0 on every all-order parameter branch."
            ),
            "probe_scope_note": (
                "Only the operational --d-branch coarse row is admitted. Its code "
                "sets i2(D)=0 for every d, so no d=0 split is needed; generic legacy "
                "probe prose/field names about the optional positive branch are not "
                "used by this theorem."
            ),
        },
        "ratio_cone_certificate": {
            "coordinate_algebra": ratio_algebra,
            "normalization": "q_k=2^k*k!*a_k, rho_j=q_(j+1)/q_j, R_j=N*rho_j",
            "ratios_well_defined": (
                "A forest on N>=13 vertices has an independent set of size at least "
                "ceil(N/2)>=7, so a0,...,a6 are all positive."
            ),
            "exact_first_ratio": "R1=4*i2(A)=2N(N-1)-4e(A)",
            "edge_budget_parameters": (
                "connected_long: e(A)=(d+1)z; common_neighbor: e(A)=dz; 0<=z<=1"
            ),
            "forest_drops_for_N_at_least_13": (
                "delta1>=0, delta2>=1, delta3>=1, delta4>=1, rho5>=0"
            ),
            "simplex_partition": (
                "R1-3N=R5+N(delta4-1)+N(delta3-1)+N(delta2-1)+N*delta1; "
                "the five nonnegative summands are covered by four stick-breaking variables."
            ),
            "orientation": "Swap u,v if necessary, so mB<=mC; the expression is symmetric.",
            "order_coverage": (
                "For each geometry, either mB=0,...,6 with N=13+q, or "
                "mB=7+p and mC=7+p+q, where p,q>=0."
            ),
            "large_parameterization": (
                "d=mB*s, N=mB+mC-d+h with 0<=s<=1; the certificate may "
                "relax beyond N>=13, which only strengthens the lower bound."
            ),
            "small_parameterization": (
                "N=13+q, d=mB*s, mC=N-mB+d-h with 0<=s<=1."
            ),
            "compactification": "p=P/(1-P), q=Q/(1-Q), with P,Q in [0,1)",
            "corner_principle": (
                "After the D monotone elimination, the expression is multi-affine "
                "in i2,...,i5 of B and C, so its box minimum occurs at one of 256 corners."
            ),
            "exact_bernstein_branches": cones,
            "deterministic_duplicate_audit": determinism,
            "branch_count": len(cones),
            "corner_pairs": sum(row["corner_pairs"] for row in cones),
            "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
            "all_coefficients_nonnegative": True,
        },
        "finite_certificate": finite,
        "coverage_assembly": {
            "finite": "|A|<=12, equivalently |G|<=14",
            "all_order": "|A|>=13",
            "mark_geometry": (
                "Every nonadjacent pair is either disconnected, connected with no "
                "common neighbor, or has its unique common neighbor."
            ),
            "gap": "none within the nonadjacent subcase of no_parent_k0 g2",
        },
        "dependencies_sha256": hashes,
        "replay_mode": "regenerated every dependency" if args.regenerate else "validated frozen exact reports",
        "scope": (
            "Nonadjacent-mark no_parent_k0 g2 only. The adjacent subcase is a "
            "separate exact theorem; the other four canonical deepest-support modes, "
            "all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_nonadjacent_cells": finite["nonadjacent_mark_cells"],
        "cone_branches": len(cones),
        "corner_pairs": sum(row["corner_pairs"] for row in cones),
        "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
