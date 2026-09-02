#!/usr/bin/env python3
"""Independent bounded audit of the four queued e=4 shard wrappers/merge order."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "run_rank8_delta03_e4_queued_prefix_shards_agent.py"
OUTPUT_ROOT = ROOT / "rank8_delta03_e4_queued_prefix_shard_validation_agent_20260823"
OUTPUT = ROOT / "rank8_delta03_e4_queued_prefix_shard_merge_independent_audit_agent_20260823.json"
PROBE_SECONDARY = 512

EXPECTED = {
    "run_rank8_delta03_e4_queued_prefix_shards_agent.py":
        "4917DC4D9100B51F12971DA0FC44C384358FB7C423B71123DAB4F2280A3E1BA4",
    "rank8_delta03_e4_exact_prefix_shard_common_agent.rs":
        "7F34F862EB100B3B6042E305348210D9FE3F145D040A10A92DC1099D0F7B61A6",
    "shard_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs":
        "C83576B71EF2C512C102F21348D77603CCD690232F1B91FE263E75300F53FB7D",
    "shard_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.exe":
        "6023606F64597F47181B84466E29B209496EDB5C619D3E41ED564EEE9D556A5A",
    "shard_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs":
        "40986C2583F976044AADC576C74D7F323B3CE792E520B30FE69957D108996C04",
    "shard_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.exe":
        "A892136661A13822614D296DA73E3BEFE276B32179FBCEA0540C6A72884ADC02",
    "shard_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs":
        "0240D409840501B1C9C0CBAC91B3C67AEEDC876D470938E7F2D85979ED9F29A7",
    "shard_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.exe":
        "B2B293F24EF364D30AFB290A6F3689CAA87F4E77728F5A311B86A50978CD3B83",
    "shard_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs":
        "9DC9BF1178D5D98ACD5370D17E190BF208C559FA56A06453AB717B07730791EB",
    "shard_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.exe":
        "C7870B9948F498EDCDB1E6B4EB170E74530995C850C76E0A1AD239E5E7032989",
    "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs":
        "583669652F2185B44807A52825D3E281B540FE8981222406025012A55A4487D8",
    "produce_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs":
        "872E2F1B0DC827F19E619225C6365329606AC180FD375E04072BF37D8A3DA672",
    "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs":
        "DD15B8BB51B931BDCA7802C5CB0C9DE07CBB195264FDE8D812DCF1C952E7224E",
    "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs":
        "67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB",
}

ORBITS = {
    "four_cubic_path:inner_pendant_internal": {
        "prefixes": 12_544, "secondary": 12_544,
        "global_finite": 37_143_771, "global_rays": 119_233_660,
    },
    "four_cubic_path:outer_pendant_internal": {
        "prefixes": 3_136, "secondary": 87_808,
        "global_finite": 63_768_530, "global_rays": 210_020_272,
    },
    "four_cubic_path:outer_spine_internal": {
        "prefixes": 1_792, "secondary": 87_808,
        "global_finite": 37_143_771, "global_rays": 119_233_660,
    },
    "four_cubic_star:pendant_internal": {
        "prefixes": 3_136, "secondary": 25_200,
        "global_finite": 18_693_172, "global_rays": 59_838_408,
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def safe(orbit: str) -> str:
    return orbit.replace(":", "__")


def manifest_path(
    output_root: Path,
    orbit: str,
    start: int,
    end: int,
    secondary: int,
) -> Path:
    base = f"{safe(orbit)}_p{start:05d}_{end:05d}_r{secondary:06d}"
    return output_root / safe(orbit) / f"{base}.manifest.json"


def run_shard(
    output_root: Path,
    orbit: str,
    start: int,
    end: int,
    secondary: int | None,
) -> dict:
    command = [
        "python", str(RUNNER), "run", orbit, str(start), str(end),
        "--output-root", str(output_root),
    ]
    if secondary is not None:
        command.extend(["--secondary-limit", str(secondary)])
    subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    actual_secondary = ORBITS[orbit]["secondary"] if secondary is None else secondary
    path = manifest_path(output_root, orbit, start, end, actual_secondary)
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["runner_source_sha256"] == EXPECTED[RUNNER.name]
    return payload


def stream_path(output_root: Path, payload: dict, kind: str) -> Path:
    return output_root / safe(payload["orbit"]) / payload[f"{kind}_stream"]["file"]


def ordered_sha(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in paths:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b""):
                digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    validations = {}
    timings = {}

    for orbit, config in ORBITS.items():
        split_root = OUTPUT_ROOT / "split"
        direct_root = OUTPUT_ROOT / "direct"
        first = run_shard(split_root, orbit, 0, 1, PROBE_SECONDARY)
        second = run_shard(split_root, orbit, 1, 2, PROBE_SECONDARY)
        direct = run_shard(direct_root, orbit, 0, 2, PROBE_SECONDARY)
        assert direct["keys"] == first["keys"] + second["keys"] == 2 * PROBE_SECONDARY
        assert direct["counts"] == [
            first["counts"][index] + second["counts"][index]
            for index in range(5)
        ]
        assert direct["unseen_rank_checks"] == (
            first["unseen_rank_checks"] + second["unseen_rank_checks"]
        )
        coefficient_sha = ordered_sha([
            stream_path(split_root, first, "coefficient"),
            stream_path(split_root, second, "coefficient"),
        ])
        finite_sha = ordered_sha([
            stream_path(split_root, first, "finite"),
            stream_path(split_root, second, "finite"),
        ])
        assert coefficient_sha == direct["coefficient_stream"]["sha256"]
        assert finite_sha == direct["finite_stream"]["sha256"]
        validations[orbit] = {
            "probe_secondary_per_prefix": PROBE_SECONDARY,
            "split_ranges": [[0, 1], [1, 2]],
            "direct_range": [0, 2],
            "keys": direct["keys"],
            "counts": direct["counts"],
            "matching_coefficient_stream_sha256": coefficient_sha,
            "matching_finite_stream_sha256": finite_sha,
            "claim": "hash(split prefix 0 then prefix 1) equals hash(direct prefixes 0..2)",
        }

        timing_root = OUTPUT_ROOT / "timing"
        last = config["prefixes"] - 1
        timing = run_shard(timing_root, orbit, last, last + 1, None)
        assert timing["mode"] == "FULL_PREFIX"
        assert timing["keys"] == config["secondary"]
        assert timing["counts"][4] == config["secondary"]
        elapsed_seconds = timing["elapsed_ms"] / 1000
        single_worker_hours = elapsed_seconds * config["prefixes"] / 3600
        six_worker_ideal_hours = single_worker_hours / 6
        timings[orbit] = {
            "measured_prefix": last,
            "ray_saturated_keys": timing["keys"],
            "elapsed_ms": timing["elapsed_ms"],
            "keys_per_second": timing["keys"] / elapsed_seconds,
            "single_worker_ray_saturated_extrapolation_hours": single_worker_hours,
            "six_worker_ideal_extrapolation_hours": six_worker_ideal_hours,
            "caution": (
                "A one-prefix ray-saturated measurement; actual scheduling, finite-cell "
                "mix, CPU contention, and I/O make this an engineering ETA, not proof evidence."
            ),
        }
        print("VALIDATED", orbit, "ELAPSED_MS", timing["elapsed_ms"])

    resume_command = [
        "python", str(RUNNER), "run",
        "four_cubic_path:inner_pendant_internal", "0", "1",
        "--secondary-limit", str(PROBE_SECONDARY),
        "--output-root", str(OUTPUT_ROOT / "split"),
    ]
    resume = subprocess.run(
        resume_command, cwd=ROOT, check=True, capture_output=True, text=True
    )
    assert "RESUME_VERIFIED" in resume.stdout

    incomplete_root = OUTPUT_ROOT / "timing"
    incomplete_merge = subprocess.run(
        [
            "python", str(RUNNER), "merge",
            "four_cubic_star:pendant_internal",
            "--output-root", str(incomplete_root),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert incomplete_merge.returncode != 0
    incomplete_report = (
        incomplete_root / safe("four_cubic_star:pendant_internal") /
        "four_cubic_star__pendant_internal_complete_ordered_merge_exact_agent_20260823.json"
    )
    assert not incomplete_report.exists()

    payload = {
        "schema": "rank8-delta03-e4-queued-prefix-shard-merge-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_BOUNDED_RANK8_DELTA03_E4_QUEUED_PREFIX_SHARD_MERGE_AUDIT",
        "orbits": list(ORBITS),
        "bounded_global_order_validations": validations,
        "measured_ray_saturated_prefix_timings": timings,
        "planned_complete_stream_storage_gib": {
            orbit: 32 * (config["global_finite"] + config["global_rays"]) / 2**30
            for orbit, config in ORBITS.items()
        },
        "resumption_contract": (
            "The Python manifest is written only after both atomically promoted binary "
            "streams and the Rust raw manifest rehash exactly; a missing Python manifest "
            "can be recovered only when all three promoted files verify."
        ),
        "operational_fail_closed_tests": {
            "completed_manifest_rerun": "PASS_RESUME_VERIFIED_WITHOUT_REEXECUTION",
            "incomplete_full_prefix_coverage_merge": "PASS_REJECTED_WITH_NO_REPORT",
        },
        "merge_contract": (
            "Complete merge rejects gaps, overlaps, non-full probe shards, input drift, "
            "count drift, byte drift, or file-hash drift, then hashes coefficient and "
            "finite shard files separately in strict ascending prefix order."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Only bounded probes and one full ray-saturated prefix per orbit were run. "
            "No full orbit census or mathematical orbit closure is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
