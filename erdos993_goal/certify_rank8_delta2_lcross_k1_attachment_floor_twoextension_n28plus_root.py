#!/usr/bin/env python3
"""Exact Delta2 k=1/lower-cross tensor using the forest two-extension cap."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import minimum_with_index, to_flint
from probe_rank8_delta2_source_curvatures import build
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta2_lcross_k1_attachment_floor_twoextension_"
    "n28plus_exact_root_20260826.json"
)
CUTOFF = 28
D4_CONSTANT_CEILING = sp.Rational(1559, 3575)
PINNED = {
    "certify_rank8_delta4_junction_coupled_box.py":
        "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
    "probe_rank8_delta2_source_curvatures.py":
        "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "verify_rank8_q8_terminal_delta2_reduction.py":
        "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "audit_rank8_root_deletion_attachment_floor_root.py":
        "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "verify_rank8_n28_tight_coordinate_chords_root.py":
        "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json":
        "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
    "verify_forest_rank345_defect_ceiling.py":
        "B2AAF96271AE47FA606E35F56D8C3841977F35347C691594CCADBA72B747C59B",
    "FOREST_RANK345_DEFECT_CEILING_2026-07-28.md":
        "ACA8EDFD30E249FB46155237EE49CD21695E4A1459E8D494176D3F000768E085",
    "replay_rank5_component_pgc_payment.py":
        "4024FE1638D6596EDC2E3E8D60A20DA65C333A61AD67961C4821B7262AA9E99D",
    "rank5_component_pgc_payment_exact_20260813.json":
        "286BD3AAE113FCFB6C589BD878E6C5910EB94277BC5D25F2AC51AF2BCFB6D40E",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    started = time.perf_counter()
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)

    value, (n, w, x, U, V, Z) = build(1, "lcross")
    numerator, denominator = sp.fraction(sp.cancel(value))
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, Z, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(
        max(
            n_power - w_power - x_power
            for (n_power, w_power, x_power, _, _, _), _ in source_terms
        ),
        0,
    )
    base_data: dict[tuple[int, ...], sp.Expr] = {}
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
    u_degree = maxima[3]
    z_degree = maxima[5]
    assert u_degree == 12 and z_degree <= 2

    T, W, A, J, Vc, Zc = sp.symbols("T W A J Vc Zc", nonnegative=True)
    cube = (T, W, A, J, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    t_map = T / CUTOFF
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
    x_map = sp.expand(t_map * y_map * r_map)

    # The source uses U normalized to the older constant defect ceiling.
    # The forest two-extension inequality gives the sharper exact cap
    # d4 <= (1+3x)/5.  Reparameterize that smaller interval by J.
    d4_low = (2 + x_map) / 10
    d4_high = (1 + 3 * x_map) / 5
    u_denominator = sp.expand(D4_CONSTANT_CEILING - d4_low)
    u_numerator = sp.expand((d4_high - d4_low) * J)
    assert sp.factor(d4_high - d4_low) == x_map / 2

    # The n>=28 chord has x<=36/173<844/2145, so the variable cap is
    # strictly below the old constant ceiling and u_denominator is positive.
    x_corner = sp.factor(x_map.subs({T: 1, W: 1, A: 1}))
    assert x_corner == sp.Rational(36, 173)
    assert x_corner < sp.Rational(844, 2145)
    assert sp.factor(
        D4_CONSTANT_CEILING - (1 + 3 * x_corner) / 5
    ) > 0

    basic_maps = [t_map, y_map, r_map, Vc]
    basic_flint = [to_flint(context, mapping, cube) for mapping in basic_maps]
    power_maxima = [maxima[0], maxima[1], maxima[2], maxima[4]]
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(basic_flint, power_maxima, strict=True)
    ]
    u_den_flint = to_flint(context, u_denominator, cube)
    u_num_flint = to_flint(context, u_numerator, cube)
    u_den_powers = [u_den_flint**power for power in range(u_degree + 1)]
    u_num_powers = [u_num_flint**power for power in range(u_degree + 1)]
    z_den_flint = to_flint(context, d, cube)
    z_num_flint = to_flint(context, z_numerator, cube)
    z_den_powers = [z_den_flint**power for power in range(z_degree + 1)]
    z_num_powers = [z_num_flint**power for power in range(z_degree + 1)]

    mapped = context.constant(0)
    for monomial, coefficient in base_data.items():
        coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
        term = context.constant(
            fmpq(int(coefficient_numerator), int(coefficient_denominator))
        )
        t_power, y_power, r_power, u_power, v_power, z_power = monomial
        for axis, power in enumerate((t_power, y_power, r_power, v_power)):
            term *= powers[axis][power]
        term *= u_num_powers[u_power] * u_den_powers[u_degree - u_power]
        term *= z_num_powers[z_power] * z_den_powers[z_degree - z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(cube), chunk_columns=4096
    )
    minimum, index = minimum_with_index(bernstein)
    negative_count = sum(bool(coefficient < 0) for coefficient in bernstein.flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in bernstein.flat)
    positive_count = int(bernstein.size) - negative_count - zero_count
    status = (
        "PASS_EXACT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TWOEXTENSION_N28PLUS"
        if negative_count == 0
        else "TWOEXTENSION_ATTACHMENT_FLOOR_BOX_UNRESOLVED"
    )
    payload = {
        "schema": "rank8-delta2-lcross-k1-attachment-floor-twoextension-n28plus-v1",
        "status": status,
        "scope": (
            "Exact Delta2 sign on the k=1 lower-cross reduced live path for "
            "every finite integer n>=28 if PASS."
        ),
        "Delta": 2,
        "D6_k": 1,
        "capacity_piece": "lcross",
        "order_domain": "single compactified n>=28 domain",
        "order_scope": "every finite integer n>=28; T=0 is the audited limit boundary",
        "positive_multipliers": [
            f"t**{t_shift} (positive for finite n)",
            f"old_U_denominator**{u_degree}",
            f"attachment_floor_denominator**{z_degree}",
        ],
        "two_extension_reparameterization": {
            "old_constant_ceiling": str(D4_CONSTANT_CEILING),
            "d4_low": str(sp.factor(d4_low)),
            "d4_high": str(sp.factor(d4_high)),
            "old_U": "((d4_high-d4_low)*J)/(old_constant_ceiling-d4_low)",
            "J_domain": "0<=J<=1",
            "x_n28_upper_corner": str(x_corner),
            "constant_ceiling_crossover": "844/2145",
        },
        "root_ratio_floor": {
            "p": str(sp.factor(p)), "q": str(sp.factor(q)), "d": str(sp.factor(d)),
            "substitution": "Z=(p+q*Zc)/d, 0<=Zc<=1",
            "n28_floor": "9/16",
        },
        "coupled_enlarged_box": {
            "t": str(t_map),
            "y": "[3+9t, 3+(546/25)t]",
            "r": "[4/3+2t/3, 4/3+(1008/173)t]",
            "J_V_Zc": "[0,1]^3",
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
            "negative": negative_count, "zero": zero_count, "positive": positive_count,
        },
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "An unresolved Bernstein box is not a tree counterexample. A PASS "
            "is path/rank scoped until assembled with the other three tensors."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print("MAPPED", degrees, bernstein.size, minimum, index, flush=True)
    print(status, flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0 if negative_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
