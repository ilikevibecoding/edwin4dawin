# Terminal `q3` Newton `m=0`: star remainder, all targets

Date: 2026-08-31

Let the marked root be isolated, let the terminal leaf be mandatory, and let
the no-isolate remainder be the star `K_(1,L)`.  For every supported
`L>=j>=3`, the Newton coefficient of degree `m=0` is strictly positive.

The star has

```text
F(x)=(1+x)^L+x,
Z(x)=Lx^2.
```

Hence for `j>=3`, `f_j=C(L,j)` and `z_(j+1)=0`.  Substitute these exact rows
into the retained terminal coefficient, then set

```text
L=j+x,
j=3+y.
```

Exact simplification gives

```text
Delta/f_j=(x+y+2)(x+y+3) K(x,y)/[12(x+1)],
```

where `K` has 35 strictly positive monomial coefficients and minimum
coefficient `1`.  This proves the whole infinite supported cone.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_star_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_STAR_ROOT
```

The verifier also checks every literal cell with `L<=500` as an implementation
guard.  Star-plus-matching padding and other nonmatching remainders at `j>=4`
remain outside this theorem, as do nonisolated marked roots and the full
terminal payment.
