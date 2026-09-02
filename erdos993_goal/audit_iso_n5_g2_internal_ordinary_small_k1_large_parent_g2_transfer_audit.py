#!/usr/bin/env python3
"""Independent exact audit of the two large-parent small-k1 g2 cells.

The two targets are reconstructed as literal first forward differences of the
raw rank-five g2 functional.  The forest bounds, occupation partition,
normalization, and tensor Bernstein conversion are rebuilt here.  No function
from the producer theorem or its Bernstein probe is imported.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import numpy as np
import sympy as sp

from audit_iso_n5_g2_internal_ordinary_all_parent_finite_g2_transfer_audit import (
    at,
    child_rows,
    convolve,
    reconstruct_raw_g2,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
PRODUCER_SOURCE = HERE / "prove_iso_n5_g2_internal_ordinary_small_k1_large_parent_root.py"
PRODUCER_REPORT = HERE / "iso_n5_g2_internal_ordinary_small_k1_large_parent_exact_root_20260830.json"
INDEPENDENT_RAW_SOURCE = HERE / "audit_iso_n5_g2_internal_ordinary_all_parent_finite_g2_transfer_audit.py"
OUTPUT = HERE / (
    "iso_n5_g2_internal_ordinary_small_k1_large_parent_independent_audit_exact_"
    "g2_transfer_audit_20260830.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K1_"
    "LARGE_PARENT_G2_TRANSFER_AUDIT"
)
PRODUCER_MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K1_LARGE_PARENT_ROOT"
PRODUCER_SOURCE_SHA256 = "CB681E59A39D046D9FC11F1649169E8AC31D66F9F717D060F64E60D13A320242"
PRODUCER_REPORT_SHA256 = "C9698143E23D601859FE72B83164B167760296567E179BDF2135511F1327B48A"
INDEPENDENT_RAW_SOURCE_SHA256 = "9F2C2B78E47E40E2FA54DEA081B53BBA48897826F14B4A3A712BA1CCB515385B"
CUTOFF = 11
TARGETS = ((1, 1), (2, 1))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(order, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(order - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def multiplicity_upper(order, edges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2) / sp.Integer(comb(rank, 2))
    )


def bonferroni_upper(order, edges, wedges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
        + wedges * choose_polynomial(order - 3, rank - 3)
        + (edges * (edges - 1) / 2 - wedges)
        * choose_polynomial(order - 4, rank - 4)
    )


def specialize(expression, generic_c, generic_d, crows, drows):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(expression.subs(rules))


def target_form(ell):
    """The Newton k-index one cell is f(1)-f(0), reconstructed literally."""
    generic_c, generic_d, raw_g2 = reconstruct_raw_g2()
    parent = {
        name: (sp.Integer(1),) + tuple(sp.symbols(f"{name.lower()}1:7"))
        for name in ("E", "P", "V", "W")
    }

    def value(collisions):
        xrow, urow, yrow, zrow = child_rows(ell, collisions)
        crows = (
            convolve(xrow, parent["E"]), convolve(urow, parent["E"]),
            convolve(xrow, parent["V"]), convolve(urow, parent["V"]),
        )
        drows = (
            convolve(yrow, parent["P"]), convolve(zrow, parent["P"]),
            convolve(yrow, parent["W"]), convolve(zrow, parent["W"]),
        )
        return specialize(raw_g2, generic_c, generic_d, crows, drows)

    return sp.expand(value(1) - value(0)), parent


def power_tensor(polynomial, variables):
    expanded = sp.Poly(sp.expand(polynomial), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    shape = tuple(degree + 1 for degree in degrees)
    values = np.empty(shape, dtype=object)
    values.fill(sp.Integer(0))
    for powers, coefficient in expanded.terms():
        values[powers] = coefficient
    return degrees, values


def tensor_bernstein_independent(polynomial, variables):
    """Exact axiswise power-to-Bernstein conversion with exact inversion."""
    degrees, original = power_tensor(polynomial, variables)
    controls = original.copy()
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(controls, axis, 0)
        transformed = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.empty(moved.shape[1:], dtype=object)
            value.fill(sp.Integer(0))
            for exponent in range(index + 1):
                value += moved[exponent] * sp.Rational(
                    comb(index, exponent), comb(degree, exponent)
                )
            transformed[index] = value
        controls = np.moveaxis(transformed, 0, axis)

    recovered = controls.copy()
    # Binomial inversion: if b_i=sum_{j<=i} C(i,j)a_j/C(d,j), then
    # a_j=C(d,j)sum_{i<=j}(-1)^(j-i)C(j,i)b_i.
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(recovered, axis, 0)
        inverted = np.empty_like(moved)
        for exponent in range(degree + 1):
            value = np.empty(moved.shape[1:], dtype=object)
            value.fill(sp.Integer(0))
            for index in range(exponent + 1):
                value += (
                    (-1) ** (exponent - index)
                    * comb(exponent, index)
                    * moved[index]
                )
            inverted[exponent] = comb(degree, exponent) * value
        recovered = np.moveaxis(inverted, 0, axis)
    assert recovered.shape == original.shape
    assert all(sp.expand(left - right) == 0 for left, right in zip(recovered.flat, original.flat))
    return degrees, controls


def audit_bound_directions():
    """Fail-closed algebraic checks for every inequality used in the relaxation."""
    m, e, q = sp.symbols("m e q", integer=True, nonnegative=True)
    identities = []
    for rank in range(3, 7):
        # The adjacent-pair coefficient in Bonferroni is nonnegative for m>=rank.
        difference = sp.expand(
            choose_polynomial(m - 3, rank - 3)
            - choose_polynomial(m - 4, rank - 4)
        )
        pascal = choose_polynomial(m - 4, rank - 3)
        assert sp.expand(difference - pascal) == 0
        identities.append({"rank": rank, "adjacent_pair_increment": str(sp.factor(difference))})

        # On every boundary m<rank, each event count vanishes whenever its
        # multiplier can be nonzero.  Exhaust all feasible forest edge/wedge
        # triples at small m directly; the large-m direction is IE/multiplicity.
        for order in range(rank):
            for edges in range(max(0, order)):
                # On B,C,D the relaxation actually used below is q=C(e,2),
                # not an arbitrary (possibly graph-infeasible) q value.
                wedges = comb(edges, 2)
                mult = multiplicity_upper(order, edges, rank)
                bonf = bonferroni_upper(order, edges, wedges, rank)
                assert mult >= 0 and bonf >= 0

    return {
        "low_rank_exact": (
            "i2=C(m,2)-e and i3=C(m,3)-(m-2)e+wedges are literal "
            "one- and two-edge inclusion-exclusion identities for forests"
        ),
        "negative_term_multiplicity_upper": (
            "edge-subset incidences are at most C(r,2) per bad r-set, hence "
            "i_r<=C(m,r)-e*C(m-2,r-2)/C(r,2)"
        ),
        "negative_term_bonferroni_upper": (
            "second-order Bonferroni gives an upper bound on independent r-sets; "
            "adjacent and disjoint edge pairs occupy three and four vertices"
        ),
        "wedge_relaxation": (
            "q<=C(e,2); replacing q by C(e,2) only raises the Bonferroni upper "
            "bound because its q coefficient is C(m-4,r-3)>=0 when m>=r, "
            "while all event terms vanish on m<r boundaries"
        ),
        "pascal_checks": identities,
        "normalization": (
            "For n=|A|>=11, induced subforests B,C,D have 0<=m<=n and "
            "0<=e<=m; A has 0<=eA<=n and wedges(A)<=C(eA,2)<=eA^2/2. "
            "Thus x,y,z,u,v,s,w,r all lie in [0,1]."
        ),
    }


def build_face_independent(origin, parent, epsilon):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: choose_polynomial(n, 2) - ea,
        a[3]: choose_polynomial(n, 3) - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: choose_polynomial(nb, 2) - eb,
        c[1]: nc,
        c[2]: choose_polynomial(nc, 2) - ec,
        d[1]: nd,
        d[2]: choose_polynomial(nd, 2) - ed,
    }
    edge_by_row = {a: ea, b: eb, c: ec, d: ed}
    remaining = {}
    for row, order, start in ((a, n, 4), (b, nb, 3), (c, nc, 3), (d, nd, 3)):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    high_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base_variables, *high_variables)

    partition = {}
    for rank in range(1, 7):
        partition.update({
            parent["W"][rank]: at(a, rank),
            parent["P"][rank]: at(a, rank) + at(b, rank - 1),
            parent["V"][rank]: at(a, rank) + at(c, rank - 1),
            parent["E"][rank]: (
                at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                + epsilon * at(d, rank - 2)
            ),
        })
    exact = sp.Poly(sp.expand(origin.subs(partition).subs(low_rules)), *variables)
    lower = sp.Integer(0)
    positive_high = negative_high = 0
    for powers, coefficient in exact.terms():
        high_powers = powers[len(base_variables):]
        assert sum(high_powers) <= 1
        term = coefficient * sp.prod(
            variable**power for variable, power in zip(base_variables, powers[:len(base_variables)])
        )
        if any(high_powers):
            variable = high_variables[high_powers.index(1)]
            order, edges, rank = remaining[variable]
            if coefficient > 0:
                positive_high += 1
                raise AssertionError("unexpected positive high-rank occurrence: lower floors would be needed")
            negative_high += 1
            wedges = qa if order == n else edges * (edges - 1) / 2
            upper = sp.expand(
                (multiplicity_upper(order, edges, rank)
                 + bonferroni_upper(order, edges, wedges, rank)) / 2
            )
            term *= upper
        lower += term

    x, y, z, u, v, s, w, r, t = sp.symbols("x y z u v s w r t", nonnegative=True)
    normalized = sp.expand(lower.subs({
        nb: n * x,
        nc: n * y,
        nd: n * z,
        ea: n * u,
        qa: n**2 * u**2 * v / 2,
        eb: n * x * s,
        ec: n * y * w,
        ed: n * z * r,
    }).subs(n, CUTOFF + t))
    box = (x, y, u, v, s, w) if epsilon == 0 else (x, y, z, u, v, s, w, r)
    degrees, controls = tensor_bernstein_independent(normalized, box)

    coefficient_count = zero_count = negative_count = 0
    minimum = None
    for value in controls.flat:
        coefficients = sp.Poly(value, t).all_coeffs()
        coefficient_count += len(coefficients)
        for coefficient in coefficients:
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            zero_count += 1 if coefficient == 0 else 0
            negative_count += 1 if coefficient < 0 else 0
    stream = "".join(f"{index}:{sp.sstr(value)};" for index, value in enumerate(controls.flat))
    return {
        "epsilon": epsilon,
        "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
        "expanded_monomials": len(exact.terms()),
        "positive_high_monomials": positive_high,
        "negative_high_monomials": negative_high,
        "box_variables": [str(value) for value in box],
        "bernstein_degrees": list(degrees),
        "bernstein_controls": int(controls.size),
        "power_coefficients": coefficient_count,
        "negative_power_coefficients": negative_count,
        "zero_power_coefficients": zero_count,
        "minimum_power_coefficient": str(minimum),
        "control_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "exact_tensor_inversion": True,
    }


def main() -> None:
    assert sha256(PRODUCER_SOURCE) == PRODUCER_SOURCE_SHA256
    assert sha256(PRODUCER_REPORT) == PRODUCER_REPORT_SHA256
    assert sha256(INDEPENDENT_RAW_SOURCE) == INDEPENDENT_RAW_SOURCE_SHA256
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == PRODUCER_MARKER
    assert producer["targets"] == [list(target) for target in TARGETS]
    assert producer["cutoff_A_order"] == CUTOFF

    bound_audit = audit_bound_directions()
    target_reports = []
    total_controls = total_power_coefficients = total_negatives = 0
    global_minimum = None
    for expected_target in producer["targets_detail"]:
        ell, k_index = expected_target["ell"], expected_target["k_index"]
        assert (ell, k_index) in TARGETS and k_index == 1
        target, parent = target_form(ell)
        faces = [build_face_independent(target, parent, epsilon) for epsilon in (0, 1)]
        for actual, expected in zip(faces, expected_target["faces"]):
            for key in (
                "epsilon", "geometry", "expanded_monomials", "positive_high_monomials",
                "negative_high_monomials", "box_variables", "bernstein_degrees",
                "bernstein_controls", "power_coefficients", "negative_power_coefficients",
                "zero_power_coefficients", "minimum_power_coefficient",
                "control_stream_sha256",
            ):
                assert actual[key] == expected[key], (ell, key, actual[key], expected[key])
            assert actual["positive_high_monomials"] == 0
            assert actual["negative_power_coefficients"] == 0
            total_controls += actual["bernstein_controls"]
            total_power_coefficients += actual["power_coefficients"]
            total_negatives += actual["negative_power_coefficients"]
            minimum = sp.Rational(actual["minimum_power_coefficient"])
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        target_reports.append({"ell": ell, "k_index": k_index, "faces": faces})

    assert total_controls == producer["aggregate_Bernstein_controls"] == 46800
    assert total_power_coefficients == producer["aggregate_power_coefficients"] == 234000
    assert total_negatives == producer["negative_power_coefficients"] == 0
    assert str(global_minimum) == producer["global_minimum_power_coefficient"] == "11/12"

    report = {
        "marker": MARKER,
        "theorem_audited": producer["theorem"],
        "targets": [list(target) for target in TARGETS],
        "cutoff_A_order": CUTOFF,
        "cutoff_parent_order": 13,
        "bound_direction_audit": bound_audit,
        "targets_detail": target_reports,
        "aggregate_Bernstein_controls": total_controls,
        "aggregate_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": total_negatives,
        "global_minimum_power_coefficient": str(global_minimum),
        "producer_source_sha256": PRODUCER_SOURCE_SHA256,
        "producer_report_sha256": PRODUCER_REPORT_SHA256,
        "independent_raw_source_sha256": INDEPENDENT_RAW_SOURCE_SHA256,
        "status": "independent exact reconstruction and tensor-Bernstein inversion audit",
        "scope": (
            "Only internal-spine ordinary-parent g2 ell=1,2 Newton k-index one "
            "for parent order at least 13.  The k-index-zero cells, finite orders, "
            "other modes, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "aggregate_Bernstein_controls": total_controls,
        "aggregate_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": total_negatives,
        "global_minimum_power_coefficient": str(global_minimum),
        "control_hashes": [
            face["control_stream_sha256"]
            for target in target_reports for face in target["faces"]
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
