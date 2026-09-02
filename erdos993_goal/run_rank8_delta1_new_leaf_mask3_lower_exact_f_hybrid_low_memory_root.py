#!/usr/bin/env python3
"""Run the sealed hybrid producer while clearing SymPy caches per box."""

from __future__ import annotations

import gc

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base
import certify_rank8_delta1_new_leaf_mask3_lower_exact_f_hybrid_root as producer


original_audit = base.audit


def low_memory_audit(polynomial: sp.Poly) -> dict[str, object]:
    result = original_audit(polynomial)
    sp.core.cache.clear_cache()
    gc.collect()
    return result


base.audit = low_memory_audit


if __name__ == "__main__":
    producer.main()
