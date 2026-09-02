#!/usr/bin/env python3
"""Deterministically audit all six fail-closed five-cubic-T edge sealer templates."""

from __future__ import annotations

import hashlib
import json
import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_edge_sealer_templates_exact_agent_20260824.json"
ORBITS = (
    "center_middle_spine_internal",
    "middle_long_outer_spine_internal",
    "middle_pendant_internal",
    "center_short_outer_spine_internal",
    "long_outer_pendant_internal",
    "short_outer_pendant_internal",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load(path: Path) -> dict:
    return json.loads(read(path))


def namespace(path: Path) -> dict:
    compile(read(path), str(path), "exec")
    return runpy.run_path(str(path), run_name=f"template_audit_{path.stem}")


def check_existing_hashes(expected: dict[str, str]) -> list[str]:
    placeholders = []
    for name, expected_hash in expected.items():
        if expected_hash.startswith("FILL_"):
            placeholders.append(name)
            continue
        assert sha256(ROOT / name) == expected_hash, (name, expected_hash)
    return sorted(placeholders)


def integer_after(source: str, pattern: str) -> int:
    match = re.search(pattern, source)
    assert match is not None, pattern
    return int(match.group(1).replace("_", ""))


def main() -> None:
    rows = []
    for orbit in ORBITS:
        orbit_upper = orbit.upper()
        preflight_path = ROOT / f"rank8_delta03_e5_five_cubic_t_{orbit}_preflight_exact_agent_20260824.json"
        primary_path = ROOT / f"seal_rank8_delta03_e5_five_cubic_t_{orbit}_exact_agent.py"
        audit_path = ROOT / f"seal_rank8_delta03_e5_five_cubic_t_{orbit}_independent_audit_agent.py"
        assembler_path = ROOT / f"assemble_rank8_delta03_e5_five_cubic_t_{orbit}_n27_plus_agent.py"
        for path in (preflight_path, primary_path, audit_path, assembler_path):
            assert path.is_file(), path

        preflight = load(preflight_path)
        assert preflight["status"] == (
            f"PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_{orbit_upper}_PRIMARY_AUDIT_MATCH"
        )
        assert preflight["root_orbit"] == f"five_cubic_t:{orbit}"
        workload = preflight["exact_workload"]
        counts = (
            workload["all_short"],
            workload["eligible_finite_n28_plus"],
            workload["mixed_rays"],
            workload["all_long_rays"],
            workload["total_rays"],
        )
        assert counts[3] == 1 and counts[2] + counts[3] == counts[4]
        assert workload["unseen_rank_checks_per_engine"] == 4 * counts[4]
        assert workload["independent_literal_trees"] == counts[1] + 3 * counts[4]

        primary_source = read(primary_path)
        primary = namespace(primary_path)
        assert primary["RAW"].name == f"rank8_delta03_e5_five_cubic_t_{orbit}_i256_raw_agent_20260824.txt"
        assert primary["OUTPUT"].name == f"rank8_delta03_e5_five_cubic_t_{orbit}_all_order_exact_agent_20260824.json"
        assert primary["OBSERVED_RUNTIME_SECONDS"] is None
        primary_placeholders = check_existing_hashes(primary["EXPECTED"])
        assert primary_placeholders == [primary["RAW"].name]
        count_line = " ".join(str(value) for value in counts)
        assert f'assert rows["COUNTS"] == "{count_line}"' in primary_source
        assert f'assert rows["UNSEEN"] == "{workload["unseen_rank_checks_per_engine"]}"' in primary_source
        assert f"PASS_I256_E5_FIVE_CUBIC_T_{orbit_upper}" in primary_source
        rank_ray_samples = integer_after(primary_source, r'"rank_ray_samples":\s*([0-9_]+)')
        assert rank_ray_samples == 29 * 4 * counts[4]

        audit_source = read(audit_path)
        audit = namespace(audit_path)
        assert audit["PRIMARY"].name == primary["OUTPUT"].name
        assert audit["RAW"].name == f"rank8_delta03_e5_five_cubic_t_{orbit}_literal_i256_raw_agent_20260824.txt"
        assert audit["OUTPUT"].name == f"rank8_delta03_e5_five_cubic_t_{orbit}_all_order_independent_audit_agent_20260824.json"
        assert audit["OBSERVED_AUDIT_RUNTIME_SECONDS"] is None
        audit_placeholders = check_existing_hashes(audit["EXPECTED"])
        assert audit_placeholders == sorted(
            [
                primary_path.name,
                primary["OUTPUT"].name,
                audit["RAW"].name,
            ]
        )
        assert f'assert rows["COUNTS"] == "{count_line}"' in audit_source
        assert f'assert rows["UNSEEN"] == "{workload["unseen_rank_checks_per_engine"]}"' in audit_source
        assert f'assert rows["LITERAL_TREES"] == "{workload["independent_literal_trees"]}"' in audit_source
        assert f"PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_{orbit_upper}" in audit_source
        assert f"{workload['canonical_keys']:,} canonical keys" in audit_source

        assembler_source = read(assembler_path)
        assembler = namespace(assembler_path)
        assembler_placeholders = check_existing_hashes(assembler["EXPECTED"])
        assert assembler_placeholders == sorted(
            [
                primary_path.name,
                primary["OUTPUT"].name,
                audit_path.name,
                audit["OUTPUT"].name,
            ]
        )
        assert assembler["OUTPUT"].name == f"rank8_delta03_e5_five_cubic_t_{orbit}_n27_plus_exact_agent_20260824.json"
        for field in (
            "eligible_finite_n28_plus",
            "mixed_rays",
            "total_rays",
            "unseen_rank_checks_per_engine",
            "independent_literal_trees",
        ):
            assert f"{workload[field]:_}" in assembler_source
        assert f"five_cubic_t:{orbit}" in assembler_source

        for other in ORBITS:
            if other != orbit:
                assert other not in primary_source
                assert other not in audit_source
                assert other not in assembler_source

        rows.append(
            {
                "root_orbit": f"five_cubic_t:{orbit}",
                "workload": workload,
                "primary_template_sha256": sha256(primary_path),
                "audit_template_sha256": sha256(audit_path),
                "n27_plus_assembler_template_sha256": sha256(assembler_path),
                "required_future_placeholders": {
                    "primary": primary_placeholders,
                    "audit": audit_placeholders,
                    "assembler": assembler_placeholders,
                },
            }
        )

    assert [row["root_orbit"].split(":", 1)[1] for row in rows] == list(ORBITS)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-edge-sealer-templates-agent-v1",
        "status": "PASS_FAIL_CLOSED_E5_FIVE_CUBIC_T_SIX_EDGE_SEALER_TEMPLATES",
        "edge_orbits": rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Template audit only. Every raw-output hash, observed runtime, primary report, independent audit report, n>=27 assembler, and master-ledger replay remains mandatory before theorem credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ORBITS", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
