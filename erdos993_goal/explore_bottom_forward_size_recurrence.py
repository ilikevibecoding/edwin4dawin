"""Search for an inductive size recurrence in the actual forward matrices."""

from __future__ import annotations

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_matrix


def diagonal_match(left: sp.Matrix, right: sp.Matrix):
    n = left.rows
    best = None
    for anchor_row in range(n):
        for anchor_column in range(n):
            if any(left[i, anchor_column] == 0 or right[i, anchor_column] == 0 for i in range(n)):
                continue
            if any(left[anchor_row, j] == 0 or right[anchor_row, j] == 0 for j in range(n)):
                continue
            row_scales = [
                sp.factor(left[i, anchor_column] / right[i, anchor_column])
                for i in range(n)
            ]
            column_scales = [
                sp.factor(
                    left[anchor_row, j]
                    / (row_scales[anchor_row] * right[anchor_row, j])
                )
                for j in range(n)
            ]
            residual = sp.simplify(
                left - sp.diag(*row_scales) * right * sp.diag(*column_scales)
            )
            record = (
                residual.rank(),
                anchor_row,
                anchor_column,
                residual,
                row_scales,
                column_scales,
            )
            if best is None or record[0] < best[0]:
                best = record
    return best


def signs(matrix: sp.Matrix) -> list[int]:
    return sorted(set(int(sp.sign(value)) for value in matrix))


def main() -> None:
    previous = forward_matrix(1)[2]
    for m in range(2, 10):
        current = forward_matrix(m)[2]
        candidates = {
            "top_left": current[:-1, :-1],
            "top_right": current[:-1, 1:],
            "bottom_left": current[1:, :-1],
            "bottom_right": current[1:, 1:],
        }
        print(f"m={m}", flush=True)
        for name, block in candidates.items():
            rank, ar, ac, residual, _, _ = diagonal_match(block, previous)
            print(
                f" {name}: best_rank={rank} anchor=({ar},{ac}) "
                f"residual_signs={signs(residual)}",
                flush=True,
            )

        # One-pivot Schur complements from each corner, followed by comparison
        # with the preceding forward matrix.
        schurs = {
            "top_left_pivot": sp.simplify(
                current[1:, 1:] - current[1:, 0] * current[0, 1:] / current[0, 0]
            ),
            "bottom_right_pivot": sp.simplify(
                current[:-1, :-1]
                - current[:-1, -1] * current[-1, :-1] / current[-1, -1]
            ),
        }
        for name, schur in schurs.items():
            rank, ar, ac, residual, _, _ = diagonal_match(schur, previous)
            inner_match = None
            residual_tn = None
            if m >= 3 and ar == 0 and ac == 0:
                assert residual[0, :] == sp.zeros(1, m - 1)
                assert residual[:, 0] == sp.zeros(m - 1, 1)
                two_back = forward_matrix(m - 2)[2]
                inner_match_record = diagonal_match(residual[1:, 1:], two_back)
                inner_match = (
                    inner_match_record[0],
                    inner_match_record[1],
                    inner_match_record[2],
                    signs(inner_match_record[3]),
                )
                if m <= 6:
                    from explore_bottom_actual_forward_difference_factor import (
                        first_nonpositive_minor,
                    )

                    checked, obstruction = first_nonpositive_minor(residual[1:, 1:])
                    residual_tn = (checked, obstruction)
            print(
                f" {name}: positive_entries={all(value > 0 for value in schur)} "
                f"best_rank={rank} residual_signs={signs(residual)} "
                f"inner_match={inner_match} inner_STP={residual_tn}",
                flush=True,
            )
        previous = current


if __name__ == "__main__":
    main()
