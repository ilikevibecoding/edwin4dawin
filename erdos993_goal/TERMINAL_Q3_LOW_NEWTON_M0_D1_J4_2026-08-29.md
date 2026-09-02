# All-order terminal m=0 certificate for d=1, j=4

Date: 2026-08-29

## Scope

This closes only the one-centre/root-degree-one rank-four sector, conditional
on the already pinned smaller-forest strong-induction inputs.  It does not
close arbitrary root degree, the variable-rank d=1 tail, all terminal m=0,
the terminal-payment theorem, or Erdos Problem 993.

Put `A=R-Y>=0`, `B=T-Y>=0`, `S=R+T>=14`.  The low-block theorem permits the
weaker but closed-form caps

```text
u_H <= q3(H),
u_I <= (3 q2(K)+R)/4.
```

Substituting them into the exact cancelled terminal functional gives

```text
L=lead(H_3+H_5+K_4)+BH H_4+BK K_3,  lead=5A0>0.       (1)
```

The H graft residual theorem has ratio `rho=S-8` at rank four.  The first
symbolic cone proves `BH+lead*(S-8)>=0`, so every actual H allocation is at
least its concentrated row `C`.  Write `C-P_S=x^2 Q`.  The retained-Dprev
identity, now at rank four, gives

```text
C-functional >= Hlower
=path-functional+lead*(C_3-P_3)+(BH+lead*sigma)*(C_4-P_4),
sigma=P_(S-4)[3]/P_(S-4)[2].                         (2)
```

The exact low rows are

```text
C_3-P_3=RS-3R-S-Y+4,
C_4-P_4=(R^2+RS^2-9RS+17R-S^2-2SY+11S+10Y-28)/2
          - 1_{T=Y}.                                (3)
```

For every Y-component linear forest K on T vertices, path grafting gives the
coefficientwise minimum `Kmin4`, while the rank-three motif identity gives

```text
K_3 <= Kmax3 = C(T,3)-(T-Y)(T-2)+(T-Y-1)  (T>Y),
Kmax3=C(Y,3)                                (T=Y).    (4)
```

The verifier treats the `T=Y` H row and the `B=Y` `P_2` K-minimum face
literally.  In both places it removes the single spurious unit that would
come from extending the polynomial binomial formula to `C(-1,4)`.

Thus it is enough to prove both

```text
J=Hlower+lead*Kmin4 >=0,
G=J+BK*Kmax3 >=0.                                      (5)
```

If `BK>=0`, (1) is at least J; if `BK<0`, it is at least G.

This proof does **not** use the abandoned global matching-ceiling shortcut,
which was invalid because it dropped `lead*(K_j-rho*K_(j-1))` without a sign.
Here the positive `lead*Kmin4` term is retained explicitly in both J and G.

The verifier splits the complete domain into `B>=Y`, `1<=B<Y`, `B=0`, and
the six unsupported K faces, then shifts the exact `S>=14` constraint.  It
checks 271 exhaustive cones and
11720 numerator coefficient references;
every numerator coefficient is nonnegative, every denominator coefficient is
nonnegative, and every denominator has a positive cone-origin value.  This is
the all-order sign certificate, not a finite extrapolation.  The separate
literal audit replays 3520 bounded cells against the
integer row formulas.
