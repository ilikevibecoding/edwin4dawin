// Faster exact streaming evaluator for the residual rank-seven G1 census.
// It is algebraically identical to the pinned v1 engine, but commits to a
// fixed binary record rather than formatting every tree as text.  This avoids
// constructing a parent-array string except when a new minimum is found.

use std::io::{self, BufRead};

struct Sha256 { state:[u32;8], buffer:[u8;64], used:usize, length:u64 }
impl Sha256 {
    fn new()->Self{Self{state:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],buffer:[0;64],used:0,length:0}}
    fn block(&mut self,b:&[u8;64]){
        const K:[u32;64]=[
            0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
            0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
            0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
            0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
            0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
            0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
            0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
            0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        let mut w=[0u32;64];for i in 0..16{w[i]=u32::from_be_bytes([b[4*i],b[4*i+1],b[4*i+2],b[4*i+3]])}
        for i in 16..64{let a=w[i-15].rotate_right(7)^w[i-15].rotate_right(18)^(w[i-15]>>3);let z=w[i-2].rotate_right(17)^w[i-2].rotate_right(19)^(w[i-2]>>10);w[i]=w[i-16].wrapping_add(a).wrapping_add(w[i-7]).wrapping_add(z)}
        let[mut a,mut c,mut d,mut e,mut f,mut g,mut h,mut j]=self.state;
        for i in 0..64{let s=f.rotate_right(6)^f.rotate_right(11)^f.rotate_right(25);let ch=(f&g)^((!f)&h);let t1=j.wrapping_add(s).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);let s0=a.rotate_right(2)^a.rotate_right(13)^a.rotate_right(22);let maj=(a&c)^(a&d)^(c&d);let t2=s0.wrapping_add(maj);j=h;h=g;g=f;f=e.wrapping_add(t1);e=d;d=c;c=a;a=t1.wrapping_add(t2)}
        for(x,y)in self.state.iter_mut().zip([a,c,d,e,f,g,h,j]){*x=x.wrapping_add(y)}
    }
    fn update(&mut self,mut b:&[u8]){
        self.length+=b.len()as u64;
        if self.used>0{
            let n=(64-self.used).min(b.len());
            self.buffer[self.used..self.used+n].copy_from_slice(&b[..n]);
            self.used+=n;b=&b[n..];
            if self.used<64{return}
            let q=self.buffer;self.block(&q);self.used=0;
        }
        while b.len()>=64{
            let q:&[u8;64]=<&[u8;64]>::try_from(&b[..64]).unwrap();
            self.block(q);b=&b[64..];
        }
        self.buffer[..b.len()].copy_from_slice(b);self.used=b.len()
    }
    fn finish(mut self)->String{let bits=self.length*8;self.buffer[self.used]=128;self.used+=1;if self.used>56{for x in&mut self.buffer[self.used..]{*x=0}let q=self.buffer;self.block(&q);self.buffer=[0;64];self.used=0}for x in&mut self.buffer[self.used..56]{*x=0}self.buffer[56..].copy_from_slice(&bits.to_be_bytes());let q=self.buffer;self.block(&q);self.state.iter().map(|x|format!("{x:08X}")).collect()}
}

fn add(a:&[i128;9],b:&[i128;9])->[i128;9]{let mut z=[0;9];for i in 0..9{z[i]=a[i]+b[i]}z}
fn mul(a:&[i128;9],b:&[i128;9])->[i128;9]{let mut z=[0;9];for i in 0..9{if a[i]==0{continue}for j in 0..(9-i){z[i+j]+=a[i]*b[j]}}z}
fn rooted(a:&[Vec<usize>],v:usize,p:usize)->([i128;9],[i128;9]){let mut ex=[0;9];ex[0]=1;let mut inc=[0;9];inc[1]=1;for&u in&a[v]{if u==p{continue}let(x,y)=rooted(a,u,v);ex=mul(&ex,&add(&x,&y));inc=mul(&inc,&x)}(ex,inc)}
fn q(p:&[i128;9])->i128{let(a,b,c,d,e,f)=(p[3],p[4],p[5],p[6],p[7],p[8]);8*a*a+24*a*b-64*a*c-106*a*d-51*a*e-8*a*f+80*b*b+90*b*c-12*b*d-10*b*e+39*c*c+10*c*d}
fn put_u8(h:&mut Sha256,x:usize){h.update(&[x as u8])}
fn put_u64(h:&mut Sha256,x:u64){h.update(&x.to_le_bytes())}
fn put_i128(h:&mut Sha256,x:i128){h.update(&x.to_le_bytes())}

fn main(){
    let args:Vec<String>=std::env::args().collect();let n:usize=args.get(1).expect("order").parse().unwrap();assert!((2..=64).contains(&n));
    let stdin=io::stdin();let mut total=0u64;let mut eligible=0u64;let mut negative=0u64;let mut crosschecks=0u64;let mut minimum:Option<(i128,u64,Vec<usize>,Vec<usize>,[i128;9])>=None;let mut stream=Sha256::new();
    stream.update(b"G1_GENTREE_BINARY_V2\0");put_u8(&mut stream,n);
    for line in stdin.lock().lines(){let line=line.unwrap();if line.is_empty(){continue}let t:Vec<usize>=line.split_ascii_whitespace().map(|x|x.parse().unwrap()).collect();assert_eq!(t.len(),n);assert_eq!(t[0],0);
        let mut degree=vec![0usize;n];let mut children=vec![Vec::new();n];let mut adjacency=vec![Vec::new();n];
        for child in 1..n{assert!((1..=child).contains(&t[child]));let p=t[child]-1;degree[child]+=1;degree[p]+=1;children[p].push(child);adjacency[p].push(child);adjacency[child].push(p)}
        let mut degrees=degree.clone();degrees.sort_unstable_by(|a,b|b.cmp(a));let active=degrees[0]>=4&&degrees.iter().filter(|&&x|x>=3).count()>=3;
        put_u64(&mut stream,total);for&x in&t{put_u8(&mut stream,x)}for&x in&degrees{put_u8(&mut stream,x)}put_u8(&mut stream,active as usize);
        if active{let mut ex=vec![[0i128;9];n];let mut inc=vec![[0i128;9];n];for v in(0..n).rev(){ex[v][0]=1;inc[v][1]=1;for&u in&children[v]{ex[v]=mul(&ex[v],&add(&ex[u],&inc[u]));inc[v]=mul(&inc[v],&ex[u])}}let row=add(&ex[0],&inc[0]);let value=q(&row);for&x in&row{put_i128(&mut stream,x)}put_i128(&mut stream,value);eligible+=1;if value<0{negative+=1}
            if minimum.as_ref().map_or(true,|old|(value,total)<(old.0,old.1)){minimum=Some((value,total,t.clone(),degrees.clone(),row))}
            if eligible%4096==0{let root=(eligible as usize)%n;let(a,b)=rooted(&adjacency,root,usize::MAX);assert_eq!(add(&a,&b),row);crosschecks+=1}}
        total+=1}
    let m=minimum.unwrap();println!("ORDER {n}");println!("TOTAL {total}");println!("ELIGIBLE {eligible}");println!("NEGATIVE {negative}");println!("CROSSCHECKS {crosschecks}");println!("MINIMUM_VALUE {}",m.0);println!("MINIMUM_INDEX {}",m.1);println!("MINIMUM_PARENT {}",m.2.iter().map(|x|x.to_string()).collect::<Vec<_>>().join(" "));println!("MINIMUM_DEGREES {:?}",m.3);println!("MINIMUM_ROW {:?}",m.4);println!("ORDERED_STREAM_SHA256 {}",stream.finish());
}
