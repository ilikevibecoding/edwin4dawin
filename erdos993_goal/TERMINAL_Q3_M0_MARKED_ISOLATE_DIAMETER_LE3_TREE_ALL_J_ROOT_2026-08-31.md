# Terminal q3 Newton m=0: every diameter-at-most-three tree remainder

Date: 2026-08-31

For an isolated marked root and the mandatory terminal leaf, the exact
Newton `m=0` payment is nonnegative for every supported target `j>=3` whenever
the no-isolate connected remainder is a tree of diameter at most three.

The classification and target partition are exhaustive:

- Diameter at most two gives a star, already closed for every target.
- Diameter three gives a sorted double star `D_(a,b)`, `a>=b>=1`.
- Target `j=3` is covered by the arbitrary-forest theorem.
- For `j>=4`, side `b=1` and side `b=2` have complete all-target certificates.
- For `b>=3`, the middle theorem covers `4<=j<=b+2`, and the tail theorem
  covers `j>=b+3`.

There is no missing integer target between the middle and tail regions.  Each
component certificate was replayed byte-identically before this fail-closed
assembly.

This theorem does not include disconnected remainders, trees of diameter at
least four, nonisolated marked roots, the complete terminal payment, or Erdős
Problem #993.

Replay:

```powershell
python .\assemble_terminal_q3_m0_marked_isolate_diameter_le3_tree_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_DIAMETER_LE3_TREE_ASSEMBLY_ROOT
```
