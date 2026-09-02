#!/usr/bin/env python3
"""Exact Delta1/Q7/lower-cross box using the sharp tree c3/c4 ratio.

The earlier y/r rectangle was unnecessarily loose because this Delta1 source
is independent of w=c2/c3.  Here x=c3/c4 is mapped directly through the sharp
tree interval

    4/(n-3) <= x <= 4(n-2)/((n-5)(n-6)),

while retaining the full U,K,V coordinates and the rooted attachment floor.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
import gc
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from certify_rank8_delta4_junction_coupled_box import to_flint
from split_bernstein_flint_matrix_root import (
    split_bernstein_midpoint_flint_matrix,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "rank8_delta1_q7_lcross_source_sparse_root_20260826.json"
CUTOFF = 60
OUTPUT = HERE / "rank8_delta1_q7_lcross_direct_x_attachment_floor_tail60_exact_root_20260826.json"
EXPECTED = {
    SOURCE.name: "A4E63AF3A071F222F5F1C581F7B52F3BD74623E74728A323C3FECFA4616F6D66",
    "extract_rank8_delta1_q7_lcross_source_sparse_root.py":
        "03F03231E6ED6614A889BA6D727900F13A3BEA839FEA7862FABAFF6E60CAC943",
    "probe_rank8_delta01_source_curvatures_root.py":
        "C67587B658BA75E9A2DF0E42631E03A8746DA4D86420729C40D28296FE6682FF",
    "verify_rank6_root_large_order_and_leaf_closure.py":
        "D3D436B49A448F5162FE4442070B1DE14ED77F0FDF5740E159558D10143CE7E0",
    "RANK6_ALL_ROOT_LARGE_ORDER_THEOREM_2026-07-28.md":
        "D8C7ED3694230097B4870B8949768C8B400FDEAB762BE82E44EA79CC1BEB664B",
    "rank8_q8_terminal_delta1_reduction_exact_20260820.json":
        "8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "certify_rank8_delta4_junction_coupled_box.py":
        "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
    "split_bernstein_flint_matrix_root.py":
        "A276B83467D10D6C050DF92324F482FCE84D3190598E5D04B6662F01A2C99053",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def minimum_with_index(values):
    index = min(range(values.size), key=lambda position: values.flat[position])
    return values.flat[index], tuple(
        int(value) for value in __import__("numpy").unravel_index(index, values.shape)
    )


def main() -> int:
    started = time.perf_counter()
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    assert source["status"] == "PASS_EXACT_RANK8_DELTA1_Q7_LCROSS_SOURCE_SPARSE"
    assert source["variables"] == ["n", "w", "x", "U", "K", "V", "Z"]
    assert source["numerator_degrees"] == [2, 0, 13, 13, 5, 9, 2]
    source_terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in source["numerator_terms"]
    ]
    assert len(source_terms) == 23_565
    assert all(monomial[1] == 0 for monomial, _ in source_terms)

    # x is mapped as the actual ratio c3/c4 and its numerator already contains
    # its factor t=1/n.  Only n**n_power introduces a Laurent power here.
    # Counting x_power again would multiply every x monomial by an erroneous
    # extra t**x_power.
    t_shift = max(
        max(n_power for (n_power, _, _, _, _, _, _), _ in source_terms),
        0,
    )
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, k_power, v_power, z_power = monomial
        assert w_power == 0
        key = (
            t_shift - n_power,
            x_power,
            u_power,
            k_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(6))
    x_degree = maxima[1]
    z_degree = maxima[5]
    assert maxima == (2, 13, 13, 5, 9, 2)

    T, Xc, Uc, Kc, Vc, Zc = sp.symbols(
        "T Xc Uc Kc Vc Zc", nonnegative=True
    )
    cube = (T, Xc, Uc, Kc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    t = T / CUTOFF

    # Keep the stronger lower bound supplied jointly by the existing y/r
    # inequalities, but replace their loose product upper endpoint by the
    # sharp path ratio.  Only the upper endpoint has a denominator.
    x_denominator = sp.expand((1 - 5 * t) * (1 - 6 * t))
    x_lower = sp.expand(t * (3 + 9 * t) * (sp.Rational(4, 3) + 2 * t / 3))
    x_lower_numerator = sp.expand(x_lower * x_denominator)
    x_upper_numerator = sp.expand(4 * t * (1 - 2 * t))
    x_numerator = sp.expand(
        x_lower_numerator + (x_upper_numerator - x_lower_numerator) * Xc
    )
    x_lower_replay = sp.factor(x_lower_numerator / x_denominator)
    x_upper = sp.factor(x_upper_numerator / x_denominator)
    n = sp.symbols("n", positive=True)
    assert sp.cancel(x_lower_replay - x_lower) == 0
    assert sp.cancel(
        x_upper.subs(T, CUTOFF / n) - 4 * (n - 2) / ((n - 5) * (n - 6))
    ) == 0
    x_width = -2 * t**2 * (90 * t**3 + 177 * t**2 - 14 * t - 11) / (
        (5 * t - 1) * (6 * t - 1)
    )
    assert sp.factor(x_upper - x_lower - x_width) == 0
    assert sp.factor(x_upper - x_lower).subs(T, 1) > 0

    floor_p = 1 - 19 * t
    floor_q = 7 * t
    floor_d = 1 - 12 * t
    z_numerator = sp.expand(floor_p + floor_q * Zc)
    assert sp.expand(floor_p + floor_q - floor_d) == 0
    k_map = 1 + 6 * Kc

    maps = [t, Uc, k_map, Vc]
    map_maxima = [maxima[0], maxima[2], maxima[3], maxima[4]]
    flint_maps = [to_flint(context, mapping, cube) for mapping in maps]
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(flint_maps, map_maxima, strict=True)
    ]
    x_num_flint = to_flint(context, x_numerator, cube)
    x_den_flint = to_flint(context, x_denominator, cube)
    z_num_flint = to_flint(context, z_numerator, cube)
    z_den_flint = to_flint(context, floor_d, cube)
    x_num_powers = [x_num_flint**power for power in range(x_degree + 1)]
    x_den_powers = [x_den_flint**power for power in range(x_degree + 1)]
    z_num_powers = [z_num_flint**power for power in range(z_degree + 1)]
    z_den_powers = [z_den_flint**power for power in range(z_degree + 1)]

    def mapped_terms():
        for key, coefficient in base_data.items():
            t_power, x_power, u_power, k_power, v_power, z_power = key
            coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
            term = context.constant(
                fmpq(int(coefficient_numerator), int(coefficient_denominator))
            )
            for axis, power in enumerate((t_power, u_power, k_power, v_power)):
                term *= powers[axis][power]
            term *= x_num_powers[x_power] * x_den_powers[x_degree - x_power]
            term *= z_num_powers[z_power] * z_den_powers[z_degree - z_power]
            yield term

    def progress(count: int, batches: int) -> None:
        if count == len(base_data) or count % 1024 == 0:
            print("MAP_PROGRESS", count, len(base_data), "BATCHES", batches, flush=True)

    mapped = balanced_batched_sum(mapped_terms(), batch_size=128, progress=progress)
    mapped_terms_list = list(mapped.terms())
    mapped_degrees = tuple(
        int(max((monomial[axis] for monomial, _ in mapped_terms_list), default=0))
        for axis in range(6)
    )
    coefficient_count = math.prod(degree + 1 for degree in mapped_degrees)
    print(
        "PREFLIGHT",
        json.dumps(
            {
                "mapped_terms": len(mapped_terms_list),
                "mapped_degrees": mapped_degrees,
                "bernstein_coefficients": coefficient_count,
                "elapsed_seconds": time.perf_counter() - started,
            },
            sort_keys=True,
        ),
        flush=True,
    )

    degrees, bernstein, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(cube), chunk_columns=2048
    )
    assert tuple(int(value) for value in degrees) == mapped_degrees
    assert replay_terms == len(mapped_terms_list)
    minimum, minimum_index = minimum_with_index(bernstein)
    negative = sum(bool(value < 0) for value in bernstein.flat)
    zero = sum(bool(value == 0) for value in bernstein.flat)
    positive = int(bernstein.size) - negative - zero
    subdivision = None
    if negative:
        for depth in range(1, 7):
            patch_minima = []
            failed = None
            for patch_index in range(1 << depth):
                patch = bernstein
                for level in range(depth):
                    left, right = split_bernstein_midpoint_flint_matrix(
                        patch, 0, chunk_columns=1024
                    )
                    if patch is not bernstein:
                        del patch
                    bit = (patch_index >> (depth - level - 1)) & 1
                    if bit:
                        patch = right
                        del left
                    else:
                        patch = left
                        del right
                    gc.collect()
                patch_minimum, patch_minimum_index = minimum_with_index(patch)
                patch_minima.append(str(patch_minimum))
                if patch_minimum < 0:
                    failed = {
                        "patch_index": patch_index,
                        "minimum": str(patch_minimum),
                        "minimum_index": list(patch_minimum_index),
                    }
                    del patch
                    gc.collect()
                    break
                del patch
                gc.collect()
            print(
                "T_SUBDIVISION",
                depth,
                "CHECKED",
                len(patch_minima),
                "FAILED",
                failed,
                flush=True,
            )
            if failed is None and len(patch_minima) == (1 << depth):
                subdivision = {
                    "axis": "T",
                    "uniform_dyadic_depth": depth,
                    "patches": 1 << depth,
                    "minimum_patch_coefficient": str(
                        min(sp.Rational(value) for value in patch_minima)
                    ),
                }
                break
    status = (
        "PASS_EXACT_DELTA1_Q7_LCROSS_DIRECT_X_ATTACHMENT_FLOOR_TAIL60"
        if negative == 0 or subdivision is not None
        else "DIRECT_X_ATTACHMENT_FLOOR_BOX_UNRESOLVED_MIXED_BERNSTEIN_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta1-q7-lcross-direct-x-attachment-floor-root-v1",
        "status": status,
        "scope_if_pass": (
            "Delta1 of the Q7-endpoint lower-cross rank-eight terminal residual "
            "for every rooted tree core of every finite integer order n>=60."
        ),
        "order_domain": "T=60/n on 0<=T<=1",
        "sharp_tree_x_interval": {
            "x": "c3/c4=i3/i4",
            "lower": "t*(3+9t)*(4/3+2t/3)",
            "upper": "4(n-2)/((n-5)(n-6))",
            "upper_equality": "paths only",
            "map": "x=(x_lower_numerator+(x_upper_numerator-x_lower_numerator)*Xc)/x_denominator",
        },
        "root_ratio_floor": "Z=(1-19t+7t*Zc)/(1-12t)",
        "rank6_defect_map": "K=1+6*Kc",
        "positive_multipliers": [
            f"t**{t_shift} for finite n",
            f"x_denominator**{x_degree}",
            f"(1-12t)**{z_degree}",
            source["positive_denominator_factor"],
        ],
        "source_terms": len(source_terms),
        "scaled_sparse_terms": len(base_data),
        "scaled_sparse_degrees": list(maxima),
        "mapped_terms": len(mapped_terms_list),
        "mapped_degrees": list(mapped_degrees),
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": list(minimum_index),
        "coefficient_sign_counts": {
            "negative": negative,
            "zero": zero,
            "positive": positive,
        },
        "T_axis_subdivision": subdivision,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A mixed Bernstein result is only an enclosure obstruction. Final "
            "assembly also requires a fresh independent sparse-source rebuild."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SIGNS", negative, zero, positive)
    print("MINIMUM", minimum, minimum_index)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0 if negative == 0 or subdivision is not None else 2


if __name__ == "__main__":
    raise SystemExit(main())
