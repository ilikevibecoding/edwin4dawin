#!/usr/bin/env python3
"""Replay the exact single-Newton-sequence reduction of the affine bridge.

The proof itself is formal and is written in
AFFINE_BRIDGE_SINGLE_NEWTON_SEQUENCE_REDUCTION_2026-08-10.md.  This
companion checks the reciprocal target algebra, the generic sequence
identity through a large exact range, the kernel bidegrees exported by the
two reductions, and exact counterexamples to the most tempting Turan-ratio
induction.  It does not claim a finite scan proves the remaining inequality.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


z, w, c, m, x, epsilon, r = sp.symbols(
    "z w c m x epsilon r", integer=True
)
q = z * w
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w
S = z**2 + w**2 + z * w * (z + w)
W = z + w + z * w


def reciprocal_substitution(expr: sp.Expr) -> sp.Expr:
    return expr.xreplace({z: 1 / z, w: 1 / w})


def sequence_identity(maximum_r: int) -> dict:
    """Check Delta^r[n nabla p(n)]_0 = r Delta^r[p(n)]_0 formally."""
    canonical = []
    for order in range(maximum_r + 1):
        # Coefficients of the abstract values p(0),...,p(order).
        left = [0] * (order + 1)
        for n_value in range(order + 1):
            outer = (-1) ** (order - n_value) * math.comb(
                order, n_value
            )
            if n_value:
                left[n_value] += outer * n_value
                left[n_value - 1] -= outer * n_value
        right = [
            order
            * (-1) ** (order - index)
            * math.comb(order, index)
            for index in range(order + 1)
        ]
        assert left == right
        canonical.append(f"{order}:" + ",".join(map(str, left)))
    return {
        "maximum_order_checked": maximum_r,
        "identity": "Delta^r[n*nabla p(n)](0)=r*Delta^r[p(n)](0)",
        "sha256": hashlib.sha256(
            "\n".join(canonical).encode("utf-8")
        ).hexdigest(),
    }


def load_bidegrees() -> dict:
    group = json.loads(
        Path(
            "path_isolate_p4_group_affine_grouped_tail_symbolic_20260801.json"
        ).read_text(encoding="utf-8")
    )
    bottom = json.loads(
        Path(
            "path_isolate_p4_bottom_pair_affine_two_kernel_20260801.json"
        ).read_text(encoding="utf-8")
    )
    group_degrees = sorted(
        {
            int(item["bidegree"])
            for item in group["records"]
            if item["kind"] in ("P", "base")
        }
    )
    bottom_degrees = sorted(
        {int(item["common_bidegree"]) for item in bottom["records"]}
    )
    assert group_degrees == [24]
    assert bottom_degrees == [26]
    return {"group": group_degrees, "bottom": bottom_degrees}


def first_turan_failure(path: Path) -> dict:
    source = json.loads(path.read_text(encoding="utf-8"))
    records = source["records"]
    parameter_names = [
        name
        for name in ("package", "parity", "c", "m", "x")
        if any(name in item for item in records)
    ]
    groups: dict[tuple[object, ...], list[dict]] = {}
    for item in records:
        key = tuple(item.get(name) for name in parameter_names)
        groups.setdefault(key, []).append(item)
    failures = []
    for key, items in groups.items():
        items.sort(key=lambda item: item["r"])
        for current, following in zip(items, items[1:]):
            if following["r"] != current["r"] + 1:
                continue
            b_r = int(current["base"])
            p_r = int(current["reserve_unit"])
            b_next = int(following["base"])
            p_next = int(following["reserve_unit"])
            determinant = (
                p_r * b_next
                - p_next * b_r
                + p_r * p_next
            )
            if determinant < 0:
                parameters = {
                    name: value
                    for name, value in zip(parameter_names, key)
                }
                failures.append(
                    {
                        **parameters,
                        "r": int(current["r"]),
                        "b_r": b_r,
                        "p_r": p_r,
                        "b_next": b_next,
                        "p_next": p_next,
                        "F_r": b_r + int(current["r"]) * p_r,
                        "F_next": b_next
                        + int(following["r"]) * p_next,
                        "turan_determinant": determinant,
                    }
                )
    assert failures
    return {
        "source": str(path),
        "failure_count_in_existing_audit": len(failures),
        "first_failure": failures[0],
    }


def main() -> None:
    # Exact reciprocal identities.
    assert sp.expand(q * reciprocal_substitution(A) - A) == 0
    assert sp.expand(q**2 * reciprocal_substitution(T) - S) == 0
    assert sp.expand(q * reciprocal_substitution(V) - W) == 0
    assert sp.expand(W - (A - 1)) == 0

    # Fixed targets after reciprocal cancellation of the moving r target.
    group_a = 2 * c + m + x - 3
    group_b = 2 * m + epsilon - 4
    group_target = sp.expand(
        group_a + 2 * group_b + 24 - (m + 5)
    )
    assert sp.expand(
        group_target - (2 * c + 4 * m + x + 2 * epsilon + 8)
    ) == 0
    bottom_a = m + x - 3
    bottom_b = 2 * m + epsilon - 5
    bottom_target = sp.expand(
        bottom_a + 2 * bottom_b + 26 - (m + 5)
    )
    assert sp.expand(
        bottom_target - (4 * m + x + 2 * epsilon + 8)
    ) == 0

    # The positive atom recurrence is the polynomial identity
    # z(1+w)+w=W.  Coefficient extraction gives
    # D_r(a,b;u,v)=D_{r-1}(a,b+1;u-1,v)
    #                 +D_{r-1}(a,b;u,v-1).
    assert sp.expand(z * (1 + w) + w - W) == 0

    r0_records = {}
    for parity_name in ("even", "odd"):
        source = json.loads(
            Path(
                f"affine_bridge_r0_{parity_name}_exact_20260810.json"
            ).read_text(encoding="utf-8")
        )
        assert source["status"].startswith("PASS_AFFINE_BRIDGE_R0_")
        r0_records[parity_name] = source["status"]

    turan_failures = {
        package: first_turan_failure(
            Path(
                "path_isolate_p4_affine_central_reserve_ratio_"
                f"{package}_20260801.json"
            )
        )
        for package in ("group", "bottom")
    }

    report = {
        "status": "PASS_AFFINE_BRIDGE_SINGLE_NEWTON_SEQUENCE_REDUCTION",
        "reciprocal_identities": {
            "q*A(1/z,1/w)": "A",
            "q^2*T(1/z,1/w)": "S",
            "q*V(1/z,1/w)": "W=A-1",
        },
        "kernel_bidegrees": load_bidegrees(),
        "fixed_targets": {
            "group": str(group_target),
            "bottom": str(bottom_target),
        },
        "generic_sequence_replay": sequence_identity(64),
        "positive_atom_recurrence": (
            "D_r(alpha,beta;u,v)="
            "D_(r-1)(alpha,beta+1;u-1,v)+"
            "D_(r-1)(alpha,beta;u,v-1)"
        ),
        "r0_theorems": r0_records,
        "single_remaining_inequality": (
            "Delta^r G(0)>=0, where G(n)=H_B(n)+"
            "n*(H_P(n)-H_P(n-1))"
        ),
        "newton_induction_step": (
            "G(r)>=sum_(s<r) binomial(r,s)*F_s"
        ),
        "tp_spatial_recurrence": (
            "F_(r+1)(i,j)=F_r(i-1,j)+F_r(i,j-1)+"
            "F_r(i-1,j-1)+R_(r+1)(i,j)"
        ),
        "minimal_central_step_condition": (
            "2*F_r(N-1,N)+F_r(N-1,N-1)+"
            "R_(r+1)(N,N)>=0"
        ),
        "failed_natural_turan_ratio_induction": turan_failures,
        "scope_warning": (
            "The reduction and counterexamples are exact.  The remaining "
            "Newton/binomial-convolution inequality is not proved here."
        ),
    }
    output = Path(
        "affine_bridge_single_newton_sequence_reduction_20260810.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "status": report["status"],
        "fixed_targets": report["fixed_targets"],
        "sequence_orders_checked": report[
            "generic_sequence_replay"
        ]["maximum_order_checked"],
        "group_turan_first": turan_failures["group"]["first_failure"],
        "bottom_turan_first": turan_failures["bottom"]["first_failure"],
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
