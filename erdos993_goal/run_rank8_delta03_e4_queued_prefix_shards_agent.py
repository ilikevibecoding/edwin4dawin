#!/usr/bin/env python3
"""Resumable fail-closed prefix shards and exact-order stream merge.

The four wrapped producers retain their original canonical prefix/secondary
enumerators and exact checked-i256 workers.  Each bounded shard writes the raw
32-byte record leaves in canonical order.  A complete merge hashes those files
in no-gap prefix order, reproducing the monolithic producer's two streams
without retaining a multi-gigabyte concatenation in memory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "rank8_delta03_e4_queued_prefix_shards_agent_20260823"
COMMON_PINS = {
    "rank8_delta03_e4_exact_prefix_shard_common_agent.rs":
        "7F34F862EB100B3B6042E305348210D9FE3F145D040A10A92DC1099D0F7B61A6",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
}

ORBITS: dict[str, dict[str, Any]] = {
    "four_cubic_path:inner_pendant_internal": {
        "prefixes": 12_544,
        "secondary": 12_544,
        "counts": [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660],
        "unseen": 476_934_640,
        "wrapper_source": "shard_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs",
        "wrapper_source_sha": "C83576B71EF2C512C102F21348D77603CCD690232F1B91FE263E75300F53FB7D",
        "wrapper_exe": "shard_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.exe",
        "wrapper_exe_sha": "6023606F64597F47181B84466E29B209496EDB5C619D3E41ED564EEE9D556A5A",
        "producer_source": "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs",
        "producer_source_sha": "583669652F2185B44807A52825D3E281B540FE8981222406025012A55A4487D8",
        "reduction_report": "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260823.json",
        "reduction_report_sha": "17376D1C39B029B60BDA8551452DDBC3F01D82C8FAB22A409DE376AA522B2701",
        "preflight_report": "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_preflight_exact_agent_20260823.json",
        "preflight_report_sha": "724C48D384717B06E0733ABF93C69E02DEA128966173D1FE437235393A2D4238",
    },
    "four_cubic_path:outer_pendant_internal": {
        "prefixes": 3_136,
        "secondary": 87_808,
        "counts": [65_345_616, 63_768_530, 210_020_271, 1, 210_020_272],
        "unseen": 840_081_088,
        "wrapper_source": "shard_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs",
        "wrapper_source_sha": "40986C2583F976044AADC576C74D7F323B3CE792E520B30FE69957D108996C04",
        "wrapper_exe": "shard_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.exe",
        "wrapper_exe_sha": "A892136661A13822614D296DA73E3BEFE276B32179FBCEA0540C6A72884ADC02",
        "producer_source": "produce_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs",
        "producer_source_sha": "872E2F1B0DC827F19E619225C6365329606AC180FD375E04072BF37D8A3DA672",
        "reduction_report": "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260823.json",
        "reduction_report_sha": "9FC2B252D978B41F355D099F791CD17A0AF8944CC7DE7ABE76610073E51F6B8E",
        "preflight_report": "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_preflight_exact_agent_20260823.json",
        "preflight_report_sha": "191BBAA75D3FAC4DFA83748B6AF28B2238234801042A511878D2A1A7E2E0E5B1",
    },
    "four_cubic_path:outer_spine_internal": {
        "prefixes": 1_792,
        "secondary": 87_808,
        "counts": [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660],
        "unseen": 476_934_640,
        "wrapper_source": "shard_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs",
        "wrapper_source_sha": "0240D409840501B1C9C0CBAC91B3C67AEEDC876D470938E7F2D85979ED9F29A7",
        "wrapper_exe": "shard_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.exe",
        "wrapper_exe_sha": "B2B293F24EF364D30AFB290A6F3689CAA87F4E77728F5A311B86A50978CD3B83",
        "producer_source": "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs",
        "producer_source_sha": "DD15B8BB51B931BDCA7802C5CB0C9DE07CBB195264FDE8D812DCF1C952E7224E",
        "reduction_report": "rank8_delta03_e4_four_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260823.json",
        "reduction_report_sha": "54A47725DDB2FB34A1946B9CB5DD9A62146D00460AE4F3B5BDF30B184B63A1D0",
        "preflight_report": "rank8_delta03_e4_four_cubic_path_outer_spine_internal_preflight_exact_agent_20260823.json",
        "preflight_report_sha": "9507C4DD364B507E970E8FA34B2CD5ECFE4F056C2FF28555D4995B1395AD77E3",
    },
    "four_cubic_star:pendant_internal": {
        "prefixes": 3_136,
        "secondary": 25_200,
        "counts": [19_188_792, 18_693_172, 59_838_407, 1, 59_838_408],
        "unseen": 239_353_632,
        "wrapper_source": "shard_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs",
        "wrapper_source_sha": "9DC9BF1178D5D98ACD5370D17E190BF208C559FA56A06453AB717B07730791EB",
        "wrapper_exe": "shard_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.exe",
        "wrapper_exe_sha": "C7870B9948F498EDCDB1E6B4EB170E74530995C850C76E0A1AD239E5E7032989",
        "producer_source": "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs",
        "producer_source_sha": "67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB",
        "reduction_report": "rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_exact_agent_20260823.json",
        "reduction_report_sha": "D14EE51513F771A9B218896FE6B4438456D6A823303C5950FF7703AEFB031DF0",
        "preflight_report": "rank8_delta03_e4_four_cubic_star_pendant_internal_preflight_exact_agent_20260823.json",
        "preflight_report_sha": "92EE77592A605504D1E99985E737554C20A759F9EFB41AED6DC4E1B2F9BAA692",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def safe_orbit(orbit: str) -> str:
    return orbit.replace(":", "__")


def input_hashes(orbit: str) -> dict[str, str]:
    config = ORBITS[orbit]
    expected = dict(COMMON_PINS)
    expected.update({
        config["wrapper_source"]: config["wrapper_source_sha"],
        config["wrapper_exe"]: config["wrapper_exe_sha"],
        config["producer_source"]: config["producer_source_sha"],
        config["reduction_report"]: config["reduction_report_sha"],
        config["preflight_report"]: config["preflight_report_sha"],
    })
    actual = {name: sha256(ROOT / name) for name in expected}
    assert actual == expected, f"immutable input drift for {orbit}"
    return actual


def parse_raw(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    assert lines and lines[0] == "PASS_EXACT_ORDERED_PREFIX_SHARD"
    rows: dict[str, str] = {}
    for line in lines[1:]:
        key, value = line.split(" ", 1)
        assert key not in rows, f"duplicate raw field {key}"
        rows[key] = value
    expected = {
        "ORBIT", "MODE", "PRODUCER_SOURCE_SHA256", "PREFIX_RANGE",
        "SECONDARY_LIMIT", "COUNTS", "KEYS", "UNSEEN", "LITERAL_CHECKS",
        "COEFFICIENT_BYTES", "FINITE_BYTES", "COEFFICIENT_STREAM_SHA256",
        "FINITE_STREAM_SHA256", "COEFFICIENT_FILE", "FINITE_FILE", "ELAPSED_MS",
    }
    assert set(rows) == expected
    return rows


def names_for(orbit: str, start: int, end: int, secondary_limit: int) -> dict[str, str]:
    base = f"{safe_orbit(orbit)}_p{start:05d}_{end:05d}_r{secondary_limit:06d}"
    return {
        "coefficient": f"{base}.coeff.bin",
        "finite": f"{base}.finite.bin",
        "raw": f"{base}.raw.txt",
        "manifest": f"{base}.manifest.json",
    }


def payload_from_raw(
    orbit: str,
    shard_dir: Path,
    start: int,
    end: int,
    secondary_limit: int,
) -> dict[str, Any]:
    config = ORBITS[orbit]
    names = names_for(orbit, start, end, secondary_limit)
    raw_path = shard_dir / names["raw"]
    rows = parse_raw(raw_path)
    assert rows["ORBIT"] == orbit
    expected_mode = (
        "FULL_PREFIX" if secondary_limit == config["secondary"]
        else "BOUNDED_SECONDARY_PROBE"
    )
    assert rows["MODE"] == expected_mode
    assert rows["PRODUCER_SOURCE_SHA256"] == config["producer_source_sha"]
    assert [int(value) for value in rows["PREFIX_RANGE"].split()] == [
        start, end, config["prefixes"]
    ]
    assert [int(value) for value in rows["SECONDARY_LIMIT"].split()] == [
        secondary_limit, config["secondary"]
    ]
    counts = [int(value) for value in rows["COUNTS"].split()]
    assert len(counts) == 5
    keys = int(rows["KEYS"])
    unseen = int(rows["UNSEEN"])
    literal_checks = int(rows["LITERAL_CHECKS"])
    assert keys == (end - start) * secondary_limit == counts[0] + counts[4]
    assert counts[4] == counts[2] + counts[3]
    assert unseen == 4 * counts[4]
    assert 0 <= literal_checks <= 2 * (end - start)
    assert rows["COEFFICIENT_FILE"] == names["coefficient"]
    assert rows["FINITE_FILE"] == names["finite"]
    coefficient_path = shard_dir / names["coefficient"]
    finite_path = shard_dir / names["finite"]
    coefficient_size = coefficient_path.stat().st_size
    finite_size = finite_path.stat().st_size
    assert coefficient_size == int(rows["COEFFICIENT_BYTES"]) == 32 * counts[4]
    assert finite_size == int(rows["FINITE_BYTES"]) == 32 * counts[1]
    coefficient_sha = sha256(coefficient_path)
    finite_sha = sha256(finite_path)
    assert coefficient_sha == rows["COEFFICIENT_STREAM_SHA256"]
    assert finite_sha == rows["FINITE_STREAM_SHA256"]
    return {
        "schema": "rank8-delta03-e4-exact-ordered-prefix-shard-agent-v1",
        "status": "PASS_EXACT_ORDERED_PREFIX_SHARD",
        "orbit": orbit,
        "mode": expected_mode,
        "prefix_range": [start, end],
        "prefix_total": config["prefixes"],
        "secondary_limit": secondary_limit,
        "secondary_total": config["secondary"],
        "counts": counts,
        "keys": keys,
        "unseen_rank_checks": unseen,
        "literal_spot_checks": literal_checks,
        "elapsed_ms": int(rows["ELAPSED_MS"]),
        "coefficient_stream": {
            "file": names["coefficient"],
            "bytes": coefficient_size,
            "sha256": coefficient_sha,
        },
        "finite_stream": {
            "file": names["finite"],
            "bytes": finite_size,
            "sha256": finite_sha,
        },
        "raw": {"file": names["raw"], "sha256": sha256(raw_path)},
        "immutable_input_hashes": input_hashes(orbit),
        "runner_source_sha256": sha256(Path(__file__)),
        "order_contract": (
            "prefixes ascend globally; each wrapped hash-pinned producer worker emits "
            "its canonical secondary records; coefficient and finite streams are kept "
            "separate exactly as in the monolithic producer"
        ),
    }


def atomic_json(path: Path, payload: dict[str, Any]) -> None:
    temp = path.with_name(f"{path.name}.tmp.{os.getpid()}")
    assert not temp.exists()
    temp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, path)


def verify_manifest(path: Path) -> dict[str, Any]:
    stored = json.loads(path.read_text(encoding="utf-8"))
    assert stored["schema"] == "rank8-delta03-e4-exact-ordered-prefix-shard-agent-v1"
    orbit = stored["orbit"]
    assert orbit in ORBITS
    start, end = stored["prefix_range"]
    expected = payload_from_raw(
        orbit,
        path.parent,
        start,
        end,
        stored["secondary_limit"],
    )
    assert stored == expected, f"manifest drift: {path.name}"
    return stored


def run_shard(
    orbit: str,
    start: int,
    end: int,
    secondary_limit: int | None,
    output_root: Path,
) -> Path:
    config = ORBITS[orbit]
    limit = config["secondary"] if secondary_limit is None else secondary_limit
    assert 0 <= start < end <= config["prefixes"]
    assert end - start <= 12
    assert 0 < limit <= config["secondary"]
    input_hashes(orbit)
    shard_dir = output_root / safe_orbit(orbit)
    shard_dir.mkdir(parents=True, exist_ok=True)
    names = names_for(orbit, start, end, limit)
    manifest_path = shard_dir / names["manifest"]
    if manifest_path.exists():
        verify_manifest(manifest_path)
        print("RESUME_VERIFIED", manifest_path)
        return manifest_path

    raw_path = shard_dir / names["raw"]
    coefficient_path = shard_dir / names["coefficient"]
    finite_path = shard_dir / names["finite"]
    existing = [path for path in (raw_path, coefficient_path, finite_path) if path.exists()]
    if existing:
        # Recover only a fully promoted Rust shard whose Python manifest write
        # was interrupted.  Any partial set remains a hard failure.
        assert len(existing) == 3, f"partial promoted shard: {existing}"
        payload = payload_from_raw(orbit, shard_dir, start, end, limit)
        atomic_json(manifest_path, payload)
        print("RECOVERED_VERIFIED", manifest_path)
        return manifest_path
    assert not list(shard_dir.glob(f"{names['raw'][:-8]}*.tmp.*")), "stale temp shard"

    command = [
        str(ROOT / config["wrapper_exe"]),
        str(start),
        str(end),
        str(shard_dir),
    ]
    if limit != config["secondary"]:
        command.append(str(limit))
    run = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    assert run.stderr == ""
    assert raw_path.read_text(encoding="utf-8").splitlines() == run.stdout.splitlines()
    payload = payload_from_raw(orbit, shard_dir, start, end, limit)
    atomic_json(manifest_path, payload)
    print("SEALED_SHARD", manifest_path)
    print("ELAPSED_MS", payload["elapsed_ms"], "KEYS", payload["keys"])
    return manifest_path


def hash_ordered_files(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in paths:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b""):
                digest.update(chunk)
    return digest.hexdigest().upper()


def merge_complete(orbit: str, output_root: Path) -> Path:
    config = ORBITS[orbit]
    shard_dir = output_root / safe_orbit(orbit)
    manifests = [verify_manifest(path) for path in sorted(shard_dir.glob("*.manifest.json"))]
    full = [item for item in manifests if item["mode"] == "FULL_PREFIX"]
    full.sort(key=lambda item: item["prefix_range"])
    cursor = 0
    counts = [0] * 5
    unseen = 0
    coefficient_paths: list[Path] = []
    finite_paths: list[Path] = []
    ordered_manifests = []
    for item in full:
        start, end = item["prefix_range"]
        assert start == cursor, f"gap/overlap at prefix {cursor}: got {start}"
        cursor = end
        for index in range(5):
            counts[index] += item["counts"][index]
        unseen += item["unseen_rank_checks"]
        coefficient_paths.append(shard_dir / item["coefficient_stream"]["file"])
        finite_paths.append(shard_dir / item["finite_stream"]["file"])
        manifest_name = names_for(
            orbit, start, end, item["secondary_limit"]
        )["manifest"]
        ordered_manifests.append({
            "file": manifest_name,
            "sha256": sha256(shard_dir / manifest_name),
        })
    assert cursor == config["prefixes"], f"incomplete coverage: {cursor}/{config['prefixes']}"
    assert counts == config["counts"]
    assert unseen == config["unseen"]
    payload = {
        "schema": "rank8-delta03-e4-exact-ordered-prefix-shard-merge-agent-v1",
        "status": "PASS_EXACT_COMPLETE_ORDERED_PREFIX_SHARD_MERGE",
        "orbit": orbit,
        "coverage": [0, config["prefixes"]],
        "secondary_total": config["secondary"],
        "counts": counts,
        "unseen_rank_checks": unseen,
        "coefficient_stream_sha256": hash_ordered_files(coefficient_paths),
        "finite_stream_sha256": hash_ordered_files(finite_paths),
        "ordered_shard_manifests": ordered_manifests,
        "immutable_input_hashes": input_hashes(orbit),
        "runner_source_sha256": sha256(Path(__file__)),
        "scope_guard": "Complete exact producer stream only; independent literal audit remains separately required.",
    }
    output = shard_dir / f"{safe_orbit(orbit)}_complete_ordered_merge_exact_agent_20260823.json"
    if output.exists():
        assert json.loads(output.read_text(encoding="utf-8")) == payload
    else:
        atomic_json(output, payload)
    print(payload["status"])
    print("STREAM", payload["coefficient_stream_sha256"], payload["finite_stream_sha256"])
    print("REPORT", sha256(output))
    return output


def status(orbit: str, output_root: Path) -> None:
    config = ORBITS[orbit]
    shard_dir = output_root / safe_orbit(orbit)
    manifests = [verify_manifest(path) for path in sorted(shard_dir.glob("*.manifest.json"))]
    full_ranges = sorted(
        item["prefix_range"] for item in manifests if item["mode"] == "FULL_PREFIX"
    )
    cursor = 0
    contiguous = 0
    for start, end in full_ranges:
        if start != cursor:
            break
        cursor = end
        contiguous += end - start
    print("ORBIT", orbit)
    print("PREFIXES", config["prefixes"], "CONTIGUOUS_FROM_ZERO", contiguous)
    print("VERIFIED_FULL_SHARDS", len(full_ranges), "VERIFIED_MANIFESTS", len(manifests))


def plan() -> None:
    for orbit, config in ORBITS.items():
        coefficient_bytes = 32 * config["counts"][4]
        finite_bytes = 32 * config["counts"][1]
        print(
            orbit,
            "PREFIXES", config["prefixes"],
            "SECONDARY", config["secondary"],
            "STREAM_GIB", f"{(coefficient_bytes + finite_bytes) / 2**30:.3f}",
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("plan")
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("orbit", choices=sorted(ORBITS))
    run_parser.add_argument("start", type=int)
    run_parser.add_argument("end", type=int)
    run_parser.add_argument("--secondary-limit", type=int)
    run_parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT)
    merge_parser = subparsers.add_parser("merge")
    merge_parser.add_argument("orbit", choices=sorted(ORBITS))
    merge_parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT)
    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("orbit", choices=sorted(ORBITS))
    status_parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT)
    arguments = parser.parse_args()
    if arguments.command == "plan":
        plan()
    elif arguments.command == "run":
        run_shard(
            arguments.orbit,
            arguments.start,
            arguments.end,
            arguments.secondary_limit,
            arguments.output_root,
        )
    elif arguments.command == "merge":
        merge_complete(arguments.orbit, arguments.output_root)
    else:
        status(arguments.orbit, arguments.output_root)


if __name__ == "__main__":
    main()
