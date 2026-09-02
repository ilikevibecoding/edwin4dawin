#!/usr/bin/env python3
"""Close every previously obstructed one-dimensional Delta3 near=0 cell.

The 2026-08-20 ordered near=0 partition left nineteen Newton-method
obstructions for each extension orbit.  Ten of the nineteen are rays with
tail and short fixed and only ``difference`` unbounded.  For each such ray
this producer finds an exact integer shift after which every forward
difference is nonnegative, and checks the finite prefix point by point.
Together those two pieces are a no-gap proof on the whole original ray.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path

from certify_rank8_e1_new_leaf_newton_cell import difference_coefficients, evaluator
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json"
DEGREE = 26
EXTENSIONS = ("root", "short", "long")
LABEL = re.compile(r"tail=(\d+), short=(\d+), difference>=(\d+)$")
ORIGINALS = {
    extension: HERE / f"rank8_e1_old_root_increment_ordered_delta3_{extension}_near0_exact_20260820.json"
    for extension in EXTENSIONS
}
PINNED = {
    "certify_rank8_e1_new_leaf_newton_cell.py":
        "2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218",
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
    "rank8_e1_old_root_increment_ordered_delta3_root_near0_exact_20260820.json":
        "98364D5B0F8D6070B2811FCE6A30CA646B91A9449E3FC63F0B1F18CD372FD9D7",
    "rank8_e1_old_root_increment_ordered_delta3_short_near0_exact_20260820.json":
        "4745DBC973D6B0E4EFC96A0B36D6C7D42533DE5C75B1E38567640E0DF54B8693",
    "rank8_e1_old_root_increment_ordered_delta3_long_near0_exact_20260820.json":
        "37428897176667DB1801497F33F3CE3B7403D5062F78416865503FC47B0ACE36",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def shifted_ray(evaluate, extension: str, tail: int, short: int, lower: int) -> dict[str, object]:
    def value(difference: int) -> int:
        return increment_value(evaluate, extension, 0, tail, short, difference)

    shift = lower
    while True:
        samples = [value(shift + offset) for offset in range(DEGREE + 1)]
        coefficients = difference_coefficients(samples)
        if min(coefficients) >= 0 and coefficients[0] > 0:
            break
        shift += 1
        assert shift <= 10000, (extension, tail, short, lower)

    prefix_values = [value(difference) for difference in range(lower, shift)]
    assert all(entry > 0 for entry in prefix_values)
    assert all(entry >= 0 for entry in coefficients)
    assert coefficients[0] > 0
    return {
        "tail": tail,
        "short": short,
        "original_difference_lower": lower,
        "tail_difference_lower": shift,
        "finite_prefix_count": shift - lower,
        "finite_prefix_values": [str(entry) for entry in prefix_values],
        "tail_newton_coefficients": [str(entry) for entry in coefficients],
        "tail_negative": sum(entry < 0 for entry in coefficients),
        "tail_zero": sum(entry == 0 for entry in coefficients),
        "tail_positive": sum(entry > 0 for entry in coefficients),
        "tail_origin": str(coefficients[0]),
        "minimum_prefix_value": str(min(prefix_values)) if prefix_values else None,
        "minimum_tail_coefficient": str(min(coefficients)),
        "coverage": (
            f"difference={lower},...,{shift - 1} pointwise and "
            f"difference>={shift} by the binomial(difference-{shift},j) expansion"
        ),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    evaluate, source_terms = evaluator(3)
    rows = []
    original_obstruction_counts = {}
    remaining_after = {}
    for extension in EXTENSIONS:
        report = json.loads(ORIGINALS[extension].read_text(encoding="utf-8"))
        assert report["status"] == "NEWTON_CELL_METHOD_OBSTRUCTION"
        obstructed = [row for row in report["cell_rows"] if row["negative"] > 0]
        rays = [row for row in obstructed if row["dimension"] == 1]
        assert len(obstructed) == 19
        assert len(rays) == 10
        original_obstruction_counts[extension] = len(obstructed)
        remaining_after[extension] = len(obstructed) - len(rays)
        for original in rays:
            match = LABEL.fullmatch(original["label"])
            assert match is not None, original["label"]
            tail, short, lower = map(int, match.groups())
            refinement = shifted_ray(evaluate, extension, tail, short, lower)
            rows.append(
                {
                    "extension": extension,
                    "original_cell_label": original["label"],
                    "original_negative_newton_coefficients": original["negative"],
                    **refinement,
                }
            )
            print(
                "PASS_RAY", extension, original["label"],
                "TAIL_SHIFT", refinement["tail_difference_lower"], flush=True,
            )

    assert len(rows) == 30
    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-univariate-refinement-agent-v1",
        "status": "PASS_EXACT_ALL_30_OBSTRUCTED_UNIVARIATE_RAYS",
        "theorem": (
            "For every source subdivided claw of order at least 23, with an old "
            "root on an arm and near=0, each of the thirty listed Delta3 "
            "old-root increment rays is strictly positive for every admissible "
            "difference.  This covers ten rays for each of root-, shorter-other-, "
            "and longer-other-arm extension."
        ),
        "method": (
            "Each integer ray is split without a gap into a finite positive prefix "
            "and a shifted infinite tail.  The exact tail values have a degree-26 "
            "Newton expansion with all forward-difference coefficients nonnegative "
            "and positive origin."
        ),
        "rank": 3,
        "near": 0,
        "source_order_lower": 23,
        "source_expression_terms": source_terms,
        "degree_bound": DEGREE,
        "extensions": list(EXTENSIONS),
        "original_obstructed_cells_per_extension": original_obstruction_counts,
        "newly_closed_cells_per_extension": {extension: 10 for extension in EXTENSIONS},
        "remaining_obstructed_cells_per_extension": remaining_after,
        "rows": rows,
        "dependency_sha256": actual,
        "proof_boundary": (
            "This closes exactly the thirty one-dimensional rays listed here.  "
            "For each extension orbit, the tail>=19 trivariate cell and eight "
            "fixed-tail bivariate cells remain open; other near values, other "
            "old-root families, arbitrary leaf extension, Q8/PGC, and Problem 993 "
            "are not claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("ROWS", len(rows))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
