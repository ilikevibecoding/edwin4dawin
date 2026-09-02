#!/usr/bin/env python3
"""Exploratory exact component-deficit formulas for forest terminal m=1."""

import sympy as sp


def C(x,k):
    return sp.prod(x-i for i in range(k))/sp.factorial(k)


def main():
    N,j,r,h,W,y,a=sp.symbols('N j r h W y a', nonnegative=True)
    m=N-h
    p0=sp.expand(C(N+1,3)-m*(N-1)+W+C(N+1,2)-m)
    p1=sp.expand(C(N+1,2)-m+N+1)
    R1=m*N-2*W
    ebar=j+2*y
    q0=(j+1)*a-3*ebar*(p0+a)
    q1=(j+1)*(a+R1)-3*ebar*p1-3*(p0+a+p1)
    rem=sp.expand(p0*q1+p1*q0+p1*q1)
    A1=sp.expand(p0+2*p1-R1)
    S1=j/(r+1)
    H1=j*y/(r+1)
    U0=(N-2*j+3+(j-1)*y)/(j+1)+H1
    U1=1+S1+H1
    gap=sp.factor((j+1)*a*A1*(U0+U1)+rem)
    sub=sp.factor(gap.subs(N,j+r))
    slope=sp.factor(sp.diff(sub,a))
    floor=sp.factor(sub.subs(a,C(j+r-1,2)+h-1))
    print('degrees',[(v,sp.Poly(floor,v).degree()) for v in (W,y,h)])
    fs={}
    for yv in (0,1):
        for wl,wv in [('lo',0),('hi',C(j+r-h,2))]:
            fs[('floor',yv,wl)]=sp.lambdify((j,r,h),floor.subs({y:yv,W:wv}),'math')
            fs[('slope',yv,wl)]=sp.lambdify((j,r,h),slope.subs({y:yv,W:wv}),'math')
    minima={}; neg=[]
    for jv in range(4,31):
      for rv in range(0,61):
       Nv=jv+rv
       if Nv<13: continue
       for hv in range(1,Nv+1):
        for lab,f in fs.items():
         val=f(jv,rv,hv)
         if lab not in minima or val<minima[lab][0]: minima[lab]=(val,jv,rv,hv)
         if val<0: neg.append((val,jv,rv,hv,lab))
    print('minima',minima)
    print('neg count',len(neg),'first',sorted(neg)[:30])


def rooted_scan():
    N,j,r,h,W,y,d,R,sc,mu=sp.symbols('N j r h W y d R sc mu', nonnegative=True)
    m=N-h
    p0=sp.expand(C(N+1,3)-m*(N-1)+W+C(N+1,2)-m)
    p1=sp.expand(C(N+1,2)-m+N+1)
    R1=m*N-2*W
    a=sp.expand(C(N,2)-(m-d))
    wedgesF=W-C(d,2)-R
    z2=sp.expand((m-d)*(N-2)-2*wedgesF)
    h2=sp.expand(C(N-d,2)-(m-d-R))
    c0=sp.expand(a+z2+h2)
    g=sp.expand(2*p1*c0-3*a*R1)
    Vup=m+m*(W-m+sc)/3
    s3g=m*(N-1)-2*W
    s4g=m*C(N-1,2)-2*(W*(N-2)+C(m,2)-W)+3*Vup
    R0=sp.expand(s4g+s3g)
    Mlower=sp.expand(3*p0*R1-2*p1*R0)
    A0=(p0*g+a*mu)/(2*p1)
    A1exact=sp.expand(p0*a+p1*c0+p1*a-a*R1)
    # Strong-induction q_j(F)<=q_2(F): 2*a*z_j<=j*b*z2.
    ebar=1+y+j*z2/(2*a)
    q0=(j+1)*c0-3*ebar*(p0+a)
    q1=(j+1)*(a+R1)-3*ebar*p1-3*(p0+a+p1)
    rem=sp.expand(p0*q1+p1*q0+p1*q1)
    S1=j/(r+1); H1=j*y/(r+1)
    U0=(N-2*j+3+(j-1)*y)/(j+1)+H1
    cF=sp.symbols('cF', nonnegative=True)
    U0comp=(cF+1)/(j+1)+y+H1
    U1=1+S1+H1
    gap=((j+1)*(A0*U1+A1exact*(U0+U1))+rem).subs(N,j+r)
    gapcomp=((j+1)*(A0*U1+A1exact*(U0comp+U1))+rem).subs(N,j+r)
    print('root expression built')
    print('g R slope',sp.factor(sp.diff(g,R)))
    f=sp.lambdify((j,r,h,d,R,W,y,mu),gap,'math')
    fc=sp.lambdify((j,r,h,d,R,W,y,mu,cF),gapcomp,'math')
    mf=sp.lambdify((N,h,W,sc),Mlower,'math')
    neg=[]; minimum=None
    for jv in range(4,11):
      for rv in range(0,16):
       Nv=jv+rv
       if Nv<13: continue
       for hv in range(1,Nv+1):
        mv=Nv-hv
        for dv in range(mv+1):
         Rvals={0} if dv==0 else {0,mv-dv}
         for Rv in Rvals:
          balanced_neighbors = 0
          if dv:
              quotient, remainder = divmod(Rv, dv)
              balanced_neighbors = (
                  dv*quotient*(quotient-1)//2 + remainder*quotient
              )
          Wlo=max(
              dv*(dv-1)//2+Rv+balanced_neighbors,
              mv-min(mv,hv+1),
              dv*(dv-1)//2+mv-dv-hv,
          )
          Whi=mv*(mv-1)//2
          if Wlo>Whi: continue
          for Wv in {Wlo,Whi}:
           for yv in (0,1):
            sv=min(mv,hv+1)
            ml=mf(Nv,hv,Wv,sv)
            reserve=max(0,ml)
            cfv=hv+(dv if dv>0 else 0)
            val=max(
                f(jv,rv,hv,dv,Rv,Wv,yv,reserve),
                fc(jv,rv,hv,dv,Rv,Wv,yv,reserve,cfv),
            )
            item=(val,jv,rv,hv,dv,Rv,Wv,yv)
            if minimum is None or item<minimum: minimum=item
            if val<0: neg.append(item)
    print('root min',minimum,'neg',len(neg),'first',sorted(neg)[:30])

if __name__=='__main__':
    main()
    rooted_scan()
