#!/usr/bin/env python3
"""Low-memory watcher that audits final rank-seven integration guards."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATE = ROOT / "rank7_integration_guard_watcher_20260820.json"
LOG = ROOT / "rank7_integration_guard_watcher_20260820.log"

REPLAY = ROOT / "rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json"
PAIR = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_n27_n38_exact_20260820.json"
H_FACE = ROOT / "rank7_delta0_joint_lower_b_h_extension_face_n27_n38_exact_20260820.json"
SMALL = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json"

EXPECTED = {
    "replay": "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_FRESH_REPLAY",
    "pair": "PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38",
    "h_face": "PASS_EXACT_RANK7_DELTA0_LOWER_B_H_EXTENSION_FACE_N27_N38",
    "small": "PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38",
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_state(payload: dict) -> None:
    temporary = STATE.with_suffix(STATE.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(STATE)


def append(message: str) -> None:
    with LOG.open("a", encoding="utf-8") as stream:
        stream.write(f"{now()} {message}\n")


def run(script: str, allowed_returncodes: set[int]) -> dict:
    completed = subprocess.run(
        [sys.executable, str(ROOT / script)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    result = {
        "script": script,
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "time": now(),
    }
    assert completed.returncode in allowed_returncodes, result
    assert completed.stderr.strip() == "", result
    append(f"ran {script} rc={completed.returncode} stdout={completed.stdout.strip()!r}")
    return result


def main() -> int:
    state = {
        "schema": "rank7-integration-guard-watcher-v1",
        "status": "WATCHING",
        "started": now(),
        "poll_seconds": 30,
        "large_pair_H_audit": None,
        "small_batch_audit": None,
        "assembler_runs": [],
    }
    write_state(state)
    append("watcher started")
    while True:
        replay = read(REPLAY)
        pair = read(PAIR)
        h_face = read(H_FACE)
        small = read(SMALL)
        progress = {
            "replay": None if replay is None else replay.get("status"),
            "pair": None if pair is None else {
                "status": pair.get("status"),
                "completed": pair.get("completed_jobs"),
                "expected": pair.get("expected_jobs"),
            },
            "h_face": None if h_face is None else {
                "status": h_face.get("status"),
                "completed": h_face.get("completed_jobs"),
                "expected": h_face.get("expected_jobs"),
            },
            "small": None if small is None else {
                "status": small.get("status"),
                "completed": small.get("completed_jobs"),
                "expected": small.get("expected_jobs"),
            },
        }
        state["last_poll"] = now()
        state["progress"] = progress

        for label, data in (("pair", pair), ("h_face", h_face), ("small", small)):
            if data is not None and data.get("status") not in ("RUNNING", EXPECTED[label]):
                state["status"] = "STOPPED_ON_NONPASS_INPUT"
                state["failure"] = {"label": label, "status": data.get("status")}
                write_state(state)
                append(f"stopped on {label} status={data.get('status')}")
                return 2

        if (
            state["large_pair_H_audit"] is None
            and pair is not None and pair.get("status") == EXPECTED["pair"]
            and h_face is not None and h_face.get("status") == EXPECTED["h_face"]
        ):
            state["large_pair_H_audit"] = run(
                "audit_rank7_delta0_lower_b_three_face_batches.py", {0}
            )
            state["assembler_runs"].append(run("assemble_rank7_integration_readonly.py", {0, 3}))

        if (
            state["small_batch_audit"] is None
            and small is not None and small.get("status") == EXPECTED["small"]
        ):
            state["small_batch_audit"] = run(
                "audit_rank7_delta0_small_m_three_face_batch.py", {0}
            )
            state["assembler_runs"].append(run("assemble_rank7_integration_readonly.py", {0, 3}))

        all_final = (
            replay is not None and replay.get("status") == EXPECTED["replay"]
            and pair is not None and pair.get("status") == EXPECTED["pair"]
            and h_face is not None and h_face.get("status") == EXPECTED["h_face"]
            and small is not None and small.get("status") == EXPECTED["small"]
            and state["large_pair_H_audit"] is not None
            and state["small_batch_audit"] is not None
        )
        if all_final:
            final = run("assemble_rank7_integration_readonly.py", {0})
            assert "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER" in final["stdout"]
            state["assembler_runs"].append(final)
            state["status"] = "PASS_ALL_GUARDS_FINAL_AND_AUDITED"
            state["completed"] = now()
            write_state(state)
            append("all guards final and audited")
            return 0

        write_state(state)
        time.sleep(30)


if __name__ == "__main__":
    raise SystemExit(main())
