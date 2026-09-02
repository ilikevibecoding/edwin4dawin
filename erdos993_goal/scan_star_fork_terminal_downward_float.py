#!/usr/bin/env python3
"""High-precision locator for downward-sign failures in the star-fork family.

This is only a locator.  Any reported failure must be rerun through the
exact rational-interval engine before it is treated as a certificate.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import mpmath as mp


def e_over_binomial(m: int, t: int, rank: int) -> mp.mpf:
    """Return [x^rank]((1+x)^m+x)^t / binom(mt,rank)."""
    n_total = m * t
    term = mp.mpf(1)
    total = term
    for j in range(10000):
        n = m * (t - j)
        component_rank = rank - j
        if (
            j >= t
            or component_rank <= 0
            or n - component_rank < m - 1
        ):
            break
        ratio = (
            mp.mpf(t - j)
            / (j + 1)
            * mp.mpf(component_rank)
            / n
        )
        for offset in range(1, m):
            ratio *= mp.mpf(n - component_rank - offset + 1) / (
                n - offset
            )
        term *= ratio
        total += term
        if j > 20 and abs(term) < abs(total) * mp.mpf("1e-90"):
            break
    else:
        raise RuntimeError("summand loop did not converge")
    return total


def means(
    m: int, t: int, root_leaves: int = 2
) -> tuple[mp.mpf, mp.mpf]:
    """Return coefficient-distribution means of F and T."""
    n = m * t
    tiny = mp.power(2, -m)
    e_over_l = mp.exp(t * mp.log1p(tiny))
    mean_e = t * (mp.mpf(m) / 2 + tiny) / (1 + tiny)
    p0 = e_over_l + 1
    p1 = e_over_l * mean_e + (1 + mp.mpf(n) / 2)
    leaf_scale = mp.power(2, root_leaves)
    c0 = leaf_scale * p0
    c1 = leaf_scale * (
        p1 + mp.mpf(root_leaves) * p0 / 2
    )
    f0 = c0 + e_over_l
    f1 = c1 + e_over_l * (mean_e + 1)
    t0 = f0 + c0
    t1 = f1 + c0 + c1
    return f1 / f0, t1 / t0


def local_sequences(
    m: int,
    t: int,
    center: int,
    radius: int,
    root_leaves: int = 2,
) -> tuple[
    dict[int, mp.mpf],
    dict[int, mp.mpf],
    dict[int, mp.mpf],
]:
    n = m * t
    # The convolution by (1+x)^root_leaves needs this much extra
    # left-hand padding before the ranks inspected below.
    low = center - radius - root_leaves - 5
    high = center + radius + 5
    l: dict[int, mp.mpf] = {center: mp.mpf(1)}
    for rank in range(center, high):
        l[rank + 1] = l[rank] * mp.mpf(n - rank) / (rank + 1)
    for rank in range(center, low, -1):
        l[rank - 1] = l[rank] * mp.mpf(rank) / (n - rank + 1)
    e = {
        rank: l[rank] * e_over_binomial(m, t, rank)
        for rank in range(low, high + 1)
    }
    p = {
        rank: e[rank] + l[rank - 1]
        for rank in range(low + 1, high + 1)
    }
    leaf_coefficients = [
        mp.mpf(math.comb(root_leaves, offset))
        for offset in range(root_leaves + 1)
    ]
    c = {
        rank: sum(
            leaf_coefficients[offset] * p[rank - offset]
            for offset in range(root_leaves + 1)
        )
        for rank in range(
            low + root_leaves + 1,
            high + 1,
        )
    }
    c_low = low + root_leaves + 1
    f = {
        rank: c[rank] + e[rank - 1]
        for rank in range(c_low, high + 1)
    }
    terminal = {
        rank: f[rank] + c[rank - 1]
        for rank in range(c_low + 1, high + 1)
    }
    return f, terminal, c


def scan_point(
    m: int,
    lambda_numerator: int,
    lambda_denominator: int,
    radius: int,
    root_leaves: int = 2,
) -> dict:
    t = max(
        1,
        (lambda_numerator * 2**m) // lambda_denominator,
    )
    mean_f, mean_t = means(m, t, root_leaves)
    center = int(mp.floor(mean_f))
    f, terminal, c = local_sequences(
        m, t, center, radius, root_leaves
    )
    points = []
    failure = None
    closest = None
    for r in range(center - radius, center + radius + 1):
        f_drop = mp.mpf(r) * (
            1 - f[r] / f[r - 1]
        )
        t_drop = mp.mpf(r + 1) * (
            1 - terminal[r + 1] / terminal[r]
        )
        k = r + 1
        u = mp.mpf(r) * f[r] / f[r - 1]
        w = mp.mpf(k) * f[r + 1] / f[r]
        v = mp.mpf(k) * terminal[r + 1] / terminal[r]
        y = mp.mpf(k + 1) * terminal[r + 2] / terminal[r + 1]
        q_f = 1 + u - w
        q_t = 1 + v - y
        h = 2 * k * q_t - r * q_f
        x = u / r
        s = f[r] / terminal[r]
        theta = s / (x + s)
        epsilon = max(mp.mpf(0), w - v)
        zeta = max(mp.mpf(0), v - k * x)
        delta = max(mp.mpf(0), 1 - x - q_f)
        reserve_t = k - v + v * q_t
        reserve_f = r - u + u * q_f
        full_square_reserve = reserve_t - zeta**2
        theta_square_reserve = reserve_t - theta * zeta**2
        coupling = r * v - k * s * (r + 2)
        shifted_base = (
            k
            * (r + 2)
            * (u - r)
            * (1 / r + s / u)
            + zeta * (r + 2 + r**2 / u)
            - 2 * k * s * delta
        )
        square_paid_linear_cascade = (
            2 * k * (1 - theta) * reserve_t
            - coupling * reserve_f / u
            + shifted_base
        )
        ncl = (
            2 * k * reserve_t
            - coupling * reserve_f / u
            + shifted_base
            - 2 * k * theta * zeta**2
        )
        gbcl = v * h - 2 * k * (
            r * epsilon + zeta**2 + s * delta
        )
        scalar_base = (r + 4) * q_f + 2 * (x - 1)
        z = k * x - v
        j_over_k = (
            s * scalar_base
            + v * h / k
            - 2 * theta * z**2
        )
        # f_drop=r-u and t_drop=k-v have the desired coefficient signs.
        item = {
            "r": r,
            "r_minus_u": mp.nstr(f_drop, 30),
            "k_minus_v": mp.nstr(t_drop, 30),
            "DP_gap_Tdrop_minus_Fdrop": mp.nstr(
                t_drop - f_drop, 30
            ),
            "q_F": mp.nstr(q_f, 30),
            "q_T": mp.nstr(q_t, 30),
            "curvature_H": mp.nstr(h, 30),
            "epsilon": mp.nstr(epsilon, 30),
            "zeta": mp.nstr(zeta, 30),
            "delta": mp.nstr(delta, 30),
            "ISO_reserve_T": mp.nstr(reserve_t, 30),
            "ISO_reserve_F": mp.nstr(reserve_f, 30),
            "full_square_reserve_R_T_minus_zeta2": mp.nstr(
                full_square_reserve, 30
            ),
            "theta_square_reserve_R_T_minus_theta_zeta2": mp.nstr(
                theta_square_reserve, 30
            ),
            "shifted_base": mp.nstr(shifted_base, 30),
            "square_paid_linear_cascade_margin": mp.nstr(
                square_paid_linear_cascade, 30
            ),
            "NCL_margin_scalar": mp.nstr(ncl, 30),
            "GBCL_margin": mp.nstr(gbcl, 30),
            "C12_scalar_J_over_k": mp.nstr(j_over_k, 30),
        }
        points.append(item)
        if f_drop > 0:
            if closest is None or t_drop < mp.mpf(
                closest["k_minus_v"]
            ):
                closest = item
            if t_drop <= 0 and failure is None:
                failure = item
    return {
        "m": m,
        "lambda": [lambda_numerator, lambda_denominator],
        "t": t,
        "N": m * t,
        "root_leaves": root_leaves,
        "mean_F": mp.nstr(mean_f, 40),
        "mean_T": mp.nstr(mean_t, 40),
        "mean_shift_T_minus_F": mp.nstr(mean_t - mean_f, 30),
        "center": center,
        "failure": failure,
        "closest": closest,
        "points": points,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-m", type=int, default=20)
    parser.add_argument("--maximum-m", type=int, default=100)
    parser.add_argument("--lambda-start", type=int, default=50)
    parser.add_argument("--lambda-stop", type=int, default=300)
    parser.add_argument("--lambda-denominator", type=int, default=100)
    parser.add_argument("--radius", type=int, default=5)
    parser.add_argument("--root-leaves", type=int, default=2)
    parser.add_argument("--dps", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_fork_terminal_downward_float_20260729.json"),
    )
    args = parser.parse_args()
    mp.mp.dps = args.dps

    scanned = 0
    closest = None
    failure = None
    for m in range(args.minimum_m, args.maximum_m + 1):
        for numerator in range(args.lambda_start, args.lambda_stop + 1):
            point = scan_point(
                m,
                numerator,
                args.lambda_denominator,
                args.radius,
                args.root_leaves,
            )
            scanned += 1
            candidate = point["closest"]
            if candidate is not None:
                key = mp.mpf(candidate["k_minus_v"])
                if closest is None or key < closest[0]:
                    closest = (key, point)
            if point["failure"] is not None:
                failure = point
                break
        print(
            f"m={m}, scanned={scanned}, "
            f"best_T_drop={mp.nstr(closest[0], 12) if closest else None}",
            flush=True,
        )
        if failure is not None:
            break

    report = {
        "status": (
            "FLOAT_LOCATOR_FOUND_DP_FAILURE"
            if failure is not None
            else "NO_FAILURE_IN_FLOAT_GRID_NOT_PROOF"
        ),
        "precision_decimal_digits": args.dps,
        "points_scanned": scanned,
        "failure": failure,
        "closest": closest[1] if closest else None,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "points_scanned": scanned,
                "failure": failure,
                "closest": closest[1] if closest else None,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
