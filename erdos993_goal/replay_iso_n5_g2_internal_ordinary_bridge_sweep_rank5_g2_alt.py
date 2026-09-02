#!/usr/bin/env python3
"""Fresh-process duplicate replay of all eight internal-ordinary g2 k0 bridges."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "probe_iso_n5_g2_internal_ordinary_origin_bridge_cone_rank5_g2_alt.py"
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_bridge_sweep_replay_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_DETERMINISTIC_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BRIDGE_SWEEP_RANK5_G2_ALT"
PINNED = {
    "probe_iso_n5_g2_internal_ordinary_origin_bridge_cone_rank5_g2_alt.py":
        "7203D941660EAC630037ADBA6647581A8A668486FCB2D728641E8F1A0B3750E7",
    "probe_iso_n5_g2_internal_ordinary_parent_global_cone_rank5_g2_alt.py":
        "E6598CFD54B93599047205F25C5CA163C60A39F423D42E2D59CBD1C4C8F99E7A",
}


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(ell):
    return HERE / (
        f"iso_n5_g2_internal_ordinary_ell{ell}_k0_bridge_cone_probe_"
        "rank5_g2_alt_20260830.json"
    )


def main():
    assert {name: sha256(HERE / name) for name in PINNED} == PINNED
    first_bytes = {}
    first_hashes = {}
    replay_rows = []
    for replay in (1, 2):
        for ell in range(1, 9):
            environment = dict(os.environ)
            environment["ERDOS993_G2_INTERNAL_ORDINARY_BRIDGE_ELL"] = str(ell)
            completed = subprocess.run(
                [sys.executable, str(PRODUCER)], cwd=HERE, env=environment,
                check=True, capture_output=True, text=True,
            )
            assert "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_BRIDGE_CONE_RANK5_G2_ALT" in completed.stdout
            path = report_path(ell)
            data = path.read_bytes()
            report = json.loads(data)
            assert report["source_sha256"] == PINNED[PRODUCER.name]
            assert report["cell"] == {"ell": ell, "k_index": 0}
            assert report["status"] == "exact theorem certificate"
            assert [face["epsilon"] for face in report["faces"]] == [0, 1]
            assert all(face["exact_rational_certificate"] for face in report["faces"])
            digest = hashlib.sha256(data).hexdigest().upper()
            if replay == 1:
                first_bytes[ell] = data
                first_hashes[ell] = digest
            else:
                assert data == first_bytes[ell]
                assert digest == first_hashes[ell]
            replay_rows.append({
                "replay": replay, "ell": ell, "report_sha256": digest,
                "byte_length": len(data),
            })
            print("BRIDGE_REPLAY", replay, ell, digest, flush=True)

    report = {
        "marker": MARKER,
        "lengths": [1, 8], "k_index": 0,
        "fresh_process_replays": 2,
        "byte_identical_per_length": True,
        "report_sha256_by_ell": {str(ell): first_hashes[ell] for ell in range(1, 9)},
        "replay_rows": replay_rows,
        "pinned_dependencies_sha256": PINNED,
        "scope": (
            "Deterministic exact replay of the adjacent and nonadjacent bridge "
            "certificates for k-index zero at ell=1,...,8."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "report_sha256_by_ell": report["report_sha256_by_ell"],
        "byte_identical_per_length": True,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
