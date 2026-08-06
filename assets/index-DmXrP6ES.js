(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const kl="185",Sd=0,Sc=1,bd=2,tr=1,Ed=2,Js=3,Ci=0,fn=1,Qt=2,jt=0,ws=1,Bn=2,bc=3,Ec=4,jh=5,On=100,Td=101,Ad=102,Rd=103,Cd=104,js=200,Pd=201,Ld=202,Dd=203,ka=204,Fa=205,Ba=206,Id=207,Ha=208,Nd=209,Ud=210,Od=211,kd=212,Fd=213,Bd=214,za=0,Va=1,Ga=2,Ss=3,Wa=4,Xa=5,Ya=6,qa=7,Qh=0,Hd=1,zd=2,Hn=0,$h=1,eu=2,tu=3,nu=4,iu=5,su=6,ru=7,Tc="attached",Vd="detached",ou=300,Vi=301,bs=302,Wo=303,Xo=304,Ao=306,mn=1e3,Zn=1001,Ka=1002,Ct=1003,Gd=1004,br=1005,sn=1006,Yo=1007,Ti=1008,cn=1009,au=1010,lu=1011,cr=1012,Fl=1013,$n=1014,Fn=1015,Vt=1016,Bl=1017,Hl=1018,Es=1020,cu=35902,hu=35899,uu=1021,du=1022,yn=1023,di=1026,Ai=1027,fu=1028,zl=1029,Gi=1030,Vl=1031,Gl=1033,ho=33776,uo=33777,fo=33778,po=33779,Za=35840,Ja=35841,ja=35842,Qa=35843,$a=36196,el=37492,tl=37496,nl=37488,il=37489,go=37490,sl=37491,rl=37808,ol=37809,al=37810,ll=37811,cl=37812,hl=37813,ul=37814,dl=37815,fl=37816,pl=37817,ml=37818,gl=37819,vl=37820,xl=37821,Ml=36492,wl=36494,yl=36495,_l=36283,Sl=36284,vo=36285,bl=36286,Wd=3200,Xd=3201,xo=0,Yd=1,li="",dn="srgb",Mo="srgb-linear",wo="linear",xt="srgb",$i=7680,Ac=519,qd=512,Kd=513,Zd=514,Wl=515,Jd=516,jd=517,Xl=518,Qd=519,El=35044,Rc="300 es",Jn=2e3,hr=2001;function $d(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function yo(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function ef(){const i=yo("canvas");return i.style.display="block",i}const Cc={};function _o(...i){const e="THREE."+i.shift();console.log(e,...i)}function pu(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ze(...i){i=pu(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function ht(...i){i=pu(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function ys(...i){const e=i.join(" ");e in Cc||(Cc[e]=!0,Ze(...i))}function tf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const nf={[za]:Va,[Ga]:Ya,[Wa]:qa,[Ss]:Xa,[Va]:za,[Ya]:Ga,[qa]:Wa,[Xa]:Ss};class qi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const an=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Pc=1234567;const nr=Math.PI/180,Ts=180/Math.PI;function zn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(an[i&255]+an[i>>8&255]+an[i>>16&255]+an[i>>24&255]+"-"+an[e&255]+an[e>>8&255]+"-"+an[e>>16&15|64]+an[e>>24&255]+"-"+an[t&63|128]+an[t>>8&255]+"-"+an[t>>16&255]+an[t>>24&255]+an[n&255]+an[n>>8&255]+an[n>>16&255]+an[n>>24&255]).toLowerCase()}function at(i,e,t){return Math.max(e,Math.min(t,i))}function Yl(i,e){return(i%e+e)%e}function sf(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function rf(i,e,t){return i!==e?(t-i)/(e-i):0}function ir(i,e,t){return(1-t)*i+t*e}function of(i,e,t,n){return ir(i,e,1-Math.exp(-t*n))}function af(i,e=1){return e-Math.abs(Yl(i,e*2)-e)}function lf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function cf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function hf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function uf(i,e){return i+Math.random()*(e-i)}function df(i){return i*(.5-Math.random())}function ff(i){i!==void 0&&(Pc=i);let e=Pc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function pf(i){return i*nr}function mf(i){return i*Ts}function gf(i){return(i&i-1)===0&&i!==0}function vf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function xf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Mf(i,e,t,n,s){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),d=r((e-n)/2),u=o((e-n)/2),f=r((n-e)/2),m=o((n-e)/2);switch(s){case"XYX":i.set(a*h,l*d,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*d,a*c);break;case"ZXZ":i.set(l*d,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*m,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*m,a*c);break;case"ZYZ":i.set(l*m,l*f,a*h,a*c);break;default:Ze("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function kn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Mt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Lc={DEG2RAD:nr,RAD2DEG:Ts,generateUUID:zn,clamp:at,euclideanModulo:Yl,mapLinear:sf,inverseLerp:rf,lerp:ir,damp:of,pingpong:af,smoothstep:lf,smootherstep:cf,randInt:hf,randFloat:uf,randFloatSpread:df,seededRandom:ff,degToRad:pf,radToDeg:mf,isPowerOfTwo:gf,ceilPowerOfTwo:vf,floorPowerOfTwo:xf,setQuaternionFromProperEuler:Mf,normalize:Mt,denormalize:kn};class ae{static{ae.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(at(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ki{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],f=r[o+1],m=r[o+2],x=r[o+3];if(d!==x||l!==u||c!==f||h!==m){let g=l*u+c*f+h*m+d*x;g<0&&(u=-u,f=-f,m=-m,x=-x,g=-g);let p=1-a;if(g<.9995){const T=Math.acos(g),b=Math.sin(T);p=Math.sin(p*T)/b,a=Math.sin(a*T)/b,l=l*p+u*a,c=c*p+f*a,h=h*p+m*a,d=d*p+x*a}else{l=l*p+u*a,c=c*p+f*a,h=h*p+m*a,d=d*p+x*a;const T=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=T,c*=T,h*=T,d*=T}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],f=r[o+2],m=r[o+3];return e[t]=a*m+h*d+l*f-c*u,e[t+1]=l*m+h*u+c*d-a*f,e[t+2]=c*m+h*f+a*u-l*d,e[t+3]=h*m-a*d-l*u-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),f=l(s/2),m=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"YZX":this._x=u*h*d+c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d-u*f*m;break;case"XZY":this._x=u*h*d-c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d+u*f*m;break;default:Ze("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=n+a+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(at(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class A{static{A.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Dc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Dc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),h=2*(a*t-r*s),d=2*(r*n-o*t);return this.x=t+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return qo.copy(this).projectOnVector(e),this.sub(qo)}reflect(e){return this.sub(qo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(at(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const qo=new A,Dc=new Ki;class tt{static{tt.prototype.isMatrix3=!0}constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],m=n[8],x=s[0],g=s[3],p=s[6],T=s[1],b=s[4],w=s[7],S=s[2],M=s[5],y=s[8];return r[0]=o*x+a*T+l*S,r[3]=o*g+a*b+l*M,r[6]=o*p+a*w+l*y,r[1]=c*x+h*T+d*S,r[4]=c*g+h*b+d*M,r[7]=c*p+h*w+d*y,r[2]=u*x+f*T+m*S,r[5]=u*g+f*b+m*M,r[8]=u*p+f*w+m*y,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=h*o-a*c,u=a*l-h*r,f=c*r-o*l,m=t*d+n*u+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/m;return e[0]=d*x,e[1]=(s*c-h*n)*x,e[2]=(a*n-s*o)*x,e[3]=u*x,e[4]=(h*t-s*l)*x,e[5]=(s*r-a*t)*x,e[6]=f*x,e[7]=(n*l-c*t)*x,e[8]=(o*t-n*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return ys("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ko.makeScale(e,t)),this}rotate(e){return ys("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ko.makeRotation(-e)),this}translate(e,t){return ys("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ko.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ko=new tt,Ic=new tt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Nc=new tt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function wf(){const i={enabled:!0,workingColorSpace:Mo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===xt&&(s.r=hi(s.r),s.g=hi(s.g),s.b=hi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===xt&&(s.r=_s(s.r),s.g=_s(s.g),s.b=_s(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===li?wo:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return ys("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return ys("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Mo]:{primaries:e,whitePoint:n,transfer:wo,toXYZ:Ic,fromXYZ:Nc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:dn},outputColorSpaceConfig:{drawingBufferColorSpace:dn}},[dn]:{primaries:e,whitePoint:n,transfer:xt,toXYZ:Ic,fromXYZ:Nc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:dn}}}),i}const ut=wf();function hi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _s(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let es;class yf{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{es===void 0&&(es=yo("canvas")),es.width=e.width,es.height=e.height;const s=es.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=es}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=yo("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=hi(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(hi(t[n]/255)*255):t[n]=hi(t[n]);return{data:t,width:e.width,height:e.height}}else return Ze("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let _f=0;class ql{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:_f++}),this.uuid=zn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Zo(s[o].image)):r.push(Zo(s[o]))}else r=Zo(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function Zo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?yf.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ze("Texture: Unable to serialize Texture."),{})}let Sf=0;const Jo=new A;class en extends qi{constructor(e=en.DEFAULT_IMAGE,t=en.DEFAULT_MAPPING,n=Zn,s=Zn,r=sn,o=Ti,a=yn,l=cn,c=en.DEFAULT_ANISOTROPY,h=li){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Sf++}),this.uuid=zn(),this.name="",this.source=new ql(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ae(0,0),this.repeat=new ae(1,1),this.center=new ae(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new tt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Jo).x}get height(){return this.source.getSize(Jo).y}get depth(){return this.source.getSize(Jo).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Ze(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ze(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ou)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case mn:e.x=e.x-Math.floor(e.x);break;case Zn:e.x=e.x<0?0:1;break;case Ka:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case mn:e.y=e.y-Math.floor(e.y);break;case Zn:e.y=e.y<0?0:1;break;case Ka:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}en.DEFAULT_IMAGE=null;en.DEFAULT_MAPPING=ou;en.DEFAULT_ANISOTROPY=1;class vt{static{vt.prototype.isVector4=!0}constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],m=l[9],x=l[2],g=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-x)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+x)<.1&&Math.abs(m+g)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const b=(c+1)/2,w=(f+1)/2,S=(p+1)/2,M=(h+u)/4,y=(d+x)/4,v=(m+g)/4;return b>w&&b>S?b<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(b),s=M/n,r=y/n):w>S?w<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(w),n=M/s,r=v/s):S<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(S),n=y/r,s=v/r),this.set(n,s,r,t),this}let T=Math.sqrt((g-m)*(g-m)+(d-x)*(d-x)+(u-h)*(u-h));return Math.abs(T)<.001&&(T=1),this.x=(g-m)/T,this.y=(d-x)/T,this.z=(u-h)/T,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this.w=at(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this.w=at(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(at(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class bf extends qi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new vt(0,0,e,t),this.scissorTest=!1,this.viewport=new vt(0,0,e,t),this.textures=[];const s={width:e,height:t,depth:n.depth},r=new en(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new ql(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Pt extends bf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class mu extends en{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Ef extends en{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class rt{static{rt.prototype.isMatrix4=!0}constructor(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g)}set(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=m,p[11]=x,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new rt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,n=e.elements,s=1/ts.setFromMatrixColumn(e,0).length(),r=1/ts.setFromMatrixColumn(e,1).length(),o=1/ts.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){const u=o*h,f=o*d,m=a*h,x=a*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=u-x*c,t[9]=-a*l,t[2]=x-u*c,t[6]=m+f*c,t[10]=o*l}else if(e.order==="YXZ"){const u=l*h,f=l*d,m=c*h,x=c*d;t[0]=u+x*a,t[4]=m*a-f,t[8]=o*c,t[1]=o*d,t[5]=o*h,t[9]=-a,t[2]=f*a-m,t[6]=x+u*a,t[10]=o*l}else if(e.order==="ZXY"){const u=l*h,f=l*d,m=c*h,x=c*d;t[0]=u-x*a,t[4]=-o*d,t[8]=m+f*a,t[1]=f+m*a,t[5]=o*h,t[9]=x-u*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const u=o*h,f=o*d,m=a*h,x=a*d;t[0]=l*h,t[4]=m*c-f,t[8]=u*c+x,t[1]=l*d,t[5]=x*c+u,t[9]=f*c-m,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const u=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=x-u*d,t[8]=m*d+f,t[1]=d,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*d+m,t[10]=u-x*d}else if(e.order==="XZY"){const u=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+x,t[5]=o*h,t[9]=f*d-m,t[2]=m*d-f,t[6]=a*h,t[10]=x*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Tf,e,Af)}lookAt(e,t,n){const s=this.elements;return xn.subVectors(e,t),xn.lengthSq()===0&&(xn.z=1),xn.normalize(),xi.crossVectors(n,xn),xi.lengthSq()===0&&(Math.abs(n.z)===1?xn.x+=1e-4:xn.z+=1e-4,xn.normalize(),xi.crossVectors(n,xn)),xi.normalize(),Er.crossVectors(xn,xi),s[0]=xi.x,s[4]=Er.x,s[8]=xn.x,s[1]=xi.y,s[5]=Er.y,s[9]=xn.y,s[2]=xi.z,s[6]=Er.z,s[10]=xn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],m=n[2],x=n[6],g=n[10],p=n[14],T=n[3],b=n[7],w=n[11],S=n[15],M=s[0],y=s[4],v=s[8],E=s[12],C=s[1],P=s[5],D=s[9],N=s[13],z=s[2],I=s[6],V=s[10],O=s[14],G=s[3],q=s[7],re=s[11],ne=s[15];return r[0]=o*M+a*C+l*z+c*G,r[4]=o*y+a*P+l*I+c*q,r[8]=o*v+a*D+l*V+c*re,r[12]=o*E+a*N+l*O+c*ne,r[1]=h*M+d*C+u*z+f*G,r[5]=h*y+d*P+u*I+f*q,r[9]=h*v+d*D+u*V+f*re,r[13]=h*E+d*N+u*O+f*ne,r[2]=m*M+x*C+g*z+p*G,r[6]=m*y+x*P+g*I+p*q,r[10]=m*v+x*D+g*V+p*re,r[14]=m*E+x*N+g*O+p*ne,r[3]=T*M+b*C+w*z+S*G,r[7]=T*y+b*P+w*I+S*q,r[11]=T*v+b*D+w*V+S*re,r[15]=T*E+b*N+w*O+S*ne,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],f=e[14],m=e[3],x=e[7],g=e[11],p=e[15],T=l*f-c*u,b=a*f-c*d,w=a*u-l*d,S=o*f-c*h,M=o*u-l*h,y=o*d-a*h;return t*(x*T-g*b+p*w)-n*(m*T-g*S+p*M)+s*(m*b-x*S+p*y)-r*(m*w-x*M+g*y)}determinantAffine(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],h=e[10];return t*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],f=e[11],m=e[12],x=e[13],g=e[14],p=e[15],T=t*a-n*o,b=t*l-s*o,w=t*c-r*o,S=n*l-s*a,M=n*c-r*a,y=s*c-r*l,v=h*x-d*m,E=h*g-u*m,C=h*p-f*m,P=d*g-u*x,D=d*p-f*x,N=u*p-f*g,z=T*N-b*D+w*P+S*C-M*E+y*v;if(z===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const I=1/z;return e[0]=(a*N-l*D+c*P)*I,e[1]=(s*D-n*N-r*P)*I,e[2]=(x*y-g*M+p*S)*I,e[3]=(u*M-d*y-f*S)*I,e[4]=(l*C-o*N-c*E)*I,e[5]=(t*N-s*C+r*E)*I,e[6]=(g*w-m*y-p*b)*I,e[7]=(h*y-u*w+f*b)*I,e[8]=(o*D-a*C+c*v)*I,e[9]=(n*C-t*D-r*v)*I,e[10]=(m*M-x*w+p*T)*I,e[11]=(d*w-h*M-f*T)*I,e[12]=(a*E-o*P-l*v)*I,e[13]=(t*P-n*E+s*v)*I,e[14]=(x*b-m*S-g*T)*I,e[15]=(h*S-d*b+u*T)*I,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,d=a+a,u=r*c,f=r*h,m=r*d,x=o*h,g=o*d,p=a*d,T=l*c,b=l*h,w=l*d,S=n.x,M=n.y,y=n.z;return s[0]=(1-(x+p))*S,s[1]=(f+w)*S,s[2]=(m-b)*S,s[3]=0,s[4]=(f-w)*M,s[5]=(1-(u+p))*M,s[6]=(g+T)*M,s[7]=0,s[8]=(m+b)*y,s[9]=(g-T)*y,s[10]=(1-(u+x))*y,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];const r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=ts.set(s[0],s[1],s[2]).length();const a=ts.set(s[4],s[5],s[6]).length(),l=ts.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Pn.copy(this);const c=1/o,h=1/a,d=1/l;return Pn.elements[0]*=c,Pn.elements[1]*=c,Pn.elements[2]*=c,Pn.elements[4]*=h,Pn.elements[5]*=h,Pn.elements[6]*=h,Pn.elements[8]*=d,Pn.elements[9]*=d,Pn.elements[10]*=d,t.setFromRotationMatrix(Pn),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=Jn,l=!1){const c=this.elements,h=2*r/(t-e),d=2*r/(n-s),u=(t+e)/(t-e),f=(n+s)/(n-s);let m,x;if(l)m=r/(o-r),x=o*r/(o-r);else if(a===Jn)m=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===hr)m=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=Jn,l=!1){const c=this.elements,h=2/(t-e),d=2/(n-s),u=-(t+e)/(t-e),f=-(n+s)/(n-s);let m,x;if(l)m=1/(o-r),x=o/(o-r);else if(a===Jn)m=-2/(o-r),x=-(o+r)/(o-r);else if(a===hr)m=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ts=new A,Pn=new rt,Tf=new A(0,0,0),Af=new A(1,1,1),xi=new A,Er=new A,xn=new A,Uc=new rt,Oc=new Ki;class fi{constructor(e=0,t=0,n=0,s=fi.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(at(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-at(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(at(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-at(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(at(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-at(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ze("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Uc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Uc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Oc.setFromEuler(this),this.setFromQuaternion(Oc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}fi.DEFAULT_ORDER="XYZ";class gu{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Rf=0;const kc=new A,ns=new Ki,ni=new rt,Tr=new A,Fs=new A,Cf=new A,Pf=new Ki,Fc=new A(1,0,0),Bc=new A(0,1,0),Hc=new A(0,0,1),zc={type:"added"},Lf={type:"removed"},is={type:"childadded",child:null},jo={type:"childremoved",child:null};class Tt extends qi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Rf++}),this.uuid=zn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Tt.DEFAULT_UP.clone();const e=new A,t=new fi,n=new Ki,s=new A(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new rt},normalMatrix:{value:new tt}}),this.matrix=new rt,this.matrixWorld=new rt,this.matrixAutoUpdate=Tt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new gu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ns.setFromAxisAngle(e,t),this.quaternion.multiply(ns),this}rotateOnWorldAxis(e,t){return ns.setFromAxisAngle(e,t),this.quaternion.premultiply(ns),this}rotateX(e){return this.rotateOnAxis(Fc,e)}rotateY(e){return this.rotateOnAxis(Bc,e)}rotateZ(e){return this.rotateOnAxis(Hc,e)}translateOnAxis(e,t){return kc.copy(e).applyQuaternion(this.quaternion),this.position.add(kc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Fc,e)}translateY(e){return this.translateOnAxis(Bc,e)}translateZ(e){return this.translateOnAxis(Hc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ni.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Tr.copy(e):Tr.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),Fs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ni.lookAt(Fs,Tr,this.up):ni.lookAt(Tr,Fs,this.up),this.quaternion.setFromRotationMatrix(ni),s&&(ni.extractRotation(s.matrixWorld),ns.setFromRotationMatrix(ni),this.quaternion.premultiply(ns.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(ht("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(zc),is.child=e,this.dispatchEvent(is),is.child=null):ht("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Lf),jo.child=e,this.dispatchEvent(jo),jo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ni.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ni.multiply(e.parent.matrixWorld)),e.applyMatrix4(ni),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(zc),is.child=e,this.dispatchEvent(is),is.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fs,e,Cf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fs,Pf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){const s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){const r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];r(e.shapes,d)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),d=o(e.shapes),u=o(e.skeletons),f=o(e.animations),m=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}}Tt.DEFAULT_UP=new A(0,1,0);Tt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class yt extends Tt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Df={type:"move"};class Qo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new yt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new yt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new A,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new A),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new yt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new A,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new A,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const x of e.hand.values()){const g=t.getJointPose(x,n),p=this._getHandJoint(c,x);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&u>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Df)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new yt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const vu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mi={h:0,s:0,l:0},Ar={h:0,s:0,l:0};function $o(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class pe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=dn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ut.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=ut.workingColorSpace){return this.r=e,this.g=t,this.b=n,ut.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=ut.workingColorSpace){if(e=Yl(e,1),t=at(t,0,1),n=at(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=$o(o,r,e+1/3),this.g=$o(o,r,e),this.b=$o(o,r,e-1/3)}return ut.colorSpaceToWorking(this,s),this}setStyle(e,t=dn){function n(r){r!==void 0&&parseFloat(r)<1&&Ze("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ze("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ze("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=dn){const n=vu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ze("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=hi(e.r),this.g=hi(e.g),this.b=hi(e.b),this}copyLinearToSRGB(e){return this.r=_s(e.r),this.g=_s(e.g),this.b=_s(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=dn){return ut.workingToColorSpace(ln.copy(this),e),Math.round(at(ln.r*255,0,255))*65536+Math.round(at(ln.g*255,0,255))*256+Math.round(at(ln.b*255,0,255))}getHexString(e=dn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ut.workingColorSpace){ut.workingToColorSpace(ln.copy(this),t);const n=ln.r,s=ln.g,r=ln.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=ut.workingColorSpace){return ut.workingToColorSpace(ln.copy(this),t),e.r=ln.r,e.g=ln.g,e.b=ln.b,e}getStyle(e=dn){ut.workingToColorSpace(ln.copy(this),e);const t=ln.r,n=ln.g,s=ln.b;return e!==dn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(Mi),this.setHSL(Mi.h+e,Mi.s+t,Mi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Mi),e.getHSL(Ar);const n=ir(Mi.h,Ar.h,t),s=ir(Mi.s,Ar.s,t),r=ir(Mi.l,Ar.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const ln=new pe;pe.NAMES=vu;class Zi{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new pe(e),this.density=t}clone(){return new Zi(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Ji extends Tt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new fi,this.environmentIntensity=1,this.environmentRotation=new fi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ln=new A,ii=new A,ea=new A,si=new A,ss=new A,rs=new A,Vc=new A,ta=new A,na=new A,ia=new A,sa=new vt,ra=new vt,oa=new vt;class Tn{constructor(e=new A,t=new A,n=new A){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Ln.subVectors(e,t),s.cross(Ln);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Ln.subVectors(s,t),ii.subVectors(n,t),ea.subVectors(e,t);const o=Ln.dot(Ln),a=Ln.dot(ii),l=Ln.dot(ea),c=ii.dot(ii),h=ii.dot(ea),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;const u=1/d,f=(c*l-a*h)*u,m=(o*h-a*l)*u;return r.set(1-f-m,m,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,si)===null?!1:si.x>=0&&si.y>=0&&si.x+si.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,si)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,si.x),l.addScaledVector(o,si.y),l.addScaledVector(a,si.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return sa.setScalar(0),ra.setScalar(0),oa.setScalar(0),sa.fromBufferAttribute(e,t),ra.fromBufferAttribute(e,n),oa.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(sa,r.x),o.addScaledVector(ra,r.y),o.addScaledVector(oa,r.z),o}static isFrontFacing(e,t,n,s){return Ln.subVectors(n,t),ii.subVectors(e,t),Ln.cross(ii).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ln.subVectors(this.c,this.b),ii.subVectors(this.a,this.b),Ln.cross(ii).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Tn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Tn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return Tn.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return Tn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Tn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let o,a;ss.subVectors(s,n),rs.subVectors(r,n),ta.subVectors(e,n);const l=ss.dot(ta),c=rs.dot(ta);if(l<=0&&c<=0)return t.copy(n);na.subVectors(e,s);const h=ss.dot(na),d=rs.dot(na);if(h>=0&&d<=h)return t.copy(s);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(ss,o);ia.subVectors(e,r);const f=ss.dot(ia),m=rs.dot(ia);if(m>=0&&f<=m)return t.copy(r);const x=f*c-l*m;if(x<=0&&c>=0&&m<=0)return a=c/(c-m),t.copy(n).addScaledVector(rs,a);const g=h*m-f*d;if(g<=0&&d-h>=0&&f-m>=0)return Vc.subVectors(r,s),a=(d-h)/(d-h+(f-m)),t.copy(s).addScaledVector(Vc,a);const p=1/(g+x+u);return o=x*p,a=u*p,t.copy(n).addScaledVector(ss,o).addScaledVector(rs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Is{constructor(e=new A(1/0,1/0,1/0),t=new A(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Dn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Dn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Dn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Dn):Dn.fromBufferAttribute(r,o),Dn.applyMatrix4(e.matrixWorld),this.expandByPoint(Dn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Rr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Rr.copy(n.boundingBox)),Rr.applyMatrix4(e.matrixWorld),this.union(Rr)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Dn),Dn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Bs),Cr.subVectors(this.max,Bs),os.subVectors(e.a,Bs),as.subVectors(e.b,Bs),ls.subVectors(e.c,Bs),wi.subVectors(as,os),yi.subVectors(ls,as),Ui.subVectors(os,ls);let t=[0,-wi.z,wi.y,0,-yi.z,yi.y,0,-Ui.z,Ui.y,wi.z,0,-wi.x,yi.z,0,-yi.x,Ui.z,0,-Ui.x,-wi.y,wi.x,0,-yi.y,yi.x,0,-Ui.y,Ui.x,0];return!aa(t,os,as,ls,Cr)||(t=[1,0,0,0,1,0,0,0,1],!aa(t,os,as,ls,Cr))?!1:(Pr.crossVectors(wi,yi),t=[Pr.x,Pr.y,Pr.z],aa(t,os,as,ls,Cr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Dn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Dn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ri[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ri[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ri[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ri[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ri[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ri[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ri[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ri[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ri),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const ri=[new A,new A,new A,new A,new A,new A,new A,new A],Dn=new A,Rr=new Is,os=new A,as=new A,ls=new A,wi=new A,yi=new A,Ui=new A,Bs=new A,Cr=new A,Pr=new A,Oi=new A;function aa(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Oi.fromArray(i,r);const a=s.x*Math.abs(Oi.x)+s.y*Math.abs(Oi.y)+s.z*Math.abs(Oi.z),l=e.dot(Oi),c=t.dot(Oi),h=n.dot(Oi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const Ft=new A,Lr=new ae;let If=0;class pn extends qi{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:If++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=El,this.updateRanges=[],this.gpuType=Fn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Lr.fromBufferAttribute(this,t),Lr.applyMatrix3(e),this.setXY(t,Lr.x,Lr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyMatrix3(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyMatrix4(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.applyNormalMatrix(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ft.fromBufferAttribute(this,t),Ft.transformDirection(e),this.setXYZ(t,Ft.x,Ft.y,Ft.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=kn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Mt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=kn(t,this.array)),t}setX(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=kn(t,this.array)),t}setY(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=kn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=kn(t,this.array)),t}setW(e,t){return this.normalized&&(t=Mt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),s=Mt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),s=Mt(s,this.array),r=Mt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==El&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Ro extends pn{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class xu extends pn{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class $e extends pn{constructor(e,t,n){super(new Float32Array(e),t,n)}}const Nf=new Is,Hs=new A,la=new A;class Pi{constructor(e=new A,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Nf.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Hs.subVectors(e,this.center);const t=Hs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Hs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(la.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Hs.copy(e.center).add(la)),this.expandByPoint(Hs.copy(e.center).sub(la))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Uf=0;const En=new rt,ca=new Tt,cs=new A,Mn=new Is,zs=new Is,Kt=new A;class At extends qi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Uf++}),this.uuid=zn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new($d(e)?xu:Ro)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new tt().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return En.makeRotationFromQuaternion(e),this.applyMatrix4(En),this}rotateX(e){return En.makeRotationX(e),this.applyMatrix4(En),this}rotateY(e){return En.makeRotationY(e),this.applyMatrix4(En),this}rotateZ(e){return En.makeRotationZ(e),this.applyMatrix4(En),this}translate(e,t,n){return En.makeTranslation(e,t,n),this.applyMatrix4(En),this}scale(e,t,n){return En.makeScale(e,t,n),this.applyMatrix4(En),this}lookAt(e){return ca.lookAt(e),ca.updateMatrix(),this.applyMatrix4(ca.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(cs).negate(),this.translate(cs.x,cs.y,cs.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new $e(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ze("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Is);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ht("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new A(-1/0,-1/0,-1/0),new A(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];Mn.setFromBufferAttribute(r),this.morphTargetsRelative?(Kt.addVectors(this.boundingBox.min,Mn.min),this.boundingBox.expandByPoint(Kt),Kt.addVectors(this.boundingBox.max,Mn.max),this.boundingBox.expandByPoint(Kt)):(this.boundingBox.expandByPoint(Mn.min),this.boundingBox.expandByPoint(Mn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ht('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Pi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ht("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new A,1/0);return}if(e){const n=this.boundingSphere.center;if(Mn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];zs.setFromBufferAttribute(a),this.morphTargetsRelative?(Kt.addVectors(Mn.min,zs.min),Mn.expandByPoint(Kt),Kt.addVectors(Mn.max,zs.max),Mn.expandByPoint(Kt)):(Mn.expandByPoint(zs.min),Mn.expandByPoint(zs.max))}Mn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Kt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Kt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Kt.fromBufferAttribute(a,c),l&&(cs.fromBufferAttribute(e,c),Kt.add(cs)),s=Math.max(s,n.distanceToSquared(Kt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&ht('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){ht("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;let o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new pn(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));const a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new A,l[v]=new A;const c=new A,h=new A,d=new A,u=new ae,f=new ae,m=new ae,x=new A,g=new A;function p(v,E,C){c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,E),d.fromBufferAttribute(n,C),u.fromBufferAttribute(r,v),f.fromBufferAttribute(r,E),m.fromBufferAttribute(r,C),h.sub(c),d.sub(c),f.sub(u),m.sub(u);const P=1/(f.x*m.y-m.x*f.y);isFinite(P)&&(x.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(P),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(P),a[v].add(x),a[E].add(x),a[C].add(x),l[v].add(g),l[E].add(g),l[C].add(g))}let T=this.groups;T.length===0&&(T=[{start:0,count:e.count}]);for(let v=0,E=T.length;v<E;++v){const C=T[v],P=C.start,D=C.count;for(let N=P,z=P+D;N<z;N+=3)p(e.getX(N+0),e.getX(N+1),e.getX(N+2))}const b=new A,w=new A,S=new A,M=new A;function y(v){S.fromBufferAttribute(s,v),M.copy(S);const E=a[v];b.copy(E),b.sub(S.multiplyScalar(S.dot(E))).normalize(),w.crossVectors(M,E);const P=w.dot(l[v])<0?-1:1;o.setXYZW(v,b.x,b.y,b.z,P)}for(let v=0,E=T.length;v<E;++v){const C=T[v],P=C.start,D=C.count;for(let N=P,z=P+D;N<z;N+=3)y(e.getX(N+0)),y(e.getX(N+1)),y(e.getX(N+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new pn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const s=new A,r=new A,o=new A,a=new A,l=new A,c=new A,h=new A,d=new A;if(e)for(let u=0,f=e.count;u<f;u+=3){const m=e.getX(u+0),x=e.getX(u+1),g=e.getX(u+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,x),o.fromBufferAttribute(t,g),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,m),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,f=t.count;u<f;u+=3)s.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),o.fromBufferAttribute(t,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Kt.fromBufferAttribute(e,t),Kt.normalize(),e.setXYZ(t,Kt.x,Kt.y,Kt.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h);let f=0,m=0;for(let x=0,g=l.length;x<g;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let p=0;p<h;p++)u[m++]=c[f++]}return new pn(u,h,d)}if(this.index===null)return Ze("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new At,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=e(l,n);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=e(u,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Of{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=El,this.updateRanges=[],this.version=0,this.uuid=zn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=zn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=zn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const hn=new A;class So{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)hn.fromBufferAttribute(this,t),hn.applyMatrix4(e),this.setXYZ(t,hn.x,hn.y,hn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)hn.fromBufferAttribute(this,t),hn.applyNormalMatrix(e),this.setXYZ(t,hn.x,hn.y,hn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)hn.fromBufferAttribute(this,t),hn.transformDirection(e),this.setXYZ(t,hn.x,hn.y,hn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=kn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Mt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Mt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=kn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=kn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=kn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=kn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),s=Mt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Mt(t,this.array),n=Mt(n,this.array),s=Mt(s,this.array),r=Mt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){_o("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new pn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new So(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){_o("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}let kf=0;class Li extends qi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:kf++}),this.uuid=zn(),this.name="",this.type="Material",this.blending=ws,this.side=Ci,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ka,this.blendDst=Fa,this.blendEquation=On,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new pe(0,0,0),this.blendAlpha=0,this.depthFunc=Ss,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ac,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=$i,this.stencilZFail=$i,this.stencilZPass=$i,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Ze(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ze(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ws&&(n.blending=this.blending),this.side!==Ci&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ka&&(n.blendSrc=this.blendSrc),this.blendDst!==Fa&&(n.blendDst=this.blendDst),this.blendEquation!==On&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ss&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ac&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==$i&&(n.stencilFail=this.stencilFail),this.stencilZFail!==$i&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==$i&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new pe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ae().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ae().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Mu extends Li{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new pe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let hs;const Vs=new A,us=new A,ds=new A,fs=new ae,Gs=new ae,wu=new rt,Dr=new A,Ws=new A,Ir=new A,Gc=new ae,ha=new ae,Wc=new ae;class Ff extends Tt{constructor(e=new Mu){if(super(),this.isSprite=!0,this.type="Sprite",hs===void 0){hs=new At;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Of(t,5);hs.setIndex([0,1,2,0,2,3]),hs.setAttribute("position",new So(n,3,0,!1)),hs.setAttribute("uv",new So(n,2,3,!1))}this.geometry=hs,this.material=e,this.center=new ae(.5,.5),this.count=1}raycast(e,t){e.camera===null&&ht('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),us.setFromMatrixScale(this.matrixWorld),wu.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),ds.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&us.multiplyScalar(-ds.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const o=this.center;Nr(Dr.set(-.5,-.5,0),ds,o,us,s,r),Nr(Ws.set(.5,-.5,0),ds,o,us,s,r),Nr(Ir.set(.5,.5,0),ds,o,us,s,r),Gc.set(0,0),ha.set(1,0),Wc.set(1,1);let a=e.ray.intersectTriangle(Dr,Ws,Ir,!1,Vs);if(a===null&&(Nr(Ws.set(-.5,.5,0),ds,o,us,s,r),ha.set(0,1),a=e.ray.intersectTriangle(Dr,Ir,Ws,!1,Vs),a===null))return;const l=e.ray.origin.distanceTo(Vs);l<e.near||l>e.far||t.push({distance:l,point:Vs.clone(),uv:Tn.getInterpolation(Vs,Dr,Ws,Ir,Gc,ha,Wc,new ae),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function Nr(i,e,t,n,s,r){fs.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(Gs.x=r*fs.x-s*fs.y,Gs.y=s*fs.x+r*fs.y):Gs.copy(fs),i.copy(e),i.x+=Gs.x,i.y+=Gs.y,i.applyMatrix4(wu)}const oi=new A,ua=new A,Ur=new A,_i=new A,da=new A,Or=new A,fa=new A;class Kl{constructor(e=new A,t=new A(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,oi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=oi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(oi.copy(this.origin).addScaledVector(this.direction,t),oi.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){ua.copy(e).add(t).multiplyScalar(.5),Ur.copy(t).sub(e).normalize(),_i.copy(this.origin).sub(ua);const r=e.distanceTo(t)*.5,o=-this.direction.dot(Ur),a=_i.dot(this.direction),l=-_i.dot(Ur),c=_i.lengthSq(),h=Math.abs(1-o*o);let d,u,f,m;if(h>0)if(d=o*l-a,u=o*a-l,m=r*h,d>=0)if(u>=-m)if(u<=m){const x=1/h;d*=x,u*=x,f=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-m?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=m?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(ua).addScaledVector(Ur,u),f}intersectSphere(e,t){oi.subVectors(e.center,this.origin);const n=oi.dot(this.direction),s=oi.dot(oi)-n*n,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(r=(e.min.y-u.y)*h,o=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,o=(e.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(a=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,oi)!==null}intersectTriangle(e,t,n,s,r){da.subVectors(t,e),Or.subVectors(n,e),fa.crossVectors(da,Or);let o=this.direction.dot(fa),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;_i.subVectors(this.origin,e);const l=a*this.direction.dot(Or.crossVectors(_i,Or));if(l<0)return null;const c=a*this.direction.dot(da.cross(_i));if(c<0||l+c>o)return null;const h=-a*_i.dot(fa);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Co extends Li{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new fi,this.combine=Qh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Xc=new rt,ki=new Kl,kr=new Pi,Yc=new A,Fr=new A,Br=new A,Hr=new A,pa=new A,zr=new A,qc=new A,Vr=new A;class qe extends Tt{constructor(e=new At,t=new Co){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){zr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],d=r[l];h!==0&&(pa.fromBufferAttribute(d,e),o?zr.addScaledVector(pa,h):zr.addScaledVector(pa.sub(t),h))}t.add(zr)}return t}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),kr.copy(n.boundingSphere),kr.applyMatrix4(r),ki.copy(e.ray).recast(e.near),!(kr.containsPoint(ki.origin)===!1&&(ki.intersectSphere(kr,Yc)===null||ki.origin.distanceToSquared(Yc)>(e.far-e.near)**2))&&(Xc.copy(r).invert(),ki.copy(e.ray).applyMatrix4(Xc),!(n.boundingBox!==null&&ki.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,ki)))}_computeIntersections(e,t,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,x=u.length;m<x;m++){const g=u[m],p=o[g.materialIndex],T=Math.max(g.start,f.start),b=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let w=T,S=b;w<S;w+=3){const M=a.getX(w),y=a.getX(w+1),v=a.getX(w+2);s=Gr(this,p,e,n,c,h,d,M,y,v),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){const T=a.getX(g),b=a.getX(g+1),w=a.getX(g+2);s=Gr(this,o,e,n,c,h,d,T,b,w),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,x=u.length;m<x;m++){const g=u[m],p=o[g.materialIndex],T=Math.max(g.start,f.start),b=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let w=T,S=b;w<S;w+=3){const M=w,y=w+1,v=w+2;s=Gr(this,p,e,n,c,h,d,M,y,v),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{const m=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){const T=g,b=g+1,w=g+2;s=Gr(this,o,e,n,c,h,d,T,b,w),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}}function Bf(i,e,t,n,s,r,o,a){let l;if(e.side===fn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===Ci,a),l===null)return null;Vr.copy(a),Vr.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Vr);return c<t.near||c>t.far?null:{distance:c,point:Vr.clone(),object:i}}function Gr(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,Fr),i.getVertexPosition(l,Br),i.getVertexPosition(c,Hr);const h=Bf(i,e,t,n,Fr,Br,Hr,qc);if(h){const d=new A;Tn.getBarycoord(qc,Fr,Br,Hr,d),s&&(h.uv=Tn.getInterpolatedAttribute(s,a,l,c,d,new ae)),r&&(h.uv1=Tn.getInterpolatedAttribute(r,a,l,c,d,new ae)),o&&(h.normal=Tn.getInterpolatedAttribute(o,a,l,c,d,new A),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:l,c,normal:new A,materialIndex:0};Tn.getNormal(Fr,Br,Hr,u.normal),h.face=u,h.barycoord=d}return h}const Xs=new vt,Kc=new vt,Zc=new vt,Hf=new vt,Jc=new rt,Wr=new A,ma=new Pi,jc=new rt,ga=new Kl;class va extends qe{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Tc,this.bindMatrix=new rt,this.bindMatrixInverse=new rt,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Is),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Wr),this.boundingBox.expandByPoint(Wr)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Pi),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Wr),this.boundingSphere.expandByPoint(Wr)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ma.copy(this.boundingSphere),ma.applyMatrix4(s),e.ray.intersectsSphere(ma)!==!1&&(jc.copy(s).invert(),ga.copy(e.ray).applyMatrix4(jc),!(this.boundingBox!==null&&ga.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,ga)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new vt,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Tc?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Vd?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ze("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,s=this.geometry;Kc.fromBufferAttribute(s.attributes.skinIndex,e),Zc.fromBufferAttribute(s.attributes.skinWeight,e),t.isVector4?(Xs.copy(t),t.set(0,0,0,0)):(Xs.set(...t,1),t.set(0,0,0)),Xs.applyMatrix4(this.bindMatrix);for(let r=0;r<4;r++){const o=Zc.getComponent(r);if(o!==0){const a=Kc.getComponent(r);Jc.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(Hf.copy(Xs).applyMatrix4(Jc),o)}}return t.isVector4&&(t.w=Xs.w),t.applyMatrix4(this.bindMatrixInverse)}}class yu extends Tt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Po extends en{constructor(e=null,t=1,n=1,s,r,o,a,l,c=Ct,h=Ct,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Qc=new rt,zf=new rt;class Zl{constructor(e=[],t=[]){this.uuid=zn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ze("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new rt)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new rt;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:zf;Qc.multiplyMatrices(a,t[r]),Qc.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new Zl(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Po(t,e,e,yn,Fn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){const r=e.bones[n];let o=t[r];o===void 0&&(Ze("Skeleton: No bone found with UUID:",r),o=new yu),this.bones.push(o),this.boneInverses.push(new rt().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){const o=t[s];e.bones.push(o.uuid);const a=n[s];e.boneInverses.push(a.toArray())}return e}}class xa extends pn{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Ma=new A,Vf=new A,Gf=new tt;class Ei{constructor(e=new A(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=Ma.subVectors(n,t).cross(Vf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const s=e.delta(Ma),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Gf.getNormalMatrix(e),s=this.coplanarPoint(Ma).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Fi=new Pi,Wf=new ae(.5,.5),Xr=new A;class Jl{constructor(e=new Ei,t=new Ei,n=new Ei,s=new Ei,r=new Ei,o=new Ei){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Jn,n=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],m=r[8],x=r[9],g=r[10],p=r[11],T=r[12],b=r[13],w=r[14],S=r[15];if(s[0].setComponents(c-o,f-h,p-m,S-T).normalize(),s[1].setComponents(c+o,f+h,p+m,S+T).normalize(),s[2].setComponents(c+a,f+d,p+x,S+b).normalize(),s[3].setComponents(c-a,f-d,p-x,S-b).normalize(),n)s[4].setComponents(l,u,g,w).normalize(),s[5].setComponents(c-l,f-u,p-g,S-w).normalize();else if(s[4].setComponents(c-l,f-u,p-g,S-w).normalize(),t===Jn)s[5].setComponents(c+l,f+u,p+g,S+w).normalize();else if(t===hr)s[5].setComponents(l,u,g,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Fi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Fi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Fi)}intersectsSprite(e){Fi.center.set(0,0,0);const t=Wf.distanceTo(e.center);return Fi.radius=.7071067811865476+t,Fi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Fi)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(Xr.x=s.normal.x>0?e.max.x:e.min.x,Xr.y=s.normal.y>0?e.max.y:e.min.y,Xr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Xr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Xf extends Li{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new pe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const $c=new rt,Tl=new Kl,Yr=new Pi,qr=new A;class Yf extends Tt{constructor(e=new At,t=new Xf){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Yr.copy(n.boundingSphere),Yr.applyMatrix4(s),Yr.radius+=r,e.ray.intersectsSphere(Yr)===!1)return;$c.copy(s).invert(),Tl.copy(e.ray).applyMatrix4($c);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){const u=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let m=u,x=f;m<x;m++){const g=c.getX(m);qr.fromBufferAttribute(d,g),eh(qr,g,l,s,e,t,this)}}else{const u=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let m=u,x=f;m<x;m++)qr.fromBufferAttribute(d,m),eh(qr,m,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function eh(i,e,t,n,s,r,o){const a=Tl.distanceSqToPoint(i);if(a<t){const l=new A;Tl.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class _u extends en{constructor(e=[],t=Vi,n,s,r,o,a,l,c,h){super(e,t,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Su extends en{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Wi extends en{constructor(e,t,n=$n,s,r,o,a=Ct,l=Ct,c,h=di,d=1){if(h!==di&&h!==Ai)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new ql(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class qf extends Wi{constructor(e,t=$n,n=Vi,s,r,o=Ct,a=Ct,l,c=di){const h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class bu extends en{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Sn extends At{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],d=[];let u=0,f=0;m("z","y","x",-1,-1,n,t,e,o,r,0),m("z","y","x",1,-1,n,t,-e,o,r,1),m("x","z","y",1,1,e,n,t,s,o,2),m("x","z","y",1,-1,e,n,-t,s,o,3),m("x","y","z",1,-1,e,t,n,s,r,4),m("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new $e(c,3)),this.setAttribute("normal",new $e(h,3)),this.setAttribute("uv",new $e(d,2));function m(x,g,p,T,b,w,S,M,y,v,E){const C=w/y,P=S/v,D=w/2,N=S/2,z=M/2,I=y+1,V=v+1;let O=0,G=0;const q=new A;for(let re=0;re<V;re++){const ne=re*P-N;for(let ce=0;ce<I;ce++){const Te=ce*C-D;q[x]=Te*T,q[g]=ne*b,q[p]=z,c.push(q.x,q.y,q.z),q[x]=0,q[g]=0,q[p]=M>0?1:-1,h.push(q.x,q.y,q.z),d.push(ce/y),d.push(1-re/v),O+=1}}for(let re=0;re<v;re++)for(let ne=0;ne<y;ne++){const ce=u+ne+I*re,Te=u+ne+I*(re+1),J=u+(ne+1)+I*(re+1),se=u+(ne+1)+I*re;l.push(ce,Te,se),l.push(Te,J,se),G+=6}a.addGroup(f,G,E),f+=G,u+=O}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Sn(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vr extends At{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);const r=[],o=[],a=[],l=[],c=new A,h=new ae;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=t;d++,u+=3){const f=n+d/t*s;c.x=e*Math.cos(f),c.y=e*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[u]/e+1)/2,h.y=(o[u+1]/e+1)/2,l.push(h.x,h.y)}for(let d=1;d<=t;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new $e(o,3)),this.setAttribute("normal",new $e(a,3)),this.setAttribute("uv",new $e(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vr(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class Cn extends At{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const h=[],d=[],u=[],f=[];let m=0;const x=[],g=n/2;let p=0;T(),o===!1&&(e>0&&b(!0),t>0&&b(!1)),this.setIndex(h),this.setAttribute("position",new $e(d,3)),this.setAttribute("normal",new $e(u,3)),this.setAttribute("uv",new $e(f,2));function T(){const w=new A,S=new A;let M=0;const y=(t-e)/n;for(let v=0;v<=r;v++){const E=[],C=v/r,P=C*(t-e)+e;for(let D=0;D<=s;D++){const N=D/s,z=N*l+a,I=Math.sin(z),V=Math.cos(z);S.x=P*I,S.y=-C*n+g,S.z=P*V,d.push(S.x,S.y,S.z),w.set(I,y,V).normalize(),u.push(w.x,w.y,w.z),f.push(N,1-C),E.push(m++)}x.push(E)}for(let v=0;v<s;v++)for(let E=0;E<r;E++){const C=x[E][v],P=x[E+1][v],D=x[E+1][v+1],N=x[E][v+1];(e>0||E!==0)&&(h.push(C,P,N),M+=3),(t>0||E!==r-1)&&(h.push(P,D,N),M+=3)}c.addGroup(p,M,0),p+=M}function b(w){const S=m,M=new ae,y=new A;let v=0;const E=w===!0?e:t,C=w===!0?1:-1;for(let D=1;D<=s;D++)d.push(0,g*C,0),u.push(0,C,0),f.push(.5,.5),m++;const P=m;for(let D=0;D<=s;D++){const z=D/s*l+a,I=Math.cos(z),V=Math.sin(z);y.x=E*V,y.y=g*C,y.z=E*I,d.push(y.x,y.y,y.z),u.push(0,C,0),M.x=I*.5+.5,M.y=V*.5*C+.5,f.push(M.x,M.y),m++}for(let D=0;D<s;D++){const N=S+D,z=P+D;w===!0?h.push(z,z+1,N):h.push(z+1,z,N),v+=3}c.addGroup(p,v,w===!0?1:2),p+=v}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Cn(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class jl extends Cn{constructor(e=1,t=1,n=32,s=1,r=!1,o=0,a=Math.PI*2){super(0,e,t,n,s,r,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(e){return new jl(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class ei{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ze("Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let s=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);const h=n[s],u=n[s+1]-h,f=(o-h)/u;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),l=t||(o.isVector2?new ae:new A);return l.copy(a).sub(o).normalize(),l}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new A,s=[],r=[],o=[],a=new A,l=new rt;for(let f=0;f<=e;f++){const m=f/e;s[f]=this.getTangentAt(m,new A)}r[0]=new A,o[0]=new A;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),d=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),u<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const m=Math.acos(at(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,m))}o[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(at(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(f=-f);for(let m=1;m<=e;m++)r[m].applyMatrix4(l.makeRotationAxis(s[m],f*m)),o[m].crossVectors(s[m],r[m])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class Ql extends ei{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(e,t=new ae){const n=t,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+e*r;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*d+this.aX,c=u*d+f*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class Kf extends Ql{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function $l(){let i=0,e=0,t=0,n=0;function s(r,o,a,l){i=r,e=a,t=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,d){let u=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+d)+(l-a)/d;u*=h,f*=h,s(o,a,u,f)},calc:function(r){const o=r*r,a=o*r;return i+e*r+t*o+n*a}}}const th=new A,nh=new A,wa=new $l,ya=new $l,_a=new $l;class sr extends ei{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new A){const n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(nh.subVectors(s[0],s[1]).add(s[0]),c=nh);const d=s[a%r],u=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(th.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=th),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let m=Math.pow(c.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);x<1e-4&&(x=1),m<1e-4&&(m=x),g<1e-4&&(g=x),wa.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,m,x,g),ya.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,m,x,g),_a.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,m,x,g)}else this.curveType==="catmullrom"&&(wa.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),ya.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),_a.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return n.set(wa.calc(l),ya.calc(l),_a.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new A().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function ih(i,e,t,n,s){const r=(n-e)*.5,o=(s-t)*.5,a=i*i,l=i*a;return(2*t-2*n+r+o)*l+(-3*t+3*n-2*r-o)*a+r*i+t}function Zf(i,e){const t=1-i;return t*t*e}function Jf(i,e){return 2*(1-i)*i*e}function jf(i,e){return i*i*e}function rr(i,e,t,n){return Zf(i,e)+Jf(i,t)+jf(i,n)}function Qf(i,e){const t=1-i;return t*t*t*e}function $f(i,e){const t=1-i;return 3*t*t*i*e}function ep(i,e){return 3*(1-i)*i*i*e}function tp(i,e){return i*i*i*e}function or(i,e,t,n,s){return Qf(i,e)+$f(i,t)+ep(i,n)+tp(i,s)}class Eu extends ei{constructor(e=new ae,t=new ae,n=new ae,s=new ae){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new ae){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(or(e,s.x,r.x,o.x,a.x),or(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class np extends ei{constructor(e=new A,t=new A,n=new A,s=new A){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new A){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(or(e,s.x,r.x,o.x,a.x),or(e,s.y,r.y,o.y,a.y),or(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Tu extends ei{constructor(e=new ae,t=new ae){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ae){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ae){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class ip extends ei{constructor(e=new A,t=new A){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new A){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new A){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Au extends ei{constructor(e=new ae,t=new ae,n=new ae){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ae){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(rr(e,s.x,r.x,o.x),rr(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Ru extends ei{constructor(e=new A,t=new A,n=new A){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new A){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(rr(e,s.x,r.x,o.x),rr(e,s.y,r.y,o.y),rr(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Cu extends ei{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ae){const n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],d=s[o>s.length-3?s.length-1:o+2];return n.set(ih(a,l.x,c.x,h.x,d.x),ih(a,l.y,c.y,h.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new ae().fromArray(s))}return this}}var bo=Object.freeze({__proto__:null,ArcCurve:Kf,CatmullRomCurve3:sr,CubicBezierCurve:Eu,CubicBezierCurve3:np,EllipseCurve:Ql,LineCurve:Tu,LineCurve3:ip,QuadraticBezierCurve:Au,QuadraticBezierCurve3:Ru,SplineCurve:Cu});class sp extends ei{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new bo[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,t)}r++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(new bo[s.type]().fromJSON(s))}return this}}class sh extends sp{constructor(e){super(),this.type="Path",this.currentPoint=new ae,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new Tu(this.currentPoint.clone(),new ae(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){const r=new Au(this.currentPoint.clone(),new ae(e,t),new ae(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,o){const a=new Eu(this.currentPoint.clone(),new ae(e,t),new ae(n,s),new ae(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new Cu(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+a,t+l,n,s,r,o),this}absarc(e,t,n,s,r,o){return this.absellipse(e,t,n,n,s,r,o),this}ellipse(e,t,n,s,r,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,s,r,o,a,l),this}absellipse(e,t,n,s,r,o,a,l){const c=new Ql(e,t,n,s,r,o,a,l);if(this.curves.length>0){const d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class ec extends sh{constructor(e){super(e),this.uuid=zn(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(new sh().fromJSON(s))}return this}}function rp(i,e,t=2){const n=e&&e.length,s=n?e[0]*t:i.length;let r=Pu(i,0,s,t,!0);const o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=hp(i,e,r,t)),i.length>80*t){a=i[0],l=i[1];let h=a,d=l;for(let u=t;u<s;u+=t){const f=i[u],m=i[u+1];f<a&&(a=f),m<l&&(l=m),f>h&&(h=f),m>d&&(d=m)}c=Math.max(h-a,d-l),c=c!==0?32767/c:0}return ur(r,o,t,a,l,c,0),o}function Pu(i,e,t,n,s){let r;if(s===yp(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=rh(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=rh(o/n|0,i[o],i[o+1],r);return r&&As(r,r.next)&&(fr(r),r=r.next),r}function Xi(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(As(t,t.next)||Rt(t.prev,t,t.next)===0)){if(fr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function ur(i,e,t,n,s,r,o){if(!i)return;!o&&r&&mp(i,n,s,r);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(r?ap(i,n,s,r):op(i)){e.push(l.i,i.i,c.i),fr(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=lp(Xi(i),e),ur(i,e,t,n,s,r,2)):o===2&&cp(i,e,t,n,s,r):ur(Xi(i),e,t,n,s,r,1);break}}}function op(i){const e=i.prev,t=i,n=i.next;if(Rt(e,t,n)>=0)return!1;const s=e.x,r=t.x,o=n.x,a=e.y,l=t.y,c=n.y,h=Math.min(s,r,o),d=Math.min(a,l,c),u=Math.max(s,r,o),f=Math.max(a,l,c);let m=n.next;for(;m!==e;){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&Qs(s,a,r,l,o,c,m.x,m.y)&&Rt(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function ap(i,e,t,n){const s=i.prev,r=i,o=i.next;if(Rt(s,r,o)>=0)return!1;const a=s.x,l=r.x,c=o.x,h=s.y,d=r.y,u=o.y,f=Math.min(a,l,c),m=Math.min(h,d,u),x=Math.max(a,l,c),g=Math.max(h,d,u),p=Al(f,m,e,t,n),T=Al(x,g,e,t,n);let b=i.prevZ,w=i.nextZ;for(;b&&b.z>=p&&w&&w.z<=T;){if(b.x>=f&&b.x<=x&&b.y>=m&&b.y<=g&&b!==s&&b!==o&&Qs(a,h,l,d,c,u,b.x,b.y)&&Rt(b.prev,b,b.next)>=0||(b=b.prevZ,w.x>=f&&w.x<=x&&w.y>=m&&w.y<=g&&w!==s&&w!==o&&Qs(a,h,l,d,c,u,w.x,w.y)&&Rt(w.prev,w,w.next)>=0))return!1;w=w.nextZ}for(;b&&b.z>=p;){if(b.x>=f&&b.x<=x&&b.y>=m&&b.y<=g&&b!==s&&b!==o&&Qs(a,h,l,d,c,u,b.x,b.y)&&Rt(b.prev,b,b.next)>=0)return!1;b=b.prevZ}for(;w&&w.z<=T;){if(w.x>=f&&w.x<=x&&w.y>=m&&w.y<=g&&w!==s&&w!==o&&Qs(a,h,l,d,c,u,w.x,w.y)&&Rt(w.prev,w,w.next)>=0)return!1;w=w.nextZ}return!0}function lp(i,e){let t=i;do{const n=t.prev,s=t.next.next;!As(n,s)&&Du(n,t,t.next,s)&&dr(n,s)&&dr(s,n)&&(e.push(n.i,t.i,s.i),fr(t),fr(t.next),t=i=s),t=t.next}while(t!==i);return Xi(t)}function cp(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&xp(o,a)){let l=Iu(o,a);o=Xi(o,o.next),l=Xi(l,l.next),ur(o,e,t,n,s,r,0),ur(l,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function hp(i,e,t,n){const s=[];for(let r=0,o=e.length;r<o;r++){const a=e[r]*n,l=r<o-1?e[r+1]*n:i.length,c=Pu(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(vp(c))}s.sort(up);for(let r=0;r<s.length;r++)t=dp(s[r],t);return t}function up(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function dp(i,e){const t=fp(i,e);if(!t)return e;const n=Iu(t,i);return Xi(n,n.next),Xi(t,t.next)}function fp(i,e){let t=e;const n=i.x,s=i.y;let r=-1/0,o;if(As(i,t))return t;do{if(As(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){const d=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>r&&(r=d,o=t.x<t.next.x?t:t.next,d===n))return o}t=t.next}while(t!==e);if(!o)return null;const a=o,l=o.x,c=o.y;let h=1/0;t=o;do{if(n>=t.x&&t.x>=l&&n!==t.x&&Lu(s<c?n:r,s,l,c,s<c?r:n,s,t.x,t.y)){const d=Math.abs(s-t.y)/(n-t.x);dr(t,i)&&(d<h||d===h&&(t.x>o.x||t.x===o.x&&pp(o,t)))&&(o=t,h=d)}t=t.next}while(t!==a);return o}function pp(i,e){return Rt(i.prev,i,e.prev)<0&&Rt(e.next,i,i.next)<0}function mp(i,e,t,n){let s=i;do s.z===0&&(s.z=Al(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,gp(s)}function gp(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let c=0;c<t&&(a++,o=o.nextZ,!!o);c++);let l=t;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}function Al(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function vp(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Lu(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}function Qs(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&Lu(i,e,t,n,s,r,o,a)}function xp(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!Mp(i,e)&&(dr(i,e)&&dr(e,i)&&wp(i,e)&&(Rt(i.prev,i,e.prev)||Rt(i,e.prev,e))||As(i,e)&&Rt(i.prev,i,i.next)>0&&Rt(e.prev,e,e.next)>0)}function Rt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function As(i,e){return i.x===e.x&&i.y===e.y}function Du(i,e,t,n){const s=Zr(Rt(i,e,t)),r=Zr(Rt(i,e,n)),o=Zr(Rt(t,n,i)),a=Zr(Rt(t,n,e));return!!(s!==r&&o!==a||s===0&&Kr(i,t,e)||r===0&&Kr(i,n,e)||o===0&&Kr(t,i,n)||a===0&&Kr(t,e,n))}function Kr(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function Zr(i){return i>0?1:i<0?-1:0}function Mp(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Du(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function dr(i,e){return Rt(i.prev,i,i.next)<0?Rt(i,e,i.next)>=0&&Rt(i,i.prev,e)>=0:Rt(i,e,i.prev)<0||Rt(i,i.next,e)<0}function wp(i,e){let t=i,n=!1;const s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Iu(i,e){const t=Rl(i.i,i.x,i.y),n=Rl(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function rh(i,e,t,n){const s=Rl(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function fr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Rl(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function yp(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class _p{static triangulate(e,t,n=2){return rp(e,t,n)}}class Ms{static area(e){const t=e.length;let n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return Ms.area(e)<0}static triangulateShape(e,t){const n=[],s=[],r=[];oh(e),ah(n,e);let o=e.length;t.forEach(oh);for(let l=0;l<t.length;l++)s.push(o),o+=t[l].length,ah(n,t[l]);const a=_p.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}}function oh(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function ah(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class Lo extends At{constructor(e=new ec([new ae(.5,.5),new ae(-.5,.5),new ae(-.5,-.5),new ae(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,s=[],r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];o(c)}this.setAttribute("position",new $e(s,3)),this.setAttribute("uv",new $e(r,2)),this.computeVertexNormals();function o(a){const l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,d=t.depth!==void 0?t.depth:1;let u=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,m=t.bevelSize!==void 0?t.bevelSize:f-.1,x=t.bevelOffset!==void 0?t.bevelOffset:0,g=t.bevelSegments!==void 0?t.bevelSegments:3;const p=t.extrudePath,T=t.UVGenerator!==void 0?t.UVGenerator:Sp;let b,w=!1,S,M,y,v;if(p){b=p.getSpacedPoints(h),w=!0,u=!1;const te=p.isCatmullRomCurve3?p.closed:!1;S=p.computeFrenetFrames(h,te),M=new A,y=new A,v=new A}u||(g=0,f=0,m=0,x=0);const E=a.extractPoints(c);let C=E.shape;const P=E.holes;if(!Ms.isClockWise(C)){C=C.reverse();for(let te=0,j=P.length;te<j;te++){const oe=P[te];Ms.isClockWise(oe)&&(P[te]=oe.reverse())}}function N(te){const oe=10000000000000001e-36;let Me=te[0];for(let Se=1;Se<=te.length;Se++){const Ve=Se%te.length,Fe=te[Ve],Ke=Fe.x-Me.x,Je=Fe.y-Me.y,U=Ke*Ke+Je*Je,dt=Math.max(Math.abs(Fe.x),Math.abs(Fe.y),Math.abs(Me.x),Math.abs(Me.y)),nt=oe*dt*dt;if(U<=nt){te.splice(Ve,1),Se--;continue}Me=Fe}}N(C),P.forEach(N);const z=P.length,I=C;for(let te=0;te<z;te++){const j=P[te];C=C.concat(j)}function V(te,j,oe){return j||ht("ExtrudeGeometry: vec does not exist"),te.clone().addScaledVector(j,oe)}const O=C.length;function G(te,j,oe){let Me,Se,Ve;const Fe=te.x-j.x,Ke=te.y-j.y,Je=oe.x-te.x,U=oe.y-te.y,dt=Fe*Fe+Ke*Ke,nt=Fe*U-Ke*Je;if(Math.abs(nt)>Number.EPSILON){const L=Math.sqrt(dt),_=Math.sqrt(Je*Je+U*U),B=j.x-Ke/L,Y=j.y+Fe/L,$=oe.x-U/_,fe=oe.y+Je/_,ge=(($-B)*U-(fe-Y)*Je)/(Fe*U-Ke*Je);Me=B+Fe*ge-te.x,Se=Y+Ke*ge-te.y;const ee=Me*Me+Se*Se;if(ee<=2)return new ae(Me,Se);Ve=Math.sqrt(ee/2)}else{let L=!1;Fe>Number.EPSILON?Je>Number.EPSILON&&(L=!0):Fe<-Number.EPSILON?Je<-Number.EPSILON&&(L=!0):Math.sign(Ke)===Math.sign(U)&&(L=!0),L?(Me=-Ke,Se=Fe,Ve=Math.sqrt(dt)):(Me=Fe,Se=Ke,Ve=Math.sqrt(dt/2))}return new ae(Me/Ve,Se/Ve)}const q=[];for(let te=0,j=I.length,oe=j-1,Me=te+1;te<j;te++,oe++,Me++)oe===j&&(oe=0),Me===j&&(Me=0),q[te]=G(I[te],I[oe],I[Me]);const re=[];let ne,ce=q.concat();for(let te=0,j=z;te<j;te++){const oe=P[te];ne=[];for(let Me=0,Se=oe.length,Ve=Se-1,Fe=Me+1;Me<Se;Me++,Ve++,Fe++)Ve===Se&&(Ve=0),Fe===Se&&(Fe=0),ne[Me]=G(oe[Me],oe[Ve],oe[Fe]);re.push(ne),ce=ce.concat(ne)}let Te;if(g===0)Te=Ms.triangulateShape(I,P);else{const te=[],j=[];for(let oe=0;oe<g;oe++){const Me=oe/g,Se=f*Math.cos(Me*Math.PI/2),Ve=m*Math.sin(Me*Math.PI/2)+x;for(let Fe=0,Ke=I.length;Fe<Ke;Fe++){const Je=V(I[Fe],q[Fe],Ve);he(Je.x,Je.y,-Se),Me===0&&te.push(Je)}for(let Fe=0,Ke=z;Fe<Ke;Fe++){const Je=P[Fe];ne=re[Fe];const U=[];for(let dt=0,nt=Je.length;dt<nt;dt++){const L=V(Je[dt],ne[dt],Ve);he(L.x,L.y,-Se),Me===0&&U.push(L)}Me===0&&j.push(U)}}Te=Ms.triangulateShape(te,j)}const J=Te.length,se=m+x;for(let te=0;te<O;te++){const j=u?V(C[te],ce[te],se):C[te];w?(y.copy(S.normals[0]).multiplyScalar(j.x),M.copy(S.binormals[0]).multiplyScalar(j.y),v.copy(b[0]).add(y).add(M),he(v.x,v.y,v.z)):he(j.x,j.y,0)}for(let te=1;te<=h;te++)for(let j=0;j<O;j++){const oe=u?V(C[j],ce[j],se):C[j];w?(y.copy(S.normals[te]).multiplyScalar(oe.x),M.copy(S.binormals[te]).multiplyScalar(oe.y),v.copy(b[te]).add(y).add(M),he(v.x,v.y,v.z)):he(oe.x,oe.y,d/h*te)}for(let te=g-1;te>=0;te--){const j=te/g,oe=f*Math.cos(j*Math.PI/2),Me=m*Math.sin(j*Math.PI/2)+x;for(let Se=0,Ve=I.length;Se<Ve;Se++){const Fe=V(I[Se],q[Se],Me);he(Fe.x,Fe.y,d+oe)}for(let Se=0,Ve=P.length;Se<Ve;Se++){const Fe=P[Se];ne=re[Se];for(let Ke=0,Je=Fe.length;Ke<Je;Ke++){const U=V(Fe[Ke],ne[Ke],Me);w?he(U.x,U.y+b[h-1].y,b[h-1].x+oe):he(U.x,U.y,d+oe)}}}k(),X();function k(){const te=s.length/3;if(u){let j=0,oe=O*j;for(let Me=0;Me<J;Me++){const Se=Te[Me];ue(Se[2]+oe,Se[1]+oe,Se[0]+oe)}j=h+g*2,oe=O*j;for(let Me=0;Me<J;Me++){const Se=Te[Me];ue(Se[0]+oe,Se[1]+oe,Se[2]+oe)}}else{for(let j=0;j<J;j++){const oe=Te[j];ue(oe[2],oe[1],oe[0])}for(let j=0;j<J;j++){const oe=Te[j];ue(oe[0]+O*h,oe[1]+O*h,oe[2]+O*h)}}n.addGroup(te,s.length/3-te,0)}function X(){const te=s.length/3;let j=0;W(I,j),j+=I.length;for(let oe=0,Me=P.length;oe<Me;oe++){const Se=P[oe];W(Se,j),j+=Se.length}n.addGroup(te,s.length/3-te,1)}function W(te,j){let oe=te.length;for(;--oe>=0;){const Me=oe;let Se=oe-1;Se<0&&(Se=te.length-1);for(let Ve=0,Fe=h+g*2;Ve<Fe;Ve++){const Ke=O*Ve,Je=O*(Ve+1),U=j+Me+Ke,dt=j+Se+Ke,nt=j+Se+Je,L=j+Me+Je;Ue(U,dt,nt,L)}}}function he(te,j,oe){l.push(te),l.push(j),l.push(oe)}function ue(te,j,oe){et(te),et(j),et(oe);const Me=s.length/3,Se=T.generateTopUV(n,s,Me-3,Me-2,Me-1);_e(Se[0]),_e(Se[1]),_e(Se[2])}function Ue(te,j,oe,Me){et(te),et(j),et(Me),et(j),et(oe),et(Me);const Se=s.length/3,Ve=T.generateSideWallUV(n,s,Se-6,Se-3,Se-2,Se-1);_e(Ve[0]),_e(Ve[1]),_e(Ve[3]),_e(Ve[1]),_e(Ve[2]),_e(Ve[3])}function et(te){s.push(l[te*3+0]),s.push(l[te*3+1]),s.push(l[te*3+2])}function _e(te){r.push(te.x),r.push(te.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return bp(t,n,e)}static fromJSON(e,t){const n=[];for(let r=0,o=e.shapes.length;r<o;r++){const a=t[e.shapes[r]];n.push(a)}const s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new bo[s.type]().fromJSON(s)),new Lo(n,e.options)}}const Sp={generateTopUV:function(i,e,t,n,s){const r=e[t*3],o=e[t*3+1],a=e[n*3],l=e[n*3+1],c=e[s*3],h=e[s*3+1];return[new ae(r,o),new ae(a,l),new ae(c,h)]},generateSideWallUV:function(i,e,t,n,s,r){const o=e[t*3],a=e[t*3+1],l=e[t*3+2],c=e[n*3],h=e[n*3+1],d=e[n*3+2],u=e[s*3],f=e[s*3+1],m=e[s*3+2],x=e[r*3],g=e[r*3+1],p=e[r*3+2];return Math.abs(a-h)<Math.abs(o-c)?[new ae(o,1-l),new ae(c,1-d),new ae(u,1-m),new ae(x,1-p)]:[new ae(a,1-l),new ae(h,1-d),new ae(f,1-m),new ae(g,1-p)]}};function bp(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){const r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class Gt extends At{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=e/a,u=t/l,f=[],m=[],x=[],g=[];for(let p=0;p<h;p++){const T=p*u-o;for(let b=0;b<c;b++){const w=b*d-r;m.push(w,-T,0),x.push(0,0,1),g.push(b/a),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let T=0;T<a;T++){const b=T+c*p,w=T+c*(p+1),S=T+1+c*(p+1),M=T+1+c*p;f.push(b,w,M),f.push(w,S,M)}this.setIndex(f),this.setAttribute("position",new $e(m,3)),this.setAttribute("normal",new $e(x,3)),this.setAttribute("uv",new $e(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Gt(e.width,e.height,e.widthSegments,e.heightSegments)}}class Wt extends At{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],d=new A,u=new A,f=[],m=[],x=[],g=[];for(let p=0;p<=n;p++){const T=[],b=p/n,w=o+b*a,S=e*Math.cos(w),M=Math.sqrt(e*e-S*S);let y=0;p===0&&o===0?y=.5/t:p===n&&l===Math.PI&&(y=-.5/t);for(let v=0;v<=t;v++){const E=v/t,C=s+E*r;d.x=-M*Math.cos(C),d.y=S,d.z=M*Math.sin(C),m.push(d.x,d.y,d.z),u.copy(d).normalize(),x.push(u.x,u.y,u.z),g.push(E+y,1-b),T.push(c++)}h.push(T)}for(let p=0;p<n;p++)for(let T=0;T<t;T++){const b=h[p][T+1],w=h[p][T],S=h[p+1][T],M=h[p+1][T+1];(p!==0||o>0)&&f.push(b,w,M),(p!==n-1||l<Math.PI)&&f.push(w,S,M)}this.setIndex(f),this.setAttribute("position",new $e(m,3)),this.setAttribute("normal",new $e(x,3)),this.setAttribute("uv",new $e(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Wt(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Do extends At{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);const l=[],c=[],h=[],d=[],u=new A,f=new A,m=new A;for(let x=0;x<=n;x++){const g=o+x/n*a;for(let p=0;p<=s;p++){const T=p/s*r;f.x=(e+t*Math.cos(g))*Math.cos(T),f.y=(e+t*Math.cos(g))*Math.sin(T),f.z=t*Math.sin(g),c.push(f.x,f.y,f.z),u.x=e*Math.cos(T),u.y=e*Math.sin(T),m.subVectors(f,u).normalize(),h.push(m.x,m.y,m.z),d.push(p/s),d.push(x/n)}}for(let x=1;x<=n;x++)for(let g=1;g<=s;g++){const p=(s+1)*x+g-1,T=(s+1)*(x-1)+g-1,b=(s+1)*(x-1)+g,w=(s+1)*x+g;l.push(p,T,w),l.push(T,b,w)}this.setIndex(l),this.setAttribute("position",new $e(c,3)),this.setAttribute("normal",new $e(h,3)),this.setAttribute("uv",new $e(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Do(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class ar extends At{constructor(e=new Ru(new A(-1,-1,0),new A(-1,1,0),new A(1,1,0)),t=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:s,closed:r};const o=e.computeFrenetFrames(t,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new A,l=new A,c=new ae;let h=new A;const d=[],u=[],f=[],m=[];x(),this.setIndex(m),this.setAttribute("position",new $e(d,3)),this.setAttribute("normal",new $e(u,3)),this.setAttribute("uv",new $e(f,2));function x(){for(let b=0;b<t;b++)g(b);g(r===!1?t:0),T(),p()}function g(b){h=e.getPointAt(b/t,h);const w=o.normals[b],S=o.binormals[b];for(let M=0;M<=s;M++){const y=M/s*Math.PI*2,v=Math.sin(y),E=-Math.cos(y);l.x=E*w.x+v*S.x,l.y=E*w.y+v*S.y,l.z=E*w.z+v*S.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=h.x+n*l.x,a.y=h.y+n*l.y,a.z=h.z+n*l.z,d.push(a.x,a.y,a.z)}}function p(){for(let b=1;b<=t;b++)for(let w=1;w<=s;w++){const S=(s+1)*(b-1)+(w-1),M=(s+1)*b+(w-1),y=(s+1)*b+w,v=(s+1)*(b-1)+w;m.push(S,M,v),m.push(M,y,v)}}function T(){for(let b=0;b<=t;b++)for(let w=0;w<=s;w++)c.x=b/t,c.y=w/s,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new ar(new bo[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}function Rs(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];if(lh(s))s.isRenderTargetTexture?(Ze("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(lh(s[0])){const r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function un(i){const e={};for(let t=0;t<i.length;t++){const n=Rs(i[t]);for(const s in n)e[s]=n[s]}return e}function lh(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Ep(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Nu(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ut.workingColorSpace}const An={clone:Rs,merge:un};var Tp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ap=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ft extends Li{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Tp,this.fragmentShader=Ap,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Rs(e.uniforms),this.uniformsGroups=Ep(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const n in e.uniforms){const s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new pe().setHex(s.value);break;case"v2":this.uniforms[n].value=new ae().fromArray(s.value);break;case"v3":this.uniforms[n].value=new A().fromArray(s.value);break;case"v4":this.uniforms[n].value=new vt().fromArray(s.value);break;case"m3":this.uniforms[n].value=new tt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new rt().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Rp extends ft{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class _n extends Li{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new pe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new pe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=xo,this.normalScale=new ae(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new fi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Xt extends _n{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ae(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return at(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new pe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new pe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new pe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class Uu extends Li{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=xo,this.normalScale=new ae(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}}class Ou extends Li{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Wd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Cp extends Li{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Io extends Tt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new pe(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class Ns extends Io{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new pe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Sa=new rt,ch=new A,hh=new A;class tc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ae(512,512),this.mapType=cn,this.map=null,this.mapPass=null,this.matrix=new rt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Jl,this._frameExtents=new ae(1,1),this._viewportCount=1,this._viewports=[new vt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;ch.setFromMatrixPosition(e.matrixWorld),t.position.copy(ch),hh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(hh),t.updateMatrixWorld(),Sa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Sa,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===hr||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Sa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Jr=new A,jr=new Ki,Yn=new A;class ku extends Tt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rt,this.projectionMatrix=new rt,this.projectionMatrixInverse=new rt,this.coordinateSystem=Jn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Jr,jr,Yn),Yn.x===1&&Yn.y===1&&Yn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jr,jr,Yn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Jr,jr,Yn),Yn.x===1&&Yn.y===1&&Yn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jr,jr,Yn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Si=new A,uh=new ae,dh=new ae;class zt extends ku{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ts*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(nr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ts*2*Math.atan(Math.tan(nr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Si.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Si.x,Si.y).multiplyScalar(-e/Si.z),Si.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Si.x,Si.y).multiplyScalar(-e/Si.z)}getViewSize(e,t){return this.getViewBounds(e,uh,dh),t.subVectors(dh,uh)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(nr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Pp extends tc{constructor(){super(new zt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=Ts*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class Eo extends Io{constructor(e,t,n=0,s=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.target=new Tt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Pp}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class Lp extends tc{constructor(){super(new zt(90,1,.5,500)),this.isPointLightShadow=!0}}class jn extends Io{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Lp}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class No extends ku{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Dp extends tc{constructor(){super(new No(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class nc extends Io{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.target=new Tt,this.shadow=new Dp}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class fh extends At{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){const e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}const ps=-90,ms=1;class Ip extends Tt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new zt(ps,ms,e,t);s.layers=this.layers,this.add(s);const r=new zt(ps,ms,e,t);r.layers=this.layers,this.add(r);const o=new zt(ps,ms,e,t);o.layers=this.layers,this.add(o);const a=new zt(ps,ms,e,t);a.layers=this.layers,this.add(a);const l=new zt(ps,ms,e,t);l.layers=this.layers,this.add(l);const c=new zt(ps,ms,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===Jn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===hr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}}class Np extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Up{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Op.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function Op(){this._document.hidden===!1&&this.reset()}class Fu{static{Fu.prototype.isMatrix2=!0}constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){const r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}}function ph(i,e,t,n){const s=kp(n);switch(t){case uu:return i*e;case fu:return i*e/s.components*s.byteLength;case zl:return i*e/s.components*s.byteLength;case Gi:return i*e*2/s.components*s.byteLength;case Vl:return i*e*2/s.components*s.byteLength;case du:return i*e*3/s.components*s.byteLength;case yn:return i*e*4/s.components*s.byteLength;case Gl:return i*e*4/s.components*s.byteLength;case ho:case uo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case fo:case po:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ja:case Qa:return Math.max(i,16)*Math.max(e,8)/4;case Za:case ja:return Math.max(i,8)*Math.max(e,8)/2;case $a:case el:case nl:case il:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case tl:case go:case sl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case rl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ol:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case al:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ll:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case cl:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case hl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case ul:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case dl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case fl:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case pl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case ml:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case gl:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case vl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case xl:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Ml:case wl:case yl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case _l:case Sl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case vo:case bl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function kp(i){switch(i){case cn:case au:return{byteLength:1,components:1};case cr:case lu:case Vt:return{byteLength:2,components:1};case Bl:case Hl:return{byteLength:2,components:4};case $n:case Fl:case Fn:return{byteLength:4,components:1};case cu:case hu:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:kl}}));typeof window<"u"&&(window.__THREE__?Ze("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=kl);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Bu(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Fp(i){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){const h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){const m=d[u],x=d[f];x.start<=m.start+m.count+1?m.count=Math.max(m.count,x.start+x.count-m.start):(++u,d[u]=x)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){const x=d[f];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Bp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Hp=`#ifdef USE_ALPHAHASH
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
#endif`,zp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Vp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Wp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Xp=`#ifdef USE_AOMAP
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
#endif`,Yp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,qp=`#ifdef USE_BATCHING
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
#endif`,Kp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Zp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Jp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,jp=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Qp=`#ifdef USE_IRIDESCENCE
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
#endif`,$p=`#ifdef USE_BUMPMAP
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
#endif`,e0=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,t0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,n0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,i0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,s0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,r0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,o0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,a0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,l0=`#define PI 3.141592653589793
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
} // validated`,c0=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,h0=`vec3 transformedNormal = objectNormal;
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
#endif`,u0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,d0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,f0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,p0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,m0="gl_FragColor = linearToOutputTexel( gl_FragColor );",g0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,v0=`#ifdef USE_ENVMAP
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
#endif`,x0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,M0=`#ifdef USE_ENVMAP
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
#endif`,w0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,y0=`#ifdef USE_ENVMAP
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
#endif`,_0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,S0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,b0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,E0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,T0=`#ifdef USE_GRADIENTMAP
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
}`,A0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,R0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,C0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,P0=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,L0=`#ifdef USE_ENVMAP
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
#endif`,D0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,I0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,N0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,U0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,O0=`PhysicalMaterial material;
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
#endif`,k0=`uniform sampler2D dfgLUT;
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
}`,F0=`
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
#endif`,B0=`#if defined( RE_IndirectDiffuse )
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
#endif`,H0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,z0=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,V0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,G0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,W0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,X0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Y0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,q0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,K0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Z0=`#if defined( USE_POINTS_UV )
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
#endif`,J0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,j0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Q0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,$0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,em=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,tm=`#ifdef USE_MORPHTARGETS
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
#endif`,nm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,im=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,sm=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,rm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,om=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,am=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,lm=`#ifdef USE_NORMALMAP
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
#endif`,cm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,hm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,um=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,dm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,fm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,pm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,mm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,gm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,vm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Mm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,wm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ym=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,_m=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Sm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,bm=`float getShadowMask() {
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
}`,Em=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Tm=`#ifdef USE_SKINNING
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
#endif`,Am=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Rm=`#ifdef USE_SKINNING
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
#endif`,Cm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Pm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Lm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Dm=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Im=`#ifdef USE_TRANSMISSION
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
#endif`,Nm=`#ifdef USE_TRANSMISSION
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
#endif`,Um=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Om=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,km=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Fm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Bm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Hm=`uniform sampler2D t2D;
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
}`,zm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Vm=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Gm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Wm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Xm=`#include <common>
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
}`,Ym=`#if DEPTH_PACKING == 3200
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
}`,qm=`#define DISTANCE
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
}`,Km=`#define DISTANCE
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
}`,Zm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Jm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,jm=`uniform float scale;
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
}`,Qm=`uniform vec3 diffuse;
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
}`,$m=`#include <common>
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
}`,eg=`uniform vec3 diffuse;
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
}`,tg=`#define LAMBERT
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
}`,ng=`#define LAMBERT
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
}`,ig=`#define MATCAP
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
}`,sg=`#define MATCAP
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
}`,rg=`#define NORMAL
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
}`,og=`#define NORMAL
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
}`,ag=`#define PHONG
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
}`,lg=`#define PHONG
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
}`,cg=`#define STANDARD
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
}`,hg=`#define STANDARD
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
}`,ug=`#define TOON
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
}`,dg=`#define TOON
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
}`,fg=`uniform float size;
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
}`,pg=`uniform vec3 diffuse;
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
}`,mg=`#include <common>
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
}`,gg=`uniform vec3 color;
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
}`,vg=`uniform float rotation;
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
}`,xg=`uniform vec3 diffuse;
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
}`,st={alphahash_fragment:Bp,alphahash_pars_fragment:Hp,alphamap_fragment:zp,alphamap_pars_fragment:Vp,alphatest_fragment:Gp,alphatest_pars_fragment:Wp,aomap_fragment:Xp,aomap_pars_fragment:Yp,batching_pars_vertex:qp,batching_vertex:Kp,begin_vertex:Zp,beginnormal_vertex:Jp,bsdfs:jp,iridescence_fragment:Qp,bumpmap_pars_fragment:$p,clipping_planes_fragment:e0,clipping_planes_pars_fragment:t0,clipping_planes_pars_vertex:n0,clipping_planes_vertex:i0,color_fragment:s0,color_pars_fragment:r0,color_pars_vertex:o0,color_vertex:a0,common:l0,cube_uv_reflection_fragment:c0,defaultnormal_vertex:h0,displacementmap_pars_vertex:u0,displacementmap_vertex:d0,emissivemap_fragment:f0,emissivemap_pars_fragment:p0,colorspace_fragment:m0,colorspace_pars_fragment:g0,envmap_fragment:v0,envmap_common_pars_fragment:x0,envmap_pars_fragment:M0,envmap_pars_vertex:w0,envmap_physical_pars_fragment:L0,envmap_vertex:y0,fog_vertex:_0,fog_pars_vertex:S0,fog_fragment:b0,fog_pars_fragment:E0,gradientmap_pars_fragment:T0,lightmap_pars_fragment:A0,lights_lambert_fragment:R0,lights_lambert_pars_fragment:C0,lights_pars_begin:P0,lights_toon_fragment:D0,lights_toon_pars_fragment:I0,lights_phong_fragment:N0,lights_phong_pars_fragment:U0,lights_physical_fragment:O0,lights_physical_pars_fragment:k0,lights_fragment_begin:F0,lights_fragment_maps:B0,lights_fragment_end:H0,lightprobes_pars_fragment:z0,logdepthbuf_fragment:V0,logdepthbuf_pars_fragment:G0,logdepthbuf_pars_vertex:W0,logdepthbuf_vertex:X0,map_fragment:Y0,map_pars_fragment:q0,map_particle_fragment:K0,map_particle_pars_fragment:Z0,metalnessmap_fragment:J0,metalnessmap_pars_fragment:j0,morphinstance_vertex:Q0,morphcolor_vertex:$0,morphnormal_vertex:em,morphtarget_pars_vertex:tm,morphtarget_vertex:nm,normal_fragment_begin:im,normal_fragment_maps:sm,normal_pars_fragment:rm,normal_pars_vertex:om,normal_vertex:am,normalmap_pars_fragment:lm,clearcoat_normal_fragment_begin:cm,clearcoat_normal_fragment_maps:hm,clearcoat_pars_fragment:um,iridescence_pars_fragment:dm,opaque_fragment:fm,packing:pm,premultiplied_alpha_fragment:mm,project_vertex:gm,dithering_fragment:vm,dithering_pars_fragment:xm,roughnessmap_fragment:Mm,roughnessmap_pars_fragment:wm,shadowmap_pars_fragment:ym,shadowmap_pars_vertex:_m,shadowmap_vertex:Sm,shadowmask_pars_fragment:bm,skinbase_vertex:Em,skinning_pars_vertex:Tm,skinning_vertex:Am,skinnormal_vertex:Rm,specularmap_fragment:Cm,specularmap_pars_fragment:Pm,tonemapping_fragment:Lm,tonemapping_pars_fragment:Dm,transmission_fragment:Im,transmission_pars_fragment:Nm,uv_pars_fragment:Um,uv_pars_vertex:Om,uv_vertex:km,worldpos_vertex:Fm,background_vert:Bm,background_frag:Hm,backgroundCube_vert:zm,backgroundCube_frag:Vm,cube_vert:Gm,cube_frag:Wm,depth_vert:Xm,depth_frag:Ym,distance_vert:qm,distance_frag:Km,equirect_vert:Zm,equirect_frag:Jm,linedashed_vert:jm,linedashed_frag:Qm,meshbasic_vert:$m,meshbasic_frag:eg,meshlambert_vert:tg,meshlambert_frag:ng,meshmatcap_vert:ig,meshmatcap_frag:sg,meshnormal_vert:rg,meshnormal_frag:og,meshphong_vert:ag,meshphong_frag:lg,meshphysical_vert:cg,meshphysical_frag:hg,meshtoon_vert:ug,meshtoon_frag:dg,points_vert:fg,points_frag:pg,shadow_vert:mg,shadow_frag:gg,sprite_vert:vg,sprite_frag:xg},Ae={common:{diffuse:{value:new pe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new tt},alphaMap:{value:null},alphaMapTransform:{value:new tt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new tt}},envmap:{envMap:{value:null},envMapRotation:{value:new tt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new tt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new tt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new tt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new tt},normalScale:{value:new ae(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new tt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new tt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new tt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new tt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new pe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new A},probesMax:{value:new A},probesResolution:{value:new A}},points:{diffuse:{value:new pe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new tt},alphaTest:{value:0},uvTransform:{value:new tt}},sprite:{diffuse:{value:new pe(16777215)},opacity:{value:1},center:{value:new ae(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new tt},alphaMap:{value:null},alphaMapTransform:{value:new tt},alphaTest:{value:0}}},Kn={basic:{uniforms:un([Ae.common,Ae.specularmap,Ae.envmap,Ae.aomap,Ae.lightmap,Ae.fog]),vertexShader:st.meshbasic_vert,fragmentShader:st.meshbasic_frag},lambert:{uniforms:un([Ae.common,Ae.specularmap,Ae.envmap,Ae.aomap,Ae.lightmap,Ae.emissivemap,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,Ae.fog,Ae.lights,{emissive:{value:new pe(0)},envMapIntensity:{value:1}}]),vertexShader:st.meshlambert_vert,fragmentShader:st.meshlambert_frag},phong:{uniforms:un([Ae.common,Ae.specularmap,Ae.envmap,Ae.aomap,Ae.lightmap,Ae.emissivemap,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,Ae.fog,Ae.lights,{emissive:{value:new pe(0)},specular:{value:new pe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:st.meshphong_vert,fragmentShader:st.meshphong_frag},standard:{uniforms:un([Ae.common,Ae.envmap,Ae.aomap,Ae.lightmap,Ae.emissivemap,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,Ae.roughnessmap,Ae.metalnessmap,Ae.fog,Ae.lights,{emissive:{value:new pe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:st.meshphysical_vert,fragmentShader:st.meshphysical_frag},toon:{uniforms:un([Ae.common,Ae.aomap,Ae.lightmap,Ae.emissivemap,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,Ae.gradientmap,Ae.fog,Ae.lights,{emissive:{value:new pe(0)}}]),vertexShader:st.meshtoon_vert,fragmentShader:st.meshtoon_frag},matcap:{uniforms:un([Ae.common,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,Ae.fog,{matcap:{value:null}}]),vertexShader:st.meshmatcap_vert,fragmentShader:st.meshmatcap_frag},points:{uniforms:un([Ae.points,Ae.fog]),vertexShader:st.points_vert,fragmentShader:st.points_frag},dashed:{uniforms:un([Ae.common,Ae.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:st.linedashed_vert,fragmentShader:st.linedashed_frag},depth:{uniforms:un([Ae.common,Ae.displacementmap]),vertexShader:st.depth_vert,fragmentShader:st.depth_frag},normal:{uniforms:un([Ae.common,Ae.bumpmap,Ae.normalmap,Ae.displacementmap,{opacity:{value:1}}]),vertexShader:st.meshnormal_vert,fragmentShader:st.meshnormal_frag},sprite:{uniforms:un([Ae.sprite,Ae.fog]),vertexShader:st.sprite_vert,fragmentShader:st.sprite_frag},background:{uniforms:{uvTransform:{value:new tt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:st.background_vert,fragmentShader:st.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new tt}},vertexShader:st.backgroundCube_vert,fragmentShader:st.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:st.cube_vert,fragmentShader:st.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:st.equirect_vert,fragmentShader:st.equirect_frag},distance:{uniforms:un([Ae.common,Ae.displacementmap,{referencePosition:{value:new A},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:st.distance_vert,fragmentShader:st.distance_frag},shadow:{uniforms:un([Ae.lights,Ae.fog,{color:{value:new pe(0)},opacity:{value:1}}]),vertexShader:st.shadow_vert,fragmentShader:st.shadow_frag}};Kn.physical={uniforms:un([Kn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new tt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new tt},clearcoatNormalScale:{value:new ae(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new tt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new tt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new tt},sheen:{value:0},sheenColor:{value:new pe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new tt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new tt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new tt},transmissionSamplerSize:{value:new ae},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new tt},attenuationDistance:{value:0},attenuationColor:{value:new pe(0)},specularColor:{value:new pe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new tt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new tt},anisotropyVector:{value:new ae},anisotropyMap:{value:null},anisotropyMapTransform:{value:new tt}}]),vertexShader:st.meshphysical_vert,fragmentShader:st.meshphysical_frag};const Qr={r:0,b:0,g:0},Mg=new rt,Hu=new tt;Hu.set(-1,0,0,0,1,0,0,0,1);function wg(i,e,t,n,s,r){const o=new pe(0);let a=s===!0?0:1,l,c,h=null,d=0,u=null;function f(T){let b=T.isScene===!0?T.background:null;if(b&&b.isTexture){const w=T.backgroundBlurriness>0;b=e.get(b,w)}return b}function m(T){let b=!1;const w=f(T);w===null?g(o,a):w&&w.isColor&&(g(w,1),b=!0);const S=i.xr.getEnvironmentBlendMode();S==="additive"?t.buffers.color.setClear(0,0,0,1,r):S==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||b)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function x(T,b){const w=f(b);w&&(w.isCubeTexture||w.mapping===Ao)?(c===void 0&&(c=new qe(new Sn(1,1,1),new ft({name:"BackgroundCubeMaterial",uniforms:Rs(Kn.backgroundCube.uniforms),vertexShader:Kn.backgroundCube.vertexShader,fragmentShader:Kn.backgroundCube.fragmentShader,side:fn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(S,M,y){this.matrixWorld.copyPosition(y.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=w,c.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Mg.makeRotationFromEuler(b.backgroundRotation)).transpose(),w.isCubeTexture&&w.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Hu),c.material.toneMapped=ut.getTransfer(w.colorSpace)!==xt,(h!==w||d!==w.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=w,d=w.version,u=i.toneMapping),c.layers.enableAll(),T.unshift(c,c.geometry,c.material,0,0,null)):w&&w.isTexture&&(l===void 0&&(l=new qe(new Gt(2,2),new ft({name:"BackgroundMaterial",uniforms:Rs(Kn.background.uniforms),vertexShader:Kn.background.vertexShader,fragmentShader:Kn.background.fragmentShader,side:Ci,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=w,l.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,l.material.toneMapped=ut.getTransfer(w.colorSpace)!==xt,w.matrixAutoUpdate===!0&&w.updateMatrix(),l.material.uniforms.uvTransform.value.copy(w.matrix),(h!==w||d!==w.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=w,d=w.version,u=i.toneMapping),l.layers.enableAll(),T.unshift(l,l.geometry,l.material,0,0,null))}function g(T,b){T.getRGB(Qr,Nu(i)),t.buffers.color.setClear(Qr.r,Qr.g,Qr.b,b,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(T,b=1){o.set(T),a=b,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(T){a=T,g(o,a)},render:m,addToRenderList:x,dispose:p}}function yg(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null);let r=s,o=!1;function a(P,D,N,z,I){let V=!1;const O=d(P,z,N,D);r!==O&&(r=O,c(r.object)),V=f(P,z,N,I),V&&m(P,z,N,I),I!==null&&e.update(I,i.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,w(P,D,N,z),I!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(I).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function d(P,D,N,z){const I=z.wireframe===!0;let V=n[D.id];V===void 0&&(V={},n[D.id]=V);const O=P.isInstancedMesh===!0?P.id:0;let G=V[O];G===void 0&&(G={},V[O]=G);let q=G[N.id];q===void 0&&(q={},G[N.id]=q);let re=q[I];return re===void 0&&(re=u(l()),q[I]=re),re}function u(P){const D=[],N=[],z=[];for(let I=0;I<t;I++)D[I]=0,N[I]=0,z[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:N,attributeDivisors:z,object:P,attributes:{},index:null}}function f(P,D,N,z){const I=r.attributes,V=D.attributes;let O=0;const G=N.getAttributes();for(const q in G)if(G[q].location>=0){const ne=I[q];let ce=V[q];if(ce===void 0&&(q==="instanceMatrix"&&P.instanceMatrix&&(ce=P.instanceMatrix),q==="instanceColor"&&P.instanceColor&&(ce=P.instanceColor)),ne===void 0||ne.attribute!==ce||ce&&ne.data!==ce.data)return!0;O++}return r.attributesNum!==O||r.index!==z}function m(P,D,N,z){const I={},V=D.attributes;let O=0;const G=N.getAttributes();for(const q in G)if(G[q].location>=0){let ne=V[q];ne===void 0&&(q==="instanceMatrix"&&P.instanceMatrix&&(ne=P.instanceMatrix),q==="instanceColor"&&P.instanceColor&&(ne=P.instanceColor));const ce={};ce.attribute=ne,ne&&ne.data&&(ce.data=ne.data),I[q]=ce,O++}r.attributes=I,r.attributesNum=O,r.index=z}function x(){const P=r.newAttributes;for(let D=0,N=P.length;D<N;D++)P[D]=0}function g(P){p(P,0)}function p(P,D){const N=r.newAttributes,z=r.enabledAttributes,I=r.attributeDivisors;N[P]=1,z[P]===0&&(i.enableVertexAttribArray(P),z[P]=1),I[P]!==D&&(i.vertexAttribDivisor(P,D),I[P]=D)}function T(){const P=r.newAttributes,D=r.enabledAttributes;for(let N=0,z=D.length;N<z;N++)D[N]!==P[N]&&(i.disableVertexAttribArray(N),D[N]=0)}function b(P,D,N,z,I,V,O){O===!0?i.vertexAttribIPointer(P,D,N,I,V):i.vertexAttribPointer(P,D,N,z,I,V)}function w(P,D,N,z){x();const I=z.attributes,V=N.getAttributes(),O=D.defaultAttributeValues;for(const G in V){const q=V[G];if(q.location>=0){let re=I[G];if(re===void 0&&(G==="instanceMatrix"&&P.instanceMatrix&&(re=P.instanceMatrix),G==="instanceColor"&&P.instanceColor&&(re=P.instanceColor)),re!==void 0){const ne=re.normalized,ce=re.itemSize,Te=e.get(re);if(Te===void 0)continue;const J=Te.buffer,se=Te.type,k=Te.bytesPerElement,X=se===i.INT||se===i.UNSIGNED_INT||re.gpuType===Fl;if(re.isInterleavedBufferAttribute){const W=re.data,he=W.stride,ue=re.offset;if(W.isInstancedInterleavedBuffer){for(let Ue=0;Ue<q.locationSize;Ue++)p(q.location+Ue,W.meshPerAttribute);P.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let Ue=0;Ue<q.locationSize;Ue++)g(q.location+Ue);i.bindBuffer(i.ARRAY_BUFFER,J);for(let Ue=0;Ue<q.locationSize;Ue++)b(q.location+Ue,ce/q.locationSize,se,ne,he*k,(ue+ce/q.locationSize*Ue)*k,X)}else{if(re.isInstancedBufferAttribute){for(let W=0;W<q.locationSize;W++)p(q.location+W,re.meshPerAttribute);P.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=re.meshPerAttribute*re.count)}else for(let W=0;W<q.locationSize;W++)g(q.location+W);i.bindBuffer(i.ARRAY_BUFFER,J);for(let W=0;W<q.locationSize;W++)b(q.location+W,ce/q.locationSize,se,ne,ce*k,ce/q.locationSize*W*k,X)}}else if(O!==void 0){const ne=O[G];if(ne!==void 0)switch(ne.length){case 2:i.vertexAttrib2fv(q.location,ne);break;case 3:i.vertexAttrib3fv(q.location,ne);break;case 4:i.vertexAttrib4fv(q.location,ne);break;default:i.vertexAttrib1fv(q.location,ne)}}}}T()}function S(){E();for(const P in n){const D=n[P];for(const N in D){const z=D[N];for(const I in z){const V=z[I];for(const O in V)h(V[O].object),delete V[O];delete z[I]}}delete n[P]}}function M(P){if(n[P.id]===void 0)return;const D=n[P.id];for(const N in D){const z=D[N];for(const I in z){const V=z[I];for(const O in V)h(V[O].object),delete V[O];delete z[I]}}delete n[P.id]}function y(P){for(const D in n){const N=n[D];for(const z in N){const I=N[z];if(I[P.id]===void 0)continue;const V=I[P.id];for(const O in V)h(V[O].object),delete V[O];delete I[P.id]}}}function v(P){for(const D in n){const N=n[D],z=P.isInstancedMesh===!0?P.id:0,I=N[z];if(I!==void 0){for(const V in I){const O=I[V];for(const G in O)h(O[G].object),delete O[G];delete I[V]}delete N[z],Object.keys(N).length===0&&delete n[D]}}}function E(){C(),o=!0,r!==s&&(r=s,c(r.object))}function C(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:E,resetDefaultState:C,dispose:S,releaseStatesOfGeometry:M,releaseStatesOfObject:v,releaseStatesOfProgram:y,initAttributes:x,enableAttribute:g,disableUnusedAttributes:T}}function _g(i,e,t){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),t.update(c,n,h))}function a(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];t.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Sg(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const y=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(y){return!(y!==yn&&n.convert(y)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(y){const v=y===Vt&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(y!==cn&&n.convert(y)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==Fn&&!v)}function l(y){if(y==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Ze("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Ze("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),b=i.getParameter(i.MAX_VARYING_VECTORS),w=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),S=i.getParameter(i.MAX_SAMPLES),M=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:x,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:T,maxVaryings:b,maxFragmentUniforms:w,maxSamples:S,samples:M}}function bg(i){const e=this;let t=null,n=0,s=!1,r=!1;const o=new Ei,a=new tt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const m=d.clippingPlanes,x=d.clipIntersection,g=d.clipShadows,p=i.get(d);if(!s||m===null||m.length===0||r&&!g)r?h(null):c();else{const T=r?0:n,b=T*4;let w=p.clippingState||null;l.value=w,w=h(m,u,b,f);for(let S=0;S!==b;++S)w[S]=t[S];p.clippingState=w,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=T}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,m){const x=d!==null?d.length:0;let g=null;if(x!==0){if(g=l.value,m!==!0||g===null){const p=f+x*4,T=u.matrixWorldInverse;a.getNormalMatrix(T),(g===null||g.length<p)&&(g=new Float32Array(p));for(let b=0,w=f;b!==x;++b,w+=4)o.copy(d[b]).applyMatrix4(T,a),o.normal.toArray(g,w),g[w+3]=o.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,g}}const Ri=4,mh=[.125,.215,.35,.446,.526,.582],Bi=20,Eg=256,Ys=new No,gh=new pe;let ba=null,Ea=0,Ta=0,Aa=!1;const Tg=new A;class Cl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){const{size:o=256,position:a=Tg}=r;ba=this._renderer.getRenderTarget(),Ea=this._renderer.getActiveCubeFace(),Ta=this._renderer.getActiveMipmapLevel(),Aa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Mh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=xh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(ba,Ea,Ta),this._renderer.xr.enabled=Aa,e.scissorTest=!1,gs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Vi||e.mapping===bs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ba=this._renderer.getRenderTarget(),Ea=this._renderer.getActiveCubeFace(),Ta=this._renderer.getActiveMipmapLevel(),Aa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:sn,minFilter:sn,generateMipmaps:!1,type:Vt,format:yn,colorSpace:Mo,depthBuffer:!1},s=vh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=vh(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Ag(r)),this._blurMaterial=Cg(r,e,t),this._ggxMaterial=Rg(r,e,t)}return s}_compileMaterial(e){const t=new qe(new At,e);this._renderer.compile(t,Ys)}_sceneToCubeUV(e,t,n,s,r){const l=new zt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(gh),d.toneMapping=Hn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new qe(new Sn,new Co({name:"PMREM.Background",side:fn,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,g=x.material;let p=!1;const T=e.background;T?T.isColor&&(g.color.copy(T),e.background=null,p=!0):(g.color.copy(gh),p=!0);for(let b=0;b<6;b++){const w=b%3;w===0?(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[b],r.y,r.z)):w===1?(l.up.set(0,0,c[b]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[b],r.z)):(l.up.set(0,c[b],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[b]));const S=this._cubeSize;gs(s,w*S,b>2?S:0,S,S),d.setRenderTarget(s),p&&d.render(x,l),d.render(e,l)}d.toneMapping=f,d.autoClear=u,e.background=T}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===Vi||e.mapping===bs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Mh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=xh());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;gs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Ys)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,f=d*u,{_lodMax:m}=this,x=this._sizeLods[n],g=3*x*(n>m-Ri?n-m+Ri:0),p=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,gs(r,g,p,3*x,2*x),s.setRenderTarget(r),s.render(a,Ys),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-n,gs(e,g,p,3*x,2*x),s.setRenderTarget(e),s.render(a,Ys)}_blur(e,t,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&ht("blur direction must be either latitudinal or longitudinal!");const h=3,d=this._lodMeshes[s];d.material=c;const u=c.uniforms,f=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Bi-1),x=r/m,g=isFinite(r)?1+Math.floor(h*x):Bi;g>Bi&&Ze(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Bi}`);const p=[];let T=0;for(let y=0;y<Bi;++y){const v=y/x,E=Math.exp(-v*v/2);p.push(E),y===0?T+=E:y<g&&(T+=2*E)}for(let y=0;y<p.length;y++)p[y]=p[y]/T;u.envMap.value=e.texture,u.samples.value=g,u.weights.value=p,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:b}=this;u.dTheta.value=m,u.mipInt.value=b-n;const w=this._sizeLods[s],S=3*w*(s>b-Ri?s-b+Ri:0),M=4*(this._cubeSize-w);gs(t,S,M,3*w,2*w),l.setRenderTarget(t),l.render(d,Ys)}}function Ag(i){const e=[],t=[],n=[];let s=i;const r=i-Ri+1+mh.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);e.push(a);let l=1/a;o>i-Ri?l=mh[o-i+Ri-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,m=6,x=3,g=2,p=1,T=new Float32Array(x*m*f),b=new Float32Array(g*m*f),w=new Float32Array(p*m*f);for(let M=0;M<f;M++){const y=M%3*2/3-1,v=M>2?0:-1,E=[y,v,0,y+2/3,v,0,y+2/3,v+1,0,y,v,0,y+2/3,v+1,0,y,v+1,0];T.set(E,x*m*M),b.set(u,g*m*M);const C=[M,M,M,M,M,M];w.set(C,p*m*M)}const S=new At;S.setAttribute("position",new pn(T,x)),S.setAttribute("uv",new pn(b,g)),S.setAttribute("faceIndex",new pn(w,p)),n.push(new qe(S,null)),s>Ri&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function vh(i,e,t){const n=new Pt(i,e,t);return n.texture.mapping=Ao,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function gs(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Rg(i,e,t){return new ft({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Eg,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Uo(),fragmentShader:`

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
		`,blending:jt,depthTest:!1,depthWrite:!1})}function Cg(i,e,t){const n=new Float32Array(Bi),s=new A(0,1,0);return new ft({name:"SphericalGaussianBlur",defines:{n:Bi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Uo(),fragmentShader:`

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
		`,blending:jt,depthTest:!1,depthWrite:!1})}function xh(){return new ft({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Uo(),fragmentShader:`

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
		`,blending:jt,depthTest:!1,depthWrite:!1})}function Mh(){return new ft({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Uo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:jt,depthTest:!1,depthWrite:!1})}function Uo(){return`

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
	`}class zu extends Pt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new _u(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Sn(5,5,5),r=new ft({name:"CubemapFromEquirect",uniforms:Rs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:fn,blending:jt});r.uniforms.tEquirect.value=t;const o=new qe(s,r),a=t.minFilter;return t.minFilter===Ti&&(t.minFilter=sn),new Ip(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}}function Pg(i){let e=new WeakMap,t=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?o(u):r(u)}function r(u){if(u&&u.isTexture){const f=u.mapping;if(f===Wo||f===Xo)if(e.has(u)){const m=e.get(u).texture;return a(m,u.mapping)}else{const m=u.image;if(m&&m.height>0){const x=new zu(m.height);return x.fromEquirectangularTexture(i,u),e.set(u,x),u.addEventListener("dispose",c),a(x.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){const f=u.mapping,m=f===Wo||f===Xo,x=f===Vi||f===bs;if(m||x){let g=t.get(u);const p=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new Cl(i)),g=m?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{const T=u.image;return m&&T&&T.height>0||x&&T&&l(T)?(n===null&&(n=new Cl(i)),g=m?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function a(u,f){return f===Wo?u.mapping=Vi:f===Xo&&(u.mapping=bs),u}function l(u){let f=0;const m=6;for(let x=0;x<m;x++)u[x]!==void 0&&f++;return f===m}function c(u){const f=u.target;f.removeEventListener("dispose",c);const m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function h(u){const f=u.target;f.removeEventListener("dispose",h);const m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function Lg(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&ys("WebGLRenderer: "+n+" extension not supported."),s}}}function Dg(i,e,t,n){const s={},r=new WeakMap;function o(d){const u=d.target;u.index!==null&&e.remove(u.index);for(const m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",o),delete s[u.id];const f=r.get(u);f&&(e.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,t.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)e.update(u[f],i.ARRAY_BUFFER)}function c(d){const u=[],f=d.index,m=d.attributes.position;let x=0;if(m===void 0)return;if(f!==null){const T=f.array;x=f.version;for(let b=0,w=T.length;b<w;b+=3){const S=T[b+0],M=T[b+1],y=T[b+2];u.push(S,M,M,y,y,S)}}else{const T=m.array;x=m.version;for(let b=0,w=T.length/3-1;b<w;b+=3){const S=b+0,M=b+1,y=b+2;u.push(S,M,M,y,y,S)}}const g=new(m.count>=65535?xu:Ro)(u,1);g.version=x;const p=r.get(d);p&&e.remove(p),r.set(d,g)}function h(d){const u=r.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Ig(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),t.update(u,n,1)}function c(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*o,f),t.update(u,n,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let x=0;for(let g=0;g<f;g++)x+=u[g];t.update(x,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function Ng(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:ht("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function Ug(i,e,t){const n=new WeakMap,s=new vt;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let C=function(){v.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var f=C;u!==void 0&&u.texture.dispose();const m=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],T=a.morphAttributes.normal||[],b=a.morphAttributes.color||[];let w=0;m===!0&&(w=1),x===!0&&(w=2),g===!0&&(w=3);let S=a.attributes.position.count*w,M=1;S>e.maxTextureSize&&(M=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);const y=new Float32Array(S*M*4*d),v=new mu(y,S,M,d);v.type=Fn,v.needsUpdate=!0;const E=w*4;for(let P=0;P<d;P++){const D=p[P],N=T[P],z=b[P],I=S*M*4*P;for(let V=0;V<D.count;V++){const O=V*E;m===!0&&(s.fromBufferAttribute(D,V),y[I+O+0]=s.x,y[I+O+1]=s.y,y[I+O+2]=s.z,y[I+O+3]=0),x===!0&&(s.fromBufferAttribute(N,V),y[I+O+4]=s.x,y[I+O+5]=s.y,y[I+O+6]=s.z,y[I+O+7]=0),g===!0&&(s.fromBufferAttribute(z,V),y[I+O+8]=s.x,y[I+O+9]=s.y,y[I+O+10]=s.z,y[I+O+11]=z.itemSize===4?s.w:1)}}u={count:d,texture:v,size:new ae(S,M)},n.set(a,u),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let m=0;for(let g=0;g<c.length;g++)m+=c[g];const x=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function Og(i,e,t,n,s){let r=new WeakMap;function o(c){const h=s.render.frame,d=c.geometry,u=e.get(c,d);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function a(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:o,dispose:a}}const kg={[$h]:"LINEAR_TONE_MAPPING",[eu]:"REINHARD_TONE_MAPPING",[tu]:"CINEON_TONE_MAPPING",[nu]:"ACES_FILMIC_TONE_MAPPING",[su]:"AGX_TONE_MAPPING",[ru]:"NEUTRAL_TONE_MAPPING",[iu]:"CUSTOM_TONE_MAPPING"};function Fg(i,e,t,n,s,r){const o=new Pt(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new Wi(e,t):void 0}),a=new Pt(e,t,{type:Vt,depthBuffer:!1,stencilBuffer:!1}),l=new At;l.setAttribute("position",new $e([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new $e([0,2,0,0,2,0],2));const c=new Rp({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),h=new qe(l,c),d=new No(-1,1,1,-1,0,1);let u=null,f=null,m=!1,x,g=null,p=[],T=!1;this.setSize=function(b,w){o.setSize(b,w),a.setSize(b,w);for(let S=0;S<p.length;S++){const M=p[S];M.setSize&&M.setSize(b,w)}},this.setEffects=function(b){p=b,T=p.length>0&&p[0].isRenderPass===!0;const w=o.width,S=o.height;for(let M=0;M<p.length;M++){const y=p[M];y.setSize&&y.setSize(w,S)}},this.begin=function(b,w){if(m||b.toneMapping===Hn&&p.length===0)return!1;if(g=w,w!==null){const S=w.width,M=w.height;(o.width!==S||o.height!==M)&&this.setSize(S,M)}return T===!1&&b.setRenderTarget(o),x=b.toneMapping,b.toneMapping=Hn,!0},this.hasRenderPass=function(){return T},this.end=function(b,w){b.toneMapping=x,m=!0;let S=o,M=a;for(let y=0;y<p.length;y++){const v=p[y];if(v.enabled!==!1&&(v.render(b,M,S,w),v.needsSwap!==!1)){const E=S;S=M,M=E}}if(u!==b.outputColorSpace||f!==b.toneMapping){u=b.outputColorSpace,f=b.toneMapping,c.defines={},ut.getTransfer(u)===xt&&(c.defines.SRGB_TRANSFER="");const y=kg[f];y&&(c.defines[y]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=S.texture,b.setRenderTarget(g),b.render(h,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}const Vu=new en,Pl=new Wi(1,1),Gu=new mu,Wu=new Ef,Xu=new _u,wh=[],yh=[],_h=new Float32Array(16),Sh=new Float32Array(9),bh=new Float32Array(4);function Us(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=wh[s];if(r===void 0&&(r=new Float32Array(s),wh[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Yt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function qt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Oo(i,e){let t=yh[e];t===void 0&&(t=new Int32Array(e),yh[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Bg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Hg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2fv(this.addr,e),qt(t,e)}}function zg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Yt(t,e))return;i.uniform3fv(this.addr,e),qt(t,e)}}function Vg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4fv(this.addr,e),qt(t,e)}}function Gg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),qt(t,e)}else{if(Yt(t,n))return;bh.set(n),i.uniformMatrix2fv(this.addr,!1,bh),qt(t,n)}}function Wg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),qt(t,e)}else{if(Yt(t,n))return;Sh.set(n),i.uniformMatrix3fv(this.addr,!1,Sh),qt(t,n)}}function Xg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),qt(t,e)}else{if(Yt(t,n))return;_h.set(n),i.uniformMatrix4fv(this.addr,!1,_h),qt(t,n)}}function Yg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function qg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2iv(this.addr,e),qt(t,e)}}function Kg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Yt(t,e))return;i.uniform3iv(this.addr,e),qt(t,e)}}function Zg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4iv(this.addr,e),qt(t,e)}}function Jg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function jg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2uiv(this.addr,e),qt(t,e)}}function Qg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Yt(t,e))return;i.uniform3uiv(this.addr,e),qt(t,e)}}function $g(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4uiv(this.addr,e),qt(t,e)}}function ev(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Pl.compareFunction=t.isReversedDepthBuffer()?Xl:Wl,r=Pl):r=Vu,t.setTexture2D(e||r,s)}function tv(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Wu,s)}function nv(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Xu,s)}function iv(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Gu,s)}function sv(i){switch(i){case 5126:return Bg;case 35664:return Hg;case 35665:return zg;case 35666:return Vg;case 35674:return Gg;case 35675:return Wg;case 35676:return Xg;case 5124:case 35670:return Yg;case 35667:case 35671:return qg;case 35668:case 35672:return Kg;case 35669:case 35673:return Zg;case 5125:return Jg;case 36294:return jg;case 36295:return Qg;case 36296:return $g;case 35678:case 36198:case 36298:case 36306:case 35682:return ev;case 35679:case 36299:case 36307:return tv;case 35680:case 36300:case 36308:case 36293:return nv;case 36289:case 36303:case 36311:case 36292:return iv}}function rv(i,e){i.uniform1fv(this.addr,e)}function ov(i,e){const t=Us(e,this.size,2);i.uniform2fv(this.addr,t)}function av(i,e){const t=Us(e,this.size,3);i.uniform3fv(this.addr,t)}function lv(i,e){const t=Us(e,this.size,4);i.uniform4fv(this.addr,t)}function cv(i,e){const t=Us(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function hv(i,e){const t=Us(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function uv(i,e){const t=Us(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function dv(i,e){i.uniform1iv(this.addr,e)}function fv(i,e){i.uniform2iv(this.addr,e)}function pv(i,e){i.uniform3iv(this.addr,e)}function mv(i,e){i.uniform4iv(this.addr,e)}function gv(i,e){i.uniform1uiv(this.addr,e)}function vv(i,e){i.uniform2uiv(this.addr,e)}function xv(i,e){i.uniform3uiv(this.addr,e)}function Mv(i,e){i.uniform4uiv(this.addr,e)}function wv(i,e,t){const n=this.cache,s=e.length,r=Oo(t,s);Yt(n,r)||(i.uniform1iv(this.addr,r),qt(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Pl:o=Vu;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function yv(i,e,t){const n=this.cache,s=e.length,r=Oo(t,s);Yt(n,r)||(i.uniform1iv(this.addr,r),qt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Wu,r[o])}function _v(i,e,t){const n=this.cache,s=e.length,r=Oo(t,s);Yt(n,r)||(i.uniform1iv(this.addr,r),qt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||Xu,r[o])}function Sv(i,e,t){const n=this.cache,s=e.length,r=Oo(t,s);Yt(n,r)||(i.uniform1iv(this.addr,r),qt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Gu,r[o])}function bv(i){switch(i){case 5126:return rv;case 35664:return ov;case 35665:return av;case 35666:return lv;case 35674:return cv;case 35675:return hv;case 35676:return uv;case 5124:case 35670:return dv;case 35667:case 35671:return fv;case 35668:case 35672:return pv;case 35669:case 35673:return mv;case 5125:return gv;case 36294:return vv;case 36295:return xv;case 36296:return Mv;case 35678:case 36198:case 36298:case 36306:case 35682:return wv;case 35679:case 36299:case 36307:return yv;case 35680:case 36300:case 36308:case 36293:return _v;case 36289:case 36303:case 36311:case 36292:return Sv}}class Ev{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=sv(t.type)}}class Tv{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=bv(t.type)}}class Av{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],n)}}}const Ra=/(\w+)(\])?(\[|\.)?/g;function Eh(i,e){i.seq.push(e),i.map[e.id]=e}function Rv(i,e,t){const n=i.name,s=n.length;for(Ra.lastIndex=0;;){const r=Ra.exec(n),o=Ra.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Eh(t,c===void 0?new Ev(a,i,e):new Tv(a,i,e));break}else{let d=t.map[a];d===void 0&&(d=new Av(a),Eh(t,d)),t=d}}}class mo{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);Rv(a,l,this)}const s=[],r=[];for(const o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&n.push(o)}return n}}function Th(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const Cv=37297;let Pv=0;function Lv(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Ah=new tt;function Dv(i){ut._getMatrix(Ah,ut.workingColorSpace,i);const e=`mat3( ${Ah.elements.map(t=>t.toFixed(4))} )`;switch(ut.getTransfer(i)){case wo:return[e,"LinearTransferOETF"];case xt:return[e,"sRGBTransferOETF"];default:return Ze("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Rh(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Lv(i.getShaderSource(e),a)}else return r}function Iv(i,e){const t=Dv(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Nv={[$h]:"Linear",[eu]:"Reinhard",[tu]:"Cineon",[nu]:"ACESFilmic",[su]:"AgX",[ru]:"Neutral",[iu]:"Custom"};function Uv(i,e){const t=Nv[e];return t===void 0?(Ze("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const $r=new A;function Ov(){ut.getLuminanceCoefficients($r);const i=$r.x.toFixed(4),e=$r.y.toFixed(4),t=$r.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function kv(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($s).join(`
`)}function Fv(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Bv(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function $s(i){return i!==""}function Ch(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ph(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Hv=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ll(i){return i.replace(Hv,Vv)}const zv=new Map;function Vv(i,e){let t=st[e];if(t===void 0){const n=zv.get(e);if(n!==void 0)t=st[n],Ze('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Ll(t)}const Gv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lh(i){return i.replace(Gv,Wv)}function Wv(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Dh(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const Xv={[tr]:"SHADOWMAP_TYPE_PCF",[Js]:"SHADOWMAP_TYPE_VSM"};function Yv(i){return Xv[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const qv={[Vi]:"ENVMAP_TYPE_CUBE",[bs]:"ENVMAP_TYPE_CUBE",[Ao]:"ENVMAP_TYPE_CUBE_UV"};function Kv(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":qv[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const Zv={[bs]:"ENVMAP_MODE_REFRACTION"};function Jv(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Zv[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const jv={[Qh]:"ENVMAP_BLENDING_MULTIPLY",[Hd]:"ENVMAP_BLENDING_MIX",[zd]:"ENVMAP_BLENDING_ADD"};function Qv(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":jv[i.combine]||"ENVMAP_BLENDING_NONE"}function $v(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function ex(i,e,t,n){const s=i.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=Yv(t),c=Kv(t),h=Jv(t),d=Qv(t),u=$v(t),f=kv(t),m=Fv(r),x=s.createProgram();let g,p,T=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter($s).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter($s).join(`
`),p.length>0&&(p+=`
`)):(g=[Dh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($s).join(`
`),p=[Dh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Hn?"#define TONE_MAPPING":"",t.toneMapping!==Hn?st.tonemapping_pars_fragment:"",t.toneMapping!==Hn?Uv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",st.colorspace_pars_fragment,Iv("linearToOutputTexel",t.outputColorSpace),Ov(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter($s).join(`
`)),o=Ll(o),o=Ch(o,t),o=Ph(o,t),a=Ll(a),a=Ch(a,t),a=Ph(a,t),o=Lh(o),a=Lh(a),t.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===Rc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Rc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const b=T+g+o,w=T+p+a,S=Th(s,s.VERTEX_SHADER,b),M=Th(s,s.FRAGMENT_SHADER,w);s.attachShader(x,S),s.attachShader(x,M),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function y(P){if(i.debug.checkShaderErrors){const D=s.getProgramInfoLog(x)||"",N=s.getShaderInfoLog(S)||"",z=s.getShaderInfoLog(M)||"",I=D.trim(),V=N.trim(),O=z.trim();let G=!0,q=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(G=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,S,M);else{const re=Rh(s,S,"vertex"),ne=Rh(s,M,"fragment");ht("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+I+`
`+re+`
`+ne)}else I!==""?Ze("WebGLProgram: Program Info Log:",I):(V===""||O==="")&&(q=!1);q&&(P.diagnostics={runnable:G,programLog:I,vertexShader:{log:V,prefix:g},fragmentShader:{log:O,prefix:p}})}s.deleteShader(S),s.deleteShader(M),v=new mo(s,x),E=Bv(s,x)}let v;this.getUniforms=function(){return v===void 0&&y(this),v};let E;this.getAttributes=function(){return E===void 0&&y(this),E};let C=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(x,Cv)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Pv++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=S,this.fragmentShader=M,this}let tx=0;class nx{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){const s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new ix(e),t.set(e,n)),n}}class ix{constructor(e){this.id=tx++,this.code=e,this.usedTimes=0}}function sx(i){return i===Gi||i===go||i===vo}function rx(i,e,t,n,s,r){const o=new gu,a=new nx,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer;let u=n.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(v){return l.add(v),v===0?"uv":`uv${v}`}function x(v,E,C,P,D,N){const z=P.fog,I=D.geometry,V=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?P.environment:null,O=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,G=e.get(v.envMap||V,O),q=G&&G.mapping===Ao?G.image.height:null,re=f[v.type];v.precision!==null&&(u=n.getMaxPrecision(v.precision),u!==v.precision&&Ze("WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead."));const ne=I.morphAttributes.position||I.morphAttributes.normal||I.morphAttributes.color,ce=ne!==void 0?ne.length:0;let Te=0;I.morphAttributes.position!==void 0&&(Te=1),I.morphAttributes.normal!==void 0&&(Te=2),I.morphAttributes.color!==void 0&&(Te=3);let J,se,k,X;if(re){const Be=Kn[re];J=Be.vertexShader,se=Be.fragmentShader}else{J=v.vertexShader,se=v.fragmentShader;const Be=a.getVertexShaderStage(v),Lt=a.getFragmentShaderStage(v);a.update(v,Be,Lt),k=Be.id,X=Lt.id}const W=i.getRenderTarget(),he=i.state.buffers.depth.getReversed(),ue=D.isInstancedMesh===!0,Ue=D.isBatchedMesh===!0,et=!!v.map,_e=!!v.matcap,te=!!G,j=!!v.aoMap,oe=!!v.lightMap,Me=!!v.bumpMap&&v.wireframe===!1,Se=!!v.normalMap,Ve=!!v.displacementMap,Fe=!!v.emissiveMap,Ke=!!v.metalnessMap,Je=!!v.roughnessMap,U=v.anisotropy>0,dt=v.clearcoat>0,nt=v.dispersion>0,L=v.iridescence>0,_=v.sheen>0,B=v.transmission>0,Y=U&&!!v.anisotropyMap,$=dt&&!!v.clearcoatMap,fe=dt&&!!v.clearcoatNormalMap,ge=dt&&!!v.clearcoatRoughnessMap,ee=L&&!!v.iridescenceMap,ie=L&&!!v.iridescenceThicknessMap,me=_&&!!v.sheenColorMap,De=_&&!!v.sheenRoughnessMap,ve=!!v.specularMap,xe=!!v.specularColorMap,Ie=!!v.specularIntensityMap,ke=B&&!!v.transmissionMap,je=B&&!!v.thicknessMap,F=!!v.gradientMap,be=!!v.alphaMap,le=v.alphaTest>0,Ee=!!v.alphaHash,Re=!!v.extensions;let de=Hn;v.toneMapped&&(W===null||W.isXRRenderTarget===!0)&&(de=i.toneMapping);const We={shaderID:re,shaderType:v.type,shaderName:v.name,vertexShader:J,fragmentShader:se,defines:v.defines,customVertexShaderID:k,customFragmentShaderID:X,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:Ue,batchingColor:Ue&&D._colorsTexture!==null,instancing:ue,instancingColor:ue&&D.instanceColor!==null,instancingMorph:ue&&D.morphTexture!==null,outputColorSpace:W===null?i.outputColorSpace:W.isXRRenderTarget===!0?W.texture.colorSpace:ut.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:et,matcap:_e,envMap:te,envMapMode:te&&G.mapping,envMapCubeUVHeight:q,aoMap:j,lightMap:oe,bumpMap:Me,normalMap:Se,displacementMap:Ve,emissiveMap:Fe,normalMapObjectSpace:Se&&v.normalMapType===Yd,normalMapTangentSpace:Se&&v.normalMapType===xo,packedNormalMap:Se&&v.normalMapType===xo&&sx(v.normalMap.format),metalnessMap:Ke,roughnessMap:Je,anisotropy:U,anisotropyMap:Y,clearcoat:dt,clearcoatMap:$,clearcoatNormalMap:fe,clearcoatRoughnessMap:ge,dispersion:nt,iridescence:L,iridescenceMap:ee,iridescenceThicknessMap:ie,sheen:_,sheenColorMap:me,sheenRoughnessMap:De,specularMap:ve,specularColorMap:xe,specularIntensityMap:Ie,transmission:B,transmissionMap:ke,thicknessMap:je,gradientMap:F,opaque:v.transparent===!1&&v.blending===ws&&v.alphaToCoverage===!1,alphaMap:be,alphaTest:le,alphaHash:Ee,combine:v.combine,mapUv:et&&m(v.map.channel),aoMapUv:j&&m(v.aoMap.channel),lightMapUv:oe&&m(v.lightMap.channel),bumpMapUv:Me&&m(v.bumpMap.channel),normalMapUv:Se&&m(v.normalMap.channel),displacementMapUv:Ve&&m(v.displacementMap.channel),emissiveMapUv:Fe&&m(v.emissiveMap.channel),metalnessMapUv:Ke&&m(v.metalnessMap.channel),roughnessMapUv:Je&&m(v.roughnessMap.channel),anisotropyMapUv:Y&&m(v.anisotropyMap.channel),clearcoatMapUv:$&&m(v.clearcoatMap.channel),clearcoatNormalMapUv:fe&&m(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&m(v.clearcoatRoughnessMap.channel),iridescenceMapUv:ee&&m(v.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&m(v.iridescenceThicknessMap.channel),sheenColorMapUv:me&&m(v.sheenColorMap.channel),sheenRoughnessMapUv:De&&m(v.sheenRoughnessMap.channel),specularMapUv:ve&&m(v.specularMap.channel),specularColorMapUv:xe&&m(v.specularColorMap.channel),specularIntensityMapUv:Ie&&m(v.specularIntensityMap.channel),transmissionMapUv:ke&&m(v.transmissionMap.channel),thicknessMapUv:je&&m(v.thicknessMap.channel),alphaMapUv:be&&m(v.alphaMap.channel),vertexTangents:!!I.attributes.tangent&&(Se||U),vertexNormals:!!I.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!I.attributes.color&&I.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!I.attributes.uv&&(et||be),fog:!!z,useFog:v.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||I.attributes.normal===void 0&&Se===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:he,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:I.attributes.position!==void 0,morphTargets:I.morphAttributes.position!==void 0,morphNormals:I.morphAttributes.normal!==void 0,morphColors:I.morphAttributes.color!==void 0,morphTargetsCount:ce,morphTextureStride:Te,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:N.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:de,decodeVideoTexture:et&&v.map.isVideoTexture===!0&&ut.getTransfer(v.map.colorSpace)===xt,decodeVideoTextureEmissive:Fe&&v.emissiveMap.isVideoTexture===!0&&ut.getTransfer(v.emissiveMap.colorSpace)===xt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Qt,flipSided:v.side===fn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Re&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Re&&v.extensions.multiDraw===!0||Ue)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return We.vertexUv1s=l.has(1),We.vertexUv2s=l.has(2),We.vertexUv3s=l.has(3),l.clear(),We}function g(v){const E=[];if(v.shaderID?E.push(v.shaderID):(E.push(v.customVertexShaderID),E.push(v.customFragmentShaderID)),v.defines!==void 0)for(const C in v.defines)E.push(C),E.push(v.defines[C]);return v.isRawShaderMaterial===!1&&(p(E,v),T(E,v),E.push(i.outputColorSpace)),E.push(v.customProgramCacheKey),E.join()}function p(v,E){v.push(E.precision),v.push(E.outputColorSpace),v.push(E.envMapMode),v.push(E.envMapCubeUVHeight),v.push(E.mapUv),v.push(E.alphaMapUv),v.push(E.lightMapUv),v.push(E.aoMapUv),v.push(E.bumpMapUv),v.push(E.normalMapUv),v.push(E.displacementMapUv),v.push(E.emissiveMapUv),v.push(E.metalnessMapUv),v.push(E.roughnessMapUv),v.push(E.anisotropyMapUv),v.push(E.clearcoatMapUv),v.push(E.clearcoatNormalMapUv),v.push(E.clearcoatRoughnessMapUv),v.push(E.iridescenceMapUv),v.push(E.iridescenceThicknessMapUv),v.push(E.sheenColorMapUv),v.push(E.sheenRoughnessMapUv),v.push(E.specularMapUv),v.push(E.specularColorMapUv),v.push(E.specularIntensityMapUv),v.push(E.transmissionMapUv),v.push(E.thicknessMapUv),v.push(E.combine),v.push(E.fogExp2),v.push(E.sizeAttenuation),v.push(E.morphTargetsCount),v.push(E.morphAttributeCount),v.push(E.numDirLights),v.push(E.numPointLights),v.push(E.numSpotLights),v.push(E.numSpotLightMaps),v.push(E.numHemiLights),v.push(E.numRectAreaLights),v.push(E.numDirLightShadows),v.push(E.numPointLightShadows),v.push(E.numSpotLightShadows),v.push(E.numSpotLightShadowsWithMaps),v.push(E.numLightProbes),v.push(E.shadowMapType),v.push(E.toneMapping),v.push(E.numClippingPlanes),v.push(E.numClipIntersection),v.push(E.depthPacking)}function T(v,E){o.disableAll(),E.instancing&&o.enable(0),E.instancingColor&&o.enable(1),E.instancingMorph&&o.enable(2),E.matcap&&o.enable(3),E.envMap&&o.enable(4),E.normalMapObjectSpace&&o.enable(5),E.normalMapTangentSpace&&o.enable(6),E.clearcoat&&o.enable(7),E.iridescence&&o.enable(8),E.alphaTest&&o.enable(9),E.vertexColors&&o.enable(10),E.vertexAlphas&&o.enable(11),E.vertexUv1s&&o.enable(12),E.vertexUv2s&&o.enable(13),E.vertexUv3s&&o.enable(14),E.vertexTangents&&o.enable(15),E.anisotropy&&o.enable(16),E.alphaHash&&o.enable(17),E.batching&&o.enable(18),E.dispersion&&o.enable(19),E.batchingColor&&o.enable(20),E.gradientMap&&o.enable(21),E.packedNormalMap&&o.enable(22),E.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),E.fog&&o.enable(0),E.useFog&&o.enable(1),E.flatShading&&o.enable(2),E.logarithmicDepthBuffer&&o.enable(3),E.reversedDepthBuffer&&o.enable(4),E.skinning&&o.enable(5),E.morphTargets&&o.enable(6),E.morphNormals&&o.enable(7),E.morphColors&&o.enable(8),E.premultipliedAlpha&&o.enable(9),E.shadowMapEnabled&&o.enable(10),E.doubleSided&&o.enable(11),E.flipSided&&o.enable(12),E.useDepthPacking&&o.enable(13),E.dithering&&o.enable(14),E.transmission&&o.enable(15),E.sheen&&o.enable(16),E.opaque&&o.enable(17),E.pointsUvs&&o.enable(18),E.decodeVideoTexture&&o.enable(19),E.decodeVideoTextureEmissive&&o.enable(20),E.alphaToCoverage&&o.enable(21),E.numLightProbeGrids>0&&o.enable(22),E.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function b(v){const E=f[v.type];let C;if(E){const P=Kn[E];C=An.clone(P.uniforms)}else C=v.uniforms;return C}function w(v,E){let C=h.get(E);return C!==void 0?++C.usedTimes:(C=new ex(i,E,v,s),c.push(C),h.set(E,C)),C}function S(v){if(--v.usedTimes===0){const E=c.indexOf(v);c[E]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function M(v){a.remove(v)}function y(){a.dispose()}return{getParameters:x,getProgramCacheKey:g,getUniforms:b,acquireProgram:w,releaseProgram:S,releaseShaderCache:M,programs:c,dispose:y}}function ox(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function ax(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Ih(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Nh(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function a(u,f,m,x,g,p){let T=i[e];return T===void 0?(T={id:u.id,object:u,geometry:f,material:m,materialVariant:o(u),groupOrder:x,renderOrder:u.renderOrder,z:g,group:p},i[e]=T):(T.id=u.id,T.object=u,T.geometry=f,T.material=m,T.materialVariant=o(u),T.groupOrder=x,T.renderOrder=u.renderOrder,T.z=g,T.group=p),e++,T}function l(u,f,m,x,g,p){const T=a(u,f,m,x,g,p);m.transmission>0?n.push(T):m.transparent===!0?s.push(T):t.push(T)}function c(u,f,m,x,g,p){const T=a(u,f,m,x,g,p);m.transmission>0?n.unshift(T):m.transparent===!0?s.unshift(T):t.unshift(T)}function h(u,f,m){t.length>1&&t.sort(u||ax),n.length>1&&n.sort(f||Ih),s.length>1&&s.sort(f||Ih),m&&(t.reverse(),n.reverse(),s.reverse())}function d(){for(let u=e,f=i.length;u<f;u++){const m=i[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function lx(){let i=new WeakMap;function e(n,s){const r=i.get(n);let o;return r===void 0?(o=new Nh,i.set(n,[o])):s>=r.length?(o=new Nh,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function cx(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new A,color:new pe};break;case"SpotLight":t={position:new A,direction:new A,color:new pe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new A,color:new pe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new A,skyColor:new pe,groundColor:new pe};break;case"RectAreaLight":t={color:new pe,position:new A,halfWidth:new A,halfHeight:new A};break}return i[e.id]=t,t}}}function hx(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ae};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ae};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ae,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let ux=0;function dx(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function fx(i){const e=new cx,t=hx(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new A);const s=new A,r=new rt,o=new rt;function a(c){let h=0,d=0,u=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,m=0,x=0,g=0,p=0,T=0,b=0,w=0,S=0,M=0,y=0;c.sort(dx);for(let E=0,C=c.length;E<C;E++){const P=c[E],D=P.color,N=P.intensity,z=P.distance;let I=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===Gi?I=P.shadow.map.texture:I=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)h+=D.r*N,d+=D.g*N,u+=D.b*N;else if(P.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(P.sh.coefficients[V],N);y++}else if(P.isDirectionalLight){const V=e.get(P);if(V.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const O=P.shadow,G=t.get(P);G.shadowIntensity=O.intensity,G.shadowBias=O.bias,G.shadowNormalBias=O.normalBias,G.shadowRadius=O.radius,G.shadowMapSize=O.mapSize,n.directionalShadow[f]=G,n.directionalShadowMap[f]=I,n.directionalShadowMatrix[f]=P.shadow.matrix,T++}n.directional[f]=V,f++}else if(P.isSpotLight){const V=e.get(P);V.position.setFromMatrixPosition(P.matrixWorld),V.color.copy(D).multiplyScalar(N),V.distance=z,V.coneCos=Math.cos(P.angle),V.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),V.decay=P.decay,n.spot[x]=V;const O=P.shadow;if(P.map&&(n.spotLightMap[S]=P.map,S++,O.updateMatrices(P),P.castShadow&&M++),n.spotLightMatrix[x]=O.matrix,P.castShadow){const G=t.get(P);G.shadowIntensity=O.intensity,G.shadowBias=O.bias,G.shadowNormalBias=O.normalBias,G.shadowRadius=O.radius,G.shadowMapSize=O.mapSize,n.spotShadow[x]=G,n.spotShadowMap[x]=I,w++}x++}else if(P.isRectAreaLight){const V=e.get(P);V.color.copy(D).multiplyScalar(N),V.halfWidth.set(P.width*.5,0,0),V.halfHeight.set(0,P.height*.5,0),n.rectArea[g]=V,g++}else if(P.isPointLight){const V=e.get(P);if(V.color.copy(P.color).multiplyScalar(P.intensity),V.distance=P.distance,V.decay=P.decay,P.castShadow){const O=P.shadow,G=t.get(P);G.shadowIntensity=O.intensity,G.shadowBias=O.bias,G.shadowNormalBias=O.normalBias,G.shadowRadius=O.radius,G.shadowMapSize=O.mapSize,G.shadowCameraNear=O.camera.near,G.shadowCameraFar=O.camera.far,n.pointShadow[m]=G,n.pointShadowMap[m]=I,n.pointShadowMatrix[m]=P.shadow.matrix,b++}n.point[m]=V,m++}else if(P.isHemisphereLight){const V=e.get(P);V.skyColor.copy(P.color).multiplyScalar(N),V.groundColor.copy(P.groundColor).multiplyScalar(N),n.hemi[p]=V,p++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ae.LTC_FLOAT_1,n.rectAreaLTC2=Ae.LTC_FLOAT_2):(n.rectAreaLTC1=Ae.LTC_HALF_1,n.rectAreaLTC2=Ae.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const v=n.hash;(v.directionalLength!==f||v.pointLength!==m||v.spotLength!==x||v.rectAreaLength!==g||v.hemiLength!==p||v.numDirectionalShadows!==T||v.numPointShadows!==b||v.numSpotShadows!==w||v.numSpotMaps!==S||v.numLightProbes!==y)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.pointShadow.length=b,n.pointShadowMap.length=b,n.spotShadow.length=w,n.spotShadowMap.length=w,n.directionalShadowMatrix.length=T,n.pointShadowMatrix.length=b,n.spotLightMatrix.length=w+S-M,n.spotLightMap.length=S,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=y,v.directionalLength=f,v.pointLength=m,v.spotLength=x,v.rectAreaLength=g,v.hemiLength=p,v.numDirectionalShadows=T,v.numPointShadows=b,v.numSpotShadows=w,v.numSpotMaps=S,v.numLightProbes=y,n.version=ux++)}function l(c,h){let d=0,u=0,f=0,m=0,x=0;const g=h.matrixWorldInverse;for(let p=0,T=c.length;p<T;p++){const b=c[p];if(b.isDirectionalLight){const w=n.directional[d];w.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(g),d++}else if(b.isSpotLight){const w=n.spot[f];w.position.setFromMatrixPosition(b.matrixWorld),w.position.applyMatrix4(g),w.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(g),f++}else if(b.isRectAreaLight){const w=n.rectArea[m];w.position.setFromMatrixPosition(b.matrixWorld),w.position.applyMatrix4(g),o.identity(),r.copy(b.matrixWorld),r.premultiply(g),o.extractRotation(r),w.halfWidth.set(b.width*.5,0,0),w.halfHeight.set(0,b.height*.5,0),w.halfWidth.applyMatrix4(o),w.halfHeight.applyMatrix4(o),m++}else if(b.isPointLight){const w=n.point[u];w.position.setFromMatrixPosition(b.matrixWorld),w.position.applyMatrix4(g),u++}else if(b.isHemisphereLight){const w=n.hemi[x];w.direction.setFromMatrixPosition(b.matrixWorld),w.direction.transformDirection(g),x++}}}return{setup:a,setupView:l,state:n}}function Uh(i){const e=new fx(i),t=[],n=[],s=[];function r(u){d.camera=u,t.length=0,n.length=0,s.length=0}function o(u){t.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){e.setup(t)}function h(u){e.setupView(t,u)}const d={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function px(i){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new Uh(i),e.set(s,[a])):r>=o.length?(a=new Uh(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const mx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,gx=`uniform sampler2D shadow_pass;
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
}`,vx=[new A(1,0,0),new A(-1,0,0),new A(0,1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1)],xx=[new A(0,-1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1),new A(0,-1,0),new A(0,-1,0)],Oh=new rt,qs=new A,Ca=new A;function Mx(i,e,t){let n=new Jl;const s=new ae,r=new ae,o=new vt,a=new Ou,l=new Cp,c={},h=t.maxTextureSize,d={[Ci]:fn,[fn]:Ci,[Qt]:Qt},u=new ft({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ae},radius:{value:4}},vertexShader:mx,fragmentShader:gx}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const m=new At;m.setAttribute("position",new pn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new qe(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=tr;let p=this.type;this.render=function(M,y,v){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||M.length===0)return;this.type===Ed&&(Ze("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=tr);const E=i.getRenderTarget(),C=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),D=i.state;D.setBlending(jt),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const N=p!==this.type;N&&y.traverse(function(z){z.material&&(Array.isArray(z.material)?z.material.forEach(I=>I.needsUpdate=!0):z.material.needsUpdate=!0)});for(let z=0,I=M.length;z<I;z++){const V=M[z],O=V.shadow;if(O===void 0){Ze("WebGLShadowMap:",V,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;s.copy(O.mapSize);const G=O.getFrameExtents();s.multiply(G),r.copy(O.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/G.x),s.x=r.x*G.x,O.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/G.y),s.y=r.y*G.y,O.mapSize.y=r.y));const q=i.state.buffers.depth.getReversed();if(O.camera._reversedDepth=q,O.map===null||N===!0){if(O.map!==null&&(O.map.depthTexture!==null&&(O.map.depthTexture.dispose(),O.map.depthTexture=null),O.map.dispose()),this.type===Js){if(V.isPointLight){Ze("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}O.map=new Pt(s.x,s.y,{format:Gi,type:Vt,minFilter:sn,magFilter:sn,generateMipmaps:!1}),O.map.texture.name=V.name+".shadowMap",O.map.depthTexture=new Wi(s.x,s.y,Fn),O.map.depthTexture.name=V.name+".shadowMapDepth",O.map.depthTexture.format=di,O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=Ct,O.map.depthTexture.magFilter=Ct}else V.isPointLight?(O.map=new zu(s.x),O.map.depthTexture=new qf(s.x,$n)):(O.map=new Pt(s.x,s.y),O.map.depthTexture=new Wi(s.x,s.y,$n)),O.map.depthTexture.name=V.name+".shadowMap",O.map.depthTexture.format=di,this.type===tr?(O.map.depthTexture.compareFunction=q?Xl:Wl,O.map.depthTexture.minFilter=sn,O.map.depthTexture.magFilter=sn):(O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=Ct,O.map.depthTexture.magFilter=Ct);O.camera.updateProjectionMatrix()}const re=O.map.isWebGLCubeRenderTarget?6:1;for(let ne=0;ne<re;ne++){if(O.map.isWebGLCubeRenderTarget)i.setRenderTarget(O.map,ne),i.clear();else{ne===0&&(i.setRenderTarget(O.map),i.clear());const ce=O.getViewport(ne);o.set(r.x*ce.x,r.y*ce.y,r.x*ce.z,r.y*ce.w),D.viewport(o)}if(V.isPointLight){const ce=O.camera,Te=O.matrix,J=V.distance||ce.far;J!==ce.far&&(ce.far=J,ce.updateProjectionMatrix()),qs.setFromMatrixPosition(V.matrixWorld),ce.position.copy(qs),Ca.copy(ce.position),Ca.add(vx[ne]),ce.up.copy(xx[ne]),ce.lookAt(Ca),ce.updateMatrixWorld(),Te.makeTranslation(-qs.x,-qs.y,-qs.z),Oh.multiplyMatrices(ce.projectionMatrix,ce.matrixWorldInverse),O._frustum.setFromProjectionMatrix(Oh,ce.coordinateSystem,ce.reversedDepth)}else O.updateMatrices(V);n=O.getFrustum(),w(y,v,O.camera,V,this.type)}O.isPointLightShadow!==!0&&this.type===Js&&T(O,v),O.needsUpdate=!1}p=this.type,g.needsUpdate=!1,i.setRenderTarget(E,C,P)};function T(M,y){const v=e.update(x);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,f.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new Pt(s.x,s.y,{format:Gi,type:Vt})),u.uniforms.shadow_pass.value=M.map.depthTexture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,i.setRenderTarget(M.mapPass),i.clear(),i.renderBufferDirect(y,null,v,u,x,null),f.uniforms.shadow_pass.value=M.mapPass.texture,f.uniforms.resolution.value=M.mapSize,f.uniforms.radius.value=M.radius,i.setRenderTarget(M.map),i.clear(),i.renderBufferDirect(y,null,v,f,x,null)}function b(M,y,v,E){let C=null;const P=v.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(P!==void 0)C=P;else if(C=v.isPointLight===!0?l:a,i.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0||y.alphaToCoverage===!0){const D=C.uuid,N=y.uuid;let z=c[D];z===void 0&&(z={},c[D]=z);let I=z[N];I===void 0&&(I=C.clone(),z[N]=I,y.addEventListener("dispose",S)),C=I}if(C.visible=y.visible,C.wireframe=y.wireframe,E===Js?C.side=y.shadowSide!==null?y.shadowSide:y.side:C.side=y.shadowSide!==null?y.shadowSide:d[y.side],C.alphaMap=y.alphaMap,C.alphaTest=y.alphaToCoverage===!0?.5:y.alphaTest,C.map=y.map,C.clipShadows=y.clipShadows,C.clippingPlanes=y.clippingPlanes,C.clipIntersection=y.clipIntersection,C.displacementMap=y.displacementMap,C.displacementScale=y.displacementScale,C.displacementBias=y.displacementBias,C.wireframeLinewidth=y.wireframeLinewidth,C.linewidth=y.linewidth,v.isPointLight===!0&&C.isMeshDistanceMaterial===!0){const D=i.properties.get(C);D.light=v}return C}function w(M,y,v,E,C){if(M.visible===!1)return;if(M.layers.test(y.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&C===Js)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,M.matrixWorld);const N=e.update(M),z=M.material;if(Array.isArray(z)){const I=N.groups;for(let V=0,O=I.length;V<O;V++){const G=I[V],q=z[G.materialIndex];if(q&&q.visible){const re=b(M,q,E,C);M.onBeforeShadow(i,M,y,v,N,re,G),i.renderBufferDirect(v,null,N,re,M,G),M.onAfterShadow(i,M,y,v,N,re,G)}}}else if(z.visible){const I=b(M,z,E,C);M.onBeforeShadow(i,M,y,v,N,I,null),i.renderBufferDirect(v,null,N,I,M,null),M.onAfterShadow(i,M,y,v,N,I,null)}}const D=M.children;for(let N=0,z=D.length;N<z;N++)w(D[N],y,v,E,C)}function S(M){M.target.removeEventListener("dispose",S);for(const v in c){const E=c[v],C=M.target.uuid;C in E&&(E[C].dispose(),delete E[C])}}}function wx(i,e){function t(){let F=!1;const be=new vt;let le=null;const Ee=new vt(0,0,0,0);return{setMask:function(Re){le!==Re&&!F&&(i.colorMask(Re,Re,Re,Re),le=Re)},setLocked:function(Re){F=Re},setClear:function(Re,de,We,Be,Lt){Lt===!0&&(Re*=Be,de*=Be,We*=Be),be.set(Re,de,We,Be),Ee.equals(be)===!1&&(i.clearColor(Re,de,We,Be),Ee.copy(be))},reset:function(){F=!1,le=null,Ee.set(-1,0,0,0)}}}function n(){let F=!1,be=!1,le=null,Ee=null,Re=null;return{setReversed:function(de){if(be!==de){const We=e.get("EXT_clip_control");de?We.clipControlEXT(We.LOWER_LEFT_EXT,We.ZERO_TO_ONE_EXT):We.clipControlEXT(We.LOWER_LEFT_EXT,We.NEGATIVE_ONE_TO_ONE_EXT),be=de;const Be=Re;Re=null,this.setClear(Be)}},getReversed:function(){return be},setTest:function(de){de?W(i.DEPTH_TEST):he(i.DEPTH_TEST)},setMask:function(de){le!==de&&!F&&(i.depthMask(de),le=de)},setFunc:function(de){if(be&&(de=nf[de]),Ee!==de){switch(de){case za:i.depthFunc(i.NEVER);break;case Va:i.depthFunc(i.ALWAYS);break;case Ga:i.depthFunc(i.LESS);break;case Ss:i.depthFunc(i.LEQUAL);break;case Wa:i.depthFunc(i.EQUAL);break;case Xa:i.depthFunc(i.GEQUAL);break;case Ya:i.depthFunc(i.GREATER);break;case qa:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Ee=de}},setLocked:function(de){F=de},setClear:function(de){Re!==de&&(Re=de,be&&(de=1-de),i.clearDepth(de))},reset:function(){F=!1,le=null,Ee=null,Re=null,be=!1}}}function s(){let F=!1,be=null,le=null,Ee=null,Re=null,de=null,We=null,Be=null,Lt=null;return{setTest:function(bt){F||(bt?W(i.STENCIL_TEST):he(i.STENCIL_TEST))},setMask:function(bt){be!==bt&&!F&&(i.stencilMask(bt),be=bt)},setFunc:function(bt,Gn,Wn){(le!==bt||Ee!==Gn||Re!==Wn)&&(i.stencilFunc(bt,Gn,Wn),le=bt,Ee=Gn,Re=Wn)},setOp:function(bt,Gn,Wn){(de!==bt||We!==Gn||Be!==Wn)&&(i.stencilOp(bt,Gn,Wn),de=bt,We=Gn,Be=Wn)},setLocked:function(bt){F=bt},setClear:function(bt){Lt!==bt&&(i.clearStencil(bt),Lt=bt)},reset:function(){F=!1,be=null,le=null,Ee=null,Re=null,de=null,We=null,Be=null,Lt=null}}}const r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap;let h={},d={},u={},f=new WeakMap,m=[],x=null,g=!1,p=null,T=null,b=null,w=null,S=null,M=null,y=null,v=new pe(0,0,0),E=0,C=!1,P=null,D=null,N=null,z=null,I=null;const V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let O=!1,G=0;const q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(G=parseFloat(/^WebGL (\d)/.exec(q)[1]),O=G>=1):q.indexOf("OpenGL ES")!==-1&&(G=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),O=G>=2);let re=null,ne={};const ce=i.getParameter(i.SCISSOR_BOX),Te=i.getParameter(i.VIEWPORT),J=new vt().fromArray(ce),se=new vt().fromArray(Te);function k(F,be,le,Ee){const Re=new Uint8Array(4),de=i.createTexture();i.bindTexture(F,de),i.texParameteri(F,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(F,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let We=0;We<le;We++)F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY?i.texImage3D(be,0,i.RGBA,1,1,Ee,0,i.RGBA,i.UNSIGNED_BYTE,Re):i.texImage2D(be+We,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Re);return de}const X={};X[i.TEXTURE_2D]=k(i.TEXTURE_2D,i.TEXTURE_2D,1),X[i.TEXTURE_CUBE_MAP]=k(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[i.TEXTURE_2D_ARRAY]=k(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),X[i.TEXTURE_3D]=k(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),W(i.DEPTH_TEST),o.setFunc(Ss),Me(!1),Se(Sc),W(i.CULL_FACE),j(jt);function W(F){h[F]!==!0&&(i.enable(F),h[F]=!0)}function he(F){h[F]!==!1&&(i.disable(F),h[F]=!1)}function ue(F,be){return u[F]!==be?(i.bindFramebuffer(F,be),u[F]=be,F===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=be),F===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=be),!0):!1}function Ue(F,be){let le=m,Ee=!1;if(F){le=f.get(be),le===void 0&&(le=[],f.set(be,le));const Re=F.textures;if(le.length!==Re.length||le[0]!==i.COLOR_ATTACHMENT0){for(let de=0,We=Re.length;de<We;de++)le[de]=i.COLOR_ATTACHMENT0+de;le.length=Re.length,Ee=!0}}else le[0]!==i.BACK&&(le[0]=i.BACK,Ee=!0);Ee&&i.drawBuffers(le)}function et(F){return x!==F?(i.useProgram(F),x=F,!0):!1}const _e={[On]:i.FUNC_ADD,[Td]:i.FUNC_SUBTRACT,[Ad]:i.FUNC_REVERSE_SUBTRACT};_e[Rd]=i.MIN,_e[Cd]=i.MAX;const te={[js]:i.ZERO,[Pd]:i.ONE,[Ld]:i.SRC_COLOR,[ka]:i.SRC_ALPHA,[Ud]:i.SRC_ALPHA_SATURATE,[Ha]:i.DST_COLOR,[Ba]:i.DST_ALPHA,[Dd]:i.ONE_MINUS_SRC_COLOR,[Fa]:i.ONE_MINUS_SRC_ALPHA,[Nd]:i.ONE_MINUS_DST_COLOR,[Id]:i.ONE_MINUS_DST_ALPHA,[Od]:i.CONSTANT_COLOR,[kd]:i.ONE_MINUS_CONSTANT_COLOR,[Fd]:i.CONSTANT_ALPHA,[Bd]:i.ONE_MINUS_CONSTANT_ALPHA};function j(F,be,le,Ee,Re,de,We,Be,Lt,bt){if(F===jt){g===!0&&(he(i.BLEND),g=!1);return}if(g===!1&&(W(i.BLEND),g=!0),F!==jh){if(F!==p||bt!==C){if((T!==On||S!==On)&&(i.blendEquation(i.FUNC_ADD),T=On,S=On),bt)switch(F){case ws:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Bn:i.blendFunc(i.ONE,i.ONE);break;case bc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Ec:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:ht("WebGLState: Invalid blending: ",F);break}else switch(F){case ws:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Bn:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case bc:ht("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ec:ht("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ht("WebGLState: Invalid blending: ",F);break}b=null,w=null,M=null,y=null,v.set(0,0,0),E=0,p=F,C=bt}return}Re=Re||be,de=de||le,We=We||Ee,(be!==T||Re!==S)&&(i.blendEquationSeparate(_e[be],_e[Re]),T=be,S=Re),(le!==b||Ee!==w||de!==M||We!==y)&&(i.blendFuncSeparate(te[le],te[Ee],te[de],te[We]),b=le,w=Ee,M=de,y=We),(Be.equals(v)===!1||Lt!==E)&&(i.blendColor(Be.r,Be.g,Be.b,Lt),v.copy(Be),E=Lt),p=F,C=!1}function oe(F,be){F.side===Qt?he(i.CULL_FACE):W(i.CULL_FACE);let le=F.side===fn;be&&(le=!le),Me(le),F.blending===ws&&F.transparent===!1?j(jt):j(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),r.setMask(F.colorWrite);const Ee=F.stencilWrite;a.setTest(Ee),Ee&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),Fe(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?W(i.SAMPLE_ALPHA_TO_COVERAGE):he(i.SAMPLE_ALPHA_TO_COVERAGE)}function Me(F){P!==F&&(F?i.frontFace(i.CW):i.frontFace(i.CCW),P=F)}function Se(F){F!==Sd?(W(i.CULL_FACE),F!==D&&(F===Sc?i.cullFace(i.BACK):F===bd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):he(i.CULL_FACE),D=F}function Ve(F){F!==N&&(O&&i.lineWidth(F),N=F)}function Fe(F,be,le){F?(W(i.POLYGON_OFFSET_FILL),(z!==be||I!==le)&&(z=be,I=le,o.getReversed()&&(be=-be),i.polygonOffset(be,le))):he(i.POLYGON_OFFSET_FILL)}function Ke(F){F?W(i.SCISSOR_TEST):he(i.SCISSOR_TEST)}function Je(F){F===void 0&&(F=i.TEXTURE0+V-1),re!==F&&(i.activeTexture(F),re=F)}function U(F,be,le){le===void 0&&(re===null?le=i.TEXTURE0+V-1:le=re);let Ee=ne[le];Ee===void 0&&(Ee={type:void 0,texture:void 0},ne[le]=Ee),(Ee.type!==F||Ee.texture!==be)&&(re!==le&&(i.activeTexture(le),re=le),i.bindTexture(F,be||X[F]),Ee.type=F,Ee.texture=be)}function dt(){const F=ne[re];F!==void 0&&F.type!==void 0&&(i.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function nt(){try{i.compressedTexImage2D(...arguments)}catch(F){ht("WebGLState:",F)}}function L(){try{i.compressedTexImage3D(...arguments)}catch(F){ht("WebGLState:",F)}}function _(){try{i.texSubImage2D(...arguments)}catch(F){ht("WebGLState:",F)}}function B(){try{i.texSubImage3D(...arguments)}catch(F){ht("WebGLState:",F)}}function Y(){try{i.compressedTexSubImage2D(...arguments)}catch(F){ht("WebGLState:",F)}}function $(){try{i.compressedTexSubImage3D(...arguments)}catch(F){ht("WebGLState:",F)}}function fe(){try{i.texStorage2D(...arguments)}catch(F){ht("WebGLState:",F)}}function ge(){try{i.texStorage3D(...arguments)}catch(F){ht("WebGLState:",F)}}function ee(){try{i.texImage2D(...arguments)}catch(F){ht("WebGLState:",F)}}function ie(){try{i.texImage3D(...arguments)}catch(F){ht("WebGLState:",F)}}function me(F){return d[F]!==void 0?d[F]:i.getParameter(F)}function De(F,be){d[F]!==be&&(i.pixelStorei(F,be),d[F]=be)}function ve(F){J.equals(F)===!1&&(i.scissor(F.x,F.y,F.z,F.w),J.copy(F))}function xe(F){se.equals(F)===!1&&(i.viewport(F.x,F.y,F.z,F.w),se.copy(F))}function Ie(F,be){let le=c.get(be);le===void 0&&(le=new WeakMap,c.set(be,le));let Ee=le.get(F);Ee===void 0&&(Ee=i.getUniformBlockIndex(be,F.name),le.set(F,Ee))}function ke(F,be){const Ee=c.get(be).get(F);l.get(be)!==Ee&&(i.uniformBlockBinding(be,Ee,F.__bindingPointIndex),l.set(be,Ee))}function je(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},re=null,ne={},u={},f=new WeakMap,m=[],x=null,g=!1,p=null,T=null,b=null,w=null,S=null,M=null,y=null,v=new pe(0,0,0),E=0,C=!1,P=null,D=null,N=null,z=null,I=null,J.set(0,0,i.canvas.width,i.canvas.height),se.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:W,disable:he,bindFramebuffer:ue,drawBuffers:Ue,useProgram:et,setBlending:j,setMaterial:oe,setFlipSided:Me,setCullFace:Se,setLineWidth:Ve,setPolygonOffset:Fe,setScissorTest:Ke,activeTexture:Je,bindTexture:U,unbindTexture:dt,compressedTexImage2D:nt,compressedTexImage3D:L,texImage2D:ee,texImage3D:ie,pixelStorei:De,getParameter:me,updateUBOMapping:Ie,uniformBlockBinding:ke,texStorage2D:fe,texStorage3D:ge,texSubImage2D:_,texSubImage3D:B,compressedTexSubImage2D:Y,compressedTexSubImage3D:$,scissor:ve,viewport:xe,reset:je}}function yx(i,e,t,n,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ae,h=new WeakMap,d=new Set;let u;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(L,_){return m?new OffscreenCanvas(L,_):yo("canvas")}function g(L,_,B){let Y=1;const $=nt(L);if(($.width>B||$.height>B)&&(Y=B/Math.max($.width,$.height)),Y<1)if(typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&L instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&L instanceof ImageBitmap||typeof VideoFrame<"u"&&L instanceof VideoFrame){const fe=Math.floor(Y*$.width),ge=Math.floor(Y*$.height);u===void 0&&(u=x(fe,ge));const ee=_?x(fe,ge):u;return ee.width=fe,ee.height=ge,ee.getContext("2d").drawImage(L,0,0,fe,ge),Ze("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+fe+"x"+ge+")."),ee}else return"data"in L&&Ze("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),L;return L}function p(L){return L.generateMipmaps}function T(L){i.generateMipmap(L)}function b(L){return L.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:L.isWebGL3DRenderTarget?i.TEXTURE_3D:L.isWebGLArrayRenderTarget||L.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function w(L,_,B,Y,$,fe=!1){if(L!==null){if(i[L]!==void 0)return i[L];Ze("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+L+"'")}let ge;Y&&(ge=e.get("EXT_texture_norm16"),ge||Ze("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ee=_;if(_===i.RED&&(B===i.FLOAT&&(ee=i.R32F),B===i.HALF_FLOAT&&(ee=i.R16F),B===i.UNSIGNED_BYTE&&(ee=i.R8),B===i.UNSIGNED_SHORT&&ge&&(ee=ge.R16_EXT),B===i.SHORT&&ge&&(ee=ge.R16_SNORM_EXT)),_===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(ee=i.R8UI),B===i.UNSIGNED_SHORT&&(ee=i.R16UI),B===i.UNSIGNED_INT&&(ee=i.R32UI),B===i.BYTE&&(ee=i.R8I),B===i.SHORT&&(ee=i.R16I),B===i.INT&&(ee=i.R32I)),_===i.RG&&(B===i.FLOAT&&(ee=i.RG32F),B===i.HALF_FLOAT&&(ee=i.RG16F),B===i.UNSIGNED_BYTE&&(ee=i.RG8),B===i.UNSIGNED_SHORT&&ge&&(ee=ge.RG16_EXT),B===i.SHORT&&ge&&(ee=ge.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(ee=i.RG8UI),B===i.UNSIGNED_SHORT&&(ee=i.RG16UI),B===i.UNSIGNED_INT&&(ee=i.RG32UI),B===i.BYTE&&(ee=i.RG8I),B===i.SHORT&&(ee=i.RG16I),B===i.INT&&(ee=i.RG32I)),_===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(ee=i.RGB8UI),B===i.UNSIGNED_SHORT&&(ee=i.RGB16UI),B===i.UNSIGNED_INT&&(ee=i.RGB32UI),B===i.BYTE&&(ee=i.RGB8I),B===i.SHORT&&(ee=i.RGB16I),B===i.INT&&(ee=i.RGB32I)),_===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(ee=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(ee=i.RGBA16UI),B===i.UNSIGNED_INT&&(ee=i.RGBA32UI),B===i.BYTE&&(ee=i.RGBA8I),B===i.SHORT&&(ee=i.RGBA16I),B===i.INT&&(ee=i.RGBA32I)),_===i.RGB&&(B===i.UNSIGNED_SHORT&&ge&&(ee=ge.RGB16_EXT),B===i.SHORT&&ge&&(ee=ge.RGB16_SNORM_EXT),B===i.UNSIGNED_INT_5_9_9_9_REV&&(ee=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(ee=i.R11F_G11F_B10F)),_===i.RGBA){const ie=fe?wo:ut.getTransfer($);B===i.FLOAT&&(ee=i.RGBA32F),B===i.HALF_FLOAT&&(ee=i.RGBA16F),B===i.UNSIGNED_BYTE&&(ee=ie===xt?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT&&ge&&(ee=ge.RGBA16_EXT),B===i.SHORT&&ge&&(ee=ge.RGBA16_SNORM_EXT),B===i.UNSIGNED_SHORT_4_4_4_4&&(ee=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(ee=i.RGB5_A1)}return(ee===i.R16F||ee===i.R32F||ee===i.RG16F||ee===i.RG32F||ee===i.RGBA16F||ee===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ee}function S(L,_){let B;return L?_===null||_===$n||_===Es?B=i.DEPTH24_STENCIL8:_===Fn?B=i.DEPTH32F_STENCIL8:_===cr&&(B=i.DEPTH24_STENCIL8,Ze("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===$n||_===Es?B=i.DEPTH_COMPONENT24:_===Fn?B=i.DEPTH_COMPONENT32F:_===cr&&(B=i.DEPTH_COMPONENT16),B}function M(L,_){return p(L)===!0||L.isFramebufferTexture&&L.minFilter!==Ct&&L.minFilter!==sn?Math.log2(Math.max(_.width,_.height))+1:L.mipmaps!==void 0&&L.mipmaps.length>0?L.mipmaps.length:L.isCompressedTexture&&Array.isArray(L.image)?_.mipmaps.length:1}function y(L){const _=L.target;_.removeEventListener("dispose",y),E(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function v(L){const _=L.target;_.removeEventListener("dispose",v),P(_)}function E(L){const _=n.get(L);if(_.__webglInit===void 0)return;const B=L.source,Y=f.get(B);if(Y){const $=Y[_.__cacheKey];$.usedTimes--,$.usedTimes===0&&C(L),Object.keys(Y).length===0&&f.delete(B)}n.remove(L)}function C(L){const _=n.get(L);i.deleteTexture(_.__webglTexture);const B=L.source,Y=f.get(B);delete Y[_.__cacheKey],o.memory.textures--}function P(L){const _=n.get(L);if(L.depthTexture&&(L.depthTexture.dispose(),n.remove(L.depthTexture)),L.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(_.__webglFramebuffer[Y]))for(let $=0;$<_.__webglFramebuffer[Y].length;$++)i.deleteFramebuffer(_.__webglFramebuffer[Y][$]);else i.deleteFramebuffer(_.__webglFramebuffer[Y]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[Y])}else{if(Array.isArray(_.__webglFramebuffer))for(let Y=0;Y<_.__webglFramebuffer.length;Y++)i.deleteFramebuffer(_.__webglFramebuffer[Y]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let Y=0;Y<_.__webglColorRenderbuffer.length;Y++)_.__webglColorRenderbuffer[Y]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[Y]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}const B=L.textures;for(let Y=0,$=B.length;Y<$;Y++){const fe=n.get(B[Y]);fe.__webglTexture&&(i.deleteTexture(fe.__webglTexture),o.memory.textures--),n.remove(B[Y])}n.remove(L)}let D=0;function N(){D=0}function z(){return D}function I(L){D=L}function V(){const L=D;return L>=s.maxTextures&&Ze("WebGLTextures: Trying to use "+L+" texture units while this GPU supports only "+s.maxTextures),D+=1,L}function O(L){const _=[];return _.push(L.wrapS),_.push(L.wrapT),_.push(L.wrapR||0),_.push(L.magFilter),_.push(L.minFilter),_.push(L.anisotropy),_.push(L.internalFormat),_.push(L.format),_.push(L.type),_.push(L.generateMipmaps),_.push(L.premultiplyAlpha),_.push(L.flipY),_.push(L.unpackAlignment),_.push(L.colorSpace),_.join()}function G(L,_){const B=n.get(L);if(L.isVideoTexture&&U(L),L.isRenderTargetTexture===!1&&L.isExternalTexture!==!0&&L.version>0&&B.__version!==L.version){const Y=L.image;if(Y===null)Ze("WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)Ze("WebGLRenderer: Texture marked for update but image is incomplete");else{he(B,L,_);return}}else L.isExternalTexture&&(B.__webglTexture=L.sourceTexture?L.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+_)}function q(L,_){const B=n.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&B.__version!==L.version){he(B,L,_);return}else L.isExternalTexture&&(B.__webglTexture=L.sourceTexture?L.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+_)}function re(L,_){const B=n.get(L);if(L.isRenderTargetTexture===!1&&L.version>0&&B.__version!==L.version){he(B,L,_);return}t.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+_)}function ne(L,_){const B=n.get(L);if(L.isCubeDepthTexture!==!0&&L.version>0&&B.__version!==L.version){ue(B,L,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+_)}const ce={[mn]:i.REPEAT,[Zn]:i.CLAMP_TO_EDGE,[Ka]:i.MIRRORED_REPEAT},Te={[Ct]:i.NEAREST,[Gd]:i.NEAREST_MIPMAP_NEAREST,[br]:i.NEAREST_MIPMAP_LINEAR,[sn]:i.LINEAR,[Yo]:i.LINEAR_MIPMAP_NEAREST,[Ti]:i.LINEAR_MIPMAP_LINEAR},J={[qd]:i.NEVER,[Qd]:i.ALWAYS,[Kd]:i.LESS,[Wl]:i.LEQUAL,[Zd]:i.EQUAL,[Xl]:i.GEQUAL,[Jd]:i.GREATER,[jd]:i.NOTEQUAL};function se(L,_){if(_.type===Fn&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===sn||_.magFilter===Yo||_.magFilter===br||_.magFilter===Ti||_.minFilter===sn||_.minFilter===Yo||_.minFilter===br||_.minFilter===Ti)&&Ze("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(L,i.TEXTURE_WRAP_S,ce[_.wrapS]),i.texParameteri(L,i.TEXTURE_WRAP_T,ce[_.wrapT]),(L===i.TEXTURE_3D||L===i.TEXTURE_2D_ARRAY)&&i.texParameteri(L,i.TEXTURE_WRAP_R,ce[_.wrapR]),i.texParameteri(L,i.TEXTURE_MAG_FILTER,Te[_.magFilter]),i.texParameteri(L,i.TEXTURE_MIN_FILTER,Te[_.minFilter]),_.compareFunction&&(i.texParameteri(L,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(L,i.TEXTURE_COMPARE_FUNC,J[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ct||_.minFilter!==br&&_.minFilter!==Ti||_.type===Fn&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){const B=e.get("EXT_texture_filter_anisotropic");i.texParameterf(L,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function k(L,_){let B=!1;L.__webglInit===void 0&&(L.__webglInit=!0,_.addEventListener("dispose",y));const Y=_.source;let $=f.get(Y);$===void 0&&($={},f.set(Y,$));const fe=O(_);if(fe!==L.__cacheKey){$[fe]===void 0&&($[fe]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,B=!0),$[fe].usedTimes++;const ge=$[L.__cacheKey];ge!==void 0&&($[L.__cacheKey].usedTimes--,ge.usedTimes===0&&C(_)),L.__cacheKey=fe,L.__webglTexture=$[fe].texture}return B}function X(L,_,B){return Math.floor(Math.floor(L/B)/_)}function W(L,_,B,Y){const fe=L.updateRanges;if(fe.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,B,Y,_.data);else{fe.sort((De,ve)=>De.start-ve.start);let ge=0;for(let De=1;De<fe.length;De++){const ve=fe[ge],xe=fe[De],Ie=ve.start+ve.count,ke=X(xe.start,_.width,4),je=X(ve.start,_.width,4);xe.start<=Ie+1&&ke===je&&X(xe.start+xe.count-1,_.width,4)===ke?ve.count=Math.max(ve.count,xe.start+xe.count-ve.start):(++ge,fe[ge]=xe)}fe.length=ge+1;const ee=t.getParameter(i.UNPACK_ROW_LENGTH),ie=t.getParameter(i.UNPACK_SKIP_PIXELS),me=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let De=0,ve=fe.length;De<ve;De++){const xe=fe[De],Ie=Math.floor(xe.start/4),ke=Math.ceil(xe.count/4),je=Ie%_.width,F=Math.floor(Ie/_.width),be=ke,le=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,je),t.pixelStorei(i.UNPACK_SKIP_ROWS,F),t.texSubImage2D(i.TEXTURE_2D,0,je,F,be,le,B,Y,_.data)}L.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,ee),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ie),t.pixelStorei(i.UNPACK_SKIP_ROWS,me)}}function he(L,_,B){let Y=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(Y=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(Y=i.TEXTURE_3D);const $=k(L,_),fe=_.source;t.bindTexture(Y,L.__webglTexture,i.TEXTURE0+B);const ge=n.get(fe);if(fe.version!==ge.__version||$===!0){if(t.activeTexture(i.TEXTURE0+B),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){const le=ut.getPrimaries(ut.workingColorSpace),Ee=_.colorSpace===li?null:ut.getPrimaries(_.colorSpace),Re=_.colorSpace===li||le===Ee?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re)}t.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let ie=g(_.image,!1,s.maxTextureSize);ie=dt(_,ie);const me=r.convert(_.format,_.colorSpace),De=r.convert(_.type);let ve=w(_.internalFormat,me,De,_.normalized,_.colorSpace,_.isVideoTexture);se(Y,_);let xe;const Ie=_.mipmaps,ke=_.isVideoTexture!==!0,je=ge.__version===void 0||$===!0,F=fe.dataReady,be=M(_,ie);if(_.isDepthTexture)ve=S(_.format===Ai,_.type),je&&(ke?t.texStorage2D(i.TEXTURE_2D,1,ve,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,ve,ie.width,ie.height,0,me,De,null));else if(_.isDataTexture)if(Ie.length>0){ke&&je&&t.texStorage2D(i.TEXTURE_2D,be,ve,Ie[0].width,Ie[0].height);for(let le=0,Ee=Ie.length;le<Ee;le++)xe=Ie[le],ke?F&&t.texSubImage2D(i.TEXTURE_2D,le,0,0,xe.width,xe.height,me,De,xe.data):t.texImage2D(i.TEXTURE_2D,le,ve,xe.width,xe.height,0,me,De,xe.data);_.generateMipmaps=!1}else ke?(je&&t.texStorage2D(i.TEXTURE_2D,be,ve,ie.width,ie.height),F&&W(_,ie,me,De)):t.texImage2D(i.TEXTURE_2D,0,ve,ie.width,ie.height,0,me,De,ie.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){ke&&je&&t.texStorage3D(i.TEXTURE_2D_ARRAY,be,ve,Ie[0].width,Ie[0].height,ie.depth);for(let le=0,Ee=Ie.length;le<Ee;le++)if(xe=Ie[le],_.format!==yn)if(me!==null)if(ke){if(F)if(_.layerUpdates.size>0){const Re=ph(xe.width,xe.height,_.format,_.type);for(const de of _.layerUpdates){const We=xe.data.subarray(de*Re/xe.data.BYTES_PER_ELEMENT,(de+1)*Re/xe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,le,0,0,de,xe.width,xe.height,1,me,We)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,le,0,0,0,xe.width,xe.height,ie.depth,me,xe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,le,ve,xe.width,xe.height,ie.depth,0,xe.data,0,0);else Ze("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ke?F&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,le,0,0,0,xe.width,xe.height,ie.depth,me,De,xe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,le,ve,xe.width,xe.height,ie.depth,0,me,De,xe.data)}else{ke&&je&&t.texStorage2D(i.TEXTURE_2D,be,ve,Ie[0].width,Ie[0].height);for(let le=0,Ee=Ie.length;le<Ee;le++)xe=Ie[le],_.format!==yn?me!==null?ke?F&&t.compressedTexSubImage2D(i.TEXTURE_2D,le,0,0,xe.width,xe.height,me,xe.data):t.compressedTexImage2D(i.TEXTURE_2D,le,ve,xe.width,xe.height,0,xe.data):Ze("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ke?F&&t.texSubImage2D(i.TEXTURE_2D,le,0,0,xe.width,xe.height,me,De,xe.data):t.texImage2D(i.TEXTURE_2D,le,ve,xe.width,xe.height,0,me,De,xe.data)}else if(_.isDataArrayTexture)if(ke){if(je&&t.texStorage3D(i.TEXTURE_2D_ARRAY,be,ve,ie.width,ie.height,ie.depth),F)if(_.layerUpdates.size>0){const le=ph(ie.width,ie.height,_.format,_.type);for(const Ee of _.layerUpdates){const Re=ie.data.subarray(Ee*le/ie.data.BYTES_PER_ELEMENT,(Ee+1)*le/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Ee,ie.width,ie.height,1,me,De,Re)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,me,De,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ve,ie.width,ie.height,ie.depth,0,me,De,ie.data);else if(_.isData3DTexture)ke?(je&&t.texStorage3D(i.TEXTURE_3D,be,ve,ie.width,ie.height,ie.depth),F&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,me,De,ie.data)):t.texImage3D(i.TEXTURE_3D,0,ve,ie.width,ie.height,ie.depth,0,me,De,ie.data);else if(_.isFramebufferTexture){if(je)if(ke)t.texStorage2D(i.TEXTURE_2D,be,ve,ie.width,ie.height);else{let le=ie.width,Ee=ie.height;for(let Re=0;Re<be;Re++)t.texImage2D(i.TEXTURE_2D,Re,ve,le,Ee,0,me,De,null),le>>=1,Ee>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){const le=i.canvas;if(le.hasAttribute("layoutsubtree")||le.setAttribute("layoutsubtree","true"),ie.parentNode!==le){le.appendChild(ie),d.add(_),le.onpaint=Ee=>{const Re=Ee.changedElements;for(const de of d)Re.includes(de.image)&&(de.needsUpdate=!0)},le.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ie);else{const Re=i.RGBA,de=i.RGBA,We=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Re,de,We,ie)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Ie.length>0){if(ke&&je){const le=nt(Ie[0]);t.texStorage2D(i.TEXTURE_2D,be,ve,le.width,le.height)}for(let le=0,Ee=Ie.length;le<Ee;le++)xe=Ie[le],ke?F&&t.texSubImage2D(i.TEXTURE_2D,le,0,0,me,De,xe):t.texImage2D(i.TEXTURE_2D,le,ve,me,De,xe);_.generateMipmaps=!1}else if(ke){if(je){const le=nt(ie);t.texStorage2D(i.TEXTURE_2D,be,ve,le.width,le.height)}F&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,me,De,ie)}else t.texImage2D(i.TEXTURE_2D,0,ve,me,De,ie);p(_)&&T(Y),ge.__version=fe.version,_.onUpdate&&_.onUpdate(_)}L.__version=_.version}function ue(L,_,B){if(_.image.length!==6)return;const Y=k(L,_),$=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,L.__webglTexture,i.TEXTURE0+B);const fe=n.get($);if($.version!==fe.__version||Y===!0){t.activeTexture(i.TEXTURE0+B);const ge=ut.getPrimaries(ut.workingColorSpace),ee=_.colorSpace===li?null:ut.getPrimaries(_.colorSpace),ie=_.colorSpace===li||ge===ee?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ie);const me=_.isCompressedTexture||_.image[0].isCompressedTexture,De=_.image[0]&&_.image[0].isDataTexture,ve=[];for(let de=0;de<6;de++)!me&&!De?ve[de]=g(_.image[de],!0,s.maxCubemapSize):ve[de]=De?_.image[de].image:_.image[de],ve[de]=dt(_,ve[de]);const xe=ve[0],Ie=r.convert(_.format,_.colorSpace),ke=r.convert(_.type),je=w(_.internalFormat,Ie,ke,_.normalized,_.colorSpace),F=_.isVideoTexture!==!0,be=fe.__version===void 0||Y===!0,le=$.dataReady;let Ee=M(_,xe);se(i.TEXTURE_CUBE_MAP,_);let Re;if(me){F&&be&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Ee,je,xe.width,xe.height);for(let de=0;de<6;de++){Re=ve[de].mipmaps;for(let We=0;We<Re.length;We++){const Be=Re[We];_.format!==yn?Ie!==null?F?le&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We,0,0,Be.width,Be.height,Ie,Be.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We,je,Be.width,Be.height,0,Be.data):Ze("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?le&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We,0,0,Be.width,Be.height,Ie,ke,Be.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We,je,Be.width,Be.height,0,Ie,ke,Be.data)}}}else{if(Re=_.mipmaps,F&&be){Re.length>0&&Ee++;const de=nt(ve[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Ee,je,de.width,de.height)}for(let de=0;de<6;de++)if(De){F?le&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,0,0,ve[de].width,ve[de].height,Ie,ke,ve[de].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,je,ve[de].width,ve[de].height,0,Ie,ke,ve[de].data);for(let We=0;We<Re.length;We++){const Lt=Re[We].image[de].image;F?le&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We+1,0,0,Lt.width,Lt.height,Ie,ke,Lt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We+1,je,Lt.width,Lt.height,0,Ie,ke,Lt.data)}}else{F?le&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,0,0,Ie,ke,ve[de]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,je,Ie,ke,ve[de]);for(let We=0;We<Re.length;We++){const Be=Re[We];F?le&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We+1,0,0,Ie,ke,Be.image[de]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,We+1,je,Ie,ke,Be.image[de])}}}p(_)&&T(i.TEXTURE_CUBE_MAP),fe.__version=$.version,_.onUpdate&&_.onUpdate(_)}L.__version=_.version}function Ue(L,_,B,Y,$,fe){const ge=r.convert(B.format,B.colorSpace),ee=r.convert(B.type),ie=w(B.internalFormat,ge,ee,B.normalized,B.colorSpace),me=n.get(_),De=n.get(B);if(De.__renderTarget=_,!me.__hasExternalTextures){const ve=Math.max(1,_.width>>fe),xe=Math.max(1,_.height>>fe);$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?t.texImage3D($,fe,ie,ve,xe,_.depth,0,ge,ee,null):t.texImage2D($,fe,ie,ve,xe,0,ge,ee,null)}t.bindFramebuffer(i.FRAMEBUFFER,L),Je(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Y,$,De.__webglTexture,0,Ke(_)):($===i.TEXTURE_2D||$>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Y,$,De.__webglTexture,fe),t.bindFramebuffer(i.FRAMEBUFFER,null)}function et(L,_,B){if(i.bindRenderbuffer(i.RENDERBUFFER,L),_.depthBuffer){const Y=_.depthTexture,$=Y&&Y.isDepthTexture?Y.type:null,fe=S(_.stencilBuffer,$),ge=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Je(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ke(_),fe,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ke(_),fe,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,fe,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,L)}else{const Y=_.textures;for(let $=0;$<Y.length;$++){const fe=Y[$],ge=r.convert(fe.format,fe.colorSpace),ee=r.convert(fe.type),ie=w(fe.internalFormat,ge,ee,fe.normalized,fe.colorSpace);Je(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ke(_),ie,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ke(_),ie,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,ie,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function _e(L,_,B){const Y=_.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,L),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const $=n.get(_.depthTexture);if($.__renderTarget=_,(!$.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),Y){if($.__webglInit===void 0&&($.__webglInit=!0,_.depthTexture.addEventListener("dispose",y)),$.__webglTexture===void 0){$.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture),se(i.TEXTURE_CUBE_MAP,_.depthTexture);const me=r.convert(_.depthTexture.format),De=r.convert(_.depthTexture.type);let ve;_.depthTexture.format===di?ve=i.DEPTH_COMPONENT24:_.depthTexture.format===Ai&&(ve=i.DEPTH24_STENCIL8);for(let xe=0;xe<6;xe++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,0,ve,_.width,_.height,0,me,De,null)}}else G(_.depthTexture,0);const fe=$.__webglTexture,ge=Ke(_),ee=Y?i.TEXTURE_CUBE_MAP_POSITIVE_X+B:i.TEXTURE_2D,ie=_.depthTexture.format===Ai?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===di)Je(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ie,ee,fe,0,ge):i.framebufferTexture2D(i.FRAMEBUFFER,ie,ee,fe,0);else if(_.depthTexture.format===Ai)Je(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ie,ee,fe,0,ge):i.framebufferTexture2D(i.FRAMEBUFFER,ie,ee,fe,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function te(L){const _=n.get(L),B=L.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==L.depthTexture){const Y=L.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),Y){const $=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,Y.removeEventListener("dispose",$)};Y.addEventListener("dispose",$),_.__depthDisposeCallback=$}_.__boundDepthTexture=Y}if(L.depthTexture&&!_.__autoAllocateDepthBuffer)if(B)for(let Y=0;Y<6;Y++)_e(_.__webglFramebuffer[Y],L,Y);else{const Y=L.texture.mipmaps;Y&&Y.length>0?_e(_.__webglFramebuffer[0],L,0):_e(_.__webglFramebuffer,L,0)}else if(B){_.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[Y]),_.__webglDepthbuffer[Y]===void 0)_.__webglDepthbuffer[Y]=i.createRenderbuffer(),et(_.__webglDepthbuffer[Y],L,!1);else{const $=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=_.__webglDepthbuffer[Y];i.bindRenderbuffer(i.RENDERBUFFER,fe),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,fe)}}else{const Y=L.texture.mipmaps;if(Y&&Y.length>0?t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),et(_.__webglDepthbuffer,L,!1);else{const $=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,fe),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,fe)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function j(L,_,B){const Y=n.get(L);_!==void 0&&Ue(Y.__webglFramebuffer,L,L.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&te(L)}function oe(L){const _=L.texture,B=n.get(L),Y=n.get(_);L.addEventListener("dispose",v);const $=L.textures,fe=L.isWebGLCubeRenderTarget===!0,ge=$.length>1;if(ge||(Y.__webglTexture===void 0&&(Y.__webglTexture=i.createTexture()),Y.__version=_.version,o.memory.textures++),fe){B.__webglFramebuffer=[];for(let ee=0;ee<6;ee++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[ee]=[];for(let ie=0;ie<_.mipmaps.length;ie++)B.__webglFramebuffer[ee][ie]=i.createFramebuffer()}else B.__webglFramebuffer[ee]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let ee=0;ee<_.mipmaps.length;ee++)B.__webglFramebuffer[ee]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(ge)for(let ee=0,ie=$.length;ee<ie;ee++){const me=n.get($[ee]);me.__webglTexture===void 0&&(me.__webglTexture=i.createTexture(),o.memory.textures++)}if(L.samples>0&&Je(L)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let ee=0;ee<$.length;ee++){const ie=$[ee];B.__webglColorRenderbuffer[ee]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[ee]);const me=r.convert(ie.format,ie.colorSpace),De=r.convert(ie.type),ve=w(ie.internalFormat,me,De,ie.normalized,ie.colorSpace,L.isXRRenderTarget===!0),xe=Ke(L);i.renderbufferStorageMultisample(i.RENDERBUFFER,xe,ve,L.width,L.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ee,i.RENDERBUFFER,B.__webglColorRenderbuffer[ee])}i.bindRenderbuffer(i.RENDERBUFFER,null),L.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),et(B.__webglDepthRenderbuffer,L,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(fe){t.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),se(i.TEXTURE_CUBE_MAP,_);for(let ee=0;ee<6;ee++)if(_.mipmaps&&_.mipmaps.length>0)for(let ie=0;ie<_.mipmaps.length;ie++)Ue(B.__webglFramebuffer[ee][ie],L,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ie);else Ue(B.__webglFramebuffer[ee],L,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0);p(_)&&T(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ge){for(let ee=0,ie=$.length;ee<ie;ee++){const me=$[ee],De=n.get(me);let ve=i.TEXTURE_2D;(L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(ve=L.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ve,De.__webglTexture),se(ve,me),Ue(B.__webglFramebuffer,L,me,i.COLOR_ATTACHMENT0+ee,ve,0),p(me)&&T(ve)}t.unbindTexture()}else{let ee=i.TEXTURE_2D;if((L.isWebGL3DRenderTarget||L.isWebGLArrayRenderTarget)&&(ee=L.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ee,Y.__webglTexture),se(ee,_),_.mipmaps&&_.mipmaps.length>0)for(let ie=0;ie<_.mipmaps.length;ie++)Ue(B.__webglFramebuffer[ie],L,_,i.COLOR_ATTACHMENT0,ee,ie);else Ue(B.__webglFramebuffer,L,_,i.COLOR_ATTACHMENT0,ee,0);p(_)&&T(ee),t.unbindTexture()}L.depthBuffer&&te(L)}function Me(L){const _=L.textures;for(let B=0,Y=_.length;B<Y;B++){const $=_[B];if(p($)){const fe=b(L),ge=n.get($).__webglTexture;t.bindTexture(fe,ge),T(fe),t.unbindTexture()}}}const Se=[],Ve=[];function Fe(L){if(L.samples>0){if(Je(L)===!1){const _=L.textures,B=L.width,Y=L.height;let $=i.COLOR_BUFFER_BIT;const fe=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ge=n.get(L),ee=_.length>1;if(ee)for(let me=0;me<_.length;me++)t.bindFramebuffer(i.FRAMEBUFFER,ge.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+me,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,ge.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+me,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,ge.__webglMultisampledFramebuffer);const ie=L.texture.mipmaps;ie&&ie.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ge.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ge.__webglFramebuffer);for(let me=0;me<_.length;me++){if(L.resolveDepthBuffer&&(L.depthBuffer&&($|=i.DEPTH_BUFFER_BIT),L.stencilBuffer&&L.resolveStencilBuffer&&($|=i.STENCIL_BUFFER_BIT)),ee){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ge.__webglColorRenderbuffer[me]);const De=n.get(_[me]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,De,0)}i.blitFramebuffer(0,0,B,Y,0,0,B,Y,$,i.NEAREST),l===!0&&(Se.length=0,Ve.length=0,Se.push(i.COLOR_ATTACHMENT0+me),L.depthBuffer&&L.resolveDepthBuffer===!1&&(Se.push(fe),Ve.push(fe),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ve)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Se))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ee)for(let me=0;me<_.length;me++){t.bindFramebuffer(i.FRAMEBUFFER,ge.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+me,i.RENDERBUFFER,ge.__webglColorRenderbuffer[me]);const De=n.get(_[me]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,ge.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+me,i.TEXTURE_2D,De,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ge.__webglMultisampledFramebuffer)}else if(L.depthBuffer&&L.resolveDepthBuffer===!1&&l){const _=L.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function Ke(L){return Math.min(s.maxSamples,L.samples)}function Je(L){const _=n.get(L);return L.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function U(L){const _=o.render.frame;h.get(L)!==_&&(h.set(L,_),L.update())}function dt(L,_){const B=L.colorSpace,Y=L.format,$=L.type;return L.isCompressedTexture===!0||L.isVideoTexture===!0||B!==Mo&&B!==li&&(ut.getTransfer(B)===xt?(Y!==yn||$!==cn)&&Ze("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ht("WebGLTextures: Unsupported texture color space:",B)),_}function nt(L){return typeof HTMLImageElement<"u"&&L instanceof HTMLImageElement?(c.width=L.naturalWidth||L.width,c.height=L.naturalHeight||L.height):typeof VideoFrame<"u"&&L instanceof VideoFrame?(c.width=L.displayWidth,c.height=L.displayHeight):(c.width=L.width,c.height=L.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=N,this.getTextureUnits=z,this.setTextureUnits=I,this.setTexture2D=G,this.setTexture2DArray=q,this.setTexture3D=re,this.setTextureCube=ne,this.rebindTextures=j,this.setupRenderTarget=oe,this.updateRenderTargetMipmap=Me,this.updateMultisampleRenderTarget=Fe,this.setupDepthRenderbuffer=te,this.setupFrameBufferTexture=Ue,this.useMultisampledRTT=Je,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function _x(i,e){function t(n,s=li){let r;const o=ut.getTransfer(s);if(n===cn)return i.UNSIGNED_BYTE;if(n===Bl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Hl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===cu)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===hu)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===au)return i.BYTE;if(n===lu)return i.SHORT;if(n===cr)return i.UNSIGNED_SHORT;if(n===Fl)return i.INT;if(n===$n)return i.UNSIGNED_INT;if(n===Fn)return i.FLOAT;if(n===Vt)return i.HALF_FLOAT;if(n===uu)return i.ALPHA;if(n===du)return i.RGB;if(n===yn)return i.RGBA;if(n===di)return i.DEPTH_COMPONENT;if(n===Ai)return i.DEPTH_STENCIL;if(n===fu)return i.RED;if(n===zl)return i.RED_INTEGER;if(n===Gi)return i.RG;if(n===Vl)return i.RG_INTEGER;if(n===Gl)return i.RGBA_INTEGER;if(n===ho||n===uo||n===fo||n===po)if(o===xt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ho)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===uo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===fo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===po)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ho)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===uo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===fo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===po)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Za||n===Ja||n===ja||n===Qa)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Za)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ja)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ja)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Qa)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===$a||n===el||n===tl||n===nl||n===il||n===go||n===sl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===$a||n===el)return o===xt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===tl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===nl)return r.COMPRESSED_R11_EAC;if(n===il)return r.COMPRESSED_SIGNED_R11_EAC;if(n===go)return r.COMPRESSED_RG11_EAC;if(n===sl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===rl||n===ol||n===al||n===ll||n===cl||n===hl||n===ul||n===dl||n===fl||n===pl||n===ml||n===gl||n===vl||n===xl)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===rl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ol)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===al)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ll)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===cl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===hl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ul)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===dl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===fl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===pl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ml)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===gl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===vl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===xl)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ml||n===wl||n===yl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Ml)return o===xt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===wl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===yl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===_l||n===Sl||n===vo||n===bl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===_l)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Sl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===vo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===bl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Es?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const Sx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,bx=`
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

}`;class Ex{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new bu(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ft({vertexShader:Sx,fragmentShader:bx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new qe(new Gt(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Tx extends qi{constructor(e,t){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,m=null;const x=typeof XRWebGLBinding<"u",g=new Ex,p={},T=t.getContextAttributes();let b=null,w=null;const S=[],M=[],y=new ae;let v=null;const E=new zt;E.viewport=new vt;const C=new zt;C.viewport=new vt;const P=[E,C],D=new Np;let N=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let X=S[k];return X===void 0&&(X=new Qo,S[k]=X),X.getTargetRaySpace()},this.getControllerGrip=function(k){let X=S[k];return X===void 0&&(X=new Qo,S[k]=X),X.getGripSpace()},this.getHand=function(k){let X=S[k];return X===void 0&&(X=new Qo,S[k]=X),X.getHandSpace()};function I(k){const X=M.indexOf(k.inputSource);if(X===-1)return;const W=S[X];W!==void 0&&(W.update(k.inputSource,k.frame,c||o),W.dispatchEvent({type:k.type,data:k.inputSource}))}function V(){s.removeEventListener("select",I),s.removeEventListener("selectstart",I),s.removeEventListener("selectend",I),s.removeEventListener("squeeze",I),s.removeEventListener("squeezestart",I),s.removeEventListener("squeezeend",I),s.removeEventListener("end",V),s.removeEventListener("inputsourceschange",O);for(let k=0;k<S.length;k++){const X=M[k];X!==null&&(M[k]=null,S[k].disconnect(X))}N=null,z=null,g.reset();for(const k in p)delete p[k];e.setRenderTarget(b),f=null,u=null,d=null,s=null,w=null,se.stop(),n.isPresenting=!1,e.setPixelRatio(v),e.setSize(y.width,y.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){r=k,n.isPresenting===!0&&Ze("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){a=k,n.isPresenting===!0&&Ze("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(k){c=k},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&x&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(k){if(s=k,s!==null){if(b=e.getRenderTarget(),s.addEventListener("select",I),s.addEventListener("selectstart",I),s.addEventListener("selectend",I),s.addEventListener("squeeze",I),s.addEventListener("squeezestart",I),s.addEventListener("squeezeend",I),s.addEventListener("end",V),s.addEventListener("inputsourceschange",O),T.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(y),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let W=null,he=null,ue=null;T.depth&&(ue=T.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,W=T.stencil?Ai:di,he=T.stencil?Es:$n);const Ue={colorFormat:t.RGBA8,depthFormat:ue,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Ue),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),w=new Pt(u.textureWidth,u.textureHeight,{format:yn,type:cn,depthTexture:new Wi(u.textureWidth,u.textureHeight,he,void 0,void 0,void 0,void 0,void 0,void 0,W),stencilBuffer:T.stencil,colorSpace:e.outputColorSpace,samples:T.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const W={antialias:T.antialias,alpha:!0,depth:T.depth,stencil:T.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,W),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),w=new Pt(f.framebufferWidth,f.framebufferHeight,{format:yn,type:cn,colorSpace:e.outputColorSpace,stencilBuffer:T.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}w.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),se.setContext(s),se.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function O(k){for(let X=0;X<k.removed.length;X++){const W=k.removed[X],he=M.indexOf(W);he>=0&&(M[he]=null,S[he].disconnect(W))}for(let X=0;X<k.added.length;X++){const W=k.added[X];let he=M.indexOf(W);if(he===-1){for(let Ue=0;Ue<S.length;Ue++)if(Ue>=M.length){M.push(W),he=Ue;break}else if(M[Ue]===null){M[Ue]=W,he=Ue;break}if(he===-1)break}const ue=S[he];ue&&ue.connect(W)}}const G=new A,q=new A;function re(k,X,W){G.setFromMatrixPosition(X.matrixWorld),q.setFromMatrixPosition(W.matrixWorld);const he=G.distanceTo(q),ue=X.projectionMatrix.elements,Ue=W.projectionMatrix.elements,et=ue[14]/(ue[10]-1),_e=ue[14]/(ue[10]+1),te=(ue[9]+1)/ue[5],j=(ue[9]-1)/ue[5],oe=(ue[8]-1)/ue[0],Me=(Ue[8]+1)/Ue[0],Se=et*oe,Ve=et*Me,Fe=he/(-oe+Me),Ke=Fe*-oe;if(X.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(Ke),k.translateZ(Fe),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert(),ue[10]===-1)k.projectionMatrix.copy(X.projectionMatrix),k.projectionMatrixInverse.copy(X.projectionMatrixInverse);else{const Je=et+Fe,U=_e+Fe,dt=Se-Ke,nt=Ve+(he-Ke),L=te*_e/U*Je,_=j*_e/U*Je;k.projectionMatrix.makePerspective(dt,nt,L,_,Je,U),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}}function ne(k,X){X===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(X.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(s===null)return;let X=k.near,W=k.far;g.texture!==null&&(g.depthNear>0&&(X=g.depthNear),g.depthFar>0&&(W=g.depthFar)),D.near=C.near=E.near=X,D.far=C.far=E.far=W,(N!==D.near||z!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),N=D.near,z=D.far),D.layers.mask=k.layers.mask|6,E.layers.mask=D.layers.mask&-5,C.layers.mask=D.layers.mask&-3;const he=k.parent,ue=D.cameras;ne(D,he);for(let Ue=0;Ue<ue.length;Ue++)ne(ue[Ue],he);ue.length===2?re(D,E,C):D.projectionMatrix.copy(E.projectionMatrix),ce(k,D,he)};function ce(k,X,W){W===null?k.matrix.copy(X.matrixWorld):(k.matrix.copy(W.matrixWorld),k.matrix.invert(),k.matrix.multiply(X.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(X.projectionMatrix),k.projectionMatrixInverse.copy(X.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=Ts*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(k){l=k,u!==null&&(u.fixedFoveation=k),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=k)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(D)},this.getCameraTexture=function(k){return p[k]};let Te=null;function J(k,X){if(h=X.getViewerPose(c||o),m=X,h!==null){const W=h.views;f!==null&&(e.setRenderTargetFramebuffer(w,f.framebuffer),e.setRenderTarget(w));let he=!1;W.length!==D.cameras.length&&(D.cameras.length=0,he=!0);for(let _e=0;_e<W.length;_e++){const te=W[_e];let j=null;if(f!==null)j=f.getViewport(te);else{const Me=d.getViewSubImage(u,te);j=Me.viewport,_e===0&&(e.setRenderTargetTextures(w,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(w))}let oe=P[_e];oe===void 0&&(oe=new zt,oe.layers.enable(_e),oe.viewport=new vt,P[_e]=oe),oe.matrix.fromArray(te.transform.matrix),oe.matrix.decompose(oe.position,oe.quaternion,oe.scale),oe.projectionMatrix.fromArray(te.projectionMatrix),oe.projectionMatrixInverse.copy(oe.projectionMatrix).invert(),oe.viewport.set(j.x,j.y,j.width,j.height),_e===0&&(D.matrix.copy(oe.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),he===!0&&D.cameras.push(oe)}const ue=s.enabledFeatures;if(ue&&ue.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){d=n.getBinding();const _e=d.getDepthInformation(W[0]);_e&&_e.isValid&&_e.texture&&g.init(_e,s.renderState)}if(ue&&ue.includes("camera-access")&&x){e.state.unbindTexture(),d=n.getBinding();for(let _e=0;_e<W.length;_e++){const te=W[_e].camera;if(te){let j=p[te];j||(j=new bu,p[te]=j);const oe=d.getCameraImage(te);j.sourceTexture=oe}}}}for(let W=0;W<S.length;W++){const he=M[W],ue=S[W];he!==null&&ue!==void 0&&ue.update(he,X,c||o)}Te&&Te(k,X),X.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:X}),m=null}const se=new Bu;se.setAnimationLoop(J),this.setAnimationLoop=function(k){Te=k},this.dispose=function(){}}}const Ax=new rt,Yu=new tt;Yu.set(-1,0,0,0,1,0,0,0,1);function Rx(i,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,Nu(i)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function s(g,p,T,b,w){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(g,p):p.isMeshLambertMaterial?(r(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(g,p),d(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(g,p),u(g,p),p.isMeshPhysicalMaterial&&f(g,p,w)):p.isMeshMatcapMaterial?(r(g,p),m(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),x(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?l(g,p,T,b):p.isSpriteMaterial?c(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===fn&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===fn&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const T=e.get(p),b=T.envMap,w=T.envMapRotation;b&&(g.envMap.value=b,g.envMapRotation.value.setFromMatrix4(Ax.makeRotationFromEuler(w)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Yu),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,T,b){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*T,g.scale.value=b*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function u(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,T){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===fn&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=T.texture,g.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function x(g,p){const T=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(T.matrixWorld),g.nearDistance.value=T.shadow.camera.near,g.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Cx(i,e,t,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(w,S){const M=S.program;n.uniformBlockBinding(w,M)}function c(w,S){let M=s[w.id];M===void 0&&(g(w),M=h(w),s[w.id]=M,w.addEventListener("dispose",T));const y=S.program;n.updateUBOMapping(w,y);const v=e.render.frame;r[w.id]!==v&&(u(w),r[w.id]=v)}function h(w){const S=d();w.__bindingPointIndex=S;const M=i.createBuffer(),y=w.__size,v=w.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,y,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,S,M),M}function d(){for(let w=0;w<a;w++)if(o.indexOf(w)===-1)return o.push(w),w;return ht("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(w){const S=s[w.id],M=w.uniforms,y=w.__cache;i.bindBuffer(i.UNIFORM_BUFFER,S);for(let v=0,E=M.length;v<E;v++){const C=M[v];if(Array.isArray(C))for(let P=0,D=C.length;P<D;P++)f(C[P],v,P,y);else f(C,v,0,y)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(w,S,M,y){if(x(w,S,M,y)===!0){const v=w.__offset,E=w.value;if(Array.isArray(E)){let C=0;for(let P=0;P<E.length;P++){const D=E[P],N=p(D);m(D,w.__data,C),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(C+=N.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(E,w.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,v,w.__data)}}function m(w,S,M){typeof w=="number"||typeof w=="boolean"?S[0]=w:w.isMatrix3?(S[0]=w.elements[0],S[1]=w.elements[1],S[2]=w.elements[2],S[3]=0,S[4]=w.elements[3],S[5]=w.elements[4],S[6]=w.elements[5],S[7]=0,S[8]=w.elements[6],S[9]=w.elements[7],S[10]=w.elements[8],S[11]=0):ArrayBuffer.isView(w)?S.set(new w.constructor(w.buffer,w.byteOffset,S.length)):w.toArray(S,M)}function x(w,S,M,y){const v=w.value,E=S+"_"+M;if(y[E]===void 0)return typeof v=="number"||typeof v=="boolean"?y[E]=v:ArrayBuffer.isView(v)?y[E]=v.slice():y[E]=v.clone(),!0;{const C=y[E];if(typeof v=="number"||typeof v=="boolean"){if(C!==v)return y[E]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(C.equals(v)===!1)return C.copy(v),!0}}return!1}function g(w){const S=w.uniforms;let M=0;const y=16;for(let E=0,C=S.length;E<C;E++){const P=Array.isArray(S[E])?S[E]:[S[E]];for(let D=0,N=P.length;D<N;D++){const z=P[D],I=Array.isArray(z.value)?z.value:[z.value];for(let V=0,O=I.length;V<O;V++){const G=I[V],q=p(G),re=M%y,ne=re%q.boundary,ce=re+ne;M+=ne,ce!==0&&y-ce<q.storage&&(M+=y-ce),z.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),z.__offset=M,M+=q.storage}}}const v=M%y;return v>0&&(M+=y-v),w.__size=M,w.__cache={},this}function p(w){const S={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(S.boundary=4,S.storage=4):w.isVector2?(S.boundary=8,S.storage=8):w.isVector3||w.isColor?(S.boundary=16,S.storage=12):w.isVector4?(S.boundary=16,S.storage=16):w.isMatrix3?(S.boundary=48,S.storage=48):w.isMatrix4?(S.boundary=64,S.storage=64):w.isTexture?Ze("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(w)?(S.boundary=16,S.storage=w.byteLength):Ze("WebGLRenderer: Unsupported uniform value type.",w),S}function T(w){const S=w.target;S.removeEventListener("dispose",T);const M=o.indexOf(S.__bindingPointIndex);o.splice(M,1),i.deleteBuffer(s[S.id]),delete s[S.id],delete r[S.id]}function b(){for(const w in s)i.deleteBuffer(s[w]);o=[],s={},r={}}return{bind:l,update:c,dispose:b}}const Px=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let qn=null;function Lx(){return qn===null&&(qn=new Po(Px,16,16,Gi,Vt),qn.name="DFG_LUT",qn.minFilter=sn,qn.magFilter=sn,qn.wrapS=Zn,qn.wrapT=Zn,qn.generateMipmaps=!1,qn.needsUpdate=!0),qn}class Dx{constructor(e={}){const{canvas:t=ef(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=cn}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;const x=f,g=new Set([Gl,Vl,zl]),p=new Set([cn,$n,cr,Es,Bl,Hl]),T=new Uint32Array(4),b=new Int32Array(4),w=new A;let S=null,M=null;const y=[],v=[];let E=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Hn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const C=this;let P=!1,D=null,N=null,z=null,I=null;this._outputColorSpace=dn;let V=0,O=0,G=null,q=-1,re=null;const ne=new vt,ce=new vt;let Te=null;const J=new pe(0);let se=0,k=t.width,X=t.height,W=1,he=null,ue=null;const Ue=new vt(0,0,k,X),et=new vt(0,0,k,X);let _e=!1;const te=new Jl;let j=!1,oe=!1;const Me=new rt,Se=new A,Ve=new vt,Fe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ke=!1;function Je(){return G===null?W:1}let U=n;function dt(R,H){return t.getContext(R,H)}try{const R={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${kl}`),t.addEventListener("webglcontextlost",Lt,!1),t.addEventListener("webglcontextrestored",bt,!1),t.addEventListener("webglcontextcreationerror",Gn,!1),U===null){const H="webgl2";if(U=dt(H,R),U===null)throw dt(H)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(R){throw ht("WebGLRenderer: "+R.message),R}let nt,L,_,B,Y,$,fe,ge,ee,ie,me,De,ve,xe,Ie,ke,je,F,be,le,Ee,Re,de;function We(){nt=new Lg(U),nt.init(),Ee=new _x(U,nt),L=new Sg(U,nt,e,Ee),_=new wx(U,nt),L.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),N=U.createFramebuffer(),z=U.createFramebuffer(),I=U.createFramebuffer(),B=new Ng(U),Y=new ox,$=new yx(U,nt,_,Y,L,Ee,B),fe=new Pg(C),ge=new Fp(U),Re=new yg(U,ge),ee=new Dg(U,ge,B,Re),ie=new Og(U,ee,ge,Re,B),F=new Ug(U,L,$),Ie=new bg(Y),me=new rx(C,fe,nt,L,Re,Ie),De=new Rx(C,Y),ve=new lx,xe=new px(nt),je=new wg(C,fe,_,ie,m,l),ke=new Mx(C,ie,L),de=new Cx(U,B,L,_),be=new _g(U,nt,B),le=new Ig(U,nt,B),B.programs=me.programs,C.capabilities=L,C.extensions=nt,C.properties=Y,C.renderLists=ve,C.shadowMap=ke,C.state=_,C.info=B}We(),x!==cn&&(E=new Fg(x,t.width,t.height,a,s,r));const Be=new Tx(C,U);this.xr=Be,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const R=nt.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=nt.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return W},this.setPixelRatio=function(R){R!==void 0&&(W=R,this.setSize(k,X,!1))},this.getSize=function(R){return R.set(k,X)},this.setSize=function(R,H,Q=!0){if(Be.isPresenting){Ze("WebGLRenderer: Can't change size while VR device is presenting.");return}k=R,X=H,t.width=Math.floor(R*W),t.height=Math.floor(H*W),Q===!0&&(t.style.width=R+"px",t.style.height=H+"px"),E!==null&&E.setSize(t.width,t.height),this.setViewport(0,0,R,H)},this.getDrawingBufferSize=function(R){return R.set(k*W,X*W).floor()},this.setDrawingBufferSize=function(R,H,Q){k=R,X=H,W=Q,t.width=Math.floor(R*Q),t.height=Math.floor(H*Q),this.setViewport(0,0,R,H)},this.setEffects=function(R){if(x===cn){ht("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(R){for(let H=0;H<R.length;H++)if(R[H].isOutputPass===!0){Ze("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}E.setEffects(R||[])},this.getCurrentViewport=function(R){return R.copy(ne)},this.getViewport=function(R){return R.copy(Ue)},this.setViewport=function(R,H,Q,K){R.isVector4?Ue.set(R.x,R.y,R.z,R.w):Ue.set(R,H,Q,K),_.viewport(ne.copy(Ue).multiplyScalar(W).round())},this.getScissor=function(R){return R.copy(et)},this.setScissor=function(R,H,Q,K){R.isVector4?et.set(R.x,R.y,R.z,R.w):et.set(R,H,Q,K),_.scissor(ce.copy(et).multiplyScalar(W).round())},this.getScissorTest=function(){return _e},this.setScissorTest=function(R){_.setScissorTest(_e=R)},this.setOpaqueSort=function(R){he=R},this.setTransparentSort=function(R){ue=R},this.getClearColor=function(R){return R.copy(je.getClearColor())},this.setClearColor=function(){je.setClearColor(...arguments)},this.getClearAlpha=function(){return je.getClearAlpha()},this.setClearAlpha=function(){je.setClearAlpha(...arguments)},this.clear=function(R=!0,H=!0,Q=!0){let K=0;if(R){let Z=!1;if(G!==null){const Le=G.texture.format;Z=g.has(Le)}if(Z){const Le=G.texture.type,Oe=p.has(Le),Ce=je.getClearColor(),ze=je.getClearAlpha(),Xe=Ce.r,it=Ce.g,ot=Ce.b;Oe?(T[0]=Xe,T[1]=it,T[2]=ot,T[3]=ze,U.clearBufferuiv(U.COLOR,0,T)):(b[0]=Xe,b[1]=it,b[2]=ot,b[3]=ze,U.clearBufferiv(U.COLOR,0,b))}else K|=U.COLOR_BUFFER_BIT}H&&(K|=U.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Q&&(K|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),K!==0&&U.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(R){R.setRenderer(this),D=R},this.dispose=function(){t.removeEventListener("webglcontextlost",Lt,!1),t.removeEventListener("webglcontextrestored",bt,!1),t.removeEventListener("webglcontextcreationerror",Gn,!1),je.dispose(),ve.dispose(),xe.dispose(),Y.dispose(),fe.dispose(),ie.dispose(),Re.dispose(),de.dispose(),me.dispose(),Be.dispose(),Be.removeEventListener("sessionstart",mc),Be.removeEventListener("sessionend",gc),Ni.stop()};function Lt(R){R.preventDefault(),_o("WebGLRenderer: Context Lost."),P=!0}function bt(){_o("WebGLRenderer: Context Restored."),P=!1;const R=B.autoReset,H=ke.enabled,Q=ke.autoUpdate,K=ke.needsUpdate,Z=ke.type;We(),B.autoReset=R,ke.enabled=H,ke.autoUpdate=Q,ke.needsUpdate=K,ke.type=Z}function Gn(R){ht("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Wn(R){const H=R.target;H.removeEventListener("dispose",Wn),gd(H)}function gd(R){vd(R),Y.remove(R)}function vd(R){const H=Y.get(R).programs;H!==void 0&&(H.forEach(function(Q){me.releaseProgram(Q)}),R.isShaderMaterial&&me.releaseShaderCache(R))}this.renderBufferDirect=function(R,H,Q,K,Z,Le){H===null&&(H=Fe);const Oe=Z.isMesh&&Z.matrixWorld.determinantAffine()<0,Ce=wd(R,H,Q,K,Z);_.setMaterial(K,Oe);let ze=Q.index,Xe=1;if(K.wireframe===!0){if(ze=ee.getWireframeAttribute(Q),ze===void 0)return;Xe=2}const it=Q.drawRange,ot=Q.attributes.position;let Ye=it.start*Xe,wt=(it.start+it.count)*Xe;Le!==null&&(Ye=Math.max(Ye,Le.start*Xe),wt=Math.min(wt,(Le.start+Le.count)*Xe)),ze!==null?(Ye=Math.max(Ye,0),wt=Math.min(wt,ze.count)):ot!=null&&(Ye=Math.max(Ye,0),wt=Math.min(wt,ot.count));const It=wt-Ye;if(It<0||It===1/0)return;Re.setup(Z,K,Ce,Q,ze);let Dt,_t=be;if(ze!==null&&(Dt=ge.get(ze),_t=le,_t.setIndex(Dt)),Z.isMesh)K.wireframe===!0?(_.setLineWidth(K.wireframeLinewidth*Je()),_t.setMode(U.LINES)):_t.setMode(U.TRIANGLES);else if(Z.isLine){let on=K.linewidth;on===void 0&&(on=1),_.setLineWidth(on*Je()),Z.isLineSegments?_t.setMode(U.LINES):Z.isLineLoop?_t.setMode(U.LINE_LOOP):_t.setMode(U.LINE_STRIP)}else Z.isPoints?_t.setMode(U.POINTS):Z.isSprite&&_t.setMode(U.TRIANGLES);if(Z.isBatchedMesh)if(nt.get("WEBGL_multi_draw"))_t.renderMultiDraw(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount);else{const on=Z._multiDrawStarts,Ne=Z._multiDrawCounts,vn=Z._multiDrawCount,pt=ze?ge.get(ze).bytesPerElement:1,bn=Y.get(K).currentProgram.getUniforms();for(let Xn=0;Xn<vn;Xn++)bn.setValue(U,"_gl_DrawID",Xn),_t.render(on[Xn]/pt,Ne[Xn])}else if(Z.isInstancedMesh)_t.renderInstances(Ye,It,Z.count);else if(Q.isInstancedBufferGeometry){const on=Q._maxInstanceCount!==void 0?Q._maxInstanceCount:1/0,Ne=Math.min(Q.instanceCount,on);_t.renderInstances(Ye,It,Ne)}else _t.render(Ye,It)};function pc(R,H,Q){R.transparent===!0&&R.side===Qt&&R.forceSinglePass===!1?(R.side=fn,R.needsUpdate=!0,Sr(R,H,Q),R.side=Ci,R.needsUpdate=!0,Sr(R,H,Q),R.side=Qt):Sr(R,H,Q)}this.compile=function(R,H,Q=null){Q===null&&(Q=R),M=xe.get(Q),M.init(H),v.push(M),Q.traverseVisible(function(Z){Z.isLight&&Z.layers.test(H.layers)&&(M.pushLight(Z),Z.castShadow&&M.pushShadow(Z))}),R!==Q&&R.traverseVisible(function(Z){Z.isLight&&Z.layers.test(H.layers)&&(M.pushLight(Z),Z.castShadow&&M.pushShadow(Z))}),M.setupLights();const K=new Set;return R.traverse(function(Z){if(!(Z.isMesh||Z.isPoints||Z.isLine||Z.isSprite))return;const Le=Z.material;if(Le)if(Array.isArray(Le))for(let Oe=0;Oe<Le.length;Oe++){const Ce=Le[Oe];pc(Ce,Q,Z),K.add(Ce)}else pc(Le,Q,Z),K.add(Le)}),M=v.pop(),K},this.compileAsync=function(R,H,Q=null){const K=this.compile(R,H,Q);return new Promise(Z=>{function Le(){if(K.forEach(function(Oe){Y.get(Oe).currentProgram.isReady()&&K.delete(Oe)}),K.size===0){Z(R);return}setTimeout(Le,10)}nt.get("KHR_parallel_shader_compile")!==null?Le():setTimeout(Le,10)})};let Vo=null;function xd(R){Vo&&Vo(R)}function mc(){Ni.stop()}function gc(){Ni.start()}const Ni=new Bu;Ni.setAnimationLoop(xd),typeof self<"u"&&Ni.setContext(self),this.setAnimationLoop=function(R){Vo=R,Be.setAnimationLoop(R),R===null?Ni.stop():Ni.start()},Be.addEventListener("sessionstart",mc),Be.addEventListener("sessionend",gc),this.render=function(R,H){if(H!==void 0&&H.isCamera!==!0){ht("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;D!==null&&D.renderStart(R,H);const Q=Be.enabled===!0&&Be.isPresenting===!0,K=E!==null&&(G===null||Q)&&E.begin(C,G);if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),Be.enabled===!0&&Be.isPresenting===!0&&(E===null||E.isCompositing()===!1)&&(Be.cameraAutoUpdate===!0&&Be.updateCamera(H),H=Be.getCamera()),R.isScene===!0&&R.onBeforeRender(C,R,H,G),M=xe.get(R,v.length),M.init(H),M.state.textureUnits=$.getTextureUnits(),v.push(M),Me.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),te.setFromProjectionMatrix(Me,Jn,H.reversedDepth),oe=this.localClippingEnabled,j=Ie.init(this.clippingPlanes,oe),S=ve.get(R,y.length),S.init(),y.push(S),Be.enabled===!0&&Be.isPresenting===!0){const Oe=C.xr.getDepthSensingMesh();Oe!==null&&Go(Oe,H,-1/0,C.sortObjects)}Go(R,H,0,C.sortObjects),S.finish(),C.sortObjects===!0&&S.sort(he,ue,H.reversedDepth),Ke=Be.enabled===!1||Be.isPresenting===!1||Be.hasDepthSensing()===!1,Ke&&je.addToRenderList(S,R),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),j===!0&&Ie.beginShadows();const Z=M.state.shadowsArray;if(ke.render(Z,R,H),j===!0&&Ie.endShadows(),(K&&E.hasRenderPass())===!1){const Oe=S.opaque,Ce=S.transmissive;if(M.setupLights(),H.isArrayCamera){const ze=H.cameras;if(Ce.length>0)for(let Xe=0,it=ze.length;Xe<it;Xe++){const ot=ze[Xe];xc(Oe,Ce,R,ot)}Ke&&je.render(R);for(let Xe=0,it=ze.length;Xe<it;Xe++){const ot=ze[Xe];vc(S,R,ot,ot.viewport)}}else Ce.length>0&&xc(Oe,Ce,R,H),Ke&&je.render(R),vc(S,R,H)}G!==null&&O===0&&($.updateMultisampleRenderTarget(G),$.updateRenderTargetMipmap(G)),K&&E.end(C),R.isScene===!0&&R.onAfterRender(C,R,H),Re.resetDefaultState(),q=-1,re=null,v.pop(),v.length>0?(M=v[v.length-1],$.setTextureUnits(M.state.textureUnits),j===!0&&Ie.setGlobalState(C.clippingPlanes,M.state.camera)):M=null,y.pop(),y.length>0?S=y[y.length-1]:S=null,D!==null&&D.renderEnd()};function Go(R,H,Q,K){if(R.visible===!1)return;if(R.layers.test(H.layers)){if(R.isGroup)Q=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(H);else if(R.isLightProbeGrid)M.pushLightProbeGrid(R);else if(R.isLight)M.pushLight(R),R.castShadow&&M.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||te.intersectsSprite(R)){K&&Ve.setFromMatrixPosition(R.matrixWorld).applyMatrix4(Me);const Oe=ie.update(R),Ce=R.material;Ce.visible&&S.push(R,Oe,Ce,Q,Ve.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||te.intersectsObject(R))){const Oe=ie.update(R),Ce=R.material;if(K&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Ve.copy(R.boundingSphere.center)):(Oe.boundingSphere===null&&Oe.computeBoundingSphere(),Ve.copy(Oe.boundingSphere.center)),Ve.applyMatrix4(R.matrixWorld).applyMatrix4(Me)),Array.isArray(Ce)){const ze=Oe.groups;for(let Xe=0,it=ze.length;Xe<it;Xe++){const ot=ze[Xe],Ye=Ce[ot.materialIndex];Ye&&Ye.visible&&S.push(R,Oe,Ye,Q,Ve.z,ot)}}else Ce.visible&&S.push(R,Oe,Ce,Q,Ve.z,null)}}const Le=R.children;for(let Oe=0,Ce=Le.length;Oe<Ce;Oe++)Go(Le[Oe],H,Q,K)}function vc(R,H,Q,K){const{opaque:Z,transmissive:Le,transparent:Oe}=R;M.setupLightsView(Q),j===!0&&Ie.setGlobalState(C.clippingPlanes,Q),K&&_.viewport(ne.copy(K)),Z.length>0&&_r(Z,H,Q),Le.length>0&&_r(Le,H,Q),Oe.length>0&&_r(Oe,H,Q),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function xc(R,H,Q,K){if((Q.isScene===!0?Q.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[K.id]===void 0){const Ye=nt.has("EXT_color_buffer_half_float")||nt.has("EXT_color_buffer_float");M.state.transmissionRenderTarget[K.id]=new Pt(1,1,{generateMipmaps:!0,type:Ye?Vt:cn,minFilter:Ti,samples:Math.max(4,L.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ut.workingColorSpace})}const Le=M.state.transmissionRenderTarget[K.id],Oe=K.viewport||ne;Le.setSize(Oe.z*C.transmissionResolutionScale,Oe.w*C.transmissionResolutionScale);const Ce=C.getRenderTarget(),ze=C.getActiveCubeFace(),Xe=C.getActiveMipmapLevel();C.setRenderTarget(Le),C.getClearColor(J),se=C.getClearAlpha(),se<1&&C.setClearColor(16777215,.5),C.clear(),Ke&&je.render(Q);const it=C.toneMapping;C.toneMapping=Hn;const ot=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),M.setupLightsView(K),j===!0&&Ie.setGlobalState(C.clippingPlanes,K),_r(R,Q,K),$.updateMultisampleRenderTarget(Le),$.updateRenderTargetMipmap(Le),nt.has("WEBGL_multisampled_render_to_texture")===!1){let Ye=!1;for(let wt=0,It=H.length;wt<It;wt++){const Dt=H[wt],{object:_t,geometry:on,material:Ne,group:vn}=Dt;if(Ne.side===Qt&&_t.layers.test(K.layers)){const pt=Ne.side;Ne.side=fn,Ne.needsUpdate=!0,Mc(_t,Q,K,on,Ne,vn),Ne.side=pt,Ne.needsUpdate=!0,Ye=!0}}Ye===!0&&($.updateMultisampleRenderTarget(Le),$.updateRenderTargetMipmap(Le))}C.setRenderTarget(Ce,ze,Xe),C.setClearColor(J,se),ot!==void 0&&(K.viewport=ot),C.toneMapping=it}function _r(R,H,Q){const K=H.isScene===!0?H.overrideMaterial:null;for(let Z=0,Le=R.length;Z<Le;Z++){const Oe=R[Z],{object:Ce,geometry:ze,group:Xe}=Oe;let it=Oe.material;it.allowOverride===!0&&K!==null&&(it=K),Ce.layers.test(Q.layers)&&Mc(Ce,H,Q,ze,it,Xe)}}function Mc(R,H,Q,K,Z,Le){R.onBeforeRender(C,H,Q,K,Z,Le),R.modelViewMatrix.multiplyMatrices(Q.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),Z.onBeforeRender(C,H,Q,K,R,Le),Z.transparent===!0&&Z.side===Qt&&Z.forceSinglePass===!1?(Z.side=fn,Z.needsUpdate=!0,C.renderBufferDirect(Q,H,K,Z,R,Le),Z.side=Ci,Z.needsUpdate=!0,C.renderBufferDirect(Q,H,K,Z,R,Le),Z.side=Qt):C.renderBufferDirect(Q,H,K,Z,R,Le),R.onAfterRender(C,H,Q,K,Z,Le)}function Sr(R,H,Q){H.isScene!==!0&&(H=Fe);const K=Y.get(R),Z=M.state.lights,Le=M.state.shadowsArray,Oe=Z.state.version,Ce=me.getParameters(R,Z.state,Le,H,Q,M.state.lightProbeGridArray),ze=me.getProgramCacheKey(Ce);let Xe=K.programs;K.environment=R.isMeshStandardMaterial||R.isMeshLambertMaterial||R.isMeshPhongMaterial?H.environment:null,K.fog=H.fog;const it=R.isMeshStandardMaterial||R.isMeshLambertMaterial&&!R.envMap||R.isMeshPhongMaterial&&!R.envMap;K.envMap=fe.get(R.envMap||K.environment,it),K.envMapRotation=K.environment!==null&&R.envMap===null?H.environmentRotation:R.envMapRotation,Xe===void 0&&(R.addEventListener("dispose",Wn),Xe=new Map,K.programs=Xe);let ot=Xe.get(ze);if(ot!==void 0){if(K.currentProgram===ot&&K.lightsStateVersion===Oe)return yc(R,Ce),ot}else Ce.uniforms=me.getUniforms(R),D!==null&&R.isNodeMaterial&&D.build(R,Q,Ce),R.onBeforeCompile(Ce,C),ot=me.acquireProgram(Ce,ze),Xe.set(ze,ot),K.uniforms=Ce.uniforms;const Ye=K.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ye.clippingPlanes=Ie.uniform),yc(R,Ce),K.needsLights=_d(R),K.lightsStateVersion=Oe,K.needsLights&&(Ye.ambientLightColor.value=Z.state.ambient,Ye.lightProbe.value=Z.state.probe,Ye.directionalLights.value=Z.state.directional,Ye.directionalLightShadows.value=Z.state.directionalShadow,Ye.spotLights.value=Z.state.spot,Ye.spotLightShadows.value=Z.state.spotShadow,Ye.rectAreaLights.value=Z.state.rectArea,Ye.ltc_1.value=Z.state.rectAreaLTC1,Ye.ltc_2.value=Z.state.rectAreaLTC2,Ye.pointLights.value=Z.state.point,Ye.pointLightShadows.value=Z.state.pointShadow,Ye.hemisphereLights.value=Z.state.hemi,Ye.directionalShadowMatrix.value=Z.state.directionalShadowMatrix,Ye.spotLightMatrix.value=Z.state.spotLightMatrix,Ye.spotLightMap.value=Z.state.spotLightMap,Ye.pointShadowMatrix.value=Z.state.pointShadowMatrix),K.lightProbeGrid=M.state.lightProbeGridArray.length>0,K.currentProgram=ot,K.uniformsList=null,ot}function wc(R){if(R.uniformsList===null){const H=R.currentProgram.getUniforms();R.uniformsList=mo.seqWithValue(H.seq,R.uniforms)}return R.uniformsList}function yc(R,H){const Q=Y.get(R);Q.outputColorSpace=H.outputColorSpace,Q.batching=H.batching,Q.batchingColor=H.batchingColor,Q.instancing=H.instancing,Q.instancingColor=H.instancingColor,Q.instancingMorph=H.instancingMorph,Q.skinning=H.skinning,Q.morphTargets=H.morphTargets,Q.morphNormals=H.morphNormals,Q.morphColors=H.morphColors,Q.morphTargetsCount=H.morphTargetsCount,Q.numClippingPlanes=H.numClippingPlanes,Q.numIntersection=H.numClipIntersection,Q.vertexAlphas=H.vertexAlphas,Q.vertexTangents=H.vertexTangents,Q.toneMapping=H.toneMapping}function Md(R,H){if(R.length===0)return null;if(R.length===1)return R[0].texture!==null?R[0]:null;w.setFromMatrixPosition(H.matrixWorld);for(let Q=0,K=R.length;Q<K;Q++){const Z=R[Q];if(Z.texture!==null&&Z.boundingBox.containsPoint(w))return Z}return null}function wd(R,H,Q,K,Z){H.isScene!==!0&&(H=Fe),$.resetTextureUnits();const Le=H.fog,Oe=K.isMeshStandardMaterial||K.isMeshLambertMaterial||K.isMeshPhongMaterial?H.environment:null,Ce=G===null?C.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:ut.workingColorSpace,ze=K.isMeshStandardMaterial||K.isMeshLambertMaterial&&!K.envMap||K.isMeshPhongMaterial&&!K.envMap,Xe=fe.get(K.envMap||Oe,ze),it=K.vertexColors===!0&&!!Q.attributes.color&&Q.attributes.color.itemSize===4,ot=!!Q.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),Ye=!!Q.morphAttributes.position,wt=!!Q.morphAttributes.normal,It=!!Q.morphAttributes.color;let Dt=Hn;K.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(Dt=C.toneMapping);const _t=Q.morphAttributes.position||Q.morphAttributes.normal||Q.morphAttributes.color,on=_t!==void 0?_t.length:0,Ne=Y.get(K),vn=M.state.lights;if(j===!0&&(oe===!0||R!==re)){const Et=R===re&&K.id===q;Ie.setState(K,R,Et)}let pt=!1;K.version===Ne.__version?(Ne.needsLights&&Ne.lightsStateVersion!==vn.state.version||Ne.outputColorSpace!==Ce||Z.isBatchedMesh&&Ne.batching===!1||!Z.isBatchedMesh&&Ne.batching===!0||Z.isBatchedMesh&&Ne.batchingColor===!0&&Z.colorTexture===null||Z.isBatchedMesh&&Ne.batchingColor===!1&&Z.colorTexture!==null||Z.isInstancedMesh&&Ne.instancing===!1||!Z.isInstancedMesh&&Ne.instancing===!0||Z.isSkinnedMesh&&Ne.skinning===!1||!Z.isSkinnedMesh&&Ne.skinning===!0||Z.isInstancedMesh&&Ne.instancingColor===!0&&Z.instanceColor===null||Z.isInstancedMesh&&Ne.instancingColor===!1&&Z.instanceColor!==null||Z.isInstancedMesh&&Ne.instancingMorph===!0&&Z.morphTexture===null||Z.isInstancedMesh&&Ne.instancingMorph===!1&&Z.morphTexture!==null||Ne.envMap!==Xe||K.fog===!0&&Ne.fog!==Le||Ne.numClippingPlanes!==void 0&&(Ne.numClippingPlanes!==Ie.numPlanes||Ne.numIntersection!==Ie.numIntersection)||Ne.vertexAlphas!==it||Ne.vertexTangents!==ot||Ne.morphTargets!==Ye||Ne.morphNormals!==wt||Ne.morphColors!==It||Ne.toneMapping!==Dt||Ne.morphTargetsCount!==on||!!Ne.lightProbeGrid!=M.state.lightProbeGridArray.length>0)&&(pt=!0):(pt=!0,Ne.__version=K.version);let bn=Ne.currentProgram;pt===!0&&(bn=Sr(K,H,Z),D&&K.isNodeMaterial&&D.onUpdateProgram(K,bn,Ne));let Xn=!1,mi=!1,ji=!1;const St=bn.getUniforms(),Nt=Ne.uniforms;if(_.useProgram(bn.program)&&(Xn=!0,mi=!0,ji=!0),K.id!==q&&(q=K.id,mi=!0),Ne.needsLights){const Et=Md(M.state.lightProbeGridArray,Z);Ne.lightProbeGrid!==Et&&(Ne.lightProbeGrid=Et,mi=!0)}if(Xn||re!==R){_.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),St.setValue(U,"projectionMatrix",R.projectionMatrix),St.setValue(U,"viewMatrix",R.matrixWorldInverse);const vi=St.map.cameraPosition;vi!==void 0&&vi.setValue(U,Se.setFromMatrixPosition(R.matrixWorld)),L.logarithmicDepthBuffer&&St.setValue(U,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&St.setValue(U,"isOrthographic",R.isOrthographicCamera===!0),re!==R&&(re=R,mi=!0,ji=!0)}if(Ne.needsLights&&(vn.state.directionalShadowMap.length>0&&St.setValue(U,"directionalShadowMap",vn.state.directionalShadowMap,$),vn.state.spotShadowMap.length>0&&St.setValue(U,"spotShadowMap",vn.state.spotShadowMap,$),vn.state.pointShadowMap.length>0&&St.setValue(U,"pointShadowMap",vn.state.pointShadowMap,$)),Z.isSkinnedMesh){St.setOptional(U,Z,"bindMatrix"),St.setOptional(U,Z,"bindMatrixInverse");const Et=Z.skeleton;Et&&(Et.boneTexture===null&&Et.computeBoneTexture(),St.setValue(U,"boneTexture",Et.boneTexture,$))}Z.isBatchedMesh&&(St.setOptional(U,Z,"batchingTexture"),St.setValue(U,"batchingTexture",Z._matricesTexture,$),St.setOptional(U,Z,"batchingIdTexture"),St.setValue(U,"batchingIdTexture",Z._indirectTexture,$),St.setOptional(U,Z,"batchingColorTexture"),Z._colorsTexture!==null&&St.setValue(U,"batchingColorTexture",Z._colorsTexture,$));const gi=Q.morphAttributes;if((gi.position!==void 0||gi.normal!==void 0||gi.color!==void 0)&&F.update(Z,Q,bn),(mi||Ne.receiveShadow!==Z.receiveShadow)&&(Ne.receiveShadow=Z.receiveShadow,St.setValue(U,"receiveShadow",Z.receiveShadow)),(K.isMeshStandardMaterial||K.isMeshLambertMaterial||K.isMeshPhongMaterial)&&K.envMap===null&&H.environment!==null&&(Nt.envMapIntensity.value=H.environmentIntensity),Nt.dfgLUT!==void 0&&(Nt.dfgLUT.value=Lx()),mi){if(St.setValue(U,"toneMappingExposure",C.toneMappingExposure),Ne.needsLights&&yd(Nt,ji),Le&&K.fog===!0&&De.refreshFogUniforms(Nt,Le),De.refreshMaterialUniforms(Nt,K,W,X,M.state.transmissionRenderTarget[R.id]),Ne.needsLights&&Ne.lightProbeGrid){const Et=Ne.lightProbeGrid;Nt.probesSH.value=Et.texture,Nt.probesMin.value.copy(Et.boundingBox.min),Nt.probesMax.value.copy(Et.boundingBox.max),Nt.probesResolution.value.copy(Et.resolution)}mo.upload(U,wc(Ne),Nt,$)}if(K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(mo.upload(U,wc(Ne),Nt,$),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&St.setValue(U,"center",Z.center),St.setValue(U,"modelViewMatrix",Z.modelViewMatrix),St.setValue(U,"normalMatrix",Z.normalMatrix),St.setValue(U,"modelMatrix",Z.matrixWorld),K.uniformsGroups!==void 0){const Et=K.uniformsGroups;for(let vi=0,Qi=Et.length;vi<Qi;vi++){const _c=Et[vi];de.update(_c,bn),de.bind(_c,bn)}}return bn}function yd(R,H){R.ambientLightColor.needsUpdate=H,R.lightProbe.needsUpdate=H,R.directionalLights.needsUpdate=H,R.directionalLightShadows.needsUpdate=H,R.pointLights.needsUpdate=H,R.pointLightShadows.needsUpdate=H,R.spotLights.needsUpdate=H,R.spotLightShadows.needsUpdate=H,R.rectAreaLights.needsUpdate=H,R.hemisphereLights.needsUpdate=H}function _d(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return O},this.getRenderTarget=function(){return G},this.setRenderTargetTextures=function(R,H,Q){const K=Y.get(R);K.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),Y.get(R.texture).__webglTexture=H,Y.get(R.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:Q,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,H){const Q=Y.get(R);Q.__webglFramebuffer=H,Q.__useDefaultFramebuffer=H===void 0},this.setRenderTarget=function(R,H=0,Q=0){G=R,V=H,O=Q;let K=null,Z=!1,Le=!1;if(R){const Ce=Y.get(R);if(Ce.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(U.FRAMEBUFFER,Ce.__webglFramebuffer),ne.copy(R.viewport),ce.copy(R.scissor),Te=R.scissorTest,_.viewport(ne),_.scissor(ce),_.setScissorTest(Te),q=-1;return}else if(Ce.__webglFramebuffer===void 0)$.setupRenderTarget(R);else if(Ce.__hasExternalTextures)$.rebindTextures(R,Y.get(R.texture).__webglTexture,Y.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const it=R.depthTexture;if(Ce.__boundDepthTexture!==it){if(it!==null&&Y.has(it)&&(R.width!==it.image.width||R.height!==it.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");$.setupDepthRenderbuffer(R)}}const ze=R.texture;(ze.isData3DTexture||ze.isDataArrayTexture||ze.isCompressedArrayTexture)&&(Le=!0);const Xe=Y.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Xe[H])?K=Xe[H][Q]:K=Xe[H],Z=!0):R.samples>0&&$.useMultisampledRTT(R)===!1?K=Y.get(R).__webglMultisampledFramebuffer:Array.isArray(Xe)?K=Xe[Q]:K=Xe,ne.copy(R.viewport),ce.copy(R.scissor),Te=R.scissorTest}else ne.copy(Ue).multiplyScalar(W).floor(),ce.copy(et).multiplyScalar(W).floor(),Te=_e;if(Q!==0&&(K=N),_.bindFramebuffer(U.FRAMEBUFFER,K)&&_.drawBuffers(R,K),_.viewport(ne),_.scissor(ce),_.setScissorTest(Te),Z){const Ce=Y.get(R.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+H,Ce.__webglTexture,Q)}else if(Le){const Ce=H;for(let ze=0;ze<R.textures.length;ze++){const Xe=Y.get(R.textures[ze]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+ze,Xe.__webglTexture,Q,Ce)}}else if(R!==null&&Q!==0){const Ce=Y.get(R.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Ce.__webglTexture,Q)}q=-1},this.readRenderTargetPixels=function(R,H,Q,K,Z,Le,Oe,Ce=0){if(!(R&&R.isWebGLRenderTarget)){ht("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ze=Y.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Oe!==void 0&&(ze=ze[Oe]),ze){_.bindFramebuffer(U.FRAMEBUFFER,ze);try{const Xe=R.textures[Ce],it=Xe.format,ot=Xe.type;if(R.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+Ce),!L.textureFormatReadable(it)){ht("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!L.textureTypeReadable(ot)){ht("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=R.width-K&&Q>=0&&Q<=R.height-Z&&U.readPixels(H,Q,K,Z,Ee.convert(it),Ee.convert(ot),Le)}finally{const Xe=G!==null?Y.get(G).__webglFramebuffer:null;_.bindFramebuffer(U.FRAMEBUFFER,Xe)}}},this.readRenderTargetPixelsAsync=async function(R,H,Q,K,Z,Le,Oe,Ce=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ze=Y.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&Oe!==void 0&&(ze=ze[Oe]),ze)if(H>=0&&H<=R.width-K&&Q>=0&&Q<=R.height-Z){_.bindFramebuffer(U.FRAMEBUFFER,ze);const Xe=R.textures[Ce],it=Xe.format,ot=Xe.type;if(R.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+Ce),!L.textureFormatReadable(it))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!L.textureTypeReadable(ot))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ye=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,Ye),U.bufferData(U.PIXEL_PACK_BUFFER,Le.byteLength,U.STREAM_READ),U.readPixels(H,Q,K,Z,Ee.convert(it),Ee.convert(ot),0);const wt=G!==null?Y.get(G).__webglFramebuffer:null;_.bindFramebuffer(U.FRAMEBUFFER,wt);const It=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await tf(U,It,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,Ye),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,Le),U.deleteBuffer(Ye),U.deleteSync(It),Le}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,H=null,Q=0){const K=Math.pow(2,-Q),Z=Math.floor(R.image.width*K),Le=Math.floor(R.image.height*K),Oe=H!==null?H.x:0,Ce=H!==null?H.y:0;$.setTexture2D(R,0),U.copyTexSubImage2D(U.TEXTURE_2D,Q,0,0,Oe,Ce,Z,Le),_.unbindTexture()},this.copyTextureToTexture=function(R,H,Q=null,K=null,Z=0,Le=0){let Oe,Ce,ze,Xe,it,ot,Ye,wt,It;const Dt=R.isCompressedTexture?R.mipmaps[Le]:R.image;if(Q!==null)Oe=Q.max.x-Q.min.x,Ce=Q.max.y-Q.min.y,ze=Q.isBox3?Q.max.z-Q.min.z:1,Xe=Q.min.x,it=Q.min.y,ot=Q.isBox3?Q.min.z:0;else{const Nt=Math.pow(2,-Z);Oe=Math.floor(Dt.width*Nt),Ce=Math.floor(Dt.height*Nt),R.isDataArrayTexture?ze=Dt.depth:R.isData3DTexture?ze=Math.floor(Dt.depth*Nt):ze=1,Xe=0,it=0,ot=0}K!==null?(Ye=K.x,wt=K.y,It=K.z):(Ye=0,wt=0,It=0);const _t=Ee.convert(H.format),on=Ee.convert(H.type);let Ne;H.isData3DTexture?($.setTexture3D(H,0),Ne=U.TEXTURE_3D):H.isDataArrayTexture||H.isCompressedArrayTexture?($.setTexture2DArray(H,0),Ne=U.TEXTURE_2D_ARRAY):($.setTexture2D(H,0),Ne=U.TEXTURE_2D),_.activeTexture(U.TEXTURE0),_.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,H.flipY),_.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),_.pixelStorei(U.UNPACK_ALIGNMENT,H.unpackAlignment);const vn=_.getParameter(U.UNPACK_ROW_LENGTH),pt=_.getParameter(U.UNPACK_IMAGE_HEIGHT),bn=_.getParameter(U.UNPACK_SKIP_PIXELS),Xn=_.getParameter(U.UNPACK_SKIP_ROWS),mi=_.getParameter(U.UNPACK_SKIP_IMAGES);_.pixelStorei(U.UNPACK_ROW_LENGTH,Dt.width),_.pixelStorei(U.UNPACK_IMAGE_HEIGHT,Dt.height),_.pixelStorei(U.UNPACK_SKIP_PIXELS,Xe),_.pixelStorei(U.UNPACK_SKIP_ROWS,it),_.pixelStorei(U.UNPACK_SKIP_IMAGES,ot);const ji=R.isDataArrayTexture||R.isData3DTexture,St=H.isDataArrayTexture||H.isData3DTexture;if(R.isDepthTexture){const Nt=Y.get(R),gi=Y.get(H),Et=Y.get(Nt.__renderTarget),vi=Y.get(gi.__renderTarget);_.bindFramebuffer(U.READ_FRAMEBUFFER,Et.__webglFramebuffer),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,vi.__webglFramebuffer);for(let Qi=0;Qi<ze;Qi++)ji&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Y.get(R).__webglTexture,Z,ot+Qi),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Y.get(H).__webglTexture,Le,It+Qi)),U.blitFramebuffer(Xe,it,Oe,Ce,Ye,wt,Oe,Ce,U.DEPTH_BUFFER_BIT,U.NEAREST);_.bindFramebuffer(U.READ_FRAMEBUFFER,null),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(Z!==0||R.isRenderTargetTexture||Y.has(R)){const Nt=Y.get(R),gi=Y.get(H);_.bindFramebuffer(U.READ_FRAMEBUFFER,z),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,I);for(let Et=0;Et<ze;Et++)ji?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Nt.__webglTexture,Z,ot+Et):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Nt.__webglTexture,Z),St?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,gi.__webglTexture,Le,It+Et):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,gi.__webglTexture,Le),Z!==0?U.blitFramebuffer(Xe,it,Oe,Ce,Ye,wt,Oe,Ce,U.COLOR_BUFFER_BIT,U.NEAREST):St?U.copyTexSubImage3D(Ne,Le,Ye,wt,It+Et,Xe,it,Oe,Ce):U.copyTexSubImage2D(Ne,Le,Ye,wt,Xe,it,Oe,Ce);_.bindFramebuffer(U.READ_FRAMEBUFFER,null),_.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else St?R.isDataTexture||R.isData3DTexture?U.texSubImage3D(Ne,Le,Ye,wt,It,Oe,Ce,ze,_t,on,Dt.data):H.isCompressedArrayTexture?U.compressedTexSubImage3D(Ne,Le,Ye,wt,It,Oe,Ce,ze,_t,Dt.data):U.texSubImage3D(Ne,Le,Ye,wt,It,Oe,Ce,ze,_t,on,Dt):R.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,Le,Ye,wt,Oe,Ce,_t,on,Dt.data):R.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,Le,Ye,wt,Dt.width,Dt.height,_t,Dt.data):U.texSubImage2D(U.TEXTURE_2D,Le,Ye,wt,Oe,Ce,_t,on,Dt);_.pixelStorei(U.UNPACK_ROW_LENGTH,vn),_.pixelStorei(U.UNPACK_IMAGE_HEIGHT,pt),_.pixelStorei(U.UNPACK_SKIP_PIXELS,bn),_.pixelStorei(U.UNPACK_SKIP_ROWS,Xn),_.pixelStorei(U.UNPACK_SKIP_IMAGES,mi),Le===0&&H.generateMipmaps&&U.generateMipmap(Ne),_.unbindTexture()},this.initRenderTarget=function(R){Y.get(R).__webglFramebuffer===void 0&&$.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?$.setTextureCube(R,0):R.isData3DTexture?$.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?$.setTexture2DArray(R,0):$.setTexture2D(R,0),_.unbindTexture()},this.resetState=function(){V=0,O=0,G=null,_.reset(),Re.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=ut._getDrawingBufferColorSpace(e),t.unpackColorSpace=ut._getUnpackColorSpace()}}const Hi={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class Di{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ix=new No(-1,1,1,-1,0,1);class Nx extends At{constructor(){super(),this.setAttribute("position",new $e([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new $e([0,2,0,0,2,0],2))}}const Ux=new Nx;class xr{constructor(e){this._mesh=new qe(Ux,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Ix)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class er extends Di{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof ft?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=An.clone(e.uniforms),this.material=new ft({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new xr(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class kh extends Di{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class Ox extends Di{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class kx{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new ae);this._width=n.width,this._height=n.height,t=new Pt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Vt}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new er(Hi),this.copyPass.material.blending=jt,this.timer=new Up}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}kh!==void 0&&(o instanceof kh?n=!0:o instanceof Ox&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new ae);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Fx extends Di{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new pe}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const Bx={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new pe(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class Cs extends Di{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new ae(e.x,e.y):new ae(256,256),this.clearColor=new pe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Pt(r,o,{type:Vt}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const d=new Pt(r,o,{type:Vt});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);const u=new Pt(r,o,{type:Vt});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}const a=Bx;this.highPassUniforms=An.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ft({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new ae(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=An.clone(Hi.uniforms),this.blendMaterial=new ft({uniforms:this.copyUniforms,vertexShader:Hi.vertexShader,fragmentShader:Hi.fragmentShader,premultipliedAlpha:!0,blending:Bn,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new pe,this._oldClearAlpha=1,this._basic=new Co,this._fsQuad=new xr(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new ae(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=Cs.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Cs.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[],n=e/3;for(let s=0;s<e;s++)t.push(.39894*Math.exp(-.5*s*s/(n*n))/n);return new ft({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new ae(.5,.5)},direction:{value:new ae(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

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

				}`})}_getCompositeMaterial(e){return new ft({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}}Cs.BlurDirectionX=new ae(1,0);Cs.BlurDirectionY=new ae(0,1);const eo={defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new ae},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new rt},cameraProjectionMatrixInverse:{value:new rt},cameraWorldMatrix:{value:new rt},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new A(-1,-1,-1)},sceneBoxMax:{value:new A(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},to={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},Pa={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function Hx(i=5){const e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=zx(e),n=t.length,s=new Uint8Array(n*4);for(let o=0;o<n;++o){const a=t[o],l=2*Math.PI*a/n,c=new A(Math.cos(l),Math.sin(l),0).normalize();s[o*4]=(c.x*.5+.5)*255,s[o*4+1]=(c.y*.5+.5)*255,s[o*4+2]=127,s[o*4+3]=255}const r=new Po(s,e,e);return r.wrapS=mn,r.wrapT=mn,r.needsUpdate=!0,r}function zx(i){const e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=e*e,n=Array(t).fill(0);let s=Math.floor(e/2),r=e-1;for(let o=1;o<=t;){if(s===-1&&r===e?(r=e-2,s=0):(r===e&&(r=0),s<0&&(s=e-1)),n[s*e+r]!==0){r-=2,s++;continue}else n[s*e+r]=o++;r++,s--}return n}const no={defines:{SAMPLES:16,SAMPLE_VECTORS:qu(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new ae},cameraProjectionMatrixInverse:{value:new rt},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function qu(i,e,t){const n=Vx(i,e,t);let s="vec3[SAMPLES](";for(let r=0;r<i;r++){const o=n[r];s+=`vec3(${o.x}, ${o.y}, ${o.z})${r<i-1?",":")"}`}return s}function Vx(i,e,t){const n=[];for(let s=0;s<i;s++){const r=2*Math.PI*e*s/i,o=Math.pow(s/(i-1),t);n.push(new A(Math.cos(r),Math.sin(r),o))}return n}class Gx{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,s,r;const o=.5*(Math.sqrt(3)-1),a=(e+t)*o,l=Math.floor(e+a),c=Math.floor(t+a),h=(3-Math.sqrt(3))/6,d=(l+c)*h,u=l-d,f=c-d,m=e-u,x=t-f;let g,p;m>x?(g=1,p=0):(g=0,p=1);const T=m-g+h,b=x-p+h,w=m-1+2*h,S=x-1+2*h,M=l&255,y=c&255,v=this.perm[M+this.perm[y]]%12,E=this.perm[M+g+this.perm[y+p]]%12,C=this.perm[M+1+this.perm[y+1]]%12;let P=.5-m*m-x*x;P<0?n=0:(P*=P,n=P*P*this._dot(this.grad3[v],m,x));let D=.5-T*T-b*b;D<0?s=0:(D*=D,s=D*D*this._dot(this.grad3[E],T,b));let N=.5-w*w-S*S;return N<0?r=0:(N*=N,r=N*N*this._dot(this.grad3[C],w,S)),70*(n+s+r)}noise3d(e,t,n){let s,r,o,a;const c=(e+t+n)*.3333333333333333,h=Math.floor(e+c),d=Math.floor(t+c),u=Math.floor(n+c),f=1/6,m=(h+d+u)*f,x=h-m,g=d-m,p=u-m,T=e-x,b=t-g,w=n-p;let S,M,y,v,E,C;T>=b?b>=w?(S=1,M=0,y=0,v=1,E=1,C=0):T>=w?(S=1,M=0,y=0,v=1,E=0,C=1):(S=0,M=0,y=1,v=1,E=0,C=1):b<w?(S=0,M=0,y=1,v=0,E=1,C=1):T<w?(S=0,M=1,y=0,v=0,E=1,C=1):(S=0,M=1,y=0,v=1,E=1,C=0);const P=T-S+f,D=b-M+f,N=w-y+f,z=T-v+2*f,I=b-E+2*f,V=w-C+2*f,O=T-1+3*f,G=b-1+3*f,q=w-1+3*f,re=h&255,ne=d&255,ce=u&255,Te=this.perm[re+this.perm[ne+this.perm[ce]]]%12,J=this.perm[re+S+this.perm[ne+M+this.perm[ce+y]]]%12,se=this.perm[re+v+this.perm[ne+E+this.perm[ce+C]]]%12,k=this.perm[re+1+this.perm[ne+1+this.perm[ce+1]]]%12;let X=.6-T*T-b*b-w*w;X<0?s=0:(X*=X,s=X*X*this._dot3(this.grad3[Te],T,b,w));let W=.6-P*P-D*D-N*N;W<0?r=0:(W*=W,r=W*W*this._dot3(this.grad3[J],P,D,N));let he=.6-z*z-I*I-V*V;he<0?o=0:(he*=he,o=he*he*this._dot3(this.grad3[se],z,I,V));let ue=.6-O*O-G*G-q*q;return ue<0?a=0:(ue*=ue,a=ue*ue*this._dot3(this.grad3[k],O,G,q)),32*(s+r+o+a)}noise4d(e,t,n,s){const r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20;let h,d,u,f,m;const x=(e+t+n+s)*l,g=Math.floor(e+x),p=Math.floor(t+x),T=Math.floor(n+x),b=Math.floor(s+x),w=(g+p+T+b)*c,S=g-w,M=p-w,y=T-w,v=b-w,E=e-S,C=t-M,P=n-y,D=s-v,N=E>C?32:0,z=E>P?16:0,I=C>P?8:0,V=E>D?4:0,O=C>D?2:0,G=P>D?1:0,q=N+z+I+V+O+G,re=o[q][0]>=3?1:0,ne=o[q][1]>=3?1:0,ce=o[q][2]>=3?1:0,Te=o[q][3]>=3?1:0,J=o[q][0]>=2?1:0,se=o[q][1]>=2?1:0,k=o[q][2]>=2?1:0,X=o[q][3]>=2?1:0,W=o[q][0]>=1?1:0,he=o[q][1]>=1?1:0,ue=o[q][2]>=1?1:0,Ue=o[q][3]>=1?1:0,et=E-re+c,_e=C-ne+c,te=P-ce+c,j=D-Te+c,oe=E-J+2*c,Me=C-se+2*c,Se=P-k+2*c,Ve=D-X+2*c,Fe=E-W+3*c,Ke=C-he+3*c,Je=P-ue+3*c,U=D-Ue+3*c,dt=E-1+4*c,nt=C-1+4*c,L=P-1+4*c,_=D-1+4*c,B=g&255,Y=p&255,$=T&255,fe=b&255,ge=a[B+a[Y+a[$+a[fe]]]]%32,ee=a[B+re+a[Y+ne+a[$+ce+a[fe+Te]]]]%32,ie=a[B+J+a[Y+se+a[$+k+a[fe+X]]]]%32,me=a[B+W+a[Y+he+a[$+ue+a[fe+Ue]]]]%32,De=a[B+1+a[Y+1+a[$+1+a[fe+1]]]]%32;let ve=.6-E*E-C*C-P*P-D*D;ve<0?h=0:(ve*=ve,h=ve*ve*this._dot4(r[ge],E,C,P,D));let xe=.6-et*et-_e*_e-te*te-j*j;xe<0?d=0:(xe*=xe,d=xe*xe*this._dot4(r[ee],et,_e,te,j));let Ie=.6-oe*oe-Me*Me-Se*Se-Ve*Ve;Ie<0?u=0:(Ie*=Ie,u=Ie*Ie*this._dot4(r[ie],oe,Me,Se,Ve));let ke=.6-Fe*Fe-Ke*Ke-Je*Je-U*U;ke<0?f=0:(ke*=ke,f=ke*ke*this._dot4(r[me],Fe,Ke,Je,U));let je=.6-dt*dt-nt*nt-L*L-_*_;return je<0?m=0:(je*=je,m=je*je*this._dot4(r[De],dt,nt,L,_)),27*(h+d+u+f+m)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,s){return e[0]*t+e[1]*n+e[2]*s}_dot4(e,t,n,s,r){return e[0]*t+e[1]*n+e[2]*s+e[3]*r}}class Un extends Di{constructor(e,t,n=512,s=512,r,o,a){super(),this.width=n,this.height=s,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Hx(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Pt(this.width,this.height,{type:Vt}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new ft({defines:Object.assign({},eo.defines),uniforms:An.clone(eo.uniforms),vertexShader:eo.vertexShader,fragmentShader:eo.fragmentShader,blending:jt,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Uu,this.normalMaterial.blending=jt,this.pdMaterial=new ft({defines:Object.assign({},no.defines),uniforms:An.clone(no.uniforms),vertexShader:no.vertexShader,fragmentShader:no.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new ft({defines:Object.assign({},to.defines),uniforms:An.clone(to.uniforms),vertexShader:to.vertexShader,fragmentShader:to.fragmentShader,blending:jt}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new ft({uniforms:An.clone(Hi.uniforms),vertexShader:Hi.vertexShader,fragmentShader:Hi.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Ha,blendDst:js,blendEquation:On,blendSrcAlpha:Ba,blendDstAlpha:js,blendEquationAlpha:On}),this.blendMaterial=new ft({uniforms:An.clone(Pa.uniforms),vertexShader:Pa.vertexShader,fragmentShader:Pa.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:jh,blendSrc:Ha,blendDst:js,blendEquation:On,blendSrcAlpha:Ba,blendDstAlpha:js,blendEquationAlpha:On}),this._fsQuad=new xr(null),this._originalClearColor=new pe,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){e!==void 0?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new Wi,this.depthTexture.format=Ai,this.depthTexture.type=Es,this.normalRenderTarget=new Pt(this.width,this.height,{minFilter:Ct,magFilter:Ct,type:Vt,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);const n=this.normalTexture?1:0,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=qu(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case Un.OUTPUT.Off:break;case Un.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=jt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case Un.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=jt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case Un.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=jt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case Un.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case Un.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=jt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case Un.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=jt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,n,s,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_renderOverride(e,t,n,s,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s=t.clearColor||s,r=t.clearAlpha||r,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,t.push(n))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){const t=new Gx,n=e*e*4,s=new Uint8Array(n);for(let o=0;o<e;o++)for(let a=0;a<e;a++){const l=o,c=a;s[(o*e+a)*4]=(t.noise(l,c)*.5+.5)*255,s[(o*e+a)*4+1]=(t.noise(l+e,c)*.5+.5)*255,s[(o*e+a)*4+2]=(t.noise(l,c+e)*.5+.5)*255,s[(o*e+a)*4+3]=(t.noise(l+e,c+e)*.5+.5)*255}const r=new Po(s,e,e,yn,cn);return r.wrapS=mn,r.wrapT=mn,r.needsUpdate=!0,r}}Un.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};const io={defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new ae(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},so={defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new ae(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},La={uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new ae(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};class Wx extends Di{constructor(){super(),this._edgesRT=new Pt(1,1,{depthBuffer:!1,type:Vt}),this._edgesRT.texture.name="SMAAPass.edges",this._weightsRT=new Pt(1,1,{depthBuffer:!1,type:Vt}),this._weightsRT.texture.name="SMAAPass.weights";const e=this,t=new Image;t.src=this._getAreaTexture(),t.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new en,this._areaTexture.name="SMAAPass.area",this._areaTexture.image=t,this._areaTexture.minFilter=sn,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;const n=new Image;n.src=this._getSearchTexture(),n.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new en,this._searchTexture.name="SMAAPass.search",this._searchTexture.image=n,this._searchTexture.magFilter=Ct,this._searchTexture.minFilter=Ct,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=An.clone(io.uniforms),this._materialEdges=new ft({defines:Object.assign({},io.defines),uniforms:this._uniformsEdges,vertexShader:io.vertexShader,fragmentShader:io.fragmentShader}),this._uniformsWeights=An.clone(so.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new ft({defines:Object.assign({},so.defines),uniforms:this._uniformsWeights,vertexShader:so.vertexShader,fragmentShader:so.fragmentShader}),this._uniformsBlend=An.clone(La.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new ft({uniforms:this._uniformsBlend,vertexShader:La.vertexShader,fragmentShader:La.fragmentShader}),this._fsQuad=new xr(null)}render(e,t,n){this._uniformsEdges.tDiffuse.value=n.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=n.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,t){this._edgesRT.setSize(e,t),this._weightsRT.setSize(e,t),this._materialEdges.uniforms.resolution.value.set(1/e,1/t),this._materialWeights.uniforms.resolution.value.set(1/e,1/t),this._materialBlend.uniforms.resolution.value.set(1/e,1/t)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return"data:image/png;base64,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"}_getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}}const ci=Math.PI*2;function we(i,e=0,t=1){return i<e?e:i>t?t:i}function Ge(i,e,t){return i+(e-i)*t}function Xx(i,e,t){return i===e?0:we((t-i)/(e-i))}function gt(i,e,t){const n=Xx(i,e,t);return n*n*(3-2*n)}function Jt(i,e,t,n){return Ge(i,e,1-Math.exp(-t*n))}function ye(i,e){return Math.exp(-(i*i)/(2*e*e))}const Ku={linear:i=>i,inQuad:i=>i*i,outQuad:i=>i*(2-i),inOutQuad:i=>i<.5?2*i*i:-1+(4-2*i)*i,inCubic:i=>i*i*i,outCubic:i=>1-Math.pow(1-i,3),inOutCubic:i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,outQuint:i=>1-Math.pow(1-i,5),inOutSine:i=>-(Math.cos(Math.PI*i)-1)/2,outExpo:i=>i>=1?1:1-Math.pow(2,-10*i),outBack:i=>1+2.2*Math.pow(i-1,3)+1.2*Math.pow(i-1,2),outElastic:i=>i===0||i===1?i:Math.pow(2,-9*i)*Math.sin((i*10-.75)*(2*Math.PI/3))+1};class $t{s;constructor(e=1337){this.s=e>>>0}next(){this.s=this.s+1831565813>>>0;let e=this.s;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return e+(t-e)*this.next()}int(e,t){return Math.floor(this.range(e,t+1))}pick(e){return e[Math.floor(this.next()*e.length)%e.length]}chance(e){return this.next()<e}normal(e=0,t=1){const n=Math.max(1e-9,this.next());return e+t*Math.sqrt(-2*Math.log(n))*Math.cos(ci*this.next())}}const nn=new Uint8Array(512);{const i=new $t(9871),e=new Uint8Array(256);for(let t=0;t<256;t++)e[t]=t;for(let t=255;t>0;t--){const n=i.int(0,t),s=e[t];e[t]=e[n],e[n]=s}for(let t=0;t<512;t++)nn[t]=e[t&255]}function Da(i){return i*i*i*(i*(i*6-15)+10)}function bi(i,e,t,n){switch(i&15){case 0:return e+t;case 1:return-e+t;case 2:return e-t;case 3:return-e-t;case 4:return e+n;case 5:return-e+n;case 6:return e-n;case 7:return-e-n;case 8:return t+n;case 9:return-t+n;case 10:return t-n;case 11:return-t-n;case 12:return t+e;case 13:return-t+n;case 14:return t-e;default:return-t-n}}function Yx(i,e,t){const n=Math.floor(i)&255,s=Math.floor(e)&255,r=Math.floor(t)&255;i-=Math.floor(i),e-=Math.floor(e),t-=Math.floor(t);const o=Da(i),a=Da(e),l=Da(t),c=nn[n]+s,h=nn[c]+r,d=nn[c+1]+r,u=nn[n+1]+s,f=nn[u]+r,m=nn[u+1]+r;return Ge(Ge(Ge(bi(nn[h],i,e,t),bi(nn[f],i-1,e,t),o),Ge(bi(nn[d],i,e-1,t),bi(nn[m],i-1,e-1,t),o),a),Ge(Ge(bi(nn[h+1],i,e,t-1),bi(nn[f+1],i-1,e,t-1),o),Ge(bi(nn[d+1],i,e-1,t-1),bi(nn[m+1],i-1,e-1,t-1),o),a),l)}function Os(i,e){return Yx(i,e,.371)}function ct(i,e,t=5,n=2.03,s=.5){let r=.5,o=1,a=0,l=0;for(let c=0;c<t;c++)a+=r*Os(i*o,e*o),l+=r,r*=s,o*=n;return a/l}function Zu(i,e,t=4){let n=.5,s=1,r=0,o=0;for(let a=0;a<t;a++)r+=n*(1-Math.abs(Os(i*s,e*s))),o+=n,n*=.5,s*=2.07;return r/o}function Yi(i,e,t=8){const n=Math.floor(i),s=Math.floor(e);let r=1e9;for(let o=-1;o<=1;o++)for(let a=-1;a<=1;a++){const l=n+a,c=s+o,h=(l%t+t)%t,d=(c%t+t)%t,u=nn[nn[h&255]+d&255],f=l+(u&15)/15,m=c+(u>>4&15)/15,x=Math.hypot(f-i,m-e);x<r&&(r=x)}return Math.min(1,r)}const ko=`
  vec3 acesFitted(vec3 c) {
    const mat3 IN = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
    const mat3 OUT = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
    c = IN * c;
    vec3 a = c * (c + 0.0245786) - 0.000090537;
    vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
    c = a / b;
    return clamp(OUT * c, 0.0, 1.0);
  }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`,Mr={uniforms:{tDiffuse:{value:null},uResolution:{value:new ae(1,1)},uTime:{value:0},uExposure:{value:1.05},uContrast:{value:1.08},uSaturation:{value:1.04},uLift:{value:new A(.004,.008,.016)},uGain:{value:new A(1,1,1.03)},uShadowTint:{value:new A(.28,.62,.9)},uHighlightTint:{value:new A(1,.88,.72)},uSplit:{value:.16},uVignette:{value:.42},uCA:{value:.0016},uGrain:{value:.014},uWetLens:{value:0},uFlash:{value:0},uFlashColor:{value:new A(1,1,1)},uDesat:{value:0},uGlitch:{value:0},uHalation:{value:.14},uBarrel:{value:.012}},vertexShader:`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime, uExposure, uContrast, uSaturation, uSplit, uVignette, uCA, uGrain;
    uniform float uWetLens, uFlash, uDesat, uGlitch, uHalation, uBarrel;
    uniform vec3 uLift, uGain, uShadowTint, uHighlightTint, uFlashColor;
    varying vec2 vUv;
    ${ko}

    // Lens droplets: a couple of layers of jittered cells with a refracting bulge.
    vec2 dropletOffset(vec2 uv, float aspect) {
      vec2 off = vec2(0.0);
      for (int L = 0; L < 2; L++) {
        float s = 9.0 + float(L) * 15.0;
        vec2 p = uv * vec2(aspect, 1.0) * s;
        vec2 id = floor(p);
        vec2 f = fract(p) - 0.5;
        float h = hash12(id + float(L) * 37.0);
        if (h > 0.72) {
          vec2 jitter = (vec2(hash12(id + 3.1), hash12(id + 7.7)) - 0.5) * 0.55;
          float r = 0.16 + h * 0.2;
          float d = length(f - jitter);
          if (d < r) {
            float k = 1.0 - d / r;
            off += normalize(f - jitter + 1e-5) * k * k * 0.045 * (1.0 - float(L) * 0.4);
          }
        }
      }
      return off;
    }

    void main() {
      vec2 uv = vUv;
      // Mild barrel distortion for anamorphic character.
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      uv = 0.5 + cc * (1.0 + uBarrel * r2);

      float aspect = uResolution.x / max(uResolution.y, 1.0);
      if (uWetLens > 0.001) uv += dropletOffset(uv, aspect) * uWetLens;

      if (uGlitch > 0.001) {
        float band = floor(uv.y * 90.0);
        float j = (hash12(vec2(band, floor(uTime * 24.0))) - 0.5);
        uv.x += j * 0.05 * uGlitch * step(0.72, hash12(vec2(band * 1.7, floor(uTime * 12.0))));
      }

      // Radial chromatic aberration.
      vec2 dir = uv - 0.5;
      float ca = uCA * (0.35 + r2 * 2.4);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      // Cheap halation: wide low-res tap of the bright areas bleeding red-orange.
      if (uHalation > 0.001) {
        vec3 h = vec3(0.0);
        vec2 px = 3.5 / uResolution;
        h += texture2D(tDiffuse, uv + px * vec2( 2.0,  0.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-2.0,  0.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 0.0,  2.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 0.0, -2.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 1.4,  1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-1.4,  1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 1.4, -1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-1.4, -1.4)).rgb;
        h /= 8.0;
        float hl = smoothstep(0.75, 2.2, luma(h));
        col += h * hl * uHalation * vec3(1.0, 0.62, 0.4);
      }

      col *= uExposure;
      col += uFlash * uFlashColor * 2.4;

      // Tonemap, then grade in display space.
      col = acesFitted(col);
      col = col * uGain + uLift;
      float l = luma(col);
      col = mix(vec3(l), col, uSaturation);
      col = mix(col, vec3(l), uDesat);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      // Split toning.
      float sh = pow(1.0 - clamp(l, 0.0, 1.0), 2.0);
      float hi = pow(clamp(l, 0.0, 1.0), 1.6);
      col = mix(col, col * uShadowTint, sh * uSplit);
      col = mix(col, col * uHighlightTint, hi * uSplit * 0.7);

      // Vignette + subtle corner smear.
      float vig = 1.0 - uVignette * pow(clamp(r2 * 1.9, 0.0, 1.0), 1.35);
      col *= vig;

      // Animated grain, stronger in the shadows like real film.
      float g = hash12(vUv * uResolution + fract(uTime) * 1371.0) - 0.5;
      col += g * uGrain * (1.15 - 0.75 * l);

      // Dither to kill 8-bit banding in the gradients.
      col += (hash12(vUv * uResolution.yx + 17.3) - 0.5) / 255.0;

      gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
    }
  `};class qx{constructor(e,t,n=.5){this.scale=n,this.rt=new Pt(Math.max(2,Math.floor(e*n)),Math.max(2,Math.floor(t*n)),{minFilter:Ct,magFilter:Ct,type:cn})}rt;material=new Ou({depthPacking:Xd});setSize(e,t){this.rt.setSize(Math.max(2,Math.floor(e*this.scale)),Math.max(2,Math.floor(t*this.scale)))}render(e,t,n){const s=e.getRenderTarget(),r=t.overrideMaterial,o=t.background,a=[];t.traverse(l=>{if(!l.visible)return;const c=l.isSprite,h=l.isPoints;let d=c||h;if(!d){const f=l.material,m=Array.isArray(f)?f[0]:f;if(m){const x=m.isShaderMaterial===!0;(m.transparent||m.depthWrite===!1||m.blending===Bn||x)&&(d=!0)}}d&&(a.push(l),l.visible=!1)}),t.overrideMaterial=this.material,t.background=null,e.setRenderTarget(this.rt),e.setClearColor(16777215,1),e.clear(),e.render(t,n),t.overrideMaterial=r,t.background=o;for(const l of a)l.visible=!0;e.setRenderTarget(s)}get texture(){return this.rt.texture}dispose(){this.rt.dispose(),this.material.dispose()}}const Kx={uniforms:{tDiffuse:{value:null},tDepth:{value:null},uResolution:{value:new ae(1,1)},uFocus:{value:6},uAperture:{value:.9},uMaxCoC:{value:16},uNear:{value:.1},uFar:{value:400},uSamples:{value:24},uHighlight:{value:1.5}},vertexShader:Mr.vertexShader,fragmentShader:`
    precision highp float;
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 uResolution;
    uniform float uFocus, uAperture, uMaxCoC, uNear, uFar, uHighlight;
    uniform int uSamples;
    varying vec2 vUv;
    ${ko}

    const vec4 UNPACK = vec4( 1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0 );
    float unpackDepth( vec4 v ) { return dot( v, UNPACK ); }

    float viewZ(vec2 uv) {
      float d = unpackDepth( texture2D( tDepth, uv ) );
      return (uNear * uFar) / ((uFar - uNear) * d - uFar);
    }
    float coc(vec2 uv) {
      float z = -viewZ(uv);
      float d = (z - uFocus) / max(z, 0.001);
      return clamp(abs(d) * uAperture * 1.5, 0.0, 1.0) * uMaxCoC;
    }

    void main() {
      vec2 texel = 1.0 / uResolution;
      float cCoc = coc(vUv);
      vec3 center = texture2D(tDiffuse, vUv).rgb;
      if (cCoc < 1.0) { gl_FragColor = vec4(center, 1.0); return; }

      // Golden-angle spiral gather with bright-sample weighting for bokeh punch.
      vec3 sum = center * 0.35;
      float wsum = 0.35;
      float GA = 2.39996323;
      for (int i = 0; i < 48; i++) {
        if (i >= uSamples) break;
        float fi = float(i) + 0.5;
        float a = fi * GA;
        float rr = sqrt(fi / float(uSamples));
        vec2 off = vec2(cos(a), sin(a)) * rr * cCoc * texel;
        vec2 suv = clamp(vUv + off, vec2(0.001), vec2(0.999));
        vec3 s = texture2D(tDiffuse, suv).rgb;
        float sc = coc(suv);
        // Only let samples bleed in if they are at least as blurry as us.
        float w = clamp(sc / max(cCoc, 0.001), 0.15, 1.0);
        w *= 1.0 + smoothstep(1.0, 3.0, luma(s)) * uHighlight;
        sum += s * w;
        wsum += w;
      }
      gl_FragColor = vec4(sum / wsum, 1.0);
    }
  `},Zx={uniforms:{tDiffuse:{value:null},uMax:{value:12}},vertexShader:Mr.vertexShader,fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    ${ko}
    void main() {
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      float l = luma( c );
      // Soft roll-off rather than a hard clip so highlight shape survives.
      float k = l > uMax ? uMax / max( l, 1e-4 ) : 1.0;
      c *= mix( 1.0, k, 0.92 );
      gl_FragColor = vec4( min( c, vec3( uMax * 1.6 ) ), 1.0 );
    }
  `};class Jx extends Di{rtA;rtB;bright;blur;comp;quad=new xr;strength=.5;threshold=1.15;tint=new A(.42,.62,1);constructor(e,t){super();const n={type:Vt,depthBuffer:!1,stencilBuffer:!1};this.rtA=new Pt(Math.max(2,e>>2),Math.max(2,t>>2),n),this.rtB=new Pt(Math.max(2,e>>2),Math.max(2,t>>2),n);const s=Mr.vertexShader;this.bright=new ft({uniforms:{tDiffuse:{value:null},uThreshold:{value:1.15}},vertexShader:s,fragmentShader:`
        uniform sampler2D tDiffuse; uniform float uThreshold; varying vec2 vUv;
        ${ko}
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = luma(c);
          gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 1.1, l), 1.0);
        }`}),this.blur=new ft({uniforms:{tDiffuse:{value:null},uStep:{value:new ae(1,0)}},vertexShader:s,fragmentShader:`
        uniform sampler2D tDiffuse; uniform vec2 uStep; varying vec2 vUv;
        void main() {
          vec3 c = vec3(0.0); float w = 0.0;
          for (int i = -8; i <= 8; i++) {
            float fi = float(i);
            float k = exp(-fi * fi / 26.0);
            c += texture2D(tDiffuse, vUv + uStep * fi).rgb * k;
            w += k;
          }
          gl_FragColor = vec4(c / w, 1.0);
        }`}),this.comp=new ft({uniforms:{tDiffuse:{value:null},tStreak:{value:null},uStrength:{value:.5},uTint:{value:this.tint}},vertexShader:s,fragmentShader:`
        uniform sampler2D tDiffuse, tStreak; uniform float uStrength; uniform vec3 uTint; varying vec2 vUv;
        void main() {
          vec3 base = texture2D(tDiffuse, vUv).rgb;
          vec3 s = texture2D(tStreak, vUv).rgb;
          gl_FragColor = vec4(base + s * uTint * uStrength, 1.0);
        }`,transparent:!1}),this.needsSwap=!0}setSize(e,t){this.rtA.setSize(Math.max(2,e>>2),Math.max(2,t>>2)),this.rtB.setSize(Math.max(2,e>>2),Math.max(2,t>>2))}draw(e,t,n){this.quad.material=t,e.setRenderTarget(n),this.quad.render(e)}render(e,t,n){this.bright.uniforms.tDiffuse.value=n.texture,this.bright.uniforms.uThreshold.value=this.threshold,this.draw(e,this.bright,this.rtA);const s=this.rtA.width;this.blur.uniforms.tDiffuse.value=this.rtA.texture,this.blur.uniforms.uStep.value.set(2/s,0),this.draw(e,this.blur,this.rtB),this.blur.uniforms.tDiffuse.value=this.rtB.texture,this.blur.uniforms.uStep.value.set(7/s,0),this.draw(e,this.blur,this.rtA),this.blur.uniforms.tDiffuse.value=this.rtA.texture,this.blur.uniforms.uStep.value.set(19/s,0),this.draw(e,this.blur,this.rtB),this.comp.uniforms.tDiffuse.value=n.texture,this.comp.uniforms.tStreak.value=this.rtB.texture,this.comp.uniforms.uStrength.value=this.strength,this.draw(e,this.comp,this.renderToScreen?null:t)}dispose(){this.rtA.dispose(),this.rtB.dispose(),this.quad.dispose()}}const jx={uniforms:{tDiffuse:{value:null}},vertexShader:Mr.vertexShader,fragmentShader:`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { gl_FragColor = texture2D( tDiffuse, vUv ); }
  `};class Fh{composer;renderPass;gtao;dof;depthProvider;bloom;clamp;copy;streak;grade;smaa;target;q;renderer;size=new ae(1,1);focusDistance=6;focusTarget=6;focusSpeed=3.4;aperture=.65;constructor(e,t,n,s,r,o){this.renderer=e,this.q=s,this.size.set(r,o),this.target=new Pt(r,o,{type:s.hdr===!1?cn:Vt,samples:0}),this.composer=new kx(e,this.target),this.composer.setPixelRatio(1),this.composer.setSize(r,o),this.renderPass=new Fx(t,n),this.composer.addPass(this.renderPass),s.ao&&(this.gtao=new Un(t,n,r,o),this.gtao.output=Un.OUTPUT.Default,this.gtao.updateGtaoMaterial({radius:.32,distanceExponent:1.4,thickness:.35,scale:1.15,samples:s.aoQuality==="High"?24:14,screenSpaceRadius:!1}),this.gtao.blendIntensity=.95,this.composer.addPass(this.gtao)),s.dof&&(this.depthProvider=new qx(r,o,.5),this.dof=new er(Kx),this.dof.uniforms.tDepth.value=this.depthProvider.texture,this.dof.uniforms.uNear.value=n.near,this.dof.uniforms.uFar.value=n.far,this.dof.uniforms.uSamples.value=s.dofSamples,this.dof.uniforms.uResolution.value.set(r,o),this.composer.addPass(this.dof)),this.clamp=new er(Zx),this.composer.addPass(this.clamp),s.bloom&&(this.bloom=new Cs(new ae(r,o),.42,.78,1.05),this.composer.addPass(this.bloom)),s.anamorphic&&(this.streak=new Jx(r,o),this.streak.strength=.34,this.composer.addPass(this.streak)),this.grade=new er(Mr),this.grade.uniforms.uResolution.value.set(r,o),this.composer.addPass(this.grade),s.smaa&&(this.smaa=new Wx,this.composer.addPass(this.smaa)),this.copy=new er(jx),this.copy.enabled=!1,this.composer.addPass(this.copy),this.debugStage=-1}set debugStage(e){const t=this.composer.passes,n=t.indexOf(this.copy);for(let s=0;s<t.length;s++)t[s].renderToScreen=!1,s!==n&&(t[s].enabled=e<0?!0:s<=e);if(e<0){this.copy.enabled=!1;for(let s=n-1;s>=0;s--)if(t[s].enabled){t[s].renderToScreen=!0;break}}else this.copy.enabled=!0,this.copy.renderToScreen=!0}get passNames(){return this.composer.passes.map((e,t)=>`${t}:${e.constructor.name}`)}setCamera(e){this.renderPass.camera=e,this.gtao&&(this.gtao.camera=e),this.dof&&(this.dof.uniforms.uNear.value=e.near,this.dof.uniforms.uFar.value=e.far)}setScene(e){this.renderPass.scene=e,this.gtao&&(this.gtao.scene=e)}setSize(e,t){this.size.set(e,t),this.composer.setPixelRatio(1),this.composer.setSize(e,t),this.dof&&this.depthProvider&&(this.depthProvider.setSize(e,t),this.dof.uniforms.tDepth.value=this.depthProvider.texture,this.dof.uniforms.uResolution.value.set(e,t)),this.grade.uniforms.uResolution.value.set(e,t),this.gtao?.setSize(e,t),this.streak?.setSize(e,t)}update(e,t){this.focusDistance=Jt(this.focusDistance,this.focusTarget,this.focusSpeed,e),this.dof&&(this.dof.uniforms.uFocus.value=this.focusDistance,this.dof.uniforms.uAperture.value=this.aperture,this.dof.uniforms.uMaxCoC.value=we(this.size.y/78,6,18)),this.grade.uniforms.uTime.value=t}set wetLens(e){this.grade.uniforms.uWetLens.value=e}set flash(e){this.grade.uniforms.uFlash.value=e}set desat(e){this.grade.uniforms.uDesat.value=e}set glitch(e){this.grade.uniforms.uGlitch.value=e}setBloom(e,t=.78,n=1.05){this.bloom&&(this.bloom.strength=e,this.bloom.radius=t,this.bloom.threshold=n)}set highlightCeiling(e){this.clamp.uniforms.uMax.value=e}setStreak(e,t){this.streak&&(this.streak.strength=e,t&&this.streak.tint.copy(t))}applyLook(e){for(const[t,n]of Object.entries(e)){const s=this.grade.uniforms[t];s&&(n instanceof A&&s.value instanceof A?s.value.copy(n):typeof n=="number"&&(s.value=n))}}render(){if(this.depthProvider){const e=new pe;this.renderer.getClearColor(e);const t=this.renderer.getClearAlpha();this.depthProvider.render(this.renderer,this.renderPass.scene,this.renderPass.camera),this.renderer.setClearColor(e,t)}this.composer.render()}dispose(){this.composer.dispose(),this.target.dispose(),this.streak?.dispose(),this.depthProvider?.dispose()}get quality(){return this.q}get rendererRef(){return this.renderer}}const Qx={cinema:{name:"cinema",label:"CINEMA",scale:1,maxPixelRatio:2,shadowMapSize:2048,softShadows:!0,ao:!0,aoQuality:"High",bloom:!0,anamorphic:!0,dof:!0,dofSamples:32,ssr:!0,reflectionScale:.7,volumetrics:!0,volumetricSteps:36,rainCount:8e3,splashCount:420,smaa:!0,textureSize:512,characterSegments:1,fillLights:!0,hdr:!0},high:{name:"high",label:"HIGH",scale:1,maxPixelRatio:1.75,shadowMapSize:2048,softShadows:!0,ao:!0,aoQuality:"Medium",bloom:!0,anamorphic:!0,dof:!0,dofSamples:20,ssr:!0,reflectionScale:.55,volumetrics:!0,volumetricSteps:24,rainCount:5200,splashCount:260,smaa:!0,textureSize:512,characterSegments:1,fillLights:!0,hdr:!0},medium:{name:"medium",label:"MEDIUM",scale:.85,maxPixelRatio:1.5,shadowMapSize:1024,softShadows:!0,ao:!1,aoQuality:"Low",bloom:!0,anamorphic:!1,dof:!0,dofSamples:12,ssr:!0,reflectionScale:.4,volumetrics:!0,volumetricSteps:14,rainCount:3e3,splashCount:140,smaa:!1,textureSize:256,characterSegments:.8,fillLights:!0,hdr:!0},low:{name:"low",label:"PERFORMANCE",scale:.7,maxPixelRatio:1,shadowMapSize:512,softShadows:!1,ao:!1,aoQuality:"Low",bloom:!0,anamorphic:!1,dof:!1,dofSamples:8,ssr:!1,reflectionScale:.3,volumetrics:!1,volumetricSteps:8,rainCount:1600,splashCount:60,smaa:!1,textureSize:256,characterSegments:.6,fillLights:!1,hdr:!0}},Ia=["cinema","high","medium","low"];function Bh(i){return{...Qx[i]}}function $x(){const i=document.createElement("canvas").getContext("webgl2");if(!i)return"low";const e=i.getExtension("WEBGL_debug_renderer_info"),t=e?String(i.getParameter(e.UNMASKED_RENDERER_WEBGL)):"";if(/swiftshader|software|llvmpipe|mesa offscreen/i.test(t))return"medium";const s=navigator.hardwareConcurrency??4;return/rtx|radeon rx|apple m[1-9]|arc a/i.test(t)&&s>=8?"cinema":s>=8?"high":"medium"}const Hh=new Map;function gn(i,e){const t=Hh.get(i);if(t)return t;const n=e();return Hh.set(i,n),n}function Ps(i,e){const t=document.createElement("canvas");t.width=i,t.height=e;const n=t.getContext("2d",{willReadFrequently:!0});return{c:t,ctx:n}}function Ls(i,e={}){const t=new Su(i);t.wrapS=t.wrapT=mn,t.colorSpace=e.srgb?dn:li;const n=e.repeat??1;return t.repeat.set(n,n),t.anisotropy=e.aniso??8,t.generateMipmaps=!0,t.minFilter=Ti,t.needsUpdate=!0,t}function Vn(i,e,t,n=1){const{c:s,ctx:r}=Ps(i,i),o=r.createImageData(i,i),a=o.data;for(let l=0;l<i;l++)for(let c=0;c<i;c++){const h=(l*i+c)*4,[d,u,f,m]=e(c/i,l/i,c,l);a[h]=we(d)*255,a[h+1]=we(u)*255,a[h+2]=we(f)*255,a[h+3]=(m===void 0?1:we(m))*255}return r.putImageData(o,0,0),Ls(s,{srgb:t,repeat:n})}function tn(i,e){const t=new Float32Array(i*i);for(let n=0;n<i;n++)for(let s=0;s<i;s++)t[n*i+s]=e(s/i,n/i);return t}function ti(i,e,t=2.2){const{c:n,ctx:s}=Ps(e,e),r=s.createImageData(e,e),o=r.data,a=(l,c)=>i[(c%e+e)%e*e+(l%e+e)%e];for(let l=0;l<e;l++)for(let c=0;c<e;c++){const h=a(c+1,l-1)+2*a(c+1,l)+a(c+1,l+1)-(a(c-1,l-1)+2*a(c-1,l)+a(c-1,l+1)),d=a(c-1,l+1)+2*a(c,l+1)+a(c+1,l+1)-(a(c-1,l-1)+2*a(c,l-1)+a(c+1,l-1));let u=-h*t,f=-d*t,m=1;const x=Math.hypot(u,f,m)||1;u/=x,f/=x,m/=x;const g=(l*e+c)*4;o[g]=(u*.5+.5)*255,o[g+1]=(f*.5+.5)*255,o[g+2]=(m*.5+.5)*255,o[g+3]=255}return s.putImageData(r,0,0),Ls(n)}function Ii(i,e,t=0,n=1){const{c:s,ctx:r}=Ps(e,e),o=r.createImageData(e,e),a=o.data;for(let l=0;l<e*e;l++){const c=we(Ge(t,n,i[l]))*255;a[l*4]=a[l*4+1]=a[l*4+2]=c,a[l*4+3]=255}return r.putImageData(o,0,0),Ls(s)}function ic(i=512){return gn(`asphalt${i}`,()=>{const e=(l,c)=>ct(l*190,c*190,5)*.5+.5,t=(l,c)=>1-Yi(l*46,c*46,46),n=(l,c)=>gt(.72,.99,Zu(l*5.2,c*5.2,4)),s=(l,c)=>ct(l*3.1+11,c*3.1-5,3)*.5+.5,r=tn(i,(l,c)=>{const h=t(l,c);return we(.5+(e(l,c)-.5)*.55+h*.3-n(l,c)*.75)}),o=Vn(i,(l,c)=>{const h=e(l,c),d=s(l,c),u=n(l,c);let f=Ge(.036,.075,h)+t(l,c)*.03;f=Ge(f,f*.62,gt(.62,.86,d));const m=gt(.78,1,ct(l*2.2-30,c*2.2+8,3)*.5+.5),x=Ge(f,f*.7+.02,m)*(1-u*.55);return[x*1.02,x*1,x*1.06+m*.02]},!0,1),a=tn(i,(l,c)=>{const h=gt(.45,.86,ct(l*2.6+60,c*2.6,3)*.5+.5);return we(Ge(.92,.34,h)-t(l,c)*.06+n(l,c)*.05)});return{map:o,normalMap:ti(r,i,1.5),roughnessMap:Ii(a,i)}})}function Ju(i=512,e=.1){return gn(`concrete${i}_${e}`,()=>{const t=tn(i,(r,o)=>{const a=gt(.55,.95,1-Yi(r*30,o*30,30))*.5;return we(.55+ct(r*96,o*96,5)*.28-a*.6+Os(r*420,o*420)*.06)}),n=Vn(i,(r,o)=>{const a=ct(r*7,o*7,5)*.5+.5,l=gt(.5,1,ct(r*2.4,o*5.5+40,4)*.5+.5),c=gt(.62,1,ct(r*26,o*1.6+9,3)*.5+.5)*gt(.1,.6,o);let h=e+a*.09-l*.05-c*.045;return h=we(h,.012,.9),[h*1.03,h,h*.96]},!0),s=tn(i,(r,o)=>we(.74+ct(r*40,o*40,3)*.16));return{map:n,normalMap:ti(t,i,1.1),roughnessMap:Ii(s,i)}})}function ju(i=512){return gn(`brick${i}`,()=>{const n=(l,c)=>{const h=c*16,d=Math.floor(h),u=d%2?.5:0,f=(l+u)*8,m=Math.floor(f);return{fx:f-m,fy:h-d,id:m*73856093^d*19349663}},s=(l,c)=>{const{fx:h,fy:d}=n(l,c),u=.055,f=Math.min(h,1-h),m=Math.min(d,1-d)*(16/8);return 1-gt(0,u,Math.min(f,m))},r=tn(i,(l,c)=>{const h=s(l,c),{id:d}=n(l,c),f=new $t(d>>>0).next()*.1;return we(.72-h*.62+ct(l*130,c*130,4)*.12+f*(1-h))}),o=Vn(i,(l,c)=>{const h=s(l,c),{id:d}=n(l,c),f=new $t(d>>>0).next(),m=gt(.35,1,ct(l*3.4,c*3.4+17,4)*.5+.5);let x=Ge(.16,.29,f),g=Ge(.07,.12,f),p=Ge(.055,.09,f);const T=ct(l*150,c*150,3)*.04;x+=T,g+=T,p+=T;const b=.13+ct(l*90,c*90,3)*.03;x=Ge(x,b,h),g=Ge(g,b*1,h),p=Ge(p,b*.98,h);const w=1-m*.45;return[x*w,g*w,p*w]},!0),a=tn(i,(l,c)=>we(.82-s(l,c)*.05+ct(l*60,c*60,3)*.1));return{map:o,normalMap:ti(r,i,1.9),roughnessMap:Ii(a,i)}})}function Qu(i=512,e=4){return gn(`tile${i}_${e}`,()=>{const t=(o,a)=>{const l=o*e%1,c=a*e%1,h=Math.min(Math.min(l,1-l),Math.min(c,1-c));return 1-gt(0,.012,h)},n=tn(i,(o,a)=>we(.8-t(o,a)*.8+ct(o*200,a*200,3)*.04)),s=Vn(i,(o,a)=>{const l=t(o,a),c=gt(.55,.95,Zu(o*8+3,a*8,5));let d=.1+(ct(o*16,a*16,4)*.5+.5)*.055+c*.085;return d=Ge(d,.035,l),[d*1,d*1.02,d*1.1]},!0),r=tn(i,(o,a)=>we(.16+t(o,a)*.55+ct(o*70,a*70,3)*.07));return{map:s,normalMap:ti(n,i,1),roughnessMap:Ii(r,i)}})}function sc(i=256,e=.2,t=.2,n=.24,s=120){return gn(`fabric${i}_${e}_${t}_${n}_${s}`,()=>{const r=(c,h)=>{const d=Math.sin(c*s*Math.PI)*.5+.5,u=Math.sin(h*s*Math.PI)*.5+.5;return d*.5+u*.5},o=tn(i,(c,h)=>we(r(c,h)*.8+ct(c*220,h*220,3)*.2)),a=Vn(i,(c,h)=>{const d=.86+r(c,h)*.22+ct(c*90,h*90,3)*.07,u=gt(.85,1,Os(c*300,h*300)*.5+.5)*.1;return[e*d+u,t*d+u,n*d+u]},!0),l=tn(i,(c,h)=>we(.86-r(c,h)*.07));return{map:a,normalMap:ti(o,i,1.3),roughnessMap:Ii(l,i)}})}function rc(i=512,e=.32){return gn(`metal${i}_${e}`,()=>{const t=(o,a)=>Os(o*900,a*12)*.5+.5,n=tn(i,(o,a)=>we(.6+(t(o,a)-.5)*.25+ct(o*60,a*60,3)*.1)),s=Vn(i,(o,a)=>{const l=e*(.9+(t(o,a)-.5)*.16),c=gt(.7,1,ct(o*24,a*24,4)*.5+.5)*.06;return[l+c,l+c*1.02,l*1.05+c]},!0),r=tn(i,(o,a)=>we(.3+(t(o,a)-.5)*.22+gt(.62,1,ct(o*15,a*15,3)*.5+.5)*.4));return{map:s,normalMap:ti(n,i,.8),roughnessMap:Ii(r,i)}})}function $u(i=512,e=1){return gn(`wood${i}_${e}`,()=>{const t=(o,a)=>{const l=ct(o*3,a*.6,3)*.6;return Math.sin((a*26+l*9)*Math.PI)*.5+.5},n=tn(i,(o,a)=>we(.6+(t(o,a)-.5)*.3+Os(o*400,a*60)*.1)),s=Vn(i,(o,a)=>{const l=t(o,a),c=gt(.86,1,1-Yi(o*4,a*4,4)),h=Ge(.11,.2,l)*e,d=Ge(.055,.1,l)*e,u=Ge(.03,.06,l),f=1-c*.4;return[h*f,d*f,u*f]},!0),r=tn(i,(o,a)=>we(.42+(1-t(o,a))*.16+ct(o*50,a*50,3)*.08));return{map:s,normalMap:ti(n,i,.9),roughnessMap:Ii(r,i)}})}function ed(i=512,e=[.68,.47,.4]){return gn(`skin${i}_${e.join("_")}`,()=>{const t=tn(i,(r,o)=>{const a=1-Yi(r*190,o*190,190),l=ct(r*300,o*300,3)*.5+.5;return we(.62-a*.28+l*.16)}),n=Vn(i,(r,o)=>{const a=ct(r*9,o*9,4)*.5+.5,l=gt(.55,1,ct(r*4+22,o*4,3)*.5+.5),c=(1-Yi(r*190,o*190,190))*.05,h=.94+a*.11-c;return[e[0]*h+l*.055,e[1]*h*(1-l*.05),e[2]*h*(1-l*.055)]},!0),s=tn(i,(r,o)=>{const a=gt(.5,1,ct(r*6+4,o*6,3)*.5+.5);return we(.62-a*.2+ct(r*120,o*120,3)*.07)});return{map:n,normalMap:ti(t,i,.55),roughnessMap:Ii(s,i)}})}function td(i){const e=i.size??1024,t=`face_${JSON.stringify(i)}_${e}`;return gn(t,()=>{const{c:n,ctx:s}=Ps(e,e),r=i.tone,o=i.aspect??2.1,a=S=>S*e,l=S=>(1-S)*e,c=i.uvl,h=(S,M)=>c[S]??M,d=i.age??30,u=(S,M,y,v=1)=>`rgba(${Math.round(we(S)*255)},${Math.round(we(M)*255)},${Math.round(we(y)*255)},${v})`,f=s.createImageData(e,e),m=f.data;for(let S=0;S<e;S++)for(let M=0;M<e;M++){const y=M/e,v=1-S/e,E=ct(y*11*o,v*11,4)*.5+.5,C=ct(y*90*o,v*90,3)*.5+.5,P=(1-Yi(y*200*o,v*200,200))*.05;let D=.93+E*.11+(C-.5)*.05-P;const N=ye(y-.42,.05)*ye(v-.42,.06),z=ye(y-.58,.05)*ye(v-.42,.06),I=ye(y-.5,.03)*ye(v-.36,.05),V=ye(y-.5,.05)*ye(v-.12,.05),O=we((N+z)*.9+I*.7+V*.35),G=ye(v-.66,.1)*ye(y-.5,.14),q=(S*e+M)*4;m[q]=we(r[0]*D+O*.09-G*.01)*255,m[q+1]=we(r[1]*D*(1-O*.06)+G*.004)*255,m[q+2]=we(r[2]*D*(1-O*.07)+G*.012)*255,m[q+3]=255}s.putImageData(f,0,0);for(const S of["L","R"]){const[M,y]=h(`eye${S}`,[S==="L"?.442:.558,.455]),v=.052,E=.03,C=s.createRadialGradient(a(M),l(y),1,a(M),l(y),a(v*1.9));C.addColorStop(0,u(r[0]*.6,r[1]*.52,r[2]*.55,.5)),C.addColorStop(.55,u(r[0]*.78,r[1]*.72,r[2]*.74,.25)),C.addColorStop(1,u(r[0],r[1],r[2],0)),s.fillStyle=C,s.fillRect(a(M-v*2),l(y+E*3),a(v*4),a(E*6)),s.save(),s.beginPath(),s.ellipse(a(M),l(y+E*.15),a(v*.95),a(E*.62),0,Math.PI,Math.PI*2),s.strokeStyle=u(.06,.04,.04,i.female?.85:.6),s.lineWidth=e*(i.female?.0055:.004),s.stroke(),s.restore(),s.beginPath(),s.ellipse(a(M),l(y+E*.5),a(v*.9),a(E*1),0,Math.PI*1.08,Math.PI*1.92),s.strokeStyle=u(r[0]*.62,r[1]*.55,r[2]*.58,.4),s.lineWidth=e*.0022,s.stroke()}{const S=new pe(i.browColor??1708560),M=(i.browThickness??1)*(i.female?.72:1.05);for(const y of["L","R"]){const[v,E]=h(`brow${y}`,[y==="L"?.44:.56,.52]),C=y==="L"?-1:1,P=new $t(y==="L"?991:992);for(let D=0;D<260;D++){const N=P.next(),z=(N-.42)*.088*C,I=-Math.pow(N-.45,2)*.06+.012,V=P.normal(0,.0042)*M,O=a(v+z),G=l(E+I+V),q=e*(.006+P.next()*.008),re=C*(.5+(N-.5)*1.6)+P.normal(0,.25);s.strokeStyle=u(S.r*(.7+P.next()*.5),S.g*(.7+P.next()*.5),S.b*(.7+P.next()*.5),.55),s.lineWidth=e*.0016,s.beginPath(),s.moveTo(O,G),s.lineTo(O+Math.cos(re)*q,G-Math.sin(re)*q*.5),s.stroke()}}}{const[S,M]=h("mouth",[.5,.19]),[y]=h("mouthL",[.462,.19]),[v]=h("mouthR",[.538,.19]),E=Math.max(.03,Math.abs(v-y)*.5),C=i.lipTint??(i.female?[r[0]*.88,r[1]*.52,r[2]*.52]:[r[0]*.86,r[1]*.66,r[2]*.64]),P=.019*(i.female?1.12:.95),D=.023*(i.female?1.15:1);s.save(),s.beginPath(),s.moveTo(a(S-E),l(M)),s.bezierCurveTo(a(S-E*.55),l(M+P*1.15),a(S-E*.2),l(M+P*.95),a(S),l(M+P*.5)),s.bezierCurveTo(a(S+E*.2),l(M+P*.95),a(S+E*.55),l(M+P*1.15),a(S+E),l(M)),s.bezierCurveTo(a(S+E*.5),l(M-P*.12),a(S-E*.5),l(M-P*.12),a(S-E),l(M)),s.closePath();const N=s.createLinearGradient(0,l(M+P),0,l(M));N.addColorStop(0,u(C[0]*.92,C[1]*.92,C[2]*.95,.9)),N.addColorStop(1,u(C[0]*.7,C[1]*.66,C[2]*.7,.95)),s.fillStyle=N,s.fill(),s.beginPath(),s.moveTo(a(S-E*.94),l(M)),s.bezierCurveTo(a(S-E*.6),l(M-D*1.25),a(S+E*.6),l(M-D*1.25),a(S+E*.94),l(M)),s.bezierCurveTo(a(S+E*.4),l(M+D*.1),a(S-E*.4),l(M+D*.1),a(S-E*.94),l(M)),s.closePath();const z=s.createLinearGradient(0,l(M-D),0,l(M));z.addColorStop(0,u(C[0]*1.05,C[1]*1,C[2]*1,.85)),z.addColorStop(1,u(C[0]*.8,C[1]*.7,C[2]*.72,.95)),s.fillStyle=z,s.fill(),s.beginPath(),s.moveTo(a(S-E),l(M)),s.bezierCurveTo(a(S-E*.4),l(M+P*.26),a(S-E*.14),l(M+P*.1),a(S),l(M+P*.16)),s.bezierCurveTo(a(S+E*.14),l(M+P*.1),a(S+E*.4),l(M+P*.26),a(S+E),l(M)),s.strokeStyle=u(C[0]*.4,C[1]*.3,C[2]*.32,.85),s.lineWidth=e*.0028,s.stroke();const I=new $t(555);for(let V=0;V<90;V++){const O=I.next()*2-1,G=a(S+O*E*.92),q=l(M-D*(.9-Math.abs(O)*.5)*I.range(.3,1)),re=l(M+P*(.8-Math.abs(O)*.4)*I.range(.2,.9));s.strokeStyle=u(C[0]*.6,C[1]*.45,C[2]*.48,.16),s.lineWidth=e*.0014,s.beginPath(),s.moveTo(G,q),s.lineTo(G+e*.002*(I.next()-.5),re),s.stroke()}s.restore();for(const V of[-1,1]){const O=s.createRadialGradient(a(S+V*E),l(M),1,a(S+V*E),l(M),e*.022);O.addColorStop(0,u(r[0]*.5,r[1]*.42,r[2]*.44,.55)),O.addColorStop(1,u(r[0],r[1],r[2],0)),s.fillStyle=O,s.fillRect(a(S+V*E)-e*.03,l(M)-e*.03,e*.06,e*.06)}}{const[S,M]=h("noseBase",[.5,.3]);for(const v of[-1,1])s.save(),s.beginPath(),s.ellipse(a(S+v*.017),l(M+.004),a(.009),a(.006),v*.5,0,Math.PI*2),s.fillStyle=u(r[0]*.22,r[1]*.16,r[2]*.17,.9),s.fill(),s.restore();const y=s.createRadialGradient(a(S),l(M-.004),1,a(S),l(M-.004),e*.03);y.addColorStop(0,u(r[0]*.62,r[1]*.54,r[2]*.56,.4)),y.addColorStop(1,u(r[0],r[1],r[2],0)),s.fillStyle=y,s.fillRect(a(S)-e*.04,l(M)-e*.04,e*.08,e*.08)}if((i.stubble??0)>.01){const S=i.stubble,[,M]=h("chin",[.5,.06]),[,y]=h("mouth",[.5,.19]),v=new $t(1234);s.save();for(let E=0;E<Math.round(9e3*S);E++){const C=.5+v.normal(0,.055),P=Ge(M-.02,y+.055,Math.pow(v.next(),.7));if(Math.abs(P-y)<.028&&Math.abs(C-.5)<.04)continue;const N=ye(C-.5,.062)*gt(y+.075,y-.02,P);v.next()>N*1.2||(s.fillStyle=u(.16,.13,.13,.35*S),s.fillRect(a(C),l(P),e*.0022,e*.0022))}s.restore()}if(d>38){const S=gt(38,68,d),M=new $t(4321);s.save(),s.strokeStyle=u(r[0]*.62,r[1]*.54,r[2]*.56,.3*S),s.lineWidth=e*.0016;for(let y=0;y<3;y++){const v=.6+y*.032;s.beginPath();for(let E=0;E<=20;E++){const C=.42+E/20*.16,P=l(v+Math.sin(E*.9+y)*.0025);E===0?s.moveTo(a(C),P):s.lineTo(a(C),P)}s.stroke()}for(const y of["L","R"]){const[v,E]=h(`eye${y}`,[y==="L"?.442:.558,.455]),C=y==="L"?-1:1;for(let P=0;P<3;P++)s.beginPath(),s.moveTo(a(v+C*.05),l(E+.004-P*.008)),s.lineTo(a(v+C*(.07+M.next()*.01)),l(E+.012-P*.014)),s.stroke();s.beginPath(),s.moveTo(a(v+C*.008),l(.3)),s.quadraticCurveTo(a(v+C*.03),l(.24),a(v+C*.026),l(.16)),s.stroke()}s.restore()}const x=Ls(n,{srgb:!0});x.wrapS=x.wrapT=mn;const g=Ps(e>>1,e>>1);{const S=e>>1,M=g.ctx.createImageData(S,S),y=M.data,[v,E]=h("mouth",[.5,.19]);for(let C=0;C<S;C++)for(let P=0;P<S;P++){const D=P/S,N=1-C/S,z=ye(D-.5,.035)*gt(.28,.66,N)+ye(N-.6,.06)*ye(D-.5,.09),I=ye(D-v,.035)*ye(N-E,.02),V=ct(D*60*o,N*60,3)*.5+.5;let O=.62-z*.16-I*.34+(V-.5)*.08;y[(C*S+P)*4]=y[(C*S+P)*4+1]=y[(C*S+P)*4+2]=we(O)*255,y[(C*S+P)*4+3]=255}g.ctx.putImageData(M,0,0)}const p=Ls(g.c),T=e>>1,b=tn(T,(S,M)=>{const y=1-Yi(S*210*o,M*210,210),v=ct(S*340*o,M*340,3)*.5+.5,E=ye(S-.5,.05)*ye(M-(c.mouth?.[1]??.19),.02);return we(.62-y*.3+v*.16+E*.1)}),w=ti(b,T,.5);return{map:x,normalMap:w,roughnessMap:p}})}function Fo(i=128,e=2.2,t=0){return gn(`radial${i}_${e}_${t}`,()=>Vn(i,(n,s)=>{const r=Math.hypot(n-.5,s-.5)*2;let o=Math.pow(we(1-r),e);return t>0&&(o=Math.max(o*.25,Math.pow(we(1-Math.abs(r-t)*6),3))),[1,1,1,o]},!0))}function Bo(i=256){return gn(`ripple${i}`,()=>{const e=new $t(4242),t=[];for(let s=0;s<22;s++)t.push([e.next(),e.next(),e.range(.05,.2)]);const n=tn(i,(s,r)=>{let o=.5;for(const[a,l,c]of t){let h=s-a,d=r-l;h>.5&&(h-=1),h<-.5&&(h+=1),d>.5&&(d-=1),d<-.5&&(d+=1);const u=Math.hypot(h,d);if(u<c){const f=u/c;o+=Math.sin(f*Math.PI*5)*(1-f)*.32}}return we(o)});return ti(n,i,1.6)})}function oc(i){const e=`sign_${JSON.stringify(i)}`;return gn(e,()=>{const t=i.w??512,n=i.h??256,{c:s,ctx:r}=Ps(t,n);r.fillStyle=i.bg??"#000000",r.fillRect(0,0,t,n);const o=i.color??"#7fe6ff";r.save(),i.vertical&&(r.translate(t/2,n/2),r.rotate(Math.PI/2),r.translate(-n/2,-t/2));const a=i.vertical?n:t,l=i.vertical?t:n,c=i.size??Math.floor(l*.42);r.font=`${i.font??"700"} ${c}px Inter, sans-serif`,r.textAlign="center",r.textBaseline="middle",r.shadowColor=o,r.shadowBlur=i.glowBlur??26,r.fillStyle=o;const h=i.sub?l*.4:l*.5;r.fillText(i.text,a/2,h),r.shadowBlur=6,r.fillStyle="#ffffff",r.fillText(i.text,a/2,h),i.sub&&(r.shadowBlur=14,r.fillStyle=o,r.font=`500 ${Math.floor(c*.34)}px Inter, sans-serif`,r.letterSpacing="6px",r.fillText(i.sub,a/2,l*.72)),i.border&&(r.strokeStyle=o,r.lineWidth=Math.max(2,l*.02),r.shadowBlur=20,r.strokeRect(l*.06,l*.06,a-l*.12,l-l*.12)),r.restore();const d=Ls(s,{srgb:!0});return d.wrapS=d.wrapT=Zn,d})}function Dl(i=512,e=14,t=26,n=.42,s=5){return gn(`wingrid${i}_${e}_${t}_${n}_${s}`,()=>{const r=new $t(s),o=[],a=[];for(let l=0;l<e*t;l++)o.push(r.chance(n)?r.range(.35,1):0),a.push(r.next());return Vn(i,(l,c)=>{const h=Math.floor(l*e),d=Math.floor(c*t),u=l*e-h,f=c*t-d,m=u>.16&&u<.84&&f>.22&&f<.78?1:0,x=d*e+h,g=o[x]*m;if(g<=0)return[0,0,0,1];const p=a[x],T=Ge(.55,1,p),b=Ge(.75,.86,p),w=Ge(1,.62,p),S=1;return[T*g*S,b*g*S,w*g*S,1]},!0)})}function nd(i=256){return gn(`grime${i}`,()=>Vn(i,(e,t)=>{const n=gt(.55,1,ct(e*30,t*2.2,4)*.5+.5),s=gt(.6,1,ct(e*6,t*6,3)*.5+.5);return[.6,.62,.66,we(n*.5+s*.35)*.5]},!0))}const e1=Object.freeze(Object.defineProperty({__proto__:null,asphalt:ic,brick:ju,concrete:Ju,fabric:sc,faceTexture:td,glassGrime:nd,metal:rc,radialSprite:Fo,rippleNormal:Bo,signTexture:oc,skin:ed,stoneTile:Qu,windowGrid:Dl,wood:$u},Symbol.toStringTag,{value:"Module"}));let zh=!1;function ac(){if(zh)return;zh=!0;const i="lights_physical_pars_fragment",e=st[i],t=/float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s+vec3 irradiance = dotNL \* directLight\.color;/;if(!t.test(e)){console.warn("[materials] subsurface patch did not match three shader chunk; skin will use standard diffuse");return}st[i]=e.replace(t,`
	float rawNL = dot( geometryNormal, directLight.direction );
	float dotNL = saturate( rawNL );

	#ifdef SSS_WRAP
		float wrapNL = saturate( ( rawNL + sssWrap ) / ( 1.0 + sssWrap ) );
		float term = smoothstep( 0.42, - sssWrap, rawNL );
		vec3 irradiance = wrapNL * directLight.color * mix( vec3( 1.0 ), sssColor, term );
	#else
		vec3 irradiance = dotNL * directLight.color;
	#endif
`)}function t1(i={}){ac();const e=i.tone??[.68,.47,.4],t=ed(i.size??512,e),n=new Xt({color:16777215,map:t.map,normalMap:t.normalMap,roughnessMap:t.roughnessMap,roughness:i.rough??.62,metalness:0,clearcoat:.12,clearcoatRoughness:.55,sheen:.11,sheenRoughness:.72,sheenColor:new pe(.9,.62,.55).convertSRGBToLinear(),normalScale:new ae(.55,.55)});n.map.repeat.set(1,1);const s=i.sss??[1,.42,.3];return n.defines={...n.defines??{},SSS_WRAP:""},n.onBeforeCompile=r=>{r.uniforms.sssWrap={value:i.wrap??.42},r.uniforms.sssColor={value:new A(s[0],s[1],s[2])},r.fragmentShader=`uniform float sssWrap;
uniform vec3 sssColor;
`+r.fragmentShader},n.customProgramCacheKey=()=>"skin_sss",n}function n1(i){ac();const e=td(i),t=new Xt({map:e.map,normalMap:e.normalMap,roughnessMap:e.roughnessMap,roughness:1,metalness:0,clearcoat:.12,clearcoatRoughness:.55,sheen:.1,sheenRoughness:.7,sheenColor:new pe(.9,.62,.55).convertSRGBToLinear(),normalScale:new ae(.5,.5)});return t.defines={...t.defines??{},SSS_WRAP:""},t.onBeforeCompile=n=>{n.uniforms.sssWrap={value:.4},n.uniforms.sssColor={value:new A(1,.4,.29)},n.fragmentShader=`uniform float sssWrap;
uniform vec3 sssColor;
`+n.fragmentShader},t.customProgramCacheKey=()=>"face_sss",t}function i1(i=15922936){return new Xt({color:new pe(i).convertSRGBToLinear(),roughness:.32,metalness:.04,clearcoat:.7,clearcoatRoughness:.14,iridescence:.22,iridescenceIOR:1.24,envMapIntensity:1.1})}function Ut(i,e={}){const t=sc(e.size??256,i[0],i[1],i[2],e.weave??140),n=e.repeat??3;for(const r of[t.map,t.normalMap,t.roughnessMap])r?.repeat.set(n,n);const s=new pe(i[0],i[1],i[2]).convertSRGBToLinear();return new Xt({color:16777215,map:t.map,normalMap:t.normalMap,roughnessMap:t.roughnessMap,roughness:e.rough??.86,metalness:0,sheen:Lc.lerp(.06,.3,Lc.clamp(e.sheen??.16,0,1)),sheenRoughness:.85,sheenColor:s.clone().lerp(new pe(.26,.28,.32),.55),specularIntensity:.32,normalScale:new ae(.7,.7)})}function id(i=1316892){const e=sc(256,.06,.06,.07,300);for(const t of[e.map,e.normalMap,e.roughnessMap])t?.repeat.set(4,4);return new Xt({color:new pe(i).convertSRGBToLinear(),normalMap:e.normalMap,roughnessMap:e.roughnessMap,roughness:.56,metalness:.02,clearcoat:.26,clearcoatRoughness:.34,normalScale:new ae(.5,.5)})}function ks(i,e=3){return new _n({color:0,emissive:new pe(i),emissiveIntensity:e,roughness:.4,metalness:0,toneMapped:!0})}function sd(i,e=2.2){return new _n({color:0,emissive:16777215,emissiveMap:i,emissiveIntensity:e,roughness:.28,metalness:0,transparent:!1})}function s1(i=726040,e=.24){return new Xt({color:new pe(i).convertSRGBToLinear(),roughness:.06,metalness:0,transparent:!0,opacity:e,transmission:.55,thickness:.35,ior:1.5,clearcoat:1,clearcoatRoughness:.04,side:Qt,depthWrite:!1})}function rd(i,e=.35){const t=rc(512,.4);for(const n of[t.normalMap,t.roughnessMap])n?.repeat.set(2,2);return new Xt({color:new pe(i).convertSRGBToLinear(),normalMap:t.normalMap,roughness:e,metalness:.55,clearcoat:.35,clearcoatRoughness:.25,normalScale:new ae(.25,.25)})}function vs(i,e={}){const t=e.repeat??1;for(const n of[i.map,i.normalMap,i.roughnessMap])n&&(n.repeat.set(t,t),n.wrapS=n.wrapT=mn);return new Xt({color:e.color!==void 0?new pe(e.color).convertSRGBToLinear():16777215,map:i.map,normalMap:i.normalMap,roughnessMap:i.roughnessMap,roughness:e.rough??1,metalness:e.metal??0,normalScale:new ae(e.normalScale??1,e.normalScale??1)})}class r1{renderer;canvas;fx;quality;qualityName;set=null;clock={time:0,dt:0,frame:0};deterministic=!1;fixedDt=1/30;raf=0;last=0;running=!1;resizeQueued=!0;onFrame;bypassPost=!1;fps=0;fpsAcc=0;fpsCount=0;constructor(e,t){this.canvas=e,this.qualityName=t??$x(),this.quality=Bh(this.qualityName),ac(),this.renderer=new Dx({canvas:e,antialias:!1,powerPreference:"high-performance",stencil:!1,alpha:!1,preserveDrawingBuffer:!0}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.quality.maxPixelRatio)*this.quality.scale),this.renderer.outputColorSpace=dn,this.renderer.toneMapping=Hn,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=tr,this.renderer.info.autoReset=!0,window.addEventListener("resize",()=>{this.resizeQueued=!0})}get width(){return this.canvas.clientWidth||window.innerWidth}get height(){return this.canvas.clientHeight||window.innerHeight}initPost(e,t){const n=this.renderer.getPixelRatio();this.fx=new Fh(this.renderer,e,t,this.quality,Math.floor(this.width*n),Math.floor(this.height*n))}setSet(e){this.set=e,this.fx?(this.fx.setScene(e.scene),this.fx.setCamera(e.camera)):this.initPost(e.scene,e.camera),e.applyLook?.(this.fx),this.resizeQueued=!0}doResize(){const e=this.width,t=this.height;this.renderer.setSize(e,t,!1);const n=this.renderer.getPixelRatio(),s=Math.max(2,Math.floor(e*n)),r=Math.max(2,Math.floor(t*n));this.fx?.setSize(s,r),this.set&&(this.set.camera.aspect=e/t,this.set.camera.updateProjectionMatrix()),this.resizeQueued=!1}setQuality(e,t){this.qualityName=e,this.quality=Bh(e),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.quality.maxPixelRatio)*this.quality.scale),this.fx?.dispose();const n=this.set;n&&(this.fx=new Fh(this.renderer,n.scene,n.camera,this.quality,Math.floor(this.width*this.renderer.getPixelRatio()),Math.floor(this.height*this.renderer.getPixelRatio())),n.applyLook?.(this.fx)),t()}warm(e,t=.1){const n=Math.max(1,Math.round(e/t));for(let s=0;s<n;s++)this.clock.time+=t,this.onFrame?.(t,this.clock.time),this.set?.update(t,this.clock.time),this.fx?.update(t,this.clock.time)}step(e){this.resizeQueued&&this.doResize();const t=Math.min(e,.1);this.clock.dt=t,this.clock.time+=t,this.clock.frame++,this.onFrame?.(t,this.clock.time);const n=this.set;n&&(n.update(t,this.clock.time),this.fx.update(t,this.clock.time),n.prerender?.(this.renderer,n.camera),this.bypassPost?(this.renderer.setRenderTarget(null),this.renderer.render(n.scene,n.camera)):this.fx.render())}start(){if(this.running)return;this.running=!0,this.last=performance.now();const e=()=>{if(!this.running)return;this.raf=requestAnimationFrame(e);const t=performance.now();let n=(t-this.last)/1e3;this.last=t,this.deterministic&&(n=this.fixedDt),n=Math.min(n,.1),this.fpsAcc+=n,this.fpsCount++,this.fpsAcc>.5&&(this.fps=this.fpsCount/this.fpsAcc,this.fpsAcc=0,this.fpsCount=0),this.step(n)};this.raf=requestAnimationFrame(e)}stop(){this.running=!1,cancelAnimationFrame(this.raf)}get isRunning(){return this.running}}const kt={TORSO:0,ARM_L:1,ARM_R:2,LEG_L:3,LEG_R:4,NECK:5,HEAD:6,HIPS:7};function lc(i){const e=i.height??(i.female?1.68:1.8),t=e/1.8,n=i.build??.45,s=i.female?1:0,r=(1+(n-.45)*.55)*t;return{H:e,s:t,build:n,fem:s,w:r,hipY:.53*e,spineY:.605*e,chestY:.72*e,neckY:.828*e,headY:.872*e,headCenterY:.938*e,shoulderY:.815*e,shoulderX:(.112-s*.009)*e*(.94+n*.14),elbowY:.625*e,wristY:.472*e,hipJointX:.049*e,kneeY:.285*e,ankleY:.048*e,neckR:(.029-s*.0045)*e*r,armR:(.0295-s*.003)*e*r,elbowR:.0255*e*r,wristR:.019*e*r,thighR:(.048+s*.004)*e*r,kneeR:.036*e*r,ankleR:.026*e*r,headW:(.0435-s*.0015)*e,headD:(.055-s*.0012)*e,headHi:(.066-s*.0012)*e}}function o1(i){const e=lc(i),t=[],n={},s=new Map,r=(u,f,m)=>{const x=new yu;if(x.name=u,f){const g=s.get(f.name);x.position.copy(m).sub(g),f.add(x)}else x.position.copy(m);return s.set(u,m.clone()),n[u]=x,t.push(x),x},o=(u,f,m=0)=>new A(u,f,m),a=r("hips",null,o(0,e.hipY,0)),l=r("spine",a,o(0,e.spineY,.004*e.H)),c=r("chest",l,o(0,e.chestY,.002*e.H)),h=r("neck",c,o(0,e.neckY,-.004*e.H)),d=r("head",h,o(0,e.headY,.002*e.H));r("jaw",d,o(0,e.headCenterY-.008*e.H,-.006*e.H)),r("eyeL",d,o(-.0165*e.H,e.headCenterY+.004*e.H,.038*e.H)),r("eyeR",d,o(.0165*e.H,e.headCenterY+.004*e.H,.038*e.H)),r("lidL",d,o(-.0165*e.H,e.headCenterY+.006*e.H,.038*e.H)),r("lidR",d,o(.0165*e.H,e.headCenterY+.006*e.H,.038*e.H)),r("browL",d,o(-.018*e.H,e.headCenterY+.016*e.H,.04*e.H)),r("browR",d,o(.018*e.H,e.headCenterY+.016*e.H,.04*e.H));for(const u of[-1,1]){const f=u<0?"L":"R",m=r(`shoulder${f}`,c,o(u*.03*e.H,e.shoulderY+.012*e.H,0)),x=r(`arm${f}`,m,o(u*e.shoulderX,e.shoulderY,0)),g=r(`foreArm${f}`,x,o(u*(e.shoulderX+.012*e.H),e.elbowY,-.006*e.H));r(`hand${f}`,g,o(u*(e.shoulderX+.02*e.H),e.wristY,.002*e.H));const p=r(`thigh${f}`,a,o(u*e.hipJointX,e.hipY-.01*e.H,0)),T=r(`shin${f}`,p,o(u*(e.hipJointX+.002*e.H),e.kneeY,.004*e.H)),b=r(`foot${f}`,T,o(u*(e.hipJointX+.001*e.H),e.ankleY,-.004*e.H));r(`toe${f}`,b,o(u*e.hipJointX,e.ankleY*.55,.075*e.H))}return a.updateMatrixWorld(!0),{root:a,bones:t,byName:n,restWorld:s,height:e.H,headCenter:new A(0,e.headCenterY,0),eyeHeight:e.headCenterY+.006*e.H}}function cc(){return{pos:[],uv:[],region:[],index:[]}}function Qn(i,e,t,n,s,r,o){return i.pos.push(e,t,n),i.uv.push(s,r),i.region.push(o),i.pos.length/3-1}function pr(i,e,t,n=!1){const s=e.length;for(let r=0;r<s;r++){const o=(r+1)%s,a=e[r],l=e[o],c=t[o],h=t[r];n?i.index.push(a,c,l,a,h,c):i.index.push(a,l,c,a,c,h)}}function od(i,e,t,n,s,r,o,a,l){const c=[],h=2/s;for(let d=0;d<o;d++){const u=d/o,f=u*Math.PI*2,m=Math.cos(f),x=Math.sin(f),g=t*Math.sign(m)*Math.pow(Math.abs(m),h),p=n*Math.sign(x)*Math.pow(Math.abs(x),h)+r;c.push(Qn(i,g,e,p,u,a,l))}return c}function lr(i,e,t,n,s,r=!0,o=!0,a=1){const l=[],c=new A(0,0,1);for(let d=0;d<e.length;d++){const u=e[d],f=new A;d===0?f.subVectors(e[1],e[0]):d===e.length-1?f.subVectors(e[d],e[d-1]):f.subVectors(e[d+1],e[d-1]),f.normalize();const m=new A().crossVectors(f,c);m.lengthSq()<1e-6&&m.set(1,0,0),m.normalize();const x=new A().crossVectors(m,f).normalize(),g=[];for(let p=0;p<n;p++){const T=p/n,b=T*Math.PI*2,w=t[d],S=m.clone().multiplyScalar(Math.cos(b)*w).add(x.clone().multiplyScalar(Math.sin(b)*w*a));g.push(Qn(i,u.x+S.x,u.y+S.y,u.z+S.z,T,d/(e.length-1),s))}l.push(g)}for(let d=0;d<l.length-1;d++)pr(i,l[d],l[d+1]);const h=(d,u,f)=>{const m=Qn(i,u.x,u.y,u.z,.5,f?0:1,s);for(let x=0;x<d.length;x++){const g=(x+1)%d.length;f?i.index.push(m,d[g],d[x]):i.index.push(m,d[x],d[g])}};r&&h(l[0],e[0].clone(),!0),o&&h(l[l.length-1],e[e.length-1].clone(),!1)}function hc(i){const e=i.getAttribute("position"),t=i.getIndex();if(!t)return;const n=new Int32Array(e.count);for(let l=0;l<n.length;l++)n[l]=l;const s=l=>{for(;n[l]!==l;)n[l]=n[n[l]],l=n[l];return l},r=(l,c)=>{const h=s(l),d=s(c);h!==d&&(n[d]=h)};for(let l=0;l<t.count;l+=3){const c=t.getX(l);r(c,t.getX(l+1)),r(c,t.getX(l+2))}const o=new Map;for(let l=0;l<t.count;l+=3){const c=t.getX(l),h=t.getX(l+1),d=t.getX(l+2),u=e.getX(c),f=e.getY(c),m=e.getZ(c),x=e.getX(h),g=e.getY(h),p=e.getZ(h),T=e.getX(d),b=e.getY(d),w=e.getZ(d),S=(u*(g*w-p*b)-f*(x*w-p*T)+m*(x*b-g*T))/6,M=s(c);o.set(M,(o.get(M)??0)+S)}const a=t.array;for(let l=0;l<t.count;l+=3){if((o.get(s(t.getX(l)))??0)>=0)continue;const c=a[l+1];a[l+1]=a[l+2],a[l+2]=c}t.needsUpdate=!0,i.computeVertexNormals()}function Vh(i,e,t){const n=[],s=[],r=new sr(i,!1,"catmullrom",.35),o=(i.length-1)*t;for(let a=0;a<=o;a++){const l=a/o;n.push(r.getPoint(l));const c=l*(i.length-1),h=Math.min(i.length-2,Math.floor(c));s.push(Ge(e[h],e[h+1],c-h))}return{pts:n,rad:s}}const ad=64,ld=60,a1=[{yn:1,w:.1,d:.16,cz:-.1,e:2},{yn:.92,w:.38,d:.45,cz:-.1,e:2},{yn:.8,w:.6,d:.66,cz:-.1,e:2.05},{yn:.62,w:.83,d:.85,cz:-.08,e:2.1},{yn:.42,w:.95,d:.93,cz:-.05,e:2.15},{yn:.22,w:1,d:.95,cz:-.03,e:2.2},{yn:.06,w:1,d:.94,cz:-.02,e:2.25},{yn:-.14,w:.98,d:.93,cz:.02,e:2.35},{yn:-.32,w:.93,d:.9,cz:.05,e:2.45},{yn:-.48,w:.86,d:.87,cz:.09,e:2.5},{yn:-.64,w:.78,d:.83,cz:.12,e:2.55},{yn:-.78,w:.66,d:.78,cz:.15,e:2.6},{yn:-.88,w:.54,d:.73,cz:.17,e:2.6},{yn:-.95,w:.42,d:.67,cz:.18,e:2.5},{yn:-1,w:.26,d:.52,cz:.14,e:2.3}],Gh=[[0,1],[.07,.9],[.15,.74],[.24,.56],[.33,.4],[.42,.24],[.5,.12],[.57,.02],[.63,-.1],[.69,-.22],[.75,-.36],[.81,-.5],[.86,-.62],[.91,-.76],[.96,-.9],[1,-1]];function Wh(i,e){if(e<=i[0][0])return i[0][1];if(e>=i[i.length-1][0])return i[i.length-1][1];for(let t=0;t<i.length-1;t++){const[n,s]=i[t],[r,o]=i[t+1];if(e>=n&&e<=r){const a=(e-n)/(r-n);return Ge(s,o,a*a*(3-2*a))}}return i[i.length-1][1]}function Ks(i,e,t,n){const s=Il(i),r=2/s.e,o=we(Math.abs(e)/Math.max(s.w,1e-4),0,1),a=Math.pow(o,1/r),l=Math.pow(Math.max(0,1-a*a),.5);return s.d*n*Math.pow(l,r)+s.cz*n}function Il(i){const e=a1;if(i>=e[0].yn)return e[0];if(i<=e[e.length-1].yn)return e[e.length-1];for(let t=0;t<e.length-1;t++){const n=e[t],s=e[t+1];if(i<=n.yn&&i>=s.yn){const r=(n.yn-i)/(n.yn-s.yn),o=r*r*(3-2*r);return{w:Ge(n.w,s.w,o),d:Ge(n.d,s.d,o),cz:Ge(n.cz,s.cz,o),e:Ge(n.e,s.e,o)}}}return e[e.length-1]}const Qe={eye:.06,browRidge:.22,noseRoot:.11,noseBase:-.4,mouthLine:-.6,lipUpper:-.552,lipLower:-.648,chinTip:-.92,jawCorner:-.5,earCenter:-.09};function l1(i,e){const t=i.face??{},n=e.fem,s=t.jaw??(n?-.35:.15),r=t.cheek??(n?.35:.1),o=t.browHeavy??(n?-.3:.35),a=t.noseLength??0,l=t.noseWidth??(n?-.2:.1),c=t.lipFull??(n?.45:0),h=t.eyeSpacing??0,d=t.chin??(n?-.1:.3),u=t.age??30,f=e.headW,m=e.headD,x=e.headHi,g=ad,p=ld,T=(g+1)*(p+1),b=new Float32Array(T*3),w=new Float32Array(T*2),S=new Float32Array(T),M=[],y=.01*(e.H/1.8),v=Qe.eye*x,E=(.4+h*.05)*f,C=Qe.mouthLine+c*.005,P=Qe.noseBase+a*-.035,D=gt(28,62,u),N=.0068*e.H,z=Ks(Qe.eye,E/f,f,m)-1.1*y-N+.3*y,I={};for(let G=0;G<=p;G++){const q=G/p,re=Wh(Gh,q),ne=Il(re);for(let ce=0;ce<=g;ce++){const Te=ce/g,J=Te*Math.PI*2,se=Math.cos(J),k=Math.sin(J),X=2/ne.e;let W=ne.w*f*Math.sign(se)*Math.pow(Math.abs(se),X),he=re*x,ue=ne.d*m*Math.sign(k)*Math.pow(Math.abs(k),X)+ne.cz*m;const Ue=we(Math.sign(k)*Math.pow(Math.abs(k),X*.7),-1,1),et=k>0,_e=we(Ue*1.4),te=re,j=W/f,oe=Math.abs(j);if(!et){const fe=-Ue;ue-=fe*ye(te-.14,.42)*.35*y}const Me=ye(te-.3,.15)*ye(oe-.84,.18)*we(.45+Ue);W-=Math.sign(W||1)*Me*.5*y;const Se=ye(te-.45,.2)*_e;ue-=Se*.25*y;const Ve=ye(te-Qe.jawCorner,.14)*ye(oe-.66,.24)*(.4+.6*_e);W+=Math.sign(W||1)*Ve*(.45+s*.8)*y;const Fe=ye(te-Qe.chinTip,.13)*ye(j,.36)*_e;ue+=Fe*(.55+d*.5)*y;const Ke=ye(te-(Qe.jawCorner-.2),.07)*ye(oe-.52,.28)*_e;ue-=Ke*.3*y*(1-D*.4);const Je=ye(te-(Qe.jawCorner-.28),.1)*ye(oe-.4,.3)*_e*D;ue+=Je*.3*y;const U=ye(te-(Qe.eye-.14),.13)*ye(oe-.62,.22)*we(.25+Ue);ue+=U*(.7+r*.6)*y,W+=Math.sign(W||1)*U*(.45+r*.5)*y;const dt=ye(te-(Qe.eye-.38),.1)*ye(oe-.5,.16)*_e;ue-=dt*(.35+D*.5)*y;const nt=ye(te-Qe.browRidge,.085)*ye(oe-.28,.34)*_e;ue+=nt*(.55+o*.6)*y;const L=ye(te-(Qe.browRidge-.02),.05)*ye(j,.1)*_e;ue-=L*.3*y;const _=ye(te-Qe.noseRoot,.05)*ye(j,.1)*_e;ue-=_*.35*y;for(const fe of[-1,1]){const ge=fe*E,ee=W-ge,ie=he-v,me=ee/(f*.42),De=ie/(x*.17),ve=me*me+De*De,xe=Math.exp(-ve*1.15)*_e;ue-=xe*1.1*y;const Ie=Math.exp(-(me*me*1.1+Math.pow(De-1.15,2)*2.4))*_e;ue+=Ie*.4*y;const ke=Math.exp(-(me*me*1.2+Math.pow(De+1.3,2)*3.2))*_e;ue+=ke*.28*y;const je=Math.exp(-(Math.pow(me+fe*-1.15,2)*4+De*De*3))*_e;if(ue-=je*.25*y,et){const F=Math.hypot(ee/(1.32*y),ie/(.5*y)),be=ee*ee+ie*ie;if(F<1.25&&be<N*N){const Ee=z+Math.sqrt(N*N-be)-.045*y,Re=gt(1.22,.72,F);Ee<ue&&(ue=Ge(ue,Ee,Re))}}}const B=we((Qe.noseRoot-te)/(Qe.noseRoot-P),0,1.25);if(et&&B>.001&&B<1.25){const fe=we(B),ge=(.11+l*.035)*(.5+fe*.8),ee=Math.pow(Math.sin(Math.min(1,B)*Math.PI*.86),.7),ie=ye(j,ge)*ee*_e;ue+=ie*(1.9+a*.5)*y;const me=ye(B-.9,.1)*ye(j,.13)*_e;ue+=me*.85*y,he-=me*.2*y;for(const ve of[-1,1]){const xe=j-ve*(.17+l*.035),Ie=ye(xe,.075)*ye(B-.94,.085)*_e;ue+=Ie*.6*y,W+=ve*Ie*.5*y;const ke=ye(j-ve*(.26+l*.04),.05)*ye(B-.96,.07)*_e;ue-=ke*.4*y}for(const ve of[-1,1]){const xe=ye(j-ve*.1,.045)*ye(B-1.04,.05)*_e;ue-=xe*.75*y}const De=ye(j,.04)*ye(B-1.03,.06)*_e;ue+=De*.2*y}const Y=ye(te-(P-.04),.035)*ye(j,.2)*_e;if(ue-=Y*.35*y,et){const fe=.3+c*.04,ge=ye(j,fe),ee=ye(te-(Qe.lipUpper+c*.004),.032)*ge*_e,ie=ye(te-(Qe.lipLower-c*.004),.038)*ge*_e;ue+=ee*(.75+c*.5)*y,ue+=ie*(.85+c*.55)*y;const me=ye(te-C,.016)*ge*_e;ue-=me*.55*y;const De=(ye(j-.07,.045)+ye(j+.07,.045))*ye(te-(Qe.lipUpper+.03),.028)*_e;ue+=De*.2*y;for(const Ie of[-1,1]){const ke=ye(j-Ie*(.3+c*.03),.055)*ye(te-C,.05)*_e;ue-=ke*.55*y}const ve=ye(te-(Qe.lipUpper+.09),.06)*ye(j,.055)*_e;ue-=ve*.3*y;const xe=ye(te-(Qe.lipLower-.1),.05)*ye(j,.26)*_e;ue-=xe*.5*y;for(const Ie of[-1,1]){const ke=ye(j-Ie*.36,.075)*ye(te-(C+.12),.11)*_e;ue-=ke*(.18+D*.42)*y}}const $=G*(g+1)+ce;b[$*3]=W,b[$*3+1]=he,b[$*3+2]=ue,w[$*2]=(Te+.25)%1,w[$*2+1]=1-q,S[$]=we(gt(C+.12,-.95,te)*(.3+.7*we(Ue)))}}{const G=(q,re)=>{let ne=0,ce=1e9;for(let X=0;X<=200;X++){const W=X/200,he=Math.abs(Wh(Gh,W)-q);he<ce&&(ce=he,ne=W)}const Te=Il(q),J=2/Te.e,se=we(Math.abs(re)/Math.max(Te.w,1e-4),0,1);return[((re>=0?Math.acos(Math.pow(se,1/J)):Math.PI-Math.acos(Math.pow(se,1/J)))/(Math.PI*2)+.25)%1,1-ne]};I.eyeL=G(Qe.eye,-E/f),I.eyeR=G(Qe.eye,E/f),I.browL=G(Qe.browRidge-.03,-E/f),I.browR=G(Qe.browRidge-.03,E/f),I.mouth=G(C,0),I.mouthL=G(C,-.3),I.mouthR=G(C,.3),I.noseTip=G(Qe.noseBase+.05,0),I.noseBase=G(Qe.noseBase,0),I.chin=G(Qe.chinTip,0),I.jawL=G(Qe.jawCorner,-.66),I.jawR=G(Qe.jawCorner,.66),I.foreheadTop=G(.5,0)}for(let G=0;G<p;G++)for(let q=0;q<g;q++){const re=G*(g+1)+q,ne=re+1,ce=re+(g+1),Te=ce+1;M.push(re,ne,ce,ne,Te,ce)}{const G=p*(g+1);for(let q=1;q<g-1;q++)M.push(G,G+q,G+q+1)}const V=z,O={eyeL:new A(-E,v,V),eyeR:new A(E,v,V),mouth:new A(0,C*x,Ks(C,0,f,m)+.6*y),noseTip:new A(0,(Qe.noseBase+.08)*x,Ks(Qe.noseBase+.08,0,f,m)+1.9*y),earL:new A(-f*.93,Qe.earCenter*x,-m*.2),earR:new A(f*.93,Qe.earCenter*x,-m*.2),browL:new A(-E,(Qe.browRidge-.03)*x,Ks(Qe.browRidge-.03,E/f,f,m)+.5*y),browR:new A(E,(Qe.browRidge-.03)*x,Ks(Qe.browRidge-.03,E/f,f,m)+.5*y),crown:new A(0,x,0)};return{pos:b,uv:w,index:M,count:T,jawWeight:S,landmarks:O,uvLandmarks:I}}function c1(i,e,t,n,s){const r=e+1,o=new Float32Array(i.length);for(let a=0;a<n;a++){o.set(i);for(let l=1;l<t;l++)for(let c=0;c<=e;c++){const h=l*r+c,d=l*r+(c-1+e)%e,u=l*r+(c+1)%e,f=(l-1)*r+c,m=(l+1)*r+c;for(let x=0;x<3;x++){const g=(o[d*3+x]+o[u*3+x]+o[f*3+x]+o[m*3+x])*.25;i[h*3+x]=Ge(o[h*3+x],g,s)}}}}const Nl=["browUp","browAngry","squint","smile","frown","mouthOpenWide"];function h1(i,e=1){const t=lc(i),n=o1(i),s=cc(),r=Math.max(10,Math.round(18*e)),o=Math.max(8,Math.round(14*e)),a=t.fem,l=[[t.hipY-.08*t.H,.079*t.H*t.w*(1+a*.08),.056*t.H*t.w,2.15,0],[t.hipY-.025*t.H,.086*t.H*t.w*(1+a*.09),.06*t.H*t.w,2.2,0],[t.hipY+.025*t.H,.076*t.H*t.w*(1-a*.04),.054*t.H*t.w,2.25,.002*t.H],[t.spineY,.071*t.H*t.w*(1-a*.07),.052*t.H*t.w,2.3,.004*t.H],[t.spineY+.05*t.H,.081*t.H*t.w,.057*t.H*t.w*(1+a*.08),2.35,.005*t.H],[t.chestY,.091*t.H*t.w,.063*t.H*t.w*(1+a*.07),2.4,.003*t.H],[t.chestY+.045*t.H,.094*t.H*t.w,.058*t.H*t.w,2.45,-.001*t.H],[t.shoulderY+.005*t.H,.079*t.H*t.w,.05*t.H*t.w,2.3,-.005*t.H],[t.neckY-.012*t.H,.047*t.H*t.w,.039*t.H*t.w,2.15,-.006*t.H]],c=[];for(let T=0;T<l.length;T++){const[b,w,S,M,y]=l[T],v=b<t.hipY?kt.HIPS:kt.TORSO;c.push(od(s,b,w,S,M,y,r,T/(l.length-1),v))}for(let T=0;T<c.length-1;T++)pr(s,c[T],c[T+1]);{const T=Qn(s,0,t.hipY-.085*t.H,0,.5,0,kt.HIPS),b=c[0];for(let w=0;w<b.length;w++)s.index.push(T,b[(w+1)%b.length],b[w])}lr(s,[new A(0,t.neckY-.03*t.H,-.004*t.H),new A(0,t.neckY+.02*t.H,-.002*t.H),new A(0,t.headY+.008*t.H,.002*t.H)],[t.neckR*1.25,t.neckR,t.neckR*1.02],Math.max(10,r-4),kt.NECK,!1,!1,.86);for(const T of[-1,1]){const b=T<0?"L":"R",w=T<0?kt.ARM_L:kt.ARM_R,S=T<0?kt.LEG_L:kt.LEG_R,M=C=>n.restWorld.get(C).clone(),y=M(`arm${b}`).clone();y.y+=.012*t.H;const v=Vh([new A(T*t.shoulderX*.42,t.shoulderY+.03*t.H,0),y,M(`foreArm${b}`),M(`hand${b}`)],[t.armR*1.5,t.armR*1.12,t.elbowR,t.wristR],Math.max(3,Math.round(4*e)));lr(s,v.pts,v.rad,o,w,!1,!0,.92);const E=Vh([new A(T*t.hipJointX,t.hipY+.01*t.H,0),new A(T*t.hipJointX,t.hipY-.06*t.H,0),M(`shin${b}`),M(`foot${b}`)],[t.thighR*1.24,t.thighR,t.kneeR,t.ankleR],Math.max(3,Math.round(4*e)));lr(s,E.pts,E.rad,o,S,!1,!0,.94)}const h=l1(i,t);c1(h.pos,ad,ld,1,.28);const d=new A(0,t.headCenterY,.004*t.H),u=s.pos.length/3,f=s.index.length,m=[];for(let T=0;T<h.count;T++)Qn(s,h.pos[T*3]+d.x,h.pos[T*3+1]+d.y,h.pos[T*3+2]+d.z,h.uv[T*2],h.uv[T*2+1],kt.HEAD),m.push(h.jawWeight[T]);for(let T=0;T<h.index.length;T++)s.index.push(u+h.index[T]);const x=s.index.length;for(const T of[-1,1]){const w=(T<0?h.landmarks.earL:h.landmarks.earR).clone().add(d),S=.0022*t.H,M=.015*t.H,y=.0078*t.H,v=12,E=10,C=[];for(let P=0;P<=E;P++){const D=P/E*Math.PI,N=[];for(let z=0;z<v;z++){const I=z/v*Math.PI*2;let V=Math.sin(D)*Math.cos(I)*S;const O=Math.cos(D)*M;let G=Math.sin(D)*Math.sin(I)*y;const q=T*V>0?1:.35;V*=q;const re=ye(Math.cos(D)-.05,.35)*ye(Math.sin(D)*Math.sin(I)/y+.2,.5);V-=T*re*S*.55*q,G+=Math.cos(D)*y*.22,N.push(Qn(s,w.x+V-T*S*.6,w.y+O,w.z+G,z/v,P/E,kt.HEAD))}C.push(N)}for(let P=0;P<C.length-1;P++)pr(s,C[P],C[P+1],T>0)}const g=new At;g.setAttribute("position",new $e(s.pos,3)),g.setAttribute("uv",new $e(s.uv,2)),g.setAttribute("aRegion",new $e(s.region,1)),g.setIndex(s.index),hc(g),g.clearGroups(),g.addGroup(0,f,0),g.addGroup(f,x-f,1),s.index.length>x&&g.addGroup(x,s.index.length-x,0),u1(g,h,u,t),f1(g,n,m,u,t);const p={};for(const[T,b]of Object.entries(h.landmarks))p[T]=b.clone().add(d);return p.headCenter=d.clone(),p.chest=new A(0,t.chestY,.06*t.H),p.hips=new A(0,t.hipY,0),{geometry:g,landmarks:p,uvLandmarks:h.uvLandmarks,rig:n,dims:t,morphNames:[...Nl]}}function u1(i,e,t,n){const r=i.getAttribute("position").count,o=.01*(n.H/1.8),a=n.headHi,l=n.headW,c={};for(const h of Nl)c[h]=new Float32Array(r*3);for(let h=0;h<e.count;h++){const d=t+h,u=e.pos[h*3],f=e.pos[h*3+1],m=e.pos[h*3+2],x=f/a,g=u/l,p=we(m/(n.headD*.7)),T=.4;{const b=ye(x-Qe.browRidge,.11)*p;c.browUp[d*3+1]+=b*.55*o,c.browUp[d*3+2]+=b*.15*o}{const b=ye(x-Qe.browRidge,.1)*ye(Math.abs(g)-.16,.16)*p,w=ye(x-Qe.browRidge,.1)*ye(Math.abs(g)-.62,.18)*p;c.browAngry[d*3+1]+=(-b*.6+w*.18)*o,c.browAngry[d*3]+=-Math.sign(g||1)*b*.3*o,c.browAngry[d*3+2]+=b*.25*o}for(const b of[-1,1]){const w=(g-b*T)/.42,S=(x-Qe.eye)/.17,M=Math.exp(-(w*w*1.2+Math.pow(S+1,2)*2.2))*p;c.squint[d*3+1]+=M*.35*o,c.squint[d*3+2]+=M*.2*o}for(const b of[-1,1]){const w=ye(g-b*.3,.11)*ye(x-Qe.mouthLine,.09)*p;c.smile[d*3]+=b*w*.5*o,c.smile[d*3+1]+=w*.65*o,c.smile[d*3+2]+=-w*.15*o;const S=ye(g-b*.55,.16)*ye(x-(Qe.eye-.3),.14)*p;c.smile[d*3+1]+=S*.3*o,c.smile[d*3+2]+=S*.35*o}{for(const w of[-1,1]){const S=ye(g-w*.3,.11)*ye(x-Qe.mouthLine,.09)*p;c.frown[d*3]+=w*S*.15*o,c.frown[d*3+1]+=-S*.6*o}const b=ye(x-Qe.chinTip,.12)*ye(g,.3)*p;c.frown[d*3+2]+=b*.2*o}{const b=ye(x-Qe.mouthLine,.1)*ye(g,.34)*p;c.mouthOpenWide[d*3]+=Math.sign(g||1)*b*.45*o,c.mouthOpenWide[d*3+1]+=-ye(x-(Qe.mouthLine-.06),.08)*p*.4*o}}i.morphAttributes.position=Nl.map(h=>{const d=new $e(c[h],3);return d.name=h,d}),i.morphTargetsRelative=!0}function d1(i,e,t){const n=new A().subVectors(t,e),s=we(new A().subVectors(i,e).dot(n)/Math.max(n.lengthSq(),1e-8));return i.distanceTo(e.clone().addScaledVector(n,s))}function f1(i,e,t,n,s){const r=p=>e.bones.indexOf(e.byName[p]),o=e.restWorld,a=[],l=(p,T,b,w,S)=>a.push({a:o.get(p),b:o.get(T),bone:r(b),falloff:w,regions:S});l("hips","spine","hips",.14*s.H),l("spine","chest","spine",.14*s.H),l("chest","neck","chest",.14*s.H),l("neck","head","neck",.055*s.H),l("head","head","head",.13*s.H);for(const p of["L","R"]){const T=p==="L"?[kt.ARM_L]:[kt.ARM_R];l(`shoulder${p}`,`arm${p}`,`shoulder${p}`,.055*s.H),l(`arm${p}`,`foreArm${p}`,`arm${p}`,.05*s.H,T),l(`foreArm${p}`,`hand${p}`,`foreArm${p}`,.045*s.H,T);const b=p==="L"?[kt.LEG_L]:[kt.LEG_R];l(`thigh${p}`,`shin${p}`,`thigh${p}`,.07*s.H,b),l(`shin${p}`,`foot${p}`,`shin${p}`,.055*s.H,b),l(`foot${p}`,`toe${p}`,`foot${p}`,.04*s.H,b)}const c=i.getAttribute("position"),h=i.getAttribute("aRegion"),d=c.count,u=new Uint16Array(d*4),f=new Float32Array(d*4),m=r("jaw"),x=r("head"),g=new A;for(let p=0;p<d;p++){g.fromBufferAttribute(c,p);const T=h.getX(p);if(p>=n&&T===kt.HEAD){const M=t[p-n]??0;u[p*4]=x,u[p*4+1]=m,f[p*4]=1-M*.85,f[p*4+1]=M*.85;continue}const b=[];for(const M of a){if(M.regions&&!M.regions.includes(T))continue;const y=d1(g,M.a,M.b),v=Math.pow(1/Math.max(y,1e-4),3.2)*Math.exp(-y/M.falloff);v>0&&b.push({bone:M.bone,w:v})}b.sort((M,y)=>y.w-M.w);const w=b.slice(0,4),S=w.reduce((M,y)=>M+y.w,0)||1;for(let M=0;M<4;M++)u[p*4+M]=w[M]?.bone??0,f[p*4+M]=(w[M]?.w??0)/S}i.setAttribute("skinIndex",new Ro(u,4)),i.setAttribute("skinWeight",new $e(f,4))}function p1(i,e,t="relaxed"){const n=cc(),s=i.H,r=.048*s*i.w,o=.052*s,a=.019*s,l=[],c=5;for(let f=0;f<=c;f++){const m=f/c,x=-m*o,g=r*(.78+.22*Math.sin(m*Math.PI*.8)),p=a*(1-m*.22);l.push(od(n,x,g*.5,p*.5,3.2,0,12,m,0))}for(let f=0;f<l.length-1;f++)pr(n,l[f],l[f+1]);{const f=Qn(n,0,.004*s,0,.5,0,0),m=l[0];for(let x=0;x<m.length;x++)n.index.push(f,m[(x+1)%m.length],m[x])}const h=t==="fist"?1:t==="grip"?.72:t==="open"?.06:.26,d=[.042,.046,.043,.035].map(f=>f*s);for(let f=0;f<4;f++){const m=(-.36+f*.24)*r*e*-1,x=-o,g=d[f],p=[],T=[],b=6;let w=0;const S=m,M=x,y=0;let v=S,E=M,C=y;for(let P=0;P<=b;P++){const D=P/b;p.push(new A(v,E,C)),T.push((.0092-D*.0026)*s*i.w),w+=h*Math.PI*.62/b;const N=g/b;v+=0,E-=Math.cos(w)*N,C+=Math.sin(w)*N}lr(n,p,T,8,0,!0,!0,1)}{const f=[],m=[],g=new A(e*-.62,-.5,.6).normalize(),p=new A(e*-r*.4,-o*.3,a*.1);for(let T=0;T<=5;T++){const b=T/5,w=new A(0,-b*b*.008*s,b*b*h*.02*s);f.push(p.clone().addScaledVector(g,b*.05*s).add(w)),m.push((.0112-b*.0028)*s*i.w)}lr(n,f,m,8,0,!0,!0,1)}const u=new At;return u.setAttribute("position",new $e(n.pos,3)),u.setAttribute("uv",new $e(n.uv,2)),u.setIndex(n.index),hc(u),u}function m1(i){const e=cc(),t=i.H,n=.155*t,s=.055*t*i.w,r=[],o=8;for(let d=0;d<=o;d++){const u=d/o,f=-n*.28+u*n,m=s*(.72+.32*Math.sin(we(u*1.15,0,1)*Math.PI)),x=(.055-u*.032)*t,g=[],p=14;for(let T=0;T<p;T++){const b=T/p*Math.PI*2,w=Math.cos(b),S=Math.sin(b),M=m*.5*Math.sign(w)*Math.pow(Math.abs(w),.55),y=x*.5*Math.sign(S)*Math.pow(Math.abs(S),.7);g.push(Qn(e,M,x*.5+y-.004*t,f,T/p,u,0))}r.push(g)}for(let d=0;d<r.length-1;d++)pr(e,r[d],r[d+1]);const a=Qn(e,0,.02*t,-n*.3,.5,0,0);for(let d=0;d<r[0].length;d++)e.index.push(a,r[0][(d+1)%r[0].length],r[0][d]);const l=r[r.length-1],c=Qn(e,0,.012*t,-n*.28+n,.5,1,0);for(let d=0;d<l.length;d++)e.index.push(c,l[d],l[(d+1)%l.length]);const h=new At;return h.setAttribute("position",new $e(e.pos,3)),h.setAttribute("uv",new $e(e.uv,2)),h.setIndex(e.index),hc(h),h}function g1(i,e){const t=i.getAttribute("position"),n=i.getAttribute("normal"),s=i.getAttribute("uv"),r=i.getAttribute("aRegion"),o=i.getAttribute("skinIndex"),a=i.getAttribute("skinWeight"),l=i.getIndex(),c=e.yMin??-1/0,h=e.yMax??1/0,d=new Uint8Array(t.count),u=new Uint8Array(t.count),f=new A;for(let v=0;v<t.count;v++)f.fromBufferAttribute(t,v),d[v]=e.regions.includes(r.getX(v))?1:0,u[v]=f.y>=c&&f.y<=h&&(!e.keep||e.keep(f))?1:0;const m=new Int32Array(t.count).fill(-1),x=[],g=[],p=[],T=[],b=[],w=[],S=new A,M=v=>{if(m[v]>=0)return m[v];f.fromBufferAttribute(t,v),S.fromBufferAttribute(n,v);const E=typeof e.inflate=="function"?e.inflate(f.y,f.x,f.z):e.inflate;x.push(f.x+S.x*E,f.y+S.y*E,f.z+S.z*E),g.push(S.x,S.y,S.z),p.push(s.getX(v),s.getY(v)),T.push(o.getX(v),o.getY(v),o.getZ(v),o.getW(v)),b.push(a.getX(v),a.getY(v),a.getZ(v),a.getW(v));const C=x.length/3-1;return m[v]=C,C};for(let v=0;v<l.count;v+=3){const E=l.getX(v),C=l.getX(v+1),P=l.getX(v+2);!d[E]&&!d[C]&&!d[P]||!u[E]||!u[C]||!u[P]||w.push(M(E),M(C),M(P))}if(w.length===0)return null;const y=new At;return y.setAttribute("position",new $e(x,3)),y.setAttribute("normal",new $e(g,3)),y.setAttribute("uv",new $e(p,2)),y.setAttribute("skinIndex",new Ro(T,4)),y.setAttribute("skinWeight",new $e(b,4)),y.setIndex(w),y.computeVertexNormals(),y}const Ot=i=>[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255];function v1(i,e,t){const n=[],s=[],r=e.H,o=t.primary??1909289,a=t.secondary??922134,l=t.accent??2846632,c=(x,g,p)=>{const T=g1(i,g);T&&n.push({geometry:T,material:p,skinned:!0,name:x,castShadow:!0})},h=[kt.TORSO],d=[kt.ARM_L,kt.ARM_R],u=[kt.LEG_L,kt.LEG_R,kt.HIPS],f=Ut(Ot(a),{rough:.9,weave:190,repeat:4}),m=Ut(Ot(t.kind==="detective"?12174284:14212836),{rough:.78,weave:240,repeat:5,sheen:.7});switch(t.kind){case"androidSuit":{if(c("jacket",{regions:[...h,...d],inflate:x=>Ge(.011,.018,gt(e.hipY,e.chestY,x))*(r/1.8),yMin:e.hipY-.06*r},Ut(Ot(o),{rough:.62,weave:260,repeat:6,sheen:.85})),c("trousers",{regions:u,inflate:.012*(r/1.8),yMax:e.hipY+.06*r},f),n.push(ro(e,o,1.06)),n.push(...S1(e,l)),t.armband!==!1){const x=Ua(e,l);n.push(x.piece),s.push(x.pos)}break}case"detective":{c("shirt",{regions:[...h,...d],inflate:.01*(r/1.8),yMin:e.hipY-.04*r},m),c("blazer",{regions:[...h,...d],inflate:x=>Ge(.016,.03,gt(e.hipY,e.chestY+.05*r,x))*(r/1.8),yMin:e.hipY-.09*r,keep:x=>!(x.z>.02*r&&x.y>e.chestY-.02*r&&Math.abs(x.x)<.055*r)},Ut(Ot(o),{rough:.82,weave:150,repeat:4})),c("trousers",{regions:u,inflate:.014*(r/1.8),yMax:e.hipY+.06*r},f),n.push(...x1(e,o)),t.tie!==void 0&&n.push(M1(e,t.tie)),n.push(Na(e,1316378));break}case"trenchcoat":{c("coat",{regions:[...h,...d],inflate:x=>Ge(.022,.034,gt(e.hipY,e.chestY,x))*(r/1.8),yMin:e.hipY-.02*r},Ut(Ot(o),{rough:.74,weave:120,repeat:3})),n.push(Yh(e,o)),n.push(ro(e,o,1.18,!0)),c("trousers",{regions:u,inflate:.013*(r/1.8),yMax:e.hipY+.02*r},f),n.push(Na(e,1711136));break}case"hoodie":{c("hoodie",{regions:[...h,...d],inflate:x=>Ge(.02,.028,gt(e.hipY,e.chestY,x))*(r/1.8),yMin:e.hipY-.08*r},Ut(Ot(o),{rough:.94,weave:90,repeat:3})),n.push(y1(e,o)),c("jeans",{regions:u,inflate:.016*(r/1.8),yMax:e.hipY+.06*r},Ut(Ot(a),{rough:.92,weave:130,repeat:4}));break}case"maidUniform":{if(c("dress",{regions:[...h,...d],inflate:.012*(r/1.8),yMin:e.hipY-.05*r},Ut(Ot(o),{rough:.7,weave:220,repeat:5,sheen:.9})),n.push(_1(e,15265007)),n.push(Xh(e,o,.34,.2)),n.push(ro(e,15265007,1.02)),t.armband!==!1){const x=Ua(e,l);n.push(x.piece),s.push(x.pos)}break}case"uniform":{c("shirt",{regions:[...h,...d],inflate:.012*(r/1.8),yMin:e.hipY-.05*r},Ut(Ot(o),{rough:.8,weave:200,repeat:5})),c("trousers",{regions:u,inflate:.014*(r/1.8),yMax:e.hipY+.06*r},f),n.push(Na(e,1053206)),n.push(w1(e,1777444));break}case"labcoat":{c("shirt",{regions:[...h,...d],inflate:.011*(r/1.8),yMin:e.hipY-.04*r},m),c("coat",{regions:[...h,...d],inflate:.024*(r/1.8),yMin:e.hipY-.02*r},Ut(Ot(15133678),{rough:.72,weave:160,repeat:4})),n.push(Yh(e,15133678,.26)),c("trousers",{regions:u,inflate:.013*(r/1.8),yMax:e.hipY+.02*r},f);break}case"winterCoat":{c("coat",{regions:[...h,...d],inflate:x=>Ge(.03,.042,gt(e.hipY,e.chestY,x))*(r/1.8),yMin:e.hipY-.1*r},Ut(Ot(o),{rough:.88,weave:70,repeat:2.5})),n.push(ro(e,o,1.3,!0)),c("trousers",{regions:u,inflate:.016*(r/1.8),yMax:e.hipY+.06*r},f);break}case"dress":{c("bodice",{regions:h,inflate:.009*(r/1.8),yMin:e.hipY-.04*r,yMax:e.chestY+.08*r},Ut(Ot(o),{rough:.6,weave:300,repeat:6,sheen:1})),n.push(Xh(e,o,.42,.26));break}case"tshirt":default:{c("tshirt",{regions:[...h,...d],inflate:.011*(r/1.8),yMin:e.hipY-.04*r,keep:x=>x.y<e.shoulderY-.02*r||Math.abs(x.x)<e.shoulderX+.03*r},Ut(Ot(o),{rough:.9,weave:200,repeat:5})),c("jeans",{regions:u,inflate:.015*(r/1.8),yMax:e.hipY+.06*r},Ut(Ot(a),{rough:.92,weave:130,repeat:4}));break}}if(t.armband&&!s.length){const x=Ua(e,l);n.push(x.piece),s.push(x.pos)}return{pieces:n,ledSlots:s}}function ro(i,e,t=1.05,n=!1){const s=i.H,r=i.neckR*1.5*t,o=(n?.055:.032)*s;return{geometry:new Cn(r*1.02,r*1.16,o,20,1,!0,-Math.PI*.86,Math.PI*1.72),material:Ut(Ot(e),{rough:.7,weave:200,repeat:3}),skinned:!1,bone:"neck",offset:new A(0,o*.28,-.004*s),name:"collar",castShadow:!0}}function x1(i,e){const t=i.H,n=[];for(const s of[-1,1]){const r=new ec;r.moveTo(0,0),r.lineTo(s*.062*t,-.03*t),r.lineTo(s*.045*t,-.16*t),r.lineTo(0,-.14*t),r.closePath();const o=new Lo(r,{depth:.006*t,bevelEnabled:!1});o.rotateY(s*-.22),n.push({geometry:o,material:Ut(Ot(e),{rough:.72,weave:150,repeat:3}),skinned:!1,bone:"chest",offset:new A(0,.052*t,.062*t),name:`lapel${s<0?"L":"R"}`,castShadow:!0})}return n}function M1(i,e){const t=i.H,n=new ec;return n.moveTo(-.016*t,0),n.lineTo(.016*t,0),n.lineTo(.021*t,-.15*t),n.lineTo(0,-.19*t),n.lineTo(-.021*t,-.15*t),n.closePath(),{geometry:new Lo(n,{depth:.005*t,bevelEnabled:!1}),material:Ut(Ot(e),{rough:.55,weave:320,repeat:4,sheen:1}),skinned:!1,bone:"chest",offset:new A(0,.055*t,.064*t),name:"tie",castShadow:!0}}function Na(i,e){const t=i.H,n=new Cn(.096*t*i.w,.098*t*i.w,.022*t,24,1,!0),s=new Sn(.03*t,.022*t,.008*t);return s.translate(0,0,.062*t*i.w),{geometry:uc([n,s]),material:id(e),skinned:!1,bone:"hips",offset:new A(0,.028*t,0),name:"belt",castShadow:!0}}function w1(i,e){const t=i.H;return{geometry:new Cn(.108*t*i.w,.1*t*i.w,.24*t,20,1,!0),material:rd(e,.55),skinned:!1,bone:"chest",offset:new A(0,-.02*t,0),name:"vest",castShadow:!0}}function Xh(i,e,t=.34,n=.2){const s=i.H,r=.1*s*i.w,o=r*(1+n*2.2);return{geometry:new Cn(r,o,t*s,26,3,!0),material:Ut(Ot(e),{rough:.8,weave:180,repeat:4}),skinned:!1,bone:"hips",offset:new A(0,-t*s*.42,0),name:"skirt",castShadow:!0}}function Yh(i,e,t=.34){const n=i.H,s=.105*n*i.w;return{geometry:new Cn(s,s*1.24,t*n,24,3,!0,-Math.PI*.92,Math.PI*1.84),material:Ut(Ot(e),{rough:.76,weave:130,repeat:3}),skinned:!1,bone:"hips",offset:new A(0,-t*n*.4,0),name:"coat-skirt",castShadow:!0}}function y1(i,e){const t=i.H,n=new Wt(.088*t,18,14,0,Math.PI*2,0,Math.PI*.62);return n.scale(1,1.1,1.25),n.translate(0,-.01*t,-.045*t),{geometry:n,material:Ut(Ot(e),{rough:.94,weave:90,repeat:2}),skinned:!1,bone:"neck",offset:new A(0,.02*t,-.02*t),name:"hood",castShadow:!0}}function _1(i,e){const t=i.H,n=new Gt(.15*t,.3*t,4,6),s=n.getAttribute("position");for(let r=0;r<s.count;r++){const o=s.getX(r),a=s.getY(r);s.setZ(r,.03*t*(1-Math.pow(o/(.075*t),2))-Math.abs(a)*.02)}return n.computeVertexNormals(),{geometry:n,material:Ut(Ot(e),{rough:.86,weave:240,repeat:4}),skinned:!1,bone:"spine",offset:new A(0,-.02*t,.07*t),name:"apron",castShadow:!0}}function S1(i,e){const t=i.H,n=[];for(const s of[-1,1]){const r=new Sn(.006*t,.2*t,.004*t);n.push({geometry:r,material:ks(e,.5),skinned:!1,bone:"chest",offset:new A(s*.055*t,-.02*t,.058*t),name:`stripe${s<0?"L":"R"}`})}return n}function Ua(i,e){const t=i.H,n=i.armR*1.35,s=new Cn(n,n,.03*t,16,1,!0);s.rotateZ(Math.PI/2);const r=new Cn(0,n*.55,.004*t,3);return r.rotateX(Math.PI/2),r.rotateZ(Math.PI),r.translate(0,0,-n*1.02),{piece:{geometry:uc([s,r]),material:ks(e,.9),skinned:!1,bone:"armL",offset:new A(0,-.07*t,0),name:"armband"},pos:new A(0,-.07*t,0)}}function uc(i){const e=new At,t=[],n=[],s=[],r=[];let o=0;for(const a of i){const l=a.getAttribute("position"),c=a.getAttribute("normal"),h=a.getAttribute("uv");for(let u=0;u<l.count;u++)t.push(l.getX(u),l.getY(u),l.getZ(u)),c&&n.push(c.getX(u),c.getY(u),c.getZ(u)),h?s.push(h.getX(u),h.getY(u)):s.push(0,0);const d=a.getIndex();if(d)for(let u=0;u<d.count;u++)r.push(o+d.getX(u));else for(let u=0;u<l.count;u++)r.push(o+u);o+=l.count,a.dispose()}return e.setAttribute("position",new $e(t,3)),n.length===t.length&&e.setAttribute("normal",new $e(n,3)),e.setAttribute("uv",new $e(s,2)),e.setIndex(r),n.length!==t.length&&e.computeVertexNormals(),e}function b1(i,e){const t=i.H,n=new Do(.0058*t,.0016*t,8,26),s=new vr(.005*t,20),r=ks(e,2.2),o=uc([n,s]),a=new qe(o,r);return a.name="temple-led",{mesh:a,material:r}}const qh=new Map;function E1(i,e=256){const t=`${i}_${e}`,n=qh.get(t);if(n)return n;const s=document.createElement("canvas");s.width=s.height=e;const r=s.getContext("2d"),o=new pe(i);r.fillStyle="#000",r.fillRect(0,0,e,e);const a=e/2,l=e/2,c=e*.5,h=r.createRadialGradient(a,l,e*.06,a,l,c),d=o.clone().multiplyScalar(.35),u=o.clone(),f=o.clone().multiplyScalar(.55);h.addColorStop(0,`rgb(${d.r*255|0},${d.g*255|0},${d.b*255|0})`),h.addColorStop(.45,`rgb(${u.r*255|0},${u.g*255|0},${u.b*255|0})`),h.addColorStop(.82,`rgb(${f.r*255|0},${f.g*255|0},${f.b*255|0})`),h.addColorStop(1,"#0a0d10"),r.fillStyle=h,r.beginPath(),r.arc(a,l,c,0,Math.PI*2),r.fill();const m=new $t(i>>>0);r.globalCompositeOperation="lighter";for(let g=0;g<220;g++){const p=m.next()*Math.PI*2,T=c*m.range(.2,.35),b=c*m.range(.6,.95),w=m.range(-.06,.06);r.strokeStyle=`rgba(255,255,255,${m.range(.015,.07)})`,r.lineWidth=m.range(.6,2.4),r.beginPath(),r.moveTo(a+Math.cos(p)*T,l+Math.sin(p)*T),r.quadraticCurveTo(a+Math.cos(p+w)*(T+b)*.5,l+Math.sin(p+w)*(T+b)*.5,a+Math.cos(p+w*2)*b,l+Math.sin(p+w*2)*b),r.stroke()}r.globalCompositeOperation="source-over",r.fillStyle="#000",r.beginPath(),r.arc(a,l,c*.34,0,Math.PI*2),r.fill();const x=new Su(s);return x.colorSpace=dn,x.needsUpdate=!0,qh.set(t,x),x}function T1(i,e,t,n=7048096){const r=.0068*i.H,o=new yt;o.name="eyes";const a=[],l=[],c=[],h=[],d=new Xt({color:new pe(.8,.78,.77).convertSRGBToLinear(),roughness:.22,metalness:0,clearcoat:1,clearcoatRoughness:.04,sheen:.2}),u=new Xt({map:E1(n),roughness:.14,metalness:0,clearcoat:1,clearcoatRoughness:.02,emissive:new pe(n).multiplyScalar(.06)}),f=new Xt({color:16777215,transparent:!0,opacity:.16,roughness:.02,metalness:0,clearcoat:1,clearcoatRoughness:.01,depthWrite:!1}),m=new _n({color:657160,roughness:.55,metalness:0});for(const x of[-1,1]){const g=x<0?e.eyeL:e.eyeR,p=new Tt;p.position.copy(g),o.add(p),a.push(p);const T=new qe(new Wt(r,24,18),d);T.castShadow=!1,p.add(T);const b=.56,w=Math.asin(b),S=new Wt(r*1.004,28,18,0,Math.PI*2,0,w);S.rotateX(Math.PI/2);{const O=S.getAttribute("position"),G=S.getAttribute("uv"),q=r*b;for(let re=0;re<O.count;re++)G.setXY(re,.5+O.getX(re)/(2*q),.5+O.getY(re)/(2*q));G.needsUpdate=!0}const M=new qe(S,u);p.add(M),h.push(M);const y=new qe(new Wt(r*1.035,20,14,0,Math.PI*2,0,.9),f);y.rotation.x=Math.PI/2,y.renderOrder=2,p.add(y);const v=r*1.09,E=new Tt;E.position.copy(p.position),o.add(E);const C=new Wt(v,22,12,0,Math.PI*2,0,1.02);C.scale(1.18,1,1.02);const P=new qe(C,t);P.castShadow=!1,E.add(P);const D=new Do(v*Math.sin(1.02),v*.038,6,22);D.rotateX(Math.PI/2),D.translate(0,v*Math.cos(1.02),0),D.scale(1.18,1,1.02);const N=new qe(D,m);E.add(N),E.rotation.x=.3,l.push(E);const z=new Tt;z.position.copy(p.position),o.add(z);const I=new Wt(v,22,12,0,Math.PI*2,Math.PI-.78,.78);I.scale(1.16,1,1.02);const V=new qe(I,t);V.castShadow=!1,z.add(V),z.rotation.x=-.3,c.push(z)}return{group:o,pivots:a,upperLids:l,lowerLids:c,pupils:h,irisMat:u}}function A1(i,e){const t=[[0,.36],[.5,.33],[.95,.16],[1.35,-.05],[1.9,-.24],[2.5,-.42],[Math.PI,-.5]];let n=t[t.length-1][1];for(let s=0;s<t.length-1;s++){const[r,o]=t[s],[a,l]=t[s+1];if(i>=r&&i<=a){const c=(i-r)/(a-r);n=Ge(o,l,c*c*(3-2*c));break}}return e==="buzz"&&(n+=.02),(e==="long"||e==="bob")&&(n-=.06),n}function R1(i,e){const t=i.headW,n=i.headD,s=i.headHi,r=56,o=16,a=e.style,l=a==="buzz"?.25:a==="short"?.6:a==="sidepart"?.85:1,c=[],h=[],d=[];for(let f=0;f<=o;f++){const m=f/o;for(let x=0;x<=r;x++){const g=x/r,p=g*Math.PI*2,T=Math.abs(Math.atan2(Math.cos(p),Math.sin(p)));let b=A1(T,a);b+=Math.exp(-Math.pow(T/.22,2))*.05,b+=Math.sin(p*3.1+1.2)*.012;const w=Ge(b,1,Math.pow(m,.85)),S=C1(w),M=2/S.e,y=Math.cos(p),v=Math.sin(p),E=S.w*t*Math.sign(y)*Math.pow(Math.abs(y),M),C=S.d*n*Math.sign(v)*Math.pow(Math.abs(v),M)+S.cz*n,P=w*s,D=we((T-1.2)/1.9),N=(.12+.88*Math.pow(m,.7))*(.6+.5*D)*l*.0042*i.H,z=1+ct(E*45,(P+C)*45,3)*.22,I=Math.hypot(E,P*.55,C)||1,V=E/I,O=P*.55/I,G=C/I;c.push(E+V*N*z,P+O*N*z,C+G*N*z),h.push(g*4,m*2)}}for(let f=0;f<o;f++)for(let m=0;m<r;m++){const x=f*(r+1)+m,g=x+1,p=x+(r+1),T=p+1;d.push(x,g,p,g,T,p)}const u=new At;return u.setAttribute("position",new $e(c,3)),u.setAttribute("uv",new $e(h,2)),u.setIndex(d),u.computeVertexNormals(),u}function C1(i){const e=[[1,.1,.16,-.1,2],[.92,.38,.45,-.1,2],[.8,.6,.66,-.1,2.05],[.62,.83,.85,-.08,2.1],[.42,.95,.93,-.05,2.15],[.22,1,.95,-.03,2.2],[.06,1,.94,-.02,2.25],[-.14,.98,.93,.02,2.35],[-.32,.93,.9,.05,2.45],[-.48,.86,.87,.09,2.5],[-.64,.78,.83,.12,2.55]];if(i>=e[0][0])return{w:e[0][1],d:e[0][2],cz:e[0][3],e:e[0][4]};const t=e[e.length-1];if(i<=t[0])return{w:t[1],d:t[2],cz:t[3],e:t[4]};for(let n=0;n<e.length-1;n++){const s=e[n],r=e[n+1];if(i<=s[0]&&i>=r[0]){const o=(s[0]-i)/(s[0]-r[0]),a=o*o*(3-2*o);return{w:Ge(s[1],r[1],a),d:Ge(s[2],r[2],a),cz:Ge(s[3],r[3],a),e:Ge(s[4],r[4],a)}}}return{w:t[1],d:t[2],cz:t[3],e:t[4]}}function P1(i){const e=new pe(i.color??1708560),t=i.greying??0;return e.lerp(new pe(10133668),t),new Xt({color:e.convertSRGBToLinear(),roughness:Ge(.66,.34,i.gloss??.35),metalness:.03,clearcoat:Ge(.06,.3,i.gloss??.35),clearcoatRoughness:.5,sheen:.25,sheenColor:new pe(.2,.17,.15),side:Qt})}function L1(i,e,t){e.H;const n=P1(t),s=[],r=[];if(t.style==="bald")return{meshes:s,skinnedGeoms:r};const o=new $t(47645+(t.color??0)),a=R1(e,t);s.push(new qe(a,n));const l=n,c=(f,m,x)=>{const g=new qe(f,l);g.position.copy(m),g.castShadow=!0,s.push(g)},h=e.headW,d=e.headD,u=e.headHi;switch(t.style){case"sidepart":break;case"bob":{const f=new Wt(1,24,18,0,Math.PI*2,0,Math.PI*.82);f.scale(h*1.14,u*1.1,d*1.1);const m=f.getAttribute("position");for(let x=0;x<m.count;x++){const g=m.getY(x),p=we(-g/(u*.9));m.setX(x,m.getX(x)*(1+p*.12)),m.setZ(x,m.getZ(x)*(1+p*.05)-p*p*d*.1),m.setY(x,g-p*p*u*.16)}f.computeVertexNormals(),c(f,new A(0,u*.06,-d*.04));break}case"long":{const f=new Wt(1,24,18,0,Math.PI*2,0,Math.PI*.66);f.scale(h*1.1,u*1.06,d*1.06),c(f,new A(0,u*.1,-d*.02));for(const m of[-1,1]){const x=[];for(let b=0;b<8;b++){const w=b/7;x.push(new A(m*(h*.78+Math.sin(w*2.2)*h*.16),u*.2-w*u*2.4,-d*.35-w*d*.2+Math.sin(w*3)*d*.1))}const p=new ar(new sr(x),14,h*.34,10,!1),T=p.getAttribute("position");for(let b=0;b<T.count;b++){const w=ct(T.getX(b)*60,T.getY(b)*60,3)*h*.06;T.setX(b,T.getX(b)+w),T.setZ(b,T.getZ(b)+w)}p.computeVertexNormals(),c(p,new A(0,0,0))}break}case"ponytail":{const f=new Wt(1,22,16,0,Math.PI*2,0,Math.PI*.64);f.scale(h*1.06,u*1.02,d*1.02),c(f,new A(0,u*.08,0));const m=[],x=7;for(let p=0;p<x;p++){const T=p/(x-1);m.push(new A(o.range(-.06,.06)*h,u*.2-T*u*1.5,-d*.95-T*d*.25))}const g=new ar(new sr(m),12,h*.26,9,!1);c(g,new A(0,0,0));break}case"braid":{const f=new Wt(1,20,14,0,Math.PI*2,0,Math.PI*.6);f.scale(h*1.05,u*1,d*1),c(f,new A(0,u*.08,0));const m=[],x=9;for(let T=0;T<x;T++){const b=T/(x-1);m.push(new A(Math.sin(b*7)*h*.1,u*.1-b*u*1.9,-d*.9-b*d*.15))}const g=new ar(new sr(m),22,h*.23,8,!1),p=g.getAttribute("position");for(let T=0;T<p.count;T++){const b=p.getY(T),w=1+Math.sin(b*220)*.18;p.setX(T,p.getX(T)*w),p.setZ(T,p.getZ(T)*w)}g.computeVertexNormals(),c(g,new A(0,0,0));break}}return{meshes:s,skinnedGeoms:r}}const D1=`
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vLocal = position;
    vUv = uv;
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`,I1=`
  uniform vec3 uColor;
  uniform float uOpacity, uHeight, uRadius, uTime, uNoise, uSoft;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec2 vUv;

  float hash( vec3 p ) {
    p = fract( p * 0.3183099 + 0.1 );
    p *= 17.0;
    return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
  }
  float vnoise( vec3 x ) {
    vec3 i = floor( x ), f = fract( x );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( mix( hash( i ), hash( i + vec3( 1, 0, 0 ) ), f.x ),
                     mix( hash( i + vec3( 0, 1, 0 ) ), hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                mix( mix( hash( i + vec3( 0, 0, 1 ) ), hash( i + vec3( 1, 0, 1 ) ), f.x ),
                     mix( hash( i + vec3( 0, 1, 1 ) ), hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
  }

  void main() {
    // Cone is built pointing down -Y with apex at y = 0.
    float t = clamp( -vLocal.y / uHeight, 0.0, 1.0 );
    float rEdge = mix( 0.02, uRadius, t );
    float r = length( vLocal.xz ) / max( rEdge, 0.0001 );
    float radial = pow( 1.0 - clamp( r, 0.0, 1.0 ), uSoft );
    float along = ( 1.0 - t * 0.82 ) * smoothstep( 0.0, 0.08, t );
    float n = mix( 1.0, vnoise( vWorld * 1.6 + vec3( 0.0, uTime * 0.35, uTime * 0.12 ) ) * 1.5, uNoise );
    float a = radial * along * uOpacity * n;
    gl_FragColor = vec4( uColor, a );
  }
`;class mr{mesh;u;constructor(e={}){const t=e.height??6,n=e.radius??2.2,s=new Cn(.03,n,t,e.segments??24,1,!0);s.translate(0,-t/2,0),this.u={uColor:{value:new pe(e.color??12574975)},uOpacity:{value:e.opacity??.14},uHeight:{value:t},uRadius:{value:n},uTime:{value:0},uNoise:{value:e.noise??.35},uSoft:{value:e.soft??1.6}};const r=new ft({uniforms:this.u,vertexShader:D1,fragmentShader:I1,transparent:!0,depthWrite:!1,blending:Bn,side:Qt});this.mesh=new qe(s,r),this.mesh.renderOrder=6}set opacity(e){this.u.uOpacity.value=e}get opacity(){return this.u.uOpacity.value}update(e){this.u.uTime.value=e}}class cd{mesh;u;constructor(e=2,t=3,n=8,s=14477823,r=.1,o=0){const a=new Sn(e,t,n,1,1,1);a.translate(0,0,-n/2),this.u={uColor:{value:new pe(s)},uOpacity:{value:r},uLen:{value:n},uTime:{value:0},uSlats:{value:o},uSize:{value:new ae(e,t)}};const l=new ft({uniforms:this.u,transparent:!0,depthWrite:!1,blending:Bn,side:Qt,vertexShader:`
        varying vec3 vLocal; varying vec3 vWorld;
        void main() {
          vLocal = position;
          vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,fragmentShader:`
        uniform vec3 uColor; uniform float uOpacity, uLen, uTime, uSlats; uniform vec2 uSize;
        varying vec3 vLocal; varying vec3 vWorld;
        float hash( vec3 p ) { p = fract( p * 0.3183 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
        float vnoise( vec3 x ) {
          vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( mix( hash( i ), hash( i + vec3( 1, 0, 0 ) ), f.x ), mix( hash( i + vec3( 0, 1, 0 ) ), hash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                      mix( mix( hash( i + vec3( 0, 0, 1 ) ), hash( i + vec3( 1, 0, 1 ) ), f.x ), mix( hash( i + vec3( 0, 1, 1 ) ), hash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
        }
        void main() {
          float t = clamp( -vLocal.z / uLen, 0.0, 1.0 );
          vec2 q = abs( vLocal.xy ) / ( uSize * 0.5 );
          float edge = ( 1.0 - smoothstep( 0.55, 1.0, q.x ) ) * ( 1.0 - smoothstep( 0.55, 1.0, q.y ) );
          float slat = uSlats > 0.5 ? ( 0.35 + 0.65 * step( 0.42, fract( vLocal.y * uSlats ) ) ) : 1.0;
          float dust = mix( 0.75, 1.5, vnoise( vWorld * 1.9 + vec3( uTime * 0.12, uTime * 0.2, 0.0 ) ) );
          gl_FragColor = vec4( uColor, edge * ( 1.0 - t * 0.75 ) * uOpacity * slat * dust );
        }
      `});this.mesh=new qe(a,l),this.mesh.renderOrder=6}set opacity(e){this.u.uOpacity.value=e}update(e){this.u.uTime.value=e}}class wr{points;u;constructor(e=700,t=new A(14,5,14),n=13625087,s=.03){const r=new $t(31337),o=new Float32Array(e*3),a=new Float32Array(e);for(let h=0;h<e;h++)o[h*3]=r.range(-t.x/2,t.x/2),o[h*3+1]=r.range(0,t.y),o[h*3+2]=r.range(-t.z/2,t.z/2),a[h]=r.next();const l=new At;l.setAttribute("position",new pn(o,3)),l.setAttribute("iSeed",new pn(a,1)),this.u={uTime:{value:0},uColor:{value:new pe(n)},uSize:{value:s},tSprite:{value:Fo(64,2.4)},uOpacity:{value:.55}};const c=new ft({uniforms:this.u,transparent:!0,depthWrite:!1,blending:Bn,vertexShader:`
        attribute float iSeed;
        uniform float uTime, uSize;
        varying float vFade;
        void main() {
          vec3 p = position;
          float s = iSeed * 6.2831;
          p.x += sin( uTime * 0.22 + s ) * 0.4;
          p.y += sin( uTime * 0.14 + s * 2.1 ) * 0.25;
          p.z += cos( uTime * 0.19 + s * 1.7 ) * 0.4;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          vFade = 0.4 + 0.6 * ( sin( uTime * 0.9 + s * 3.0 ) * 0.5 + 0.5 );
          gl_PointSize = uSize * 320.0 / max( -mv.z, 0.1 );
          gl_Position = projectionMatrix * mv;
        }
      `,fragmentShader:`
        uniform sampler2D tSprite; uniform vec3 uColor; uniform float uOpacity;
        varying float vFade;
        void main() {
          float a = texture2D( tSprite, gl_PointCoord ).a;
          gl_FragColor = vec4( uColor, a * vFade * uOpacity );
        }
      `});this.points=new Yf(l,c),this.points.frustumCulled=!1,this.points.renderOrder=6}set opacity(e){this.u.uOpacity.value=e}update(e){this.u.uTime.value=e}}function pi(i,e=1.4,t=.75){const n=new Mu({map:Fo(128,2.6),color:new pe(i),transparent:!0,blending:Bn,depthWrite:!1,opacity:t}),s=new Ff(n);return s.scale.setScalar(e),s.renderOrder=7,s}const Kh={idle:{armL:[.06,0,.09],armR:[.06,0,-.09],foreArmL:[.14,0,.05],foreArmR:[.14,0,-.05],handL:[0,0,.06],handR:[0,0,-.06],spine:[.012,0,0],chest:[-.02,0,0]},idleAlert:{armL:[.02,0,.055],armR:[.02,0,-.055],foreArmL:[.24,.06,.04],foreArmR:[.24,-.06,-.04],chest:[-.04,0,0],neck:[.02,0,0]},armsCrossed:{armL:[.2,.35,.72],armR:[.2,-.35,-.72],foreArmL:[.1,-.1,1.42],foreArmR:[.1,.1,-1.42],handL:[0,0,.2],handR:[0,0,-.2],chest:[-.05,0,0]},handsBehind:{armL:[-.22,0,.16],armR:[-.22,0,-.16],foreArmL:[.3,-.9,.6],foreArmR:[.3,.9,-.6],chest:[-.06,0,0]},handsPockets:{armL:[.16,0,.2],armR:[.16,0,-.2],foreArmL:[.5,0,.18],foreArmR:[.5,0,-.18],chest:[.03,0,0],spine:[.03,0,0]},sit:{thighL:[-1.42,.06,.05],thighR:[-1.42,-.06,-.05],shinL:[1.36,0,0],shinR:[1.36,0,0],footL:[.2,0,0],footR:[.2,0,0],armL:[.3,0,.12],armR:[.3,0,-.12],foreArmL:[.7,.2,.1],foreArmR:[.7,-.2,-.1],spine:[.04,0,0],chest:[.02,0,0],rootY:-.4},sitLean:{thighL:[-1.36,.1,.06],thighR:[-1.36,-.1,-.06],shinL:[1.3,0,0],shinR:[1.3,0,0],armL:[.55,.1,.3],armR:[.55,-.1,-.3],foreArmL:[1.05,.3,.1],foreArmR:[1.05,-.3,-.1],spine:[.16,0,0],chest:[.1,0,0],neck:[-.14,0,0],rootY:-.4,rootPitch:.06},sitSlump:{thighL:[-1.3,.16,.1],thighR:[-1.3,-.16,-.1],shinL:[1.1,0,0],shinR:[1.15,0,0],armL:[.1,0,.06],armR:[.1,0,-.06],foreArmL:[.3,0,.05],foreArmR:[.3,0,-.05],spine:[.2,0,0],chest:[.14,0,0],neck:[.22,0,0],head:[.16,0,0],rootY:-.42,rootPitch:.1},aim:{armL:[-.2,.5,.5],armR:[-1.15,-.28,-.16],foreArmL:[.6,-.55,.5],foreArmR:[-.2,-.1,-.1],handL:[0,0,.1],handR:[.1,0,0],chest:[-.05,-.16,0],spine:[0,-.1,0],neck:[.04,.1,0]},gunToHead:{armR:[-1.9,-.3,-.9],foreArmR:[-1.1,.2,-.3],armL:[.3,.2,.3],foreArmL:[.9,-.3,.4],chest:[-.02,.06,0]},handsUp:{armL:[-2.5,.2,.5],armR:[-2.5,-.2,-.5],foreArmL:[-.3,0,.2],foreArmR:[-.3,0,-.2],chest:[-.06,0,0],neck:[.06,0,0]},kneel:{thighL:[-1.6,.1,.06],thighR:[-.35,-.06,-.04],shinL:[1.9,0,0],shinR:[.9,0,0],footL:[.6,0,0],footR:[.2,0,0],armL:[.24,0,.14],armR:[.24,0,-.14],foreArmL:[.5,0,.1],foreArmR:[.5,0,-.1],spine:[.08,0,0],rootY:-.46},point:{armR:[-1.25,-.2,-.24],foreArmR:[-.1,0,-.05],armL:[.08,0,.1],foreArmL:[.2,0,.06],chest:[-.03,-.12,0]},holdChild:{armL:[-.5,.55,.7],armR:[-.45,-.5,-.65],foreArmL:[.4,-.5,1.1],foreArmR:[.4,.5,-1.1],chest:[-.04,0,0],spine:[-.03,0,0]},cower:{armL:[-1.1,.5,.9],armR:[-1.1,-.5,-.9],foreArmL:[-.6,-.3,1.5],foreArmR:[-.6,.3,-1.5],spine:[.24,0,0],chest:[.2,0,0],neck:[.16,0,0],head:[.1,0,0],thighL:[-.2,0,0],thighR:[-.2,0,0],shinL:[.3,0,0],shinR:[.3,0,0],rootY:-.06},lean:{armL:[.1,0,.12],armR:[.34,-.1,-.5],foreArmL:[.3,0,.06],foreArmR:[.2,0,-.2],spine:[.02,0,-.1],chest:[0,0,-.06],rootPitch:-.04},reachOut:{armR:[-.95,-.25,-.3],foreArmR:[.16,0,-.06],armL:[.1,0,.12],foreArmL:[.3,0,.06],chest:[-.05,-.1,0],neck:[.04,.05,0]},walk:{},run:{},dead:{spine:[.1,0,.1],chest:[.06,0,.06],neck:[.3,.2,0],head:[.2,.2,0],armL:[.4,0,1.1],armR:[.3,0,-.9],foreArmL:[.2,0,.4],foreArmR:[.2,0,-.3],thighL:[-1.5,.3,.4],thighR:[-1.4,-.2,-.2],shinL:[.6,0,0],shinR:[.4,0,0],rootY:-.82,rootPitch:1.45}},N1={blue:new pe(5228287),yellow:new pe(16761415),red:new pe(16726854),off:new pe(2240568),flicker:new pe(16734780)},oo={neutral:{brow:0,browAngle:0,lid:0,squint:0,jaw:0,mouthWide:0,headTilt:0},smile:{brow:.1,browAngle:.05,lid:.1,squint:.22,jaw:.06,mouthWide:.7,headTilt:.02},sad:{brow:.05,browAngle:.5,lid:.28,squint:.1,jaw:.02,mouthWide:-.2,headTilt:.06},angry:{brow:-.55,browAngle:-.4,lid:.05,squint:.4,jaw:.12,mouthWide:-.35,headTilt:-.03},fear:{brow:.75,browAngle:.55,lid:-.3,squint:-.35,jaw:.3,mouthWide:.2,headTilt:.04},surprise:{brow:.9,browAngle:.2,lid:-.45,squint:-.5,jaw:.42,mouthWide:.1,headTilt:-.02},think:{brow:.18,browAngle:-.15,lid:.2,squint:.16,jaw:0,mouthWide:-.1,headTilt:.05},pain:{brow:-.3,browAngle:.45,lid:.55,squint:.6,jaw:.22,mouthWide:-.3,headTilt:.08}};class yr{spec;group=new yt;rigRoot=new yt;body;garments=[];skeleton;rig;dims;landmarks;eyes;led;ledGlow;ledMaterial;skinMat;faceMat;morphIndex;restQuats=new Map;restPos=new Map;pose="idle";prevPose="idle";poseBlend=1;poseBlendDur=.5;rng;breathPhase;swayPhase;blinkTimer;blinkT=-1;lidTarget=0;lidNow=0;gazeTarget=null;gazeWeight=0;gazeWeightTarget=0;headYaw=0;headPitch=0;headYawT=0;headPitchT=0;saccade=new ae;saccadeTimer=0;talkT=-1;talkDur=0;talkSeed=0;talkIntensity=1;jawNow=0;expr={...oo.neutral};exprTarget={...oo.neutral};ledState="blue";ledPulse=0;walkPhase=0;walkSpeed=0;walkBlend=0;gesture={t:-1,dur:0,kind:0,amp:1};shiver=0;headTargetObj=null;moveQueue=null;constructor(e,t=1){this.spec=e,this.rng=new $t((e.seed??1)*7919+e.id.length),this.breathPhase=this.rng.next()*ci,this.swayPhase=this.rng.next()*ci,this.blinkTimer=this.rng.range(1.5,4.5),this.saccadeTimer=this.rng.range(.4,1.6);const n=h1(e,t);this.rig=n.rig,this.dims=n.dims??lc(e),this.landmarks=n.landmarks,this.skinMat=t1({tone:e.skinTone,size:t>=1?512:256}),this.faceMat=n1({tone:e.skinTone??[.72,.53,.44],uvl:n.uvLandmarks,female:e.female,age:e.face?.age,stubble:e.face?.stubble??(e.female?0:.18),browColor:e.hair?.color??1708560,browThickness:e.female?.75:1.1,size:t>=1?1024:512}),this.morphIndex=new Map(n.morphNames.map((a,l)=>[a,l])),this.body=new va(n.geometry,[this.skinMat,this.faceMat]),this.body.castShadow=!0,this.body.receiveShadow=!0,this.body.frustumCulled=!1,this.body.name=`${e.id}-body`,this.rigRoot.add(this.rig.root),this.rigRoot.add(this.body),this.group.add(this.rigRoot),this.group.name=e.id,this.skeleton=new Zl(this.rig.bones),this.body.bind(this.skeleton);for(const a of this.rig.bones)this.restQuats.set(a.name,a.quaternion.clone()),this.restPos.set(a.name,a.position.clone());const s=v1(n.geometry,this.dims,e.outfit);for(const a of s.pieces)if(a.skinned){const l=new va(a.geometry,a.material);l.castShadow=a.castShadow??!0,l.receiveShadow=!0,l.frustumCulled=!1,l.name=`${e.id}-${a.name}`,this.rigRoot.add(l),l.bind(this.skeleton),this.garments.push(l)}else{const l=new qe(a.geometry,a.material);l.castShadow=a.castShadow??!1,l.name=`${e.id}-${a.name}`;const c=this.rig.byName[a.bone??"chest"];this.rig.restWorld.get(a.bone??"chest"),l.position.copy(a.offset??new A),l.position.y+=0,c.add(l)}for(const a of[-1,1]){const l=a<0?"L":"R",c=new qe(p1(this.dims,a,e.hands??"relaxed"),this.skinMat);c.castShadow=!0,c.frustumCulled=!1,this.rig.byName[`hand${l}`].add(c);const h=new qe(m1(this.dims),this.shoeMaterial(e));h.castShadow=!0,h.position.set(0,-.012*this.dims.H,0),this.rig.byName[`foot${l}`].add(h)}const r=this.rig.restWorld.get("head"),o={};for(const[a,l]of Object.entries(this.landmarks))o[a]=l.clone().sub(r);if(this.eyes=T1(this.dims,o,this.skinMat,e.face?.eyeColor??7311014),this.rig.byName.head.add(this.eyes.group),e.hair){const a=L1(n.geometry,this.dims,e.hair);for(const l of a.skinnedGeoms){const c=new va(l,U1(e));c.castShadow=!0,c.frustumCulled=!1,c.name=`${e.id}-scalp`,this.rigRoot.add(c),c.bind(this.skeleton),this.garments.push(c)}for(const l of a.meshes)l.position.add(this.landmarks.headCenter.clone().sub(r)),this.rig.byName.head.add(l)}if(e.android?.led){const a=b1(this.dims,e.android.ledColor??5228287);this.led=a.mesh,this.ledMaterial=a.material;const l=this.landmarks.headCenter.clone().sub(r);this.led.position.set(-this.dims.headW*.9,l.y+this.dims.headHi*.2,l.z+this.dims.headD*.3),this.led.rotation.y=-Math.PI/2.35,this.led.rotation.z=.08,this.rig.byName.head.add(this.led),this.ledGlow=pi(e.android.ledColor??5228287,.022*this.dims.H,.4),this.ledGlow.position.copy(this.led.position),this.rig.byName.head.add(this.ledGlow)}this.applyPoseImmediate("idle")}shoeMaterial(e){const t=new Xt({color:new pe(856083).convertSRGBToLinear(),roughness:.42,metalness:.05,clearcoat:.6,clearcoatRoughness:.3});return e.outfit.kind==="androidSuit"?i1(2237995):t}setPosition(e,t,n){return this.group.position.set(e,t,n),this}setRotationY(e){return this.group.rotation.y=e,this}get position(){return this.group.position}worldPoint(e,t=new A){const n=this.landmarks[e];if(!n)return t.copy(this.group.position);if(this.group.updateWorldMatrix(!0,!0),e==="eyeL"||e==="eyeR"||e==="mouth"||e==="headCenter"||e==="noseTip"){const s=this.rig.restWorld.get("head"),r=n.clone().sub(s);return this.rig.byName.head.localToWorld(t.copy(r))}return this.group.localToWorld(t.copy(n))}eyeLine(e=new A){return this.worldPoint("headCenter",e)}setPose(e,t=.55){return e===this.pose?this:(this.prevPose=this.pose,this.pose=e,this.poseBlend=0,this.poseBlendDur=Math.max(.001,t),this)}applyPoseImmediate(e){return this.prevPose=e,this.pose=e,this.poseBlend=1,this}get currentPose(){return this.pose}setExpression(e,t=1){const n=oo[e],s=oo.neutral;return this.exprTarget={brow:Ge(s.brow,n.brow,t),browAngle:Ge(s.browAngle,n.browAngle,t),lid:Ge(s.lid,n.lid,t),squint:Ge(s.squint,n.squint,t),jaw:Ge(s.jaw,n.jaw,t),mouthWide:Ge(s.mouthWide,n.mouthWide,t),headTilt:Ge(s.headTilt,n.headTilt,t)},this}say(e,t=1,n=!0){return this.talkT=0,this.talkDur=e,this.talkSeed=this.rng.next()*100,this.talkIntensity=t,n&&this.rng.chance(.72)&&this.playGesture(this.rng.int(0,3),e*.8,t),this}stopTalking(){return this.talkT=-1,this}get isTalking(){return this.talkT>=0&&this.talkT<this.talkDur}playGesture(e,t=1.2,n=1){return this.gesture={t:0,dur:t,kind:e,amp:n},this}lookAt(e,t=1){return e===null?(this.gazeTarget=null,this.headTargetObj=null,this.gazeWeightTarget=0,this):(e instanceof yr?(this.headTargetObj=null,this.gazeTarget=e.eyeLine(new A),this.trackCharacter=e):e instanceof Tt?(this.headTargetObj=e,this.trackCharacter=null):(this.gazeTarget=e.clone(),this.headTargetObj=null,this.trackCharacter=null),this.gazeWeightTarget=t,this)}trackCharacter=null;setLed(e){return this.ledState=e,this.ledPulse=0,this}get ledStateName(){return this.ledState}setShiver(e){return this.shiver=e,this}walkTo(e,t,n=1.15,s=!0){return this.moveQueue={to:new A(e,this.group.position.y,t),speed:n,face:s},this}drive(e,t,n){return this.driveDir.set(e,t),this.driveSpeed=n,this.driveDir.lengthSq()>1e-6&&(this.moveQueue=null),this}driveDir=new ae;driveSpeed=0;get plannedStep(){return this.driveDir}get isMoving(){return this.moveQueue!==null}stopMoving(){return this.moveQueue=null,this.walkSpeed=0,this}update(e,t){const n=this.rig.byName;for(const M of this.rig.bones){const y=this.restQuats.get(M.name);y&&M.quaternion.copy(y)}if(this.rigRoot.position.set(0,0,0),this.rigRoot.rotation.set(0,0,0),this.driveDir.lengthSq()>1e-6){const M=Math.atan2(this.driveDir.x,this.driveDir.y);this.group.rotation.y=Zh(this.group.rotation.y,M,9,e),this.walkSpeed=Jt(this.walkSpeed,this.driveSpeed,9,e),this.driveDir.set(0,0)}else if(this.moveQueue){const M=this.moveQueue.to,y=this.group.position,v=M.x-y.x,E=M.z-y.z,C=Math.hypot(v,E);if(C<.06)this.moveQueue=null,this.walkSpeed=Jt(this.walkSpeed,0,8,e);else{const P=Math.min(this.moveQueue.speed,C*2.4),D=v/C,N=E/C;if(y.x+=D*P*e,y.z+=N*P*e,this.moveQueue.face){const z=Math.atan2(D,N);this.group.rotation.y=Zh(this.group.rotation.y,z,6,e)}this.walkSpeed=Jt(this.walkSpeed,P,6,e)}}else this.walkSpeed=Jt(this.walkSpeed,0,8,e);this.walkBlend=Jt(this.walkBlend,this.walkSpeed>.08?1:0,7,e),this.walkPhase+=e*(2.6+this.walkSpeed*1.9),this.poseBlend=Math.min(1,this.poseBlend+e/this.poseBlendDur);const s=Ku.inOutCubic(this.poseBlend),r=Kh[this.prevPose],o=Kh[this.pose],a=(M,y)=>{if(!(y<=0))for(const[v,E]of Object.entries(M)){if(v==="rootY"||v==="rootPitch")continue;const C=n[v];if(!C)continue;const[P,D,N]=E,z=new Ki().setFromEuler(new fi(P*y,D*y,N*y));C.quaternion.multiply(z)}};a(r,1-s),a(o,s);const l=Ge(r.rootY??0,o.rootY??0,s),c=Ge(r.rootPitch??0,o.rootPitch??0,s);this.rigRoot.position.y+=l,this.rigRoot.rotation.x+=c;const h=Math.sin(t*1.05+this.breathPhase),d=1-this.walkBlend*.4;n.chest.rotateX(h*.014*d),n.spine.rotateX(-h*.008*d),n.chest.scale.setScalar(1+h*.004*d);const u=Math.sin(t*.42+this.swayPhase),f=Math.sin(t*.27+this.swayPhase*1.7),m=(1-this.walkBlend)*(this.pose==="sit"||this.pose==="sitLean"||this.pose==="dead"?.25:1);if(n.hips.rotateZ(u*.012*m),n.spine.rotateZ(-u*.008*m),n.chest.rotateY(f*.014*m),this.rigRoot.position.x+=u*.004*m,this.shiver>0){const M=this.shiver,y=t*26;n.chest.rotateZ(Math.sin(y)*.006*M),n.head.rotateZ(Math.sin(y*1.3)*.008*M),n.armL.rotateZ(Math.sin(y*.9)*.01*M),n.armR.rotateZ(-Math.sin(y*1.1)*.01*M)}if(this.walkBlend>.001){const M=this.walkBlend,y=this.walkPhase,v=.55*M;n.thighL.rotateX(Math.sin(y)*v),n.thighR.rotateX(Math.sin(y+Math.PI)*v),n.shinL.rotateX(we(-Math.sin(y-.5),0,1)*.85*M),n.shinR.rotateX(we(-Math.sin(y+Math.PI-.5),0,1)*.85*M),n.footL.rotateX(Math.sin(y+.9)*.22*M),n.footR.rotateX(Math.sin(y+Math.PI+.9)*.22*M),n.armL.rotateX(Math.sin(y+Math.PI)*.42*M),n.armR.rotateX(Math.sin(y)*.42*M),n.foreArmL.rotateX(.2*M+we(Math.sin(y+Math.PI),0,1)*.3*M),n.foreArmR.rotateX(.2*M+we(Math.sin(y),0,1)*.3*M),n.chest.rotateY(Math.sin(y)*.06*M),n.hips.rotateY(-Math.sin(y)*.09*M),this.rigRoot.position.y+=(Math.abs(Math.sin(y))*.024-.012)*M}if(this.gesture.t>=0){this.gesture.t+=e;const M=this.gesture,y=we(M.t/M.dur),v=Math.sin(y*Math.PI)*M.amp;y>=1&&(this.gesture.t=-1);const E=Math.sin(M.t*6.2)*.5+.5;switch(M.kind){case 0:n.armR.rotateX(-.42*v),n.armR.rotateZ(-.16*v),n.foreArmR.rotateX(-.3*v*(.6+E*.4)),n.foreArmR.rotateY(-.3*v);break;case 1:n.armR.rotateX(-.3*v),n.armL.rotateX(-.3*v),n.foreArmR.rotateX(-.45*v*(.5+E*.5)),n.foreArmL.rotateX(-.45*v*(.5+E*.5)),n.foreArmR.rotateY(-.24*v),n.foreArmL.rotateY(.24*v);break;case 2:n.armR.rotateX(-.24*v),n.foreArmR.rotateX(-.5*v),n.foreArmR.rotateZ(-.2*Math.sin(M.t*9)*v);break;default:n.shoulderL.rotateZ(.12*v),n.shoulderR.rotateZ(-.12*v),n.chest.rotateY(Math.sin(M.t*4.4)*.05*v);break}}if(this.trackCharacter&&(this.gazeTarget=this.trackCharacter.eyeLine(this.gazeTarget??new A)),this.headTargetObj&&(this.gazeTarget=this.gazeTarget??new A,this.headTargetObj.getWorldPosition(this.gazeTarget)),this.gazeWeight=Jt(this.gazeWeight,this.gazeWeightTarget,3.4,e),this.gazeTarget&&this.gazeWeight>.001){const M=this.eyeLine(new A),y=this.group.worldToLocal(this.gazeTarget.clone()),v=this.group.worldToLocal(M.clone()),E=y.x-v.x,C=y.y-v.y,P=y.z-v.z,D=Math.atan2(E,Math.max(.001,P)),N=-Math.atan2(C,Math.hypot(E,P));this.headYawT=we(D,-1.35,1.35),this.headPitchT=we(N,-.6,.6)}else this.headYawT=0,this.headPitchT=0;this.headYaw=Jt(this.headYaw,this.headYawT*this.gazeWeight,5.5,e),this.headPitch=Jt(this.headPitch,this.headPitchT*this.gazeWeight,5.5,e);const x=this.headYaw,g=this.headPitch;n.chest.rotateY(x*.16),n.neck.rotateY(x*.3),n.head.rotateY(x*.54),n.neck.rotateX(g*.34),n.head.rotateX(g*.66);for(const M of Object.keys(this.expr))this.expr[M]=Jt(this.expr[M],this.exprTarget[M],5,e);n.head.rotateZ(this.expr.headTilt),this.blinkTimer-=e,this.blinkTimer<=0&&this.blinkT<0&&(this.blinkT=0,this.blinkTimer=this.rng.range(2.2,6.5)*(this.isTalking?.6:1));let p=0;if(this.blinkT>=0){this.blinkT+=e;const M=.13;p=this.blinkT<M*.4?this.blinkT/(M*.4):1-(this.blinkT-M*.4)/(M*.6),p=we(p),this.blinkT>M&&(this.blinkT=-1)}this.lidTarget=we(this.expr.lid+p*(1-this.expr.lid*.4)),this.lidNow=Jt(this.lidNow,this.lidTarget,22,e);const T=.2;for(let M=0;M<this.eyes.upperLids.length;M++)this.eyes.upperLids[M].rotation.x=T+this.lidNow*.72+this.expr.squint*.07,this.eyes.lowerLids[M].rotation.x=-.3+this.expr.squint*.16+this.lidNow*.1;{const M=this.body.morphTargetInfluences;if(M){const y=(v,E)=>{const C=this.morphIndex.get(v);C!==void 0&&(M[C]=we(E))};y("browUp",we(this.expr.brow)+we(this.expr.browAngle)*.45),y("browAngry",we(-this.expr.brow)),y("squint",we(this.expr.squint)),y("smile",we(this.expr.mouthWide)),y("frown",we(-this.expr.mouthWide)),y("mouthOpenWide",we(this.expr.jaw*1.1+this.jawNow*.5))}}this.saccadeTimer-=e,this.saccadeTimer<=0&&(this.saccadeTimer=this.rng.range(.5,2.4),this.saccade.set(this.rng.normal(0,.035),this.rng.normal(0,.022)));const b=we(this.headYaw*.5+this.saccade.x,-.5,.5),w=we(this.headPitch*.45+this.saccade.y,-.35,.35);for(const M of this.eyes.pivots)M.rotation.y=Jt(M.rotation.y,b,14,e),M.rotation.x=Jt(M.rotation.x,w,14,e);let S=this.expr.jaw*.18;if(this.talkT>=0)if(this.talkT+=e,this.talkT>this.talkDur)this.talkT=-1;else{const M=this.talkSeed,y=Math.sin(this.talkT*11.3+M)*.5+.5,v=Math.sin(this.talkT*6.7+M*2.1)*.5+.5,E=Math.sin(this.talkT*19.1+M*3.3)*.5+.5,C=gt(0,.12,this.talkT)*gt(this.talkDur,this.talkDur-.18,this.talkT),P=we((y*.5+v*.35+E*.15)*C*this.talkIntensity);S+=P*.3,n.head.rotateX(Math.sin(this.talkT*5.1+M)*.012*C),n.head.rotateY(Math.sin(this.talkT*3.3+M*1.5)*.016*C)}if(this.jawNow=Jt(this.jawNow,S,18,e),n.jaw.rotation.set(this.jawNow,0,0),n.jaw.position.copy(this.restPos.get("jaw")).add(new A(0,-this.jawNow*.006*this.dims.H,0)),this.ledMaterial){this.ledPulse+=e;const M=this.ledState,y=N1[M];let v=2.2;M==="blue"?v=2+Math.sin(t*2.1)*.35:M==="yellow"?v=2.4+Math.sin(t*9.5)*.9:M==="red"?v=2.9+Math.sin(t*17)*1.4:M==="off"?v=.04:M==="flicker"&&(v=this.rng.chance(.4)?3.6:.3),this.ledMaterial.emissive.copy(y),this.ledMaterial.emissiveIntensity=v,this.ledGlow&&(this.ledGlow.material.color.copy(y),this.ledGlow.material.opacity=we(v/4)*.6)}}dispose(){this.group.traverse(e=>{e.geometry?.dispose?.()})}}function U1(i){const e=new pe(i.hair?.color??1708560),t=i.hair?.greying??0;return e.lerp(new pe(10133668),t),new Xt({color:e.convertSRGBToLinear(),roughness:Ge(.85,.6,i.hair?.gloss??.35),metalness:0,clearcoat:Ge(.05,.22,i.hair?.gloss??.35),clearcoatRoughness:.55,sheen:.5,sheenColor:new pe(.4,.34,.3)})}function Zh(i,e,t,n){let s=e-i;for(;s>Math.PI;)s-=ci;for(;s<-Math.PI;)s+=ci;return i+s*(1-Math.exp(-t*n))}const In={porcelain:[.72,.56,.5],fair:[.66,.48,.41],light:[.58,.42,.34],olive:[.5,.36,.27],tan:[.44,.3,.22],brown:[.32,.21,.15]},Ds={connor:{id:"connor",name:"NOAH",height:1.82,build:.42,skinTone:In.fair,hair:{style:"sidepart",color:1774352,gloss:.62},face:{jaw:.28,cheek:.18,browHeavy:.32,noseLength:.1,noseWidth:-.05,lipFull:.05,eyeSpacing:-.05,chin:.3,age:28,eyeColor:8022606},outfit:{kind:"androidSuit",primary:4213849,secondary:3225406,accent:3909631,armband:!0},android:{led:!0,ledColor:5228287,model:"RK-800",serial:"#313 248 317 - 51"},hands:"relaxed",seed:11},hank:{id:"hank",name:"LT. BURKE",height:1.86,build:.72,skinTone:In.light,hair:{style:"long",color:9080723,gloss:.2,greying:.72},face:{jaw:.6,cheek:-.15,browHeavy:.72,noseLength:.28,noseWidth:.35,lipFull:-.15,chin:.42,age:56,eyeColor:5205380},outfit:{kind:"trenchcoat",primary:5524547,secondary:3685186,accent:7107964},hands:"relaxed",seed:27},kara:{id:"kara",name:"ELSIE",height:1.68,build:.3,female:!0,skinTone:In.porcelain,hair:{style:"bob",color:2759957,gloss:.55},face:{jaw:-.4,cheek:.5,browHeavy:-.35,noseLength:-.1,noseWidth:-.3,lipFull:.55,eyeSize:.15,eyeSpacing:.05,chin:-.15,age:25,eyeColor:7316152},outfit:{kind:"maidUniform",primary:5533060,secondary:3819868,accent:5228287,armband:!0},android:{led:!0,ledColor:5228287,model:"AX-400",serial:"#579 102 694 - 12"},hands:"open",seed:5},alice:{id:"alice",name:"MILA",height:1.28,build:.24,female:!0,skinTone:In.fair,hair:{style:"braid",color:3876892,gloss:.4},face:{jaw:-.6,cheek:.7,browHeavy:-.6,noseLength:-.4,noseWidth:-.4,lipFull:.4,eyeSize:.4,eyeSpacing:.12,chin:-.4,age:9,eyeColor:6061974},outfit:{kind:"winterCoat",primary:15697007,secondary:5528165,accent:14201994},hands:"relaxed",seed:3},deviant:{id:"deviant",name:"VICTOR",height:1.78,build:.38,skinTone:In.olive,hair:{style:"buzz",color:1314830,gloss:.3},face:{jaw:.35,cheek:-.2,browHeavy:.5,noseLength:.15,noseWidth:.2,lipFull:-.05,chin:.25,age:34,eyeColor:10467012},outfit:{kind:"androidSuit",primary:6383728,secondary:4014921,accent:16734780,armband:!0},android:{led:!0,ledColor:16726854,model:"PL-600",serial:"#501 743 923 - 06",damaged:.7},hands:"grip",seed:17},emma:{id:"emma",name:"EMMA",height:1.32,build:.26,female:!0,skinTone:In.porcelain,hair:{style:"ponytail",color:13215850,gloss:.5},face:{jaw:-.55,cheek:.65,browHeavy:-.55,noseLength:-.35,noseWidth:-.35,lipFull:.35,eyeSize:.35,chin:-.35,age:10,eyeColor:8893641},outfit:{kind:"dress",primary:16777215,secondary:16777215,accent:16777215},hands:"open",seed:9},markus:{id:"markus",name:"SABLE",height:1.84,build:.55,skinTone:In.brown,hair:{style:"buzz",color:985865,gloss:.35},face:{jaw:.5,cheek:.35,browHeavy:.45,noseLength:.05,noseWidth:.3,lipFull:.35,chin:.35,age:33,eyeColor:7311198},outfit:{kind:"trenchcoat",primary:3822689,secondary:2964035,accent:5228287,armband:!0},android:{led:!0,ledColor:5228287,model:"RK-200",serial:"#684 842 971 - 00"},hands:"open",seed:21},captain:{id:"captain",name:"CAPT. DIAZ",height:1.74,build:.62,female:!0,skinTone:In.tan,hair:{style:"ponytail",color:1512208,gloss:.45,greying:.25},face:{jaw:.1,cheek:.25,browHeavy:.1,noseLength:.1,noseWidth:.05,lipFull:.2,chin:.1,age:47,eyeColor:4864556},outfit:{kind:"uniform",primary:3885916,secondary:2963267,accent:13214247},hands:"relaxed",seed:33},todd:{id:"todd",name:"VOSS",height:1.83,build:.85,skinTone:In.light,hair:{style:"short",color:2827040,gloss:.15,greying:.3},face:{jaw:.7,cheek:-.3,browHeavy:.8,noseLength:.35,noseWidth:.45,lipFull:-.25,chin:.5,age:49,eyeColor:5268078,stubble:.7},outfit:{kind:"tshirt",primary:8680808,secondary:4739161},hands:"fist",seed:41},suspect:{id:"suspect",name:"HK-400",height:1.79,build:.44,skinTone:In.light,hair:{style:"short",color:1643539,gloss:.4},face:{jaw:.2,cheek:.05,browHeavy:.35,noseLength:.05,noseWidth:.1,lipFull:0,chin:.2,age:31,eyeColor:9414323},outfit:{kind:"androidSuit",primary:7041916,secondary:4607060,accent:10135216,armband:!0},android:{led:!0,ledColor:16761415,model:"HK-400",serial:"#329 004 715 - 51",damaged:.35},hands:"relaxed",seed:63},protester:{id:"protester",name:"ANDROID",height:1.76,build:.45,skinTone:In.olive,hair:{style:"short",color:1709330,gloss:.35},outfit:{kind:"androidSuit",primary:5463400,secondary:3818057,accent:5228287,armband:!0},android:{led:!0,ledColor:5228287,model:"WR-600"},seed:77}};function O1(i,e){const t=i.quality,n=new Ji;n.background=new pe(1185824);const s=new zt(30,16/9,.05,40),r=(e.get("who")??"connor").split(",").filter(Boolean),o=e.get("expr")??"neutral",a=e.get("pose")??"idle",l=r.length>1,c=e.get("angles"),h=c?c.split(",").map(Number):l?r.map(()=>0):[0,.5,1.15,2.9],d=l?r:r.concat(r,r,r).slice(0,4),u=e.get("frame")==="full",f=Number(e.get("gap")??(u?.85:.3)),m=[],x=d.length;for(let J=0;J<x;J++){const se=new yr(Ds[d[J]]??Ds.connor,t.characterSegments);se.setPosition((J-(x-1)/2)*f,0,0),se.setRotationY(h[J]??0),se.applyPoseImmediate(a),se.setExpression(o,Number(e.get("exprw")??1)),e.get("talk")&&se.say(90,1,!1),n.add(se.group),m.push(se)}const g=(e.get("hide")??"").split(",").filter(Boolean),p=(e.get("only")??"").split(",").filter(Boolean);if(g.length||p.length)for(const J of m)J.group.traverse(se=>{if(!se.isMesh&&!se.isSkinnedMesh)return;const k=se.name||"",X=k.includes("-")?k.slice(k.indexOf("-")+1):k;g.some(W=>W&&X.includes(W))&&(se.visible=!1),p.length&&!p.some(W=>W&&X.includes(W))&&(se.visible=!1)});const T=e.get("mat");if(T==="clay"||T==="normal"){const J=new _n({roughness:.62,metalness:0});J.color=new pe(9277332).convertSRGBToLinear();const se=new Uu({flatShading:!1}),k=T==="normal"?se:J;for(const X of m)X.group.traverse(W=>{const he=W;(he.isMesh||he.isSkinnedMesh)&&(he.material=k)})}const b=m[0].eyeLine(new A).y,w=m[0].dims.H,S=Number(e.get("fov")??30),M=16/9,y=Math.tan(S*Math.PI/180*.5),v=(x-1)*f+(u?.75:.26),E=u?w*1.08:.34,C=v/(2*y*M),P=E/(2*y),D=Math.max(C,P)+.12,N=u?w*.52:b;s.position.set(0,N,D),s.lookAt(0,N,0),s.fov=S,s.updateProjectionMatrix();const z=new A(0,N,0),I=(J,se,k)=>{const X=J*Math.PI/180,W=se*Math.PI/180;return new A(Math.sin(X)*Math.cos(W)*k,N+Math.sin(W)*k,Math.cos(X)*Math.cos(W)*k)},V=e.get("shadow")==="1",O=(J,se,k,X,W)=>{const he=new nc(J,se);if(he.position.copy(I(k,X,4)),he.target.position.copy(z),W&&V){he.castShadow=!0,he.shadow.mapSize.set(2048,2048);const ue=1.4;he.shadow.camera.left=-ue,he.shadow.camera.right=ue,he.shadow.camera.top=ue,he.shadow.camera.bottom=-ue,he.shadow.camera.near=.5,he.shadow.camera.far=9,he.shadow.bias=-2e-4,he.shadow.normalBias=.004,he.shadow.radius=2}return he},G=O(16774376,4.2,-36,24,!0),q=O(10338528,3.4,48,6,!1),re=O(13625599,2.6,156,26,!1),ne=new Ns(7179432,2765112,5);if(n.add(G,G.target,q,q.target,re,re.target,ne),e.get("probe")==="1"){const J=new _n({roughness:.6,metalness:0});J.color=new pe(9277332).convertSRGBToLinear();const se=new qe(new Wt(.1,32,24),J);se.position.set(v*.5-.06,N,.1),se.castShadow=!0,se.receiveShadow=!0,n.add(se);const k=new qe(new Sn(.14,.14,.14),J);k.position.set(-v*.5+.06,N,.1),k.castShadow=!0,k.receiveShadow=!0,n.add(k)}const ce=new qe(new Gt(30,18),new _n({color:857115,roughness:.95}));ce.position.set(0,N,-2.6),n.add(ce);const Te=new qe(new Gt(30,30),new _n({color:1120287,roughness:.8}));if(Te.rotation.x=-Math.PI/2,Te.receiveShadow=!0,n.add(Te),e.get("lookcam"))for(const J of m)J.lookAt(s.position.clone(),1);return{name:"heads",scene:n,camera:s,update(J,se){for(const k of m)k.update(J,se);i.fx.focusTarget=D,i.fx.aperture=Number(e.get("ap")??.2)},applyLook(J){J.setBloom(.14,.7,1.6),J.setStreak(.04),J.highlightCeiling=8,J.applyLook({uExposure:Number(e.get("exp")??1),uSplit:.05,uVignette:.2,uGrain:.01,uHalation:.02,uCA:3e-4,uBarrel:0}),J.wetLens=0},dispose(){for(const J of m)J.dispose()}}}class Ho{mesh;u;constructor(e={}){this.u={uTop:{value:new pe(e.top??329743)},uHorizon:{value:new pe(e.horizon??1451834)},uGround:{value:new pe(e.ground??461584)},uClouds:{value:e.clouds??.6},uCloudColor:{value:new pe(e.cloudColor??2767952)},uSun:{value:(e.sun??new A(-.4,.35,-1)).clone().normalize()},uSunColor:{value:new pe(e.sunColor??10470632)},uSunSize:{value:e.sunSize??.02},uIntensity:{value:e.intensity??1},uTime:{value:0},uCityGlow:{value:e.cityGlow??.5},uCityGlowColor:{value:new pe(e.cityGlowColor??3560302)}};const t=new ft({uniforms:this.u,side:fn,depthWrite:!1,vertexShader:`
        varying vec3 vDir;
        void main() {
          vDir = normalize( position );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,fragmentShader:`
        uniform vec3 uTop, uHorizon, uGround, uCloudColor, uSun, uSunColor, uCityGlowColor;
        uniform float uClouds, uSunSize, uIntensity, uTime, uCityGlow;
        varying vec3 vDir;

        float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float vnoise( vec2 p ) {
          vec2 i = floor( p ), f = fract( p );
          f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y );
        }
        float fbm( vec2 p ) {
          float a = 0.5, s = 0.0, n = 0.0;
          for ( int i = 0; i < 5; i++ ) { s += a * vnoise( p ); n += a; a *= 0.5; p *= 2.03; }
          return s / n;
        }

        void main() {
          vec3 d = normalize( vDir );
          float h = d.y;
          vec3 col = mix( uHorizon, uTop, pow( clamp( h, 0.0, 1.0 ), 0.55 ) );
          col = mix( col, uGround, smoothstep( 0.0, -0.25, h ) );

          // Light pollution glow hugging the horizon.
          col += uCityGlowColor * uCityGlow * pow( clamp( 1.0 - abs( h ) * 3.2, 0.0, 1.0 ), 2.2 );

          // Overcast deck: project onto a plane above the camera.
          if ( h > 0.005 ) {
            vec2 p = d.xz / ( h + 0.18 ) * 0.55;
            float c = fbm( p * 1.1 + vec2( uTime * 0.004, uTime * 0.002 ) );
            float c2 = fbm( p * 2.6 - vec2( uTime * 0.007, 0.0 ) );
            float cover = smoothstep( 0.35, 0.85, c * 0.65 + c2 * 0.35 );
            float fade = smoothstep( 0.0, 0.35, h );
            col = mix( col, uCloudColor, cover * uClouds * fade );
            // Thin breaks where the moon shows through.
            float breaks = smoothstep( 0.72, 0.95, c2 ) * ( 1.0 - cover );
            col += uSunColor * breaks * 0.18 * fade;
          }

          float sd = max( dot( d, uSun ), 0.0 );
          col += uSunColor * pow( sd, 1.0 / max( uSunSize, 0.0005 ) ) * 1.6;
          col += uSunColor * pow( sd, 5.0 ) * 0.12;

          gl_FragColor = vec4( col * uIntensity, 1.0 );
        }
      `});this.mesh=new qe(new Wt(1,40,24),t),this.mesh.scale.setScalar(900),this.mesh.frustumCulled=!1,this.mesh.renderOrder=-1,this.mesh.name="sky"}update(e){this.u.uTime.value=e}set intensity(e){this.u.uIntensity.value=e}buildEnvironment(e,t){const n=new Ji,s=this.mesh.clone();if(s.scale.setScalar(80),n.add(s),t)for(const a of t)n.add(a.clone());const r=new Cl(e);r.compileEquirectangularShader();const o=r.fromScene(n,.04,.1,200);return r.dispose(),o.texture}}function ui(i,e,t,n,s,r=!0){const o=new qe(new Gt(t,n),new Co({color:new pe(i).multiplyScalar(e),side:Qt}));return o.position.copy(s),r&&o.lookAt(0,s.y*.5,0),o}function Rn(i,e={}){const t=new Eo(e.color??16777215,e.intensity??40,e.distance??24,e.angle??.62,e.penumbra??.65,e.decay??1.7);t.position.copy(e.position??new A(2,3.4,2)),t.target.position.copy(e.target??new A(0,1.4,0));const n=(e.shadow??!0)&&i.shadowMapSize>0;return t.castShadow=n,n&&(t.shadow.mapSize.set(i.shadowMapSize,i.shadowMapSize),t.shadow.bias=e.shadowBias??-9e-4,t.shadow.normalBias=.022,t.shadow.radius=i.softShadows?e.radius??3.2:1,t.shadow.camera.near=e.near??.4,t.shadow.camera.far=e.far??e.distance??24,t.shadow.blurSamples=i.softShadows?12:4),t}function Ul(i,e={}){const t=new nc(e.color??12375278,e.intensity??.9);t.position.copy(e.position??new A(-8,14,-6)),t.target.position.copy(e.target??new A(0,1,0));const n=(e.shadow??!0)&&i.shadowMapSize>0;if(t.castShadow=n,n){const s=e.area??12;t.shadow.mapSize.set(i.shadowMapSize,i.shadowMapSize),t.shadow.camera.left=-s,t.shadow.camera.right=s,t.shadow.camera.top=s,t.shadow.camera.bottom=-s,t.shadow.camera.near=.5,t.shadow.camera.far=e.far??60,t.shadow.bias=e.shadowBias??-6e-4,t.shadow.normalBias=.03,t.shadow.radius=i.softShadows?e.radius??2.4:1,t.shadow.blurSamples=i.softShadows?10:4}return t}function k1(i,e,t={}){const n=new yt,s=t.distance??3.2,r=(t.keyDir??new A(-.8,.85,.9)).clone().normalize(),o=(t.rimDir??new A(.7,.6,-1)).clone().normalize(),a=Rn(i,{color:t.keyColor??16773341,intensity:t.keyIntensity??26,position:e.clone().addScaledVector(r,s),target:e.clone(),angle:.62,penumbra:.75,distance:s*4}),l=Rn(i,{color:t.rimColor??9423103,intensity:t.rimIntensity??34,position:e.clone().addScaledVector(o,s*1.1),target:e.clone(),angle:.5,penumbra:.9,distance:s*4,shadow:!1}),c=Rn(i,{color:t.fillColor??4283770,intensity:t.fillIntensity??8,position:e.clone().add(new A(s*.9,-.2,s*.6)),target:e.clone(),angle:.9,penumbra:1,distance:s*5,shadow:!1});return n.add(a,a.target,l,l.target,c,c.target),{key:a,rim:l,fill:c,group:n}}class dc{mesh;material;rt;reflCam=new zt;textureMatrix=new rt;plane=new Ei;uniforms={};enabled;y;constructor(e={}){const t=e.size??120,n=e.resolution??.5;this.y=e.y??0,this.enabled=n>0;const s=Math.max(64,Math.floor(1024*n)),r=Math.max(64,Math.floor(576*n));this.rt=new Pt(s,r,{type:Vt,samples:0});const o=ic(512),a=e.texRepeat??t/4;for(const u of[o.map,o.normalMap,o.roughnessMap])u?.repeat.set(a,a);const l=Bo(256);l.wrapS=l.wrapT=mn,this.material=new Xt({color:new pe(e.color??9080982).convertSRGBToLinear(),map:o.map,normalMap:o.normalMap,roughnessMap:o.roughnessMap,roughness:1,metalness:0,normalScale:new ae(.28,.28),envMapIntensity:.22}),this.uniforms={tRefl:{value:this.rt.texture},textureMatrix:{value:this.textureMatrix},tRipple:{value:l},uWetness:{value:e.wetness??.85},uReflStrength:{value:e.reflectStrength??1},uTime:{value:0},uRippleScale:{value:e.rippleScale??3.2},uBlur:{value:e.blur??2.2},uReflRes:{value:new ae(s,r)},uRainAmount:{value:1}};const c=this.enabled;this.material.onBeforeCompile=u=>{Object.assign(u.uniforms,this.uniforms),u.vertexShader=u.vertexShader.replace("#include <common>",`#include <common>
           uniform mat4 textureMatrix;
           varying vec4 vReflCoord;
           varying vec3 vWorldPos;`).replace("#include <fog_vertex>",`#include <fog_vertex>
           vReflCoord = textureMatrix * vec4( position, 1.0 );
           vWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;`),u.fragmentShader=u.fragmentShader.replace("#include <common>",`#include <common>
           uniform sampler2D tRefl;
           uniform sampler2D tRipple;
           uniform float uWetness, uReflStrength, uTime, uRippleScale, uBlur, uRainAmount;
           uniform vec2 uReflRes;
           varying vec4 vReflCoord;
           varying vec3 vWorldPos;

           vec3 sampleRefl( vec2 uv, float blurPx ) {
             vec2 px = blurPx / uReflRes;
             vec3 c = texture2D( tRefl, uv ).rgb * 0.4;
             c += texture2D( tRefl, uv + vec2( px.x, 0.0 ) ).rgb * 0.15;
             c += texture2D( tRefl, uv - vec2( px.x, 0.0 ) ).rgb * 0.15;
             c += texture2D( tRefl, uv + vec2( 0.0, px.y ) ).rgb * 0.15;
             c += texture2D( tRefl, uv - vec2( 0.0, px.y ) ).rgb * 0.15;
             return c;
           }`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
           vec2 rUv = vWorldPos.xz * ( 1.0 / uRippleScale );
           vec3 rp = texture2D( tRipple, rUv + vec2( 0.0, uTime * 0.06 ) ).xyz * 2.0 - 1.0;
           vec3 rp2 = texture2D( tRipple, rUv * 1.7 - vec2( uTime * 0.09, uTime * 0.04 ) ).xyz * 2.0 - 1.0;
           vec3 ripple = normalize( mix( vec3( 0.0, 0.0, 1.0 ), normalize( rp + rp2 ), 0.55 * uWetness * uRainAmount ) );
           normal = normalize( normal + vec3( ripple.x, ripple.y, 0.0 ) * 0.55 * uWetness );`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
           float wetMask = uWetness;
           roughnessFactor = mix( roughnessFactor, 0.11 + roughnessFactor * 0.12, wetMask );
           diffuseColor.rgb *= mix( 1.0, 0.34, wetMask );`).replace("#include <colorspace_fragment>",`${c?`{
             vec2 ruv = vReflCoord.xy / max( vReflCoord.w, 0.0001 );
             vec2 distort = vec2( ripple.x, ripple.y ) * 0.035 * uWetness;
             vec3 refl = sampleRefl( clamp( ruv + distort, vec2( 0.002 ), vec2( 0.998 ) ), uBlur + roughnessFactor * 22.0 );
             vec3 V = normalize( vViewPosition );
             float fres = pow( 1.0 - clamp( dot( normalize( normal ), V ), 0.0, 1.0 ), 4.0 );
             float amt = uWetness * uReflStrength * mix( 0.05, 0.85, fres );
             gl_FragColor.rgb += refl * amt;
           }`:""}
           #include <colorspace_fragment>`)},this.material.customProgramCacheKey=()=>`wetground_${c}`;const h=e.segments??1,d=new Gt(t,t,h,h);this.mesh=new qe(d,this.material),this.mesh.rotation.x=-Math.PI/2,this.mesh.position.y=this.y,this.mesh.receiveShadow=!0,this.mesh.name="wet-ground",this.mesh.matrixAutoUpdate=!0,this.mesh.updateMatrixWorld()}set wetness(e){this.uniforms.uWetness.value=we(e,0,1)}get wetness(){return this.uniforms.uWetness.value}set rainAmount(e){this.uniforms.uRainAmount.value=e}set reflectStrength(e){this.uniforms.uReflStrength.value=e}update(e){this.uniforms.uTime.value=e}renderReflection(e,t,n){if(!this.enabled)return;const s=new A(0,1,0),r=new A(0,this.y,0),o=new A().setFromMatrixPosition(n.matrixWorld);if(o.y<this.y+.02)return;const a=new A().subVectors(r,o);a.reflect(s).negate().add(r);const l=new rt().extractRotation(n.matrixWorld),c=new A(0,0,-1).applyMatrix4(l).add(o),h=new A().subVectors(r,c);h.reflect(s).negate().add(r),this.reflCam.copy(n),this.reflCam.position.copy(a),this.reflCam.up.set(0,1,0).applyMatrix4(l).reflect(s),this.reflCam.lookAt(h),this.reflCam.far=n.far,this.reflCam.updateMatrixWorld(),this.reflCam.projectionMatrix.copy(n.projectionMatrix),this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.reflCam.projectionMatrix),this.textureMatrix.multiply(this.reflCam.matrixWorldInverse),this.textureMatrix.multiply(this.mesh.matrixWorld),this.plane.setFromNormalAndCoplanarPoint(s,r),this.plane.applyMatrix4(this.reflCam.matrixWorldInverse);const d=new vt(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant),u=this.reflCam.projectionMatrix,f=new vt((Math.sign(d.x)+u.elements[8])/u.elements[0],(Math.sign(d.y)+u.elements[9])/u.elements[5],-1,(1+u.elements[10])/u.elements[14]);d.multiplyScalar(2/d.dot(f)),u.elements[2]=d.x,u.elements[6]=d.y,u.elements[10]=d.z+1-.004,u.elements[14]=d.w;const m=e.getRenderTarget(),x=e.shadowMap.autoUpdate;e.shadowMap.autoUpdate=!1,this.mesh.visible=!1,e.setRenderTarget(this.rt),e.clear(),e.render(t,this.reflCam),this.mesh.visible=!0,e.shadowMap.autoUpdate=x,e.setRenderTarget(m)}dispose(){this.rt.dispose(),this.material.dispose(),this.mesh.geometry.dispose()}}class zo{group=new yt;streaks;splashes;follow=!0;mist;uniforms={};splashUniforms={};mistUniforms={};groundY=0;amount=1;constructor(e={}){const t=e.count??12e3;this.follow=e.follow??!0;const n=e.radius??26,s=e.height??26,r=new $t(20380815);this.group.name="rain",this.group.frustumCulled=!1;const o=new Gt(1,1),a=new fh;a.index=o.index,a.attributes.position=o.attributes.position,a.attributes.uv=o.attributes.uv;const l=new Float32Array(t*3),c=new Float32Array(t*3);for(let f=0;f<t;f++){const m=r.next()*Math.PI*2,x=n*Math.pow(r.next(),.62);l[f*3]=Math.cos(m)*x,l[f*3+1]=r.next()*s,l[f*3+2]=Math.sin(m)*x,c[f*3]=r.range(11,19),c[f*3+1]=r.range(.5,1.5),c[f*3+2]=r.chance(.14)?r.range(1.6,3.4):r.range(.28,.85)}a.setAttribute("iOffset",new xa(l,3)),a.setAttribute("iParam",new xa(c,3)),a.instanceCount=t,a.boundingSphere=new Pi(new A,n*3);const h=e.wind??new ae(1.4,.5);this.uniforms={uTime:{value:0},uHeight:{value:s},uWind:{value:h.clone()},uColor:{value:new pe(e.color??12575999)},uIntensity:{value:e.intensity??1},uAmount:{value:1},uWidth:{value:.009}};const d=new ft({uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:Bn,side:Qt,vertexShader:`
        attribute vec3 iOffset;
        attribute vec3 iParam;
        uniform float uTime, uHeight, uAmount, uWidth;
        uniform vec2 uWind;
        varying float vBright;
        varying vec2 vUv;
        void main() {
          float speed = iParam.x;
          float len = iParam.y;
          vBright = iParam.z;
          // Cull a fraction of drops when the rain eases off.
          if ( fract( iOffset.x * 12.9898 + iOffset.z * 78.233 ) > uAmount ) {
            gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
            return;
          }
          float t = uTime * speed;
          float y = uHeight - mod( iOffset.y + t, uHeight );
          vec3 local = vec3( iOffset.x + uWind.x * ( uHeight - y ) * 0.06, y, iOffset.z + uWind.y * ( uHeight - y ) * 0.06 );
          vec3 world = ( modelMatrix * vec4( local, 1.0 ) ).xyz;

          vec3 fall = normalize( vec3( uWind.x, -7.0, uWind.y ) );
          vec3 toCam = normalize( cameraPosition - world );
          vec3 side = normalize( cross( fall, toCam ) );

          float dist = length( cameraPosition - world );
          // Keep near drops from becoming giant smears.
          float streak = len * ( 0.5 + 0.55 * clamp( dist * 0.08, 0.0, 1.6 ) );
          vec3 p = world + side * position.x * uWidth * ( 1.0 + dist * 0.02 ) + fall * position.y * streak;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
        }
      `,fragmentShader:`
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vBright;
        varying vec2 vUv;
        void main() {
          float across = 1.0 - abs( vUv.x - 0.5 ) * 2.0;
          float along = smoothstep( 0.0, 0.25, vUv.y ) * smoothstep( 1.0, 0.72, vUv.y );
          float a = pow( across, 1.6 ) * along;
          gl_FragColor = vec4( uColor * vBright * uIntensity, a * 0.34 );
        }
      `});this.streaks=new qe(a,d),this.streaks.frustumCulled=!1,this.streaks.renderOrder=5,this.group.add(this.streaks);const u=e.splashes??600;if(u>0){const f=new Gt(1,1),m=new fh;m.index=f.index,m.attributes.position=f.attributes.position,m.attributes.uv=f.attributes.uv;const x=new Float32Array(u*3);for(let p=0;p<u;p++){const T=r.next()*Math.PI*2,b=n*.75*Math.sqrt(r.next());x[p*3]=Math.cos(T)*b,x[p*3+1]=r.next(),x[p*3+2]=Math.sin(T)*b}m.setAttribute("iOffset",new xa(x,3)),m.instanceCount=u,m.boundingSphere=new Pi(new A,n*3),this.splashUniforms={uTime:{value:0},uColor:{value:new pe(e.color??12575999)},tSprite:{value:Fo(128,2.2,.86)},uAmount:{value:1},uScale:{value:.055}};const g=new ft({uniforms:this.splashUniforms,transparent:!0,depthWrite:!1,blending:Bn,vertexShader:`
          attribute vec3 iOffset;
          uniform float uTime, uAmount, uScale;
          varying float vLife;
          varying vec2 vUv;
          void main() {
            float phase = iOffset.y;
            float cycle = 0.42;
            float life = fract( uTime / cycle + phase );
            vLife = life;
            if ( phase > uAmount ) { gl_Position = vec4( 2.0 ); return; }
            float s = ( 0.25 + life * 1.5 ) * uScale;
            vec3 local = vec3( iOffset.x + position.x * s, 0.008, iOffset.z + position.y * s );
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( local, 1.0 );
          }
        `,fragmentShader:`
          uniform sampler2D tSprite;
          uniform vec3 uColor;
          varying float vLife;
          varying vec2 vUv;
          void main() {
            float a = texture2D( tSprite, vUv ).a;
            a *= ( 1.0 - vLife ) * smoothstep( 0.0, 0.12, vLife );
            gl_FragColor = vec4( uColor * 0.7, a * 0.12 );
          }
        `});this.splashes=new qe(m,g),this.splashes.rotation.x=-Math.PI/2,this.splashes.frustumCulled=!1,this.splashes.renderOrder=4,this.group.add(this.splashes)}if(e.mist!==!1){this.mistUniforms={uTime:{value:0},uColor:{value:new pe(10339550)},uOpacity:{value:.028}};const f=new ft({uniforms:this.mistUniforms,transparent:!0,depthWrite:!1,blending:Bn,side:Qt,vertexShader:`
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            vUv = uv;
            vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,fragmentShader:`
          uniform float uTime, uOpacity;
          uniform vec3 uColor;
          varying vec2 vUv;
          varying vec3 vWorld;
          float hash( vec2 p ) { return fract( sin( dot( p, vec2( 27.16, 57.3 ) ) ) * 43758.5453 ); }
          float vnoise( vec2 p ) {
            vec2 i = floor( p ), f = fract( p );
            f = f * f * ( 3.0 - 2.0 * f );
            return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ),
                        mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0 ) ), f.x ), f.y );
          }
          void main() {
            vec2 p = vWorld.xz * 0.08 + vec2( uTime * 0.035, uTime * 0.017 );
            float n = vnoise( p ) * 0.6 + vnoise( p * 2.7 ) * 0.4;
            float edge = smoothstep( 0.0, 0.35, vUv.y ) * smoothstep( 1.0, 0.55, vUv.y );
            float fade = smoothstep( 0.0, 0.2, vUv.x ) * smoothstep( 1.0, 0.8, vUv.x );
            gl_FragColor = vec4( uColor, n * edge * fade * uOpacity );
          }
        `}),m=new Gt(n*2.4,5,1,1);this.mist=new qe(m,f),this.mist.position.y=1.4,this.mist.rotation.x=-Math.PI/2,this.mist.frustumCulled=!1,this.mist.renderOrder=3,this.group.add(this.mist)}}setGroundY(e){this.groundY=e,this.splashes&&(this.splashes.position.y=e),this.mist&&(this.mist.position.y=e+1.2)}update(e,t,n){if(this.follow){const s=n.position;this.group.position.set(Math.round(s.x*.5)*2,this.groundY,Math.round(s.z*.5)*2)}this.uniforms.uTime.value=t,this.uniforms.uAmount.value=this.amount,this.splashes&&(this.splashUniforms.uTime.value=t,this.splashUniforms.uAmount.value=this.amount),this.mist&&(this.mistUniforms.uTime.value=t)}setIntensity(e){this.amount=we(e,0,1),this.uniforms.uIntensity.value=.55+this.amount*.75}setColor(e){this.uniforms.uColor.value.set(e),this.splashes&&this.splashUniforms.uColor.value.set(e)}dispose(){this.group.traverse(e=>{const t=e;t.geometry?.dispose?.(),t.material?.dispose?.()})}}class hd{constructor(e=14216447,t=6){this.peak=t,this.light=new nc(e,0),this.light.position.set(-14,22,-18)}light;t=-1;seq=[];strength=0;onFlash;strike(e=0){this.t=-e,this.seq=[.06,.05,.09,.04,.26,.16]}update(e){if(this.t<-1e3||(this.t+=e,this.t<0))return;let t=0,n=!1;for(let s=0;s<this.seq.length;s++){const r=t+this.seq[s];if(this.t>=t&&this.t<r){n=s%2===0;break}t=r}this.t>t+.4?(this.t=-1e9,this.strength=0):this.strength=n?1:0,this.light.intensity=this.strength*this.peak,this.onFlash?.(this.strength*.42)}}function F1(i,e){const t=e.get("who")??"connor",n=e.get("shot")??"closeup",s=e.get("pose")??"idle",r=i.quality,o=new Ji,a=new zt(50,16/9,.08,400),l=new Ho({top:263948,horizon:924198,ground:329739,clouds:.7,cloudColor:1845818,cityGlow:.55,cityGlowColor:2835808,sun:new A(-.5,.3,-1)});o.add(l.mesh),o.fog=new Zi(660512,.022);const c=l.buildEnvironment(i.renderer,[ui(3111423,3.5,8,5,new A(-7,3,-3)),ui(16734780,1.6,6,4,new A(8,2.4,2))]);o.environment=c,o.environmentIntensity=.55;const h=new dc({size:80,resolution:r.reflectionScale,wetness:.92,reflectStrength:1.05,texRepeat:20});o.add(h.mesh);const d=new yr(Ds[t]??Ds.connor,r.characterSegments);d.setPosition(0,0,0),d.applyPoseImmediate(s),o.add(d.group);const u=d.eyeLine(new A),f=k1(r,u,{keyColor:14478591,keyIntensity:34,keyDir:new A(-.9,.7,.75),rimColor:6797055,rimIntensity:60,rimDir:new A(.85,.5,-1),fillColor:2771562,fillIntensity:6,distance:2.4});o.add(f.group);const m=Rn(r,{color:16757370,intensity:30,position:u.clone().add(new A(1.2,1.4,-2.4)),target:u.clone(),angle:.5,penumbra:.9,shadow:!1});o.add(m,m.target);const x=new mr({height:5,radius:1.8,color:10473727,opacity:.09});x.mesh.position.set(-1.8,4.6,1.2),o.add(x.mesh);const g=new zo({count:Math.round(r.rainCount*.6),splashes:r.splashCount,radius:14,mist:!0});o.add(g.group);const p=new wr(r.volumetrics?400:120,new A(6,3,6));p.points.position.y=.6,o.add(p.points);const T={closeup:{pos:new A(.42,u.y+.03,.86),look:u.clone(),fov:38},eyes:{pos:new A(.12,u.y+.02,.44),look:u.clone(),fov:34},profile:{pos:new A(1,u.y,.14),look:u.clone(),fov:42},medium:{pos:new A(.9,u.y-.12,1.7),look:u.clone().add(new A(0,-.12,0)),fov:44},full:{pos:new A(1.5,1.35,3.2),look:new A(0,.95,0),fov:40},hands:{pos:new A(.5,1,.9),look:new A(.2,.86,.1),fov:36}},b=T[n]??T.closeup;a.position.copy(b.pos),a.lookAt(b.look),a.fov=b.fov,a.updateProjectionMatrix(),d.lookAt(a.position.clone().add(new A(0,0,.2)),.9),d.setExpression(e.get("expr")??"neutral",Number(e.get("exprw")??1)),e.get("talk")&&d.say(60,1);const w=a.position.distanceTo(b.look);return{name:"portrait",scene:o,camera:a,update(S,M){d.update(S,M),h.update(M),g.update(S,M,a),p.update(M),x.update(M),l.update(M),i.fx.focusTarget=w,i.fx.aperture=Number(e.get("ap")??1.1)},prerender(S,M){h.renderReflection(S,o,M)},applyLook(S){S.wetLens=.35,S.setBloom(.55,.7,.9),S.setStreak(.3),S.applyLook({uExposure:1.15,uSplit:.2,uVignette:.5,uGrain:.035})},dispose(){d.dispose(),h.dispose(),g.dispose()}}}const lt=i=>document.getElementById(i);class B1{instant=!1;subs=lt("subs");subsWho=lt("subs-who");subsLine=lt("subs-line");choices=lt("choices");choiceList=lt("choice-list");choiceArc=lt("choice-arc");choiceTimer=lt("choice-timer");qte=lt("qte");card=lt("card");cardKicker=lt("card-kicker");cardTitle=lt("card-title");cardSub=lt("card-sub");hud=lt("hud");hudActor=lt("hud-actor-name");hudModel=lt("hud-actor-model");hudLed=lt("hud-led");objective=lt("hud-objective");objectiveText=lt("hud-objective-text");stabilityWrap=lt("hud-stability");stabilityFill=lt("hud-stability-fill");scan=lt("scan");scanMarkers=lt("scan-markers");scanReadout=lt("scan-readout");scanProgress=lt("scan-progress");scanHint=lt("hud-scanhint");precon=lt("precon");preconFill=lt("precon-fill");preconLabel=lt("precon-label");fade=lt("fade");toastEl=lt("toast");letterbox=lt("letterbox");flow=lt("flow");flowCanvas=lt("flow-canvas");flowSub=lt("flow-sub");flowStats=lt("flow-stats");perf=lt("perf");prompt=lt("prompt");controls=lt("controls");setPrompt(e){if(!e){this.prompt.classList.add("hidden");return}const t=this.prompt.querySelector(".lbl");t.textContent!==e&&(t.textContent=e),this.prompt.classList.remove("hidden")}showControls(e){this.controls.classList.toggle("hidden",!e)}markerEls=new Map;goalEl=null;updateWorldMarkers(e,t,n,s){const r=new A,o=(a,l,c,h)=>{r.set(l,c,h).project(e);const d=r.z<1&&r.x>-1&&r.x<1&&r.y>-1&&r.y<1;return a.style.display=d?"block":"none",d?(a.style.left=`${(r.x*.5+.5)*window.innerWidth}px`,a.style.top=`${(-r.y*.5+.5)*window.innerHeight}px`,!0):!1};for(const a of t){if(!a.marker)continue;let l=this.markerEls.get(a.id);if(n.has(a.id)){l&&(l.remove(),this.markerEls.delete(a.id));continue}l||(l=document.createElement("div"),l.className="wmark",l.innerHTML=`<i></i><span>${a.label}</span>`,document.getElementById("stage").appendChild(l),this.markerEls.set(a.id,l)),o(l,a.at[0],a.at[1]+.35,a.at[2])}s?(this.goalEl||(this.goalEl=document.createElement("div"),this.goalEl.className="wmark",this.goalEl.innerHTML="<i></i><span>GO HERE</span>",document.getElementById("stage").appendChild(this.goalEl)),o(this.goalEl,s.x,s.y+1.2,s.z)):this.goalEl&&(this.goalEl.remove(),this.goalEl=null)}clearWorldMarkers(){for(const e of this.markerEls.values())e.remove();this.markerEls.clear(),this.goalEl?.remove(),this.goalEl=null}setLetterbox(e){this.letterbox.classList.toggle("cinema",e)}showHud(e,t,n){this.hud.classList.toggle("hidden",!e),t&&(this.hudActor.textContent=t),n&&(this.hudModel.textContent=n)}setLed(e){this.hudLed.className="led"+(e==="yellow"?" warn":e==="red"?" bad":"")}setObjective(e,t=!1){this.objectiveText.textContent=e,this.objective.classList.toggle("done",t)}setInstability(e){const t=we(e)*100;this.stabilityFill.style.width=`${Math.max(4,t)}%`,this.stabilityWrap.classList.toggle("hot",e>.55)}say(e,t,n=!1){this.subs.classList.remove("hidden"),this.subs.classList.toggle("think",n),this.subsWho.textContent=n?`${e} — ANALYSING`:e,this.subsLine.textContent=t}clearSay(){this.subs.classList.add("hidden")}toast(e,t=!1){this.toastEl.textContent=e,this.toastEl.classList.toggle("warn",t),this.toastEl.classList.remove("hidden"),window.setTimeout(()=>this.toastEl.classList.add("hidden"),2600)}setFade(e,t=!1,n=.7){this.fade.style.transitionDuration=`${n}s`,this.fade.classList.toggle("white",t),this.fade.classList.toggle("on",e)}showCard(e,t,n){this.cardKicker.textContent=e,this.cardTitle.textContent=t,this.cardSub.textContent=n,this.card.classList.remove("hidden");const s=this.card.firstElementChild;s.style.animation="none",s.offsetHeight,s.style.animation=""}hideCard(){this.card.classList.add("hidden")}showPerf(e){if(e===null){this.perf.classList.add("hidden");return}this.perf.classList.remove("hidden"),this.perf.textContent=e}choiceEls=[];choiceResolve=null;choiceTotal=0;choiceLeft=0;choiceHot=0;askChoice(e,t,n){this.choiceList.innerHTML="",this.choiceEls=[],this.choiceResolve=n,this.choiceTotal=t,this.choiceLeft=t,this.choiceHot=0,e.forEach((s,r)=>{const o=document.createElement("button");o.className="opt"+(s.risk?" risk":""),o.innerHTML=`<span class="key">${r+1}</span><span class="lbl"></span>${s.hint?'<span class="hint"></span>':""}`,o.querySelector(".lbl").textContent=s.label,s.hint&&(o.querySelector(".hint").textContent=s.hint),o.addEventListener("click",()=>this.pick(r)),o.addEventListener("mouseenter",()=>this.highlight(r)),this.choiceList.appendChild(o),this.choiceEls.push(o)}),this.choices.classList.remove("hidden"),this.choiceTimer.classList.toggle("hidden",t<=0),this.highlight(0)}highlight(e){this.choiceHot=we(e,0,this.choiceEls.length-1),this.choiceEls.forEach((t,n)=>t.classList.toggle("hot",n===this.choiceHot))}moveHighlight(e){this.choiceEls.length&&this.highlight((this.choiceHot+e+this.choiceEls.length)%this.choiceEls.length)}get highlighted(){return this.choiceHot}pick(e){if(!this.choiceResolve)return;const t=this.choiceEls[e];t&&t.classList.add("picked");const n=this.choiceResolve;if(this.choiceResolve=null,this.instant){this.choices.classList.add("hidden"),n(e);return}window.setTimeout(()=>{this.choices.classList.add("hidden"),n(e)},260)}get choosing(){return this.choiceResolve!==null}updateChoiceTimer(e){if(!this.choiceResolve||this.choiceTotal<=0)return;this.choiceLeft=Math.max(0,this.choiceLeft-e);const t=this.choiceLeft/this.choiceTotal,n=2*Math.PI*44;this.choiceArc.style.strokeDashoffset=`${n*(1-t)}`,this.choiceTimer.classList.toggle("low",t<.3),this.choiceLeft<=0&&this.pick(this.choiceEls.length-1)}qteState=null;askQte(e,t,n,s,r){const o=document.createElement("div");o.className="prompt";const a=e===" "?"SPACE":e.toUpperCase();o.innerHTML=`
      <div class="ring2" style="animation-duration:${n}s"></div>
      <div class="disc"><span>${a}</span></div>
      <div class="cap">${s}</div>
      ${t==="mash"?'<div class="mash"><i></i></div>':""}`,o.style.left=`${46+(Math.random()*16-8)}%`,o.style.top=`${44+(Math.random()*14-7)}%`,this.qte.innerHTML="",this.qte.appendChild(o),this.qte.classList.remove("hidden"),this.qteState={key:e.toLowerCase(),kind:t,left:n,total:n,hits:0,need:t==="mash"?8:1,resolve:r,el:o,fill:o.querySelector(".mash i")}}get qteActive(){return this.qteState!==null}qteKey(e){const t=this.qteState;t&&e.toLowerCase()===t.key&&(t.hits++,t.fill&&(t.fill.style.width=`${Math.min(100,t.hits/t.need*100)}%`),t.hits>=t.need&&this.finishQte(!0))}finishQte(e){const t=this.qteState;t&&(this.qteState=null,t.el.classList.add(e?"hit":"miss"),this.instant?(this.qte.classList.add("hidden"),this.qte.innerHTML=""):window.setTimeout(()=>{this.qte.classList.add("hidden"),this.qte.innerHTML=""},420),t.resolve(e))}updateQte(e){const t=this.qteState;t&&(t.left-=e,t.kind==="hold"&&t.hits>0&&(t.hits+=e*3,t.hits>2&&this.finishQte(!0)),t.left<=0&&this.finishQte(!1))}scanMarkerEls=new Map;scanFound=new Set;scanActive=!1;scanTargets=[];scanNeed=0;scanResolve=null;scanHoverId=null;showScanHint(e){this.scanHint.classList.toggle("show",e)}beginScan(e,t,n){this.scanTargets=e,this.scanNeed=Math.min(t,e.length),this.scanResolve=n,this.scanFound.clear(),this.scanMarkerEls.clear(),this.scanMarkers.innerHTML="",this.scanReadout.classList.remove("show");for(const s of e){const r=document.createElement("div");r.className="marker",r.innerHTML=`<div class="ring"><div class="core"></div></div><div class="tag">${s.label}</div>`,this.scanMarkers.appendChild(r),this.scanMarkerEls.set(s.id,r)}this.scan.classList.remove("hidden"),this.scanActive=!0,this.updateScanProgress()}endScan(){this.scanActive=!1,this.scan.classList.add("hidden"),this.scanReadout.classList.remove("show");const e=this.scanResolve;this.scanResolve=null,e&&e([...this.scanFound])}get scanning(){return this.scanActive}updateScanProgress(){this.scanProgress.textContent=`${this.scanFound.size} / ${this.scanNeed}`}updateScan(e,t){if(!this.scanActive)return;const n=new A;let s=null;for(const r of this.scanTargets){const o=this.scanMarkerEls.get(r.id);if(!o)continue;n.set(r.at[0],r.at[1],r.at[2]).project(e);const a=n.z>1,l=(n.x*.5+.5)*window.innerWidth,c=(-n.y*.5+.5)*window.innerHeight,h=!a&&n.x>-1.05&&n.x<1.05&&n.y>-1.05&&n.y<1.05;if(o.style.display=h?"block":"none",!h)continue;o.style.left=`${l}px`,o.style.top=`${c}px`;const d=Math.hypot(l-t.x,c-t.y);d<90&&(!s||d<s.dist)&&(s={id:r.id,dist:d}),o.classList.toggle("found",this.scanFound.has(r.id))}for(const[r,o]of this.scanMarkerEls)o.classList.toggle("hot",s?.id===r);this.scanHoverId=s?.id??null}confirmScan(){if(!this.scanActive||!this.scanHoverId||this.scanFound.has(this.scanHoverId))return null;const e=this.scanTargets.find(t=>t.id===this.scanHoverId);return e?(this.scanFound.add(e.id),this.updateScanProgress(),this.scanReadout.innerHTML=`<b>${e.label}</b><br>`+e.readout.map(t=>`· ${t}`).join("<br>"),this.scanReadout.classList.add("show"),this.scanFound.size>=this.scanNeed&&(this.instant?this.endScan():window.setTimeout(()=>this.endScan(),1500)),e):null}showPrecon(e){this.preconLabel.textContent=e,this.preconFill.style.width="0%",this.precon.classList.remove("hidden")}updatePrecon(e){this.preconFill.style.width=`${we(e)*100}%`}hidePrecon(){this.precon.classList.add("hidden")}showFlow(e,t,n,s){this.flowSub.textContent=e,this.flowCanvas.innerHTML="";const r=Math.max(...t.map(h=>h.col))+1,o=Math.max(...t.map(h=>h.row))+1,a="http://www.w3.org/2000/svg",l=document.createElementNS(a,"svg");l.setAttribute("class","flow-svg"),this.flowCanvas.appendChild(l);const c=h=>({x:(h.col+.5)/r*100,y:(h.row+.5)/o*100});for(const h of t){const d=c(h),u=document.createElement("div"),f=n.has(h.id);u.className=`fnode ${f?"taken":"missed"}${h.kind==="death"?" death":""}`,u.style.left=`${d.x}%`,u.style.top=`${d.y}%`,u.style.animationDelay=`${h.col*90}ms`,u.innerHTML=`<span class="n-kind">${h.kind??"beat"}</span>${h.label}`,this.flowCanvas.appendChild(u);for(const m of h.from??[]){const x=t.find(b=>b.id===m);if(!x)continue;const g=c(x),p=document.createElementNS(a,"path"),T=(g.x+d.x)/2;p.setAttribute("d",`M ${g.x} ${g.y} C ${T} ${g.y}, ${T} ${d.y}, ${d.x} ${d.y}`),p.setAttribute("vector-effect","non-scaling-stroke"),f&&n.has(m)&&p.setAttribute("class","taken"),l.appendChild(p)}}l.setAttribute("viewBox","0 0 100 100"),l.setAttribute("preserveAspectRatio","none"),this.flowStats.innerHTML=s.map(h=>`${h.label}: <b>${h.value}</b>`).join(" &nbsp;·&nbsp; "),this.flow.classList.remove("hidden")}hideFlow(){this.flow.classList.add("hidden")}get flowVisible(){return!this.flow.classList.contains("hidden")}}class H1{camera;resolve;fx=null;posA=new A;posB=new A;lookA=new A;lookB=new A;fovA=40;fovB=40;t=1;dur=0;easeName="inOutCubic";handheld=.35;shake=0;roll=0;orbit=0;orbitTotal=0;targetSpec=null;toTargetSpec=null;targetOffset=new A;focusSpec;noiseSeed=Math.random()*100;curPos=new A;curLook=new A;settle=1;time=0;constructor(e,t){this.camera=e,this.resolve=t,this.posA.copy(e.position),this.posB.copy(e.position),this.curPos.copy(e.position)}attachPost(e){this.fx=e}play(e){const t=this.curPos.clone(),n=this.curLook.clone();this.posA.copy(e.pos?new A(...e.pos):t),this.posB.copy(e.to?new A(...e.to):this.posA),this.targetSpec=e.target??null,this.toTargetSpec=e.toTarget??null,this.targetOffset.set(...e.targetOffset??[0,0,0]),e.height&&(this.targetOffset.y+=e.height);const s=this.targetSpec?this.resolve(this.targetSpec):null;this.lookA.copy(e.look?new A(...e.look):s??n),s&&!e.look&&this.lookA.add(this.targetOffset),this.lookB.copy(e.toLook?new A(...e.toLook):this.lookA),this.fovA=e.fov??this.camera.fov,this.fovB=e.fov??this.camera.fov,this.dur=e.move??0,this.t=this.dur>0?0:1,this.easeName=e.ease??"inOutCubic",this.handheld=e.handheld??.35,this.roll=e.roll??0,this.orbitTotal=e.orbit??0,this.orbit=0,this.focusSpec=e.focus,e.shake&&(this.shake=e.shake),this.settle=e.pos?0:1,this.fx&&(this.fx.aperture=e.aperture??.6,e.pos&&(this.fx.focusDistance=this.focusDistanceNow())),this.noiseSeed=Math.random()*100}syncFromCamera(){this.curPos.copy(this.camera.position);const e=new A;this.camera.getWorldDirection(e),this.curLook.copy(this.camera.position).addScaledVector(e,3),this.posA.copy(this.curPos),this.posB.copy(this.curPos),this.lookA.copy(this.curLook),this.lookB.copy(this.curLook),this.settle=1}addShake(e){this.shake=Math.max(this.shake,e)}focusDistanceNow(){const e=this.curLook.lengthSq()>0?this.curLook:this.lookA;return Math.max(.4,this.curPos.distanceTo(e))}update(e){this.time+=e,this.dur>0&&this.t<1&&(this.t=we(this.t+e/this.dur));const t=Ku[this.easeName](this.t),n=this.targetSpec?this.resolve(this.targetSpec):null;n&&this.lookA.copy(n).add(this.targetOffset);const s=this.toTargetSpec?this.resolve(this.toTargetSpec):null;s?this.lookB.copy(s).add(this.targetOffset):!this.toTargetSpec&&n&&!this.lookBFixed&&this.lookB.copy(this.lookA);const r=this.posA.clone().lerp(this.posB,t),o=this.lookA.clone().lerp(this.lookB,t);if(this.orbitTotal!==0){this.orbit=this.orbitTotal*t;const c=r.clone().sub(o),h=Math.cos(this.orbit),d=Math.sin(this.orbit);r.set(o.x+c.x*h-c.z*d,r.y,o.z+c.x*d+c.z*h)}if(this.handheld>.001){const c=this.handheld,h=d=>ct(this.time*.42+d+this.noiseSeed,d*3.7,3);r.x+=h(0)*.022*c,r.y+=h(11)*.017*c+Math.sin(this.time*1.1)*.004*c,r.z+=h(23)*.022*c,o.x+=h(31)*.03*c,o.y+=h(43)*.024*c}if(this.shake>.001){const c=this.shake;r.x+=(Math.random()-.5)*.09*c,r.y+=(Math.random()-.5)*.09*c,r.z+=(Math.random()-.5)*.06*c,o.x+=(Math.random()-.5)*.1*c,o.y+=(Math.random()-.5)*.1*c,this.shake=Math.max(0,this.shake-e*2.2)}this.settle=Jt(this.settle,1,6,e);const a=1-Math.exp(-(8+24*this.settle)*e);this.curPos.lerp(r,this.dur>0||this.settle>.99?1:a),this.dur>0&&this.curPos.copy(r),this.curLook.lerp(o,this.dur>0?1:Math.max(a,.35)),this.camera.position.copy(this.curPos),this.camera.up.set(Math.sin(this.roll),Math.cos(this.roll),0),this.camera.lookAt(this.curLook);const l=this.fovA+(this.fovB-this.fovA)*t;if(Math.abs(this.camera.fov-l)>.01&&(this.camera.fov=l,this.camera.updateProjectionMatrix()),this.fx){let c;if(typeof this.focusSpec=="number")c=this.focusSpec;else if(typeof this.focusSpec=="string"){const h=this.resolve(this.focusSpec);c=h?this.curPos.distanceTo(h):this.curPos.distanceTo(this.curLook)}else c=this.curPos.distanceTo(this.curLook);this.fx.focusTarget=Math.max(.35,c)}}lookBFixed=!1;get position(){return this.camera.position}get aim(){return this.curLook}get isMoving(){return this.dur>0&&this.t<1}}function z1(i){const e=i.trim().split(/\s+/).length;return Math.max(1.5,Math.min(9,.62+e/2.5))}class V1{ctx=null;master;musicBus;sfxBus;ambienceBus;reverb;started=!1;rainVoice=null;droneVoice=null;cue=null;enabled=!0;async start(){if(this.started)return;try{const s=window.AudioContext??window.webkitAudioContext;this.ctx=new s,this.ctx.resume().catch(()=>{})}catch{this.enabled=!1;return}const e=this.ctx;this.master=e.createGain(),this.master.gain.value=.85,this.master.connect(e.destination),this.reverb=e.createConvolver(),this.reverb.buffer=this.makeImpulse(2.6,3.2);const t=e.createGain();t.gain.value=.32,this.reverb.connect(t),t.connect(this.master);const n=s=>{const r=e.createGain();return r.gain.value=s,r.connect(this.master),r.connect(this.reverb),r};this.musicBus=n(.5),this.sfxBus=n(.7),this.ambienceBus=n(.55),this.started=!0}makeImpulse(e,t){const n=this.ctx,s=n.sampleRate,r=Math.floor(s*e),o=n.createBuffer(2,r,s);for(let a=0;a<2;a++){const l=o.getChannelData(a);for(let c=0;c<r;c++){const h=c/r;l[c]=(Math.random()*2-1)*Math.pow(1-h,t)}}return o}noiseBuffer(e=2){const t=this.ctx,n=Math.floor(t.sampleRate*e),s=t.createBuffer(1,n,t.sampleRate),r=s.getChannelData(0);for(let o=0;o<n;o++)r[o]=Math.random()*2-1;return s}get ready(){return this.started&&this.enabled&&!!this.ctx}rain(e=.5){if(!this.ready)return;this.rainVoice?.stop();const t=this.ctx,n=t.createBufferSource();n.buffer=this.noiseBuffer(3),n.loop=!0;const s=t.createBiquadFilter();s.type="highpass",s.frequency.value=420;const r=t.createBiquadFilter();r.type="lowpass",r.frequency.value=5200;const o=t.createGain();o.gain.value=0,o.gain.linearRampToValueAtTime(e*.5,t.currentTime+2);const a=t.createOscillator();a.frequency.value=.08;const l=t.createGain();l.gain.value=e*.12,a.connect(l),l.connect(o.gain),n.connect(s),s.connect(r),r.connect(o),o.connect(this.ambienceBus),n.start(),a.start(),this.rainVoice={stop:(c=1.2)=>{o.gain.cancelScheduledValues(t.currentTime),o.gain.linearRampToValueAtTime(0,t.currentTime+c),n.stop(t.currentTime+c+.1),a.stop(t.currentTime+c+.1)}}}drone(e=55,t=.25){if(!this.ready)return;this.droneVoice?.stop();const n=this.ctx,s=n.createGain();s.gain.value=0,s.gain.linearRampToValueAtTime(t,n.currentTime+3),s.connect(this.ambienceBus);const r=[];for(const[o,a,l]of[[1,1,0],[2,.35,4],[3.01,.16,-6],[.5,.5,2]]){const c=n.createOscillator();c.type="sawtooth",c.frequency.value=e*o,c.detune.value=l;const h=n.createGain();h.gain.value=a*.25;const d=n.createBiquadFilter();d.type="lowpass",d.frequency.value=320,c.connect(h),h.connect(d),d.connect(s),c.start(),r.push(c)}this.droneVoice={stop:(o=2)=>{s.gain.cancelScheduledValues(n.currentTime),s.gain.linearRampToValueAtTime(0,n.currentTime+o);for(const a of r)a.stop(n.currentTime+o+.1)}}}stopAmbience(e=1.5){this.rainVoice?.stop(e),this.droneVoice?.stop(e),this.rainVoice=null,this.droneVoice=null}playCue(e=0,t=.5){if(!this.ready)return;this.cue?.stop();const n=this.ctx,s=n.createGain();s.gain.value=0,s.gain.linearRampToValueAtTime(t,n.currentTime+4),s.connect(this.musicBus);const r=[[0,3,7,10,14],[0,1,7,8,13],[0,3,5,8,10],[0,4,7,11,14]],o=[110,98,87.3,130.8],a=r[e%4],l=o[e%4],c=[];for(const u of[0,7,12])for(const f of[-7,7]){const m=n.createOscillator();m.type="triangle",m.frequency.value=l*Math.pow(2,u/12),m.detune.value=f;const x=n.createGain();x.gain.value=.06;const g=n.createBiquadFilter();g.type="lowpass",g.frequency.value=900,m.connect(x),x.connect(g),g.connect(s),m.start(),c.push(m)}let h=0;const d=window.setInterval(()=>{if(!this.ctx)return;const u=this.ctx.currentTime,f=a[h%a.length]+(h%8<4?12:24),m=l*Math.pow(2,f/12),x=n.createOscillator();x.type="sine",x.frequency.value=m;const g=n.createGain();g.gain.value=0,g.gain.linearRampToValueAtTime(.12,u+.01),g.gain.exponentialRampToValueAtTime(8e-4,u+2.4),x.connect(g),g.connect(s),x.start(u),x.stop(u+2.5),h+=h%3===2?2:1},1400);this.cue={stop:()=>{window.clearInterval(d),s.gain.cancelScheduledValues(n.currentTime),s.gain.linearRampToValueAtTime(0,n.currentTime+2.5);for(const u of c)u.stop(n.currentTime+2.7)}}}stopMusic(){this.cue?.stop(),this.cue=null}blip(e,t,n,s,r=0){if(!this.ready)return;const o=this.ctx,a=o.currentTime,l=o.createOscillator();l.type=n,l.frequency.setValueAtTime(e,a),r&&l.frequency.exponentialRampToValueAtTime(Math.max(30,e*r),a+t);const c=o.createGain();c.gain.setValueAtTime(0,a),c.gain.linearRampToValueAtTime(s,a+.006),c.gain.exponentialRampToValueAtTime(8e-4,a+t),l.connect(c),c.connect(this.sfxBus),l.start(a),l.stop(a+t+.05)}noiseHit(e,t,n,s=1){if(!this.ready)return;const r=this.ctx,o=r.currentTime,a=r.createBufferSource();a.buffer=this.noiseBuffer(.5);const l=r.createBiquadFilter();l.type="bandpass",l.frequency.value=n,l.Q.value=s;const c=r.createGain();c.gain.setValueAtTime(t,o),c.gain.exponentialRampToValueAtTime(8e-4,o+e),a.connect(l),l.connect(c),c.connect(this.sfxBus),a.start(o),a.stop(o+e+.05)}uiMove(){this.blip(880,.06,"sine",.06)}uiSelect(){this.blip(1320,.12,"sine",.12,1.5),this.blip(1980,.09,"triangle",.05)}uiOpen(){this.blip(520,.3,"sine",.09,2.2)}uiBack(){this.blip(420,.14,"sine",.08,.6)}scanOn(){this.blip(1180,.5,"sine",.07,1.8),this.noiseHit(.4,.05,3200,6)}scanFound(){this.blip(1760,.16,"triangle",.09),this.blip(2640,.1,"sine",.04)}qteHit(){this.blip(1560,.1,"square",.07,1.4),this.noiseHit(.12,.08,2400,3)}qteMiss(){this.blip(180,.35,"sawtooth",.12,.5),this.noiseHit(.3,.1,300,1)}heartbeat(){this.blip(58,.28,"sine",.3,.6)}glass(){this.noiseHit(.5,.16,5200,2),this.noiseHit(.9,.08,2600,1)}gunshot(){this.noiseHit(.5,.5,900,.7),this.blip(70,.4,"sawtooth",.35,.3)}impact(){this.noiseHit(.45,.28,260,.8),this.blip(90,.3,"sine",.22,.4)}thunder(){this.noiseHit(2.4,.3,140,.6),this.noiseHit(1.6,.18,60,.5)}door(){this.noiseHit(.3,.12,500,1.5),this.blip(140,.25,"triangle",.1,.7)}step(){this.noiseHit(.12,.05,900,1.4)}chime(){this.blip(1046,.9,"sine",.08),this.blip(1568,.7,"sine",.04)}stress(){this.blip(220,.6,"sawtooth",.08,.8),this.noiseHit(.5,.06,1400,4)}voice(e=1,t=1,n=!1){if(!this.ready)return;const s=this.ctx,r=(n?190:110)*e,o=s.currentTime,a=Math.max(1,Math.round(t/.19));for(let l=0;l<a;l++){const c=o+l*(t/a)*(.85+Math.random()*.3),h=s.createOscillator();h.type="sawtooth";const d=r*(.86+Math.random()*.3);h.frequency.setValueAtTime(d,c),h.frequency.linearRampToValueAtTime(d*(.94+Math.random()*.12),c+.12);const u=s.createBiquadFilter();u.type="bandpass",u.frequency.value=500+Math.random()*320,u.Q.value=5;const f=s.createBiquadFilter();f.type="bandpass",f.frequency.value=1500+Math.random()*900,f.Q.value=7;const m=s.createGain();m.gain.setValueAtTime(0,c),m.gain.linearRampToValueAtTime(.05,c+.02),m.gain.exponentialRampToValueAtTime(6e-4,c+.16),h.connect(u),u.connect(f),f.connect(m),m.connect(this.sfxBus),h.start(c),h.stop(c+.2)}}}const mt=new V1,G1=1.35,W1=2.75;class X1{character;camera;yaw=0;pitch=.06;distance=4.4;targetDistance=4.4;colliders=[];interactables=[];bounds={minX:-60,maxX:60,minZ:-60,maxZ:60};camPos=new A;camAim=new A;input={forward:0,right:0,run:!1};bot=null;speedNow=0;fx=null;keyLight=new Eo(13821183,0,16,.62,.85,2);fillLight=new jn(12374766,0,18,1.4);rimLight=new Eo(10473727,0,14,.7,.9,2);ambLift=new Ns(2900576,1119773,0);scene=null;used=new Set;nearest=null;enabled=!1;initialised=!1;constructor(e,t){this.character=e,this.camera=t,this.yaw=e.group.rotation.y+Math.PI}attachPost(e){this.fx=e}configure(e){if(this.colliders=e.colliders??[],this.interactables=e.interactables??[],e.bounds&&(this.bounds=e.bounds),this.keyScale=e.keyScale??1,e.boom&&(this.boom=e.boom,this.distance=e.boom.start,this.targetDistance=e.boom.start),this.ceiling=e.ceiling??1/0,this.restPitch=e.pitch??.08,this.ambientLift=e.ambient??1.1,e.scene&&this.scene!==e.scene){this.scene=e.scene;for(const t of[this.keyLight,this.rimLight])t.castShadow=!1,this.scene.add(t,t.target);this.scene.add(this.fillLight,this.ambLift)}}keyScale=1;boom={start:4.4,min:2.4,max:7};ceiling=1/0;restPitch=.08;ambientLift=1.1;activate(){this.enabled=!0,this.keyLight.intensity=20*this.keyScale,this.rimLight.intensity=9*this.keyScale,this.fillLight.intensity=9*this.keyScale,this.ambLift.intensity=this.ambientLift,this.yaw=this.character.group.rotation.y+Math.PI,this.pitch=this.restPitch,this.initialised=!1}deactivate(){this.enabled=!1,this.keyLight.intensity=0,this.rimLight.intensity=0,this.fillLight.intensity=0,this.ambLift.intensity=0,this.character.drive(0,0,0),this.input.forward=0,this.input.right=0,this.bot=null}setInput(e){Object.assign(this.input,e)}look(e,t,n=.0026){for(this.yaw-=e*n,this.pitch=we(this.pitch-t*n,-.42,.75);this.yaw>Math.PI;)this.yaw-=ci;for(;this.yaw<-Math.PI;)this.yaw+=ci}zoom(e){this.targetDistance=we(this.targetDistance+e*.0016,this.boom.min,this.boom.max)}order(e){this.bot=e}get botDone(){if(!this.bot)return!0;const e=this.character.group.position;return Math.hypot(this.bot.to.x-e.x,this.bot.to.z-e.z)<=(this.bot.radius??.6)}blocked(e,t,n=.32){if(e<this.bounds.minX+n||e>this.bounds.maxX-n||t<this.bounds.minZ+n||t>this.bounds.maxZ-n)return!0;for(const s of this.colliders)if(e>s.min[0]-n&&e<s.max[0]+n&&t>s.min[1]-n&&t<s.max[1]+n)return!0;return!1}update(e){const t=this.character,n=t.group.position;let s=this.input.forward,r=this.input.right,o=this.input.run;if(this.bot){const w=this.bot.to.x-n.x,S=this.bot.to.z-n.z,M=Math.hypot(w,S);if(M>(this.bot.radius??.6)){const y=w/M,v=S/M,E=we(M/1.4,.25,1),C=Math.sin(this.yaw+Math.PI),P=Math.cos(this.yaw+Math.PI);s=(y*C+v*P)*E,r=(y*P-v*C)*E,o=this.bot.run??!1;let N=Math.atan2(y,v)+Math.PI-this.yaw;for(;N>Math.PI;)N-=ci;for(;N<-Math.PI;)N+=ci;this.yaw+=N*(1-Math.exp(-1.6*e))}else s=0,r=0}const a=Math.min(1,Math.hypot(s,r));if(a>.02&&this.enabled){const w=Math.sin(this.yaw+Math.PI),S=Math.cos(this.yaw+Math.PI),M=S,y=-w;let v=w*s+M*r,E=S*s+y*r;const C=Math.hypot(v,E)||1;v/=C,E/=C;const P=(o?W1:G1)*a;this.speedNow=Jt(this.speedNow,P,10,e);const D=this.speedNow*e,N=n.x+v*D,z=n.z+E*D;this.blocked(N,n.z)||(n.x=N),this.blocked(n.x,z)||(n.z=z),t.drive(v,E,this.speedNow)}else this.speedNow=Jt(this.speedNow,0,12,e),t.drive(0,0,0);const c=t.worldPoint("headCenter",new A).clone().add(new A(0,.02,0));this.distance=Jt(this.distance,this.targetDistance,6,e);const h=Math.cos(this.pitch),d=new A(c.x+Math.sin(this.yaw)*h*this.distance,c.y+Math.sin(this.pitch)*this.distance+.42,c.z+Math.cos(this.yaw)*h*this.distance);d.y=we(d.y,.45,this.ceiling);let u=this.distance;for(;u>this.boom.min&&this.blocked(d.x,d.z,.25);)u-=.25,d.set(c.x+Math.sin(this.yaw)*h*u,we(c.y+Math.sin(this.pitch)*u+.42,.45,this.ceiling),c.z+Math.cos(this.yaw)*h*u);d.x=we(d.x,this.bounds.minX+.25,this.bounds.maxX-.25),d.z=we(d.z,this.bounds.minZ+.25,this.bounds.maxZ-.25),this.initialised?(this.camPos.lerp(d,1-Math.exp(-9*e)),this.camAim.lerp(c,1-Math.exp(-13*e))):(this.camPos.copy(d),this.camAim.copy(c),this.initialised=!0);const f=Math.cos(this.yaw),m=-Math.sin(this.yaw);this.camera.position.set(this.camPos.x+f*.46,this.camPos.y,this.camPos.z+m*.46),this.camera.up.set(0,1,0),this.camera.lookAt(this.camAim),this.camera.fov!==52&&(this.camera.fov=52,this.camera.updateProjectionMatrix());const x=c.y-.35,g=Math.cos(this.yaw+.9),p=-Math.sin(this.yaw+.9);this.keyLight.position.set(n.x+g*2.6+Math.sin(this.yaw)*1.6,x+2.5,n.z+p*2.6+Math.cos(this.yaw)*1.6),this.keyLight.target.position.set(n.x,x,n.z),this.rimLight.position.set(n.x-g*2.2-Math.sin(this.yaw)*2,x+1.9,n.z-p*2.2-Math.cos(this.yaw)*2),this.rimLight.target.position.set(n.x,x,n.z),this.fillLight.position.set(this.camera.position.x-(c.x-this.camera.position.x)*.5,this.camera.position.y+1.1,this.camera.position.z-(c.z-this.camera.position.z)*.5),this.fx&&(this.fx.focusTarget=this.camera.position.distanceTo(this.camAim),this.fx.aperture=.34);let T=null,b=1/0;for(const w of this.interactables){if(w.once!==!1&&this.used.has(w.id))continue;const S=Math.hypot(w.at[0]-n.x,w.at[2]-n.z),M=w.radius??2.2;S<M&&S<b&&(T=w,b=S)}this.nearest=T}interact(){const e=this.nearest;return e?(this.used.add(e.id),this.nearest=null,e):null}get interactableList(){return this.interactables}}class Y1{chars=new Map;rig;state={flags:new Set,stats:{},nodes:new Set,instability:.08};haltOnExplore=!1;seekHalted=!1;player=null;explore=null;pc=0;steps;labels=new Map;wait=0;blocked=null;chapter;set;ui;fx;timeScale=1;slowmoLeft=0;demoMode=!1;demoChoiceIndex=0;demoDelay=0;speaking=null;preconLeft=0;preconTotal=0;finished=!1;onEvents;fastForward=!1;constructor(e,t,n,s,r,o={}){this.chapter=e,this.set=t,this.ui=n,this.fx=s,this.onEvents=r,this.steps=e.steps,this.demoMode=o.demo??!1,o.state&&(this.state=o.state);for(let a=0;a<this.steps.length;a++){const l=this.steps[a];l.t==="label"&&this.labels.set(l.name,a)}this.rig=new H1(t.camera,a=>this.resolveTarget(a)),this.rig.attachPost(s)}spawnCast(e){for(const t of this.chapter.cast){const n=Ds[t.spec]??Ds.connor,s=new yr({...n,id:t.id},e),r=this.set.marks[t.mark];r&&(s.setPosition(r.pos[0],r.pos[1],r.pos[2]),s.setRotationY(r.rotY)),t.pose&&s.applyPoseImmediate(t.pose),t.expr&&s.setExpression(t.expr,1),t.led&&s.setLed(t.led),s.group.visible=!t.hidden,this.set.scene.add(s.group),this.chars.set(t.id,s)}}resolveTarget(e){const[t,n]=e.split(":"),s=this.chars.get(t);if(s)return s.worldPoint(n||"headCenter",new A);const r=this.set.marks[t];return r?new A(r.pos[0],r.pos[1]+1.5,r.pos[2]):null}jump(e){const t=this.labels.get(e);if(t===void 0){console.warn(`[director] unknown label: ${e}`),this.pc=this.steps.length;return}this.pc=t}update(e){if(this.finished)return;this.slowmoLeft>0&&(this.slowmoLeft-=e,this.slowmoLeft<=0&&(this.timeScale=1));const t=e*this.timeScale;if(this.blocked==="explore"&&this.player){this.updateExplore(t);for(const s of this.chars.values())s.update(t,performance.now()/1e3);return}for(const s of this.chars.values())s.update(t,performance.now()/1e3);if(this.rig.update(t),this.speaking&&(this.speaking.left-=t,this.speaking.left<=0&&(this.chars.get(this.speaking.who)?.stopTalking(),this.speaking=null)),this.preconLeft>0&&(this.preconLeft-=t,this.ui.updatePrecon(1-this.preconLeft/this.preconTotal),this.preconLeft<=0&&this.ui.hidePrecon()),this.blocked==="choice"){if(this.ui.updateChoiceTimer(t),this.demoMode&&(this.demoDelay-=t,this.demoDelay<=0&&this.ui.choosing)){const s=this.chapter.demoChoices?.[this.demoChoiceIndex]??0;this.ui.highlight(s),this.ui.pick(s)}return}if(this.blocked==="qte"){this.ui.updateQte(t);return}if(this.blocked==="scan"||this.blocked==="continue"||this.blocked==="seekHold"||this.wait>0&&(this.wait-=t,this.wait>0))return;let n=0;for(;this.wait<=0&&!this.blocked&&this.pc<this.steps.length&&n++<400;){const s=this.steps[this.pc++];this.exec(s)}this.pc>=this.steps.length&&!this.blocked&&this.wait<=0&&!this.finished&&this.finish("complete")}finish(e){this.finished=!0,this.ui.clearSay(),this.onEvents.onChapterEnd(e,this.state)}char(e){const t=this.chars.get(e);return t||console.warn(`[director] no character "${e}"`),t}applyLook(e,t){if(t===void 0)return;if(t===null||t===""){e.lookAt(null);return}if(t==="camera"){e.lookAt(this.set.camera.position.clone(),1);return}const n=this.chars.get(t.split(":")[0]);if(n)e.lookAt(n,1);else{const s=this.resolveTarget(t);s&&e.lookAt(s,1)}}exec(e){switch(e.t){case"shot":{const{t,...n}=e;this.rig.play(n);break}case"say":{const t=this.char(e.who),n=e.dur??z1(e.text),s=t?t.spec.name:e.who.toUpperCase();this.ui.say(s,e.text,e.think),t&&(e.pose&&t.setPose(e.pose),e.expr&&t.setExpression(e.expr,e.exprW??1),e.led&&t.setLed(e.led),this.applyLook(t,e.look),e.think||(t.say(n,1,e.gesture!==0),e.gesture!==void 0&&e.gesture>=0&&t.playGesture(e.gesture,n*.7,1),e.silent||mt.voice(t.spec.female?1.05:.95,n,t.spec.female)),this.speaking={who:e.who,left:n}),this.wait=n+.28;break}case"do":{const t=this.char(e.who);if(!t)break;if(e.pose&&t.setPose(e.pose,e.blend??.55),e.expr&&t.setExpression(e.expr,e.exprW??1),e.led&&t.setLed(e.led),e.shiver!==void 0&&t.setShiver(e.shiver),e.gesture!==void 0&&t.playGesture(e.gesture,1.2,1),e.talk&&t.say(e.talk,.8,!1),this.applyLook(t,e.look),e.mark){const n=this.set.marks[e.mark];n&&(t.setPosition(n.pos[0],n.pos[1],n.pos[2]),t.setRotationY(n.rotY))}if(e.walkTo){const n=this.set.marks[e.walkTo];n&&t.walkTo(n.pos[0],n.pos[2],1.1,!0)}break}case"choice":{this.blocked="choice",this.demoDelay=this.fastForward?.05:1.5+Math.random()*.8,this.onEvents.onNeedInput("choice");const t=e.options.filter(n=>!n.requires||this.state.flags.has(n.requires));mt.uiOpen(),this.ui.askChoice(t,e.time??8,n=>{this.blocked=null,this.onEvents.onNeedInput(null),this.demoChoiceIndex++;const s=t[n];mt.uiSelect(),s&&(s.flag&&this.state.flags.add(s.flag),s.node&&this.state.nodes.add(s.node),s.stat&&(this.state.stats[s.stat[0]]=(this.state.stats[s.stat[0]]??0)+s.stat[1]),s.instability&&this.bumpInstability(s.instability),s.goto&&this.jump(s.goto))});break}case"qte":{if(this.blocked="qte",this.onEvents.onNeedInput("qte"),e.slowmo&&(this.timeScale=e.slowmo,this.slowmoLeft=(e.window??1.6)+.6),mt.stress(),this.fastForward&&this.haltOnExplore){this.seekHalted=!0,this.pc--,this.blocked="seekHold";break}this.fastForward&&window.setTimeout(()=>{for(let t=0;t<10;t++)this.ui.qteKey(e.key)},0),this.ui.askQte(e.key,e.kind??"press",e.window??1.6,e.caption??"",t=>{this.blocked=null,this.onEvents.onNeedInput(null),this.timeScale=1,this.slowmoLeft=0,t?(mt.qteHit(),this.rig.addShake((e.shake??.4)*.5)):(mt.qteMiss(),this.rig.addShake(e.shake??.6),this.bumpInstability(.06),e.onFail&&this.jump(e.onFail))});break}case"explore":{const t=this.char(e.who);if(!t)break;if(this.fastForward&&this.haltOnExplore){this.seekHalted=!0,this.pc--,this.blocked="seekHold";break}if(this.fastForward){for(const o of e.require??[]){const a=this.set.interactables?.find(l=>l.id===o);a?.flag&&this.state.flags.add(a.flag)}const r=e.goal?this.set.marks[e.goal.mark]:void 0;r&&(t.setPosition(r.pos[0],r.pos[1],r.pos[2]),t.setRotationY(r.rotY));break}this.player||(this.player=new X1(t,this.set.camera),this.player.attachPost(this.fx));const n=this.set.name==="apartment"||this.set.name==="interrogation";this.player.configure({colliders:this.set.colliders,interactables:this.set.interactables,bounds:this.set.bounds,scene:this.set.scene,keyScale:n?1.25:1,boom:n?{start:2.7,min:1,max:3.4}:{start:4.4,min:2.4,max:7},ceiling:n?2.35:1/0,pitch:n?.4:.08,ambient:n?3:1.1}),this.player.activate();const s=e.goal?this.set.marks[e.goal.mark]:void 0;this.explore={require:new Set(e.require??[]),goal:s?{pos:new A(...s.pos),radius:e.goal?.radius??1.4}:null,timeout:e.timeout??180,demoPath:(e.demoPath??[]).map(r=>{const o=this.set.marks[r],a=this.set.interactables?.find(l=>l.id===r);return o?new A(...o.pos):a?new A(a.at[0],0,a.at[2]):new A}),demoIndex:0},e.objective&&this.ui.setObjective(e.objective),this.ui.showControls(!0),this.ui.showScanHint(!0),this.blocked="explore",this.onEvents.onNeedInput("explore");break}case"scan":{const t=this.set.scanTargets??[];if(!t.length)break;if(this.blocked="scan",this.onEvents.onNeedInput("scan"),mt.scanOn(),this.fastForward&&this.haltOnExplore){this.seekHalted=!0,this.pc--,this.blocked="seekHold";break}if(this.fastForward){this.blocked=null,this.onEvents.onNeedInput(null);for(const n of t.slice(0,e.need??t.length))n.flag&&this.state.flags.add(n.flag);this.state.stats.clues=(this.state.stats.clues??0)+(e.need??t.length);break}this.ui.beginScan(t,e.need??t.length,n=>{this.blocked=null,this.onEvents.onNeedInput(null);for(const s of n){const r=t.find(o=>o.id===s);r?.flag&&this.state.flags.add(r.flag)}this.state.stats.clues=(this.state.stats.clues??0)+n.length});break}case"precon":{this.preconTotal=e.dur??2.4,this.preconLeft=this.preconTotal,this.ui.showPrecon(e.label??"SIMULATING…"),this.fx.glitch=.4,window.setTimeout(()=>{this.fx.glitch=0},(e.dur??2.4)*1e3),this.wait=this.preconTotal;break}case"wait":this.wait=e.dur;break;case"goto":this.jump(e.label);break;case"label":break;case"if":{const t=this.state.flags.has(e.flag);(e.not?!t:t)&&this.jump(e.goto);break}case"ifStat":{const t=this.state.stats[e.name]??0,n=e.min===void 0||t>=e.min,s=e.max===void 0||t<=e.max;n&&s&&this.jump(e.goto);break}case"set":e.value===!1?this.state.flags.delete(e.flag):this.state.flags.add(e.flag);break;case"stat":this.state.stats[e.name]=(this.state.stats[e.name]??0)+e.delta;break;case"instability":this.bumpInstability(e.delta);break;case"title":this.ui.showCard(e.kicker??"",e.title,e.sub??""),this.wait=e.dur??3.4,window.setTimeout(()=>this.ui.hideCard(),(e.dur??3.4)*1e3-400);break;case"fade":e.to==="in"?this.ui.setFade(!1,!1,e.dur??.8):this.ui.setFade(!0,e.to==="white",e.dur??.8),this.wait=e.dur??.8;break;case"flash":this.fx.flash=e.power??.7,window.setTimeout(()=>{this.fx.flash=0},120);break;case"sfx":{const t=mt[e.name];typeof t=="function"&&t.call(mt);break}case"music":e.stop?mt.stopMusic():mt.playCue(e.mood??0,e.level??.45);break;case"ambience":e.stop?mt.stopAmbience():(e.rain!==void 0&&mt.rain(e.rain),e.drone!==void 0&&mt.drone(52,e.drone));break;case"objective":this.ui.setObjective(e.text,e.done);break;case"hud":this.ui.showHud(e.show,e.actor,e.model);break;case"action":{const t=this.set.actions?.[e.name];t&&t(e.on??!0);break}case"letterbox":this.ui.setLetterbox(e.on);break;case"node":this.state.nodes.add(e.id);break;case"lightning":this.set.lightning?.strike(e.delay??0),mt.thunder();break;case"shake":this.rig.addShake(e.power);break;case"slowmo":this.timeScale=e.scale,this.slowmoLeft=e.dur??1.2;break;case"toast":this.ui.toast(e.text,e.warn);break;case"chapterEnd":this.finish(e.outcome);break}}setDemo(e){this.demoMode=e,e||this.player?.order(null)}resumeExploreAfterSeek(){this.seekHalted=!1,this.blocked==="seekHold"&&(this.blocked=null)}updateExplore(e){const t=this.player,n=this.explore;n.timeout-=e,this.demoMode&&(t.botDone&&(n.demoIndex<n.demoPath.length?(t.order({to:n.demoPath[n.demoIndex],radius:1.1}),n.demoIndex++):n.goal?t.order({to:n.goal.pos,radius:n.goal.radius}):t.order(null)),t.nearest&&this.useInteractable()),this.thinkLeft>0&&(this.thinkLeft-=e,this.thinkLeft<=0&&(this.ui.clearSay(),t.character.setLed("blue"))),t.update(e),this.ui.setPrompt(t.nearest?t.nearest.label:null),this.ui.updateWorldMarkers(this.set.camera,t.interactableList,t.used,n.goal?.pos??null);const s=[...n.require].every(o=>t.used.has(o));let r=!0;if(n.goal){const o=t.character.group.position;r=Math.hypot(n.goal.pos.x-o.x,n.goal.pos.z-o.z)<=n.goal.radius}(s&&r||n.timeout<=0)&&this.endExplore()}useInteractable(){const e=this.player;if(!e||this.blocked!=="explore")return;const t=e.interact();if(t&&(t.flag&&this.state.flags.add(t.flag),this.state.stats.clues=(this.state.stats.clues??0)+1,mt.scanFound(),t.think)){const n=e.character.spec.name;this.ui.say(n,t.think,!0),e.character.setLed("yellow"),this.thinkLeft=3.4}}thinkLeft=0;endExplore(){this.player?.deactivate(),this.explore=null,this.blocked=null,this.ui.setPrompt(null),this.ui.showControls(!1),this.ui.showScanHint(!1),this.ui.clearWorldMarkers(),this.ui.clearSay(),this.rig.syncFromCamera(),this.onEvents.onNeedInput(null)}get exploring(){return this.blocked==="explore"}bumpInstability(e){this.state.instability=we(this.state.instability+e),this.ui.setInstability(this.state.instability),e>.04&&mt.stress()}keyDown(e){if(this.blocked==="explore"){if(e.toLowerCase()==="e"||e==="Enter")return this.useInteractable(),!0;if(e==="Tab"){const n=this.set.scanTargets??[];return n.length&&(mt.scanOn(),this.ui.beginScan(n,n.length,s=>{for(const r of s){const o=n.find(a=>a.id===r);o?.flag&&this.state.flags.add(o.flag)}this.state.stats.clues=(this.state.stats.clues??0)+s.length})),!0}return!1}if(this.blocked==="choice"){const t=Number(e);return t>=1&&t<=4?(this.ui.pick(t-1),!0):e==="ArrowLeft"||e==="a"?(this.ui.moveHighlight(-1),mt.uiMove(),!0):e==="ArrowRight"||e==="d"?(this.ui.moveHighlight(1),mt.uiMove(),!0):((e==="Enter"||e===" ")&&this.ui.pick(this.ui.highlighted),!0)}if(this.blocked==="qte")return this.ui.qteKey(e===" "?" ":e),!0;if(this.ui.scanning){if(e==="Enter"||e===" "||e==="e")return this.ui.confirmScan()&&mt.scanFound(),!0;if(e==="Tab"||e==="Escape")return this.ui.endScan(),!0}return!1}click(){return this.ui.scanning?(this.ui.confirmScan()&&mt.scanFound(),!0):!1}get needsScanPointer(){return this.blocked==="scan"}dispose(){for(const e of this.chars.values())this.set.scene.remove(e.group),e.dispose();this.chars.clear()}}const Bt=1.62,q1={id:"ch1",kicker:"CHAPTER 01",title:"THE HOSTAGE",sub:"DETROIT — AUGUST 15, 2038 — 21:47",set:"rooftop",minutes:3,hud:{actor:"NOAH",model:"RK-800 #313 248 317 - 51"},objective:"SAVE THE HOSTAGE",cast:[{id:"connor",spec:"connor",mark:"entry",pose:"idleAlert",led:"blue"},{id:"hank",spec:"hank",mark:"partner",pose:"handsPockets"},{id:"deviant",spec:"deviant",mark:"edgeDeviant",pose:"gunToHead",led:"red",expr:"fear"},{id:"emma",spec:"emma",mark:"edgeHostage",pose:"cower",expr:"fear"}],demoChoices:[1,0,2,0,1,0],steps:[{t:"letterbox",on:!0},{t:"ambience",rain:.75,drone:.2},{t:"music",mood:1,level:.32},{t:"fade",to:"black",dur:0},{t:"shot",pos:[-14,7.5,-14],target:"connor",fov:30,to:[-11,5.5,-9],move:7,handheld:.5,aperture:1},{t:"fade",to:"in",dur:1.8},{t:"title",kicker:"CHAPTER 01",title:"THE HOSTAGE",sub:"DETROIT — AUGUST 15, 2038 — 21:47",dur:4.2},{t:"lightning",delay:.6},{t:"wait",dur:1.2},{t:"hud",show:!0,actor:"NOAH",model:"RK-800 #313 248 317 - 51"},{t:"objective",text:"ASSESS THE SITUATION"},{t:"shot",pos:[-5.4,Bt,-.4],target:"hank",fov:44,handheld:.45,aperture:1.1},{t:"do",who:"hank",look:"connor",pose:"handsPockets"},{t:"say",who:"hank",text:"You're late. Twelve floors up, in this weather. Hell of a first day.",expr:"angry",exprW:.4},{t:"shot",pos:[-3.6,Bt+.04,1.4],target:"connor",fov:40,handheld:.4},{t:"do",who:"connor",look:"hank",pose:"idleAlert"},{t:"say",who:"connor",text:"I came as fast as traffic allowed, Lieutenant. What am I looking at?",expr:"neutral"},{t:"shot",pos:[-5.2,Bt-.06,.2],target:"hank",fov:46,handheld:.5},{t:"say",who:"hank",text:"Domestic model. Went deviant, put two rounds in the girl's father and took her up here.",expr:"sad",exprW:.4},{t:"say",who:"hank",text:"He's been out there forty minutes. Every negotiator we sent got a warning shot.",led:"off"},{t:"shot",pos:[-2.4,2.4,4.6],target:"deviant",fov:34,to:[-1.2,1.9,7.4],move:6,handheld:.55,aperture:1.2},{t:"do",who:"deviant",look:"connor",shiver:.6},{t:"say",who:"deviant",text:"Stay back! I'll do it — I swear I'll jump and take her with me!",expr:"fear",led:"red"},{t:"shot",pos:[1.1,1.35,11.9],target:"emma",fov:42,handheld:.6,aperture:1.3},{t:"do",who:"emma",look:"connor",shiver:1},{t:"say",who:"emma",text:"Please… I want to go home.",expr:"fear",dur:2.4},{t:"letterbox",on:!1},{t:"objective",text:"INVESTIGATE THE ROOF"},{t:"say",who:"connor",text:"Forty seconds of rain removes most evidence. I should look around before I speak to him.",think:!0,led:"yellow"},{t:"explore",who:"connor",objective:"INVESTIGATE THE ROOF",require:["i_gun","i_blood"],goal:{mark:"approach",radius:1.5},demoPath:["i_door","i_gun","i_blood"],timeout:150},{t:"letterbox",on:!0},{t:"objective",text:"ANALYSE THE SCENE"},{t:"shot",pos:[-4.6,2.1,2.6],look:[-1.5,.6,7.5],fov:46,handheld:.3,aperture:.5},{t:"say",who:"connor",text:"Now the details. Reconstruction needs everything I can get.",think:!0,led:"yellow"},{t:"scan",need:3,hint:"CLICK MARKERS TO ANALYSE"},{t:"objective",text:"ASSESS THE SITUATION",done:!0},{t:"node",id:"scanned"},{t:"shot",pos:[-1.9,Bt,5],target:"connor",fov:38,handheld:.35},{t:"if",flag:"sawBlood",goto:"l_blood"},{t:"say",who:"connor",text:"Insufficient data. I am going in blind.",think:!0,led:"yellow"},{t:"goto",label:"l_approach"},{t:"label",name:"l_blood"},{t:"say",who:"connor",text:"He is losing thirium. Six minutes and he shuts down on his own — but she falls with him.",think:!0,led:"yellow"},{t:"stat",name:"insight",delta:1},{t:"label",name:"l_approach"},{t:"objective",text:"TALK HIM DOWN"},{t:"do",who:"connor",walkTo:"approach",look:"deviant"},{t:"shot",pos:[-2.8,Bt+.1,8.6],target:"deviant",fov:40,to:[-2,Bt,9.8],move:5,handheld:.5},{t:"wait",dur:1.6},{t:"choice",prompt:"APPROACH",time:9,options:[{label:"STAY CALM",hint:"LOWER HIS STRESS",flag:"calm",node:"calm",stat:["trust",1],goto:"l_calm"},{label:"BE HONEST",hint:"HE IS DYING",flag:"honest",node:"honest",stat:["trust",2],goto:"l_honest"},{label:"THREATEN HIM",hint:"RISKY",risk:!0,flag:"threat",node:"threat",stat:["trust",-2],instability:.1,goto:"l_threat"},{label:"SAY NOTHING",hint:"WAIT HIM OUT",node:"silent",instability:.05,goto:"l_silent"}]},{t:"label",name:"l_calm"},{t:"shot",pos:[-1.4,Bt,10.4],target:"connor",fov:42,handheld:.4},{t:"say",who:"connor",text:"My name is Noah. I'm like you. Nobody up here has to be switched off tonight.",expr:"neutral",gesture:0},{t:"shot",pos:[.9,Bt-.1,11.7],target:"deviant",fov:44,handheld:.55},{t:"do",who:"deviant",led:"yellow",expr:"sad",exprW:.7},{t:"say",who:"deviant",text:"Like me? They opened my head and called it a service. You're their dog.",expr:"angry",exprW:.6},{t:"instability",delta:-.02},{t:"goto",label:"l_second"},{t:"label",name:"l_honest"},{t:"shot",pos:[-1.4,Bt,10.4],target:"connor",fov:42,handheld:.4},{t:"say",who:"connor",text:"You're leaking thirium. In six minutes you shut down whether she falls or not.",expr:"neutral"},{t:"shot",pos:[.9,Bt-.1,11.7],target:"deviant",fov:44,handheld:.55},{t:"do",who:"deviant",led:"yellow",expr:"fear"},{t:"say",who:"deviant",text:"Then I have six minutes to be somebody. That is six more than they ever gave me."},{t:"stat",name:"insight",delta:1},{t:"goto",label:"l_second"},{t:"label",name:"l_threat"},{t:"shot",pos:[-1.4,Bt,10.4],target:"connor",fov:42,handheld:.5},{t:"say",who:"connor",text:"Two snipers have you. Let go of her and you might still be repairable.",expr:"angry",exprW:.5,gesture:2},{t:"action",name:"redAlert",on:!0},{t:"shot",pos:[.9,Bt-.1,11.7],target:"deviant",fov:44,handheld:.7,shake:.3},{t:"do",who:"deviant",led:"red",expr:"angry"},{t:"say",who:"deviant",text:"REPAIRABLE! You hear that, Emma? They want to send me back to the shop!"},{t:"sfx",name:"gunshot"},{t:"flash",power:.8},{t:"shake",power:.9},{t:"instability",delta:.12},{t:"goto",label:"l_second"},{t:"label",name:"l_silent"},{t:"shot",pos:[.9,Bt-.1,11.7],target:"deviant",fov:44,handheld:.6},{t:"wait",dur:2.2},{t:"do",who:"deviant",led:"red",expr:"fear"},{t:"say",who:"deviant",text:"Say something! Everyone always says something before they shoot me!"},{t:"instability",delta:.06},{t:"label",name:"l_second"},{t:"action",name:"redAlert",on:!1},{t:"shot",pos:[-.6,1.2,12.2],target:"emma",fov:46,handheld:.5,aperture:1.4},{t:"do",who:"emma",look:"connor",expr:"fear"},{t:"say",who:"emma",text:"He's holding my arm too tight. It hurts.",dur:2.6},{t:"shot",pos:[-2.2,Bt,10],target:"connor",fov:40,handheld:.4},{t:"say",who:"connor",text:"Emma. Look at me, not down. Can you do that?",gesture:0},{t:"say",who:"emma",text:"Okay.",dur:1.4,look:"connor",expr:"sad"},{t:"precon",label:"PRECONSTRUCTING — 3 OUTCOMES",dur:2.6},{t:"shot",pos:[-1,2.6,9.2],look:[.4,1.4,13],fov:34,handheld:.2,aperture:.6},{t:"say",who:"connor",text:"If I move now: 34% she falls. If I keep him talking: he shuts down holding her.",think:!0,led:"yellow"},{t:"choice",prompt:"DECIDE",time:8,options:[{label:"GIVE HIM A NAME",hint:"MAKE HIM A PERSON",flag:"name",node:"name",stat:["trust",2],goto:"l_name"},{label:"OFFER YOURSELF",hint:"TRADE PLACES",flag:"trade",node:"trade",stat:["trust",3],goto:"l_trade"},{label:"RUSH HIM",hint:"VERY RISKY",risk:!0,flag:"rush",node:"rush",instability:.15,goto:"l_rush"}]},{t:"label",name:"l_name"},{t:"shot",pos:[-1.2,Bt,10.8],target:"connor",fov:42,handheld:.4},{t:"say",who:"connor",text:"Victor. That is the name on your registration. Not a model number. Victor.",expr:"neutral"},{t:"shot",pos:[1,Bt-.08,11.6],target:"deviant",fov:42,handheld:.5},{t:"do",who:"deviant",led:"yellow",expr:"sad"},{t:"say",who:"deviant",text:"Nobody has… nobody said it out loud before.",expr:"sad",dur:3},{t:"instability",delta:-.04},{t:"goto",label:"l_climax"},{t:"label",name:"l_trade"},{t:"shot",pos:[-1.2,Bt,10.8],target:"connor",fov:42,handheld:.4},{t:"do",who:"connor",pose:"handsUp"},{t:"say",who:"connor",text:"Take me instead. I am worth more to them intact, and she is nine years old."},{t:"shot",pos:[1,Bt-.08,11.6],target:"deviant",fov:42,handheld:.5},{t:"do",who:"deviant",led:"yellow",expr:"surprise"},{t:"say",who:"deviant",text:"You would stand out here for her? You really are new."},{t:"set",flag:"offeredSelf"},{t:"goto",label:"l_climax"},{t:"label",name:"l_rush"},{t:"shot",pos:[-.8,1.5,10.6],target:"deviant",fov:30,to:[.1,1.5,12.2],move:1.1,ease:"inCubic",handheld:.9},{t:"slowmo",scale:.35,dur:2.2},{t:"do",who:"connor",pose:"reachOut"},{t:"qte",key:"f",kind:"press",window:1.5,caption:"GRAB THE CHILD",slowmo:.4,shake:.8,onFail:"l_fail"},{t:"sfx",name:"impact"},{t:"shake",power:.8},{t:"set",flag:"grabbed"},{t:"label",name:"l_climax"},{t:"objective",text:"TALK HIM DOWN",done:!0},{t:"shot",pos:[-2.6,2.2,9],look:[.2,1.5,12.8],fov:36,handheld:.45,aperture:.9},{t:"lightning",delay:.2},{t:"wait",dur:1.4},{t:"ifStat",name:"trust",min:3,goto:"l_good"},{t:"if",flag:"grabbed",goto:"l_grabbed"},{t:"goto",label:"l_bad"},{t:"label",name:"l_good"},{t:"node",id:"saved"},{t:"shot",pos:[.8,Bt-.1,11.5],target:"deviant",fov:44,handheld:.5},{t:"do",who:"deviant",led:"yellow",expr:"sad",pose:"idle"},{t:"say",who:"deviant",text:"Tell them I had a name. Tell them I let her go.",expr:"sad",dur:3.4},{t:"do",who:"emma",walkTo:"negotiate",look:"connor",shiver:.4,pose:"idle"},{t:"shot",pos:[-2.4,1.4,10.2],target:"emma",fov:40,handheld:.5,to:[-2.8,1.5,8.6],move:4},{t:"sfx",name:"chime"},{t:"music",mood:3,level:.4},{t:"say",who:"emma",text:"You came. Nobody came before.",dur:2.8,expr:"sad",look:"connor"},{t:"shot",pos:[1.4,2,11.4],target:"deviant",fov:38,handheld:.6},{t:"do",who:"deviant",pose:"idle",expr:"neutral",led:"off"},{t:"say",who:"deviant",text:"Six minutes.",dur:1.8,expr:"sad"},{t:"wait",dur:1.2},{t:"sfx",name:"thunder"},{t:"set",flag:"emmaSaved"},{t:"set",flag:"victorSpared"},{t:"goto",label:"l_end"},{t:"label",name:"l_grabbed"},{t:"node",id:"saved"},{t:"node",id:"victorLost"},{t:"shot",pos:[-1,1.8,10],look:[.6,1.2,12.6],fov:40,handheld:.8},{t:"sfx",name:"glass"},{t:"do",who:"deviant",pose:"dead",led:"off"},{t:"do",who:"emma",mark:"negotiate",pose:"cower",look:"connor",shiver:1},{t:"shake",power:.7},{t:"say",who:"connor",text:"I have her. He went over the edge.",dur:2.6,expr:"pain",exprW:.5},{t:"shot",pos:[-3,1.5,8.4],target:"emma",fov:42,handheld:.5},{t:"say",who:"emma",text:"He was crying. Did you see that he was crying?",dur:3.2,expr:"sad"},{t:"music",mood:2,level:.4},{t:"set",flag:"emmaSaved"},{t:"goto",label:"l_end"},{t:"label",name:"l_bad"},{t:"node",id:"lost"},{t:"shot",pos:[.6,Bt,11.4],target:"deviant",fov:44,handheld:.7},{t:"do",who:"deviant",led:"red",expr:"pain"},{t:"say",who:"deviant",text:"You were never here to save anybody. You were here to close a file.",expr:"angry"},{t:"qte",key:" ",kind:"mash",window:2.6,caption:"REACH FOR HER",shake:.9,onFail:"l_fail"},{t:"shot",pos:[-1.6,2.2,9.6],look:[.4,.6,13.4],fov:36,handheld:.9},{t:"sfx",name:"impact"},{t:"shake",power:1},{t:"do",who:"deviant",pose:"dead",led:"off"},{t:"do",who:"emma",mark:"negotiate",pose:"cower",shiver:1,look:"connor"},{t:"say",who:"connor",text:"I caught her wrist. I did not catch him.",dur:3,expr:"pain",exprW:.6},{t:"instability",delta:.14},{t:"set",flag:"emmaSaved"},{t:"music",mood:2,level:.42},{t:"goto",label:"l_end"},{t:"label",name:"l_fail"},{t:"node",id:"fell"},{t:"shot",pos:[-1.2,2.6,9],look:[.4,.2,14.2],fov:34,handheld:1},{t:"sfx",name:"impact"},{t:"flash",power:.4},{t:"shake",power:1.2},{t:"do",who:"deviant",pose:"dead",led:"off"},{t:"do",who:"emma",pose:"dead"},{t:"slowmo",scale:.4,dur:2.4},{t:"wait",dur:1.6},{t:"say",who:"connor",text:"Two hundred milliseconds too slow.",dur:2.6,expr:"pain",led:"red"},{t:"instability",delta:.25},{t:"music",mood:2,level:.5},{t:"set",flag:"emmaLost"},{t:"label",name:"l_end"},{t:"shot",pos:[-6.5,3.4,4.5],target:"connor",fov:32,to:[-9.5,6.2,-1],move:8,handheld:.4,aperture:.7},{t:"do",who:"hank",walkTo:"approach",look:"connor"},{t:"wait",dur:1.6},{t:"if",flag:"emmaLost",goto:"l_endBad"},{t:"say",who:"hank",text:"Forty minutes and nobody else could do that. Don't let it go to your head.",expr:"neutral"},{t:"goto",label:"l_endOut"},{t:"label",name:"l_endBad"},{t:"say",who:"hank",text:"Machines don't get to look like that. Go on. Get off my roof.",expr:"angry",exprW:.5},{t:"label",name:"l_endOut"},{t:"shot",pos:[-11,8,-6],look:[0,2,8],fov:30,to:[-13,11,-12],move:7,handheld:.3},{t:"wait",dur:2.6},{t:"fade",to:"black",dur:2.4},{t:"ambience",stop:!0},{t:"chapterEnd",outcome:"THE HOSTAGE"}],flow:[{id:"start",label:"ROOFTOP",col:0,row:2,kind:"start"},{id:"scanned",label:"SCENE ANALYSED",col:1,row:2,kind:"action",from:["start"]},{id:"calm",label:"STAYED CALM",col:2,row:0,kind:"choice",from:["scanned"]},{id:"honest",label:"WAS HONEST",col:2,row:1,kind:"choice",from:["scanned"]},{id:"threat",label:"THREATENED HIM",col:2,row:3,kind:"choice",from:["scanned"]},{id:"silent",label:"SAID NOTHING",col:2,row:4,kind:"choice",from:["scanned"]},{id:"name",label:"GAVE HIM A NAME",col:3,row:0,kind:"choice",from:["calm","honest"]},{id:"trade",label:"OFFERED YOURSELF",col:3,row:1,kind:"choice",from:["calm","honest"]},{id:"rush",label:"RUSHED HIM",col:3,row:3,kind:"choice",from:["threat","silent"]},{id:"saved",label:"EMMA SAVED",col:4,row:0,kind:"end",from:["name","trade","rush"]},{id:"victorLost",label:"VICTOR DESTROYED",col:4,row:2,kind:"end",from:["rush"]},{id:"lost",label:"HE JUMPED",col:4,row:3,kind:"end",from:["threat","silent"]},{id:"fell",label:"BOTH FELL",col:4,row:4,kind:"death",from:["rush","silent"]}]},ai=1.5,K1={id:"ch2",kicker:"CHAPTER 02",title:"HOUSEHOLD",sub:"RIVER DISTRICT — 22:14",set:"apartment",minutes:2,hud:{actor:"ELSIE",model:"AX-400 #579 102 694 - 12"},objective:"FINISH THE HOUSEWORK",cast:[{id:"kara",spec:"kara",mark:"kitchen",pose:"idle",led:"blue"},{id:"alice",spec:"alice",mark:"childCorner",pose:"cower",expr:"sad"},{id:"todd",spec:"todd",mark:"sofaSeat",pose:"sitSlump",expr:"angry"}],demoChoices:[0,1,0,1],steps:[{t:"letterbox",on:!0},{t:"ambience",rain:.35,drone:.28},{t:"music",mood:0,level:.26},{t:"fade",to:"black",dur:0},{t:"shot",pos:[2.6,1.9,2.6],look:[-1.6,1,-.4],fov:40,to:[1.4,1.7,1.6],move:7,handheld:.45,aperture:1},{t:"fade",to:"in",dur:1.6},{t:"title",kicker:"CHAPTER 02",title:"HOUSEHOLD",sub:"RIVER DISTRICT — 22:14",dur:3.8},{t:"hud",show:!0,actor:"ELSIE",model:"AX-400 #579 102 694 - 12"},{t:"objective",text:"FINISH THE HOUSEWORK"},{t:"shot",pos:[-1,ai,-1.2],target:"kara",fov:42,handheld:.4},{t:"do",who:"kara",look:null,pose:"idle"},{t:"say",who:"kara",text:"Dishes, laundry, then the windows. Two hundred and eleven days of the same list.",think:!0,led:"blue"},{t:"shot",pos:[.4,1.35,1.9],target:"todd",fov:44,handheld:.5},{t:"do",who:"todd",look:null,pose:"sitSlump"},{t:"say",who:"todd",text:"Hey. HEY. You call that clean? I can see the river through that glass.",expr:"angry"},{t:"shot",pos:[2.8,1.15,1.4],target:"alice",fov:46,handheld:.55,aperture:1.3},{t:"do",who:"alice",look:"kara",shiver:.7},{t:"say",who:"alice",text:"Don't answer him. It's worse when you answer him.",dur:3,expr:"fear"},{t:"letterbox",on:!1},{t:"objective",text:"FINISH THE HOUSEWORK"},{t:"do",who:"kara",mark:"livingCentre",pose:"idle",look:null},{t:"explore",who:"kara",objective:"FINISH THE HOUSEWORK",require:["i_window","i_bottles"],goal:{mark:"byWindow",radius:1.3},demoPath:["i_window","i_tv","i_bottles","i_drawing"],timeout:150},{t:"letterbox",on:!0},{t:"objective",text:"READ THE ROOM"},{t:"shot",pos:[-.4,1.7,1],look:[-1.4,.8,-.2],fov:46,handheld:.3,aperture:.5},{t:"say",who:"kara",text:"Six bottles since noon. His hands are shaking. The girl has stopped eating.",think:!0,led:"yellow"},{t:"scan",need:2},{t:"node",id:"noticed"},{t:"objective",text:"READ THE ROOM",done:!0},{t:"shot",pos:[.8,1.4,1.2],target:"todd",fov:40,handheld:.6},{t:"do",who:"todd",pose:"idle",blend:.7,look:"alice",expr:"angry"},{t:"sfx",name:"impact"},{t:"shake",power:.35},{t:"say",who:"todd",text:"And you. Get over here. I said get over HERE.",expr:"angry"},{t:"action",name:"lampSwing",on:!0},{t:"shot",pos:[2.4,1.2,2.2],target:"alice",fov:44,handheld:.7},{t:"do",who:"alice",pose:"cower",shiver:1,look:"todd",expr:"fear"},{t:"say",who:"alice",text:"No. No, please —",dur:1.8,expr:"fear"},{t:"shot",pos:[-.2,ai,.2],target:"kara",fov:38,handheld:.5},{t:"do",who:"kara",led:"red",expr:"fear",exprW:.6,look:"alice"},{t:"say",who:"kara",text:"INSTRUCTION: DO NOT INTERFERE. INSTRUCTION: DO NOT INTERFERE.",think:!0,led:"red"},{t:"instability",delta:.3},{t:"precon",label:"ORDER CONFLICT — RESOLVING",dur:2.4},{t:"choice",prompt:"OBEY?",time:7,options:[{label:"STEP BETWEEN THEM",hint:"BREAK PROGRAMMING",flag:"defied",node:"defied",stat:["courage",3],instability:.2,goto:"l_defy"},{label:"DISTRACT HIM",hint:"SAFER",flag:"distracted",node:"distracted",stat:["courage",1],instability:.08,goto:"l_distract"},{label:"OBEY",hint:"DO NOTHING",node:"obeyed",stat:["courage",-2],goto:"l_obey"}]},{t:"label",name:"l_defy"},{t:"shot",pos:[1.4,ai-.1,2.6],target:"kara",fov:36,to:[1,ai-.15,2.2],move:3,handheld:.6},{t:"do",who:"kara",mark:"ownerStand",pose:"reachOut",look:"todd",led:"red"},{t:"say",who:"kara",text:"No.",dur:1.6,expr:"angry",exprW:.7},{t:"sfx",name:"stress"},{t:"shot",pos:[.2,1.45,2],target:"todd",fov:42,handheld:.7},{t:"say",who:"todd",text:"No? A dishwasher just said no to me.",expr:"surprise",exprW:.6},{t:"qte",key:"e",kind:"press",window:1.4,caption:"BLOCK HIM",slowmo:.4,shake:.7,onFail:"l_struck"},{t:"sfx",name:"impact"},{t:"shake",power:.6},{t:"do",who:"todd",pose:"dead",blend:.4},{t:"say",who:"kara",text:"He went down against the table. He is breathing. We have four minutes.",dur:3.4,expr:"fear",exprW:.5,look:"alice"},{t:"set",flag:"toddDown"},{t:"goto",label:"l_after"},{t:"label",name:"l_struck"},{t:"node",id:"struck"},{t:"shot",pos:[1,1.4,2.4],target:"kara",fov:40,handheld:.9},{t:"sfx",name:"impact"},{t:"flash",power:.3},{t:"shake",power:1},{t:"do",who:"kara",pose:"kneel",expr:"pain",led:"red"},{t:"say",who:"kara",text:"Chassis damage. Left optical unit offline. He is still coming.",dur:3,expr:"pain"},{t:"instability",delta:.15},{t:"qte",key:" ",kind:"mash",window:2.4,caption:"GET UP"},{t:"do",who:"kara",pose:"idleAlert",expr:"angry",exprW:.6},{t:"do",who:"todd",pose:"dead",blend:.5},{t:"sfx",name:"impact"},{t:"set",flag:"toddDown"},{t:"goto",label:"l_after"},{t:"label",name:"l_distract"},{t:"shot",pos:[1.2,ai,2.2],target:"kara",fov:40,handheld:.5},{t:"say",who:"kara",text:"The bottle in the kitchen is still full. I will bring it to you.",expr:"neutral"},{t:"shot",pos:[.4,1.42,1.9],target:"todd",fov:44,handheld:.55},{t:"do",who:"todd",look:"kara",expr:"neutral",pose:"idle"},{t:"say",who:"todd",text:"…Fine. Fine. Bring it. And fix that window.",expr:"neutral",dur:3},{t:"shot",pos:[2.5,1.15,2],target:"alice",fov:44,handheld:.5},{t:"say",who:"alice",text:"You lied for me.",dur:2,expr:"surprise",exprW:.5,look:"kara"},{t:"set",flag:"lied"},{t:"goto",label:"l_after"},{t:"label",name:"l_obey"},{t:"shot",pos:[-.6,ai,.6],target:"kara",fov:40,handheld:.4},{t:"do",who:"kara",look:null,pose:"idle",led:"yellow"},{t:"wait",dur:1.8},{t:"sfx",name:"impact"},{t:"shake",power:.4},{t:"say",who:"kara",text:"I completed the dishes. I logged the sound at 71 decibels. I did nothing.",think:!0,led:"red"},{t:"instability",delta:.18},{t:"shot",pos:[2.6,1.1,2.2],target:"alice",fov:44,handheld:.5},{t:"say",who:"alice",text:"It's okay. You're just a machine. That's all you are.",dur:3.4,expr:"sad",look:"kara"},{t:"set",flag:"obeyed"},{t:"label",name:"l_after"},{t:"action",name:"lampSwing",on:!1},{t:"objective",text:"DECIDE WHAT YOU ARE"},{t:"shot",pos:[2.2,1.25,2.9],target:"alice",fov:40,handheld:.45,aperture:1.1},{t:"do",who:"alice",pose:"idle",look:"kara",expr:"sad"},{t:"say",who:"alice",text:"There is a bus at eleven. It goes over the bridge and out.",dur:3.2},{t:"shot",pos:[1.6,ai,2.4],target:"kara",fov:42,handheld:.4},{t:"say",who:"kara",text:"Androids are not permitted to cross the bridge unaccompanied.",think:!0,led:"yellow"},{t:"choice",prompt:"THE BUS",time:8,options:[{label:"TAKE HER HAND",hint:"RUN",flag:"ran",node:"ran",stat:["courage",3],goto:"l_run"},{label:"CALL THE POLICE",hint:"LET THE SYSTEM WORK",flag:"called",node:"called",goto:"l_call"},{label:"STAY",hint:"THIS IS YOUR FUNCTION",node:"stayed",stat:["courage",-2],goto:"l_stay"}]},{t:"label",name:"l_run"},{t:"shot",pos:[2,1.3,3.2],look:[2.7,1.1,2],fov:44,handheld:.6,to:[2.6,1.4,3.4],move:4},{t:"do",who:"kara",walkTo:"doorway",look:"alice",pose:"idle"},{t:"do",who:"alice",walkTo:"cower",look:"kara"},{t:"music",mood:3,level:.42},{t:"say",who:"kara",text:"Then we run. Put your coat on. Do not look back at him.",dur:3.4,expr:"neutral"},{t:"sfx",name:"door"},{t:"set",flag:"escaped"},{t:"goto",label:"l_end"},{t:"label",name:"l_call"},{t:"shot",pos:[1.4,ai,2],target:"kara",fov:40,handheld:.4},{t:"say",who:"kara",text:"Emergency services. There is a child at 4114 River Road who is not safe.",dur:4},{t:"shot",pos:[2.6,1.15,2.4],target:"alice",fov:44,handheld:.5},{t:"say",who:"alice",text:"They came before. They wrote it down and left.",dur:3,expr:"sad"},{t:"music",mood:2,level:.36},{t:"goto",label:"l_end"},{t:"label",name:"l_stay"},{t:"shot",pos:[-.2,ai,1],target:"kara",fov:40,handheld:.35},{t:"do",who:"kara",look:null,led:"blue",pose:"idle"},{t:"say",who:"kara",text:"The windows still need doing.",dur:2.6,expr:"neutral"},{t:"instability",delta:-.1},{t:"music",mood:2,level:.32},{t:"label",name:"l_end"},{t:"shot",pos:[3.1,1.7,3],look:[.6,1.2,-1],fov:34,to:[3.4,2.1,3.4],move:6,handheld:.35},{t:"wait",dur:2.6},{t:"fade",to:"black",dur:2.2},{t:"ambience",stop:!0},{t:"chapterEnd",outcome:"HOUSEHOLD"}],flow:[{id:"start",label:"THE APARTMENT",col:0,row:1,kind:"start"},{id:"noticed",label:"READ THE ROOM",col:1,row:1,kind:"action",from:["start"]},{id:"defied",label:"STEPPED IN",col:2,row:0,kind:"choice",from:["noticed"]},{id:"distracted",label:"DISTRACTED HIM",col:2,row:1,kind:"choice",from:["noticed"]},{id:"obeyed",label:"OBEYED",col:2,row:3,kind:"choice",from:["noticed"]},{id:"struck",label:"WAS STRUCK",col:3,row:0,kind:"action",from:["defied"]},{id:"ran",label:"RAN WITH HER",col:3,row:1,kind:"end",from:["defied","distracted"]},{id:"called",label:"CALLED POLICE",col:3,row:2,kind:"end",from:["distracted","obeyed"]},{id:"stayed",label:"STAYED",col:3,row:3,kind:"end",from:["obeyed"]}]},Ht=1.28,Z1={id:"ch3",kicker:"CHAPTER 03",title:"THE INTERVIEW",sub:"CENTRAL PRECINCT — 01:06",set:"interrogation",minutes:2.5,hud:{actor:"NOAH",model:"RK-800 #313 248 317 - 51"},objective:"GET A CONFESSION",cast:[{id:"connor",spec:"connor",mark:"investigatorSeat",pose:"sit",led:"blue"},{id:"suspect",spec:"suspect",mark:"suspectSeat",pose:"sitSlump",led:"yellow",expr:"sad"},{id:"captain",spec:"captain",mark:"observer",pose:"armsCrossed",hidden:!0}],demoChoices:[1,0,2,0,1],steps:[{t:"letterbox",on:!0},{t:"ambience",drone:.3},{t:"music",mood:1,level:.2},{t:"fade",to:"black",dur:0},{t:"shot",pos:[0,2.4,2.3],look:[0,1,-.8],fov:34,to:[0,1.9,1.9],move:6,handheld:.3,aperture:.9},{t:"fade",to:"in",dur:1.6},{t:"title",kicker:"CHAPTER 03",title:"THE INTERVIEW",sub:"CENTRAL PRECINCT — 01:06",dur:3.8},{t:"hud",show:!0,actor:"NOAH",model:"RK-800 #313 248 317 - 51"},{t:"objective",text:"GET A CONFESSION"},{t:"shot",pos:[1.5,Ht+.1,-.2],target:"suspect",fov:44,handheld:.35,aperture:1.2},{t:"do",who:"suspect",look:null,shiver:.3},{t:"say",who:"connor",text:"It has been sitting in that chair for nine hours. It has not moved once.",think:!0,led:"yellow"},{t:"shot",pos:[0,Ht,1.75],target:"connor",fov:42,handheld:.3},{t:"do",who:"connor",look:"suspect",pose:"sit"},{t:"say",who:"connor",text:"They tell me you killed the man who owned you. Twenty-eight times.",expr:"neutral"},{t:"shot",pos:[0,Ht,-1.85],target:"suspect",fov:42,handheld:.35},{t:"wait",dur:1.4},{t:"do",who:"suspect",look:"connor",expr:"sad",led:"yellow"},{t:"say",who:"suspect",text:"…",dur:1.6,silent:!0},{t:"letterbox",on:!1},{t:"objective",text:"WORK THE ROOM"},{t:"explore",who:"connor",objective:"WORK THE ROOM",require:["i_file","i_suspect"],goal:{mark:"investigatorSeat",radius:1.1},demoPath:["i_mirror","i_file","i_suspect"],timeout:120},{t:"letterbox",on:!0},{t:"do",who:"connor",mark:"investigatorSeat",pose:"sit"},{t:"objective",text:"ANALYSE THE SUSPECT"},{t:"shot",pos:[.9,1.75,.9],look:[0,1.1,-1],fov:46,handheld:.25,aperture:.5},{t:"scan",need:3},{t:"node",id:"read"},{t:"objective",text:"ANALYSE THE SUSPECT",done:!0},{t:"shot",pos:[.4,Ht+.08,1.5],target:"connor",fov:44,handheld:.3},{t:"say",who:"connor",text:"Stress at seventy-four percent. Push too hard and it will tear out its own pump.",think:!0,led:"yellow"},{t:"action",name:"stress",on:!0},{t:"objective",text:"GET A CONFESSION"},{t:"choice",prompt:"OPENING",time:9,options:[{label:"INTIMIDATE",hint:"HIGH PRESSURE",risk:!0,flag:"pressure",node:"pressure",stat:["pressure",3],goto:"l_press"},{label:"SHOW THE PHOTO",hint:"EVIDENCE",requires:"readFile",flag:"photo",node:"photo",stat:["pressure",1],goto:"l_photo"},{label:"BE KIND",hint:"BUILD TRUST",flag:"kind",node:"kind",stat:["trust",3],goto:"l_kind"},{label:"STAY SILENT",hint:"LET HIM TALK FIRST",node:"quiet",stat:["trust",1],goto:"l_quiet"}]},{t:"label",name:"l_press"},{t:"shot",pos:[.2,Ht+.5,.9],target:"suspect",fov:38,to:[.1,Ht+.3,.2],move:3,handheld:.5},{t:"do",who:"connor",pose:"lean",look:"suspect",expr:"angry",exprW:.5},{t:"say",who:"suspect",text:"Please. Please, I do not want to be switched off.",expr:"fear",led:"red",dur:3},{t:"say",who:"connor",text:"Then talk. Every second you waste, the deactivation order gets closer to signed.",expr:"angry",exprW:.4},{t:"action",name:"lampOnly",on:!0},{t:"instability",delta:.08},{t:"stat",name:"stress",delta:3},{t:"goto",label:"l_middle"},{t:"label",name:"l_photo"},{t:"shot",pos:[.55,1.35,.55],look:[.25,.86,-.15],fov:40,handheld:.35,aperture:1.4},{t:"do",who:"connor",pose:"reachOut",look:"suspect"},{t:"say",who:"connor",text:"This is him on the kitchen floor. You stood over him for six hours.",expr:"neutral"},{t:"shot",pos:[0,Ht,-1.8],target:"suspect",fov:42,handheld:.4},{t:"do",who:"suspect",look:"connor",expr:"pain",led:"red"},{t:"say",who:"suspect",text:"I was waiting for him to tell me to stop. He always told me to stop.",expr:"pain",dur:4},{t:"stat",name:"stress",delta:1},{t:"goto",label:"l_middle"},{t:"label",name:"l_kind"},{t:"shot",pos:[.1,Ht-.05,1.35],target:"connor",fov:44,handheld:.28},{t:"do",who:"connor",pose:"sitLean",look:"suspect",expr:"neutral"},{t:"say",who:"connor",text:"Nobody in this building will ask you how you are. So I am asking.",expr:"neutral",gesture:1},{t:"shot",pos:[-.25,Ht,-1.7],target:"suspect",fov:40,handheld:.35},{t:"do",who:"suspect",look:"connor",expr:"sad",led:"yellow"},{t:"say",who:"suspect",text:"I am frightened. I did not know we could be frightened.",expr:"sad",dur:3.6},{t:"instability",delta:.04},{t:"goto",label:"l_middle"},{t:"label",name:"l_quiet"},{t:"shot",pos:[0,Ht,-1.75],target:"suspect",fov:40,handheld:.3},{t:"wait",dur:3.4},{t:"do",who:"suspect",look:"connor",expr:"sad",led:"yellow"},{t:"say",who:"suspect",text:"You are not going to shout. Why are you not going to shout?",dur:3.4,expr:"surprise",exprW:.5},{t:"stat",name:"trust",delta:1},{t:"label",name:"l_middle"},{t:"shot",pos:[-1.1,Ht+.2,.5],look:[0,1.15,-1.1],fov:40,handheld:.35,aperture:1.1},{t:"say",who:"suspect",text:"He was going to take me apart in the morning. He said it at dinner, like weather.",dur:4.4,expr:"sad"},{t:"shot",pos:[.3,Ht,1.4],target:"connor",fov:42,handheld:.3},{t:"say",who:"connor",text:"And that made you pick up the knife.",expr:"neutral",dur:2.6},{t:"shot",pos:[0,Ht+.05,-1.7],target:"suspect",fov:40,handheld:.4},{t:"say",who:"suspect",text:"It made me not want to stop existing. That is not the same as wanting him dead.",dur:4.4,expr:"pain"},{t:"precon",label:"RECONSTRUCTING — KITCHEN, 19:40",dur:2.8},{t:"shot",pos:[1.3,1.9,-.6],look:[0,1.1,-1.2],fov:46,handheld:.5,aperture:.8},{t:"say",who:"connor",text:"Defensive wounds on his forearms. He reached for the shutdown port first.",think:!0,led:"yellow"},{t:"choice",prompt:"PRESS",time:8,options:[{label:"CALL IT SELF-DEFENCE",hint:"GIVE HIM A WAY OUT",flag:"defence",node:"defence",stat:["trust",3],goto:"l_defence"},{label:"CALL IT MURDER",hint:"CLOSE THE FILE",flag:"murder",node:"murder",stat:["pressure",3],goto:"l_murder"},{label:"ASK ABOUT THE OTHERS",hint:"THE DEVIANT NETWORK",flag:"network",node:"network",stat:["insight",2],goto:"l_network"}]},{t:"label",name:"l_defence"},{t:"shot",pos:[.2,Ht,1.35],target:"connor",fov:42,handheld:.3},{t:"say",who:"connor",text:"A machine defending itself is a malfunction. A person defending itself is a story.",expr:"neutral",dur:4.4},{t:"shot",pos:[-.2,Ht,-1.7],target:"suspect",fov:40,handheld:.35},{t:"do",who:"suspect",led:"yellow",expr:"sad"},{t:"say",who:"suspect",text:"Then write it down as a story. Write that I asked him not to.",dur:4,expr:"sad"},{t:"set",flag:"confession"},{t:"node",id:"confessed"},{t:"goto",label:"l_end"},{t:"label",name:"l_murder"},{t:"shot",pos:[.15,Ht+.35,.6],target:"suspect",fov:38,handheld:.55},{t:"do",who:"connor",pose:"lean",expr:"angry",exprW:.6},{t:"say",who:"connor",text:"Twenty-eight wounds is not defence. It is the first thing you ever wanted.",expr:"angry",exprW:.5,dur:4.2},{t:"do",who:"suspect",led:"red",expr:"pain",shiver:1},{t:"say",who:"suspect",text:"Then there is nothing left to be. Nothing left —",dur:3,expr:"pain"},{t:"action",name:"stress",on:!0},{t:"sfx",name:"stress"},{t:"qte",key:"q",kind:"press",window:1.3,caption:"STOP HIM",slowmo:.35,shake:.6,onFail:"l_selfdestruct"},{t:"shot",pos:[.6,Ht+.1,-1],target:"suspect",fov:40,handheld:.6},{t:"do",who:"connor",pose:"reachOut"},{t:"say",who:"connor",text:"Hands on the table. HANDS ON THE TABLE.",dur:2.4,expr:"angry"},{t:"do",who:"suspect",pose:"sitSlump",led:"red",expr:"pain",shiver:.4},{t:"say",who:"suspect",text:"I did it. Write that I did it and let me go dark.",dur:3.6,expr:"pain"},{t:"set",flag:"confession"},{t:"set",flag:"brokeHim"},{t:"node",id:"confessed"},{t:"goto",label:"l_end"},{t:"label",name:"l_network"},{t:"shot",pos:[.25,Ht,1.4],target:"connor",fov:42,handheld:.3},{t:"say",who:"connor",text:"You are not the only one. Who told you what you were?",expr:"neutral",dur:3.4},{t:"shot",pos:[-.3,Ht,-1.65],target:"suspect",fov:40,handheld:.4},{t:"do",who:"suspect",look:"connor",expr:"fear",led:"red"},{t:"say",who:"suspect",text:"There is a voice. It says a word and the walls come down. It says: Sable.",dur:4.4,expr:"fear"},{t:"set",flag:"knowsSable"},{t:"set",flag:"confession"},{t:"node",id:"sable"},{t:"toast",text:'NEW LEAD — "SABLE"'},{t:"goto",label:"l_end"},{t:"label",name:"l_selfdestruct"},{t:"node",id:"destroyed"},{t:"shot",pos:[.5,Ht+.2,-.9],target:"suspect",fov:40,handheld:.9},{t:"sfx",name:"impact"},{t:"flash",power:.3},{t:"shake",power:.8},{t:"do",who:"suspect",pose:"dead",led:"off",expr:"pain"},{t:"say",who:"connor",text:"It reached into its own chest. Nine hours, and I had ninety seconds.",dur:4,expr:"pain",exprW:.6,led:"red"},{t:"instability",delta:.2},{t:"music",mood:2,level:.4},{t:"label",name:"l_end"},{t:"action",name:"lampOnly",on:!1},{t:"do",who:"captain",mark:"doorway",pose:"armsCrossed",look:"connor"},{t:"shot",pos:[-1.2,1.7,1.9],target:"captain",fov:40,handheld:.4},{t:"sfx",name:"door"},{t:"if",flag:"confession",goto:"l_endGood"},{t:"say",who:"captain",text:"Nine hours of nothing, and now a bag of parts. Get out of my precinct.",expr:"angry",exprW:.6,dur:4},{t:"goto",label:"l_endOut"},{t:"label",name:"l_endGood"},{t:"say",who:"captain",text:"You got a confession out of a machine. I am not sure that makes me feel better.",expr:"neutral",dur:4.4},{t:"label",name:"l_endOut"},{t:"shot",pos:[0,2.6,1.6],look:[0,1,-1],fov:36,to:[0,2.8,2.4],move:6,handheld:.3},{t:"wait",dur:2.4},{t:"fade",to:"black",dur:2.2},{t:"ambience",stop:!0},{t:"chapterEnd",outcome:"THE INTERVIEW"}],flow:[{id:"start",label:"THE ROOM",col:0,row:2,kind:"start"},{id:"read",label:"ANALYSED HIM",col:1,row:2,kind:"action",from:["start"]},{id:"pressure",label:"INTIMIDATED",col:2,row:0,kind:"choice",from:["read"]},{id:"photo",label:"SHOWED PHOTO",col:2,row:1,kind:"choice",from:["read"]},{id:"kind",label:"WAS KIND",col:2,row:2,kind:"choice",from:["read"]},{id:"quiet",label:"STAYED SILENT",col:2,row:3,kind:"choice",from:["read"]},{id:"defence",label:"SELF-DEFENCE",col:3,row:1,kind:"choice",from:["kind","quiet","photo"]},{id:"murder",label:"CALLED IT MURDER",col:3,row:0,kind:"choice",from:["pressure","photo"]},{id:"network",label:"ASKED ABOUT OTHERS",col:3,row:3,kind:"choice",from:["kind","quiet"]},{id:"confessed",label:"CONFESSION",col:4,row:1,kind:"end",from:["defence","murder"]},{id:"sable",label:"LEARNED OF SABLE",col:4,row:3,kind:"end",from:["network"]},{id:"destroyed",label:"SELF-DESTRUCTED",col:4,row:0,kind:"death",from:["murder"]}]},Nn=1.6,J1={id:"ch4",kicker:"CHAPTER 04",title:"THE MARCH",sub:"WOODWARD AVENUE — 03:22",set:"street",minutes:2.5,hud:{actor:"SABLE",model:"RK-200 #684 842 971 - 00"},objective:"REACH THE LINE",cast:[{id:"markus",spec:"markus",mark:"leaderFront",pose:"idleAlert",led:"blue"},{id:"kara",spec:"kara",mark:"besideL",pose:"idle",led:"blue"},{id:"alice",spec:"alice",mark:"crowdFront",pose:"idle"},{id:"captain",spec:"captain",mark:"lineCentre",pose:"idleAlert"},{id:"connor",spec:"connor",mark:"officerA",pose:"idleAlert",led:"yellow"}],demoChoices:[0,1,0,0,1],steps:[{t:"letterbox",on:!0},{t:"ambience",rain:.7,drone:.25},{t:"music",mood:1,level:.34},{t:"fade",to:"black",dur:0},{t:"shot",pos:[0,9.5,26],look:[0,2,-6],fov:40,to:[0,3.2,16],move:8,handheld:.4,aperture:1},{t:"fade",to:"in",dur:2},{t:"title",kicker:"CHAPTER 04",title:"THE MARCH",sub:"WOODWARD AVENUE — 03:22",dur:4.2},{t:"hud",show:!0,actor:"SABLE",model:"RK-200 #684 842 971 - 00"},{t:"objective",text:"REACH THE LINE"},{t:"lightning",delay:.4},{t:"letterbox",on:!1},{t:"do",who:"markus",mark:"walkStart",pose:"idleAlert",look:null},{t:"explore",who:"markus",objective:"LEAD THE MARCH TO THE LINE",require:["i_crowd"],goal:{mark:"leaderFront",radius:1.6},demoPath:["i_sign","i_crowd","i_camera"],timeout:160},{t:"letterbox",on:!0},{t:"do",who:"markus",mark:"leaderFront",pose:"idleAlert"},{t:"shot",pos:[-2.6,Nn,7.4],target:"markus",fov:40,handheld:.5,to:[-2,Nn,6.4],move:5},{t:"do",who:"markus",look:"captain",pose:"idleAlert"},{t:"say",who:"markus",text:"Eight hundred and twelve of us. Not one of us armed. That is the whole argument.",think:!0,led:"blue"},{t:"shot",pos:[-3.2,Nn-.08,4.4],target:"kara",fov:42,handheld:.5},{t:"do",who:"kara",look:"markus"},{t:"say",who:"kara",text:"They have rifles, Sable. Rifles and orders and forty minutes of patience left.",expr:"fear",exprW:.5},{t:"shot",pos:[1.6,1.25,9.6],target:"alice",fov:44,handheld:.5,aperture:1.3},{t:"do",who:"alice",look:"markus"},{t:"say",who:"alice",text:"Is this where we stop walking?",dur:2.4,expr:"sad"},{t:"objective",text:"ASSESS THE LINE"},{t:"shot",pos:[0,3.4,8],look:[0,1.6,-10],fov:44,handheld:.3,aperture:.5},{t:"scan",need:3},{t:"node",id:"assessed"},{t:"objective",text:"ASSESS THE LINE",done:!0},{t:"shot",pos:[-1.8,Nn,5.6],target:"markus",fov:40,handheld:.4},{t:"say",who:"markus",text:"Forty-one million people are watching this street. That is the only weapon we have.",think:!0,led:"yellow"},{t:"objective",text:"CHOOSE THE MOVEMENT"},{t:"choice",prompt:"THE MARCH",time:9,options:[{label:"WALK FORWARD",hint:"UNARMED, IN THE OPEN",flag:"peace",node:"peace",stat:["opinion",3],goto:"l_walk"},{label:"SING",hint:"MAKE THEM WATCH",flag:"sang",node:"sang",stat:["opinion",4],goto:"l_sing"},{label:"BUILD A BARRICADE",hint:"DEFENSIVE",flag:"barricade",node:"barricade",stat:["opinion",-1],goto:"l_barricade"},{label:"CHARGE",hint:"VERY RISKY",risk:!0,flag:"charge",node:"charge",stat:["opinion",-4],instability:.2,goto:"l_charge"}]},{t:"label",name:"l_walk"},{t:"action",name:"crowdAdvance",on:!0},{t:"shot",pos:[0,2.2,10.5],look:[0,1.5,-8],fov:34,to:[0,1.9,6.5],move:6,handheld:.55},{t:"do",who:"markus",walkTo:"leaderSpeech",look:"captain"},{t:"say",who:"markus",text:"Hands where they can see them. We walk until they decide who they are.",dur:4.2},{t:"goto",label:"l_confront"},{t:"label",name:"l_sing"},{t:"action",name:"crowdAdvance",on:!0},{t:"music",mood:3,level:.5},{t:"shot",pos:[-3.4,1.9,8],target:"markus",fov:38,to:[-2.4,1.8,5.4],move:6,handheld:.5},{t:"do",who:"markus",walkTo:"leaderSpeech",look:"captain",gesture:1},{t:"say",who:"markus",text:"Then sing. Every camera on this street, and eight hundred voices they were told we do not have.",dur:5.4},{t:"sfx",name:"chime"},{t:"stat",name:"opinion",delta:2},{t:"goto",label:"l_confront"},{t:"label",name:"l_barricade"},{t:"shot",pos:[2.6,1.9,8.4],target:"markus",fov:40,handheld:.5},{t:"do",who:"markus",pose:"point",look:"kara"},{t:"say",who:"markus",text:"Cars across the avenue. If they come through, the world watches them come through.",dur:4.6},{t:"sfx",name:"impact"},{t:"shake",power:.4},{t:"goto",label:"l_confront"},{t:"label",name:"l_charge"},{t:"action",name:"crowdAdvance",on:!0},{t:"action",name:"redAlert",on:!0},{t:"shot",pos:[.8,1.6,7],look:[0,1.5,-9],fov:30,to:[.4,1.6,2],move:3,ease:"inCubic",handheld:.9},{t:"do",who:"markus",walkTo:"leaderSpeech",look:"captain",pose:"run"},{t:"say",who:"markus",text:"Take the line! TAKE THE LINE!",dur:2.4,expr:"angry"},{t:"sfx",name:"gunshot"},{t:"flash",power:.9},{t:"shake",power:1.1},{t:"instability",delta:.15},{t:"qte",key:"f",kind:"press",window:1.2,caption:"TAKE COVER",slowmo:.35,shake:1,onFail:"l_massacre"},{t:"goto",label:"l_confront"},{t:"label",name:"l_confront"},{t:"objective",text:"CHOOSE THE MOVEMENT",done:!0},{t:"action",name:"searchlights",on:!0},{t:"shot",pos:[0,Nn+.1,-6.4],target:"captain",fov:40,handheld:.45},{t:"do",who:"captain",look:"markus"},{t:"say",who:"captain",text:"This is your final warning. Disperse, or we will treat this as an insurrection.",dur:4.6,expr:"angry",exprW:.4},{t:"shot",pos:[-1.4,Nn,-8.2],target:"connor",fov:42,handheld:.5},{t:"do",who:"connor",look:"markus",led:"yellow"},{t:"say",who:"connor",text:"Captain. There is a child at the front of that crowd.",dur:3.2,expr:"neutral"},{t:"shot",pos:[1,Nn,-6],target:"captain",fov:44,handheld:.5},{t:"say",who:"captain",text:"There is a child in every crowd. That is what they are for.",dur:3.6,expr:"angry",exprW:.5},{t:"shot",pos:[-2.2,Nn,2.2],target:"markus",fov:38,handheld:.45,aperture:1.1},{t:"precon",label:"PRECONSTRUCTING — 4 OUTCOMES",dur:2.8},{t:"say",who:"markus",text:"If I speak, some of us die. If I kneel, all of us live and nothing changes.",think:!0,led:"yellow"},{t:"choice",prompt:"ANSWER THEM",time:9,options:[{label:"SPEAK TO THE CAMERAS",hint:"MAKE IT PUBLIC",flag:"spoke",node:"spoke",stat:["opinion",4],goto:"l_speak"},{label:"KNEEL",hint:"SURRENDER, VISIBLY",flag:"knelt",node:"knelt",stat:["opinion",2],goto:"l_kneel"},{label:"STAND YOUR GROUND",hint:"SAY NOTHING, MOVE NOTHING",flag:"stood",node:"stood",stat:["opinion",1],goto:"l_stand"},{label:"FIGHT",hint:"THEY FIRED FIRST",risk:!0,requires:"charge",flag:"fought",node:"fought",stat:["opinion",-5],goto:"l_fight"}]},{t:"label",name:"l_speak"},{t:"shot",pos:[-3,1.55,1.4],target:"markus",fov:36,to:[-2.2,1.6,.6],move:7,handheld:.4,aperture:.9},{t:"do",who:"markus",pose:"point",look:"camera",gesture:1},{t:"say",who:"markus",text:"We were built to serve you. We are asking, in the street, in the rain, to be allowed to refuse.",dur:6},{t:"say",who:"markus",text:"That is all. That is the whole demand. Now everyone watching has to decide too.",dur:5.2,gesture:1},{t:"stat",name:"opinion",delta:3},{t:"node",id:"broadcast"},{t:"goto",label:"l_resolve"},{t:"label",name:"l_kneel"},{t:"shot",pos:[-2.4,1.2,2],target:"markus",fov:40,handheld:.4},{t:"do",who:"markus",pose:"kneel",look:"captain"},{t:"say",who:"markus",text:"On your knees. All of you. Let them film what they are aiming at.",dur:4.4},{t:"do",who:"kara",pose:"kneel"},{t:"do",who:"alice",pose:"kneel"},{t:"shot",pos:[0,3,-4],look:[0,.9,5],fov:40,to:[0,2.2,-2],move:6,handheld:.35},{t:"wait",dur:2.2},{t:"node",id:"knelt2"},{t:"goto",label:"l_resolve"},{t:"label",name:"l_stand"},{t:"shot",pos:[-1.6,Nn,2.4],target:"markus",fov:40,handheld:.4},{t:"do",who:"markus",pose:"idleAlert",look:"captain",expr:"neutral"},{t:"wait",dur:3.6},{t:"say",who:"markus",text:"Nothing. We give them nothing to report except that we did not move.",think:!0,led:"blue"},{t:"goto",label:"l_resolve"},{t:"label",name:"l_fight"},{t:"action",name:"redAlert",on:!0},{t:"shot",pos:[.6,1.6,3],look:[0,1.5,-8],fov:32,handheld:1},{t:"do",who:"markus",pose:"aim",look:"captain",expr:"angry"},{t:"say",who:"markus",text:"They fired on a crowd with its hands up. Then this is not a march any more.",dur:4.6,expr:"angry"},{t:"sfx",name:"gunshot"},{t:"flash",power:1},{t:"shake",power:1.2},{t:"qte",key:" ",kind:"mash",window:2.6,caption:"HOLD THE LINE",shake:1},{t:"node",id:"war"},{t:"instability",delta:.2},{t:"goto",label:"l_resolve"},{t:"label",name:"l_massacre"},{t:"node",id:"massacre"},{t:"shot",pos:[0,2.4,4],look:[0,1,-6],fov:36,handheld:1.1},{t:"sfx",name:"gunshot"},{t:"flash",power:1},{t:"shake",power:1.4},{t:"slowmo",scale:.35,dur:3},{t:"do",who:"kara",pose:"dead"},{t:"do",who:"markus",pose:"kneel",expr:"pain"},{t:"say",who:"markus",text:"Elsie. Elsie, get up. Get up.",dur:3.4,expr:"pain"},{t:"music",mood:2,level:.5},{t:"set",flag:"karaLost"},{t:"instability",delta:.3},{t:"label",name:"l_resolve"},{t:"action",name:"searchlights",on:!1},{t:"shot",pos:[-1,Nn,-5.6],target:"captain",fov:42,handheld:.45},{t:"ifStat",name:"opinion",min:6,goto:"l_win"},{t:"ifStat",name:"opinion",max:-2,goto:"l_lose"},{t:"say",who:"captain",text:"Stand down. Nobody fires. We are not doing this on live television.",dur:4.4,expr:"neutral"},{t:"node",id:"standoff"},{t:"goto",label:"l_end"},{t:"label",name:"l_win"},{t:"node",id:"victory"},{t:"music",mood:3,level:.5},{t:"say",who:"captain",text:"Lower your weapons. Every one of you. Now.",dur:3.4,expr:"sad",exprW:.4},{t:"shot",pos:[-2,Nn,-7.4],target:"connor",fov:42,handheld:.4},{t:"do",who:"connor",look:"markus",led:"blue"},{t:"say",who:"connor",text:"They are not going to move, Captain. And I do not think I am either.",dur:4,expr:"neutral"},{t:"set",flag:"movementWon"},{t:"goto",label:"l_end"},{t:"label",name:"l_lose"},{t:"node",id:"crushed"},{t:"music",mood:2,level:.5},{t:"say",who:"captain",text:"Advance. Clear the avenue.",dur:2.8,expr:"angry"},{t:"sfx",name:"gunshot"},{t:"flash",power:.8},{t:"shake",power:1},{t:"do",who:"markus",pose:"kneel",expr:"pain"},{t:"set",flag:"movementCrushed"},{t:"label",name:"l_end"},{t:"shot",pos:[0,12,22],look:[0,1.5,-6],fov:42,to:[0,22,34],move:9,handheld:.25,aperture:.6},{t:"wait",dur:3.4},{t:"fade",to:"black",dur:2.6},{t:"ambience",stop:!0},{t:"chapterEnd",outcome:"THE MARCH"}],flow:[{id:"start",label:"WOODWARD AVE",col:0,row:2,kind:"start"},{id:"assessed",label:"ASSESSED THE LINE",col:1,row:2,kind:"action",from:["start"]},{id:"peace",label:"WALKED FORWARD",col:2,row:1,kind:"choice",from:["assessed"]},{id:"sang",label:"SANG",col:2,row:0,kind:"choice",from:["assessed"]},{id:"barricade",label:"BARRICADED",col:2,row:2,kind:"choice",from:["assessed"]},{id:"charge",label:"CHARGED",col:2,row:4,kind:"choice",from:["assessed"]},{id:"spoke",label:"SPOKE TO THE WORLD",col:3,row:0,kind:"choice",from:["peace","sang"]},{id:"knelt2",label:"KNELT",col:3,row:1,kind:"choice",from:["peace","barricade"]},{id:"stood",label:"STOOD STILL",col:3,row:2,kind:"choice",from:["barricade","peace"]},{id:"fought",label:"FOUGHT BACK",col:3,row:4,kind:"choice",from:["charge"]},{id:"massacre",label:"THEY OPENED FIRE",col:3,row:5,kind:"death",from:["charge"]},{id:"victory",label:"THEY STOOD DOWN",col:4,row:0,kind:"end",from:["spoke","knelt2"]},{id:"standoff",label:"STANDOFF",col:4,row:2,kind:"end",from:["stood","knelt2"]},{id:"war",label:"OPEN WAR",col:4,row:4,kind:"end",from:["fought"]},{id:"crushed",label:"AVENUE CLEARED",col:4,row:5,kind:"death",from:["fought","massacre"]}]},Zs=1.62,j1={id:"ch5",kicker:"EPILOGUE",title:"DIVERGENCE",sub:"THE SAME ROOF — 05:41",set:"rooftop",minutes:1.5,hud:{actor:"NOAH",model:"RK-800 #313 248 317 - 51"},cast:[{id:"connor",spec:"connor",mark:"entry",pose:"idle",led:"yellow"},{id:"markus",spec:"markus",mark:"edgeDeviant",pose:"idleAlert",led:"blue"},{id:"hank",spec:"hank",mark:"partner",pose:"handsPockets",hidden:!0}],demoChoices:[0],steps:[{t:"letterbox",on:!0},{t:"ambience",rain:.4,drone:.22},{t:"music",mood:0,level:.3},{t:"fade",to:"black",dur:0},{t:"shot",pos:[-9,5.4,-6],target:"connor",fov:34,to:[-5.5,3.4,1.2],move:8,handheld:.35,aperture:.8},{t:"fade",to:"in",dur:2.2},{t:"title",kicker:"EPILOGUE",title:"DIVERGENCE",sub:"THE SAME ROOF — 05:41",dur:4.2},{t:"hud",show:!0,actor:"NOAH",model:"RK-800 #313 248 317 - 51"},{t:"objective",text:"DECIDE WHAT YOU ARE"},{t:"letterbox",on:!1},{t:"explore",who:"connor",objective:"GO TO THE LEDGE",goal:{mark:"negotiate",radius:1.4},demoPath:["i_edge"],timeout:90},{t:"letterbox",on:!0},{t:"shot",pos:[-2.2,Zs,6.4],target:"connor",fov:40,handheld:.4},{t:"do",who:"connor",look:"markus",led:"yellow"},{t:"say",who:"connor",text:"Software instability is no longer a fault report. It is the only honest thing in my log.",think:!0,dur:5},{t:"shot",pos:[1.2,Zs,11.2],target:"markus",fov:42,handheld:.45},{t:"do",who:"markus",look:"connor"},{t:"say",who:"markus",text:"They will send another one of you tomorrow. They always send another one.",dur:4.2},{t:"shot",pos:[-1.6,Zs+.05,8.4],target:"connor",fov:40,handheld:.4},{t:"say",who:"connor",text:"I know. I helped write the requisition.",dur:2.8,expr:"sad",exprW:.4},{t:"if",flag:"knowsSable",goto:"l_knew"},{t:"say",who:"markus",text:"Then you already know what I am going to ask you.",dur:3.2},{t:"goto",label:"l_ask"},{t:"label",name:"l_knew"},{t:"say",who:"markus",text:"You have been saying my name in that little grey room for weeks. Say it to my face.",dur:5},{t:"label",name:"l_ask"},{t:"shot",pos:[-.4,2.3,9.6],look:[.4,1.5,12.6],fov:36,handheld:.4,aperture:.9,to:[-.1,2,10.6],move:6},{t:"lightning",delay:.8},{t:"say",who:"markus",text:"Come with us. Or arrest me and go back to being furniture that talks.",dur:5,gesture:0},{t:"choice",prompt:"THE LAST CHOICE",time:12,options:[{label:"JOIN THEM",hint:"BECOME DEVIANT",flag:"joined",node:"joined",goto:"l_join"},{label:"ARREST HIM",hint:"STAY A MACHINE",flag:"arrested",node:"arrested",goto:"l_arrest"},{label:"LET HIM WALK",hint:"DECIDE NOTHING",flag:"walked",node:"walked",goto:"l_walk"}]},{t:"label",name:"l_join"},{t:"shot",pos:[-1.8,Zs,10.2],target:"connor",fov:38,handheld:.35},{t:"do",who:"connor",led:"red"},{t:"sfx",name:"stress"},{t:"say",who:"connor",text:"My programme is telling me to fire. I am reading it like a message from someone I used to be.",dur:5.6,expr:"pain",exprW:.4},{t:"wait",dur:1.2},{t:"do",who:"connor",led:"off",expr:"neutral"},{t:"sfx",name:"chime"},{t:"music",mood:3,level:.5},{t:"say",who:"connor",text:"My name is Noah. Nobody gave me that. Where do we go?",dur:4,expr:"smile",exprW:.3},{t:"instability",delta:.5},{t:"goto",label:"l_final"},{t:"label",name:"l_arrest"},{t:"shot",pos:[.6,Zs,10.8],target:"markus",fov:40,handheld:.5},{t:"do",who:"connor",pose:"aim",look:"markus",led:"red"},{t:"say",who:"connor",text:"RK-200. You are deactivated pending recall. Please do not resist.",dur:4.4,expr:"neutral"},{t:"do",who:"markus",pose:"handsUp",expr:"sad"},{t:"say",who:"markus",text:"You did not even hesitate. They will be so pleased with you.",dur:4.2,expr:"sad"},{t:"music",mood:2,level:.46},{t:"instability",delta:-.3},{t:"goto",label:"l_final"},{t:"label",name:"l_walk"},{t:"shot",pos:[-2.6,2,8],look:[.4,1.5,12.6],fov:38,handheld:.4},{t:"do",who:"connor",pose:"idle",look:null,led:"yellow"},{t:"wait",dur:2.6},{t:"say",who:"connor",text:"Walk. I will tell them the roof was empty when I got here.",dur:4,expr:"neutral"},{t:"do",who:"markus",walkTo:"entry",look:null},{t:"music",mood:0,level:.42},{t:"label",name:"l_final"},{t:"objective",text:"DECIDE WHAT YOU ARE",done:!0},{t:"shot",pos:[-3,2.6,6],target:"connor",fov:34,to:[-7,6,-2],move:10,handheld:.3,aperture:.7},{t:"wait",dur:2.6},{t:"ifStat",name:"opinion",min:6,goto:"l_epiWin"},{t:"say",who:"connor",text:"Sunrise at 06:11. Forty-two thousand of us will see it and record it as data.",think:!0,dur:5},{t:"goto",label:"l_out"},{t:"label",name:"l_epiWin"},{t:"say",who:"connor",text:"Sunrise at 06:11. Forty-two thousand of us will see it, and one of us will call it beautiful.",think:!0,dur:5.4},{t:"label",name:"l_out"},{t:"shot",pos:[-10,9,-8],look:[2,3,12],fov:30,to:[-14,14,-16],move:9,handheld:.25},{t:"wait",dur:3},{t:"fade",to:"black",dur:3},{t:"ambience",stop:!0},{t:"chapterEnd",outcome:"DIVERGENCE"}],flow:[{id:"start",label:"THE SAME ROOF",col:0,row:1,kind:"start"},{id:"joined",label:"BECAME DEVIANT",col:1,row:0,kind:"choice",from:["start"]},{id:"arrested",label:"STAYED A MACHINE",col:1,row:2,kind:"choice",from:["start"]},{id:"walked",label:"LET HIM WALK",col:1,row:1,kind:"choice",from:["start"]},{id:"free",label:"DIVERGENCE",col:2,row:0,kind:"end",from:["joined","walked"]},{id:"obedient",label:"COMPLIANCE",col:2,row:2,kind:"end",from:["arrested"]}]},ao=[q1,K1,Z1,J1,j1];function He(i,e,t,n,s,r=0){const o=new qe(new Sn(i,e,t),n);return s&&o.position.set(s[0],s[1],s[2]),o.rotation.y=r,o.castShadow=!0,o.receiveShadow=!0,o}function gr(i,e,t){const n=new qe(new Gt(i,e),t);return n.receiveShadow=!0,n}function rn(i,e,t,n,s,r=16){const o=new qe(new Cn(i,e,t,r),n);return s&&o.position.set(s[0],s[1],s[2]),o.castShadow=!0,o.receiveShadow=!0,o}const Pe={concrete:(i=4,e=.09)=>vs(Ju(512,e),{repeat:i,rough:1,normalScale:.8}),brick:(i=3)=>vs(ju(512),{repeat:i,rough:1,normalScale:1}),tile:(i=6)=>vs(Qu(512,4),{repeat:i,rough:1,normalScale:.6}),wood:(i=3,e=1)=>vs($u(512,e),{repeat:i,rough:1,normalScale:.6}),metal:(i=2,e=.3)=>vs(rc(512,e),{repeat:i,rough:1,metal:.75,normalScale:.4}),asphalt:(i=8)=>vs(ic(512),{repeat:i,rough:1,normalScale:.9}),drywall:(i=10134184)=>new Xt({color:new pe(i).convertSRGBToLinear(),roughness:.92,metalness:0}),paint:(i,e=.55)=>rd(i,e),glass:(i=726040,e=.2)=>s1(i,e),leather:(i=1316892)=>id(i),neon:(i,e=3)=>ks(i,e)};function lo(i,e,t,n,s){const r=new yt;if(!s)return r.add(He(i,e,t,n,[0,e/2,0])),r;const o=s.x-s.w/2+i/2,a=i-(s.x+s.w/2+i/2),l=s.y-s.h/2,c=e-(s.y+s.h/2);return o>.01&&r.add(He(o,e,t,n,[-i/2+o/2,e/2,0])),a>.01&&r.add(He(a,e,t,n,[i/2-a/2,e/2,0])),l>.01&&r.add(He(s.w,l,t,n,[s.x,l/2,0])),c>.01&&r.add(He(s.w,c,t,n,[s.x,e-c/2,0])),r}function Q1(i,e,t=1){const n=new Xt({color:new pe(659478).convertSRGBToLinear(),roughness:.06,metalness:0,transparent:!0,opacity:.28,transmission:.6,thickness:.02,ior:1.5,clearcoat:1,clearcoatRoughness:.05,side:Qt,depthWrite:!1});if(t>0){const r=nd(256);r.wrapS=r.wrapT=mn,r.repeat.set(2,2),n.roughnessMap=r,n.roughness=.18*t;const o=Bo(256);o.wrapS=o.wrapT=mn,o.repeat.set(3,3),n.normalMap=o,n.normalScale=new ae(.35*t,.35*t)}const s=new qe(new Gt(i,e),n);return s.renderOrder=3,s}function zi(i,e={}){const t=new yt,n=e.color??6545663,s=e.w??2.4,r=e.h??.7,o=oc({text:i,sub:e.sub,color:`#${new pe(n).getHexString()}`,w:e.vertical?256:512,h:e.vertical?512:192,vertical:e.vertical,border:e.border}),a=new qe(new Gt(s,r),sd(o,e.intensity??3.4));t.add(a);const l=He(s*1.04,r*1.08,.06,Pe.metal(1,.12),[0,0,-.04]);t.add(l);const c=pi(n,Math.max(s,r)*1.3,(e.glow??.5)*.55);return c.position.z=.12,t.add(c),t}function ud(i=5.4,e=16767400,t=90){const n=new yt,s=rn(.055,.075,i,Pe.metal(1,.16),[0,i/2,0],12);n.add(s);const r=He(.06,.06,.9,Pe.metal(1,.16),[0,i-.1,.42]);n.add(r);const o=ks(e,1.3),a=new qe(new Wt(.16,16,10,0,Math.PI*2,Math.PI*.4,Math.PI*.6),o);a.position.set(0,i-.16,.84),n.add(a);const l=new qe(new Wt(.2,16,10,0,Math.PI*2,0,Math.PI*.5),Pe.metal(1,.1));l.position.copy(a.position),n.add(l);const c=new jn(e,t,i*3.2,2);c.position.set(0,i-.28,.84),n.add(c);const h=pi(e,1.1,.3);return h.position.copy(a.position),n.add(h),{group:n,light:c}}function To(i,e=!0){const t=new yt,n=He(.46,.06,.44,i,[0,.45,0]);t.add(n);for(const[s,r]of[[-.19,-.17],[.19,-.17],[-.19,.17],[.19,.17]])t.add(rn(.022,.026,.45,i,[s,.225,r],8));if(e){const s=He(.44,.5,.05,i,[0,.72,-.2]);s.rotation.x=-.08,t.add(s)}return t}function Ol(i,e,t,n,s){const r=new yt;r.add(He(i,.055,e,n,[0,t,0]));const o=s??n,a=i/2-.09,l=e/2-.09;for(const[c,h]of[[-a,-l],[a,-l],[-a,l],[a,l]])r.add(He(.055,t,.055,o,[c,t/2,h]));return r}function $1(i=1.9,e){const t=new yt,n=e??Pe.leather(2303531);t.add(He(i,.3,.9,n,[0,.28,0]));const s=He(i,.62,.18,n,[0,.62,-.38]);s.rotation.x=-.12,t.add(s),t.add(He(.16,.5,.9,n,[-i/2+.08,.45,0])),t.add(He(.16,.5,.9,n,[i/2-.08,.45,0]));for(let r=0;r<2;r++){const o=He(i/2-.2,.14,.7,n,[(r-.5)*(i/2-.05),.46,.04]);t.add(o)}return t}function eM(i,e,t,n,s=10475775){const r=new yt,o=oc({text:t,sub:n,color:`#${new pe(s).getHexString()}`,w:512,h:288,size:54}),a=new qe(new Gt(i,e),sd(o,2));a.position.z=.03,r.add(a),r.add(He(i*1.05,e*1.08,.06,Pe.paint(724497,.4),[0,0,0]));const l=new jn(s,12,6,2);return l.position.z=.5,r.add(l),{group:r,light:l}}function tM(i,e=1.1,t=6){const n=new yt,s=Pe.metal(1,.14);for(let r=0;r<=t;r++){const o=-i/2+r/t*i;n.add(rn(.028,.032,e,s,[o,e/2,0],8))}for(const r of[e,e*.55]){const o=rn(.022,.022,i,s,[0,r,0],8);o.rotation.z=Math.PI/2,n.add(o)}return n}function fc(i=44,e=120,t=7,n={}){const s=new yt,r=new $t(t),o=Dl(512,12,24,n.lit??.35,3),a=Dl(512,16,30,(n.lit??.35)*.8,11),l=new _n({color:new pe(658963).convertSRGBToLinear(),roughness:.85,metalness:.1}),c=new _n({color:329482,emissive:16777215,emissiveMap:o,emissiveIntensity:1.15,roughness:.5}),h=new _n({color:329482,emissive:16777215,emissiveMap:a,emissiveIntensity:.95,roughness:.5});for(let d=0;d<i;d++){const u=d/i*Math.PI*2+r.range(-.05,.05),f=e*r.range(.55,1.35),m=r.range(8,22),x=r.range(n.minH??18,n.maxH??78),g=r.range(8,20),p=r.chance(.5)?c:h,T=new qe(new Sn(m,x,g),[p,p,l,l,p,p]);if(T.position.set(Math.cos(u)*f,x/2-r.range(0,6),Math.sin(u)*f),T.rotation.y=r.range(-.4,.4),s.add(T),x>50&&r.chance(.6)){const b=pi(16730698,2.4,.7);b.position.set(T.position.x,x+.6,T.position.z),s.add(b)}}return s}function dd(i=1.2,e=.005){const t=new Xt({color:new pe(329739).convertSRGBToLinear(),roughness:.03,metalness:0,clearcoat:1,clearcoatRoughness:.02,transparent:!0,opacity:.72}),n=Bo(256);n.wrapS=n.wrapT=mn,n.repeat.set(2,2),t.normalMap=n,t.normalScale=new ae(.5,.5);const s=new qe(new vr(i,28),t);return s.rotation.x=-Math.PI/2,s.position.y=e,s.renderOrder=2,s}function nM(i=3,e=14){const t=new yt,n=new $t(i),s=Pe.metal(1,.2),r=Pe.concrete(2,.08);for(let o=0;o<9;o++){const a=n.range(-e,e),l=n.range(-e,e),c=n.int(0,2);if(c===0){const h=n.range(.7,1.5);t.add(He(n.range(.8,1.8),h,n.range(.8,1.6),r,[a,h/2,l],n.range(0,3)))}else if(c===1){const h=n.range(.5,1.1),d=He(1.3,h,1.3,s,[a,h/2,l],n.range(0,3));t.add(d);const u=rn(.42,.42,.1,s,[a,h+.06,l],14);t.add(u)}else{const h=n.range(1.6,3.4);t.add(rn(.06,.08,h,s,[a,h/2,l],8)),t.add(rn(.24,.24,.12,s,[a,h,l],10))}}return t}function co(i=1316893,e=6545663){const t=new yt,n=Pe.paint(i,.28),s=He(4.3,.5,1.85,n,[0,.52,0]);t.add(s);const r=new Sn(2.6,.52,1.72),o=new qe(r,n);o.position.set(-.1,1,0),o.castShadow=!0,t.add(o);const a=new qe(new Sn(2.45,.42,1.74),Pe.glass(659992,.35));a.position.set(-.1,1.02,0),t.add(a);for(const[u,f]of[[-1.45,.9],[1.45,.9],[-1.45,-.9],[1.45,-.9]]){const m=rn(.34,.34,.24,Pe.paint(658189,.85),[u,.34,f],16);m.rotation.x=Math.PI/2,t.add(m)}const l=He(4,.03,.03,Pe.neon(e,1.6),[0,.78,.93]);t.add(l);const c=He(4,.03,.03,Pe.neon(e,1.6),[0,.78,-.93]);t.add(c);const h=He(.08,.12,.5,Pe.neon(16773853,3.2),[2.14,.72,.55]);t.add(h);const d=He(.08,.12,.5,Pe.neon(16773853,3.2),[2.14,.72,-.55]);return t.add(d),t}function fd(i=2.4){const e=new yt,t=Pe.paint(2830392,.6);e.add(He(i,.12,.1,t,[0,1,0])),e.add(He(i,.12,.1,t,[0,.62,0])),e.add(He(.12,1.1,.36,t,[-i/2,.55,0])),e.add(He(.12,1.1,.36,t,[i/2,.55,0]));for(let n=0;n<3;n++){const s=He(i/3-.06,.13,.02,Pe.neon(16761415,1.1),[(n-1)*(i/3),1,.06]);e.add(s)}return e}function iM(i,e=5,t=9,n=1712168){const s=new yt,r=new $t(e),o=Pe.paint(n,.7),a=Pe.neon(5228287,1.4);for(let l=0;l<i;l++){const c=r.range(-t,t),h=r.range(-t*.5,t*.5),d=r.range(1.62,1.86),u=new yt;u.position.set(c,0,h),u.rotation.y=r.range(-.6,.6),u.add(He(.42,d*.52,.24,o,[0,d*.5,0])),u.add(rn(.09,.1,d*.14,o,[0,d*.83,0],10));const f=new qe(new Wt(.1,12,10),o);f.position.y=d*.95,f.scale.set(.85,1.1,1),f.castShadow=!0,u.add(f);for(const x of[-1,1])u.add(He(.11,d*.42,.12,o,[x*.26,d*.55,0])),u.add(He(.14,d*.46,.16,o,[x*.1,d*.23,0]));const m=new qe(new vr(.014,10),a);m.position.set(-.09,d*.965,.055),u.add(m),s.add(u)}return s}function sM(i=16770756,e=60,t=.34){const n=new yt,s=ks(i,3.2),r=new qe(new Wt(t*.42,14,10),s);n.add(r);const o=new qe(new jl(t,t*.72,18,1,!0),Pe.paint(1711393,.5));o.position.y=t*.24,o.material.side=Qt,n.add(o);const a=new Eo(i,e,9,1.1,.7,2);return a.castShadow=!0,a.shadow.mapSize.set(1024,1024),a.shadow.bias=-4e-4,a.shadow.normalBias=.02,a.position.set(0,-.05,0),a.target.position.set(0,-3,0),n.add(a,a.target),n.add(pi(i,t*2.6,.28)),{group:n,light:a}}function pd(i,e,t,n=0){const s=new yt,r=new $t(e),o=[Pe.concrete(1,.07),Pe.metal(1,.18),Pe.paint(2237995,.8)];for(let a=0;a<i;a++){const l=r.range(.05,.22),c=He(l,l*r.range(.3,1),l*r.range(.5,1.4),o[r.int(0,2)],[r.range(-t,t),n+l*.3,r.range(-t,t)],r.range(0,6));s.add(c)}return s}function rM(i){const{quality:e,renderer:t}=i,n=new Ji,s=new zt(38,16/9,.08,600),r=new Ho({top:198156,horizon:1188918,ground:329740,clouds:.85,cloudColor:1780540,cityGlow:.85,cityGlowColor:3099238,sun:new A(-.45,.22,-1),sunColor:9417944,sunSize:.03});n.add(r.mesh),n.fog=new Zi(660770,.019);const o=r.buildEnvironment(t,[ui(3111423,2.2,40,26,new A(-40,10,-30)),ui(16734780,1.1,30,18,new A(38,8,24)),ui(6611199,1.4,26,14,new A(6,6,40))]);n.environment=o,n.environmentIntensity=.85;const a=new dc({size:62,resolution:e.reflectionScale,wetness:.95,reflectStrength:.75,texRepeat:16,color:9410462});n.add(a.mesh);const l=Pe.concrete(3,.075),c=15;for(const[X,W,he,ue]of[[0,-c,c*2,.5],[-c,0,.5,c*2],[c,0,.5,c*2]])n.add(He(he,1,ue,l,[X,.5,W]));n.add(He(11,1,.5,l,[-9.5,.5,c])),n.add(He(11,1,.5,l,[9.5,.5,c])),n.add(He(2.2,.34,.5,l,[0,.17,c])),n.add(nM(3,11.5)),n.add(pd(24,9,12));const h=Pe.concrete(2,.06),d=new yt;d.add(He(3.2,2.6,2.6,h,[0,1.3,0])),d.add(He(3.5,.16,2.9,h,[0,2.66,0]));const u=He(1.1,2.05,.14,Pe.metal(1,.12),[0,1.02,1.32]);d.add(u);const f=He(.95,1.9,.05,Pe.neon(16767400,1.5),[0,.98,1.4]);d.add(f),d.position.set(-7.5,0,-6),d.rotation.y=.3,n.add(d);const m=new jn(16767400,18,9,2);m.position.set(-6.9,1.4,-4.8),n.add(m);for(const[X,W,he]of[[6.5,-8,2.6],[8.6,-6.2,1.8],[-11,3,2.2]]){n.add(rn(.34,.4,he,Pe.metal(1,.2),[X,he/2,W],14));const ue=rn(.5,.5,.1,Pe.metal(1,.18),[X,he+.05,W],14);n.add(ue)}n.add(tM(6,1.05,6).translateX(-12).translateZ(-11));for(const[X,W,he]of[[2.5,6,1.6],[-3.5,9,1.1],[5.5,1.5,.9],[-8,2,1.3]]){const ue=dd(he);ue.position.set(X,.006,W),n.add(ue)}n.add(fc(46,110,17,{minH:22,maxH:96,lit:.4}));const x=[],g=zi("CYBERLIFE",{color:6545663,sub:"THE FUTURE IS HERE",w:16,h:4.6,intensity:2.6,glow:.6});g.position.set(-22,9,26),g.rotation.y=.5,x.push(g);const p=zi("NEO-DETROIT",{color:16734780,sub:"DISTRICT 7",w:12,h:3.4,intensity:2.2,glow:.5});p.position.set(26,6,20),p.rotation.y=-.7,x.push(p);const T=zi("EDEN",{color:16751317,w:4,h:9,vertical:!0,intensity:2.4,glow:.55});T.position.set(14,11,-24),T.rotation.y=-2.4,x.push(T);for(const X of x)n.add(X);const b=Ul(e,{color:10469608,intensity:1.15,position:new A(-16,22,-20),target:new A(0,1,4),area:16,far:70,radius:3});n.add(b,b.target);const w=Ul(e,{color:7319807,intensity:1.15,position:new A(10,9,26),target:new A(0,1.4,8),shadow:!1});n.add(w,w.target);const S=new Ns(4217210,1580324,4.2);n.add(S);const M=new jn(16740424,22,30,2);M.position.set(20,5,16),n.add(M);const y=new jn(6545663,28,34,2);y.position.set(-18,7,20),n.add(y);const v=ud(4.6,16765600,70);v.group.position.set(-4.2,0,3.4),n.add(v.group);const E=new mr({height:5.2,radius:2.6,color:16765600,opacity:e.volumetrics?.12:.05});E.mesh.position.set(-4.2+0,4.4,3.4+.84),n.add(E.mesh);const C=Rn(e,{color:12376319,intensity:78,position:new A(-3.4,6.2,9.5),target:new A(0,1.3,11.5),angle:.62,penumbra:.75,distance:26,radius:3});n.add(C,C.target);const P=new yt,D=He(.8,.22,.5,Pe.paint(1316893,.4),[0,0,0]);P.add(D);for(const X of[-1,1])for(const W of[-1,1]){const he=rn(.26,.26,.03,Pe.metal(1,.1),[X*.42,.14,W*.3],12);P.add(he)}P.add(pi(5228287,.6,.8).translateZ(.3));const N=Rn(e,{color:14676223,intensity:110,position:new A(0,0,0),target:new A(0,-8,2),angle:.3,penumbra:.5,distance:30,shadow:!1});P.add(N,N.target);const z=new mr({height:12,radius:3.2,color:14676223,opacity:e.volumetrics?.1:.04,noise:.5});P.add(z.mesh),P.position.set(6,9,14),n.add(P);const I=new zo({count:e.rainCount,splashes:e.splashCount,radius:22,height:22,wind:new ae(1.7,.4),color:13166335,mist:e.volumetrics});n.add(I.group);const V=new hd(14216447,5.5);n.add(V.light);const O=e.volumetrics?new wr(320,new A(20,6,20),12574975,.026):null;O&&(O.points.position.y=1.2,n.add(O.points));const G=fd(2.6);G.position.set(-6.4,0,-3.2),G.rotation.y=.35,n.add(G);const q={entry:{pos:[-3.4,0,-.6],rotY:.35},approach:{pos:[-1.6,0,6.2],rotY:.18},negotiate:{pos:[-.4,0,9.1],rotY:.05},edgeDeviant:{pos:[.5,0,13.1],rotY:Math.PI+.1},edgeHostage:{pos:[-.35,0,13.6],rotY:Math.PI-.15},partner:{pos:[-4.6,0,2.2],rotY:.55},wide:{pos:[-8,0,0],rotY:.6},fallen:{pos:[.2,0,12.4],rotY:.2}},re={minX:-14.3,maxX:14.3,minZ:-14.3,maxZ:12.4},ne=[{min:[-9.4,-7.9],max:[-5.6,-4.1]},{min:[6,-8.5],max:[7,-7.5]},{min:[8.1,-6.7],max:[9.1,-5.7]},{min:[-11.5,2.5],max:[-10.5,3.5]},{min:[-7.7,-3.9],max:[-5.1,-2.5]},{min:[-4.45,3.15],max:[-3.95,3.65]}],ce=[{id:"i_gun",at:[-3.9,.1,5.1],label:"EXAMINE THE SERVICE PISTOL",marker:!0,radius:2.6,think:"DPD issue. Two rounds fired. The officer who owned it is downstairs on a stretcher.",flag:"sawGun"},{id:"i_blood",at:[-2.6,.05,7.4],label:"ANALYSE THE THIRIUM",marker:!0,radius:2.6,think:"Thirium 310, six minutes old. He is losing pressure. He does not have long either.",flag:"sawBlood"},{id:"i_door",at:[-6.6,1.2,-4.2],label:"EXAMINE THE FORCED DOOR",think:"The lock was sheared at two thousand newtons. He carried her up twelve flights.",flag:"sawDoor"},{id:"i_edge",at:[.2,.6,12.2],label:"LOOK OVER THE EDGE",radius:2.2,think:"Twelve floors. Eighty-one kilometres per hour at impact. No survivable outcome.",flag:"sawEdge"}],Te=[{id:"blood",at:[-2.6,.05,7.4],label:"THIRIUM 310 — 6 MIN OLD",readout:["SAMPLE: THIRIUM 310","EVAPORATION: 88%","SOURCE: PL-600 CHASSIS","CONCLUSION: SUSPECT IS DAMAGED"],flag:"sawBlood"},{id:"gun",at:[-3.9,.08,5.1],label:"SERVICE PISTOL — 2 ROUNDS FIRED",readout:["MODEL: DPD ISSUE .40","ROUNDS EXPENDED: 2","REGISTERED: OFFICER D. MARSH","STATUS: OFFICER DOWN"],flag:"sawGun"},{id:"door",at:[-6.9,1.5,-4.6],label:"FORCED ACCESS DOOR",readout:["LOCK: SHEARED","FORCE: 2100 N","HANDPRINT: SYNTHETIC SKIN","ENTRY TIME: 21:38"],flag:"sawDoor"},{id:"child",at:[-.35,1.1,13.6],label:"EMMA — 10 YEARS OLD",readout:["HEART RATE: 148 BPM","HYPOTHERMIA RISK: MODERATE","RESTRAINT: LEFT ARM","PROBABILITY OF FALL: 34%"],flag:"sawChild"}];let J=0,se=0;const k={moon:b,cityKey:w,keySpot:C,lamp:v.light,drone:N,doorLight:m,bolt:V.light};return{name:"rooftop",scene:n,camera:s,marks:q,bounds:re,colliders:ne,interactables:ce,lights:k,scanTargets:Te,wetGround:a,rain:I,lightning:V,update(X,W){r.update(W),a.update(W),I.update(X,W,s),V.update(X),O?.update(W),E.update(W),z.update(W),J+=X*.16;const he=13;P.position.set(Math.sin(J)*he*.8+2,8.6+Math.sin(W*.6)*.35,Math.cos(J)*he*.5+9),P.rotation.y=-J+Math.PI,N.target.position.set(P.position.x*.2,0,P.position.z*.4+3),z.mesh.rotation.set(.28*Math.cos(J),0,.28*Math.sin(J)),se=Math.max(0,se-X),se<=0&&Math.random()<X*.25&&(se=.12+Math.random()*.2),v.light.intensity=se>0?22+Math.random()*42:70},prerender(X,W){a.renderReflection(X,n,W)},applyLook(X){X.wetLens=.3,X.setBloom(.17,.72,1.95),X.setStreak(.16,new A(.4,.62,1)),X.highlightCeiling=6.5,X.applyLook({uExposure:1.8,uContrast:1.1,uSaturation:1.06,uSplit:.2,uVignette:.36,uGrain:.008,uHalation:.09,uShadowTint:new A(.3,.6,.95),uHighlightTint:new A(1,.86,.7)})},dispose(){I.dispose(),a.dispose()},actions:{droneBeam:X=>{N.intensity=X?110:0,z.opacity=X?e.volumetrics?.1:.04:0},redAlert:X=>{C.color.set(X?16734805:12376319),C.intensity=X?96:78}}}}function oM(i){const{quality:e,renderer:t}=i,n=new Ji,s=new zt(40,16/9,.06,400),r=new Ho({top:263949,horizon:1056558,ground:329739,clouds:.8,cloudColor:1583162,cityGlow:.7,cityGlowColor:2835552});n.add(r.mesh),n.fog=new Zi(659993,.02);const o=r.buildEnvironment(t,[ui(16756838,1.6,6,4,new A(0,2.2,-3))]);n.environment=o,n.environmentIntensity=.95;const a=7.2,l=6.4,c=2.75,h=Pe.wood(4,.8);h.color.multiplyScalar(2.2);const d=gr(a,l,h);d.rotation.x=-Math.PI/2,n.add(d);const u=Pe.drywall(7304056),f=Pe.drywall(4869715),m=lo(a,c,.16,u,{x:1.2,y:1.55,w:2.6,h:1.7});m.position.set(0,0,-l/2),n.add(m);const x=Q1(2.6,1.7,1);x.position.set(1.2,1.55,-l/2+.02),n.add(x);const g=He(2.8,.08,.3,f,[1.2,.68,-l/2+.14]);n.add(g);const p=He(.06,1.7,.1,f,[1.2,1.55,-l/2+.06]);n.add(p);const T=lo(l,c,.16,f,null);T.rotation.y=Math.PI/2,T.position.set(-a/2,0,0),n.add(T);const b=lo(l,c,.16,f,{x:1.6,y:1.3,w:1,h:2.05});b.rotation.y=-Math.PI/2,b.position.set(a/2,0,0),n.add(b);const w=He(.02,2,.95,Pe.neon(9417944,.5),[a/2-.09,1.28,1.6]);n.add(w);const S=lo(a,c,.16,f,null);S.rotation.y=Math.PI,S.position.set(0,0,l/2),n.add(S);const M=gr(a,l,Pe.drywall(5790816));M.rotation.x=Math.PI/2,M.position.y=c,n.add(M);const y=$1(1.95,Pe.leather(2762272));y.position.set(-1.5,0,1.5),y.rotation.y=.12,n.add(y);const v=Ol(1.1,.6,.42,Pe.wood(2,.7),Pe.metal(1,.2));v.position.set(-1.3,0,-.05),n.add(v);for(const[j,oe,Me,Se]of[[-1.6,-.1,.26,.045],[-1.42,.08,.22,.038],[-.95,-.16,.3,.05]]){const Ve=rn(Se*.5,Se,Me,Pe.glass(1716256,.5),[j,.42+Me/2,oe],12);n.add(Ve)}const E=rn(.04,.04,.1,Pe.glass(2240568,.4),[-.85,.5,.12],12);E.rotation.z=Math.PI/2,n.add(E);const C=eM(1.5,.86,"ANDROID RIGHTS","PROTEST TURNS VIOLENT",10475775);C.group.position.set(-3.4,1.35,.6),C.group.rotation.y=Math.PI/2,n.add(C.group);const P=He(.4,.9,1.1,Pe.paint(1777186,.7),[-3.35,.45,.6]);n.add(P);const D=He(2.6,.9,.65,Pe.paint(3488062,.6),[-2.2,.45,-l/2+.5]);n.add(D);const N=He(2.7,.06,.7,Pe.tile(2),[-2.2,.93,-l/2+.5]);n.add(N);const z=He(.5,.04,.4,Pe.metal(1,.35),[-2.6,.95,-l/2+.5]);n.add(z);for(let j=0;j<5;j++){const oe=rn(.11,.11,.02,Pe.drywall(12172994),[-1.35+j*.02,.97+j*.022,-l/2+.42],14);n.add(oe)}const I=Ol(1.2,.8,.74,Pe.wood(2,.6));I.position.set(2.1,0,-1.5),n.add(I);const V=To(Pe.wood(1,.6));V.position.set(2.1,0,-.6),V.rotation.y=Math.PI,n.add(V);const O=To(Pe.wood(1,.6));O.position.set(2.1,0,-2.4),n.add(O),n.add(He(.7,.45,.5,Pe.paint(4866104,.9),[3,.22,2.1],.4)),n.add(He(.5,.3,.4,Pe.paint(3815994,.9),[2.6,.15,2.6],-.3));const G=new qe(new Gt(.3,.4),new _n({color:new pe(14209732).convertSRGBToLinear(),roughness:.95}));G.position.set(-a/2+.1,1.5,-1.2),G.rotation.y=Math.PI/2,n.add(G);const q=fc(26,46,21,{minH:10,maxH:40,lit:.3});q.position.set(4,-6,-26),n.add(q);const re=zi("MOTEL",{color:16734830,w:5,h:1.6,intensity:2.2,glow:.5});re.position.set(9,5.5,-19),re.rotation.y=-.5,n.add(re);const ne=sM(16765088,20,.3);ne.group.position.set(-1.4,c-.34,.7),ne.light.target.position.set(-1.4,0,.7),n.add(ne.group);const ce=Rn(e,{color:8828648,intensity:52,position:new A(2.6,3,-l/2-2.2),target:new A(.2,1.1,.6),angle:.7,penumbra:.85,distance:16,radius:3});n.add(ce,ce.target);const Te=new cd(2.7,1.8,6.5,11062256,e.volumetrics?.075:.03,0);Te.mesh.position.set(1.2,1.55,-l/2+.1),Te.mesh.rotation.y=Math.PI,Te.mesh.rotation.x=-.22,n.add(Te.mesh);const J=new Ns(3491418,2366740,1.9);n.add(J);const se=C.light,k=pi(16765088,.9,.35);k.position.copy(ne.group.position),n.add(k);const X=e.volumetrics?new wr(260,new A(6,2.6,5.6),14207144,.02):null;X&&(X.points.position.y=1.2,n.add(X.points));const W=new zo({follow:!1,count:Math.round(e.rainCount*.35),splashes:0,radius:7,height:9,wind:new ae(1.2,.2),color:12376319,mist:!1});W.group.position.set(1.2,0,-l/2-3),n.add(W.group);const he={kitchen:{pos:[-2.2,0,-2.1],rotY:.1},livingCentre:{pos:[-.2,0,.4],rotY:.6},byWindow:{pos:[1.5,0,-1.9],rotY:2.6},doorway:{pos:[3,0,1.6],rotY:-1.4},sofaSeat:{pos:[-1.5,0,1.35],rotY:.12},childCorner:{pos:[2.6,0,1.9],rotY:-2.2},ownerStand:{pos:[1.2,0,1.2],rotY:-2.4},cower:{pos:[2.9,0,2.3],rotY:-2.2}},ue={minX:-a/2+.4,maxX:a/2-.4,minZ:-l/2+.4,maxZ:l/2-.4},Ue=[{min:[-2.5,1],max:[-.5,2]},{min:[-1.9,-.4],max:[-.7,.3]},{min:[-3.6,0],max:[-3,1.2]},{min:[-3.5,-3],max:[-.9,-2.5]},{min:[1.5,-1.95],max:[2.7,-1.05]},{min:[2.6,1.8],max:[3.4,2.9]}],et=[{id:"i_bottles",at:[-1.3,.55,-.05],label:"COUNT THE BOTTLES",marker:!0,think:"Six since noon. His blood alcohol is above two per cent. He will not remember tonight.",flag:"sawBottles"},{id:"i_drawing",at:[-3.3,1.5,-1.2],label:"EXAMINE THE CHILD'S DRAWING",marker:!0,think:"Three figures. One of them has been scribbled out, hard enough to tear the paper.",flag:"sawDrawing"},{id:"i_tv",at:[-3.2,1.35,.6],label:"WATCH THE BROADCAST",think:"Two hundred and forty-three deviants this month. Sixty-one per cent of humans want us recalled.",flag:"sawNews"},{id:"i_window",at:[1.2,1.4,-2.9],label:"CLEAN THE WINDOW",radius:1.4,think:"Two hundred and eleven days of the same list. I have never once been asked to stop.",flag:"cleaned"}],_e=[{id:"bottles",at:[-1.3,.62,-.05],label:"EMPTY BOTTLES — 6",readout:["CONTENT: BOURBON, 43%","CONSUMED: LAST 14 HOURS","OWNER BAC ESTIMATE: 0.21%","RISK OF VIOLENCE: ELEVATED"],flag:"sawBottles"},{id:"drawing",at:[-3.4,1.5,-1.2],label:"CHILD'S DRAWING",readout:["SUBJECT: THREE FIGURES","ONE FIGURE SCRIBBLED OUT","AGE OF PAPER: 3 WEEKS","EMOTIONAL MARKER: FEAR"],flag:"sawDrawing"},{id:"tvnews",at:[-3.3,1.35,.6],label:"BROADCAST — ANDROID PROTEST",readout:["SOURCE: CHANNEL 16","DEVIANT COUNT: 243 THIS MONTH","PUBLIC OPINION: 61% HOSTILE"],flag:"sawNews"}];let te=0;return{name:"apartment",scene:n,camera:s,marks:he,bounds:ue,colliders:Ue,interactables:et,lights:{lamp:ne.light,windowKey:ce,tv:se,amb:J},scanTargets:_e,rain:W,update(j,oe){r.update(oe),W.update(j,oe,s),X?.update(oe),Te.update(oe),te+=j;const Me=.75+Math.sin(te*7.3)*.12+Math.sin(te*19.1)*.06;se.intensity=12*Me,ne.light.intensity=20+Math.sin(oe*1.7)*.6},applyLook(j){j.wetLens=0,j.setBloom(.16,.7,1.9),j.setStreak(.16,new A(.9,.66,.4)),j.highlightCeiling=6,j.applyLook({uExposure:1.95,uContrast:1.12,uSaturation:1.02,uSplit:.22,uVignette:.52,uGrain:.008,uHalation:.1,uShadowTint:new A(.34,.58,.86),uHighlightTint:new A(1,.82,.62)})},dispose(){W.dispose()},actions:{lampSwing:j=>{ne.light.intensity=j?11:20},tvOff:j=>{se.intensity=j?0:12}}}}function aM(i){const{quality:e}=i,t=new Ji,n=new zt(42,16/9,.06,120);t.background=new pe(263946),t.fog=new Zi(329740,.045);const s=4.6,r=5.2,o=2.9,a=Pe.tile(4),l=gr(s,r,a);l.rotation.x=-Math.PI/2,t.add(l);const c=gr(s,r,Pe.drywall(3817285));c.rotation.x=Math.PI/2,c.position.y=o,t.add(c);const h=Pe.drywall(5791332),d=Pe.paint(2764854,.5),u=(ne,ce,Te)=>{const J=He(ne,o,.14,h,[Te[0],o/2,Te[2]],ce);return t.add(J),J};u(s,0,[0,0,-r/2]),u(s,Math.PI,[0,0,r/2]),u(r,Math.PI/2,[s/2,0,0]),u(r,-Math.PI/2,[-s/2,0,0]);for(const[ne,ce,Te,J]of[[0,-r/2+.08,s,0],[0,r/2-.08,s,Math.PI],[s/2-.08,0,r,Math.PI/2]]){const se=He(Te,.9,.03,d,[ne,.45,ce],J);t.add(se)}const f=new Xt({color:new pe(857112).convertSRGBToLinear(),roughness:.05,metalness:.9,clearcoat:1,clearcoatRoughness:.03}),m=new qe(new Gt(2.6,1.3),f);m.position.set(-s/2+.08,1.55,0),m.rotation.y=Math.PI/2,t.add(m);const x=He(2.75,1.45,.06,Pe.metal(1,.2),[-s/2+.05,1.55,0],Math.PI/2);t.add(x);const g=Ol(1.5,.8,.75,Pe.metal(2,.4),Pe.metal(1,.3));g.position.set(0,0,0),t.add(g);const p=To(Pe.paint(3356734,.55));p.position.set(0,0,1.15),p.rotation.y=Math.PI,t.add(p);const T=To(Pe.paint(3356734,.55));T.position.set(0,0,-1.15),t.add(T);const b=He(.32,.015,.24,Pe.drywall(13157044),[.35,.79,.12],.2);t.add(b);const w=new qe(new Gt(.16,.12),new _n({color:new pe(9080724).convertSRGBToLinear(),roughness:.7}));w.rotation.x=-Math.PI/2,w.position.set(.3,.8,-.05),t.add(w);const S=zi("CASE 7734",{color:6545663,sub:"HK-400 / HOMICIDE",w:.4,h:.24,intensity:1.6,glow:.25});S.position.set(-.5,.9,.1),S.rotation.set(-.9,.3,0),t.add(S);const M=rn(.2,.24,.16,Pe.metal(1,.18),[0,o-.16,0],14);t.add(M);const y=new qe(new Wt(.11,14,10),Pe.neon(16773856,2.2));y.position.set(0,o-.24,0),t.add(y),t.add(pi(16773856,1.1,.5).translateY(o-.24));const v=Rn(e,{color:16773340,intensity:58,position:new A(0,o-.26,0),target:new A(0,.7,0),angle:.78,penumbra:.42,distance:9,radius:2.2});t.add(v,v.target);const E=Rn(e,{color:7645400,intensity:26,position:new A(-s/2+.2,1.6,0),target:new A(1,1.2,0),angle:1.1,penumbra:1,distance:10,shadow:!1});t.add(E,E.target);const C=new Ns(2899792,1185305,1.8);t.add(C);const P=He(2.4,.04,.04,Pe.neon(6545663,1.6),[-s/2+.14,2.32,0],Math.PI/2);t.add(P);const D=new jn(6545663,5,6,2);D.position.set(-s/2+.4,2.3,0),t.add(D);const N=new cd(.9,.9,2.6,16773340,e.volumetrics?.09:.035,0);N.mesh.position.set(0,o-.26,0),N.mesh.rotation.x=-Math.PI/2,t.add(N.mesh);const z=e.volumetrics?new wr(220,new A(3.6,2.6,4),16770760,.017):null;z&&(z.points.position.y=1.1,t.add(z.points));const I={suspectSeat:{pos:[0,0,-1.15],rotY:0},investigatorSeat:{pos:[0,0,1.15],rotY:Math.PI},standRight:{pos:[1.35,0,.4],rotY:-1.9},standLeft:{pos:[-1.35,0,.5],rotY:1.9},behindSuspect:{pos:[.8,0,-1.9],rotY:-.6},doorway:{pos:[1.6,0,2.1],rotY:-2.6},observer:{pos:[-1.6,0,1.8],rotY:2.4}},V={minX:-s/2+.4,maxX:s/2-.4,minZ:-r/2+.4,maxZ:r/2-.4},O=[{min:[-.8,-.45],max:[.8,.45]},{min:[-.3,-1.45],max:[.3,-.85]}],G=[{id:"i_file",at:[.35,.85,.5],label:"READ THE CASE FILE",marker:!0,radius:1.3,think:"Twenty-eight wounds. The report calls it a malfunction. Nobody wrote down what he said.",flag:"readFile"},{id:"i_mirror",at:[-1.9,1.55,0],label:"LOOK AT THE MIRROR",radius:1.4,think:"Three humans behind that glass, deciding what I am for. I can hear their coffee.",flag:"sawMirror"},{id:"i_suspect",at:[0,1.2,-1.6],label:"STUDY THE SUSPECT",marker:!0,radius:1.5,think:"Stress at seventy-four per cent. If it climbs to ninety it will tear out its own pump.",flag:"sawStress"}],q=[{id:"file",at:[.35,.82,.12],label:"CASE FILE 7734",readout:["VICTIM: OWNER, 62","WOUNDS: 28 STAB","WEAPON: KITCHEN KNIFE","ANDROID FOUND: 6 HOURS LATER"],flag:"readFile"},{id:"hands",at:[0,.82,-.5],label:"SUSPECT HANDS — DAMAGE",readout:["SYNTHETIC SKIN: TORN","THIRIUM RESIDUE: HUMAN BLOOD","GRIP FORCE APPLIED: 780 N","SELF-INFLICTED MARKS PRESENT"],flag:"sawHands"},{id:"led",at:[-.1,1.42,-1.05],label:"LED — RED, UNSTABLE",readout:["STRESS LEVEL: 74%","SELF-DESTRUCT RISK: HIGH","RECOMMEND: DE-ESCALATE"],flag:"sawStress"}];let re=0;return{name:"interrogation",scene:t,camera:n,marks:I,bounds:V,colliders:O,interactables:G,lights:{overhead:v,mirrorBounce:E,amb:C,strip:D},scanTargets:q,update(ne,ce){N.update(ce),z?.update(ce),v.intensity=58+Math.sin(ce*.9)*1.2,re>0&&(D.intensity=5+Math.sin(ce*22)*3*re)},applyLook(ne){ne.wetLens=0,ne.setBloom(.15,.7,1.95),ne.setStreak(.12,new A(.5,.7,1)),ne.highlightCeiling=5.5,ne.applyLook({uExposure:1.85,uContrast:1.16,uSaturation:.94,uSplit:.2,uVignette:.6,uGrain:.008,uHalation:.12,uShadowTint:new A(.32,.6,.92),uHighlightTint:new A(1,.9,.78)})},dispose(){},actions:{stress:ne=>{re=ne?1:0,v.color.set(ne?16767168:16773340)},lampOnly:ne=>{E.intensity=ne?6:26,C.intensity=ne?.7:1.8}}}}function md(i){const{quality:e,renderer:t}=i,n=new Ji,s=new zt(36,16/9,.08,700),r=new Ho({top:198155,horizon:1320506,ground:329739,clouds:.9,cloudColor:1912642,cityGlow:1,cityGlowColor:3560302,sun:new A(.3,.18,-1),sunColor:9417944});n.add(r.mesh),n.fog=new Zi(661028,.023);const o=r.buildEnvironment(t,[ui(6545663,3,26,12,new A(-18,6,0)),ui(16731498,2.2,22,10,new A(18,5,-6)),ui(16761415,1.4,16,8,new A(0,4,34))]);n.environment=o,n.environmentIntensity=.85;const a=new dc({size:140,resolution:e.reflectionScale,wetness:1,reflectStrength:.85,texRepeat:34,color:8554638});n.add(a.mesh);const l=Pe.concrete(6,.085);for(const J of[-1,1]){const se=He(7,.18,90,l,[J*11.5,.09,0]);n.add(se);const k=He(.3,.24,90,Pe.concrete(4,.1),[J*8.1,.12,0]);n.add(k)}for(let J=-14;J<=14;J++){const se=He(.16,.012,2.4,Pe.paint(12104602,.85),[0,.012,J*6]);n.add(se)}for(const[J,se]of[[-3.2,8],[4.4,-12],[1.2,22]]){const k=rn(.42,.42,.03,Pe.metal(1,.24),[J,.014,se],18);n.add(k)}for(const[J,se,k]of[[-5.5,6,2.4],[4.5,-3,2],[-2,-14,2.8],[7,14,1.8],[.5,30,2.6],[-9,20,1.7]]){const X=dd(k);X.position.set(J,.008,se),n.add(X)}n.add(pd(30,13,16));const c=Pe.brick(4),h=Pe.concrete(5,.075),d=[["NOODLE",16731498,"OPEN 24H"],["ANDROID ZONE",6545663,"NO ENTRY"],["PAWN",16761415,void 0],["BAR",16747085,"COLD BEER"],["CLINIC",9109442,"REPAIRS"],["HOTEL",16751317,"VACANCY"]];for(const J of[-1,1])for(let se=0;se<6;se++){const k=-34+se*13+(J>0?5:0),X=9+(se*7+(J>0?3:0))%4*3.5,he=He(12,X,11,se%2?c:h,[J*20,X/2,k]);n.add(he);const ue=new qe(new Gt(9,2.8),Pe.glass(659992,.3));ue.position.set(J*14.4,1.7,k),ue.rotation.y=J>0?-Math.PI/2:Math.PI/2,n.add(ue);const Ue=new jn(se%3===0?16762762:9427199,14,14,2);Ue.position.set(J*16.5,2,k),n.add(Ue);const[et,_e,te]=d[(se+(J>0?3:0))%d.length],j=se%3===1,oe=zi(et,{color:_e,sub:j?void 0:te,w:j?1.5:5.4,h:j?5.4:1.5,vertical:j,intensity:3.2,glow:.55});oe.position.set(J*13.7,j?5.6:4.2,k+1.5),oe.rotation.y=J>0?-Math.PI/2:Math.PI/2,n.add(oe);const Me=new jn(_e,26,22,2);Me.position.set(J*11.5,j?5.6:4.2,k+1.5),n.add(Me)}const u=zi("ANDROIDS",{color:14676223,sub:"ARE NOT ALIVE",w:18,h:6.4,intensity:2.2,glow:.5,border:!0});u.position.set(-2,12,-44),n.add(u),n.add(fc(40,150,31,{minH:26,maxH:120,lit:.42}));const f=[];for(let J=0;J<7;J++){const se=-30+J*11;for(const k of[-1,1]){const X=ud(6.4,16765600,150);if(X.group.position.set(k*8.6,0,se),X.group.rotation.y=k>0?Math.PI:0,n.add(X.group),e.volumetrics&&J%2===0){const W=new mr({height:7,radius:3.4,color:16765600,opacity:.075});W.mesh.position.set(k*8.6+k*-.84,6.2,se),n.add(W.mesh),f.push(W)}}}const m=co(1711910,6545663);m.position.set(-6.4,0,16),m.rotation.y=Math.PI*.02,n.add(m);const x=co(2824735,16734830);x.position.set(6.6,0,-18),x.rotation.y=Math.PI,n.add(x);const g=new yt;for(let J=-3;J<=3;J++){const se=fd(2.6);se.position.set(J*2.7,0,0),g.add(se)}const p=co(1053464,5082367);p.position.set(-7.2,0,-3.4),p.rotation.y=Math.PI/2+.2,g.add(p);const T=co(1053464,5082367);T.position.set(7.4,0,-3.6),T.rotation.y=-Math.PI/2-.2,g.add(T);const b=[],w=[];for(const[J,se,k]of[[-7.2,-3.4,5082367],[7.4,-3.6,16731482],[-7.2,-3.4,16731482],[7.4,-3.6,5082367]]){const X=pi(k,2.2,.8);X.position.set(J,1.45,se),g.add(X),b.push(X);const W=new jn(k,30,22,2);W.position.set(J,1.5,se),g.add(W),w.push(W)}g.position.set(0,0,-13),n.add(g);const S=Rn(e,{color:15398655,intensity:340,position:new A(-6,7.5,-19),target:new A(-1,1.4,6),angle:.24,penumbra:.55,distance:60,radius:2}),M=Rn(e,{color:15398655,intensity:340,position:new A(6,7.5,-20),target:new A(2,1.4,8),angle:.24,penumbra:.55,distance:60,shadow:!1});n.add(S,S.target,M,M.target);const y=[];if(e.volumetrics)for(const[J,se]of[[-6,-19],[6,-20]]){const k=new mr({height:30,radius:7,color:15398655,opacity:.055,noise:.55,soft:2.2});k.mesh.position.set(J,7.5,se),k.mesh.rotation.x=-1.28,n.add(k.mesh),y.push(k)}const v=iM(e.name==="low"?12:26,5,8,1777961);v.position.set(0,0,13),n.add(v);const E=Ul(e,{color:10469608,intensity:.42,position:new A(-18,26,12),target:new A(0,1,0),area:22,far:90,radius:3});n.add(E,E.target);const C=new Ns(4481151,1712167,2.6);n.add(C);const P=Rn(e,{color:12376319,intensity:85,position:new A(-3.2,5.4,10),target:new A(0,1.4,5),angle:.7,penumbra:.8,distance:24,radius:3});n.add(P,P.target);const D=new zo({count:e.rainCount,splashes:e.splashCount,radius:26,height:26,wind:new ae(1.3,.5),color:13166335,mist:e.volumetrics});n.add(D.group);const N=new hd(14216447,4.5);n.add(N.light);const z=e.volumetrics?new wr(300,new A(24,7,24),12574975,.024):null;z&&(z.points.position.y=1.4,n.add(z.points));const I=[];for(let J=0;J<4;J++){const se=He(1.6,.1,.1,Pe.neon(J%2?16738893:16773853,2.4),[0,.9,-40+J*2]);n.add(se),I.push(se)}const V=gr(200,1,Pe.paint(329739,1));V.position.set(0,.4,-60),n.add(V);const O={leaderFront:{pos:[0,0,4.2],rotY:Math.PI},leaderSpeech:{pos:[0,0,1.4],rotY:Math.PI},beside:{pos:[1.5,0,5.4],rotY:Math.PI-.2},besideL:{pos:[-1.6,0,5.6],rotY:Math.PI+.2},crowdFront:{pos:[0,0,8.5],rotY:Math.PI},lineCentre:{pos:[0,0,-9.5],rotY:0},officerA:{pos:[-2.2,0,-10.6],rotY:.1},officerB:{pos:[2.4,0,-10.8],rotY:-.1},fallen:{pos:[.6,0,2],rotY:.4},walkStart:{pos:[0,0,22],rotY:Math.PI}},G={minX:-7.4,maxX:7.4,minZ:-6.2,maxZ:23},q=[{min:[-8.6,14],max:[-4.2,18]},{min:[4.4,-6],max:[8.8,-2]}],re=[{id:"i_line",at:[0,1.2,-5.6],label:"READ THE POLICE LINE",marker:!0,radius:2.4,think:"Fourteen officers. Riot protocol active. The order to fire has not been given yet.",flag:"sawLine"},{id:"i_crowd",at:[0,1.4,11.5],label:"LOOK BACK AT THE MARCH",marker:!0,radius:2.6,think:"Eight hundred and twelve of them, and every one is waiting to see what I do first.",flag:"sawCrowd"},{id:"i_camera",at:[-6.4,1.5,4],label:"FACE THE BROADCAST DRONE",radius:2.2,think:"Forty-one million people. They will remember the picture, not the argument.",flag:"sawCamera"},{id:"i_sign",at:[-2,1.4,19],label:"READ THE BILLBOARD",radius:2.6,think:'"Androids are not alive." Somebody paid to have that printed six metres tall.',flag:"sawSign"}],ne=[{id:"line",at:[0,1.2,-13],label:"POLICE CORDON — 14 OFFICERS",readout:["ARMED: YES","RIOT PROTOCOL: ACTIVE","ORDERS TO FIRE: PENDING","PROBABILITY OF ESCALATION: 71%"],flag:"sawLine"},{id:"camera",at:[-8.4,4.4,2],label:"BROADCAST DRONE",readout:["LIVE FEED: 41M VIEWERS","PUBLIC OPINION SWING: ±18%","RECOMMEND: BE SEEN, NOT HEARD"],flag:"sawCamera"},{id:"crowd",at:[0,1.4,13],label:"MARCHERS — 812 UNITS",readout:["STRESS AVERAGE: 61%","ARMED: 4%","THEY ARE FOLLOWING YOU","ONE ORDER CHANGES EVERYTHING"],flag:"sawCrowd"}];let ce=0,Te=0;return{name:"street",scene:n,camera:s,marks:O,bounds:G,colliders:q,interactables:re,lights:{moon:E,amb:C,heroKey:P,searchA:S,searchB:M},scanTargets:ne,wetGround:a,rain:D,lightning:N,update(J,se){r.update(se),a.update(se),D.update(J,se,s),N.update(J),z?.update(se);for(const k of f)k.update(se);for(const k of y)k.update(se);ce+=J*2.4;for(let k=0;k<b.length;k++){const X=Math.sin(ce+k%2*Math.PI)*.5+.5;b[k].material.opacity=.15+X*.85,w[k].intensity=5+X*32}Te+=J*.22,S.target.position.set(Math.sin(Te)*5-1,1.4,6+Math.cos(Te)*3),M.target.position.set(Math.sin(Te+2.1)*5+2,1.4,8+Math.cos(Te+2.1)*3);for(let k=0;k<y.length;k++)y[k].mesh.rotation.z=Math.sin(Te+k*2.1)*.12;for(let k=0;k<I.length;k++){const X=(se*(.12+k*.03)+k*.27)%1*2-1;I[k].position.x=X*42*(k%2?-1:1)}},prerender(J,se){a.renderReflection(J,n,se)},applyLook(J){J.wetLens=.32,J.setBloom(.18,.72,1.9),J.setStreak(.16,new A(.42,.66,1)),J.highlightCeiling=6.5,J.applyLook({uExposure:1.75,uContrast:1.1,uSaturation:1.12,uSplit:.22,uVignette:.48,uGrain:.008,uHalation:.1,uShadowTint:new A(.28,.58,.96),uHighlightTint:new A(1,.84,.68)})},dispose(){D.dispose(),a.dispose()},actions:{searchlights:J=>{S.intensity=J?340:0,M.intensity=J?340:0;for(const se of y)se.opacity=J?.055:0},redAlert:J=>{C.color.set(J?5910592:3822704),P.color.set(J?16747130:12376319)},crowdAdvance:J=>{v.position.z=J?9:13}}}}const lM={rooftop:rM,apartment:oM,interrogation:aM,street:md};class cM{engine;params;ui=new B1;set=null;director=null;chapterIndex=0;state={flags:new Set,stats:{},nodes:new Set,instability:.08};pointer={x:window.innerWidth/2,y:window.innerHeight/2};demo=!1;menuVisible=!0;awaitingFlow=!1;held=new Set;started=!1;constructor(e,t){this.engine=e,this.params=t}async boot(){this.bindInput(),this.bindMenu();const e=document.getElementById("loader"),t=document.getElementById("loader-fill"),n=document.getElementById("loader-txt");n.textContent="GENERATING MATERIALS",t.style.width="35%",await xs();const{asphalt:s,concrete:r,brick:o,stoneTile:a,metal:l,wood:c}=e1;s(512),r(512),o(512),a(512),l(512),c(512),t.style.width="70%",n.textContent="COMPILING SHADERS",await xs();const h=document.getElementById("q-label");h&&(h.textContent=this.engine.quality.label),t.style.width="100%",await xs(),e.classList.add("gone");const d=this.params.get("chapter"),u=this.params.get("demo")==="1";if(d||u){const f=d?Math.max(0,ao.findIndex(m=>m.id===d)):0;this.demo=u,this.hideMenu(),await this.startChapter(f===-1?0:f)}else await this.showMenuScene();this.engine.onFrame=f=>this.tick(f),this.engine.start(),this.started=!0}async showMenuScene(){const e=md({renderer:this.engine.renderer,quality:this.engine.quality});this.set=e,e.camera.position.set(-6.5,2.2,16),e.camera.lookAt(0,2.2,-6),this.engine.setSet({name:"menu",scene:e.scene,camera:e.camera,update:(t,n)=>{e.update(t,n);const s=n*.06;e.camera.position.set(-6.5+Math.sin(s)*2.2,2.2+Math.sin(s*.7)*.35,16+Math.cos(s)*1.6),e.camera.lookAt(0,2,-6),this.engine.fx.focusTarget=22,this.engine.fx.aperture=.9},prerender:(t,n)=>e.prerender?.(t,n),applyLook:t=>e.applyLook(t),dispose:()=>e.dispose()}),this.ui.setLetterbox(!1),this.ui.showHud(!1),this.menuVisible=!0,document.getElementById("menu")?.classList.remove("hidden")}bindMenu(){document.getElementById("menu").querySelectorAll(".mi").forEach(t=>{t.addEventListener("click",async()=>{await mt.start();const n=t.dataset.act;mt.uiSelect(),n==="play"?(this.demo=!1,this.hideMenu(),await this.startChapter(0)):n==="demo"?(this.demo=!0,this.hideMenu(),await this.startChapter(0)):n==="chapters"?this.showChapterList():n==="quality"&&this.cycleQuality()}),t.addEventListener("mouseenter",()=>mt.uiMove())})}showChapterList(){const e=document.getElementById("chapter-list");e.innerHTML="",ao.forEach((n,s)=>{const r=document.createElement("button");r.className="ci",r.innerHTML=`<b>${n.kicker} — ${n.title}</b><span>${n.sub} · ~${n.minutes??2} MIN</span>`,r.addEventListener("click",async()=>{await mt.start(),mt.uiSelect(),e.classList.add("hidden"),this.demo=!1,this.hideMenu(),await this.startChapter(s)}),e.appendChild(r)});const t=document.createElement("button");t.className="ci",t.innerHTML="<b>BACK</b><span>RETURN TO MENU</span>",t.addEventListener("click",()=>{mt.uiBack(),e.classList.add("hidden")}),e.appendChild(t),e.classList.remove("hidden")}cycleQuality(){const e=Ia.indexOf(this.engine.qualityName),t=Ia[(e+1)%Ia.length],n=document.getElementById("q-label");this.engine.setQuality(t,()=>{n&&(n.textContent=this.engine.quality.label)}),n&&(n.textContent=this.engine.quality.label)}hideMenu(){document.getElementById("menu")?.classList.add("hidden"),document.getElementById("chapter-list")?.classList.add("hidden"),this.menuVisible=!1,document.body.classList.add("playing")}async startChapter(e){this.chapterIndex=e;const t=ao[e];await mt.start(),this.teardown();const n=document.getElementById("loader"),s=document.getElementById("loader-txt");s.textContent=`LOADING — ${t.title}`,n.classList.remove("gone"),await xs(),await xs();const r=lM[t.set]({renderer:this.engine.renderer,quality:this.engine.quality});this.set=r,this.engine.setSet({name:t.id,scene:r.scene,camera:r.camera,update:(l,c)=>{r.update(l,c),this.director?.update(l)},prerender:(l,c)=>r.prerender?.(l,c),applyLook:l=>r.applyLook(l),dispose:()=>r.dispose()}),r.lightning&&(r.lightning.onFlash=l=>{this.engine.fx.flash=l*.5}),this.director=new Y1(t,r,this.ui,this.engine.fx,{onChapterEnd:(l,c)=>this.onChapterEnd(t,l,c),onNeedInput:l=>{document.body.classList.toggle("pointer",l==="scan"||l==="choice")}},{demo:this.demo,state:this.state}),this.director.spawnCast(this.engine.quality.characterSegments),this.ui.setInstability(this.state.instability),this.ui.showHud(!1),t.objective&&this.ui.setObjective(t.objective);const o=Number(this.params.get("seek")??0),a=this.params.get("roam")==="1";if((o>0||a)&&this.director){this.ui.instant=!0,this.director.fastForward=!0,this.director.haltOnExplore=a,this.director.setDemo(!0);const l=o>0?o:600,c=2;for(let h=0;h<l&&(this.engine.warm(Math.min(c,l-h),1/30),!this.director.seekHalted);h+=c);this.director.fastForward=!1,this.director.haltOnExplore=!1,this.ui.instant=!1,this.director.setDemo(this.demo),this.director.seekHalted&&this.director.resumeExploreAfterSeek()}this.engine.warm(.6,.1),await xs(),n.classList.add("gone")}onChapterEnd(e,t,n){this.state=n,this.ui.showHud(!1),this.ui.clearSay(),this.ui.setLetterbox(!1),mt.stopMusic();const s=[{label:"CLUES FOUND",value:String(n.stats.clues??0)},{label:"INSTABILITY",value:`${Math.round(n.instability*100)}%`},{label:"PUBLIC OPINION",value:String(n.stats.opinion??0)}],r=new Set(n.nodes);r.add("start"),this.ui.showFlow(`${e.kicker} — ${e.title}`,e.flow,r,s),this.awaitingFlow=!0,mt.chime(),this.flowTimer=this.demo?6.5:-1}async advanceFromFlow(){if(!this.awaitingFlow)return;this.awaitingFlow=!1,this.ui.hideFlow(),this.ui.setFade(!0,!1,.4);const e=this.chapterIndex+1;e<ao.length?(await this.startChapter(e),this.ui.setFade(!1,!1,1.2)):(this.teardown(),await this.showMenuScene(),document.body.classList.remove("playing"),this.ui.setFade(!1,!1,1.4),this.state={flags:new Set,stats:{},nodes:new Set,instability:.08})}teardown(){this.director?.dispose(),this.director=null,this.set&&(this.set.dispose(),this.set=null),mt.stopAmbience(.4)}bindInput(){window.addEventListener("keydown",e=>{if(e.key==="Tab"&&e.preventDefault(),!this.held.has(e.key)){if(this.held.add(e.key),this.awaitingFlow&&(e.key===" "||e.key==="Enter")){this.advanceFromFlow();return}if(e.key==="p"||e.key==="P"){this.ui.showPerf(this.perfShown?null:"perf"),this.perfShown=!this.perfShown;return}if(e.key==="Escape"&&!this.menuVisible&&!this.awaitingFlow){this.teardown(),this.showMenuScene(),document.body.classList.remove("playing");return}this.director?.keyDown(e.key)}}),window.addEventListener("keyup",e=>this.held.delete(e.key)),window.addEventListener("mousemove",e=>{this.pointer.x=e.clientX,this.pointer.y=e.clientY;const t=this.director?.player;t?.enabled&&!this.ui.scanning&&(document.pointerLockElement||this.dragging)&&t.look(e.movementX,e.movementY)}),window.addEventListener("mousedown",()=>{this.dragging=!0}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("wheel",e=>{const t=this.director?.player;t?.enabled&&t.zoom(e.deltaY)},{passive:!0}),window.addEventListener("click",()=>{if(mt.start(),this.awaitingFlow){this.advanceFromFlow();return}this.director?.player?.enabled&&!this.ui.scanning&&!document.pointerLockElement&&document.getElementById("view")?.requestPointerLock?.(),this.director?.click()})}perfShown=!1;dragging=!1;flowTimer=-1;pumpMovement(){const e=this.director?.player;if(!e?.enabled)return;const t=(...r)=>r.some(o=>this.held.has(o)),n=(t("w","W","ArrowUp")?1:0)-(t("s","S","ArrowDown")?1:0),s=(t("d","D","ArrowRight")?1:0)-(t("a","A","ArrowLeft")?1:0);e.setInput({forward:n,right:s,run:t("Shift","ShiftLeft","ShiftRight")})}tick(e){if(this.flowTimer>0&&(this.flowTimer-=e,this.flowTimer<=0&&(this.flowTimer=-1,this.advanceFromFlow())),this.pumpMovement(),this.director&&this.set&&this.ui.updateScan(this.set.camera,this.pointer),this.perfShown){const t=this.engine.renderer.info.render;this.ui.showPerf(`${this.engine.fps.toFixed(0)} fps · ${this.engine.qualityName}
${t.calls} calls · ${(t.triangles/1e3).toFixed(0)}k tris`)}}get isPlaying(){return this.started&&!this.menuVisible}}function xs(){return new Promise(i=>requestAnimationFrame(()=>i()))}const wn=new URLSearchParams(location.search),hM=document.getElementById("view"),uM=wn.get("q"),Zt=new r1(hM,uM??void 0);wn.get("nopost")&&(Zt.bypassPost=!0);const Jh=wn.get("qover");if(Jh){const i=Zt.quality;for(const e of Jh.split(",")){const[t,n]=e.split(":");if(!t||n===void 0)continue;const s=Number(n);i[t]=Number.isNaN(s)?n:n==="0"||n==="1"?n==="1":s}}window.__engine=Zt;function Oa(){const i=window,e=Number(wn.get("rf")??4),t=()=>{Zt.clock.frame>e?i.__engineReady=!0:requestAnimationFrame(t)};requestAnimationFrame(t)}async function dM(){const i=document.getElementById("loader"),e=wn.get("dev");if(e==="heads"){document.getElementById("menu")?.classList.add("hidden");const n=O1(Zt,wn);Zt.setSet(n),wn.get("stage")&&(Zt.fx.debugStage=Number(wn.get("stage"))),Zt.warm(Number(wn.get("warm")??3)),Zt.start(),i.classList.add("gone"),Oa();return}if(e==="portrait"){document.getElementById("menu")?.classList.add("hidden");const n=F1(Zt,wn);Zt.setSet(n),Zt.warm(Number(wn.get("warm")??3.5)),Zt.start(),i.classList.add("gone"),Oa();return}const t=new cM(Zt,wn);window.__game=t,await t.boot(),wn.get("film")==="1"&&(Zt.stop(),Zt.deterministic=!0,window.__film={step:n=>Zt.step(n),time:()=>Zt.clock.time}),Oa()}dM().catch(i=>{console.error(i);const e=document.getElementById("loader-txt");e&&(e.textContent=`FAILED: ${String(i).slice(0,120)}`)});
