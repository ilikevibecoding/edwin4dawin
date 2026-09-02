#!/usr/bin/env python3
"""Fail-closed independent audit of the all-order e=1 Delta0/1/3 theorem."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "assemble_rank8_delta013_e1_all_order.py":
        "F0F6FCCE979A2E65FBEE83B9728B58FF402FA274D70AB9AD9B561029BFAED6FE",
    "rank8_delta013_e1_all_order_exact_20260820.json":
        "B0996169B0A122F8A5D01B0573293604768BFF6A48A5CF2B1B06B7805323D14D",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta2_e1_symbolic_cell.py":
        "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
    "verify_rank8_delta013_e1_center_all_order.py":
        "34119F4E4943F6E7DB6A718AEA3ECD8EA65B1BD9A92C614590E459D55E5456F9",
    "rank8_delta013_e1_center_all_order_exact_20260820.json":
        "F201A416F83EA69B77A336429F62034B2F564BB9CB26E9AB1659B96554CFE89D",
    "run_rank8_delta013_e1_arm_short_long_cells.py":
        "5F02F7CC7CCF3F573D97BD2955B7FF08C20C7AFCB8BCB5EAF75C549DAFAAEDC0",
    "rank8_delta013_e1_arm_short_long_0long_exact_20260820.json":
        "2AB267FDBB419B8A7CEFE259C33EC8931A125E33FBCE8E9461D85D971E6300C2",
    "rank8_delta013_e1_arm_short_long_1long_exact_20260820.json":
        "DEA20489D9297264DB483C36CE8CA11DB7CEA789190ACD95A6A5D5BEDE3CCE68",
    "rank8_delta013_e1_arm_short_long_2long_exact_20260820.json":
        "F8DAA76E77A4DB4C3EA5E6C854ACC0216E8D75EB2E3F6D871322A9553A709149",
    "rank8_delta013_e1_arm_short_long_3long_exact_20260820.json":
        "D717F5B0B0BBB784017E0F3CB3EBE045730ECB9BFBA6A00BA21C20A20393F199",
    "verify_rank8_delta013_e1_arm_all_long.py":
        "793504822A0A7E60584D87EB21E886956ABB23A99E934730FD9270336CD071DB",
    "rank8_delta013_e1_arm_all_long_exact_20260820.json":
        "8BF8182DE7234C20C56B673420FC30C7918C88C0CD6B0187DC6B793B224F1552",
    "probe_rank8_delta013_e1_leaf_extension.py":
        "EA9B7EC1718A75BE998EB64D992B53259673894D52ED0162462F69DF528DE928",
    "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json":
        "0A42BE021839AD377DCFAE8AC5E024A2E2D1B19AD02F777C8804ED76F22B8D10",
    "assemble_rank8_delta2_e1_all_order.py":
        "1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1",
    "audit_rank8_delta2_e1_all_order.py":
        "7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C",
    "rank8_delta2_e1_all_order_exact_20260820.json":
        "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json":
        "6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3",
    "RANK8_DELTA2_E1_SUBDIVIDED_CLAW_ALL_ORDER_THEOREM_2026-08-20.md":
        "D374C2FCD30AA4D6D7C1E2CF5A400843CDE5F362C60AB239FF28EB022BC01489",
}
RANKS = (0, 1, 3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def path(order: int, max_rank: int = 8) -> list[int]:
    if order == -1:
        return [1] + [0] * max_rank
    assert order >= 0
    return [
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank
        else 0
        for rank in range(max_rank + 1)
    ]


def multiply(left: list[int], right: list[int], max_rank: int = 8) -> list[int]:
    return [
        sum(left[j] * right[k - j] for j in range(k + 1))
        for k in range(max_rank + 1)
    ]


def product_paths(orders: tuple[int, ...], max_rank: int = 8) -> list[int]:
    out = [1] + [0] * max_rank
    for order in orders:
        out = multiply(out, path(order, max_rank), max_rank)
    return out


def claw(arms: tuple[int, int, int], max_rank: int = 8) -> list[int]:
    center_out = product_paths(arms, max_rank)
    center_in = product_paths(tuple(arm - 1 for arm in arms), max_rank)
    return [center_out[0]] + [
        center_out[k] + center_in[k - 1] for k in range(1, max_rank + 1)
    ]


def delete_center(arms: tuple[int, int, int]) -> list[int]:
    return product_paths(arms)


def delete_arm(
    arms: tuple[int, int, int], index: int, distance: int
) -> list[int]:
    other = [arms[j] for j in range(3) if j != index]
    tail = arms[index] - distance
    central = claw((distance - 1, other[0], other[1]))
    return multiply(path(tail), central)


def delta0(core: list[int], deleted: list[int]) -> int:
    c6, c7, c8 = core[6:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c6*c7*c7*h6 - 144*c6*c7*c8*h6 + c6*c7*h6*h7
        - 126*c6*c7*h7*h7 - 128*c6*c8*c8*h6 + 120*c7*c7*c7*h6
        + 112*c7*c7*c8*h6 - 8*c7*c7*h6*h6 + 257*c7*c7*h6*h7
        - 126*c7*c7*h7*h7 - 144*c7*c8*h6*h6 + 256*c7*c8*h6*h7
        + c7*h6*h6*h7 + 2*c7*h6*h7*h7 - 128*c8*c8*h6*h6
    )


def delta1(core: list[int], deleted: list[int]) -> int:
    c5, c6, c7, c8 = core[5:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c5*c6*c7*h6 - 160*c5*c7*c7*h6 - 288*c5*c7*c8*h6
        + c5*c7*h6*h7 - 126*c5*c7*h7*h7 - 128*c5*c8*c8*h6
        + 112*c6*c6*c7*h6 + 192*c6*c7*c7*h6 - 176*c6*c7*c8*h6
        - 8*c6*c7*h6*h6 + 257*c6*c7*h6*h7 - 126*c6*c7*h7*h7
        - 128*c6*c8*c8*h6 + 232*c7*c7*c7*h6 + 112*c7*c7*c8*h6
        - 152*c7*c7*h6*h6 + 256*c7*c7*h6*h7 - 144*c7*c8*h6*h6
    )


def delta3(core: list[int], deleted: list[int]) -> int:
    c3, c4, c5, c6, c7, c8 = core[3:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c3*c4*c7*h6 - 176*c3*c5*c7*h6 - 624*c3*c6*c7*h6
        - 896*c3*c7*c7*h6 - 576*c3*c7*c8*h6 + c3*c7*h6*h7
        - 126*c3*c7*h7*h7 - 128*c3*c8*c8*h6 + 96*c4*c4*c7*h6
        + 296*c4*c5*c7*h6 - 488*c4*c6*c7*h6 - 1200*c4*c7*c7*h6
        - 752*c4*c7*c8*h6 - 8*c4*c7*h6*h6 + 257*c4*c7*h6*h7
        - 126*c4*c7*h7*h7 - 128*c4*c8*c8*h6 + 680*c5*c5*c7*h6
        + 952*c5*c6*c7*h6 - 112*c5*c7*c7*h6 - 176*c5*c7*c8*h6
        - 152*c5*c7*h6*h6 + 256*c5*c7*h6*h7 + 504*c6*c6*c7*h6
        + 192*c6*c7*c7*h6 - 144*c6*c7*h6*h6
    )


DELTA = {0: delta0, 1: delta1, 3: delta3}


def pattern_universe(long_count: int):
    other = [*range(1, 7), "L"]
    for near in [*range(0, 7), "L"]:
        for tail in [*range(0, 7), "L"]:
            for index, b in enumerate(other):
                for cc in other[index:]:
                    pattern = (near, tail, b, cc)
                    if pattern.count("L") == long_count:
                        yield pattern


def minimum(state: int | str) -> int:
    return 7 if state == "L" else int(state)


def origin_segments(pattern, shifted_coordinate, shift):
    names = ("near", "tail", "b", "c")
    return tuple(
        minimum(state) + (shift if name == shifted_coordinate else 0)
        for name, state in zip(names, pattern)
    )


def exact_n23_control():
    triples = 0
    roots = 0
    minima = {rank: None for rank in RANKS}
    witnesses = {rank: None for rank in RANKS}
    for a in range(1, 23):
        for b in range(a, 23):
            cc = 22 - a - b
            if cc < b:
                continue
            arms = (a, b, cc)
            triples += 1
            core = claw(arms)
            profiles = [("center", delete_center(arms))]
            for arm, length in enumerate(arms):
                profiles.extend(
                    ((arm, distance), delete_arm(arms, arm, distance))
                    for distance in range(1, length + 1)
                )
            assert len(profiles) == 23
            roots += len(profiles)
            for root, deletion in profiles:
                for rank in RANKS:
                    value = DELTA[rank](core, deletion)
                    if minima[rank] is None or value < minima[rank]:
                        minima[rank] = value
                        witnesses[rank] = {"arms": arms, "root": root}
    return triples, roots, minima, witnesses


def check_rank_row(row: dict, expected_constant: int, aggregates: dict, rank: int):
    assert row["negative_coefficients"] == 0
    assert row["zero_coefficients"] == 0
    assert row.get("nonpositive_constant", 0) == 0
    minimum_coefficient = Fraction(row["minimum_coefficient"])
    constant = Fraction(row["constant_coefficient"])
    assert minimum_coefficient > 0 and constant > 0
    assert constant.denominator == 1 and constant.numerator == expected_constant
    aggregates[rank]["minimum_coefficient"] = min(
        aggregates[rank]["minimum_coefficient"], minimum_coefficient
    )
    aggregates[rank]["minimum_constant"] = min(
        aggregates[rank]["minimum_constant"], constant
    )
    aggregates[rank]["terms"] += row["terms"]


def audit_center(aggregates: dict) -> int:
    report = load("rank8_delta013_e1_center_all_order_exact_20260820.json")
    assert report["status"] == "PASS_EXACT_RANK8_DELTA013_E1_CENTER_ROOT_ALL_N23_PLUS"
    expected_keys = (
        {(3, ())}
        | {(2, (s,)) for s in range(1, 7)}
        | {(1, (s, t)) for s in range(1, 7) for t in range(s, 7)}
    )
    actual_keys = {
        (row["long_arms"], tuple(row.get("short_arms", [])))
        for row in report["cells"]
    }
    assert actual_keys == expected_keys and len(report["cells"]) == 28
    for row in report["cells"]:
        long_count = row["long_arms"]
        short = tuple(row.get("short_arms", []))
        if long_count == 3:
            arms = (7, 7, 7)
        elif long_count == 2:
            threshold = math.ceil((8 - short[0]) / 2)
            arms = (7 + threshold, 7, short[0])
        else:
            threshold = 15 - short[0] - short[1]
            arms = (7 + threshold, short[0], short[1])
        core = claw(arms)
        deletion = delete_center(arms)
        for rank in RANKS:
            check_rank_row(
                row["ranks"][str(rank)],
                DELTA[rank](core, deletion),
                aggregates,
                rank,
            )
    return 28


def audit_arm_reports(aggregates: dict):
    pattern_total = 0
    cell_total = 0
    constants_rebuilt = 0
    cover_prefix_points = 0
    summaries = {}
    for long_count in range(4):
        report = load(
            f"rank8_delta013_e1_arm_short_long_{long_count}long_exact_20260820.json"
        )
        assert report["status"] == "PASS_EXACT_POSITIVE_COEFFICIENT_CELLS"
        universe = list(pattern_universe(long_count))
        relevant = [
            pattern
            for pattern in universe
            if long_count or sum(map(minimum, pattern)) >= 21
        ]
        irrelevant = len(universe) - len(relevant)
        actual = {
            tuple(row["pattern_near_tail_b_c"]): row
            for row in report["patterns"]
        }
        assert len(actual) == len(report["patterns"])
        assert set(actual) == set(relevant)
        assert report["irrelevant_fixed_patterns_below_n23"] == irrelevant
        local_cells = 0
        for pattern, row in actual.items():
            base = sum(map(minimum, pattern))
            threshold = max(0, 21 - base)
            coordinates = [
                name
                for name, state in zip(("near", "tail", "b", "c"), pattern)
                if state == "L"
            ]
            if not coordinates or threshold == 0:
                expected_variants = {(None, 0)}
                q = 0
            else:
                q = math.ceil(threshold / len(coordinates))
                representatives = [
                    name
                    for name in coordinates
                    if name != "c" or "b" not in coordinates
                ]
                expected_variants = {(name, q) for name in representatives}
                # Exhaust a finite prefix of offsets.  The same implication is
                # infinite by pigeonhole; b/c may be swapped when both are L.
                for offsets in __import__("itertools").product(
                    range(threshold + 3), repeat=len(coordinates)
                ):
                    if sum(offsets) < threshold:
                        continue
                    witness = any(value >= q for value in offsets)
                    assert witness
                    cover_prefix_points += 1
            assert row["base_segment_sum"] == base
            assert row["order_constraint_on_long_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == q
            cells = {
                (cell["shifted_coordinate"], cell["shift"]): cell
                for cell in row["cells"]
            }
            assert len(cells) == len(row["cells"])
            assert set(cells) == expected_variants
            for (shifted, shift), cell in cells.items():
                near, tail, b, cc = origin_segments(pattern, shifted, shift)
                core = claw((near + tail + 1, b, cc))
                deletion = multiply(path(tail), claw((near, b, cc)))
                assert len(cell["variables"]) == long_count
                for rank in RANKS:
                    check_rank_row(
                        cell["ranks"][str(rank)],
                        DELTA[rank](core, deletion),
                        aggregates,
                        rank,
                    )
                    constants_rebuilt += 1
            local_cells += len(cells)
        assert report["patterns_checked"] == len(relevant)
        assert report["symbolic_cells_checked"] == local_cells
        assert report["bad_rank_cell_count"] == 0 and report["bad_cells"] == []
        summaries[str(long_count)] = {
            "patterns": len(relevant),
            "cells": local_cells,
            "irrelevant": irrelevant,
        }
        pattern_total += len(relevant)
        cell_total += local_cells

    all_long = load("rank8_delta013_e1_arm_all_long_exact_20260820.json")
    assert all_long["status"] == "PASS_EXACT_RANK8_DELTA013_E1_ARM_ALL_FOUR_SEGMENTS_LONG"
    core = claw((15, 7, 7))
    deletion = multiply(path(7), claw((7, 7, 7)))
    for rank in RANKS:
        check_rank_row(
            all_long["ranks"][str(rank)],
            DELTA[rank](core, deletion),
            aggregates,
            rank,
        )
        constants_rebuilt += 1
    summaries["4"] = {"patterns": 1, "cells": 1, "irrelevant": 0}
    pattern_total += 1
    cell_total += 1
    assert summaries == {
        "0": {"patterns": 24, "cells": 24, "irrelevant": 1005},
        "1": {"patterns": 588, "cells": 588, "irrelevant": 0},
        "2": {"patterns": 154, "cells": 205, "irrelevant": 0},
        "3": {"patterns": 20, "cells": 20, "irrelevant": 0},
        "4": {"patterns": 1, "cells": 1, "irrelevant": 0},
    }
    assert pattern_total == 787 and cell_total == 838
    return summaries, constants_rebuilt, cover_prefix_points


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED

    assembled = load("rank8_delta013_e1_all_order_exact_20260820.json")
    assert assembled["status"] == "PASS_EXACT_RANK8_DELTA013_E1_ALL_ORDER_N23_PLUS"

    # Structural derivation: binom(d-1,2) is 0 exactly for d=1,2; it is 1
    # exactly for d=3 and at least 3 for d>=4.  Hence e=1 gives one degree-3
    # vertex and no larger degree.  The handshake identity then gives three
    # leaves, so suppressing degree-2 vertices gives K_1,3 with positive arms.
    surplus = {degree: math.comb(degree - 1, 2) for degree in range(1, 9)}
    assert surplus == {1: 0, 2: 0, 3: 1, 4: 3, 5: 6, 6: 10, 7: 15, 8: 21}

    # Cutoff safety: symbolic P_(X+7) is used through rank 8; decremented
    # symbolic arms P_(X+6) occur only through rank 7.
    for order in range(7, 50):
        for rank in range(9):
            falling = math.prod(order - rank + 1 - j for j in range(rank)) // math.factorial(rank)
            assert falling == path(order)[rank]
    for order in range(6, 49):
        for rank in range(8):
            falling = math.prod(order - rank + 1 - j for j in range(rank)) // math.factorial(rank)
            assert falling == path(order)[rank]

    triples, roots, minima, witnesses = exact_n23_control()
    expected_minima = {
        0: 5923170966582245376,
        1: 19969651851918297984,
        3: 58724193884454990528,
    }
    assert (triples, roots, minima) == (40, 920, expected_minima)

    aggregates = {
        rank: {
            "minimum_coefficient": Fraction(10**1000),
            "minimum_constant": Fraction(10**1000),
            "terms": 0,
        }
        for rank in RANKS
    }
    center_cells = audit_center(aggregates)
    summaries, constants_rebuilt, cover_points = audit_arm_reports(aggregates)
    assert constants_rebuilt == 838 * 3
    assert aggregates == {
        0: {
            "minimum_coefficient": Fraction(1, 2633637888000),
            "minimum_constant": Fraction(9521754536674380),
            "terms": 219467,
        },
        1: {
            "minimum_coefficient": Fraction(1, 2304433152000),
            "minimum_constant": Fraction(44528787736465032),
            "terms": 219467,
        },
        3: {
            "minimum_coefficient": Fraction(41, 365783040000),
            "minimum_constant": Fraction(285350865429930300),
            "terms": 182466,
        },
    }

    delta2 = load("rank8_delta2_e1_all_order_exact_20260820.json")
    delta2_audit = load("rank8_delta2_e1_all_order_independent_audit_exact_20260820.json")
    assert delta2["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS"
    assert delta2_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER"
    assert delta2_audit["independent_exact_n23_replay"] == {
        "arm_triples": 40,
        "rooted_orbits": 865,
        "minimum_Delta2": "38230158759117788736",
        "method": "independent path convolution and explicit 22-term Delta2 transcription",
    }

    payload = {
        "schema": "rank8-delta013-e1-all-order-independent-audit-v1",
        "status": "PASS_INDEPENDENT_FAIL_CLOSED_AUDIT_RANK8_DELTA013_E1_ALL_ORDER",
        "immutable_input_hashes": hashes,
        "classification_rederived": (
            "e=1 forces exactly one degree-3 vertex and all other degrees <=2; "
            "the handshake identity gives three leaves, hence a subdivided claw "
            "with three positive arms"
        ),
        "root_parameterization": (
            "center, or arm root with near,tail>=0 and unordered positive other "
            "arms b<=c; n=near+tail+b+c+2"
        ),
        "center_cells_checked": center_cells,
        "arm_pattern_summary": summaries,
        "arm_patterns_checked": 787,
        "arm_cells_checked": 838,
        "independently_rebuilt_arm_rank_constants": constants_rebuilt,
        "bounded_cover_assignments_checked": cover_points,
        "rank_aggregates": {
            str(rank): {
                "minimum_reported_coefficient": str(row["minimum_coefficient"]),
                "minimum_independently_rebuilt_constant": str(row["minimum_constant"]),
                "reported_terms": row["terms"],
            }
            for rank, row in aggregates.items()
        },
        "independent_exact_n23_control": {
            "unordered_arm_triples": triples,
            "root_placements": roots,
            "minimum_values": {str(rank): value for rank, value in minima.items()},
            "minimum_witnesses": {str(rank): value for rank, value in witnesses.items()},
            "method": "independent path convolution plus explicit Delta0/1/3 transcriptions",
        },
        "delta2_pin": {
            "theorem_status": delta2["status"],
            "independent_audit_status": delta2_audit["status"],
            "combined_conclusion": (
                "Delta0,Delta1,Delta2,Delta3 are strictly positive on every rooted "
                "e=1 tree core of order n>=23"
            ),
        },
        "scope_guard": (
            "This audit closes the e=1 layer only; it makes no e>=2 or global "
            "connected-Q8 claim."
        ),
    }
    output = HERE / "rank8_delta013_e1_all_order_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("arm_patterns", payload["arm_patterns_checked"])
    print("arm_cells", payload["arm_cells_checked"])
    print("rebuilt_constants", constants_rebuilt)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
