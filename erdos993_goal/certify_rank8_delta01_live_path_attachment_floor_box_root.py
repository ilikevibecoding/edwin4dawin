#!/usr/bin/env python3
"""Exact all-order Delta0/Delta1 live-path boxes with the attachment floor.

This is the direct analogue of the completed Delta2/Delta3 attachment-floor
certificate, with the rank-six defect coordinate K retained on its full
interval.  One invocation handles one Newton rank, one c8 endpoint, and one
live root-capacity path.  ``--map-only`` stops after exact sparse cube mapping
so the dense Bernstein workload can be inspected fail-closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from certify_rank8_delta4_junction_coupled_box import to_flint
from probe_rank8_delta01_source_curvatures_root import build
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
EXPECTED_INPUTS = {
    "certify_rank8_delta4_junction_coupled_box.py":
        "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
    "probe_rank8_delta01_source_curvatures_root.py":
        "C67587B658BA75E9A2DF0E42631E03A8746DA4D86420729C40D28296FE6682FF",
    "verify_rank7_terminal_broom_middle_differences.py":
        "805CDE618B12FEBB51E3F6AB29E1A9174F170C9108EDF5CD65333907A14781D2",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_q8_terminal_delta0_reduction_exact_20260820.json":
        "B3D1373A0DF158E55FABDD87A3C9033A745E5079D7AB813604CEBE1D5CC5B51C",
    "rank8_q8_terminal_delta1_reduction_exact_20260820.json":
        "8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json":
        "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def minimum_with_index(values):
    index = min(range(values.size), key=lambda position: values.flat[position])
    return values.flat[index], tuple(int(x) for x in __import__("numpy").unravel_index(index, values.shape))


def main() -> int:
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument("--delta", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c8", choices=("zero", "q7"), required=True)
    parser.add_argument("--piece", choices=("lcross", "ucap"), required=True)
    parser.add_argument("--map-only", action="store_true")
    parser.add_argument("--chunk-columns", type=int, default=2048)
    args = parser.parse_args()

    immutable_inputs = {name: sha256(HERE / name) for name in EXPECTED_INPUTS}
    require(immutable_inputs == EXPECTED_INPUTS, "immutable input hash mismatch")
    d0 = json.loads((HERE / "rank8_q8_terminal_delta0_reduction_exact_20260820.json").read_text())
    d1 = json.loads((HERE / "rank8_q8_terminal_delta1_reduction_exact_20260820.json").read_text())
    floor = json.loads((HERE / "rank8_root_deletion_attachment_floor_exact_root_20260825.json").read_text())
    floor_audit = json.loads((HERE / "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json").read_text())
    chords = json.loads((HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json").read_text())
    require(d0["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_REDUCTION_FOUR_LIVE_TENSORS", "Delta0 reduction")
    require(d1["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA1_REDUCTION_FOUR_LIVE_TENSORS", "Delta1 reduction")
    require("PASS" in floor["status"] and "PASS" in floor_audit["status"], "attachment floor")
    require("PASS" in chords["status"], "coordinate chords")

    value, (n, w, x, U, K, V, Z) = build(args.delta, args.c8, args.piece)
    # ``build`` returns an already canceled rational expression.  Repeating
    # ``cancel`` here costs several minutes on the largest Delta1/Q7 case and
    # cannot change the numerator or denominator.
    numerator, denominator = sp.fraction(value)
    source = sp.Poly(sp.expand(numerator), n, w, x, U, K, V, Z, domain=sp.QQ)
    source_terms = source.terms()

    # n=1/t, w=t*y, x=t*y*r.  Multiply by the least nonnegative power
    # of t that makes every source monomial polynomial in t,y,r.
    t_shift = max(
        n_power - w_power - x_power
        for (n_power, w_power, x_power, _, _, _, _), _ in source_terms
    )
    t_shift = max(t_shift, 0)
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, k_power, v_power, z_power = monomial
        key = (
            t_shift + w_power + x_power - n_power,
            w_power + x_power,
            x_power,
            u_power,
            k_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(7))
    z_degree = maxima[6]
    require(z_degree <= 3, "unexpected root-coordinate degree")

    T, W, A, Uc, Kc, Vc, Zc = sp.symbols("T W A Uc Kc Vc Zc", nonnegative=True)
    cube = (T, W, A, Uc, Kc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])

    t_map = T / 28
    floor_p = 1 - 19 * t_map
    floor_q = 7 * t_map
    floor_d = 1 - 12 * t_map
    require(sp.expand(floor_p + floor_q - floor_d) == 0, "floor partition")
    z_numerator = sp.expand(floor_p + floor_q * Zc)
    y_lower = 3 + 9 * t_map
    y_upper = 3 + sp.Rational(546, 25) * t_map
    y_map = y_lower + (y_upper - y_lower) * W
    r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t_map
    r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map
    r_map = r_lower + (r_upper - r_lower) * A
    k_map = 1 + 6 * Kc

    basic_maps = [
        to_flint(context, t_map, cube),
        to_flint(context, y_map, cube),
        to_flint(context, r_map, cube),
        to_flint(context, Uc, cube),
        to_flint(context, k_map, cube),
        to_flint(context, Vc, cube),
    ]
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(basic_maps, maxima[:6])
    ]
    d_flint = to_flint(context, floor_d, cube)
    z_flint = to_flint(context, z_numerator, cube)
    d_powers = [d_flint**power for power in range(z_degree + 1)]
    z_powers = [z_flint**power for power in range(z_degree + 1)]

    def mapped_source_terms():
        for monomial, coefficient in base_data.items():
            coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
            term = context.constant(
                fmpq(int(coefficient_numerator), int(coefficient_denominator))
            )
            for axis, power in enumerate(monomial[:6]):
                term *= powers[axis][power]
            z_power = monomial[6]
            term *= z_powers[z_power] * d_powers[z_degree - z_power]
            yield term

    def map_progress(count: int, batches: int) -> None:
        if count == len(base_data) or count % 1024 == 0:
            print("MAP_PROGRESS", count, len(base_data), "BATCHES", batches, flush=True)

    mapped = balanced_batched_sum(
        mapped_source_terms(), batch_size=128, progress=map_progress
    )

    mapped_terms = list(mapped.terms())
    mapped_degrees = tuple(
        int(max((monomial[axis] for monomial, _ in mapped_terms), default=0))
        for axis in range(7)
    )
    coefficient_count = math.prod(degree + 1 for degree in mapped_degrees)
    preflight = {
        "source_terms": len(source_terms),
        "source_degrees": list(source.degree_list()),
        "scaled_sparse_terms": len(base_data),
        "scaled_sparse_degrees": list(maxima),
        "mapped_terms": len(mapped_terms),
        "mapped_degrees": list(mapped_degrees),
        "bernstein_coefficients": coefficient_count,
        "elapsed_seconds": time.perf_counter() - started,
    }
    print("PREFLIGHT", json.dumps(preflight, sort_keys=True), flush=True)
    if args.map_only:
        return 0

    degrees, bernstein, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, 7, chunk_columns=args.chunk_columns
    )
    require(tuple(degrees) == mapped_degrees, "mapped degree replay")
    require(replay_terms == len(mapped_terms), "mapped term replay")
    minimum, minimum_index = minimum_with_index(bernstein)
    negative = sum(bool(value < 0) for value in bernstein.flat)
    zero = sum(bool(value == 0) for value in bernstein.flat)
    positive = int(bernstein.size) - negative - zero
    status = (
        f"PASS_EXACT_DELTA{args.delta}_{args.c8.upper()}_{args.piece.upper()}_ATTACHMENT_FLOOR_N28_PLUS"
        if negative == 0
        else "ATTACHMENT_FLOOR_BOX_UNRESOLVED_MIXED_BERNSTEIN_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta01-live-path-attachment-floor-box-root-v1",
        "status": status,
        "Delta": args.delta,
        "c8_endpoint": args.c8,
        "capacity_piece": args.piece,
        "scope_if_pass": (
            f"Delta{args.delta} of the rank-eight terminal residual on this exact "
            "c8 endpoint and live root path for every rooted tree of order n>=28."
        ),
        "order_domain": "single compactified n>=28 domain, T=28/n",
        "root_ratio_floor": "Z=h7/c7>=(n-19)/(n-12), mapped by Z=(1-19t+7t*Zc)/(1-12t)",
        "rank6_defect_map": "K=1+6*Kc",
        "tight_coordinate_maps": {
            "y": "[3+9t, 3+(546/25)t]",
            "r": "[4/3+2t/3, 4/3+(1008/173)t]",
            "U_Kc_V_Zc": "[0,1]^4",
        },
        "positive_multipliers": [
            f"t**{t_shift} for every finite n",
            f"(1-12t)**{z_degree}",
            str(sp.factor(denominator)),
        ],
        "preflight": preflight,
        "minimum": str(minimum),
        "minimum_index": list(minimum_index),
        "coefficient_sign_counts": {"negative": negative, "zero": zero, "positive": positive},
        "immutable_inputs": immutable_inputs,
        "source_sha256": sha256(Path(__file__)),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "scope_warning": (
            "A mixed Bernstein result is only an enclosure obstruction, not a tree "
            "counterexample. All eight endpoint/path reports and an independent "
            "mapping audit are required for a complete Delta0/Delta1 assembly."
        ),
    }
    output = HERE / (
        f"rank8_delta{args.delta}_{args.c8}_{args.piece}_attachment_floor_n28plus_"
        "exact_root_20260826.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SIGNS", negative, zero, positive)
    print("MINIMUM", minimum, minimum_index)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))
    return 0 if negative == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
