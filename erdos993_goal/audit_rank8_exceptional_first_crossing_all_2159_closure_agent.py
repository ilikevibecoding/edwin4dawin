#!/usr/bin/env python3
"""Independent, hash-pinned closure audit of the 2,159 exceptional cells.

This auditor does not recompute Q8.  It independently rebuilds the designed
cell inventory and replays the exact producer/auditor artifact graph down to
every current SQLite database hash.  It fails closed on any missing cell,
overlap, aggregate disagreement, or hash mismatch.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
CONFIG = ROOT / "rank8_exceptional_first_crossing_all_2159_closure_config_agent_20260823.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json"


class AuditFailure(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AuditFailure(message)


digest_cache: dict[str, str] = {}
size_cache: dict[str, int] = {}


def local_path(name: str) -> Path:
    path = (ROOT / name).resolve()
    require(path.parent == ROOT, f"path escapes project root: {name}")
    require(path.is_file(), f"missing dependency: {name}")
    return path


def digest(path: Path) -> str:
    name = path.name
    if name in digest_cache:
        return digest_cache[name]
    before = path.stat()
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            hasher.update(block)
    after = path.stat()
    require(
        (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns),
        f"dependency changed while hashing: {name}",
    )
    value = hasher.hexdigest().upper()
    digest_cache[name] = value
    size_cache[name] = after.st_size
    return value


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {path.name}")
    return value


def verify_pin(name: str, expected: str, label: str) -> Path:
    path = local_path(name)
    actual = digest(path)
    require(actual == expected.upper(), f"{label} hash mismatch: {name}: {actual} != {expected}")
    return path


def verify_embedded_hashes(document: dict[str, Any], label: str) -> None:
    hashes = document.get("hashes")
    require(isinstance(hashes, dict) and hashes, f"missing embedded hashes: {label}")
    for name, expected in sorted(hashes.items()):
        require(isinstance(name, str) and isinstance(expected, str), f"malformed hash entry: {label}")
        actual = digest(local_path(name))
        require(actual == expected.upper(), f"embedded hash mismatch: {label}: {name}")


@dataclass(frozen=True)
class Summary:
    raw: int
    keys: int
    products: int
    negative: int
    zero: int
    minimum: int
    maximum: int


def summary(block: dict[str, Any], raw_field: str) -> Summary:
    return Summary(
        raw=int(block[raw_field]),
        keys=int(block["canonical_check_keys"]),
        products=int(block["distinct_crossing_jets"]),
        negative=int(block["negative_Q8"]),
        zero=int(block["zero_Q8"]),
        minimum=int(block["minimum_Q8"]),
        maximum=int(block["maximum_Q8"]),
    )


def require_same_summary(left: Summary, right: Summary, label: str) -> None:
    require(left == right, f"producer/auditor aggregate mismatch: {label}: {left} != {right}")
    require(left.negative == left.zero == 0, f"nonpositive Q8 count in {label}")
    require(left.minimum > 0, f"nonpositive minimum Q8 in {label}")


def build_design(
    design: dict[str, Any], design_audit: dict[str, Any], expected: dict[str, Any]
) -> tuple[dict[tuple[int, int, int], int], int]:
    require(
        design.get("status")
        == "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
        "design status is not PASS",
    )
    require(
        design_audit.get("status")
        == "PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
        "independent design-audit status is not PASS",
    )
    verify_embedded_hashes(design, "streaming design")
    verify_embedded_hashes(design_audit, "independent streaming-design audit")

    cells: dict[tuple[int, int, int], int] = {}
    total_shards = 0
    band_replay: dict[int, dict[str, int]] = {}
    expected_sources = {8: list(range(6, 14)), 9: list(range(5, 14))}
    expected_types = {8: (948, 1200), 9: (1201, 1215)}

    for terminal_alpha in (8, 9):
        band = design["bands"][str(terminal_alpha)]
        source_cells = band["source_cells"]
        sources = sorted(int(value) for value in source_cells)
        require(sources == expected_sources[terminal_alpha], f"design source gap in alpha{terminal_alpha}")
        band_raw = 0
        band_cells = 0
        band_shards = 0
        for source_alpha in sources:
            source = source_cells[str(source_alpha)]
            lo, hi = map(int, source["terminal_type_indices"])
            require((lo, hi) == expected_types[terminal_alpha], f"design type range mismatch alpha{terminal_alpha}/s{source_alpha}")
            base = int(source["lower_source_raw_count"])
            prefix = int(source["lower_prefix_base_raw_count"])
            expected_indices = list(range(lo, hi + 1))
            source_raw = 0
            for terminal_type in expected_indices:
                relative = terminal_type - lo + 1
                raw = base + relative * prefix
                key = (terminal_alpha, source_alpha, terminal_type)
                require(key not in cells, f"duplicate designed cell: {key}")
                cells[key] = raw
                source_raw += raw
            require(
                source_raw == int(source["raw_multiset_crossing_count"]),
                f"design raw formula mismatch alpha{terminal_alpha}/s{source_alpha}",
            )
            require(
                max(cells[(terminal_alpha, source_alpha, index)] for index in expected_indices)
                == int(source["maximum_single_type_raw_count"]),
                f"design maximum mismatch alpha{terminal_alpha}/s{source_alpha}",
            )
            shard_covered: list[int] = []
            shard_raw = 0
            for shard in source["shards"]:
                shard_lo = int(shard["terminal_type_index_start"])
                shard_hi = int(shard["terminal_type_index_stop"])
                indices = list(range(shard_lo, shard_hi + 1))
                require(
                    int(shard["raw_multiset_count"])
                    == sum(cells[(terminal_alpha, source_alpha, index)] for index in indices),
                    f"design shard raw mismatch alpha{terminal_alpha}/s{source_alpha}/{shard_lo}-{shard_hi}",
                )
                shard_covered.extend(indices)
                shard_raw += int(shard["raw_multiset_count"])
            require(shard_covered == expected_indices, f"design shard gap/overlap alpha{terminal_alpha}/s{source_alpha}")
            require(shard_raw == source_raw, f"design shard aggregate mismatch alpha{terminal_alpha}/s{source_alpha}")
            require(len(source["shards"]) == int(source["shard_count"]), f"design shard count mismatch alpha{terminal_alpha}/s{source_alpha}")
            band_raw += source_raw
            band_cells += len(expected_indices)
            band_shards += len(source["shards"])
        require(band_raw == int(band["raw_multisets_total"]), f"design band raw mismatch alpha{terminal_alpha}")
        require(band_cells == int(band["source_type_cells"]), f"design band cell mismatch alpha{terminal_alpha}")
        require(band_shards == int(band["shard_count"]), f"design band shard mismatch alpha{terminal_alpha}")
        band_replay[terminal_alpha] = {"raw": band_raw, "cells": band_cells, "shards": band_shards}
        total_shards += band_shards

    aggregate = design["aggregate"]
    require(len(cells) == int(aggregate["remaining_source_type_cells"]), "design total cell mismatch")
    require(sum(cells.values()) == int(aggregate["raw_multisets_total"]), "design total raw mismatch")
    require(total_shards == int(aggregate["shard_count"]), "design total shard mismatch")
    require(len(cells) == int(expected["source_type_cells"]), "config/design total cell mismatch")
    require(sum(cells.values()) == int(expected["raw_multisets"]), "config/design total raw mismatch")
    require(total_shards == int(expected["design_shards"]), "config/design total shard mismatch")
    require(band_replay[8]["cells"] == int(expected["terminal_alpha8_cells"]), "alpha8 cell count mismatch")
    require(band_replay[9]["cells"] == int(expected["terminal_alpha9_cells"]), "alpha9 cell count mismatch")

    audited = design_audit["coverage"]
    require(int(audited["source_type_cells"]) == len(cells), "independent design-audit cell mismatch")
    require(int(audited["raw_multisets"]) == sum(cells.values()), "independent design-audit raw mismatch")
    require(int(audited["shards"]) == total_shards, "independent design-audit shard mismatch")
    require(int(audited["gaps"]) == int(audited["overlaps"]) == 0, "independent design-audit gap/overlap")
    for terminal_alpha in (8, 9):
        audited_band = audited["bands"][str(terminal_alpha)]
        replay = band_replay[terminal_alpha]
        require(int(audited_band["source_type_cells"]) == replay["cells"], f"audited band cells alpha{terminal_alpha}")
        require(int(audited_band["raw_multisets"]) == replay["raw"], f"audited band raw alpha{terminal_alpha}")
        require(int(audited_band["shards"]) == replay["shards"], f"audited band shards alpha{terminal_alpha}")
    return cells, total_shards


def add_cell(
    observed: dict[tuple[int, int, int], int],
    designed: dict[tuple[int, int, int], int],
    key: tuple[int, int, int],
    raw: int,
    label: str,
) -> None:
    require(key in designed, f"artifact cell absent from design: {key}: {label}")
    require(key not in observed, f"overlapping artifact cell: {key}: {label}")
    require(raw == designed[key], f"raw replay mismatch at {key}: {raw} != {designed[key]}: {label}")
    observed[key] = raw


def verify_coverage(
    coverage: dict[str, Any], terminal_alpha: int, source_alpha: int, lo: int, hi: int, label: str
) -> None:
    require(int(coverage["terminal_alpha"]) == terminal_alpha, f"terminal alpha mismatch: {label}")
    require(int(coverage["source_alpha"]) == source_alpha, f"source alpha mismatch: {label}")
    require(list(map(int, coverage["terminal_type_indices"])) == [lo, hi], f"type range mismatch: {label}")
    require(int(coverage["terminal_type_count"]) == hi - lo + 1, f"type count mismatch: {label}")
    if "gaps_within_shard" in coverage:
        require(int(coverage["gaps_within_shard"]) == 0, f"shard gap: {label}")
        require(int(coverage["overlaps_within_shard"]) == 0, f"shard overlap: {label}")
    if "gaps" in coverage:
        require(int(coverage["gaps"]) == 0, f"coverage gap: {label}")
        require(int(coverage["overlaps"]) == 0, f"coverage overlap: {label}")


def verify_per_type_report(
    report: dict[str, Any],
    audit: dict[str, Any],
    designed: dict[tuple[int, int, int], int],
    observed: dict[tuple[int, int, int], int],
    terminal_alpha: int,
    source_alpha: int,
    lo: int,
    hi: int,
    label: str,
    audit_block_name: str = "aggregate",
) -> Summary:
    verify_coverage(report["coverage"], terminal_alpha, source_alpha, lo, hi, label)
    verify_coverage(audit["coverage"], terminal_alpha, source_alpha, lo, hi, f"{label} audit")
    producer = summary(report["aggregate"], "independently_counted_raw_multisets")
    audit_block = audit[audit_block_name]
    checked = summary(audit_block, "independently_enumerated_multisets")
    require_same_summary(producer, checked, label)
    entries = report["per_terminal_type"]
    indices = [int(item["terminal_type_index"]) for item in entries]
    require(indices == list(range(lo, hi + 1)), f"per-type coverage gap/overlap: {label}")
    raw_sum = 0
    key_sum = 0
    for item in entries:
        terminal_type = int(item["terminal_type_index"])
        raw = int(item["raw_multisets"])
        require(int(item.get("negative_Q8", 0)) == 0, f"per-type negative Q8: {label}/{terminal_type}")
        require(int(item.get("zero_Q8", 0)) == 0, f"per-type zero Q8: {label}/{terminal_type}")
        require(int(item["minimum_Q8"]) > 0, f"per-type nonpositive minimum: {label}/{terminal_type}")
        add_cell(observed, designed, (terminal_alpha, source_alpha, terminal_type), raw, label)
        raw_sum += raw
        key_sum += int(item["canonical_checks"])
    require(raw_sum == producer.raw, f"per-type raw aggregate mismatch: {label}")
    require(key_sum == producer.keys, f"per-type key aggregate mismatch: {label}")
    require(min(int(item["minimum_Q8"]) for item in entries) == producer.minimum, f"per-type minimum mismatch: {label}")
    require(max(int(item["maximum_Q8"]) for item in entries) == producer.maximum, f"per-type maximum mismatch: {label}")
    return producer


def verify_monolithic_alpha8(
    package: dict[str, Any],
    designed: dict[tuple[int, int, int], int],
    observed: dict[tuple[int, int, int], int],
) -> tuple[Summary, int, dict[str, Any]]:
    report_path = verify_pin(package["report_file"], package["report_sha256"], "monolithic report")
    audit_path = verify_pin(package["audit_file"], package["audit_sha256"], "monolithic audit")
    report = load_json(report_path)
    audit = load_json(audit_path)
    require(str(report["status"]).startswith("PASS_EXACT_RESOURCE_GATED_NO_GAP_"), f"producer not PASS: {report_path.name}")
    require(str(audit["status"]).startswith("PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_"), f"audit not PASS: {audit_path.name}")
    verify_embedded_hashes(report, report_path.name)
    verify_embedded_hashes(audit, audit_path.name)
    terminal_alpha = int(package["terminal_alpha"])
    source_alpha = int(package["source_alpha"])
    lo, hi = int(package["type_start"]), int(package["type_stop"])
    require(
        ("shard" in audit) ^ ("aggregate" in audit),
        f"unexpected monolithic audit aggregate layout: {audit_path.name}",
    )
    audit_block_name = "shard" if "shard" in audit else "aggregate"
    value = verify_per_type_report(
        report,
        audit,
        designed,
        observed,
        terminal_alpha,
        source_alpha,
        lo,
        hi,
        report_path.name,
        audit_block_name=audit_block_name,
    )
    return value, 1, {
        "kind": package["kind"],
        "source_alpha_range": [source_alpha, source_alpha],
        "terminal_alpha": terminal_alpha,
        "type_indices": [lo, hi],
        "cells": hi - lo + 1,
        "design_shards": 1,
        "raw_multisets": value.raw,
        "report_file": report_path.name,
        "report_sha256": digest(report_path),
        "audit_file": audit_path.name,
        "audit_sha256": digest(audit_path),
    }


def verify_monolithic_alpha9_range(
    package: dict[str, Any],
    designed: dict[tuple[int, int, int], int],
    observed: dict[tuple[int, int, int], int],
) -> tuple[Summary, int, dict[str, Any]]:
    report_path = verify_pin(package["report_file"], package["report_sha256"], "monolithic range report")
    audit_path = verify_pin(package["audit_file"], package["audit_sha256"], "monolithic range audit")
    report = load_json(report_path)
    audit = load_json(audit_path)
    require(str(report["status"]).startswith("PASS_EXACT_RESOURCE_GATED_NO_GAP_"), f"producer not PASS: {report_path.name}")
    require(str(audit["status"]).startswith("PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_"), f"audit not PASS: {audit_path.name}")
    verify_embedded_hashes(report, report_path.name)
    verify_embedded_hashes(audit, audit_path.name)
    terminal_alpha = int(package["terminal_alpha"])
    source_start, source_stop = int(package["source_start"]), int(package["source_stop"])
    lo, hi = int(package["type_start"]), int(package["type_stop"])
    coverage = report["coverage"]
    audit_coverage = audit["coverage"]
    for block, label in ((coverage, "report"), (audit_coverage, "audit")):
        require(int(block["terminal_alpha"]) == terminal_alpha, f"terminal alpha mismatch in range {label}")
        require(list(map(int, block["source_alpha_range"])) == [source_start, source_stop], f"source range mismatch in {label}")
        require(list(map(int, block["terminal_type_indices"])) == [lo, hi], f"type range mismatch in {label}")
        require(int(block["source_type_cells"]) == (source_stop - source_start + 1) * (hi - lo + 1), f"range cell mismatch in {label}")
        require(int(block["gaps"]) == int(block["overlaps"]) == 0, f"range gap/overlap in {label}")
    producer = summary(report["aggregate"], "independently_counted_raw_multisets")
    checked = summary(audit["aggregate"], "independently_enumerated_multisets")
    require_same_summary(producer, checked, report_path.name)
    report_cells = report["cells"]
    audit_cells = audit["cells"]
    require(len(report_cells) == len(audit_cells) == source_stop - source_start + 1, "range source count mismatch")
    raw_sum = 0
    key_sum = 0
    for offset, source_alpha in enumerate(range(source_start, source_stop + 1)):
        item = report_cells[offset]
        checked_item = audit_cells[offset]
        require(int(item["source_alpha"]) == source_alpha, f"source ordering mismatch: {report_path.name}")
        require(int(checked_item["source_alpha"]) == source_alpha, f"audited source ordering mismatch: {audit_path.name}")
        require(int(item["terminal_alpha"]) == terminal_alpha, f"cell terminal alpha mismatch: {report_path.name}")
        source_raw = sum(designed[(terminal_alpha, source_alpha, terminal_type)] for terminal_type in range(lo, hi + 1))
        require(int(item["raw_multisets"]) == source_raw, f"source raw replay mismatch: {report_path.name}/s{source_alpha}")
        require(int(checked_item["raw_multisets"]) == source_raw, f"audited source raw mismatch: {audit_path.name}/s{source_alpha}")
        require(int(item["minimum_Q8"]) == int(checked_item["minimum_Q8"]) > 0, f"source minimum mismatch: s{source_alpha}")
        require(int(item["maximum_Q8"]) == int(checked_item["maximum_Q8"]), f"source maximum mismatch: s{source_alpha}")
        if "terminal_type_indices" in item:
            require(list(map(int, item["terminal_type_indices"])) == [lo, hi], f"cell type range mismatch: {report_path.name}")
            require(int(item["terminal_type_count"]) == hi - lo + 1, f"cell type count mismatch: {report_path.name}")
            require(int(item["negative_Q8"]) == int(item["zero_Q8"]) == 0, f"nonpositive count: {report_path.name}/s{source_alpha}")
            for terminal_type in range(lo, hi + 1):
                key = (terminal_alpha, source_alpha, terminal_type)
                add_cell(observed, designed, key, designed[key], report_path.name)
        else:
            require("per_terminal_type" in item, f"missing source cell coverage evidence: {report_path.name}/s{source_alpha}")
            per_type = item["per_terminal_type"]
            indices = [int(entry["terminal_type_index"]) for entry in per_type]
            require(indices == list(range(lo, hi + 1)), f"nested cell type gap/overlap: {report_path.name}/s{source_alpha}")
            require(sum(int(entry["raw_multisets"]) for entry in per_type) == source_raw, f"nested cell raw mismatch: s{source_alpha}")
            require(sum(int(entry["canonical_checks"]) for entry in per_type) == int(item["canonical_check_keys"]), f"nested cell key mismatch: s{source_alpha}")
            require(min(int(entry["minimum_Q8"]) for entry in per_type) == int(item["minimum_Q8"]), f"nested cell minimum mismatch: s{source_alpha}")
            require(max(int(entry["maximum_Q8"]) for entry in per_type) == int(item["maximum_Q8"]), f"nested cell maximum mismatch: s{source_alpha}")
            for entry in per_type:
                terminal_type = int(entry["terminal_type_index"])
                require(int(entry["minimum_Q8"]) > 0, f"nested nonpositive minimum: s{source_alpha}/{terminal_type}")
                add_cell(
                    observed,
                    designed,
                    (terminal_alpha, source_alpha, terminal_type),
                    int(entry["raw_multisets"]),
                    report_path.name,
                )
        raw_sum += source_raw
        key_sum += int(item["canonical_check_keys"])
    require(raw_sum == producer.raw, f"range raw aggregate mismatch: {report_path.name}")
    require(key_sum == producer.keys, f"range key aggregate mismatch: {report_path.name}")
    return producer, source_stop - source_start + 1, {
        "kind": package["kind"],
        "source_alpha_range": [source_start, source_stop],
        "terminal_alpha": terminal_alpha,
        "type_indices": [lo, hi],
        "cells": (source_stop - source_start + 1) * (hi - lo + 1),
        "design_shards": source_stop - source_start + 1,
        "raw_multisets": producer.raw,
        "report_file": report_path.name,
        "report_sha256": digest(report_path),
        "audit_file": audit_path.name,
        "audit_sha256": digest(audit_path),
    }


def union_summary(block: dict[str, Any]) -> Summary:
    return Summary(
        raw=int(block["independently_enumerated_raw_multisets"]),
        keys=int(block["canonical_check_keys"]),
        products=int(block["per_shard_distinct_product_jet_sum_not_globally_deduplicated"]),
        negative=int(block["negative_Q8"]),
        zero=int(block["zero_Q8"]),
        minimum=int(block["minimum_Q8"]),
        maximum=int(block["maximum_Q8"]),
    )


def combine_summaries(values: list[Summary]) -> Summary:
    require(values, "cannot combine empty summary list")
    return Summary(
        raw=sum(value.raw for value in values),
        keys=sum(value.keys for value in values),
        products=sum(value.products for value in values),
        negative=sum(value.negative for value in values),
        zero=sum(value.zero for value in values),
        minimum=min(value.minimum for value in values),
        maximum=max(value.maximum for value in values),
    )


def verify_generic_union(
    package: dict[str, Any],
    designed: dict[tuple[int, int, int], int],
    observed: dict[tuple[int, int, int], int],
) -> tuple[Summary, int, dict[str, Any]]:
    config_path = verify_pin(package["union_config_file"], package["union_config_sha256"], "union config")
    union_path = verify_pin(package["union_report_file"], package["union_report_sha256"], "union report")
    config = load_json(config_path)
    union = load_json(union_path)
    require(config["schema"] == "rank8-exceptional-first-crossing-streaming-union-config-agent-v1", f"union config schema: {config_path.name}")
    require(str(union["status"]).startswith("PASS_EXACT_HASH_PINNED_NO_GAP_"), f"union not PASS: {union_path.name}")
    verify_embedded_hashes(union, union_path.name)
    terminal_alpha = int(package["terminal_alpha"])
    source_alpha = int(package["source_alpha"])
    lo, hi = int(package["type_start"]), int(package["type_stop"])
    require(int(config["terminal_alpha"]) == terminal_alpha, f"union terminal alpha mismatch: {config_path.name}")
    require(int(config["source_alpha"]) == source_alpha, f"union source alpha mismatch: {config_path.name}")
    require(int(config["terminal_type_index_start"]) == lo and int(config["terminal_type_index_stop"]) == hi, f"union type mismatch: {config_path.name}")
    require(union["configuration"] == config, f"union embedded config mismatch: {union_path.name}")
    verify_coverage(union["coverage"], terminal_alpha, source_alpha, lo, hi, union_path.name)

    shard_summaries: list[Summary] = []
    intervals: list[list[int]] = []
    covered: list[int] = []
    maximum_producer_peak = 0
    maximum_audit_peak = 0
    for config_name in config["shard_config_files"]:
        shard_config_path = local_path(config_name)
        shard_config = load_json(shard_config_path)
        require(shard_config["schema"] == "rank8-exceptional-first-crossing-streaming-shard-config-agent-v1", f"shard config schema: {config_name}")
        require(int(shard_config["terminal_alpha"]) == terminal_alpha, f"shard terminal alpha mismatch: {config_name}")
        require(int(shard_config["source_alpha"]) == source_alpha, f"shard source alpha mismatch: {config_name}")
        shard_lo = int(shard_config["terminal_type_index_start"])
        shard_hi = int(shard_config["terminal_type_index_stop"])
        stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{shard_lo}_{shard_hi}"
        report_path = local_path(f"{stem}_shard_exact_agent_20260823.json")
        audit_path = local_path(f"{stem}_shard_independent_audit_agent_20260823.json")
        report = load_json(report_path)
        audit = load_json(audit_path)
        expected_report_status = (
            f"PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
            f"TYPES{shard_lo}_{shard_hi}_SHARD_AGENT"
        )
        expected_audit_status = (
            f"PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
            f"TYPES{shard_lo}_{shard_hi}_SHARD_AUDIT_AGENT"
        )
        require(report["status"] == expected_report_status, f"shard producer not PASS: {report_path.name}")
        require(audit["status"] == expected_audit_status, f"shard audit not PASS: {audit_path.name}")
        require(report["configuration"] == shard_config == audit["configuration"], f"shard config disagreement: {config_name}")
        verify_embedded_hashes(report, report_path.name)
        verify_embedded_hashes(audit, audit_path.name)
        value = verify_per_type_report(
            report, audit, designed, observed, terminal_alpha, source_alpha, shard_lo, shard_hi, report_path.name
        )
        require(value.raw == int(shard_config["expected_raw_multisets"]), f"shard expected raw mismatch: {config_name}")
        shard_summaries.append(value)
        intervals.append([shard_lo, shard_hi])
        covered.extend(range(shard_lo, shard_hi + 1))
        maximum_producer_peak = max(maximum_producer_peak, int(report["resources"]["peak_private_bytes"]))
        maximum_audit_peak = max(maximum_audit_peak, int(audit["resources"]["peak_private_bytes"]))

    require(covered == list(range(lo, hi + 1)), f"union shard gap/overlap: {union_path.name}")
    require(intervals == union["coverage"]["shard_intervals"], f"union interval replay mismatch: {union_path.name}")
    replay = combine_summaries(shard_summaries)
    reported = union_summary(union["aggregate"])
    require(replay == reported, f"union aggregate replay mismatch: {union_path.name}: {replay} != {reported}")
    require(replay.raw == int(config["expected_raw_multisets"]), f"union expected raw mismatch: {config_path.name}")
    require(int(union["aggregate"]["maximum_producer_peak_private_bytes"]) == maximum_producer_peak, f"producer peak replay mismatch: {union_path.name}")
    require(int(union["aggregate"]["maximum_audit_peak_private_bytes"]) == maximum_audit_peak, f"audit peak replay mismatch: {union_path.name}")
    return replay, len(shard_summaries), {
        "kind": package["kind"],
        "source_alpha_range": [source_alpha, source_alpha],
        "terminal_alpha": terminal_alpha,
        "type_indices": [lo, hi],
        "cells": hi - lo + 1,
        "design_shards": len(shard_summaries),
        "raw_multisets": replay.raw,
        "union_config_file": config_path.name,
        "union_config_sha256": digest(config_path),
        "union_report_file": union_path.name,
        "union_report_sha256": digest(union_path),
    }


def verify_legacy_union(
    package: dict[str, Any],
    designed: dict[tuple[int, int, int], int],
    observed: dict[tuple[int, int, int], int],
) -> tuple[Summary, int, dict[str, Any]]:
    union_path = verify_pin(package["union_report_file"], package["union_report_sha256"], "legacy union report")
    union = load_json(union_path)
    require(str(union["status"]).startswith("PASS_EXACT_HASH_PINNED_NO_GAP_"), f"legacy union not PASS: {union_path.name}")
    verify_embedded_hashes(union, union_path.name)
    terminal_alpha = int(package["terminal_alpha"])
    source_alpha = int(package["source_alpha"])
    lo, hi = int(package["type_start"]), int(package["type_stop"])
    verify_coverage(union["coverage"], terminal_alpha, source_alpha, lo, hi, union_path.name)
    intervals = [list(map(int, interval)) for interval in union["coverage"]["shard_intervals"]]
    covered: list[int] = []
    shard_summaries: list[Summary] = []
    maximum_producer_peak = 0
    maximum_audit_peak = 0
    for shard_lo, shard_hi in intervals:
        stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{shard_lo}_{shard_hi}"
        report_path = local_path(f"{stem}_shard_exact_agent_20260823.json")
        audit_path = local_path(f"{stem}_shard_independent_audit_agent_20260823.json")
        report = load_json(report_path)
        audit = load_json(audit_path)
        require(str(report["status"]).startswith("PASS_EXACT_RESOURCE_GATED_NO_GAP_"), f"legacy shard producer not PASS: {report_path.name}")
        require(str(audit["status"]).startswith("PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_"), f"legacy shard audit not PASS: {audit_path.name}")
        verify_embedded_hashes(report, report_path.name)
        verify_embedded_hashes(audit, audit_path.name)
        value = verify_per_type_report(
            report, audit, designed, observed, terminal_alpha, source_alpha, shard_lo, shard_hi, report_path.name
        )
        shard_summaries.append(value)
        covered.extend(range(shard_lo, shard_hi + 1))
        maximum_producer_peak = max(maximum_producer_peak, int(report["resources"]["peak_private_bytes"]))
        maximum_audit_peak = max(maximum_audit_peak, int(audit["resources"]["peak_private_bytes"]))
    require(covered == list(range(lo, hi + 1)), f"legacy union shard gap/overlap: {union_path.name}")
    replay = combine_summaries(shard_summaries)
    reported = union_summary(union["aggregate"])
    require(replay == reported, f"legacy union aggregate replay mismatch: {union_path.name}")
    require(int(union["aggregate"]["maximum_producer_peak_private_bytes"]) == maximum_producer_peak, f"legacy producer peak mismatch: {union_path.name}")
    require(int(union["aggregate"]["maximum_audit_peak_private_bytes"]) == maximum_audit_peak, f"legacy audit peak mismatch: {union_path.name}")
    return replay, len(shard_summaries), {
        "kind": package["kind"],
        "source_alpha_range": [source_alpha, source_alpha],
        "terminal_alpha": terminal_alpha,
        "type_indices": [lo, hi],
        "cells": hi - lo + 1,
        "design_shards": len(shard_summaries),
        "raw_multisets": replay.raw,
        "union_report_file": union_path.name,
        "union_report_sha256": digest(union_path),
    }


def main() -> int:
    config = load_json(CONFIG)
    require(config["schema"] == "rank8-exceptional-first-crossing-all-2159-closure-config-agent-v1", "closure config schema mismatch")
    digest(CONFIG)
    for engine in config["frozen_streaming_engines"]:
        verify_pin(engine["file"], engine["sha256"], "frozen streaming engine")
    design_ref = config["independent_design"]
    design_path = verify_pin(design_ref["file"], design_ref["sha256"], "design")
    design_audit_path = verify_pin(design_ref["audit_file"], design_ref["audit_sha256"], "independent design audit")
    design = load_json(design_path)
    design_audit = load_json(design_audit_path)
    designed, designed_shards = build_design(design, design_audit, config["expected"])

    observed: dict[tuple[int, int, int], int] = {}
    package_summaries: list[Summary] = []
    package_reports: list[dict[str, Any]] = []
    replayed_shards = 0
    for package in config["packages"]:
        kind = package["kind"]
        if kind == "monolithic_alpha8_source":
            value, shards, package_report = verify_monolithic_alpha8(package, designed, observed)
        elif kind == "monolithic_alpha9_source_range":
            value, shards, package_report = verify_monolithic_alpha9_range(package, designed, observed)
        elif kind == "legacy_union":
            value, shards, package_report = verify_legacy_union(package, designed, observed)
        elif kind == "generic_union":
            value, shards, package_report = verify_generic_union(package, designed, observed)
        else:
            raise AuditFailure(f"unknown package kind: {kind}")
        package_summaries.append(value)
        package_reports.append(package_report)
        replayed_shards += shards

    expected_keys = sorted(designed)
    observed_keys = sorted(observed)
    require(observed_keys == expected_keys, "global cell-set replay mismatch")
    require(all(observed[key] == designed[key] for key in expected_keys), "global per-cell raw replay mismatch")
    require(replayed_shards == designed_shards, f"global shard replay mismatch: {replayed_shards} != {designed_shards}")
    global_summary = combine_summaries(package_summaries)
    require(global_summary.raw == sum(designed.values()), "global raw aggregate mismatch")
    require(global_summary.negative == global_summary.zero == 0, "global nonpositive count")
    require(global_summary.minimum > 0, "global minimum is not positive")

    band_cells = {
        str(terminal_alpha): sum(1 for key in observed if key[0] == terminal_alpha)
        for terminal_alpha in (8, 9)
    }
    band_raw = {
        str(terminal_alpha): sum(raw for key, raw in observed.items() if key[0] == terminal_alpha)
        for terminal_alpha in (8, 9)
    }
    require(band_cells["8"] == int(config["expected"]["terminal_alpha8_cells"]), "observed alpha8 cell mismatch")
    require(band_cells["9"] == int(config["expected"]["terminal_alpha9_cells"]), "observed alpha9 cell mismatch")

    digest(Path(__file__).resolve())
    payload = {
        "schema": "rank8-exceptional-first-crossing-all-2159-complete-closure-audit-agent-v1",
        "status": "PASS_EXACT_HASH_PINNED_INDEPENDENT_AGGREGATE_REPLAY_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALL_2159_CLOSURE_AUDIT_AGENT",
        "certified_finite_statement": (
            "For every one of the 2159 designed exceptional-only first-crossing source/type cells "
            "with terminal alpha 8 or 9, both exact enumeration and structurally independent "
            "bidirectional audit report literal Q8>0."
        ),
        "coverage": {
            "terminal_alpha8_source_range": [6, 13],
            "terminal_alpha8_type_indices": [948, 1200],
            "terminal_alpha8_cells": band_cells["8"],
            "terminal_alpha9_source_range": [5, 13],
            "terminal_alpha9_type_indices": [1201, 1215],
            "terminal_alpha9_cells": band_cells["9"],
            "source_type_cells": len(observed),
            "design_shards_replayed": replayed_shards,
            "package_count": len(package_reports),
            "gaps": 0,
            "overlaps": 0,
        },
        "independent_aggregate_replay": {
            "raw_multisets": global_summary.raw,
            "raw_multisets_by_terminal_alpha": band_raw,
            "per_package_or_shard_canonical_check_key_sum_not_globally_deduplicated": global_summary.keys,
            "per_package_or_shard_distinct_product_jet_sum_not_globally_deduplicated": global_summary.products,
            "negative_Q8": global_summary.negative,
            "zero_Q8": global_summary.zero,
            "minimum_Q8": global_summary.minimum,
            "maximum_Q8": global_summary.maximum,
        },
        "packages": package_reports,
        "artifact_integrity": {
            "hash_algorithm": "SHA-256",
            "hashing_method": "streamed 4 MiB blocks with size and mtime stability check",
            "verified_file_count": len(digest_cache),
            "verified_file_bytes": sum(size_cache.values()),
            "hashes": dict(sorted(digest_cache.items())),
        },
        "proof_boundary": config["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"cells={len(observed)} shards={replayed_shards} packages={len(package_reports)} "
        f"raw={global_summary.raw} neg={global_summary.negative} zero={global_summary.zero}"
    )
    print(
        f"keys_sum={global_summary.keys} products_sum={global_summary.products} "
        f"min_Q8={global_summary.minimum} max_Q8={global_summary.maximum}"
    )
    print(f"verified_files={len(digest_cache)} verified_bytes={sum(size_cache.values())}")
    print(f"closure_audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AuditFailure as error:
        print(f"FAIL_CLOSED_ALL_2159_CLOSURE_AUDIT: {error}")
        raise SystemExit(1)
