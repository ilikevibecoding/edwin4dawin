# Codimension-two mixed interlacing reduces to one separator inequality

Let

```text
q_n(v)=sum_i binom(n-i,i)v^i,
F_(n,m,s)(z)=sum_i [v^i]q_n(v)[v^(s-i)]q_m(v) z^i.
```

The endpoint deletion recurrence for path matchings is

```text
q_n=q_(n-1)+v q_(n-2).
```

Consequently

```text
F_(n,m,s)=F_(n-1,m,s)+zF_(n-2,m,s-1),              (1)
```

and four iterations give

```text
F_(n,m,s)=F_(n-4,m,s)+z H_(n,m,s-1),               (2)
H_(n,m,s-1)=sum_(j=2)^5 F_(n-j,m,s-1).
```

The polynomial

```text
V_(n,m,s)=zF_(n,m,s-1)                              (3)
```

strictly interlaces `F_(n,m,s)`.  This is the usual adjacent homogeneous
slice interlacing of the stable elementary-symmetric binary form (with the
extra zero supplied by `z`).

Let `xi<0` be any nonzero root of (3).  Equation (2) says

```text
F_(n-4,m,s)(xi)=F_(n,m,s)(xi)-xi H_(n,m,s-1)(xi).  (4)
```

It is therefore sufficient to prove the quantitative separator inequality

```text
0 < xi H_(n,m,s-1)(xi)/F_(n,m,s)(xi) < 1.          (5)
```

Indeed, (5) says that the right side of (4) has the same sign as
`F_(n,m,s)(xi)` at every nonzero root of `V`.  At the remaining separator
root `0`, both constant terms are positive.  The endpoint signs also agree.
Thus `V` strictly interlaces both `F_(n,m,s)` and `F_(n-4,m,s)`.

For `n=2M-1` and `m=n`, the second polynomial is precisely the direct
codimension-two mixed slice

```text
F_(P_(M-2),P_M;s).
```

This proves that the mixed slice interlaces the large diagonal.  Apply the
same argument with `m=n-4` to the reciprocal mixed slice
`F_(P_M,P_(M-2);s)` and the small diagonal; reciprocal reflection then
shows that the original mixed slice interlaces the small diagonal as well.
Thus (5), in these two fixed-second-path specializations, makes the mixed
slice a common interlacer of `A_(M,s)` and `A_(M-2,s)`.  It proves positive
compatibility of `G_(M,s)` and `G_(M-2,s)`, supplying the two-step bridge
missing from the adjacent common-interlacer theorem.

The replay `reduce_codim2_mixed_interlacing.py` checks (1)--(4), exact
algebraic sign retention at all separator roots, and strict alternation in
a finite range.  The finite checks are evidence only; (5) is the remaining
all-order analytic inequality.
