#!/usr/bin/env python3
"""Close all 24 obstructed fixed-tail bivariate Delta3 near=0 cells."""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import evaluator, transform_axis
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value
from prove_rank8_delta3_e1_old_root_near0_univariate_refinement_agent_20260825 import shifted_ray


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json"
DEGREE = 26
EXTENSIONS = ("root", "short", "long")
LABEL = re.compile(r"tail=(\d+), short>=ceil\((\d+)/2\)=(\d+)$")
PINNED = {
    "certify_rank8_e1_new_leaf_newton_cell.py":
        "2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218",
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
    "prove_rank8_delta3_e1_old_root_near0_univariate_refinement_agent_20260825.py":
        "5AEF4E1B84BA5CFDF4089B95EB91784C07EA3EA9B33C892C54B0043961D7D91C",
    "rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json":
        "0B1D9CD86342ADF42B20CFDD9C4BD430CDAF8313B92E04932B6855E9D7333720",
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


def digest(values: np.ndarray) -> dict[str, object]:
    coefficients = [int(entry) for entry in values.flat]
    ordered = hashlib.sha256()
    for index in np.ndindex(values.shape):
        ordered.update((",".join(map(str, index)) + ":" + str(int(values[index])) + "\n").encode())
    return {
        "shape": list(values.shape),
        "coefficients": len(coefficients),
        "negative": sum(entry < 0 for entry in coefficients),
        "zero": sum(entry == 0 for entry in coefficients),
        "positive": sum(entry > 0 for entry in coefficients),
        "minimum": str(min(coefficients)),
        "origin": str(int(values[(0,) * values.ndim])),
        "ordered_sha256": ordered.hexdigest().upper(),
    }


def bulk(evaluate, extension: str, tail: int) -> dict[str, object]:
    values = np.empty((DEGREE + 1, DEGREE + 1), dtype=object)
    for short_offset in range(DEGREE + 1):
        for difference in range(DEGREE + 1):
            values[short_offset, difference] = increment_value(
                evaluate, extension, 0, tail, 5 + short_offset, difference
            )
    minimum_sampled = min(int(entry) for entry in values.flat)
    transform_axis(values, 0)
    transform_axis(values, 1)
    record = digest(values)
    assert record["negative"] == 0
    assert int(record["origin"]) > 0
    assert minimum_sampled > 0
    return {
        "short_lower": 5,
        "difference_lower": 0,
        "minimum_sampled_increment": str(minimum_sampled),
        "newton": record,
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    evaluate, source_terms = evaluator(3)
    rows = []
    for extension in EXTENSIONS:
        original_path = HERE / f"rank8_e1_old_root_increment_ordered_delta3_{extension}_near0_exact_20260820.json"
        original = json.loads(original_path.read_text(encoding="utf-8"))
        obstructed = [row for row in original["cell_rows"] if row["negative"] > 0]
        bivariate = [row for row in obstructed if row["dimension"] == 2]
        assert len(bivariate) == 8
        for original_row in bivariate:
            match = LABEL.fullmatch(original_row["label"])
            assert match is not None, original_row["label"]
            tail, remainder, short_lower = map(int, match.groups())
            assert remainder == 19 - tail
            assert short_lower == (remainder + 1) // 2
            assert 11 <= tail <= 18
            fixed_strips = [
                {"short": short, **shifted_ray(evaluate, extension, tail, short, 0)}
                for short in range(short_lower, 5)
            ]
            assert all(row["tail_negative"] == 0 for row in fixed_strips)
            rows.append(
                {
                    "extension": extension,
                    "original_cell_label": original_row["label"],
                    "tail": tail,
                    "original_short_lower": short_lower,
                    "partition": [
                        "short>=5,difference>=0",
                        f"short={short_lower},...,4 with each difference ray split into a finite prefix and shifted Newton tail",
                    ],
                    "bulk_short5": bulk(evaluate, extension, tail),
                    "fixed_short_strips": fixed_strips,
                }
            )
            print("PASS_BIVARIATE_CELL", extension, original_row["label"], flush=True)

    assert len(rows) == 24
    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-bivariate-refinement-agent-v1",
        "status": "PASS_EXACT_ALL_24_OBSTRUCTED_BIVARIATE_CELLS",
        "theorem": (
            "All eight formerly obstructed fixed-tail bivariate cells in each "
            "of the three Delta3 near=0 old-root extension orbits are strictly "
            "positive for every admissible short and difference."
        ),
        "rank": 3,
        "near": 0,
        "degree_bound": DEGREE,
        "source_expression_terms": source_terms,
        "closed_original_cells_per_extension": {extension: 8 for extension in EXTENSIONS},
        "rows": rows,
        "dependency_sha256": actual,
        "proof_boundary": (
            "This closes exactly the 24 original bivariate cells.  Together "
            "with the separate univariate refinement, only the tail>=19 "
            "trivariate cell remains from the 2026-08-20 near=0 partition."
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
