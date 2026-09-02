#!/usr/bin/env python3
"""Fail-closed exact certificate for the corrected outer forest m1,j3 cones.

The two certified regions of the N>=31, S>=5 tail are

  D >= 5s       (tangent branch),
  5s >= 3D      (coupled branch),

where s=S-5 and D=d-1.  This leaves 5s/3 < D < 5s open.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import prod
from pathlib import Path

from flint import fmpq

import probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent as tail
import probe_terminal_q3_m1_forest_j3_two_cones_flint_independent_agent as cones


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_m1_forest_j3_outer_cones_independent_20260829.json"
DEPENDENCY_HASHES = {
    "probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent.py":
        "7C246E52D8C21A2F2DB4905CC8D8BB19E717E0E415DC6C8A9B62CC6FB955F24B",
    "probe_terminal_q3_m1_forest_j3_two_cones_flint_independent_agent.py":
        "D22B5389E4156E72792609D2C98181A7CFA55A4E5958FC422525A9E00FD3AC6F",
    "prove_terminal_q3_m1_forest_j3_h4_path_floor_independent_agent.py":
        "64C79C9D8E68A8FE51A0A3B91862DC317B3EA167F74DDD0B2E624297BE65A69F",
    "terminal_q3_m1_forest_j3_h4_path_floor_independent_20260829.json":
        "DF1D57C1D5F27CC2DFA174A72BB5392BEA6B0577AEC26B8F26B0AE56E88700E6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def stream_hash(shape, values) -> str:
    digest = hashlib.sha256()
    digest.update((",".join(map(str, shape)) + "\n").encode("ascii"))
    for value in values:
        digest.update((str(value) + "\n").encode("ascii"))
    return digest.hexdigest().upper()


def summarize(shape, values):
    return {
        "shape": [int(entry) for entry in shape],
        "count": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "minimum": str(min(values)),
        "stream_sha256": stream_hash(shape, values),
    }


def main() -> None:
    for name, expected in DEPENDENCY_HASHES.items():
        path = HERE / name
        actual = sha256(path)
        if actual != expected:
            raise AssertionError(("dependency hash mismatch", name, expected, actual))

    certificates = {}

    # Coupled branch, v=s/(s+D) in [3/8,1].  Two exact affine boxes avoid a
    # non-sharp Bernstein net over the whole interval.
    coupled = tail.build()[0]
    for label, lower, upper in (
        ("coupled_v_3_8_to_1_2", fmpq(3, 8), fmpq(1, 2)),
        ("coupled_v_1_2_to_1", fmpq(1, 2), fmpq(1)),
    ):
        transformed = coupled.compose(
            tail.E, tail.u, lower + (upper - lower) * tail.v, tail.r, tail.w
        )
        shape, values = tail.bernstein_net(transformed)
        summary = summarize(shape, values)
        if summary["negative"]:
            raise AssertionError((label, summary))
        # On the upper box, every zero is confined to the E=infinity layer;
        # all finite-E layers are strictly positive.  The lower box is strict.
        e_stride = prod(shape[1:])
        finite_layers = values[: (shape[0] - 1) * e_stride]
        if not finite_layers or min(finite_layers) <= 0:
            raise AssertionError((label, "finite E layer is not strict"))
        if lower == fmpq(3, 8) and min(values) <= 0:
            raise AssertionError((label, "expected strict full net"))
        summary["finite_E_layers_minimum"] = str(min(finite_layers))
        certificates[label] = summary

    # Tangent branch, D>=5s.  Tail integrality requires s+D>=25.
    # For s>=5 use s=5+x, D=5s+z.  Orders s=0,...,4 are five exact strips
    # D=25-s+z.  The compactified x,z representation proves every z>=0.
    ratio_poly = cones.build(mode=("ratio_d", 5, 5))[1]
    shape, values = cones.full_two_unbounded_bernstein(ratio_poly)
    summary = summarize(shape, values)
    if summary["negative"]:
        raise AssertionError(("tangent_D_ge_5s_s_ge_5", summary))
    # Coefficients at compactified (x,z)=(0,0) are positive for every bounded
    # coordinate.  Their Bernstein basis weight is positive at finite x,z,
    # establishing strictness despite harmless projective-boundary zeros.
    bounded_count = prod(shape[2:])
    origin_block = values[:bounded_count]
    if min(origin_block) <= 0:
        raise AssertionError("tangent ratio origin block is not strict")
    summary["finite_xz_strict_origin_block_minimum"] = str(min(origin_block))
    certificates["tangent_D_ge_5s_s_ge_5"] = summary

    for s in range(5):
        poly = cones.build(mode=s)[1]
        shape, values = cones.full_two_unbounded_bernstein(poly)
        label = f"tangent_s_{s}_D_ge_{25-s}"
        summary = summarize(shape, values)
        if summary["negative"] or min(values) <= 0:
            raise AssertionError((label, summary))
        certificates[label] = summary

    coefficient_total = sum(item["count"] for item in certificates.values())
    coefficient_negative = sum(item["negative"] for item in certificates.values())
    if coefficient_negative:
        raise AssertionError("negative coefficient survived")

    report = {
        "status": "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_N31_PLUS_OUTER_CONES",
        "scope": (
            "Corrected W>=C(d,2)+R+L and +P4(S) relaxation; proves only the "
            "outer S>=5 tail regions for the forest m=1,j=3 terminal row. "
            "Excludes 5s/3<D<5s, S=2,3,4, m=0, and full Erdos 993."
        ),
        "coordinates": {
            "s": "S-5",
            "D": "d-1",
            "tail": "s,D nonnegative integers with s+D>=25 (equivalently N>=31)",
            "low_ratio_region": "D>=5s, equivalently v=s/(s+D)<=1/6",
            "high_ratio_region": "5s>=3D, equivalently v>=3/8",
        },
        "retained_branches": {
            "low_ratio": "tangent U0 lower including +P4(S)",
            "high_ratio": "coupled component U0 lower",
            "common": "artificial/genuine cap y=U3/(U3+B), W>=C(d,2)+R+L",
        },
        "certificates": certificates,
        "coefficient_total": coefficient_total,
        "coefficient_negative": coefficient_negative,
        "dependencies": DEPENDENCY_HASHES,
        "source_sha256": sha256(Path(__file__)),
    }
    temp = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, REPORT)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
