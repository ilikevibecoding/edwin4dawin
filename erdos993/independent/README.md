# Independent brute-force replay: independence polynomials of forests

This directory contains an **independent brute-force cross-check** for the
Erdős-993 project.  The code here was written separately from, and without
looking at, the other ("fast") implementation in this repository.  Its only
purpose is to produce numbers that the fast implementation can be compared
against.  It is deliberately simple and slow: obviousness and exactness are
preferred over speed.

## What `bruteforce_forests.py` does

For every `n = 0 .. NMAX` (default `NMAX = 11`; `n = 0` is the empty forest
with `I = 1`):

1. **Enumerate all unlabeled forests on `n` vertices, each exactly once.**
   * Trees of order `k` come from `networkx.nonisomorphic_trees(k)`.
     The number of trees is asserted against OEIS
     [A000055](https://oeis.org/A000055) and pairwise non-isomorphism is
     re-verified with an AHU canonical form (rooted at the tree centre).
   * A forest is a multiset of trees whose orders sum to `n`.  The script
     iterates over the integer partitions of `n`, and for a part size `k`
     occurring `m` times it takes `itertools.combinations_with_replacement`
     of the trees of order `k`, `m` at a time; the Cartesian product over
     the distinct part sizes yields each forest exactly once.
   * The number of forests is asserted against OEIS
     [A005195](https://oeis.org/A005195):
     `1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599` for
     `n = 0..14`.

2. **Compute the independence polynomial `I(F;x) = Σ_r p_r x^r` by brute
   force.**  The forest is laid out on vertices `0..n-1`; the script loops
   over all `2^n` bitmasks and tests each subset for independence directly
   against the edge list.  No product-over-components shortcut is used for
   the primary computation.  As a *self-consistency check only*, every
   polynomial is recomputed as the product of the component polynomials
   (each again by brute force) and compared; additionally `p_0 = 1`,
   `p_1 = n`, `p_2 = C(n,2) - |E|`, and `alpha = n - ν(F)` (`ν` = maximum
   matching size from `networkx`, König's theorem) are asserted.

3. **Evaluate, with exact integer / `fractions.Fraction` arithmetic:**

   | quantity | definition |
   |---|---|
   | `alpha` | degree of `I` (independence number) |
   | unimodal | `p_0 ≤ … ≤ p_m ≥ … ≥ p_alpha` for some `m` |
   | log-concave | `p_r² ≥ p_{r-1} p_{r+1}` for all `1 ≤ r ≤ alpha-1` |
   | ISO | `ISO_r = r p_r² + p_{r-1}² − (r+1) p_{r-1} p_{r+1} ≥ 0` for all `1 ≤ r ≤ alpha-1` |
   | ISO ratio | `min_r ISO_r / ((r+1) p_{r-1} p_{r+1})` over `1 ≤ r ≤ alpha-1` (exact fraction; undefined if `alpha ≤ 1`) |
   | WR | `R` = largest `R` such that `p_{r-1} ≤ r p_r` for all `1 ≤ r ≤ R` |
   | `L` | `ceil((2 alpha − 1)/3)` |
   | TAIL | `p_r ≥ p_{r+1}` for all `L ≤ r ≤ alpha-1` |

4. **Write the outputs** (into the directory of the script by default):
   * `bruteforce_forests_report.json` — per `n`: forest count (and the
     A005195 reference), number of unimodal / log-concave / ISO-satisfying /
     TAIL-satisfying forests, number of forests with `R < L` (WR fails for
     some `r ≤ L`) and with `R < L−1` (WR fails for some `r ≤ L−1`), the
     global minimum ISO ratio for that `n` as an exact fraction string with
     the argmin forest(s) given as a sorted list of tree edge lists (plus
     component sizes, AHU canonical strings and coefficients, and the number
     of forests attaining the minimum), the number of distinct coefficient
     vectors, and the SHA256 hash of the sorted multiset of coefficient
     vectors.
   * `coeffs_n{n}.txt` — the multiset of coefficient vectors for that `n`,
     one vector per line as comma-separated integers
     (`p_0,p_1,…,p_alpha`), sorted lexicographically as integer tuples
     (Python tuple order; a shorter vector precedes its extensions).

### Hash definition

So that the other implementation can reproduce the per-`n` hash exactly:

```python
vectors = sorted(list_of_coefficient_tuples)           # lexicographic on integer tuples
text    = json.dumps(vectors, sort_keys=True, separators=(",", ":"))   # e.g. "[[1,2,1],[1,3,1]]"
digest  = hashlib.sha256(text.encode("utf-8")).hexdigest()
```

Equivalently, from a `coeffs_n{n}.txt` file:

```bash
python3 -c "import sys,json,hashlib; v=[[int(x) for x in l.split(',')] for l in open(sys.argv[1]) if l.strip()]; print(hashlib.sha256(json.dumps(sorted(v),sort_keys=True,separators=(',',':')).encode()).hexdigest())" coeffs_n11.txt
```

## How to run

Requirements: Python 3.10+ (tested with 3.12), `networkx` (tested with 3.6.1).

```bash
cd /workspace/erdos993/independent
python3 bruteforce_forests.py                 # NMAX = 11 (about half a minute)
python3 bruteforce_forests.py --nmax 12       # 1601 forests × 4096 subsets, a few minutes
python3 bruteforce_forests.py --nmax 8 --outdir /tmp/somewhere --report other_name.json
```

The script prints a per-`n` summary table (forest counts vs. A005195,
property counts, WR failure counts, the coefficient-multiset SHA256 and the
minimum ISO ratio) followed by the argmin forests, and then writes the JSON
report and the `coeffs_n{n}.txt` files.  Any violated assertion (wrong tree
or forest count, isomorphic duplicate trees, or a self-consistency mismatch)
aborts the run with a traceback.

## Files produced by the recorded runs

* `run_nmax11.log`, `run_nmax12.log` — exact console output of the
  `--nmax 11` (about 1 s) and `--nmax 12` (about 3 s) runs.
* `bruteforce_forests_report.json` — the JSON report of the `--nmax 12` run
  (its `n ≤ 11` entries coincide with the `--nmax 11` run).
* `run_nmax14.log`, `bruteforce_forests_report_nmax14.json` — a bonus
  `--nmax 14` run (about 1 min; forest counts 3658 and 8599 for `n = 13, 14`
  match A005195), written with `--report bruteforce_forests_report_nmax14.json`.
* `coeffs_n0.txt` … `coeffs_n14.txt` — coefficient multisets.  The files for
  `n ≤ 12` were verified (sha256) to be byte-identical between the
  `--nmax 12` and `--nmax 14` runs; the output depends only on `n`.

Nothing in this directory is generated from, or shares code with, the other
implementation in the repository.
