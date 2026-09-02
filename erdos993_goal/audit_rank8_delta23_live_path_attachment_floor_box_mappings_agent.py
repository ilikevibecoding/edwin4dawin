#!/usr/bin/env python3
"""No-import mapping audit for the dormant Delta2/Delta3 attachment boxes.

The audit does not import either tensor builder or the Bernstein producer.  It
pins their bytes, checks the producer's embedded fail-closed manifest, rebuilds
the attachment-floor substitution and path identities from scratch, verifies
the single t-domain and tightened y/r chords, and binds those formulas back to
the dormant source text.  It launches no tensor computation.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE_NAME = "certify_rank8_delta23_live_path_attachment_floor_box_agent.py"
OUTPUT = HERE / "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json"
EXPECTED = {
    SOURCE_NAME: "F0024AEFEE3790D2FC5B77F61226DCD56E6C63C1F61358A8B4EB9ADE8B604669",
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


def bernstein_coefficients(poly: sp.Expr, variable: sp.Symbol) -> list[sp.Rational]:
    power = sp.Poly(sp.expand(poly), variable, domain=sp.QQ)
    degree = power.degree()
    coefficients = [power.nth(k) for k in range(degree + 1)]
    return [
        sp.factor(
            sum(
                coefficients[k] * sp.Rational(math.comb(i, k), math.comb(degree, k))
                for k in range(i + 1)
            )
        )
        for i in range(degree + 1)
    ]


def literal_assignment(tree: ast.Module, name: str):
    for statement in tree.body:
        if isinstance(statement, ast.Assign):
            if any(isinstance(target, ast.Name) and target.id == name for target in statement.targets):
                return ast.literal_eval(statement.value)
    raise AssertionError(f"missing assignment {name}")


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    source_text = (HERE / SOURCE_NAME).read_text()
    source_ast = ast.parse(source_text, filename=SOURCE_NAME)
    embedded_inputs = literal_assignment(source_ast, "EXPECTED_INPUTS")
    assert embedded_inputs == {
        name: digest for name, digest in EXPECTED.items() if name != SOURCE_NAME
    }

    delta2_reduction = json.loads(
        (HERE / "rank8_q8_terminal_delta2_reduction_exact_20260820.json").read_text()
    )
    delta3_reduction = json.loads(
        (HERE / "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json").read_text()
    )
    theorem = json.loads(
        (HERE / "rank8_root_deletion_attachment_floor_exact_root_20260825.json").read_text()
    )
    theorem_audit = json.loads(
        (HERE / "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json").read_text()
    )
    chords = json.loads(
        (HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json").read_text()
    )
    assert delta2_reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"
    assert delta2_reduction["remaining_exact_analytic_tensors"] == 4
    assert delta2_reduction["live_root_paths_per_rank6_endpoint"] == [
        "lower-cross with live Z",
        "upper-capacity with live Z",
    ]
    assert delta3_reduction["status"] == (
        "PASS_EXACT_RANK8_TERMINAL_DELTA3_BOUNDED_REDUCTION_WITH_ENCLOSURE_OBSTRUCTION"
    )
    assert delta3_reduction["remaining_bounded_families"]["D6_endpoints"] == [1, 7]
    assert delta3_reduction["remaining_bounded_families"]["per_endpoint"] == [
        "lower junction (lower-zero endpoint)",
        "lower-cross with live Z",
        "upper-capacity with live Z",
        "full-root endpoint",
    ]
    assert theorem["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"
    assert theorem_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert chords["status"] == "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS"
    assert theorem_audit["immutable_inputs"] == {
        "verify_rank8_root_deletion_attachment_floor_root.py": EXPECTED[
            "verify_rank8_root_deletion_attachment_floor_root.py"
        ],
        "rank8_root_deletion_attachment_floor_exact_root_20260825.json": EXPECTED[
            "rank8_root_deletion_attachment_floor_exact_root_20260825.json"
        ],
    }

    # Independent capacity-polygon algebra, shared by both Delta ranks.
    a, root_q, c6, Z = sp.symbols("a root_q c6 Z", positive=True)
    c7 = a * root_q * c6 / 6
    lower_cross_h7 = c7 * Z
    upper_capacity_S = 7 * root_q * Z / 6
    upper_capacity_h7 = a * upper_capacity_S * c6 / 7
    path_ratios = {
        "lower_cross": sp.cancel(lower_cross_h7 / c7),
        "upper_capacity": sp.cancel(upper_capacity_h7 / c7),
        "h7_zero_faces": sp.S.Zero,
        "full_root": sp.S.One,
    }
    assert path_ratios == {
        "lower_cross": Z,
        "upper_capacity": Z,
        "h7_zero_faces": sp.S.Zero,
        "full_root": sp.S.One,
    }

    n, T, Zc = sp.symbols("n T Zc")
    t_map = T / 28
    p = 1 - 19 * t_map
    q = 7 * t_map
    d = 1 - 12 * t_map
    floor = (n - 19) / (n - 12)
    assert sp.expand(p + q - d) == 0
    assert sp.cancel(floor.subs(n, 1 / t_map) - p / d) == 0
    assert sp.cancel((p + q * Zc).subs(Zc, 0) / d - p / d) == 0
    assert sp.cancel((p + q * Zc).subs(Zc, 1) / d - 1) == 0
    assert t_map.subs(T, 0) == 0
    assert t_map.subs(T, 1) == sp.Rational(1, 28)

    bernstein = {
        label: bernstein_coefficients(expression, T)
        for label, expression in {"p": p, "q": q, "d": d}.items()
    }
    assert bernstein == {
        "p": [sp.S.One, sp.Rational(9, 28)],
        "q": [sp.S.Zero, sp.Rational(1, 4)],
        "d": [sp.S.One, sp.Rational(4, 7)],
    }
    assert all(value > 0 for value in bernstein["p"])
    assert all(value >= 0 for value in bernstein["q"])
    assert all(value > 0 for value in bernstein["d"])
    assert sp.factor((p / d).subs(T, 1)) == sp.Rational(9, 16)
    assert sp.limit(p / d, T, 0, dir="+") == 1

    samples = {row["order"]: row for row in theorem["rank8_corollary"]["samples"]}
    for order in (28, 31, 40, 80, 200, 1000):
        assert samples[order]["rank7_floor"] == str(sp.factor(floor.subs(n, order)))
    assert theorem["rank8_corollary"]["range"] == "n>=20"
    assert theorem["rank8_corollary"]["t_form"] == "Z>=(1-19t)/(1-12t), t=1/n"

    source_fragments = (
        "from probe_rank8_delta2_source_curvatures import build as build_delta2",
        "from probe_rank8_delta3_source_curvatures import build as build_delta3",
        'choices=(2, 3)',
        'choices=("lcross", "ucap")',
        "assert immutable_inputs == EXPECTED_INPUTS",
        "t_map = T / 28",
        "p = 1 - 19 * t_map",
        "q = 7 * t_map",
        "d = 1 - 12 * t_map",
        "assert sp.expand(p + q - d) == 0",
        "y_upper = 3 + sp.Rational(546, 25) * t_map",
        "r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map",
        "term *= z_powers[z_power] * d_powers[z_degree - z_power]",
    )
    assert all(fragment in source_text for fragment in source_fragments)
    assert 'parser.add_argument("--domain"' not in source_text

    builder_fragments = (
        'if piece == "lcross":',
        "S = 1 - q + q * Z",
        "h7 = c7 * Z",
        'elif piece == "ucap":',
        "S = 7 * q * Z / 6",
        "h7 = a * S * c6 / 7",
        "c7 = sp.factor(a * q * c6 / 6)",
    )
    builder_bindings = {}
    for builder_name in (
        "probe_rank8_delta2_source_curvatures.py",
        "probe_rank8_delta3_source_curvatures.py",
    ):
        builder_text = (HERE / builder_name).read_text()
        assert all(fragment in builder_text for fragment in builder_fragments)
        builder_bindings[builder_name] = list(builder_fragments)

    assert chords["bounds"] == {
        "y": "y<=3+(546/25)t",
        "r": "r<=4/3+(1008/173)t",
    }

    payload = {
        "schema": "rank8-delta23-live-path-attachment-floor-box-mappings-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT",
        "method": (
            "No tensor-source import; exact floor/path reconstruction, AST manifest "
            "audit, and immutable source-text binding."
        ),
        "single_domain": {
            "t_map": str(t_map),
            "order_scope": "all finite integer n>=28, with T=0 the compactified limit",
            "p": str(sp.factor(p)),
            "q": str(sp.factor(q)),
            "d": str(sp.factor(d)),
            "floor_range": ["9/16 at n=28", "limit 1 as n tends to infinity"],
            "positive_denominator_bernstein": [str(value) for value in bernstein["d"]],
            "nonnegative_q_bernstein": [str(value) for value in bernstein["q"]],
        },
        "capacity_path_ratios": {key: str(value) for key, value in path_ratios.items()},
        "endpoint_coverage": {
            "h7_zero_faces": "excluded for n>=28 by the strict floor",
            "full_root": "included by lower-cross at Zc=1",
            "upper_junction": "included by upper-capacity at Zc=1",
        },
        "coordinate_chords": chords["bounds"],
        "source_binding_fragments": list(source_fragments),
        "builder_bindings": builder_bindings,
        "embedded_manifest_matches": True,
        "immutable_inputs": actual,
        "launch_state": "Dormant preparation only; this audit launches no tensor.",
        "finalization_boundary": (
            "Each Delta rank requires four future PASS reports (k=1,7 crossed with "
            "lcross,ucap), this mapping audit, and the independent attachment-floor "
            "audit. Reports remain rank/path/k scoped until assembled."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
