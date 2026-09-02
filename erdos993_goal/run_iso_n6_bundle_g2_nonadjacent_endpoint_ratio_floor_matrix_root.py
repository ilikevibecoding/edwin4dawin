#!/usr/bin/env python3
"""Run and fail-closed validate the 112 N>=19 endpoint G2 shards."""

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
    "probe_iso_n6_bundle_g2_nonadjacent_endpoint_"
    "ratio_floor_wedge_flint_root.py"
)
RATIO_FLOOR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_"
    "exact_root_20260831.json"
)
RATIO_FLOOR_SHA256 = (
    "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
)
REDUCTION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
    "exact_root_20260831.json"
)
REDUCTION_SHA256 = (
    "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_RATIO_FLOOR_"
    "WEDGE_FLINT_ROOT"
)
MATRIX_MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_RATIO_FLOOR_"
    "MATRIX_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_"
    "exact_root_20260831.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cases():
    rows = []
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
            (geometry,),
            geometry_charts,
            ("B_le_C", "B_ge_C"),
            (0, 1),
            (0, 1),
            (0, 1),
        ))
    assert len(rows) == 112
    return rows


def report_path(case) -> Path:
    geometry, chart, orientation, bmask, cmask, d2mask = case
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_"
        f"{geometry}_{chart}_{orientation}_B{bmask}_C{cmask}_D2{d2mask}_"
        "N19_flint_probe_root_20260831.json"
    )


def validate(path: Path, case, source_hash: str) -> dict:
    geometry, chart, orientation, bmask, cmask, d2mask = case
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == MARKER
    assert report["geometry"] == geometry
    assert report["order_chart"] == chart
    assert report["orientation"] == orientation
    assert report["B_mask"] == bmask
    assert report["C_mask"] == cmask
    assert report["D2_mask"] == d2mask
    assert report["negative_controls"] == 0
    assert report["endpoint_lower_certificate"]["negative"] == 0
    assert report["ratio_floor_report_sha256"] == RATIO_FLOOR_SHA256
    assert report["large_corner_reduction_report_sha256"] == REDUCTION_SHA256
    assert report["source_sha256"] == source_hash
    return report


def run_case(case, source_hash: str, force: bool):
    path = report_path(case)
    if path.exists() and not force:
        try:
            return case, "cached", validate(path, case, source_hash)
        except Exception:
            pass
    geometry, chart, orientation, bmask, cmask, d2mask = case
    completed = subprocess.run([
        sys.executable,
        str(PRODUCER),
        "--geometry", geometry,
        "--order-chart", chart,
        "--orientation", orientation,
        "--b-mask", str(bmask),
        "--c-mask", str(cmask),
        "--d2-mask", str(d2mask),
        "--chunk-columns", "4096",
    ], cwd=HERE, text=True, capture_output=True, check=False)
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
    assert sha256(REDUCTION) == REDUCTION_SHA256
    source_hash = sha256(PRODUCER)
    matrix_cases = cases()
    reports = {}
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
                "minimum": report["endpoint_lower_certificate"]["minimum"],
                "report": report_path(case).name,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)

    assert len(reports) == 112
    rows = []
    for case in matrix_cases:
        report = reports[case]
        path = report_path(case)
        certificate = report["endpoint_lower_certificate"]
        rows.append({
            "geometry": case[0],
            "order_chart": case[1],
            "orientation": case[2],
            "B_mask": case[3],
            "C_mask": case[4],
            "D2_mask": case[5],
            "report": path.name,
            "report_sha256": sha256(path),
            "ordered_record_sha256": certificate["ordered_record_sha256"],
            "simplex_coefficients": certificate["simplex_coefficients"],
            "bernstein_coefficients": sum(
                record["bernstein_coefficients"]
                for record in certificate["records"]
            ),
            "minimum": certificate["minimum"],
        })
    manifest = {
        "marker": MATRIX_MARKER,
        "status": (
            "PASS exact N>=19 large-induced-order nonadjacent "
            "endpoint-parent G2 ratio-floor matrix"
        ),
        "source": PRODUCER.name,
        "source_sha256": source_hash,
        "ratio_floor_report": RATIO_FLOOR.name,
        "ratio_floor_report_sha256": RATIO_FLOOR_SHA256,
        "corner_reduction_report": REDUCTION.name,
        "corner_reduction_report_sha256": REDUCTION_SHA256,
        "coverage": (
            "N>=19, ordered induced orders at least seven, both nonadjacent "
            "geometries, all exhaustive order/edge charts, both endpoint "
            "orientations, and all B2/C2/D2 corners"
        ),
        "shards": len(rows),
        "simplex_coefficients": sum(
            row["simplex_coefficients"] for row in rows
        ),
        "bernstein_coefficients": sum(
            row["bernstein_coefficients"] for row in rows
        ),
        "negative": 0,
        "minimum": str(min(Fraction(row["minimum"]) for row in rows)),
        "rows": rows,
        "scope": (
            "N>=19 large induced orders only; small orders, replay, finite "
            "ambient orders, and theorem assembly are separate"
        ),
        "runner_source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: manifest[key] for key in (
        "marker", "shards", "simplex_coefficients",
        "bernstein_coefficients", "negative", "minimum",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MATRIX_MARKER)


if __name__ == "__main__":
    main()
