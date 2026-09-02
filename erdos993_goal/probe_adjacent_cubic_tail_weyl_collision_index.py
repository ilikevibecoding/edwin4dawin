"""Probe the finite tail-Weyl reduction for common-root branch alignment.

The Darboux current matrix A (size n) and adjacent Jacobi matrix H (size
n-1) share their long leading prefix.  At a common eigenvalue their prefix
Schur complements agree only if the Weyl functions of A's final 3x3 tail
and H's final 2x2 tail agree.  This script tests every real solution of
that finite tail equation and records the relative tail eigenvalue count.
The desired harmless alignment is count_A - count_H = 1.
"""

import json
from pathlib import Path
import random

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c")


def load(parity):
    tail_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text()
    )
    expr_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json").read_text()
    )
    local = {"r": R, "u": U, "v": V, "c": C}
    current = {k: sp.sympify(v, locals=local) for k, v in tail_raw["current"].items()}
    adjacent = {k: sp.sympify(v, locals=local) for k, v in tail_raw["adjacent"].items()}
    expressions = {k: sp.sympify(v, locals=local) for k, v in expr_raw["expressions"].items()}

    q1 = expressions["current_penultimate_cholesky_pivot"]
    q2 = expressions["current_last_cholesky_pivot"]
    b0 = current["b_previous"]
    b1 = current["terminal"]
    q0 = sp.cancel(b0 / (current["d_previous"] - q1))
    values = [
        q0 + b0 / q0,
        q1 + b1 / q1,
        q2,
        q1 * b0 / q0,
        q2 * b1 / q1,
        adjacent["d_previous"],
        adjacent["d_last"],
        adjacent["terminal"],
    ]
    return sp.lambdify((R, U, V, C), values, "numpy")


def poly_tail3(d0, d1, d2, b1, b2):
    y = np.poly1d([1.0, 0.0])
    q0 = y - d0
    q1 = (y - d1) * q0 - b1
    q2 = (y - d2) * q1 - b2 * q0
    numerator = (y - d2) * (y - d1) - b2
    return numerator, q2


def poly_tail2(d0, d1, b1):
    y = np.poly1d([1.0, 0.0])
    return y - d1, (y - d1) * (y - d0) - b1


def matrix3(d0, d1, d2, b1, b2):
    return np.array([[d0, b1**0.5, 0], [b1**0.5, d1, b2**0.5], [0, b2**0.5, d2]])


def matrix2(d0, d1, b1):
    return np.array([[d0, b1**0.5], [b1**0.5, d1]])


def classical_prefix_data(parity, r):
    if parity == "odd":
        alpha = 2 * r + 1
        beta = 0.5
        adjacent_degree = r + 5
    else:
        alpha = 2 * r + 2
        beta = -0.5
        adjacent_degree = r + 6
    prefix_size = adjacent_degree - 2

    def top(k):
        diagonal = -k * (k + alpha) / (2 * k + alpha + beta)
        second = (
            k * (k - 1) * (k + alpha - 1) * (k + alpha)
            / (2 * (2 * k + alpha + beta - 1) * (2 * k + alpha + beta))
        )
        return diagonal, second

    diagonal = []
    subdiagonal = [0.0]
    for k in range(prefix_size + 1):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        ak = c0 - c1
        diagonal.append(ak)
        if k:
            subdiagonal.append(e0 - e1 - ak * c0)
    return diagonal[:prefix_size], subdiagonal[:prefix_size], subdiagonal[prefix_size]


def prefix_continuants(x, diagonal, subdiagonal):
    previous = 1.0
    if not diagonal:
        return previous, 0.0
    current = x - diagonal[0]
    for k in range(1, len(diagonal)):
        previous, current = current, (x - diagonal[k]) * current - subdiagonal[k] * previous
    return current, previous


def full_matrices(prefix_d, prefix_b, coupling, tail_a, tail_h):
    m = len(prefix_d)
    aa = np.zeros((m + 3, m + 3))
    hh = np.zeros((m + 2, m + 2))
    for out in (aa, hh):
        out[np.arange(m), np.arange(m)] = prefix_d
        for k in range(1, m):
            out[k - 1, k] = out[k, k - 1] = prefix_b[k] ** 0.5
        out[m - 1, m] = out[m, m - 1] = coupling ** 0.5
    aa[m:, m:] = tail_a
    hh[m:, m:] = tail_h
    return aa, hh


def main():
    rng = random.Random(993_20260806)
    functions = {parity: load(parity) for parity in ("odd", "even")}
    counts = {}
    count_pairs = {}
    residual_signs = {}
    closest = {}
    bad_root_vs_full_ground = {}
    bad = None
    real_solutions = 0
    samples = 0
    examples = []
    for parity, fun in functions.items():
        for r in list(range(0, 11)) + [25, 75, 150]:
            prefix_d, prefix_b, prefix_coupling = classical_prefix_data(parity, r)
            for _ in range(6):
                u = rng.random()
                v = rng.random()
                c = 10 ** rng.uniform(-3, 3)
                vals = [float(x) for x in fun(r, u, v, c)]
                da0, da1, da2, ba1, ba2, dh0, dh1, bh1 = vals
                na, qa = poly_tail3(da0, da1, da2, ba1, ba2)
                nh, qh = poly_tail2(dh0, dh1, bh1)
                collision = na * qh - nh * qa
                roots = np.roots(collision)
                eva = np.linalg.eigvalsh(matrix3(da0, da1, da2, ba1, ba2))
                evh = np.linalg.eigvalsh(matrix2(dh0, dh1, bh1))
                tail_a_matrix = matrix3(da0, da1, da2, ba1, ba2)
                tail_h_matrix = matrix2(dh0, dh1, bh1)
                samples += 1
                for root in roots:
                    if abs(root.imag) > 1e-7 or not (1e-9 < root.real < 1 - 1e-9):
                        continue
                    x = float(root.real)
                    if min(abs(x - eva)) < 1e-7 or min(abs(x - evh)) < 1e-7:
                        continue
                    count_a = int(np.sum(eva < x))
                    count_h = int(np.sum(evh < x))
                    diff = count_a - count_h
                    counts[str(diff)] = counts.get(str(diff), 0) + 1
                    pair_key = f"{count_a},{count_h}"
                    count_pairs[pair_key] = count_pairs.get(pair_key, 0) + 1
                    pm, pm1 = prefix_continuants(x, prefix_d, prefix_b)
                    den_h = float(qh(x))
                    num_h = float(nh(x))
                    full_residual = den_h * pm - prefix_coupling * num_h * pm1
                    scale = abs(den_h * pm) + abs(prefix_coupling * num_h * pm1)
                    normalized_residual = full_residual / scale if scale else 0.0
                    sign = "positive" if normalized_residual > 1e-9 else "negative" if normalized_residual < -1e-9 else "near_zero"
                    residual_signs[f"diff_{diff}_{sign}"] = residual_signs.get(f"diff_{diff}_{sign}", 0) + 1
                    if str(diff) not in closest or abs(normalized_residual) < abs(closest[str(diff)]["normalized_full_residual"]):
                        closest[str(diff)] = {
                            "parity": parity, "r": r, "u": u, "v": v, "c": c, "y": x,
                            "normalized_full_residual": normalized_residual,
                        }
                    if diff == 0:
                        full_a, full_h = full_matrices(prefix_d, prefix_b, prefix_coupling, tail_a_matrix, tail_h_matrix)
                        ground_a = float(np.linalg.eigvalsh(full_a)[0])
                        ground_h = float(np.linalg.eigvalsh(full_h)[0])
                        position = (
                            "above_both" if x > max(ground_a, ground_h) + 1e-8
                            else "below_both" if x < min(ground_a, ground_h) - 1e-8
                            else "between_or_close"
                        )
                        bad_root_vs_full_ground[position] = bad_root_vs_full_ground.get(position, 0) + 1
                    real_solutions += 1
                    record = {"parity": parity, "r": r, "u": u, "v": v, "c": c, "y": x, "count_difference": diff}
                    if len(examples) < 8:
                        examples.append(record)
                    if diff != 1 and bad is None:
                        bad = record
    report = {
        "status": "all_tail_collisions_branch_aligned" if bad is None else "counterexample",
        "samples": samples,
        "real_tail_weyl_solutions_in_unit_interval": real_solutions,
        "count_difference_histogram": counts,
        "tail_count_pair_histogram": count_pairs,
        "full_collision_residual_signs": residual_signs,
        "closest_to_actual_common_root_by_count_difference": closest,
        "bad_tail_root_vs_full_ground": bad_root_vs_full_ground,
        "first_bad": bad,
        "examples": examples,
    }
    out = HERE / "adjacent_cubic_tail_weyl_collision_index_probe_20260806.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
