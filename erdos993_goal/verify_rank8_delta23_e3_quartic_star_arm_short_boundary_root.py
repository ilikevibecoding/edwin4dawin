#!/usr/bin/env python3
"""Reuse the sealed 3,133-cell arm partition for exact Delta2/Delta3."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import sympy as sp

import verify_rank8_delta01_e3_quartic_star_arm_short_boundary_flint_agent as base
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
ALL_LONG = ROOT / "rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json"
CHECKPOINT = ROOT / "rank8_delta23_e3_quartic_star_arm_short_boundary_checkpoint_root_20260823.json"
FAILURE = ROOT / "rank8_delta23_e3_quartic_star_arm_short_boundary_first_failure_root_20260823.json"
EXPECTED = {
    "verify_rank8_delta01_e3_quartic_star_arm_short_boundary_flint_agent.py": "56EFD77C357C6225C99B0CBA2B6BAA75ED014E4D6E6BA15E22E037A552965753",
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    ALL_LONG.name: "A85298D7742D76D20CAA50CE52465B9C4033AC91CC809E2E6EAB168E27A16236",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    base.RANKS = (2, 3)
    base.DELTA_TERMS = {
        rank: [
            (powers, base.rational(coefficient))
            for powers, coefficient in sp.Poly(
                sp.expand(newton_coefficients(residual())[rank]), *base.SOURCE_SYMBOLS
            ).terms()
        ]
        for rank in base.RANKS
    }
    base.CHECKPOINT = CHECKPOINT
    base.OUTPUT = OUTPUT
    base.FAILURE = FAILURE
    base.ALL_LONG_REPORT = ALL_LONG
    base.EXPECTED_DEPENDENCIES = {
        "verify_rank8_q8_terminal_reduction.py": EXPECTED["verify_rank8_q8_terminal_reduction.py"],
        ALL_LONG.name: EXPECTED[ALL_LONG.name],
    }
    # The base runner parses sys.argv; this wrapper currently exposes the same
    # --max-new-cells and --checkpoint-every controls without adding arguments.
    return_code = base.main()
    if return_code != 0 or not OUTPUT.exists():
        return return_code
    payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert set(payload["rank_totals"]) == {"2", "3"}
    assert payload["no_gap_cover"]["computed_shifted_cells"] == 3133
    assert payload["no_gap_cover"]["inherited_all_long_cells"] == 1
    engine_source = payload["source_sha256"]
    payload["schema"] = "rank8-delta23-e3-quartic-star-arm-short-boundary-exact-root-v1"
    payload["status"] = "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    payload["theorem"] = "For every subdivision of the four-arm star of order n>=37 and every root on an arm, Delta2>0 and Delta3>0."
    payload["engine_source_sha256"] = engine_source
    payload["wrapper_immutable_inputs"] = actual
    payload["source_sha256"] = sha256(Path(__file__))
    payload["scope_warning"] = "This closes only quartic-star arm-root Delta2/Delta3 for n>=37. Center roots, finite orders, cubic e=3, other connected cases, forest Q8, PGC, and Problem 993 are separately gated."
    base.atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
