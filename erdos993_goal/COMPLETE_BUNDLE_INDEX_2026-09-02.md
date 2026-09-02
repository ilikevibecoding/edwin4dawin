# Erdős Problem #993 — comprehensive transferable workspace

Snapshot: 2026-09-02

This archive is the comprehensive handoff. It includes the full transferable
mathematical record under the proof workspace: proof notes, literature notes,
Python and other source code, exact JSON/JSONL reports, independent audits,
certificates, solver logs, tables, manuscripts, PDFs, images, and archived
small source packets. Directory structure is preserved.

The archive deliberately excludes only non-portable bulk/runtime material:

- solver scratch databases (`.sqlite`, `.sqlite3`, `.db`);
- regenerated binary matrices/shards (`.bin`);
- huge compressed raw enumeration dumps (`.gz`);
- executables and compiled runtime/cache files;
- virtual environments, package caches, build outputs, and the `portable`
  output directory itself.

Those exclusions are not asserted proof steps. The exact proof producers,
reports, audits, hashes, and human-readable evidence remain included. If a
reviewer identifies a specifically named excluded raw input that a claimed
replay genuinely requires, transfer that input separately rather than treating
its absence as mathematical evidence.

Start with:

1. `ERDOS993_OTHER_MODEL_HANDOFF_2026-09-02.md`
2. `ERDOS993_MONOTONE_PROGRESS_LEDGER_2026-08-29.md`
3. `ERDOS993_CONDITIONAL_PROOF_DRAFT_2026-08-29.md`
4. `ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md`
5. `PORTABLE_REPLAY_README_2026-09-02.md`

Run `python verify_portable_manifest.py` after extraction. The theorem remains
open: the universal rank-six `G1` step and downstream final assembly are not
certified merely because this workspace is complete and hash-pinned.

