(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1e3,t=1001,n=1002,r=1003,i=1004,a=1005,o=1006,s=1007,c=1008,l=1009,u=1010,d=1011,f=1012,p=1013,m=1014,h=1015,g=1016,_=1017,v=1018,y=1020,b=35902,x=35899,S=1021,C=1022,w=1023,T=1026,E=1027,D=1028,O=1029,k=1030,ee=1031,A=1033,j=33776,M=33777,te=33778,N=33779,P=35840,ne=35841,F=35842,I=35843,L=36196,re=37492,ie=37496,ae=37488,R=37489,oe=37490,se=37491,ce=37808,le=37809,ue=37810,de=37811,fe=37812,pe=37813,me=37814,he=37815,ge=37816,_e=37817,ve=37818,ye=37819,be=37820,xe=37821,Se=36492,Ce=36494,we=36495,Te=36283,Ee=36284,De=36285,Oe=36286,ke=2300,z=2301,Ae=2302,B=2303,V=2400,H=2401,je=2402,Me=3200,Ne=`srgb`,Pe=`srgb-linear`,Fe=`linear`,Ie=`srgb`,Le=7680,Re=35044,ze=35048,Be=2e3;function Ve(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function He(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function Ue(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function We(){let e=Ue(`canvas`);return e.style.display=`block`,e}var Ge={};function Ke(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function qe(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function Je(...e){e=qe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function Ye(...e){e=qe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function Xe(...e){let t=e.join(` `);t in Ge||(Ge[t]=!0,Je(...e))}function Ze(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var Qe={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},$e=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},et=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),tt=1234567,nt=Math.PI/180,rt=180/Math.PI;function it(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(et[e&255]+et[e>>8&255]+et[e>>16&255]+et[e>>24&255]+`-`+et[t&255]+et[t>>8&255]+`-`+et[t>>16&15|64]+et[t>>24&255]+`-`+et[n&63|128]+et[n>>8&255]+`-`+et[n>>16&255]+et[n>>24&255]+et[r&255]+et[r>>8&255]+et[r>>16&255]+et[r>>24&255]).toLowerCase()}function at(e,t,n){return Math.max(t,Math.min(n,e))}function ot(e,t){return(e%t+t)%t}function st(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function ct(e,t,n){return e===t?0:(n-e)/(t-e)}function lt(e,t,n){return(1-n)*e+n*t}function ut(e,t,n,r){return lt(e,t,1-Math.exp(-n*r))}function dt(e,t=1){return t-Math.abs(ot(e,t*2)-t)}function ft(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function pt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function mt(e,t){return e+Math.floor(Math.random()*(t-e+1))}function ht(e,t){return e+Math.random()*(t-e)}function gt(e){return e*(.5-Math.random())}function _t(e){e!==void 0&&(tt=e);let t=tt+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function vt(e){return e*nt}function yt(e){return e*rt}function bt(e){return!(e&e-1)&&e!==0}function xt(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function St(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Ct(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:Je(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function wt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function Tt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var Et={DEG2RAD:nt,RAD2DEG:rt,generateUUID:it,clamp:at,euclideanModulo:ot,mapLinear:st,inverseLerp:ct,lerp:lt,damp:ut,pingpong:dt,smoothstep:ft,smootherstep:pt,randInt:mt,randFloat:ht,randFloatSpread:gt,seededRandom:_t,degToRad:vt,radToDeg:yt,isPowerOfTwo:bt,ceilPowerOfTwo:xt,floorPowerOfTwo:St,setQuaternionFromProperEuler:Ct,normalize:Tt,denormalize:wt},U=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(at(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Dt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:Je(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(at(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},W=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(kt.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(kt.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ot.copy(this).projectOnVector(e),this.sub(Ot)}reflect(e){return this.sub(Ot.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(at(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Ot=new W,kt=new Dt,At=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return Xe(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(jt.makeScale(e,t)),this}rotate(e){return Xe(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(jt.makeRotation(-e)),this}translate(e,t){return Xe(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(jt.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},jt=new At,Mt=new At().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Nt=new At().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Pt(){let e={enabled:!0,workingColorSpace:Pe,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=It(e.r),e.g=It(e.g),e.b=It(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Lt(e.r),e.g=Lt(e.g),e.b=Lt(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Fe:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return Xe(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return Xe(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Pe]:{primaries:t,whitePoint:r,transfer:Fe,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ne},outputColorSpaceConfig:{drawingBufferColorSpace:Ne}},[Ne]:{primaries:t,whitePoint:r,transfer:Ie,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ne}}}),e}var Ft=Pt();function It(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Lt(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Rt,zt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Rt===void 0&&(Rt=Ue(`canvas`)),Rt.width=e.width,Rt.height=e.height;let t=Rt.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Rt}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=Ue(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=It(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(It(t[e]/255)*255):t[e]=It(t[e]);return{data:t,width:e.width,height:e.height}}return Je(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Bt=0,Vt=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Bt++}),this.uuid=it(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Ht(r[t].image)):e.push(Ht(r[t]))}else e=Ht(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Ht(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?zt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(Je(`Texture: Unable to serialize Texture.`),{})}var Ut=0,Wt=new W,Gt=class r extends $e{constructor(e=r.DEFAULT_IMAGE,n=r.DEFAULT_MAPPING,i=t,a=t,s=o,u=c,d=w,f=l,p=r.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ut++}),this.uuid=it(),this.name=``,this.source=new Vt(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=a,this.magFilter=s,this.minFilter=u,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=f,this.offset=new U(0,0),this.repeat=new U(1,1),this.center=new U(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new At,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Wt).x}get height(){return this.source.getSize(Wt).y}get depth(){return this.source.getSize(Wt).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Je(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){Je(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(r){if(this.mapping!==300)return r;if(r.applyMatrix3(this.matrix),r.x<0||r.x>1)switch(this.wrapS){case e:r.x-=Math.floor(r.x);break;case t:r.x=r.x<0?0:1;break;case n:Math.abs(Math.floor(r.x)%2)===1?r.x=Math.ceil(r.x)-r.x:r.x-=Math.floor(r.x)}if(r.y<0||r.y>1)switch(this.wrapT){case e:r.y-=Math.floor(r.y);break;case t:r.y=r.y<0?0:1;break;case n:Math.abs(Math.floor(r.y)%2)===1?r.y=Math.ceil(r.y)-r.y:r.y-=Math.floor(r.y)}return this.flipY&&(r.y=1-r.y),r}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Gt.DEFAULT_IMAGE=null,Gt.DEFAULT_MAPPING=300,Gt.DEFAULT_ANISOTROPY=1;var Kt=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this.w=at(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this.w=at(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},qt=class extends $e{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:o,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Kt(0,0,e,t),this.scissorTest=!1,this.viewport=new Kt(0,0,e,t),this.textures=[];let r=new Gt({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:o,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Vt(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},Jt=class extends qt{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Yt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Xt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Zt=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Qt.setFromMatrixColumn(e,0).length(),i=1/Qt.setFromMatrixColumn(e,1).length(),a=1/Qt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(en,e,tn)}lookAt(e,t,n){let r=this.elements;return an.subVectors(e,t),an.lengthSq()===0&&(an.z=1),an.normalize(),nn.crossVectors(n,an),nn.lengthSq()===0&&(Math.abs(n.z)===1?an.x+=1e-4:an.z+=1e-4,an.normalize(),nn.crossVectors(n,an)),nn.normalize(),rn.crossVectors(an,nn),r[0]=nn.x,r[4]=rn.x,r[8]=an.x,r[1]=nn.y,r[5]=rn.y,r[9]=an.y,r[2]=nn.z,r[6]=rn.z,r[10]=an.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],ee=r[6],A=r[10],j=r[14],M=r[3],te=r[7],N=r[11],P=r[15];return i[0]=a*x+o*T+s*k+c*M,i[4]=a*S+o*E+s*ee+c*te,i[8]=a*C+o*D+s*A+c*N,i[12]=a*w+o*O+s*j+c*P,i[1]=l*x+u*T+d*k+f*M,i[5]=l*S+u*E+d*ee+f*te,i[9]=l*C+u*D+d*A+f*N,i[13]=l*w+u*O+d*j+f*P,i[2]=p*x+m*T+h*k+g*M,i[6]=p*S+m*E+h*ee+g*te,i[10]=p*C+m*D+h*A+g*N,i[14]=p*w+m*O+h*j+g*P,i[3]=_*x+v*T+y*k+b*M,i[7]=_*S+v*E+y*ee+b*te,i[11]=_*C+v*D+y*A+b*N,i[15]=_*w+v*O+y*j+b*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let ee=1/k;return e[0]=(o*O-s*D+c*E)*ee,e[1]=(r*D-n*O-i*E)*ee,e[2]=(m*S-h*x+g*b)*ee,e[3]=(d*x-u*S-f*b)*ee,e[4]=(s*T-a*O-c*w)*ee,e[5]=(t*O-r*T+i*w)*ee,e[6]=(h*y-p*S-g*v)*ee,e[7]=(l*S-d*y+f*v)*ee,e[8]=(a*D-o*T+c*C)*ee,e[9]=(n*T-t*D-i*C)*ee,e[10]=(p*x-m*y+g*_)*ee,e[11]=(u*y-l*x-f*_)*ee,e[12]=(o*w-a*E-s*C)*ee,e[13]=(t*E-n*w+r*C)*ee,e[14]=(m*v-p*b-h*_)*ee,e[15]=(l*b-u*v+d*_)*ee,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Qt.set(r[0],r[1],r[2]).length(),o=Qt.set(r[4],r[5],r[6]).length(),s=Qt.set(r[8],r[9],r[10]).length();i<0&&(a=-a),$t.copy(this);let c=1/a,l=1/o,u=1/s;return $t.elements[0]*=c,$t.elements[1]*=c,$t.elements[2]*=c,$t.elements[4]*=l,$t.elements[5]*=l,$t.elements[6]*=l,$t.elements[8]*=u,$t.elements[9]*=u,$t.elements[10]*=u,t.setFromRotationMatrix($t),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Be,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Be,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Qt=new W,$t=new Zt,en=new W(0,0,0),tn=new W(1,1,1),nn=new W,rn=new W,an=new W,on=new Zt,sn=new Dt,cn=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(at(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-at(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(at(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-at(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(at(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-at(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:Je(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return on.makeRotationFromQuaternion(e),this.setFromRotationMatrix(on,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return sn.setFromEuler(this),this.setFromQuaternion(sn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};cn.DEFAULT_ORDER=`XYZ`;var ln=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},un=0,dn=new W,fn=new Dt,pn=new Zt,mn=new W,hn=new W,gn=new W,_n=new Dt,vn=new W(1,0,0),yn=new W(0,1,0),bn=new W(0,0,1),xn={type:`added`},Sn={type:`removed`},Cn={type:`childadded`,child:null},wn={type:`childremoved`,child:null},Tn=class e extends $e{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:un++}),this.uuid=it(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new W,n=new cn,r=new Dt,i=new W(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Zt},normalMatrix:{value:new At}}),this.matrix=new Zt,this.matrixWorld=new Zt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ln,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.multiply(fn),this}rotateOnWorldAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.premultiply(fn),this}rotateX(e){return this.rotateOnAxis(vn,e)}rotateY(e){return this.rotateOnAxis(yn,e)}rotateZ(e){return this.rotateOnAxis(bn,e)}translateOnAxis(e,t){return dn.copy(e).applyQuaternion(this.quaternion),this.position.add(dn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(vn,e)}translateY(e){return this.translateOnAxis(yn,e)}translateZ(e){return this.translateOnAxis(bn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?mn.copy(e):mn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),hn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pn.lookAt(hn,mn,this.up):pn.lookAt(mn,hn,this.up),this.quaternion.setFromRotationMatrix(pn),r&&(pn.extractRotation(r.matrixWorld),fn.setFromRotationMatrix(pn),this.quaternion.premultiply(fn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(Ye(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null):Ye(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Sn),wn.child=e,this.dispatchEvent(wn),wn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pn.multiply(e.parent.matrixWorld)),e.applyMatrix4(pn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,e,gn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,_n,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};Tn.DEFAULT_UP=new W(0,1,0),Tn.DEFAULT_MATRIX_AUTO_UPDATE=!0,Tn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var En=class extends Tn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Dn={type:`move`},On=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new En,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new En,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new W,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new W),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new En,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new W,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new W,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Dn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new En;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},kn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},An={h:0,s:0,l:0},jn={h:0,s:0,l:0};function Mn(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var G=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ne){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ft.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ft.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ft.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ft.workingColorSpace){if(e=ot(e,1),t=at(t,0,1),n=at(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Mn(i,r,e+1/3),this.g=Mn(i,r,e),this.b=Mn(i,r,e-1/3)}return Ft.colorSpaceToWorking(this,r),this}setStyle(e,t=Ne){function n(t){t!==void 0&&parseFloat(t)<1&&Je(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:Je(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);Je(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ne){let n=kn[e.toLowerCase()];return n===void 0?Je(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=It(e.r),this.g=It(e.g),this.b=It(e.b),this}copyLinearToSRGB(e){return this.r=Lt(e.r),this.g=Lt(e.g),this.b=Lt(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ne){return Ft.workingToColorSpace(Nn.copy(this),e),Math.round(at(Nn.r*255,0,255))*65536+Math.round(at(Nn.g*255,0,255))*256+Math.round(at(Nn.b*255,0,255))}getHexString(e=Ne){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ft.workingColorSpace){Ft.workingToColorSpace(Nn.copy(this),t);let n=Nn.r,r=Nn.g,i=Nn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ft.workingColorSpace){return Ft.workingToColorSpace(Nn.copy(this),t),e.r=Nn.r,e.g=Nn.g,e.b=Nn.b,e}getStyle(e=Ne){Ft.workingToColorSpace(Nn.copy(this),e);let t=Nn.r,n=Nn.g,r=Nn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(An),this.setHSL(An.h+e,An.s+t,An.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(An),e.getHSL(jn);let n=lt(An.h,jn.h,t),r=lt(An.s,jn.s,t),i=lt(An.l,jn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Nn=new G;G.NAMES=kn;var Pn=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new G(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Fn=class extends Tn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new cn,this.environmentIntensity=1,this.environmentRotation=new cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},In=new W,Ln=new W,Rn=new W,zn=new W,Bn=new W,Vn=new W,Hn=new W,Un=new W,Wn=new W,Gn=new W,Kn=new Kt,qn=new Kt,Jn=new Kt,Yn=class e{constructor(e=new W,t=new W,n=new W){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),In.subVectors(e,t),r.cross(In);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){In.subVectors(r,t),Ln.subVectors(n,t),Rn.subVectors(e,t);let a=In.dot(In),o=In.dot(Ln),s=In.dot(Rn),c=Ln.dot(Ln),l=Ln.dot(Rn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,zn)!==null&&zn.x>=0&&zn.y>=0&&zn.x+zn.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,zn)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,zn.x),s.addScaledVector(a,zn.y),s.addScaledVector(o,zn.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Kn.setScalar(0),qn.setScalar(0),Jn.setScalar(0),Kn.fromBufferAttribute(e,t),qn.fromBufferAttribute(e,n),Jn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Kn,i.x),a.addScaledVector(qn,i.y),a.addScaledVector(Jn,i.z),a}static isFrontFacing(e,t,n,r){return In.subVectors(n,t),Ln.subVectors(e,t),In.cross(Ln).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return In.subVectors(this.c,this.b),Ln.subVectors(this.a,this.b),In.cross(Ln).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Bn.subVectors(r,n),Vn.subVectors(i,n),Un.subVectors(e,n);let s=Bn.dot(Un),c=Vn.dot(Un);if(s<=0&&c<=0)return t.copy(n);Wn.subVectors(e,r);let l=Bn.dot(Wn),u=Vn.dot(Wn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Bn,a);Gn.subVectors(e,i);let f=Bn.dot(Gn),p=Vn.dot(Gn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Vn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Hn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Hn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Bn,a).addScaledVector(Vn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Xn=class{constructor(e=new W(1/0,1/0,1/0),t=new W(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Qn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Qn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Qn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Qn):Qn.fromBufferAttribute(r,t),Qn.applyMatrix4(e.matrixWorld),this.expandByPoint(Qn);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),$n.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),$n.copy(e.boundingBox)),$n.applyMatrix4(e.matrixWorld),this.union($n)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Qn),Qn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(or),sr.subVectors(this.max,or),er.subVectors(e.a,or),tr.subVectors(e.b,or),nr.subVectors(e.c,or),rr.subVectors(tr,er),ir.subVectors(nr,tr),ar.subVectors(er,nr);let t=[0,-rr.z,rr.y,0,-ir.z,ir.y,0,-ar.z,ar.y,rr.z,0,-rr.x,ir.z,0,-ir.x,ar.z,0,-ar.x,-rr.y,rr.x,0,-ir.y,ir.x,0,-ar.y,ar.x,0];return!ur(t,er,tr,nr,sr)||(t=[1,0,0,0,1,0,0,0,1],!ur(t,er,tr,nr,sr))?!1:(cr.crossVectors(rr,ir),t=[cr.x,cr.y,cr.z],ur(t,er,tr,nr,sr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Qn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Qn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Zn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Zn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Zn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Zn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Zn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Zn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Zn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Zn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Zn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Zn=[new W,new W,new W,new W,new W,new W,new W,new W],Qn=new W,$n=new Xn,er=new W,tr=new W,nr=new W,rr=new W,ir=new W,ar=new W,or=new W,sr=new W,cr=new W,lr=new W;function ur(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){lr.fromArray(e,a);let o=i.x*Math.abs(lr.x)+i.y*Math.abs(lr.y)+i.z*Math.abs(lr.z),s=t.dot(lr),c=n.dot(lr),l=r.dot(lr);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var dr=new W,fr=new U,pr=0,mr=class extends $e{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:pr++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Re,this.updateRanges=[],this.gpuType=h,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)fr.fromBufferAttribute(this,t),fr.applyMatrix3(e),this.setXY(t,fr.x,fr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix3(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix4(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyNormalMatrix(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.transformDirection(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=wt(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=wt(t,this.array)),t}setX(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=wt(t,this.array)),t}setY(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=wt(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=wt(t,this.array)),t}setW(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array),i=Tt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:`dispose`})}},hr=class extends mr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},gr=class extends mr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},_r=class extends mr{constructor(e,t,n){super(new Float32Array(e),t,n)}},vr=new Xn,yr=new W,br=new W,xr=class{constructor(e=new W,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?vr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yr.subVectors(e,this.center);let t=yr.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(yr,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(br.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yr.copy(e.center).add(br)),this.expandByPoint(yr.copy(e.center).sub(br))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Sr=0,Cr=new Zt,wr=new Tn,Tr=new W,Er=new Xn,Dr=new Xn,Or=new W,kr=class e extends $e{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Sr++}),this.uuid=it(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(Ve(e)?gr:hr)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new At().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Cr.makeRotationFromQuaternion(e),this.applyMatrix4(Cr),this}rotateX(e){return Cr.makeRotationX(e),this.applyMatrix4(Cr),this}rotateY(e){return Cr.makeRotationY(e),this.applyMatrix4(Cr),this}rotateZ(e){return Cr.makeRotationZ(e),this.applyMatrix4(Cr),this}translate(e,t,n){return Cr.makeTranslation(e,t,n),this.applyMatrix4(Cr),this}scale(e,t,n){return Cr.makeScale(e,t,n),this.applyMatrix4(Cr),this}lookAt(e){return wr.lookAt(e),wr.updateMatrix(),this.applyMatrix4(wr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Tr).negate(),this.translate(Tr.x,Tr.y,Tr.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new _r(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&Je(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ye(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new W(-1/0,-1/0,-1/0),new W(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Er.setFromBufferAttribute(n),this.morphTargetsRelative?(Or.addVectors(this.boundingBox.min,Er.min),this.boundingBox.expandByPoint(Or),Or.addVectors(this.boundingBox.max,Er.max),this.boundingBox.expandByPoint(Or)):(this.boundingBox.expandByPoint(Er.min),this.boundingBox.expandByPoint(Er.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ye(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new xr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ye(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new W,1/0);return}if(e){let n=this.boundingSphere.center;if(Er.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Dr.setFromBufferAttribute(n),this.morphTargetsRelative?(Or.addVectors(Er.min,Dr.min),Er.expandByPoint(Or),Or.addVectors(Er.max,Dr.max),Er.expandByPoint(Or)):(Er.expandByPoint(Dr.min),Er.expandByPoint(Dr.max))}Er.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Or.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Or));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Or.fromBufferAttribute(a,t),o&&(Tr.fromBufferAttribute(e,t),Or.add(Tr)),r=Math.max(r,n.distanceToSquared(Or))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Ye(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ye(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new mr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new W,s[e]=new W;let c=new W,l=new W,u=new W,d=new U,f=new U,p=new U,m=new W,h=new W;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new W,y=new W,b=new W,x=new W;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new mr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new W,i=new W,a=new W,o=new W,s=new W,c=new W,l=new W,u=new W;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Or.fromBufferAttribute(e,t),Or.normalize(),e.setXYZ(t,Or.x,Or.y,Or.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new mr(a,r,i)}if(this.index===null)return Je(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Ar=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=Re,this.updateRanges=[],this.version=0,this.uuid=it()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=it()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=it()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},jr=new W,Mr=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.applyMatrix4(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.applyNormalMatrix(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.transformDirection(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=wt(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=wt(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=wt(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=wt(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=wt(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array),i=Tt(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){Ke(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new mr(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Ke(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Nr=0,Pr=class extends $e{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Nr++}),this.uuid=it(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new G(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Le,this.stencilZFail=Le,this.stencilZPass=Le,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Je(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){Je(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new G().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new U().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new U().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Fr=class extends Pr{constructor(e){super(),this.isSpriteMaterial=!0,this.type=`SpriteMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ir,Lr=new W,Rr=new W,zr=new W,Br=new U,Vr=new U,Hr=new Zt,Ur=new W,Wr=new W,Gr=new W,Kr=new U,qr=new U,Jr=new U,Yr=class extends Tn{constructor(e=new Fr){if(super(),this.isSprite=!0,this.type=`Sprite`,Ir===void 0){Ir=new kr;let e=new Ar(new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),5);Ir.setIndex([0,1,2,0,2,3]),Ir.setAttribute(`position`,new Mr(e,3,0,!1)),Ir.setAttribute(`uv`,new Mr(e,2,3,!1))}this.geometry=Ir,this.material=e,this.center=new U(.5,.5),this.count=1}raycast(e,t){e.camera===null&&Ye(`Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.`),Rr.setFromMatrixScale(this.matrixWorld),Hr.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),zr.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Rr.multiplyScalar(-zr.z);let n=this.material.rotation,r,i;n!==0&&(i=Math.cos(n),r=Math.sin(n));let a=this.center;Xr(Ur.set(-.5,-.5,0),zr,a,Rr,r,i),Xr(Wr.set(.5,-.5,0),zr,a,Rr,r,i),Xr(Gr.set(.5,.5,0),zr,a,Rr,r,i),Kr.set(0,0),qr.set(1,0),Jr.set(1,1);let o=e.ray.intersectTriangle(Ur,Wr,Gr,!1,Lr);if(o===null&&(Xr(Wr.set(-.5,.5,0),zr,a,Rr,r,i),qr.set(0,1),o=e.ray.intersectTriangle(Ur,Gr,Wr,!1,Lr),o===null))return;let s=e.ray.origin.distanceTo(Lr);s<e.near||s>e.far||t.push({distance:s,point:Lr.clone(),uv:Yn.getInterpolation(Lr,Ur,Wr,Gr,Kr,qr,Jr,new U),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function Xr(e,t,n,r,i,a){Br.subVectors(e,n).addScalar(.5).multiply(r),i===void 0?Vr.copy(Br):(Vr.x=a*Br.x-i*Br.y,Vr.y=i*Br.x+a*Br.y),e.copy(t),e.x+=Vr.x,e.y+=Vr.y,e.applyMatrix4(Hr)}var Zr=new W,Qr=new W,$r=new W,ei=new W,ti=new W,ni=new W,ri=new W,ii=class{constructor(e=new W,t=new W(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Zr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Zr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Zr.copy(this.origin).addScaledVector(this.direction,t),Zr.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Qr.copy(e).add(t).multiplyScalar(.5),$r.copy(t).sub(e).normalize(),ei.copy(this.origin).sub(Qr);let i=e.distanceTo(t)*.5,a=-this.direction.dot($r),o=ei.dot(this.direction),s=-ei.dot($r),c=ei.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Qr).addScaledVector($r,d),f}intersectSphere(e,t){Zr.subVectors(e.center,this.origin);let n=Zr.dot(this.direction),r=Zr.dot(Zr)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Zr)!==null}intersectTriangle(e,t,n,r,i){ti.subVectors(t,e),ni.subVectors(n,e),ri.crossVectors(ti,ni);let a=this.direction.dot(ri),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;ei.subVectors(this.origin,e);let s=o*this.direction.dot(ni.crossVectors(ei,ni));if(s<0)return null;let c=o*this.direction.dot(ti.cross(ei));if(c<0||s+c>a)return null;let l=-o*ei.dot(ri);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ai=class extends Pr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new G(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},oi=new Zt,si=new ii,ci=new xr,li=new W,ui=new W,di=new W,fi=new W,pi=new W,mi=new W,hi=new W,gi=new W,K=class extends Tn{constructor(e=new kr,t=new ai){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){mi.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(pi.fromBufferAttribute(s,e),a?mi.addScaledVector(pi,r):mi.addScaledVector(pi.sub(t),r))}t.add(mi)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ci.copy(n.boundingSphere),ci.applyMatrix4(i),si.copy(e.ray).recast(e.near),!(ci.containsPoint(si.origin)===!1&&(si.intersectSphere(ci,li)===null||si.origin.distanceToSquared(li)>(e.far-e.near)**2))&&(oi.copy(i).invert(),si.copy(e.ray).applyMatrix4(oi),(n.boundingBox===null||si.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,si)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=vi(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=vi(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=vi(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=vi(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function _i(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;gi.copy(s),gi.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(gi);return l<n.near||l>n.far?null:{distance:l,point:gi.clone(),object:e}}function vi(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,ui),e.getVertexPosition(c,di),e.getVertexPosition(l,fi);let u=_i(e,t,n,r,ui,di,fi,hi);if(u){let e=new W;Yn.getBarycoord(hi,ui,di,fi,e),i&&(u.uv=Yn.getInterpolatedAttribute(i,s,c,l,e,new U)),a&&(u.uv1=Yn.getInterpolatedAttribute(a,s,c,l,e,new U)),o&&(u.normal=Yn.getInterpolatedAttribute(o,s,c,l,e,new W),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new W,materialIndex:0};Yn.getNormal(ui,di,fi,t.normal),u.face=t,u.barycoord=e}return u}var yi=class extends Gt{constructor(e=null,t=1,n=1,i,a,o,s,c,l=r,u=r,d,f){super(null,o,s,c,l,u,i,a,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},bi=class extends mr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},xi=new Zt,Si=new Zt,Ci=[],wi=new Xn,Ti=new Zt,Ei=new K,Di=new xr,Oi=class extends K{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new bi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Ti)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Xn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,xi),wi.copy(e.boundingBox).applyMatrix4(xi),this.boundingBox.union(wi)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new xr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,xi),Di.copy(e.boundingSphere).applyMatrix4(xi),this.boundingSphere.union(Di)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Ei.geometry=this.geometry,Ei.material=this.material,Ei.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Di.copy(this.boundingSphere),Di.applyMatrix4(n),e.ray.intersectsSphere(Di)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,xi),Si.multiplyMatrices(n,xi),Ei.matrixWorld=Si,Ei.raycast(e,Ci);for(let e=0,n=Ci.length;e<n;e++){let n=Ci[e];n.instanceId=i,n.object=this,t.push(n)}Ci.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new bi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new yi(new Float32Array(r*this.count),r,this.count,D,h));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},ki=new W,Ai=new W,ji=new At,Mi=class{constructor(e=new W(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=ki.subVectors(n,t).cross(Ai.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(ki),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ji.getNormalMatrix(e),r=this.coplanarPoint(ki).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ni=new xr,Pi=new U(.5,.5),Fi=new W,Ii=class{constructor(e=new Mi,t=new Mi,n=new Mi,r=new Mi,i=new Mi,a=new Mi){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Be,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ni.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ni.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ni)}intersectsSprite(e){return Ni.center.set(0,0,0),Ni.radius=.7071067811865476+Pi.distanceTo(e.center),Ni.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ni)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Fi.x=r.normal.x>0?e.max.x:e.min.x,Fi.y=r.normal.y>0?e.max.y:e.min.y,Fi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Fi)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Li=class extends Pr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new G(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ri=new W,zi=new W,Bi=new Zt,Vi=new ii,Hi=new xr,Ui=new W,Wi=new W,Gi=class extends Tn{constructor(e=new kr,t=new Li){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Ri.fromBufferAttribute(t,e-1),zi.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Ri.distanceTo(zi);e.setAttribute(`lineDistance`,new _r(n,1))}else Je(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Hi.copy(n.boundingSphere),Hi.applyMatrix4(r),Hi.radius+=i,e.ray.intersectsSphere(Hi)===!1)return;Bi.copy(r).invert(),Vi.copy(e.ray).applyMatrix4(Bi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=Ki(this,e,Vi,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=Ki(this,e,Vi,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=Ki(this,e,Vi,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=Ki(this,e,Vi,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Ki(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Ri.fromBufferAttribute(s,i),zi.fromBufferAttribute(s,a),n.distanceSqToSegment(Ri,zi,Ui,Wi)>r)return;Ui.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Ui);if(!(c<t.near||c>t.far))return{distance:c,point:Wi.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var qi=new W,Ji=new W,Yi=class extends Gi{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)qi.fromBufferAttribute(t,e),Ji.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+qi.distanceTo(Ji);e.setAttribute(`lineDistance`,new _r(n,1))}else Je(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},Xi=class extends Pr{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Zi=new Zt,Qi=new ii,$i=new xr,ea=new W,ta=class extends Tn{constructor(e=new kr,t=new Xi){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),$i.copy(n.boundingSphere),$i.applyMatrix4(r),$i.radius+=i,e.ray.intersectsSphere($i)===!1)return;Zi.copy(r).invert(),Qi.copy(e.ray).applyMatrix4(Zi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);ea.fromBufferAttribute(l,n),na(ea,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)ea.fromBufferAttribute(l,a),na(ea,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function na(e,t,n,r,i,a,o){let s=Qi.distanceSqToPoint(e);if(s<n){let n=new W;Qi.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ra=class extends Gt{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},ia=class extends Gt{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},aa=class extends Gt{constructor(e,t,n=m,i,a,o,s=r,c=r,l,u=T,d=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:d},i,a,o,s,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Vt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},oa=class extends aa{constructor(e,t=m,n=301,i,a,o=r,s=r,c,l=T){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,i,a,o,s,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},sa=class extends Gt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},q=class e extends kr{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new _r(c,3)),this.setAttribute(`normal`,new _r(l,3)),this.setAttribute(`uv`,new _r(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new W;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},ca=class e extends kr{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new W,g=new W;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new _r(o,3)),this.setAttribute(`normal`,new _r(s,3)),this.setAttribute(`uv`,new _r(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},la=class e extends kr{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new W,l=new U;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new _r(a,3)),this.setAttribute(`normal`,new _r(o,3)),this.setAttribute(`uv`,new _r(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},J=class e extends kr{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new _r(u,3)),this.setAttribute(`normal`,new _r(d,3)),this.setAttribute(`uv`,new _r(f,2));function _(){let a=new W,_=new W,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new U,m=new W,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},ua=class e extends J{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},da=class e extends kr{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new _r(i,3)),this.setAttribute(`normal`,new _r(i.slice(),3)),this.setAttribute(`uv`,new _r(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new W,r=new W,i=new W;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new W;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new W;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new W,t=new W,n=new W,r=new W,o=new U,s=new U,c=new U;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},fa=class e extends da{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n,i=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r];super(i,[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type=`DodecahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},pa=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Je(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new U:new W);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new W,r=[],i=[],a=[],o=new W,s=new Zt;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new W)}i[0]=new W,a[0]=new W;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(at(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(at(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},ma=class extends pa{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new U){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},ha=class extends ma{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function ga(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var _a=new W,va=new W,ya=new ga,ba=new ga,xa=new ga,Sa=class extends pa{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new W){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(va.subVectors(r[0],r[1]).add(r[0]),c=va);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(_a.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=_a),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),ya.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),ba.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),xa.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(ya.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),ba.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),xa.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(ya.calc(s),ba.calc(s),xa.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new W().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Ca(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function wa(e,t){let n=1-e;return n*n*t}function Ta(e,t){return 2*(1-e)*e*t}function Ea(e,t){return e*e*t}function Da(e,t,n,r){return wa(e,t)+Ta(e,n)+Ea(e,r)}function Oa(e,t){let n=1-e;return n*n*n*t}function ka(e,t){let n=1-e;return 3*n*n*e*t}function Aa(e,t){return 3*(1-e)*e*e*t}function ja(e,t){return e*e*e*t}function Ma(e,t,n,r,i){return Oa(e,t)+ka(e,n)+Aa(e,r)+ja(e,i)}var Na=class extends pa{constructor(e=new U,t=new U,n=new U,r=new U){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ma(e,r.x,i.x,a.x,o.x),Ma(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Pa=class extends pa{constructor(e=new W,t=new W,n=new W,r=new W){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Ma(e,r.x,i.x,a.x,o.x),Ma(e,r.y,i.y,a.y,o.y),Ma(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Fa=class extends pa{constructor(e=new U,t=new U){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new U){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new U){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ia=class extends pa{constructor(e=new W,t=new W){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new W){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new W){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},La=class extends pa{constructor(e=new U,t=new U,n=new U){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Da(e,r.x,i.x,a.x),Da(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ra=class extends pa{constructor(e=new W,t=new W,n=new W){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Da(e,r.x,i.x,a.x),Da(e,r.y,i.y,a.y),Da(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},za=class extends pa{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new U){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(Ca(o,s.x,c.x,l.x,u.x),Ca(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new U().fromArray(n))}return this}},Ba=Object.freeze({__proto__:null,ArcCurve:ha,CatmullRomCurve3:Sa,CubicBezierCurve:Na,CubicBezierCurve3:Pa,EllipseCurve:ma,LineCurve:Fa,LineCurve3:Ia,QuadraticBezierCurve:La,QuadraticBezierCurve3:Ra,SplineCurve:za}),Va=class extends pa{constructor(){super(),this.type=`CurvePath`,this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?`LineCurve`:`LineCurve3`;this.curves.push(new Ba[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),i=0;for(;i<r.length;){if(r[i]>=n){let e=r[i]-n,a=this.curves[i],o=a.getLength(),s=o===0?0:1-e/o;return a.getPointAt(s,t)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,i=this.curves;r<i.length;r++){let a=i[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,s=a.getPoints(o);for(let e=0;e<s.length;e++){let r=s[e];n&&n.equals(r)||(t.push(r),n=r)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(new Ba[n.type]().fromJSON(n))}return this}},Ha=class extends Va{constructor(e){super(),this.type=`Path`,this.currentPoint=new U,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Fa(this.currentPoint.clone(),new U(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let i=new La(this.currentPoint.clone(),new U(e,t),new U(n,r));return this.curves.push(i),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,i,a){let o=new Na(this.currentPoint.clone(),new U(e,t),new U(n,r),new U(i,a));return this.curves.push(o),this.currentPoint.set(i,a),this}splineThru(e){let t=new za([this.currentPoint.clone()].concat(e));return this.curves.push(t),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,i,a){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,n,r,i,a),this}absarc(e,t,n,r,i,a){return this.absellipse(e,t,n,n,r,i,a),this}ellipse(e,t,n,r,i,a,o,s){let c=this.currentPoint.x,l=this.currentPoint.y;return this.absellipse(e+c,t+l,n,r,i,a,o,s),this}absellipse(e,t,n,r,i,a,o,s){let c=new ma(e,t,n,r,i,a,o,s);if(this.curves.length>0){let e=c.getPoint(0);e.equals(this.currentPoint)||this.lineTo(e.x,e.y)}this.curves.push(c);let l=c.getPoint(1);return this.currentPoint.copy(l),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Ua=class extends Ha{constructor(e){super(e),this.uuid=it(),this.type=`Shape`,this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(new Ha().fromJSON(n))}return this}};function Wa(e,t,n=2){let r=t&&t.length,i=r?t[0]*n:e.length,a=Ga(e,0,i,n,!0),o=[];if(!a||a.next===a.prev)return o;let s,c,l;if(r&&(a=Qa(e,t,a,n)),e.length>80*n){s=e[0],c=e[1];let t=s,r=c;for(let a=n;a<i;a+=n){let n=e[a],i=e[a+1];n<s&&(s=n),i<c&&(c=i),n>t&&(t=n),i>r&&(r=i)}l=Math.max(t-s,r-c),l=l===0?0:32767/l}return qa(a,o,n,s,c,l,0),o}function Ga(e,t,n,r,i){let a;if(i===Co(e,t,n,r)>0)for(let i=t;i<n;i+=r)a=bo(i/r|0,e[i],e[i+1],a);else for(let i=n-r;i>=t;i-=r)a=bo(i/r|0,e[i],e[i+1],a);return a&&fo(a,a.next)&&(xo(a),a=a.next),a}function Ka(e,t){if(!e)return e;t||=e;let n=e,r;do if(r=!1,!n.steiner&&(fo(n,n.next)||uo(n.prev,n,n.next)===0)){if(xo(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function qa(e,t,n,r,i,a,o){if(!e)return;!o&&a&&ro(e,r,i,a);let s=e;for(;e.prev!==e.next;){let c=e.prev,l=e.next;if(a?Ya(e,r,i,a):Ja(e)){t.push(c.i,e.i,l.i),xo(e),e=l.next,s=l.next;continue}if(e=l,e===s){o?o===1?(e=Xa(Ka(e),t),qa(e,t,n,r,i,a,2)):o===2&&Za(e,t,n,r,i,a):qa(Ka(e),t,n,r,i,a,1);break}}}function Ja(e){let t=e.prev,n=e,r=e.next;if(uo(t,n,r)>=0)return!1;let i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=Math.min(i,a,o),d=Math.min(s,c,l),f=Math.max(i,a,o),p=Math.max(s,c,l),m=r.next;for(;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&co(i,s,a,c,o,l,m.x,m.y)&&uo(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Ya(e,t,n,r){let i=e.prev,a=e,o=e.next;if(uo(i,a,o)>=0)return!1;let s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=Math.min(s,c,l),m=Math.min(u,d,f),h=Math.max(s,c,l),g=Math.max(u,d,f),_=ao(p,m,t,n,r),v=ao(h,g,t,n,r),y=e.prevZ,b=e.nextZ;for(;y&&y.z>=_&&b&&b.z<=v;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&co(s,u,c,d,l,f,y.x,y.y)&&uo(y.prev,y,y.next)>=0||(y=y.prevZ,b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&co(s,u,c,d,l,f,b.x,b.y)&&uo(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;y&&y.z>=_;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&co(s,u,c,d,l,f,y.x,y.y)&&uo(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;b&&b.z<=v;){if(b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&co(s,u,c,d,l,f,b.x,b.y)&&uo(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function Xa(e,t){let n=e;do{let r=n.prev,i=n.next.next;!fo(r,i)&&po(r,n,n.next,i)&&_o(r,i)&&_o(i,r)&&(t.push(r.i,n.i,i.i),xo(n),xo(n.next),n=e=i),n=n.next}while(n!==e);return Ka(n)}function Za(e,t,n,r,i,a){let o=e;do{let e=o.next.next;for(;e!==o.prev;){if(o.i!==e.i&&lo(o,e)){let s=yo(o,e);o=Ka(o,o.next),s=Ka(s,s.next),qa(o,t,n,r,i,a,0),qa(s,t,n,r,i,a,0);return}e=e.next}o=o.next}while(o!==e)}function Qa(e,t,n,r){let i=[];for(let n=0,a=t.length;n<a;n++){let o=Ga(e,t[n]*r,n<a-1?t[n+1]*r:e.length,r,!1);o===o.next&&(o.steiner=!0),i.push(oo(o))}i.sort($a);for(let e=0;e<i.length;e++)n=eo(i[e],n);return n}function $a(e,t){let n=e.x-t.x;return n===0&&(n=e.y-t.y,n===0&&(n=(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x))),n}function eo(e,t){let n=to(e,t);if(!n)return t;let r=yo(n,e);return Ka(r,r.next),Ka(n,n.next)}function to(e,t){let n=t,r=e.x,i=e.y,a=-1/0,o;if(fo(e,n))return n;do{if(fo(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){let e=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(e<=r&&e>a&&(a=e,o=n.x<n.next.x?n:n.next,e===r))return o}n=n.next}while(n!==t);if(!o)return null;let s=o,c=o.x,l=o.y,u=1/0;n=o;do{if(r>=n.x&&n.x>=c&&r!==n.x&&so(i<l?r:a,i,c,l,i<l?a:r,i,n.x,n.y)){let t=Math.abs(i-n.y)/(r-n.x);_o(n,e)&&(t<u||t===u&&(n.x>o.x||n.x===o.x&&no(o,n)))&&(o=n,u=t)}n=n.next}while(n!==s);return o}function no(e,t){return uo(e.prev,e,t.prev)<0&&uo(t.next,e,e.next)<0}function ro(e,t,n,r){let i=e;do i.z===0&&(i.z=ao(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,io(i)}function io(e){let t,n=1;do{let r=e,i;e=null;let a=null;for(t=0;r;){t++;let o=r,s=0;for(let e=0;e<n&&(s++,o=o.nextZ,o);e++);let c=n;for(;s>0||c>0&&o;)s!==0&&(c===0||!o||r.z<=o.z)?(i=r,r=r.nextZ,s--):(i=o,o=o.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;r=o}a.nextZ=null,n*=2}while(t>1);return e}function ao(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function oo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function so(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function co(e,t,n,r,i,a,o,s){return(e!==o||t!==s)&&so(e,t,n,r,i,a,o,s)}function lo(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!go(e,t)&&(_o(e,t)&&_o(t,e)&&vo(e,t)&&(uo(e.prev,e,t.prev)||uo(e,t.prev,t))||fo(e,t)&&uo(e.prev,e,e.next)>0&&uo(t.prev,t,t.next)>0)}function uo(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function fo(e,t){return e.x===t.x&&e.y===t.y}function po(e,t,n,r){let i=ho(uo(e,t,n)),a=ho(uo(e,t,r)),o=ho(uo(n,r,e)),s=ho(uo(n,r,t));return!!(i!==a&&o!==s||i===0&&mo(e,n,t)||a===0&&mo(e,r,t)||o===0&&mo(n,e,r)||s===0&&mo(n,t,r))}function mo(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function ho(e){return e>0?1:e<0?-1:0}function go(e,t){let n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&po(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function _o(e,t){return uo(e.prev,e,e.next)<0?uo(e,t,e.next)>=0&&uo(e,e.prev,t)>=0:uo(e,t,e.prev)<0||uo(e,e.next,t)<0}function vo(e,t){let n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function yo(e,t){let n=So(e.i,e.x,e.y),r=So(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function bo(e,t,n,r){let i=So(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function xo(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function So(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Co(e,t,n,r){let i=0;for(let a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}var wo=class{static triangulate(e,t,n=2){return Wa(e,t,n)}},To=class e{static area(e){let t=e.length,n=0;for(let r=t-1,i=0;i<t;r=i++)n+=e[r].x*e[i].y-e[i].x*e[r].y;return n*.5}static isClockWise(t){return e.area(t)<0}static triangulateShape(e,t){let n=[],r=[],i=[];Eo(e),Do(n,e);let a=e.length;t.forEach(Eo);for(let e=0;e<t.length;e++)r.push(a),a+=t[e].length,Do(n,t[e]);let o=wo.triangulate(n,r);for(let e=0;e<o.length;e+=3)i.push(o.slice(e,e+3));return i}};function Eo(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function Do(e,t){for(let n=0;n<t.length;n++)e.push(t[n].x),e.push(t[n].y)}var Oo=class e extends kr{constructor(e=new Ua([new U(.5,.5),new U(-.5,.5),new U(-.5,-.5),new U(.5,-.5)]),t={}){super(),this.type=`ExtrudeGeometry`,this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],i=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];a(n)}this.setAttribute(`position`,new _r(r,3)),this.setAttribute(`uv`,new _r(i,2)),this.computeVertexNormals();function a(e){let a=[],o=t.curveSegments===void 0?12:t.curveSegments,s=t.steps===void 0?1:t.steps,c=t.depth===void 0?1:t.depth,l=t.bevelEnabled===void 0||t.bevelEnabled,u=t.bevelThickness===void 0?.2:t.bevelThickness,d=t.bevelSize===void 0?u-.1:t.bevelSize,f=t.bevelOffset===void 0?0:t.bevelOffset,p=t.bevelSegments===void 0?3:t.bevelSegments,m=t.extrudePath,h=t.UVGenerator===void 0?ko:t.UVGenerator,g,_=!1,v,y,b,x;if(m){g=m.getSpacedPoints(s),_=!0,l=!1;let e=m.isCatmullRomCurve3?m.closed:!1;v=m.computeFrenetFrames(s,e),y=new W,b=new W,x=new W}l||(p=0,u=0,d=0,f=0);let S=e.extractPoints(o),C=S.shape,w=S.holes;if(!To.isClockWise(C)){C=C.reverse();for(let e=0,t=w.length;e<t;e++){let t=w[e];To.isClockWise(t)&&(w[e]=t.reverse())}}function T(e){let t=e[0];for(let n=1;n<=e.length;n++){let r=n%e.length,i=e[r],a=i.x-t.x,o=i.y-t.y,s=a*a+o*o,c=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(t.x),Math.abs(t.y));if(s<=10000000000000001e-36*c*c){e.splice(r,1),n--;continue}t=i}}T(C),w.forEach(T);let E=w.length,D=C;for(let e=0;e<E;e++){let t=w[e];C=C.concat(t)}function O(e,t,n){return t||Ye(`ExtrudeGeometry: vec does not exist`),e.clone().addScaledVector(t,n)}let k=C.length;function ee(e,t,n){let r,i,a,o=e.x-t.x,s=e.y-t.y,c=n.x-e.x,l=n.y-e.y,u=o*o+s*s,d=o*l-s*c;if(Math.abs(d)>2**-52){let d=Math.sqrt(u),f=Math.sqrt(c*c+l*l),p=t.x-s/d,m=t.y+o/d,h=n.x-l/f,g=n.y+c/f,_=((h-p)*l-(g-m)*c)/(o*l-s*c);r=p+o*_-e.x,i=m+s*_-e.y;let v=r*r+i*i;if(v<=2)return new U(r,i);a=Math.sqrt(v/2)}else{let e=!1;o>2**-52?c>2**-52&&(e=!0):o<-(2**-52)?c<-(2**-52)&&(e=!0):Math.sign(s)===Math.sign(l)&&(e=!0),e?(r=-s,i=o,a=Math.sqrt(u)):(r=o,i=s,a=Math.sqrt(u/2))}return new U(r/a,i/a)}let A=[];for(let e=0,t=D.length,n=t-1,r=e+1;e<t;e++,n++,r++)n===t&&(n=0),r===t&&(r=0),A[e]=ee(D[e],D[n],D[r]);let j=[],M,te=A.concat();for(let e=0,t=E;e<t;e++){let t=w[e];M=[];for(let e=0,n=t.length,r=n-1,i=e+1;e<n;e++,r++,i++)r===n&&(r=0),i===n&&(i=0),M[e]=ee(t[e],t[r],t[i]);j.push(M),te=te.concat(M)}let N;if(p===0)N=To.triangulateShape(D,w);else{let e=[],t=[];for(let n=0;n<p;n++){let r=n/p,i=u*Math.cos(r*Math.PI/2),a=d*Math.sin(r*Math.PI/2)+f;for(let t=0,n=D.length;t<n;t++){let n=O(D[t],A[t],a);re(n.x,n.y,-i),r===0&&e.push(n)}for(let e=0,n=E;e<n;e++){let n=w[e];M=j[e];let o=[];for(let e=0,t=n.length;e<t;e++){let t=O(n[e],M[e],a);re(t.x,t.y,-i),r===0&&o.push(t)}r===0&&t.push(o)}}N=To.triangulateShape(e,t)}let P=N.length,ne=d+f;for(let e=0;e<k;e++){let t=l?O(C[e],te[e],ne):C[e];_?(b.copy(v.normals[0]).multiplyScalar(t.x),y.copy(v.binormals[0]).multiplyScalar(t.y),x.copy(g[0]).add(b).add(y),re(x.x,x.y,x.z)):re(t.x,t.y,0)}for(let e=1;e<=s;e++)for(let t=0;t<k;t++){let n=l?O(C[t],te[t],ne):C[t];_?(b.copy(v.normals[e]).multiplyScalar(n.x),y.copy(v.binormals[e]).multiplyScalar(n.y),x.copy(g[e]).add(b).add(y),re(x.x,x.y,x.z)):re(n.x,n.y,c/s*e)}for(let e=p-1;e>=0;e--){let t=e/p,n=u*Math.cos(t*Math.PI/2),r=d*Math.sin(t*Math.PI/2)+f;for(let e=0,t=D.length;e<t;e++){let t=O(D[e],A[e],r);re(t.x,t.y,c+n)}for(let e=0,t=w.length;e<t;e++){let t=w[e];M=j[e];for(let e=0,i=t.length;e<i;e++){let i=O(t[e],M[e],r);_?re(i.x,i.y+g[s-1].y,g[s-1].x+n):re(i.x,i.y,c+n)}}}F(),I();function F(){let e=r.length/3;if(l){let e=0,t=k*e;for(let e=0;e<P;e++){let n=N[e];ie(n[2]+t,n[1]+t,n[0]+t)}e=s+p*2,t=k*e;for(let e=0;e<P;e++){let n=N[e];ie(n[0]+t,n[1]+t,n[2]+t)}}else{for(let e=0;e<P;e++){let t=N[e];ie(t[2],t[1],t[0])}for(let e=0;e<P;e++){let t=N[e];ie(t[0]+k*s,t[1]+k*s,t[2]+k*s)}}n.addGroup(e,r.length/3-e,0)}function I(){let e=r.length/3,t=0;L(D,t),t+=D.length;for(let e=0,n=w.length;e<n;e++){let n=w[e];L(n,t),t+=n.length}n.addGroup(e,r.length/3-e,1)}function L(e,t){let n=e.length;for(;--n>=0;){let r=n,i=n-1;i<0&&(i=e.length-1);for(let e=0,n=s+p*2;e<n;e++){let n=k*e,a=k*(e+1);ae(t+r+n,t+i+n,t+i+a,t+r+a)}}}function re(e,t,n){a.push(e),a.push(t),a.push(n)}function ie(e,t,i){R(e),R(t),R(i);let a=r.length/3,o=h.generateTopUV(n,r,a-3,a-2,a-1);oe(o[0]),oe(o[1]),oe(o[2])}function ae(e,t,i,a){R(e),R(t),R(a),R(t),R(i),R(a);let o=r.length/3,s=h.generateSideWallUV(n,r,o-6,o-3,o-2,o-1);oe(s[0]),oe(s[1]),oe(s[3]),oe(s[1]),oe(s[2]),oe(s[3])}function R(e){r.push(a[e*3+0]),r.push(a[e*3+1]),r.push(a[e*3+2])}function oe(e){i.push(e.x),i.push(e.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Ao(t,n,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new Ba[i.type]().fromJSON(i)),new e(r,t.options)}},ko={generateTopUV:function(e,t,n,r,i){let a=t[n*3],o=t[n*3+1],s=t[r*3],c=t[r*3+1],l=t[i*3],u=t[i*3+1];return[new U(a,o),new U(s,c),new U(l,u)]},generateSideWallUV:function(e,t,n,r,i,a){let o=t[n*3],s=t[n*3+1],c=t[n*3+2],l=t[r*3],u=t[r*3+1],d=t[r*3+2],f=t[i*3],p=t[i*3+1],m=t[i*3+2],h=t[a*3],g=t[a*3+1],_=t[a*3+2];return Math.abs(s-u)<Math.abs(o-l)?[new U(o,1-c),new U(l,1-d),new U(f,1-m),new U(h,1-_)]:[new U(s,1-c),new U(u,1-d),new U(p,1-m),new U(g,1-_)]}};function Ao(e,t,n){if(n.shapes=[],Array.isArray(e))for(let t=0,r=e.length;t<r;t++){let r=e[t];n.shapes.push(r.uuid)}else n.shapes.push(e.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}var jo=class e extends da{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Mo=class e extends kr{constructor(e=[new U(0,-.5),new U(.5,0),new U(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=at(r,0,Math.PI*2);let i=[],a=[],o=[],s=[],c=[],l=1/t,u=new W,d=new U,f=new W,p=new W,m=new W,h=0,g=0;for(let t=0;t<=e.length-1;t++)switch(t){case 0:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,m.copy(f),f.normalize(),s.push(f.x,f.y,f.z);break;case e.length-1:s.push(m.x,m.y,m.z);break;default:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,p.copy(f),f.x+=m.x,f.y+=m.y,f.z+=m.z,f.normalize(),s.push(f.x,f.y,f.z),m.copy(p)}for(let i=0;i<=t;i++){let f=n+i*l*r,p=Math.sin(f),m=Math.cos(f);for(let n=0;n<=e.length-1;n++){u.x=e[n].x*p,u.y=e[n].y,u.z=e[n].x*m,a.push(u.x,u.y,u.z),d.x=i/t,d.y=n/(e.length-1),o.push(d.x,d.y);let r=s[3*n+0]*p,l=s[3*n+1],f=s[3*n+0]*m;c.push(r,l,f)}}for(let n=0;n<t;n++)for(let t=0;t<e.length-1;t++){let r=t+n*e.length,a=r,o=r+e.length,s=r+e.length+1,c=r+1;i.push(a,o,c),i.push(s,c,o)}this.setIndex(i),this.setAttribute(`position`,new _r(a,3)),this.setAttribute(`uv`,new _r(o,2)),this.setAttribute(`normal`,new _r(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.points,t.segments,t.phiStart,t.phiLength)}},No=class e extends da{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Po=class e extends kr{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new _r(p,3)),this.setAttribute(`normal`,new _r(m,3)),this.setAttribute(`uv`,new _r(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Fo=class e extends kr{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new W,p=new U;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new _r(s,3)),this.setAttribute(`normal`,new _r(c,3)),this.setAttribute(`uv`,new _r(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Io=class e extends kr{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new W,d=new W,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new _r(p,3)),this.setAttribute(`normal`,new _r(m,3)),this.setAttribute(`uv`,new _r(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Lo=class e extends da{constructor(e=1,t=0){super([1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],[2,1,0,0,3,2,1,3,0,2,3,1],e,t),this.type=`TetrahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ro=class e extends kr{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new W,f=new W,p=new W;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new _r(c,3)),this.setAttribute(`normal`,new _r(l,3)),this.setAttribute(`uv`,new _r(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}},zo=class e extends kr{constructor(e=new Ra(new W(-1,-1,0),new W(-1,1,0),new W(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new W,s=new W,c=new U,l=new W,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new _r(u,3)),this.setAttribute(`normal`,new _r(d,3)),this.setAttribute(`uv`,new _r(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new Ba[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Bo(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Ho(i))i.isRenderTargetTexture?(Je(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(Ho(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function Vo(e){let t={};for(let n=0;n<e.length;n++){let r=Bo(e[n]);for(let e in r)t[e]=r[e]}return t}function Ho(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Uo(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Wo(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ft.workingColorSpace}var Go={clone:Bo,merge:Vo},Ko=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,qo=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Jo=class extends Pr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ko,this.fragmentShader=qo,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bo(e.uniforms),this.uniformsGroups=Uo(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new G().setHex(r.value);break;case`v2`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new W().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Kt().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new At().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new Zt().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Yo=class extends Jo{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Y=class extends Pr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new G(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new U(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Xo=class extends Pr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Me,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Zo=class extends Pr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Qo(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}var $o=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},es=class extends $o{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:V,endingEnd:V}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case H:i=e,o=2*t-n;break;case je:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case H:a=e,s=2*n-t;break;case je:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},ts=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},ns=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},rs=class extends $o{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[p]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},is=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Qo(t,this.TimeBufferType),this.values=Qo(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Qo(e.times,Array),values:Qo(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ns(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new ts(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new es(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new rs(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case ke:t=this.InterpolantFactoryMethodDiscrete;break;case z:t=this.InterpolantFactoryMethodLinear;break;case Ae:t=this.InterpolantFactoryMethodSmooth;break;case B:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return Je(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ke;case this.InterpolantFactoryMethodLinear:return z;case this.InterpolantFactoryMethodSmooth:return Ae;case this.InterpolantFactoryMethodBezier:return B}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Ye(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(Ye(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){Ye(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){Ye(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&He(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){Ye(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Ae,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};is.prototype.ValueTypeName=``,is.prototype.TimeBufferType=Float32Array,is.prototype.ValueBufferType=Float32Array,is.prototype.DefaultInterpolation=z;var as=class extends is{constructor(e,t,n){super(e,t,n)}};as.prototype.ValueTypeName=`bool`,as.prototype.ValueBufferType=Array,as.prototype.DefaultInterpolation=ke,as.prototype.InterpolantFactoryMethodLinear=void 0,as.prototype.InterpolantFactoryMethodSmooth=void 0;var os=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};os.prototype.ValueTypeName=`color`;var ss=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};ss.prototype.ValueTypeName=`number`;var cs=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Dt.slerpFlat(i,0,a,c-o,a,c,s);return i}},ls=class extends is{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new cs(this.times,this.values,this.getValueSize(),e)}};ls.prototype.ValueTypeName=`quaternion`,ls.prototype.InterpolantFactoryMethodSmooth=void 0;var us=class extends is{constructor(e,t,n){super(e,t,n)}};us.prototype.ValueTypeName=`string`,us.prototype.ValueBufferType=Array,us.prototype.DefaultInterpolation=ke,us.prototype.InterpolantFactoryMethodLinear=void 0,us.prototype.InterpolantFactoryMethodSmooth=void 0;var ds=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};ds.prototype.ValueTypeName=`vector`;var fs=class extends Tn{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new G(e),this.intensity=t}dispose(){this.dispatchEvent({type:`dispose`})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},ps=class extends fs{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new G(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},ms=new Zt,hs=new W,gs=new W,_s=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new U(512,512),this.mapType=l,this.map=null,this.mapPass=null,this.matrix=new Zt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ii,this._frameExtents=new U(1,1),this._viewportCount=1,this._viewports=[new Kt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;hs.setFromMatrixPosition(e.matrixWorld),t.position.copy(hs),gs.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(gs),t.updateMatrixWorld(),ms.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ms,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ms)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},vs=new W,ys=new Dt,bs=new W,xs=class extends Tn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Zt,this.projectionMatrix=new Zt,this.projectionMatrixInverse=new Zt,this.coordinateSystem=Be,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(vs,ys,bs),bs.x===1&&bs.y===1&&bs.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(vs,ys,bs.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(vs,ys,bs),bs.x===1&&bs.y===1&&bs.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(vs,ys,bs.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ss=new W,Cs=new U,ws=new U,Ts=class extends xs{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=rt*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(nt*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return rt*2*Math.atan(Math.tan(nt*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z),Ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z)}getViewSize(e,t){return this.getViewBounds(e,Cs,ws),t.subVectors(ws,Cs)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(nt*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Es=class extends _s{constructor(){super(new Ts(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=rt*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Ds=class extends fs{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.target=new Tn,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Es}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Os=class extends _s{constructor(){super(new Ts(90,1,.5,500)),this.isPointLightShadow=!0}},ks=class extends fs{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Os}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},As=class extends xs{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},js=class extends _s{constructor(){super(new As(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ms=class extends fs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.target=new Tn,this.shadow=new js}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Ns=-90,Ps=1,Fs=class extends Tn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ts(Ns,Ps,e,t);r.layers=this.layers,this.add(r);let i=new Ts(Ns,Ps,e,t);i.layers=this.layers,this.add(i);let a=new Ts(Ns,Ps,e,t);a.layers=this.layers,this.add(a);let o=new Ts(Ns,Ps,e,t);o.layers=this.layers,this.add(o);let s=new Ts(Ns,Ps,e,t);s.layers=this.layers,this.add(s);let c=new Ts(Ns,Ps,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Is=class extends Ts{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Ls=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Rs.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Rs(){this._document.hidden===!1&&this.reset()}var zs=`\\[\\]\\.:\\/`,Bs=RegExp(`[\\[\\]\\.:\\/]`,`g`),Vs=`[^\\[\\]\\.:\\/]`,Hs=`[^`+zs.replace(`\\.`,``)+`]`,Us=`((?:WC+[\\/:])*)`.replace(`WC`,Vs),Ws=`(WCOD+)?`.replace(`WCOD`,Hs),Gs=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Vs),Ks=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Vs),qs=RegExp(`^`+Us+Ws+Gs+Ks+`$`),Js=[`material`,`materials`,`bones`,`map`],Ys=class{constructor(e,t,n){let r=n||Xs.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Xs=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Bs,``)}static parseTrackName(e){let t=qs.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);Js.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Je(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){Ye(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){Ye(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){Ye(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){Ye(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){Ye(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){Ye(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){Ye(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;Ye(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){Ye(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){Ye(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Xs.Composite=Ys,Xs.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Xs.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Xs.prototype.GetterByBindingType=[Xs.prototype._getValue_direct,Xs.prototype._getValue_array,Xs.prototype._getValue_arrayElement,Xs.prototype._getValue_toArray],Xs.prototype.SetterByBindingTypeAndVersioning=[[Xs.prototype._setValue_direct,Xs.prototype._setValue_direct_setNeedsUpdate,Xs.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_array,Xs.prototype._setValue_array_setNeedsUpdate,Xs.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_arrayElement,Xs.prototype._setValue_arrayElement_setNeedsUpdate,Xs.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_fromArray,Xs.prototype._setValue_fromArray_setNeedsUpdate,Xs.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Zs=new Zt,Qs=class{constructor(e,t,n=0,r=1/0){this.ray=new ii(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new ln,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Ye(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return Zs.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Zs),this}intersectObject(e,t=!0,n=[]){return ec(e,this,n,t),n.sort($s),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)ec(e[r],this,n,t);return n.sort($s),n}};function $s(e,t){return e.distance-t.distance}function ec(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)ec(r[e],t,n,!0)}}(class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}});function tc(e,t,n,r){let i=nc(r);switch(n){case S:return e*t;case D:return e*t/i.components*i.byteLength;case O:return e*t/i.components*i.byteLength;case k:return e*t*2/i.components*i.byteLength;case ee:return e*t*2/i.components*i.byteLength;case C:return e*t*3/i.components*i.byteLength;case w:return e*t*4/i.components*i.byteLength;case A:return e*t*4/i.components*i.byteLength;case j:case M:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case te:case N:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ne:case I:return Math.max(e,16)*Math.max(t,8)/4;case P:case F:return Math.max(e,8)*Math.max(t,8)/2;case L:case re:case ae:case R:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ie:case oe:case se:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ce:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case le:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case ue:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case de:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case fe:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case pe:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case me:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case he:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case ge:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case _e:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case ve:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case ye:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case be:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case xe:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Se:case Ce:case we:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Te:case Ee:return Math.ceil(e/4)*Math.ceil(t/4)*8;case De:case Oe:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function nc(e){switch(e){case l:case u:return{byteLength:1,components:1};case f:case d:case g:return{byteLength:2,components:1};case _:case v:return{byteLength:2,components:4};case m:case p:case h:return{byteLength:4,components:1};case b:case x:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`185`}})),typeof window<`u`&&(window.__THREE__?Je(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`185`);function rc(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function ic(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var ac={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},X={common:{diffuse:{value:new G(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new At},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new At}},envmap:{envMap:{value:null},envMapRotation:{value:new At},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new At}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new At}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new At},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new At},normalScale:{value:new U(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new At},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new At}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new At}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new At}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new G(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new W},probesMax:{value:new W},probesResolution:{value:new W}},points:{diffuse:{value:new G(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0},uvTransform:{value:new At}},sprite:{diffuse:{value:new G(16777215)},opacity:{value:1},center:{value:new U(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new At},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0}}},oc={basic:{uniforms:Vo([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.fog]),vertexShader:ac.meshbasic_vert,fragmentShader:ac.meshbasic_frag},lambert:{uniforms:Vo([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.fog,X.lights,{emissive:{value:new G(0)},envMapIntensity:{value:1}}]),vertexShader:ac.meshlambert_vert,fragmentShader:ac.meshlambert_frag},phong:{uniforms:Vo([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.fog,X.lights,{emissive:{value:new G(0)},specular:{value:new G(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ac.meshphong_vert,fragmentShader:ac.meshphong_frag},standard:{uniforms:Vo([X.common,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.roughnessmap,X.metalnessmap,X.fog,X.lights,{emissive:{value:new G(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ac.meshphysical_vert,fragmentShader:ac.meshphysical_frag},toon:{uniforms:Vo([X.common,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.gradientmap,X.fog,X.lights,{emissive:{value:new G(0)}}]),vertexShader:ac.meshtoon_vert,fragmentShader:ac.meshtoon_frag},matcap:{uniforms:Vo([X.common,X.bumpmap,X.normalmap,X.displacementmap,X.fog,{matcap:{value:null}}]),vertexShader:ac.meshmatcap_vert,fragmentShader:ac.meshmatcap_frag},points:{uniforms:Vo([X.points,X.fog]),vertexShader:ac.points_vert,fragmentShader:ac.points_frag},dashed:{uniforms:Vo([X.common,X.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ac.linedashed_vert,fragmentShader:ac.linedashed_frag},depth:{uniforms:Vo([X.common,X.displacementmap]),vertexShader:ac.depth_vert,fragmentShader:ac.depth_frag},normal:{uniforms:Vo([X.common,X.bumpmap,X.normalmap,X.displacementmap,{opacity:{value:1}}]),vertexShader:ac.meshnormal_vert,fragmentShader:ac.meshnormal_frag},sprite:{uniforms:Vo([X.sprite,X.fog]),vertexShader:ac.sprite_vert,fragmentShader:ac.sprite_frag},background:{uniforms:{uvTransform:{value:new At},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ac.background_vert,fragmentShader:ac.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new At}},vertexShader:ac.backgroundCube_vert,fragmentShader:ac.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ac.cube_vert,fragmentShader:ac.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ac.equirect_vert,fragmentShader:ac.equirect_frag},distance:{uniforms:Vo([X.common,X.displacementmap,{referencePosition:{value:new W},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ac.distance_vert,fragmentShader:ac.distance_frag},shadow:{uniforms:Vo([X.lights,X.fog,{color:{value:new G(0)},opacity:{value:1}}]),vertexShader:ac.shadow_vert,fragmentShader:ac.shadow_frag}};oc.physical={uniforms:Vo([oc.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new At},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new At},clearcoatNormalScale:{value:new U(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new At},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new At},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new At},sheen:{value:0},sheenColor:{value:new G(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new At},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new At},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new At},transmissionSamplerSize:{value:new U},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new At},attenuationDistance:{value:0},attenuationColor:{value:new G(0)},specularColor:{value:new G(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new At},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new At},anisotropyVector:{value:new U},anisotropyMap:{value:null},anisotropyMapTransform:{value:new At}}]),vertexShader:ac.meshphysical_vert,fragmentShader:ac.meshphysical_frag};var sc={r:0,b:0,g:0},cc=new Zt,lc=new At;lc.set(-1,0,0,0,1,0,0,0,1);function uc(e,t,n,r,i,a){let o=new G(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new K(new q(1,1,1),new Jo({name:`BackgroundCubeMaterial`,uniforms:Bo(oc.backgroundCube.uniforms),vertexShader:oc.backgroundCube.vertexShader,fragmentShader:oc.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(cc.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(lc),l.material.toneMapped=Ft.getTransfer(i.colorSpace)!==Ie,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new K(new Po(2,2),new Jo({name:`BackgroundMaterial`,uniforms:Bo(oc.background.uniforms),vertexShader:oc.background.vertexShader,fragmentShader:oc.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Ft.getTransfer(i.colorSpace)!==Ie,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(sc,Wo(e)),n.buffers.color.setClear(sc.r,sc.g,sc.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function dc(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function fc(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function pc(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(Je(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&Je(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function mc(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Mi,s=new At,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var hc=4,gc=[.125,.215,.35,.446,.526,.582],_c=20,vc=256,yc=new As,bc=new G,xc=null,Sc=0,Cc=0,wc=!1,Tc=new W,Ec=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Tc}=i;xc=this._renderer.getRenderTarget(),Sc=this._renderer.getActiveCubeFace(),Cc=this._renderer.getActiveMipmapLevel(),wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Nc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Mc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(xc,Sc,Cc),this._renderer.xr.enabled=wc,e.scissorTest=!1,kc(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),xc=this._renderer.getRenderTarget(),Sc=this._renderer.getActiveCubeFace(),Cc=this._renderer.getActiveMipmapLevel(),wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:o,minFilter:o,generateMipmaps:!1,type:g,format:w,colorSpace:Pe,depthBuffer:!1},r=Oc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Oc(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Dc(r)),this._blurMaterial=jc(r,e,t),this._ggxMaterial=Ac(r,e,t)}return r}_compileMaterial(e){let t=new K(new kr,e);this._renderer.compile(t,yc)}_sceneToCubeUV(e,t,n,r,i){let a=new Ts(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(bc),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new K(new q,new ai({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(bc),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;kc(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Nc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Mc());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;kc(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,yc)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-hc?n-d+hc:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,kc(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,yc),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,kc(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,yc)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&Ye(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):_c;m>_c&&Je(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${_c}`);let h=[],g=0;for(let e=0;e<_c;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];kc(t,3*v*(r>_-hc?r-_+hc:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,yc)}};function Dc(e){let t=[],n=[],r=[],i=e,a=e-hc+1+gc.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-hc?s=gc[o-e+hc-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new kr;h.setAttribute(`position`,new mr(f,3)),h.setAttribute(`uv`,new mr(p,2)),h.setAttribute(`faceIndex`,new mr(m,1)),r.push(new K(h,null)),i>hc&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function Oc(e,t,n){let r=new Jt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function kc(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Ac(e,t,n){return new Jo({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:vc,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Pc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function jc(e,t,n){let r=new Float32Array(_c),i=new W(0,1,0);return new Jo({name:`SphericalGaussianBlur`,defines:{n:_c,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Mc(){return new Jo({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Nc(){return new Jo({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Pc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Fc=class extends Jt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new ra(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new q(5,5,5),i=new Jo({name:`CubemapFromEquirect`,uniforms:Bo(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new K(r,i),s=t.minFilter;return t.minFilter===1008&&(t.minFilter=o),new Fs(1,10,this).update(e,a),t.minFilter=s,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Ic(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Fc(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Ec(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Ec(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Lc(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Xe(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Rc(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?gr:hr)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function zc(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Bc(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:Ye(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Vc(e,t,n){let r=new WeakMap,i=new Kt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let g=new Float32Array(p*m*4*u),_=new Yt(g,p,m,u);_.type=h,_.needsUpdate=!0;let v=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+s+0]=i.x,g[d+s+1]=i.y,g[d+s+2]=i.z,g[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+s+4]=i.x,g[d+s+5]=i.y,g[d+s+6]=i.z,g[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),g[d+s+8]=i.x,g[d+s+9]=i.y,g[d+s+10]=i.z,g[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:_,size:new U(p,m)},r.set(o,d);function y(){_.dispose(),r.delete(o),o.removeEventListener(`dispose`,y)}o.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Hc(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Uc={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Wc(e,t,n,r,i,a){let o=new Jt(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new aa(t,n):void 0}),s=new Jt(t,n,{type:g,depthBuffer:!1,stencilBuffer:!1}),c=new kr;c.setAttribute(`position`,new _r([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new _r([0,2,0,0,2,0],2));let l=new Yo({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new K(c,l),d=new As(-1,1,1,-1,0,1),f=null,p=null,m=!1,h,_=null,v=[],y=!1;this.setSize=function(e,t){o.setSize(e,t),s.setSize(e,t);for(let n=0;n<v.length;n++){let r=v[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){v=e,y=v.length>0&&v[0].isRenderPass===!0;let t=o.width,n=o.height;for(let e=0;e<v.length;e++){let r=v[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(m||e.toneMapping===0&&v.length===0)return!1;if(_=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return y===!1&&e.setRenderTarget(o),h=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return y},this.end=function(e,t){e.toneMapping=h,m=!0;let n=o,r=s;for(let i=0;i<v.length;i++){let a=v[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(f!==e.outputColorSpace||p!==e.toneMapping){f=e.outputColorSpace,p=e.toneMapping,l.defines={},Ft.getTransfer(f)===`srgb`&&(l.defines.SRGB_TRANSFER=``);let t=Uc[p];t&&(l.defines[t]=``),l.needsUpdate=!0}l.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(_),e.render(u,d),_=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),s.dispose(),c.dispose(),l.dispose()}}var Gc=new Gt,Kc=new aa(1,1),qc=new Yt,Jc=new Xt,Yc=new ra,Xc=[],Zc=[],Qc=new Float32Array(16),$c=new Float32Array(9),el=new Float32Array(4);function tl(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Xc[i];if(a===void 0&&(a=new Float32Array(i),Xc[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function nl(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function rl(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function il(e,t){let n=Zc[t];n===void 0&&(n=new Int32Array(t),Zc[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function al(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function ol(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(nl(n,t))return;e.uniform2fv(this.addr,t),rl(n,t)}}function sl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(nl(n,t))return;e.uniform3fv(this.addr,t),rl(n,t)}}function cl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(nl(n,t))return;e.uniform4fv(this.addr,t),rl(n,t)}}function ll(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(nl(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),rl(n,t)}else{if(nl(n,r))return;el.set(r),e.uniformMatrix2fv(this.addr,!1,el),rl(n,r)}}function ul(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(nl(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),rl(n,t)}else{if(nl(n,r))return;$c.set(r),e.uniformMatrix3fv(this.addr,!1,$c),rl(n,r)}}function dl(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(nl(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),rl(n,t)}else{if(nl(n,r))return;Qc.set(r),e.uniformMatrix4fv(this.addr,!1,Qc),rl(n,r)}}function fl(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function pl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(nl(n,t))return;e.uniform2iv(this.addr,t),rl(n,t)}}function ml(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(nl(n,t))return;e.uniform3iv(this.addr,t),rl(n,t)}}function hl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(nl(n,t))return;e.uniform4iv(this.addr,t),rl(n,t)}}function gl(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function _l(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(nl(n,t))return;e.uniform2uiv(this.addr,t),rl(n,t)}}function vl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(nl(n,t))return;e.uniform3uiv(this.addr,t),rl(n,t)}}function yl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(nl(n,t))return;e.uniform4uiv(this.addr,t),rl(n,t)}}function bl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Kc.compareFunction=n.isReversedDepthBuffer()?518:515,a=Kc):a=Gc,n.setTexture2D(t||a,i)}function xl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Jc,i)}function Sl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Yc,i)}function Cl(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||qc,i)}function wl(e){switch(e){case 5126:return al;case 35664:return ol;case 35665:return sl;case 35666:return cl;case 35674:return ll;case 35675:return ul;case 35676:return dl;case 5124:case 35670:return fl;case 35667:case 35671:return pl;case 35668:case 35672:return ml;case 35669:case 35673:return hl;case 5125:return gl;case 36294:return _l;case 36295:return vl;case 36296:return yl;case 35678:case 36198:case 36298:case 36306:case 35682:return bl;case 35679:case 36299:case 36307:return xl;case 35680:case 36300:case 36308:case 36293:return Sl;case 36289:case 36303:case 36311:case 36292:return Cl}}function Tl(e,t){e.uniform1fv(this.addr,t)}function El(e,t){let n=tl(t,this.size,2);e.uniform2fv(this.addr,n)}function Dl(e,t){let n=tl(t,this.size,3);e.uniform3fv(this.addr,n)}function Ol(e,t){let n=tl(t,this.size,4);e.uniform4fv(this.addr,n)}function kl(e,t){let n=tl(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Al(e,t){let n=tl(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function jl(e,t){let n=tl(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Ml(e,t){e.uniform1iv(this.addr,t)}function Nl(e,t){e.uniform2iv(this.addr,t)}function Pl(e,t){e.uniform3iv(this.addr,t)}function Fl(e,t){e.uniform4iv(this.addr,t)}function Il(e,t){e.uniform1uiv(this.addr,t)}function Ll(e,t){e.uniform2uiv(this.addr,t)}function Rl(e,t){e.uniform3uiv(this.addr,t)}function zl(e,t){e.uniform4uiv(this.addr,t)}function Bl(e,t,n){let r=this.cache,i=t.length,a=il(n,i);nl(r,a)||(e.uniform1iv(this.addr,a),rl(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Kc:Gc;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Vl(e,t,n){let r=this.cache,i=t.length,a=il(n,i);nl(r,a)||(e.uniform1iv(this.addr,a),rl(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Jc,a[e])}function Hl(e,t,n){let r=this.cache,i=t.length,a=il(n,i);nl(r,a)||(e.uniform1iv(this.addr,a),rl(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Yc,a[e])}function Ul(e,t,n){let r=this.cache,i=t.length,a=il(n,i);nl(r,a)||(e.uniform1iv(this.addr,a),rl(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||qc,a[e])}function Wl(e){switch(e){case 5126:return Tl;case 35664:return El;case 35665:return Dl;case 35666:return Ol;case 35674:return kl;case 35675:return Al;case 35676:return jl;case 5124:case 35670:return Ml;case 35667:case 35671:return Nl;case 35668:case 35672:return Pl;case 35669:case 35673:return Fl;case 5125:return Il;case 36294:return Ll;case 36295:return Rl;case 36296:return zl;case 35678:case 36198:case 36298:case 36306:case 35682:return Bl;case 35679:case 36299:case 36307:return Vl;case 35680:case 36300:case 36308:case 36293:return Hl;case 36289:case 36303:case 36311:case 36292:return Ul}}var Gl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=wl(t.type)}},Kl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Wl(t.type)}},ql=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Jl=/(\w+)(\])?(\[|\.)?/g;function Yl(e,t){e.seq.push(t),e.map[t.id]=t}function Xl(e,t,n){let r=e.name,i=r.length;for(Jl.lastIndex=0;;){let a=Jl.exec(r),o=Jl.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Yl(n,l===void 0?new Gl(s,e,t):new Kl(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new ql(s),Yl(n,e)),n=e}}}var Zl=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Xl(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Ql(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var $l=37297,eu=0;function tu(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var nu=new At;function ru(e){Ft._getMatrix(nu,Ft.workingColorSpace,e);let t=`mat3( ${nu.elements.map(e=>e.toFixed(4))} )`;switch(Ft.getTransfer(e)){case Fe:return[t,`LinearTransferOETF`];case Ie:return[t,`sRGBTransferOETF`];default:return Je(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function iu(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+tu(e.getShaderSource(t),r)}return i}function au(e,t){let n=ru(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ou={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function su(e,t){let n=ou[t];return n===void 0?(Je(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var cu=new W;function lu(){return Ft.getLuminanceCoefficients(cu),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${cu.x.toFixed(4)}, ${cu.y.toFixed(4)}, ${cu.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function uu(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(pu).join(`
`)}function du(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function fu(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function pu(e){return e!==``}function mu(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function hu(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var gu=/^[ \t]*#include +<([\w\d./]+)>/gm;function _u(e){return e.replace(gu,yu)}var vu=new Map;function yu(e,t){let n=ac[t];if(n===void 0){let e=vu.get(t);if(e!==void 0)n=ac[e],Je(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return _u(n)}var bu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function xu(e){return e.replace(bu,Su)}function Su(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Cu(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var wu={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Tu(e){return wu[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Eu={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Du(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Eu[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Ou={302:`ENVMAP_MODE_REFRACTION`};function ku(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Ou[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Au={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function ju(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Au[e.combine]||`ENVMAP_BLENDING_NONE`}function Mu(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Nu(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Tu(n),l=Du(n),u=ku(n),d=ju(n),f=Mu(n),p=uu(n),m=du(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(pu).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(pu).join(`
`),_.length>0&&(_+=`
`)):(g=[Cu(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(pu).join(`
`),_=[Cu(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:ac.tonemapping_pars_fragment,n.toneMapping===0?``:su(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,ac.colorspace_pars_fragment,au(`linearToOutputTexel`,n.outputColorSpace),lu(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(pu).join(`
`)),o=_u(o),o=mu(o,n),o=hu(o,n),s=_u(s),s=mu(s,n),s=hu(s,n),o=xu(o),s=xu(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Ql(i,i.VERTEX_SHADER,y),S=Ql(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=iu(i,x,`vertex`),n=iu(i,S,`fragment`);Ye(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):Je(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Zl(i,h),T=fu(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,$l)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=eu++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Pu=0,Fu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Iu(e),t.set(e,n)),n}},Iu=class{constructor(e){this.id=Pu++,this.code=e,this.usedTimes=0}};function Lu(e){return e===1030||e===37490||e===36285}function Ru(e,t,n,r,i,a){let o=new ln,s=new Fu,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&Je(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,ee;if(C){let e=oc[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,ee=t.id}let A=e.getRenderTarget(),j=e.state.buffers.depth.getReversed(),M=h.isInstancedMesh===!0,te=h.isBatchedMesh===!0,N=!!i.map,P=!!i.matcap,ne=!!x,F=!!i.aoMap,I=!!i.lightMap,L=!!i.bumpMap&&i.wireframe===!1,re=!!i.normalMap,ie=!!i.displacementMap,ae=!!i.emissiveMap,R=!!i.metalnessMap,oe=!!i.roughnessMap,se=i.anisotropy>0,ce=i.clearcoat>0,le=i.dispersion>0,ue=i.iridescence>0,de=i.sheen>0,fe=i.transmission>0,pe=se&&!!i.anisotropyMap,me=ce&&!!i.clearcoatMap,he=ce&&!!i.clearcoatNormalMap,ge=ce&&!!i.clearcoatRoughnessMap,_e=ue&&!!i.iridescenceMap,ve=ue&&!!i.iridescenceThicknessMap,ye=de&&!!i.sheenColorMap,be=de&&!!i.sheenRoughnessMap,xe=!!i.specularMap,Se=!!i.specularColorMap,Ce=!!i.specularIntensityMap,we=fe&&!!i.transmissionMap,Te=fe&&!!i.thicknessMap,Ee=!!i.gradientMap,De=!!i.alphaMap,Oe=i.alphaTest>0,ke=!!i.alphaHash,z=!!i.extensions,Ae=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(Ae=e.toneMapping);let B={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:ee,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:te,batchingColor:te&&h._colorsTexture!==null,instancing:M,instancingColor:M&&h.instanceColor!==null,instancingMorph:M&&h.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:Ft.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:N,matcap:P,envMap:ne,envMapMode:ne&&x.mapping,envMapCubeUVHeight:S,aoMap:F,lightMap:I,bumpMap:L,normalMap:re,displacementMap:ie,emissiveMap:ae,normalMapObjectSpace:re&&i.normalMapType===1,normalMapTangentSpace:re&&i.normalMapType===0,packedNormalMap:re&&i.normalMapType===0&&Lu(i.normalMap.format),metalnessMap:R,roughnessMap:oe,anisotropy:se,anisotropyMap:pe,clearcoat:ce,clearcoatMap:me,clearcoatNormalMap:he,clearcoatRoughnessMap:ge,dispersion:le,iridescence:ue,iridescenceMap:_e,iridescenceThicknessMap:ve,sheen:de,sheenColorMap:ye,sheenRoughnessMap:be,specularMap:xe,specularColorMap:Se,specularIntensityMap:Ce,transmission:fe,transmissionMap:we,thicknessMap:Te,gradientMap:Ee,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:De,alphaTest:Oe,alphaHash:ke,combine:i.combine,mapUv:N&&m(i.map.channel),aoMapUv:F&&m(i.aoMap.channel),lightMapUv:I&&m(i.lightMap.channel),bumpMapUv:L&&m(i.bumpMap.channel),normalMapUv:re&&m(i.normalMap.channel),displacementMapUv:ie&&m(i.displacementMap.channel),emissiveMapUv:ae&&m(i.emissiveMap.channel),metalnessMapUv:R&&m(i.metalnessMap.channel),roughnessMapUv:oe&&m(i.roughnessMap.channel),anisotropyMapUv:pe&&m(i.anisotropyMap.channel),clearcoatMapUv:me&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:he&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:_e&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:ye&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:be&&m(i.sheenRoughnessMap.channel),specularMapUv:xe&&m(i.specularMap.channel),specularColorMapUv:Se&&m(i.specularColorMap.channel),specularIntensityMapUv:Ce&&m(i.specularIntensityMap.channel),transmissionMapUv:we&&m(i.transmissionMap.channel),thicknessMapUv:Te&&m(i.thicknessMap.channel),alphaMapUv:De&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(re||se),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(N||De),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&re===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:j,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ae,decodeVideoTexture:N&&i.map.isVideoTexture===!0&&Ft.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ae&&i.emissiveMap.isVideoTexture===!0&&Ft.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:z&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(z&&i.extensions.multiDraw===!0||te)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return B.vertexUv1s=c.has(1),B.vertexUv2s=c.has(2),B.vertexUv3s=c.has(3),c.clear(),B}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=oc[t];n=Go.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Nu(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function zu(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Bu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Vu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Hu(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||Bu),r.length>1&&r.sort(t||Vu),i.length>1&&i.sort(t||Vu),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Uu(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Hu,e.set(t,[i])):n>=r.length?(i=new Hu,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Wu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new W,color:new G};break;case`SpotLight`:n={position:new W,direction:new W,color:new G,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new W,color:new G,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new W,skyColor:new G,groundColor:new G};break;case`RectAreaLight`:n={color:new G,position:new W,halfWidth:new W,halfHeight:new W}}return e[t.id]=n,n}}}function Gu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Ku=0;function qu(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Ju(e){let t=new Wu,n=Gu(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new W);let i=new W,a=new Zt,o=new Zt;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(qu);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=X.LTC_FLOAT_1,r.rectAreaLTC2=X.LTC_FLOAT_2):(r.rectAreaLTC1=X.LTC_HALF_1,r.rectAreaLTC2=X.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=Ku++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Yu(e){let t=new Ju(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Xu(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Yu(e),t.set(n,[a])):r>=i.length?(a=new Yu(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Zu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Qu=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,$u=[new W(1,0,0),new W(-1,0,0),new W(0,1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1)],ed=[new W(0,-1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1),new W(0,-1,0),new W(0,-1,0)],td=new Zt,nd=new W,rd=new W;function id(e,t,n){let i=new Ii,a=new U,s=new U,c=new Kt,l=new Xo,u=new Zo,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},_=new Jo({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new U},radius:{value:4}},vertexShader:Zu,fragmentShader:Qu}),v=_.clone();v.defines.HORIZONTAL_PASS=1;let y=new kr;y.setAttribute(`position`,new mr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new K(y,_),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,l){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(Je(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),_=e.state;_.setBlending(0),_.buffers.depth.getReversed()===!0?_.buffers.color.setClear(0,0,0,0):_.buffers.color.setClear(1,1,1,1),_.buffers.depth.setTest(!0),_.setScissorTest(!1);let v=S!==this.type;v&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,d=t.length;u<d;u++){let d=t[u],p=d.shadow;if(p===void 0){Je(`WebGLShadowMap:`,d,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;a.copy(p.mapSize);let y=p.getFrameExtents();a.multiply(y),s.copy(p.mapSize),(a.x>f||a.y>f)&&(a.x>f&&(s.x=Math.floor(f/y.x),a.x=s.x*y.x,p.mapSize.x=s.x),a.y>f&&(s.y=Math.floor(f/y.y),a.y=s.y*y.y,p.mapSize.y=s.y));let b=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=b,p.map===null||v===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(d.isPointLight){Je(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new Jt(a.x,a.y,{format:k,type:g,minFilter:o,magFilter:o,generateMipmaps:!1}),p.map.texture.name=d.name+`.shadowMap`,p.map.depthTexture=new aa(a.x,a.y,h),p.map.depthTexture.name=d.name+`.shadowMapDepth`,p.map.depthTexture.format=T,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r}else d.isPointLight?(p.map=new Fc(a.x),p.map.depthTexture=new oa(a.x,m)):(p.map=new Jt(a.x,a.y),p.map.depthTexture=new aa(a.x,a.y,m)),p.map.depthTexture.name=d.name+`.shadowMap`,p.map.depthTexture.format=T,this.type===1?(p.map.depthTexture.compareFunction=b?518:515,p.map.depthTexture.minFilter=o,p.map.depthTexture.magFilter=o):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r);p.camera.updateProjectionMatrix()}let x=p.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<x;t++){if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),_.viewport(c)}if(d.isPointLight){let e=p.camera,n=p.matrix,r=d.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),nd.setFromMatrixPosition(d.matrixWorld),e.position.copy(nd),rd.copy(e.position),rd.add($u[t]),e.up.copy(ed[t]),e.lookAt(rd),e.updateMatrixWorld(),n.makeTranslation(-nd.x,-nd.y,-nd.z),td.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(td,e.coordinateSystem,e.reversedDepth)}else p.updateMatrices(d);i=p.getFrustum(),E(n,l,p.camera,d,this.type)}p.isPointLightShadow!==!0&&this.type===3&&C(p,l),p.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(u,d,p)};function C(n,r){let i=t.update(b);_.defines.VSM_SAMPLES!==n.blurSamples&&(_.defines.VSM_SAMPLES=n.blurSamples,v.defines.VSM_SAMPLES=n.blurSamples,_.needsUpdate=!0,v.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new Jt(a.x,a.y,{format:k,type:g})),_.uniforms.shadow_pass.value=n.map.depthTexture,_.uniforms.resolution.value=n.mapSize,_.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,_,b,null),v.uniforms.shadow_pass.value=n.mapPass.texture,v.uniforms.resolution.value=n.mapSize,v.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,v,b,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,D)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function E(n,r,a,o,s){if(n.visible===!1)return;if(n.layers.test(r.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||i.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),c=n.material;if(Array.isArray(c)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,s);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(c.visible){let t=w(n,c,o,s);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)E(c[e],r,a,o,s)}function D(e){e.target.removeEventListener(`dispose`,D);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function ad(e,t){function n(){let t=!1,n=new Kt,r=null,i=new Kt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?R(e.DEPTH_TEST):oe(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=Qe[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?R(e.STENCIL_TEST):oe(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,ee=null,A=null,j=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),M=!1,te=0,N=e.getParameter(e.VERSION);N.indexOf(`WebGL`)===-1?N.indexOf(`OpenGL ES`)!==-1&&(te=parseFloat(/^OpenGL ES (\d)/.exec(N)[1]),M=te>=2):(te=parseFloat(/^WebGL (\d)/.exec(N)[1]),M=te>=1);let P=null,ne={},F=e.getParameter(e.SCISSOR_BOX),I=e.getParameter(e.VIEWPORT),L=new Kt().fromArray(F),re=new Kt().fromArray(I);function ie(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ae={};ae[e.TEXTURE_2D]=ie(e.TEXTURE_2D,e.TEXTURE_2D,1),ae[e.TEXTURE_CUBE_MAP]=ie(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ae[e.TEXTURE_2D_ARRAY]=ie(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ae[e.TEXTURE_3D]=ie(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),R(e.DEPTH_TEST),o.setFunc(3),me(!1),he(1),R(e.CULL_FACE),fe(0);function R(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function oe(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function se(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ce(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function le(t){return h!==t&&(e.useProgram(t),h=t,!0)}let ue={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ue[103]=e.MIN,ue[104]=e.MAX;let de={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function fe(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(oe(e.BLEND),g=!1);return}if(g===!1&&(R(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:Ye(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:Ye(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:Ye(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:Ye(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(ue[n],ue[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(de[r],de[i],de[o],de[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function pe(t,n){t.side===2?oe(e.CULL_FACE):R(e.CULL_FACE);let r=t.side===1;n&&(r=!r),me(r),t.blending===1&&t.transparent===!1?fe(0):fe(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),_e(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?R(e.SAMPLE_ALPHA_TO_COVERAGE):oe(e.SAMPLE_ALPHA_TO_COVERAGE)}function me(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function he(t){t===0?oe(e.CULL_FACE):(R(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ge(t){t!==k&&(M&&e.lineWidth(t),k=t)}function _e(t,n,r){t?(R(e.POLYGON_OFFSET_FILL),(ee!==n||A!==r)&&(ee=n,A=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):oe(e.POLYGON_OFFSET_FILL)}function ve(t){t?R(e.SCISSOR_TEST):oe(e.SCISSOR_TEST)}function ye(t){t===void 0&&(t=e.TEXTURE0+j-1),P!==t&&(e.activeTexture(t),P=t)}function be(t,n,r){r===void 0&&(r=P===null?e.TEXTURE0+j-1:P);let i=ne[r];i===void 0&&(i={type:void 0,texture:void 0},ne[r]=i),(i.type!==t||i.texture!==n)&&(P!==r&&(e.activeTexture(r),P=r),e.bindTexture(t,n||ae[t]),i.type=t,i.texture=n)}function xe(){let t=ne[P];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Se(){try{e.compressedTexImage2D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function Ce(){try{e.compressedTexImage3D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function we(){try{e.texSubImage2D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function Te(){try{e.texSubImage3D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function Ee(){try{e.compressedTexSubImage2D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function De(){try{e.compressedTexSubImage3D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function Oe(){try{e.texStorage2D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function ke(){try{e.texStorage3D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function z(){try{e.texImage2D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function Ae(){try{e.texImage3D(...arguments)}catch(e){Ye(`WebGLState:`,e)}}function B(t){return d[t]===void 0?e.getParameter(t):d[t]}function V(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function H(t){L.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),L.copy(t))}function je(t){re.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),re.copy(t))}function Me(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Ne(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Pe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},P=null,ne={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,ee=null,A=null,L.set(0,0,e.canvas.width,e.canvas.height),re.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:R,disable:oe,bindFramebuffer:se,drawBuffers:ce,useProgram:le,setBlending:fe,setMaterial:pe,setFlipSided:me,setCullFace:he,setLineWidth:ge,setPolygonOffset:_e,setScissorTest:ve,activeTexture:ye,bindTexture:be,unbindTexture:xe,compressedTexImage2D:Se,compressedTexImage3D:Ce,texImage2D:z,texImage3D:Ae,pixelStorei:V,getParameter:B,updateUBOMapping:Me,uniformBlockBinding:Ne,texStorage2D:Oe,texStorage3D:ke,texSubImage2D:we,texSubImage3D:Te,compressedTexSubImage2D:Ee,compressedTexSubImage3D:De,scissor:H,viewport:je,reset:Pe}}function od(l,u,d,f,p,m,h){let g=u.has(`WEBGL_multisampled_render_to_texture`)?u.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new U,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):Ue(`canvas`)}function T(e,t,n){let r=1,i=B(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),Je(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&Je(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function D(e){return e.generateMipmaps}function O(e){l.generateMipmap(e)}function k(e){return e.isWebGLCubeRenderTarget?l.TEXTURE_CUBE_MAP:e.isWebGL3DRenderTarget?l.TEXTURE_3D:e.isWebGLArrayRenderTarget||e.isCompressedArrayTexture?l.TEXTURE_2D_ARRAY:l.TEXTURE_2D}function ee(e,t,n,r,i,a=!1){if(e!==null){if(l[e]!==void 0)return l[e];Je(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+e+`'`)}let o;r&&(o=u.get(`EXT_texture_norm16`),o||Je(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let s=t;if(t===l.RED&&(n===l.FLOAT&&(s=l.R32F),n===l.HALF_FLOAT&&(s=l.R16F),n===l.UNSIGNED_BYTE&&(s=l.R8),n===l.UNSIGNED_SHORT&&o&&(s=o.R16_EXT),n===l.SHORT&&o&&(s=o.R16_SNORM_EXT)),t===l.RED_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.R8UI),n===l.UNSIGNED_SHORT&&(s=l.R16UI),n===l.UNSIGNED_INT&&(s=l.R32UI),n===l.BYTE&&(s=l.R8I),n===l.SHORT&&(s=l.R16I),n===l.INT&&(s=l.R32I)),t===l.RG&&(n===l.FLOAT&&(s=l.RG32F),n===l.HALF_FLOAT&&(s=l.RG16F),n===l.UNSIGNED_BYTE&&(s=l.RG8),n===l.UNSIGNED_SHORT&&o&&(s=o.RG16_EXT),n===l.SHORT&&o&&(s=o.RG16_SNORM_EXT)),t===l.RG_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RG8UI),n===l.UNSIGNED_SHORT&&(s=l.RG16UI),n===l.UNSIGNED_INT&&(s=l.RG32UI),n===l.BYTE&&(s=l.RG8I),n===l.SHORT&&(s=l.RG16I),n===l.INT&&(s=l.RG32I)),t===l.RGB_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGB8UI),n===l.UNSIGNED_SHORT&&(s=l.RGB16UI),n===l.UNSIGNED_INT&&(s=l.RGB32UI),n===l.BYTE&&(s=l.RGB8I),n===l.SHORT&&(s=l.RGB16I),n===l.INT&&(s=l.RGB32I)),t===l.RGBA_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGBA8UI),n===l.UNSIGNED_SHORT&&(s=l.RGBA16UI),n===l.UNSIGNED_INT&&(s=l.RGBA32UI),n===l.BYTE&&(s=l.RGBA8I),n===l.SHORT&&(s=l.RGBA16I),n===l.INT&&(s=l.RGBA32I)),t===l.RGB&&(n===l.UNSIGNED_SHORT&&o&&(s=o.RGB16_EXT),n===l.SHORT&&o&&(s=o.RGB16_SNORM_EXT),n===l.UNSIGNED_INT_5_9_9_9_REV&&(s=l.RGB9_E5),n===l.UNSIGNED_INT_10F_11F_11F_REV&&(s=l.R11F_G11F_B10F)),t===l.RGBA){let e=a?Fe:Ft.getTransfer(i);n===l.FLOAT&&(s=l.RGBA32F),n===l.HALF_FLOAT&&(s=l.RGBA16F),n===l.UNSIGNED_BYTE&&(s=e===`srgb`?l.SRGB8_ALPHA8:l.RGBA8),n===l.UNSIGNED_SHORT&&o&&(s=o.RGBA16_EXT),n===l.SHORT&&o&&(s=o.RGBA16_SNORM_EXT),n===l.UNSIGNED_SHORT_4_4_4_4&&(s=l.RGBA4),n===l.UNSIGNED_SHORT_5_5_5_1&&(s=l.RGB5_A1)}return(s===l.R16F||s===l.R32F||s===l.RG16F||s===l.RG32F||s===l.RGBA16F||s===l.RGBA32F)&&u.get(`EXT_color_buffer_float`),s}function A(e,t){let n;return e?t===null||t===1014||t===1020?n=l.DEPTH24_STENCIL8:t===1015?n=l.DEPTH32F_STENCIL8:t===1012&&(n=l.DEPTH24_STENCIL8,Je(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):t===null||t===1014||t===1020?n=l.DEPTH_COMPONENT24:t===1015?n=l.DEPTH_COMPONENT32F:t===1012&&(n=l.DEPTH_COMPONENT16),n}function j(e,t){return D(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function M(e){let t=e.target;t.removeEventListener(`dispose`,M),N(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function te(e){let t=e.target;t.removeEventListener(`dispose`,te),ne(t)}function N(e){let t=f.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=S.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&P(e),Object.keys(r).length===0&&S.delete(n)}f.remove(e)}function P(e){let t=f.get(e);l.deleteTexture(t.__webglTexture);let n=e.source,r=S.get(n);delete r[t.__cacheKey],h.memory.textures--}function ne(e){let t=f.get(e);if(e.depthTexture&&(e.depthTexture.dispose(),f.remove(e.depthTexture)),e.isWebGLCubeRenderTarget)for(let e=0;e<6;e++){if(Array.isArray(t.__webglFramebuffer[e]))for(let n=0;n<t.__webglFramebuffer[e].length;n++)l.deleteFramebuffer(t.__webglFramebuffer[e][n]);else l.deleteFramebuffer(t.__webglFramebuffer[e]);t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer[e])}else{if(Array.isArray(t.__webglFramebuffer))for(let e=0;e<t.__webglFramebuffer.length;e++)l.deleteFramebuffer(t.__webglFramebuffer[e]);else l.deleteFramebuffer(t.__webglFramebuffer);if(t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer),t.__webglMultisampledFramebuffer&&l.deleteFramebuffer(t.__webglMultisampledFramebuffer),t.__webglColorRenderbuffer)for(let e=0;e<t.__webglColorRenderbuffer.length;e++)t.__webglColorRenderbuffer[e]&&l.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);t.__webglDepthRenderbuffer&&l.deleteRenderbuffer(t.__webglDepthRenderbuffer)}let n=e.textures;for(let e=0,t=n.length;e<t;e++){let t=f.get(n[e]);t.__webglTexture&&(l.deleteTexture(t.__webglTexture),h.memory.textures--),f.remove(n[e])}f.remove(e)}let F=0;function I(){F=0}function L(){return F}function re(e){F=e}function ie(){let e=F;return e>=p.maxTextures&&Je(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+p.maxTextures),F+=1,e}function ae(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function R(e,t){let n=f.get(e);if(e.isVideoTexture&&z(e),e.isRenderTargetTexture===!1&&e.isExternalTexture!==!0&&e.version>0&&n.__version!==e.version){let r=e.image;if(r===null)Je(`WebGLRenderer: Texture marked for update but no image data found.`);else if(r.complete===!1)Je(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ge(n,e,t);return}}else e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null);d.bindTexture(l.TEXTURE_2D,n.__webglTexture,l.TEXTURE0+t)}function oe(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){ge(n,e,t);return}e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null),d.bindTexture(l.TEXTURE_2D_ARRAY,n.__webglTexture,l.TEXTURE0+t)}function se(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){ge(n,e,t);return}d.bindTexture(l.TEXTURE_3D,n.__webglTexture,l.TEXTURE0+t)}function ce(e,t){let n=f.get(e);if(e.isCubeDepthTexture!==!0&&e.version>0&&n.__version!==e.version){_e(n,e,t);return}d.bindTexture(l.TEXTURE_CUBE_MAP,n.__webglTexture,l.TEXTURE0+t)}let le={[e]:l.REPEAT,[t]:l.CLAMP_TO_EDGE,[n]:l.MIRRORED_REPEAT},ue={[r]:l.NEAREST,[i]:l.NEAREST_MIPMAP_NEAREST,[a]:l.NEAREST_MIPMAP_LINEAR,[o]:l.LINEAR,[s]:l.LINEAR_MIPMAP_NEAREST,[c]:l.LINEAR_MIPMAP_LINEAR},de={512:l.NEVER,519:l.ALWAYS,513:l.LESS,515:l.LEQUAL,514:l.EQUAL,518:l.GEQUAL,516:l.GREATER,517:l.NOTEQUAL};function fe(e,t){if(t.type===1015&&u.has(`OES_texture_float_linear`)===!1&&(t.magFilter===1006||t.magFilter===1007||t.magFilter===1005||t.magFilter===1008||t.minFilter===1006||t.minFilter===1007||t.minFilter===1005||t.minFilter===1008)&&Je(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),l.texParameteri(e,l.TEXTURE_WRAP_S,le[t.wrapS]),l.texParameteri(e,l.TEXTURE_WRAP_T,le[t.wrapT]),(e===l.TEXTURE_3D||e===l.TEXTURE_2D_ARRAY)&&l.texParameteri(e,l.TEXTURE_WRAP_R,le[t.wrapR]),l.texParameteri(e,l.TEXTURE_MAG_FILTER,ue[t.magFilter]),l.texParameteri(e,l.TEXTURE_MIN_FILTER,ue[t.minFilter]),t.compareFunction&&(l.texParameteri(e,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(e,l.TEXTURE_COMPARE_FUNC,de[t.compareFunction])),u.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&u.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1||f.get(t).__currentAnisotropy){let n=u.get(`EXT_texture_filter_anisotropic`);l.texParameterf(e,n.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,p.getMaxAnisotropy())),f.get(t).__currentAnisotropy=t.anisotropy}}}function pe(e,t){let n=!1;e.__webglInit===void 0&&(e.__webglInit=!0,t.addEventListener(`dispose`,M));let r=t.source,i=S.get(r);i===void 0&&(i={},S.set(r,i));let a=ae(t);if(a!==e.__cacheKey){i[a]===void 0&&(i[a]={texture:l.createTexture(),usedTimes:0},h.memory.textures++,n=!0),i[a].usedTimes++;let r=i[e.__cacheKey];r!==void 0&&(i[e.__cacheKey].usedTimes--,r.usedTimes===0&&P(t)),e.__cacheKey=a,e.__webglTexture=i[a].texture}return n}function me(e,t,n){return Math.floor(Math.floor(e/n)/t)}function he(e,t,n,r){let i=e.updateRanges;if(i.length===0)d.texSubImage2D(l.TEXTURE_2D,0,0,0,t.width,t.height,n,r,t.data);else{i.sort((e,t)=>e.start-t.start);let a=0;for(let e=1;e<i.length;e++){let n=i[a],r=i[e],o=n.start+n.count,s=me(r.start,t.width,4),c=me(n.start,t.width,4);r.start<=o+1&&s===c&&me(r.start+r.count-1,t.width,4)===s?n.count=Math.max(n.count,r.start+r.count-n.start):(++a,i[a]=r)}i.length=a+1;let o=d.getParameter(l.UNPACK_ROW_LENGTH),s=d.getParameter(l.UNPACK_SKIP_PIXELS),c=d.getParameter(l.UNPACK_SKIP_ROWS);d.pixelStorei(l.UNPACK_ROW_LENGTH,t.width);for(let e=0,a=i.length;e<a;e++){let a=i[e],o=Math.floor(a.start/4),s=Math.ceil(a.count/4),c=o%t.width,u=Math.floor(o/t.width),f=s;d.pixelStorei(l.UNPACK_SKIP_PIXELS,c),d.pixelStorei(l.UNPACK_SKIP_ROWS,u),d.texSubImage2D(l.TEXTURE_2D,0,c,u,f,1,n,r,t.data)}e.clearUpdateRanges(),d.pixelStorei(l.UNPACK_ROW_LENGTH,o),d.pixelStorei(l.UNPACK_SKIP_PIXELS,s),d.pixelStorei(l.UNPACK_SKIP_ROWS,c)}}function ge(e,t,n){let r=l.TEXTURE_2D;(t.isDataArrayTexture||t.isCompressedArrayTexture)&&(r=l.TEXTURE_2D_ARRAY),t.isData3DTexture&&(r=l.TEXTURE_3D);let i=pe(e,t),a=t.source;d.bindTexture(r,e.__webglTexture,l.TEXTURE0+n);let o=f.get(a);if(a.version!==o.__version||i===!0){if(d.activeTexture(l.TEXTURE0+n),!(typeof ImageBitmap<`u`&&t.image instanceof ImageBitmap)){let e=Ft.getPrimaries(Ft.workingColorSpace),n=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),r=t.colorSpace===``||e===n?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,r)}d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment);let e=T(t.image,!1,p.maxTextureSize);e=Ae(t,e);let s=m.convert(t.format,t.colorSpace),c=m.convert(t.type),u=ee(t.internalFormat,s,c,t.normalized,t.colorSpace,t.isVideoTexture);fe(r,t);let f,h=t.mipmaps,g=t.isVideoTexture!==!0,_=o.__version===void 0||i===!0,v=a.dataReady,y=j(t,e);if(t.isDepthTexture)u=A(t.format===E,t.type),_&&(g?d.texStorage2D(l.TEXTURE_2D,1,u,e.width,e.height):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,null));else if(t.isDataTexture){if(h.length>0){g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data);t.generateMipmaps=!1}else g?(_&&d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height),v&&he(t,e,s,c)):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,e.data)}else if(t.isCompressedTexture){if(t.isCompressedArrayTexture){g&&_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,h[0].width,h[0].height,e.depth);for(let n=0,r=h.length;n<r;n++)if(f=h[n],t.format!==1023){if(s!==null){if(g){if(v){if(t.layerUpdates.size>0){let e=tc(f.width,f.height,t.format,t.type);for(let r of t.layerUpdates){let t=f.data.subarray(r*e/f.data.BYTES_PER_ELEMENT,(r+1)*e/f.data.BYTES_PER_ELEMENT);d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,r,f.width,f.height,1,s,t)}t.clearLayerUpdates()}else d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,f.data)}}else d.compressedTexImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,f.data,0,0)}else Je(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else g?v&&d.texSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,c,f.data):d.texImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,s,c,f.data)}else{g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,n=h.length;e<n;e++)f=h[e],t.format===1023?g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data):s===null?Je(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&d.compressedTexSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,f.data):d.compressedTexImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,f.data)}}else if(t.isDataArrayTexture){if(g){if(_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,e.width,e.height,e.depth),v){if(t.layerUpdates.size>0){let n=tc(e.width,e.height,t.format,t.type);for(let r of t.layerUpdates){let t=e.data.subarray(r*n/e.data.BYTES_PER_ELEMENT,(r+1)*n/e.data.BYTES_PER_ELEMENT);d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,r,e.width,e.height,1,s,c,t)}t.clearLayerUpdates()}else d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)}}else d.texImage3D(l.TEXTURE_2D_ARRAY,0,u,e.width,e.height,e.depth,0,s,c,e.data)}else if(t.isData3DTexture)g?(_&&d.texStorage3D(l.TEXTURE_3D,y,u,e.width,e.height,e.depth),v&&d.texSubImage3D(l.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)):d.texImage3D(l.TEXTURE_3D,0,u,e.width,e.height,e.depth,0,s,c,e.data);else if(t.isFramebufferTexture){if(_){if(g)d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height);else{let t=e.width,n=e.height;for(let e=0;e<y;e++)d.texImage2D(l.TEXTURE_2D,e,u,t,n,0,s,c,null),t>>=1,n>>=1}}}else if(t.isHTMLTexture){if(`texElementImage2D`in l){let n=l.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),e.parentNode!==n){n.appendChild(e),b.add(t),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(l.texElementImage2D.length===3)l.texElementImage2D(l.TEXTURE_2D,l.RGBA8,e);else{let t=l.RGBA,n=l.RGBA,r=l.UNSIGNED_BYTE;l.texElementImage2D(l.TEXTURE_2D,0,t,n,r,e)}l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let e=B(h[0]);d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height)}for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,s,c,f):d.texImage2D(l.TEXTURE_2D,e,u,s,c,f);t.generateMipmaps=!1}else if(g){if(_){let t=B(e);d.texStorage2D(l.TEXTURE_2D,y,u,t.width,t.height)}v&&d.texSubImage2D(l.TEXTURE_2D,0,0,0,s,c,e)}else d.texImage2D(l.TEXTURE_2D,0,u,s,c,e);D(t)&&O(r),o.__version=a.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function _e(e,t,n){if(t.image.length!==6)return;let r=pe(e,t),i=t.source;d.bindTexture(l.TEXTURE_CUBE_MAP,e.__webglTexture,l.TEXTURE0+n);let a=f.get(i);if(i.version!==a.__version||r===!0){d.activeTexture(l.TEXTURE0+n);let e=Ft.getPrimaries(Ft.workingColorSpace),o=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),s=t.colorSpace===``||e===o?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,s);let c=t.isCompressedTexture||t.image[0].isCompressedTexture,u=t.image[0]&&t.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!c&&!u?f[e]=T(t.image[e],!0,p.maxCubemapSize):f[e]=u?t.image[e].image:t.image[e],f[e]=Ae(t,f[e]);let h=f[0],g=m.convert(t.format,t.colorSpace),_=m.convert(t.type),v=ee(t.internalFormat,g,_,t.normalized,t.colorSpace),y=t.isVideoTexture!==!0,b=a.__version===void 0||r===!0,x=i.dataReady,S=j(t,h);fe(l.TEXTURE_CUBE_MAP,t);let C;if(c){y&&b&&d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let e=0;e<6;e++){C=f[e].mipmaps;for(let n=0;n<C.length;n++){let r=C[n];t.format===1023?y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,_,r.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,g,_,r.data):g===null?Je(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&d.compressedTexSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,r.data):d.compressedTexImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,r.data)}}}else{if(C=t.mipmaps,y&&b){C.length>0&&S++;let e=B(f[0]);d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,e.width,e.height)}for(let e=0;e<6;e++)if(u){y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,f[e].width,f[e].height,g,_,f[e].data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,f[e].width,f[e].height,0,g,_,f[e].data);for(let t=0;t<C.length;t++){let n=C[t].image[e].image;y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,n.width,n.height,g,_,n.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,n.width,n.height,0,g,_,n.data)}}else{y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,g,_,f[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,g,_,f[e]);for(let t=0;t<C.length;t++){let n=C[t];y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,g,_,n.image[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,g,_,n.image[e])}}}D(t)&&O(l.TEXTURE_CUBE_MAP),a.__version=i.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function ve(e,t,n,r,i,a){let o=m.convert(n.format,n.colorSpace),s=m.convert(n.type),c=ee(n.internalFormat,o,s,n.normalized,n.colorSpace),u=f.get(t),p=f.get(n);if(p.__renderTarget=t,!u.__hasExternalTextures){let e=Math.max(1,t.width>>a),n=Math.max(1,t.height>>a);i===l.TEXTURE_3D||i===l.TEXTURE_2D_ARRAY?d.texImage3D(i,a,c,e,n,t.depth,0,o,s,null):d.texImage2D(i,a,c,e,n,0,o,s,null)}d.bindFramebuffer(l.FRAMEBUFFER,e),ke(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,r,i,p.__webglTexture,0,Oe(t)):(i===l.TEXTURE_2D||i>=l.TEXTURE_CUBE_MAP_POSITIVE_X&&i<=l.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&l.framebufferTexture2D(l.FRAMEBUFFER,r,i,p.__webglTexture,a),d.bindFramebuffer(l.FRAMEBUFFER,null)}function ye(e,t,n){if(l.bindRenderbuffer(l.RENDERBUFFER,e),t.depthBuffer){let r=t.depthTexture,i=r&&r.isDepthTexture?r.type:null,a=A(t.stencilBuffer,i),o=t.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;ke(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Oe(t),a,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Oe(t),a,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,a,t.width,t.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,o,l.RENDERBUFFER,e)}else{let e=t.textures;for(let r=0;r<e.length;r++){let i=e[r],a=m.convert(i.format,i.colorSpace),o=m.convert(i.type),s=ee(i.internalFormat,a,o,i.normalized,i.colorSpace);ke(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Oe(t),s,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Oe(t),s,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,s,t.width,t.height)}}l.bindRenderbuffer(l.RENDERBUFFER,null)}function be(e,t,n){let r=t.isWebGLCubeRenderTarget===!0;if(d.bindFramebuffer(l.FRAMEBUFFER,e),!(t.depthTexture&&t.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let i=f.get(t.depthTexture);if(i.__renderTarget=t,(!i.__webglTexture||t.depthTexture.image.width!==t.width||t.depthTexture.image.height!==t.height)&&(t.depthTexture.image.width=t.width,t.depthTexture.image.height=t.height,t.depthTexture.needsUpdate=!0),r){if(i.__webglInit===void 0&&(i.__webglInit=!0,t.depthTexture.addEventListener(`dispose`,M)),i.__webglTexture===void 0){i.__webglTexture=l.createTexture(),d.bindTexture(l.TEXTURE_CUBE_MAP,i.__webglTexture),fe(l.TEXTURE_CUBE_MAP,t.depthTexture);let e=m.convert(t.depthTexture.format),n=m.convert(t.depthTexture.type),r;t.depthTexture.format===1026?r=l.DEPTH_COMPONENT24:t.depthTexture.format===1027&&(r=l.DEPTH24_STENCIL8);for(let i=0;i<6;i++)l.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,r,t.width,t.height,0,e,n,null)}}else R(t.depthTexture,0);let a=i.__webglTexture,o=Oe(t),s=r?l.TEXTURE_CUBE_MAP_POSITIVE_X+n:l.TEXTURE_2D,c=t.depthTexture.format===1027?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;if(t.depthTexture.format===1026)ke(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else if(t.depthTexture.format===1027)ke(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function xe(e){let t=f.get(e),n=e.isWebGLCubeRenderTarget===!0;if(t.__boundDepthTexture!==e.depthTexture){let n=e.depthTexture;if(t.__depthDisposeCallback&&t.__depthDisposeCallback(),n){let e=()=>{delete t.__boundDepthTexture,delete t.__depthDisposeCallback,n.removeEventListener(`dispose`,e)};n.addEventListener(`dispose`,e),t.__depthDisposeCallback=e}t.__boundDepthTexture=n}if(e.depthTexture&&!t.__autoAllocateDepthBuffer){if(n)for(let n=0;n<6;n++)be(t.__webglFramebuffer[n],e,n);else{let n=e.texture.mipmaps;n&&n.length>0?be(t.__webglFramebuffer[0],e,0):be(t.__webglFramebuffer,e,0)}}else if(n){t.__webglDepthbuffer=[];for(let n=0;n<6;n++)if(d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[n]),t.__webglDepthbuffer[n]===void 0)t.__webglDepthbuffer[n]=l.createRenderbuffer(),ye(t.__webglDepthbuffer[n],e,!1);else{let r=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,i=t.__webglDepthbuffer[n];l.bindRenderbuffer(l.RENDERBUFFER,i),l.framebufferRenderbuffer(l.FRAMEBUFFER,r,l.RENDERBUFFER,i)}}else{let n=e.texture.mipmaps;if(n&&n.length>0?d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[0]):d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer),t.__webglDepthbuffer===void 0)t.__webglDepthbuffer=l.createRenderbuffer(),ye(t.__webglDepthbuffer,e,!1);else{let n=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,r=t.__webglDepthbuffer;l.bindRenderbuffer(l.RENDERBUFFER,r),l.framebufferRenderbuffer(l.FRAMEBUFFER,n,l.RENDERBUFFER,r)}}d.bindFramebuffer(l.FRAMEBUFFER,null)}function Se(e,t,n){let r=f.get(e);t!==void 0&&ve(r.__webglFramebuffer,e,e.texture,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,0),n!==void 0&&xe(e)}function Ce(e){let t=e.texture,n=f.get(e),r=f.get(t);e.addEventListener(`dispose`,te);let i=e.textures,a=e.isWebGLCubeRenderTarget===!0,o=i.length>1;if(o||(r.__webglTexture===void 0&&(r.__webglTexture=l.createTexture()),r.__version=t.version,h.memory.textures++),a){n.__webglFramebuffer=[];for(let e=0;e<6;e++)if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer[e]=[];for(let r=0;r<t.mipmaps.length;r++)n.__webglFramebuffer[e][r]=l.createFramebuffer()}else n.__webglFramebuffer[e]=l.createFramebuffer()}else{if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer=[];for(let e=0;e<t.mipmaps.length;e++)n.__webglFramebuffer[e]=l.createFramebuffer()}else n.__webglFramebuffer=l.createFramebuffer();if(o)for(let e=0,t=i.length;e<t;e++){let t=f.get(i[e]);t.__webglTexture===void 0&&(t.__webglTexture=l.createTexture(),h.memory.textures++)}if(e.samples>0&&ke(e)===!1){n.__webglMultisampledFramebuffer=l.createFramebuffer(),n.__webglColorRenderbuffer=[],d.bindFramebuffer(l.FRAMEBUFFER,n.__webglMultisampledFramebuffer);for(let t=0;t<i.length;t++){let r=i[t];n.__webglColorRenderbuffer[t]=l.createRenderbuffer(),l.bindRenderbuffer(l.RENDERBUFFER,n.__webglColorRenderbuffer[t]);let a=m.convert(r.format,r.colorSpace),o=m.convert(r.type),s=ee(r.internalFormat,a,o,r.normalized,r.colorSpace,e.isXRRenderTarget===!0),c=Oe(e);l.renderbufferStorageMultisample(l.RENDERBUFFER,c,s,e.width,e.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+t,l.RENDERBUFFER,n.__webglColorRenderbuffer[t])}l.bindRenderbuffer(l.RENDERBUFFER,null),e.depthBuffer&&(n.__webglDepthRenderbuffer=l.createRenderbuffer(),ye(n.__webglDepthRenderbuffer,e,!0)),d.bindFramebuffer(l.FRAMEBUFFER,null)}}if(a){d.bindTexture(l.TEXTURE_CUBE_MAP,r.__webglTexture),fe(l.TEXTURE_CUBE_MAP,t);for(let r=0;r<6;r++)if(t.mipmaps&&t.mipmaps.length>0)for(let i=0;i<t.mipmaps.length;i++)ve(n.__webglFramebuffer[r][i],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,i);else ve(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,0);D(t)&&O(l.TEXTURE_CUBE_MAP),d.unbindTexture()}else if(o){for(let t=0,r=i.length;t<r;t++){let r=i[t],a=f.get(r),o=l.TEXTURE_2D;(e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(o=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(o,a.__webglTexture),fe(o,r),ve(n.__webglFramebuffer,e,r,l.COLOR_ATTACHMENT0+t,o,0),D(r)&&O(o)}d.unbindTexture()}else{let i=l.TEXTURE_2D;if((e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(i=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(i,r.__webglTexture),fe(i,t),t.mipmaps&&t.mipmaps.length>0)for(let r=0;r<t.mipmaps.length;r++)ve(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,i,r);else ve(n.__webglFramebuffer,e,t,l.COLOR_ATTACHMENT0,i,0);D(t)&&O(i),d.unbindTexture()}e.depthBuffer&&xe(e)}function we(e){let t=e.textures;for(let n=0,r=t.length;n<r;n++){let r=t[n];if(D(r)){let t=k(e),n=f.get(r).__webglTexture;d.bindTexture(t,n),O(t),d.unbindTexture()}}}let Te=[],Ee=[];function De(e){if(e.samples>0){if(ke(e)===!1){let t=e.textures,n=e.width,r=e.height,i=l.COLOR_BUFFER_BIT,a=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,o=f.get(e),s=t.length>1;if(s)for(let e=0;e<t.length;e++)d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,null),d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,null,0);d.bindFramebuffer(l.READ_FRAMEBUFFER,o.__webglMultisampledFramebuffer);let c=e.texture.mipmaps;c&&c.length>0?d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer[0]):d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer);for(let c=0;c<t.length;c++){if(e.resolveDepthBuffer&&(e.depthBuffer&&(i|=l.DEPTH_BUFFER_BIT),e.stencilBuffer&&e.resolveStencilBuffer&&(i|=l.STENCIL_BUFFER_BIT)),s){l.framebufferRenderbuffer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.RENDERBUFFER,o.__webglColorRenderbuffer[c]);let e=f.get(t[c]).__webglTexture;l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,e,0)}l.blitFramebuffer(0,0,n,r,0,0,n,r,i,l.NEAREST),_===!0&&(Te.length=0,Ee.length=0,Te.push(l.COLOR_ATTACHMENT0+c),e.depthBuffer&&e.resolveDepthBuffer===!1&&(Te.push(a),Ee.push(a),l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,Ee)),l.invalidateFramebuffer(l.READ_FRAMEBUFFER,Te))}if(d.bindFramebuffer(l.READ_FRAMEBUFFER,null),d.bindFramebuffer(l.DRAW_FRAMEBUFFER,null),s)for(let e=0;e<t.length;e++){d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,o.__webglColorRenderbuffer[e]);let n=f.get(t[e]).__webglTexture;d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,n,0)}d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglMultisampledFramebuffer)}else if(e.depthBuffer&&e.resolveDepthBuffer===!1&&_){let t=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,[t])}}}function Oe(e){return Math.min(p.maxSamples,e.samples)}function ke(e){let t=f.get(e);return e.samples>0&&u.has(`WEBGL_multisampled_render_to_texture`)===!0&&t.__useRenderToTexture!==!1}function z(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function Ae(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Ft.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&Je(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):Ye(`WebGLTextures: Unsupported texture color space:`,n)),t}function B(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=ie,this.resetTextureUnits=I,this.getTextureUnits=L,this.setTextureUnits=re,this.setTexture2D=R,this.setTexture2DArray=oe,this.setTexture3D=se,this.setTextureCube=ce,this.rebindTextures=Se,this.setupRenderTarget=Ce,this.updateRenderTargetMipmap=we,this.updateMultisampleRenderTarget=De,this.setupDepthRenderbuffer=xe,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=ke,this.isReversedDepthBuffer=function(){return d.buffers.depth.getReversed()}}function sd(e,t){function n(n,r=``){let i,a=Ft.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var cd=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ld=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,ud=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new sa(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Jo({vertexShader:cd,fragmentShader:ld,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new K(new Po(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},dd=class extends $e{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,u=null,d=null,f=null,p=null,h=null,g=typeof XRWebGLBinding<`u`,_=new ud,v={},b=t.getContextAttributes(),x=null,S=null,C=[],D=[],O=new U,k=null,ee=new Ts;ee.viewport=new Kt;let A=new Ts;A.viewport=new Kt;let j=[ee,A],M=new Is,te=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getGripSpace()},this.getHand=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getHandSpace()};function P(e){let t=D.indexOf(e.inputSource);if(t===-1)return;let n=C[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ne(){r.removeEventListener(`select`,P),r.removeEventListener(`selectstart`,P),r.removeEventListener(`selectend`,P),r.removeEventListener(`squeeze`,P),r.removeEventListener(`squeezestart`,P),r.removeEventListener(`squeezeend`,P),r.removeEventListener(`end`,ne),r.removeEventListener(`inputsourceschange`,F);for(let e=0;e<C.length;e++){let t=D[e];t!==null&&(D[e]=null,C[e].disconnect(t))}te=null,N=null,_.reset();for(let e in v)delete v[e];e.setRenderTarget(x),p=null,f=null,d=null,r=null,S=null,se.stop(),n.isPresenting=!1,e.setPixelRatio(k),e.setSize(O.width,O.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&Je(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&Je(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return f===null?p:f},this.getBinding=function(){return d===null&&g&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return h},this.getSession=function(){return r},this.setSession=async function(u){if(r=u,r!==null){if(x=e.getRenderTarget(),r.addEventListener(`select`,P),r.addEventListener(`selectstart`,P),r.addEventListener(`selectend`,P),r.addEventListener(`squeeze`,P),r.addEventListener(`squeezestart`,P),r.addEventListener(`squeezeend`,P),r.addEventListener(`end`,ne),r.addEventListener(`inputsourceschange`,F),b.xrCompatible!==!0&&await t.makeXRCompatible(),k=e.getPixelRatio(),e.getSize(O),g&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;b.depth&&(o=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=b.stencil?E:T,a=b.stencil?y:m);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};d=this.getBinding(),f=d.createProjectionLayer(s),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),S=new Jt(f.textureWidth,f.textureHeight,{format:w,type:l,depthTexture:new aa(f.textureWidth,f.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{let n={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:i};p=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new Jt(p.framebufferWidth,p.framebufferHeight,{format:w,type:l,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),se.setContext(r),se.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function F(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=D.indexOf(n);r>=0&&(D[r]=null,C[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=D.indexOf(n);if(r===-1){for(let e=0;e<C.length;e++)if(e>=D.length){D.push(n),r=e;break}else if(D[e]===null){D[e]=n,r=e;break}if(r===-1)break}let i=C[r];i&&i.connect(n)}}let I=new W,L=new W;function re(e,t,n){I.setFromMatrixPosition(t.matrixWorld),L.setFromMatrixPosition(n.matrixWorld);let r=I.distanceTo(L),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function ie(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;_.texture!==null&&(_.depthNear>0&&(t=_.depthNear),_.depthFar>0&&(n=_.depthFar)),M.near=A.near=ee.near=t,M.far=A.far=ee.far=n,(te!==M.near||N!==M.far)&&(r.updateRenderState({depthNear:M.near,depthFar:M.far}),te=M.near,N=M.far),M.layers.mask=e.layers.mask|6,ee.layers.mask=M.layers.mask&-5,A.layers.mask=M.layers.mask&-3;let i=e.parent,a=M.cameras;ie(M,i);for(let e=0;e<a.length;e++)ie(a[e],i);a.length===2?re(M,ee,A):M.projectionMatrix.copy(ee.projectionMatrix),ae(e,M,i)};function ae(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=rt*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(f!==null||p!==null)return s},this.setFoveation=function(e){s=e,f!==null&&(f.fixedFoveation=e),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=e)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(M)},this.getCameraTexture=function(e){return v[e]};let R=null;function oe(t,i){if(u=i.getViewerPose(c||a),h=i,u!==null){let t=u.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let i=!1;t.length!==M.cameras.length&&(M.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(p!==null)a=p.getViewport(r);else{let t=d.getViewSubImage(f,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(S,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(S))}let o=j[n];o===void 0&&(o=new Ts,o.layers.enable(n),o.viewport=new Kt,j[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(M.matrix.copy(o.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),i===!0&&M.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&g){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&_.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&g){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=v[n];e||(e=new sa,v[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<C.length;e++){let t=D[e],n=C[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}R&&R(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),h=null}let se=new rc;se.setAnimationLoop(oe),this.setAnimationLoop=function(e){R=e},this.dispose=function(){}}},fd=new Zt,pd=new At;pd.set(-1,0,0,0,1,0,0,0,1);function md(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Wo(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(fd.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(pd),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function hd(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return Ye(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?Je(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):Je(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var gd=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),_d=null;function vd(){return _d===null&&(_d=new yi(gd,16,16,k,g),_d.name=`DFG_LUT`,_d.minFilter=o,_d.magFilter=o,_d.wrapS=t,_d.wrapT=t,_d.generateMipmaps=!1,_d.needsUpdate=!0),_d}var yd=class{constructor(e={}){let{canvas:t=We(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:u=!1,powerPreference:d=`default`,failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:h=!1,outputBufferType:b=l}=e;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);x=n.getContextAttributes().alpha}else x=a;let S=b,C=new Set([A,ee,O]),w=new Set([l,m,f,y,_,v]),T=new Uint32Array(4),E=new Int32Array(4),D=new W,k=null,j=null,M=[],te=[],N=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,ne=!1,F=null,I=null,L=null,re=null;this._outputColorSpace=Ne;let ie=0,ae=0,R=null,oe=-1,se=null,ce=new Kt,le=new Kt,ue=null,de=new G(0),fe=0,pe=t.width,me=t.height,he=1,ge=null,_e=null,ve=new Kt(0,0,pe,me),ye=new Kt(0,0,pe,me),be=!1,xe=new Ii,Se=!1,Ce=!1,we=new Zt,Te=new W,Ee=new Kt,De={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Oe=!1;function ke(){return R===null?he:1}let z=n;function Ae(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:u,powerPreference:d,failIfMajorPerformanceCaveat:p};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,ot,!1),t.addEventListener(`webglcontextrestored`,st,!1),t.addEventListener(`webglcontextcreationerror`,ct,!1),z===null){let t=`webgl2`;if(z=Ae(t,e),z===null)throw Ae(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw Ye(`WebGLRenderer: `+e.message),e}let B,V,H,je,Me,Pe,Fe,Ie,Le,Re,ze,Ve,He,Ue,Ge,qe,Xe,Qe,$e,et,tt,nt,rt;function it(){B=new Lc(z),B.init(),tt=new sd(z,B),V=new pc(z,B,e,tt),H=new ad(z,B),V.reversedDepthBuffer&&h&&H.buffers.depth.setReversed(!0),I=z.createFramebuffer(),L=z.createFramebuffer(),re=z.createFramebuffer(),je=new Bc(z),Me=new zu,Pe=new od(z,B,H,Me,V,tt,je),Fe=new Ic(P),Ie=new ic(z),nt=new dc(z,Ie),Le=new Rc(z,Ie,je,nt),Re=new Hc(z,Le,Ie,nt,je),Qe=new Vc(z,V,Pe),Ge=new mc(Me),ze=new Ru(P,Fe,B,V,nt,Ge),Ve=new md(P,Me),He=new Uu,Ue=new Xu(B),Xe=new uc(P,Fe,H,Re,x,s),qe=new id(P,Re,V),rt=new hd(z,je,V,H),$e=new fc(z,B,je),et=new zc(z,B,je),je.programs=ze.programs,P.capabilities=V,P.extensions=B,P.properties=Me,P.renderLists=He,P.shadowMap=qe,P.state=H,P.info=je}it(),S!==1009&&(N=new Wc(S,t.width,t.height,o,r,i));let at=new dd(P,z);this.xr=at,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){let e=B.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=B.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return he},this.setPixelRatio=function(e){e!==void 0&&(he=e,this.setSize(pe,me,!1))},this.getSize=function(e){return e.set(pe,me)},this.setSize=function(e,n,r=!0){if(at.isPresenting){Je(`WebGLRenderer: Can't change size while VR device is presenting.`);return}pe=e,me=n,t.width=Math.floor(e*he),t.height=Math.floor(n*he),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),N!==null&&N.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(pe*he,me*he).floor()},this.setDrawingBufferSize=function(e,n,r){pe=e,me=n,he=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(S===1009){Ye(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){Je(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}N.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ce)},this.getViewport=function(e){return e.copy(ve)},this.setViewport=function(e,t,n,r){e.isVector4?ve.set(e.x,e.y,e.z,e.w):ve.set(e,t,n,r),H.viewport(ce.copy(ve).multiplyScalar(he).round())},this.getScissor=function(e){return e.copy(ye)},this.setScissor=function(e,t,n,r){e.isVector4?ye.set(e.x,e.y,e.z,e.w):ye.set(e,t,n,r),H.scissor(le.copy(ye).multiplyScalar(he).round())},this.getScissorTest=function(){return be},this.setScissorTest=function(e){H.setScissorTest(be=e)},this.setOpaqueSort=function(e){ge=e},this.setTransparentSort=function(e){_e=e},this.getClearColor=function(e){return e.copy(Xe.getClearColor())},this.setClearColor=function(){Xe.setClearColor(...arguments)},this.getClearAlpha=function(){return Xe.getClearAlpha()},this.setClearAlpha=function(){Xe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(R!==null){let t=R.texture.format;e=C.has(t)}if(e){let e=R.texture.type,t=w.has(e),n=Xe.getClearColor(),r=Xe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(T[0]=i,T[1]=a,T[2]=o,T[3]=r,z.clearBufferuiv(z.COLOR,0,T)):(E[0]=i,E[1]=a,E[2]=o,E[3]=r,z.clearBufferiv(z.COLOR,0,E))}else r|=z.COLOR_BUFFER_BIT}t&&(r|=z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&z.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),F=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,ot,!1),t.removeEventListener(`webglcontextrestored`,st,!1),t.removeEventListener(`webglcontextcreationerror`,ct,!1),Xe.dispose(),He.dispose(),Ue.dispose(),Me.dispose(),Fe.dispose(),Re.dispose(),nt.dispose(),rt.dispose(),ze.dispose(),at.dispose(),at.removeEventListener(`sessionstart`,ht),at.removeEventListener(`sessionend`,gt),_t.stop()};function ot(e){e.preventDefault(),Ke(`WebGLRenderer: Context Lost.`),ne=!0}function st(){Ke(`WebGLRenderer: Context Restored.`),ne=!1;let e=je.autoReset,t=qe.enabled,n=qe.autoUpdate,r=qe.needsUpdate,i=qe.type;it(),je.autoReset=e,qe.enabled=t,qe.autoUpdate=n,qe.needsUpdate=r,qe.type=i}function ct(e){Ye(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function lt(e){let t=e.target;t.removeEventListener(`dispose`,lt),ut(t)}function ut(e){dt(e),Me.remove(e)}function dt(e){let t=Me.get(e).programs;t!==void 0&&(t.forEach(function(e){ze.releaseProgram(e)}),e.isShaderMaterial&&ze.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=De);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=U(e,t,n,r,i);H.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Le.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;nt.setup(i,r,s,n,c);let h,g=$e;if(c!==null&&(h=Ie.get(c),g=et,g.setIndex(h)),i.isMesh)r.wireframe===!0?(H.setLineWidth(r.wireframeLinewidth*ke()),g.setMode(z.LINES)):g.setMode(z.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),H.setLineWidth(e*ke()),i.isLineSegments?g.setMode(z.LINES):i.isLineLoop?g.setMode(z.LINE_LOOP):g.setMode(z.LINE_STRIP)}else i.isPoints?g.setMode(z.POINTS):i.isSprite&&g.setMode(z.TRIANGLES);if(i.isBatchedMesh){if(B.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ie.get(c).bytesPerElement:1,o=Me.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(z,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function ft(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Ct(e,t,n),e.side=0,e.needsUpdate=!0,Ct(e,t,n),e.side=2):Ct(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),j=Ue.get(n),j.init(t),te.push(j),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(j.pushLight(e),e.castShadow&&j.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(j.pushLight(e),e.castShadow&&j.pushShadow(e))}),j.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t){if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];ft(a,n,e),r.add(a)}else ft(t,n,e),r.add(t)}}),j=te.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){Me.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}B.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let pt=null;function mt(e){pt&&pt(e)}function ht(){_t.stop()}function gt(){_t.start()}let _t=new rc;_t.setAnimationLoop(mt),typeof self<`u`&&_t.setContext(self),this.setAnimationLoop=function(e){pt=e,at.setAnimationLoop(e),e===null?_t.stop():_t.start()},at.addEventListener(`sessionstart`,ht),at.addEventListener(`sessionend`,gt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){Ye(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(ne===!0)return;F!==null&&F.renderStart(e,t);let n=at.enabled===!0&&at.isPresenting===!0,r=N!==null&&(R===null||n)&&N.begin(P,R);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),at.enabled===!0&&at.isPresenting===!0&&(N===null||N.isCompositing()===!1)&&(at.cameraAutoUpdate===!0&&at.updateCamera(t),t=at.getCamera()),e.isScene===!0&&e.onBeforeRender(P,e,t,R),j=Ue.get(e,te.length),j.init(t),j.state.textureUnits=Pe.getTextureUnits(),te.push(j),we.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),xe.setFromProjectionMatrix(we,Be,t.reversedDepth),Ce=this.localClippingEnabled,Se=Ge.init(this.clippingPlanes,Ce),k=He.get(e,M.length),k.init(),M.push(k),at.enabled===!0&&at.isPresenting===!0){let e=P.xr.getDepthSensingMesh();e!==null&&vt(e,t,-1/0,P.sortObjects)}vt(e,t,0,P.sortObjects),k.finish(),P.sortObjects===!0&&k.sort(ge,_e,t.reversedDepth),Oe=at.enabled===!1||at.isPresenting===!1||at.hasDepthSensing()===!1,Oe&&Xe.addToRenderList(k,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Se===!0&&Ge.beginShadows();let i=j.state.shadowsArray;if(qe.render(i,e,t),Se===!0&&Ge.endShadows(),(r&&N.hasRenderPass())===!1){let n=k.opaque,r=k.transmissive;if(j.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];bt(n,r,e,a)}Oe&&Xe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];yt(k,e,n,n.viewport)}}else r.length>0&&bt(n,r,e,t),Oe&&Xe.render(e),yt(k,e,t)}R!==null&&ae===0&&(Pe.updateMultisampleRenderTarget(R),Pe.updateRenderTargetMipmap(R)),r&&N.end(P),e.isScene===!0&&e.onAfterRender(P,e,t),nt.resetDefaultState(),oe=-1,se=null,te.pop(),te.length>0?(j=te[te.length-1],Pe.setTextureUnits(j.state.textureUnits),Se===!0&&Ge.setGlobalState(P.clippingPlanes,j.state.camera)):j=null,M.pop(),k=M.length>0?M[M.length-1]:null,F!==null&&F.renderEnd()};function vt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)j.pushLightProbeGrid(e);else if(e.isLight)j.pushLight(e),e.castShadow&&j.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||xe.intersectsSprite(e)){r&&Ee.setFromMatrixPosition(e.matrixWorld).applyMatrix4(we);let t=Re.update(e),i=e.material;i.visible&&k.push(e,t,i,n,Ee.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||xe.intersectsObject(e))){let t=Re.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),Ee.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Ee.copy(e.boundingSphere.center)),Ee.applyMatrix4(e.matrixWorld).applyMatrix4(we)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&k.push(e,t,s,n,Ee.z,o)}}else i.visible&&k.push(e,t,i,n,Ee.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)vt(i[e],t,n,r)}function yt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;j.setupLightsView(n),Se===!0&&Ge.setGlobalState(P.clippingPlanes,n),r&&H.viewport(ce.copy(r)),i.length>0&&xt(i,t,n),a.length>0&&xt(a,t,n),o.length>0&&xt(o,t,n),H.buffers.depth.setTest(!0),H.buffers.depth.setMask(!0),H.buffers.color.setMask(!0),H.setPolygonOffset(!1)}function bt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(j.state.transmissionRenderTarget[r.id]===void 0){let e=B.has(`EXT_color_buffer_half_float`)||B.has(`EXT_color_buffer_float`);j.state.transmissionRenderTarget[r.id]=new Jt(1,1,{generateMipmaps:!0,type:e?g:l,minFilter:c,samples:Math.max(4,V.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ft.workingColorSpace})}let a=j.state.transmissionRenderTarget[r.id],o=r.viewport||ce;a.setSize(o.z*P.transmissionResolutionScale,o.w*P.transmissionResolutionScale);let s=P.getRenderTarget(),u=P.getActiveCubeFace(),d=P.getActiveMipmapLevel();P.setRenderTarget(a),P.getClearColor(de),fe=P.getClearAlpha(),fe<1&&P.setClearColor(16777215,.5),P.clear(),Oe&&Xe.render(n);let f=P.toneMapping;P.toneMapping=0;let p=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),j.setupLightsView(r),Se===!0&&Ge.setGlobalState(P.clippingPlanes,r),xt(e,n,r),Pe.updateMultisampleRenderTarget(a),Pe.updateRenderTargetMipmap(a),B.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,St(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Pe.updateMultisampleRenderTarget(a),Pe.updateRenderTargetMipmap(a))}P.setRenderTarget(s,u,d),P.setClearColor(de,fe),p!==void 0&&(r.viewport=p),P.toneMapping=f}function xt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&St(o,t,n,s,l,c)}}function St(e,t,n,r,i,a){e.onBeforeRender(P,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(P,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=2):P.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(P,t,n,r,i,a)}function Ct(e,t,n){t.isScene!==!0&&(t=De);let r=Me.get(e),i=j.state.lights,a=j.state.shadowsArray,o=i.state.version,s=ze.getParameters(e,i.state,a,t,n,j.state.lightProbeGridArray),c=ze.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Fe.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,lt),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Tt(e,s),d}else s.uniforms=ze.getUniforms(e),F!==null&&e.isNodeMaterial&&F.build(e,n,s),e.onBeforeCompile(s,P),d=ze.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ge.uniform),Tt(e,s),r.needsLights=Ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=j.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function wt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Zl.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Tt(e,t){let n=Me.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Et(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];D.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(D))return n}return null}function U(e,t,n,r,i){t.isScene!==!0&&(t=De),Pe.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=R===null?P.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:Ft.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Fe.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(h=P.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=Me.get(r),y=j.state.lights;if(Se===!0&&(Ce===!0||e!==se)){let t=e===se&&r.id===oe;Ge.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ge.numPlanes||v.numIntersection!==Ge.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=j.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=Ct(r,t,i),F&&r.isNodeMaterial&&F.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(H.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==oe&&(oe=r.id,C=!0),v.needsLights){let e=Et(j.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||se!==e){H.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(z,`projectionMatrix`,e.projectionMatrix),T.setValue(z,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(z,Te.setFromMatrixPosition(e.matrixWorld)),V.logarithmicDepthBuffer&&T.setValue(z,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(z,`isOrthographic`,e.isOrthographicCamera===!0),se!==e&&(se=e,C=!0,w=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&T.setValue(z,`directionalShadowMap`,y.state.directionalShadowMap,Pe),y.state.spotShadowMap.length>0&&T.setValue(z,`spotShadowMap`,y.state.spotShadowMap,Pe),y.state.pointShadowMap.length>0&&T.setValue(z,`pointShadowMap`,y.state.pointShadowMap,Pe)),i.isSkinnedMesh){T.setOptional(z,i,`bindMatrix`),T.setOptional(z,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(z,`boneTexture`,e.boneTexture,Pe))}i.isBatchedMesh&&(T.setOptional(z,i,`batchingTexture`),T.setValue(z,`batchingTexture`,i._matricesTexture,Pe),T.setOptional(z,i,`batchingIdTexture`),T.setValue(z,`batchingIdTexture`,i._indirectTexture,Pe),T.setOptional(z,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(z,`batchingColorTexture`,i._colorsTexture,Pe));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&Qe.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(z,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=vd()),C){if(T.setValue(z,`toneMappingExposure`,P.toneMappingExposure),v.needsLights&&Dt(E,w),a&&r.fog===!0&&Ve.refreshFogUniforms(E,a),Ve.refreshMaterialUniforms(E,r,he,me,j.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Zl.upload(z,wt(v),E,Pe)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Zl.upload(z,wt(v),E,Pe),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(z,`center`,i.center),T.setValue(z,`modelViewMatrix`,i.modelViewMatrix),T.setValue(z,`normalMatrix`,i.normalMatrix),T.setValue(z,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];rt.update(n,x),rt.bind(n,x)}}return x}function Dt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return ie},this.getActiveMipmapLevel=function(){return ae},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(e,t,n){let r=Me.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),Me.get(e.texture).__webglTexture=t,Me.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=Me.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){R=e,ie=t,ae=n;let r=null,i=!1,a=!1;if(e){let o=Me.get(e);if(o.__useDefaultFramebuffer!==void 0){H.bindFramebuffer(z.FRAMEBUFFER,o.__webglFramebuffer),ce.copy(e.viewport),le.copy(e.scissor),ue=e.scissorTest,H.viewport(ce),H.scissor(le),H.setScissorTest(ue),oe=-1;return}if(o.__webglFramebuffer===void 0)Pe.setupRenderTarget(e);else if(o.__hasExternalTextures)Pe.rebindTextures(e,Me.get(e.texture).__webglTexture,Me.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&Me.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Pe.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=Me.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Pe.useMultisampledRTT(e)===!1?Me.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ce.copy(e.viewport),le.copy(e.scissor),ue=e.scissorTest}else ce.copy(ve).multiplyScalar(he).floor(),le.copy(ye).multiplyScalar(he).floor(),ue=be;if(n!==0&&(r=I),H.bindFramebuffer(z.FRAMEBUFFER,r)&&H.drawBuffers(e,r),H.viewport(ce),H.scissor(le),H.setScissorTest(ue),i){let r=Me.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=Me.get(e.textures[t]);z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=Me.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,t.__webglTexture,n)}oe=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){Ye(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=Me.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){H.bindFramebuffer(z.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s),!V.textureFormatReadable(c)){Ye(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!V.textureTypeReadable(l)){Ye(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&z.readPixels(t,n,r,i,tt.convert(c),tt.convert(l),a)}finally{let e=R===null?null:Me.get(R).__webglFramebuffer;H.bindFramebuffer(z.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=Me.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){H.bindFramebuffer(z.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s),!V.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!V.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,d),z.bufferData(z.PIXEL_PACK_BUFFER,a.byteLength,z.STREAM_READ),z.readPixels(t,n,r,i,tt.convert(l),tt.convert(u),0);let f=R===null?null:Me.get(R).__webglFramebuffer;H.bindFramebuffer(z.FRAMEBUFFER,f);let p=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await Ze(z,p,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,d),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,a),z.deleteBuffer(d),z.deleteSync(p),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Pe.setTexture2D(e,0),z.copyTexSubImage2D(z.TEXTURE_2D,n,0,0,o,s,i,a),H.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=tt.convert(t.format),_=tt.convert(t.type),v;t.isData3DTexture?(Pe.setTexture3D(t,0),v=z.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Pe.setTexture2DArray(t,0),v=z.TEXTURE_2D_ARRAY):(Pe.setTexture2D(t,0),v=z.TEXTURE_2D),H.activeTexture(z.TEXTURE0),H.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,t.flipY),H.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),H.pixelStorei(z.UNPACK_ALIGNMENT,t.unpackAlignment);let y=H.getParameter(z.UNPACK_ROW_LENGTH),b=H.getParameter(z.UNPACK_IMAGE_HEIGHT),x=H.getParameter(z.UNPACK_SKIP_PIXELS),S=H.getParameter(z.UNPACK_SKIP_ROWS),C=H.getParameter(z.UNPACK_SKIP_IMAGES);H.pixelStorei(z.UNPACK_ROW_LENGTH,h.width),H.pixelStorei(z.UNPACK_IMAGE_HEIGHT,h.height),H.pixelStorei(z.UNPACK_SKIP_PIXELS,l),H.pixelStorei(z.UNPACK_SKIP_ROWS,u),H.pixelStorei(z.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=Me.get(e),r=Me.get(t),h=Me.get(n.__renderTarget),g=Me.get(r.__renderTarget);H.bindFramebuffer(z.READ_FRAMEBUFFER,h.__webglFramebuffer),H.bindFramebuffer(z.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,Me.get(e).__webglTexture,i,d+n),z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,Me.get(t).__webglTexture,a,m+n)),z.blitFramebuffer(l,u,o,s,f,p,o,s,z.DEPTH_BUFFER_BIT,z.NEAREST);H.bindFramebuffer(z.READ_FRAMEBUFFER,null),H.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||Me.has(e)){let n=Me.get(e),r=Me.get(t);H.bindFramebuffer(z.READ_FRAMEBUFFER,L),H.bindFramebuffer(z.DRAW_FRAMEBUFFER,re);for(let e=0;e<c;e++)w?z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):z.framebufferTexture2D(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,n.__webglTexture,i),T?z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):z.framebufferTexture2D(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,r.__webglTexture,a),i===0?T?z.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):z.copyTexSubImage2D(v,a,f,p,l,u,o,s):z.blitFramebuffer(l,u,o,s,f,p,o,s,z.COLOR_BUFFER_BIT,z.NEAREST);H.bindFramebuffer(z.READ_FRAMEBUFFER,null),H.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?z.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h);H.pixelStorei(z.UNPACK_ROW_LENGTH,y),H.pixelStorei(z.UNPACK_IMAGE_HEIGHT,b),H.pixelStorei(z.UNPACK_SKIP_PIXELS,x),H.pixelStorei(z.UNPACK_SKIP_ROWS,S),H.pixelStorei(z.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&z.generateMipmap(v),H.unbindTexture()},this.initRenderTarget=function(e){Me.get(e).__webglFramebuffer===void 0&&Pe.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Pe.setTextureCube(e,0):e.isData3DTexture?Pe.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Pe.setTexture2DArray(e,0):Pe.setTexture2D(e,0),H.unbindTexture()},this.resetState=function(){ie=0,ae=0,R=null,H.reset(),nt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Be}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ft._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ft._getUnpackColorSpace()}},bd=class{constructor(e=1){this.reseed(e)}reseed(e){return this.s=e>>>0||1,this}next(){let e=this.s+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return e+(t-e)*this.next()}int(e,t){return Math.floor(this.range(e,t+1))}pick(e){return e[Math.min(e.length-1,Math.floor(this.next()*e.length))]}sign(){return this.next()<.5?-1:1}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*.5}},xd=class{constructor(){this.map=new Map}on(e,t){return this.map.has(e)||this.map.set(e,new Set),this.map.get(e).add(t),()=>this.off(e,t)}off(e,t){this.map.get(e)?.delete(t)}emit(e,t){let n=this.map.get(e);if(n)for(let e of[...n])e(t)}},Sd=class{constructor(e,t){this.factory=e,this.free=[],this.used=new Set;for(let n=0;n<t;n++)this.free.push(e(n))}acquire(){let e=this.free.pop()||null;return e&&this.used.add(e),e}release(e){this.used.delete(e)&&this.free.push(e)}releaseAll(){for(let e of this.used)this.free.push(e);this.used.clear()}},Cd=(e,t,n)=>e<t?t:e>n?n:e,wd=(e,t,n)=>e+(t-e)*n,Td=(e,t,n,r)=>wd(e,t,1-Math.exp(-n*r)),Ed=e=>1-(1-e)**3,Z=Math.PI*2;Math.PI/180;var Dd=e=>(e%=Z,e>Math.PI&&(e-=Z),e<-Math.PI&&(e+=Z),e),Od=(e,t,n)=>e+Cd(Dd(t-e),-n,n),kd=(e,t)=>{let n=Math.imul(e,374761393)+Math.imul(t,668265263);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296};function Ad(e,t){let n=Math.floor(e),r=Math.floor(t),i=e-n,a=t-r,o=i*i*(3-2*i),s=a*a*(3-2*a),c=kd(n,r),l=kd(n+1,r),u=kd(n,r+1),d=kd(n+1,r+1);return c+(l-c)*o+(u-c)*s+(c-l-u+d)*o*s}function jd(e,t,n=4,r=2.02,i=.5){let a=.5,o=1,s=0,c=0;for(let l=0;l<n;l++)s+=a*Ad(e*o,t*o),c+=a,a*=i,o*=r;return s/c}var Md=e=>e>=1e3?(e/1e3).toFixed(1)+` km`:Math.round(e)+` m`,Nd=e=>String(e).padStart(2,`0`);function Pd(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function Fd(t,{srgb:n=!0,repeat:i=null,aniso:a=4,filter:o=!0}={}){let s=new ia(t);return n&&(s.colorSpace=Ne),i&&(s.wrapS=s.wrapT=e,s.repeat.set(i[0],i[1])),s.anisotropy=a,o||(s.magFilter=r),s.generateMipmaps=!0,s}function Id(){let n=new bd(1337),r=new Map,i=(e,t)=>(r.has(e)||r.set(e,t()),r.get(e)),a=()=>i(`sand`,()=>{let[e,t]=Pd(256,256),r=t.createImageData(256,256),i=[176,147,104],a=[203,176,131],o=[148,113,76],s=[210,198,163];for(let e=0;e<256;e++)for(let t=0;t<256;t++){let n=(e*256+t)*4,c=jd(t/46+11,e/46-4,4),l=jd(t/17-8,e/17+21,3),u=jd((t*.82-e*.5)/60+31,(t*.5+e*.82)/21-14,3),d=i[0]+(a[0]-i[0])*c,f=i[1]+(a[1]-i[1])*c,p=i[2]+(a[2]-i[2])*c,m=Cd((.46-l)*2.4,0,1);d+=(o[0]-d)*m*.72,f+=(o[1]-f)*m*.72,p+=(o[2]-p)*m*.72;let h=Cd((.4-u)*3,0,1)*.34;d*=1-h*.28,f*=1-h*.26,p*=1-h*.2;let g=Cd((c-.7)*5,0,1);d+=(s[0]-d)*g,f+=(s[1]-f)*g,p+=(s[2]-p)*g,r.data[n]=d,r.data[n+1]=f,r.data[n+2]=p,r.data[n+3]=255}t.putImageData(r,0,0);let[c,l]=Pd(1024,1024);l.imageSmoothingEnabled=!0,l.drawImage(e,0,0,1024,1024),l.save(),l.translate(512,512),l.rotate(-.52);for(let e=0;e<1500;e++){let e=n.range(-760,760),t=n.range(-760,760),r=n.range(26,90),i=n.range(-8,8);l.strokeStyle=n.next()<.5?`rgba(228,206,166,${n.range(.05,.13)})`:`rgba(96,76,52,${n.range(.05,.12)})`,l.lineWidth=n.range(1,2.6),l.beginPath(),l.moveTo(e,t),l.quadraticCurveTo(e+r*.5,t+i,e+r,t),l.stroke()}l.restore();let u=l.getImageData(0,0,1024,1024),d=u.data;for(let e=0;e<d.length;e+=4){let t=(n.next()-.5)*22;d[e]+=t,d[e+1]+=t,d[e+2]+=t*.9}l.putImageData(u,0,0);for(let e=0;e<1500;e++){let e=n.next()*1024,t=n.next()*1024;l.fillStyle=n.next()<.6?`rgba(92,74,52,0.5)`:`rgba(160,140,106,0.55)`,l.beginPath(),l.arc(e,t,n.range(.6,2.2),0,7),l.fill()}for(let e=0;e<70;e++){let e=n.next()*1024,t=n.next()*1024;l.fillStyle=`rgba(96,92,58,0.26)`,l.beginPath(),l.arc(e,t,n.range(3,8),0,7),l.fill()}return Fd(c,{repeat:[150,150],aniso:8})}),o=()=>i(`concrete`,()=>{let[e,t]=Pd(1024,1024);t.fillStyle=`#94928a`,t.fillRect(0,0,1024,1024);for(let e=0;e<4;e++)for(let r=0;r<4;r++){let i=n.int(-9,9),a=n.int(-3,4);t.fillStyle=`rgba(${148+i+a},${146+i},${138+i-a},0.5)`,t.fillRect(r*256,e*256,256,256)}for(let e=0;e<220;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(24,130),a=t.createRadialGradient(e,r,0,e,r,i),o=n.pick([`#8b8a82`,`#a09f96`,`#868589`,`#999890`,`#8f8d80`]);a.addColorStop(0,o+`44`),a.addColorStop(1,o+`00`),t.fillStyle=a,t.fillRect(e-i,r-i,i*2,i*2)}let r=t.getImageData(0,0,1024,1024),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*18;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<14;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(60,220),a=n.next()*7;t.strokeStyle=`rgba(38,36,34,${n.range(.05,.16)})`,t.lineWidth=n.range(6,14),t.beginPath(),t.arc(e,r,i,a,a+n.range(.4,1.4)),t.stroke()}for(let e=0;e<26;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(60,200);t.strokeStyle=`rgba(168,148,110,${n.range(.05,.14)})`,t.lineWidth=n.range(4,16),t.beginPath(),t.moveTo(e,r),t.quadraticCurveTo(e+i*.5,r+n.range(-16,16),e+i,r+n.range(-10,10)),t.stroke()}for(let e=0;e<=4;e++){let n=Math.min(1022,Math.max(2,e*256));t.strokeStyle=`rgba(206,204,196,0.35)`,t.lineWidth=7,t.beginPath(),t.moveTo(n,0),t.lineTo(n,1024),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(1024,n),t.stroke(),t.strokeStyle=`rgba(58,56,52,0.55)`,t.lineWidth=2.4,t.beginPath(),t.moveTo(n,0),t.lineTo(n,1024),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(1024,n),t.stroke()}for(let e=0;e<11;e++){let e=n.next()*1024,r=n.next()*1024,i=n.next()*Math.PI*2,a=Math.cos(i),o=Math.sin(i);t.strokeStyle=`rgba(88,86,80,${n.range(.18,.3)})`,t.lineWidth=n.range(.8,1.3),t.beginPath(),t.moveTo(e,r);for(let i=0;i<12;i++){let i=n.range(14,30),s=n.range(-7,7);e+=a*i-o*s,r+=o*i+a*s,t.lineTo(e,r)}t.stroke()}for(let e=0;e<14;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(10,44),a=t.createRadialGradient(e,r,0,e,r,i);a.addColorStop(0,`rgba(30,28,26,0.35)`),a.addColorStop(1,`rgba(30,28,26,0)`),t.fillStyle=a,t.beginPath(),t.arc(e,r,i,0,7),t.fill()}return Fd(e,{repeat:[10,10],aniso:8})}),s=()=>i(`asphalt`,()=>{let[e,t]=Pd(512,512);t.fillStyle=`#3c3d3f`,t.fillRect(0,0,512,512);let r=t.getImageData(0,0,512,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*24;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<500;e++)t.fillStyle=n.next()<.5?`rgba(90,90,92,0.4)`:`rgba(20,20,22,0.4)`,t.beginPath(),t.arc(n.next()*512,n.next()*512,n.range(.5,2),0,7),t.fill();let a=t.createLinearGradient(0,0,512,0);a.addColorStop(0,`rgba(150,128,92,0.5)`),a.addColorStop(.06,`rgba(150,128,92,0.12)`),a.addColorStop(.12,`rgba(150,128,92,0)`),a.addColorStop(.88,`rgba(150,128,92,0)`),a.addColorStop(.94,`rgba(150,128,92,0.12)`),a.addColorStop(1,`rgba(150,128,92,0.5)`),t.fillStyle=a,t.fillRect(0,0,512,512);let o=t.createLinearGradient(0,0,512,0);o.addColorStop(0,`rgba(0,0,0,0)`),o.addColorStop(.22,`rgba(24,24,26,0.35)`),o.addColorStop(.5,`rgba(0,0,0,0)`),o.addColorStop(.78,`rgba(24,24,26,0.35)`),o.addColorStop(1,`rgba(0,0,0,0)`),t.fillStyle=o,t.fillRect(0,0,512,512);for(let e=0;e<7;e++){let e=n.next()*512,r=n.next()*512,i=n.range(30,90),a=n.range(20,60);t.fillStyle=`rgba(20,20,23,${n.range(.18,.32)})`,t.fillRect(e,r,i,a)}return Fd(e,{repeat:[1,14],aniso:8})}),c=()=>i(`gravel`,()=>{let[e,t]=Pd(256,256);t.fillStyle=`#8d7c60`,t.fillRect(0,0,256,256);let r=t.getImageData(0,0,256,256),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*26;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<900;e++){let e=n.next()*256,r=n.next()*256,i=n.range(.8,3.4),a=n.int(-40,44);t.fillStyle=`rgba(${141+a},${124+a},${96+a},0.85)`,t.beginPath(),t.ellipse(e,r,i,i*n.range(.55,1),n.next()*3,0,7),t.fill(),t.fillStyle=`rgba(40,34,26,0.25)`,t.beginPath(),t.ellipse(e+i*.4,r+i*.45,i*.8,i*.5,n.next()*3,0,7),t.fill()}return Fd(e,{repeat:[1,1],aniso:8})}),l=()=>i(`sandTracks`,()=>{let[r,i]=Pd(128,256);i.clearRect(0,0,128,256);for(let e of[36,92]){let t=i.createLinearGradient(e-16,0,e+16,0);t.addColorStop(0,`rgba(88,70,48,0)`),t.addColorStop(.3,`rgba(88,70,48,0.42)`),t.addColorStop(.5,`rgba(72,58,40,0.5)`),t.addColorStop(.7,`rgba(88,70,48,0.42)`),t.addColorStop(1,`rgba(88,70,48,0)`),i.fillStyle=t,i.fillRect(e-16,0,32,256);for(let t=2;t<256;t+=7)i.fillStyle=`rgba(42,34,24,${n.range(.25,.5)})`,i.fillRect(e-9+n.range(-1.5,1.5),t,18,n.range(2,3.4));for(let t of[-1,1])i.fillStyle=`rgba(226,204,162,0.22)`,i.fillRect(e+t*17-2,0,4,256)}i.fillStyle=`rgba(210,188,148,0.10)`,i.fillRect(56,0,16,256);for(let e=0;e<130;e++)i.clearRect(n.next()*128,n.next()*256,3,2);let a=Fd(r,{srgb:!0});return a.wrapS=t,a.wrapT=e,a}),u=(e,t,r)=>i(`camo:`+e,()=>{let[e,i]=Pd(512,512);i.fillStyle=t,i.fillRect(0,0,512,512);for(let e of r)for(let t=0;t<26;t++){let t=n.next()*512,r=n.next()*512;i.fillStyle=e,i.beginPath();let a=n.next()*7;i.moveTo(t+Math.cos(a)*30,r+Math.sin(a)*30);for(let e=1;e<=8;e++){let o=a+e/8*Math.PI*2,s=n.range(18,66);i.quadraticCurveTo(t+Math.cos(o-.3)*s*1.25,r+Math.sin(o-.3)*s*1.25,t+Math.cos(o)*s,r+Math.sin(o)*s)}i.fill()}let a=i.getImageData(0,0,512,512),o=a.data;for(let e=0;e<o.length;e+=4){let t=(n.next()-.5)*14;o[e]+=t,o[e+1]+=t,o[e+2]+=t}i.putImageData(a,0,0);for(let e=0;e<60;e++){i.strokeStyle=`rgba(30,28,24,${n.range(.08,.3)})`,i.lineWidth=n.range(.5,1.4);let e=n.next()*512,t=n.next()*512;i.beginPath(),i.moveTo(e,t),i.lineTo(e+n.range(-40,40),t+n.range(-12,12)),i.stroke()}return Fd(e,{repeat:[1,1],aniso:4})}),d=()=>u(`tan`,`#a08a62`,[`#8f7a54cc`,`#b09a70bb`,`#79684abb`]),f=()=>u(`olive`,`#5c6248`,[`#4d5340cc`,`#6a7052bb`,`#42472fbb`]),p=()=>i(`metalPlate`,()=>{let[e,t]=Pd(512,512);t.fillStyle=`#7d8287`,t.fillRect(0,0,512,512);let r=t.getImageData(0,0,512,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*16;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0),t.strokeStyle=`rgba(40,42,46,0.65)`,t.lineWidth=2;for(let e=1;e<4;e++)t.beginPath(),t.moveTo(e*128,0),t.lineTo(e*128,512),t.stroke(),t.beginPath(),t.moveTo(0,e*128),t.lineTo(512,e*128),t.stroke();t.fillStyle=`rgba(50,52,56,0.8)`;for(let e=16;e<512;e+=32)for(let n=16;n<512;n+=128)t.beginPath(),t.arc(e,n+6,2.2,0,7),t.fill();return Fd(e,{repeat:[1,1]})}),m=()=>i(`heatBurn`,()=>{let[e,t]=Pd(256,256),r=t.createLinearGradient(0,0,0,256);r.addColorStop(0,`#242021`),r.addColorStop(.35,`#403132`),r.addColorStop(.6,`#5e4a3a`),r.addColorStop(.78,`#6f6252`),r.addColorStop(1,`#7c7a74`),t.fillStyle=r,t.fillRect(0,0,256,256);for(let e=0;e<500;e++){let e=n.next()*256;t.fillStyle=`rgba(20,16,14,${(1-e/256)*.4*n.next()})`,t.fillRect(n.next()*256,e,n.range(2,14),n.range(1,3))}return t.fillStyle=`rgba(70,90,140,0.18)`,t.fillRect(0,90,256,46),Fd(e,{repeat:[3,1]})}),h=()=>i(`hazard`,()=>{let[e,t]=Pd(256,64);t.fillStyle=`#c9a227`,t.fillRect(0,0,256,64),t.fillStyle=`#17181a`;for(let e=-64;e<300;e+=64)t.beginPath(),t.moveTo(e,64),t.lineTo(e+32,0),t.lineTo(e+64,0),t.lineTo(e+32,64),t.fill();for(let e=0;e<260;e++)t.fillStyle=`rgba(120,110,90,${n.range(.05,.3)})`,t.fillRect(n.next()*256,n.next()*64,n.range(1,5),n.range(1,3));return Fd(e,{repeat:[8,1]})}),g=()=>i(`chainlink`,()=>{let[t,n]=Pd(128,128);n.clearRect(0,0,128,128),n.strokeStyle=`rgba(58,64,70,0.85)`,n.lineWidth=4;for(let e=-4;e<8;e++)n.beginPath(),n.moveTo(e*32,-8),n.lineTo(e*32+136,136),n.stroke(),n.beginPath(),n.moveTo(e*32+136,-8),n.lineTo(e*32,136),n.stroke();n.strokeStyle=`rgba(226,232,238,0.98)`,n.lineWidth=2.2;for(let e=-4;e<8;e++)n.beginPath(),n.moveTo(e*32,-8),n.lineTo(e*32+136,136),n.stroke(),n.beginPath(),n.moveTo(e*32+136,-8),n.lineTo(e*32,136),n.stroke();n.fillStyle=`rgba(255,255,255,0.9)`;for(let e=0;e<128;e+=16)for(let t=e/16%2*16;t<128;t+=32)n.beginPath(),n.arc(t,e,1.6,0,7),n.fill();let r=Fd(t,{repeat:[1,1],aniso:8});return r.wrapS=r.wrapT=e,r}),_=()=>i(`hescoFabric`,()=>{let[e,t]=Pd(256,256);t.fillStyle=`#b2996c`,t.fillRect(0,0,256,256);for(let e=0;e<220;e++){let e=n.next()*256;t.strokeStyle=n.next()<.5?`rgba(84,66,44,${n.range(.05,.16)})`:`rgba(210,188,146,${n.range(.05,.14)})`,t.lineWidth=n.range(1,3),t.beginPath(),t.moveTo(e,n.range(-10,40)),t.quadraticCurveTo(e+n.range(-6,6),128,e+n.range(-10,10),266),t.stroke()}let r=t.createLinearGradient(0,0,0,256);r.addColorStop(0,`rgba(226,208,168,0.20)`),r.addColorStop(.75,`rgba(120,96,64,0.08)`),r.addColorStop(1,`rgba(84,66,46,0.4)`),t.fillStyle=r,t.fillRect(0,0,256,256);for(let e=0;e<5;e++)for(let n=0;n<5;n++){let r=n*51.2+25.6,i=e*51.2+25.6,a=t.createRadialGradient(r,i+8,4,r,i+8,30);a.addColorStop(0,`rgba(228,206,164,0.12)`),a.addColorStop(.8,`rgba(70,56,38,0.10)`),a.addColorStop(1,`rgba(70,56,38,0)`),t.fillStyle=a,t.fillRect(r-32,i-26,64,64)}for(let[e,n,r]of[[4,`rgba(52,48,40,0.55)`,1.6],[1.8,`rgba(214,220,226,0.9)`,0]]){t.strokeStyle=n,t.lineWidth=e;for(let e=0;e<=5;e++){let n=Cd(e*51.2,1,255)+r;t.beginPath(),t.moveTo(n,0),t.lineTo(n,256),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(256,n),t.stroke()}}t.fillStyle=`rgba(230,234,238,0.8)`;for(let e=0;e<=5;e++)for(let n=6;n<256;n+=14)t.fillRect(Cd(e*51.2,1,253)-1,n,3,2);return Fd(e,{repeat:[1,1],aniso:4})}),v=()=>i(`woodPallet`,()=>{let[e,t]=Pd(128,128);t.fillStyle=`#9b7f57`,t.fillRect(0,0,128,128);for(let e=0;e<120;e++){let e=n.next()*128;t.strokeStyle=`rgba(${96+n.int(0,60)},${72+n.int(0,40)},${44+n.int(0,26)},${n.range(.2,.5)})`,t.lineWidth=n.range(.6,1.8),t.beginPath(),t.moveTo(0,e),t.bezierCurveTo(40,e+n.range(-3,3),90,e+n.range(-3,3),128,e+n.range(-4,4)),t.stroke()}for(let e=0;e<5;e++){let e=n.next()*128,r=n.next()*128;t.fillStyle=`rgba(70,52,32,0.6)`,t.beginPath(),t.ellipse(e,r,n.range(2,4),n.range(1.4,2.6),n.next()*3,0,7),t.fill()}return Fd(e,{repeat:[1,1]})}),y=(e,{fg:r=`#e8e4da`,bg:a=null,w:o=256,h:s=64,font:c=`bold 34px "Arial Narrow", Arial, sans-serif`,stencil:l=!0}={})=>i(`label:${e}:${r}:${a}:${o}x${s}`,()=>{let[i,u]=Pd(o,s);a&&(u.fillStyle=a,u.fillRect(0,0,o,s)),u.font=c,u.textAlign=`center`,u.textBaseline=`middle`,u.fillStyle=r,l&&(u.globalAlpha=.88),u.fillText(e,o/2,s/2+2),u.globalAlpha=1;for(let e=0;e<120;e++)u.clearRect(n.next()*o,n.next()*s,2,1.5);let d=Fd(i);return d.wrapS=d.wrapT=t,d}),b=()=>i(`roundel`,()=>{let[e,n]=Pd(128,128);n.strokeStyle=`#dfe3e6`,n.lineWidth=6,n.beginPath(),n.arc(64,64,48,0,7),n.stroke(),n.beginPath(),n.moveTo(64,24),n.lineTo(92,84),n.lineTo(36,84),n.closePath(),n.stroke(),n.fillStyle=`#dfe3e6`,n.font=`bold 15px Arial`,n.textAlign=`center`,n.fillText(`IRONVEIL`,64,112);let r=Fd(e);return r.wrapS=r.wrapT=t,r}),x=()=>i(`arrowDecal`,()=>{let[e,r]=Pd(128,192);r.clearRect(0,0,128,192),r.fillStyle=`rgba(216,207,159,0.9)`,r.beginPath(),r.moveTo(52,190),r.lineTo(52,78),r.lineTo(24,78),r.lineTo(64,6),r.lineTo(104,78),r.lineTo(76,78),r.lineTo(76,190),r.closePath(),r.fill();for(let e=0;e<260;e++)r.clearRect(n.next()*128,n.next()*192,3,2.4);let i=Fd(e);return i.wrapS=i.wrapT=t,i}),S=()=>i(`mapBoard`,()=>{let[e,t]=Pd(768,576);t.fillStyle=`#cfc8b0`,t.fillRect(0,0,768,576);for(let e=0;e<1100;e++)t.fillStyle=`rgba(120,110,88,${M.range(.02,.06)})`,t.fillRect(M.next()*768,M.next()*576,M.range(2,14),M.range(1,7));for(let e of[261.12,768*.67]){let n=t.createLinearGradient(e-7,0,e+7,0);n.addColorStop(0,`rgba(80,70,50,0)`),n.addColorStop(.5,`rgba(80,70,50,0.14)`),n.addColorStop(1,`rgba(80,70,50,0)`),t.fillStyle=n,t.fillRect(e-7,0,14,576)}for(let e=0;e<30;e++){let e=M.next()*768,n=M.range(40,516),r=M.range(18,60),i=t.createRadialGradient(e,n,2,e,n,r);i.addColorStop(0,`rgba(146,128,86,${M.range(.1,.2)})`),i.addColorStop(1,`rgba(146,128,86,0)`),t.fillStyle=i,t.beginPath(),t.arc(e,n,r,0,7),t.fill()}t.fillStyle=`rgba(112,140,158,0.55)`,t.beginPath(),t.moveTo(30,90);for(let e=0;e<=14;e++){let n=e/14*Math.PI*2;t.lineTo(95+Math.cos(n)*(56+jd(Math.cos(n)*3,Math.sin(n)*3,3)*26),128+Math.sin(n)*(38+jd(Math.sin(n)*3+9,Math.cos(n)*3,3)*18))}t.closePath(),t.fill(),t.strokeStyle=`rgba(112,140,158,0.7)`,t.lineWidth=5,t.beginPath(),t.moveTo(120,160);for(let e=1;e<=20;e++){let n=e/20;t.lineTo(120+n*560+jd(n*6,3.3,3)*60,160+n*330+Math.sin(n*6)*34)}t.stroke();for(let e=0;e<30;e++){let n=M.range(-60,828),r=M.range(-40,616),i=M.range(14,48);t.strokeStyle=`rgba(150,116,74,${M.range(.3,.55)})`,t.lineWidth=1;for(let a=0;a<M.int(2,5);a++){t.beginPath();let o=i+a*M.range(7,13);for(let i=0;i<=24;i++){let a=i/24*Math.PI*2,s=o*(1+jd(Math.cos(a)*2+e*7,Math.sin(a)*2,3)*.5),c=n+Math.cos(a)*s,l=r+Math.sin(a)*s*.8;i===0?t.moveTo(c,l):t.lineTo(c,l)}t.closePath(),t.stroke()}}t.strokeStyle=`rgba(150,84,60,0.75)`,t.lineWidth=3,t.beginPath(),t.moveTo(0,420);for(let e=1;e<=16;e++)t.lineTo(e/16*768,420+jd(e*.7,8.8,3)*70);t.stroke(),t.lineWidth=1.4;for(let[e,n,r,i]of[[180,430,260,300],[420,415,470,250],[600,440,700,520]])t.beginPath(),t.moveTo(e,n),t.quadraticCurveTo((e+r)/2+24,(n+i)/2,r,i),t.stroke();t.fillStyle=`rgba(90,88,84,0.8)`;for(let e=0;e<14;e++)t.fillRect(440+M.next()*60,216+M.next()*44,M.range(4,9),M.range(3,7));t.font=`italic 11px Georgia`,t.fillStyle=`rgba(70,66,58,0.85)`,t.fillText(`KESSEL FLATS`,452,208),t.fillText(`LAKE VARDA`,52,78),t.strokeStyle=`rgba(70,86,110,0.4)`,t.lineWidth=1;for(let e=0;e<=12;e++)t.beginPath(),t.moveTo(e*64,0),t.lineTo(e*64,576),t.stroke();for(let e=0;e<=9;e++)t.beginPath(),t.moveTo(0,e*64),t.lineTo(768,e*64),t.stroke();t.font=`bold 10px monospace`,t.fillStyle=`rgba(60,74,96,0.8)`;for(let e=1;e<12;e++)t.fillText(String(20+e),e*64-7,40);for(let e=1;e<9;e++)t.fillText(String(86-e),6,e*64+4);let n=399.36,r=403.2;for(let[e,i,a]of[[-.72,-.22,`rgba(200,80,30,0.13)`],[.1,.5,`rgba(170,40,32,0.15)`]])t.fillStyle=a,t.beginPath(),t.moveTo(n,r),t.arc(n,r,230,e-Math.PI/2,i-Math.PI/2),t.closePath(),t.fill();t.strokeStyle=`rgba(40,90,150,0.85)`,t.lineWidth=2;for(let e of[48,96,152])t.beginPath(),t.arc(n,r,e,0,7),t.stroke();t.font=`10px monospace`,t.fillStyle=`rgba(40,90,150,0.9)`,t.fillText(`5`,435.36,367.2),t.fillText(`10`,469.36,333.2),t.fillText(`15 KM`,509.36,291.2),t.fillStyle=`rgba(40,90,150,0.95)`,t.fillRect(393.36,397.2,12,12),t.font=`bold 11px monospace`,t.fillText(`FDC`,409.36,407.2),t.font=`bold 10px monospace`;for(let[e,n,r]of[[307.36,447.2,`P`],[439.36,479.2,`T`],[517.36,433.2,`S`]])t.strokeStyle=`rgba(30,80,150,0.95)`,t.lineWidth=2,t.strokeRect(e-9,n-7,18,14),t.fillStyle=`rgba(30,80,150,0.95)`,t.fillText(r,e-3,n+4);t.strokeStyle=`rgba(170,40,32,0.9)`,t.lineWidth=3;for(let e of[-.5,-.06,.34]){t.beginPath(),t.moveTo(n+Math.sin(e)*210,r-Math.cos(e)*210),t.lineTo(n+Math.sin(e)*60,r-Math.cos(e)*60),t.stroke();let i=n+Math.sin(e)*60,a=r-Math.cos(e)*60;t.beginPath(),t.moveTo(i,a),t.lineTo(i+Math.sin(e+.5)*14,a-Math.cos(e+.5)*14),t.lineTo(i+Math.sin(e-.5)*14,a-Math.cos(e-.5)*14),t.closePath(),t.fillStyle=`rgba(170,40,32,0.9)`,t.fill()}t.strokeStyle=`rgba(160,30,26,0.75)`,t.setLineDash([7,5]),t.lineWidth=2,t.strokeRect(96,96,200,130),t.setLineDash([]),t.font=`bold 12px monospace`,t.fillStyle=`rgba(160,30,26,0.85)`,t.fillText(`R-4402 NO FIRE`,120,168),t.strokeStyle=`rgba(60,28,72,0.7)`,t.lineWidth=3.5,t.beginPath(),t.ellipse(549.36,253.2,46,30,.3,0,7),t.stroke(),t.beginPath(),t.moveTo(507.36,275.2),t.quadraticCurveTo(459.36,303.2,433.36,343.2),t.stroke(),t.font=`bold 13px "Comic Sans MS", cursive`,t.fillStyle=`rgba(60,28,72,0.8)`,t.fillText(`WATCH AXIS 3`,507.36,213.2),t.strokeStyle=`rgba(120,78,40,0.28)`,t.lineWidth=7,t.beginPath(),t.arc(660,120,26,.3,5.8),t.stroke();for(let e=0;e<11;e++){let e=M.range(50,728),n=M.range(60,516);t.fillStyle=`rgba(0,0,0,0.25)`,t.beginPath(),t.arc(e+1.5,n+2,4.5,0,7),t.fill(),t.fillStyle=M.next()<.5?`#a02020`:M.next()<.6?`#204880`:`#c9a227`,t.beginPath(),t.arc(e,n,4.5,0,7),t.fill(),t.fillStyle=`rgba(255,255,255,0.5)`,t.beginPath(),t.arc(e-1.3,n-1.3,1.4,0,7),t.fill()}t.fillStyle=`#3a3d33`,t.fillRect(0,0,768,30),t.fillStyle=`#e5e2d4`,t.font=`bold 19px Arial`,t.textAlign=`left`,t.fillText(`IRONVEIL RANGE — SECTOR MAP · GRID A7 · REV 6`,12,22),t.font=`bold 12px Arial`,t.textAlign=`right`,t.fillText(`1:50 000`,756,21),t.textAlign=`center`,t.fillStyle=`#7a2018`,t.fillRect(0,554,768,22),t.fillStyle=`#e8ded0`,t.font=`bold 13px Arial`,t.fillText(`EXERCISE USE ONLY — FICTIONAL TERRAIN — NOT FOR NAVIGATION`,384,569),t.textAlign=`left`,t.fillStyle=`rgba(215,205,175,0.85)`;for(let[e,n,r]of[[10,38,-.06],[724,36,.08],[10,530,.05],[724,528,-.07]])t.save(),t.translate(e+17,n+7),t.rotate(r),t.fillRect(-17,-7,34,14),t.restore();return Fd(e,{aniso:4})}),C=()=>i(`statusScreen`,()=>{let[e,r]=Pd(256,160);r.fillStyle=`#04120a`,r.fillRect(0,0,256,160),r.fillStyle=`#0a2414`,r.fillRect(0,0,256,18),r.fillStyle=`#57e389`,r.font=`bold 11px monospace`,r.textAlign=`left`,r.fillText(`IVR//SYS STATUS — GRID A7`,6,13);let i=[`PWR BUS`,`RADAR`,`UPLINK`,`COOLANT`,`BTRY A`,`BTRY B`,`BTRY C`];for(let e=0;e<i.length;e++){let t=32+e*16;r.fillStyle=`#3fae6c`,r.font=`10px monospace`,r.fillText(i[e],8,t);let a=n.range(40,110);r.fillStyle=n.next()<.8?`#2f8f56`:`#c9a227`,r.fillRect(78,t-8,a,7),r.strokeStyle=`#1d5232`,r.strokeRect(78,t-8,130,7),r.fillStyle=`#57e389`,r.fillText(n.next()<.8?`OK`:`CHK`,218,t)}for(let e=0;e<160;e+=3)r.fillStyle=`rgba(0,0,0,0.18)`,r.fillRect(0,e,256,1);let a=r.createRadialGradient(128,80,30,128,80,170);a.addColorStop(0,`rgba(0,0,0,0)`),a.addColorStop(1,`rgba(0,0,0,0.35)`),r.fillStyle=a,r.fillRect(0,0,256,160);let o=Fd(e);return o.wrapS=o.wrapT=t,o}),w=()=>i(`softPuff`,()=>{let[e,t]=Pd(128,128);for(let[e,n,r]of[[64,64,52],[44,54,30],[84,58,32],[58,84,30],[78,82,26],[52,40,24]]){let i=t.createRadialGradient(e,n,0,e,n,r);i.addColorStop(0,`rgba(255,255,255,0.55)`),i.addColorStop(.7,`rgba(255,255,255,0.18)`),i.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=i,t.fillRect(0,0,128,128)}return Fd(e,{srgb:!1})}),T=()=>i(`blobShadow`,()=>{let[e,n]=Pd(128,128),r=n.createRadialGradient(64,64,8,64,64,62);r.addColorStop(0,`rgba(255,255,255,0.85)`),r.addColorStop(.55,`rgba(255,255,255,0.5)`),r.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=r,n.fillRect(0,0,128,128);let i=Fd(e,{srgb:!1});return i.wrapS=i.wrapT=t,i}),E=()=>i(`oilStain`,()=>{let[e,r]=Pd(128,128);r.clearRect(0,0,128,128);for(let[e,t,n]of[[64,64,30],[50,54,15],[80,70,13]]){let i=r.createRadialGradient(e,t,2,e,t,n);i.addColorStop(0,`rgba(52,44,34,0.4)`),i.addColorStop(.65,`rgba(56,48,38,0.2)`),i.addColorStop(1,`rgba(56,48,38,0)`),r.fillStyle=i,r.fillRect(0,0,128,128)}for(let e=0;e<10;e++){let e=n.next()*7,t=n.range(24,48);r.fillStyle=`rgba(50,43,34,${n.range(.12,.26)})`,r.beginPath(),r.arc(64+Math.cos(e)*t,64+Math.sin(e)*t,n.range(1.5,3.5),0,7),r.fill()}let i=Fd(e,{srgb:!1});return i.wrapS=i.wrapT=t,i}),D=()=>i(`hardFlare`,()=>{let[e,t]=Pd(128,128),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.18,`rgba(255,244,214,0.85)`),n.addColorStop(.5,`rgba(255,190,120,0.22)`),n.addColorStop(1,`rgba(255,160,80,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.globalCompositeOperation=`lighter`,n=t.createLinearGradient(0,60,128,68),n.addColorStop(0,`rgba(255,230,180,0)`),n.addColorStop(.5,`rgba(255,240,210,0.7)`),n.addColorStop(1,`rgba(255,230,180,0)`),t.fillStyle=n,t.fillRect(0,58,128,12),t.fillRect(58,0,12,128),Fd(e,{srgb:!1})}),O=()=>i(`scorch`,()=>{let[e,r]=Pd(256,256),i=r.createRadialGradient(128,128,6,128,128,120);i.addColorStop(0,`rgba(14,12,10,0.9)`),i.addColorStop(.4,`rgba(22,18,14,0.7)`),i.addColorStop(.75,`rgba(30,26,20,0.28)`),i.addColorStop(1,`rgba(30,26,20,0)`),r.fillStyle=i,r.fillRect(0,0,256,256);for(let e=0;e<46;e++){let e=n.next()*7,t=n.range(60,125);r.strokeStyle=`rgba(16,14,12,${n.range(.15,.5)})`,r.lineWidth=n.range(2,8),r.beginPath(),r.moveTo(128+Math.cos(e)*30,128+Math.sin(e)*30),r.lineTo(128+Math.cos(e)*t,128+Math.sin(e)*t),r.stroke()}let a=Fd(e,{srgb:!1});return a.wrapS=a.wrapT=t,a}),k=()=>i(`scrub`,()=>{let[e,r]=Pd(128,128);r.strokeStyle=`rgba(96,92,52,0.9)`;for(let e=0;e<60;e++){let e=64+n.range(-8,8);r.strokeStyle=`rgba(${90+n.int(0,30)},${86+n.int(0,26)},${44+n.int(0,20)},0.9)`,r.lineWidth=n.range(1,2.4),r.beginPath(),r.moveTo(e,128);let t=n.range(-34,34);r.quadraticCurveTo(e+t*.4,78,e+t,n.range(18,62)),r.stroke()}let i=Fd(e);return i.wrapS=i.wrapT=t,i}),ee=()=>i(`grassTuft`,()=>{let[e,r]=Pd(128,128);for(let e=0;e<90;e++){let e=64+n.range(-14,14);r.strokeStyle=`rgba(${168+n.int(0,40)},${146+n.int(0,34)},${86+n.int(0,26)},${n.range(.65,.95)})`,r.lineWidth=n.range(.7,1.5),r.beginPath(),r.moveTo(e,128);let t=n.range(-30,30);r.quadraticCurveTo(e+t*.3,84,e+t,n.range(26,70)),r.stroke()}for(let e=0;e<26;e++)r.fillStyle=`rgba(198,178,120,${n.range(.5,.85)})`,r.fillRect(n.range(24,104),n.range(24,62),1.6,n.range(2,4));let i=Fd(e);return i.wrapS=i.wrapT=t,i}),A=()=>i(`roadLine`,()=>{let[e,t]=Pd(64,256);t.clearRect(0,0,64,256),t.fillStyle=`rgba(210,200,170,0.75)`,t.fillRect(24,20,16,100);for(let e=0;e<60;e++)t.clearRect(n.next()*64,n.next()*256,3,3);return Fd(e,{repeat:[1,6]})}),j=()=>i(`sandOverlay`,()=>{let[e,n]=Pd(1024,1024),r=n.createImageData(1024,1024),i=r.data;for(let e=0;e<1024;e++)for(let t=0;t<1024;t++){let n=(e*1024+t)*4,r=(t*.86-e*.51)/210,a=(t*.51+e*.86)/74,o=jd(r+7.7,a-3.1,3),s=jd(t/260+19,e/260-8,4),c=Cd((.46-o)*2.6,0,1)*.55+Cd((.42-s)*2.2,0,1)*.7,l=Cd((s-.62)*3.2,0,1);c>=l?(i[n]=118,i[n+1]=92,i[n+2]=62,i[n+3]=Math.min(200,c*148)):(i[n]=222,i[n+1]=208,i[n+2]=172,i[n+3]=l*96);let u=(t-512)/512,d=(e-512)/512,f=Math.sqrt(u*u+d*d);i[n+3]*=Cd((1-f)*2.6,0,1)}n.putImageData(r,0,0);let a=Fd(e,{srgb:!0,aniso:8});return a.wrapS=a.wrapT=t,a}),M=new bd(24601);return{sand:a,concrete:o,asphalt:s,gravel:c,sandTracks:l,desertTan:d,oliveDrab:f,metalPlate:p,heatBurn:m,hazardStripes:h,chainlink:g,hescoFabric:_,woodPallet:v,label:y,roundel:b,arrowDecal:x,mapBoard:S,statusScreen:C,softPuff:w,blobShadow:T,oilStain:E,hardFlare:D,scorch:O,scrub:k,grassTuft:ee,roadLine:A,noiseTex:()=>i(`noise`,()=>{let[t,n]=Pd(256,256),r=n.createImageData(256,256);for(let e=0;e<256;e++)for(let t=0;t<256;t++){let n=(e*256+t)*4,i=jd(t/34,e/34,4)*255;r.data[n]=r.data[n+1]=r.data[n+2]=i,r.data[n+3]=255}n.putImageData(r,0,0);let i=Fd(t,{srgb:!1,repeat:[1,1]});return i.wrapS=i.wrapT=e,i}),sandOverlay:j,interiorWall:()=>i(`interiorWall`,()=>{let[e,t]=Pd(512,640);t.fillStyle=`#565b52`,t.fillRect(0,0,512,438),t.fillStyle=`#41453e`,t.fillRect(0,438,512,202);let n=t.getImageData(0,0,512,640),r=n.data;for(let e=0;e<r.length;e+=4){let t=(M.next()-.5)*9;r[e]+=t,r[e+1]+=t,r[e+2]+=t}t.putImageData(n,0,0),t.fillStyle=`rgba(24,26,22,0.5)`;for(let e=14;e<426;e+=11)for(let n=8+Math.floor(e/11)%2*5.5;n<512;n+=11)t.beginPath(),t.arc(n+M.range(-.7,.7),e+M.range(-.7,.7),1.15,0,7),t.fill();for(let e=0;e<=512;e+=128){let n=Math.min(509,Math.max(3,e));t.fillStyle=`rgba(16,18,15,0.55)`,t.fillRect(n-2.5,0,5,640),t.fillStyle=`rgba(150,156,142,0.28)`,t.fillRect(n-3.5,0,1.6,640),t.fillStyle=`rgba(10,12,10,0.4)`,t.fillRect(n+2,0,1.4,640)}t.fillStyle=`rgba(20,22,18,0.6)`,t.fillRect(0,437,512,7),t.fillStyle=`#6a7062`,t.fillRect(0,432,512,5),t.fillStyle=`rgba(220,226,208,0.18)`,t.fillRect(0,432,512,1.4);let i=t.createLinearGradient(0,0,0,46);i.addColorStop(0,`rgba(8,10,8,0.5)`),i.addColorStop(1,`rgba(8,10,8,0)`),t.fillStyle=i,t.fillRect(0,0,512,46),t.fillStyle=`#31342e`,t.fillRect(0,614,512,26),t.fillStyle=`rgba(228,232,220,0.10)`,t.fillRect(0,614,512,2),i=t.createLinearGradient(0,580,0,640),i.addColorStop(0,`rgba(12,13,11,0)`),i.addColorStop(1,`rgba(12,13,11,0.34)`),t.fillStyle=i,t.fillRect(0,580,512,60);for(let e=0;e<=512;e+=128){let n=Math.min(504,Math.max(8,e));for(let e=26;e<610;e+=52)t.fillStyle=`rgba(26,28,24,0.8)`,t.beginPath(),t.arc(n,e,2.2,0,7),t.fill(),t.fillStyle=`rgba(168,174,158,0.42)`,t.beginPath(),t.arc(n-.7,e-.7,.9,0,7),t.fill()}for(let e=0;e<110;e++){let e=M.next()*512,n=438+M.next()**1.6*194;t.fillStyle=`rgba(20,22,19,${M.range(.07,.24)})`,t.fillRect(e,n,M.range(4,24),M.range(1,3.4))}for(let e=0;e<34;e++){t.strokeStyle=`rgba(168,172,158,${M.range(.04,.1)})`,t.lineWidth=M.range(.5,1.2);let e=M.next()*512,n=M.next()*438;t.beginPath(),t.moveTo(e,n),t.lineTo(e+M.range(-26,26),n+M.range(-7,7)),t.stroke()}return Fd(e,{repeat:[1,1],aniso:4})}),interiorCeiling:()=>i(`interiorCeiling`,()=>{let[e,t]=Pd(256,256);t.fillStyle=`#aeb2a6`,t.fillRect(0,0,256,256);let n=t.getImageData(0,0,256,256),r=n.data;for(let e=0;e<r.length;e+=4){let t=(M.next()-.5)*7;r[e]+=t,r[e+1]+=t,r[e+2]+=t}t.putImageData(n,0,0),t.strokeStyle=`rgba(60,64,56,0.5)`,t.lineWidth=2;for(let e=0;e<=256;e+=128){let n=Math.min(255,Math.max(1,e));t.beginPath(),t.moveTo(n,0),t.lineTo(n,256),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(256,n),t.stroke()}t.strokeStyle=`rgba(232,236,224,0.25)`,t.lineWidth=1;for(let e=0;e<=256;e+=128){let n=Math.min(254,Math.max(2,e))-2;t.beginPath(),t.moveTo(n,0),t.lineTo(n,256),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(256,n),t.stroke()}t.fillStyle=`rgba(70,74,64,0.55)`;for(let e=0;e<=256;e+=128)for(let n=0;n<=256;n+=128)t.beginPath(),t.arc(Math.min(248,Math.max(8,n)),Math.min(248,Math.max(8,e)),2,0,7),t.fill();for(let e=0;e<5;e++){let e=M.next()*256,n=M.next()*256,r=M.range(14,42),i=t.createRadialGradient(e,n,2,e,n,r);i.addColorStop(0,`rgba(122,116,92,0.13)`),i.addColorStop(1,`rgba(122,116,92,0)`),t.fillStyle=i,t.fillRect(e-r,n-r,r*2,r*2)}return Fd(e,{repeat:[1,1],aniso:4})}),paintedFloor:()=>i(`paintedFloor`,()=>{let[e,n]=Pd(768,512);n.fillStyle=`#4b4f4b`,n.fillRect(0,0,768,512);let r=n.getImageData(0,0,768,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(M.next()-.5)*10;i[e]+=t,i[e+1]+=t,i[e+2]+=t}n.putImageData(r,0,0);for(let e=0;e<512;e+=49)for(let t=0;t<768;t+=49){let r=M.int(-5,5);n.fillStyle=`rgba(${74+r},${78+r},${74+r},0.42)`,n.fillRect(t+1,e+1,47,47)}n.strokeStyle=`rgba(30,32,29,0.55)`,n.lineWidth=1.4;for(let e=0;e<=768;e+=49)n.beginPath(),n.moveTo(e,0),n.lineTo(e,512),n.stroke();for(let e=0;e<=512;e+=49)n.beginPath(),n.moveTo(0,e),n.lineTo(768,e),n.stroke();n.strokeStyle=`rgba(178,170,122,0.32)`,n.lineWidth=9,n.strokeRect(30,30,708,452),n.save(),n.translate(526,498);for(let e=-4;e<5;e++)n.fillStyle=e%2?`rgba(180,152,44,0.6)`:`rgba(26,26,26,0.6)`,n.beginPath(),n.moveTo(e*17,12),n.lineTo(e*17+8,-16),n.lineTo(e*17+17,-16),n.lineTo(e*17+9,12),n.fill();n.restore();let a=(e,t,r,i,a,o=.3,s=.1)=>{let c=n.createLinearGradient(e,t,r,i);c.addColorStop(0,`rgba(36,38,35,${o})`),c.addColorStop(1,`rgba(36,38,35,${s})`),n.strokeStyle=c,n.lineWidth=a,n.lineCap=`round`,n.beginPath(),n.moveTo(e,t),n.lineTo(r,i),n.stroke()},o=e=>(e+4.34)/8.68*768,s=e=>(e+2.84)/5.68*512;a(o(1.6),s(2.6),o(-1.2),s(-.9),46),a(o(1.6),s(2.6),o(2.35),s(.6),40),a(o(-1.2),s(-1),o(-2.9),s(-1.05),34,.22,.16),a(o(-3.5),s(-.9),o(-3.6),s(.9),26,.18,.12);for(let[e,t]of[[-1.25,-1.15],[-2.9,-1.2]]){let r=n.createRadialGradient(o(e),s(t),4,o(e),s(t),34);r.addColorStop(0,`rgba(30,32,29,0.4)`),r.addColorStop(1,`rgba(30,32,29,0)`),n.fillStyle=r,n.fillRect(o(e)-36,s(t)-36,72,72)}for(let e=0;e<230;e++)n.fillStyle=`rgba(26,28,25,${M.range(.05,.16)})`,n.fillRect(M.next()*768,M.next()*512,M.range(2,9),M.range(1,3));for(let e=0;e<26;e++)n.fillStyle=`rgba(148,152,144,${M.range(.08,.2)})`,n.fillRect(M.next()*768,M.next()*512,M.range(1.5,4),M.range(1,3));let c=(e,t,r,i)=>{let a=n.createLinearGradient(e,t,r,i);a.addColorStop(0,`rgba(10,11,10,0.4)`),a.addColorStop(1,`rgba(10,11,10,0)`),n.fillStyle=a,n.fillRect(Math.min(e,r),Math.min(t,i),Math.abs(r-e)||768,Math.abs(i-t)||512)};c(0,0,40,0),c(768,0,728,0),c(0,0,0,40),c(0,512,0,472);let l=Fd(e,{aniso:6});return l.wrapS=l.wrapT=t,l}),rackFace:()=>i(`rackFace`,()=>{let[e,t]=Pd(256,512);t.fillStyle=`#22252a`,t.fillRect(0,0,256,512),t.fillStyle=`#31353a`,t.fillRect(0,0,15,512),t.fillRect(241,0,15,512),t.font=`6px monospace`,t.textAlign=`left`;let n=1;for(let e=10;e<512;e+=24)t.fillStyle=`rgba(150,156,164,0.55)`,t.fillRect(5,e,4,4),t.fillRect(247,e,4,4),t.fillStyle=`rgba(120,126,132,0.5)`,n%2==0&&t.fillText(String(n).padStart(2,`0`),2,e-3),n++;let r=(e,n,r,i=.6)=>{t.fillStyle=`rgba(198,206,192,${i})`,t.font=`7px monospace`,t.fillText(e,n,r)},i=8,a=[`meter`,`vent`,`patch`,`breaker`,`digital`,`vent`,`knobs`,`blank`,`meter`,`patch`,`digital`,`vent`,`breaker`,`knobs`],o=0;for(;i<480;){let e=a[o++%a.length],n=e===`blank`?22:e===`vent`?34:e===`patch`?56:e===`breaker`?44:52;if(i+n>496)break;if(t.fillStyle=M.pick([`#2c3034`,`#33373c`,`#2b2f27`,`#383c32`,`#30343a`]),t.fillRect(16,i,224,n-5),t.strokeStyle=`rgba(0,0,0,0.6)`,t.strokeRect(16.5,i+.5,223,n-6),t.fillStyle=`rgba(255,255,255,0.07)`,t.fillRect(16,i,224,1.6),n>30&&(t.fillStyle=`#15181b`,t.fillRect(21,i+5,7,n-15),t.fillRect(228,i+5,7,n-15),t.fillStyle=`rgba(255,255,255,0.08)`,t.fillRect(21,i+5,2,n-15),t.fillRect(228,i+5,2,n-15)),e===`meter`){for(let e of[70,150]){t.fillStyle=`#0d0f11`,t.fillRect(e-22,i+7,44,26),t.strokeStyle=`rgba(210,216,200,0.5)`,t.lineWidth=1,t.beginPath(),t.arc(e,i+30,17,Math.PI*1.15,Math.PI*1.85),t.stroke();let n=Math.PI*M.range(1.25,1.75);t.strokeStyle=`rgba(255,180,80,0.9)`,t.beginPath(),t.moveTo(e,i+30),t.lineTo(e+Math.cos(n)*15,i+30+Math.sin(n)*15),t.stroke()}r(`PWR MON`,100,i+n-9)}else if(e===`vent`){t.fillStyle=`rgba(12,13,15,0.85)`;for(let e=42;e<200;e+=9)t.fillRect(e,i+6,5,n-16)}else if(e===`patch`){for(let e=0;e<2;e++)for(let n=0;n<10;n++){let r=40+n*19,a=i+13+e*20;t.fillStyle=`#0c0e10`,t.beginPath(),t.arc(r,a,4.6,0,7),t.fill(),t.strokeStyle=`rgba(190,196,184,0.4)`,t.beginPath(),t.arc(r,a,4.6,0,7),t.stroke()}for(let e=0;e<4;e++){let e=40+M.int(0,9)*19,n=40+M.int(0,9)*19;t.strokeStyle=M.pick([`rgba(180,150,60,0.85)`,`rgba(90,140,180,0.85)`,`rgba(160,80,70,0.85)`]),t.lineWidth=2,t.beginPath(),t.moveTo(e,i+13),t.quadraticCurveTo((e+n)/2,i+40,n,i+33),t.stroke()}r(`XFER BAY`,100,i+n-9)}else if(e===`breaker`){for(let e=0;e<8;e++){let n=42+e*22,r=M.next()<.8;t.fillStyle=`#101214`,t.fillRect(n,i+8,12,24),t.fillStyle=r?`#c8cfc2`:`#5a5f56`,t.fillRect(n+2,r?i+10:i+20,8,10)}r(`DC DIST`,100,i+n-9)}else if(e===`digital`)t.fillStyle=`#050b07`,t.fillRect(40,i+8,160,18),t.font=`bold 11px monospace`,t.fillStyle=`rgba(120,235,150,0.9)`,t.fillText(M.pick([`TX 4.72 GHZ`,`SYNC LOCK`,`BIT PASS`,`CH 04 ACT`,`PRF 1240`]),48,i+21),r(M.pick([`SIG PROC`,`IFF CODER`,`RX CHAIN`,`CRYPTO`]),100,i+n-9);else if(e===`knobs`){for(let e=0;e<4;e++){let n=60+e*34;t.fillStyle=`#15181b`,t.beginPath(),t.arc(n,i+18,8,0,7),t.fill(),t.strokeStyle=`rgba(190,196,202,0.4)`,t.beginPath(),t.arc(n,i+18,8,0,7),t.stroke();let r=M.next()*6.28;t.strokeStyle=`rgba(230,234,226,0.8)`,t.beginPath(),t.moveTo(n,i+18),t.lineTo(n+Math.cos(r)*7,i+18+Math.sin(r)*7),t.stroke()}r(`GAIN SET`,100,i+n-9)}i+=n}for(let e=0;e<80;e++)t.fillStyle=`rgba(0,0,0,${M.range(.05,.18)})`,t.fillRect(M.next()*256,M.next()*512,M.range(2,8),M.range(1,3));for(let e=0;e<24;e++)t.fillStyle=`rgba(170,176,168,${M.range(.06,.16)})`,t.fillRect(M.pick([15,16,239,240]),M.next()*512,1.5,M.range(2,8));return Fd(e,{aniso:4})}),tireMarks:()=>i(`tireMarks`,()=>{let[e,r]=Pd(128,256);r.clearRect(0,0,128,256);for(let e of[40,88]){let t=r.createLinearGradient(e-12,0,e+12,0);t.addColorStop(0,`rgba(24,23,22,0)`),t.addColorStop(.35,`rgba(24,23,22,0.34)`),t.addColorStop(.5,`rgba(20,19,18,0.42)`),t.addColorStop(.65,`rgba(24,23,22,0.34)`),t.addColorStop(1,`rgba(24,23,22,0)`),r.fillStyle=t,r.fillRect(e-12,0,24,256);for(let t=0;t<256;t+=6)r.fillStyle=`rgba(14,13,12,${n.range(.1,.3)})`,r.fillRect(e-8+n.range(-1.5,1.5),t,16,n.range(1.6,3))}for(let e=0;e<160;e++)r.clearRect(n.next()*128,n.next()*256,3,2);for(let[e,t]of[[0,40],[256,216]]){let n=r.createLinearGradient(0,e,0,t);n.addColorStop(0,`rgba(0,0,0,1)`),n.addColorStop(1,`rgba(0,0,0,0)`),r.globalCompositeOperation=`destination-out`,r.fillStyle=n,r.fillRect(0,Math.min(e,t),128,Math.abs(t-e)),r.globalCompositeOperation=`source-over`}let i=Fd(e);return i.wrapS=i.wrapT=t,i}),paintStripe:()=>i(`paintStripe`,()=>{let[r,i]=Pd(64,512);i.clearRect(0,0,64,512),i.fillStyle=`rgba(228,222,204,0.92)`,i.fillRect(14,0,36,512);for(let e=0;e<300;e++){let e=n.next()<.5?n.range(10,22):n.range(42,54);i.clearRect(e,n.next()*512,n.range(2,6),n.range(2,7))}for(let e=0;e<140;e++)i.clearRect(n.range(14,50),n.next()*512,n.range(1,4),n.range(1,5));let a=Fd(r);return a.wrapS=t,a.wrapT=e,a}),drainGrate:()=>i(`drainGrate`,()=>{let[e,r]=Pd(128,192);r.fillStyle=`#43464a`,r.fillRect(0,0,128,192),r.strokeStyle=`rgba(210,214,220,0.35)`,r.lineWidth=3,r.strokeRect(3,3,122,186),r.fillStyle=`#0c0d0f`;for(let e=14;e<180;e+=16)r.fillRect(12,e,104,9);r.fillStyle=`rgba(255,255,255,0.12)`;for(let e=12;e<178;e+=16)r.fillRect(12,e,104,2);for(let e=0;e<26;e++)r.fillStyle=`rgba(112,74,40,${n.range(.08,.2)})`,r.fillRect(n.next()*128,n.next()*192,n.range(3,9),n.range(2,5));let i=Fd(e,{aniso:4});return i.wrapS=i.wrapT=t,i}),radarArray:()=>i(`radarArray`,()=>{let[e,t]=Pd(512,384);t.fillStyle=`#4c5142`,t.fillRect(0,0,512,384);let r=t.getImageData(0,0,512,384),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*10;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=26;e<360;e+=17)for(let r=30;r<484;r+=17){let i=n.int(-10,10);t.fillStyle=`rgba(${34+i},${38+i},${32+i},0.95)`,t.beginPath(),t.arc(r,e,5.4,0,7),t.fill(),t.fillStyle=`rgba(150,160,140,0.28)`,t.beginPath(),t.arc(r-1.4,e-1.4,1.6,0,7),t.fill()}t.strokeStyle=`rgba(24,26,22,0.6)`,t.lineWidth=2;for(let e=128;e<512;e+=128)t.beginPath(),t.moveTo(e,12),t.lineTo(e,372),t.stroke();return t.beginPath(),t.moveTo(12,192),t.lineTo(500,192),t.stroke(),t.save(),t.strokeStyle=`rgba(180,150,40,0.5)`,t.lineWidth=8,t.strokeRect(8,8,496,368),t.restore(),t.fillStyle=`rgba(210,206,188,0.7)`,t.font=`bold 15px Arial`,t.textAlign=`left`,t.fillText(`AN/VPS-9 · NO STEP`,20,378),Fd(e,{aniso:4})}),noticeBoard:()=>i(`noticeBoard`,()=>{let[e,r]=Pd(256,192);r.fillStyle=`#7a6242`,r.fillRect(0,0,256,192);for(let e=0;e<600;e++)r.fillStyle=`rgba(${90+n.int(0,50)},${70+n.int(0,40)},${44+n.int(0,26)},0.4)`,r.fillRect(n.next()*256,n.next()*192,2,2);r.strokeStyle=`#3a3d33`,r.lineWidth=8,r.strokeRect(4,4,248,184);for(let e=0;e<7;e++){let e=n.range(16,190),t=n.range(16,120),i=n.range(34,60),a=n.range(40,62);r.save(),r.translate(e+i/2,t+a/2),r.rotate(n.range(-.16,.16)),r.fillStyle=n.pick([`#ddd8c8`,`#d8d2be`,`#cfd6c8`,`#e2d8a8`]),r.fillRect(-i/2,-a/2,i,a),r.fillStyle=`rgba(60,60,58,0.7)`;for(let e=0;e<a-16;e+=7)r.fillRect(-i/2+5,-a/2+8+e,i*n.range(.5,.85),2);r.fillStyle=n.pick([`#a02020`,`#204880`,`#207040`]),r.beginPath(),r.arc(0,-a/2+4,3,0,7),r.fill(),r.restore()}let i=Fd(e,{aniso:4});return i.wrapS=i.wrapT=t,i}),consolePanel:()=>i(`consolePanel`,()=>{let[e,t]=Pd(512,256);t.fillStyle=`#2b2e31`,t.fillRect(0,0,512,256);let n=t.getImageData(0,0,512,256),r=n.data;for(let e=0;e<r.length;e+=4){let t=(M.next()-.5)*7;r[e]+=t,r[e+1]+=t,r[e+2]+=t}t.putImageData(n,0,0);for(let e=0;e<90;e++){t.strokeStyle=`rgba(210,216,222,${M.range(.015,.05)})`,t.lineWidth=1;let e=M.next()*256;t.beginPath(),t.moveTo(0,e),t.lineTo(512,e+M.range(-2,2)),t.stroke()}let i=(e,n,r,i,a)=>{t.strokeStyle=`rgba(196,204,196,0.4)`,t.lineWidth=1.2,t.strokeRect(e+.5,n+.5,r,i),t.fillStyle=`#2b2e31`;let o=t.measureText(a).width+8;t.fillRect(e+10,n-5,o,10),t.fillStyle=`rgba(206,214,206,0.7)`,t.font=`bold 9px monospace`,t.textAlign=`left`,t.fillText(a,e+14,n+3)};t.font=`bold 9px monospace`,i(14,22,150,92,`RADAR SET`),i(180,22,150,92,`IFF / DATALINK`),i(346,22,152,92,`LAUNCH AUTH`),i(14,138,234,96,`AZ-EL SERVO`),i(264,138,234,96,`DISPLAY / DIM`),t.font=`7px monospace`,t.fillStyle=`rgba(196,204,196,0.6)`;let a=[`XMIT`,`STBY`,`MTI`,`CFAR`,`M4 ON`,`CODE A`,`NET 1`,`NET 2`,`ARM`,`SAFE`,`SLAVE`,`AUTO`];for(let e=0;e<12;e++)14+e%4*41+Math.floor(e/4)*166,t.fillText(a[e],20+e%4*38+Math.floor(e/4)*166,104);for(let e=0;e<6;e++)t.fillText([`AZ`,`EL`,`SLEW`,`BRT`,`CONT`,`PHOS`][e],30+e*78,226);t.fillStyle=`rgba(16,17,19,0.9)`;for(let[e,n]of[[8,8],[504,8],[8,248],[504,248],[256,8],[256,248]])t.beginPath(),t.arc(e,n,3.2,0,7),t.fill(),t.strokeStyle=`rgba(180,186,192,0.5)`,t.lineWidth=1,t.beginPath(),t.moveTo(e-2,n),t.lineTo(e+2,n),t.stroke(),t.fillStyle=`rgba(16,17,19,0.9)`;for(let e=0;e<40;e++){t.fillStyle=`rgba(150,156,160,${M.range(.08,.22)})`;let e=M.next()<.5;t.fillRect(e?M.pick([M.range(0,20),M.range(492,510)]):M.next()*512,e?M.next()*256:M.pick([M.range(0,12),M.range(244,254)]),M.range(1,4),M.range(1,3))}return Fd(e,{aniso:4})}),keyboard:()=>i(`keyboard`,()=>{let[e,t]=Pd(256,96);t.fillStyle=`#26292c`,t.fillRect(0,0,256,96),t.strokeStyle=`rgba(0,0,0,0.6)`,t.strokeRect(1,1,254,94);let n=(e,n,r,i,a=0)=>{t.fillStyle=a?`rgba(${90+a*60},${120+a*40},90,0.9)`:`#3a3e42`,t.fillRect(e,n,r,i),t.fillStyle=`rgba(255,255,255,0.10)`,t.fillRect(e,n,r,1.6),t.fillStyle=`rgba(0,0,0,0.5)`,t.fillRect(e,n+i-1.6,r,1.6)};for(let e=0;e<14;e++)n(6+e*15,8,12,10,+(e>10&&M.next()<.5));for(let e=0;e<3;e++)for(let t=0;t<13;t++)n(8+e*3+t*15,24+e*15,12,11);n(52,70,96,12),n(14,70,30,12),n(156,70,24,12),n(186,70,24,12),t.fillStyle=`rgba(220,226,220,0.4)`;for(let e=0;e<3;e++)for(let n=0;n<13;n++)t.fillRect(12+e*3+n*15,28+e*15,3,2);return Fd(e,{aniso:4})}),annunciator:()=>i(`annunciator`,()=>{let[e,n]=Pd(384,160);n.fillStyle=`#17191b`,n.fillRect(0,0,384,160);let r=[[`WPN TIGHT`,`#e8b83a`,1],[`RADIATE`,`#57d879`,1],[`HOLD FIRE`,`#e8b83a`,0],[`LINK OK`,`#57d879`,1],[`FAULT`,`#e05648`,0],[`AUTH`,`#e05648`,1],[`DRILL`,`#57a8d8`,0],[`PWR A`,`#57d879`,1]];for(let e=0;e<8;e++){let t=8+e%4*94,i=12+Math.floor(e/4)*72,[a,o,s]=r[e];if(n.fillStyle=s?o:`#232527`,n.fillRect(t,i,84,62),s){let e=n.createRadialGradient(t+42,i+31,4,t+42,i+31,52);e.addColorStop(0,`rgba(255,255,255,0.32)`),e.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=e,n.fillRect(t,i,84,62)}n.strokeStyle=`rgba(0,0,0,0.85)`,n.lineWidth=3,n.strokeRect(t+1.5,i+1.5,81,59),n.strokeStyle=`rgba(255,255,255,0.10)`,n.lineWidth=1,n.strokeRect(t-.5,i-.5,85,63),n.font=`bold 13px Arial`,n.textAlign=`center`,n.fillStyle=s?`rgba(20,16,8,0.9)`:`rgba(130,134,128,0.75)`,n.fillText(a,t+42,i+36)}let i=Fd(e,{aniso:4});return i.wrapS=i.wrapT=t,i}),clockFace:(e,n,r)=>i(`clock:`+e,()=>{let[i,a]=Pd(128,128);a.fillStyle=`#dfe2d8`,a.beginPath(),a.arc(64,64,60,0,7),a.fill(),a.strokeStyle=`#22251f`,a.lineWidth=5,a.beginPath(),a.arc(64,64,59,0,7),a.stroke();for(let e=0;e<12;e++){let t=e/12*Math.PI*2;a.strokeStyle=`#3a3d33`,a.lineWidth=e%3==0?3:1.6,a.beginPath(),a.moveTo(64+Math.cos(t)*48,64+Math.sin(t)*48),a.lineTo(64+Math.cos(t)*54,64+Math.sin(t)*54),a.stroke()}a.font=`bold 10px Arial`,a.textAlign=`center`,a.fillStyle=`#3a3d33`,a.fillText(e,64,92),a.strokeStyle=`#22251f`,a.lineWidth=3.4,a.beginPath(),a.moveTo(64,64),a.lineTo(64+Math.cos(n)*28,64+Math.sin(n)*28),a.stroke(),a.lineWidth=2.2,a.beginPath(),a.moveTo(64,64),a.lineTo(64+Math.cos(r)*44,64+Math.sin(r)*44),a.stroke(),a.strokeStyle=`#a03428`,a.lineWidth=1.2;let o=r+2.4;a.beginPath(),a.moveTo(64-Math.cos(o)*10,64-Math.sin(o)*10),a.lineTo(64+Math.cos(o)*46,64+Math.sin(o)*46),a.stroke(),a.fillStyle=`#22251f`,a.beginPath(),a.arc(64,64,3,0,7),a.fill();let s=Fd(i);return s.wrapS=s.wrapT=t,s}),binderSpines:()=>i(`binderSpines`,()=>{let[e,n]=Pd(256,128);n.fillStyle=`#1c1e1b`,n.fillRect(0,0,256,128);let r=4,i=[`#5c6248`,`#7a4438`,`#3d4a55`,`#8a7a4a`,`#4a4f38`,`#6e5a3a`,`#54563e`,`#42473a`],a=0;for(;r<240;){let e=M.range(20,34),t=M.next()<.15?M.range(-6,6):0;n.save(),n.translate(r+e/2,126),n.rotate(t*.02),n.fillStyle=i[a++%i.length],n.fillRect(-e/2,-118,e,118),n.fillStyle=`rgba(0,0,0,0.3)`,n.fillRect(-e/2,-118,2.5,118),n.fillStyle=`rgba(255,255,255,0.12)`,n.fillRect(e/2-2.5,-118,2.5,118),n.fillStyle=`rgba(220,222,210,0.85)`,n.fillRect(-e/2+3,-86,e-6,26),n.fillStyle=`rgba(60,60,56,0.8)`;for(let t=0;t<3;t++)n.fillRect(-e/2+5,-80+t*6,(e-10)*M.range(.5,.9),2);n.fillStyle=`rgba(0,0,0,0.4)`,n.beginPath(),n.arc(0,-104,2.5,0,7),n.fill(),n.restore(),r+=e+2}let o=Fd(e,{aniso:4});return o.wrapS=o.wrapT=t,o}),exitSign:()=>i(`exitSign`,()=>{let[e,n]=Pd(128,48);n.fillStyle=`#0c2414`,n.fillRect(0,0,128,48),n.strokeStyle=`rgba(140,235,170,0.8)`,n.lineWidth=2,n.strokeRect(2,2,124,44),n.font=`bold 28px Arial`,n.textAlign=`center`,n.fillStyle=`#7bef9e`,n.fillText(`EXIT`,58,34),n.beginPath(),n.moveTo(100,24),n.lineTo(114,24),n.moveTo(108,17),n.lineTo(115,24),n.lineTo(108,31),n.strokeStyle=`#7bef9e`,n.lineWidth=3,n.stroke();let r=Fd(e);return r.wrapS=r.wrapT=t,r}),floorChannel:()=>i(`floorChannel`,()=>{let[n,r]=Pd(64,256);r.fillStyle=`#585c52`,r.fillRect(0,0,64,256),r.fillStyle=`rgba(138,132,112,0.55)`,r.fillRect(0,0,7,256),r.fillRect(57,0,7,256),r.fillStyle=`rgba(0,0,0,0.28)`;for(let e=4;e<256;e+=12)r.fillRect(10,e,44,3);r.fillStyle=`rgba(255,255,255,0.12)`;for(let e=2;e<256;e+=12)r.fillRect(10,e,44,1.6);for(let e=14;e<256;e+=48)for(let t of[12,52])r.fillStyle=`rgba(10,11,10,0.9)`,r.beginPath(),r.arc(t,e,2.6,0,7),r.fill(),r.fillStyle=`rgba(200,206,198,0.4)`,r.beginPath(),r.arc(t-.8,e-.8,1,0,7),r.fill();for(let e=0;e<40;e++)r.fillStyle=`rgba(150,150,140,${M.range(.04,.12)})`,r.fillRect(M.next()*64,M.next()*256,M.range(1,4),M.range(1,3));let i=Fd(n,{aniso:4});return i.wrapS=t,i.wrapT=e,i}),holoRing:()=>i(`holoRing`,()=>{let[e,n]=Pd(512,512);n.clearRect(0,0,512,512),n.beginPath(),n.arc(256,256,254,0,7),n.arc(256,256,206,0,7,!0),n.fillStyle=`#2e3236`,n.fill();for(let e=0;e<250;e++){let e=M.next()*6.29,t=M.range(207,252);n.strokeStyle=`rgba(210,218,224,${M.range(.02,.07)})`,n.lineWidth=1,n.beginPath(),n.arc(256,256,t,e,e+M.range(.1,.5)),n.stroke()}for(let e=0;e<360;e+=5){let t=(e-90)/180*Math.PI,r=e%30==0;n.strokeStyle=r?`rgba(140,235,240,0.85)`:`rgba(140,235,240,0.4)`,n.lineWidth=r?2.4:1.2;let i=r?214:222;n.beginPath(),n.moveTo(256+Math.cos(t)*i,256+Math.sin(t)*i),n.lineTo(256+Math.cos(t)*236,256+Math.sin(t)*236),n.stroke(),r&&(n.save(),n.translate(256+Math.cos(t)*245,256+Math.sin(t)*245),n.rotate(t+Math.PI/2),n.font=`bold 13px monospace`,n.textAlign=`center`,n.fillStyle=`rgba(150,240,244,0.9)`,n.fillText(String(e).padStart(3,`0`),0,4),n.restore())}let r=Fd(e,{aniso:6});return r.wrapS=r.wrapT=t,r}),clipboard:()=>i(`clipboard`,()=>{let[e,n]=Pd(96,128);n.fillStyle=`#8a6f4a`,n.fillRect(0,0,96,128),n.fillStyle=`#ddd8c4`,n.fillRect(6,12,84,110),n.fillStyle=`#4a4d44`,n.fillRect(34,2,28,14),n.font=`bold 7px Arial`,n.textAlign=`left`,n.fillStyle=`rgba(50,52,48,0.9)`,n.fillText(`CREW ROTA — WK 31`,10,24);for(let e=0;e<9;e++)n.strokeStyle=`rgba(70,72,66,0.5)`,n.strokeRect(10.5,30.5+e*10,5,5),M.next()<.6&&(n.strokeStyle=`rgba(40,60,120,0.8)`,n.beginPath(),n.moveTo(11,33+e*10),n.lineTo(13,35.5+e*10),n.lineTo(16,30.5+e*10),n.stroke()),n.fillStyle=`rgba(60,62,58,0.7)`,n.fillRect(20,32+e*10,55*M.range(.5,1),1.8);let r=Fd(e,{aniso:4});return r.wrapS=r.wrapT=t,r})}}var Ld=9.81,Rd=new W,zd=new W;function Bd(e,t,n,r=new W){return r.subVectors(t,e).divideScalar(n),r.y+=.5*Ld*n,r}function Vd(e,t,n,r=new W){return r.set(e.x+t.x*n,e.y+t.y*n-.5*Ld*n*n,e.z+t.z*n),r}function Hd(e,t,n,r,i=new W){let a=e.x,o=e.y,s=e.z,c=t.x,l=t.y,u=t.z,d=r;for(;d>0;){let e=Math.min(.25,d);d-=e,l-=Ld*e;let t=Math.sqrt(c*c+l*l+u*u);if(t>1){let r=Math.max(0,1-n*t*e);c*=r,l*=r,u*=r}a+=c*e,o+=l*e,s+=u*e}return i.set(a,o,s),i}function Ud(e,t,n=0){let r=-.5*Ld,i=t.y,a=e.y-n,o=i*i-4*r*a;if(o<0)return-1;let s=Math.sqrt(o),c=(-i+s)/(2*r),l=(-i-s)/(2*r),u=Math.max(c,l);return u>0?u:-1}function Wd(e,t,n,r,i=90,a=0){let o=a>0?e=>Hd(t,n,a,e,Rd):e=>Vd(t,n,e,Rd),s=e.distanceTo(t)/r;for(let a=0;a<4;a++){if(o(s),Rd.y<30){let e=Ud(t,n,30);e>0&&e<s&&(s=e),o(s)}let a=e.distanceTo(Rd);s=.55*s+a/r*.45,s=Cd(s,.02,i)}o(s);let c=Ud(t,n,5);return c>0&&s>=c-.4?null:{point:Rd.clone(),t:s}}function Gd(e,t,n,r){let i=e.length();if(i<1e-4)return e;Rd.copy(e).normalize();let a=Rd.angleTo(t);if(a<1e-5)return e;let o=n*r,s=Math.min(1,o/a);return zd.copy(Rd).lerp(t,s).normalize().multiplyScalar(i),e.copy(zd),e}function Kd(e,t,n,r,i=0,a=0,o=3){return{type:`box`,x:e,z:t,hx:n,hz:r,rot:i,y0:a,y1:o,cos:Math.cos(i),sin:Math.sin(i)}}function qd(e,t,n,r=0,i=3){return{type:`cyl`,x:e,z:t,r:n,y0:r,y1:i}}function Jd(e,t,n,r){let i=e.y+n;for(let n of r)if(!(i<n.y0+.05||e.y>n.y1-.05)){if(n.type===`cyl`){let r=e.x-n.x,i=e.z-n.z,a=r*r+i*i,o=n.r+t;if(a<o*o&&a>1e-8){let t=Math.sqrt(a),n=(o-t)/t;e.x+=r*n,e.z+=i*n}}else{let r=e.x-n.x,i=e.z-n.z,a=r*n.cos+i*n.sin,o=-r*n.sin+i*n.cos,s=Cd(a,-n.hx,n.hx),c=Cd(o,-n.hz,n.hz),l=a-s,u=o-c,d=l*l+u*u;if(d<t*t){let r,i;if(d>1e-8){let e=Math.sqrt(d),n=(t-e)/e;r=l*n,i=u*n}else{let e=n.hx-Math.abs(a),s=n.hz-Math.abs(o);e<s?(r=(a>0?1:-1)*(e+t),i=0):(r=0,i=(o>0?1:-1)*(s+t))}e.x+=r*n.cos-i*n.sin,e.z+=r*n.sin+i*n.cos}}}return e}var Yd=`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // pin to far plane
}
`,Xd=`
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uZenith;
uniform vec3 uMid;          // mid-sky stop toward the sun (magenta band at sunset)
uniform vec3 uMidAway;      // mid-sky stop opposite the sun
uniform vec3 uHorizon;      // horizon color toward the sun azimuth
uniform vec3 uHorizonAway;  // horizon color opposite the sun
uniform vec3 uGroundHaze;
uniform vec3 uSunColor;
uniform float uSunSize;     // disc threshold in dot space (1 - size)
uniform float uSunSoft;     // disc edge softness
uniform float uSunBright;
uniform float uHaloStrength;
uniform float uGlowWrap;    // low-sun gold wrap around the sun azimuth
uniform float uStars;       // 0..1
uniform float uMilkyWay;    // 0..1
uniform float uMoon;        // 0..1
uniform float uCloudAmount; // 0..1 coverage
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uCloudUnder;  // warm underlighting (sunset)
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x),
             mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i=0;i<5;i++){ s += a*noise2(p); p *= 2.03; a *= 0.5; }
  return s;
}
float fbm3(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i=0;i<3;i++){ s += a*noise2(p); p *= 2.11; a *= 0.5; }
  return s * 1.143; // renormalize to ~0..1
}

void main() {
  vec3 dir = normalize(vDir);
  float y = dir.y;
  float sunDot = dot(dir, uSunDir);
  float sunAmt = clamp(sunDot, 0.0, 1.0);

  // azimuth alignment with the sun: 1 toward sun, 0 opposite
  vec2 dxz = normalize(dir.xz + vec2(1e-4, 0.0));
  vec2 sxz = normalize(uSunDir.xz + vec2(1e-4, 0.0));
  float azAlign = dot(dxz, sxz) * 0.5 + 0.5;

  // ---- vertical gradient: zenith -> mid -> horizon (mid/horizon depend on azimuth)
  vec3 horizonCol = mix(uHorizonAway, uHorizon, pow(azAlign, 2.0));
  vec3 midCol = mix(uMidAway, uMid, pow(azAlign, 1.6));
  vec3 sky = mix(midCol, uZenith, smoothstep(0.10, 0.62, y));
  // double haze layer: one wide soft band, one tight bright band hugging the ground
  float hazeWide = exp(-max(y, 0.0) * 4.5);
  float hazeTight = exp(-max(y, 0.0) * 14.0);
  sky = mix(sky, horizonCol, hazeWide * 0.8);
  sky = mix(sky, mix(uGroundHaze, horizonCol, 0.4), hazeTight * 0.9);
  sky = mix(sky, uGroundHaze, smoothstep(0.015, -0.1, y));

  // low-sun glow wrap: gold spreads along the horizon around the sun azimuth
  float wrap = pow(azAlign, 5.0) * exp(-max(y, 0.0) * 6.5);
  sky += uSunColor * wrap * uGlowWrap * 0.6;

  // ---- sun disc + halo
  float disc = smoothstep(uSunSize - uSunSoft, uSunSize + uSunSoft * 0.35, sunDot);
  float halo = pow(sunAmt, 24.0) * uHaloStrength;
  float wideGlow = pow(sunAmt, 3.5) * uHaloStrength * 0.16;
  sky += uSunColor * (disc * uSunBright + halo + wideGlow);

  float horizonFade = smoothstep(0.03, 0.25, y);

  // ---- stars + milky way
  if (uStars > 0.001) {
    // milky-way plane factor first: it boosts star density/brightness in-band
    float across = dot(dir, vec3(0.5486, 0.2793, -0.7880));
    float along = dot(dir, vec3(0.8205, 0.0, 0.5712));
    float band = exp(-across * across * 40.0) * uMilkyWay;

    // sparse crisp points, varied magnitude, gentle twinkle
    vec2 sp = dir.xz / (abs(dir.x) + max(y, 0.02) + abs(dir.z));
    vec2 g = sp * 148.0;
    vec2 cell = floor(g);
    float hsel = hash21(cell);
    if (hsel > 0.945 - band * 0.03) {
      vec2 jit = vec2(hash21(cell + 1.7), hash21(cell + 9.1)) * 0.5 + 0.25;
      float d = length(fract(g) - jit);
      float mag = pow(hash21(cell + 4.2), 5.0);          // few bright, many dim
      float rad = 0.07 + mag * 0.11;
      float star = smoothstep(rad, rad * 0.2, d) * (0.22 + 1.15 * mag);
      float tw = 1.0 - (0.4 - mag * 0.28) *
        (0.5 + 0.5 * sin(uTime * (1.0 + hash21(cell + 7.0) * 2.6) + hash21(cell) * 39.0));
      vec3 scol = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.9, 0.78), hash21(cell + 2.9));
      sky += scol * star * tw * uStars * horizonFade * (1.0 + band * 0.7);
    }
    // faint stretched-noise glow along the band
    if (band > 0.01) {
      float tex = fbm3(vec2(along * 6.0, across * 11.0) + 4.7);
      float wisp = smoothstep(0.3, 0.85, tex);
      float lane = smoothstep(0.62, 0.8, tex) * 0.5;      // dark dust lane
      float glow = band * (0.35 + 0.9 * wisp) * (1.0 - lane);
      sky += vec3(0.44, 0.52, 0.74) * glow * horizonFade * 0.13;
    }
  }

  // ---- moon: shaded disc with procedural maria/craters + halo
  if (uMoon > 0.001) {
    float md = dot(dir, uMoonDir);
    float mAmt = clamp(md, 0.0, 1.0);
    sky += vec3(0.5, 0.58, 0.78) * (pow(mAmt, 200.0) * 0.16 + pow(mAmt, 10.0) * 0.03) * uMoon;
    if (md > 0.9994) {
      vec3 mt = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
      vec3 mb = cross(mt, uMoonDir);
      vec2 muv = vec2(dot(dir, mt), dot(dir, mb)) / 0.024;
      float r2 = dot(muv, muv);
      if (r2 < 1.0) {
        vec3 mn = vec3(muv, sqrt(1.0 - r2));
        float lam = clamp(dot(mn, vec3(-0.4696, 0.2254, 0.8536)), 0.0, 1.0);
        float dk = smoothstep(0.40, 0.80, fbm3(muv * 2.1 + vec2(7.3, 3.1)));
        float albedo = mix(1.04, 0.40, dk) * (0.86 + 0.24 * noise2(muv * 7.5 + 2.7));
        float edge = smoothstep(1.0, 0.86, r2);
        vec3 mcol = vec3(0.99, 0.98, 0.94) * albedo * (0.26 + 0.78 * lam);
        sky = mix(sky, mcol * 1.02, edge * uMoon);
      }
    }
  }

  // ---- clouds: domain-warped fbm, drawn last so they silhouette stars/moon
  if (uCloudAmount > 0.001 && y > 0.015) {
    vec2 cuv = dir.xz / (y + 0.22);
    vec2 drift = vec2(uTime * 0.0055, uTime * 0.0012);
    float w1 = fbm3(cuv * 0.6 + drift * 0.6);
    float w2 = fbm3(cuv * 0.6 + vec2(4.7, 9.3) - drift * 0.35);
    vec2 warp = (vec2(w1, w2) - 0.5) * 1.5;
    float cl = fbm(cuv * 1.8 + warp + drift);
    float cov = mix(0.80, 0.52, uCloudAmount);   // amount moves the coverage threshold
    float dens = smoothstep(cov, cov + 0.2, cl);
    if (dens > 0.003) {
      float core = smoothstep(cov + 0.06, cov + 0.34, cl); // thicker core = shadow tone
      float sunGlow = pow(sunAmt, 5.0);
      vec3 cCol = mix(uCloudLit, uCloudShade, core * 0.9);
      cCol += uSunColor * sunGlow * (1.0 - core) * 1.1;              // sun-facing silver rim
      cCol += uSunColor * uCloudUnder * (0.3 + 0.7 * (1.0 - core));  // warm underlighting
      float fadeH = smoothstep(0.015, 0.11, y);
      sky = mix(sky, cCol, dens * fadeH * min(1.0, uCloudAmount * 2.2) * 0.92);
    }
  }

  gl_FragColor = vec4(sky, 1.0);
}
`,Zd={day:{sunElev:52,sunAz:35,zenith:2511516,mid:6064324,midAway:5537981,horizon:12374242,horizonAway:11519450,groundHaze:12175055,sunColor:16774109,sunSize:.99988,sunSoft:3e-4,sunBright:3.4,halo:.55,glowWrap:0,stars:0,milkyWay:0,moon:0,clouds:.55,cloudLit:16054524,cloudShade:10465992,cloudUnder:0,lightColor:16773594,sunIntensity:3,hemiSky:10336472,hemiGround:9075292,hemiIntensity:.85,fogColor:12636127,fogNear:1600,fogFar:12500,exposure:1,floodlights:!1,trailTint:16645111},sunset:{sunElev:9,sunAz:258,zenith:1844308,mid:10897528,midAway:5194864,horizon:16747325,horizonAway:6179453,groundHaze:13729871,sunColor:16761461,sunSize:.9997,sunSoft:18e-5,sunBright:1.55,halo:.5,glowWrap:1,stars:.1,milkyWay:0,moon:0,clouds:.6,cloudLit:15243896,cloudShade:7165056,cloudUnder:.55,lightColor:16751701,sunIntensity:2.3,hemiSky:6977720,hemiGround:6244932,hemiIntensity:.5,fogColor:11304808,fogNear:1100,fogFar:10500,exposure:1.05,floodlights:!0,trailTint:15905155},night:{sunElev:44,sunAz:118,zenith:264212,mid:660774,midAway:660774,horizon:1714498,horizonAway:1385016,groundHaze:922915,sunColor:3229035,sunSize:1.5,sunSoft:.001,sunBright:0,halo:0,glowWrap:0,stars:.9,milkyWay:.85,moon:1,clouds:.18,cloudLit:2568523,cloudShade:461590,cloudUnder:0,lightColor:9414872,sunIntensity:.95,hemiSky:2767703,hemiGround:1316897,hemiIntensity:.62,fogColor:989222,fogNear:750,fogFar:9e3,exposure:1.16,floodlights:!0,trailTint:5595513}},Qd=new Set([`zenith`,`mid`,`midAway`,`horizon`,`horizonAway`,`groundHaze`,`sunColor`,`lightColor`,`cloudLit`,`cloudShade`,`hemiSky`,`hemiGround`,`fogColor`,`trailTint`]);function $d(e){let{scene:t,renderer:n}=e,r={uSunDir:{value:new W(0,1,0)},uMoonDir:{value:new W(0,1,0)},uZenith:{value:new G(Zd.day.zenith)},uMid:{value:new G(Zd.day.mid)},uMidAway:{value:new G(Zd.day.midAway)},uHorizon:{value:new G(Zd.day.horizon)},uHorizonAway:{value:new G(Zd.day.horizonAway)},uGroundHaze:{value:new G(Zd.day.groundHaze)},uSunColor:{value:new G(Zd.day.sunColor)},uSunSize:{value:Zd.day.sunSize},uSunSoft:{value:Zd.day.sunSoft},uSunBright:{value:Zd.day.sunBright},uHaloStrength:{value:Zd.day.halo},uGlowWrap:{value:0},uStars:{value:0},uMilkyWay:{value:0},uMoon:{value:0},uCloudAmount:{value:Zd.day.clouds},uCloudLit:{value:new G(Zd.day.cloudLit)},uCloudShade:{value:new G(Zd.day.cloudShade)},uCloudUnder:{value:0},uTime:{value:0}},i=new K(new Io(1,48,24),new Jo({vertexShader:Yd,fragmentShader:Xd,uniforms:r,side:1,depthWrite:!1,depthTest:!0,fog:!1}));i.scale.setScalar(2e4),i.frustumCulled=!1,i.renderOrder=-100,t.add(i);let a=new Ms(16777215,3);a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.camera.near=10,a.shadow.camera.far=900,a.shadow.camera.left=-220,a.shadow.camera.right=220,a.shadow.camera.top=220,a.shadow.camera.bottom=-220,a.shadow.bias=-4e-4,a.shadow.normalBias=.6,t.add(a),t.add(a.target);let o=new ps(10336472,9075292,.85);t.add(o),t.fog=new Pn(Zd.day.fogColor,Zd.day.fogNear,Zd.day.fogFar);let s={};{let e=new Ec(n),t=new G,r=new G,i=new G,a=new G,o=new G;for(let[n,c]of Object.entries(Zd)){let l=document.createElement(`canvas`);l.width=128,l.height=64;let u=l.getContext(`2d`);t.setHex(c.zenith),r.setHex(c.mid),i.setHex(c.horizon),a.setHex(9075292).lerp(i,.35),n===`night`&&a.setHex(790292);let d=u.createLinearGradient(0,0,0,64);d.addColorStop(0,`#`+t.getHexString()),d.addColorStop(.3,`#`+r.getHexString()),d.addColorStop(.48,`#`+i.getHexString()),d.addColorStop(.55,`#`+a.getHexString()),d.addColorStop(1,`#`+a.clone().multiplyScalar(.55).getHexString()),u.fillStyle=d,u.fillRect(0,0,128,64),o.setHex(n===`night`?10335976:c.sunColor);let f=n===`night`?122:c.sunAz,p=n===`night`?48:c.sunElev,m=f%360/360*128,h=(90-p)/180*64,g=u.createRadialGradient(m,h,1,m,h,n===`night`?7:16);g.addColorStop(0,n===`night`?`rgba(200,216,244,0.5)`:`rgba(255,244,220,0.95)`),g.addColorStop(.3,`#`+o.getHexString()+(n===`night`?`44`:`aa`)),g.addColorStop(1,`rgba(255,255,255,0)`),u.fillStyle=g,u.fillRect(0,0,128,64);let _=new ia(l);_.mapping=303,_.colorSpace=Ne,s[n]=e.fromEquirectangular(_).texture,_.dispose()}e.dispose()}let c={timeOfDay:`day`,from:{...Zd.day},to:{...Zd.day},blend:1,wind:new W(2.4,0,.8),windGustT:0},l=new W,u=new W,d=new W,f=new G,p=new G;function m(e,t,n){let r=Et.degToRad(e),i=Et.degToRad(t);return n.set(Math.cos(r)*Math.sin(i),Math.sin(r),Math.cos(r)*Math.cos(i)),n}function h(e,t,n){return f.setHex(typeof c.from[e]==`number`?c.from[e]:16777215),p.setHex(typeof c.to[e]==`number`?c.to[e]:16777215),n.copy(f).lerp(p,t),n}function g(e,t){return wd(c.from[e],c.to[e],t)}function _(i){h(`zenith`,i,r.uZenith.value),h(`mid`,i,r.uMid.value),h(`midAway`,i,r.uMidAway.value),h(`horizon`,i,r.uHorizon.value),h(`horizonAway`,i,r.uHorizonAway.value),h(`groundHaze`,i,r.uGroundHaze.value),h(`sunColor`,i,r.uSunColor.value),h(`cloudLit`,i,r.uCloudLit.value),h(`cloudShade`,i,r.uCloudShade.value),r.uSunSize.value=g(`sunSize`,i),r.uSunSoft.value=g(`sunSoft`,i),r.uSunBright.value=g(`sunBright`,i),r.uHaloStrength.value=g(`halo`,i),r.uGlowWrap.value=g(`glowWrap`,i),r.uStars.value=g(`stars`,i),r.uMilkyWay.value=g(`milkyWay`,i),r.uMoon.value=g(`moon`,i),r.uCloudAmount.value=g(`clouds`,i),r.uCloudUnder.value=g(`cloudUnder`,i),m(g(`sunElev`,i),g(`sunAz`,i),l),r.uSunDir.value.copy(l),m(48,122,u),r.uMoonDir.value.copy(u);let s=r.uMoon.value,c=d.copy(l).lerp(u,s).normalize();a.position.copy(c).multiplyScalar(600),a.target.position.set(0,0,0),a.intensity=g(`sunIntensity`,i),h(`lightColor`,i,a.color),h(`hemiSky`,i,o.color),h(`hemiGround`,i,o.groundColor),o.intensity=g(`hemiIntensity`,i),h(`fogColor`,i,t.fog.color),t.fog.near=g(`fogNear`,i),t.fog.far=g(`fogFar`,i),n.toneMappingExposure=g(`exposure`,i),e.world.sunDir.copy(c),e.world.sunColor=r.uSunColor.value,h(`trailTint`,i,e.world.trailTint)}let v={sun:a,hemi:o,uniforms:r,get timeOfDay(){return c.timeOfDay},get preset(){return Zd[c.timeOfDay]},get floodlightsOn(){return Zd[c.timeOfDay].floodlights},setTimeOfDay(n,r=!1){if(!Zd[n])return;t.environment=s[n],t.environmentIntensity=n===`night`?.38:.55;let i={},a=c.blend;for(let e of Object.keys(Zd.day)){let t=c.from[e],n=c.to[e];i[e]=typeof t==`number`&&typeof n==`number`?Qd.has(e)?f.setHex(t).lerp(p.setHex(n),a).getHex():wd(t,n,a):n}c.from=i,c.to={...Zd[n],timeKey:n},c.blend=+!!r,c.timeOfDay=n,_(c.blend),e.events.emit(`time-of-day`,n)},update(t){r.uTime.value+=t,c.blend<1&&(c.blend=Math.min(1,c.blend+t/2.2),_(c.blend)),c.windGustT+=t;let n=1+Math.sin(c.windGustT*.23)*.35+Math.sin(c.windGustT*.71)*.18;e.world.wind.copy(c.wind).multiplyScalar(n)}};return e.world.wind=c.wind.clone(),e.world.trailTint=new G(16777215),v.setTimeOfDay(`day`,!0),v}var ef=300;function tf(e,t){let n=nf((Math.hypot(e,t)-ef)/700);if(n<=0)return 0;let r=jd(e*45e-5+13.7,t*45e-5+7.3,4),i=jd(e*.0035,t*.0035,2)*2.2;return(r**1.6*130+i)*n}function nf(e){return e=Cd(e,0,1),e*e*(3-2*e)}function rf(e){let{scene:t,textures:n}=e,r=new bd(4242),i=e.world.colliders,a=new En;a.name=`base`,t.add(a);let o=[],s=n.concrete().clone();s.repeat.set(2.2,2.2);let c={sand:new Y({map:n.sand(),roughness:.96,metalness:0}),concrete:new Y({map:n.concrete(),roughness:.92}),concretePad:new Y({map:s,roughness:.92}),asphalt:new Y({map:n.asphalt(),roughness:.94}),tan:new Y({map:n.desertTan(),roughness:.82}),olive:new Y({map:n.oliveDrab(),roughness:.8}),metal:new Y({map:n.metalPlate(),roughness:.55,metalness:.65}),darkMetal:new Y({color:3948614,roughness:.55,metalness:.6}),steel:new Y({color:9147033,roughness:.42,metalness:.85}),rubber:new Y({color:2369066,roughness:.95}),cable:new Y({color:2500652,roughness:.85}),glassDark:new Y({color:790806,roughness:.12,metalness:.9}),hazard:new Y({map:n.hazardStripes(),roughness:.85}),rock:new Y({color:10127984,roughness:.98,flatShading:!0}),white:new Y({color:14210508,roughness:.7}),redLight:new Y({color:3342336,emissive:16722458,emissiveIntensity:2.2}),greenLight:new Y({color:13066,emissive:2817877,emissiveIntensity:1.8}),amberLight:new Y({color:3351040,emissive:16755234,emissiveIntensity:2})};e.baseMaterials=c;let l=(e,t,n,r,o,s,c,{rot:l=0,castShadow:p=!0,parent:m=a,collide:h=!1}={})=>{let g=new K(new q(t,n,r),e);return g.position.set(o,s,c),g.rotation.y=l,g.castShadow=p,g.receiveShadow=!0,m.add(g),h&&i.push(Kd(u(g,m),d(g,m),t/2+.12,r/2+.12,l+f(m),0,s+n/2+.4)),g},u=(e,t)=>t===a?e.position.x:e.getWorldPosition(p).x,d=(e,t)=>t===a?e.position.z:p.z,f=e=>e===a?0:e.rotation.y,p=new W,m=new W,h=new Dt,g=new cn,_=new Zt,v=(e,t,n,r,i=0,a=0,o=0,s=1,c=s,l=s)=>{let u=e.clone();return g.set(i,a,o),h.setFromEuler(g),_.compose(m.set(t,n,r),h,new W(s,c,l)),u.applyMatrix4(_),u},y=(e,t,n)=>{let r=e.attributes.uv;for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)*t,r.getY(e)*n);return e},b=(e,t,n,{shadow:r=!0,receive:i=!0,parent:o=a}={})=>{let s=new Oi(e,t,n.length),c=new W;return n.forEach((e,t)=>{g.set(e.rx??0,e.ry??0,e.rz??0),h.setFromEuler(g),c.set(e.sx??e.s??1,e.sy??e.s??1,e.sz??e.s??1),_.compose(m.set(e.x,e.y??0,e.z),h,c),s.setMatrixAt(t,_),e.c&&s.setColorAt(t,e.c)}),s.castShadow=r,s.receiveShadow=i,o.add(s),s};{let e=16e3,t=new Po(e,e,220,220);t.rotateX(-Math.PI/2);let n=t.attributes.position,r=new Float32Array(n.count*3),i=new G;for(let e=0;e<n.count;e++){let t=n.getX(e),a=n.getZ(e),o=tf(t,a);n.setY(e,o);let s=.8+jd(t*.0012+3,a*.0012+9,3)*.4,c=Cd((.46-jd(t*34e-5-a*62e-5+40,t*21e-5+a*13e-5-17,2))*2.4,0,1);s*=1-c*.16,i.setRGB(s*(1+c*.05),s*.985,s*(.94-c*.045)),r[e*3]=i.r,r[e*3+1]=i.g,r[e*3+2]=i.b}t.setAttribute(`color`,new mr(r,3)),t.computeVertexNormals();let o=c.sand.clone();o.vertexColors=!0;let s=new K(t,o);s.receiveShadow=!0,s.name=`terrain`,a.add(s)}{let e=[],t=[],n=new G(11772292),r=new G(7167046),i=new G(10127199),o=new G(12365456),s=new G(11451595),c=new G,l=new G,u=new G,d=(n,r,i,a,o,s)=>{e.push(...n,...r,...i,...n,...i,...a);for(let e=0;e<3;e++)t.push(o.r,o.g,o.b);for(let e=0;e<3;e++)t.push(s.r,s.g,s.b)},f=(e,t,a,f,p,m)=>{let h=[];for(let n=0;n<=448;n++){let r=n/448*Z,i=Math.cos(r),o=Math.sin(r),s=nf((jd(i*1.35+f*17.3,o*1.35-f*9.1,3)-m)*2.8),c=jd(i*7.6+f*3.1,o*7.6+f*5.7,5),l=.45+jd(i*2.2-f*7.7,o*2.2+f*2.9,3),u=s*Math.min(.95,.14+c**1.6*.95*l)*a,d=e+(jd(i*2.9+f,o*2.9-f,3)-.5)*2*t;h.push({x:o,z:i,h:u,r:d,sh:u*(.3+jd(i*9.1+f,o*9.1-f*2,2)*.3),shr:.3+jd(i*7.3+f*5,o*7.3,2)*.25,tint:jd(i*12.7+f*31,o*12.7+f,3)})}let g=(e,t,n)=>[e.x*t,n,e.z*t];for(let e=0;e<448;e++){let t=h[e],m=h[e+1],_=Math.max(t.h,m.h);if(_<6)continue;let v=[g(t,t.r-t.h*1.45-420,0),g(t,t.r-t.h*t.shr,t.sh),g(t,t.r,t.h),g(t,t.r+t.h*1.6+500,0)],y=[g(m,m.r-m.h*1.45-420,0),g(m,m.r-m.h*m.shr,m.sh),g(m,m.r,m.h),g(m,m.r+m.h*1.6+500,0)],b=t.tint,x=m.tint,S=(e,t,l)=>(c.copy(r).lerp(i,Cd(t*1.5-.2,0,1)),e===0?u.copy(n).lerp(c,.35):e===1?u.copy(c).lerp(n,.12):u.copy(c).lerp(o,Cd((_/a-.35)*1.4,0,.7)),u.multiplyScalar(.84+l*.3),u.lerp(s,p),u);for(let t=0;t<3;t++){let n=jd(e*.7+f*9+t*3.7,f*4-t,2),r=jd(e*.7+.35+f*9+t*3.7,f*4-t,2);l.copy(S(t,(b+x)*.5,n));let i=S(t,(b+x)*.5,r);d(v[t],v[t+1],y[t+1],y[t],l,i)}}};f(5200,650,1050,3,.05,.3),f(7400,900,1500,11,.17,.28),f(9200,1100,2e3,23,.28,.2);let p=new kr;p.setAttribute(`position`,new _r(e,3)),p.setAttribute(`color`,new _r(t,3)),p.computeVertexNormals();let m=new K(p,new Y({vertexColors:!0,roughness:1,flatShading:!0}));m.name=`mountains`,a.add(m)}{let e=new K(new la(540,40),new Y({map:n.sandOverlay(),transparent:!0,roughness:.97,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1}));e.rotation.x=-Math.PI/2,e.rotation.z=.7,e.position.y=.006,e.renderOrder=1,e.receiveShadow=!0,a.add(e);let t=new K(new Po(120,96),c.concrete);t.rotation.x=-Math.PI/2,t.position.y=.02,t.receiveShadow=!0,a.add(t);for(let[e,t]of[[-46,32],[2,50],[48,30]]){let n=new K(new Po(26,26),c.concretePad);n.rotation.x=-Math.PI/2,n.position.set(e,.025,t),n.receiveShadow=!0,a.add(n);let r=new K(new Fo(10.9,11.55,48),c.hazard.clone());r.material.polygonOffset=!0,r.material.polygonOffsetFactor=-2,r.material.color.setScalar(.72),r.material.transparent=!0,r.material.opacity=.85,r.rotation.x=-Math.PI/2,r.position.set(e,.035,t),r.receiveShadow=!0,a.add(r)}let i=(e,t,n,r,i,o=0,s=.85)=>{let c=new K(new Po(t,n),new Y({map:e,transparent:!0,opacity:s,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-3}));return c.rotation.x=-Math.PI/2,c.rotation.z=o,c.position.set(r,.045,i),c.renderOrder=2,a.add(c),c};i(n.label(`KEEP CLEAR`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 64px Arial`}),16,3,-20,16),i(n.label(`LAUNCH AREA A`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,-46,20,0),i(n.label(`LAUNCH AREA B`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,2,37,0),i(n.label(`LAUNCH AREA C`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,48,18,0),i(n.roundel(),10,10,22,-8,0,.5),i(n.label(`NO SMOKING — FUEL POINT`,{fg:`#c98f7a`,w:512,h:72,font:`bold 44px Arial`}),12,1.7,-36,-2,.5,.8),i(n.label(`FOD CHECK POINT`,{fg:`#d8cf9f`,w:512,h:72,font:`bold 46px Arial`}),11,1.6,2,58.5,0,.8),i(n.label(`SLOW · 15`,{fg:`#d8cf9f`,w:256,h:96,font:`bold 58px Arial`}),5,1.9,0,72,0,.85),i(n.label(`AUTHORIZED VEHICLES ONLY`,{fg:`#d8cf9f`,w:640,h:64,font:`bold 40px Arial`}),15,1.5,24,40,-.35,.75),i(n.label(`A`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,-36,26,.4,.7),i(n.label(`B`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,0,30,0,.7),i(n.label(`C`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,38,24,-.4,.7);let o=new Po(1,1);o.rotateX(-Math.PI/2);let s=new Y({map:n.paintStripe(),transparent:!0,opacity:.8,color:13616275,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),l=[],u=(e,t,n,r,i=.35)=>{let a=Math.hypot(n-e,r-t);l.push({x:(e+n)/2,y:.032,z:(t+r)/2,ry:Math.atan2(n-e,r-t),sx:i,sz:a})};u(-58,-46,58,-46),u(-58,46,-6,46),u(14,46,58,46),u(-58,-46,-58,46),u(58,-46,58,46),u(0,46,0,24,.4),u(0,24,-34,28,.4),u(-34,28,-42,30,.4),u(0,24,34,26,.4),u(34,26,42,28,.4),u(0,24,2,40,.4);for(let e=0;e<6;e++)u(-30+e*9,-38,-30+e*9,-44,.3);let d=b(o,s,l,{shadow:!1});d.renderOrder=1;let f=new Po(1,1);f.rotateX(-Math.PI/2);let p=new Y({map:n.tireMarks(),transparent:!0,opacity:.34,roughness:.95,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),m=[],h=(e,t,n,r=15,i=3.1)=>m.push({x:e,y:.03,z:t,ry:n,sx:i,sz:r});h(1.4,36,.06,18),h(-6,27,1.05,16),h(-20,29.5,1.45,15),h(-33.5,30.5,1.62,13),h(8,26,-1.2,15),h(22,27.5,-1.5,14),h(36,27.6,-1.62,12),h(2.4,20,-.12,16),h(-4,-20,.5,17),h(-12,-33,.25,14),h(18,-12,-.6,15),h(30,-22,-.5,13);let g=b(f,p,m,{shadow:!1});g.renderOrder=1;let _=new Po(1,1);_.rotateX(-Math.PI/2);let v=new Y({map:n.oilStain(),transparent:!0,opacity:.55,roughness:.7,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),y=[];for(let[e,t]of[[-46,30],[3,49],[47,32],[-38,24],[10,41],[41,35],[-14,-34],[-24,-37],[30,-20]])y.push({x:e+r.range(-1.5,1.5),y:.028,z:t+r.range(-1.5,1.5),ry:r.next()*Z,s:r.range(1.5,2.7)});let x=b(_,v,y,{shadow:!1});x.renderOrder=1;let S=new Po(1.5,1);S.rotateX(-Math.PI/2);let C=new Y({map:n.drainGrate(),roughness:.6,metalness:.45,polygonOffset:!0,polygonOffsetFactor:-2}),w=[];for(let e=0;e<6;e++)w.push({x:-50+e*20,y:.027,z:-8,ry:0});b(S,C,w,{shadow:!1});let T=new Po(1,1);T.rotateX(-Math.PI/2);let E=new Y({color:4867905,roughness:.98,polygonOffset:!0,polygonOffsetFactor:-1}),D=[];for(let e of[-40,-12,16,44])D.push({x:e,y:.026,z:0,ry:0,sx:.13,sz:96});for(let e of[-24,12])D.push({x:0,y:.026,z:e,ry:Math.PI/2,sx:.13,sz:120});b(T,E,D,{shadow:!1});let O=new Po(1,1);O.rotateX(-Math.PI/2);let k=new Y({map:n.sandTracks(),transparent:!0,opacity:.85,roughness:1,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),ee=[],A=(e,t,n,r=26,i=3.4)=>ee.push({x:e,y:.012,z:t,ry:n,sx:i,sz:r});A(-9,-60,.25,30),A(-16,-86,.18,28),A(-26,-110,.4,30),A(70,-18,-.9,26),A(92,-30,-1.1,26),A(-68,74,.85,30),A(-92,90,.7,26),A(26,88,-.5,26),A(44,104,-.75,26);let j=b(O,k,ee,{shadow:!1});j.renderOrder=1}{let e=(e,t,r,i,o)=>{let s=new K(new Po(i,r),c.asphalt);s.rotation.x=-Math.PI/2,s.rotation.z=o,s.position.set(e,.012,t),s.receiveShadow=!0,a.add(s);let l=new K(new Po(.7,r),new Y({map:n.roadLine(),transparent:!0,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}));l.rotation.copy(s.rotation),l.position.set(e,.03,t),l.renderOrder=1,a.add(l)};e(0,96,100,8,0),e(-70,60,90,6,Math.PI/4),e(80,62,84,6,-Math.PI/5),e(-100,-20,120,6,Math.PI/2+.35)}{let e=new J(.05,.05,2.9,6),t=[],r=(e,n,r,i)=>{let a=Math.hypot(r-e,i-n),o=Math.floor(a/4);for(let a=0;a<=o;a++)t.push([e+(r-e)*(a/o),n+(i-n)*(a/o)])};r(-165,-145,165,-145),r(165,-145,165,145),r(165,145,5,145),r(-5,145,-165,145),r(-165,145,-165,-145);let o=new Oi(e,c.darkMetal,t.length),s=new Zt;t.forEach(([e,t],n)=>{s.makeTranslation(e,1.45,t),o.setMatrixAt(n,s)}),o.castShadow=!1,a.add(o);let u=new Y({map:n.chainlink(),transparent:!0,alphaTest:.3,side:2,color:13685976,roughness:.6,metalness:.55}),d=(e,t,n,r)=>{let i=new K(new Po(n,2.5),u.clone());i.material.map=i.material.map.clone(),i.material.map.repeat.set(n/1.6,1.6),i.material.map.needsUpdate=!0,i.position.set(e,1.3,t),i.rotation.y=r,a.add(i);let o=new K(new q(n,.03,.03),c.darkMetal);o.position.set(e,2.68,t),o.rotation.y=r,a.add(o)};d(0,-145,330,0),d(165,0,290,Math.PI/2),d(-165,0,290,Math.PI/2),d(85,145,160,0),d(-85,145,160,0),i.push(Kd(0,-145,165,.25,0,0,3)),i.push(Kd(165,0,.25,145,0,0,3)),i.push(Kd(-165,0,.25,145,0,0,3)),i.push(Kd(86,145,80,.25,0,0,3)),i.push(Kd(-86,145,80,.25,0,0,3));let f=new K(new Po(9,2.4),u);f.position.set(10.5,1.25,145.6),a.add(f),l(c.tan,3,2.7,2.6,-8,1.35,143,{collide:!0});let p=n.label(`RESTRICTED AREA — USE OF FORCE AUTHORIZED`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:96,font:`bold 30px Arial`});for(let e=-2;e<=2;e++){let t=new K(new Po(2.6,.5),new ai({map:p,side:2}));t.position.set(e*60+10,1.7,144.92),a.add(t)}}let x=new En;x.position.set(-32,0,-18),a.add(x);let S,C,w,T,E;{let e=3.1,t=.16,a=x.position.x,s=x.position.z;l(c.concrete,9,.14,6,0,.07,0,{parent:x}),l(c.tan,9.3,.18,6.3,0,3.19,0,{parent:x}),l(c.tan,9,e,t,0,e/2,-3,{parent:x}),l(c.tan,t,e,6,-9/2,e/2,0,{parent:x}),l(c.tan,t,e,6,9/2,e/2,0,{parent:x});let u=1.5,d=1.6,f=5.35,p=9/2-2.35;l(c.tan,f,e,t,-1.8250000000000002,e/2,3,{parent:x}),l(c.tan,p,e,t,9/2-p/2,e/2,3,{parent:x}),l(c.tan,u,.9500000000000002,t,d,2.625,3,{parent:x}),i.push(Kd(a,s-3,9/2,t,0,0,e)),i.push(Kd(a-9/2,s,t,3,0,0,e)),i.push(Kd(a+9/2,s,t,3,0,0,e)),i.push(Kd(a-9/2+f/2,s+3,f/2,t,0,0,e)),i.push(Kd(a+9/2-p/2,s+3,p/2,t,0,0,e));let m=l(c.olive,1.4,2.1,.06,2.97,1.06,3.7,{parent:x,rot:-1.25});m.castShadow=!0;let h=new bd(9107),g=9/2-t-.012,_=2.828,D={wall:new Y({map:n.interiorWall(),roughness:.9}),ceil:new Y({map:n.interiorCeiling(),roughness:.92}),deck:new Y({map:n.paintedFloor(),roughness:.82}),conBody:new Y({color:5068113,roughness:.58,metalness:.3}),conDesk:new Y({color:2895665,roughness:.68,metalness:.2}),bezel:new Y({color:1776927,roughness:.42,metalness:.5}),panelTex:new Y({map:n.consolePanel(),roughness:.55,metalness:.25}),fabric:new Y({color:3027756,roughness:.96}),red:new Y({color:9183254,roughness:.5,metalness:.2}),steel:c.steel,white:c.white,cable:c.cable};{let n=t=>y(new Po(t,e),t/2.4,1),r=[];r.push(v(n(9-2*t),0,e/2,-2.828)),r.push(v(n(6-2*t),-4.328,e/2,0,0,Math.PI/2)),r.push(v(n(6-2*t),g,e/2,0,0,-Math.PI/2));let i=1.9780000000000002;r.push(v(n(5.178000000000001),-1.7389999999999999,e/2,_,0,Math.PI)),r.push(v(n(i),g-i/2,e/2,_,0,Math.PI));let a=.9500000000000002,o=new Po(u,a);{let t=o.attributes.uv;for(let n=0;n<t.count;n++)t.setXY(n,t.getX(n)*(u/2.4),2.15/e+t.getY(n)*(a/e))}r.push(v(o,d,2.625,_,0,Math.PI));let s=new K(j(r),D.wall);s.receiveShadow=!0,x.add(s);let c=new K(y(new Po(9-2*t,6-2*t),(9-2*t)/1.2,(6-2*t)/1.2),D.ceil);c.rotation.x=Math.PI/2,c.position.y=3.035,c.receiveShadow=!0,x.add(c);let l=new K(new Po(9-2*t-.02,6-2*t-.02),D.deck);l.rotation.x=-Math.PI/2,l.position.y=.148,l.receiveShadow=!0,x.add(l)}let O=4.2,k=-2.7/2,ee=.62,A=Math.cos(ee),M=Math.sin(ee),te=.46,N=(e,t,n=0)=>[e,.79+t*A+n*M,-2.2079999999999997-t*M+n*A];{let e=new K(j([v(new q(4.1000000000000005,.12,.66),k,.06,-2.4579999999999997),v(new q(O,.62,.94),k,.43,-2.3579999999999997),v(new q(O,.86,.12),k,1.615,-2.588,-.1),v(new q(4.32,.1,.4),k,2.075,-2.5679999999999996,-.06),v(new q(.06,.79,1.06),-3.48,.395,-2.298),v(new q(.06,.79,1.06),.78,.395,-2.298),v(new q(.06,1.4,.56),-3.48,1.44,-2.528),v(new q(.06,1.4,.56),.78,1.44,-2.528),v(new q(.035,.86,.14),-2.15,1.615,-2.578,-.1),v(new q(.035,.86,.14),-.25,1.615,-2.578,-.1)]),D.conBody);e.castShadow=!0,e.receiveShadow=!0,x.add(e),i.push(Kd(a+k,s+-2.828+.5,2.24,.62,0,0,2.2));let t=new K(j([v(new q(O,.05,1.06),k,.765,-2.298),v(new J(.026,.026,O,8),k,.765,-1.773,0,0,Math.PI/2)]),D.conDesk);t.castShadow=!0,t.receiveShadow=!0,x.add(t);{let e=[[-3.45,-2.15],[-2.15,-.25],[-.25,.75]],t=[];for(let[n,r]of e){let[e,i,a]=N((n+r)/2,te/2,.002);t.push(v(new Po(r-n-.06,te),e,i,a,-.62))}let n=new K(j(t),D.panelTex);n.receiveShadow=!0,x.add(n)}let r=-.1,c=[],l=(e,t,n,i)=>{c.push(v(new q(n+.14,i+.14,.075),e,t,-2.5229999999999997,r));let a=-2.476,o=i/2+.045;c.push(v(new q(n+.14,.05,.045),e,t+o*Math.cos(r),a+o*Math.sin(r),r)),c.push(v(new q(n+.14,.05,.045),e,t-o*Math.cos(r),a-o*Math.sin(r),r)),c.push(v(new q(.05,i+.14,.045),e-n/2-.045,t,a,r)),c.push(v(new q(.05,i+.14,.045),e+n/2+.045,t,a,r))};l(-1.2,1.6,1.9,1.05),l(-2.85,1.6,.98,.56),l(.25,1.46,.64,.42),c.push(v(new q(.82,.37,.07),.25,1.895,-2.518,r));let u=new K(j(c),D.bezel);u.castShadow=!0,u.receiveShadow=!0,x.add(u),S=new K(new Po(1.9,1.05),new ai({color:660488})),S.position.set(-1.2,1.6,-2.4749999999999996),S.rotation.x=r,x.add(S);let d=new K(new Po(.98,.56),new ai({map:n.statusScreen(),toneMapped:!1}));d.position.set(-2.85,1.6,-2.4749999999999996),d.rotation.x=r,x.add(d);let f=new K(new Po(.64,.42),new ai({map:n.statusScreen(),toneMapped:!1}));f.position.set(.25,1.46,-2.4749999999999996),f.rotation.x=r,x.add(f),T={left:d,right:f};let p=new K(new Po(.76,.315),new ai({map:n.annunciator(),toneMapped:!1}));p.position.set(.25,1.895,-2.4779999999999998),p.rotation.x=r,x.add(p);{let e=new Po(.022,.022),t=[];for(let[n,i]of[[-.35,1.035],[-2.5,1.29],[.5,1.22]])t.push(v(e,n,i,-2.468,r));let n=new K(j(t),new ai({color:5496956}));x.add(n)}let m=new K(new q(.62,.022,.22),new Y({map:n.keyboard(),roughness:.6}));m.position.set(-1.35,.802,-1.9979999999999998),m.rotation.y=.03,m.castShadow=!0,x.add(m);{let e=new K(j([v(new J(.041,.036,.1,10),-.32,.845,-1.988),v(new Ro(.028,.008,6,10),-.275,.845,-1.988,0,0,0),v(new J(.05,.06,.02,12),-.85,.8,-1.9779999999999998)]),new Y({color:13222574,roughness:.62}));e.castShadow=!0,x.add(e);let t=new K(new Io(.034,12,10),new Y({color:9183254,roughness:.3}));t.position.set(-.85,.822,-1.9779999999999998),x.add(t);let r=new K(new J(.007,.007,.14,6),new Y({color:13214247,roughness:.6}));r.position.set(-1.95,.8,-1.928),r.rotation.set(Math.PI/2,0,.5),x.add(r);let i=new K(new q(.34,.012,.24),new Y({color:2765605,roughness:.85}));i.position.set(-.15,.795,-1.968),i.rotation.y=-.12,i.castShadow=!0,x.add(i);let a=new K(new Po(.31,.21),new Y({map:n.clipboard(),roughness:.92}));a.rotation.set(-Math.PI/2,0,-.12+Math.PI/2),a.position.set(-.15,.8025,-1.968),x.add(a)}{let e=new K(j([v(new q(.22,.05,.1),.52,.815,-2.1079999999999997),v(new q(.06,.045,.075),.455,.87,-2.1079999999999997),v(new q(.06,.045,.075),.585,.87,-2.1079999999999997),v(new q(.15,.028,.05),.52,.878,-2.1079999999999997)]),D.bezel);e.castShadow=!0,x.add(e)}{let e=j([v(new J(.013,.015,.01,8),0,0,0),v(new J(.0045,.006,.042,6),0,.02,.008,.42)]);e.rotateX(Math.PI/2-ee);let t=[],n=(e,n,r,i=.075)=>{for(let a=0;a<n;a++){let[n,o,s]=N(e+a*i,r,.012);t.push({x:n,y:o,z:s,ry:h.next()<.4?Math.PI:0})}};n(-3.28,4,.3),n(-3.28,4,.13),n(-1.62,5,.3,.08),n(-.06,4,.3),n(-.06,4,.13),b(e,D.steel,t,{parent:x,shadow:!1});let r=j([v(new J(.02,.024,.025,10),0,.012,0),v(new q(.006,.014,.02),0,.03,.006)]);r.rotateX(Math.PI/2-ee);let i=[];for(let e=0;e<4;e++){let[t,n,r]=N(-1.86+e*.12,.115,.012);i.push({x:t,y:n,z:r,ry:h.range(-1.2,1.2)})}b(r,D.bezel,i,{parent:x,shadow:!1});let a=[],s=(e,t,n)=>{let[r,i,o]=N(e,t,.03),s=-.62+(n?-1.35:0);a.push(v(new q(.05,.09,.035),r,i+(n?.045:0),o+(n?-.02:0),s))};s(.24,.3,!1),s(.34,.3,!0);let c=new K(j(a),D.red);c.castShadow=!0,x.add(c);let[l,u,d]=N(.5,.13,.02),f=new K(new J(.032,.042,.035,14),new Y({color:11145489,emissive:13378065,emissiveIntensity:.9,roughness:.4}));f.position.set(l,u,d),f.rotation.x=Math.PI/2-ee,x.add(f),o.push((e,t)=>{f.material.emissiveIntensity=.9+Math.sin(t*3.1)*.5});let p=new K(new Ro(.052,.008,6,14),D.red);p.position.set(l,u,d),p.rotation.x=-.62+Math.PI/2,x.add(p)}{let e=new K(j([v(new Ro(.085,.011,6,12,Math.PI),0,0,0),v(new J(.042,.042,.028,10),-.085,-.03,0,0,0,Math.PI/2),v(new J(.042,.042,.028,10),.085,-.03,0,0,0,Math.PI/2),v(new q(.02,.05,.02),0,.11,-.02)]),D.bezel);e.position.set(.812,1.42,-2.308),e.rotation.y=Math.PI/2,e.castShadow=!0,x.add(e);let t=new K(new Po(.14,.1),new Y({map:n.label(`CHECK IFF CODES
BEFORE RADIATE`,{fg:`#3c3e38`,bg:`#ddd8c4`,w:128,h:96,font:`bold 13px Arial`}),roughness:.9}));t.position.set(-3.515,1.5,-2.408),t.rotation.y=-Math.PI/2,t.rotation.z=.06,x.add(t)}{let e=new K(j([v(new J(.045,.055,.02,10),0,.01,0),v(new J(.008,.008,.24,6),.02,.12,.02,.25,0,.15),v(new J(.007,.007,.2,6),.09,.3,.1,1,0,.5)]),D.bezel);e.position.set(-3.15,.79,-2.2079999999999997),e.castShadow=!0,x.add(e);let t=new K(new ua(.055,.09,12,1,!0),D.bezel);t.position.set(-2.99,1.06,-2.1079999999999997),t.rotation.set(1.1,0,-.5),x.add(t);let n=new K(new la(.04,10),new Y({color:16769712,emissive:16762995,emissiveIntensity:1.25}));n.position.copy(t.position),n.rotation.set(1.1-Math.PI/2,0,-.5),n.translateZ(-.02),x.add(n)}}{let e=2.4,t=-.6,r=new K(j([v(new J(.74,.82,.16,8),e,.08,t),v(new J(.95,.9,.13,24),e,.845,t)]),D.conBody);r.castShadow=!0,r.receiveShadow=!0,x.add(r);{let n=[v(new J(.6,.68,.62,8),e,.47,t),v(new J(.72,.62,.09,24),e,.745,t)];for(let r=0;r<8;r++){let i=r/8*Z+Math.PI/8;n.push(v(new q(.045,.5,.03),e+Math.cos(i)*.655,.45,t+Math.sin(i)*.655,0,-i+Math.PI/2))}let r=new K(j(n),D.conDesk);r.castShadow=!0,r.receiveShadow=!0,x.add(r);let i=new K(new zo(new Sa([new W(2.08,.32,-1.1),new W(1.98,.2,-1.04),new W(2.05,.165,-.98)]),8,.022,5),c.cable);i.castShadow=!1,x.add(i)}let l=new K(new q(.46,.1,.26),D.conDesk);l.position.set(1.6199999999999999,.85,-.8999999999999999),l.rotation.y=.36,l.rotation.z=.16,l.castShadow=!0,x.add(l);let u=new K(new Po(.42,.22),new Y({map:n.consolePanel(),roughness:.55,metalness:.25,emissive:1452060,emissiveIntensity:.5,emissiveMap:n.consolePanel()}));u.position.copy(l.position),u.rotation.set(-Math.PI/2+.16,0,-.36,`ZYX`),u.translateZ(.052),x.add(u);let d=new K(new la(.95,32),new Y({map:n.holoRing(),transparent:!0,roughness:.5,metalness:.3,polygonOffset:!0,polygonOffsetFactor:-1}));d.rotation.x=-Math.PI/2,d.rotation.z=Math.PI/2,d.position.set(e,.9115,t),x.add(d);let f=new K(new J(.8,.8,.03,32),new Y({color:333597,roughness:.16,metalness:.8}));f.position.set(e,.9,t),x.add(f);let p=new K(new Ro(.835,.014,8,48),new Y({color:401962,emissive:2606302,emissiveIntensity:1.05}));p.position.set(e,.916,t),p.rotation.x=Math.PI/2,x.add(p);{let n=[],r=[];for(let i=0;i<4;i++){let a=Math.PI/4+i*Math.PI/2,o=e+Math.cos(a)*.7,s=t+Math.sin(a)*.7;n.push(v(new J(.02,.026,.07,8),o,.945,s)),r.push(v(new J(.013,.013,.012,8),o,.985,s))}let i=new K(j(n),D.bezel);x.add(i);let a=new Y({color:667190,emissive:3594476,emissiveIntensity:1.5}),s=new K(j(r),a);x.add(s),o.push((e,t)=>{a.emissiveIntensity=1.5+Math.sin(t*2.2)*.35});let c=new K(new J(.085,.1,.018,16),new Y({color:667190,emissive:3129560,emissiveIntensity:1.2}));c.position.set(e,.923,t),x.add(c)}i.push(qd(a+e,s+t,1.02,0,1)),C=new Tn,C.position.set(e,.98,t),x.add(C)}l(c.darkMetal,.7,2.1,1.8,-3.95,1.05,.9,{parent:x,collide:!0}),l(c.darkMetal,.7,2.1,1.2,-3.95,1.05,-1.4,{parent:x,collide:!0});{let e=-3.95+.36,t=new Y({map:n.rackFace(),roughness:.7,metalness:.25}),i=new K(j([v(y(new Po(1.8,2.06),2,1),e,1.05,.9,0,Math.PI/2),v(y(new Po(1.2,2.06),1,1),e,1.05,-1.4,0,Math.PI/2)]),t);i.receiveShadow=!0,x.add(i);let a=new Po(.038,.038);a.rotateY(Math.PI/2);let s=new ai({color:16777215}),c=[],l=[],u=[[.18,1.62],[-1.92,-.88]];for(let e=0;e<26;e++){let[t,n]=u[e%2];c.push({x:-3.5840000000000005,y:.4+r.next()*1.5,z:r.range(t,n)});let i=new G(r.next()<.55?2883422:r.next()<.72?16755234:16724772);l.push([i,r.next()*6,r.range(1.6,8)])}let d=b(a,s,c,{shadow:!1,receive:!1,parent:x}),f=new G;l.forEach(([e],t)=>d.setColorAt(t,e)),o.push((e,t)=>{for(let e=0;e<l.length;e++){let[n,r,i]=l[e],a=Math.sin(t*i+r*9)>-.55;f.copy(n).multiplyScalar(a?1:.08),d.setColorAt(e,f)}d.instanceColor.needsUpdate=!0})}{let e=new K(j([v(new q(.34,.05,4.6),-3.8,2.72,-.2),v(new q(4.9,.05,.34),-1.45,2.72,-2.62),v(new q(.24,.56,.06),-.25,2.42,-2.75),v(new q(.3,.62,.3),-3.9,2.41,.9),v(new q(.3,.62,.3),-3.9,2.41,-1.4)]),c.darkMetal);e.castShadow=!1,e.receiveShadow=!0,x.add(e);let t=new zo(new Sa([new W(-3.85,2.14,.2),new W(-3.72,2.5,-1.1),new W(-3.4,2.2,-2.1),new W(-3.1,2.06,-2.5)]),16,.03,5),r=new zo(new Sa([new W(-3.85,2.1,.35),new W(-3.66,2.42,-.9),new W(-3.3,2.12,-2.05),new W(-3,2.04,-2.45)]),16,.022,5),i=new zo(new Sa([new W(.62,.7,-2.15),new W(.75,.18,-2),new W(.9,.06,-1.85)]),10,.024,5),a=[];for(let e=0;e<=60;e++){let t=e/60;a.push(new W(.55+t*.24+Math.cos(t*26)*.016,.82-Math.sin(t*Math.PI)*.1-t*.02,-2.12+Math.sin(t*26)*.016))}let o=new K(j([t,r,i,new zo(new Sa(a),60,.006,5)]),c.cable);o.castShadow=!1,x.add(o);let s=(e,t,n,r)=>{let i=Math.hypot(n-e,r-t),a=Math.atan2(n-e,r-t);return{x:(e+n)/2,z:(t+r)/2,len:i,ry:a}},l=[s(-3.5,-1.15,-2.7,-2),s(.68,-1.8,2.05,-.98)],u=[],d=[];for(let e of l)u.push(v(new q(.3,.02,e.len),e.x,.159,e.z,0,e.ry)),d.push(v(y(new Po(.3,e.len),1,e.len/.9),e.x,.1705,e.z,-Math.PI/2,e.ry));let f=new K(j(u),c.rubber);f.receiveShadow=!0,x.add(f);let p=new K(j(d),new Y({map:n.floorChannel(),roughness:.95}));p.receiveShadow=!0,x.add(p)}{l(c.darkMetal,.04,1.34,1.76,4.3020000000000005,1.78,-1.35,{parent:x,castShadow:!1});let e=new K(new Po(1.64,1.22),new Y({map:n.mapBoard(),roughness:.9}));e.position.set(4.276000000000001,1.78,-1.35),e.rotation.y=-Math.PI/2,e.receiveShadow=!0,x.add(e);let t=new K(j([v(new q(.026,.06,1.76),4.273000000000001,2.42,-1.35),v(new q(.026,.06,1.76),4.273000000000001,1.78-.64,-1.35),v(new q(.026,1.34,.06),4.273000000000001,1.78,-2.2),v(new q(.026,1.34,.06),4.273000000000001,1.78,-1.35+.85)]),D.bezel);t.castShadow=!1,x.add(t);let r=new K(new Po(.2,.27),new Y({map:n.clipboard(),roughness:.9}));r.position.set(4.308000000000001,1.5,-.28),r.rotation.y=-Math.PI/2,r.rotation.z=.05,x.add(r);let i=new K(new Po(1.05,.78),new Y({map:n.noticeBoard(),roughness:.95}));i.position.set(4.308000000000001,1.74,.55),i.rotation.y=-Math.PI/2,i.receiveShadow=!0,x.add(i),l(c.darkMetal,.05,.035,.92,4.188000000000001,1.36,1.62,{parent:x,castShadow:!1}),l(c.darkMetal,.05,.14,.03,4.298,1.31,1.25,{parent:x,castShadow:!1}),l(c.darkMetal,.05,.14,.03,4.298,1.31,1.99,{parent:x,castShadow:!1});let a=new K(new Po(.88,.42),new Y({map:n.binderSpines(),roughness:.9}));a.position.set(4.203,1.59,1.62),a.rotation.y=-Math.PI/2,a.castShadow=!1,x.add(a);let o=new K(j([v(new J(.072,.075,.5,12),0,0,0),v(new Io(.072,12,6),0,.25,0),v(new J(.02,.02,.1,6),0,.31,0),v(new q(.045,.045,.15),0,.3,.06)]),new Y({color:10361874,roughness:.42,metalness:.25}));o.position.set(4.178,.66,2.25),o.castShadow=!0,x.add(o);let s=new K(new zo(new Sa([new W(4.178,.93,2.33),new W(4.228000000000001,.78,2.38),new W(4.208,.55,2.34)]),8,.011,5),c.cable);x.add(s),l(c.darkMetal,.04,.1,.2,4.283,.62,2.25,{parent:x,castShadow:!1});let u=new K(new Po(.3,.3),new ai({map:n.label(`FIRE`,{fg:`#fff`,bg:`#8c1c13`,w:96,h:96,font:`bold 40px Arial`})}));u.position.set(4.308000000000001,1.35,2.25),u.rotation.y=-Math.PI/2,x.add(u),l(c.metal,.07,.72,.5,-4.328+.05,1.5,2.15,{parent:x,castShadow:!1});let d=new K(new Po(.42,.1),new ai({map:n.label(`PWR DIST — 28V DC`,{fg:`#d8d4c4`,bg:`#3a3d33`,w:256,h:48,font:`bold 22px Arial`})}));d.position.set(-4.328+.095,1.94,2.15),d.rotation.y=Math.PI/2,x.add(d),l(c.darkMetal,.5,.42,.55,-4,.36,-.35,{parent:x});{let e=new K(j([v(new J(.07,.082,.15,12),0,.075,0),v(new J(.02,.02,.02,8),0,.16,0),v(new Ro(.045,.009,6,10,Math.PI),.078,.085,0,0,0,-Math.PI/2)]),new Y({color:3948354,roughness:.35,metalness:.7}));e.position.set(-4.08,.57,-.28),e.castShadow=!0,x.add(e)}{l(c.white,.055,.3,.34,-4.288,1.42,1.32,{parent:x,castShadow:!1});let e=new K(new Po(.16,.16),new ai({map:n.label(`+`,{fg:`#ffffff`,bg:`#2e7d32`,w:64,h:64,font:`bold 52px Arial`})}));e.position.set(-4.258,1.42,1.32),e.rotation.y=Math.PI/2,x.add(e),l(c.tan,.07,.34,.24,-4.328+.05,1.5,.6,{parent:x,castShadow:!1});let t=new K(j([v(new q(.03,.2,.07),0,0,0),v(new q(.035,.05,.075),0,.085,0),v(new q(.035,.05,.075),0,-.085,0)]),D.bezel);t.position.set(-4.328+.1,1.5,.68),x.add(t);let r=new K(new Po(.18,.05),new ai({map:n.label(`TA-343 INTERCOM`,{fg:`#d8d4c4`,bg:`#4a4d40`,w:192,h:48,font:`bold 19px Arial`})}));r.position.set(-4.328+.087,1.7,.6),r.rotation.y=Math.PI/2,x.add(r);let i=new K(j([v(new J(.018,.018,2.2,6),-4.288,1.5,1.78),v(new q(.06,.12,.1),-4.283,1.05,1.78),v(new J(.014,.014,.32,6),-4.288,2.52,1.96,Math.PI/2)]),c.metal);i.castShadow=!1,x.add(i);let a=new K(new Po(.5,.09),new ai({map:n.label(`C2 BAY — SIGNAL PWR`,{fg:`#c9c4ae`,bg:null,w:320,h:56,font:`bold 26px Arial`}),transparent:!0}));a.position.set(-4.328+.02,2.16,1.55),a.rotation.y=Math.PI/2,x.add(a)}}{let e=new K(new Po(1.72,.21),new ai({map:n.label(`IRONVEIL FIRE DIRECTION CENTER`,{fg:`#d9d6c8`,bg:`#31342c`,w:768,h:92,font:`bold 44px Arial`})}));e.position.set(-1.35,2.4,-2.816),x.add(e);let t=new K(j([v(new J(.155,.155,.045,20),-2.75,2.42,-2.798,Math.PI/2),v(new J(.155,.155,.045,20),-3.35,2.42,-2.798,Math.PI/2)]),c.darkMetal);t.castShadow=!1,x.add(t);let r=new K(new la(.145,20),new Y({map:n.clockFace(`LOCAL`,1.1,2.6),roughness:.5}));r.position.set(-2.75,2.42,-2.772),x.add(r);let i=new K(new la(.145,20),new Y({map:n.clockFace(`ZULU`,4.2,2.6),roughness:.5}));i.position.set(-3.35,2.42,-2.772),x.add(i),l(c.darkMetal,.56,.24,.07,.3,2.42,-2.783,{parent:x,castShadow:!1});let a=new K(new Po(.24,.16),new ai({map:n.label(`OPS`,{fg:`#0c2010`,bg:`#57d879`,w:96,h:64,font:`bold 34px Arial`}),toneMapped:!1}));a.position.set(.165,2.42,-2.743),x.add(a);let o=new K(new Po(.24,.16),new Y({map:n.label(`RAID`,{fg:`#4a1410`,bg:`#241210`,w:96,h:64,font:`bold 34px Arial`}),roughness:.6}));o.position.set(.435,2.42,-2.743),x.add(o)}{let e=new K(new Po(.42,.155),new ai({map:n.exitSign(),toneMapped:!1}));e.position.set(d,2.32,2.808),e.rotation.y=Math.PI,x.add(e),l(c.darkMetal,.46,.02,.05,d,2.41,2.783,{parent:x,castShadow:!1});let t=new K(new Po(1.45,.16),c.hazard.clone());t.material.map=t.material.map.clone(),t.material.map.repeat.set(3,.5),t.material.map.needsUpdate=!0,t.rotation.x=-Math.PI/2,t.position.set(d,.152,2.7279999999999998),x.add(t)}{let e=new Y({color:1513754,roughness:.5,metalness:.55}),t=new Y({color:1711384,roughness:.98}),n=(e,t,n)=>{let r=[],i=[],a=(r,i,a,o,s=0,c=0,l=0)=>{let u=Math.cos(n),d=Math.sin(n);return v(r,e+i*u+o*d,a,t-i*d+o*u,s,c+n,l)};for(let e=0;e<5;e++){let t=e/5*Z+.3;i.push(a(new q(.24,.03,.045),Math.cos(t)*.15,.055,Math.sin(t)*.15,0,-t)),i.push(a(new Io(.026,8,6),Math.cos(t)*.255,.03,Math.sin(t)*.255))}i.push(a(new J(.032,.038,.14,8),0,.13,0)),i.push(a(new J(.02,.022,.26,8),0,.32,0)),i.push(a(new q(.3,.024,.2),0,.445,0)),r.push(a(new q(.45,.07,.43),0,.49,.01)),r.push(a(new q(.4,.024,.38),0,.535,.01)),i.push(a(new q(.045,.36,.035),0,.63,-.245,-.18)),r.push(a(new q(.42,.5,.055),0,.93,-.29,-.18)),r.push(a(new q(.44,.16,.07),0,.65,-.245,-.14));for(let e of[-1,1])i.push(a(new q(.026,.17,.03),e*.245,.585,.06)),i.push(a(new q(.026,.03,.14),e*.245,.66,0)),r.push(a(new q(.055,.026,.22),e*.245,.685,0));return[r,i]},[r,o]=n(-1.25,-1.3,Math.PI-.15),[c,l]=n(-2.88,-1.36,Math.PI+.3),u=new K(j([...r,...c]),t);u.castShadow=!0,x.add(u);let d=new K(j([...o,...l]),e);d.castShadow=!0,x.add(d),i.push(qd(a-1.25,s-1.3,.34,0,1.2)),i.push(qd(a-2.88,s-1.36,.34,0,1.2))}let P=new ks(15266047,7,12,2);P.position.set(0,2.1500000000000004,.3),x.add(P);let ne=new ks(8841404,1.7,2.7,2);ne.position.set(-1.2,1.5,-1.5),x.add(ne);let F=new ks(6736092,1.6,3,2);F.position.set(2.4,1.55,-.6),x.add(F);let I=new ks(16767392,.9,1.9,2);I.position.set(-2.99,1.12,-2.078),x.add(I);let L=new Y({color:16054e3,emissive:14674175,emissiveIntensity:.62});{let e=new K(j([v(new q(1,.055,.42),-1.5,3.005,.25),v(new q(1,.055,.42),1.5,3.005,.25)]),c.metal);e.castShadow=!1,x.add(e);let t=new K(j([v(new Po(.9,.34),-1.5,2.976,.25,Math.PI/2),v(new Po(.9,.34),1.5,2.976,.25,Math.PI/2)]),L);t.castShadow=!1,x.add(t);let n=[];for(let e of[-1.5,1.5])for(let t=-2;t<=2;t++)n.push(v(new q(.02,.02,.36),e+t*.18,2.972,.25));let r=new K(j(n),c.darkMetal);r.castShadow=!1,x.add(r)}let re=new Y({color:4723728,emissive:16722458,emissiveIntensity:0,roughness:.35});{let e=new K(j([v(new Io(.075,12,8,0,Z,0,Math.PI/2),-.6,3.0300000000000002,-1.9,Math.PI),v(new Io(.075,12,8,0,Z,0,Math.PI/2),1.7,3.0300000000000002,1.9,Math.PI)]),re);e.castShadow=!1,x.add(e);let t=[];for(let[e,n]of[[-.6,-1.9],[1.7,1.9]])for(let r=0;r<3;r++)t.push(v(new Ro(.08,.005,4,10,Math.PI),e,3.0300000000000002,n,Math.PI/2,r*Math.PI/3));let n=new K(j(t),c.darkMetal);n.castShadow=!1,x.add(n)}E={lamp:P,consoleGlow:ne,holoGlow:F,deskPool:I,troffMat:L,domeMat:re,panelMat:D.panelTex},l(c.metal,1.1,.8,.9,9/2-1,3.6500000000000004,-1.4,{parent:x});let ie=new K(new J(.012,.02,3.4,5),c.darkMetal);ie.position.set(-3.8,4.95,-2),x.add(ie);let ae=new K(new Io(.28,12,8),c.white);ae.position.set(-2,3.4,1.8),x.add(ae);let R=new K(new Po(2.4,.42),new ai({map:n.label(`BATTERY CONTROL — C2 SHELTER`,{fg:`#e5e2d4`,bg:`#3a3d33`,w:512,h:80,font:`bold 34px Arial`})}));R.position.set(.4,2.6,3.09),x.add(R),x.traverse(e=>{e.isMesh&&(e.receiveShadow=!0)}),w=new W(a-1.2,0,s-3+2)}let D=new En;D.position.set(36,0,-28),a.add(D);let O;{let e=n.gravel().clone();e.repeat.set(9,9),e.needsUpdate=!0;let t=new K(new la(12,36),new Y({map:e,color:10059870,roughness:1}));t.rotation.x=-Math.PI/2,t.position.y=.013,t.receiveShadow=!0,D.add(t);let r=c.concretePad.clone();r.color.setHex(8289396);let a=new K(new J(8,8.5,.6,8),r);a.position.y=.3,a.castShadow=!0,a.receiveShadow=!0,D.add(a);let s=n.concrete().clone();s.repeat.set(1.6,1.6),s.needsUpdate=!0;let u=new K(new la(7.99,8),new Y({map:s,color:9276291,roughness:.94,polygonOffset:!0,polygonOffsetFactor:-1}));u.rotation.x=-Math.PI/2,u.position.y=.602,u.receiveShadow=!0,D.add(u);let d=new K(new Fo(7.35,7.95,8),c.hazard.clone());d.material.color.setScalar(.62),d.material.transparent=!0,d.material.opacity=.8,d.material.polygonOffset=!0,d.material.polygonOffsetFactor=-2,d.rotation.x=-Math.PI/2,d.rotation.z=Math.PI/8,d.position.y=.605,d.receiveShadow=!0,D.add(d),i.push(qd(36,-28,8.7,0,1.9));{let e=[],t=7.62,n=Math.PI,r=new J(.028,.028,1.05,6),i=[];for(let a=0;a<18;a++){let o=a/18*Z;Math.abs((o-n+Math.PI*3)%Z-Math.PI)<.24||(i.push(o),e.push(v(r,Math.cos(o)*t,1.12,Math.sin(o)*t)))}let a=new J(.02,.02,1,6);a.rotateX(Math.PI/2);for(let n=0;n<i.length;n++){let r=i[n],o=i[(n+1)%i.length],s=o-r;if(s<0&&(s+=Z),s>Z/18*1.5)continue;let c=Math.cos(r)*t,l=Math.sin(r)*t,u=Math.cos(o)*t,d=Math.sin(o)*t,f=Math.hypot(u-c,d-l),p=Math.atan2(u-c,d-l);for(let t of[1.6,1.18])e.push(v(a,(c+u)/2,t,(l+d)/2,0,p,0,1,1,f))}for(let t=0;t<8;t++)e.push(v(new q(.34,.03,.03),0,.9+t*.42,1.62));e.push(v(new J(.022,.022,3.5,5),-.18,2.35,1.62)),e.push(v(new J(.022,.022,3.5,5),.18,2.35,1.62));let o=new K(j(e),c.steel);o.castShadow=!0,D.add(o)}{let e=[];for(let t=0;t<4;t++)e.push(v(new q(.4,.05,1.7),-8.15-t*.38,.5-t*.15,0));for(let t of[-1,1])e.push(v(new q(1.9,.07,.05),-8.75,.32,t*.86,0,0,.34)),e.push(v(new q(1.9,.05,.04),-8.75,.95,t*.86,0,0,.34)),e.push(v(new q(.04,.67,.04),-8.1,.84,t*.86)),e.push(v(new q(.04,.72,.04),-9.4,.37,t*.86));let t=new K(j(e),c.darkMetal);t.castShadow=!0,D.add(t),i.push(Kd(27.1,-28,.85,1,0,0,1.4))}{let e=new K(j([v(new J(1.75,2,.55,12),0,.87,0),v(new J(1,1.5,2.9,12),0,2.6,0),v(new q(.55,.75,.3),1.2,1.6,.6,0,-.5),v(new q(.4,.5,.25),-1.15,1.5,-.6,0,.6)]),c.tan);e.castShadow=!0,e.receiveShadow=!0,D.add(e);let t=new K(new J(.78,.95,.45,12),c.darkMetal);t.position.y=4.25,t.castShadow=!0,D.add(t)}O=new En,O.position.y=4.5,D.add(O);{let e=new K(j([v(new q(2.7,.55,1.7),0,.27,0),v(new q(.38,1.5,.55),-1.35,1.15,0),v(new q(.38,1.5,.55),1.35,1.15,0),v(new J(.16,.16,3.05,8),0,1.8,0,0,0,Math.PI/2),v(new q(.85,.8,.75),-.85,1.75,.95),v(new q(.85,.8,.75),.85,1.75,.95),v(new J(.05,.05,2.6,6),-1.7,1.55,.75,.65),v(new J(.05,.05,2.6,6),1.7,1.55,.75,.65),v(new J(.06,.06,1.6,6),0,.9,.65,.5)]),c.metal);e.castShadow=!0,O.add(e);let t=new En;t.position.set(0,2.15,.1),t.rotation.x=-.3,O.add(t);let r=new K(new q(6.3,4.05,.42),c.olive);r.castShadow=!0,t.add(r);let i=new K(new Po(5.85,3.65),new Y({map:n.radarArray(),roughness:.82}));i.position.z=.215,t.add(i);let a=new K(j([v(new q(2.6,.07,.07),0,2.35,0),v(new q(.05,.32,.05),-.9,2.19,0),v(new q(.05,.32,.05),.9,2.19,0)]),c.darkMetal);a.castShadow=!0,t.add(a);let s=new K(new Io(.09,8,6),c.redLight.clone());s.position.set(0,2.25,.12),t.add(s),o.push((e,t)=>{O.rotation.y=t*.85%Z,s.material.emissiveIntensity=Math.sin(t*2.4)>0?2.6:.15})}{let e=new K(new J(.05,.08,2,8),c.darkMetal);e.position.set(5,1.6,3.4),e.castShadow=!0,D.add(e);let t=new En;t.position.set(5,2.7,3.4),D.add(t);let n=[];for(let e=0;e<=8;e++){let t=e/8*.62;n.push(new U(t,t*t*.55))}let r=new K(new Mo(n,14),new Y({color:12107186,roughness:.55,metalness:.4,side:2}));r.rotation.x=-.95,r.castShadow=!0,t.add(r);let i=new K(new J(.015,.015,.5,5),c.steel);i.rotation.x=-.95,i.position.set(0,.22,.1),t.add(i),o.push((e,n)=>{t.rotation.y=Math.sin(n*.22)*1.4+.6})}{l(c.olive,2.5,1.75,1.55,4.1,1.475,-3.3,{parent:D,rot:-.25}),l(c.darkMetal,.7,.35,.1,4.6,1.9,-2.58,{parent:D,rot:-.25,castShadow:!1});let e=Math.sin(-.25)*-1,t=Math.cos(-.25)*-1,r=new K(new Po(.62,1.3),new Y({map:n.label(`R-1`,{fg:`#d8d4c4`,bg:`#4b503f`,w:96,h:192,font:`bold 40px Arial`}),roughness:.85}));r.position.set(4.1+e*.79,1.3,-3.3+t*.79),r.rotation.y=Math.atan2(e,t),D.add(r)}{let e=(e,t,n=1.15,r=.6)=>{let i=new K(new Po(n,r),new ai({map:e,side:2}));i.position.set(Math.cos(t)*7.66,1.35,Math.sin(t)*7.66),i.rotation.y=Math.atan2(Math.cos(t),Math.sin(t)),D.add(i)};e(n.label(`DANGER — RF RADIATION HAZARD`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:120,font:`bold 34px Arial`}),Math.PI*.86),e(n.label(`RADAR SITE R-1 — AUTHORIZED PERSONNEL ONLY`,{fg:`#e8e4d4`,bg:`#3a3d33`,w:640,h:110,font:`bold 30px Arial`}),Math.PI*.38)}{let e=new K(new zo(new Sa([new W(28.2,.07,-27.6),new W(14,.06,-24.5),new W(-2,.06,-21.5),new W(-16,.06,-19.5),new W(-27.2,.5,-18.4)].map(e=>e.sub(new W(36,0,-28)))),42,.05,6),c.cable);e.castShadow=!1,D.add(e);let t=new K(j([v(new q(.5,.42,.35),-22,.21,3.5,0,.2),v(new q(.5,.42,.35),-52,.21,8.5,0,-.15)]),c.tan);t.castShadow=!0,D.add(t)}{let e=13.5,t=3.6,n=.35;l(c.olive,4.6,1.5,2.2,e,1.05,t,{parent:D,rot:n}),i.push(Kd(49.5,-24.4,2.5,1.3,n,0,2));let r=new J(.42,.42,.3,14),a=[];for(let[i,o]of[[-1.5,-1.05],[1.5,-1.05],[-1.5,1.05],[1.5,1.05]])a.push(v(r,e+i*Math.cos(n)-o*Math.sin(n),.42,t+i*Math.sin(n)+o*Math.cos(n),0,n,Math.PI/2));let o=new K(j(a),c.rubber);o.castShadow=!0,D.add(o);let s=new K(new zo(new Sa([new W(11.5,.7,3),new W(8.5,.1,2.2),new W(2.2,.65,.8)]),16,.035,5),c.cable);s.castShadow=!1,D.add(s)}}let k=[];for(let[e,t]of[[-52,-40],[52,-40],[-52,44],[56,44]]){let r=new En;r.position.set(e,0,t),a.add(r);let o=new K(new J(.14,.22,11,8),c.steel);o.position.y=5.5,o.castShadow=!0,r.add(o),i.push(qd(e,t,.45,0,11));let s=new K(new q(2.2,.16,.16),c.steel);s.position.y=10.6,r.add(s);let l=new Y({color:8620174,emissive:0,roughness:.5,metalness:.4}),u=new K(j([-.8,0,.8].map(e=>v(new q(.5,.34,.3),e,10.45,.15,.7))),l);u.castShadow=!0,r.add(u);let d=new Ds(14674175,0,90,.62,.5,1.4);d.position.set(0,10.4,0),d.target.position.set(e*-.35,0,t*-.35),r.add(d),a.add(d.target),d.target.position.set(e*.55,0,t*.55);let f=new Yr(new Fr({map:n.hardFlare(),color:13623551,transparent:!0,opacity:0,depthWrite:!1}));f.scale.setScalar(3.2),f.position.y=10.5,r.add(f),k.push({spot:d,glow:f,headMat:l})}let ee=[];{let e=(e,t,n,r)=>{let o=new En;o.position.set(e,0,t),o.rotation.y=n,a.add(o),l(c.olive,2.3,1.35,1.3,0,.75,0,{parent:o}),i.push(Kd(e,t,1.3,.8,n,0,1.6)),l(c.darkMetal,2,.12,1.1,0,1.48,0,{parent:o,castShadow:!1});let s=new K(new J(.07,.07,.7,8),c.darkMetal);s.position.set(.8,1.75,-.3),o.add(s);let u=new K(new Po(.8,.7),c.rubber);u.position.set(1.16,.75,0),u.rotation.y=Math.PI/2,o.add(u);let d=c.greenLight.clone(),f=new K(new Io(.045,8,6),d);if(f.position.set(-1,1.2,.66),o.add(f),l(c.tan,.4,.5,.25,-1.6,.25,.3,{parent:o}),r){let n=new W(e,1,t),i=new W(r[0],r[2]??.5,r[1]),o=n.clone().lerp(i,.5);o.y=Math.min(n.y,i.y)*.5-.1,o.y=Math.max(.08,o.y);let s=new K(new zo(new Sa([n,o,i]),20,.035,6),c.cable);a.add(s)}return ee.push({position:new W(e,.8,t)}),o};e(-38,24,.4,[-46,30,1.2]),e(10,42,-.5,[2,48,1.2]),e(40,36,.9,[48,30,1.2]),e(-25,-13,1.57,[-28,-16,1]),e(30,-21,-.7,[34,-26,1.4])}{let e=[],t=[],r=[],o=(e,t,n,r,i)=>[e+r*Math.cos(n)+i*Math.sin(n),t-r*Math.sin(n)+i*Math.cos(n)],s=(n,s,u)=>{let d=new En;d.position.set(n,0,s),d.rotation.y=u,a.add(d),l(c.darkMetal,2.3,.5,7.2,0,.75,0,{parent:d}),l(c.tan,2.3,1.5,1.9,0,1.75,2.55,{parent:d});let f=new K(new Po(1.9,.62),c.glassDark);f.position.set(0,2.05,3.51),f.rotation.x=-.18,d.add(f),l(c.olive,2.4,1.55,4.6,0,1.85,-.9,{parent:d});for(let e=0;e<4;e++){let[r,i]=o(n,s,u,0,-2.9+e*1.35);t.push({x:r,y:1.9,z:i,rx:0,ry:Math.PI/2+u,rz:Math.PI/2})}for(let[t,r]of[[-1.05,2.4],[1.05,2.4],[-1.05,-.2],[1.05,-.2],[-1.05,-1.6],[1.05,-1.6],[-1.05,-2.9],[1.05,-2.9]]){let[i,a]=o(n,s,u,t,r);e.push({x:i,y:.55,z:a,ry:u,rz:Math.PI/2})}return r.push({x:n,y:.05,z:s,rx:-Math.PI/2,rz:-u}),i.push(Kd(n,s,1.4,3.8,u,0,3.2)),d};s(-16,-36,.12),s(-26,-36,-.06),s(78,10,1.2),b(new Ro(1.18,.03,6,12,Math.PI),c.olive,t,{shadow:!1}),b(new J(.55,.55,.4,16),c.rubber,e);let u=b(new Po(3.6,8.4),new ai({map:n.softPuff(),color:0,transparent:!0,opacity:.4,depthWrite:!1}),r,{shadow:!1,receive:!1});u.renderOrder=1}{let e=[[16,-44,17],[24,-48,12],[10,-50,14]],t=[];for(let[n,s,l]of e){let e=new K(new J(.09,.16,l,6),c.steel);e.position.set(n,l/2,s),e.castShadow=!0,a.add(e),i.push(qd(n,s,.35,0,l));let u=new K(new Io(.1,8,6),c.redLight.clone());u.position.set(n,l+.15,s),a.add(u);let d=r.next()*6;o.push((e,t)=>{u.material.emissiveIntensity=Math.sin(t*1.8+d)>.2?2.8:.1});for(let e=0;e<3;e++){let r=e/3*Z+.4;t.push(new W(n,l*.85,s),new W(n+Math.cos(r)*l*.55,0,s+Math.sin(r)*l*.55))}let f=new K(new q(1.6,.05,.05),c.steel);f.position.set(n,l*.82,s),f.rotation.y=r.next()*3,a.add(f)}let n=new Yi(new kr().setFromPoints(t),new Li({color:3356217,transparent:!0,opacity:.7}));a.add(n)}{let e=new q(1.35,1.35,1.35),t=new Y({map:n.hescoFabric(),roughness:.95}),o=[],s=(e,t,n,r,i,a=1.5)=>{let s=i-r,c=Math.max(2,Math.floor(s*n/a));for(let i=0;i<=c;i++){let a=r+s*i/c;o.push([e+Math.cos(a)*n,t+Math.sin(a)*n,a])}};s(-46,32,13.5,Math.PI*.7,Math.PI*1.65),s(2,50,13.5,Math.PI*.15,Math.PI*.95),s(48,30,13.5,Math.PI*1.3,Math.PI*2.15);let l=new Oi(e,t,o.length),u=new Zt,d=new Dt,f=new cn;o.forEach(([e,t,n],i)=>{f.set(0,-n+r.range(-.06,.06),0),d.setFromEuler(f),u.compose(new W(e,.675,t),d,new W(1,1,1)),l.setMatrixAt(i,u)}),l.castShadow=!0,l.receiveShadow=!0,a.add(l),i.push(Kd(-52,40,9,1.4,-.8,0,1.5)),i.push(Kd(9,57,9,1.4,.5,0,1.5)),i.push(Kd(55,24,9,1.4,.7,0,1.5));let p=(()=>{let e=new Ua;e.moveTo(-.4,0),e.lineTo(.4,0),e.lineTo(.16,.55),e.lineTo(.16,.9),e.lineTo(-.16,.9),e.lineTo(-.16,.55),e.closePath();let t=new Oo(e,{depth:3,bevelEnabled:!1});return t.translate(0,0,-1.5),t})(),m=[];for(let e=0;e<8;e++){let t=e%2==0?-5:5,n=58+Math.floor(e/2)*16;m.push({x:t,y:0,z:n}),i.push(Kd(t,n,.45,1.55,0,0,1))}b(p,c.concrete,m);let h=new Y({color:2371615,roughness:.85}),g=[];for(let[e,t]of[[-27,-12],[-26.2,-11.2],[-25.6,-12.4],[-44,25],[5,44],[44,25],[-27,-12.7]])for(let n=0;n<3;n++){let i=r.range(.7,1.1),a=r.range(.45,.7),o=r.range(.3,.42);g.push({x:e+r.range(-.6,.6),y:o/2+n*.36*(r.next()<.5),z:t+r.range(-.6,.6),ry:r.next()*1.2,sx:i,sy:o,sz:a})}b(new q(1,1,1),h,g),i.push(qd(-26.2,-12,1.6,0,1.2));{let e=n.hazardStripes().clone();e.needsUpdate=!0,e.repeat.set(6,1);let t=new Y({map:e,roughness:.85}),r=new Po(1,.3);r.rotateX(-Math.PI/2);for(let[e,n,i,o]of[[-10,6,18,.35],[18,22,14,-.5]]){let s=new K(new q(i,.075,.46),c.rubber);s.position.set(e,.037,n),s.rotation.y=o,a.add(s);let l=new K(r,t);l.scale.x=i,l.rotation.y=o,l.position.set(e,.078,n),a.add(l)}}let _=new Y({map:n.woodPallet(),roughness:.92}),y=(()=>{let e=[];for(let t of[-.4,-.135,.135,.4])e.push(v(new q(1.2,.032,.2),0,.132,t));for(let t of[-.55,0,.55])e.push(v(new q(.09,.1,1),t,.05,0));return j(e)})(),x=[],S=(e,t,n,i=0)=>{for(let a=0;a<n;a++)x.push({x:e+r.range(-.03,.03),y:a*.152,z:t+r.range(-.03,.03),ry:i+r.range(-.09,.09)})};S(17.2,59.4,5,.3),S(18.8,60.6,3,.2),S(16.4,61.4,1,1.2),S(52.8,6.2,4,-.6),S(54.4,7.8,2,-.4),S(-19.5,-45.5,3,.15),S(-17.8,-44.4,1,.8),x.push({x:15.6,y:.62,z:60.2,rx:1.25,ry:.4}),b(y,_,x),i.push(Kd(17.5,60.3,2,1.6,.25,0,1.2)),i.push(Kd(53.6,7,1.7,1.5,-.5,0,1)),i.push(Kd(-18.8,-45,1.6,1.3,.15,0,.8));let C=[],w=()=>new G().setHSL(.1,r.range(.18,.34),r.range(.38,.56)),T=(e,t,n,i=0)=>{for(let a=0;a<n;a++){let n=r.range(.55,1);C.push({x:e+r.range(-1,1),y:n*.5,z:t+r.range(-1,1),ry:i+r.range(-.5,.5),sx:n*r.range(1,1.5),sy:n,sz:n*r.range(.8,1.2),c:w()})}};T(21.5,61.5,5,.4),T(-25.5,-7.5,4,.2),T(56.5,9,3,-.5),T(-22.5,-47,4,.1),C.push({x:21.2,y:1.32,z:61.2,ry:.7,sx:.8,sy:.7,sz:.75,c:w()}),b(new q(1,1,1),_,C),i.push(qd(21.5,61.5,1.9,0,1.4)),i.push(qd(-25.5,-7.5,1.7,0,1)),i.push(qd(56.5,9,1.5,0,1)),i.push(qd(-22.5,-47,1.7,0,1));let E=new J(.3,.3,.9,12),D=[4869944,7225130,10127970,4016725,5527102],O=[],k=(e,t,n,i)=>{for(let a=0;a<n;a++)O.push({x:e+Math.cos(i)*a*.68+r.range(-.05,.05),y:.45,z:t+Math.sin(i)*a*.68+r.range(-.05,.05),ry:r.next()*Z,c:new G(D[r.int(0,4)])})};k(-40.5,-5.5,6,.35),k(-40.1,-4.2,5,.35),k(57.5,4.5,4,-1.1),k(-15.4,-47.4,3,.2),k(24.5,63.8,3,.9),O.push({x:-37.9,y:.3,z:-6.7,rx:Math.PI/2,rz:.9,c:new G(7225130)}),O.push({x:58.6,y:.3,z:6.4,rx:Math.PI/2,rz:-.4,c:new G(4869944)}),b(E,new Y({color:16777215,roughness:.62,metalness:.35}),O),i.push(Kd(-39.2,-4.8,2.4,1.3,.35,0,1.1)),i.push(qd(58,5.4,1.6,0,1.1)),b(j([v(new J(.55,.55,.07,14),0,0,-.33,Math.PI/2),v(new J(.55,.55,.07,14),0,0,.33,Math.PI/2),v(new J(.22,.22,.6,10),0,0,0,Math.PI/2)]),_,[{x:-19.2,y:.55,z:-8.6,ry:.5},{x:-18.1,y:.55,z:-7.5,ry:1.2},{x:24.2,y:.55,z:59.4,ry:-.4},{x:53.3,y:.075,z:10.9,rx:-Math.PI/2}]),i.push(qd(-18.6,-8,1.35,0,1.2));let ee=new ca(.125,.3,3,7);ee.rotateZ(Math.PI/2),ee.scale(1,.58,1);let A=new Y({color:11048046,roughness:1}),M=[],te=()=>new G().setHSL(.09,r.range(.14,.26),r.range(.42,.58)),N=(e,t,n,i,a,o)=>{for(let s=0;s<o;s++){let o=n-s*.05,c=Math.max(3,Math.floor((a-i)*o/.5));for(let n=0;n<=c;n++){let l=i+(a-i)*(n+s%2*.5)/c;M.push({x:e+Math.cos(l)*o+r.range(-.03,.03),y:.08+s*.148,z:t+Math.sin(l)*o+r.range(-.03,.03),ry:-l+Math.PI/2+r.range(-.12,.12),c:te()})}}},P=(e,t,n,i,a)=>{let o=Math.hypot(n-e,i-t),s=Math.max(2,Math.floor(o/.5)),c=(n-e)/s,l=(i-t)/s,u=Math.atan2(n-e,i-t)+Math.PI/2;for(let n=0;n<a;n++)for(let i=0;i<=s-n%2;i++)M.push({x:e+c*(i+n%2*.5)+r.range(-.03,.03),y:.08+n*.148,z:t+l*(i+n%2*.5)+r.range(-.03,.03),ry:u+r.range(-.1,.1),c:te()})};P(-28.9,-13.4,-26.6,-13.4,4),P(-26.7,-13.5,-26.7,-15.3,4),N(-12,68,2.2,-.5,Math.PI+.5,4),N(20,-14,1.9,Math.PI*.6,Math.PI*1.7,3),P(-43.4,-7.6,-43.4,-1.8,2),b(ee,A,M),i.push(Kd(-27.8,-13.4,1.3,.3,0,0,.9)),i.push(Kd(-26.7,-14.4,.3,1.1,0,0,.9)),i.push(qd(-12,68,2.6,0,.9)),i.push(qd(20,-14,2.3,0,.7)),i.push(Kd(-43.4,-4.7,.3,3.1,0,0,.55));{let e=new Ua;e.moveTo(-2.2,.02),e.lineTo(2.2,.02),e.lineTo(2.25,.95),e.lineTo(0,2.25),e.lineTo(-2.25,.95),e.closePath();let t=new Oo(e,{depth:5.4,bevelEnabled:!1});t.translate(0,0,-2.7);let n=new K(j([v(t,-45,0,-12,0,.72),v(t,66,0,16,0,-.52)]),c.olive);n.castShadow=!0,n.receiveShadow=!0,a.add(n),i.push(Kd(-45,-12,2.4,2.9,.72,0,2.4)),i.push(Kd(66,16,2.4,2.9,-.52,0,2.4))}let ne=j([v(new J(.055,.09,5.6,7),0,2.8,0),v(new q(1.3,.08,.08),0,5.42,0),v(new q(.34,.18,.22),-.48,5.32,.06,.55),v(new q(.34,.18,.22),.48,5.32,.06,.55)]),F=[{x:13,z:65,ry:2.6},{x:-39.5,z:-11.5,ry:.8},{x:60,z:1.5,ry:-1.9}];b(ne,c.steel,F),b(j([v(new Po(.28,.14),-.48,5.3,.185,.55),v(new Po(.28,.14),.48,5.3,.185,.55)]),new Y({color:14209720,emissive:12167288,emissiveIntensity:.25,roughness:.4}),F,{shadow:!1});for(let e of F)i.push(qd(e.x,e.z,.3,0,5.6));{let e=new K(new J(.04,.04,1.9,6),c.darkMetal);e.position.set(-41.8,.95,-8.4),e.castShadow=!0,a.add(e);let t=new K(new Po(1.7,.5),new ai({map:n.label(`FUEL POINT — NO SMOKING`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:96,font:`bold 36px Arial`}),side:2}));t.position.set(-41.8,1.62,-8.4),t.rotation.y=.6,a.add(t)}}let A=[];for(let[e,t,n]of[[-62,-58,0],[72,-52,2.4]]){let r=new En;r.position.set(e,0,t),a.add(r),l(c.olive,1.8,.9,1.8,0,.5,0,{parent:r,collide:!0});let i=new En;i.position.y=1.3,r.add(i);let o=new K(new J(.55,.55,.8,16),c.metal);o.rotation.x=Math.PI/2,i.add(o);let s=new K(new la(.5,20),new ai({color:15397631}));s.position.z=.42,i.add(s);let u=new Jo({uniforms:{uColor:{value:new G(12571903)},uOpacity:{value:.28}},vertexShader:`
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,fragmentShader:`
          precision mediump float;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
            float radial = pow(facing, 3.0);
            float axial = pow(clamp(vUv.y, 0.0, 1.0), 1.5); // v=1 at the lens
            float a = uOpacity * radial * (0.15 + 0.85 * axial);
            gl_FragColor = vec4(uColor, a);
          }
        `,transparent:!0,blending:2,side:1,depthWrite:!1}),d=new K(new J(.5,26,900,20,1,!0),u);d.rotation.x=-Math.PI/2,d.position.z=450,i.add(d),r.visible=!0,d.visible=!1,s.visible=!1,A.push({group:r,pivot:i,beam:d,lens:s,phase:n})}{let e=new Oi(new fa(1,0),c.rock,300),t=new Zt,i=new Dt,o=new cn,s=new G,l=0,u=0;for(;l<300&&u++<4e3;){let n=r.next()*Z,a=r.range(190,2600),c=Math.cos(n)*a,u=Math.sin(n)*a,d=r.range(.3,2.6),f=tf(c,u);o.set(r.next()*3,r.next()*3,r.next()*3),i.setFromEuler(o),t.compose(new W(c,f+d*.2,u),i,new W(d,d*r.range(.55,.9),d)),e.setMatrixAt(l,t),s.setHSL(.09,r.range(.12,.25),r.range(.38,.6)),e.setColorAt(l,s),l++}e.castShadow=!1,e.receiveShadow=!0,a.add(e);let d=new Po(1.6,1.1);d.translate(0,.5,0);let f=d.clone(),p=d.clone();p.rotateY(Math.PI/2);let m=j([f,p]),h=new Oi(m,new Y({map:n.scrub(),transparent:!0,alphaTest:.35,side:2,roughness:1}),420);for(l=0,u=0;l<420&&u++<6e3;){let e=r.next()*Z,n=r.range(175,1900),a=Math.cos(e)*n,s=Math.sin(e)*n,c=r.range(.5,1.6);o.set(0,r.next()*Z,0),i.setFromEuler(o),t.compose(new W(a,tf(a,s),s),i,new W(c,c,c)),h.setMatrixAt(l,t),l++}h.castShadow=!1,a.add(h);let g=new Y({map:n.grassTuft(),transparent:!0,alphaTest:.3,side:2,roughness:1}),_=new Oi(m.clone(),g,380);l=0,u=0;let v=0,y=0,b=0;for(;l<380&&u++<8e3;){if(b<=0){let e=r.next()*Z,t=r.range(180,1100);v=Math.cos(e)*t,y=Math.sin(e)*t,b=r.int(4,12)}let e=v+r.range(-14,14),n=y+r.range(-14,14);if(b--,Math.hypot(e,n)<178)continue;let a=r.range(.25,.7);o.set(0,r.next()*Z,0),i.setFromEuler(o),t.compose(new W(e,tf(e,n),n),i,new W(a,a*r.range(.7,1),a)),_.setMatrixAt(l,t),l++}_.castShadow=!1,a.add(_)}function j(e){let t=e.map(e=>e.toNonIndexed?e.toNonIndexed():e),n=0;for(let e of t)n+=e.attributes.position.count;let r=new kr;for(let e of[`position`,`normal`,`uv`]){let i=t[0].attributes[e].itemSize,a=new Float32Array(n*i),o=0;for(let n of t)a.set(n.attributes[e].array,o),o+=n.attributes[e].array.length;r.setAttribute(e,new mr(a,i))}return r}e.events.on(`time-of-day`,()=>{let t=e.weather.floodlightsOn;for(let e of k)e.spot.intensity=t?260:0,e.glow.material.opacity=t?.55:0,e.headMat.emissive.setHex(t?13623551:0),e.headMat.emissiveIntensity=t?2.4:0;if(E){let t=E,n=e.weather.timeOfDay;n===`night`?(t.lamp.color.setHex(16730664),t.lamp.intensity=5.5,t.troffMat.emissive.setHex(6690060),t.troffMat.emissiveIntensity=.3,t.domeMat.emissiveIntensity=3.2,t.consoleGlow.intensity=3,t.holoGlow.intensity=2.1,t.deskPool.intensity=1.5,t.panelMat.emissive.setHex(2756614),t.panelMat.emissiveIntensity=.5):n===`sunset`?(t.lamp.color.setHex(16767400),t.lamp.intensity=6,t.troffMat.emissive.setHex(15260084),t.troffMat.emissiveIntensity=.45,t.domeMat.emissiveIntensity=.4,t.consoleGlow.intensity=2,t.holoGlow.intensity=1.8,t.deskPool.intensity=1.1,t.panelMat.emissive.setHex(0),t.panelMat.emissiveIntensity=0):(t.lamp.color.setHex(15266047),t.lamp.intensity=7.4,t.troffMat.emissive.setHex(14674175),t.troffMat.emissiveIntensity=.62,t.domeMat.emissiveIntensity=0,t.consoleGlow.intensity=1.7,t.holoGlow.intensity=1.6,t.deskPool.intensity=.9,t.panelMat.emissive.setHex(0),t.panelMat.emissiveIntensity=0)}});let M={patriot:{position:new W(-46,0,32),heading:.9},thaad:{position:new W(2,0,50),heading:Math.PI*.72},sentinel:{position:new W(48,0,30),heading:-.6}},te=!1;return{group:a,consoleScreen:S,holoAnchor:C,consolePos:w,auxScreens:T,batteryPads:M,generators:ee,radarHead:O,get searchlightsActive(){return te},setSearchlights(e){te=e;for(let t of A)t.beam.visible=e,t.lens.visible=e},update(e,t){for(let n of o)n(e,t);if(te)for(let e of A){let n=t*.35+e.phase;e.pivot.rotation.y=Math.sin(n)*1.1+Math.sin(n*.37)*.6,e.pivot.rotation.x=-.65-Math.sin(n*.7)*.3}}}}var af=1.7,of=4.3,sf=7.4,cf=42,lf=11,uf=.38;function df(e){let{camera:t,renderer:n}=e,r={enabled:!0,locked:!1,yaw:Math.PI,pitch:0,feet:new W(2,0,14),vel:new W,bobPhase:0,bobAmp:0,trauma:0,shakeT:0,keys:new Set,moving:!1,sprinting:!1,footstepSide:0};r.feet.set(4,0,16),r.yaw=Math.PI*1;let i=n.domElement;function a(e){if(!r.locked||!r.enabled)return;let t=.0021;r.yaw-=e.movementX*t,r.pitch-=e.movementY*t,r.pitch=Cd(r.pitch,-1.45,1.45)}function o(e,t){if(e.repeat)return;let n=e.code;t?r.keys.add(n):r.keys.delete(n)}document.addEventListener(`mousemove`,a),window.addEventListener(`keydown`,e=>o(e,!0)),window.addEventListener(`keyup`,e=>o(e,!1)),document.addEventListener(`pointerlockchange`,()=>{r.locked=document.pointerLockElement===i,e.events.emit(`pointer-lock`,r.locked)});let s=new W,c=new W,l=new W,u=new W,d=new cn(0,0,0,`YXZ`);function f(e,t){return tf(e,t)}let p={state:r,get position(){return r.feet},get eyePosition(){return t.position},lockPointer(){r.locked||i.requestPointerLock?.()},unlockPointer(){r.locked&&document.exitPointerLock?.()},setEnabled(e){r.enabled=e,e||(r.keys.clear(),r.vel.set(0,0,0))},teleport(e,t,n,i=r.yaw,a=r.pitch){r.feet.set(e,t??f(e,n),n),r.yaw=i,r.pitch=a,r.vel.set(0,0,0),p.update(0)},addShake(e){r.trauma=Cd(r.trauma+e,0,1.2)},update(n){let i=e.settings.reducedMotion;if(r.enabled&&n>0){s.set(-Math.sin(r.yaw),0,-Math.cos(r.yaw)),c.set(-s.z,0,s.x),l.set(0,0,0);let t=r.keys;(t.has(`KeyW`)||t.has(`ArrowUp`))&&l.add(s),(t.has(`KeyS`)||t.has(`ArrowDown`))&&l.sub(s),(t.has(`KeyD`)||t.has(`ArrowRight`))&&l.add(c),(t.has(`KeyA`)||t.has(`ArrowLeft`))&&l.sub(c),r.sprinting=(t.has(`ShiftLeft`)||t.has(`ShiftRight`))&&l.lengthSq()>0;let i=r.sprinting?sf:of;if(l.lengthSq()>0){l.normalize().multiplyScalar(cf*n),r.vel.add(l);let e=r.vel.length();e>i&&r.vel.multiplyScalar(i/e)}else{let e=r.vel.length(),t=e*lf*n;r.vel.multiplyScalar(e>.001?Math.max(0,e-t)/e:0)}r.feet.x+=r.vel.x*n,r.feet.z+=r.vel.z*n;let a=Math.hypot(r.feet.x,r.feet.z);a>1200&&(r.feet.x*=1200/a,r.feet.z*=1200/a),Jd(r.feet,uf,1.8,e.world.colliders),r.feet.y=f(r.feet.x,r.feet.z)}let a=r.vel.length();r.moving=a>.4;let o=r.moving&&!i?Cd(a/sf,0,1):0;r.bobAmp=Td(r.bobAmp,o,8,Math.max(n,1e-4));let p=r.sprinting?11.4:8.4,m=r.bobPhase;r.moving&&(r.bobPhase+=n*p);let h=Math.abs(Math.sin(r.bobPhase))*.042*r.bobAmp,g=Math.sin(r.bobPhase*.5)*.02*r.bobAmp;Math.floor(m/Math.PI)!==Math.floor(r.bobPhase/Math.PI)&&r.moving&&(r.footstepSide^=1,e.events.emit(`footstep`,{sprint:r.sprinting,side:r.footstepSide})),r.trauma=Math.max(0,r.trauma-n*.85),r.shakeT+=n*34;let _=i?.12:1,v=r.trauma*r.trauma*_;u.set((Math.sin(r.shakeT*1.1)+Math.sin(r.shakeT*2.63)*.5)*.021*v,(Math.sin(r.shakeT*1.47+2)+Math.sin(r.shakeT*3.1)*.5)*.024*v,0);let y=Math.sin(r.shakeT*1.7+4)*.0035*v;t.position.set(r.feet.x+g*Math.cos(r.yaw)+u.x,r.feet.y+af+h+u.y,r.feet.z-g*Math.sin(r.yaw)),d.set(r.pitch,r.yaw+y,Math.sin(r.bobPhase*.5)*.0035*r.bobAmp),t.quaternion.setFromEuler(d)}};return p}function ff(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new kr,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=pf(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=pf(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function pf(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new mr(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var mf={patriot:{id:`patriot`,name:`RAMPART PX-4`,kind:`Terminal-phase battery`,desc:`Fast response · agile near base`,ammo:8,launchDelay:1,reloadTime:3.5,slewRate:1.5,interceptor:{accel:300,boostTime:2.4,maxSpeed:950,turnRate:.62,killRadius:10,avgSpeed:560,trailWidth:.8,color:14210248,flame:16761454,length:5.2,girth:.21},envelope:{minAlt:120,maxAlt:2800,maxRange:4200,sweetLow:300,sweetHigh:2200}},thaad:{id:`thaad`,name:`HALBERD HA-9`,kind:`High-altitude battery`,desc:`Slow spin-up · wide window`,ammo:6,launchDelay:2.4,reloadTime:6.5,slewRate:.85,interceptor:{accel:210,boostTime:4.4,maxSpeed:1400,turnRate:.34,killRadius:14,avgSpeed:800,trailWidth:1.05,color:13620441,flame:11130111,length:6.2,girth:.28},envelope:{minAlt:1200,maxAlt:5200,maxRange:8e3,sweetLow:1800,sweetHigh:4600}},sentinel:{id:`sentinel`,name:`SENTINEL LR-1`,kind:`Long-range test battery`,desc:`Three rounds · maximum reach`,ammo:3,launchDelay:3.4,reloadTime:12,slewRate:.5,interceptor:{accel:165,boostTime:6.2,maxSpeed:1800,turnRate:.22,killRadius:20,avgSpeed:980,trailWidth:1.5,color:14934229,flame:16753229,length:9.5,girth:.42},envelope:{minAlt:1900,maxAlt:12500,maxRange:14e3,sweetLow:2400,sweetHigh:9e3}}};function hf(n){let{scene:r,textures:i,baseMaterials:a}=n,o=n.base.batteryPads,s=[],c=new Map,l=new bd(90210);function u(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function d(t,{srgb:n=!0}={}){let r=new ia(t);return n&&(r.colorSpace=Ne),r.wrapS=r.wrapT=e,r.anisotropy=4,r}let f=(e,t,n,r)=>`rgba(${e},${t},${n},${r})`;function p(e,t,n,r,{fade:i=.1}={}){let a=new bd(r),[o,s]=u(512,512),[c,l]=u(512,512);s.fillStyle=e,s.fillRect(0,0,512,512),l.fillStyle=`#7f7f7f`,l.fillRect(0,0,512,512);for(let e=0;e<22;e++){let e=a.next()*512,r=a.next()*512,i=a.range(55,150),o=a.next()<.5?t:n,c=s.createRadialGradient(e,r,i*.15,e,r,i);c.addColorStop(0,f(o[0],o[1],o[2],a.range(.1,.22))),c.addColorStop(1,f(o[0],o[1],o[2],0)),s.fillStyle=c,s.fillRect(e-i,r-i,i*2,i*2)}let p=s.createLinearGradient(0,0,0,512);p.addColorStop(0,f(255,250,235,i)),p.addColorStop(.5,f(255,250,235,0)),p.addColorStop(1,f(20,18,14,.16)),s.fillStyle=p,s.fillRect(0,0,512,512);let m=[],h=[];for(let e=a.range(30,90);e<512;e+=a.range(80,150))m.push(e);for(let e=a.range(30,80);e<512;e+=a.range(70,130))h.push(e);s.lineWidth=2,l.lineWidth=3;for(let e of m)s.strokeStyle=f(10,10,8,.3),s.beginPath(),s.moveTo(e,0),s.lineTo(e,512),s.stroke(),s.strokeStyle=f(255,255,240,.07),s.beginPath(),s.moveTo(e+2,0),s.lineTo(e+2,512),s.stroke(),l.strokeStyle=f(30,30,30,.9),l.beginPath(),l.moveTo(e,0),l.lineTo(e,512),l.stroke();for(let e of h)s.strokeStyle=f(10,10,8,.3),s.beginPath(),s.moveTo(0,e),s.lineTo(512,e),s.stroke(),s.strokeStyle=f(255,255,240,.07),s.beginPath(),s.moveTo(0,e+2),s.lineTo(512,e+2),s.stroke(),l.strokeStyle=f(30,30,30,.9),l.beginPath(),l.moveTo(0,e),l.lineTo(512,e),l.stroke();for(let e of m)if(!(a.next()<.45))for(let t=8;t<512;t+=15)s.fillStyle=f(12,12,10,.35),s.beginPath(),s.arc(e+6,t,1.6,0,7),s.fill(),s.fillStyle=f(255,252,240,.16),s.beginPath(),s.arc(e+5.4,t-.6,.8,0,7),s.fill(),l.fillStyle=`#d8d8d8`,l.beginPath(),l.arc(e+6,t,1.7,0,7),l.fill();for(let e of h)if(!(a.next()<.55))for(let t=10;t<512;t+=16)s.fillStyle=f(12,12,10,.32),s.beginPath(),s.arc(t,e+6,1.5,0,7),s.fill(),l.fillStyle=`#d4d4d4`,l.beginPath(),l.arc(t,e+6,1.6,0,7),l.fill();for(let e=0;e<7;e++){let e=a.range(34,78),t=a.range(26,54),n=a.next()*(512-e),r=a.next()*(512-t);s.strokeStyle=f(8,8,6,.4),s.lineWidth=1.6,s.strokeRect(n,r,e,t),s.fillStyle=f(255,252,240,a.range(.02,.07)),s.fillRect(n,r,e,t),l.strokeStyle=`#4a4a4a`,l.lineWidth=2,l.strokeRect(n,r,e,t),s.fillStyle=f(10,10,8,.5);for(let[i,a]of[[5,5],[e-5,5],[5,t-5],[e-5,t-5]])s.beginPath(),s.arc(n+i,r+a,1.5,0,7),s.fill()}for(let e=0;e<42;e++){let e=a.next()*512,t=a.next()*512*.8,n=a.range(18,90),r=s.createLinearGradient(e,t,e,t+n);r.addColorStop(0,f(16,15,12,a.range(.1,.24))),r.addColorStop(1,f(16,15,12,0)),s.fillStyle=r,s.fillRect(e,t,a.range(1.5,4),n)}for(let e=0;e<90;e++)s.fillStyle=a.next()<.5?f(200,196,180,a.range(.05,.16)):f(14,13,11,a.range(.08,.2)),s.fillRect(a.next()*512,a.next()*512,a.range(2,9),a.range(1,2.6));s.fillStyle=f(20,20,16,.4);for(let e=0;e<5;e++){let e=a.next()*452,t=a.next()*492;for(let n=0;n<4;n++)s.fillRect(e+n*12,t,8,3.4);s.fillRect(e,t+6,34,2.6)}return{map:d(o),bump:d(c,{srgb:!1})}}let m=p(`#a2906a`,[122,104,72],[176,156,116],7401),h=p(`#636a52`,[76,82,62],[100,106,82],7402,{fade:.13}),g=(()=>{let[e,t]=u(192,192),[n,r]=u(192,192);t.fillStyle=`#4e5257`,t.fillRect(0,0,192,192),r.fillStyle=`#787878`,r.fillRect(0,0,192,192);for(let e=0;e<60;e++)t.fillStyle=f(20,22,24,l.range(.06,.18)),t.fillRect(l.next()*192,l.next()*192,l.range(6,26),l.range(4,16));let i=(e,n,i)=>{t.save(),t.translate(e,n),t.rotate(i),t.fillStyle=f(160,166,172,.5),t.fillRect(-7,-2.4,14,4.8),t.fillStyle=f(18,20,22,.45),t.fillRect(-7,1.2,14,1.6),t.restore(),r.save(),r.translate(e,n),r.rotate(i),r.fillStyle=`#e6e6e6`,r.fillRect(-7,-2.4,14,4.8),r.restore()};for(let e=8;e<192;e+=24)for(let t=8;t<192;t+=24){let n=(e/24|0)%2?12:0;i(t+n,e,Math.PI/4),i(t+n+12,e+12,-Math.PI/4)}for(let e=0;e<40;e++)t.fillStyle=f(200,205,210,l.range(.04,.1)),t.fillRect(l.next()*192,l.next()*192,l.range(3,10),1.4);return{map:d(e),bump:d(n,{srgb:!1})}})(),_=(()=>{let[e,t]=u(512,256);t.fillStyle=`#1c1e21`,t.fillRect(0,0,256,256);for(let e=0;e<256;e+=20){let n=(e/20|0)%2?18:0;t.fillStyle=`#2b2e32`,t.fillRect(e+2,6+n,14,92),t.fillRect(e+6,132+n,14,100),t.fillStyle=`#101215`,t.fillRect(e,0,3,256)}t.fillStyle=`#101215`,t.fillRect(0,114,256,22);for(let e=0;e<90;e++)t.fillStyle=f(120,116,104,l.range(.04,.14)),t.fillRect(l.next()*256,l.next()*256,l.range(3,10),l.range(2,4));t.fillStyle=`#191b1e`,t.fillRect(256,0,256,256),t.strokeStyle=`#26282c`,t.lineWidth=12,t.beginPath(),t.arc(384,128,104,0,7),t.stroke(),t.lineWidth=4,t.strokeStyle=`#111316`,t.beginPath(),t.arc(384,128,90,0,7),t.stroke(),t.fillStyle=`#3d4045`;for(let e=0;e<22;e++){let n=e/22*Z;t.save(),t.translate(384+Math.cos(n)*96,128+Math.sin(n)*96),t.rotate(n+Math.PI/2),t.fillRect(-8,-3.2,16,6.4),t.restore()}t.fillStyle=`#585d63`,t.beginPath(),t.arc(384,128,68,0,7),t.fill(),t.fillStyle=`#43474d`,t.beginPath(),t.arc(384,128,60,0,7),t.fill();for(let e=0;e<10;e++){let n=e/10*Z;t.fillStyle=`#23262a`,t.beginPath(),t.arc(384+Math.cos(n)*48,128+Math.sin(n)*48,6.8,0,7),t.fill(),t.fillStyle=`#787d84`,t.beginPath(),t.arc(384+Math.cos(n)*48-1.6,128+Math.sin(n)*48-1.6,2.8,0,7),t.fill()}t.fillStyle=`#31353a`,t.beginPath(),t.arc(384,128,18,0,7),t.fill(),t.fillStyle=`#15171a`,t.beginPath(),t.arc(384,128,10,0,7),t.fill();for(let e=0;e<50;e++){t.fillStyle=f(150,138,112,l.range(.04,.12));let e=l.next()*Z,n=l.range(72,124);t.fillRect(384+Math.cos(e)*n,128+Math.sin(e)*n,l.range(2,8),l.range(2,6))}return d(e)})(),v=(()=>{let[e,t]=u(256,256);t.fillStyle=`#4d5138`,t.fillRect(0,0,256,256);for(let e=0;e<256;e+=3)t.fillStyle=f(30,32,20,l.range(.04,.2)),t.fillRect(0,e,256,1.4);for(let e=0;e<46;e++)t.fillStyle=f(118,124,88,l.range(.05,.13)),t.fillRect(l.next()*256,l.next()*256,l.range(10,42),1.3);t.fillStyle=`#a8923a`,t.fillRect(0,20,256,7),t.font=`bold 13px Arial`,t.textBaseline=`middle`,t.fillStyle=`rgba(232,228,210,0.9)`;for(let e of[8,136])t.fillText(`HA-9 · IV-DEF`,e,44);t.fillStyle=`rgba(18,19,14,0.5)`,t.fillRect(0,244,256,12);for(let e=0;e<26;e++)t.fillStyle=f(24,26,18,l.range(.05,.16)),t.fillRect(l.next()*256,l.range(30,130),l.range(1.5,4),l.range(30,120));return d(e)})(),y=(()=>{let[e,t]=u(192,192);t.fillStyle=`#33362f`,t.fillRect(0,0,192,192);let n=t.createRadialGradient(96,96,20,96,96,192*.7);n.addColorStop(0,f(70,74,62,.5)),n.addColorStop(1,f(8,9,7,.55)),t.fillStyle=n,t.fillRect(0,0,192,192),t.strokeStyle=`#454a3e`,t.lineWidth=10,t.strokeRect(5,5,182,182),t.strokeStyle=f(10,10,8,.7),t.lineWidth=2,t.strokeRect(10,10,172,172),t.fillStyle=`#171a15`;for(let e=0;e<12;e++){let n=e/12,r=n<.25?10+n*4*172:n<.5?182:n<.75?182-(n-.5)*4*172:10,i=n<.25?10:n<.5?10+(n-.25)*4*172:n<.75?182:182-(n-.75)*4*172;t.beginPath(),t.arc(r,i,3,0,7),t.fill()}for(let e of[47.04,144.96]){let n=t.createRadialGradient(e,96,4,e,96,39.36);n.addColorStop(0,`#050604`),n.addColorStop(.75,`#0b0d09`),n.addColorStop(.92,`#2c2f28`),n.addColorStop(1,`#4a4f41`),t.fillStyle=n,t.beginPath(),t.arc(e,96,39.36,0,7),t.fill()}for(let e=0;e<80;e++)t.fillStyle=f(200,196,180,l.range(.03,.09)),t.fillRect(l.next()*192,l.next()*192,l.range(1,4),1.4);return d(e)})(),b=(()=>{let[e,t]=u(128,128);t.fillStyle=`#5b4132`,t.fillRect(0,0,128,128);let n=t.createRadialGradient(52,50,6,64,64,66);n.addColorStop(0,f(255,226,196,.18)),n.addColorStop(.75,f(30,18,12,.18)),n.addColorStop(1,f(12,8,6,.55)),t.fillStyle=n,t.fillRect(0,0,128,128),t.strokeStyle=f(24,14,10,.85),t.lineWidth=4,t.beginPath(),t.moveTo(20,20),t.lineTo(108,108),t.stroke(),t.beginPath(),t.moveTo(108,20),t.lineTo(20,108),t.stroke(),t.strokeStyle=f(214,196,170,.3),t.lineWidth=1.4,t.beginPath(),t.moveTo(17,23),t.lineTo(105,111),t.stroke(),t.beginPath(),t.moveTo(111,17),t.lineTo(23,105),t.stroke(),t.fillStyle=`#241a14`;for(let e=0;e<14;e++){let n=e/14*Z;t.beginPath(),t.arc(64+Math.cos(n)*54,64+Math.sin(n)*54,2.6,0,7),t.fill()}t.strokeStyle=f(20,12,8,.6),t.lineWidth=3,t.beginPath(),t.arc(64,64,47,0,7),t.stroke(),t.fillStyle=f(226,178,54,.85);for(let e of[.35,Math.PI/2+.35,Math.PI+.35,Math.PI*1.5+.35])t.save(),t.translate(64+Math.cos(e)*40,64+Math.sin(e)*40),t.rotate(e+Math.PI/2),t.fillRect(-6,-2,12,4),t.restore();for(let e=0;e<70;e++)t.fillStyle=f(16,10,8,l.range(.05,.25)),t.fillRect(l.next()*128,l.next()*128,l.range(1,3),l.range(1,2));return d(e)})(),x=(()=>{let[e,t]=u(128,128);t.clearRect(0,0,128,128);let n=t.createRadialGradient(64,64,14,64,64,62);n.addColorStop(0,f(4,4,4,0)),n.addColorStop(.34,f(8,7,6,.85)),n.addColorStop(.66,f(16,12,9,.5)),n.addColorStop(1,f(20,14,10,0)),t.fillStyle=n,t.fillRect(0,0,128,128);for(let e=0;e<26;e++){let e=l.next()*Z,n=l.range(26,40),r=n+l.range(14,26);t.strokeStyle=f(10,8,6,l.range(.2,.5)),t.lineWidth=l.range(2,5),t.beginPath(),t.moveTo(64+Math.cos(e)*n,64+Math.sin(e)*n),t.lineTo(64+Math.cos(e)*r,64+Math.sin(e)*r),t.stroke()}return d(e)})(),S=(()=>{let[e,t]=u(512,128),[n,r]=u(512,128);t.fillStyle=`#a3a49c`,t.fillRect(0,0,512,128),r.fillStyle=`#808080`,r.fillRect(0,0,512,128);for(let e of[7,121])t.fillStyle=`#8d8e86`,t.fillRect(0,e-7,512,14),t.strokeStyle=f(30,30,26,.5),t.lineWidth=2,t.beginPath(),t.moveTo(0,e+(e<20?7:-7)),t.lineTo(512,e+(e<20?7:-7)),t.stroke(),r.fillStyle=`#a8a8a8`,r.fillRect(0,e-7,512,14);for(let e=52;e<512;e+=104){let n=t.createRadialGradient(e-6,56,4,e,64,34);n.addColorStop(0,`#23241f`),n.addColorStop(.8,`#151612`),n.addColorStop(.92,`#5c5d55`),n.addColorStop(1,`#c4c5bb`),t.fillStyle=n,t.beginPath(),t.arc(e,64,34,0,7),t.fill(),r.fillStyle=`#232323`,r.beginPath(),r.arc(e,64,34,0,7),r.fill(),t.fillStyle=f(30,30,26,.7);for(let n of[26,102])t.beginPath(),t.arc(e+52,n,2.4,0,7),t.fill(),r.fillStyle=`#d0d0d0`,r.beginPath(),r.arc(e+52,n,2.4,0,7),r.fill(),r.fillStyle=`#232323`;let i=t.createLinearGradient(0,92,0,116);i.addColorStop(0,f(24,22,18,.3)),i.addColorStop(1,f(24,22,18,0)),t.fillStyle=i,t.fillRect(e-12,92,24,30)}for(let e=0;e<90;e++)t.fillStyle=l.next()<.5?f(230,228,218,l.range(.05,.12)):f(24,22,18,l.range(.06,.16)),t.fillRect(l.next()*512,l.next()*128,l.range(2,9),l.range(1,2.4));return{map:d(e),bump:d(n,{srgb:!1})}})(),C=(()=>{let[e,t]=u(512,256);t.fillStyle=`#ddd9cd`,t.fillRect(0,0,512,256),t.strokeStyle=f(90,86,76,.25),t.lineWidth=1.4;for(let e of[0,128,256,384])t.beginPath(),t.moveTo(e,0),t.lineTo(e,256),t.stroke();for(let e of[.09,.2,.34,.52,.66,.8,.9]){let n=(1-e)*256;t.strokeStyle=f(70,66,58,.5),t.lineWidth=2.2,t.beginPath(),t.moveTo(0,n),t.lineTo(512,n),t.stroke(),t.strokeStyle=f(255,255,250,.35),t.lineWidth=1,t.beginPath(),t.moveTo(0,n+2),t.lineTo(512,n+2),t.stroke()}t.fillStyle=`#a83a2c`,t.fillRect(0,(1-.84)*256-7,512,14),t.fillStyle=`#2e3236`,t.fillRect(0,94.28,512,6),t.fillStyle=f(70,66,58,.5);for(let e of[.2,.52,.8]){let n=(1-e)*256;for(let e=6;e<512;e+=18)t.beginPath(),t.arc(e,n+6,1.4,0,7),t.fill()}t.save(),t.rotate(-Math.PI/2),t.textAlign=`center`;for(let e of[96,352])t.fillStyle=`#41403a`,t.font=`bold 26px Arial`,t.fillText(`SENTINEL LR-1`,-143.36,e),t.font=`bold 15px Arial`,t.fillText(`ROUND T-3 · INERT TM`,-143.36,e+20);t.restore(),t.strokeStyle=`#41403a`,t.lineWidth=2,t.strokeRect(288,167.2,90,18);let n=t.createLinearGradient(0,256,0,196);n.addColorStop(0,f(38,30,24,.8)),n.addColorStop(1,f(38,30,24,0)),t.fillStyle=n,t.fillRect(0,196,512,60);for(let e=0;e<70;e++)t.fillStyle=f(120,112,96,l.range(.04,.12)),t.fillRect(l.next()*512,l.next()*256,l.range(2,8),l.range(1,2));return d(e)})(),w=(()=>{let[e,t]=u(256,512);t.fillStyle=`#c6c4ba`,t.fillRect(0,0,256,512);for(let e=40;e<512;e+=74)t.fillStyle=f(60,58,50,.3),t.fillRect(0,e-3,256,6),t.fillStyle=f(255,255,250,.35),t.fillRect(0,e+3,256,2);t.fillStyle=`rgba(168,58,44,0.85)`,t.fillRect(0,14,256,12),t.fillStyle=`rgba(60,80,110,0.6)`,t.fillRect(0,490,256,6),t.save(),t.rotate(-Math.PI/2),t.textAlign=`center`;for(let e of[64,192])t.fillStyle=`#3c3b35`,t.font=`bold 26px Arial`,t.fillText(`SNTL LR-1 · TEST ARTICLE`,-256,e-6),t.font=`bold 15px Arial`,t.fillText(`GROSS 4 900 KG · LIFT AT RINGS ONLY`,-256,e+16);t.restore();for(let e=0;e<150;e++)t.fillStyle=l.next()<.5?f(255,255,250,l.range(.05,.1)):f(50,46,40,l.range(.05,.14)),t.fillRect(l.next()*256,l.next()*512,l.range(2,8),l.range(1,3));return d(e)})(),T=(()=>{let[e,t]=u(128,64);t.fillStyle=`#0f1114`,t.fillRect(0,0,128,64);for(let e=5;e<60;e+=8)t.fillStyle=`#3d4248`,t.fillRect(4,e,120,3),t.fillStyle=`#181b1f`,t.fillRect(4,e+3,120,2);return t.strokeStyle=`#2c3036`,t.lineWidth=5,t.strokeRect(2,2,124,60),d(e)})(),E=(()=>{let[e,t]=u(32,256);for(let e=0;e<8;e++)t.fillStyle=e%2?`#b7b8b2`:`#9c3227`,t.fillRect(0,e*32,32,32);for(let e=0;e<120;e++)t.fillStyle=f(42,36,30,l.range(.04,.2)),t.fillRect(l.next()*32,l.next()*256,l.range(1,2.5),l.range(4,24));return d(e)})(),D=(()=>{let[e,t]=u(256,32);t.fillStyle=`#303338`,t.fillRect(0,0,256,32);for(let e=0;e<170;e++)t.fillStyle=l.next()<.55?f(126,130,134,l.range(.08,.45)):f(12,13,14,l.range(.1,.4)),t.fillRect(l.next()*256,l.next()*32,l.range(3,26),l.range(1,3));return d(e)})(),O=(()=>{let[e,t]=u(256,256);t.fillStyle=`#6a6d72`,t.fillRect(0,0,256,256);let n=t.createRadialGradient(128,120,8,128,120,155);n.addColorStop(0,`rgba(14,11,9,0.95)`),n.addColorStop(.42,`rgba(36,27,20,0.82)`),n.addColorStop(.72,`rgba(74,54,36,0.45)`),n.addColorStop(1,`rgba(92,82,72,0)`),t.fillStyle=n,t.fillRect(0,0,256,256);for(let e=0;e<80;e++){let e=l.next()*256;t.fillStyle=f(16,13,11,l.range(.1,.5)),t.fillRect(e,l.range(30,130),l.range(2,6),l.range(30,120))}return t.strokeStyle=`rgba(70,92,150,0.16)`,t.lineWidth=16,t.beginPath(),t.arc(128,120,118,0,7),t.stroke(),d(e)})(),k=(()=>{let[e,t]=u(256,96);t.fillStyle=`#d9d4c6`,t.fillRect(0,0,256,96),t.fillStyle=`#8e1d12`,t.fillRect(6,6,244,42),t.fillStyle=`#e6e1d3`,t.font=`bold 31px Arial`,t.textAlign=`center`,t.textBaseline=`middle`,t.fillText(`DANGER`,128,28),t.fillStyle=`#24262a`,t.font=`bold 16px Arial`,t.fillText(`HOT EXHAUST — STAND CLEAR`,128,68),t.strokeStyle=`#24262a`,t.lineWidth=4,t.strokeRect(2,2,252,92);for(let e=0;e<80;e++)t.fillStyle=`rgba(120,110,90,0.25)`,t.fillRect(l.next()*256,l.next()*96,l.range(1,4),l.range(1,2));return d(e)})(),ee=(()=>{let[e,t]=u(128,128);t.fillStyle=`#3a4034`,t.fillRect(0,0,128,128);let n=t.createRadialGradient(64,64,8,64,64,64);n.addColorStop(0,`rgba(255,255,255,0.12)`),n.addColorStop(.72,`rgba(0,0,0,0.06)`),n.addColorStop(1,`rgba(0,0,0,0.42)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.strokeStyle=`rgba(18,20,16,0.9)`,t.lineWidth=3,t.beginPath(),t.moveTo(16,16),t.lineTo(112,112),t.stroke(),t.beginPath(),t.moveTo(112,16),t.lineTo(16,112),t.stroke(),t.strokeStyle=`rgba(150,154,140,0.55)`,t.lineWidth=1.2,t.beginPath(),t.moveTo(13,19),t.lineTo(109,115),t.stroke(),t.beginPath(),t.moveTo(115,13),t.lineTo(19,109),t.stroke(),t.beginPath(),t.arc(64,64,38,0,7),t.stroke(),t.fillStyle=`#1d201b`;for(let e=0;e<16;e++){let n=e/16*Z;t.beginPath(),t.arc(64+Math.cos(n)*56,64+Math.sin(n)*56,2.6,0,7),t.fill()}for(let e=0;e<90;e++)t.fillStyle=f(16,18,14,l.range(.05,.28)),t.fillRect(l.next()*128,l.next()*128,l.range(1,3),l.range(1,2));return d(e)})(),A=e=>{let t=new Y(e);return t.envMapIntensity=e.envMapIntensity??1.5,t},j=h.map.clone();j.needsUpdate=!0;let M=A({map:m.map,bumpMap:m.bump,bumpScale:.7,roughness:.74,metalness:.16}),te=A({map:j,bumpMap:h.bump,bumpScale:.7,roughness:.7,metalness:.18,envMapIntensity:1.75}),N=A({color:4672338,roughness:.58,metalness:.55}),P=A({color:9409948,roughness:.4,metalness:.85,envMapIntensity:1.6}),ne=P,F=A({map:g.map,bumpMap:g.bump,bumpScale:.6,roughness:.62,metalness:.5}),I=A({map:_,roughness:.92,metalness:.08,envMapIntensity:1.15}),L=A({map:y,roughness:.8,metalness:.12}),re=A({map:b,roughness:.82,metalness:.05}),ie=A({map:x,transparent:!0,depthWrite:!1,roughness:1,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2}),ae=A({map:S.map,bumpMap:S.bump,bumpScale:.8,roughness:.6,metalness:.35}),R=A({map:S.map,bumpMap:S.bump,bumpScale:.8,roughness:.6,metalness:.35}),oe=A({map:C,roughness:.4,metalness:.14,envMapIntensity:1.7}),se=A({map:w,roughness:.6,metalness:.2}),ce=A({map:v,roughness:.66,metalness:.22,envMapIntensity:1.6}),le=A({color:4871777,roughness:.06,metalness:.9,envMapIntensity:2.4}),ue=A({map:T,roughness:.7,metalness:.3}),de=A({map:E,roughness:.72,metalness:.15}),fe=A({map:D,roughness:.6,metalness:.55}),pe=fe,me=A({map:O,roughness:.66,metalness:.35}),he=A({map:k,roughness:.85}),ge=A({map:ee,roughness:.9}),_e=A({color:9643291,roughness:.6,metalness:.2}),ve=A({color:14278374,roughness:.16,metalness:.85,envMapIntensity:1.9,emissive:16772546,emissiveIntensity:0}),ye=new Y({color:4203274,emissive:16742178,emissiveIntensity:.4,roughness:.5}),be=new Y({map:i.scorch(),transparent:!0,depthWrite:!1,roughness:1,polygonOffset:!0,polygonOffsetFactor:-2}),xe=new ai({map:i.blobShadow(),color:0,transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-3,opacity:.6});M.userData.texScale=3.2,te.userData.texScale=3.6,F.userData.texScale=1.4;let Se=[],Ce=(e,t,n=9075294)=>{e.emissive.setHex(n),e.emissiveIntensity=t,Se.push([e,t])};Ce(te,.07),Ce(M,.06),Ce(N,.07),Ce(F,.09),Ce(ae,.08),Ce(R,.08),Ce(fe,.07),Ce(L,.06),Ce(I,.05),Ce(me,.05),Ce(se,.05),Ce(ce,.06),Ce(ge,.06),Ce(re,.06),Ce(P,.04);let we=-1;for(let e of[P,F,L,ge,le,ue,ve,he,_e,a.rubber,a.cable,I,fe,a.hazard,ye,R])e.userData.noShadow=!0;let Te=new cn,Ee=new Dt,De=new W,Oe=new W,ke=new Zt;function z(e,t){let n=e.parameters;if(!n)return;let r=e.attributes.uv,i=l.next()*4,a=l.next()*4;if(n.depth!==void 0){let e=[[n.depth,n.height],[n.depth,n.height],[n.width,n.depth],[n.width,n.depth],[n.width,n.height],[n.width,n.height]];for(let n=0;n<6;n++){let[o,s]=e[n];for(let e=n*4;e<n*4+4;e++)r.setXY(e,r.getX(e)*(o/t)+i,r.getY(e)*(s/t)+a)}}else if(n.width!==void 0&&n.height!==void 0&&n.widthSegments!==void 0)for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)*(n.width/t)+i,r.getY(e)*(n.height/t)+a)}function Ae(e,{receive:t=!1}={}){let n=new Map,r=null;return{setBase(e){r=e},add(e,t,i=0,a=0,o=0,s=0,c=0,l=0){e.userData?.texScale&&z(t,e.userData.texScale),Te.set(s,c,l),Ee.setFromEuler(Te),ke.compose(De.set(i,a,o),Ee,Oe.set(1,1,1)),r&&ke.premultiply(r),t.applyMatrix4(ke);let u=n.get(e);return u||(u=[],n.set(e,u)),u.push(t),t},flush({shadow:r=!0}={}){for(let[i,a]of n){let n=new K(ff(a,!1),i);for(let e of a)e.dispose();n.castShadow=r&&!i.userData.noShadow,n.receiveShadow=t,e.add(n)}n.clear()}}}let B=(e,t,n)=>new q(e,t,n),V=(e,t,n,r=10,i=!1)=>new J(e,t,n,r,1,i),H=(e,t,n,r=10)=>new J(e,t,n,r).rotateX(Math.PI/2),je=(e,t,n=Z,r=12)=>new Ro(e,t,6,r,n),Me=(e,t)=>new Po(e,t),Pe=(e,t=10,n=7)=>new Io(e,t,n);function Fe(e,t,n){let r=e.attributes.uv;for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)+t,r.getY(e)+n);return e}function Ie(e,t,n){let r=e.attributes.uv;for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)*t,r.getY(e)*n);return e}let Le=new cn,Re=new Dt,ze=new Zt;function Be(e,t,n,r,{shadow:i=!1}={}){let a=new Oi(t,n,r.length);a.castShadow=i,a.receiveShadow=!1,a.frustumCulled=!1;let o=(e,t)=>{let n=r[e];Le.set(n.rx??0,n.ry??0,n.rz??0),Re.setFromEuler(Le),ze.compose(De.set(n.x,n.y,n.z),Re,Oe.setScalar(t)),a.setMatrixAt(e,ze),a.instanceMatrix.needsUpdate=!0};for(let e=0;e<r.length;e++)o(e,r[e].on===!1?1e-4:r[e].s??1);return e.add(a),{mesh:a,show:e=>o(e,r[e].s??1),hide:e=>o(e,1e-4),reset:()=>{for(let e=0;e<r.length;e++)o(e,r[e].on===!1?1e-4:r[e].s??1)}}}function Ve(e,t,n,r,i){e.add(N,V(.035,.045,1,8),n,r-.62,i),e.add(N,V(.075,.09,.07,10),n,r-.14,i),e.add(N,V(.02,.02,.3,6),n,r+.05,i),e.add(N,V(.06,.075,.05,10),n,r+.22,i);let a=new K(new J(.062,.07,.17,12),new Y({color:1192722,emissive:2293572,emissiveIntensity:2.2,roughness:.35}));return a.position.set(n,r+.05,i),t.add(a),a}function He(e,t,n,r=.07,i=.05){let a=new En;e.add(a);let o=new K(new J(r,r*1.06,1,10),te),s=new K(new J(i,i,1,8),ne);a.add(o),a.add(s),o.castShadow=s.castShadow=!1;let c=new W,l=new W,u=new W,d=new W,f=new Dt,p=new W(0,1,0),m=new W;function h(){c.copy(t.pos),t.node?.localToWorld?.(c),l.copy(n.pos),n.node?.localToWorld?.(l),e.worldToLocal(c),e.worldToLocal(l),d.subVectors(l,c);let r=d.length();f.setFromUnitVectors(p,m.copy(d).normalize()),u.addVectors(c,l).multiplyScalar(.5),o.position.copy(c).addScaledVector(d,.28),o.quaternion.copy(f),o.scale.set(1,r*.5,1),s.position.copy(u).addScaledVector(d,.12),s.quaternion.copy(f),s.scale.set(1,r*.62,1)}return h(),h}function Ue(e,t,n,r=.07,i=.05){let a=new En;a.position.set(0,t.pos.y,t.pos.z),e.add(a);let o=(e,n,r)=>{let i=new K(ff([new J(e,e*n,1,10).translate(t.pos.x,.5,0),new J(e,e*n,1,10).translate(-t.pos.x,.5,0)],!1),r);return i.castShadow=!1,a.add(i),i},s=o(r,1.06,te),c=o(i,1,ne),l=new W;function u(){l.copy(n.pos),n.node.localToWorld(l),e.worldToLocal(l);let r=l.y-t.pos.y,i=l.z-t.pos.z,o=Math.hypot(r,i);a.rotation.x=Math.atan2(i,r),s.position.y=o*.03,s.scale.y=o*.5,c.position.y=o*.31,c.scale.y=o*.62}return u(),u}let We=(e,t)=>Ie(new J(e,e,t,18,1,!0),.5,1),Ge=e=>Fe(Ie(new la(e,18),.5,1),.5,0);function Ke(e,t,n=.55,r=.42){for(let[i,a]of t){e.add(I,We(n,r),i,n,a,0,0,Math.PI/2);for(let t of[-1,1])e.add(I,Ge(n).rotateY(t>0?Math.PI/2:-Math.PI/2),i+t*r/2,n,a);e.add(N,V(n*.16,n*.16,r+.08,8),i,n,a,0,0,Math.PI/2)}}function qe(e,n,r={}){let i=new bd(4177),a=new Map,o=[],s=[],c=0;n.forEach(e=>{if(e.img&&a.has(e.img)){let t=a.get(e.img);o.push(t.y),s.push(t.h);return}let t=e.px??64;o.push(c),s.push(t),e.img&&a.set(e.img,{y:c,h:t}),c+=t});let l=c,[f,p]=u(256,l);p.clearRect(0,0,256,l),n.forEach((e,t)=>{let n=s[t],c=o[t];if(e.img&&a.get(e.img).drawn)return;let l=e.bg??r.bg;l&&(p.fillStyle=l,p.fillRect(0,c,256,n)),e.img?(p.drawImage(e.img,(256-n)/2,c,n,n),a.get(e.img).drawn=!0):(p.font=e.font??r.font??`bold 30px Arial`,p.textAlign=`center`,p.textBaseline=`middle`,p.fillStyle=e.fg??r.fg??`#dcd8ca`,p.fillText(e.text,128,c+n/2+2));for(let e=0;e<n*1.4;e++)p.clearRect(i.next()*256,c+i.next()*n,2,1.5)});let m=d(f);m.wrapS=m.wrapT=t;let h=new K(ff(n.map((e,t)=>{let n=new Po(e.w,e.h),r=s[t],i=o[t],a=e.img?(256-r)/2/256:0,c=e.img?(256+r)/2/256:1,u=n.attributes.uv;for(let e=0;e<u.count;e++)u.setXY(e,a+u.getX(e)*(c-a),(l-i-r+u.getY(e)*r)/l);return e.rx&&n.rotateX(e.rx),e.ry&&n.rotateY(e.ry),n.translate(e.x,e.y,e.z),e.base&&n.applyMatrix4(e.base),n}),!1),new Y({map:m,transparent:!0,roughness:.9}));return e.add(h),h}function Je(e,t,n=.03,r=a.cable){let i=new Sa(t.map(e=>new W(...e)));e.add(r,new zo(i,16,n,6))}function Ye(e,t,n,r=.5,i=.035,o=a.cable){Je(e,[t,[(t[0]+n[0])/2,Math.min(t[1],n[1])-r,(t[2]+n[2])/2],n],i,o)}function Xe(e,t,n,r,i,a=0){e.add(xe,Me(t,n).rotateX(-Math.PI/2),r,.045,i,0,a,0)}function Ze(e,t,n){let r=Math.cos(e.heading),i=Math.sin(e.heading);return{x:e.position.x+t*r+n*i,z:e.position.z-t*i+n*r}}let Qe=new En;Qe.name=`batteriesStatic`,r.add(Qe);let $e=Ae(Qe,{receive:!0}),et=Ae(Qe),tt=[],nt=i.roundel().image,rt=(()=>{let[e,t]=u(96,96);t.fillStyle=`#ded8c4`,t.fillRect(0,0,96,96),t.fillStyle=`#cf5514`,t.save(),t.translate(48,48),t.rotate(-Math.PI/4);for(let e=-2;e<=2;e+=2)t.fillRect(e*24-12,-80,24,160);t.restore(),t.strokeStyle=`#23241f`,t.lineWidth=5,t.strokeRect(2.5,2.5,91,91),t.fillStyle=`#3a3b35`;for(let[e,n]of[[10,10],[86,10],[10,86],[86,86]])t.beginPath(),t.arc(e,n,3.6,0,Z),t.fill();return e})();function it(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t),t.updateMatrix();let i=t.matrix.clone(),o=$e,s=et;o.setBase(i),s.setBase(i);for(let e of[-.88,.88])o.add(N,B(.16,.34,8.9),e,.92,0);for(let e of[-4.2,-2.8,-1.4,0,1.4,2.8,4.2])o.add(N,B(1.9,.18,.14),0,.9,e);o.add(F,Fe(B(2.6,.09,8.8),.13,.4),0,1.14,0);for(let e of[-1.31,1.31])o.add(N,B(.07,.24,8.8),e,1.05,0);for(let[e,t]of[[-1.2,4.3],[1.2,4.3],[-1.2,-4.3],[1.2,-4.3]])o.add(N,B(.06,.16,.12),e,1.26,t),o.add(N,je(.055,.018,Z,10),e,1.36,t,0,Math.PI/2,0);for(let e of[-.9,-2.1])o.add(N,V(.075,.075,2.4,8),0,.55,e,0,0,Math.PI/2);Ke(o,[[-1.38,-.9],[1.38,-.9],[-1.38,-2.1],[1.38,-2.1]],.55,.45);for(let e of[-1,1])o.add(M,Fe(B(.52,.06,2.9),.4*e,.7),e*1.38,1.26,-1.5),o.add(M,B(.52,.06,.5),e*1.38,1.12,.15,-.75,0,0),o.add(M,B(.52,.06,.5),e*1.38,1.12,-3.15,.75,0,0),o.add(a.rubber,B(.46,.4,.03),e*1.38,.58,-3.38);for(let[e,t]of[[-1.38,-.42],[1.38,-2.58]])o.add(pe,B(.4,.2,.24),e,.1,t,.5,0,0);for(let[e,t]of[[-1.5,2.9],[1.5,2.9],[-1.5,-3.7],[1.5,-3.7]]){let n=Math.sign(e);o.add(N,B(.26,.22,.62),n*1.06,.9,t),o.add(P,B(.15,.15,.95),n*1.55,.88,t),o.add(N,V(.1,.1,.5,10),n*1.95,.62,t),o.add(ne,V(.045,.045,.55,8),n*1.95,.28,t),o.add(N,B(.78,.06,.16),n*1.95,.07,t,0,Math.PI/4,0),o.add(N,B(.78,.06,.16),n*1.95,.07,t,0,-Math.PI/4,0),o.add(N,B(.4,.05,.4),n*1.95,.03,t),o.add(P,V(.02,.02,.34,6),n*1.95,.9,t+.2,Math.PI/2,0,0),o.add(P,Pe(.035,8,6),n*1.95,.9,t+.38)}for(let e of[-1,1])o.add(N,B(.13,.13,2.35),e*.36,.79,5.35,.06,-e*.335,0);o.add(P,je(.13,.045,Z,12),0,.7,6.42,Math.PI/2,0,0),o.add(N,V(.05,.05,.5,8),.2,.62,5.9,0,0,Math.PI/2),o.add(te,Fe(B(.85,.62,1.45),.31,.5),-.82,1.5,3.5),o.add(te,Fe(B(.85,.55,1.05),.62,.15),-.82,1.46,2.15);for(let e of[3.5,2.15])o.add(N,B(.06,.2,.05),-.38,1.45,e),o.add(N,B(.87,.05,.06),-.82,1.76,e+.52);for(let e of[.62,1.02])o.add(N,V(.4,.4,.05,14),e,1.62,4,0,0,Math.PI/2);o.add(a.cable,V(.26,.26,.36,12),.82,1.62,4,0,0,Math.PI/2);for(let e of[.62,1.02])o.add(N,B(.06,.5,.3),e,1.35,4);o.add(P,V(.02,.02,.22,6),1.1,1.62,4.14,Math.PI/2,0,0),o.add(I,We(.55,.38),.7,1.4,2.6),o.add(I,Ge(.55).rotateX(-Math.PI/2),.7,1.6,2.6),o.add(P,V(.05,.05,.5,8),.7,1.45,2.6),o.add(_e,B(.32,.5,.4),1.12,1.44,1.75),o.add(N,B(.34,.05,.06),1.12,1.6,1.96),o.add(N,V(.05,.08,.16,8),-1.18,1.28,4.25),o.add(P,V(.012,.02,2.7,6),-1.18,2.7,4.25,0,0,.05),o.add(P,Pe(.028,8,6),-1.25,4.04,4.25),o.add(N,B(.55,.66,.26),1.16,1.56,3),o.add(F,B(.34,.3,.03),1.16,1.62,3.15);for(let e of[-.18,0,.18])o.add(a.cable,H(.035,.035,.14,8),1.16+e,1.32,3.15);let c=Ve(o,t,-1.22,2.28,3.6);for(let[e,t]of[[-1.33,-4.38],[1.33,-4.38]])s.add(ye,B(.07,.09,.06),e,1.02,t);for(let[e,t]of[[-1.33,4.36],[1.33,4.36]])s.add(ye,B(.07,.09,.06),e,1.02,t);for(let e of[-1.33,1.33])s.add(ye,B(.07,.09,.06),e,1.02,0);s.add(ye,B(.07,.09,.06),-1.28,.98,11.62),s.add(ye,B(.07,.09,.06),1.28,.98,11.62);for(let e of[-.8,-.4,0,.4,.8])s.add(ye,B(.1,.06,.06),e,2.79,10.78);for(let e of[{text:`RAMPART PX-4`,w:1.5,h:.3,x:-1.36,y:1.42,z:1.2,ry:-Math.PI/2},{text:`RAMPART PX-4`,w:1.5,h:.3,x:1.36,y:1.42,z:.6,ry:Math.PI/2},{text:`IV-DEF 04`,w:.8,h:.2,x:-.82,y:1.5,z:4.24},{text:`FIRE`,w:.26,h:.11,x:1.295,y:1.44,z:1.75,ry:Math.PI/2},{text:`PWR`,w:.3,h:.12,x:1.16,y:1.86,z:3.14},{text:`IV 22-041`,w:.62,h:.15,x:0,y:1.06,z:11.77,fg:`#1c1d20`,bg:`#c9c4b2`},{img:rt,px:96,w:.56,h:.3,x:-1.362,y:1.05,z:.9,ry:-Math.PI/2},{img:rt,px:96,w:.56,h:.3,x:1.362,y:1.05,z:.9,ry:Math.PI/2}])tt.push({...e,base:i});o.add(N,V(1,1.15,.3,18),0,1.3,-2.9);let l=new En;l.position.set(0,1.55,-2.9),t.add(l);let u=Ae(l);u.add(N,V(1.12,1.28,.34,20),0,0,0),u.add(F,new la(1.06,20).rotateX(-Math.PI/2),0,.172,0),u.add(N,V(1.31,1.31,.1,20),0,-.16,0);for(let e=0;e<10;e++){let t=e/10*Z;u.add(N,B(.1,.12,.16),Math.cos(t)*1.16,.02,Math.sin(t)*1.16,0,-t,0)}for(let e of[-1,1])u.add(N,B(.3,.78,.6),e*1.38,.48,0),u.add(N,V(.16,.16,.16,12),e*1.52,.85,0,0,0,Math.PI/2),u.add(N,B(.32,.2,.7),e*1.38,.12,0);u.add(N,B(.5,.38,.55),.72,.28,.75),u.add(N,V(.07,.07,.2,8),.72,.28,1.08,Math.PI/2,0,0);for(let e of[-1,1])u.add(N,B(.24,.2,.26),e*.78,.08,1);u.flush();let d=new En;d.position.y=.3,l.add(d);let f=new En;d.add(f),f.position.set(0,.55,0);let p=Ae(f),m=[],h=[],g=[],_=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++){let n=(e-.5)*1.18,r=t*1.18,i=e*2+t;p.add(te,Fe(B(1.02,1.02,5.4),i*.37+.11,i*.29),n,r,0);for(let e of[-2.1,-.7,.7,2.1])p.add(N,B(1.1,1.1,.09),n,r,e);p.add(L,Me(.98,.98),n,r,2.72),p.add(N,Me(.98,.98),n,r,-2.72,0,Math.PI,0);for(let e of[-.26,.26])p.add(pe,H(.14,.2,.28,12),n+e,r,-2.86);for(let e of[-.26,.26]){p.add(N,je(.225,.02,Z,18),n+e,r,2.74);let t=g.length;g.push({x:n+e,y:r,z:2.755}),_.push({x:n+e,y:r,z:2.76,s:1,on:!1}),m.push({offset:new W(n+e,r,2.6),used:!1,coverIdx:t})}h.push({text:`RMP-${e}${t}`,w:.72,h:.2,x:n,y:r+.32,z:2.757})}h.push({img:nt,px:128,w:.62,h:.62,x:-1.125,y:.59,z:1.9,ry:-Math.PI/2}),qe(f,h,{font:`bold 26px Arial`});let v=Be(f,new la(.21,18),re,g),y=Be(f,new la(.34,16),ie,_);for(let e of m)e.hide=()=>{v.hide(e.coverIdx),y.show(e.coverIdx)},e.show=()=>{v.show(e.coverIdx),y.hide(e.coverIdx)},e.hasCover=!0;for(let e of[-1,1])for(let t of[0,1.18])for(let n of[-1.4,0,1.4])p.add(fe,B(.035,.06,1.62),e*1.115,t,n,.55,0,0),p.add(fe,B(.035,.06,1.62),e*1.115,t,n,-.55,0,0);for(let e of[-.59,.59])for(let t of[-1.4,0,1.4])p.add(fe,B(.06,.035,1.62),e,1.695,t,0,.57,0),p.add(fe,B(.06,.035,1.62),e,1.695,t,0,-.57,0);for(let[e,t]of[[-1.11,-.51],[1.11,-.51],[-1.11,1.69],[1.11,1.69]])p.add(fe,B(.05,.05,5.42),e,t,0);for(let e of[-.6,.6])p.add(fe,B(.2,.08,5.2),e,-.56,0);for(let e of[-2.2,-1.1,0,1.1,2.2])p.add(N,B(2.24,.07,.16),0,-.55,e);p.add(N,B(.09,.12,4.6),-1,-.56,0),p.add(N,B(.05,.05,4.9),.2,-.585,0),Je(p,[[-1,-.6,-2.2],[-.88,-.63,0],[-1.02,-.6,2]],.032,N);for(let[e,t]of[[-.3,-1.6],[.85,.6]])p.add(F,B(.4,.05,.5),e,-.555,t);p.add(R,Ie(B(2.24,2.2,.16),.55,2),0,.7,-2.8),p.add(fe,Fe(B(2.24,.05,.9),.3,.62),0,-.92,-3.16,-.8,0,0);for(let e of[-.28,0,.28])p.add(N,B(2.1,.08,.03),0,-.885+e*.752,-3.196+e*.661,-.8,0,0);for(let e of[-1.09,1.09])p.add(N,B(.06,.08,.86),e,-.79,-3.05,-.8,0,0);p.add(N,B(.1,2.42,5.15),0,.59,0),p.add(N,B(2.24,.18,5.15),0,.59,0);for(let e of[-1.28,1.28])p.add(N,V(.13,.13,.36,12),e,-.55,0,0,0,Math.PI/2);for(let[e,t]of[[-.59,-1.7],[.59,-1.7],[-.59,1.7],[.59,1.7]])p.add(N,B(.05,.14,.1),e,1.76,t),p.add(N,je(.05,.016,Z,10),e,1.84,t,0,Math.PI/2,0);p.add(N,B(.07,.12,4.4),1.33,1,-.3),p.add(N,B(.18,.22,.3),1.33,.9,-2.4),Je(p,[[1.33,.8,-2.4],[1.28,.2,-2],[1.05,-.5,-1.1],[.75,-.72,-.4]],.04,N),p.flush();let b=Ue(l,{pos:new W(.78,.12,1)},{pos:new W(.78,-.45,1.55),node:f},.09,.062);Je(o,[[.55,1.15,-2.6],[.95,1.25,-.5],[1.16,1.3,2.85]],.04),Ye(o,[1.16,1.25,3.15],[2.3,.06,4.6],.55,.045),Ye(o,[-.4,1.05,-2.95],[-2.2,.06,-4.6],.5,.04);for(let e of[-.55,.55])o.add(N,B(.14,.3,5),e,.82,9.15);for(let e of[7.2,8.4,9.6,10.8])o.add(N,B(1.1,.16,.12),0,.78,e);o.add(N,B(.3,.34,.3),0,.72,6.85),o.add(P,je(.09,.03,Math.PI*1.5,10),0,.7,6.6,0,0,Math.PI/2);for(let e of[7.7,10.55])o.add(N,V(.085,.085,2.3,8),0,.58,e,0,0,Math.PI/2);Ke(o,[[-1.18,7.7],[1.18,7.7],[-1.18,10.55],[1.18,10.55]],.58,.5),o.add(F,Fe(B(2.35,.08,2.7),.31,.7),0,1.24,8.25),o.add(te,Fe(B(2,1.05,2.3),.44,.62),0,1.82,8.2),o.add(N,B(2.04,.08,2.34),0,2.38,8.2),o.add(ue,B(.03,.6,1.5),1.02,1.86,8.2),o.add(ue,B(.03,.6,1.5),-1.02,1.86,8.2),o.add(pe,V(.07,.07,.5,8),.8,2.62,7.4),o.add(pe,V(.1,.09,.1,8),.8,2.9,7.4);for(let e of[7.2,9.2])o.add(N,B(2.3,.05,.06),0,1.6,e);Ye(o,[.85,1.4,7.05],[1.16,1.35,3.2],.75,.045),o.add(M,Fe(B(2.3,.7,1.1),.12,.05),0,1.55,11),o.add(M,Fe(B(2.35,1.28,1.75),.55,.35),0,2.02,9.95),o.add(M,B(2.4,.09,1.85),0,2.72,9.95),o.add(N,B(2.15,.5,1.6),0,1.06,10),o.add(N,B(2.1,.78,.07),0,2.34,10.86,-.12,0,0),s.add(le,Me(1.9,.62),0,2.35,10.905,-.12,0,0),o.add(N,B(.09,.78,.07),-.02,2.34,10.86,-.12,0,0);for(let e of[-1,1])s.add(le,Me(.9,.52),e*1.181,2.36,9.95,0,e*Math.PI/2,0),o.add(N,B(.02,1.2,.05),e*1.18,1.95,9.35),o.add(N,B(.02,1.2,.05),e*1.18,1.95,10.55),o.add(P,B(.03,.05,.2),e*1.19,1.86,9.55),o.add(F,B(.42,.05,.5),e*1.25,.78,9.9),o.add(F,B(.42,.05,.5),e*1.25,1.2,9.9),o.add(P,V(.018,.018,.5,6),e*1.3,2.62,10.7,0,0,e*1.15),o.add(N,B(.2,.34,.03),e*1.52,2.42,10.72),s.add(le,Me(.16,.28),e*1.52,2.42,10.74);o.add(ue,B(1.4,.5,.06),0,1.62,11.56),o.add(N,B(2.5,.36,.3),0,.95,11.6);for(let e of[-.92,-.68,.68,.92])o.add(ve,H(.08,.08,.06,12),e,1.32,11.62),o.add(N,H(.1,.1,.05,12),e,1.32,11.6);for(let e of[-.75,0,.75])o.add(P,V(.025,.025,1.3,8),e,1.65,11.72);for(let e of[1.25,1.85])o.add(P,V(.022,.022,1.9,8),0,e,11.73,0,0,Math.PI/2);for(let e of[-1,1])o.add(M,B(.5,.06,1.5),e*1.2,1.32,10.55),o.add(a.rubber,B(.44,.42,.03),e*1.2,.6,9.75),o.add(N,B(.48,.05,.04),e*1.18,.72,7.02),o.add(a.rubber,B(.44,.44,.03),e*1.18,.46,7);o.add(N,B(.06,.06,.14),-.75,2.79,9.08),s.add(ye,B(.11,.09,.06),-.75,2.76,8.99),o.add(pe,V(.075,.075,1.7,8),1.12,2.2,9),o.add(P,new J(.11,.11,1,8,1,!0,0,Math.PI),1.12,2.2,9),o.add(pe,V(.07,.075,.24,8),1.12,3.12,8.96,.5,0,0),o.add(N,B(.16,.9,.16),-1.12,2.5,9.25),o.add(N,B(.22,.22,.2),-1.12,3,9.25),o.add(M,Fe(B(.9,.24,.9),.7,.8),-.45,2.86,9.6),o.add(ue,B(.92,.12,.5),-.45,2.84,9.6),o.add(P,V(.04,.07,.3,8),.35,2.86,9.55,-1.2,0,0),o.add(P,V(.01,.016,1.4,6),.9,3.4,9.4,0,0,.06),o.add(M,B(2.2,.04,.34),0,2.78,10.92,.35,0,0),Xe(s,5.4,11,0,.2),Xe(s,4.6,6.6,0,9.2),n.world.colliders.push(Kd(e.position.x,e.position.z,2,4.8,e.heading,0,3));let x=Ze(e,0,9.2);return n.world.colliders.push(Kd(x.x,x.z,1.6,2.7,e.heading,0,3)),{group:t,turntable:l,elevGroup:f,tubes:m,statusLight:c,markerMat:ye,restElevation:.66,fireElevation:.66,elevAxis:`x`,elevSign:-1,hydUpdaters:[b],muzzleForward:new W(0,0,1),recoilNode:f,recoilBase:0,recoilAmp:.11,recoil:0,resetWear:()=>{v.reset(),y.reset()}}}function at(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t),t.updateMatrix();let i=t.matrix.clone(),o=$e,s=et;o.setBase(i),s.setBase(i),o.add(M,Fe(B(2.5,.6,10.6),.07,.33),0,1.02,0);for(let e of[-.78,.78])o.add(N,B(.18,.4,10.8),e,.6,0);for(let e of[-4.6,-3,-1.4,.2,1.8,3.4])o.add(N,B(1.6,.16,.14),0,.55,e);o.add(F,Fe(B(2.5,.06,6.6),.5,.24),0,1.36,-1.9);for(let e of[-4.6,-2.6,-.6])for(let t of[-1,1])o.add(P,je(.06,.02,Math.PI,8),t*1.2,1.4,e);o.add(M,Fe(B(2.6,1.15,2.4),.42,.13),0,1.78,4.55),o.add(M,Fe(B(2.5,1,2.05),.8,.55),0,2.85,4.38),o.add(M,B(2.56,.09,2.12),0,3.4,4.38),o.add(N,B(2.3,.8,.06),0,3,5.4,-.1,0,0),s.add(le,Me(2.14,.66),0,3,5.44,-.1,0,0);for(let e of[-1.1,0,1.1])o.add(N,B(.08,.8,.07),e,3,5.41,-.1,0,0);for(let e of[-.55,.45])o.add(N,B(.02,.34,.02),e,2.78,5.475,-.1,0,.5);for(let e of[-1,1])o.add(N,B(.03,.65,.88),e*1.255,2.98,4.6),s.add(le,Me(.78,.55),e*1.272,2.98,4.6,0,e*Math.PI/2,0),o.add(N,B(.02,1.5,.05),e*1.26,2.4,5.25),o.add(N,B(.02,1.5,.05),e*1.26,2.4,3.95),o.add(P,B(.03,.05,.22),e*1.27,2.42,4.1);o.add(ue,B(1.8,.62,.08),0,1.98,5.78);for(let e of[-1.02,-.78,.78,1.02])o.add(ve,H(.085,.085,.07,12),e,1.5,5.79);for(let e of[-1.02,-.78,.78,1.02])o.add(N,H(.105,.105,.05,12),e,1.5,5.77);o.add(N,B(2.85,.42,.35),0,.94,5.9);for(let e of[-.85,0,.85])o.add(P,V(.028,.028,1.5,8),e,1.7,6.02);for(let e of[1.35,2.05])o.add(P,V(.024,.024,2.2,8),0,e,6.03,0,0,Math.PI/2);o.add(M,Fe(B(1,.26,1),.66,.74),-.35,3.56,4.1),o.add(ue,B(1.02,.13,.55),-.35,3.53,4.1),o.add(M,B(2.4,.04,.36),0,3.46,5.5,.35,0,0);for(let e of[-1,1])o.add(P,V(.05,.085,.42,10),e*.42,3.52,4.9,-1.25,0,0);o.add(te,Fe(V(.16,.16,1.15,10),.7,.2).rotateZ(Math.PI/2),.62,3.63,3.72);for(let e of[.35,.9])o.add(N,je(.165,.018,Z,10),e,3.63,3.72,0,Math.PI/2,0);for(let[e,t]of[[.45,4.42],[.82,4.42]])o.add(te,Fe(B(.32,.4,.17),e,t*.1),e,3.66,t),o.add(N,B(.14,.05,.05),e,3.88,t);for(let e of[3.52,4.62])o.add(P,V(.016,.016,1,6),.62,3.52,e,0,0,Math.PI/2);for(let e of[-.9,-.45,0,.45,.9])o.add(ye,B(.11,.06,.06),e,3.47,5.42);for(let e of[-1,1])o.add(ye,B(.06,.09,.09),e*1.29,3.42,5.35);for(let[e,t]of[[-1.28,-5.28],[1.28,-5.28]])o.add(ye,B(.07,.09,.06),e,1.05,t);for(let[e,t]of[[-1.28,-2.4],[1.28,-2.4],[-1.28,1.4],[1.28,1.4]])o.add(ye,B(.07,.09,.06),e,1.05,t);o.add(P,V(.012,.018,1.6,6),-1.05,4.2,3.6,0,0,.06);for(let e of[-1,1])o.add(P,V(.02,.02,.55,8),e*1.42,3.15,5.3,0,0,e*1.2),o.add(N,B(.24,.38,.04),e*1.66,2.95,5.32),s.add(le,Me(.19,.32),e*1.66,2.95,5.345);o.add(pe,V(.085,.085,2.15,10),1.16,2.65,3.25),o.add(P,new J(.13,.13,1.3,10,1,!0,0,Math.PI),1.16,2.4,3.25),o.add(pe,V(.08,.085,.3,10),1.16,3.82,3.2,.5,0,0);for(let e of[-1,1]){o.add(P,H(.34,.34,1.7,14),e*1.22,.8,2.3);for(let t of[1.85,2.75])o.add(N,je(.36,.028,Z,14),e*1.22,.8,t);o.add(F,B(.55,.04,1.6),e*1.22,1.17,2.3)}for(let e of[-1,1])o.add(F,B(.5,.05,.55),e*1.32,.62,4.9),o.add(F,B(.5,.05,.55),e*1.32,1.08,4.9),o.add(P,V(.02,.02,1.3,8),e*1.31,1.95,5.52);for(let e of[-1,1])o.add(M,B(.56,.06,1.6),e*1.42,1.42,4.2),o.add(M,B(.56,.06,.45),e*1.42,1.3,5.1,-.6,0,0),o.add(a.rubber,B(.5,.5,.035),e*1.42,.62,3.35),o.add(a.rubber,B(.5,.5,.035),e*1.42,.62,-5.12);let c=[4.2,1.6,-.6,-2.6,-4.4];for(let e of c)o.add(N,V(.08,.08,2.4,8),0,.62,e,0,0,Math.PI/2);Ke(o,c.flatMap(e=>[[-1.42,e],[1.42,e]]),.62,.5);for(let e of[-1,1])for(let t of[3.5,-5.1])o.add(N,B(.52,.05,.04),e*1.42,.72,t),o.add(a.rubber,B(.5,.46,.03),e*1.42,.45,t-.02);o.add(N,B(.06,.06,.14),.75,3.32,3.4),s.add(ye,B(.11,.09,.06),.75,3.28,3.31);for(let e of[-1,1])o.add(N,B(.32,.3,.5),e*1.25,1,-4.95),o.add(ne,V(.09,.09,1.1,10),e*1.6,.62,-4.95),o.add(N,B(.6,.1,.6),e*1.6,.07,-4.95),o.add(N,B(.55,.12,.14),e*1.42,1.05,-4.95,0,0,e*.45);o.add(N,V(1.2,1.28,.05,24),0,1.415,-3.4),s.add(_e,je(1.36,.018,Z,28),0,1.4,-3.4,Math.PI/2,0,0),o.add(I,We(.6,.35).rotateX(Math.PI/2),-.55,2,3.28),o.add(I,Ge(.6),-.55,2,3.455),o.add(te,Fe(B(.7,.52,.8),.55,.8),1.18,1.06,.5),o.add(te,Fe(B(.7,.5,.85),.15,.42),-1.18,1.04,-1.6);for(let e of[-.1,.14])o.add(P,V(.11,.11,.9,10),.2,.62+e,-3.9,0,0,Math.PI/2);o.add(N,B(2.2,.24,.4),0,1.5,.9),o.add(a.rubber,B(2.1,.06,.34),0,1.65,.9);let l=new En;l.position.set(0,1.55,-3.4),t.add(l);let u=Ae(l);u.add(N,B(2.1,.07,3.5),0,-.075,1.05),u.add(F,Fe(B(1.9,.02,3.3),.6,.15),0,-.03,1.05);for(let e of[-1,1])u.add(N,B(.42,.62,.55),e*.95,0,0),u.add(P,V(.17,.17,.2,12),e*1.21,0,0,0,0,Math.PI/2),u.add(N,V(.14,.14,.3,12),e*1.02,0,0,0,0,Math.PI/2),u.add(N,B(.26,.18,.26),e*.92,.05,2.4);u.add(N,Fe(B(.55,.36,.5),.3,.66),-.62,.14,1.75),u.add(N,je(.13,.035,Z,12),-.62,.35,1.75,Math.PI/2,0,0),u.flush();let d=new En;l.add(d);let f=new En;d.add(f),f.position.set(0,.3,1.2);let p=Ae(f),m=[],h=[],g=[],_=[],v=.4,y=.86;for(let e of[0,1,2,3])for(let t=0;t<2;t++){let n=(t-.5)*1,r=.35+e*y,i=e*2+t,a=e===3;p.add(ce,Fe(H(v,v,7,18),i*.29+.07,0),n,r,.4);for(let e of[-2.6,-1.2,.2,1.6,3])p.add(N,H(.42000000000000004,.42000000000000004,.1,18),n,r,e+.4);p.add(pe,H(.43000000000000005,.43000000000000005,.18,18),n,r,3.92),p.add(N,H(.42000000000000004,.42000000000000004,.1,18),n,r,-3.08);let o=4.02;if(a)p.add(pe,new la(.36000000000000004,16),n,r,3.8599999999999994),_.push({x:n,y:r,z:o,s:1.3,on:!0});else{let i=g.length;g.push({x:n,y:r,z:o}),_.push({x:n,y:r,z:4.0249999999999995,s:1.15,on:!1}),m.push({offset:new W(n,r+.3,5.12),used:!1,coverIdx:i,row:e,col:t}),p.add(N,B(.36,.16,.05),n,r+.52,3.9599999999999995),h.push({text:`H-${i+1}`,w:.3,h:.12,x:n,y:r+.52,z:3.9899999999999998})}}qe(f,h,{font:`bold 34px Arial`});let b=Be(f,new la(.385,20),ge,g),x=Be(f,new la(v,16),ie,_);for(let e of m)e.hide=()=>{b.hide(e.coverIdx),x.show(e.coverIdx)},e.show=()=>{b.show(e.coverIdx),x.hide(e.coverIdx)},e.hasCover=!0;3.33+.28;let S=1.06,C={zs:[-3,-1.5,0,1.5,3]};for(let e of[-1,1]){p.add(fe,Fe(B(.09,.14,7.5),e,.2),e*S,-.25,.4),p.add(fe,Fe(B(.09,.14,7.5),e,.5),e*S,3.1100000000000003,.4);for(let t=0;t<C.zs.length;t++){let n=C.zs[t]+.4;if(p.add(N,B(.07,3.33,.09),e*S,2.8600000000000003/2,n),t<C.zs.length-1){let n=(C.zs[t]+C.zs[t+1])/2+.4,r=C.zs[t+1]-C.zs[t],i=Math.hypot(r,3.2100000000000004),a=Math.atan2(3.2100000000000004,r);p.add(N,V(.026,.026,i*.98,6).rotateZ(Math.PI/2),e*S,2.8600000000000003/2,n,a,Math.PI/2,0),p.add(N,V(.026,.026,i*.98,6).rotateZ(Math.PI/2),e*S,2.8600000000000003/2,n,-a,Math.PI/2,0)}}}for(let e of[-2.6,.4,3.4])p.add(N,B(S*2,.1,.09),0,3.1100000000000003,e),p.add(N,B(S*2,.1,.09),0,-.25,e);p.add(F,Fe(B(S*2,.12,7.4),.23,.5),0,-.36,.4);for(let e of[3.8,-3]){p.add(N,B(2.24,.16,.2),0,-.22,e),p.add(N,B(2.24,.16,.2),0,3.1900000000000004,e);for(let t of[-1,1])p.add(N,B(.16,3.7100000000000004,.2),t*S,3.2500000000000004/2,e)}p.add(N,B(.07,.12,6.4),1.1400000000000001,1.2,.2);for(let e of[0,1,2]){let t=.35+e*y;Je(p,[[1.12,1.2,-2.2+e*.5],[.9600000000000001,t+.2,-2.6+e*.4],[.85,t,-2.9+e*.4]],.026,N)}p.add(R,Ie(B(S*2-.2,2.91,.12),.5,3),0,3.0100000000000002/2,.4-7/2-.1);for(let[e,t]of[[-.5,.6],[.5,.6],[-.5,1.85],[.5,1.85]])p.add(F,B(.44,.44,.06),e,t,.4-7/2-.18);for(let[e,t]of[[-.2,1.25],[.25,1.3]])p.add(N,je(.07,.02,Z,10),e,t,.4-7/2-.2);for(let[e,t]of[[-.85,.3],[.88,2.3]])p.add(N,je(.1,.03,Math.PI/2,8),e,t,.4-7/2-.18);p.flush();for(let e of[{text:`HALBERD HA-9`,w:1.7,h:.3,x:-1.26,y:1.06,z:1.4,ry:-Math.PI/2},{text:`HALBERD HA-9`,w:1.7,h:.3,x:1.26,y:1.06,z:-.6,ry:Math.PI/2},{text:`HA-9 · IV-DEF`,w:.9,h:.18,x:.7,y:.98,z:6.09,fg:`#1c1d20`,bg:`#c9c4b2`,font:`bold 26px Arial`},{text:`HALBERD HA-9`,w:1.9,h:.36,x:0,y:1.6,z:5.93,bg:`#42452f`},{img:nt,px:128,w:.5,h:.5,x:-1.287,y:2.35,z:4.62,ry:-Math.PI/2},{img:rt,px:96,w:.5,h:.42,x:-1.315,y:1.85,z:3.85,ry:-Math.PI/2},{img:rt,px:96,w:.5,h:.42,x:1.315,y:1.85,z:3.85,ry:Math.PI/2}])tt.push({...e,base:i});let w=Ue(l,{pos:new W(.92,.08,2.4)},{pos:new W(.92,.1,1.8),node:f},.115,.08);o.add(N,B(.72,.52,.38),2.5,.26,-5.2),o.add(F,B(.5,.28,.04),2.5,.3,-4.99),Ye(o,[.4,1.1,-4.9],[2.35,.52,-5.15],.35,.04),Ye(o,[.1,1.05,-4.95],[2.42,.5,-5.3],.5,.035),Ye(o,[-.2,1,-4.85],[2.3,.48,-5],.65,.03),Ye(o,[2.62,.4,-5.2],[3.8,.05,-5.9],.3,.05);let T=Ve(o,t,-1.35,2.45,-5.05);Xe(s,5.2,13.4,0,.3),n.world.colliders.push(Kd(e.position.x,e.position.z,1.9,5.8,e.heading,0,3.4));let E=Ze(e,2.5,-5.2);return n.world.colliders.push(qd(E.x,E.z,.6,0,.6)),{group:t,turntable:l,elevGroup:d,tubes:m,statusLight:T,markerMat:ye,slewMul:.55,restElevation:.5,fireElevation:1.18,elevAxis:`x`,elevSign:-1,hydUpdaters:[w],muzzleForward:new W(0,0,1),recoilNode:f,recoilBase:1.2,recoilAmp:.14,recoil:0,resetWear:()=>{b.reset(),x.reset()}}}function ot(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t),t.updateMatrix();let i=t.matrix.clone(),o=$e,s=et;o.setBase(i),s.setBase(i),o.add(a.concrete,V(4.4,4.8,.7,28),0,.35,0),o.add(a.hazard,new J(4.45,4.45,.14,28,1,!0),0,.66,0),o.add(N,V(.95,1.25,1.15,16),.4,.575,0),o.add(F,V(1.12,1.12,.09,16),.4,1.1,0);for(let e=0;e<8;e++){let t=e/8*Z;o.add(P,V(.05,.05,.1,6),.4+Math.cos(t)*1,1.16,Math.sin(t)*1)}o.add(me,B(2.6,.18,2.5),.4,.9,-2.1,.62,0,0);for(let e of[-1,1])o.add(me,B(.14,1,2.2),.4+e*1.32,.85,-2.1,.45,0,0);for(let e of[-.8,-.4,0,.4,.8])o.add(pe,B(2.5,.06,.1),.4,.98,-2.1+e,.62,0,0);for(let e of[-.7,.7])o.add(N,B(.16,.7,.16),.4+e,.55,-1.6);s.add(be,Me(4.2,4.2).rotateX(-Math.PI/2),.4,.715,-2.4);let c=i.clone().multiply(ke.makeTranslation(-3,0,0)),l=$e;l.setBase(c),et.setBase(c);for(let[e,t]of[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]])l.add(de,V(.09,.13,13,10),e,6.5,t),l.add(N,B(.5,.08,.5),e,.04,t);for(let e=1;e<=6;e++){let t=e*2;for(let e of[-.6,.6])l.add(P,B(1.32,.08,.08),0,t,e),l.add(P,B(.08,.08,1.32),e,t,0);for(let e of[-.6,.6])l.add(P,V(.024,.024,2.2,6),0,t-1,e,0,0,.55),l.add(P,V(.024,.024,2.2,6),0,t-1,e,0,0,-.55),l.add(P,V(.024,.024,2.2,6),e,t-1,0,.55,0,0),l.add(P,V(.024,.024,2.2,6),e,t-1,0,-.55,0,0)}for(let e of[4.4,8.8,12.4]){let t=e===4.4;l.add(F,Fe(B(2.6,.1,2.2),e*.13,.3),0,e,0),l.add(N,B(2.6,.12,.03),0,e-.02,1.11),l.add(N,B(2.6,.12,.03),0,e-.02,-1.11),l.add(N,B(.03,.12,2.2),1.29,e-.02,0),l.add(N,B(.03,.12,2.2),-1.29,e-.02,0);for(let[n,r]of[[-1.25,-1.05],[0,-1.05],[1.25,-1.05],[-1.25,1.05],[0,1.05],[1.25,1.05],[-1.25,0],[1.25,0]])t&&n===1.25&&r===0||l.add(P,B(.045,1,.045),n,e+.55,r);for(let t of[-1.05,1.05])l.add(P,B(2.55,.045,.045),0,e+1.05,t),l.add(P,B(2.55,.045,.045),0,e+.6,t);for(let n of[-1.25,1.25])t&&n>0||(l.add(P,B(.045,.045,2.15),n,e+1.05,0),l.add(P,B(.045,.045,2.15),n,e+.6,0))}l.add(N,B(.55,.12,.26),1.32,4.42,0),l.add(P,V(.05,.05,.5,8),1.45,4.62,0),l.add(P,B(.08,.1,.5),1.28,4.3,0,0,0,.7);for(let e of[-.22,.22])l.add(P,B(.05,12.6,.05),-.85,6.3,e);for(let e=.5;e<12.5;e+=.38)l.add(P,B(.04,.04,.42),-.85,e,0);for(let e=2.6;e<12.2;e+=1.2)l.add(P,je(.38,.02,Math.PI*1.2,12),-.85,e,0,Math.PI/2,0,Math.PI*.4);l.add(N,B(.3,12.4,.05),.62,6.2,.78);for(let e of[-.14,.14])l.add(N,B(.04,12.4,.12),.62+e,6.2,.72);for(let e of[-.08,0,.08])l.add(a.cable,V(.022,.022,12.3,6),.62+e,6.2,.76);l.add(N,B(.4,.5,.22),.62,12.7,.7),l.add(ae,Ie(B(4.8,.26,.3),4.6,1),1.7,13.15,0),l.add(ae,B(.3,.26,.3),4.05,13.15,0),l.add(P,V(.03,.03,3.6,6),1.9,13.9,0,0,0,1.25),l.add(N,B(.5,.45,.45),.1,13.05,0),l.add(P,V(.09,.09,.4,10),.1,13,0,0,0,Math.PI/2),l.add(a.cable,V(.022,.022,2.4,6),3.6,12,0),l.add(N,B(.18,.3,.14),3.6,10.7,0),l.add(P,je(.09,.026,Math.PI*1.6,10),3.6,10.42,0);for(let e of[-.5,.5])l.add(N,B(.16,.2,.16),1.16,9,e,.5,-.6,0);for(let e of[-.5,.5])et.add(ye,Me(.13,.15),1.24,8.98,e,-.6,Math.PI/2-.6,0);l.add(P,V(.03,.045,1.5,8),0,13.65,0);let u=new Y({color:3342336,emissive:16722458,emissiveIntensity:.15,roughness:.4});et.add(u,Pe(.1,10,7),0,14.45,0),et.add(u,Pe(.075,8,6),-1.25,13.1,-1),et.add(u,Pe(.075,8,6),1.25,13.1,1);for(let[e,t]of[[-1.25,-1],[1.25,1]])l.add(P,V(.02,.02,.5,6),e,12.78,t);tt.push({img:rt,px:96,w:.6,h:.6,x:0,y:2.4,z:-.68,ry:Math.PI,base:c}),tt.push({img:rt,px:96,w:.6,h:.6,x:.68,y:3.3,z:0,ry:Math.PI/2,base:c}),o.setBase(i),et.setBase(i);let d=new En;d.position.set(.4,1.15,0),t.add(d);let f=Ae(d);f.add(F,V(1.02,1.02,.14,18),0,-.02,0);for(let e of[-1,1])f.add(N,B(.24,.5,.7),e*.55,.1,0),f.add(N,V(.14,.14,.18,12),e*.69,.28,0,0,0,Math.PI/2);f.flush();let p=new En;d.add(p);let m=Ae(p);for(let e of[-1,1])m.add(ae,Ie(B(.09,.66,12.6),4.8,1),e*.39,0,1.8);m.add(N,B(.86,.08,12.6),0,.3,1.8),m.add(N,B(.86,.08,12.6),0,-.3,1.8);for(let e=-3.6;e<=7.6;e+=1.6)m.add(N,B(.88,.1,.14),0,-.31,e);for(let e=-2.8;e<=6.8;e+=1.6)m.add(N,B(.05,.04,1.78),0,-.34,e,0,.5,0),m.add(N,B(.05,.04,1.78),0,-.34,e,0,-.5,0);m.add(N,B(.06,.08,11.6),.3,-.33,2),m.add(N,H(.02,.02,10.8,6),-.22,-.32,2.4),m.add(a.hazard,B(.74,.55,.22),0,0,-.6),m.add(_e,B(.73,.53,.18),0,0,7.85),m.add(N,V(.2,.2,.1,14),0,.06,8,0,0,Math.PI/2);for(let e of[-1,1])m.add(N,B(.05,.44,.5),e*.1,.1,7.95);m.add(N,B(.95,.26,1.5),0,.4,.6);for(let[e,t]of[[-.44,.15],[.44,.15],[-.44,1.05],[.44,1.05]])m.add(N,V(.1,.1,.09,10),e,.14,t,0,0,Math.PI/2);for(let e of[0,1.2])for(let t of[-1,1])m.add(N,B(.08,.5,.12),t*.52,.68,e,0,0,t*2.2);for(let e of[-1.6,2.6])m.add(N,je(.5,.05,Math.PI,14),0,.75,e,0,0,Math.PI),m.add(N,B(.9,.22,.2),0,.3,e);m.add(N,V(.16,.16,.5,12),0,.12,-2.9,0,0,Math.PI/2),m.add(N,B(.7,.08,.5),0,.34,-2.9),m.flush(),qe(p,[{text:`SENTINEL LR-1`,w:1.9,h:.4,x:-.445,y:0,z:3.6,ry:-Math.PI/2},{text:`SENTINEL LR-1`,w:1.9,h:.4,x:.445,y:0,z:3.6,ry:Math.PI/2}],{fg:`#33342e`,font:`bold 30px Arial`});let h=[{cover:null,offset:new W(0,.75,4),used:!1},{cover:null,offset:new W(0,.75,4),used:!1},{cover:null,offset:new W(0,.75,4),used:!1}],g=new En;{let e=Ae(g),t=A({color:3093304,roughness:.28,metalness:.55,envMapIntensity:1.7});e.add(oe,H(.44,.44,7.6,20),0,0,0),e.add(t,new ua(.44,1.9,20).rotateX(Math.PI/2),0,0,4.75),e.add(pe,H(.3,.4,.5,14),0,0,-4),e.add(pe,H(.26,.3,.18,12),0,0,-4.3);for(let t=0;t<4;t++){let n=t/4*Z+Math.PI/4;e.add(pe,B(.05,.55,1.2),Math.cos(n)*.55,Math.sin(n)*.55,-3.4,0,0,n)}e.add(t,B(.1,.22,.34),.42,.12,1.6),e.flush(),g.position.set(0,.75,.6),g.traverse(e=>{e.isMesh&&(e.castShadow=e.material!==pe)}),p.add(g)}for(let e of[1.4,-1])o.add(N,B(.26,.22,.26),e,.78,-1.6);let _=He(t,{pos:new W(1.4,.86,-1.6),node:t},{pos:new W(.42,-.1,3.4),node:p},.1,.07),v=He(t,{pos:new W(-1,.86,-1.6),node:t},{pos:new W(-.42,-.1,3.4),node:p},.1,.07),y=new En;y.position.set(-1.55,4.85,0),t.add(y);let b=-Math.atan2(1.26,1.95);y.rotation.y=b;{let e=Ae(y);e.add(N,B(1.85,.16,.2),.92,0,0),e.add(N,B(.09,.13,.85),.7,-.26,0,.85,0,0),e.add(N,B(.28,.42,.3),1.86,-.06,0);for(let t of[-.16,.04])e.add(N,V(.03,.03,.16,8),2.04,t,0,0,0,Math.PI/2);Je(e,[[1.95,-.25,.04],[2.2,-.75,.18],[2.35,-.4,.42],[2.3,-.25,.6]],.04,N),Je(e,[[.06,-.06,.06],[.7,-.22,.1],[1.35,-.16,.06],[1.8,-.12,0]],.028,N),e.flush()}for(let[e,t,n]of[[4.4,-3.6,.5],[5.2,-1.2,.35]]){let r=Math.cos(n),i=-Math.sin(n);o.add(se,Fe(V(.55,.55,9.6,18),e*.2,t*.2),e,.88,t,0,n,Math.PI/2);for(let a of[-4.9,4.9])o.add(_e,V(.55,.4,.35,18),e+r*a,.88,t+i*a,0,n,Math.PI/2*Math.sign(a)),o.add(P,je(.56,.02,Z,18),e+r*(a-Math.sign(a)*.18),.88,t+i*(a-Math.sign(a)*.18),0,n+Math.PI/2,0);for(let a of[-3.1,0,3.1])o.add(N,je(.57,.03,Z,18),e+r*a,.88,t+i*a,0,n+Math.PI/2,0);for(let a of[-3,3]){for(let s of[-1,1])o.add(N,B(.12,1,.16),e+r*a+s*.45*-i,.42,t+i*a+s*.45*r,0,n,s*.42);o.add(N,B(.16,.14,1.15),e+r*a,.14,t+i*a,0,n+Math.PI/2,0),o.add(P,je(.58,.025,Math.PI,12),e+r*a,.88,t+i*a,0,n+Math.PI/2,Math.PI)}Xe(s,10.6,2.2,e,t,n)}Ye(o,[-2.35,.75,.7],[-.75,.75,.35],.4,.04),Ye(o,[-2.3,.75,-.5],[-.7,.75,-.3],.5,.035),o.add(F,B(.6,.05,1.9),-1.5,.73,.05,0,.12,0),Ye(o,[1.3,.72,-.4],[3.6,.06,-3.2],.4,.045),Ye(o,[.9,.72,1],[2.6,.06,4.2],.5,.04),o.add(N,B(.42,1.25,.34),-2.5,1.32,1.5),o.add(F,B(.3,.4,.04),-2.5,1.5,1.68);let x=Ve(o,t,-2.5,2.1,1.5);o.add(N,B(2.6,.55,.07),0,1.35,-4.55);for(let e of[-1.1,1.1])o.add(P,V(.035,.035,.75,8),e,1,-4.55);tt.push({text:`SENTINEL LR-1`,w:2.4,h:.44,x:0,y:1.35,z:-4.51,ry:Math.PI,bg:`#5a4632`,base:i}),s.add(he,Me(1,.38),1.55,.6,0,0,Math.PI/2,0),s.add(he,Me(1,.38),.4,.6,1.14,0,0,0),s.add(he,Me(1.1,.4),-3.62,1.6,.62,0,-Math.PI/2,0);for(let e of[-1.1,1.1])s.add(ye,B(.07,.09,.07),e,1.68,-4.55);s.add(ye,B(.07,.09,.07),-2.5,2,1.68);for(let[e,t]of[[4.4,-3.6],[5.2,-1.2]])s.add(ye,B(.08,.1,.08),e,1.48,t);n.world.colliders.push(qd(e.position.x,e.position.z,5,0,2.2)),n.world.colliders.push(Kd(e.position.x+Math.cos(e.heading)*-3,e.position.z-Math.sin(e.heading)*-3,1.5,1.5,e.heading,0,13));for(let[t,r,i]of[[4.4,-3.6,.5],[5.2,-1.2,.35]]){let a=Ze(e,t,r);n.world.colliders.push(Kd(a.x,a.z,5.4,.95,e.heading+i,0,1.7))}let S=0,C=0,w=1.05,T=new W;function E(e,t){let r=n.time.now%1.6;u.emissiveIntensity=r<.07||r>.24&&r<.31?3.8:.15;let i=e.state===`ready`&&g.visible&&Math.abs(Dd(d.rotation.y))<.05&&Math.abs(e.currentElev-w)<.05;S=Td(S,+!i,2.6,t),y.rotation.y=b-S*1.95,e.state===`launching`&&g.visible&&n.time.now>C&&(C=n.time.now+.22,T.set(.45,.2,1.6),g.localToWorld(T),n.effects.muzzlePuff(T,.32))}return{group:t,turntable:d,elevGroup:p,tubes:h,statusLight:x,markerMat:ye,restElevation:w,fireElevation:1.45,elevAxis:`x`,elevSign:-1,hydUpdaters:[_,v],muzzleForward:new W(0,0,1),isSentinel:!0,roundMesh:g,extraUpdate:E}}let st=new Dt,ct=new W,lt=new W;class ut{constructor(e,t){this.def=e,this.id=e.id,this.rig=t,this.ammo=e.ammo,this.state=`ready`,this.readyIn=0,this.targetAz=null,this.currentElev=t.restElevation,this.targetElev=t.restElevation,this.launchTimer=-1,this.pendingTrack=null,this.tubeIndex=0,this.applyElevation()}get displayState(){if(this.ammo<=0&&this.state!==`launching`)return`EMPTY`;switch(this.state){case`ready`:return`READY`;case`slewing`:return`SLEWING`;case`launching`:return`LAUNCHING`;case`reload`:return`RELOADING`;default:return this.state.toUpperCase()}}canAccept(){return this.ammo>0&&(this.state===`ready`||this.state===`slewing`)}applyElevation(){this.rig.elevGroup.rotation.x=-this.currentElev}pointAt(e){let t=this.rig.group.position;this.targetAz=Math.atan2(e.x-t.x,e.z-t.z),this.targetElev=this.rig.fireElevation,this.state===`ready`&&(this.state=`slewing`)}relax(){this.targetAz=null,this.targetElev=this.rig.restElevation}muzzle(e,t){let n=this.rig,r=n.tubes[Math.min(this.tubeIndex,n.tubes.length-1)];return e.copy(r.offset),n.elevGroup.localToWorld(e),t.set(0,0,1).applyQuaternion(n.elevGroup.getWorldQuaternion(st)),e}launch(e){return this.canAccept()?(this.state=`launching`,this.launchTimer=this.def.launchDelay,this.pendingTrack=e,n.events.emit(`battery-launching`,{battery:this,track:e}),!0):!1}update(e){let t=this.rig;if(this.targetAz!==null){t.group.rotation.y+(t.turntable?t.turntable.rotation.y:0);let r=Dd(this.targetAz-t.group.rotation.y);t.turntable?t.turntable.rotation.y=Od(t.turntable.rotation.y,r,this.def.slewRate*e*(t.slewMul||1)):t.group.rotation.y=Od(t.group.rotation.y,this.targetAz,this.def.slewRate*e*.55);let i=Math.abs(Dd(this.targetAz-(t.group.rotation.y+(t.turntable?t.turntable.rotation.y:0))));this.state===`slewing`&&i<.02&&Math.abs(this.currentElev-this.targetElev)<.02&&(this.state=`ready`,n.events.emit(`battery-laid`,{battery:this}))}this.currentElev=Td(this.currentElev,this.targetElev,2.2,e),this.applyElevation();for(let e of t.hydUpdaters)e();if(t.recoilNode){t.recoil=Math.max(0,t.recoil-e*2.2);let n=t.recoil;t.recoilNode.position.z=t.recoilBase-t.recoilAmp*n*n*(3-2*n)}this.state===`launching`&&(this.launchTimer-=e,this.launchTimer<=0&&this.fire()),this.state===`reload`&&(this.readyIn-=e,this.readyIn<=0&&(this.state=this.ammo>0?`ready`:`empty`,this.ammo>0&&(this.rig.roundMesh&&(this.rig.roundMesh.visible=!0),n.events.emit(`battery-ready`,{battery:this}))));let r=t.statusLight.material;this.ammo<=0?(r.emissive.setHex(16720418),r.emissiveIntensity=1.2):this.state===`ready`?(r.emissive.setHex(2293572),r.emissiveIntensity=2.4):this.state===`launching`?(r.emissive.setHex(16746530),r.emissiveIntensity=2.6+Math.sin(n.time.now*20)*2.2):(r.emissive.setHex(16755234),r.emissiveIntensity=1.8),t.extraUpdate&&t.extraUpdate(this,e)}fire(){let e=this.pendingTrack;this.pendingTrack=null,--this.ammo,this.state=`reload`,this.readyIn=this.def.reloadTime;let t=this.rig.tubes[Math.min(this.tubeIndex,this.rig.tubes.length-1)];this.muzzle(ct,lt),t.hasCover&&(t.hide(),n.effects.coverPop(ct,lt)),this.rig.recoilNode&&(this.rig.recoil=1),this.rig.roundMesh&&(this.rig.roundMesh.visible=!1),this.tubeIndex=(this.tubeIndex+1)%this.rig.tubes.length,n.interceptors.launch(this,e,ct.clone(),lt.clone()),n.events.emit(`interceptor-launched`,{battery:this,track:e})}resetAmmo(){this.ammo=this.def.ammo,this.state=`ready`,this.readyIn=0,this.tubeIndex=0,this.pendingTrack=null,this.launchTimer=-1;for(let e of this.rig.tubes)e.used=!1;this.rig.resetWear&&this.rig.resetWear(),this.rig.roundMesh&&(this.rig.roundMesh.visible=!0)}}let dt={patriot:it(o.patriot),thaad:at(o.thaad),sentinel:ot(o.sentinel)};$e.flush(),et.flush({shadow:!1}),qe(Qe,tt);for(let e of[`patriot`,`thaad`,`sentinel`]){let t=new ut(mf[e],dt[e]);s.push(t),c.set(e,t)}return{list:s,staticRoot:Qe,get(e){return c.get(e)},update(e){let t=n.weather.floodlightsOn,r=t?.25:1;if(r!==we){we=r;for(let[e,t]of Se)e.emissiveIntensity=t*r;ve.emissiveIntensity=t?2.6:0}ye.emissiveIntensity=t?6:.35;for(let t of s)t.update(e)},resetAll(){for(let e of s)e.resetAmmo(),e.relax()}}}var gf=170,_f={single:{id:`single`,name:`SINGLE TRACK`,desc:`One high-visibility ballistic target.`,build(e){return[{delay:2.5,T:e.range(52,62),decoy:!1}]}},saturation:{id:`saturation`,name:`SATURATION`,desc:`3–5 targets on separate arcs.`,build(e){let t=e.int(3,5),n=[],r=2;for(let i=0;i<t;i++)n.push({delay:r,T:e.range(50,72),decoy:!1}),r+=e.range(4,9);return n}},nightraid:{id:`nightraid`,name:`NIGHT RAID`,desc:`Multiple targets with decoys, at night.`,forceTime:`night`,build(e){let t=e.int(2,3),n=[],r=2.5,i=[];for(let e=0;e<3;e++)i.push(!1);for(let e=0;e<t;e++)i.push(!0);for(let t=i.length-1;t>0;t--){let n=Math.floor(e.next()*(t+1));[i[t],i[n]]=[i[n],i[t]]}for(let t of i)n.push({delay:r,T:e.range(48,66),decoy:t}),r+=e.range(3.5,7.5);return n}}};function vf(n){let{scene:r}=n,i=[],a=[],o=0,s=0,c=!1,l=new bd(12852855);function u(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function d(n,{srgb:r=!0}={}){let i=new ia(n);return r&&(i.colorSpace=Ne),i.wrapS=e,i.wrapT=t,i.anisotropy=4,i}function f(){let e=[];for(let t=0;t<30;t++)e.push({x:l.next()*256,y0:l.range(4,90),len:l.range(70,330),w:l.range(1.1,3.2),a:l.range(.14,.42)});let[t,n]=u(256,512);n.fillStyle=`#585149`,n.fillRect(0,0,256,512);for(let[e,t]of[[-.42,.09],[.42,.06]]){n.save(),n.translate(128,256),n.rotate(e);for(let e=-40;e<40;e++)n.fillStyle=e%2?`rgba(255,255,255,${t})`:`rgba(0,0,0,${t*1.5})`,n.fillRect(-400,e*9,800,4.5);n.restore()}{let e=n.getImageData(0,0,256,512),t=e.data;for(let e=0;e<t.length;e+=4){let n=(l.next()-.5)*22;t[e]+=n,t[e+1]+=n,t[e+2]+=n*.9}n.putImageData(e,0,0)}for(let t of e){let e=Math.min(t.a*2,.8),r=n.createLinearGradient(0,t.y0,0,t.y0+t.len);r.addColorStop(0,`rgba(198,182,156,${e})`),r.addColorStop(.5,`rgba(150,136,114,${e*.6})`),r.addColorStop(1,`rgba(110,100,86,0)`),n.fillStyle=r,n.fillRect(t.x-t.w/2,t.y0,t.w,t.len),l.next()<.3&&(n.fillStyle=`rgba(166,152,128,${e*.3})`,n.fillRect(t.x-t.w*2.2,t.y0+14,t.w*4.4,t.len*.5))}for(let[e,t]of[[104,.5],[258,.7],[416,.85]]){n.fillStyle=`rgba(14,13,12,${t})`,n.fillRect(0,e,256,2.2),n.fillStyle=`rgba(190,180,164,0.16)`,n.fillRect(0,e+2.2,256,1.2);for(let t=6;t<256;t+=16)n.fillStyle=`rgba(12,11,10,0.6)`,n.beginPath(),n.arc(t,e+7,1.3,0,7),n.fill()}{let e=n.createLinearGradient(0,0,0,120);e.addColorStop(0,`rgba(12,10,9,0.94)`),e.addColorStop(.55,`rgba(20,17,15,0.6)`),e.addColorStop(1,`rgba(26,22,19,0)`),n.fillStyle=e,n.fillRect(0,0,256,120);for(let[e,t]of[[66,`rgba(96,116,168,0.14)`],[78,`rgba(150,104,66,0.15)`],[90,`rgba(120,88,120,0.10)`]])n.fillStyle=t,n.fillRect(0,e,256,5)}n.fillStyle=`rgba(66,60,52,0.55)`,n.fillRect(0,428,256,44),n.fillStyle=`rgba(196,164,44,0.6)`,n.fillRect(0,442,256,3);for(let e=8;e<256;e+=32)n.fillStyle=`rgba(196,164,44,0.5)`,n.fillRect(e,447,2.4,9);n.fillStyle=`rgba(214,206,192,0.6)`,n.font=`bold 11px monospace`,n.textAlign=`left`,n.fillText(`SR-9 · 04`,12,466),n.fillText(`LOT 7`,148,466);for(let e=0;e<60;e++)n.fillStyle=`rgba(28,25,22,0.4)`,n.fillRect(l.next()*256,428+l.next()*44,l.range(1,4),l.range(1,2));n.fillStyle=`rgba(16,14,13,0.92)`,n.fillRect(0,478,256,34);for(let e=10;e<256;e+=20)n.fillStyle=`rgba(90,84,76,0.5)`,n.beginPath(),n.arc(e,490,1.6,0,7),n.fill();let[r,i]=u(256,512);i.fillStyle=`#000000`,i.fillRect(0,0,256,512);{let e=i.createLinearGradient(0,0,0,240);e.addColorStop(0,`rgba(255,250,240,1)`),e.addColorStop(.1,`rgba(255,214,150,0.92)`),e.addColorStop(.32,`rgba(255,140,60,0.5)`),e.addColorStop(.62,`rgba(255,96,32,0.2)`),e.addColorStop(1,`rgba(255,80,24,0)`),i.fillStyle=e,i.fillRect(0,0,256,240)}i.globalCompositeOperation=`lighter`;for(let t of e){let e=i.createLinearGradient(0,t.y0,0,t.y0+t.len*.8);e.addColorStop(0,`rgba(255,170,90,${t.a*.9})`),e.addColorStop(1,`rgba(255,110,40,0)`),i.fillStyle=e,i.fillRect(t.x-t.w*.45,t.y0,t.w*.9,t.len*.8)}return i.fillStyle=`rgba(255,130,50,0.28)`,i.fillRect(0,416,256,7),i.fillStyle=`rgba(255,70,26,0.20)`,i.fillRect(0,480,256,32),i.fillStyle=`rgba(255,120,60,0.05)`,i.fillRect(0,0,256,512),i.globalCompositeOperation=`source-over`,{map:d(t),emis:d(r,{srgb:!1})}}function p(){let[e,t]=u(256,256);t.fillStyle=`#b6bac0`,t.fillRect(0,0,256,256);for(let e=0;e<340;e++){let e=l.next()*256;t.strokeStyle=l.next()<.5?`rgba(230,236,242,${l.range(.05,.2)})`:`rgba(96,102,110,${l.range(.04,.16)})`,t.lineWidth=l.range(.6,1.8),t.beginPath(),t.moveTo(e,l.next()*60),t.lineTo(e+l.range(-3,3),256),t.stroke()}for(let e=0;e<256;e+=32)t.fillStyle=`rgba(70,74,80,0.55)`,t.fillRect(e,0,1.6,256),t.fillStyle=`rgba(240,244,248,0.35)`,t.fillRect(e+1.6,0,1,256);for(let e of[70,176])t.fillStyle=`rgba(52,56,62,0.7)`,t.fillRect(0,e,256,2);for(let e=0;e<70;e++)t.fillStyle=`rgba(58,62,66,${l.range(.08,.3)})`,t.fillRect(l.next()*256,l.next()*256,l.range(2,8),l.range(1,2.4));let[n,r]=u(256,256);r.fillStyle=`#000`,r.fillRect(0,0,256,256);let i=r.createLinearGradient(0,0,0,110);i.addColorStop(0,`rgba(255,214,150,0.85)`),i.addColorStop(1,`rgba(255,120,50,0)`),r.fillStyle=i,r.fillRect(0,0,256,110),r.fillStyle=`rgba(255,170,110,0.08)`,r.fillRect(0,0,256,256),r.globalCompositeOperation=`destination-out`;for(let e=0;e<256;e+=32)r.fillStyle=`rgba(0,0,0,0.85)`,r.fillRect(e,0,2.6,256);for(let e of[70,176])r.fillStyle=`rgba(0,0,0,0.8)`,r.fillRect(0,e,256,3);return r.globalCompositeOperation=`source-over`,{map:d(e),emis:d(n,{srgb:!1})}}function m(){let[n,r]=u(64,256);r.clearRect(0,0,64,256);let i=r.createLinearGradient(0,0,0,256);i.addColorStop(0,`rgba(255,255,255,0.95)`),i.addColorStop(.1,`rgba(255,226,178,0.62)`),i.addColorStop(.34,`rgba(255,166,96,0.30)`),i.addColorStop(.72,`rgba(255,120,60,0.10)`),i.addColorStop(1,`rgba(255,100,50,0)`),r.fillStyle=i,r.fillRect(0,0,64,256);for(let e=0;e<26;e++){let e=l.next()*200+20;r.fillStyle=`rgba(255,200,140,${l.range(.03,.1)})`,r.fillRect(0,e,64,l.range(1,4))}let a=new ia(n);return a.wrapS=e,a.wrapT=t,a}function h(){let[e,t]=u(64,64),n=t.createRadialGradient(32,32,0,32,32,32);return n.addColorStop(0,`rgba(26,22,19,1)`),n.addColorStop(.35,`rgba(30,26,22,0.85)`),n.addColorStop(.7,`rgba(36,32,28,0.30)`),n.addColorStop(1,`rgba(40,36,32,0)`),t.fillStyle=n,t.fillRect(0,0,64,64),new ia(e)}function g(){let[e,t]=u(128,128),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.16,`rgba(255,242,214,0.9)`),n.addColorStop(.38,`rgba(255,196,130,0.30)`),n.addColorStop(.7,`rgba(255,160,90,0.10)`),n.addColorStop(1,`rgba(255,150,80,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.globalCompositeOperation=`lighter`,n=t.createLinearGradient(0,64,128,64),n.addColorStop(0,`rgba(255,220,170,0)`),n.addColorStop(.5,`rgba(255,236,200,0.35)`),n.addColorStop(1,`rgba(255,220,170,0)`),t.fillStyle=n,t.fillRect(0,58,128,12),new ia(e)}let _=f(),v=p(),y=m(),b=g(),x=h();function S(e,t,{center:n=!0,vStart:r=0}={}){let i=new Mo(e.map(([e,t])=>new U(e,t)),t),a=1/0,o=-1/0;for(let[,t]of e)a=Math.min(a,t),o=Math.max(o,t);let s=i.attributes.position,c=i.attributes.uv;for(let e=0;e<c.count;e++){let t=(s.getY(e)-a)/(o-a);c.setY(e,r+t*(1-r))}return n&&i.translate(0,-(a+o)/2,0),i.rotateX(Math.PI/2),i}let C=S([[.3,.16],[.72,.16],[.79,.02],[.8,.3],[.64,.95],[.575,1.5],[.46,2.4],[.335,3.3],[.21,4.2],[.115,4.72],[.052,4.94],[0,5.02]],26),w=S([[.16,.08],[.34,.02],[.34,1.1],[.27,1.9],[.165,2.7],[.07,3.15],[0,3.3]],20),T=S([[.03,3.35],[.42,2.85],[.78,2.1],[1.02,1],[1.18,-.4],[1.3,-1.9]],22,{center:!1}),E=new Y({map:_.map,emissiveMap:_.emis,color:16777215,emissive:16777215,emissiveIntensity:0,roughness:.45,metalness:.3,envMapIntensity:1.8}),D=new ai({map:y,color:16757354,transparent:!0,opacity:0,blending:2,depthWrite:!1,side:2}),O=new Sd(()=>{let e=new En,t=new En,n=new K(C,E.clone());n.castShadow=!1,t.add(n),e.add(t);let i=new K(T,D.clone());i.visible=!1,i.renderOrder=15,e.add(i);let a=new Yr(new Fr({map:b,color:16760960,transparent:!0,opacity:.9,blending:2,depthWrite:!1,fog:!1}));a.renderOrder=16,e.add(a);let o=new Yr(new Fr({map:x,color:16777215,transparent:!0,opacity:0,depthWrite:!1,fog:!1}));return o.renderOrder=14,e.add(o),e.visible=!1,r.add(e),{group:e,spin:t,body:n,shock:i,glow:a,dot:o,id:``,pos:new W,vel:new W,alive:!1,isDecoy:!1,dragK:0,weave:0,weavePhase:0,trail:null,glowTrail:null,emitAcc:0,age:0,engagedBy:0,plasmaTrail:null,plasmaAcc:0,flickerPhase:0,rollRate:0,tumX:0,tumY:0}},10),k=new W,ee=new W,A=new W;function j(e,t){let r=O.acquire();if(!r)return null;s++,r.id=`T-`+Nd(s),r.isDecoy=e.decoy,r.alive=!0,r.age=0,r.engagedBy=0,r.emitAcc=0;let a=t.next()*Z,o=t.range(5200,7600),c=t.range(5200,6800),l=t.range(15,e.decoy?600:130),u=t.next()*Z,d=new W(Math.sin(a)*o,c,Math.cos(a)*o),f=new W(Math.sin(u)*l,0,Math.cos(u)*l);r.pos.copy(d),Bd(d,f,e.T,r.vel),r.dragK=e.decoy?3e-4:6e-5,r.weave=!e.decoy&&t.next()<.45?t.range(8,18):0,r.weavePhase=t.next()*Z;let p=e.decoy?v:_;r.body.geometry=e.decoy?w:C;let m=r.body.material;m.map=p.map,m.emissiveMap=p.emis,m.roughness=e.decoy?.3:.45,m.metalness=e.decoy?.85:.3,m.envMapIntensity=e.decoy?2:1.8,m.emissiveIntensity=.35,r.spin.rotation.set(0,0,0),e.decoy?(r.rollRate=0,r.tumX=n.vrng.range(1.6,3.2)*n.vrng.sign(),r.tumY=n.vrng.range(.8,2)*n.vrng.sign()):(r.rollRate=n.vrng.range(.5,1.3)*n.vrng.sign(),r.tumX=0,r.tumY=0);let h=e.decoy?.55:1;return r.shock.scale.set(h,h,h),r.shock.visible=!1,r.glow.material.color.setHex(e.decoy?14214386:16763024),r.glow.material.opacity=.85,r.dot.material.opacity=0,r.group.visible=!0,r.group.position.copy(r.pos),r.trail=n.effects.acquireTrail({color:e.decoy?12172998:13551030,life:11,opacity:e.decoy?.42:.7,emissive:.45}),r.plasmaTrail=n.effects.acquireTrail({color:e.decoy?16767392:16764818,life:.7,opacity:e.decoy?.45:.85,emissive:1}),r.plasmaAcc=0,r.flickerPhase=n.vrng.next()*Z,i.push(r),n.events.emit(`threat-spawned`,{threat:r}),r}function M(e){e.alive=!1,e.group.visible=!1,e.trail&&=(n.effects.releaseTrail(e.trail),null),e.plasmaTrail&&=(n.effects.releaseTrail(e.plasmaTrail),null);let t=i.indexOf(e);t>=0&&i.splice(t,1),O.release(e)}let te={active:i,get running(){return c},get pendingCount(){return a.length},get allSpawned(){return a.length===0},startScenario(e,t){te.clear();let n=_f[e];return n?(a=n.build(t).map(e=>({...e})),o=0,s=0,c=!0,te._rng=t,!0):!1},stop(){c=!1,a=[]},clear(){for(let e of[...i])M(e);a=[],c=!1},destroy(e,t){e.alive&&(n.effects.explosionAir(t??e.pos,e.isDecoy?.7:1.25),n.events.emit(`threat-destroyed`,{threat:e,point:t??e.pos.clone()}),M(e))},update(e){if(c)for(o+=e;a.length&&a[0].delay<=o;)j(a.shift(),te._rng);for(let t of[...i]){t.age+=e,t.vel.y-=Ld*e;let r=t.vel.length(),i=t.dragK*r*r*e;r>1&&t.vel.multiplyScalar(Math.max(0,1-i/r)),t.weave>0&&t.pos.y<2400&&t.pos.y>300&&(k.set(-t.vel.z,0,t.vel.x).normalize(),t.vel.addScaledVector(k,Math.sin(t.age*1.9+t.weavePhase)*t.weave*e)),t.pos.addScaledVector(t.vel,e),t.group.position.copy(t.pos),ee.copy(t.pos).add(t.vel),t.group.lookAt(ee),t.isDecoy?(t.spin.rotation.x+=t.tumX*e,t.spin.rotation.y+=t.tumY*e):t.spin.rotation.z+=t.rollRate*e;let a=Cd((r-220)/600,0,1)*Cd(1.5-t.pos.y/5200,.2,1),o=.9+.1*Math.sin(t.age*27+t.flickerPhase)*Math.sin(t.age*9.3+t.flickerPhase*1.7);t.body.material.emissiveIntensity=Math.max(a*3.6,t.isDecoy?.7:.18)*(.75+.35*o);let s=a>.05;if(t.shock.visible=s,s){t.shock.material.opacity=Cd(a*.95,0,.9)*(.82+.18*o);let e=(t.isDecoy?.55:1)*(.96+.05*Math.sin(t.age*23+t.flickerPhase));t.shock.scale.set(e,e,t.isDecoy?.55:1)}let c=t.pos.distanceTo(n.camera.position),l=Cd((c-24)/90,.05,1),u=Cd(2.6+c*.018,2.6,130)*(t.isDecoy?.6:1)*(.75+a*.35);t.glow.scale.set(u,u,1),t.glow.material.opacity=Cd(.6+a*.4,0,1)*(t.isDecoy?.85:1)*l*(.86+.14*o);let d=Cd(c*.013,0,42)*(t.isDecoy?.7:1);if(t.dot.scale.set(d,d,1),t.dot.material.opacity=Cd((c-380)/700,0,.8),t.emitAcc+=e,t.emitAcc>.035&&t.trail){t.emitAcc=0;let e=Cd(t.pos.y/6500,0,1);t.trail.emit(t.pos,(t.isDecoy?3.2:5.6)*(.5+e*1.2),.5+e*.6)}t.plasmaAcc+=e,t.plasmaAcc>.024&&t.plasmaTrail&&(t.plasmaAcc=0,a>.04&&(A.copy(t.vel).normalize().multiplyScalar(t.isDecoy?-1.9:-2.7).add(t.pos),t.plasmaTrail.emit(A,(t.isDecoy?1.3:2.4)*(.45+a*1.3),Cd(.3+a*.95,0,1)*(.9+.1*o))));let f=Math.max(0,tf(t.pos.x,t.pos.z));if(t.pos.y<=f+2){let e=Math.hypot(t.pos.x,t.pos.z)<gf;t.isDecoy?n.effects.explosionGround(t.pos,.5):n.effects.explosionGround(t.pos,e?1.6:1.15),n.events.emit(`threat-impact`,{threat:t,onBase:e,point:t.pos.clone()}),M(t)}}}};return te}function yf(n){let{scene:r}=n,i=[],a=0,o=new bd(2021975);function s(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function c(n,{srgb:r=!0}={}){let i=new ia(n);return r&&(i.colorSpace=Ne),i.wrapS=e,i.wrapT=t,i.anisotropy=4,i}let l=.055,u=483.84,d=(e,t)=>(1-(l+e/t*.945))*512;function f(e){let t=e.L,[n,r]=s(256,512);r.fillStyle=e.base,r.fillRect(0,0,256,512);for(let e=0;e<240;e++){let e=o.next()*256;r.strokeStyle=o.next()<.5?`rgba(255,255,255,${o.range(.02,.07)})`:`rgba(40,42,46,${o.range(.02,.08)})`,r.lineWidth=o.range(.8,2.4),r.beginPath(),r.moveTo(e,o.next()*512*.3),r.lineTo(e+o.range(-4,4),512),r.stroke()}{let e=r.getImageData(0,0,256,512),t=e.data;for(let e=0;e<t.length;e+=4){let n=(o.next()-.5)*9;t[e]+=n,t[e+1]+=n,t[e+2]+=n}r.putImageData(e,0,0)}{let n=[0,...e.rings??[],t];for(let e=0;e<n.length-1;e++)o.next()<.55||(r.fillStyle=o.next()<.5?`rgba(30,32,38,${o.range(.04,.09)})`:`rgba(255,255,255,${o.range(.04,.08)})`,r.fillRect(0,d(n[e+1],t),256,d(n[e],t)-d(n[e+1],t)))}for(let n of e.bands??[])r.fillStyle=n.color,r.fillRect(0,d(n.y+n.h,t),256,n.h/t*.945*512);{let n=d(t-e.noseLen,t),i=r.createLinearGradient(0,n-10,0,n+8);i.addColorStop(0,e.noseColor),i.addColorStop(1,e.noseColor+`00`),r.fillStyle=e.noseColor,r.fillRect(0,0,256,n-6),r.fillStyle=i,r.fillRect(0,n-10,256,18),r.fillStyle=`rgba(20,21,24,0.5)`,r.fillRect(0,n-2,256,2.4)}for(let n of e.rings??[]){let e=d(n,t);if(r.fillStyle=`rgba(30,32,36,0.55)`,r.fillRect(0,e,256,1.8),r.fillStyle=`rgba(255,255,255,0.14)`,r.fillRect(0,e+1.8,256,1),o.next()<.7)for(let t=8;t<256;t+=24)r.fillStyle=`rgba(28,30,34,0.5)`,r.beginPath(),r.arc(t,e+5,1.1,0,7),r.fill()}for(let e=0;e<5;e++){let e=o.next()*216+8,n=o.range(.22,.72),i=d(n*t,t);r.strokeStyle=`rgba(34,36,40,0.4)`,r.lineWidth=1.1,r.strokeRect(e,i,o.range(16,34),o.range(8,16))}{let n=e.racewayW??9,i=d(t-e.noseLen,t);r.fillStyle=`rgba(38,40,44,0.9)`,r.fillRect(178,i,n,u-i),r.fillStyle=`rgba(255,255,255,0.10)`,r.fillRect(178+n,i,1.4,u-i);for(let i=d(t-e.noseLen,t)+8;i<477.84;i+=26)r.fillStyle=`rgba(16,17,19,0.9)`,r.fillRect(176,i,n+4,5)}{r.save(),r.translate(60,d(e.stencilY??t*.55,t)),r.rotate(Math.PI/2),r.font=`bold 21px "Arial Narrow", Arial, sans-serif`,r.textAlign=`left`,r.fillStyle=e.stencilColor??`rgba(44,48,56,0.9)`,r.fillText(e.stencil,0,0),r.restore(),r.save(),r.translate(128,d(t*.3,t)),r.rotate(Math.PI/2),r.font=`bold 14px monospace`,r.fillStyle=e.stencilColor??`rgba(44,48,56,0.8)`,r.fillText(e.tail,0,0),r.restore();let n=d(t*.42,t);r.strokeStyle=e.stencilColor??`rgba(52,56,62,0.75)`,r.lineWidth=2,r.beginPath(),r.arc(30,n,11,0,7),r.stroke(),r.beginPath(),r.moveTo(30,n-7),r.lineTo(36.5,n+6),r.lineTo(23.5,n+6),r.closePath(),r.stroke(),r.fillStyle=e.stencilColor??`rgba(52,56,62,0.6)`,r.font=`bold 9px monospace`,r.textAlign=`left`,r.fillText(`UMBILICAL`,14,d(t*.13,t)),r.strokeStyle=`rgba(52,56,62,0.5)`,r.strokeRect(10,d(t*.13,t)+4,46,12)}{let e=r.createLinearGradient(0,u,0,423.84);e.addColorStop(0,`rgba(22,18,15,0.88)`),e.addColorStop(.4,`rgba(38,30,24,0.45)`),e.addColorStop(1,`rgba(50,40,30,0)`),r.fillStyle=e,r.fillRect(0,423.84,256,60);for(let e=0;e<46;e++){let e=o.next()*256;r.fillStyle=`rgba(14,12,10,${o.range(.1,.4)})`,r.fillRect(e,u-o.range(6,46),o.range(1.5,4),o.range(8,40))}}r.fillStyle=e.finColor??`#84898f`,r.fillRect(0,u,256,28.160000000000025);for(let e=0;e<90;e++)r.fillStyle=o.next()<.5?`rgba(230,234,238,${o.range(.06,.2)})`:`rgba(30,32,36,${o.range(.06,.22)})`,r.fillRect(o.next()*256,u+o.next()*28.160000000000025,o.range(3,14),1.2);let[i,a]=s(256,512);a.fillStyle=`#000`,a.fillRect(0,0,256,512);let l=d(.16,t),f=a.createLinearGradient(0,l+8,0,l-26);return f.addColorStop(0,`rgba(255,214,150,0.95)`),f.addColorStop(.45,`rgba(255,140,60,0.5)`),f.addColorStop(1,`rgba(255,90,30,0)`),a.fillStyle=f,a.fillRect(0,l-26,256,40),{map:c(n),emis:c(i,{srgb:!1})}}function p(){let[n,r]=s(64,256);r.clearRect(0,0,64,256);let i=r.createLinearGradient(0,0,0,256);i.addColorStop(0,`rgba(255,246,224,0.5)`),i.addColorStop(.1,`rgba(255,226,180,0.3)`),i.addColorStop(.34,`rgba(255,198,130,0.17)`),i.addColorStop(.66,`rgba(255,160,90,0.07)`),i.addColorStop(1,`rgba(255,140,70,0)`),r.fillStyle=i,r.fillRect(0,0,64,256),r.globalCompositeOperation=`lighter`;{let e=r.createLinearGradient(0,0,0,200);e.addColorStop(0,`rgba(255,240,210,0.4)`),e.addColorStop(.55,`rgba(255,214,150,0.2)`),e.addColorStop(1,`rgba(255,190,120,0)`),r.fillStyle=e,r.fillRect(28,0,8,200)}for(let[e,t,n]of[[20,1,11],[48,.8,10.5],[78,.58,10],[110,.4,9.5],[144,.24,9],[178,.12,8.5]]){let i=r.createRadialGradient(32,e,0,32,e,n);i.addColorStop(0,`rgba(255,255,255,${t})`),i.addColorStop(.45,`rgba(255,238,196,${t*.55})`),i.addColorStop(1,`rgba(255,220,160,0)`),r.fillStyle=i,r.fillRect(0,e-12,64,24)}let a=new ia(n);return a.wrapS=e,a.wrapT=t,a}function m(){let[e,t]=s(128,128),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.15,`rgba(255,244,220,0.92)`),n.addColorStop(.4,`rgba(255,204,140,0.32)`),n.addColorStop(.72,`rgba(255,170,100,0.10)`),n.addColorStop(1,`rgba(255,160,90,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),new ia(e)}function h(e,t,n=l){let r=new Mo(e.map(([e,t])=>new U(e,t)),t),i=1/0,a=-1/0;for(let[,t]of e)i=Math.min(i,t),a=Math.max(a,t);let o=r.attributes.position,s=r.attributes.uv;for(let e=0;e<s.count;e++){let t=(o.getY(e)-i)/(a-i);s.setY(e,n+t*(1-n))}return r}function g(e,t,n,r,i,a,o){let s=e+n,c=t,u=t+r,d=t+a,f=t+a+i,p=o/2,m=(e,t,n,r)=>[e,t,n,e,n,r],h=[],g={A0:[e,c,p],B0:[e,u,p],C0:[s,f,p],D0:[s,d,p],A1:[e,c,-p],B1:[e,u,-p],C1:[s,f,-p],D1:[s,d,-p]};h.push(...m(g.A0,g.D0,g.C0,g.B0)),h.push(...m(g.A1,g.B1,g.C1,g.D1)),h.push(...m(g.B0,g.C0,g.C1,g.B1)),h.push(...m(g.A0,g.A1,g.D1,g.D0)),h.push(...m(g.D0,g.D1,g.C1,g.C0));let _=new Float32Array(h.length*3),v=new Float32Array(h.length*2);for(let i=0;i<h.length;i++)_.set(h[i],i*3),v[i*2]=Cd((h[i][0]-e)/Math.max(n,.001),0,1)*.9+.05,v[i*2+1]=Cd((h[i][1]-t)/Math.max(r+a,.001),0,1)*(l*.86)+l*.07;let y=new kr;return y.setAttribute(`position`,new mr(_,3)),y.setAttribute(`uv`,new mr(v,2)),y.computeVertexNormals(),y}function _(e,t,n){let r=[h(e,t).toNonIndexed()];for(let e of n)for(let t=0;t<e.count;t++){let n=t/e.count*Math.PI*2+(e.phase??Math.PI/4),i=g(e.r0,e.y0,e.span,e.root,e.tip,e.sweep,e.th);i.rotateY(-n),r.push(i)}let i=ff(r,!1);for(let e of r)e.dispose();let a=1/0,o=-1/0;for(let[,t]of e)a=Math.min(a,t),o=Math.max(o,t);return i.translate(0,-(a+o)/2,0),i.rotateX(Math.PI/2),i}let v=_([[.085,.12],[.16,.02],[.205,.1],[.21,.55],[.21,4],[.19,4.35],[.145,4.7],[.085,4.98],[.038,5.12],[0,5.2]],20,[{count:4,r0:.19,y0:.16,span:.3,root:.66,tip:.24,sweep:.3,th:.03},{count:4,r0:.185,y0:3.86,span:.15,root:.34,tip:.13,sweep:.16,th:.024}]),y=_([[.11,.14],[.21,.02],[.3,.1],[.295,.75],[.25,1.15],[.225,3.3],[.205,4.45],[.17,5.15],[.1,5.75],[.045,6.02],[0,6.2]],20,[{count:4,r0:.27,y0:.2,span:.17,root:.95,tip:.42,sweep:.38,th:.03}]),b=_([[.17,.16],[.31,.02],[.42,.14],[.42,6.35],[.405,6.55],[.405,7.4],[.345,8.2],[.24,8.9],[.125,9.32],[.05,9.45],[0,9.5]],22,[{count:4,r0:.4,y0:.3,span:.55,root:1.25,tip:.5,sweep:.55,th:.05}]),x=f({L:5.2,base:`#d8d4c8`,noseColor:`#22242a`,noseLen:.85,rings:[.55,1.7,2.9,4,4.35],stencil:`RAMPART PX-4`,tail:`IV-DEF 04`,stencilY:3,finColor:`#7f848a`}),S=f({L:6.2,base:`#aaa78e`,noseColor:`#22242a`,noseLen:1.05,rings:[.75,1.15,2.4,3.7,4.45],stencil:`HALBERD HA-9`,tail:`IV-DEF 09`,stencilY:3.4,finColor:`#75775f`,stencilColor:`rgba(52,54,44,0.92)`,bands:[{y:1.15,h:.14,color:`rgba(30,32,36,0.85)`},{y:4.28,h:.26,color:`rgba(34,36,40,0.82)`},{y:2.3,h:.07,color:`rgba(30,32,36,0.7)`}]}),C=f({L:9.5,base:`#e3e0d5`,noseColor:`#2f3338`,noseLen:1.3,rings:[1.3,3.2,5,6.55,7.4],stencil:`SENTINEL LR-1 · T3`,tail:`IV-DEF 01`,stencilY:5.2,finColor:`#8a8f95`,bands:[{y:7.5,h:.45,color:`rgba(179,64,46,0.92)`},{y:2.5,h:.45,color:`rgba(179,64,46,0.92)`},{y:6.35,h:.2,color:`rgba(40,42,46,0.6)`}]}),w={patriot:{geo:v,tex:x},thaad:{geo:y,tex:S},sentinel:{geo:b,tex:C}};function T(e,t){if(w[e?.def?.id])return w[e.def.id];let n=t?.length??5;return n>8?w.sentinel:n>5.6?w.thaad:w.patriot}let E=(()=>{let e=new Mo([[.16,0],[.46,-.05],[.62,-.14],[.66,-.28],[.54,-.48],[.34,-.7],[.15,-.88],[0,-1]].map(([e,t])=>new U(e,t)),16),t=e.attributes.position,n=e.attributes.uv;for(let e=0;e<n.count;e++)n.setY(e,t.getY(e)+1);return e.rotateX(Math.PI/2),e})(),D=p(),O=m(),k=new Y({map:x.map,emissiveMap:x.emis,color:16777215,emissive:16777215,emissiveIntensity:0,roughness:.42,metalness:.3,envMapIntensity:1.5}),ee=new ai({map:D,color:16761466,transparent:!0,opacity:0,blending:2,depthWrite:!1,side:2});function A(){let e=new En,t=new K(v,k.clone());t.castShadow=!1,e.add(t);let n=new K(E,ee.clone());n.visible=!1,n.renderOrder=15,e.add(n);let i=new Yr(new Fr({map:O,color:16761466,transparent:!0,blending:2,depthWrite:!1,opacity:.95,fog:!1}));return i.renderOrder=16,e.add(i),e.visible=!1,r.add(e),{group:e,body:t,plume:n,flame:i}}let j=new Sd(()=>({mesh:A(),id:``,battery:null,def:null,track:null,threat:null,pos:new W,vel:new W,age:0,phase:`boost`,alive:!1,trail:null,emitAcc:0,minDist:1e9,weaveSeed:0,flickerSeed:0,plumeLen:6,lastPredict:new W,predictT:0}),14),M=new W,te=new W,N=new W,P=new W,ne=new W;function F(e,t,n,r){let i=T(n,r);e.body.geometry=i.geo;let a=e.body.material;a.map=i.tex.map,a.emissiveMap=i.tex.emis,a.emissiveIntensity=0;let o=r.girth,s=r.length;t.plumeLen=s*1.05,e.plume.scale.set(o*3.9,o*3.9,t.plumeLen),e.plume.position.z=-s*.5+.05,e.plume.material.color.setHex(r.flame),e.plume.visible=!1,e.flame.position.z=-s*.52,e.flame.material.color.setHex(r.flame)}function I(e,t){let r=e.threat,i=e.def,a=e.battery.def.envelope,o=e.pos.y,s=Math.hypot(e.pos.x,e.pos.z),c=1,l=null;o<a.minAlt||o>a.maxAlt||s>a.maxRange?(c=.35,l=`OUTSIDE ENGAGEMENT ENVELOPE`):(o<a.sweetLow||o>a.sweetHigh)&&(c=.72,l=`MARGINAL GEOMETRY`),M.copy(r.vel).normalize(),te.copy(e.vel).normalize();let u=M.dot(te)<-.25?1:.8;u<1&&!l&&(l=`CROSSING ENGAGEMENT`);let d=Cd(1.15-t/(i.killRadius*3),.5,1),f=.94*c*u*d;if(n.rng.next()<f){let i=e.pos.clone().lerp(r.pos,.5);n.threats.destroy(r,i),n.events.emit(`intercept-success`,{interceptor:e,threat:r,point:i,decoy:r.isDecoy,dist:Math.round(t),pk:f})}else n.effects.explosionAir(e.pos,.55),n.events.emit(`intercept-miss`,{interceptor:e,threat:r,reason:l??`PROXIMITY FUZE — DEBRIS MISSED`,dist:Math.round(t),pk:f});L(e,!1)}function L(e,t=!0){if(!e.alive)return;e.alive=!1,t&&n.effects.explosionAir(e.pos,.4),e.mesh.group.visible=!1,e.trail&&=(n.effects.releaseTrail(e.trail),null);let r=i.indexOf(e);r>=0&&i.splice(r,1),j.release(e)}return{active:i,launch(e,t,r,o){let s=j.acquire();if(!s)return null;a++;let c=e.def.interceptor;return s.id=`IN-`+Nd(a),s.battery=e,s.def=c,s.track=t,s.threat=t.threat,s.pos.copy(r),s.vel.copy(o).multiplyScalar(32),s.age=0,s.phase=`boost`,s.alive=!0,s.minDist=1e9,s.emitAcc=0,s.weaveSeed=n.rng.next()*10,s.flickerSeed=n.vrng.next()*20,s.threat.engagedBy++,F(s.mesh,s,e,c),s.mesh.group.visible=!0,s.mesh.group.position.copy(s.pos),s.trail=n.effects.acquireTrail({color:e.def.id===`thaad`?15659768:16183524,life:9,opacity:.85,emissive:.14}),n.effects.launchBlast(r,o,e.id===`sentinel`?1.9:e.id===`thaad`?1.25:1),i.push(s),s},clear(){for(let e of[...i])L(e,!1)},update(e){for(let t of[...i]){t.age+=e;let r=t.def,i=t.threat,a=i&&i.alive,o=null;if(a){let e=Wd(t.pos,i.pos,i.vel,Math.max(r.avgSpeed,t.vel.length()),90,i.dragK);e?(t.lastPredict.copy(e.point),t.predictT=e.t,N.subVectors(e.point,t.pos).normalize(),o=N):(N.subVectors(i.pos,t.pos).normalize(),o=N)}let s=a?t.pos.distanceTo(i.pos):1e9;if(t.phase===`boost`){let i=M.copy(t.vel).normalize();t.vel.addScaledVector(i,r.accel*e),o&&t.age>.55&&Gd(t.vel,o,r.turnRate*.55,e),t.vel.y-=Ld*.4*e,t.age>=r.boostTime&&(t.phase=`guide`,n.effects.muzzlePuff(t.pos,1.15),n.effects.flash(t.pos,6,.16,16768174))}else{let n=t.vel.length();if(n<r.maxSpeed&&t.vel.multiplyScalar(1+Cd(r.accel*.35*e/n,0,.05)),t.vel.y-=Ld*.25*e,o){let n=t.vel.length()+(a?i.vel.length():0),o=s<Math.max(700,n*.9);t.phase=o?`terminal`:`guide`;let c=r.turnRate*(o?1.9:1);if(!o){let e=Cd((s-1200)/2600,0,1),n=Math.sin(t.age*1.7+t.weaveSeed)*.06*e;N.applyAxisAngle(M.set(0,1,0),n*.5)}Gd(t.vel,N,c,e)}}let c=t.vel.length();c>r.maxSpeed&&t.vel.multiplyScalar(r.maxSpeed/c),t.pos.addScaledVector(t.vel,e),t.mesh.group.position.copy(t.pos),P.copy(t.pos).add(t.vel),t.mesh.group.lookAt(P);let l=t.phase===`boost`,u=.84+.16*Math.sin(t.age*41+t.flickerSeed)*Math.sin(t.age*13.7+t.flickerSeed*2.3),d=t.mesh.body.material,f=t.phase===`terminal`&&Math.sin(t.age*31+t.flickerSeed*3.1)>.55;if(l){d.emissiveIntensity=2.6*(.8+.3*u),t.mesh.plume.visible=!0,t.mesh.plume.material.opacity=.52+.26*u;let e=t.plumeLen*(.86+.2*u);t.mesh.plume.scale.z=e}else d.emissiveIntensity=f?2:.5,t.mesh.plume.visible=!1;let p=t.pos.distanceTo(n.camera.position),m=Cd(.7+p*.004,.8,8),h=Cd(p/(l?130:420),l?.16:.26,1);if(t.mesh.flame.material.opacity=(l?.95*u:f?.8:.42)*h,t.mesh.flame.scale.setScalar((l?(2.3+t.def.girth*5.5)*(.88+.2*u):f?2.6:1.7)*m),t.emitAcc+=e,t.emitAcc>.03&&t.trail){t.emitAcc=0;let e=Cd(t.pos.y/6500,0,1),n=Cd(t.age*2.2,.15,1),i=r.trailWidth*(l?2.8:1.35)*(.6+e*1.1)*n;ne.copy(t.vel).normalize().multiplyScalar(-r.length*.45).add(t.pos),t.trail.emit(ne,i,l?1:.5+e*.3)}if(a){if(s<r.killRadius){I(t,s);continue}if(s<500){M.subVectors(i.pos,t.pos);let n=i.vel.x-t.vel.x,a=i.vel.y-t.vel.y,o=i.vel.z-t.vel.z,s=n*n+a*a+o*o,c=M.x*n+M.y*a+M.z*o,l=s>1e-6?-c/s:-1;if(l>0&&l<=e*1.5){let e=M.lengthSq()-c*c/s,n=Math.sqrt(Math.max(e,0));if(n<r.killRadius*2.2){t.pos.addScaledVector(t.vel,l),t.mesh.group.position.copy(t.pos),I(t,n);continue}}}if(s<t.minDist)t.minDist=s;else if(t.minDist<260&&s>t.minDist+14){t.minDist<r.killRadius*2.2?I(t,t.minDist):(n.effects.explosionAir(t.pos,.5),n.events.emit(`intercept-miss`,{interceptor:t,threat:i,reason:`CLOSEST APPROACH `+Math.round(t.minDist)+` m — NO FUZE`}),L(t,!1));continue}}else if(t.age>1.2){n.effects.explosionAir(t.pos,.45),n.events.emit(`interceptor-expended`,{interceptor:t}),L(t,!1);continue}(t.age>80||t.pos.y<-5)&&(n.events.emit(`intercept-miss`,{interceptor:t,threat:i,reason:`INTERCEPTOR EXPENDED`}),L(t))}}}}var bf=`
attribute vec3 aVel;
attribute vec3 aAcc;
attribute float aBirth;
attribute float aLife;
attribute float aSize0;
attribute float aSize1;
attribute float aAlpha;
attribute float aRot;
attribute float aRotVel;
attribute float aWob;
attribute float aCell;
attribute vec3 aCol0;
attribute vec3 aCol1;
uniform float uTime;
uniform float uScale;
uniform float uHot;
uniform float uFadeLate;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
varying float vT;
varying float vCell;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vCol = vec3(0.0);
    vRot = 0.0;
    vT = 0.0;
    vCell = 0.0;
    return;
  }
  vec3 pos = position + aVel * age + 0.5 * aAcc * age * age;
  // pseudo-turbulence: per-particle phase wobble that grows in as the puff
  // ages, so smoke boils instead of flying dead-straight ballistic paths
  float ph = aRot * 13.73;
  float wA = aWob * smoothstep(0.04, 0.5, t);
  pos += vec3(
    sin(age * 1.31 + ph),
    sin(age * 1.03 + ph * 1.71 + 2.1),
    cos(age * 1.19 + ph * 0.87 + 4.2)
  ) * wA;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(aSize0, aSize1, pow(t, 0.62));
  gl_PointSize = clamp(size * uScale / max(-mv.z, 0.5), 0.75, 320.0);
  float fadeIn = smoothstep(0.0, 0.06, t);
  float fadeOut = 1.0 - smoothstep(uFadeLate, 1.0, t);
  // fade puffs that drift right up to the camera so they never become
  // screen-filling blobs (drifting launch smoke passing over the player)
  float nearFade = smoothstep(2.5, 18.0, -mv.z);
  vAlpha = aAlpha * fadeIn * fadeOut * nearFade;
  vCol = mix(aCol0, aCol1, pow(t, 0.55));
  // incandescence kick: fire systems flash white-hot at birth and cool fast
  vCol *= 1.0 + uHot * 2.1 * pow(1.0 - t, 2.4);
  vRot = aRot + age * aRotVel;
  vT = t;
  vCell = aCell;
  gl_Position = projectionMatrix * mv;
}
`,xf=`
precision highp float;
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uAtlas;
uniform float uErode;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
varying float vT;
varying float vCell;
void main() {
  float cs = cos(vRot), sn = sin(vRot);
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = vec2(pc.x * cs - pc.y * sn, pc.x * sn + pc.y * cs) + 0.5;
  // 2x2 variant atlas: clamp inside the cell so rotated corners can't bleed
  // into the neighbour (cell borders are transparent anyway)
  vec2 uvc = clamp(uv, 0.004, 0.996);
  vec2 cellOff = vec2(mod(vCell, 2.0), floor(vCell * 0.5)) * 0.5;
  vec4 tex = texture2D(uMap, mix(uvc, uvc * 0.5 + cellOff, uAtlas));
  // ragged dissolve: threshold climbs over life so thin texture regions burn
  // off first and the puff erodes into shreds instead of ghost-fading whole.
  // At t=0 the threshold sits below 0 => birth look is unchanged.
  float er = mix(-0.5, uErode, vT);
  float a = tex.a * smoothstep(er, er + 0.5, tex.a) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * tex.rgb * uTint, a);
}
`,Sf=class{constructor(e,t,n,r,{hot:i=0,fadeLate:a=.55,atlas:o=0,erode:s=0}={}){this.capacity=n,this.cursor=0;let c=new kr,l=e=>{let t=new mr(new Float32Array(n*e),e);return t.setUsage(ze),t};this.attrs={position:l(3),aVel:l(3),aAcc:l(3),aBirth:l(1),aLife:l(1),aSize0:l(1),aSize1:l(1),aAlpha:l(1),aRot:l(1),aRotVel:l(1),aWob:l(1),aCell:l(1),aCol0:l(3),aCol1:l(3)},this.attrs.aBirth.array.fill(-1e9);for(let[e,t]of Object.entries(this.attrs))c.setAttribute(e,t);c.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uScale:{value:720},uMap:{value:t},uTint:{value:new G(1,1,1)},uHot:{value:i},uFadeLate:{value:a},uAtlas:{value:o},uErode:{value:s}};let u=new Jo({vertexShader:bf,fragmentShader:xf,uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:r?2:1});this.points=new ta(c,u),this.points.frustumCulled=!1,this.points.renderOrder=r?20:19,e.add(this.points),this._c0=new G,this._c1=new G,this.rand=new bd(65261)}spawn(e,t){let n=this.cursor;this.cursor=(this.cursor+1)%this.capacity;let r=this.attrs;if(r.position.setXYZ(n,t.pos.x,t.pos.y,t.pos.z),r.aVel.setXYZ(n,t.vel?.x??0,t.vel?.y??0,t.vel?.z??0),r.aAcc.setXYZ(n,t.acc?.x??0,t.acc?.y??0,t.acc?.z??0),r.aBirth.setX(n,e+(t.delay??0)),r.aLife.setX(n,t.life??1),r.aSize0.setX(n,t.size0??1),r.aSize1.setX(n,t.size1??2),r.aAlpha.setX(n,t.alpha??1),r.aRot.setX(n,t.rot??this.rand.next()*6.283),r.aRotVel.setX(n,t.rotVel??(this.rand.next()-.5)*1.4),r.aWob.setX(n,t.wob??0),r.aCell.setX(n,t.cell??this.rand.next()*4|0),this._c0.set(t.col0??16777215),this._c1.set(t.col1??t.col0??16777215),t.colJit){let e=1+(this.rand.next()-.5)*2*t.colJit;this._c0.multiplyScalar(e),this._c1.multiplyScalar(e)}r.aCol0.setXYZ(n,this._c0.r,this._c0.g,this._c0.b),r.aCol1.setXYZ(n,this._c1.r,this._c1.g,this._c1.b),this.dirty=!0}commit(){if(this.dirty){this.dirty=!1;for(let e of Object.values(this.attrs))e.needsUpdate=!0}}setTime(e){this.uniforms.uTime.value=e}setViewport(e,t){this.uniforms.uScale.value=e/(2*Math.tan(t*Math.PI/360))}parkAll(){this.attrs.aBirth.array.fill(-1e9),this.attrs.aBirth.needsUpdate=!0}},Cf=`
attribute vec3 aVel;
attribute vec3 aAcc;
attribute float aBirth;
attribute float aLife;
attribute float aWidth;
attribute float aLen;
attribute float aAlpha;
attribute vec3 aCol0;
attribute vec3 aCol1;
attribute vec2 aCorner;
uniform float uTime;
uniform float uScale;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vCol;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUv = vec2(0.0); vAlpha = 0.0; vCol = vec3(0.0);
    return;
  }
  vec3 p = position + aVel * age + 0.5 * aAcc * age * age;
  vec3 v = aVel + aAcc * age;
  float sp = length(v);
  vec3 dir = sp > 0.001 ? v / sp : vec3(0.0, 1.0, 0.0);
  // motion-blur stretch: longer when fast, shrinking as the spark dies
  float len = aLen * clamp(sp * 0.022, 0.18, 1.0) * (1.0 - 0.45 * t);
  vec3 toCam = cameraPosition - p;
  vec3 side = cross(dir, toCam);
  float sl = length(side);
  side = sl > 0.001 ? side / sl : vec3(0.0, 1.0, 0.0);
  float w = aWidth * (1.0 - 0.4 * t);
  // keep sparks visible at km distances: clamp to a minimum on-screen width
  float depth = length(toCam);
  w = max(w, 1.6 * depth / uScale);
  len = max(len, 4.2 * depth / uScale);
  vec3 wp = p + dir * (aCorner.x * len * 0.5) + side * (aCorner.y * w * 0.5);
  float fadeIn = smoothstep(0.0, 0.04, t);
  float fadeOut = 1.0 - smoothstep(0.5, 1.0, t);
  vAlpha = aAlpha * fadeIn * fadeOut;
  vCol = mix(aCol0, aCol1, pow(t, 0.6));
  vUv = aCorner * 0.5 + 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,wf=`
precision highp float;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vCol;
void main() {
  float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
  float along = sin(clamp(vUv.x, 0.0, 1.0) * 3.14159);
  float head = smoothstep(0.55, 0.95, vUv.x);
  float a = pow(across, 1.9) * (0.3 + 0.7 * along) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * (1.0 + head * 0.8), a);
}
`,Tf=class{constructor(e,t){this.capacity=t,this.cursor=0;let n=new kr,r=e=>{let n=new mr(new Float32Array(t*4*e),e);return n.setUsage(ze),n};this.attrs={position:r(3),aVel:r(3),aAcc:r(3),aBirth:r(1),aLife:r(1),aWidth:r(1),aLen:r(1),aAlpha:r(1),aCol0:r(3),aCol1:r(3)},this.attrs.aBirth.array.fill(-1e9);for(let[e,t]of Object.entries(this.attrs))n.setAttribute(e,t);let i=new mr(new Float32Array(t*4*2),2);for(let e=0;e<t;e++)i.array.set([-1,-1,-1,1,1,-1,1,1],e*8);n.setAttribute(`aCorner`,i);let a=new Uint16Array(t*6);for(let e=0;e<t;e++){let t=e*4;a.set([t,t+1,t+2,t+1,t+3,t+2],e*6)}n.setIndex(new mr(a,1)),n.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uScale:{value:720}};let o=new Jo({vertexShader:Cf,fragmentShader:wf,uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:2,side:2});this.mesh=new K(n,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=21,e.add(this.mesh),this._c0=new G,this._c1=new G}spawn(e,t){let n=this.cursor;this.cursor=(this.cursor+1)%this.capacity;let r=this.attrs;this._c0.set(t.col0??16777215),this._c1.set(t.col1??t.col0??16777215);let i=n*4;for(let n=0;n<4;n++)r.position.setXYZ(i+n,t.pos.x,t.pos.y,t.pos.z),r.aVel.setXYZ(i+n,t.vel?.x??0,t.vel?.y??0,t.vel?.z??0),r.aAcc.setXYZ(i+n,t.acc?.x??0,t.acc?.y??0,t.acc?.z??0),r.aBirth.setX(i+n,e+(t.delay??0)),r.aLife.setX(i+n,t.life??1),r.aWidth.setX(i+n,t.width??.5),r.aLen.setX(i+n,t.len??6),r.aAlpha.setX(i+n,t.alpha??1),r.aCol0.setXYZ(i+n,this._c0.r,this._c0.g,this._c0.b),r.aCol1.setXYZ(i+n,this._c1.r,this._c1.g,this._c1.b);this.dirty=!0}commit(){if(this.dirty){this.dirty=!1;for(let e of Object.values(this.attrs))e.needsUpdate=!0}}setTime(e){this.uniforms.uTime.value=e}setViewport(e,t){this.uniforms.uScale.value=e/(2*Math.tan(t*Math.PI/360))}parkAll(){this.attrs.aBirth.array.fill(-1e9),this.attrs.aBirth.needsUpdate=!0}},Ef=`
attribute vec3 aOther;
attribute float aSide;
attribute float aDirSign;
attribute float aBirth;
attribute float aOtherBirth;
attribute float aWidth;
attribute float aFade;
attribute vec3 aCol;
attribute float aGlow;
uniform float uTime;
uniform float uLife;
uniform float uCool;
uniform vec3 uWind;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
varying vec3 vCol;
varying float vGlow;
void main() {
  float age = max(uTime - aBirth, 0.0);
  float ageO = max(uTime - aOtherBirth, 0.0);
  float t = clamp(age / uLife, 0.0, 1.0);
  vec3 p = position + uWind * age * 0.7;
  vec3 po = aOther + uWind * ageO * 0.7;
  // slight buoyant rise as smoke ages
  p.y += age * 0.55;
  po.y += ageO * 0.55;
  // consistent flight direction for both quad ends (avoids side flipping)
  vec3 dir = (po - p) * aDirSign;
  float dl = length(dir);
  dir = dl > 0.0001 ? dir / dl : vec3(0.0, 1.0, 0.0);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(dir, toCam));
  float w = aWidth * (0.45 + 2.0 * t);
  vec3 wp = p + side * aSide * w;
  vT = t;
  vU = aSide * 0.5 + 0.5;
  vFade = aFade;
  vSeed = fract(aBirth * 7.13);
  vCol = aCol;
  // per-segment incandescence decays with segment age (plasma -> smoke)
  vGlow = aGlow * exp(-age / max(uCool, 0.001));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,Df=`
precision highp float;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uEmissive;
uniform sampler2D uNoise;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
varying vec3 vCol;
varying float vGlow;
void main() {
  float edge = 1.0 - abs(vU * 2.0 - 1.0);
  edge = pow(edge, 1.4);
  float fade = pow(1.0 - vT, 1.15);
  float n = texture2D(uNoise, vec2(vSeed * 8.0 + vT * 2.0, vU * 0.8 + vSeed)).r;
  float a = edge * fade * uOpacity * vFade * (0.45 + 0.55 * n);
  float em = clamp(max(uEmissive, vGlow), 0.0, 1.0);
  // lit smoke goes dim under dark skies (night) so ribbons don't read as
  // bright tubes; emissive segments (plasma, fresh exhaust) keep their alpha
  float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
  a *= mix(mix(0.5, 1.0, smoothstep(0.05, 0.85, tl)), 1.0, em);
  if (a < 0.004) discard;
  // smoke is lit by the environment (uTint); emissive segments ignore it and
  // get a brightness kick so fresh exhaust reads white-hot through bloom
  vec3 col = vCol * mix(uTint, vec3(1.0), em) * (1.0 + vGlow * 2.2);
  gl_FragColor = vec4(col, a);
}
`,Of=140,kf=class{constructor(e,t){let n=Of,r=new kr,i=e=>{let t=new mr(new Float32Array(560*e),e);return t.setUsage(ze),t};this.aPos=i(3),this.aOther=i(3),this.aSide=i(1),this.aDirSign=i(1),this.aBirth=i(1),this.aOtherBirth=i(1),this.aWidth=i(1),this.aFade=i(1),this.aCol=i(3),this.aGlow=i(1),this.aBirth.array.fill(-1e9),this.aOtherBirth.array.fill(-1e9),r.setAttribute(`position`,this.aPos),r.setAttribute(`aOther`,this.aOther),r.setAttribute(`aSide`,this.aSide),r.setAttribute(`aDirSign`,this.aDirSign),r.setAttribute(`aBirth`,this.aBirth),r.setAttribute(`aOtherBirth`,this.aOtherBirth),r.setAttribute(`aWidth`,this.aWidth),r.setAttribute(`aFade`,this.aFade),r.setAttribute(`aCol`,this.aCol),r.setAttribute(`aGlow`,this.aGlow);let a=new Uint16Array(840);for(let e=0;e<n;e++){let t=e*4;a.set([t,t+1,t+2,t+1,t+3,t+2],e*6)}r.setIndex(new mr(a,1)),r.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uLife:{value:10},uCool:{value:1.2},uWind:{value:new W},uOpacity:{value:.7},uTint:{value:new G(1,1,1)},uEmissive:{value:.1},uNoise:{value:t}};let o=new Jo({vertexShader:Ef,fragmentShader:Df,uniforms:this.uniforms,transparent:!0,depthWrite:!1,side:2});this.mesh=new K(r,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=18,this.mesh.visible=!1,e.add(this.mesh),this.cursor=0,this.hasPrev=!1,this.prev=new W,this.prevBirth=0,this.prevWidth=1,this.baseColor=new G(16777215),this.prevColor=new G(16777215),this.prevGlow=0,this.altPuff=0,this._ec=new G}configure({color:e=16777215,life:t=10,opacity:n=.7,emissive:r=.1,cool:i=1.2,altPuff:a=null}){this.baseColor.set(e),this.prevColor.copy(this.baseColor),this.prevGlow=0,this.altPuff=a??(t>=3?.55:0),this.uniforms.uLife.value=t,this.uniforms.uOpacity.value=n,this.uniforms.uEmissive.value=r,this.uniforms.uCool.value=i,this.mesh.visible=!0}reset(){this.aBirth.array.fill(-1e9),this.aOtherBirth.array.fill(-1e9),this.aBirth.needsUpdate=!0,this.aOtherBirth.needsUpdate=!0,this.hasPrev=!1,this.cursor=0,this.mesh.visible=!1}emit(e,t,n=1,r=null,i=0){let a=this.uniforms.uTime.value;this.altPuff>0&&(t*=1+this.altPuff*Cd((e.y-1400)/3e3,0,1));let o=r==null?this.baseColor:this._ec.set(r);if(!this.hasPrev){this.hasPrev=!0,this.prev.copy(e),this.prevBirth=a,this.prevWidth=t,this.prevColor.copy(o),this.prevGlow=i;return}let s=this.cursor;this.cursor=(this.cursor+1)%Of;let c=s*4;for(let r=0;r<2;r++)this.aPos.setXYZ(c+r,e.x,e.y,e.z),this.aOther.setXYZ(c+r,this.prev.x,this.prev.y,this.prev.z),this.aDirSign.setX(c+r,-1),this.aBirth.setX(c+r,a),this.aOtherBirth.setX(c+r,this.prevBirth),this.aWidth.setX(c+r,t),this.aFade.setX(c+r,n),this.aCol.setXYZ(c+r,o.r,o.g,o.b),this.aGlow.setX(c+r,i);for(let t=2;t<4;t++)this.aPos.setXYZ(c+t,this.prev.x,this.prev.y,this.prev.z),this.aOther.setXYZ(c+t,e.x,e.y,e.z),this.aDirSign.setX(c+t,1),this.aBirth.setX(c+t,this.prevBirth),this.aOtherBirth.setX(c+t,a),this.aWidth.setX(c+t,this.prevWidth),this.aFade.setX(c+t,n),this.aCol.setXYZ(c+t,this.prevColor.r,this.prevColor.g,this.prevColor.b),this.aGlow.setX(c+t,this.prevGlow);this.aSide.setX(c,-1),this.aSide.setX(c+1,1),this.aSide.setX(c+2,-1),this.aSide.setX(c+3,1);for(let e of[this.aPos,this.aOther,this.aSide,this.aDirSign,this.aBirth,this.aOtherBirth,this.aWidth,this.aFade,this.aCol,this.aGlow])e.needsUpdate=!0;this.prev.copy(e),this.prevBirth=a,this.prevWidth=t,this.prevColor.copy(o),this.prevGlow=i}},Af=`
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
`,jf=`
uniform float uT;
uniform float uR;
uniform float uSeed;
varying vec3 vP;
varying float vRim;
varying float vN;
${Af}
void main() {
  vec3 dir = normalize(position);
  float n = fbm3(dir * 2.4 + vec3(uSeed, uSeed * 1.7, uSeed * 0.6) + vec3(0.0, uT * 1.1, 0.0));
  float r = uR * (0.68 + 0.62 * n);
  vec3 p = dir * r;
  vP = dir * 2.1 + vec3(uSeed * 3.7);
  vN = n;
  // facing ratio: sphere normal (pre-displacement) vs view direction —
  // 1 at the center facing the camera, 0 at the silhouette rim
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 nView = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
  vRim = clamp(dot(normalize(-mv.xyz), nView), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`,Mf=`
precision highp float;
uniform float uT;
uniform float uHeat;
varying vec3 vP;
varying float vRim;
varying float vN;
${Af}
vec3 fireRamp(float w) {
  vec3 c = vec3(1.35, 0.22, 0.03) * clamp(w * 1.6, 0.0, 1.0);
  c += vec3(1.3, 0.85, 0.12) * smoothstep(0.42, 0.85, w);
  c += vec3(1.5, 1.45, 1.4) * smoothstep(0.78, 1.12, w);
  return c;
}
void main() {
  float n2 = fbm3(vP * 2.3 + vec3(0.0, -uT * 2.4, 0.0));
  // dissolve: threshold climbs over life so the ball breaks into rags and dies
  float cut = mix(0.16, 0.68, uT);
  float a = smoothstep(cut, cut + 0.2, n2 * 0.72 + vN * 0.38 + 0.18);
  a *= 1.0 - smoothstep(0.68, 1.0, uT);
  float rim = clamp(vRim, 0.0, 1.0);
  a *= smoothstep(0.02, 0.3, rim);
  // temperature: hot facing core, cooler broken rim, global cooling over life
  float w = (n2 * 0.85 + 0.42) * (1.05 - uT * 0.8) * (0.38 + 0.72 * rim) * uHeat;
  vec3 col = fireRamp(w);
  // late-life soot: survivors darken toward smoke before the dissolve finishes
  col = mix(col, vec3(0.16, 0.14, 0.13), smoothstep(0.55, 0.95, uT));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;function Nf(){let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,0,64,64,64);n.addColorStop(0,`rgba(255,255,255,0.10)`),n.addColorStop(.62,`rgba(255,255,255,0.02)`),n.addColorStop(.8,`rgba(255,255,255,0.10)`),n.addColorStop(.875,`rgba(255,255,255,0.85)`),n.addColorStop(.93,`rgba(255,255,255,0.18)`),n.addColorStop(1,`rgba(255,255,255,0.0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.globalCompositeOperation=`destination-out`;for(let e=0;e<26;e++){let n=e/26*Z+e%3*.41,r=55+e%5*1.6,i=64+Math.cos(n)*r,a=64+Math.sin(n)*r,o=t.createRadialGradient(i,a,0,i,a,7+e%4*3);o.addColorStop(0,`rgba(0,0,0,${.25+e%3*.16})`),o.addColorStop(1,`rgba(0,0,0,0)`),t.fillStyle=o,t.fillRect(0,0,128,128)}return new ia(e)}function Pf(){let e=document.createElement(`canvas`);e.width=256,e.height=256;let t=e.getContext(`2d`),n=t.createRadialGradient(128,128,0,128,128,128);n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.18,`rgba(255,250,236,0.98)`),n.addColorStop(.36,`rgba(255,230,180,0.5)`),n.addColorStop(.62,`rgba(255,196,124,0.16)`),n.addColorStop(1,`rgba(255,165,85,0)`),t.fillStyle=n,t.fillRect(0,0,256,256),t.globalCompositeOperation=`lighter`;for(let e=0;e<2;e++){let n=e/2*Math.PI+.22,r=e===0?96:62;t.save(),t.translate(128,128),t.rotate(n);let i=t.createLinearGradient(-r,0,r,0);i.addColorStop(0,`rgba(255,236,200,0)`),i.addColorStop(.5,`rgba(255,246,224,0.32)`),i.addColorStop(1,`rgba(255,236,200,0)`),t.fillStyle=i,t.fillRect(-r,-5.5,r*2,11),t.restore()}return new ia(e)}function Ff(){let e=256/160,t=document.createElement(`canvas`);t.width=512,t.height=512;let n=t.getContext(`2d`),r=1370242427,i=()=>(r=r*1664525+1013904223>>>0,r/4294967296),a=82*e;for(let t=0;t<4;t++){n.save(),n.translate(t%2*256,(t>>1)*256),n.beginPath(),n.rect(0,0,256,256),n.clip();let r=n.createRadialGradient(128,a,0,128,a,52*e);r.addColorStop(0,`rgba(255,255,255,0.92)`),r.addColorStop(.6,`rgba(255,255,255,0.55)`),r.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=r,n.fillRect(0,0,256,256);let o=(e,t,r,a)=>{let o=n.createRadialGradient(e-r*.22,t-r*.26,0,e,t,r);o.addColorStop(0,`rgba(255,255,255,${a})`),o.addColorStop(.62,`rgba(255,255,255,${a*.62})`),o.addColorStop(.88,`rgba(255,255,255,${a*.14})`),o.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=o,n.fillRect(0,0,256,256),n.globalCompositeOperation=`source-atop`;let s=n.createRadialGradient(e+r*.34,t+r*.4,r*.1,e+r*.3,t+r*.34,r*.95);s.addColorStop(0,`rgba(72,68,66,${.3+i()*.18})`),s.addColorStop(.55,`rgba(90,86,84,0.12)`),s.addColorStop(1,`rgba(120,116,112,0)`),n.fillStyle=s,n.fillRect(0,0,256,256),n.globalCompositeOperation=`source-over`},s=10+(i()*3|0);for(let t=0;t<s;t++){let n=t/s*Z+i()*.55,r=(22+i()*22)*e;o(128+Math.cos(n)*r,a+Math.sin(n)*r*.92,(13+i()*15)*e,.62+i()*.3)}let c=8+(i()*4|0);for(let t=0;t<c;t++){let t=i()*Z,n=(8+i()*26)*e;o(128+Math.cos(t)*n,a+Math.sin(t)*n*.9,(6+i()*8)*e,.4+i()*.3)}for(let t=0;t<7;t++){let t=i()*Z,r=(46+i()*14)*e,o=128+Math.cos(t)*r,s=a+Math.sin(t)*r*.9,c=(8+i()*10)*e,l=.34+i()*.24,u=n.createRadialGradient(o,s,0,o,s,c);u.addColorStop(0,`rgba(255,255,255,${l})`),u.addColorStop(.7,`rgba(255,255,255,${l*.4})`),u.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=u,n.fillRect(0,0,256,256)}n.globalCompositeOperation=`source-atop`;let l=n.createLinearGradient(30*e,20*e,120*e,150*e);l.addColorStop(0,`rgba(255,255,255,0)`),l.addColorStop(.55,`rgba(120,116,112,0.4)`),l.addColorStop(1,`rgba(56,52,50,0.6)`),n.fillStyle=l,n.fillRect(0,0,256,256);for(let t=0;t<110;t++){let t=i()*Z,r=Math.sqrt(i())*58*e,o=128+Math.cos(t)*r,s=a+Math.sin(t)*r*.92,c=(2+i()*5.5)*e,l=i()<.58,u=l?.1+i()*.13:.07+i()*.1,d=n.createRadialGradient(o,s,0,o,s,c);d.addColorStop(0,l?`rgba(60,56,54,${u})`:`rgba(255,255,255,${u})`),d.addColorStop(1,l?`rgba(60,56,54,0)`:`rgba(255,255,255,0)`),n.fillStyle=d,n.fillRect(0,0,256,256)}let u=n.createRadialGradient(62*e,46*e,4*e,62*e,46*e,70*e);u.addColorStop(0,`rgba(255,255,255,0.5)`),u.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=u,n.fillRect(0,0,256,256),n.restore(),n.globalCompositeOperation=`source-over`}return new ia(t)}function If(){let e=document.createElement(`canvas`);e.width=160,e.height=160;let t=e.getContext(`2d`);for(let[e,n,r,i]of[[80,80,64,.95],[56,62,36,.75],[104,66,36,.75],[70,104,34,.7],[100,100,30,.65],[80,52,26,.7]]){let a=t.createRadialGradient(e,n,0,e,n,r);a.addColorStop(0,`rgba(255,255,255,${i})`),a.addColorStop(.4,`rgba(255,240,210,${i*.8})`),a.addColorStop(.78,`rgba(255,214,160,${i*.24})`),a.addColorStop(1,`rgba(255,195,135,0)`),t.fillStyle=a,t.fillRect(0,0,160,160)}t.globalCompositeOperation=`lighter`;for(let e=0;e<9;e++){let n=e/9*Z+e%2*.31,r=58+e%3*14;t.save(),t.translate(80,80),t.rotate(n);let i=t.createLinearGradient(0,0,r,0);i.addColorStop(0,`rgba(255,236,200,0.5)`),i.addColorStop(1,`rgba(255,200,130,0)`),t.fillStyle=i,t.beginPath(),t.moveTo(10,-7),t.quadraticCurveTo(r*.6,-2.5,r,0),t.quadraticCurveTo(r*.6,2.5,10,7),t.closePath(),t.fill(),t.restore()}return new ia(e)}function Lf(e){let{scene:t,textures:n}=e,r=n.noiseTex(),i=If(),a=Pf(),o=new Sf(t,Ff(),6144,!1,{hot:0,fadeLate:.62,atlas:1,erode:.52}),s=new Sf(t,i,4096,!0,{hot:1,fadeLate:.5,erode:.3}),c=new Tf(t,2048),l=new Sd(()=>new kf(t,r),30),u={high:1,medium:.72,low:.5},d=()=>u[e.settings.quality]??1,f=e=>Math.max(1,Math.round(e*d())),p=()=>!!e.settings.reducedMotion,m=()=>e.settings.quality===`high`?3:e.settings.quality===`medium`?2:0,h=new Sd(()=>{let e=new Yr(new Fr({map:a,color:16777215,transparent:!0,opacity:0,blending:2,depthWrite:!1}));return e.renderOrder=23,e.visible=!1,t.add(e),{sprite:e,t:0,dur:.3,size:10,active:!1}},16),g=[],_=Nf(),v=new Sd(()=>{let e=new Yr(new Fr({map:_,color:16777215,transparent:!0,opacity:0,blending:2,depthWrite:!1}));return e.renderOrder=22,e.visible=!1,t.add(e),{sprite:e,t:0,dur:1,maxR:40,aspect:1,active:!1}},6),y=[],b=new jo(1,3),x=[];for(let e=0;e<5;e++){let n={uT:{value:0},uR:{value:1},uSeed:{value:e*3.17},uHeat:{value:1}},r=new K(b,new Jo({vertexShader:jf,fragmentShader:Mf,uniforms:n,transparent:!0,depthWrite:!1}));r.visible=!1,r.frustumCulled=!1,r.renderOrder=19,t.add(r),x.push({mesh:r,uniforms:n,t:0,dur:1,maxR:10,active:!1,stretch:1})}function S(t,n,r,i=1,a=1){let o=null;for(let e of x)if(!e.active){o=e;break}o&&(o.active=!0,o.t=0,o.dur=r,o.maxR=n,o.stretch=a,o.mesh.position.copy(t),o.uniforms.uT.value=0,o.uniforms.uR.value=n*.2,o.uniforms.uSeed.value=e.vrng.next()*37,o.uniforms.uHeat.value=i,o.mesh.visible=!0)}let C=[];for(let e=0;e<3;e++){let e=new ks(16752720,0,600,2);e.castShadow=!1,t.add(e),C.push({light:e,t:0,dur:0,peak:0,active:!1})}function w(t,n,r,i,a=16752720){if(p()||e.weather?.timeOfDay===`day`)return;let o=null,s=0,c=null;for(let e of C){if(!e.active){o??=e;continue}s++,(!c||e.t/e.dur>c.t/c.dur)&&(c=e)}s>=m()||(o||=c,o&&(o.active=!0,o.t=0,o.dur=i,o.peak=n,o.light.position.copy(t),o.light.color.set(a),o.light.distance=r,o.light.intensity=0))}let T=new Lo(.5);T.scale(.8,.55,1.5);let E=new Y({color:4867650,roughness:.9,metalness:.2,emissive:16738850,emissiveIntensity:0}),D=new Oi(T,E,128);D.instanceMatrix.setUsage(ze),D.frustumCulled=!1,t.add(D);let O=[];for(let e=0;e<128;e++)O.push({alive:!1,pos:new W,vel:new W,rot:new cn,angVel:new W,scale:1,life:0,age:0,glow:0,trailT:0,trailAcc:0,sizeK:1});let k=0,ee=new Zt,A=new Dt,j=new W,M=new W(1e-4,1e-4,1e-4),te=new Sd(()=>{let e=new K(new Fo(.8,1,56),new ai({color:16769208,transparent:!0,opacity:0,side:2,depthWrite:!1,blending:2}));return e.rotation.x=-Math.PI/2,e.visible=!1,t.add(e),{mesh:e,t:0,dur:1,maxR:30,active:!1}},8),N=[],P=new Sd(()=>{let e=new K(new Po(1,1),new ai({map:n.scorch(),transparent:!0,opacity:0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4}));return e.rotation.x=-Math.PI/2,e.renderOrder=3,e.visible=!1,t.add(e),{mesh:e,age:0,active:!1}},12),ne=[],F=0,I=new W,L=new W,re=new W,ie=new G(1,1,1);function ae(t,n){let r=n*Cd(1-t.distanceTo(e.camera.position)/900,0,1);r>.02&&e.player?.addShake(r)}function R(e,t,n=.25,r=16773848){let i=h.acquire();if(!i)return;let a=t*le(e)**.72,o=n;p()&&(a*=.55,o=Math.min(n,.18)),i.sprite.position.copy(e),i.sprite.material.color.set(r),i.sprite.material.opacity=1,i.sprite.scale.setScalar(a*.4),i.sprite.visible=!0,i.t=0,i.dur=o,i.size=a,i.active=!0,g.push(i)}function oe(t,n,r=.9,i=16767400){let a=v.acquire();a&&(a.sprite.position.copy(t),a.sprite.material.color.set(i),a.sprite.material.opacity=.9,a.sprite.scale.setScalar(n*.1),a.sprite.material.rotation=e.vrng.next()*Z,a.aspect=e.vrng.range(.78,.97),a.sprite.visible=!0,a.t=0,a.dur=r,a.maxR=n,a.active=!0,y.push(a))}function se(e,t,n=.9,r=16769208){let i=te.acquire();i&&(i.mesh.position.set(e.x,Math.max(tf(e.x,e.z),0)+.35,e.z),i.mesh.scale.setScalar(.5),i.mesh.material.color.set(r),i.mesh.material.opacity=.42,i.mesh.visible=!0,i.t=0,i.dur=n,i.maxR=t,i.active=!0,N.push(i))}function ce(t,n){let r=P.acquire();r&&(r.mesh.position.set(t.x,Math.max(tf(t.x,t.z),0)+.06,t.z),r.mesh.scale.setScalar(n),r.mesh.rotation.z=e.vrng.next()*Z,r.mesh.material.opacity=.85,r.mesh.visible=!0,r.age=0,r.active=!0,ne.push(r))}function le(t){return Cd(.5+t.distanceTo(e.camera.position)*.0022,1,2.6)}function ue(t,n,r,i=.6,a=0){let o=le(t),s=0;for(let c of O){if(c.alive)continue;c.alive=!0,c.pos.copy(t);let l=e.vrng.next()*Z,u=e.vrng.range(.15,1);if(c.vel.set(Math.cos(l),0,Math.sin(l)).multiplyScalar(r*e.vrng.range(.3,1)*Math.sqrt(1-u*u)),c.vel.y=r*u*e.vrng.range(.5,1.1),c.angVel.set(e.vrng.range(-8,8),e.vrng.range(-8,8),e.vrng.range(-8,8)),c.rot.set(e.vrng.next()*3,e.vrng.next()*3,e.vrng.next()*3),c.scale=e.vrng.range(.3,1.1)*(1+(o-1)*.4),c.life=e.vrng.range(2.5,5),c.age=0,c.glow=i,c.trailT=a>0?a*e.vrng.range(.75,1.25):0,c.trailAcc=e.vrng.range(0,.05),c.sizeK=o,++s>=n)break}i>.3&&(k=Math.min(1,k+.8))}function de(t,n,r=1){let i=Math.max(tf(t.x,t.z),0),a=(.7+.45*r)*d(),l=e.world.wind;R(t,30*r,.16,16774876),R(t,20*r,.45,16754254),w(I.set(t.x,i+4,t.z),9e3*r,320,.7,16756832);let u=Math.round(7*a);for(let i=0;i<u;i++)L.set(e.vrng.gauss(),e.vrng.gauss()*.6,e.vrng.gauss()).normalize().multiplyScalar(e.vrng.range(26,52)*r).addScaledVector(n,e.vrng.range(8,26)*r),re.copy(L).multiplyScalar(-2.2),c.spawn(F,{pos:t,vel:L,acc:re,life:e.vrng.range(.12,.3),width:e.vrng.range(.45,.85)*r,len:e.vrng.range(3.5,8)*r,alpha:.95,col0:16775133,col1:16750648});ue(I.copy(t).addScaledVector(n,2.5),3+Math.round(2*r),17*r,.15);let f=Math.round(26*a);for(let i=0;i<f;i++)I.copy(n).multiplyScalar(-e.vrng.range(2,24)*r).add(t),s.spawn(F,{pos:I,vel:L.set(e.vrng.range(-4,4),e.vrng.range(-2,5),e.vrng.range(-4,4)).addScaledVector(n,-e.vrng.range(7,24)),acc:{x:0,y:4,z:0},life:e.vrng.range(.25,.7),size0:4.5*r,size1:12*r,alpha:.95,col0:16774352,col1:16742954,rotVel:e.vrng.range(-4,4)});let p=Math.round(46*a);for(let n=0;n<p;n++){let a=e.vrng.next()*Z,s=e.vrng.range(1,4.5)*r;I.set(t.x+Math.cos(a)*s,i+e.vrng.range(.4,5),t.z+Math.sin(a)*s);let c=e.vrng.range(9,16)*r;o.spawn(F,{pos:I,vel:{x:Math.cos(a)*e.vrng.range(2.5,9)*r+l.x*.3,y:e.vrng.range(1.2,5),z:Math.sin(a)*e.vrng.range(2.5,9)*r+l.z*.3},acc:{x:l.x*.22,y:e.vrng.range(-.1,.35),z:l.z*.22},life:e.vrng.range(4,11),size0:e.vrng.range(2.5,4.5)*r,size1:c,alpha:e.vrng.range(.5,.8),col0:n%3==0?16767400:15918804,col1:n%2==0?10130314:8156782,colJit:.11,delay:e.vrng.range(0,.35),rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-.5,.5),wob:c*.05})}let m=Math.round(28*a);for(let n=0;n<m;n++){let a=n/m*Z;I.set(t.x+Math.cos(a)*2*r,i+.4,t.z+Math.sin(a)*2*r),o.spawn(F,{pos:I,vel:{x:Math.cos(a)*e.vrng.range(14,30)*r,y:e.vrng.range(.6,2.2),z:Math.sin(a)*e.vrng.range(14,30)*r},acc:{x:-Math.cos(a)*3*r,y:-.6,z:-Math.sin(a)*3*r},life:e.vrng.range(1.4,3.2),size0:2*r,size1:e.vrng.range(8,13)*r,alpha:.55,col0:14074010,col1:10324584,rot:e.vrng.range(-.6,.6)})}let h=Math.round(22*a);for(let n=0;n<h;n++){let a=n/h*Z+e.vrng.range(-.12,.12);I.set(t.x+Math.cos(a)*3.4*r,i+.7,t.z+Math.sin(a)*3.4*r);let s=e.vrng.range(12,18)*r;o.spawn(F,{pos:I,vel:{x:Math.cos(a)*e.vrng.range(3.5,8)*r+l.x*.25,y:e.vrng.range(.2,1),z:Math.sin(a)*e.vrng.range(3.5,8)*r+l.z*.25},acc:{x:l.x*.12,y:-.35,z:l.z*.12},life:e.vrng.range(3.5,8),size0:2.6*r,size1:s,alpha:.45,col0:13481100,col1:9075296,delay:e.vrng.range(.1,.5),rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-.5,.5),wob:s*.03})}let g=Math.round(16*a);for(let i=0;i<g;i++){let a=i/g*15*r+e.vrng.range(0,1.5);I.copy(n).multiplyScalar(a).add(t),I.x+=e.vrng.gauss()*1.1*r,I.z+=e.vrng.gauss()*1.1*r;let s=e.vrng.range(9,15)*r;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*1.6+l.x*.35,y:e.vrng.range(.6,2.4),z:e.vrng.gauss()*1.6+l.z*.35},acc:{x:l.x*.18,y:.05,z:l.z*.18},life:e.vrng.range(5,10),size0:s*.55,size1:s,alpha:e.vrng.range(.4,.58),col0:i%4==0?16769720:15261132,col1:9340796,delay:a/(15*r)*.5+e.vrng.range(0,.15),rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-.4,.4),wob:s*.05})}let _=Math.round(9*a);for(let n=0;n<_;n++){let n=e.vrng.next()*Z;I.set(t.x+Math.cos(n)*e.vrng.range(2,7)*r,i+e.vrng.range(1.5,6),t.z+Math.sin(n)*e.vrng.range(2,7)*r);let a=e.vrng.range(14,24)*r;o.spawn(F,{pos:I,vel:{x:l.x*.45+e.vrng.gauss(),y:e.vrng.range(.25,.9),z:l.z*.45+e.vrng.gauss()},acc:{x:l.x*.1,y:.02,z:l.z*.1},life:e.vrng.range(11,20),size0:a*.4,size1:a,alpha:e.vrng.range(.22,.34),col0:13222582,col1:9341054,delay:e.vrng.range(.6,2.2),rot:e.vrng.range(-.5,.5),rotVel:e.vrng.range(-.3,.3),wob:a*.05})}se(t,26*r,.8),ae(t,.55*r),e.events.emit(`fx-launch`,{pos:t.clone(),scale:r})}function fe(t,n=1){let r=t.y-Math.max(tf(t.x,t.z),0)>500,i=le(t),a=n>=.6;d();let l=e.world.wind;R(t,40*n,.15,16777215),R(t,20*n,.3,16753994),oe(t,(r?34:24)*n*Math.max(i*.35,1),r?.55:.4,r?13623295:16769728),w(t,16e4*n*n,1100+1300*n,1.1,16754784);let u=(5.2+5.5*n)*(.55+i*.45);a&&S(t,u,1+.45*n,1.12);let p=(8+i*5)*n,m=f(Math.round(14*Math.min(n,1.6)));for(let r=0;r<m;r++)I.set(t.x+e.vrng.gauss()*p*.6,t.y+e.vrng.gauss()*p*.6,t.z+e.vrng.gauss()*p*.6),L.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).multiplyScalar(22*n),re.copy(L).multiplyScalar(-1.5),s.spawn(F,{pos:I,vel:L,acc:re,life:e.vrng.range(.3,.6),size0:5*n*i,size1:e.vrng.range(8,12)*n*i,alpha:.95,col0:16776168,col1:16752704,rotVel:e.vrng.range(-4,4)});let h=f(Math.round(24*Math.min(n,1.6)));for(let r=0;r<h;r++)I.set(t.x+e.vrng.gauss()*p,t.y+e.vrng.gauss()*p,t.z+e.vrng.gauss()*p),L.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).multiplyScalar(15*n),re.copy(L).multiplyScalar(-1.05),re.y+=5,s.spawn(F,{pos:I,vel:L,acc:re,life:e.vrng.range(.65,1.4),size0:4.5*n*i,size1:e.vrng.range(9,15)*n*i,alpha:.92,col0:16771248,col1:16734746,delay:e.vrng.range(.05,.32),rotVel:e.vrng.range(-3.5,3.5)});let g=f(Math.round(13*Math.min(n,1.6)));for(let r=0;r<g;r++)I.set(t.x+e.vrng.gauss()*p*.8,t.y+e.vrng.gauss()*p*.8,t.z+e.vrng.gauss()*p*.8),L.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).multiplyScalar(11*n),re.copy(L).multiplyScalar(-.9),o.spawn(F,{pos:I,vel:L,acc:re,life:e.vrng.range(.45,.9),size0:5*n*i,size1:e.vrng.range(10,14)*n*i,alpha:.82,col0:16772552,col1:9272680,rot:e.vrng.range(-.7,.7),rotVel:e.vrng.range(-2.5,2.5)});let _=(11+i*7)*n,v=f(Math.round(22*Math.min(n,1.6)));for(let r=0;r<v;r++){I.set(t.x+e.vrng.gauss()*_,t.y+e.vrng.gauss()*_,t.z+e.vrng.gauss()*_),L.set(e.vrng.gauss(),e.vrng.gauss()*.8+.4,e.vrng.gauss()).multiplyScalar(8*n),re.copy(L).multiplyScalar(-.42),re.y+=1.1;let r=e.vrng.range(12,19)*n*i;o.spawn(F,{pos:I,vel:L,acc:re,life:e.vrng.range(1.6,3.4),size0:5*n*i,size1:r,alpha:.66,col0:6902080,col1:3683117,delay:e.vrng.range(.1,.35),rot:e.vrng.range(-.7,.7),rotVel:e.vrng.range(-1.6,1.6),wob:r*.04})}let y=f(a?r?30:25:10),b=(14+i*15)*n,x=()=>Cd(e.vrng.gauss(),-1.7,1.7);for(let a=0;a<y;a++){I.set(t.x+x()*b,t.y+x()*b*.85,t.z+x()*b);let s=!(a&1),c=e.vrng.range(21,36)*n*i;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*2+l.x*.5,y:e.vrng.gauss()*1.4+.5,z:e.vrng.gauss()*2+l.z*.5},acc:{x:l.x*.2,y:.22,z:l.z*.2},life:e.vrng.range(r?8:6,r?17:12),size0:c*.55,size1:c,alpha:e.vrng.range(.55,.78),col0:s?4603962:6182478,col1:s?2828325:3617582,colJit:.13,delay:e.vrng.range(.15,.8),rot:e.vrng.range(-.7,.7),rotVel:e.vrng.range(-.4,.4),wob:c*.055})}if(a){let r=f(12),a=e.vrng.range(-.35,.35);for(let s=0;s<r;s++){let c=s/r*Z+e.vrng.range(-.15,.15),d=Math.cos(c),f=Math.sin(c);I.set(t.x+d*u*.5,t.y+f*u*.5*a,t.z+f*u*.5);let p=e.vrng.range(10,16)*n*i;o.spawn(F,{pos:I,vel:{x:d*e.vrng.range(7,11)*n+l.x*.4,y:f*a*8*n+.8,z:f*e.vrng.range(7,11)*n+l.z*.4},acc:{x:-d*1.1*n+l.x*.15,y:.15,z:-f*1.1*n+l.z*.15},life:e.vrng.range(4,8),size0:p*.4,size1:p,alpha:e.vrng.range(.4,.55),col0:5722186,col1:3288875,delay:e.vrng.range(.25,.6),rot:e.vrng.range(-.7,.7),wob:p*.04})}}let C=f(Math.round((a?62:30)*Math.min(n,1.5)));for(let r=0;r<C;r++)L.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).normalize().multiplyScalar(e.vrng.range(34,105)*n),re.set(-L.x*.55,-L.y*.55-30,-L.z*.55),c.spawn(F,{pos:t,vel:L,acc:re,life:e.vrng.range(.5,a?1.8:1.1),width:e.vrng.range(.28,.55)*n,len:e.vrng.range(5,14)*n,alpha:.95,col0:16773828,col1:16740394});if(a){let r=f(Math.round(7*Math.min(n,1.5)));for(let a=0;a<r;a++)I.set(t.x+e.vrng.gauss()*p*1.6,t.y+e.vrng.gauss()*p*1.6,t.z+e.vrng.gauss()*p*1.6),s.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*4,y:e.vrng.gauss()*4,z:e.vrng.gauss()*4},life:e.vrng.range(.08,.16),size0:2.6*n*i,size1:1.2*n*i,alpha:.95,col0:16777215,col1:16760928,delay:e.vrng.range(.12,.7)})}let T=f(Math.round(10*Math.min(n,1.5)));for(let r=0;r<T;r++)s.spawn(F,{pos:t,vel:L.set(e.vrng.gauss()*7,e.vrng.gauss()*5-3,e.vrng.gauss()*7),acc:{x:0,y:-9,z:0},life:e.vrng.range(.9,2.1),size0:1.4*n*i,size1:.4,alpha:.9,col0:16761466,col1:16726536});a?ue(t,f(r?10:13),(r?30:46)*n,1,e.vrng.range(1.3,2.2)):ue(t,f(5),30*n,.8,.6),ae(t,.5*n),e.events.emit(`fx-explosion`,{pos:t.clone(),scale:n,air:!0})}function pe(t,n=1){let r=Math.max(tf(t.x,t.z),0),i=I.set(t.x,r+1.5,t.z).clone(),a=Math.sqrt(le(i)),l=e.world.wind;R(i,36*n,.14,16777215),R(i,27*n,.45,16752714),L.set(i.x,r+7*n,i.z),oe(L,40*n*a,.55,16768432),w(L.set(i.x,r+14*n,i.z),15e4*n*n,1400+1300*n,2.2,16752720),S(L.set(i.x,r+5.5*n*a,i.z),(6.5+5.5*n)*a,.85+.35*n,1.1);let u=f(Math.round(34*Math.min(n,1.7)));for(let t=0;t<u;t++)I.set(i.x+e.vrng.gauss()*8*n,r+e.vrng.range(.5,7)*n,i.z+e.vrng.gauss()*8*n),s.spawn(F,{pos:I,vel:L.set(e.vrng.gauss()*9,e.vrng.range(14,46),e.vrng.gauss()*9).multiplyScalar(n),acc:{x:0,y:-7,z:0},life:e.vrng.range(.45,1.5),size0:7*n*a,size1:22*n*a,alpha:.95,col0:16772544,col1:14241558,delay:e.vrng.range(0,.1),rotVel:e.vrng.range(-3,3)});let d=f(Math.round(60*Math.min(n,1.6)));for(let t=0;t<d;t++)L.set(e.vrng.gauss()*26,e.vrng.range(28,95),e.vrng.gauss()*26).multiplyScalar(n),re.set(-L.x*.4,-38,-L.z*.4),c.spawn(F,{pos:i,vel:L,acc:re,life:e.vrng.range(.7,2.2),width:e.vrng.range(.3,.6)*n,len:e.vrng.range(8,18)*n,alpha:.95,col0:16773828,col1:16740394});let p=f(Math.round(30*Math.min(n,1.7)));for(let t=0;t<p;t++)L.set(e.vrng.gauss()*44,e.vrng.range(42,110),e.vrng.gauss()*44).multiplyScalar(n),c.spawn(F,{pos:i,vel:L,acc:{x:-L.x*.5,y:-95,z:-L.z*.5},life:e.vrng.range(.28,.7),width:e.vrng.range(.55,1)*n,len:e.vrng.range(7,16)*n,alpha:.95,col0:15258536,col1:9401928});let m=f(Math.round(10*Math.min(n,1.7)));for(let t=0;t<m;t++)L.set(e.vrng.gauss()*26,e.vrng.range(30,78),e.vrng.gauss()*26).multiplyScalar(n),o.spawn(F,{pos:i,vel:L,acc:{x:-L.x*.4,y:-70,z:-L.z*.4},life:e.vrng.range(.5,1.1),size0:e.vrng.range(2,4)*n*a,size1:e.vrng.range(4,7)*n*a,alpha:.95,col0:3024928,col1:1841429,colJit:.15,rotVel:e.vrng.range(-3,3)});let h=f(Math.round(38*Math.min(n,1.7)));for(let t=0;t<h;t++){I.set(i.x+e.vrng.gauss()*3.5*n,r+e.vrng.range(.5,3),i.z+e.vrng.gauss()*3.5*n);let t=e.vrng.range(6,14)*n*a;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*13*n,y:e.vrng.range(28,74)*n,z:e.vrng.gauss()*13*n},acc:{x:0,y:-27,z:0},life:e.vrng.range(1.6,3.4),size0:2.5*n*a,size1:t,alpha:e.vrng.range(.8,.95),col0:5326127,col1:3748127,delay:e.vrng.range(0,.12),rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-1,1)})}let g=f(Math.round(14*Math.min(n,1.7)));for(let t=0;t<g;t++){let s=t/g*Z+e.vrng.range(-.2,.2);I.set(i.x+Math.cos(s)*2*n,r+1,i.z+Math.sin(s)*2*n);let c=e.vrng.range(24,44)*n;o.spawn(F,{pos:I,vel:{x:Math.cos(s)*c,y:e.vrng.range(26,44)*n,z:Math.sin(s)*c},acc:{x:0,y:-26,z:0},life:e.vrng.range(1.6,3),size0:2*n*a,size1:e.vrng.range(6,11)*n*a,alpha:e.vrng.range(.75,.9),col0:6049334,col1:4274214,delay:e.vrng.range(0,.1),rot:e.vrng.range(-.6,.6)})}let _=f(Math.round(12*Math.min(n,1.7)));for(let t=0;t<_;t++)I.set(i.x+e.vrng.gauss()*5*n,r+e.vrng.range(1,6)*n,i.z+e.vrng.gauss()*5*n),L.set(e.vrng.gauss()*6,e.vrng.range(7,18),e.vrng.gauss()*6).multiplyScalar(n),re.copy(L).multiplyScalar(-.55),o.spawn(F,{pos:I,vel:L,acc:re,life:e.vrng.range(.7,1.6),size0:7*n*a,size1:17*n*a,alpha:.7,col0:16771524,col1:9272420,rot:e.vrng.range(-.7,.7),rotVel:e.vrng.range(-2.5,2.5)});let v=f(Math.round(78*Math.min(n,1.7)));for(let t=0;t<v;t++){let s=e.vrng.range(1,18)*n,c=s/(18*n),u=.35+c*1.1;I.set(i.x+e.vrng.gauss()*(4+s*.8)*n,r+s,i.z+e.vrng.gauss()*(4+s*.8)*n);let d=t%3==0,f=e.vrng.range(20,42)*(.8+c*.7)*n*a;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*(2+c*2.5)+l.x*.35*u,y:e.vrng.range(4,30)*n,z:e.vrng.gauss()*(2+c*2.5)+l.z*.35*u},acc:{x:l.x*.38*u,y:-.8,z:l.z*.38*u},life:e.vrng.range(8,18),size0:f*.5,size1:f,alpha:e.vrng.range(.58,.8),col0:d?3354153:4866617,col1:d?2039068:2828325,colJit:.14,delay:e.vrng.range(0,2.6),rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-.7,.7),wob:f*.06})}let y=f(Math.round(7*Math.min(n,1.7)));for(let t=0;t<y;t++){I.set(i.x+e.vrng.gauss()*5*n,r+e.vrng.range(1.5,7)*n,i.z+e.vrng.gauss()*5*n);let t=e.vrng.range(22,34)*n*a;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*.8+l.x*.12,y:e.vrng.range(.5,2),z:e.vrng.gauss()*.8+l.z*.12},acc:{x:l.x*.08,y:-.05,z:l.z*.08},life:e.vrng.range(12,20),size0:t*.55,size1:t,alpha:e.vrng.range(.45,.6),col0:4537651,col1:2762531,colJit:.12,delay:e.vrng.range(.4,1.6),rot:e.vrng.range(-.4,.4),rotVel:e.vrng.range(-.2,.2),wob:t*.03})}let b=f(Math.round(14*Math.min(n,1.7)));for(let t=0;t<b;t++){I.set(i.x+e.vrng.gauss()*18*n,r+e.vrng.range(30,54)*n,i.z+e.vrng.gauss()*18*n);let t=e.vrng.range(26,42)*n*a;o.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*3.5+l.x*.55,y:e.vrng.range(1.5,4.5),z:e.vrng.gauss()*3.5+l.z*.55},acc:{x:l.x*.22,y:-.12,z:l.z*.22},life:e.vrng.range(8,16),size0:9*n*a,size1:t,alpha:e.vrng.range(.42,.58),col0:4998203,col1:3025704,colJit:.12,delay:e.vrng.range(1.2,3),rot:e.vrng.range(-.5,.5),rotVel:e.vrng.range(-.3,.3),wob:t*.05})}let x=f(Math.round(10*Math.min(n,1.6)));for(let t=0;t<x;t++)I.set(i.x+e.vrng.gauss()*2*n,r+e.vrng.range(1,6)*n,i.z+e.vrng.gauss()*2*n),s.spawn(F,{pos:I,vel:{x:0,y:e.vrng.range(4,9)*n,z:0},life:e.vrng.range(.7,1.5),size0:6*n*a,size1:12*n*a,alpha:.35,col0:16745524,col1:9580040,delay:.15});let C=f(Math.round(14*Math.min(n,1.6)));for(let t=0;t<C;t++)I.set(i.x+e.vrng.gauss()*4*n,r+e.vrng.range(.5,5)*n,i.z+e.vrng.gauss()*4*n),s.spawn(F,{pos:I,vel:{x:e.vrng.gauss()*1.5+l.x*.15,y:e.vrng.range(2.5,7.5),z:e.vrng.gauss()*1.5+l.z*.15},acc:{x:l.x*.1,y:-.4,z:l.z*.1},life:e.vrng.range(2,4.5),size0:e.vrng.range(1.2,2.4)*n*a,size1:e.vrng.range(2.5,4.5)*n*a,alpha:.55,col0:16743470,col1:5903364,delay:e.vrng.range(.3,1.4),rotVel:e.vrng.range(-1,1)});let T=f(Math.round(24*Math.min(n,1.7)));for(let t=0;t<T;t++){let s=t/T*Z+e.vrng.range(-.1,.1);I.set(i.x+Math.cos(s)*4*n,r+e.vrng.range(.4,1.6),i.z+Math.sin(s)*4*n),o.spawn(F,{pos:I,vel:{x:Math.cos(s)*e.vrng.range(55,85)*n,y:e.vrng.range(.5,2),z:Math.sin(s)*e.vrng.range(55,85)*n},acc:{x:-Math.cos(s)*38*n,y:-.8,z:-Math.sin(s)*38*n},life:e.vrng.range(.9,1.6),size0:3*n*a,size1:e.vrng.range(10,16)*n*a,alpha:.5,col0:13350288,col1:9272414,rot:e.vrng.range(-.5,.5)})}let E=f(Math.round(52*Math.min(n,1.7)));for(let t=0;t<E;t++){let s=t/E*Z+e.vrng.range(-.1,.1);I.set(i.x+Math.cos(s)*3*n,r+e.vrng.range(.5,3.5),i.z+Math.sin(s)*3*n);let c=e.vrng.range(17,28)*n*a;o.spawn(F,{pos:I,vel:{x:Math.cos(s)*e.vrng.range(16,38)*n,y:e.vrng.range(.6,3.2),z:Math.sin(s)*e.vrng.range(16,38)*n},acc:{x:-Math.cos(s)*2.4*n,y:-.9,z:-Math.sin(s)*2.4*n},life:e.vrng.range(6,12),size0:4.5*n*a,size1:c,alpha:e.vrng.range(.52,.7),col0:11901546,col1:6312767,colJit:.1,delay:e.vrng.range(0,.15),rot:e.vrng.range(-.5,.5),rotVel:e.vrng.range(-.6,.6),wob:c*.035})}let D=f(Math.round(16*Math.min(n,1.7)));for(let t=0;t<D;t++){let s=t/D*Z+e.vrng.range(-.3,.3),c=e.vrng.range(8,30)*n;I.set(i.x+Math.cos(s)*c,r+e.vrng.range(1,5),i.z+Math.sin(s)*c);let u=e.vrng.range(26,44)*n*a;o.spawn(F,{pos:I,vel:{x:Math.cos(s)*2.2+l.x*.5,y:e.vrng.range(.2,1.1),z:Math.sin(s)*2.2+l.z*.5},acc:{x:l.x*.14,y:-.06,z:l.z*.14},life:e.vrng.range(11,20),size0:u*.45,size1:u,alpha:e.vrng.range(.3,.44),col0:11047538,col1:6049852,colJit:.1,delay:e.vrng.range(1.5,4),rot:e.vrng.range(-.4,.4),rotVel:e.vrng.range(-.25,.25),wob:u*.03})}ue(i,f(Math.round(26*n)),62*n,1,1.2),se(i,62*n,.8),se(i,100*n,1.7,14270618),ce(i,22*n),ae(i,.8*n),e.events.emit(`fx-explosion`,{pos:i.clone(),scale:n,air:!1})}function me(t,n){for(let r=0;r<6;r++)s.spawn(F,{pos:t,vel:L.copy(n).multiplyScalar(20).add(I.set(e.vrng.gauss()*5,e.vrng.gauss()*5,e.vrng.gauss()*5)),life:.4,size0:1.5,size1:.4,alpha:.9,col0:16767392,col1:16746544});for(let r=0;r<5;r++)L.copy(n).multiplyScalar(e.vrng.range(16,30)).add(I.set(e.vrng.gauss()*6,e.vrng.gauss()*6,e.vrng.gauss()*6)),c.spawn(F,{pos:t,vel:L,acc:{x:0,y:-14,z:0},life:e.vrng.range(.25,.5),width:.25,len:3.5,alpha:.85,col0:16771516,col1:16746544});ue(t,2,16,0)}function he(t,n=1){for(let r=0;r<8;r++)o.spawn(F,{pos:t,vel:{x:e.vrng.gauss()*3,y:e.vrng.range(.8,2.6),z:e.vrng.gauss()*3},acc:{x:e.world.wind.x*.2,y:.3,z:e.world.wind.z*.2},life:e.vrng.range(1.2,3),size0:1.4*n,size1:6.5*n,alpha:.35,col0:14077891,col1:9341054,rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-1,1),wob:.3*n})}let ge={acquireTrail(e){let t=l.acquire();return t?(t.reset(),t.configure(e),t.uniforms.uTime.value=F,t):null},releaseTrail(e){e&&_e.push({t:e,until:F+e.uniforms.uLife.value+.5})},launchBlast:de,explosionAir:fe,explosionGround:pe,coverPop:me,muzzlePuff:he,flash:R,ring:se,scorchAt:ce,throwDebris:ue,update(t,n){F=n;for(let e of l.used)e.uniforms.uTime.value=F;for(let e of l.free)e.uniforms.uTime.value=F;for(let e=_e.length-1;e>=0;e--)if(_e[e].until<=F){let{t}=_e[e];t.reset(),l.release(t),_e.splice(e,1)}let r=e.world.trailTint;o.uniforms.uTint.value.copy(r??ie);for(let t of l.used)t.uniforms.uWind.value.copy(e.world.wind),r&&t.uniforms.uTint.value.copy(r);for(let e=g.length-1;e>=0;e--){let n=g[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.sprite.visible=!1,n.active=!1,g.splice(e,1),h.release(n);continue}n.sprite.scale.setScalar(n.size*(.4+r*.9)),n.sprite.material.opacity=(1-r)**1.6}for(let e=y.length-1;e>=0;e--){let n=y[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.sprite.visible=!1,n.active=!1,y.splice(e,1),v.release(n);continue}let i=Ed(r),a=Math.max(n.maxR*i,1.2)*2.8;n.sprite.scale.set(a,a*(n.aspect??1),1),n.sprite.material.opacity=.9*(1-r)**1.6}for(let e of x){if(!e.active)continue;e.t+=t;let n=e.t/e.dur;if(n>=1){e.active=!1,e.mesh.visible=!1;continue}let r=1-(1-Math.min(n*1.45,1))**3;e.uniforms.uT.value=n,e.uniforms.uR.value=e.maxR*(.3+.7*r)*(1+.22*n)}for(let e of C){if(!e.active)continue;e.t+=t;let n=e.t/e.dur;if(n>=1){e.active=!1,e.light.intensity=0;continue}let r=n<.06?n/.06:(1-(n-.06)/.94)**2.2;e.light.intensity=e.peak*r}for(let e=N.length-1;e>=0;e--){let n=N[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.mesh.visible=!1,n.active=!1,N.splice(e,1),te.release(n);continue}n.mesh.scale.setScalar(.5+Ed(r)*n.maxR),n.mesh.material.opacity=.4*(1-r)**1.7}for(let e=ne.length-1;e>=0;e--){let n=ne[e];if(n.age+=t,n.age>70){n.mesh.visible=!1,n.active=!1,ne.splice(e,1),P.release(n);continue}n.age>50&&(n.mesh.material.opacity=.85*(1-(n.age-50)/20))}k=Math.max(0,k-t*.7),E.emissiveIntensity=2.4*k;for(let n=0;n<128;n++){let r=O[n];if(!r.alive){ee.compose(r.pos,A.identity(),M),D.setMatrixAt(n,ee);continue}r.age+=t,r.vel.y-=22*t,r.pos.addScaledVector(r.vel,t),r.rot.x+=r.angVel.x*t,r.rot.y+=r.angVel.y*t,r.rot.z+=r.angVel.z*t,r.trailT>0&&r.age<r.trailT&&(r.trailAcc+=t,r.trailAcc>.07&&(r.trailAcc=0,o.spawn(F,{pos:r.pos,vel:{x:e.vrng.gauss()*.7,y:e.vrng.range(.2,.9),z:e.vrng.gauss()*.7},acc:{x:e.world.wind.x*.15,y:.35,z:e.world.wind.z*.15},life:e.vrng.range(.8,1.7),size0:(.9*r.scale+.4)*r.sizeK,size1:4.5*r.sizeK,alpha:.32,col0:10130314,col1:5656649,rot:e.vrng.range(-.6,.6),rotVel:e.vrng.range(-1,1)}),r.glow>.5&&s.spawn(F,{pos:r.pos,life:.22,size0:1.8*r.sizeK,size1:.5,alpha:.9,col0:16767392,col1:16734740})));let i=Math.max(tf(r.pos.x,r.pos.z),0);r.pos.y<i+.2&&(r.pos.y=i+.2,Math.abs(r.vel.y)>4?(r.vel.y*=-.32,r.vel.x*=.55,r.vel.z*=.55):(r.vel.set(0,0,0),r.angVel.multiplyScalar(.8))),r.age>r.life&&(r.alive=!1);let a=r.scale*Cd(1-Math.max(0,r.age-r.life+.5)*2,.001,1);A.setFromEuler(r.rot),ee.compose(r.pos,A,j.setScalar(a)),D.setMatrixAt(n,ee)}D.instanceMatrix.needsUpdate=!0,D.count=128,o.setTime(F),s.setTime(F),c.setTime(F),o.commit(),s.commit(),c.commit()},setViewport(e,t){o.setViewport(e,t),s.setViewport(e,t),c.setViewport(e,t)},clearAll(){for(let e of[...g])e.sprite.visible=!1,h.release(e);g.length=0;for(let e of[...y])e.sprite.visible=!1,v.release(e);y.length=0;for(let e of[...N])e.mesh.visible=!1,te.release(e);N.length=0;for(let e of O)e.alive=!1;for(let e of x)e.active=!1,e.mesh.visible=!1;for(let e of C)e.active=!1,e.light.intensity=0;k=0;for(let{t:e}of _e)e.reset(),l.release(e);_e.length=0,o.parkAll(),s.parkAll(),c.parkAll()}},_e=[];return ge}var Rf=9e3,zf=7e3,Bf={hostile:16732992,decoy:13215487,intc:3662079,assigned:16765527,select:16777215},Vf={hostile:`#ff6a55`,decoy:`#c9a6ff`,intc:`#37e0ff`,assigned:`#ffd257`,phos:`#7df0ac`},Hf={x:0,z:0,t:0};function Uf(e,t){let n=(t.y+Math.sqrt(t.y*t.y+2*Ld*Math.max(0,e.y)))/Ld;return Hf.x=e.x+t.x*n,Hf.z=e.z+t.z*n,Hf.t=n,Hf}function Wf(e){let{textures:t}=e,n=[],r=new Map,i=0,a=null,o=document.createElement(`canvas`);o.width=928,o.height=512;let s=o.getContext(`2d`),c=new ia(o);c.colorSpace=Ne,e.base?.consoleScreen&&(e.base.consoleScreen.material=new ai({map:c,toneMapped:!1}));let l=`"Consolas","Menlo","DejaVu Sans Mono",monospace`,u=(e,t,n)=>{if(!n)return null;let r=document.createElement(`canvas`);r.width=e,r.height=t;let i=r.getContext(`2d`),a=new ia(r);return a.colorSpace=Ne,n.material.dispose?.(),n.material=new ai({map:a,toneMapped:!1}),{a:i,tex:a,w:e,h:t}},d=u(512,288,e.base?.auxScreens?.left),f=u(384,256,e.base?.auxScreens?.right),p=(()=>{let e=document.createElement(`canvas`);e.width=928,e.height=512;let t=e.getContext(`2d`);t.fillStyle=`rgba(0,0,0,0.10)`;for(let e=14;e<498;e+=3)t.fillRect(14,e,900,1);let n=t.createRadialGradient(258,256,117.7,258,256,214*1.35);n.addColorStop(0,`rgba(0,0,0,0)`),n.addColorStop(1,`rgba(0,0,0,0.28)`),t.fillStyle=n,t.fillRect(14,14,500,484);let r=t.createLinearGradient(0,0,928,512);r.addColorStop(.1,`rgba(190,255,225,0)`),r.addColorStop(.2,`rgba(190,255,225,0.030)`),r.addColorStop(.28,`rgba(190,255,225,0)`),t.fillStyle=r,t.fillRect(14,14,900,484),t.strokeStyle=`rgba(140,255,190,0.045)`,t.lineWidth=3,t.beginPath(),t.arc(258,256,160.5,0,Z),t.stroke(),t.beginPath(),t.arc(258,256,53.5,0,Z),t.stroke(),t.fillStyle=`rgba(140,255,190,0.06)`,t.beginPath(),t.arc(258,256,6.5,0,Z),t.fill(),t.fillStyle=`#111613`,t.beginPath(),t.rect(0,0,928,512),t.rect(12,12,904,488),t.fill(`evenodd`),t.strokeStyle=`rgba(150,255,200,0.16)`,t.strokeRect(12.5,12.5,903,487),t.strokeStyle=`rgba(0,0,0,0.65)`,t.strokeRect(1.5,1.5,925,509),t.strokeStyle=`rgba(255,255,255,0.05)`,t.strokeRect(.5,.5,927,511),t.font=`9px ${l}`;for(let[e,n]of[[6.5,6.5],[921.5,6.5],[6.5,505.5],[921.5,505.5]])t.fillStyle=`#20261f`,t.beginPath(),t.arc(e,n,3.4,0,Z),t.fill(),t.strokeStyle=`rgba(0,0,0,0.7)`,t.lineWidth=1,t.beginPath(),t.moveTo(e-2.2,n-2.2),t.lineTo(e+2.2,n+2.2),t.stroke();return t.fillStyle=`#39443c`,t.textAlign=`center`,t.fillText(`IVX-9 · P43 PHOSPHOR SCOPE · FICTIONAL TRAINER`,464,508.5),e})(),m=!1,h=(()=>{let e=new bd(48271),t=[];for(let n=0;n<26;n++)t.push({a:e.next()*Z,d:e.range(.06,.34)*214,w:e.range(.12,.5),l:e.range(6,22),o:e.range(.05,.16),ph:e.next()*Z});return t})(),g=new En,_=.78/Rf,v=.78/zf;e.base?.holoAnchor&&e.base.holoAnchor.add(g);{let e=new K(new la(.8,64),new ai({color:336942,transparent:!0,opacity:.6,depthWrite:!1}));e.rotation.x=-Math.PI/2,g.add(e);for(let e=0;e<3;e++){let t=new K(new Fo(.26*e+.004,.26*(e+1)-.004,64),new ai({color:941166,transparent:!0,opacity:e%2?.05:.11,side:2,depthWrite:!1,blending:2}));t.rotation.x=-Math.PI/2,t.position.y=.0015,t.renderOrder=1,g.add(t)}for(let e=1;e<=3;e++){let t=[];for(let n=0;n<=72;n++){let r=n/72*Z;t.push(new W(Math.cos(r)*.26*e,.002,Math.sin(r)*.26*e))}let n=new Gi(new kr().setFromPoints(t),new Li({color:4183788,transparent:!0,opacity:e===3?.85:.42}));n.renderOrder=2,g.add(n)}{let e=[];for(let t=0;t<24;t++){let n=t/24*Z,r=t%6==0?.73:.76;e.push(new W(Math.cos(n)*r,.002,Math.sin(n)*r)),e.push(new W(Math.cos(n)*.795,.002,Math.sin(n)*.795))}let t=new Yi(new kr().setFromPoints(e),new Li({color:3066078,transparent:!0,opacity:.5}));t.renderOrder=2,g.add(t)}for(let e=0;e<8;e++){let t=e/8*Z,n=[new W(0,.002,0),new W(Math.cos(t)*.78,.002,Math.sin(t)*.78)];g.add(new Gi(new kr().setFromPoints(n),new Li({color:1735820,transparent:!0,opacity:.22})))}let n=new K(new J(.8,.8,.46,64,1,!0),new ai({color:1873068,transparent:!0,opacity:.02,side:2,depthWrite:!1,blending:2}));n.position.y=.23,n.renderOrder=1,g.add(n);let r=new K(new J(.78,.06,.48,48,1,!0),new ai({color:2004138,transparent:!0,opacity:.04,side:2,depthWrite:!1,blending:2}));r.position.y=.19,r.renderOrder=1,g.add(r);let i=new K(new J(.3,.04,.3,32,1,!0),new ai({color:2799823,transparent:!0,opacity:.045,side:2,depthWrite:!1,blending:2}));i.position.y=.1,i.renderOrder=1,g.add(i);let a=(e,n,r,i,a)=>{let o=new K(new Po(i,i),new ai({map:t.label(e,{fg:`#7fe8f8`,w:64,h:64,font:`bold 44px Arial`}),transparent:!0,depthWrite:!1,opacity:a}));o.rotation.x=-Math.PI/2,o.position.set(n,.004,r),g.add(o)};a(`N`,0,-.87,.075,1),a(`E`,.87,0,.055,.55),a(`S`,0,.87,.055,.55),a(`W`,-.87,0,.055,.55);let o=new K(new No(.014),new ai({color:10482687}));o.position.y=.006,g.add(o)}let y=new En;g.add(y);{let e=(e,t)=>{let n=new K(e,t);return n.rotation.x=-Math.PI/2,n.position.y=.004,n.renderOrder=3,y.add(n),n},t=.78,n=[0,0,0],r=[0,0,0];for(let e=0;e<=40;e++){let i=e/40,a=-1.15+i*1.15;n.push(Math.cos(a)*t,Math.sin(a)*t,0);let o=i*i*i;r.push(o,o,o)}let i=[];for(let e=1;e<=40;e++)i.push(0,e,e+1);let a=new kr;a.setIndex(i),a.setAttribute(`position`,new _r(n,3)),a.setAttribute(`color`,new _r(r,3)),e(a,new ai({color:3074303,vertexColors:!0,transparent:!0,opacity:.42,side:2,depthWrite:!1,blending:2})),e(new la(t,10,-.09,.09),new ai({color:6746879,transparent:!0,opacity:.42,side:2,depthWrite:!1,blending:2}));let o=new Gi(new kr().setFromPoints([new W(.04,0,0),new W(t,0,0)]),new Li({color:11074559,transparent:!0,opacity:.85}));o.rotation.x=-Math.PI/2,o.position.y=.005,o.renderOrder=3,y.add(o)}let b=(e,t=!1)=>{let n=new En,r=t?new q(.02,.02,.02):new No(.018),i=new K(r,new ai({color:e}));i.renderOrder=4,n.add(i);let a=new K(r,new ai({color:e,transparent:!0,opacity:.4,depthWrite:!1,blending:2}));a.scale.setScalar(1.9),a.renderOrder=4,n.add(a);let o=new K(new Io(.06,8,6),new ai({visible:!1}));n.add(o);let s=new Gi(new kr().setFromPoints([new W,new W(0,1,0)]),new Li({color:e,transparent:!0,opacity:.42}));n.add(s);let c=new K(new Fo(.02,.026,20),new ai({color:e,transparent:!0,opacity:.6,side:2,depthWrite:!1}));c.rotation.x=-Math.PI/2,c.renderOrder=3,n.add(c);let l=new K(new Fo(.032,.038,24),new ai({color:16777215,transparent:!0,opacity:.9,side:2,depthWrite:!1}));l.rotation.x=-Math.PI/2,l.visible=!1,l.renderOrder=3,n.add(l);let u=new Gi(new kr().setFromPoints([new W,new W]),new Li({color:e,transparent:!0,opacity:.8}));return u.renderOrder=3,u.visible=!t,n.add(u),n.visible=!1,g.add(n),{grp:n,core:i,halo:a,hit:o,stem:s,ringM:c,sel:l,vel:u}},x=Array.from({length:10},()=>b(Bf.hostile)),S=Array.from({length:12},()=>b(Bf.intc,!0)),C=Array.from({length:10},()=>{let e=new En,t=new ai({color:Bf.hostile,transparent:!0,opacity:.75,depthWrite:!1,side:2});for(let n of[Math.PI/4,-Math.PI/4]){let r=new K(new Po(.06,.01),t);r.rotation.set(-Math.PI/2,0,n),r.renderOrder=3,e.add(r)}let n=new K(new Fo(.03,.034,20),t);return n.rotation.x=-Math.PI/2,n.renderOrder=3,e.add(n),e.visible=!1,e.position.y=.003,g.add(e),{grp:e,mat:t}}),w=Array.from({length:12},()=>{let e=document.createElement(`canvas`);e.width=128,e.height=40;let t=e.getContext(`2d`),n=new ia(e);n.colorSpace=Ne;let r=new Yr(new Fr({map:n,transparent:!0,depthTest:!1,depthWrite:!1,opacity:.98}));return r.scale.set(.2,.062,1),r.renderOrder=10,r.visible=!1,g.add(r),{spr:r,lg:t,tex:n,key:``}});function T(e,t,n){let r=t+`|`+n;e.key!==r&&(e.key=r,e.lg.clearRect(0,0,128,40),e.lg.fillStyle=`rgba(2,10,9,0.8)`,e.lg.fillRect(10,4,108,32),e.lg.strokeStyle=`rgba(140,240,220,0.3)`,e.lg.strokeRect(10.5,4.5,107,31),e.lg.font=`bold 21px ${l}`,e.lg.textAlign=`center`,e.lg.textBaseline=`middle`,e.lg.fillStyle=n,e.lg.fillText(t,64,21),e.tex.needsUpdate=!0)}let E=Array.from({length:12},()=>{let e=new Gi(new kr().setFromPoints([new W,new W]),new Li({color:Bf.intc,transparent:!0,opacity:.28,depthWrite:!1}));return e.renderOrder=3,e.visible=!1,g.add(e),e}),D=Array.from({length:10},()=>{let e=new K(new Fo(.752,.778,10,1,-.16,.32),new ai({color:Bf.hostile,transparent:!0,opacity:.5,side:2,depthWrite:!1}));return e.rotation.x=-Math.PI/2,e.position.y=.0035,e.renderOrder=3,e.visible=!1,g.add(e),e}),O=new K(new Fo(.05,.057,32),new ai({color:16777215,transparent:!0,opacity:.8,side:2,depthWrite:!1}));O.rotation.x=-Math.PI/2,O.position.y=.005,O.renderOrder=3,O.visible=!1,g.add(O),e.events.on(`threat-spawned`,({threat:e})=>{i++;let t={id:`TK-`+Nd(i),threat:e,detected:!1,firstSeen:-1,classified:`SEARCHING`,quality:0,assignedBattery:null,engagedBy:0,history:[],lastPing:-99,gone:!1,outcome:null};n.push(t),r.set(e,t)});let k=(t,n)=>{let i=r.get(t);i&&(i.gone=!0,i.outcome=n,i.goneAt=e.time.now,a===i.id&&(a=null),r.delete(t))};e.events.on(`threat-destroyed`,({threat:e})=>k(e,`DESTROYED`)),e.events.on(`threat-impact`,({threat:e})=>k(e,`IMPACT`));let ee=0;function A(t,n){let r=t.threat;if(!t.detected)return;let i=e.time.now-t.firstSeen;t.quality=Cd(t.quality+n*.25,0,1),t.classified=r.isDecoy&&(i>11||r.pos.y<2600)?`DECOY (P)`:i>3?`BALLISTIC`:`ACQUIRING`}let j=(e,t)=>[258+e/Rf*214,256+t/Rf*214];function M(e,t,n,r,i,a=1.6){s.beginPath(),s.moveTo(e,t-n),s.lineTo(e+n,t),s.lineTo(e,t+n),s.lineTo(e-n,t),s.closePath(),r?(s.fillStyle=i,s.fill()):(s.strokeStyle=i,s.lineWidth=a,s.stroke())}function te(e,t,n,r,i=1.6){s.strokeStyle=r,s.lineWidth=i,s.beginPath(),s.moveTo(e-n,t-n),s.lineTo(e+n,t+n),s.moveTo(e+n,t-n),s.lineTo(e-n,t+n),s.stroke()}function N(e,t,n,r,i=1.4){let a=n*.45;s.strokeStyle=r,s.lineWidth=i,s.beginPath(),s.moveTo(e-n+a,t-n),s.lineTo(e-n,t-n),s.lineTo(e-n,t-n+a),s.moveTo(e+n-a,t-n),s.lineTo(e+n,t-n),s.lineTo(e+n,t-n+a),s.moveTo(e-n+a,t+n),s.lineTo(e-n,t+n),s.lineTo(e-n,t+n-a),s.moveTo(e+n-a,t+n),s.lineTo(e+n,t+n),s.lineTo(e+n,t+n-a),s.stroke()}function P(e,t,n,r,i){s.fillStyle=`rgba(3,17,11,0.96)`,s.fillRect(e,t,n,r),s.strokeStyle=`rgba(110,240,170,0.26)`,s.lineWidth=1,s.strokeRect(e+.5,t+.5,n-1,r-1),i&&(s.fillStyle=`rgba(125,240,172,0.66)`,s.font=`10px ${l}`,s.textAlign=`left`,s.fillText(i,e+9,t+14),s.strokeStyle=`rgba(110,240,170,0.18)`,s.beginPath(),s.moveTo(e+8,t+19.5),s.lineTo(e+n-8,t+19.5),s.stroke())}let ne=e=>e>=1e3?(e/1e3).toFixed(1)+`km`:Math.round(e)+`m`,F=(e,t)=>Math.round((Math.atan2(e,-t)*180/Math.PI+360)%360),I=0,L=.2,re=!1;function ie(){let t=e.time.now;m||(m=!0,s.fillStyle=`#020f0a`,s.fillRect(0,0,928,512)),s.textAlign=`left`,s.textBaseline=`alphabetic`,s.fillStyle=`rgba(2,15,10,0.22)`,s.fillRect(0,0,928,512),s.save(),s.beginPath(),s.arc(258,256,214,0,Z),s.clip(),s.fillStyle=`rgba(6,27,17,0.10)`,s.fillRect(44,42,428,428),s.restore(),s.lineWidth=1;for(let e=1;e<=4;e++)s.strokeStyle=e===4?`rgba(80,240,160,0.55)`:`rgba(60,220,140,0.26)`,s.beginPath(),s.arc(258,256,214*e/4,0,Z),s.stroke();s.strokeStyle=`rgba(80,240,160,0.30)`,s.beginPath(),s.arc(258,256,210,0,Z),s.stroke(),s.strokeStyle=`rgba(60,220,140,0.13)`;for(let e=0;e<12;e++){let t=e/12*Z;s.beginPath(),s.moveTo(258+Math.cos(t)*12,256+Math.sin(t)*12),s.lineTo(258+Math.cos(t)*214,256+Math.sin(t)*214),s.stroke()}s.strokeStyle=`rgba(80,240,160,0.5)`;for(let e=0;e<36;e++){let t=e/36*Z,n=e%9==0?10:5;s.beginPath(),s.moveTo(258+Math.cos(t)*(214-n),256+Math.sin(t)*(214-n)),s.lineTo(258+Math.cos(t)*214,256+Math.sin(t)*214),s.stroke()}s.strokeStyle=`rgba(159,243,200,0.8)`,s.beginPath(),s.moveTo(253,256),s.lineTo(263,256),s.moveTo(258,251),s.lineTo(258,261),s.stroke(),s.font=`10px ${l}`,s.textAlign=`center`;for(let e=0;e<360;e+=30){let t=e/180*Math.PI;s.fillStyle=e%90==0?`rgba(159,243,200,0.9)`:`rgba(140,240,180,0.5)`,s.fillText(String(e).padStart(3,`0`),258+Math.sin(t)*193,256-Math.cos(t)*193+3.5)}s.font=`10px ${l}`,s.textAlign=`left`,s.fillStyle=`rgba(140,240,180,0.55)`;for(let e=1;e<=4;e++){let t=214*e/4*.7071;s.fillText(`${(Rf*e/4/1e3).toFixed(1)}`,258+t+3,256-t+11)}s.fillText(`km`,412.3194,126.6806);let r=-(e.base?.radarHead?e.base.radarHead.rotation.y:0)+Math.PI/2;if(s.save(),s.beginPath(),s.arc(258,256,212,0,Z),s.clip(),s.globalCompositeOperation=`lighter`,s.translate(258,256),s.rotate(r),s.createConicGradient){let e=s.createConicGradient(0,0,0),t=1.45/Z;e.addColorStop(0,`rgba(110,255,175,0.30)`),e.addColorStop(t*.35,`rgba(90,245,160,0.115)`),e.addColorStop(t,`rgba(70,235,150,0)`),e.addColorStop(1,`rgba(70,235,150,0)`),s.fillStyle=e,s.beginPath(),s.arc(0,0,214,0,Z),s.fill()}else for(let e=0;e<10;e++)s.fillStyle=`rgba(90,245,160,${.16*(1-e/10)*(1-e/10)})`,s.beginPath(),s.moveTo(0,0),s.arc(0,0,214,e*.145,(e+1)*.145),s.closePath(),s.fill();s.strokeStyle=`rgba(190,255,215,0.55)`,s.lineWidth=2,s.beginPath(),s.moveTo(6,0),s.lineTo(214,0),s.stroke(),s.strokeStyle=`rgba(255,255,255,0.18)`,s.lineWidth=4,s.beginPath(),s.moveTo(16,0),s.lineTo(214,0),s.stroke(),s.restore(),s.save(),s.beginPath(),s.arc(258,256,210,0,Z),s.clip(),s.globalCompositeOperation=`lighter`;for(let e of h){let n=.7+.3*Math.sin(t*1.7+e.ph);s.strokeStyle=`rgba(90,235,150,${(e.o*n).toFixed(3)})`,s.lineWidth=e.l*.35,s.beginPath(),s.arc(258,256,e.d,e.a,e.a+e.w),s.stroke()}if(e.vrng)for(let t=0;t<46;t++){let t=e.vrng.next()*Z,n=Math.sqrt(e.vrng.next())*206;s.fillStyle=`rgba(120,255,180,${(e.vrng.next()*.11).toFixed(3)})`,s.fillRect(258+Math.cos(t)*n,256+Math.sin(t)*n,1.6,1.6)}if(s.restore(),s.strokeStyle=`#9ff3c8`,s.lineWidth=1.2,s.strokeRect(254,252,8,8),e.batteries?.list){s.font=`bold 10px ${l}`;for(let t of e.batteries.list){let e=t.rig.group.position,n=Math.hypot(e.x,e.z)||1,r=Math.max(n/Rf*214,21),i=258+e.x/n*r,a=256+e.z/n*r,o=t.displayState;s.fillStyle=o===`READY`?`rgba(142,240,180,0.95)`:o===`EMPTY`?`rgba(255,106,85,0.95)`:`rgba(255,210,87,0.95)`,s.beginPath(),s.moveTo(i,a-4.6),s.lineTo(i+4.2,a+3.4),s.lineTo(i-4.2,a+3.4),s.closePath(),s.fill(),s.fillText(t.def.name[0],i+6,a+3)}}let i=a?n.find(e=>e.id===a&&!e.gone):null;for(let e of n){if(e.gone||!e.detected)continue;let n=e.threat,[r,o]=j(n.pos.x,n.pos.z),c=e.classified.startsWith(`DECOY`),u=c?Vf.decoy:e.assignedBattery?Vf.assigned:Vf.hostile;for(let n of e.history){let e=t-(n[2]??t),r=Math.max(0,1-e/14)*.34;if(r<=.01)continue;let[i,a]=j(n[0],n[1]);s.fillStyle=`rgba(130,255,180,${r.toFixed(3)})`,s.fillRect(i-1,a-1,2,2)}let d=Uf(n.pos,n.vel);if(Math.hypot(d.x,d.z)<Rf){let[t,n]=j(d.x,d.z);te(t,n,4.4,c?`rgba(201,166,255,0.6)`:`rgba(255,140,110,0.8)`,1.4),s.strokeStyle=c?`rgba(201,166,255,0.35)`:`rgba(255,140,110,0.45)`,s.lineWidth=1,s.beginPath(),s.arc(t,n,7.5,0,Z),s.stroke(),e===i&&(s.setLineDash([3,5]),s.strokeStyle=`rgba(255,255,255,0.30)`,s.beginPath(),s.moveTo(r,o),s.lineTo(t,n),s.stroke(),s.setLineDash([]))}let f=Math.hypot(n.vel.x,n.vel.z);if(f>1){let e=Cd(f*.045,9,34);s.strokeStyle=u,s.lineWidth=1.6,s.beginPath(),s.moveTo(r,o),s.lineTo(r+n.vel.x/f*e,o+n.vel.z/f*e),s.stroke()}if(s.save(),s.shadowColor=u,s.shadowBlur=9,M(r,o,6.5,!c,u,1.8),s.restore(),s.font=`bold 15px ${l}`,s.textAlign=`left`,s.fillStyle=`#eafff2`,s.fillText(e.id,r+11,o-5),s.font=`11px ${l}`,s.fillStyle=`rgba(215,255,232,0.72)`,s.fillText(`${(n.pos.y/1e3).toFixed(1)}km ${c?`◇`:`◆`}`,r+11,o+9),e.id===a){s.strokeStyle=`#ffffff`,s.lineWidth=1.6,s.beginPath(),s.arc(r,o,12.5,0,Z),s.stroke(),s.beginPath();for(let e=0;e<4;e++){let n=e/4*Z+t*.9;s.moveTo(r+Math.cos(n)*12.5,o+Math.sin(n)*12.5),s.lineTo(r+Math.cos(n)*17,o+Math.sin(n)*17)}s.stroke()}e.assignedBattery&&N(r,o,11,Vf.assigned,1.6)}for(let t of e.interceptors?.active??[]){let[e,n]=j(t.pos.x,t.pos.z);if(t.threat?.alive){let[r,i]=j(t.threat.pos.x,t.threat.pos.z);s.strokeStyle=`rgba(55,224,255,0.30)`,s.lineWidth=1,s.setLineDash([2,4]),s.beginPath(),s.moveTo(e,n),s.lineTo(r,i),s.stroke(),s.setLineDash([])}s.save(),s.shadowColor=Vf.intc,s.shadowBlur=7,s.fillStyle=Vf.intc,s.fillRect(e-3,n-3,6,6),s.restore(),s.font=`10px ${l}`,s.fillStyle=`rgba(55,224,255,0.75)`,s.fillText(t.id,e+6,n-4)}let o=n.filter(e=>!e.gone&&e.detected);if(s.font=`bold 17px ${l}`,s.textAlign=`left`,s.fillStyle=`#baf7d4`,s.fillText(`IVX-9 SURVEILLANCE`,520,40),t%1<.55&&(s.fillStyle=`rgba(186,247,212,0.8)`,s.fillRect(752,28,8,13)),s.font=`11px ${l}`,s.fillStyle=`rgba(186,247,212,0.66)`,s.fillText(`MODE TBM · RNG ${(Rf/1e3).toFixed(0)} KM · SWP 8.1 RPM`,520,58),s.strokeStyle=`rgba(110,240,170,0.3)`,s.beginPath(),s.moveTo(520,68.5),s.lineTo(914,68.5),s.stroke(),P(520,78,394,100,`BATTERIES`),e.batteries?.list){let t=100;for(let n of e.batteries.list){let e=n.displayState,r=e===`READY`?Vf.phos:e===`EMPTY`?Vf.hostile:Vf.assigned;s.fillStyle=r,s.beginPath(),s.moveTo(535,t-4.5),s.lineTo(539,t+3),s.lineTo(531,t+3),s.closePath(),s.fill(),s.font=`bold 12px ${l}`,s.fillStyle=`#d9ffe9`,s.fillText(n.def.name,547,t+4),s.font=`11px ${l}`,s.fillStyle=r,s.fillText(e+(e===`RELOADING`?` ${Math.ceil(Math.max(0,n.readyIn))}s`:``),670,t+4),s.textAlign=`right`,s.fillStyle=`rgba(142,240,180,0.8)`,s.fillText(`▮`.repeat(n.ammo)+`▯`.repeat(Math.max(0,n.def.ammo-n.ammo)),904,t+4),s.textAlign=`left`,t+=26}}if(P(520,186,394,148,`TRACK DATA`),i){let e=i.threat,t=i.classified.startsWith(`DECOY`),n=t?Vf.decoy:i.assignedBattery?Vf.assigned:Vf.hostile;s.font=`bold 20px ${l}`,s.fillStyle=n,s.fillText(`${t?`◇`:`◆`} ${i.id}`,532,218),s.font=`bold 12px ${l}`,s.fillText(i.classified,650,218),s.strokeStyle=`rgba(142,240,180,0.4)`,s.strokeRect(782.5,206.5,112,9),s.fillStyle=`rgba(142,240,180,0.75)`,s.fillRect(784,208,109*Cd(i.quality,.05,1),6),s.font=`9px ${l}`,s.fillStyle=`rgba(142,240,180,0.6)`,s.fillText(`TRK QUAL`,782,202);let r=Uf(e.pos,e.vel),a=[[`ALT`,ne(e.pos.y)],[`RNG`,ne(Math.hypot(e.pos.x,e.pos.z))],[`SPD`,`${Math.round(e.vel.length())}m/s`],[`BRG`,`${Nd(F(e.pos.x,e.pos.z))}°`.padStart(4,`0`)],[`TTI`,`${Math.max(0,r.t).toFixed(0)}s`],[`V/S`,`${Math.round(e.vel.y)}m/s`]];s.font=`12px ${l}`;for(let e=0;e<a.length;e++){let t=532+e%2*190,n=244+Math.floor(e/2)*22;s.fillStyle=`rgba(142,240,180,0.55)`,s.fillText(a[e][0],t,n),s.fillStyle=`#eafff2`,s.fillText(a[e][1],t+44,n)}s.font=`11px ${l}`,i.assignedBattery?(s.fillStyle=Vf.assigned,s.fillText(`ASSIGNED → ${i.assignedBattery.toUpperCase()}`,532,322)):(s.fillStyle=`rgba(142,240,180,0.5)`,s.fillText(`NOT ASSIGNED`,532,322)),i.engagedBy>0&&(s.fillStyle=Vf.intc,s.fillText(`ENGAGED ×${i.engagedBy}`,722,322))}else{s.font=`12px ${l}`,s.fillStyle=`rgba(142,240,180,0.45)`,s.fillText(`NO TRACK SELECTED`,532,214),s.font=`11px ${l}`,s.fillText(`SELECT FROM LIST OR TAP A HOLO BLIP`,532,232);let e=0,t=0,n=1/0,r=null;for(let i of o){if(i.classified.startsWith(`DECOY`)){t++;continue}e++;let a=Uf(i.threat.pos,i.threat.vel);a.t<n&&(n=a.t,r=i.id)}s.strokeStyle=`rgba(110,240,170,0.18)`,s.beginPath(),s.moveTo(530,246.5),s.lineTo(904,246.5),s.stroke(),s.font=`11px ${l}`,s.fillStyle=`rgba(142,240,180,0.55)`,s.fillText(`RAID SUMMARY`,532,266),s.font=`12px ${l}`,s.fillStyle=o.length?`#eafff2`:`rgba(142,240,180,0.5)`,s.fillText(`HOSTILE ${Nd(e)} · DECOY(P) ${Nd(t)}`,532,288),r==null?(s.fillStyle=`rgba(142,240,180,0.5)`,s.fillText(`NO PREDICTED IMPACTS`,532,308)):(s.fillStyle=n<20?Vf.hostile:`#eafff2`,s.fillText(`FIRST IMPACT ${r} T-${Math.max(0,n).toFixed(0)}s`,532,308))}P(520,342,394,74,`SYMBOLOGY`),s.font=`10px ${l}`,M(538,369,5,!0,Vf.hostile),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`HOSTILE`,548,372),M(626,369,5,!1,Vf.decoy,1.4),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`DECOY`,636,372),s.fillStyle=Vf.intc,s.fillRect(704,364,6,6),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`INTCPT`,714,372),te(782,369,4,`rgba(255,140,110,0.85)`,1.3),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`PRED IMPACT`,792,372),N(538,392,7,Vf.assigned,1.3),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`ASSIGNED`,552,396),s.strokeStyle=`#fff`,s.lineWidth=1.2,s.beginPath(),s.arc(634,392,6,0,Z),s.stroke(),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`SELECTED`,646,396),s.fillStyle=`rgba(130,255,180,0.5)`,s.fillRect(730,387,2,2),s.fillRect(735,389,2,2),s.fillRect(740,391,2,2),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`HISTORY`,748,396);let u=e.interceptors?.active.length??0,d=Math.floor(t/60),f=Math.floor(t%60);s.font=`bold 13px ${l}`,s.fillStyle=o.length?`#ffd257`:`rgba(186,247,212,0.75)`,s.fillText(`TRACKS ${Nd(o.length)}`,520,442),s.fillStyle=u?Vf.intc:`rgba(186,247,212,0.45)`,s.fillText(`IN FLIGHT ${Nd(u)}`,638,442),s.fillStyle=`rgba(186,247,212,0.6)`,s.fillText(`SIM ${Nd(d)}:${Nd(f)}`,778,442),s.font=`10px ${l}`,s.fillStyle=`rgba(140,240,180,0.4)`,s.fillText(`GAIN ▮▮▮▮▯ · MTI ON · CFAR AUTO`,520,462),s.font=`10px ${l}`,s.fillStyle=`rgba(140,240,180,0.5)`,s.fillText(`PPI-1 · NORTH-UP`,26,34),s.drawImage(p,0,0),c.needsUpdate=!0}function ae(e,t,n,r,i){e.textAlign=`left`,e.textBaseline=`alphabetic`,e.fillStyle=`#04100a`,e.fillRect(0,0,t,n),e.fillStyle=`rgba(12,42,24,0.95)`,e.fillRect(0,0,t,26),e.font=`bold 13px ${l}`,e.fillStyle=`#7deca8`,e.fillText(r,10,18),i&&(e.textAlign=`right`,e.font=`11px ${l}`,e.fillStyle=`rgba(125,236,168,0.7)`,e.fillText(i,t-10,18),e.textAlign=`left`)}function R(e){let{a:t,w:n,h:r}=e;t.fillStyle=`rgba(0,0,0,0.13)`;for(let e=2;e<r;e+=3)t.fillRect(0,e,n,1);let i=t.createRadialGradient(n/2,r/2,r*.35,n/2,r/2,r*.95);i.addColorStop(0,`rgba(0,0,0,0)`),i.addColorStop(1,`rgba(0,0,0,0.34)`),t.fillStyle=i,t.fillRect(0,0,n,r),t.strokeStyle=`rgba(110,240,170,0.2)`,t.strokeRect(.5,.5,n-1,r-1),e.tex.needsUpdate=!0}let oe=()=>{let t=51720+Math.floor(e.time.now);return`${Nd(Math.floor(t/3600)%24)}${Nd(Math.floor(t/60)%60)}:${Nd(t%60)}Z`};function se(){if(!d)return;let{a:t,w:n,h:r}=d,i=e.time.now;ae(t,n,r,`WEAPONS STATUS — BTRY NET`,oe());let a=e.batteries?.list??[],o=60;for(let e of a){let r=e.displayState,a=r===`READY`?`#57e389`:r===`EMPTY`?`#ff6a55`:`#ffd257`;t.font=`bold 16px ${l}`,t.fillStyle=`#d9ffe9`,t.fillText(e.def.name.toUpperCase(),14,o),t.fillStyle=a,t.fillRect(n-168,o-12,9,9),r!==`READY`&&i%1<.5&&(t.fillStyle=`rgba(0,0,0,0.55)`,t.fillRect(n-168,o-12,9,9)),t.fillStyle=a,t.font=`bold 13px ${l}`,t.fillText(r+(r===`RELOADING`?` ${Math.ceil(Math.max(0,e.readyIn))}s`:``),n-150,o-2),t.font=`10px ${l}`,t.fillStyle=`rgba(125,236,168,0.55)`,t.fillText(`RDY MSL`,14,o+18);let s=Math.max(0,e.def.ammo);for(let n=0;n<s;n++)t.fillStyle=n<e.ammo?`#4ede84`:`rgba(52,84,64,0.7)`,t.fillRect(76+n*15,o+8,10,13);if(r===`RELOADING`&&e.def.reloadTime){let r=Cd(1-e.readyIn/e.def.reloadTime,0,1);t.strokeStyle=`rgba(255,210,87,0.5)`,t.strokeRect(n-168.5,o+8.5,120,11),t.fillStyle=`rgba(255,210,87,0.75)`,t.fillRect(n-166,o+10.5,116*r,7)}t.strokeStyle=`rgba(110,240,170,0.14)`,t.beginPath(),t.moveTo(10,o+30.5),t.lineTo(n-10,o+30.5),t.stroke(),o+=52}{let r=a.reduce((e,t)=>e+t.ammo,0),s=a.reduce((e,t)=>e+t.def.ammo,0);t.strokeStyle=`rgba(110,240,170,0.22)`,t.beginPath(),t.moveTo(10,o-16.5),t.lineTo(n-10,o-16.5),t.stroke(),t.font=`11px ${l}`,t.fillStyle=`rgba(125,236,168,0.62)`,t.fillText(`INVENTORY`,14,o+2),t.font=`bold 13px ${l}`,t.fillStyle=r===0?`#ff6a55`:r<=s*.25?`#ffd257`:`#d9ffe9`,t.fillText(`${r}/${s} MSL`,100,o+2),t.font=`11px ${l}`,t.fillStyle=`rgba(125,236,168,0.62)`,t.fillText(`GEN LOAD`,200,o+2);let c=.54+.1*Math.sin(i*.7)+(e.interceptors?.active.length??0)*.04;t.strokeStyle=`rgba(125,236,168,0.4)`,t.strokeRect(272.5,o-8.5,90,10),t.fillStyle=c>.85?`#ffd257`:`rgba(87,227,137,0.7)`,t.fillRect(274,o-6.5,87*Cd(c,0,1),6),t.fillStyle=`rgba(125,236,168,0.75)`,t.fillText(`${Math.round(c*100)}%`,372,o+2),t.fillText(`COOLANT NOMINAL`,14,o+22),t.fillText(`DECON: CLEAR`,200,o+22)}t.fillStyle=`rgba(12,42,24,0.95)`,t.fillRect(0,r-26,n,26),t.font=`bold 12px ${l}`,t.fillStyle=`#ffd257`,t.fillText(`ROE: WEAPONS TIGHT`,10,r-8),t.fillStyle=i%1.6<1.25?`#57e389`:`rgba(87,227,137,0.3)`,t.fillText(`● DL-16 LINK`,210,r-8),t.fillStyle=`rgba(125,236,168,0.7)`,t.fillText(`RADIATE ON · T+${Nd(Math.floor(i/60))}:${Nd(Math.floor(i%60))}`,330,r-8),R(d)}function ce(){if(!f)return;let{a:t,w:r,h:i}=f,a=e.time.now;ae(t,r,i,`ENGAGEMENT QUEUE`,Nd(n.filter(e=>!e.gone&&e.detected).length));let o=n.filter(e=>!e.gone&&e.detected);t.font=`10px ${l}`,t.fillStyle=`rgba(125,236,168,0.55)`,t.fillText(`TRK`,12,42),t.fillText(`TTI`,84,42),t.fillText(`BTRY`,140,42),t.fillText(`STATUS`,226,42),t.strokeStyle=`rgba(110,240,170,0.18)`,t.beginPath(),t.moveTo(10,47.5),t.lineTo(r-10,47.5),t.stroke();let s=64;for(let e of o.slice(0,7)){let n=e.threat,r=Uf(n.pos,n.vel),i=e.classified.startsWith(`DECOY`),a=i?Vf.decoy:e.assignedBattery?Vf.assigned:Vf.hostile;t.font=`bold 12px ${l}`,t.fillStyle=a,t.fillText(e.id,12,s),t.font=`12px ${l}`,t.fillStyle=`#d9ffe9`,t.fillText(`${Math.max(0,r.t).toFixed(0)}s`,84,s),t.fillText(e.assignedBattery?e.assignedBattery.toUpperCase().slice(0,8):`——`,140,s);let o=e.engagedBy>0?`INTC×${e.engagedBy}`:e.assignedBattery?`ASSIGNED`:i?`MONITOR`:`TRACK`;t.fillStyle=e.engagedBy>0?Vf.intc:a,t.fillText(o,226,s),s+=22}o.length||(t.font=`bold 13px ${l}`,t.fillStyle=`rgba(125,236,168,0.6)`,t.fillText(`NO ACTIVE ENGAGEMENTS`,14,84),t.font=`11px ${l}`,t.fillText(`SURVEILLANCE SWEEP NOMINAL`,14,106),a%2<1.4&&t.fillText(`▮`,218,106));let c=e.interceptors?.active.length??0;t.fillStyle=`rgba(12,42,24,0.95)`,t.fillRect(0,i-24,r,24),t.font=`bold 11px ${l}`,t.fillStyle=c?Vf.intc:`rgba(125,236,168,0.6)`,t.fillText(`IN FLIGHT ${Nd(c)}`,10,i-8),t.fillStyle=`rgba(125,236,168,0.65)`,t.fillText(`SHOOT-LOOK-SHOOT`,250,i-8),R(f)}let le=new W;function ue(){let t=e.time.now;y.rotation.y=(e.base?.radarHead?.rotation.y??0)-Math.PI/2;let r=0,i=null;for(let e of n){if(e.gone||!e.detected||r>=x.length)continue;let n=r,o=x[r++],s=e.threat,c=Cd(s.pos.x*_,-.8,.8),l=Cd(s.pos.z*_,-.8,.8),u=Cd(s.pos.y*v,0,.85);o.grp.visible=!0,o.grp.position.set(c,0,l),o.core.position.y=u,o.halo.position.y=u,o.halo.scale.setScalar(1.9+Math.sin(t*4+n*1.7)*.35),o.hit.position.y=u,o.stem.scale.set(1,Math.max(u,.001),1);let d=e.classified.startsWith(`DECOY`),f=d?Bf.decoy:e.assignedBattery?Bf.assigned:Bf.hostile;o.core.material.color.setHex(f),o.core.material.wireframe=d,o.halo.material.color.setHex(f),o.stem.material.color.setHex(f),o.ringM.material.color.setHex(f),o.ringM.material.opacity=.3+e.quality*.45,o.sel.visible=e.id===a,o.sel.visible&&(i=o.grp.position),o.hit.userData.trackId=e.id,o.core.userData.trackId=e.id;let p=Math.hypot(s.vel.x,s.vel.z);if(p>1){le.set(s.vel.x/p,0,s.vel.z/p);let e=Cd(p*16e-5,.035,.13),t=o.vel.geometry.attributes.position;t.setXYZ(0,le.x*.03,.004,le.z*.03),t.setXYZ(1,le.x*(.03+e),.004,le.z*(.03+e)),t.needsUpdate=!0,o.vel.material.color.setHex(f),o.vel.visible=!0}else o.vel.visible=!1;let m=C[n],h=Uf(s.pos,s.vel),g=h.x*_,y=h.z*_,b=Math.hypot(g,y),S=b>.78;if(S&&(g*=.78/b,y*=.78/b),m.grp.visible=!0,m.grp.position.set(g,.003,y),m.mat.color.setHex(d?Bf.decoy:e.assignedBattery?Bf.assigned:Bf.hostile),m.mat.opacity=(S?.25:.68)+Math.sin(t*3.2+n)*.14,n<w.length){let t=w[n],r=d?Vf.decoy:e.assignedBattery?Vf.assigned:`#ffd7cf`;T(t,`${d?`◇`:`◆`} ${e.id}`,r),t.spr.position.set(c,u+.075,l),t.spr.visible=!0}let E=D[n];E.visible=!d,E.visible&&(E.material.color.setHex(e.assignedBattery?Bf.assigned:Bf.hostile),E.material.opacity=.42+.18*Math.sin(t*3.1+n*2.3),E.rotation.z=Math.atan2(-s.pos.z,s.pos.x))}for(let e=r;e<x.length;e++)x[e].grp.visible=!1,C[e].grp.visible=!1,D[e].visible=!1;for(let e=r;e<w.length;e++)w[e].spr.visible=!1;if(i){let e=t%1.4/1.4;O.visible=!0,O.position.set(i.x,.005,i.z),O.scale.setScalar(.85+e*1.15),O.material.opacity=.85*(1-e)}else O.visible=!1;let o=0;for(let t of e.interceptors?.active??[]){if(o>=S.length)break;let e=o,n=S[o++],r=Cd(t.pos.x*_,-.8,.8),i=Cd(t.pos.z*_,-.8,.8),a=Cd(t.pos.y*v,0,.85);n.grp.visible=!0,n.grp.position.set(r,0,i),n.core.position.y=a,n.halo.position.y=a,n.hit.position.y=a,n.stem.scale.set(1,Math.max(a,.001),1);let s=E[e];if(t.threat?.alive){let e=t.threat.pos,n=s.geometry.attributes.position;n.setXYZ(0,r,a,i),n.setXYZ(1,Cd(e.x*_,-.8,.8),Cd(e.y*v,0,.85),Cd(e.z*_,-.8,.8)),n.needsUpdate=!0,s.visible=!0}else s.visible=!1}for(let e=o;e<S.length;e++)S[e].grp.visible=!1,E[e].visible=!1}return se(),ce(),{tracks:n,screenTex:c,holo:g,get selectedTrackId(){return a},selectTrack(t){a=t,e.events.emit(`track-selected`,{id:t})},trackFor(e){return r.get(e)},getTrack(e){return n.find(t=>t.id===e&&!t.gone)},activeTracks(){return n.filter(e=>!e.gone&&e.detected)},pickTrack(e){let t=[];for(let e of x)e.grp.visible&&t.push(e.hit);let n=e.intersectObjects(t,!1);return n.length?n[0].object.userData.trackId:null},clear(){n.length=0,r.clear(),i=0,a=null},update(t){let r=e.base?.radarHead?e.base.radarHead.rotation.y%Z:0;for(let i of n){if(i.gone)continue;let n=i.threat;if(n.alive){if(i.detected)A(i,t),e.time.now-i.lastPing>1.2&&(i.lastPing=e.time.now,i.history.push([n.pos.x,n.pos.z,e.time.now]),i.history.length>10&&i.history.shift());else if(Math.hypot(n.pos.x,n.pos.z)<Rf){let t=Math.atan2(n.pos.x,n.pos.z),a=Dd(t-ee),o=Dd(t-r);a>=0&&o<=0&&a-o<1.2&&(i.detected=!0,i.firstSeen=e.time.now,i.classified=`ACQUIRING`,e.events.emit(`threat-tracked`,{track:i}))}}}ee=r;for(let t=n.length-1;t>=0;t--)n[t].gone&&e.time.now-n[t].goneAt>6&&n.splice(t,1);I+=t,I>.08&&(I=0,ie()),L+=t,L>.26&&(L=0,re=!re,re?se():ce()),ue()}}}function Gf(e){let t=null,n=null,r=!1,i=!1,a=null,o=null;function s(){if(t||r)return!!t;try{t=new(window.AudioContext||window.webkitAudioContext),n=t.createDynamicsCompressor(),n.threshold.value=-18,n.knee.value=22,n.ratio.value=8;let r=t.createGain();return r.gain.value=e.settings.volume,n.connect(r),r.connect(t.destination),w._volNode=r,!0}catch{return!1}}function c(e=2,n=!1){let r=Math.floor(t.sampleRate*e),i=t.createBuffer(1,r,t.sampleRate),a=i.getChannelData(0),o=0;for(let e=0;e<r;e++){let t=Math.random()*2-1;n?(o=o*.96+t*.04,a[e]=o*6):a[e]=t}return i}let l=null,u=null,d=()=>l??=c(2,!1),f=()=>u??=c(3,!0);function p(t,n,r=60){let i=t?t.distanceTo(e.camera.position):0;return{gain:n*Cd(r/Math.max(i,r),.04,1),delay:Cd(i/340,0,8)}}function m(e,t,n,r,i,a=1e-4){e.gain.setValueAtTime(1e-4,t),e.gain.linearRampToValueAtTime(r,t+n),e.gain.exponentialRampToValueAtTime(Math.max(a,1e-4),t+n+i)}function h(e,r=1){if(!s())return;let{gain:i,delay:a}=p(e,.9*r,120),o=t.currentTime+a,c=t.createOscillator();c.type=`sine`,c.frequency.setValueAtTime(Cd(90*r,40,120),o),c.frequency.exponentialRampToValueAtTime(30,o+.9);let l=t.createGain();m(l,o,.005,i*.9,1.1),c.connect(l),l.connect(n),c.start(o),c.stop(o+1.4);let u=t.createBufferSource();u.buffer=d();let f=t.createBiquadFilter();f.type=`lowpass`,f.frequency.setValueAtTime(Cd(3200*r,800,5200),o),f.frequency.exponentialRampToValueAtTime(140,o+1.6);let h=t.createGain();m(h,o,.004,i,1.8),u.connect(f),f.connect(h),h.connect(n),u.start(o),u.stop(o+2.2)}function g(e,r=1){if(!s())return;let{gain:i,delay:a}=p(e,.75*r,90),o=t.currentTime+a,c=t.createBufferSource();c.buffer=f(),c.loop=!0;let l=t.createBiquadFilter();l.type=`bandpass`,l.frequency.setValueAtTime(160,o),l.frequency.exponentialRampToValueAtTime(900,o+.7),l.frequency.exponentialRampToValueAtTime(220,o+3.2),l.Q.value=.8;let u=t.createGain();u.gain.setValueAtTime(1e-4,o),u.gain.linearRampToValueAtTime(i,o+.25),u.gain.setValueAtTime(i,o+1.6),u.gain.exponentialRampToValueAtTime(1e-4,o+4.2),c.connect(l),l.connect(u),u.connect(n),c.start(o),c.stop(o+4.4);let h=t.createBufferSource();h.buffer=d();let g=t.createBiquadFilter();g.type=`highpass`,g.frequency.value=1800;let _=t.createGain();m(_,o,.02,i*.4,2.4),h.connect(g),g.connect(_),_.connect(n),h.start(o),h.stop(o+2.6)}function _(e=880,r=.09,i=.14,a=`square`){if(!s())return;let o=t.currentTime,c=t.createOscillator();c.type=a,c.frequency.value=e;let l=t.createGain();m(l,o,.005,i,r),c.connect(l),l.connect(n),c.start(o),c.stop(o+r+.1)}function v(e=3){if(!s())return;let r=t.currentTime;for(let i=0;i<e;i++){let e=t.createOscillator();e.type=`sawtooth`;let a=t.createGain(),o=r+i*.62;e.frequency.setValueAtTime(620,o),e.frequency.linearRampToValueAtTime(440,o+.42),a.gain.setValueAtTime(1e-4,o),a.gain.linearRampToValueAtTime(.16,o+.03),a.gain.setValueAtTime(.16,o+.4),a.gain.exponentialRampToValueAtTime(1e-4,o+.55);let s=t.createBiquadFilter();s.type=`lowpass`,s.frequency.value=2200,e.connect(s),s.connect(a),a.connect(n),e.start(o),e.stop(o+.6)}}function y(){if(!s())return;let e=t.currentTime,r=t.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(1240,e),r.frequency.exponentialRampToValueAtTime(880,e+.18);let i=t.createGain();m(i,e,.004,.1,.3),r.connect(i),i.connect(n),r.start(e),r.stop(e+.4)}function b(e){if(!s())return;let r=t.currentTime,i=t.createBufferSource();i.buffer=d(),i.playbackRate.value=.6+Math.random()*.25;let a=t.createBiquadFilter();a.type=`lowpass`,a.frequency.value=340+Math.random()*160;let o=t.createGain();m(o,r,.003,e?.11:.07,.09),i.connect(a),a.connect(o),o.connect(n),i.start(r),i.stop(r+.16)}function x(e,r){if(!s())return;let{gain:i,delay:a}=p(e,Cd(r/900,.2,.7),50),o=t.currentTime+a,c=t.createBufferSource();c.buffer=d();let l=t.createBiquadFilter();l.type=`bandpass`,l.frequency.setValueAtTime(2400,o),l.frequency.exponentialRampToValueAtTime(320,o+.8),l.Q.value=1.4;let u=t.createGain();m(u,o,.12,i,.7),c.connect(l),l.connect(u),u.connect(n),c.start(o),c.stop(o+1.1)}function S(){if(!s()||i)return;i=!0;let e=t.createBufferSource();e.buffer=f(),e.loop=!0,o=t.createBiquadFilter(),o.type=`bandpass`,o.frequency.value=300,o.Q.value=.4,a=t.createGain(),a.gain.value=.05,e.connect(o),o.connect(a),a.connect(n),e.start();let r=t.createOscillator();r.type=`sawtooth`,r.frequency.value=55;let c=t.createBiquadFilter();c.type=`lowpass`,c.frequency.value=180;let l=t.createGain();l.gain.value=0,r.connect(c),c.connect(l),l.connect(n),r.start(),w._humG=l}e.events.on(`fx-launch`,({pos:e,scale:t})=>g(e,t)),e.events.on(`fx-explosion`,({pos:e,scale:t})=>h(e,t)),e.events.on(`footstep`,({sprint:e})=>b(e)),e.events.on(`threat-tracked`,()=>{y()}),e.events.on(`scenario-started`,()=>v(3)),e.events.on(`threat-impact`,({onBase:e})=>{e&&v(2)}),e.events.on(`track-assigned`,()=>_(980,.07,.12)),e.events.on(`launch-authorized`,()=>{_(760,.09),setTimeout(()=>_(760,.09),140)}),e.events.on(`intercept-success`,()=>{_(1180,.1,.14,`sine`),setTimeout(()=>_(1560,.14,.14,`sine`),130)}),e.events.on(`intercept-miss`,()=>_(300,.3,.13,`sawtooth`)),e.events.on(`ui-click`,()=>_(1320,.04,.07,`sine`));let C=0,w={get muted(){return r},setMuted(t){r=t,w._volNode&&(w._volNode.gain.value=t?0:e.settings.volume)},setVolume(t){e.settings.volume=t,w._volNode&&!r&&(w._volNode.gain.value=t)},unlock(){s()&&(t.state===`suspended`&&t.resume().catch(()=>{}),S())},beep:_,klaxon:v,radarPing:y,boom:h,launchRoar:g,update(n){if(!t||!i)return;let r=e.world.wind.length();if(a&&(a.gain.value=Cd(.03+r*.012,.02,.14)),o&&(o.frequency.value=240+r*30),w._humG&&e.base?.generators?.length){let t=1e9;for(let n of e.base.generators)t=Math.min(t,n.position.distanceTo(e.camera.position));w._humG.gain.value=Cd(14/Math.max(t,6)*.09,0,.09)}if(C-=n,C<=0){for(let t of e.interceptors?.active??[])if(t.pos.distanceTo(e.camera.position)<320&&t.vel.length()>250){x(t.pos,t.vel.length()),C=1.4;break}}}};return w}var Kf=(e,t,n)=>{let r=document.createElement(e);return t&&(r.className=t),n!==void 0&&(r.innerHTML=n),r},qf={hostile:`◆`,decoy:`◇`,interceptor:`■`},Jf={good:`✓`,bad:`✗`,warn:`▲`,info:`◆`},Yf={good:`✓ `,bad:`✗ `,warn:`◆ `};function Xf(e){let t=Kf(`div`);t.id=`hud`,document.body.appendChild(t),t.innerHTML=`
    <div id="threat-board" class="hud-panel"><h3>AIR PICTURE</h3><div id="threat-rows"></div></div>
    <div id="battery-board"></div>
    <div id="crosshair"></div>
    <div id="aim-bracket" aria-hidden="true">
      <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
      <span class="ab-id"></span><span class="ab-data"></span>
    </div>
    <div id="target-prompt"></div>
    <div id="feed" role="log" aria-label="Event feed"></div>
    <div id="status-strip"></div>
    <div id="keyhelp">
      <b>WASD</b> move &nbsp;<b>SHIFT</b> sprint &nbsp;<b>E</b> assign &nbsp;<b>F</b> fire / salvo<br/>
      <b>Q</b> tablet &nbsp;<b>V</b> missile cam &nbsp;<b>1·2·3</b> battery &nbsp;<b>TAB</b> console &nbsp;<b>H</b> settings
    </div>
    <div id="banner" aria-live="polite"></div>
    <div id="impact-flash"></div>
  `;let n=t.querySelector(`#threat-rows`),r=t.querySelector(`#battery-board`),i=t.querySelector(`#target-prompt`),a=t.querySelector(`#feed`),o=t.querySelector(`#status-strip`),s=t.querySelector(`#banner`),c=t.querySelector(`#impact-flash`),l=t.querySelector(`#aim-bracket`),u=l.querySelector(`.ab-id`),d=l.querySelector(`.ab-data`),f=Kf(`div`);f.id=`console-panel`,f.setAttribute(`role`,`dialog`),f.setAttribute(`aria-label`,`Fire direction console`),f.innerHTML=`
    <header>
      <div>
        <div class="title">FIRE DIRECTION CENTER — IRONVEIL RANGE</div>
        <div class="subtitle">FICTIONAL TRAINING DEMO · ALL PARAMETERS SIMULATED</div>
      </div>
      <button id="btn-exit-console" aria-label="Exit console (Tab)">EXIT [TAB]</button>
    </header>
    <div class="console-grid">
      <div class="console-section">
        <h4>CONDITIONS</h4>
        <div class="opt-row" id="opt-time" role="group" aria-label="Time of day"></div>
      </div>
      <div class="console-section">
        <h4>THREAT SCENARIO</h4>
        <div class="opt-row" id="opt-scenario" role="group" aria-label="Threat scenario"></div>
      </div>
      <div class="console-section">
        <h4>BATTERY SELECT</h4>
        <div class="opt-row" id="opt-battery" role="group" aria-label="Battery select"></div>
        <button id="btn-start" aria-label="Start scenario">▶ START BALLISTIC MISSILES</button>
      </div>
      <div class="console-section">
        <h4>ENGAGEMENT — SELECT TRACK ON DISPLAY OR LIST</h4>
        <div id="track-list" role="group" aria-label="Detected tracks"></div>
        <div class="engage-actions">
          <button id="btn-assign" aria-label="Assign selected track to battery">ASSIGN</button>
          <button id="btn-authorize" aria-label="Authorize launch">AUTHORIZE LAUNCH</button>
        </div>
        <div id="engage-status" aria-live="polite"></div>
      </div>
    </div>
  `,document.body.appendChild(f);let p={patriot:`RMP`,thaad:`HLB`,sentinel:`SNT`},m={patriot:`#ffd257`,thaad:`#4fd8ff`,sentinel:`#c99bff`},h=Kf(`div`);h.id=`tablet`,h.setAttribute(`role`,`dialog`),h.setAttribute(`aria-label`,`Tactical command tablet`),h.innerHTML=`
    <div class="t-case">
      <div class="t-screw tl"></div><div class="t-screw tr"></div>
      <div class="t-screw bl"></div><div class="t-screw br"></div>
      <div class="t-screen">
        <div class="t-head">
          <span class="t-title">■ TACOM PAD <span class="t-dim">·</span> IRONVEIL C2 DATALINK</span>
          <span class="t-net"><span class="t-net-dot"></span>NET</span>
          <button id="t-close" aria-label="Stow tablet (Q)">STOW [Q]</button>
        </div>
        <div class="t-body">
          <div class="t-left">
            <canvas id="t-radar" width="340" height="340" aria-label="Tactical radar plot"></canvas>
            <div class="t-cap">TAP TRACK TO SELECT · RINGS 3 KM</div>
          </div>
          <div class="t-right">
            <div id="t-batts" role="group" aria-label="Batteries"></div>
            <div id="t-tracks" role="group" aria-label="Tracks"></div>
            <div class="t-actions">
              <button id="t-engage-all" aria-label="Engage all hostile tracks">⚑ ENGAGE ALL HOSTILE</button>
            </div>
            <div id="t-hint" aria-live="polite"></div>
          </div>
        </div>
        <div class="t-foot" id="t-foot"></div>
      </div>
    </div>
  `,document.body.appendChild(h);let g=h.querySelector(`#t-radar`),_=g.getContext(`2d`),v=h.querySelector(`#t-batts`),y=h.querySelector(`#t-tracks`),b=h.querySelector(`#t-hint`),x=h.querySelector(`#t-foot`),S=Kf(`div`);S.id=`cinema`,S.setAttribute(`aria-hidden`,`true`),S.innerHTML=`
    <div class="bar top"></div><div class="bar bot"></div>
    <div class="c-tag"><span class="rec"></span><span id="cinema-label">INTERCEPTOR CAM</span><span class="c-keys">V NEXT · ESC EXIT</span></div>
  `,document.body.appendChild(S);let C=S.querySelector(`#cinema-label`),w=Kf(`div`,`modal`);w.setAttribute(`role`,`dialog`),w.setAttribute(`aria-label`,`Engagement debrief`),w.innerHTML=`
    <div class="box">
      <h2 id="db-title">ENGAGEMENT COMPLETE</h2>
      <div class="grade" id="db-grade">A</div>
      <table id="db-table"></table>
      <div class="row-buttons">
        <button id="db-restart" class="primary" aria-label="Restart scenario">RESTART SCENARIO</button>
        <button id="db-console" aria-label="Back to console">BACK TO CONSOLE</button>
        <button id="db-close" aria-label="Close and free roam">FREE ROAM</button>
      </div>
    </div>
  `,document.body.appendChild(w);let T=Kf(`div`,`modal`);T.setAttribute(`role`,`dialog`),T.setAttribute(`aria-label`,`Settings`),T.innerHTML=`
    <div class="box">
      <h2>SETTINGS</h2>
      <label>Reduced motion (no head bob / heavy shake / flash effects)
        <input type="checkbox" id="set-reduced"></label>
      <label>Master volume
        <input type="range" id="set-volume" min="0" max="1" step="0.05"></label>
      <label>Mute audio
        <input type="checkbox" id="set-mute"></label>
      <label>Render quality
        <select id="set-quality">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select></label>
      <div class="row-buttons"><button id="set-close" class="primary" aria-label="Close settings">CLOSE</button></div>
      <div class="hint">Fictional entertainment demo. Systems are visually inspired by public
      imagery but all behavior, ranges and procedures are invented for gameplay.</div>
    </div>
  `,document.body.appendChild(T);let E=Kf(`div`);E.id=`intro`,E.setAttribute(`role`,`button`),E.setAttribute(`aria-label`,`Click to take post`),E.innerHTML=`
    <h1>IRONVEIL RANGE</h1>
    <div class="tagline">INTEGRATED AIR-DEFENSE TEST SITE · FICTIONAL DEMO</div>
    <div class="enter">CLICK TO TAKE POST</div>
    <div class="controls">
      WASD move · SHIFT sprint · mouse look<br/>
      Q raises the TACOM pad — start raids and direct fire from anywhere<br/>
      Look at a track: E assign · F fire — F again salvos, 1·2·3 ripples batteries<br/>
      V rides the interceptor out — missile cam
    </div>
    <div class="safety">ENTERTAINMENT ONLY — ALL SYSTEM BEHAVIOR IS FICTIONALIZED</div>
  `,document.body.appendChild(E);let D=[[`day`,`DAY`,`full visibility`],[`sunset`,`SUNSET`,`low sun, long shadows`],[`night`,`NIGHT`,`floodlights + searchlights`]],O=f.querySelector(`#opt-time`);for(let[t,n,r]of D){let i=Kf(`button`,`copt`,`${n}<span class="d">${r}</span>`);i.dataset.id=t,i.setAttribute(`aria-label`,`${n} — ${r}`),i.addEventListener(`click`,()=>{de.setTimeOfDay?.(t),e.events.emit(`ui-click`)}),O.appendChild(i)}let k=f.querySelector(`#opt-scenario`);for(let t of Object.values(_f)){let n=Kf(`button`,`copt`,`${t.name}<span class="d">${t.desc}</span>`);n.dataset.id=t.id,n.setAttribute(`aria-label`,`${t.name} — ${t.desc}`),n.addEventListener(`click`,()=>{de.selectScenario?.(t.id),e.events.emit(`ui-click`)}),k.appendChild(n)}let ee=f.querySelector(`#opt-battery`);for(let t of Object.values(mf)){let n=Kf(`button`,`copt`,`${t.name}<span class="d">${t.kind} · ${t.desc}</span>`);n.dataset.id=t.id,n.setAttribute(`aria-label`,`${t.name} — ${t.kind}`),n.addEventListener(`click`,()=>{de.selectBattery?.(t.id),e.events.emit(`ui-click`)}),ee.appendChild(n)}let A=f.querySelector(`#btn-start`),j=f.querySelector(`#btn-assign`),M=f.querySelector(`#btn-authorize`),te=f.querySelector(`#btn-exit-console`),N=f.querySelector(`#track-list`),P=f.querySelector(`#engage-status`);A.addEventListener(`click`,()=>{de.start?.(),e.events.emit(`ui-click`)}),j.addEventListener(`click`,()=>{de.assign?.(),e.events.emit(`ui-click`)}),M.addEventListener(`click`,()=>{de.authorize?.(),e.events.emit(`ui-click`)}),te.addEventListener(`click`,()=>{de.exitConsole?.(),e.events.emit(`ui-click`)}),w.querySelector(`#db-restart`).addEventListener(`click`,()=>{ue(),de.restart?.()}),w.querySelector(`#db-console`).addEventListener(`click`,()=>{ue(),de.enterConsole?.()}),w.querySelector(`#db-close`).addEventListener(`click`,()=>{ue(),de.closeToRoam?.()}),h.querySelector(`#t-close`).addEventListener(`click`,()=>de.closeTablet?.()),h.querySelector(`#t-engage-all`).addEventListener(`click`,()=>{de.engageAll?.(),e.events.emit(`ui-click`)}),v.addEventListener(`click`,t=>{let n=t.target.closest(`[data-bat]`);n&&(de.selectBattery?.(n.dataset.bat),e.events.emit(`ui-click`))}),y.addEventListener(`click`,t=>{let n=t.target.closest(`[data-track]`);if(!n)return;let r=t.target.closest(`button[data-act]`)?.dataset.act,i=n.dataset.track;r===`assign`?de.assignTrack?.(i):r===`fire`?de.fireTrack?.(i):de.selectTrack?.(i),e.events.emit(`ui-click`)}),x.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-tf]`);if(!n)return;let[r,i]=n.dataset.tf.split(`:`);r===`time`?de.setTimeOfDay?.(i):r===`scn`?de.selectScenario?.(i):r===`start`?de.start?.():r===`restart`&&de.restart?.(),e.events.emit(`ui-click`)});let ne=9e3;g.addEventListener(`click`,t=>{let n=g.getBoundingClientRect(),r=(t.clientX-n.left)/n.width*340,i=(t.clientY-n.top)/n.height*340,a=null,o=18;for(let t of e.radar.activeTracks()){let e=170+t.threat.pos.x/ne*156,n=170+t.threat.pos.z/ne*156,s=Math.hypot(e-r,n-i);s<o&&(o=s,a=t.id)}a&&(de.selectTrack?.(a),e.events.emit(`ui-click`))});let F=T.querySelector(`#set-reduced`),I=T.querySelector(`#set-volume`),L=T.querySelector(`#set-mute`),re=T.querySelector(`#set-quality`);F.addEventListener(`change`,()=>de.setReducedMotion?.(F.checked)),I.addEventListener(`input`,()=>de.setVolume?.(parseFloat(I.value))),L.addEventListener(`change`,()=>de.setMuted?.(L.checked)),re.addEventListener(`change`,()=>de.setQuality?.(re.value)),T.querySelector(`#set-close`).addEventListener(`click`,()=>De.showSettings(!1)),E.addEventListener(`click`,()=>{E.classList.add(`hidden`),de.enterGame?.()});function ie(e,t=`info`,n=6){let r=Kf(`div`,`msg ${t}`,`<span class="ico">${Jf[t]??`◆`}</span><span class="txt">${e}</span>`);for(a.appendChild(r);a.children.length>5;)a.removeChild(a.firstChild);setTimeout(()=>r.classList.add(`fading`),n*1e3),setTimeout(()=>r.remove(),n*1e3+900)}let ae=null;function R(e,t=`good`,n=``,r=2.6){s.className=t,s.innerHTML=`<span class="b-ico">${Yf[t]??``}</span>${e}${n?`<span class="sub">${n}</span>`:``}`,s.style.opacity=`1`,s.offsetWidth,s.classList.add(`pop`),ae&&clearTimeout(ae),ae=setTimeout(()=>{s.style.opacity=`0`},r*1e3)}function oe(){c.style.opacity=`1`,setTimeout(()=>{c.style.opacity=`0`},260)}let se=new Map,ce=1;for(let e of Object.values(mf)){let t=Kf(`div`,`batt-card`);t.innerHTML=`
      <div class="name"><span>${e.name}</span><span class="key">[${ce++}]</span></div>
      <div class="sub"><span class="state">READY</span><span class="pips"></span></div>
    `,r.appendChild(t),se.set(e.id,t)}function le(e){let t=e.impactsOnBase===0&&e.intercepted>0,n=w.querySelector(`#db-title`);n.textContent=t?`RAID DEFEATED`:e.impactsOnBase>0?`BASE HIT`:`ENGAGEMENT COMPLETE`,n.className=t?`good`:`bad`;let r;Math.max(e.threatsTotal,1);let i=e.intercepted>=e.warheads;r=i&&e.impactsOnBase===0&&e.wastedOnDecoys===0&&e.misses===0?`S`:i&&e.impactsOnBase===0?`A`:e.impactsOnBase===0&&e.intercepted>0?`B`:e.intercepted>0?`C`:`D`,w.querySelector(`#db-grade`).textContent=r,w.querySelector(`#db-grade`).style.color=r===`S`||r===`A`?`var(--hud-green)`:r===`B`?`var(--hud-amber)`:`var(--hud-red)`,w.querySelector(`#db-table`).innerHTML=`
      <tr><td>Threats presented</td><td>${e.threatsTotal} (${e.warheads} warheads, ${e.decoys} decoys)</td></tr>
      <tr><td>Intercepted</td><td>${e.intercepted}</td></tr>
      <tr><td>Ground impacts</td><td>${e.impacts} (${e.impactsOnBase} on base)</td></tr>
      <tr><td>Interceptors expended</td><td>${e.launches}</td></tr>
      ${e.safed?`<tr><td>Rounds safed (target already down)</td><td>${e.safed}</td></tr>`:``}
      <tr><td>Spent on decoys</td><td>${e.wastedOnDecoys}</td></tr>
      <tr><td>Elapsed</td><td>${e.elapsed.toFixed(0)} s</td></tr>
    `,w.style.display=`flex`}function ue(){w.style.display=`none`}let de={},fe={threatsStruct:``,threatsVals:``,batts:``,strip:``,console:``,trackStruct:``,trackVals:``},pe=e=>Math.round(e/100)*100,me=[],he=[];N.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-id]`);n&&(de.selectTrack?.(n.dataset.id),e.events.emit(`ui-click`))});let ge={batts:``,trackStruct:``,trackVals:``,foot:``,hint:``},_e=[];function ve(t){let n=_;n.clearRect(0,0,340,340);let r=n.createRadialGradient(170,170,18,170,170,170);r.addColorStop(0,`#08150d`),r.addColorStop(.82,`#051009`),r.addColorStop(1,`#030a06`),n.fillStyle=r,n.beginPath(),n.arc(170,170,166,0,Math.PI*2),n.fill(),n.font=`9px "Consolas","Menlo","DejaVu Sans Mono",monospace`,n.strokeStyle=`rgba(110,220,150,0.16)`,n.fillStyle=`rgba(140,235,170,0.45)`,n.lineWidth=1;for(let e=1;e<=3;e++){let t=e*3e3/ne*156;n.beginPath(),n.arc(170,170,t,0,Math.PI*2),n.stroke(),n.fillText(`${e*3}`,170+t-11,166)}n.beginPath(),n.moveTo(14,170),n.lineTo(326,170),n.moveTo(170,14),n.lineTo(170,326),n.stroke(),n.fillStyle=`rgba(150,240,180,0.8)`,n.fillText(`N`,167,25);let i=-(e.base?.radarHead?e.base.radarHead.rotation.y:0);if(n.createConicGradient){let e=n.createConicGradient(i,170,170);e.addColorStop(0,`rgba(120,255,170,0.20)`),e.addColorStop(.14,`rgba(120,255,170,0)`),e.addColorStop(1,`rgba(120,255,170,0)`),n.fillStyle=e,n.beginPath(),n.arc(170,170,156,0,Math.PI*2),n.fill()}n.strokeStyle=`rgba(150,255,190,0.45)`,n.beginPath(),n.moveTo(170,170),n.lineTo(170+Math.cos(i)*156,170+Math.sin(i)*156),n.stroke();let a=(e,t)=>[170+e/ne*156,170+t/ne*156];n.save(),n.beginPath(),n.arc(170,170,156,0,Math.PI*2),n.clip(),n.strokeStyle=`rgba(150,240,180,0.7)`,n.strokeRect(166,166,8,8);for(let t of e.batteries.list){let[e,r]=a(t.rig.group.position.x,t.rig.group.position.z);n.fillStyle=m[t.id],n.fillRect(e-2,r-2,4,4)}let o=new Map(t.tracks.map(e=>[e.id,e]));n.lineWidth=1;for(let t of e.radar.activeTracks()){let r=o.get(t.id);if(!r?.assignedBattery)continue;let i=e.batteries.get(r.assignedBattery);if(!i)continue;let[s,c]=a(i.rig.group.position.x,i.rig.group.position.z),[l,u]=a(t.threat.pos.x,t.threat.pos.z);n.strokeStyle=`${m[r.assignedBattery]}44`,n.setLineDash([3,4]),n.beginPath(),n.moveTo(s,c),n.lineTo(l,u),n.stroke(),n.setLineDash([])}for(let r of e.radar.activeTracks()){let e=r.threat,i=o.get(r.id),[s,c]=a(e.pos.x,e.pos.z),l=r.classified.startsWith(`DECOY`),u=l?`#ffd257`:`#ff5340`,d=Ud(e.pos,e.vel,0);if(!l&&d>0){let[t,r]=a(e.pos.x+e.vel.x*d,e.pos.z+e.vel.z*d);n.strokeStyle=`rgba(255,83,64,0.55)`,n.beginPath(),n.moveTo(t-4,r-4),n.lineTo(t+4,r+4),n.moveTo(t+4,r-4),n.lineTo(t-4,r+4),n.stroke()}let[f,p]=a(e.pos.x+e.vel.x*10,e.pos.z+e.vel.z*10);n.strokeStyle=`${u}88`,n.beginPath(),n.moveTo(s,c),n.lineTo(f,p),n.stroke();let h=Math.atan2(e.vel.z,e.vel.x);n.fillStyle=u,n.save(),n.translate(s,c),n.rotate(h),n.beginPath(),n.moveTo(5,0),n.lineTo(-4,3.4),n.lineTo(-4,-3.4),n.closePath(),n.fill(),n.restore(),r.id===t.selectedTrackId?(n.strokeStyle=`#ffffff`,n.lineWidth=1.4,n.beginPath(),n.arc(s,c,9.5,0,Math.PI*2),n.stroke(),n.lineWidth=1):i?.assignedBattery&&(n.strokeStyle=`${m[i.assignedBattery]}cc`,n.beginPath(),n.arc(s,c,8,0,Math.PI*2),n.stroke()),i?.queued&&(n.strokeStyle=`rgba(255,255,255,0.75)`,n.setLineDash([2.5,3]),n.beginPath(),n.arc(s,c,12,0,Math.PI*2),n.stroke(),n.setLineDash([])),n.fillStyle=`${u}dd`,n.fillText(r.id,s+8,c+3)}for(let t of e.interceptors.active){let[e,r]=a(t.pos.x,t.pos.z),[i,o]=a(t.pos.x+t.vel.x*4,t.pos.z+t.vel.z*4);n.strokeStyle=`rgba(79,216,255,0.8)`,n.beginPath(),n.moveTo(e,r),n.lineTo(i,o),n.stroke(),n.fillStyle=`#4fd8ff`,n.fillRect(e-1.5,r-1.5,3,3)}n.restore()}function ye(e){let t=e.batteries.map(t=>`${t.id}:${t.state}:${t.ammo}:${t.queued}:${+(t.id===e.selectedBatteryId)}:${Math.ceil(t.readyIn)}`).join(`|`);t!==ge.batts&&(ge.batts=t,v.innerHTML=e.batteries.map((t,n)=>`
        <div class="t-bat ${t.id===e.selectedBatteryId?`sel`:``}" data-bat="${t.id}" style="--bc:${m[t.id]}" role="button" aria-label="Select ${mf[t.id].name}">
          <span class="t-bat-key">${n+1}</span>
          <span class="t-bat-name">${p[t.id]}</span>
          <span class="t-bat-state">${t.state}${t.state===`RELOADING`?` ${Math.ceil(t.readyIn)}s`:``}</span>
          <span class="t-bat-ammo">${`▮`.repeat(t.ammo)}${`▯`.repeat(Math.max(0,t.maxAmmo-t.ammo))}</span>
          ${t.queued?`<span class="t-bat-q">Q${t.queued}</span>`:``}
        </div>`).join(``));let n=e.tracks.map(t=>`${t.id}:${+!!t.classified.startsWith(`DECOY`)}:${+(t.id===e.selectedTrackId)}:${t.assignedBattery??``}:${t.queued}:${t.engagedBy}`).join(`|`);if(e.tracks.length||(n=`none:${e.phase}`),n!==ge.trackStruct&&(ge.trackStruct=n,ge.trackVals=``,e.tracks.length?(y.innerHTML=e.tracks.map(t=>{let n=t.classified.startsWith(`DECOY`),r=[`t-row`,n?`decoy`:``,t.id===e.selectedTrackId?`sel`:``].join(` `),i=t.assignedBattery?`<span class="t-asg" style="color:${m[t.assignedBattery]}">→${p[t.assignedBattery]}${t.engagedBy?` ×${t.engagedBy}`:``}${t.queued?` Q${t.queued}`:``}</span>`:`<span class="t-asg dim">UNASSIGNED</span>`;return`<div class="${r}" data-track="${t.id}" role="button" aria-label="Track ${t.id}">
            <span class="glyph">${n?qf.decoy:qf.hostile}</span><b>${t.id}</b>
            <span class="t-meta"></span>${i}
            <button data-act="assign" aria-label="Assign ${t.id} to selected battery">ASGN</button>
            <button data-act="fire" class="fire" aria-label="Fire on ${t.id}">FIRE</button>
          </div>`}).join(``),_e=[...y.children].map(e=>e.querySelector(`.t-meta`))):(y.innerHTML=`<div class="t-none">${e.phase===`active`?`RADAR SEARCHING…`:`NO AIR PICTURE — START A RAID BELOW`}</div>`,_e=[])),e.tracks.length){let t=e.tracks.map(e=>`${e.classified}:${pe(e.alt)}:${Math.round(e.impactIn)}`).join(`|`);if(t!==ge.trackVals){ge.trackVals=t;for(let t=0;t<e.tracks.length;t++){let n=e.tracks[t];_e[t]&&(_e[t].textContent=`${n.classified} · ALT ${Md(pe(n.alt))}${n.impactIn>0&&n.impactIn<999?` · TTI ${Math.round(n.impactIn)}s`:``}`)}}}(e.engageHint??``)!==ge.hint&&(ge.hint=e.engageHint??``,b.textContent=ge.hint);let r=`${e.phase}:${e.timeOfDay}:${e.scenario}:${e.threatsRemaining}:${e.inFlight}:${e.queueCount}`;r!==ge.foot&&(ge.foot=r,e.phase===`active`?x.innerHTML=`<span class="t-stat">RAID LIVE — THREATS ${e.threatsRemaining} · IN FLIGHT ${e.inFlight}${e.queueCount?` · QUEUED ${e.queueCount}`:``}</span>`:x.innerHTML=`
          <span class="t-seg">${[[`day`,`DAY`],[`sunset`,`SUNSET`],[`night`,`NIGHT`]].map(([t,n])=>`<button data-tf="time:${t}" class="${e.timeOfDay===t?`on`:``}" aria-pressed="${e.timeOfDay===t}">${n}</button>`).join(``)}</span>
          <span class="t-seg">${Object.values(_f).map(t=>`<button data-tf="scn:${t.id}" class="${e.scenario===t.id?`on`:``}" aria-pressed="${e.scenario===t.id}">${t.name}</button>`).join(``)}</span>
          <button class="t-start" data-tf="start" ${e.scenario?``:`disabled`}>▶ ${e.phase===`debrief`?`RUN AGAIN`:`START RAID`}</button>`),ve(e)}let be=new W,xe=!1,Se=!1,Ce=``,we=``;function Te(t){let n=null;if(t.mode!==`console`&&e.game){let r=e.game.aimTrackId??t.assignment?.trackId??null;r&&(n=e.radar.getTrack(r))}let r=!1;if(n&&!n.gone&&(e.camera.updateMatrixWorld(),be.copy(n.threat.pos).project(e.camera),be.z<1&&Math.abs(be.x)<1.02&&Math.abs(be.y)<1.02)){r=!0;let i=(be.x*.5+.5)*innerWidth,a=(-be.y*.5+.5)*innerHeight,o=Cd(1.45-n.threat.pos.distanceTo(e.camera.position)/12e3,.72,1.3);l.style.transform=`translate(${i.toFixed(1)}px, ${a.toFixed(1)}px) translate(-50%, -50%) scale(${o.toFixed(3)})`;let s=!!n.assignedBattery||t.assignment?.trackId===n.id,c=`${n.classified.startsWith(`DECOY`)?qf.decoy:qf.hostile} ${n.id}`,f=s?`${n.classified} · ASSIGNED`:n.classified;s!==Se&&(Se=s,l.classList.toggle(`assigned`,s)),c!==Ce&&(Ce=c,u.textContent=c),f!==we&&(we=f,d.textContent=f)}r!==xe&&(xe=r,l.classList.toggle(`on`,r))}function Ee(t){document.body.classList.toggle(`reduced-motion`,!!e.settings.reducedMotion);let r=t.inboundUndetected,i=t.tracks.map(e=>`${e.id}:${+!!e.classified.startsWith(`DECOY`)}:${e.assignedBattery??``}:${+(e.id===t.selectedTrackId)}`).join(`|`);if(t.tracks.length||(i=`empty:${t.phase}:${+(r>0)}`),i!==fe.threatsStruct&&(fe.threatsStruct=i,fe.threatsVals=``,t.tracks.length?(n.innerHTML=t.tracks.map(e=>{let n=e.classified.startsWith(`DECOY`);return`<div class="${[`row`,n?`decoy`:``,e.assignedBattery?`assigned`:``,e.id===t.selectedTrackId?`selected`:``].join(` `)}"><span class="glyph">${n?qf.decoy:qf.hostile}</span><span class="tid">${e.id}</span><span class="cls"></span><span class="alt"></span><span class="rng"></span>${e.assignedBattery?`<span class="asg">→${e.assignedBattery.slice(0,4).toUpperCase()}</span>`:``}</div>`}).join(``),me=[...n.children].map(e=>({cls:e.querySelector(`.cls`),alt:e.querySelector(`.alt`),rng:e.querySelector(`.rng`)}))):(n.innerHTML=`<div class="empty">${t.phase===`active`?r>0?`▲ RADAR SEARCHING — LAUNCH DETECTED`:`NO ACTIVE TRACKS`:`NO ACTIVE TRACKS — START A SCENARIO AT THE CONSOLE`}</div>`,me=[])),t.tracks.length){let e=t.tracks.map(e=>`${e.classified}:${pe(e.alt)}:${pe(e.range)}`).join(`|`);if(e!==fe.threatsVals){fe.threatsVals=e;for(let e=0;e<t.tracks.length;e++){let n=t.tracks[e],r=me[e];r&&(r.cls.textContent=n.classified,r.alt.textContent=Md(pe(n.alt)),r.rng.textContent=Md(pe(n.range)))}}}let a=t.batteries.map(e=>`${e.id}:${e.state}:${e.ammo}:${Math.ceil(e.readyIn)}`).join(`|`)+t.selectedBatteryId;if(a!==fe.batts){fe.batts=a;for(let e of t.batteries){let n=se.get(e.id);n&&(n.classList.toggle(`selected`,e.id===t.selectedBatteryId),n.querySelector(`.state`).textContent=e.state+(e.state===`RELOADING`?` ${Math.ceil(e.readyIn)}s`:``),n.querySelector(`.state`).className=`state `+e.state.split(` `)[0],n.querySelector(`.pips`).textContent=`▮`.repeat(e.ammo)+`▯`.repeat(Math.max(0,e.maxAmmo-e.ammo)))}}let s=[];s.push(`<span class="chip batt"><span class="lbl">BTRY</span>${t.selectedBatteryName}</span>`),t.assignment&&s.push(`<span class="chip asg"><span class="lbl">ASSIGNED</span>${t.assignment.trackId} → ${t.assignment.batteryName}</span>`),t.inFlight>0&&s.push(`<span class="chip flight"><span class="lbl">IN FLIGHT</span>${qf.interceptor} ${t.inFlight} INTERCEPTOR${t.inFlight>1?`S`:``}</span>`),t.phase===`active`&&s.push(`<span class="chip"><span class="lbl">THREATS</span>${t.threatsRemaining} REMAIN</span>`);let c=s.join(``);if(c!==fe.strip&&(fe.strip=c,o.innerHTML=c),t.mode===`console`){let e=`${t.timeOfDay}|${t.scenario}|${t.selectedBatteryId}|${t.phase}|${t.selectedTrackId}|${t.selectedBatteryReady}|${!!t.assignment}|${t.engageHint}`;if(e!==fe.console){fe.console=e;for(let e of O.children){let n=e.dataset.id===t.timeOfDay;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}for(let e of k.children){let n=e.dataset.id===t.scenario;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}for(let e of ee.children){let n=e.dataset.id===t.selectedBatteryId;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}A.disabled=t.phase===`active`||!t.scenario,A.textContent=t.phase===`active`?`… RAID IN PROGRESS …`:`▶ START BALLISTIC MISSILES`,j.disabled=!t.selectedTrackId||!t.selectedBatteryReady,M.disabled=!t.assignment,P.textContent=t.engageHint??``}let n=t.tracks.map(e=>`${e.id}:${+!!e.classified.startsWith(`DECOY`)}:${+(e.id===t.selectedTrackId)}:${+!!e.assignedBattery}`).join(`|`);if(t.tracks.length||(n=`none:${t.phase}`),n!==fe.trackStruct&&(fe.trackStruct=n,fe.trackVals=``,t.tracks.length?(N.innerHTML=t.tracks.map(e=>{let n=e.classified.startsWith(`DECOY`),r=[``,n?`decoy`:``,e.id===t.selectedTrackId?`selected`:``,e.assignedBattery?`assigned`:``].join(` `);return`<button data-id="${e.id}" class="${r}" aria-label="Select track ${e.id}" aria-pressed="${e.id===t.selectedTrackId}"><span class="glyph">${n?qf.decoy:qf.hostile}</span><b>${e.id}</b><span class="cls"></span><span class="alt"></span><span class="rng"></span></button>`}).join(``),he=[...N.children].map(e=>({cls:e.querySelector(`.cls`),alt:e.querySelector(`.alt`),rng:e.querySelector(`.rng`)}))):(N.innerHTML=`<div class="none">No detected tracks. ${t.phase===`active`?`Radar searching…`:`Press START.`}</div>`,he=[])),t.tracks.length){let e=t.tracks.map(e=>`${e.classified}:${pe(e.alt)}:${pe(e.range)}`).join(`|`);if(e!==fe.trackVals){fe.trackVals=e;for(let e=0;e<t.tracks.length;e++){let n=t.tracks[e],r=he[e];r&&(r.cls.textContent=n.classified,r.alt.textContent=`ALT ${Md(pe(n.alt))}`,r.rng.textContent=`RNG ${Md(pe(n.range))}`)}}}}t.tabletOpen&&ye(t),Te(t)}let De={handlers:de,toast:ie,showBanner:R,flashImpact:oe,showDebrief:le,hideDebrief:ue,update:Ee,showTablet(e){h.classList.toggle(`open`,!!e),document.body.classList.toggle(`tablet-on`,!!e),e&&(ge.batts=``,ge.trackStruct=``,ge.foot=``,ge.hint=`\0`)},setCinema(e,t=``){S.classList.toggle(`on`,!!e),document.body.classList.toggle(`cinema-on`,!!e),t&&(C.textContent=t)},setPrompt(e,t=!1){e?(i.style.display=`block`,i.classList.toggle(`interact`,t),i.innerHTML=e):i.style.display=`none`},showConsole(e){f.style.display=e?`block`:`none`},showSettings(t){T.style.display=t?`flex`:`none`,t&&(F.checked=e.settings.reducedMotion,I.value=String(e.settings.volume),L.checked=e.audio?.muted??!1,re.value=e.settings.quality)},get settingsOpen(){return T.style.display===`flex`},hideIntro(){E.classList.add(`hidden`)},crosshair(e){t.querySelector(`#crosshair`).style.display=e?`block`:`none`}};return e.events.on(`threat-tracked`,({track:e})=>ie(`NEW TRACK ${e.id} — ACQUIRING`,`warn`)),e.events.on(`scenario-started`,({name:e})=>{R(`RAID WARNING`,`warn`,_f[e]?.name??``,3),ie(`SCENARIO ${_f[e]?.name??e} — INBOUND FIRE DETECTED`,`bad`,8)}),e.events.on(`track-assigned`,({track:e,battery:t})=>ie(`${e.id} ASSIGNED → ${t.def.name}`,`info`)),e.events.on(`launch-authorized`,({track:e,battery:t})=>ie(`LAUNCH AUTHORIZED — ${t.def.name} vs ${e.id}`,`warn`)),e.events.on(`interceptor-launched`,({battery:e})=>ie(`BIRD AWAY — ${e.def.name}`,`info`,4)),e.events.on(`intercept-success`,({threat:t,decoy:n})=>{let r=e.radar.trackFor?.(t);n?(R(`DECOY DESTROYED`,`warn`,`ROUND EXPENDED ON DECOY`),ie(`${r?.id??`TRACK`} WAS A DECOY — ROUND WASTED`,`warn`,7)):(R(`INTERCEPT`,`good`,`${r?.id??`TRACK`} DESTROYED`),ie(`${r?.id??`TRACK`} INTERCEPTED`,`good`,7))}),e.events.on(`intercept-miss`,({threat:t,reason:n})=>{if(!t||!t.alive){ie(`ROUND SAFED — TARGET ALREADY DOWN`,`info`,4);return}let r=e.radar.trackFor?.(t);R(`MISS`,`bad`,n,2.2),ie(`INTERCEPT FAILED vs ${r?.id??`?`} — ${n}`,`bad`,7)}),e.events.on(`threat-impact`,({onBase:t,threat:n})=>{let r=e.radar?.trackFor?.(n);t?(R(`IMPACT — BASE STRUCK`,`bad`,r?.id??``,3),oe(),ie(`${r?.id??`THREAT`} IMPACTED INSIDE PERIMETER`,`bad`,8)):ie(`${r?.id??`THREAT`} IMPACT OFF-BASE`,`warn`,6)}),e.events.on(`battery-ready`,({battery:e})=>ie(`${e.def.name} READY`,`good`,3)),De}var Zf={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},Qf=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},$f=new As(-1,1,1,-1,0,1),ep=new class extends kr{constructor(){super(),this.setAttribute(`position`,new _r([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new _r([0,2,0,0,2,0],2))}},tp=class{constructor(e){this._mesh=new K(ep,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,$f)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},np=class extends Qf{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Jo?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Go.clone(e.uniforms),this.material=new Jo({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new tp(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},rp=class extends Qf{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},ip=class extends Qf{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},ap=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new U);this._width=n.width,this._height=n.height,t=new Jt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:g}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new np(Zf),this.copyPass.material.blending=0,this.timer=new Ls}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}rp!==void 0&&(r instanceof rp?n=!0:r instanceof ip&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new U);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},op=class extends Qf{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new G}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},sp={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new G(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},cp=class e extends Qf{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new U(256,256):new U(e.x,e.y),this.clearColor=new G(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Jt(i,a,{type:g}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new Jt(i,a,{type:g});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new Jt(i,a,{type:g});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=sp;this.highPassUniforms=Go.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Jo({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new U(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new W(1,1,1),new W(1,1,1),new W(1,1,1),new W(1,1,1),new W(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Go.clone(Zf.uniforms),this.blendMaterial=new Jo({uniforms:this.copyUniforms,vertexShader:Zf.vertexShader,fragmentShader:Zf.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new G,this._oldClearAlpha=1,this._basic=new ai,this._fsQuad=new tp(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new U(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);return new Jo({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new U(.5,.5)},direction:{value:new U(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new Jo({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};cp.BlurDirectionX=new U(1,0),cp.BlurDirectionY=new U(0,1);var lp={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},up=class extends Qf{constructor(){super(),this.isOutputPass=!0,this.uniforms=Go.clone(lp.uniforms),this.material=new Yo({name:lp.name,uniforms:this.uniforms,vertexShader:lp.vertexShader,fragmentShader:lp.fragmentShader}),this._fsQuad=new tp(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ft.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},dp={name:`FXAAShader`,uniforms:{tDiffuse:{value:null},resolution:{value:new U(1/1024,1/512)}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec2 resolution;
		varying vec2 vUv;

		#define EDGE_STEP_COUNT 6
		#define EDGE_GUESS 8.0
		#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0
		const float edgeSteps[EDGE_STEP_COUNT] = float[EDGE_STEP_COUNT]( EDGE_STEPS );

		float _ContrastThreshold = 0.0312;
		float _RelativeThreshold = 0.063;
		float _SubpixelBlending = 1.0;

		vec4 Sample( sampler2D  tex2D, vec2 uv ) {

			return texture( tex2D, uv );

		}

		float SampleLuminance( sampler2D tex2D, vec2 uv ) {

			return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );

		}

		float SampleLuminance( sampler2D tex2D, vec2 texSize, vec2 uv, float uOffset, float vOffset ) {

			uv += texSize * vec2(uOffset, vOffset);
			return SampleLuminance(tex2D, uv);

		}

		struct LuminanceData {

			float m, n, e, s, w;
			float ne, nw, se, sw;
			float highest, lowest, contrast;

		};

		LuminanceData SampleLuminanceNeighborhood( sampler2D tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData l;
			l.m = SampleLuminance( tex2D, uv );
			l.n = SampleLuminance( tex2D, texSize, uv,  0.0,  1.0 );
			l.e = SampleLuminance( tex2D, texSize, uv,  1.0,  0.0 );
			l.s = SampleLuminance( tex2D, texSize, uv,  0.0, -1.0 );
			l.w = SampleLuminance( tex2D, texSize, uv, -1.0,  0.0 );

			l.ne = SampleLuminance( tex2D, texSize, uv,  1.0,  1.0 );
			l.nw = SampleLuminance( tex2D, texSize, uv, -1.0,  1.0 );
			l.se = SampleLuminance( tex2D, texSize, uv,  1.0, -1.0 );
			l.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );

			l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
			l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
			l.contrast = l.highest - l.lowest;
			return l;

		}

		bool ShouldSkipPixel( LuminanceData l ) {

			float threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
			return l.contrast < threshold;

		}

		float DeterminePixelBlendFactor( LuminanceData l ) {

			float f = 2.0 * ( l.n + l.e + l.s + l.w );
			f += l.ne + l.nw + l.se + l.sw;
			f *= 1.0 / 12.0;
			f = abs( f - l.m );
			f = clamp( f / l.contrast, 0.0, 1.0 );

			float blendFactor = smoothstep( 0.0, 1.0, f );
			return blendFactor * blendFactor * _SubpixelBlending;

		}

		struct EdgeData {

			bool isHorizontal;
			float pixelStep;
			float oppositeLuminance, gradient;

		};

		EdgeData DetermineEdge( vec2 texSize, LuminanceData l ) {

			EdgeData e;
			float horizontal =
				abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.se - 2.0 * l.e ) +
				abs( l.nw + l.sw - 2.0 * l.w );
			float vertical =
				abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.nw - 2.0 * l.n ) +
				abs( l.se + l.sw - 2.0 * l.s );
			e.isHorizontal = horizontal >= vertical;

			float pLuminance = e.isHorizontal ? l.n : l.e;
			float nLuminance = e.isHorizontal ? l.s : l.w;
			float pGradient = abs( pLuminance - l.m );
			float nGradient = abs( nLuminance - l.m );

			e.pixelStep = e.isHorizontal ? texSize.y : texSize.x;

			if (pGradient < nGradient) {

				e.pixelStep = -e.pixelStep;
				e.oppositeLuminance = nLuminance;
				e.gradient = nGradient;

			} else {

				e.oppositeLuminance = pLuminance;
				e.gradient = pGradient;

			}

			return e;

		}

		float DetermineEdgeBlendFactor( sampler2D  tex2D, vec2 texSize, LuminanceData l, EdgeData e, vec2 uv ) {

			vec2 uvEdge = uv;
			vec2 edgeStep;
			if (e.isHorizontal) {

				uvEdge.y += e.pixelStep * 0.5;
				edgeStep = vec2( texSize.x, 0.0 );

			} else {

				uvEdge.x += e.pixelStep * 0.5;
				edgeStep = vec2( 0.0, texSize.y );

			}

			float edgeLuminance = ( l.m + e.oppositeLuminance ) * 0.5;
			float gradientThreshold = e.gradient * 0.25;

			vec2 puv = uvEdge + edgeStep * edgeSteps[0];
			float pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
			bool pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++ ) {

				puv += edgeStep * edgeSteps[i];
				pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
				pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			}

			if ( !pAtEnd ) {

				puv += edgeStep * EDGE_GUESS;

			}

			vec2 nuv = uvEdge - edgeStep * edgeSteps[0];
			float nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
			bool nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++ ) {

				nuv -= edgeStep * edgeSteps[i];
				nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
				nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			}

			if ( !nAtEnd ) {

				nuv -= edgeStep * EDGE_GUESS;

			}

			float pDistance, nDistance;
			if ( e.isHorizontal ) {

				pDistance = puv.x - uv.x;
				nDistance = uv.x - nuv.x;

			} else {

				pDistance = puv.y - uv.y;
				nDistance = uv.y - nuv.y;

			}

			float shortestDistance;
			bool deltaSign;
			if ( pDistance <= nDistance ) {

				shortestDistance = pDistance;
				deltaSign = pLuminanceDelta >= 0.0;

			} else {

				shortestDistance = nDistance;
				deltaSign = nLuminanceDelta >= 0.0;

			}

			if ( deltaSign == ( l.m - edgeLuminance >= 0.0 ) ) {

				return 0.0;

			}

			return 0.5 - shortestDistance / ( pDistance + nDistance );

		}

		vec4 ApplyFXAA( sampler2D  tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData luminance = SampleLuminanceNeighborhood( tex2D, texSize, uv );
			if ( ShouldSkipPixel( luminance ) ) {

				return Sample( tex2D, uv );

			}

			float pixelBlend = DeterminePixelBlendFactor( luminance );
			EdgeData edge = DetermineEdge( texSize, luminance );
			float edgeBlend = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
			float finalBlend = max( pixelBlend, edgeBlend );

			if (edge.isHorizontal) {

				uv.y += edge.pixelStep * finalBlend;

			} else {

				uv.x += edge.pixelStep * finalBlend;

			}

			return Sample( tex2D, uv );

		}

		void main() {

			gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );

		}`},fp={uniforms:{tDiffuse:{value:null},uTime:{value:0},uVignette:{value:.34},uGrain:{value:.028},uCA:{value:9e-4},uTint:{value:new G(1,1,1)},uTintHi:{value:new G(1,1,1)},uLift:{value:new W(0,0,0)},uContrast:{value:1.03},uSCurve:{value:.1},uSat:{value:1}},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,fragmentShader:`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uCA;
    uniform vec3 uTint;
    uniform vec3 uTintHi;
    uniform vec3 uLift;
    uniform float uContrast;
    uniform float uSCurve;
    uniform float uSat;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 uv = vUv;
      vec2 fromCenter = uv - 0.5;
      float r2 = dot(fromCenter, fromCenter);
      // subtle chromatic aberration, only near edges (~2px R/B split at corners)
      vec2 caOff = fromCenter * uCA * (0.2 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + caOff).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - caOff).b;
      col = clamp(col, 0.0, 1.0);
      // gentle filmic S-curve, then linear contrast around mid gray
      col = mix(col, col * col * (3.0 - 2.0 * col), uSCurve);
      col = (col - 0.5) * uContrast + 0.5;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // lifted shadows (night: cool blue floor)
      col += uLift * (1.0 - smoothstep(0.0, 0.45, lum));
      // tinted highlights (sunset warmth) + global tint
      col *= mix(vec3(1.0), uTintHi, smoothstep(0.55, 0.95, lum));
      col *= uTint;
      // saturation
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);
      // vignette
      float vig = 1.0 - smoothstep(0.18, 0.85, r2 * (1.0 + uVignette)) * uVignette;
      col *= vig;
      // animated grain
      float gr = (hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5) * uGrain;
      col += gr;
      // ~1.5/255 hash dither breaks 8-bit banding in smooth sky gradients
      col += (hash(uv * vec2(913.1, 719.7) + fract(uTime * 0.37) * 29.0) - 0.5) * 0.0059;
      gl_FragColor = vec4(col, 1.0);
    }
  `},pp={day:{bloomStrength:.42,bloomThreshold:.9,tint:[1,1,1],tintHi:[1,1,1],lift:[0,0,0],grain:.028,scurve:.1,contrast:1.035,sat:1.02,vignette:.34},sunset:{bloomStrength:.6,bloomThreshold:.82,tint:[1.03,.99,.96],tintHi:[1.07,.98,.9],lift:[.01,.006,.014],grain:.036,scurve:.18,contrast:1.02,sat:1.06,vignette:.38},night:{bloomStrength:.72,bloomThreshold:.82,tint:[.96,.99,1.05],tintHi:[1,1,1],lift:[.02,.03,.058],grain:.055,scurve:.06,contrast:1.01,sat:.95,vignette:.4}};function mp(e){let{renderer:t,scene:n,camera:r}=e,i=new ap(t),a=new op(n,r);i.addPass(a);let o=new cp(new U(1280,720),.45,.55,.85);i.addPass(o);let s=new up;i.addPass(s);let c=new np(fp);i.addPass(c);let l=new np(dp);i.addPass(l);function u(e,t,n){i.setSize(e,t),i.setPixelRatio(n),l.material.uniforms.resolution.value.set(1/(e*n),1/(t*n))}let d=pp.day,f={bloomStrength:d.bloomStrength,bloomThreshold:d.bloomThreshold,tint:new G().fromArray(d.tint),tintHi:new G().fromArray(d.tintHi),lift:new W().fromArray(d.lift),grain:d.grain,scurve:d.scurve,contrast:d.contrast,sat:d.sat,vignette:d.vignette},p=new G,m=new W;e.events.on(`time-of-day`,e=>{d=pp[e]??pp.day});function h(e){let t=Math.min(1,1-Math.exp(-e*2.4));f.bloomStrength+=(d.bloomStrength-f.bloomStrength)*t,f.bloomThreshold+=(d.bloomThreshold-f.bloomThreshold)*t,f.tint.lerp(p.fromArray(d.tint),t),f.tintHi.lerp(p.fromArray(d.tintHi),t),f.lift.lerp(m.fromArray(d.lift),t),f.grain+=(d.grain-f.grain)*t,f.scurve+=(d.scurve-f.scurve)*t,f.contrast+=(d.contrast-f.contrast)*t,f.sat+=(d.sat-f.sat)*t,f.vignette+=(d.vignette-f.vignette)*t,o.strength=f.bloomStrength,o.threshold=f.bloomThreshold;let n=c.uniforms;n.uTint.value.copy(f.tint),n.uTintHi.value.copy(f.tintHi),n.uLift.value.copy(f.lift),n.uGrain.value=f.grain,n.uSCurve.value=f.scurve,n.uContrast.value=f.contrast,n.uSat.value=f.sat,n.uVignette.value=f.vignette}let g=e.time?.now??0;return{composer:i,bloom:o,grade:c,fxaa:l,setSize:u,setQuality(e){o.enabled=e!==`low`,l.enabled=!0},render(t){c.uniforms.uTime.value+=t;let n=e.time?.now??0,r=Math.min(1,Math.max(t,n-g));g=n,r>0&&h(r),i.render()}}}var hp=`0.1.0`,gp=document.getElementById(`app-canvas`),_p=new yd({canvas:gp,antialias:!1,powerPreference:`high-performance`,stencil:!1});_p.outputColorSpace=Ne,_p.toneMapping=4,_p.toneMappingExposure=1,_p.shadowMap.enabled=!0,_p.shadowMap.type=2,_p.info.autoReset=!1;var vp=new Fn,yp=new Ts(66,innerWidth/innerHeight,.15,26e3);yp.position.set(0,1.7,14);var bp=(()=>{try{return JSON.parse(localStorage.getItem(`ironveil-settings`)||`{}`)}catch{return{}}})(),Q={scene:vp,camera:yp,renderer:_p,canvas:gp,time:{now:0,dt:0,unscaledDt:0,timeScale:1,frame:0},rng:new bd(20260805),vrng:new bd(97531),settings:{reducedMotion:bp.reducedMotion??!1,volume:bp.volume??.8,quality:bp.quality??`high`},events:new xd,world:{colliders:[],wind:new W(2.4,0,.8),sunDir:new W(0,1,0)}};function xp(){try{localStorage.setItem(`ironveil-settings`,JSON.stringify(Q.settings))}catch{}}Q.textures=Id(),Q.weather=$d(Q),Q.base=rf(Q),Q.effects=Lf(Q),Q.player=df(Q),Q.batteries=hf(Q),Q.threats=vf(Q),Q.interceptors=yf(Q),Q.radar=Wf(Q),Q.audio=Gf(Q),Q.ui=Xf(Q),Q.post=mp(Q);var $={mode:`freeroam`,phase:`idle`,scenario:null,seed:null,scenarioStartedAt:0,selectedBatteryId:`patriot`,assignments:new Map,fireQueue:[],focusTrackId:null,engageHint:``,viewMode:`fp`,camTarget:null,camHold:0,tabletOpen:!1,endTimer:-1,autoplay:!1,autoplayTimer:0,stats:null,aimTrackId:null,nearConsole:!1,nearBattery:null,consoleTransition:0,savedCam:{pos:new W,quat:new Dt}};Q.game=$;function Sp(){if($.focusTrackId&&$.assignments.has($.focusTrackId))return{trackId:$.focusTrackId,batteryId:$.assignments.get($.focusTrackId)};for(let[e,t]of $.assignments)return{trackId:e,batteryId:t};return null}function Cp(){return{threatsTotal:0,warheads:0,decoys:0,intercepted:0,misses:0,safed:0,impacts:0,impactsOnBase:0,launches:0,wastedOnDecoys:0,elapsed:0}}$.stats=Cp(),Q.events.on(`threat-spawned`,({threat:e})=>{$.stats.threatsTotal++,e.isDecoy?$.stats.decoys++:$.stats.warheads++}),Q.events.on(`interceptor-launched`,()=>{$.stats.launches++}),Q.events.on(`intercept-success`,({decoy:e})=>{e?$.stats.wastedOnDecoys++:$.stats.intercepted++}),Q.events.on(`intercept-miss`,({threat:e})=>{if(!e||!e.alive){$.stats.safed++;return}$.stats.misses++;let t=Q.radar.trackFor(e);t&&(t.engagedBy=Math.max(0,t.engagedBy-1))}),Q.events.on(`intercept-success`,({point:e})=>{$.lastIntercept={x:e.x,y:e.y,z:e.z,t:Q.time.now}}),Q.events.on(`threat-impact`,({onBase:e,threat:t})=>{$.stats.impacts++,e&&!t.isDecoy&&($.stats.impactsOnBase++,Q.player.addShake(.95),Q.ui.flashImpact())});function wp(e){let t=Q.radar.trackFor(e);t&&($.assignments.delete(t.id),$.fireQueue.length&&($.fireQueue=$.fireQueue.filter(e=>e.trackId!==t.id)),$.focusTrackId===t.id&&($.focusTrackId=null))}Q.events.on(`threat-destroyed`,({threat:e})=>wp(e)),Q.events.on(`threat-impact`,({threat:e})=>wp(e));function Tp(e){$.phase!==`active`&&_f[e]&&($.scenario=e,_f[e].forceTime&&Q.weather.timeOfDay!==_f[e].forceTime&&(Dp(_f[e].forceTime),Q.ui.toast(`CONDITIONS SET TO ${_f[e].forceTime.toUpperCase()} FOR ${_f[e].name}`,`info`,4)))}function Ep(e){mf[e]&&($.selectedBatteryId=e,Q.events.emit(`battery-selected`,{id:e}),$.phase===`active`&&$.focusTrackId&&$.assignments.get($.focusTrackId)!==e&&jp($.focusTrackId,e))}function Dp(e){Q.weather.setTimeOfDay(e),Op()}function Op(){Q.base.setSearchlights($.phase===`active`&&Q.weather.timeOfDay===`night`)}function kp(e={}){if($.phase===`active`)return!1;if(!$.scenario)return Q.ui.toast(`SELECT A THREAT SCENARIO FIRST`,`warn`),!1;let t=e.seed??$.seed??Math.random()*1e9|0;return $.seed=null,Q.rng.reseed(t),Q.vrng.reseed(t^1597463007),Q.radar.clear(),Q.interceptors.clear(),Q.batteries.resetAll(),$.stats=Cp(),$.assignments.clear(),$.fireQueue.length=0,$.focusTrackId=null,Gp(`fp`),$.endTimer=-1,$.phase=`active`,$.scenarioStartedAt=Q.time.now,Q.ui.hideDebrief(),Q.threats.startScenario($.scenario,Q.rng),Op(),Q.events.emit(`scenario-started`,{name:$.scenario,seed:t}),!0}function Ap(){Q.threats.clear(),Q.interceptors.clear(),$.phase=`idle`,kp()}function jp(e=Q.radar.selectedTrackId??$.aimTrackId,t=$.selectedBatteryId){let n=Q.radar.getTrack(e);if(!n||n.gone)return $.engageHint=`NO TRACK SELECTED`,!1;let r=Q.batteries.get(t);if(!r)return!1;let i=e=>e.ammo<=0?null:Wd(e.rig.group.position,n.threat.pos,n.threat.vel,e.def.interceptor.avgSpeed),a=i(r),o=!1;if(!a){let e=Lp(n),t=e?Q.batteries.get(e):null,s=t?i(t):null;if(t&&s)r=t,a=s,o=!0,$.selectedBatteryId=r.id,Q.events.emit(`battery-selected`,{id:r.id});else return $.engageHint=r.ammo<=0?`${r.def.name} IS WINCHESTER (NO AMMO)`:`CANNOT ACHIEVE INTERCEPT — ${r.def.name} TOO SLOW / TOO LATE`,Q.ui.toast($.engageHint,`warn`),!1}let s=r.def.envelope,c=a.point.y,l=Math.hypot(a.point.x,a.point.z),u=`PREDICT INTERCEPT ALT ${Md(c)} RNG ${Md(l)} — NOMINAL`;return c<s.minAlt||c>s.maxAlt||l>s.maxRange?u=`WARNING: PREDICTED POINT OUTSIDE ${r.def.name} ENVELOPE — LOW PK`:(c<s.sweetLow||c>s.sweetHigh)&&(u=`MARGINAL GEOMETRY FOR ${r.def.name} — REDUCED PK`),o&&(u=`AUTO: ${r.def.name} TAKES ${n.id} — ${u}`),$.assignments.set(n.id,r.id),$.focusTrackId=n.id,n.assignedBattery=r.id,r.pointAt(a.point),$.engageHint=u,Q.events.emit(`track-assigned`,{track:n,battery:r,sol:a}),!0}function Mp(e=$.focusTrackId??Q.radar.selectedTrackId??$.aimTrackId){let t=e?Q.radar.getTrack(e):null;if(!t||t.gone)return $.engageHint=`NO ASSIGNMENT — ASSIGN A TRACK FIRST`,!1;if(!$.assignments.has(t.id)&&!jp(t.id))return!1;$.focusTrackId=t.id;let n=Q.batteries.get($.assignments.get(t.id));if(!n.canAccept()){let e=Lp(t);if(e&&e!==n.id&&jp(t.id,e))n=Q.batteries.get(e);else return Np(t,n)}let r=n.launch(t);return r&&(t.engagedBy++,$.engageHint=`${n.def.name} FIRING ON ${t.id} — F: FIRE AGAIN  E: NEW TARGET`,Q.events.emit(`launch-authorized`,{track:t,battery:n})),r}function Np(e,t){let n=$.fireQueue.filter(e=>e.batteryId===t.id).length;if(t.ammo-n<=0)return $.engageHint=`${t.def.name} HAS NO ROUNDS LEFT TO QUEUE`,Q.ui.toast($.engageHint,`warn`),!1;if($.fireQueue.length>=12)return $.engageHint=`FIRE QUEUE FULL`,!1;$.fireQueue.push({trackId:e.id,batteryId:t.id});let r=$.fireQueue.filter(t=>t.trackId===e.id).length;return $.engageHint=`${t.def.name} CYCLING — ROUND QUEUED ON ${e.id}${r>1?` (${r} WAITING)`:``}`,Q.ui.toast(`ROUND QUEUED — ${t.def.name} WILL FIRE ON ${e.id} WHEN READY`,`info`,4),Q.events.emit(`launch-queued`,{track:e,battery:t}),!0}function Pp(){if(!$.fireQueue.length)return;let e=[],t=new Set;for(let n of $.fireQueue){let r=Q.radar.getTrack(n.trackId);if(!r||r.gone)continue;let i=Q.batteries.get(n.batteryId);if(t.has(i.id)||!i.canAccept()){e.push(n);continue}let a=Wd(i.rig.group.position,r.threat.pos,r.threat.vel,i.def.interceptor.avgSpeed);if(!a){let o=Lp(r),s=o?Q.batteries.get(o):null;if(a=s?Wd(s.rig.group.position,r.threat.pos,r.threat.vel,s.def.interceptor.avgSpeed):null,s&&a&&s.canAccept()&&!t.has(s.id))i=s,$.assignments.set(r.id,i.id),r.assignedBattery=i.id;else if(s&&a){e.push({trackId:n.trackId,batteryId:s.id});continue}else{Q.ui.toast(`QUEUED SHOT LOST — ${r.id} LEFT THE ENGAGEMENT ENVELOPE`,`warn`,5);continue}}i.pointAt(a.point),i.launch(r)?(r.engagedBy++,t.add(i.id),Q.events.emit(`launch-authorized`,{track:r,battery:i,queued:!0})):e.push(n)}$.fireQueue=e}function Fp(){let e=Q.radar.activeTracks().filter(e=>!e.classified.startsWith(`DECOY`)).sort((e,t)=>Ud(e.threat.pos,e.threat.vel,0)-Ud(t.threat.pos,t.threat.vel,0)),t=0;for(let n of e){if(n.engagedBy>0||$.fireQueue.some(e=>e.trackId===n.id))continue;let e=$.assignments.get(n.id)??Lp(n)??$.selectedBatteryId;jp(n.id,e)&&Mp(n.id)&&t++}return t>0?Q.ui.toast(`BATCH ENGAGEMENT — ${t} TRACK${t>1?`S`:``} UNDER FIRE`,`warn`,5):Q.ui.toast(`NO UNENGAGED HOSTILE TRACKS`,`info`,3),t}function Ip(){let e=null,t=1/0;for(let n of Q.radar.activeTracks()){let r=Ud(n.threat.pos,n.threat.vel,0),i=r>0?r:1e6;n.classified&&n.threat.isDecoy&&(i+=1e7),i<t&&(t=i,e=n)}return e}function Lp(e){let t=[`sentinel`,`thaad`,`patriot`],n=null;for(let r of t){let t=Q.batteries.get(r);if(!t.canAccept())continue;let i=Wd(t.rig.group.position,e.threat.pos,e.threat.vel,t.def.interceptor.avgSpeed);if(!i)continue;let a=t.def.envelope,o=i.point.y,s=Math.hypot(i.point.x,i.point.z);if(o>=a.minAlt&&o<=a.maxAlt&&s<=a.maxRange){if(o>=a.sweetLow&&o<=a.sweetHigh)return r;n??=r}}return n}var Rp={pos:new W,look:new W};{let e=Q.base.consolePos;Rp.pos.set(e.x+2.05,1.84,e.z+2.95),Rp.look.set(e.x+1.7,1.18,e.z-1)}function zp(){$.mode!==`console`&&(Hp(),Gp(`fp`),$.mode=`console`,$.consoleTransition=0,$.savedCam.pos.copy(yp.position),$.savedCam.quat.copy(yp.quaternion),Q.player.setEnabled(!1),Q.player.unlockPointer(),Q.ui.showConsole(!0),Q.ui.crosshair(!1),Q.ui.setPrompt(null))}function Bp(){$.mode===`console`&&($.mode=`freeroam`,Q.player.setEnabled(!0),Q.ui.showConsole(!1),Q.ui.crosshair(!0),um||Q.player.lockPointer())}function Vp(){$.tabletOpen||$.mode===`console`||($.tabletOpen=!0,Q.player.setEnabled(!1),Q.player.unlockPointer(),Q.ui.showTablet(!0),Q.ui.crosshair(!1),Q.ui.setPrompt(null),Q.events.emit(`ui-click`))}function Hp(){$.tabletOpen&&($.tabletOpen=!1,Q.ui.showTablet(!1),$.viewMode===`fp`&&(Q.player.setEnabled(!0),Q.ui.crosshair(!0),um||Q.player.lockPointer()))}function Up(){$.tabletOpen?Hp():Vp()}var Wp={pos:new W,look:new W,lastTargetPos:new W,lastVel:new W(0,1,0),snapped:!1};function Gp(e,t=null){if(e!==`fp`&&!t&&(e=`fp`),$.viewMode===e&&$.camTarget===t)return;$.viewMode=e,$.camTarget=t,$.camHold=0,Wp.snapped=!1;let n=e===`fp`;Q.player.setEnabled(n&&!$.tabletOpen&&$.mode===`freeroam`),Q.ui.setCinema(!n,e===`missile`?`INTERCEPTOR CAM`:`THREAT TRACK CAM`),$.mode===`freeroam`&&!$.tabletOpen&&Q.ui.crosshair(n)}function Kp(){if($.mode===`console`)return;let e=Q.interceptors.active,t=Ip();$.viewMode===`fp`?e.length?Gp(`missile`,e[e.length-1]):t?Gp(`threat`,t.threat):Q.ui.toast(`NO AIRBORNE CAMERA TARGETS`,`info`,2.5):$.viewMode===`missile`&&t?Gp(`threat`,t.threat):Gp(`fp`)}var qp=new W,Jp=new W,Yp=new W;function Xp(e){if($.viewMode===`fp`)return;let t=$.camTarget;if(t&&($.viewMode===`missile`?Q.interceptors.active.includes(t):Q.threats.active.includes(t))){t.vel.lengthSq()>1&&Wp.lastVel.copy(t.vel).normalize(),Wp.lastTargetPos.copy(t.pos);let n=$.viewMode===`missile`?26:52;Yp.crossVectors(Wp.lastVel,yp.up),Yp.lengthSq()<.05&&Yp.set(1,0,0),Yp.normalize(),Jp.copy(t.pos).addScaledVector(Wp.lastVel,-n*.62).addScaledVector(Yp,n*.78).addScaledVector(yp.up,n*.3),Jp.y=Math.max(Jp.y,3),Wp.snapped?Wp.pos.lerp(Jp,1-Math.exp(-e*4)):(Wp.pos.copy(Jp),Wp.snapped=!0),Wp.look.copy(t.pos).addScaledVector(qp.copy(Wp.lastVel),55)}else if($.camHold+=e,Wp.look.copy(Wp.lastTargetPos),$.camHold>1.6){let e=Q.interceptors.active;$.viewMode===`missile`&&e.length?Gp(`missile`,e[e.length-1]):$.viewMode===`threat`&&Ip()?Gp(`threat`,Ip().threat):Gp(`fp`);return}yp.position.copy(Wp.pos),mm.lookAt(Wp.pos,Wp.look,yp.up),yp.quaternion.setFromRotationMatrix(mm)}var Zp=new Qs,Qp=new U;gp.addEventListener(`pointerdown`,e=>{if($.mode!==`console`)return;Qp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1),Zp.setFromCamera(Qp,yp);let t=Q.radar.pickTrack(Zp);t&&(Q.radar.selectTrack(t),Q.events.emit(`ui-click`))}),window.addEventListener(`keydown`,e=>{if(e.code===`Tab`&&e.preventDefault(),!(Q.ui.settingsOpen&&e.code!==`KeyH`&&e.code!==`Escape`))switch(e.code){case`Digit1`:Ep(`patriot`);break;case`Digit2`:Ep(`thaad`);break;case`Digit3`:Ep(`sentinel`);break;case`KeyH`:Q.ui.showSettings(!Q.ui.settingsOpen);break;case`Escape`:Q.ui.settingsOpen?Q.ui.showSettings(!1):$.tabletOpen?Hp():$.viewMode===`fp`?$.mode===`console`&&Bp():Gp(`fp`);break;case`Tab`:$.mode===`console`?Bp():zp();break;case`KeyQ`:$.mode!==`console`&&Up();break;case`KeyV`:Kp();break;case`KeyE`:if($.mode===`console`){Bp();break}$.nearConsole&&!$.tabletOpen?zp():$.aimTrackId&&(Q.radar.selectTrack($.aimTrackId),jp($.aimTrackId));break;case`KeyF`:{let e=$.mode===`freeroam`&&!$.tabletOpen&&$.aimTrackId||Q.radar.selectedTrackId||$.focusTrackId||Ip()?.id;e?Mp(e):$.engageHint=`NO TRACKS TO ENGAGE`;break}case`KeyR`:$.phase===`debrief`&&(Q.ui.hideDebrief(),Ap())}}),gp.addEventListener(`pointerdown`,()=>{if(!($.mode!==`freeroam`||um||Q.ui.settingsOpen)){if($.tabletOpen){Hp();return}Q.player.lockPointer(),Q.audio.unlock()}}),Object.assign(Q.ui.handlers,{setTimeOfDay:e=>Dp(e),selectScenario:e=>Tp(e),selectBattery:e=>Ep(e),selectTrack:e=>Q.radar.selectTrack(e),start:()=>kp(),assign:()=>jp(),authorize:()=>Mp(),assignTrack:(e,t)=>jp(e,t??$.selectedBatteryId),fireTrack:e=>Mp(e),engageAll:()=>Fp(),closeTablet:()=>Hp(),exitConsole:()=>Bp(),enterConsole:()=>zp(),restart:()=>Ap(),closeToRoam:()=>{$.phase=`idle`,Bp()},enterGame:()=>{um||Q.player.lockPointer(),Q.audio.unlock()},setReducedMotion:e=>{Q.settings.reducedMotion=e,xp()},setVolume:e=>{Q.audio.setVolume(e),xp()},setMuted:e=>Q.audio.setMuted(e),setQuality:e=>{om(e),xp()}});var $p=new W,em=new W;function tm(){$.aimTrackId=null,$.nearConsole=Q.player.position.distanceTo(Q.base.consolePos)<3.2,$.nearBattery=null;for(let e of Q.batteries.list)if(Q.player.position.distanceTo(e.rig.group.position)<9){$.nearBattery=e;break}if($.mode!==`freeroam`)return;yp.getWorldDirection($p);let e=.12,t=null;for(let n of Q.radar.activeTracks()){if(em.copy(n.threat.pos).sub(yp.position),em.length()<40)continue;em.normalize();let r=em.angleTo($p);r<e&&(e=r,t=n)}if(t&&($.aimTrackId=t.id),$.nearConsole)Q.ui.setPrompt(`<span class="tp-title">FIRE DIRECTION CONSOLE</span>
[E] TAKE CONSOLE`,!0);else if($.aimTrackId){let e=Q.radar.getTrack($.aimTrackId),t=e.threat,n=Q.batteries.get($.selectedBatteryId),r=$.assignments.get(e.id);Q.ui.setPrompt(`<span class="tp-title">${e.id} · ${e.classified}</span>\nALT ${Md(t.pos.y)} · RNG ${Md(Math.hypot(t.pos.x,t.pos.z))} · SPD ${Math.round(t.vel.length())} m/s\n`+(r?`ASSIGNED TO ${Q.batteries.get(r).def.name} — [F] FIRE / SALVO`:`[E] ASSIGN ${n.def.name} · [F] QUICK FIRE`))}else if($.nearBattery){let e=$.nearBattery;Q.ui.setPrompt(`<span class="tp-title">${e.def.name}</span>\n${e.def.kind} · ${e.displayState} · ${e.ammo}/${e.def.ammo} ROUNDS`,!0)}else Q.ui.setPrompt(null)}function nm(){if(!$.autoplay||$.phase!==`active`||($.autoplayTimer-=Q.time.dt,$.autoplayTimer>0))return;$.autoplayTimer=.5;let e=Q.radar.activeTracks().filter(e=>!e.classified.startsWith(`DECOY`)&&e.engagedBy===0&&e.threat.alive).sort((e,t)=>e.threat.pos.y-t.threat.pos.y);for(let t of e){let e=Lp(t);if(e&&jp(t.id,e)){Mp();break}}}function rm(e){$.phase===`active`&&($.stats.elapsed=Q.time.now-$.scenarioStartedAt,Q.threats.allSpawned&&Q.threats.active.length===0&&Q.interceptors.active.length===0?($.endTimer<0&&($.endTimer=2.2),$.endTimer-=e,$.endTimer<=0&&($.phase=`debrief`,Gp(`fp`),Hp(),Op(),Q.events.emit(`scenario-ended`,{stats:{...$.stats}}),Q.ui.showDebrief($.stats))):$.endTimer=-1)}function im(){let e=[];for(let t of Q.radar.activeTracks()){let n=Ud(t.threat.pos,t.threat.vel,0);e.push({id:t.id,classified:t.classified,alt:t.threat.pos.y,range:Math.hypot(t.threat.pos.x,t.threat.pos.z),assignedBattery:$.assignments.get(t.id)??t.assignedBattery,engagedBy:t.engagedBy,queued:$.fireQueue.reduce((e,n)=>e+ +(n.trackId===t.id),0),impactIn:n>0?n:0})}let t=Q.batteries.list.map(e=>({id:e.id,state:e.displayState,ammo:e.ammo,maxAmmo:e.def.ammo,readyIn:Math.max(0,e.readyIn),queued:$.fireQueue.reduce((t,n)=>t+ +(n.batteryId===e.id),0),tracks:[...$.assignments].filter(([,t])=>t===e.id).map(([e])=>e)})),n=Q.batteries.get($.selectedBatteryId),r=Sp();return{mode:$.mode,phase:$.phase,scenario:$.scenario,timeOfDay:Q.weather.timeOfDay,tracks:e,batteries:t,selectedBatteryId:$.selectedBatteryId,selectedBatteryName:n.def.name,selectedBatteryReady:n.canAccept(),selectedTrackId:Q.radar.selectedTrackId,assignment:r?{trackId:r.trackId,batteryName:Q.batteries.get(r.batteryId).def.name}:null,assignments:[...$.assignments].map(([e,t])=>({trackId:e,batteryId:t})),queueCount:$.fireQueue.length,viewMode:$.viewMode,tabletOpen:$.tabletOpen,inFlight:Q.interceptors.active.length,threatsRemaining:Q.threats.active.length+Q.threats.pendingCount,inboundUndetected:Q.threats.active.length-e.length,engageHint:$.engageHint}}var am=1.75;function om(e){Q.settings.quality=e,am=e===`high`?1.75:e===`medium`?1.25:1,Q.post.setQuality(e),sm()}function sm(){let e=innerWidth,t=innerHeight,n=Math.min(devicePixelRatio||1,am);_p.setPixelRatio(n),_p.setSize(e,t),yp.aspect=e/t,yp.updateProjectionMatrix(),Q.post.setSize(e,t,n),Q.effects.setViewport(t*n,yp.fov)}window.addEventListener(`resize`,sm);var cm={emaMs:16.6,samples:0,degradeCooldown:0,fps:60};function lm(e){let t=e*1e3;cm.emaMs=cm.emaMs*.95+t*.05,cm.fps=1e3/Math.max(cm.emaMs,.001),cm.degradeCooldown-=e,!um&&cm.fps<46&&cm.degradeCooldown<=0&&Q.time.now>6&&(Q.settings.quality===`high`?(om(`medium`),cm.degradeCooldown=10,Q.ui.toast(`RENDER QUALITY → MEDIUM (AUTO)`,`info`,3)):Q.settings.quality===`medium`&&(om(`low`),cm.degradeCooldown=10,Q.ui.toast(`RENDER QUALITY → LOW (AUTO)`,`info`,3)))}var um=!1,dm=!1,fm=new W,pm=new Dt,mm=new Zt;function hm(e){if(Q.time.dt=e,Q.time.frame++,Q.weather.update(e),Q.player.update($.mode===`freeroam`?e:0),$.mode===`console`){$.consoleTransition=Math.min(1,$.consoleTransition+e*2.4);let t=$.consoleTransition,n=t*t*(3-2*t);fm.copy(Rp.pos),mm.lookAt(Rp.pos,Rp.look,yp.up),pm.setFromRotationMatrix(mm),yp.position.lerpVectors($.savedCam.pos,fm,n),yp.quaternion.slerpQuaternions($.savedCam.quat,pm,n)}let t=e>.034?Math.min(12,Math.ceil(e/.034)):1,n=e/t;for(let e=0;e<t;e++)Q.time.now+=n,Q.base.update(n,Q.time.now),Q.batteries.update(n),Q.threats.update(n),Q.interceptors.update(n),Q.radar.update(n),Q.effects.update(n,Q.time.now);Q.audio.update(e),Pp(),Xp(e),tm(),nm(),rm(e),Q.ui.update(im())}var gm=performance.now();function _m(){let e=performance.now(),t=(e-gm)/1e3;gm=e,t=Cd(t,0,.1),Q.time.unscaledDt=t;let n=dm?0:t*Q.time.timeScale;hm(n),_p.info.reset(),Q.post.render(n),lm(t)}_p.setAnimationLoop(_m),sm(),om(Q.settings.quality),window.__game={ready:!0,version:hp,ctx:Q,state(){return{mode:$.mode,phase:$.phase,scenario:$.scenario,timeOfDay:Q.weather.timeOfDay,time:Q.time.now,player:{x:Q.player.position.x,y:Q.player.position.y,z:Q.player.position.z},tracks:Q.radar.activeTracks().map(e=>({id:e.id,classified:e.classified,alt:Math.round(e.threat.pos.y),range:Math.round(Math.hypot(e.threat.pos.x,e.threat.pos.z)),x:Math.round(e.threat.pos.x),z:Math.round(e.threat.pos.z),decoy:e.threat.isDecoy,assigned:e.assignedBattery,engagedBy:e.engagedBy})),threatsActive:Q.threats.active.length,threatsPending:Q.threats.pendingCount,interceptors:Q.interceptors.active.map(e=>({id:e.id,phase:e.phase,alt:Math.round(e.pos.y),x:Math.round(e.pos.x),z:Math.round(e.pos.z)})),batteries:Q.batteries.list.map(e=>({id:e.id,state:e.displayState,ammo:e.ammo})),assignment:Sp(),assignments:[...$.assignments].map(([e,t])=>({trackId:e,batteryId:t})),fireQueue:$.fireQueue.map(e=>({...e})),viewMode:$.viewMode,tabletOpen:$.tabletOpen,stats:{...$.stats},autoplay:$.autoplay,engageHint:$.engageHint,lastIntercept:$.lastIntercept??null,nearConsole:$.nearConsole}},perf(){return{fps:Math.round(cm.fps*10)/10,ms:Math.round(cm.emaMs*100)/100,calls:_p.info.render.calls,triangles:_p.info.render.triangles,geometries:_p.info.memory.geometries,textures:_p.info.memory.textures,programs:_p.info.programs?.length??0,quality:Q.settings.quality}},testMode(){return um=!0,document.body.classList.add(`test-driver`),Q.ui.hideIntro(),Q.audio.setMuted(!0),!0},seed(e){return $.seed=e,e},start(e,t={}){return Tp(e),t.timeOfDay&&Dp(t.timeOfDay),kp(t)},restart(){Ap()},stopScenario(){Q.threats.clear(),Q.interceptors.clear(),Q.ui.hideDebrief(),$.assignments.clear(),$.fireQueue.length=0,$.focusTrackId=null,Gp(`fp`),$.phase=`idle`,Op()},selectBattery(e){Ep(e)},selectTrack(e){Q.radar.selectTrack(e)},assign(e,t){return jp(e,t)},authorize(e){return Mp(e)},engageAll(){return Fp()},openTablet(){Vp()},closeTablet(){Hp()},setView(e){return e===`fp`?Gp(`fp`):e===`missile`?Gp(`missile`,Q.interceptors.active.at(-1)??null):e===`threat`&&Gp(`threat`,Ip()?.threat??null),$.viewMode},cycleView(){return Kp(),$.viewMode},autoplay(e=!0){return $.autoplay=e,e},openConsole(){zp(),$.consoleTransition=.999},closeConsole(){Bp()},setTimeOfDay(e){Dp(e)},teleport(e,t,n,r=0,i=0){Q.player.teleport(e,t,n,r,i)},lookAt(e,t,n){let r=Q.player.state,i=e-yp.position.x,a=t-yp.position.y,o=n-yp.position.z;r.yaw=Math.atan2(-i,-o),r.pitch=Math.atan2(a,Math.hypot(i,o)),Q.player.update(0)},timeScale(e){return Q.time.timeScale=e,e},pause(e=!0){return dm=e,dm},step(e=1,t=16.667){for(let n=0;n<e;n++)hm(t/1e3);return _p.info.reset(),Q.post.render(t/1e3),Q.time.now},setReducedMotion(e){Q.settings.reducedMotion=e},setQuality(e){om(e)},mute(){Q.audio.setMuted(!0)}},console.info(`[IRONVEIL] ready — fictional interceptor base demo v0.1.0`);