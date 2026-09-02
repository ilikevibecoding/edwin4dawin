#!/usr/bin/env python3
"""Independent audit of all one-short/one-long far-pair pendant cells."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, path, multiply
from audit_rank8_delta2_e1_all_order import delta2


HERE = Path(__file__).resolve().parent
LONG = "L"
ROOT_STATES = [0, 1, 2, 3, 4, 5, 6, LONG]
PAIRED_STATES = [1, 2, 3, 4, 5, 6, LONG]
SOURCE = "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py"
REPORT = "rank8_delta2_e2_pendant_far{far}_long_paired{paired}_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    SOURCE: "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_long_paired1_bridge_long_cells_exact_20260820.json": "4C2B8D9E8CA01758AB23BA13DF6986B87DC9D8831838517C55A9D5BF7A137CD7",
    "rank8_delta2_e2_pendant_far1_long_paired2_bridge_long_cells_exact_20260820.json": "D25028C842B6C7A429D13ED80DEAD231471E61B3B427B03005B5E0CD25837084",
    "rank8_delta2_e2_pendant_far1_long_paired3_bridge_long_cells_exact_20260820.json": "BB57014D95505B72CF4991BDC09053E7BFFDEB777695516B147B0787B5C2A50C",
    "rank8_delta2_e2_pendant_far1_long_paired4_bridge_long_cells_exact_20260820.json": "A27CF98D0A820D2CD32D95AB7C851EE79E36A48982FFFFC044555EC7D727EDCB",
    "rank8_delta2_e2_pendant_far1_long_paired5_bridge_long_cells_exact_20260820.json": "DF02160EF8743C452D0D554B97124374BEC415F1137626DF049960F41C7A4B66",
    "rank8_delta2_e2_pendant_far1_long_paired6_bridge_long_cells_exact_20260820.json": "1D5BDB49C46D822F98FDF144023D53B3F8F7C39412CD9FBB9E5F3FE9A7A83DF4",
    "rank8_delta2_e2_pendant_far1_long_pairedlong_bridge_long_cells_exact_20260820.json": "93642B93A5DFE52E7B13EB6F255061C6C183C1CBF3B46ACD6546CDEB6C7862AB",
    "rank8_delta2_e2_pendant_far2_long_paired1_bridge_long_cells_exact_20260820.json": "EC746146D68FFA9982BE01DAF567E1B1626AAD226BA48F9E01631F27B61F5696",
    "rank8_delta2_e2_pendant_far2_long_paired2_bridge_long_cells_exact_20260820.json": "92CAC0AB73AFD89A5F952FEBE7695B1FCFCADEC752985D049FA094C1BB6C8F7A",
    "rank8_delta2_e2_pendant_far2_long_paired3_bridge_long_cells_exact_20260820.json": "DB9F6A0F185B3DE8CA42DEFFD7FA83D766CFC0EC4354BFFFE0A7884CAA59363C",
    "rank8_delta2_e2_pendant_far2_long_paired4_bridge_long_cells_exact_20260820.json": "997DA034B908CBE3E33EA26E5D24F7825F6F9B21D7654B6587D581283B56079B",
    "rank8_delta2_e2_pendant_far2_long_paired5_bridge_long_cells_exact_20260820.json": "091CA7192FBAE025B145ED505FC820ECB6FA05EACB1E2FBE5D9EEB32A383CDC4",
    "rank8_delta2_e2_pendant_far2_long_paired6_bridge_long_cells_exact_20260820.json": "07BE23A85BC589A24FAC4FC616DA0E33B6881C6612F4114C477396BB4E22D052",
    "rank8_delta2_e2_pendant_far2_long_pairedlong_bridge_long_cells_exact_20260820.json": "187784AEFE674CCBA13B59646CE6AA58214FE393A8F9C56C0D8046C6BA12421A",
    "rank8_delta2_e2_pendant_far3_long_paired1_bridge_long_cells_exact_20260820.json": "F9083CE0EB3CA3D25B3AA42FA43E70E4F6595614CED31443E622562E7167A992",
    "rank8_delta2_e2_pendant_far3_long_paired2_bridge_long_cells_exact_20260820.json": "4E220112FC40C28C5E657CF4F3B17363284F6522B7202E581E84C653324C5B00",
    "rank8_delta2_e2_pendant_far3_long_paired3_bridge_long_cells_exact_20260820.json": "C2A06B7B5737D05C01E297A2B090A7C0FD5A1B5148563CD969608118B622E664",
    "rank8_delta2_e2_pendant_far3_long_paired4_bridge_long_cells_exact_20260820.json": "1A6AAE091F22D7A0B0D1A93171107338DE3BC82568F7F4A20F7E045D0B2D4C17",
    "rank8_delta2_e2_pendant_far3_long_paired5_bridge_long_cells_exact_20260820.json": "1A13407B0BF1B149B1642C63F1DF7BD375D0FEADC60560C9E0E908668DA25903",
    "rank8_delta2_e2_pendant_far3_long_paired6_bridge_long_cells_exact_20260820.json": "7B2507F0B7B209ECC5DFFBF935289D8BBCE312147D602AC518EC4972FAD252B2",
    "rank8_delta2_e2_pendant_far3_long_pairedlong_bridge_long_cells_exact_20260820.json": "A9244365A964CFB00677440F82A2B56F36157688828D38FAE140DFA1EC71B93B",
    "rank8_delta2_e2_pendant_far4_long_paired1_bridge_long_cells_exact_20260820.json": "78C0773303DDEB339F41FD1C917F4F870CEAD9FDAD72D942461E73FBB0880E68",
    "rank8_delta2_e2_pendant_far4_long_paired2_bridge_long_cells_exact_20260820.json": "F6D2E5D185B199EDC5CB8E3A3B23E28716EEEE0C0CBCEADC1BDFA59A02FB033E",
    "rank8_delta2_e2_pendant_far4_long_paired3_bridge_long_cells_exact_20260820.json": "3B8441B95988939EC5F179A99E24C535B68F50088E0E72AB95B5367289CA2E9B",
    "rank8_delta2_e2_pendant_far4_long_paired4_bridge_long_cells_exact_20260820.json": "11C021B69437903098FCAB77B11D1D3F899D5B6F66BD0BB7F4C0AB45B9DF23C9",
    "rank8_delta2_e2_pendant_far4_long_paired5_bridge_long_cells_exact_20260820.json": "DF1328E9D50AC60C69BF0B975B5413EF7E558E6336D5786F07A2DCEF76CDCFEA",
    "rank8_delta2_e2_pendant_far4_long_paired6_bridge_long_cells_exact_20260820.json": "4B478FD0DE08AD4CC6A7A7EDF8A0BEDEF8347EF961F1D9F55349748A3347494D",
    "rank8_delta2_e2_pendant_far4_long_pairedlong_bridge_long_cells_exact_20260820.json": "ACBD5859ADB8D086118C4697CBE4E7F94054434E919034B63661102ECE3CCB17",
    "rank8_delta2_e2_pendant_far5_long_paired1_bridge_long_cells_exact_20260820.json": "5338F981A325A592A21B7D6D3B0A58EF09ABC16DD9E62E200D2C380104BD7F61",
    "rank8_delta2_e2_pendant_far5_long_paired2_bridge_long_cells_exact_20260820.json": "97C45EA4E76C71BBA197D77F49029172ED4A5D749025A8C3431D9A4A48C7090E",
    "rank8_delta2_e2_pendant_far5_long_paired3_bridge_long_cells_exact_20260820.json": "5FE2C53BBFB0224361E0105B45381386A8E6BE540F2102F8D7C4FC05095CD0B7",
    "rank8_delta2_e2_pendant_far5_long_paired4_bridge_long_cells_exact_20260820.json": "E9C0717593BBFA24755A5EDA42531EBDA2B02C8C70126529380CF68D07E33D03",
    "rank8_delta2_e2_pendant_far5_long_paired5_bridge_long_cells_exact_20260820.json": "D1ED7638ADB79FA36958A595DD8AA7C7C7EE13E8DB61BAB6F969D22A15E1D84A",
    "rank8_delta2_e2_pendant_far5_long_paired6_bridge_long_cells_exact_20260820.json": "CC60EBC2EE89ADF65D82C05C96A7ADF9C5E82532C64A17593AE60BF2DEE8C190",
    "rank8_delta2_e2_pendant_far5_long_pairedlong_bridge_long_cells_exact_20260820.json": "E94BE4D902E440DAED448E9DE2CE9E754DE70F9F345BD7A72E7C86213E3D222E",
    "rank8_delta2_e2_pendant_far6_long_paired1_bridge_long_cells_exact_20260820.json": "01A7229210872B5BEF6DEE913A77661D59448BFD37A41967E075E01317C498A6",
    "rank8_delta2_e2_pendant_far6_long_paired2_bridge_long_cells_exact_20260820.json": "F082D9080FD7AC4FB8F62435E7E47BF7B82C26EC4C3A132D78A608E0874D2C9F",
    "rank8_delta2_e2_pendant_far6_long_paired3_bridge_long_cells_exact_20260820.json": "F587AA59B2DAF523E5777D99124DFD74DBB5693EE6DAB0EE4A0D028B38D73D48",
    "rank8_delta2_e2_pendant_far6_long_paired4_bridge_long_cells_exact_20260820.json": "975785AE0CFBAB0D4207E9270228A5142676D7E873DB112A2E4D885064D3D42D",
    "rank8_delta2_e2_pendant_far6_long_paired5_bridge_long_cells_exact_20260820.json": "89DBC9EC829CB973AB4AD2E783A64F71EBC8BC45CDA55E66A7C90FCF17C83566",
    "rank8_delta2_e2_pendant_far6_long_paired6_bridge_long_cells_exact_20260820.json": "D0FEE9129B9FD2FFBBC9D3616A53769EB6128BD2C4159A69BD48D97EAB5ECBC2",
    "rank8_delta2_e2_pendant_far6_long_pairedlong_bridge_long_cells_exact_20260820.json": "9C002EB93C6AB8E2CBC3769F918E7DBC8B04A8625A146005059228979AF38F36",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def base_value(state, long_base: int) -> int:
    return long_base if state == LONG else int(state)


def coordinate_names(paired_state, near_state, tail_state):
    names = []
    if paired_state == LONG and near_state == LONG:
        names.append("X")
    else:
        if paired_state == LONG:
            names.append("B")
        if near_state == LONG:
            names.append("N")
    if tail_state == LONG:
        names.append("U")
    names.extend(("F", "G"))
    return names


def literal_lengths(short_far, paired_state, near_state, tail_state, shifted, shift):
    offsets = {name: 0 for name in coordinate_names(paired_state, near_state, tail_state)}
    if shifted is not None:
        offsets[shifted] = shift
    if paired_state == LONG and near_state == LONG:
        paired = 7
        near = 7 + offsets["X"]
    else:
        paired = 7 + offsets.get("B", 0) if paired_state == LONG else int(paired_state)
        near = 7 + offsets.get("N", 0) if near_state == LONG else int(near_state)
    tail = 7 + offsets.get("U", 0) if tail_state == LONG else int(tail_state)
    far_long = 7 + offsets["F"]
    bridge = 8 + offsets["G"]
    return paired, near, tail, int(short_far), far_long, bridge


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    expected_root_keys = {(near, tail) for near in ROOT_STATES for tail in ROOT_STATES}
    total_patterns = 0
    total_cells = 0
    constant_checks = 0
    per_far = {}

    for short_far in range(1, 7):
        far_patterns = 0
        far_cells = 0
        for paired_state in PAIRED_STATES:
            paired_label = "long" if paired_state == LONG else paired_state
            name = REPORT.format(far=short_far, paired=paired_label)
            report = json.loads((HERE / name).read_text())
            assert report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL"
            assert report["far_pair"] == [short_far, LONG]
            assert report["paired_state"] == paired_state
            assert report["signed_cells"] == []
            actual = {(row["near_state"], row["tail_state"]): row for row in report["cells"]}
            assert set(actual) == expected_root_keys and len(actual) == 64

            for (near_state, tail_state), row in actual.items():
                base = (
                    base_value(near_state, 7) + base_value(tail_state, 7) + 1
                    + base_value(paired_state, 7) + short_far + 7 + 8
                )
                threshold = max(0, 22 - base)
                names = coordinate_names(paired_state, near_state, tail_state)
                q = math.ceil(threshold / len(names)) if threshold else 0
                expected_variants = (
                    {(coordinate, q) for coordinate in names}
                    if threshold else {(None, 0)}
                )
                actual_variants = {
                    (cell["shifted_coordinate"], cell["shift"]): cell
                    for cell in row["cells"]
                }
                assert row["base_suppressed_length_sum"] == base
                assert row["order_constraint_on_offsets"] == threshold
                assert row["cover_coordinate_threshold"] == q
                assert set(actual_variants) == expected_variants
                if threshold:
                    assert len(names) * (q - 1) < threshold

                for (shifted, shift), cell in actual_variants.items():
                    paired, near, tail, far_short, far_long, bridge = literal_lengths(
                        short_far, paired_state, near_state, tail_state, shifted, shift
                    )
                    selected = near + tail + 1
                    core = double_claw((selected, paired, bridge, far_short, far_long))
                    deletion = multiply(
                        path(tail),
                        double_claw((near, paired, bridge, far_short, far_long)),
                    )
                    literal = delta2(core, deletion)
                    assert cell["negative_coefficients"] == 0
                    assert Fraction(cell["minimum_coefficient"]) > 0
                    assert literal == int(Fraction(cell["constant_coefficient"])) > 0
                    constant_checks += 1
                    far_cells += 1
            far_patterns += len(actual)

        total_patterns += far_patterns
        total_cells += far_cells
        per_far[str(short_far)] = {
            "root_position_paired_patterns": far_patterns,
            "shifted_cells": far_cells,
        }

    assert total_patterns == 2688
    assert total_cells == 2723 and constant_checks == 2723
    payload = {
        "schema": "rank8-delta2-e2-pendant-one-short-one-long-far-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_ONE_SHORT_ONE_LONG_FAR",
        "immutable_input_hashes": EXPECTED,
        "short_far_lengths": [1, 2, 3, 4, 5, 6],
        "paired_states": PAIRED_STATES,
        "root_position_paired_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constant_checks,
        "per_short_far": per_far,
        "scope": "selected arm/root and paired arm arbitrary; unordered far pair (1..6,>=7); bridge>=8; n>=23",
        "coverage_guard": "far symmetry, short1..6, paired1..6/L, near-tail0..6/L, and every order-deficit orthant union regenerated",
        "scope_guard": "this audit does not include two short far arms",
    }
    output = HERE / "rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns", total_patterns, "cells", total_cells, "constants", constant_checks)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
