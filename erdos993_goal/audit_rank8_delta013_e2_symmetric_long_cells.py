#!/usr/bin/env python3
"""Independent audit of Delta0/1/3 symmetry-adapted e=2 long cells."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from audit_rank8_delta013_e2_double_claws_n23 import claw, double_claw, path, product, multiply
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "probe_rank8_delta013_e2_symmetric_long_cells.py": "32CC4A331D388143640809AD4F07D18B002AB9A16C1F0C40769D9923F7DD0085",
    "rank8_delta0_e2_branch_symmetric_long_exact_20260820.json": "3B31D1FA72F933122B6D94CDFF126AD2A9B715D6317BB2C698704E83B349C058",
    "rank8_delta1_e2_branch_symmetric_long_exact_20260820.json": "F077F9048BC7E3071F44C4BCD24CD82A29B010F960384B0A431CCB4B77629BCF",
    "rank8_delta3_e2_branch_symmetric_long_exact_20260820.json": "189DDE9C64CF1A8A24F5DB6BDEA82F7C37CE853C6FEEF2C900D12752C5271913",
    "rank8_delta0_e2_bridge_interior_symmetric_long_exact_20260820.json": "2310F262FE2B336348E90A0EE397245796E1E8627E218E4D082092E1186F5101",
    "rank8_delta1_e2_bridge_interior_symmetric_long_exact_20260820.json": "33674A26103DEDAFC31E932983EB1E335D72577B0AEA1BE71F906EEBD78C1397",
    "rank8_delta3_e2_bridge_interior_symmetric_long_exact_20260820.json": "BE38D03793225600A374592CCB11AD529EAB7443E5C599231834C531DF336E93",
    "rank8_delta0_e2_pendant_symmetric_long_exact_20260820.json": "910A128C8ABA3A5843D709D539EFEF648D039A4113E1035A9732D9B97A245C48",
    "rank8_delta1_e2_pendant_symmetric_long_exact_20260820.json": "30563236FB48A6F759726B6E2A15B97751D0F3896A1A2FA23A06D5FC7444D3CD",
    "rank8_delta3_e2_pendant_symmetric_long_exact_20260820.json": "E3DA855160CC5A4CEA00D6219C4C01CA466CD3E085BC62690A08D4E5D55BBE59",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(rank: int, cell: str) -> dict:
    return json.loads((HERE / f"rank8_delta{rank}_e2_{cell}_symmetric_long_exact_20260820.json").read_text())


def evaluate(rank: int, core: list[int], deletion: list[int]) -> int:
    order = core[1]
    expression = newton_coefficients(residual())[rank]
    substitutions = {
        **{c[k]: core[k] for k in range(9)},
        h[6]: deletion[6],
        h[7]: deletion[7],
    }
    return int(sp.expand(expression.subs(substitutions)))


def literal_origin(cell: str) -> tuple[list[int], list[int], str]:
    if cell == "branch":
        core = double_claw((7, 7, 8, 7, 7))
        deletion = product([path(7), path(7), claw((7, 7, 7))])
        return core, deletion, "G + SL + SR + 37"
    if cell == "bridge_interior":
        core = double_claw((7, 7, 16, 7, 7))
        deletion = multiply(claw((7, 7, 7)), claw((7, 7, 7)))
        return core, deletion, "M + N + SL + SR + 45"
    if cell == "pendant":
        core = double_claw((15, 7, 8, 7, 7))
        deletion = multiply(path(7), double_claw((7, 7, 8, 7, 7)))
        return core, deletion, "G + SR + U + X + 45"
    raise ValueError(cell)


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED

    # The exact tree coordinate follows from the three-set motif identity
    # i3=C(n-2,3)+sum_v C(deg(v)-1,2), and e=2.
    assert math.comb(21, 3) + 2 == 1332
    rows = []
    for cell in ("branch", "bridge_interior", "pendant"):
        core, deletion, expected_order = literal_origin(cell)
        order = core[1]
        assert core[0] == 1
        assert core[2] == math.comb(order - 1, 2)
        assert core[3] == math.comb(order - 2, 3) + 2
        for rank in (0, 1, 3):
            report = load(rank, cell)
            assert report["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
            assert report["rank"] == rank and report["cell"] == cell
            assert report["order_expression"] == expected_order
            assert report["negative_coefficients"] == 0
            constant = evaluate(rank, core, deletion)
            assert int(sp.Rational(report["constant_coefficient"])) == constant > 0
            if cell in ("branch", "bridge_interior"):
                assert report["degrees"][1] == report["degrees"][3] == 0
            rows.append(
                {
                    "rank": rank,
                    "cell": cell,
                    "literal_origin_order": order,
                    "literal_origin_constant": str(constant),
                    "terms": report["terms"],
                }
            )

    payload = {
        "schema": "rank8-delta013-e2-symmetric-long-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS",
        "immutable_input_hashes": EXPECTED,
        "tree_coordinate_audit": "c0=1,c1=n,c2=C(n-1,2),c3=C(n-2,3)+e with e=2",
        "order_expressions_audited": {
            "branch": "37+SL+SR+G",
            "bridge_interior": "45+SL+SR+N+M",
            "pendant": "45+X+U+SR+G",
        },
        "independent_literal_origin_checks": rows,
        "sum_only_guard": "PL and PR degrees are zero in every branch/bridge report",
        "scope": "independent coordinate, order, hash, and literal-origin audit of the nine long cells; short boundaries remain",
    }
    output = HERE / "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
