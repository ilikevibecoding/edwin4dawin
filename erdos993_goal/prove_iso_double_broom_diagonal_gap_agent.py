#!/usr/bin/env python3
"""Exact algebra for the remaining double-broom path-Pascal diagonal gap.

This file is intentionally theorem-scoped: identities asserted here are
all-order polynomial identities.  Any bounded searches printed by ``main``
are labelled probes and are not used as proofs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sympy as sp
from math import comb
from pathlib import Path

from derive_iso_nested_compact_operator_root import add, polar, scale_x, symbols, z, w
from prove_iso_double_broom_mixed_reduction_agent import (
    CX,
    CXY,
    CZ,
    DX,
    DXY,
    DZ,
    defect,
    defect_form,
    nested_polar,
    path_poly,
    phi,
)
from prove_path_consecutive_cd_quotient_root import quotient


s = z + w
p = z * w
HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_double_broom_diagonal_gap_exact_agent_20260829.json"


def scale_one_plus_x(value):
    return add(value, scale_x(value))


def double_broom_states_from_consecutive_pair():
    """Return C=F_(n-1), D=F_(n-2) in terms of A=P_(k-4), B=P_(k-3).

    Thus T=P_(k-2), S=P_(k-1), R=P_k.  The gap pair uses the path
    triples D=(T,B,A) and C=(S,T,B); R is retained only to replay the
    surrounding three-step path recurrence.
    """
    A, B = symbols("A"), symbols("B")
    T = add(B, scale_x(A))
    S = add(scale_one_plus_x(B), scale_x(A))
    R = add(scale_one_plus_x(T), scale_x(B))

    def state(path0, path1, path2):
        base = path0
        left = scale_x(path1)
        right = scale_x(path1)
        both = scale_x(scale_x(path2))
        return (
            add(add(add(base, left), right), both),
            add(base, left),
            add(base, right),
            base,
        )

    D = state(T, B, A)
    C = state(S, T, B)
    return A, B, C, D


def corrected_gap_zero_newton():
    A, B, C, D = double_broom_states_from_consecutive_pair()
    value = sp.expand(2 * nested_polar(C, tuple(scale_x(q) for q in D)) - defect * defect_form(D))
    return A, B, value


def kernel(value):
    return sp.expand(polar(value, value))


def cross_kernel(left, right):
    return sp.expand(2 * polar(left, right))


def tuple_kernel(value):
    return kernel(value)


def bb_form(path0, h):
    pz, pw, _, _ = path0
    correction = 2 * s * phi**h
    if h:
        correction += h * s**2 * phi ** (h - 1)
    return sp.expand(s**2 * phi**h * tuple_kernel(path0) - defect * pz * pw * correction)


def oriented_product_operator(factor, left, right, c, d):
    lz, _, dlz, _ = left
    _, rw, _, drw = right
    q = factor * lz * rw
    dq = (
        (sp.diff(factor, z) - sp.diff(factor, w)) * lz * rw
        + factor * (dlz * rw - lz * drw)
    )
    return sp.expand(c * q + d * dq)


def terminal_form(path0, path1, path2, i, j):
    """Newton (i,j) terminal form for the path triple (R,S,T)."""
    h = i + j
    bx = oriented_product_operator(phi**i * z**j * w, path0, path1, CX, DX)
    by = oriented_product_operator(phi**j * z**i * w, path0, path1, CX, DX)
    xy = oriented_product_operator(z ** (i + 1) * w ** (j + 1), path1, path1, CXY, DXY)
    bz = oriented_product_operator(z**h * w**2, path0, path2, CZ, DZ)
    mixed = bx + swap(bx) + by + swap(by) + xy + swap(xy) + bz + swap(bz)
    return sp.expand(bb_form(path0, h) + mixed)


def corrected_gap_newton(i, j):
    A, B = symbols("A"), symbols("B")
    T = add(B, scale_x(A))
    S = add(scale_one_plus_x(B), scale_x(A))
    R = add(scale_one_plus_x(T), scale_x(B))
    gap = sp.expand(
        terminal_form(R, S, T, i, j)
        - terminal_form(S, T, B, i, j)
        - p * terminal_form(T, B, A, i, j)
    )
    return A, B, gap


def swap(expression):
    mapping = {z: w, w: z}
    by_name = {str(atom): atom for atom in expression.free_symbols}
    for name, atom in list(by_name.items()):
        if name in ("z", "w"):
            continue
        if name.endswith("z"):
            mapping[atom] = by_name.get(name[:-1] + "w", sp.Symbol(name[:-1] + "w"))
        elif name.endswith("w"):
            mapping[atom] = by_name.get(name[:-1] + "z", sp.Symbol(name[:-1] + "z"))
    return sp.expand(expression.xreplace(mapping))


def symmetric_sp_form(expression):
    result = sp.symmetrize(sp.expand(expression), [z, w], formal=True)
    symmetric, remainder, mapping = result
    assert remainder == 0
    u, v = mapping[0][0], mapping[1][0]
    return sp.expand(symmetric.xreplace({u: s, v: p})), sp.expand(symmetric)


def formal_sp_terms(expression):
    """Return {(s-degree,p-degree): coefficient} for a symmetric polynomial."""
    _, formal = symmetric_sp_form(expression)
    formal_s, formal_p = sp.symbols("s1 s2")
    return {
        monomial: sp.Rational(coefficient)
        for monomial, coefficient in sp.Poly(formal, formal_s, formal_p).terms()
    }


def central_values(s_degree):
    """Central, -delta, and delta^2 coefficients for s^s_degree."""
    if s_degree < 0 or s_degree % 2:
        return sp.Integer(0), sp.Integer(0), sp.Integer(0)
    half = s_degree // 2
    central = sp.Integer(comb(s_degree, half))
    catalan = central / (half + 1)  # -[diag] delta*s^s_degree
    fourth = 3 * central / ((half + 1) * (half + 2))
    return central, sp.cancel(catalan), sp.cancel(fourth)


def universal_kernel_layers(multiplier, reserve, a, b):
    """Diagonal layers of M*(pH-delta H_p)-delta*R*H, H=s^a p^b."""
    m_terms = formal_sp_terms(multiplier)
    r_terms = formal_sp_terms(reserve)
    layers = {}
    for (u, v), coefficient in m_terms.items():
        central, catalan, _ = central_values(a + u)
        layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + coefficient * central
        layers[u + 2 * v] = layers.get(u + 2 * v, 0) + b * coefficient * catalan
    for (u, v), coefficient in r_terms.items():
        _, catalan, _ = central_values(a + u)
        layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + coefficient * catalan
    return {layer: sp.cancel(value) for layer, value in layers.items() if value != 0}


def universal_cd_layers(factor, derivative_factor, a, b):
    """Diagonal layers of delta*F*H+2*delta^2*Q*H_p, H=s^a p^b."""
    layers = {}
    for (u, v), coefficient in formal_sp_terms(factor).items():
        _, catalan, _ = central_values(a + u)
        layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) - coefficient * catalan
    for (u, v), coefficient in formal_sp_terms(derivative_factor).items():
        _, _, fourth = central_values(a + u)
        layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + 2 * b * coefficient * fourth
    return {layer: sp.cancel(value) for layer, value in layers.items() if value != 0}


def operator_decomposition(i, j):
    """Extract the four universal diagonal operators from the Newton gap."""
    A, B, gap = corrected_gap_newton(i, j)
    Az, Aw, dAz, dAw = A
    Bz, Bw, dBz, dBw = B
    ma = sp.cancel(gap.coeff(dAz * Aw) * 2 / (z - w))
    mb = sp.cancel(gap.coeff(dBz * Bw) * 2 / (z - w))
    ca = gap.coeff(dAz * Bw)
    cb = gap.coeff(dBz * Aw)
    pc = sp.cancel(2 * (ca + cb) / (z - w))
    e = sp.cancel((ca - cb) / 2)
    q = sp.cancel(2 * e / (z - w) ** 2)
    residual = sp.expand(
        gap - ma * kernel(A) - mb * kernel(B) - pc / 2 * cross_kernel(A, B)
    )
    aa = residual.coeff(Az * Aw)
    bb = residual.coeff(Bz * Bw)
    x = residual.coeff(Az * Bw)
    y = residual.coeff(Bz * Aw)
    ra = sp.cancel(-aa / defect)
    rb = sp.cancel(-bb / defect)
    rc = sp.cancel(-(x + y) / (2 * defect))
    v = sp.cancel((y - x) / 2)
    f = sp.cancel((v * (z - w) - 2 * e) / defect)
    return A, B, gap, {
        "A": (ma, ra),
        "B": (mb, rb),
        "C": (pc / 2, rc),
        "D": (f, q),
    }


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def central_ratio(shift, variable):
    """C(2(m+shift),m+shift)/C(2m,m), as a positive rational function."""
    value = sp.Integer(1)
    for k in range(1, shift + 1):
        value *= 2 * (2 * variable + 2 * k - 1) / (variable + k)
    return sp.cancel(value)


def symbolic_central_values(parity, s_degree, variable):
    """Central values normalized by C(2m,m), for a=2m+parity."""
    if (parity + s_degree) % 2:
        return sp.Integer(0), sp.Integer(0), sp.Integer(0)
    shift = (parity + s_degree) // 2
    central = central_ratio(shift, variable)
    catalan = sp.cancel(central / (variable + shift + 1))
    fourth = sp.cancel(3 * central / ((variable + shift + 1) * (variable + shift + 2)))
    return central, catalan, fourth


def normalized_layer_certificate(kind, multiplier, reserve):
    """Prove every universal monomial layer by a positive rational certificate."""
    m_var, b_var = sp.symbols("m b", nonnegative=True, integer=True)
    multiplier_terms = formal_sp_terms(multiplier)
    reserve_terms = formal_sp_terms(reserve)
    certificates = []
    for parity in (0, 1):
        layers = {}
        if kind == "kernel":
            for (u, v), coefficient in multiplier_terms.items():
                central, catalan, _ = symbolic_central_values(parity, u, m_var)
                layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + coefficient * central
                layers[u + 2 * v] = layers.get(u + 2 * v, 0) + b_var * coefficient * catalan
            for (u, v), coefficient in reserve_terms.items():
                _, catalan, _ = symbolic_central_values(parity, u, m_var)
                layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + coefficient * catalan
        else:
            assert kind == "cd"
            for (u, v), coefficient in multiplier_terms.items():
                _, catalan, _ = symbolic_central_values(parity, u, m_var)
                layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) - coefficient * catalan
            for (u, v), coefficient in reserve_terms.items():
                _, _, fourth = symbolic_central_values(parity, u, m_var)
                layers[u + 2 * v + 2] = layers.get(u + 2 * v + 2, 0) + 2 * b_var * coefficient * fourth

        for layer, expression in sorted(layers.items()):
            expression = sp.cancel(expression)
            numerator, denominator = sp.fraction(expression)
            numerator = sp.expand(numerator)
            denominator = sp.expand(denominator)
            if sp.Poly(denominator, m_var, b_var).LC() < 0:
                numerator, denominator = -numerator, -denominator
            numerator_coefficients = sp.Poly(numerator, m_var, b_var).coeffs()
            denominator_coefficients = sp.Poly(denominator, m_var, b_var).coeffs()
            assert all(coefficient >= 0 for coefficient in numerator_coefficients)
            assert all(coefficient >= 0 for coefficient in denominator_coefficients)
            assert denominator.subs({m_var: 0, b_var: 0}) > 0
            certificates.append(
                {
                    "parity": parity,
                    "layer": layer,
                    "numerator": str(sp.factor(numerator)),
                    "denominator": str(sp.factor(denominator)),
                }
            )
    return certificates


def path_tuple(order):
    pz, pw = path_poly(order, z), path_poly(order, w)
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def literal_terminal(order, i, j):
    return terminal_form(path_tuple(order - 2), path_tuple(order - 3), path_tuple(order - 4), i, j)


def all_diagonal_values(expression):
    polynomial = sp.Poly(sp.expand(expression), z, w)
    maximum = max(polynomial.degree(z), polynomial.degree(w))
    return [polynomial.coeff_monomial(z**rank * w**rank) for rank in range(maximum + 1)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--newton-collar", type=int, default=5)
    parser.add_argument("--carrier-replay-order", type=int, default=20)
    args = parser.parse_args()
    assert 0 <= args.newton_collar <= 5
    assert args.carrier_replay_order >= 1

    selected = [
        (i, j)
        for total in range(args.newton_collar + 1)
        for i in range(total // 2 + 1)
        for j in [total - i]
    ]
    layer_report = {}
    layer_count = 0
    stream = hashlib.sha256()

    for i, j in selected:
        A, B, gap, operators = operator_decomposition(i, j)
        Az, Aw, dAz, dAw = A
        Bz, Bw, dBz, dBw = B
        ma, ra = operators["A"]
        mb, rb = operators["B"]
        mc, rc = operators["C"]
        f, q = operators["D"]
        determinant = Bz * Aw - Az * Bw
        determinant_difference = dBz * Aw - dAz * Bw - Bz * dAw + Az * dBw

        kernel_part = sp.expand(
            ma * kernel(A)
            + mb * kernel(B)
            + mc * cross_kernel(A, B)
            - defect * (
                ra * Az * Aw
                + rb * Bz * Bw
                + rc * (Az * Bw + Bz * Aw)
            )
        )
        residual = sp.expand(gap - kernel_part)
        ca = gap.coeff(dAz * Bw)
        cb = gap.coeff(dBz * Aw)
        e = sp.cancel((ca - cb) / 2)
        cross_a = residual.coeff(Az * Bw)
        cross_b = residual.coeff(Bz * Aw)
        v = sp.cancel((cross_b - cross_a) / 2)
        assert sp.expand(residual - (v * determinant - e * determinant_difference)) == 0
        assert sp.expand(v * (z - w) - 2 * e - defect * f) == 0
        assert sp.expand(e - defect * q) == 0

        cell = {}
        for name, (multiplier, reserve) in operators.items():
            kind = "cd" if name == "D" else "kernel"
            certificates = normalized_layer_certificate(kind, multiplier, reserve)
            layer_count += len(certificates)
            for certificate in certificates:
                stream.update(
                    f"L,{i},{j},{name},{certificate['parity']},{certificate['layer']},"
                    f"{certificate['numerator']},{certificate['denominator']};".encode()
                )
            cell[name] = {
                "kind": kind,
                "multiplier_sp": str(symmetric_sp_form(multiplier)[1]),
                "reserve_or_derivative_sp": str(symmetric_sp_form(reserve)[1]),
                "normalized_layers": certificates,
            }
        layer_report[f"{i},{j}"] = cell

    # The four carriers are elementary-symmetric-positive.  The finite loop
    # replays this fact; the all-order proofs are the displayed factorization,
    # positive partial fractions, and CD recurrence recorded in the report.
    carrier_cells = 0
    for order in range(1, args.carrier_replay_order + 1):
        az, aw = path_poly(order - 1, z), path_poly(order - 1, w)
        bz, bw = path_poly(order, z), path_poly(order, w)
        carriers = {
            "AA": sp.expand(az * aw),
            "BB": sp.expand(bz * bw),
            "cross": sp.expand(az * bw + bz * aw),
            "CD": quotient(order),
        }
        for name, expression in carriers.items():
            terms = formal_sp_terms(expression)
            assert all(coefficient >= 0 for coefficient in terms.values())
            carrier_cells += len(terms)
            stream.update(f"C,{order},{name},{sorted(terms.items())};".encode())

    # Exact low path-order bases.  These checks exhaust every supported rank
    # of fixed polynomials, so they are proofs of the n=2,3 bases and n=4,5
    # gaps for the stated finite Newton collar, not extrapolated searches.
    base_terminal_cells = base_gap_cells = 0
    base_terminal_minimum = base_gap_minimum = None
    for i, j in selected:
        for order in (2, 3):
            values = all_diagonal_values(literal_terminal(order, i, j))
            assert all(value >= 0 for value in values)
            for rank, value in enumerate(values):
                cell = (int(value), order, rank, i, j)
                base_terminal_minimum = cell if base_terminal_minimum is None or cell < base_terminal_minimum else base_terminal_minimum
                base_terminal_cells += 1
                stream.update(f"B,{order},{rank},{i},{j},{value};".encode())
        for order in (4, 5):
            gap = sp.expand(
                literal_terminal(order, i, j)
                - literal_terminal(order - 1, i, j)
                - p * literal_terminal(order - 2, i, j)
            )
            values = all_diagonal_values(gap)
            assert all(value >= 0 for value in values)
            for rank, value in enumerate(values):
                cell = (int(value), order, rank, i, j)
                base_gap_minimum = cell if base_gap_minimum is None or cell < base_gap_minimum else base_gap_minimum
                base_gap_cells += 1
                stream.update(f"G,{order},{rank},{i},{j},{value};".encode())

    dependency_paths = {
        "mixed_reduction": HERE / "prove_iso_double_broom_mixed_reduction_agent.py",
        "bb_sector": HERE / "prove_iso_double_broom_bb_sector_agent.py",
        "path_cd": HERE / "prove_path_consecutive_cd_quotient_root.py",
        "compact_operator": HERE / "derive_iso_nested_compact_operator_root.py",
    }
    report = {
        "marker": "PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H_LE_5",
        "theorem": (
            "For every connected double broom path order n>=2, every rank r, "
            "and every leaf-Newton pair (i,j) with i+j<=5, the terminal four-minor "
            "Newton coefficient is nonnegative. Equivalently, the corrected "
            "path-Pascal gap is nonnegative in this collar, with exact bases."
        ),
        "selected_unordered_newton_pairs": selected,
        "path_pascal_gap": (
            "G_(i,j)=N_(i,j)(F_n)-N_(i,j)(F_(n-1))-zw N_(i,j)(F_(n-2))"
        ),
        "consecutive_path_pair": "A=P_(n-6), B=P_(n-5), for n>=6",
        "universal_operator_decomposition": {
            "kernel_operator": "O_(M,R)(H)=M[pH-delta partial_p H]-delta R H",
            "cd_operator": "O_CD(F,Q)(H)=delta F H+2 delta^2 Q partial_p H",
            "carriers": [
                "H_A=A(z)A(w)",
                "H_B=B(z)B(w)",
                "H_C=A(z)B(w)+B(z)A(w)",
                "D=[B(z)A(w)-A(z)B(w)]/(z-w)",
            ],
        },
        "carrier_sp_positivity_proofs": {
            "same_path_products": (
                "P_m(z)P_m(w)=product_t(1+lambda_t(z+w)+lambda_t^2 zw), lambda_t>0"
            ),
            "cross_product": (
                "P_(m-1)/P_m=c+sum_t rho_t/(1+lambda_t x), c>=0,rho_t>0 by strict "
                "path-root interlacing; multiplying the symmetrized ratio by "
                "P_m(z)P_m(w) gives only (2+lambda_t(z+w)) times positive factors"
            ),
            "cd": (
                "D_m=P_(m-2)(z)P_(m-2)(w)+zw D_(m-2), D_1=D_2=1"
            ),
        },
        "diagonal_basis_calculus": {
            "carrier_monomial": "H=(z+w)^a(zw)^b, a=2m+epsilon",
            "central": "[diag](z+w)^(2m)=C(2m,m)",
            "minus_delta": "-[diag]delta(z+w)^(2m)=C(2m,m)/(m+1)",
            "delta_squared": (
                "[diag]delta^2(z+w)^(2m)=3C(2m,m)/[(m+1)(m+2)]"
            ),
            "certificate_rule": (
                "After division by C(2m,m), every parity/weight layer below has "
                "a numerator and denominator with nonnegative coefficients in m,b, "
                "and the denominator has positive constant term."
            ),
        },
        "operator_layer_certificates": layer_report,
        "exact_replay": {
            "newton_collar": args.newton_collar,
            "operator_layers": layer_count,
            "carrier_orders": [1, args.carrier_replay_order],
            "carrier_sp_cells": carrier_cells,
            "base_terminal_cells": base_terminal_cells,
            "base_terminal_minimum": base_terminal_minimum,
            "base_gap_cells": base_gap_cells,
            "base_gap_minimum": base_gap_minimum,
            "value_stream_sha256": stream.hexdigest().upper(),
        },
        "dependency_source_sha256": {name: sha256(path) for name, path in dependency_paths.items()},
        "source_sha256": sha256(Path(__file__).resolve()),
        "remaining_obligation": (
            "Prove the same universal diagonal operator layers for arbitrary "
            "leaf-Newton indices i,j with i+j>=6, or find an exact negative cell."
        ),
        "scope_guard": (
            "This is an exact all-path-order/all-rank theorem only for the finite "
            "Newton collar i+j<=5. It does not establish the full double-broom "
            "terminal family, arbitrary-forest ISO, or Erdős Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "selected_unordered_newton_pairs": selected,
        "operator_layers": layer_count,
        "carrier_sp_cells": carrier_cells,
        "base_terminal_cells": base_terminal_cells,
        "base_gap_cells": base_gap_cells,
        "value_stream_sha256": report["exact_replay"]["value_stream_sha256"],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2))


if __name__ == "__main__":
    main()
