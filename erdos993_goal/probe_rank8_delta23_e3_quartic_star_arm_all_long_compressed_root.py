#!/usr/bin/env python3
"""Exact compressed all-long quartic-star arm cell for Delta2/Delta3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent as base
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json"
EXPECTED = {
    "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py": "E99684BB7F42C00DC797A60B430BC1CBABFE8E9903F5C6A5F47E212D756464D9",
    "probe_rank8_delta2_e1_symbolic_cell.py": "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    base.RANKS = (2, 3)
    base.DELTA_TERMS = {
        rank: sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]), *base.SOURCE_SYMBOLS
        ).terms()
        for rank in base.RANKS
    }
    payload = base.evaluate("arm")
    assert payload["status"] == "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
    assert set(payload["ranks"]) == {"2", "3"}
    payload["schema"] = "rank8-delta23-e3-quartic-star-arm-all-long-compressed-exact-root-v1"
    payload["status"] = "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
    payload["claim_status"] = "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_LONG_COMPRESSED_CELL"
    payload["immutable_dependencies"] = actual
    payload["source_sha256"] = sha256(Path(__file__))
    payload["scope_warning"] = "This closes only the all-long quartic-star arm-root Delta2/Delta3 cell; short-boundary arm cells and other connected cases remain separate."
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RANKS", payload["ranks"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
