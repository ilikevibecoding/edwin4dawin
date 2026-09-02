#!/usr/bin/env python3
"""Independent fail-closed audit of the rank-eight Delta0/Delta1 reductions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    n = sp.symbols("n", integer=True, positive=True)
    Z = sp.symbols("Z", nonnegative=True)
    exact = {c[0]: 1, c[1]: n, c[2]: (n - 1) * (n - 2) / 2}
    coefficients = {
        rank: sp.expand(newton_coefficients(residual())[rank].subs(exact))
        for rank in (0, 1)
    }
    expected_root = {
        0: -4 * c[7] * (63 * c[6] + 63 * c[7] - h[6]),
        1: -252 * c[7] * (c[5] + c[6]),
    }
    expected_c8 = {
        0: -256 * h[6] * (c[6] + h[6]),
        1: -256 * h[6] * (c[5] + c[6]),
    }
    for rank in (0, 1):
        require(sp.expand(sp.diff(coefficients[rank], h[7], 2) - expected_root[rank]) == 0, f"Delta{rank} h7 curvature")
        require(sp.expand(sp.diff(coefficients[rank], c[8], 2) - expected_c8[rank]) == 0, f"Delta{rank} c8 curvature")

    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    q7_expression = 14 * c[7] ** 2 - c[6] * c[7] - 16 * c[6] * c[8]
    require(sp.factor(c8_q7 - c[8] - q7_expression / (16 * c[6])) == 0, "Q7 c8 endpoint identity")
    q = 6 * c[7] / ((n - 7) * c[6])
    paths = {
        "l0": ((1 - q) * Z * c[6], sp.Integer(0)),
        "lcross": ((1 - q + q * Z) * c[6], c[7] * Z),
        "ucap": (sp.Rational(7, 6) * q * Z * c[6], c[7] * Z),
        "full": ((sp.Rational(7, 6) * q + (1 - sp.Rational(7, 6) * q) * Z) * c[6], c[7]),
    }
    endpoints = {"zero": sp.Integer(0), "Q7": c8_q7}
    expressions: dict[int, dict[str, dict[str, sp.Expr]]] = {}
    curvatures: dict[int, dict[str, dict[str, sp.Expr]]] = {}
    for rank in (0, 1):
        expressions[rank] = {}
        curvatures[rank] = {}
        for endpoint, c8_value in endpoints.items():
            expressions[rank][endpoint] = {}
            curvatures[rank][endpoint] = {}
            for path, (h6_value, h7_value) in paths.items():
                value = sp.cancel(
                    coefficients[rank].subs(
                        {h[6]: h6_value, h[7]: h7_value, c[8]: c8_value},
                        simultaneous=True,
                    )
                )
                expressions[rank][endpoint][path] = value
                curvatures[rank][endpoint][path] = sp.factor(sp.diff(value, Z, 2))

            # Exact endpoint topology of the root polygon.
            row = expressions[rank][endpoint]
            require(sp.cancel(row["l0"].subs(Z, 0) - row["ucap"].subs(Z, 0)) == 0, "zero-root junction")
            require(sp.cancel(row["l0"].subs(Z, 1) - row["lcross"].subs(Z, 0)) == 0, "lower junction")
            require(sp.cancel(row["ucap"].subs(Z, 1) - row["full"].subs(Z, 0)) == 0, "upper junction")
            require(sp.cancel(row["lcross"].subs(Z, 1) - row["full"].subs(Z, 1)) == 0, "full-root junction")

    expected_d1 = {
        "zero_l0": -16 * c[7] * (c[6] + 19 * c[7]) * ((n - 7) * c[6] - 6 * c[7]) ** 2 / (n - 7) ** 2,
        "zero_full": -16 * c[7] * (c[6] + 19 * c[7]) * ((n - 7) * c[6] - 7 * c[7]) ** 2 / (n - 7) ** 2,
        "Q7_l0": -2 * c[7] * (8 * c[6] ** 2 + 143 * c[6] * c[7] + 126 * c[7] ** 2) * ((n - 7) * c[6] - 6 * c[7]) ** 2 / (c[6] * (n - 7) ** 2),
        "Q7_full": -2 * c[7] * (8 * c[6] ** 2 + 143 * c[6] * c[7] + 126 * c[7] ** 2) * ((n - 7) * c[6] - 7 * c[7]) ** 2 / (c[6] * (n - 7) ** 2),
    }
    require(sp.factor(curvatures[1]["zero"]["l0"] - expected_d1["zero_l0"]) == 0, "Delta1 zero/l0")
    require(sp.factor(curvatures[1]["zero"]["full"] - expected_d1["zero_full"]) == 0, "Delta1 zero/full")
    require(sp.factor(curvatures[1]["Q7"]["l0"] - expected_d1["Q7_l0"]) == 0, "Delta1 Q7/l0")
    require(sp.factor(curvatures[1]["Q7"]["full"] - expected_d1["Q7_full"]) == 0, "Delta1 Q7/full")

    expected_d0 = {
        "zero_l0": -16 * c[7] ** 2 * ((n - 7) * c[6] - 6 * c[7]) ** 2 / (n - 7) ** 2,
        "zero_full": -14 * c[7] ** 2 * ((n - 7) * c[6] - 7 * c[7]) ** 2 / (n - 7) ** 2,
        "Q7_l0": c[7] ** 2 * (c[6] ** 2 - 224 * c[6] * c[7] - 196 * c[7] ** 2) * ((n - 7) * c[6] - 6 * c[7]) ** 2 / (c[6] ** 2 * (n - 7) ** 2),
        "Q7_full": c[7] ** 2 * (3 * c[6] ** 2 - 224 * c[6] * c[7] - 196 * c[7] ** 2) * ((n - 7) * c[6] - 7 * c[7]) ** 2 / (c[6] ** 2 * (n - 7) ** 2),
    }
    require(sp.factor(curvatures[0]["zero"]["l0"] - expected_d0["zero_l0"]) == 0, "Delta0 zero/l0")
    require(sp.factor(curvatures[0]["zero"]["full"] - expected_d0["zero_full"]) == 0, "Delta0 zero/full")
    require(sp.factor(curvatures[0]["Q7"]["l0"] - expected_d0["Q7_l0"]) == 0, "Delta0 Q7/l0")
    require(sp.factor(curvatures[0]["Q7"]["full"] - expected_d0["Q7_full"]) == 0, "Delta0 Q7/full")

    z_lower = sp.factor((2 * n - 37 + 20 / n) / 14)
    z_floor = sp.Rational(227, 322)
    require(sp.factor(z_lower - z_floor - (n - 23) * (23 * n - 10) / (161 * n)) == 0, "Delta0 z floor")
    require(1 - 224 * z_floor - 196 * z_floor**2 < 0, "Delta0 l0 Q7 curvature sign")
    require(3 - 224 * z_floor - 196 * z_floor**2 < 0, "Delta0 full Q7 curvature sign")

    # Rebuild the linked rank-six K,V parameterization independently.
    x5, K, V, a = sp.symbols("x5 K V a", positive=True)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    r_low = sp.factor((1 - d5_high) / x5)
    r_high = sp.factor((1 - d5_low) / x5)
    q_low = sp.factor((36 * r_low - 3 * K) / (7 * a))
    q_high = sp.factor((36 * r_high - 3 * K) / (7 * a))
    require(sp.factor(q_high - q_low - 15 / (7 * a)) == 0, "rank6 q width")
    q_parameter = sp.factor(q_low + (q_high - q_low) * V)
    c6_parameter = sp.factor(c[5] * (7 * a * q_parameter + 3 * K) / 36)
    require(
        sp.factor(c6_parameter - c[5] * (30 / x5 - 18 + 15 * V) / 36) == 0,
        "rank6 c6 K cancellation",
    )

    # Independently verify the linked P23 obstruction in the interior of the
    # joint root/K domain.  The path c4,c5,c6,c7 jet corresponds exactly to
    # K=256/57,V=22/95.  S=1/2 has strict lower-root slack.
    S, E = sp.symbols("S E", nonnegative=True)
    capacity_zero = {
        rank: coefficients[rank].subs(
            {h[6]: S * c[6], h[7]: E * (n - 7) * S * c[6] / 7, c[8]: 0},
            simultaneous=True,
        )
        for rank in (0, 1)
    }
    c7_curvature = {rank: sp.factor(sp.diff(value, c[7], 2)) for rank, value in capacity_zero.items()}
    c4_value = sp.binomial(20, 4)
    c5_value = sp.binomial(19, 5)
    x5_value = sp.factor(c4_value / c5_value)
    k_value = sp.Rational(256, 57)
    v_value = sp.Rational(22, 95)
    q_value = sp.factor(q_parameter.subs({x5: x5_value, K: k_value, V: v_value, a: 16}))
    c6_value = sp.factor(
        c6_parameter.subs({c[5]: c5_value, x5: x5_value, K: k_value, V: v_value, a: 16})
    )
    c7_value = sp.factor(16 * q_value * c6_value / 6)
    require(x5_value == sp.Rational(5, 12), "P23 x5")
    require(c6_value == sp.binomial(18, 6), "P23 c6 from linked D5 parameter")
    require(q_value == sp.Rational(11, 28) and c7_value == sp.binomial(17, 7), "linked K obstruction coordinates")
    require(1 < k_value < 7 and 0 < v_value < 1, "strict interior K,V")
    require(sp.Rational(1, 2) < 1 - q_value, "strict lower-root slack")
    obstruction = {
        rank: sp.factor(
            c7_curvature[rank].subs(
                {n: 23, S: sp.Rational(1, 2), E: 0, c[5]: c5_value, c[6]: c6_value, c[7]: c7_value}
            )
        )
        for rank in (0, 1)
    }
    require(obstruction == {0: sp.Integer(125836296768), 1: sp.Integer(256716952128)}, "linked K obstruction curvatures")

    reports = {
        0: load("rank8_q8_terminal_delta0_reduction_exact_20260820.json"),
        1: load("rank8_q8_terminal_delta1_reduction_exact_20260820.json"),
    }
    for rank, report in reports.items():
        require(report["status"] == f"PASS_EXACT_RANK8_TERMINAL_DELTA{rank}_REDUCTION_FOUR_LIVE_TENSORS", f"Delta{rank} report status")
        require(report["remaining_exact_analytic_tensors"] == 4, f"Delta{rank} tensor count")
        require(report["rank6_endpoint_collapse_obstruction"]["slice_value"] == str(obstruction[rank]), f"Delta{rank} linked obstruction report")
        require(report["rank6_endpoint_collapse_obstruction"]["rank6_D5_coordinates"] == "K=256/57, V=22/95", f"Delta{rank} linked K,V report")

    source_hashes = {
        "verify_rank8_q8_terminal_delta0_reduction.py": sha256(ROOT / "verify_rank8_q8_terminal_delta0_reduction.py"),
        "verify_rank8_q8_terminal_delta1_reduction.py": sha256(ROOT / "verify_rank8_q8_terminal_delta1_reduction.py"),
    }
    report_hashes = {
        "rank8_q8_terminal_delta0_reduction_exact_20260820.json": sha256(ROOT / "rank8_q8_terminal_delta0_reduction_exact_20260820.json"),
        "rank8_q8_terminal_delta1_reduction_exact_20260820.json": sha256(ROOT / "rank8_q8_terminal_delta1_reduction_exact_20260820.json"),
    }
    require(
        sha256(ROOT / "rank7_final_integration_independent_audit_exact_20260820.json")
        == "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
        "final rank7 dependency hash",
    )
    payload = {
        "schema": "rank8-delta0-delta1-structural-reductions-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA0_DELTA1_FOUR_LIVE_TENSORS",
        "audited_scope": "structural reductions for n>=23; no Delta0 or Delta1 sign theorem",
        "verified": [
            "exact h7 and c8 concavity",
            "c8 endpoint interval {0,Q7}, including endpoint-minus-c8=Q7/(16c6)",
            "root polygon endpoint topology",
            "lower-zero and full-root concavity at both c8 endpoints",
            "Delta0 Q7-endpoint curvature payment from z>=227/322",
            "exact linked K,V parameterization and interior root-feasible K-collapse obstruction",
            "four live tensors: c8 {0,Q7} x root {lower-cross,upper-capacity}, with K,V,Z live",
        ],
        "linked_interior_obstruction": {
            "n": 23,
            "K": str(k_value),
            "V": str(v_value),
            "q": str(q_value),
            "S": "1/2",
            "E": "0",
            "one_minus_q": str(1 - q_value),
            "strict_root_slack": str(1 - q_value - sp.Rational(1, 2)),
            "c4": str(c4_value),
            "c5": str(c5_value),
            "c6": str(c6_value),
            "c7": str(c7_value),
            "Delta0_c7_curvature": str(obstruction[0]),
            "Delta1_c7_curvature": str(obstruction[1]),
            "classification": "method obstruction only; not a negative coefficient or tree counterexample",
        },
        "source_hashes": source_hashes,
        "report_hashes": report_hashes,
        "scope_guard": "The eight combined live tensors remain unsigned; connected Q8 is not proved.",
    }
    output = ROOT / "rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
