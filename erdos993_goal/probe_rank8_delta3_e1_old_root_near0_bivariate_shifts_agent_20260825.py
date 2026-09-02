#!/usr/bin/env python3
"""Search shifted Newton tails for the eight open fixed-tail Delta3 cells."""

from __future__ import annotations

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import evaluator, transform_axis
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value


DEGREE = 26


def main() -> None:
    evaluate, _ = evaluator(3)
    for extension in ("root", "short", "long"):
        for tail in range(11, 19):
            short_lower = (20 - tail) // 2
            found = None
            for shifted_short in range(short_lower, short_lower + 31):
                values = np.empty((DEGREE + 1, DEGREE + 1), dtype=object)
                for first in range(DEGREE + 1):
                    for second in range(DEGREE + 1):
                        values[first, second] = increment_value(
                            evaluate,
                            extension,
                            0,
                            tail,
                            shifted_short + first,
                            second,
                        )
                transform_axis(values, 0)
                transform_axis(values, 1)
                coefficients = [int(entry) for entry in values.flat]
                if min(coefficients) >= 0 and int(values[0, 0]) > 0:
                    found = (shifted_short, min(coefficients))
                    break
            print(
                extension, "tail", tail, "short_lower", short_lower,
                "first_passing_shift", found, flush=True,
            )


if __name__ == "__main__":
    main()
