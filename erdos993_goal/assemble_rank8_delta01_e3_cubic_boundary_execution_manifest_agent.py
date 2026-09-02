#!/usr/bin/env python3
"""Fail-closed execution manifest for the remaining cubic boundary scans."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_boundary_execution_manifest_agent_20260823.json"
EXPECTED = {
    "rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json":
        "223675665029E5F5482D1855D85B7A04DBC376C587E62C457145C10777E46475",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json":
        "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json":
        "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
    "verify_rank8_delta01_e3_cubic_newton_batch_reduction_agent.py":
        "1A9433828C1312A73625D51FEE8D929EDBE5895EF105FA02EECDC1191B56A88D",
    "rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json":
        "E1500D4DADC698D9125F51E780F91D5FF2621752FC984A9A90DD1F0DB90B2076",
    "verify_rank8_delta01_e3_cubic_short_boundary_batches_agent.py":
        "94942334232FFA39B9D9BDBAE75CDBB80D6ACE293EE8CCCB30BF5BCCA3AA6363",
    "audit_rank8_delta01_e3_cubic_boundary_universe_agent.py":
        "EF675AE3903757C090D7B9830E99CE029790BA4252EF53EA32EEF08DAE99281C",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json":
        "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "audit_rank8_delta01_e3_cubic_short_boundary_batch_agent.py":
        "06EE3504E118EACC7F0B8F97DBAFB8CCB9BBDF0334A5D1E5A642157DD2150210",
    "rank8_delta01_e3_cubic_mixed_outer_branch_batch_independent_audit_agent_20260823.json":
        "D920C99B1057437EA55B9C0BD858091C1BD5360EA5B4FFEE6AFC03A0C1414E88",
    "rank8_delta01_e3_cubic_mixed_outer_branch_checkpoint_agent_20260823.json":
        "0E618A3D5837A8F3EE05B185E6F54A372B53DCB006406789385D0C4B65095773",
}
ROOTS = (
    "outer_branch", "middle_branch", "outer_leaf", "middle_leaf",
    "outer_pendant_internal", "middle_pendant_internal", "spine_internal",
)
COUNTS = {
    "outer_branch": {"mixed": 592271, "all_short": 80652},
    "middle_branch": {"mixed": 296693, "all_short": 40553},
    "outer_leaf": {"mixed": 1184543, "all_short": 182356},
    "middle_leaf": {"mixed": 329795, "all_short": 53218},
    "outer_pendant_internal": {"mixed": 10365407, "all_short": 2349983},
    "middle_pendant_internal": {"mixed": 2893391, "all_short": 676950},
    "spine_internal": {"mixed": 5236991, "all_short": 1286834},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    stable = load("rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json")
    finite = load("rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json")
    partition = load("rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json")
    reduction = load("rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json")
    universe = load("rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json")
    pilot = load("rank8_delta01_e3_cubic_mixed_outer_branch_checkpoint_agent_20260823.json")
    pilot_audit = load("rank8_delta01_e3_cubic_mixed_outer_branch_batch_independent_audit_agent_20260823.json")
    assert stable["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_34_ORBITS_TO_7_CELLS"
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert partition["status"] == "PASS_EXACT_NO_GAP_PARTITION_REMAINING_OBLIGATIONS_EXPLICIT"
    assert reduction["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_MIXED_NEWTON_REDUCTION"
    assert universe["status"] == "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES"
    assert pilot_audit["status"] == "PASS_INDEPENDENT_LITERAL_TREE_AND_NEWTON_BATCH_AUDIT"
    assert pilot["completed_cells"] == 1100 and pilot["totals"]["negative_values_or_coefficients"] == 0
    assert sum(row["mixed"] for row in COUNTS.values()) == 20899091
    assert sum(row["all_short"] for row in COUNTS.values()) == 4670546

    work_units = []
    for label in ROOTS:
        for mode in ("mixed", "all_short"):
            work_units.append({
                "root_location_orbit": label,
                "mode": mode,
                "expected_cells": COUNTS[label][mode],
                "checkpoint": f"rank8_delta01_e3_cubic_{mode}_{label}_checkpoint_agent_20260823.json",
                "required_final_report": f"rank8_delta01_e3_cubic_{mode}_{label}_exact_agent_20260823.json",
                "required_final_status": (
                    "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_MIXED_CELL_NEWTON_CONE"
                    if mode == "mixed" else
                    "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND"
                ),
                "suggested_batch_cells": 5000 if mode == "mixed" else 10000,
                "suggested_batches": math.ceil(COUNTS[label][mode] / (5000 if mode == "mixed" else 10000)),
            })

    payload = {
        "schema": "rank8-delta01-e3-cubic-boundary-execution-manifest-agent-v1",
        "status": "READY_FAIL_CLOSED_EXACT_CUBIC_BOUNDARY_EXECUTION",
        "proved_inputs": {
            "finite_base": "all roots at n=27..36",
            "stable_interior": "34 joint extension orbits reduced to seven exact positive cells",
            "short_boundary_partition": "33,880,500 quotient patterns split with no gaps",
            "mixed_reduction": "degree at most 29 and exact 30-point Newton sign criterion",
            "work_universes": "all 25,569,637 remaining keys streamed and hash-pinned",
        },
        "remaining_work_units": work_units,
        "totals": {
            "work_units": len(work_units),
            "mixed_cells": 20899091,
            "all_short_n37_plus_cells": 4670546,
            "remaining_cells": 25569637,
            "required_final_reports": 14,
        },
        "pilot": {
            "work_unit": "mixed outer_branch",
            "completed_cells": 1100,
            "negative_coefficients": 0,
            "checkpoint_sha256": EXPECTED["rank8_delta01_e3_cubic_mixed_outer_branch_checkpoint_agent_20260823.json"],
            "independent_literal_tree_audit_sha256": EXPECTED["rank8_delta01_e3_cubic_mixed_outer_branch_batch_independent_audit_agent_20260823.json"],
        },
        "completion_gate": (
            "Do not assemble a cubic-skeleton theorem unless all fourteen final reports exist, "
            "their source/dependency hashes match this manifest, every completed count equals its "
            "expected universe, every negative total is zero, and an independent literal-tree audit "
            "has replayed each root/mode implementation."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is an execution manifest plus a 1,100-cell pilot, not the exhaustive boundary closure. "
            "The cubic-skeleton, connected-Q8, forest-Q8, and Problem-993 conclusions remain gated."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
