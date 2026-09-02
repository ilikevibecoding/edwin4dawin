#!/usr/bin/env python3
"""Run and fail-closed validate the 56 N>=19 ratio-floor shards."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
)
RATIO_FLOOR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
)
RATIO_FLOOR_SHA256 = (
    "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
    "SPLIT_PW3_WEDGE_FLINT_ROOT"
)
MATRIX_MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
    "SPLIT_PW3_WEDGE_MATRIX_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_wedge_"
    "matrix_exact_root_20260831.json"
)
BASE_ORDER = 19
W_PARENT_MODE = "split_pw3"
RATIO_PARAMETERIZATION = (
    "u4=2t/3 and ui=(1-2t/3)ri for i=0..3, sum ri=1"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cases() -> list[tuple[str, str, int, int, int]]:
    rows: list[tuple[str, str, int, int, int]] = []
    charts = {
        "common0": (
            "low",
            "high_far",
            "high_band",
            "high_near_lowedge",
            "high_near_highedge",
        ),
        "common1": ("low", "high"),
    }
    for geometry, geometry_charts in charts.items():
        rows.extend(itertools.product(
            (geometry,), geometry_charts, (0, 1), (0, 1), (0, 1)
        ))
    assert len(rows) == 56
    return rows


def report_path(case: tuple[str, str, int, int, int]) -> Path:
    geometry, chart, bmask, cmask, d2mask = case
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_wedge_"
        f"{geometry}_{chart}_B{bmask:02d}_C{cmask:02d}_D2{d2mask}_"
        f"{W_PARENT_MODE}_N{BASE_ORDER}_ratiofloor_flint_probe_root_20260831.json"
    )


def validate(
    path: Path,
    case: tuple[str, str, int, int, int],
    source_hash: str,
) -> dict:
    geometry, chart, bmask, cmask, d2mask = case
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == MARKER
    assert report["geometry"] == geometry
    assert report["order_chart"] == chart
    assert report["B_mask"] == bmask
    assert report["C_mask"] == cmask
    assert report["D2_mask"] == d2mask
    assert report["W_parent_endpoint_mode"] == W_PARENT_MODE
    assert report["ratio_floor_parameterization"] == RATIO_PARAMETERIZATION
    assert report["ratio_floor_report_sha256"] == RATIO_FLOOR_SHA256
    assert report["source_sha256"] == source_hash
    assert report["negative_lower_controls"] == 0
    assert report["negative_sign_controls"] == 0
    assert len(report["sign_certificates"]) == 14
    assert all(
        certificate["negative"] == 0
        for certificate in report["sign_certificates"].values()
    )
    assert report["ordinary_lower_certificate"]["negative"] == 0
    return report


def run_case(
    case: tuple[str, str, int, int, int],
    source_hash: str,
    force: bool,
):
    path = report_path(case)
    if path.exists() and not force:
        try:
            return case, "cached", validate(path, case, source_hash)
        except Exception:
            pass
    geometry, chart, bmask, cmask, d2mask = case
    command = [
        sys.executable,
        str(PRODUCER),
        "--geometry", geometry,
        "--order-chart", chart,
        "--b-mask", str(bmask),
        "--c-mask", str(cmask),
        "--d2-mask", str(d2mask),
        "--w-parent-mode", W_PARENT_MODE,
        "--chunk-columns", "4096",
        "--base-order", str(BASE_ORDER),
        "--ratio-floor",
    ]
    completed = subprocess.run(
        command, cwd=HERE, text=True, capture_output=True, check=False
    )
    if completed.returncode != 0 or MARKER not in completed.stdout:
        raise RuntimeError({
            "case": case,
            "returncode": completed.returncode,
            "stdout_tail": completed.stdout[-2000:],
            "stderr_tail": completed.stderr[-2000:],
        })
    return case, "computed", validate(path, case, source_hash)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.workers <= 4
    assert sha256(RATIO_FLOOR) == RATIO_FLOOR_SHA256

    source_hash = sha256(PRODUCER)
    matrix_cases = cases()
    reports: dict[tuple[str, str, int, int, int], dict] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_case, case, source_hash, args.force): case
            for case in matrix_cases
        }
        for future in as_completed(futures):
            case, disposition, report = future.result()
            reports[case] = report
            print(json.dumps({
                "case": case,
                "disposition": disposition,
                "lower_minimum": report["ordinary_lower_certificate"]["minimum"],
                "report": report_path(case).name,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)

    assert len(reports) == 56
    rows = []
    for case in matrix_cases:
        report = reports[case]
        path = report_path(case)
        lower = report["ordinary_lower_certificate"]
        signs = report["sign_certificates"]
        rows.append({
            "geometry": case[0],
            "order_chart": case[1],
            "B_mask": case[2],
            "C_mask": case[3],
            "D2_mask": case[4],
            "report": path.name,
            "report_sha256": sha256(path),
            "lower_ordered_record_sha256": lower["ordered_record_sha256"],
            "lower_simplex_coefficients": lower["simplex_coefficients"],
            "lower_bernstein_coefficients": sum(
                record["bernstein_coefficients"] for record in lower["records"]
            ),
            "sign_simplex_coefficients": sum(
                certificate["simplex_coefficients"]
                for certificate in signs.values()
            ),
            "sign_bernstein_coefficients": sum(
                record["bernstein_coefficients"]
                for certificate in signs.values()
                for record in certificate["records"]
            ),
            "minimum": lower["minimum"],
        })

    manifest = {
        "marker": MATRIX_MARKER,
        "status": (
            "PASS exact N>=19 large-induced-order nonadjacent ordinary-parent "
            "ratio-floor matrix; forced independent replay and fail-closed "
            "all-order assembly pending"
        ),
        "source": PRODUCER.name,
        "source_sha256": source_hash,
        "ratio_floor_report": RATIO_FLOOR.name,
        "ratio_floor_report_sha256": RATIO_FLOOR_SHA256,
        "coverage": (
            "N>=19, ordered induced orders 7<=mB<=mC, common0 on five "
            "exhaustive order/edge charts, common1 on low/high charts, all "
            "B,C rank-two corners, and both D rank-two endpoints"
        ),
        "method": (
            "The exact PW2 ratio floor gives active rank mass at least 1/3. "
            "PW2 is dropped with a proved positive coefficient; PW3 is split "
            "into its positive 2*a4 part and a paid negative cap; PW4 and the "
            "other harmful coordinates use forest subset ceilings."
        ),
        "shards": len(rows),
        "lower_simplex_coefficients": sum(
            row["lower_simplex_coefficients"] for row in rows
        ),
        "lower_bernstein_coefficients": sum(
            row["lower_bernstein_coefficients"] for row in rows
        ),
        "sign_simplex_coefficients": sum(
            row["sign_simplex_coefficients"] for row in rows
        ),
        "sign_bernstein_coefficients": sum(
            row["sign_bernstein_coefficients"] for row in rows
        ),
        "negative_lower_controls": 0,
        "negative_sign_controls": 0,
        "minimum": str(min(Fraction(row["minimum"]) for row in rows)),
        "rows": rows,
        "scope": (
            "Large induced-order theorem component only. Small induced orders, "
            "finite N=14..18, forced replay, and fail-closed theorem assembly "
            "remain separate obligations."
        ),
        "runner_source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: manifest[key] for key in (
        "marker", "shards", "lower_simplex_coefficients",
        "lower_bernstein_coefficients", "sign_simplex_coefficients",
        "sign_bernstein_coefficients", "negative_lower_controls",
        "negative_sign_controls", "minimum",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MATRIX_MARKER)


if __name__ == "__main__":
    main()
