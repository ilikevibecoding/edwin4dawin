#!/usr/bin/env python3
"""Independent no-gap and literal-constant audit of the bridge-one theorem."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, multiply, path
from audit_rank8_delta2_e1_all_order import delta2


ROOT = Path(__file__).resolve().parent
LONG = "L"
SOURCE = "run_rank8_delta2_e2_pendant_fixed_bridge_far_long_root_side_arbitrary_cells.py"
REPORT = "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_cells_exact_20260820.json"
CANCELLATION_PROBE = "probe_rank8_delta2_e2_pendant_bridge1_far_product_cell.py"
CANCELLATION_VERIFIER = "verify_rank8_delta2_e2_pendant_bridge1_far_product_cancellation.py"
CANCELLATION_REPORT = "rank8_delta2_e2_pendant_bridge1_far_product_cancellation_exact_20260821.json"
EXPECTED = {
    SOURCE: "4926057DC1A4AB503694B9D19457D89E1B3FA125DA0DD656A5286563CF0BE597",
    REPORT: "D977391D855001F3E6128E27985F1DC9DDA6D6102CEF29BD90AFADAA67D78669",
    CANCELLATION_PROBE: "4701B984506EB66711B59DB320781F61BE018D1C47A1054D7DC5E69C26F7B594",
    CANCELLATION_VERIFIER: "D19788510C73E8416A2BE067EE43066861C74F89DC5268CE367CC9EAF85691EF",
    CANCELLATION_REPORT: "F8395D64F76AABE7BF742944F597C2CDE199B6D57BF66F9EA617961621EA038F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    names.append("SR")
    return names


def base_value(state, long_base):
    return long_base if state == LONG else int(state)


def literal_lengths(paired_state, near_state, tail_state, shifted, shift):
    values = {
        name: shift if name == shifted else 0
        for name in coordinate_names(paired_state, near_state, tail_state)
    }
    if paired_state == LONG and near_state == LONG:
        paired = 7 + values["X"]
        near = 7
    else:
        paired = 7 + values["B"] if paired_state == LONG else int(paired_state)
        near = 7 + values["N"] if near_state == LONG else int(near_state)
    tail = 7 + values["U"] if tail_state == LONG else int(tail_state)
    far_left = 7 + values["SR"]
    far_right = 7
    return paired, near, tail, far_left, far_right


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    report = json.loads((ROOT / REPORT).read_text(encoding="utf-8"))
    cancellation = json.loads((ROOT / CANCELLATION_REPORT).read_text(encoding="utf-8"))
    assert report["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert report["bridge_length"] == 1
    assert report["patterns"] == 448
    assert report["symbolic_cells"] == report["positive_symbolic_cells"] == 448
    assert report["signed_cells"] == []
    assert cancellation["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_PRODUCT_CANCELLATION"
    )
    assert cancellation["cells"] == 448
    assert cancellation["terms"] == 112014
    assert cancellation["maximum_far_product_degree"] == 0
    assert cancellation["negative_coefficients"] == 0
    assert cancellation["immutable_inputs"] == {
        CANCELLATION_PROBE: EXPECTED[CANCELLATION_PROBE]
    }

    paired_states = [1, 2, 3, 4, 5, 6, LONG]
    root_states = [0, 1, 2, 3, 4, 5, 6, LONG]
    expected_keys = {
        (paired, near, tail)
        for paired in paired_states for near in root_states for tail in root_states
    }
    rows = {
        (row["paired_state"], row["near_state"], row["tail_state"]): row
        for row in report["cells"]
    }
    assert set(rows) == expected_keys and len(rows) == 448
    cancellation_keys = {
        (str(row["paired_state"]), str(row["near_state"]), str(row["tail_state"]))
        for row in cancellation["rows"]
    }
    assert cancellation_keys == {
        (str(paired), str(near), str(tail)) for paired, near, tail in expected_keys
    }

    literal_constants = 0
    symbolic_cells = 0
    shifted_cover_cells = 0
    global_minimum = None
    for (paired_state, near_state, tail_state), row in rows.items():
        names = coordinate_names(paired_state, near_state, tail_state)
        base = (
            base_value(near_state, 7) + base_value(tail_state, 7) + 1
            + base_value(paired_state, 7) + 7 + 7 + 1
        )
        threshold = max(0, 22 - base)
        cover_threshold = math.ceil(threshold / len(names)) if threshold else 0
        variants = (
            {(name, cover_threshold) for name in names}
            if threshold else {(None, 0)}
        )
        actual_variants = {
            (cell["shifted_coordinate"], cell["shift"]): cell
            for cell in row["cells"]
        }
        assert row["base_suppressed_length_sum"] == base
        assert row["order_constraint_on_offsets"] == threshold
        assert row["cover_coordinate_threshold"] == cover_threshold
        assert set(actual_variants) == variants
        if threshold:
            assert len(names) * (cover_threshold - 1) < threshold
            shifted_cover_cells += len(variants)

        for (shifted, shift), cell in actual_variants.items():
            assert cell["negative_coefficients"] == 0
            minimum = Fraction(cell["minimum_coefficient"])
            constant = Fraction(cell["constant_coefficient"])
            assert minimum > 0 and constant > 0
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            paired, near, tail, far_left, far_right = literal_lengths(
                paired_state, near_state, tail_state, shifted, shift
            )
            core = double_claw((near + tail + 1, paired, 1, far_left, far_right))
            deletion = multiply(
                path(tail),
                double_claw((near, paired, 1, far_left, far_right)),
            )
            literal = delta2(core, deletion)
            assert literal == int(constant) > 0
            literal_constants += 1
            symbolic_cells += 1

    assert symbolic_cells == report["symbolic_cells"] == 448
    assert literal_constants == 448
    payload = {
        "schema": "rank8-delta2-e2-pendant-bridge1-far-long-root-side-arbitrary-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_LONG_ROOT_SIDE_ARBITRARY",
        "immutable_input_hashes": EXPECTED,
        "pattern_keys": len(rows),
        "symbolic_cells": symbolic_cells,
        "shifted_order_cover_cells": shifted_cover_cells,
        "independent_literal_constants_checked": literal_constants,
        "far_product_cancellation_cells": cancellation["cells"],
        "far_product_cancellation_terms": cancellation["terms"],
        "maximum_far_product_degree": cancellation["maximum_far_product_degree"],
        "global_minimum_coefficient": str(global_minimum),
        "theorem_scope": report["scope"],
        "coverage_logic": (
            "The short/long states are exhaustive. Whenever the order-23 "
            "offset sum has deficit d, one of k nonnegative compressed "
            "coordinates is at least ceil(d/k); the audited shifted orthants "
            "therefore cover the entire admissible domain."
        ),
        "scope_guard": (
            "This closes bridge length one only, with both far arms at least "
            "seven. Other short bridges and configurations with a short far "
            "arm remain outside this theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = ROOT / (
        "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_"
        "independent_audit_exact_20260821.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("patterns", len(rows), "cells", symbolic_cells, "constants", literal_constants)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
