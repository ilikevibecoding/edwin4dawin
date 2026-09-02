# Counterexample to the second conditional Boundary-SM3 split

Date: 2026-08-13

Status: the construction and integer calculations below are exact.  They
disprove

```text
D_(r+1)(F)+D_r(F) >= f_r,
```

equivalently `3 f_(r+1)+f_r >= f_(r-1)`, even under the negative-closed-row
hypothesis and in the required pendant/tree context.  This is not a
counterexample to Boundary-SM3 or to Erdos Problem #993.  In fact, the actual
Boundary-SM3 margin and the unimodality check for the resulting tree are both
positive.

## 1. Construction

Let `T_m` be the tree with a center `c`, with `m` support vertices adjacent to
`c`, and with two leaves adjacent to each support.  Put

```text
A(x)=1+3x+x^2.
```

Splitting at the center gives the exact identity

```text
I(T_m;x)=A(x)^m+x(1+x)^(2m).                         (1)
```

Indeed, after excluding the center one obtains `m` disjoint copies of
`K_(1,2)`, and after including it all `2m` leaves are free.  Consequently
`alpha(T_m)=2m+1`.

Take

```text
m=17,                  F=T_17 union 3K_1.
```

Add a new vertex `p` adjacent to the center of `T_17` and to all three
isolates.  Call the resulting tree `T`, and finally add a leaf `ell` adjacent
to `p`, giving a 57-vertex tree `G`.  Then

```text
F=T-p,
H=T-N[p]=17K_(1,2),
I(F)=I(T_17)(1+x)^3,
I(H)=A(x)^17.                                         (2)
```

The maximum independent set consisting of the center, all 34 terminal
leaves, and the three isolates shows

```text
alpha(F)=38.
```

On the other hand a set containing `p` has size at most `1+alpha(H)=35`, so

```text
alpha(T)=alpha(F)=beta=38,
r=floor(2 beta/3)=25.
```

Thus this is precisely the exceptional pendant setup: `beta=2 (mod 3)`, and
the neighbors of `p` lie in distinct components of `F`.

## 2. Exact coefficients and failed inequality

Expanding the two integer polynomials in (2) gives

```text
h_24 =   3,136,893,890
h_25 =   1,009,840,494

f_24 = 126,425,113,970
f_25 =  57,533,461,624
f_26 =  22,850,730,982.
```

Therefore the required negative-closed-row condition holds:

```text
D_25(H)=3h_25-h_24
       =-107,372,408 < 0.                              (3)
```

But the proposed second conditional half has negative margin:

```text
D_26(F)+D_25(F)-f_25
 =3f_26+f_25-f_24
 =-339,459,400 < 0.                                   (4)
```

This is a genuine forest counterexample to the requested inequality, and
(3) shows that it cannot be rescued by restricting it to the conditional
regime in which it was intended to be used.

The `f_(r+1)` term is essential even against the simpler tempting shortcut
`f_(r-1)<=2f_r`: already in the smaller analogous setup with `m=10` and two
isolates, the latter margin is `-73,703` while the full second margin is
positive.  More importantly, (4) shows that retaining `3f_(r+1)` still does
not make this split true in all orders.

## 3. What survives

The actual Boundary-SM3 expression is positive:

```text
D_26(F)+D_25(F)             = 57,194,002,224,
D_26(F)+D_25(F)+D_25(H)     = 57,086,629,816 > 0.      (5)
```

So the counterexample invalidates the proposed division into the two
payments

```text
f_r >= h_(r-1),
D_(r+1)(F)+D_r(F) >= f_r,
```

but does not invalidate their unsplit Boundary-SM3 sum.

It also disproves the stronger single target (14) from
`FUGACITY3_COEFFICIENT_PREFIX_REDUCTION_2026-07-26.md`, because

```text
D_26(F)+D_25(F)+D_25(H)-f_25
 =-446,831,808 < 0.                                    (6)
```

The independently reconstructed independence polynomial of the resulting
57-vertex tree `G` is unimodal, with peak rank 19.  Hence this is a route
no-go, not a nonunimodal tree.

The remaining all-order target must retain the coupled expression

```text
D_(r+1)(F)+D_r(F)+D_r(H) >= 0                         (7)
```

and cannot pass through either the second conditional split (4) or the
strong single target refuted by (6).

## 4. Exact replay and independent reconstruction

Run

```text
python verify_boundary_sm3_second_split_counterexample.py \
  --output boundary_sm3_second_split_counterexample_exact.json
```

The replay constructs the labelled graphs `F,H,T,G` explicitly and computes
their independence polynomials by include/exclude tree dynamic programming.
Independently, it computes the same polynomials from (1)-(2).  It asserts
equality of the two reconstructions, all coefficients and margins above,
`alpha(T)=alpha(F)`, the negative condition (3), positivity of (5), failure
of (4) and (6), and unimodality of `I(G)`.

Artifact SHA-256 hashes before finalizing this note are

```text
4AE41317D329E49DEFBDDE8A522FFE8A8E21565518C9CBE0E67A238A0B7B389D
  verify_boundary_sm3_second_split_counterexample.py
00C28B72FE30FF05818263AF51E76604A63662A6D7AB7C35A918E93F2205230A
  boundary_sm3_second_split_counterexample_exact.json
```

The master route file is deliberately unchanged: the surviving coupled
Boundary-SM3 inequality (7) is not proved here.
