"""Test the exact endpoint, rather than the stronger failed sample pencil.

For coupled finite-free sample seeds G,H, probe

    S^d(G_left G_right)-S^(d-2)(H_left H_right)

on positive affine lines.  Test both independent left/right rotations (the
representation relevant to the product of expectations) and a shared
rotation.  A robust failure rules out a samplewise endpoint proof.
"""

from __future__ import annotations

import random

import numpy as np

from probe_rankone_laguerre_sample_pencil import (
    add,
    coupled_seeds,
    derivative_sum_line,
    robust_nonreal,
)


def main() -> None:
    rng = random.Random(993_080_311)
    for shared in (False, True):
        print(f"shared_left_right_permutation={shared}", flush=True)
        for m in range(1, 8):
            N = 3 * m + 3
            n = N - 2
            d = 2 * m + 3
            failures = 0
            worst = 0.0
            witness = None
            for sample in range(250):
                left_permutation = np.array(rng.sample(range(n), n))
                right_permutation = (
                    left_permutation.copy()
                    if shared
                    else np.array(rng.sample(range(n), n))
                )
                g_left, h_left = coupled_seeds(n, left_permutation)
                g_right, h_right = coupled_seeds(n, right_permutation)
                for trial in range(8):
                    bases = (rng.randint(-30, 10), rng.randint(-30, 10))
                    directions = (rng.randint(1, 12), rng.randint(1, 12))
                    first = derivative_sum_line(g_left, g_right, d, bases, directions)
                    second = derivative_sum_line(h_left, h_right, d - 2, bases, directions)
                    endpoint = add(first, second, -1.0)
                    count, maximum = robust_nonreal(endpoint)
                    worst = max(worst, maximum)
                    if count:
                        failures += 1
                        witness = (
                            sample,
                            trial,
                            left_permutation.tolist(),
                            right_permutation.tolist(),
                            bases,
                            directions,
                            count,
                            maximum,
                        )
                        break
                if witness is not None:
                    break
            print(
                f" m={m} lines_tested<={250*8} failures={failures} "
                f"worst_imaginary={worst:.9g} witness={witness}",
                flush=True,
            )


if __name__ == "__main__":
    main()
