(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1e3,t=1001,n=1002,r=1003,i=1004,a=1005,o=1006,s=1007,c=1008,l=1009,u=1010,d=1011,f=1012,p=1013,m=1014,h=1015,g=1016,_=1017,v=1018,y=1020,b=35902,x=35899,S=1021,C=1022,w=1023,T=1026,E=1027,D=1028,O=1029,k=1030,A=1031,j=1033,M=33776,N=33777,ee=33778,te=33779,P=35840,ne=35841,re=35842,ie=35843,ae=36196,F=37492,I=37496,oe=37488,L=37489,se=37490,ce=37491,le=37808,ue=37809,de=37810,fe=37811,pe=37812,me=37813,he=37814,ge=37815,_e=37816,ve=37817,ye=37818,be=37819,xe=37820,Se=37821,Ce=36492,we=36494,Te=36495,Ee=36283,De=36284,Oe=36285,ke=36286,Ae=2300,R=2301,je=2302,Me=2303,Ne=2400,z=2401,Pe=2402,Fe=3200,Ie=`srgb`,Le=`srgb-linear`,Re=`linear`,ze=`srgb`,Be=7680,Ve=35044,He=35048,Ue=2e3;function We(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function Ge(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function Ke(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function qe(){let e=Ke(`canvas`);return e.style.display=`block`,e}var Je={};function Ye(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function Xe(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function B(...e){e=Xe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function V(...e){e=Xe(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function Ze(...e){let t=e.join(` `);t in Je||(Je[t]=!0,B(...e))}function Qe(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var $e={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},et=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},tt=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),nt=1234567,rt=Math.PI/180,it=180/Math.PI;function at(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(tt[e&255]+tt[e>>8&255]+tt[e>>16&255]+tt[e>>24&255]+`-`+tt[t&255]+tt[t>>8&255]+`-`+tt[t>>16&15|64]+tt[t>>24&255]+`-`+tt[n&63|128]+tt[n>>8&255]+`-`+tt[n>>16&255]+tt[n>>24&255]+tt[r&255]+tt[r>>8&255]+tt[r>>16&255]+tt[r>>24&255]).toLowerCase()}function H(e,t,n){return Math.max(t,Math.min(n,e))}function ot(e,t){return(e%t+t)%t}function st(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function ct(e,t,n){return e===t?0:(n-e)/(t-e)}function lt(e,t,n){return(1-n)*e+n*t}function ut(e,t,n,r){return lt(e,t,1-Math.exp(-n*r))}function dt(e,t=1){return t-Math.abs(ot(e,t*2)-t)}function ft(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function pt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function mt(e,t){return e+Math.floor(Math.random()*(t-e+1))}function ht(e,t){return e+Math.random()*(t-e)}function gt(e){return e*(.5-Math.random())}function _t(e){e!==void 0&&(nt=e);let t=nt+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function vt(e){return e*rt}function yt(e){return e*it}function bt(e){return!(e&e-1)&&e!==0}function xt(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function St(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Ct(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:B(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function wt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function Tt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var Et={DEG2RAD:rt,RAD2DEG:it,generateUUID:at,clamp:H,euclideanModulo:ot,mapLinear:st,inverseLerp:ct,lerp:lt,damp:ut,pingpong:dt,smoothstep:ft,smootherstep:pt,randInt:mt,randFloat:ht,randFloatSpread:gt,seededRandom:_t,degToRad:vt,radToDeg:yt,isPowerOfTwo:bt,ceilPowerOfTwo:xt,floorPowerOfTwo:St,setQuaternionFromProperEuler:Ct,normalize:Tt,denormalize:wt},U=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=H(this.x,e.x,t.x),this.y=H(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=H(this.x,e,t),this.y=H(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(H(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(H(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Dt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:B(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(H(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},W=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(kt.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(kt.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=H(this.x,e.x,t.x),this.y=H(this.y,e.y,t.y),this.z=H(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=H(this.x,e,t),this.y=H(this.y,e,t),this.z=H(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(H(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ot.copy(this).projectOnVector(e),this.sub(Ot)}reflect(e){return this.sub(Ot.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(H(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Ot=new W,kt=new Dt,At=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return Ze(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(jt.makeScale(e,t)),this}rotate(e){return Ze(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(jt.makeRotation(-e)),this}translate(e,t){return Ze(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(jt.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},jt=new At,Mt=new At().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Nt=new At().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Pt(){let e={enabled:!0,workingColorSpace:Le,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=It(e.r),e.g=It(e.g),e.b=It(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Lt(e.r),e.g=Lt(e.g),e.b=Lt(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Re:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return Ze(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return Ze(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Le]:{primaries:t,whitePoint:r,transfer:Re,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ie},outputColorSpaceConfig:{drawingBufferColorSpace:Ie}},[Ie]:{primaries:t,whitePoint:r,transfer:ze,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ie}}}),e}var Ft=Pt();function It(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Lt(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Rt,zt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Rt===void 0&&(Rt=Ke(`canvas`)),Rt.width=e.width,Rt.height=e.height;let t=Rt.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Rt}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=Ke(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=It(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(It(t[e]/255)*255):t[e]=It(t[e]);return{data:t,width:e.width,height:e.height}}return B(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Bt=0,Vt=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Bt++}),this.uuid=at(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Ht(r[t].image)):e.push(Ht(r[t]))}else e=Ht(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Ht(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?zt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(B(`Texture: Unable to serialize Texture.`),{})}var Ut=0,Wt=new W,Gt=class r extends et{constructor(e=r.DEFAULT_IMAGE,n=r.DEFAULT_MAPPING,i=t,a=t,s=o,u=c,d=w,f=l,p=r.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ut++}),this.uuid=at(),this.name=``,this.source=new Vt(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=a,this.magFilter=s,this.minFilter=u,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=f,this.offset=new U(0,0),this.repeat=new U(1,1),this.center=new U(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new At,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Wt).x}get height(){return this.source.getSize(Wt).y}get depth(){return this.source.getSize(Wt).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){B(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(r){if(this.mapping!==300)return r;if(r.applyMatrix3(this.matrix),r.x<0||r.x>1)switch(this.wrapS){case e:r.x-=Math.floor(r.x);break;case t:r.x=r.x<0?0:1;break;case n:Math.abs(Math.floor(r.x)%2)===1?r.x=Math.ceil(r.x)-r.x:r.x-=Math.floor(r.x)}if(r.y<0||r.y>1)switch(this.wrapT){case e:r.y-=Math.floor(r.y);break;case t:r.y=r.y<0?0:1;break;case n:Math.abs(Math.floor(r.y)%2)===1?r.y=Math.ceil(r.y)-r.y:r.y-=Math.floor(r.y)}return this.flipY&&(r.y=1-r.y),r}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Gt.DEFAULT_IMAGE=null,Gt.DEFAULT_MAPPING=300,Gt.DEFAULT_ANISOTROPY=1;var Kt=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=H(this.x,e.x,t.x),this.y=H(this.y,e.y,t.y),this.z=H(this.z,e.z,t.z),this.w=H(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=H(this.x,e,t),this.y=H(this.y,e,t),this.z=H(this.z,e,t),this.w=H(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(H(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},qt=class extends et{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:o,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Kt(0,0,e,t),this.scissorTest=!1,this.viewport=new Kt(0,0,e,t),this.textures=[];let r=new Gt({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:o,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Vt(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},Jt=class extends qt{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Yt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Xt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Zt=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Qt.setFromMatrixColumn(e,0).length(),i=1/Qt.setFromMatrixColumn(e,1).length(),a=1/Qt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(en,e,tn)}lookAt(e,t,n){let r=this.elements;return an.subVectors(e,t),an.lengthSq()===0&&(an.z=1),an.normalize(),nn.crossVectors(n,an),nn.lengthSq()===0&&(Math.abs(n.z)===1?an.x+=1e-4:an.z+=1e-4,an.normalize(),nn.crossVectors(n,an)),nn.normalize(),rn.crossVectors(an,nn),r[0]=nn.x,r[4]=rn.x,r[8]=an.x,r[1]=nn.y,r[5]=rn.y,r[9]=an.y,r[2]=nn.z,r[6]=rn.z,r[10]=an.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],ee=r[7],te=r[11],P=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*ee,i[8]=a*C+o*D+s*j+c*te,i[12]=a*w+o*O+s*M+c*P,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*ee,i[9]=l*C+u*D+d*j+f*te,i[13]=l*w+u*O+d*M+f*P,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*ee,i[10]=p*C+m*D+h*j+g*te,i[14]=p*w+m*O+h*M+g*P,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*ee,i[11]=_*C+v*D+y*j+b*te,i[15]=_*w+v*O+y*M+b*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Qt.set(r[0],r[1],r[2]).length(),o=Qt.set(r[4],r[5],r[6]).length(),s=Qt.set(r[8],r[9],r[10]).length();i<0&&(a=-a),$t.copy(this);let c=1/a,l=1/o,u=1/s;return $t.elements[0]*=c,$t.elements[1]*=c,$t.elements[2]*=c,$t.elements[4]*=l,$t.elements[5]*=l,$t.elements[6]*=l,$t.elements[8]*=u,$t.elements[9]*=u,$t.elements[10]*=u,t.setFromRotationMatrix($t),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Ue,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Ue,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Qt=new W,$t=new Zt,en=new W(0,0,0),tn=new W(1,1,1),nn=new W,rn=new W,an=new W,on=new Zt,sn=new Dt,cn=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(H(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-H(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(H(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-H(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(H(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-H(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:B(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return on.makeRotationFromQuaternion(e),this.setFromRotationMatrix(on,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return sn.setFromEuler(this),this.setFromQuaternion(sn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};cn.DEFAULT_ORDER=`XYZ`;var ln=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},un=0,dn=new W,fn=new Dt,pn=new Zt,mn=new W,hn=new W,gn=new W,_n=new Dt,vn=new W(1,0,0),yn=new W(0,1,0),bn=new W(0,0,1),xn={type:`added`},Sn={type:`removed`},Cn={type:`childadded`,child:null},wn={type:`childremoved`,child:null},Tn=class e extends et{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:un++}),this.uuid=at(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new W,n=new cn,r=new Dt,i=new W(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Zt},normalMatrix:{value:new At}}),this.matrix=new Zt,this.matrixWorld=new Zt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ln,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.multiply(fn),this}rotateOnWorldAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.premultiply(fn),this}rotateX(e){return this.rotateOnAxis(vn,e)}rotateY(e){return this.rotateOnAxis(yn,e)}rotateZ(e){return this.rotateOnAxis(bn,e)}translateOnAxis(e,t){return dn.copy(e).applyQuaternion(this.quaternion),this.position.add(dn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(vn,e)}translateY(e){return this.translateOnAxis(yn,e)}translateZ(e){return this.translateOnAxis(bn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?mn.copy(e):mn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),hn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pn.lookAt(hn,mn,this.up):pn.lookAt(mn,hn,this.up),this.quaternion.setFromRotationMatrix(pn),r&&(pn.extractRotation(r.matrixWorld),fn.setFromRotationMatrix(pn),this.quaternion.premultiply(fn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(V(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null):V(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Sn),wn.child=e,this.dispatchEvent(wn),wn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pn.multiply(e.parent.matrixWorld)),e.applyMatrix4(pn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,e,gn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,_n,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};Tn.DEFAULT_UP=new W(0,1,0),Tn.DEFAULT_MATRIX_AUTO_UPDATE=!0,Tn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var En=class extends Tn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Dn={type:`move`},On=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new En,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new En,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new W,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new W),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new En,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new W,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new W,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Dn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new En;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},kn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},An={h:0,s:0,l:0},jn={h:0,s:0,l:0};function Mn(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var G=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ie){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ft.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ft.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ft.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ft.workingColorSpace){if(e=ot(e,1),t=H(t,0,1),n=H(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Mn(i,r,e+1/3),this.g=Mn(i,r,e),this.b=Mn(i,r,e-1/3)}return Ft.colorSpaceToWorking(this,r),this}setStyle(e,t=Ie){function n(t){t!==void 0&&parseFloat(t)<1&&B(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:B(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);B(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ie){let n=kn[e.toLowerCase()];return n===void 0?B(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=It(e.r),this.g=It(e.g),this.b=It(e.b),this}copyLinearToSRGB(e){return this.r=Lt(e.r),this.g=Lt(e.g),this.b=Lt(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ie){return Ft.workingToColorSpace(Nn.copy(this),e),Math.round(H(Nn.r*255,0,255))*65536+Math.round(H(Nn.g*255,0,255))*256+Math.round(H(Nn.b*255,0,255))}getHexString(e=Ie){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ft.workingColorSpace){Ft.workingToColorSpace(Nn.copy(this),t);let n=Nn.r,r=Nn.g,i=Nn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ft.workingColorSpace){return Ft.workingToColorSpace(Nn.copy(this),t),e.r=Nn.r,e.g=Nn.g,e.b=Nn.b,e}getStyle(e=Ie){Ft.workingToColorSpace(Nn.copy(this),e);let t=Nn.r,n=Nn.g,r=Nn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(An),this.setHSL(An.h+e,An.s+t,An.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(An),e.getHSL(jn);let n=lt(An.h,jn.h,t),r=lt(An.s,jn.s,t),i=lt(An.l,jn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Nn=new G;G.NAMES=kn;var Pn=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new G(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Fn=class extends Tn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new cn,this.environmentIntensity=1,this.environmentRotation=new cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},In=new W,Ln=new W,Rn=new W,zn=new W,Bn=new W,Vn=new W,Hn=new W,Un=new W,Wn=new W,Gn=new W,Kn=new Kt,qn=new Kt,Jn=new Kt,Yn=class e{constructor(e=new W,t=new W,n=new W){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),In.subVectors(e,t),r.cross(In);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){In.subVectors(r,t),Ln.subVectors(n,t),Rn.subVectors(e,t);let a=In.dot(In),o=In.dot(Ln),s=In.dot(Rn),c=Ln.dot(Ln),l=Ln.dot(Rn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,zn)!==null&&zn.x>=0&&zn.y>=0&&zn.x+zn.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,zn)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,zn.x),s.addScaledVector(a,zn.y),s.addScaledVector(o,zn.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Kn.setScalar(0),qn.setScalar(0),Jn.setScalar(0),Kn.fromBufferAttribute(e,t),qn.fromBufferAttribute(e,n),Jn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Kn,i.x),a.addScaledVector(qn,i.y),a.addScaledVector(Jn,i.z),a}static isFrontFacing(e,t,n,r){return In.subVectors(n,t),Ln.subVectors(e,t),In.cross(Ln).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return In.subVectors(this.c,this.b),Ln.subVectors(this.a,this.b),In.cross(Ln).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Bn.subVectors(r,n),Vn.subVectors(i,n),Un.subVectors(e,n);let s=Bn.dot(Un),c=Vn.dot(Un);if(s<=0&&c<=0)return t.copy(n);Wn.subVectors(e,r);let l=Bn.dot(Wn),u=Vn.dot(Wn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Bn,a);Gn.subVectors(e,i);let f=Bn.dot(Gn),p=Vn.dot(Gn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Vn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Hn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Hn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Bn,a).addScaledVector(Vn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Xn=class{constructor(e=new W(1/0,1/0,1/0),t=new W(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Qn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Qn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Qn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Qn):Qn.fromBufferAttribute(r,t),Qn.applyMatrix4(e.matrixWorld),this.expandByPoint(Qn);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),$n.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),$n.copy(e.boundingBox)),$n.applyMatrix4(e.matrixWorld),this.union($n)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Qn),Qn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(or),sr.subVectors(this.max,or),er.subVectors(e.a,or),tr.subVectors(e.b,or),nr.subVectors(e.c,or),rr.subVectors(tr,er),ir.subVectors(nr,tr),ar.subVectors(er,nr);let t=[0,-rr.z,rr.y,0,-ir.z,ir.y,0,-ar.z,ar.y,rr.z,0,-rr.x,ir.z,0,-ir.x,ar.z,0,-ar.x,-rr.y,rr.x,0,-ir.y,ir.x,0,-ar.y,ar.x,0];return!ur(t,er,tr,nr,sr)||(t=[1,0,0,0,1,0,0,0,1],!ur(t,er,tr,nr,sr))?!1:(cr.crossVectors(rr,ir),t=[cr.x,cr.y,cr.z],ur(t,er,tr,nr,sr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Qn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Qn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Zn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Zn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Zn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Zn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Zn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Zn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Zn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Zn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Zn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Zn=[new W,new W,new W,new W,new W,new W,new W,new W],Qn=new W,$n=new Xn,er=new W,tr=new W,nr=new W,rr=new W,ir=new W,ar=new W,or=new W,sr=new W,cr=new W,lr=new W;function ur(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){lr.fromArray(e,a);let o=i.x*Math.abs(lr.x)+i.y*Math.abs(lr.y)+i.z*Math.abs(lr.z),s=t.dot(lr),c=n.dot(lr),l=r.dot(lr);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var dr=new W,fr=new U,pr=0,mr=class extends et{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:pr++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Ve,this.updateRanges=[],this.gpuType=h,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)fr.fromBufferAttribute(this,t),fr.applyMatrix3(e),this.setXY(t,fr.x,fr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix3(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix4(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyNormalMatrix(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.transformDirection(e),this.setXYZ(t,dr.x,dr.y,dr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=wt(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=wt(t,this.array)),t}setX(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=wt(t,this.array)),t}setY(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=wt(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=wt(t,this.array)),t}setW(e,t){return this.normalized&&(t=Tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array),i=Tt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:`dispose`})}},hr=class extends mr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},gr=class extends mr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},_r=class extends mr{constructor(e,t,n){super(new Float32Array(e),t,n)}},vr=new Xn,yr=new W,br=new W,xr=class{constructor(e=new W,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?vr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yr.subVectors(e,this.center);let t=yr.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(yr,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(br.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yr.copy(e.center).add(br)),this.expandByPoint(yr.copy(e.center).sub(br))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Sr=0,Cr=new Zt,wr=new Tn,Tr=new W,Er=new Xn,Dr=new Xn,Or=new W,kr=class e extends et{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Sr++}),this.uuid=at(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(We(e)?gr:hr)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new At().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Cr.makeRotationFromQuaternion(e),this.applyMatrix4(Cr),this}rotateX(e){return Cr.makeRotationX(e),this.applyMatrix4(Cr),this}rotateY(e){return Cr.makeRotationY(e),this.applyMatrix4(Cr),this}rotateZ(e){return Cr.makeRotationZ(e),this.applyMatrix4(Cr),this}translate(e,t,n){return Cr.makeTranslation(e,t,n),this.applyMatrix4(Cr),this}scale(e,t,n){return Cr.makeScale(e,t,n),this.applyMatrix4(Cr),this}lookAt(e){return wr.lookAt(e),wr.updateMatrix(),this.applyMatrix4(wr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Tr).negate(),this.translate(Tr.x,Tr.y,Tr.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new _r(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&B(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new W(-1/0,-1/0,-1/0),new W(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Er.setFromBufferAttribute(n),this.morphTargetsRelative?(Or.addVectors(this.boundingBox.min,Er.min),this.boundingBox.expandByPoint(Or),Or.addVectors(this.boundingBox.max,Er.max),this.boundingBox.expandByPoint(Or)):(this.boundingBox.expandByPoint(Er.min),this.boundingBox.expandByPoint(Er.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&V(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new xr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new W,1/0);return}if(e){let n=this.boundingSphere.center;if(Er.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Dr.setFromBufferAttribute(n),this.morphTargetsRelative?(Or.addVectors(Er.min,Dr.min),Er.expandByPoint(Or),Or.addVectors(Er.max,Dr.max),Er.expandByPoint(Or)):(Er.expandByPoint(Dr.min),Er.expandByPoint(Dr.max))}Er.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Or.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Or));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Or.fromBufferAttribute(a,t),o&&(Tr.fromBufferAttribute(e,t),Or.add(Tr)),r=Math.max(r,n.distanceToSquared(Or))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&V(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){V(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new mr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new W,s[e]=new W;let c=new W,l=new W,u=new W,d=new U,f=new U,p=new U,m=new W,h=new W;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new W,y=new W,b=new W,x=new W;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new mr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new W,i=new W,a=new W,o=new W,s=new W,c=new W,l=new W,u=new W;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Or.fromBufferAttribute(e,t),Or.normalize(),e.setXYZ(t,Or.x,Or.y,Or.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new mr(a,r,i)}if(this.index===null)return B(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Ar=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=Ve,this.updateRanges=[],this.version=0,this.uuid=at()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=at()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=at()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},jr=new W,Mr=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.applyMatrix4(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.applyNormalMatrix(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)jr.fromBufferAttribute(this,t),jr.transformDirection(e),this.setXYZ(t,jr.x,jr.y,jr.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=wt(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=wt(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=wt(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=wt(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=wt(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Tt(t,this.array),n=Tt(n,this.array),r=Tt(r,this.array),i=Tt(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){Ye(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new mr(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Ye(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Nr=0,Pr=class extends et{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Nr++}),this.uuid=at(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new G(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Be,this.stencilZFail=Be,this.stencilZPass=Be,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){B(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new G().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new U().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new U().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Fr=class extends Pr{constructor(e){super(),this.isSpriteMaterial=!0,this.type=`SpriteMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ir,Lr=new W,Rr=new W,zr=new W,Br=new U,Vr=new U,Hr=new Zt,Ur=new W,Wr=new W,Gr=new W,Kr=new U,qr=new U,Jr=new U,Yr=class extends Tn{constructor(e=new Fr){if(super(),this.isSprite=!0,this.type=`Sprite`,Ir===void 0){Ir=new kr;let e=new Ar(new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),5);Ir.setIndex([0,1,2,0,2,3]),Ir.setAttribute(`position`,new Mr(e,3,0,!1)),Ir.setAttribute(`uv`,new Mr(e,2,3,!1))}this.geometry=Ir,this.material=e,this.center=new U(.5,.5),this.count=1}raycast(e,t){e.camera===null&&V(`Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.`),Rr.setFromMatrixScale(this.matrixWorld),Hr.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),zr.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Rr.multiplyScalar(-zr.z);let n=this.material.rotation,r,i;n!==0&&(i=Math.cos(n),r=Math.sin(n));let a=this.center;Xr(Ur.set(-.5,-.5,0),zr,a,Rr,r,i),Xr(Wr.set(.5,-.5,0),zr,a,Rr,r,i),Xr(Gr.set(.5,.5,0),zr,a,Rr,r,i),Kr.set(0,0),qr.set(1,0),Jr.set(1,1);let o=e.ray.intersectTriangle(Ur,Wr,Gr,!1,Lr);if(o===null&&(Xr(Wr.set(-.5,.5,0),zr,a,Rr,r,i),qr.set(0,1),o=e.ray.intersectTriangle(Ur,Gr,Wr,!1,Lr),o===null))return;let s=e.ray.origin.distanceTo(Lr);s<e.near||s>e.far||t.push({distance:s,point:Lr.clone(),uv:Yn.getInterpolation(Lr,Ur,Wr,Gr,Kr,qr,Jr,new U),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function Xr(e,t,n,r,i,a){Br.subVectors(e,n).addScalar(.5).multiply(r),i===void 0?Vr.copy(Br):(Vr.x=a*Br.x-i*Br.y,Vr.y=i*Br.x+a*Br.y),e.copy(t),e.x+=Vr.x,e.y+=Vr.y,e.applyMatrix4(Hr)}var Zr=new W,Qr=new W,$r=new W,ei=new W,ti=new W,ni=new W,ri=new W,ii=class{constructor(e=new W,t=new W(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Zr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Zr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Zr.copy(this.origin).addScaledVector(this.direction,t),Zr.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Qr.copy(e).add(t).multiplyScalar(.5),$r.copy(t).sub(e).normalize(),ei.copy(this.origin).sub(Qr);let i=e.distanceTo(t)*.5,a=-this.direction.dot($r),o=ei.dot(this.direction),s=-ei.dot($r),c=ei.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Qr).addScaledVector($r,d),f}intersectSphere(e,t){Zr.subVectors(e.center,this.origin);let n=Zr.dot(this.direction),r=Zr.dot(Zr)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Zr)!==null}intersectTriangle(e,t,n,r,i){ti.subVectors(t,e),ni.subVectors(n,e),ri.crossVectors(ti,ni);let a=this.direction.dot(ri),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;ei.subVectors(this.origin,e);let s=o*this.direction.dot(ni.crossVectors(ei,ni));if(s<0)return null;let c=o*this.direction.dot(ti.cross(ei));if(c<0||s+c>a)return null;let l=-o*ei.dot(ri);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ai=class extends Pr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new G(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},oi=new Zt,si=new ii,ci=new xr,li=new W,ui=new W,di=new W,fi=new W,pi=new W,mi=new W,hi=new W,gi=new W,K=class extends Tn{constructor(e=new kr,t=new ai){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){mi.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(pi.fromBufferAttribute(s,e),a?mi.addScaledVector(pi,r):mi.addScaledVector(pi.sub(t),r))}t.add(mi)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ci.copy(n.boundingSphere),ci.applyMatrix4(i),si.copy(e.ray).recast(e.near),!(ci.containsPoint(si.origin)===!1&&(si.intersectSphere(ci,li)===null||si.origin.distanceToSquared(li)>(e.far-e.near)**2))&&(oi.copy(i).invert(),si.copy(e.ray).applyMatrix4(oi),(n.boundingBox===null||si.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,si)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=vi(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=vi(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=vi(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=vi(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function _i(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;gi.copy(s),gi.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(gi);return l<n.near||l>n.far?null:{distance:l,point:gi.clone(),object:e}}function vi(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,ui),e.getVertexPosition(c,di),e.getVertexPosition(l,fi);let u=_i(e,t,n,r,ui,di,fi,hi);if(u){let e=new W;Yn.getBarycoord(hi,ui,di,fi,e),i&&(u.uv=Yn.getInterpolatedAttribute(i,s,c,l,e,new U)),a&&(u.uv1=Yn.getInterpolatedAttribute(a,s,c,l,e,new U)),o&&(u.normal=Yn.getInterpolatedAttribute(o,s,c,l,e,new W),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new W,materialIndex:0};Yn.getNormal(ui,di,fi,t.normal),u.face=t,u.barycoord=e}return u}var yi=class extends Gt{constructor(e=null,t=1,n=1,i,a,o,s,c,l=r,u=r,d,f){super(null,o,s,c,l,u,i,a,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},bi=class extends mr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},xi=new Zt,Si=new Zt,Ci=[],wi=new Xn,Ti=new Zt,Ei=new K,Di=new xr,Oi=class extends K{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new bi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Ti)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Xn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,xi),wi.copy(e.boundingBox).applyMatrix4(xi),this.boundingBox.union(wi)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new xr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,xi),Di.copy(e.boundingSphere).applyMatrix4(xi),this.boundingSphere.union(Di)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(Ei.geometry=this.geometry,Ei.material=this.material,Ei.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Di.copy(this.boundingSphere),Di.applyMatrix4(n),e.ray.intersectsSphere(Di)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,xi),Si.multiplyMatrices(n,xi),Ei.matrixWorld=Si,Ei.raycast(e,Ci);for(let e=0,n=Ci.length;e<n;e++){let n=Ci[e];n.instanceId=i,n.object=this,t.push(n)}Ci.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new bi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new yi(new Float32Array(r*this.count),r,this.count,D,h));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},ki=new W,Ai=new W,ji=new At,Mi=class{constructor(e=new W(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=ki.subVectors(n,t).cross(Ai.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(ki),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ji.getNormalMatrix(e),r=this.coplanarPoint(ki).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ni=new xr,Pi=new U(.5,.5),Fi=new W,Ii=class{constructor(e=new Mi,t=new Mi,n=new Mi,r=new Mi,i=new Mi,a=new Mi){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Ue,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ni.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ni.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ni)}intersectsSprite(e){return Ni.center.set(0,0,0),Ni.radius=.7071067811865476+Pi.distanceTo(e.center),Ni.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ni)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Fi.x=r.normal.x>0?e.max.x:e.min.x,Fi.y=r.normal.y>0?e.max.y:e.min.y,Fi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Fi)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Li=class extends Pr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new G(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ri=new W,zi=new W,Bi=new Zt,Vi=new ii,Hi=new xr,Ui=new W,Wi=new W,Gi=class extends Tn{constructor(e=new kr,t=new Li){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Ri.fromBufferAttribute(t,e-1),zi.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Ri.distanceTo(zi);e.setAttribute(`lineDistance`,new _r(n,1))}else B(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Hi.copy(n.boundingSphere),Hi.applyMatrix4(r),Hi.radius+=i,e.ray.intersectsSphere(Hi)===!1)return;Bi.copy(r).invert(),Vi.copy(e.ray).applyMatrix4(Bi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=Ki(this,e,Vi,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=Ki(this,e,Vi,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=Ki(this,e,Vi,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=Ki(this,e,Vi,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Ki(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Ri.fromBufferAttribute(s,i),zi.fromBufferAttribute(s,a),n.distanceSqToSegment(Ri,zi,Ui,Wi)>r)return;Ui.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Ui);if(!(c<t.near||c>t.far))return{distance:c,point:Wi.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var qi=new W,Ji=new W,Yi=class extends Gi{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)qi.fromBufferAttribute(t,e),Ji.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+qi.distanceTo(Ji);e.setAttribute(`lineDistance`,new _r(n,1))}else B(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},Xi=class extends Pr{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Zi=new Zt,Qi=new ii,$i=new xr,ea=new W,ta=class extends Tn{constructor(e=new kr,t=new Xi){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),$i.copy(n.boundingSphere),$i.applyMatrix4(r),$i.radius+=i,e.ray.intersectsSphere($i)===!1)return;Zi.copy(r).invert(),Qi.copy(e.ray).applyMatrix4(Zi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);ea.fromBufferAttribute(l,n),na(ea,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)ea.fromBufferAttribute(l,a),na(ea,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function na(e,t,n,r,i,a,o){let s=Qi.distanceSqToPoint(e);if(s<n){let n=new W;Qi.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ra=class extends Gt{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},ia=class extends Gt{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},aa=class extends Gt{constructor(e,t,n=m,i,a,o,s=r,c=r,l,u=T,d=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:d},i,a,o,s,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Vt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},oa=class extends aa{constructor(e,t=m,n=301,i,a,o=r,s=r,c,l=T){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,i,a,o,s,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},sa=class extends Gt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},q=class e extends kr{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new _r(c,3)),this.setAttribute(`normal`,new _r(l,3)),this.setAttribute(`uv`,new _r(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new W;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},ca=class e extends kr{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new W,g=new W;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new _r(o,3)),this.setAttribute(`normal`,new _r(s,3)),this.setAttribute(`uv`,new _r(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},la=class e extends kr{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new W,l=new U;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new _r(a,3)),this.setAttribute(`normal`,new _r(o,3)),this.setAttribute(`uv`,new _r(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},ua=class e extends kr{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new _r(u,3)),this.setAttribute(`normal`,new _r(d,3)),this.setAttribute(`uv`,new _r(f,2));function _(){let a=new W,_=new W,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new U,m=new W,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},da=class e extends ua{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},fa=class e extends kr{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new _r(i,3)),this.setAttribute(`normal`,new _r(i.slice(),3)),this.setAttribute(`uv`,new _r(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new W,r=new W,i=new W;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new W;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new W;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new W,t=new W,n=new W,r=new W,o=new U,s=new U,c=new U;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},pa=class e extends fa{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n,i=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r];super(i,[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type=`DodecahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},ma=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){B(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new U:new W);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new W,r=[],i=[],a=[],o=new W,s=new Zt;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new W)}i[0]=new W,a[0]=new W;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(H(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(H(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},ha=class extends ma{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new U){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},ga=class extends ha{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function _a(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var va=new W,ya=new W,ba=new _a,xa=new _a,Sa=new _a,Ca=class extends ma{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new W){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(ya.subVectors(r[0],r[1]).add(r[0]),c=ya);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(va.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=va),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),ba.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),xa.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),Sa.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(ba.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),xa.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),Sa.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(ba.calc(s),xa.calc(s),Sa.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new W().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function wa(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function Ta(e,t){let n=1-e;return n*n*t}function Ea(e,t){return 2*(1-e)*e*t}function Da(e,t){return e*e*t}function Oa(e,t,n,r){return Ta(e,t)+Ea(e,n)+Da(e,r)}function ka(e,t){let n=1-e;return n*n*n*t}function Aa(e,t){let n=1-e;return 3*n*n*e*t}function ja(e,t){return 3*(1-e)*e*e*t}function Ma(e,t){return e*e*e*t}function Na(e,t,n,r,i){return ka(e,t)+Aa(e,n)+ja(e,r)+Ma(e,i)}var Pa=class extends ma{constructor(e=new U,t=new U,n=new U,r=new U){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Na(e,r.x,i.x,a.x,o.x),Na(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Fa=class extends ma{constructor(e=new W,t=new W,n=new W,r=new W){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Na(e,r.x,i.x,a.x,o.x),Na(e,r.y,i.y,a.y,o.y),Na(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ia=class extends ma{constructor(e=new U,t=new U){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new U){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new U){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},La=class extends ma{constructor(e=new W,t=new W){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new W){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new W){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ra=class extends ma{constructor(e=new U,t=new U,n=new U){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Oa(e,r.x,i.x,a.x),Oa(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},za=class extends ma{constructor(e=new W,t=new W,n=new W){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Oa(e,r.x,i.x,a.x),Oa(e,r.y,i.y,a.y),Oa(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ba=class extends ma{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new U){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(wa(o,s.x,c.x,l.x,u.x),wa(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new U().fromArray(n))}return this}},Va=Object.freeze({__proto__:null,ArcCurve:ga,CatmullRomCurve3:Ca,CubicBezierCurve:Pa,CubicBezierCurve3:Fa,EllipseCurve:ha,LineCurve:Ia,LineCurve3:La,QuadraticBezierCurve:Ra,QuadraticBezierCurve3:za,SplineCurve:Ba}),Ha=class extends ma{constructor(){super(),this.type=`CurvePath`,this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?`LineCurve`:`LineCurve3`;this.curves.push(new Va[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),i=0;for(;i<r.length;){if(r[i]>=n){let e=r[i]-n,a=this.curves[i],o=a.getLength(),s=o===0?0:1-e/o;return a.getPointAt(s,t)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,i=this.curves;r<i.length;r++){let a=i[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,s=a.getPoints(o);for(let e=0;e<s.length;e++){let r=s[e];n&&n.equals(r)||(t.push(r),n=r)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(new Va[n.type]().fromJSON(n))}return this}},Ua=class extends Ha{constructor(e){super(),this.type=`Path`,this.currentPoint=new U,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Ia(this.currentPoint.clone(),new U(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let i=new Ra(this.currentPoint.clone(),new U(e,t),new U(n,r));return this.curves.push(i),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,i,a){let o=new Pa(this.currentPoint.clone(),new U(e,t),new U(n,r),new U(i,a));return this.curves.push(o),this.currentPoint.set(i,a),this}splineThru(e){let t=new Ba([this.currentPoint.clone()].concat(e));return this.curves.push(t),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,i,a){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,n,r,i,a),this}absarc(e,t,n,r,i,a){return this.absellipse(e,t,n,n,r,i,a),this}ellipse(e,t,n,r,i,a,o,s){let c=this.currentPoint.x,l=this.currentPoint.y;return this.absellipse(e+c,t+l,n,r,i,a,o,s),this}absellipse(e,t,n,r,i,a,o,s){let c=new ha(e,t,n,r,i,a,o,s);if(this.curves.length>0){let e=c.getPoint(0);e.equals(this.currentPoint)||this.lineTo(e.x,e.y)}this.curves.push(c);let l=c.getPoint(1);return this.currentPoint.copy(l),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Wa=class extends Ua{constructor(e){super(e),this.uuid=at(),this.type=`Shape`,this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(new Ua().fromJSON(n))}return this}};function Ga(e,t,n=2){let r=t&&t.length,i=r?t[0]*n:e.length,a=Ka(e,0,i,n,!0),o=[];if(!a||a.next===a.prev)return o;let s,c,l;if(r&&(a=$a(e,t,a,n)),e.length>80*n){s=e[0],c=e[1];let t=s,r=c;for(let a=n;a<i;a+=n){let n=e[a],i=e[a+1];n<s&&(s=n),i<c&&(c=i),n>t&&(t=n),i>r&&(r=i)}l=Math.max(t-s,r-c),l=l===0?0:32767/l}return Ja(a,o,n,s,c,l,0),o}function Ka(e,t,n,r,i){let a;if(i===wo(e,t,n,r)>0)for(let i=t;i<n;i+=r)a=xo(i/r|0,e[i],e[i+1],a);else for(let i=n-r;i>=t;i-=r)a=xo(i/r|0,e[i],e[i+1],a);return a&&po(a,a.next)&&(So(a),a=a.next),a}function qa(e,t){if(!e)return e;t||=e;let n=e,r;do if(r=!1,!n.steiner&&(po(n,n.next)||fo(n.prev,n,n.next)===0)){if(So(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function Ja(e,t,n,r,i,a,o){if(!e)return;!o&&a&&io(e,r,i,a);let s=e;for(;e.prev!==e.next;){let c=e.prev,l=e.next;if(a?Xa(e,r,i,a):Ya(e)){t.push(c.i,e.i,l.i),So(e),e=l.next,s=l.next;continue}if(e=l,e===s){o?o===1?(e=Za(qa(e),t),Ja(e,t,n,r,i,a,2)):o===2&&Qa(e,t,n,r,i,a):Ja(qa(e),t,n,r,i,a,1);break}}}function Ya(e){let t=e.prev,n=e,r=e.next;if(fo(t,n,r)>=0)return!1;let i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=Math.min(i,a,o),d=Math.min(s,c,l),f=Math.max(i,a,o),p=Math.max(s,c,l),m=r.next;for(;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&lo(i,s,a,c,o,l,m.x,m.y)&&fo(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Xa(e,t,n,r){let i=e.prev,a=e,o=e.next;if(fo(i,a,o)>=0)return!1;let s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=Math.min(s,c,l),m=Math.min(u,d,f),h=Math.max(s,c,l),g=Math.max(u,d,f),_=oo(p,m,t,n,r),v=oo(h,g,t,n,r),y=e.prevZ,b=e.nextZ;for(;y&&y.z>=_&&b&&b.z<=v;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&lo(s,u,c,d,l,f,y.x,y.y)&&fo(y.prev,y,y.next)>=0||(y=y.prevZ,b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&lo(s,u,c,d,l,f,b.x,b.y)&&fo(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;y&&y.z>=_;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&lo(s,u,c,d,l,f,y.x,y.y)&&fo(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;b&&b.z<=v;){if(b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&lo(s,u,c,d,l,f,b.x,b.y)&&fo(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function Za(e,t){let n=e;do{let r=n.prev,i=n.next.next;!po(r,i)&&mo(r,n,n.next,i)&&vo(r,i)&&vo(i,r)&&(t.push(r.i,n.i,i.i),So(n),So(n.next),n=e=i),n=n.next}while(n!==e);return qa(n)}function Qa(e,t,n,r,i,a){let o=e;do{let e=o.next.next;for(;e!==o.prev;){if(o.i!==e.i&&uo(o,e)){let s=bo(o,e);o=qa(o,o.next),s=qa(s,s.next),Ja(o,t,n,r,i,a,0),Ja(s,t,n,r,i,a,0);return}e=e.next}o=o.next}while(o!==e)}function $a(e,t,n,r){let i=[];for(let n=0,a=t.length;n<a;n++){let o=Ka(e,t[n]*r,n<a-1?t[n+1]*r:e.length,r,!1);o===o.next&&(o.steiner=!0),i.push(so(o))}i.sort(eo);for(let e=0;e<i.length;e++)n=to(i[e],n);return n}function eo(e,t){let n=e.x-t.x;return n===0&&(n=e.y-t.y,n===0&&(n=(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x))),n}function to(e,t){let n=no(e,t);if(!n)return t;let r=bo(n,e);return qa(r,r.next),qa(n,n.next)}function no(e,t){let n=t,r=e.x,i=e.y,a=-1/0,o;if(po(e,n))return n;do{if(po(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){let e=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(e<=r&&e>a&&(a=e,o=n.x<n.next.x?n:n.next,e===r))return o}n=n.next}while(n!==t);if(!o)return null;let s=o,c=o.x,l=o.y,u=1/0;n=o;do{if(r>=n.x&&n.x>=c&&r!==n.x&&co(i<l?r:a,i,c,l,i<l?a:r,i,n.x,n.y)){let t=Math.abs(i-n.y)/(r-n.x);vo(n,e)&&(t<u||t===u&&(n.x>o.x||n.x===o.x&&ro(o,n)))&&(o=n,u=t)}n=n.next}while(n!==s);return o}function ro(e,t){return fo(e.prev,e,t.prev)<0&&fo(t.next,e,e.next)<0}function io(e,t,n,r){let i=e;do i.z===0&&(i.z=oo(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,ao(i)}function ao(e){let t,n=1;do{let r=e,i;e=null;let a=null;for(t=0;r;){t++;let o=r,s=0;for(let e=0;e<n&&(s++,o=o.nextZ,o);e++);let c=n;for(;s>0||c>0&&o;)s!==0&&(c===0||!o||r.z<=o.z)?(i=r,r=r.nextZ,s--):(i=o,o=o.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;r=o}a.nextZ=null,n*=2}while(t>1);return e}function oo(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function so(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function co(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function lo(e,t,n,r,i,a,o,s){return(e!==o||t!==s)&&co(e,t,n,r,i,a,o,s)}function uo(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!_o(e,t)&&(vo(e,t)&&vo(t,e)&&yo(e,t)&&(fo(e.prev,e,t.prev)||fo(e,t.prev,t))||po(e,t)&&fo(e.prev,e,e.next)>0&&fo(t.prev,t,t.next)>0)}function fo(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function po(e,t){return e.x===t.x&&e.y===t.y}function mo(e,t,n,r){let i=go(fo(e,t,n)),a=go(fo(e,t,r)),o=go(fo(n,r,e)),s=go(fo(n,r,t));return!!(i!==a&&o!==s||i===0&&ho(e,n,t)||a===0&&ho(e,r,t)||o===0&&ho(n,e,r)||s===0&&ho(n,t,r))}function ho(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function go(e){return e>0?1:e<0?-1:0}function _o(e,t){let n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&mo(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function vo(e,t){return fo(e.prev,e,e.next)<0?fo(e,t,e.next)>=0&&fo(e,e.prev,t)>=0:fo(e,t,e.prev)<0||fo(e,e.next,t)<0}function yo(e,t){let n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function bo(e,t){let n=Co(e.i,e.x,e.y),r=Co(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function xo(e,t,n,r){let i=Co(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function So(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function Co(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function wo(e,t,n,r){let i=0;for(let a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}var To=class{static triangulate(e,t,n=2){return Ga(e,t,n)}},Eo=class e{static area(e){let t=e.length,n=0;for(let r=t-1,i=0;i<t;r=i++)n+=e[r].x*e[i].y-e[i].x*e[r].y;return n*.5}static isClockWise(t){return e.area(t)<0}static triangulateShape(e,t){let n=[],r=[],i=[];Do(e),Oo(n,e);let a=e.length;t.forEach(Do);for(let e=0;e<t.length;e++)r.push(a),a+=t[e].length,Oo(n,t[e]);let o=To.triangulate(n,r);for(let e=0;e<o.length;e+=3)i.push(o.slice(e,e+3));return i}};function Do(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function Oo(e,t){for(let n=0;n<t.length;n++)e.push(t[n].x),e.push(t[n].y)}var ko=class e extends kr{constructor(e=new Wa([new U(.5,.5),new U(-.5,.5),new U(-.5,-.5),new U(.5,-.5)]),t={}){super(),this.type=`ExtrudeGeometry`,this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],i=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];a(n)}this.setAttribute(`position`,new _r(r,3)),this.setAttribute(`uv`,new _r(i,2)),this.computeVertexNormals();function a(e){let a=[],o=t.curveSegments===void 0?12:t.curveSegments,s=t.steps===void 0?1:t.steps,c=t.depth===void 0?1:t.depth,l=t.bevelEnabled===void 0||t.bevelEnabled,u=t.bevelThickness===void 0?.2:t.bevelThickness,d=t.bevelSize===void 0?u-.1:t.bevelSize,f=t.bevelOffset===void 0?0:t.bevelOffset,p=t.bevelSegments===void 0?3:t.bevelSegments,m=t.extrudePath,h=t.UVGenerator===void 0?Ao:t.UVGenerator,g,_=!1,v,y,b,x;if(m){g=m.getSpacedPoints(s),_=!0,l=!1;let e=m.isCatmullRomCurve3?m.closed:!1;v=m.computeFrenetFrames(s,e),y=new W,b=new W,x=new W}l||(p=0,u=0,d=0,f=0);let S=e.extractPoints(o),C=S.shape,w=S.holes;if(!Eo.isClockWise(C)){C=C.reverse();for(let e=0,t=w.length;e<t;e++){let t=w[e];Eo.isClockWise(t)&&(w[e]=t.reverse())}}function T(e){let t=e[0];for(let n=1;n<=e.length;n++){let r=n%e.length,i=e[r],a=i.x-t.x,o=i.y-t.y,s=a*a+o*o,c=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(t.x),Math.abs(t.y));if(s<=10000000000000001e-36*c*c){e.splice(r,1),n--;continue}t=i}}T(C),w.forEach(T);let E=w.length,D=C;for(let e=0;e<E;e++){let t=w[e];C=C.concat(t)}function O(e,t,n){return t||V(`ExtrudeGeometry: vec does not exist`),e.clone().addScaledVector(t,n)}let k=C.length;function A(e,t,n){let r,i,a,o=e.x-t.x,s=e.y-t.y,c=n.x-e.x,l=n.y-e.y,u=o*o+s*s,d=o*l-s*c;if(Math.abs(d)>2**-52){let d=Math.sqrt(u),f=Math.sqrt(c*c+l*l),p=t.x-s/d,m=t.y+o/d,h=n.x-l/f,g=n.y+c/f,_=((h-p)*l-(g-m)*c)/(o*l-s*c);r=p+o*_-e.x,i=m+s*_-e.y;let v=r*r+i*i;if(v<=2)return new U(r,i);a=Math.sqrt(v/2)}else{let e=!1;o>2**-52?c>2**-52&&(e=!0):o<-(2**-52)?c<-(2**-52)&&(e=!0):Math.sign(s)===Math.sign(l)&&(e=!0),e?(r=-s,i=o,a=Math.sqrt(u)):(r=o,i=s,a=Math.sqrt(u/2))}return new U(r/a,i/a)}let j=[];for(let e=0,t=D.length,n=t-1,r=e+1;e<t;e++,n++,r++)n===t&&(n=0),r===t&&(r=0),j[e]=A(D[e],D[n],D[r]);let M=[],N,ee=j.concat();for(let e=0,t=E;e<t;e++){let t=w[e];N=[];for(let e=0,n=t.length,r=n-1,i=e+1;e<n;e++,r++,i++)r===n&&(r=0),i===n&&(i=0),N[e]=A(t[e],t[r],t[i]);M.push(N),ee=ee.concat(N)}let te;if(p===0)te=Eo.triangulateShape(D,w);else{let e=[],t=[];for(let n=0;n<p;n++){let r=n/p,i=u*Math.cos(r*Math.PI/2),a=d*Math.sin(r*Math.PI/2)+f;for(let t=0,n=D.length;t<n;t++){let n=O(D[t],j[t],a);F(n.x,n.y,-i),r===0&&e.push(n)}for(let e=0,n=E;e<n;e++){let n=w[e];N=M[e];let o=[];for(let e=0,t=n.length;e<t;e++){let t=O(n[e],N[e],a);F(t.x,t.y,-i),r===0&&o.push(t)}r===0&&t.push(o)}}te=Eo.triangulateShape(e,t)}let P=te.length,ne=d+f;for(let e=0;e<k;e++){let t=l?O(C[e],ee[e],ne):C[e];_?(b.copy(v.normals[0]).multiplyScalar(t.x),y.copy(v.binormals[0]).multiplyScalar(t.y),x.copy(g[0]).add(b).add(y),F(x.x,x.y,x.z)):F(t.x,t.y,0)}for(let e=1;e<=s;e++)for(let t=0;t<k;t++){let n=l?O(C[t],ee[t],ne):C[t];_?(b.copy(v.normals[e]).multiplyScalar(n.x),y.copy(v.binormals[e]).multiplyScalar(n.y),x.copy(g[e]).add(b).add(y),F(x.x,x.y,x.z)):F(n.x,n.y,c/s*e)}for(let e=p-1;e>=0;e--){let t=e/p,n=u*Math.cos(t*Math.PI/2),r=d*Math.sin(t*Math.PI/2)+f;for(let e=0,t=D.length;e<t;e++){let t=O(D[e],j[e],r);F(t.x,t.y,c+n)}for(let e=0,t=w.length;e<t;e++){let t=w[e];N=M[e];for(let e=0,i=t.length;e<i;e++){let i=O(t[e],N[e],r);_?F(i.x,i.y+g[s-1].y,g[s-1].x+n):F(i.x,i.y,c+n)}}}re(),ie();function re(){let e=r.length/3;if(l){let e=0,t=k*e;for(let e=0;e<P;e++){let n=te[e];I(n[2]+t,n[1]+t,n[0]+t)}e=s+p*2,t=k*e;for(let e=0;e<P;e++){let n=te[e];I(n[0]+t,n[1]+t,n[2]+t)}}else{for(let e=0;e<P;e++){let t=te[e];I(t[2],t[1],t[0])}for(let e=0;e<P;e++){let t=te[e];I(t[0]+k*s,t[1]+k*s,t[2]+k*s)}}n.addGroup(e,r.length/3-e,0)}function ie(){let e=r.length/3,t=0;ae(D,t),t+=D.length;for(let e=0,n=w.length;e<n;e++){let n=w[e];ae(n,t),t+=n.length}n.addGroup(e,r.length/3-e,1)}function ae(e,t){let n=e.length;for(;--n>=0;){let r=n,i=n-1;i<0&&(i=e.length-1);for(let e=0,n=s+p*2;e<n;e++){let n=k*e,a=k*(e+1);oe(t+r+n,t+i+n,t+i+a,t+r+a)}}}function F(e,t,n){a.push(e),a.push(t),a.push(n)}function I(e,t,i){L(e),L(t),L(i);let a=r.length/3,o=h.generateTopUV(n,r,a-3,a-2,a-1);se(o[0]),se(o[1]),se(o[2])}function oe(e,t,i,a){L(e),L(t),L(a),L(t),L(i),L(a);let o=r.length/3,s=h.generateSideWallUV(n,r,o-6,o-3,o-2,o-1);se(s[0]),se(s[1]),se(s[3]),se(s[1]),se(s[2]),se(s[3])}function L(e){r.push(a[e*3+0]),r.push(a[e*3+1]),r.push(a[e*3+2])}function se(e){i.push(e.x),i.push(e.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return jo(t,n,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new Va[i.type]().fromJSON(i)),new e(r,t.options)}},Ao={generateTopUV:function(e,t,n,r,i){let a=t[n*3],o=t[n*3+1],s=t[r*3],c=t[r*3+1],l=t[i*3],u=t[i*3+1];return[new U(a,o),new U(s,c),new U(l,u)]},generateSideWallUV:function(e,t,n,r,i,a){let o=t[n*3],s=t[n*3+1],c=t[n*3+2],l=t[r*3],u=t[r*3+1],d=t[r*3+2],f=t[i*3],p=t[i*3+1],m=t[i*3+2],h=t[a*3],g=t[a*3+1],_=t[a*3+2];return Math.abs(s-u)<Math.abs(o-l)?[new U(o,1-c),new U(l,1-d),new U(f,1-m),new U(h,1-_)]:[new U(s,1-c),new U(u,1-d),new U(p,1-m),new U(g,1-_)]}};function jo(e,t,n){if(n.shapes=[],Array.isArray(e))for(let t=0,r=e.length;t<r;t++){let r=e[t];n.shapes.push(r.uuid)}else n.shapes.push(e.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}var Mo=class e extends kr{constructor(e=[new U(0,-.5),new U(.5,0),new U(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=H(r,0,Math.PI*2);let i=[],a=[],o=[],s=[],c=[],l=1/t,u=new W,d=new U,f=new W,p=new W,m=new W,h=0,g=0;for(let t=0;t<=e.length-1;t++)switch(t){case 0:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,m.copy(f),f.normalize(),s.push(f.x,f.y,f.z);break;case e.length-1:s.push(m.x,m.y,m.z);break;default:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,p.copy(f),f.x+=m.x,f.y+=m.y,f.z+=m.z,f.normalize(),s.push(f.x,f.y,f.z),m.copy(p)}for(let i=0;i<=t;i++){let f=n+i*l*r,p=Math.sin(f),m=Math.cos(f);for(let n=0;n<=e.length-1;n++){u.x=e[n].x*p,u.y=e[n].y,u.z=e[n].x*m,a.push(u.x,u.y,u.z),d.x=i/t,d.y=n/(e.length-1),o.push(d.x,d.y);let r=s[3*n+0]*p,l=s[3*n+1],f=s[3*n+0]*m;c.push(r,l,f)}}for(let n=0;n<t;n++)for(let t=0;t<e.length-1;t++){let r=t+n*e.length,a=r,o=r+e.length,s=r+e.length+1,c=r+1;i.push(a,o,c),i.push(s,c,o)}this.setIndex(i),this.setAttribute(`position`,new _r(a,3)),this.setAttribute(`uv`,new _r(o,2)),this.setAttribute(`normal`,new _r(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.points,t.segments,t.phiStart,t.phiLength)}},No=class e extends fa{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Po=class e extends kr{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new _r(p,3)),this.setAttribute(`normal`,new _r(m,3)),this.setAttribute(`uv`,new _r(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Fo=class e extends kr{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new W,p=new U;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new _r(s,3)),this.setAttribute(`normal`,new _r(c,3)),this.setAttribute(`uv`,new _r(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Io=class e extends kr{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new W,d=new W,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new _r(p,3)),this.setAttribute(`normal`,new _r(m,3)),this.setAttribute(`uv`,new _r(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Lo=class e extends fa{constructor(e=1,t=0){super([1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],[2,1,0,0,3,2,1,3,0,2,3,1],e,t),this.type=`TetrahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ro=class e extends kr{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new W,f=new W,p=new W;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new _r(c,3)),this.setAttribute(`normal`,new _r(l,3)),this.setAttribute(`uv`,new _r(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}},zo=class e extends kr{constructor(e=new za(new W(-1,-1,0),new W(-1,1,0),new W(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new W,s=new W,c=new U,l=new W,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new _r(u,3)),this.setAttribute(`normal`,new _r(d,3)),this.setAttribute(`uv`,new _r(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new Va[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Bo(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Ho(i))i.isRenderTargetTexture?(B(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(Ho(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function Vo(e){let t={};for(let n=0;n<e.length;n++){let r=Bo(e[n]);for(let e in r)t[e]=r[e]}return t}function Ho(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Uo(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Wo(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ft.workingColorSpace}var Go={clone:Bo,merge:Vo},Ko=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,qo=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Jo=class extends Pr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ko,this.fragmentShader=qo,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bo(e.uniforms),this.uniformsGroups=Uo(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new G().setHex(r.value);break;case`v2`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new W().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Kt().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new At().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new Zt().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Yo=class extends Jo{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},J=class extends Pr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new G(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new U(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Xo=class extends Pr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Fe,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Zo=class extends Pr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Qo(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}var $o=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},es=class extends $o{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Ne,endingEnd:Ne}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case z:i=e,o=2*t-n;break;case Pe:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case z:a=e,s=2*n-t;break;case Pe:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},ts=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},ns=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},rs=class extends $o{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[p]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},is=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Qo(t,this.TimeBufferType),this.values=Qo(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Qo(e.times,Array),values:Qo(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ns(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new ts(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new es(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new rs(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Ae:t=this.InterpolantFactoryMethodDiscrete;break;case R:t=this.InterpolantFactoryMethodLinear;break;case je:t=this.InterpolantFactoryMethodSmooth;break;case Me:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return B(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ae;case this.InterpolantFactoryMethodLinear:return R;case this.InterpolantFactoryMethodSmooth:return je;case this.InterpolantFactoryMethodBezier:return Me}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(V(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(V(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){V(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){V(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&Ge(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){V(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===je,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};is.prototype.ValueTypeName=``,is.prototype.TimeBufferType=Float32Array,is.prototype.ValueBufferType=Float32Array,is.prototype.DefaultInterpolation=R;var as=class extends is{constructor(e,t,n){super(e,t,n)}};as.prototype.ValueTypeName=`bool`,as.prototype.ValueBufferType=Array,as.prototype.DefaultInterpolation=Ae,as.prototype.InterpolantFactoryMethodLinear=void 0,as.prototype.InterpolantFactoryMethodSmooth=void 0;var os=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};os.prototype.ValueTypeName=`color`;var ss=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};ss.prototype.ValueTypeName=`number`;var cs=class extends $o{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Dt.slerpFlat(i,0,a,c-o,a,c,s);return i}},ls=class extends is{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new cs(this.times,this.values,this.getValueSize(),e)}};ls.prototype.ValueTypeName=`quaternion`,ls.prototype.InterpolantFactoryMethodSmooth=void 0;var us=class extends is{constructor(e,t,n){super(e,t,n)}};us.prototype.ValueTypeName=`string`,us.prototype.ValueBufferType=Array,us.prototype.DefaultInterpolation=Ae,us.prototype.InterpolantFactoryMethodLinear=void 0,us.prototype.InterpolantFactoryMethodSmooth=void 0;var ds=class extends is{constructor(e,t,n,r){super(e,t,n,r)}};ds.prototype.ValueTypeName=`vector`;var fs=class extends Tn{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new G(e),this.intensity=t}dispose(){this.dispatchEvent({type:`dispose`})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},ps=class extends fs{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new G(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},ms=new Zt,hs=new W,gs=new W,_s=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new U(512,512),this.mapType=l,this.map=null,this.mapPass=null,this.matrix=new Zt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ii,this._frameExtents=new U(1,1),this._viewportCount=1,this._viewports=[new Kt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;hs.setFromMatrixPosition(e.matrixWorld),t.position.copy(hs),gs.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(gs),t.updateMatrixWorld(),ms.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ms,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ms)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},vs=new W,ys=new Dt,bs=new W,xs=class extends Tn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Zt,this.projectionMatrix=new Zt,this.projectionMatrixInverse=new Zt,this.coordinateSystem=Ue,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(vs,ys,bs),bs.x===1&&bs.y===1&&bs.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(vs,ys,bs.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(vs,ys,bs),bs.x===1&&bs.y===1&&bs.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(vs,ys,bs.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ss=new W,Cs=new U,ws=new U,Ts=class extends xs{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=it*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(rt*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return it*2*Math.atan(Math.tan(rt*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z),Ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z)}getViewSize(e,t){return this.getViewBounds(e,Cs,ws),t.subVectors(ws,Cs)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(rt*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Es=class extends _s{constructor(){super(new Ts(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=it*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Ds=class extends fs{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.target=new Tn,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Es}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Os=class extends _s{constructor(){super(new Ts(90,1,.5,500)),this.isPointLightShadow=!0}},ks=class extends fs{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Os}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},As=class extends xs{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},js=class extends _s{constructor(){super(new As(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ms=class extends fs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(Tn.DEFAULT_UP),this.updateMatrix(),this.target=new Tn,this.shadow=new js}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Ns=-90,Ps=1,Fs=class extends Tn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ts(Ns,Ps,e,t);r.layers=this.layers,this.add(r);let i=new Ts(Ns,Ps,e,t);i.layers=this.layers,this.add(i);let a=new Ts(Ns,Ps,e,t);a.layers=this.layers,this.add(a);let o=new Ts(Ns,Ps,e,t);o.layers=this.layers,this.add(o);let s=new Ts(Ns,Ps,e,t);s.layers=this.layers,this.add(s);let c=new Ts(Ns,Ps,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Is=class extends Ts{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Ls=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Rs.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Rs(){this._document.hidden===!1&&this.reset()}var zs=`\\[\\]\\.:\\/`,Bs=RegExp(`[\\[\\]\\.:\\/]`,`g`),Vs=`[^\\[\\]\\.:\\/]`,Hs=`[^`+zs.replace(`\\.`,``)+`]`,Us=`((?:WC+[\\/:])*)`.replace(`WC`,Vs),Ws=`(WCOD+)?`.replace(`WCOD`,Hs),Gs=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Vs),Ks=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Vs),qs=RegExp(`^`+Us+Ws+Gs+Ks+`$`),Js=[`material`,`materials`,`bones`,`map`],Ys=class{constructor(e,t,n){let r=n||Xs.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Xs=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Bs,``)}static parseTrackName(e){let t=qs.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);Js.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){B(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){V(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){V(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){V(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){V(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){V(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;V(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Xs.Composite=Ys,Xs.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Xs.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Xs.prototype.GetterByBindingType=[Xs.prototype._getValue_direct,Xs.prototype._getValue_array,Xs.prototype._getValue_arrayElement,Xs.prototype._getValue_toArray],Xs.prototype.SetterByBindingTypeAndVersioning=[[Xs.prototype._setValue_direct,Xs.prototype._setValue_direct_setNeedsUpdate,Xs.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_array,Xs.prototype._setValue_array_setNeedsUpdate,Xs.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_arrayElement,Xs.prototype._setValue_arrayElement_setNeedsUpdate,Xs.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Xs.prototype._setValue_fromArray,Xs.prototype._setValue_fromArray_setNeedsUpdate,Xs.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Zs=new Zt,Qs=class{constructor(e,t,n=0,r=1/0){this.ray=new ii(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new ln,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):V(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return Zs.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Zs),this}intersectObject(e,t=!0,n=[]){return ec(e,this,n,t),n.sort($s),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)ec(e[r],this,n,t);return n.sort($s),n}};function $s(e,t){return e.distance-t.distance}function ec(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)ec(r[e],t,n,!0)}}(class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}});function tc(e,t,n,r){let i=nc(r);switch(n){case S:return e*t;case D:return e*t/i.components*i.byteLength;case O:return e*t/i.components*i.byteLength;case k:return e*t*2/i.components*i.byteLength;case A:return e*t*2/i.components*i.byteLength;case C:return e*t*3/i.components*i.byteLength;case w:return e*t*4/i.components*i.byteLength;case j:return e*t*4/i.components*i.byteLength;case M:case N:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ee:case te:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ne:case ie:return Math.max(e,16)*Math.max(t,8)/4;case P:case re:return Math.max(e,8)*Math.max(t,8)/2;case ae:case F:case oe:case L:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case I:case se:case ce:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case le:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ue:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case de:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case fe:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case pe:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case me:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case he:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case ge:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case _e:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case ve:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case ye:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case be:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case xe:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Se:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Ce:case we:case Te:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Ee:case De:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Oe:case ke:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function nc(e){switch(e){case l:case u:return{byteLength:1,components:1};case f:case d:case g:return{byteLength:2,components:1};case _:case v:return{byteLength:2,components:4};case m:case p:case h:return{byteLength:4,components:1};case b:case x:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`185`}})),typeof window<`u`&&(window.__THREE__?B(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`185`);function rc(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function ic(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var ac={alphahash_fragment:`#ifdef USE_ALPHAHASH
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
}`},Y={common:{diffuse:{value:new G(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new At},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new At}},envmap:{envMap:{value:null},envMapRotation:{value:new At},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new At}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new At}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new At},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new At},normalScale:{value:new U(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new At},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new At}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new At}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new At}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new G(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new W},probesMax:{value:new W},probesResolution:{value:new W}},points:{diffuse:{value:new G(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0},uvTransform:{value:new At}},sprite:{diffuse:{value:new G(16777215)},opacity:{value:1},center:{value:new U(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new At},alphaMap:{value:null},alphaMapTransform:{value:new At},alphaTest:{value:0}}},oc={basic:{uniforms:Vo([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.fog]),vertexShader:ac.meshbasic_vert,fragmentShader:ac.meshbasic_frag},lambert:{uniforms:Vo([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,Y.lights,{emissive:{value:new G(0)},envMapIntensity:{value:1}}]),vertexShader:ac.meshlambert_vert,fragmentShader:ac.meshlambert_frag},phong:{uniforms:Vo([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,Y.lights,{emissive:{value:new G(0)},specular:{value:new G(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ac.meshphong_vert,fragmentShader:ac.meshphong_frag},standard:{uniforms:Vo([Y.common,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.roughnessmap,Y.metalnessmap,Y.fog,Y.lights,{emissive:{value:new G(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ac.meshphysical_vert,fragmentShader:ac.meshphysical_frag},toon:{uniforms:Vo([Y.common,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.gradientmap,Y.fog,Y.lights,{emissive:{value:new G(0)}}]),vertexShader:ac.meshtoon_vert,fragmentShader:ac.meshtoon_frag},matcap:{uniforms:Vo([Y.common,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,{matcap:{value:null}}]),vertexShader:ac.meshmatcap_vert,fragmentShader:ac.meshmatcap_frag},points:{uniforms:Vo([Y.points,Y.fog]),vertexShader:ac.points_vert,fragmentShader:ac.points_frag},dashed:{uniforms:Vo([Y.common,Y.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ac.linedashed_vert,fragmentShader:ac.linedashed_frag},depth:{uniforms:Vo([Y.common,Y.displacementmap]),vertexShader:ac.depth_vert,fragmentShader:ac.depth_frag},normal:{uniforms:Vo([Y.common,Y.bumpmap,Y.normalmap,Y.displacementmap,{opacity:{value:1}}]),vertexShader:ac.meshnormal_vert,fragmentShader:ac.meshnormal_frag},sprite:{uniforms:Vo([Y.sprite,Y.fog]),vertexShader:ac.sprite_vert,fragmentShader:ac.sprite_frag},background:{uniforms:{uvTransform:{value:new At},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ac.background_vert,fragmentShader:ac.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new At}},vertexShader:ac.backgroundCube_vert,fragmentShader:ac.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ac.cube_vert,fragmentShader:ac.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ac.equirect_vert,fragmentShader:ac.equirect_frag},distance:{uniforms:Vo([Y.common,Y.displacementmap,{referencePosition:{value:new W},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ac.distance_vert,fragmentShader:ac.distance_frag},shadow:{uniforms:Vo([Y.lights,Y.fog,{color:{value:new G(0)},opacity:{value:1}}]),vertexShader:ac.shadow_vert,fragmentShader:ac.shadow_frag}};oc.physical={uniforms:Vo([oc.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new At},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new At},clearcoatNormalScale:{value:new U(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new At},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new At},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new At},sheen:{value:0},sheenColor:{value:new G(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new At},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new At},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new At},transmissionSamplerSize:{value:new U},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new At},attenuationDistance:{value:0},attenuationColor:{value:new G(0)},specularColor:{value:new G(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new At},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new At},anisotropyVector:{value:new U},anisotropyMap:{value:null},anisotropyMapTransform:{value:new At}}]),vertexShader:ac.meshphysical_vert,fragmentShader:ac.meshphysical_frag};var sc={r:0,b:0,g:0},cc=new Zt,lc=new At;lc.set(-1,0,0,0,1,0,0,0,1);function uc(e,t,n,r,i,a){let o=new G(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new K(new q(1,1,1),new Jo({name:`BackgroundCubeMaterial`,uniforms:Bo(oc.backgroundCube.uniforms),vertexShader:oc.backgroundCube.vertexShader,fragmentShader:oc.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(cc.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(lc),l.material.toneMapped=Ft.getTransfer(i.colorSpace)!==ze,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new K(new Po(2,2),new Jo({name:`BackgroundMaterial`,uniforms:Bo(oc.background.uniforms),vertexShader:oc.background.vertexShader,fragmentShader:oc.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Ft.getTransfer(i.colorSpace)!==ze,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(sc,Wo(e)),n.buffers.color.setClear(sc.r,sc.g,sc.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function dc(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function fc(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function pc(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(B(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&B(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function mc(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Mi,s=new At,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var hc=4,gc=[.125,.215,.35,.446,.526,.582],_c=20,vc=256,yc=new As,bc=new G,xc=null,Sc=0,Cc=0,wc=!1,Tc=new W,Ec=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Tc}=i;xc=this._renderer.getRenderTarget(),Sc=this._renderer.getActiveCubeFace(),Cc=this._renderer.getActiveMipmapLevel(),wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Nc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Mc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(xc,Sc,Cc),this._renderer.xr.enabled=wc,e.scissorTest=!1,kc(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),xc=this._renderer.getRenderTarget(),Sc=this._renderer.getActiveCubeFace(),Cc=this._renderer.getActiveMipmapLevel(),wc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:o,minFilter:o,generateMipmaps:!1,type:g,format:w,colorSpace:Le,depthBuffer:!1},r=Oc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Oc(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Dc(r)),this._blurMaterial=jc(r,e,t),this._ggxMaterial=Ac(r,e,t)}return r}_compileMaterial(e){let t=new K(new kr,e);this._renderer.compile(t,yc)}_sceneToCubeUV(e,t,n,r,i){let a=new Ts(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(bc),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new K(new q,new ai({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(bc),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;kc(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Nc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Mc());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;kc(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,yc)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-hc?n-d+hc:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,kc(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,yc),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,kc(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,yc)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&V(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):_c;m>_c&&B(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${_c}`);let h=[],g=0;for(let e=0;e<_c;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];kc(t,3*v*(r>_-hc?r-_+hc:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,yc)}};function Dc(e){let t=[],n=[],r=[],i=e,a=e-hc+1+gc.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-hc?s=gc[o-e+hc-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new kr;h.setAttribute(`position`,new mr(f,3)),h.setAttribute(`uv`,new mr(p,2)),h.setAttribute(`faceIndex`,new mr(m,1)),r.push(new K(h,null)),i>hc&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function Oc(e,t,n){let r=new Jt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function kc(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Ac(e,t,n){return new Jo({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:vc,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Pc(),fragmentShader:`

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
			`},r=new q(5,5,5),i=new Jo({name:`CubemapFromEquirect`,uniforms:Bo(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new K(r,i),s=t.minFilter;return t.minFilter===1008&&(t.minFilter=o),new Fs(1,10,this).update(e,a),t.minFilter=s,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Ic(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Fc(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Ec(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Ec(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Lc(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Ze(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Rc(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?gr:hr)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function zc(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Bc(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:V(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Vc(e,t,n){let r=new WeakMap,i=new Kt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let g=new Float32Array(p*m*4*u),_=new Yt(g,p,m,u);_.type=h,_.needsUpdate=!0;let v=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+s+0]=i.x,g[d+s+1]=i.y,g[d+s+2]=i.z,g[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+s+4]=i.x,g[d+s+5]=i.y,g[d+s+6]=i.z,g[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),g[d+s+8]=i.x,g[d+s+9]=i.y,g[d+s+10]=i.z,g[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:_,size:new U(p,m)},r.set(o,d);function y(){_.dispose(),r.delete(o),o.removeEventListener(`dispose`,y)}o.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Hc(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Uc={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Wc(e,t,n,r,i,a){let o=new Jt(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new aa(t,n):void 0}),s=new Jt(t,n,{type:g,depthBuffer:!1,stencilBuffer:!1}),c=new kr;c.setAttribute(`position`,new _r([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new _r([0,2,0,0,2,0],2));let l=new Yo({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
`)}var nu=new At;function ru(e){Ft._getMatrix(nu,Ft.workingColorSpace,e);let t=`mat3( ${nu.elements.map(e=>e.toFixed(4))} )`;switch(Ft.getTransfer(e)){case Re:return[t,`LinearTransferOETF`];case ze:return[t,`sRGBTransferOETF`];default:return B(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function iu(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+tu(e.getShaderSource(t),r)}return i}function au(e,t){let n=ru(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ou={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function su(e,t){let n=ou[t];return n===void 0?(B(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var cu=new W;function lu(){return Ft.getLuminanceCoefficients(cu),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${cu.x.toFixed(4)}, ${cu.y.toFixed(4)}, ${cu.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function uu(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(pu).join(`
`)}function du(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function fu(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function pu(e){return e!==``}function mu(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function hu(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var gu=/^[ \t]*#include +<([\w\d./]+)>/gm;function _u(e){return e.replace(gu,yu)}var vu=new Map;function yu(e,t){let n=ac[t];if(n===void 0){let e=vu.get(t);if(e!==void 0)n=ac[e],B(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return _u(n)}var bu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function xu(e){return e.replace(bu,Su)}function Su(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Cu(e){let t=`precision ${e.precision} float;
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
`+_);let y=v+g+o,b=v+_+s,x=Ql(i,i.VERTEX_SHADER,y),S=Ql(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=iu(i,x,`vertex`),n=iu(i,S,`fragment`);V(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):B(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Zl(i,h),T=fu(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,$l)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=eu++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Pu=0,Fu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Iu(e),t.set(e,n)),n}},Iu=class{constructor(e){this.id=Pu++,this.code=e,this.usedTimes=0}};function Lu(e){return e===1030||e===37490||e===36285}function Ru(e,t,n,r,i,a){let o=new ln,s=new Fu,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&B(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=oc[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),M=e.state.buffers.depth.getReversed(),N=h.isInstancedMesh===!0,ee=h.isBatchedMesh===!0,te=!!i.map,P=!!i.matcap,ne=!!x,re=!!i.aoMap,ie=!!i.lightMap,ae=!!i.bumpMap&&i.wireframe===!1,F=!!i.normalMap,I=!!i.displacementMap,oe=!!i.emissiveMap,L=!!i.metalnessMap,se=!!i.roughnessMap,ce=i.anisotropy>0,le=i.clearcoat>0,ue=i.dispersion>0,de=i.iridescence>0,fe=i.sheen>0,pe=i.transmission>0,me=ce&&!!i.anisotropyMap,he=le&&!!i.clearcoatMap,ge=le&&!!i.clearcoatNormalMap,_e=le&&!!i.clearcoatRoughnessMap,ve=de&&!!i.iridescenceMap,ye=de&&!!i.iridescenceThicknessMap,be=fe&&!!i.sheenColorMap,xe=fe&&!!i.sheenRoughnessMap,Se=!!i.specularMap,Ce=!!i.specularColorMap,we=!!i.specularIntensityMap,Te=pe&&!!i.transmissionMap,Ee=pe&&!!i.thicknessMap,De=!!i.gradientMap,Oe=!!i.alphaMap,ke=i.alphaTest>0,Ae=!!i.alphaHash,R=!!i.extensions,je=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(je=e.toneMapping);let Me={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:ee,batchingColor:ee&&h._colorsTexture!==null,instancing:N,instancingColor:N&&h.instanceColor!==null,instancingMorph:N&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Ft.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:te,matcap:P,envMap:ne,envMapMode:ne&&x.mapping,envMapCubeUVHeight:S,aoMap:re,lightMap:ie,bumpMap:ae,normalMap:F,displacementMap:I,emissiveMap:oe,normalMapObjectSpace:F&&i.normalMapType===1,normalMapTangentSpace:F&&i.normalMapType===0,packedNormalMap:F&&i.normalMapType===0&&Lu(i.normalMap.format),metalnessMap:L,roughnessMap:se,anisotropy:ce,anisotropyMap:me,clearcoat:le,clearcoatMap:he,clearcoatNormalMap:ge,clearcoatRoughnessMap:_e,dispersion:ue,iridescence:de,iridescenceMap:ve,iridescenceThicknessMap:ye,sheen:fe,sheenColorMap:be,sheenRoughnessMap:xe,specularMap:Se,specularColorMap:Ce,specularIntensityMap:we,transmission:pe,transmissionMap:Te,thicknessMap:Ee,gradientMap:De,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Oe,alphaTest:ke,alphaHash:Ae,combine:i.combine,mapUv:te&&m(i.map.channel),aoMapUv:re&&m(i.aoMap.channel),lightMapUv:ie&&m(i.lightMap.channel),bumpMapUv:ae&&m(i.bumpMap.channel),normalMapUv:F&&m(i.normalMap.channel),displacementMapUv:I&&m(i.displacementMap.channel),emissiveMapUv:oe&&m(i.emissiveMap.channel),metalnessMapUv:L&&m(i.metalnessMap.channel),roughnessMapUv:se&&m(i.roughnessMap.channel),anisotropyMapUv:me&&m(i.anisotropyMap.channel),clearcoatMapUv:he&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ge&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:_e&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:ve&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:ye&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:be&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:xe&&m(i.sheenRoughnessMap.channel),specularMapUv:Se&&m(i.specularMap.channel),specularColorMapUv:Ce&&m(i.specularColorMap.channel),specularIntensityMapUv:we&&m(i.specularIntensityMap.channel),transmissionMapUv:Te&&m(i.transmissionMap.channel),thicknessMapUv:Ee&&m(i.thicknessMap.channel),alphaMapUv:Oe&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(F||ce),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(te||Oe),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&F===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:M,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:je,decodeVideoTexture:te&&i.map.isVideoTexture===!0&&Ft.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:oe&&i.emissiveMap.isVideoTexture===!0&&Ft.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:R&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(R&&i.extensions.multiDraw===!0||ee)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Me.vertexUv1s=c.has(1),Me.vertexUv2s=c.has(2),Me.vertexUv3s=c.has(3),c.clear(),Me}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=oc[t];n=Go.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Nu(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function zu(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Bu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Vu(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Hu(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||Bu),r.length>1&&r.sort(t||Vu),i.length>1&&i.sort(t||Vu),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Uu(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Hu,e.set(t,[i])):n>=r.length?(i=new Hu,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Wu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new W,color:new G};break;case`SpotLight`:n={position:new W,direction:new W,color:new G,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new W,color:new G,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new W,skyColor:new G,groundColor:new G};break;case`RectAreaLight`:n={color:new G,position:new W,halfWidth:new W,halfHeight:new W}}return e[t.id]=n,n}}}function Gu(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Ku=0;function qu(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Ju(e){let t=new Wu,n=Gu(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new W);let i=new W,a=new Zt,o=new Zt;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(qu);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Y.LTC_FLOAT_1,r.rectAreaLTC2=Y.LTC_FLOAT_2):(r.rectAreaLTC1=Y.LTC_HALF_1,r.rectAreaLTC2=Y.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=Ku++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Yu(e){let t=new Ju(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Xu(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Yu(e),t.set(n,[a])):r>=i.length?(a=new Yu(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Zu=`void main() {
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
}`,$u=[new W(1,0,0),new W(-1,0,0),new W(0,1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1)],ed=[new W(0,-1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1),new W(0,-1,0),new W(0,-1,0)],td=new Zt,nd=new W,rd=new W;function id(e,t,n){let i=new Ii,a=new U,s=new U,c=new Kt,l=new Xo,u=new Zo,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},_=new Jo({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new U},radius:{value:4}},vertexShader:Zu,fragmentShader:Qu}),v=_.clone();v.defines.HORIZONTAL_PASS=1;let y=new kr;y.setAttribute(`position`,new mr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new K(y,_),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,l){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(B(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),_=e.state;_.setBlending(0),_.buffers.depth.getReversed()===!0?_.buffers.color.setClear(0,0,0,0):_.buffers.color.setClear(1,1,1,1),_.buffers.depth.setTest(!0),_.setScissorTest(!1);let v=S!==this.type;v&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,d=t.length;u<d;u++){let d=t[u],p=d.shadow;if(p===void 0){B(`WebGLShadowMap:`,d,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;a.copy(p.mapSize);let y=p.getFrameExtents();a.multiply(y),s.copy(p.mapSize),(a.x>f||a.y>f)&&(a.x>f&&(s.x=Math.floor(f/y.x),a.x=s.x*y.x,p.mapSize.x=s.x),a.y>f&&(s.y=Math.floor(f/y.y),a.y=s.y*y.y,p.mapSize.y=s.y));let b=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=b,p.map===null||v===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(d.isPointLight){B(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new Jt(a.x,a.y,{format:k,type:g,minFilter:o,magFilter:o,generateMipmaps:!1}),p.map.texture.name=d.name+`.shadowMap`,p.map.depthTexture=new aa(a.x,a.y,h),p.map.depthTexture.name=d.name+`.shadowMapDepth`,p.map.depthTexture.format=T,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r}else d.isPointLight?(p.map=new Fc(a.x),p.map.depthTexture=new oa(a.x,m)):(p.map=new Jt(a.x,a.y),p.map.depthTexture=new aa(a.x,a.y,m)),p.map.depthTexture.name=d.name+`.shadowMap`,p.map.depthTexture.format=T,this.type===1?(p.map.depthTexture.compareFunction=b?518:515,p.map.depthTexture.minFilter=o,p.map.depthTexture.magFilter=o):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r);p.camera.updateProjectionMatrix()}let x=p.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<x;t++){if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),_.viewport(c)}if(d.isPointLight){let e=p.camera,n=p.matrix,r=d.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),nd.setFromMatrixPosition(d.matrixWorld),e.position.copy(nd),rd.copy(e.position),rd.add($u[t]),e.up.copy(ed[t]),e.lookAt(rd),e.updateMatrixWorld(),n.makeTranslation(-nd.x,-nd.y,-nd.z),td.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(td,e.coordinateSystem,e.reversedDepth)}else p.updateMatrices(d);i=p.getFrustum(),E(n,l,p.camera,d,this.type)}p.isPointLightShadow!==!0&&this.type===3&&C(p,l),p.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(u,d,p)};function C(n,r){let i=t.update(b);_.defines.VSM_SAMPLES!==n.blurSamples&&(_.defines.VSM_SAMPLES=n.blurSamples,v.defines.VSM_SAMPLES=n.blurSamples,_.needsUpdate=!0,v.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new Jt(a.x,a.y,{format:k,type:g})),_.uniforms.shadow_pass.value=n.map.depthTexture,_.uniforms.resolution.value=n.mapSize,_.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,_,b,null),v.uniforms.shadow_pass.value=n.mapPass.texture,v.uniforms.resolution.value=n.mapSize,v.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,v,b,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,D)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function E(n,r,a,o,s){if(n.visible===!1)return;if(n.layers.test(r.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||i.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),c=n.material;if(Array.isArray(c)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,s);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(c.visible){let t=w(n,c,o,s);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)E(c[e],r,a,o,s)}function D(e){e.target.removeEventListener(`dispose`,D);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function ad(e,t){function n(){let t=!1,n=new Kt,r=null,i=new Kt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?L(e.DEPTH_TEST):se(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=$e[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?L(e.STENCIL_TEST):se(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,ee=0,te=e.getParameter(e.VERSION);te.indexOf(`WebGL`)===-1?te.indexOf(`OpenGL ES`)!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(te)[1]),N=ee>=2):(ee=parseFloat(/^WebGL (\d)/.exec(te)[1]),N=ee>=1);let P=null,ne={},re=e.getParameter(e.SCISSOR_BOX),ie=e.getParameter(e.VIEWPORT),ae=new Kt().fromArray(re),F=new Kt().fromArray(ie);function I(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let oe={};oe[e.TEXTURE_2D]=I(e.TEXTURE_2D,e.TEXTURE_2D,1),oe[e.TEXTURE_CUBE_MAP]=I(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),oe[e.TEXTURE_2D_ARRAY]=I(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),oe[e.TEXTURE_3D]=I(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),L(e.DEPTH_TEST),o.setFunc(3),he(!1),ge(1),L(e.CULL_FACE),pe(0);function L(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function se(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function ce(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function le(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function ue(t){return h!==t&&(e.useProgram(t),h=t,!0)}let de={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};de[103]=e.MIN,de[104]=e.MAX;let fe={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function pe(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(se(e.BLEND),g=!1);return}if(g===!1&&(L(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:V(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:V(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:V(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:V(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(de[n],de[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(fe[r],fe[i],fe[o],fe[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function me(t,n){t.side===2?se(e.CULL_FACE):L(e.CULL_FACE);let r=t.side===1;n&&(r=!r),he(r),t.blending===1&&t.transparent===!1?pe(0):pe(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ve(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?L(e.SAMPLE_ALPHA_TO_COVERAGE):se(e.SAMPLE_ALPHA_TO_COVERAGE)}function he(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function ge(t){t===0?se(e.CULL_FACE):(L(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function _e(t){t!==k&&(N&&e.lineWidth(t),k=t)}function ve(t,n,r){t?(L(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):se(e.POLYGON_OFFSET_FILL)}function ye(t){t?L(e.SCISSOR_TEST):se(e.SCISSOR_TEST)}function be(t){t===void 0&&(t=e.TEXTURE0+M-1),P!==t&&(e.activeTexture(t),P=t)}function xe(t,n,r){r===void 0&&(r=P===null?e.TEXTURE0+M-1:P);let i=ne[r];i===void 0&&(i={type:void 0,texture:void 0},ne[r]=i),(i.type!==t||i.texture!==n)&&(P!==r&&(e.activeTexture(r),P=r),e.bindTexture(t,n||oe[t]),i.type=t,i.texture=n)}function Se(){let t=ne[P];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ce(){try{e.compressedTexImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function we(){try{e.compressedTexImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Te(){try{e.texSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ee(){try{e.texSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function De(){try{e.compressedTexSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Oe(){try{e.compressedTexSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function ke(){try{e.texStorage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ae(){try{e.texStorage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function R(){try{e.texImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function je(){try{e.texImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Me(t){return d[t]===void 0?e.getParameter(t):d[t]}function Ne(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function z(t){ae.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ae.copy(t))}function Pe(t){F.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),F.copy(t))}function Fe(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Ie(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Le(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},P=null,ne={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new G(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ae.set(0,0,e.canvas.width,e.canvas.height),F.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:L,disable:se,bindFramebuffer:ce,drawBuffers:le,useProgram:ue,setBlending:pe,setMaterial:me,setFlipSided:he,setCullFace:ge,setLineWidth:_e,setPolygonOffset:ve,setScissorTest:ye,activeTexture:be,bindTexture:xe,unbindTexture:Se,compressedTexImage2D:Ce,compressedTexImage3D:we,texImage2D:R,texImage3D:je,pixelStorei:Ne,getParameter:Me,updateUBOMapping:Fe,uniformBlockBinding:Ie,texStorage2D:ke,texStorage3D:Ae,texSubImage2D:Te,texSubImage3D:Ee,compressedTexSubImage2D:De,compressedTexSubImage3D:Oe,scissor:z,viewport:Pe,reset:Le}}function od(l,u,d,f,p,m,h){let g=u.has(`WEBGL_multisampled_render_to_texture`)?u.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new U,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):Ke(`canvas`)}function T(e,t,n){let r=1,i=Me(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),B(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&B(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function D(e){return e.generateMipmaps}function O(e){l.generateMipmap(e)}function k(e){return e.isWebGLCubeRenderTarget?l.TEXTURE_CUBE_MAP:e.isWebGL3DRenderTarget?l.TEXTURE_3D:e.isWebGLArrayRenderTarget||e.isCompressedArrayTexture?l.TEXTURE_2D_ARRAY:l.TEXTURE_2D}function A(e,t,n,r,i,a=!1){if(e!==null){if(l[e]!==void 0)return l[e];B(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+e+`'`)}let o;r&&(o=u.get(`EXT_texture_norm16`),o||B(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let s=t;if(t===l.RED&&(n===l.FLOAT&&(s=l.R32F),n===l.HALF_FLOAT&&(s=l.R16F),n===l.UNSIGNED_BYTE&&(s=l.R8),n===l.UNSIGNED_SHORT&&o&&(s=o.R16_EXT),n===l.SHORT&&o&&(s=o.R16_SNORM_EXT)),t===l.RED_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.R8UI),n===l.UNSIGNED_SHORT&&(s=l.R16UI),n===l.UNSIGNED_INT&&(s=l.R32UI),n===l.BYTE&&(s=l.R8I),n===l.SHORT&&(s=l.R16I),n===l.INT&&(s=l.R32I)),t===l.RG&&(n===l.FLOAT&&(s=l.RG32F),n===l.HALF_FLOAT&&(s=l.RG16F),n===l.UNSIGNED_BYTE&&(s=l.RG8),n===l.UNSIGNED_SHORT&&o&&(s=o.RG16_EXT),n===l.SHORT&&o&&(s=o.RG16_SNORM_EXT)),t===l.RG_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RG8UI),n===l.UNSIGNED_SHORT&&(s=l.RG16UI),n===l.UNSIGNED_INT&&(s=l.RG32UI),n===l.BYTE&&(s=l.RG8I),n===l.SHORT&&(s=l.RG16I),n===l.INT&&(s=l.RG32I)),t===l.RGB_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGB8UI),n===l.UNSIGNED_SHORT&&(s=l.RGB16UI),n===l.UNSIGNED_INT&&(s=l.RGB32UI),n===l.BYTE&&(s=l.RGB8I),n===l.SHORT&&(s=l.RGB16I),n===l.INT&&(s=l.RGB32I)),t===l.RGBA_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGBA8UI),n===l.UNSIGNED_SHORT&&(s=l.RGBA16UI),n===l.UNSIGNED_INT&&(s=l.RGBA32UI),n===l.BYTE&&(s=l.RGBA8I),n===l.SHORT&&(s=l.RGBA16I),n===l.INT&&(s=l.RGBA32I)),t===l.RGB&&(n===l.UNSIGNED_SHORT&&o&&(s=o.RGB16_EXT),n===l.SHORT&&o&&(s=o.RGB16_SNORM_EXT),n===l.UNSIGNED_INT_5_9_9_9_REV&&(s=l.RGB9_E5),n===l.UNSIGNED_INT_10F_11F_11F_REV&&(s=l.R11F_G11F_B10F)),t===l.RGBA){let e=a?Re:Ft.getTransfer(i);n===l.FLOAT&&(s=l.RGBA32F),n===l.HALF_FLOAT&&(s=l.RGBA16F),n===l.UNSIGNED_BYTE&&(s=e===`srgb`?l.SRGB8_ALPHA8:l.RGBA8),n===l.UNSIGNED_SHORT&&o&&(s=o.RGBA16_EXT),n===l.SHORT&&o&&(s=o.RGBA16_SNORM_EXT),n===l.UNSIGNED_SHORT_4_4_4_4&&(s=l.RGBA4),n===l.UNSIGNED_SHORT_5_5_5_1&&(s=l.RGB5_A1)}return(s===l.R16F||s===l.R32F||s===l.RG16F||s===l.RG32F||s===l.RGBA16F||s===l.RGBA32F)&&u.get(`EXT_color_buffer_float`),s}function j(e,t){let n;return e?t===null||t===1014||t===1020?n=l.DEPTH24_STENCIL8:t===1015?n=l.DEPTH32F_STENCIL8:t===1012&&(n=l.DEPTH24_STENCIL8,B(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):t===null||t===1014||t===1020?n=l.DEPTH_COMPONENT24:t===1015?n=l.DEPTH_COMPONENT32F:t===1012&&(n=l.DEPTH_COMPONENT16),n}function M(e,t){return D(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function N(e){let t=e.target;t.removeEventListener(`dispose`,N),te(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function ee(e){let t=e.target;t.removeEventListener(`dispose`,ee),ne(t)}function te(e){let t=f.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=S.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&P(e),Object.keys(r).length===0&&S.delete(n)}f.remove(e)}function P(e){let t=f.get(e);l.deleteTexture(t.__webglTexture);let n=e.source,r=S.get(n);delete r[t.__cacheKey],h.memory.textures--}function ne(e){let t=f.get(e);if(e.depthTexture&&(e.depthTexture.dispose(),f.remove(e.depthTexture)),e.isWebGLCubeRenderTarget)for(let e=0;e<6;e++){if(Array.isArray(t.__webglFramebuffer[e]))for(let n=0;n<t.__webglFramebuffer[e].length;n++)l.deleteFramebuffer(t.__webglFramebuffer[e][n]);else l.deleteFramebuffer(t.__webglFramebuffer[e]);t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer[e])}else{if(Array.isArray(t.__webglFramebuffer))for(let e=0;e<t.__webglFramebuffer.length;e++)l.deleteFramebuffer(t.__webglFramebuffer[e]);else l.deleteFramebuffer(t.__webglFramebuffer);if(t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer),t.__webglMultisampledFramebuffer&&l.deleteFramebuffer(t.__webglMultisampledFramebuffer),t.__webglColorRenderbuffer)for(let e=0;e<t.__webglColorRenderbuffer.length;e++)t.__webglColorRenderbuffer[e]&&l.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);t.__webglDepthRenderbuffer&&l.deleteRenderbuffer(t.__webglDepthRenderbuffer)}let n=e.textures;for(let e=0,t=n.length;e<t;e++){let t=f.get(n[e]);t.__webglTexture&&(l.deleteTexture(t.__webglTexture),h.memory.textures--),f.remove(n[e])}f.remove(e)}let re=0;function ie(){re=0}function ae(){return re}function F(e){re=e}function I(){let e=re;return e>=p.maxTextures&&B(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+p.maxTextures),re+=1,e}function oe(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function L(e,t){let n=f.get(e);if(e.isVideoTexture&&R(e),e.isRenderTargetTexture===!1&&e.isExternalTexture!==!0&&e.version>0&&n.__version!==e.version){let r=e.image;if(r===null)B(`WebGLRenderer: Texture marked for update but no image data found.`);else if(r.complete===!1)B(`WebGLRenderer: Texture marked for update but image is incomplete`);else{_e(n,e,t);return}}else e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null);d.bindTexture(l.TEXTURE_2D,n.__webglTexture,l.TEXTURE0+t)}function se(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){_e(n,e,t);return}e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null),d.bindTexture(l.TEXTURE_2D_ARRAY,n.__webglTexture,l.TEXTURE0+t)}function ce(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){_e(n,e,t);return}d.bindTexture(l.TEXTURE_3D,n.__webglTexture,l.TEXTURE0+t)}function le(e,t){let n=f.get(e);if(e.isCubeDepthTexture!==!0&&e.version>0&&n.__version!==e.version){ve(n,e,t);return}d.bindTexture(l.TEXTURE_CUBE_MAP,n.__webglTexture,l.TEXTURE0+t)}let ue={[e]:l.REPEAT,[t]:l.CLAMP_TO_EDGE,[n]:l.MIRRORED_REPEAT},de={[r]:l.NEAREST,[i]:l.NEAREST_MIPMAP_NEAREST,[a]:l.NEAREST_MIPMAP_LINEAR,[o]:l.LINEAR,[s]:l.LINEAR_MIPMAP_NEAREST,[c]:l.LINEAR_MIPMAP_LINEAR},fe={512:l.NEVER,519:l.ALWAYS,513:l.LESS,515:l.LEQUAL,514:l.EQUAL,518:l.GEQUAL,516:l.GREATER,517:l.NOTEQUAL};function pe(e,t){if(t.type===1015&&u.has(`OES_texture_float_linear`)===!1&&(t.magFilter===1006||t.magFilter===1007||t.magFilter===1005||t.magFilter===1008||t.minFilter===1006||t.minFilter===1007||t.minFilter===1005||t.minFilter===1008)&&B(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),l.texParameteri(e,l.TEXTURE_WRAP_S,ue[t.wrapS]),l.texParameteri(e,l.TEXTURE_WRAP_T,ue[t.wrapT]),(e===l.TEXTURE_3D||e===l.TEXTURE_2D_ARRAY)&&l.texParameteri(e,l.TEXTURE_WRAP_R,ue[t.wrapR]),l.texParameteri(e,l.TEXTURE_MAG_FILTER,de[t.magFilter]),l.texParameteri(e,l.TEXTURE_MIN_FILTER,de[t.minFilter]),t.compareFunction&&(l.texParameteri(e,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(e,l.TEXTURE_COMPARE_FUNC,fe[t.compareFunction])),u.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&u.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1||f.get(t).__currentAnisotropy){let n=u.get(`EXT_texture_filter_anisotropic`);l.texParameterf(e,n.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,p.getMaxAnisotropy())),f.get(t).__currentAnisotropy=t.anisotropy}}}function me(e,t){let n=!1;e.__webglInit===void 0&&(e.__webglInit=!0,t.addEventListener(`dispose`,N));let r=t.source,i=S.get(r);i===void 0&&(i={},S.set(r,i));let a=oe(t);if(a!==e.__cacheKey){i[a]===void 0&&(i[a]={texture:l.createTexture(),usedTimes:0},h.memory.textures++,n=!0),i[a].usedTimes++;let r=i[e.__cacheKey];r!==void 0&&(i[e.__cacheKey].usedTimes--,r.usedTimes===0&&P(t)),e.__cacheKey=a,e.__webglTexture=i[a].texture}return n}function he(e,t,n){return Math.floor(Math.floor(e/n)/t)}function ge(e,t,n,r){let i=e.updateRanges;if(i.length===0)d.texSubImage2D(l.TEXTURE_2D,0,0,0,t.width,t.height,n,r,t.data);else{i.sort((e,t)=>e.start-t.start);let a=0;for(let e=1;e<i.length;e++){let n=i[a],r=i[e],o=n.start+n.count,s=he(r.start,t.width,4),c=he(n.start,t.width,4);r.start<=o+1&&s===c&&he(r.start+r.count-1,t.width,4)===s?n.count=Math.max(n.count,r.start+r.count-n.start):(++a,i[a]=r)}i.length=a+1;let o=d.getParameter(l.UNPACK_ROW_LENGTH),s=d.getParameter(l.UNPACK_SKIP_PIXELS),c=d.getParameter(l.UNPACK_SKIP_ROWS);d.pixelStorei(l.UNPACK_ROW_LENGTH,t.width);for(let e=0,a=i.length;e<a;e++){let a=i[e],o=Math.floor(a.start/4),s=Math.ceil(a.count/4),c=o%t.width,u=Math.floor(o/t.width),f=s;d.pixelStorei(l.UNPACK_SKIP_PIXELS,c),d.pixelStorei(l.UNPACK_SKIP_ROWS,u),d.texSubImage2D(l.TEXTURE_2D,0,c,u,f,1,n,r,t.data)}e.clearUpdateRanges(),d.pixelStorei(l.UNPACK_ROW_LENGTH,o),d.pixelStorei(l.UNPACK_SKIP_PIXELS,s),d.pixelStorei(l.UNPACK_SKIP_ROWS,c)}}function _e(e,t,n){let r=l.TEXTURE_2D;(t.isDataArrayTexture||t.isCompressedArrayTexture)&&(r=l.TEXTURE_2D_ARRAY),t.isData3DTexture&&(r=l.TEXTURE_3D);let i=me(e,t),a=t.source;d.bindTexture(r,e.__webglTexture,l.TEXTURE0+n);let o=f.get(a);if(a.version!==o.__version||i===!0){if(d.activeTexture(l.TEXTURE0+n),!(typeof ImageBitmap<`u`&&t.image instanceof ImageBitmap)){let e=Ft.getPrimaries(Ft.workingColorSpace),n=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),r=t.colorSpace===``||e===n?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,r)}d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment);let e=T(t.image,!1,p.maxTextureSize);e=je(t,e);let s=m.convert(t.format,t.colorSpace),c=m.convert(t.type),u=A(t.internalFormat,s,c,t.normalized,t.colorSpace,t.isVideoTexture);pe(r,t);let f,h=t.mipmaps,g=t.isVideoTexture!==!0,_=o.__version===void 0||i===!0,v=a.dataReady,y=M(t,e);if(t.isDepthTexture)u=j(t.format===E,t.type),_&&(g?d.texStorage2D(l.TEXTURE_2D,1,u,e.width,e.height):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,null));else if(t.isDataTexture){if(h.length>0){g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data);t.generateMipmaps=!1}else g?(_&&d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height),v&&ge(t,e,s,c)):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,e.data)}else if(t.isCompressedTexture){if(t.isCompressedArrayTexture){g&&_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,h[0].width,h[0].height,e.depth);for(let n=0,r=h.length;n<r;n++)if(f=h[n],t.format!==1023){if(s!==null){if(g){if(v){if(t.layerUpdates.size>0){let e=tc(f.width,f.height,t.format,t.type);for(let r of t.layerUpdates){let t=f.data.subarray(r*e/f.data.BYTES_PER_ELEMENT,(r+1)*e/f.data.BYTES_PER_ELEMENT);d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,r,f.width,f.height,1,s,t)}t.clearLayerUpdates()}else d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,f.data)}}else d.compressedTexImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,f.data,0,0)}else B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else g?v&&d.texSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,c,f.data):d.texImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,s,c,f.data)}else{g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,n=h.length;e<n;e++)f=h[e],t.format===1023?g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data):s===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&d.compressedTexSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,f.data):d.compressedTexImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,f.data)}}else if(t.isDataArrayTexture){if(g){if(_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,e.width,e.height,e.depth),v){if(t.layerUpdates.size>0){let n=tc(e.width,e.height,t.format,t.type);for(let r of t.layerUpdates){let t=e.data.subarray(r*n/e.data.BYTES_PER_ELEMENT,(r+1)*n/e.data.BYTES_PER_ELEMENT);d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,r,e.width,e.height,1,s,c,t)}t.clearLayerUpdates()}else d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)}}else d.texImage3D(l.TEXTURE_2D_ARRAY,0,u,e.width,e.height,e.depth,0,s,c,e.data)}else if(t.isData3DTexture)g?(_&&d.texStorage3D(l.TEXTURE_3D,y,u,e.width,e.height,e.depth),v&&d.texSubImage3D(l.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)):d.texImage3D(l.TEXTURE_3D,0,u,e.width,e.height,e.depth,0,s,c,e.data);else if(t.isFramebufferTexture){if(_){if(g)d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height);else{let t=e.width,n=e.height;for(let e=0;e<y;e++)d.texImage2D(l.TEXTURE_2D,e,u,t,n,0,s,c,null),t>>=1,n>>=1}}}else if(t.isHTMLTexture){if(`texElementImage2D`in l){let n=l.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),e.parentNode!==n){n.appendChild(e),b.add(t),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(l.texElementImage2D.length===3)l.texElementImage2D(l.TEXTURE_2D,l.RGBA8,e);else{let t=l.RGBA,n=l.RGBA,r=l.UNSIGNED_BYTE;l.texElementImage2D(l.TEXTURE_2D,0,t,n,r,e)}l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let e=Me(h[0]);d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height)}for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,s,c,f):d.texImage2D(l.TEXTURE_2D,e,u,s,c,f);t.generateMipmaps=!1}else if(g){if(_){let t=Me(e);d.texStorage2D(l.TEXTURE_2D,y,u,t.width,t.height)}v&&d.texSubImage2D(l.TEXTURE_2D,0,0,0,s,c,e)}else d.texImage2D(l.TEXTURE_2D,0,u,s,c,e);D(t)&&O(r),o.__version=a.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function ve(e,t,n){if(t.image.length!==6)return;let r=me(e,t),i=t.source;d.bindTexture(l.TEXTURE_CUBE_MAP,e.__webglTexture,l.TEXTURE0+n);let a=f.get(i);if(i.version!==a.__version||r===!0){d.activeTexture(l.TEXTURE0+n);let e=Ft.getPrimaries(Ft.workingColorSpace),o=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),s=t.colorSpace===``||e===o?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,s);let c=t.isCompressedTexture||t.image[0].isCompressedTexture,u=t.image[0]&&t.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!c&&!u?f[e]=T(t.image[e],!0,p.maxCubemapSize):f[e]=u?t.image[e].image:t.image[e],f[e]=je(t,f[e]);let h=f[0],g=m.convert(t.format,t.colorSpace),_=m.convert(t.type),v=A(t.internalFormat,g,_,t.normalized,t.colorSpace),y=t.isVideoTexture!==!0,b=a.__version===void 0||r===!0,x=i.dataReady,S=M(t,h);pe(l.TEXTURE_CUBE_MAP,t);let C;if(c){y&&b&&d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let e=0;e<6;e++){C=f[e].mipmaps;for(let n=0;n<C.length;n++){let r=C[n];t.format===1023?y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,_,r.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,g,_,r.data):g===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&d.compressedTexSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,r.data):d.compressedTexImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,r.data)}}}else{if(C=t.mipmaps,y&&b){C.length>0&&S++;let e=Me(f[0]);d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,e.width,e.height)}for(let e=0;e<6;e++)if(u){y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,f[e].width,f[e].height,g,_,f[e].data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,f[e].width,f[e].height,0,g,_,f[e].data);for(let t=0;t<C.length;t++){let n=C[t].image[e].image;y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,n.width,n.height,g,_,n.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,n.width,n.height,0,g,_,n.data)}}else{y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,g,_,f[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,g,_,f[e]);for(let t=0;t<C.length;t++){let n=C[t];y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,g,_,n.image[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,g,_,n.image[e])}}}D(t)&&O(l.TEXTURE_CUBE_MAP),a.__version=i.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function ye(e,t,n,r,i,a){let o=m.convert(n.format,n.colorSpace),s=m.convert(n.type),c=A(n.internalFormat,o,s,n.normalized,n.colorSpace),u=f.get(t),p=f.get(n);if(p.__renderTarget=t,!u.__hasExternalTextures){let e=Math.max(1,t.width>>a),n=Math.max(1,t.height>>a);i===l.TEXTURE_3D||i===l.TEXTURE_2D_ARRAY?d.texImage3D(i,a,c,e,n,t.depth,0,o,s,null):d.texImage2D(i,a,c,e,n,0,o,s,null)}d.bindFramebuffer(l.FRAMEBUFFER,e),Ae(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,r,i,p.__webglTexture,0,ke(t)):(i===l.TEXTURE_2D||i>=l.TEXTURE_CUBE_MAP_POSITIVE_X&&i<=l.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&l.framebufferTexture2D(l.FRAMEBUFFER,r,i,p.__webglTexture,a),d.bindFramebuffer(l.FRAMEBUFFER,null)}function be(e,t,n){if(l.bindRenderbuffer(l.RENDERBUFFER,e),t.depthBuffer){let r=t.depthTexture,i=r&&r.isDepthTexture?r.type:null,a=j(t.stencilBuffer,i),o=t.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;Ae(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,ke(t),a,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,ke(t),a,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,a,t.width,t.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,o,l.RENDERBUFFER,e)}else{let e=t.textures;for(let r=0;r<e.length;r++){let i=e[r],a=m.convert(i.format,i.colorSpace),o=m.convert(i.type),s=A(i.internalFormat,a,o,i.normalized,i.colorSpace);Ae(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,ke(t),s,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,ke(t),s,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,s,t.width,t.height)}}l.bindRenderbuffer(l.RENDERBUFFER,null)}function xe(e,t,n){let r=t.isWebGLCubeRenderTarget===!0;if(d.bindFramebuffer(l.FRAMEBUFFER,e),!(t.depthTexture&&t.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let i=f.get(t.depthTexture);if(i.__renderTarget=t,(!i.__webglTexture||t.depthTexture.image.width!==t.width||t.depthTexture.image.height!==t.height)&&(t.depthTexture.image.width=t.width,t.depthTexture.image.height=t.height,t.depthTexture.needsUpdate=!0),r){if(i.__webglInit===void 0&&(i.__webglInit=!0,t.depthTexture.addEventListener(`dispose`,N)),i.__webglTexture===void 0){i.__webglTexture=l.createTexture(),d.bindTexture(l.TEXTURE_CUBE_MAP,i.__webglTexture),pe(l.TEXTURE_CUBE_MAP,t.depthTexture);let e=m.convert(t.depthTexture.format),n=m.convert(t.depthTexture.type),r;t.depthTexture.format===1026?r=l.DEPTH_COMPONENT24:t.depthTexture.format===1027&&(r=l.DEPTH24_STENCIL8);for(let i=0;i<6;i++)l.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,r,t.width,t.height,0,e,n,null)}}else L(t.depthTexture,0);let a=i.__webglTexture,o=ke(t),s=r?l.TEXTURE_CUBE_MAP_POSITIVE_X+n:l.TEXTURE_2D,c=t.depthTexture.format===1027?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;if(t.depthTexture.format===1026)Ae(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else if(t.depthTexture.format===1027)Ae(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function Se(e){let t=f.get(e),n=e.isWebGLCubeRenderTarget===!0;if(t.__boundDepthTexture!==e.depthTexture){let n=e.depthTexture;if(t.__depthDisposeCallback&&t.__depthDisposeCallback(),n){let e=()=>{delete t.__boundDepthTexture,delete t.__depthDisposeCallback,n.removeEventListener(`dispose`,e)};n.addEventListener(`dispose`,e),t.__depthDisposeCallback=e}t.__boundDepthTexture=n}if(e.depthTexture&&!t.__autoAllocateDepthBuffer){if(n)for(let n=0;n<6;n++)xe(t.__webglFramebuffer[n],e,n);else{let n=e.texture.mipmaps;n&&n.length>0?xe(t.__webglFramebuffer[0],e,0):xe(t.__webglFramebuffer,e,0)}}else if(n){t.__webglDepthbuffer=[];for(let n=0;n<6;n++)if(d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[n]),t.__webglDepthbuffer[n]===void 0)t.__webglDepthbuffer[n]=l.createRenderbuffer(),be(t.__webglDepthbuffer[n],e,!1);else{let r=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,i=t.__webglDepthbuffer[n];l.bindRenderbuffer(l.RENDERBUFFER,i),l.framebufferRenderbuffer(l.FRAMEBUFFER,r,l.RENDERBUFFER,i)}}else{let n=e.texture.mipmaps;if(n&&n.length>0?d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[0]):d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer),t.__webglDepthbuffer===void 0)t.__webglDepthbuffer=l.createRenderbuffer(),be(t.__webglDepthbuffer,e,!1);else{let n=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,r=t.__webglDepthbuffer;l.bindRenderbuffer(l.RENDERBUFFER,r),l.framebufferRenderbuffer(l.FRAMEBUFFER,n,l.RENDERBUFFER,r)}}d.bindFramebuffer(l.FRAMEBUFFER,null)}function Ce(e,t,n){let r=f.get(e);t!==void 0&&ye(r.__webglFramebuffer,e,e.texture,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,0),n!==void 0&&Se(e)}function we(e){let t=e.texture,n=f.get(e),r=f.get(t);e.addEventListener(`dispose`,ee);let i=e.textures,a=e.isWebGLCubeRenderTarget===!0,o=i.length>1;if(o||(r.__webglTexture===void 0&&(r.__webglTexture=l.createTexture()),r.__version=t.version,h.memory.textures++),a){n.__webglFramebuffer=[];for(let e=0;e<6;e++)if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer[e]=[];for(let r=0;r<t.mipmaps.length;r++)n.__webglFramebuffer[e][r]=l.createFramebuffer()}else n.__webglFramebuffer[e]=l.createFramebuffer()}else{if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer=[];for(let e=0;e<t.mipmaps.length;e++)n.__webglFramebuffer[e]=l.createFramebuffer()}else n.__webglFramebuffer=l.createFramebuffer();if(o)for(let e=0,t=i.length;e<t;e++){let t=f.get(i[e]);t.__webglTexture===void 0&&(t.__webglTexture=l.createTexture(),h.memory.textures++)}if(e.samples>0&&Ae(e)===!1){n.__webglMultisampledFramebuffer=l.createFramebuffer(),n.__webglColorRenderbuffer=[],d.bindFramebuffer(l.FRAMEBUFFER,n.__webglMultisampledFramebuffer);for(let t=0;t<i.length;t++){let r=i[t];n.__webglColorRenderbuffer[t]=l.createRenderbuffer(),l.bindRenderbuffer(l.RENDERBUFFER,n.__webglColorRenderbuffer[t]);let a=m.convert(r.format,r.colorSpace),o=m.convert(r.type),s=A(r.internalFormat,a,o,r.normalized,r.colorSpace,e.isXRRenderTarget===!0),c=ke(e);l.renderbufferStorageMultisample(l.RENDERBUFFER,c,s,e.width,e.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+t,l.RENDERBUFFER,n.__webglColorRenderbuffer[t])}l.bindRenderbuffer(l.RENDERBUFFER,null),e.depthBuffer&&(n.__webglDepthRenderbuffer=l.createRenderbuffer(),be(n.__webglDepthRenderbuffer,e,!0)),d.bindFramebuffer(l.FRAMEBUFFER,null)}}if(a){d.bindTexture(l.TEXTURE_CUBE_MAP,r.__webglTexture),pe(l.TEXTURE_CUBE_MAP,t);for(let r=0;r<6;r++)if(t.mipmaps&&t.mipmaps.length>0)for(let i=0;i<t.mipmaps.length;i++)ye(n.__webglFramebuffer[r][i],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,i);else ye(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,0);D(t)&&O(l.TEXTURE_CUBE_MAP),d.unbindTexture()}else if(o){for(let t=0,r=i.length;t<r;t++){let r=i[t],a=f.get(r),o=l.TEXTURE_2D;(e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(o=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(o,a.__webglTexture),pe(o,r),ye(n.__webglFramebuffer,e,r,l.COLOR_ATTACHMENT0+t,o,0),D(r)&&O(o)}d.unbindTexture()}else{let i=l.TEXTURE_2D;if((e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(i=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(i,r.__webglTexture),pe(i,t),t.mipmaps&&t.mipmaps.length>0)for(let r=0;r<t.mipmaps.length;r++)ye(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,i,r);else ye(n.__webglFramebuffer,e,t,l.COLOR_ATTACHMENT0,i,0);D(t)&&O(i),d.unbindTexture()}e.depthBuffer&&Se(e)}function Te(e){let t=e.textures;for(let n=0,r=t.length;n<r;n++){let r=t[n];if(D(r)){let t=k(e),n=f.get(r).__webglTexture;d.bindTexture(t,n),O(t),d.unbindTexture()}}}let Ee=[],De=[];function Oe(e){if(e.samples>0){if(Ae(e)===!1){let t=e.textures,n=e.width,r=e.height,i=l.COLOR_BUFFER_BIT,a=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,o=f.get(e),s=t.length>1;if(s)for(let e=0;e<t.length;e++)d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,null),d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,null,0);d.bindFramebuffer(l.READ_FRAMEBUFFER,o.__webglMultisampledFramebuffer);let c=e.texture.mipmaps;c&&c.length>0?d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer[0]):d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer);for(let c=0;c<t.length;c++){if(e.resolveDepthBuffer&&(e.depthBuffer&&(i|=l.DEPTH_BUFFER_BIT),e.stencilBuffer&&e.resolveStencilBuffer&&(i|=l.STENCIL_BUFFER_BIT)),s){l.framebufferRenderbuffer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.RENDERBUFFER,o.__webglColorRenderbuffer[c]);let e=f.get(t[c]).__webglTexture;l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,e,0)}l.blitFramebuffer(0,0,n,r,0,0,n,r,i,l.NEAREST),_===!0&&(Ee.length=0,De.length=0,Ee.push(l.COLOR_ATTACHMENT0+c),e.depthBuffer&&e.resolveDepthBuffer===!1&&(Ee.push(a),De.push(a),l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,De)),l.invalidateFramebuffer(l.READ_FRAMEBUFFER,Ee))}if(d.bindFramebuffer(l.READ_FRAMEBUFFER,null),d.bindFramebuffer(l.DRAW_FRAMEBUFFER,null),s)for(let e=0;e<t.length;e++){d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,o.__webglColorRenderbuffer[e]);let n=f.get(t[e]).__webglTexture;d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,n,0)}d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglMultisampledFramebuffer)}else if(e.depthBuffer&&e.resolveDepthBuffer===!1&&_){let t=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,[t])}}}function ke(e){return Math.min(p.maxSamples,e.samples)}function Ae(e){let t=f.get(e);return e.samples>0&&u.has(`WEBGL_multisampled_render_to_texture`)===!0&&t.__useRenderToTexture!==!1}function R(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function je(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Ft.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&B(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):V(`WebGLTextures: Unsupported texture color space:`,n)),t}function Me(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=I,this.resetTextureUnits=ie,this.getTextureUnits=ae,this.setTextureUnits=F,this.setTexture2D=L,this.setTexture2DArray=se,this.setTexture3D=ce,this.setTextureCube=le,this.rebindTextures=Ce,this.setupRenderTarget=we,this.updateRenderTargetMipmap=Te,this.updateMultisampleRenderTarget=Oe,this.setupDepthRenderbuffer=Se,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=Ae,this.isReversedDepthBuffer=function(){return d.buffers.depth.getReversed()}}function sd(e,t){function n(n,r=``){let i,a=Ft.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var cd=`
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

}`,ud=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new sa(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Jo({vertexShader:cd,fragmentShader:ld,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new K(new Po(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},dd=class extends et{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,u=null,d=null,f=null,p=null,h=null,g=typeof XRWebGLBinding<`u`,_=new ud,v={},b=t.getContextAttributes(),x=null,S=null,C=[],D=[],O=new U,k=null,A=new Ts;A.viewport=new Kt;let j=new Ts;j.viewport=new Kt;let M=[A,j],N=new Is,ee=null,te=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getGripSpace()},this.getHand=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getHandSpace()};function P(e){let t=D.indexOf(e.inputSource);if(t===-1)return;let n=C[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ne(){r.removeEventListener(`select`,P),r.removeEventListener(`selectstart`,P),r.removeEventListener(`selectend`,P),r.removeEventListener(`squeeze`,P),r.removeEventListener(`squeezestart`,P),r.removeEventListener(`squeezeend`,P),r.removeEventListener(`end`,ne),r.removeEventListener(`inputsourceschange`,re);for(let e=0;e<C.length;e++){let t=D[e];t!==null&&(D[e]=null,C[e].disconnect(t))}ee=null,te=null,_.reset();for(let e in v)delete v[e];e.setRenderTarget(x),p=null,f=null,d=null,r=null,S=null,ce.stop(),n.isPresenting=!1,e.setPixelRatio(k),e.setSize(O.width,O.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return f===null?p:f},this.getBinding=function(){return d===null&&g&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return h},this.getSession=function(){return r},this.setSession=async function(u){if(r=u,r!==null){if(x=e.getRenderTarget(),r.addEventListener(`select`,P),r.addEventListener(`selectstart`,P),r.addEventListener(`selectend`,P),r.addEventListener(`squeeze`,P),r.addEventListener(`squeezestart`,P),r.addEventListener(`squeezeend`,P),r.addEventListener(`end`,ne),r.addEventListener(`inputsourceschange`,re),b.xrCompatible!==!0&&await t.makeXRCompatible(),k=e.getPixelRatio(),e.getSize(O),g&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;b.depth&&(o=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=b.stencil?E:T,a=b.stencil?y:m);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};d=this.getBinding(),f=d.createProjectionLayer(s),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),S=new Jt(f.textureWidth,f.textureHeight,{format:w,type:l,depthTexture:new aa(f.textureWidth,f.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{let n={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:i};p=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new Jt(p.framebufferWidth,p.framebufferHeight,{format:w,type:l,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ce.setContext(r),ce.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function re(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=D.indexOf(n);r>=0&&(D[r]=null,C[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=D.indexOf(n);if(r===-1){for(let e=0;e<C.length;e++)if(e>=D.length){D.push(n),r=e;break}else if(D[e]===null){D[e]=n,r=e;break}if(r===-1)break}let i=C[r];i&&i.connect(n)}}let ie=new W,ae=new W;function F(e,t,n){ie.setFromMatrixPosition(t.matrixWorld),ae.setFromMatrixPosition(n.matrixWorld);let r=ie.distanceTo(ae),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function I(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;_.texture!==null&&(_.depthNear>0&&(t=_.depthNear),_.depthFar>0&&(n=_.depthFar)),N.near=j.near=A.near=t,N.far=j.far=A.far=n,(ee!==N.near||te!==N.far)&&(r.updateRenderState({depthNear:N.near,depthFar:N.far}),ee=N.near,te=N.far),N.layers.mask=e.layers.mask|6,A.layers.mask=N.layers.mask&-5,j.layers.mask=N.layers.mask&-3;let i=e.parent,a=N.cameras;I(N,i);for(let e=0;e<a.length;e++)I(a[e],i);a.length===2?F(N,A,j):N.projectionMatrix.copy(A.projectionMatrix),oe(e,N,i)};function oe(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=it*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(f!==null||p!==null)return s},this.setFoveation=function(e){s=e,f!==null&&(f.fixedFoveation=e),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=e)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(N)},this.getCameraTexture=function(e){return v[e]};let L=null;function se(t,i){if(u=i.getViewerPose(c||a),h=i,u!==null){let t=u.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let i=!1;t.length!==N.cameras.length&&(N.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(p!==null)a=p.getViewport(r);else{let t=d.getViewSubImage(f,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(S,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(S))}let o=M[n];o===void 0&&(o=new Ts,o.layers.enable(n),o.viewport=new Kt,M[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(N.matrix.copy(o.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),i===!0&&N.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&g){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&_.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&g){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=v[n];e||(e=new sa,v[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<C.length;e++){let t=D[e],n=C[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}L&&L(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),h=null}let ce=new rc;ce.setAnimationLoop(se),this.setAnimationLoop=function(e){L=e},this.dispose=function(){}}},fd=new Zt,pd=new At;pd.set(-1,0,0,0,1,0,0,0,1);function md(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Wo(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(fd.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(pd),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function hd(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return V(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?B(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):B(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var gd=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),_d=null;function vd(){return _d===null&&(_d=new yi(gd,16,16,k,g),_d.name=`DFG_LUT`,_d.minFilter=o,_d.magFilter=o,_d.wrapS=t,_d.wrapT=t,_d.generateMipmaps=!1,_d.needsUpdate=!0),_d}var yd=class{constructor(e={}){let{canvas:t=qe(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:u=!1,powerPreference:d=`default`,failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:h=!1,outputBufferType:b=l}=e;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);x=n.getContextAttributes().alpha}else x=a;let S=b,C=new Set([j,A,O]),w=new Set([l,m,f,y,_,v]),T=new Uint32Array(4),E=new Int32Array(4),D=new W,k=null,M=null,N=[],ee=[],te=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,ne=!1,re=null,ie=null,ae=null,F=null;this._outputColorSpace=Ie;let I=0,oe=0,L=null,se=-1,ce=null,le=new Kt,ue=new Kt,de=null,fe=new G(0),pe=0,me=t.width,he=t.height,ge=1,_e=null,ve=null,ye=new Kt(0,0,me,he),be=new Kt(0,0,me,he),xe=!1,Se=new Ii,Ce=!1,we=!1,Te=new Zt,Ee=new W,De=new Kt,Oe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ke=!1;function Ae(){return L===null?ge:1}let R=n;function je(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:u,powerPreference:d,failIfMajorPerformanceCaveat:p};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,ot,!1),t.addEventListener(`webglcontextrestored`,st,!1),t.addEventListener(`webglcontextcreationerror`,ct,!1),R===null){let t=`webgl2`;if(R=je(t,e),R===null)throw je(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw V(`WebGLRenderer: `+e.message),e}let Me,Ne,z,Pe,Fe,Le,Re,ze,Be,Ve,He,We,Ge,Ke,Je,Xe,Ze,$e,et,tt,nt,rt,it;function at(){Me=new Lc(R),Me.init(),nt=new sd(R,Me),Ne=new pc(R,Me,e,nt),z=new ad(R,Me),Ne.reversedDepthBuffer&&h&&z.buffers.depth.setReversed(!0),ie=R.createFramebuffer(),ae=R.createFramebuffer(),F=R.createFramebuffer(),Pe=new Bc(R),Fe=new zu,Le=new od(R,Me,z,Fe,Ne,nt,Pe),Re=new Ic(P),ze=new ic(R),rt=new dc(R,ze),Be=new Rc(R,ze,Pe,rt),Ve=new Hc(R,Be,ze,rt,Pe),$e=new Vc(R,Ne,Le),Je=new mc(Fe),He=new Ru(P,Re,Me,Ne,rt,Je),We=new md(P,Fe),Ge=new Uu,Ke=new Xu(Me),Ze=new uc(P,Re,z,Ve,x,s),Xe=new id(P,Ve,Ne),it=new hd(R,Pe,Ne,z),et=new fc(R,Me,Pe),tt=new zc(R,Me,Pe),Pe.programs=He.programs,P.capabilities=Ne,P.extensions=Me,P.properties=Fe,P.renderLists=Ge,P.shadowMap=Xe,P.state=z,P.info=Pe}at(),S!==1009&&(te=new Wc(S,t.width,t.height,o,r,i));let H=new dd(P,R);this.xr=H,this.getContext=function(){return R},this.getContextAttributes=function(){return R.getContextAttributes()},this.forceContextLoss=function(){let e=Me.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Me.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ge},this.setPixelRatio=function(e){e!==void 0&&(ge=e,this.setSize(me,he,!1))},this.getSize=function(e){return e.set(me,he)},this.setSize=function(e,n,r=!0){if(H.isPresenting){B(`WebGLRenderer: Can't change size while VR device is presenting.`);return}me=e,he=n,t.width=Math.floor(e*ge),t.height=Math.floor(n*ge),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),te!==null&&te.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(me*ge,he*ge).floor()},this.setDrawingBufferSize=function(e,n,r){me=e,he=n,ge=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(S===1009){V(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){B(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}te.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(le)},this.getViewport=function(e){return e.copy(ye)},this.setViewport=function(e,t,n,r){e.isVector4?ye.set(e.x,e.y,e.z,e.w):ye.set(e,t,n,r),z.viewport(le.copy(ye).multiplyScalar(ge).round())},this.getScissor=function(e){return e.copy(be)},this.setScissor=function(e,t,n,r){e.isVector4?be.set(e.x,e.y,e.z,e.w):be.set(e,t,n,r),z.scissor(ue.copy(be).multiplyScalar(ge).round())},this.getScissorTest=function(){return xe},this.setScissorTest=function(e){z.setScissorTest(xe=e)},this.setOpaqueSort=function(e){_e=e},this.setTransparentSort=function(e){ve=e},this.getClearColor=function(e){return e.copy(Ze.getClearColor())},this.setClearColor=function(){Ze.setClearColor(...arguments)},this.getClearAlpha=function(){return Ze.getClearAlpha()},this.setClearAlpha=function(){Ze.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(L!==null){let t=L.texture.format;e=C.has(t)}if(e){let e=L.texture.type,t=w.has(e),n=Ze.getClearColor(),r=Ze.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(T[0]=i,T[1]=a,T[2]=o,T[3]=r,R.clearBufferuiv(R.COLOR,0,T)):(E[0]=i,E[1]=a,E[2]=o,E[3]=r,R.clearBufferiv(R.COLOR,0,E))}else r|=R.COLOR_BUFFER_BIT}t&&(r|=R.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=R.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&R.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),re=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,ot,!1),t.removeEventListener(`webglcontextrestored`,st,!1),t.removeEventListener(`webglcontextcreationerror`,ct,!1),Ze.dispose(),Ge.dispose(),Ke.dispose(),Fe.dispose(),Re.dispose(),Ve.dispose(),rt.dispose(),it.dispose(),He.dispose(),H.dispose(),H.removeEventListener(`sessionstart`,ht),H.removeEventListener(`sessionend`,gt),_t.stop()};function ot(e){e.preventDefault(),Ye(`WebGLRenderer: Context Lost.`),ne=!0}function st(){Ye(`WebGLRenderer: Context Restored.`),ne=!1;let e=Pe.autoReset,t=Xe.enabled,n=Xe.autoUpdate,r=Xe.needsUpdate,i=Xe.type;at(),Pe.autoReset=e,Xe.enabled=t,Xe.autoUpdate=n,Xe.needsUpdate=r,Xe.type=i}function ct(e){V(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function lt(e){let t=e.target;t.removeEventListener(`dispose`,lt),ut(t)}function ut(e){dt(e),Fe.remove(e)}function dt(e){let t=Fe.get(e).programs;t!==void 0&&(t.forEach(function(e){He.releaseProgram(e)}),e.isShaderMaterial&&He.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Oe);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=U(e,t,n,r,i);z.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Be.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;rt.setup(i,r,s,n,c);let h,g=et;if(c!==null&&(h=ze.get(c),g=tt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(z.setLineWidth(r.wireframeLinewidth*Ae()),g.setMode(R.LINES)):g.setMode(R.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),z.setLineWidth(e*Ae()),i.isLineSegments?g.setMode(R.LINES):i.isLineLoop?g.setMode(R.LINE_LOOP):g.setMode(R.LINE_STRIP)}else i.isPoints?g.setMode(R.POINTS):i.isSprite&&g.setMode(R.TRIANGLES);if(i.isBatchedMesh){if(Me.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?ze.get(c).bytesPerElement:1,o=Fe.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(R,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function ft(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Ct(e,t,n),e.side=0,e.needsUpdate=!0,Ct(e,t,n),e.side=2):Ct(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),M=Ke.get(n),M.init(t),ee.push(M),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),M.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t){if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];ft(a,n,e),r.add(a)}else ft(t,n,e),r.add(t)}}),M=ee.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){Fe.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Me.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let pt=null;function mt(e){pt&&pt(e)}function ht(){_t.stop()}function gt(){_t.start()}let _t=new rc;_t.setAnimationLoop(mt),typeof self<`u`&&_t.setContext(self),this.setAnimationLoop=function(e){pt=e,H.setAnimationLoop(e),e===null?_t.stop():_t.start()},H.addEventListener(`sessionstart`,ht),H.addEventListener(`sessionend`,gt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){V(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(ne===!0)return;re!==null&&re.renderStart(e,t);let n=H.enabled===!0&&H.isPresenting===!0,r=te!==null&&(L===null||n)&&te.begin(P,L);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),H.enabled===!0&&H.isPresenting===!0&&(te===null||te.isCompositing()===!1)&&(H.cameraAutoUpdate===!0&&H.updateCamera(t),t=H.getCamera()),e.isScene===!0&&e.onBeforeRender(P,e,t,L),M=Ke.get(e,ee.length),M.init(t),M.state.textureUnits=Le.getTextureUnits(),ee.push(M),Te.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),Se.setFromProjectionMatrix(Te,Ue,t.reversedDepth),we=this.localClippingEnabled,Ce=Je.init(this.clippingPlanes,we),k=Ge.get(e,N.length),k.init(),N.push(k),H.enabled===!0&&H.isPresenting===!0){let e=P.xr.getDepthSensingMesh();e!==null&&vt(e,t,-1/0,P.sortObjects)}vt(e,t,0,P.sortObjects),k.finish(),P.sortObjects===!0&&k.sort(_e,ve,t.reversedDepth),ke=H.enabled===!1||H.isPresenting===!1||H.hasDepthSensing()===!1,ke&&Ze.addToRenderList(k,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Ce===!0&&Je.beginShadows();let i=M.state.shadowsArray;if(Xe.render(i,e,t),Ce===!0&&Je.endShadows(),(r&&te.hasRenderPass())===!1){let n=k.opaque,r=k.transmissive;if(M.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];bt(n,r,e,a)}ke&&Ze.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];yt(k,e,n,n.viewport)}}else r.length>0&&bt(n,r,e,t),ke&&Ze.render(e),yt(k,e,t)}L!==null&&oe===0&&(Le.updateMultisampleRenderTarget(L),Le.updateRenderTargetMipmap(L)),r&&te.end(P),e.isScene===!0&&e.onAfterRender(P,e,t),rt.resetDefaultState(),se=-1,ce=null,ee.pop(),ee.length>0?(M=ee[ee.length-1],Le.setTextureUnits(M.state.textureUnits),Ce===!0&&Je.setGlobalState(P.clippingPlanes,M.state.camera)):M=null,N.pop(),k=N.length>0?N[N.length-1]:null,re!==null&&re.renderEnd()};function vt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)M.pushLightProbeGrid(e);else if(e.isLight)M.pushLight(e),e.castShadow&&M.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||Se.intersectsSprite(e)){r&&De.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Te);let t=Ve.update(e),i=e.material;i.visible&&k.push(e,t,i,n,De.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||Se.intersectsObject(e))){let t=Ve.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),De.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),De.copy(e.boundingSphere.center)),De.applyMatrix4(e.matrixWorld).applyMatrix4(Te)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&k.push(e,t,s,n,De.z,o)}}else i.visible&&k.push(e,t,i,n,De.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)vt(i[e],t,n,r)}function yt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;M.setupLightsView(n),Ce===!0&&Je.setGlobalState(P.clippingPlanes,n),r&&z.viewport(le.copy(r)),i.length>0&&xt(i,t,n),a.length>0&&xt(a,t,n),o.length>0&&xt(o,t,n),z.buffers.depth.setTest(!0),z.buffers.depth.setMask(!0),z.buffers.color.setMask(!0),z.setPolygonOffset(!1)}function bt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[r.id]===void 0){let e=Me.has(`EXT_color_buffer_half_float`)||Me.has(`EXT_color_buffer_float`);M.state.transmissionRenderTarget[r.id]=new Jt(1,1,{generateMipmaps:!0,type:e?g:l,minFilter:c,samples:Math.max(4,Ne.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ft.workingColorSpace})}let a=M.state.transmissionRenderTarget[r.id],o=r.viewport||le;a.setSize(o.z*P.transmissionResolutionScale,o.w*P.transmissionResolutionScale);let s=P.getRenderTarget(),u=P.getActiveCubeFace(),d=P.getActiveMipmapLevel();P.setRenderTarget(a),P.getClearColor(fe),pe=P.getClearAlpha(),pe<1&&P.setClearColor(16777215,.5),P.clear(),ke&&Ze.render(n);let f=P.toneMapping;P.toneMapping=0;let p=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),M.setupLightsView(r),Ce===!0&&Je.setGlobalState(P.clippingPlanes,r),xt(e,n,r),Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a),Me.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,St(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a))}P.setRenderTarget(s,u,d),P.setClearColor(fe,pe),p!==void 0&&(r.viewport=p),P.toneMapping=f}function xt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&St(o,t,n,s,l,c)}}function St(e,t,n,r,i,a){e.onBeforeRender(P,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(P,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,P.renderBufferDirect(n,t,r,i,e,a),i.side=2):P.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(P,t,n,r,i,a)}function Ct(e,t,n){t.isScene!==!0&&(t=Oe);let r=Fe.get(e),i=M.state.lights,a=M.state.shadowsArray,o=i.state.version,s=He.getParameters(e,i.state,a,t,n,M.state.lightProbeGridArray),c=He.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Re.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,lt),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Tt(e,s),d}else s.uniforms=He.getUniforms(e),re!==null&&e.isNodeMaterial&&re.build(e,n,s),e.onBeforeCompile(s,P),d=He.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Je.uniform),Tt(e,s),r.needsLights=Ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=M.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function wt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Zl.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Tt(e,t){let n=Fe.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Et(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];D.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(D))return n}return null}function U(e,t,n,r,i){t.isScene!==!0&&(t=Oe),Le.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=L===null?P.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:Ft.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Re.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(h=P.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=Fe.get(r),y=M.state.lights;if(Ce===!0&&(we===!0||e!==ce)){let t=e===ce&&r.id===se;Je.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Je.numPlanes||v.numIntersection!==Je.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=M.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=Ct(r,t,i),re&&r.isNodeMaterial&&re.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(z.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==se&&(se=r.id,C=!0),v.needsLights){let e=Et(M.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||ce!==e){z.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(R,`projectionMatrix`,e.projectionMatrix),T.setValue(R,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(R,Ee.setFromMatrixPosition(e.matrixWorld)),Ne.logarithmicDepthBuffer&&T.setValue(R,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(R,`isOrthographic`,e.isOrthographicCamera===!0),ce!==e&&(ce=e,C=!0,w=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&T.setValue(R,`directionalShadowMap`,y.state.directionalShadowMap,Le),y.state.spotShadowMap.length>0&&T.setValue(R,`spotShadowMap`,y.state.spotShadowMap,Le),y.state.pointShadowMap.length>0&&T.setValue(R,`pointShadowMap`,y.state.pointShadowMap,Le)),i.isSkinnedMesh){T.setOptional(R,i,`bindMatrix`),T.setOptional(R,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(R,`boneTexture`,e.boneTexture,Le))}i.isBatchedMesh&&(T.setOptional(R,i,`batchingTexture`),T.setValue(R,`batchingTexture`,i._matricesTexture,Le),T.setOptional(R,i,`batchingIdTexture`),T.setValue(R,`batchingIdTexture`,i._indirectTexture,Le),T.setOptional(R,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(R,`batchingColorTexture`,i._colorsTexture,Le));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&$e.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(R,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=vd()),C){if(T.setValue(R,`toneMappingExposure`,P.toneMappingExposure),v.needsLights&&Dt(E,w),a&&r.fog===!0&&We.refreshFogUniforms(E,a),We.refreshMaterialUniforms(E,r,ge,he,M.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Zl.upload(R,wt(v),E,Le)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Zl.upload(R,wt(v),E,Le),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(R,`center`,i.center),T.setValue(R,`modelViewMatrix`,i.modelViewMatrix),T.setValue(R,`normalMatrix`,i.normalMatrix),T.setValue(R,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];it.update(n,x),it.bind(n,x)}}return x}function Dt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return I},this.getActiveMipmapLevel=function(){return oe},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(e,t,n){let r=Fe.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),Fe.get(e.texture).__webglTexture=t,Fe.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=Fe.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){L=e,I=t,oe=n;let r=null,i=!1,a=!1;if(e){let o=Fe.get(e);if(o.__useDefaultFramebuffer!==void 0){z.bindFramebuffer(R.FRAMEBUFFER,o.__webglFramebuffer),le.copy(e.viewport),ue.copy(e.scissor),de=e.scissorTest,z.viewport(le),z.scissor(ue),z.setScissorTest(de),se=-1;return}if(o.__webglFramebuffer===void 0)Le.setupRenderTarget(e);else if(o.__hasExternalTextures)Le.rebindTextures(e,Fe.get(e.texture).__webglTexture,Fe.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&Fe.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Le.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=Fe.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Le.useMultisampledRTT(e)===!1?Fe.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,le.copy(e.viewport),ue.copy(e.scissor),de=e.scissorTest}else le.copy(ye).multiplyScalar(ge).floor(),ue.copy(be).multiplyScalar(ge).floor(),de=xe;if(n!==0&&(r=ie),z.bindFramebuffer(R.FRAMEBUFFER,r)&&z.drawBuffers(e,r),z.viewport(le),z.scissor(ue),z.setScissorTest(de),i){let r=Fe.get(e.texture);R.framebufferTexture2D(R.FRAMEBUFFER,R.COLOR_ATTACHMENT0,R.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=Fe.get(e.textures[t]);R.framebufferTextureLayer(R.FRAMEBUFFER,R.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=Fe.get(e.texture);R.framebufferTexture2D(R.FRAMEBUFFER,R.COLOR_ATTACHMENT0,R.TEXTURE_2D,t.__webglTexture,n)}se=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=Fe.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){z.bindFramebuffer(R.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&R.readBuffer(R.COLOR_ATTACHMENT0+s),!Ne.textureFormatReadable(c)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!Ne.textureTypeReadable(l)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&R.readPixels(t,n,r,i,nt.convert(c),nt.convert(l),a)}finally{let e=L===null?null:Fe.get(L).__webglFramebuffer;z.bindFramebuffer(R.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=Fe.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){z.bindFramebuffer(R.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&R.readBuffer(R.COLOR_ATTACHMENT0+s),!Ne.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!Ne.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=R.createBuffer();R.bindBuffer(R.PIXEL_PACK_BUFFER,d),R.bufferData(R.PIXEL_PACK_BUFFER,a.byteLength,R.STREAM_READ),R.readPixels(t,n,r,i,nt.convert(l),nt.convert(u),0);let f=L===null?null:Fe.get(L).__webglFramebuffer;z.bindFramebuffer(R.FRAMEBUFFER,f);let p=R.fenceSync(R.SYNC_GPU_COMMANDS_COMPLETE,0);return R.flush(),await Qe(R,p,4),R.bindBuffer(R.PIXEL_PACK_BUFFER,d),R.getBufferSubData(R.PIXEL_PACK_BUFFER,0,a),R.deleteBuffer(d),R.deleteSync(p),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Le.setTexture2D(e,0),R.copyTexSubImage2D(R.TEXTURE_2D,n,0,0,o,s,i,a),z.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=nt.convert(t.format),_=nt.convert(t.type),v;t.isData3DTexture?(Le.setTexture3D(t,0),v=R.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Le.setTexture2DArray(t,0),v=R.TEXTURE_2D_ARRAY):(Le.setTexture2D(t,0),v=R.TEXTURE_2D),z.activeTexture(R.TEXTURE0),z.pixelStorei(R.UNPACK_FLIP_Y_WEBGL,t.flipY),z.pixelStorei(R.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),z.pixelStorei(R.UNPACK_ALIGNMENT,t.unpackAlignment);let y=z.getParameter(R.UNPACK_ROW_LENGTH),b=z.getParameter(R.UNPACK_IMAGE_HEIGHT),x=z.getParameter(R.UNPACK_SKIP_PIXELS),S=z.getParameter(R.UNPACK_SKIP_ROWS),C=z.getParameter(R.UNPACK_SKIP_IMAGES);z.pixelStorei(R.UNPACK_ROW_LENGTH,h.width),z.pixelStorei(R.UNPACK_IMAGE_HEIGHT,h.height),z.pixelStorei(R.UNPACK_SKIP_PIXELS,l),z.pixelStorei(R.UNPACK_SKIP_ROWS,u),z.pixelStorei(R.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=Fe.get(e),r=Fe.get(t),h=Fe.get(n.__renderTarget),g=Fe.get(r.__renderTarget);z.bindFramebuffer(R.READ_FRAMEBUFFER,h.__webglFramebuffer),z.bindFramebuffer(R.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(R.framebufferTextureLayer(R.READ_FRAMEBUFFER,R.COLOR_ATTACHMENT0,Fe.get(e).__webglTexture,i,d+n),R.framebufferTextureLayer(R.DRAW_FRAMEBUFFER,R.COLOR_ATTACHMENT0,Fe.get(t).__webglTexture,a,m+n)),R.blitFramebuffer(l,u,o,s,f,p,o,s,R.DEPTH_BUFFER_BIT,R.NEAREST);z.bindFramebuffer(R.READ_FRAMEBUFFER,null),z.bindFramebuffer(R.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||Fe.has(e)){let n=Fe.get(e),r=Fe.get(t);z.bindFramebuffer(R.READ_FRAMEBUFFER,ae),z.bindFramebuffer(R.DRAW_FRAMEBUFFER,F);for(let e=0;e<c;e++)w?R.framebufferTextureLayer(R.READ_FRAMEBUFFER,R.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):R.framebufferTexture2D(R.READ_FRAMEBUFFER,R.COLOR_ATTACHMENT0,R.TEXTURE_2D,n.__webglTexture,i),T?R.framebufferTextureLayer(R.DRAW_FRAMEBUFFER,R.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):R.framebufferTexture2D(R.DRAW_FRAMEBUFFER,R.COLOR_ATTACHMENT0,R.TEXTURE_2D,r.__webglTexture,a),i===0?T?R.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):R.copyTexSubImage2D(v,a,f,p,l,u,o,s):R.blitFramebuffer(l,u,o,s,f,p,o,s,R.COLOR_BUFFER_BIT,R.NEAREST);z.bindFramebuffer(R.READ_FRAMEBUFFER,null),z.bindFramebuffer(R.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?R.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?R.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):R.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?R.texSubImage2D(R.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?R.compressedTexSubImage2D(R.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):R.texSubImage2D(R.TEXTURE_2D,a,f,p,o,s,g,_,h);z.pixelStorei(R.UNPACK_ROW_LENGTH,y),z.pixelStorei(R.UNPACK_IMAGE_HEIGHT,b),z.pixelStorei(R.UNPACK_SKIP_PIXELS,x),z.pixelStorei(R.UNPACK_SKIP_ROWS,S),z.pixelStorei(R.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&R.generateMipmap(v),z.unbindTexture()},this.initRenderTarget=function(e){Fe.get(e).__webglFramebuffer===void 0&&Le.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Le.setTextureCube(e,0):e.isData3DTexture?Le.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Le.setTexture2DArray(e,0):Le.setTexture2D(e,0),z.unbindTexture()},this.resetState=function(){I=0,oe=0,L=null,z.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Ue}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ft._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ft._getUnpackColorSpace()}},bd=class{constructor(e=1){this.reseed(e)}reseed(e){return this.s=e>>>0||1,this}next(){let e=this.s+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return e+(t-e)*this.next()}int(e,t){return Math.floor(this.range(e,t+1))}pick(e){return e[Math.min(e.length-1,Math.floor(this.next()*e.length))]}sign(){return this.next()<.5?-1:1}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*.5}},xd=class{constructor(){this.map=new Map}on(e,t){return this.map.has(e)||this.map.set(e,new Set),this.map.get(e).add(t),()=>this.off(e,t)}off(e,t){this.map.get(e)?.delete(t)}emit(e,t){let n=this.map.get(e);if(n)for(let e of[...n])e(t)}},Sd=class{constructor(e,t){this.factory=e,this.free=[],this.used=new Set;for(let n=0;n<t;n++)this.free.push(e(n))}acquire(){let e=this.free.pop()||null;return e&&this.used.add(e),e}release(e){this.used.delete(e)&&this.free.push(e)}releaseAll(){for(let e of this.used)this.free.push(e);this.used.clear()}},X=(e,t,n)=>e<t?t:e>n?n:e,Cd=(e,t,n)=>e+(t-e)*n,wd=(e,t,n,r)=>Cd(e,t,1-Math.exp(-n*r)),Td=e=>1-(1-e)**3,Z=Math.PI*2;Math.PI/180;var Ed=e=>(e%=Z,e>Math.PI&&(e-=Z),e<-Math.PI&&(e+=Z),e),Dd=(e,t,n)=>e+X(Ed(t-e),-n,n),Od=(e,t)=>{let n=Math.imul(e,374761393)+Math.imul(t,668265263);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296};function kd(e,t){let n=Math.floor(e),r=Math.floor(t),i=e-n,a=t-r,o=i*i*(3-2*i),s=a*a*(3-2*a),c=Od(n,r),l=Od(n+1,r),u=Od(n,r+1),d=Od(n+1,r+1);return c+(l-c)*o+(u-c)*s+(c-l-u+d)*o*s}function Ad(e,t,n=4,r=2.02,i=.5){let a=.5,o=1,s=0,c=0;for(let l=0;l<n;l++)s+=a*kd(e*o,t*o),c+=a,a*=i,o*=r;return s/c}var jd=e=>e>=1e3?(e/1e3).toFixed(1)+` km`:Math.round(e)+` m`,Md=e=>String(e).padStart(2,`0`);function Nd(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function Pd(t,{srgb:n=!0,repeat:i=null,aniso:a=4,filter:o=!0}={}){let s=new ia(t);return n&&(s.colorSpace=Ie),i&&(s.wrapS=s.wrapT=e,s.repeat.set(i[0],i[1])),s.anisotropy=a,o||(s.magFilter=r),s.generateMipmaps=!0,s}function Fd(){let n=new bd(1337),r=new Map,i=(e,t)=>(r.has(e)||r.set(e,t()),r.get(e)),a=()=>i(`sand`,()=>{let[e,t]=Nd(256,256),r=t.createImageData(256,256),i=[176,147,104],a=[203,176,131],o=[148,113,76],s=[210,198,163];for(let e=0;e<256;e++)for(let t=0;t<256;t++){let n=(e*256+t)*4,c=Ad(t/46+11,e/46-4,4),l=Ad(t/17-8,e/17+21,3),u=Ad((t*.82-e*.5)/60+31,(t*.5+e*.82)/21-14,3),d=i[0]+(a[0]-i[0])*c,f=i[1]+(a[1]-i[1])*c,p=i[2]+(a[2]-i[2])*c,m=X((.46-l)*2.4,0,1);d+=(o[0]-d)*m*.72,f+=(o[1]-f)*m*.72,p+=(o[2]-p)*m*.72;let h=X((.4-u)*3,0,1)*.34;d*=1-h*.28,f*=1-h*.26,p*=1-h*.2;let g=X((c-.7)*5,0,1);d+=(s[0]-d)*g,f+=(s[1]-f)*g,p+=(s[2]-p)*g,r.data[n]=d,r.data[n+1]=f,r.data[n+2]=p,r.data[n+3]=255}t.putImageData(r,0,0);let[c,l]=Nd(1024,1024);l.imageSmoothingEnabled=!0,l.drawImage(e,0,0,1024,1024),l.save(),l.translate(512,512),l.rotate(-.52);for(let e=0;e<1500;e++){let e=n.range(-760,760),t=n.range(-760,760),r=n.range(26,90),i=n.range(-8,8);l.strokeStyle=n.next()<.5?`rgba(228,206,166,${n.range(.05,.13)})`:`rgba(96,76,52,${n.range(.05,.12)})`,l.lineWidth=n.range(1,2.6),l.beginPath(),l.moveTo(e,t),l.quadraticCurveTo(e+r*.5,t+i,e+r,t),l.stroke()}l.restore();let u=l.getImageData(0,0,1024,1024),d=u.data;for(let e=0;e<d.length;e+=4){let t=(n.next()-.5)*22;d[e]+=t,d[e+1]+=t,d[e+2]+=t*.9}l.putImageData(u,0,0);for(let e=0;e<1500;e++){let e=n.next()*1024,t=n.next()*1024;l.fillStyle=n.next()<.6?`rgba(92,74,52,0.5)`:`rgba(160,140,106,0.55)`,l.beginPath(),l.arc(e,t,n.range(.6,2.2),0,7),l.fill()}for(let e=0;e<70;e++){let e=n.next()*1024,t=n.next()*1024;l.fillStyle=`rgba(96,92,58,0.26)`,l.beginPath(),l.arc(e,t,n.range(3,8),0,7),l.fill()}return Pd(c,{repeat:[150,150],aniso:8})}),o=()=>i(`concrete`,()=>{let[e,t]=Nd(1024,1024);t.fillStyle=`#94928a`,t.fillRect(0,0,1024,1024);for(let e=0;e<4;e++)for(let r=0;r<4;r++){let i=n.int(-9,9),a=n.int(-3,4);t.fillStyle=`rgba(${148+i+a},${146+i},${138+i-a},0.5)`,t.fillRect(r*256,e*256,256,256)}for(let e=0;e<220;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(24,130),a=t.createRadialGradient(e,r,0,e,r,i),o=n.pick([`#8b8a82`,`#a09f96`,`#868589`,`#999890`,`#8f8d80`]);a.addColorStop(0,o+`44`),a.addColorStop(1,o+`00`),t.fillStyle=a,t.fillRect(e-i,r-i,i*2,i*2)}let r=t.getImageData(0,0,1024,1024),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*18;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<14;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(60,220),a=n.next()*7;t.strokeStyle=`rgba(38,36,34,${n.range(.05,.16)})`,t.lineWidth=n.range(6,14),t.beginPath(),t.arc(e,r,i,a,a+n.range(.4,1.4)),t.stroke()}for(let e=0;e<26;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(60,200);t.strokeStyle=`rgba(168,148,110,${n.range(.05,.14)})`,t.lineWidth=n.range(4,16),t.beginPath(),t.moveTo(e,r),t.quadraticCurveTo(e+i*.5,r+n.range(-16,16),e+i,r+n.range(-10,10)),t.stroke()}for(let e=0;e<=4;e++){let n=Math.min(1022,Math.max(2,e*256));t.strokeStyle=`rgba(206,204,196,0.35)`,t.lineWidth=7,t.beginPath(),t.moveTo(n,0),t.lineTo(n,1024),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(1024,n),t.stroke(),t.strokeStyle=`rgba(38,37,35,0.7)`,t.lineWidth=3,t.beginPath(),t.moveTo(n,0),t.lineTo(n,1024),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(1024,n),t.stroke()}t.strokeStyle=`rgba(60,58,54,0.5)`,t.lineWidth=1.4;for(let e=0;e<26;e++){let e=n.next()*1024,r=n.next()*1024;t.beginPath(),t.moveTo(e,r);for(let i=0;i<14;i++)e+=n.range(-26,26),r+=n.range(-26,26),t.lineTo(e,r);t.stroke()}for(let e=0;e<14;e++){let e=n.next()*1024,r=n.next()*1024,i=n.range(10,44),a=t.createRadialGradient(e,r,0,e,r,i);a.addColorStop(0,`rgba(30,28,26,0.35)`),a.addColorStop(1,`rgba(30,28,26,0)`),t.fillStyle=a,t.beginPath(),t.arc(e,r,i,0,7),t.fill()}return Pd(e,{repeat:[10,10],aniso:8})}),s=()=>i(`asphalt`,()=>{let[e,t]=Nd(512,512);t.fillStyle=`#3c3d3f`,t.fillRect(0,0,512,512);let r=t.getImageData(0,0,512,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*24;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<500;e++)t.fillStyle=n.next()<.5?`rgba(90,90,92,0.4)`:`rgba(20,20,22,0.4)`,t.beginPath(),t.arc(n.next()*512,n.next()*512,n.range(.5,2),0,7),t.fill();let a=t.createLinearGradient(0,0,512,0);a.addColorStop(0,`rgba(150,128,92,0.5)`),a.addColorStop(.06,`rgba(150,128,92,0.12)`),a.addColorStop(.12,`rgba(150,128,92,0)`),a.addColorStop(.88,`rgba(150,128,92,0)`),a.addColorStop(.94,`rgba(150,128,92,0.12)`),a.addColorStop(1,`rgba(150,128,92,0.5)`),t.fillStyle=a,t.fillRect(0,0,512,512);let o=t.createLinearGradient(0,0,512,0);o.addColorStop(0,`rgba(0,0,0,0)`),o.addColorStop(.22,`rgba(24,24,26,0.35)`),o.addColorStop(.5,`rgba(0,0,0,0)`),o.addColorStop(.78,`rgba(24,24,26,0.35)`),o.addColorStop(1,`rgba(0,0,0,0)`),t.fillStyle=o,t.fillRect(0,0,512,512);for(let e=0;e<7;e++){let e=n.next()*512,r=n.next()*512,i=n.range(30,90),a=n.range(20,60);t.fillStyle=`rgba(20,20,23,${n.range(.18,.32)})`,t.fillRect(e,r,i,a)}return Pd(e,{repeat:[1,14],aniso:8})}),c=()=>i(`gravel`,()=>{let[e,t]=Nd(256,256);t.fillStyle=`#8d7c60`,t.fillRect(0,0,256,256);let r=t.getImageData(0,0,256,256),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*26;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<900;e++){let e=n.next()*256,r=n.next()*256,i=n.range(.8,3.4),a=n.int(-40,44);t.fillStyle=`rgba(${141+a},${124+a},${96+a},0.85)`,t.beginPath(),t.ellipse(e,r,i,i*n.range(.55,1),n.next()*3,0,7),t.fill(),t.fillStyle=`rgba(40,34,26,0.25)`,t.beginPath(),t.ellipse(e+i*.4,r+i*.45,i*.8,i*.5,n.next()*3,0,7),t.fill()}return Pd(e,{repeat:[1,1],aniso:8})}),l=()=>i(`sandTracks`,()=>{let[r,i]=Nd(128,256);i.clearRect(0,0,128,256);for(let e of[36,92]){let t=i.createLinearGradient(e-16,0,e+16,0);t.addColorStop(0,`rgba(88,70,48,0)`),t.addColorStop(.3,`rgba(88,70,48,0.42)`),t.addColorStop(.5,`rgba(72,58,40,0.5)`),t.addColorStop(.7,`rgba(88,70,48,0.42)`),t.addColorStop(1,`rgba(88,70,48,0)`),i.fillStyle=t,i.fillRect(e-16,0,32,256);for(let t=2;t<256;t+=7)i.fillStyle=`rgba(42,34,24,${n.range(.25,.5)})`,i.fillRect(e-9+n.range(-1.5,1.5),t,18,n.range(2,3.4));for(let t of[-1,1])i.fillStyle=`rgba(226,204,162,0.22)`,i.fillRect(e+t*17-2,0,4,256)}i.fillStyle=`rgba(210,188,148,0.10)`,i.fillRect(56,0,16,256);for(let e=0;e<130;e++)i.clearRect(n.next()*128,n.next()*256,3,2);let a=Pd(r,{srgb:!0});return a.wrapS=t,a.wrapT=e,a}),u=(e,t,r)=>i(`camo:`+e,()=>{let[e,i]=Nd(512,512);i.fillStyle=t,i.fillRect(0,0,512,512);for(let e of r)for(let t=0;t<26;t++){let t=n.next()*512,r=n.next()*512;i.fillStyle=e,i.beginPath();let a=n.next()*7;i.moveTo(t+Math.cos(a)*30,r+Math.sin(a)*30);for(let e=1;e<=8;e++){let o=a+e/8*Math.PI*2,s=n.range(18,66);i.quadraticCurveTo(t+Math.cos(o-.3)*s*1.25,r+Math.sin(o-.3)*s*1.25,t+Math.cos(o)*s,r+Math.sin(o)*s)}i.fill()}let a=i.getImageData(0,0,512,512),o=a.data;for(let e=0;e<o.length;e+=4){let t=(n.next()-.5)*14;o[e]+=t,o[e+1]+=t,o[e+2]+=t}i.putImageData(a,0,0);for(let e=0;e<60;e++){i.strokeStyle=`rgba(30,28,24,${n.range(.08,.3)})`,i.lineWidth=n.range(.5,1.4);let e=n.next()*512,t=n.next()*512;i.beginPath(),i.moveTo(e,t),i.lineTo(e+n.range(-40,40),t+n.range(-12,12)),i.stroke()}return Pd(e,{repeat:[1,1],aniso:4})});return{sand:a,concrete:o,asphalt:s,gravel:c,sandTracks:l,desertTan:()=>u(`tan`,`#a08a62`,[`#8f7a54cc`,`#b09a70bb`,`#79684abb`]),oliveDrab:()=>u(`olive`,`#5c6248`,[`#4d5340cc`,`#6a7052bb`,`#42472fbb`]),metalPlate:()=>i(`metalPlate`,()=>{let[e,t]=Nd(512,512);t.fillStyle=`#7d8287`,t.fillRect(0,0,512,512);let r=t.getImageData(0,0,512,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*16;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0),t.strokeStyle=`rgba(40,42,46,0.65)`,t.lineWidth=2;for(let e=1;e<4;e++)t.beginPath(),t.moveTo(e*128,0),t.lineTo(e*128,512),t.stroke(),t.beginPath(),t.moveTo(0,e*128),t.lineTo(512,e*128),t.stroke();t.fillStyle=`rgba(50,52,56,0.8)`;for(let e=16;e<512;e+=32)for(let n=16;n<512;n+=128)t.beginPath(),t.arc(e,n+6,2.2,0,7),t.fill();return Pd(e,{repeat:[1,1]})}),heatBurn:()=>i(`heatBurn`,()=>{let[e,t]=Nd(256,256),r=t.createLinearGradient(0,0,0,256);r.addColorStop(0,`#242021`),r.addColorStop(.35,`#403132`),r.addColorStop(.6,`#5e4a3a`),r.addColorStop(.78,`#6f6252`),r.addColorStop(1,`#7c7a74`),t.fillStyle=r,t.fillRect(0,0,256,256);for(let e=0;e<500;e++){let e=n.next()*256;t.fillStyle=`rgba(20,16,14,${(1-e/256)*.4*n.next()})`,t.fillRect(n.next()*256,e,n.range(2,14),n.range(1,3))}return t.fillStyle=`rgba(70,90,140,0.18)`,t.fillRect(0,90,256,46),Pd(e,{repeat:[3,1]})}),hazardStripes:()=>i(`hazard`,()=>{let[e,t]=Nd(256,64);t.fillStyle=`#c9a227`,t.fillRect(0,0,256,64),t.fillStyle=`#17181a`;for(let e=-64;e<300;e+=64)t.beginPath(),t.moveTo(e,64),t.lineTo(e+32,0),t.lineTo(e+64,0),t.lineTo(e+32,64),t.fill();for(let e=0;e<260;e++)t.fillStyle=`rgba(120,110,90,${n.range(.05,.3)})`,t.fillRect(n.next()*256,n.next()*64,n.range(1,5),n.range(1,3));return Pd(e,{repeat:[8,1]})}),chainlink:()=>i(`chainlink`,()=>{let[t,n]=Nd(128,128);n.clearRect(0,0,128,128),n.strokeStyle=`rgba(58,64,70,0.85)`,n.lineWidth=4;for(let e=-4;e<8;e++)n.beginPath(),n.moveTo(e*32,-8),n.lineTo(e*32+136,136),n.stroke(),n.beginPath(),n.moveTo(e*32+136,-8),n.lineTo(e*32,136),n.stroke();n.strokeStyle=`rgba(226,232,238,0.98)`,n.lineWidth=2.2;for(let e=-4;e<8;e++)n.beginPath(),n.moveTo(e*32,-8),n.lineTo(e*32+136,136),n.stroke(),n.beginPath(),n.moveTo(e*32+136,-8),n.lineTo(e*32,136),n.stroke();n.fillStyle=`rgba(255,255,255,0.9)`;for(let e=0;e<128;e+=16)for(let t=e/16%2*16;t<128;t+=32)n.beginPath(),n.arc(t,e,1.6,0,7),n.fill();let r=Pd(t,{repeat:[1,1],aniso:8});return r.wrapS=r.wrapT=e,r}),hescoFabric:()=>i(`hescoFabric`,()=>{let[e,t]=Nd(256,256);t.fillStyle=`#b2996c`,t.fillRect(0,0,256,256);for(let e=0;e<220;e++){let e=n.next()*256;t.strokeStyle=n.next()<.5?`rgba(84,66,44,${n.range(.05,.16)})`:`rgba(210,188,146,${n.range(.05,.14)})`,t.lineWidth=n.range(1,3),t.beginPath(),t.moveTo(e,n.range(-10,40)),t.quadraticCurveTo(e+n.range(-6,6),128,e+n.range(-10,10),266),t.stroke()}let r=t.createLinearGradient(0,0,0,256);r.addColorStop(0,`rgba(226,208,168,0.20)`),r.addColorStop(.75,`rgba(120,96,64,0.08)`),r.addColorStop(1,`rgba(84,66,46,0.4)`),t.fillStyle=r,t.fillRect(0,0,256,256);for(let e=0;e<5;e++)for(let n=0;n<5;n++){let r=n*51.2+25.6,i=e*51.2+25.6,a=t.createRadialGradient(r,i+8,4,r,i+8,30);a.addColorStop(0,`rgba(228,206,164,0.12)`),a.addColorStop(.8,`rgba(70,56,38,0.10)`),a.addColorStop(1,`rgba(70,56,38,0)`),t.fillStyle=a,t.fillRect(r-32,i-26,64,64)}for(let[e,n,r]of[[4,`rgba(52,48,40,0.55)`,1.6],[1.8,`rgba(214,220,226,0.9)`,0]]){t.strokeStyle=n,t.lineWidth=e;for(let e=0;e<=5;e++){let n=X(e*51.2,1,255)+r;t.beginPath(),t.moveTo(n,0),t.lineTo(n,256),t.stroke(),t.beginPath(),t.moveTo(0,n),t.lineTo(256,n),t.stroke()}}t.fillStyle=`rgba(230,234,238,0.8)`;for(let e=0;e<=5;e++)for(let n=6;n<256;n+=14)t.fillRect(X(e*51.2,1,253)-1,n,3,2);return Pd(e,{repeat:[1,1],aniso:4})}),woodPallet:()=>i(`woodPallet`,()=>{let[e,t]=Nd(128,128);t.fillStyle=`#9b7f57`,t.fillRect(0,0,128,128);for(let e=0;e<120;e++){let e=n.next()*128;t.strokeStyle=`rgba(${96+n.int(0,60)},${72+n.int(0,40)},${44+n.int(0,26)},${n.range(.2,.5)})`,t.lineWidth=n.range(.6,1.8),t.beginPath(),t.moveTo(0,e),t.bezierCurveTo(40,e+n.range(-3,3),90,e+n.range(-3,3),128,e+n.range(-4,4)),t.stroke()}for(let e=0;e<5;e++){let e=n.next()*128,r=n.next()*128;t.fillStyle=`rgba(70,52,32,0.6)`,t.beginPath(),t.ellipse(e,r,n.range(2,4),n.range(1.4,2.6),n.next()*3,0,7),t.fill()}return Pd(e,{repeat:[1,1]})}),label:(e,{fg:r=`#e8e4da`,bg:a=null,w:o=256,h:s=64,font:c=`bold 34px "Arial Narrow", Arial, sans-serif`,stencil:l=!0}={})=>i(`label:${e}:${r}:${a}:${o}x${s}`,()=>{let[i,u]=Nd(o,s);a&&(u.fillStyle=a,u.fillRect(0,0,o,s)),u.font=c,u.textAlign=`center`,u.textBaseline=`middle`,u.fillStyle=r,l&&(u.globalAlpha=.88),u.fillText(e,o/2,s/2+2),u.globalAlpha=1;for(let e=0;e<120;e++)u.clearRect(n.next()*o,n.next()*s,2,1.5);let d=Pd(i);return d.wrapS=d.wrapT=t,d}),roundel:()=>i(`roundel`,()=>{let[e,n]=Nd(128,128);n.strokeStyle=`#dfe3e6`,n.lineWidth=6,n.beginPath(),n.arc(64,64,48,0,7),n.stroke(),n.beginPath(),n.moveTo(64,24),n.lineTo(92,84),n.lineTo(36,84),n.closePath(),n.stroke(),n.fillStyle=`#dfe3e6`,n.font=`bold 15px Arial`,n.textAlign=`center`,n.fillText(`IRONVEIL`,64,112);let r=Pd(e);return r.wrapS=r.wrapT=t,r}),arrowDecal:()=>i(`arrowDecal`,()=>{let[e,r]=Nd(128,192);r.clearRect(0,0,128,192),r.fillStyle=`rgba(216,207,159,0.9)`,r.beginPath(),r.moveTo(52,190),r.lineTo(52,78),r.lineTo(24,78),r.lineTo(64,6),r.lineTo(104,78),r.lineTo(76,78),r.lineTo(76,190),r.closePath(),r.fill();for(let e=0;e<260;e++)r.clearRect(n.next()*128,n.next()*192,3,2.4);let i=Pd(e);return i.wrapS=i.wrapT=t,i}),mapBoard:()=>i(`mapBoard`,()=>{let[e,t]=Nd(512,384);t.fillStyle=`#cfc8b4`,t.fillRect(0,0,512,384);for(let e=0;e<700;e++)t.fillStyle=`rgba(120,110,88,${n.range(.02,.07)})`,t.fillRect(n.next()*512,n.next()*384,n.range(2,12),n.range(1,6));for(let e=0;e<26;e++){let r=n.range(-60,560),i=n.range(-60,440),a=n.range(14,46);t.strokeStyle=`rgba(150,116,74,${n.range(.35,.6)})`,t.lineWidth=1;for(let o=0;o<n.int(2,5);o++){t.beginPath();let s=a+o*n.range(7,13);for(let n=0;n<=24;n++){let a=n/24*Math.PI*2,o=s*(1+Ad(Math.cos(a)*2+e*7,Math.sin(a)*2,3)*.5),c=r+Math.cos(a)*o,l=i+Math.sin(a)*o*.8;n===0?t.moveTo(c,l):t.lineTo(c,l)}t.closePath(),t.stroke()}}t.strokeStyle=`rgba(70,86,110,0.4)`,t.lineWidth=1;for(let e=0;e<=8;e++)t.beginPath(),t.moveTo(e*64,0),t.lineTo(e*64,384),t.stroke();for(let e=0;e<=6;e++)t.beginPath(),t.moveTo(0,e*64),t.lineTo(512,e*64),t.stroke();t.strokeStyle=`rgba(40,90,150,0.85)`,t.lineWidth=2;for(let e of[34,68,108])t.beginPath(),t.arc(256,268,e,0,7),t.stroke();t.fillStyle=`rgba(40,90,150,0.95)`,t.fillRect(251,263,10,10),t.strokeStyle=`rgba(170,40,32,0.9)`,t.lineWidth=3;for(let e of[-.42,-.1,.35]){t.beginPath(),t.moveTo(256+Math.sin(e)*116,268-Math.cos(e)*116),t.lineTo(256+Math.sin(e)*34,268-Math.cos(e)*34),t.stroke();let n=256+Math.sin(e)*34,r=268-Math.cos(e)*34;t.beginPath(),t.moveTo(n,r),t.lineTo(n+Math.sin(e+.5)*12,r-Math.cos(e+.5)*12),t.lineTo(n+Math.sin(e-.5)*12,r-Math.cos(e-.5)*12),t.closePath(),t.fillStyle=`rgba(170,40,32,0.9)`,t.fill()}t.strokeStyle=`rgba(160,30,26,0.75)`,t.setLineDash([6,4]),t.lineWidth=2,t.strokeRect(64,40,150,96),t.setLineDash([]);for(let e=0;e<9;e++)t.fillStyle=n.next()<.5?`#a02020`:`#204880`,t.beginPath(),t.arc(n.range(40,470),n.range(30,350),4,0,7),t.fill();t.fillStyle=`#3a3d33`,t.fillRect(0,0,512,26),t.fillStyle=`#e5e2d4`,t.font=`bold 17px Arial`,t.textAlign=`left`,t.fillText(`IRONVEIL RANGE — SECTOR MAP · REV 6 · NOT TO SCALE`,10,18),t.fillStyle=`rgba(210,200,170,0.8)`;for(let[e,n]of[[6,30],[482,30],[6,356],[482,356]])t.fillRect(e,n,24,10);return Pd(e,{aniso:4})}),statusScreen:()=>i(`statusScreen`,()=>{let[e,r]=Nd(256,160);r.fillStyle=`#04120a`,r.fillRect(0,0,256,160),r.fillStyle=`#0a2414`,r.fillRect(0,0,256,18),r.fillStyle=`#57e389`,r.font=`bold 11px monospace`,r.textAlign=`left`,r.fillText(`IVR//SYS STATUS — GRID A7`,6,13);let i=[`PWR BUS`,`RADAR`,`UPLINK`,`COOLANT`,`BTRY A`,`BTRY B`,`BTRY C`];for(let e=0;e<i.length;e++){let t=32+e*16;r.fillStyle=`#3fae6c`,r.font=`10px monospace`,r.fillText(i[e],8,t);let a=n.range(40,110);r.fillStyle=n.next()<.8?`#2f8f56`:`#c9a227`,r.fillRect(78,t-8,a,7),r.strokeStyle=`#1d5232`,r.strokeRect(78,t-8,130,7),r.fillStyle=`#57e389`,r.fillText(n.next()<.8?`OK`:`CHK`,218,t)}for(let e=0;e<160;e+=3)r.fillStyle=`rgba(0,0,0,0.18)`,r.fillRect(0,e,256,1);let a=r.createRadialGradient(128,80,30,128,80,170);a.addColorStop(0,`rgba(0,0,0,0)`),a.addColorStop(1,`rgba(0,0,0,0.35)`),r.fillStyle=a,r.fillRect(0,0,256,160);let o=Pd(e);return o.wrapS=o.wrapT=t,o}),softPuff:()=>i(`softPuff`,()=>{let[e,t]=Nd(128,128);for(let[e,n,r]of[[64,64,52],[44,54,30],[84,58,32],[58,84,30],[78,82,26],[52,40,24]]){let i=t.createRadialGradient(e,n,0,e,n,r);i.addColorStop(0,`rgba(255,255,255,0.55)`),i.addColorStop(.7,`rgba(255,255,255,0.18)`),i.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=i,t.fillRect(0,0,128,128)}return Pd(e,{srgb:!1})}),blobShadow:()=>i(`blobShadow`,()=>{let[e,n]=Nd(128,128),r=n.createRadialGradient(64,64,8,64,64,62);r.addColorStop(0,`rgba(255,255,255,0.85)`),r.addColorStop(.55,`rgba(255,255,255,0.5)`),r.addColorStop(1,`rgba(255,255,255,0)`),n.fillStyle=r,n.fillRect(0,0,128,128);let i=Pd(e,{srgb:!1});return i.wrapS=i.wrapT=t,i}),oilStain:()=>i(`oilStain`,()=>{let[e,r]=Nd(128,128);r.clearRect(0,0,128,128);for(let[e,t,n]of[[64,64,34],[48,52,18],[82,70,16],[58,84,12]]){let i=r.createRadialGradient(e,t,2,e,t,n);i.addColorStop(0,`rgba(18,16,14,0.62)`),i.addColorStop(.7,`rgba(22,20,16,0.34)`),i.addColorStop(1,`rgba(22,20,16,0)`),r.fillStyle=i,r.fillRect(0,0,128,128)}for(let e=0;e<14;e++){let e=n.next()*7,t=n.range(26,52);r.fillStyle=`rgba(20,18,15,${n.range(.2,.42)})`,r.beginPath(),r.arc(64+Math.cos(e)*t,64+Math.sin(e)*t,n.range(1.5,4.5),0,7),r.fill()}let i=Pd(e,{srgb:!1});return i.wrapS=i.wrapT=t,i}),hardFlare:()=>i(`hardFlare`,()=>{let[e,t]=Nd(128,128),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.18,`rgba(255,244,214,0.85)`),n.addColorStop(.5,`rgba(255,190,120,0.22)`),n.addColorStop(1,`rgba(255,160,80,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.globalCompositeOperation=`lighter`,n=t.createLinearGradient(0,60,128,68),n.addColorStop(0,`rgba(255,230,180,0)`),n.addColorStop(.5,`rgba(255,240,210,0.7)`),n.addColorStop(1,`rgba(255,230,180,0)`),t.fillStyle=n,t.fillRect(0,58,128,12),t.fillRect(58,0,12,128),Pd(e,{srgb:!1})}),scorch:()=>i(`scorch`,()=>{let[e,r]=Nd(256,256),i=r.createRadialGradient(128,128,6,128,128,120);i.addColorStop(0,`rgba(14,12,10,0.9)`),i.addColorStop(.4,`rgba(22,18,14,0.7)`),i.addColorStop(.75,`rgba(30,26,20,0.28)`),i.addColorStop(1,`rgba(30,26,20,0)`),r.fillStyle=i,r.fillRect(0,0,256,256);for(let e=0;e<46;e++){let e=n.next()*7,t=n.range(60,125);r.strokeStyle=`rgba(16,14,12,${n.range(.15,.5)})`,r.lineWidth=n.range(2,8),r.beginPath(),r.moveTo(128+Math.cos(e)*30,128+Math.sin(e)*30),r.lineTo(128+Math.cos(e)*t,128+Math.sin(e)*t),r.stroke()}let a=Pd(e,{srgb:!1});return a.wrapS=a.wrapT=t,a}),scrub:()=>i(`scrub`,()=>{let[e,r]=Nd(128,128);r.strokeStyle=`rgba(96,92,52,0.9)`;for(let e=0;e<60;e++){let e=64+n.range(-8,8);r.strokeStyle=`rgba(${90+n.int(0,30)},${86+n.int(0,26)},${44+n.int(0,20)},0.9)`,r.lineWidth=n.range(1,2.4),r.beginPath(),r.moveTo(e,128);let t=n.range(-34,34);r.quadraticCurveTo(e+t*.4,78,e+t,n.range(18,62)),r.stroke()}let i=Pd(e);return i.wrapS=i.wrapT=t,i}),grassTuft:()=>i(`grassTuft`,()=>{let[e,r]=Nd(128,128);for(let e=0;e<90;e++){let e=64+n.range(-14,14);r.strokeStyle=`rgba(${168+n.int(0,40)},${146+n.int(0,34)},${86+n.int(0,26)},${n.range(.65,.95)})`,r.lineWidth=n.range(.7,1.5),r.beginPath(),r.moveTo(e,128);let t=n.range(-30,30);r.quadraticCurveTo(e+t*.3,84,e+t,n.range(26,70)),r.stroke()}for(let e=0;e<26;e++)r.fillStyle=`rgba(198,178,120,${n.range(.5,.85)})`,r.fillRect(n.range(24,104),n.range(24,62),1.6,n.range(2,4));let i=Pd(e);return i.wrapS=i.wrapT=t,i}),roadLine:()=>i(`roadLine`,()=>{let[e,t]=Nd(64,256);t.clearRect(0,0,64,256),t.fillStyle=`rgba(210,200,170,0.75)`,t.fillRect(24,20,16,100);for(let e=0;e<60;e++)t.clearRect(n.next()*64,n.next()*256,3,3);return Pd(e,{repeat:[1,6]})}),noiseTex:()=>i(`noise`,()=>{let[t,n]=Nd(256,256),r=n.createImageData(256,256);for(let e=0;e<256;e++)for(let t=0;t<256;t++){let n=(e*256+t)*4,i=Ad(t/34,e/34,4)*255;r.data[n]=r.data[n+1]=r.data[n+2]=i,r.data[n+3]=255}n.putImageData(r,0,0);let i=Pd(t,{srgb:!1,repeat:[1,1]});return i.wrapS=i.wrapT=e,i}),sandOverlay:()=>i(`sandOverlay`,()=>{let[e,n]=Nd(1024,1024),r=n.createImageData(1024,1024),i=r.data;for(let e=0;e<1024;e++)for(let t=0;t<1024;t++){let n=(e*1024+t)*4,r=(t*.86-e*.51)/210,a=(t*.51+e*.86)/74,o=Ad(r+7.7,a-3.1,3),s=Ad(t/260+19,e/260-8,4),c=X((.46-o)*2.6,0,1)*.55+X((.42-s)*2.2,0,1)*.7,l=X((s-.62)*3.2,0,1);c>=l?(i[n]=118,i[n+1]=92,i[n+2]=62,i[n+3]=Math.min(200,c*148)):(i[n]=222,i[n+1]=208,i[n+2]=172,i[n+3]=l*96);let u=(t-512)/512,d=(e-512)/512,f=Math.sqrt(u*u+d*d);i[n+3]*=X((1-f)*2.6,0,1)}n.putImageData(r,0,0);let a=Pd(e,{srgb:!0,aniso:8});return a.wrapS=a.wrapT=t,a}),interiorWall:()=>i(`interiorWall`,()=>{let[e,t]=Nd(512,512);t.fillStyle=`#4b4f45`,t.fillRect(0,0,512,512);let r=t.getImageData(0,0,512,512),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*10;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=0;e<=512;e+=128){let n=Math.min(510,Math.max(2,e)),r=t.createLinearGradient(n-14,0,n+14,0);r.addColorStop(0,`rgba(0,0,0,0)`),r.addColorStop(.42,`rgba(0,0,0,0.22)`),r.addColorStop(.5,`rgba(120,126,112,0.35)`),r.addColorStop(.58,`rgba(0,0,0,0.28)`),r.addColorStop(1,`rgba(0,0,0,0)`),t.fillStyle=r,t.fillRect(n-14,0,28,512)}for(let e of[86,296])t.fillStyle=`rgba(30,32,28,0.4)`,t.fillRect(0,e,512,5),t.fillStyle=`rgba(140,146,130,0.22)`,t.fillRect(0,e-3,512,3);t.fillStyle=`rgba(28,30,26,0.75)`;for(let e=0;e<=512;e+=128){let n=Math.min(505,Math.max(7,e));for(let e=18;e<512;e+=44)t.beginPath(),t.arc(n,e,2.4,0,7),t.fill(),t.fillStyle=`rgba(150,156,140,0.4)`,t.beginPath(),t.arc(n-.8,e-.8,1,0,7),t.fill(),t.fillStyle=`rgba(28,30,26,0.75)`}for(let e=0;e<120;e++){let e=n.next()*512,r=512-n.next()**2.2*220;t.fillStyle=`rgba(24,25,22,${n.range(.06,.22)})`,t.fillRect(e,r,n.range(4,26),n.range(1,4))}for(let e=0;e<40;e++){t.strokeStyle=`rgba(160,164,150,${n.range(.04,.12)})`,t.lineWidth=n.range(.5,1.4);let e=n.next()*512,r=n.next()*512;t.beginPath(),t.moveTo(e,r),t.lineTo(e+n.range(-30,30),r+n.range(-8,8)),t.stroke()}return Pd(e,{repeat:[1,1],aniso:4})}),paintedFloor:()=>i(`paintedFloor`,()=>{let[e,r]=Nd(512,384);r.fillStyle=`#585c56`,r.fillRect(0,0,512,384);let i=r.getImageData(0,0,512,384),a=i.data;for(let e=0;e<a.length;e+=4){let t=(n.next()-.5)*12;a[e]+=t,a[e+1]+=t,a[e+2]+=t}r.putImageData(i,0,0),r.strokeStyle=`rgba(196,186,120,0.5)`,r.lineWidth=6,r.strokeRect(22,22,468,340),r.save(),r.translate(354,372);for(let e=-3;e<4;e++)r.fillStyle=e%2?`rgba(180,150,40,0.55)`:`rgba(28,28,28,0.55)`,r.beginPath(),r.moveTo(e*16,12),r.lineTo(e*16+8,-14),r.lineTo(e*16+16,-14),r.lineTo(e*16+8,12),r.fill();r.restore();let o=(e,t,n,i,a)=>{let o=r.createLinearGradient(e,t,n,i);o.addColorStop(0,`rgba(40,42,38,0.34)`),o.addColorStop(1,`rgba(40,42,38,0.12)`),r.strokeStyle=o,r.lineWidth=a,r.lineCap=`round`,r.beginPath(),r.moveTo(e,t),r.lineTo(n,i),r.stroke()};o(354,352,200,120,44),o(354,352,380,170,40),o(210,110,120,90,34);for(let e=0;e<200;e++)r.fillStyle=`rgba(28,30,26,${n.range(.05,.18)})`,r.fillRect(n.next()*512,n.next()*384,n.range(2,9),n.range(1,3));r.fillStyle=`rgba(34,36,32,0.6)`,r.fillRect(60,60,10,280),r.strokeStyle=`rgba(150,154,142,0.3)`,r.strokeRect(60,60,10,280);let s=Pd(e,{aniso:4});return s.wrapS=s.wrapT=t,s}),rackFace:()=>i(`rackFace`,()=>{let[e,t]=Nd(256,512);t.fillStyle=`#23262a`,t.fillRect(0,0,256,512),t.fillStyle=`#31353a`,t.fillRect(0,0,14,512),t.fillRect(242,0,14,512),t.fillStyle=`rgba(150,156,164,0.5)`;for(let e=10;e<512;e+=24)t.fillRect(5,e,4,4),t.fillRect(247,e,4,4);let r=8;for(;r<490;){let e=n.pick([26,26,40,54,68]);if(r+e>500)break;if(t.fillStyle=n.pick([`#2c3034`,`#33373c`,`#2a2e26`,`#3a3e34`]),t.fillRect(16,r,224,e-5),t.strokeStyle=`rgba(0,0,0,0.55)`,t.strokeRect(16.5,r+.5,223,e-6),t.fillStyle=`rgba(255,255,255,0.06)`,t.fillRect(16,r,224,2),t.fillStyle=`#171a1d`,t.fillRect(22,r+5,7,e-15),t.fillRect(227,r+5,7,e-15),n.next()<.6){t.fillStyle=`rgba(12,13,15,0.8)`;for(let n=44;n<190;n+=9)t.fillRect(n,r+7,5,e-19)}else for(let n=0;n<4;n++)t.fillStyle=`#15181b`,t.beginPath(),t.arc(60+n*26,r+e/2-2,5,0,7),t.fill(),t.strokeStyle=`rgba(180,186,192,0.35)`,t.beginPath(),t.arc(60+n*26,r+e/2-2,5,0,7),t.stroke();t.fillStyle=`rgba(196,204,190,0.55)`,t.font=`7px monospace`,t.textAlign=`left`,t.fillText(n.pick([`SIG PROC`,`PWR DIST`,`UPLINK`,`IFF CODER`,`RX CHAIN`,`CRYPTO`,`COOLING`]),100,r+e-10),r+=e}for(let e=0;e<90;e++)t.fillStyle=`rgba(0,0,0,${n.range(.05,.2)})`,t.fillRect(n.next()*256,n.next()*512,n.range(2,8),n.range(1,3));return Pd(e,{aniso:4})}),tireMarks:()=>i(`tireMarks`,()=>{let[e,r]=Nd(128,256);r.clearRect(0,0,128,256);for(let e of[40,88]){let t=r.createLinearGradient(e-12,0,e+12,0);t.addColorStop(0,`rgba(24,23,22,0)`),t.addColorStop(.35,`rgba(24,23,22,0.34)`),t.addColorStop(.5,`rgba(20,19,18,0.42)`),t.addColorStop(.65,`rgba(24,23,22,0.34)`),t.addColorStop(1,`rgba(24,23,22,0)`),r.fillStyle=t,r.fillRect(e-12,0,24,256);for(let t=0;t<256;t+=6)r.fillStyle=`rgba(14,13,12,${n.range(.1,.3)})`,r.fillRect(e-8+n.range(-1.5,1.5),t,16,n.range(1.6,3))}for(let e=0;e<160;e++)r.clearRect(n.next()*128,n.next()*256,3,2);for(let[e,t]of[[0,40],[256,216]]){let n=r.createLinearGradient(0,e,0,t);n.addColorStop(0,`rgba(0,0,0,1)`),n.addColorStop(1,`rgba(0,0,0,0)`),r.globalCompositeOperation=`destination-out`,r.fillStyle=n,r.fillRect(0,Math.min(e,t),128,Math.abs(t-e)),r.globalCompositeOperation=`source-over`}let i=Pd(e);return i.wrapS=i.wrapT=t,i}),paintStripe:()=>i(`paintStripe`,()=>{let[r,i]=Nd(64,512);i.clearRect(0,0,64,512),i.fillStyle=`rgba(228,222,204,0.92)`,i.fillRect(14,0,36,512);for(let e=0;e<300;e++){let e=n.next()<.5?n.range(10,22):n.range(42,54);i.clearRect(e,n.next()*512,n.range(2,6),n.range(2,7))}for(let e=0;e<140;e++)i.clearRect(n.range(14,50),n.next()*512,n.range(1,4),n.range(1,5));let a=Pd(r);return a.wrapS=t,a.wrapT=e,a}),drainGrate:()=>i(`drainGrate`,()=>{let[e,r]=Nd(128,192);r.fillStyle=`#43464a`,r.fillRect(0,0,128,192),r.strokeStyle=`rgba(210,214,220,0.35)`,r.lineWidth=3,r.strokeRect(3,3,122,186),r.fillStyle=`#0c0d0f`;for(let e=14;e<180;e+=16)r.fillRect(12,e,104,9);r.fillStyle=`rgba(255,255,255,0.12)`;for(let e=12;e<178;e+=16)r.fillRect(12,e,104,2);for(let e=0;e<26;e++)r.fillStyle=`rgba(112,74,40,${n.range(.08,.2)})`,r.fillRect(n.next()*128,n.next()*192,n.range(3,9),n.range(2,5));let i=Pd(e,{aniso:4});return i.wrapS=i.wrapT=t,i}),radarArray:()=>i(`radarArray`,()=>{let[e,t]=Nd(512,384);t.fillStyle=`#4c5142`,t.fillRect(0,0,512,384);let r=t.getImageData(0,0,512,384),i=r.data;for(let e=0;e<i.length;e+=4){let t=(n.next()-.5)*10;i[e]+=t,i[e+1]+=t,i[e+2]+=t}t.putImageData(r,0,0);for(let e=26;e<360;e+=17)for(let r=30;r<484;r+=17){let i=n.int(-10,10);t.fillStyle=`rgba(${34+i},${38+i},${32+i},0.95)`,t.beginPath(),t.arc(r,e,5.4,0,7),t.fill(),t.fillStyle=`rgba(150,160,140,0.28)`,t.beginPath(),t.arc(r-1.4,e-1.4,1.6,0,7),t.fill()}t.strokeStyle=`rgba(24,26,22,0.6)`,t.lineWidth=2;for(let e=128;e<512;e+=128)t.beginPath(),t.moveTo(e,12),t.lineTo(e,372),t.stroke();return t.beginPath(),t.moveTo(12,192),t.lineTo(500,192),t.stroke(),t.save(),t.strokeStyle=`rgba(180,150,40,0.5)`,t.lineWidth=8,t.strokeRect(8,8,496,368),t.restore(),t.fillStyle=`rgba(210,206,188,0.7)`,t.font=`bold 15px Arial`,t.textAlign=`left`,t.fillText(`AN/VPS-9 · NO STEP`,20,378),Pd(e,{aniso:4})}),noticeBoard:()=>i(`noticeBoard`,()=>{let[e,r]=Nd(256,192);r.fillStyle=`#7a6242`,r.fillRect(0,0,256,192);for(let e=0;e<600;e++)r.fillStyle=`rgba(${90+n.int(0,50)},${70+n.int(0,40)},${44+n.int(0,26)},0.4)`,r.fillRect(n.next()*256,n.next()*192,2,2);r.strokeStyle=`#3a3d33`,r.lineWidth=8,r.strokeRect(4,4,248,184);for(let e=0;e<7;e++){let e=n.range(16,190),t=n.range(16,120),i=n.range(34,60),a=n.range(40,62);r.save(),r.translate(e+i/2,t+a/2),r.rotate(n.range(-.16,.16)),r.fillStyle=n.pick([`#ddd8c8`,`#d8d2be`,`#cfd6c8`,`#e2d8a8`]),r.fillRect(-i/2,-a/2,i,a),r.fillStyle=`rgba(60,60,58,0.7)`;for(let e=0;e<a-16;e+=7)r.fillRect(-i/2+5,-a/2+8+e,i*n.range(.5,.85),2);r.fillStyle=n.pick([`#a02020`,`#204880`,`#207040`]),r.beginPath(),r.arc(0,-a/2+4,3,0,7),r.fill(),r.restore()}let i=Pd(e,{aniso:4});return i.wrapS=i.wrapT=t,i})}}var Id=9.81,Ld=new W,Rd=new W;function zd(e,t,n,r=new W){return r.subVectors(t,e).divideScalar(n),r.y+=.5*Id*n,r}function Bd(e,t,n,r=new W){return r.set(e.x+t.x*n,e.y+t.y*n-.5*Id*n*n,e.z+t.z*n),r}function Vd(e,t,n,r,i=new W){let a=e.x,o=e.y,s=e.z,c=t.x,l=t.y,u=t.z,d=r;for(;d>0;){let e=Math.min(.25,d);d-=e,l-=Id*e;let t=Math.sqrt(c*c+l*l+u*u);if(t>1){let r=Math.max(0,1-n*t*e);c*=r,l*=r,u*=r}a+=c*e,o+=l*e,s+=u*e}return i.set(a,o,s),i}function Hd(e,t,n=0){let r=-.5*Id,i=t.y,a=e.y-n,o=i*i-4*r*a;if(o<0)return-1;let s=Math.sqrt(o),c=(-i+s)/(2*r),l=(-i-s)/(2*r),u=Math.max(c,l);return u>0?u:-1}function Ud(e,t,n,r,i=90,a=0){let o=a>0?e=>Vd(t,n,a,e,Ld):e=>Bd(t,n,e,Ld),s=e.distanceTo(t)/r;for(let a=0;a<4;a++){if(o(s),Ld.y<30){let e=Hd(t,n,30);e>0&&e<s&&(s=e),o(s)}let a=e.distanceTo(Ld);s=.55*s+a/r*.45,s=X(s,.02,i)}o(s);let c=Hd(t,n,5);return c>0&&s>=c-.4?null:{point:Ld.clone(),t:s}}function Wd(e,t,n,r){let i=e.length();if(i<1e-4)return e;Ld.copy(e).normalize();let a=Ld.angleTo(t);if(a<1e-5)return e;let o=n*r,s=Math.min(1,o/a);return Rd.copy(Ld).lerp(t,s).normalize().multiplyScalar(i),e.copy(Rd),e}function Gd(e,t,n,r,i=0,a=0,o=3){return{type:`box`,x:e,z:t,hx:n,hz:r,rot:i,y0:a,y1:o,cos:Math.cos(i),sin:Math.sin(i)}}function Kd(e,t,n,r=0,i=3){return{type:`cyl`,x:e,z:t,r:n,y0:r,y1:i}}function qd(e,t,n,r){let i=e.y+n;for(let n of r)if(!(i<n.y0+.05||e.y>n.y1-.05)){if(n.type===`cyl`){let r=e.x-n.x,i=e.z-n.z,a=r*r+i*i,o=n.r+t;if(a<o*o&&a>1e-8){let t=Math.sqrt(a),n=(o-t)/t;e.x+=r*n,e.z+=i*n}}else{let r=e.x-n.x,i=e.z-n.z,a=r*n.cos+i*n.sin,o=-r*n.sin+i*n.cos,s=X(a,-n.hx,n.hx),c=X(o,-n.hz,n.hz),l=a-s,u=o-c,d=l*l+u*u;if(d<t*t){let r,i;if(d>1e-8){let e=Math.sqrt(d),n=(t-e)/e;r=l*n,i=u*n}else{let e=n.hx-Math.abs(a),s=n.hz-Math.abs(o);e<s?(r=(a>0?1:-1)*(e+t),i=0):(r=0,i=(o>0?1:-1)*(s+t))}e.x+=r*n.cos-i*n.sin,e.z+=r*n.sin+i*n.cos}}}return e}var Jd=`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // pin to far plane
}
`,Yd=`
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
`,Xd={day:{sunElev:52,sunAz:35,zenith:2511516,mid:6064324,midAway:5537981,horizon:12374242,horizonAway:11519450,groundHaze:12175055,sunColor:16774109,sunSize:.99988,sunSoft:3e-4,sunBright:3.4,halo:.55,glowWrap:0,stars:0,milkyWay:0,moon:0,clouds:.55,cloudLit:16054524,cloudShade:10465992,cloudUnder:0,lightColor:16773594,sunIntensity:3,hemiSky:10336472,hemiGround:9075292,hemiIntensity:.85,fogColor:12636127,fogNear:1600,fogFar:12500,exposure:1,floodlights:!1,trailTint:16645111},sunset:{sunElev:9,sunAz:258,zenith:1844308,mid:10897528,midAway:5194864,horizon:16747325,horizonAway:6179453,groundHaze:13729871,sunColor:16761461,sunSize:.9997,sunSoft:18e-5,sunBright:1.55,halo:.5,glowWrap:1,stars:.1,milkyWay:0,moon:0,clouds:.6,cloudLit:15243896,cloudShade:7165056,cloudUnder:.55,lightColor:16751701,sunIntensity:2.3,hemiSky:6977720,hemiGround:6244932,hemiIntensity:.5,fogColor:11304808,fogNear:1100,fogFar:10500,exposure:1.05,floodlights:!0,trailTint:15905155},night:{sunElev:44,sunAz:118,zenith:264212,mid:660774,midAway:660774,horizon:1714498,horizonAway:1385016,groundHaze:922915,sunColor:3229035,sunSize:1.5,sunSoft:.001,sunBright:0,halo:0,glowWrap:0,stars:.9,milkyWay:.85,moon:1,clouds:.18,cloudLit:2568523,cloudShade:461590,cloudUnder:0,lightColor:9414872,sunIntensity:.95,hemiSky:2504271,hemiGround:1185311,hemiIntensity:.5,fogColor:989222,fogNear:750,fogFar:9e3,exposure:1.16,floodlights:!0,trailTint:5595513}},Zd=new Set([`zenith`,`mid`,`midAway`,`horizon`,`horizonAway`,`groundHaze`,`sunColor`,`lightColor`,`cloudLit`,`cloudShade`,`hemiSky`,`hemiGround`,`fogColor`,`trailTint`]);function Qd(e){let{scene:t,renderer:n}=e,r={uSunDir:{value:new W(0,1,0)},uMoonDir:{value:new W(0,1,0)},uZenith:{value:new G(Xd.day.zenith)},uMid:{value:new G(Xd.day.mid)},uMidAway:{value:new G(Xd.day.midAway)},uHorizon:{value:new G(Xd.day.horizon)},uHorizonAway:{value:new G(Xd.day.horizonAway)},uGroundHaze:{value:new G(Xd.day.groundHaze)},uSunColor:{value:new G(Xd.day.sunColor)},uSunSize:{value:Xd.day.sunSize},uSunSoft:{value:Xd.day.sunSoft},uSunBright:{value:Xd.day.sunBright},uHaloStrength:{value:Xd.day.halo},uGlowWrap:{value:0},uStars:{value:0},uMilkyWay:{value:0},uMoon:{value:0},uCloudAmount:{value:Xd.day.clouds},uCloudLit:{value:new G(Xd.day.cloudLit)},uCloudShade:{value:new G(Xd.day.cloudShade)},uCloudUnder:{value:0},uTime:{value:0}},i=new K(new Io(1,48,24),new Jo({vertexShader:Jd,fragmentShader:Yd,uniforms:r,side:1,depthWrite:!1,depthTest:!0,fog:!1}));i.scale.setScalar(2e4),i.frustumCulled=!1,i.renderOrder=-100,t.add(i);let a=new Ms(16777215,3);a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.camera.near=10,a.shadow.camera.far=900,a.shadow.camera.left=-220,a.shadow.camera.right=220,a.shadow.camera.top=220,a.shadow.camera.bottom=-220,a.shadow.bias=-4e-4,a.shadow.normalBias=.6,t.add(a),t.add(a.target);let o=new ps(10336472,9075292,.85);t.add(o),t.fog=new Pn(Xd.day.fogColor,Xd.day.fogNear,Xd.day.fogFar);let s={};{let e=new Ec(n),t=new G,r=new G,i=new G,a=new G,o=new G;for(let[n,c]of Object.entries(Xd)){let l=document.createElement(`canvas`);l.width=128,l.height=64;let u=l.getContext(`2d`);t.setHex(c.zenith),r.setHex(c.mid),i.setHex(c.horizon),a.setHex(9075292).lerp(i,.35),n===`night`&&a.setHex(790292);let d=u.createLinearGradient(0,0,0,64);d.addColorStop(0,`#`+t.getHexString()),d.addColorStop(.3,`#`+r.getHexString()),d.addColorStop(.48,`#`+i.getHexString()),d.addColorStop(.55,`#`+a.getHexString()),d.addColorStop(1,`#`+a.clone().multiplyScalar(.55).getHexString()),u.fillStyle=d,u.fillRect(0,0,128,64),o.setHex(n===`night`?10335976:c.sunColor);let f=n===`night`?122:c.sunAz,p=n===`night`?48:c.sunElev,m=f%360/360*128,h=(90-p)/180*64,g=u.createRadialGradient(m,h,1,m,h,n===`night`?7:16);g.addColorStop(0,n===`night`?`rgba(200,216,244,0.5)`:`rgba(255,244,220,0.95)`),g.addColorStop(.3,`#`+o.getHexString()+(n===`night`?`44`:`aa`)),g.addColorStop(1,`rgba(255,255,255,0)`),u.fillStyle=g,u.fillRect(0,0,128,64);let _=new ia(l);_.mapping=303,_.colorSpace=Ie,s[n]=e.fromEquirectangular(_).texture,_.dispose()}e.dispose()}let c={timeOfDay:`day`,from:{...Xd.day},to:{...Xd.day},blend:1,wind:new W(2.4,0,.8),windGustT:0},l=new W,u=new W,d=new W,f=new G,p=new G;function m(e,t,n){let r=Et.degToRad(e),i=Et.degToRad(t);return n.set(Math.cos(r)*Math.sin(i),Math.sin(r),Math.cos(r)*Math.cos(i)),n}function h(e,t,n){return f.setHex(typeof c.from[e]==`number`?c.from[e]:16777215),p.setHex(typeof c.to[e]==`number`?c.to[e]:16777215),n.copy(f).lerp(p,t),n}function g(e,t){return Cd(c.from[e],c.to[e],t)}function _(i){h(`zenith`,i,r.uZenith.value),h(`mid`,i,r.uMid.value),h(`midAway`,i,r.uMidAway.value),h(`horizon`,i,r.uHorizon.value),h(`horizonAway`,i,r.uHorizonAway.value),h(`groundHaze`,i,r.uGroundHaze.value),h(`sunColor`,i,r.uSunColor.value),h(`cloudLit`,i,r.uCloudLit.value),h(`cloudShade`,i,r.uCloudShade.value),r.uSunSize.value=g(`sunSize`,i),r.uSunSoft.value=g(`sunSoft`,i),r.uSunBright.value=g(`sunBright`,i),r.uHaloStrength.value=g(`halo`,i),r.uGlowWrap.value=g(`glowWrap`,i),r.uStars.value=g(`stars`,i),r.uMilkyWay.value=g(`milkyWay`,i),r.uMoon.value=g(`moon`,i),r.uCloudAmount.value=g(`clouds`,i),r.uCloudUnder.value=g(`cloudUnder`,i),m(g(`sunElev`,i),g(`sunAz`,i),l),r.uSunDir.value.copy(l),m(48,122,u),r.uMoonDir.value.copy(u);let s=r.uMoon.value,c=d.copy(l).lerp(u,s).normalize();a.position.copy(c).multiplyScalar(600),a.target.position.set(0,0,0),a.intensity=g(`sunIntensity`,i),h(`lightColor`,i,a.color),h(`hemiSky`,i,o.color),h(`hemiGround`,i,o.groundColor),o.intensity=g(`hemiIntensity`,i),h(`fogColor`,i,t.fog.color),t.fog.near=g(`fogNear`,i),t.fog.far=g(`fogFar`,i),n.toneMappingExposure=g(`exposure`,i),e.world.sunDir.copy(c),e.world.sunColor=r.uSunColor.value,h(`trailTint`,i,e.world.trailTint)}let v={sun:a,hemi:o,uniforms:r,get timeOfDay(){return c.timeOfDay},get preset(){return Xd[c.timeOfDay]},get floodlightsOn(){return Xd[c.timeOfDay].floodlights},setTimeOfDay(n,r=!1){if(!Xd[n])return;t.environment=s[n],t.environmentIntensity=n===`night`?.3:.55;let i={},a=c.blend;for(let e of Object.keys(Xd.day)){let t=c.from[e],n=c.to[e];i[e]=typeof t==`number`&&typeof n==`number`?Zd.has(e)?f.setHex(t).lerp(p.setHex(n),a).getHex():Cd(t,n,a):n}c.from=i,c.to={...Xd[n],timeKey:n},c.blend=+!!r,c.timeOfDay=n,_(c.blend),e.events.emit(`time-of-day`,n)},update(t){r.uTime.value+=t,c.blend<1&&(c.blend=Math.min(1,c.blend+t/2.2),_(c.blend)),c.windGustT+=t;let n=1+Math.sin(c.windGustT*.23)*.35+Math.sin(c.windGustT*.71)*.18;e.world.wind.copy(c.wind).multiplyScalar(n)}};return e.world.wind=c.wind.clone(),e.world.trailTint=new G(16777215),v.setTimeOfDay(`day`,!0),v}var $d=300;function ef(e,t){let n=tf((Math.hypot(e,t)-$d)/700);if(n<=0)return 0;let r=Ad(e*45e-5+13.7,t*45e-5+7.3,4),i=Ad(e*.0035,t*.0035,2)*2.2;return(r**1.6*130+i)*n}function tf(e){return e=X(e,0,1),e*e*(3-2*e)}function nf(e){let{scene:t,textures:n}=e,r=new bd(4242),i=e.world.colliders,a=new En;a.name=`base`,t.add(a);let o=[],s=n.concrete().clone();s.repeat.set(2.2,2.2);let c={sand:new J({map:n.sand(),roughness:.96,metalness:0}),concrete:new J({map:n.concrete(),roughness:.92}),concretePad:new J({map:s,roughness:.92}),asphalt:new J({map:n.asphalt(),roughness:.94}),tan:new J({map:n.desertTan(),roughness:.82}),olive:new J({map:n.oliveDrab(),roughness:.8}),metal:new J({map:n.metalPlate(),roughness:.55,metalness:.65}),darkMetal:new J({color:3948614,roughness:.55,metalness:.6}),steel:new J({color:9147033,roughness:.42,metalness:.85}),rubber:new J({color:1710876,roughness:.95}),cable:new J({color:1316118,roughness:.9}),glassDark:new J({color:790806,roughness:.12,metalness:.9}),hazard:new J({map:n.hazardStripes(),roughness:.85}),rock:new J({color:10127984,roughness:.98,flatShading:!0}),white:new J({color:14210508,roughness:.7}),redLight:new J({color:3342336,emissive:16722458,emissiveIntensity:2.2}),greenLight:new J({color:13066,emissive:2817877,emissiveIntensity:1.8}),amberLight:new J({color:3351040,emissive:16755234,emissiveIntensity:2})};e.baseMaterials=c;let l=(e,t,n,r,o,s,c,{rot:l=0,castShadow:p=!0,parent:m=a,collide:h=!1}={})=>{let g=new K(new q(t,n,r),e);return g.position.set(o,s,c),g.rotation.y=l,g.castShadow=p,g.receiveShadow=!0,m.add(g),h&&i.push(Gd(u(g,m),d(g,m),t/2+.12,r/2+.12,l+f(m),0,s+n/2+.4)),g},u=(e,t)=>t===a?e.position.x:e.getWorldPosition(p).x,d=(e,t)=>t===a?e.position.z:p.z,f=e=>e===a?0:e.rotation.y,p=new W,m=new W,h=new Dt,g=new cn,_=new Zt,v=(e,t,n,r,i=0,a=0,o=0,s=1,c=s,l=s)=>{let u=e.clone();return g.set(i,a,o),h.setFromEuler(g),_.compose(m.set(t,n,r),h,new W(s,c,l)),u.applyMatrix4(_),u},y=(e,t,n)=>{let r=e.attributes.uv;for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)*t,r.getY(e)*n);return e},b=(e,t,n,{shadow:r=!0,receive:i=!0,parent:o=a}={})=>{let s=new Oi(e,t,n.length),c=new W;return n.forEach((e,t)=>{g.set(e.rx??0,e.ry??0,e.rz??0),h.setFromEuler(g),c.set(e.sx??e.s??1,e.sy??e.s??1,e.sz??e.s??1),_.compose(m.set(e.x,e.y??0,e.z),h,c),s.setMatrixAt(t,_),e.c&&s.setColorAt(t,e.c)}),s.castShadow=r,s.receiveShadow=i,o.add(s),s};{let e=16e3,t=new Po(e,e,220,220);t.rotateX(-Math.PI/2);let n=t.attributes.position,r=new Float32Array(n.count*3),i=new G;for(let e=0;e<n.count;e++){let t=n.getX(e),a=n.getZ(e),o=ef(t,a);n.setY(e,o);let s=.8+Ad(t*.0012+3,a*.0012+9,3)*.4,c=X((.46-Ad(t*34e-5-a*62e-5+40,t*21e-5+a*13e-5-17,2))*2.4,0,1);s*=1-c*.16,i.setRGB(s*(1+c*.05),s*.985,s*(.94-c*.045)),r[e*3]=i.r,r[e*3+1]=i.g,r[e*3+2]=i.b}t.setAttribute(`color`,new mr(r,3)),t.computeVertexNormals();let o=c.sand.clone();o.vertexColors=!0;let s=new K(t,o);s.receiveShadow=!0,s.name=`terrain`,a.add(s)}{let e=[],t=[],n=new G(11772292),r=new G(7167046),i=new G(10127199),o=new G(12365456),s=new G(11451595),c=new G,l=new G,u=new G,d=(n,r,i,a,o,s)=>{e.push(...n,...r,...i,...n,...i,...a);for(let e=0;e<3;e++)t.push(o.r,o.g,o.b);for(let e=0;e<3;e++)t.push(s.r,s.g,s.b)},f=(e,t,a,f,p,m)=>{let h=[];for(let n=0;n<=448;n++){let r=n/448*Z,i=Math.cos(r),o=Math.sin(r),s=tf((Ad(i*1.35+f*17.3,o*1.35-f*9.1,3)-m)*2.8),c=Ad(i*7.6+f*3.1,o*7.6+f*5.7,5),l=.45+Ad(i*2.2-f*7.7,o*2.2+f*2.9,3),u=s*Math.min(.95,.14+c**1.6*.95*l)*a,d=e+(Ad(i*2.9+f,o*2.9-f,3)-.5)*2*t;h.push({x:o,z:i,h:u,r:d,sh:u*(.3+Ad(i*9.1+f,o*9.1-f*2,2)*.3),shr:.3+Ad(i*7.3+f*5,o*7.3,2)*.25,tint:Ad(i*12.7+f*31,o*12.7+f,3)})}let g=(e,t,n)=>[e.x*t,n,e.z*t];for(let e=0;e<448;e++){let t=h[e],m=h[e+1],_=Math.max(t.h,m.h);if(_<6)continue;let v=[g(t,t.r-t.h*1.45-420,0),g(t,t.r-t.h*t.shr,t.sh),g(t,t.r,t.h),g(t,t.r+t.h*1.6+500,0)],y=[g(m,m.r-m.h*1.45-420,0),g(m,m.r-m.h*m.shr,m.sh),g(m,m.r,m.h),g(m,m.r+m.h*1.6+500,0)],b=t.tint,x=m.tint,S=(e,t,l)=>(c.copy(r).lerp(i,X(t*1.5-.2,0,1)),e===0?u.copy(n).lerp(c,.35):e===1?u.copy(c).lerp(n,.12):u.copy(c).lerp(o,X((_/a-.35)*1.4,0,.7)),u.multiplyScalar(.84+l*.3),u.lerp(s,p),u);for(let t=0;t<3;t++){let n=Ad(e*.7+f*9+t*3.7,f*4-t,2),r=Ad(e*.7+.35+f*9+t*3.7,f*4-t,2);l.copy(S(t,(b+x)*.5,n));let i=S(t,(b+x)*.5,r);d(v[t],v[t+1],y[t+1],y[t],l,i)}}};f(5200,650,1050,3,.05,.3),f(7400,900,1500,11,.17,.28),f(9200,1100,2e3,23,.28,.2);let p=new kr;p.setAttribute(`position`,new _r(e,3)),p.setAttribute(`color`,new _r(t,3)),p.computeVertexNormals();let m=new K(p,new J({vertexColors:!0,roughness:1,flatShading:!0}));m.name=`mountains`,a.add(m)}{let e=new K(new la(540,40),new J({map:n.sandOverlay(),transparent:!0,roughness:.97,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1}));e.rotation.x=-Math.PI/2,e.rotation.z=.7,e.position.y=.006,e.renderOrder=1,e.receiveShadow=!0,a.add(e);let t=new K(new Po(120,96),c.concrete);t.rotation.x=-Math.PI/2,t.position.y=.02,t.receiveShadow=!0,a.add(t);for(let[e,t]of[[-46,32],[2,50],[48,30]]){let n=new K(new Po(26,26),c.concretePad);n.rotation.x=-Math.PI/2,n.position.set(e,.025,t),n.receiveShadow=!0,a.add(n);let r=new K(new Fo(10.9,11.55,48),c.hazard.clone());r.material.polygonOffset=!0,r.material.polygonOffsetFactor=-2,r.material.color.setScalar(.72),r.material.transparent=!0,r.material.opacity=.85,r.rotation.x=-Math.PI/2,r.position.set(e,.035,t),r.receiveShadow=!0,a.add(r)}let i=(e,t,n,r,i,o=0,s=.85)=>{let c=new K(new Po(t,n),new J({map:e,transparent:!0,opacity:s,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-3}));return c.rotation.x=-Math.PI/2,c.rotation.z=o,c.position.set(r,.045,i),c.renderOrder=2,a.add(c),c};i(n.label(`KEEP CLEAR`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 64px Arial`}),16,3,-20,16),i(n.label(`LAUNCH AREA A`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,-46,20,0),i(n.label(`LAUNCH AREA B`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,2,37,0),i(n.label(`LAUNCH AREA C`,{fg:`#d8cf9f`,w:512,h:96,font:`bold 58px Arial`}),14,2.6,48,18,0),i(n.roundel(),10,10,22,-8,0,.5),i(n.label(`NO SMOKING — FUEL POINT`,{fg:`#c98f7a`,w:512,h:72,font:`bold 44px Arial`}),12,1.7,-36,-2,.5,.8),i(n.label(`FOD CHECK POINT`,{fg:`#d8cf9f`,w:512,h:72,font:`bold 46px Arial`}),11,1.6,2,58.5,0,.8),i(n.label(`SLOW · 15`,{fg:`#d8cf9f`,w:256,h:96,font:`bold 58px Arial`}),5,1.9,0,72,0,.85),i(n.label(`AUTHORIZED VEHICLES ONLY`,{fg:`#d8cf9f`,w:640,h:64,font:`bold 40px Arial`}),15,1.5,24,40,-.35,.75),i(n.label(`A`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,-36,26,.4,.7),i(n.label(`B`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,0,30,0,.7),i(n.label(`C`,{fg:`#d8cf9f`,w:128,h:128,font:`bold 108px Arial`}),5.5,5.5,38,24,-.4,.7);let o=new Po(1,1);o.rotateX(-Math.PI/2);let s=new J({map:n.paintStripe(),transparent:!0,opacity:.8,color:13616275,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),l=[],u=(e,t,n,r,i=.35)=>{let a=Math.hypot(n-e,r-t);l.push({x:(e+n)/2,y:.032,z:(t+r)/2,ry:Math.atan2(n-e,r-t),sx:i,sz:a})};u(-58,-46,58,-46),u(-58,46,-6,46),u(14,46,58,46),u(-58,-46,-58,46),u(58,-46,58,46),u(0,46,0,24,.4),u(0,24,-34,28,.4),u(-34,28,-42,30,.4),u(0,24,34,26,.4),u(34,26,42,28,.4),u(0,24,2,40,.4);for(let e=0;e<6;e++)u(-30+e*9,-38,-30+e*9,-44,.3);let d=b(o,s,l,{shadow:!1});d.renderOrder=1;let f=new Po(1,1);f.rotateX(-Math.PI/2);let p=new J({map:n.tireMarks(),transparent:!0,opacity:.6,roughness:.95,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),m=[],h=(e,t,n,r=15,i=3.1)=>m.push({x:e,y:.03,z:t,ry:n,sx:i,sz:r});h(1.4,36,.06,18),h(-6,27,1.05,16),h(-20,29.5,1.45,15),h(-33.5,30.5,1.62,13),h(8,26,-1.2,15),h(22,27.5,-1.5,14),h(36,27.6,-1.62,12),h(2.4,20,-.12,16),h(-4,-20,.5,17),h(-12,-33,.25,14),h(18,-12,-.6,15),h(30,-22,-.5,13);let g=b(f,p,m,{shadow:!1});g.renderOrder=1;let _=new Po(1,1);_.rotateX(-Math.PI/2);let v=new J({map:n.oilStain(),transparent:!0,roughness:.7,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),y=[];for(let[e,t]of[[-46,30],[3,49],[47,32],[-38,24],[10,41],[41,35],[-14,-34],[-24,-37],[8,-18],[30,-20],[22,-6],[-6,8],[16,30],[-28,10]])y.push({x:e+r.range(-1.5,1.5),y:.028,z:t+r.range(-1.5,1.5),ry:r.next()*Z,s:r.range(2.2,4.6)});let x=b(_,v,y,{shadow:!1});x.renderOrder=1;let S=new Po(1.5,1);S.rotateX(-Math.PI/2);let C=new J({map:n.drainGrate(),roughness:.6,metalness:.45,polygonOffset:!0,polygonOffsetFactor:-2}),w=[];for(let e=0;e<6;e++)w.push({x:-50+e*20,y:.027,z:-8,ry:0});b(S,C,w,{shadow:!1});let T=new Po(1,1);T.rotateX(-Math.PI/2);let E=new J({color:2302756,roughness:.98,polygonOffset:!0,polygonOffsetFactor:-1}),D=[];for(let e of[-40,-12,16,44])D.push({x:e,y:.026,z:0,ry:0,sx:.18,sz:96});for(let e of[-24,12])D.push({x:0,y:.026,z:e,ry:Math.PI/2,sx:.18,sz:120});b(T,E,D,{shadow:!1});let O=new Po(1,1);O.rotateX(-Math.PI/2);let k=new J({map:n.sandTracks(),transparent:!0,opacity:.85,roughness:1,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}),A=[],j=(e,t,n,r=26,i=3.4)=>A.push({x:e,y:.012,z:t,ry:n,sx:i,sz:r});j(-9,-60,.25,30),j(-16,-86,.18,28),j(-26,-110,.4,30),j(70,-18,-.9,26),j(92,-30,-1.1,26),j(-68,74,.85,30),j(-92,90,.7,26),j(26,88,-.5,26),j(44,104,-.75,26);let M=b(O,k,A,{shadow:!1});M.renderOrder=1}{let e=(e,t,r,i,o)=>{let s=new K(new Po(i,r),c.asphalt);s.rotation.x=-Math.PI/2,s.rotation.z=o,s.position.set(e,.012,t),s.receiveShadow=!0,a.add(s);let l=new K(new Po(.7,r),new J({map:n.roadLine(),transparent:!0,roughness:.9,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2}));l.rotation.copy(s.rotation),l.position.set(e,.03,t),l.renderOrder=1,a.add(l)};e(0,96,100,8,0),e(-70,60,90,6,Math.PI/4),e(80,62,84,6,-Math.PI/5),e(-100,-20,120,6,Math.PI/2+.35)}{let e=new ua(.05,.05,2.9,6),t=[],r=(e,n,r,i)=>{let a=Math.hypot(r-e,i-n),o=Math.floor(a/4);for(let a=0;a<=o;a++)t.push([e+(r-e)*(a/o),n+(i-n)*(a/o)])};r(-165,-145,165,-145),r(165,-145,165,145),r(165,145,5,145),r(-5,145,-165,145),r(-165,145,-165,-145);let o=new Oi(e,c.darkMetal,t.length),s=new Zt;t.forEach(([e,t],n)=>{s.makeTranslation(e,1.45,t),o.setMatrixAt(n,s)}),o.castShadow=!1,a.add(o);let u=new J({map:n.chainlink(),transparent:!0,alphaTest:.3,side:2,color:13685976,roughness:.6,metalness:.55}),d=(e,t,n,r)=>{let i=new K(new Po(n,2.5),u.clone());i.material.map=i.material.map.clone(),i.material.map.repeat.set(n/1.6,1.6),i.material.map.needsUpdate=!0,i.position.set(e,1.3,t),i.rotation.y=r,a.add(i);let o=new K(new q(n,.03,.03),c.darkMetal);o.position.set(e,2.68,t),o.rotation.y=r,a.add(o)};d(0,-145,330,0),d(165,0,290,Math.PI/2),d(-165,0,290,Math.PI/2),d(85,145,160,0),d(-85,145,160,0),i.push(Gd(0,-145,165,.25,0,0,3)),i.push(Gd(165,0,.25,145,0,0,3)),i.push(Gd(-165,0,.25,145,0,0,3)),i.push(Gd(86,145,80,.25,0,0,3)),i.push(Gd(-86,145,80,.25,0,0,3));let f=new K(new Po(9,2.4),u);f.position.set(10.5,1.25,145.6),a.add(f),l(c.tan,3,2.7,2.6,-8,1.35,143,{collide:!0});let p=n.label(`RESTRICTED AREA — USE OF FORCE AUTHORIZED`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:96,font:`bold 30px Arial`});for(let e=-2;e<=2;e++){let t=new K(new Po(2.6,.5),new ai({map:p,side:2}));t.position.set(e*60+10,1.7,144.92),a.add(t)}}let x=new En;x.position.set(-32,0,-18),a.add(x);let S,C,w;{let e=3.1,t=.16,a=x.position.x,s=x.position.z;l(c.concrete,9,.14,6,0,.07,0,{parent:x}),l(c.tan,9.3,.18,6.3,0,3.19,0,{parent:x}),l(c.tan,9,e,t,0,e/2,-3,{parent:x}),l(c.tan,t,e,6,-9/2,e/2,0,{parent:x}),l(c.tan,t,e,6,9/2,e/2,0,{parent:x});let u=1.5,d=1.6,f=5.35,p=9/2-2.35;l(c.tan,f,e,t,-1.8250000000000002,e/2,3,{parent:x}),l(c.tan,p,e,t,9/2-p/2,e/2,3,{parent:x}),l(c.tan,u,.9500000000000002,t,d,2.625,3,{parent:x}),i.push(Gd(a,s-3,9/2,t,0,0,e)),i.push(Gd(a-9/2,s,t,3,0,0,e)),i.push(Gd(a+9/2,s,t,3,0,0,e)),i.push(Gd(a-9/2+f/2,s+3,f/2,t,0,0,e)),i.push(Gd(a+9/2-p/2,s+3,p/2,t,0,0,e));let m=l(c.olive,1.4,2.1,.06,2.97,1.06,3.7,{parent:x,rot:-1.25});m.castShadow=!0;{let r=9/2-t-.012,i=2.828,a=2.4,o=(e,t)=>y(new Po(e,t),e/a,t/a),s=[];s.push(v(o(9-2*t,e),0,e/2,-2.828)),s.push(v(o(6-2*t,e),-4.328,e/2,0,0,Math.PI/2)),s.push(v(o(6-2*t,e),r,e/2,0,0,-Math.PI/2));let c=1.9780000000000002;s.push(v(o(5.178000000000001,e),-1.7389999999999999,e/2,i,0,Math.PI)),s.push(v(o(c,e),r-c/2,e/2,i,0,Math.PI)),s.push(v(o(u,.9500000000000002),d,2.625,i,0,Math.PI)),s.push(v(o(9-2*t,6-2*t),0,3.035,0,Math.PI/2));let l=new K(A(s),new J({map:n.interiorWall(),roughness:.88}));l.receiveShadow=!0,x.add(l);let f=new K(new Po(9-2*t-.02,6-2*t-.02),new J({map:n.paintedFloor(),roughness:.85}));f.rotation.x=-Math.PI/2,f.position.y=.148,f.receiveShadow=!0,x.add(f)}l(c.darkMetal,3.4,.08,.95,-1.2,.86,-2.25,{parent:x,collide:!0}),l(c.darkMetal,3.2,.8,.7,-1.2,.42,-3+.72,{parent:x}),S=new K(new Po(1.9,1.05),new ai({color:660488})),S.position.set(-1.2,1.62,-2.55),S.rotation.x=-.3,x.add(S);let h=l(c.darkMetal,2.05,1.2,.1,-1.2,1.6,-2.62,{parent:x});h.rotation.x=-.3,l(c.rubber,1.1,.03,.35,-1.4,.92,-3+.78,{parent:x}),l(c.metal,.9,.04,.5,-.1,.91,-3+.78,{parent:x});let g=new K(new ua(.07,.09,.07,16),new J({color:11145489,emissive:13378065,emissiveIntensity:.9,roughness:.4}));g.position.set(-.1,.97,-2.3),x.add(g),o.push((e,t)=>{g.material.emissiveIntensity=.9+Math.sin(t*3.1)*.5});let _=new K(new ua(.85,.95,.92,24),c.darkMetal);_.position.set(2.4,.46,-.6),_.castShadow=!0,x.add(_);let T=new K(new Ro(.85,.03,8,40),new J({color:401962,emissive:2606302,emissiveIntensity:1.6}));T.position.set(2.4,.93,-.6),T.rotation.x=Math.PI/2,x.add(T),i.push(Kd(a+2.4,s-.6,1.05,0,1)),C=new Tn,C.position.set(2.4,.98,-.6),x.add(C),l(c.darkMetal,.7,2.1,1.8,-3.95,1.05,.9,{parent:x,collide:!0}),l(c.darkMetal,.7,2.1,1.2,-3.95,1.05,-1.4,{parent:x,collide:!0});{let e=-3.95+.36,t=new J({map:n.rackFace(),roughness:.7,metalness:.25}),i=new K(A([v(y(new Po(1.8,2.06),2,1),e,1.05,.9,0,Math.PI/2),v(y(new Po(1.2,2.06),1,1),e,1.05,-1.4,0,Math.PI/2)]),t);i.receiveShadow=!0,x.add(i);let a=new Po(.038,.038);a.rotateY(Math.PI/2);let s=new ai({color:16777215}),c=[],l=[],u=[[.18,1.62],[-1.92,-.88]];for(let e=0;e<26;e++){let[t,n]=u[e%2];c.push({x:-3.5840000000000005,y:.4+r.next()*1.5,z:r.range(t,n)});let i=new G(r.next()<.55?2883422:r.next()<.72?16755234:16724772);l.push([i,r.next()*6,r.range(1.6,8)])}let d=b(a,s,c,{shadow:!1,receive:!1,parent:x}),f=new G;l.forEach(([e],t)=>d.setColorAt(t,e)),o.push((e,t)=>{for(let e=0;e<l.length;e++){let[n,r,i]=l[e],a=Math.sin(t*i+r*9)>-.55;f.copy(n).multiplyScalar(a?1:.08),d.setColorAt(e,f)}d.instanceColor.needsUpdate=!0})}{let e=new K(A([v(new q(.34,.05,4.6),-3.8,2.72,-.2),v(new q(4.9,.05,.34),-1.45,2.72,-2.66),v(new q(.24,.85,.06),-1.2,2.28,-2.86),v(new q(.3,.62,.3),-3.9,2.41,.9),v(new q(.3,.62,.3),-3.9,2.41,-1.4)]),c.darkMetal);e.castShadow=!1,e.receiveShadow=!0,x.add(e);let t=new K(A([new zo(new Ca([new W(-3.85,2.12,.25),new W(-3.4,1.15,-1.3),new W(-2.6,.22,-2.3),new W(-1.7,.75,-2.5)]),16,.03,5),new zo(new Ca([new W(2.15,.12,-.9),new W(.6,.05,-1.9),new W(-.9,.4,-2.45)]),12,.025,5)]),c.cable);t.castShadow=!1,x.add(t)}{l(c.darkMetal,1.78,1.32,.035,-3.28,1.78,-2.815,{parent:x,castShadow:!1});let e=new K(new Po(1.68,1.26),new J({map:n.mapBoard(),roughness:.9}));e.position.set(-3.28,1.78,-2.794),e.receiveShadow=!0,x.add(e);let r=new K(new Po(1.15,.85),new J({map:n.noticeBoard(),roughness:.95}));r.position.set(9/2-t-.02,1.72,.7),r.rotation.y=-Math.PI/2,r.receiveShadow=!0,x.add(r);let i=new K(A([v(new ua(.075,.075,.52,10),0,0,0),v(new ua(.022,.022,.1,6),0,.3,0),v(new q(.05,.05,.16),0,.28,.06)]),new J({color:10361874,roughness:.5,metalness:.3}));i.position.set(9/2-t-.16,.62,2.2),i.castShadow=!1,x.add(i)}{l(c.darkMetal,.06,.34,.06,.68,1.09,-2.38,{parent:x,castShadow:!1});let e=l(c.darkMetal,.68,.5,.05,.68,1.38,-2.4,{parent:x,castShadow:!1});e.rotation.y=-.32,e.rotation.x=-.08;let t=new K(new Po(.6,.42),new ai({map:n.statusScreen(),toneMapped:!1}));t.position.set(.68,1.38,-2.4),t.rotation.y=-.32,t.rotation.x=-.08,t.translateZ(.032),x.add(t)}{let e=new K(A([v(new q(.5,.07,.48),0,.6,0),v(new q(.48,.56,.06),0,.95,.25,.14),v(new ua(.035,.035,.44,8),0,.36,0),v(new ua(.29,.32,.05,10),0,.1,0)]),c.rubber);e.position.set(-.95,0,-1.02),e.rotation.y=-.4,e.castShadow=!0,x.add(e),i.push(Kd(a-.95,s-1.02,.38,0,1.2));let t=new K(A([v(new ua(.042,.036,.1,8),-2.25,.95,.14),v(new q(.3,.014,.22),-2.6,.907,-.12,0,.2)]),c.white);t.position.set(0,0,-2.25),t.castShadow=!1,x.add(t),l(c.olive,.34,.05,.27,-2.62,.925,-2.5,{parent:x,rot:-.3,castShadow:!1})}let E=new ks(13623551,14,14,2);E.position.set(0,2.8000000000000003,0),x.add(E);let D=new J({color:16777215,emissive:14674175,emissiveIntensity:1.6}),O=new K(A([v(new q(.92,.055,.17),-1.6,3,-.5),v(new q(.92,.055,.17),1.6,3,.5)]),D);O.castShadow=!1,x.add(O),l(c.metal,1.1,.8,.9,9/2-1,3.6500000000000004,-1.4,{parent:x});let k=new K(new ua(.012,.02,3.4,5),c.darkMetal);k.position.set(-3.8,4.95,-2),x.add(k);let j=new K(new Io(.28,12,8),c.white);j.position.set(-2,3.4,1.8),x.add(j);let M=new K(new Po(2.4,.42),new ai({map:n.label(`BATTERY CONTROL — C2 SHELTER`,{fg:`#e5e2d4`,bg:`#3a3d33`,w:512,h:80,font:`bold 34px Arial`})}));M.position.set(.4,2.6,3.09),x.add(M),w=new W(a-1.2,0,s-3+2)}let T=new En;T.position.set(36,0,-28),a.add(T);let E;{let e=n.gravel().clone();e.repeat.set(9,9),e.needsUpdate=!0;let t=new K(new la(12,36),new J({map:e,color:10059870,roughness:1}));t.rotation.x=-Math.PI/2,t.position.y=.013,t.receiveShadow=!0,T.add(t);let r=c.concretePad.clone();r.color.setHex(8289396);let a=new K(new ua(8,8.5,.6,8),r);a.position.y=.3,a.castShadow=!0,a.receiveShadow=!0,T.add(a);let s=n.concrete().clone();s.repeat.set(1.6,1.6),s.needsUpdate=!0;let u=new K(new la(7.99,8),new J({map:s,color:9276291,roughness:.94,polygonOffset:!0,polygonOffsetFactor:-1}));u.rotation.x=-Math.PI/2,u.position.y=.602,u.receiveShadow=!0,T.add(u);let d=new K(new Fo(7.35,7.95,8),c.hazard.clone());d.material.color.setScalar(.62),d.material.transparent=!0,d.material.opacity=.8,d.material.polygonOffset=!0,d.material.polygonOffsetFactor=-2,d.rotation.x=-Math.PI/2,d.rotation.z=Math.PI/8,d.position.y=.605,d.receiveShadow=!0,T.add(d),i.push(Kd(36,-28,8.7,0,1.9));{let e=[],t=7.62,n=Math.PI,r=new ua(.028,.028,1.05,6),i=[];for(let a=0;a<18;a++){let o=a/18*Z;Math.abs((o-n+Math.PI*3)%Z-Math.PI)<.24||(i.push(o),e.push(v(r,Math.cos(o)*t,1.12,Math.sin(o)*t)))}let a=new ua(.02,.02,1,6);a.rotateX(Math.PI/2);for(let n=0;n<i.length;n++){let r=i[n],o=i[(n+1)%i.length],s=o-r;if(s<0&&(s+=Z),s>Z/18*1.5)continue;let c=Math.cos(r)*t,l=Math.sin(r)*t,u=Math.cos(o)*t,d=Math.sin(o)*t,f=Math.hypot(u-c,d-l),p=Math.atan2(u-c,d-l);for(let t of[1.6,1.18])e.push(v(a,(c+u)/2,t,(l+d)/2,0,p,0,1,1,f))}for(let t=0;t<8;t++)e.push(v(new q(.34,.03,.03),0,.9+t*.42,1.62));e.push(v(new ua(.022,.022,3.5,5),-.18,2.35,1.62)),e.push(v(new ua(.022,.022,3.5,5),.18,2.35,1.62));let o=new K(A(e),c.steel);o.castShadow=!0,T.add(o)}{let e=[];for(let t=0;t<4;t++)e.push(v(new q(.4,.05,1.7),-8.15-t*.38,.5-t*.15,0));for(let t of[-1,1])e.push(v(new q(1.9,.07,.05),-8.75,.32,t*.86,0,0,.34)),e.push(v(new q(1.9,.05,.04),-8.75,.95,t*.86,0,0,.34)),e.push(v(new q(.04,.67,.04),-8.1,.84,t*.86)),e.push(v(new q(.04,.72,.04),-9.4,.37,t*.86));let t=new K(A(e),c.darkMetal);t.castShadow=!0,T.add(t),i.push(Gd(27.1,-28,.85,1,0,0,1.4))}{let e=new K(A([v(new ua(1.75,2,.55,12),0,.87,0),v(new ua(1,1.5,2.9,12),0,2.6,0),v(new q(.55,.75,.3),1.2,1.6,.6,0,-.5),v(new q(.4,.5,.25),-1.15,1.5,-.6,0,.6)]),c.tan);e.castShadow=!0,e.receiveShadow=!0,T.add(e);let t=new K(new ua(.78,.95,.45,12),c.darkMetal);t.position.y=4.25,t.castShadow=!0,T.add(t)}E=new En,E.position.y=4.5,T.add(E);{let e=new K(A([v(new q(2.7,.55,1.7),0,.27,0),v(new q(.38,1.5,.55),-1.35,1.15,0),v(new q(.38,1.5,.55),1.35,1.15,0),v(new ua(.16,.16,3.05,8),0,1.8,0,0,0,Math.PI/2),v(new q(.85,.8,.75),-.85,1.75,.95),v(new q(.85,.8,.75),.85,1.75,.95),v(new ua(.05,.05,2.6,6),-1.7,1.55,.75,.65),v(new ua(.05,.05,2.6,6),1.7,1.55,.75,.65),v(new ua(.06,.06,1.6,6),0,.9,.65,.5)]),c.metal);e.castShadow=!0,E.add(e);let t=new En;t.position.set(0,2.15,.1),t.rotation.x=-.3,E.add(t);let r=new K(new q(6.3,4.05,.42),c.olive);r.castShadow=!0,t.add(r);let i=new K(new Po(5.85,3.65),new J({map:n.radarArray(),roughness:.82}));i.position.z=.215,t.add(i);let a=new K(A([v(new q(2.6,.07,.07),0,2.35,0),v(new q(.05,.32,.05),-.9,2.19,0),v(new q(.05,.32,.05),.9,2.19,0)]),c.darkMetal);a.castShadow=!0,t.add(a);let s=new K(new Io(.09,8,6),c.redLight.clone());s.position.set(0,2.25,.12),t.add(s),o.push((e,t)=>{E.rotation.y=t*.85%Z,s.material.emissiveIntensity=Math.sin(t*2.4)>0?2.6:.15})}{let e=new K(new ua(.05,.08,2,8),c.darkMetal);e.position.set(5,1.6,3.4),e.castShadow=!0,T.add(e);let t=new En;t.position.set(5,2.7,3.4),T.add(t);let n=[];for(let e=0;e<=8;e++){let t=e/8*.62;n.push(new U(t,t*t*.55))}let r=new K(new Mo(n,14),new J({color:12107186,roughness:.55,metalness:.4,side:2}));r.rotation.x=-.95,r.castShadow=!0,t.add(r);let i=new K(new ua(.015,.015,.5,5),c.steel);i.rotation.x=-.95,i.position.set(0,.22,.1),t.add(i),o.push((e,n)=>{t.rotation.y=Math.sin(n*.22)*1.4+.6})}{l(c.olive,2.5,1.75,1.55,4.1,1.475,-3.3,{parent:T,rot:-.25}),l(c.darkMetal,.7,.35,.1,4.6,1.9,-2.58,{parent:T,rot:-.25,castShadow:!1});let e=Math.sin(-.25)*-1,t=Math.cos(-.25)*-1,r=new K(new Po(.62,1.3),new J({map:n.label(`R-1`,{fg:`#d8d4c4`,bg:`#4b503f`,w:96,h:192,font:`bold 40px Arial`}),roughness:.85}));r.position.set(4.1+e*.79,1.3,-3.3+t*.79),r.rotation.y=Math.atan2(e,t),T.add(r)}{let e=(e,t,n=1.15,r=.6)=>{let i=new K(new Po(n,r),new ai({map:e,side:2}));i.position.set(Math.cos(t)*7.66,1.35,Math.sin(t)*7.66),i.rotation.y=Math.atan2(Math.cos(t),Math.sin(t)),T.add(i)};e(n.label(`DANGER — RF RADIATION HAZARD`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:120,font:`bold 34px Arial`}),Math.PI*.86),e(n.label(`RADAR SITE R-1 — AUTHORIZED PERSONNEL ONLY`,{fg:`#e8e4d4`,bg:`#3a3d33`,w:640,h:110,font:`bold 30px Arial`}),Math.PI*.38)}{let e=new K(new zo(new Ca([new W(28.2,.07,-27.6),new W(14,.06,-24.5),new W(-2,.06,-21.5),new W(-16,.06,-19.5),new W(-27.2,.5,-18.4)].map(e=>e.sub(new W(36,0,-28)))),42,.05,6),c.cable);e.castShadow=!1,T.add(e);let t=new K(A([v(new q(.5,.42,.35),-22,.21,3.5,0,.2),v(new q(.5,.42,.35),-52,.21,8.5,0,-.15)]),c.tan);t.castShadow=!0,T.add(t)}{let e=13.5,t=3.6,n=.35;l(c.olive,4.6,1.5,2.2,e,1.05,t,{parent:T,rot:n}),i.push(Gd(49.5,-24.4,2.5,1.3,n,0,2));let r=new ua(.42,.42,.3,14),a=[];for(let[i,o]of[[-1.5,-1.05],[1.5,-1.05],[-1.5,1.05],[1.5,1.05]])a.push(v(r,e+i*Math.cos(n)-o*Math.sin(n),.42,t+i*Math.sin(n)+o*Math.cos(n),0,n,Math.PI/2));let o=new K(A(a),c.rubber);o.castShadow=!0,T.add(o);let s=new K(new zo(new Ca([new W(11.5,.7,3),new W(8.5,.1,2.2),new W(2.2,.65,.8)]),16,.035,5),c.cable);s.castShadow=!1,T.add(s)}}let D=[];for(let[e,t]of[[-52,-40],[52,-40],[-52,44],[56,44]]){let r=new En;r.position.set(e,0,t),a.add(r);let o=new K(new ua(.14,.22,11,8),c.darkMetal);o.position.y=5.5,o.castShadow=!0,r.add(o),i.push(Kd(e,t,.45,0,11));let s=new K(new q(2.2,.16,.16),c.darkMetal);s.position.y=10.6,r.add(s);let l=new J({color:6317160,emissive:0,roughness:.5,metalness:.4}),u=new K(A([-.8,0,.8].map(e=>v(new q(.5,.34,.3),e,10.45,.15,.7))),l);u.castShadow=!0,r.add(u);let d=new Ds(14674175,0,90,.62,.5,1.4);d.position.set(0,10.4,0),d.target.position.set(e*-.35,0,t*-.35),r.add(d),a.add(d.target),d.target.position.set(e*.55,0,t*.55);let f=new Yr(new Fr({map:n.hardFlare(),color:13623551,transparent:!0,opacity:0,depthWrite:!1}));f.scale.setScalar(3.2),f.position.y=10.5,r.add(f),D.push({spot:d,glow:f,headMat:l})}let O=[];{let e=(e,t,n,r)=>{let o=new En;o.position.set(e,0,t),o.rotation.y=n,a.add(o),l(c.olive,2.3,1.35,1.3,0,.75,0,{parent:o}),i.push(Gd(e,t,1.3,.8,n,0,1.6)),l(c.darkMetal,2,.12,1.1,0,1.48,0,{parent:o,castShadow:!1});let s=new K(new ua(.07,.07,.7,8),c.darkMetal);s.position.set(.8,1.75,-.3),o.add(s);let u=new K(new Po(.8,.7),c.rubber);u.position.set(1.16,.75,0),u.rotation.y=Math.PI/2,o.add(u);let d=c.greenLight.clone(),f=new K(new Io(.045,8,6),d);if(f.position.set(-1,1.2,.66),o.add(f),l(c.tan,.4,.5,.25,-1.6,.25,.3,{parent:o}),r){let n=new W(e,1,t),i=new W(r[0],r[2]??.5,r[1]),o=n.clone().lerp(i,.5);o.y=Math.min(n.y,i.y)*.5-.1,o.y=Math.max(.08,o.y);let s=new K(new zo(new Ca([n,o,i]),20,.035,6),c.cable);a.add(s)}return O.push({position:new W(e,.8,t)}),o};e(-38,24,.4,[-46,30,1.2]),e(10,42,-.5,[2,48,1.2]),e(40,36,.9,[48,30,1.2]),e(-25,-13,1.57,[-28,-16,1]),e(30,-21,-.7,[34,-26,1.4])}{let e=[],t=[],r=[],o=(e,t,n,r,i)=>[e+r*Math.cos(n)+i*Math.sin(n),t-r*Math.sin(n)+i*Math.cos(n)],s=(n,s,u)=>{let d=new En;d.position.set(n,0,s),d.rotation.y=u,a.add(d),l(c.darkMetal,2.3,.5,7.2,0,.75,0,{parent:d}),l(c.tan,2.3,1.5,1.9,0,1.75,2.55,{parent:d});let f=new K(new Po(1.9,.62),c.glassDark);f.position.set(0,2.05,3.51),f.rotation.x=-.18,d.add(f),l(c.olive,2.4,1.55,4.6,0,1.85,-.9,{parent:d});for(let e=0;e<4;e++){let[r,i]=o(n,s,u,0,-2.9+e*1.35);t.push({x:r,y:1.9,z:i,rx:0,ry:Math.PI/2+u,rz:Math.PI/2})}for(let[t,r]of[[-1.05,2.4],[1.05,2.4],[-1.05,-.2],[1.05,-.2],[-1.05,-1.6],[1.05,-1.6],[-1.05,-2.9],[1.05,-2.9]]){let[i,a]=o(n,s,u,t,r);e.push({x:i,y:.55,z:a,ry:u,rz:Math.PI/2})}return r.push({x:n,y:.05,z:s,rx:-Math.PI/2,rz:-u}),i.push(Gd(n,s,1.4,3.8,u,0,3.2)),d};s(-16,-36,.12),s(-26,-36,-.06),s(78,10,1.2),b(new Ro(1.18,.03,6,12,Math.PI),c.olive,t,{shadow:!1}),b(new ua(.55,.55,.4,16),c.rubber,e);let u=b(new Po(3.6,8.4),new ai({map:n.softPuff(),color:0,transparent:!0,opacity:.4,depthWrite:!1}),r,{shadow:!1,receive:!1});u.renderOrder=1}{let e=[[16,-44,17],[24,-48,12],[10,-50,14]],t=[];for(let[n,s,l]of e){let e=new K(new ua(.09,.16,l,6),c.steel);e.position.set(n,l/2,s),e.castShadow=!0,a.add(e),i.push(Kd(n,s,.35,0,l));let u=new K(new Io(.1,8,6),c.redLight.clone());u.position.set(n,l+.15,s),a.add(u);let d=r.next()*6;o.push((e,t)=>{u.material.emissiveIntensity=Math.sin(t*1.8+d)>.2?2.8:.1});for(let e=0;e<3;e++){let r=e/3*Z+.4;t.push(new W(n,l*.85,s),new W(n+Math.cos(r)*l*.55,0,s+Math.sin(r)*l*.55))}let f=new K(new q(1.6,.05,.05),c.steel);f.position.set(n,l*.82,s),f.rotation.y=r.next()*3,a.add(f)}let n=new Yi(new kr().setFromPoints(t),new Li({color:3356217,transparent:!0,opacity:.7}));a.add(n)}{let e=new q(1.35,1.35,1.35),t=new J({map:n.hescoFabric(),roughness:.95}),o=[],s=(e,t,n,r,i,a=1.5)=>{let s=i-r,c=Math.max(2,Math.floor(s*n/a));for(let i=0;i<=c;i++){let a=r+s*i/c;o.push([e+Math.cos(a)*n,t+Math.sin(a)*n,a])}};s(-46,32,13.5,Math.PI*.7,Math.PI*1.65),s(2,50,13.5,Math.PI*.15,Math.PI*.95),s(48,30,13.5,Math.PI*1.3,Math.PI*2.15);let l=new Oi(e,t,o.length),u=new Zt,d=new Dt,f=new cn;o.forEach(([e,t,n],i)=>{f.set(0,-n+r.range(-.06,.06),0),d.setFromEuler(f),u.compose(new W(e,.675,t),d,new W(1,1,1)),l.setMatrixAt(i,u)}),l.castShadow=!0,l.receiveShadow=!0,a.add(l),i.push(Gd(-52,40,9,1.4,-.8,0,1.5)),i.push(Gd(9,57,9,1.4,.5,0,1.5)),i.push(Gd(55,24,9,1.4,.7,0,1.5));let p=(()=>{let e=new Wa;e.moveTo(-.4,0),e.lineTo(.4,0),e.lineTo(.16,.55),e.lineTo(.16,.9),e.lineTo(-.16,.9),e.lineTo(-.16,.55),e.closePath();let t=new ko(e,{depth:3,bevelEnabled:!1});return t.translate(0,0,-1.5),t})(),m=[];for(let e=0;e<8;e++){let t=e%2==0?-5:5,n=58+Math.floor(e/2)*16;m.push({x:t,y:0,z:n}),i.push(Gd(t,n,.45,1.55,0,0,1))}b(p,c.concrete,m);let h=new J({color:2371615,roughness:.85}),g=[];for(let[e,t]of[[-27,-12],[-26.2,-11.2],[-25.6,-12.4],[-44,25],[5,44],[44,25],[-27,-12.7]])for(let n=0;n<3;n++){let i=r.range(.7,1.1),a=r.range(.45,.7),o=r.range(.3,.42);g.push({x:e+r.range(-.6,.6),y:o/2+n*.36*(r.next()<.5),z:t+r.range(-.6,.6),ry:r.next()*1.2,sx:i,sy:o,sz:a})}b(new q(1,1,1),h,g),i.push(Kd(-26.2,-12,1.6,0,1.2));for(let[e,t,n,r]of[[-10,6,18,.35],[18,22,14,-.5]]){let i=new K(new ua(.09,.09,n,8,1,!1,0,Math.PI),c.rubber);i.rotation.z=Math.PI/2,i.rotation.y=r,i.position.set(e,.045,t),a.add(i)}let _=new J({map:n.woodPallet(),roughness:.92}),y=(()=>{let e=[];for(let t of[-.4,-.135,.135,.4])e.push(v(new q(1.2,.032,.2),0,.132,t));for(let t of[-.55,0,.55])e.push(v(new q(.09,.1,1),t,.05,0));return A(e)})(),x=[],S=(e,t,n,i=0)=>{for(let a=0;a<n;a++)x.push({x:e+r.range(-.03,.03),y:a*.152,z:t+r.range(-.03,.03),ry:i+r.range(-.09,.09)})};S(17.2,59.4,5,.3),S(18.8,60.6,3,.2),S(16.4,61.4,1,1.2),S(52.8,6.2,4,-.6),S(54.4,7.8,2,-.4),S(-19.5,-45.5,3,.15),S(-17.8,-44.4,1,.8),x.push({x:15.6,y:.62,z:60.2,rx:1.25,ry:.4}),b(y,_,x),i.push(Gd(17.5,60.3,2,1.6,.25,0,1.2)),i.push(Gd(53.6,7,1.7,1.5,-.5,0,1)),i.push(Gd(-18.8,-45,1.6,1.3,.15,0,.8));let C=[],w=()=>new G().setHSL(.1,r.range(.18,.34),r.range(.38,.56)),T=(e,t,n,i=0)=>{for(let a=0;a<n;a++){let n=r.range(.55,1);C.push({x:e+r.range(-1,1),y:n*.5,z:t+r.range(-1,1),ry:i+r.range(-.5,.5),sx:n*r.range(1,1.5),sy:n,sz:n*r.range(.8,1.2),c:w()})}};T(21.5,61.5,5,.4),T(-25.5,-7.5,4,.2),T(56.5,9,3,-.5),T(-22.5,-47,4,.1),C.push({x:21.2,y:1.32,z:61.2,ry:.7,sx:.8,sy:.7,sz:.75,c:w()}),b(new q(1,1,1),_,C),i.push(Kd(21.5,61.5,1.9,0,1.4)),i.push(Kd(-25.5,-7.5,1.7,0,1)),i.push(Kd(56.5,9,1.5,0,1)),i.push(Kd(-22.5,-47,1.7,0,1));let E=new ua(.3,.3,.9,12),D=[4869944,7225130,10127970,4016725,5527102],O=[],k=(e,t,n,i)=>{for(let a=0;a<n;a++)O.push({x:e+Math.cos(i)*a*.68+r.range(-.05,.05),y:.45,z:t+Math.sin(i)*a*.68+r.range(-.05,.05),ry:r.next()*Z,c:new G(D[r.int(0,4)])})};k(-40.5,-5.5,6,.35),k(-40.1,-4.2,5,.35),k(57.5,4.5,4,-1.1),k(-15.4,-47.4,3,.2),k(24.5,63.8,3,.9),O.push({x:-37.9,y:.3,z:-6.7,rx:Math.PI/2,rz:.9,c:new G(7225130)}),O.push({x:58.6,y:.3,z:6.4,rx:Math.PI/2,rz:-.4,c:new G(4869944)}),b(E,new J({color:16777215,roughness:.62,metalness:.35}),O),i.push(Gd(-39.2,-4.8,2.4,1.3,.35,0,1.1)),i.push(Kd(58,5.4,1.6,0,1.1)),b(A([v(new ua(.55,.55,.07,14),0,0,-.33,Math.PI/2),v(new ua(.55,.55,.07,14),0,0,.33,Math.PI/2),v(new ua(.22,.22,.6,10),0,0,0,Math.PI/2)]),_,[{x:-19.2,y:.55,z:-8.6,ry:.5},{x:-18.1,y:.55,z:-7.5,ry:1.2},{x:24.2,y:.55,z:59.4,ry:-.4},{x:53.3,y:.075,z:10.9,rx:-Math.PI/2}]),i.push(Kd(-18.6,-8,1.35,0,1.2));let j=new ca(.125,.3,3,7);j.rotateZ(Math.PI/2),j.scale(1,.58,1);let M=new J({color:11048046,roughness:1}),N=[],ee=()=>new G().setHSL(.09,r.range(.14,.26),r.range(.42,.58)),te=(e,t,n,i,a,o)=>{for(let s=0;s<o;s++){let o=n-s*.05,c=Math.max(3,Math.floor((a-i)*o/.5));for(let n=0;n<=c;n++){let l=i+(a-i)*(n+s%2*.5)/c;N.push({x:e+Math.cos(l)*o+r.range(-.03,.03),y:.08+s*.148,z:t+Math.sin(l)*o+r.range(-.03,.03),ry:-l+Math.PI/2+r.range(-.12,.12),c:ee()})}}},P=(e,t,n,i,a)=>{let o=Math.hypot(n-e,i-t),s=Math.max(2,Math.floor(o/.5)),c=(n-e)/s,l=(i-t)/s,u=Math.atan2(n-e,i-t)+Math.PI/2;for(let n=0;n<a;n++)for(let i=0;i<=s-n%2;i++)N.push({x:e+c*(i+n%2*.5)+r.range(-.03,.03),y:.08+n*.148,z:t+l*(i+n%2*.5)+r.range(-.03,.03),ry:u+r.range(-.1,.1),c:ee()})};P(-28.9,-13.4,-26.6,-13.4,4),P(-26.7,-13.5,-26.7,-15.3,4),te(-12,68,2.2,-.5,Math.PI+.5,4),te(20,-14,1.9,Math.PI*.6,Math.PI*1.7,3),P(-43.4,-7.6,-43.4,-1.8,2),b(j,M,N),i.push(Gd(-27.8,-13.4,1.3,.3,0,0,.9)),i.push(Gd(-26.7,-14.4,.3,1.1,0,0,.9)),i.push(Kd(-12,68,2.6,0,.9)),i.push(Kd(20,-14,2.3,0,.7)),i.push(Gd(-43.4,-4.7,.3,3.1,0,0,.55));{let e=new Wa;e.moveTo(-2.2,.02),e.lineTo(2.2,.02),e.lineTo(2.25,.95),e.lineTo(0,2.25),e.lineTo(-2.25,.95),e.closePath();let t=new ko(e,{depth:5.4,bevelEnabled:!1});t.translate(0,0,-2.7);let n=new K(A([v(t,-45,0,-12,0,.72),v(t,66,0,16,0,-.52)]),c.olive);n.castShadow=!0,n.receiveShadow=!0,a.add(n),i.push(Gd(-45,-12,2.4,2.9,.72,0,2.4)),i.push(Gd(66,16,2.4,2.9,-.52,0,2.4))}let ne=A([v(new ua(.055,.09,5.6,7),0,2.8,0),v(new q(1.3,.08,.08),0,5.42,0),v(new q(.34,.18,.22),-.48,5.32,.06,.55),v(new q(.34,.18,.22),.48,5.32,.06,.55)]),re=[{x:13,z:65,ry:2.6},{x:-39.5,z:-11.5,ry:.8},{x:60,z:1.5,ry:-1.9}];b(ne,c.darkMetal,re);for(let e of re)i.push(Kd(e.x,e.z,.3,0,5.6));{let e=new K(new ua(.04,.04,1.9,6),c.darkMetal);e.position.set(-41.8,.95,-8.4),e.castShadow=!0,a.add(e);let t=new K(new Po(1.7,.5),new ai({map:n.label(`FUEL POINT — NO SMOKING`,{fg:`#fff`,bg:`#8c1c13`,w:512,h:96,font:`bold 36px Arial`}),side:2}));t.position.set(-41.8,1.62,-8.4),t.rotation.y=.6,a.add(t)}}let k=[];for(let[e,t,n]of[[-62,-58,0],[72,-52,2.4]]){let r=new En;r.position.set(e,0,t),a.add(r),l(c.olive,1.8,.9,1.8,0,.5,0,{parent:r,collide:!0});let i=new En;i.position.y=1.3,r.add(i);let o=new K(new ua(.55,.55,.8,16),c.metal);o.rotation.x=Math.PI/2,i.add(o);let s=new K(new la(.5,20),new ai({color:15397631}));s.position.z=.42,i.add(s);let u=new Jo({uniforms:{uColor:{value:new G(12571903)},uOpacity:{value:.28}},vertexShader:`
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
        `,transparent:!0,blending:2,side:1,depthWrite:!1}),d=new K(new ua(.5,26,900,20,1,!0),u);d.rotation.x=-Math.PI/2,d.position.z=450,i.add(d),r.visible=!0,d.visible=!1,s.visible=!1,k.push({group:r,pivot:i,beam:d,lens:s,phase:n})}{let e=new Oi(new pa(1,0),c.rock,300),t=new Zt,i=new Dt,o=new cn,s=new G,l=0,u=0;for(;l<300&&u++<4e3;){let n=r.next()*Z,a=r.range(190,2600),c=Math.cos(n)*a,u=Math.sin(n)*a,d=r.range(.3,2.6),f=ef(c,u);o.set(r.next()*3,r.next()*3,r.next()*3),i.setFromEuler(o),t.compose(new W(c,f+d*.2,u),i,new W(d,d*r.range(.55,.9),d)),e.setMatrixAt(l,t),s.setHSL(.09,r.range(.12,.25),r.range(.38,.6)),e.setColorAt(l,s),l++}e.castShadow=!1,e.receiveShadow=!0,a.add(e);let d=new Po(1.6,1.1);d.translate(0,.5,0);let f=d.clone(),p=d.clone();p.rotateY(Math.PI/2);let m=A([f,p]),h=new Oi(m,new J({map:n.scrub(),transparent:!0,alphaTest:.35,side:2,roughness:1}),420);for(l=0,u=0;l<420&&u++<6e3;){let e=r.next()*Z,n=r.range(175,1900),a=Math.cos(e)*n,s=Math.sin(e)*n,c=r.range(.5,1.6);o.set(0,r.next()*Z,0),i.setFromEuler(o),t.compose(new W(a,ef(a,s),s),i,new W(c,c,c)),h.setMatrixAt(l,t),l++}h.castShadow=!1,a.add(h);let g=new J({map:n.grassTuft(),transparent:!0,alphaTest:.3,side:2,roughness:1}),_=new Oi(m.clone(),g,380);l=0,u=0;let v=0,y=0,b=0;for(;l<380&&u++<8e3;){if(b<=0){let e=r.next()*Z,t=r.range(180,1100);v=Math.cos(e)*t,y=Math.sin(e)*t,b=r.int(4,12)}let e=v+r.range(-14,14),n=y+r.range(-14,14);if(b--,Math.hypot(e,n)<178)continue;let a=r.range(.25,.7);o.set(0,r.next()*Z,0),i.setFromEuler(o),t.compose(new W(e,ef(e,n),n),i,new W(a,a*r.range(.7,1),a)),_.setMatrixAt(l,t),l++}_.castShadow=!1,a.add(_)}function A(e){let t=e.map(e=>e.toNonIndexed?e.toNonIndexed():e),n=0;for(let e of t)n+=e.attributes.position.count;let r=new kr;for(let e of[`position`,`normal`,`uv`]){let i=t[0].attributes[e].itemSize,a=new Float32Array(n*i),o=0;for(let n of t)a.set(n.attributes[e].array,o),o+=n.attributes[e].array.length;r.setAttribute(e,new mr(a,i))}return r}e.events.on(`time-of-day`,()=>{let t=e.weather.floodlightsOn;for(let e of D)e.spot.intensity=t?260:0,e.glow.material.opacity=t?.55:0,e.headMat.emissive.setHex(t?13623551:0),e.headMat.emissiveIntensity=t?2.4:0});let j={patriot:{position:new W(-46,0,32),heading:.9},thaad:{position:new W(2,0,50),heading:Math.PI*.72},sentinel:{position:new W(48,0,30),heading:-.6}},M=!1;return{group:a,consoleScreen:S,holoAnchor:C,consolePos:w,batteryPads:j,generators:O,radarHead:E,get searchlightsActive(){return M},setSearchlights(e){M=e;for(let t of k)t.beam.visible=e,t.lens.visible=e},update(e,t){for(let n of o)n(e,t);if(M)for(let e of k){let n=t*.35+e.phase;e.pivot.rotation.y=Math.sin(n)*1.1+Math.sin(n*.37)*.6,e.pivot.rotation.x=-.65-Math.sin(n*.7)*.3}}}}var rf=1.7,af=4.3,of=7.4,sf=42,cf=11,lf=.38;function uf(e){let{camera:t,renderer:n}=e,r={enabled:!0,locked:!1,yaw:Math.PI,pitch:0,feet:new W(2,0,14),vel:new W,bobPhase:0,bobAmp:0,trauma:0,shakeT:0,keys:new Set,moving:!1,sprinting:!1,footstepSide:0};r.feet.set(4,0,16),r.yaw=Math.PI*1;let i=n.domElement;function a(e){if(!r.locked||!r.enabled)return;let t=.0021;r.yaw-=e.movementX*t,r.pitch-=e.movementY*t,r.pitch=X(r.pitch,-1.45,1.45)}function o(e,t){if(e.repeat)return;let n=e.code;t?r.keys.add(n):r.keys.delete(n)}document.addEventListener(`mousemove`,a),window.addEventListener(`keydown`,e=>o(e,!0)),window.addEventListener(`keyup`,e=>o(e,!1)),document.addEventListener(`pointerlockchange`,()=>{r.locked=document.pointerLockElement===i,e.events.emit(`pointer-lock`,r.locked)});let s=new W,c=new W,l=new W,u=new W,d=new cn(0,0,0,`YXZ`);function f(e,t){return ef(e,t)}let p={state:r,get position(){return r.feet},get eyePosition(){return t.position},lockPointer(){r.locked||i.requestPointerLock?.()},unlockPointer(){r.locked&&document.exitPointerLock?.()},setEnabled(e){r.enabled=e,e||(r.keys.clear(),r.vel.set(0,0,0))},teleport(e,t,n,i=r.yaw,a=r.pitch){r.feet.set(e,t??f(e,n),n),r.yaw=i,r.pitch=a,r.vel.set(0,0,0),p.update(0)},addShake(e){r.trauma=X(r.trauma+e,0,1.2)},update(n){let i=e.settings.reducedMotion;if(r.enabled&&n>0){s.set(-Math.sin(r.yaw),0,-Math.cos(r.yaw)),c.set(-s.z,0,s.x),l.set(0,0,0);let t=r.keys;(t.has(`KeyW`)||t.has(`ArrowUp`))&&l.add(s),(t.has(`KeyS`)||t.has(`ArrowDown`))&&l.sub(s),(t.has(`KeyD`)||t.has(`ArrowRight`))&&l.add(c),(t.has(`KeyA`)||t.has(`ArrowLeft`))&&l.sub(c),r.sprinting=(t.has(`ShiftLeft`)||t.has(`ShiftRight`))&&l.lengthSq()>0;let i=r.sprinting?of:af;if(l.lengthSq()>0){l.normalize().multiplyScalar(sf*n),r.vel.add(l);let e=r.vel.length();e>i&&r.vel.multiplyScalar(i/e)}else{let e=r.vel.length(),t=e*cf*n;r.vel.multiplyScalar(e>.001?Math.max(0,e-t)/e:0)}r.feet.x+=r.vel.x*n,r.feet.z+=r.vel.z*n;let a=Math.hypot(r.feet.x,r.feet.z);a>1200&&(r.feet.x*=1200/a,r.feet.z*=1200/a),qd(r.feet,lf,1.8,e.world.colliders),r.feet.y=f(r.feet.x,r.feet.z)}let a=r.vel.length();r.moving=a>.4;let o=r.moving&&!i?X(a/of,0,1):0;r.bobAmp=wd(r.bobAmp,o,8,Math.max(n,1e-4));let p=r.sprinting?11.4:8.4,m=r.bobPhase;r.moving&&(r.bobPhase+=n*p);let h=Math.abs(Math.sin(r.bobPhase))*.042*r.bobAmp,g=Math.sin(r.bobPhase*.5)*.02*r.bobAmp;Math.floor(m/Math.PI)!==Math.floor(r.bobPhase/Math.PI)&&r.moving&&(r.footstepSide^=1,e.events.emit(`footstep`,{sprint:r.sprinting,side:r.footstepSide})),r.trauma=Math.max(0,r.trauma-n*.85),r.shakeT+=n*34;let _=i?.12:1,v=r.trauma*r.trauma*_;u.set((Math.sin(r.shakeT*1.1)+Math.sin(r.shakeT*2.63)*.5)*.021*v,(Math.sin(r.shakeT*1.47+2)+Math.sin(r.shakeT*3.1)*.5)*.024*v,0);let y=Math.sin(r.shakeT*1.7+4)*.0035*v;t.position.set(r.feet.x+g*Math.cos(r.yaw)+u.x,r.feet.y+rf+h+u.y,r.feet.z-g*Math.sin(r.yaw)),d.set(r.pitch,r.yaw+y,Math.sin(r.bobPhase*.5)*.0035*r.bobAmp),t.quaternion.setFromEuler(d)}};return p}function df(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new kr,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=ff(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=ff(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function ff(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new mr(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var pf={patriot:{id:`patriot`,name:`RAMPART PX-4`,kind:`Terminal-phase battery`,desc:`Fast response · agile near base`,ammo:8,launchDelay:1,reloadTime:3.5,slewRate:1.5,interceptor:{accel:300,boostTime:2.4,maxSpeed:950,turnRate:.62,killRadius:10,avgSpeed:560,trailWidth:.8,color:14210248,flame:16761454,length:5.2,girth:.21},envelope:{minAlt:120,maxAlt:2800,maxRange:4200,sweetLow:300,sweetHigh:2200}},thaad:{id:`thaad`,name:`HALBERD HA-9`,kind:`High-altitude battery`,desc:`Slow spin-up · wide window`,ammo:6,launchDelay:2.4,reloadTime:6.5,slewRate:.85,interceptor:{accel:210,boostTime:4.4,maxSpeed:1400,turnRate:.34,killRadius:14,avgSpeed:800,trailWidth:1.05,color:13620441,flame:11130111,length:6.2,girth:.28},envelope:{minAlt:1200,maxAlt:5200,maxRange:8e3,sweetLow:1800,sweetHigh:4600}},sentinel:{id:`sentinel`,name:`SENTINEL LR-1`,kind:`Long-range test battery`,desc:`Three rounds · maximum reach`,ammo:3,launchDelay:3.4,reloadTime:12,slewRate:.5,interceptor:{accel:165,boostTime:6.2,maxSpeed:1800,turnRate:.22,killRadius:20,avgSpeed:980,trailWidth:1.5,color:14934229,flame:16753229,length:9.5,girth:.42},envelope:{minAlt:1900,maxAlt:12500,maxRange:14e3,sweetLow:2400,sweetHigh:9e3}}};function mf(n){let{scene:r,textures:i,baseMaterials:a}=n,o=n.base.batteryPads,s=[],c=new Map,l=new bd(90210);function u(e,t){let n=document.createElement(`canvas`);return n.width=e,n.height=t,[n,n.getContext(`2d`)]}function d(t){let n=new ia(t);return n.colorSpace=Ie,n.wrapS=n.wrapT=e,n.anisotropy=4,n}let f=(()=>{let[e,t]=u(128,128);t.fillStyle=`#3a4034`,t.fillRect(0,0,128,128);let n=t.createRadialGradient(64,64,8,64,64,64);n.addColorStop(0,`rgba(255,255,255,0.12)`),n.addColorStop(.72,`rgba(0,0,0,0.06)`),n.addColorStop(1,`rgba(0,0,0,0.42)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.strokeStyle=`rgba(18,20,16,0.9)`,t.lineWidth=3,t.beginPath(),t.moveTo(16,16),t.lineTo(112,112),t.stroke(),t.beginPath(),t.moveTo(112,16),t.lineTo(16,112),t.stroke(),t.strokeStyle=`rgba(150,154,140,0.55)`,t.lineWidth=1.2,t.beginPath(),t.moveTo(13,19),t.lineTo(109,115),t.stroke(),t.beginPath(),t.moveTo(115,13),t.lineTo(19,109),t.stroke(),t.beginPath(),t.arc(64,64,38,0,7),t.stroke(),t.fillStyle=`#1d201b`;for(let e=0;e<16;e++){let n=e/16*Z;t.beginPath(),t.arc(64+Math.cos(n)*56,64+Math.sin(n)*56,2.6,0,7),t.fill()}for(let e=0;e<90;e++)t.fillStyle=`rgba(16,18,14,${l.range(.05,.28)})`,t.fillRect(l.next()*128,l.next()*128,l.range(1,3),l.range(1,2));return d(e)})(),p=(()=>{let[e,t]=u(128,64);t.fillStyle=`#0f1114`,t.fillRect(0,0,128,64);for(let e=5;e<60;e+=8)t.fillStyle=`#3d4248`,t.fillRect(4,e,120,3),t.fillStyle=`#181b1f`,t.fillRect(4,e+3,120,2);return t.strokeStyle=`#2c3036`,t.lineWidth=5,t.strokeRect(2,2,124,60),d(e)})(),m=(()=>{let[e,t]=u(32,256);for(let e=0;e<8;e++)t.fillStyle=e%2?`#b7b8b2`:`#9c3227`,t.fillRect(0,e*32,32,32);for(let e=0;e<120;e++)t.fillStyle=`rgba(42,36,30,${l.range(.04,.2)})`,t.fillRect(l.next()*32,l.next()*256,l.range(1,2.5),l.range(4,24));return d(e)})(),h=(()=>{let[e,t]=u(256,32);t.fillStyle=`#303338`,t.fillRect(0,0,256,32);for(let e=0;e<170;e++)t.fillStyle=l.next()<.55?`rgba(126,130,134,${l.range(.08,.45)})`:`rgba(12,13,14,${l.range(.1,.4)})`,t.fillRect(l.next()*256,l.next()*32,l.range(3,26),l.range(1,3));return d(e)})(),g=(()=>{let[e,t]=u(256,256);t.fillStyle=`#71747a`,t.fillRect(0,0,256,256);let n=t.createRadialGradient(128,120,8,128,120,155);n.addColorStop(0,`rgba(14,11,9,0.95)`),n.addColorStop(.42,`rgba(36,27,20,0.82)`),n.addColorStop(.72,`rgba(74,54,36,0.45)`),n.addColorStop(1,`rgba(92,82,72,0)`),t.fillStyle=n,t.fillRect(0,0,256,256);for(let e=0;e<80;e++){let e=l.next()*256;t.fillStyle=`rgba(16,13,11,${l.range(.1,.5)})`,t.fillRect(e,l.range(30,130),l.range(2,6),l.range(30,120))}return t.strokeStyle=`rgba(70,92,150,0.16)`,t.lineWidth=16,t.beginPath(),t.arc(128,120,118,0,7),t.stroke(),d(e)})(),_=(()=>{let[e,t]=u(256,96);t.fillStyle=`#d9d4c6`,t.fillRect(0,0,256,96),t.fillStyle=`#8e1d12`,t.fillRect(6,6,244,42),t.fillStyle=`#e6e1d3`,t.font=`bold 31px Arial`,t.textAlign=`center`,t.textBaseline=`middle`,t.fillText(`DANGER`,128,28),t.fillStyle=`#24262a`,t.font=`bold 16px Arial`,t.fillText(`HOT EXHAUST — STAND CLEAR`,128,68),t.strokeStyle=`#24262a`,t.lineWidth=4,t.strokeRect(2,2,252,92);for(let e=0;e<80;e++)t.fillStyle=`rgba(120,110,90,0.25)`,t.fillRect(l.next()*256,l.next()*96,l.range(1,4),l.range(1,2));return d(e)})(),v=(()=>{let[e,t]=u(96,96);t.fillStyle=`#8f2f24`,t.fillRect(0,0,96,96);let n=t.createRadialGradient(48,48,6,48,48,48);n.addColorStop(0,`rgba(255,220,200,0.15)`),n.addColorStop(1,`rgba(20,10,8,0.45)`),t.fillStyle=n,t.fillRect(0,0,96,96),t.strokeStyle=`rgba(46,16,10,0.9)`,t.lineWidth=5,t.beginPath(),t.moveTo(48,6),t.lineTo(48,90),t.stroke(),t.beginPath(),t.moveTo(6,48),t.lineTo(90,48),t.stroke(),t.fillStyle=`#2b2320`;for(let e=0;e<12;e++){let n=e/12*Z;t.beginPath(),t.arc(48+Math.cos(n)*40,48+Math.sin(n)*40,2.4,0,7),t.fill()}return d(e)})(),y=new J({map:i.heatBurn(),roughness:.6,metalness:.4}),b=i.oliveDrab().clone();b.repeat.set(2.6,1.3),b.needsUpdate=!0;let x=i.desertTan().clone();x.repeat.set(2.2,1.1),x.needsUpdate=!0;let S=new J({map:b,roughness:.75}),C=new J({map:x,roughness:.75}),w=new J({map:f,roughness:.9}),T=new J({map:p,roughness:.7,metalness:.3}),E=new J({map:m,roughness:.72,metalness:.15}),D=new J({map:h,roughness:.6,metalness:.55}),O=new J({map:g,roughness:.66,metalness:.35}),k=new J({map:_,roughness:.85}),A=new J({map:v,roughness:.8}),j=new J({color:9643291,roughness:.6,metalness:.2}),M=new J({color:14278374,roughness:.16,metalness:.85}),N=new J({color:12614174,roughness:.4}),ee=new J({map:i.scorch(),transparent:!0,depthWrite:!1,roughness:1,polygonOffset:!0,polygonOffsetFactor:-2}),te=new cn,P=new Dt,ne=new W,re=new W,ie=new Zt;function ae(e,{receive:t=!1}={}){let n=new Map;return{add(e,t,r=0,i=0,a=0,o=0,s=0,c=0){te.set(o,s,c),P.setFromEuler(te),ie.compose(ne.set(r,i,a),P,re.set(1,1,1)),t.applyMatrix4(ie);let l=n.get(e);return l||(l=[],n.set(e,l)),l.push(t),t},flush({shadow:r=!0}={}){for(let[i,a]of n){let n=new K(df(a,!1),i);for(let e of a)e.dispose();n.castShadow=r,n.receiveShadow=t,e.add(n)}n.clear()}}}let F=(e,t,n)=>new q(e,t,n),I=(e,t,n,r=10,i=!1)=>new ua(e,t,n,r,1,i),oe=(e,t,n,r=10)=>new ua(e,t,n,r).rotateX(Math.PI/2),L=(e,t,n=Z,r=12)=>new Ro(e,t,6,r,n),se=(e,t)=>new Po(e,t),ce=(e,t=10,n=7)=>new Io(e,t,n);function le(e,t,n){let r=e.attributes.uv;for(let e=0;e<r.count;e++)r.setXY(e,r.getX(e)+t,r.getY(e)+n);return e}function ue(){return new K(new Io(.09,10,8),new J({color:1127185,emissive:2293572,emissiveIntensity:2.2}))}function de(){return new K(new ua(.055,.08,.16,10),new J({color:3810822,emissive:16755234,emissiveIntensity:0,roughness:.45}))}function fe(e,t,n,r=.07,i=.05){let o=new En;e.add(o);let s=new K(new ua(r,r,1,8),a.steel),c=new K(new ua(i,i,1,8),a.darkMetal);o.add(s),o.add(c);let l=new W,u=new W,d=new W,f=new W,p=new Dt,m=new W(0,1,0);function h(){l.copy(t.pos),t.node?.localToWorld?.(l),u.copy(n.pos),n.node?.localToWorld?.(u),e.worldToLocal(l),e.worldToLocal(u),f.subVectors(u,l);let r=f.length();p.setFromUnitVectors(m,f.clone().normalize()),d.addVectors(l,u).multiplyScalar(.5),s.position.copy(l).addScaledVector(f,.28),s.quaternion.copy(p),s.scale.set(1,r*.5,1),c.position.copy(d).addScaledVector(f,.12),c.quaternion.copy(p),c.scale.set(1,r*.62,1)}return h(),h}function pe(e,t,n=.55,r=.42){for(let[i,o]of t)e.add(a.rubber,I(n,n,r,16),i,n,o,0,0,Math.PI/2),e.add(a.darkMetal,I(n*.46,n*.46,r+.05,10),i,n,o,0,0,Math.PI/2),e.add(a.steel,I(n*.16,n*.16,r+.1,8),i,n,o,0,0,Math.PI/2)}function me(e,t,n,r,a,o,s,c=0,l={}){let u=new K(new Po(n,r),new J({map:i.label(t,{fg:l.fg??`#dcd8ca`,bg:l.bg??null,w:256,h:64,font:l.font??`bold 30px Arial`}),transparent:!0,roughness:.9}));return u.position.set(a,o,s),u.rotation.y=c,l.rx&&(u.rotation.x=l.rx),e.add(u),u}function he(e,n,r={}){let i=new bd(4177),a=n.length,[o,s]=u(256,64*a);s.clearRect(0,0,256,64*a),n.forEach((e,t)=>{let n=t*64;r.bg&&(s.fillStyle=r.bg,s.fillRect(0,n,256,64)),s.font=r.font??`bold 30px Arial`,s.textAlign=`center`,s.textBaseline=`middle`,s.fillStyle=r.fg??`#dcd8ca`,s.fillText(e.text,128,n+32+2);for(let e=0;e<90;e++)s.clearRect(i.next()*256,n+i.next()*64,2,1.5)});let c=d(o);c.wrapS=c.wrapT=t;let l=new K(df(n.map((e,t)=>{let n=new Po(e.w,e.h),r=n.attributes.uv;for(let e=0;e<r.count;e++)r.setY(e,(a-1-t+r.getY(e))/a);return e.ry&&n.rotateY(e.ry),n.translate(e.x,e.y,e.z),n}),!1),new J({map:c,transparent:!0,roughness:.9}));return e.add(l),l}function ge(e,t,n=.03){let r=new Ca(t.map(e=>new W(...e)));e.add(a.cable,new zo(r,16,n,6))}function _e(e,t,n,r=.5,i=.035){ge(e,[t,[(t[0]+n[0])/2,Math.min(t[1],n[1])-r,(t[2]+n[2])/2],n],i)}function ve(e,t,n){let r=Math.cos(e.heading),i=Math.sin(e.heading);return{x:e.position.x+t*r+n*i,z:e.position.z-t*i+n*r}}function ye(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t);let o=ae(t,{receive:!0}),s=ae(t);for(let e of[-.88,.88])o.add(a.darkMetal,F(.16,.34,8.9),e,.92,0);for(let e of[-4.2,-2.8,-1.4,0,1.4,2.8,4.2])o.add(a.darkMetal,F(1.9,.18,.14),0,.9,e);o.add(a.metal,le(F(2.6,.09,8.8),.13,.4),0,1.14,0);for(let e of[-1.31,1.31])o.add(C,le(F(.07,.24,8.8),e,.2),e,1.05,0);for(let[e,t]of[[-1.2,4.3],[1.2,4.3],[-1.2,-4.3],[1.2,-4.3]])o.add(a.darkMetal,F(.06,.16,.12),e,1.26,t),o.add(a.darkMetal,L(.055,.018,Z,10),e,1.36,t,0,Math.PI/2,0);for(let e of[-.9,-2.1])o.add(a.darkMetal,I(.075,.075,2.4,8),0,.55,e,0,0,Math.PI/2);pe(o,[[-1.38,-.9],[1.38,-.9],[-1.38,-2.1],[1.38,-2.1]],.55,.45);for(let e of[-1,1])o.add(C,le(F(.52,.06,2.9),.4*e,.7),e*1.38,1.26,-1.5),o.add(C,F(.52,.06,.5),e*1.38,1.12,.15,-.75,0,0),o.add(C,F(.52,.06,.5),e*1.38,1.12,-3.15,.75,0,0),o.add(a.rubber,F(.46,.4,.03),e*1.38,.58,-3.38);for(let[e,t]of[[-1.5,2.9],[1.5,2.9],[-1.5,-3.7],[1.5,-3.7]]){let n=Math.sign(e);o.add(a.darkMetal,F(.26,.22,.62),n*1.06,.9,t),o.add(a.steel,F(.15,.15,.95),n*1.55,.88,t),o.add(a.darkMetal,I(.1,.1,.5,10),n*1.95,.62,t),o.add(a.steel,I(.045,.045,.55,8),n*1.95,.28,t),o.add(a.darkMetal,F(.78,.06,.16),n*1.95,.07,t,0,Math.PI/4,0),o.add(a.darkMetal,F(.78,.06,.16),n*1.95,.07,t,0,-Math.PI/4,0),o.add(a.darkMetal,F(.4,.05,.4),n*1.95,.03,t),o.add(a.steel,I(.02,.02,.34,6),n*1.95,.9,t+.2,Math.PI/2,0,0),o.add(a.steel,ce(.035,8,6),n*1.95,.9,t+.38)}for(let e of[-1,1])o.add(a.darkMetal,F(.13,.13,2.35),e*.36,.79,5.35,.06,-e*.335,0);o.add(a.steel,L(.13,.045,Z,12),0,.7,6.42,Math.PI/2,0,0),o.add(a.steel,I(.05,.05,.55,8),0,.42,6.1),o.add(a.darkMetal,I(.12,.14,.05,10),0,.14,6.1);for(let e of[-1,1])o.add(a.steel,I(.024,.024,1.05,8),e*.5,1.32,4.6),o.add(a.darkMetal,F(.22,.32,.03),e*.5,1.9,4.63),s.add(a.glassDark,se(.17,.27),e*.5,1.9,4.655);o.add(C,le(F(.85,.62,1.45),.31,.5),-.82,1.5,3.5),o.add(C,le(F(.85,.55,1.05),.62,.15),-.82,1.46,2.15);for(let e of[3.5,2.15])o.add(a.darkMetal,F(.06,.2,.05),-.38,1.45,e),o.add(a.darkMetal,F(.87,.05,.06),-.82,1.76,e+.52);for(let e of[.62,1.02])o.add(a.darkMetal,I(.4,.4,.05,14),e,1.62,4,0,0,Math.PI/2);o.add(a.cable,I(.26,.26,.36,12),.82,1.62,4,0,0,Math.PI/2);for(let e of[.62,1.02])o.add(a.darkMetal,F(.06,.5,.3),e,1.35,4);o.add(a.steel,I(.02,.02,.22,6),1.1,1.62,4.14,Math.PI/2,0,0),o.add(a.rubber,I(.55,.55,.38,16),.7,1.4,2.6),o.add(a.darkMetal,I(.25,.25,.42,10),.7,1.4,2.6),o.add(a.steel,I(.05,.05,.5,8),.7,1.45,2.6),o.add(j,F(.32,.5,.4),1.12,1.44,1.75),o.add(a.darkMetal,F(.34,.05,.06),1.12,1.6,1.96),me(t,`FIRE`,.26,.1,1.29,1.44,1.75,Math.PI/2,{fg:`#e8e2d2`,font:`bold 34px Arial`}),o.add(a.darkMetal,I(.05,.08,.16,8),-1.18,1.28,4.25),o.add(a.steel,I(.012,.02,2.7,6),-1.18,2.7,4.25,0,0,.05),o.add(a.steel,ce(.028,8,6),-1.25,4.04,4.25),o.add(a.darkMetal,F(.55,.66,.26),1.16,1.56,3),o.add(a.metal,F(.34,.3,.03),1.16,1.62,3.15);for(let e of[-.18,0,.18])o.add(a.cable,oe(.035,.035,.14,8),1.16+e,1.32,3.15);me(t,`PWR`,.3,.12,1.16,1.86,3.14,0,{font:`bold 30px Arial`}),o.add(a.darkMetal,I(.03,.03,1,8),-1.22,1.7,3.6);let c=ue();c.position.set(-1.22,2.28,3.6),t.add(c);let l=de();l.position.set(-1.22,2.5,3.6),t.add(l),he(t,[{text:`RAMPART PX-4`,w:1.5,h:.3,x:-1.36,y:1.42,z:1.2,ry:-Math.PI/2},{text:`RAMPART PX-4`,w:1.5,h:.3,x:1.36,y:1.42,z:.6,ry:Math.PI/2}],{bg:`#42452f`}),me(t,`IV-DEF 04`,.8,.2,-.82,1.5,4.24,0,{}),o.add(a.darkMetal,I(1,1.15,.3,18),0,1.3,-2.9);let u=new En;u.position.set(0,1.55,-2.9),t.add(u);let d=ae(u);d.add(a.metal,I(1.12,1.28,.34,20),0,0,0),d.add(a.darkMetal,I(1.31,1.31,.1,20),0,-.16,0);for(let e=0;e<10;e++){let t=e/10*Z;d.add(a.darkMetal,F(.1,.12,.16),Math.cos(t)*1.16,.02,Math.sin(t)*1.16,0,-t,0)}for(let e of[-1,1])d.add(a.darkMetal,F(.3,.78,.6),e*1.38,.48,0),d.add(a.steel,I(.16,.16,.16,12),e*1.52,.85,0,0,0,Math.PI/2),d.add(a.darkMetal,F(.32,.2,.7),e*1.38,.12,0);d.add(a.darkMetal,F(.5,.38,.55),.72,.28,.75),d.add(a.steel,I(.07,.07,.2,8),.72,.28,1.08,Math.PI/2,0,0),d.flush();let f=new En;f.position.y=.3,u.add(f);let p=new En;f.add(p),p.position.set(0,.55,0);let m=ae(p),h=[],g=[];for(let e=0;e<2;e++)for(let t=0;t<2;t++){let n=(e-.5)*1.18,r=t*1.18,i=e*2+t;m.add(S,le(F(1.02,1.02,5.4),i*.37+.11,i*.29),n,r,0);for(let e of[-2.1,-.7,.7,2.1])m.add(a.darkMetal,F(1.1,1.1,.09),n,r,e);m.add(y,se(.98,.98),n,r,2.72),m.add(a.darkMetal,se(.98,.98),n,r,-2.72,0,Math.PI,0);for(let e of[-.26,.26])m.add(y,oe(.14,.2,.28,12),n+e,r,-2.86);for(let e of[-.26,.26]){let t=new K(new la(.21,18),A);t.position.set(n+e,r,2.755),p.add(t),m.add(a.darkMetal,L(.225,.02,Z,18),n+e,r,2.74),h.push({cover:t,offset:new W(n+e,r,2.6),used:!1})}g.push({text:`RMP-${e}${t}`,w:.72,h:.2,x:n,y:r+.32,z:2.757})}he(p,g,{font:`bold 26px Arial`});for(let e of[-1,1])for(let t of[0,1.18])for(let n of[-1.4,0,1.4])m.add(D,F(.035,.06,1.62),e*1.115,t,n,.55,0,0),m.add(D,F(.035,.06,1.62),e*1.115,t,n,-.55,0,0);for(let e of[-.59,.59])for(let t of[-1.4,0,1.4])m.add(D,F(.06,.035,1.62),e,1.695,t,0,.57,0),m.add(D,F(.06,.035,1.62),e,1.695,t,0,-.57,0);for(let[e,t]of[[-1.11,-.51],[1.11,-.51],[-1.11,1.69],[1.11,1.69]])m.add(D,F(.05,.05,5.42),e,t,0);m.add(a.metal,le(F(2.5,2.2,.16),.4,.1),0,.7,-2.8),m.add(a.darkMetal,F(.1,2.42,5.15),0,.59,0),m.add(a.darkMetal,F(2.42,.1,5.15),0,.59,0);for(let e of[-1.26,1.26])m.add(a.darkMetal,F(.09,2.46,5.3),e,.59,0);for(let e of[-1.31,1.31])m.add(a.steel,I(.13,.13,.12,12),e,-.55,0,0,0,Math.PI/2);for(let[e,t]of[[-.59,-1.7],[.59,-1.7],[-.59,1.7],[.59,1.7]])m.add(a.darkMetal,F(.05,.14,.1),e,1.76,t),m.add(a.darkMetal,L(.05,.016,Z,10),e,1.84,t,0,Math.PI/2,0);m.add(a.darkMetal,F(.07,.12,4.4),1.33,1,-.3),m.add(a.darkMetal,F(.18,.22,.3),1.33,.9,-2.4),ge(m,[[1.33,.8,-2.4],[1.28,.2,-2],[1.05,-.5,-1.1],[.75,-.72,-.4]],.04),m.flush();let _=new K(new Po(.62,.62),new J({map:i.roundel(),transparent:!0,roughness:.9}));_.position.set(-1.125,.59,1.9),_.rotation.y=-Math.PI/2,p.add(_);for(let e of[-1,1])o.add(a.darkMetal,F(.24,.16,.24),e*.8,1.2,.3);let v=fe(t,{pos:new W(.8,1.22,.3),node:t},{pos:new W(.62,-.45,1.55),node:p},.09,.062),b=fe(t,{pos:new W(-.8,1.22,.3),node:t},{pos:new W(-.62,-.45,1.55),node:p},.09,.062);return ge(o,[[.55,1.15,-2.6],[.95,1.25,-.5],[1.16,1.3,2.85]],.04),_e(o,[1.16,1.25,3.15],[2.3,.06,4.6],.55,.045),_e(o,[-.4,1.05,-2.95],[-2.2,.06,-4.6],.5,.04),o.flush(),s.flush({shadow:!1}),n.world.colliders.push(Gd(e.position.x,e.position.z,2,4.8,e.heading,0,3)),{group:t,turntable:u,elevGroup:p,tubes:h,statusLight:c,beacon:l,restElevation:.66,fireElevation:.66,elevAxis:`x`,elevSign:-1,hydUpdaters:[v,b],muzzleForward:new W(0,0,1)}}function be(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t);let o=ae(t,{receive:!0}),s=ae(t);o.add(C,le(F(2.5,.6,10.6),.07,.33),0,1.02,0);for(let e of[-.78,.78])o.add(a.darkMetal,F(.18,.4,10.8),e,.6,0);for(let e of[-4.6,-3,-1.4,.2,1.8,3.4])o.add(a.darkMetal,F(1.6,.16,.14),0,.55,e);o.add(a.metal,le(F(2.5,.06,6.6),.5,.24),0,1.36,-1.9);for(let e of[-4.6,-2.6,-.6])for(let t of[-1,1])o.add(a.steel,L(.06,.02,Math.PI,8),t*1.2,1.4,e);o.add(C,le(F(2.6,1.15,2.4),.42,.13),0,1.78,4.55),o.add(C,le(F(2.5,1,2.05),.8,.55),0,2.85,4.38),o.add(C,F(2.56,.09,2.12),0,3.4,4.38),s.add(a.glassDark,se(2.14,.66),0,3,5.425,-.1,0,0),o.add(a.darkMetal,F(2.3,.07,.06),0,3.36,5.4),o.add(a.darkMetal,F(2.3,.07,.06),0,2.64,5.46);for(let e of[-1.1,0,1.1])o.add(a.darkMetal,F(.08,.76,.06),e,3,5.43,-.1,0,0);for(let e of[-1,1])s.add(a.glassDark,se(.78,.55),e*1.262,2.98,4.6,0,e*Math.PI/2,0),o.add(a.darkMetal,F(.02,1.5,.05),e*1.26,2.4,5.25),o.add(a.darkMetal,F(.02,1.5,.05),e*1.26,2.4,3.95),o.add(a.steel,F(.03,.05,.22),e*1.27,2.42,4.1);o.add(T,F(1.8,.62,.08),0,1.98,5.78);for(let e of[-1.02,-.78,.78,1.02])o.add(M,oe(.085,.085,.07,12),e,1.5,5.79);for(let e of[-1.02,-.78,.78,1.02])o.add(a.darkMetal,oe(.105,.105,.05,12),e,1.5,5.77);o.add(a.darkMetal,F(2.85,.42,.35),0,.94,5.9);for(let e of[-.85,0,.85])o.add(a.steel,I(.028,.028,1.5,8),e,1.7,6.02);for(let e of[1.35,2.05])o.add(a.steel,I(.024,.024,2.2,8),0,e,6.03,0,0,Math.PI/2);me(t,`HA-9 · IV-DEF`,.9,.18,.7,.98,6.09,0,{fg:`#1c1d20`,bg:`#c9c4b2`,font:`bold 26px Arial`});for(let e of[-1,1])o.add(a.steel,I(.05,.085,.42,10),e*.42,3.52,4.9,-1.25,0,0);for(let e of[-.9,-.45,0,.45,.9])o.add(N,F(.09,.05,.05),e,3.47,5.42);o.add(a.steel,I(.012,.018,1.6,6),-1.05,4.2,3.6,0,0,.06);for(let e of[-1,1])o.add(a.steel,I(.02,.02,.55,8),e*1.42,3.15,5.3,0,0,e*1.2),o.add(a.darkMetal,F(.24,.38,.04),e*1.66,2.95,5.32),s.add(a.glassDark,se(.19,.32),e*1.66,2.95,5.345);o.add(a.steel,I(.085,.085,2.15,10),1.16,2.65,3.25),o.add(a.darkMetal,new ua(.13,.13,1.3,10,1,!0,0,Math.PI),1.16,2.4,3.25),o.add(a.steel,I(.08,.085,.3,10),1.16,3.82,3.2,.5,0,0);for(let e of[-1,1]){o.add(a.steel,oe(.34,.34,1.7,14),e*1.22,.8,2.3);for(let t of[1.85,2.75])o.add(a.darkMetal,L(.36,.028,Z,14),e*1.22,.8,t);o.add(a.metal,F(.55,.04,1.6),e*1.22,1.17,2.3)}for(let e of[-1,1])o.add(a.darkMetal,F(.5,.05,.55),e*1.32,.62,4.9),o.add(a.darkMetal,F(.5,.05,.55),e*1.32,1.08,4.9),o.add(a.steel,I(.02,.02,1.3,8),e*1.31,1.95,5.52);for(let e of[-1,1])o.add(C,F(.56,.06,1.6),e*1.42,1.42,4.2),o.add(C,F(.56,.06,.45),e*1.42,1.3,5.1,-.6,0,0),o.add(a.rubber,F(.5,.5,.035),e*1.42,.62,3.35),o.add(a.rubber,F(.5,.5,.035),e*1.42,.62,-5.12);let c=[4.2,1.6,-.6,-2.6,-4.4];for(let e of c)o.add(a.darkMetal,I(.08,.08,2.4,8),0,.62,e,0,0,Math.PI/2);pe(o,c.flatMap(e=>[[-1.42,e],[1.42,e]]),.62,.5);for(let e of[-1,1])o.add(a.darkMetal,F(.32,.3,.5),e*1.25,1,-4.95),o.add(a.steel,I(.11,.11,1.1,10),e*1.6,.62,-4.95),o.add(a.darkMetal,F(.6,.1,.6),e*1.6,.07,-4.95),o.add(a.darkMetal,F(.55,.12,.14),e*1.42,1.05,-4.95,0,0,e*.45);for(let e of[-1,1])o.add(a.darkMetal,F(.42,.62,.55),e*.95,1.55,-3.4),o.add(a.steel,I(.17,.17,.2,12),e*1.21,1.55,-3.4,0,0,Math.PI/2);o.add(a.rubber,oe(.6,.6,.35,16),-.55,2,3.28),o.add(a.darkMetal,oe(.26,.26,.4,10),-.55,2,3.28),o.add(C,le(F(.7,.52,.8),.55,.8),1.18,1.06,.5),o.add(C,le(F(.7,.5,.85),.15,.42),-1.18,1.04,-1.6);for(let e of[-.1,.14])o.add(a.steel,I(.11,.11,.9,10),.2,.62+e,-3.9,0,0,Math.PI/2);o.add(a.darkMetal,F(2.2,.24,.4),0,1.5,.9),o.add(a.rubber,F(2.1,.06,.34),0,1.65,.9);let l=new En;l.position.set(0,1.55,-3.4),t.add(l);let u=ae(l);for(let e of[-1,1])u.add(a.darkMetal,I(.14,.14,.24,12),e*1.12,0,0,0,0,Math.PI/2);u.flush();let d=new En;l.add(d),d.position.set(0,.3,1.2);let f=ae(d),p=[],m=[];for(let e=0;e<2;e++)for(let t=0;t<3;t++){let n=(e-.5)*1.05,r=.35+t*.95,i=e*3+t;f.add(S,le(oe(.42,.42,6.8,18),i*.29+.07,i*.17),n,r,.4),f.add(y,oe(.45,.45,.18,18),n,r,3.72),f.add(a.darkMetal,oe(.44,.44,.1,18),n,r,-2.98),f.add(w,new la(.36,16).rotateY(Math.PI),n,r,-3.04);let o=new K(new la(.385,20),w);o.position.set(n,r,3.83),d.add(o),p.push({cover:o,offset:new W(n,r+.3,4.9),used:!1}),f.add(a.darkMetal,F(.4,.18,.05),n,r+.48,3.78),m.push({text:`H-${i+1}`,w:.32,h:.13,x:n,y:r+.48,z:3.815})}he(d,m,{font:`bold 34px Arial`});for(let e of[-1,1]){f.add(a.metal,le(F(.06,2.1,6.3),e*.3,.6),e*1.05,.85,.3);for(let t of[-2.4,-1.2,0,1.2,2.4])f.add(a.darkMetal,F(.05,2,.12),e*1.09,.85,t);f.add(D,F(.07,.09,6.3),e*1.05,1.94,.3),f.add(D,F(.07,.09,6.3),e*1.05,-.22,.3)}f.add(a.darkMetal,F(.06,.12,5.2),1.11,1.55,0),f.add(a.darkMetal,F(2.16,.14,6.4),0,-.28,.3);for(let e of[3.1,-2.7]){f.add(a.darkMetal,F(2.24,.16,.2),0,-.14,e),f.add(a.darkMetal,F(2.24,.16,.2),0,2.78,e);for(let t of[-1,1])f.add(a.darkMetal,F(.16,3.1,.2),t*1.06,1.3,e)}for(let e of[-1,1]){f.add(a.steel,oe(.028,.028,6.2,8),e*.5,3,.3);for(let t of[-2.4,.3,2.9])f.add(a.steel,F(.05,.24,.05),e*.5,2.88,t)}for(let[e,t]of[[-.5,.6],[.5,.6],[-.5,1.85],[.5,1.85]])f.add(a.metal,F(.44,.44,.06),e,t,-3.12);for(let[e,t]of[[-.2,1.25],[.25,1.3]])f.add(a.steel,L(.07,.02,Z,10),e,t,-3.16);for(let[e,t]of[[-.85,.3],[.88,2.3]])f.add(a.cable,L(.1,.03,Math.PI/2,8),e,t,-3.14);f.flush(),he(d,[{text:`HALBERD HA-9`,w:1.7,h:.3,x:-1.09,y:1.35,z:.3,ry:-Math.PI/2},{text:`HALBERD HA-9`,w:1.7,h:.3,x:1.12,y:1.35,z:.3,ry:Math.PI/2}],{bg:`#42452f`});for(let e of[-1,1])o.add(a.darkMetal,F(.26,.2,.26),e*.92,1.32,-1);let h=fe(t,{pos:new W(.92,1.35,-1),node:t},{pos:new W(.92,.1,1.8),node:d},.115,.08),g=fe(t,{pos:new W(-.92,1.35,-1),node:t},{pos:new W(-.92,.1,1.8),node:d},.115,.08);o.add(a.darkMetal,F(.72,.52,.38),2.5,.26,-5.2),o.add(a.metal,F(.5,.28,.04),2.5,.3,-4.99),_e(o,[.4,1.1,-4.9],[2.35,.52,-5.15],.35,.04),_e(o,[.1,1.05,-4.95],[2.42,.5,-5.3],.5,.035),_e(o,[-.2,1,-4.85],[2.3,.48,-5],.65,.03),_e(o,[2.62,.4,-5.2],[3.8,.05,-5.9],.3,.05),o.add(a.darkMetal,I(.028,.028,1,8),-1.35,1.9,-5.05);let _=ue();_.position.set(-1.35,2.45,-5.05),t.add(_);let v=de();v.position.set(-1.35,2.66,-5.05),t.add(v),me(t,`HALBERD HA-9`,1.9,.36,0,1.6,5.93,0,{bg:`#42452f`});let b=new K(new Po(.5,.5),new J({map:i.roundel(),transparent:!0,roughness:.9}));b.position.set(-1.267,2.35,4.62),b.rotation.y=-Math.PI/2,t.add(b),o.flush(),s.flush({shadow:!1}),n.world.colliders.push(Gd(e.position.x,e.position.z,1.9,5.8,e.heading,0,3.4));let x=ve(e,2.5,-5.2);return n.world.colliders.push(Kd(x.x,x.z,.6,0,.6)),{group:t,turntable:null,elevGroup:l,tubes:p,statusLight:_,beacon:v,restElevation:.5,fireElevation:1.18,elevAxis:`x`,elevSign:-1,hydUpdaters:[h,g],muzzleForward:new W(0,0,1)}}function xe(e){let t=new En;t.position.copy(e.position),t.rotation.y=e.heading,r.add(t);let i=ae(t,{receive:!0}),o=ae(t);i.add(a.concrete,I(4.4,4.8,.7,28),0,.35,0),i.add(a.hazard,new ua(4.45,4.45,.14,28,1,!0),0,.66,0),i.add(a.darkMetal,I(.95,1.25,1.15,16),.4,.575,0),i.add(a.metal,I(1.12,1.12,.09,16),.4,1.1,0);for(let e=0;e<8;e++){let t=e/8*Z;i.add(a.steel,I(.05,.05,.1,6),.4+Math.cos(t)*1,1.16,Math.sin(t)*1)}i.add(O,F(2.6,.18,2.5),.4,.9,-2.1,.62,0,0);for(let e of[-1,1])i.add(O,F(.14,1,2.2),.4+e*1.32,.85,-2.1,.45,0,0);for(let e of[-.7,.7])i.add(a.darkMetal,F(.16,.7,.16),.4+e,.55,-1.6);o.add(ee,se(4.2,4.2).rotateX(-Math.PI/2),.4,.715,-2.4);let s=new En;s.position.set(-3,0,0),t.add(s);let c=ae(s);for(let[e,t]of[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]])c.add(E,I(.09,.13,13,10),e,6.5,t),c.add(a.darkMetal,F(.5,.08,.5),e,.04,t);for(let e=1;e<=6;e++){let t=e*2;for(let e of[-.6,.6])c.add(a.steel,F(1.32,.08,.08),0,t,e),c.add(a.steel,F(.08,.08,1.32),e,t,0);for(let e of[-.6,.6])c.add(a.steel,I(.024,.024,2.2,6),0,t-1,e,0,0,.55),c.add(a.steel,I(.024,.024,2.2,6),0,t-1,e,0,0,-.55),c.add(a.steel,I(.024,.024,2.2,6),e,t-1,0,.55,0,0),c.add(a.steel,I(.024,.024,2.2,6),e,t-1,0,-.55,0,0)}for(let e of[4.4,8.8,12.4]){let t=e===4.4;c.add(a.metal,le(F(2.6,.1,2.2),e*.13,.3),0,e,0),c.add(a.darkMetal,F(2.6,.12,.03),0,e-.02,1.11),c.add(a.darkMetal,F(2.6,.12,.03),0,e-.02,-1.11),c.add(a.darkMetal,F(.03,.12,2.2),1.29,e-.02,0),c.add(a.darkMetal,F(.03,.12,2.2),-1.29,e-.02,0);for(let[n,r]of[[-1.25,-1.05],[0,-1.05],[1.25,-1.05],[-1.25,1.05],[0,1.05],[1.25,1.05],[-1.25,0],[1.25,0]])t&&n===1.25&&r===0||c.add(a.steel,F(.045,1,.045),n,e+.55,r);for(let t of[-1.05,1.05])c.add(a.steel,F(2.55,.045,.045),0,e+1.05,t),c.add(a.steel,F(2.55,.045,.045),0,e+.6,t);for(let n of[-1.25,1.25])t&&n>0||(c.add(a.steel,F(.045,.045,2.15),n,e+1.05,0),c.add(a.steel,F(.045,.045,2.15),n,e+.6,0))}c.add(a.darkMetal,F(.55,.12,.26),1.32,4.42,0),c.add(a.steel,I(.05,.05,.5,8),1.45,4.62,0),c.add(a.steel,F(.08,.1,.5),1.28,4.3,0,0,0,.7);for(let e of[-.22,.22])c.add(a.steel,F(.05,12.6,.05),-.85,6.3,e);for(let e=.5;e<12.5;e+=.38)c.add(a.steel,F(.04,.04,.42),-.85,e,0);for(let e=2.6;e<12.2;e+=1.2)c.add(a.steel,L(.38,.02,Math.PI*1.2,12),-.85,e,0,Math.PI/2,0,Math.PI*.4);c.add(a.darkMetal,F(.3,12.4,.05),.62,6.2,.78);for(let e of[-.14,.14])c.add(a.darkMetal,F(.04,12.4,.12),.62+e,6.2,.72);for(let e of[-.08,0,.08])c.add(a.cable,I(.022,.022,12.3,6),.62+e,6.2,.76);c.add(a.darkMetal,F(.4,.5,.22),.62,12.7,.7),c.add(a.steel,I(.03,.045,1.5,8),0,13.65,0),c.flush();let l=new J({color:3342336,emissive:16722458,emissiveIntensity:.15,roughness:.4});{let e=ae(s);e.add(l,ce(.1,10,7),0,14.45,0),e.add(l,ce(.075,8,6),-1.25,13.1,-1),e.add(l,ce(.075,8,6),1.25,13.1,1),e.flush({shadow:!1})}for(let[e,t]of[[-1.25,-1],[1.25,1]]){let n=new K(new ua(.02,.02,.5,6),a.steel);n.position.set(e,12.78,t),s.add(n)}let u=new En;u.position.set(.4,1.15,0),t.add(u);let d=ae(u);d.add(a.metal,I(1.02,1.02,.14,18),0,-.02,0);for(let e of[-1,1])d.add(a.darkMetal,F(.24,.5,.7),e*.55,.1,0),d.add(a.steel,I(.14,.14,.18,12),e*.69,.28,0,0,0,Math.PI/2);d.flush();let f=new En;u.add(f);let p=ae(f);p.add(a.metal,le(F(.7,.5,12.6),.21,.65),0,0,1.8);for(let e of[-1,1])p.add(a.darkMetal,F(.09,.62,12.6),e*.39,0,1.8);for(let e=-3.6;e<=7.6;e+=1.6)p.add(a.darkMetal,F(.88,.1,.14),0,-.31,e);for(let e=-2.8;e<=6.8;e+=1.6)p.add(a.steel,F(.05,.04,1.78),0,-.34,e,0,.5,0),p.add(a.steel,F(.05,.04,1.78),0,-.34,e,0,-.5,0);p.add(a.darkMetal,F(.06,.08,11.6),.3,-.33,2),p.add(a.cable,oe(.02,.02,10.8,6),-.22,-.32,2.4),p.add(a.hazard,F(.74,.55,.22),0,0,-.6),p.add(j,F(.73,.53,.18),0,0,7.85),p.add(a.darkMetal,I(.2,.2,.1,14),0,.06,8,0,0,Math.PI/2);for(let e of[-1,1])p.add(a.steel,F(.05,.44,.5),e*.1,.1,7.95);p.add(a.darkMetal,F(.95,.26,1.5),0,.4,.6);for(let[e,t]of[[-.44,.15],[.44,.15],[-.44,1.05],[.44,1.05]])p.add(a.steel,I(.1,.1,.09,10),e,.14,t,0,0,Math.PI/2);for(let e of[0,1.2])for(let t of[-1,1])p.add(a.steel,F(.08,.5,.12),t*.52,.68,e,0,0,t*2.2);for(let e of[-1.6,2.6])p.add(a.darkMetal,L(.5,.05,Math.PI,14),0,.75,e,0,0,Math.PI),p.add(a.darkMetal,F(.9,.22,.2),0,.3,e);p.add(a.darkMetal,I(.16,.16,.5,12),0,.12,-2.9,0,0,Math.PI/2),p.add(a.steel,F(.7,.08,.5),0,.34,-2.9),p.flush();let m=[{cover:null,offset:new W(0,.75,4),used:!1},{cover:null,offset:new W(0,.75,4),used:!1},{cover:null,offset:new W(0,.75,4),used:!1}],h=new En;{let e=ae(h),t=new J({color:14934229,roughness:.42,metalness:.15}),n=new J({color:3093304,roughness:.3,metalness:.5}),r=new J({color:10133670,roughness:.5,metalness:.4}),i=new J({color:11747374,roughness:.6});e.add(t,oe(.42,.42,7.6,18),0,0,0),e.add(n,new da(.42,1.9,18).rotateX(Math.PI/2),0,0,4.75),e.add(y,oe(.3,.38,.5,14),0,0,-4);for(let t=0;t<4;t++){let n=t/4*Z+Math.PI/4;e.add(r,F(.05,.55,1.2),Math.cos(n)*.55,Math.sin(n)*.55,-3.4,0,0,n)}for(let t of[2.4,-1.6])e.add(i,oe(.428,.428,.16,18),0,0,t);e.add(n,F(.1,.22,.34),.4,.12,1.6),e.flush(),me(h,`LR-1 T3`,.9,.22,.435,0,.2,Math.PI/2,{fg:`#6a655a`,font:`bold 26px Arial`}),h.position.set(0,.75,.6),h.traverse(e=>{e.castShadow=!0}),f.add(h)}for(let e of[1.4,-1])i.add(a.darkMetal,F(.26,.22,.26),e,.78,-1.6);let g=fe(t,{pos:new W(1.4,.86,-1.6),node:t},{pos:new W(.42,-.1,3.4),node:f},.1,.07),_=fe(t,{pos:new W(-1,.86,-1.6),node:t},{pos:new W(-.42,-.1,3.4),node:f},.1,.07),v=new En;v.position.set(-1.55,4.85,0),t.add(v);let b=-Math.atan2(1.26,1.95);v.rotation.y=b;{let e=ae(v);e.add(a.steel,F(1.85,.16,.2),.92,0,0),e.add(a.steel,F(.09,.13,.85),.7,-.26,0,.85,0,0),e.add(a.darkMetal,F(.28,.42,.3),1.86,-.06,0);for(let t of[-.16,.04])e.add(a.cable,I(.03,.03,.16,8),2.04,t,0,0,0,Math.PI/2);e.flush();let t=ae(v);ge(t,[[1.95,-.25,.04],[2.2,-.75,.18],[2.35,-.4,.42],[2.3,-.25,.6]],.04),ge(t,[[.06,-.06,.06],[.7,-.22,.1],[1.35,-.16,.06],[1.8,-.12,0]],.028),t.flush({shadow:!1})}let x=[];for(let[e,t,n]of[[4.4,-3.6,.5],[5.2,-1.2,.35]]){let r=Math.cos(n),o=-Math.sin(n);i.add(C,le(I(.55,.55,9.6,16),e*.2,t*.2),e,.88,t,0,n,Math.PI/2);for(let a of[-4.9,4.9])i.add(C,I(.55,.42,.35,16),e+r*a,.88,t+o*a,0,n,Math.PI/2*Math.sign(a));for(let s of[-3.1,0,3.1])i.add(a.darkMetal,L(.57,.03,Z,16),e+r*s,.88,t+o*s,0,n+Math.PI/2,0);for(let s of[-3,3]){for(let c of[-1,1])i.add(a.darkMetal,F(.12,1,.16),e+r*s+c*.45*-o,.42,t+o*s+c*.45*r,0,n,c*.42);i.add(a.darkMetal,F(.16,.14,1.15),e+r*s,.14,t+o*s,0,n+Math.PI/2,0),i.add(a.steel,L(.58,.025,Math.PI,12),e+r*s,.88,t+o*s,0,n+Math.PI/2,Math.PI)}x.push({text:`SNTL TEST ARTICLE`,w:2.4,h:.4,x:e-o*.57,y:1,z:t+r*.57,ry:n})}he(t,x,{font:`bold 24px Arial`}),_e(i,[-2.35,.75,.7],[-.75,.75,.35],.4,.04),_e(i,[-2.3,.75,-.5],[-.7,.75,-.3],.5,.035),i.add(a.metal,F(.6,.05,1.9),-1.5,.73,.05,0,.12,0),_e(i,[1.3,.72,-.4],[3.6,.06,-3.2],.4,.045),_e(i,[.9,.72,1],[2.6,.06,4.2],.5,.04),i.add(a.darkMetal,F(.42,1.25,.34),-2.5,1.32,1.5),i.add(a.metal,F(.3,.4,.04),-2.5,1.5,1.68);let S=ue();S.position.set(-2.5,2.1,1.5),t.add(S);let w=de();w.position.set(-2.5,2.3,1.5),t.add(w),i.add(a.darkMetal,F(2.6,.55,.07),0,1.35,-4.55);for(let e of[-1.1,1.1])i.add(a.steel,I(.035,.035,.75,8),e,1,-4.55);me(t,`SENTINEL LR-1`,2.4,.44,0,1.35,-4.51,Math.PI,{bg:`#5a4632`}),o.add(k,se(1,.38),1.55,.6,0,0,Math.PI/2,0),o.add(k,se(1,.38),.4,.6,1.14,0,0,0),o.add(k,se(1.1,.4),-3.62,1.6,.62,0,-Math.PI/2,0),i.flush(),o.flush({shadow:!1}),n.world.colliders.push(Kd(e.position.x,e.position.z,5,0,2.2)),n.world.colliders.push(Gd(e.position.x+Math.cos(e.heading)*-3,e.position.z-Math.sin(e.heading)*-3,1.5,1.5,e.heading,0,13));for(let[t,r,i]of[[4.4,-3.6,.5],[5.2,-1.2,.35]])for(let a of[-3.2,0,3.2]){let o=ve(e,t+Math.cos(i)*a,r-Math.sin(i)*a);n.world.colliders.push(Kd(o.x,o.z,1,0,1.6))}let T=0,D=1.05;function A(e,t){let r=n.time.now%1.6;l.emissiveIntensity=r<.07||r>.24&&r<.31?3.8:.15;let i=e.state===`ready`&&h.visible&&Math.abs(Ed(u.rotation.y))<.05&&Math.abs(e.currentElev-D)<.05;T=wd(T,+!i,2.6,t),v.rotation.y=b-T*1.95}return{group:t,turntable:u,elevGroup:f,tubes:m,statusLight:S,beacon:w,restElevation:D,fireElevation:1.45,elevAxis:`x`,elevSign:-1,hydUpdaters:[g,_],muzzleForward:new W(0,0,1),isSentinel:!0,roundMesh:h,extraUpdate:A}}let Se=new Dt,Ce=new W,we=new W;class Te{constructor(e,t){this.def=e,this.id=e.id,this.rig=t,this.ammo=e.ammo,this.state=`ready`,this.readyIn=0,this.targetAz=null,this.currentElev=t.restElevation,this.targetElev=t.restElevation,this.launchTimer=-1,this.pendingTrack=null,this.tubeIndex=0,this.applyElevation()}get displayState(){if(this.ammo<=0&&this.state!==`launching`)return`EMPTY`;switch(this.state){case`ready`:return`READY`;case`slewing`:return`SLEWING`;case`launching`:return`LAUNCHING`;case`reload`:return`RELOADING`;default:return this.state.toUpperCase()}}canAccept(){return this.ammo>0&&(this.state===`ready`||this.state===`slewing`)}applyElevation(){this.rig.elevGroup.rotation.x=-this.currentElev}pointAt(e){let t=this.rig.group.position;this.targetAz=Math.atan2(e.x-t.x,e.z-t.z),this.targetElev=this.rig.fireElevation,this.state===`ready`&&(this.state=`slewing`)}relax(){this.targetAz=null,this.targetElev=this.rig.restElevation}muzzle(e,t){let n=this.rig,r=n.tubes[Math.min(this.tubeIndex,n.tubes.length-1)];return e.copy(r.offset),n.elevGroup.localToWorld(e),t.set(0,0,1).applyQuaternion(n.elevGroup.getWorldQuaternion(Se)),e}launch(e){return this.canAccept()?(this.state=`launching`,this.launchTimer=this.def.launchDelay,this.pendingTrack=e,n.events.emit(`battery-launching`,{battery:this,track:e}),!0):!1}update(e){let t=this.rig;if(this.targetAz!==null){t.group.rotation.y+(t.turntable?t.turntable.rotation.y:0);let r=Ed(this.targetAz-t.group.rotation.y);t.turntable?t.turntable.rotation.y=Dd(t.turntable.rotation.y,r,this.def.slewRate*e):t.group.rotation.y=Dd(t.group.rotation.y,this.targetAz,this.def.slewRate*e*.55);let i=Math.abs(Ed(this.targetAz-(t.group.rotation.y+(t.turntable?t.turntable.rotation.y:0))));this.state===`slewing`&&i<.02&&Math.abs(this.currentElev-this.targetElev)<.02&&(this.state=`ready`,n.events.emit(`battery-laid`,{battery:this}))}this.currentElev=wd(this.currentElev,this.targetElev,2.2,e),this.applyElevation();for(let e of t.hydUpdaters)e();this.state===`launching`&&(this.launchTimer-=e,this.launchTimer<=0&&this.fire()),this.state===`reload`&&(this.readyIn-=e,this.readyIn<=0&&(this.state=this.ammo>0?`ready`:`empty`,this.ammo>0&&(this.rig.roundMesh&&(this.rig.roundMesh.visible=!0),n.events.emit(`battery-ready`,{battery:this}))));let r=t.statusLight.material;this.ammo<=0?(r.emissive.setHex(16720418),r.emissiveIntensity=1.2):this.state===`ready`?(r.emissive.setHex(2293572),r.emissiveIntensity=2.4):this.state===`launching`?(r.emissive.setHex(16746530),r.emissiveIntensity=2+Math.sin(n.time.now*20)*1.6):(r.emissive.setHex(16755234),r.emissiveIntensity=1.8),t.beacon&&(t.beacon.material.emissiveIntensity=this.state===`launching`?Math.sin(n.time.now*16)>0?3.4:.25:0),t.extraUpdate&&t.extraUpdate(this,e)}fire(){let e=this.pendingTrack;this.pendingTrack=null,--this.ammo,this.state=`reload`,this.readyIn=this.def.reloadTime;let t=this.rig.tubes[Math.min(this.tubeIndex,this.rig.tubes.length-1)];this.muzzle(Ce,we),t.cover&&(t.cover.visible=!1,n.effects.coverPop(Ce,we)),this.rig.roundMesh&&(this.rig.roundMesh.visible=!1),this.tubeIndex=(this.tubeIndex+1)%this.rig.tubes.length,n.interceptors.launch(this,e,Ce.clone(),we.clone()),n.events.emit(`interceptor-launched`,{battery:this,track:e})}resetAmmo(){this.ammo=this.def.ammo,this.state=`ready`,this.readyIn=0,this.tubeIndex=0,this.pendingTrack=null,this.launchTimer=-1;for(let e of this.rig.tubes)e.cover&&(e.cover.visible=!0),e.used=!1;this.rig.roundMesh&&(this.rig.roundMesh.visible=!0)}}let Ee={patriot:ye(o.patriot),thaad:be(o.thaad),sentinel:xe(o.sentinel)};for(let e of[`patriot`,`thaad`,`sentinel`]){let t=new Te(pf[e],Ee[e]);s.push(t),c.set(e,t)}return{list:s,get(e){return c.get(e)},update(e){for(let t of s)t.update(e)},resetAll(){for(let e of s)e.resetAmmo(),e.relax()}}}var hf=170,gf={single:{id:`single`,name:`SINGLE TRACK`,desc:`One high-visibility ballistic target.`,build(e){return[{delay:2.5,T:e.range(52,62),decoy:!1}]}},saturation:{id:`saturation`,name:`SATURATION`,desc:`3–5 targets on separate arcs.`,build(e){let t=e.int(3,5),n=[],r=2;for(let i=0;i<t;i++)n.push({delay:r,T:e.range(50,72),decoy:!1}),r+=e.range(4,9);return n}},nightraid:{id:`nightraid`,name:`NIGHT RAID`,desc:`Multiple targets with decoys, at night.`,forceTime:`night`,build(e){let t=e.int(2,3),n=[],r=2.5,i=[];for(let e=0;e<3;e++)i.push(!1);for(let e=0;e<t;e++)i.push(!0);for(let t=i.length-1;t>0;t--){let n=Math.floor(e.next()*(t+1));[i[t],i[n]]=[i[n],i[t]]}for(let t of i)n.push({delay:r,T:e.range(48,66),decoy:t}),r+=e.range(3.5,7.5);return n}}};function _f(e){let{scene:t,textures:n}=e,r=[],i=[],a=0,o=0,s=!1,c=(()=>{let e=new da(.55,4.6,10);return e.rotateX(Math.PI/2),e})(),l=new J({color:4013890,roughness:.55,metalness:.35,emissive:16734750,emissiveIntensity:0}),u=n.hardFlare(),d=new Sd(()=>{let e=new En,n=new K(c,l.clone());n.castShadow=!1,e.add(n);let r=new Yr(new Fr({map:u,color:16760960,transparent:!0,opacity:.9,blending:2,depthWrite:!1}));return e.add(r),e.visible=!1,t.add(e),{group:e,body:n,glow:r,id:``,pos:new W,vel:new W,alive:!1,isDecoy:!1,dragK:0,weave:0,weavePhase:0,trail:null,glowTrail:null,emitAcc:0,age:0,engagedBy:0,plasmaTrail:null,plasmaAcc:0,flickerPhase:0}},10),f=new W,p=new W,m=new W;function h(t,n){let i=d.acquire();if(!i)return null;o++,i.id=`T-`+Md(o),i.isDecoy=t.decoy,i.alive=!0,i.age=0,i.engagedBy=0,i.emitAcc=0;let a=n.next()*Z,s=n.range(5200,7600),c=n.range(5200,6800),l=n.range(15,t.decoy?600:130),u=n.next()*Z,f=new W(Math.sin(a)*s,c,Math.cos(a)*s),p=new W(Math.sin(u)*l,0,Math.cos(u)*l);return i.pos.copy(f),zd(f,p,t.T,i.vel),i.dragK=t.decoy?3e-4:6e-5,i.weave=!t.decoy&&n.next()<.45?n.range(8,18):0,i.weavePhase=n.next()*Z,i.group.visible=!0,i.group.position.copy(i.pos),i.body.material.emissiveIntensity=.4,i.glow.material.opacity=.85,i.trail=e.effects.acquireTrail({color:t.decoy?13620442:15262424,life:11,opacity:t.decoy?.4:.62,emissive:.45}),i.plasmaTrail=e.effects.acquireTrail({color:t.decoy?16767392:16756838,life:1.2,opacity:t.decoy?.45:.9,emissive:1}),i.plasmaAcc=0,i.flickerPhase=e.vrng.next()*Z,r.push(i),e.events.emit(`threat-spawned`,{threat:i}),i}function g(t){t.alive=!1,t.group.visible=!1,t.trail&&=(e.effects.releaseTrail(t.trail),null),t.plasmaTrail&&=(e.effects.releaseTrail(t.plasmaTrail),null);let n=r.indexOf(t);n>=0&&r.splice(n,1),d.release(t)}let _={active:r,get running(){return s},get pendingCount(){return i.length},get allSpawned(){return i.length===0},startScenario(e,t){_.clear();let n=gf[e];return n?(i=n.build(t).map(e=>({...e})),a=0,o=0,s=!0,_._rng=t,!0):!1},stop(){s=!1,i=[]},clear(){for(let e of[...r])g(e);i=[],s=!1},destroy(t,n){t.alive&&(e.effects.explosionAir(n??t.pos,t.isDecoy?.7:1.25),e.events.emit(`threat-destroyed`,{threat:t,point:n??t.pos.clone()}),g(t))},update(t){if(s)for(a+=t;i.length&&i[0].delay<=a;)h(i.shift(),_._rng);for(let n of[...r]){n.age+=t,n.vel.y-=Id*t;let r=n.vel.length(),i=n.dragK*r*r*t;r>1&&n.vel.multiplyScalar(Math.max(0,1-i/r)),n.weave>0&&n.pos.y<2400&&n.pos.y>300&&(f.set(-n.vel.z,0,n.vel.x).normalize(),n.vel.addScaledVector(f,Math.sin(n.age*1.9+n.weavePhase)*n.weave*t)),n.pos.addScaledVector(n.vel,t),n.group.position.copy(n.pos),p.copy(n.pos).add(n.vel),n.group.lookAt(p);let a=X((r-220)/600,0,1)*X(1.5-n.pos.y/5200,.2,1),o=.9+.1*Math.sin(n.age*27+n.flickerPhase)*Math.sin(n.age*9.3+n.flickerPhase*1.7);n.body.material.emissiveIntensity=a*3.2*(.75+.35*o);let s=n.pos.distanceTo(e.camera.position);if(n.glow.scale.setScalar(X(3.5+s*.012,4,90)*(n.isDecoy?.7:1)*(.55+a)*(.92+.08*o)),n.glow.material.opacity=(.5+a*.5)*(n.isDecoy?.72:1)*o,n.emitAcc+=t,n.emitAcc>.035&&n.trail){n.emitAcc=0;let e=X(n.pos.y/6500,0,1);n.trail.emit(n.pos,(n.isDecoy?3.5:6)*(.5+e*1.2),.5+e*.6)}n.plasmaAcc+=t,n.plasmaAcc>.024&&n.plasmaTrail&&(n.plasmaAcc=0,a>.04&&(m.copy(n.vel).normalize().multiplyScalar(-2.6).add(n.pos),n.plasmaTrail.emit(m,(n.isDecoy?1.3:2.8)*(.45+a*1.3),X(.3+a*.95,0,1)*(.9+.1*o))));let c=Math.max(0,ef(n.pos.x,n.pos.z));if(n.pos.y<=c+2){let t=Math.hypot(n.pos.x,n.pos.z)<hf;n.isDecoy?e.effects.explosionGround(n.pos,.5):e.effects.explosionGround(n.pos,t?1.6:1.15),e.events.emit(`threat-impact`,{threat:n,onBase:t,point:n.pos.clone()}),g(n)}}}};return _}function vf(e){let{scene:t,textures:n}=e,r=[],i=0;function a(){let e=new En,r=new K(new ua(1,1,1,10).rotateX(Math.PI/2),new J({color:14210248,roughness:.4,metalness:.2}));e.add(r);let i=new K(new da(1,1,10).rotateX(Math.PI/2),new J({color:3159098,roughness:.35,metalness:.5}));e.add(i);let a=new q(.06,1,1),o=new J({color:10133670,roughness:.5,metalness:.4}),s=[];for(let t=0;t<4;t++){let t=new K(a,o);s.push(t),e.add(t)}let c=new Yr(new Fr({map:n.hardFlare(),color:16761466,transparent:!0,blending:2,depthWrite:!1,opacity:.95}));return e.add(c),e.visible=!1,t.add(e),{group:e,body:r,nose:i,fins:s,flame:c}}let o=new Sd(()=>({mesh:a(),id:``,battery:null,def:null,track:null,threat:null,pos:new W,vel:new W,age:0,phase:`boost`,alive:!1,trail:null,emitAcc:0,minDist:1e9,weaveSeed:0,flickerSeed:0,lastPredict:new W,predictT:0}),14),s=new W,c=new W,l=new W;function u(e,t){let n=t.length,r=t.girth;e.body.scale.set(r,r,n*.8),e.body.position.z=-n*.1,e.nose.scale.set(r,r,n*.2),e.nose.position.z=n*.4,e.fins.forEach((e,t)=>{let i=t/4*Math.PI*2+Math.PI/4;e.scale.set(1,r*3.4,n*.14),e.position.set(Math.cos(i)*r*1.4,Math.sin(i)*r*1.4,-n*.42),e.rotation.z=i}),e.flame.position.z=-n*.55}function d(t,n){let r=t.threat,i=t.def,a=t.battery.def.envelope,o=t.pos.y,c=Math.hypot(t.pos.x,t.pos.z),l=1,u=null;o<a.minAlt||o>a.maxAlt||c>a.maxRange?(l=.35,u=`OUTSIDE ENGAGEMENT ENVELOPE`):(o<a.sweetLow||o>a.sweetHigh)&&(l=.72,u=`MARGINAL GEOMETRY`),s.copy(r.vel).normalize();let d=s.dot(t.vel.clone().normalize())<-.25?1:.8;d<1&&!u&&(u=`CROSSING ENGAGEMENT`);let p=X(1.15-n/(i.killRadius*3),.5,1),m=.94*l*d*p;if(e.rng.next()<m){let i=t.pos.clone().lerp(r.pos,.5);e.threats.destroy(r,i),e.events.emit(`intercept-success`,{interceptor:t,threat:r,point:i,decoy:r.isDecoy,dist:Math.round(n),pk:m})}else e.effects.explosionAir(t.pos,.55),e.events.emit(`intercept-miss`,{interceptor:t,threat:r,reason:u??`PROXIMITY FUZE — DEBRIS MISSED`,dist:Math.round(n),pk:m});f(t,!1)}function f(t,n=!0){if(!t.alive)return;t.alive=!1,n&&e.effects.explosionAir(t.pos,.4),t.mesh.group.visible=!1,t.trail&&=(e.effects.releaseTrail(t.trail),null);let i=r.indexOf(t);i>=0&&r.splice(i,1),o.release(t)}return{active:r,launch(t,n,a,s){let c=o.acquire();if(!c)return null;i++;let l=t.def.interceptor;return c.id=`IN-`+Md(i),c.battery=t,c.def=l,c.track=n,c.threat=n.threat,c.pos.copy(a),c.vel.copy(s).multiplyScalar(32),c.age=0,c.phase=`boost`,c.alive=!0,c.minDist=1e9,c.emitAcc=0,c.weaveSeed=e.rng.next()*10,c.flickerSeed=e.vrng.next()*20,c.threat.engagedBy++,u(c.mesh,l),c.mesh.group.visible=!0,c.mesh.group.position.copy(c.pos),c.mesh.flame.material.color.setHex(l.flame),c.trail=e.effects.acquireTrail({color:16183524,life:9,opacity:.85,emissive:.14}),e.effects.launchBlast(a,s,t.id===`sentinel`?1.9:t.id===`thaad`?1.25:1),r.push(c),c},clear(){for(let e of[...r])f(e,!1)},update(t){for(let n of[...r]){n.age+=t;let r=n.def,i=n.threat,a=i&&i.alive,o=null;if(a){let e=Ud(n.pos,i.pos,i.vel,Math.max(r.avgSpeed,n.vel.length()),90,i.dragK);e?(n.lastPredict.copy(e.point),n.predictT=e.t,c.subVectors(e.point,n.pos).normalize(),o=c):(c.subVectors(i.pos,n.pos).normalize(),o=c)}let u=a?n.pos.distanceTo(i.pos):1e9;if(n.phase===`boost`){let i=s.copy(n.vel).normalize();n.vel.addScaledVector(i,r.accel*t),o&&n.age>.55&&Wd(n.vel,o,r.turnRate*.55,t),n.vel.y-=Id*.4*t,n.age>=r.boostTime&&(n.phase=`guide`,e.effects.muzzlePuff(n.pos,1.15),e.effects.flash(n.pos,6,.16,16768174))}else{let e=n.vel.length();if(e<r.maxSpeed&&n.vel.multiplyScalar(1+X(r.accel*.35*t/e,0,.05)),n.vel.y-=Id*.25*t,o){let e=n.vel.length()+(a?i.vel.length():0),o=u<Math.max(700,e*.9);n.phase=o?`terminal`:`guide`;let l=r.turnRate*(o?1.9:1);if(!o){let e=X((u-1200)/2600,0,1),t=Math.sin(n.age*1.7+n.weaveSeed)*.06*e;c.applyAxisAngle(s.set(0,1,0),t*.5)}Wd(n.vel,c,l,t)}}let p=n.vel.length();p>r.maxSpeed&&n.vel.multiplyScalar(r.maxSpeed/p),n.pos.addScaledVector(n.vel,t),n.mesh.group.position.copy(n.pos),l.copy(n.pos).add(n.vel),n.mesh.group.lookAt(l);let m=n.phase===`boost`,h=.84+.16*Math.sin(n.age*41+n.flickerSeed)*Math.sin(n.age*13.7+n.flickerSeed*2.3);n.mesh.flame.material.opacity=m?.95*h:.32;let g=n.pos.distanceTo(e.camera.position);if(n.mesh.flame.scale.setScalar((m?7*(.88+.2*h):2.6)*X(.7+g*.004,.8,8)),n.emitAcc+=t,n.emitAcc>.03&&n.trail){n.emitAcc=0;let e=X(n.pos.y/6500,0,1),t=X(n.age*2.2,.15,1),i=r.trailWidth*(m?2.8:1.35)*(.6+e*1.1)*t;n.trail.emit(n.pos,i,m?1:.5+e*.3)}if(a){if(u<r.killRadius){d(n,u);continue}if(u<500){s.subVectors(i.pos,n.pos);let e=i.vel.x-n.vel.x,a=i.vel.y-n.vel.y,o=i.vel.z-n.vel.z,c=e*e+a*a+o*o,l=s.x*e+s.y*a+s.z*o,u=c>1e-6?-l/c:-1;if(u>0&&u<=t*1.5){let e=s.lengthSq()-l*l/c,t=Math.sqrt(Math.max(e,0));if(t<r.killRadius*2.2){n.pos.addScaledVector(n.vel,u),n.mesh.group.position.copy(n.pos),d(n,t);continue}}}if(u<n.minDist)n.minDist=u;else if(n.minDist<260&&u>n.minDist+14){n.minDist<r.killRadius*2.2?d(n,n.minDist):(e.effects.explosionAir(n.pos,.5),e.events.emit(`intercept-miss`,{interceptor:n,threat:i,reason:`CLOSEST APPROACH `+Math.round(n.minDist)+` m — NO FUZE`}),f(n,!1));continue}}else if(n.age>1.2){e.effects.explosionAir(n.pos,.45),e.events.emit(`interceptor-expended`,{interceptor:n}),f(n,!1);continue}(n.age>80||n.pos.y<-5)&&(e.events.emit(`intercept-miss`,{interceptor:n,threat:i,reason:`INTERCEPTOR EXPENDED`}),f(n))}}}}var yf=`
attribute vec3 aVel;
attribute vec3 aAcc;
attribute float aBirth;
attribute float aLife;
attribute float aSize0;
attribute float aSize1;
attribute float aAlpha;
attribute float aRot;
attribute float aRotVel;
attribute vec3 aCol0;
attribute vec3 aCol1;
uniform float uTime;
uniform float uScale;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
void main() {
  float age = uTime - aBirth;
  float t = age / max(aLife, 0.0001);
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vCol = vec3(0.0);
    vRot = 0.0;
    return;
  }
  vec3 pos = position + aVel * age + 0.5 * aAcc * age * age;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = mix(aSize0, aSize1, pow(t, 0.65));
  gl_PointSize = clamp(size * uScale / max(-mv.z, 0.5), 0.75, 300.0);
  float fadeIn = smoothstep(0.0, 0.07, t);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, t);
  // fade puffs that drift right up to the camera so they never become
  // screen-filling blobs (drifting launch smoke passing over the player)
  float nearFade = smoothstep(2.5, 18.0, -mv.z);
  vAlpha = aAlpha * fadeIn * fadeOut * nearFade;
  vCol = mix(aCol0, aCol1, pow(t, 0.55));
  vRot = aRot + age * aRotVel;
  gl_Position = projectionMatrix * mv;
}
`,bf=`
precision mediump float;
uniform sampler2D uMap;
uniform vec3 uTint;
varying float vAlpha;
varying vec3 vCol;
varying float vRot;
void main() {
  float cs = cos(vRot), sn = sin(vRot);
  vec2 pc = gl_PointCoord - 0.5;
  vec2 uv = vec2(pc.x * cs - pc.y * sn, pc.x * sn + pc.y * cs) + 0.5;
  vec4 tex = texture2D(uMap, uv);
  float a = tex.a * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * tex.rgb * uTint, a);
}
`,xf=class{constructor(e,t,n,r){this.capacity=n,this.cursor=0;let i=new kr,a=e=>{let t=new mr(new Float32Array(n*e),e);return t.setUsage(He),t};this.attrs={position:a(3),aVel:a(3),aAcc:a(3),aBirth:a(1),aLife:a(1),aSize0:a(1),aSize1:a(1),aAlpha:a(1),aRot:a(1),aRotVel:a(1),aCol0:a(3),aCol1:a(3)},this.attrs.aBirth.array.fill(-1e9);for(let[e,t]of Object.entries(this.attrs))i.setAttribute(e,t);i.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uScale:{value:720},uMap:{value:t},uTint:{value:new G(1,1,1)}};let o=new Jo({vertexShader:yf,fragmentShader:bf,uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:r?2:1});this.points=new ta(i,o),this.points.frustumCulled=!1,this.points.renderOrder=r?20:19,e.add(this.points),this._c0=new G,this._c1=new G,this.rand=new bd(65261)}spawn(e,t){let n=this.cursor;this.cursor=(this.cursor+1)%this.capacity;let r=this.attrs;r.position.setXYZ(n,t.pos.x,t.pos.y,t.pos.z),r.aVel.setXYZ(n,t.vel?.x??0,t.vel?.y??0,t.vel?.z??0),r.aAcc.setXYZ(n,t.acc?.x??0,t.acc?.y??0,t.acc?.z??0),r.aBirth.setX(n,e+(t.delay??0)),r.aLife.setX(n,t.life??1),r.aSize0.setX(n,t.size0??1),r.aSize1.setX(n,t.size1??2),r.aAlpha.setX(n,t.alpha??1),r.aRot.setX(n,t.rot??this.rand.next()*6.283),r.aRotVel.setX(n,t.rotVel??(this.rand.next()-.5)*1.4),this._c0.set(t.col0??16777215),this._c1.set(t.col1??t.col0??16777215),r.aCol0.setXYZ(n,this._c0.r,this._c0.g,this._c0.b),r.aCol1.setXYZ(n,this._c1.r,this._c1.g,this._c1.b),this.dirty=!0}commit(){if(this.dirty){this.dirty=!1;for(let e of Object.values(this.attrs))e.needsUpdate=!0}}setTime(e){this.uniforms.uTime.value=e}setViewport(e,t){this.uniforms.uScale.value=e/(2*Math.tan(t*Math.PI/360))}parkAll(){this.attrs.aBirth.array.fill(-1e9),this.attrs.aBirth.needsUpdate=!0}},Sf=`
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
`,Cf=`
precision mediump float;
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
`,wf=class{constructor(e,t){this.capacity=t,this.cursor=0;let n=new kr,r=e=>{let n=new mr(new Float32Array(t*4*e),e);return n.setUsage(He),n};this.attrs={position:r(3),aVel:r(3),aAcc:r(3),aBirth:r(1),aLife:r(1),aWidth:r(1),aLen:r(1),aAlpha:r(1),aCol0:r(3),aCol1:r(3)},this.attrs.aBirth.array.fill(-1e9);for(let[e,t]of Object.entries(this.attrs))n.setAttribute(e,t);let i=new mr(new Float32Array(t*4*2),2);for(let e=0;e<t;e++)i.array.set([-1,-1,-1,1,1,-1,1,1],e*8);n.setAttribute(`aCorner`,i);let a=new Uint16Array(t*6);for(let e=0;e<t;e++){let t=e*4;a.set([t,t+1,t+2,t+1,t+3,t+2],e*6)}n.setIndex(new mr(a,1)),n.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uScale:{value:720}};let o=new Jo({vertexShader:Sf,fragmentShader:Cf,uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:2,side:2});this.mesh=new K(n,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=21,e.add(this.mesh),this._c0=new G,this._c1=new G}spawn(e,t){let n=this.cursor;this.cursor=(this.cursor+1)%this.capacity;let r=this.attrs;this._c0.set(t.col0??16777215),this._c1.set(t.col1??t.col0??16777215);let i=n*4;for(let n=0;n<4;n++)r.position.setXYZ(i+n,t.pos.x,t.pos.y,t.pos.z),r.aVel.setXYZ(i+n,t.vel?.x??0,t.vel?.y??0,t.vel?.z??0),r.aAcc.setXYZ(i+n,t.acc?.x??0,t.acc?.y??0,t.acc?.z??0),r.aBirth.setX(i+n,e+(t.delay??0)),r.aLife.setX(i+n,t.life??1),r.aWidth.setX(i+n,t.width??.5),r.aLen.setX(i+n,t.len??6),r.aAlpha.setX(i+n,t.alpha??1),r.aCol0.setXYZ(i+n,this._c0.r,this._c0.g,this._c0.b),r.aCol1.setXYZ(i+n,this._c1.r,this._c1.g,this._c1.b);this.dirty=!0}commit(){if(this.dirty){this.dirty=!1;for(let e of Object.values(this.attrs))e.needsUpdate=!0}}setTime(e){this.uniforms.uTime.value=e}setViewport(e,t){this.uniforms.uScale.value=e/(2*Math.tan(t*Math.PI/360))}parkAll(){this.attrs.aBirth.array.fill(-1e9),this.attrs.aBirth.needsUpdate=!0}},Tf=`
attribute vec3 aOther;
attribute float aSide;
attribute float aDirSign;
attribute float aBirth;
attribute float aOtherBirth;
attribute float aWidth;
attribute float aFade;
uniform float uTime;
uniform float uLife;
uniform vec3 uWind;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
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
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,Ef=`
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uEmissive;
uniform sampler2D uNoise;
varying float vT;
varying float vU;
varying float vFade;
varying float vSeed;
void main() {
  float edge = 1.0 - abs(vU * 2.0 - 1.0);
  edge = pow(edge, 1.4);
  float fade = pow(1.0 - vT, 1.15);
  float n = texture2D(uNoise, vec2(vSeed * 8.0 + vT * 2.0, vU * 0.8 + vSeed)).r;
  float a = edge * fade * uOpacity * vFade * (0.45 + 0.55 * n);
  // lit smoke goes dim under dark skies (night) so ribbons don't read as
  // bright tubes; emissive trails (plasma, exhaust glow) keep their alpha
  float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
  a *= mix(mix(0.5, 1.0, smoothstep(0.05, 0.85, tl)), 1.0, uEmissive);
  if (a < 0.004) discard;
  // smoke is lit by the environment (uTint); emissive trails ignore it
  vec3 col = uColor * mix(uTint, vec3(1.0), uEmissive);
  gl_FragColor = vec4(col, a);
}
`,Df=140,Of=class{constructor(e,t){let n=Df,r=new kr,i=e=>{let t=new mr(new Float32Array(560*e),e);return t.setUsage(He),t};this.aPos=i(3),this.aOther=i(3),this.aSide=i(1),this.aDirSign=i(1),this.aBirth=i(1),this.aOtherBirth=i(1),this.aWidth=i(1),this.aFade=i(1),this.aBirth.array.fill(-1e9),this.aOtherBirth.array.fill(-1e9),r.setAttribute(`position`,this.aPos),r.setAttribute(`aOther`,this.aOther),r.setAttribute(`aSide`,this.aSide),r.setAttribute(`aDirSign`,this.aDirSign),r.setAttribute(`aBirth`,this.aBirth),r.setAttribute(`aOtherBirth`,this.aOtherBirth),r.setAttribute(`aWidth`,this.aWidth),r.setAttribute(`aFade`,this.aFade);let a=new Uint16Array(840);for(let e=0;e<n;e++){let t=e*4;a.set([t,t+1,t+2,t+1,t+3,t+2],e*6)}r.setIndex(new mr(a,1)),r.boundingSphere=new xr(new W,1e7),this.uniforms={uTime:{value:0},uLife:{value:10},uWind:{value:new W},uColor:{value:new G(16777215)},uOpacity:{value:.7},uTint:{value:new G(1,1,1)},uEmissive:{value:.1},uNoise:{value:t}};let o=new Jo({vertexShader:Tf,fragmentShader:Ef,uniforms:this.uniforms,transparent:!0,depthWrite:!1,side:2});this.mesh=new K(r,o),this.mesh.frustumCulled=!1,this.mesh.renderOrder=18,this.mesh.visible=!1,e.add(this.mesh),this.cursor=0,this.hasPrev=!1,this.prev=new W,this.prevBirth=0,this.prevWidth=1}configure({color:e=16777215,life:t=10,opacity:n=.7,emissive:r=.1}){this.uniforms.uColor.value.set(e),this.uniforms.uLife.value=t,this.uniforms.uOpacity.value=n,this.uniforms.uEmissive.value=r,this.mesh.visible=!0}reset(){this.aBirth.array.fill(-1e9),this.aOtherBirth.array.fill(-1e9),this.aBirth.needsUpdate=!0,this.aOtherBirth.needsUpdate=!0,this.hasPrev=!1,this.cursor=0,this.mesh.visible=!1}emit(e,t,n=1){let r=this.uniforms.uTime.value;if(!this.hasPrev){this.hasPrev=!0,this.prev.copy(e),this.prevBirth=r,this.prevWidth=t;return}let i=this.cursor;this.cursor=(this.cursor+1)%Df;let a=i*4;for(let i=0;i<2;i++)this.aPos.setXYZ(a+i,e.x,e.y,e.z),this.aOther.setXYZ(a+i,this.prev.x,this.prev.y,this.prev.z),this.aDirSign.setX(a+i,-1),this.aBirth.setX(a+i,r),this.aOtherBirth.setX(a+i,this.prevBirth),this.aWidth.setX(a+i,t),this.aFade.setX(a+i,n);for(let t=2;t<4;t++)this.aPos.setXYZ(a+t,this.prev.x,this.prev.y,this.prev.z),this.aOther.setXYZ(a+t,e.x,e.y,e.z),this.aDirSign.setX(a+t,1),this.aBirth.setX(a+t,this.prevBirth),this.aOtherBirth.setX(a+t,r),this.aWidth.setX(a+t,this.prevWidth),this.aFade.setX(a+t,n);this.aSide.setX(a,-1),this.aSide.setX(a+1,1),this.aSide.setX(a+2,-1),this.aSide.setX(a+3,1);for(let e of[this.aPos,this.aOther,this.aSide,this.aDirSign,this.aBirth,this.aOtherBirth,this.aWidth,this.aFade])e.needsUpdate=!0;this.prev.copy(e),this.prevBirth=r,this.prevWidth=t}};function kf(){let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,0.30)`),n.addColorStop(.42,`rgba(255,255,255,0.08)`),n.addColorStop(.62,`rgba(255,255,255,0.22)`),n.addColorStop(.72,`rgba(255,255,255,0.95)`),n.addColorStop(.82,`rgba(255,255,255,0.25)`),n.addColorStop(1,`rgba(255,255,255,0.0)`),t.fillStyle=n,t.fillRect(0,0,128,128),new ia(e)}function Af(){let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.26,`rgba(255,250,235,0.96)`),n.addColorStop(.48,`rgba(255,228,175,0.55)`),n.addColorStop(.72,`rgba(255,190,120,0.18)`),n.addColorStop(1,`rgba(255,160,80,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.globalCompositeOperation=`lighter`,n=t.createLinearGradient(0,60,128,68),n.addColorStop(0,`rgba(255,230,180,0)`),n.addColorStop(.5,`rgba(255,240,210,0.55)`),n.addColorStop(1,`rgba(255,230,180,0)`),t.fillStyle=n,t.fillRect(0,56,128,16),t.fillRect(56,0,16,128),new ia(e)}function jf(){let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`);for(let[e,n,r,i]of[[64,64,46,.92],[46,52,27,.8],[82,54,26,.8],[56,82,25,.75],[80,80,22,.7],[64,42,22,.7],[42,70,20,.65]]){let a=t.createRadialGradient(e,n,0,e,n,r);a.addColorStop(0,`rgba(255,255,255,${i})`),a.addColorStop(.55,`rgba(255,255,255,${i*.66})`),a.addColorStop(.85,`rgba(255,255,255,${i*.18})`),a.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=a,t.fillRect(0,0,128,128)}return new ia(e)}function Mf(){let e=document.createElement(`canvas`);e.width=128,e.height=128;let t=e.getContext(`2d`);for(let[e,n,r,i]of[[64,64,54,.95],[46,52,30,.7],[82,56,30,.7],[58,82,28,.65],[78,80,24,.6]]){let a=t.createRadialGradient(e,n,0,e,n,r);a.addColorStop(0,`rgba(255,255,255,${i})`),a.addColorStop(.45,`rgba(255,244,220,${i*.75})`),a.addColorStop(.8,`rgba(255,220,170,${i*.22})`),a.addColorStop(1,`rgba(255,200,140,0)`),t.fillStyle=a,t.fillRect(0,0,128,128)}return new ia(e)}function Nf(e){let{scene:t,textures:n}=e,r=n.noiseTex(),i=Mf(),a=Af(),o=new xf(t,jf(),6144,!1),s=new xf(t,i,4096,!0),c=new wf(t,2048),l=new Sd(()=>new Of(t,r),30),u=new Sd(()=>{let e=new Yr(new Fr({map:a,color:16777215,transparent:!0,opacity:0,blending:2,depthWrite:!1}));return e.renderOrder=23,e.visible=!1,t.add(e),{sprite:e,t:0,dur:.3,size:10,active:!1}},16),d=[],f=kf(),p=new Sd(()=>{let e=new Yr(new Fr({map:f,color:16777215,transparent:!0,opacity:0,blending:2,depthWrite:!1}));return e.renderOrder=22,e.visible=!1,t.add(e),{sprite:e,t:0,dur:1,maxR:40,active:!1}},6),m=[],h=new Oi(new Lo(.5),new J({color:4867650,roughness:.9,metalness:.2,emissive:16738850,emissiveIntensity:0}),128);h.instanceMatrix.setUsage(He),h.frustumCulled=!1,t.add(h);let g=[];for(let e=0;e<128;e++)g.push({alive:!1,pos:new W,vel:new W,rot:new cn,angVel:new W,scale:1,life:0,age:0,glow:0,trailT:0,trailAcc:0,sizeK:1});let _=new Zt,v=new Dt,y=new W,b=new W(1e-4,1e-4,1e-4),x=new Sd(()=>{let e=new K(new Fo(.8,1,56),new ai({color:16769208,transparent:!0,opacity:0,side:2,depthWrite:!1,blending:2}));return e.rotation.x=-Math.PI/2,e.visible=!1,t.add(e),{mesh:e,t:0,dur:1,maxR:30,active:!1}},8),S=[],C=new Sd(()=>{let e=new K(new Po(1,1),new ai({map:n.scorch(),transparent:!0,opacity:0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-4}));return e.rotation.x=-Math.PI/2,e.renderOrder=3,e.visible=!1,t.add(e),{mesh:e,age:0,active:!1}},12),w=[],T=0,E=new W,D=new W,O=new W,k=new G(1,1,1);function A(t,n){let r=n*X(1-t.distanceTo(e.camera.position)/900,0,1);r>.02&&e.player?.addShake(r)}function j(e,t,n=.25,r=16773848){let i=u.acquire();if(!i)return;let a=t*te(e);i.sprite.position.copy(e),i.sprite.material.color.set(r),i.sprite.material.opacity=1,i.sprite.scale.setScalar(a*.4),i.sprite.visible=!0,i.t=0,i.dur=n,i.size=a,i.active=!0,d.push(i)}function M(e,t,n=.9,r=16767400){let i=p.acquire();i&&(i.sprite.position.copy(e),i.sprite.material.color.set(r),i.sprite.material.opacity=.9,i.sprite.scale.setScalar(t*.1),i.sprite.visible=!0,i.t=0,i.dur=n,i.maxR=t,i.active=!0,m.push(i))}function N(e,t,n=.9,r=16769208){let i=x.acquire();i&&(i.mesh.position.set(e.x,Math.max(ef(e.x,e.z),0)+.35,e.z),i.mesh.scale.setScalar(.5),i.mesh.material.color.set(r),i.mesh.material.opacity=.6,i.mesh.visible=!0,i.t=0,i.dur=n,i.maxR=t,i.active=!0,S.push(i))}function ee(t,n){let r=C.acquire();r&&(r.mesh.position.set(t.x,Math.max(ef(t.x,t.z),0)+.06,t.z),r.mesh.scale.setScalar(n),r.mesh.rotation.z=e.vrng.next()*Z,r.mesh.material.opacity=.85,r.mesh.visible=!0,r.age=0,r.active=!0,w.push(r))}function te(t){return X(.5+t.distanceTo(e.camera.position)*.0022,1,12)}function P(t,n,r,i=.6,a=0){let o=te(t),s=0;for(let c of g){if(c.alive)continue;c.alive=!0,c.pos.copy(t);let l=e.vrng.next()*Z,u=e.vrng.range(.15,1);if(c.vel.set(Math.cos(l),0,Math.sin(l)).multiplyScalar(r*e.vrng.range(.3,1)*Math.sqrt(1-u*u)),c.vel.y=r*u*e.vrng.range(.5,1.1),c.angVel.set(e.vrng.range(-8,8),e.vrng.range(-8,8),e.vrng.range(-8,8)),c.rot.set(e.vrng.next()*3,e.vrng.next()*3,e.vrng.next()*3),c.scale=e.vrng.range(.3,1.1)*(1+(o-1)*.4),c.life=e.vrng.range(2.5,5),c.age=0,c.glow=i,c.trailT=a>0?a*e.vrng.range(.75,1.25):0,c.trailAcc=e.vrng.range(0,.05),c.sizeK=o,++s>=n)break}}function ne(t,n,r=1){let i=Math.max(ef(t.x,t.z),0),a=.7+.45*r;j(t,30*r,.18,16774876),j(t,20*r,.5,16754254);let l=Math.round(12*a);for(let i=0;i<l;i++)D.set(e.vrng.gauss(),e.vrng.gauss()*.6,e.vrng.gauss()).normalize().multiplyScalar(e.vrng.range(26,58)*r).addScaledVector(n,e.vrng.range(8,26)*r),O.copy(D).multiplyScalar(-2.2),c.spawn(T,{pos:t,vel:D,acc:O,life:e.vrng.range(.12,.3),width:e.vrng.range(.3,.6)*r,len:e.vrng.range(4,10)*r,alpha:.95,col0:16775133,col1:16750648});P(E.copy(t).addScaledVector(n,2.5),3+Math.round(2*r),17*r,.15);let u=Math.round(24*a);for(let i=0;i<u;i++)E.copy(n).multiplyScalar(-e.vrng.range(3,26)*r).add(t),s.spawn(T,{pos:E,vel:D.set(e.vrng.range(-4,4),e.vrng.range(-2,5),e.vrng.range(-4,4)).addScaledVector(n,-e.vrng.range(7,22)),acc:{x:0,y:4,z:0},life:e.vrng.range(.25,.75),size0:4*r,size1:11*r,alpha:.92,col0:16773316,col1:16742954,rotVel:e.vrng.range(-4,4)});let d=Math.round(42*a);for(let n=0;n<d;n++){E.set(t.x+e.vrng.range(-2.5,2.5)*r,i+e.vrng.range(.4,4),t.z+e.vrng.range(-2.5,2.5)*r);let n=e.vrng.next()*Z;o.spawn(T,{pos:E,vel:{x:Math.cos(n)*e.vrng.range(1.5,8)*r+e.world.wind.x*.3,y:e.vrng.range(.5,2.6),z:Math.sin(n)*e.vrng.range(1.5,8)*r+e.world.wind.z*.3},acc:{x:e.world.wind.x*.22,y:e.vrng.range(.05,.3),z:e.world.wind.z*.22},life:e.vrng.range(4,12),size0:e.vrng.range(2,3.6)*r,size1:e.vrng.range(10,17)*r,alpha:e.vrng.range(.26,.5),col0:14538442,col1:9341054,delay:e.vrng.range(0,.4),rotVel:e.vrng.range(-.8,.8)})}let f=Math.round(26*a);for(let n=0;n<f;n++){let a=n/f*Z;E.set(t.x+Math.cos(a)*2*r,i+.4,t.z+Math.sin(a)*2*r),o.spawn(T,{pos:E,vel:{x:Math.cos(a)*e.vrng.range(12,24)*r,y:e.vrng.range(.6,2.2),z:Math.sin(a)*e.vrng.range(12,24)*r},acc:{x:0,y:-.6,z:0},life:e.vrng.range(1.2,2.8),size0:2*r,size1:10*r,alpha:.5,col0:13350288,col1:10324584})}let p=Math.round(22*a);for(let n=0;n<p;n++){let a=n/p*Z+e.vrng.range(-.12,.12);E.set(t.x+Math.cos(a)*3.4*r,i+.7,t.z+Math.sin(a)*3.4*r),o.spawn(T,{pos:E,vel:{x:Math.cos(a)*e.vrng.range(3.5,8)*r+e.world.wind.x*.25,y:e.vrng.range(.2,1),z:Math.sin(a)*e.vrng.range(3.5,8)*r+e.world.wind.z*.25},acc:{x:e.world.wind.x*.12,y:-.35,z:e.world.wind.z*.12},life:e.vrng.range(3.5,8),size0:2.6*r,size1:e.vrng.range(12,18)*r,alpha:.38,col0:13218444,col1:9075296,delay:e.vrng.range(.1,.5),rotVel:e.vrng.range(-.6,.6)})}N(t,26*r,.8),A(t,.55*r),e.events.emit(`fx-launch`,{pos:t.clone(),scale:r})}function re(t,n=1){let r=t.y-Math.max(ef(t.x,t.z),0)>500,i=te(t);j(t,44*n,.22,16777215),j(t,28*n,.55,16753994),M(t,(r?62:36)*n*Math.max(i*.45,1),r?1.15:.7,r?12375807:16767400);let a=(10+i*6)*n,l=Math.round(30*Math.min(n,1.6));for(let r=0;r<l;r++)E.set(t.x+e.vrng.gauss()*a,t.y+e.vrng.gauss()*a,t.z+e.vrng.gauss()*a),D.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).multiplyScalar(16*n),O.copy(D).multiplyScalar(-1.05),O.y+=5,s.spawn(T,{pos:E,vel:D,acc:O,life:e.vrng.range(.45,1.1),size0:4.5*n*i,size1:e.vrng.range(9,15)*n*i,alpha:.95,col0:16774874,col1:16734746,delay:e.vrng.range(0,.12),rotVel:e.vrng.range(-3.5,3.5)});let u=Math.round(14*Math.min(n,1.6));for(let r=0;r<u;r++)E.set(t.x+e.vrng.gauss()*a*.8,t.y+e.vrng.gauss()*a*.8,t.z+e.vrng.gauss()*a*.8),D.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).multiplyScalar(11*n),O.copy(D).multiplyScalar(-.9),o.spawn(T,{pos:E,vel:D,acc:O,life:e.vrng.range(.5,1),size0:5*n*i,size1:e.vrng.range(11,16)*n*i,alpha:.85,col0:16774106,col1:10259574,rotVel:e.vrng.range(-2.5,2.5)});let d=(12+i*8)*n,f=Math.round(24*Math.min(n,1.6));for(let r=0;r<f;r++)E.set(t.x+e.vrng.gauss()*d,t.y+e.vrng.gauss()*d,t.z+e.vrng.gauss()*d),D.set(e.vrng.gauss(),e.vrng.gauss()*.8+.4,e.vrng.gauss()).multiplyScalar(8*n),O.copy(D).multiplyScalar(-.42),O.y+=1.1,o.spawn(T,{pos:E,vel:D,acc:O,life:e.vrng.range(1.6,3.4),size0:5*n*i,size1:e.vrng.range(12,19)*n*i,alpha:.7,col0:7033152,col1:3683117,delay:e.vrng.range(.08,.3),rotVel:e.vrng.range(-1.6,1.6)});let p=r?30:24,m=(16+i*18)*n;for(let a=0;a<p;a++){E.set(t.x+e.vrng.gauss()*m,t.y+e.vrng.gauss()*m*.85,t.z+e.vrng.gauss()*m);let s=!(a&1),c=e.vrng.range(21,36)*n*i;o.spawn(T,{pos:E,vel:{x:e.vrng.gauss()*2+e.world.wind.x*.4,y:e.vrng.gauss()*1.4+.5,z:e.vrng.gauss()*2+e.world.wind.z*.4},acc:{x:e.world.wind.x*.18,y:.22,z:e.world.wind.z*.18},life:e.vrng.range(r?7:5,r?16:11),size0:c*.55,size1:c,alpha:e.vrng.range(.5,.75),col0:s?4538169:6051149,col1:s?2828325:3617582,delay:e.vrng.range(.1,.7),rotVel:e.vrng.range(-.5,.5)})}let h=Math.round(60*Math.min(n,1.5));for(let r=0;r<h;r++)D.set(e.vrng.gauss(),e.vrng.gauss(),e.vrng.gauss()).normalize().multiplyScalar(e.vrng.range(34,95)*n),O.set(-D.x*.55,-D.y*.55-30,-D.z*.55),c.spawn(T,{pos:t,vel:D,acc:O,life:e.vrng.range(.5,1.6),width:e.vrng.range(.28,.55)*n,len:e.vrng.range(5,13)*n,alpha:.95,col0:16773828,col1:16740394});let g=Math.round(10*Math.min(n,1.5));for(let r=0;r<g;r++)s.spawn(T,{pos:t,vel:D.set(e.vrng.gauss()*7,e.vrng.gauss()*5-3,e.vrng.gauss()*7),acc:{x:0,y:-9,z:0},life:e.vrng.range(.9,2.1),size0:1.4*n*i,size1:.4,alpha:.9,col0:16761466,col1:16726536});r?P(t,9,26*n,1,e.vrng.range(1.2,2)):P(t,Math.round(12*n),44*n,1,.5),A(t,.5*n),e.events.emit(`fx-explosion`,{pos:t.clone(),scale:n,air:!0})}function ie(t,n=1){let r=Math.max(ef(t.x,t.z),0),i=E.set(t.x,r+1.5,t.z).clone(),a=Math.sqrt(te(i));j(i,54*n,.26,16777215),j(i,34*n,.6,16752714),D.set(i.x,r+7*n,i.z),M(D,48*n*a,.85,16764822);let l=Math.round(36*Math.min(n,1.7));for(let t=0;t<l;t++)E.set(i.x+e.vrng.gauss()*8*n,r+e.vrng.range(.5,7)*n,i.z+e.vrng.gauss()*8*n),s.spawn(T,{pos:E,vel:D.set(e.vrng.gauss()*9,e.vrng.range(14,44),e.vrng.gauss()*9).multiplyScalar(n),acc:{x:0,y:-7,z:0},life:e.vrng.range(.45,1.5),size0:7*n*a,size1:22*n*a,alpha:.95,col0:16773312,col1:14241558,rotVel:e.vrng.range(-3,3)});let u=Math.round(56*Math.min(n,1.6));for(let t=0;t<u;t++)D.set(e.vrng.gauss()*24,e.vrng.range(28,88),e.vrng.gauss()*24).multiplyScalar(n),O.set(-D.x*.4,-38,-D.z*.4),c.spawn(T,{pos:i,vel:D,acc:O,life:e.vrng.range(.7,2),width:e.vrng.range(.3,.6)*n,len:e.vrng.range(8,18)*n,alpha:.95,col0:16773828,col1:16740394});let d=Math.round(16*Math.min(n,1.7));for(let t=0;t<d;t++)E.set(i.x+e.vrng.gauss()*6*n,r+e.vrng.range(1,6)*n,i.z+e.vrng.gauss()*6*n),D.set(e.vrng.gauss()*6,e.vrng.range(7,18),e.vrng.gauss()*6).multiplyScalar(n),O.copy(D).multiplyScalar(-.55),o.spawn(T,{pos:E,vel:D,acc:O,life:e.vrng.range(.8,2),size0:8*n*a,size1:24*n*a,alpha:.8,col0:16773330,col1:9272420,rotVel:e.vrng.range(-2.5,2.5)});let f=Math.round(60*Math.min(n,1.7));for(let t=0;t<f;t++){let s=e.vrng.range(1,18)*n;E.set(i.x+e.vrng.gauss()*(9+s*.9)*n,r+s,i.z+e.vrng.gauss()*(9+s*.9)*n);let c=t%3==0,l=e.vrng.range(24,40)*n*a;o.spawn(T,{pos:E,vel:{x:e.vrng.gauss()*2.8+e.world.wind.x*.3,y:e.vrng.range(4,30)*n,z:e.vrng.gauss()*2.8+e.world.wind.z*.3},acc:{x:e.world.wind.x*.3,y:-.8,z:e.world.wind.z*.3},life:e.vrng.range(6,15),size0:l*.45,size1:l,alpha:e.vrng.range(.45,.66),col0:c?3354153:4866617,col1:c?2039068:2828325,delay:e.vrng.range(0,.9),rotVel:e.vrng.range(-.7,.7)})}let p=Math.round(14*Math.min(n,1.7));for(let t=0;t<p;t++)E.set(i.x+e.vrng.gauss()*18*n,r+e.vrng.range(30,52)*n,i.z+e.vrng.gauss()*18*n),o.spawn(T,{pos:E,vel:{x:e.vrng.gauss()*3.5+e.world.wind.x*.45,y:e.vrng.range(1.5,4.5),z:e.vrng.gauss()*3.5+e.world.wind.z*.45},acc:{x:e.world.wind.x*.2,y:-.12,z:e.world.wind.z*.2},life:e.vrng.range(7,15),size0:9*n*a,size1:e.vrng.range(26,42)*n*a,alpha:e.vrng.range(.38,.55),col0:4998203,col1:3025704,delay:e.vrng.range(1.2,2.8),rotVel:e.vrng.range(-.4,.4)});let m=Math.round(10*Math.min(n,1.6));for(let t=0;t<m;t++)E.set(i.x+e.vrng.gauss()*2*n,r+e.vrng.range(1,6)*n,i.z+e.vrng.gauss()*2*n),s.spawn(T,{pos:E,vel:{x:0,y:e.vrng.range(4,9)*n,z:0},life:e.vrng.range(.7,1.5),size0:6*n*a,size1:12*n*a,alpha:.35,col0:16745524,col1:9580040,delay:.15});let h=Math.round(60*Math.min(n,1.7));for(let t=0;t<h;t++){let s=t/h*Z+e.vrng.range(-.1,.1);E.set(i.x+Math.cos(s)*3*n,r+e.vrng.range(.5,3.5),i.z+Math.sin(s)*3*n),o.spawn(T,{pos:E,vel:{x:Math.cos(s)*e.vrng.range(16,38)*n,y:e.vrng.range(.6,3.2),z:Math.sin(s)*e.vrng.range(16,38)*n},acc:{x:-Math.cos(s)*2.4*n,y:-.9,z:-Math.sin(s)*2.4*n},life:e.vrng.range(4,9),size0:4.5*n*a,size1:e.vrng.range(17,28)*n*a,alpha:e.vrng.range(.5,.68),col0:11047007,col1:6312767,delay:e.vrng.range(0,.15),rotVel:e.vrng.range(-.8,.8)})}P(i,Math.round(28*n),60*n,1,.8),N(i,62*n,1),N(i,100*n,2.2,14270618),ee(i,15*n),A(i,.8*n),e.events.emit(`fx-explosion`,{pos:i.clone(),scale:n,air:!1})}function ae(t,n){for(let r=0;r<6;r++)s.spawn(T,{pos:t,vel:D.copy(n).multiplyScalar(20).add(E.set(e.vrng.gauss()*5,e.vrng.gauss()*5,e.vrng.gauss()*5)),life:.4,size0:1.5,size1:.4,alpha:.9,col0:16767392,col1:16746544});for(let r=0;r<5;r++)D.copy(n).multiplyScalar(e.vrng.range(16,30)).add(E.set(e.vrng.gauss()*6,e.vrng.gauss()*6,e.vrng.gauss()*6)),c.spawn(T,{pos:t,vel:D,acc:{x:0,y:-14,z:0},life:e.vrng.range(.25,.5),width:.25,len:3.5,alpha:.85,col0:16771516,col1:16746544});P(t,2,16,0)}function F(t,n=1){for(let r=0;r<8;r++)o.spawn(T,{pos:t,vel:{x:e.vrng.gauss()*3,y:e.vrng.range(.8,2.6),z:e.vrng.gauss()*3},acc:{x:e.world.wind.x*.2,y:.3,z:e.world.wind.z*.2},life:e.vrng.range(1.2,3),size0:1.4*n,size1:6.5*n,alpha:.35,col0:14077891,col1:9341054,rotVel:e.vrng.range(-1.2,1.2)})}let I={acquireTrail(e){let t=l.acquire();return t?(t.reset(),t.configure(e),t.uniforms.uTime.value=T,t):null},releaseTrail(e){e&&oe.push({t:e,until:T+e.uniforms.uLife.value+.5})},launchBlast:ne,explosionAir:re,explosionGround:ie,coverPop:ae,muzzlePuff:F,flash:j,ring:N,scorchAt:ee,throwDebris:P,update(t,n){T=n;for(let e of l.used)e.uniforms.uTime.value=T;for(let e of l.free)e.uniforms.uTime.value=T;for(let e=oe.length-1;e>=0;e--)if(oe[e].until<=T){let{t}=oe[e];t.reset(),l.release(t),oe.splice(e,1)}let r=e.world.trailTint;o.uniforms.uTint.value.copy(r??k);for(let t of l.used)t.uniforms.uWind.value.copy(e.world.wind),r&&t.uniforms.uTint.value.copy(r);for(let e=d.length-1;e>=0;e--){let n=d[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.sprite.visible=!1,n.active=!1,d.splice(e,1),u.release(n);continue}n.sprite.scale.setScalar(n.size*(.4+r*.9)),n.sprite.material.opacity=(1-r)**1.6}for(let e=m.length-1;e>=0;e--){let n=m[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.sprite.visible=!1,n.active=!1,m.splice(e,1),p.release(n);continue}let i=Td(r);n.sprite.scale.setScalar(Math.max(n.maxR*i,1.2)*2.8),n.sprite.material.opacity=.9*(1-r)**1.6}for(let e=S.length-1;e>=0;e--){let n=S[e];n.t+=t;let r=n.t/n.dur;if(r>=1){n.mesh.visible=!1,n.active=!1,S.splice(e,1),x.release(n);continue}n.mesh.scale.setScalar(.5+Td(r)*n.maxR),n.mesh.material.opacity=.55*(1-r)**1.7}for(let e=w.length-1;e>=0;e--){let n=w[e];if(n.age+=t,n.age>70){n.mesh.visible=!1,n.active=!1,w.splice(e,1),C.release(n);continue}n.age>50&&(n.mesh.material.opacity=.85*(1-(n.age-50)/20))}for(let n=0;n<128;n++){let r=g[n];if(!r.alive){_.compose(r.pos,v.identity(),b),h.setMatrixAt(n,_);continue}r.age+=t,r.vel.y-=22*t,r.pos.addScaledVector(r.vel,t),r.rot.x+=r.angVel.x*t,r.rot.y+=r.angVel.y*t,r.rot.z+=r.angVel.z*t,r.trailT>0&&r.age<r.trailT&&(r.trailAcc+=t,r.trailAcc>.07&&(r.trailAcc=0,o.spawn(T,{pos:r.pos,vel:{x:e.vrng.gauss()*.7,y:e.vrng.range(.2,.9),z:e.vrng.gauss()*.7},acc:{x:e.world.wind.x*.15,y:.35,z:e.world.wind.z*.15},life:e.vrng.range(.8,1.7),size0:(.9*r.scale+.4)*r.sizeK,size1:4.5*r.sizeK,alpha:.32,col0:10130314,col1:5656649,rotVel:e.vrng.range(-1,1)}),r.glow>.5&&s.spawn(T,{pos:r.pos,life:.22,size0:1.8*r.sizeK,size1:.5,alpha:.9,col0:16767392,col1:16734740})));let i=Math.max(ef(r.pos.x,r.pos.z),0);r.pos.y<i+.2&&(r.pos.y=i+.2,Math.abs(r.vel.y)>4?(r.vel.y*=-.32,r.vel.x*=.55,r.vel.z*=.55):(r.vel.set(0,0,0),r.angVel.multiplyScalar(.8))),r.age>r.life&&(r.alive=!1);let a=r.scale*X(1-Math.max(0,r.age-r.life+.5)*2,.001,1);v.setFromEuler(r.rot),_.compose(r.pos,v,y.setScalar(a)),h.setMatrixAt(n,_)}h.instanceMatrix.needsUpdate=!0,h.count=128,o.setTime(T),s.setTime(T),c.setTime(T),o.commit(),s.commit(),c.commit()},setViewport(e,t){o.setViewport(e,t),s.setViewport(e,t),c.setViewport(e,t)},clearAll(){for(let e of[...d])e.sprite.visible=!1,u.release(e);d.length=0;for(let e of[...m])e.sprite.visible=!1,p.release(e);m.length=0;for(let e of[...S])e.mesh.visible=!1,x.release(e);S.length=0;for(let e of g)e.alive=!1;for(let{t:e}of oe)e.reset(),l.release(e);oe.length=0,o.parkAll(),s.parkAll(),c.parkAll()}},oe=[];return I}var Pf=9e3,Ff=7e3,If={hostile:16732992,decoy:13215487,intc:3662079,assigned:16765527,select:16777215},Lf={hostile:`#ff6a55`,decoy:`#c9a6ff`,intc:`#37e0ff`,assigned:`#ffd257`,phos:`#7df0ac`},Rf={x:0,z:0,t:0};function zf(e,t){let n=(t.y+Math.sqrt(t.y*t.y+2*Id*Math.max(0,e.y)))/Id;return Rf.x=e.x+t.x*n,Rf.z=e.z+t.z*n,Rf.t=n,Rf}function Bf(e){let{textures:t}=e,n=[],r=new Map,i=0,a=null,o=document.createElement(`canvas`);o.width=928,o.height=512;let s=o.getContext(`2d`),c=new ia(o);c.colorSpace=Ie,e.base?.consoleScreen&&(e.base.consoleScreen.material=new ai({map:c,toneMapped:!1}));let l=`"Consolas","Menlo","DejaVu Sans Mono",monospace`,u=(()=>{let e=document.createElement(`canvas`);e.width=928,e.height=512;let t=e.getContext(`2d`);t.fillStyle=`rgba(0,0,0,0.10)`;for(let e=14;e<498;e+=3)t.fillRect(14,e,900,1);let n=t.createRadialGradient(258,256,117.7,258,256,214*1.35);n.addColorStop(0,`rgba(0,0,0,0)`),n.addColorStop(1,`rgba(0,0,0,0.28)`),t.fillStyle=n,t.fillRect(14,14,500,484);let r=t.createLinearGradient(0,0,928,512);r.addColorStop(.1,`rgba(190,255,225,0)`),r.addColorStop(.2,`rgba(190,255,225,0.030)`),r.addColorStop(.28,`rgba(190,255,225,0)`),t.fillStyle=r,t.fillRect(14,14,900,484),t.fillStyle=`#111613`,t.beginPath(),t.rect(0,0,928,512),t.rect(12,12,904,488),t.fill(`evenodd`),t.strokeStyle=`rgba(150,255,200,0.16)`,t.strokeRect(12.5,12.5,903,487),t.strokeStyle=`rgba(0,0,0,0.65)`,t.strokeRect(1.5,1.5,925,509),t.strokeStyle=`rgba(255,255,255,0.05)`,t.strokeRect(.5,.5,927,511),t.font=`9px ${l}`;for(let[e,n]of[[6.5,6.5],[921.5,6.5],[6.5,505.5],[921.5,505.5]])t.fillStyle=`#20261f`,t.beginPath(),t.arc(e,n,3.4,0,Z),t.fill(),t.strokeStyle=`rgba(0,0,0,0.7)`,t.lineWidth=1,t.beginPath(),t.moveTo(e-2.2,n-2.2),t.lineTo(e+2.2,n+2.2),t.stroke();return t.fillStyle=`#39443c`,t.textAlign=`center`,t.fillText(`IVX-9 · P43 PHOSPHOR SCOPE · FICTIONAL TRAINER`,464,508.5),e})(),d=!1,f=new En,p=.78/Pf,m=.78/Ff;e.base?.holoAnchor&&e.base.holoAnchor.add(f);{let e=new K(new la(.8,64),new ai({color:336942,transparent:!0,opacity:.6,depthWrite:!1}));e.rotation.x=-Math.PI/2,f.add(e);for(let e=0;e<3;e++){let t=new K(new Fo(.26*e+.004,.26*(e+1)-.004,64),new ai({color:941166,transparent:!0,opacity:e%2?.05:.11,side:2,depthWrite:!1,blending:2}));t.rotation.x=-Math.PI/2,t.position.y=.0015,t.renderOrder=1,f.add(t)}for(let e=1;e<=3;e++){let t=[];for(let n=0;n<=72;n++){let r=n/72*Z;t.push(new W(Math.cos(r)*.26*e,.002,Math.sin(r)*.26*e))}let n=new Gi(new kr().setFromPoints(t),new Li({color:4183788,transparent:!0,opacity:e===3?.85:.42}));n.renderOrder=2,f.add(n)}{let e=[];for(let t=0;t<24;t++){let n=t/24*Z,r=t%6==0?.73:.76;e.push(new W(Math.cos(n)*r,.002,Math.sin(n)*r)),e.push(new W(Math.cos(n)*.795,.002,Math.sin(n)*.795))}let t=new Yi(new kr().setFromPoints(e),new Li({color:3066078,transparent:!0,opacity:.5}));t.renderOrder=2,f.add(t)}for(let e=0;e<8;e++){let t=e/8*Z,n=[new W(0,.002,0),new W(Math.cos(t)*.78,.002,Math.sin(t)*.78)];f.add(new Gi(new kr().setFromPoints(n),new Li({color:1735820,transparent:!0,opacity:.22})))}let n=new K(new ua(.8,.8,.46,64,1,!0),new ai({color:1873068,transparent:!0,opacity:.02,side:2,depthWrite:!1,blending:2}));n.position.y=.23,n.renderOrder=1,f.add(n);let r=(e,n,r,i,a)=>{let o=new K(new Po(i,i),new ai({map:t.label(e,{fg:`#7fe8f8`,w:64,h:64,font:`bold 44px Arial`}),transparent:!0,depthWrite:!1,opacity:a}));o.rotation.x=-Math.PI/2,o.position.set(n,.004,r),f.add(o)};r(`N`,0,-.87,.075,1),r(`E`,.87,0,.055,.55),r(`S`,0,.87,.055,.55),r(`W`,-.87,0,.055,.55);let i=new K(new No(.014),new ai({color:10482687}));i.position.y=.006,f.add(i)}let h=new En;f.add(h);{let e=(e,t)=>{let n=new K(e,t);return n.rotation.x=-Math.PI/2,n.position.y=.004,n.renderOrder=3,h.add(n),n},t=.78,n=[0,0,0],r=[0,0,0];for(let e=0;e<=40;e++){let i=e/40,a=-1.15+i*1.15;n.push(Math.cos(a)*t,Math.sin(a)*t,0);let o=i*i*i;r.push(o,o,o)}let i=[];for(let e=1;e<=40;e++)i.push(0,e,e+1);let a=new kr;a.setIndex(i),a.setAttribute(`position`,new _r(n,3)),a.setAttribute(`color`,new _r(r,3)),e(a,new ai({color:3074303,vertexColors:!0,transparent:!0,opacity:.42,side:2,depthWrite:!1,blending:2})),e(new la(t,10,-.09,.09),new ai({color:6746879,transparent:!0,opacity:.42,side:2,depthWrite:!1,blending:2}));let o=new Gi(new kr().setFromPoints([new W(.04,0,0),new W(t,0,0)]),new Li({color:11074559,transparent:!0,opacity:.85}));o.rotation.x=-Math.PI/2,o.position.y=.005,o.renderOrder=3,h.add(o)}let g=(e,t=!1)=>{let n=new En,r=t?new q(.02,.02,.02):new No(.018),i=new K(r,new ai({color:e}));i.renderOrder=4,n.add(i);let a=new K(r,new ai({color:e,transparent:!0,opacity:.4,depthWrite:!1,blending:2}));a.scale.setScalar(1.9),a.renderOrder=4,n.add(a);let o=new K(new Io(.06,8,6),new ai({visible:!1}));n.add(o);let s=new Gi(new kr().setFromPoints([new W,new W(0,1,0)]),new Li({color:e,transparent:!0,opacity:.42}));n.add(s);let c=new K(new Fo(.02,.026,20),new ai({color:e,transparent:!0,opacity:.6,side:2,depthWrite:!1}));c.rotation.x=-Math.PI/2,c.renderOrder=3,n.add(c);let l=new K(new Fo(.032,.038,24),new ai({color:16777215,transparent:!0,opacity:.9,side:2,depthWrite:!1}));l.rotation.x=-Math.PI/2,l.visible=!1,l.renderOrder=3,n.add(l);let u=new Gi(new kr().setFromPoints([new W,new W]),new Li({color:e,transparent:!0,opacity:.8}));return u.renderOrder=3,u.visible=!t,n.add(u),n.visible=!1,f.add(n),{grp:n,core:i,halo:a,hit:o,stem:s,ringM:c,sel:l,vel:u}},_=Array.from({length:10},()=>g(If.hostile)),v=Array.from({length:12},()=>g(If.intc,!0)),y=Array.from({length:10},()=>{let e=new En,t=new ai({color:If.hostile,transparent:!0,opacity:.75,depthWrite:!1,side:2});for(let n of[Math.PI/4,-Math.PI/4]){let r=new K(new Po(.06,.01),t);r.rotation.set(-Math.PI/2,0,n),r.renderOrder=3,e.add(r)}let n=new K(new Fo(.03,.034,20),t);return n.rotation.x=-Math.PI/2,n.renderOrder=3,e.add(n),e.visible=!1,e.position.y=.003,f.add(e),{grp:e,mat:t}}),b=Array.from({length:12},()=>{let e=document.createElement(`canvas`);e.width=128,e.height=40;let t=e.getContext(`2d`),n=new ia(e);n.colorSpace=Ie;let r=new Yr(new Fr({map:n,transparent:!0,depthTest:!1,depthWrite:!1,opacity:.98}));return r.scale.set(.2,.062,1),r.renderOrder=10,r.visible=!1,f.add(r),{spr:r,lg:t,tex:n,key:``}});function x(e,t,n){let r=t+`|`+n;e.key!==r&&(e.key=r,e.lg.clearRect(0,0,128,40),e.lg.fillStyle=`rgba(2,10,9,0.8)`,e.lg.fillRect(10,4,108,32),e.lg.strokeStyle=`rgba(140,240,220,0.3)`,e.lg.strokeRect(10.5,4.5,107,31),e.lg.font=`bold 21px ${l}`,e.lg.textAlign=`center`,e.lg.textBaseline=`middle`,e.lg.fillStyle=n,e.lg.fillText(t,64,21),e.tex.needsUpdate=!0)}let S=Array.from({length:12},()=>{let e=new Gi(new kr().setFromPoints([new W,new W]),new Li({color:If.intc,transparent:!0,opacity:.28,depthWrite:!1}));return e.renderOrder=3,e.visible=!1,f.add(e),e}),C=new K(new Fo(.05,.057,32),new ai({color:16777215,transparent:!0,opacity:.8,side:2,depthWrite:!1}));C.rotation.x=-Math.PI/2,C.position.y=.005,C.renderOrder=3,C.visible=!1,f.add(C),e.events.on(`threat-spawned`,({threat:e})=>{i++;let t={id:`TK-`+Md(i),threat:e,detected:!1,firstSeen:-1,classified:`SEARCHING`,quality:0,assignedBattery:null,engagedBy:0,history:[],lastPing:-99,gone:!1,outcome:null};n.push(t),r.set(e,t)});let w=(t,n)=>{let i=r.get(t);i&&(i.gone=!0,i.outcome=n,i.goneAt=e.time.now,a===i.id&&(a=null),r.delete(t))};e.events.on(`threat-destroyed`,({threat:e})=>w(e,`DESTROYED`)),e.events.on(`threat-impact`,({threat:e})=>w(e,`IMPACT`));let T=0;function E(t,n){let r=t.threat;if(!t.detected)return;let i=e.time.now-t.firstSeen;t.quality=X(t.quality+n*.25,0,1),t.classified=r.isDecoy&&(i>11||r.pos.y<2600)?`DECOY (P)`:i>3?`BALLISTIC`:`ACQUIRING`}let D=(e,t)=>[258+e/Pf*214,256+t/Pf*214];function O(e,t,n,r,i,a=1.6){s.beginPath(),s.moveTo(e,t-n),s.lineTo(e+n,t),s.lineTo(e,t+n),s.lineTo(e-n,t),s.closePath(),r?(s.fillStyle=i,s.fill()):(s.strokeStyle=i,s.lineWidth=a,s.stroke())}function k(e,t,n,r,i=1.6){s.strokeStyle=r,s.lineWidth=i,s.beginPath(),s.moveTo(e-n,t-n),s.lineTo(e+n,t+n),s.moveTo(e+n,t-n),s.lineTo(e-n,t+n),s.stroke()}function A(e,t,n,r,i=1.4){let a=n*.45;s.strokeStyle=r,s.lineWidth=i,s.beginPath(),s.moveTo(e-n+a,t-n),s.lineTo(e-n,t-n),s.lineTo(e-n,t-n+a),s.moveTo(e+n-a,t-n),s.lineTo(e+n,t-n),s.lineTo(e+n,t-n+a),s.moveTo(e-n+a,t+n),s.lineTo(e-n,t+n),s.lineTo(e-n,t+n-a),s.moveTo(e+n-a,t+n),s.lineTo(e+n,t+n),s.lineTo(e+n,t+n-a),s.stroke()}function j(e,t,n,r,i){s.fillStyle=`rgba(3,17,11,0.96)`,s.fillRect(e,t,n,r),s.strokeStyle=`rgba(110,240,170,0.26)`,s.lineWidth=1,s.strokeRect(e+.5,t+.5,n-1,r-1),i&&(s.fillStyle=`rgba(125,240,172,0.66)`,s.font=`10px ${l}`,s.textAlign=`left`,s.fillText(i,e+9,t+14),s.strokeStyle=`rgba(110,240,170,0.18)`,s.beginPath(),s.moveTo(e+8,t+19.5),s.lineTo(e+n-8,t+19.5),s.stroke())}let M=e=>e>=1e3?(e/1e3).toFixed(1)+`km`:Math.round(e)+`m`,N=(e,t)=>Math.round((Math.atan2(e,-t)*180/Math.PI+360)%360),ee=0;function te(){let t=e.time.now;d||(d=!0,s.fillStyle=`#020f0a`,s.fillRect(0,0,928,512)),s.textAlign=`left`,s.textBaseline=`alphabetic`,s.fillStyle=`rgba(2,15,10,0.16)`,s.fillRect(0,0,928,512),s.save(),s.beginPath(),s.arc(258,256,214,0,Z),s.clip(),s.fillStyle=`rgba(6,27,17,0.10)`,s.fillRect(44,42,428,428),s.restore(),s.lineWidth=1;for(let e=1;e<=4;e++)s.strokeStyle=e===4?`rgba(80,240,160,0.55)`:`rgba(60,220,140,0.26)`,s.beginPath(),s.arc(258,256,214*e/4,0,Z),s.stroke();s.strokeStyle=`rgba(80,240,160,0.30)`,s.beginPath(),s.arc(258,256,210,0,Z),s.stroke(),s.strokeStyle=`rgba(60,220,140,0.13)`;for(let e=0;e<12;e++){let t=e/12*Z;s.beginPath(),s.moveTo(258+Math.cos(t)*12,256+Math.sin(t)*12),s.lineTo(258+Math.cos(t)*214,256+Math.sin(t)*214),s.stroke()}s.strokeStyle=`rgba(80,240,160,0.5)`;for(let e=0;e<36;e++){let t=e/36*Z,n=e%9==0?10:5;s.beginPath(),s.moveTo(258+Math.cos(t)*(214-n),256+Math.sin(t)*(214-n)),s.lineTo(258+Math.cos(t)*214,256+Math.sin(t)*214),s.stroke()}s.strokeStyle=`rgba(159,243,200,0.8)`,s.beginPath(),s.moveTo(253,256),s.lineTo(263,256),s.moveTo(258,251),s.lineTo(258,261),s.stroke(),s.font=`bold 12px ${l}`,s.textAlign=`center`,s.fillStyle=`rgba(159,243,200,0.85)`,s.fillText(`N`,258,66),s.fillStyle=`rgba(159,243,200,0.45)`,s.fillText(`E`,450,260),s.fillText(`S`,258,454),s.fillText(`W`,66,260),s.font=`10px ${l}`,s.textAlign=`left`,s.fillStyle=`rgba(140,240,180,0.55)`;for(let e=1;e<=4;e++){let t=214*e/4*.7071;s.fillText(`${(Pf*e/4/1e3).toFixed(1)}`,258+t+3,256-t+11)}s.fillText(`km`,412.3194,126.6806);let r=-(e.base?.radarHead?e.base.radarHead.rotation.y:0)+Math.PI/2;if(s.save(),s.beginPath(),s.arc(258,256,212,0,Z),s.clip(),s.globalCompositeOperation=`lighter`,s.translate(258,256),s.rotate(r),s.createConicGradient){let e=s.createConicGradient(0,0,0),t=1.45/Z;e.addColorStop(0,`rgba(110,255,175,0.30)`),e.addColorStop(t*.35,`rgba(90,245,160,0.115)`),e.addColorStop(t,`rgba(70,235,150,0)`),e.addColorStop(1,`rgba(70,235,150,0)`),s.fillStyle=e,s.beginPath(),s.arc(0,0,214,0,Z),s.fill()}else for(let e=0;e<10;e++)s.fillStyle=`rgba(90,245,160,${.16*(1-e/10)*(1-e/10)})`,s.beginPath(),s.moveTo(0,0),s.arc(0,0,214,e*.145,(e+1)*.145),s.closePath(),s.fill();if(s.strokeStyle=`rgba(190,255,215,0.9)`,s.lineWidth=2,s.beginPath(),s.moveTo(0,0),s.lineTo(214,0),s.stroke(),s.strokeStyle=`rgba(255,255,255,0.35)`,s.lineWidth=4,s.beginPath(),s.moveTo(10,0),s.lineTo(214,0),s.stroke(),s.restore(),s.strokeStyle=`#9ff3c8`,s.lineWidth=1.2,s.strokeRect(254,252,8,8),e.batteries?.list){s.font=`bold 10px ${l}`;for(let t of e.batteries.list){let e=t.rig.group.position,n=Math.hypot(e.x,e.z)||1,r=Math.max(n/Pf*214,21),i=258+e.x/n*r,a=256+e.z/n*r,o=t.displayState;s.fillStyle=o===`READY`?`rgba(142,240,180,0.95)`:o===`EMPTY`?`rgba(255,106,85,0.95)`:`rgba(255,210,87,0.95)`,s.beginPath(),s.moveTo(i,a-4.6),s.lineTo(i+4.2,a+3.4),s.lineTo(i-4.2,a+3.4),s.closePath(),s.fill(),s.fillText(t.def.name[0],i+6,a+3)}}let i=a?n.find(e=>e.id===a&&!e.gone):null;for(let e of n){if(e.gone||!e.detected)continue;let n=e.threat,[r,o]=D(n.pos.x,n.pos.z),c=e.classified.startsWith(`DECOY`),u=c?Lf.decoy:e.assignedBattery?Lf.assigned:Lf.hostile;for(let n of e.history){let e=t-(n[2]??t),r=Math.max(0,1-e/14)*.34;if(r<=.01)continue;let[i,a]=D(n[0],n[1]);s.fillStyle=`rgba(130,255,180,${r.toFixed(3)})`,s.fillRect(i-1,a-1,2,2)}let d=zf(n.pos,n.vel);if(Math.hypot(d.x,d.z)<Pf){let[t,n]=D(d.x,d.z);k(t,n,4.4,c?`rgba(201,166,255,0.6)`:`rgba(255,140,110,0.8)`,1.4),s.strokeStyle=c?`rgba(201,166,255,0.35)`:`rgba(255,140,110,0.45)`,s.lineWidth=1,s.beginPath(),s.arc(t,n,7.5,0,Z),s.stroke(),e===i&&(s.setLineDash([3,5]),s.strokeStyle=`rgba(255,255,255,0.30)`,s.beginPath(),s.moveTo(r,o),s.lineTo(t,n),s.stroke(),s.setLineDash([]))}let f=Math.hypot(n.vel.x,n.vel.z);if(f>1){let e=X(f*.045,9,34);s.strokeStyle=u,s.lineWidth=1.6,s.beginPath(),s.moveTo(r,o),s.lineTo(r+n.vel.x/f*e,o+n.vel.z/f*e),s.stroke()}if(s.save(),s.shadowColor=u,s.shadowBlur=9,O(r,o,6.5,!c,u,1.8),s.restore(),s.font=`bold 15px ${l}`,s.textAlign=`left`,s.fillStyle=`#eafff2`,s.fillText(e.id,r+11,o-5),s.font=`11px ${l}`,s.fillStyle=`rgba(215,255,232,0.72)`,s.fillText(`${(n.pos.y/1e3).toFixed(1)}km ${c?`◇`:`◆`}`,r+11,o+9),e.id===a){s.strokeStyle=`#ffffff`,s.lineWidth=1.6,s.beginPath(),s.arc(r,o,12.5,0,Z),s.stroke(),s.beginPath();for(let e=0;e<4;e++){let n=e/4*Z+t*.9;s.moveTo(r+Math.cos(n)*12.5,o+Math.sin(n)*12.5),s.lineTo(r+Math.cos(n)*17,o+Math.sin(n)*17)}s.stroke()}e.assignedBattery&&A(r,o,11,Lf.assigned,1.6)}for(let t of e.interceptors?.active??[]){let[e,n]=D(t.pos.x,t.pos.z);if(t.threat?.alive){let[r,i]=D(t.threat.pos.x,t.threat.pos.z);s.strokeStyle=`rgba(55,224,255,0.30)`,s.lineWidth=1,s.setLineDash([2,4]),s.beginPath(),s.moveTo(e,n),s.lineTo(r,i),s.stroke(),s.setLineDash([])}s.save(),s.shadowColor=Lf.intc,s.shadowBlur=7,s.fillStyle=Lf.intc,s.fillRect(e-3,n-3,6,6),s.restore(),s.font=`10px ${l}`,s.fillStyle=`rgba(55,224,255,0.75)`,s.fillText(t.id,e+6,n-4)}let o=n.filter(e=>!e.gone&&e.detected);if(s.font=`bold 17px ${l}`,s.textAlign=`left`,s.fillStyle=`#baf7d4`,s.fillText(`IVX-9 SURVEILLANCE`,520,40),t%1<.55&&(s.fillStyle=`rgba(186,247,212,0.8)`,s.fillRect(752,28,8,13)),s.font=`11px ${l}`,s.fillStyle=`rgba(186,247,212,0.66)`,s.fillText(`MODE TBM · RNG ${(Pf/1e3).toFixed(0)} KM · SWP 8.1 RPM`,520,58),s.strokeStyle=`rgba(110,240,170,0.3)`,s.beginPath(),s.moveTo(520,68.5),s.lineTo(914,68.5),s.stroke(),j(520,78,394,100,`BATTERIES`),e.batteries?.list){let t=100;for(let n of e.batteries.list){let e=n.displayState,r=e===`READY`?Lf.phos:e===`EMPTY`?Lf.hostile:Lf.assigned;s.fillStyle=r,s.beginPath(),s.moveTo(535,t-4.5),s.lineTo(539,t+3),s.lineTo(531,t+3),s.closePath(),s.fill(),s.font=`bold 12px ${l}`,s.fillStyle=`#d9ffe9`,s.fillText(n.def.name,547,t+4),s.font=`11px ${l}`,s.fillStyle=r,s.fillText(e+(e===`RELOADING`?` ${Math.ceil(Math.max(0,n.readyIn))}s`:``),670,t+4),s.textAlign=`right`,s.fillStyle=`rgba(142,240,180,0.8)`,s.fillText(`▮`.repeat(n.ammo)+`▯`.repeat(Math.max(0,n.def.ammo-n.ammo)),904,t+4),s.textAlign=`left`,t+=26}}if(j(520,186,394,148,`TRACK DATA`),i){let e=i.threat,t=i.classified.startsWith(`DECOY`),n=t?Lf.decoy:i.assignedBattery?Lf.assigned:Lf.hostile;s.font=`bold 20px ${l}`,s.fillStyle=n,s.fillText(`${t?`◇`:`◆`} ${i.id}`,532,218),s.font=`bold 12px ${l}`,s.fillText(i.classified,650,218),s.strokeStyle=`rgba(142,240,180,0.4)`,s.strokeRect(782.5,206.5,112,9),s.fillStyle=`rgba(142,240,180,0.75)`,s.fillRect(784,208,109*X(i.quality,.05,1),6),s.font=`9px ${l}`,s.fillStyle=`rgba(142,240,180,0.6)`,s.fillText(`TRK QUAL`,782,202);let r=zf(e.pos,e.vel),a=[[`ALT`,M(e.pos.y)],[`RNG`,M(Math.hypot(e.pos.x,e.pos.z))],[`SPD`,`${Math.round(e.vel.length())}m/s`],[`BRG`,`${Md(N(e.pos.x,e.pos.z))}°`.padStart(4,`0`)],[`TTI`,`${Math.max(0,r.t).toFixed(0)}s`],[`V/S`,`${Math.round(e.vel.y)}m/s`]];s.font=`12px ${l}`;for(let e=0;e<a.length;e++){let t=532+e%2*190,n=244+Math.floor(e/2)*22;s.fillStyle=`rgba(142,240,180,0.55)`,s.fillText(a[e][0],t,n),s.fillStyle=`#eafff2`,s.fillText(a[e][1],t+44,n)}s.font=`11px ${l}`,i.assignedBattery?(s.fillStyle=Lf.assigned,s.fillText(`ASSIGNED → ${i.assignedBattery.toUpperCase()}`,532,322)):(s.fillStyle=`rgba(142,240,180,0.5)`,s.fillText(`NOT ASSIGNED`,532,322)),i.engagedBy>0&&(s.fillStyle=Lf.intc,s.fillText(`ENGAGED ×${i.engagedBy}`,722,322))}else s.font=`12px ${l}`,s.fillStyle=`rgba(142,240,180,0.45)`,s.fillText(`NO TRACK SELECTED`,532,250),s.font=`11px ${l}`,s.fillText(`SELECT FROM LIST OR TAP A HOLO BLIP`,532,270);j(520,342,394,74,`SYMBOLOGY`),s.font=`10px ${l}`,O(538,369,5,!0,Lf.hostile),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`HOSTILE`,548,372),O(626,369,5,!1,Lf.decoy,1.4),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`DECOY`,636,372),s.fillStyle=Lf.intc,s.fillRect(704,364,6,6),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`INTCPT`,714,372),k(782,369,4,`rgba(255,140,110,0.85)`,1.3),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`PRED IMPACT`,792,372),A(538,392,7,Lf.assigned,1.3),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`ASSIGNED`,552,396),s.strokeStyle=`#fff`,s.lineWidth=1.2,s.beginPath(),s.arc(634,392,6,0,Z),s.stroke(),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`SELECTED`,646,396),s.fillStyle=`rgba(130,255,180,0.5)`,s.fillRect(730,387,2,2),s.fillRect(735,389,2,2),s.fillRect(740,391,2,2),s.fillStyle=`rgba(215,255,232,0.8)`,s.fillText(`HISTORY`,748,396);let f=e.interceptors?.active.length??0,p=Math.floor(t/60),m=Math.floor(t%60);s.font=`bold 13px ${l}`,s.fillStyle=o.length?`#ffd257`:`rgba(186,247,212,0.75)`,s.fillText(`TRACKS ${Md(o.length)}`,520,442),s.fillStyle=f?Lf.intc:`rgba(186,247,212,0.45)`,s.fillText(`IN FLIGHT ${Md(f)}`,638,442),s.fillStyle=`rgba(186,247,212,0.6)`,s.fillText(`SIM ${Md(p)}:${Md(m)}`,778,442),s.font=`10px ${l}`,s.fillStyle=`rgba(140,240,180,0.4)`,s.fillText(`GAIN ▮▮▮▮▯ · MTI ON · CFAR AUTO`,520,462),s.font=`10px ${l}`,s.fillStyle=`rgba(140,240,180,0.5)`,s.fillText(`PPI-1 · NORTH-UP`,26,34),s.drawImage(u,0,0),c.needsUpdate=!0}let P=new W;function ne(){let t=e.time.now;h.rotation.y=(e.base?.radarHead?.rotation.y??0)-Math.PI/2;let r=0,i=null;for(let e of n){if(e.gone||!e.detected||r>=_.length)continue;let n=r,o=_[r++],s=e.threat,c=X(s.pos.x*p,-.8,.8),l=X(s.pos.z*p,-.8,.8),u=X(s.pos.y*m,0,.85);o.grp.visible=!0,o.grp.position.set(c,0,l),o.core.position.y=u,o.halo.position.y=u,o.halo.scale.setScalar(1.9+Math.sin(t*4+n*1.7)*.35),o.hit.position.y=u,o.stem.scale.set(1,Math.max(u,.001),1);let d=e.classified.startsWith(`DECOY`),f=d?If.decoy:e.assignedBattery?If.assigned:If.hostile;o.core.material.color.setHex(f),o.core.material.wireframe=d,o.halo.material.color.setHex(f),o.stem.material.color.setHex(f),o.ringM.material.color.setHex(f),o.ringM.material.opacity=.3+e.quality*.45,o.sel.visible=e.id===a,o.sel.visible&&(i=o.grp.position),o.hit.userData.trackId=e.id,o.core.userData.trackId=e.id;let h=Math.hypot(s.vel.x,s.vel.z);if(h>1){P.set(s.vel.x/h,0,s.vel.z/h);let e=X(h*16e-5,.035,.13),t=o.vel.geometry.attributes.position;t.setXYZ(0,P.x*.03,.004,P.z*.03),t.setXYZ(1,P.x*(.03+e),.004,P.z*(.03+e)),t.needsUpdate=!0,o.vel.material.color.setHex(f),o.vel.visible=!0}else o.vel.visible=!1;let g=y[n],v=zf(s.pos,s.vel),S=v.x*p,C=v.z*p,w=Math.hypot(S,C),T=w>.78;if(T&&(S*=.78/w,C*=.78/w),g.grp.visible=!0,g.grp.position.set(S,.003,C),g.mat.color.setHex(d?If.decoy:e.assignedBattery?If.assigned:If.hostile),g.mat.opacity=(T?.25:.68)+Math.sin(t*3.2+n)*.14,n<b.length){let t=b[n],r=d?Lf.decoy:e.assignedBattery?Lf.assigned:`#ffd7cf`;x(t,`${d?`◇`:`◆`} ${e.id}`,r),t.spr.position.set(c,u+.075,l),t.spr.visible=!0}}for(let e=r;e<_.length;e++)_[e].grp.visible=!1,y[e].grp.visible=!1;for(let e=r;e<b.length;e++)b[e].spr.visible=!1;if(i){let e=t%1.4/1.4;C.visible=!0,C.position.set(i.x,.005,i.z),C.scale.setScalar(.85+e*1.15),C.material.opacity=.85*(1-e)}else C.visible=!1;let o=0;for(let t of e.interceptors?.active??[]){if(o>=v.length)break;let e=o,n=v[o++],r=X(t.pos.x*p,-.8,.8),i=X(t.pos.z*p,-.8,.8),a=X(t.pos.y*m,0,.85);n.grp.visible=!0,n.grp.position.set(r,0,i),n.core.position.y=a,n.halo.position.y=a,n.hit.position.y=a,n.stem.scale.set(1,Math.max(a,.001),1);let s=S[e];if(t.threat?.alive){let e=t.threat.pos,n=s.geometry.attributes.position;n.setXYZ(0,r,a,i),n.setXYZ(1,X(e.x*p,-.8,.8),X(e.y*m,0,.85),X(e.z*p,-.8,.8)),n.needsUpdate=!0,s.visible=!0}else s.visible=!1}for(let e=o;e<v.length;e++)v[e].grp.visible=!1,S[e].visible=!1}return{tracks:n,screenTex:c,holo:f,get selectedTrackId(){return a},selectTrack(t){a=t,e.events.emit(`track-selected`,{id:t})},trackFor(e){return r.get(e)},getTrack(e){return n.find(t=>t.id===e&&!t.gone)},activeTracks(){return n.filter(e=>!e.gone&&e.detected)},pickTrack(e){let t=[];for(let e of _)e.grp.visible&&t.push(e.hit);let n=e.intersectObjects(t,!1);return n.length?n[0].object.userData.trackId:null},clear(){n.length=0,r.clear(),i=0,a=null},update(t){let r=e.base?.radarHead?e.base.radarHead.rotation.y%Z:0;for(let i of n){if(i.gone)continue;let n=i.threat;if(n.alive){if(i.detected)E(i,t),e.time.now-i.lastPing>1.2&&(i.lastPing=e.time.now,i.history.push([n.pos.x,n.pos.z,e.time.now]),i.history.length>10&&i.history.shift());else if(Math.hypot(n.pos.x,n.pos.z)<Pf){let t=Math.atan2(n.pos.x,n.pos.z),a=Ed(t-T),o=Ed(t-r);a>=0&&o<=0&&a-o<1.2&&(i.detected=!0,i.firstSeen=e.time.now,i.classified=`ACQUIRING`,e.events.emit(`threat-tracked`,{track:i}))}}}T=r;for(let t=n.length-1;t>=0;t--)n[t].gone&&e.time.now-n[t].goneAt>6&&n.splice(t,1);ee+=t,ee>.08&&(ee=0,te()),ne()}}}function Vf(e){let t=null,n=null,r=!1,i=!1,a=null,o=null;function s(){if(t||r)return!!t;try{t=new(window.AudioContext||window.webkitAudioContext),n=t.createDynamicsCompressor(),n.threshold.value=-18,n.knee.value=22,n.ratio.value=8;let r=t.createGain();return r.gain.value=e.settings.volume,n.connect(r),r.connect(t.destination),w._volNode=r,!0}catch{return!1}}function c(e=2,n=!1){let r=Math.floor(t.sampleRate*e),i=t.createBuffer(1,r,t.sampleRate),a=i.getChannelData(0),o=0;for(let e=0;e<r;e++){let t=Math.random()*2-1;n?(o=o*.96+t*.04,a[e]=o*6):a[e]=t}return i}let l=null,u=null,d=()=>l??=c(2,!1),f=()=>u??=c(3,!0);function p(t,n,r=60){let i=t?t.distanceTo(e.camera.position):0;return{gain:n*X(r/Math.max(i,r),.04,1),delay:X(i/340,0,8)}}function m(e,t,n,r,i,a=1e-4){e.gain.setValueAtTime(1e-4,t),e.gain.linearRampToValueAtTime(r,t+n),e.gain.exponentialRampToValueAtTime(Math.max(a,1e-4),t+n+i)}function h(e,r=1){if(!s())return;let{gain:i,delay:a}=p(e,.9*r,120),o=t.currentTime+a,c=t.createOscillator();c.type=`sine`,c.frequency.setValueAtTime(X(90*r,40,120),o),c.frequency.exponentialRampToValueAtTime(30,o+.9);let l=t.createGain();m(l,o,.005,i*.9,1.1),c.connect(l),l.connect(n),c.start(o),c.stop(o+1.4);let u=t.createBufferSource();u.buffer=d();let f=t.createBiquadFilter();f.type=`lowpass`,f.frequency.setValueAtTime(X(3200*r,800,5200),o),f.frequency.exponentialRampToValueAtTime(140,o+1.6);let h=t.createGain();m(h,o,.004,i,1.8),u.connect(f),f.connect(h),h.connect(n),u.start(o),u.stop(o+2.2)}function g(e,r=1){if(!s())return;let{gain:i,delay:a}=p(e,.75*r,90),o=t.currentTime+a,c=t.createBufferSource();c.buffer=f(),c.loop=!0;let l=t.createBiquadFilter();l.type=`bandpass`,l.frequency.setValueAtTime(160,o),l.frequency.exponentialRampToValueAtTime(900,o+.7),l.frequency.exponentialRampToValueAtTime(220,o+3.2),l.Q.value=.8;let u=t.createGain();u.gain.setValueAtTime(1e-4,o),u.gain.linearRampToValueAtTime(i,o+.25),u.gain.setValueAtTime(i,o+1.6),u.gain.exponentialRampToValueAtTime(1e-4,o+4.2),c.connect(l),l.connect(u),u.connect(n),c.start(o),c.stop(o+4.4);let h=t.createBufferSource();h.buffer=d();let g=t.createBiquadFilter();g.type=`highpass`,g.frequency.value=1800;let _=t.createGain();m(_,o,.02,i*.4,2.4),h.connect(g),g.connect(_),_.connect(n),h.start(o),h.stop(o+2.6)}function _(e=880,r=.09,i=.14,a=`square`){if(!s())return;let o=t.currentTime,c=t.createOscillator();c.type=a,c.frequency.value=e;let l=t.createGain();m(l,o,.005,i,r),c.connect(l),l.connect(n),c.start(o),c.stop(o+r+.1)}function v(e=3){if(!s())return;let r=t.currentTime;for(let i=0;i<e;i++){let e=t.createOscillator();e.type=`sawtooth`;let a=t.createGain(),o=r+i*.62;e.frequency.setValueAtTime(620,o),e.frequency.linearRampToValueAtTime(440,o+.42),a.gain.setValueAtTime(1e-4,o),a.gain.linearRampToValueAtTime(.16,o+.03),a.gain.setValueAtTime(.16,o+.4),a.gain.exponentialRampToValueAtTime(1e-4,o+.55);let s=t.createBiquadFilter();s.type=`lowpass`,s.frequency.value=2200,e.connect(s),s.connect(a),a.connect(n),e.start(o),e.stop(o+.6)}}function y(){if(!s())return;let e=t.currentTime,r=t.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(1240,e),r.frequency.exponentialRampToValueAtTime(880,e+.18);let i=t.createGain();m(i,e,.004,.1,.3),r.connect(i),i.connect(n),r.start(e),r.stop(e+.4)}function b(e){if(!s())return;let r=t.currentTime,i=t.createBufferSource();i.buffer=d(),i.playbackRate.value=.6+Math.random()*.25;let a=t.createBiquadFilter();a.type=`lowpass`,a.frequency.value=340+Math.random()*160;let o=t.createGain();m(o,r,.003,e?.11:.07,.09),i.connect(a),a.connect(o),o.connect(n),i.start(r),i.stop(r+.16)}function x(e,r){if(!s())return;let{gain:i,delay:a}=p(e,X(r/900,.2,.7),50),o=t.currentTime+a,c=t.createBufferSource();c.buffer=d();let l=t.createBiquadFilter();l.type=`bandpass`,l.frequency.setValueAtTime(2400,o),l.frequency.exponentialRampToValueAtTime(320,o+.8),l.Q.value=1.4;let u=t.createGain();m(u,o,.12,i,.7),c.connect(l),l.connect(u),u.connect(n),c.start(o),c.stop(o+1.1)}function S(){if(!s()||i)return;i=!0;let e=t.createBufferSource();e.buffer=f(),e.loop=!0,o=t.createBiquadFilter(),o.type=`bandpass`,o.frequency.value=300,o.Q.value=.4,a=t.createGain(),a.gain.value=.05,e.connect(o),o.connect(a),a.connect(n),e.start();let r=t.createOscillator();r.type=`sawtooth`,r.frequency.value=55;let c=t.createBiquadFilter();c.type=`lowpass`,c.frequency.value=180;let l=t.createGain();l.gain.value=0,r.connect(c),c.connect(l),l.connect(n),r.start(),w._humG=l}e.events.on(`fx-launch`,({pos:e,scale:t})=>g(e,t)),e.events.on(`fx-explosion`,({pos:e,scale:t})=>h(e,t)),e.events.on(`footstep`,({sprint:e})=>b(e)),e.events.on(`threat-tracked`,()=>{y()}),e.events.on(`scenario-started`,()=>v(3)),e.events.on(`threat-impact`,({onBase:e})=>{e&&v(2)}),e.events.on(`track-assigned`,()=>_(980,.07,.12)),e.events.on(`launch-authorized`,()=>{_(760,.09),setTimeout(()=>_(760,.09),140)}),e.events.on(`intercept-success`,()=>{_(1180,.1,.14,`sine`),setTimeout(()=>_(1560,.14,.14,`sine`),130)}),e.events.on(`intercept-miss`,()=>_(300,.3,.13,`sawtooth`)),e.events.on(`ui-click`,()=>_(1320,.04,.07,`sine`));let C=0,w={get muted(){return r},setMuted(t){r=t,w._volNode&&(w._volNode.gain.value=t?0:e.settings.volume)},setVolume(t){e.settings.volume=t,w._volNode&&!r&&(w._volNode.gain.value=t)},unlock(){s()&&(t.state===`suspended`&&t.resume().catch(()=>{}),S())},beep:_,klaxon:v,radarPing:y,boom:h,launchRoar:g,update(n){if(!t||!i)return;let r=e.world.wind.length();if(a&&(a.gain.value=X(.03+r*.012,.02,.14)),o&&(o.frequency.value=240+r*30),w._humG&&e.base?.generators?.length){let t=1e9;for(let n of e.base.generators)t=Math.min(t,n.position.distanceTo(e.camera.position));w._humG.gain.value=X(14/Math.max(t,6)*.09,0,.09)}if(C-=n,C<=0){for(let t of e.interceptors?.active??[])if(t.pos.distanceTo(e.camera.position)<320&&t.vel.length()>250){x(t.pos,t.vel.length()),C=1.4;break}}}};return w}var Hf=(e,t,n)=>{let r=document.createElement(e);return t&&(r.className=t),n!==void 0&&(r.innerHTML=n),r},Uf={hostile:`◆`,decoy:`◇`,interceptor:`■`},Wf={good:`✓`,bad:`✗`,warn:`▲`,info:`◆`},Gf={good:`✓ `,bad:`✗ `,warn:`◆ `};function Kf(e){let t=Hf(`div`);t.id=`hud`,document.body.appendChild(t),t.innerHTML=`
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
      <b>WASD</b> move &nbsp;<b>SHIFT</b> sprint &nbsp;<b>E</b> interact / assign<br/>
      <b>F</b> authorize launch &nbsp;<b>1·2·3</b> battery &nbsp;<b>TAB</b> console &nbsp;<b>H</b> settings
    </div>
    <div id="banner" aria-live="polite"></div>
    <div id="impact-flash"></div>
  `;let n=t.querySelector(`#threat-rows`),r=t.querySelector(`#battery-board`),i=t.querySelector(`#target-prompt`),a=t.querySelector(`#feed`),o=t.querySelector(`#status-strip`),s=t.querySelector(`#banner`),c=t.querySelector(`#impact-flash`),l=t.querySelector(`#aim-bracket`),u=l.querySelector(`.ab-id`),d=l.querySelector(`.ab-data`),f=Hf(`div`);f.id=`console-panel`,f.setAttribute(`role`,`dialog`),f.setAttribute(`aria-label`,`Fire direction console`),f.innerHTML=`
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
  `,document.body.appendChild(f);let p=Hf(`div`,`modal`);p.setAttribute(`role`,`dialog`),p.setAttribute(`aria-label`,`Engagement debrief`),p.innerHTML=`
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
  `,document.body.appendChild(p);let m=Hf(`div`,`modal`);m.setAttribute(`role`,`dialog`),m.setAttribute(`aria-label`,`Settings`),m.innerHTML=`
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
  `,document.body.appendChild(m);let h=Hf(`div`);h.id=`intro`,h.setAttribute(`role`,`button`),h.setAttribute(`aria-label`,`Click to take post`),h.innerHTML=`
    <h1>IRONVEIL RANGE</h1>
    <div class="tagline">INTEGRATED AIR-DEFENSE TEST SITE · FICTIONAL DEMO</div>
    <div class="enter">CLICK TO TAKE POST</div>
    <div class="controls">
      WASD move · SHIFT sprint · mouse look<br/>
      TAB or walk to the C2 shelter console to start a raid<br/>
      Look at a track: E assign battery · F authorize launch
    </div>
    <div class="safety">ENTERTAINMENT ONLY — ALL SYSTEM BEHAVIOR IS FICTIONALIZED</div>
  `,document.body.appendChild(h);let g=[[`day`,`DAY`,`full visibility`],[`sunset`,`SUNSET`,`low sun, long shadows`],[`night`,`NIGHT`,`floodlights + searchlights`]],_=f.querySelector(`#opt-time`);for(let[t,n,r]of g){let i=Hf(`button`,`copt`,`${n}<span class="d">${r}</span>`);i.dataset.id=t,i.setAttribute(`aria-label`,`${n} — ${r}`),i.addEventListener(`click`,()=>{re.setTimeOfDay?.(t),e.events.emit(`ui-click`)}),_.appendChild(i)}let v=f.querySelector(`#opt-scenario`);for(let t of Object.values(gf)){let n=Hf(`button`,`copt`,`${t.name}<span class="d">${t.desc}</span>`);n.dataset.id=t.id,n.setAttribute(`aria-label`,`${t.name} — ${t.desc}`),n.addEventListener(`click`,()=>{re.selectScenario?.(t.id),e.events.emit(`ui-click`)}),v.appendChild(n)}let y=f.querySelector(`#opt-battery`);for(let t of Object.values(pf)){let n=Hf(`button`,`copt`,`${t.name}<span class="d">${t.kind} · ${t.desc}</span>`);n.dataset.id=t.id,n.setAttribute(`aria-label`,`${t.name} — ${t.kind}`),n.addEventListener(`click`,()=>{re.selectBattery?.(t.id),e.events.emit(`ui-click`)}),y.appendChild(n)}let b=f.querySelector(`#btn-start`),x=f.querySelector(`#btn-assign`),S=f.querySelector(`#btn-authorize`),C=f.querySelector(`#btn-exit-console`),w=f.querySelector(`#track-list`),T=f.querySelector(`#engage-status`);b.addEventListener(`click`,()=>{re.start?.(),e.events.emit(`ui-click`)}),x.addEventListener(`click`,()=>{re.assign?.(),e.events.emit(`ui-click`)}),S.addEventListener(`click`,()=>{re.authorize?.(),e.events.emit(`ui-click`)}),C.addEventListener(`click`,()=>{re.exitConsole?.(),e.events.emit(`ui-click`)}),p.querySelector(`#db-restart`).addEventListener(`click`,()=>{ne(),re.restart?.()}),p.querySelector(`#db-console`).addEventListener(`click`,()=>{ne(),re.enterConsole?.()}),p.querySelector(`#db-close`).addEventListener(`click`,()=>{ne(),re.closeToRoam?.()});let E=m.querySelector(`#set-reduced`),D=m.querySelector(`#set-volume`),O=m.querySelector(`#set-mute`),k=m.querySelector(`#set-quality`);E.addEventListener(`change`,()=>re.setReducedMotion?.(E.checked)),D.addEventListener(`input`,()=>re.setVolume?.(parseFloat(D.value))),O.addEventListener(`change`,()=>re.setMuted?.(O.checked)),k.addEventListener(`change`,()=>re.setQuality?.(k.value)),m.querySelector(`#set-close`).addEventListener(`click`,()=>fe.showSettings(!1)),h.addEventListener(`click`,()=>{h.classList.add(`hidden`),re.enterGame?.()});function A(e,t=`info`,n=6){let r=Hf(`div`,`msg ${t}`,`<span class="ico">${Wf[t]??`◆`}</span><span class="txt">${e}</span>`);for(a.appendChild(r);a.children.length>5;)a.removeChild(a.firstChild);setTimeout(()=>r.classList.add(`fading`),n*1e3),setTimeout(()=>r.remove(),n*1e3+900)}let j=null;function M(e,t=`good`,n=``,r=2.6){s.className=t,s.innerHTML=`<span class="b-ico">${Gf[t]??``}</span>${e}${n?`<span class="sub">${n}</span>`:``}`,s.style.opacity=`1`,s.offsetWidth,s.classList.add(`pop`),j&&clearTimeout(j),j=setTimeout(()=>{s.style.opacity=`0`},r*1e3)}function N(){c.style.opacity=`1`,setTimeout(()=>{c.style.opacity=`0`},260)}let ee=new Map,te=1;for(let e of Object.values(pf)){let t=Hf(`div`,`batt-card`);t.innerHTML=`
      <div class="name"><span>${e.name}</span><span class="key">[${te++}]</span></div>
      <div class="sub"><span class="state">READY</span><span class="pips"></span></div>
    `,r.appendChild(t),ee.set(e.id,t)}function P(e){let t=e.impactsOnBase===0&&e.intercepted>0,n=p.querySelector(`#db-title`);n.textContent=t?`RAID DEFEATED`:e.impactsOnBase>0?`BASE HIT`:`ENGAGEMENT COMPLETE`,n.className=t?`good`:`bad`;let r;Math.max(e.threatsTotal,1);let i=e.intercepted>=e.warheads;r=i&&e.impactsOnBase===0&&e.wastedOnDecoys===0&&e.misses===0?`S`:i&&e.impactsOnBase===0?`A`:e.impactsOnBase===0&&e.intercepted>0?`B`:e.intercepted>0?`C`:`D`,p.querySelector(`#db-grade`).textContent=r,p.querySelector(`#db-grade`).style.color=r===`S`||r===`A`?`var(--hud-green)`:r===`B`?`var(--hud-amber)`:`var(--hud-red)`,p.querySelector(`#db-table`).innerHTML=`
      <tr><td>Threats presented</td><td>${e.threatsTotal} (${e.warheads} warheads, ${e.decoys} decoys)</td></tr>
      <tr><td>Intercepted</td><td>${e.intercepted}</td></tr>
      <tr><td>Ground impacts</td><td>${e.impacts} (${e.impactsOnBase} on base)</td></tr>
      <tr><td>Interceptors expended</td><td>${e.launches}</td></tr>
      <tr><td>Spent on decoys</td><td>${e.wastedOnDecoys}</td></tr>
      <tr><td>Elapsed</td><td>${e.elapsed.toFixed(0)} s</td></tr>
    `,p.style.display=`flex`}function ne(){p.style.display=`none`}let re={},ie={threatsStruct:``,threatsVals:``,batts:``,strip:``,console:``,trackStruct:``,trackVals:``},ae=e=>Math.round(e/100)*100,F=[],I=[];w.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-id]`);n&&(re.selectTrack?.(n.dataset.id),e.events.emit(`ui-click`))});let oe=new W,L=!1,se=!1,ce=``,le=``;function ue(t){let n=null;if(t.mode!==`console`&&e.game){let r=e.game.aimTrackId??t.assignment?.trackId??null;r&&(n=e.radar.getTrack(r))}let r=!1;if(n&&!n.gone&&(e.camera.updateMatrixWorld(),oe.copy(n.threat.pos).project(e.camera),oe.z<1&&Math.abs(oe.x)<1.02&&Math.abs(oe.y)<1.02)){r=!0;let i=(oe.x*.5+.5)*innerWidth,a=(-oe.y*.5+.5)*innerHeight,o=X(1.45-n.threat.pos.distanceTo(e.camera.position)/12e3,.72,1.3);l.style.transform=`translate(${i.toFixed(1)}px, ${a.toFixed(1)}px) translate(-50%, -50%) scale(${o.toFixed(3)})`;let s=!!n.assignedBattery||t.assignment?.trackId===n.id,c=`${n.classified.startsWith(`DECOY`)?Uf.decoy:Uf.hostile} ${n.id}`,f=s?`${n.classified} · ASSIGNED`:n.classified;s!==se&&(se=s,l.classList.toggle(`assigned`,s)),c!==ce&&(ce=c,u.textContent=c),f!==le&&(le=f,d.textContent=f)}r!==L&&(L=r,l.classList.toggle(`on`,r))}function de(t){document.body.classList.toggle(`reduced-motion`,!!e.settings.reducedMotion);let r=t.inboundUndetected,i=t.tracks.map(e=>`${e.id}:${+!!e.classified.startsWith(`DECOY`)}:${e.assignedBattery??``}:${+(e.id===t.selectedTrackId)}`).join(`|`);if(t.tracks.length||(i=`empty:${t.phase}:${+(r>0)}`),i!==ie.threatsStruct&&(ie.threatsStruct=i,ie.threatsVals=``,t.tracks.length?(n.innerHTML=t.tracks.map(e=>{let n=e.classified.startsWith(`DECOY`);return`<div class="${[`row`,n?`decoy`:``,e.assignedBattery?`assigned`:``,e.id===t.selectedTrackId?`selected`:``].join(` `)}"><span class="glyph">${n?Uf.decoy:Uf.hostile}</span><span class="tid">${e.id}</span><span class="cls"></span><span class="alt"></span><span class="rng"></span>${e.assignedBattery?`<span class="asg">→${e.assignedBattery.slice(0,4).toUpperCase()}</span>`:``}</div>`}).join(``),F=[...n.children].map(e=>({cls:e.querySelector(`.cls`),alt:e.querySelector(`.alt`),rng:e.querySelector(`.rng`)}))):(n.innerHTML=`<div class="empty">${t.phase===`active`?r>0?`▲ RADAR SEARCHING — LAUNCH DETECTED`:`NO ACTIVE TRACKS`:`NO ACTIVE TRACKS — START A SCENARIO AT THE CONSOLE`}</div>`,F=[])),t.tracks.length){let e=t.tracks.map(e=>`${e.classified}:${ae(e.alt)}:${ae(e.range)}`).join(`|`);if(e!==ie.threatsVals){ie.threatsVals=e;for(let e=0;e<t.tracks.length;e++){let n=t.tracks[e],r=F[e];r&&(r.cls.textContent=n.classified,r.alt.textContent=jd(ae(n.alt)),r.rng.textContent=jd(ae(n.range)))}}}let a=t.batteries.map(e=>`${e.id}:${e.state}:${e.ammo}:${Math.ceil(e.readyIn)}`).join(`|`)+t.selectedBatteryId;if(a!==ie.batts){ie.batts=a;for(let e of t.batteries){let n=ee.get(e.id);n&&(n.classList.toggle(`selected`,e.id===t.selectedBatteryId),n.querySelector(`.state`).textContent=e.state+(e.state===`RELOADING`?` ${Math.ceil(e.readyIn)}s`:``),n.querySelector(`.state`).className=`state `+e.state.split(` `)[0],n.querySelector(`.pips`).textContent=`▮`.repeat(e.ammo)+`▯`.repeat(Math.max(0,e.maxAmmo-e.ammo)))}}let s=[];s.push(`<span class="chip batt"><span class="lbl">BTRY</span>${t.selectedBatteryName}</span>`),t.assignment&&s.push(`<span class="chip asg"><span class="lbl">ASSIGNED</span>${t.assignment.trackId} → ${t.assignment.batteryName}</span>`),t.inFlight>0&&s.push(`<span class="chip flight"><span class="lbl">IN FLIGHT</span>${Uf.interceptor} ${t.inFlight} INTERCEPTOR${t.inFlight>1?`S`:``}</span>`),t.phase===`active`&&s.push(`<span class="chip"><span class="lbl">THREATS</span>${t.threatsRemaining} REMAIN</span>`);let c=s.join(``);if(c!==ie.strip&&(ie.strip=c,o.innerHTML=c),t.mode===`console`){let e=`${t.timeOfDay}|${t.scenario}|${t.selectedBatteryId}|${t.phase}|${t.selectedTrackId}|${t.selectedBatteryReady}|${!!t.assignment}|${t.engageHint}`;if(e!==ie.console){ie.console=e;for(let e of _.children){let n=e.dataset.id===t.timeOfDay;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}for(let e of v.children){let n=e.dataset.id===t.scenario;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}for(let e of y.children){let n=e.dataset.id===t.selectedBatteryId;e.classList.toggle(`active`,n),e.setAttribute(`aria-pressed`,n)}b.disabled=t.phase===`active`||!t.scenario,b.textContent=t.phase===`active`?`… RAID IN PROGRESS …`:`▶ START BALLISTIC MISSILES`,x.disabled=!t.selectedTrackId||!t.selectedBatteryReady,S.disabled=!t.assignment,T.textContent=t.engageHint??``}let n=t.tracks.map(e=>`${e.id}:${+!!e.classified.startsWith(`DECOY`)}:${+(e.id===t.selectedTrackId)}:${+!!e.assignedBattery}`).join(`|`);if(t.tracks.length||(n=`none:${t.phase}`),n!==ie.trackStruct&&(ie.trackStruct=n,ie.trackVals=``,t.tracks.length?(w.innerHTML=t.tracks.map(e=>{let n=e.classified.startsWith(`DECOY`),r=[``,n?`decoy`:``,e.id===t.selectedTrackId?`selected`:``,e.assignedBattery?`assigned`:``].join(` `);return`<button data-id="${e.id}" class="${r}" aria-label="Select track ${e.id}" aria-pressed="${e.id===t.selectedTrackId}"><span class="glyph">${n?Uf.decoy:Uf.hostile}</span><b>${e.id}</b><span class="cls"></span><span class="alt"></span><span class="rng"></span></button>`}).join(``),I=[...w.children].map(e=>({cls:e.querySelector(`.cls`),alt:e.querySelector(`.alt`),rng:e.querySelector(`.rng`)}))):(w.innerHTML=`<div class="none">No detected tracks. ${t.phase===`active`?`Radar searching…`:`Press START.`}</div>`,I=[])),t.tracks.length){let e=t.tracks.map(e=>`${e.classified}:${ae(e.alt)}:${ae(e.range)}`).join(`|`);if(e!==ie.trackVals){ie.trackVals=e;for(let e=0;e<t.tracks.length;e++){let n=t.tracks[e],r=I[e];r&&(r.cls.textContent=n.classified,r.alt.textContent=`ALT ${jd(ae(n.alt))}`,r.rng.textContent=`RNG ${jd(ae(n.range))}`)}}}}ue(t)}let fe={handlers:re,toast:A,showBanner:M,flashImpact:N,showDebrief:P,hideDebrief:ne,update:de,setPrompt(e,t=!1){e?(i.style.display=`block`,i.classList.toggle(`interact`,t),i.innerHTML=e):i.style.display=`none`},showConsole(e){f.style.display=e?`block`:`none`},showSettings(t){m.style.display=t?`flex`:`none`,t&&(E.checked=e.settings.reducedMotion,D.value=String(e.settings.volume),O.checked=e.audio?.muted??!1,k.value=e.settings.quality)},get settingsOpen(){return m.style.display===`flex`},hideIntro(){h.classList.add(`hidden`)},crosshair(e){t.querySelector(`#crosshair`).style.display=e?`block`:`none`}};return e.events.on(`threat-tracked`,({track:e})=>A(`NEW TRACK ${e.id} — ACQUIRING`,`warn`)),e.events.on(`scenario-started`,({name:e})=>{M(`RAID WARNING`,`warn`,gf[e]?.name??``,3),A(`SCENARIO ${gf[e]?.name??e} — INBOUND FIRE DETECTED`,`bad`,8)}),e.events.on(`track-assigned`,({track:e,battery:t})=>A(`${e.id} ASSIGNED → ${t.def.name}`,`info`)),e.events.on(`launch-authorized`,({track:e,battery:t})=>A(`LAUNCH AUTHORIZED — ${t.def.name} vs ${e.id}`,`warn`)),e.events.on(`interceptor-launched`,({battery:e})=>A(`BIRD AWAY — ${e.def.name}`,`info`,4)),e.events.on(`intercept-success`,({threat:t,decoy:n})=>{let r=e.radar.trackFor?.(t);n?(M(`DECOY DESTROYED`,`warn`,`ROUND EXPENDED ON DECOY`),A(`${r?.id??`TRACK`} WAS A DECOY — ROUND WASTED`,`warn`,7)):(M(`INTERCEPT`,`good`,`${r?.id??`TRACK`} DESTROYED`),A(`${r?.id??`TRACK`} INTERCEPTED`,`good`,7))}),e.events.on(`intercept-miss`,({threat:t,reason:n})=>{let r=e.radar.trackFor?.(t);M(`MISS`,`bad`,n,2.2),A(`INTERCEPT FAILED vs ${r?.id??`?`} — ${n}`,`bad`,7)}),e.events.on(`threat-impact`,({onBase:t,threat:n})=>{let r=e.radar?.trackFor?.(n);t?(M(`IMPACT — BASE STRUCK`,`bad`,r?.id??``,3),N(),A(`${r?.id??`THREAT`} IMPACTED INSIDE PERIMETER`,`bad`,8)):A(`${r?.id??`THREAT`} IMPACT OFF-BASE`,`warn`,6)}),e.events.on(`battery-ready`,({battery:e})=>A(`${e.def.name} READY`,`good`,3)),fe}var qf={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`},Jf=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},Yf=new As(-1,1,1,-1,0,1),Xf=new class extends kr{constructor(){super(),this.setAttribute(`position`,new _r([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new _r([0,2,0,0,2,0],2))}},Zf=class{constructor(e){this._mesh=new K(Xf,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Yf)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},Qf=class extends Jf{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Jo?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Go.clone(e.uniforms),this.material=new Jo({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Zf(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},$f=class extends Jf{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},ep=class extends Jf{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},tp=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new U);this._width=n.width,this._height=n.height,t=new Jt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:g}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Qf(qf),this.copyPass.material.blending=0,this.timer=new Ls}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}$f!==void 0&&(r instanceof $f?n=!0:r instanceof ep&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new U);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},np=class extends Jf{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new G}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},rp={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new G(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`},ip=class e extends Jf{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new U(256,256):new U(e.x,e.y),this.clearColor=new G(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new Jt(i,a,{type:g}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new Jt(i,a,{type:g});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new Jt(i,a,{type:g});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=rp;this.highPassUniforms=Go.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Jo({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new U(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new W(1,1,1),new W(1,1,1),new W(1,1,1),new W(1,1,1),new W(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Go.clone(qf.uniforms),this.blendMaterial=new Jo({uniforms:this.copyUniforms,vertexShader:qf.vertexShader,fragmentShader:qf.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new G,this._oldClearAlpha=1,this._basic=new ai,this._fsQuad=new Zf(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new U(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);return new Jo({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new U(.5,.5)},direction:{value:new U(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

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

				}`})}};ip.BlurDirectionX=new U(1,0),ip.BlurDirectionY=new U(0,1);var ap={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`},op=class extends Jf{constructor(){super(),this.isOutputPass=!0,this.uniforms=Go.clone(ap.uniforms),this.material=new Yo({name:ap.name,uniforms:this.uniforms,vertexShader:ap.vertexShader,fragmentShader:ap.fragmentShader}),this._fsQuad=new Zf(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ft.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},sp={name:`FXAAShader`,uniforms:{tDiffuse:{value:null},resolution:{value:new U(1/1024,1/512)}},vertexShader:`

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

		}`},cp={uniforms:{tDiffuse:{value:null},uTime:{value:0},uVignette:{value:.34},uGrain:{value:.028},uCA:{value:9e-4},uTint:{value:new G(1,1,1)},uTintHi:{value:new G(1,1,1)},uLift:{value:new W(0,0,0)},uContrast:{value:1.03},uSCurve:{value:.1},uSat:{value:1}},vertexShader:`
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
  `},lp={day:{bloomStrength:.45,bloomThreshold:.85,tint:[1,1,1],tintHi:[1,1,1],lift:[0,0,0],grain:.028,scurve:.1,contrast:1.035,sat:1.02,vignette:.34},sunset:{bloomStrength:.6,bloomThreshold:.82,tint:[1.03,.99,.96],tintHi:[1.07,.98,.9],lift:[.01,.006,.014],grain:.036,scurve:.18,contrast:1.02,sat:1.06,vignette:.38},night:{bloomStrength:.72,bloomThreshold:.82,tint:[.96,.99,1.05],tintHi:[1,1,1],lift:[.02,.03,.058],grain:.055,scurve:.06,contrast:1.01,sat:.95,vignette:.4}};function up(e){let{renderer:t,scene:n,camera:r}=e,i=new tp(t),a=new np(n,r);i.addPass(a);let o=new ip(new U(1280,720),.45,.55,.85);i.addPass(o);let s=new op;i.addPass(s);let c=new Qf(cp);i.addPass(c);let l=new Qf(sp);i.addPass(l);function u(e,t,n){i.setSize(e,t),i.setPixelRatio(n),l.material.uniforms.resolution.value.set(1/(e*n),1/(t*n))}let d=lp.day,f={bloomStrength:d.bloomStrength,bloomThreshold:d.bloomThreshold,tint:new G().fromArray(d.tint),tintHi:new G().fromArray(d.tintHi),lift:new W().fromArray(d.lift),grain:d.grain,scurve:d.scurve,contrast:d.contrast,sat:d.sat,vignette:d.vignette},p=new G,m=new W;e.events.on(`time-of-day`,e=>{d=lp[e]??lp.day});function h(e){let t=Math.min(1,1-Math.exp(-e*2.4));f.bloomStrength+=(d.bloomStrength-f.bloomStrength)*t,f.bloomThreshold+=(d.bloomThreshold-f.bloomThreshold)*t,f.tint.lerp(p.fromArray(d.tint),t),f.tintHi.lerp(p.fromArray(d.tintHi),t),f.lift.lerp(m.fromArray(d.lift),t),f.grain+=(d.grain-f.grain)*t,f.scurve+=(d.scurve-f.scurve)*t,f.contrast+=(d.contrast-f.contrast)*t,f.sat+=(d.sat-f.sat)*t,f.vignette+=(d.vignette-f.vignette)*t,o.strength=f.bloomStrength,o.threshold=f.bloomThreshold;let n=c.uniforms;n.uTint.value.copy(f.tint),n.uTintHi.value.copy(f.tintHi),n.uLift.value.copy(f.lift),n.uGrain.value=f.grain,n.uSCurve.value=f.scurve,n.uContrast.value=f.contrast,n.uSat.value=f.sat,n.uVignette.value=f.vignette}let g=e.time?.now??0;return{composer:i,bloom:o,grade:c,fxaa:l,setSize:u,setQuality(e){o.enabled=e!==`low`,l.enabled=!0},render(t){c.uniforms.uTime.value+=t;let n=e.time?.now??0,r=Math.min(1,Math.max(t,n-g));g=n,r>0&&h(r),i.render()}}}var dp=`0.1.0`,fp=document.getElementById(`app-canvas`),pp=new yd({canvas:fp,antialias:!1,powerPreference:`high-performance`,stencil:!1});pp.outputColorSpace=Ie,pp.toneMapping=4,pp.toneMappingExposure=1,pp.shadowMap.enabled=!0,pp.shadowMap.type=2,pp.info.autoReset=!1;var mp=new Fn,hp=new Ts(66,innerWidth/innerHeight,.15,26e3);hp.position.set(0,1.7,14);var gp=(()=>{try{return JSON.parse(localStorage.getItem(`ironveil-settings`)||`{}`)}catch{return{}}})(),Q={scene:mp,camera:hp,renderer:pp,canvas:fp,time:{now:0,dt:0,unscaledDt:0,timeScale:1,frame:0},rng:new bd(20260805),vrng:new bd(97531),settings:{reducedMotion:gp.reducedMotion??!1,volume:gp.volume??.8,quality:gp.quality??`high`},events:new xd,world:{colliders:[],wind:new W(2.4,0,.8),sunDir:new W(0,1,0)}};function _p(){try{localStorage.setItem(`ironveil-settings`,JSON.stringify(Q.settings))}catch{}}Q.textures=Fd(),Q.weather=Qd(Q),Q.base=nf(Q),Q.effects=Nf(Q),Q.player=uf(Q),Q.batteries=mf(Q),Q.threats=_f(Q),Q.interceptors=vf(Q),Q.radar=Bf(Q),Q.audio=Vf(Q),Q.ui=Kf(Q),Q.post=up(Q);var $={mode:`freeroam`,phase:`idle`,scenario:null,seed:null,scenarioStartedAt:0,selectedBatteryId:`patriot`,assignment:null,engageHint:``,endTimer:-1,autoplay:!1,autoplayTimer:0,stats:null,aimTrackId:null,nearConsole:!1,nearBattery:null,consoleTransition:0,savedCam:{pos:new W,quat:new Dt}};Q.game=$;function vp(){return{threatsTotal:0,warheads:0,decoys:0,intercepted:0,misses:0,impacts:0,impactsOnBase:0,launches:0,wastedOnDecoys:0,elapsed:0}}$.stats=vp(),Q.events.on(`threat-spawned`,({threat:e})=>{$.stats.threatsTotal++,e.isDecoy?$.stats.decoys++:$.stats.warheads++}),Q.events.on(`interceptor-launched`,()=>{$.stats.launches++}),Q.events.on(`intercept-success`,({decoy:e})=>{e?$.stats.wastedOnDecoys++:$.stats.intercepted++}),Q.events.on(`intercept-miss`,({threat:e})=>{$.stats.misses++;let t=e?Q.radar.trackFor(e):null;t&&(t.engagedBy=Math.max(0,t.engagedBy-1))}),Q.events.on(`intercept-success`,({point:e})=>{$.lastIntercept={x:e.x,y:e.y,z:e.z,t:Q.time.now}}),Q.events.on(`threat-impact`,({onBase:e,threat:t})=>{$.stats.impacts++,e&&!t.isDecoy&&($.stats.impactsOnBase++,Q.player.addShake(.95),Q.ui.flashImpact())}),Q.events.on(`threat-destroyed`,({threat:e})=>{let t=Q.radar.trackFor(e);t&&$.assignment?.trackId===t.id&&($.assignment=null)}),Q.events.on(`threat-impact`,({threat:e})=>{let t=Q.radar.trackFor(e);t&&$.assignment?.trackId===t.id&&($.assignment=null)});function yp(e){$.phase!==`active`&&gf[e]&&($.scenario=e,gf[e].forceTime&&Q.weather.timeOfDay!==gf[e].forceTime&&(xp(gf[e].forceTime),Q.ui.toast(`CONDITIONS SET TO ${gf[e].forceTime.toUpperCase()} FOR ${gf[e].name}`,`info`,4)))}function bp(e){pf[e]&&($.selectedBatteryId=e,Q.events.emit(`battery-selected`,{id:e}))}function xp(e){Q.weather.setTimeOfDay(e),Sp()}function Sp(){Q.base.setSearchlights($.phase===`active`&&Q.weather.timeOfDay===`night`)}function Cp(e={}){if($.phase===`active`)return!1;if(!$.scenario)return Q.ui.toast(`SELECT A THREAT SCENARIO FIRST`,`warn`),!1;let t=e.seed??$.seed??Math.random()*1e9|0;return $.seed=null,Q.rng.reseed(t),Q.vrng.reseed(t^1597463007),Q.radar.clear(),Q.interceptors.clear(),Q.batteries.resetAll(),$.stats=vp(),$.assignment=null,$.endTimer=-1,$.phase=`active`,$.scenarioStartedAt=Q.time.now,Q.ui.hideDebrief(),Q.threats.startScenario($.scenario,Q.rng),Sp(),Q.events.emit(`scenario-started`,{name:$.scenario,seed:t}),!0}function wp(){Q.threats.clear(),Q.interceptors.clear(),$.phase=`idle`,Cp()}function Tp(e=Q.radar.selectedTrackId??$.aimTrackId,t=$.selectedBatteryId){let n=Q.radar.getTrack(e);if(!n||n.gone)return $.engageHint=`NO TRACK SELECTED`,!1;let r=Q.batteries.get(t);if(!r)return!1;if(r.ammo<=0)return $.engageHint=`${r.def.name} IS WINCHESTER (NO AMMO)`,Q.ui.toast($.engageHint,`warn`),!1;let i=Ud(r.rig.group.position,n.threat.pos,n.threat.vel,r.def.interceptor.avgSpeed);if(!i)return $.engageHint=`CANNOT ACHIEVE INTERCEPT — ${r.def.name} TOO SLOW / TOO LATE`,Q.ui.toast($.engageHint,`warn`),!1;let a=r.def.envelope,o=i.point.y,s=Math.hypot(i.point.x,i.point.z),c=`PREDICT INTERCEPT ALT ${jd(o)} RNG ${jd(s)} — NOMINAL`;return o<a.minAlt||o>a.maxAlt||s>a.maxRange?c=`WARNING: PREDICTED POINT OUTSIDE ${r.def.name} ENVELOPE — LOW PK`:(o<a.sweetLow||o>a.sweetHigh)&&(c=`MARGINAL GEOMETRY FOR ${r.def.name} — REDUCED PK`),$.assignment={trackId:n.id,batteryId:t},n.assignedBattery=t,r.pointAt(i.point),$.engageHint=c,Q.events.emit(`track-assigned`,{track:n,battery:r,sol:i}),!0}function Ep(){let e=$.assignment;if(!e)return $.engageHint=`NO ASSIGNMENT — ASSIGN A TRACK FIRST`,!1;let t=Q.radar.getTrack(e.trackId),n=Q.batteries.get(e.batteryId);if(!t||t.gone)return $.assignment=null,!1;if(!n.canAccept())return $.engageHint=`${n.def.name} NOT READY (${n.displayState})`,!1;let r=n.launch(t);return r&&(t.engagedBy++,$.engageHint=`${n.def.name} FIRING ON ${t.id}`,Q.events.emit(`launch-authorized`,{track:t,battery:n}),$.assignment=null,t.assignedBattery=null),r}function Dp(e){let t=[`sentinel`,`thaad`,`patriot`],n=null;for(let r of t){let t=Q.batteries.get(r);if(!t.canAccept())continue;let i=Ud(t.rig.group.position,e.threat.pos,e.threat.vel,t.def.interceptor.avgSpeed);if(!i)continue;let a=t.def.envelope,o=i.point.y,s=Math.hypot(i.point.x,i.point.z);if(o>=a.minAlt&&o<=a.maxAlt&&s<=a.maxRange){if(o>=a.sweetLow&&o<=a.sweetHigh)return r;n??=r}}return n}var Op={pos:new W,look:new W};{let e=Q.base.consolePos;Op.pos.set(e.x+2.1,1.92,e.z+3.1),Op.look.set(e.x+1.85,1.22,e.z-.9)}function kp(){$.mode!==`console`&&($.mode=`console`,$.consoleTransition=0,$.savedCam.pos.copy(hp.position),$.savedCam.quat.copy(hp.quaternion),Q.player.setEnabled(!1),Q.player.unlockPointer(),Q.ui.showConsole(!0),Q.ui.crosshair(!1),Q.ui.setPrompt(null))}function Ap(){$.mode===`console`&&($.mode=`freeroam`,Q.player.setEnabled(!0),Q.ui.showConsole(!1),Q.ui.crosshair(!0),Wp||Q.player.lockPointer())}var jp=new Qs,Mp=new U;fp.addEventListener(`pointerdown`,e=>{if($.mode!==`console`)return;Mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1),jp.setFromCamera(Mp,hp);let t=Q.radar.pickTrack(jp);t&&(Q.radar.selectTrack(t),Q.events.emit(`ui-click`))}),window.addEventListener(`keydown`,e=>{if(e.code===`Tab`&&e.preventDefault(),!(Q.ui.settingsOpen&&e.code!==`KeyH`&&e.code!==`Escape`))switch(e.code){case`Digit1`:bp(`patriot`);break;case`Digit2`:bp(`thaad`);break;case`Digit3`:bp(`sentinel`);break;case`KeyH`:Q.ui.showSettings(!Q.ui.settingsOpen);break;case`Escape`:Q.ui.settingsOpen?Q.ui.showSettings(!1):$.mode===`console`&&Ap();break;case`Tab`:$.mode===`console`?Ap():$.nearConsole||$.phase===`active`||$.phase===`debrief`?kp():Q.ui.toast(`FIRE DIRECTION CONSOLE IS IN THE C2 SHELTER (FOLLOW THE LIT DOOR)`,`info`,4);break;case`KeyE`:if($.mode===`console`){Ap();break}$.nearConsole?kp():$.aimTrackId&&(Q.radar.selectTrack($.aimTrackId),Tp($.aimTrackId));break;case`KeyF`:$.mode===`freeroam`&&(!$.assignment&&$.aimTrackId&&Tp($.aimTrackId),Ep());break;case`KeyR`:$.phase===`debrief`&&(Q.ui.hideDebrief(),wp())}}),fp.addEventListener(`pointerdown`,()=>{$.mode===`freeroam`&&!Wp&&!Q.ui.settingsOpen&&(Q.player.lockPointer(),Q.audio.unlock())}),Object.assign(Q.ui.handlers,{setTimeOfDay:e=>xp(e),selectScenario:e=>yp(e),selectBattery:e=>bp(e),selectTrack:e=>Q.radar.selectTrack(e),start:()=>Cp(),assign:()=>Tp(),authorize:()=>Ep(),exitConsole:()=>Ap(),enterConsole:()=>kp(),restart:()=>wp(),closeToRoam:()=>{$.phase=`idle`,Ap()},enterGame:()=>{Wp||Q.player.lockPointer(),Q.audio.unlock()},setReducedMotion:e=>{Q.settings.reducedMotion=e,_p()},setVolume:e=>{Q.audio.setVolume(e),_p()},setMuted:e=>Q.audio.setMuted(e),setQuality:e=>{Bp(e),_p()}});var Np=new W,Pp=new W;function Fp(){$.aimTrackId=null,$.nearConsole=Q.player.position.distanceTo(Q.base.consolePos)<3.2,$.nearBattery=null;for(let e of Q.batteries.list)if(Q.player.position.distanceTo(e.rig.group.position)<9){$.nearBattery=e;break}if($.mode!==`freeroam`)return;hp.getWorldDirection(Np);let e=.06,t=null;for(let n of Q.radar.activeTracks()){if(Pp.copy(n.threat.pos).sub(hp.position),Pp.length()<40)continue;Pp.normalize();let r=Pp.angleTo(Np);r<e&&(e=r,t=n)}if(t&&($.aimTrackId=t.id),$.nearConsole)Q.ui.setPrompt(`<span class="tp-title">FIRE DIRECTION CONSOLE</span>
[E] TAKE CONSOLE`,!0);else if($.aimTrackId){let e=Q.radar.getTrack($.aimTrackId),t=e.threat,n=Q.batteries.get($.selectedBatteryId),r=$.assignment?.trackId===e.id;Q.ui.setPrompt(`<span class="tp-title">${e.id} · ${e.classified}</span>\nALT ${jd(t.pos.y)} · RNG ${jd(Math.hypot(t.pos.x,t.pos.z))} · SPD ${Math.round(t.vel.length())} m/s\n`+(r?`ASSIGNED TO ${Q.batteries.get($.assignment.batteryId).def.name} — [F] AUTHORIZE LAUNCH`:`[E] ASSIGN ${n.def.name} · [F] QUICK FIRE`))}else if($.nearBattery){let e=$.nearBattery;Q.ui.setPrompt(`<span class="tp-title">${e.def.name}</span>\n${e.def.kind} · ${e.displayState} · ${e.ammo}/${e.def.ammo} ROUNDS`,!0)}else Q.ui.setPrompt(null)}function Ip(){if(!$.autoplay||$.phase!==`active`||($.autoplayTimer-=Q.time.dt,$.autoplayTimer>0))return;$.autoplayTimer=.5;let e=Q.radar.activeTracks().filter(e=>!e.classified.startsWith(`DECOY`)&&e.engagedBy===0&&e.threat.alive).sort((e,t)=>e.threat.pos.y-t.threat.pos.y);for(let t of e){let e=Dp(t);if(e&&Tp(t.id,e)){Ep();break}}}function Lp(e){$.phase===`active`&&($.stats.elapsed=Q.time.now-$.scenarioStartedAt,Q.threats.allSpawned&&Q.threats.active.length===0&&Q.interceptors.active.length===0?($.endTimer<0&&($.endTimer=2.2),$.endTimer-=e,$.endTimer<=0&&($.phase=`debrief`,Sp(),Q.events.emit(`scenario-ended`,{stats:{...$.stats}}),Q.ui.showDebrief($.stats))):$.endTimer=-1)}function Rp(){let e=[];for(let t of Q.radar.activeTracks())e.push({id:t.id,classified:t.classified,alt:t.threat.pos.y,range:Math.hypot(t.threat.pos.x,t.threat.pos.z),assignedBattery:t.assignedBattery});let t=Q.batteries.list.map(e=>({id:e.id,state:e.displayState,ammo:e.ammo,maxAmmo:e.def.ammo,readyIn:Math.max(0,e.readyIn)})),n=Q.batteries.get($.selectedBatteryId);return{mode:$.mode,phase:$.phase,scenario:$.scenario,timeOfDay:Q.weather.timeOfDay,tracks:e,batteries:t,selectedBatteryId:$.selectedBatteryId,selectedBatteryName:n.def.name,selectedBatteryReady:n.canAccept(),selectedTrackId:Q.radar.selectedTrackId,assignment:$.assignment?{trackId:$.assignment.trackId,batteryName:Q.batteries.get($.assignment.batteryId).def.name}:null,inFlight:Q.interceptors.active.length,threatsRemaining:Q.threats.active.length+Q.threats.pendingCount,inboundUndetected:Q.threats.active.length-e.length,engageHint:$.engageHint}}var zp=1.75;function Bp(e){Q.settings.quality=e,zp=e===`high`?1.75:e===`medium`?1.25:1,Q.post.setQuality(e),Vp()}function Vp(){let e=innerWidth,t=innerHeight,n=Math.min(devicePixelRatio||1,zp);pp.setPixelRatio(n),pp.setSize(e,t),hp.aspect=e/t,hp.updateProjectionMatrix(),Q.post.setSize(e,t,n),Q.effects.setViewport(t*n,hp.fov)}window.addEventListener(`resize`,Vp);var Hp={emaMs:16.6,samples:0,degradeCooldown:0,fps:60};function Up(e){let t=e*1e3;Hp.emaMs=Hp.emaMs*.95+t*.05,Hp.fps=1e3/Math.max(Hp.emaMs,.001),Hp.degradeCooldown-=e,!Wp&&Hp.fps<46&&Hp.degradeCooldown<=0&&Q.time.now>6&&(Q.settings.quality===`high`?(Bp(`medium`),Hp.degradeCooldown=10,Q.ui.toast(`RENDER QUALITY → MEDIUM (AUTO)`,`info`,3)):Q.settings.quality===`medium`&&(Bp(`low`),Hp.degradeCooldown=10,Q.ui.toast(`RENDER QUALITY → LOW (AUTO)`,`info`,3)))}var Wp=!1,Gp=!1,Kp=new W,qp=new Dt,Jp=new Zt;function Yp(e){if(Q.time.dt=e,Q.time.frame++,Q.weather.update(e),Q.player.update($.mode===`freeroam`?e:0),$.mode===`console`){$.consoleTransition=Math.min(1,$.consoleTransition+e*2.4);let t=$.consoleTransition,n=t*t*(3-2*t);Kp.copy(Op.pos),Jp.lookAt(Op.pos,Op.look,hp.up),qp.setFromRotationMatrix(Jp),hp.position.lerpVectors($.savedCam.pos,Kp,n),hp.quaternion.slerpQuaternions($.savedCam.quat,qp,n)}let t=e>.034?Math.min(12,Math.ceil(e/.034)):1,n=e/t;for(let e=0;e<t;e++)Q.time.now+=n,Q.base.update(n,Q.time.now),Q.batteries.update(n),Q.threats.update(n),Q.interceptors.update(n),Q.radar.update(n),Q.effects.update(n,Q.time.now);Q.audio.update(e),Fp(),Ip(),Lp(e),Q.ui.update(Rp())}var Xp=performance.now();function Zp(){let e=performance.now(),t=(e-Xp)/1e3;Xp=e,t=X(t,0,.1),Q.time.unscaledDt=t;let n=Gp?0:t*Q.time.timeScale;Yp(n),pp.info.reset(),Q.post.render(n),Up(t)}pp.setAnimationLoop(Zp),Vp(),Bp(Q.settings.quality),window.__game={ready:!0,version:dp,ctx:Q,state(){return{mode:$.mode,phase:$.phase,scenario:$.scenario,timeOfDay:Q.weather.timeOfDay,time:Q.time.now,player:{x:Q.player.position.x,y:Q.player.position.y,z:Q.player.position.z},tracks:Q.radar.activeTracks().map(e=>({id:e.id,classified:e.classified,alt:Math.round(e.threat.pos.y),range:Math.round(Math.hypot(e.threat.pos.x,e.threat.pos.z)),x:Math.round(e.threat.pos.x),z:Math.round(e.threat.pos.z),decoy:e.threat.isDecoy,assigned:e.assignedBattery,engagedBy:e.engagedBy})),threatsActive:Q.threats.active.length,threatsPending:Q.threats.pendingCount,interceptors:Q.interceptors.active.map(e=>({id:e.id,phase:e.phase,alt:Math.round(e.pos.y),x:Math.round(e.pos.x),z:Math.round(e.pos.z)})),batteries:Q.batteries.list.map(e=>({id:e.id,state:e.displayState,ammo:e.ammo})),assignment:$.assignment,stats:{...$.stats},autoplay:$.autoplay,engageHint:$.engageHint,lastIntercept:$.lastIntercept??null,nearConsole:$.nearConsole}},perf(){return{fps:Math.round(Hp.fps*10)/10,ms:Math.round(Hp.emaMs*100)/100,calls:pp.info.render.calls,triangles:pp.info.render.triangles,geometries:pp.info.memory.geometries,textures:pp.info.memory.textures,programs:pp.info.programs?.length??0,quality:Q.settings.quality}},testMode(){return Wp=!0,Q.ui.hideIntro(),Q.audio.setMuted(!0),!0},seed(e){return $.seed=e,e},start(e,t={}){return yp(e),t.timeOfDay&&xp(t.timeOfDay),Cp(t)},restart(){wp()},stopScenario(){Q.threats.clear(),Q.interceptors.clear(),Q.ui.hideDebrief(),$.phase=`idle`,Sp()},selectBattery(e){bp(e)},selectTrack(e){Q.radar.selectTrack(e)},assign(e,t){return Tp(e,t)},authorize(){return Ep()},autoplay(e=!0){return $.autoplay=e,e},openConsole(){kp(),$.consoleTransition=.999},closeConsole(){Ap()},setTimeOfDay(e){xp(e)},teleport(e,t,n,r=0,i=0){Q.player.teleport(e,t,n,r,i)},lookAt(e,t,n){let r=Q.player.state,i=e-hp.position.x,a=t-hp.position.y,o=n-hp.position.z;r.yaw=Math.atan2(-i,-o),r.pitch=Math.atan2(a,Math.hypot(i,o)),Q.player.update(0)},timeScale(e){return Q.time.timeScale=e,e},pause(e=!0){return Gp=e,Gp},step(e=1,t=16.667){for(let n=0;n<e;n++)Yp(t/1e3);return pp.info.reset(),Q.post.render(t/1e3),Q.time.now},setReducedMotion(e){Q.settings.reducedMotion=e},setQuality(e){Bp(e)},mute(){Q.audio.setMuted(!0)}},console.info(`[IRONVEIL] ready — fictional interceptor base demo v0.1.0`);