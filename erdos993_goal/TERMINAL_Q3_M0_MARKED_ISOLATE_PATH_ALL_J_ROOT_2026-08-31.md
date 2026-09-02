# Terminal `q3` Newton `m=0`: path remainder, all targets

Date: 2026-08-31

Let the marked root be isolated, let the terminal leaf be mandatory, and let
the no-isolate remainder be `P_N`.  For every supported `j>=3`, equivalently
`N>=2j-1`, the Newton coefficient of degree `m=0` is strictly positive.

Binary-string counting gives

```text
f_k=C(N-k+1,k),
z_(j+1)=j C(N-j,j).
```

For the second identity, compress the unique adjacent `11` pair.  This leaves
a length-`N-1` binary string with `j` nonadjacent ones, together with the
choice of which one of the `j` compressed entries is expanded.

Substitute the rows into the exact retained terminal coefficient and set

```text
N=2j-1+s,
j=3+y.
```

The result factors as

```text
Delta/f_j = (y+1)(s+2y+3)(s+2y+4)^2 K(s,y)
            / [24(s+1)(s+2)(s+y+3)],
```

where `K` has 41 strictly positive monomial coefficients and minimum
coefficient `1`.  Every factor is positive on `s,y>=0`.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_path_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_PATH_ROOT
```

The verifier also checks every literal supported cell through `N=1000` as an
implementation guard.  Disjoint path unions and other nonmatching remainders
at `j>=4` remain outside this theorem, as do nonisolated marked roots and the
complete terminal payment.
