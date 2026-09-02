#!/usr/bin/env python3
"""Fail-closed full-stage primary assembler for internal-path quotient lanes.

The quotient ray result is accepted only together with its independently
replayed raw multiplicities and the unchanged exhaustive finite pass.  Output
names are distinct from the legacy chain and carry the original raw counts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
    static_layout_hashes,
)


ROOT = Path(__file__).resolve().parent
CONFIG_SOURCE = (
    "rank8_delta03_e5_five_cubic_path_internal_quotient_"
    "full_stage_config_agent.py"
)
RAW_MULTIPLICITY_SOURCE = (
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
    "raw_multiplicity_agent.py"
)
EXPECTED_SHARED = {
    CONFIG_SOURCE:
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    RAW_MULTIPLICITY_SOURCE:
        "37FDA3CFE1A06DAA1A66CA824D30543D37AACA78BA71E53E77FB59288A4764D8",
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py":
        "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py":
        "642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py":
        "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_exact_agent_20260825.json":
        "DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3",
}
MAPPING_ARRAYS_SHA256 = (
    "0DAE5ECEA41CD11D1A8EE0F5FE466C5A494A97A40F79A13931F9E0D4C1B03C1A"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def verify_nested_hashes(*reports: dict) -> dict[str, str]:
    nested: dict[str, str] = {}
    for report in reports:
        for mapping_name in (
            "immutable_input_hashes", "driver_immutable_input_hashes"
        ):
            for name, expected in report.get(mapping_name, {}).items():
                if name in nested:
                    assert nested[name] == expected, name
                nested[name] = expected
                assert sha256(ROOT / name) == expected, name
    return nested


def validate_quotient_checkpoint(layout, checkpoint: dict) -> None:
    assert checkpoint["schema"] == (
        f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
        "-cuda-rays-quotient-checkpoint-v1"
    )
    assert checkpoint["cursor"] == layout.patterns
    assert checkpoint["batch_size"] == 750_000
    assert checkpoint["opposite_start"] == layout.opposite_start
    assert checkpoint["quotient_mapping_arrays_sha256"] == MAPPING_ARRAYS_SHA256
    cursor = 0
    totals = {key: 0 for key in checkpoint["totals"]}
    quotient_totals = {key: 0 for key in checkpoint["quotient_totals"]}
    for batch in checkpoint["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["rays"] == batch["raw_multiplicity_sum"]
        assert batch["static_raw_rows"] + batch["dynamic_raw_rows"] == batch["rays"]
        assert len(batch["raw_to_group_mapping_sha256"]) == 64
        assert len(batch["residue_fingerprint_sha256"]) == 64
        for key in totals:
            totals[key] += batch[key]
        for key in quotient_totals:
            quotient_totals[key] += batch[key]
        cursor = batch["stop"]
    assert cursor == layout.patterns
    assert checkpoint["totals"] == totals
    assert checkpoint["quotient_totals"] == quotient_totals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--expected-quotient-ray-checkpoint-sha256", required=True)
    parser.add_argument("--expected-quotient-ray-report-sha256", required=True)
    parser.add_argument("--expected-finite-checkpoint-sha256", required=True)
    parser.add_argument("--expected-finite-report-sha256", required=True)
    parser.add_argument(
        "--expected-raw-multiplicity-audit-checkpoint-sha256", required=True
    )
    parser.add_argument("--expected-raw-multiplicity-audit-sha256", required=True)
    args = parser.parse_args()
    layout = LAYOUTS[args.layout]
    static_expected = {**EXPECTED_SHARED, **static_layout_hashes(layout)}
    actual = {name: sha256(ROOT / name) for name in static_expected}
    assert actual == static_expected

    raw_checkpoint_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "raw_multiplicity_audit_checkpoint_agent_20260825.json"
    )
    raw_report_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "raw_multiplicity_audit_agent_20260825.json"
    )
    dynamic = {
        layout.quotient_ray_checkpoint_name:
            args.expected_quotient_ray_checkpoint_sha256.upper(),
        layout.quotient_ray_report_name:
            args.expected_quotient_ray_report_sha256.upper(),
        layout.finite_checkpoint_name:
            args.expected_finite_checkpoint_sha256.upper(),
        layout.finite_report_name:
            args.expected_finite_report_sha256.upper(),
        raw_checkpoint_name:
            args.expected_raw_multiplicity_audit_checkpoint_sha256.upper(),
        raw_report_name:
            args.expected_raw_multiplicity_audit_sha256.upper(),
    }
    assert {name: sha256(ROOT / name) for name in dynamic} == dynamic
    ray_checkpoint = load(layout.quotient_ray_checkpoint_name)
    rays = load(layout.quotient_ray_report_name)
    finite_checkpoint = load(layout.finite_checkpoint_name)
    finite = load(layout.finite_report_name)
    raw_checkpoint = load(raw_checkpoint_name)
    raw = load(raw_report_name)

    validate_quotient_checkpoint(layout, ray_checkpoint)
    assert rays["status"] == layout.ray_status
    assert finite["status"] == layout.finite_status
    assert rays["root_orbit"] == finite["root_orbit"] == layout.root_orbit
    assert rays["checkpoint_sha256"] == dynamic[
        layout.quotient_ray_checkpoint_name
    ]
    assert finite["checkpoint_sha256"] == dynamic[layout.finite_checkpoint_name]
    assert rays["quotient_mapping_arrays_sha256"] == MAPPING_ARRAYS_SHA256
    assert rays["source_sha256"] == static_expected[
        "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py"
    ]
    assert rays["driver_sha256"] == static_expected[
        "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py"
    ]
    assert ray_checkpoint["dependencies"] == rays["immutable_input_hashes"]
    assert ray_checkpoint["driver_immutable_input_hashes"] == rays[
        "driver_immutable_input_hashes"
    ]
    assert all(rays["coverage_guards"].values())
    assert rays["totals"] == ray_checkpoint["totals"]
    assert rays["quotient_totals"] == ray_checkpoint["quotient_totals"]
    expected_rays = {
        "patterns": layout.patterns,
        "rays": layout.rays,
        "all_short": layout.all_short,
        "finite": layout.finite,
        "order27": layout.order27,
    }
    for key, value in expected_rays.items():
        assert rays["totals"][key] == value
    assert rays["totals"]["gate_failures"] == 0
    assert rays["totals"]["bound_failures"] == 0
    assert rays["totals"]["negative_classifications"] == 0
    assert ray_checkpoint["quotient_totals"]["formula_evaluations_saved"] == (
        layout.rays
        - ray_checkpoint["quotient_totals"]["formula_evaluations"]
    )
    assert (
        ray_checkpoint["quotient_totals"]["static_raw_rows"]
        + ray_checkpoint["quotient_totals"]["dynamic_raw_rows"]
        == layout.rays
    )
    ray_manifest = "".join(
        json.dumps(batch, sort_keys=True, separators=(",", ":")) + "\n"
        for batch in ray_checkpoint["batches"]
    )
    assert hashlib.sha256(ray_manifest.encode("utf-8")).hexdigest().upper() == (
        rays["batch_manifest_sha256"]
    )

    expected_finite = {
        "patterns": layout.patterns,
        "all_short": layout.all_short,
        "finite": layout.finite,
        "order27": layout.order27,
        "positive_values": 4 * layout.finite,
        "nonpositive_values": 0,
        "bound_failures": 0,
    }
    assert finite_checkpoint["cursor"] == layout.patterns
    assert finite["totals"] == finite_checkpoint["totals"] == expected_finite
    assert rays["crt_prime_count"] == finite["crt_prime_count"] == 9
    assert rays["crt_modulus_bits"] > 255
    assert finite["crt_modulus_bits"] > 255

    raw_status = (
        "PASS_INDEPENDENT_RAW_MULTIPLICITY_AUDIT_E5_FIVE_CUBIC_PATH_"
        f"{layout.token}_QUOTIENT_RAYS"
    )
    assert raw["status"] == raw_status
    assert raw["root_orbit"] == layout.root_orbit
    assert raw["mapping_arrays_sha256"] == MAPPING_ARRAYS_SHA256
    assert raw["quotient_checkpoint_sha256"] == dynamic[
        layout.quotient_ray_checkpoint_name
    ]
    assert raw["audit_checkpoint_sha256"] == dynamic[raw_checkpoint_name]
    assert raw["source_sha256"] == static_expected[RAW_MULTIPLICITY_SOURCE]
    assert raw["audited_batches"] == len(ray_checkpoint["batches"])
    assert raw["totals"] == raw_checkpoint["totals"]
    assert raw_checkpoint["dependencies"] == raw["immutable_input_hashes"]
    assert raw_checkpoint["next_batch_index"] == len(ray_checkpoint["batches"])
    assert raw_checkpoint["quotient_checkpoint_cursor"] == layout.patterns
    assert raw["totals"]["patterns"] == layout.patterns
    assert raw["totals"]["raw_rays"] == layout.rays
    assert raw["totals"]["static_raw_rows"] + raw["totals"][
        "dynamic_raw_rows"
    ] == layout.rays
    assert raw["totals"]["imported_legacy_raw_rays"] + raw["totals"][
        "production_quotient_raw_rays"
    ] == layout.rays
    assert len(raw_checkpoint["batches"]) == len(ray_checkpoint["batches"])
    for index, (ray_batch, raw_batch) in enumerate(zip(
        ray_checkpoint["batches"], raw_checkpoint["batches"], strict=True
    )):
        assert raw_batch["index"] == index
        assert raw_batch["start"] == ray_batch["start"]
        assert raw_batch["stop"] == ray_batch["stop"]
        assert raw_batch["raw_rays"] == ray_batch["rays"]
        assert raw_batch["static_raw_rows"] == ray_batch["static_raw_rows"]
        assert raw_batch["dynamic_raw_rows"] == ray_batch["dynamic_raw_rows"]
        assert raw_batch["maximum_group_multiplicity"] == ray_batch[
            "maximum_group_multiplicity"
        ]
        assert raw_batch["mapping_sha256"] == ray_batch[
            "raw_to_group_mapping_sha256"
        ]

    nested = verify_nested_hashes(rays, finite, raw)
    for mapping in (actual, dynamic):
        for name, expected in mapping.items():
            if name in nested:
                assert nested[name] == expected, name
    output = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "primary_exact_agent_20260825.json"
    )
    payload = {
        "schema": (
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-primary-exact-agent-v1"
        ),
        "status": layout.primary_status,
        "root_orbit": layout.root_orbit,
        "canonical_coordinate_patterns": layout.patterns,
        "n28_plus_newton_rays": layout.rays,
        "n28_plus_all_short_finite_patterns": layout.finite,
        "all_short_order27_patterns": layout.order27,
        "ray_active_coefficient_checks": (
            rays["totals"]["positive_active_coefficients"]
            + rays["totals"]["zero_active_coefficients"]
        ),
        "finite_delta_checks": 4 * layout.finite,
        "nonpositive_or_bound_failures": 0,
        "quotient_acceleration_evidence": {
            "mapping_arrays_sha256": MAPPING_ARRAYS_SHA256,
            "original_raw_rays": layout.rays,
            "formula_evaluations": rays["quotient_totals"][
                "formula_evaluations"
            ],
            "formula_evaluations_saved": rays["quotient_totals"][
                "formula_evaluations_saved"
            ],
            "raw_multiplicity_audit_sha256": dynamic[raw_report_name],
            "selected_side_coordinates_never_quotiented": True,
            "original_exhaustive_counts_retained": True,
        },
        "conclusion": (
            "The exact grouped CUDA/CRT ray engine, independent raw-"
            "multiplicity replay, and exhaustive legacy finite engine cover "
            f"every canonical {layout.root_orbit} instance at every order."
        ),
        "immutable_input_hashes": {**nested, **actual, **dynamic},
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Primary all-order closure only. The quotient is computational "
            "acceleration, not orbit/sign evidence. Official credit requires "
            "the separate full independently transcribed raw audit and final "
            "seals."
        ),
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
