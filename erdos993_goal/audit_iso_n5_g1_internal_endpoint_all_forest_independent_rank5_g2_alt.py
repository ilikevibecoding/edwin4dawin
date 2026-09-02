#!/usr/bin/env python3
"""Independent exact audit of the internal-endpoint all-forest g1 theorem.

This audit deliberately imports none of the endpoint theorem, factor,
parameter, cone, or interval-generation modules.  It reconstructs the raw
rank-five g1 functional, the endpoint rows, broom rows, Newton transforms,
the fifteen nonzero componentwise-deletion interval generators, the
augmented forest generators, and the concrete C5 payment directly here.
Every one of the theorem's 53 small residuals and every one of the pinned
large theorem's 28 residuals is then replayed from the saved rational
weights coefficient-for-coefficient.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n5_g1_internal_endpoint_all_forest_independent_audit_"
    "rank5_g2_alt_20260830.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_"
    "AUDIT_RANK5_G2_ALT"
)

THEOREM_SOURCE = "prove_iso_n5_g1_internal_endpoint_all_forest_root.py"
THEOREM_REPORT = "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json"
PINNED_THEOREM = {
    THEOREM_SOURCE: "6AC88AE1DD91F9844A9E5E5D6782AD0FD8A566CE21F8BEB7BA0D2EF3E985319A",
    THEOREM_REPORT: "8F30FB08E62709D3449B16F7E7B6DFC12241F7D810446D6CBBDD5BA439E0890E",
}

REPORT_FILES = {
    "factor": "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json",
    "large_probe": "iso_n5_g1_internal_endpoint_parent_interval_cone_probe_root_20260830.json",
    "large_theorem": "iso_n5_g1_internal_endpoint_broom_large_all_parent_exact_root_20260830.json",
    "small": "iso_n5_g1_internal_endpoint_small_parent_interval_cone_probe_root_20260830.json",
    "augmented": "iso_n5_g1_internal_endpoint_small_augmented_cone_probe_root_20260830.json",
    "shifted": "iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_probe_root_20260830.json",
    "boundary": "iso_n5_g1_internal_endpoint_boundary_global_payment_probe_root_20260830.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank: int):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank))
        / sp.Integer(factorial(rank))
    )


def convolve(left, right, maximum: int = 6):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def nested_rank(rows, rank: int):
    """Independent literal copy of the defining four-row coefficient form."""
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_multiply(rows, amount, maximum: int = 6):
    return tuple(
        tuple(
            sp.expand(sum(choose(amount, j) * at(row, rank - j) for j in range(rank + 1)))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(7))
        for crow, drow in zip(crows, drows)
    )


def independent_raw_g1():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")

    def gamma(amount: int):
        tm = add_xd(isolate_multiply(crows, amount), drows)
        t0 = add_xd(crows, drows)
        lower = sum(
            nested_rank(isolate_multiply(crows, value, 5), 4)
            for value in range(amount)
        )
        return sp.expand(nested_rank(tm, 5) - nested_rank(t0, 5) - lower)

    g1 = gamma(1)
    assert len(sp.Poly(g1, *sorted(g1.free_symbols, key=str)).terms()) == 54
    return crows, drows, g1


def independent_endpoint_expression():
    generic_c, generic_d, raw_g1 = independent_raw_g1()
    x = tuple(sp.symbols("x0:7"))
    u = tuple(sp.symbols("u0:7"))
    y = tuple(sp.symbols("y0:7"))
    child_z = tuple(sp.symbols("z0:7"))
    r = tuple(sp.symbols("r0:7"))
    q = tuple(sp.symbols("q0:7"))
    r_with_root = tuple(
        sp.expand(r[rank] + (q[rank - 1] if rank >= 1 else 0))
        for rank in range(7)
    )
    crows = (
        convolve(x, r_with_root),
        convolve(u, r_with_root),
        convolve(x, r),
        convolve(u, r),
    )
    drows = (
        convolve(y, r), convolve(child_z, r),
        convolve(y, r), convolve(child_z, r),
    )
    substitutions = {
        symbol: value
        for generic_row, actual_row in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic_row, actual_row)
    }
    constants = {row[0]: 1 for row in (x, u, y, child_z, r, q)}
    expression = sp.expand(raw_g1.subs(substitutions).subs(constants))
    rows = {"X": x, "U": u, "Y": y, "Z": child_z, "R": r, "Q": q}
    return expression, rows


def ordered_polynomial_hash(expression) -> tuple[int, str]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
    )
    return len(polynomial.terms()), hashlib.sha256(stream.encode()).hexdigest().upper()


def path_row(order: int, maximum: int = 6):
    if order == -2:
        return (sp.Integer(0),) * (maximum + 1)
    if order <= 0:
        return (sp.Integer(1),) + (sp.Integer(0),) * maximum
    return tuple(
        sp.Integer(comb(order - rank + 1, rank))
        if order - rank + 1 >= rank else sp.Integer(0)
        for rank in range(maximum + 1)
    )


def add_rows(left, right, maximum: int = 6):
    return tuple(sp.expand(at(left, rank) + at(right, rank)) for rank in range(maximum + 1))


def shift_row(row, amount: int = 1, maximum: int = 6):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


def child_rows(length: int, collisions):
    leaves = tuple(choose(collisions, rank) for rank in range(7))
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    x = add_rows(convolve(leaves, p1), shift_row(p2))
    u = convolve(leaves, p1)
    y = add_rows(convolve(leaves, p2), shift_row(p3))
    child_z = convolve(leaves, p2)
    return x, u, y, child_z


def substitute_child(expression, rows, length: int, collision_symbol):
    actual = child_rows(length, collision_symbol)
    substitutions = {
        rows[name][rank]: actual[index][rank]
        for index, name in enumerate(("X", "U", "Y", "Z"))
        for rank in range(1, 7)
    }
    return sp.expand(expression.subs(substitutions))


def tensor_newton(expression, variables):
    """Independent forward-difference transform with cached grid values."""
    variables = tuple(variables)
    degrees = tuple(sp.Poly(expression, variable).degree() for variable in variables)
    grid = {
        point: sp.expand(expression.subs(dict(zip(variables, point))))
        for point in itertools.product(*(range(degree + 1) for degree in degrees))
    }
    coefficients = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for point in itertools.product(*(range(bound + 1) for bound in index)):
            sign = (-1) ** sum(bound - entry for bound, entry in zip(index, point))
            weight = sp.prod(sp.binomial(bound, entry) for bound, entry in zip(index, point))
            value += sign * weight * grid[point]
        coefficients[index] = sp.expand(value)
    reconstructed = sp.expand(sum(
        value * sp.prod(choose(variable, rank) for variable, rank in zip(variables, index))
        for index, value in coefficients.items()
    ))
    assert sp.expand(reconstructed - expression) == 0
    return degrees, coefficients


def phi_coefficient(p, h, left: int, right: int):
    return (
        at(p, left - 1) * at(p, right)
        + at(p, left) * at(p, right - 1)
        + at(p, left - 1) * at(h, right - 1)
        + at(h, left - 1) * at(p, right - 1)
    )


def kernel_coefficient(row, left: int, right: int):
    return (
        at(row, left - 1) * at(row, right - 1)
        + sp.Rational(1, 2) * (
            (left + right) * at(row, left) * at(row, right)
            - (right + 1) * at(row, left - 1) * at(row, right + 1)
            - (left + 1) * at(row, left + 1) * at(row, right - 1)
        )
    )


def psi_coefficient(p, h, left: int, right: int):
    x = tuple(at(p, index) + at(h, index - 1) for index in range(10))
    c = tuple(at(x, index) + at(p, index - 1) for index in range(10))
    return sp.expand(
        kernel_coefficient(c, left, right)
        - kernel_coefficient(x, left, right)
        - kernel_coefficient(p, left - 1, right - 1)
        - sp.Rational(1, 2) * phi_coefficient(p, h, left - 1, right - 1)
    )


def independent_interval_expressions(rows):
    p = sp.symbols("p0:8", nonnegative=True)
    h = sp.symbols("h0:7", nonnegative=True)
    cells = []
    for psi_degree in range(2, 9):
        phi_degree = 9 - psi_degree
        for layer in range(phi_degree // 2 + 1):
            lower = max(0, 4 - (phi_degree - layer))
            upper = min(psi_degree, 4 - layer)
            cells.append(sp.expand(sum(
                psi_coefficient(p, h, left, psi_degree - left)
                for left in range(lower, upper + 1)
            )))
    unique = []
    for value in cells:
        if value not in unique:
            unique.append(value)
    mapping = {
        p[0]: 1, h[0]: 1,
        **{p[index]: rows["R"][index] for index in range(1, 7)},
        **{h[index]: rows["Q"][index] for index in range(1, 6)},
    }
    interval = [sp.expand(value.subs(mapping)) for value in unique[1:]]
    assert len(unique) == 16 and len(interval) == 15
    return [(f"interval_sum_{index}", value) for index, value in enumerate(interval, 2)]


def independent_parent_basis(rows):
    q, r = rows["Q"], rows["R"]
    variables = tuple(list(q[1:6]) + list(r[1:7]))
    basis = independent_interval_expressions(rows)
    for name, row in (("R", r), ("Q", q)):
        basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])
    multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
    for rank in range(1, 6):
        difference = r[rank] - q[rank]
        for multiplier_name, multiplier in multipliers:
            basis.append((
                f"dominance_{rank}_times_{multiplier_name}",
                sp.expand(difference * multiplier),
            ))
    assert len(basis) == 83
    return variables, basis


def c5_parent_form(rows, length: int, collision_count: int):
    x, u, _y, _child_z = child_rows(length, sp.Integer(collision_count))
    r = (sp.Integer(1), *rows["R"][1:7])
    q = (sp.Integer(1), *rows["Q"][1:6], sp.Integer(0))
    r_with_root = tuple(
        sp.expand(r[index] + (q[index - 1] if index >= 1 else 0))
        for index in range(7)
    )
    crows = (
        convolve(x, r_with_root), convolve(u, r_with_root),
        convolve(x, r), convolve(u, r),
    )
    zz, ww = sp.symbols("__audit_z __audit_w")

    def polynomial(row, variable):
        return sum(value * variable ** index for index, value in enumerate(row))

    e, cu, cv, cw = crows
    defect = sp.expand(
        zz ** 2 * polynomial(e, ww) * polynomial(cw, zz)
        + ww ** 2 * polynomial(e, zz) * polynomial(cw, ww)
        + zz * ww * (
            polynomial(cu, ww) * polynomial(cv, zz)
            + polynomial(cu, zz) * polynomial(cv, ww)
        )
    )
    return sp.expand(
        defect.coeff(zz, 4).coeff(ww, 4)
        - defect.coeff(zz, 3).coeff(ww, 5)
    )


def normalized_source_weights(saved: dict, field: str) -> dict[str, str]:
    if field == "interval_sum_weights":
        return {
            f"interval_sum_{label}": str(sp.Rational(value))
            for label, value in saved[field].items()
        }
    return {label: str(sp.Rational(value)) for label, value in saved[field].items()}


def replay_decomposition(form, variables, basis, theorem_row, source_row, source_field):
    assert source_row["exact_rational_certificate"] is True
    weights = {
        label: sp.Rational(value) for label, value in theorem_row["weights"].items()
    }
    assert all(value >= 0 for value in weights.values())
    assert {label: str(value) for label, value in weights.items()} == normalized_source_weights(
        source_row, source_field
    )
    basis_map = dict(basis)
    assert all(label in basis_map for label in weights)
    residual = sp.expand(form - sum(
        value * basis_map[label] for label, value in weights.items()
    ))
    polynomial = sp.Poly(residual, *variables)
    coefficients = polynomial.coeffs()
    assert coefficients and all(value >= 0 for value in coefficients)
    stream = "".join(
        f"{powers}:{value};" for powers, value in polynomial.terms()
    )
    digest = hashlib.sha256(stream.encode()).hexdigest().upper()
    assert digest == theorem_row["residual_stream_sha256"]
    assert digest == source_row["residual_stream_sha256"]
    assert len(polynomial.terms()) == theorem_row["residual_nonnegative_monomials"]
    assert len(polynomial.terms()) == source_row["residual_nonnegative_monomials"]
    assert str(min(coefficients)) == theorem_row["minimum_residual_scalar"]
    assert str(min(coefficients)) == source_row["minimum_residual_scalar"]
    return {
        "residual_stream_sha256": digest,
        "residual_nonnegative_monomials": len(polynomial.terms()),
        "minimum_residual_scalar": str(min(coefficients)),
        "weight_count": len(weights),
    }


def stable_broom_parameterization(expression, rows):
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h

    def path_coefficient(order, rank):
        return choose(order - rank + 1, rank)

    def isolate_times_path(isolates, order, rank):
        return sp.expand(sum(
            choose(isolates, j) * path_coefficient(order, rank - j)
            for j in range(rank + 1)
        ))

    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        child_z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(child_z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: child_z_value,
        })
    return sp.expand(expression.subs(substitutions)), h, k


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINNED_THEOREM} == PINNED_THEOREM
    theorem = load(THEOREM_REPORT)
    assert theorem["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_ROOT"
    assert theorem["source_sha256"] == PINNED_THEOREM[THEOREM_SOURCE]
    assert {name: sha256(HERE / name) for name in theorem["dependencies_sha256"]} == theorem[
        "dependencies_sha256"
    ]

    reports = {label: load(name) for label, name in REPORT_FILES.items()}
    expression, rows = independent_endpoint_expression()
    term_count, endpoint_hash = ordered_polynomial_hash(expression)
    assert term_count == reports["factor"]["normalized_g1"]["monomials"]
    assert endpoint_hash == reports["factor"]["normalized_g1"][
        "ordered_term_stream_sha256"
    ]
    variables, full_basis = independent_parent_basis(rows)
    interval_basis = [
        (label, value) for label, value in full_basis if label.startswith("interval_sum_")
    ]
    assert len(interval_basis) == 15

    collision, tail = sp.symbols("k t", integer=True, nonnegative=True)
    reduced = {
        length: substitute_child(expression, rows, length, collision)
        for length in range(1, 8)
    }
    newton = {
        length: tensor_newton(value, (collision,))[1]
        for length, value in reduced.items()
    }

    augmented_rows = {
        (row["ell"], row["k_index"]): row for row in reports["augmented"]["forms"]
    }
    small_rows = {
        (row["ell"], row["k_index"]): row for row in reports["small"]["forms"]
    }
    shifted_rows = {
        (row["ell"], row["shift"], row["t_index"]): row
        for row in reports["shifted"]["rows"]
        if row["row_kind"] == "shifted_newton_coefficient"
    }
    boundary_rows = {
        (row["ell"], row["k"], row["generator_set"]): row
        for row in reports["boundary"]["rows"]
    }
    shifted_coefficients = {
        (length, shift): tensor_newton(
            sp.expand(reduced[length].subs(collision, shift + tail)), (tail,)
        )[1]
        for length, shift in ((1, 2), (2, 1), (3, 1))
    }

    small_audit = []
    for theorem_row in theorem["small_exact_audit"]["rows"]:
        region = theorem_row["region"]
        length = theorem_row["ell"]
        if region == "small_augmented_newton":
            index = theorem_row["k_index"]
            form = newton[length][(index,)]
            basis = full_basis
            source = augmented_rows[(length, index)]
            field = "basis_weights"
        elif region == "small_interval_newton":
            index = theorem_row["k_index"]
            form = newton[length][(index,)]
            basis = interval_basis
            source = small_rows[(length, index)]
            field = "interval_sum_weights"
        elif region == "concrete_boundary_C5_payment":
            collision_value = theorem_row["k_value"]
            form = sp.expand(reduced[length].subs(collision, collision_value))
            c5 = c5_parent_form(rows, length, collision_value)
            basis = [*full_basis, ("C5_C", c5)]
            source = boundary_rows[(length, collision_value, "C5_only")]
            field = "basis_weights"
        elif region == "shifted_collision_tail":
            shift = theorem_row["k_shift"]
            index = theorem_row["t_index"]
            form = shifted_coefficients[(length, shift)][(index,)]
            basis = full_basis
            source = shifted_rows[(length, shift, index)]
            field = "basis_weights"
        else:
            raise AssertionError(region)
        result = replay_decomposition(
            form, variables, basis, theorem_row, source, field
        )
        small_audit.append({
            "region": region,
            "ell": length,
            **{key: theorem_row[key] for key in (
                "k_index", "k_value", "k_shift", "t_index"
            ) if key in theorem_row},
            **result,
        })

    assert len(small_audit) == 53
    assert {
        region: sum(row["region"] == region for row in small_audit)
        for region in {row["region"] for row in small_audit}
    } == {
        "small_augmented_newton": 2,
        "small_interval_newton": 27,
        "concrete_boundary_C5_payment": 3,
        "shifted_collision_tail": 21,
    }

    parameterized, h, k = stable_broom_parameterization(expression, rows)
    degrees, large_coefficients = tensor_newton(parameterized, (h, k))
    assert degrees == (6, 6)
    large_probe_rows = {
        (row["h_index"], row["k_index"]): row
        for row in reports["large_probe"]["forms"]
    }
    large_theorem_rows = {
        (row["h_index"], row["k_index"]): row
        for row in reports["large_theorem"]["tensor_binomial_certificate"]["audit_rows"]
    }
    large_audit = []
    for index, form in sorted(large_coefficients.items()):
        if form == 0:
            continue
        probe_row = large_probe_rows[index]
        theorem_large_row = large_theorem_rows[index]
        synthetic_theorem_row = {
            "weights": {
                f"interval_sum_{label}": value
                for label, value in theorem_large_row["interval_sum_weights"].items()
            },
            "residual_stream_sha256": theorem_large_row["residual_stream_sha256"],
            "residual_nonnegative_monomials": theorem_large_row[
                "residual_nonnegative_monomials"
            ],
            "minimum_residual_scalar": probe_row["minimum_residual_scalar"],
        }
        result = replay_decomposition(
            form, variables, interval_basis, synthetic_theorem_row,
            probe_row, "interval_sum_weights",
        )
        assert theorem_large_row["residual_stream_sha256"] == result[
            "residual_stream_sha256"
        ]
        assert theorem_large_row["residual_nonnegative_monomials"] == result[
            "residual_nonnegative_monomials"
        ]
        large_audit.append({
            "h_index": index[0], "k_index": index[1], **result
        })
    assert len(large_audit) == 28
    assert reports["large_theorem"]["tensor_binomial_certificate"][
        "unresolved_forms"
    ] == 0
    assert theorem["large_exact_audit"]["nonzero_parent_forms"] == 28

    def classify(ell: int, collisions: int) -> str:
        if ell == 1:
            return "ell1_k0" if collisions == 0 else (
                "ell1_k1" if collisions == 1 else "ell1_tail"
            )
        if ell in (2, 3):
            return "ell23_k0" if collisions == 0 else "ell23_tail"
        if 4 <= ell <= 7:
            return "ell4_7_all"
        if ell >= 8:
            return "ell8plus_all"
        raise AssertionError((ell, collisions))

    partition_grid = {
        (ell, collisions): classify(ell, collisions)
        for ell in range(1, 25) for collisions in range(25)
    }
    assert len(partition_grid) == 24 * 25
    assert theorem["coverage_is_disjoint_and_exhaustive"] is True

    small_stream = "".join(
        f"{row['region']}:{row['ell']}:{row['residual_stream_sha256']};"
        for row in small_audit
    )
    large_stream = "".join(
        f"{row['h_index']},{row['k_index']}:{row['residual_stream_sha256']};"
        for row in large_audit
    )
    report = {
        "marker": MARKER,
        "audited_theorem": {
            "source": THEOREM_SOURCE,
            "report": THEOREM_REPORT,
            "source_sha256": PINNED_THEOREM[THEOREM_SOURCE],
            "report_sha256": PINNED_THEOREM[THEOREM_REPORT],
            "marker": theorem["marker"],
            "all_dependency_hashes_match_disk": True,
        },
        "independent_reconstruction": {
            "imports_any_endpoint_theorem_or_probe_logic": False,
            "raw_g1_monomials": 54,
            "endpoint_monomials": term_count,
            "endpoint_ordered_term_stream_sha256": endpoint_hash,
            "parent_basis_size": len(full_basis),
            "nonzero_interval_generators": len(interval_basis),
            "newton_transform_reconstructed_polynomials_exactly": True,
            "concrete_C5_form_built_from_defect_operator": True,
        },
        "small_residual_audit": {
            "rows": len(small_audit),
            "all_saved_weights_nonnegative": True,
            "all_residual_coefficients_nonnegative": True,
            "region_counts": {
                region: sum(row["region"] == region for row in small_audit)
                for region in sorted({row["region"] for row in small_audit})
            },
            "ordered_residual_audit_sha256": hashlib.sha256(
                small_stream.encode()
            ).hexdigest().upper(),
            "records": small_audit,
        },
        "large_residual_audit": {
            "degrees_h_k": list(degrees),
            "rows": len(large_audit),
            "all_saved_weights_nonnegative": True,
            "all_residual_coefficients_nonnegative": True,
            "ordered_residual_audit_sha256": hashlib.sha256(
                large_stream.encode()
            ).hexdigest().upper(),
            "records": large_audit,
        },
        "coverage_audit": {
            "partition": [
                "ell=1: k=0, k=1, or k=2+t",
                "ell=2,3: k=0 or k=1+t",
                "ell=4..7: every k",
                "ell=8+h: every k",
            ],
            "disjoint_and_exhaustive_for_all_integer_ell>=1_k>=0": True,
            "finite_grid_sanity_cells": len(partition_grid),
        },
        "scope": (
            "Independent algebra/residual/coverage audit of the exact internal-"
            "spine broom endpoint g1 theorem.  The sign of each named generator "
            "is inherited from the theorem's separately pinned exact generator "
            "certificates; this audit does not re-prove those foundation theorems "
            "or assert any other g1/g2 mode, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "small_residuals": len(small_audit),
        "large_residuals": len(large_audit),
        "unresolved": 0,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
