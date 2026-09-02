#!/usr/bin/env python3
"""Fail-closed exact assembly of every positive b3 slice of direct H_str."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_high_strong_b3_sliced_full_left.py"
CHECKPOINT = ROOT / "rank8_low_high_strong_b3_full_left_slices_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b3_full_left_slices_exact_20260820.json"
EXPECTED_PROBE = "78013F49A0054E2B6DC1884EC019A1E6DC944D60AF302750D65C6D07B4D89644"
EXPECTED = {
    1: (17_235_191, 1, 393_182_128_404_760_680),
    2: (10_606_008, 1, 233_584_957_392_162_480),
    3: (6_040_512, 2, 77_896_308_585_006_084),
    4: (3_221_170, 1, 15_511_083_293_515_020),
    5: (1_540_660, 2, 1_945_350_763_657_992),
    6: (642_531, 1, 149_624_029_700_808),
    7: (209_814, 2, 6_421_288_711_032),
    8: (43_155, 1, 118_263_586_200),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def run_slice(exponent: int) -> dict:
    result = subprocess.run(
        [sys.executable, str(PROBE), "--exponent", str(exponent)],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"slice {exponent} failed rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if len(lines) != 1:
        raise RuntimeError(f"slice {exponent} emitted unexpected output: {lines!r}")
    row = ast.literal_eval(lines[0])
    expected_terms, expected_minimum, expected_maximum = EXPECTED[exponent]
    assert row == {
        "b3_exponent": exponent,
        "terms": expected_terms,
        "negative": 0,
        "minimum": expected_minimum,
        "maximum": expected_maximum,
        "first_negative": None,
    }
    return row


def main() -> None:
    if sha256(PROBE) != EXPECTED_PROBE:
        raise SystemExit("probe hash changed; refusing to run")
    slices = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if (saved.get("probe_sha256") == EXPECTED_PROBE
                and saved.get("verifier_sha256") == sha256(Path(__file__))):
            slices = saved["slices"]
    completed = {int(row["b3_exponent"]) for row in slices}
    for exponent in range(1, 9):
        if exponent in completed:
            continue
        row = run_slice(exponent)
        slices.append(row)
        slices.sort(key=lambda item: item["b3_exponent"])
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_STRONG_B3_FULL_LEFT_SLICES",
            "probe_sha256": EXPECTED_PROBE,
            "verifier_sha256": sha256(Path(__file__)),
            "slices": slices,
        })
        print("PASS_SLICE", exponent, row["terms"], flush=True)
    assert [row["b3_exponent"] for row in slices] == list(range(1, 9))
    payload = {
        "schema": "rank8-low-high-strong-b3-full-left-slices-v1",
        "status": "PASS_EXACT_STRONG_B3_FULL_LEFT_COEFFICIENT_EXTENSION",
        "theorem": (
            "Every positive b3 coefficient of H_str=C*M0+h*d is strictly "
            "positive for arbitrary h,ta,a0,a2,a3,...,a7,tb,b0,b1,b2>=0 "
            "when b4=b5=b6=b7=0. Hence any proof on b3=0 extends to "
            "arbitrary b3 on that face."
        ),
        "ordered_exponents": list(range(1, 9)),
        "slices": slices,
        "aggregate_terms": sum(row["terms"] for row in slices),
        "aggregate_negative": 0,
        "minimum_nonzero_coefficient": min(row["minimum"] for row in slices),
        "immutable_inputs": {PROBE.name: EXPECTED_PROBE},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This removes b3 only after b4=b5=b6=b7 are zero. The simultaneous "
            "b4,b5 extension and final low/high join remain separate dependencies."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
