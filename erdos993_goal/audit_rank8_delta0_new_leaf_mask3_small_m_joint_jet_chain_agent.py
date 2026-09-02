#!/usr/bin/env python3
"""Independent geng/literal replay of the mask-3 joint-jet and envelope chain."""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
from flint import fmpq as Fraction

import audit_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as geng
from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_small_m_joint_jet_chain_independent_audit_agent_20260823.json"
FLOOR_REPORT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json"
ENVELOPE_REPORT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_agent.py":
        "D5903605EAE82AA236DE0D44AF18FF9FA8433FB893173E9E9BDA9A61623C4711",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json":
        "EA987A9B46FE22872462F97E03B1850965E4FFA7EB8BBF3EB405557FC1366933",
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_agent.py":
        "F81DE63D8717991E1BCE03FC936D6B01E07A242F79F78C317BA0137FD672E94F",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json":
        "66410DE4223D5EAE6C2F456B26E016791B07F05827EFC1312C2DF8A06B946DAE",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json":
        "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "audit_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py":
        "C2BC33F716FBCD3230B08707E566EF5065EFA01589430226C7C50ABA05703115",
    "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_independent_audit_agent_20260823.json":
        "3D004F7640E1452BFDD18AA97E69616D6AC8308228BF1AE4F4505D433CEC1F77",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def component_gap(jet, components: int, r: int) -> int:
    return sum(
        jet[j] * choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def sparse_hash(rows) -> str:
    digest = hashlib.sha256()
    for label, values in rows:
        digest.update(str(label).encode())
        digest.update(b":")
        for value in sorted(values):
            digest.update(",".join(str(item) for item in value).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def build_forest_jets():
    tree_types = {}
    counts = [0]
    stream = hashlib.sha256()
    peak = geng.gate()
    for order in range(1, 16):
        codes = geng.geng_codes(order)
        counts.append(len(codes))
        jets = set()
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            jet, _ = geng.literal_graph_jets(graph)
            jets.add(jet)
            stream.update(f"order={order};".encode())
            stream.update(code)
            stream.update(b"\n")
        tree_types[order] = jets
        peak = max(peak, geng.gate())
    assert counts == geng.TREE_COUNTS

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 16):
        for component_order in reversed(range(1, total + 1)):
            remainder = total - component_order
            for components in reversed(range(remainder + 1)):
                old = forests.get((remainder, components))
                if not old:
                    continue
                target = forests.setdefault((total, components + 1), set())
                for left in reversed(sorted(old)):
                    for right in reversed(sorted(tree_types[component_order])):
                        target.add(geng.convolution(left, right))
        peak = max(peak, geng.gate())
    return forests, stream.hexdigest().upper(), peak


def axis_controls(lower: Fraction, upper: Fraction, exponent: int, degree: int):
    slope = upper - lower
    result = []
    for target in range(degree + 1):
        value = Fraction(0)
        for source in range(min(exponent, target) + 1):
            value += (
                Fraction(math.comb(exponent, source))
                * lower ** (exponent - source)
                * slope**source
                * Fraction(math.comb(target, source), math.comb(degree, source))
            )
        result.append(value)
    return tuple(result)


def collapse(terms, inverse_t: Fraction):
    result = {}
    for (np, xp, yp, zp), coefficient in reversed(terms):
        assert np == 0
        key = (xp, yp + zp)
        result[key] = result.get(key, Fraction(0)) + Fraction(int(coefficient)) * inverse_t**zp
    return {key: value for key, value in result.items() if value}


def rectangle_controls(terms, inverse_t, x0, x1, y0, y1):
    xs = {power: axis_controls(x0, x1, power, 4) for power in range(5)}
    ys = {power: axis_controls(y0, y1, power, 5) for power in range(6)}
    coefficients = collapse(terms, inverse_t)
    return {
        (i, j): sum(
            coefficient * xs[xp][i] * ys[yp][j]
            for (xp, yp), coefficient in reversed(list(coefficients.items()))
        )
        for i in range(5)
        for j in range(6)
    }


def poly_multiply(left, right):
    result = {}
    for (li, lj), lv in left.items():
        for (ri, rj), rv in right.items():
            key = (li + ri, lj + rj)
            result[key] = result.get(key, Fraction(0)) + lv * rv
    return {key: value for key, value in result.items() if value}


def poly_powers(base, maximum):
    result = [{(0, 0): Fraction(1)}]
    for _ in range(maximum):
        result.append(poly_multiply(result[-1], base))
    return result


def gap_controls(terms, inverse_t, x0, x1, y0, gap_ratio):
    slope = x1 - x0
    x = {(0, 0): x0, (1, 0): slope}
    y = {(0, 0): y0, (0, 1): x0 - gap_ratio - y0, (1, 1): slope}
    x = {key: value for key, value in x.items() if value}
    y = {key: value for key, value in y.items() if value}
    xpowers = poly_powers(x, 4)
    ypowers = poly_powers(y, 5)
    power = {}
    for (xp, yp), coefficient in reversed(list(collapse(terms, inverse_t).items())):
        current = poly_multiply(xpowers[xp], ypowers[yp])
        for index, value in current.items():
            power[index] = power.get(index, Fraction(0)) + coefficient * value
    controls = {}
    for target in itertools.product(range(9), range(6)):
        value = Fraction(0)
        for source, coefficient in reversed(list(power.items())):
            if source[0] <= target[0] and source[1] <= target[1]:
                value += coefficient * Fraction(
                    math.comb(target[0], source[0]), math.comb(8, source[0])
                ) * Fraction(
                    math.comb(target[1], source[1]), math.comb(5, source[1])
                )
        controls[target] = value
    return controls


def floor_key(row):
    return (
        row["N"], row["m"], row["r"], row["branch"], row["components"],
        tuple(row["jet_f0_to_f6"]), row["component_gap"], row["f6_over_f5"],
        tuple(row["x_interval"]), tuple(row["y_interval"]),
        tuple(row["bernstein_index"]), row["minimum_control"],
        tuple(tuple(index) for index in row["negative_indices"]),
    )


def region_row(name, controls, interval):
    index, minimum = min(controls.items(), key=lambda item: item[1])
    negative = [list(key) for key, value in sorted(controls.items()) if value < 0]
    return {
        "region": name,
        "x_interval": [str(value) for value in interval],
        "bernstein_degrees": [max(key[0] for key in controls), max(key[1] for key in controls)],
        "controls": len(controls),
        "negative_controls": len(negative),
        "minimum_control": str(minimum),
        "minimum_index": list(index),
        "negative_indices": negative,
    }


def envelope_key(row):
    regions = tuple(
        (
            region["region"], tuple(region["x_interval"]),
            tuple(region["bernstein_degrees"]), region["controls"],
            region["negative_controls"], region["minimum_control"],
            tuple(region["minimum_index"]),
            tuple(tuple(index) for index in region["negative_indices"]),
        )
        for region in row["regions"]
    )
    return (
        row["N"], row["m"], row["r"], row["branch"], row["components"],
        tuple(row["jet_f0_to_f6"]), row["component_gap"], row["f6_over_f5"],
        row["y_lower_f5_over_d6_cap"], row["y_root_floor"],
        row["forced_x_lower"], row["crossover"], regions,
    )


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    floor_primary = json.loads(FLOOR_REPORT.read_text(encoding="utf-8"))
    floor_summaries = {
        (row["N"], row["m"], row["branch"]): (
            row["joint_jet_boxes"], row["negative_joint_jet_boxes"],
            row["status"], row["minimum_control"],
        )
        for row in floor_primary["rows"]
    }
    expected_floor_residuals = sorted(
        floor_key(row) for row in floor_primary["residual_joint_jet_boxes"]
    )
    floor_counts = floor_primary["counts"]
    expected_fingerprint = floor_primary["forest6_15_component_jet_sparse_sha256"]
    del floor_primary
    gc.collect()

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    expected_jet_counts = {
        (row["order"], row["components"]): row["distinct_coefficient_jets"]
        for row in catalog["component_rows"]
    }
    forests, geng_stream, peak = build_forest_jets()
    for key, count in expected_jet_counts.items():
        assert len(forests[key]) == count
    fingerprint = sparse_hash(
        ((order, components), forests[(order, components)])
        for order in range(6, 16)
        for components in range(1, order + 1)
    )
    assert fingerprint == expected_fingerprint
    terms = literal_base().terms()

    floor_rows = []
    floor_residuals = []
    floor_controls = floor_boxes = 0
    for N, m, branch in sorted(floor_summaries):
        r = N - m
        x0 = Fraction(6, N - 5)
        x1 = Fraction(6 * N, N * N - 15 * N + 10)
        cap = choose(N - 1, 6) + choose(r - 1, 5)
        root_floor = choose(r, 6)
        branch_jets = []
        for components in range(0 if m == 0 else 1, m + 1):
            for jet in forests.get((m, components), set()):
                if (branch == "f6_zero") == (jet[6] == 0):
                    branch_jets.append((components, jet))
        minimum = None
        negative_jets = 0
        for components, jet in reversed(sorted(branch_jets)):
            gap = component_gap(jet, components, r)
            if jet[5] == 0:
                inverse_t = Fraction(0)
                y0 = y1 = Fraction(0)
            else:
                inverse_t = Fraction(jet[6], jet[5])
                y0 = Fraction(jet[5], cap)
                y1 = min(Fraction(jet[5], root_floor), x1 - Fraction(gap, cap))
            assert y0 <= y1
            controls = rectangle_controls(terms, inverse_t, x0, x1, y0, y1)
            index, value = min(controls.items(), key=lambda item: item[1])
            negatives = [list(key) for key, current in sorted(controls.items()) if current < 0]
            if minimum is None or value < minimum:
                minimum = value
            if negatives:
                negative_jets += 1
                floor_residuals.append(
                    {
                        "N": N, "m": m, "r": r, "branch": branch,
                        "components": components, "jet_f0_to_f6": list(jet),
                        "component_gap": gap, "f6_over_f5": str(inverse_t),
                        "x_interval": [str(x0), str(x1)], "y_interval": [str(y0), str(y1)],
                        "bernstein_index": list(index), "minimum_control": str(value),
                        "negative_indices": negatives,
                    }
                )
            floor_boxes += 1
            floor_controls += len(controls)
        expected = floor_summaries[(N, m, branch)]
        status = "SEALED" if negative_jets == 0 else "OPEN_JOINT_JET_ROOT_FLOOR_METHOD"
        assert (len(branch_jets), negative_jets, status, str(minimum)) == expected
        floor_rows.append((N, m, branch, len(branch_jets), negative_jets, status))
        peak = max(peak, geng.gate())
    assert sorted(floor_key(row) for row in floor_residuals) == expected_floor_residuals
    assert floor_boxes == floor_counts["joint_jet_boxes"] == 105_929
    assert floor_controls == floor_counts["bernstein_controls"] == 3_177_870
    assert len(floor_residuals) == floor_counts["open_joint_jet_boxes"] == 14_402
    assert sum(row[5] == "SEALED" for row in floor_rows) == 75

    envelope_primary = json.loads(ENVELOPE_REPORT.read_text(encoding="utf-8"))
    expected_envelope_residuals = sorted(
        envelope_key(row) for row in envelope_primary["residual_envelope_jets"]
    )
    envelope_counts = envelope_primary["counts"]
    expected_branch_rows = {
        (row["N"], row["m"], row["branch"]): (
            row["input_residual_jets"], row["open_envelope_jets"], row["status"]
        )
        for row in envelope_primary["branch_rows"]
    }
    del envelope_primary, expected_floor_residuals
    gc.collect()

    envelope_rows = []
    envelope_residuals = []
    region_boxes = controls_checked = splits = 0
    for old in sorted(floor_residuals, key=floor_key):
        N, m, r = old["N"], old["m"], old["r"]
        jet = tuple(old["jet_f0_to_f6"])
        components = old["components"]
        x0 = Fraction(6, N - 5)
        x1 = Fraction(6 * N, N * N - 15 * N + 10)
        cap = choose(N - 1, 6) + choose(r - 1, 5)
        root_floor = choose(r, 6)
        gap = component_gap(jet, components, r)
        y0 = Fraction(jet[5], cap)
        yf = Fraction(jet[5], root_floor)
        gap_ratio = Fraction(gap, cap)
        forced = max(x0, y0 + gap_ratio)
        crossover = yf + gap_ratio
        inverse_t = Fraction(jet[6], jet[5])
        regions = []
        gap_end = min(x1, crossover)
        if forced <= gap_end:
            controls = gap_controls(terms, inverse_t, forced, gap_end, y0, gap_ratio)
            regions.append(region_row("GAP_ACTIVE", controls, (forced, gap_end)))
            region_boxes += 1
            controls_checked += len(controls)
        floor_start = max(forced, crossover)
        if floor_start <= x1:
            controls = rectangle_controls(terms, inverse_t, floor_start, x1, y0, yf)
            regions.append(region_row("ROOT_FLOOR_ACTIVE", controls, (floor_start, x1)))
            region_boxes += 1
            controls_checked += len(controls)
        assert regions
        if len(regions) == 2:
            splits += 1
        row = {
            "N": N, "m": m, "r": r, "branch": old["branch"],
            "components": components, "jet_f0_to_f6": list(jet),
            "component_gap": gap, "f6_over_f5": str(inverse_t),
            "y_lower_f5_over_d6_cap": str(y0), "y_root_floor": str(yf),
            "forced_x_lower": str(forced), "crossover": str(crossover),
            "regions": regions,
        }
        if any(region["negative_controls"] for region in regions):
            envelope_residuals.append(row)
        envelope_rows.append(row)
        if len(envelope_rows) % 500 == 0:
            peak = max(peak, geng.gate())
    assert sorted(envelope_key(row) for row in envelope_residuals) == expected_envelope_residuals
    assert len(envelope_rows) == envelope_counts["input_joint_jets"] == 14_402
    assert region_boxes == envelope_counts["region_boxes"] == 14_559
    assert splits == envelope_counts["shared_boundary_splits"] == 157
    assert controls_checked == envelope_counts["bernstein_controls"] == 782_418
    assert len(envelope_residuals) == envelope_counts["open_envelope_jets"] == 2_495
    actual_branches = {}
    for key in expected_branch_rows:
        subset = [row for row in envelope_rows if (row["N"], row["m"], row["branch"]) == key]
        opened = sum(any(region["negative_controls"] for region in row["regions"]) for row in subset)
        status = "SEALED" if opened == 0 else "OPEN_FEASIBLE_ENVELOPE_BERNSTEIN_METHOD"
        actual_branches[key] = (len(subset), opened, status)
    assert actual_branches == expected_branch_rows
    peak = max(peak, geng.gate())

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-small-m-joint-jet-chain-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_LITERAL_MASK3_SMALL_M_JOINT_JET_ENVELOPE_REPLAY",
        "scope": "The 80 coarse-open finite small-m logical branches: exact root-floor jets and their feasible-envelope residuals.",
        "method": (
            "Reverse geng tree enumeration, literal induced-subgraph coefficient recursion, "
            "reverse forest-jet convolution, independently collected literal mask3 gate, "
            "and direct rational Bernstein conversion."
        ),
        "counts": {
            "logical_branches": 80,
            "joint_jet_boxes": floor_boxes,
            "joint_jet_controls": floor_controls,
            "root_floor_sealed_branches": 75,
            "root_floor_residual_jets": len(floor_residuals),
            "envelope_region_boxes": region_boxes,
            "envelope_controls": controls_checked,
            "envelope_sealed_additional_branches": 1,
            "literal_residual_jets": len(envelope_residuals),
        },
        "forest6_15_component_jet_sparse_sha256": fingerprint,
        "geng_reverse_stream_sha256": geng_stream,
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": geng.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "This independently audits the joint-jet and envelope layers only. "
            "The 2,495 final residual jets require the separately sealed literal "
            "attachment audit, and a no-gap assembler is still required."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FLOOR", floor_boxes, floor_controls, "RESIDUAL", len(floor_residuals))
    print("ENVELOPE", region_boxes, controls_checked, "RESIDUAL", len(envelope_residuals))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
