#!/usr/bin/env python3
"""Build the fail-closed 124-cell producer/audit registry."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json"
CHECKLIST = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_FAIL_CLOSED_CHECKLIST_AGENT_20260822.md",
    "7FCE44A34F4C91C30004AF42495B6222C0E39F9B2BEEBDAA192B75ACFBE7A3DB",
)
DEGREE_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md",
    "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E",
)
GRADE2_EQUIVALENCE = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_2_equivalence_audit_agent_20260823.json",
    "1C6F6AFDEB6A3F179AC84F355656CB10050314E22BF3D9C727FCE14FE1C83B54",
)
GRADE2_JOB = (
    "rank8_low_low_a23_mixed_cross_face_01_grade_2_outer_stream_job_agent_20260823.json",
    "53630F53A82ADDD64A2FD6E973A799EA7C5277AF0771077233785705C6A951B2",
)
GRADE2_FACE10_JOB = (
    "rank8_low_low_a23_mixed_cross_face_10_grade_2_outer_stream_job_agent_20260823.json",
    "94CC91FAE681C40EA183D73B97423F85B1774397BBC7C98EAC7BDDFF6B6EFCDA",
)
PRODUCER_SOURCE_SHA256 = "BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC"
CURVATURE_AUDIT_SOURCE_SHA256 = "E8067096F1BEA40F48B752380106B15510248820FF48F3D6D18A98A85B1F736B"
STRONG_AUDIT_SOURCE_SHA256 = "C2CA4C11356B71A858414D5961065FC9D7CCB7B646405218D8D6A17E7D5521E5"
MULTIDEGREE_GRADE_ASSEMBLER_SOURCE_SHA256 = "F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8"
MULTIDEGREE_PRODUCER_SOURCE_SHA256 = "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342"
MULTIDEGREE_AUDIT_SOURCE_SHA256 = "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F"
LEGACY_CURVATURE_GRADE8_SOURCES = {
    "assembler": "D93047679E09669D11B2F36847A778072B46C1D12F0C06C1A746308868706981",
    "producer": "78D99F5B17D89DDA8352C2014829FAA4D2765426FA3045F5783A817A18D5280E",
    "audit": "4A71DA9856D3CA61027C904820FB86E9172D31946FDE2DCBFD6411C24CD6D5BF",
}
MULTIDEGREE_SCOPE_REPORT = (
    "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json",
    "4046A84E6B0460F4DF029279567AD93DCD4954520E4E44A95C4D1753A770A23A",
)
FACTORED_FACE_GRADE_ASSEMBLERS = {
    ("01", 14): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_14_full_assembler_agent_20260823.json",
        "070C5908D200A9CAE3C65804B8F1FD69E65D765EB49AACEADA6DACE451698C5F",
        "58332CA6BFDF88D9BD9AE1C77C0AA71A28BE7312EEB143D9C56473E7368B2848",
    ),
    ("10", 14): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_14_full_assembler_agent_20260823.json",
        "DBC5198EA92540DCC6CA64977F90A0D7B572D819806D98785381997ABDB8F5CD",
        "58332CA6BFDF88D9BD9AE1C77C0AA71A28BE7312EEB143D9C56473E7368B2848",
    ),
    ("01", 6): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_6_factored_assembler_agent_20260823.json",
        "ED088AF0CAEC59990B880CE484C69466F052D9974A47D62F27C2EF8498841A14",
        "2EF1C59DFAD60BEBA9A60BE9915A66D3A70CFDABFEBEA4D85C8DEB277EF5A5C8",
    ),
    ("01", 7): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_7_atom_stream_assembler_agent_20260823.json",
        "2AE8165A68C9D7E14CA2ACBD9E260DA7087AAE0F8A82B6FFB4D3165579665D0F",
        "444F0D70D6DFF291E9E1006CEBDF149AC5ABFAE22D56BC40DDD8DC14D33FAD3E",
    ),
    ("10", 6): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_6_factored_assembler_agent_20260823.json",
        "92BDFB53D53409ACF49824EF949FFAACE43FA16E07AB9863EC7C064601A75487",
        "0625B33445B1066C0B6691D5A8D6895081D2B8335BADC7DDB82024B7CAFB14B5",
    ),
    ("10", 7): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_7_atom_stream_assembler_agent_20260823.json",
        "86C801DCBF688C47ECD18FB3E2C178D3928ABD4995CC303F317B4392F18F3A90",
        "B7A368B0507890DE109EA2D3B1E391DE9E7B1B31242D414E92250FF06F473E65",
    ),
    ("01", 15): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_15_full_assembler_agent_20260823.json",
        "6259ECCC69A3B2E069954B99DF40CF6F87B6CC900A1ABF04CCE34FAD0E6E31F2",
        "FFC99496CEAAE1AEB59C1AB9FFD5A163FA628E5163B938454B6C36D235DA20F9",
    ),
    ("10", 15): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_15_full_assembler_agent_20260823.json",
        "68DE4519962B77C80EB40A013D00C495A6BFCCE8B0A42665F217A7E8E972A53E",
        "FFC99496CEAAE1AEB59C1AB9FFD5A163FA628E5163B938454B6C36D235DA20F9",
    ),
    ("01", 16): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_16_full_assembler_agent_20260823.json",
        "0605672C8855C5C44134F7F61A89E6B4218AD68087A09F65D0CB27764AEF246E",
        "056E3DBD922DDC0D5A8D72D7F145DEABCFB1C6D0CC07976255EFDE0712C8D85C",
    ),
    ("10", 16): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_16_full_assembler_agent_20260823.json",
        "C9B696677389366B1532EC606425CC31502FDFC98ADECFE3E3ACD096815E6014",
        "056E3DBD922DDC0D5A8D72D7F145DEABCFB1C6D0CC07976255EFDE0712C8D85C",
    ),
    ("01", 17): (
        "rank8_low_low_a23_mixed_cross_face_01_grade_17_top_shared_assembler_agent_20260823.json",
        "F547B25A1DEF155645E078DE3BE0BB22A0B2FED23367C9C72064A5FF91A6E205",
        "DDB22BA0470B526C3384B18827470F400D44EAEAD914D4BB39F2A60032972CE9",
    ),
    ("10", 17): (
        "rank8_low_low_a23_mixed_cross_face_10_grade_17_top_shared_assembler_agent_20260823.json",
        "93AD6F6B881683270C80F2F996DCB7A5228BD91CF3CCA70BFA156F6FAA396FD4",
        "DDB22BA0470B526C3384B18827470F400D44EAEAD914D4BB39F2A60032972CE9",
    ),
}
PARTIAL_FACE_GRADE_ASSEMBLERS = {}

GRADE2 = {
    "curvature_middle_times_4": (
        "D658830B808BC0A913C832C2E4CD3859C7273FC578E773AC30FC8F155DD6B0A7",
        "F091571CC5D1CFE6BF3D149907C083BB338E4E9D10B4E7D8B1DEA09FE1B91328",
    ),
    "curvature_far": (
        "7DFD8FA4354445C74C4977A6796FE3D35852D3FED765A00C31B52929F635C91C",
        "2C7F8486A07D0485F81D183287A4B50A36BF2FDD0BC32DB14A22A2C537865CB9",
    ),
    "strong_middle_times_4": (
        "D34DE4265874A2D2FBE0450B81EF3AD7B49C5C94686372130ED29EA6330A5135",
        "50A74B5CFD3DBE1427A63795A0CDE37DF66C9C8FCD396A945957CF9E70C5C650",
    ),
    "strong_far": (
        "DFE06F63D5EFD08002CA3497CBE6A606BA418A7BB2D1226F5355376C37A3AEC1",
        "7B54E2D2E2CBBEDFDA1E13806E8DA9DFE6DC2C00ABFF82D82493AD2AFD56D6C4",
    ),
}
GRADE2_FACE10 = {
    "curvature_middle_times_4": (
        "6E45993018CF6ED94059C54DCC28ED6A2616A0C3DEBAB088746449565C4DED73",
        "805060F0C946E2C2E99B26C588194FCB1E93B25034B09C4F22B5E9EC11CF3EAA",
    ),
    "curvature_far": (
        "685FBEF12986C249EAE342E8CAE890043CBBA82752737593C8489EAED43BA47A",
        "97BEF9491CEF738156A8459C116F864F45F6B4CD73AABD748CA8F119A06BD3CB",
    ),
    "strong_middle_times_4": (
        "CB4C36F4D35179BD6C6113409B929C82D1A52E92171478CAE69D31FEFBD08982",
        "EDE81EFBD92B3962501C4D5FA496BC842F657490A7F903EE946BF3FFEDE43DC5",
    ),
    "strong_far": (
        "AABB3596DCFD7C860F5AC3480496E2213547110A34FD7C7544A74C9984BE9D4F",
        "3C7184062E5F0F29697305D3DD4C9CE0E7C3C41E1FBF995430BCC5A6AFFF1C52",
    ),
}

GRADE7_LEGACY = {
    "curvature_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_7_row_agent_20260822.json",
        "F3DD6CA15DCB14E5872A8E0B3DCC1A16CD2A7928C5849FB28BBDFA34AC9E0065",
    ),
    "curvature_far": (
        "rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_7_row_agent_20260822.json",
        "ACC39E9FCE63113FAD5B583130E501779F995A1CCAC61BFE46042D5F7E4326F8",
    ),
    "strong_middle_times_4": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_7_outer_stream_agent_20260822_manifest.json",
        "EB4EAE82BA7B16EA19CCDD9FE69C38217D2ED79EC5EE84239B04D7B7F628B719",
    ),
    "strong_far": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_7_outer_stream_agent_20260822_manifest.json",
        "7DFF9A561385038300C797F5CB3732771E7B9D3FA58CF48BA804E07FCCE45923",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned(name: str, expected: str) -> Path:
    path = HERE / name
    actual = sha256(path)
    assert actual == expected, (name, actual, expected)
    return path


def family(label: str) -> str:
    return "curvature" if label.startswith("curvature_") else "strong"


def labels_for_degree(degree: int) -> list[str]:
    labels = []
    if degree <= 16:
        labels.extend(("curvature_middle_times_4", "curvature_far"))
    labels.extend(("strong_middle_times_4", "strong_far"))
    return labels


def standard_prefix(face: str, label: str, degree: int) -> str:
    return (
        f"rank8_low_low_a23_mixed_cross_face_{face}_{label}_grade_{degree}_"
        "outer_stream_agent_20260823"
    )


def audit_token_for(label: str) -> str:
    return (
        "outer_independent_audit_agent"
        if family(label) == "curvature"
        else "outer_independent_three_chunk_audit_agent"
    )


def standard_audit_name(face: str, label: str, degree: int) -> str:
    return standard_prefix(face, label, degree).replace(
        "outer_stream_agent", audit_token_for(label)
    ) + ".json"


def read_manifest(name: str, expected: str, face: list[int], label: str, degree: int) -> tuple[dict, list[dict]]:
    path = pinned(name, expected)
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
    assert payload["face"] == face
    assert payload["auxiliary"] == label
    assert payload["total_ordinary_slack_degree"] == degree
    assert payload["source_sha256"] == PRODUCER_SOURCE_SHA256
    assert payload["result"]["negative_terms"] == 0
    chunks = payload["result"]["chunks"]
    assert [item["outer_exponent"] for item in chunks] == [0, 1, 2]
    for item in chunks:
        chunk_path = Path(item["path"])
        assert sha256(chunk_path) == item["sha256"]
        assert item["negative_terms"] == 0
    assert sum(item["mixed_support_terms"] for item in chunks) == payload["result"]["mixed_support_terms"]
    return payload, chunks


def read_audit(
    name: str,
    expected: str,
    face: list[int],
    label: str,
    degree: int,
    manifest_hash: str,
    expected_source_hash: str,
) -> dict:
    path = pinned(name, expected)
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["face"] == face
    assert payload["auxiliary"] == label
    assert payload["total_ordinary_slack_degree"] == degree
    assert payload["manifest_sha256"] == manifest_hash
    assert payload["replayed_negative_terms"] == 0
    assert payload["status"].startswith("PASS_INDEPENDENT_EXACT_")
    assert payload["source_sha256"] == expected_source_hash
    return payload


def read_face_grade_job(
    name: str, face: list[int], degree: int
) -> tuple[dict, str, dict[str, dict]]:
    path = HERE / name
    job_hash = sha256(path)
    payload = json.loads(path.read_text(encoding="utf-8"))
    expected_labels = labels_for_degree(degree)
    assert payload["status"] == "PASS_COMPLETE_FACE_GRADE_ALL_REQUIRED_ROWS"
    assert payload["face"] == face
    assert payload["total_ordinary_slack_degree"] == degree
    assert payload["expected_rows"] == expected_labels
    assert payload["missing_rows"] == []
    assert payload["source_sha256"] == PRODUCER_SOURCE_SHA256
    rows = {item["auxiliary"]: item for item in payload["completed_rows"]}
    assert list(rows) == expected_labels
    assert len(rows) == len(payload["completed_rows"])
    for label, item in rows.items():
        expected_manifest = standard_prefix(
            "01" if face == [0, 1] else "10", label, degree
        ) + "_manifest.json"
        assert Path(item["manifest"]).name == expected_manifest
        assert sha256(HERE / expected_manifest) == item["manifest_sha256"]
        assert item["negative_terms"] == 0
    return payload, job_hash, rows


def read_multidegree_family_grade(
    family_name: str, degree: int
) -> tuple[dict, str, dict[tuple[str, str], dict]] | None:
    name = (
        "rank8_low_low_a23_mixed_cross_multidegree_"
        f"{family_name}_grade{degree}_assembler_agent_20260825.json"
    )
    path = HERE / name
    if not path.exists():
        return None
    checkpoint_hash = sha256(path)
    checkpoint = json.loads(path.read_text(encoding="utf-8"))
    assert checkpoint["status"] == (
        "PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_"
        "INDEPENDENTLY_AUDITED"
    )
    legacy_grade8 = (family_name, degree) == ("curvature", 8)
    expected_assembler_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["assembler"]
        if legacy_grade8
        else MULTIDEGREE_GRADE_ASSEMBLER_SOURCE_SHA256
    )
    expected_producer_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["producer"]
        if legacy_grade8
        else MULTIDEGREE_PRODUCER_SOURCE_SHA256
    )
    expected_audit_source = (
        LEGACY_CURVATURE_GRADE8_SOURCES["audit"]
        if legacy_grade8
        else MULTIDEGREE_AUDIT_SOURCE_SHA256
    )
    assert checkpoint["source_sha256"] == expected_assembler_source
    assert checkpoint["family"] == family_name
    assert checkpoint["total_ordinary_slack_degree"] == degree
    assert checkpoint["expected_cells"] == 4
    assert checkpoint["formula_scope_audit"] == {
        "path": MULTIDEGREE_SCOPE_REPORT[0],
        "sha256": MULTIDEGREE_SCOPE_REPORT[1],
    }
    assert all(checkpoint["checks"].values())
    producer = checkpoint["producer_job"]
    audit = checkpoint["independent_audit"]
    assert sha256(Path(producer["path"])) == producer["sha256"]
    assert sha256(Path(audit["path"])) == audit["sha256"]
    rows = {}
    expected_labels = {
        f"{family_name}_middle_times_4", f"{family_name}_far"
    }
    for row in checkpoint["assembled_cells"]:
        key = (row["face_token"], row["auxiliary"])
        assert key not in rows
        assert row["face"] == ([0, 1] if row["face_token"] == "01" else [1, 0])
        assert row["bridge_corner"] == [2 * value for value in row["face"]]
        assert row["auxiliary"] in expected_labels
        assert row["family"] == family_name
        assert row["negative_terms"] == 0
        assert row["producer_source_sha256"] == expected_producer_source
        assert row["audit_source_sha256"] == expected_audit_source
        assert sha256(Path(row["producer_manifest"])) == row["producer_manifest_sha256"]
        assert sha256(Path(row["audit_report"])) == row["audit_report_sha256"]
        rows[key] = row
    assert set(rows) == {
        (face_token, label)
        for face_token in ("01", "10")
        for label in expected_labels
    }
    return checkpoint, checkpoint_hash, rows


def atomic_write(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    pinned(*CHECKLIST)
    pinned(*DEGREE_NOTE)
    pinned(*GRADE2_EQUIVALENCE)
    pinned(*MULTIDEGREE_SCOPE_REPORT)
    face_grade_jobs = {}
    job_rows = {}
    for face_token, face_value in (("01", [0, 1]), ("10", [1, 0])):
        for degree in range(2, 18):
            job_name = (
                f"rank8_low_low_a23_mixed_cross_face_{face_token}_grade_{degree}_"
                "outer_stream_job_agent_20260823.json"
            )
            if not (HERE / job_name).exists():
                continue
            job, job_hash, rows = read_face_grade_job(job_name, face_value, degree)
            key = f"face_{face_token}_grade_{degree}"
            face_grade_jobs[key] = {
                "path": job_name,
                "sha256": job_hash,
                "observed_peak_private_bytes_at_checkpoints": job[
                    "observed_peak_private_bytes_at_checkpoints"
                ],
            }
            job_rows[(face_token, degree)] = rows

    assert face_grade_jobs["face_01_grade_2"]["sha256"] == GRADE2_JOB[1]
    assert face_grade_jobs["face_10_grade_2"]["sha256"] == GRADE2_FACE10_JOB[1]

    factored_checkpoints = {}
    factored_rows = {}
    for (face_token, degree), (name, expected_hash, expected_source) in (
        FACTORED_FACE_GRADE_ASSEMBLERS.items()
    ):
        path = pinned(name, expected_hash)
        checkpoint = json.loads(path.read_text(encoding="utf-8"))
        assert checkpoint["status"] == (
            f"PASS_HASH_PINNED_FACE_{face_token}_GRADE_{degree}_"
            "ALL_FOUR_ROWS_INDEPENDENTLY_AUDITED"
        )
        assert checkpoint["face"] == ([0, 1] if face_token == "01" else [1, 0])
        assert checkpoint["total_ordinary_slack_degree"] == degree
        assert checkpoint["source_sha256"] == expected_source
        rows = {item["auxiliary"]: item for item in checkpoint["rows"]}
        assert list(rows) == labels_for_degree(degree)
        assert all(item["negative_terms"] == 0 for item in rows.values())
        factored_rows[(face_token, degree)] = rows
        factored_checkpoints[f"face_{face_token}_grade_{degree}"] = {
            "path": name,
            "sha256": expected_hash,
            "source_sha256": expected_source,
        }

    for (face_token, degree), (name, expected_hash, expected_source, expected_labels) in (
        PARTIAL_FACE_GRADE_ASSEMBLERS.items()
    ):
        assert (face_token, degree) not in factored_rows
        path = pinned(name, expected_hash)
        checkpoint = json.loads(path.read_text(encoding="utf-8"))
        assert checkpoint["status"] == (
            f"PASS_HASH_PINNED_FACE_{face_token}_GRADE_{degree}_"
            "CURVATURE_ROWS_INDEPENDENTLY_AUDITED"
        )
        assert checkpoint["face"] == ([0, 1] if face_token == "01" else [1, 0])
        assert checkpoint["total_ordinary_slack_degree"] == degree
        assert checkpoint["source_sha256"] == expected_source
        assert checkpoint["formula_scope"]["canonical_oriented_left_tail_V"] is True
        assert checkpoint["formula_scope"]["full_convolution_C_excluded"] is True
        if degree == 15:
            assert checkpoint["formula_scope"]["surviving_pieces"] == ["base", "linear"]
            assert checkpoint["formula_scope"]["direction_excluded"] is True
            assert checkpoint["formula_scope"]["faces_computed_and_audited_separately"] is True
            assert checkpoint["formula_scope"]["face_hash_reuse"] is False
        elif degree == 14:
            assert checkpoint["formula_scope"]["exact_base_degree"] == 2
            assert checkpoint["formula_scope"]["surviving_pieces"] == ["base", "linear", "direction"]
            assert checkpoint["formula_scope"]["middle_scales"] == [4, 2, 0]
            assert checkpoint["formula_scope"]["far_scales"] == [1, 1, 1]
            assert checkpoint["formula_scope"]["faces_computed_and_audited_separately"] is True
            assert checkpoint["formula_scope"]["face_hash_reuse"] is False
        rows = {item["auxiliary"]: item for item in checkpoint["rows"]}
        assert tuple(rows) == expected_labels
        assert all(item["negative_terms"] == 0 for item in rows.values())
        factored_rows[(face_token, degree)] = rows
        factored_checkpoints[f"face_{face_token}_grade_{degree}"] = {
            "path": name,
            "sha256": expected_hash,
            "source_sha256": expected_source,
            "partial_required_rows": list(expected_labels),
            "canonical_tail_v_scope": True,
        }

    multidegree_checkpoints = {}
    multidegree_rows = {}
    for family_name in ("curvature", "strong"):
        for degree in range(8, 14):
            loaded = read_multidegree_family_grade(family_name, degree)
            if loaded is None:
                continue
            checkpoint, checkpoint_hash, rows = loaded
            token = f"{family_name}_grade_{degree}"
            multidegree_checkpoints[token] = {
                "path": (
                    "rank8_low_low_a23_mixed_cross_multidegree_"
                    f"{family_name}_grade{degree}_assembler_agent_20260825.json"
                ),
                "sha256": checkpoint_hash,
                "source_sha256": checkpoint["source_sha256"],
                "producer_job": checkpoint["producer_job"],
                "independent_audit": checkpoint["independent_audit"],
            }
            for (face_token, label), row in rows.items():
                key = (face_token, degree, label)
                assert key not in multidegree_rows
                multidegree_rows[key] = row

    cells = []
    audited = producer_only = missing = 0
    for face_token, face_value in (("01", [0, 1]), ("10", [1, 0])):
        for degree in range(2, 18):
            for label in labels_for_degree(degree):
                entry = {
                    "face_token": face_token,
                    "face": face_value,
                    "bridge_corner": [2 * face_value[0], 2 * face_value[1]],
                    "family": family(label),
                    "auxiliary": label,
                    "total_ordinary_slack_degree": degree,
                }
                prefix = standard_prefix(face_token, label, degree)
                manifest_name = prefix + "_manifest.json"
                audit_name = standard_audit_name(face_token, label, degree)
                manifest_path = HERE / manifest_name
                audit_path = HERE / audit_name
                multidegree_key = (face_token, degree, label)
                if multidegree_key in multidegree_rows:
                    row = multidegree_rows[multidegree_key]
                    entry.update({
                        "state": "SEALED_AND_INDEPENDENTLY_AUDITED",
                        "producer_manifest": row["producer_manifest"],
                        "producer_manifest_sha256": row["producer_manifest_sha256"],
                        "producer_source_sha256": row["producer_source_sha256"],
                        "ordered_coefficient_sha256": row["ordered_coefficient_sha256"],
                        "audit_report": row["audit_report"],
                        "audit_report_sha256": row["audit_report_sha256"],
                        "audit_source_sha256": row["audit_source_sha256"],
                        "multidegree_family_grade_checkpoint": multidegree_checkpoints[
                            f"{family(label)}_grade_{degree}"
                        ],
                    })
                    audited += 1
                elif label in factored_rows.get((face_token, degree), {}):
                    row = factored_rows[(face_token, degree)][label]
                    entry.update({
                        "state": "SEALED_AND_INDEPENDENTLY_AUDITED",
                        "producer_manifest": row["producer_manifest"],
                        "producer_manifest_sha256": row["producer_manifest_sha256"],
                        "producer_source_sha256": row["producer_source_sha256"],
                        "ordered_coefficient_sha256": row["ordered_coefficient_sha256"],
                        "audit_report": row["audit_report"],
                        "audit_report_sha256": row["audit_report_sha256"],
                        "audit_source_sha256": row["audit_source_sha256"],
                        "factored_face_grade_checkpoint": factored_checkpoints[
                            f"face_{face_token}_grade_{degree}"
                        ],
                    })
                    audited += 1
                elif manifest_path.exists():
                    # A standard producer row counts only as sealed when its
                    # all-required-rows face/grade job is also durably sealed.
                    assert (face_token, degree) in job_rows, (
                        "manifest exists without complete face/grade job",
                        manifest_name,
                    )
                    manifest_hash = sha256(manifest_path)
                    assert job_rows[(face_token, degree)][label]["manifest_sha256"] == manifest_hash
                    if degree == 2:
                        pinned_manifest_hash, pinned_audit_hash = (
                            GRADE2[label]
                            if face_token == "01"
                            else GRADE2_FACE10[label]
                        )
                        assert manifest_hash == pinned_manifest_hash
                    manifest, chunks = read_manifest(
                        manifest_name, manifest_hash, face_value, label, degree
                    )
                    if audit_path.exists():
                        audit_hash = sha256(audit_path)
                        if degree == 2:
                            assert audit_hash == pinned_audit_hash
                        expected_audit_source = (
                            CURVATURE_AUDIT_SOURCE_SHA256
                            if family(label) == "curvature"
                            else STRONG_AUDIT_SOURCE_SHA256
                        )
                        audit = read_audit(
                            audit_name,
                            audit_hash,
                            face_value,
                            label,
                            degree,
                            manifest_hash,
                            expected_audit_source,
                        )
                        assert (
                            audit["replayed_ordered_coefficient_sha256"]
                            == manifest["result"]["ordered_coefficient_sha256"]
                        )
                        entry.update({
                            "state": "SEALED_AND_INDEPENDENTLY_AUDITED",
                            "producer_manifest": manifest_name,
                            "producer_manifest_sha256": manifest_hash,
                            "producer_source_sha256": PRODUCER_SOURCE_SHA256,
                            "chunk_files": chunks,
                            "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                            "audit_report": audit_name,
                            "audit_report_sha256": audit_hash,
                            "audit_source_sha256": expected_audit_source,
                        })
                        audited += 1
                    else:
                        entry.update({
                            "state": "PRODUCER_SEALED_AUDIT_MISSING",
                            "producer_manifest": manifest_name,
                            "producer_manifest_sha256": manifest_hash,
                            "producer_source_sha256": PRODUCER_SOURCE_SHA256,
                            "chunk_files": chunks,
                            "ordered_coefficient_sha256": manifest["result"]["ordered_coefficient_sha256"],
                            "expected_audit_report": audit_name,
                        })
                        producer_only += 1
                elif face_token == "01" and degree == 7:
                    artifact_name, artifact_hash = GRADE7_LEGACY[label]
                    pinned(artifact_name, artifact_hash)
                    entry.update({
                        "state": "PRODUCER_SEALED_AUDIT_MISSING",
                        "producer_manifest": artifact_name,
                        "producer_manifest_sha256": artifact_hash,
                        "audit_report": None,
                        "audit_report_sha256": None,
                    })
                    producer_only += 1
                else:
                    prefix = standard_prefix(face_token, label, degree)
                    entry.update({
                        "state": "MISSING_PRODUCER_AND_AUDIT",
                        "expected_producer_manifest": prefix + "_manifest.json",
                        "expected_audit_report": audit_name,
                    })
                    missing += 1
                cells.append(entry)

    assert len(cells) == 124
    assert audited + producer_only + missing == 124
    remaining_by_face = {}
    for face_token in ("01", "10"):
        remaining_by_face[f"face_{face_token}"] = sorted({
            cell["total_ordinary_slack_degree"]
            for cell in cells
            if cell["face_token"] == face_token
            and cell["state"] != "SEALED_AND_INDEPENDENTLY_AUDITED"
        })
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-outer-registry-agent-v1",
        "status": f"CHECKPOINT_{audited}_AUDITED_{producer_only}_PRODUCER_ONLY_{missing}_MISSING",
        "required_cell_count": 124,
        "sealed_and_independently_audited": audited,
        "producer_sealed_audit_missing": producer_only,
        "missing_producer_and_audit": missing,
        "producer_source_sha256": PRODUCER_SOURCE_SHA256,
        "curvature_audit_source_sha256": CURVATURE_AUDIT_SOURCE_SHA256,
        "strong_audit_source_sha256": STRONG_AUDIT_SOURCE_SHA256,
        "grade2_equivalence_audit": {
            "path": GRADE2_EQUIVALENCE[0],
            "sha256": GRADE2_EQUIVALENCE[1],
        },
        "face_grade_jobs": face_grade_jobs,
        "factored_face_grade_checkpoints": factored_checkpoints,
        "multidegree_family_grade_checkpoints": multidegree_checkpoints,
        "immutable_theoretical_inputs": {
            "fail_closed_checklist": {"path": CHECKLIST[0], "sha256": CHECKLIST[1]},
            "degree_and_outer_support_note": {"path": DEGREE_NOTE[0], "sha256": DEGREE_NOTE[1]},
        },
        "cells": cells,
        "minimal_remaining_face_grade_order": {
            **remaining_by_face,
            "note": "At face_01 grade7 run audits only unless a legacy replay fails.",
        },
        "fail_closed_completion_rule": (
            "PASS only when all 124 cells are SEALED_AND_INDEPENDENTLY_AUDITED, "
            "all pinned file/source/dependency hashes match, every row has exactly "
            "b0 chunks 0,1,2, and every replayed negative count is zero."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    atomic_write(OUTPUT, payload)
    print("PASS", OUTPUT, sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
