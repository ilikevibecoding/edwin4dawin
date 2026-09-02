#!/usr/bin/env python3
"""Independent literal replay of the rooted-star Delta0 equality branch."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_rooted_star_equality_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_rooted_star_equality_agent.py": "8A4A0271F3E536F9F19FED9637586F12005404153B58AA634233FA08A122A02C",
    "rank8_delta0_new_leaf_rooted_star_equality_exact_agent_20260823.json": "BA32AA299B46F1E26F23705D9F4A8D006D5A2A091A746CA0C0BE5321BE4E457A",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(p7: sp.Expr, p8: sp.Expr, p9: sp.Expr) -> sp.Expr:
    return 16 * p8**2 - p7 * p8 - 18 * p7 * p9


def residual_at_t_one(core: dict[int, sp.Expr], deleted: dict[int, sp.Expr]) -> sp.Expr:
    p7 = core[7] + core[6] + deleted[6]
    p8 = core[8] + core[7] + deleted[7]
    p9_open = core[8]
    core_reserve = 16 * core[8] ** 2 - core[7] * core[8]
    deleted_reserve = 14 * deleted[7] ** 2 - deleted[6] * deleted[7]
    return sp.expand(
        8 * core[7] * deleted[6] * q8(p7, p8, p9_open)
        - 8 * deleted[6] * p7 * core_reserve
        - 9 * core[7] * p7 * deleted_reserve
    )


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED, (actual_hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_rooted_star_equality_exact_agent_20260823.json").read_text()
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_ROOTED_STAR_EQUALITY_BRANCH"

    M, A5 = sp.symbols("M A5", integer=True, positive=True)
    values = {
        5: A5,
        6: A5 * (M - 5) / 6,
        7: A5 * (M - 5) * (M - 6) / 42,
        8: A5 * (M - 5) * (M - 6) * (M - 7) / 336,
    }
    # Independent literal recurrences: C=D+xF, C'=C+xD, H'=C.
    deleted = {
        6: values[6] + values[5],
        7: values[7] + values[6],
        8: values[8] + values[7],
    }
    core = {
        6: deleted[6] + values[5],
        7: deleted[7] + values[6],
        8: deleted[8] + values[7],
    }
    literal = sp.factor(residual_at_t_one(core, deleted))
    expected_factor = (
        A5**4
        * (M - 5) ** 2
        * (M + 1) ** 2
        * (15 * M**3 + 319 * M**2 + 3064 * M + 8640)
        / sp.Integer(444528)
    )
    assert sp.factor(literal - expected_factor) == 0
    assert str(expected_factor) == primary["actual_gate_factor"]

    # Independently replay the only numerical thresholds in the structural
    # classification.  A forest on the displayed number of vertices has an
    # independent four-set, excluding r=2,3,4 from d5=f5.
    outside = {r: 26 - (26 // r) - (r - 1) for r in range(2, 5)}
    assert outside == {2: 12, 3: 16, 4: 17}
    assert all((count + 1) // 2 >= 4 for count in outside.values())
    # If |F|>=10 has an edge, a leaf ell leaves at least eight vertices after
    # N[ell] is removed, hence four independent vertices and a strict shadow
    # deficit for an independent five-set containing ell.
    assert (10 - 2 + 1) // 2 >= 4

    for sample in (25, 26, 40, 100):
        assert expected_factor.subs({M: sample, A5: sp.binomial(sample, 5)}) > 0

    payload = {
        "schema": "rank8-delta0-new-leaf-rooted-star-equality-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_ROOTED_STAR_EQUALITY_BRANCH",
        "hashes": actual_hashes,
        "literal_gate_factor": str(expected_factor),
        "classification_replay": {
            "r_2_to_4_outside_nonroot_vertices": outside,
            "r_at_least_5": "binom(r,5)>=1 gives the coefficient gap directly",
            "r_equal_1": "d5-f5=i4(D-N_D[u])",
            "sharp_shadow": "for |F|>=10 an edge supplies a leaf-based strict extension deficit",
        },
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
