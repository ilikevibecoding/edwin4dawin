#!/usr/bin/env python3
"""Exact mixed-sector normal form for the connected double-broom ISO base.

This is an all-order algebraic reduction, not a positivity proof.  It turns
the four still-signed groups BX+BY, XY, and BZ into four oriented first-order
operators, identifies the two positive consecutive-path CD carriers, and
records exact obstructions to paying the mixed part without the BB reserve.

The finite loops below replay the displayed identities literally.  The
all-order content is the term classification by leaf-incidence signature and
the path recurrence/CD identities; the loops are not promoted to a theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from derive_iso_nested_compact_operator_root import (
    add,
    leaf_kernel,
    scale_x,
    symbols,
    w,
    z,
)
from prove_iso_double_broom_bb_sector_agent import bb_integrand
from prove_path_consecutive_cd_quotient_root import quotient


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_double_broom_mixed_reduction_exact_agent_20260829.json"
phi = z + w + z * w
defect = (z - w) ** 2 / 2


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_poly(order: int, variable: sp.Symbol) -> sp.Expr:
    """Path polynomial with P_-2=0 and P_-1=P_0=1."""
    if order == -2:
        return sp.Integer(0)
    if order <= 0:
        return sp.Integer(1)
    older, old = sp.Integer(1), 1 + variable
    for _ in range(2, order + 1):
        older, old = old, sp.expand(old + variable * older)
    return old


def nested(value) -> sp.Expr:
    E, U, V, W = value
    return sp.expand(
        leaf_kernel(add(E, scale_x(U)), add(V, scale_x(W)))
        - leaf_kernel(E, V)
        - z * w * leaf_kernel(U, W)
    )


def tuple_add(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def tuple_x(value):
    return tuple(scale_x(a) for a in value)


def nested_polar(left, right) -> sp.Expr:
    return sp.expand(
        (nested(tuple_add(left, right)) - nested(left) - nested(right)) / 2
    )


def defect_form(value) -> sp.Expr:
    E, U, V, W = value
    Ez, Ew, _, _ = E
    Uz, Uw, _, _ = U
    Vz, Vw, _, _ = V
    Wz, Ww, _, _ = W
    return sp.expand(
        z**2 * Ew * Wz
        + w**2 * Ez * Ww
        + z * w * (Uw * Vz + Uz * Vw)
    )


def classify_abstract_groups():
    B, X, Y, Z = (symbols(name) for name in "BXYZ")
    E = add(add(add(B, X), Y), Z)
    U = add(B, X)
    V = add(B, Y)
    W = B
    expression = nested((E, U, V, W))
    groups = {key: sp.Integer(0) for key in ("BB", "BX", "BY", "XY", "BZ")}
    for term in sp.Add.make_args(expression):
        letters: list[str] = []
        for atom, power in term.as_powers_dict().items():
            if not getattr(atom, "is_Symbol", False):
                continue
            name = str(atom)
            root = name[1] if name.startswith("d") else name[0]
            if root in "BXYZ":
                letters.extend(root for _ in range(int(power)))
        key = "".join(sorted(letters))
        assert key in groups
        groups[key] += term
    return (B, X, Y, Z), {key: sp.expand(value) for key, value in groups.items()}


ABSTRACT_COMPONENTS, ABSTRACT_GROUPS = classify_abstract_groups()


def oriented_operator(expression: sp.Expr, left, right):
    """Coefficients c,d for cQ+d(d_z-d_w)Q, Q=left(z)right(w)."""
    Lz, _, dLz, _ = left
    _, Rw, _, dRw = right
    c = sp.expand(expression).coeff(Lz * Rw)
    dz_coefficient = sp.expand(expression).coeff(dLz * Rw)
    dw_coefficient = sp.expand(expression).coeff(Lz * dRw)
    assert sp.expand(dz_coefficient + dw_coefficient) == 0
    return sp.factor(c), sp.factor(dz_coefficient)


B, X, Y, Z = ABSTRACT_COMPONENTS
CX, DX = oriented_operator(ABSTRACT_GROUPS["BX"], B, X)
CXY, DXY = oriented_operator(ABSTRACT_GROUPS["XY"], X, Y)
CZ, DZ = oriented_operator(ABSTRACT_GROUPS["BZ"], B, Z)

assert sp.expand(
    CX
    - (
        2 * w**2 * z**2
        - w**2 * z
        - w**2
        + 2 * w * z**3
        + 2 * w * z**2
        - z**3
        + z**2
    )
    / 2
) == 0
assert sp.expand(DX - z * (z - w) * (z + w) / 2) == 0
assert sp.expand(CXY - (z**2 * w**2 - defect)) == 0
assert sp.expand(DXY - z * w * (z - w) / 2) == 0
assert sp.expand(CZ - z * (w * z**2 - w + z)) == 0
assert sp.expand(DZ - z**2 * (z - w) / 2) == 0


def L(expression: sp.Expr, c: sp.Expr, d: sp.Expr) -> sp.Expr:
    return sp.expand(c * expression + d * (sp.diff(expression, z) - sp.diff(expression, w)))


def swap(expression: sp.Expr) -> sp.Expr:
    return sp.expand(expression.xreplace({z: w, w: z}))


def mixed_group_normal_forms(order: int, i: int, j: int) -> dict[str, sp.Expr]:
    Rz, Rw = path_poly(order - 2, z), path_poly(order - 2, w)
    Sz, Sw = path_poly(order - 3, z), path_poly(order - 3, w)
    Tz, Tw = path_poly(order - 4, z), path_poly(order - 4, w)
    h = i + j

    bx_oriented = L(phi**i * z**j * Rz * w * Sw, CX, DX)
    by_oriented = L(phi**j * z**i * Rz * w * Sw, CX, DX)
    xy_oriented = L(z ** (i + 1) * w ** (j + 1) * Sz * Sw, CXY, DXY)
    bz_oriented = L(z**h * Rz * w**2 * Tw, CZ, DZ)
    return {
        "BX": sp.expand(bx_oriented + swap(bx_oriented)),
        "BY": sp.expand(by_oriented + swap(by_oriented)),
        "XY": sp.expand(xy_oriented + swap(xy_oriented)),
        "BZ": sp.expand(bz_oriented + swap(bz_oriented)),
    }


def component_substitution(order: int, a: int, b: int) -> dict[sp.Symbol, sp.Expr]:
    Az, Aw = (1 + z) ** a, (1 + w) ** a
    Bz, Bw = (1 + z) ** b, (1 + w) ** b
    values = {
        B: (Az * Bz * path_poly(order - 2, z), Aw * Bw * path_poly(order - 2, w)),
        X: (z * Az * path_poly(order - 3, z), w * Aw * path_poly(order - 3, w)),
        Y: (z * Bz * path_poly(order - 3, z), w * Bw * path_poly(order - 3, w)),
        Z: (z**2 * path_poly(order - 4, z), w**2 * path_poly(order - 4, w)),
    }
    substitution: dict[sp.Symbol, sp.Expr] = {}
    for component, (at_z, at_w) in values.items():
        substitution.update(
            {
                component[0]: at_z,
                component[1]: at_w,
                component[2]: sp.diff(at_z, z),
                component[3]: sp.diff(at_w, w),
            }
        )
    return substitution


def literal_group(order: int, a: int, b: int, group: str) -> sp.Expr:
    return sp.expand(ABSTRACT_GROUPS[group].subs(component_substitution(order, a, b)))


def newton_literal(order: int, i: int, j: int, group: str) -> sp.Expr:
    return sp.expand(
        sum(
            (-1) ** (i - a + j - b)
            * comb(i, a)
            * comb(j, b)
            * literal_group(order, a, b, group)
            for a in range(i + 1)
            for b in range(j + 1)
        )
    )


def polynomial_tuple(order: int, a: int, b: int):
    substitution = component_substitution(order, a, b)
    Bv = tuple(substitution[q] for q in B)
    Xv = tuple(substitution[q] for q in X)
    Yv = tuple(substitution[q] for q in Y)
    Zv = tuple(substitution[q] for q in Z)
    return add(add(add(Bv, Xv), Yv), Zv), add(Bv, Xv), add(Bv, Yv), Bv


def coefficient(expression: sp.Expr, p: int, q: int) -> sp.Expr:
    return sp.expand(expression).coeff(z, p).coeff(w, q)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=5)
    parser.add_argument("--max-newton", type=int, default=2)
    args = parser.parse_args()
    assert args.max_order >= 4 and args.max_newton >= 0

    # Generic corrected path-Pascal identity.  The defect term is essential:
    # N(XD)=zwN(D)-delta R(D).
    C = tuple(symbols(f"C{name}") for name in "EUVW")
    D = tuple(symbols(f"D{name}") for name in "EUVW")
    generic_gap = sp.expand(
        nested(tuple_add(C, tuple_x(D))) - nested(C) - z * w * nested(D)
    )
    generic_target = sp.expand(2 * nested_polar(C, tuple_x(D)) - defect * defect_form(D))
    assert sp.expand(generic_gap - generic_target) == 0

    # Every double-broom component obeys the path recurrence for order >=4.
    recurrence_checks = 0
    for order in range(4, args.max_order + 1):
        for a in range(args.max_newton + 1):
            for b in range(args.max_newton + 1):
                current = polynomial_tuple(order, a, b)
                expected = tuple_add(
                    polynomial_tuple(order - 1, a, b),
                    tuple_x(polynomial_tuple(order - 2, a, b)),
                )
                assert all(
                    sp.expand(x - y) == 0
                    for current_state, expected_state in zip(current, expected)
                    for x, y in zip(current_state, expected_state)
                )
                recurrence_checks += 1

    # Replay the all-order leaf-incidence normal form on a finite exact range.
    normal_form_checks = 0
    stream = hashlib.sha256()
    for order in range(2, args.max_order + 1):
        for i in range(args.max_newton + 1):
            for j in range(args.max_newton + 1):
                closed = mixed_group_normal_forms(order, i, j)
                for group in ("BX", "BY", "XY", "BZ"):
                    direct = newton_literal(order, i, j, group)
                    assert sp.expand(direct - closed[group]) == 0
                    stream.update(
                        f"N,{order},{i},{j},{group},{sp.srepr(closed[group])};".encode()
                    )
                    normal_form_checks += 1

    # The positive antisymmetric carriers supplied by the consecutive-path
    # quotient.  The second identity follows from R=S+xT.
    cd_checks = two_step_checks = 0
    for k in range(1, args.max_order + 1):
        Rz, Rw = path_poly(k, z), path_poly(k, w)
        Sz, Sw = path_poly(k - 1, z), path_poly(k - 1, w)
        Dk = quotient(k)
        assert sp.expand(Rz * Sw - Sz * Rw - (z - w) * Dk) == 0
        assert all(value >= 0 for _, value in sp.Poly(Dk, z, w).terms())
        cd_checks += 1
        if k >= 2:
            Tz, Tw = path_poly(k - 2, z), path_poly(k - 2, w)
            Ek = sp.expand(quotient(k - 1) + Tz * Tw)
            assert sp.expand(Rz * Tw - Tz * Rw - (z - w) * Ek) == 0
            assert all(value >= 0 for _, value in sp.Poly(Ek, z, w).terms())
            two_step_checks += 1

    # Exact counterexamples to three tempting separate-payment claims.  These
    # are theorem-level obstructions: a single literal cell refutes each claim.
    witnesses = {}
    witness_specs = {
        "BX_plus_BY_nonnegative": (2, 4, 2, 2),
        "XY_plus_BZ_nonnegative": (2, 3, 0, 2),
        "all_mixed_nonnegative": (2, 4, 2, 3),
    }
    for name, (order, rank, i, j) in witness_specs.items():
        forms = mixed_group_normal_forms(order, i, j)
        Rz, Rw = path_poly(order - 2, z), path_poly(order - 2, w)
        groups = {
            "BB": int(coefficient(bb_integrand(Rz, Rw, i + j), rank, rank)),
            **{
                group: int(coefficient(forms[group], rank, rank))
                for group in ("BX", "BY", "XY", "BZ")
            },
        }
        if name == "BX_plus_BY_nonnegative":
            obstruction = groups["BX"] + groups["BY"]
        elif name == "XY_plus_BZ_nonnegative":
            obstruction = groups["XY"] + groups["BZ"]
        else:
            obstruction = sum(groups[group] for group in ("BX", "BY", "XY", "BZ"))
        assert obstruction < 0
        witnesses[name] = {
            "order": order,
            "rank": rank,
            "newton_index": [i, j],
            "groups": groups,
            "obstructed_sum": obstruction,
            "full_sum": sum(groups.values()),
        }

    # Raw coefficientwise positivity of the corrected path-Pascal gap also
    # fails, even before leaf Newton variables are introduced.
    F4 = polynomial_tuple(4, 0, 0)
    F3 = polynomial_tuple(3, 0, 0)
    F2 = polynomial_tuple(2, 0, 0)
    pascal_gap = sp.expand(nested(F4) - nested(F3) - z * w * nested(F2))
    twice_gap = sp.expand(2 * pascal_gap)
    assert coefficient(twice_gap, 4, 1) == -24
    assert coefficient(twice_gap, 4, 0) == -9

    dependency_paths = {
        "bb_sector": HERE / "prove_iso_double_broom_bb_sector_agent.py",
        "compact_operator": HERE / "derive_iso_nested_compact_operator_root.py",
        "path_cd": HERE / "prove_path_consecutive_cd_quotient_root.py",
    }
    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_DOUBLE_BROOM_MIXED_NORMAL_FORM_CD_REDUCTION",
        "statement": (
            "For every path order n>=2 and leaf-Newton index (i,j), the full "
            "BX+BY+XY+BZ integrand equals the four displayed oriented "
            "first-order carriers plus their z,w swaps."
        ),
        "operator": "L_(c,d)(Q)=cQ+d(partial_z-partial_w)Q",
        "operator_coefficients": {
            "BX_or_BY_c": str(CX),
            "BX_or_BY_d": str(DX),
            "XY_c": str(CXY),
            "XY_d": str(DXY),
            "BZ_c": str(CZ),
            "BZ_d": str(DZ),
        },
        "oriented_carriers": [
            "phi^i z^j P_(n-2)(z) w P_(n-3)(w)",
            "phi^j z^i P_(n-2)(z) w P_(n-3)(w)",
            "z^(i+1)w^(j+1)P_(n-3)(z)P_(n-3)(w)",
            "z^(i+j)P_(n-2)(z)w^2P_(n-4)(w)",
        ],
        "corrected_path_pascal_gap": (
            "N(F_n)-N(F_(n-1))-zwN(F_(n-2))="
            "2B_N(F_(n-1),XF_(n-2))-delta R(F_(n-2))"
        ),
        "defect_form": (
            "R(T)=z^2E(w)W(z)+w^2E(z)W(w)+zw[U(w)V(z)+U(z)V(w)]"
        ),
        "cd_carriers": {
            "consecutive": (
                "P_k(z)P_(k-1)(w)-P_(k-1)(z)P_k(w)=(z-w)D_k, D_k>=_coeff 0"
            ),
            "two_step": (
                "[P_k(z)P_(k-2)(w)-P_(k-2)(z)P_k(w)]/(z-w)="
                "D_(k-1)+P_(k-2)(z)P_(k-2)(w)>=_coeff 0"
            ),
        },
        "exact_route_obstructions": witnesses,
        "coefficientwise_pascal_gap_obstruction": {
            "order": 4,
            "newton_index": [0, 0],
            "twice_gap_z4w1": -24,
            "twice_gap_z4w0": -9,
            "twice_gap": str(twice_gap),
        },
        "finite_replay": {
            "ranges": vars(args),
            "tuple_recurrence_checks": recurrence_checks,
            "normal_form_group_checks": normal_form_checks,
            "consecutive_cd_checks": cd_checks,
            "two_step_cd_checks": two_step_checks,
            "value_stream_sha256": stream.hexdigest().upper(),
        },
        "dependency_source_sha256": {
            name: sha256(path) for name, path in dependency_paths.items()
        },
        "source_sha256": sha256(Path(__file__).resolve()),
        "remaining_obligation": (
            "Pay the diagonal of the corrected path-Pascal gap, equivalently "
            "dominate the signed four-operator mixed normal form by the proved "
            "BB reserve. CD-carrier coefficient positivity and raw bivariate "
            "coefficient positivity do not by themselves establish that sign."
        ),
        "scope_guard": (
            "This closes an exact all-order reduction only. It does not prove "
            "the connected double-broom terminal, arbitrary-forest ISO, or "
            "Erdos Problem 993."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
