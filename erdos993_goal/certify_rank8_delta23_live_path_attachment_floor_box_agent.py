#!/usr/bin/env python3
"""Exact Delta2/Delta3 live-path boxes with the attachment-incidence floor.

For every rooted tree of order n>=28, the rank-seven deletion ratio satisfies

    Z = i7(T-q)/i7(T) >= (n-19)/(n-12).

Writing t=1/n gives the single compactified domain t=T/28, 0<=T<=1,
and the exact substitution

    Z = (p+q*Zc)/d,
    p=1-19t, q=7t, d=1-12t=p+q, 0<=Zc<=1.

Each run covers one Newton rank, one rank-six endpoint, and one of the two
live root-capacity paths.  A negative Bernstein coefficient is only an
enclosure obstruction.  This source is prepared but is not self-launching.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import (
    minimum_with_index,
    tensor_bernstein_from_flint,
    to_flint,
)
from probe_rank8_delta2_source_curvatures import build as build_delta2
from probe_rank8_delta3_source_curvatures import build as build_delta3


HERE = Path(__file__).resolve().parent
EXPECTED_INPUTS = {
    "certify_rank8_delta4_junction_coupled_box.py": "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
    "verify_rank7_terminal_broom_middle_differences.py": "805CDE618B12FEBB51E3F6AB29E1A9174F170C9108EDF5CD65333907A14781D2",
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta2_source_curvatures.py": "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "verify_rank8_q8_terminal_delta2_reduction.py": "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json": "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "probe_rank8_delta3_source_curvatures.py": "1AAA5FA9EC12DAEF27791DCCADC80F91C2D93B649CF2898C01FABF356775F122",
    "verify_rank8_q8_terminal_delta3_reduction.py": "E69B4E8E4D19D1C5AFCC966EE81476583CBA7C9DC86F5E1489FE09169F5AC0A0",
    "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json": "EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26",
    "verify_rank8_root_deletion_attachment_floor_root.py": "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json": "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "audit_rank8_root_deletion_attachment_floor_root.py": "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json": "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "verify_rank8_n28_tight_coordinate_chords_root.py": "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json": "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument("--delta", type=int, choices=(2, 3), required=True)
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("lcross", "ucap"), required=True)
    args = parser.parse_args()

    immutable_inputs = {name: sha256(HERE / name) for name in EXPECTED_INPUTS}
    assert immutable_inputs == EXPECTED_INPUTS
    builder = build_delta2 if args.delta == 2 else build_delta3
    value, (n, w, x, U, V, Z) = builder(args.k, args.piece)
    numerator, denominator = sp.fraction(sp.cancel(value))
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, Z, domain=sp.QQ)
    source_terms = source.terms()

    # Substitute n=1/t, w=t*y, x=t*y*r and clear the least nonnegative
    # power of t needed to obtain a polynomial in (t,y,r,U,V,Z).
    t_shift = max(
        n_power - w_power - x_power
        for (n_power, w_power, x_power, _, _, _), _ in source_terms
    )
    t_shift = max(t_shift, 0)
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        key = (
            t_shift + w_power + x_power - n_power,
            w_power + x_power,
            x_power,
            u_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(6))
    z_degree = maxima[5]
    assert z_degree <= 2

    T, W, A, Uc, Vc, Zc = sp.symbols("T W A Uc Vc Zc", nonnegative=True)
    cube = (T, W, A, Uc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])

    # Single domain: T=0 is the compactified n=infinity boundary and T=1 is
    # n=28.  Every finite integer n>=28 is included at T=28/n.
    t_map = T / 28
    p = 1 - 19 * t_map
    q = 7 * t_map
    d = 1 - 12 * t_map
    assert sp.expand(p + q - d) == 0
    z_numerator = sp.expand(p + q * Zc)

    y_lower = 3 + 9 * t_map
    y_upper = 3 + sp.Rational(546, 25) * t_map
    y_map = y_lower + (y_upper - y_lower) * W
    r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t_map
    r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map
    r_map = r_lower + (r_upper - r_lower) * A

    basic_maps = [
        to_flint(context, t_map, cube),
        to_flint(context, y_map, cube),
        to_flint(context, r_map, cube),
        to_flint(context, Uc, cube),
        to_flint(context, Vc, cube),
    ]
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(basic_maps, maxima[:5])
    ]
    d_flint = to_flint(context, d, cube)
    z_numerator_flint = to_flint(context, z_numerator, cube)
    d_powers = [d_flint**power for power in range(z_degree + 1)]
    z_powers = [z_numerator_flint**power for power in range(z_degree + 1)]

    mapped = context.constant(0)
    for monomial, coefficient in base_data.items():
        coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
        term = context.constant(
            fmpq(int(coefficient_numerator), int(coefficient_denominator))
        )
        for axis, power in enumerate(monomial[:5]):
            term *= powers[axis][power]
        z_power = monomial[5]
        term *= z_powers[z_power] * d_powers[z_degree - z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint(mapped, len(cube))
    minimum, index = minimum_with_index(bernstein)
    negative_count = sum(bool(coefficient < 0) for coefficient in bernstein.flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in bernstein.flat)
    positive_count = int(bernstein.size) - negative_count - zero_count
    status = (
        f"PASS_EXACT_DELTA{args.delta}_LIVE_PATH_WITH_ATTACHMENT_FLOOR"
        if negative_count == 0
        else "ATTACHMENT_FLOOR_BOX_UNRESOLVED"
    )
    elapsed = time.perf_counter() - started
    print("MAPPED", degrees, bernstein.size, minimum, index, flush=True)

    payload = {
        "schema": f"rank8-delta{args.delta}-live-path-attachment-floor-box-agent-v1",
        "status": status,
        "scope": (
            f"Exact Delta{args.delta} sign on the named reduced live root-capacity "
            "path and rank-six endpoint for every integer n>=28 if PASS."
        ),
        "Delta": args.delta,
        "D6_k": args.k,
        "capacity_piece": args.piece,
        "order_domain": "single compactified n>=28 domain",
        "order_scope": "every finite integer n>=28; T=0 is the audited limit boundary",
        "positive_multipliers": [
            f"t**{t_shift} (positive for every finite n)",
            f"root_floor_denominator**{z_degree}",
        ],
        "root_ratio_floor": {
            "name": "attachment_incidence",
            "p": str(sp.factor(p)),
            "q": str(sp.factor(q)),
            "d": str(sp.factor(d)),
            "substitution": "Z=(p+q*Zc)/d, 0<=Zc<=1",
            "coordinate_identity": "Z=h7/c7 on lcross and ucap",
        },
        "coupled_enlarged_box": {
            "t": str(t_map),
            "y": "[3+9t, 3+(546/25)t]",
            "r": "[4/3+2t/3, 4/3+(1008/173)t]",
            "U_V_Zc": "[0,1]^3",
        },
        "source_denominator_factor": str(sp.factor(denominator)),
        "source_numerator_terms": len(source_terms),
        "scaled_sparse_terms": len(base_data),
        "scaled_sparse_degrees": [int(entry) for entry in maxima],
        "mapped_numerator_terms": int(mapped_terms),
        "mapped_degrees": [int(entry) for entry in degrees],
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": [int(entry) for entry in index],
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": positive_count,
        },
        "resources": {"elapsed_seconds": elapsed},
        "immutable_inputs": immutable_inputs,
        "endpoint_coverage": {
            "h7_zero_faces": "excluded for n>=28 by the strict attachment floor",
            "full_root": "included at lcross Zc=1",
            "upper_junction": "included at ucap Zc=1",
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "An unresolved Bernstein box is not a tree counterexample. Each PASS "
            "covers only one Delta rank, one live path, and one k endpoint; all "
            "four named reports and an independent mapping audit are required for "
            "a rank-level assembly."
        ),
    }
    output = HERE / (
        f"rank8_delta{args.delta}_{args.piece}_k{args.k}_attachment_floor_"
        "n28plus_exact_agent_20260825.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))
    return 0 if negative_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
