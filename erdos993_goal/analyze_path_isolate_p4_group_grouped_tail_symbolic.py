#!/usr/bin/env python3
"""Analyze symbolic reciprocal Schur structure of grouped tail kernels."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


# Keys are (z,w,c,m,x) powers.
Sparse = dict[tuple[int, int, int, int, int], int]


def add(left: Sparse, right: Sparse, scalar: int = 1) -> Sparse:
    result = dict(left)
    for key, value in right.items():
        result[key] = result.get(key, 0) + scalar * value
        if result[key] == 0:
            del result[key]
    return result


def multiply_v(source: Sparse, exponent: int) -> Sparse:
    result = dict(source)
    for _ in range(exponent):
        new: Sparse = {}
        for key, value in result.items():
            pz, pw, pc, pm, px = key
            for dz, dw in ((0, 0), (1, 0), (0, 1)):
                target = (pz + dz, pw + dw, pc, pm, px)
                new[target] = new.get(target, 0) + value
        result = {key: value for key, value in new.items() if value}
    return result


def load_kernel(record: dict) -> Sparse:
    return {
        tuple(item["monomial_z_w_c_m_x"]): int(item["coefficient"])
        for item in record["terms"]
    }


def reciprocal(source: Sparse) -> tuple[Sparse, int]:
    degree_z = max(key[0] for key in source)
    degree_w = max(key[1] for key in source)
    assert degree_z == degree_w
    result = {
        (degree_z - pz, degree_w - pw, pc, pm, px): value
        for (pz, pw, pc, pm, px), value in source.items()
    }
    return result, degree_z


def shift_parameters(source: Sparse, c0: int, m0: int) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for new_c in range(pc + 1):
            c_coefficient = math.comb(pc, new_c) * c0 ** (pc - new_c)
            for new_m in range(pm + 1):
                coefficient = (
                    value
                    * c_coefficient
                    * math.comb(pm, new_m)
                    * m0 ** (pm - new_m)
                )
                key = (pz, pw, new_c, new_m, px)
                result[key] = result.get(key, 0) + coefficient
    return {key: value for key, value in result.items() if value}


def hcu_audit(source: Sparse) -> dict:
    groups: dict[tuple[int, int, int, int], dict[int, int]] = {}
    symmetry_failures = 0
    lookup = source
    for (pz, pw, pc, pm, px), value in source.items():
        if lookup.get((pw, pz, pc, pm, px), 0) != value:
            symmetry_failures += 1
        groups.setdefault((pc, pm, px, pz + pw), {})[pz] = value
    negative = []
    checks = 0
    minimum = None
    for (pc, pm, px, degree), row in groups.items():
        previous = 0
        for pz in range(degree // 2 + 1):
            current = row.get(pz, 0)
            difference = current - previous
            checks += 1
            record = {
                "parameter_powers_C_M_x": [pc, pm, px],
                "total_degree": degree,
                "edge_index": pz,
                "difference": difference,
            }
            if minimum is None or difference < minimum["difference"]:
                minimum = record
            if difference < 0:
                negative.append(record)
            previous = current
    return {
        "hcu": not negative and symmetry_failures == 0,
        "checks": checks,
        "symmetry_failure_count": symmetry_failures,
        "negative_schur_coefficient_count": len(negative),
        "minimum": minimum,
        "first_negative": negative[:20],
    }


def divisible_by_e1(source: Sparse) -> bool:
    evaluation: dict[tuple[int, int, int, int], int] = {}
    for (pz, pw, pc, pm, px), value in source.items():
        key = (pz + pw, pc, pm, px)
        evaluation[key] = evaluation.get(key, 0) + value * (-1) ** pw
    return all(value == 0 for value in evaluation.values())


def divide_by_e1(source: Sparse) -> Sparse:
    assert divisible_by_e1(source)
    groups: dict[tuple[int, int, int, int], dict[int, int]] = {}
    for (pz, pw, pc, pm, px), value in source.items():
        groups.setdefault((pc, pm, px, pz + pw), {})[pz] = value
    result: Sparse = {}
    for (pc, pm, px, degree), row in groups.items():
        previous = 0
        for pz in range(degree + 1):
            current = row.get(pz, 0) - previous
            if pz <= degree - 1 and current:
                result[(pz, degree - 1 - pz, pc, pm, px)] = current
            previous = current
        assert previous == 0
    return result


def divide_by_one_plus_variable(source: Sparse, variable_index: int) -> Sparse | None:
    """Return the exact quotient by 1+z or 1+w, or None."""
    assert variable_index in (0, 1)
    groups: dict[tuple[int, ...], dict[int, int]] = {}
    for key, value in source.items():
        other = key[:variable_index] + key[variable_index + 1 :]
        groups.setdefault(other, {})[key[variable_index]] = value
    result: Sparse = {}
    for other, row in groups.items():
        degree = max(row)
        if degree == 0:
            return None
        previous = 0
        for exponent in range(degree):
            current = row.get(exponent, 0) - previous
            if current:
                key_list = list(other)
                key_list.insert(variable_index, exponent)
                result[tuple(key_list)] = current
            previous = current
        if row.get(degree, 0) != previous:
            return None
    return result


def divide_by_a(source: Sparse) -> Sparse | None:
    quotient = divide_by_one_plus_variable(source, 0)
    if quotient is None:
        return None
    return divide_by_one_plus_variable(quotient, 1)


def paired_cone_audit(source: Sparse) -> dict:
    groups: dict[tuple[int, int, int, int], dict[int, int]] = {}
    for (pz, pw, pc, pm, px), value in source.items():
        groups.setdefault((pc, pm, px, pz + pw), {})[pz] = value
    failures = []
    hcu_layers = 0
    atom_layers = 0
    atom_certificates = []
    for (pc, pm, px, degree), row_lookup in groups.items():
        row = [row_lookup.get(i, 0) for i in range(degree + 1)]
        differences = []
        previous = 0
        for i in range(degree // 2 + 1):
            differences.append(row[i] - previous)
            previous = row[i]
        if all(value >= 0 for value in differences):
            hcu_layers += 1
            continue
        single_atom_certificate = None
        if degree % 2 == 0:
            n = degree // 2
            for a in range(n + 1):
                b = n - a
                atom_row = [0] * (degree + 1)
                for j in range(b + 1):
                    atom_row[a + 2 * j] = math.comb(b, j)
                atom_schur = []
                previous_atom = 0
                for i in range(n + 1):
                    atom_schur.append(atom_row[i] - previous_atom)
                    previous_atom = atom_row[i]
                for alpha in range(1, 101):
                    residual = [
                        value - alpha * atom_value
                        for value, atom_value in zip(differences, atom_schur)
                    ]
                    if all(value >= 0 for value in residual):
                        single_atom_certificate = {
                            "parameter_powers_C_M_x": [pc, pm, px],
                            "degree": degree,
                            "atom": {
                                "a": a,
                                "b": b,
                                "coefficient": alpha,
                            },
                            "minimum_residual_schur_coefficient": min(residual),
                        }
                        break
                if single_atom_certificate is not None:
                    break
        if single_atom_certificate is not None:
            atom_layers += 1
            atom_certificates.append(single_atom_certificate)
            continue
        if degree % 2:
            failures.append(
                {
                    "parameter_powers_C_M_x": [pc, pm, px],
                    "degree": degree,
                    "reason": "odd non-HCU layer",
                }
            )
            continue
        n = degree // 2
        alphas = []
        reconstructed = [0] * (degree + 1)
        for a in range(n + 1):
            alpha = row[a] - reconstructed[a]
            alphas.append(alpha)
            b = n - a
            for j in range(b + 1):
                reconstructed[a + 2 * j] += alpha * math.comb(b, j)
        if all(alpha >= 0 for alpha in alphas) and reconstructed == row:
            atom_layers += 1
            atom_certificates.append(
                {
                    "parameter_powers_C_M_x": [pc, pm, px],
                    "degree": degree,
                    "nonzero_q_a_p2_b_coefficients": [
                        {"a": a, "b": n - a, "coefficient": alpha}
                        for a, alpha in enumerate(alphas)
                        if alpha
                    ],
                }
            )
        else:
            failures.append(
                {
                    "parameter_powers_C_M_x": [pc, pm, px],
                    "degree": degree,
                    "reason": "neither HCU nor nonnegative q^a p2^b expansion",
                    "minimum_atom_coefficient": min(alphas),
                    "reconstruction_matches": reconstructed == row,
                    "nonzero_atom_basis_coefficients": [
                        {"a": a, "b": n - a, "coefficient": alpha}
                        for a, alpha in enumerate(alphas)
                        if alpha
                    ],
                    "schur_coefficients_edge_to_center": differences,
                }
            )
    return {
        "in_paired_cone": not failures,
        "hcu_layer_count": hcu_layers,
        "atom_layer_count": atom_layers,
        "failure_count": len(failures),
        "first_failures": failures[:20],
        "atom_certificates": atom_certificates,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="path_isolate_p4_group_coordinate_generating_numerators_20260801.json",
    )
    parser.add_argument(
        "--output",
        default="path_isolate_p4_group_grouped_tail_symbolic_20260801.json",
    )
    args = parser.parse_args()
    data = json.loads(
        Path(args.input).read_text(encoding="utf-8")
    )
    records = []
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            p_kernel: Sparse = {}
            base_kernel: Sparse = {}
            prefix_kernels: list[Sparse] = []
            for record in kernels:
                order = record["numerator_order"]
                value = multiply_v(load_kernel(record), maximum - order)
                p_kernel = add(p_kernel, value)
                base_kernel = add(base_kernel, value, maximum - order + 1)
                if order < maximum:
                    prefix_kernels.append(dict(p_kernel))
            base_reduced = base_kernel
            base_a_power = 0
            while True:
                quotient = divide_by_a(base_reduced)
                if quotient is None:
                    break
                base_reduced = quotient
                base_a_power += 1
            sources = [
                ("P", p_kernel, 0),
                ("base", base_kernel, 0),
                ("base_plus_P", add(base_kernel, p_kernel), 0),
                ("base_over_A_power", base_reduced, base_a_power),
            ]
            sources.extend(
                (f"prefix_{index}", source, 0)
                for index, source in enumerate(prefix_kernels)
            )
            sources.extend(
                (f"base_plus_{scalar}_P", add(base_kernel, p_kernel, scalar), 0)
                for scalar in (2, 3, 4, 5, 6, 8, 10, 16, 32, 64)
            )
            for kind, source, removed_a_power in sources:
                reversed_source, bidegree = reciprocal(source)
                shifted = shift_parameters(reversed_source, 1, 3)
                e1_divisible = divisible_by_e1(shifted)
                item = {
                    "parity_epsilon": parity,
                    "coordinate": coordinate,
                    "kind": kind,
                    "removed_A_power": removed_a_power,
                    "bidegree": bidegree,
                    "term_count_after_shift": len(shifted),
                    "ordinary_negative_term_count": sum(
                        1 for value in shifted.values() if value < 0
                    ),
                    "reciprocal_hcu_after_c_1_C_m_3_M": hcu_audit(shifted),
                    "divisible_by_e1": e1_divisible,
                }
                if e1_divisible:
                    quotient = divide_by_e1(shifted)
                    item["e1_quotient_term_count"] = len(quotient)
                    item["e1_quotient_hcu"] = hcu_audit(quotient)
                    item["e1_quotient_paired_cone"] = paired_cone_audit(quotient)
                records.append(item)
    p_records = [item for item in records if item["kind"] == "P"]
    p_tail_pass = all(
        item["divisible_by_e1"]
        and item["e1_quotient_paired_cone"]["in_paired_cone"]
        for item in p_records
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GROUP_P_TAIL_PAIRED_CONE"
            if p_tail_pass
            else "FAIL_PATH_ISOLATE_P4_GROUP_P_TAIL_PAIRED_CONE"
        ),
        "main_parameter_shift": "c=1+C, m=3+M with C,M,x nonnegative",
        "paired_cone_definition": (
            "Each parameter-homogeneous layer is a sum of an HCU polynomial "
            "and nonnegative atoms q^a*(z^2+w^2)^b."
        ),
        "p_tail_record_count": len(p_records),
        "p_tail_all_certified": p_tail_pass,
        "input": args.input,
        "records": records,
    }
    Path(args.output).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
