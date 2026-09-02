#!/usr/bin/env python3
"""Independent structural and exact-control audit of the e=1 Delta2 theorem."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "RANK8_DELTA2_E1_SUBDIVIDED_CLAW_ALL_ORDER_THEOREM_2026-08-20.md": "D374C2FCD30AA4D6D7C1E2CF5A400843CDE5F362C60AB239FF28EB022BC01489",
    "assemble_rank8_delta2_e1_all_order.py": "1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1",
    "rank8_delta2_e1_all_order_exact_20260820.json": "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "verify_rank8_delta2_e1_subdivided_claw.py": "76D2D0871041E84AFE6C1839D27DE2602B3FCBDEEE33C94190FA242EBBB28CB7",
    "rank8_delta2_e1_subdivided_claw_exact_20260820.json": "DD8267EE2779408CC7D6D0333AABB20390282A49D5ABC70C716B16219AC8EF6C",
    "verify_rank8_delta2_e1_center_all_order.py": "8D2C88C78AA9909E441AF4E5ACFD08083E00CC2EC15C7FD94719770257AAA958",
    "rank8_delta2_e1_center_all_order_exact_20260820.json": "E59852D1F2647C975302133501DE19FFB3FED922BC5DDB10BA07F36356599B6F",
    "run_rank8_delta2_e1_arm_short_long_cells.py": "29884626B28507DA01208D5C67F22EB41A31F132C3543CB1E3967ABFAAD40014",
    "rank8_delta2_e1_arm_short_long_0long_exact_20260820.json": "38B9C3640EDEF3CC970F01EC9BDD568E27D7A234802437DBD74C00B70214C687",
    "rank8_delta2_e1_arm_short_long_1long_exact_20260820.json": "9698A27B11C1F327BA8911DACD42868358A893EE6B581BAE73EB55B60B807547",
    "rank8_delta2_e1_arm_short_long_2long_exact_20260820.json": "1FD79D647090CAAF87B9217A9766A74E5C55D75789E369C66F9146814AC2A3A5",
    "rank8_delta2_e1_arm_short_long_3long_exact_20260820.json": "EF5ED4D529BC7C49547F8B04F0E527422E1EE8F5C81D08F5EFAC7937B7F79498",
    "rank8_delta2_e1_arm_short_long_4long_exact_20260820.json": "20F34B6423D64B2307E4224A7BBFA6EA7C82E28E6D07267C108F10A158B5B902",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def path(order: int, max_rank: int = 8) -> list[int]:
    if order == -1:
        return [1] + [0] * max_rank
    assert order >= 0
    return [
        math.comb(order - rank + 1, rank) if order - rank + 1 >= rank else 0
        for rank in range(max_rank + 1)
    ]


def multiply(left: list[int], right: list[int], max_rank: int = 8) -> list[int]:
    return [sum(left[j] * right[k - j] for j in range(k + 1)) for k in range(max_rank + 1)]


def product(orders: tuple[int, ...], max_rank: int = 8) -> list[int]:
    out = [1] + [0] * max_rank
    for order in orders:
        out = multiply(out, path(order, max_rank), max_rank)
    return out


def claw(arms: tuple[int, int, int], max_rank: int = 8) -> list[int]:
    center_out = product(arms, max_rank)
    center_in = product(tuple(arm - 1 for arm in arms), max_rank)
    return [center_out[0]] + [center_out[k] + center_in[k - 1] for k in range(1, max_rank + 1)]


def delete_arm(arms: tuple[int, int, int], index: int, distance: int) -> list[int]:
    selected = arms[index]
    other = [arms[j] for j in range(3) if j != index]
    tail = selected - distance
    central = claw((distance - 1, other[0], other[1]))
    return multiply(path(tail), central)


def delta2(core: list[int], deletion: list[int]) -> int:
    c4, c5, c6, c7, c8 = core[4:9]
    h6, h7 = deletion[6:8]
    # Independent transcription of the exact 22-term Newton coefficient.
    return (
        -8*c4*c5*c7*h6 - 168*c4*c6*c7*h6 - 456*c4*c7*c7*h6
        - 432*c4*c7*c8*h6 + c4*c7*h6*h7 - 126*c4*c7*h7*h7
        - 128*c4*c8*c8*h6 + 104*c5*c5*c7*h6 + 256*c5*c6*c7*h6
        - 288*c5*c7*c7*h6 - 464*c5*c7*c8*h6 - 8*c5*c7*h6*h6
        + 257*c5*c7*h6*h7 - 126*c5*c7*h7*h7 - 128*c5*c8*c8*h6
        + 424*c6*c6*c7*h6 + 392*c6*c7*c7*h6 - 32*c6*c7*c8*h6
        - 152*c6*c7*h6*h6 + 256*c6*c7*h6*h7 + 112*c7*c7*c7*h6
        - 144*c7*c7*h6*h6
    )


def independent_n23_control() -> tuple[int, int, int]:
    triple_count = 0
    orbit_count = 0
    minimum = None
    for a in range(1, 23):
        for b in range(a, 23):
            cc = 22 - a - b
            if cc < b:
                continue
            arms = (a, b, cc)
            triple_count += 1
            core = claw(arms)
            values = [delta2(core, product(arms))]
            for length in sorted(set(arms)):
                index = arms.index(length)
                values.extend(delta2(core, delete_arm(arms, index, d)) for d in range(1, length + 1))
            orbit_count += len(values)
            local = min(values)
            minimum = local if minimum is None else min(minimum, local)
    return triple_count, orbit_count, int(minimum)


def pattern_universe(long_count: int):
    other = [*range(1, 7), "L"]
    for near in [*range(0, 7), "L"]:
        for tail in [*range(0, 7), "L"]:
            for i, b in enumerate(other):
                for cc in other[i:]:
                    pattern = (near, tail, b, cc)
                    if pattern.count("L") == long_count:
                        yield pattern


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    combined = load("rank8_delta2_e1_all_order_exact_20260820.json")
    assert combined["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS"

    triples, orbits, minimum = independent_n23_control()
    assert (triples, orbits, minimum) == (40, 865, 38230158759117788736)

    # The long polynomial path formula is safe for every rank k<=8 because
    # s>=7 makes s-k+1 nonnegative.  Fixed short segments use literal counts.
    for order in range(7, 30):
        for rank in range(9):
            falling = math.prod(order - rank + 1 - j for j in range(rank)) // math.factorial(rank)
            assert falling == path(order)[rank]

    center = load("rank8_delta2_e1_center_all_order_exact_20260820.json")
    assert len(center["cells"]) == 28
    assert {(row["long_arms"], tuple(row.get("short_arms", []))) for row in center["cells"]} == (
        {(3, ())}
        | {(2, (s,)) for s in range(1, 7)}
        | {(1, (s, t)) for s in range(1, 7) for t in range(s, 7)}
    )
    for row in center["cells"]:
        assert row["negative_coefficients"] == 0
        assert Fraction(row["constant_coefficient"]) > 0

    expected_summary = {0: (24, 24, 1005), 1: (588, 588, 0), 2: (154, 205, 0), 3: (20, 20, 0), 4: (1, 1, 0)}
    for long_count in range(5):
        report = load(f"rank8_delta2_e1_arm_short_long_{long_count}long_exact_20260820.json")
        universe = list(pattern_universe(long_count))
        relevant = [
            p for p in universe
            if long_count or sum(7 if value == "L" else int(value) for value in p) >= 21
        ]
        actual_patterns = {tuple(row["pattern_near_tail_b_c"]): row for row in report["patterns"]}
        assert set(actual_patterns) == set(relevant)
        assert (
            report["patterns_checked"],
            report["symbolic_cells_checked"],
            report["irrelevant_fixed_patterns_below_n23"],
        ) == expected_summary[long_count]
        for pattern, row in actual_patterns.items():
            base = sum(7 if value == "L" else int(value) for value in pattern)
            threshold = max(0, 21 - base)
            coords = [name for name, value in zip(("near", "tail", "b", "c"), pattern) if value == "L"]
            if not coords or threshold == 0:
                variants = {(None, 0)}
            else:
                q = math.ceil(threshold / len(coords))
                reps = [name for name in coords if name != "c" or "b" not in coords]
                variants = {(name, q) for name in reps}
            assert {(cell["shifted_coordinate"], cell["shift"]) for cell in row["cells"]} == variants
            for cell in row["cells"]:
                assert cell["negative_coefficients"] == 0
                assert Fraction(cell["constant_coefficient"]) > 0

    payload = {
        "schema": "rank8-delta2-e1-all-order-independent-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER",
        "immutable_input_hashes": actual,
        "independent_exact_n23_replay": {
            "arm_triples": triples,
            "rooted_orbits": orbits,
            "minimum_Delta2": str(minimum),
            "method": "independent path convolution and explicit 22-term Delta2 transcription",
        },
        "short_long_cutoff_checked": "path binomial polynomial agrees with literal counts for all ranks 0..8 and every tested long order 7..29",
        "center_key_set_checked": 28,
        "arm_pattern_key_sets_checked": 787,
        "arm_cover_cells_checked": 838,
        "scope": "independent algebra/control and no-gap structural audit; the exact symbolic coefficient replay remains the hash-pinned primary prover",
    }
    output = HERE / "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
