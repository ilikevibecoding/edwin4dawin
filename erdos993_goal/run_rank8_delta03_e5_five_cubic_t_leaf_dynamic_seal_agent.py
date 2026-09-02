#!/usr/bin/env python3
"""Inject runtime-derived hashes into prewritten fail-closed T-leaf sealers."""

from __future__ import annotations

import argparse
import hashlib
import importlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ORBITS = {
    "middle_leaf": {
        "primary": "seal_rank8_delta03_e5_five_cubic_t_middle_leaf_exact_agent",
        "audit": (
            "seal_rank8_delta03_e5_five_cubic_t_middle_leaf_"
            "independent_audit_agent"
        ),
        "theorem": (
            "assemble_rank8_delta03_e5_five_cubic_t_middle_leaf_"
            "n27_plus_agent"
        ),
    },
    "long_outer_leaf": {
        "primary": (
            "seal_rank8_delta03_e5_five_cubic_t_long_outer_leaf_exact_agent"
        ),
        "audit": (
            "seal_rank8_delta03_e5_five_cubic_t_long_outer_leaf_"
            "independent_audit_agent"
        ),
        "theorem": (
            "assemble_rank8_delta03_e5_five_cubic_t_long_outer_leaf_"
            "n27_plus_agent"
        ),
    },
    "short_outer_leaf": {
        "primary": (
            "seal_rank8_delta03_e5_five_cubic_t_short_outer_leaf_exact_agent"
        ),
        "audit": (
            "seal_rank8_delta03_e5_five_cubic_t_short_outer_leaf_"
            "independent_audit_agent"
        ),
        "theorem": (
            "assemble_rank8_delta03_e5_five_cubic_t_short_outer_leaf_"
            "n27_plus_agent"
        ),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require_hash(value: str | None, flag: str) -> str:
    assert value is not None, f"missing {flag}"
    normalized = value.upper()
    assert len(normalized) == 64, flag
    int(normalized, 16)
    return normalized


def replace_placeholder(module, placeholder: str, value: str) -> None:
    matches = [
        name for name, expected in module.EXPECTED.items()
        if expected == placeholder
    ]
    assert len(matches) == 1, (module.__name__, placeholder, matches)
    module.EXPECTED[matches[0]] = value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("orbit", choices=sorted(ORBITS))
    parser.add_argument("stage", choices=("primary", "audit", "theorem"))
    parser.add_argument("--expected-raw-sha256")
    parser.add_argument("--observed-runtime-seconds", type=float)
    parser.add_argument("--expected-primary-sealer-sha256")
    parser.add_argument("--expected-primary-report-sha256")
    parser.add_argument("--expected-audit-sealer-sha256")
    parser.add_argument("--expected-audit-report-sha256")
    args = parser.parse_args()

    module = importlib.import_module(ORBITS[args.orbit][args.stage])
    if args.stage == "primary":
        raw_hash = require_hash(args.expected_raw_sha256, "expected raw hash")
        assert args.observed_runtime_seconds is not None
        assert args.observed_runtime_seconds > 0
        replace_placeholder(module, "FILL_PRIMARY_RAW_HASH", raw_hash)
        module.OBSERVED_RUNTIME_SECONDS = args.observed_runtime_seconds
    elif args.stage == "audit":
        raw_hash = require_hash(args.expected_raw_sha256, "expected raw hash")
        primary_sealer_hash = require_hash(
            args.expected_primary_sealer_sha256,
            "expected primary sealer hash",
        )
        primary_report_hash = require_hash(
            args.expected_primary_report_sha256,
            "expected primary report hash",
        )
        assert args.observed_runtime_seconds is not None
        assert args.observed_runtime_seconds > 0
        replace_placeholder(
            module,
            "FILL_PRIMARY_SEALER_HASH",
            primary_sealer_hash,
        )
        replace_placeholder(
            module,
            "FILL_PRIMARY_REPORT_HASH",
            primary_report_hash,
        )
        replace_placeholder(module, "FILL_AUDIT_RAW_HASH", raw_hash)
        module.OBSERVED_AUDIT_RUNTIME_SECONDS = args.observed_runtime_seconds
    else:
        primary_sealer_hash = require_hash(
            args.expected_primary_sealer_sha256,
            "expected primary sealer hash",
        )
        primary_report_hash = require_hash(
            args.expected_primary_report_sha256,
            "expected primary report hash",
        )
        audit_sealer_hash = require_hash(
            args.expected_audit_sealer_sha256,
            "expected audit sealer hash",
        )
        audit_report_hash = require_hash(
            args.expected_audit_report_sha256,
            "expected audit report hash",
        )
        replace_placeholder(
            module,
            "FILL_PRIMARY_SEALER_HASH",
            primary_sealer_hash,
        )
        replace_placeholder(
            module,
            "FILL_PRIMARY_REPORT_HASH",
            primary_report_hash,
        )
        replace_placeholder(
            module,
            "FILL_AUDIT_SEALER_HASH",
            audit_sealer_hash,
        )
        replace_placeholder(
            module,
            "FILL_AUDIT_REPORT_HASH",
            audit_report_hash,
        )

    module.main()
    assert module.OUTPUT.exists()
    print("DYNAMIC_SEAL_DRIVER", sha256(Path(__file__)))
    print("OUTPUT", module.OUTPUT.name, sha256(module.OUTPUT))


if __name__ == "__main__":
    main()
