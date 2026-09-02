# Forest terminal `m=1`, `j=3`: exact-`U1` margin coefficient

Date: 2026-08-29

Status: **proved all-order for the no-isolate forest structural domain.**

At target `j=3`, the nominal target row is actually fixed:

```text
U1=i3(G)+i2(G)=p0.
```

Writing `a=i2(F)`, `b=i3(F)`, the coefficient of the pinned all-forest
`q3<=q2` margin after exact elimination is therefore

```text
a*(U1/b)-p1=(a*p0-p1*b)/b.                          (1)
```

The supported target has `b>0`.  The numerator in (1) is affine decreasing
in the total wedge count `W`, with derivative

```text
-(2N-d+1)<0.
```

Use the exact correlated upper

```text
W<=C(d,2)+C(R+1,2)+C(N-2h-d-R+1,2).
```

After writing

```text
h=1+H, d=1+D, N=2h+d+R+L,
```

and clearing by `12`, the endpoint numerator is a 70-term polynomial in
`H,D,R,L`.  Every coefficient is a positive integer; the minimum is `1`.
Thus (1) is strictly positive throughout the domain, and the nonnegative
all-forest `q3<=q2` margin may be discarded without a sign split in the
exact-`U1` `j=3` reduction.

Frozen artifacts:

- `prove_terminal_q3_m1_forest_j3_exact_u1_coefficient_root.py`, SHA-256
  `AF6045BE53125611A2F2FCFABE6155DD53D051C42F9755E4FB6EB8B4DC960650`.
- `terminal_q3_m1_forest_j3_exact_u1_coefficient_root_20260829.json`,
  SHA-256
  `5BF537A30E40BF04E1A2793A5CE59051B9BDDD59E1E3840F8D43F8FE5A1E4A9F`.
- Pinned correlated-wedge note SHA-256
  `3AFD1FFFEAEDE346C079F7438187F3BAC0F2591CFCC5D9D1681334FAFE4E5922`.

This closes only the margin-coefficient sign.  The remaining exact-`U1`
`j=3` lower, forest `m=0`, the full terminal payment, unimodality, and
Erdos Problem 993 remain open.
