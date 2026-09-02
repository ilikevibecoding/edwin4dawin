# ISO leaf/nested identities and verified path bases

Date: 2026-08-29

Status: **exact conditional reduction, not a proof of ISO and not a solution of
Erdos Problem 993.**  The displayed algebraic identities, rooted-star base,
and bare two-terminal-path base are proved for every order.  The forest
positivity recurrences needed to turn them into an induction remain open.

## Exact identities

For a coefficient row `P=(p_j)`, put

```text
Q_r(P)=r p_r^2+p_(r-1)^2-(r+1)p_(r-1)p_(r+1).
```

If `ell` is a leaf of a forest `F`, with support `v`, and

```text
P=I(F)=A+xC,
A=I(F-ell),
C=I(F-{ell,v}),
```

then the exact leaf remainder

```text
D_r=Q_r(P)-Q_r(A)-Q_(r-1)(C)
```

is

```text
c_(r-1)^2
+2r a_r c_(r-1)
+2 a_(r-1)c_(r-2)
-(r+1)a_(r-1)c_r
-(r+1)c_(r-2)a_(r+1)
-c_(r-2)c_r.
```

After a second nonsibling leaf split, let `B` be the remaining forest with
distinct marks `u,v`, and put

```text
E=I(B), U=I(B-u), V=I(B-v), W=I(B-{u,v}).
```

The exact nested remainder `N_r(B;u,v)` is

```text
2r E_r W_(r-2)
-(r+1)E_(r+1)W_(r-3)
+E_(r-1)(2W_(r-3)-(r+1)W_(r-1))
+U_r(-(r+1)V_(r-2)-W_(r-3))
+U_(r-1)(2rV_(r-1)+2W_(r-2))
+U_(r-2)(-(r+1)V_r+2V_(r-2)-W_(r-1))
-V_rW_(r-3)+2V_(r-1)W_(r-2)-V_(r-2)W_(r-1).
```

The symbolic verifier reconstructs both identities from `Q_r` rather than
assuming either formula.

## Exact bases

For `K_(1,m)` rooted at a leaf, the leaf remainder is

```text
D_2=3m-1,
D_r=(2r-1) C(m,r)(m-1)! / ((r-1)!(m-r+1)!) >= 0  (r>=3).
```

For a path `P_n` with its endpoints marked, `N_r` is positive.  The two
boundary orders are

```text
n=2r-1:
r(r-1)(7r^4+4r^3-13r^2+290r+12)/72,

n=2r:
r(r-1)(r+1)(9r^5+32r^4+7r^3+1108r^2+788r-144)/1440.
```

For `n=2r+1+x`, write `y=r-1`.  The value factors as a positive factorial
ratio times twice a polynomial `H(x,y)` having 26 strictly positive
coefficients.  The verifier proves the symbolic identities and positivity,
then checks 62,250 literal path/rank cells through path order 500.

## Recurrence evidence and exact remaining boundary

The candidate third-leaf recursion is

```text
N_r(B;u,v)-N_r(B-z;u,v)
  >= N_(r-1)(B-{z,s};u,v),
```

for an unmarked leaf `z` with support `s`, omitting the lower term when `s`
is one of the marks.  The isolate version replaces the right side by
`N_(r-1)(B-z;u,v)`.  An exact audit covers every nonisomorphic tree through
order 9 and every atlas forest:

```text
88,830 rank rows
59,374 ordinary rows
23,056 marked-support collision rows
6,400 isolate rows
0 negatives
minimum slack 12.
```

An independent random/Galvin audit adds 16,801 random-tree rows and 3,970
rows from `T_(5,4), T_(14,8), T_(21,11)`, again with zero negatives and
minimum slack 26.  These are finite evidence only.

There are two valid ways an induction could now close, neither yet proved:

1. prove the ordinary, isolate, and marked-support collision recurrences;
   the terminal connected base then reduces to a bare marked path;
2. avoid marked-support collisions, but additionally prove the terminal
   two-ended-broom and two-disjoint-rooted-star bases.

The univariate two-vertex forest Christoffel--Darboux identity

```text
UV-EW = (+/-) x^(distance+1) I(B-N[path])^2
```

does not by itself sign the 42-term third-leaf polarization, because that
polarization uses individual bidegrees rather than a complete convolution.
A successful use of this identity must group complete switching orbits or
induced-subtree terms.  Naive termwise allocation already has exact negative
terms on an eight-vertex tree.

## Scope controls

The forest hypothesis is essential.  The split graph obtained by joining a
two-clique to eight independent vertices has

```text
I(x)=(1+x)^8+2x=(1,10,28,56,70,56,28,8,1)
```

and `Q_2=-12`.  Separately, the verifier contains a complete-multipartite
negative control whose leaf remainder is `-351679`.  Neither graph is a
forest and neither is a counterexample to Erdos Problem 993.

## Replay and pins

Run

```powershell
python .\verify_iso_leaf_nested_path_bases_root.py
python .\probe_iso_four_minor_third_leaf_root.py --max-n 9
```

The verifier ends with

```text
PASS_EXACT_ISO_LEAF_NESTED_IDENTITIES_AND_TERMINAL_BASES
```

and the finite audit ends with

```text
PROBE_EXACT_ISO_FOUR_MINOR_THIRD_LEAF_RECURSION
```

SHA-256 pins (on-disk bytes):

```text
verify_iso_leaf_nested_path_bases_root.py
EB6CBA9DFFE324D8FF19368E44B184B65D8BEDAB0D68F8043276D7CBF8200E6F

iso_leaf_nested_path_bases_exact_root_20260829.json
F4D6D1181EC69333C3E2B12E24FFDB839DDF1A79561C2B439D45F95FC98FB5CD

probe_iso_four_minor_third_leaf_root.py
78722521B51602CA6428FE044DB2F393822746620068394ED25212635F2C8BE6

iso_four_minor_third_leaf_probe_root_20260829.json
EFC00119B2E94000D74D2FFCB6DF658E08BD92F0379559CB42E6FEFB3B9DF19A
```
