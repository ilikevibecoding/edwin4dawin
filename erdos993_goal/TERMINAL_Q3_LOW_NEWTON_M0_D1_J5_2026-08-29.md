# All-order terminal m=0 certificate for d=1, j=5

Date: 2026-08-29

## Scope

This closes only the one-centre/root-degree-one rank-five sector, conditional
on the pinned smaller-forest strong-induction inputs.  It does not close
arbitrary root degree, the variable-rank d=1 tail, all terminal m=0, the
terminal-payment theorem, or Erdos Problem 993.

Put `A=R-Y>=0`, `B=T-Y>=0`, `S=R+T>=14`.  The low-block theorem permits

```text
u_H <= q3(H),
u_I <= (4 q2(K)+R)/5.
```

The exact cancelled functional is

```text
L=lead(H_4+H_6+K_5)+BH H_5+BK K_4,  lead=6A0>0.       (1)
```

The H graft tangent has

```text
rho=(S-9)(S-10)/(2(S-8)).
```

An exhaustive shifted cone proves `BH+lead*rho>=0`, so the actual H row is
at least the concentrated row `C`.  Retaining the previous-rank gap gives

```text
Hfunctional >= Hlower
=pathH+lead*D4+(BH+lead*sigma)*D5,
sigma=P_(S-4)[4]/P_(S-4)[3].                          (2)
```

The exact polynomial formulas for `D4,D5` are replayed literally.  The
verifier separately applies the `B=0` corrections `D4-=1`,
`D5-=(R+Y-8)`, and the `B=1` correction `D5+=1`; no generalized-binomial
continuation is used at these short-path faces.

For K, the frozen path-graft theorem gives `K5>=Kmin5`.  The independently
frozen rank-four motif theorem gives the all-order ceiling

```text
K4 <= Kmax4=[x^4](1+x)^(Y-1)P_(T-Y+1).                (3)
```

The `B-Y=0` and `B-Y=1` corrections to the polynomial continuation of
`Kmin5` are handled as separate cones.  Therefore it suffices to prove

```text
J=Hlower+lead*Kmin5 >=0,
G=J+BK*Kmax4 >=0.                                     (4)
```

If `BK>=0`, (1) is at least J; if `BK<0`, it is at least G.  This retains
the positive `lead*Kmin5` term and does not use the invalid discarded
matching-ceiling scalarization.

The complete domain is split into `B>=Y`, `1<=B<Y`, `B=0`, and all twelve
unsupported-`K4` faces.  The all-order audit checks
253 shifted cones and
13014 numerator coefficient references.
Every numerator and denominator coefficient is nonnegative and every
denominator has positive cone-origin value.  The independent literal replay
checks 3520 cells through `S=35`; it is a guard, not the
basis of the unbounded sign proof.
