#!/usr/bin/env python3
"""Pin adjacent native-crash evidence relevant to the grade-10 replay failure."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


HERE = Path(__file__).resolve().parent
ARCHIVE = Path(r"C:\ProgramData\Microsoft\Windows\WER\ReportArchive")
REPORTS = (
    (
        "AppCrash_PythonSoftwareFo_6e1f38f73dd6d1da85def3ae2bb5b40991b6783_aec91205_ec8458f7-f88b-48df-9218-dac5a818a8da",
        "2B4E945A64DB3ED35816FFD69FA968706C05377ACC1A72F13F6F5838130DE44C",
    ),
    (
        "AppCrash_PythonSoftwareFo_a290fba05d90d33e9dbe2d4dc5177cfcec6ba3b2_aec91205_d1fa5500-f90d-4c4a-b173-a6f94216cc4c",
        "DA0FA47C095B7EADE7BCD87CAB63F2DBFD60A4993429EE43C2E9AD7505A6F99A",
    ),
    (
        "AppCrash_PythonSoftwareFo_8cd1126c4d30ffa5b9556b7ff62fd527f676f4ed_aec91205_9a7b22e1-65b9-4130-8308-112a2236a77c",
        "C7C9EE86F63D017964A1E49B38A37A209AC06C636E77E95388F5E52B51EBB023",
    ),
    (
        "AppCrash_PythonSoftwareFo_56cdeb4a58350e0936e899bb50d8df70222bae_aec91205_e4116b8b-d443-4fb1-b249-7d15f5b2c76d",
        "FC9A6F4EBD0594F0BB1ABF781D5A90605EC39CC0366F9496AEE3FE415921F8F0",
    ),
    (
        "AppCrash_PythonSoftwareFo_6e1f38f73dd6d1da85def3ae2bb5b40991b6783_aec91205_b45cfef0-d27b-402d-8d8d-6165bfbd3770",
        "58F2DB71F0D73067C547B3CA139761BB62A873CDA9052ABCFE5991A9571DFDA2",
    ),
    (
        "AppCrash_PythonSoftwareFo_f65854beb8201e73fea2b32b4058eb382a4341_aec91205_4d425009-4a0d-4060-bc3c-c9fb66a2f325",
        "E398BD91F970C1B0F3111D20D4DED1A4A9748804412890B57A8357CC4850071D",
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def field(text: str, pattern: str) -> str:
    match = re.search(pattern, text)
    assert match, pattern
    return match.group(1)


def filetime_iso(value: str) -> str:
    # Windows FILETIME counts 100 ns units since 1601-01-01 UTC.
    seconds = (int(value) - 116444736000000000) / 10_000_000
    return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat()


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="rank8_strong_grade10_native_crash_corroboration_agent_grade10_repair.json",
    )
    args = parser.parse_args()

    records = []
    for directory, expected_hash in REPORTS:
        path = ARCHIVE / directory / "Report.wer"
        actual_hash = sha256(path)
        assert actual_hash == expected_hash, (path, actual_hash, expected_hash)
        raw = path.read_bytes()
        text = raw.decode("utf-16", errors="replace")
        if "EventType=MoAppCrash" not in text:
            text = raw.decode("utf-8", errors="replace")
        assert "EventType=MoAppCrash" in text
        assert "Sig[7].Value=c0000005" in text
        assert "site-packages\\python_flint.libs\\libflint" in text
        assert "site-packages\\flint\\types\\fmpz_mpoly.pyd" in text
        event_time = field(text, r"EventTime=(\d+)")
        records.append(
            {
                "event_time_utc": filetime_iso(event_time),
                "exception_code": "0xc0000005",
                "fault_module": field(text, r"Sig\[4\]\.Value=([^\r\n]+)"),
                "flint_loaded": True,
                "fmpz_mpoly_extension_loaded": True,
                "report_identifier": field(text, r"ReportIdentifier=([^\r\n]+)"),
                "report_path": str(path),
                "report_sha256": expected_hash,
            }
        )

    assert len(records) == 6
    payload = {
        "schema": "rank8-strong-grade10-native-crash-corroboration-agent-grade10-repair-v1",
        "status": "PASS_SIX_NATIVE_CRASH_RECORDS_PINNED_CAUSAL_ATTRIBUTION_STILL_OPEN",
        "scope": {
            "purpose": "corroborating environment evidence for the strong grade-10 replay failure",
            "these_crashes_are_proven_to_be_grade10_processes": False,
        },
        "window_utc": [records[0]["event_time_utc"], records[-1]["event_time_utc"]],
        "record_count": len(records),
        "all_exception_code_c0000005": True,
        "all_loaded_flint_and_fmpz_mpoly": True,
        "records": records,
        "causal_boundary": {
            "native_process_instability_in_the_adjacent_workload_is_corroborated": True,
            "specific_flint_function_or_grade10_process_identified": False,
            "python_flint_monomial_decode_defect_proven": False,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    digest = atomic_json(output, payload)
    print("NATIVE_CRASH_CORROBORATION", output, digest, flush=True)


if __name__ == "__main__":
    main()
