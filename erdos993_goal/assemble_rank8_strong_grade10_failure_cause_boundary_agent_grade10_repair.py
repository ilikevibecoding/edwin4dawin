#!/usr/bin/env python3
"""Assemble the exact evidence boundary for the grade-10 stream failure.

This report deliberately distinguishes the application-level failure mechanism
from a low-level library attribution.  It never rewrites producer artifacts.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
from pathlib import Path


HERE = Path(__file__).resolve().parent
FAILURE = HERE / "rank8_low_low_a23_mixed_cross_multidegree_family_failure_agent_20260823.json"
PRESERVED_FAILURE = HERE / "rank8_strong_grade10_prior_stream_failure_evidence_agent_grade10_repair.json"
DIAGNOSTIC = HERE / "rank8_strong_grade10_flint_term_order_diagnostic_agent_grade10_repair.json"
BOUNDARY_TEST = HERE / "rank8_strong_grade10_stream_repair_boundary_test_agent_grade10_repair.json"
REPAIRED_SOURCE = HERE / "probe_rank8_strong_grade10_homogeneous_stream_repair_agent_grade10_repair.py"
REPAIRED_JOB = (
    HERE
    / "_multidegree_grade10_repair_20260827"
    / "rank8_low_low_a23_mixed_cross_strong_grade10_multidegree_family_job_agent_grade10_repair.json"
)
REPLAY_DIRECTORY = HERE / "_multidegree_grade10_replay_20260826"
WER_REPORT = Path(
    r"C:\ProgramData\Microsoft\Windows\WER\ReportArchive"
    r"\AppCrash_PythonSoftwareFo_f65854beb8201e73fea2b32b4058eb382a4341_aec91205_4d425009-4a0d-4060-bc3c-c9fb66a2f325"
    r"\Report.wer"
)

EXPECTED = {
    "failure": "5D7C0CC701BCD494E69ACD290869DD38BDD2D312D86E2681F342198BA3CE085E",
    "preserved_failure": "72E64FCABFDF31865AE69D725985D5C2C8902214B3F237D056EB5A11109AD874",
    "diagnostic": "2A07D461E9D4B5B177DBD9874095EEEBB7D9560F01FF08A2906EB79782A9D2A2",
    "boundary_test": "D14371437E23D5CA16FBA101F7111E27D441D32E1F8ED64CAACF5D3AB6C66655",
    "repaired_source": "8C8D8E5C622FCF395BDDE70BFC4874FE1AF115448CDB6283FD334DEBA948439E",
    "repaired_job": "7BE33F3AAD5513E84F9EA93DC3C87439BB24BC39A503F4F33DFF10CB18A74386",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def load_pinned(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected, (path, actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


def diagnostic_sample(piece: dict, index: int) -> dict:
    matches = [sample for sample in piece["samples"] if sample["index"] == index]
    assert len(matches) == 1, (piece["piece"], index)
    return matches[0]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="rank8_strong_grade10_failure_cause_boundary_agent_grade10_repair.json",
    )
    args = parser.parse_args()

    failure = load_pinned(FAILURE, EXPECTED["failure"])
    preserved = load_pinned(PRESERVED_FAILURE, EXPECTED["preserved_failure"])
    diagnostic = load_pinned(DIAGNOSTIC, EXPECTED["diagnostic"])
    boundary = load_pinned(BOUNDARY_TEST, EXPECTED["boundary_test"])
    job = load_pinned(REPAIRED_JOB, EXPECTED["repaired_job"])
    assert sha256(REPAIRED_SOURCE) == EXPECTED["repaired_source"]

    assert failure["exception_type"] == "AssertionError"
    exception = ast.literal_eval(failure["exception"])
    previous_order = exception["previous"]
    failed_order = exception["next"]
    previous_monomial = tuple(reversed(previous_order[1]))
    failed_monomial = tuple(reversed(failed_order[1]))
    corrected_monomial = (7 - sum(failed_monomial[1:5]),) + failed_monomial[1:]
    assert previous_monomial == corrected_monomial
    assert failed_monomial[0] - corrected_monomial[0] == 32
    assert failed_monomial[1:] == corrected_monomial[1:]
    assert sum(previous_monomial) == 17
    assert sum(failed_monomial) == 49
    assert sum(corrected_monomial[:5]) == 7
    assert sum(corrected_monomial[5:]) == 10

    assert diagnostic["status"] == "PASS_DIAGNOSTIC_COMPLETED"
    fresh_targets = []
    for piece_number, index in ((0, 6_329_474), (2, 2_340_067)):
        piece = diagnostic["pieces"][piece_number]
        sample = diagnostic_sample(piece, index)
        raw = tuple(sample["monomial_reads"][0])
        assert raw == corrected_monomial
        assert sample["monomial_reads_identical"]
        assert sample["coefficient_reads_identical"]
        assert sample["coefficient_at_decoded_monomial"] == sample[
            "coefficient_at_base_homogeneity_corrected_monomial"
        ]
        fresh_targets.append(
            {
                "piece": piece_number,
                "index": index,
                "monomial": list(raw),
                "coefficient": sample["coefficient_reads"][0],
                "monomial_read_repetitions": len(sample["monomial_reads"]),
                "coefficient_read_repetitions": len(sample["coefficient_reads"]),
            }
        )

    assert boundary["status"] == "PASS_FAIL_CLOSED_REPAIR_BOUNDARY_EXERCISED"
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    repair_summary = job["stream_repair_summary"]
    assert repair_summary["decoded_homogeneity_anomalies"] == 0
    assert repair_summary["off_requested_multidegree_terms_skipped"] == 0
    assert repair_summary["residual_nonmonotone_transitions"] == 0

    replay_entries = sorted(str(path.relative_to(REPLAY_DIRECTORY)) for path in REPLAY_DIRECTORY.rglob("*"))
    assert replay_entries == []

    wer = WER_REPORT.read_text(encoding="utf-16", errors="replace")
    if "EventType=MoAppCrash" not in wer:
        # WER files on this host are currently ANSI/UTF-8 despite the Windows
        # convention permitting UTF-16.
        wer = WER_REPORT.read_text(encoding="utf-8", errors="replace")
    assert "EventType=MoAppCrash" in wer
    assert "Sig[7].Value=c0000005" in wer
    assert "site-packages\\python_flint.libs\\libflint" in wer
    assert "site-packages\\flint\\types\\fmpz_mpoly.pyd" in wer
    event_time = re.search(r"EventTime=(\d+)", wer)
    report_identifier = re.search(r"ReportIdentifier=([^\r\n]+)", wer)
    assert event_time and report_identifier

    payload = {
        "schema": "rank8-strong-grade10-failure-cause-boundary-agent-grade10-repair-v1",
        "status": "PASS_EXACT_FAILURE_MECHANISM_AND_ATTRIBUTION_BOUNDARY",
        "scope": {
            "family": "strong",
            "grade": 10,
            "face": [0, 1],
            "outer_exponent": 0,
            "does_not_certify_grades": "all grades other than strong grade 10",
        },
        "historic_failure": {
            "path": str(FAILURE),
            "sha256": EXPECTED["failure"],
            "preserved_path": str(PRESERVED_FAILURE),
            "preserved_sha256": EXPECTED["preserved_failure"],
            "post_advance_indices": exception["indices"],
            "previous_monomial": list(previous_monomial),
            "failed_decoded_monomial": list(failed_monomial),
            "invariant_corrected_monomial": list(corrected_monomial),
            "only_coordinate_difference": {"variable": "h", "delta": 32},
            "previous_total_degree": 17,
            "failed_decoded_total_degree": 49,
            "application_level_failure_mechanism": (
                "The original key() trusted poly.monomial(index) before checking exact "
                "homogeneity.  The h=36 return therefore produced a total-degree-49 key "
                "and violated the monotone degree-17 merge order."
            ),
        },
        "fresh_reconstruction": {
            "diagnostic_path": str(DIAGNOSTIC),
            "diagnostic_sha256": EXPECTED["diagnostic"],
            "python_flint_version": diagnostic["python_flint_version"],
            "flint_version": diagnostic["flint_version"],
            "target_terms": fresh_targets,
            "historic_h_plus_32_reproduced": False,
        },
        "repair_run": {
            "source_path": str(REPAIRED_SOURCE),
            "source_sha256": EXPECTED["repaired_source"],
            "job_path": str(REPAIRED_JOB),
            "job_sha256": EXPECTED["repaired_job"],
            "decoded_homogeneity_anomalies": 0,
            "off_requested_multidegree_terms_skipped": 0,
            "residual_nonmonotone_transitions": 0,
            "normalization_was_used_to_create_passed_rows": False,
            "boundary_test_path": str(BOUNDARY_TEST),
            "boundary_test_sha256": EXPECTED["boundary_test"],
        },
        "adjacent_native_crash_evidence": {
            "classification": "circumstantial_only",
            "wer_report_path": str(WER_REPORT),
            "wer_report_sha256": sha256(WER_REPORT),
            "wer_event_time_filetime": event_time.group(1),
            "wer_report_identifier": report_identifier.group(1),
            "wall_time_local_from_windows_event_log": "2026-08-26T14:16:30.5692116-04:00",
            "failed_replay_directory_creation_time_local": "2026-08-26T14:21:36-04:00",
            "exception_code": "0xc0000005",
            "fault_module": "python312.dll",
            "flint_loaded": True,
            "fmpz_mpoly_extension_loaded": True,
            "proves_same_process_or_same_code_path": False,
        },
        "replay_directory": {
            "path": str(REPLAY_DIRECTORY),
            "completed_entries": replay_entries,
            "completed_output_count": 0,
        },
        "official_source_path": {
            "python_flint_0_9_0_monomial": (
                "https://github.com/flintlib/python-flint/blob/0.9.0/src/flint/types/fmpz_mpoly.pyx"
            ),
            "flint_3_6_0_term_exp": (
                "https://github.com/flintlib/flint/blob/v3.6.0/src/fmpz_mpoly/get_term_exp_fmpz.c"
            ),
            "flint_3_6_0_unpack": (
                "https://github.com/flintlib/flint/blob/v3.6.0/src/mpoly/get_monomial.c"
            ),
            "delegation_observed": (
                "python-flint monomial() calls fmpz_mpoly_get_term_exp_fmpz, "
                "which delegates exponent unpacking to FLINT."
            ),
        },
        "attribution_boundary": {
            "deterministic_application_level_cause_proven": True,
            "historic_return_was_outside_the_exact_polynomial_invariants": True,
            "historic_stored_polynomial_corruption_excluded": False,
            "specific_python_flint_or_flint_decode_defect_proven": False,
            "reason": (
                "The historic polynomial state was not serialized, the h+32 return did "
                "not reproduce in a fresh exact reconstruction, and the passed producer "
                "encountered zero anomalies.  The WER crash is adjacent but cannot be "
                "identified as the same process."
            ),
            "repaired_source_docstring_library_attribution_is_a_hypothesis_not_a_certificate": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    digest = atomic_json(output, payload)
    print("CAUSE_BOUNDARY", output, digest, flush=True)


if __name__ == "__main__":
    main()
