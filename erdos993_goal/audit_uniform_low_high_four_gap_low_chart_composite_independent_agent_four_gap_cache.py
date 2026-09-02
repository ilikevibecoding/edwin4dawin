#!/usr/bin/env python3
"""Independent exact audit of the four-gap cache and low-chart composite.

This file deliberately imports none of the producer, scanner, diagnostic, or
assembler modules.  It reparses the gzip JSON directly, reconstructs the six
symbolic product rows from the defining formulas, replays every low-chart
certificate with local sparse-polynomial arithmetic over QQ, and verifies the
assembled report's complete dependency-hash map.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import math
import os
import sys
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
CACHE_NAME = "uniform_low_high_four_gap_symbolic_rows_cache_root_20260827.json.gz"
COMPOSITE_NAME = "uniform_low_high_four_gap_strong_boundary_exact_root_20260827.json"
OUTPUT_NAME = (
    "uniform_low_high_four_gap_low_chart_composite_independent_audit_"
    "agent_four_gap_cache.json"
)
FAILURE_NAME = OUTPUT_NAME + ".failure.json"

BASES = ("T", "L", "R")
PRODUCTS = (
    ("T", "T"), ("T", "L"), ("T", "R"),
    ("L", "L"), ("L", "R"), ("R", "R"),
)
PRODUCT_LABELS = tuple("*".join(product) for product in PRODUCTS)

PINNED = {
    "explore_uniform_low_high_four_gap_symbolic_payments_root.py":
        "250F102A14541C0CFC8395568935ADB5ADA015165CE12D7544F5C778D804833E",
    CACHE_NAME:
        "575B666783CF8A41D787B6685AE993DA13002B2C392321D9250E7873C3BE7258",
    "scan_uniform_low_high_four_gap_left_block_root.py":
        "FB28E108234EC64B6865C7A4B8D8EE7AD059BBFBAA500B9B5A6C12C97E5D2D83",
    "diagnose_uniform_low_high_four_gap_rank_split_sparse_root.py":
        "19914430FB51B53F731826C9E773369A37385657CF637EECCBC97415305EBB7A",
    "scan_uniform_low_high_four_gap_rank_decay_tail_root.py":
        "9C2C83425B969497336C2E493007491F72776263FD84450151DA72B28FF2B133",
    "assemble_uniform_low_high_four_gap_strong_boundary_root.py":
        "0C80172942E8A2DEE51C15EB806F65DDF2428CA206F806E6A0C892A6491F63D6",
    "prove_uniform_low_high_four_gap_high_tight_ratio_root.py":
        "268B66915C41119B84F0C99800C3155021D7C750478E0674BF53C983AA5AD5DD",
    "audit_uniform_low_high_four_gap_high_tight_ratio_independent_root.py":
        "5693E434EEAB627DBC640757CFA5D6D70B09AFE959CEC5AFDD8056870D311360",
    "prove_uniform_low_high_left_gap0_right_gap01_slack_root.py":
        "C97D477F79EC86CD998293CC6957516C78A353A157A8B12C47068EE55409B6DB",
    "uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json":
        "0A5DA773954EFBAA876DF45FB95D63A6F6D799D779761DF91C7F955CD6BCE55D",
    "audit_uniform_low_high_left_gap0_right_gap01_slack_independent_root.py":
        "6A85FCD3363767EB240C2B6C21BD82A3A6F2F866AD15D676BF79F69B373F6E4C",
    "uniform_low_high_left_gap0_right_gap01_slack_independent_audit_root_20260827.json":
        "88A440024EC2C7E898FA72FC8615451F2175127EFEE77B3556F00E68B77E5BD1",
}

TAIL_SOURCE = PINNED["scan_uniform_low_high_four_gap_rank_decay_tail_root.py"]
CACHE_SHA = PINNED[CACHE_NAME]
ZERO3 = (0, 0, 0)
ZERO4 = (0, 0, 0, 0)


class AuditMismatch(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise AuditMismatch(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def digest_json(value) -> str:
    encoded = json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True,
    ).encode("ascii")
    return hashlib.sha256(encoded).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8",
    )
    os.replace(temporary, path)


def read_json(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def encode_ring_polynomial(value):
    return [
        [list(monomial), int(coefficient.numerator), int(coefficient.denominator)]
        for monomial, coefficient in value.terms()
    ]


def decode_ring_polynomial(entries, rational_field, label):
    decoded = {}
    for position, item in enumerate(entries):
        require(isinstance(item, list) and len(item) == 3, f"{label}: bad term {position}")
        monomial, numerator, denominator = item
        require(
            isinstance(monomial, list) and len(monomial) == 3
            and all(isinstance(exponent, int) and exponent >= 0 for exponent in monomial),
            f"{label}: bad monomial {position}",
        )
        require(
            isinstance(numerator, int) and isinstance(denominator, int)
            and numerator != 0 and denominator > 0,
            f"{label}: bad rational coefficient {position}",
        )
        key = tuple(monomial)
        require(key not in decoded, f"{label}: duplicate monomial {key}")
        decoded[key] = QQ(numerator, denominator)
    return rational_field.ring.from_dict(decoded)


def load_cache_direct(rational_field):
    path = HERE / CACHE_NAME
    raw = path.read_bytes()
    require(hashlib.sha256(raw).hexdigest().upper() == CACHE_SHA, "cache SHA mismatch")
    try:
        uncompressed = gzip.decompress(raw)
        payload = json.loads(uncompressed.decode("utf-8"))
    except Exception as exc:
        raise AuditMismatch(f"cache decompression/JSON failure: {exc}") from exc
    require(
        payload.get("schema") == "uniform-low-high-four-gap-symbolic-rows-cache-root-v1",
        "cache schema mismatch",
    )
    products = payload.get("products")
    require(isinstance(products, dict), "cache products is not an object")
    require(tuple(products) == PRODUCT_LABELS, "cache product labels/order mismatch")

    rows = {}
    invariant_stream = []
    counts = {}
    for label in PRODUCT_LABELS:
        entries = products[label]
        require(isinstance(entries, list), f"{label}: entries not a list")
        keys = []
        row = {}
        for position, entry in enumerate(entries):
            require(isinstance(entry, dict), f"{label}: entry {position} not an object")
            require(set(entry) == {"key", "numerator", "denominator"}, f"{label}: bad keys")
            key_list = entry["key"]
            require(
                isinstance(key_list, list) and len(key_list) == 4
                and all(isinstance(value, int) and value >= 0 for value in key_list),
                f"{label}: invalid slack key at {position}",
            )
            key = tuple(key_list)
            require(key not in row, f"{label}: duplicate slack key {key}")
            numerator = decode_ring_polynomial(
                entry["numerator"], rational_field, f"{label}/{key}/numerator",
            )
            denominator = decode_ring_polynomial(
                entry["denominator"], rational_field, f"{label}/{key}/denominator",
            )
            require(denominator != 0, f"{label}/{key}: zero denominator")
            value = rational_field.new(numerator, denominator)
            require(value != 0, f"{label}/{key}: encoded zero")
            require(
                encode_ring_polynomial(value.numer) == entry["numerator"]
                and encode_ring_polynomial(value.denom) == entry["denominator"],
                f"{label}/{key}: encoding is not canonical",
            )
            row[key] = value
            keys.append(key)
            invariant_stream.append([
                label, list(key), entry["numerator"], entry["denominator"],
            ])
        require(keys == sorted(keys), f"{label}: keys are not sorted")
        rows[tuple(label.split("*"))] = row
        counts[label] = len(row)
    require(set(rows) == set(PRODUCTS), "decoded product set mismatch")
    mixed_keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    require(len(mixed_keys) == 135, f"mixed key count is {len(mixed_keys)}, expected 135")
    return rows, mixed_keys, {
        "gzip_sha256": CACHE_SHA,
        "uncompressed_json_sha256": hashlib.sha256(uncompressed).hexdigest().upper(),
        "canonical_decoded_rows_sha256": digest_json(invariant_stream),
        "product_entry_counts": counts,
        "nonzero_b_keys": len(mixed_keys),
    }


# Independent reconstruction of the cache rows from the defining block formulas.
def ordinary_row_add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def ordinary_row_scale(row, scalar):
    return {
        basis: tuple(scalar * value for value in row[basis])
        for basis in BASES
    }


def slack_add(*values):
    result = {}
    for value in values:
        for monomial, coefficient in value.items():
            updated = result.get(monomial, 0) + coefficient
            if updated == 0:
                result.pop(monomial, None)
            else:
                result[monomial] = updated
    return result


def slack_scale(value, scalar):
    return {
        monomial: coefficient * scalar
        for monomial, coefficient in value.items()
        if coefficient * scalar != 0
    }


def slack_multiply(left, right):
    result = {}
    for first, first_coefficient in left.items():
        for second, second_coefficient in right.items():
            monomial = tuple(first[index] + second[index] for index in range(4))
            updated = result.get(monomial, 0) + first_coefficient * second_coefficient
            if updated == 0:
                result.pop(monomial, None)
            else:
                result[monomial] = updated
    return result


def promote_row(row):
    return {
        basis: tuple({ZERO4: value} if value != 0 else {} for value in row[basis])
        for basis in BASES
    }


def slack_row_add(*rows):
    return {
        basis: tuple(slack_add(*(row[basis][index] for row in rows)) for index in range(3))
        for basis in BASES
    }


def slack_row_times(row, scalar_polynomial):
    return {
        basis: tuple(slack_multiply(value, scalar_polynomial) for value in row[basis])
        for basis in BASES
    }


def slack_cross(first, second):
    return slack_add(
        slack_scale(slack_multiply(first[1], second[1]), 2),
        slack_scale(slack_multiply(first[0], second[2]), -1),
        slack_scale(slack_multiply(first[2], second[0]), -1),
        slack_scale(slack_multiply(first[0], second[1]), -1),
        slack_scale(slack_multiply(first[1], second[0]), -1),
    )


def slack_form(row):
    return slack_add(
        slack_multiply(row[1], row[1]),
        slack_scale(slack_multiply(row[0], row[2]), -1),
        slack_scale(slack_multiply(row[0], row[1]), -1),
    )


def slack_product_row(first, second, whole, tail, capacity):
    if first == second:
        return slack_add(
            slack_scale(slack_form(whole[first]), capacity),
            slack_cross(whole[first], tail[first]),
        )
    return slack_add(
        slack_scale(slack_cross(whole[first], whole[second]), capacity),
        slack_cross(whole[first], tail[second]),
        slack_cross(whole[second], tail[first]),
    )


def reconstruct_symbolic_rows(rational_field, k, x, y):
    N, M = k + x, k + y
    zero = (rational_field.zero,) * 3
    total_root = N + M - k + 1
    left_root, right_root = x + 1, y + 1
    whole_base = {
        "T": tuple(
            (N + 1) * (M + 1) * value / (N * M)
            for value in (1, total_root, total_root * (total_root - 1))
        ),
        "L": tuple(
            -(N + 1) * value / (N * M)
            for value in (1, left_root, left_root * (left_root - 1))
        ),
        "R": tuple(
            -(M + 1) * value / (N * M)
            for value in (1, right_root, right_root * (right_root - 1))
        ),
    }
    left_previous, right_previous = (N + 1) / N, (M + 1) / M
    excluded = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (
                1 + (k - 1) * (N + 1) / (y + 2)
                + (k - 1) * (k - 2) * (N**2 - 1) / (2 * (y + 2) * (y + 3))
            ),
            right_previous * (
                y + 1 + k * (N + 1)
                + k * (k - 1) * (N**2 - 1) / (2 * (y + 2))
            ),
            right_previous * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + k * (k + 1) * (N**2 - 1) / 2
            ),
        ),
    }
    tail_base = ordinary_row_add(whole_base, ordinary_row_scale(excluded, -1))

    left_degree0 = {
        "T": zero, "L": zero,
        "R": (right_previous, right_previous * (y + 1), right_previous * y * (y + 1)),
    }
    left_degree1_unit = {
        "T": zero, "L": zero,
        "R": tuple(
            (k - 1 + index) * value
            for index, value in enumerate((
                right_previous / (y + 2), right_previous, right_previous * (y + 1),
            ))
        ),
    }
    left_degree1 = ordinary_row_scale(left_degree1_unit, N + 1)
    right_degree0 = {
        "T": zero,
        "L": (left_previous, left_previous * (x + 1), left_previous * x * (x + 1)),
        "R": zero,
    }
    right_degree1_unit = {
        "T": zero,
        "L": tuple(
            (k - 1 + index) * value
            for index, value in enumerate((
                left_previous / (x + 2), left_previous, left_previous * (x + 1),
            ))
        ),
        "R": zero,
    }
    right_degree1 = ordinary_row_scale(right_degree1_unit, M + 1)
    bulk = ordinary_row_add(
        whole_base,
        ordinary_row_scale(left_degree0, -1), ordinary_row_scale(left_degree1, -1),
        ordinary_row_scale(right_degree0, -1), ordinary_row_scale(right_degree1, -1),
    )
    tail_bulk = ordinary_row_add(
        tail_base,
        ordinary_row_scale(right_degree0, -1), ordinary_row_scale(right_degree1, -1),
    )

    left0, left1, right0, right1, bulk_p, tail_bulk_p = map(
        promote_row, (left_degree0, left_degree1, right_degree0, right_degree1, bulk, tail_bulk),
    )
    one = {ZERO4: rational_field.one}
    p_term = {(1, 0, 0, 0): rational_field.one}
    b_term = {(0, 1, 0, 0): rational_field.one}
    q_term = {(0, 0, 1, 0): rational_field.one}
    s_term = {(0, 0, 0, 1): rational_field.one}
    left_one = slack_add(one, p_term, slack_scale(b_term, 1 / (N + 1)))
    left_two = slack_multiply(
        left_one, slack_add(one, slack_scale(b_term, 1 / (N - 1))),
    )
    right_one = slack_multiply(
        slack_add(one, q_term), slack_add(one, slack_scale(s_term, 1 / (M + 1))),
    )
    right_two = slack_multiply(
        right_one, slack_add(one, slack_scale(s_term, 1 / (M - 1))),
    )
    whole = slack_row_add(
        slack_row_times(left0, right_two),
        slack_row_times(left1, slack_multiply(left_one, right_two)),
        slack_row_times(right0, left_two),
        slack_row_times(right1, slack_multiply(right_one, left_two)),
        slack_row_times(bulk_p, slack_multiply(left_two, right_two)),
    )
    tail = slack_row_add(
        slack_row_times(right0, left_two),
        slack_row_times(right1, slack_multiply(right_one, left_two)),
        slack_row_times(tail_bulk_p, slack_multiply(left_two, right_two)),
    )
    rows = {}
    for product in PRODUCTS:
        polynomial = slack_product_row(*product, whole, tail, N - 2)
        rows[product] = {
            (monomial[1], monomial[0], monomial[2], monomial[3]): coefficient
            for monomial, coefficient in polynomial.items()
        }
    return rows


def compare_reconstruction(decoded, reconstructed):
    comparisons = 0
    for product in PRODUCTS:
        require(
            set(decoded[product]) == set(reconstructed[product]),
            f"cache reconstruction key mismatch for {product}",
        )
        for key, expected in reconstructed[product].items():
            comparisons += 1
            require(decoded[product][key] == expected, f"cache value mismatch {product}/{key}")
    return comparisons


def ordered_hash(coefficients) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in coefficients).encode("ascii")
    ).hexdigest().upper()


def left_summary(value):
    if value == 0:
        return {"status": "zero", "numerator_terms": 0, "denominator_terms": 0}
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    numerator_origin = value.numer.to_dict().get(ZERO3, QQ.zero)
    denominator_origin = value.denom.to_dict().get(ZERO3, QQ.zero)
    positive = (
        numerator_origin > 0 and denominator_origin > 0
        and all(coefficient > 0 for coefficient in numerator)
        and all(coefficient > 0 for coefficient in denominator)
    )
    return {
        "status": "positive" if positive else "mixed",
        "numerator_terms": len(numerator),
        "numerator_minimum": str(min(numerator)),
        "numerator_origin": str(numerator_origin),
        "numerator_ordered_sha256": ordered_hash(numerator),
        "denominator_terms": len(denominator),
        "denominator_minimum": str(min(denominator)),
        "denominator_origin": str(denominator_origin),
        "denominator_ordered_sha256": ordered_hash(denominator),
    }


def audit_left_reports(rows, keys, rational_field, k, x, y, observed_hashes):
    G, u, xv, yv = field("u,x,y", QQ)

    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): xv.as_expr(),
            y.as_expr(): yv.as_expr(),
        }))

    left_union = (k - 1) * (k + y) / (x + y + k + 2)
    names = [
        f"uniform_low_high_four_gap_left_block_scan_root_20260827_{start:03d}_{stop:03d}.json"
        for start, stop in ((1, 45), (46, 90), (91, 135))
    ]
    aggregate_routes = {"alpha": 0, "epsilon_union": 0}
    report_summaries = []
    expected_index = 1
    for name in names:
        report = read_json(name)
        file_hash = sha256(HERE / name)
        observed_hashes[name] = file_hash
        require(report.get("schema") == "uniform-low-high-four-gap-left-block-scan-root-v1", f"{name}: schema")
        require(report.get("status") == "PASS_EXACT_FOUR_GAP_LEFT_BLOCK_SHARD", f"{name}: status")
        require(report.get("failure_count") == 0, f"{name}: failures")
        require(report.get("source_sha256") == PINNED["scan_uniform_low_high_four_gap_left_block_root.py"], f"{name}: source pin")
        require(report.get("cache") == {"path": CACHE_NAME, "sha256": CACHE_SHA}, f"{name}: cache pin")
        start = report["parameters"]["start_index"]
        stop = report["parameters"]["stop_index"]
        require(start == expected_index and stop - start + 1 == len(report["results"]), f"{name}: range")
        require(report["parameters"]["total_keys"] == 135, f"{name}: total keys")
        expected_rows = []
        routes = {"alpha": 0, "epsilon_union": 0}
        for index in range(start, stop + 1):
            key = keys[index - 1]
            alpha = rows[("T", "L")].get(key, rational_field.zero)
            epsilon = rows[("L", "L")].get(key, rational_field.zero)
            total = alpha + epsilon
            total_summary = left_summary(shifted(total))
            alpha_summary = left_summary(shifted(alpha))
            epsilon_summary = left_summary(shifted(epsilon))
            reserve_summary = left_summary(shifted(total - epsilon * left_union))
            if total_summary["status"] == "positive" and alpha_summary["status"] == "positive":
                route = "alpha"
            elif (
                total_summary["status"] == "positive"
                and epsilon_summary["status"] == "positive"
                and reserve_summary["status"] == "positive"
            ):
                route = "epsilon_union"
            else:
                raise AuditMismatch(f"{name}: independently replayed failure at row {index}/{key}")
            routes[route] += 1
            aggregate_routes[route] += 1
            expected_rows.append({
                "index": index,
                "key": list(key),
                "route": route,
                "alpha_plus_epsilon": total_summary,
                "alpha": alpha_summary,
                "epsilon": epsilon_summary,
                "union_reserve": reserve_summary,
            })
        require(report["results"] == expected_rows, f"{name}: row semantics mismatch")
        require(report["routes"] == routes, f"{name}: route counts mismatch")
        report_summaries.append({
            "path": name, "sha256": file_hash, "start_index": start,
            "stop_index": stop, "semantic_rows_sha256": digest_json(expected_rows),
            "routes": routes,
        })
        expected_index = stop + 1
    require(expected_index == 136, "left reports do not cover 1..135")
    require(aggregate_routes == {"alpha": 54, "epsilon_union": 81}, "left aggregate routes")
    return names, report_summaries, aggregate_routes


# Sparse QQ polynomials in three nonnegative chart variables.
def pconstant(value):
    value = QQ(value)
    return {} if value == 0 else {ZERO3: value}


def pvariable(index):
    monomial = [0, 0, 0]
    monomial[index] = 1
    return {tuple(monomial): QQ.one}


def padd(*values):
    result = {}
    for value in values:
        for monomial, coefficient in value.items():
            updated = result.get(monomial, QQ.zero) + coefficient
            if updated == 0:
                result.pop(monomial, None)
            else:
                result[monomial] = updated
    return result


def pscale(value, scalar):
    scalar = QQ(scalar)
    return {
        monomial: coefficient * scalar
        for monomial, coefficient in value.items()
        if coefficient * scalar != 0
    }


def pmultiply(left, right):
    result = {}
    for first, first_coefficient in left.items():
        for second, second_coefficient in right.items():
            monomial = (
                first[0] + second[0], first[1] + second[1], first[2] + second[2],
            )
            updated = result.get(monomial, QQ.zero) + first_coefficient * second_coefficient
            if updated == 0:
                result.pop(monomial, None)
            else:
                result[monomial] = updated
    return result


def ppower(value, exponent):
    result = pconstant(1)
    base = value
    power = exponent
    while power:
        if power & 1:
            result = pmultiply(result, base)
        power >>= 1
        if power:
            base = pmultiply(base, base)
    return result


def transform_ring_polynomial(value, images):
    maxima = [0, 0, 0]
    terms = value.terms()
    for monomial, _ in terms:
        for index, exponent in enumerate(monomial):
            maxima[index] = max(maxima[index], exponent)
    powers = []
    for image, maximum in zip(images, maxima):
        row = [pconstant(1)]
        for _ in range(maximum):
            row.append(pmultiply(row[-1], image))
        powers.append(row)
    result = {}
    for monomial, coefficient in terms:
        term = pconstant(coefficient)
        for index, exponent in enumerate(monomial):
            term = pmultiply(term, powers[index][exponent])
        result = padd(result, term)
    return result


def transform_fraction(value, images):
    return (
        transform_ring_polynomial(value.numer, images),
        transform_ring_polynomial(value.denom, images),
    )


def sparse_sign_summary(value):
    coefficients = list(value.values())
    negative_terms = sum(coefficient < 0 for coefficient in coefficients)
    origin = value.get(ZERO3, QQ.zero)
    if not coefficients:
        status = "zero"
    elif negative_terms:
        status = "mixed"
    elif origin > 0:
        status = "positive"
    else:
        status = "nonnegative"
    return {
        "status": status,
        "terms": len(coefficients),
        "negative_terms": negative_terms,
        "minimum": str(min(coefficients)) if coefficients else "0",
        "origin": str(origin),
    }


def sparse_fraction_summary(transformed):
    numerator, denominator = transformed
    return {
        "numerator": sparse_sign_summary(numerator),
        "denominator": sparse_sign_summary(denominator),
    }


def rising_polynomial(u, degree):
    result = pconstant(1)
    for offset in range(degree):
        result = pmultiply(result, padd(u, pconstant(offset)))
    return pscale(result, QQ(1, math.factorial(degree)))


def decay_denominator(u, complement, total, order):
    result = {}
    for degree in range(order + 1):
        term = pmultiply(
            rising_polynomial(u, degree), ppower(complement, degree),
        )
        term = pmultiply(term, ppower(total, order - degree))
        result = padd(result, term)
    return result


def reserve_from_transformed(beta_t, gamma_t, delta_t, N, M, degree, u, decay_order):
    beta_num, beta_den = beta_t
    gamma_num, gamma_den = gamma_t
    delta_num, delta_den = delta_t
    total = padd(N, M)
    N_power = ppower(N, degree)
    M_power = ppower(M, degree)
    total_power = ppower(total, degree - decay_order)
    left_decay = decay_denominator(u, M, total, decay_order)
    right_decay = decay_denominator(u, N, total, decay_order)
    first = pmultiply(beta_num, pmultiply(gamma_den, delta_den))
    first = pmultiply(first, pmultiply(total_power, pmultiply(left_decay, right_decay)))
    second = pmultiply(gamma_num, pmultiply(beta_den, delta_den))
    second = pmultiply(second, pmultiply(N_power, right_decay))
    third = pmultiply(delta_num, pmultiply(beta_den, gamma_den))
    third = pmultiply(third, pmultiply(M_power, left_decay))
    numerator = padd(first, pscale(second, -1), pscale(third, -1))
    denominators = {
        "beta": sparse_sign_summary(beta_den),
        "gamma": sparse_sign_summary(gamma_den),
        "delta": sparse_sign_summary(delta_den),
    }
    return numerator, denominators


def fixed_parameters(rank, route, exact_products=False):
    flags = {
        "drop_delta": False,
        "drop_gamma": route == "C",
        "use_delta_lower_bound": route == "B",
        "use_delta_lower_bound_drop_gamma": False,
    }
    return {
        "threshold": 16,
        "fixed_rank": rank,
        "chart": "ordinary",
        "decay_order": 0,
        **flags,
        "exact_products": exact_products,
    }


def tail_parameters(route):
    return {
        "threshold": 9 if route == "D" else 16,
        "fixed_rank": None,
        "chart": "ordinary",
        "decay_order": 0 if route == "D" else 2,
        "drop_delta": False,
        "drop_gamma": route == "C",
        "use_delta_lower_bound": route == "B",
        "use_delta_lower_bound_drop_gamma": route == "D",
        "exact_products": False,
    }


def build_report_specs():
    specs = []
    rank8 = "uniform_low_high_four_gap_fixed_rank8_ordinary_exact_products_scan_root_20260827_001_135.json"
    specs.append({
        "name": rank8, "start": 1, "stop": 135, "kind": "fixed",
        "route": "rank8_exact", "parameters": fixed_parameters(8, "A", True),
    })
    fixed_names = {"A": [], "B": [], "C": []}
    for rank in range(9, 16):
        variants = {
            "A": f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_001_135.json",
            "B": f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_delta_lower_bound_001_135.json",
            "C": f"uniform_low_high_four_gap_fixed_rank{rank}_ordinary_scan_root_20260827_drop_gamma_001_135.json",
        }
        for route, name in variants.items():
            fixed_names[route].append(name)
            specs.append({
                "name": name, "start": 1, "stop": 135, "kind": "fixed",
                "route": route, "parameters": fixed_parameters(rank, route),
            })
    tail_names = {"A": [], "B": [], "C": [], "D": []}
    for route in ("A", "B", "C", "D"):
        ranges = (
            tuple((start, start + 14) for start in range(1, 136, 15))
            if route == "A" else ((1, 45), (46, 90), (91, 135))
        )
        stem = {
            "A": "", "B": "delta_lower_bound_", "C": "drop_gamma_",
            "D": "delta_lower_bound_drop_gamma_",
        }[route]
        for start, stop in ranges:
            name = (
                "uniform_low_high_four_gap_rank_decay_tail_ordinary_scan_root_20260827_"
                f"{stem}{start:03d}_{stop:03d}.json"
            )
            tail_names[route].append(name)
            specs.append({
                "name": name, "start": start, "stop": stop, "kind": "tail",
                "route": route, "parameters": tail_parameters(route),
            })
    return specs, rank8, fixed_names, tail_names


def chart_images(parameters):
    u, xv, gap = (pvariable(index) for index in range(3))
    K = (
        pconstant(parameters["fixed_rank"])
        if parameters["fixed_rank"] is not None
        else padd(u, pconstant(parameters["threshold"]))
    )
    X = xv
    N = padd(K, X)
    require(parameters["chart"] == "ordinary", "audited report is not in ordinary chart")
    Y = padd(X, gap)
    M = padd(K, Y)
    return u, K, X, Y, N, M


def expected_low_proof_scope(parameters):
    return (
        "Exact coefficientwise certificate for the "
        + (
            f"actual fixed-rank k={parameters['fixed_rank']} product expression used without bounds "
            if parameters["exact_products"] else
            f"fixed-rank k={parameters['fixed_rank']} reserve used when "
            if parameters["fixed_rank"] is not None else
            "tail reserve used when "
        )
        + (
            "gamma and delta are negative (the exact lower bound on R/T "
            "retains the helpful delta term and gamma is dropped); "
            if parameters["use_delta_lower_bound_drop_gamma"] else
            "gamma is nonnegative and delta is negative (the exact lower "
            "bound on R/T retains part of the helpful delta term); "
            if parameters["use_delta_lower_bound"] else
            "gamma is negative and delta is nonnegative (the helpful gamma "
            "term is dropped); "
            if parameters["drop_gamma"] else
            "gamma is nonnegative and delta is negative (the helpful delta "
            "term is dropped); "
            if parameters["drop_delta"] else
            "gamma and delta are nonnegative; "
        )
        + "this scan alone is not a complete four-gap theorem."
    )


def audit_low_report(spec, report, rows, keys, rational_field, k, x, y, transform_memo):
    name = spec["name"]
    parameters = report.get("parameters")
    expected_parameters = {
        "start_index": spec["start"],
        "stop_index": spec["stop"],
        "total_keys": 135,
        **spec["parameters"],
    }
    require(parameters == expected_parameters, f"{name}: parameter mismatch")
    expected_status = (
        "PASS_EXACT_FOUR_GAP_FIXED_RANK_BOUND_SHARD"
        if spec["kind"] == "fixed" else "PASS_EXACT_FOUR_GAP_RANK_DECAY_TAIL_SHARD"
    )
    require(report.get("schema") == "uniform-low-high-four-gap-rank-decay-tail-scan-v1", f"{name}: schema")
    require(report.get("status") == expected_status, f"{name}: status")
    require(report.get("source_sha256") == TAIL_SOURCE, f"{name}: source pin")
    require(report.get("cache") == {"path": CACHE_NAME, "sha256": CACHE_SHA}, f"{name}: cache pin")
    require(
        report.get("proof_scope") == expected_low_proof_scope(parameters),
        f"{name}: proof-scope semantics mismatch",
    )
    require(report.get("pass_count") == spec["stop"] - spec["start"] + 1, f"{name}: pass count")
    require(report.get("failure_count") == 0, f"{name}: failure count")
    require(len(report.get("results", [])) == report["pass_count"], f"{name}: result count")

    u, K, X, Y, N, M = chart_images(parameters)
    image_id = (
        "fixed", parameters["fixed_rank"], parameters["chart"]
    ) if parameters["fixed_rank"] is not None else (
        "tail", parameters["threshold"], parameters["chart"]
    )
    images = (K, X, Y)

    def transformed(tag, key, value):
        memo_key = (image_id, tag, key)
        if memo_key not in transform_memo:
            transform_memo[memo_key] = transform_fraction(value, images)
        return transform_memo[memo_key]

    expected_rows = []
    for index in range(spec["start"], spec["stop"] + 1):
        key = keys[index - 1]
        original_beta = rows[("T", "R")].get(key, rational_field.zero)
        original_gamma = -rows[("L", "R")].get(key, rational_field.zero)
        original_delta = -rows[("R", "R")].get(key, rational_field.zero)
        beta, gamma, delta = original_beta, original_gamma, original_delta
        if parameters["use_delta_lower_bound"] or parameters["use_delta_lower_bound_drop_gamma"]:
            N_field, M_field = k + x, k + y
            paired = (
                (k - 1) * N_field / 2
                * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
            )
            beta = beta - original_delta + original_delta * paired
            delta = rational_field.zero
            if parameters["use_delta_lower_bound_drop_gamma"]:
                gamma = rational_field.zero
        else:
            if parameters["drop_delta"]:
                delta = rational_field.zero
            if parameters["drop_gamma"]:
                gamma = rational_field.zero

        if parameters["exact_products"]:
            left_ratio = rational_field.one
            right_ratio = rational_field.one
            rank = parameters["fixed_rank"]
            for offset in range(2, rank + 1):
                common = x + y + rank + offset
                left_ratio *= (x + offset) / common
                right_ratio *= (y + offset) / common
            exact_value = original_beta - original_gamma * left_ratio - original_delta * right_ratio
            exact_t = transformed("exact", key, exact_value)
            numerator, exact_denominator = exact_t
            denominators = {"exact_product": sparse_sign_summary(exact_denominator)}
        elif parameters["use_delta_lower_bound_drop_gamma"]:
            beta_t = transformed("effective_D", key, beta)
            numerator, effective_denominator = beta_t
            denominators = {"effective_beta": sparse_sign_summary(effective_denominator)}
        else:
            beta_tag = "effective_B" if parameters["use_delta_lower_bound"] else "beta"
            gamma_tag = "zero_gamma" if gamma == 0 else "gamma"
            delta_tag = "zero_delta" if delta == 0 else "delta"
            beta_t = transformed(beta_tag, key, beta)
            gamma_t = transformed(gamma_tag, key, gamma)
            delta_t = transformed(delta_tag, key, delta)
            degree = (
                parameters["fixed_rank"] - 1
                if parameters["fixed_rank"] is not None
                else parameters["threshold"] - 1
            )
            numerator, denominators = reserve_from_transformed(
                beta_t, gamma_t, delta_t, N, M, degree, u, parameters["decay_order"],
            )
        numerator_summary = sparse_sign_summary(numerator)
        coefficient_summaries = {
            "beta": sparse_fraction_summary(transformed("beta", key, original_beta)),
            "effective_beta": sparse_fraction_summary(transformed(
                "effective_" + spec["route"], key, beta,
            )),
            "gamma": sparse_fraction_summary(transformed("gamma", key, original_gamma)),
            "delta": sparse_fraction_summary(transformed("delta", key, original_delta)),
        }
        passed = (
            numerator_summary["status"] == "positive"
            and all(summary["status"] == "positive" for summary in denominators.values())
        )
        require(passed, f"{name}: independently replayed failure at {index}/{key}")
        expected_rows.append({
            "index": index,
            "key": list(key),
            "passed": True,
            "reserve_numerator": numerator_summary,
            "reserve_denominators": denominators,
            "coefficients": coefficient_summaries,
        })
    require(report["results"] == expected_rows, f"{name}: detailed row semantics mismatch")
    return digest_json(expected_rows)


def audit_low_reports(specs, rows, keys, rational_field, k, x, y, observed_hashes):
    transform_memo = {}
    summaries = []
    for ordinal, spec in enumerate(specs, 1):
        name = spec["name"]
        report = read_json(name)
        file_hash = sha256(HERE / name)
        observed_hashes[name] = file_hash
        semantic_hash = audit_low_report(
            spec, report, rows, keys, rational_field, k, x, y, transform_memo,
        )
        summaries.append({
            "path": name,
            "sha256": file_hash,
            "kind": spec["kind"],
            "route": spec["route"],
            "fixed_rank": spec["parameters"]["fixed_rank"],
            "start_index": spec["start"],
            "stop_index": spec["stop"],
            "semantic_rows_sha256": semantic_hash,
        })
        print("AUDITED_LOW_REPORT", ordinal, len(specs), name, flush=True)
    return summaries


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [terminal + rank + 1 + gap0 + gap1, terminal + rank - 1 + gap1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def integer_form(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def integer_cross(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def direct_strong(rank, x, y, left_gap0, left_gap1, right_gap0, right_gap1):
    left_ratios, left = coefficient_row(rank, x, left_gap0, left_gap1)
    _, right = coefficient_row(rank, y, right_gap0, right_gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * integer_form(whole) + integer_cross(whole, tail)


def audit_composite(
    observed_hashes, left_names, rank8_name, fixed_names, tail_names,
):
    composite = read_json(COMPOSITE_NAME)
    composite_hash = sha256(HERE / COMPOSITE_NAME)
    require(
        composite.get("schema") == "uniform-low-high-four-gap-strong-boundary-root-v1",
        "composite schema mismatch",
    )
    require(
        composite.get("status") ==
        "PASS_EXACT_ALL_RANK_SIMULTANEOUS_LEFT_GAP01_RIGHT_GAP01_STRONG_BOUNDARY",
        "composite status mismatch",
    )
    require(
        composite.get("source_sha256") == PINNED["assemble_uniform_low_high_four_gap_strong_boundary_root.py"],
        "composite assembler source mismatch",
    )
    dependencies = composite.get("dependencies_sha256")
    require(isinstance(dependencies, dict), "composite dependency map missing")
    for name, recorded in dependencies.items():
        path = HERE / name
        require(path.is_file(), f"composite dependency missing: {name}")
        actual = sha256(path)
        require(recorded == actual, f"composite dependency hash mismatch: {name}")
        observed_hashes[name] = actual

    high_names = [
        f"uniform_low_high_four_gap_high_tight_ratio_root_20260827_{start:03d}_{stop:03d}.json"
        for start, stop in ((1, 45), (46, 90), (91, 135))
    ]
    high_audit = "uniform_low_high_four_gap_high_tight_ratio_independent_audit_root_20260827.json"
    expected_dependencies = set(PINNED) - {"assemble_uniform_low_high_four_gap_strong_boundary_root.py"}
    expected_dependencies.update(left_names)
    expected_dependencies.update(high_names)
    expected_dependencies.add(high_audit)
    expected_dependencies.add(rank8_name)
    for names in fixed_names.values():
        expected_dependencies.update(names)
    for names in tail_names.values():
        expected_dependencies.update(names)
    require(set(dependencies) == expected_dependencies, "composite dependency-name set mismatch")

    for name, expected in PINNED.items():
        if name == "assemble_uniform_low_high_four_gap_strong_boundary_root.py":
            continue
        require(dependencies.get(name) == expected, f"composite lost core pin: {name}")
    high_audit_payload = read_json(high_audit)
    require(
        high_audit_payload.get("status") ==
        "PASS_INDEPENDENT_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_AUDIT"
        and high_audit_payload.get("row_count") == 135,
        "referenced high-chart independent audit is not PASS/135",
    )

    coefficient_expansion = composite.get("coefficient_expansion", {})
    require(coefficient_expansion.get("nonzero_b_positive_keys") == 135, "composite key count")
    require(
        coefficient_expansion.get("left_block_routes") == {"alpha": 54, "epsilon_union": 81},
        "composite left routes",
    )
    low = composite.get("regional_proof", {}).get("y_ge_x", {})
    require(low.get("rank8") == rank8_name, "composite rank8 route")
    require(low.get("ranks9_through15") == fixed_names, "composite fixed-rank routes")
    expected_tail_routes = [
        {"route": "A: gamma>=0, delta>=0", "reports": tail_names["A"]},
        {"route": "B: gamma>=0, delta<0", "reports": tail_names["B"]},
        {"route": "C: gamma<0, delta>=0", "reports": tail_names["C"]},
    ]
    require(low.get("rank_at_least16") == expected_tail_routes, "composite A/B/C tail routes")
    require(
        low.get("both_negative_rank_at_least9") == {
            "route": "D: gamma<0, delta<0", "reports": tail_names["D"],
        },
        "composite D tail route",
    )

    values = (
        (8, 0, 0, 1, 1, 1, 1),
        (8, 3, 11, 17, 5, 29, 43),
        (11, 1, 100, 7, 13, 43, 19),
        (15, 29, 2, 100, 37, 5, 71),
        (23, 7, 31, 3, 11, 71, 113),
    )
    expected_direct = []
    for item in values:
        result = direct_strong(*item)
        require(result > 0, f"direct strong check failed: {item}")
        expected_direct.append({
            "rank": item[0], "x": item[1], "y": item[2],
            "left_gap0": item[3], "left_gap1": item[4],
            "right_gap0": item[5], "right_gap1": item[6],
            "strong_auxiliary": str(result),
        })
    require(composite.get("direct_exact_checks") == expected_direct, "composite direct checks")
    require(
        composite.get("scope_warning") ==
        "This closes four simultaneous gap coordinates on the translated low/high boundary. "
        "It is not by itself a proof of Erdos Problem #993.",
        "composite scope warning",
    )
    return {
        "path": COMPOSITE_NAME,
        "sha256": composite_hash,
        "status": composite["status"],
        "assembler_source_sha256": composite["source_sha256"],
        "dependency_count": len(dependencies),
        "dependency_map_sha256": digest_json(dependencies),
        "high_chart_dependency": {
            "independent_audit": high_audit,
            "sha256": dependencies[high_audit],
            "status_hash_verified_only_in_this_audit": True,
        },
    }


def required_artifacts():
    specs, rank8_name, fixed_names, tail_names = build_report_specs()
    left_names = [
        f"uniform_low_high_four_gap_left_block_scan_root_20260827_{start:03d}_{stop:03d}.json"
        for start, stop in ((1, 45), (46, 90), (91, 135))
    ]
    names = set(PINNED)
    names.add(COMPOSITE_NAME)
    names.update(left_names)
    names.update(spec["name"] for spec in specs)
    return sorted(names), specs, rank8_name, fixed_names, tail_names, left_names


def main() -> int:
    required, specs, rank8_name, fixed_names, tail_names, left_names = required_artifacts()
    missing = [name for name in required if not (HERE / name).is_file()]
    if missing:
        print("WAIT_REQUIRED_ARTIFACTS", len(missing), flush=True)
        for name in missing:
            print("MISSING", name, flush=True)
        return 2

    observed_hashes = {}
    try:
        for name, expected in PINNED.items():
            actual = sha256(HERE / name)
            require(actual == expected, f"pinned artifact mismatch: {name} = {actual}")
            observed_hashes[name] = actual

        F, k, x, y = field("k,x,y", QQ)
        decoded_rows, keys, cache_invariants = load_cache_direct(F)
        print("CACHE_PARSED", cache_invariants["canonical_decoded_rows_sha256"], flush=True)
        reconstructed_rows = reconstruct_symbolic_rows(F, k, x, y)
        comparisons = compare_reconstruction(decoded_rows, reconstructed_rows)
        cache_invariants["reconstructed_nonzero_coefficients_compared"] = comparisons
        cache_invariants["formula_reconstruction_exact"] = True
        print("CACHE_RECONSTRUCTION_EXACT", comparisons, flush=True)

        left_names, left_summaries, left_routes = audit_left_reports(
            decoded_rows, keys, F, k, x, y, observed_hashes,
        )
        print("LEFT_BLOCK_EXACT", left_routes, flush=True)
        low_summaries = audit_low_reports(
            specs, decoded_rows, keys, F, k, x, y, observed_hashes,
        )
        composite_summary = audit_composite(
            observed_hashes, left_names, rank8_name, fixed_names, tail_names,
        )
        observed_hashes[COMPOSITE_NAME] = composite_summary["sha256"]

        payload = {
            "schema": "uniform-low-high-four-gap-low-chart-composite-independent-audit-agent-v1",
            "status": "PASS_INDEPENDENT_EXACT_FOUR_GAP_CACHE_AND_LOW_CHART_COMPOSITE_AUDIT",
            "scope": {
                "cache": "direct gzip parse plus exact reconstruction of every symbolic coefficient",
                "left_block": "all 135 nonzero b>=1 coefficient rows",
                "low_chart": (
                    "k=8 exact products; fixed ranks 9..15 routes A/B/C; "
                    "rank-tail routes A/B/C/D"
                ),
                "composite": "complete dependency hash map and low-chart routing semantics",
                "high_chart_boundary": (
                    "the composite's pre-existing independent high-chart audit is status/hash verified, "
                    "not algebraically replayed again here"
                ),
            },
            "cache_invariants": cache_invariants,
            "left_block": {
                "routes": left_routes,
                "reports": left_summaries,
            },
            "low_chart": {
                "report_count": len(low_summaries),
                "reports": low_summaries,
                "rank8_exact_report": rank8_name,
                "fixed_ranks9_through15": fixed_names,
                "tail_routes": tail_names,
            },
            "composite": composite_summary,
            "dependencies_sha256": dict(sorted(observed_hashes.items())),
            "checks": {
                "no_local_producer_scanner_diagnostic_or_assembler_module_imported": True,
                "raw_gzip_hash_pinned": True,
                "cache_encoding_canonical": True,
                "cache_formula_reconstruction_exact": True,
                "all_left_rows_replayed_exact": True,
                "all_low_chart_rows_replayed_exact": True,
                "all_report_parameters_statuses_and_hashes_exact": True,
                "composite_dependency_map_exact": True,
                "composite_low_chart_semantics_exact": True,
            },
            "source_sha256": sha256(Path(__file__).resolve()),
            "scope_warning": (
                "This independently audits the four-gap translated boundary cache and low-chart "
                "certificate chain. It is not by itself a proof of Erdos Problem #993."
            ),
        }
        atomic_json(HERE / OUTPUT_NAME, payload)
        print(payload["status"], flush=True)
        print("SOURCE", payload["source_sha256"], flush=True)
        print("REPORT", sha256(HERE / OUTPUT_NAME), flush=True)
        return 0
    except Exception as exc:
        failure = {
            "schema": "uniform-low-high-four-gap-low-chart-composite-independent-audit-agent-failure-v1",
            "status": "FAIL_INDEPENDENT_EXACT_FOUR_GAP_CACHE_AND_LOW_CHART_COMPOSITE_AUDIT",
            "error_type": type(exc).__name__,
            "error": str(exc),
            "observed_dependencies_sha256": dict(sorted(observed_hashes.items())),
            "source_sha256": sha256(Path(__file__).resolve()),
        }
        atomic_json(HERE / FAILURE_NAME, failure)
        print(failure["status"], type(exc).__name__, str(exc), flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
