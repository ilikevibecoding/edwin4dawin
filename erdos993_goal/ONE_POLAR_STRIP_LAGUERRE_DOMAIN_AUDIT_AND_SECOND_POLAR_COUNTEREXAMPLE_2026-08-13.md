# Laguerre-domain audit for the one-polar strip and an exact second-polar counterexample

Date: 2026-08-13

Status: exact correction and no-go certificate.  This note does **not**
disprove the universal one-polar strip lemma.  It proves that the classical
Laguerre polar-derivative theorem cannot establish that lemma, and that the
claimed automatic second-polar consequence is false even inside the natural
near-strip parameter chamber.

## 1. The direction of Laguerre's theorem

For a degree-`n` polynomial `f`, write

```text
D_alpha f = n f-(d-alpha)f'.                         (1)
```

The relevant classical circular-region theorem says: if all zeros of `f` lie
in a circular region `C` and `w` is a zero of `D_alpha f`, then at most one of
`w` and `alpha` can lie outside `C`.  Thus `alpha` **outside** `C` implies that
all zeros `w` of the polar derivative lie in `C`.  If `alpha` is inside `C`,
the theorem gives no such conclusion.

For the rotating half-plane

```text
U_s={d: Im(d/s)>0},       0<arg(s)<pi/2,              (2)
```

the positive polar point used in the proof chain is `alpha=-t`, and

```text
Im((-t)/s)=t sin(arg(s))>0.                           (3)
```

Therefore `-t` is **inside** `U_s`, not outside it.  This reverses the
hypothesis needed for the usual preservation conclusion.

The failure is already generic.  The roots of

```text
f(d)=(d+1-i/10)(d-1-i/10)
```

and the polar point `alpha=i` lie in the upper half-plane, while
`D_i f` has its zero at `-91i/90` in the lower half-plane.

## 2. Why one polar derivative still needs its own theorem

The exact identities are

```text
M_(k+1)'=-(k+1)M_k,
H_u=M_(k+1)+(d+u)M_k
   =M_(k+1)-(d+u)M_(k+1)'/(k+1).                     (4)
```

Hence `H_u` is the normalized polar derivative of `M_(k+1)` at `-u`.
But `-u` lies inside `U_s`, so Laguerre does not put the zeros of `H_u` in
`U_s`.  Nor can one extend the Section 59 base theorem down from `R>k` to
the strip `k-1<R<k`: the extension is false.

An exact example is

```text
k=2, B=5, R=1001/1000,
s=(40+9i)/41, z=R s^2.                               (5)
```

For the cubic `M_3(d;z)`, eliminate `Re(d)` after putting
`h=Im(d/s)=(40 Im(d)-9 Re(d))/41`.  The exact height resultant has one
negative and two positive real roots.  In particular, `M_3` has one zero
outside `U_s`.  The replay gives isolating intervals; the negative height is
in

```text
-243/205232 < h < -151/127531.                       (6)
```

Thus the one-polar lemma, if true, is a genuine repair theorem for the single
exceptional base zero.  It is not an application of the standard polar
theorem.

## 3. Exact counterexample to the automatic second-polar step

Take

```text
k=2, B=31, R=21/20, s=(1+i)/sqrt(2), z=21i/20,
u=1/8, v=3/25.                                       (7)
```

Both polar parameters lie strictly in the natural interval:

```text
4(k-R)/(B+k)=19/165 < v=3/25 < u=1/8
                         < 21/155=4R/B.              (8)
```

Define

```text
H_u=4 P_B[(q+u/4)(4q-d)^2],
J_(u,v)=16 P_B[(q+u/4)(q+v/4)(4q-d)].                (9)
```

The second polynomial is exactly the next normalized polar derivative:

```text
J_(u,v)=H_u-(d+v)H_u'/2.                             (10)
```

First, `H_u` really does satisfy the desired one-polar conclusion at this
point.  Put `t=Im(d)-Re(d)`, whose sign is the sign of `Im(d/s)`.  Eliminating
`Re(d)` from the real and imaginary parts of `H_u=0` gives

```text
211407947597440000 t^4
-115269506706816000 t^3
+ 27227778956470400 t^2
-  3139312034295360 t
+    91724619224763 =0.                              (11)
```

Sturm counting gives zero negative real roots and two positive real roots,
one for each zero of `H_u`.  They lie near `0.0420151` and `0.230608`.

But `J_(u,v)` is linear and its unique zero is exactly

```text
d=-1553545/40903192
  -(18906293/153386970)i.                            (12)
```

Consequently

```text
sign Im(d/s)=sign(Im(d)-Re(d)),
Im(d)-Re(d)=-52321997/613547880<0.                   (13)
```

This is an exact special-Meixner counterexample, not a generic-polynomial
objection.  It lies in `B>=3k-1`, `k-1<R<k`, and even has both polar
parameters strictly inside the interval proposed for the one-polar lemma.

## 4. Corrected frontier

The following statements survive this audit:

1. The universal one-polar strip lemma for `H_u` is not refuted here.  A
   30,000-point floating root stress over the full chamber found no failure,
   but that is only reconnaissance and is not used as proof.
2. The last-coordinate reduction and its exact boundary equation remain
   valid possible routes to the one-polar lemma.
3. The assertion that a second polar derivative then follows automatically
   from Laguerre is false.  Even after proving the one-polar lemma, the
   two-polar near-sector transform needs an additional structured theorem
   retaining both `u` and `v`.
4. Any earlier unequal- or equal-polar conclusion whose only justification
   is that the negative polar point lies in `U_s` must be re-audited.  That
   membership is precisely why the classical implication does not apply.

The companion replay is
`verify_one_polar_strip_laguerre_domain_audit.py`; it writes
`one_polar_strip_laguerre_domain_audit_exact_20260813.json` and verifies
(4)--(13), the two exact Sturm counts, and the generic direction counterexample.

