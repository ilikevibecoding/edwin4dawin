#!/usr/bin/env python3
"""Read-only dependency assembler for the rank-seven proof chain.

The script never launches a prover or edits an input certificate.  It checks
the current exact artifacts, regenerates all finite Delta0 keys, records any
still-running inputs as pending, and writes only its own integration report.
"""

from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "rank7_integration_readonly_20260820.json"


EXPECTED_HASHES = {
    "rank7_terminal_broom_finite_n18.log": "8D8C5E89202260CF3B61180324BE3A8C3BB3DF03C6812D7133F741A2527825BE",
    "rank7_terminal_broom_finite_n19_n20_exact_20260816.json": "3E0B7FE1D6FC55ED4801DFC9CF9357329301DE6EEC1AC5FF8A082B62B82BD6E8",
    "rank7_terminal_broom_finite_n21_exact_20260816.json": "0D0C1299EDF7FA7420CC325A5808D2CB51BA21B849F99AF60D4B745923EDEE86",
    "rank7_terminal_broom_finite_n22_low_exact_20260816.json": "70A84EBF3BCD15F8AFA3106893D101AE2803E000C08B4DC42CE841C7968AA4ED",
    "rank7_terminal_broom_finite_n23_low_exact_20260820.json": "C253A9B3FFDA33322A7331B77568CA26B4724FCCEEDA8CF12412634A43E3B09D",
    "rank7_terminal_broom_finite_n24_low_exact_20260820.json": "5BD98AE33CDD4A07F3FB09DFF6121E35390B690A4E9AB664C470E4D8833525DD",
    "rank7_terminal_broom_delta012_n25_exact_20260820.log": "FAAFBDE111122DDAFBB4F708C5E4221FCCB3DD793FA74969858C8F5D432D6A49",
    "rank7_terminal_broom_delta012_n26_exact_20260820.log": "B4A0F22DEC07FFD0E78D7B12AAE20CA4DB67DAC686AAF81BA20867CBEB86DCE1",
    "rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json": "81B99AC71502FBC48077D3600855C6AA22B61BE49129755C38FD1EFEA56BE0C9",
    "rank7_terminal_broom_delta123_cutoff25_exact_20260820.json": "DDE9C843D0D0ED33FAE283AB4D59AAC156045301F14C9655214BAE107F4A8456",
    "rank7_terminal_broom_delta456_cutoff25_exact_20260820.json": "D0F848B231AC1A993A057811756AA8FABE9302ECBFB704DAB0BFD9054ADBA7EA",
    "rank7_tree_terminal_broom_high_newton_exact_20260813.json": "3F881B08C48DA03799515CA42D6ADE2D29FC727E162500DA95E69CC7073C26AE",
    "rank7_terminal_broom_delta0_large_exact_20260816.json": "FCFBAF8D256E79DDDA8DDE03B39426EC0EFBAF5C733031A79E85B6C4C6A69F93",
    "rank7_delta0_very_small_j_n27_n38_exact_20260820.json": "3D9D0BC70EDDB50B43C0A1CE7A27554833C32DE18340A3CF1AF67D17649138F4",
    "rank7_delta0_joint_capacity_faces_small_j_n27_exact_20260820.json": "DA6B3B78B364CC37B32C6A128B9B347A09B4B86313D955BDD9F527A2B51026FE",
    "rank7_delta0_joint_capacity_faces_small_j_n28_n38_exact_20260820.json": "03589B656CB02BFE4B093931814E880BA2AC13FA0E25A8B9021FF504D5BAE083",
    "rank7_delta0_joint_capacity_faces_n27_exact_20260820.json": "7FE23FF9A004A6CD924A1D13B4F5166F05CECCC12CB51FECC137E849BCF48C3C",
    "rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json": "D73730C11984AC29A7AF2B3ADE27002396A8B31C21091F176465FEA014F9C832",
    "verify_rank7_terminal_broom_reduction.py": "B2D1869840AFFCD666BF725A128C0CA0BDD72ACC482F1B0EA01ACE9097AE49D9",
    "rank7_terminal_broom_small_core_splice_exact_20260820.json": "96242456FB1BAD0861F8B6731FEA21986F4B3E0FA673EB5A8C84545549881A20",
    "rank7_exceptional_small_tree_jets_exact_20260816.json": "26D221A833298109CAE33485D4FCB3011351ACB826710DFCC38ADB95A54CE17C",
    "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md": "703F7CECACB996BA20CDD50125B9D4EFD509436AE8295978144C7B3500883459",
    "rank6_three_halves_convolution_cones_exact_20260813.json": "547E55F2F4976B6EE4AAC8509D2949D757D171594D6D2601208AF89BE0347EDA",
    "rank6_three_halves_forest_certificate_exact_20260813.json": "DE4C3D9C3C46B2D2216D2D0FEDA87758E358A291254B6314271D1590F66A7877",
    "rank7_high_high_convolution_exact_20260813.json": "4560A9F5D0B0646EEA1BA078D2895131A7E6368861219F3EEC8D5272767C86B8",
    "rank7_low_high_full_cone_memory_bounded_exact_20260816.json": "8E7363ACA615C60065B3E1C2F1A6DEC38110CF9D58CA59CB5BB7553D89DF970D",
    "rank7_low_low_full_cone_memory_bounded_exact_20260816.json": "8A396F7872ABCA4A556BC0231355CB648C5D2D75DC38F5DAEAEB11FE9491EB2A",
    "rank7_forest_lift_conditional_exact_20260816.json": "5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E",
    "forest_v7_alpha12_exact_20260813.json": "0C0E713EA2E10B4F6431AF06B44E73B93B592782C4376FE5F596B20482027B5C",
    "rank7_alpha11_boundary_theorem_exact_20260813.json": "66B78AFF028EC8AA0E994CDBD5DC30100B0CB32CF2C1930C4CE824C9E7A042CC",
    "rank7_component_pgc_reduction_exact_20260813.json": "FCEAF69BA68325D120425D9A9C65C48A764D35855B5F2D6592B7809308409A35",
    "prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py": "E0017425A2DAC860C735210CDD4AFDC212D919C8FCBFB7F0E5834305B4C8BF6D",
    "run_rank7_delta0_joint_lower_b_weighted_pair_batch.py": "26719CCBC47394206CDAA244EE6011FC487D0BA504CAFE2960964F6C1B25CB9D",
    "prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py": "3888A69298EA2F2FD487443D15559388F883505A28CC6AB191835ED1E4034B62",
    "run_rank7_delta0_joint_lower_b_h_extension_face_batch.py": "D4DA8A09E2E2F42574BD1BFD8170106AA500A2E790762D036BBB1F7ADA11D22C",
    "prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py": "9367209095EDBFF981D81C504C0CEFBC88B8613CBD7F5C43DB596F35C8CA5D66",
    "run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py": "5A54F1674DF8E45BAC0579F4C5DD8C042F0FFEC98E21BB477CE6A7E9AA09BED7",
    "verify_forest_i45_continuous_weighted_pair_lift.py": "2A7C175EC245225286AEADD6F6CFDB2996A56B66B82C93FACF235962812505A0",
    "forest_i45_continuous_weighted_pair_lift_exact_20260820.json": "4CA2B72F6CC9E974DEE9206D86044099FBD85DE57CCB2443E213B2E330743075",
    "audit_rank7_delta0_weighted_pair_h_extension_independent.py": "0CBE377BA557F39B00FB8A87593BB6E62CC663F7B67A9864CD0BB1AFF781D6E0",
    "rank7_delta0_weighted_pair_h_extension_independent_audit_exact_20260820.json": "2DD90561193DE99A4D0916D5F62A53F10A7F4ABFB2C2F1E6C84218E83FA9892F",
    "audit_rank7_delta0_small_m_three_face_structure.py": "20DC851EA4A522F940626E05BEFBE19C758D0F1F20611CC0AEA3AD735A5E2ECD",
    "rank7_delta0_small_m_three_face_structure_independent_audit_exact_20260820.json": "C8BF3433F1E6B04B1A93E810E52165CA0D0DBB8329DD89C3F98B50ABD79D283B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_json(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def positive(values) -> bool:
    return len(values) > 0 and all(int(value) >= 0 for value in values)


def check_complete_batch(
    name: str,
    expected_status: str,
    expected_keys: set[tuple],
    fields: tuple[str, ...],
) -> dict:
    data = load_json(name)
    rows = data["results"]
    keys = [tuple(row[field] for field in fields) for row in rows]
    assert len(keys) == len(set(keys))
    assert set(keys) == expected_keys
    assert data["expected_jobs"] == len(expected_keys)
    assert data["completed_jobs"] == len(expected_keys)
    assert data["passing_jobs"] == len(expected_keys)
    assert data["status"] == expected_status
    assert all(row["pass"] and row["returncode"] == 0 and not row["stderr"] for row in rows)
    return {"status": data["status"], "keys": len(keys), "sha256": sha256(ROOT / name)}


def check_running_batch(
    name: str,
    expected_status: str,
    expected_keys: set[tuple],
    fields: tuple[str, ...],
    expected_prover_hash: str,
    expected_runner_hash: str | None = None,
) -> tuple[dict, bool]:
    path = ROOT / name
    if not path.exists():
        return {"status": "MISSING", "completed": 0, "expected": len(expected_keys)}, False
    try:
        data = load_json(name)
    except (OSError, json.JSONDecodeError) as error:
        return {"status": "TRANSIENT_UNREADABLE", "error": str(error), "expected": len(expected_keys)}, False
    rows = data.get("results", [])
    assert data["prover_sha256"] == expected_prover_hash
    if expected_runner_hash is not None:
        assert data["runner_sha256"] == expected_runner_hash
    keys = [tuple(row[field] for field in fields) for row in rows]
    assert len(keys) == len(set(keys))
    assert set(keys) <= expected_keys
    assert data["expected_jobs"] == len(expected_keys)
    assert data["completed_jobs"] == len(rows)
    assert data["passing_jobs"] == sum(bool(row.get("pass")) for row in rows)
    assert all(
        row.get("pass") and row.get("returncode") == 0 and not row.get("stderr")
        and row.get("parsed", {}).get("status") == "PASS"
        for row in rows
    )
    complete = (
        data["status"] == expected_status
        and len(rows) == len(expected_keys)
        and set(keys) == expected_keys
    )
    return {
        "status": data["status"],
        "completed": len(rows),
        "expected": len(expected_keys),
        "passing": data["passing_jobs"],
        "sha256_snapshot": sha256(path),
    }, complete


def parse_n18_finite() -> dict:
    pattern = re.compile(r"^core_n=(\d+).*minima=\[([^]]+)\] negative=\[([^]]*)\]$")
    rows = {}
    for line in (ROOT / "rank7_terminal_broom_finite_n18.log").read_text(encoding="utf-8").splitlines():
        match = pattern.fullmatch(line)
        if match:
            order = int(match.group(1))
            minima = [int(value.strip()) for value in match.group(2).split(",")]
            negatives = match.group(3).strip()
            rows[order] = {"minima": minima, "negative_text": negatives}
    assert set(rows) == set(range(1, 19))
    assert all(positive(rows[n]["minima"]) and rows[n]["negative_text"] == "" for n in range(13, 19))
    assert [n for n in range(1, 19) if rows[n]["negative_text"]] == [10, 11, 12]
    return {
        "delta0_negative_orders": [10, 11, 12],
        "all_14_nonnegative_orders": list(range(13, 19)),
    }


def check_n25_n26() -> tuple[dict, bool]:
    primary = {}
    row_pattern = re.compile(r"^core_n=(\d+) trees=(\d+) roots=(\d+).*Delta0_2_minima=\[([^]]+)\]")
    for order, trees in ((25, 104_636_890), (26, 279_793_450)):
        name = f"rank7_terminal_broom_delta012_n{order}_exact_20260820.log"
        lines = (ROOT / name).read_text(encoding="utf-8").splitlines()
        assert len(lines) == 2
        match = row_pattern.match(lines[0])
        assert match is not None
        parsed_order, parsed_trees, roots = map(int, match.groups()[:3])
        minima = [int(value.strip()) for value in match.group(4).split(",")]
        assert parsed_order == order and parsed_trees == trees and roots == order * trees
        assert positive(minima)
        assert lines[1] == f"PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_ALL_ROOTED_CORES_N{order}"
        primary[order] = {"trees": trees, "roots": roots, "minima": minima, "sha256": sha256(ROOT / name)}

    replay_path = ROOT / "rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json"
    if not replay_path.exists():
        return {"primary": primary, "fresh_replay": "MISSING_OR_RUNNING"}, False
    try:
        replay = json.loads(replay_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {"primary": primary, "fresh_replay": "TRANSIENT_UNREADABLE", "error": str(error)}, False
    assert replay["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_FRESH_REPLAY"
    assert [row["order"] for row in replay["orders"]] == [25, 26]
    for row in replay["orders"]:
        order = row["order"]
        assert row["byte_identical"] is True
        assert row["primary_sha256"] == primary[order]["sha256"]
        assert row["replay_sha256"] == primary[order]["sha256"]
        assert sha256(ROOT / row["replay_log"]) == primary[order]["sha256"]
    return {"primary": primary, "fresh_replay": replay["status"], "replay_report_sha256": sha256(replay_path)}, True


def main() -> int:
    actual_hashes = {name: sha256(ROOT / name) for name in EXPECTED_HASHES}
    mismatches = {
        name: {"expected": expected, "actual": actual_hashes[name]}
        for name, expected in EXPECTED_HASHES.items()
        if actual_hashes[name] != expected
    }
    assert not mismatches, mismatches

    small_splice = load_json("rank7_terminal_broom_small_core_splice_exact_20260820.json")
    assert small_splice["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14"
    assert small_splice["totals"] == {
        "rooted_cores": 72145,
        "minimum_Q7_at_alpha12_entry": 609848,
        "minimum_order": 10,
        "minimum_newton_coefficient": 0,
    }
    lower_finite = parse_n18_finite()

    finite_19_20 = load_json("rank7_terminal_broom_finite_n19_n20_exact_20260816.json")
    finite_21 = load_json("rank7_terminal_broom_finite_n21_exact_20260816.json")
    assert finite_19_20["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N19_THROUGH_N20"
    assert finite_21["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N21_THROUGH_N21"
    assert [row["order"] for row in finite_19_20["rows"]] == [19, 20]
    assert finite_21["rows"][0]["order"] == 21
    assert all(positive(row["newton_minima"]) for row in finite_19_20["rows"] + finite_21["rows"])

    finite_low = {}
    for order, name in (
        (22, "rank7_terminal_broom_finite_n22_low_exact_20260816.json"),
        (23, "rank7_terminal_broom_finite_n23_low_exact_20260820.json"),
        (24, "rank7_terminal_broom_finite_n24_low_exact_20260820.json"),
    ):
        data = load_json(name)
        assert data["order"] == order and positive(data["low_newton_minima"])
        assert data["status"] == f"PASS_EXACT_RANK7_TERMINAL_BROOM_LOW_NEWTON_ALL_ROOTED_CORES_N{order}"
        if order >= 23:
            assert data["fresh_replay_byte_identical"] is True
        finite_low[order] = data["low_newton_minima"]

    n25_n26, replay_complete = check_n25_n26()

    delta12 = load_json("rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json")
    delta123 = load_json("rank7_terminal_broom_delta123_cutoff25_exact_20260820.json")
    delta456 = load_json("rank7_terminal_broom_delta456_cutoff25_exact_20260820.json")
    high = load_json("rank7_tree_terminal_broom_high_newton_exact_20260813.json")
    assert delta12["status"] == "PASS_EXACT_RANK7_DELTA1_DELTA2_UNCONDITIONAL_N_AT_LEAST_25"
    assert delta123["status"] == "PASS_EXACT_RANK7_DELTA3_AND_CONDITIONAL_DELTA12_N_AT_LEAST_25"
    assert delta123["conclusion"].startswith(
        "Delta3 is nonnegative for every rooted tree core of order at least 25"
    )
    assert delta456["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA456_N_AT_LEAST_25"
    assert high["status"] == "PASS_EXACT_PARTIAL_RANK7_TREE_TERMINAL_BROOM_DELTA7_TO_DELTA13_NOT_ALL_ORDER_THEOREM"

    very_small_keys = {(n, m, q) for n in range(27, 39) for m in range(0, 5) for q in (0, 1)}
    small_upper_27_keys = {(27, m, face, q) for m in range(5, 18) for face in ("containment", "extension") for q in (0, 1)}
    small_upper_28_38_keys = {(n, m, face, q) for n in range(28, 39) for m in range(5, 18) for face in ("containment", "extension") for q in (0, 1)}
    large_upper_27_keys = {(27, m, face, q) for m in range(18, 26) for face in ("containment", "extension") for q in (0, 1)}
    large_upper_28_38_keys = {(n, m, face, q) for n in range(28, 39) for m in range(18, n - 1) for face in ("containment", "extension") for q in (0, 1)}
    upper_batches = {
        "very_small": check_complete_batch(
            "rank7_delta0_very_small_j_n27_n38_exact_20260820.json",
            "PASS_EXACT_RANK7_DELTA0_VERY_SMALL_J_N27_N38",
            very_small_keys, ("n", "m", "q"),
        ),
        "small_n27": check_complete_batch(
            "rank7_delta0_joint_capacity_faces_small_j_n27_exact_20260820.json",
            "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N27",
            small_upper_27_keys, ("n", "m", "face", "q"),
        ),
        "small_n28_n38": check_complete_batch(
            "rank7_delta0_joint_capacity_faces_small_j_n28_n38_exact_20260820.json",
            "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N28_N38",
            small_upper_28_38_keys, ("n", "m", "face", "q"),
        ),
        "large_n27": check_complete_batch(
            "rank7_delta0_joint_capacity_faces_n27_exact_20260820.json",
            "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27",
            large_upper_27_keys, ("n", "m", "face", "q"),
        ),
        "large_n28_n38": check_complete_batch(
            "rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json",
            "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38",
            large_upper_28_38_keys, ("n", "m", "face", "q"),
        ),
    }

    large_pair_keys = {
        (n, m, regime, face, q)
        for n in range(27, 39) for m in range(18, n - 1)
        for regime in (0, 1, 2) for face in ("ratio", "lifted") for q in (0, 1)
    }
    large_h_keys = {
        (n, m, regime, q)
        for n in range(27, 39) for m in range(18, n - 1)
        for regime in (0, 1, 2) for q in (0, 1)
    }
    small_lower_keys = {
        (n, m, regime, face, q)
        for n in range(27, 39) for m in range(5, 18)
        for regime in ((0, 1) if m <= 8 else (0, 1, 2))
        for face in ("zero", "lifted", "h_extension") for q in (0, 1)
    }
    large_pair, large_pair_complete = check_running_batch(
        "rank7_delta0_joint_lower_b_weighted_pair_n27_n38_exact_20260820.json",
        "PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38",
        large_pair_keys, ("n", "m", "regime", "face", "q"),
        EXPECTED_HASHES["prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py"],
    )
    large_h, large_h_complete = check_running_batch(
        "rank7_delta0_joint_lower_b_h_extension_face_n27_n38_exact_20260820.json",
        "PASS_EXACT_RANK7_DELTA0_LOWER_B_H_EXTENSION_FACE_N27_N38",
        large_h_keys, ("n", "m", "regime", "q"),
        EXPECTED_HASHES["prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py"],
    )
    small_lower, small_lower_complete = check_running_batch(
        "rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json",
        "PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38",
        small_lower_keys, ("n", "m", "regime", "face", "q"),
        EXPECTED_HASHES["prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py"],
        EXPECTED_HASHES["run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py"],
    )
    delta0_finite_complete = large_pair_complete and large_h_complete and small_lower_complete

    weighted_lift = load_json("forest_i45_continuous_weighted_pair_lift_exact_20260820.json")
    lower_structural_audit = load_json(
        "rank7_delta0_weighted_pair_h_extension_independent_audit_exact_20260820.json"
    )
    small_lower_structural_audit = load_json(
        "rank7_delta0_small_m_three_face_structure_independent_audit_exact_20260820.json"
    )
    assert weighted_lift["status"] == "PASS_EXACT_FOREST_I45_CONTINUOUS_WEIGHTED_PAIR_LIFT"
    assert weighted_lift["local_theorem"].startswith(
        "For every induced five-vertex forest S"
    )
    assert "For 5<=m<=8" in weighted_lift["global_theorem_m_5_through_8"]
    assert lower_structural_audit["status"] == (
        "PASS_H_ALGEBRA_CONSTRAINT_DIRECTIONS_THREE_FACE_UNION_AND_SIX_HARD_REPLAYS"
    )
    assert lower_structural_audit["pair_prover_sha256"] == EXPECTED_HASHES[
        "prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py"
    ]
    assert lower_structural_audit["h_face_prover_sha256"] == EXPECTED_HASHES[
        "prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py"
    ]
    assert small_lower_structural_audit["status"] == (
        "PASS_INDEPENDENT_RANK7_DELTA0_SMALL_M_THREE_FACE_STRUCTURE"
    )

    delta0_large = load_json("rank7_terminal_broom_delta0_large_exact_20260816.json")
    assert delta0_large["schema"] == "rank7-terminal-broom-delta0-v1"
    assert len(delta0_large["branches"]) == 8
    for branch in delta0_large["branches"]:
        assert branch["status"] == "cached-pass"
        assert branch["final_lines"][-1].startswith("PASS_DELTA0_BRANCH")
        assert sha256(ROOT / branch["log"]).lower() == branch["sha256"].lower()

    rank6_cones = load_json("rank6_three_halves_convolution_cones_exact_20260813.json")
    rank6_forest = load_json("rank6_three_halves_forest_certificate_exact_20260813.json")
    exceptional = load_json("rank7_exceptional_small_tree_jets_exact_20260816.json")
    assert rank6_cones["status"] == "PASS_EXACT_ALL_ORDER_RANK6_CONVOLUTION_CONES"
    assert rank6_forest["status"] == "PASS_EXACT_ALL_FOREST_RANK6_RESERVE_LIFT"
    assert rank6_forest["small_products"]["pair_checks"] == 2_227_175
    assert rank6_forest["small_products"]["minimum"] == 9_738
    assert exceptional["status"] == "PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS"
    assert exceptional["no_exception_above_order_14"] is True

    hh = load_json("rank7_high_high_convolution_exact_20260813.json")
    lh = load_json("rank7_low_high_full_cone_memory_bounded_exact_20260816.json")
    ll = load_json("rank7_low_low_full_cone_memory_bounded_exact_20260816.json")
    lift = load_json("rank7_forest_lift_conditional_exact_20260816.json")
    v7 = load_json("forest_v7_alpha12_exact_20260813.json")
    alpha11 = load_json("rank7_alpha11_boundary_theorem_exact_20260813.json")
    pgc = load_json("rank7_component_pgc_reduction_exact_20260813.json")
    assert hh["status"] == "PASS_EXACT_FULL_RANK7_HIGH_HIGH_CONVOLUTION_CONE"
    assert lh["status"] == "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert ll["status"] == "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_LOW_FULL_CONVOLUTION_CONE"
    assert lift["status"] == "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    assert v7["status"] == "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12"
    assert alpha11["status"] == "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM"
    assert pgc["status"] == "PASS_EXACT_RANK7_COMPONENT_PGC_REDUCTION_NOT_ALL_ORDER_THEOREM"

    pending = []
    if not replay_complete:
        pending.append("fresh byte-identical Delta0..2 replay for n=25,26")
    if not large_pair_complete:
        pending.append("large-m ratio/lifted lower-b batch: 1,944 cells")
    if not large_h_complete:
        pending.append("large-m H-extension lower-b batch: 972 cells")
    if not small_lower_complete:
        pending.append("small-m zero/lifted/H-extension lower-b batch: 2,520 cells")

    coefficient_coverage = [
        {"core_orders": "15-18", "coefficients": "Delta0..13", "source": "exact finite n<=18 log"},
        {"core_orders": "19-21", "coefficients": "Delta0..13", "source": "exact finite all-coefficient reports"},
        {"core_orders": "22-24", "coefficients": "Delta0..6 finite + Delta7..13 all-order high theorem"},
        {"core_orders": "25-26", "coefficients": "Delta0..2 exact primary+fresh replay; Delta3..6 cutoff theorems; Delta7..13 high theorem", "complete": replay_complete},
        {"core_orders": "27-38", "coefficients": "Delta0 all m via endpoint faces; Delta1..6 cutoff theorems; Delta7..13 high theorem", "complete": delta0_finite_complete},
        {"core_orders": ">=39", "coefficients": "Delta0 eight-branch theorem; Delta1..6 cutoff theorems; Delta7..13 high theorem"},
    ]

    all_inputs_final = replay_complete and delta0_finite_complete
    status = (
        "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
        if all_inputs_final else
        "PENDING_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER_AWAITING_FINAL_INPUTS"
    )
    report = {
        "schema": "rank7-integration-readonly-v1",
        "status": status,
        "mode": "read-only evidence integration; no prover launched and no master edit",
        "immutable_input_hashes": actual_hashes,
        "hash_mismatches": mismatches,
        "pending_inputs": pending,
        "small_core_splice": {
            "literal_Q7_terminal_families_core_orders_1_through_14": small_splice["status"],
            "rooted_cores": 72145,
            "minimum_Q7_at_target_entry": 609848,
            "finite_residual_diagnostic": lower_finite,
            "scope_guard": "R_t>=0 is false at some cores of orders 10 through 12; the literal Q7 family theorem, not residual positivity, closes those cases.",
        },
        "finite_19_through_24": {
            "orders_19_20": finite_19_20["status"],
            "order_21": finite_21["status"],
            "low_orders_22_24": {str(order): minima for order, minima in finite_low.items()},
        },
        "orders_25_26": n25_n26,
        "analytic_coefficients": {
            "Delta1_Delta2_n_at_least_25": delta12["status"],
            "Delta3_n_at_least_25": delta123["status"],
            "Delta4_Delta5_Delta6_n_at_least_25": delta456["status"],
            "Delta7_through_Delta13_n_at_least_15": high["status"],
        },
        "Delta0_orders_27_through_38": {
            "m_partition": ["0<=m<=4", "5<=m<=17", "18<=m<=n-2"],
            "upper_endpoint_batches": upper_batches,
            "lower_large_pair_faces": large_pair,
            "lower_large_H_face": large_h,
            "lower_small_three_faces": small_lower,
            "regime_union": "E<=1; 1<=E<=m/2; E>=m/2 for m>=9, and E<=1; E>=1 for 5<=m<=8",
            "lower_face_union": "large m: max(ratio,lifted,H); small m: max(0,lifted,H)",
            "upper_face_union": "min(containment,extension)",
            "weighted_pair_lift": weighted_lift["status"],
            "large_m_H_translation_and_face_direction_audit": lower_structural_audit["status"],
            "small_m_sign_regime_face_direction_audit": small_lower_structural_audit["status"],
            "no_m_gap": True,
            "complete": delta0_finite_complete,
        },
        "Delta0_n_at_least_39": {
            "schema": delta0_large["schema"],
            "cached_pass_branches": 8,
            "all_log_hashes_and_markers_checked": True,
        },
        "coefficient_coverage": coefficient_coverage,
        "connected_Q7_induction": {
            "terminal_broom_identity": high["terminal_broom_identity"],
            "small_core_case": "literal Q7(G_t)>=0 through core order 14 in the complete target range alpha(G_t)>=12",
            "large_core_case": "for core order >=15, c6,h5>0, R_t>=0, and the exact identity applies",
            "Q7_A_input": "if alpha(A)>=12 use strong induction; if alpha(A)<=11, the exceptional-tree census proves Q7(A)>=0 for orders 15..22, while order>=23 forces alpha(A)>=12",
            "Q6_H_input": "H has order at least 14; the stronger order>=13 conclusion inside the exact rank-six forest lift gives Q6(H)>=0",
            "complete_if_pending_inputs_finish": True,
        },
        "forest_and_PGC_chain": {
            "three_cones": [hh["status"], lh["status"], ll["status"]],
            "conditional_forest_Q7_lift": lift["status"],
            "forest_V7_alpha_at_least_12": v7["status"],
            "alpha11_boundary": alpha11["status"],
            "component_pgc_identity": pgc["symbolic_certificate"]["identity"],
            "logic": [
                "connected Q7(alpha>=12) plus the three convolution cones implies forest Q7(alpha>=12)",
                "if alpha(B)>=12, forest Q7(P), forest V7(B), and the nonnegative c6 term pay the component identity",
                "if alpha(B)=11, the exact alpha11 boundary theorem pays every literal reconstruction",
                "therefore the rank-seven PGC step follows once the pending connected-Q7 inputs are final",
            ],
        },
        "hidden_scope_findings": [
            "Do not assert R_t>=0 at core orders 10 through 12; exact negative Delta0 values exist there.",
            "The previously uncited small-core splice is now supplied by a literal terminal-family certificate through core order 14.",
            "For Q6(H), the needed input is the stronger order>=13 conclusion proved inside the rank-six forest lift, not only its headline alpha>=10 formulation.",
            "No order, m, regime, or endpoint-face gap remains after the four pending evidence items become final.",
        ],
        "all_inputs_final": all_inputs_final,
        "conclusion": (
            "All static algebraic and finite dependencies form a no-gap rank-seven chain. "
            "The assembler deliberately remains pending until the n25/26 fresh replay and all three lower-b Delta0 batches are final."
            if not all_inputs_final else
            "Every dependency is final: the terminal-broom induction, connected Q7, forest lift, and rank-seven PGC composition have no remaining order or scope gap."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(f"pending_inputs={len(pending)}")
    for item in pending:
        print(f"PENDING {item}")
    print(f"report_sha256={sha256(OUT)}")
    return 0 if all_inputs_final else 3


if __name__ == "__main__":
    raise SystemExit(main())
