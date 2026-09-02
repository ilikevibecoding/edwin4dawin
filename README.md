# edwin4dawin

## Python toolkit (`erdos993/`)

Exact (integer-only) independence polynomials of forests plus the unimodality checks
(`WR_r`, `ISO_r`, Levit–Mandrescu tail cutoff `L(alpha)`, descent-propagation lemma).
Requires Python 3.12 with `sympy` and `networkx`; `nauty-gentreeg` is used when installed.

```bash
python3 -m erdos993 poly "0-1,1-2,1-3,3-4"        # polynomial + checks for an edge list
python3 -m erdos993 poly --parents "0 1 1 1 1"    # tree given as a gentreeg parent array
python3 -m erdos993 scan-trees 16                 # exhaustive scan of all trees with n <= 16
python3 -m erdos993 scan-trees 20 --min-n 17 --res 0 --mod 4 --json   # parallel slice
python3 -m erdos993 verify-lemma                  # sympy + brute-force lemma verification
python3 -m erdos993 counts                        # tree/forest counts vs OEIS A000055/A005195
python3 -m pytest -q tests                        # test suite
```

```python
from erdos993 import independence_polynomial_forest, unimodality_via_framework
p = independence_polynomial_forest(6, [(0, 1), (0, 2), (0, 3), (0, 4), (0, 5)])  # [1, 6, 10, 10, 5, 1]
unimodality_via_framework(p).certified  # True: WR_r & ISO_r for r <= L(alpha), then TAIL
```
