# Empty-component q-gap-mass floor for one-centre spiders

Date: 2026-08-29

This strengthens the frozen direct H/K block floor by using the mandatory
empty path components in every token allocation.  For the excluded-centre
block `H`, there are `R` path components on `R+T` vertices and exactly `Y`
have length at least two.  Therefore

```text
E_H=2(R-j)_+ +(Y-j)_+,
u_H=(2R+T-2j-E_H)/(2R+T-j-E_H).                    (1)
```

For `K` at rank `j-1`, there are `Y` nonempty path components on `T`
vertices, giving

```text
E_K=2(Y-j+1)_+,
u_K=(T-2(j-1)+Y-E_K)/(T-(j-1)+Y-E_K).              (2)
```

Retain `u_I=((j-1)u_K+R)/j` for the included-centre block and choose the
frozen H/K coefficient endpoints according to the two slope signs.  Under
the legitimate smaller-forest strong-induction input `q_j<=q3`, this gives
the all-order enhanced mass floor

```text
f_j(q3-q_j)>=max(0,H_endpoint(q3-u_H)+K_endpoint(q3-u_I)).  (3)
```

At the previous N=315,R=20,Y=20,j=14 payment relaxation failure, the direct
floor was `434906669021620342579627675623/7618320535` and (3) raises it to
`267672811631122560867876000379595/219372197359`, an exact factor
`3385273794158314740387843534212525/158382775759579502406498525869529`.  The bounded literal replay checked
1355 spiders and
6887 supported ranks.

This theorem proves the enhanced reserve floor only.  The unbounded
terminal-payment sign cone and every d>1 sector remain separate obligations.

Replay:

```powershell
python .\prove_d1_spider_empty_component_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_EMPTY_COMPONENT_QGAP_MASS_FLOOR
```
