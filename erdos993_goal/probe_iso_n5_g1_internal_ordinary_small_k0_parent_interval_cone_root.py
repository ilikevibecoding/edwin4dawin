#!/usr/bin/env python3
"""Run the exact parent cone search for small-broom k=0 at ell=1..7.

This is a discovery wrapper around the pinned origin-cell cone builder. Each
length receives its own output so any exact rational certificate can later be
replayed by a solver-free verifier. No sign claim is made by this wrapper.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root as cone


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_parent_interval_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_PARENT_INTERVAL_CONE_ROOT"


ORIGINAL_ISOLATE_TIMES_PATH = cone.isolate_times_path
ORIGINAL_PATH_COEFFICIENT = cone.path_coefficient


def run_length(ell: int) -> dict:
    def remapped_isolate_times_path(collision_count, path_order, rank):
        mapping = {7: ell - 1, 6: ell - 2}
        assert path_order in mapping
        return ORIGINAL_ISOLATE_TIMES_PATH(collision_count, mapping[path_order], rank)

    def remapped_path_coefficient(path_order, rank):
        mapping = {6: ell - 2, 5: ell - 3}
        assert path_order in mapping
        return ORIGINAL_PATH_COEFFICIENT(mapping[path_order], rank)

    per_length_output = (
        HERE / f"iso_n5_g1_internal_ordinary_small_k0_ell{ell}_parent_interval_cone_probe_root_20260830.json"
    )
    cone.isolate_times_path = remapped_isolate_times_path
    cone.path_coefficient = remapped_path_coefficient
    cone.OUTPUT = per_length_output
    cone.MARKER = f"PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL{ell}_PARENT_INTERVAL_CONE_ROOT"
    cone.main()
    report = json.loads(per_length_output.read_text(encoding="utf-8"))
    return {
        "ell": ell,
        "output": per_length_output.name,
        "report_sha256": hashlib.sha256(per_length_output.read_bytes()).hexdigest().upper(),
        "status": report["status"],
        "faces": [
            {
                "epsilon": face["epsilon"],
                "geometry": face["geometry"],
                "floating_feasible": face["floating_feasible"],
                "exact_rational_certificate": face["exact_rational_certificate"],
                "basis_size": face["basis_size"],
                "coefficient_rows": face["coefficient_rows"],
                "nonzero_weights": len(face.get("weights", {})),
                "minimum_residual_coefficient": face.get("minimum_residual_coefficient"),
            }
            for face in report["faces"]
        ],
    }


def main() -> None:
    lengths = [run_length(ell) for ell in range(1, 8)]
    report = {
        "marker": MARKER,
        "lengths": lengths,
        "exact_faces": sum(
            face["exact_rational_certificate"]
            for row in lengths for face in row["faces"]
        ),
        "total_faces": 14,
        "status": "discovery cone search only; solver-free replay required",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
