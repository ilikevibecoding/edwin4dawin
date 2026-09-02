#!/usr/bin/env python3
"""Pin the independent atom-stream auditor to the repaired grade-10 producer.

The mathematical auditor is imported unchanged.  This adapter changes only
its producer source pin and writes a separate adapter attestation after a pass.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent as audit


HERE = Path(__file__).resolve().parent
REPAIRED_PRODUCER = (
    "probe_rank8_strong_grade10_homogeneous_stream_repair_agent_grade10_repair.py",
    "8C8D8E5C622FCF395BDDE70BFC4874FE1AF115448CDB6283FD334DEBA948439E",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


def argument_value(name: str) -> str:
    position = sys.argv.index(name)
    return sys.argv[position + 1]


def main() -> None:
    assert sha256(HERE / REPAIRED_PRODUCER[0]) == REPAIRED_PRODUCER[1]
    audit.PRODUCER = REPAIRED_PRODUCER
    audit.main()

    output = Path(argument_value("--output")).resolve()
    report = json.loads(output.read_text(encoding="utf-8"))
    assert report["status"] == (
        "PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT"
    )
    assert report["producer_source"] == {
        "path": REPAIRED_PRODUCER[0], "sha256": REPAIRED_PRODUCER[1],
    }
    attestation = output.with_name(
        output.stem + "_adapter_agent_grade10_repair.json"
    )
    digest = atomic_json(attestation, {
        "schema": "rank8-strong-grade10-independent-audit-adapter-attestation-v1",
        "status": "PASS_REPAIRED_PRODUCER_PIN_AND_INDEPENDENT_AUDIT_REPORT_VERIFIED",
        "independent_audit_report": str(output),
        "independent_audit_report_sha256": sha256(output),
        "independent_auditor_source": {
            "path": Path(audit.__file__).name,
            "sha256": sha256(Path(audit.__file__)),
        },
        "repaired_producer_source": {
            "path": REPAIRED_PRODUCER[0], "sha256": REPAIRED_PRODUCER[1],
        },
        "adapter_source_sha256": sha256(Path(__file__)),
    })
    print("ADAPTER_ATTESTATION", attestation, digest, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        try:
            output = Path(argument_value("--output")).resolve()
        except Exception:
            output = HERE / "rank8_strong_grade10_repaired_independent_audit_agent_grade10_repair.json"
        failure = output.with_name(
            output.stem + "_adapter_failure_agent_grade10_repair.json"
        )
        atomic_json(failure, {
            "schema": "rank8-strong-grade10-independent-audit-adapter-failure-v1",
            "status": "FAIL_CLOSED_ADAPTER_OR_INDEPENDENT_AUDIT",
            "exception_type": type(error).__name__,
            "exception": str(error),
            "adapter_source_sha256": sha256(Path(__file__)),
            "repaired_producer_source": {
                "path": REPAIRED_PRODUCER[0], "sha256": REPAIRED_PRODUCER[1],
            },
        })
        raise
