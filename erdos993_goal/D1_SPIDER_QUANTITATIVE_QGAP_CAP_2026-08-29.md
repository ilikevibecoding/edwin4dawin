# Quantitative q-gap cap for one-centre spiders

Date: 2026-08-29

Let `F` be a spider with `R` arms, subdivision counts `ell_i>=0`, total
`T=sum ell_i`, and `Y=#{i:ell_i>0}`.  Put

```text
H=product_i P_(ell_i+1),   K=product_i P_(ell_i),
F=H+xK.
```

At target rank `j`, write `h=[x^j]H`, `k=[x^(j-1)]K`.  The exact one-edge
decomposition and the all-order linear-forest token-ratio theorem give

```text
q_j(H) <= u_H=(R+T-2j+R)/(R+T-j+R),
q_(j-1)(K) <= u_K=(T-2j+2+Y)/(T-j+1+Y),
included block <= u_I=((j-1)u_K+R)/j.               (1)
```

The incident-centre term is at most `Rk`.  The frozen path-graft theorems
give the correlated row bounds

```text
h >= Hconc_j,
Hconc=(1+x)^(R-Y) P_(T-Y+2) P_2^(Y-1),
k <= Kmax_(j-1),                                    (2)
```

where `Kmax` is the maximum, over the feasible value
`Z=#{i:ell_i>=2}`, of the frozen Hmax row with parameters
`(R,T,Y)=(Y,T-Y,Z)`.  Hence `w=k/h<=w*=Kmax/Hconc`, and

```text
q_j(F) <= U_j=max(u_H,(u_H+w* u_I)/(1+w*)).          (3)
```

Under the legitimate smaller-forest induction `q_j(F)<=q_3(F)`, (3) gives
the quantitative reserve

```text
q_3(F)-q_j(F) >= max(0,q_3(F)-U_j).                  (4)
```

At the corrected N=315 obstruction, the floor in (4) is
`78340254433867805677269720361994993/1429762732640423028735413509684437750`, while the terminal deficit requires only
`2555205982135450061559820301822794209491999803/3338465406782362201721217274608106386382551624000`.  Their exact ratio is
`122009520193817574111237989514016758398129401366176/1704322390084345191060400141315803737731163868601`.

The bounded literal replay checked 1359
spider allocations and 6355 supported cap rows.

This theorem supplies a rigorous q-gap floor on the displayed supported
one-centre-spider rows.  It does not prove that this floor pays the terminal
margin at every parameter value, does not cover `d>1`, and does not by itself
prove terminal Newton `m=0` or Erdos Problem 993.

Replay:

```powershell
python .\prove_d1_spider_quantitative_qgap_cap_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_QUANTITATIVE_QGAP_CAP
```
