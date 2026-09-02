#!/usr/bin/env python3
"""Independent no-import audit of the Delta0/Delta1 attachment-floor map.

This audit deliberately does not import the tensor producer, its source
builder, or either polynomial helper.  It pins their bytes, checks the
producer's fail-closed manifest, rebuilds every domain substitution from
scratch, and binds the formulas back to the source text.  It does not claim
the eight tensor signs; those remain report-scoped until final assembly.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE_NAME = "certify_rank8_delta01_live_path_attachment_floor_box_root.py"
OUTPUT = (
    HERE
    / "rank8_delta01_live_path_attachment_floor_box_mappings_independent_audit_root_20260826.json"
)
EXPECTED = {
    SOURCE_NAME: "D426F1662E5DF3FF74501E2C40380BFF95DFAD6DF56231FBCAD8EAD6FEB67230",
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
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
}
AUDIT_ONLY_INPUTS = {
    "verify_rank8_root_deletion_attachment_floor_root.py",
    "audit_rank8_root_deletion_attachment_floor_root.py",
    "verify_rank8_n28_tight_coordinate_chords_root.py",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_assignment(tree: ast.Module, name: str):
    for statement in tree.body:
        if isinstance(statement, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == name
            for target in statement.targets
        ):
            return ast.literal_eval(statement.value)
    raise AssertionError(f"missing assignment {name}")


def bernstein_coefficients(poly: sp.Expr, variable: sp.Symbol) -> list[sp.Rational]:
    power = sp.Poly(sp.expand(poly), variable, domain=sp.QQ)
    degree = power.degree()
    coefficients = [power.nth(k) for k in range(degree + 1)]
    return [
        sp.factor(
            sum(
                coefficients[k]
                * sp.Rational(math.comb(index, k), math.comb(degree, k))
                for k in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    source_text = (HERE / SOURCE_NAME).read_text(encoding="utf-8")
    source_ast = ast.parse(source_text, filename=SOURCE_NAME)
    embedded_inputs = literal_assignment(source_ast, "EXPECTED_INPUTS")
    assert embedded_inputs == {
        name: digest
        for name, digest in EXPECTED.items()
        if name != SOURCE_NAME and name not in AUDIT_ONLY_INPUTS
    }

    delta0 = json.loads(
        (HERE / "rank8_q8_terminal_delta0_reduction_exact_20260820.json").read_text()
    )
    delta1 = json.loads(
        (HERE / "rank8_q8_terminal_delta1_reduction_exact_20260820.json").read_text()
    )
    floor = json.loads(
        (HERE / "rank8_root_deletion_attachment_floor_exact_root_20260825.json").read_text()
    )
    floor_audit = json.loads(
        (HERE / "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json").read_text()
    )
    chords = json.loads(
        (HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json").read_text()
    )
    assert delta0["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_REDUCTION_FOUR_LIVE_TENSORS"
    assert delta1["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA1_REDUCTION_FOUR_LIVE_TENSORS"
    for reduction in (delta0, delta1):
        assert reduction["remaining_exact_analytic_tensors"] == 4
        assert reduction["c8_endpoints"] == [
            "0",
            "c7*(-c6 + 14*c7)/(16*c6)",
        ]
        assert reduction["collapsed_root_paths_at_both_c8_endpoints"] == [
            "lower-zero",
            "full-root",
        ]
        assert reduction["live_root_paths_at_both_c8_endpoints"] == [
            "lower-cross",
            "upper-capacity",
        ]
        assert "1<=K<=7" == reduction["rank6_D5_link"]["K_interval"]
    assert floor["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert chords["status"] == "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS"

    # Rebuild the two live capacity paths independently.  In each case the
    # producer's Z is exactly h7/c7, so one floor substitution covers both.
    a, q, c6, Z = sp.symbols("a q c6 Z", positive=True)
    c7 = a * q * c6 / 6
    lower_cross_h7 = c7 * Z
    upper_capacity_S = 7 * q * Z / 6
    upper_capacity_h7 = a * upper_capacity_S * c6 / 7
    path_ratios = {
        "lower-cross": sp.cancel(lower_cross_h7 / c7),
        "upper-capacity": sp.cancel(upper_capacity_h7 / c7),
    }
    assert path_ratios == {"lower-cross": Z, "upper-capacity": Z}
    c8_endpoints = {
        "zero": sp.S.Zero,
        "q7": sp.factor(c7 * (14 * c7 - c6) / (16 * c6)),
    }

    # Rebuild the single compactified n>=28 domain and all cube chords.
    T, W, A, Uc, Kc, Vc, Zc = sp.symbols(
        "T W A Uc Kc Vc Zc", nonnegative=True
    )
    t = T / 28
    p = 1 - 19 * t
    q_floor = 7 * t
    d = 1 - 12 * t
    z_map = (p + q_floor * Zc) / d
    y_lower = 3 + 9 * t
    y_upper = 3 + sp.Rational(546, 25) * t
    y_map = y_lower + (y_upper - y_lower) * W
    r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t
    r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t
    r_map = r_lower + (r_upper - r_lower) * A
    k_map = 1 + 6 * Kc

    n = sp.symbols("n", positive=True)
    floor_formula = (n - 19) / (n - 12)
    assert sp.expand(p + q_floor - d) == 0
    assert sp.cancel(floor_formula.subs(n, 1 / t) - p / d) == 0
    assert sp.cancel(z_map.subs(Zc, 0) - p / d) == 0
    assert sp.cancel(z_map.subs(Zc, 1) - 1) == 0
    assert sp.factor((p / d).subs(T, 1)) == sp.Rational(9, 16)
    assert sp.limit(p / d, T, 0, dir="+") == 1
    assert sp.factor(y_upper - y_lower) == sp.Rational(321, 25) * t
    assert sp.factor(r_upper - r_lower) == sp.Rational(2678, 519) * t
    assert k_map.subs(Kc, 0) == 1 and k_map.subs(Kc, 1) == 7

    scalar_bernstein = {
        label: bernstein_coefficients(expression, T)
        for label, expression in {"p": p, "q": q_floor, "d": d}.items()
    }
    assert scalar_bernstein == {
        "p": [sp.S.One, sp.Rational(9, 28)],
        "q": [sp.S.Zero, sp.Rational(1, 4)],
        "d": [sp.S.One, sp.Rational(4, 7)],
    }
    assert all(value > 0 for value in scalar_bernstein["p"])
    assert all(value >= 0 for value in scalar_bernstein["q"])
    assert all(value > 0 for value in scalar_bernstein["d"])

    source_fragments = (
        'choices=(0, 1)',
        'choices=("zero", "q7")',
        'choices=("lcross", "ucap")',
        "immutable_inputs = {name: sha256(HERE / name) for name in EXPECTED_INPUTS}",
        'require(immutable_inputs == EXPECTED_INPUTS, "immutable input hash mismatch")',
        "t_map = T / 28",
        "floor_p = 1 - 19 * t_map",
        "floor_q = 7 * t_map",
        "floor_d = 1 - 12 * t_map",
        "z_numerator = sp.expand(floor_p + floor_q * Zc)",
        "y_lower = 3 + 9 * t_map",
        "y_upper = 3 + sp.Rational(546, 25) * t_map",
        "r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t_map",
        "r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map",
        "k_map = 1 + 6 * Kc",
        "term *= z_powers[z_power] * d_powers[z_degree - z_power]",
    )
    assert all(fragment in source_text for fragment in source_fragments)
    assert 'parser.add_argument("--domain"' not in source_text

    builder_text = (
        HERE / "probe_rank8_delta01_source_curvatures_root.py"
    ).read_text(encoding="utf-8")
    builder_fragments = (
        'if c8_endpoint == "zero":',
        "c8 = sp.S.Zero",
        "c8 = sp.factor(c7 * (14 * c7 - c6) / (16 * c6))",
        'if piece == "lcross":',
        "S = 1 - q + q * Z",
        "h7 = c7 * Z",
        'elif piece == "ucap":',
        "S = 7 * q * Z / 6",
        "h7 = a * S * c6 / 7",
        "c7 = sp.factor(a * q * c6 / 6)",
        "q_low = sp.factor((30 / x5 - 18 - 3 * K) / (7 * a))",
        "q = sp.factor(q_low + 15 * V / (7 * a))",
    )
    assert all(fragment in builder_text for fragment in builder_fragments)

    helper_text = (
        HERE / "certify_rank8_delta4_junction_coupled_box.py"
    ).read_text(encoding="utf-8")
    assert "def to_flint(context, expression, variables):" in helper_text
    assert "return context.from_dict(data)" in helper_text
    assert chords["bounds"] == {
        "y": "y<=3+(546/25)t",
        "r": "r<=4/3+(1008/173)t",
    }

    payload = {
        "schema": "rank8-delta01-live-path-attachment-floor-box-mappings-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA01_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT",
        "method": (
            "No producer imports; immutable-byte audit plus independent exact "
            "reconstruction of endpoints, capacity paths, floor, chords, and K map."
        ),
        "single_domain": {
            "order_scope": "all finite integer n>=28, with T=0 the compactified limit",
            "t": str(t),
            "floor_map": str(sp.factor(z_map)),
            "floor_range": ["9/16 at n=28", "limit 1 as n tends to infinity"],
            "y_map": str(sp.factor(y_map)),
            "r_map": str(sp.factor(r_map)),
            "K_map": str(k_map),
            "positive_denominator_bernstein": [
                str(value) for value in scalar_bernstein["d"]
            ],
        },
        "capacity_path_ratios": {key: str(value) for key, value in path_ratios.items()},
        "c8_endpoints": {key: str(value) for key, value in c8_endpoints.items()},
        "coordinate_chords": chords["bounds"],
        "source_binding_fragments": list(source_fragments),
        "builder_binding_fragments": list(builder_fragments),
        "embedded_manifest_matches": True,
        "immutable_inputs": actual,
        "finalization_boundary": (
            "All eight Delta/path/endpoint sign reports plus this mapping audit, "
            "the floor audit, and an independent report assembler are required."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
