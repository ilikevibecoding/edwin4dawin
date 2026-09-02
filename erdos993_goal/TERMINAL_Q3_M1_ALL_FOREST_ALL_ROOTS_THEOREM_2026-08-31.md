# Terminal `q3` Newton `m=1`: every forest and every marked root

Date: 2026-08-31

Status: **proved for every finite forest base, every marked vertex, and every
supported target `j>=3`, conditional only where the constituent supported
theorems invoke the strictly-smaller-forest `q` envelope.**

The last missing root geometry was an isolated marked root.  After deleting
all other isolated components, write

```text
G=K1(w) disjoint_union R,
```

where every component of `R` is nontrivial.  Put `N=|R|`, let `h` be the
number of components of `R`, set `r=N-j`, and write

```text
W=sum_v C(deg_R(v),2).
```

Support gives `r>=h`.  Since the components are nontrivial,

```text
N>=2h,
Q=N-2h <= W <= C(Q+1,2).
```

The exact correlated general-forest lower specializes at an isolated marked
root to `d=0`, root-neighbor excess `0`, and `H=F`, hence `y=1`.  Its cleared
numerator is a quadratic

```text
f(W)=a W^2+L(W),
```

with `L` affine.  The all-order certificate proves that `L` and `f` are
nonnegative at both exact wedge endpoints.  If `a>=0`, affine interpolation
gives `L(W)>=0` and therefore `f(W)>=0`; if `a<0`, concavity puts the minimum
of `f` at an endpoint.

The parameter box is exhausted by

```text
E=(j-3)+(r-h)>=0,
j=3+E*w,
r-h=E*(1-w),
h=1+(E+2)*u,
0<=u,w<=1.
```

Every Bernstein coefficient in `(u,w)` has a nonnegative power expansion in
`E`.  The coefficient of the discarded all-forest `q3<=q2` reserve is checked
separately in the same box.

For targets that are unsupported after isolates are removed, downward closure
gives the root-independent exact factorization

```text
delta(t)=(j+1)*a*A(t)*U(t).
```

Both factors have nonnegative shifted Newton rows.  Restore isolates one at a
time with

```text
d1(G+K1)=d1(G)+d2(G),
```

using the all-forest `m=2` theorem after support activates.  This applies to
isolated and nonisolated marked roots and exhausts every forest base.

## Replay

```powershell
python .\prove_terminal_q3_m1_marked_isolate_noisolate_remainder_root.py
python .\assemble_terminal_q3_m1_all_forest_all_roots_root.py
```

Required final marker:

```text
PASS_EXACT_ALL_FOREST_ALL_ROOTS_TERMINAL_Q3_NEWTON_M1_ASSEMBLY
```

Frozen marked-isolate source/report SHA-256:

```text
A05CF5B8A73D81D99A628F44019811F44210E85D9DE7050DB058CDBF1E1D22ED
88790B8EC9513F2AD4EE3BE0AB41FF2FF477F9A51404939600A95796657E729D
```

Frozen assembly source/report SHA-256:

```text
7E30FDE0978847434BA6F9B3EEB1D3649C0E07039CB06CA1506EE3A765B1970E
A6A4DA5526A7C972432589DEC62646F5DCF91E0221BD20155D8F0F21F8DB282D
```

This theorem closes Newton `m=1`.  It does not close Newton `m=0`, the full
terminal payment, the remaining rank-six/rank-seven propagation, the final
global proof assembly, unimodality, or Erdős Problem 993.
