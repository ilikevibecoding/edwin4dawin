# `wromcheck` — exhaustive exact checks over all trees on n vertices (C)

Single-file C11 program, no dependencies.

```bash
make                      # gcc -O3 -march=native
./wromcheck --nmin 23 --nmax 26          # one JSON object per n on stdout
./wromcheck --nmin 8 --nmax 8 --dump     # also print every tree: levels;coefficients
make sanitize             # ASan/UBSan build, run on n <= 16
make crosscheck           # compare with the Python reports (n <= 22)
```

## Algorithm

- Trees are generated as canonical level sequences by the
  Wright–Richmond–Odlyzko–McKay algorithm (SIAM J. Comput. 15 (1986) 540–548),
  ported from the pure-Python implementation in `networkx.nonisomorphic_trees`.
  The number of trees for each `n` is asserted against A000055 (the Python suite
  recomputes that sequence from Otter's formula in `counts.py`).
- The independence polynomial is computed by the rooted DP
  `A_v = prod_c (A_c + B_c)`, `B_v = x prod_c A_c` in `uint64_t`
  (coefficients are at most `C(n,r)`), and all quadratic tests use
  `unsigned __int128`, so every verdict is exact.
- Per tree: `UNIMODAL`, `LC_r`, `ISO_r` (all `r`, and the prefix
  `2 <= r <= L-1`), `NW_r`, `WR_r` on the prefix, `TAIL`
  (`L = ceil((2 alpha - 1)/3)`); per `n`: counts, the exact minimum
  `Q_r / ((r+1) p_{r-1} p_{r+1})` for each `r` (fractions compared by
  cross-multiplication) with an argmin tree, and one example of each kind of
  failure if any occurs.

## Validation

`crosscheck_c_vs_python.py` compares, for every `n <= 22`, the C output with the
independent Python suite (`../run_forests.py`): tree counts, every per-check
count, and the exact per-`r` minimum ISO fractions; for `n <= 14` it also
compares the SHA256 of the sorted multiset of coefficient vectors obtained from
`--dump`.  Result: `CROSSCHECK_C_VS_PYTHON_PASS` (see
`../reports/crosscheck_c_vs_python.json`).

Throughput is roughly one million trees per second per core at `n ~ 22–26`
(`n = 23`: 14.8M trees in 24 s).  Results for `n >= 23` are stored as
`../reports/trees_c_nA_nB.jsonl`.
