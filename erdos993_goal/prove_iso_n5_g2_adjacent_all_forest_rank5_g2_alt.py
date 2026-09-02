#!/usr/bin/env python3
"""Fail-closed all-order theorem for adjacent-mark rank-five no-parent g2.

For a forest G with adjacent marked vertices u,v, let

    A=G-u-v,  B=G-N[v],  C=G-N[u].

The exact occupation split is

    g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C).

Orders |A|<=12 are exhausted exactly.  For |A|>=13, the correlated edge
budget, exact factorial-ratio drop cone, path coefficient floors, edgeless
ceilings, and all 256 multi-affine B,C corners give an exact tensor Bernstein
certificate on eight exhaustive order branches.

This proves the adjacent-mark no-parent g2 branch only.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_all_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_ALL_FOREST_RANK5_G2_ALT"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
FINITE_MARKER = "PASS_EXACT_FINITE_ISO_N5_G2_ADJACENT_ALL_FOREST_RANK5_G2_ALT"

PROBE_SOURCE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
ASSEMBLY_SOURCE = HERE / "assemble_iso_n5_g2_adjacent_large_batches_rank5_g2_alt.py"
SERIAL_RUNNER_SOURCE = HERE / "run_iso_n5_g2_adjacent_large_serial_replay_rank5_g2_alt.py"
SUBBATCH_ASSEMBLY_SOURCE = HERE / "assemble_iso_n5_g2_adjacent_serial_subbatches_rank5_g2_alt.py"
DETERMINISM_AUDIT_SOURCE = HERE / "audit_iso_n5_g2_adjacent_large_serial_replays_rank5_g2_alt.py"
DETERMINISM_AUDIT_REPORT = HERE / "iso_n5_g2_adjacent_large_serial_determinism_audit_rank5_g2_alt_20260830.json"
DETERMINISM_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_LARGE_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
SERIAL_RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_LARGE_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"
SMALL_SERIAL_RUNNER_SOURCE = HERE / "run_iso_n5_g2_adjacent_small_serial_replay_rank5_g2_alt.py"
SMALL_DETERMINISM_AUDIT_SOURCE = HERE / "audit_iso_n5_g2_adjacent_small_serial_replays_rank5_g2_alt.py"
SMALL_DETERMINISM_AUDIT_REPORT = HERE / "iso_n5_g2_adjacent_small_serial_determinism_audit_rank5_g2_alt_20260830.json"
SMALL_DETERMINISM_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
SMALL_SERIAL_RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"
FINITE_SOURCE = HERE / "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py"
FINITE_REPORT = HERE / "iso_n5_g2_adjacent_all_forest_finite_census_rank5_g2_alt_20260830.json"
LARGE_REPORT = HERE / "iso_n5_g2_adjacent_order_box_edge_budget_flint_probe_rank5_g2_alt_20260830.json"
SMALL_REPORTS = {
    order: HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_small{order}_0_256_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )
    for order in range(7)
}
SERIAL_REPLAY_REPORTS = {
    (start, replay): HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{start + 64}_"
        f"serial_replay{replay}_rank5_g2_alt_20260830.json"
    )
    for start in (0, 64, 128, 192)
    for replay in (3, 4)
}

# Filled only after every dependency has been replayed successfully.  The
# theorem refuses to run until these exact source/report hashes are frozen.
EXPECTED_HASHES = {
    "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py": "A1F32B17DBF73589EB1E11C76FF0567EED379FB3EA0A16CB3C48A1303D0EB478",
    "assemble_iso_n5_g2_adjacent_large_batches_rank5_g2_alt.py": "D155399DF213B0A5FD3B35F3706DE7A5E861014D2FAB15CD4E22FF993FA0927A",
    "run_iso_n5_g2_adjacent_large_serial_replay_rank5_g2_alt.py": "85C4AAC0F8960DD5E00860932E84094F42898CE8286A96FFF9DD40383C2C7A55",
    "assemble_iso_n5_g2_adjacent_serial_subbatches_rank5_g2_alt.py": "BDE6210F3FBE49C1C91218BEB3A20FD5CEE6F6BF2959A49118F7FF819BC34F9D",
    "audit_iso_n5_g2_adjacent_large_serial_replays_rank5_g2_alt.py": "229AB1BEAD910C27378BB96EF2B166124782E37F3966468E6B61305639C4E816",
    "iso_n5_g2_adjacent_large_serial_determinism_audit_rank5_g2_alt_20260830.json": "1CB177A70FE50CD930428D26D88436651AAC111A1D4E467DB4CF9BE6A1B3AAC8",
    "run_iso_n5_g2_adjacent_small_serial_replay_rank5_g2_alt.py": "3354FD4A27EFBEA6B94BC630DF9549E7E6AEB2B5A846BB149EF6B35CA302E4D7",
    "audit_iso_n5_g2_adjacent_small_serial_replays_rank5_g2_alt.py": "3FD26EF30CEBE8BF4ACF93311F8E4DAED23A77B1FC40FC228968B2BB6A7A5625",
    "iso_n5_g2_adjacent_small_serial_determinism_audit_rank5_g2_alt_20260830.json": "D8880CB8A477BD508EA86C03679AC2BCCCFD89308DF7A4EE85189B1CB36596A6",
    "census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt.py": "A9A8C45130DECE486F08B1B78127B1D73D6891139DE5C1A3D102189EF8CC6268",
    "iso_n5_g2_adjacent_all_forest_finite_census_rank5_g2_alt_20260830.json": "F303810A1637A962824BC0318AE38EF64AE2EE360BE1590861E38C8338C4CB0D",
    "iso_n5_g2_adjacent_order_box_edge_budget_flint_probe_rank5_g2_alt_20260830.json": "3BAB5DAC857DD1E271D1F34215FD55689B8700D1271A4C59E805A82DD3068CEC",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_0_64_serial_replay3_rank5_g2_alt_20260830.json": "01E6B8A4CAA7A5D44647874394F03642E7025C4C41D01ADFD4B98AC8F40DF14A",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_0_64_serial_replay4_rank5_g2_alt_20260830.json": "01E6B8A4CAA7A5D44647874394F03642E7025C4C41D01ADFD4B98AC8F40DF14A",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_64_128_serial_replay3_rank5_g2_alt_20260830.json": "9E532BEFCCE89E926C971EC58F107AA9656591D9214E506ECBD63EE7DAC84A2F",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_64_128_serial_replay4_rank5_g2_alt_20260830.json": "9E532BEFCCE89E926C971EC58F107AA9656591D9214E506ECBD63EE7DAC84A2F",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_128_192_serial_replay3_rank5_g2_alt_20260830.json": "576EBD36D50DC8837DBB737959D8EFD5A377FCDFF80B23A11BBBA79158C0CB43",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_128_192_serial_replay4_rank5_g2_alt_20260830.json": "576EBD36D50DC8837DBB737959D8EFD5A377FCDFF80B23A11BBBA79158C0CB43",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_192_256_serial_replay3_rank5_g2_alt_20260830.json": "E0C2E312E03D02BDE28C54EA34E3E87F83CE9ECC085B28BEEB8124ED150CAFE3",
    "iso_n5_g2_adjacent_order_box_edge_budget_large_192_256_serial_replay4_rank5_g2_alt_20260830.json": "E0C2E312E03D02BDE28C54EA34E3E87F83CE9ECC085B28BEEB8124ED150CAFE3",
    "iso_n5_g2_adjacent_order_box_edge_budget_small0_0_256_flint_probe_rank5_g2_alt_20260830.json": "402966FCC7B70F27607A78CD52C0C6079D1031492FBB88E9EB628A99539300B0",
    "iso_n5_g2_adjacent_order_box_edge_budget_small1_0_256_flint_probe_rank5_g2_alt_20260830.json": "1002F35C38E8B452843526FE59ADCCD2D868027B1E1905277C4DFE4C57D01BE6",
    "iso_n5_g2_adjacent_order_box_edge_budget_small2_0_256_flint_probe_rank5_g2_alt_20260830.json": "95E830251D936AD1B210B05FCF4BD1433F1017B0D54970F3D0AFF1082A648306",
    "iso_n5_g2_adjacent_order_box_edge_budget_small3_0_256_flint_probe_rank5_g2_alt_20260830.json": "F70636F7EE13853F3299B991C7273A5F579B42E94A35A1B215229A98F80D1394",
    "iso_n5_g2_adjacent_order_box_edge_budget_small4_0_256_flint_probe_rank5_g2_alt_20260830.json": "E97288EA6986E0E1F2BE3D488A4157E4B7B66068FD3EA8E424A84EEFE89E7CA5",
    "iso_n5_g2_adjacent_order_box_edge_budget_small5_0_256_flint_probe_rank5_g2_alt_20260830.json": "DC2612349EB8D256ACD3C26B51454BF3206E7D6FDA08E12AADFEED97578F8AAE",
    "iso_n5_g2_adjacent_order_box_edge_budget_small6_0_256_flint_probe_rank5_g2_alt_20260830.json": "24F65FFAAC56C17755768CA29E11DDB0339796CCB1F020723E904309359BED3F",
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
    for replay in (3, 4):
        chunk_columns = 4096 if replay == 3 else 8192
        rerun([
            SERIAL_RUNNER_SOURCE.name, "--replay", str(replay),
            "--starts", "0", "64", "128", "192",
            "--subbatch-size", "16", "--chunk-columns", str(chunk_columns),
        ], SERIAL_RUNNER_MARKER)
    rerun([DETERMINISM_AUDIT_SOURCE.name], DETERMINISM_MARKER)
    rerun([ASSEMBLY_SOURCE.name], PROBE_MARKER)
    for replay, chunk_columns in ((1, 4096), (2, 8192)):
        rerun([
            SMALL_SERIAL_RUNNER_SOURCE.name, "--replay", str(replay),
            "--orders", *map(str, range(7)),
            "--chunk-columns", str(chunk_columns),
        ], SMALL_SERIAL_RUNNER_MARKER)
    rerun([SMALL_DETERMINISM_AUDIT_SOURCE.name], SMALL_DETERMINISM_MARKER)


def algebra_certificate() -> dict:
    """Reconstruct the scaled coupled form and audit its multi-affinity."""
    from census_iso_n5_g2_adjacent_all_forest_rank5_g2_alt import (
        raw_g2 as raw_g2_direct,
    )

    n, mb, mc = sp.symbols("N mB mC", positive=True)
    r1, r2, r3, r4, r5 = sp.symbols("R1 R2 R3 R4 R5", nonnegative=True)
    b2, b3, b4, b5 = sp.symbols("b2 b3 b4 b5", nonnegative=True)
    c2, c3, c4, c5 = sp.symbols("c2 c3 c4 c5", nonnegative=True)
    a = (
        sp.Integer(1), n, r1 / 4, r1 * r2 / (24 * n),
        r1 * r2 * r3 / (192 * n**2),
        r1 * r2 * r3 * r4 / (1920 * n**3),
        r1 * r2 * r3 * r4 * r5 / (23040 * n**4),
    )
    b = (sp.Integer(1), mb, b2, b3, b4, b5)
    c = (sp.Integer(1), mc, c2, c3, c4, c5)

    def at(row, rank):
        return row[rank] if 0 <= rank < len(row) else sp.Integer(0)

    def a2(row):
        return (
            4 * at(row, 0) * at(row, 3) - 3 * at(row, 0) * at(row, 4)
            - 15 * at(row, 0) * at(row, 5) - 6 * at(row, 0) * at(row, 6)
            + 12 * at(row, 1) * at(row, 2) + 8 * at(row, 1) * at(row, 3)
            - 19 * at(row, 1) * at(row, 4) - 14 * at(row, 1) * at(row, 5)
            + 11 * at(row, 2) ** 2 + 18 * at(row, 2) * at(row, 3)
            - 2 * at(row, 2) * at(row, 4) + 6 * at(row, 3) ** 2
        )

    def l2(left, right):
        return (
            4 * at(left, 0) * at(right, 2) - at(left, 0) * at(right, 3)
            - 14 * at(left, 0) * at(right, 4) - 6 * at(left, 0) * at(right, 5)
            + 8 * at(left, 1) * at(right, 1) + 9 * at(left, 1) * at(right, 2)
            - 4 * at(left, 1) * at(right, 3) - 8 * at(left, 1) * at(right, 4)
            + 4 * at(left, 2) * at(right, 0) + 9 * at(left, 2) * at(right, 1)
            + 20 * at(left, 2) * at(right, 2) + 6 * at(left, 2) * at(right, 3)
            - at(left, 3) * at(right, 0) - 4 * at(left, 3) * at(right, 1)
            + 6 * at(left, 3) * at(right, 2) - 14 * at(left, 4) * at(right, 0)
            - 8 * at(left, 4) * at(right, 1) - 6 * at(left, 5) * at(right, 0)
        )

    def k2(left, right):
        return (
            4 * at(left, 0) * at(right, 1) + at(left, 0) * at(right, 2)
            - 13 * at(left, 0) * at(right, 3) - 6 * at(left, 0) * at(right, 4)
            + 4 * at(left, 1) * at(right, 0) + 6 * at(left, 1) * at(right, 1)
            + 9 * at(left, 1) * at(right, 2) - 2 * at(left, 1) * at(right, 3)
            + at(left, 2) * at(right, 0) + 9 * at(left, 2) * at(right, 1)
            + 8 * at(left, 2) * at(right, 2) - 13 * at(left, 3) * at(right, 0)
            - 2 * at(left, 3) * at(right, 1) - 6 * at(left, 4) * at(right, 0)
        )

    # Independently reconstruct the occupation split from the direct 42-term
    # raw-row formula before imposing any factorial-ratio coordinates.
    generic_a = sp.symbols("ga0:7")
    generic_b = sp.symbols("gb0:6")
    generic_c = sp.symbols("gc0:6")

    def shifted(row, rank):
        return row[rank - 1] if 1 <= rank <= len(row) else sp.Integer(0)

    generic_w = generic_a
    generic_u = tuple(generic_a[rank] + shifted(generic_b, rank) for rank in range(7))
    generic_v = tuple(generic_a[rank] + shifted(generic_c, rank) for rank in range(7))
    generic_e = tuple(
        generic_a[rank] + shifted(generic_b, rank) + shifted(generic_c, rank)
        for rank in range(7)
    )
    generic_raw = sp.expand(raw_g2_direct((generic_e, generic_u, generic_v, generic_w)))
    generic_partition = sp.expand(
        a2(generic_a) + l2(generic_a, generic_b) + l2(generic_a, generic_c)
        + k2(generic_b, generic_c)
    )
    assert sp.expand(generic_raw - generic_partition) == 0

    coupled = sp.expand(a2(a) + l2(a, b) + l2(a, c) + k2(b, c))
    scaled = sp.cancel(46080 * n**4 * coupled)
    numerator, denominator = sp.fraction(scaled)
    assert denominator == 1
    live = (b2, b3, b4, b5, c2, c3, c4, c5)
    polynomial = sp.Poly(sp.expand(numerator), *live)
    degrees = {str(variable): polynomial.degree(variable) for variable in live}
    assert all(degree <= 1 for degree in degrees.values())
    return {
        "occupation_split": "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)",
        "direct_raw_reconstruction_terms": len(sp.Poly(generic_raw).terms()),
        "direct_raw_to_occupation_residual_zero": True,
        "normalized_A_row": (
            "a0=1,a1=N,a2=R1/4,a3=R1R2/(24N),a4=R1R2R3/(192N^2),"
            "a5=R1R2R3R4/(1920N^3),a6=R1R2R3R4R5/(23040N^4)"
        ),
        "positive_multiplier": "46080*N^4",
        "scaled_terms": len(sp.Poly(sp.expand(numerator)).terms()),
        "scaled_expression_sha256": hashlib.sha256(str(sp.expand(numerator)).encode()).hexdigest().upper(),
        "multi_affine_degrees": degrees,
        "all_eight_live_degrees_at_most_one": True,
        "corner_principle": (
            "A multi-affine polynomial attains its minimum on a rectangular "
            "box at one of its 2^8=256 corners."
        ),
    }


def validate_finite() -> dict:
    report = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == FINITE_MARKER
    assert report["orders"] == [2, 14]
    assert report["unlabeled_forests"] == 15204
    assert report["adjacent_mark_cells"] == 165944
    assert report["global_minimum"]["value"] == 0
    assert report["algebra"]["raw_reconstruction_checked_cellwise"] is True
    assert report["completeness"]["known_unlabeled_forest_counts_checked"] is True
    assert report["completeness"]["every_edge_checked"] is True
    assert report["source_sha256"] == sha256(FINITE_SOURCE)
    assert sum(row["unlabeled_forests"] for row in report["rows"].values()) == 15204
    assert sum(row["adjacent_mark_cells"] for row in report["rows"].values()) == 165944
    return {
        "orders_of_G": report["orders"],
        "orders_of_A": [0, 12],
        "unlabeled_forests": report["unlabeled_forests"],
        "adjacent_mark_cells": report["adjacent_mark_cells"],
        "minimum": report["global_minimum"],
        "smallest_positive": report["global_smallest_positive"],
        "ordered_cell_stream_sha256": report["ordered_cell_stream_sha256"],
    }


def validate_cone_report(path: Path, branch: str, expected_degrees: list[int]) -> dict:
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == PROBE_MARKER
    assert report["branch"] == branch
    assert report["corner_pairs"] == 256
    assert report["passing_corner_pairs"] == 256
    assert report["failing_corner_pairs"] == 0
    assert report["source_sha256"] == sha256(PROBE_SOURCE)
    records = report["records"]
    assert len(records) == 256
    assert [(row["B_mask"], row["C_mask"]) for row in records] == list(
        itertools.product(range(16), repeat=2)
    )
    digest = hashlib.sha256()
    coefficient_count = 0
    zero_count = 0
    for row in records:
        assert row["negative"] == 0
        assert Fraction(row["minimum"]) >= 0
        assert row["bernstein_degrees"] == expected_degrees
        assert row["bernstein_coefficients"] > 0
        coefficient_count += row["bernstein_coefficients"]
        zero_count += row["zero"]
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]
    return {
        "branch": branch,
        "corner_pairs": 256,
        "bernstein_degrees": expected_degrees,
        "bernstein_coefficients": coefficient_count,
        "zero_coefficients": zero_count,
        "minimum": str(min(Fraction(row["minimum"]) for row in records)),
        "ordered_record_sha256": report["ordered_record_sha256"],
        "report_sha256": sha256(path),
    }


def validate_cones() -> list[dict]:
    rows = [validate_cone_report(
        LARGE_REPORT,
        "adjacent marks, ordered mB<=mC, mB,mC>=7",
        [10, 5, 4, 3, 2, 2, 10, 10],
    )]
    for order in range(7):
        rows.append(validate_cone_report(
            SMALL_REPORTS[order],
            f"adjacent marks, mB={order}, mC>=7, |A|>=13",
            [0, 0, 4, 3, 2, 2, 0, 10]
            if order == 0 else [5, 5, 4, 3, 2, 2, 0, 10],
        ))
    assert sum(row["corner_pairs"] for row in rows) == 2048
    return rows


def validate_determinism() -> dict:
    report = json.loads(DETERMINISM_AUDIT_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == DETERMINISM_MARKER
    assert report["corner_pairs"] == 256
    assert report["parallel_reports_admitted"] is False
    assert report["trusted_replays"] == [3, 4]
    assert report["replay_chunk_columns"] == {"3": 4096, "4": 8192}
    assert report["pre_reference_replays_admitted"] is False
    assert report["probe_source_sha256"] == sha256(PROBE_SOURCE)
    assert report["serial_procedure_sources_sha256"] == {
        SERIAL_RUNNER_SOURCE.name: sha256(SERIAL_RUNNER_SOURCE),
        SUBBATCH_ASSEMBLY_SOURCE.name: sha256(SUBBATCH_ASSEMBLY_SOURCE),
    }
    assert len(report["batches"]) == 4
    assert all(row["byte_identical"] is True for row in report["batches"])
    assert report["subbatch_count"] == 16
    assert len(report["subbatch_execution_evidence"]) == 16
    assert sum(
        len(row["replays"]) for row in report["subbatch_execution_evidence"]
    ) == 32
    assert all(
        row["record_identical_across_replays"] is True
        and len(row["replays"]) == 2
        and all(
            replay["lock_acquired"] is True
            and replay["lock_released"] is True
            and replay["post_batch_probe_worker_count"] == 0
            for replay in row["replays"]
        )
        for row in report["subbatch_execution_evidence"]
    )
    large = json.loads(LARGE_REPORT.read_text(encoding="utf-8"))
    assert report["merged_ordered_record_sha256"] == large["ordered_record_sha256"]
    return {
        "corner_pairs": report["corner_pairs"],
        "merged_ordered_record_sha256": report["merged_ordered_record_sha256"],
        "replay_chunk_columns": report["replay_chunk_columns"],
        "batches": report["batches"],
        "parallel_reports_admitted": False,
        "audit_report_sha256": sha256(DETERMINISM_AUDIT_REPORT),
    }


def validate_small_determinism() -> dict:
    report = json.loads(SMALL_DETERMINISM_AUDIT_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == SMALL_DETERMINISM_MARKER
    assert report["small_orders"] == list(range(7))
    assert report["corner_pairs_per_order"] == 256
    assert report["total_corner_pairs"] == 1792
    assert report["all_coefficients_nonnegative"] is True
    assert report["replay_chunk_columns"] == {"1": 4096, "2": 8192}
    assert report["parallel_reports_admitted"] is False
    assert report["pre_lock_reports_admitted"] is False
    assert report["probe_source_sha256"] == sha256(PROBE_SOURCE)
    assert report["runner_source_sha256"] == sha256(SMALL_SERIAL_RUNNER_SOURCE)
    assert report["source_sha256"] == sha256(SMALL_DETERMINISM_AUDIT_SOURCE)
    assert len(report["orders"]) == 7
    assert all(
        row["small_order"] == order
        and row["record_identical_across_replays"] is True
        and len(row["replays"]) == 2
        for order, row in enumerate(report["orders"])
    )
    for order, path in SMALL_REPORTS.items():
        canonical = json.loads(path.read_text(encoding="utf-8"))
        assert canonical["ordered_record_sha256"] == report["orders"][order][
            "ordered_record_sha256"
        ]
    return {
        "small_orders": report["small_orders"],
        "total_corner_pairs": report["total_corner_pairs"],
        "replay_chunk_columns": report["replay_chunk_columns"],
        "all_coefficients_nonnegative": True,
        "orders": report["orders"],
        "parallel_reports_admitted": False,
        "audit_report_sha256": sha256(SMALL_DETERMINISM_AUDIT_REPORT),
    }


def validate_hashes() -> dict[str, str]:
    paths = [
        PROBE_SOURCE, ASSEMBLY_SOURCE, SERIAL_RUNNER_SOURCE,
        SUBBATCH_ASSEMBLY_SOURCE, DETERMINISM_AUDIT_SOURCE,
        DETERMINISM_AUDIT_REPORT, SMALL_SERIAL_RUNNER_SOURCE,
        SMALL_DETERMINISM_AUDIT_SOURCE, SMALL_DETERMINISM_AUDIT_REPORT,
        FINITE_SOURCE, FINITE_REPORT,
        LARGE_REPORT, *SERIAL_REPLAY_REPORTS.values(), *SMALL_REPORTS.values(),
    ]
    actual = {path.name: sha256(path) for path in paths}
    assert actual == EXPECTED_HASHES
    foundational_actual = {name: sha256(HERE / name) for name in FOUNDATIONAL_HASHES}
    assert foundational_actual == FOUNDATIONAL_HASHES
    return actual | foundational_actual


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--regenerate", action="store_true",
        help="regenerate every finite and Bernstein dependency before assembly",
    )
    args = parser.parse_args()
    if args.regenerate:
        regenerate_dependencies()

    hashes = validate_hashes()
    algebra = algebra_certificate()
    finite = validate_finite()
    cones = validate_cones()
    determinism = validate_determinism()
    small_determinism = validate_small_determinism()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G with distinct adjacent marked vertices u,v, "
            "the exact no-parent rank-five whole-bundle coefficient g2 is nonnegative."
        ),
        "algebra_certificate": algebra,
        "geometry_certificate": {
            "definitions": "N=|A|, mB=|B|, mC=|C|, r=mB+mC-N",
            "component_argument": (
                "The neighbors of u and v remaining in A are disjoint. No component "
                "of A contains two such neighbors on one side or neighbors from both "
                "sides, since either event together with uv creates a cycle. Hence A "
                "has at least 2N-mB-mC=N-r components."
            ),
            "edge_budget": "e(A)=N-components(A)<=r",
            "parameter_range": "0<=r<=min(mB,mC)",
            "coefficient_box": (
                "For every m-vertex forest F and 2<=k<=5, "
                "binom(m-k+1,k)<=i_k(F)<=binom(m,k)."
            ),
            "path_floor_proof": (
                "Join components to a tree, which can only decrease independent-set "
                "counts, then apply leaf deletion and Pascal induction; the path "
                "attains the lower bound, and the subset ceiling gives the upper bound."
            ),
        },
        "ratio_cone_certificate": {
            "normalization": "q_k=2^k*k!*a_k, rho_j=q_(j+1)/q_j, R_j=N*rho_j",
            "exact_first_ratio": "R1=2N(N-1)-4e(A)",
            "forest_drops_for_N_at_least_13": (
                "delta1>=0, delta2>=1, delta3>=1, delta4>=1, rho5>=0"
            ),
            "simplex_partition": (
                "R1-3N=R5+N(delta4-1)+N(delta3-1)+"
                "N(delta2-1)+N*delta1; five nonnegative summands are "
                "covered by four stick-breaking variables."
            ),
            "order_coverage": (
                "After swapping u,v assume mB<=mC. Either mB=0,...,6, or "
                "mB=7+p and mC=7+p+q with p,q>=0."
            ),
            "compactification": "p=P/(1-P), q=Q/(1-Q), with P,Q in [0,1)",
            "exact_bernstein_branches": cones,
            "large_branch_deterministic_duplicate_audit": determinism,
            "small_branches_deterministic_duplicate_audit": small_determinism,
            "branch_count": len(cones),
            "corner_pairs": sum(row["corner_pairs"] for row in cones),
            "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
            "all_coefficients_nonnegative": True,
        },
        "finite_certificate": finite,
        "coverage_assembly": {
            "finite": "|A|<=12, equivalently |G|<=14",
            "all_order": "|A|>=13",
            "orientation": "g2 and the B,C coefficient box are symmetric under swapping u,v",
            "gap": "none within the adjacent-mark no-parent g2 branch",
        },
        "dependencies_sha256": hashes,
        "replay_mode": "regenerated every dependency" if args.regenerate else "validated frozen exact reports",
        "scope": (
            "Adjacent-mark no-parent g2 only. Nonadjacent no-parent cells, the other "
            "four canonical deepest-support modes, all N5, and Erdos Problem 993 "
            "remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_adjacent_cells": finite["adjacent_mark_cells"],
        "cone_branches": len(cones),
        "corner_pairs": sum(row["corner_pairs"] for row in cones),
        "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in cones),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
