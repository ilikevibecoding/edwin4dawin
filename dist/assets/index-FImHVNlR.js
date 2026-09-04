(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e,t,n,r,i,a,o,s,c,l=1e3,u=1001,d=1002,f=1003,p=1004,m=1005,h=1006,g=1007,_=1008,v=1009,y=1010,b=1011,x=1012,S=1013,C=1014,w=1015,T=1016,E=1017,D=1018,ee=1020,O=35902,k=35899,te=1021,ne=1022,A=1023,re=1026,ie=1027,ae=1028,oe=1029,se=1030,ce=1031,le=1033,ue=33776,de=33777,fe=33778,pe=33779,me=35840,he=35841,ge=35842,_e=35843,ve=36196,ye=37492,be=37496,xe=37488,Se=37489,Ce=37490,we=37491,Te=37808,Ee=37809,De=37810,Oe=37811,ke=37812,Ae=37813,je=37814,Me=37815,Ne=37816,Pe=37817,Fe=37818,Ie=37819,Le=37820,j=37821,Re=36492,ze=36494,Be=36495,M=36283,Ve=36284,N=36285,He=36286,Ue=2300,We=2301,Ge=2302,Ke=2303,qe=2400,Je=2401,Ye=2402,Xe=3200,Ze=`srgb`,Qe=`srgb-linear`,$e=`linear`,et=`srgb`,tt=7680,nt=35044,rt=35048,it=2e3;function at(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function ot(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function st(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function ct(){let e=st(`canvas`);return e.style.display=`block`,e}var lt={};function ut(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function dt(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function P(...e){e=dt(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function F(...e){e=dt(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function ft(...e){let t=e.join(` `);t in lt||(lt[t]=!0,P(...e))}function pt(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var mt={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},ht=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},gt=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),_t=Math.PI/180,vt=180/Math.PI;function yt(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(gt[e&255]+gt[e>>8&255]+gt[e>>16&255]+gt[e>>24&255]+`-`+gt[t&255]+gt[t>>8&255]+`-`+gt[t>>16&15|64]+gt[t>>24&255]+`-`+gt[n&63|128]+gt[n>>8&255]+`-`+gt[n>>16&255]+gt[n>>24&255]+gt[r&255]+gt[r>>8&255]+gt[r>>16&255]+gt[r>>24&255]).toLowerCase()}function bt(e,t,n){return Math.max(t,Math.min(n,e))}function xt(e,t){return(e%t+t)%t}function St(e,t,n){return(1-n)*e+n*t}function Ct(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function wt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}o=Symbol.iterator;var Tt=class{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(bt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(bt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[o](){yield this.x,yield this.y}};e=Tt,e.prototype.isVector2=!0;var Et=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:P(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(bt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}};s=Symbol.iterator;var I=class{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ot.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ot.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(bt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Dt.copy(this).projectOnVector(e),this.sub(Dt)}reflect(e){return this.sub(Dt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(bt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[s](){yield this.x,yield this.y,yield this.z}};t=I,t.prototype.isVector3=!0;var Dt=new I,Ot=new Et,L=class{constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return ft(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(kt.makeScale(e,t)),this}rotate(e){return ft(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(kt.makeRotation(-e)),this}translate(e,t){return ft(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(kt.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};n=L,n.prototype.isMatrix3=!0;var kt=new L,At=new L().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),jt=new L().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Mt(){let e={enabled:!0,workingColorSpace:Qe,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=Pt(e.r),e.g=Pt(e.g),e.b=Pt(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Ft(e.r),e.g=Ft(e.g),e.b=Ft(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?$e:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return ft(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return ft(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Qe]:{primaries:t,whitePoint:r,transfer:$e,toXYZ:At,fromXYZ:jt,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ze},outputColorSpaceConfig:{drawingBufferColorSpace:Ze}},[Ze]:{primaries:t,whitePoint:r,transfer:et,toXYZ:At,fromXYZ:jt,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ze}}}),e}var Nt=Mt();function Pt(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Ft(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var It,Lt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{It===void 0&&(It=st(`canvas`)),It.width=e.width,It.height=e.height;let t=It.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=It}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=st(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Pt(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Pt(t[e]/255)*255):t[e]=Pt(t[e]);return{data:t,width:e.width,height:e.height}}return P(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Rt=0,zt=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Rt++}),this.uuid=yt(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Bt(r[t].image)):e.push(Bt(r[t]))}else e=Bt(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Bt(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Lt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(P(`Texture: Unable to serialize Texture.`),{})}var Vt=0,Ht=new I,Ut=class e extends ht{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=u,i=u,a=h,o=_,s=A,c=v,l=e.DEFAULT_ANISOTROPY,d=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Vt++}),this.uuid=yt(),this.name=``,this.source=new zt(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new Tt(0,0),this.repeat=new Tt(1,1),this.center=new Tt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new L,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Ht).x}get height(){return this.source.getSize(Ht).y}get depth(){return this.source.getSize(Ht).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){P(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){P(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case l:e.x-=Math.floor(e.x);break;case u:e.x=e.x<0?0:1;break;case d:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case l:e.y-=Math.floor(e.y);break;case u:e.y=e.y<0?0:1;break;case d:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Ut.DEFAULT_IMAGE=null,Ut.DEFAULT_MAPPING=300,Ut.DEFAULT_ANISOTROPY=1,c=Symbol.iterator;var Wt=class{constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this.w=bt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this.w=bt(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(bt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[c](){yield this.x,yield this.y,yield this.z,yield this.w}};r=Wt,r.prototype.isVector4=!0;var Gt=class extends ht{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:h,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Wt(0,0,e,t),this.scissorTest=!1,this.viewport=new Wt(0,0,e,t),this.textures=[];let r=new Ut({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:h,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new zt(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},Kt=class extends Gt{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},qt=class extends Ut{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=f,this.minFilter=f,this.wrapR=u,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Jt=class extends Ut{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=f,this.minFilter=f,this.wrapR=u,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Yt=class e{constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Xt.setFromMatrixColumn(e,0).length(),i=1/Xt.setFromMatrixColumn(e,1).length(),a=1/Xt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Qt,e,$t)}lookAt(e,t,n){let r=this.elements;return nn.subVectors(e,t),nn.lengthSq()===0&&(nn.z=1),nn.normalize(),en.crossVectors(n,nn),en.lengthSq()===0&&(Math.abs(n.z)===1?nn.x+=1e-4:nn.z+=1e-4,nn.normalize(),en.crossVectors(n,nn)),en.normalize(),tn.crossVectors(nn,en),r[0]=en.x,r[4]=tn.x,r[8]=nn.x,r[1]=en.y,r[5]=tn.y,r[9]=nn.y,r[2]=en.z,r[6]=tn.z,r[10]=nn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],ee=r[13],O=r[2],k=r[6],te=r[10],ne=r[14],A=r[3],re=r[7],ie=r[11],ae=r[15];return i[0]=a*x+o*T+s*O+c*A,i[4]=a*S+o*E+s*k+c*re,i[8]=a*C+o*D+s*te+c*ie,i[12]=a*w+o*ee+s*ne+c*ae,i[1]=l*x+u*T+d*O+f*A,i[5]=l*S+u*E+d*k+f*re,i[9]=l*C+u*D+d*te+f*ie,i[13]=l*w+u*ee+d*ne+f*ae,i[2]=p*x+m*T+h*O+g*A,i[6]=p*S+m*E+h*k+g*re,i[10]=p*C+m*D+h*te+g*ie,i[14]=p*w+m*ee+h*ne+g*ae,i[3]=_*x+v*T+y*O+b*A,i[7]=_*S+v*E+y*k+b*re,i[11]=_*C+v*D+y*te+b*ie,i[15]=_*w+v*ee+y*ne+b*ae,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,ee=d*g-f*h,O=_*ee-v*D+y*E+b*T-x*w+S*C;if(O===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let k=1/O;return e[0]=(o*ee-s*D+c*E)*k,e[1]=(r*D-n*ee-i*E)*k,e[2]=(m*S-h*x+g*b)*k,e[3]=(d*x-u*S-f*b)*k,e[4]=(s*T-a*ee-c*w)*k,e[5]=(t*ee-r*T+i*w)*k,e[6]=(h*y-p*S-g*v)*k,e[7]=(l*S-d*y+f*v)*k,e[8]=(a*D-o*T+c*C)*k,e[9]=(n*T-t*D-i*C)*k,e[10]=(p*x-m*y+g*_)*k,e[11]=(u*y-l*x-f*_)*k,e[12]=(o*w-a*E-s*C)*k,e[13]=(t*E-n*w+r*C)*k,e[14]=(m*v-p*b-h*_)*k,e[15]=(l*b-u*v+d*_)*k,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Xt.set(r[0],r[1],r[2]).length(),o=Xt.set(r[4],r[5],r[6]).length(),s=Xt.set(r[8],r[9],r[10]).length();i<0&&(a=-a),Zt.copy(this);let c=1/a,l=1/o,u=1/s;return Zt.elements[0]*=c,Zt.elements[1]*=c,Zt.elements[2]*=c,Zt.elements[4]*=l,Zt.elements[5]*=l,Zt.elements[6]*=l,Zt.elements[8]*=u,Zt.elements[9]*=u,Zt.elements[10]*=u,t.setFromRotationMatrix(Zt),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=it,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=it,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};i=Yt,i.prototype.isMatrix4=!0;var Xt=new I,Zt=new Yt,Qt=new I(0,0,0),$t=new I(1,1,1),en=new I,tn=new I,nn=new I,rn=new Yt,an=new Et,on=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(bt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-bt(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(bt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-bt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(bt(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-bt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:P(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return rn.makeRotationFromQuaternion(e),this.setFromRotationMatrix(rn,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return an.setFromEuler(this),this.setFromQuaternion(an,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};on.DEFAULT_ORDER=`XYZ`;var sn=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},cn=0,ln=new I,un=new Et,dn=new Yt,fn=new I,pn=new I,mn=new I,hn=new Et,gn=new I(1,0,0),_n=new I(0,1,0),vn=new I(0,0,1),yn={type:`added`},bn={type:`removed`},xn={type:`childadded`,child:null},Sn={type:`childremoved`,child:null},Cn=class e extends ht{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:cn++}),this.uuid=yt(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new I,n=new on,r=new Et,i=new I(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Yt},normalMatrix:{value:new L}}),this.matrix=new Yt,this.matrixWorld=new Yt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new sn,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return un.setFromAxisAngle(e,t),this.quaternion.multiply(un),this}rotateOnWorldAxis(e,t){return un.setFromAxisAngle(e,t),this.quaternion.premultiply(un),this}rotateX(e){return this.rotateOnAxis(gn,e)}rotateY(e){return this.rotateOnAxis(_n,e)}rotateZ(e){return this.rotateOnAxis(vn,e)}translateOnAxis(e,t){return ln.copy(e).applyQuaternion(this.quaternion),this.position.add(ln.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(gn,e)}translateY(e){return this.translateOnAxis(_n,e)}translateZ(e){return this.translateOnAxis(vn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(dn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?fn.copy(e):fn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),pn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?dn.lookAt(pn,fn,this.up):dn.lookAt(fn,pn,this.up),this.quaternion.setFromRotationMatrix(dn),r&&(dn.extractRotation(r.matrixWorld),un.setFromRotationMatrix(dn),this.quaternion.premultiply(un.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(F(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(yn),xn.child=e,this.dispatchEvent(xn),xn.child=null):F(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(bn),Sn.child=e,this.dispatchEvent(Sn),Sn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(dn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(yn),xn.child=e,this.dispatchEvent(xn),xn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pn,e,mn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pn,hn,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};Cn.DEFAULT_UP=new I(0,1,0),Cn.DEFAULT_MATRIX_AUTO_UPDATE=!0,Cn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var wn=class extends Cn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Tn={type:`move`},En=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new wn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new wn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new wn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Tn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new wn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Dn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},On={h:0,s:0,l:0},kn={h:0,s:0,l:0};function An(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var R=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ze){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Nt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Nt.workingColorSpace){return this.r=e,this.g=t,this.b=n,Nt.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Nt.workingColorSpace){if(e=xt(e,1),t=bt(t,0,1),n=bt(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=An(i,r,e+1/3),this.g=An(i,r,e),this.b=An(i,r,e-1/3)}return Nt.colorSpaceToWorking(this,r),this}setStyle(e,t=Ze){function n(t){t!==void 0&&parseFloat(t)<1&&P(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:P(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);P(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ze){let n=Dn[e.toLowerCase()];return n===void 0?P(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Pt(e.r),this.g=Pt(e.g),this.b=Pt(e.b),this}copyLinearToSRGB(e){return this.r=Ft(e.r),this.g=Ft(e.g),this.b=Ft(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ze){return Nt.workingToColorSpace(jn.copy(this),e),Math.round(bt(jn.r*255,0,255))*65536+Math.round(bt(jn.g*255,0,255))*256+Math.round(bt(jn.b*255,0,255))}getHexString(e=Ze){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Nt.workingColorSpace){Nt.workingToColorSpace(jn.copy(this),t);let n=jn.r,r=jn.g,i=jn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Nt.workingColorSpace){return Nt.workingToColorSpace(jn.copy(this),t),e.r=jn.r,e.g=jn.g,e.b=jn.b,e}getStyle(e=Ze){Nt.workingToColorSpace(jn.copy(this),e);let t=jn.r,n=jn.g,r=jn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(On),this.setHSL(On.h+e,On.s+t,On.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(On),e.getHSL(kn);let n=St(On.h,kn.h,t),r=St(On.s,kn.s,t),i=St(On.l,kn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},jn=new R;R.NAMES=Dn;var Mn=class extends Cn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new on,this.environmentIntensity=1,this.environmentRotation=new on,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Nn=new I,Pn=new I,Fn=new I,In=new I,Ln=new I,Rn=new I,zn=new I,Bn=new I,Vn=new I,Hn=new I,Un=new Wt,Wn=new Wt,Gn=new Wt,Kn=class e{constructor(e=new I,t=new I,n=new I){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Nn.subVectors(e,t),r.cross(Nn);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Nn.subVectors(r,t),Pn.subVectors(n,t),Fn.subVectors(e,t);let a=Nn.dot(Nn),o=Nn.dot(Pn),s=Nn.dot(Fn),c=Pn.dot(Pn),l=Pn.dot(Fn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,In)!==null&&In.x>=0&&In.y>=0&&In.x+In.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,In)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,In.x),s.addScaledVector(a,In.y),s.addScaledVector(o,In.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Un.setScalar(0),Wn.setScalar(0),Gn.setScalar(0),Un.fromBufferAttribute(e,t),Wn.fromBufferAttribute(e,n),Gn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Un,i.x),a.addScaledVector(Wn,i.y),a.addScaledVector(Gn,i.z),a}static isFrontFacing(e,t,n,r){return Nn.subVectors(n,t),Pn.subVectors(e,t),Nn.cross(Pn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Nn.subVectors(this.c,this.b),Pn.subVectors(this.a,this.b),Nn.cross(Pn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Ln.subVectors(r,n),Rn.subVectors(i,n),Bn.subVectors(e,n);let s=Ln.dot(Bn),c=Rn.dot(Bn);if(s<=0&&c<=0)return t.copy(n);Vn.subVectors(e,r);let l=Ln.dot(Vn),u=Rn.dot(Vn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Ln,a);Hn.subVectors(e,i);let f=Ln.dot(Hn),p=Rn.dot(Hn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Rn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return zn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(zn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Ln,a).addScaledVector(Rn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},qn=class{constructor(e=new I(1/0,1/0,1/0),t=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Yn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Yn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Yn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Yn):Yn.fromBufferAttribute(r,t),Yn.applyMatrix4(e.matrixWorld),this.expandByPoint(Yn);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),Xn.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),Xn.copy(e.boundingBox)),Xn.applyMatrix4(e.matrixWorld),this.union(Xn)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Yn),Yn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(rr),ir.subVectors(this.max,rr),Zn.subVectors(e.a,rr),Qn.subVectors(e.b,rr),$n.subVectors(e.c,rr),er.subVectors(Qn,Zn),tr.subVectors($n,Qn),nr.subVectors(Zn,$n);let t=[0,-er.z,er.y,0,-tr.z,tr.y,0,-nr.z,nr.y,er.z,0,-er.x,tr.z,0,-tr.x,nr.z,0,-nr.x,-er.y,er.x,0,-tr.y,tr.x,0,-nr.y,nr.x,0];return!sr(t,Zn,Qn,$n,ir)||(t=[1,0,0,0,1,0,0,0,1],!sr(t,Zn,Qn,$n,ir))?!1:(ar.crossVectors(er,tr),t=[ar.x,ar.y,ar.z],sr(t,Zn,Qn,$n,ir))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Yn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Yn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Jn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Jn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Jn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Jn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Jn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Jn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Jn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Jn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Jn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Jn=[new I,new I,new I,new I,new I,new I,new I,new I],Yn=new I,Xn=new qn,Zn=new I,Qn=new I,$n=new I,er=new I,tr=new I,nr=new I,rr=new I,ir=new I,ar=new I,or=new I;function sr(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){or.fromArray(e,a);let o=i.x*Math.abs(or.x)+i.y*Math.abs(or.y)+i.z*Math.abs(or.z),s=t.dot(or),c=n.dot(or),l=r.dot(or);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var cr=new I,lr=new Tt,ur=0,dr=class extends ht{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ur++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=nt,this.updateRanges=[],this.gpuType=w,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)lr.fromBufferAttribute(this,t),lr.applyMatrix3(e),this.setXY(t,lr.x,lr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)cr.fromBufferAttribute(this,t),cr.applyMatrix3(e),this.setXYZ(t,cr.x,cr.y,cr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)cr.fromBufferAttribute(this,t),cr.applyMatrix4(e),this.setXYZ(t,cr.x,cr.y,cr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)cr.fromBufferAttribute(this,t),cr.applyNormalMatrix(e),this.setXYZ(t,cr.x,cr.y,cr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)cr.fromBufferAttribute(this,t),cr.transformDirection(e),this.setXYZ(t,cr.x,cr.y,cr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ct(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=wt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ct(t,this.array)),t}setX(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ct(t,this.array)),t}setY(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ct(t,this.array)),t}setZ(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ct(t,this.array)),t}setW(e,t){return this.normalized&&(t=wt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array),r=wt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array),r=wt(r,this.array),i=wt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:`dispose`})}},fr=class extends dr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},pr=class extends dr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},mr=class extends dr{constructor(e,t,n){super(new Float32Array(e),t,n)}},hr=new qn,gr=new I,_r=new I,vr=class{constructor(e=new I,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?hr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;gr.subVectors(e,this.center);let t=gr.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(gr,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(_r.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(gr.copy(e.center).add(_r)),this.expandByPoint(gr.copy(e.center).sub(_r))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},yr=0,br=new Yt,xr=new Cn,Sr=new I,Cr=new qn,wr=new qn,Tr=new I,Er=class e extends ht{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:yr++}),this.uuid=yt(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(at(e)?pr:fr)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new L().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return br.makeRotationFromQuaternion(e),this.applyMatrix4(br),this}rotateX(e){return br.makeRotationX(e),this.applyMatrix4(br),this}rotateY(e){return br.makeRotationY(e),this.applyMatrix4(br),this}rotateZ(e){return br.makeRotationZ(e),this.applyMatrix4(br),this}translate(e,t,n){return br.makeTranslation(e,t,n),this.applyMatrix4(br),this}scale(e,t,n){return br.makeScale(e,t,n),this.applyMatrix4(br),this}lookAt(e){return xr.lookAt(e),xr.updateMatrix(),this.applyMatrix4(xr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Sr).negate(),this.translate(Sr.x,Sr.y,Sr.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new mr(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&P(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new qn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){F(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Cr.setFromBufferAttribute(n),this.morphTargetsRelative?(Tr.addVectors(this.boundingBox.min,Cr.min),this.boundingBox.expandByPoint(Tr),Tr.addVectors(this.boundingBox.max,Cr.max),this.boundingBox.expandByPoint(Tr)):(this.boundingBox.expandByPoint(Cr.min),this.boundingBox.expandByPoint(Cr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&F(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new vr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){F(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new I,1/0);return}if(e){let n=this.boundingSphere.center;if(Cr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];wr.setFromBufferAttribute(n),this.morphTargetsRelative?(Tr.addVectors(Cr.min,wr.min),Cr.expandByPoint(Tr),Tr.addVectors(Cr.max,wr.max),Cr.expandByPoint(Tr)):(Cr.expandByPoint(wr.min),Cr.expandByPoint(wr.max))}Cr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Tr.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Tr));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Tr.fromBufferAttribute(a,t),o&&(Sr.fromBufferAttribute(e,t),Tr.add(Sr)),r=Math.max(r,n.distanceToSquared(Tr))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&F(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){F(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new dr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new I,s[e]=new I;let c=new I,l=new I,u=new I,d=new Tt,f=new Tt,p=new Tt,m=new I,h=new I;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new I,y=new I,b=new I,x=new I;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new dr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new I,i=new I,a=new I,o=new I,s=new I,c=new I,l=new I,u=new I;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Tr.fromBufferAttribute(e,t),Tr.normalize(),e.setXYZ(t,Tr.x,Tr.y,Tr.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new dr(a,r,i)}if(this.index===null)return P(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Dr=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=nt,this.updateRanges=[],this.version=0,this.uuid=yt()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=yt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=yt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Or=new I,kr=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Or.fromBufferAttribute(this,t),Or.applyMatrix4(e),this.setXYZ(t,Or.x,Or.y,Or.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Or.fromBufferAttribute(this,t),Or.applyNormalMatrix(e),this.setXYZ(t,Or.x,Or.y,Or.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Or.fromBufferAttribute(this,t),Or.transformDirection(e),this.setXYZ(t,Or.x,Or.y,Or.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Ct(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=wt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=wt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=wt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=wt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=wt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ct(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ct(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ct(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ct(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array),r=wt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=wt(t,this.array),n=wt(n,this.array),r=wt(r,this.array),i=wt(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){ut(`InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new dr(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){ut(`InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Ar=0,jr=class extends ht{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ar++}),this.uuid=yt(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new R(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=tt,this.stencilZFail=tt,this.stencilZPass=tt,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){P(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){P(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new R().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new Tt().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Tt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Mr=class extends jr{constructor(e){super(),this.isSpriteMaterial=!0,this.type=`SpriteMaterial`,this.color=new R(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Nr,Pr=new I,Fr=new I,Ir=new I,Lr=new Tt,Rr=new Tt,zr=new Yt,Br=new I,Vr=new I,Hr=new I,Ur=new Tt,Wr=new Tt,Gr=new Tt,Kr=class extends Cn{constructor(e=new Mr){if(super(),this.isSprite=!0,this.type=`Sprite`,Nr===void 0){Nr=new Er;let e=new Dr(new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),5);Nr.setIndex([0,1,2,0,2,3]),Nr.setAttribute(`position`,new kr(e,3,0,!1)),Nr.setAttribute(`uv`,new kr(e,2,3,!1))}this.geometry=Nr,this.material=e,this.center=new Tt(.5,.5),this.count=1}raycast(e,t){e.camera===null&&F(`Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.`),Fr.setFromMatrixScale(this.matrixWorld),zr.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Ir.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Fr.multiplyScalar(-Ir.z);let n=this.material.rotation,r,i;n!==0&&(i=Math.cos(n),r=Math.sin(n));let a=this.center;qr(Br.set(-.5,-.5,0),Ir,a,Fr,r,i),qr(Vr.set(.5,-.5,0),Ir,a,Fr,r,i),qr(Hr.set(.5,.5,0),Ir,a,Fr,r,i),Ur.set(0,0),Wr.set(1,0),Gr.set(1,1);let o=e.ray.intersectTriangle(Br,Vr,Hr,!1,Pr);if(o===null&&(qr(Vr.set(-.5,.5,0),Ir,a,Fr,r,i),Wr.set(0,1),o=e.ray.intersectTriangle(Br,Hr,Vr,!1,Pr),o===null))return;let s=e.ray.origin.distanceTo(Pr);s<e.near||s>e.far||t.push({distance:s,point:Pr.clone(),uv:Kn.getInterpolation(Pr,Br,Vr,Hr,Ur,Wr,Gr,new Tt),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function qr(e,t,n,r,i,a){Lr.subVectors(e,n).addScalar(.5).multiply(r),i===void 0?Rr.copy(Lr):(Rr.x=a*Lr.x-i*Lr.y,Rr.y=i*Lr.x+a*Lr.y),e.copy(t),e.x+=Rr.x,e.y+=Rr.y,e.applyMatrix4(zr)}var Jr=new I,Yr=new I,Xr=new I,Zr=new I,Qr=new I,$r=new I,ei=new I,ti=class{constructor(e=new I,t=new I(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Jr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Jr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Jr.copy(this.origin).addScaledVector(this.direction,t),Jr.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Yr.copy(e).add(t).multiplyScalar(.5),Xr.copy(t).sub(e).normalize(),Zr.copy(this.origin).sub(Yr);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Xr),o=Zr.dot(this.direction),s=-Zr.dot(Xr),c=Zr.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Yr).addScaledVector(Xr,d),f}intersectSphere(e,t){Jr.subVectors(e.center,this.origin);let n=Jr.dot(this.direction),r=Jr.dot(Jr)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Jr)!==null}intersectTriangle(e,t,n,r,i){Qr.subVectors(t,e),$r.subVectors(n,e),ei.crossVectors(Qr,$r);let a=this.direction.dot(ei),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Zr.subVectors(this.origin,e);let s=o*this.direction.dot($r.crossVectors(Zr,$r));if(s<0)return null;let c=o*this.direction.dot(Qr.cross(Zr));if(c<0||s+c>a)return null;let l=-o*Zr.dot(ei);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ni=class extends jr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new R(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new on,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},ri=new Yt,ii=new ti,ai=new vr,oi=new I,si=new I,ci=new I,li=new I,ui=new I,di=new I,fi=new I,pi=new I,mi=class extends Cn{constructor(e=new Er,t=new ni){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){di.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(ui.fromBufferAttribute(s,e),a?di.addScaledVector(ui,r):di.addScaledVector(ui.sub(t),r))}t.add(di)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ai.copy(n.boundingSphere),ai.applyMatrix4(i),ii.copy(e.ray).recast(e.near),!(ai.containsPoint(ii.origin)===!1&&(ii.intersectSphere(ai,oi)===null||ii.origin.distanceToSquared(oi)>(e.far-e.near)**2))&&(ri.copy(i).invert(),ii.copy(e.ray).applyMatrix4(ri),(n.boundingBox===null||ii.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,ii)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=gi(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=gi(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=gi(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=gi(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function hi(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;pi.copy(s),pi.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(pi);return l<n.near||l>n.far?null:{distance:l,point:pi.clone(),object:e}}function gi(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,si),e.getVertexPosition(c,ci),e.getVertexPosition(l,li);let u=hi(e,t,n,r,si,ci,li,fi);if(u){let e=new I;Kn.getBarycoord(fi,si,ci,li,e),i&&(u.uv=Kn.getInterpolatedAttribute(i,s,c,l,e,new Tt)),a&&(u.uv1=Kn.getInterpolatedAttribute(a,s,c,l,e,new Tt)),o&&(u.normal=Kn.getInterpolatedAttribute(o,s,c,l,e,new I),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new I,materialIndex:0};Kn.getNormal(si,ci,li,t.normal),u.face=t,u.barycoord=e}return u}var _i=class extends Ut{constructor(e=null,t=1,n=1,r,i,a,o,s,c=f,l=f,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},vi=class extends dr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},yi=new Yt,bi=new Yt,xi=[],Si=new qn,Ci=new Yt,wi=new mi,Ti=new vr,Ei=class extends mi{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new vi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,Ci)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new qn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,yi),Si.copy(e.boundingBox).applyMatrix4(yi),this.boundingBox.union(Si)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new vr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,yi),Ti.copy(e.boundingSphere).applyMatrix4(yi),this.boundingSphere.union(Ti)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(wi.geometry=this.geometry,wi.material=this.material,wi.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ti.copy(this.boundingSphere),Ti.applyMatrix4(n),e.ray.intersectsSphere(Ti)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,yi),bi.multiplyMatrices(n,yi),wi.matrixWorld=bi,wi.raycast(e,xi);for(let e=0,n=xi.length;e<n;e++){let n=xi[e];n.instanceId=i,n.object=this,t.push(n)}xi.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new vi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new _i(new Float32Array(r*this.count),r,this.count,ae,w));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Di=new I,Oi=new I,ki=new L,Ai=class{constructor(e=new I(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Di.subVectors(n,t).cross(Oi.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Di),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||ki.getNormalMatrix(e),r=this.coplanarPoint(Di).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},ji=new vr,Mi=new Tt(.5,.5),Ni=new I,Pi=class{constructor(e=new Ai,t=new Ai,n=new Ai,r=new Ai,i=new Ai,a=new Ai){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=it,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ji.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ji.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ji)}intersectsSprite(e){return ji.center.set(0,0,0),ji.radius=.7071067811865476+Mi.distanceTo(e.center),ji.applyMatrix4(e.matrixWorld),this.intersectsSphere(ji)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Ni.x=r.normal.x>0?e.max.x:e.min.x,Ni.y=r.normal.y>0?e.max.y:e.min.y,Ni.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Ni)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Fi=class extends jr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new R(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ii=new I,Li=new I,Ri=new Yt,zi=new ti,Bi=new vr,Vi=new I,Hi=new I,Ui=class extends Cn{constructor(e=new Er,t=new Fi){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Ii.fromBufferAttribute(t,e-1),Li.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Ii.distanceTo(Li);e.setAttribute(`lineDistance`,new mr(n,1))}else P(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Bi.copy(n.boundingSphere),Bi.applyMatrix4(r),Bi.radius+=i,e.ray.intersectsSphere(Bi)===!1)return;Ri.copy(r).invert(),zi.copy(e.ray).applyMatrix4(Ri);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=Wi(this,e,zi,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=Wi(this,e,zi,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=Wi(this,e,zi,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=Wi(this,e,zi,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Wi(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Ii.fromBufferAttribute(s,i),Li.fromBufferAttribute(s,a),n.distanceSqToSegment(Ii,Li,Vi,Hi)>r)return;Vi.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Vi);if(!(c<t.near||c>t.far))return{distance:c,point:Hi.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var Gi=new I,Ki=new I,qi=class extends Ui{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)Gi.fromBufferAttribute(t,e),Ki.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+Gi.distanceTo(Ki);e.setAttribute(`lineDistance`,new mr(n,1))}else P(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},Ji=class extends jr{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new R(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Yi=new Yt,Xi=new ti,Zi=new vr,Qi=new I,$i=class extends Cn{constructor(e=new Er,t=new Ji){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Zi.copy(n.boundingSphere),Zi.applyMatrix4(r),Zi.radius+=i,e.ray.intersectsSphere(Zi)===!1)return;Yi.copy(r).invert(),Xi.copy(e.ray).applyMatrix4(Yi);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Qi.fromBufferAttribute(l,n),ea(Qi,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Qi.fromBufferAttribute(l,a),ea(Qi,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function ea(e,t,n,r,i,a,o){let s=Xi.distanceSqToPoint(e);if(s<n){let n=new I;Xi.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ta=class extends Ut{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},na=class extends Ut{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},ra=class extends Ut{constructor(e,t,n=C,r,i,a,o=f,s=f,c,l=re,u=1){if(l!==1026&&l!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new zt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},ia=class extends ra{constructor(e,t=C,n=301,r,i,a=f,o=f,s,c=re){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},aa=class extends Ut{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},oa=class e extends Er{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new mr(c,3)),this.setAttribute(`normal`,new mr(l,3)),this.setAttribute(`uv`,new mr(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new I;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},sa=class e extends Er{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new mr(p,3)),this.setAttribute(`normal`,new mr(m,3)),this.setAttribute(`uv`,new mr(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},ca=class e extends Er{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new I,d=new I,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new mr(p,3)),this.setAttribute(`normal`,new mr(m,3)),this.setAttribute(`uv`,new mr(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function la(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(da(i))i.isRenderTargetTexture?(P(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(da(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function ua(e){let t={};for(let n=0;n<e.length;n++){let r=la(e[n]);for(let e in r)t[e]=r[e]}return t}function da(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function fa(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function pa(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Nt.workingColorSpace}var ma={clone:la,merge:ua},ha=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ga=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,_a=class extends jr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=ha,this.fragmentShader=ga,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=la(e.uniforms),this.uniformsGroups=fa(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new R().setHex(r.value);break;case`v2`:this.uniforms[n].value=new Tt().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new I().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Wt().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new L().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new Yt().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},va=class extends _a{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},ya=class extends jr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Xe,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ba=class extends jr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function xa(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}var Sa=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},Ca=class extends Sa{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:qe,endingEnd:qe}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Je:i=e,o=2*t-n;break;case Ye:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Je:a=e,s=2*n-t;break;case Ye:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},wa=class extends Sa{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},Ta=class extends Sa{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Ea=class extends Sa{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[p]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},Da=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=xa(t,this.TimeBufferType),this.values=xa(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:xa(e.times,Array),values:xa(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Ta(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new wa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Ca(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Ea(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Ue:t=this.InterpolantFactoryMethodDiscrete;break;case We:t=this.InterpolantFactoryMethodLinear;break;case Ge:t=this.InterpolantFactoryMethodSmooth;break;case Ke:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return P(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ue;case this.InterpolantFactoryMethodLinear:return We;case this.InterpolantFactoryMethodSmooth:return Ge;case this.InterpolantFactoryMethodBezier:return Ke}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(F(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(F(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){F(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){F(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&ot(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){F(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Ge,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};Da.prototype.ValueTypeName=``,Da.prototype.TimeBufferType=Float32Array,Da.prototype.ValueBufferType=Float32Array,Da.prototype.DefaultInterpolation=We;var Oa=class extends Da{constructor(e,t,n){super(e,t,n)}};Oa.prototype.ValueTypeName=`bool`,Oa.prototype.ValueBufferType=Array,Oa.prototype.DefaultInterpolation=Ue,Oa.prototype.InterpolantFactoryMethodLinear=void 0,Oa.prototype.InterpolantFactoryMethodSmooth=void 0;var ka=class extends Da{constructor(e,t,n,r){super(e,t,n,r)}};ka.prototype.ValueTypeName=`color`;var Aa=class extends Da{constructor(e,t,n,r){super(e,t,n,r)}};Aa.prototype.ValueTypeName=`number`;var ja=class extends Sa{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Et.slerpFlat(i,0,a,c-o,a,c,s);return i}},Ma=class extends Da{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new ja(this.times,this.values,this.getValueSize(),e)}};Ma.prototype.ValueTypeName=`quaternion`,Ma.prototype.InterpolantFactoryMethodSmooth=void 0;var Na=class extends Da{constructor(e,t,n){super(e,t,n)}};Na.prototype.ValueTypeName=`string`,Na.prototype.ValueBufferType=Array,Na.prototype.DefaultInterpolation=Ue,Na.prototype.InterpolantFactoryMethodLinear=void 0,Na.prototype.InterpolantFactoryMethodSmooth=void 0;var Pa=class extends Da{constructor(e,t,n,r){super(e,t,n,r)}};Pa.prototype.ValueTypeName=`vector`;var Fa=new I,Ia=new Et,La=new I,Ra=class extends Cn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Yt,this.projectionMatrix=new Yt,this.projectionMatrixInverse=new Yt,this.coordinateSystem=it,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Fa,Ia,La),La.x===1&&La.y===1&&La.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fa,Ia,La.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Fa,Ia,La),La.x===1&&La.y===1&&La.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fa,Ia,La.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},za=new I,Ba=new Tt,Va=new Tt,Ha=class extends Ra{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=vt*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(_t*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return vt*2*Math.atan(Math.tan(_t*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){za.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(za.x,za.y).multiplyScalar(-e/za.z),za.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(za.x,za.y).multiplyScalar(-e/za.z)}getViewSize(e,t){return this.getViewBounds(e,Ba,Va),t.subVectors(Va,Ba)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(_t*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Ua=class extends Ra{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Wa=-90,Ga=1,Ka=class extends Cn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ha(Wa,Ga,e,t);r.layers=this.layers,this.add(r);let i=new Ha(Wa,Ga,e,t);i.layers=this.layers,this.add(i);let a=new Ha(Wa,Ga,e,t);a.layers=this.layers,this.add(a);let o=new Ha(Wa,Ga,e,t);o.layers=this.layers,this.add(o);let s=new Ha(Wa,Ga,e,t);s.layers=this.layers,this.add(s);let c=new Ha(Wa,Ga,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},qa=class extends Ha{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Ja=`\\[\\]\\.:\\/`,Ya=RegExp(`[\\[\\]\\.:\\/]`,`g`),Xa=`[^\\[\\]\\.:\\/]`,Za=`[^`+Ja.replace(`\\.`,``)+`]`,Qa=`((?:WC+[\\/:])*)`.replace(`WC`,Xa),$a=`(WCOD+)?`.replace(`WCOD`,Za),eo=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Xa),to=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Xa),no=RegExp(`^`+Qa+$a+eo+to+`$`),ro=[`material`,`materials`,`bones`,`map`],io=class{constructor(e,t,n){let r=n||ao.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ao=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Ya,``)}static parseTrackName(e){let t=no.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);ro.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){P(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){F(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){F(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){F(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){F(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){F(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){F(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){F(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;F(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){F(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){F(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ao.Composite=io,ao.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},ao.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},ao.prototype.GetterByBindingType=[ao.prototype._getValue_direct,ao.prototype._getValue_array,ao.prototype._getValue_arrayElement,ao.prototype._getValue_toArray],ao.prototype.SetterByBindingTypeAndVersioning=[[ao.prototype._setValue_direct,ao.prototype._setValue_direct_setNeedsUpdate,ao.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ao.prototype._setValue_array,ao.prototype._setValue_array_setNeedsUpdate,ao.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ao.prototype._setValue_arrayElement,ao.prototype._setValue_arrayElement_setNeedsUpdate,ao.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ao.prototype._setValue_fromArray,ao.prototype._setValue_fromArray_setNeedsUpdate,ao.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],a=class{constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}},a.prototype.isMatrix2=!0;function oo(e,t,n,r){let i=so(r);switch(n){case te:return e*t;case ae:return e*t/i.components*i.byteLength;case oe:return e*t/i.components*i.byteLength;case se:return e*t*2/i.components*i.byteLength;case ce:return e*t*2/i.components*i.byteLength;case ne:return e*t*3/i.components*i.byteLength;case A:return e*t*4/i.components*i.byteLength;case le:return e*t*4/i.components*i.byteLength;case ue:case de:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case fe:case pe:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case he:case _e:return Math.max(e,16)*Math.max(t,8)/4;case me:case ge:return Math.max(e,8)*Math.max(t,8)/2;case ve:case ye:case xe:case Se:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case be:case Ce:case we:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Te:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Ee:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case De:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Oe:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case ke:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case Ae:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case je:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Me:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Ne:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Pe:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Fe:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Ie:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Le:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case j:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Re:case ze:case Be:return Math.ceil(e/4)*Math.ceil(t/4)*16;case M:case Ve:return Math.ceil(e/4)*Math.ceil(t/4)*8;case N:case He:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function so(e){switch(e){case v:case y:return{byteLength:1,components:1};case x:case b:case T:return{byteLength:2,components:1};case E:case D:return{byteLength:2,components:4};case C:case S:case w:return{byteLength:4,components:1};case O:case k:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`185`}})),typeof window<`u`&&(window.__THREE__?P(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`185`);function co(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function lo(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var uo={alphahash_fragment:`#ifdef USE_ALPHAHASH
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
}`},z={common:{diffuse:{value:new R(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new L},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new L}},envmap:{envMap:{value:null},envMapRotation:{value:new L},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new L}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new L}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new L},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new L},normalScale:{value:new Tt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new L},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new L}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new L}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new L}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new R(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new I},probesMax:{value:new I},probesResolution:{value:new I}},points:{diffuse:{value:new R(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0},uvTransform:{value:new L}},sprite:{diffuse:{value:new R(16777215)},opacity:{value:1},center:{value:new Tt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new L},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0}}},fo={basic:{uniforms:ua([z.common,z.specularmap,z.envmap,z.aomap,z.lightmap,z.fog]),vertexShader:uo.meshbasic_vert,fragmentShader:uo.meshbasic_frag},lambert:{uniforms:ua([z.common,z.specularmap,z.envmap,z.aomap,z.lightmap,z.emissivemap,z.bumpmap,z.normalmap,z.displacementmap,z.fog,z.lights,{emissive:{value:new R(0)},envMapIntensity:{value:1}}]),vertexShader:uo.meshlambert_vert,fragmentShader:uo.meshlambert_frag},phong:{uniforms:ua([z.common,z.specularmap,z.envmap,z.aomap,z.lightmap,z.emissivemap,z.bumpmap,z.normalmap,z.displacementmap,z.fog,z.lights,{emissive:{value:new R(0)},specular:{value:new R(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:uo.meshphong_vert,fragmentShader:uo.meshphong_frag},standard:{uniforms:ua([z.common,z.envmap,z.aomap,z.lightmap,z.emissivemap,z.bumpmap,z.normalmap,z.displacementmap,z.roughnessmap,z.metalnessmap,z.fog,z.lights,{emissive:{value:new R(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:uo.meshphysical_vert,fragmentShader:uo.meshphysical_frag},toon:{uniforms:ua([z.common,z.aomap,z.lightmap,z.emissivemap,z.bumpmap,z.normalmap,z.displacementmap,z.gradientmap,z.fog,z.lights,{emissive:{value:new R(0)}}]),vertexShader:uo.meshtoon_vert,fragmentShader:uo.meshtoon_frag},matcap:{uniforms:ua([z.common,z.bumpmap,z.normalmap,z.displacementmap,z.fog,{matcap:{value:null}}]),vertexShader:uo.meshmatcap_vert,fragmentShader:uo.meshmatcap_frag},points:{uniforms:ua([z.points,z.fog]),vertexShader:uo.points_vert,fragmentShader:uo.points_frag},dashed:{uniforms:ua([z.common,z.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:uo.linedashed_vert,fragmentShader:uo.linedashed_frag},depth:{uniforms:ua([z.common,z.displacementmap]),vertexShader:uo.depth_vert,fragmentShader:uo.depth_frag},normal:{uniforms:ua([z.common,z.bumpmap,z.normalmap,z.displacementmap,{opacity:{value:1}}]),vertexShader:uo.meshnormal_vert,fragmentShader:uo.meshnormal_frag},sprite:{uniforms:ua([z.sprite,z.fog]),vertexShader:uo.sprite_vert,fragmentShader:uo.sprite_frag},background:{uniforms:{uvTransform:{value:new L},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:uo.background_vert,fragmentShader:uo.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new L}},vertexShader:uo.backgroundCube_vert,fragmentShader:uo.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:uo.cube_vert,fragmentShader:uo.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:uo.equirect_vert,fragmentShader:uo.equirect_frag},distance:{uniforms:ua([z.common,z.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:uo.distance_vert,fragmentShader:uo.distance_frag},shadow:{uniforms:ua([z.lights,z.fog,{color:{value:new R(0)},opacity:{value:1}}]),vertexShader:uo.shadow_vert,fragmentShader:uo.shadow_frag}};fo.physical={uniforms:ua([fo.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new L},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new L},clearcoatNormalScale:{value:new Tt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new L},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new L},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new L},sheen:{value:0},sheenColor:{value:new R(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new L},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new L},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new L},transmissionSamplerSize:{value:new Tt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new L},attenuationDistance:{value:0},attenuationColor:{value:new R(0)},specularColor:{value:new R(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new L},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new L},anisotropyVector:{value:new Tt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new L}}]),vertexShader:uo.meshphysical_vert,fragmentShader:uo.meshphysical_frag};var po={r:0,b:0,g:0},mo=new Yt,ho=new L;ho.set(-1,0,0,0,1,0,0,0,1);function go(e,t,n,r,i,a){let o=new R(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new mi(new oa(1,1,1),new _a({name:`BackgroundCubeMaterial`,uniforms:la(fo.backgroundCube.uniforms),vertexShader:fo.backgroundCube.vertexShader,fragmentShader:fo.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(mo.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(ho),l.material.toneMapped=Nt.getTransfer(i.colorSpace)!==et,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new mi(new sa(2,2),new _a({name:`BackgroundMaterial`,uniforms:la(fo.background.uniforms),vertexShader:fo.background.vertexShader,fragmentShader:fo.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Nt.getTransfer(i.colorSpace)!==et,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(po,pa(e)),n.buffers.color.setClear(po.r,po.g,po.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function _o(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function vo(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function yo(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(P(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&P(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function bo(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Ai,s=new L,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var xo=4,So=[.125,.215,.35,.446,.526,.582],Co=20,wo=256,To=new Ua,Eo=new R,Do=null,Oo=0,ko=0,Ao=!1,jo=new I,Mo=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=jo}=i;Do=this._renderer.getRenderTarget(),Oo=this._renderer.getActiveCubeFace(),ko=this._renderer.getActiveMipmapLevel(),Ao=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=zo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ro(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Do,Oo,ko),this._renderer.xr.enabled=Ao,e.scissorTest=!1,Fo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Do=this._renderer.getRenderTarget(),Oo=this._renderer.getActiveCubeFace(),ko=this._renderer.getActiveMipmapLevel(),Ao=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:h,minFilter:h,generateMipmaps:!1,type:T,format:A,colorSpace:Qe,depthBuffer:!1},r=Po(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Po(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=No(r)),this._blurMaterial=Lo(r,e,t),this._ggxMaterial=Io(r,e,t)}return r}_compileMaterial(e){let t=new mi(new Er,e);this._renderer.compile(t,To)}_sceneToCubeUV(e,t,n,r,i){let a=new Ha(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(Eo),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new mi(new oa,new ni({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(Eo),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Fo(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=zo()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ro());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Fo(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,To)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-xo?n-d+xo:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Fo(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,To),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Fo(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,To)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&F(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):Co;m>Co&&P(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Co}`);let h=[],g=0;for(let e=0;e<Co;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];Fo(t,3*v*(r>_-xo?r-_+xo:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,To)}};function No(e){let t=[],n=[],r=[],i=e,a=e-xo+1+So.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-xo?s=So[o-e+xo-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new Er;h.setAttribute(`position`,new dr(f,3)),h.setAttribute(`uv`,new dr(p,2)),h.setAttribute(`faceIndex`,new dr(m,1)),r.push(new mi(h,null)),i>xo&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function Po(e,t,n){let r=new Kt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Fo(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Io(e,t,n){return new _a({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:wo,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Bo(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function Lo(e,t,n){let r=new Float32Array(Co),i=new I(0,1,0);return new _a({name:`SphericalGaussianBlur`,defines:{n:Co,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Bo(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ro(){return new _a({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Bo(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function zo(){return new _a({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Bo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Bo(){return`

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
	`}var Vo=class extends Kt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new ta(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new oa(5,5,5),i=new _a({name:`CubemapFromEquirect`,uniforms:la(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new mi(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=h),new Ka(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Ho(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Vo(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Mo(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Mo(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Uo(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&ft(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Wo(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?pr:fr)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Go(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Ko(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:F(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function qo(e,t,n){let r=new WeakMap,i=new Wt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new qt(h,p,m,u);g.type=w,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new Tt(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Jo(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Yo={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Xo(e,t,n,r,i,a){let o=new Kt(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new ra(t,n):void 0}),s=new Kt(t,n,{type:T,depthBuffer:!1,stencilBuffer:!1}),c=new Er;c.setAttribute(`position`,new mr([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new mr([0,2,0,0,2,0],2));let l=new va({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new mi(c,l),d=new Ua(-1,1,1,-1,0,1),f=null,p=null,m=!1,h,g=null,_=[],v=!1;this.setSize=function(e,t){o.setSize(e,t),s.setSize(e,t);for(let n=0;n<_.length;n++){let r=_[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){_=e,v=_.length>0&&_[0].isRenderPass===!0;let t=o.width,n=o.height;for(let e=0;e<_.length;e++){let r=_[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(m||e.toneMapping===0&&_.length===0)return!1;if(g=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return v===!1&&e.setRenderTarget(o),h=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return v},this.end=function(e,t){e.toneMapping=h,m=!0;let n=o,r=s;for(let i=0;i<_.length;i++){let a=_[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(f!==e.outputColorSpace||p!==e.toneMapping){f=e.outputColorSpace,p=e.toneMapping,l.defines={},Nt.getTransfer(f)===`srgb`&&(l.defines.SRGB_TRANSFER=``);let t=Yo[p];t&&(l.defines[t]=``),l.needsUpdate=!0}l.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(g),e.render(u,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),s.dispose(),c.dispose(),l.dispose()}}var Zo=new Ut,Qo=new ra(1,1),$o=new qt,es=new Jt,ts=new ta,ns=[],rs=[],is=new Float32Array(16),as=new Float32Array(9),os=new Float32Array(4);function ss(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=ns[i];if(a===void 0&&(a=new Float32Array(i),ns[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function cs(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function ls(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function us(e,t){let n=rs[t];n===void 0&&(n=new Int32Array(t),rs[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function ds(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function fs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(cs(n,t))return;e.uniform2fv(this.addr,t),ls(n,t)}}function ps(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(cs(n,t))return;e.uniform3fv(this.addr,t),ls(n,t)}}function ms(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(cs(n,t))return;e.uniform4fv(this.addr,t),ls(n,t)}}function hs(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(cs(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),ls(n,t)}else{if(cs(n,r))return;os.set(r),e.uniformMatrix2fv(this.addr,!1,os),ls(n,r)}}function gs(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(cs(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),ls(n,t)}else{if(cs(n,r))return;as.set(r),e.uniformMatrix3fv(this.addr,!1,as),ls(n,r)}}function _s(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(cs(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),ls(n,t)}else{if(cs(n,r))return;is.set(r),e.uniformMatrix4fv(this.addr,!1,is),ls(n,r)}}function vs(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function ys(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(cs(n,t))return;e.uniform2iv(this.addr,t),ls(n,t)}}function bs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(cs(n,t))return;e.uniform3iv(this.addr,t),ls(n,t)}}function xs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(cs(n,t))return;e.uniform4iv(this.addr,t),ls(n,t)}}function Ss(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Cs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(cs(n,t))return;e.uniform2uiv(this.addr,t),ls(n,t)}}function ws(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(cs(n,t))return;e.uniform3uiv(this.addr,t),ls(n,t)}}function Ts(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(cs(n,t))return;e.uniform4uiv(this.addr,t),ls(n,t)}}function Es(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Qo.compareFunction=n.isReversedDepthBuffer()?518:515,a=Qo):a=Zo,n.setTexture2D(t||a,i)}function Ds(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||es,i)}function Os(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||ts,i)}function ks(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||$o,i)}function As(e){switch(e){case 5126:return ds;case 35664:return fs;case 35665:return ps;case 35666:return ms;case 35674:return hs;case 35675:return gs;case 35676:return _s;case 5124:case 35670:return vs;case 35667:case 35671:return ys;case 35668:case 35672:return bs;case 35669:case 35673:return xs;case 5125:return Ss;case 36294:return Cs;case 36295:return ws;case 36296:return Ts;case 35678:case 36198:case 36298:case 36306:case 35682:return Es;case 35679:case 36299:case 36307:return Ds;case 35680:case 36300:case 36308:case 36293:return Os;case 36289:case 36303:case 36311:case 36292:return ks}}function js(e,t){e.uniform1fv(this.addr,t)}function Ms(e,t){let n=ss(t,this.size,2);e.uniform2fv(this.addr,n)}function Ns(e,t){let n=ss(t,this.size,3);e.uniform3fv(this.addr,n)}function Ps(e,t){let n=ss(t,this.size,4);e.uniform4fv(this.addr,n)}function Fs(e,t){let n=ss(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Is(e,t){let n=ss(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Ls(e,t){let n=ss(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Rs(e,t){e.uniform1iv(this.addr,t)}function zs(e,t){e.uniform2iv(this.addr,t)}function Bs(e,t){e.uniform3iv(this.addr,t)}function Vs(e,t){e.uniform4iv(this.addr,t)}function Hs(e,t){e.uniform1uiv(this.addr,t)}function Us(e,t){e.uniform2uiv(this.addr,t)}function Ws(e,t){e.uniform3uiv(this.addr,t)}function Gs(e,t){e.uniform4uiv(this.addr,t)}function Ks(e,t,n){let r=this.cache,i=t.length,a=us(n,i);cs(r,a)||(e.uniform1iv(this.addr,a),ls(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Qo:Zo;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function qs(e,t,n){let r=this.cache,i=t.length,a=us(n,i);cs(r,a)||(e.uniform1iv(this.addr,a),ls(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||es,a[e])}function Js(e,t,n){let r=this.cache,i=t.length,a=us(n,i);cs(r,a)||(e.uniform1iv(this.addr,a),ls(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||ts,a[e])}function Ys(e,t,n){let r=this.cache,i=t.length,a=us(n,i);cs(r,a)||(e.uniform1iv(this.addr,a),ls(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||$o,a[e])}function Xs(e){switch(e){case 5126:return js;case 35664:return Ms;case 35665:return Ns;case 35666:return Ps;case 35674:return Fs;case 35675:return Is;case 35676:return Ls;case 5124:case 35670:return Rs;case 35667:case 35671:return zs;case 35668:case 35672:return Bs;case 35669:case 35673:return Vs;case 5125:return Hs;case 36294:return Us;case 36295:return Ws;case 36296:return Gs;case 35678:case 36198:case 36298:case 36306:case 35682:return Ks;case 35679:case 36299:case 36307:return qs;case 35680:case 36300:case 36308:case 36293:return Js;case 36289:case 36303:case 36311:case 36292:return Ys}}var Zs=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=As(t.type)}},Qs=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Xs(t.type)}},$s=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},ec=/(\w+)(\])?(\[|\.)?/g;function tc(e,t){e.seq.push(t),e.map[t.id]=t}function nc(e,t,n){let r=e.name,i=r.length;for(ec.lastIndex=0;;){let a=ec.exec(r),o=ec.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){tc(n,l===void 0?new Zs(s,e,t):new Qs(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new $s(s),tc(n,e)),n=e}}}var rc=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);nc(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function ic(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var ac=37297,oc=0;function sc(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var cc=new L;function lc(e){Nt._getMatrix(cc,Nt.workingColorSpace,e);let t=`mat3( ${cc.elements.map(e=>e.toFixed(4))} )`;switch(Nt.getTransfer(e)){case $e:return[t,`LinearTransferOETF`];case et:return[t,`sRGBTransferOETF`];default:return P(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function uc(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+sc(e.getShaderSource(t),r)}return i}function dc(e,t){let n=lc(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var fc={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function pc(e,t){let n=fc[t];return n===void 0?(P(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var mc=new I;function hc(){return Nt.getLuminanceCoefficients(mc),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${mc.x.toFixed(4)}, ${mc.y.toFixed(4)}, ${mc.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function gc(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(yc).join(`
`)}function _c(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function vc(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function yc(e){return e!==``}function bc(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function xc(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Sc=/^[ \t]*#include +<([\w\d./]+)>/gm;function Cc(e){return e.replace(Sc,Tc)}var wc=new Map;function Tc(e,t){let n=uo[t];if(n===void 0){let e=wc.get(t);if(e!==void 0)n=uo[e],P(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return Cc(n)}var Ec=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Dc(e){return e.replace(Ec,Oc)}function Oc(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function kc(e){let t=`precision ${e.precision} float;
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
#define LOW_PRECISION`),t}var Ac={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function jc(e){return Ac[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Mc={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Nc(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Mc[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Pc={302:`ENVMAP_MODE_REFRACTION`};function Fc(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Pc[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Ic={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Lc(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Ic[e.combine]||`ENVMAP_BLENDING_NONE`}function Rc(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function zc(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=jc(n),l=Nc(n),u=Fc(n),d=Lc(n),f=Rc(n),p=gc(n),m=_c(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(yc).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(yc).join(`
`),_.length>0&&(_+=`
`)):(g=[kc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(yc).join(`
`),_=[kc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:uo.tonemapping_pars_fragment,n.toneMapping===0?``:pc(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,uo.colorspace_pars_fragment,dc(`linearToOutputTexel`,n.outputColorSpace),hc(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(yc).join(`
`)),o=Cc(o),o=bc(o,n),o=xc(o,n),s=Cc(s),s=bc(s,n),s=xc(s,n),o=Dc(o),s=Dc(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=ic(i,i.VERTEX_SHADER,y),S=ic(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=uc(i,x,`vertex`),n=uc(i,S,`fragment`);F(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):P(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new rc(i,h),T=vc(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,ac)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=oc++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Bc=0,Vc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Hc(e),t.set(e,n)),n}},Hc=class{constructor(e){this.id=Bc++,this.code=e,this.usedTimes=0}};function Uc(e){return e===1030||e===37490||e===36285}function Wc(e,t,n,r,i,a){let o=new sn,s=new Vc,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&P(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,ee,O,k;if(C){let e=fo[C];D=e.vertexShader,ee=e.fragmentShader}else{D=i.vertexShader,ee=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,k=t.id}let te=e.getRenderTarget(),ne=e.state.buffers.depth.getReversed(),A=h.isInstancedMesh===!0,re=h.isBatchedMesh===!0,ie=!!i.map,ae=!!i.matcap,oe=!!x,se=!!i.aoMap,ce=!!i.lightMap,le=!!i.bumpMap&&i.wireframe===!1,ue=!!i.normalMap,de=!!i.displacementMap,fe=!!i.emissiveMap,pe=!!i.metalnessMap,me=!!i.roughnessMap,he=i.anisotropy>0,ge=i.clearcoat>0,_e=i.dispersion>0,ve=i.iridescence>0,ye=i.sheen>0,be=i.transmission>0,xe=he&&!!i.anisotropyMap,Se=ge&&!!i.clearcoatMap,Ce=ge&&!!i.clearcoatNormalMap,we=ge&&!!i.clearcoatRoughnessMap,Te=ve&&!!i.iridescenceMap,Ee=ve&&!!i.iridescenceThicknessMap,De=ye&&!!i.sheenColorMap,Oe=ye&&!!i.sheenRoughnessMap,ke=!!i.specularMap,Ae=!!i.specularColorMap,je=!!i.specularIntensityMap,Me=be&&!!i.transmissionMap,Ne=be&&!!i.thicknessMap,Pe=!!i.gradientMap,Fe=!!i.alphaMap,Ie=i.alphaTest>0,Le=!!i.alphaHash,j=!!i.extensions,Re=0;i.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(Re=e.toneMapping);let ze={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:ee,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:k,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:re,batchingColor:re&&h._colorsTexture!==null,instancing:A,instancingColor:A&&h.instanceColor!==null,instancingMorph:A&&h.morphTexture!==null,outputColorSpace:te===null?e.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:Nt.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:ie,matcap:ae,envMap:oe,envMapMode:oe&&x.mapping,envMapCubeUVHeight:S,aoMap:se,lightMap:ce,bumpMap:le,normalMap:ue,displacementMap:de,emissiveMap:fe,normalMapObjectSpace:ue&&i.normalMapType===1,normalMapTangentSpace:ue&&i.normalMapType===0,packedNormalMap:ue&&i.normalMapType===0&&Uc(i.normalMap.format),metalnessMap:pe,roughnessMap:me,anisotropy:he,anisotropyMap:xe,clearcoat:ge,clearcoatMap:Se,clearcoatNormalMap:Ce,clearcoatRoughnessMap:we,dispersion:_e,iridescence:ve,iridescenceMap:Te,iridescenceThicknessMap:Ee,sheen:ye,sheenColorMap:De,sheenRoughnessMap:Oe,specularMap:ke,specularColorMap:Ae,specularIntensityMap:je,transmission:be,transmissionMap:Me,thicknessMap:Ne,gradientMap:Pe,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Fe,alphaTest:Ie,alphaHash:Le,combine:i.combine,mapUv:ie&&m(i.map.channel),aoMapUv:se&&m(i.aoMap.channel),lightMapUv:ce&&m(i.lightMap.channel),bumpMapUv:le&&m(i.bumpMap.channel),normalMapUv:ue&&m(i.normalMap.channel),displacementMapUv:de&&m(i.displacementMap.channel),emissiveMapUv:fe&&m(i.emissiveMap.channel),metalnessMapUv:pe&&m(i.metalnessMap.channel),roughnessMapUv:me&&m(i.roughnessMap.channel),anisotropyMapUv:xe&&m(i.anisotropyMap.channel),clearcoatMapUv:Se&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:Ce&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:we&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:Te&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:Ee&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:De&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Oe&&m(i.sheenRoughnessMap.channel),specularMapUv:ke&&m(i.specularMap.channel),specularColorMapUv:Ae&&m(i.specularColorMap.channel),specularIntensityMapUv:je&&m(i.specularIntensityMap.channel),transmissionMapUv:Me&&m(i.transmissionMap.channel),thicknessMapUv:Ne&&m(i.thicknessMap.channel),alphaMapUv:Fe&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(ue||he),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(ie||Fe),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&ue===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ne,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Re,decodeVideoTexture:ie&&i.map.isVideoTexture===!0&&Nt.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:fe&&i.emissiveMap.isVideoTexture===!0&&Nt.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:j&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(j&&i.extensions.multiDraw===!0||re)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return ze.vertexUv1s=c.has(1),ze.vertexUv2s=c.has(2),ze.vertexUv3s=c.has(3),c.clear(),ze}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=fo[t];n=ma.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new zc(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Gc(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Kc(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function qc(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Jc(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||Kc),r.length>1&&r.sort(t||qc),i.length>1&&i.sort(t||qc),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Yc(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Jc,e.set(t,[i])):n>=r.length?(i=new Jc,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Xc(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new I,color:new R};break;case`SpotLight`:n={position:new I,direction:new I,color:new R,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new I,color:new R,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new I,skyColor:new R,groundColor:new R};break;case`RectAreaLight`:n={color:new R,position:new I,halfWidth:new I,halfHeight:new I}}return e[t.id]=n,n}}}function Zc(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Tt};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Tt};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Tt,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Qc=0;function $c(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function el(e){let t=new Xc,n=Zc(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new I);let i=new I,a=new Yt,o=new Yt;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort($c);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=z.LTC_FLOAT_1,r.rectAreaLTC2=z.LTC_FLOAT_2):(r.rectAreaLTC1=z.LTC_HALF_1,r.rectAreaLTC2=z.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=Qc++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function tl(e){let t=new el(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function nl(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new tl(e),t.set(n,[a])):r>=i.length?(a=new tl(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var rl=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,il=`uniform sampler2D shadow_pass;
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
}`,al=[new I(1,0,0),new I(-1,0,0),new I(0,1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1)],ol=[new I(0,-1,0),new I(0,-1,0),new I(0,0,1),new I(0,0,-1),new I(0,-1,0),new I(0,-1,0)],sl=new Yt,cl=new I,ll=new I;function ul(e,t,n){let r=new Pi,i=new Tt,a=new Tt,o=new Wt,s=new ya,c=new ba,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},p=new _a({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Tt},radius:{value:4}},vertexShader:rl,fragmentShader:il}),m=p.clone();m.defines.HORIZONTAL_PASS=1;let g=new Er;g.setAttribute(`position`,new dr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new mi(g,p),v=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let y=this.type;this.render=function(t,n,s){if(v.enabled===!1||v.autoUpdate===!1&&v.needsUpdate===!1||t.length===0)return;this.type===2&&(P(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),p=e.state;p.setBlending(0),p.buffers.depth.getReversed()===!0?p.buffers.color.setClear(0,0,0,0):p.buffers.color.setClear(1,1,1,1),p.buffers.depth.setTest(!0),p.setScissorTest(!1);let m=y!==this.type;m&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){P(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let g=d.getFrameExtents();i.multiply(g),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/g.x),i.x=a.x*g.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/g.y),i.y=a.y*g.y,d.mapSize.y=a.y));let _=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=_,d.map===null||m===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){P(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Kt(i.x,i.y,{format:se,type:T,minFilter:h,magFilter:h,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new ra(i.x,i.y,w),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=re,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=f,d.map.depthTexture.magFilter=f}else l.isPointLight?(d.map=new Vo(i.x),d.map.depthTexture=new ia(i.x,C)):(d.map=new Kt(i.x,i.y),d.map.depthTexture=new ra(i.x,i.y,C)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=re,this.type===1?(d.map.depthTexture.compareFunction=_?518:515,d.map.depthTexture.minFilter=h,d.map.depthTexture.magFilter=h):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=f,d.map.depthTexture.magFilter=f);d.camera.updateProjectionMatrix()}let v=d.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<v;t++){if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),p.viewport(o)}if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),cl.setFromMatrixPosition(l.matrixWorld),e.position.copy(cl),ll.copy(e.position),ll.add(al[t]),e.up.copy(ol[t]),e.lookAt(ll),e.updateMatrixWorld(),n.makeTranslation(-cl.x,-cl.y,-cl.z),sl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(sl,e.coordinateSystem,e.reversedDepth)}else d.updateMatrices(l);r=d.getFrustum(),S(n,s,d.camera,l,this.type)}d.isPointLightShadow!==!0&&this.type===3&&b(d,s),d.needsUpdate=!1}y=this.type,v.needsUpdate=!1,e.setRenderTarget(c,l,d)};function b(n,r){let a=t.update(_);p.defines.VSM_SAMPLES!==n.blurSamples&&(p.defines.VSM_SAMPLES=n.blurSamples,m.defines.VSM_SAMPLES=n.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new Kt(i.x,i.y,{format:se,type:T})),p.uniforms.shadow_pass.value=n.map.depthTexture,p.uniforms.resolution.value=n.mapSize,p.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,p,_,null),m.uniforms.shadow_pass.value=n.mapPass.texture,m.uniforms.resolution.value=n.mapSize,m.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,m,_,null)}function x(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,E)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function S(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=x(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=x(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)S(c[e],i,a,o,s)}function E(e){e.target.removeEventListener(`dispose`,E);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function dl(e,t){function n(){let t=!1,n=new Wt,r=null,i=new Wt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?pe(e.DEPTH_TEST):me(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=mt[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?pe(e.STENCIL_TEST):me(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new R(0,0,0),T=0,E=!1,D=null,ee=null,O=null,k=null,te=null,ne=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),A=!1,re=0,ie=e.getParameter(e.VERSION);ie.indexOf(`WebGL`)===-1?ie.indexOf(`OpenGL ES`)!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(ie)[1]),A=re>=2):(re=parseFloat(/^WebGL (\d)/.exec(ie)[1]),A=re>=1);let ae=null,oe={},se=e.getParameter(e.SCISSOR_BOX),ce=e.getParameter(e.VIEWPORT),le=new Wt().fromArray(se),ue=new Wt().fromArray(ce);function de(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let fe={};fe[e.TEXTURE_2D]=de(e.TEXTURE_2D,e.TEXTURE_2D,1),fe[e.TEXTURE_CUBE_MAP]=de(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),fe[e.TEXTURE_2D_ARRAY]=de(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),fe[e.TEXTURE_3D]=de(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),pe(e.DEPTH_TEST),o.setFunc(3),Se(!1),Ce(1),pe(e.CULL_FACE),be(0);function pe(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function me(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function he(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ge(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function _e(t){return h!==t&&(e.useProgram(t),h=t,!0)}let ve={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ve[103]=e.MIN,ve[104]=e.MAX;let ye={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function be(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(me(e.BLEND),g=!1);return}if(g===!1&&(pe(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:F(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:F(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:F(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:F(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a=a||n,o=o||r,s=s||i,(n!==v||a!==x)&&(e.blendEquationSeparate(ve[n],ve[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(ye[r],ye[i],ye[o],ye[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function xe(t,n){t.side===2?me(e.CULL_FACE):pe(e.CULL_FACE);let r=t.side===1;n&&(r=!r),Se(r),t.blending===1&&t.transparent===!1?be(0):be(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),Te(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?pe(e.SAMPLE_ALPHA_TO_COVERAGE):me(e.SAMPLE_ALPHA_TO_COVERAGE)}function Se(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function Ce(t){t===0?me(e.CULL_FACE):(pe(e.CULL_FACE),t!==ee&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),ee=t}function we(t){t!==O&&(A&&e.lineWidth(t),O=t)}function Te(t,n,r){t?(pe(e.POLYGON_OFFSET_FILL),(k!==n||te!==r)&&(k=n,te=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):me(e.POLYGON_OFFSET_FILL)}function Ee(t){t?pe(e.SCISSOR_TEST):me(e.SCISSOR_TEST)}function De(t){t===void 0&&(t=e.TEXTURE0+ne-1),ae!==t&&(e.activeTexture(t),ae=t)}function Oe(t,n,r){r===void 0&&(r=ae===null?e.TEXTURE0+ne-1:ae);let i=oe[r];i===void 0&&(i={type:void 0,texture:void 0},oe[r]=i),(i.type!==t||i.texture!==n)&&(ae!==r&&(e.activeTexture(r),ae=r),e.bindTexture(t,n||fe[t]),i.type=t,i.texture=n)}function ke(){let t=oe[ae];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ae(){try{e.compressedTexImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function je(){try{e.compressedTexImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Me(){try{e.texSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ne(){try{e.texSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Pe(){try{e.compressedTexSubImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Fe(){try{e.compressedTexSubImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Ie(){try{e.texStorage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Le(){try{e.texStorage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function j(){try{e.texImage2D(...arguments)}catch(e){F(`WebGLState:`,e)}}function Re(){try{e.texImage3D(...arguments)}catch(e){F(`WebGLState:`,e)}}function ze(t){return d[t]===void 0?e.getParameter(t):d[t]}function Be(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function M(t){le.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),le.copy(t))}function Ve(t){ue.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ue.copy(t))}function N(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function He(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Ue(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},ae=null,oe={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new R(0,0,0),T=0,E=!1,D=null,ee=null,O=null,k=null,te=null,le.set(0,0,e.canvas.width,e.canvas.height),ue.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:pe,disable:me,bindFramebuffer:he,drawBuffers:ge,useProgram:_e,setBlending:be,setMaterial:xe,setFlipSided:Se,setCullFace:Ce,setLineWidth:we,setPolygonOffset:Te,setScissorTest:Ee,activeTexture:De,bindTexture:Oe,unbindTexture:ke,compressedTexImage2D:Ae,compressedTexImage3D:je,texImage2D:j,texImage3D:Re,pixelStorei:Be,getParameter:ze,updateUBOMapping:N,uniformBlockBinding:He,texStorage2D:Ie,texStorage3D:Le,texSubImage2D:Me,texSubImage3D:Ne,compressedTexSubImage2D:Pe,compressedTexSubImage3D:Fe,scissor:M,viewport:Ve,reset:Ue}}function fl(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new Tt,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):st(`canvas`)}function T(e,t,n){let r=1,i=ze(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),P(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&P(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function E(e){return e.generateMipmaps}function D(t){e.generateMipmap(t)}function ee(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function O(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];P(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||P(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?$e:Nt.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function k(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,P(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function te(e,t){return E(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function ne(e){let t=e.target;t.removeEventListener(`dispose`,ne),re(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function A(e){let t=e.target;t.removeEventListener(`dispose`,A),oe(t)}function re(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=S.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&ae(e),Object.keys(i).length===0&&S.delete(n)}r.remove(e)}function ae(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=S.get(i);delete a[n.__cacheKey],o.memory.textures--}function oe(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(i[t])}r.remove(t)}let se=0;function ce(){se=0}function le(){return se}function ue(e){se=e}function de(){let e=se;return e>=i.maxTextures&&P(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+i.maxTextures),se+=1,e}function fe(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function pe(t,i){let a=r.get(t);if(t.isVideoTexture&&j(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)P(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)P(`WebGLRenderer: Texture marked for update but image is incomplete`);else{we(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function me(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){we(a,t,i);return}t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function he(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){we(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function ge(t,i){let a=r.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version){Te(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let _e={[l]:e.REPEAT,[u]:e.CLAMP_TO_EDGE,[d]:e.MIRRORED_REPEAT},ve={[f]:e.NEAREST,[p]:e.NEAREST_MIPMAP_NEAREST,[m]:e.NEAREST_MIPMAP_LINEAR,[h]:e.LINEAR,[g]:e.LINEAR_MIPMAP_NEAREST,[_]:e.LINEAR_MIPMAP_LINEAR},ye={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function be(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&P(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,_e[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,_e[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,_e[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,ve[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,ve[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,ye[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function xe(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,ne));let i=n.source,a=S.get(i);a===void 0&&(a={},S.set(i,a));let s=fe(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&ae(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function Se(e,t,n){return Math.floor(Math.floor(e/n)/t)}function Ce(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=Se(n.start,r.width,4),c=Se(t.start,r.width,4);n.start<=i+1&&a===c&&Se(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function we(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=xe(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let d=r.get(u);if(u.version!==d.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=Nt.getPrimaries(Nt.workingColorSpace),r=o.colorSpace===``?null:Nt.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=T(o.image,!1,i.maxTextureSize);t=Re(o,t);let r=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=O(o.internalFormat,r,f,o.normalized,o.colorSpace,o.isVideoTexture);be(c,o);let m,h=o.mipmaps,g=o.isVideoTexture!==!0,_=d.__version===void 0||l===!0,v=u.dataReady,y=te(o,t);if(o.isDepthTexture)p=k(o.format===ie,o.type),_&&(g?n.texStorage2D(e.TEXTURE_2D,1,p,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,p,t.width,t.height,0,r,f,null));else if(o.isDataTexture){if(h.length>0){g&&_&&n.texStorage2D(e.TEXTURE_2D,y,p,h[0].width,h[0].height);for(let t=0,i=h.length;t<i;t++)m=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,m.width,m.height,r,f,m.data):n.texImage2D(e.TEXTURE_2D,t,p,m.width,m.height,0,r,f,m.data);o.generateMipmaps=!1}else g?(_&&n.texStorage2D(e.TEXTURE_2D,y,p,t.width,t.height),v&&Ce(o,t,r,f)):n.texImage2D(e.TEXTURE_2D,0,p,t.width,t.height,0,r,f,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){g&&_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,p,h[0].width,h[0].height,t.depth);for(let i=0,a=h.length;i<a;i++)if(m=h[i],o.format!==1023){if(r!==null){if(g){if(v){if(o.layerUpdates.size>0){let t=oo(m.width,m.height,o.format,o.type);for(let a of o.layerUpdates){let o=m.data.subarray(a*t/m.data.BYTES_PER_ELEMENT,(a+1)*t/m.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,m.width,m.height,1,r,o)}o.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,m.width,m.height,t.depth,r,m.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,p,m.width,m.height,t.depth,0,m.data,0,0)}else P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else g?v&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,m.width,m.height,t.depth,r,f,m.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,p,m.width,m.height,t.depth,0,r,f,m.data)}else{g&&_&&n.texStorage2D(e.TEXTURE_2D,y,p,h[0].width,h[0].height);for(let t=0,i=h.length;t<i;t++)m=h[t],o.format===1023?g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,m.width,m.height,r,f,m.data):n.texImage2D(e.TEXTURE_2D,t,p,m.width,m.height,0,r,f,m.data):r===null?P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,m.width,m.height,r,m.data):n.compressedTexImage2D(e.TEXTURE_2D,t,p,m.width,m.height,0,m.data)}}else if(o.isDataArrayTexture){if(g){if(_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,p,t.width,t.height,t.depth),v){if(o.layerUpdates.size>0){let i=oo(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,f,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,f,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,p,t.width,t.height,t.depth,0,r,f,t.data)}else if(o.isData3DTexture)g?(_&&n.texStorage3D(e.TEXTURE_3D,y,p,t.width,t.height,t.depth),v&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,f,t.data)):n.texImage3D(e.TEXTURE_3D,0,p,t.width,t.height,t.depth,0,r,f,t.data);else if(o.isFramebufferTexture){if(_){if(g)n.texStorage2D(e.TEXTURE_2D,y,p,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<y;t++)n.texImage2D(e.TEXTURE_2D,t,p,i,a,0,r,f,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),b.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let t=ze(h[0]);n.texStorage2D(e.TEXTURE_2D,y,p,t.width,t.height)}for(let t=0,i=h.length;t<i;t++)m=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,f,m):n.texImage2D(e.TEXTURE_2D,t,p,r,f,m);o.generateMipmaps=!1}else if(g){if(_){let r=ze(t);n.texStorage2D(e.TEXTURE_2D,y,p,r.width,r.height)}v&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,f,t)}else n.texImage2D(e.TEXTURE_2D,0,p,r,f,t);E(o)&&D(c),d.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Te(t,o,s){if(o.image.length!==6)return;let c=xe(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=Nt.getPrimaries(Nt.workingColorSpace),r=o.colorSpace===``?null:Nt.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=T(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=Re(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),v=O(o.internalFormat,g,_,o.normalized,o.colorSpace),y=o.isVideoTexture!==!0,b=u.__version===void 0||c===!0,x=l.dataReady,S=te(o,h);be(e.TEXTURE_CUBE_MAP,o);let C;if(f){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let t=0;t<6;t++){C=m[t].mipmaps;for(let r=0;r<C.length;r++){let i=C[r];o.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,g,_,i.data):g===null?P(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,i.data)}}}else{if(C=o.mipmaps,y&&b){C.length>0&&S++;let t=ze(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,t.width,t.height)}for(let t=0;t<6;t++)if(p){y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<C.length;r++){let i=C[r].image[t].image;y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,m[t]);for(let r=0;r<C.length;r++){let i=C[r];y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}E(o)&&D(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Ee(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=O(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Le(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,Ie(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function De(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=k(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Le(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ie(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ie(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=O(o.internalFormat,c,l,o.normalized,o.colorSpace);Le(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ie(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ie(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Oe(t,i,o){let c=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,(!l.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),c){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,ne)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),be(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else pe(i.depthTexture,0);let u=l.__webglTexture,d=Ie(i),f=c?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Le(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)Le(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function ke(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)Oe(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?Oe(i.__webglFramebuffer[0],t,0):Oe(i.__webglFramebuffer,t,0)}}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),De(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),De(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Ae(t,n,i){let a=r.get(t);n!==void 0&&Ee(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&ke(t)}function je(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,A);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&Le(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=O(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=Ie(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),De(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),be(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)Ee(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else Ee(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);E(i)&&D(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),be(c,a),Ee(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),E(a)&&D(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),be(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)Ee(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else Ee(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);E(i)&&D(r),n.unbindTexture()}t.depthBuffer&&ke(t)}function Me(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(E(a)){let t=ee(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),D(t),n.unbindTexture()}}}let Ne=[],Pe=[];function Fe(t){if(t.samples>0){if(Le(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(Ne.length=0,Pe.length=0,Ne.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.resolveDepthBuffer===!1&&(Ne.push(l),Pe.push(l),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,Pe)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Ne))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.resolveDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function Ie(e){return Math.min(i.maxSamples,e.samples)}function Le(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function j(e){let t=o.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function Re(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Nt.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&P(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):F(`WebGLTextures: Unsupported texture color space:`,n)),t}function ze(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=de,this.resetTextureUnits=ce,this.getTextureUnits=le,this.setTextureUnits=ue,this.setTexture2D=pe,this.setTexture2DArray=me,this.setTexture3D=he,this.setTextureCube=ge,this.rebindTextures=Ae,this.setupRenderTarget=je,this.updateRenderTargetMipmap=Me,this.updateMultisampleRenderTarget=Fe,this.setupDepthRenderbuffer=ke,this.setupFrameBufferTexture=Ee,this.useMultisampledRTT=Le,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function pl(e,t){function n(n,r=``){let i,a=Nt.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var ml=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,hl=`
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

}`,gl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new aa(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new _a({vertexShader:ml,fragmentShader:hl,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new mi(new sa(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},_l=class extends ht{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new gl,g={},_=t.getContextAttributes(),y=null,b=null,x=[],S=[],w=new Tt,T=null,E=new Ha;E.viewport=new Wt;let D=new Ha;D.viewport=new Wt;let O=[E,D],k=new qa,te=null,ne=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=x[e];return t===void 0&&(t=new En,x[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=x[e];return t===void 0&&(t=new En,x[e]=t),t.getGripSpace()},this.getHand=function(e){let t=x[e];return t===void 0&&(t=new En,x[e]=t),t.getHandSpace()};function ae(e){let t=S.indexOf(e.inputSource);if(t===-1)return;let n=x[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function oe(){r.removeEventListener(`select`,ae),r.removeEventListener(`selectstart`,ae),r.removeEventListener(`selectend`,ae),r.removeEventListener(`squeeze`,ae),r.removeEventListener(`squeezestart`,ae),r.removeEventListener(`squeezeend`,ae),r.removeEventListener(`end`,oe),r.removeEventListener(`inputsourceschange`,se);for(let e=0;e<x.length;e++){let t=S[e];t!==null&&(S[e]=null,x[e].disconnect(t))}te=null,ne=null,h.reset();for(let e in g)delete g[e];e.setRenderTarget(y),f=null,d=null,u=null,r=null,b=null,he.stop(),n.isPresenting=!1,e.setPixelRatio(T),e.setSize(w.width,w.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&P(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&P(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(y=e.getRenderTarget(),r.addEventListener(`select`,ae),r.addEventListener(`selectstart`,ae),r.addEventListener(`selectend`,ae),r.addEventListener(`squeeze`,ae),r.addEventListener(`squeezestart`,ae),r.addEventListener(`squeezeend`,ae),r.addEventListener(`end`,oe),r.addEventListener(`inputsourceschange`,se),_.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(w),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?ie:re,a=_.stencil?ee:C);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),b=new Kt(d.textureWidth,d.textureHeight,{format:A,type:v,depthTexture:new ra(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),b=new Kt(f.framebufferWidth,f.framebufferHeight,{format:A,type:v,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),he.setContext(r),he.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function se(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=S.indexOf(n);r>=0&&(S[r]=null,x[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=S.indexOf(n);if(r===-1){for(let e=0;e<x.length;e++)if(e>=S.length){S.push(n),r=e;break}else if(S[e]===null){S[e]=n,r=e;break}if(r===-1)break}let i=x[r];i&&i.connect(n)}}let ce=new I,le=new I;function ue(e,t,n){ce.setFromMatrixPosition(t.matrixWorld),le.setFromMatrixPosition(n.matrixWorld);let r=ce.distanceTo(le),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function de(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),k.near=D.near=E.near=t,k.far=D.far=E.far=n,(te!==k.near||ne!==k.far)&&(r.updateRenderState({depthNear:k.near,depthFar:k.far}),te=k.near,ne=k.far),k.layers.mask=e.layers.mask|6,E.layers.mask=k.layers.mask&-5,D.layers.mask=k.layers.mask&-3;let i=e.parent,a=k.cameras;de(k,i);for(let e=0;e<a.length;e++)de(a[e],i);a.length===2?ue(k,E,D):k.projectionMatrix.copy(E.projectionMatrix),fe(e,k,i)};function fe(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=vt*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return k},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(k)},this.getCameraTexture=function(e){return g[e]};let pe=null;function me(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(b,f.framebuffer),e.setRenderTarget(b));let i=!1;t.length!==k.cameras.length&&(k.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(b,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(b))}let o=O[n];o===void 0&&(o=new Ha,o.layers.enable(n),o.viewport=new Wt,O[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(k.matrix.copy(o.matrix),k.matrix.decompose(k.position,k.quaternion,k.scale)),i===!0&&k.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new aa,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<x.length;e++){let t=S[e],n=x[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}pe&&pe(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let he=new co;he.setAnimationLoop(me),this.setAnimationLoop=function(e){pe=e},this.dispose=function(){}}},vl=new Yt,yl=new L;yl.set(-1,0,0,0,1,0,0,0,1);function bl(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,pa(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(vl.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(yl),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function xl(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return F(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?P(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):P(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var Sl=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Cl=null;function wl(){return Cl===null&&(Cl=new _i(Sl,16,16,se,T),Cl.name=`DFG_LUT`,Cl.minFilter=h,Cl.magFilter=h,Cl.wrapS=u,Cl.wrapT=u,Cl.generateMipmaps=!1,Cl.needsUpdate=!0),Cl}var Tl=class{constructor(e={}){let{canvas:t=ct(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=v}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([le,ce,oe]),g=new Set([v,C,x,ee,E,D]),y=new Uint32Array(4),b=new Int32Array(4),S=new I,w=null,O=null,k=[],te=[],ne=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let A=this,re=!1,ie=null,ae=null,se=null,ue=null;this._outputColorSpace=Ze;let de=0,fe=0,pe=null,me=-1,he=null,ge=new Wt,_e=new Wt,ve=null,ye=new R(0),be=0,xe=t.width,Se=t.height,Ce=1,we=null,Te=null,Ee=new Wt(0,0,xe,Se),De=new Wt(0,0,xe,Se),Oe=!1,ke=new Pi,Ae=!1,je=!1,Me=new Yt,Ne=new I,Pe=new Wt,Fe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ie=!1;function Le(){return pe===null?Ce:1}let j=n;function Re(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,ft,!1),t.addEventListener(`webglcontextrestored`,mt,!1),t.addEventListener(`webglcontextcreationerror`,ht,!1),j===null){let t=`webgl2`;if(j=Re(t,e),j===null)throw Re(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw F(`WebGLRenderer: `+e.message),e}let ze,Be,M,Ve,N,He,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Qe,$e,et,tt,nt,rt,at,ot,st;function lt(){ze=new Uo(j),ze.init(),at=new pl(j,ze),Be=new yo(j,ze,e,at),M=new dl(j,ze),Be.reversedDepthBuffer&&d&&M.buffers.depth.setReversed(!0),ae=j.createFramebuffer(),se=j.createFramebuffer(),ue=j.createFramebuffer(),Ve=new Ko(j),N=new Gc,He=new fl(j,ze,M,N,Be,at,Ve),Ue=new Ho(A),We=new lo(j),ot=new _o(j,We),Ge=new Wo(j,We,Ve,ot),Ke=new Jo(j,Ge,We,ot,Ve),tt=new qo(j,Be,He),Qe=new bo(N),qe=new Wc(A,Ue,ze,Be,ot,Qe),Je=new bl(A,N),Ye=new Yc,Xe=new nl(ze),et=new go(A,Ue,M,Ke,p,s),$e=new ul(A,Ke,Be),st=new xl(j,Ve,Be,M),nt=new vo(j,ze,Ve),rt=new Go(j,ze,Ve),Ve.programs=qe.programs,A.capabilities=Be,A.extensions=ze,A.properties=N,A.renderLists=Ye,A.shadowMap=$e,A.state=M,A.info=Ve}lt(),m!==1009&&(ne=new Xo(m,t.width,t.height,o,r,i));let dt=new _l(A,j);this.xr=dt,this.getContext=function(){return j},this.getContextAttributes=function(){return j.getContextAttributes()},this.forceContextLoss=function(){let e=ze.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=ze.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return Ce},this.setPixelRatio=function(e){e!==void 0&&(Ce=e,this.setSize(xe,Se,!1))},this.getSize=function(e){return e.set(xe,Se)},this.setSize=function(e,n,r=!0){if(dt.isPresenting){P(`WebGLRenderer: Can't change size while VR device is presenting.`);return}xe=e,Se=n,t.width=Math.floor(e*Ce),t.height=Math.floor(n*Ce),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),ne!==null&&ne.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(xe*Ce,Se*Ce).floor()},this.setDrawingBufferSize=function(e,n,r){xe=e,Se=n,Ce=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009){F(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){P(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}ne.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ge)},this.getViewport=function(e){return e.copy(Ee)},this.setViewport=function(e,t,n,r){e.isVector4?Ee.set(e.x,e.y,e.z,e.w):Ee.set(e,t,n,r),M.viewport(ge.copy(Ee).multiplyScalar(Ce).round())},this.getScissor=function(e){return e.copy(De)},this.setScissor=function(e,t,n,r){e.isVector4?De.set(e.x,e.y,e.z,e.w):De.set(e,t,n,r),M.scissor(_e.copy(De).multiplyScalar(Ce).round())},this.getScissorTest=function(){return Oe},this.setScissorTest=function(e){M.setScissorTest(Oe=e)},this.setOpaqueSort=function(e){we=e},this.setTransparentSort=function(e){Te=e},this.getClearColor=function(e){return e.copy(et.getClearColor())},this.setClearColor=function(){et.setClearColor(...arguments)},this.getClearAlpha=function(){return et.getClearAlpha()},this.setClearAlpha=function(){et.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(pe!==null){let t=pe.texture.format;e=h.has(t)}if(e){let e=pe.texture.type,t=g.has(e),n=et.getClearColor(),r=et.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(y[0]=i,y[1]=a,y[2]=o,y[3]=r,j.clearBufferuiv(j.COLOR,0,y)):(b[0]=i,b[1]=a,b[2]=o,b[3]=r,j.clearBufferiv(j.COLOR,0,b))}else r|=j.COLOR_BUFFER_BIT}t&&(r|=j.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=j.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&j.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),ie=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,ft,!1),t.removeEventListener(`webglcontextrestored`,mt,!1),t.removeEventListener(`webglcontextcreationerror`,ht,!1),et.dispose(),Ye.dispose(),Xe.dispose(),N.dispose(),Ue.dispose(),Ke.dispose(),ot.dispose(),st.dispose(),qe.dispose(),dt.dispose(),dt.removeEventListener(`sessionstart`,St),dt.removeEventListener(`sessionend`,Ct),wt.stop()};function ft(e){e.preventDefault(),ut(`WebGLRenderer: Context Lost.`),re=!0}function mt(){ut(`WebGLRenderer: Context Restored.`),re=!1;let e=Ve.autoReset,t=$e.enabled,n=$e.autoUpdate,r=$e.needsUpdate,i=$e.type;lt(),Ve.autoReset=e,$e.enabled=t,$e.autoUpdate=n,$e.needsUpdate=r,$e.type=i}function ht(e){F(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function gt(e){let t=e.target;t.removeEventListener(`dispose`,gt),_t(t)}function _t(e){vt(e),N.remove(e)}function vt(e){let t=N.get(e).programs;t!==void 0&&(t.forEach(function(e){qe.releaseProgram(e)}),e.isShaderMaterial&&qe.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Fe);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Pt(e,t,n,r,i);M.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ge.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;ot.setup(i,r,s,n,c);let h,g=nt;if(c!==null&&(h=We.get(c),g=rt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(M.setLineWidth(r.wireframeLinewidth*Le()),g.setMode(j.LINES)):g.setMode(j.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),M.setLineWidth(e*Le()),i.isLineSegments?g.setMode(j.LINES):i.isLineLoop?g.setMode(j.LINE_LOOP):g.setMode(j.LINE_STRIP)}else i.isPoints?g.setMode(j.POINTS):i.isSprite&&g.setMode(j.TRIANGLES);if(i.isBatchedMesh){if(ze.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?We.get(c).bytesPerElement:1,o=N.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(j,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function yt(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,kt(e,t,n),e.side=0,e.needsUpdate=!0,kt(e,t,n),e.side=2):kt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),O=Xe.get(n),O.init(t),te.push(O),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(O.pushLight(e),e.castShadow&&O.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(O.pushLight(e),e.castShadow&&O.pushShadow(e))}),O.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t){if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];yt(a,n,e),r.add(a)}else yt(t,n,e),r.add(t)}}),O=te.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){N.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}ze.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let bt=null;function xt(e){bt&&bt(e)}function St(){wt.stop()}function Ct(){wt.start()}let wt=new co;wt.setAnimationLoop(xt),typeof self<`u`&&wt.setContext(self),this.setAnimationLoop=function(e){bt=e,dt.setAnimationLoop(e),e===null?wt.stop():wt.start()},dt.addEventListener(`sessionstart`,St),dt.addEventListener(`sessionend`,Ct),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){F(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(re===!0)return;ie!==null&&ie.renderStart(e,t);let n=dt.enabled===!0&&dt.isPresenting===!0,r=ne!==null&&(pe===null||n)&&ne.begin(A,pe);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),dt.enabled===!0&&dt.isPresenting===!0&&(ne===null||ne.isCompositing()===!1)&&(dt.cameraAutoUpdate===!0&&dt.updateCamera(t),t=dt.getCamera()),e.isScene===!0&&e.onBeforeRender(A,e,t,pe),O=Xe.get(e,te.length),O.init(t),O.state.textureUnits=He.getTextureUnits(),te.push(O),Me.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),ke.setFromProjectionMatrix(Me,it,t.reversedDepth),je=this.localClippingEnabled,Ae=Qe.init(this.clippingPlanes,je),w=Ye.get(e,k.length),w.init(),k.push(w),dt.enabled===!0&&dt.isPresenting===!0){let e=A.xr.getDepthSensingMesh();e!==null&&Tt(e,t,-1/0,A.sortObjects)}Tt(e,t,0,A.sortObjects),w.finish(),A.sortObjects===!0&&w.sort(we,Te,t.reversedDepth),Ie=dt.enabled===!1||dt.isPresenting===!1||dt.hasDepthSensing()===!1,Ie&&et.addToRenderList(w,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Ae===!0&&Qe.beginShadows();let i=O.state.shadowsArray;if($e.render(i,e,t),Ae===!0&&Qe.endShadows(),(r&&ne.hasRenderPass())===!1){let n=w.opaque,r=w.transmissive;if(O.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];Dt(n,r,e,a)}Ie&&et.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];Et(w,e,n,n.viewport)}}else r.length>0&&Dt(n,r,e,t),Ie&&et.render(e),Et(w,e,t)}pe!==null&&fe===0&&(He.updateMultisampleRenderTarget(pe),He.updateRenderTargetMipmap(pe)),r&&ne.end(A),e.isScene===!0&&e.onAfterRender(A,e,t),ot.resetDefaultState(),me=-1,he=null,te.pop(),te.length>0?(O=te[te.length-1],He.setTextureUnits(O.state.textureUnits),Ae===!0&&Qe.setGlobalState(A.clippingPlanes,O.state.camera)):O=null,k.pop(),w=k.length>0?k[k.length-1]:null,ie!==null&&ie.renderEnd()};function Tt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)O.pushLightProbeGrid(e);else if(e.isLight)O.pushLight(e),e.castShadow&&O.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||ke.intersectsSprite(e)){r&&Pe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Me);let t=Ke.update(e),i=e.material;i.visible&&w.push(e,t,i,n,Pe.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||ke.intersectsObject(e))){let t=Ke.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),Pe.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Pe.copy(e.boundingSphere.center)),Pe.applyMatrix4(e.matrixWorld).applyMatrix4(Me)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&w.push(e,t,s,n,Pe.z,o)}}else i.visible&&w.push(e,t,i,n,Pe.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)Tt(i[e],t,n,r)}function Et(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;O.setupLightsView(n),Ae===!0&&Qe.setGlobalState(A.clippingPlanes,n),r&&M.viewport(ge.copy(r)),i.length>0&&Ot(i,t,n),a.length>0&&Ot(a,t,n),o.length>0&&Ot(o,t,n),M.buffers.depth.setTest(!0),M.buffers.depth.setMask(!0),M.buffers.color.setMask(!0),M.setPolygonOffset(!1)}function Dt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(O.state.transmissionRenderTarget[r.id]===void 0){let e=ze.has(`EXT_color_buffer_half_float`)||ze.has(`EXT_color_buffer_float`);O.state.transmissionRenderTarget[r.id]=new Kt(1,1,{generateMipmaps:!0,type:e?T:v,minFilter:_,samples:Math.max(4,Be.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Nt.workingColorSpace})}let a=O.state.transmissionRenderTarget[r.id],o=r.viewport||ge;a.setSize(o.z*A.transmissionResolutionScale,o.w*A.transmissionResolutionScale);let s=A.getRenderTarget(),c=A.getActiveCubeFace(),l=A.getActiveMipmapLevel();A.setRenderTarget(a),A.getClearColor(ye),be=A.getClearAlpha(),be<1&&A.setClearColor(16777215,.5),A.clear(),Ie&&et.render(n);let u=A.toneMapping;A.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),O.setupLightsView(r),Ae===!0&&Qe.setGlobalState(A.clippingPlanes,r),Ot(e,n,r),He.updateMultisampleRenderTarget(a),He.updateRenderTargetMipmap(a),ze.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,L(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(He.updateMultisampleRenderTarget(a),He.updateRenderTargetMipmap(a))}A.setRenderTarget(s,c,l),A.setClearColor(ye,be),d!==void 0&&(r.viewport=d),A.toneMapping=u}function Ot(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&L(o,t,n,s,l,c)}}function L(e,t,n,r,i,a){e.onBeforeRender(A,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(A,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,A.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,A.renderBufferDirect(n,t,r,i,e,a),i.side=2):A.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(A,t,n,r,i,a)}function kt(e,t,n){t.isScene!==!0&&(t=Fe);let r=N.get(e),i=O.state.lights,a=O.state.shadowsArray,o=i.state.version,s=qe.getParameters(e,i.state,a,t,n,O.state.lightProbeGridArray),c=qe.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ue.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,gt),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return jt(e,s),d}else s.uniforms=qe.getUniforms(e),ie!==null&&e.isNodeMaterial&&ie.build(e,n,s),e.onBeforeCompile(s,A),d=qe.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Qe.uniform),jt(e,s),r.needsLights=It(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=O.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function At(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=rc.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function jt(e,t){let n=N.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Mt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];S.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(S))return n}return null}function Pt(e,t,n,r,i){t.isScene!==!0&&(t=Fe),He.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=pe===null?A.outputColorSpace:pe.isXRRenderTarget===!0?pe.texture.colorSpace:Nt.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ue.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(pe===null||pe.isXRRenderTarget===!0)&&(h=A.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=N.get(r),y=O.state.lights;if(Ae===!0&&(je===!0||e!==he)){let t=e===he&&r.id===me;Qe.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Qe.numPlanes||v.numIntersection!==Qe.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=O.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=kt(r,t,i),ie&&r.isNodeMaterial&&ie.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(M.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==me&&(me=r.id,C=!0),v.needsLights){let e=Mt(O.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||he!==e){M.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(j,`projectionMatrix`,e.projectionMatrix),T.setValue(j,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(j,Ne.setFromMatrixPosition(e.matrixWorld)),Be.logarithmicDepthBuffer&&T.setValue(j,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(j,`isOrthographic`,e.isOrthographicCamera===!0),he!==e&&(he=e,C=!0,w=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&T.setValue(j,`directionalShadowMap`,y.state.directionalShadowMap,He),y.state.spotShadowMap.length>0&&T.setValue(j,`spotShadowMap`,y.state.spotShadowMap,He),y.state.pointShadowMap.length>0&&T.setValue(j,`pointShadowMap`,y.state.pointShadowMap,He)),i.isSkinnedMesh){T.setOptional(j,i,`bindMatrix`),T.setOptional(j,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(j,`boneTexture`,e.boneTexture,He))}i.isBatchedMesh&&(T.setOptional(j,i,`batchingTexture`),T.setValue(j,`batchingTexture`,i._matricesTexture,He),T.setOptional(j,i,`batchingIdTexture`),T.setValue(j,`batchingIdTexture`,i._indirectTexture,He),T.setOptional(j,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(j,`batchingColorTexture`,i._colorsTexture,He));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&tt.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(j,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=wl()),C){if(T.setValue(j,`toneMappingExposure`,A.toneMappingExposure),v.needsLights&&Ft(E,w),a&&r.fog===!0&&Je.refreshFogUniforms(E,a),Je.refreshMaterialUniforms(E,r,Ce,Se,O.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}rc.upload(j,At(v),E,He)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(rc.upload(j,At(v),E,He),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(j,`center`,i.center),T.setValue(j,`modelViewMatrix`,i.modelViewMatrix),T.setValue(j,`normalMatrix`,i.normalMatrix),T.setValue(j,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];st.update(n,x),st.bind(n,x)}}return x}function Ft(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function It(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return de},this.getActiveMipmapLevel=function(){return fe},this.getRenderTarget=function(){return pe},this.setRenderTargetTextures=function(e,t,n){let r=N.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),N.get(e.texture).__webglTexture=t,N.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=N.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){pe=e,de=t,fe=n;let r=null,i=!1,a=!1;if(e){let o=N.get(e);if(o.__useDefaultFramebuffer!==void 0){M.bindFramebuffer(j.FRAMEBUFFER,o.__webglFramebuffer),ge.copy(e.viewport),_e.copy(e.scissor),ve=e.scissorTest,M.viewport(ge),M.scissor(_e),M.setScissorTest(ve),me=-1;return}if(o.__webglFramebuffer===void 0)He.setupRenderTarget(e);else if(o.__hasExternalTextures)He.rebindTextures(e,N.get(e.texture).__webglTexture,N.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&N.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);He.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=N.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&He.useMultisampledRTT(e)===!1?N.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ge.copy(e.viewport),_e.copy(e.scissor),ve=e.scissorTest}else ge.copy(Ee).multiplyScalar(Ce).floor(),_e.copy(De).multiplyScalar(Ce).floor(),ve=Oe;if(n!==0&&(r=ae),M.bindFramebuffer(j.FRAMEBUFFER,r)&&M.drawBuffers(e,r),M.viewport(ge),M.scissor(_e),M.setScissorTest(ve),i){let r=N.get(e.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=N.get(e.textures[t]);j.framebufferTextureLayer(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=N.get(e.texture);j.framebufferTexture2D(j.FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,t.__webglTexture,n)}me=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=N.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){M.bindFramebuffer(j.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+s),!Be.textureFormatReadable(c)){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!Be.textureTypeReadable(l)){F(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&j.readPixels(t,n,r,i,at.convert(c),at.convert(l),a)}finally{let e=pe===null?null:N.get(pe).__webglFramebuffer;M.bindFramebuffer(j.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=N.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){M.bindFramebuffer(j.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&j.readBuffer(j.COLOR_ATTACHMENT0+s),!Be.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!Be.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=j.createBuffer();j.bindBuffer(j.PIXEL_PACK_BUFFER,d),j.bufferData(j.PIXEL_PACK_BUFFER,a.byteLength,j.STREAM_READ),j.readPixels(t,n,r,i,at.convert(l),at.convert(u),0);let f=pe===null?null:N.get(pe).__webglFramebuffer;M.bindFramebuffer(j.FRAMEBUFFER,f);let p=j.fenceSync(j.SYNC_GPU_COMMANDS_COMPLETE,0);return j.flush(),await pt(j,p,4),j.bindBuffer(j.PIXEL_PACK_BUFFER,d),j.getBufferSubData(j.PIXEL_PACK_BUFFER,0,a),j.deleteBuffer(d),j.deleteSync(p),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;He.setTexture2D(e,0),j.copyTexSubImage2D(j.TEXTURE_2D,n,0,0,o,s,i,a),M.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=at.convert(t.format),_=at.convert(t.type),v;t.isData3DTexture?(He.setTexture3D(t,0),v=j.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(He.setTexture2DArray(t,0),v=j.TEXTURE_2D_ARRAY):(He.setTexture2D(t,0),v=j.TEXTURE_2D),M.activeTexture(j.TEXTURE0),M.pixelStorei(j.UNPACK_FLIP_Y_WEBGL,t.flipY),M.pixelStorei(j.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),M.pixelStorei(j.UNPACK_ALIGNMENT,t.unpackAlignment);let y=M.getParameter(j.UNPACK_ROW_LENGTH),b=M.getParameter(j.UNPACK_IMAGE_HEIGHT),x=M.getParameter(j.UNPACK_SKIP_PIXELS),S=M.getParameter(j.UNPACK_SKIP_ROWS),C=M.getParameter(j.UNPACK_SKIP_IMAGES);M.pixelStorei(j.UNPACK_ROW_LENGTH,h.width),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,h.height),M.pixelStorei(j.UNPACK_SKIP_PIXELS,l),M.pixelStorei(j.UNPACK_SKIP_ROWS,u),M.pixelStorei(j.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=N.get(e),r=N.get(t),h=N.get(n.__renderTarget),g=N.get(r.__renderTarget);M.bindFramebuffer(j.READ_FRAMEBUFFER,h.__webglFramebuffer),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,N.get(e).__webglTexture,i,d+n),j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,N.get(t).__webglTexture,a,m+n)),j.blitFramebuffer(l,u,o,s,f,p,o,s,j.DEPTH_BUFFER_BIT,j.NEAREST);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||N.has(e)){let n=N.get(e),r=N.get(t);M.bindFramebuffer(j.READ_FRAMEBUFFER,se),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,ue);for(let e=0;e<c;e++)w?j.framebufferTextureLayer(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):j.framebufferTexture2D(j.READ_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,n.__webglTexture,i),T?j.framebufferTextureLayer(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):j.framebufferTexture2D(j.DRAW_FRAMEBUFFER,j.COLOR_ATTACHMENT0,j.TEXTURE_2D,r.__webglTexture,a),i===0?T?j.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):j.copyTexSubImage2D(v,a,f,p,l,u,o,s):j.blitFramebuffer(l,u,o,s,f,p,o,s,j.COLOR_BUFFER_BIT,j.NEAREST);M.bindFramebuffer(j.READ_FRAMEBUFFER,null),M.bindFramebuffer(j.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?j.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?j.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):j.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?j.texSubImage2D(j.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?j.compressedTexSubImage2D(j.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):j.texSubImage2D(j.TEXTURE_2D,a,f,p,o,s,g,_,h);M.pixelStorei(j.UNPACK_ROW_LENGTH,y),M.pixelStorei(j.UNPACK_IMAGE_HEIGHT,b),M.pixelStorei(j.UNPACK_SKIP_PIXELS,x),M.pixelStorei(j.UNPACK_SKIP_ROWS,S),M.pixelStorei(j.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&j.generateMipmap(v),M.unbindTexture()},this.initRenderTarget=function(e){N.get(e).__webglFramebuffer===void 0&&He.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?He.setTextureCube(e,0):e.isData3DTexture?He.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?He.setTexture2DArray(e,0):He.setTexture2D(e,0),M.unbindTexture()},this.resetState=function(){de=0,fe=0,pe=null,M.reset(),ot.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return it}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Nt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Nt._getUnpackColorSpace()}};function B(e,t,n=0){let r=(e|0)*374761393+(t|0)*668265263+(n|0)*1442695041;return r=(r^r>>>13)*1274126177,r^=r>>>16,(r>>>0)/4294967296}function El(e,t,n,r=0){let i=(e|0)*374761393+(t|0)*2246822519+(n|0)*668265263+(r|0)*1442695041;return i=(i^i>>>13)*1274126177,i^=i>>>16,(i>>>0)/4294967296}var Dl=class{constructor(e=1){this.s=e>>>0||2654435769}next(){let e=(this.s+=1831565813)>>>0;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return e+this.next()*(t-e)}int(e,t){return Math.floor(this.range(e,t+1))}pick(e){return e[Math.floor(this.next()*e.length)]}chance(e){return this.next()<e}shuffle(e){for(let t=e.length-1;t>0;t--){let n=Math.floor(this.next()*(t+1)),r=e[t];e[t]=e[n],e[n]=r}return e}},Ol=(e,t,n)=>e<t?t:e>n?n:e,kl=(e,t,n)=>e+(t-e)*n,Al=(e,t,n)=>{let r=Ol((n-e)/(t-e),0,1);return r*r*(3-2*r)},jl=.6,Ml=1.8,Nl=1.62,Pl=1.27,Fl=4.5,Il=1/20,Ll=.285,Rl=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],zl={A:`.###./#...#/#...#/#####/#...#/#...#/#...#`,B:`####./#...#/#...#/####./#...#/#...#/####.`,C:`.####/#..../#..../#..../#..../#..../.####`,D:`####./#...#/#...#/#...#/#...#/#...#/####.`,E:`#####/#..../#..../####./#..../#..../#####`,F:`#####/#..../#..../####./#..../#..../#....`,G:`.####/#..../#..../#.###/#...#/#...#/.####`,H:`#...#/#...#/#...#/#####/#...#/#...#/#...#`,I:`###/.#./.#./.#./.#./.#./###`,J:`....#/....#/....#/....#/#...#/#...#/.###.`,K:`#...#/#..#./#.#../##.../#.#../#..#./#...#`,L:`#..../#..../#..../#..../#..../#..../#####`,M:`#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#`,N:`#...#/##..#/#.#.#/#..##/#...#/#...#/#...#`,O:`.###./#...#/#...#/#...#/#...#/#...#/.###.`,P:`####./#...#/#...#/####./#..../#..../#....`,Q:`.###./#...#/#...#/#...#/#.#.#/#..#./.##.#`,R:`####./#...#/#...#/####./#.#../#..#./#...#`,S:`.####/#..../#..../.###./....#/....#/####.`,T:`#####/..#../..#../..#../..#../..#../..#..`,U:`#...#/#...#/#...#/#...#/#...#/#...#/.###.`,V:`#...#/#...#/#...#/#...#/#...#/.#.#./..#..`,W:`#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#`,X:`#...#/#...#/.#.#./..#../.#.#./#...#/#...#`,Y:`#...#/#...#/.#.#./..#../..#../..#../..#..`,Z:`#####/....#/...#./..#../.#.../#..../#####`,a:`...../...../.###./....#/.####/#...#/.####`,b:`#..../#..../####./#...#/#...#/#...#/####.`,c:`...../...../.####/#..../#..../#..../.####`,d:`....#/....#/.####/#...#/#...#/#...#/.####`,e:`...../...../.###./#...#/#####/#..../.####`,f:`..##/.#../###./.#../.#../.#../.#..`,g:`...../...../.####/#...#/#...#/.####/....#/.###.`,h:`#..../#..../####./#...#/#...#/#...#/#...#`,i:`#/./#/#/#/#/#`,j:`...#./...../...#./...#./...#./...#./#..#./.##..`,k:`#..../#..../#..#./#.#../##.../#.#../#..#.`,l:`##./.#./.#./.#./.#./.#./###`,m:`...../...../##.#./#.#.#/#.#.#/#.#.#/#...#`,n:`...../...../####./#...#/#...#/#...#/#...#`,o:`...../...../.###./#...#/#...#/#...#/.###.`,p:`...../...../####./#...#/#...#/####./#..../#....`,q:`...../...../.####/#...#/#...#/.####/....#/....#`,r:`...../...../#.##./##..#/#..../#..../#....`,s:`...../...../.####/#..../.###./....#/####.`,t:`.#../.#../####/.#../.#../.#../..##`,u:`...../...../#...#/#...#/#...#/#...#/.####`,v:`...../...../#...#/#...#/#...#/.#.#./..#..`,w:`...../...../#...#/#...#/#.#.#/#.#.#/.#.#.`,x:`...../...../#...#/.#.#./..#../.#.#./#...#`,y:`...../...../#...#/#...#/#...#/.####/....#/.###.`,z:`...../...../#####/...#./..#../.#.../#####`,0:`.###./#...#/#..##/#.#.#/##..#/#...#/.###.`,1:`..#../.##../..#../..#../..#../..#../.###.`,2:`.###./#...#/....#/...#./..#../.#.../#####`,3:`####./....#/....#/.###./....#/....#/####.`,4:`...#./..##./.#.#./#..#./#####/...#./...#.`,5:`#####/#..../#..../####./....#/....#/####.`,6:`.###./#..../#..../####./#...#/#...#/.###.`,7:`#####/....#/...#./..#../.#.../.#.../.#...`,8:`.###./#...#/#...#/.###./#...#/#...#/.###.`,9:`.###./#...#/#...#/.####/....#/....#/.###.`," ":`.../.../.../.../.../.../...`,".":`./././././././#`,",":`../../../../../../.#/#.`,":":`./#/./././#/.`,";":`../../.#/../../.#/#.`,"!":`#/#/#/#/#/./#`,"?":`.###./#...#/....#/...#./..#../...../..#..`,"'":`#/#/./././././.`,'"':`#.#/#.#/.../.../.../.../...`,"-":`...../...../...../#####/...../...../.....`,_:`...../...../...../...../...../...../#####`,"+":`...../..#../..#../#####/..#../..#../.....`,"=":`...../...../#####/...../#####/...../.....`,"/":`....#/....#/...#./..#../.#.../#..../#....`,"\\":`#..../#..../.#.../..#../...#./....#/....#`,"(":`.#/#./#./#./#./#./.#`,")":`#./.#/.#/.#/.#/.#/#.`,"[":`##/#./#./#./#./#./##`,"]":`##/.#/.#/.#/.#/.#/##`,"<":`...#/..#./.#../#.../.#../..#./...#`,">":`#.../.#../..#./...#/..#./.#../#...`,"&":`.##../#..#./#..#./.##../#.#.#/#..#./.##.#`,"%":`#...#/#...#/...#./..#../.#.../#...#/#...#`,"*":`...../.#.#./..#../#####/..#../.#.#./.....`,"#":`.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.`,"~":`...../...../.#..#/#.#.#/#..#./...../.....`},Bl={};for(let e in zl){let t=zl[e].split(`/`);Bl[e]={rows:t,w:t[0].length}}var Vl=Bl[`?`];function Hl(e){return(Bl[e]||Vl).w}function Ul(e,t=1){let n=0;for(let t of e)n+=Hl(t)+1;return Math.max(0,n-1)*t}function Wl(e,t,n,r,i=2,a=`#ffffff`,o=!0){let s=n;if(o){e.fillStyle=Gl(a);let o=n;for(let n of t){let t=Bl[n]||Vl;for(let n=0;n<t.rows.length;n++){let a=t.rows[n];for(let t=0;t<a.length;t++)a[t]===`#`&&e.fillRect(o+t*i+i,r+n*i+i,i,i)}o+=(t.w+1)*i}}e.fillStyle=a;for(let n of t){let t=Bl[n]||Vl;for(let n=0;n<t.rows.length;n++){let a=t.rows[n];for(let t=0;t<a.length;t++)a[t]===`#`&&e.fillRect(s+t*i,r+n*i,i,i)}s+=(t.w+1)*i}return s-n}function Gl(e){if(e.startsWith(`#`)&&(e.length===7||e.length===4)){let t,n,r;return e.length===7?(t=parseInt(e.slice(1,3),16),n=parseInt(e.slice(3,5),16),r=parseInt(e.slice(5,7),16)):(t=parseInt(e[1]+e[1],16),n=parseInt(e[2]+e[2],16),r=parseInt(e[3]+e[3],16)),`rgb(${t>>2},${n>>2},${r>>2})`}return`rgba(0,0,0,0.75)`}var Kl={A:`.#./#.#/###/#.#/#.#`,B:`##./#.#/##./#.#/##.`,C:`.##/#../#../#../.##`,D:`##./#.#/#.#/#.#/##.`,E:`###/#../##./#../###`,F:`###/#../##./#../#..`,G:`.##/#../#.#/#.#/.##`,H:`#.#/#.#/###/#.#/#.#`,I:`###/.#./.#./.#./###`,J:`..#/..#/..#/#.#/.#.`,K:`#.#/#.#/##./#.#/#.#`,L:`#../#../#../#../###`,M:`#.#/###/#.#/#.#/#.#`,N:`##./#.#/#.#/#.#/#.#`,O:`###/#.#/#.#/#.#/###`,P:`##./#.#/##./#../#..`,Q:`###/#.#/#.#/###/..#`,R:`##./#.#/##./#.#/#.#`,S:`.##/#../.#./..#/##.`,T:`###/.#./.#./.#./.#.`,U:`#.#/#.#/#.#/#.#/###`,V:`#.#/#.#/#.#/#.#/.#.`,W:`#.#/#.#/#.#/###/#.#`,X:`#.#/#.#/.#./#.#/#.#`,Y:`#.#/#.#/.#./.#./.#.`,Z:`###/..#/.#./#../###`,0:`###/#.#/#.#/#.#/###`,1:`.#./##./.#./.#./###`,2:`##./..#/.#./#../###`,3:`###/..#/.##/..#/###`,4:`#.#/#.#/###/..#/..#`,5:`###/#../###/..#/###`,6:`.##/#../###/#.#/###`,7:`###/..#/.#./.#./.#.`,8:`###/#.#/###/#.#/###`,9:`###/#.#/###/..#/##.`,"&":`.#./#.#/.#./#.#/.##`,"'":`#./#./../../..`,".":`./././././#`,"-":`.../.../###/.../...`," ":`../../../../..`,",":`./././#/#`};function ql(e){let t=0;for(let n of e.toUpperCase()){let e=Kl[n]||Kl[`-`];t+=e.split(`/`)[0].length+1}return t-1}function Jl(e,t,n,r,i){let a=r.toUpperCase(),o=ql(a),s=Math.floor((t-o)/2),c=Math.floor((n-5)/2);for(let r of a){let a=(Kl[r]||Kl[`-`]).split(`/`);for(let r=0;r<a.length;r++)for(let o=0;o<a[r].length;o++){if(a[r][o]!==`#`)continue;let l=s+o,u=c+r;if(l<0||u<0||l>=t||u>=n)continue;let d=(u*t+l)*4;e[d]=i[0],e[d+1]=i[1],e[d+2]=i[2],e[d+3]=255}s+=a[0].length+1}}var V=16,Yl=class{constructor(){this.d=new Uint8ClampedArray(V*V*4)}px(e,t,n,r=255){if(e<0||t<0||e>=V||t>=V)return;let i=(t*V+e)*4;this.d[i]=n[0],this.d[i+1]=n[1],this.d[i+2]=n[2],this.d[i+3]=r}get(e,t){let n=((t+V)%V*V+(e+V)%V)*4;return[this.d[n],this.d[n+1],this.d[n+2],this.d[n+3]]}fill(e,t=255){for(let n=0;n<V;n++)for(let r=0;r<V;r++)this.px(r,n,e,t)}rect(e,t,n,r,i,a=255){for(let o=t;o<t+r;o++)for(let t=e;t<e+n;t++)this.px(t,o,i,a)}noisy(e,t,n,r=255){for(let i=0;i<V;i++)for(let a=0;a<V;a++){let o=(n.next()*2-1)*t;this.px(a,i,[e[0]+o,e[1]+o,e[2]+o],r)}}speckle(e,t,n,r=255){for(let i=0;i<t;i++)this.px(n.int(0,V-1),n.int(0,V-1),e,r)}mul(e,t,n){let r=this.get(e,t);this.px(e,t,[r[0]*n,r[1]*n,r[2]*n],r[3])}mulRect(e,t,n,r,i){for(let a=t;a<t+r;a++)for(let t=e;t<e+n;t++)this.mul(t,a,i)}hline(e,t,n,r,i=255){for(let a=t;a<=n;a++)this.px(a,e,r,i)}vline(e,t,n,r,i=255){for(let a=t;a<=n;a++)this.px(e,a,r,i)}border(e,t=255){this.hline(0,0,V-1,e,t),this.hline(V-1,0,V-1,e,t),this.vline(0,0,V-1,e,t),this.vline(V-1,0,V-1,e,t)}copyFrom(e){this.d.set(e.d)}flipY(){let e=new Uint8ClampedArray(this.d);for(let t=0;t<V;t++)this.d.set(e.subarray((V-1-t)*V*4,(V-t)*V*4),t*V*4)}},Xl=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],Zl=(e,t,n)=>{let r=(t.next()*2-1)*n;return[e[0]+r,e[1]+r,e[2]+r]},H={},Ql=[134,96,67],$l=[125,125,125],eu=[168,133,80],tu=[112,84,48],nu=[114,82,46],ru=[70,48,26];H.dirt=(e,t)=>{e.noisy(Ql,12,t),e.speckle([104,72,48],26,t),e.speckle([158,118,86],16,t)},H.grass_top=(e,t)=>{e.noisy([109,170,66],13,t),e.speckle([88,146,52],22,t),e.speckle([128,190,80],12,t)},H.grass_side=(e,t)=>{H.dirt(e,t);for(let n=0;n<V;n++){let r=2+ +(t.next()<.5)+ +(t.next()<.25);for(let i=0;i<r;i++)e.px(n,i,Zl([109,170,66],t,12));e.px(n,r,Zl([84,138,50],t,8))}},H.stone=(e,t)=>{e.noisy($l,9,t);for(let n=0;n<6;n++){let n=t.int(0,15),r=t.int(0,15),i=t.int(2,5);for(let a=0;a<i;a++)e.px(n,r,Zl([100,100,100],t,6)),t.next()<.5?n=n+1&15:r=r+1&15}e.speckle([142,142,142],12,t)},H.smooth_stone=(e,t)=>{e.noisy([158,158,158],4,t)},H.cobblestone=(e,t)=>{let n=[];for(let e=0;e<9;e++)n.push([t.next()*V,t.next()*V,118+t.int(-14,16)]);for(let r=0;r<V;r++)for(let i=0;i<V;i++){let a=1e9,o=1e9,s=0;for(let e=0;e<n.length;e++)for(let t=-V;t<=V;t+=V)for(let c=-V;c<=V;c+=V){let l=n[e][0]+t-i-.5,u=n[e][1]+c-r-.5,d=l*l+u*u;d<a?(o=a,a=d,s=e):d<o&&(o=d)}let c=Math.sqrt(o)-Math.sqrt(a),l=n[s][2]+(t.next()*2-1)*6;c<.9?e.px(i,r,[78,78,78]):c<1.7?e.px(i,r,[l*.86,l*.86,l*.86]):e.px(i,r,[l,l,l])}},H.sand=(e,t)=>{e.noisy([219,207,163],8,t),e.speckle([200,186,140],14,t)},H.gravel=(e,t)=>{e.noisy([128,122,116],10,t);for(let n=0;n<22;n++){let n=Zl(t.next()<.5?[150,144,138]:[98,92,88],t,10),r=t.int(0,15),i=t.int(0,15);e.px(r,i,n),t.next()<.7&&e.px(r+1,i,n),t.next()<.5&&e.px(r,i+1,n)}},H.bedrock=(e,t)=>{e.noisy([70,70,70],28,t)},H.snow=(e,t)=>{e.noisy([242,246,250],5,t)},H.coarse_dirt=(e,t)=>{H.dirt(e,t),e.speckle([120,118,112],20,t),e.speckle([90,78,66],10,t)},H.dirt_path_top=(e,t)=>{e.noisy([148,122,76],9,t),e.speckle([130,104,62],14,t),e.speckle([166,140,92],10,t)},H.dirt_path_side=(e,t)=>{H.dirt(e,t);for(let n=0;n<V;n++)e.px(n,0,Zl([148,122,76],t,8)),e.px(n,1,Zl([140,114,70],t,8))},H.mud=(e,t)=>{e.noisy([78,62,48],8,t);for(let n=0;n<5;n++){let n=t.int(0,14),r=t.int(0,14),i=t.int(2,5),a=t.int(1,3);for(let o=r;o<r+a;o++)for(let r=n;r<n+i;r++)e.px(r&15,o&15,Zl([62,56,54],t,4))}e.speckle([96,78,60],12,t)},H.farmland=(e,t)=>{e.noisy([96,66,44],8,t);for(let t=1;t<V;t+=4)e.hline(t,0,15,[72,48,30]);e.speckle([110,80,56],12,t)};function iu(e,t,n,r){for(let i=0;i<4;i++){let a=i*4,o=Zl(n,t,6);for(let n=a;n<a+4;n++)for(let r=0;r<V;r++)e.px(r,n,Zl(o,t,5));for(let n=0;n<3;n++){let n=a+t.int(0,2),r=t.int(0,10),i=t.int(3,7);for(let t=r;t<r+i;t++)e.mul(t&15,n,.9)}e.hline(a+3,0,15,r);let s=i*7+3&15;e.vline(s,a,a+2,r)}}H.oak_planks=(e,t)=>iu(e,t,eu,tu),H.spruce_planks=(e,t)=>iu(e,t,nu,ru),H.white_planks=(e,t)=>iu(e,t,[228,222,210],[170,162,150]),H.stripped_oak=(e,t)=>{e.noisy([182,148,92],6,t);for(let n=0;n<V;n+=t.int(2,4))e.vline(n,0,15,Zl([160,126,74],t,8))};function au(e,t,n,r,i){e.noisy(n,8,t);for(let n=0;n<9;n++){let n=t.int(0,15),a=t.int(0,8),o=t.int(4,12),s=t.next()<.6?r:i;for(let r=a;r<a+o;r++)e.px(n,r&15,Zl(s,t,6))}}function ou(e,t,n,r,i){e.noisy(n,8,t);for(let n=1;n<V-1;n++)for(let a=1;a<V-1;a++){let o=a-7.5,s=n-7.5,c=Math.sqrt(o*o+s*s),l=Math.floor(c)%2==0;e.px(a,n,Zl(l?i:r,t,5))}e.border(n),e.border(Xl(n,.85)),e.rect(1,1,14,14,Xl(n,.95));for(let n=2;n<V-2;n++)for(let a=2;a<V-2;a++){let o=a-7.5,s=n-7.5,c=Math.sqrt(o*o+s*s),l=Math.floor(c)%2==0;e.px(a,n,Zl(l?i:r,t,5))}}H.oak_log=(e,t)=>au(e,t,[104,82,50],[78,60,36],[126,102,66]),H.oak_log_top=(e,t)=>ou(e,t,[104,82,50],[190,154,100],[168,134,84]),H.spruce_log=(e,t)=>au(e,t,[58,38,20],[42,26,12],[80,56,30]),H.spruce_log_top=(e,t)=>ou(e,t,[58,38,20],[150,112,66],[128,94,54]),H.birch_log=(e,t)=>{e.noisy([214,214,208],6,t);for(let n=0;n<10;n++){let n=t.int(0,14),r=t.int(0,15),i=t.int(1,3);for(let t=0;t<i;t++)e.px(n+t&15,r,[42,42,40]);t.next()<.5&&e.px(n+1&15,r+1&15,[90,90,84])}},H.birch_log_top=(e,t)=>ou(e,t,[214,214,208],[212,196,150],[190,174,130]);function su(e,t,n,r){e.fill([0,0,0],0);for(let i=0;i<V;i++)for(let a=0;a<V;a++){if(t.next()<r)continue;let o=Zl(n,t,18);e.px(a,i,o)}e.speckle(Xl(n,.7),18,t),e.speckle(Xl(n,1.25),10,t)}H.oak_leaves=(e,t)=>su(e,t,[64,128,36],.22),H.spruce_leaves=(e,t)=>su(e,t,[48,96,48],.18),H.birch_leaves=(e,t)=>su(e,t,[122,162,76],.24),H.glass=(e,t)=>{e.fill([0,0,0],0),e.border([220,240,250]);for(let t=0;t<6;t++)e.px(2+t,8-t,[230,245,255],200);for(let t=0;t<4;t++)e.px(9+t,5-t,[230,245,255],160);e.px(1,1,[180,210,225]),e.px(14,14,[180,210,225])},H.bricks=(e,t)=>{e.noisy([188,178,168],6,t);for(let n=0;n<4;n++){let r=n%2==0?0:4;for(let i=-1;i<3;i++){let a=i*8+r,o=Zl([152,86,68],t,12);for(let r=n*4;r<n*4+3;r++)for(let n=a;n<a+7;n++)n>=0&&n<V&&e.px(n,r,Zl(o,t,5))}}},H.stone_bricks=(e,t)=>{let n=[82,82,82];e.noisy([124,124,124],6,t);for(let r=0;r<2;r++){let i=r===0?0:8;for(let n=-1;n<2;n++){let a=n*16+i;for(let n=0;n<2;n++){let i=a+n*8,o=Zl([126,126,126],t,8);for(let n=r*8;n<r*8+7;n++)for(let r=i;r<i+7;r++)r>=0&&r<V&&e.px(r,n,Zl(o,t,5))}}e.hline(r*8+7,0,15,n),e.vline(i+7&15,r*8,r*8+6,n),e.vline(i+15&15,r*8,r*8+6,n)}},H.plaster=(e,t)=>{e.noisy([222,208,182],5,t),e.speckle([206,192,166],12,t)},H.sandstone_top=(e,t)=>{e.noisy([222,208,164],5,t)},H.sandstone_side=(e,t)=>{e.noisy([214,200,156],5,t),e.hline(0,0,15,[230,218,176]),e.hline(15,0,15,[196,180,136]);for(let n=0;n<4;n++){let n=t.int(3,12);e.hline(n,t.int(0,6),t.int(8,15),[198,182,138])}},H.water=(e,t)=>{e.noisy([54,108,220],10,t,190);for(let n=0;n<5;n++){let n=t.int(0,15),r=t.int(0,8);e.hline(n,r,r+t.int(2,6),[96,148,240],200)}},H.lantern=(e,t)=>{e.fill([255,214,120]),e.noisy([255,210,110],8,t),e.rect(4,4,8,8,[255,240,190]),e.border([48,40,36]),e.hline(7,0,15,[56,48,44]),e.vline(7,0,15,[56,48,44]),e.hline(1,0,15,[72,62,58]),e.hline(14,0,15,[72,62,58])},H.torch=(e,t)=>{e.fill([0,0,0],0),e.rect(7,8,2,8,[140,108,60]);for(let n=8;n<16;n++)e.px(8,n,Zl([120,92,50],t,8));e.rect(7,6,2,2,[255,200,60]),e.px(7,6,[255,240,150]),e.px(8,7,[255,160,40])},H.rail=(e,t)=>{e.fill([0,0,0],0);for(let n=1;n<V;n+=5){for(let r=0;r<V;r++)e.px(r,n,Zl([110,82,48],t,8));for(let r=0;r<V;r++)e.px(r,n+1,Zl([96,70,40],t,8))}e.vline(3,0,15,[150,150,150]),e.vline(4,0,15,[110,110,110]),e.vline(11,0,15,[150,150,150]),e.vline(12,0,15,[110,110,110])},H.barrel_side=(e,t)=>{for(let n=0;n<V;n++){let r=Zl([118,86,50],t,8);for(let i=0;i<V;i++)e.px(n,i,Zl(r,t,4))}for(let t of[3,7,11,15])e.vline(t,0,15,[80,56,30]);e.hline(2,0,15,[70,70,72]),e.hline(3,0,15,[96,96,100]),e.hline(12,0,15,[70,70,72]),e.hline(13,0,15,[96,96,100])},H.barrel_top=(e,t)=>{e.noisy([130,98,58],7,t);for(let t=0;t<V;t+=3)e.hline(t,0,15,[90,64,34]);for(let t=0;t<V;t++)for(let n=0;n<V;n++){let r=n-7.5,i=t-7.5,a=Math.sqrt(r*r+i*i);a>7.6?e.px(n,t,[70,70,72]):a>6.6&&e.px(n,t,[96,96,100])}},H.crate=(e,t)=>{iu(e,t,[176,140,84],[120,90,50]),e.border([110,82,46]),e.rect(1,1,14,14,[0,0,0],0),iu(e,t,[176,140,84],[120,90,50]),e.border([110,82,46]);for(let t=0;t<V;t++)e.px(t,t,[120,90,50]),e.px(15-t,t,[120,90,50]);e.mulRect(1,1,14,1,.9)},H.hay_side=(e,t)=>{for(let n=0;n<V;n++){let r=Zl([204,170,62],t,22);for(let i=0;i<V;i++)e.px(n,i,Zl(r,t,8))}e.hline(4,0,15,[140,106,40]),e.hline(11,0,15,[140,106,40])},H.hay_top=(e,t)=>{e.noisy([206,174,66],14,t);for(let n=0;n<40;n++)e.px(t.int(0,15),t.int(0,15),[150,118,40]);for(let t=0;t<V;t++)for(let n=0;n<V;n++){let r=n-7.5,i=t-7.5,a=Math.sqrt(r*r+i*i);a>6.2&&a<7.4&&e.px(n,t,[140,106,40])}},H.shelf=(e,t)=>{iu(e,t,nu,ru),e.rect(1,1,14,6,[40,30,22]),e.rect(1,9,14,6,[40,30,22]);let n=[[60,130,70],[150,90,40],[190,150,60],[120,60,50],[200,200,220]];for(let r=0;r<2;r++){let i=r===0?1:9;for(let r=2;r<14;r+=2){if(t.next()<.2)continue;let a=t.pick(n);e.vline(r,i+2,i+5,a),e.px(r,i+1,Xl(a,.7))}}},H.bookshelf=(e,t)=>{iu(e,t,eu,tu),e.rect(1,1,14,6,[50,40,30]),e.rect(1,9,14,6,[50,40,30]);let n=[[170,40,40],[40,80,160],[50,120,60],[200,170,80],[120,60,120],[220,220,200]];for(let r=0;r<2;r++){let i=r===0?1:9,a=1;for(;a<15;){let r=t.int(1,2),o=t.pick(n);for(let n=a;n<Math.min(a+r,15);n++)e.vline(n,i+t.int(0,1),i+5,o);a+=r}}},H.iron_bars=(e,t)=>{e.fill([0,0,0],0);for(let t of[1,5,9,13])e.vline(t,0,15,[128,128,130]),e.vline(t+1,0,15,[92,92,96]);e.hline(0,0,15,[110,110,112]),e.hline(15,0,15,[110,110,112])},H.oak_door_top=(e,t)=>{iu(e,t,eu,tu),e.rect(1,0,14,16,Zl(eu,t,4)),e.vline(0,0,15,tu),e.vline(15,0,15,tu),e.rect(3,3,4,6,[170,220,240]),e.rect(9,3,4,6,[170,220,240]),e.rect(2,2,6,8,tu),e.rect(3,3,4,6,[170,220,240]),e.rect(8,2,6,8,tu),e.rect(9,3,4,6,[170,220,240]),e.hline(12,2,13,tu)},H.oak_door_bottom=(e,t)=>{e.rect(0,0,16,16,Zl(eu,t,4));for(let n=0;n<V;n++)for(let r=0;r<V;r++)e.mul(r,n,.94+t.next()*.1);e.vline(0,0,15,tu),e.vline(15,0,15,tu),e.rect(2,2,12,11,tu),e.rect(3,3,10,9,Zl(eu,t,4)),e.px(13,6,[180,180,190])},H.saloon_door=(e,t)=>{e.fill([0,0,0],0),e.rect(0,2,16,14,Zl(nu,t,4)),e.vline(0,2,15,ru),e.vline(15,2,15,ru),e.hline(2,0,15,ru),e.hline(15,0,15,ru);for(let t=4;t<14;t+=2)e.hline(t,2,13,ru)},H.sign=(e,t)=>{e.noisy([198,162,100],5,t),e.border([120,90,50]);for(let t=4;t<12;t+=4)e.hline(t,1,14,[186,150,90])},H.bed_head_top=(e,t)=>{e.noisy([176,42,42],5,t),e.rect(1,1,14,6,[240,240,240]),e.rect(2,2,12,4,[225,225,228]),e.hline(15,0,15,[130,30,30])},H.bed_foot_top=(e,t)=>{e.noisy([176,42,42],5,t),e.hline(0,0,15,[130,30,30]),e.rect(1,12,14,3,[150,36,36])},H.bed_side=(e,t)=>{iu(e,t,eu,tu),e.rect(0,0,16,9,[176,42,42]),e.hline(9,0,15,[130,30,30]),e.hline(0,0,15,[196,60,60])},H.bed_end_head=(e,t)=>{iu(e,t,eu,tu),e.rect(0,0,16,9,[176,42,42]),e.rect(2,2,12,5,[240,240,240])},H.wool_white=(e,t)=>{e.noisy([236,236,236],8,t);for(let t=0;t<V;t+=2)for(let n=0;n<V;n+=2)e.mul(n+(t%4==0?0:1),t,.94)},H.wool_red=(e,t)=>{e.noisy([176,46,38],8,t);for(let t=0;t<V;t+=2)for(let n=0;n<V;n+=2)e.mul(n+(t%4==0?0:1),t,.92)},H.wool_blue=(e,t)=>{e.noisy([52,76,168],8,t);for(let t=0;t<V;t+=2)for(let n=0;n<V;n+=2)e.mul(n+(t%4==0?0:1),t,.92)},H.wool_green=(e,t)=>{e.noisy([84,118,44],8,t);for(let t=0;t<V;t+=2)for(let n=0;n<V;n+=2)e.mul(n+(t%4==0?0:1),t,.92)},H.cactus_side=(e,t)=>{e.noisy([86,136,52],8,t);for(let t of[2,5,9,13])e.vline(t,0,15,[60,104,40]);for(let n=0;n<8;n++)e.px(t.int(0,15),t.int(0,15),[200,210,160])},H.cactus_top=(e,t)=>{e.noisy([96,148,60],8,t),e.border([76,120,46]),e.rect(6,6,4,4,[110,164,70])},H.dead_bush=(e,t)=>{e.fill([0,0,0],0);let n=[118,86,48];e.vline(7,8,15,n),e.vline(8,10,15,n);for(let t=0;t<6;t++)e.px(7-t,9-t+ +(t>3),n);for(let t=0;t<6;t++)e.px(8+t,9-t,n);for(let t=0;t<4;t++)e.px(4-t,6-t,n),e.px(11+t,5-t,n);e.px(7,4,n),e.px(7,3,n),e.px(6,2,n)},H.tall_grass=(e,t)=>{e.fill([0,0,0],0);for(let n=0;n<9;n++){let r=t.int(1,14),i=t.int(6,13),a=Zl([96,160,56],t,20);for(let t=15;t>15-i;t--)e.px(r+(t<15-i+3?n%2?1:-1:0),t,a)}},H.wheat=(e,t)=>{e.fill([0,0,0],0);for(let n=0;n<7;n++){let r=1+n*2+t.int(0,1);for(let n=15;n>3;n--)e.px(r,n,Zl([150,160,60],t,12));e.rect(r-1,2,2,5,Zl([214,186,70],t,12))}},H.dandelion=(e,t)=>{e.fill([0,0,0],0),e.vline(7,8,15,[70,130,40]),e.px(6,12,[70,130,40]),e.px(9,11,[70,130,40]),e.px(10,10,[70,130,40]),e.rect(5,4,5,5,[244,214,60]),e.rect(6,3,3,7,[244,214,60]),e.rect(4,5,7,3,[244,214,60]),e.rect(6,5,3,3,[255,236,120])},H.poppy=(e,t)=>{e.fill([0,0,0],0),e.vline(7,8,15,[70,130,40]),e.px(5,13,[70,130,40]),e.px(6,12,[70,130,40]),e.px(9,11,[70,130,40]),e.rect(5,3,5,5,[210,40,40]),e.rect(4,4,7,3,[210,40,40]),e.rect(6,2,3,7,[210,40,40]),e.rect(6,4,3,2,[40,30,30]),e.px(5,3,[240,80,70])},H.piano_side=(e,t)=>{e.noisy([34,30,32],4,t),e.border([52,46,48]),e.hline(3,1,14,[60,54,56])},H.piano_top=(e,t)=>{e.noisy([36,32,34],4,t),e.border([54,48,50]);for(let t=0;t<6;t++)e.px(3+t,9-t,[90,84,88])},H.piano_front=(e,t)=>{H.piano_side(e,t),e.rect(1,7,14,4,[236,232,220]);for(let t=2;t<15;t+=2)e.vline(t,7,10,[200,196,186]);for(let t=2;t<15;t+=2)t/2%7!=3&&t/2%7!=0&&e.vline(t,7,8,[20,20,20]);e.hline(11,1,14,[90,60,40])},H.furnace_side=(e,t)=>{H.cobblestone(e,t)},H.furnace_front=(e,t)=>{H.cobblestone(e,t),e.rect(3,4,10,9,[28,24,22]),e.rect(4,8,8,4,[240,120,30]),e.rect(5,9,6,3,[255,190,60]),e.px(4,7,[240,120,30]),e.px(8,6,[255,200,80]),e.px(11,7,[240,120,30]),e.px(6,6,[255,160,40]),e.hline(13,3,12,[60,56,54])},H.anvil=(e,t)=>{e.noisy([66,66,70],6,t),e.border([50,50,54])},H.anvil_top=(e,t)=>{e.noisy([84,84,90],5,t),e.border([60,60,64])},H.iron_block=(e,t)=>{e.noisy([216,216,218],5,t),e.border([170,170,172]),e.hline(1,1,14,[236,236,238]),e.vline(1,1,14,[236,236,238])},H.gold_block=(e,t)=>{e.noisy([248,212,66],6,t),e.border([190,150,40]),e.hline(1,1,14,[255,240,150]),e.vline(1,1,14,[255,240,150])},H.chest_side=(e,t)=>{iu(e,t,[150,110,60],[90,62,32]),e.border([70,50,28]),e.hline(5,0,15,[70,50,28])},H.chest_front=(e,t)=>{H.chest_side(e,t),e.rect(7,4,2,4,[110,110,112]),e.px(7,5,[170,170,172])},H.chest_top=(e,t)=>{iu(e,t,[150,110,60],[90,62,32]),e.border([70,50,28])},H.gravestone=(e,t)=>{e.fill([0,0,0],0),e.rect(2,3,12,13,[138,138,134]),e.rect(3,1,10,2,[138,138,134]),e.rect(4,0,8,1,[138,138,134]);for(let n=0;n<V;n++)for(let r=0;r<V;r++)e.get(r,n)[3]>0&&e.mul(r,n,.92+t.next()*.12);e.vline(7,3,9,[92,92,90]),e.vline(8,3,9,[92,92,90]),e.hline(5,5,10,[92,92,90]),e.hline(12,4,11,[110,110,108])},H.stone_ore=(e,t,n,r=9)=>{H.stone(e,t);for(let i=0;i<r;i++){let r=t.int(1,14),i=t.int(1,14);e.px(r,i,n),e.px(r+(t.next()<.5?1:-1),i,Xl(n,.85)),t.next()<.5&&e.px(r,i+1,Xl(n,.9))}},H.coal_ore=(e,t)=>H.stone_ore(e,t,[28,28,28],9),H.iron_ore=(e,t)=>H.stone_ore(e,t,[216,176,150],8),H.gold_ore=(e,t)=>H.stone_ore(e,t,[250,232,80],7),H.pumpkin_side=(e,t)=>{e.noisy([214,122,24],8,t);for(let t of[3,8,13])e.vline(t,0,15,[170,92,16])},H.pumpkin_top=(e,t)=>{e.noisy([214,122,24],8,t),e.rect(6,6,4,4,[110,80,30]),e.rect(7,7,2,2,[90,110,40])},H.trough=(e,t)=>{iu(e,t,nu,ru),e.rect(2,2,12,12,[58,112,216])},H.scorched_stone=(e,t)=>{e.noisy([58,54,52],9,t);for(let n=0;n<5;n++){let n=t.int(0,15),r=t.int(0,15);for(let i=0;i<t.int(3,7);i++)e.px(n,r,t.next()<.6?[150,60,20]:[90,40,20]),t.next()<.5?n=n+1&15:r=r+1&15}e.speckle([30,28,26],14,t)},H.ash=(e,t)=>{e.noisy([112,108,104],9,t),e.speckle([80,76,72],20,t),e.speckle([140,136,130],10,t)},H.magma=(e,t)=>{e.noisy([38,22,14],8,t);for(let n=0;n<6;n++){let n=t.int(0,15),r=t.int(0,15);for(let i=0;i<t.int(4,9);i++)e.px(n,r,[255,140+t.int(0,60),30]),t.next()<.3&&e.px(n+1&15,r,[255,200,90]),t.next()<.5?n=n+1&15:r=r+1&15}},H.charred_planks=(e,t)=>{iu(e,t,[52,44,38],[28,22,18]),e.speckle([20,16,14],24,t),e.speckle([120,60,20],4,t)},H.missing=(e,t)=>{for(let t=0;t<V;t++)for(let n=0;n<V;n++)e.px(n,t,(n>>3)+(t>>3)&1?[255,0,255]:[0,0,0])};function cu(e,t,n){e.fill([0,0,0],0);let r=[30,30,30],i=3+n,a=3+n*1.6;for(let o=0;o<i;o++){let s=8+t.int(-2,1),c=8+t.int(-2,1),l=o/i*Math.PI*2+t.next()*.6,u=Math.cos(l),d=Math.sin(l);for(let i=0;i<a;i++){e.px(Math.round(s),Math.round(c),r,170+n*8),s+=u,c+=d,u+=(t.next()-.5)*.7,d+=(t.next()-.5)*.7;let i=Math.hypot(u,d)||1;u/=i,d/=i}}}var lu=`missing.grass_top.grass_side.dirt.stone.cobblestone.sand.gravel.bedrock.oak_log.oak_log_top.oak_leaves.oak_planks.glass.bricks.water.tall_grass.dandelion.poppy.spruce_log.spruce_log_top.spruce_planks.spruce_leaves.birch_log.birch_log_top.birch_leaves.dirt_path_top.dirt_path_side.mud.stone_bricks.sandstone_top.sandstone_side.lantern.torch.rail.barrel_side.barrel_top.crate.hay_side.hay_top.shelf.bookshelf.iron_bars.oak_door_top.oak_door_bottom.saloon_door.sign.bed_head_top.bed_foot_top.bed_side.bed_end_head.wool_white.wool_red.wool_blue.wool_green.cactus_side.cactus_top.dead_bush.wheat.piano_side.piano_top.piano_front.furnace_side.furnace_front.anvil.anvil_top.iron_block.gold_block.chest_side.chest_front.chest_top.gravestone.coarse_dirt.farmland.smooth_stone.plaster.white_planks.stripped_oak.snow.coal_ore.iron_ore.gold_ore.pumpkin_side.pumpkin_top.trough.scorched_stone.ash.magma.charred_planks`.split(`.`),uu={},du=0,fu=[];function pu(e,t,n){let r=new Yl;return t(r,new Dl(n)),fu.push(r),uu[e]=du,du++}function mu(){lu.forEach((e,t)=>pu(e,H[e],1e3+t*7919));for(let e=0;e<10;e++)pu(`destroy_`+e,(t,n)=>cu(t,n,e),5e3+e);return _u()}function hu(e,t){let n=`sign:`+e+`:`+t;if(uu[n])return uu[n];let r=t*V,i=new Uint8ClampedArray(r*V*4),a=new Dl(77);for(let e=0;e<V;e++)for(let t=0;t<r;t++){let n=(e*r+t)*4,o=(a.next()*2-1)*5,s=[198+o,162+o,100+o];(e===0||e===V-1||t===0||t===r-1)&&(s=[120,90,50]),i[n]=s[0],i[n+1]=s[1],i[n+2]=s[2],i[n+3]=255}Jl(i,r,V,e,[40,26,14]);let o=[];for(let e=0;e<t;e++){let t=new Yl;for(let n=0;n<V;n++)for(let a=0;a<V;a++){let o=(n*r+a+e*V)*4;t.px(a,n,[i[o],i[o+1],i[o+2]],i[o+3])}fu.push(t),o.push(du++)}return uu[n]=o,o}var gu=null;function _u(){let e=16*V,t=document.createElement(`canvas`);t.width=e,t.height=e;let n=t.getContext(`2d`),r=n.createImageData(e,e);for(let t=0;t<fu.length;t++){let n=t%16*V,i=Math.floor(t/16)*V,a=fu[t];for(let t=0;t<V;t++){let o=a.d.subarray(t*V*4,(t+1)*V*4);r.data.set(o,((i+t)*e+n)*4)}}n.putImageData(r,0,0);let i=[],a=r.data,o=e;for(i.push({data:new Uint8Array(a.buffer.slice(0)),width:e,height:e});o>16;){let e=o>>1,t=new Uint8ClampedArray(e*e*4);for(let n=0;n<e;n++)for(let r=0;r<e;r++){let i=0,s=0,c=0,l=0,u=0;for(let e=0;e<2;e++)for(let t=0;t<2;t++){let d=((n*2+e)*o+(r*2+t))*4,f=a[d+3];u+=f,f>127&&(i+=a[d],s+=a[d+1],c+=a[d+2],l++)}let d=(n*e+r)*4;l>0?(t[d]=i/l,t[d+1]=s/l,t[d+2]=c/l,t[d+3]=l>=2?255:0):t[d+3]=0,l===4&&u<1020&&(t[d+3]=u/4)}i.push({data:new Uint8Array(t.buffer),width:e,height:e}),a=t,o=e}let s=new _i(i[0].data,e,e,A);return s.mipmaps=i,s.generateMipmaps=!1,s.magFilter=f,s.minFilter=m,s.wrapS=u,s.wrapT=u,s.colorSpace=``,s.flipY=!1,s.needsUpdate=!0,gu&&gu.dispose(),gu=s,s}function vu(e){let t=e%16,n=Math.floor(e/16),r=1/16;return[t*r,n*r,r]}function yu(e){return fu[e]?fu[e].d:fu[0].d}var U={CUBE:0,CROSS:1,SLAB:2,SLAB_TOP:3,POST:4,FENCE:5,LANTERN:6,TORCH:7,RAIL:8,PANE:9,DOOR:10,SALOON_DOOR:11,WALL_SIGN:12,BED:13,ANVIL:14,CHEST:15,GRAVESTONE:16,CACTUS:17,TROUGH:18,FARMLAND:19,LIQUID:20,TABLE:21},W={AIR:0,GRASS:1,DIRT:2,STONE:3,COBBLESTONE:4,SAND:5,GRAVEL:6,OAK_LOG:7,OAK_LEAVES:8,OAK_PLANKS:9,GLASS:10,BRICKS:11,WATER:12,BEDROCK:13,TALL_GRASS:14,DANDELION:15,POPPY:16,SPRUCE_LOG:17,SPRUCE_PLANKS:18,SPRUCE_LEAVES:19,BIRCH_LOG:20,BIRCH_LEAVES:21,DIRT_PATH:22,MUD:23,STONE_BRICKS:24,SANDSTONE:25,OAK_SLAB:26,OAK_SLAB_TOP:27,SPRUCE_SLAB:28,SPRUCE_SLAB_TOP:29,COBBLE_SLAB:30,STONE_BRICK_SLAB:31,OAK_FENCE:32,SPRUCE_FENCE:33,WHITE_FENCE:34,LANTERN:35,RAIL:36,BARREL:37,CRATE:38,HAY_BALE:39,SHELF:40,IRON_BARS:41,OAK_DOOR:42,SALOON_DOOR:43,WALL_SIGN:44,BED_HEAD:45,BED_FOOT:46,WHITE_WOOL:47,RED_WOOL:48,BLUE_WOOL:49,GREEN_WOOL:50,CACTUS:51,DEAD_BUSH:52,TORCH:53,BOOKSHELF:54,STRIPPED_OAK:55,COARSE_DIRT:56,PIANO:57,FURNACE:58,ANVIL:59,CHEST:60,SMOOTH_STONE:61,COAL_ORE:62,IRON_ORE:63,GOLD_ORE:64,WHEAT:65,FARMLAND:66,GRAVESTONE:67,GOLD_BLOCK:68,IRON_BLOCK:69,PLASTER:70,WHITE_PLANKS:71,SNOW:72,PUMPKIN:73,TROUGH:74,TABLE:75,STONE_BRICK_SLAB_TOP:76,SPRUCE_DOOR:77,SCORCHED_STONE:78,ASH:79,MAGMA:80,CHARRED_PLANKS:81},G=Array(256),K=e=>uu[e]??0,q=e=>[K(e),K(e),K(e),K(e),K(e),K(e)],bu=(e,t,n=t)=>[K(e),K(e),K(t),K(n),K(e),K(e)],xu=[[0,0,0,1,1,1]];function J(e,t,n){let r={id:e,name:t,displayName:n.displayName||t.replace(/_/g,` `).replace(/\b\w/g,e=>e.toUpperCase()),shape:n.shape??U.CUBE,tex:n.tex||q(`missing`),solid:n.solid??!0,opaque:n.opaque??!0,cutout:n.cutout??!1,lightOpacity:n.lightOpacity??0,emit:n.emit??0,hardness:n.hardness??1,sound:n.sound||`stone`,boxes:n.boxes||(n.solid===!1?[]:xu),replaceable:n.replaceable??!1,item:n.item??!0,icon:n.icon||`cube`,drop:n.drop??e,tint:n.tint||null};return r.shape!==U.CUBE&&(r.opaque=!1),G[e]=r,r}function Su(){J(W.AIR,`air`,{solid:!1,opaque:!1,item:!1,replaceable:!0,boxes:[]}),J(W.GRASS,`grass_block`,{tex:bu(`grass_side`,`grass_top`,`dirt`),sound:`grass`,hardness:.6,drop:W.DIRT}),J(W.DIRT,`dirt`,{tex:q(`dirt`),sound:`gravel`,hardness:.5}),J(W.COARSE_DIRT,`coarse_dirt`,{tex:q(`coarse_dirt`),sound:`gravel`,hardness:.5}),J(W.STONE,`stone`,{tex:q(`stone`),hardness:1.5,drop:W.COBBLESTONE}),J(W.COBBLESTONE,`cobblestone`,{tex:q(`cobblestone`),hardness:1.6}),J(W.SMOOTH_STONE,`smooth_stone`,{tex:q(`smooth_stone`),hardness:1.5}),J(W.STONE_BRICKS,`stone_bricks`,{tex:q(`stone_bricks`),hardness:1.5}),J(W.SAND,`sand`,{tex:q(`sand`),sound:`sand`,hardness:.5}),J(W.GRAVEL,`gravel`,{tex:q(`gravel`),sound:`gravel`,hardness:.6}),J(W.SANDSTONE,`sandstone`,{tex:bu(`sandstone_side`,`sandstone_top`),hardness:.8}),J(W.BEDROCK,`bedrock`,{tex:q(`bedrock`),hardness:1/0,item:!1}),J(W.SNOW,`snow_block`,{tex:q(`snow`),sound:`snow`,hardness:.3}),J(W.OAK_LOG,`oak_log`,{tex:bu(`oak_log`,`oak_log_top`),sound:`wood`,hardness:1.2}),J(W.SPRUCE_LOG,`spruce_log`,{tex:bu(`spruce_log`,`spruce_log_top`),sound:`wood`,hardness:1.2}),J(W.BIRCH_LOG,`birch_log`,{tex:bu(`birch_log`,`birch_log_top`),sound:`wood`,hardness:1.2}),J(W.STRIPPED_OAK,`stripped_oak_log`,{tex:bu(`stripped_oak`,`oak_log_top`),sound:`wood`,hardness:1.2}),J(W.OAK_LEAVES,`oak_leaves`,{tex:q(`oak_leaves`),opaque:!1,cutout:!0,lightOpacity:1,sound:`grass`,hardness:.25}),J(W.SPRUCE_LEAVES,`spruce_leaves`,{tex:q(`spruce_leaves`),opaque:!1,cutout:!0,lightOpacity:1,sound:`grass`,hardness:.25}),J(W.BIRCH_LEAVES,`birch_leaves`,{tex:q(`birch_leaves`),opaque:!1,cutout:!0,lightOpacity:1,sound:`grass`,hardness:.25}),J(W.OAK_PLANKS,`oak_planks`,{tex:q(`oak_planks`),sound:`wood`,hardness:1}),J(W.SPRUCE_PLANKS,`spruce_planks`,{tex:q(`spruce_planks`),sound:`wood`,hardness:1}),J(W.WHITE_PLANKS,`white_planks`,{displayName:`Whitewashed Planks`,tex:q(`white_planks`),sound:`wood`,hardness:1}),J(W.GLASS,`glass`,{tex:q(`glass`),opaque:!1,cutout:!0,sound:`glass`,hardness:.3,drop:0}),J(W.BRICKS,`bricks`,{tex:q(`bricks`),hardness:1.6}),J(W.PLASTER,`plaster`,{tex:q(`plaster`),hardness:1}),J(W.WATER,`water`,{shape:U.LIQUID,tex:q(`water`),solid:!1,opaque:!1,lightOpacity:1,replaceable:!0,item:!1,hardness:1/0,boxes:[]}),J(W.TALL_GRASS,`grass`,{displayName:`Grass`,shape:U.CROSS,tex:q(`tall_grass`),solid:!1,cutout:!0,replaceable:!0,icon:`flat`,hardness:.05,sound:`grass`,drop:0,boxes:[]}),J(W.DANDELION,`dandelion`,{shape:U.CROSS,tex:q(`dandelion`),solid:!1,cutout:!0,icon:`flat`,hardness:.05,sound:`grass`,boxes:[]}),J(W.POPPY,`poppy`,{shape:U.CROSS,tex:q(`poppy`),solid:!1,cutout:!0,icon:`flat`,hardness:.05,sound:`grass`,boxes:[]}),J(W.DEAD_BUSH,`dead_bush`,{shape:U.CROSS,tex:q(`dead_bush`),solid:!1,cutout:!0,icon:`flat`,hardness:.05,sound:`grass`,boxes:[]}),J(W.WHEAT,`wheat`,{shape:U.CROSS,tex:q(`wheat`),solid:!1,cutout:!0,icon:`flat`,hardness:.05,sound:`grass`,boxes:[],item:!1,drop:0}),J(W.DIRT_PATH,`dirt_path`,{tex:bu(`dirt_path_side`,`dirt_path_top`,`dirt`),sound:`grass`,hardness:.6}),J(W.MUD,`mud`,{tex:q(`mud`),sound:`gravel`,hardness:.5}),J(W.FARMLAND,`farmland`,{tex:bu(`dirt`,`farmland`,`dirt`),sound:`gravel`,hardness:.6,drop:W.DIRT}),J(W.OAK_SLAB,`oak_slab`,{shape:U.SLAB,tex:q(`oak_planks`),sound:`wood`,hardness:1,icon:`slab`,boxes:[[0,0,0,1,.5,1]]}),J(W.OAK_SLAB_TOP,`oak_slab_top`,{displayName:`Oak Slab (Top)`,shape:U.SLAB_TOP,tex:q(`oak_planks`),sound:`wood`,hardness:1,icon:`slab`,boxes:[[0,.5,0,1,1,1]],item:!1,drop:W.OAK_SLAB}),J(W.SPRUCE_SLAB,`spruce_slab`,{shape:U.SLAB,tex:q(`spruce_planks`),sound:`wood`,hardness:1,icon:`slab`,boxes:[[0,0,0,1,.5,1]]}),J(W.SPRUCE_SLAB_TOP,`spruce_slab_top`,{displayName:`Spruce Slab (Top)`,shape:U.SLAB_TOP,tex:q(`spruce_planks`),sound:`wood`,hardness:1,icon:`slab`,boxes:[[0,.5,0,1,1,1]],item:!1,drop:W.SPRUCE_SLAB}),J(W.COBBLE_SLAB,`cobblestone_slab`,{shape:U.SLAB,tex:q(`cobblestone`),hardness:1.6,icon:`slab`,boxes:[[0,0,0,1,.5,1]]}),J(W.STONE_BRICK_SLAB,`stone_brick_slab`,{shape:U.SLAB,tex:q(`stone_bricks`),hardness:1.5,icon:`slab`,boxes:[[0,0,0,1,.5,1]]}),J(W.STONE_BRICK_SLAB_TOP,`stone_brick_slab_top`,{displayName:`Stone Brick Slab (Top)`,shape:U.SLAB_TOP,tex:q(`stone_bricks`),hardness:1.5,icon:`slab`,boxes:[[0,.5,0,1,1,1]],item:!1,drop:W.STONE_BRICK_SLAB}),J(W.OAK_FENCE,`oak_fence`,{shape:U.FENCE,tex:q(`oak_planks`),sound:`wood`,hardness:1,icon:`flat`,boxes:[[.375,0,.375,.625,1.5,.625]]}),J(W.SPRUCE_FENCE,`spruce_fence`,{shape:U.FENCE,tex:q(`spruce_planks`),sound:`wood`,hardness:1,icon:`flat`,boxes:[[.375,0,.375,.625,1.5,.625]]}),J(W.WHITE_FENCE,`white_fence`,{displayName:`Picket Fence`,shape:U.FENCE,tex:q(`white_planks`),sound:`wood`,hardness:1,icon:`flat`,boxes:[[.375,0,.375,.625,1.5,.625]]}),J(W.LANTERN,`lantern`,{shape:U.LANTERN,tex:q(`lantern`),solid:!1,emit:15,sound:`metal`,hardness:.4,icon:`flat`,boxes:[]}),J(W.TORCH,`torch`,{shape:U.TORCH,tex:q(`torch`),solid:!1,emit:14,sound:`wood`,hardness:.05,icon:`flat`,boxes:[]}),J(W.RAIL,`rail`,{shape:U.RAIL,tex:q(`rail`),solid:!1,cutout:!0,sound:`metal`,hardness:.5,icon:`flat`,boxes:[]}),J(W.BARREL,`barrel`,{tex:bu(`barrel_side`,`barrel_top`),sound:`wood`,hardness:1}),J(W.CRATE,`crate`,{tex:q(`crate`),sound:`wood`,hardness:1}),J(W.HAY_BALE,`hay_bale`,{tex:bu(`hay_side`,`hay_top`),sound:`grass`,hardness:.5}),J(W.SHELF,`shelf`,{displayName:`Bottle Shelf`,tex:[K(`shelf`),K(`shelf`),K(`spruce_planks`),K(`spruce_planks`),K(`shelf`),K(`shelf`)],sound:`wood`,hardness:1}),J(W.BOOKSHELF,`bookshelf`,{tex:[K(`bookshelf`),K(`bookshelf`),K(`oak_planks`),K(`oak_planks`),K(`bookshelf`),K(`bookshelf`)],sound:`wood`,hardness:1}),J(W.IRON_BARS,`iron_bars`,{shape:U.PANE,tex:q(`iron_bars`),cutout:!0,sound:`metal`,hardness:1.5,icon:`flat`,boxes:[[.4375,0,0,.5625,1,1]]}),J(W.OAK_DOOR,`oak_door`,{shape:U.DOOR,tex:q(`oak_door_bottom`),solid:!1,cutout:!0,sound:`wood`,hardness:1,icon:`flat`,boxes:[]}),J(W.SPRUCE_DOOR,`spruce_door`,{shape:U.DOOR,tex:q(`oak_door_bottom`),solid:!1,cutout:!0,sound:`wood`,hardness:1,icon:`flat`,boxes:[],item:!1,drop:W.OAK_DOOR}),J(W.SALOON_DOOR,`saloon_door`,{shape:U.SALOON_DOOR,tex:q(`saloon_door`),solid:!1,cutout:!0,sound:`wood`,hardness:.8,icon:`flat`,boxes:[]}),J(W.WALL_SIGN,`sign`,{shape:U.WALL_SIGN,tex:q(`sign`),solid:!1,sound:`wood`,hardness:.5,icon:`flat`,boxes:[]}),J(W.BED_HEAD,`bed`,{shape:U.BED,tex:[K(`bed_side`),K(`bed_side`),K(`bed_head_top`),K(`oak_planks`),K(`bed_end_head`),K(`bed_end_head`)],sound:`wood`,hardness:.6,icon:`slab`,boxes:[[0,0,0,1,.5625,1]]}),J(W.BED_FOOT,`bed_foot`,{shape:U.BED,tex:[K(`bed_side`),K(`bed_side`),K(`bed_foot_top`),K(`oak_planks`),K(`bed_side`),K(`bed_side`)],sound:`wood`,hardness:.6,icon:`slab`,boxes:[[0,0,0,1,.5625,1]],item:!1,drop:W.BED_HEAD}),J(W.WHITE_WOOL,`white_wool`,{tex:q(`wool_white`),sound:`cloth`,hardness:.6}),J(W.RED_WOOL,`red_wool`,{tex:q(`wool_red`),sound:`cloth`,hardness:.6}),J(W.BLUE_WOOL,`blue_wool`,{tex:q(`wool_blue`),sound:`cloth`,hardness:.6}),J(W.GREEN_WOOL,`green_wool`,{tex:q(`wool_green`),sound:`cloth`,hardness:.6}),J(W.CACTUS,`cactus`,{shape:U.CACTUS,tex:bu(`cactus_side`,`cactus_top`),cutout:!1,sound:`cloth`,hardness:.4,boxes:[[.0625,0,.0625,.9375,1,.9375]]}),J(W.PIANO,`piano`,{tex:[K(`piano_side`),K(`piano_side`),K(`piano_top`),K(`piano_side`),K(`piano_front`),K(`piano_side`)],sound:`wood`,hardness:1.2}),J(W.FURNACE,`furnace`,{tex:[K(`furnace_side`),K(`furnace_side`),K(`furnace_side`),K(`furnace_side`),K(`furnace_front`),K(`furnace_side`)],emit:13,hardness:2}),J(W.ANVIL,`anvil`,{shape:U.ANVIL,tex:bu(`anvil`,`anvil_top`),sound:`metal`,hardness:2.5,icon:`slab`,boxes:[[.125,0,.125,.875,1,.875]]}),J(W.CHEST,`chest`,{shape:U.CHEST,tex:[K(`chest_side`),K(`chest_side`),K(`chest_top`),K(`chest_top`),K(`chest_front`),K(`chest_side`)],sound:`wood`,hardness:1.2,boxes:[[.0625,0,.0625,.9375,.875,.9375]]}),J(W.COAL_ORE,`coal_ore`,{tex:q(`coal_ore`),hardness:2}),J(W.IRON_ORE,`iron_ore`,{tex:q(`iron_ore`),hardness:2}),J(W.GOLD_ORE,`gold_ore`,{tex:q(`gold_ore`),hardness:2}),J(W.GRAVESTONE,`gravestone`,{shape:U.GRAVESTONE,tex:q(`gravestone`),cutout:!0,hardness:1.5,icon:`flat`,boxes:[[.125,0,.375,.875,.75,.625]]}),J(W.GOLD_BLOCK,`gold_block`,{tex:q(`gold_block`),sound:`metal`,hardness:2}),J(W.IRON_BLOCK,`iron_block`,{tex:q(`iron_block`),sound:`metal`,hardness:2}),J(W.PUMPKIN,`pumpkin`,{tex:bu(`pumpkin_side`,`pumpkin_top`),sound:`wood`,hardness:.6}),J(W.TROUGH,`trough`,{displayName:`Water Trough`,shape:U.TROUGH,tex:bu(`spruce_planks`,`trough`,`spruce_planks`),sound:`wood`,hardness:1,icon:`slab`,boxes:[[0,0,0,1,.5,1]]}),J(W.TABLE,`table`,{shape:U.TABLE,tex:q(`spruce_planks`),sound:`wood`,hardness:1,boxes:[[0,.75,0,1,1,1],[.375,0,.375,.625,.75,.625]]}),J(W.SCORCHED_STONE,`scorched_stone`,{tex:q(`scorched_stone`),hardness:1.5,drop:W.COBBLESTONE}),J(W.ASH,`ash`,{tex:q(`ash`),sound:`sand`,hardness:.4}),J(W.MAGMA,`magma_block`,{tex:q(`magma`),emit:9,hardness:1.5}),J(W.CHARRED_PLANKS,`charred_planks`,{tex:q(`charred_planks`),sound:`wood`,hardness:.6});for(let e=0;e<256;e++)G[e]||(G[e]=G[W.AIR])}var Cu=[W.GRASS,W.DIRT,W.STONE,W.COBBLESTONE,W.SAND,W.GRAVEL,W.OAK_LOG,W.OAK_PLANKS,W.GLASS,W.BRICKS,W.STONE_BRICKS,W.SMOOTH_STONE,W.SANDSTONE,W.SPRUCE_LOG,W.SPRUCE_PLANKS,W.WHITE_PLANKS,W.STRIPPED_OAK,W.BIRCH_LOG,W.OAK_LEAVES,W.SPRUCE_LEAVES,W.BIRCH_LEAVES,W.OAK_SLAB,W.SPRUCE_SLAB,W.COBBLE_SLAB,W.STONE_BRICK_SLAB,W.OAK_FENCE,W.SPRUCE_FENCE,W.WHITE_FENCE,W.LANTERN,W.TORCH,W.RAIL,W.BARREL,W.CRATE,W.HAY_BALE,W.SHELF,W.BOOKSHELF,W.IRON_BARS,W.OAK_DOOR,W.SALOON_DOOR,W.WALL_SIGN,W.BED_HEAD,W.TABLE,W.CHEST,W.ANVIL,W.FURNACE,W.PIANO,W.WHITE_WOOL,W.RED_WOOL,W.BLUE_WOOL,W.GREEN_WOOL,W.PLASTER,W.DIRT_PATH,W.MUD,W.COARSE_DIRT,W.FARMLAND,W.CACTUS,W.DEAD_BUSH,W.TALL_GRASS,W.DANDELION,W.POPPY,W.PUMPKIN,W.TROUGH,W.GRAVESTONE,W.COAL_ORE,W.IRON_ORE,W.GOLD_ORE,W.GOLD_BLOCK,W.IRON_BLOCK,W.SNOW,W.SCORCHED_STONE,W.ASH,W.MAGMA,W.CHARRED_PLANKS],wu=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],Tu=.5*(Math.sqrt(3)-1),Eu=(3-Math.sqrt(3))/6,Du=1/3,Ou=1/6,ku=class{constructor(e=0){let t=new Dl(e),n=new Uint8Array(256);for(let e=0;e<256;e++)n[e]=e;for(let e=255;e>0;e--){let r=Math.floor(t.next()*(e+1)),i=n[e];n[e]=n[r],n[r]=i}this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(let e=0;e<512;e++)this.perm[e]=n[e&255],this.permMod12[e]=this.perm[e]%12}noise2(e,t){let n=this.perm,r=this.permMod12,i=0,a=0,o=0,s=(e+t)*Tu,c=Math.floor(e+s),l=Math.floor(t+s),u=(c+l)*Eu,d=e-(c-u),f=t-(l-u),p,m;d>f?(p=1,m=0):(p=0,m=1);let h=d-p+Eu,g=f-m+Eu,_=d-1+2*Eu,v=f-1+2*Eu,y=c&255,b=l&255,x=.5-d*d-f*f;if(x>=0){let e=wu[r[y+n[b]]];x*=x,i=x*x*(e[0]*d+e[1]*f)}let S=.5-h*h-g*g;if(S>=0){let e=wu[r[y+p+n[b+m]]];S*=S,a=S*S*(e[0]*h+e[1]*g)}let C=.5-_*_-v*v;if(C>=0){let e=wu[r[y+1+n[b+1]]];C*=C,o=C*C*(e[0]*_+e[1]*v)}return 70*(i+a+o)}noise3(e,t,n){let r=this.perm,i=this.permMod12,a=0,o=0,s=0,c=0,l=(e+t+n)*Du,u=Math.floor(e+l),d=Math.floor(t+l),f=Math.floor(n+l),p=(u+d+f)*Ou,m=e-(u-p),h=t-(d-p),g=n-(f-p),_,v,y,b,x,S;m>=h?h>=g?(_=1,v=0,y=0,b=1,x=1,S=0):m>=g?(_=1,v=0,y=0,b=1,x=0,S=1):(_=0,v=0,y=1,b=1,x=0,S=1):h<g?(_=0,v=0,y=1,b=0,x=1,S=1):m<g?(_=0,v=1,y=0,b=0,x=1,S=1):(_=0,v=1,y=0,b=1,x=1,S=0);let C=m-_+Ou,w=h-v+Ou,T=g-y+Ou,E=m-b+2*Ou,D=h-x+2*Ou,ee=g-S+2*Ou,O=m-1+3*Ou,k=h-1+3*Ou,te=g-1+3*Ou,ne=u&255,A=d&255,re=f&255,ie=.6-m*m-h*h-g*g;if(ie>=0){let e=wu[i[ne+r[A+r[re]]]];ie*=ie,a=ie*ie*(e[0]*m+e[1]*h+e[2]*g)}let ae=.6-C*C-w*w-T*T;if(ae>=0){let e=wu[i[ne+_+r[A+v+r[re+y]]]];ae*=ae,o=ae*ae*(e[0]*C+e[1]*w+e[2]*T)}let oe=.6-E*E-D*D-ee*ee;if(oe>=0){let e=wu[i[ne+b+r[A+x+r[re+S]]]];oe*=oe,s=oe*oe*(e[0]*E+e[1]*D+e[2]*ee)}let se=.6-O*O-k*k-te*te;if(se>=0){let e=wu[i[ne+1+r[A+1+r[re+1]]]];se*=se,c=se*se*(e[0]*O+e[1]*k+e[2]*te)}return 32*(a+o+s+c)}fbm2(e,t,n,r=2,i=.5){let a=1,o=1,s=0,c=0;for(let l=0;l<n;l++)s+=this.noise2(e*o,t*o)*a,c+=a,a*=i,o*=r;return s/c}ridge2(e,t){return 1-Math.abs(this.noise2(e,t))}},Au=16,ju=128,Mu={x0:-104,x1:104,z0:-78,z1:92},Nu={x:-128.5,z:.5},Pu={x:-130,z:0,r:20,h:9},Fu=class{constructor(e=1337){this.seed=e,this.nContinent=new ku(e+1),this.nHills=new ku(e+2),this.nDetail=new ku(e+3),this.nMountain=new ku(e+4),this.nRiver=new ku(e+5),this.nMoisture=new ku(e+6),this.nCave1=new ku(e+7),this.nCave2=new ku(e+8),this.nCavern=new ku(e+9),this.nPatch=new ku(e+10),this.overlays=[],this.heightCache=new Map}addOverlay(e){this.overlays.push(e)}townMask(e,t){let n=Mu,r=Math.max(n.x0-e,e-n.x1,0),i=Math.max(n.z0-t,t-n.z1,0);return 1-Al(0,36,Math.sqrt(r*r+i*i))}railMask(e,t){return 1-Al(2.5,16,Math.abs(t- -62))}rawHeight(e,t){let n=this.nContinent.fbm2(e*.0016,t*.0016,3),r=this.nHills.fbm2(e*.0075,t*.0075,4),i=this.nDetail.noise2(e*.035,t*.035),a=Al(.22,.75,this.nMountain.fbm2((e+3e3)*.0021,(t-2e3)*.0021,2)),o=55+n*9+r*7+i*1.6;if(a>0){let n=this.nMountain.ridge2((e+500)*.012,(t+500)*.012);o+=a*(18+n*30+r*8)}let s=1-Al(.012,.06,Math.abs(this.nRiver.noise2(e*.0032,t*.0032)+.12*this.nRiver.noise2(e*.018,t*.018)));if(s*=1-a,s>0){let e=Math.min(o,44+(1-s)*2);o=kl(o,e,s**.6)}return{h:o,mMask:a,riverT:s}}heightInfo(e,t){let n=e*100003+t,r=this.heightCache.get(n);if(r)return r;let i=this.rawHeight(e,t),a=i.h,o=this.townMask(e,t);o>0&&(a=kl(a,56,o));let s=this.railMask(e,t);s>0&&(a=kl(a,56,s));let c=e-Pu.x,l=t-Pu.z,u=(c*c+l*l)/(Pu.r*Pu.r);u<4&&(a+=Pu.h*Math.exp(-u*1.6)*(1-o));let d=this.nMoisture.fbm2(e*.004+50,t*.004-50,2);return r={h:Math.floor(a),mMask:i.mMask,riverT:i.riverT*(1-o)*(1-s),town:o,rail:s,moisture:d},this.heightCache.size>2e5&&this.heightCache.clear(),this.heightCache.set(n,r),r}biomeAt(e,t,n){return e.h>78+e.mMask*6?`mountain`:e.moisture<-.42&&e.mMask<.2?`dry`:e.moisture>.18?`forest`:`plains`}generateChunk(e){let t=e.blocks,n=e.cx*Au,r=e.cz*Au,i=new Int16Array(Au*Au),a=Array(Au*Au);for(let e=0;e<Au;e++)for(let t=0;t<Au;t++){let o=n+e,s=r+t,c=this.heightInfo(o,s);a[e*Au+t]=c,i[e*Au+t]=c.h}for(let e=0;e<Au;e++)for(let i=0;i<Au;i++){let o=n+e,s=r+i,c=a[e*Au+i],l=Ol(c.h,1,ju-2),u=this.biomeAt(c,o,s),d=(e*Au+i)*ju,f=l<=49,p=this.nPatch.noise2(o*.06,s*.06),m=W.GRASS,h=W.DIRT,g=3+Math.floor(B(o,s,9)*2);u===`mountain`?(l>96?(m=W.SNOW,h=W.STONE):(m=p>.45?W.GRAVEL:W.STONE,h=W.STONE),l<84&&p<-.3&&(m=W.GRASS,h=W.DIRT)):u===`dry`?(m=W.SAND,h=W.SANDSTONE,g=3,p>.55&&(m=W.COARSE_DIRT,h=W.DIRT)):p>.68&&c.town<.3?m=W.GRAVEL:p<-.72&&c.town<.3&&(m=W.COARSE_DIRT),f&&c.town<.5&&(m=W.SAND,h=W.SAND,g=2),l<45&&(m=B(o,s,3)<.4?W.GRAVEL:W.DIRT,h=W.DIRT),Math.abs(s)<=2&&c.town<.999&&(o<-60&&o>-300||o>60&&o<300)&&!f&&u!==`mountain`&&(Math.abs(s)===2&&B(o,s,11)<.35||(m=W.DIRT_PATH));let _=!1;c.rail>.999&&Math.abs(s- -62)<=1&&(m=W.GRAVEL,h=W.GRAVEL,_=s===-62),t[d]=W.BEDROCK;for(let e=1;e<=l;e++){let n;if(e===l)n=m;else if(e>l-g)n=h;else{n=W.STONE;let t=El(o>>1,e>>1,s>>1,31);t<.018&&e<110?n=W.COAL_ORE:t<.026&&e<60?n=W.IRON_ORE:t<.0285&&e<30?n=W.GOLD_ORE:e<5&&El(o,e,s,5)<.5?n=W.BEDROCK:El(o>>2,e>>2,s>>2,41)<.05&&(n=W.GRAVEL)}t[d+e]=n}let v=(o-Nu.x)*(o-Nu.x)+(s-Nu.z)*(s-Nu.z);if(c.town<.6&&l>49&&v>2025){let e=Math.min(l,ju-2);for(let n=6;n<=e;n++){let r=this.nCave1.noise3(o*.042,n*.085,s*.042),i=this.nCave2.noise3(o*.042+77,n*.085,s*.042-77),a=.003;if(n>e-5&&(a=7e-4),r*r+i*i<a){t[d+n]=W.AIR;continue}n<40&&this.nCavern.noise3(o*.021,n*.035,s*.021)>.66&&(t[d+n]=W.AIR)}}if(l<48)for(let e=l+1;e<=48;e++)t[d+e]=W.WATER;if(_&&(t[d+l+1]=W.RAIL,o%3==0&&(t[d+l]=W.SPRUCE_PLANKS)),l>=49&&t[d+l]===W.GRASS&&t[d+l+1]===W.AIR){let e=B(o,s,77),n=u===`forest`?.16:.12,r=1-c.town*.85;e<n*r?t[d+l+1]=W.TALL_GRASS:e<(n+.018)*r&&(t[d+l+1]=B(o,s,78)<.55?W.DANDELION:W.POPPY)}else if(t[d+l]===W.SAND&&u===`dry`&&l>49&&t[d+l+1]===W.AIR){let e=B(o,s,79);if(e<.012){let e=1+Math.floor(B(o,s,80)*3);for(let n=1;n<=e;n++)t[d+l+n]=W.CACTUS}else e<.03&&(t[d+l+1]=W.DEAD_BUSH)}}this.placeTrees(e,i),this.applyOverlays(e)}placeTrees(e,t){let n=e.cx*Au,r=e.cz*Au;for(let t=e.cx-1;t<=e.cx+1;t++)for(let i=e.cz-1;i<=e.cz+1;i++){let a=this.treesForChunk(t,i);for(let t of a)this.stampTree(e,t,n,r)}for(let t=e.cx-1;t<=e.cx+1;t++)for(let i=e.cz-1;i<=e.cz+1;i++){if(B(t,i,501)>.18)continue;let a=t*Au+Math.floor(B(t,i,502)*Au),o=i*Au+Math.floor(B(t,i,503)*Au),s=this.heightInfo(a,o);if(s.town>.05||s.rail>.05||s.h<=49||s.riverT>.1)continue;let c=1+Math.floor(B(a,o,504)*2);for(let t=-c;t<=c;t++)for(let i=-c;i<=c;i++)for(let l=0;l<=c;l++){if(El(a+t,l,o+i,505)<.3&&(Math.abs(t)===c||Math.abs(i)===c||l===c))continue;let u=a+t-n,d=o+i-r;if(u<0||d<0||u>=Au||d>=Au)continue;let f=this.heightInfo(a+t,o+i).h,p=s.h+l;p<f||(e.blocks[(u*Au+d)*ju+p]=El(t,l,i,506)<.6?W.COBBLESTONE:W.STONE)}}}treesForChunk(e,t){let n=[],r=e*Au,i=t*Au,a=this.heightInfo(r+8,i+8),o=this.biomeAt(a,r+8,i+8),s=o===`forest`?7:o===`plains`?1:o===`mountain`?2:0;o===`plains`&&B(e,t,600)<.45&&(s=0);for(let a=0;a<s;a++){let o=r+Math.floor(B(e*3+a,t,601)*Au),s=i+Math.floor(B(e,t*3+a,602)*Au),c=this.heightInfo(o,s);if(c.town>.02||c.rail>.02||c.riverT>.05||c.h<=49)continue;let l=this.biomeAt(c,o,s);if(l===`dry`||l===`mountain`&&c.h>88)continue;let u=B(o,s,603),d=`oak`;d=l===`mountain`||c.h>70?u<.8?`spruce`:`oak`:l===`forest`?u<.65?`oak`:u<.85?`birch`:`spruce`:u<.85?`oak`:`birch`;let f=d===`spruce`?7+Math.floor(B(o,s,604)*4):4+Math.floor(B(o,s,604)*3);n.push({x:o,z:s,y:c.h+1,type:d,trunk:f})}return n}stampTree(e,t,n,r){let i=(t,i,a,o,s=!0)=>{let c=t-n,l=a-r;if(c<0||l<0||c>=Au||l>=Au||i<0||i>=ju)return;let u=(c*Au+l)*ju+i;s&&e.blocks[u]!==W.AIR||(e.blocks[u]=o)},a=t.type===`spruce`?W.SPRUCE_LOG:t.type===`birch`?W.BIRCH_LOG:W.OAK_LOG,o=t.type===`spruce`?W.SPRUCE_LEAVES:t.type===`birch`?W.BIRCH_LEAVES:W.OAK_LEAVES,s=t.y+t.trunk-1;if(t.type===`spruce`){for(let e=0;;e++){let n=s+1-e;if(n<t.y+2)break;let r;r=e===0?0:e%2==1?1:e>=6?3:2;for(let e=-r;e<=r;e++)for(let a=-r;a<=r;a++)r>1&&Math.abs(e)===r&&Math.abs(a)===r||i(t.x+e,n,t.z+a,o)}for(let e=t.y;e<=s;e++)i(t.x,e,t.z,a,!1);i(t.x,t.y-1,t.z,W.DIRT,!1)}else{for(let e=-2;e<=1;e++){let n=s+e,r=e<=-1?2:1;for(let a=-r;a<=r;a++)for(let s=-r;s<=r;s++)Math.abs(a)===r&&Math.abs(s)===r&&(e===1||El(t.x+a,n,t.z+s,610)<.45)||i(t.x+a,n,t.z+s,o)}for(let e=t.y;e<=s;e++)i(t.x,e,t.z,a,!1);i(t.x,t.y-1,t.z,W.DIRT,!1)}}applyOverlays(e){let t=e.cx*Au,n=e.cz*Au;for(let r of this.overlays){if(t+Au<=r.x0||t>=r.x0+r.w||n+Au<=r.z0||n>=r.z0+r.d)continue;let i=Math.max(0,r.x0-t),a=Math.min(Au,r.x0+r.w-t),o=Math.max(0,r.z0-n),s=Math.min(Au,r.z0+r.d-n);for(let c=i;c<a;c++)for(let i=o;i<s;i++){let a=t+c-r.x0,o=n+i-r.z0,s=(a*r.d+o)*r.h,l=(c*Au+i)*ju;for(let t=0;t<r.h;t++){let n=r.blocks[s+t];if(n===0)continue;let i=r.y0+t;i<0||i>=ju||(e.blocks[l+i]=n===255?W.AIR:n)}}}}surfaceHeight(e,t){return this.heightInfo(e,t).h}},Iu=class{constructor(e,t){this.cx=e,this.cz=t,this.blocks=new Uint8Array(32768),this.sky=new Uint8Array(32768),this.light=new Uint8Array(32768),this.generated=!1,this.lit=!1,this.dirty=!0,this.mesh=null,this.waterMesh=null,this.meshed=!1}},Lu=class{constructor(e=1<<18){this.a=new Int32Array(e*4),this.head=0,this.tail=0}push(e,t,n,r=0){if(this.tail+4>this.a.length&&(this.head>0&&(this.a.copyWithin(0,this.head,this.tail),this.tail-=this.head,this.head=0),this.tail+4>this.a.length)){let e=new Int32Array(this.a.length*2);e.set(this.a.subarray(0,this.tail)),this.a=e}let i=this.a,a=this.tail;i[a]=e,i[a+1]=t,i[a+2]=n,i[a+3]=r,this.tail=a+4}get empty(){return this.head>=this.tail}reset(){this.head=0,this.tail=0}},Ru=class e{constructor(e){this.gen=e,this.chunks=new Map,this.addQueue=new Lu,this.removeQueue=new Lu,this.signTiles=new Map,this.onChunkDirty=null}static key(e,t){return e*1e5+t}static posKey(e,t,n){return((e+1048576)*2097152+(n+1048576))*256+t}getChunk(t,n){return this.chunks.get(e.key(t,n))}chunkAt(t,n){return this.chunks.get(e.key(Math.floor(t/16),Math.floor(n/16)))}getOrCreateChunk(t,n){let r=this.getChunk(t,n);return r||(r=new Iu(t,n),this.chunks.set(e.key(t,n),r)),r}getBlock(t,n,r){if(n<0)return W.BEDROCK;if(n>=128)return W.AIR;let i=this.chunks.get(e.key(Math.floor(t/16),Math.floor(r/16)));return!i||!i.generated?W.AIR:i.blocks[((t&15)*16+(r&15))*128+n]}getBlockDef(e,t,n){return G[this.getBlock(e,t,n)]}isLoaded(e,t){let n=this.chunkAt(e,t);return!!(n&&n.generated)}getSky(e,t,n){if(t>=128)return 15;if(t<0)return 0;let r=this.chunkAt(e,n);return!r||!r.lit?15:r.sky[((e&15)*16+(n&15))*128+t]}getLight(e,t,n){if(t>=128||t<0)return 0;let r=this.chunkAt(e,n);return!r||!r.lit?0:r.light[((e&15)*16+(n&15))*128+t]}sampleLight(e,t,n){let r=Math.floor(e),i=Math.floor(t),a=Math.floor(n),o=this.getSky(r,i,a),s=this.getLight(r,i,a);return G[this.getBlock(r,i,a)].opaque&&(o=this.getSky(r,i+1,a),s=this.getLight(r,i+1,a)),[o/15,s/15]}markDirty(e,t,n){let r=Math.floor(e/16),i=Math.floor(n/16),a=e&15,o=n&15;this._dirty(r,i),a===0&&this._dirty(r-1,i),a===15&&this._dirty(r+1,i),o===0&&this._dirty(r,i-1),o===15&&this._dirty(r,i+1),a===0&&o===0&&this._dirty(r-1,i-1),a===15&&o===0&&this._dirty(r+1,i-1),a===0&&o===15&&this._dirty(r-1,i+1),a===15&&o===15&&this._dirty(r+1,i+1)}_dirty(e,t){let n=this.getChunk(e,t);n&&(n.dirty=!0)}setBlock(t,n,r,i,a=!1){if(n<0||n>=128)return!1;let o=this.chunkAt(t,r);if(!o||!o.generated)return!1;let s=((t&15)*16+(r&15))*128+n,c=o.blocks[s];return c!==i&&(o.blocks[s]=i,i!==W.WALL_SIGN&&this.signTiles.delete(e.posKey(t,n,r)),this.markDirty(t,n,r),o.lit&&this.updateLight(t,n,r,c,i),!a&&this.onChunkDirty&&this.onChunkDirty(t,n,r),!0)}chunkKeyAt(t,n){return e.key(Math.floor(t/16),Math.floor(n/16))}setBlockRaw(t,n,r,i){if(n<0||n>=128)return!1;let a=this.chunkAt(t,r);if(!a||!a.generated)return!1;let o=((t&15)*16+(r&15))*128+n,s=a.blocks[o];return s!==i&&(a.blocks[o]=i,s===W.WALL_SIGN&&this.signTiles.delete(e.posKey(t,n,r)),a.needsRelight=!0,this.markDirty(t,n,r),!0)}relightChunk(e){if(!(!e||!e.generated)){this.lightChunk(e),e.needsRelight=!1;for(let t=-1;t<=1;t++)for(let n=-1;n<=1;n++){let r=this.getChunk(e.cx+t,e.cz+n);r&&(r.dirty=!0)}}}updateLight(e,t,n,r,i){let a=G[r],o=G[i];for(let r=0;r<2;r++){let i=this.chunkAt(e,n),s=((e&15)*16+(n&15))*128+t,c=r===0?i.sky:i.light,l=o.opaque||o.lightOpacity>a.lightOpacity||r===1&&o.emit<a.emit;if(this.addQueue.reset(),this.removeQueue.reset(),l){let i=c[s];i>0&&(c[s]=0,this.removeQueue.push(e,t,n,i)),this.runRemoval(r)}if(!o.opaque){for(let r=0;r<6;r++)this.addQueue.push(e+Rl[r][0],t+Rl[r][1],n+Rl[r][2]);r===1&&o.emit>c[s]&&(c[s]=o.emit,this.addQueue.push(e,t,n))}this.propagate(r)}}runRemoval(e){let t=this.removeQueue,n=this.addQueue;for(;!t.empty;){let r=t.a,i=t.head,a=r[i],o=r[i+1],s=r[i+2],c=r[i+3];t.head=i+4;for(let r=0;r<6;r++){let i=a+Rl[r][0],l=o+Rl[r][1],u=s+Rl[r][2];if(l<0||l>=128)continue;let d=this.chunkAt(i,u);if(!d||!d.lit)continue;let f=((i&15)*16+(u&15))*128+l,p=G[d.blocks[f]];if(p.opaque)continue;let m=e===0?d.sky:d.light,h=m[f];if(h===0)continue;let g=c-1-p.lightOpacity;e===0&&r===3&&c===15&&p.lightOpacity===0&&(g=15),h<=g?(m[f]=0,t.push(i,l,u,h),this.markDirty(i,l,u)):n.push(i,l,u)}}}propagate(t){let n=this.addQueue,r=null,i=null;for(;!n.empty;){let a=n.a,o=n.head,s=a[o],c=a[o+1],l=a[o+2];if(n.head=o+4,c<0||c>=128)continue;let u=Math.floor(s/16),d=Math.floor(l/16),f=e.key(u,d),p;if(f===i?p=r:(p=this.chunks.get(f),r=p,i=f),!p||!p.lit)continue;let m=((s&15)*16+(l&15))*128+c,h=(t===0?p.sky:p.light)[m];if(!(h<=1))for(let e=0;e<6;e++){let r=s+Rl[e][0],i=c+Rl[e][1],a=l+Rl[e][2];if(i<0||i>=128)continue;let o=p;if((r>>4!==u||a>>4!==d)&&(o=this.chunkAt(r,a),!o||!o.lit))continue;let f=((r&15)*16+(a&15))*128+i,m=G[o.blocks[f]];if(m.opaque)continue;let g=h-1-m.lightOpacity;if(t===0&&e===3&&h===15&&m.lightOpacity===0&&(g=15),g<=0)continue;let _=t===0?o.sky:o.light;_[f]<g&&(_[f]=g,n.push(r,i,a),!(r&15)||(r&15)==15||!(a&15)||(a&15)==15?this.markDirty(r,i,a):o.dirty=!0)}}}lightChunk(e){let t=e.blocks,n=e.sky,r=e.light;n.fill(0),r.fill(0);let i=e.cx*16,a=e.cz*16;for(let e=0;e<16;e++)for(let i=0;i<16;i++){let a=(e*16+i)*128,o=15;for(let e=127;e>=0;e--){let i=G[t[a+e]];i.opaque?o=0:o===15&&i.lightOpacity===0||(o=Math.max(0,o-1-i.lightOpacity)),n[a+e]=o,i.emit>0&&(r[a+e]=i.emit)}}e.lit=!0;let o=this.addQueue;o.reset();for(let e=0;e<16;e++)for(let r=0;r<16;r++){let s=(e*16+r)*128;for(let c=1;c<128;c++){let l=n[s+c];if(l<=1)continue;let u=!1;if(e>0){let e=s-2048+c;!G[t[e]].opaque&&n[e]<l-1&&(u=!0)}if(!u&&e<15){let e=s+2048+c;!G[t[e]].opaque&&n[e]<l-1&&(u=!0)}if(!u&&r>0){let e=s-128+c;!G[t[e]].opaque&&n[e]<l-1&&(u=!0)}if(!u&&r<15){let e=s+128+c;!G[t[e]].opaque&&n[e]<l-1&&(u=!0)}if(!u&&c>0){let e=s+c-1;!G[t[e]].opaque&&n[e]<l-1&&(u=!0)}!u&&(e===0||e===15||r===0||r===15)&&(u=!0),u&&o.push(i+e,c,a+r)}}this.seedFromNeighbors(e,0),this.propagate(0),o.reset();for(let e=0;e<16;e++)for(let t=0;t<16;t++){let n=(e*16+t)*128;for(let s=0;s<128;s++)r[n+s]>0&&o.push(i+e,s,a+t)}this.seedFromNeighbors(e,1),this.propagate(1),e.dirty=!0}seedFromNeighbors(e,t){let n=this.addQueue;e.cx*16,e.cz*16;let r=[[e.cx-1,e.cz,15,-1],[e.cx+1,e.cz,0,-1],[e.cx,e.cz-1,-1,15],[e.cx,e.cz+1,-1,0]];for(let[e,i,a,o]of r){let r=this.getChunk(e,i);if(!r||!r.lit)continue;let s=t===0?r.sky:r.light;for(let t=0;t<16;t++){let r=a>=0?a:t,c=o>=0?o:t,l=(r*16+c)*128;for(let t=0;t<128;t++)s[l+t]>1&&n.push(e*16+r,t,i*16+c)}}}surfaceY(e,t){for(let n=127;n>=0;n--){let r=G[this.getBlock(e,n,t)];if(r.solid||r.id===W.WATER)return n}return-1}},zu=class{constructor(e,t,n,r,i,a){this.x0=e,this.z0=t,this.w=n,this.d=r,this.y0=i,this.h=a,this.blocks=new Uint8Array(n*r*a),this.signs=[],this.smoke=[],this.pois=[],this.buildings=[],this.lamps=[],this.animalSpawns=[],this.npcHomes=[]}inBounds(e,t,n){return e>=this.x0&&e<this.x0+this.w&&n>=this.z0&&n<this.z0+this.d&&t>=this.y0&&t<this.y0+this.h}idx(e,t,n){return((e-this.x0)*this.d+(n-this.z0))*this.h+(t-this.y0)}set(e,t,n,r){this.inBounds(e,t,n)&&(this.blocks[this.idx(e,t,n)]=r===W.AIR?255:r)}get(e,t,n){if(!this.inBounds(e,t,n))return 0;let r=this.blocks[this.idx(e,t,n)];return r===255?W.AIR:r}isSet(e,t,n){return this.inBounds(e,t,n)&&this.blocks[this.idx(e,t,n)]!==0}fill(e,t,n,r,i,a,o){e>r&&([e,r]=[r,e]),t>i&&([t,i]=[i,t]),n>a&&([n,a]=[a,n]);for(let s=e;s<=r;s++)for(let e=n;e<=a;e++)for(let n=t;n<=i;n++)this.set(s,n,e,o)}overlay(){return{x0:this.x0,z0:this.z0,w:this.w,d:this.d,y0:this.y0,h:this.h,blocks:this.blocks}}},Bu=class{constructor(e,t,n,r){switch(this.s=e,this.ox=t,this.oz=n,this.facing=r,r){case`S`:this.ux=1,this.uz=0,this.vx=0,this.vz=-1;break;case`N`:this.ux=1,this.uz=0,this.vx=0,this.vz=1;break;case`E`:this.ux=0,this.uz=1,this.vx=-1,this.vz=0;break;default:this.ux=0,this.uz=1,this.vx=1,this.vz=0}}wx(e,t){return this.ox+e*this.ux+t*this.vx}wz(e,t){return this.oz+e*this.uz+t*this.vz}world(e,t){return[this.wx(e,t),this.wz(e,t)]}set(e,t,n,r){this.s.set(this.wx(e,n),t,this.wz(e,n),r)}get(e,t,n){return this.s.get(this.wx(e,n),t,this.wz(e,n))}fill(e,t,n,r,i,a,o){e>r&&([e,r]=[r,e]),n>a&&([n,a]=[a,n]),t>i&&([t,i]=[i,t]);for(let s=e;s<=r;s++)for(let e=n;e<=a;e++)for(let n=t;n<=i;n++)this.set(s,n,e,o)}walls(e,t,n,r,i,a,o){this.fill(e,t,n,r,i,n,o),this.fill(e,t,a,r,i,a,o),this.fill(e,t,n,e,i,a,o),this.fill(r,t,n,r,i,a,o)}door(e,t,n,r=W.OAK_DOOR){this.set(e,t,n,r||W.AIR),this.set(e,t+1,n,r===W.SALOON_DOOR||!r?W.AIR:r),r===W.SALOON_DOOR&&this.set(e,t+1,n,W.AIR)}window(e,t,n,r=2){for(let i=0;i<r;i++)this.set(e,t+i,n,W.GLASS)}sign(e,t,n,r,i=!1){let a=Math.max(1,Math.ceil((ql(r)+2)/16)),o=e-Math.floor((a-1)/2),s=[];for(let e=0;e<a;e++){let r=o+e,[a,c]=this.world(r,i?n+1:n-1);this.s.set(a,t,c,W.WALL_SIGN),s.push([a,c])}let c=this.facing===`N`||this.facing===`E`;i&&(c=!c),c&&s.reverse(),this.s.signs.push({y:t,text:r,order:s})}lantern(e,t,n){this.set(e,t,n,W.LANTERN)}awning(e,t,n,r=2,i=W.SPRUCE_SLAB,a=W.SPRUCE_FENCE,o=null){for(let a=e;a<=t;a++)for(let e=-1;e>=-r;e--)this.set(a,n,e,i);if(o!==null){for(let i=e;i<=t;i+=Math.max(2,Math.min(4,t-e)))for(let e=o;e<n;e++)this.set(i,e,-r,a);if((t-e)%4!=0)for(let e=o;e<n;e++)this.set(t,e,-r,a)}}falseFront(e,t,n,r,i,a,o){this.fill(e,n+1,i,t,n+r,i,a);for(let a=e;a<=t;a++)this.set(a,n+r+1,i,o);this.set(e,n+r+1,i,W.AIR),this.set(t,n+r+1,i,W.AIR),this.set(e,n+r,i,o),this.set(t,n+r,i,o)}gableRoof(e,t,n,r,i,a,o){let s=r-n+1,c=Math.ceil(s/2);for(let s=0;s<c;s++){let c=n+s,l=r-s,u=i+Math.floor(s/2),d=+(s===0);for(let n=e-d;n<=t+d;n++)s%2==0?(this.set(n,u,c,a),this.set(n,u,l,a)):(this.set(n,u,c,a),this.set(n,u,l,a),this.set(n,u+1,c,o),this.set(n,u+1,l,o));for(let n=c+1;n<l;n++)this.set(e,u,n,a),this.set(t,u,n,a),s%2==1&&(this.set(e,u+1,n,a),this.set(t,u+1,n,a))}let l=i+Math.floor((c-1)/2)+ +((c-1)%2==1),u=n+c-1,d=r-c+1;for(let n=e;n<=t;n++)for(let e=u;e<=d;e++)this.set(n,l+ +((c-1)%2==0),e,o)}flatRoof(e,t,n,r,i,a,o=W.SPRUCE_SLAB){this.fill(e,i,n,t,i,r,a);for(let a=e;a<=t;a++)this.set(a,i+1,n,o),this.set(a,i+1,r,o);for(let a=n;a<=r;a++)this.set(e,i+1,a,o),this.set(t,i+1,a,o)}chimney(e,t,n,r,i=W.BRICKS){for(let a=n;a<=r;a++)this.set(e,a,t,i);let[a,o]=this.world(e,t);this.s.smoke.push({x:a,y:r,z:o})}poi(e,t,n,r,i={}){let[a,o]=this.world(t,r),s={kind:e,x:a,y:n,z:o,...i};return this.s.pois.push(s),s}spot(e,t,n){let[r,i]=this.world(e,n);return{x:r,y:t,z:i}}},Vu=W.OAK_PLANKS,Hu=W.SPRUCE_PLANKS,Uu=W.WHITE_PLANKS;function Wu(e,t,n,r,i,a){let o={name:t,kind:n,floorY:r+1,spots:[],door:null,inside:null,bounds:null,beds:[],work:[]},[s,c]=e.world(0,0),[l,u]=e.world(i-1,a-1);return o.bounds={x0:Math.min(s,l),x1:Math.max(s,l),z0:Math.min(c,u),z1:Math.max(c,u)},e.s.buildings.push(o),o}function Y(e,t,n,r,i,a=`spots`){let[o,s]=e.world(n,r);t[a].push({x:o,y:i,z:s})}function Gu(e,t,n,r,i){let[a,o]=e.world(n,r-1),[s,c]=e.world(n,r+1);t.door={x:a,y:i,z:o},t.inside={x:s,y:i,z:c}}function Ku(e,t,n,r,i,a,o){for(let a=0;a<10;a++){let s=r+a,c=n+1+Math.floor(a/2);for(let r=n+1;r<c;r++)e.set(t,r,s,o);e.set(t,c,s,a%2==0?i:o),a>=2&&a<=7?(e.set(t,n+5,s,W.AIR),e.set(t,n+6,s,W.AIR)):a>7&&e.set(t,n+6,s,W.AIR)}}function qu(e,t,n){let r=n.w,i=n.d,a=n.floors||1,o=n.wall??Vu,s=n.trim??W.STRIPPED_OAK,c=n.floorBlock??Vu,l=t+5*a;e.fill(0,t,0,r-1,l+6,i-1,W.AIR),e.fill(0,t-1,0,r-1,t-1,i-1,n.foundation??W.COBBLESTONE),e.fill(0,t,0,r-1,t,i-1,c);for(let l=0;l<a;l++){let u=t+1+l*5,d=u+3;e.walls(0,u,0,r-1,d,i-1,o);for(let[t,n]of[[0,0],[r-1,0],[0,i-1],[r-1,i-1]])e.fill(t,u,n,t,d,n,s);if(l<a-1&&(e.fill(0,d+1,0,r-1,d+1,i-1,c),e.walls(0,d+1,0,r-1,d+1,i-1,s)),n.windows!==!1){let t=n.windowsU||[2,r-3];for(let i of t)i>0&&i<r-1&&i!==(n.doorU??Math.floor(r/2))&&e.window(i,u+1,0,2);if(l>0||n.frontOnly!==!0){for(let t=3;t<i-2;t+=4)e.window(0,u+1,t,2),e.window(r-1,u+1,t,2);for(let t=2;t<r-2;t+=5)(l>0||t!==(n.backDoorU??-99))&&e.window(t,u+1,i-1,2)}}}if(n.roof===`gable`?e.gableRoof(0,r-1,0,i-1,l,n.roofBlock??Hu,n.roofSlab??W.SPRUCE_SLAB):e.flatRoof(0,r-1,0,i-1,l,n.roofBlock??Hu,n.roofSlab??W.SPRUCE_SLAB),n.falseFront!==!1&&n.roof!==`gable`)e.falseFront(0,r-1,l,n.falseFrontH??2,0,o,n.roofSlab??W.SPRUCE_SLAB);else if(n.falseFront!==!1&&n.roof===`gable`){e.fill(0,l+1,0,r-1,l+2,0,o);for(let t=0;t<=r-1;t++)e.set(t,l+3,0,W.SPRUCE_SLAB)}let u=n.doorU??Math.floor(r/2);if(e.door(u,t+1,0,n.doorId===void 0?W.OAK_DOOR:n.doorId),n.doubleDoor&&e.door(u+1,t+1,0,n.doorId===void 0?W.OAK_DOOR:n.doorId),n.backDoorU!==void 0&&(e.door(n.backDoorU,t+1,i-1,W.OAK_DOOR),e.set(n.backDoorU,t,i,W.OAK_SLAB)),a>=2&&n.balcony!==!1){e.fill(0,t+5,-1,r-1,t+5,-2,c);for(let n=0;n<=r-1;n++)e.set(n,t+6,-2,W.OAK_FENCE);e.set(0,t+6,-1,W.OAK_FENCE),e.set(r-1,t+6,-1,W.OAK_FENCE);for(let n of[0,r-1])e.fill(n,t+1,-2,n,t+4,-2,s),e.fill(n,t+7,-2,n,t+9,-2,s);for(let n=4;n<r-1;n+=4)e.fill(n,t+1,-2,n,t+4,-2,W.SPRUCE_FENCE);e.fill(0,t+10,-1,r-1,t+10,-2,W.SPRUCE_SLAB),e.door(u,t+6,0,W.OAK_DOOR),e.lantern(1,t+4,-1),e.lantern(r-2,t+4,-1)}else n.awning!==!1&&(e.awning(0,r-1,t+5,2,n.roofSlab??W.SPRUCE_SLAB,W.SPRUCE_FENCE,t+1),e.lantern(1,t+4,-1),e.lantern(r-2,t+4,-1));if(n.sign){let t=l+1;e.sign(u,t,0,n.sign)}let d=Wu(e,n.name||n.sign||`building`,n.kind||`shop`,t,r,i);return Gu(e,d,u,0,t+1),d}function Ju(e,t){let n=qu(e,t,{w:27,d:16,floors:2,wall:Vu,trim:W.SPRUCE_LOG,roof:`flat`,sign:`SALOON`,doorU:13,doorId:W.SALOON_DOOR,doubleDoor:!1,name:`Saloon`,kind:`saloon`,windowsU:[3,6,9,17,20,23],backDoorU:4});e.door(13,t+1,0,W.SALOON_DOOR),e.fill(8,t+1,12,22,t+1,12,Hu),e.fill(8,t+2,12,22,t+2,12,W.SPRUCE_SLAB),e.fill(8,t+1,14,22,t+3,14,W.SHELF),e.fill(9,t+4,14,21,t+4,14,Hu);for(let n=9;n<=21;n+=3)e.lantern(n,t+4,11);Y(e,n,12,13,t+1,`work`),Y(e,n,18,13,t+1,`work`);for(let r=8;r<=22;r+=2)Y(e,n,r,11,t+1);for(let[r,i]of[[4,4],[4,9],[9,6],[17,6],[22,4],[22,9],[9,9],[17,9]])e.set(r,t+1,i,W.TABLE),e.set(r-1,t+1,i,W.SPRUCE_SLAB),e.set(r+1,t+1,i,W.SPRUCE_SLAB),Y(e,n,r-1,i,t+1),Y(e,n,r+1,i,t+1),Y(e,n,r,i-1,t+1);e.set(2,t+1,12,W.PIANO),e.set(1,t+1,12,W.SPRUCE_SLAB),Y(e,n,1,11,t+1,`work`);{let[t,r]=e.world(2,12);n.piano={x:t,z:r}}e.fill(1,t+1,8,4,t+1,10,W.SPRUCE_SLAB);for(let[n,r]of[[7,5],[13,5],[19,5],[7,11],[19,11]])e.lantern(n,t+4,r);Ku(e,25,t,2,W.OAK_SLAB,W.OAK_SLAB_TOP,Vu),e.fill(24,t+1,2,24,t+3,9,W.OAK_FENCE);let r=t+5;e.fill(1,r+1,6,24,r+3,6,Vu);for(let t=1;t<=25;t++)t%6==3&&e.door(t,r+1,6,W.OAK_DOOR);for(let t=6;t<25;t+=6)e.fill(t,r+1,7,t,r+3,14,Vu);for(let t=1;t<25;t+=6)e.set(t+1,r+1,13,W.BED_FOOT),e.set(t+1,r+1,14,W.BED_HEAD),e.set(t+3,r+1,14,W.CHEST),e.lantern(t+2,r+4,12),Y(e,n,t+3,12,r+1,`beds`);for(let t=3;t<24;t+=5)e.lantern(t,r+4,3);for(let t=5;t<23;t+=6)Y(e,n,t,3,r+1);return e.sign(6,t+11,0,`ROOMS`),e.sign(20,t+11,0,`WHISKEY`),n.barSpots=n.spots.slice(0,8),n}function Yu(e,t){let n=qu(e,t,{w:16,d:12,floors:1,wall:W.STONE_BRICKS,trim:W.COBBLESTONE,floorBlock:W.SMOOTH_STONE,roof:`flat`,roofBlock:W.STONE_BRICKS,roofSlab:W.STONE_BRICK_SLAB,sign:`SHERIFF`,doorU:4,name:`Sheriff's Office`,kind:`sheriff`,windowsU:[8,12],frontOnly:!0,foundation:W.STONE_BRICKS});e.set(3,t+1,4,W.TABLE),e.set(4,t+1,4,W.TABLE),e.set(3,t+1,5,W.SPRUCE_SLAB),e.fill(1,t+1,10,3,t+2,10,W.BOOKSHELF),e.fill(1,t+1,1,1,t+2,2,W.SHELF),e.set(8,t+1,1,W.CHEST),Y(e,n,3,5,t+1,`work`),Y(e,n,5,3,t+1),Y(e,n,2,8,t+1),Y(e,n,6,8,t+1),e.fill(8,t+1,1,8,t+3,10,W.IRON_BARS),e.fill(8,t+1,6,14,t+3,6,W.STONE_BRICKS),e.set(8,t+1,3,W.OAK_DOOR),e.set(8,t+2,3,W.OAK_DOOR),e.set(8,t+1,9,W.OAK_DOOR),e.set(8,t+2,9,W.OAK_DOOR);for(let r of[1,7])e.set(13,t+1,r+1,W.BED_FOOT),e.set(14,t+1,r+1,W.BED_HEAD),e.set(14,t+1,r+3,W.BARREL),Y(e,n,12,r+2,t+1,`beds`);for(let n of[2,8])e.set(15,t+2,n,W.IRON_BARS),e.set(15,t+3,n,W.IRON_BARS);return e.lantern(4,t+4,6),e.lantern(12,t+4,3),e.lantern(12,t+4,9),e.sign(11,t+6,0,`JAIL`),n}function Xu(e,t){let n=qu(e,t,{w:15,d:13,floors:1,wall:Vu,trim:W.SPRUCE_LOG,roof:`flat`,sign:`GENERAL STORE`,doorU:7,name:`General Store`,kind:`store`,windowsU:[2,4,10,12],falseFrontH:3});e.fill(2,t+1,9,12,t+1,9,Hu),e.fill(2,t+2,9,12,t+2,9,W.SPRUCE_SLAB),e.fill(1,t+1,11,13,t+3,11,W.SHELF),e.fill(1,t+1,2,1,t+3,7,W.BOOKSHELF),e.fill(13,t+1,2,13,t+3,7,W.SHELF);for(let[n,r]of[[4,4],[5,4],[9,5],[10,5],[4,8]])e.set(n,t+1,r,n%2?W.CRATE:W.BARREL);e.set(10,t+2,5,W.CRATE),Y(e,n,7,10,t+1,`work`);for(let[r,i]of[[3,6],[7,6],[11,7],[7,8]])Y(e,n,r,i,t+1);return e.lantern(4,t+4,5),e.lantern(10,t+4,5),e.lantern(7,t+4,8),e.set(1,t+1,-1,W.BARREL),e.set(2,t+1,-1,W.CRATE),e.set(13,t+1,-1,W.BARREL),e.set(13,t+2,-1,W.BARREL),n}function Zu(e,t,n,r,i=11,a=10,o={}){let s=qu(e,t,{w:i,d:a,floors:1,wall:o.wall??Vu,trim:o.trim??W.STRIPPED_OAK,roof:o.roof||`flat`,sign:n.toUpperCase(),doorU:Math.floor(i/2),name:n,kind:r,...o}),c=Math.floor(i/2);return e.fill(2,t+1,a-4,i-3,t+1,a-4,Hu),e.fill(2,t+2,a-4,i-3,t+2,a-4,W.SPRUCE_SLAB),e.fill(1,t+1,a-2,i-2,t+3,a-2,o.shelf??W.SHELF),Y(e,s,c,a-3,t+1,`work`),Y(e,s,c-2,3,t+1),Y(e,s,c+2,3,t+1),Y(e,s,c,a-5,t+1),e.lantern(c,t+4,2),e.lantern(c,t+4,a-5),o.furnish&&o.furnish(e,t,s,i,a),s}function Qu(e,t){return Zu(e,t,`Doctor`,`doctor`,10,10,{wall:Uu,trim:W.SPRUCE_LOG,furnish:(e,t,n,r,i)=>{e.set(2,t+1,3,W.BED_FOOT),e.set(2,t+1,4,W.BED_HEAD),e.set(r-3,t+1,4,W.TABLE),e.set(1,t+1,6,W.BOOKSHELF),e.set(1,t+2,6,W.BOOKSHELF),Y(e,n,3,4,t+1,`beds`)}})}function $u(e,t){return Zu(e,t,`Gunsmith`,`gunsmith`,11,10,{wall:Hu,trim:W.STRIPPED_OAK,shelf:W.BOOKSHELF,furnish:(e,t,n,r,i)=>{e.set(1,t+1,3,W.CRATE),e.set(1,t+1,4,W.CRATE),e.set(1,t+2,3,W.CRATE),e.set(r-2,t+1,3,W.BARREL),e.fill(1,t+1,6,1,t+3,7,W.BOOKSHELF),e.set(r-2,t+1,5,W.ANVIL)}})}function ed(e,t){let n=qu(e,t,{w:21,d:14,floors:2,wall:W.PLASTER,trim:W.SPRUCE_LOG,roof:`flat`,sign:`HOTEL`,doorU:10,name:`Grand Hotel`,kind:`hotel`,windowsU:[3,6,14,17],backDoorU:3});e.fill(7,t+1,10,13,t+1,10,Hu),e.fill(7,t+2,10,13,t+2,10,W.SPRUCE_SLAB),e.fill(8,t+1,12,12,t+3,12,W.BOOKSHELF),Y(e,n,10,11,t+1,`work`);for(let[r,i]of[[3,4],[17,4],[3,8],[17,8]])e.set(r,t+1,i,W.TABLE),e.set(r+1,t+1,i,W.SPRUCE_SLAB),e.set(r-1,t+1,i,W.SPRUCE_SLAB),Y(e,n,r+1,i,t+1),Y(e,n,r-1,i,t+1);e.fill(1,t+1,2,1,t+1,3,W.RED_WOOL),e.fill(19,t+1,2,19,t+1,3,W.RED_WOOL);for(let[n,r]of[[5,6],[10,6],[15,6],[10,10]])e.lantern(n,t+4,r);Ku(e,19,t,2,W.OAK_SLAB,W.OAK_SLAB_TOP,Vu),e.fill(18,t+1,2,18,t+3,9,W.OAK_FENCE);let r=t+5;e.fill(1,r+1,5,18,r+3,5,Vu),e.fill(1,r+1,7,18,r+3,7,Vu);for(let t=4;t<18;t+=5)e.fill(t,r+1,1,t,r+3,4,Vu),e.fill(t,r+1,8,t,r+3,12,Vu);for(let t=2;t<18;t+=5)e.door(t,r+1,5,W.OAK_DOOR),e.door(t,r+1,7,W.OAK_DOOR),e.set(t+1,r+1,2,W.BED_HEAD),e.set(t+1,r+1,3,W.BED_FOOT),e.set(t+1,r+1,12,W.BED_HEAD),e.set(t+1,r+1,11,W.BED_FOOT),e.set(t+2,r+1,1,W.CHEST),e.set(t+2,r+1,12,W.CHEST),e.lantern(t+1,r+4,3),e.lantern(t+1,r+4,10),Y(e,n,t+2,3,r+1,`beds`),Y(e,n,t+2,10,r+1,`beds`);for(let t=3;t<18;t+=5)e.lantern(t,r+4,6);for(let t=6;t<17;t+=6)Y(e,n,t,6,r+1);return e.sign(4,t+11,0,`ROOMS`),e.sign(16,t+11,0,`BATHS`),n}function td(e,t){let n=qu(e,t,{w:17,d:14,floors:2,wall:W.BRICKS,trim:W.STONE_BRICKS,floorBlock:W.SMOOTH_STONE,roof:`flat`,roofBlock:W.STONE_BRICKS,roofSlab:W.STONE_BRICK_SLAB,sign:`BANK`,doorU:8,name:`Bank`,kind:`bank`,balcony:!1,awning:!1,windowsU:[3,5,11,13],foundation:W.STONE_BRICKS,falseFrontH:2});for(let n of[5,11])e.fill(n,t+1,-1,n,t+4,-1,W.STONE_BRICKS);e.fill(6,t+5,-1,10,t+5,-1,W.STONE_BRICK_SLAB),e.fill(5,t+5,-2,11,t+5,-2,W.STONE_BRICK_SLAB),e.lantern(8,t+4,-1),e.fill(3,t+1,6,13,t+1,6,Hu),e.fill(3,t+2,6,13,t+2,6,W.SPRUCE_SLAB),e.fill(3,t+3,6,13,t+3,6,W.IRON_BARS),e.set(8,t+3,6,W.AIR),e.set(8,t+2,6,W.SPRUCE_SLAB),Y(e,n,6,7,t+1,`work`),Y(e,n,10,7,t+1,`work`),Y(e,n,6,4,t+1),Y(e,n,10,4,t+1),Y(e,n,8,3,t+1),e.set(2,t+1,2,W.TABLE),e.set(14,t+1,2,W.TABLE),e.fill(5,t+1,9,11,t+4,12,W.STONE_BRICKS),e.fill(6,t+1,10,10,t+3,11,W.AIR),e.set(8,t+1,9,W.IRON_BARS),e.set(8,t+2,9,W.IRON_BARS),e.fill(6,t+1,11,10,t+1,11,W.GOLD_BLOCK),e.set(6,t+1,10,W.CHEST),e.set(10,t+1,10,W.CHEST),e.lantern(8,t+3,11);for(let[n,r]of[[4,3],[12,3],[8,8]])e.lantern(n,t+4,r);Ku(e,1,t,2,W.STONE_BRICK_SLAB,W.STONE_BRICK_SLAB_TOP,W.STONE_BRICKS);let r=t+5;return e.set(5,r+1,4,W.TABLE),e.set(11,r+1,4,W.TABLE),e.fill(3,r+1,12,13,r+2,12,W.BOOKSHELF),e.lantern(8,r+4,6),e.lantern(4,r+4,9),e.lantern(12,r+4,9),Y(e,n,6,5,r+1),Y(e,n,10,6,r+1),n}function nd(e,t){let n=qu(e,t,{w:13,d:11,floors:1,wall:Hu,trim:W.SPRUCE_LOG,floorBlock:W.COBBLESTONE,roof:`gable`,roofBlock:Hu,sign:`BLACKSMITH`,doorU:6,doorId:0,name:`Blacksmith`,kind:`blacksmith`,awning:!1,windows:!1,falseFront:!1});return e.fill(3,t+1,0,9,t+3,0,W.AIR),e.set(6,t+4,0,Hu),e.sign(6,t+5,0,`BLACKSMITH`),e.fill(1,t+1,8,3,t+1,9,W.STONE_BRICKS),e.set(2,t+2,8,W.FURNACE),e.fill(1,t+2,9,3,t+3,9,W.STONE_BRICKS),e.chimney(2,9,t+4,t+9,W.STONE_BRICKS),e.set(5,t+1,7,W.ANVIL),e.set(8,t+1,8,W.TROUGH),e.set(11,t+1,2,W.BARREL),e.set(11,t+1,3,W.CRATE),e.set(11,t+2,2,W.IRON_BLOCK),e.fill(1,t+1,1,1,t+2,2,W.CRATE),Y(e,n,5,6,t+1,`work`),Y(e,n,8,4,t+1),Y(e,n,3,4,t+1),e.lantern(6,t+4,5),e.lantern(3,t+4,7),n}function rd(e,t){let n=qu(e,t,{w:17,d:14,floors:1,wall:Hu,trim:W.SPRUCE_LOG,floorBlock:W.COARSE_DIRT,roof:`gable`,sign:`LIVERY STABLE`,doorU:8,doorId:0,name:`Livery Stable`,kind:`stable`,awning:!1,windows:!1,falseFront:!1,foundation:W.DIRT});e.fill(7,t+1,0,9,t+3,0,W.AIR),e.fill(7,t+4,0,9,t+4,0,Hu),e.sign(8,t+5,0,`LIVERY`);for(let n=2;n<12;n+=4){e.fill(4,t+1,n,4,t+1,n+2,W.SPRUCE_FENCE),e.fill(12,t+1,n,12,t+1,n+2,W.SPRUCE_FENCE),e.fill(1,t+1,n+3,4,t+1,n+3,W.SPRUCE_FENCE),e.fill(12,t+1,n+3,15,t+1,n+3,W.SPRUCE_FENCE),e.set(1,t+1,n,W.HAY_BALE),e.set(15,t+1,n,W.HAY_BALE),e.set(2,t+1,n+2,W.TROUGH),e.set(14,t+1,n+2,W.TROUGH);let[r,i]=e.world(2,n+1);e.s.animalSpawns.push({type:`horse`,x:r+.5,z:i+.5,tie:!0});let[a,o]=e.world(14,n+1);n>2&&e.s.animalSpawns.push({type:`horse`,x:a+.5,z:o+.5,tie:!0})}return e.fill(6,t+1,12,10,t+2,12,W.HAY_BALE),e.set(15,t+1,1,W.BARREL),e.set(1,t+1,1,W.CRATE),Y(e,n,8,10,t+1,`work`),Y(e,n,6,4,t+1),Y(e,n,10,8,t+1),e.lantern(8,t+4,3),e.lantern(8,t+4,8),e.lantern(8,t+4,11),e.set(8,t+6,0,W.AIR),e.set(8,t+7,0,W.AIR),n}function id(e,t){let n=qu(e,t,{w:21,d:8,floors:1,wall:Vu,trim:W.SPRUCE_LOG,floorBlock:Hu,roof:`gable`,roofBlock:Hu,sign:`DEPOT`,doorU:10,name:`Train Depot`,kind:`station`,windowsU:[3,6,14,17],backDoorU:10,falseFront:!1});e.fill(2,t+1,3,6,t+1,3,Hu),e.fill(2,t+2,3,6,t+2,3,W.SPRUCE_SLAB),e.fill(2,t+3,3,6,t+3,3,W.IRON_BARS),e.fill(1,t+1,6,6,t+3,6,W.BOOKSHELF),e.fill(13,t+1,2,18,t+1,2,W.SPRUCE_SLAB),e.fill(13,t+1,5,18,t+1,5,W.SPRUCE_SLAB),Y(e,n,4,5,t+1,`work`);for(let r of[13,15,17])Y(e,n,r,2,t+1),Y(e,n,r,5,t+1);return e.lantern(5,t+4,4),e.lantern(10,t+4,4),e.lantern(15,t+4,4),e.sign(10,t+5,7,`DEPOT`,!0),n}function ad(e,t){let n=qu(e,t,{w:13,d:17,floors:1,wall:Uu,trim:W.SPRUCE_LOG,roof:`gable`,roofBlock:Hu,sign:null,doorU:6,doubleDoor:!1,name:`Church`,kind:`church`,awning:!1,windows:!1,falseFront:!1,foundation:W.STONE_BRICKS});e.fill(-1,t+5,0,13,t+22,16,W.AIR),e.walls(0,t+5,0,12,t+6,16,Uu),e.gableRoof(0,12,0,16,t+7,Hu,W.SPRUCE_SLAB);for(let n=4;n<15;n+=4)e.fill(0,t+2,n,0,t+5,n,W.GLASS),e.fill(12,t+2,n,12,t+5,n,W.GLASS);e.fill(4,t+1,0,8,t+12,2,Uu),e.fill(5,t+1,1,7,t+12,1,W.AIR),e.fill(5,t+1,0,7,t+3,0,W.AIR),e.fill(6,t+1,0,6,t+2,2,W.AIR),e.set(6,t+1,0,W.OAK_DOOR),e.set(6,t+2,0,W.OAK_DOOR),e.fill(5,t+4,0,7,t+4,2,Uu),e.fill(4,t+13,0,8,t+13,2,Hu),e.fill(5,t+14,0,7,t+14,2,Hu),e.fill(6,t+15,1,6,t+16,1,Hu),e.fill(5,t+17,1,7,t+17,1,W.SPRUCE_LOG),e.fill(6,t+17,1,6,t+19,1,W.SPRUCE_LOG),e.set(6,t+10,0,W.AIR),e.set(6,t+11,0,W.AIR),e.set(6,t+10,0,W.GLASS),e.set(6,t+11,0,W.GLASS),e.lantern(6,t+12,1);for(let n=5;n<12;n+=2)e.fill(2,t+1,n,5,t+1,n,W.SPRUCE_SLAB),e.fill(7,t+1,n,10,t+1,n,W.SPRUCE_SLAB);e.fill(4,t+1,14,8,t+1,14,W.TABLE),e.set(6,t+2,14,W.BOOKSHELF),e.fill(5,t+1,15,7,t+2,15,W.RED_WOOL),Y(e,n,6,13,t+1,`work`);for(let r=5;r<12;r+=2)for(let i of[3,4,8,9])Y(e,n,i,r,t+1);for(let n of[6,10,14])e.lantern(3,t+5,n),e.lantern(9,t+5,n);return n}function od(e,t,n,r=0){let i=7+r%2*2,a=7+r%3,o=[Vu,Hu,Uu,W.PLASTER][r%4],s=qu(e,t,{w:i,d:a,floors:1,wall:o,trim:r%2?W.SPRUCE_LOG:W.STRIPPED_OAK,roof:`gable`,roofBlock:r%2?Hu:W.SPRUCE_PLANKS,sign:null,doorU:Math.floor(i/2),name:n,kind:`house`,awning:!1,falseFront:!1,windowsU:[1,i-2],frontOnly:!0});e.fill(0,t+4,-1,i-1,t+4,-2,W.OAK_SLAB),e.fill(0,t+1,-2,0,t+3,-2,W.OAK_FENCE),e.fill(i-1,t+1,-2,i-1,t+3,-2,W.OAK_FENCE),e.fill(0,t,-1,i-1,t,-2,Vu),e.set(Math.floor(i/2),t,-3,W.OAK_SLAB),e.set(1,t+1,-1,W.SPRUCE_SLAB),e.lantern(i-2,t+3,-1),e.set(1,t+1,a-2,W.BED_HEAD),e.set(1,t+1,a-3,W.BED_FOOT),e.set(i-2,t+1,a-2,W.CHEST),e.set(i-2,t+1,2,W.TABLE),e.set(i-3,t+1,2,W.SPRUCE_SLAB),r%2==0?e.set(1,t+1,1,W.BOOKSHELF):e.set(1,t+1,1,W.BARREL),e.lantern(Math.floor(i/2),t+4,Math.floor(a/2)),e.chimney(i-1,a-2,t+1,t+9,W.BRICKS),e.set(i-2,t+1,a-4,W.FURNACE),Y(e,s,2,a-3,t+1,`beds`),Y(e,s,Math.floor(i/2),3,t+1),Y(e,s,i-3,3,t+1);let[c,l]=e.world(1,-1);s.porch={x:c,y:t+1,z:l};let u=i-2,d=a+2;return e.fill(u-1,t,d-1,u+1,t+3,d+1,Hu),e.fill(u,t+1,d,u,t+2,d,W.AIR),e.set(u,t+1,d-1,W.OAK_DOOR),e.set(u,t+2,d-1,W.OAK_DOOR),e.fill(u-1,t+4,d-1,u+1,t+4,d+1,W.SPRUCE_SLAB),e.set(u,t,a,W.DIRT_PATH),e.set(u,t+1,a,W.AIR),e.set(u,t+2,a,W.AIR),s}function sd(e,t){let n=qu(e,t,{w:17,d:15,floors:1,wall:Hu,trim:Uu,floorBlock:W.COARSE_DIRT,roof:`gable`,roofBlock:Hu,sign:null,doorU:8,doorId:0,name:`Barn`,kind:`barn`,awning:!1,windows:!1,falseFront:!1,foundation:W.DIRT});e.fill(0,t+5,1,16,t+8,14,W.AIR),e.walls(0,t+5,0,16,t+7,14,Hu),e.fill(0,t+8,0,16,t+14,14,W.AIR),e.gableRoof(0,16,0,14,t+8,Hu,W.SPRUCE_SLAB),e.fill(6,t+1,0,10,t+4,0,W.AIR),e.fill(6,t+5,0,10,t+5,0,Uu);for(let n of[6,10])e.fill(n,t+1,0,n,t+4,0,Uu);e.fill(7,t+6,0,9,t+7,0,W.AIR);for(let n=0;n<4;n++)e.set(1+n,t+1+n,0,Uu),e.set(15-n,t+1+n,0,Uu),e.set(4-n,t+1+n,0,Uu),e.set(12+n,t+1+n,0,Uu);e.fill(1,t+5,1,15,t+5,5,Vu),e.fill(1,t+6,1,15,t+6,4,W.HAY_BALE),e.fill(1,t+1,11,5,t+2,13,W.HAY_BALE),e.fill(12,t+1,12,15,t+1,13,W.HAY_BALE);for(let n=7;n<11;n+=4)e.fill(4,t+1,n,4,t+1,n+2,W.SPRUCE_FENCE),e.fill(1,t+1,n+3,4,t+1,n+3,W.SPRUCE_FENCE),e.set(2,t+1,n+2,W.TROUGH);e.set(15,t+1,3,W.BARREL),e.set(15,t+1,4,W.BARREL),e.set(14,t+1,3,W.CRATE),e.lantern(8,t+4,4),e.lantern(8,t+7,9),e.lantern(3,t+4,9),Y(e,n,8,6,t+1,`work`),Y(e,n,8,10,t+1),Y(e,n,12,8,t+1);let[r,i]=e.world(2,8);e.s.animalSpawns.push({type:`horse`,x:r+.5,z:i+.5,tie:!0});let[a,o]=e.world(12,11);return e.s.animalSpawns.push({type:`cow`,x:a+.5,z:o+.5,tie:!0}),n}function cd(e,t,n=`FREIGHT`){let r=qu(e,t,{w:15,d:11,floors:1,wall:Hu,trim:W.SPRUCE_LOG,floorBlock:Vu,roof:`gable`,roofBlock:W.SPRUCE_PLANKS,sign:n,doorU:7,doorId:0,name:`Warehouse`,kind:`warehouse`,awning:!1,windowsU:[2,12],falseFront:!1});e.fill(6,t+1,0,8,t+3,0,W.AIR);for(let[n,r,i]of[[2,3,2],[3,3,1],[2,4,1],[11,3,2],[12,3,1],[11,8,2],[12,8,1],[2,8,1],[3,8,2],[7,8,1]])e.fill(n,t+1,r,n,t+i,r,(n+r)%2?W.CRATE:W.BARREL);return e.fill(5,t+1,9,9,t+1,9,W.HAY_BALE),e.lantern(7,t+4,3),e.lantern(7,t+4,8),Y(e,r,7,5,t+1,`work`),Y(e,r,5,6,t+1),Y(e,r,9,6,t+1),r}function ld(e,t){for(let[n,r]of[[0,0],[4,0],[0,4],[4,4]])e.fill(n,t,r,n,t+7,r,W.SPRUCE_LOG);e.fill(0,t+4,0,4,t+4,4,W.SPRUCE_FENCE),e.fill(1,t+4,1,3,t+4,3,W.AIR),e.fill(0,t+8,0,4,t+8,4,Hu),e.walls(0,t+9,0,4,t+12,4,W.BARREL),e.fill(1,t+9,1,3,t+12,3,W.WATER),e.fill(0,t+13,0,4,t+13,4,W.SPRUCE_SLAB),e.fill(1,t+13,1,3,t+13,3,Hu),e.fill(2,t+14,2,2,t+14,2,Hu),e.fill(2,t+1,-1,2,t+8,-1,W.SPRUCE_FENCE),e.set(2,t+1,-2,W.TROUGH)}function ud(e,t,n=19,r=17){for(let i=0;i<n;i++)e.set(i,t+1,0,W.WHITE_FENCE),e.set(i,t+1,r-1,W.WHITE_FENCE);for(let i=0;i<r;i++)e.set(0,t+1,i,W.WHITE_FENCE),e.set(n-1,t+1,i,W.WHITE_FENCE);let i=Math.floor(n/2);e.set(i,t+1,0,W.AIR),e.set(i+1,t+1,0,W.AIR),e.set(i,t+1,0,W.AIR);for(let n=0;n<r-2;n++)e.set(i,t,n,W.DIRT_PATH),e.set(i+1,t,n,W.DIRT_PATH);let a=Wu(e,`Graveyard`,`graveyard`,t,n,r);for(let o=3;o<r-2;o+=3)for(let s=2;s<n-2;s+=3)s!==i&&s!==i+1&&s!==i-1&&(e.set(s,t+1,o,W.GRAVESTONE),e.set(s,t,o+1,W.COARSE_DIRT),e.set(s,t,o+2,W.COARSE_DIRT),(s*7+o)%5==0&&e.set(s,t+1,o+2,W.POPPY),Y(e,a,s,o+1<=r-3?o+1:o-1,t+1));e.fill(n-3,t+1,r-4,n-3,t+6,r-4,W.SPRUCE_LOG),e.set(n-4,t+6,r-4,W.SPRUCE_LOG),e.set(n-2,t+5,r-4,W.SPRUCE_LOG),e.set(n-3,t+5,r-3,W.SPRUCE_LOG),e.set(n-4,t+1,r-3,W.DEAD_BUSH),e.lantern(i-1,t+2,0),e.lantern(i+2,t+2,0),e.set(i-1,t+1,0,W.WHITE_FENCE),e.set(i+2,t+1,0,W.WHITE_FENCE);let[o,s]=e.world(i,-1);a.door={x:o,y:t+1,z:s};let[c,l]=e.world(i,2);return a.inside={x:c,y:t+1,z:l},a}function dd(e,t,n=3){let r=Wu(e,`Market`,`market`,t,n*4,3);for(let i=0;i<n;i++){let n=i*4;e.fill(n,t+1,1,n+2,t+1,1,W.TABLE),e.set(n,t+1,0,W.SPRUCE_FENCE),e.set(n+2,t+1,0,W.SPRUCE_FENCE),e.set(n,t+2,0,W.SPRUCE_FENCE),e.set(n+2,t+2,0,W.SPRUCE_FENCE),e.set(n,t+1,2,W.SPRUCE_FENCE),e.set(n+2,t+1,2,W.SPRUCE_FENCE),e.set(n,t+2,2,W.SPRUCE_FENCE),e.set(n+2,t+2,2,W.SPRUCE_FENCE);for(let r=n;r<=n+2;r++)for(let n=0;n<=2;n++)e.set(r,t+3,n,(r+i)%2?W.RED_WOOL:W.WHITE_WOOL);e.set(n+1,t+2,1,i%3==0?W.PUMPKIN:i%3==1?W.HAY_BALE:W.CRATE),e.set(n+1,t+1,3,W.BARREL),Y(e,r,n+1,2,t+1,`work`),Y(e,r,n+1,-1,t+1),Y(e,r,n,-1,t+1)}return r}function fd(e,t,n=`hay`){for(let[n,r]of[[0,0],[0,4],[2,0],[2,4]])e.set(n,t+1,r,W.SPRUCE_LOG);e.fill(0,t+2,0,2,t+2,4,Hu);for(let n=0;n<=4;n++)e.set(0,t+3,n,W.SPRUCE_FENCE),e.set(2,t+3,n,W.SPRUCE_FENCE);e.set(1,t+3,4,W.SPRUCE_FENCE),e.set(1,t+3,0,W.SPRUCE_FENCE),e.fill(1,t+3,1,1,t+3,3,n===`hay`?W.HAY_BALE:n===`crates`?W.CRATE:W.BARREL),e.set(1,t+2,-1,W.SPRUCE_FENCE),e.set(1,t+2,-2,W.SPRUCE_FENCE);let[r,i]=e.world(1,-3);e.s.animalSpawns.push({type:`horse`,x:r+.5,z:i+.5,tie:!0})}function pd(e,t){e.walls(0,t,0,2,t+1,2,W.COBBLESTONE),e.set(1,t-1,1,W.WATER),e.set(1,t,1,W.WATER),e.set(1,t-2,1,W.WATER),e.fill(0,t+2,0,0,t+3,0,W.SPRUCE_FENCE),e.fill(2,t+2,2,2,t+3,2,W.SPRUCE_FENCE),e.fill(0,t+2,2,0,t+3,2,W.SPRUCE_FENCE),e.fill(2,t+2,0,2,t+3,0,W.SPRUCE_FENCE),e.fill(-1,t+4,-1,3,t+4,3,W.SPRUCE_SLAB),e.fill(0,t+5,0,2,t+5,2,Hu),e.set(1,t+3,1,W.LANTERN)}function md(e,t,n,r,i=`x`,a=3){for(let o=0;o<a;o++)e.set(i===`x`?t+o:t,n,i===`x`?r:r+o,W.SPRUCE_FENCE)}function hd(e,t,n,r){e.set(t,n,r,W.SPRUCE_FENCE),e.set(t,n+1,r,W.SPRUCE_FENCE),e.set(t,n+2,r,W.SPRUCE_FENCE),e.set(t,n+3,r,W.LANTERN),e.lamps.push({x:t,y:n+3,z:r})}function gd(e,t,n,r,i=`x`,a=2){for(let o=0;o<a;o++)e.set(i===`x`?t+o:t,n,i===`x`?r:r+o,W.SPRUCE_SLAB)}var X=56,_d=X+1,vd=`DUSTWATER`;function yd(){let e=new zu(-104,-78,209,171,X-6,40),t=e;for(let e=-100;e<=100;e++)for(let n=-4;n<=4;n++){let r=W.MUD;(n===-2||n===2)&&B(e,n,1)<.45&&(r=W.COARSE_DIRT),Math.abs(n)===4&&B(e,n,2)<.3&&(r=W.DIRT_PATH),t.set(e,X,n,r),t.set(e,X+1,n,W.AIR),t.set(e,X+2,n,W.AIR)}let n=e=>e>=-3&&e<=3||e>=-60&&e<=-54||e>=54&&e<=60;for(let e=-96;e<=96;e++)if(!n(e)){for(let n of[-6,-5,5,6])t.set(e,X+1,n,W.SPRUCE_PLANKS),t.set(e,X+2,n,W.AIR),t.set(e,X+3,n,W.AIR);t.set(e,X+1,-4,W.SPRUCE_SLAB),t.set(e,X+1,4,W.SPRUCE_SLAB)}let r=(e,n,r,i)=>{for(let a=e;a<=r;a++)for(let e=n;e<=i;e++)t.set(a,X,e,B(a,e,3)<.15?W.COARSE_DIRT:W.DIRT_PATH),t.set(a,X+1,e,W.AIR)};r(-3,-58,3,60),r(-96,-30,96,-26),r(-96,26,96,30),r(-60,-26,-54,26),r(54,-26,60,26),r(67,30,69,88),r(44,34,100,37);let i=e=>new Bu(t,e,-7,`S`);nd(i(-96),_d),rd(i(-82),_d),$u(i(-53),_d),Qu(i(-41),_d),Yu(i(-30),_d),Zu(i(-13),_d,`Telegraph`,`shop`,10,10,{wall:W.WHITE_PLANKS}),td(i(5),_d),ed(i(23),_d),Zu(i(45),_d,`Barber`,`shop`,9,9,{wall:W.PLASTER,trim:W.SPRUCE_LOG,roof:`gable`}),Xu(i(61),_d),Zu(i(77),_d,`Feed & Grain`,`shop`,13,12,{wall:W.SPRUCE_PLANKS,shelf:W.HAY_BALE,furnish:(e,t,n,r,i)=>{e.set(2,t+1,3,W.HAY_BALE),e.set(3,t+1,3,W.HAY_BALE),e.set(2,t+2,3,W.HAY_BALE),e.set(r-3,t+1,3,W.BARREL),e.set(r-3,t+1,4,W.CRATE)}}),Zu(i(91),_d,`Assay Office`,`shop`,11,10,{wall:W.BRICKS,trim:W.STONE_BRICKS,shelf:W.BOOKSHELF});let a=e=>new Bu(t,e,7,`N`);Zu(a(-82),_d,`Bath House`,`shop`,13,11,{wall:W.WHITE_PLANKS,furnish:(e,t,n,r,i)=>{for(let n=2;n<r-2;n+=3)e.set(n,t+1,4,W.TROUGH)}}),Zu(a(-68),_d,`Tailor`,`shop`,11,10,{wall:W.OAK_PLANKS,shelf:W.WHITE_WOOL}),Zu(a(-53),_d,`Land Office`,`shop`,9,9,{wall:W.PLASTER,shelf:W.BOOKSHELF});let o=Ju(a(-43),_d);Zu(a(-15),_d,`Post Office`,`shop`,10,10,{wall:W.WHITE_PLANKS,shelf:W.BOOKSHELF}),Zu(a(5),_d,`Undertaker`,`shop`,11,11,{wall:W.SPRUCE_PLANKS,trim:W.SPRUCE_LOG,shelf:W.SHELF,furnish:(e,t,n,r,i)=>{e.set(2,t+1,-1,W.CRATE),e.set(3,t+1,-1,W.CRATE),e.set(2,t+2,-1,W.CRATE)}}),qu(a(17),_d,{w:17,d:13,floors:2,wall:W.OAK_PLANKS,trim:W.STRIPPED_OAK,roof:`flat`,sign:`BOARDING HOUSE`,name:`Boarding House`,kind:`hotel`,doorU:8,windowsU:[3,5,11,13],backDoorU:3}),Zu(a(35),_d,`Butcher`,`shop`,9,9,{wall:W.WHITE_PLANKS,trim:W.SPRUCE_LOG,roof:`gable`}),Zu(a(45),_d,`Photographer`,`shop`,9,9,{wall:W.PLASTER}),Zu(a(61),_d,`Leather Goods`,`shop`,11,10,{wall:W.SPRUCE_PLANKS}),Zu(a(73),_d,`Gazette`,`shop`,11,10,{wall:W.BRICKS,trim:W.STONE_BRICKS,shelf:W.BOOKSHELF}),od(a(86),X,`Pearson House`,1),od(a(96),X,`Grimshaw House`,2);let s=id(new Bu(t,-10,-44,`S`),_d);for(let e=-26;e<=26;e++)for(let n=-60;n<=-52;n++)t.set(e,X+1,n,W.SPRUCE_PLANKS),t.set(e,X+2,n,W.AIR),t.set(e,X,n,W.COBBLESTONE);for(let e=-26;e<=26;e+=8)for(let n=X+2;n<=X+5;n++)t.set(e,n,-59,W.SPRUCE_LOG);for(let e=-26;e<=26;e++)for(let n=-60;n<=-53;n++)t.set(e,X+6,n,W.SPRUCE_SLAB);for(let e=-22;e<=22;e+=8)t.set(e,X+5,-57,W.LANTERN);for(let e=-24;e<=24;e+=12)gd(t,e,X+2,-54,`x`,2);for(let e=-20;e<=20;e+=10)t.set(e,X+2,-60,W.CRATE);t.set(-24,X+2,-60,W.BARREL),t.set(24,X+2,-60,W.BARREL),t.set(24,X+3,-60,W.BARREL);for(let e of[-27,27])for(let n=-60;n<=-52;n++)t.set(e,X+1,n,W.SPRUCE_SLAB);for(let e=t.x0;e<t.x0+t.w;e++){for(let n=-63;n<=-61;n++)t.set(e,X,n,W.GRAVEL),t.set(e,X+1,n,W.AIR),t.set(e,X+2,n,W.AIR);t.set(e,X+1,-62,W.RAIL),e%3==0&&t.set(e,X,-62,W.SPRUCE_PLANKS)}ld(new Bu(t,30,-56,`S`),X+1),cd(new Bu(t,38,-46,`S`),_d,`FREIGHT`),cd(new Bu(t,56,-46,`S`),_d,`RAILWAY CO.`),fd(new Bu(t,74,-50,`W`),X,`crates`),fd(new Bu(t,30,-50,`E`),X,`barrels`);for(let e=34;e<=72;e+=6)t.set(e,X+1,-59,W.CRATE),e%12==0&&t.set(e,X+2,-59,W.CRATE);for(let e=30;e<=76;e++)for(let n=-58;n<=-48;n++)!t.isSet(e,X,n)&&B(e,n,4)<.6&&t.set(e,X,n,W.DIRT_PATH);let c=[`Miller House`,`Callahan House`,`Whitmore House`,`Beaumont House`,`Ross House`,`Hawkins House`,`Sutter House`];[-64,-52,-36,-24,16,28,80].forEach((e,n)=>od(new Bu(t,e,-33,`S`),X,c[n],n)),pd(new Bu(t,-1,-21,`S`),X),dd(new Bu(t,-17,-21,`S`),X,3);for(let[e,n]of[[-6,-18],[4,-18],[-6,-24],[4,-24]])hd(t,e,X+1,n);let l=ad(new Bu(t,-6,33,`N`),X);ud(new Bu(t,10,33,`N`),X,19,17);let u=[`Kowalski House`,`Downes House`,`Bell House`,`Macfarlane House`,`Holloway House`];[-84,-72,-60,-33,-20].forEach((e,n)=>od(new Bu(t,e,33,`N`),X,u[n],n+2));for(let[e,n]of[[-12,46],[30,44],[-30,48],[-90,46]])Sd(t,e,X+1,n);sd(new Bu(t,50,40,`N`),X);let d=od(new Bu(t,72,40,`N`),X,`Ranch House`,3);d.kind=`ranch`,bd(t,36,58,66,82,W.OAK_FENCE,[[50,58],[51,58]]),bd(t,70,58,82,68,W.OAK_FENCE,[[70,63]]),bd(t,70,72,78,78,W.OAK_FENCE,[[74,72]]),bd(t,34,40,47,54,W.SPRUCE_FENCE,[[40,54]]);for(let[e,n]of[[40,64],[58,72],[46,76]])t.set(e,X+1,n,W.TROUGH);for(let[e,n]of[[62,62],[63,62],[62,63],[38,78]])t.set(e,X+1,n,W.HAY_BALE);t.set(62,X+2,62,W.HAY_BALE);for(let e=71;e<=73;e++)for(let n=73;n<=75;n++)t.set(e,X+1,n,W.SPRUCE_PLANKS),t.set(e,X+2,n,W.SPRUCE_SLAB);t.set(72,X+1,74,W.AIR),t.set(72,X+1,73,W.AIR);for(let e=71;e<=81;e++)for(let n=59;n<=67;n++)B(e,n,5)<.5&&t.set(e,X,n,W.MUD);for(let e=84;e<=98;e++)for(let n=44;n<=58;n++){if(e===84||e===98||n===44||n===58){t.set(e,X+1,n,W.OAK_FENCE);continue}if(n%4==2){t.set(e,X,n,W.WATER);continue}t.set(e,X,n,W.FARMLAND),t.set(e,X+1,n,W.WHEAT)}t.set(91,X+1,44,W.AIR),fd(new Bu(t,86,62,`W`),X,`hay`),md(t,74,X+1,52,`x`,3);for(let e=0;e<7;e++)t.animalSpawns.push({type:`cow`,x:40+B(e,1,6)*24,z:60+B(e,2,6)*20,pen:{x0:37,z0:59,x1:65,z1:81}});for(let e=0;e<5;e++)t.animalSpawns.push({type:`pig`,x:72+B(e,3,6)*8,z:60+B(e,4,6)*6,pen:{x0:71,z0:59,x1:81,z1:67}});for(let e=0;e<7;e++)t.animalSpawns.push({type:`chicken`,x:71+B(e,5,6)*6,z:73+B(e,6,6)*4,pen:{x0:71,z0:73,x1:77,z1:77}});for(let e=0;e<3;e++)t.animalSpawns.push({type:`horse`,x:37+B(e,7,6)*9,z:42+B(e,8,6)*10,pen:{x0:35,z0:41,x1:46,z1:53}});bd(t,-100,9,-85,21,W.SPRUCE_FENCE,[[-93,9],[-92,9]]),t.set(-92,X+1,15,W.TROUGH),t.set(-87,X+1,19,W.HAY_BALE),t.set(-87,X+2,19,W.HAY_BALE),t.set(-98,X+1,19,W.HAY_BALE);for(let e=0;e<3;e++)t.animalSpawns.push({type:`horse`,x:-98+B(e,9,6)*11,z:11+B(e,10,6)*8,pen:{x0:-99,z0:10,x1:-86,z1:20}});fd(new Bu(t,-80,12,`E`),X,`hay`);for(let[e,n]of[[-36,3],[-24,3],[27,-3],[66,-3],[-24,-3],[8,3],[76,3]])md(t,e,X+1,n,`x`,3),t.animalSpawns.push({type:`horse`,x:e+1.5,z:n+(n>0?-1.5:1.5),tie:!0,yaw:n>0?Math.PI:0});for(let e=X+1;e<=X+3;e++)t.set(-100,e,-6,W.SPRUCE_FENCE);let f=[];for(let e of[-7,-6,-5])t.set(-101,X+3,e,W.WALL_SIGN),f.push([-101,e]);t.set(-100,X+3,-7,W.SPRUCE_PLANKS),t.set(-100,X+3,-5,W.SPRUCE_PLANKS),t.signs.push({y:X+3,text:vd,order:f}),t.set(-100,X+4,-6,W.LANTERN);let p=(e,n)=>{let r=t.get(e,X+1,n)!==W.AIR&&t.isSet(e,X+1,n)?X+2:X+1;hd(t,e,r,n)};for(let e=-88;e<=88;e+=16)n(e)||p(e,e%32==0?-5:5);for(let e=-80;e<=80;e+=16)n(e)||p(e,e%32==0?5:-5);for(let e of[-40,-20,-12,14,22,40])p(-4,e),p(4,e);for(let e of[-14,14])p(-61,e),p(-53,e),p(53,e),p(61,e);for(let e of[-72,-32,20,72])p(e,-31),p(e,31);let m=[[-40,6],[-39,6],[30,-6],[31,-6],[-27,-6],[-26,-6],[64,-6],[65,-6],[12,-6],[13,-6],[-72,6],[-71,6],[-9,6],[-8,6]];for(let[e,n]of m)t.set(e,X+2,n,W.SPRUCE_SLAB);for(let e=0;e<40;e++){let n=-95+Math.floor(B(e,11,7)*190),r=B(e,12,7)<.5?-23-Math.floor(B(e,13,7)*3):23+Math.floor(B(e,13,7)*3);t.isSet(n,X+1,r)||(t.set(n,X+1,r,B(e,14,7)<.6?W.BARREL:W.CRATE),B(e,15,7)<.3&&t.set(n,X+2,r,W.BARREL))}for(let e=0;e<30;e++){let n=-102+Math.floor(B(e,16,8)*204),r=-76+Math.floor(B(e,17,8)*168);t.isSet(n,X,r)||t.isSet(n,X+1,r)||Math.abs(r)<8||xd(t,n,r,3)||t.set(n,X+1,r,B(e,18,8)<.5?W.DEAD_BUSH:W.TALL_GRASS)}let h=[];for(let e=-92;e<=92;e+=6)h.push({x:e,y:X+1,z:-3}),h.push({x:e,y:X+1,z:3});for(let e=-90;e<=90;e+=9)(e<-4||e>4)&&(h.push({x:e,y:X+2,z:-5}),h.push({x:e,y:X+2,z:5}));for(let e=-40;e<=56;e+=8)(e<31||e>50)&&h.push({x:0,y:X+1,z:e});for(let e=-24;e<=24;e+=8)h.push({x:-57,y:X+1,z:e}),h.push({x:57,y:X+1,z:e});for(let e=-80;e<=80;e+=12)h.push({x:e,y:X+1,z:-28}),h.push({x:e,y:X+1,z:28});for(let e=-20;e<=20;e+=8)h.push({x:e,y:X+2,z:-55});h.push({x:-1,y:X+1,z:-18},{x:2,y:X+1,z:-23},{x:-10,y:X+1,z:-20});for(let[e,t]of m)h.push({x:e,y:X+2,z:t,sit:!0});return t.streetSpots=h,t.gatherSpots=[{x:0,z:-18,y:X+1,slots:[[-2,-18],[2,-18],[0,-16],[-2,-22],[2,-22]]},{x:-27,z:3,y:X+1,slots:[[-28,2],[-26,2],[-27,1],[-25,3]]},{x:30,z:-2,y:X+1,slots:[[29,-2],[31,-2],[30,0],[32,-1]]},{x:0,y:X+2,z:-55,slots:[[-2,-55],[2,-55],[0,-57],[3,-57]]},{x:0,z:29,y:X+1,slots:[[-2,29],[2,29],[0,27],[-2,31],[2,31]]}],t.saloon=o,t.church=l,t.station=s,t.bounds={x0:-104,x1:104,z0:-78,z1:92},e}function bd(e,t,n,r,i,a,o=[]){for(let o=t;o<=r;o++)e.set(o,X+1,n,a),e.set(o,X+1,i,a);for(let o=n;o<=i;o++)e.set(t,X+1,o,a),e.set(r,X+1,o,a);for(let[t,n]of o)e.set(t,X+1,n,W.AIR);for(let a=t+1;a<r;a++)for(let t=n+1;t<i;t++)B(a,t,21)<.25&&e.set(a,X,t,W.COARSE_DIRT)}function xd(e,t,n,r){for(let i of e.buildings)if(t>=i.bounds.x0-r&&t<=i.bounds.x1+r&&n>=i.bounds.z0-r&&n<=i.bounds.z1+r)return!0;return!1}function Sd(e,t,n,r){for(let i=0;i<5;i++)e.set(t,n+i,r,W.OAK_LOG);for(let i=-2;i<=1;i++){let a=n+5-1+i,o=i<=-1?2:1;for(let n=-o;n<=o;n++)for(let s=-o;s<=o;s++)Math.abs(n)===o&&Math.abs(s)===o&&(i===1||B(t+n,r+s,i)<.5)||n===0&&s===0&&i<=0||e.isSet(t+n,a,r+s)||e.set(t+n,a,r+s,W.OAK_LEAVES)}}var Cd=[`#c69b74`,`#b98a63`,`#d9a985`,`#8d5a3b`,`#e0b48f`,`#a06e4a`,`#6b432b`],wd=[`#2b1d12`,`#4a3020`,`#7a5230`,`#1a1a1a`,`#a8773f`,`#c9a15a`,`#8c8c8c`,`#3d2a1a`],Td=[`#4a6ea8`,`#a83a3a`,`#e8e2d2`,`#5d8a4e`,`#8a6a3d`,`#3d3d3d`,`#c2a15c`,`#6f4f8a`,`#b8643a`],Ed=[`#3b4a6b`,`#4d3b2a`,`#2b2b2b`,`#5a4a3a`,`#6b6b6b`,`#2f3f5f`],Dd=[`#7a3a5a`,`#3a5a7a`,`#5a7a3a`,`#8a4a2a`,`#4a4a7a`,`#a86a8a`,`#6a8a9a`,`#8a2a2a`],Od=[`#4a3520`,`#1e1a16`,`#8a6a40`,`#5a4a3a`,`#2d2620`,`#a08860`],kd=[`#3a5a8a`,`#4a3a2a`,`#2a6a3a`,`#4a3a2a`,`#6a4a2e`],Ad=`#2a1a10`,jd=`#ffffff`,Md=`#a8484a`;function Nd(e){return[parseInt(e.slice(1,3),16),parseInt(e.slice(3,5),16),parseInt(e.slice(5,7),16)]}function Pd(e,t){let[n,r,i]=Nd(e),a=e=>Math.max(0,Math.min(255,Math.round(e*t)));return`rgb(${a(n)},${a(r)},${a(i)})`}function Fd(e,t,n){let r=Nd(e),i=Nd(t);return`rgb(${r.map((e,t)=>Math.round(e+(i[t]-e)*n)).join(`,`)})`}function Id(e){let[t,n,r]=Nd(e);return(.2126*t+.7152*n+.0722*r)/255}var Z={headTop:[8,0,8,8],headBottom:[16,0,8,8],headRight:[0,8,8,8],headFront:[8,8,8,8],headLeft:[16,8,8,8],headBack:[24,8,8,8],bodyTop:[20,16,8,4],bodyBottom:[28,16,8,4],bodyRight:[16,20,4,12],bodyFront:[20,20,8,12],bodyLeft:[28,20,4,12],bodyBack:[32,20,8,12],armTop:[44,16,4,4],armBottom:[48,16,4,4],armRight:[40,20,4,12],armFront:[44,20,4,12],armLeft:[48,20,4,12],armBack:[52,20,4,12],legTop:[4,16,4,4],legBottom:[8,16,4,4],legRight:[0,20,4,12],legFront:[4,20,4,12],legLeft:[8,20,4,12],legBack:[12,20,4,12]};function Ld(e){let t=new Dl((e.seed||1)*7919+13),n=document.createElement(`canvas`);n.width=64,n.height=32;let r=n.getContext(`2d`),i=(e,t,n=0,i=0,a=e[2],o=e[3])=>{r.fillStyle=t,r.fillRect(e[0]+n,e[1]+i,a,o)},a=(e,t,n,i)=>{r.fillStyle=i,r.fillRect(e[0]+t,e[1]+n,1,1)},o=(e,n,r)=>{for(let i=0;i<e[3];i++)for(let o=0;o<e[2];o++)t.next()<.35&&a(e,o,i,Pd(n,1+(t.next()-.5)*r))},s=t.pick(Cd),c=t.pick(wd),l=!!e.female,u=e.role||`townsman`,d=t.pick(Td),f=t.pick(Ed),p=null,m=null,h=t.pick(Od),g=t.pick(Dd),_=t.chance(.3),v=!1,y=!1,b=!1,x=!1,S=!1,C=!l&&t.chance(.5),w=!l&&t.chance(.5);switch(u){case`sheriff`:d=`#e8e2d2`,p=`#1e1a16`,f=`#2b2b2b`,h=`#1e1a16`,y=!0,_=!1;break;case`deputy`:d=t.pick([`#4a6ea8`,`#8a6a3d`]),p=`#4d3b2a`,y=!0,_=!1;break;case`bartender`:d=`#f0ece0`,p=`#1a1a1a`,f=`#1a1a1a`,m=`#f0ece0`,b=!0,_=!1,C=!1;break;case`shopkeeper`:d=`#f0ece0`,m=`#c2a15c`,_=!1,v=!0;break;case`doctor`:d=`#f0ece0`,p=`#2b2b2b`,f=`#2b2b2b`,h=`#1a1a1a`,_=!1,x=!0;break;case`banker`:d=`#f0ece0`,p=`#3a3a4a`,f=`#2b2b3a`,h=`#1a1a1a`,_=!1,x=!0;break;case`preacher`:d=`#1a1a1a`,p=`#1a1a1a`,f=`#1a1a1a`,h=`#1a1a1a`,_=!1,x=!0,C=!1;break;case`undertaker`:d=`#f0ece0`,p=`#1a1a1a`,f=`#1a1a1a`,h=`#1a1a1a`,_=!1;break;case`blacksmith`:d=`#6b6b6b`,m=`#4d3b2a`,f=`#3b3b3b`,_=!1;break;case`railworker`:d=`#4a6ea8`,S=!0,f=`#3b4a6b`,v=!0,h=`#2f3f5f`,_=!1;break;case`rancher`:case`farmer`:case`stablehand`:_=t.chance(.7),v=t.chance(.6),h=t.pick([`#c2a15c`,`#a08860`,`#8a6a40`]);break;case`traveler`:p=t.pick([`#4d3b2a`,`#2b2b2b`]),f=`#2b2b2b`}for(let e of[Z.headTop,Z.headRight,Z.headFront,Z.headLeft,Z.headBack,Z.headBottom])i(e,s);o(Z.headFront,s,.08),i(Z.headTop,c),i(Z.headBack,c,0,0,8,l?8:5),i(Z.headRight,c,0,0,8,l?4:3),i(Z.headLeft,c,0,0,8,l?4:3),i(Z.headFront,c,0,0,8,1),l&&(i(Z.headFront,c,0,0,1,3),i(Z.headFront,c,7,0,1,3));let T=Z.headFront,E=t.pick(kd),D=t.pick([.72,.82,.92]),ee=Id(s)<.42?Ad:E,O=[{x:T[0]+2,y:T[1]+4,color:jd},{x:T[0]+3,y:T[1]+4,color:ee},{x:T[0]+5,y:T[1]+4,color:ee},{x:T[0]+6,y:T[1]+4,color:jd}];for(let e of O)r.fillStyle=e.color,r.fillRect(e.x,e.y,1,1);let k=Pd(c,D);i(T,k,2,3,2,1),i(T,k,5,3,2,1),a(T,3,5,Pd(s,.93)),a(T,4,5,Pd(s,.84)),w&&i(T,c,2,6,4,1),C?(i(T,c,1,6,6,2),i(Z.headRight,c,6,6,2,2),i(Z.headLeft,c,0,6,2,2)):i(T,l?Fd(s,Md,.55):Pd(s,.76),3,6,2,1);let te=l?g:d;for(let e of[Z.bodyFront,Z.bodyBack,Z.bodyRight,Z.bodyLeft,Z.bodyTop,Z.bodyBottom])i(e,te);if(_&&!l){let e=Pd(d,.7);for(let t of[Z.bodyFront,Z.bodyBack,Z.bodyRight,Z.bodyLeft]){for(let n=0;n<t[3];n+=3)i(t,e,0,n,t[2],1);for(let n=0;n<t[2];n+=3)i(t,e,n,0,1,t[3])}}if(S)for(let e of[Z.bodyFront,Z.bodyBack])for(let t=0;t<12;t+=2)i(e,`#e8e2d2`,0,t,8,1);if(p&&!l&&(i(Z.bodyFront,p,0,0,2,12),i(Z.bodyFront,p,6,0,2,12),i(Z.bodyFront,p,0,8,8,4),i(Z.bodyBack,p),i(Z.bodyRight,p),i(Z.bodyLeft,p),i(Z.bodyFront,d,2,0,4,8),a(Z.bodyFront,3,3,Pd(p,1.6)),a(Z.bodyFront,4,5,Pd(p,1.6))),v&&!l&&(i(Z.bodyFront,`#3a2a1a`,1,0,1,12),i(Z.bodyFront,`#3a2a1a`,6,0,1,12),i(Z.bodyBack,`#3a2a1a`,1,0,1,12),i(Z.bodyBack,`#3a2a1a`,6,0,1,12)),m&&i(Z.bodyFront,m,1,4,6,8),l&&(i(Z.bodyFront,Pd(g,.8),3,0,2,12),t.chance(.6)&&i(Z.bodyFront,`#f0ece0`,2,5,4,7),i(Z.bodyFront,`#f0ece0`,3,0,2,1)),b&&i(Z.bodyFront,`#1a1a1a`,3,0,2,1),x&&i(Z.bodyFront,`#f0ece0`,3,0,2,2),y&&(a(Z.bodyFront,1,3,`#f0c040`),a(Z.bodyFront,1,2,`#f0c040`),a(Z.bodyFront,0,3,`#f0c040`),a(Z.bodyFront,2,3,`#f0c040`),a(Z.bodyFront,1,4,`#f0c040`)),!l&&t.chance(.35)&&u!==`bartender`&&u!==`doctor`&&u!==`banker`&&u!==`preacher`){let e=t.pick([`#a83a3a`,`#3a5aa8`,`#f0c040`]);i(Z.bodyFront,e,0,0,8,1),i(Z.bodyBack,e,0,0,8,1),i(Z.bodyRight,e,0,0,4,1),i(Z.bodyLeft,e,0,0,4,1),i(Z.bodyFront,e,3,1,2,2)}if(!l){for(let e of[Z.bodyFront,Z.bodyBack,Z.bodyRight,Z.bodyLeft])i(e,`#3a2a1a`,0,11,e[2],1);a(Z.bodyFront,3,11,`#c9a15a`),a(Z.bodyFront,4,11,`#c9a15a`)}for(let e of[Z.armFront,Z.armBack,Z.armRight,Z.armLeft]){if(i(e,te),_&&!l){let t=Pd(d,.7);for(let n=0;n<12;n+=3)i(e,t,0,n,4,1);i(e,t,1,0,1,12)}if(S)for(let t=0;t<12;t+=2)i(e,`#e8e2d2`,0,t,4,1);i(e,s,0,9,4,3),(u===`shopkeeper`||u===`bartender`)&&i(e,s,0,6,4,6)}i(Z.armTop,te),i(Z.armBottom,s);let ne=l?g:f;for(let e of[Z.legFront,Z.legBack,Z.legRight,Z.legLeft])i(e,ne),l?(i(e,Pd(g,.85),0,4,4,1),i(e,Pd(g,.85),0,9,4,1),i(e,`#1a1a1a`,0,11,4,1)):(i(e,`#2a1a0e`,0,9,4,3),t.chance(.4)&&i(e,Pd(f,.85),0,5,4,1)),(u===`rancher`||u===`farmer`||u===`railworker`)&&v&&i(e,ne);i(Z.legTop,ne),i(Z.legBottom,`#2a1a0e`);let A=Rd(u,l,t),re=T[0]+2,ie=T[1]+4,ae={x:re,y:ie,w:5,h:1,pixels:O,iris:ee,lid:Pd(s,.85),image:r.getImageData(re,ie,5,1)};return{canvas:n,hat:A,hatColor:h,hair:c,skin:s,seed:e.seed||1,eyes:ae}}function Rd(e,t,n){if(t)return n.chance(.55)?`bonnet`:`none`;switch(e){case`bartender`:case`blacksmith`:return n.chance(.2)?`flatcap`:`none`;case`shopkeeper`:return n.chance(.5)?`flatcap`:`none`;case`doctor`:case`banker`:case`undertaker`:return`bowler`;case`preacher`:return`flat`;case`railworker`:return`flatcap`;case`rancher`:case`farmer`:case`stablehand`:return n.chance(.6)?`straw`:`cowboy`;default:return n.chance(.85)?`cowboy`:`none`}}var zd=Z,Bd={uSkyLight:{value:1},uSkyTint:{value:new I(1,1,1)},uFogColor:{value:new I(.7,.8,1)},uFogNear:{value:80},uFogFar:{value:120},uFlash:{value:0}},Vd=`
varying vec2 vUv;
varying float vShade;
varying float vDist;
void main() {
  vUv = uv;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7));
  vec3 l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,Hd=`
uniform sampler2D map;
uniform vec2 uLight;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFlash;
uniform vec3 uTint;
uniform float uOpacity;
uniform float uHurt;
varying vec2 vUv;
varying float vShade;
varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(uLight.x) * uSkyLight;
  float blk = blockCurve(uLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * uTint * light * vShade;
  col = mix(col, vec3(1.0, 0.3, 0.3), uHurt * 0.5);
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, uOpacity);
}`;function Ud(e,t={}){let n=new _a({uniforms:{map:{value:e},uLight:{value:new Tt(1,0)},uSkyLight:Bd.uSkyLight,uSkyTint:Bd.uSkyTint,uFogColor:Bd.uFogColor,uFogNear:Bd.uFogNear,uFogFar:Bd.uFogFar,uFlash:Bd.uFlash,uTint:{value:new I(1,1,1)},uOpacity:{value:1},uHurt:{value:0}},vertexShader:Vd,fragmentShader:Hd,side:t.side??0,transparent:!!t.transparent}),r=n.clone.bind(n);return n.clone=()=>{let e=r();return e.uniforms.uSkyLight=Bd.uSkyLight,e.uniforms.uSkyTint=Bd.uSkyTint,e.uniforms.uFogColor=Bd.uFogColor,e.uniforms.uFogNear=Bd.uFogNear,e.uniforms.uFogFar=Bd.uFogFar,e.uniforms.uFlash=Bd.uFlash,e.clone=n.clone,e},n}function Wd(e){let t=new na(e);return t.magFilter=f,t.minFilter=f,t.generateMipmaps=!1,t.colorSpace=``,t.flipY=!1,t}var Q=1.8/32;function Gd(e,t,n=64,r=32){let i=e.attributes.uv,a=[t.left,t.right,t.top,t.bottom,t.front,t.back];for(let e=0;e<6;e++){let t=a[e];for(let a=0;a<4;a++){let o=e*4+a,s=+(i.getX(o)>.5),c=i.getY(o)>.5,l=t[0]+s*t[2],u=c?t[1]:t[1]+t[3];i.setXY(o,l/n,u/r)}}i.needsUpdate=!0}function Kd(e,t,n,r,i,a){let o=new oa(e*Q,t*Q,n*Q);return Gd(o,r),o.translate(a[0]*Q,a[1]*Q,a[2]*Q),new mi(o,i)}var qd={top:zd.headTop,bottom:zd.headBottom,right:zd.headRight,front:zd.headFront,left:zd.headLeft,back:zd.headBack},Jd={top:zd.bodyTop,bottom:zd.bodyBottom,right:zd.bodyRight,front:zd.bodyFront,left:zd.bodyLeft,back:zd.bodyBack},Yd={top:zd.armTop,bottom:zd.armBottom,right:zd.armRight,front:zd.armFront,left:zd.armLeft,back:zd.armBack},Xd={top:zd.legTop,bottom:zd.legBottom,right:zd.legRight,front:zd.legFront,left:zd.legLeft,back:zd.legBack};function Zd(e,t){let n=document.createElement(`canvas`);n.width=8,n.height=8;let r=n.getContext(`2d`);return r.fillStyle=e,r.fillRect(0,0,8,8),r.fillStyle=t,r.fillRect(0,5,8,1),Wd(n)}function Qd(e,t,n){let r=Ud(Wd(e)),i=new wn,a=Kd(8,8,8,qd,r,[0,4,0]);a.position.set(0,24*Q,0);let o=Kd(8,12,4,Jd,r,[0,0,0]);o.position.set(0,18*Q,0);let s=Kd(4,12,4,Yd,r,[0,-4,0]);s.position.set(-6*Q,22*Q,0);let c=Kd(4,12,4,Yd,r,[0,-4,0]);c.position.set(6*Q,22*Q,0);let l=Kd(4,12,4,Xd,r,[0,-6,0]);l.position.set(-2*Q,12*Q,0);let u=Kd(4,12,4,Xd,r,[0,-6,0]);if(u.position.set(2*Q,12*Q,0),i.add(a,o,s,c,l,u),t&&t!==`none`){let e=Ud(Zd(n,t===`straw`?`#8a6a40`:`#1a1a1a`)),r=(t,n,r,i)=>{let a=new oa(t*Q,n*Q,r*Q);return a.translate(0,i*Q,0),new mi(a,e)};switch(t){case`cowboy`:a.add(r(13,1,13,8.5),r(8.6,4,8.6,11));break;case`straw`:a.add(r(14,1,14,8.5),r(8.6,3,8.6,10.5));break;case`bowler`:a.add(r(11,1,11,8.5),r(8.6,3.5,8.6,10.75));break;case`flat`:a.add(r(12,1,12,8.5),r(8.6,2,8.6,10));break;case`flatcap`:{let e=r(8.6,2,8.6,9);a.add(e);let t=r(6,1,4,8.5);t.position.z=5*Q,a.add(t);break}case`bonnet`:{let e=r(8.8,5,8.8,6);e.position.z=-1*Q,a.add(e);let t=r(9.5,6,2,6.5);t.position.z=4.5*Q,a.add(t);break}}}return{root:i,head:a,body:o,rightArm:s,leftArm:c,rightLeg:l,leftLeg:u,material:r}}function $d(e,t){let n=Ud(Wd(t)),r=new wn,i={root:r,material:n,parts:{}};for(let a of e){let e=new oa(a.w*Q,a.h*Q,a.d*Q);a.uv&&Gd(e,a.uv,t.width,t.height),a.pivot&&e.translate(a.pivot[0]*Q,a.pivot[1]*Q,a.pivot[2]*Q);let o=new mi(e,n);o.position.set(a.x*Q,a.y*Q,a.z*Q),a.rot&&o.rotation.set(a.rot[0],a.rot[1],a.rot[2]),r.add(o),i.parts[a.name]=o}return i}var ef={minGap:2.5,maxGap:7,minDur:.12,maxDur:.16,maxDist:40};function tf(e){let t=e&&e.model&&e.model.material;return t&&t.uniforms&&t.uniforms.map?t.uniforms.map.value:null}function nf(e){e.tex||(e.tex=tf(e.npc)),e.tex&&(e.tex.needsUpdate=!0)}function rf(e){let{ctx:t,eyes:n}=e;t.fillStyle=n.lid;for(let e of n.pixels)t.fillRect(e.x,e.y,1,1);e.closed=!0,nf(e)}function af(e){e.ctx.putImageData(e.eyes.image,e.eyes.x,e.eyes.y),e.closed=!1,nf(e)}function of(e,t,n=null){if(!e||!t||!t.eyes||!t.canvas)return null;let r=new Dl(((e.id|0)+1)*48271+(t.seed|0)*7+977>>>0),i={npc:e,eyes:t.eyes,canvas:t.canvas,ctx:t.canvas.getContext(`2d`),tex:n||tf(e),rng:r,timer:r.range(.5,ef.maxGap),closeLeft:0,closed:!1,hold:!1,blinks:0};return e.blink=i,i}function sf(e,t){let n=e&&e.blink;if(!n||n.hold||!(t>0))return;t>.25&&(t=.25);let r=e.root&&e.root.visible===!1||typeof e.lastCamDist==`number`&&e.lastCamDist>ef.maxDist;if(n.closed){n.closeLeft-=t,(n.closeLeft<=0||r)&&af(n);return}n.timer-=t,!(n.timer>0)&&(n.timer=n.rng.range(ef.minGap,ef.maxGap),!r&&(n.closeLeft=n.rng.range(ef.minDur,ef.maxDur),n.blinks++,rf(n)))}var cf=new Set([U.CUBE,U.SLAB_TOP,U.TABLE,U.FARMLAND,U.ANVIL,U.CACTUS]),lf=new Set([U.SLAB,U.TROUGH,U.BED,U.CHEST]);function uf(e){return e!==W.WATER&&!G[e].solid}function df(e,t,n,r){let i=e.getBlock(t,n,r),a=G[i];if(a.solid){if(!lf.has(a.shape))return null;let i=a.boxes.length?a.boxes[0][4]:.5;return!uf(e.getBlock(t,n+1,r))||!uf(e.getBlock(t,n+2,r))?null:n+i}if(i===W.WATER)return null;let o=G[e.getBlock(t,n-1,r)];return!o.solid||!cf.has(o.shape)||!uf(e.getBlock(t,n+1,r))?null:n}function ff(e,t,n,r,i=3){for(let a=0;a<=i;a++)for(let i of a===0?[n]:[n+a,n-a]){let n=df(e,t,i,r);if(n!==null)return{x:t,y:i,z:r,h:n}}return null}var pf=class{constructor(){this.a=[]}push(e){let t=this.a;t.push(e);let n=t.length-1;for(;n>0;){let e=n-1>>1;if(t[e].f<=t[n].f)break;[t[e],t[n]]=[t[n],t[e]],n=e}}pop(){let e=this.a,t=e[0],n=e.pop();if(e.length){e[0]=n;let t=0;for(;;){let n=t*2+1,r=n+1,i=t;if(n<e.length&&e[n].f<e[i].f&&(i=n),r<e.length&&e[r].f<e[i].f&&(i=r),i===t)break;[e[i],e[t]]=[e[t],e[i]],t=i}}return t}get size(){return this.a.length}},mf=(e,t,n)=>((e+32768)*65536+(n+32768))*256+t,hf=[[1,0],[-1,0],[0,1],[0,-1]];function gf(e,t,n,r,i,a,o,s=4e3,c=null){let l=ff(e,t,n,r,2),u=ff(e,i,a,o,3);if(!l||!u)return null;let d=new pf,f=new Map,p=new Map,m=new Set,h=(e,t)=>Math.abs(e-u.x)+Math.abs(t-u.z),g=mf(l.x,l.y,l.z);f.set(g,0),d.push({x:l.x,y:l.y,z:l.z,hgt:l.h,g:0,f:h(l.x,l.z),k:g});let _=0,v=null,y=1/0;for(;d.size;){let t=d.pop();if(m.has(t.k))continue;m.add(t.k);let n=h(t.x,t.z);if(n<y&&(y=n,v=t),t.x===u.x&&t.z===u.z&&Math.abs(t.y-u.y)<=1){v=t;break}if(++_>s)break;for(let[n,r]of hf){let i=t.x+n,a=t.z+r;for(let n of[0,1,-1]){let r=t.y+n,o=df(e,i,r,a);if(o===null||Math.abs(o-t.hgt)>1.05||o>t.hgt+.55&&!uf(e.getBlock(t.x,t.y+2,t.z)))continue;let s=mf(i,r,a);if(m.has(s))break;let l=1+(o===t.hgt?0:.4);c&&c(i,r,a)&&(l+=6);let u=t.g+l;u<(f.get(s)??1/0)&&(f.set(s,u),p.set(s,t),d.push({x:i,y:r,z:a,hgt:o,g:u,f:u+h(i,a),k:s}));break}}}if(!v||(v.x!==u.x||v.z!==u.z)&&y>3)return null;let b=[],x=v;for(;x&&x.k!==g;)b.push({x:x.x,y:x.y,z:x.z,h:x.hgt}),x=p.get(x.k);return b.reverse(),b}var _f=.6,vf=1e-4,yf=class e{constructor(e,t,n,r,i,a){this.x0=e,this.y0=t,this.z0=n,this.x1=r,this.y1=i,this.z1=a}copy(e){return this.x0=e.x0,this.y0=e.y0,this.z0=e.z0,this.x1=e.x1,this.y1=e.y1,this.z1=e.z1,this}clone(){return new e(this.x0,this.y0,this.z0,this.x1,this.y1,this.z1)}offset(e,t,n){return this.x0+=e,this.x1+=e,this.y0+=t,this.y1+=t,this.z0+=n,this.z1+=n,this}intersects(e){return this.x0<e.x1&&this.x1>e.x0&&this.y0<e.y1&&this.y1>e.y0&&this.z0<e.z1&&this.z1>e.z0}};function bf(e,t,n=[]){n.length=0;let r=Math.floor(t.x0),i=Math.floor(t.x1),a=Math.max(0,Math.floor(t.y0)),o=Math.min(127,Math.floor(t.y1)),s=Math.floor(t.z0),c=Math.floor(t.z1);for(let t=r;t<=i;t++)for(let r=s;r<=c;r++)for(let i=a;i<=o;i++){let a=e.getBlock(t,i,r);if(a===0)continue;let o=G[a];if(o.solid)for(let e of o.boxes)n.push(new yf(t+e[0],i+e[1],r+e[2],t+e[3],i+e[4],r+e[5]))}return n}var xf=1e-5;function Sf(e,t,n){for(let r of t)if(!(e.x1<=r.x0+xf||e.x0>=r.x1-xf||e.z1<=r.z0+xf||e.z0>=r.z1-xf)){if(n>0&&e.y1<=r.y0+xf){let t=r.y0-e.y1;t<n&&(n=t)}else if(n<0&&e.y0>=r.y1-xf){let t=r.y1-e.y0;t>n&&(n=t)}}return n}function Cf(e,t,n){for(let r of t)if(!(e.y1<=r.y0+xf||e.y0>=r.y1-xf||e.z1<=r.z0+xf||e.z0>=r.z1-xf)){if(n>0&&e.x1<=r.x0+xf){let t=r.x0-e.x1;t<n&&(n=t)}else if(n<0&&e.x0>=r.x1-xf){let t=r.x1-e.x0;t>n&&(n=t)}}return n}function wf(e,t,n){for(let r of t)if(!(e.y1<=r.y0+xf||e.y0>=r.y1-xf||e.x1<=r.x0+xf||e.x0>=r.x1-xf)){if(n>0&&e.z1<=r.z0+xf){let t=r.z0-e.z1;t<n&&(n=t)}else if(n<0&&e.z0>=r.z1-xf){let t=r.z1-e.z0;t>n&&(n=t)}}return n}function Tf(e){let t=Math.round(e*16)/16;return Math.abs(e-t)<1e-6?t:e}function Ef(e,t,n,r,i,a=0,o=!1,s=[]){let c=n,l=r,u=i,d=t.clone();d.x0=Math.min(d.x0,d.x0+n)-1,d.x1=Math.max(d.x1,d.x1+n)+1,d.y0=Math.min(d.y0,d.y0+r)-1,d.y1=Math.max(d.y1,d.y1+r)+a+1,d.z0=Math.min(d.z0,d.z0+i)-1,d.z1=Math.max(d.z1,d.z1+i)+1;let f=bf(e,d,s),p=t.clone();r=Sf(t,f,r),t.offset(0,r,0),n=Cf(t,f,n),t.offset(n,0,0),i=wf(t,f,i),t.offset(0,0,i);let m=Math.abs(n-c)>vf||Math.abs(i-u)>vf;if(o&&m&&a>0){let e=p.clone(),o=Sf(e,f,a);e.offset(0,o,0);let s=Cf(e,f,c);e.offset(s,0,0);let l=wf(e,f,u);e.offset(0,0,l);let d=Sf(e,f,-o);e.offset(0,d,0);let m=n*n+i*i;s*s+l*l>m+vf&&(t.copy(e),n=s,i=l,r=o+d)}let h=t.y1-t.y0,g=t.x1-t.x0,_=t.z1-t.z0;return t.y0=Tf(t.y0),t.y1=t.y0+h,t.x0=Tf(t.x0),t.x1=t.x0+g,t.z0=Tf(t.z0),t.z1=t.z0+_,{dx:n,dy:r,dz:i,hitY:r!==l,hitX:Math.abs(n-c)>vf,hitZ:Math.abs(i-u)>vf,oy:l}}var Df=class{constructor(e){this.world=e,this.pos=new I(0,70,0),this.prevPos=this.pos.clone(),this.vel=new I,this.yaw=0,this.pitch=0,this.onGround=!1,this.sprinting=!1,this.sneaking=!1,this.inWater=!1,this.eyeUnderwater=!1,this.health=20,this.food=20,this.exhaustion=0,this.foodTimer=0,this.fallDistance=0,this.walkDist=0,this.prevWalkDist=0,this.bob=0,this.prevBob=0,this.eyeHeight=Nl,this.prevEyeHeight=Nl,this.stepDist=0,this.nextStep=1,this.hurtTime=0,this.dead=!1,this.deathTimer=0,this.scratch=[],this.events=[],this.autoJump=!0,this.jumpCooldown=0,this.lastGroundBlock=W.GRASS,this.force=new I,this.lastImpact=0}addForce(e,t,n){this.force.x+=e,this.force.y+=t,this.force.z+=n}impulse(e,t,n){this.vel.x+=e/20,this.vel.y+=t/20,this.vel.z+=n/20}get box(){let e=jl/2,t=this.sneaking?1.5:Ml;return new yf(this.pos.x-e,this.pos.y,this.pos.z-e,this.pos.x+e,this.pos.y+t,this.pos.z+e)}eyePos(e,t){return t.lerpVectors(this.prevPos,this.pos,e),t.y+=this.prevEyeHeight+(this.eyeHeight-this.prevEyeHeight)*e,t}forwardDir(e){return e.set(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)),e}teleport(e,t,n){this.pos.set(e,t,n),this.prevPos.copy(this.pos),this.vel.set(0,0,0),this.fallDistance=0}blockAt(e,t,n){return this.world.getBlock(Math.floor(e),Math.floor(t),Math.floor(n))}isInWater(){let e=this.box,t=Math.floor(e.x0),n=Math.floor(e.x1),r=Math.floor(e.z0),i=Math.floor(e.z1),a=Math.floor(e.y0),o=Math.floor(e.y0+.9);for(let e=t;e<=n;e++)for(let t=r;t<=i;t++)for(let n=a;n<=o;n++)if(this.world.getBlock(e,n,t)===W.WATER)return!0;return!1}tick(e){if(this.prevPos.copy(this.pos),this.prevWalkDist=this.walkDist,this.prevBob=this.bob,this.prevEyeHeight=this.eyeHeight,this.hurtTime>0&&this.hurtTime--,this.jumpCooldown>0&&this.jumpCooldown--,this.dead){this.deathTimer++,this.vel.set(0,0,0);return}let t=e.forward,n=e.strafe;this.sneaking=!!e.sneak&&this.onGround!==void 0;let r=e.sprint&&t>0&&this.food>6&&!this.sneaking;r&&!this.sprinting&&(this.sprinting=!0),(!r||t<=0)&&(this.sprinting=!1),this.sneaking&&(t*=.3,n*=.3),this.inWater=this.isInWater();let i=this.blockAt(this.pos.x,this.pos.y+this.eyeHeight,this.pos.z);this.eyeUnderwater=i===W.WATER;let a=Math.sqrt(t*t+n*n);a>1&&(t/=a,n/=a,a=1);let o;if(o=this.inWater?.02:this.onGround?this.sprinting?.13:.1:this.sprinting?.026:.02,a>1e-4){let e=Math.sin(this.yaw),r=Math.cos(this.yaw),i=-e,a=-r,s=r,c=-e;this.vel.x+=(i*t+s*n)*o,this.vel.z+=(a*t+c*n)*o}if(e.jump&&(this.inWater?this.vel.y+=.04:this.onGround&&this.jumpCooldown===0&&this.jump()),this.force.x||this.force.y||this.force.z){this.vel.x+=this.force.x*.0025,this.vel.y+=this.force.y*.0025,this.vel.z+=this.force.z*.0025;let e=Math.hypot(this.vel.x,this.vel.y,this.vel.z);if(e>1.6){let t=1.6/e;this.vel.x*=t,this.vel.y*=t,this.vel.z*=t}this.force.set(0,0,0)}let s=this.vel.x,c=this.vel.z;if(this.sneaking&&this.onGround){let e=(e,t)=>{let n=this.box.offset(e,-.6,t),r=n.clone();return r.y0-=.1,bf(this.world,r,this.scratch).some(e=>e.intersects(n))};e(s,0)||(s=0),e(0,c)||(c=0),e(s,c)||(s=0,c=0)}let l=this.box,u=this.onGround,d=Ef(this.world,l,s,this.vel.y,c,_f,u||this.inWater,this.scratch),f=jl/2;if(this.pos.set(l.x0+f,l.y0,l.z0+f),this.onGround=d.hitY&&d.oy<0,d.hitX&&(this.vel.x=0),d.hitZ&&(this.vel.z=0),d.hitY&&(d.oy<0&&!this.inWater&&this.land(),this.vel.y=0),this.sprinting&&(d.hitX||d.hitZ),this.autoJump&&this.onGround&&!this.sneaking&&(d.hitX||d.hitZ)&&a>.3&&this.jumpCooldown===0&&!this.inWater){let e=this.box.offset(s*4+Math.sign(s)*.05,1.01,c*4+Math.sign(c)*.05),t=e.clone();t.y0-=.05,bf(this.world,t,this.scratch).some(t=>t.intersects(e))||(this.jump(),this.jumpCooldown=10)}if(this.inWater)this.vel.x*=.8,this.vel.y*=.8,this.vel.z*=.8,this.vel.y-=.02,this.fallDistance=0;else{this.vel.y-=.08,this.vel.y*=.98;let e=this.onGround?.546:.91;this.vel.x*=e,this.vel.z*=e,!this.onGround&&this.vel.y<0&&(this.fallDistance+=-d.dy)}Math.abs(this.vel.x)<.003&&(this.vel.x=0),Math.abs(this.vel.z)<.003&&(this.vel.z=0);let p=this.pos.x-this.prevPos.x,m=this.pos.z-this.prevPos.z,h=Math.sqrt(p*p+m*m);this.walkDist+=h*.6;let g=Math.min(Math.sqrt(this.vel.x*this.vel.x+this.vel.z*this.vel.z),.1);if(this.onGround||(g=0),this.bob+=(g-this.bob)*.4,this.onGround&&(this.stepDist+=h*.6,this.stepDist>this.nextStep)){this.nextStep=Math.floor(this.stepDist)+1;let e=this.world.getBlock(Math.floor(this.pos.x),Math.floor(this.pos.y-.2),Math.floor(this.pos.z));e!==W.AIR&&(this.lastGroundBlock=e),this.events.push({type:`step`,block:this.lastGroundBlock,inWater:this.inWater})}let _=this.sneaking?Pl:Nl;this.eyeHeight+=(_-this.eyeHeight)*.5,this.exhaustion+=h*(this.sprinting?.1:.01),this.exhaustion>4&&(this.exhaustion-=4,this.food>0&&this.food--),this.food>=18&&this.health<20?(this.foodTimer++,this.foodTimer>=80&&(this.foodTimer=0,this.health=Math.min(20,this.health+1),this.exhaustion+=3)):this.food<=0?(this.foodTimer++,this.foodTimer>=80&&(this.foodTimer=0,this.health>1&&this.damage(1))):this.foodTimer=0,this.pos.y<-10&&(this.damage(4),this.pos.y=80,this.vel.set(0,0,0))}jump(){this.vel.y=.42,this.sprinting&&(this.vel.x+=-Math.sin(this.yaw)*.2,this.vel.z+=-Math.cos(this.yaw)*.2),this.exhaustion+=this.sprinting?.2:.05,this.events.push({type:`jump`})}land(){if(this.fallDistance>3){let e=Math.floor(this.fallDistance-3);e>0&&(this.damage(e),this.events.push({type:`fallhurt`,damage:e}))}else this.fallDistance>.5&&this.events.push({type:`land`,block:this.lastGroundBlock});this.fallDistance=0}damage(e){this.dead||(this.health-=e,this.hurtTime=10,this.events.push({type:`hurt`}),this.health<=0&&(this.health=0,this.dead=!0,this.deathTimer=0,this.events.push({type:`death`})))}respawn(e,t,n){this.dead=!1,this.health=20,this.food=20,this.exhaustion=0,this.teleport(e,t,n)}viewBob(e,t){let n=this.walkDist-this.prevWalkDist,r=-(this.prevWalkDist+n*e),i=this.prevBob+(this.bob-this.prevBob)*e;return t.tx=Math.sin(r*Math.PI)*i*.5,t.ty=-Math.abs(Math.cos(r*Math.PI)*i),t.roll=Math.sin(r*Math.PI)*i*3*(Math.PI/180),t.pitch=Math.abs(Math.cos(r*Math.PI-.2)*i)*5*(Math.PI/180),t}},Of=.05,kf=2.6,Af=3.4,jf=`Arthur.Charles.John.Hosea.Lenny.Sean.Javier.Bill.Dutch.Micah.Jack.Eli.Jeb.Clyde.Silas.Wyatt.Ezra.Amos.Cornelius.Josiah.Buck.Kieran.Milton.Albert.Tomas.Jed.Otis.Rufus`.split(`.`),Mf=[`Mary`,`Abigail`,`Sadie`,`Tilly`,`Karen`,`Molly`,`Susan`,`Hattie`,`Eleanor`,`Rosalind`,`Ida`,`Delilah`,`Beatrice`,`Cassidy`,`Pearl`,`Ada`],Nf={generic:[`Howdy, stranger.`,`Fine day, ain't it?`,`You new in town?`,`Mind yourself around here.`,`The saloon's got the coldest beer this side of the river.`,`Heard the train's runnin' late again.`,`Dustwater. Nothing but dust and water, friend.`],sheriff:[`Keep your nose clean, stranger.`,`No trouble in my town, you hear?`,`Seen any outlaws on the road?`,`I've got my eye on you.`],deputy:[`Sheriff's got his eye on you.`,`Quiet day. Let's keep it that way.`,`Move along now.`],bartender:[`What'll it be? Whiskey?`,`Pay up front, friend.`,`Piano man's takin' requests.`,`No fighting in my saloon.`],shopkeeper:[`Come on in, take a look around.`,`Fresh goods off the morning train.`,`We ain't running a charity, friend.`,`Best prices in the territory.`],doctor:[`You look pale. Sleep more, drink less.`,`Bullet wounds cost extra.`,`Don't drink the river water.`],banker:[`Your money's safe with us. Mostly.`,`Interest rates are... reasonable.`,`The vault is quite secure, I assure you.`],preacher:[`Bless you, child.`,`Sunday service at nine. Don't be late.`,`The Lord watches even out here.`],blacksmith:[`Need a horse shod?`,`Iron don't bend itself.`,`Mind the forge, it bites.`],rancher:[`Cattle prices are down again.`,`Rain'd be nice.`,`Them coyotes been at the chickens.`,`Long day ahead.`],farmer:[`Wheat's coming in fine this year.`,`Soil out here is stubborn as a mule.`],stablehand:[`Fine horses, all of them.`,`Two dollars a night for the stable.`],railworker:[`Train's due any minute.`,`Mind the tracks, friend.`,`Freight comes in twice a day.`],townswoman:[`Good day to you.`,`Lovely weather for a walk.`,`Have you seen the new dresses at the tailor's?`,`Keep out of that saloon, young man.`],traveler:[`Just passin' through.`,`Long ride from the north.`,`Poker game tonight at the saloon.`,`Nice town. Quiet.`],pianist:[`Requests cost a nickel.`,`Music soothes the savage cowboy.`],poke:[`Hey! Watch it!`,`Keep your hands to yourself!`,`You lookin' for trouble?`,`Easy there, partner.`],flood:[`The river's coming! Get to high ground!`,`Water! Everybody up the stairs!`,`Grab what you can and run!`,`Lord help us, the whole street is flooding!`],tornado:[`Twister! Take cover!`,`Get inside, now!`,`Ring the bell! Tornado!`,`Don't look at it, RUN!`],beam:[`What in God's name is that light?!`,`The sky is burning! Run!`,`Get away from there!`,`Judgment day, I tell you!`],trapped:[`Help! I can't swim!`,`Somebody get me out of here!`,`I'm stuck! Help!`,`Over here! Help!`]},Pf=4.2,Ff=1.3;function If(e){return e*24%24}var Lf=class{constructor(e,t,n){this.mgr=e,this.id=t,this.name=n.name,this.role=n.role,this.female=!!n.female,this.work=n.work||null,this.home=n.home||null,this.patrol=!!n.patrol,this.rng=new Dl(1e3+t*31);let r=Ld({role:n.role,female:this.female,seed:t+7}),i=Qd(r.canvas,r.hat,r.hatColor);this.model=i,this.root=i.root,of(this,r),this.pos=new I(n.x,n.y,n.z),this.prevPos=this.pos.clone(),this.yaw=this.rng.range(0,Math.PI*2),this.targetYaw=this.yaw,this.headYaw=0,this.headPitch=0,this.state=`idle`,this.idleTimer=this.rng.range(1,6),this.path=null,this.pathIndex=0,this.target=null,this.waitingPath=!1,this.pathFails=0,this.walkTime=0,this.speed=kf,this.sitting=!1,this.lookAt=null,this.lightTimer=t%5,this.stepDist=0,this.hurt=0,this.talkCooldown=0,this.lastKind=null,this.panic=!1,this.panicUntil=0,this.air=null,this.stunned=0,this.swimming=!1,this.trapped=0,this.shoutCooldown=0,this.health=20,this.tag=this.makeTag(),this.root.add(this.tag)}makeTag(){let e=Ul(this.name,2)+8,t=document.createElement(`canvas`);t.width=e,t.height=22;let n=t.getContext(`2d`);n.fillStyle=`rgba(0,0,0,0.35)`,n.fillRect(0,0,e,22),Wl(n,this.name,4,3,2,`#ffffff`,!0);let r=new na(t);r.magFilter=f,r.minFilter=f,r.colorSpace=``;let i=new Kr(new Mr({map:r,transparent:!0,depthTest:!0,depthWrite:!1}));return i.scale.set(e*.0125,.275,1),i.position.set(0,2.25,0),i.visible=!1,i}get box(){return new yf(this.pos.x-.3,this.pos.y,this.pos.z-.3,this.pos.x+.3,this.pos.y+1.8,this.pos.z+.3)}say(e){let t=Nf[e]||Nf.generic;return t[Math.floor(this.rng.next()*t.length)]}},Rf=class{constructor(e,t,n,r,i){this.scene=e,this.world=t,this.town=n,this.audio=r,this.hud=i,this.list=[],this.pathQueue=[],this.group=new wn,e.add(this.group),this.rng=new Dl(4242),this.tickCount=0,this.spawnAll()}spawnAll(){let e=this.town,t=t=>e.buildings.filter(e=>e.kind===t),n=t=>e.buildings.find(e=>e.name===t),r=t(`house`),i=e.buildings.filter(e=>e.kind===`shop`||e.kind===`store`||e.kind===`gunsmith`||e.kind===`doctor`),a=e.saloon,o=t(`sheriff`)[0],s=t(`bank`)[0],c=n(`Grand Hotel`),l=n(`Boarding House`),u=t(`blacksmith`)[0],d=t(`stable`)[0],f=e.station,p=e.church,m=t(`barn`)[0],h=t(`ranch`)[0],g=t(`warehouse`),_=t(`market`)[0],v=0,y=()=>r[v++%r.length],b=this.rng.shuffle(jf.slice()),x=this.rng.shuffle(Mf.slice()),S=0,C=0,w=()=>b[S++%b.length],T=()=>x[C++%x.length],E=[];if(E.push({name:`Sheriff Freeman`,role:`sheriff`,work:o,home:o,patrol:!0}),E.push({name:`Deputy Ross`,role:`deputy`,work:o,home:y(),patrol:!0}),E.push({name:`Deputy Hayes`,role:`deputy`,work:o,home:y(),patrol:!0}),E.push({name:`Bartender Sam`,role:`bartender`,work:a,home:a,stay:!0}),E.push({name:`Lenny`,role:`pianist`,work:a,home:a,stay:!0,workIndex:2}),E.push({name:`Doc Whitmore`,role:`doctor`,work:t(`doctor`)[0],home:y()}),E.push({name:`Mr. Cornelius`,role:`banker`,work:s,home:y()}),E.push({name:`Strauss`,role:`banker`,work:s,home:c,workIndex:1}),E.push({name:`Charles`,role:`blacksmith`,work:u,home:y()}),E.push({name:`Kieran`,role:`stablehand`,work:d,home:d}),E.push({name:`Wyatt`,role:`railworker`,work:f,home:y()}),E.push({name:`Eli`,role:`railworker`,work:g[0],home:l}),E.push({name:`Father Callahan`,role:`preacher`,work:p,home:y()}),E.push({name:`John`,role:`rancher`,work:m,home:h}),E.push({name:`Abigail`,role:`rancher`,female:!0,work:h,home:h}),E.push({name:`Hosea`,role:`farmer`,work:m,home:y(),workIndex:1}),i.filter(e=>e.kind!==`doctor`).slice(0,11).forEach((e,t)=>{let n=t%4==3;E.push({name:(n?`Mrs. `:``)+(n?T():w()),role:`shopkeeper`,female:n,work:e,home:y()})}),_)for(let e=0;e<2;e++)E.push({name:w(),role:`farmer`,work:_,home:y(),workIndex:e});for(let e=0;e<4;e++)E.push({name:T(),role:`townswoman`,female:!0,home:y()});[`Arthur`,`Dutch`,`Javier`,`Bill`,`Micah`,`Sean`].forEach((e,t)=>E.push({name:e,role:t%2?`traveler`:`cowboy`,home:t%3==0?l:c,traveler:!0})),E.forEach((t,n)=>{let r=t.work&&t.work.work.length?t.work.work:t.work?t.work.spots:null,i=r&&r.length?r[(t.workIndex||0)%r.length]:null;i||(i=t.home&&t.home.spots.length?t.home.spots[0]:e.streetSpots[n%e.streetSpots.length]);let a=new Lf(this,n,{...t,x:i.x+.5,y:i.y,z:i.z+.5});a.workIndex=t.workIndex||0,a.stay=!!t.stay,a.traveler=!!t.traveler,this.list.push(a),this.group.add(a.root);let o=ff(this.world,Math.floor(a.pos.x),Math.floor(a.pos.y),Math.floor(a.pos.z),4);o&&(a.pos.y=o.h),a.prevPos.copy(a.pos),t.work&&(this.faceTarget(a,{kind:`work`,building:t.work}),a.yaw=a.targetYaw,a.lastKind=`work`)})}chooseTarget(e,t,n){let r=this.town,i=e.rng,a=t<6||t>=22,o=t>=6&&t<9,s=t>=17&&t<22,c=e=>e[Math.floor(i.next()*e.length)],l=(e,t=`spots`)=>{if(!e)return null;let n=e[t]&&e[t].length?e[t]:e.spots;return!n||!n.length?null:c(n)},u=(e,t,n,r=null,i=null)=>e?{x:e.x,y:e.y,z:e.z,kind:t,dwell:n,building:r,face:i}:null,d=r.buildings.filter(e=>e.kind===`shop`||e.kind===`store`||e.kind===`gunsmith`),f=()=>u(c(r.streetSpots),`street`,i.range(4,12)),p=()=>{let t=c(r.gatherSpots),n=t.slots[e.id%t.slots.length];return{x:n[0],y:t.y,z:n[1],kind:`gather`,dwell:i.range(20,60),face:{x:t.x+.5,z:t.z+.5}}},m=()=>{let e=i.chance(.5)?c(r.saloon.barSpots):l(r.saloon);return u(e,`saloon`,i.range(30,90),r.saloon)},h=()=>{let e=c(d);return u(l(e),`shop`,i.range(12,35),e)},g=(t=i.range(60,180))=>{let n=e.home;if(!n)return f();let r=a&&l(n,`beds`)||l(n);return u(r,`home`,t,n)},_=()=>{let t=e.work;if(!t)return f();let n=t.work&&t.work.length?t.work:t.spots,r=n[(e.workIndex+(i.chance(.8)?0:Math.floor(i.next()*n.length)))%n.length];return u(r,`work`,i.range(30,90),t)},v=()=>u(l(r.church),`church`,i.range(20,50),r.church),y=()=>u(l(r.station),`station`,i.range(15,40),r.station);if(e.stay){if(a&&t>=2&&t<6)return g();let n=e.work.work,r=n[e.workIndex%n.length];return i.chance(.92)?u(r,`work`,i.range(30,90),e.work):m()}if(e.patrol){if(e.role===`sheriff`&&a)return i.chance(.7)?_():f();let t=i.next();return a?t<.7?f():t<.85?p():_():s?t<.35?f():t<.6?m():t<.8?_():p():t<.45?f():t<.75?_():t<.9?p():h()}if(e.traveler){let e=i.next();return a?e<.75?g():m():s?e<.6?m():e<.8?f():p():o?e<.4?g(i.range(10,30)):e<.7?y():f():e<.3?m():e<.55?f():e<.75?h():e<.9?y():p()}if(e.work){let t=i.next();return a?t<.85?g():m():o?t<.8?_():f():s?e.female?t<.6?g():t<.8?f():h():t<.5?m():t<.75?g():t<.9?f():p():t<.7?_():t<.82?f():t<.9?h():t<.95?m():p()}let b=i.next();return a?b<.9?g():f():o?b<.4?g(i.range(15,40)):b<.7?f():h():s?e.female?b<.5?g():b<.75?f():p():b<.45?m():b<.7?f():g():b<.3?h():b<.5?f():b<.65?p():b<.8?v():b<.9?y():g(i.range(10,30))}alert(e){this.alertInfo={...e,untilTick:e.untilTick??this.tickCount+2400};let t=(e.radius||80)**2;for(let n of this.list){let r=n.pos.x-e.x,i=n.pos.z-e.z;r*r+i*i>t||(n.panic||(n.panic=!0,n.panicUntil=this.alertInfo.untilTick,this.shout(n,e.kind,.35)),n.sitting=!1,n.idleTimer=Math.min(n.idleTimer,n.rng.range(.1,1.2)),n.state===`walk`&&n.target&&n.target.kind!==`evacuate`&&(n.path=null,n.state=`idle`,n.idleTimer=n.rng.range(.1,.8),n.target=null))}}clearAlert(){this.alertInfo=null;for(let e of this.list)e.panic=!1,e.trapped=0,e.target&&e.target.kind===`evacuate`&&(e.target=null,e.path=null,e.state=`idle`,e.idleTimer=e.rng.range(1,4))}applyImpulse(e,t,n,r){e.air||(e.air={vx:0,vy:0,vz:0,spin:e.rng.range(-6,6)}),e.air.vx+=t,e.air.vy+=n,e.air.vz+=r;let i=Math.hypot(e.air.vx,e.air.vy,e.air.vz);if(i>28){let t=28/i;e.air.vx*=t,e.air.vy*=t,e.air.vz*=t}e.path=null,e.state=`idle`,e.sitting=!1}eachNear(e,t,n,r){let i=n*n;for(let n of this.list){let a=n.pos.x-e,o=n.pos.z-t;a*a+o*o<=i&&r(n,Math.sqrt(a*a+o*o))}}onBulkWorldChange(){}shout(e,t,n=1){if(e.shoutCooldown>0||e.rng.next()>n)return;let r=this.game?this.game.player.pos:null;r&&Math.hypot(e.pos.x-r.x,e.pos.z-r.z)>28||(e.shoutCooldown=e.rng.range(6,14),this.hud.addMessage(`<${e.name}> ${e.say(t)}`),this.audio.npcGrunt(e.pos,e.female?1.6:1.1))}evacuationTarget(e){let t=this.alertInfo,n=this.town,r=e.rng;if(!t)return null;let i=[],a=(e,t,n=`evacuate`)=>{e&&i.push({p:e,score:t,kind:n})},o=e=>{let n=e.x-t.x,r=e.z-t.z;return Math.sqrt(n*n+r*r)};if(t.kind===`flood`){for(let e of n.buildings)for(let n of[`beds`,`spots`])for(let i of e[n]||[])i.y>=(t.safeY||62)&&a(i,100+r.next()*10);let e=t.dir||[1,0];for(let t of n.streetSpots)a(t,-(t.x*e[0]+t.z*e[1])+r.next()*4)}else if(t.kind===`tornado`){for(let e of n.buildings)if(e.kind!==`graveyard`&&e.kind!==`market`)for(let n of e.spots){let e=o(n);e>(t.awayRadius||35)&&a(n,e+r.next()*8)}for(let e of n.streetSpots){let n=o(e);n>(t.awayRadius||35)+15&&a(e,n*.7)}}else{for(let e of n.streetSpots){let n=o(e);n>(t.awayRadius||40)&&a(e,n+r.next()*6)}for(let e of n.buildings)for(let n of e.spots){let e=o(n);e>(t.awayRadius||40)+10&&a(n,e*.8)}}if(!i.length)return null;i.sort((e,t)=>t.score-e.score);let s=i[Math.floor(r.next()*Math.min(6,i.length))];return{x:s.p.x,y:s.p.y,z:s.p.z,kind:`evacuate`,dwell:r.range(4,9)}}requestPath(e){e.waitingPath||(e.waitingPath=!0,this.pathQueue.push(e))}processPaths(){let e=3,t=performance.now();for(;this.pathQueue.length&&e-->0&&performance.now()-t<6;){let e=this.pathQueue.shift();if(e.waitingPath=!1,!e.target)continue;let t=gf(this.world,Math.floor(e.pos.x),Math.floor(e.pos.y+.01),Math.floor(e.pos.z),e.target.x,e.target.y,e.target.z,4500);if(t&&t.length)e.path=t,e.pathIndex=0,e.state=`walk`,e.pathFails=0;else if(e.pathFails++,e.target=null,e.path=null,e.state=`idle`,e.idleTimer=e.rng.range(2,6),e.pathFails>4){let t=this.town.streetSpots[Math.floor(e.rng.next()*this.town.streetSpots.length)],n=ff(this.world,t.x,t.y,t.z,4);n&&(e.pos.set(t.x+.5,n.h,t.z+.5),e.prevPos.copy(e.pos)),e.pathFails=0}}}tick(e,t){this.tickCount++;let n=If(t.time),r=e.pos;for(let i of this.list){i.prevPos.copy(i.pos);let a=i.pos.x-r.x,o=i.pos.z-r.z,s=a*a+o*o,c=s>3600;if(c&&(this.tickCount+i.id)%4!=0)continue;let l=c?Of*4:Of;this.updateNPC(i,l,n,t.dayFactor,e,s)}this.processPaths(),this.tickCount%2==0&&this.separate()}separate(){let e=this.list.length;for(let t=0;t<e;t++){let n=this.list[t];for(let r=t+1;r<e;r++){let e=this.list[r],t=e.pos.x-n.pos.x,i=e.pos.z-n.pos.z,a=t*t+i*i;if(a>.36||a<1e-6||Math.abs(n.pos.y-e.pos.y)>1)continue;let o=Math.sqrt(a),s=(.6-o)*.15,c=t/o,l=i/o;n.state===`walk`&&this.tryMove(n,-c*s,-l*s),e.state===`walk`&&this.tryMove(e,c*s,l*s)}}}tryMove(e,t,n){let r=e.pos.x+t,i=e.pos.z+n,a=df(this.world,Math.floor(r),Math.floor(e.pos.y+.01),Math.floor(i));a!==null&&Math.abs(a-e.pos.y)<.6&&(e.pos.x=r,e.pos.z=i)}tryMoveWater(e,t,n){let r=e.pos.x+t,i=e.pos.z+n;return!G[this.world.getBlock(Math.floor(r),Math.floor(e.pos.y+.6),Math.floor(i))].solid&&(e.pos.x=r,e.pos.z=i,!0)}swimToward(e,t){let n=e.target;if(!n){e.state=`idle`,e.idleTimer=.5;return}let r=n.x+.5-e.pos.x,i=n.z+.5-e.pos.z,a=Math.hypot(r,i);if(a<.7){this.arrive(e);return}let o=Ff*t;e.targetYaw=Math.atan2(r,i),this.tryMoveWater(e,r/a*o,i/a*o)?(e.trapped=Math.max(0,e.trapped-t*.5),e.walkTime+=t*2):this.tryMoveWater(e,i/a*o,-(r/a)*o)||this.tryMoveWater(e,-(i/a)*o,r/a*o);let s=df(this.world,Math.floor(e.pos.x),Math.floor(e.pos.y+.01),Math.floor(e.pos.z));s!==null&&this.world.getBlock(Math.floor(e.pos.x),Math.floor(e.pos.y+.2),Math.floor(e.pos.z))!==W.WATER&&(e.pos.y=s,e.path=null,this.requestPath(e),e.state=`idle`,e.idleTimer=.1)}updateAirborne(e,t){let n=e.air;n.vy-=22*t;let r=e.pos.x+n.vx*t,i=e.pos.y+n.vy*t,a=e.pos.z+n.vz*t,o=this.world,s=(e,t,n)=>G[o.getBlock(Math.floor(e),Math.floor(t),Math.floor(n))].solid;if(s(r,e.pos.y+.9,e.pos.z)?n.vx*=-.3:e.pos.x=r,s(e.pos.x,e.pos.y+.9,a)?n.vz*=-.3:e.pos.z=a,n.vy<0&&(s(e.pos.x,i,e.pos.z)||i<1)){let t=df(o,Math.floor(e.pos.x),Math.floor(e.pos.y+.01),Math.floor(e.pos.z));e.pos.y=t===null?Math.ceil(i):t;let r=Math.min(1,-n.vy/25);e.hurt=.5,e.health=Math.max(1,e.health-Math.round(r*8)),e.stunned=1.5+r*3,e.air=null,e.airSpin=0,this.audio.step(`gravel`,e.pos,1.5);return}n.vy>0&&s(e.pos.x,i+1.8,e.pos.z)?n.vy=0:e.pos.y=i,e.airSpin=(e.airSpin||0)+n.spin*t,n.vx*=1-.4*t,n.vz*=1-.4*t,e.targetYaw+=n.spin*t}updateNPC(e,t,n,r,i,a){if(e.hurt>0&&(e.hurt-=t),e.talkCooldown>0&&(e.talkCooldown-=t),e.shoutCooldown>0&&(e.shoutCooldown-=t),e.air){this.updateAirborne(e,t);return}if(e.stunned>0){e.stunned-=t,e.state=`idle`,e.idleTimer=Math.max(e.idleTimer,.2);return}if(e.panic&&this.tickCount>e.panicUntil&&(e.panic=!1,e.trapped=0),e.swimming=this.world.getBlock(Math.floor(e.pos.x),Math.floor(e.pos.y+.2),Math.floor(e.pos.z))===W.WATER,e.swimming){let n=Math.floor(e.pos.y+.2);for(;this.world.getBlock(Math.floor(e.pos.x),n+1,Math.floor(e.pos.z))===W.WATER&&n<e.pos.y+6;)n++;let r=n+.9-1.3;if(e.pos.y+=(r-e.pos.y)*Math.min(1,t*4),this.alertInfo&&this.alertInfo.flowFn){let n=this.alertInfo.flowFn(e.pos.x,e.pos.z);n&&this.tryMoveWater(e,n[0]*t,n[1]*t)}e.trapped+=t,e.trapped>3&&e.shoutCooldown<=0&&this.shout(e,`trapped`,.6)}else e.trapped=Math.max(0,e.trapped-t);if(a<2304&&(this.tickCount+e.id)%2==0){let t=Math.floor(e.pos.x),n=Math.floor(e.pos.z),r=Math.floor(e.pos.y+.01),i=G[this.world.getBlock(t,r-1,n)],a=G[this.world.getBlock(t,r,n)];if(!i.solid&&!a.solid&&this.world.isLoaded(t,n)){let i=null;for(let e=r-1;e>=r-12&&e>0;e--){let r=df(this.world,t,e,n);if(r!==null){i=r;break}}i!==null&&(e.pos.y=Math.max(i,e.pos.y-.6),e.state===`walk`&&(e.path=null,e.state=`idle`,e.idleTimer=.5,e.target&&this.requestPath(e)))}else if(a.solid&&a.shape===U.CUBE){let i=df(this.world,t,r+1,n);i!==null&&(e.pos.y=i)}}if(a<9&&e.state!==`walk`?e.lookAt={x:i.pos.x,y:i.pos.y+1.6,z:i.pos.z}:e.state===`walk`?e.lookAt=null:e.rng.chance(.01)&&(e.lookAt=e.rng.chance(.5)?null:{x:e.pos.x+e.rng.range(-5,5),y:e.pos.y+1.4,z:e.pos.z+e.rng.range(-5,5)}),e.state===`idle`){if(e.idleTimer-=t,e.idleTimer<=0&&!e.waitingPath){let t=e.panic&&this.evacuationTarget(e)||this.chooseTarget(e,n,r);if(e.panic&&this.shout(e,this.alertInfo?this.alertInfo.kind:`generic`,.25),!t){e.idleTimer=3;return}let i=t.x+.5-e.pos.x,a=t.z+.5-e.pos.z;if(i*i+a*a<1.5){e.idleTimer=t.dwell,this.faceTarget(e,t),e.lastKind=t.kind,e.target=null;return}e.target=t,e.speed=e.panic?Pf:t.kind===`home`&&(n>=21||n<6)?Af:kf,this.requestPath(e),e.sitting=!1}return}if(e.swimming&&e.state===`walk`?e.speed=Ff:e.panic&&e.state===`walk`&&(e.speed=Pf),e.state===`walk`){if(e.swimming){this.swimToward(e,t);return}if(!e.path||e.pathIndex>=e.path.length){this.arrive(e);return}let n=e.path[e.pathIndex],r=df(this.world,n.x,n.y,n.z);if(r===null){e.path=null,e.state=`idle`,e.idleTimer=.3,this.requestPath(e);return}let i=n.x+.5,o=n.z+.5,s=i-e.pos.x,c=o-e.pos.z,l=Math.sqrt(s*s+c*c),u=e.speed*t;if(l<=u+.02)e.pos.x=i,e.pos.z=o,e.pos.y=r,e.pathIndex++,e.pathIndex>=e.path.length&&this.arrive(e);else{e.pos.x+=s/l*u,e.pos.z+=c/l*u;let n=l<.5?r:Math.max(e.pos.y,Math.min(r,e.pos.y+1));Math.abs(r-e.pos.y)>.01&&(e.pos.y+=(n-e.pos.y)*Math.min(1,t*12)),e.targetYaw=Math.atan2(s,c)}e.walkTime+=t*e.speed,e.stepDist+=u,e.stepDist>.9&&(e.stepDist=0,a<196&&this.audio.step(G[this.world.getBlock(Math.floor(e.pos.x),Math.floor(e.pos.y-.3),Math.floor(e.pos.z))].sound,e.pos,.5))}}faceTarget(e,t){if(t){if(t.face)e.targetYaw=Math.atan2(t.face.x-e.pos.x,t.face.z-e.pos.z);else if(t.kind===`work`&&t.building){let n=t.building,r=e.role===`pianist`&&n.piano?n.piano:n.door;r&&(e.targetYaw=Math.atan2(r.x+.5-e.pos.x,r.z+.5-e.pos.z))}}}arrive(e){let t=e.target;e.state=`idle`,e.path=null,e.idleTimer=t?t.dwell:e.rng.range(3,8),this.faceTarget(e,t),e.sitting=G[this.world.getBlock(Math.floor(e.pos.x),Math.floor(e.pos.y-.01),Math.floor(e.pos.z))].shape===U.SLAB&&t&&(t.kind===`street`||t.kind===`church`||t.kind===`station`||t.kind===`saloon`),e.sitting&&(e.targetYaw=Math.round(e.yaw/(Math.PI/2))*(Math.PI/2)),e.lastKind=t?t.kind:null,e.target=null}render(e,t,n){let r=n.position;for(let n of this.list){let i=n.root,a=n.prevPos.x+(n.pos.x-n.prevPos.x)*e,o=n.prevPos.y+(n.pos.y-n.prevPos.y)*e,s=n.prevPos.z+(n.pos.z-n.prevPos.z)*e,c=a-r.x,l=s-r.z,u=c*c+l*l;if(u>12100){i.visible=!1;continue}i.visible=!0,n.lastCamDist=Math.sqrt(u),sf(n,t),i.position.set(a,o-(n.sitting?.42:0),s);let d=n.targetYaw-n.yaw;for(;d>Math.PI;)d-=Math.PI*2;for(;d<-Math.PI;)d+=Math.PI*2;if(n.yaw+=d*Math.min(1,t*10),i.rotation.y=n.yaw,n.air?(i.rotation.x=(n.airSpin||0)*.7,i.rotation.z=(n.airSpin||0)*.4):n.stunned>0?(i.rotation.x+=(-1.4-i.rotation.x)*Math.min(1,t*6),i.rotation.z*=.9,i.position.y+=.15):(i.rotation.x*=.85,i.rotation.z*=.85),u>2500){n.tag.visible=!1;continue}let f=n.model;if(n.air){let e=performance.now()*.01;f.rightArm.rotation.x=-2.6+Math.sin(e)*.5,f.leftArm.rotation.x=-2.6+Math.cos(e)*.5,f.rightLeg.rotation.x=Math.sin(e*1.3)*.8,f.leftLeg.rotation.x=-Math.sin(e*1.3)*.8}else if(n.swimming){let e=performance.now()*.006;f.rightArm.rotation.x=-2.8+Math.sin(e)*.4,f.leftArm.rotation.x=-2.8+Math.cos(e*1.1)*.4,f.rightArm.rotation.z=.3,f.leftArm.rotation.z=-.3,f.rightLeg.rotation.x=Math.sin(e*2)*.5,f.leftLeg.rotation.x=-Math.sin(e*2)*.5}else if(n.state===`walk`){let e=Math.sin(n.walkTime*3.6)*.75;f.rightLeg.rotation.x=e,f.leftLeg.rotation.x=-e,n.panic?(f.rightArm.rotation.x=-2.2+e*.5,f.leftArm.rotation.x=-2.2-e*.5,f.rightArm.rotation.z=.35,f.leftArm.rotation.z=-.35):(f.rightArm.rotation.x=-e*.9,f.leftArm.rotation.x=e*.9,f.rightArm.rotation.z=.05,f.leftArm.rotation.z=-.05)}else if(n.sitting)f.rightLeg.rotation.x=f.leftLeg.rotation.x=-Math.PI/2,f.rightArm.rotation.x=f.leftArm.rotation.x=-.4;else{let e=Math.sin(performance.now()*.0015+n.id)*.04;f.rightLeg.rotation.x*=.8,f.leftLeg.rotation.x*=.8,f.rightArm.rotation.x*=.8,f.leftArm.rotation.x*=.8,f.rightArm.rotation.z=.05+e,f.leftArm.rotation.z=-.05-e,n.role===`pianist`&&n.lastKind===`work`&&(f.rightArm.rotation.x=-1.3+Math.sin(performance.now()*.02)*.15,f.leftArm.rotation.x=-1.3+Math.cos(performance.now()*.017)*.15),n.role===`blacksmith`&&n.lastKind===`work`&&(f.rightArm.rotation.x=-1-Math.abs(Math.sin(performance.now()*.004))*1.4)}let p=0,m=0;if(n.lookAt){let e=n.lookAt.x-a,t=n.lookAt.z-s,r=Math.atan2(e,t)-n.yaw;for(;r>Math.PI;)r-=Math.PI*2;for(;r<-Math.PI;)r+=Math.PI*2;p=Math.max(-1.1,Math.min(1.1,r));let i=Math.sqrt(e*e+t*t);m=-Math.atan2(n.lookAt.y-(o+1.62),i)}if(n.headYaw+=(p-n.headYaw)*Math.min(1,t*8),n.headPitch+=(m-n.headPitch)*Math.min(1,t*8),f.head.rotation.y=n.headYaw,f.head.rotation.x=n.headPitch,++n.lightTimer>=6){n.lightTimer=0;let e=this.world.sampleLight(n.pos.x,n.pos.y+1,n.pos.z);f.material.uniforms.uLight.value.set(e[0],e[1]);for(let t of f.head.children)t.material&&t.material.uniforms&&t.material.uniforms.uLight.value.set(e[0],e[1])}f.material.uniforms.uHurt.value=+(n.hurt>0),n.tag.visible=u<64||n===this.targeted,n.tag.visible&&(n.tag.position.y=n.sitting?2.67:2.25)}}raycast(e,t,n){let r=null;for(let i of this.list){let a=i.box,o=zf(e,t,a);o!==null&&o<n&&(!r||o<r.dist)&&(r={npc:i,dist:o})}return this.targeted=r?r.npc:null,r}collectBoxes(e,t,n){for(let r of this.list)Math.abs(r.pos.x-t)<3&&Math.abs(r.pos.z-n)<3&&e.push(r.box)}onWorldChanged(e,t,n){for(let r of this.list)if(r.path)for(let i=r.pathIndex;i<r.path.length;i++){let a=r.path[i];if(Math.abs(a.x-e)<=1&&Math.abs(a.z-n)<=1&&Math.abs(a.y-t)<=2){r.path=null,r.state=`idle`,r.idleTimer=.2,r.target&&this.requestPath(r);break}}}talk(e,t){if(e.talkCooldown>0)return;e.talkCooldown=2;let n=[`sheriff`,`deputy`,`bartender`,`shopkeeper`,`doctor`,`banker`,`preacher`,`blacksmith`,`rancher`,`farmer`,`stablehand`,`railworker`,`townswoman`,`traveler`,`pianist`].includes(e.role)?e.role:e.role===`cowboy`?`traveler`:`generic`,r=e.rng.chance(.7)?e.say(n):e.say(`generic`);t.hud.addMessage(`<${e.name}> ${r}`),this.audio.npcGrunt(e.pos,e.female?1.5:.9+e.rng.next()*.3),e.lookAt={x:t.player.pos.x,y:t.player.pos.y+1.6,z:t.player.pos.z},e.targetYaw=Math.atan2(t.player.pos.x-e.pos.x,t.player.pos.z-e.pos.z),e.state===`idle`&&(e.idleTimer=Math.max(e.idleTimer,3))}poke(e,t){e.hurt=.4,e.talkCooldown<=0&&(t.hud.addMessage(`<${e.name}> ${e.say(`poke`)}`),e.talkCooldown=1.5,this.audio.npcGrunt(e.pos,1.2));let n=e.pos.x-t.player.pos.x,r=e.pos.z-t.player.pos.z,i=Math.hypot(n,r)||1;this.tryMove(e,n/i*.4,r/i*.4),e.targetYaw=Math.atan2(-n,-r),e.state===`idle`&&(e.idleTimer=Math.min(e.idleTimer,1.5))}};function zf(e,t,n){let r=-1/0,i=1/0,a=[[e.x,t.x,n.x0,n.x1],[e.y,t.y,n.y0,n.y1],[e.z,t.z,n.z0,n.z1]];for(let[e,t,n,o]of a){if(Math.abs(t)<1e-9){if(e<n||e>o)return null;continue}let a=(n-e)/t,s=(o-e)/t;if(a>s){let e=a;a=s,s=e}if(r=Math.max(r,a),i=Math.min(i,s),r>i)return null}return i<0?null:Math.max(r,0)}var Bf=(e,t,n,r)=>G[e.getBlock(Math.floor(t),Math.floor(n),Math.floor(r))].solid,Vf=64,Hf=32,Uf=32,Wf=0;function Gf(e,t){let n=parseInt(e.slice(1,3),16),r=parseInt(e.slice(3,5),16),i=parseInt(e.slice(5,7),16),a=e=>Math.max(0,Math.min(255,Math.round(e*t)));return`rgb(${a(n)},${a(r)},${a(i)})`}function Kf(e,t,n,r=Uf,i=Wf){return{top:[r+n,i,e,n],bottom:[r+n+e,i,e,n],right:[r,i+n,n,t],front:[r+n,i+n,e,t],left:[r+n+e,i+n,n,t],back:[r+2*n+e,i+n,e,t]}}var qf={horse:Kf(6,5,9),cow:Kf(8,8,6),pig:Kf(8,8,8),chicken:Kf(4,6,3)};function Jf(e,t,n,r,i){let a=qf[n];if(!a)return;[`top`,`bottom`,`right`,`front`,`left`,`back`].forEach((n,r)=>{let i=a[n];e.drawImage(t,r*3%8,r*5%8,i[2],i[3],i[0],i[1],i[2],i[3])});let o=(t,n,r,i,a=1,o=1)=>{e.fillStyle=i,e.fillRect(t[0]+n,t[1]+r,a,o)};switch(n){case`horse`:{let e=`#14100c`,t=`#8a7a70`,n=Gf(r,.5),i=Gf(r,.6);o(a.left,4,1,e,3,2),o(a.left,4,1,t),o(a.left,4,0,n,3,1),o(a.right,2,1,e,3,2),o(a.right,4,1,t),o(a.right,2,0,n,3,1),o(a.front,1,3,i),o(a.front,4,3,i);break}case`cow`:{let e=`#1a1410`,t=`#e8e8e8`;o(a.front,0,2,e,2,2),o(a.front,1,2,t),o(a.front,6,2,e,2,2),o(a.front,6,2,t),o(a.left,0,2,e,1,2),o(a.right,5,2,e,1,2);break}case`pig`:{let e=`#1c1418`,t=`#e6d6d6`;o(a.front,1,1,e,2,2),o(a.front,2,1,t),o(a.front,5,1,e,2,2),o(a.front,5,1,t);break}case`chicken`:{let e=`#14100c`;o(a.left,1,1,e),o(a.right,1,1,e);break}}}function Yf(e,t,n,r,i,a,o=0){let s=document.createElement(`canvas`);s.width=Vf,s.height=Hf;let c=s.getContext(`2d`);c.imageSmoothingEnabled=!1;let l=(e,t,n)=>{c.fillStyle=n,c.fillRect(e,t,16,16);for(let n=0;n<70;n++)c.fillStyle=`rgba(0,0,0,${.06+a.next()*.08})`,c.fillRect(e+a.int(0,15),t+a.int(0,15),1,1);for(let n=0;n<30;n++)c.fillStyle=`rgba(255,255,255,${.05+a.next()*.08})`,c.fillRect(e+a.int(0,15),t+a.int(0,15),1,1)};l(0,0,t),l(16,0,n),l(0,16,r),l(16,16,i),Jf(c,s,e,t,n);for(let e=0;e<o;e++){c.fillStyle=i;let e=a.int(0,12),t=a.int(0,12);c.fillRect(e,t,a.int(2,5),a.int(2,4))}return s}var Xf=(e,t)=>{let n=[e,t,16,16];return{top:n,bottom:n,right:n,front:n,left:n,back:n}},Zf=Xf(0,0),Qf=Xf(16,0),$f=Xf(0,16),ep=Xf(16,16),tp=[[`#5a3a22`,`#2b1a0e`],[`#8a5a32`,`#3a2414`],[`#1e1a18`,`#0a0a0a`],[`#d8d0c4`,`#7a7068`],[`#6b6b6b`,`#2e2e2e`],[`#a0703c`,`#5a3a1a`],[`#3a2a1e`,`#1a120a`]];function np(){return[{name:`body`,w:10,h:10,d:22,x:0,y:21,z:0,uv:Zf},{name:`neck`,w:4,h:13,d:7,x:0,y:26,z:8,rot:[-.55,0,0],pivot:[0,5,0],uv:Zf},{name:`head`,w:6,h:5,d:9,x:0,y:35,z:14,uv:qf.horse},{name:`mane`,w:2,h:11,d:5,x:0,y:30,z:6,rot:[-.5,0,0],uv:Qf},{name:`tail`,w:3,h:14,d:3,x:0,y:22,z:-12,rot:[.35,0,0],pivot:[0,-6,0],uv:Qf},{name:`legFL`,w:4,h:16,d:4,x:3,y:16,z:8,pivot:[0,-8,0],uv:Zf},{name:`legFR`,w:4,h:16,d:4,x:-3,y:16,z:8,pivot:[0,-8,0],uv:Zf},{name:`legBL`,w:4,h:16,d:4,x:3,y:16,z:-8,pivot:[0,-8,0],uv:Zf},{name:`legBR`,w:4,h:16,d:4,x:-3,y:16,z:-8,pivot:[0,-8,0],uv:Zf},{name:`saddle`,w:8,h:2,d:8,x:0,y:27,z:-1,uv:$f}]}function rp(){return[{name:`body`,w:12,h:10,d:18,x:0,y:17,z:0,uv:Zf},{name:`head`,w:8,h:8,d:6,x:0,y:20,z:11,uv:qf.cow},{name:`snout`,w:6,h:3,d:1,x:0,y:18,z:14.5,uv:ep},{name:`hornL`,w:1,h:3,d:1,x:4,y:25,z:10,uv:ep},{name:`hornR`,w:1,h:3,d:1,x:-4,y:25,z:10,uv:ep},{name:`udder`,w:4,h:2,d:6,x:0,y:11,z:-3,uv:$f},{name:`legFL`,w:4,h:12,d:4,x:4,y:12,z:6,pivot:[0,-6,0],uv:Qf},{name:`legFR`,w:4,h:12,d:4,x:-4,y:12,z:6,pivot:[0,-6,0],uv:Qf},{name:`legBL`,w:4,h:12,d:4,x:4,y:12,z:-6,pivot:[0,-6,0],uv:Qf},{name:`legBR`,w:4,h:12,d:4,x:-4,y:12,z:-6,pivot:[0,-6,0],uv:Qf}]}function ip(){return[{name:`body`,w:10,h:8,d:16,x:0,y:10,z:0,uv:Zf},{name:`head`,w:8,h:8,d:8,x:0,y:10,z:10,uv:qf.pig},{name:`snout`,w:4,h:3,d:1,x:0,y:9,z:14.5,uv:$f},{name:`legFL`,w:4,h:6,d:4,x:3,y:6,z:5,pivot:[0,-3,0],uv:Zf},{name:`legFR`,w:4,h:6,d:4,x:-3,y:6,z:5,pivot:[0,-3,0],uv:Zf},{name:`legBL`,w:4,h:6,d:4,x:3,y:6,z:-5,pivot:[0,-3,0],uv:Zf},{name:`legBR`,w:4,h:6,d:4,x:-3,y:6,z:-5,pivot:[0,-3,0],uv:Zf}]}function ap(){return[{name:`body`,w:6,h:6,d:8,x:0,y:8,z:0,uv:Zf},{name:`head`,w:4,h:6,d:3,x:0,y:13,z:3,pivot:[0,-2,0],uv:qf.chicken},{name:`beak`,w:4,h:2,d:2,x:0,y:14,z:5.5,uv:ep},{name:`wattle`,w:2,h:2,d:2,x:0,y:12,z:5.5,uv:$f},{name:`wingL`,w:1,h:4,d:6,x:3.5,y:9,z:0,uv:Qf},{name:`wingR`,w:1,h:4,d:6,x:-3.5,y:9,z:0,uv:Qf},{name:`legL`,w:1,h:5,d:3,x:1.5,y:2.5,z:0,uv:ep},{name:`legR`,w:1,h:5,d:3,x:-1.5,y:2.5,z:0,uv:ep}]}var op={horse:{parts:np,scale:.72,speed:1.6,height:1.6,width:.7,sound:`horseNeigh`,soundGap:[40,110]},cow:{parts:rp,scale:1,speed:.9,height:1.4,width:.9,sound:`cowMoo`,soundGap:[30,90]},pig:{parts:ip,scale:1,speed:1,height:.9,width:.8,sound:`pigOink`,soundGap:[20,60]},chicken:{parts:ap,scale:.8,speed:1.1,height:.7,width:.4,sound:`chickenCluck`,soundGap:[8,30]}},sp=class{constructor(e,t,n,r){this.world=t,this.audio=r,this.list=[],this.group=new wn,e.add(this.group),this.rng=new Dl(777);for(let e of n.animalSpawns)this.spawn(e)}spawn(e){let t=op[e.type],n=new Dl(this.rng.int(1,1e9)),r;if(e.type===`horse`){let[e,t]=n.pick(tp);r=Yf(`horse`,e,t,`#5a3a22`,`#f0f0f0`,n,n.chance(.3)?3:0)}else r=e.type===`cow`?Yf(`cow`,n.chance(.7)?`#4a3626`:`#8a5a32`,`#2b1a0e`,`#e8b0a0`,`#e8e0d0`,n,5):e.type===`pig`?Yf(`pig`,`#f0a0a0`,`#d08080`,`#e07070`,`#f0b0b0`,n,0):Yf(`chicken`,`#f0f0f0`,`#e0e0e0`,`#d02020`,`#e0a020`,n,0);let i=$d(t.parts(),r);i.root.scale.setScalar(t.scale),this.world.gen;let a={type:e.type,spec:t,model:i,root:i.root,rng:n,pos:new I(e.x,0,e.z),prevPos:new I,yaw:e.yaw??n.range(0,Math.PI*2),targetYaw:0,tie:!!e.tie,pen:e.pen||null,state:`idle`,timer:n.range(2,10),target:null,walkTime:0,grazeT:0,graze:!1,soundTimer:n.range(t.soundGap[0],t.soundGap[1]),lightTimer:0,name:e.type===`horse`?`Horse`:e.type===`cow`?`Cow`:e.type===`pig`?`Pig`:`Chicken`,panic:!1,panicUntil:0,air:null,stunned:0,swimming:!1,airSpin:0};a.targetYaw=a.yaw,this.list.push(a),this.group.add(a.root),this.placeOnGround(a,!0),a.prevPos.copy(a.pos)}placeOnGround(e,t=!1){let n=this.world;for(let t=70;t>=40;t--){let r=df(n,Math.floor(e.pos.x),t,Math.floor(e.pos.z));if(r!==null)return e.pos.y=r,!0}return t&&(e.pos.y=58),!1}alert(e){this.alertInfo=e;let t=(e.radius||80)**2;for(let n of this.list){let r=n.pos.x-e.x,i=n.pos.z-e.z;r*r+i*i>t||(n.panic=!0,n.panicUntil=performance.now()+12e4,n.tie=n.tie&&e.kind!==`tornado`,n.timer=n.rng.range(0,.5),n.soundTimer>4&&(n.soundTimer=n.rng.range(.5,4)))}}clearAlert(){this.alertInfo=null;for(let e of this.list)e.panic=!1,e.air=null,e.stunned=0}applyImpulse(e,t,n,r){e.air||(e.air={vx:0,vy:0,vz:0,spin:e.rng.range(-5,5)}),e.air.vx+=t,e.air.vy+=n,e.air.vz+=r;let i=Math.hypot(e.air.vx,e.air.vy,e.air.vz);if(i>26){let t=26/i;e.air.vx*=t,e.air.vy*=t,e.air.vz*=t}e.state=`idle`,e.tie=!1}eachNear(e,t,n,r){let i=n*n;for(let n of this.list){let a=n.pos.x-e,o=n.pos.z-t;a*a+o*o<=i&&r(n,Math.sqrt(a*a+o*o))}}updateAirborne(e,t){let n=e.air;n.vy-=22*t;let r=this.world,i=(e,t,n)=>Bf(r,e,t,n),a=e.pos.x+n.vx*t,o=e.pos.y+n.vy*t,s=e.pos.z+n.vz*t;if(i(a,e.pos.y+.5,e.pos.z)?n.vx*=-.3:e.pos.x=a,i(e.pos.x,e.pos.y+.5,s)?n.vz*=-.3:e.pos.z=s,n.vy<0&&(i(e.pos.x,o,e.pos.z)||o<1)){let t=df(r,Math.floor(e.pos.x),Math.floor(e.pos.y+.01),Math.floor(e.pos.z));e.pos.y=t===null?Math.ceil(o):t,e.air=null,e.airSpin=0,e.stunned=2+e.rng.range(0,2),e.spec.sound&&this.audio[e.spec.sound](e.pos);return}e.pos.y=o,e.airSpin=(e.airSpin||0)+n.spin*t,n.vx*=1-.4*t,n.vz*=1-.4*t}tick(e,t){let n=e.pos;for(let e of this.list){e.prevPos.copy(e.pos);let t=e.pos.x-n.x,r=e.pos.z-n.z,i=t*t+r*r;if(i>8100&&!e.air)continue;let a=.05;if(e.air){this.updateAirborne(e,a);continue}if(e.stunned>0){e.stunned-=a;continue}if(e.panic&&performance.now()>e.panicUntil&&(e.panic=!1),e.swimming=this.world.getBlock(Math.floor(e.pos.x),Math.floor(e.pos.y+.2),Math.floor(e.pos.z))===W.WATER,e.swimming){let t=Math.floor(e.pos.y+.2);for(;this.world.getBlock(Math.floor(e.pos.x),t+1,Math.floor(e.pos.z))===W.WATER&&t<e.pos.y+6;)t++;if(e.pos.y+=(t+.9-e.spec.height*.55-e.pos.y)*.2,this.alertInfo&&this.alertInfo.flowFn){let t=this.alertInfo.flowFn(e.pos.x,e.pos.z);t&&!Bf(this.world,e.pos.x+t[0]*a,e.pos.y+.5,e.pos.z+t[1]*a)&&(e.pos.x+=t[0]*a,e.pos.z+=t[1]*a)}}if(e.soundTimer-=a*(e.panic?3:1),e.soundTimer<=0&&(e.soundTimer=e.rng.range(e.spec.soundGap[0],e.spec.soundGap[1]),i<1600&&this.audio[e.spec.sound](e.pos)),i<2304&&this.world.isLoaded(Math.floor(e.pos.x),Math.floor(e.pos.z))){let t=Math.floor(e.pos.x),n=Math.floor(e.pos.z),r=Math.floor(e.pos.y+.01),i=this.world.getBlockDef(t,r-1,n),a=this.world.getBlockDef(t,r,n);if(!i.solid&&!a.solid)for(let i=r-1;i>=r-12&&i>0;i--){let r=df(this.world,t,i,n);if(r!==null){e.pos.y=Math.max(r,e.pos.y-.6);break}}}if(e.tie){e.timer-=a,e.timer<=0&&(e.timer=e.rng.range(4,12),e.graze=!e.graze,e.rng.chance(.3)&&(e.targetYaw=e.yaw+e.rng.range(-.4,.4)));continue}if(e.state===`idle`){if(e.timer-=a,e.timer<=0){if(e.panic){let t=this.alertInfo,n=e.rng.range(0,Math.PI*2);if(t){let r=e.pos.x-t.x,i=e.pos.z-t.z;n=Math.atan2(r,i)+e.rng.range(-.9,.9)}let r=e.rng.range(4,10),i=e.pos.x+Math.sin(n)*r,a=e.pos.z+Math.cos(n)*r;e.pen&&(i=Math.min(e.pen.x1+.4,Math.max(e.pen.x0+.6,i)),a=Math.min(e.pen.z1+.4,Math.max(e.pen.z0+.6,a))),e.target={x:i,z:a},e.state=`walk`,e.graze=!1}else e.rng.chance(.35)&&e.pen?(e.target={x:e.rng.range(e.pen.x0+.6,e.pen.x1+.4),z:e.rng.range(e.pen.z0+.6,e.pen.z1+.4)},e.state=`walk`,e.graze=!1):(e.timer=e.rng.range(3,12),e.graze=e.rng.chance(.5))}}else if(e.state===`walk`){let t=e.target.x-e.pos.x,n=e.target.z-e.pos.z,r=Math.hypot(t,n),i=e.spec.speed*(e.panic?2.2:1)*a;if(r<.3){e.state=`idle`,e.timer=e.rng.range(3,12);continue}let o=e.pos.x+t/r*i,s=e.pos.z+n/r*i,c=df(this.world,Math.floor(o),Math.floor(e.pos.y+.01),Math.floor(s));if(c===null){let t=df(this.world,Math.floor(o),Math.floor(e.pos.y+.01)+1,Math.floor(s)),n=df(this.world,Math.floor(o),Math.floor(e.pos.y+.01)-1,Math.floor(s));c=t!==null&&t-e.pos.y<=1.05?t:n}if(c===null||Math.abs(c-e.pos.y)>1.05||e.pen&&(o<e.pen.x0+.5||o>e.pen.x1+.5||s<e.pen.z0+.5||s>e.pen.z1+.5)){e.state=`idle`,e.timer=e.panic?e.rng.range(.1,.6):e.rng.range(1,4);continue}e.pos.x=o,e.pos.z=s,e.pos.y+=(c-e.pos.y)*.5,e.targetYaw=Math.atan2(t,n),e.walkTime+=i}}}render(e,t,n){let r=n.position,i=performance.now()*.001;for(let n of this.list){let a=n.prevPos.x+(n.pos.x-n.prevPos.x)*e,o=n.prevPos.y+(n.pos.y-n.prevPos.y)*e,s=n.prevPos.z+(n.pos.z-n.prevPos.z)*e,c=a-r.x,l=s-r.z,u=c*c+l*l;if(u>1e4){n.root.visible=!1;continue}n.root.visible=!0,n.root.position.set(a,o,s);let d=n.targetYaw-n.yaw;for(;d>Math.PI;)d-=Math.PI*2;for(;d<-Math.PI;)d+=Math.PI*2;if(n.yaw+=d*Math.min(1,t*6),n.root.rotation.y=n.yaw,n.air?(n.root.rotation.x=(n.airSpin||0)*.8,n.root.rotation.z=(n.airSpin||0)*.5):n.stunned>0?(n.root.rotation.z+=(1.3-n.root.rotation.z)*Math.min(1,t*5),n.root.rotation.x*=.9):(n.root.rotation.x*=.85,n.root.rotation.z*=.85),u>3600)continue;let f=n.model.parts;if(n.state===`walk`||n.air){let e=Math.sin(n.walkTime*4+(n.air?performance.now()*.01:0))*(n.panic||n.air?.9:.6);f.legFL&&(f.legFL.rotation.x=e,f.legBR.rotation.x=e,f.legFR.rotation.x=-e,f.legBL.rotation.x=-e),f.legL&&(f.legL.rotation.x=e,f.legR.rotation.x=-e)}else for(let e of[`legFL`,`legFR`,`legBL`,`legBR`,`legL`,`legR`])f[e]&&(f[e].rotation.x*=.8);let p=+!!n.graze;if(n.grazeT+=(p-n.grazeT)*Math.min(1,t*2),n.type===`horse`?(f.neck.rotation.x=-.55+n.grazeT*.9+Math.sin(i*1.3+n.pos.x)*.03,f.head.position.y=(35-n.grazeT*14)*Q,f.head.position.z=(14+n.grazeT*2)*Q,f.tail.rotation.z=Math.sin(i*2.2+n.pos.z)*.25):n.type===`cow`?(f.head.rotation.x=n.grazeT*.8,f.head.position.y=(20-n.grazeT*6)*Q):n.type===`pig`?f.head.rotation.x=n.grazeT*.5:n.type===`chicken`&&(f.head.rotation.x=n.graze?Math.max(0,Math.sin(i*8+n.pos.x*3))*.9:0,f.wingL.rotation.z=f.wingR.rotation.z=0),++n.lightTimer>=8){n.lightTimer=0;let e=this.world.sampleLight(n.pos.x,n.pos.y+.8,n.pos.z);n.model.material.uniforms.uLight.value.set(e[0],e[1])}}}raycast(e,t,n){let r=null;for(let i of this.list){let a=i.spec.width/2,o=cp(e,t,new yf(i.pos.x-a,i.pos.y,i.pos.z-a,i.pos.x+a,i.pos.y+i.spec.height,i.pos.z+a));o!==null&&o<n&&(!r||o<r.dist)&&(r={animal:i,name:i.name,dist:o})}return r}collectBoxes(e,t,n){for(let r of this.list)if(Math.abs(r.pos.x-t)<3&&Math.abs(r.pos.z-n)<3){let t=r.spec.width/2;e.push(new yf(r.pos.x-t,r.pos.y,r.pos.z-t,r.pos.x+t,r.pos.y+r.spec.height,r.pos.z+t))}}};function cp(e,t,n){let r=-1/0,i=1/0,a=[[e.x,t.x,n.x0,n.x1],[e.y,t.y,n.y0,n.y1],[e.z,t.z,n.z0,n.z1]];for(let[e,t,n,o]of a){if(Math.abs(t)<1e-9){if(e<n||e>o)return null;continue}let a=(n-e)/t,s=(o-e)/t;if(a>s){let e=a;a=s,s=e}if(r=Math.max(r,a),i=Math.min(i,s),r>i)return null}return i<0?null:Math.max(r,0)}function lp(e,t=16,n=16){let r=document.createElement(`canvas`);return r.width=t,r.height=n,e(r.getContext(`2d`),t,n),Wd(r)}var up=class{constructor(e,t,n,r){this.world=t,this.audio=n,this.particles=r,this.group=new wn,e.add(this.group),this.y=57,this.z=-61.5,this.x=-420,this.dir=1,this.speed=0,this.maxSpeed=9,this.state=`approach`,this.timer=0,this.stopX=4,this.whistled=!1,this.chuffTimer=0,this.smokeTimer=0,this.prevX=this.x,this.build()}build(){let e=this.group,t=Ud(lp(e=>{e.fillStyle=`#2e2e34`,e.fillRect(0,0,16,16),e.fillStyle=`#3c3c44`;for(let t=0;t<30;t++)e.fillRect(Math.random()*16|0,Math.random()*16|0,1,1);e.fillStyle=`#4a4a52`,e.fillRect(0,0,16,1),e.fillRect(0,8,16,1)})),n=Ud(lp(e=>{e.fillStyle=`#7a1e1a`,e.fillRect(0,0,16,16),e.fillStyle=`#5a1410`,e.fillRect(0,12,16,1),e.fillRect(0,3,16,1)})),r=Ud(lp(e=>{e.fillStyle=`#b08a3a`,e.fillRect(0,0,16,16),e.fillStyle=`#d4aa50`,e.fillRect(2,2,12,2)})),i=Ud(lp(e=>{e.fillStyle=`#2f4a3a`,e.fillRect(0,0,16,16),e.fillStyle=`#c9a15a`,e.fillRect(0,2,16,1),e.fillRect(0,13,16,1)})),a=Ud(lp(e=>{e.fillStyle=`#2f4a3a`,e.fillRect(0,0,32,16);for(let t=0;t<4;t++)e.fillStyle=`#f5d98a`,e.fillRect(2+t*8,4,5,7),e.fillStyle=`#c9a15a`,e.fillRect(1+t*8,3,7,1),e.fillRect(1+t*8,11,7,1)},32,16));a.uniforms.uLight.value.set(1,1),this.windowMat=a,this.materials=[t,n,r,i,a];let o=(t,n,r,i,a,o,s)=>{let c=new mi(new oa(n,r,i),t);return c.position.set(a,o,s),e.add(c),c};o(t,7.5,2.4,2.4,3.5,2.2,0),o(t,1.2,1.2,2.6,7.4,1.6,0),o(r,.6,.6,2.8,7.4,2.2,0),o(t,.8,1.6,.8,6.2,4,0),o(t,1.2,.4,1.2,6.2,4.9,0),o(r,.9,.7,.9,3.2,3.6,0),o(n,3,3.2,2.8,-1.2,2.6,0),o(t,3.4,.3,3.2,-1.2,4.35,0),o(t,8.5,.5,3,2.2,.85,0),o(n,1.6,1,2.6,7.6,.9,0);for(let e of[.5,2.5,4.5])o(t,1.4,1.4,.3,e,.9,1.35),o(t,1.4,1.4,.3,e,.9,-1.35);o(r,.6,.6,.6,5.2,1.2,1.4),o(r,.6,.6,.6,5.2,1.2,-1.4),o(n,5,2.4,2.6,-6.5,1.9,0),o(t,4.4,.6,2,-6.5,3.3,0),o(t,5.2,.4,3,-6.5,.85,0);for(let e of[-5.2,-7.8])o(t,1.2,1.2,.3,e,.8,1.35),o(t,1.2,1.2,.3,e,.8,-1.35);for(let n=0;n<2;n++){let r=-15.5-n*10.5;o(i,9.5,2.9,2.7,r,2.15,0);let s=new mi(new oa(9.2,1.4,2.8),a);s.position.set(r,2.4,0),e.add(s),o(t,9.9,.3,3,r,3.75,0),o(t,9.8,.4,3,r,.85,0);for(let e of[r-3.5,r+3.5])o(t,1.2,1.2,.3,e,.8,1.35),o(t,1.2,1.2,.3,e,.8,-1.35);o(t,.8,1.4,2.6,r+5.1,2,0)}e.position.set(this.x,this.y,this.z)}tick(e){let t=.05;switch(this.prevX=this.x,this.timer+=t,this.state){case`approach`:{let e=this.stopX,n=(e-this.x)*this.dir;this.speed=n>this.speed*this.speed/4.4+.5?Math.min(this.maxSpeed,this.speed+2.5*t):Math.max(0,this.speed-2.2*t),Math.abs(this.x-e)>200&&(this.whistled=!1),!this.whistled&&Math.abs(this.x-e)<150&&(this.whistled=!0,this.audio.trainWhistle(this.pos())),(n<=.3||this.speed<=.02&&n<3)&&(this.speed=0,this.state=`stopped`,this.timer=0,this.audio.trainChuff(this.pos(),0));break}case`stopped`:this.timer>28&&(this.state=`depart`,this.timer=0,this.audio.trainWhistle(this.pos()));break;case`depart`:this.speed=Math.min(this.maxSpeed,this.speed+1.4*t),Math.abs(this.x)>460&&(this.state=`away`,this.timer=0,this.speed=0);break;case`away`:this.timer>45&&(this.dir=-this.dir,this.x=-this.dir*430,this.state=`approach`,this.timer=0,this.whistled=!1,this.prevX=this.x)}this.x+=this.speed*this.dir*t,this.speed>.1&&(this.chuffTimer-=t*(.6+this.speed/4),this.chuffTimer<=0&&(this.chuffTimer=.5,this.audio.trainChuff(this.pos(),this.speed)));let n=e.pos;if(Math.abs(n.z-this.z)<2.2&&Math.abs(n.x-this.x+2*this.dir)<26&&n.y<this.y+4&&n.y>this.y-1){let t=n.z<this.z?-1:1;e.vel.z+=t*.6,e.vel.x+=this.dir*this.speed*.02,e.vel.y=Math.max(e.vel.y,.3),this.speed>3&&!e.dead&&e.damage(2)}}pos(){return new I(this.x,this.y+2,this.z)}render(e,t){let n=this.prevX+(this.x-this.prevX)*e;this.group.position.set(n,this.y,this.z),this.group.rotation.y=this.dir>0?0:Math.PI,this.group.visible=Math.abs(n)<520;let r=this.world.sampleLight(n,this.y+2,this.z);for(let e of this.materials)e!==this.windowMat&&e.uniforms.uLight.value.set(r[0],r[1]);this.smokeTimer+=t;let i=this.speed>.5?.09:.4;if(this.smokeTimer>i&&this.group.visible){this.smokeTimer=0;let e=n+6.2*this.dir;this.particles.smoke(e,this.y+5.2,this.z,!0)}}},dp=18,fp=130,pp=(e,t,n)=>(e*dp+n)*fp+t,mp=[{n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],shade:.6},{n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],shade:.6},{n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1},{n:[0,-1,0],v:[[1,0,1],[0,0,1],[0,0,0],[1,0,0]],shade:.5},{n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],shade:.8},{n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],shade:.8}];function hp(e,t,n,r){switch(e){case 0:return[1-r,1-n];case 1:return[r,1-n];case 2:return[t,r];case 3:return[1-t,r];case 4:return[t,1-n];default:return[1-t,1-n]}}var gp=[.5,.68,.84,1],_p=6e-4,vp=class{constructor(e=65536){this.pos=new Float32Array(e*3),this.uv=new Float32Array(e*2),this.light=new Float32Array(e*2),this.shade=new Float32Array(e),this.idx=new Uint32Array(e*1.5),this.vcount=0,this.icount=0}ensure(e){if(this.vcount+e<=this.shade.length)return;let t=Math.max(this.shade.length*2,this.vcount+e),n=(e,t,n)=>{let r=new n(t);return r.set(e),r};this.pos=n(this.pos,t*3,Float32Array),this.uv=n(this.uv,t*2,Float32Array),this.light=n(this.light,t*2,Float32Array),this.shade=n(this.shade,t,Float32Array),this.idx=n(this.idx,Math.ceil(t*1.5),Uint32Array)}reset(){this.vcount=0,this.icount=0}quad(e,t=!1){this.ensure(4);let n=this.vcount;for(let t=0;t<4;t++){let r=e[t],i=n+t;this.pos[i*3]=r[0],this.pos[i*3+1]=r[1],this.pos[i*3+2]=r[2],this.uv[i*2]=r[3],this.uv[i*2+1]=r[4],this.light[i*2]=r[5],this.light[i*2+1]=r[6],this.shade[i]=r[7]}let r=this.icount;t?(this.idx[r]=n+1,this.idx[r+1]=n+2,this.idx[r+2]=n+3,this.idx[r+3]=n+1,this.idx[r+4]=n+3,this.idx[r+5]=n):(this.idx[r]=n,this.idx[r+1]=n+1,this.idx[r+2]=n+2,this.idx[r+3]=n,this.idx[r+4]=n+2,this.idx[r+5]=n+3),this.vcount+=4,this.icount+=6}toGeometry(){if(this.vcount===0)return null;let e=new Er;return e.setAttribute(`position`,new dr(this.pos.slice(0,this.vcount*3),3)),e.setAttribute(`uv`,new dr(this.uv.slice(0,this.vcount*2),2)),e.setAttribute(`aLight`,new dr(this.light.slice(0,this.vcount*2),2)),e.setAttribute(`aShade`,new dr(this.shade.slice(0,this.vcount),1)),e.setIndex(new dr(this.idx.slice(0,this.icount),1)),e.computeBoundingSphere(),e}},yp=class{constructor(){this.pb=new Uint8Array(dp*dp*fp),this.ps=new Uint8Array(dp*dp*fp),this.pl=new Uint8Array(dp*dp*fp),this.solid=new vp,this.water=new vp,this.world=null,this.chunk=null,this.tmpVerts=[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]]}fillPadded(e,t){let n=this.pb,r=this.ps,i=this.pl;for(let a=0;a<dp;a++)for(let o=0;o<dp;o++){let s=t.cx*16+a-1,c=t.cz*16+o-1,l=a>=1&&a<=16&&o>=1&&o<=16?t:e.chunkAt(s,c),u=pp(a,1,o);if(l&&l.generated){let e=((s&15)*16+(c&15))*128;n.set(l.blocks.subarray(e,e+128),u),l.lit?(r.set(l.sky.subarray(e,e+128),u),i.set(l.light.subarray(e,e+128),u)):(r.fill(15,u,u+128),i.fill(0,u,u+128))}else n.fill(0,u,u+128),r.fill(15,u,u+128),i.fill(0,u,u+128);n[u-1]=W.BEDROCK,r[u-1]=0,i[u-1]=0,n[u+128]=W.AIR,r[u+128]=15,i[u+128]=0}}build(e,t){this.world=e,this.chunk=t,this.fillPadded(e,t),this.solid.reset(),this.water.reset();let n=this.pb;for(let e=0;e<16;e++)for(let t=0;t<16;t++){let r=pp(e+1,1,t+1);for(let i=0;i<128;i++){let a=n[r+i];if(a===0)continue;let o=G[a];switch(o.shape){case U.CUBE:this.cube(e,i,t,o);break;case U.LIQUID:this.liquid(e,i,t,o);break;case U.CROSS:this.cross(e,i,t,o);break;default:this.special(e,i,t,o)}}}return{solid:this.solid.toGeometry(),water:this.water.toGeometry()}}blk(e,t,n){return this.pb[pp(e+1,t+1,n+1)]}opaqueAt(e,t,n){return G[this.pb[pp(e+1,t+1,n+1)]].opaque}skyAt(e,t,n){return this.ps[pp(e+1,t+1,n+1)]}lightAt(e,t,n){return this.pl[pp(e+1,t+1,n+1)]}vertexLight(e,t,n,r,i,a,o,s){let c=mp[r].n,l=e+c[0],u=t+c[1],d=n+c[2],f=0,p=0,m=0,h=0;c[0]===0?c[1]===0?(f=i?1:-1,m=a?1:-1):(f=i?1:-1,h=o?1:-1):(p=a?1:-1,h=o?1:-1);let g=this.opaqueAt(l+f,u+p,d+0),_=this.opaqueAt(l+0,u+m,d+h),v=this.opaqueAt(l+f+0,u+p+m,d+0+h),y;y=g&&_?0:3-(+!!g+ +!!_+ +!!v);let b=this.skyAt(l,u,d),x=this.lightAt(l,u,d),S=b,C=x;S+=g?b:this.skyAt(l+f,u+p,d+0),C+=g?x:this.lightAt(l+f,u+p,d+0),S+=_?b:this.skyAt(l+0,u+m,d+h),C+=_?x:this.lightAt(l+0,u+m,d+h),S+=v||g&&_?b:this.skyAt(l+f+0,u+p+m,d+0+h),C+=v||g&&_?x:this.lightAt(l+f+0,u+p+m,d+0+h),s[0]=S/60,s[1]=C/60,s[2]=gp[y]}cullFace(e,t){return!!(G[t].opaque||e.cutout&&t===e.id)}cube(e,t,n,r){let i=[0,0,0];for(let a=0;a<6;a++){let o=mp[a],s=this.blk(e+o.n[0],t+o.n[1],n+o.n[2]);if(this.cullFace(r,s))continue;let[c,l,u]=vu(r.tex[a]),d=this.tmpVerts,f=0,p=0,m=0,h=0;for(let r=0;r<4;r++){let s=o.v[r];this.vertexLight(e,t,n,a,s[0],s[1],s[2],i);let g=hp(a,s[0],s[1],s[2]),_=d[r];_[0]=e+s[0],_[1]=t+s[1],_[2]=n+s[2],_[3]=c+(g[0]*(1-2*_p)+_p)*u,_[4]=l+(g[1]*(1-2*_p)+_p)*u,_[5]=i[0],_[6]=i[1],_[7]=i[2]*o.shade,r===0?f=i[2]:r===1?p=i[2]:r===2?m=i[2]:h=i[2]}this.solid.quad(d,f+m>p+h)}}liquid(e,t,n,r){let i=this.blk(e,t+1,n)===W.WATER?1:.875,[a,o,s]=vu(r.tex[0]),c=this.skyAt(e,t,n)/15,l=this.lightAt(e,t,n)/15;for(let r=0;r<6;r++){let u=mp[r],d=this.blk(e+u.n[0],t+u.n[1],n+u.n[2]);if(d===W.WATER||G[d].opaque)continue;let f=this.tmpVerts;for(let d=0;d<4;d++){let p=u.v[d],m=p[1]?i:0,h=hp(r,p[0],m,p[2]),g=f[d];g[0]=e+p[0],g[1]=t+m,g[2]=n+p[2],g[3]=a+(h[0]*(1-2*_p)+_p)*s,g[4]=o+(h[1]*(1-2*_p)+_p)*s;let _=c,v=l;r===2&&(_=this.skyAt(e,t+1,n)/15,v=this.lightAt(e,t+1,n)/15),g[5]=_,g[6]=v,g[7]=u.shade}this.water.quad(f,!1)}}cross(e,t,n,r){let[i,a,o]=vu(r.tex[0]),s=this.skyAt(e,t,n)/15,c=this.lightAt(e,t,n)/15,l=i+_p*o,u=i+.9994*o,d=a+_p*o,f=a+.9994*o,p=.1,m=[[[p,0,p],[.9,0,.9],[.9,1,.9],[p,1,p]],[[.9,0,p],[p,0,.9],[p,1,.9],[.9,1,p]]];for(let r of m){let i=this.tmpVerts;for(let a=0;a<4;a++){let o=r[a],p=i[a];p[0]=e+o[0],p[1]=t+o[1],p[2]=n+o[2],p[3]=a===0||a===3?l:u,p[4]=o[1]?d:f,p[5]=s,p[6]=c,p[7]=.9}this.solid.quad(i,!1);let a=[i[3],i[2],i[1],i[0]];this.solid.quad(a,!1)}}box(e,t,n,r,i,a,o,s,c,l,u=0,d=0,f=!1,p=this.solid){let m=this.skyAt(e,t,n),h=this.lightAt(e,t,n);for(let g=0;g<6;g++){if(u&1<<g)continue;let _=mp[g],v=g===0&&o>=1||g===1&&r<=0||g===2&&s>=1||g===3&&i<=0||g===4&&c>=1||g===5&&a<=0,y=m,b=h;if(v){let r=e+_.n[0],i=t+_.n[1],a=n+_.n[2];if(G[this.blk(r,i,a)].opaque)continue;y=this.skyAt(r,i,a),b=this.lightAt(r,i,a)}let[x,S,C]=vu(l[g]),w=this.tmpVerts;for(let l=0;l<4;l++){let u=_.v[l],p=u[0]?o:r,m=u[1]?s:i,h=u[2]?c:a,v=f?hp(g,u[0],u[1],u[2]):hp(g,p,m,h);if(g===2&&d){let[e,t]=v;v=d===1?[t,1-e]:d===2?[1-e,1-t]:[1-t,e]}let T=w[l];T[0]=e+p,T[1]=t+m,T[2]=n+h,T[3]=x+(v[0]*(1-2*_p)+_p)*C,T[4]=S+(v[1]*(1-2*_p)+_p)*C,T[5]=y/15,T[6]=b/15,T[7]=_.shade}p.quad(w,!1)}}isSolidAt(e,t,n){return G[this.blk(e,t,n)].solid}isOpaqueOrSame(e,t,n,r){let i=this.blk(e,t,n);return i===r||G[i].opaque}special(e,t,n,r){let i=r.tex,a=r.id;switch(r.shape){case U.SLAB:{let r=+!!this.isOpaqueOrSame(e+1,t,n,a)|(this.isOpaqueOrSame(e-1,t,n,a)?2:0)|(this.isOpaqueOrSame(e,t,n+1,a)?16:0)|(this.isOpaqueOrSame(e,t,n-1,a)?32:0);this.box(e,t,n,0,0,0,1,.5,1,i,r);break}case U.SLAB_TOP:{let r=+!!this.isOpaqueOrSame(e+1,t,n,a)|(this.isOpaqueOrSame(e-1,t,n,a)?2:0)|(this.isOpaqueOrSame(e,t,n+1,a)?16:0)|(this.isOpaqueOrSame(e,t,n-1,a)?32:0);this.box(e,t,n,0,.5,0,1,1,1,i,r);break}case U.TROUGH:this.box(e,t,n,0,0,0,1,.5,1,i);break;case U.FARMLAND:this.box(e,t,n,0,0,0,1,.9375,1,i);break;case U.FENCE:{let r=.375,o=.625,s=this.blk(e,t+1,n),c=this.blk(e,t-1,n)===a,l=0;s===a&&(l|=4),c&&(l|=8),this.box(e,t,n,r,0,r,o,1,o,i,l);let u=(e,n)=>{let r=G[this.blk(e,t,n)];return r.shape===U.FENCE||r.opaque},d=(r,a,o,s)=>{this.box(e,t,n,r,.375,a,o,.5625,s,i,0),this.box(e,t,n,r,.75,a,o,.9375,s,i,0)};u(e+1,n)&&d(o,.4375,1,.5625),u(e-1,n)&&d(0,.4375,r,.5625),u(e,n+1)&&d(.4375,o,.5625,1),u(e,n-1)&&d(.4375,0,.5625,r);break}case U.LANTERN:this.isSolidAt(e,t-1,n)?(this.box(e,t,n,.3125,0,.3125,.6875,.4375,.6875,i),this.box(e,t,n,.4375,.4375,.4375,.5625,.5625,.5625,i)):(this.box(e,t,n,.3125,.375,.3125,.6875,.8125,.6875,i),this.box(e,t,n,.4375,.8125,.4375,.5625,1,.5625,i,4));break;case U.TORCH:this.box(e,t,n,.4375,0,.4375,.5625,.625,.5625,i,8);break;case U.RAIL:{let r=G[this.blk(e,t,n+1)].shape===U.RAIL||G[this.blk(e,t,n-1)].shape===U.RAIL,a=+((G[this.blk(e+1,t,n)].shape===U.RAIL||G[this.blk(e-1,t,n)].shape===U.RAIL)&&!r),[o,s,c]=vu(i[2]),l=this.skyAt(e,t,n)/15,u=this.lightAt(e,t,n)/15,d=mp[2],f=this.tmpVerts;for(let r=0;r<4;r++){let i=d.v[r],p=hp(2,i[0],0,i[2]);a&&(p=[p[1],1-p[0]]);let m=f[r];m[0]=e+i[0],m[1]=t+.0625,m[2]=n+i[2],m[3]=o+(p[0]*(1-2*_p)+_p)*c,m[4]=s+(p[1]*(1-2*_p)+_p)*c,m[5]=l,m[6]=u,m[7]=1}this.solid.quad(f,!1);break}case U.PANE:{let r=this.isSolidAt(e+1,t,n)||this.isSolidAt(e-1,t,n),a=this.isSolidAt(e,t,n+1)||this.isSolidAt(e,t,n-1);r&&!a?this.box(e,t,n,0,0,.4375,1,1,.5625,i,0):this.box(e,t,n,.4375,0,0,.5625,1,1,i,0);break}case U.DOOR:{let r=G[this.blk(e,t-1,n)].shape===U.DOOR?uu.oak_door_top:uu.oak_door_bottom,i=[r,r,r,r,r,r];this.isSolidAt(e+1,t,n)||this.isSolidAt(e-1,t,n)?this.box(e,t,n,0,0,0,.1875,1,1,i,0,0,!0):this.box(e,t,n,0,0,0,1,1,.1875,i,0,0,!0);break}case U.SALOON_DOOR:this.isSolidAt(e+1,t,n)||this.isSolidAt(e-1,t,n)?(this.box(e,t,n,.4375,.2,0,.5625,1,.4375,i,0),this.box(e,t,n,.4375,.2,.5625,.5625,1,1,i,0)):(this.box(e,t,n,0,.2,.4375,.4375,1,.5625,i,0),this.box(e,t,n,.5625,.2,.4375,1,1,.5625,i,0));break;case U.WALL_SIGN:{let r=this.chunk.cx*16+e,a=this.chunk.cz*16+n,o=this.world.signTiles.get(Ru.posKey(r,t,a)),s=o===void 0?i:[o,o,o,o,o,o],c=.0625;this.isSolidAt(e,t,n-1)?this.box(e,t,n,0,.25,0,1,.75,c,s,32):this.isSolidAt(e,t,n+1)?this.box(e,t,n,0,.25,.9375,1,.75,1,s,16):this.isSolidAt(e-1,t,n)?this.box(e,t,n,0,.25,0,c,.75,1,s,2):this.isSolidAt(e+1,t,n)?this.box(e,t,n,.9375,.25,0,1,.75,1,s,1):this.box(e,t,n,0,.25,.4375,1,.75,.5,s,0);break}case U.BED:{let r=a===W.BED_HEAD?W.BED_FOOT:W.BED_HEAD,o=0,s=0;this.blk(e,t,n+1)===r?(o=a===W.BED_HEAD?0:2,s=16):this.blk(e,t,n-1)===r?(o=a===W.BED_HEAD?2:0,s=32):this.blk(e+1,t,n)===r?(o=a===W.BED_HEAD?3:1,s=1):this.blk(e-1,t,n)===r&&(o=a===W.BED_HEAD?1:3,s=2),this.box(e,t,n,0,0,0,1,.5625,1,i,s,o,!0);break}case U.ANVIL:this.box(e,t,n,.125,0,.125,.875,.25,.875,i,0,0,!0),this.box(e,t,n,.25,.25,.3125,.75,.625,.6875,i,12,0,!0),this.box(e,t,n,.1875,.625,0,.8125,1,1,i,8,0,!0);break;case U.CHEST:{let r=i,a=i[4],o=i[0];r=this.isSolidAt(e,t,n+1)?this.isSolidAt(e,t,n-1)?this.isSolidAt(e+1,t,n)?[o,a,i[2],i[3],o,o]:[a,o,i[2],i[3],o,o]:[o,o,i[2],i[3],o,a]:[o,o,i[2],i[3],a,o],this.box(e,t,n,.0625,0,.0625,.9375,.875,.9375,r,0,0,!0);break}case U.GRAVESTONE:G[this.blk(e,t,n+1)].shape===U.GRAVESTONE||G[this.blk(e,t,n-1)].shape===U.GRAVESTONE?this.box(e,t,n,.375,0,.125,.625,.75,.875,i,4):this.box(e,t,n,.125,0,.375,.875,.75,.625,i,4);break;case U.CACTUS:{let r=0;this.blk(e,t+1,n)===a&&(r|=4),this.blk(e,t-1,n)===a&&(r|=8),this.box(e,t,n,.0625,0,.0625,.9375,1,.9375,i,r);break}case U.TABLE:this.box(e,t,n,0,.75,0,1,1,1,i,0),this.box(e,t,n,.375,0,.375,.625,.75,.625,i,4);break;default:this.box(e,t,n,0,0,0,1,1,1,i)}}},bp=`
attribute vec2 aLight;
attribute float aShade;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
void main() {
  vUv = uv;
  vLight = aLight;
  vShade = aShade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,xp=`
uniform sampler2D map;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAlphaTest;
uniform float uOpacity;
uniform float uTime;
uniform float uFlash;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
float lightCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.4);
}
float blockCurve(float l) {
  float c = l / (4.0 - 3.0 * l);
  return mix(c, l, 0.6);
}
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < uAlphaTest) discard;
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, tex.a * uOpacity);
}`;function Sp(e,t={}){return new _a({uniforms:{map:{value:e},uSkyLight:{value:1},uSkyTint:{value:new I(1,1,1)},uFogColor:{value:new I(.7,.8,1)},uFogNear:{value:80},uFogFar:{value:120},uAlphaTest:{value:t.alphaTest??.5},uOpacity:{value:t.opacity??1},uTime:{value:0},uFlash:{value:0}},vertexShader:bp,fragmentShader:xp,transparent:!!t.transparent,side:t.side??0,depthWrite:!0})}var Cp=class{constructor(e,t,n){this.world=e,this.scene=t,this.group=new wn,t.add(this.group),this.mesher=new yp,this.material=Sp(n,{alphaTest:.5}),this.waterMaterial=Sp(n,{alphaTest:0,opacity:.78,transparent:!0,side:2}),this.renderDistance=7,this.lastCx=null,this.lastCz=null,this.offsets=[],this.buildOffsets(),this.stats={chunks:0,meshed:0,genTimeMs:0}}buildOffsets(){let e=this.renderDistance+1,t=[];for(let n=-e;n<=e;n++)for(let r=-e;r<=e;r++){let i=Math.sqrt(n*n+r*r);i<=e+.5&&t.push([n,r,i])}t.sort((e,t)=>e[2]-t[2]),this.offsets=t}setRenderDistance(e){this.renderDistance=Math.max(2,Math.min(16,e)),this.buildOffsets(),this.lastCx=null}setLighting(e,t,n,r,i,a=0){for(let o of[this.material,this.waterMaterial])o.uniforms.uFlash.value=a,o.uniforms.uSkyLight.value=e,o.uniforms.uSkyTint.value.copy(t),o.uniforms.uFogColor.value.copy(n),o.uniforms.uFogNear.value=r,o.uniforms.uFogFar.value=i}ensureChunk(e,t){let n=this.world.getOrCreateChunk(e,t);if(!n.generated){let r=performance.now();this.world.gen.generateChunk(n),this.onChunkGenerated&&this.onChunkGenerated(n),n.generated=!0,this.world.lightChunk(n),this.stats.genTimeMs+=performance.now()-r;for(let n=-1;n<=1;n++)for(let r=-1;r<=1;r++){let i=this.world.getChunk(e+n,t+r);i&&(i.dirty=!0)}}return n}neighborsReady(e,t){for(let n=-1;n<=1;n++)for(let r=-1;r<=1;r++){if(n===0&&r===0)continue;let i=this.world.getChunk(e+n,t+r);if(!i||!i.lit)return!1}return!0}meshChunk(e){let{solid:t,water:n}=this.mesher.build(this.world,e);if(e.mesh&&(this.group.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh=null),e.waterMesh&&(this.group.remove(e.waterMesh),e.waterMesh.geometry.dispose(),e.waterMesh=null),t){let n=new mi(t,this.material);n.position.set(e.cx*16,0,e.cz*16),n.matrixAutoUpdate=!1,n.updateMatrix(),n.frustumCulled=!0,this.group.add(n),e.mesh=n}if(n){let t=new mi(n,this.waterMaterial);t.position.set(e.cx*16,0,e.cz*16),t.matrixAutoUpdate=!1,t.updateMatrix(),t.renderOrder=10,this.group.add(t),e.waterMesh=t}e.dirty=!1,e.meshed=!0}disposeChunk(e){e.mesh&&(this.group.remove(e.mesh),e.mesh.geometry.dispose()),e.waterMesh&&(this.group.remove(e.waterMesh),e.waterMesh.geometry.dispose()),e.mesh=null,e.waterMesh=null}pinRegion(e,t,n,r){this.pinned={cx0:Math.floor(e/16)-1,cz0:Math.floor(t/16)-1,cx1:Math.floor(n/16)+1,cz1:Math.floor(r/16)+1}}*preload(e,t){let n=Math.floor(e/16),r=Math.floor(t/16),i=[];if(this.pinned)for(let e=this.pinned.cx0;e<=this.pinned.cx1;e++)for(let t=this.pinned.cz0;t<=this.pinned.cz1;t++)i.push([e,t]);let a=this.offsets.length*2+i.length,o=0;for(let[e,t]of i){let n=this.ensureChunk(e,t);n.pinned=!0,o++,yield o/a}for(let[e,t]of this.offsets)this.ensureChunk(n+e,r+t),o++,yield o/a;for(let[e,t,i]of this.offsets){if(i>this.renderDistance+.5){o++;continue}let s=this.world.getChunk(n+e,r+t);s&&s.dirty&&this.meshChunk(s),o++,yield o/a}}update(e,t,n=6){let r=performance.now(),i=Math.floor(e/16),a=Math.floor(t/16),o=this.renderDistance,s=0;for(let[e,t]of this.offsets){let o=i+e,c=a+t,l=this.world.getChunk(o,c);if(!(l&&l.generated)&&(this.ensureChunk(o,c),s++,performance.now()-r>n))break}let c=0;for(let[e,t,s]of this.offsets){if(s>o+.5)break;let l=this.world.getChunk(i+e,a+t);if(!(!l||!l.generated||!l.dirty||l.needsRelight)&&this.neighborsReady(l.cx,l.cz)&&(this.meshChunk(l),c++,performance.now()-r>n*1.5))break}if(i!==this.lastCx||a!==this.lastCz){this.lastCx=i,this.lastCz=a;let e=o+4;for(let[t,n]of this.world.chunks){let r=n.cx-i,o=n.cz-a;r*r+o*o>e*e&&(this.disposeChunk(n),n.dirty=!0,n.pinned||this.world.chunks.delete(t))}for(let e of this.world.chunks.values()){let t=e.cx-i,n=e.cz-a,r=Math.sqrt(t*t+n*n)<=o+.5;e.mesh&&(e.mesh.visible=r),e.waterMesh&&(e.waterMesh.visible=r)}}this.stats.chunks=this.world.chunks.size,this.stats.meshed=this.group.children.length}remeshDirty(e,t,n){let r=Math.floor(t/16),i=Math.floor(n/16),a=0;for(let[t,n,o]of this.offsets){if(o>this.renderDistance+.5)break;let s=this.world.getChunk(r+t,i+n);if(s&&s.generated&&s.dirty&&!s.needsRelight&&this.neighborsReady(s.cx,s.cz)&&(this.meshChunk(s),++a>=e))break}return a}remeshDirtyNear(e,t,n=4){let r=Math.floor(e/16),i=Math.floor(t/16),a=0;for(let[e,t,o]of this.offsets){if(o>2.5)break;let s=this.world.getChunk(r+e,i+t);if(s&&s.generated&&s.dirty&&this.neighborsReady(s.cx,s.cz)&&(this.meshChunk(s),++a>=n))break}}},wp=class{constructor(e){this.canvas=e,this.keys=new Set,this.pressed=new Set,this.mouseDX=0,this.mouseDY=0,this.wheel=0,this.mouseDown=[!1,!1,!1],this.mouseClicked=[!1,!1,!1],this.locked=!1,this.enabled=!0,this.onLockChange=null,this.onKeyDown=null,this.onMouseDown=null,document.addEventListener(`keydown`,e=>{if(e.repeat){[`Space`].includes(e.code)&&e.preventDefault();return}this.keys.add(e.code),this.pressed.add(e.code),this.onKeyDown&&this.onKeyDown(e),[`Space`,`Tab`,`KeyE`,`F3`,`F5`].includes(e.code)&&e.preventDefault()}),document.addEventListener(`keyup`,e=>this.keys.delete(e.code)),window.addEventListener(`blur`,()=>this.keys.clear()),document.addEventListener(`mousemove`,e=>{this.locked&&(this.mouseDX+=e.movementX,this.mouseDY+=e.movementY)}),document.addEventListener(`mousedown`,e=>{this.onMouseDown&&this.onMouseDown(e),this.locked&&(this.mouseDown[e.button]=!0,this.mouseClicked[e.button]=!0)}),document.addEventListener(`mouseup`,e=>{this.mouseDown[e.button]=!1}),document.addEventListener(`wheel`,e=>{this.locked&&(this.wheel+=Math.sign(e.deltaY))},{passive:!0}),document.addEventListener(`contextmenu`,e=>e.preventDefault()),document.addEventListener(`pointerlockchange`,()=>{this.locked=document.pointerLockElement===e,this.locked||(this.keys.clear(),this.mouseDown=[!1,!1,!1]),this.onLockChange&&this.onLockChange(this.locked)})}requestLock(){if(this.locked)return;let e=e=>{e&&e.catch&&e.catch(()=>{})};try{let t=this.canvas.requestPointerLock({unadjustedMovement:!0});t&&t.catch&&t.catch(()=>{try{e(this.canvas.requestPointerLock())}catch{}})}catch{try{e(this.canvas.requestPointerLock())}catch{}}}releaseLock(){this.locked&&document.exitPointerLock()}isDown(e){return this.keys.has(e)}wasPressed(e){return this.pressed.has(e)}endFrame(){this.pressed.clear(),this.mouseDX=0,this.mouseDY=0,this.wheel=0,this.mouseClicked=[!1,!1,!1]}},Tp=[`.##...##.`,`#..#.#..#`,`#...#...#`,`#.......#`,`.#.....#.`,`..#...#..`,`...#.#...`,`....#....`,`.........`],Ep=[`.........`,`.##...##.`,`.###.###.`,`.#######.`,`..#####..`,`...###...`,`....#....`,`.........`,`.........`],Dp=[`.....##..`,`....####.`,`...#####.`,`..#####..`,`.####....`,`####.....`,`###......`,`##.......`,`.........`],Op=new Map;function kp(e,t=1){let n=e+`:`+t,r=Op.get(n);if(r)return r;r=document.createElement(`canvas`),r.width=16,r.height=16;let i=r.getContext(`2d`),a=i.createImageData(16,16),o=yu(e);for(let e=0;e<o.length;e+=4)a.data[e]=o[e]*t,a.data[e+1]=o[e+1]*t,a.data[e+2]=o[e+2]*t,a.data[e+3]=o[e+3];return i.putImageData(a,0,0),Op.set(n,r),r}var Ap=new Map;function jp(e,t){let n=e+`:`+t,r=Ap.get(n);if(r)return r;let i=G[e];r=document.createElement(`canvas`),r.width=t,r.height=t;let a=r.getContext(`2d`);if(a.imageSmoothingEnabled=!1,i.icon===`flat`)a.drawImage(kp(i.tex[0]),0,0,t,t);else{let e=i.icon===`slab`,n=e?.25:.5,r=e?.25:0,o=[0,.25+r],s=[.5,0+r],c=[.5,.5+r],l=[1,.25+r],u=(e,n,r,i,o,s,c,l)=>{let u=kp(e,l);a.setTransform(i*t/16,o*t/16,s*t/16,c*t/16,n*t,r*t),a.drawImage(u,0,0)};u(i.tex[2],o[0],o[1],s[0]-o[0],s[1]-o[1],c[0]-o[0],c[1]-o[1],1),u(i.tex[1],o[0],o[1],c[0]-o[0],c[1]-o[1],0,n,.6),u(i.tex[4],c[0],c[1],l[0]-c[0],l[1]-c[1],0,n,.8),a.setTransform(1,0,0,1,0,0)}return Ap.set(n,r),r}var Mp=class{constructor(e,t){this.canvas=e,this.ctx=e.getContext(`2d`),this.game=t,this.scale=3,this.messages=[],this.itemNameTimer=0,this.lastSelected=-1,this.selectorX=0,this.selectorPop=0,this.screen=null,this.mouse={x:0,y:0,down:!1,clicked:!1},this.cursorItem=null,this.hover=null,this.buttons=[],this.debug=!1,this.fps=0,this.xp=.15,e.addEventListener(`mousemove`,e=>{this.mouse.x=e.clientX,this.mouse.y=e.clientY}),e.addEventListener(`mousedown`,e=>{e.button===0&&(this.mouse.down=!0,this.mouse.clicked=!0)}),e.addEventListener(`mouseup`,()=>{this.mouse.down=!1}),this.resize()}resize(){let e=window.innerWidth,t=window.innerHeight;this.canvas.width=e,this.canvas.height=t,this.scale=Ol(Math.min(Math.floor(e/320),Math.floor(t/240)),1,4),e>=1600&&(this.scale=Math.min(this.scale,4))}addMessage(e){this.messages.push({text:e,time:performance.now()}),this.messages.length>8&&this.messages.shift()}text(e,t,n,r=`#ffffff`,i=!0,a=this.scale){return Wl(this.ctx,e,Math.round(t),Math.round(n),a,r,i)}textCentered(e,t,n,r=`#ffffff`,i=this.scale){let a=Ul(e,i);return this.text(e,t-a/2,n,r,!0,i)}pixelArt(e,t,n,r,i){this.ctx.fillStyle=r;for(let r=0;r<e.length;r++)for(let a=0;a<e[r].length;a++)e[r][a]===`#`&&this.ctx.fillRect(t+a*i,n+r*i,i,i)}drawCrosshair(){let e=this.ctx,t=this.scale,n=Math.floor(this.canvas.width/2),r=Math.floor(this.canvas.height/2);e.save(),e.globalCompositeOperation=`difference`,e.fillStyle=`#ffffff`;let i=9*t/2,a=t;e.fillRect(n-i,r-a/2,i*2,a),e.fillRect(n-a/2,r-i,a,i*2),e.restore()}drawHotbar(e){let t=this.ctx,n=this.scale,r=this.canvas.width,i=this.canvas.height,a=182*n,o=22*n,s=Math.floor(r/2-a/2),c=i-o-1*n;t.fillStyle=`rgba(0,0,0,0.55)`,t.fillRect(s,c,a,o),t.fillStyle=`rgba(140,140,140,0.75)`,t.fillRect(s,c,a,n),t.fillRect(s,c+o-n,a,n),t.fillRect(s,c,n,o),t.fillRect(s+a-n,c,n,o);for(let r=0;r<9;r++){let i=s+n+r*20*n;t.fillStyle=`rgba(60,60,60,0.6)`,t.fillRect(i,c+n,20*n,20*n),t.fillStyle=`rgba(160,160,160,0.35)`,t.fillRect(i+19*n,c+n,n,20*n);let a=e.slots[r];a&&this.drawItem(a,i+2*n,c+3*n)}let l=s-n+e.selected*20*n;this.lastSelected!==e.selected&&(this.lastSelected=e.selected,this.itemNameTimer=performance.now(),this.selectorPop=1,this.selectorX===0&&(this.selectorX=l)),this.selectorX+=(l-this.selectorX)*.5,Math.abs(this.selectorX-l)<.5&&(this.selectorX=l),this.selectorPop*=.8;let u=Math.round(this.selectorPop*2*n);t.fillStyle=`#ffffff`;let d=Math.round(this.selectorX)-u,f=c-n-u,p=24*n+u*2,m=24*n+u*2;t.fillRect(d,f,p,n),t.fillRect(d,f+m-n,p,n),t.fillRect(d,f,n,m),t.fillRect(d+p-n,f,n,m);let h=e.held,g=performance.now()-this.itemNameTimer;return h&&g<2500&&(t.globalAlpha=g>1800?1-(g-1800)/700:1,this.textCentered(G[h.id].displayName,r/2,c-30*n),t.globalAlpha=1),c}drawItem(e,t,n){let r=this.scale,i=jp(e.id,16*r);if(this.ctx.drawImage(i,t,n),e.count>1){let i=String(e.count),a=Ul(i,r);this.text(i,t+17*r-a,n+9*r)}}drawStatusBars(e,t){let n=this.ctx,r=this.scale,i=this.canvas.width,a=Math.floor(i/2-91*r),o=t-16*r,s=e.hurtTime>0;for(let t=0;t<10;t++){let i=a+t*8*r,c=o+(s?Math.random()<.5?-r:r:0)-(e.health<=4&&Math.floor(performance.now()/150+t)%3==0?r:0);this.pixelArt(Tp,i,c,`#000000`,r),this.pixelArt(Ep,i,c,`#3a3a3a`,r);let l=e.health-t*2;l>=2?(this.pixelArt(Ep,i,c,`#ff1313`,r),n.fillStyle=`#ff6b6b`,n.fillRect(i+2*r,c+2*r,r,r),n.fillRect(i+6*r,c+2*r,r,r)):l===1&&(n.save(),n.beginPath(),n.rect(i,c,4.5*r,9*r),n.clip(),this.pixelArt(Ep,i,c,`#ff1313`,r),n.fillStyle=`#ff6b6b`,n.fillRect(i+2*r,c+2*r,r,r),n.restore())}for(let t=0;t<10;t++){let a=Math.floor(i/2+91*r)-(t+1)*8*r-r;this.pixelArt(Dp,a,o,`#000000`,r);let s=e.food-t*2,c=s>=2||s===1?`#c76d2a`:`#4a3a2a`,l=[`.........`,`.....##..`,`....###..`,`...###...`,`..###....`,`.###.....`,`.##......`,`.........`,`.........`];s>=1?(this.pixelArt(l,a,o,c,r),s>=2&&(n.fillStyle=`#e8a25f`,n.fillRect(a+6*r,o+2*r,r,r))):this.pixelArt(l,a,o,`#3a2a1a`,r)}let c=Math.floor(i/2-91*r),l=t-7*r;n.fillStyle=`rgba(0,0,0,0.6)`,n.fillRect(c,l,182*r,5*r),n.fillStyle=`#2e3a2e`,n.fillRect(c+r,l+r,180*r,3*r),n.fillStyle=`#80ff20`,n.fillRect(c+r,l+r,Math.floor(180*r*Ol(this.xp,0,1)),3*r)}drawChat(){let e=this.scale,t=performance.now(),n=this.canvas.height-48*e;for(let r=this.messages.length-1;r>=0;r--){let i=this.messages[r],a=t-i.time;if(a>12e3)continue;let o=a>1e4?1-(a-1e4)/2e3:1;this.ctx.globalAlpha=o;let s=Ul(i.text,e);this.ctx.fillStyle=`rgba(0,0,0,0.5)`,this.ctx.fillRect(2*e,n-1*e,s+4*e,11*e),this.text(i.text,4*e,n),n-=12*e,this.ctx.globalAlpha=1}}drawDebug(e){let t=Math.max(1,this.scale-1),n=2*t;for(let r of e){let e=Ul(r,t);this.ctx.fillStyle=`rgba(80,80,80,0.5)`,this.ctx.fillRect(2*t,n-t,e+2*t,10*t),this.text(r,3*t,n,`#e0e0e0`,!0,t),n+=10*t}}drawPanel(e,t,n,r){let i=this.ctx,a=this.scale;i.fillStyle=`#c6c6c6`,i.fillRect(e,t,n,r),i.fillStyle=`#ffffff`,i.fillRect(e,t,n,a),i.fillRect(e,t,a,r),i.fillStyle=`#555555`,i.fillRect(e,t+r-a,n,a),i.fillRect(e+n-a,t,a,r),i.fillStyle=`#000000`,i.fillRect(e-a,t-a,n+2*a,a),i.fillRect(e-a,t+r,n+2*a,a),i.fillRect(e-a,t-a,a,r+2*a),i.fillRect(e+n,t-a,a,r+2*a)}drawSlotBg(e,t){let n=this.ctx,r=this.scale;n.fillStyle=`#373737`,n.fillRect(e,t,18*r,18*r),n.fillStyle=`#ffffff`,n.fillRect(e+r,t+17*r,17*r,r),n.fillRect(e+17*r,t+r,r,17*r),n.fillStyle=`#8b8b8b`,n.fillRect(e+r,t+r,16*r,16*r)}button(e,t,n,r,i,a,o,s=!0){let c=this.ctx,l=this.scale,u=s&&this.mouse.x>=n&&this.mouse.x<n+i&&this.mouse.y>=r&&this.mouse.y<r+a;c.fillStyle=`#000000`,c.fillRect(n-l,r-l,i+2*l,a+2*l),c.fillStyle=s?u?`#7f8ce8`:`#6f6f6f`:`#4a4a4a`,c.fillRect(n,r,i,a),c.fillStyle=s?u?`#a4aefc`:`#a0a0a0`:`#6a6a6a`,c.fillRect(n,r,i,l),c.fillRect(n,r,l,a),c.fillStyle=s?u?`#3d4a9a`:`#3a3a3a`:`#2a2a2a`,c.fillRect(n,r+a-l,i,l),c.fillRect(n+i-l,r,l,a),this.textCentered(t,n+i/2,r+(a-8*l)/2+l,s?u?`#ffffa0`:`#e0e0e0`:`#a0a0a0`),u&&this.mouse.clicked&&(this.mouse.clicked=!1,o())}drawInventory(e){let t=this.ctx,n=this.scale,r=this.canvas.width,i=this.canvas.height;t.fillStyle=`rgba(0,0,0,0.6)`,t.fillRect(0,0,r,i);let a=Math.ceil(Cu.length/9),o=176*n,s=(18*a+18+42)*n,c=Math.floor(r/2-o/2),l=Math.floor(i/2-s/2);this.drawPanel(c,l,o,s),this.text(`Blocks`,c+8*n,l+6*n,`#404040`,!1),this.text(`Click a block to add a stack, drag onto the hotbar`,c+8*n,l+s-10*n,`#606060`,!1,Math.max(1,n-1)),this.hover=null;let u=c+7*n,d=l+17*n;for(let e=0;e<Cu.length;e++){let t=e%9,r=Math.floor(e/9),i=u+t*18*n,a=d+r*18*n;this.drawSlotBg(i,a),this.ctx.drawImage(jp(Cu[e],16*n),i+n,a+n),this.mouse.x>=i&&this.mouse.x<i+18*n&&this.mouse.y>=a&&this.mouse.y<a+18*n&&(this.hover={type:`palette`,id:Cu[e],x:i,y:a})}let f=d+a*18*n+14*n;this.text(`Hotbar`,u,f-9*n,`#404040`,!1,Math.max(1,n-1));for(let t=0;t<9;t++){let r=u+t*18*n;this.drawSlotBg(r,f);let i=e.slots[t];i&&this.drawItem(i,r+n,f+n),this.mouse.x>=r&&this.mouse.x<r+18*n&&this.mouse.y>=f&&this.mouse.y<f+18*n&&(this.hover={type:`hotbar`,index:t,x:r,y:f})}if(this.hover&&(t.fillStyle=`rgba(255,255,255,0.45)`,t.fillRect(this.hover.x+n,this.hover.y+n,16*n,16*n)),this.mouse.clicked){if(this.mouse.clicked=!1,this.hover&&this.hover.type===`palette`)this.cursorItem=this.cursorItem&&this.cursorItem.id===this.hover.id?null:{id:this.hover.id,count:64};else if(this.hover&&this.hover.type===`hotbar`){let t=this.hover.index;if(this.cursorItem){let n=e.slots[t];e.slots[t]=this.cursorItem,this.cursorItem=n}else e.slots[t]&&(this.cursorItem=e.slots[t],e.slots[t]=null)}else this.cursorItem&&(this.mouse.x<c||this.mouse.x>c+o||this.mouse.y<l||this.mouse.y>l+s)&&(this.cursorItem=null)}if(this.hover&&!this.cursorItem){let r=this.hover.type===`palette`?this.hover.id:e.slots[this.hover.index]?.id;if(r){let e=G[r].displayName,i=Ul(e,n),a=this.mouse.x+8*n,o=this.mouse.y-12*n;t.fillStyle=`rgba(16,0,16,0.94)`,t.fillRect(a-3*n,o-3*n,i+6*n,14*n),t.fillStyle=`#5000ff`,t.fillRect(a-3*n,o-3*n,i+6*n,n),t.fillRect(a-3*n,o+10*n,i+6*n,n),t.fillRect(a-3*n,o-3*n,n,14*n),t.fillRect(a+i+2*n,o-3*n,n,14*n),this.text(e,a,o)}}this.cursorItem&&this.drawItem(this.cursorItem,this.mouse.x-8*n,this.mouse.y-8*n)}drawPause(e){let t=this.ctx,n=this.scale,r=this.canvas.width,i=this.canvas.height;t.fillStyle=`rgba(0,0,0,0.6)`,t.fillRect(0,0,r,i),this.textCentered(`Game Menu`,r/2,i/4);let a=200*n,o=20*n,s=Math.floor(r/2-a/2),c=Math.floor(i/4+24*n);this.button(`back`,`Back to Game`,s,c,a,o,()=>e.closeScreen()),c+=24*n,this.button(`rd`,`Render Distance: ${e.terrain.renderDistance} chunks`,s,c,a,o,()=>e.cycleRenderDistance()),c+=24*n,this.button(`snd`,`Sound: ${e.audio.enabled?`ON`:`OFF`}`,s,c,a,o,()=>e.audio.toggle()),c+=24*n,this.button(`time`,`Time: ${e.sky.clockString()}  (skip 2h)`,s,c,a,o,()=>{e.sky.time=(e.sky.time+2/24)%1}),c+=24*n,this.button(`bob`,`View Bobbing: ${e.viewBobbing?`ON`:`OFF`}`,s,c,a,o,()=>{e.viewBobbing=!e.viewBobbing}),c+=24*n,this.button(`spawn`,`Return to Spawn`,s,c,a,o,()=>{e.respawn(),e.closeScreen()}),c+=30*n;let l=[`WASD move   Space jump   Double-tap W or R sprint   Shift sneak`,`Left click break   Right click place / talk   E inventory`,`1-9 / wheel select   T skip time   F3 debug   Esc menu`],u=Math.max(1,n-1);for(let e of l)this.textCentered(e,r/2,c,`#c0c0c0`,u),c+=11*u}drawDeath(e){let t=this.ctx,n=this.scale,r=this.canvas.width,i=this.canvas.height;t.fillStyle=`rgba(120,0,0,0.55)`,t.fillRect(0,0,r,i),this.textCentered(`You died!`,r/2,i/3,`#ffffff`,n*2),this.button(`respawn`,`Respawn`,Math.floor(r/2-100*n),Math.floor(i/2),200*n,20*n,()=>{e.respawn(),e.closeScreen()})}render(e){let t=this.ctx,n=this.canvas.width,r=this.canvas.height;t.clearRect(0,0,n,r);let i=e.player,a=this.scale;if(i.eyeUnderwater&&(t.fillStyle=`rgba(10,30,140,0.35)`,t.fillRect(0,0,n,r)),i.hurtTime>0&&(t.fillStyle=`rgba(255,0,0,${i.hurtTime/10*.35})`,t.fillRect(0,0,n,r)),this.screen===`inventory`){this.drawInventory(e.inventory),this.mouse.clicked=!1;return}if(this.screen===`pause`){this.drawPause(e),this.mouse.clicked=!1;return}if(this.screen===`death`){this.drawDeath(e),this.mouse.clicked=!1;return}if(this.screen===`admin`){this.drawChat(),this.text(`Disaster controls open  (F4 / Esc to close)`,6*a,6*a,`#ffd080`),this.debug&&this.drawDebug(e.debugLines()),this.mouse.clicked=!1;return}this.drawCrosshair();let o=this.drawHotbar(e.inventory);this.drawStatusBars(i,o),this.drawChat(),e.lookingAtName&&this.textCentered(e.lookingAtName,n/2,r/2+14*a,`#ffffff`),this.debug&&this.drawDebug(e.debugLines()),!e.input.locked&&!e.loading&&(t.fillStyle=`rgba(0,0,0,0.35)`,t.fillRect(0,0,n,r),this.textCentered(`Click to play`,n/2,r/2-30*a,`#ffffff`,a),this.textCentered(`WASD move - Space jump - Double-tap W to sprint - Left/Right click break/place`,n/2,r/2-14*a,`#c0c0c0`,Math.max(1,a-1))),this.mouse.clicked=!1}},Np=new R(.47,.65,1),Pp=new R(.75,.85,1),Fp=new R(.012,.014,.035),Ip=new R(.04,.05,.1),Lp=new R(1,.45,.15),Rp=new R(.28,.36,.55);function zp(){let e=document.createElement(`canvas`);e.width=32,e.height=32;let t=e.getContext(`2d`);t.fillStyle=`rgba(0,0,0,0)`,t.fillRect(0,0,32,32),t.fillStyle=`rgba(255, 236, 170, 0.45)`,t.fillRect(3,3,26,26),t.fillStyle=`rgba(255, 244, 200, 0.9)`,t.fillRect(6,6,20,20),t.fillStyle=`#fff9d8`,t.fillRect(8,8,16,16);let n=new na(e);return n.magFilter=f,n.minFilter=f,n.colorSpace=``,n}function Bp(){let e=document.createElement(`canvas`);e.width=32,e.height=32;let t=e.getContext(`2d`);t.fillStyle=`#d9dde6`,t.fillRect(8,8,16,16),t.fillStyle=`#b8bcc8`,t.fillRect(11,10,4,4),t.fillRect(17,15,5,4),t.fillRect(12,18,3,3),t.fillStyle=`#eef0f5`,t.fillRect(9,9,3,2);let n=new na(e);return n.magFilter=f,n.minFilter=f,n.colorSpace=``,n}var Vp=`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`,Hp=`
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uVoid; uniform vec3 uSunset; uniform float uSunsetStrength; uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float t = smoothstep(0.0, 0.42, d.y);
  vec3 col = mix(uHorizon, uTop, t);
  float below = smoothstep(0.0, -0.08, d.y);
  col = mix(col, uVoid, below);
  // sunset/sunrise glow around the sun's azimuth, hugging the horizon
  vec3 sh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z + 0.0001));
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z + 0.0001)), sh), 0.0);
  float band = exp(-abs(d.y) * 7.0);
  col = mix(col, uSunset, uSunsetStrength * band * (0.35 + 0.65 * pow(az, 3.0)));
  gl_FragColor = vec4(col, 1.0);
}`,Up=class{constructor(e,t){this.scene=e,this.camera=t,this.time=Ll,this.dayLength=720,this.paused=!1,this.skyLight=1,this.skyTint=new I(1,1,1),this.fogColor=new R,this.fogNear=100,this.fogFar=150,this.sunDir=new I(0,1,0),this.dayFactor=1,this.domeMat=new _a({uniforms:{uTop:{value:new R},uHorizon:{value:new R},uVoid:{value:new R},uSunset:{value:Lp.clone()},uSunsetStrength:{value:0},uSunDir:{value:new I(1,0,0)}},vertexShader:Vp,fragmentShader:Hp,side:1,depthWrite:!1,depthTest:!1}),this.dome=new mi(new ca(480,24,12),this.domeMat),this.dome.renderOrder=-10,this.dome.frustumCulled=!1,e.add(this.dome),this.celestial=new wn,this.celestial.renderOrder=-9,e.add(this.celestial);let n=new ni({map:zp(),transparent:!0,depthWrite:!1,depthTest:!0,fog:!1});this.sun=new mi(new sa(105,105),n),this.sun.position.set(0,0,-440),this.sun.renderOrder=-9,this.celestial.add(this.sun);let r=new ni({map:Bp(),transparent:!0,depthWrite:!1,depthTest:!0,fog:!1});this.moon=new mi(new sa(70,70),r),this.moon.position.set(0,0,440),this.moon.rotation.y=Math.PI,this.moon.renderOrder=-9,this.celestial.add(this.moon);let i=new Float32Array(2700);for(let e=0;e<900;e++){let t=new I(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize().multiplyScalar(450);i[e*3]=t.x,i[e*3+1]=t.y,i[e*3+2]=t.z}let a=new Er;a.setAttribute(`position`,new dr(i,3)),this.starMat=new Ji({color:16777215,size:1.8,sizeAttenuation:!1,transparent:!0,opacity:0,depthWrite:!1,depthTest:!0,fog:!1}),this.stars=new $i(a,this.starMat),this.stars.renderOrder=-9,this.celestial.add(this.stars),this.buildClouds(),this.update(0,new I,7)}buildClouds(){let e=new ku(99),t=new Uint8Array(4096);for(let n=0;n<64;n++)for(let r=0;r<64;r++){let i=n/64*Math.PI*2,a=r/64*Math.PI*2,o=e.noise3(Math.cos(i)*2.2,Math.sin(i)*2.2+Math.cos(a)*2.2,Math.sin(a)*2.2)*.7+e.noise3(Math.cos(i)*5,Math.sin(i)*5+Math.cos(a)*5,Math.sin(a)*5)*.3;t[n*64+r]=+(o>.18)}let n=[],r=[],i=[],a=[.9,.9,1,.7,.8,.8],o=(e,t,o,s,c,l,u)=>{let d=[[[s,t,l],[s,t,o],[s,c,o],[s,c,l]],[[e,t,o],[e,t,l],[e,c,l],[e,c,o]],[[e,c,l],[s,c,l],[s,c,o],[e,c,o]],[[s,t,l],[e,t,l],[e,t,o],[s,t,o]],[[e,t,l],[s,t,l],[s,c,l],[e,c,l]],[[s,t,o],[e,t,o],[e,c,o],[s,c,o]]];for(let e=0;e<6;e++){if(u&1<<e)continue;let t=n.length/3;for(let t of d[e])n.push(t[0],t[1],t[2]),r.push(a[e],a[e],a[e]);i.push(t,t+1,t+2,t,t+2,t+3)}};for(let e=0;e<4;e++){let n=(e&1)*768,r=(e>>1)*768;for(let e=0;e<64;e++)for(let i=0;i<64;i++){if(!t[e*64+i])continue;let a=(e,n)=>t[(e+64)%64*64+(n+64)%64],s=0;a(e+1,i)&&(s|=1),a(e-1,i)&&(s|=2),a(e,i+1)&&(s|=16),a(e,i-1)&&(s|=32),o(n+e*12,0,r+i*12,n+e*12+12,4,r+i*12+12,s)}}let s=new Er;s.setAttribute(`position`,new mr(n,3)),s.setAttribute(`color`,new mr(r,3)),s.setIndex(i),this.cloudMat=new ni({vertexColors:!0,transparent:!0,opacity:.85,fog:!1,depthWrite:!1,side:2}),this.clouds=new mi(s,this.cloudMat),this.clouds.renderOrder=5,this.clouds.frustumCulled=!1,this.cloudPeriod=768,this.cloudOffset=0,this.scene.add(this.clouds)}advance(e){this.paused||(this.time=(this.time+e/this.dayLength)%1)}clockString(){let e=Math.floor(this.time*24),t=Math.floor((this.time*24-e)*60);return`${String(e).padStart(2,`0`)}:${String(t).padStart(2,`0`)}`}update(e,t,n,r=!1){this.advance(e),this.cloudOffset+=e*.6;let i=(this.time-.25)*Math.PI*2;this.sunDir.set(Math.cos(i),Math.sin(i),0);let a=this.sunDir.y,o=Al(-.12,.22,a);this.dayFactor=o;let s=(1-Al(0,.22,Math.abs(a)))*(a>-.15);this.skyLight=kl(.27,1,o),this.skyTint.set(kl(.55,1,o),kl(.62,1,o),kl(1,1,o));let c=Fp.clone().lerp(Np,o),l=Ip.clone().lerp(Pp,o);l.lerp(Lp,s*.35);let u=Fp.clone().lerp(Rp,o);this.domeMat.uniforms.uTop.value.copy(c),this.domeMat.uniforms.uHorizon.value.copy(l),this.domeMat.uniforms.uVoid.value.copy(u),this.domeMat.uniforms.uSunsetStrength.value=s*.9,this.domeMat.uniforms.uSunDir.value.copy(this.sunDir),this.fogColor.copy(l);let d=n*16;this.fogNear=d*.6,this.fogFar=d*.98,r&&(this.fogColor.set(.02,.06,.3),this.fogNear=1,this.fogFar=18),this.dome.position.copy(t),this.celestial.position.copy(t),this.celestial.quaternion.setFromAxisAngle(new I(0,0,1),i);let f=new Et().setFromAxisAngle(new I(0,1,0),-Math.PI/2);this.celestial.quaternion.multiply(f),this.starMat.opacity=(1-o)*.9,this.stars.visible=o<.99,this.sun.material.opacity=1,this.moon.material.opacity=kl(1,.15,o);let p=this.cloudPeriod,m=this.cloudOffset+Math.floor((t.x-this.cloudOffset)/p)*p-p,h=Math.floor(t.z/p)*p-p;this.clouds.position.set(m,140,h);let g=new R(.08,.09,.14).lerp(new R(1,1,1),o).lerp(Lp,s*.5);this.cloudMat.color.copy(g)}},Wp=[[.1,0,.1,.9,.8,.9]],Gp=[[.3125,0,.3125,.6875,.5625,.6875]],Kp=[[.3125,.375,.3125,.6875,1,.6875]],qp=[[.4375,0,.4375,.5625,.625,.5625]],Jp=[[0,0,0,1,.125,1]],Yp=[[0,.25,0,1,.75,1]],Xp=[[0,0,0,1,1,1]],Zp=[[0,0,0,1,1,1]];function Qp(e,t,n,r,i){if(i.boxes.length)return i.boxes;switch(i.shape){case U.CROSS:return Wp;case U.LANTERN:return G[e.getBlock(t,n-1,r)].solid?Gp:Kp;case U.TORCH:return qp;case U.RAIL:return Jp;case U.WALL_SIGN:return Yp;case U.DOOR:case U.SALOON_DOOR:return Xp;default:return Zp}}function $p(e,t,n,r,i,a,o){let s=-1/0,c=1/0,l=-1,u=[[e,r,o[0],o[3],1,0],[t,i,o[1],o[4],3,2],[n,a,o[2],o[5],5,4]];for(let[e,t,n,r,i,a]of u){if(Math.abs(t)<1e-9){if(e<n||e>r)return null;continue}let o=(n-e)/t,u=(r-e)/t,d=i;if(o>u){let e=o;o=u,u=e,d=a}if(o>s&&(s=o,l=d),u<c&&(c=u),s>c)return null}return c<0?null:{t:Math.max(s,0),face:l}}function em(e,t,n,r=Fl,i=!1){let a=Math.floor(t.x),o=Math.floor(t.y),s=Math.floor(t.z),c=Math.sign(n.x),l=Math.sign(n.y),u=Math.sign(n.z),d=c===0?1/0:Math.abs(1/n.x),f=l===0?1/0:Math.abs(1/n.y),p=u===0?1/0:Math.abs(1/n.z),m=c>0?(a+1-t.x)*d:c<0?(t.x-a)*d:1/0,h=l>0?(o+1-t.y)*f:l<0?(t.y-o)*f:1/0,g=u>0?(s+1-t.z)*p:u<0?(t.z-s)*p:1/0,_=0;for(let v=0;v<200&&_<=r;v++){let v=e.getBlock(a,o,s);if(v!==W.AIR&&(i||v!==W.WATER)){let i=G[v],c=Qp(e,a,o,s,i),l=null;for(let e of c){let i=[a+e[0],o+e[1],s+e[2],a+e[3],o+e[4],s+e[5]],c=$p(t.x,t.y,t.z,n.x,n.y,n.z,i);c&&c.t<=r&&(!l||c.t<l.t)&&(l=c)}if(l){let e=t.x+n.x*l.t,r=t.y+n.y*l.t,i=t.z+n.z*l.t;return{x:a,y:o,z:s,id:v,face:l.face,dist:l.t,point:new I(e,r,i)}}}m<h&&m<g?(a+=c,_=m,m+=d):h<g?(o+=l,_=h,h+=f):(s+=u,_=g,g+=p)}return null}var tm=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];function nm(e,t){if(G[e].shape===U.SLAB){let n={[W.OAK_SLAB]:W.OAK_SLAB_TOP,[W.SPRUCE_SLAB]:W.SPRUCE_SLAB_TOP,[W.STONE_BRICK_SLAB]:W.STONE_BRICK_SLAB_TOP}[e];if(!n)return e;if(t.face===3||t.face!==2&&t.point.y-Math.floor(t.point.y)>.5)return n}return e}function rm(e,t,n,r,i){let a=G[e];if(!a.solid)return!1;for(let e of a.boxes){let a=new yf(t+e[0],n+e[1],r+e[2],t+e[3],n+e[4],r+e[5]);for(let e of i)if(a.intersects(e))return!0}return!1}function im(e,t,n,r){return G[e.getBlock(t,n,r)].replaceable}var am=class{constructor(e){let t=new Er,n=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],r=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],i=[];for(let[e,t]of r)i.push(...n[e],...n[t]);t.setAttribute(`position`,new mr(i,3)),this.unit=i,this.mesh=new qi(t,new Fi({color:0,transparent:!0,opacity:.4,depthTest:!0})),this.mesh.renderOrder=20,this.mesh.visible=!1,e.add(this.mesh)}update(e,t){if(!t){this.mesh.visible=!1;return}let n=G[t.id],r=Qp(e,t.x,t.y,t.z,n),i=[1,1,1,0,0,0];for(let e of r)i[0]=Math.min(i[0],e[0]),i[1]=Math.min(i[1],e[1]),i[2]=Math.min(i[2],e[2]),i[3]=Math.max(i[3],e[3]),i[4]=Math.max(i[4],e[4]),i[5]=Math.max(i[5],e[5]);let a=.003;this.mesh.position.set(t.x+i[0]-a,t.y+i[1]-a,t.z+i[2]-a),this.mesh.scale.set(i[3]-i[0]+2*a,i[4]-i[1]+2*a,i[5]-i[2]+2*a),this.mesh.visible=!0}},om=class{constructor(e,t,n,r){this.tileUV=n,this.destroyTiles=r;let i=new oa(1.004,1.004,1.004);this.geo=i;let a=new ni({map:t,transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});a.alphaTest=.05,this.mesh=new mi(i,a),this.mesh.renderOrder=15,this.mesh.visible=!1,e.add(this.mesh),this.stage=-1,this.baseUV=Float32Array.from(i.attributes.uv.array)}setStage(e){if(e===this.stage)return;this.stage=e;let[t,n,r]=this.tileUV(this.destroyTiles[e]),i=this.geo.attributes.uv;for(let e=0;e<i.count;e++){let a=+(this.baseUV[e*2]>.5),o=this.baseUV[e*2+1]>.5?0:1;i.setXY(e,t+a*r,n+o*r)}i.needsUpdate=!0}show(e,t){if(!e||t<=0){this.mesh.visible=!1;return}this.setStage(Math.min(9,Math.floor(t*10))),this.mesh.position.set(e.x+.5,e.y+.5,e.z+.5),this.mesh.visible=!0}},sm=class{constructor(e=36){this.slots=Array(e).fill(null),this.selected=0}get held(){return this.slots[this.selected]}add(e,t=1){for(let n=0;n<this.slots.length&&t>0;n++){let r=this.slots[n];if(r&&r.id===e&&r.count<64){let e=Math.min(64-r.count,t);r.count+=e,t-=e}}for(let n=0;n<this.slots.length&&t>0;n++)if(!this.slots[n]){let r=Math.min(64,t);this.slots[n]={id:e,count:r},t-=r}return t===0}consume(e,t=1){let n=this.slots[e];return n?(n.count-=t,n.count<=0&&(this.slots[e]=null),!0):!1}set(e,t,n){this.slots[e]=t?{id:t,count:n}:null}},cm=new Map;function lm(e){if(cm.has(e))return cm.get(e);let t=G[e],n=new Er,r=[],i=[],a=[],o=.25,s=t.icon===`flat`,c=t.icon===`slab`?o*.5:o,l=[{n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],uv:(e,t,n)=>[1-n,1-t]},{n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],uv:(e,t,n)=>[n,1-t]},{n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],uv:(e,t,n)=>[e,n]},{n:[0,-1,0],v:[[1,0,1],[0,0,1],[0,0,0],[1,0,0]],uv:(e,t,n)=>[1-e,n]},{n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],uv:(e,t,n)=>[e,1-t]},{n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],uv:(e,t,n)=>[1-e,1-t]}];if(s){let[e,n,s]=vu(t.tex[0]),c=[[0,0,.5],[1,0,.5],[1,1,.5],[0,1,.5]];for(let t=0;t<2;t++){let l=r.length/3,u=t===0?[0,1,2,3]:[3,2,1,0];for(let t of u){let a=c[t];r.push((a[0]-.5)*o,a[1]*o,(a[2]-.5)*o*.1),i.push(e+a[0]*s,n+(1-a[1])*s)}a.push(l,l+1,l+2,l,l+2,l+3)}}else for(let e=0;e<6;e++){let n=l[e],[s,u,d]=vu(t.tex[e]),f=r.length/3;for(let e of n.v){r.push((e[0]-.5)*o,e[1]*c,(e[2]-.5)*o);let[t,a]=n.uv(e[0],e[1],e[2]);i.push(s+t*d,u+a*d)}a.push(f,f+1,f+2,f,f+2,f+3)}return n.setAttribute(`position`,new mr(r,3)),n.setAttribute(`uv`,new mr(i,2)),n.setIndex(a),cm.set(e,n),n}var um=class{constructor(e,t,n){this.scene=e,this.world=t,this.material=n,this.items=[],this.group=new wn,e.add(this.group)}spawn(e,t,n,r,i=1,a=null){let o=new mi(lm(e),this.material.clone());o.position.set(t,n,r),this.group.add(o);let s={id:e,count:i,mesh:o,x:t,y:n,z:r,age:0,vx:a?a.x:(Math.random()-.5)*.1,vy:a?a.y:.15,vz:a?a.z:(Math.random()-.5)*.1,pickup:!1};return this.items.push(s),s}tick(e,t){let n=[];for(let r=this.items.length-1;r>=0;r--){let i=this.items[r];if(i.age++,i.pickup){let e=t.x-i.x,a=t.y+.9-i.y,o=t.z-i.z;i.x+=e*.5,i.y+=a*.5,i.z+=o*.5,(e*e+a*a+o*o<.1||i.age>i.pickupAge+8)&&(n.push(i),this.group.remove(i.mesh),i.mesh.material.dispose(),this.items.splice(r,1));continue}let a=new yf(i.x-.125,i.y,i.z-.125,i.x+.125,i.y+.25,i.z+.125),o=Ef(this.world,a,i.vx,i.vy,i.vz,0,!1);i.x=a.x0+.125,i.y=a.y0,i.z=a.z0+.125,o.hitY?i.vy=0:i.vy-=.04,i.vy*=.98;let s=o.hitY&&o.oy<0?.6:.98;if(i.vx*=s,i.vz*=s,this.world.getBlock(Math.floor(i.x),Math.floor(i.y),Math.floor(i.z))===W.WATER&&(i.vy+=.06,i.vy*=.8),G[this.world.getBlock(Math.floor(i.x),Math.floor(i.y+.1),Math.floor(i.z))].opaque&&(i.y+=1),i.age>10){let t=e;i.x+.125>t.x0-1&&i.x-.125<t.x1+1&&i.y+.25>t.y0-.5&&i.y<t.y1+.5&&i.z+.125>t.z0-1&&i.z-.125<t.z1+1&&(i.pickup=!0,i.pickupAge=i.age)}i.age>6e3&&(this.group.remove(i.mesh),this.items.splice(r,1))}return n}render(e,t,n){for(let e of this.items){let r=Math.sin(t*2+e.age*.05)*.03+.1;e.mesh.position.set(e.x,e.y+r,e.z),e.mesh.rotation.y=t*1.5+e.age*.01;let i=n(e.x,e.y+.3,e.z);e.mesh.material.uniforms.uLight.value.set(i[0],i[1])}}},dm=3e3,fm=`
attribute float aSize;
attribute vec4 aUV;
attribute vec3 aColor;
attribute float aAlpha;
attribute vec2 aLight;
uniform float uScale;
varying vec4 vUV;
varying vec3 vColor;
varying float vAlpha;
varying vec2 vLight;
varying float vDist;
void main() {
  vUV = aUV; vColor = aColor; vAlpha = aAlpha; vLight = aLight;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_PointSize = aSize * uScale / max(vDist, 0.1);
  gl_Position = projectionMatrix * mv;
}`,pm=`
uniform sampler2D map;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec4 vUV; varying vec3 vColor; varying float vAlpha; varying vec2 vLight; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec3 col;
  float a = vAlpha;
  if (vUV.w < 0.5) {
    vec4 tex = texture2D(map, vUV.xy + gl_PointCoord * vUV.z);
    if (tex.a < 0.5) discard;
    col = tex.rgb;
  } else {
    col = vColor;
  }
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  col *= light;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, a);
}`,mm=class{constructor(e,t,n){this.world=t,this.count=0,this.pos=new Float32Array(dm*3),this.vel=new Float32Array(dm*3),this.size=new Float32Array(dm),this.uv=new Float32Array(dm*4),this.color=new Float32Array(dm*3),this.alpha=new Float32Array(dm),this.light=new Float32Array(dm*2),this.life=new Float32Array(dm),this.maxLife=new Float32Array(dm),this.kind=new Uint8Array(dm);let r=new Er;r.setAttribute(`position`,new dr(this.pos,3)),r.setAttribute(`aSize`,new dr(this.size,1)),r.setAttribute(`aUV`,new dr(this.uv,4)),r.setAttribute(`aColor`,new dr(this.color,3)),r.setAttribute(`aAlpha`,new dr(this.alpha,1)),r.setAttribute(`aLight`,new dr(this.light,2)),r.setDrawRange(0,0),this.geo=r,this.mat=new _a({uniforms:{map:{value:n},uScale:{value:500},uSkyLight:Bd.uSkyLight,uSkyTint:Bd.uSkyTint,uFogColor:Bd.uFogColor,uFogNear:Bd.uFogNear,uFogFar:Bd.uFogFar,uFlash:Bd.uFlash},vertexShader:fm,fragmentShader:pm,transparent:!0,depthWrite:!1}),this.points=new $i(r,this.mat),this.points.frustumCulled=!1,this.points.renderOrder=12,e.add(this.points)}setCamera(e,t){this.mat.uniforms.uScale.value=t/(2*Math.tan(e.fov*Math.PI/180/2))}spawn(e,t,n,r,i,a,o,s,c,l,u,d){if(this.count>=dm)return;let f=this.count++;this.pos[f*3]=e,this.pos[f*3+1]=t,this.pos[f*3+2]=n,this.vel[f*3]=r,this.vel[f*3+1]=i,this.vel[f*3+2]=a,this.size[f]=o,this.uv.set(l,f*4),this.color.set(u,f*3),this.alpha[f]=d;let p=this.world.sampleLight(e,t,n);this.light[f*2]=p[0],this.light[f*2+1]=p[1],this.life[f]=s,this.maxLife[f]=s,this.kind[f]=c}blockBreak(e,t,n,r){let i=G[r],[a,o,s]=vu(i.tex[Math.random()<.5?2:4]);for(let r=0;r<3;r++)for(let i=0;i<3;i++)for(let c=0;c<3;c++){let l=e+(r+.5)/3,u=t+(i+.5)/3,d=n+(c+.5)/3,f=(l-e-.5)*2+(Math.random()-.5)*.6,p=(u-t-.5)*2+Math.random()*3+1,m=(d-n-.5)*2+(Math.random()-.5)*.6,h=s/4,g=[a+Math.floor(Math.random()*3)*h,o+Math.floor(Math.random()*3)*h,h,0];this.spawn(l,u,d,f,p,m,.12+Math.random()*.08,.7+Math.random()*.6,0,g,[1,1,1],1)}}blockHit(e,t){let n=G[t],[r,i,a]=vu(n.tex[2]),o=a/4,s=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][e.face],c=e.point,l=[r+Math.floor(Math.random()*3)*o,i+Math.floor(Math.random()*3)*o,o,0];this.spawn(c.x+s[0]*.05,c.y+s[1]*.05,c.z+s[2]*.05,s[0]*1.5+(Math.random()-.5),s[1]*1.5+Math.random()*1.5+.5,s[2]*1.5+(Math.random()-.5),.1,.5,0,l,[1,1,1],1)}smoke(e,t,n,r=!1){let i=.35+Math.random()*.3;this.spawn(e+(Math.random()-.5)*.3,t,n+(Math.random()-.5)*.3,(Math.random()-.5)*.2+.15,.5+Math.random()*.4,(Math.random()-.5)*.2,r?.9:.5,r?3.5:3,1,[0,0,0,1],[i,i,i],.55)}dust(e,t,n){this.spawn(e,t+.1+Math.random()*.4,n,.8+Math.random()*.8,.05+Math.random()*.1,(Math.random()-.5)*.4,.18,2.5+Math.random()*2,2,[0,0,0,1],[.78,.66,.48],.35)}update(e){let t=this.world;for(let n=0;n<this.count;n++){if(this.life[n]-=e,this.life[n]<=0){this.remove(n),n--;continue}let r=this.kind[n],i=this.vel[n*3],a=this.vel[n*3+1],o=this.vel[n*3+2];if(r===0){a-=16*e,i*=.98,o*=.98;let r=this.pos[n*3]+i*e,s=this.pos[n*3+1]+a*e,c=this.pos[n*3+2]+o*e;G[t.getBlock(Math.floor(r),Math.floor(s),Math.floor(c))].solid&&(G[t.getBlock(Math.floor(this.pos[n*3]),Math.floor(s),Math.floor(this.pos[n*3+2]))].solid?(a=0,s=Math.ceil(s)+.01,i*=.6,o*=.6):(i=0,o=0,r=this.pos[n*3],c=this.pos[n*3+2])),this.pos[n*3]=r,this.pos[n*3+1]=s,this.pos[n*3+2]=c}else if(r===1){i+=(Math.random()-.5)*.4*e,o+=(Math.random()-.5)*.4*e,this.pos[n*3]+=i*e,this.pos[n*3+1]+=a*e,this.pos[n*3+2]+=o*e;let t=this.life[n]/this.maxLife[n];this.alpha[n]=.5*Math.min(1,t*3)*t,this.size[n]+=e*.35}else{this.pos[n*3]+=i*e,this.pos[n*3+1]+=a*e,this.pos[n*3+2]+=o*e;let t=this.life[n]/this.maxLife[n];this.alpha[n]=.3*Math.sin(t*Math.PI)}this.vel[n*3]=i,this.vel[n*3+1]=a,this.vel[n*3+2]=o}this.geo.setDrawRange(0,this.count);for(let e of[`position`,`aSize`,`aUV`,`aColor`,`aAlpha`,`aLight`])this.geo.attributes[e].needsUpdate=!0}remove(e){let t=--this.count;if(e===t)return;let n=(n,r)=>{for(let i=0;i<r;i++)n[e*r+i]=n[t*r+i]};n(this.pos,3),n(this.vel,3),n(this.size,1),n(this.uv,4),n(this.color,3),n(this.alpha,1),n(this.light,2),n(this.life,1),n(this.maxLife,1),n(this.kind,1)}},hm=class{constructor(){this.ctx=null,this.enabled=!0,this.master=null,this.listener={x:0,y:0,z:0,yaw:0},this.noiseBuffer=null,this.ambience=null,this.lastBird=0,this.lastCricket=0,this.piano={next:0,step:0,gain:null},this.trainGain=null}init(){if(this.ctx)return;let e=window.AudioContext||window.webkitAudioContext;if(!e)return;this.ctx=new e,this.master=this.ctx.createGain(),this.master.gain.value=this.enabled?.5:0,this.master.connect(this.ctx.destination);let t=this.ctx.sampleRate*2;this.noiseBuffer=this.ctx.createBuffer(1,t,this.ctx.sampleRate);let n=this.noiseBuffer.getChannelData(0);for(let e=0;e<t;e++)n[e]=Math.random()*2-1;this.startAmbience()}resume(){this.ctx||this.init(),this.ctx&&this.ctx.state===`suspended`&&this.ctx.resume()}toggle(){this.enabled=!this.enabled,this.master&&(this.master.gain.value=this.enabled?.5:0)}setListener(e,t,n,r){this.listener.x=e,this.listener.y=t,this.listener.z=n,this.listener.yaw=r}spatial(e,t=24){if(!e)return[1,0];let n=e.x-this.listener.x,r=e.y-this.listener.y,i=e.z-this.listener.z,a=Math.sqrt(n*n+r*r+i*i);if(a>t)return[0,0];let o=(1-a/t)**1.5,s=Math.cos(this.listener.yaw),c=-Math.sin(this.listener.yaw);return[o,a>.01?Math.max(-1,Math.min(1,(n*s+i*c)/a))*.7:0]}out(e,t,n){let r=this.ctx.createGain();r.gain.value=e;let i=r;if(this.ctx.createStereoPanner){let e=this.ctx.createStereoPanner();e.pan.value=t,r.connect(e),i=e}return i.connect(this.master),r}noise(e,t,n,r,i,a,o=24,s=.002,c=null){if(!this.ctx||!this.enabled)return;let[l,u]=this.spatial(a,o);if(l<=0)return;let d=this.ctx.currentTime,f=this.ctx.createBufferSource();f.buffer=this.noiseBuffer,f.loop=!0,f.playbackRate.value=.8+Math.random()*.4;let p=this.ctx.createBiquadFilter();p.type=t,p.frequency.value=n,p.Q.value=r,c&&p.frequency.exponentialRampToValueAtTime(c,d+e);let m=this.out(0,u,d);m.gain.setValueAtTime(0,d),m.gain.linearRampToValueAtTime(i*l,d+s),m.gain.exponentialRampToValueAtTime(1e-4,d+e),f.connect(p),p.connect(m),f.start(d,Math.random()*1.5),f.stop(d+e+.05)}tone(e,t,n,r,i,a,o=24,s=.005,c=0){if(!this.ctx||!this.enabled)return null;let[l,u]=this.spatial(a,o);if(l<=0)return null;let d=this.ctx.currentTime,f=this.ctx.createOscillator();f.type=e,f.frequency.setValueAtTime(t,d),f.frequency.exponentialRampToValueAtTime(Math.max(20,n),d+r);let p=this.out(0,u,d);if(p.gain.setValueAtTime(0,d),p.gain.linearRampToValueAtTime(i*l,d+s),p.gain.exponentialRampToValueAtTime(1e-4,d+r),c){let e=this.ctx.createBiquadFilter();e.type=`lowpass`,e.frequency.value=c,f.connect(e),e.connect(p)}else f.connect(p);return f.start(d),f.stop(d+r+.05),f}step(e,t=null,n=1){switch(e){case`grass`:this.noise(.09,`lowpass`,900,.8,.35*n,t);break;case`gravel`:case`sand`:this.noise(.11,`lowpass`,1400,.6,.33*n,t),this.noise(.05,`highpass`,2500,.5,.08*n,t);break;case`wood`:this.noise(.07,`bandpass`,500,1.5,.45*n,t),this.tone(`sine`,180,120,.06,.15*n,t);break;case`stone`:this.noise(.06,`bandpass`,2200,1.2,.3*n,t);break;case`metal`:this.noise(.06,`bandpass`,3200,3,.25*n,t),this.tone(`sine`,900,700,.08,.05*n,t);break;case`glass`:this.noise(.05,`highpass`,3e3,1,.2*n,t);break;case`cloth`:case`snow`:this.noise(.09,`lowpass`,600,.7,.2*n,t);break;default:this.noise(.08,`lowpass`,1200,.8,.3*n,t)}}swim(e=null){this.noise(.25,`lowpass`,700,.5,.25,e)}hit(e,t=null){this.step(e,t,.6)}breakBlock(e,t=null){switch(e){case`grass`:this.noise(.2,`lowpass`,1100,.7,.7,t);break;case`gravel`:case`sand`:this.noise(.22,`lowpass`,1500,.6,.7,t);break;case`wood`:this.noise(.18,`bandpass`,600,1.2,.8,t),this.tone(`triangle`,220,90,.15,.3,t);break;case`stone`:this.noise(.2,`bandpass`,1800,.9,.7,t),this.tone(`sine`,300,120,.12,.2,t);break;case`glass`:this.noise(.25,`highpass`,2600,1,.7,t),this.tone(`sine`,3e3,1800,.15,.1,t);break;case`metal`:this.noise(.18,`bandpass`,3e3,3,.5,t),this.tone(`sine`,1200,600,.2,.15,t);break;default:this.noise(.2,`lowpass`,1e3,.8,.6,t)}}placeBlock(e,t=null){this.noise(.09,`lowpass`,e===`stone`?1800:900,.8,.5,t),this.tone(`sine`,e===`wood`?200:160,90,.09,.3,t)}pop(e=null){this.tone(`sine`,500,1100,.09,.3,e,24,.003)}hurt(){this.tone(`sawtooth`,220,110,.22,.35,null,24,.005,900),this.noise(.15,`lowpass`,500,.5,.3,null)}click(){this.tone(`square`,1e3,900,.03,.08,null)}splash(e=null){this.noise(.35,`lowpass`,1200,.5,.6,e,24,.01,300)}npcGrunt(e,t=1){this.tone(`sine`,190*t,130*t,.25,.35,e,12,.02,700),this.tone(`sawtooth`,190*t,130*t,.25,.06,e,12,.02,600)}horseNeigh(e){if(!this.ctx||!this.enabled)return;let[t,n]=this.spatial(e,30);if(t<=0)return;let r=this.ctx.currentTime,i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.setValueAtTime(900,r),i.frequency.linearRampToValueAtTime(1100,r+.15),i.frequency.exponentialRampToValueAtTime(380,r+.9);let a=this.ctx.createOscillator();a.frequency.value=22;let o=this.ctx.createGain();o.gain.value=60,a.connect(o),o.connect(i.frequency);let s=this.ctx.createBiquadFilter();s.type=`lowpass`,s.frequency.value=1400;let c=this.out(0,n,r);c.gain.setValueAtTime(0,r),c.gain.linearRampToValueAtTime(.25*t,r+.05),c.gain.exponentialRampToValueAtTime(1e-4,r+.95),i.connect(s),s.connect(c),i.start(r),a.start(r),i.stop(r+1),a.stop(r+1)}cowMoo(e){this.tone(`sawtooth`,150,95,.9,.25,e,30,.08,500),this.tone(`sine`,150,95,.9,.2,e,30,.08)}pigOink(e){this.tone(`sawtooth`,260,170,.18,.2,e,20,.01,900)}chickenCluck(e){this.tone(`square`,900,700,.06,.08,e,16,.003,2500),setTimeout(()=>this.tone(`square`,850,650,.05,.06,e,16,.003,2500),90)}trainWhistle(e){if(!this.ctx||!this.enabled)return;let[t,n]=this.spatial(e,220);if(t<=0)return;let r=this.ctx.currentTime;for(let e of[311,370,466]){let i=this.ctx.createOscillator();i.type=`triangle`,i.frequency.value=e;let a=this.ctx.createOscillator();a.frequency.value=5.5;let o=this.ctx.createGain();o.gain.value=3,a.connect(o),o.connect(i.frequency);let s=this.out(0,n,r);s.gain.setValueAtTime(0,r),s.gain.linearRampToValueAtTime(.14*t,r+.25),s.gain.setValueAtTime(.14*t,r+1.3),s.gain.exponentialRampToValueAtTime(1e-4,r+1.9),i.connect(s),i.start(r),a.start(r),i.stop(r+2),a.stop(r+2)}this.noise(1.8,`bandpass`,1600,1.5,.05*t,null,1,.3)}trainChuff(e,t){this.noise(.12,`lowpass`,500+t*40,.6,.35,e,120,.005)}loopStart(e,t={}){if(!this.ctx)return null;if(this.loops||(this.loops={}),this.loops[e])return this.loops[e];let n=this.ctx.currentTime,r;t.kind===`osc`?(r=this.ctx.createOscillator(),r.type=t.type||`sawtooth`,r.frequency.value=t.freq||60):(r=this.ctx.createBufferSource(),r.buffer=this.noiseBuffer,r.loop=!0,r.playbackRate.value=t.rate||1);let i=this.ctx.createBiquadFilter();i.type=t.filter||`lowpass`,i.frequency.value=t.cutoff||500,i.Q.value=t.q??.7;let a=this.ctx.createGain();a.gain.value=0;let o=a,s=null;this.ctx.createStereoPanner&&(s=this.ctx.createStereoPanner(),a.connect(s),o=s),o.connect(this.master),r.connect(i),i.connect(a),r.start(n,t.kind===`osc`?0:Math.random());let c={src:r,filter:i,gain:a,pan:s,targetGain:t.gain||0};return a.gain.setTargetAtTime(this.enabled?c.targetGain:0,n,.3),this.loops[e]=c,c}loopSet(e,{gain:t,cutoff:n,freq:r,pan:i,rate:a}={},o=.25){let s=this.loops&&this.loops[e];if(!s||!this.ctx)return;let c=this.ctx.currentTime;t!==void 0&&(s.targetGain=t,s.gain.gain.setTargetAtTime(this.enabled?Math.max(0,t):0,c,o)),n!==void 0&&s.filter.frequency.setTargetAtTime(Math.max(20,n),c,o),r!==void 0&&s.src.frequency&&s.src.frequency.setTargetAtTime(Math.max(1,r),c,o),a!==void 0&&s.src.playbackRate&&s.src.playbackRate.setTargetAtTime(Math.max(.05,a),c,o),i!==void 0&&s.pan&&s.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,i)),c,o)}loopStop(e,t=.6){let n=this.loops&&this.loops[e];if(!n||!this.ctx)return;let r=this.ctx.currentTime;n.gain.gain.setTargetAtTime(0,r,t/3);try{n.src.stop(r+t+.2)}catch{}delete this.loops[e]}loopStopAll(e=.6){if(this.loops)for(let t of Object.keys(this.loops))this.loopStop(t,e)}spatialFor(e,t){let[n,r]=this.spatial(e,t);return{gain:n,pan:r}}boom(e,t=1){let n=e?60+t*120:1;this.noise(.9*t,`lowpass`,900*t,.6,.9,e,n,.01,60),this.tone(`sine`,90*Math.min(1.5,t),28,1.2*t,.7,e,n,.01),this.noise(.35,`bandpass`,2500,.8,.4,e,n,.005)}crack(e){this.noise(.12,`bandpass`,1400,1.5,.55,e,60,.003),this.tone(`triangle`,260,110,.14,.25,e,60,.003)}bell(e){if(!this.ctx||!this.enabled)return;let[t,n]=this.spatial(e,160);if(t<=0)return;let r=this.ctx.currentTime;for(let[e,i,a]of[[1,.5,3.5],[2.4,.25,2.2],[3.2,.12,1.4],[.5,.2,4]]){let o=this.ctx.createOscillator();o.type=`sine`,o.frequency.value=330*e;let s=this.out(0,n,r);s.gain.setValueAtTime(0,r),s.gain.linearRampToValueAtTime(i*.5*t,r+.01),s.gain.exponentialRampToValueAtTime(1e-4,r+a),o.connect(s),o.start(r),o.stop(r+a+.1)}}rumble(e,t=1){this.noise(1.5,`lowpass`,160,.5,.7*t,e,200,.2)}splashBig(e){this.noise(.8,`lowpass`,1800,.5,.8,e,80,.02,400),this.noise(.5,`highpass`,3e3,.5,.25,e,80,.01)}startAmbience(){if(!this.ctx)return;let e=this.ctx.createBufferSource();e.buffer=this.noiseBuffer,e.loop=!0;let t=this.ctx.createBiquadFilter();t.type=`lowpass`,t.frequency.value=260,t.Q.value=.4;let n=this.ctx.createGain();n.gain.value=.06;let r=this.ctx.createOscillator();r.frequency.value=.09;let i=this.ctx.createGain();i.gain.value=.035,r.connect(i),i.connect(n.gain),e.connect(t),t.connect(n),n.connect(this.master),e.start(),r.start(),this.ambience={gain:n},this.pianoGain=this.ctx.createGain(),this.pianoGain.gain.value=0,this.pianoGain.connect(this.master)}update(e,t,n,r){if(!this.ctx||!this.enabled)return;let i=this.ctx.currentTime;if(t>.6&&i-this.lastBird>4+Math.random()*9){this.lastBird=i;let e=2+Math.floor(Math.random()*4),t=2200+Math.random()*1500;for(let n=0;n<e;n++)setTimeout(()=>this.tone(`sine`,t*(1+Math.random()*.2),t*(.8+Math.random()*.4),.09,.05,null,1,.01),n*140)}if(t<.3&&i-this.lastCricket>1.5+Math.random()*2.5){this.lastCricket=i;for(let e=0;e<6;e++)setTimeout(()=>this.tone(`sine`,4300,4300,.03,.03,null,1,.003),e*95)}let a=n<30?(1-n/30)**1.3*.5:0;this.pianoGain.gain.setTargetAtTime(a,i,.3),a>.01&&i>=this.piano.next&&this.playPianoStep(i)}playPianoStep(e){let t=this.piano.step,n=[36,43,41,43,36,43,41,43,38,45,43,45,38,45,43,45],r=[[48,52,55],[50,53,57],[53,57,60],[55,59,62]],i=[67,69,70,72,74,72,70,69,67,64,62,60,62,64,67,69,72,74,76,74,72,70,69,67,69,70,72,74,72,69,67,64],a=e=>440*2**((e-69)/12),o=(t,n,r)=>{for(let i of[-.4,.4]){let o=this.ctx.createOscillator();o.type=`triangle`,o.frequency.value=a(t+i/12);let s=this.ctx.createGain();s.gain.setValueAtTime(n,e),s.gain.exponentialRampToValueAtTime(1e-4,e+r),o.connect(s),s.connect(this.pianoGain),o.start(e),o.stop(e+r+.02)}};if(t%2==0)o(n[t/2%n.length],.35,.35);else{let e=r[Math.floor(t/8)%r.length];for(let t of e)o(t,.12,.2)}Math.random()<.85&&o(i[t%i.length],.28,.3),this.piano.step=(t+1)%64,this.piano.next=e+.17857142857142858}};function gm(){let e=document.createElement(`canvas`);e.width=16,e.height=16;let t=e.getContext(`2d`);t.fillStyle=`#c69b74`,t.fillRect(0,0,16,16),t.fillStyle=`#b98a63`;for(let e=0;e<20;e++)t.fillRect(Math.floor(Math.random()*16),Math.floor(Math.random()*16),1,1);return t.fillStyle=`#4a6ea8`,t.fillRect(0,0,16,7),t.fillStyle=`#3d5c8c`,t.fillRect(0,5,16,2),Wd(e)}function _m(e){let t=G[e],n=new Er,r=[],i=[],a=[],o=[],s=t.icon===`flat`,c=t.icon===`slab`?.5:1,l=[{n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],uv:(e,t,n)=>[1-n,1-t]},{n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],uv:(e,t,n)=>[n,1-t]},{n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],uv:(e,t,n)=>[e,n]},{n:[0,-1,0],v:[[1,0,1],[0,0,1],[0,0,0],[1,0,0]],uv:(e,t,n)=>[1-e,n]},{n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],uv:(e,t,n)=>[e,1-t]},{n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],uv:(e,t,n)=>[1-e,1-t]}];if(s){let[e,n,s]=vu(t.tex[0]);for(let t=0;t<2;t++){let c=[[0,0,.5],[1,0,.5],[1,1,.5],[0,1,.5]],l=t?[3,2,1,0]:[0,1,2,3],u=r.length/3;for(let o of l){let l=c[o];r.push(l[0]-.5,l[1]-.5,0),a.push(0,0,t?-1:1),i.push(e+l[0]*s,n+(1-l[1])*s)}o.push(u,u+1,u+2,u,u+2,u+3)}}else for(let e=0;e<6;e++){let n=l[e],[s,u,d]=vu(t.tex[e]),f=r.length/3;for(let e of n.v){r.push(e[0]-.5,e[1]*c-.5,e[2]-.5),a.push(n.n[0],n.n[1],n.n[2]);let[t,o]=n.uv(e[0],e[1],e[2]);i.push(s+t*d,u+o*d)}o.push(f,f+1,f+2,f,f+2,f+3)}return n.setAttribute(`position`,new mr(r,3)),n.setAttribute(`normal`,new mr(a,3)),n.setAttribute(`uv`,new mr(i,2)),n.setIndex(o),n}var vm=class{constructor(e){this.scene=new Mn,this.camera=new Ha(70,1,.05,10),this.root=new wn,this.scene.add(this.root),this.blockMat=Ud(e),this.armMat=Ud(gm()),this.blockMesh=null,this.blockId=-1;let t=new oa(.25,.8,.25);t.translate(0,.4,0),this.arm=new mi(t,this.armMat),this.armGroup=new wn,this.armGroup.add(this.arm),this.root.add(this.armGroup),this.swing=0,this.swinging=!1,this.equip=1,this.lastId=-2,this.geoCache=new Map}resize(e,t){this.camera.aspect=e/t,this.camera.updateProjectionMatrix()}startSwing(){this.swinging||(this.swinging=!0,this.swing=0)}setFov(e){this.camera.fov=e,this.camera.updateProjectionMatrix()}update(e,t,n,r,i){if(t!==this.lastId&&(this.lastId=t,this.equip=0,this.blockMesh&&(this.root.remove(this.blockMesh),this.blockMesh=null),t)){let e=this.geoCache.get(t);e||(e=_m(t),this.geoCache.set(t,e)),this.blockMesh=new mi(e,this.blockMat),this.root.add(this.blockMesh)}this.equip=Math.min(1,this.equip+e*3.5),this.swinging&&(this.swing+=e*3.3,this.swing>=1&&(this.swing=0,this.swinging=!1)),this.blockMat.uniforms.uLight.value.set(n[0],n[1]),this.armMat.uniforms.uLight.value.set(n[0],n[1]);let a=this.swing,o=Math.sin(Math.sqrt(a)*Math.PI),s=Math.sin(a*Math.PI),c=1-this.equip,l=i?r.tx*1.5:0,u=i?r.ty*1.5:0;if(this.blockMesh){this.armGroup.visible=!1;let e=this.blockMesh,n=G[t];e.position.set(.56-.4*o+l,-.52+.2*Math.sin(Math.sqrt(a)*Math.PI*2)-c*.6+u,-.72-.2*s),e.rotation.set(0,Math.PI/4,0),e.rotateOnAxis(new I(0,0,1),-o*.6),e.rotateOnAxis(new I(1,0,0),-o*.4);let r=n.icon===`flat`?.45:.4;e.scale.set(r,r,r),n.icon===`flat`&&e.rotation.set(0,Math.PI/4+.3,0)}else{this.armGroup.visible=!0;let e=this.armGroup,t=new I(.62+l,-.72-c*.6+u,-.55),n=new I(.28-.35*o,-.28+.15*s-c*.6,-1-.1*s);e.position.copy(t);let r=n.clone().sub(t).normalize();e.quaternion.setFromUnitVectors(new I(0,1,0),r),e.rotateY(.6)}}},ym=240,bm=class{constructor(e){this.renderer=e,this.frameMs=new Float32Array(ym),this.jsMs=new Float32Array(ym),this.gpuMs=new Float32Array(ym),this.idx=0,this.count=0,this.lastFrameStart=0,this.longTasks=0,this.longTaskMs=0,this.counters={},this.net={bytesIn:0,bytesOut:0,msgsIn:0,msgsOut:0},this.loadTimeMs=0,this.gpuAvailable=!1,this.gpuLastMs=0,this._queries=[],this._setupGpuTimer(),this._setupLongTasks(),this._frameStartTime=0,this._lastDraw={calls:0,triangles:0,lines:0,points:0}}_setupGpuTimer(){try{let e=this.renderer.getContext(),t=e.getExtension(`EXT_disjoint_timer_query_webgl2`);if(!t||!(e instanceof WebGL2RenderingContext))return;this.gl=e,this.ext=t,this.gpuAvailable=!0}catch{this.gpuAvailable=!1}}_setupLongTasks(){try{if(typeof PerformanceObserver>`u`)return;let e=new PerformanceObserver(e=>{for(let t of e.getEntries())this.longTasks++,this.longTaskMs+=t.duration});e.observe({entryTypes:[`longtask`]}),this._obs=e}catch{}}beginFrame(e){if(this.renderer.info.autoReset=!1,this.renderer.info.reset(),this.lastFrameStart){let t=e-this.lastFrameStart;this.frameMs[this.idx]=t}if(this.lastFrameStart=e,this._frameStartTime=performance.now(),this.gpuAvailable){let e=this.gl,t=this.ext,n=e.getParameter(t.GPU_DISJOINT_EXT);for(let t=this._queries.length-1;t>=0;t--){let r=this._queries[t];e.getQueryParameter(r,e.QUERY_RESULT_AVAILABLE)&&(n||(this.gpuLastMs=e.getQueryParameter(r,e.QUERY_RESULT)/1e6),e.deleteQuery(r),this._queries.splice(t,1))}if(this._queries.length<4){let n=e.createQuery();e.beginQuery(t.TIME_ELAPSED_EXT,n),this._activeQuery=n}}}endRender(){this.gpuAvailable&&this._activeQuery&&(this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this._queries.push(this._activeQuery),this._activeQuery=null);let e=this.renderer.info.render;this._lastDraw={calls:e.calls,triangles:e.triangles,lines:e.lines,points:e.points}}endFrame(){this.jsMs[this.idx]=performance.now()-this._frameStartTime,this.gpuMs[this.idx]=this.gpuLastMs,this.idx=(this.idx+1)%ym,this.count++}setCounters(e){Object.assign(this.counters,e)}memoryMB(){let e=performance.memory;return e?{used:e.usedJSHeapSize/1048576,total:e.totalJSHeapSize/1048576,limit:e.jsHeapSizeLimit/1048576}:null}_stats(e){let t=Math.min(this.count,ym);if(t<2)return{avg:0,p95:0,max:0};let n=[];for(let r=0;r<t;r++){let t=e[r];t>0&&n.push(t)}return n.length?(n.sort((e,t)=>e-t),{avg:n.reduce((e,t)=>e+t,0)/n.length,p95:n[Math.floor(n.length*.95)],max:n[n.length-1]}):{avg:0,p95:0,max:0}}summary(){let e=this._stats(this.frameMs),t=this._stats(this.jsMs),n=this._stats(this.gpuMs);return{fps:e.avg>0?1e3/e.avg:0,frameMs:e,jsMs:t,gpuMs:this.gpuAvailable?n:null,draw:this._lastDraw,memoryMB:this.memoryMB(),longTasks:this.longTasks,longTaskMs:this.longTaskMs,counters:{...this.counters},net:{...this.net},loadTimeMs:this.loadTimeMs,programs:this.renderer.info.programs?this.renderer.info.programs.length:0,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures}}snapshot(){let e=this.summary();return{t:performance.now(),fps:+e.fps.toFixed(1),frameAvg:+e.frameMs.avg.toFixed(2),frameP95:+e.frameMs.p95.toFixed(2),frameMax:+e.frameMs.max.toFixed(1),jsAvg:+e.jsMs.avg.toFixed(2),jsP95:+e.jsMs.p95.toFixed(2),jsMax:+e.jsMs.max.toFixed(1),gpuAvg:e.gpuMs?+e.gpuMs.avg.toFixed(2):null,drawCalls:e.draw.calls,triangles:e.draw.triangles,memMB:e.memoryMB?+e.memoryMB.used.toFixed(1):null,longTasks:e.longTasks,longTaskMs:+e.longTaskMs.toFixed(0),geometries:e.geometries,textures:e.textures,programs:e.programs,loadTimeMs:+e.loadTimeMs.toFixed(0),net:{...e.net},...e.counters}}lines(){let e=this.summary(),t=e.memoryMB?`${e.memoryMB.used.toFixed(0)}/${e.memoryMB.total.toFixed(0)} MB`:`n/a`,n=e.gpuMs?`gpu ${e.gpuMs.avg.toFixed(1)} ms`:`gpu n/a`;return[`Frame ${e.frameMs.avg.toFixed(1)} ms (p95 ${e.frameMs.p95.toFixed(1)}, max ${e.frameMs.max.toFixed(0)})  js ${e.jsMs.avg.toFixed(1)} ms (p95 ${e.jsMs.p95.toFixed(1)})  ${n}`,`Draw calls ${e.draw.calls}  tris ${(e.draw.triangles/1e3).toFixed(0)}k  geometries ${e.geometries}  textures ${e.textures}  mem ${t}`,`Long tasks ${e.longTasks} (${e.longTaskMs.toFixed(0)} ms)  load ${(e.loadTimeMs/1e3).toFixed(1)} s  net in ${(e.net.bytesIn/1024).toFixed(1)} KB / out ${(e.net.bytesOut/1024).toFixed(1)} KB`]}},xm=class{constructor(){let e=new URLSearchParams(location.search);this.adminParam=e.get(`admin`),this.online=!1,this.serverAdmin=!1,this.listeners=new Set}get adminToken(){return this.adminParam&&this.adminParam!==`0`&&this.adminParam!==`1`?this.adminParam:null}isAdmin(){return this.online?this.serverAdmin:this.adminParam!==`0`}setOnline(e,t=!1){this.online=e,this.serverAdmin=t;for(let e of this.listeners)e(this.isAdmin())}onChange(e){return this.listeners.add(e),()=>this.listeners.delete(e)}},Sm=1,Cm=class e{constructor(e,t=typeof localStorage<`u`?localStorage:null){this.key=`frontier-craft:v${Sm}:${e}`,this.storage=t,this.byChunk=new Map,this.count=0,this.dirty=!1,this.enabled=!0,this.disasterCells=new Set,this.load(),this.timer=null}static chunkKey(e,t){return Math.floor(e/16)*1e5+Math.floor(t/16)}static posKey(e,t,n){return`${e},${t},${n}`}load(){if(this.storage)try{let e=this.storage.getItem(this.key);if(!e)return;let t=JSON.parse(e);for(let[e,n,r,i]of t.edits||[])this._set(e,n,r,i);this.dirty=!1}catch(e){console.warn(`save load failed`,e)}}_set(t,n,r,i){let a=e.chunkKey(t,r),o=this.byChunk.get(a);o||(o=new Map,this.byChunk.set(a,o));let s=e.posKey(t,n,r);o.has(s)||this.count++,o.set(s,[t,n,r,i])}recordEdit(t,n,r,i){this.enabled&&(this.disasterCells.has(e.posKey(t,n,r))||(this._set(t,n,r,i),this.scheduleWrite()))}onDisasterEdit(t,n,r){this.disasterCells.add(e.posKey(t,n,r))}clearDisasterCells(){this.disasterCells.clear()}commitDisaster(e){for(let[t,n,r,i]of e)this._set(t,n,r,i);this.disasterCells.clear(),this.scheduleWrite()}applyToChunk(e){let t=this.byChunk.get(e.cx*1e5+e.cz);if(!t)return 0;let n=0;for(let[r,i,a,o]of t.values())e.blocks[((r&15)*16+(a&15))*128+i]=o,n++;return n}scheduleWrite(){this.dirty=!0,!this.timer&&(this.timer=setTimeout(()=>{this.timer=null,this.flush()},1500))}flush(){if(!this.storage||!this.dirty)return;let e=[];for(let t of this.byChunk.values())for(let n of t.values())e.push(n);try{this.storage.setItem(this.key,JSON.stringify({version:Sm,edits:e})),this.dirty=!1}catch(e){console.warn(`save write failed`,e)}}clear(){this.byChunk.clear(),this.count=0,this.dirty=!1,this.storage&&this.storage.removeItem(this.key)}},wm=class{constructor(){this.entries=new Map,this.order=[]}get size(){return this.entries.size}record(e,t,n,r){let i=Ru.posKey(e,t,n);return!this.entries.has(i)&&(this.entries.set(i,{x:e,y:t,z:n,orig:r}),this.order.push(i),!0)}has(e,t,n){return this.entries.has(Ru.posKey(e,t,n))}original(e,t,n){let r=this.entries.get(Ru.posKey(e,t,n));return r?r.orig:void 0}*restoreBatches(e){let t=[];for(let n=this.order.length-1;n>=0;n--){let r=this.entries.get(this.order[n]);r&&(t.push(r),t.length>=e&&(yield t,t=[]))}t.length&&(yield t)}clear(){this.entries.clear(),this.order.length=0}hash(e){let t=[];for(let n of this.entries.values())t.push(`${n.x},${n.y},${n.z}:${e.getBlock(n.x,n.y,n.z)}`);t.sort();let n=2166136261;for(let e of t)for(let t=0;t<e.length;t++)n^=e.charCodeAt(t),n=Math.imul(n,16777619)>>>0;return(n>>>0).toString(16).padStart(8,`0`)+`:`+t.length}changes(e){let t=[];for(let n of this.entries.values()){let r=e.getBlock(n.x,n.y,n.z);r!==n.orig&&t.push([n.x,n.y,n.z,r])}return t}},Tm=`
attribute vec3 aUV;
attribute vec2 aLight;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
void main() {
  vUv = aUV.xy + vec2(uv.x, 1.0 - uv.y) * aUV.z;
  vLight = aLight;
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7));
  vec3 l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,Em=`
uniform sampler2D map;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, 1.0);
}`,Dm=class{constructor(e,t,n,r=600){this.world=t,this.max=r,this.count=0,this.px=new Float32Array(r),this.py=new Float32Array(r),this.pz=new Float32Array(r),this.vx=new Float32Array(r),this.vy=new Float32Array(r),this.vz=new Float32Array(r),this.rx=new Float32Array(r),this.ry=new Float32Array(r),this.rz=new Float32Array(r),this.wx=new Float32Array(r),this.wy=new Float32Array(r),this.wz=new Float32Array(r),this.size=new Float32Array(r),this.mass=new Float32Array(r),this.life=new Float32Array(r),this.age=new Float32Array(r),this.block=new Uint8Array(r),this.flags=new Uint8Array(r),this.lightTimer=new Uint8Array(r);let i=new oa(1,1,1);this.uvAttr=new vi(new Float32Array(r*3),3),this.lightAttr=new vi(new Float32Array(r*2),2),i.setAttribute(`aUV`,this.uvAttr),i.setAttribute(`aLight`,this.lightAttr),this.material=new _a({uniforms:{map:{value:n},uSkyLight:Bd.uSkyLight,uSkyTint:Bd.uSkyTint,uFogColor:Bd.uFogColor,uFogNear:Bd.uFogNear,uFogFar:Bd.uFogFar,uFlash:Bd.uFlash},vertexShader:Tm,fragmentShader:Em}),this.mesh=new Ei(i,this.material,r),this.mesh.instanceMatrix.setUsage(rt),this.mesh.count=0,this.mesh.frustumCulled=!1,e.add(this.mesh),this._m=new Yt,this._q=new Et,this._e=new on,this._s=new I,this._p=new I,this.forceFn=null,this.waterLevelFn=null,this.gravity=22,this.spawned=0,this.camera=null}spawn(e,t,n,r,i,a,o,s=.6,c=12,l={}){let u;if(this.count<this.max)u=this.count++;else if(l.force){u=0;for(let e=1;e<this.count;e++)this.age[e]>this.age[u]&&(u=e)}else return-1;this.px[u]=e,this.py[u]=t,this.pz[u]=n,this.vx[u]=r,this.vy[u]=i,this.vz[u]=a,this.rx[u]=l.rx||0,this.ry[u]=l.ry||0,this.rz[u]=l.rz||0,this.wx[u]=l.wx??r*.8,this.wy[u]=l.wy??1.5,this.wz[u]=l.wz??a*.8,this.size[u]=s,this.mass[u]=l.mass??s*s*s*(G[o].sound===`wood`||G[o].sound===`cloth`||G[o].sound===`grass`?.6:2.2),this.life[u]=c,this.age[u]=0,this.block[u]=o||W.OAK_PLANKS,this.flags[u]=l.buoyant??this.mass[u]<1?1:0;let d=G[this.block[u]],[f,p,m]=vu(d.tex[0]);this.uvAttr.setXYZ(u,f,p,m);let h=this.world.sampleLight(e,t,n);return this.lightAttr.setXY(u,h[0],h[1]),this.lightTimer[u]=u%12,this.spawned++,u}clear(){this.count=0,this.mesh.count=0}remove(e){let t=--this.count;if(e!==t){for(let n of[this.px,this.py,this.pz,this.vx,this.vy,this.vz,this.rx,this.ry,this.rz,this.wx,this.wy,this.wz,this.size,this.mass,this.life,this.age,this.block,this.flags,this.lightTimer])n[e]=n[t];this.uvAttr.setXYZ(e,this.uvAttr.getX(t),this.uvAttr.getY(t),this.uvAttr.getZ(t)),this.lightAttr.setXY(e,this.lightAttr.getX(t),this.lightAttr.getY(t))}}update(e,t){this.camera=t;let n=this.world,r=new yf(0,0,0,0,0,0),i={x:0,y:0,z:0},a=t?t.position.x:0,o=t?t.position.z:0;for(let t=0;t<this.count;t++){if(this.age[t]+=e,this.age[t]>this.life[t]){this.remove(t),t--;continue}let s=this.px[t]-a,c=this.pz[t]-o;if(s*s+c*c>25600)continue;let l=this.size[t]/2,u=this.vx[t],d=this.vy[t],f=this.vz[t],p=this.waterLevelFn?this.waterLevelFn(this.px[t],this.pz[t]):-1/0,m=n.getBlock(Math.floor(this.px[t]),Math.floor(this.py[t]),Math.floor(this.pz[t]))===W.WATER,h=m||this.py[t]<p;if(h&&this.flags[t]&1){let n=(m?Math.max(p,Math.floor(this.py[t])+.9):p)-this.py[t];d+=(n*14-d*3)*e,u*=1-2.5*e,f*=1-2.5*e}else h?(d-=this.gravity*.3*e,u*=1-3*e,f*=1-3*e):(d-=this.gravity*e,u*=1-.15*e,f*=1-.15*e);if(this.forceFn){i.x=0,i.y=0,i.z=0,this.forceFn(t,i,e);let n=1/Math.max(.2,this.mass[t]);u+=i.x*n*e,d+=i.y*n*e,f+=i.z*n*e}let g=Math.sqrt(u*u+d*d+f*f);if(g>40){let e=40/g;u*=e,d*=e,f*=e}r.x0=this.px[t]-l,r.y0=this.py[t]-l,r.z0=this.pz[t]-l,r.x1=this.px[t]+l,r.y1=this.py[t]+l,r.z1=this.pz[t]+l;let _=Ef(n,r,u*e,d*e,f*e,0,!1);this.px[t]=r.x0+l,this.py[t]=r.y0+l,this.pz[t]=r.z0+l,_.hitY&&(d<0?(d=-d*.25,Math.abs(d)<1.2&&(d=0),u*=.6,f*=.6,this.wx[t]*=.5,this.wz[t]*=.5):d=0),_.hitX&&(u=-u*.3),_.hitZ&&(f=-f*.3),this.vx[t]=u,this.vy[t]=d,this.vz[t]=f;let v=_.hitY&&Math.abs(d)<.1?.2:1;if(this.rx[t]+=this.wx[t]*e*v,this.ry[t]+=this.wy[t]*e*v,this.rz[t]+=this.wz[t]*e*v,this.py[t]<-5){this.remove(t),t--;continue}if(++this.lightTimer[t]>=12){this.lightTimer[t]=0;let e=n.sampleLight(this.px[t],this.py[t]+l,this.pz[t]);this.lightAttr.setXY(t,e[0],e[1])}}for(let e=0;e<this.count;e++){let t=Math.min(1,(this.life[e]-this.age[e])/1),n=this.size[e]*t;this._e.set(this.rx[e],this.ry[e],this.rz[e]),this._q.setFromEuler(this._e),this._p.set(this.px[e],this.py[e],this.pz[e]),this._s.set(n,n,n),this._m.compose(this._p,this._q,this._s),this.mesh.setMatrixAt(e,this._m)}this.mesh.count=this.count,this.mesh.instanceMatrix.needsUpdate=!0,this.uvAttr.needsUpdate=!0,this.lightAttr.needsUpdate=!0}},Om=class{constructor(){this.shakeAmp=0,this.shakeDecay=2.5,this.shakeOffset=new I,this.shakeRot=0,this.override={skyLightMul:1,tint:new I(1,1,1),flash:0,flashColor:new I(1,.95,.85),fogColor:null,fogNearMul:1,fogFarMul:1},this._target={skyLightMul:1,tint:new I(1,1,1),fogNearMul:1,fogFarMul:1,fogColor:null},this.flashTimer=0,this.flashDuration=0,this.flashPeak=0}shake(e,t=2.5){this.shakeAmp=Math.max(this.shakeAmp,Math.min(1.2,e)),this.shakeDecay=t}setEnvironment({skyLightMul:e,tint:t,fogColor:n,fogNearMul:r,fogFarMul:i}={}){let a=this._target;e!==void 0&&(a.skyLightMul=e),t&&a.tint.set(t[0],t[1],t[2]),n!==void 0&&(a.fogColor=n?new R(n[0],n[1],n[2]):null),r!==void 0&&(a.fogNearMul=r),i!==void 0&&(a.fogFarMul=i)}flash(e=1,t=.6,n=null){this.flashPeak=Math.min(1.5,e),this.flashDuration=t,this.flashTimer=t,n&&this.override.flashColor.set(n[0],n[1],n[2])}reset(){this.setEnvironment({skyLightMul:1,tint:[1,1,1],fogColor:null,fogNearMul:1,fogFarMul:1})}update(e){this.shakeAmp>.001?(this.shakeOffset.set((Math.random()-.5)*2*this.shakeAmp,(Math.random()-.5)*2*this.shakeAmp*.7,(Math.random()-.5)*2*this.shakeAmp),this.shakeRot=(Math.random()-.5)*this.shakeAmp*.15,this.shakeAmp*=Math.max(0,1-this.shakeDecay*e)):(this.shakeOffset.set(0,0,0),this.shakeRot=0,this.shakeAmp=0);let t=this.override,n=this._target,r=Math.min(1,e*2.5);if(t.skyLightMul+=(n.skyLightMul-t.skyLightMul)*r,t.tint.lerp(n.tint,r),t.fogNearMul+=(n.fogNearMul-t.fogNearMul)*r,t.fogFarMul+=(n.fogFarMul-t.fogFarMul)*r,n.fogColor?t.fogColor?t.fogColor.lerp(n.fogColor,r):t.fogColor=n.fogColor.clone():t.fogColor&&(t.fogColor=null),this.flashTimer>0){this.flashTimer-=e;let n=Math.max(0,this.flashTimer/this.flashDuration);t.flash=this.flashPeak*n*n}else t.flash=0}get active(){return this.shakeAmp>.001||this.override.flash>.001||Math.abs(this.override.skyLightMul-1)>.01||this.override.fogColor||Math.abs(this.override.fogFarMul-1)>.01}},km={editsPerTick:260,relightPerFrame:3,remeshPerFrame:3,maxDebris:600,restorePerTick:320,maxJournal:25e4},Am=1,jm=class{constructor(e){this.game=e,this.world=e.world,this.registry=new Map,this.active=null,this.activeType=null,this.state=`idle`,this.tick=0,this.journal=new wm,this.debris=new Dm(e.scene,e.world,e.atlas,km.maxDebris),this.effects=new Om,this.net=null,this.permissions=e.permissions,this.log=[],this.lastCommand=null,this.editsThisTick=0,this.touched=new Set,this.relightQueue=[],this.restoreIter=null,this.listeners=new Set,this.pendingStart=null,this.serverTick=null,this.stats={edits:0,restored:0,debrisSpawned:0},this.messages=[]}register(e){this.registry.set(e.type,e)}types(){return[...this.registry.keys()]}schema(e){let t=this.registry.get(e);return t?t.schema:[]}defaults(e){let t=this.registry.get(e);return t?t.defaults():{}}onChange(e){return this.listeners.add(e),()=>this.listeners.delete(e)}_notify(){let e=this.status();for(let t of this.listeners)t(e)}say(e){this.messages.push(e),this.messages.length>6&&this.messages.shift(),this.game.hud.addMessage(e)}status(){let e=this.active;return{state:this.state,type:this.activeType,tick:this.tick,elapsed:this.tick/20,progress:e?e.progress:0,params:e?e.params:null,seed:e?e.seed:null,journal:this.journal.size,debris:this.debris.count,edits:this.stats.edits,restored:this.stats.restored,restoreProgress:this.restoreIter?this.restoreProgress:null,admin:this.isAdmin(),online:!!(this.net&&this.net.connected),messages:this.messages.slice()}}isAdmin(){return!this.permissions||this.permissions.isAdmin()}command(e){if(!this.isAdmin())return{ok:!1,reason:`Disaster controls require administrator permission.`};let t={...e,id:e.id||Am++};return(t.type===`start`||t.type===`preview`||t.type===`replay`)&&!this.registry.has(t.disaster||this.activeType)?{ok:!1,reason:`Unknown disaster type.`}:this.net&&this.net.connected?(this.net.sendCommand(t),{ok:!0,pending:!0}):this.apply(t,!1)}apply(e,t=!1){let n=this.registry.get(e.disaster||this.activeType);switch(e.type){case`preview`:if(!n)return{ok:!1,reason:`no disaster`};this._disposeActive(),this.active=new n(this,e.params||{},e.seed??1),this.activeType=n.type,this.active.preview=!0,this.active.beginPreview(),this.state=`preview`;break;case`start`:{if(!n)return{ok:!1,reason:`no disaster`};if(this.state===`restoring`)return{ok:!1,reason:`restore in progress`};this._disposeActive();let t=e.seed??(Date.now()^Math.random()*1e9)>>>0;this.active=new n(this,e.params||{},t),this.activeType=n.type,this.tick=0,this.editsThisTick=0,this.lastCommand={...e,seed:t,params:this.active.params},this.active.begin(),this.state=`running`,this.say(`${n.label} started (seed ${t}).`);break}case`pause`:this.state===`running`&&(this.state=`paused`,this.say(`Disaster paused.`));break;case`resume`:this.state===`paused`&&(this.state=`running`,this.say(`Disaster resumed.`));break;case`stop`:this.active&&(this.state===`running`||this.state===`paused`)?(this.active.stop(),this.state=`finished`,this.say(`Disaster stopped.`)):this.state===`preview`&&(this._disposeActive(),this.state=`idle`);break;case`set`:if(this.active&&e.params){let t=this.active.constructor;Object.assign(this.active.params,t.clampParams({...this.active.params,...e.params})),this.active.onParamsChanged&&this.active.onParamsChanged()}break;case`reset`:this.active&&(this.active.stop(),this._disposeActive()),this.debris.clear(),this.effects.reset(),this.beginRestore();break;case`replay`:{let t=e.command||this.lastCommand;if(!t)return{ok:!1,reason:`nothing to replay`};this.pendingReplay={...t,type:`start`,id:Am++},this.active&&(this.active.stop(),this._disposeActive()),this.debris.clear(),this.effects.reset(),this.beginRestore();break}default:return{ok:!1,reason:`unknown command `+e.type}}return this.log.push({...e,appliedTick:this.tick,fromNetwork:t}),this.log.length>200&&this.log.shift(),this._notify(),{ok:!0}}_disposeActive(){if(this.active)try{this.active.dispose()}catch(e){console.warn(e)}this.active=null,this.debris.forceFn=null,this.debris.waterLevelFn=null,this.effects.reset(),this.game.npcs&&this.game.npcs.clearAlert(),this.game.animals&&this.game.animals.clearAlert()}setBlock(e,t,n,r){if(this.active&&this.active.preview||this.editsThisTick>=km.editsPerTick||!this.world.isLoaded(e,n))return!1;let i=this.world.getBlock(e,t,n);if(i===r||i===W.BEDROCK)return!1;if(!this.journal.has(e,t,n)){if(this.journal.size>=km.maxJournal)return!1;this.journal.record(e,t,n,i),this.game.save&&this.game.save.onDisasterEdit(e,t,n)}return this.world.setBlockRaw(e,t,n,r),this.touched.add(this.world.chunkKeyAt(e,n)),this.editsThisTick++,this.stats.edits++,!0}get budgetLeft(){return km.editsPerTick-this.editsThisTick}beginRestore(){if(this.journal.size===0){this.state=(this.pendingReplay,`idle`),this._finishRestore();return}this.state=`restoring`,this.restoreTotal=this.journal.size,this.restoreDone=0,this.restoreIter=this.journal.restoreBatches(km.restorePerTick),this.say(`Restoring ${this.restoreTotal} blocks...`),this._notify()}get restoreProgress(){return this.restoreTotal?this.restoreDone/this.restoreTotal:1}_restoreStep(){let e=this.restoreIter.next();if(e.done){this._finishRestore();return}for(let t of e.value)this.world.isLoaded(t.x,t.z)&&(this.world.getBlock(t.x,t.y,t.z)!==t.orig&&(this.world.setBlockRaw(t.x,t.y,t.z,t.orig),this.touched.add(this.world.chunkKeyAt(t.x,t.z)),this.stats.restored++),this.restoreDone++)}_finishRestore(){if(this.restoreIter=null,this.journal.clear(),this.state=`idle`,this.game.npcs&&this.game.npcs.clearAlert(),this.game.animals&&this.game.animals.clearAlert(),this.say(`Area restored.`),this.pendingReplay){let e=this.pendingReplay;this.pendingReplay=null,this.apply(e,!1)}this._notify()}simTick(){if(this.editsThisTick=0,this.state===`restoring`){this._restoreStep();return}if(this.state===`running`&&this.active){this.tick++,this.active.tick=this.tick;try{this.active.simulate()}catch(e){console.error(`disaster tick failed`,e),this.active.stop(),this.state=`finished`}this.active.done&&(this.state=`finished`,this.say(`${this.active.constructor.label} ended.`),this._notify()),this.pauseAtTick&&this.tick>=this.pauseAtTick&&this.state===`running`&&(this.state=`paused`,this.pauseAtTick=null,this._notify()),this.tick&15||this._notify()}else if(this.state===`finished`&&this.active&&(this.active.tick=++this.tick,!this.active.done))try{this.active.simulate()}catch{this.active.done=!0}}update(e,t,n){if(this.effects.update(e),this.active)try{this.active.render(e,t,n)}catch(e){console.error(`disaster render failed`,e),this._disposeActive(),this.state=`idle`}this.debris.update(e,n),this._flushChunks()}_flushChunks(){if(this.touched.size){for(let e of this.touched)this.relightQueue.includes(e)||this.relightQueue.push(e);this.touched.clear()}let e=0;for(;this.relightQueue.length&&e<km.relightPerFrame;){let t=this.relightQueue.shift(),n=this.world.chunks.get(t);n&&n.generated&&(this.world.relightChunk(n),e++)}(e>0||this.relightQueue.length===0)&&this.game.terrain.remeshDirty(km.remeshPerFrame,this.game.player.pos.x,this.game.player.pos.z),e>0&&this.game.npcs&&this.game.npcs.onBulkWorldChange()}forEachBlockInDisc(e,t,n,r,i,a){let o=n*n;for(let s=Math.floor(e-n);s<=Math.ceil(e+n);s++)for(let c=Math.floor(t-n);c<=Math.ceil(t+n);c++){let n=s+.5-e,l=c+.5-t;if(!(n*n+l*l>o))for(let e=r;e<=i;e++){let t=this.world.getBlock(s,e,c);t!==W.AIR&&a(s,e,c,t)}}}countBlocksInDisc(e,t,n,r,i){let a=0;return this.forEachBlockInDisc(e,t,n,r,i,()=>a++),a}static fragility(e){let t=G[e];if(!t||e===W.AIR||e===W.BEDROCK||e===W.WATER)return 0;if(t.shape!==0)return 1;switch(t.sound){case`glass`:return 1;case`cloth`:return .95;case`grass`:return .9;case`wood`:return .7;case`gravel`:case`sand`:return .6;case`metal`:return .4;default:return .3}}static chunkKey(e,t){return Math.floor(e/16)*1e5+Math.floor(t/16)}};function Mm(e){"@babel/helpers - typeof";return Mm=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Mm(e)}function Nm(e,t){if(Mm(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(Mm(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function Pm(e){var t=Nm(e,`string`);return Mm(t)==`symbol`?t:t+``}function Fm(e,t,n){return(t=Pm(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var Im=class{static defaults(){let e={};for(let t of this.schema)e[t.key]=t.default;return e}static clampParams(e={}){let t=this.defaults();for(let n of this.schema){let r=e[n.key];if(r!=null)switch(n.type){case`number`:case`angle`:if(r=Number(r),!Number.isFinite(r))continue;t[n.key]=Ol(r,n.min,n.max);break;case`boolean`:t[n.key]=!!r;break;case`select`:n.options.includes(r)&&(t[n.key]=r);break;case`position`:Array.isArray(r)&&r.length>=2&&(t[n.key]=[Ol(Number(r[0])||0,-4e3,4e3),Ol(Number(r[1])||0,-4e3,4e3)]);break;default:t[n.key]=r}}return t}constructor(e,t,n){this.m=e,this.game=e.game,this.world=e.game.world,this.params=this.constructor.clampParams(t),this.seed=n>>>0,this.rng=new Dl(this.seed),this.tick=0,this.preview=!1,this.done=!1,this.stopping=!1}get elapsed(){return this.tick/20}get durationTicks(){return Math.round((this.params.duration||30)*20)}get progress(){return Math.min(1,this.tick/Math.max(1,this.durationTicks))}warnings(){return[]}begin(){}beginPreview(){}simulate(){}render(e,t,n){}stop(){this.stopping=!0}dispose(){}rand(e=0,t=1){return e+this.rng.next()*(t-e)}surfaceY(e,t){return this.world.surfaceY(Math.floor(e),Math.floor(t))}};Fm(Im,`type`,`base`),Fm(Im,`label`,`Base`),Fm(Im,`description`,``),Fm(Im,`schema`,[]);var Lm=class extends Im{warnings(){return[`Floods everything within ${this.params.radius} blocks of (${this.params.center[0]}, ${this.params.center[1]}) up to ${this.params.waterHeight} blocks deep.`]}simulate(){this.tick>=this.durationTicks&&(this.done=!0)}};Fm(Lm,`type`,`tsunami`),Fm(Lm,`label`,`Tsunami & Flood`),Fm(Lm,`description`,`A wall of water rolls in from one side of the town, floods the streets and drags debris along.`),Fm(Lm,`schema`,[{key:`waterHeight`,label:`Flood height (blocks above ground)`,type:`number`,min:1,max:14,step:1,default:5,unit:`blocks`},{key:`waveHeight`,label:`Wave crest height`,type:`number`,min:1,max:12,step:1,default:4,unit:`blocks`},{key:`direction`,label:`Direction (from)`,type:`select`,options:[`west`,`east`,`north`,`south`],default:`west`},{key:`speed`,label:`Wave speed`,type:`number`,min:1,max:20,step:.5,default:6,unit:`blocks/s`},{key:`duration`,label:`Duration`,type:`number`,min:10,max:240,step:5,default:60,unit:`s`},{key:`damage`,label:`Structural damage`,type:`number`,min:0,max:1,step:.05,default:.5},{key:`intensity`,label:`Intensity`,type:`number`,min:0,max:1,step:.05,default:.7},{key:`center`,label:`Center (x, z)`,type:`position`,default:[0,0]},{key:`radius`,label:`Affected radius`,type:`number`,min:20,max:160,step:5,default:110,unit:`blocks`}]);var Rm=class extends Im{warnings(){return[`Destroys light structures along its path (radius ${this.params.radius}) starting at (${this.params.start[0]}, ${this.params.start[1]}).`]}simulate(){this.tick>=this.durationTicks&&(this.done=!0)}};Fm(Rm,`type`,`tornado`),Fm(Rm,`label`,`Tornado`),Fm(Rm,`description`,`A rotating funnel travels along a path, tearing up light structures and hurling debris, animals and people.`),Fm(Rm,`schema`,[{key:`start`,label:`Spawn location (x, z)`,type:`position`,default:[-90,40]},{key:`heading`,label:`Heading`,type:`angle`,min:0,max:360,step:5,default:60,unit:`deg`},{key:`wander`,label:`Path wobble`,type:`number`,min:0,max:1,step:.05,default:.35},{key:`radius`,label:`Funnel radius`,type:`number`,min:3,max:25,step:1,default:9,unit:`blocks`},{key:`speed`,label:`Travel speed`,type:`number`,min:0,max:12,step:.5,default:3,unit:`blocks/s`},{key:`duration`,label:`Duration`,type:`number`,min:10,max:240,step:5,default:75,unit:`s`},{key:`intensity`,label:`Intensity`,type:`number`,min:0,max:1,step:.05,default:.7}]);var zm=class extends Im{warnings(){return[`Vaporizes terrain and buildings within ${this.params.destructionRadius} blocks of (${this.params.target[0]}, ${this.params.target[1]}).`]}simulate(){this.tick>=this.durationTicks+Math.round(this.params.chargeTime*20)&&(this.done=!0)}};Fm(zm,`type`,`beam`),Fm(zm,`label`,`Orbital Beam`),Fm(zm,`description`,`An orbital platform charges in the sky, then a giant energy beam descends and carves a crater.`),Fm(zm,`schema`,[{key:`target`,label:`Target (x, z)`,type:`position`,default:[0,0]},{key:`beamRadius`,label:`Beam radius`,type:`number`,min:1,max:14,step:.5,default:5,unit:`blocks`},{key:`chargeTime`,label:`Charge time`,type:`number`,min:2,max:40,step:1,default:10,unit:`s`},{key:`strength`,label:`Impact strength`,type:`number`,min:0,max:1,step:.05,default:.7},{key:`destructionRadius`,label:`Destruction radius`,type:`number`,min:3,max:45,step:1,default:18,unit:`blocks`},{key:`duration`,label:`Beam duration`,type:`number`,min:3,max:90,step:1,default:18,unit:`s`},{key:`intensity`,label:`Intensity`,type:`number`,min:0,max:1,step:.05,default:.7}]);var Bm=`frontier-craft:admin`,Vm=200,Hm=500,Um=150,Wm=400,Gm=250,Km=160,qm=[`N`,`NE`,`E`,`SE`,`S`,`SW`,`W`,`NW`],Jm=`This modifies the world; damage is journaled and can be restored with Reset; it is NOT written to your save unless you commit it.`;function $(e,t,...n){let r=document.createElement(e);if(t)for(let[e,n]of Object.entries(t))n!=null&&n!==!1&&(e===`class`?r.className=n:e===`text`?r.textContent=n:e.startsWith(`on`)&&typeof n==`function`?r.addEventListener(e.slice(2),n):typeof n==`boolean`?r[e]=n:r.setAttribute(e,n));for(let e of n.flat())e!=null&&e!==!1&&r.append(e.nodeType?e:document.createTextNode(String(e)));return r}function Ym(e,t){e.textContent!==t&&(e.textContent=t)}function Xm(e,t,n){return Number.isFinite(t)&&e<t&&(e=t),Number.isFinite(n)&&e>n&&(e=n),e}function Zm(e){if(!Number.isFinite(e)||e<=0)return 0;let t=String(e);if(t.includes(`e-`))return Math.min(6,parseInt(t.split(`e-`)[1],10)||0);let n=t.indexOf(`.`);return n<0?0:Math.min(6,t.length-n-1)}function Qm(e,t){return Number.isFinite(e)?Number(e).toFixed(Zm(t)):`?`}function $m(e){let t=(Number(e)%360+360)%360;return qm[Math.round(t/45)%8]}function eh(e){return!!e&&(e.tagName===`INPUT`&&![`range`,`checkbox`,`button`].includes(e.type)||e.tagName===`TEXTAREA`||e.isContentEditable)}function th(e){return Array.isArray(e)?`[`+e.map(th).join(`,`)+`]`:e&&typeof e==`object`?`{`+Object.entries(e).map(([e,t])=>(/^[A-Za-z_$][\w$]*$/.test(e)?e:JSON.stringify(e))+`:`+th(t)).join(`,`)+`}`:typeof e==`string`?`'`+e.replace(/\\/g,`\\\\`).replace(/'/g,`\\'`)+`'`:String(e)}var nh=class{constructor(e){this.game=e,this.isOpen=!1,this.selectedType=null,this.builtType=null,this.fields=[],this.store={selected:null,byType:{}},this.status=null,this.dialogOpen=!1,this.lastStatusAt=0,this.lastPerfAt=0,this.saveTimer=null,this.liveTimer=null,this.previewTimer=null,this.noteTimer=null,this.copyTimer=null,this.tabsSignature=``,this.lastLog=null,this.unsubscribe=[],this._build(),this._subscribe(),this._load()}get manager(){return this.game.disasters||null}open(){this.isOpen=!0,this.root.hidden=!1,this._subscribe(),this.saveTimer&&this._flushSave(),this._load(),this._refreshPermission(),this.lastStatusAt=0,this.lastPerfAt=0,this._refreshStatus(),this._refreshPerf(),this.root.contains(document.activeElement)||this.root.focus({preventScroll:!0})}close(){this.isOpen=!1,this._closeDialog(),this.previewTimer&&(clearTimeout(this.previewTimer),this.previewTimer=null),this._flushSave(),this.root.contains(document.activeElement)&&document.activeElement.blur&&document.activeElement.blur(),this.root.hidden=!0}toggle(){this.isOpen?this.close():this.open()}update(){if(!this.isOpen)return;let e=performance.now();e-this.lastStatusAt>=Vm&&(this.lastStatusAt=e,this._refreshStatus()),e-this.lastPerfAt>=Hm&&(this.lastPerfAt=e,this._refreshPerf())}_build(){let e=this.root=$(`div`,{id:`admin-panel`,role:`dialog`,"aria-label":`Disaster control panel`,tabindex:`-1`,hidden:!0});this.badgeOnline=$(`span`,{class:`ap-badge`,id:`ap-badge-online`,text:`offline`}),this.badgeAdmin=$(`span`,{class:`ap-badge`,id:`ap-badge-admin`,text:`admin`}),this.badgeState=$(`span`,{class:`ap-badge ap-state`,id:`ap-badge-state`,text:`idle`}),this.badges=$(`div`,{class:`ap-badges`},this.badgeOnline,this.badgeAdmin,this.badgeState);let t=$(`div`,{class:`ap-header`},$(`div`,{class:`ap-title-row`},$(`div`,{class:`ap-title`},`DISASTER CONTROL`,$(`small`,{text:"Administrator panel  -  F4 / ` / Esc to close"})),$(`button`,{class:`ap-btn ap-close`,id:`ap-close`,type:`button`,title:`Close (Esc / F4)`,"aria-label":`Close panel`,text:`×`,onclick:()=>this._requestClose()})),this.badges);this.stType=$(`dd`,{text:`—`}),this.stElapsed=$(`dd`,{text:`0.0 s`}),this.stSeed=$(`dd`,{text:`—`}),this.stJournal=$(`dd`,{id:`ap-st-journal`,text:`0`}),this.stDebris=$(`dd`,{id:`ap-st-debris`,text:`0`}),this.stEdits=$(`dd`,{text:`0 / 0`}),this.progressFill=$(`div`),this.progressLabel=$(`span`,{text:`0%`}),this.restoreFill=$(`div`),this.restoreLabel=$(`span`,{text:`0%`}),this.restoreBox=$(`div`,{class:`ap-restore`,id:`ap-restore`,hidden:!0},`Restoring the world…`,$(`div`,{class:`ap-bar ap-bar-restore`},this.restoreFill,this.restoreLabel)),this.logEl=$(`div`,{class:`ap-log`,id:`ap-log`,"aria-live":`polite`},$(`div`,{class:`ap-empty`,text:`No messages yet.`}));let n=$(`section`,{class:`ap-section`,id:`ap-status`},$(`h3`,{},`Status`),$(`dl`,{class:`ap-kv`},$(`dt`,{text:`Disaster`}),this.stType,$(`dt`,{text:`Elapsed`}),this.stElapsed,$(`dt`,{text:`Seed`}),this.stSeed,$(`dt`,{text:`Journal`}),this.stJournal,$(`dt`,{text:`Debris`}),this.stDebris,$(`dt`,{text:`Edits / restored`}),this.stEdits),$(`div`,{class:`ap-bar`,id:`ap-progress`,title:`Disaster progress`},this.progressFill,this.progressLabel),this.restoreBox,this.logEl);this.tabsEl=$(`div`,{class:`ap-tabs`,id:`ap-tabs`,role:`tablist`,"aria-label":`Disaster type`}),this.descEl=$(`div`,{class:`ap-desc`,id:`ap-desc`});let r=$(`section`,{class:`ap-section`,id:`ap-disaster`},$(`h3`,{},`Disaster`),this.tabsEl,this.descEl);this.formEl=$(`div`,{class:`ap-form`,id:`ap-form`}),this.seedInput=$(`input`,{type:`number`,id:`ap-seed`,min:`0`,step:`1`,value:`1`,"aria-label":`Seed`}),this.seedInput.addEventListener(`input`,()=>this._onFieldInput()),this.seedInput.addEventListener(`change`,()=>{this.seedInput.value=String(this._readSeed()),this._onFieldInput()});let i=$(`section`,{class:`ap-section`,id:`ap-params`},$(`h3`,{},`Parameters`,$(`span`,{class:`ap-h-actions`},$(`button`,{class:`ap-btn ap-mini`,id:`ap-defaults`,type:`button`,text:`Defaults`,title:`Reset parameters to the schema defaults`,onclick:()=>this._resetDefaults()}))),this.formEl,$(`div`,{class:`ap-seed-row`},$(`label`,{for:`ap-seed`,text:`Seed`}),this.seedInput,$(`button`,{class:`ap-btn ap-mini`,id:`ap-seed-random`,type:`button`,text:`Randomize`,onclick:()=>this._randomizeSeed()}),$(`span`,{class:`ap-hint`,text:`same seed = same run`})));this.btnPreview=$(`button`,{class:`ap-btn`,id:`ap-btn-preview`,type:`button`,text:`Preview`,onclick:()=>this._onPreview()}),this.btnStart=$(`button`,{class:`ap-btn ap-danger`,id:`ap-btn-start`,type:`button`,text:`Start…`,onclick:()=>this._onStart()}),this.btnPause=$(`button`,{class:`ap-btn`,id:`ap-btn-pause`,type:`button`,text:`Pause`,onclick:()=>this._onPauseResume()}),this.btnStop=$(`button`,{class:`ap-btn`,id:`ap-btn-stop`,type:`button`,text:`Stop`,onclick:()=>this._cmd({type:`stop`})}),this.btnReset=$(`button`,{class:`ap-btn`,id:`ap-btn-reset`,type:`button`,text:`Reset / Restore…`,onclick:()=>this._onReset()}),this.btnReplay=$(`button`,{class:`ap-btn`,id:`ap-btn-replay`,type:`button`,text:`Replay…`,onclick:()=>this._onReplay()}),this.liveSlider=$(`input`,{type:`range`,id:`ap-live-intensity`,min:`0`,max:`1`,step:`0.05`,value:`0.7`,"aria-label":`Live intensity`}),this.liveVal=$(`span`,{class:`ap-val`,id:`ap-live-value`,text:`—`}),this.liveSlider.addEventListener(`input`,()=>this._onLiveIntensity()),this.liveBox=$(`div`,{class:`ap-live`,id:`ap-live`,"data-enabled":`false`},$(`label`,{class:`ap-label`,for:`ap-live-intensity`},$(`span`,{},`Live intensity `,$(`span`,{class:`ap-unit`,text:`(running disaster, 0–1)`})),this.liveVal),$(`div`,{class:`ap-row`},this.liveSlider)),this.noteEl=$(`div`,{class:`ap-hint`,id:`ap-note`,"aria-live":`polite`});let a=$(`section`,{class:`ap-section`,id:`ap-controls`},$(`h3`,{},`Controls`),$(`div`,{class:`ap-btn-grid`},this.btnPreview,this.btnStart,this.btnPause,this.btnStop,this.btnReset,this.btnReplay),this.liveBox,this.noteEl);this.saveHint=$(`div`,{class:`ap-hint`,id:`ap-save-hint`,text:`Journal: 0 cells`}),this.btnCommit=$(`button`,{class:`ap-btn`,id:`ap-btn-commit`,type:`button`,text:`Commit damage to save…`,onclick:()=>this._onCommit()}),this.btnDiscard=$(`button`,{class:`ap-btn`,id:`ap-btn-discard`,type:`button`,text:`Discard (reset)…`,onclick:()=>this._onDiscard()});let o=$(`section`,{class:`ap-section`,id:`ap-save`},$(`h3`,{},`Save`),this.saveHint,$(`div`,{class:`ap-btn-grid`},this.btnCommit,this.btnDiscard));this.copiedEl=$(`span`,{class:`ap-copied`,id:`ap-copied`}),this.cmdArea=$(`textarea`,{id:`ap-command`,readOnly:!0,spellcheck:`false`,"aria-label":`Console command for the current configuration`,wrap:`soft`}),this.cmdArea.addEventListener(`focus`,()=>this.cmdArea.select());let s=$(`section`,{class:`ap-section`,id:`ap-cmd`},$(`h3`,{},`Console command`,$(`span`,{class:`ap-h-actions`},this.copiedEl,$(`button`,{class:`ap-btn ap-mini`,id:`ap-copy`,type:`button`,text:`Copy`,onclick:()=>this._copyCommand()}))),$(`div`,{class:`ap-hint`,text:`Paste in the devtools console to reproduce this exact configuration.`}),this.cmdArea);this.denied=$(`div`,{class:`ap-denied`,id:`ap-denied`,hidden:!0},`Administrator permission required`,$(`small`,{text:`Single player: remove ?admin=0 from the URL. Multiplayer: join with the admin token (?admin=<token>).`})),this.main=$(`div`,{class:`ap-main`,id:`ap-main`},n,r,i,a,o,s),this.body=$(`div`,{class:`ap-body`},this.denied,this.main),this.perfEl=$(`div`,{class:`ap-footer`,id:`ap-perf`,text:`perf: n/a`}),this.overlay=$(`div`,{class:`ap-overlay`,id:`ap-overlay`,hidden:!0,onclick:e=>{e.target===this.overlay&&this._closeDialog()}}),e.append(t,this.body,this.perfEl,this.overlay),e.addEventListener(`keydown`,e=>this._onKeyDown(e)),e.addEventListener(`keyup`,e=>{this._keyPropagates(e)||e.stopPropagation()}),e.addEventListener(`keypress`,e=>e.stopPropagation()),document.body.appendChild(e)}_keyPropagates(e){return e.code===`Escape`||e.code===`F4`||e.code===`Backquote`&&!eh(e.target)}_onKeyDown(e){if(e.code===`Escape`&&this.dialogOpen){e.stopPropagation(),e.preventDefault(),this._closeDialog();return}this._keyPropagates(e)||e.stopPropagation()}_requestClose(){this.game.closeScreen&&this.game.hud&&this.game.hud.screen===`admin`?this.game.closeScreen():this.close()}_subscribe(){if(this.subscribed)return;let e=this.manager;e&&(this.subscribed=!0,this.unsubscribe.push(e.onChange(e=>{this.isOpen&&this._refreshStatus(e)})),this.game.permissions&&this.game.permissions.onChange&&this.unsubscribe.push(this.game.permissions.onChange(()=>{this.isOpen&&(this._refreshPermission(),this._refreshStatus())})))}dispose(){for(let e of this.unsubscribe)e();this.unsubscribe=[],this.subscribed=!1,this.root.remove()}_refreshPermission(){let e=!this.game.permissions||this.game.permissions.isAdmin();if(this.denied.hidden=e,this.main.hidden=!e,this.badges.hidden=!e,this.perfEl.hidden=!e,!e){this.game.hud&&this.game.hud.addMessage(`Administrator permission required.`);return}this._syncTabs()}_syncTabs(){let e=this.manager;if(!e)return;let t=e.types();if(!t.length)return;(!this.selectedType||!e.registry.has(this.selectedType))&&(this.selectedType=e.registry.has(this.store.selected)?this.store.selected:t[0]);let n=t.join(`,`);n!==this.tabsSignature&&(this.tabsSignature=n,this.tabsEl.replaceChildren(...t.map(t=>{let n=e.registry.get(t);return $(`button`,{class:`ap-btn ap-tab`,type:`button`,role:`tab`,"data-type":t,id:`ap-tab-`+t,title:n.description||``,text:n.label||t,onclick:()=>this.selectType(t)})}))),this._applySelection()}selectType(e){let t=this.manager;!t||!t.registry.has(e)||(this.builtType!==e||this.selectedType!==e)&&(this.builtType&&this.builtType!==e&&this._storeCurrent(),this.selectedType=e,this.store.selected=e,this._applySelection(),this._scheduleSave(),this.status&&this.status.state===`preview`&&this._schedulePreviewRefresh(),this._refreshStatus())}_applySelection(){let e=this.manager,t=this.selectedType;for(let e of this.tabsEl.children)e.setAttribute(`aria-selected`,String(e.dataset.type===t));let n=e.registry.get(t);Ym(this.descEl,n&&n.description||``),this.builtType!==t&&this._buildForm(t),this._refreshCommand()}_buildForm(e){let t=this.manager,n=t.registry.get(e),r=this.store.byType[e],i=n.clampParams(r&&r.params?r.params:{});this.fields=[],this.formEl.replaceChildren();for(let n of t.schema(e)){let e=this._makeField(n,i[n.key]);this.fields.push(e),this.formEl.append(e.el)}this.fields.length||this.formEl.append($(`div`,{class:`ap-hint`,text:`This disaster has no parameters.`})),this.seedInput.value=String(r&&Number.isFinite(Number(r.seed))?Math.max(0,Math.floor(Number(r.seed))):1),this.builtType=e}_makeField(e,t){switch(e.type){case`number`:return this._fieldNumber(e,t,!1);case`angle`:return this._fieldNumber(e,t,!0);case`select`:return this._fieldSelect(e,t);case`boolean`:return this._fieldBoolean(e,t);case`position`:return this._fieldPosition(e,t);default:return this._fieldText(e,t)}}_fieldNumber(e,t,n){let r=`ap-f-`+e.key,i=Number.isFinite(e.min)?e.min:n?0:void 0,a=Number.isFinite(e.max)?e.max:n?360:void 0,o=n?`°`:e.unit?` `+e.unit:``,s=Number.isFinite(e.step)&&e.step>0?e.step:n?1:`any`,c=$(`span`,{class:`ap-val`}),l=n?$(`span`,{class:`ap-compass`,id:`ap-c-`+e.key,title:`Compass heading (0 = north, 90 = east)`}):null,u=$(`input`,{type:`range`,id:`ap-s-`+e.key,min:String(i??0),max:String(a??100),step:String(s),"aria-label":e.label+` slider`}),d=$(`input`,{type:`number`,id:r,min:i===void 0?void 0:String(i),max:a===void 0?void 0:String(a),step:String(s)}),f=$(`div`,{class:`ap-field`,"data-key":e.key},$(`label`,{for:r},$(`span`,{},e.label,e.unit?$(`span`,{class:`ap-unit`,text:` (${e.unit})`}):null),c),$(`div`,{class:`ap-row`},u,l,d),$(`div`,{class:`ap-minmax`},$(`span`,{text:`min ${i??`−∞`}${o}`}),$(`span`,{text:`max ${a??`∞`}${o}`}))),p=Number(t),m=()=>{Ym(c,Qm(p,e.step)+o),l&&Ym(l,$m(p))},h=e=>{if(typeof s!=`number`)return e;let t=Number.isFinite(i)?i:0;return Number((Math.round((e-t)/s)*s+t).toFixed(Zm(s)))},g=t=>{t=Number(t),Number.isFinite(t)||(t=Number(e.default)||0),p=Xm(h(t),i,a),u.value=String(p),d.value=Qm(p,e.step),m()};return u.addEventListener(`input`,()=>{g(u.value),this._onFieldInput()}),d.addEventListener(`input`,()=>{let e=Number(d.value);d.value!==``&&Number.isFinite(e)&&(p=Xm(e,i,a),u.value=String(p),m(),this._onFieldInput())}),d.addEventListener(`change`,()=>{g(d.value),this._onFieldInput()}),g(t),{key:e.key,schema:e,el:f,get:()=>p,set:g}}_fieldSelect(e,t){let n=`ap-f-`+e.key,r=Array.isArray(e.options)?e.options:[],i=$(`select`,{id:n,"aria-label":e.label},r.map(e=>$(`option`,{value:String(e),text:String(e)}))),a=$(`div`,{class:`ap-field`,"data-key":e.key},$(`label`,{for:n},$(`span`,{text:e.label})),$(`div`,{class:`ap-row`},i)),o=t=>{i.value=r.includes(t)?String(t):String(e.default)};return i.addEventListener(`change`,()=>this._onFieldInput()),o(t),{key:e.key,schema:e,el:a,get:()=>i.value,set:o}}_fieldBoolean(e,t){let n=`ap-f-`+e.key,r=$(`input`,{type:`checkbox`,id:n}),i=$(`div`,{class:`ap-field`,"data-key":e.key},$(`label`,{class:`ap-check`,for:n},r,$(`span`,{text:e.label})));r.addEventListener(`change`,()=>this._onFieldInput());let a=e=>{r.checked=!!e};return a(t),{key:e.key,schema:e,el:i,get:()=>r.checked,set:a}}_fieldPosition(e,t){let n=`ap-f-${e.key}-x`,r=`ap-f-${e.key}-z`,i=$(`input`,{type:`number`,id:n,step:`1`,"aria-label":e.label+` x`}),a=$(`input`,{type:`number`,id:r,step:`1`,"aria-label":e.label+` z`}),o=$(`button`,{class:`ap-btn ap-mini ap-use-me`,type:`button`,text:`Use my position`,title:`Player position (game.player.pos)`}),s=$(`button`,{class:`ap-btn ap-mini ap-use-hit`,type:`button`,text:`Use crosshair target`,title:`Block under the crosshair (game.lastHit)`}),c=$(`div`,{class:`ap-field`,"data-key":e.key},$(`div`,{class:`ap-label`},$(`span`,{text:e.label}),$(`span`,{class:`ap-unit`,text:`(blocks, ±4000)`})),$(`div`,{class:`ap-pos`},$(`label`,{class:`ap-axis`,for:n,text:`x`}),i,$(`label`,{class:`ap-axis`,for:r,text:`z`}),a),$(`div`,{class:`ap-pos`},o,s)),l=(e,t)=>{let n=Number(e.value);return e.value!==``&&Number.isFinite(n)?Xm(n,-4e3,4e3):t},u=Array.isArray(e.default)?e.default:[0,0],d=e=>{let t=Array.isArray(e)&&e.length>=2?e:u;i.value=String(Number(t[0])||0),a.value=String(Number(t[1])||0)};for(let e of[i,a])e.addEventListener(`input`,()=>this._onFieldInput()),e.addEventListener(`change`,()=>{d([l(i,u[0]),l(a,u[1])]),this._onFieldInput()});return o.addEventListener(`click`,()=>{let t=this.game.player&&this.game.player.pos;if(!t){this._note(`Player position unavailable.`);return}d([Math.round(t.x),Math.round(t.z)]),this._onFieldInput(),this._note(`${e.label}: set to your position (${Math.round(t.x)}, ${Math.round(t.z)}).`)}),s.addEventListener(`click`,()=>{let t=this._crosshairTarget();if(!t){this._note(`No block under the crosshair.`);return}d([t.x,t.z]),this._onFieldInput(),this._note(`${e.label}: set to crosshair target (${t.x}, ${t.y}, ${t.z}).`)}),d(t),{key:e.key,schema:e,el:c,get:()=>[l(i,u[0]),l(a,u[1])],set:d}}_fieldText(e,t){let n=`ap-f-`+e.key,r=$(`input`,{type:`text`,id:n,class:`ap-input`}),i=$(`div`,{class:`ap-field`,"data-key":e.key},$(`label`,{for:n},$(`span`,{text:e.label}),$(`span`,{class:`ap-unit`,text:e.type})),$(`div`,{class:`ap-row`},r)),a=e=>{r.value=e==null?``:typeof e==`string`?e:JSON.stringify(e)};return r.addEventListener(`input`,()=>this._onFieldInput()),a(t),{key:e.key,schema:e,el:i,get:()=>{try{return JSON.parse(r.value)}catch{return r.value}},set:a}}_crosshairTarget(){let e=this.game;if(e.lastHit)return e.lastHit;if(!e.player||!e.world)return null;try{let t=e.player.eyePos(1,new I),n=e.player.forwardDir(new I);return em(e.world,t,n,Km)||null}catch{return null}}_readParams(){let e=this.manager,t=e&&e.registry.get(this.selectedType),n={};for(let e of this.fields)n[e.key]=e.get();return t?t.clampParams(n):n}_readSeed(){let e=Math.floor(Number(this.seedInput.value));return Number.isFinite(e)&&e>=0?e>>>0:1}_onFieldInput(){this._storeCurrent(),this._refreshCommand(),this.status&&this.status.state===`preview`&&this._schedulePreviewRefresh()}_resetDefaults(){for(let e of this.fields)e.set(e.schema.default);this._onFieldInput(),this._note(`Parameters reset to defaults.`)}_randomizeSeed(){this.seedInput.value=String(Math.floor(Math.random()*1e6)),this._onFieldInput()}_schedulePreviewRefresh(){this.previewTimer&&clearTimeout(this.previewTimer),this.previewTimer=setTimeout(()=>{this.previewTimer=null;let e=this.manager;this.isOpen&&e&&e.state===`preview`&&this._cmd({type:`preview`,disaster:this.selectedType,params:this._readParams(),seed:this._readSeed()},!0)},Wm)}_load(){let e=null;try{e=JSON.parse(localStorage.getItem(Bm)||`null`)}catch{e=null}e&&typeof e==`object`&&(e.byType&&typeof e.byType==`object`&&(this.store.byType=e.byType),typeof e.selected==`string`&&(this.store.selected=e.selected));let t=this.manager;if(t&&t.registry.has(this.store.selected)&&(this.selectedType=this.store.selected),t&&this.selectedType&&this.tabsSignature){if(this.builtType!==this.selectedType)this._applySelection();else{let e=this.store.byType[this.selectedType];if(e){let n=t.registry.get(this.selectedType).clampParams(e.params||{});for(let e of this.fields)e.set(n[e.key]);Number.isFinite(Number(e.seed))&&(this.seedInput.value=String(Math.max(0,Math.floor(Number(e.seed)))))}this._applySelection()}}}_storeCurrent(){this.builtType&&(this.store.byType[this.builtType]={params:this._readParams(),seed:this._readSeed()},this.store.selected=this.selectedType,this._scheduleSave())}_scheduleSave(){this.saveTimer&&clearTimeout(this.saveTimer),this.saveTimer=setTimeout(()=>this._flushSave(),Gm)}_flushSave(){this.saveTimer&&(clearTimeout(this.saveTimer),this.saveTimer=null);try{localStorage.setItem(Bm,JSON.stringify({v:1,selected:this.store.selected,byType:this.store.byType}))}catch{}}_cmd(e,t=!1){let n=this.manager;if(!n)return{ok:!1,reason:`no disaster manager`};let r;try{r=n.command(e)}catch(e){console.error(`disaster command failed`,e),r={ok:!1,reason:e.message}}return r&&r.ok===!1&&!t?this._note(r.reason||`Command rejected.`):r&&r.pending&&!t&&this._note(`Command sent to the server…`),this._refreshStatus(),r}_currentCommand(e=`start`){return{type:e,disaster:this.selectedType,seed:this._readSeed(),params:this._readParams()}}_onPreview(){let e=this.manager;if(e){if(e.state===`preview`){this._cmd({type:`stop`});return}if(e.state===`running`||e.state===`paused`||e.state===`restoring`){this._note(`Stop the current disaster before previewing.`);return}this._cmd(this._currentCommand(`preview`))}}_onStart(){let e=this.manager;if(!e||!this.selectedType)return;if(e.state===`running`||e.state===`paused`){this._note(`A disaster is already running - stop it first.`);return}if(e.state===`restoring`){this._note(`Wait for the restore to finish.`);return}let t=this._currentCommand(`start`),n=e.registry.get(t.disaster),r=[];try{r=(new n(e,t.params,t.seed).warnings()||[]).map(String)}catch(e){r=[`Could not compute warnings: `+(e&&e.message?e.message:e)]}let i=Object.entries(t.params).map(([e,t])=>`${e}=${Array.isArray(t)?t.join(`,`):t}`).join(`   `);this._confirm({title:`Start ${n.label}?`,text:`Seed ${t.seed}.  ${i}`,warnings:r.length?r:[`No specific warnings for this configuration.`],notice:Jm,confirmLabel:`I understand, start`,danger:!0,onConfirm:()=>this._cmd(t)})}_onPauseResume(){let e=this.manager;e&&(e.state===`running`?this._cmd({type:`pause`}):e.state===`paused`&&this._cmd({type:`resume`}))}_onReset(){let e=this.manager;if(!e)return;let t=e.journal.size;this._confirm({title:`Reset / restore the world?`,text:t?`Restores ${t} journaled block${t===1?``:`s`} to their original state (newest damage first), clears debris and ends the current disaster.`:`Ends the current disaster and clears debris (the journal is empty, nothing to restore).`,confirmLabel:`Restore world`,onConfirm:()=>this._cmd({type:`reset`})})}_onReplay(){let e=this.manager;if(!e||!e.lastCommand){this._note(`Nothing to replay yet - start a disaster first.`);return}let t=e.lastCommand,n=e.registry.get(t.disaster);this._confirm({title:`Replay last disaster?`,text:`Restores the world (${e.journal.size} journaled blocks), then re-runs ${n?n.label:t.disaster} with the same seed (${t.seed}) and parameters: ${Object.entries(t.params||{}).map(([e,t])=>`${e}=${Array.isArray(t)?t.join(`,`):t}`).join(`   `)}`,notice:Jm,confirmLabel:`Replay`,danger:!0,onConfirm:()=>this._cmd({type:`replay`})})}_onCommit(){let e=this.manager,t=this.game.save;if(!e||!t)return;if(e.state!==`finished`&&e.state!==`idle`||e.journal.size===0){this._note(`Commit is only possible after a disaster has finished, with a non-empty journal.`);return}let n=e.journal.changes(this.game.world);this._confirm({title:`Commit damage to save?`,text:`Bakes ${n.length} changed block${n.length===1?``:`s`} (${e.journal.size} journaled cells) into your persistent save. After this the damage can no longer be restored with Reset.`,confirmLabel:`Commit to save`,danger:!0,onConfirm:()=>{if(e.state!==`finished`&&e.state!==`idle`||e.journal.size===0){this._note(`State changed - commit cancelled.`);return}let n=e.journal.changes(this.game.world);t.commitDisaster(n),e.journal.clear(),e.say?e.say(`Committed ${n.length} block changes to the save.`):this.game.hud&&this.game.hud.addMessage(`Committed ${n.length} block changes to the save.`),this._refreshStatus()}})}_onDiscard(){let e=this.manager;e&&this._confirm({title:`Discard disaster damage?`,text:`Restores ${e.journal.size} journaled blocks to their pre-disaster state and clears debris. Nothing is written to the save.`,confirmLabel:`Discard & restore`,onConfirm:()=>this._cmd({type:`reset`})})}_onLiveIntensity(){let e=Number(this.liveSlider.value);Ym(this.liveVal,Qm(e,.05)),this.liveTimer&&clearTimeout(this.liveTimer),this.liveTimer=setTimeout(()=>{this.liveTimer=null;let t=this.manager;t&&(t.state===`running`||t.state===`paused`)&&this._cmd({type:`set`,params:{intensity:e}},!0)},Um)}_confirm({title:e,text:t,warnings:n=[],notice:r,confirmLabel:i=`Confirm`,danger:a=!1,onConfirm:o}){let s=$(`div`,{class:`ap-dialog`,role:`alertdialog`,"aria-modal":`true`,"aria-labelledby":`ap-dialog-title`},$(`h4`,{id:`ap-dialog-title`,text:e}),t?$(`p`,{text:t}):null,n.length?$(`div`,{class:`ap-warnings`,id:`ap-dialog-warnings`},n.map(e=>$(`div`,{text:e}))):null,r?$(`div`,{class:`ap-notice`,text:r}):null,$(`div`,{class:`ap-dialog-buttons`},$(`button`,{class:`ap-btn`,type:`button`,id:`ap-dialog-cancel`,text:`Cancel`,onclick:()=>this._closeDialog()}),$(`button`,{class:`ap-btn `+(a?`ap-danger`:`ap-primary`),type:`button`,id:`ap-dialog-confirm`,text:i,onclick:()=>{this._closeDialog(),o()}})));this.overlay.replaceChildren(s),this.overlay.hidden=!1,this.dialogOpen=!0,s.querySelector(`#ap-dialog-cancel`).focus({preventScroll:!0})}_closeDialog(){this.dialogOpen&&(this.dialogOpen=!1,this.overlay.hidden=!0,this.overlay.replaceChildren(),this.isOpen&&this.root.focus({preventScroll:!0}))}_note(e){Ym(this.noteEl,e),this.noteTimer&&clearTimeout(this.noteTimer),this.noteTimer=setTimeout(()=>{this.noteTimer=null,Ym(this.noteEl,``)},4e3)}_refreshCommand(){if(!this.selectedType){this.cmdArea.value=``;return}let e=`game.disasters.command(${th(this._currentCommand(`start`))})`;this.cmdArea.value!==e&&(this.cmdArea.value=e)}async _copyCommand(){let e=this.cmdArea.value,t=!1;try{navigator.clipboard&&window.isSecureContext&&(await navigator.clipboard.writeText(e),t=!0)}catch{t=!1}if(!t)try{this.cmdArea.focus(),this.cmdArea.select(),t=document.execCommand(`copy`)}catch{t=!1}Ym(this.copiedEl,t?`Copied!`:`Copy failed - select the text and press Ctrl+C`),this.copyTimer&&clearTimeout(this.copyTimer),this.copyTimer=setTimeout(()=>{this.copyTimer=null,Ym(this.copiedEl,``)},2500)}_refreshStatus(e){let t=this.manager;if(!t)return;e||(e=t.status()),this.status=e;let n=e.type?t.registry.get(e.type):null;Ym(this.badgeState,e.state),this.badgeState.dataset.state=e.state,Ym(this.badgeOnline,e.online?`online`:`offline`),this.badgeOnline.dataset.on=String(!!e.online),Ym(this.badgeAdmin,e.admin?`admin`:`no admin`),this.badgeAdmin.dataset.admin=String(!!e.admin),Ym(this.stType,n?`${n.label} (${e.type})`:`—`),Ym(this.stElapsed,`${e.elapsed.toFixed(1)} s`+(e.tick?`  (tick ${e.tick})`:``)),Ym(this.stSeed,e.seed===null||e.seed===void 0?`—`:String(e.seed)),Ym(this.stJournal,`${e.journal} cell${e.journal===1?``:`s`}`),Ym(this.stDebris,String(e.debris)),Ym(this.stEdits,`${e.edits} / ${e.restored}`);let r=Math.round(Math.max(0,Math.min(1,e.progress||0))*100)+`%`;this.progressFill.style.width!==r&&(this.progressFill.style.width=r),Ym(this.progressLabel,e.state===`idle`?``:r);let i=e.state===`restoring`;if(this.restoreBox.hidden===i&&(this.restoreBox.hidden=!i),i){let t=Math.round((e.restoreProgress||0)*100)+`%`;this.restoreFill.style.width!==t&&(this.restoreFill.style.width=t),Ym(this.restoreLabel,t)}let a=(e.messages||[]).slice(-4),o=a.join(`
`);o!==this.lastLog&&(this.lastLog=o,this.logEl.replaceChildren(...a.length?a.map(e=>$(`div`,{text:e})):[$(`div`,{class:`ap-empty`,text:`No messages yet.`})]));let s=e.state===`running`,c=e.state===`paused`,l=e.state===`preview`,u=e.state===`finished`,d=!!e.admin,f=(e,t)=>{e.disabled!==t&&(e.disabled=t)};f(this.btnPreview,!d||i||s||c||!this.selectedType),Ym(this.btnPreview,l?`Stop preview`:`Preview`),this.btnPreview.classList.toggle(`ap-active`,l),f(this.btnStart,!d||i||s||c||!this.selectedType),f(this.btnPause,!d||!(s||c)),Ym(this.btnPause,c?`Resume`:`Pause`),f(this.btnStop,!d||!(s||c||l)),f(this.btnReset,!d||i||e.state===`idle`&&e.journal===0),f(this.btnReplay,!d||i||!t.lastCommand);let p=t.lastCommand?`Restore, then re-run ${(t.registry.get(t.lastCommand.disaster)||{}).label||t.lastCommand.disaster} with seed ${t.lastCommand.seed}`:`Nothing to replay yet`;this.btnReplay.title!==p&&(this.btnReplay.title=p),f(this.btnCommit,!d||!((u||e.state===`idle`)&&e.journal>0)),f(this.btnDiscard,!d||i||e.journal===0);let m=d&&(s||c)&&!!e.params&&typeof e.params.intensity==`number`;if(f(this.liveSlider,!m),this.liveBox.dataset.enabled!==String(m)&&(this.liveBox.dataset.enabled=String(m)),m&&document.activeElement!==this.liveSlider&&!this.liveTimer){let t=String(e.params.intensity);this.liveSlider.value!==t&&(this.liveSlider.value=t),Ym(this.liveVal,Qm(e.params.intensity,.05))}else m||Ym(this.liveVal,e.params&&typeof e.params.intensity==`number`?Qm(e.params.intensity,.05):`—`);let h=this.game.save;Ym(this.saveHint,`Journal: ${e.journal} cell${e.journal===1?``:`s`}`+(h?`  \u00b7  saved edits: ${h.count}${h.dirty?` (writing…)`:``}`:``)+(e.journal>0&&!(u||e.state===`idle`)?`  ·  stop the disaster to commit`:``))}_refreshPerf(){let e=this.game.perf;if(!e||!this.isOpen)return;let t;try{let n=e.summary(),r=n.memoryMB?`${n.memoryMB.used.toFixed(0)} MB`:`mem n/a`,i=n.gpuMs?` \u00b7 gpu ${n.gpuMs.avg.toFixed(1)} ms`:``;t=`${n.fps.toFixed(0)} fps \u00b7 js ${n.jsMs.avg.toFixed(1)} ms${i} \u00b7 ${n.draw.calls} draws \u00b7 ${r}`;let a=`frame ${n.frameMs.avg.toFixed(1)} ms (p95 ${n.frameMs.p95.toFixed(1)}, max ${n.frameMs.max.toFixed(0)}) \u00b7 js p95 ${n.jsMs.p95.toFixed(1)} ms \u00b7 ${(n.draw.triangles/1e3).toFixed(0)}k tris \u00b7 geometries ${n.geometries} \u00b7 textures ${n.textures} \u00b7 long tasks ${n.longTasks}`;this.perfEl.title!==a&&(this.perfEl.title=a)}catch{t=`perf: n/a`}Ym(this.perfEl,t)}},rh=100,ih=150,ah=1e3,oh=2500,sh=40,ch=50;function lh(e,t,n){let r=t-e;for(;r>Math.PI;)r-=Math.PI*2;for(;r<-Math.PI;)r+=Math.PI*2;return e+r*n}var uh=new Map;function dh(e){if(uh.has(e))return uh.get(e);let t=G[e],n=.3,r=[],i=[],a=[],o=[{v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],uv:(e,t,n)=>[1-n,1-t]},{v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],uv:(e,t,n)=>[n,1-t]},{v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],uv:(e,t,n)=>[e,n]},{v:[[1,0,1],[0,0,1],[0,0,0],[1,0,0]],uv:(e,t,n)=>[1-e,n]},{v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],uv:(e,t,n)=>[e,1-t]},{v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],uv:(e,t,n)=>[1-e,1-t]}],s=t.icon===`slab`?.5:1;for(let e=0;e<6;e++){let c=o[e],[l,u,d]=vu(t.tex[e]),f=r.length/3;for(let e of c.v){r.push((e[0]-.5)*n,(e[1]*s-.5)*n,(e[2]-.5)*n);let[t,a]=c.uv(e[0],e[1],e[2]);i.push(l+t*d,u+a*d)}a.push(f,f+1,f+2,f,f+2,f+3)}let c=new Er;return c.setAttribute(`position`,new mr(r,3)),c.setAttribute(`uv`,new mr(i,2)),c.setIndex(a),uh.set(e,c),c}function fh(e){let t=Ul(e,2)+8,n=document.createElement(`canvas`);n.width=t,n.height=22;let r=n.getContext(`2d`);r.fillStyle=`rgba(0,0,0,0.35)`,r.fillRect(0,0,t,22),Wl(r,e,4,3,2,`#ffffff`,!0);let i=new na(n);i.magFilter=f,i.minFilter=f,i.colorSpace=``;let a=new Kr(new Mr({map:i,transparent:!0,depthTest:!0,depthWrite:!1}));return a.scale.set(t*.0125,.275,1),a.position.set(0,2.25,0),a.visible=!1,a}var ph=class{constructor(e,t,n){this.mgr=e,this.id=t,this.name=n||`Player${t}`;let r=Ld({role:`cowboy`,seed:t});this.model=Qd(r.canvas,r.hat,r.hatColor),this.root=this.model.root,this.root.visible=!1,this.tag=fh(this.name),this.root.add(this.tag),this.snapshots=[],this.pos=new I,this.lastPos=null,this.yaw=0,this.pitch=0,this.speed=0,this.walkTime=0,this.sneak=!1,this.sprint=!1,this.held=0,this.heldMesh=null,this.lightTimer=t%6,this.lastSeen=0,this.everSeen=!1,this.armSwing=0}push(e,t,n){let r=this.snapshots,i=r[r.length-1];if(!(i&&t<i.t)){if(i){let n=e.x-i.x,a=e.z-i.z,o=Math.max(ch,t-i.t);Math.abs(n)>12||Math.abs(a)>12||Math.abs(e.y-i.y)>12||Math.hypot(n,a)*1e3/o>sh?(r.length=0,this.speed=0,this.lastPos=null):t===i.t&&r.pop()}for(r.push({t,x:e.x,y:e.y,z:e.z,yaw:e.yaw||0,pitch:e.pitch||0});r.length>2&&t-r[0].t>ah;)r.shift();r.length>20&&r.shift(),this.sneak=!!e.sneak,this.sprint=!!e.sprint,this.setHeld(Number.isInteger(e.held)?e.held:0),this.lastSeen=n,this.everSeen=!0}}setHeld(e){if(e===this.held)return;this.held=e,this.heldMesh&&(this.model.rightArm.remove(this.heldMesh),this.heldMesh.material.dispose(),this.heldMesh=null);let t=G[e];if(!e||!t||!this.mgr.game.entityMaterial)return;let n=new mi(dh(e),this.mgr.game.entityMaterial.clone());n.position.set(-1*Q,-10*Q,-4*Q),n.rotation.set(.15,.35,0),this.model.rightArm.add(n),this.heldMesh=n}sample(e){let t=this.snapshots;if(t.length===0)return!1;let n=e-rh,r=0;for(;r<t.length&&t[r].t<n;)r++;let i,a,o,s,c;if(r===0){let e=t[0];i=e.x,a=e.y,o=e.z,s=e.yaw,c=e.pitch}else if(r>=t.length){let e=t.length,r=t[e-1];if(i=r.x,a=r.y,o=r.z,s=r.yaw,c=r.pitch,e>=2&&r.t-t[e-2].t>=20){let s=t[e-2],c=Math.min(ih,n-r.t)/(r.t-s.t);i+=(r.x-s.x)*c,o+=(r.z-s.z)*c,a+=(r.y-s.y)*c}}else{let e=t[r-1],l=t[r],u=(n-e.t)/(l.t-e.t||1);i=e.x+(l.x-e.x)*u,a=e.y+(l.y-e.y)*u,o=e.z+(l.z-e.z)*u,s=lh(e.yaw,l.yaw,u),c=e.pitch+(l.pitch-e.pitch)*u}return this.pos.set(i,a,o),this.yaw=s,this.pitch=c,!0}dispose(){this.setHeld(0),this.root.traverse(e=>{e.geometry&&e!==this.tag&&e.geometry.dispose()}),this.model.material.dispose();for(let e of this.model.head.children)e.material&&e.material.dispose();this.tag.material.map.dispose(),this.tag.material.dispose()}},mh=class{constructor(e){this.game=e,this.group=new wn,this.group.name=`remote-players`,e.scene.add(this.group),this.players=new Map,this.visibleCount=0}get count(){return this.players.size}activeCount(e=performance.now()){let t=0;for(let n of this.players.values())n.everSeen&&e-n.lastSeen<oh&&t++;return t}ensure(e,t){let n=this.players.get(e);return n?t&&n.name!==t&&(n.name=t,n.root.remove(n.tag),n.tag.material.map.dispose(),n.tag.material.dispose(),n.tag=fh(t),n.root.add(n.tag)):(n=new ph(this,e,t),this.players.set(e,n),this.group.add(n.root)),n}onJoin(e,t){this.ensure(e,t)}onLeave(e){let t=this.players.get(e);t&&(this.group.remove(t.root),t.dispose(),this.players.delete(e))}onList(e,t){let n=performance.now(),r=Number.isFinite(t)?t*50:n;for(let t of e)Number.isInteger(t.id)&&this.ensure(t.id,t.name).push(t,r,n)}clear(){for(let e of[...this.players.keys()])this.onLeave(e)}update(e,t){let n=performance.now(),r=this.game.camera.position,i=0;for(let a of this.players.values()){let o=a.root;if(t===null||!a.everSeen||n-a.lastSeen>oh||!a.sample(t)){o.visible=!1,a.lastPos=null;continue}let s=a.pos.x-r.x,c=a.pos.z-r.z,l=s*s+c*c;if(l>14400){o.visible=!1,a.lastPos=null;continue}if(o.visible=!0,i++,a.lastPos&&e>0){let t=Math.hypot(a.pos.x-a.lastPos.x,a.pos.z-a.lastPos.z)/e;a.speed+=(Math.min(t,12)-a.speed)*Math.min(1,e*10)}else a.lastPos=new I;a.lastPos.copy(a.pos),a.speed<.15&&(a.speed=0),a.walkTime+=a.speed*e*2.2,o.position.set(a.pos.x,a.pos.y-(a.sneak?.22:0),a.pos.z),o.rotation.y=a.yaw+Math.PI;let u=a.model,d=Math.min(1,a.speed/4.3)*.75,f=Math.sin(a.walkTime)*d;if(u.rightLeg.rotation.x=f,u.leftLeg.rotation.x=-f,u.rightArm.rotation.x=-f*.9-(a.held?.35:0)-a.armSwing,u.leftArm.rotation.x=f*.9,u.rightArm.rotation.z=.05,u.leftArm.rotation.z=-.05,a.sneak?(u.body.rotation.x=.45,u.body.position.z=-.08,u.head.position.y=22*Q,u.head.position.z=-.12,u.rightArm.position.y=u.leftArm.position.y=20.5*Q,u.rightArm.position.z=u.leftArm.position.z=-.1):(u.body.rotation.x=0,u.body.position.z=0,u.head.position.y=24*Q,u.head.position.z=0,u.rightArm.position.y=u.leftArm.position.y=22*Q,u.rightArm.position.z=u.leftArm.position.z=0),u.head.rotation.x=-a.pitch,a.armSwing>0&&(a.armSwing=Math.max(0,a.armSwing-e*6)),++a.lightTimer>=6){a.lightTimer=0;let e=this.game.world.sampleLight(a.pos.x,a.pos.y+1,a.pos.z);u.material.uniforms.uLight.value.set(e[0],e[1]);for(let t of u.head.children)t.material&&t.material.uniforms&&t.material.uniforms.uLight.value.set(e[0],e[1]);a.heldMesh&&a.heldMesh.material.uniforms.uLight.value.set(e[0],e[1])}a.tag.visible=l<1024,a.tag.position.y=a.sneak?2:2.25}this.visibleCount=i}swing(e){let t=this.players.get(e);t&&(t.armSwing=1.2)}dispose(){this.clear(),this.game.scene.remove(this.group)}},hh=50,gh=2,_h=2e3,vh=250,yh=4e3,bh=12e3,xh=1200,Sh=50,Ch=30,wh=40,Th=1e3,Eh=15e3,Dh=new Set([`start`,`preview`,`replay`]),Oh=e=>Math.round(e*100)/100,kh=e=>Math.round(e*1e3)/1e3,Ah=e=>Math.atan2(Math.sin(e),Math.cos(e)),jh=class{constructor(e,t){this.game=e,this.url=t,this.connected=!1,this.stats={bytesIn:0,bytesOut:0,msgsIn:0,msgsOut:0,players:0,ping:0},this.id=null,this.admin=!1;let n=new URLSearchParams(location.search);this.name=(n.get(`name`)||``).slice(0,16),this.log=n.has(`netlog`),this.ws=null,this.disposed=!1,this.remote=new mh(e),this.blocks=new Map,this.queue=[],this.pendingLog=null,this.replay=null,this.sync=null,this.clockOffset=null,this.offsetSamples=[],this.pingMin=0,this.pingSeq=0,this.pingSent=new Map,this.lastPingAt=0,this.connectedAt=0,this.timer=null,this.drivesDisasterClock=!0,this.clockAccum=0,this.lastClockAt=0,this._simTick=null,this.reconnectDelay=Th,this.reconnectTimer=null,this.lastPos=null,this.posCountdown=0,this.lastDeny=null,this.denied=0,this.serverStats=null,this.tickCount=0,this._hookChunkGeneration(),this._installDisasterClock()}connect(){if(this.disposed||this.ws&&this.ws.readyState<=1)return;this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this._installDisasterClock();let e;try{e=new WebSocket(this.url)}catch(e){console.warn(`net: bad server url`,this.url,e),this._scheduleReconnect();return}this.ws=e,e.onopen=()=>{this.reconnectDelay=Th,this._send({t:`hello`,name:this.name,adminToken:this.game.permissions.adminToken})},e.onmessage=e=>this._onMessage(e),e.onclose=()=>this._onClose(e),e.onerror=()=>{},this.timer||(this.lastClockAt=performance.now(),this.clockAccum=0,this.timer=setInterval(()=>this._onTimer(),hh))}_onClose(e){if(e!==this.ws)return;let t=this.connected;this.connected=!1,this.ws=null,this.id=null,this.admin=!1,this.queue.length=0,this.replay=null,this.pendingLog=null,this.clockOffset=null,this.offsetSamples.length=0,this.pingMin=0,this.sync=null,this.lastPos=null,this.pingSent.clear(),this.timer&&(clearInterval(this.timer),this.timer=null),this.stats.players=0,this.remote.clear(),this.game.permissions.setOnline(!1),this.game.disasters&&(this.game.disasters.serverTick=null),t&&this.game.hud&&this.game.hud.addMessage(`Disconnected from server - reconnecting...`),this._scheduleReconnect()}_scheduleReconnect(){this.disposed||this.reconnectTimer||(this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=null,this.connect()},this.reconnectDelay),this.reconnectDelay=Math.min(Eh,this.reconnectDelay*2))}dispose(){if(this.disposed=!0,this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.timer&&(clearInterval(this.timer),this.timer=null),this.ws)try{this.ws.close(1e3,`client closed`)}catch{}this.ws=null,this.connected=!1,this.remote.dispose(),this.game.permissions.setOnline(!1)}_send(e){if(!this.ws||this.ws.readyState!==1)return!1;let t=JSON.stringify(e);return this.ws.send(t),this.stats.msgsOut++,this.stats.bytesOut+=t.length,!0}sendBlock(e,t,n,r){this.connected&&(this._rememberBlock(e,t,n,r),this._send({t:`block`,x:e,y:t,z:n,id:r}))}sendCommand(e){if(!this.connected){this.game.disasters.apply(e,!1);return}let{id:t,...n}=e;this._send({t:`cmd`,cmd:n})}requestServerStats(){return this._send({t:`stats`})}_sendPos(e=!1){let t=this.game.player;if(!t)return;let n=this.game.inventory?this.game.inventory.held:null,r={t:`pos`,x:Oh(t.pos.x),y:Oh(t.pos.y),z:Oh(t.pos.z),yaw:kh(Ah(t.yaw)),pitch:kh(t.pitch),held:n?n.id:0,sneak:!!t.sneaking,sprint:!!t.sprinting},i=this.lastPos;!e&&i&&i.x===r.x&&i.y===r.y&&i.z===r.z&&i.yaw===r.yaw&&i.pitch===r.pitch&&i.held===r.held&&i.sneak===r.sneak&&i.sprint===r.sprint||(this.lastPos=r,this._send(r))}_onMessage(e){let t=e.data;if(typeof t!=`string`)return;this.stats.msgsIn++,this.stats.bytesIn+=t.length;let n;try{n=JSON.parse(t)}catch{return}if(!(!n||typeof n!=`object`))switch(n.t){case`welcome`:this._onWelcome(n);break;case`players`:Array.isArray(n.list)&&this.remote.onList(n.list,n.tick);break;case`join`:this.remote.onJoin(n.id,n.name),this.game.hud&&this.game.hud.addMessage(`${n.name} joined the frontier.`);break;case`leave`:{let e=this.remote.players.get(n.id);e&&this.game.hud&&this.game.hud.addMessage(`${e.name} left.`),this.remote.onLeave(n.id);break}case`block`:this._applyBlock(n.x,n.y,n.z,n.id,!0),this.remote.swing(n.from);break;case`cmd`:n.cmd&&typeof n.cmd==`object`&&(this.queue.push(n.cmd),this.log&&console.log(`[net] cmd`,JSON.stringify(n.cmd)));break;case`tick`:this.clockOffset===null&&this._addOffsetSample(n.tick*hh-performance.now());break;case`pong`:{let e=this.pingSent.get(n.n);if(e!==void 0&&Number.isFinite(n.tick)){this.pingSent.delete(n.n);let t=performance.now(),r=t-e;this.stats.ping=this.stats.ping?this.stats.ping*.7+r*.3:r,this.pingMin=this.pingMin?Math.min(this.pingMin,r):r,this._addOffsetSample(n.tick*hh-(e+t)/2)}break}case`deny`:this.denied++,this.lastDeny=n.reason,this.game.hud&&this.game.hud.addMessage(`Server: `+n.reason);break;case`stats`:this.serverStats=n}}_onWelcome(e){if(this.id=e.id,this.admin=!!e.admin,this.connected=!0,this.connectedAt=performance.now(),this.clockOffset=null,this.offsetSamples.length=0,this.pingMin=0,this._addOffsetSample(e.tick*hh-performance.now()),this.game.permissions.setOnline(!0,this.admin),Array.isArray(e.players)&&this.remote.onList(e.players,e.tick),Array.isArray(e.blocks)){for(let t of e.blocks)Array.isArray(t)&&t.length>=4&&this._applyBlock(t[0],t[1],t[2],t[3],!1);e.blocks.length&&this.game.terrain.remeshDirty(64,this.game.player.pos.x,this.game.player.pos.z)}let t=this.game.disasters;this.queue.length=0,this.sync=null,t&&t.state!==`idle`&&t.apply({type:`reset`},!0),this.pendingLog=Array.isArray(e.log)?e.log:[],this.lastClockAt=performance.now(),this.clockAccum=0,this._sendPos(!0),this.lastPingAt=0;let n=Array.isArray(e.players)?e.players.length:0;this.game.hud&&this.game.hud.addMessage(`Connected to ${this.url}${this.admin?` as administrator`:``} (${n} other player${n===1?``:`s`} nearby).`),this.log&&console.log(`[net] welcome`,JSON.stringify({id:e.id,tick:e.tick,admin:e.admin,players:n,blocks:e.blocks?e.blocks.length:0,log:e.log?e.log.length:0}))}_rememberBlock(e,t,n,r){let i=`${Math.floor(e/16)},${Math.floor(n/16)}`,a=this.blocks.get(i);a||(a=new Map,this.blocks.set(i,a)),a.set(`${e},${t},${n}`,[e,t,n,r])}_applyBlock(e,t,n,r,i){if(!Number.isInteger(e)||!Number.isInteger(t)||!Number.isInteger(n)||!Number.isInteger(r)||t<0||t>=128)return;this._rememberBlock(e,t,n,r);let a=this.game.world;a.isLoaded(e,n)&&a.setBlock(e,t,n,r)&&(i&&this.game.terrain.remeshDirtyNear(e,n),this.game.npcs&&this.game.npcs.onWorldChanged(e,t,n))}_hookChunkGeneration(){let e=this.game.terrain;if(!e)return;let t=e.onChunkGenerated;e.onChunkGenerated=e=>{t&&t(e);let n=this.blocks.get(`${e.cx},${e.cz}`);if(n)for(let[t,r,i,a]of n.values())e.blocks[((t&15)*16+(i&15))*128+r]=a}}_addOffsetSample(e){if(!Number.isFinite(e))return;let t=performance.now(),n=this.offsetSamples;for(n.push({offset:e,t});n.length>1&&t-n[0].t>bh;)n.shift();let r=-1/0;for(let e of n)e.offset>r&&(r=e.offset);this.clockOffset=r}estimatedServerTick(){return this.clockOffset===null?null:(performance.now()+this.clockOffset)/hh}get serverTick(){let e=this.estimatedServerTick();return e===null?null:Math.floor(e)}get replaying(){return!!this.replay||!!this.pendingLog}_expectedDisasterTick(){if(!this.sync)return null;if(this.sync.pausedAt!==null)return Math.floor(this.sync.pausedAt-this.sync.startTick-this.sync.pausedTicks);let e=this.estimatedServerTick();return e===null?null:Math.floor(e-this.sync.startTick-this.sync.pausedTicks)}_installDisasterClock(){let e=this.game.disasters;if(!e||this._simTick)return;let t=e.simTick.bind(e);this._simTick=t,e.simTick=()=>{this.connected&&this.drivesDisasterClock||t()}}_clockTick(){let e=this.game.disasters,t=performance.now();if(!e||!this._simTick||!this.drivesDisasterClock){this.lastClockAt=t;return}if(this.replay||this.pendingLog){this.lastClockAt=t,this.clockAccum=0;return}if(e.state===`running`&&this.sync){let t=this._expectedDisasterTick();if(t!==null){let n=Math.min(t-e.tick,wh);for(this.log&&n>2&&console.log(`[net] clock: catching up ${n} ticks`);n-->0&&e.state===`running`;)this._simTick()}this.clockAccum=0}else for(this.clockAccum=Math.min(this.clockAccum+(t-this.lastClockAt),2e3);this.clockAccum>=hh;)this.clockAccum-=hh,this._simTick();this.lastClockAt=t}tick(){this.tickCount++;let e=this.game.disasters;if(e&&(e.serverTick=this.serverTick),!this.connected)return;let t=performance.now(),n=t-this.connectedAt<yh?vh:_h;if(t-this.lastPingAt>=n){this.lastPingAt=t;let e=++this.pingSeq;this.pingSent.set(e,t),this.pingSent.size>8&&this.pingSent.delete(this.pingSent.keys().next().value),this._send({t:`ping`,n:e})}--this.posCountdown<=0&&(this.posCountdown=gh,this._sendPos()),this.stats.players=this.remote.activeCount(t),this._advanceDisasters()}_onTimer(){this.connected&&(this.stats.players=this.remote.activeCount(performance.now()),this._advanceDisasters())}_advanceDisasters(){let e=this.game.disasters;if(e){if(this.pendingLog&&e.state!==`restoring`){let e=this.pendingLog;this.pendingLog=null,this._startReplay(e)}this.replay||this._processQueue(),this._clockTick()}}_processQueue(){let e=this.game.disasters;for(;this.queue.length;){let t=this.queue[0];if(Dh.has(t.type)){let n=this.estimatedServerTick();if(n===null||n<t.startTick||e.state===`restoring`)break}this.queue.shift(),this._applyCommand(t)}}_applyCommand(e){let t=this.game.disasters,n=t.apply(e,!0);(!n||!n.ok)&&console.warn(`net: command not applied:`,e.type,n&&n.reason);let r=Number.isFinite(e.tick)?e.tick:this.estimatedServerTick();switch(e.type){case`start`:this.sync=n&&n.ok?{startTick:e.startTick,pausedTicks:0,pausedAt:null}:null;break;case`preview`:case`stop`:case`reset`:case`replay`:this.sync=null;break;case`pause`:this.sync&&this.sync.pausedAt===null&&(this.sync.pausedAt=r);break;case`resume`:this.sync&&this.sync.pausedAt!==null&&(this.sync.pausedTicks+=Math.max(0,r-this.sync.pausedAt),this.sync.pausedAt=null)}this.log&&console.log(`[net] applied ${e.type} at est ${this.serverTick} -> ${t.state}`)}_startReplay(e){let t=-1;for(let n=0;n<e.length;n++){let r=e[n];!r||typeof r!=`object`||(r.type===`stop`||r.type===`reset`?t=-1:Dh.has(r.type)&&(t=n))}if(t<0)return;let n=e[t];if(n.type===`replay`&&(n=n.command?{...n.command,type:`start`,id:n.id,tick:n.tick,startTick:n.startTick}:null),!n)return;let r=e.slice(t+1).filter(e=>e&&(e.type===`pause`||e.type===`resume`||e.type===`set`)),i=this.estimatedServerTick();if(i===null||i<n.startTick){this.queue.unshift(n,...r);return}if(n.type===`preview`){this._applyCommand(n);for(let e of r)this._applyCommand(e);return}if(n.type!==`start`)return;let a=this._replayGen(n,r),o=performance.now(),s=a.next();for(;!s.done&&performance.now()-o<Sh;)s=a.next();s.done||(this.replay=a)}*_replayGen(e,t){let n=this.game.disasters,r=this._simTick||n.simTick.bind(n);if(this._applyCommand(e),n.state!==`running`||!this.sync){this.sync=null;return}let i=0,a=null,o=[];for(let n of t){let t=Number.isFinite(n.tick)?Math.max(n.tick,e.startTick):e.startTick,r=Math.max(0,Math.floor(t-e.startTick-i-(a===null?0:t-a)));o.push({ev:n,pos:r}),n.type===`pause`&&a===null&&(a=t),n.type===`resume`&&a!==null&&(i+=t-a,a=null)}this.sync={startTick:e.startTick,pausedTicks:i,pausedAt:a};let s=this._expectedDisasterTick()||0,c=Math.max(0,s-xh);c>0&&n.active&&(n.tick=c,n.active.tick=c);let l=performance.now(),u=l,d=0,f=()=>performance.now()-u>Ch;for(let{ev:e,pos:t}of o){for(;n.state===`running`&&n.tick<t;)r(),d++,f()&&(yield,u=performance.now());let i=n.apply(e,!0);(!i||!i.ok)&&this.log&&console.log(`[net] replay event rejected`,e.type)}for(;n.state===`running`;){let e=this._expectedDisasterTick();if(e===null||n.tick>=e)break;r(),d++,f()&&(yield,u=performance.now())}this.log&&console.log(`[net] late-join replay: ${e.disaster} seed ${e.seed}, fast-forwarded ${d} ticks (skipped ${c}) in ${(performance.now()-l).toFixed(0)} ms -> tick ${n.tick}`)}update(e){this.replay&&this.replay.next().done&&(this.replay=null);let t=this.estimatedServerTick();this.remote.update(e,t===null?null:t*hh)}},Mh=1337,Nh=.15*Math.PI/180,Ph=class{constructor(){this.canvas=document.getElementById(`game`),this.hudCanvas=document.getElementById(`hud`),this.loading=!0,this.viewBobbing=!0,this.lookingAtName=null,this.breakProgress=0,this.breakTarget=null,this.breakCooldown=0,this.placeCooldown=0,this.hitSoundTimer=0,this.accumulator=0,this.lastTime=performance.now(),this.frameCount=0,this.fpsTimer=0,this.fps=0,this.fov=70,this.fovCurrent=70,this.time=0,this.smokeSources=[],this.npcs=null,this.animals=null,this.train=null,this.town=null}async start(){let e=new Tl({canvas:this.canvas,antialias:!1,powerPreference:`high-performance`});e.setPixelRatio(Math.min(window.devicePixelRatio,1.5)),e.setSize(window.innerWidth,window.innerHeight),e.outputColorSpace=Qe,e.autoClear=!1,this.renderer=e,this.perf=new bm(e),this.startedAt=performance.now(),this.scene=new Mn,this.camera=new Ha(70,window.innerWidth/window.innerHeight,.05,1e3),this.camera.rotation.order=`YXZ`,mu(),Su(),this.permissions=new xm,this.save=new Cm(Mh),this.setLoading(`Planning the frontier town...`,.02),await this.nextFrame(),this.gen=new Fu(Mh),await this.setupTown(),this.world=new Ru(this.gen);for(let[e,t,n,r]of this.signAssignments)this.world.signTiles.set(Ru.posKey(e,t,n),r);this.atlas=gu,this.terrain=new Cp(this.world,this.scene,gu),this.terrain.onChunkGenerated=e=>this.save.applyToChunk(e),this.terrain.pinRegion(this.town.bounds.x0,this.town.bounds.z0,this.town.bounds.x1,this.town.bounds.z1),this.sky=new Up(this.scene,this.camera),this.player=new Df(this.world),this.input=new wp(this.canvas),this.hud=new Mp(this.hudCanvas,this),this.inventory=new sm,this.highlight=new am(this.scene);let t=[];for(let e=0;e<10;e++)t.push(uu[`destroy_`+e]);this.crack=new om(this.scene,gu,vu,t),this.particles=new mm(this.scene,this.world,gu),this.audio=new hm,this.hand=new vm(gu),this.entityMaterial=Ud(gu),this.drops=new um(this.scene,this.world,this.entityMaterial),this.hand.resize(window.innerWidth,window.innerHeight),this.particles.setCamera(this.camera,window.innerHeight*e.getPixelRatio()),[[W.OAK_PLANKS,64],[W.COBBLESTONE,64],[W.SPRUCE_PLANKS,64],[W.GLASS,32],[W.OAK_LOG,32],[W.BRICKS,64],[W.LANTERN,16],[W.OAK_FENCE,32],[W.TORCH,32]].forEach(([e,t],n)=>this.inventory.set(n,e,t));let n=new URLSearchParams(location.search),r=n.has(`x`)?parseFloat(n.get(`x`)):Nu.x,i=n.has(`z`)?parseFloat(n.get(`z`)):Nu.z;n.has(`time`)&&(this.sky.time=parseFloat(n.get(`time`))),n.has(`rd`)&&this.terrain.setRenderDistance(parseInt(n.get(`rd`),10)),this.debugLog=n.has(`debuglog`),this.startYaw=n.has(`yaw`)?parseFloat(n.get(`yaw`))*Math.PI/180:-Math.PI/2,this.setLoading(`Building terrain...`,.05);let a=this.terrain.preload(r,i),o=performance.now();for(let e of a)performance.now()-o>40&&(this.setLoading(`Building terrain...`,.05+e*.9),await this.nextFrame(),o=performance.now());this.setLoading(`Waking up the town...`,.96),await this.nextFrame(),await this.setupEntities();let s=n.has(`y`)?parseFloat(n.get(`y`)):this.world.surfaceY(Math.floor(r),Math.floor(i))+1;this.player.teleport(r,s,i),this.player.yaw=this.startYaw,this.player.pitch=n.has(`pitch`)?parseFloat(n.get(`pitch`))*Math.PI/180:-.08,this.spawnPoint={x:r,y:s,z:i},this.bindEvents(),this.loading=!1,this.perf.loadTimeMs=performance.now()-this.startedAt,document.getElementById(`loading`).style.display=`none`,this.hud.addMessage(`Welcome to the frontier. Click to grab the mouse.`),this.hud.addMessage(`WASD to move, Space to jump, double-tap W to sprint, E for blocks.`),this.lastTime=performance.now(),requestAnimationFrame(e=>this.loop(e))}async setupTown(){let e=yd();this.town=e,this.gen.addOverlay(e.overlay());let t=e.saloon.bounds;e.saloonPos={x:(t.x0+t.x1)/2,z:(t.z0+t.z1)/2},this.smokeSources=e.smoke,this.signAssignments=[];for(let t of e.signs){let e=hu(t.text,t.order.length);t.order.forEach(([n,r],i)=>this.signAssignments.push([n,t.y,r,e[i]]))}_u()}async setupEntities(){this.npcs=new Rf(this.scene,this.world,this.town,this.audio,this.hud),this.npcs.game=this,await this.nextFrame(),this.animals=new sp(this.scene,this.world,this.town,this.audio),this.train=new up(this.scene,this.world,this.audio,this.particles),this.disasters=new jm(this),this.disasters.register(Lm),this.disasters.register(Rm),this.disasters.register(zm),this.adminPanel=new nh(this);let e=new URLSearchParams(location.search).get(`server`);e&&(this.net=new jh(this,e),this.disasters.net=this.net,this.net.connect())}nextFrame(){return new Promise(e=>requestAnimationFrame(e))}setLoading(e,t){document.getElementById(`loading-text`).textContent=e,document.getElementById(`bar-fill`).style.width=Math.round(t*100)+`%`}bindEvents(){window.addEventListener(`resize`,()=>{this.renderer.setSize(window.innerWidth,window.innerHeight),this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.hand.resize(window.innerWidth,window.innerHeight),this.hud.resize(),this.particles.setCamera(this.camera,window.innerHeight*this.renderer.getPixelRatio())}),this.input.onMouseDown=e=>{this.loading||(this.audio.resume(),!this.input.locked&&!this.hud.screen&&this.input.requestLock())},this.input.onLockChange=e=>{!e&&!this.hud.screen&&this.openScreen(`pause`)},this.input.onKeyDown=e=>{if(!this.loading){if(e.code===`Escape`){if(this.hud.screen===`admin`){this.closeScreen();return}(this.hud.screen===`pause`||this.hud.screen===`inventory`)&&this.closeScreen();return}if(e.code===`F4`||e.code===`Backquote`){e.preventDefault(),this.hud.screen===`admin`?this.closeScreen():(!this.hud.screen||this.hud.screen===`pause`)&&(this.permissions.isAdmin()?this.openScreen(`admin`):this.hud.addMessage(`Disaster controls require administrator permission.`));return}if(this.hud.screen!==`admin`&&this.hud.screen!==`death`&&(e.code===`KeyE`&&(this.hud.screen===`inventory`?this.closeScreen():this.hud.screen||this.openScreen(`inventory`)),!this.hud.screen)){if(e.code===`KeyW`){let e=performance.now();e-(this.lastWPress||0)<300&&(this.doubleTapSprint=!0),this.lastWPress=e}if(e.code===`F3`&&(this.hud.debug=!this.hud.debug),e.code===`KeyT`&&(this.sky.time=(this.sky.time+1/12)%1,this.hud.addMessage(`Time set to `+this.sky.clockString())),e.code.startsWith(`Digit`)){let t=parseInt(e.code.slice(5),10);t>=1&&t<=9&&(this.inventory.selected=t-1,this.audio.click())}}}}}openScreen(e){this.hud.screen=e,this.input.releaseLock(),this.hudCanvas.style.cursor=`default`,e===`admin`&&this.adminPanel&&(this.adminPanel.open(),this.hudCanvas.style.pointerEvents=`none`)}closeScreen(){this.hud.screen===`admin`&&this.adminPanel&&(this.adminPanel.close(),this.hudCanvas.style.pointerEvents=``),this.hud.screen=null,this.hud.cursorItem=null,this.input.requestLock()}cycleRenderDistance(){let e=[4,6,7,8,10,12],t=e.indexOf(this.terrain.renderDistance);this.terrain.setRenderDistance(e[(t+1)%e.length])}respawn(){let e=this.spawnPoint,t=this.world.surfaceY(Math.floor(e.x),Math.floor(e.z))+1;this.player.respawn(e.x,t,e.z)}loop(e){requestAnimationFrame(e=>this.loop(e)),this.perf.beginFrame(e);let t=performance.now(),n=(e-this.lastTime)/1e3;this.lastTime=e,n>.25&&(n=.25),this.time+=n,this.frameCount++,this.fpsTimer+=n,this.fpsTimer>=.5&&(this.fps=Math.round(this.frameCount/this.fpsTimer),this.frameCount=0,this.fpsTimer=0,this.jsMs=this.jsAccum/Math.max(1,this.jsFrames),this.jsAccum=0,this.jsFrames=0);let r=this.input.locked&&!this.hud.screen;if(r){this.player.yaw-=this.input.mouseDX*Nh,this.player.pitch-=this.input.mouseDY*Nh;let e=Math.PI/2-.001;this.player.pitch>e&&(this.player.pitch=e),this.player.pitch<-e&&(this.player.pitch=-e),this.input.wheel!==0&&(this.inventory.selected=(this.inventory.selected+this.input.wheel+9)%9,this.audio.click())}this.accumulator+=n;let i=0;for(;this.accumulator>=.05&&i<5;)this.tick(r),this.accumulator-=Il,i++;i===5&&(this.accumulator=0);let a=this.accumulator/Il;this.updateInteraction(n,r);let o=this.player.eyePos(a,new I),s=this.player.viewBob(a,{tx:0,ty:0,roll:0,pitch:0});if(this.camera.position.copy(o),this.camera.rotation.set(this.player.pitch,this.player.yaw,0),this.viewBobbing){let e=new I(1,0,0).applyQuaternion(this.camera.quaternion),t=new I(0,1,0).applyQuaternion(this.camera.quaternion);this.camera.position.addScaledVector(e,s.tx).addScaledVector(t,s.ty),this.camera.rotation.z=s.roll,this.camera.rotation.x+=s.pitch}if(this.disasters){this.disasters.update(n,a,this.camera);let e=this.disasters.effects;e.shakeAmp>.001&&(this.camera.position.add(e.shakeOffset),this.camera.rotation.z+=e.shakeRot)}let c=this.player.sprinting?80.5:this.player.sneaking?70*.97:70;this.fovCurrent+=(c-this.fovCurrent)*Math.min(1,n*10),Math.abs(this.camera.fov-this.fovCurrent)>.01&&(this.camera.fov=this.fovCurrent,this.camera.updateProjectionMatrix(),this.hand.setFov(this.fovCurrent)),this.terrain.update(this.player.pos.x,this.player.pos.z,7),this.sky.update(n,this.camera.position,this.terrain.renderDistance,this.player.eyeUnderwater);let l=this.sky.skyLight,u=this.sky.fogNear,d=this.sky.fogFar,f=0,p=new I().copy(this.sky.skyTint),m=this.sky.fogColor.clone();if(this.disasters){let e=this.disasters.effects.override;l*=e.skyLightMul,p.multiply(e.tint),u*=e.fogNearMul,d*=e.fogFarMul,e.fogColor&&m.lerp(e.fogColor,1-e.fogFarMul*.5>.2?.8:.5),f=e.flash,f>0&&m.lerp(new R(e.flashColor.x,e.flashColor.y,e.flashColor.z),Math.min(1,f)),Math.abs(e.skyLightMul-1)>.01&&m.multiplyScalar(.55+.45*e.skyLightMul)}let h=new I(m.r,m.g,m.b);this.terrain.setLighting(l,p,h,u,d,f),Bd.uSkyLight.value=l,Bd.uSkyTint.value.copy(p),Bd.uFogColor.value.copy(h),Bd.uFogNear.value=u,Bd.uFogFar.value=d,Bd.uFlash.value=f,this.renderer.setClearColor(m),this.particles.update(n),this.drops.render(a,this.time,(e,t,n)=>this.world.sampleLight(e,t,n)),this.updateEntitiesFrame(n,a),this.updateSmoke(n),this.audio.setListener(o.x,o.y,o.z,this.player.yaw);let g=this.town?Math.hypot(o.x-this.town.saloonPos.x,o.z-this.town.saloonPos.z):999;this.audio.update(n,this.sky.dayFactor,g);let _=this.world.sampleLight(o.x,o.y,o.z),v=this.inventory.held;this.hand.update(n,v?v.id:0,_,s,this.viewBobbing),this.renderer.clear(),this.renderer.render(this.scene,this.camera),this.renderer.clearDepth(),this.renderer.render(this.hand.scene,this.hand.camera),this.perf.endRender(),this.hud.fps=this.fps,this.hud.render(this),this.input.endFrame(),this.jsAccum=(this.jsAccum||0)+(performance.now()-t),this.jsFrames=(this.jsFrames||0)+1,this.perf.setCounters({npcs:this.npcs?this.npcs.list.length:0,animals:this.animals?this.animals.list.length:0,particles:this.particles.count,drops:this.drops.items.length,chunks:this.terrain.stats.chunks,meshes:this.terrain.stats.meshed,debris:this.disasters?this.disasters.debris.count:0,journal:this.disasters?this.disasters.journal.size:0,disaster:this.disasters?`${this.disasters.state}${this.disasters.activeType?`:`+this.disasters.activeType:``}`:`n/a`,remotePlayers:this.net?this.net.stats.players:0}),this.net&&Object.assign(this.perf.net,{bytesIn:this.net.stats.bytesIn,bytesOut:this.net.stats.bytesOut,msgsIn:this.net.stats.msgsIn,msgsOut:this.net.stats.msgsOut}),this.perf.endFrame(),this.debugLog&&this.logDebug(n)}logDebug(e){if(this.logTimer=(this.logTimer||0)+e,this.logTimer<5||(this.logTimer=0,!this.npcs))return;let t={},n=0;for(let e of this.npcs.list)t[e.state]=(t[e.state]||0)+1,e._lastLog&&Math.hypot(e.pos.x-e._lastLog.x,e.pos.z-e._lastLog.z)>1&&n++,e._lastLog={x:e.pos.x,z:e.pos.z};let r=this.npcs.list.slice(0,4).map(e=>`${e.name}@${e.pos.x.toFixed(1)},${e.pos.y.toFixed(1)},${e.pos.z.toFixed(1)}:${e.state}${e.target?`->`+e.target.kind:``}`).join(` | `);console.log(`[dbg] t=${this.sky.clockString()} fps=${this.fps} js=${(this.jsMs||0).toFixed(1)}ms chunks=${this.terrain.stats.chunks} meshes=${this.terrain.stats.meshed} npcs=${JSON.stringify(t)} moved5s=${n} pathQ=${this.npcs.pathQueue.length} train=${this.train?this.train.state+`@`+this.train.x.toFixed(0):`-`} | ${r}`)}updateEntitiesFrame(e,t){this.npcs&&this.npcs.render(t,e,this.camera),this.animals&&this.animals.render(t,e,this.camera),this.train&&this.train.render(t,e),this.net&&this.net.update(e,t),this.adminPanel&&this.adminPanel.isOpen&&this.adminPanel.update()}updateSmoke(e){if(this.smokeTimer=(this.smokeTimer||0)+e,this.smokeTimer<.12)return;this.smokeTimer=0;let t=this.player.pos;for(let e of this.smokeSources)(e.x-t.x)**2+(e.z-t.z)**2>14400||Math.random()<.7&&this.particles.smoke(e.x+.5,e.y+1,e.z+.5);if(this.sky.dayFactor>.3&&Math.random()<.6){let e=Math.floor(t.x+(Math.random()-.5)*30),n=Math.floor(t.z+(Math.random()-.5)*30),r=this.world.surfaceY(e,n),i=this.world.getBlock(e,r,n);(i===W.MUD||i===W.DIRT_PATH||i===W.COARSE_DIRT||i===W.SAND)&&this.particles.dust(e+Math.random(),r+1,n+Math.random())}}tick(e){let t=this.input,n={forward:0,strafe:0,jump:!1,sneak:!1,sprint:!1};e&&(t.isDown(`KeyW`)&&(n.forward+=1),t.isDown(`KeyS`)&&--n.forward,t.isDown(`KeyA`)&&--n.strafe,t.isDown(`KeyD`)&&(n.strafe+=1),n.jump=t.isDown(`Space`),n.sneak=t.isDown(`ShiftLeft`)||t.isDown(`ShiftRight`),t.isDown(`KeyW`)||(this.doubleTapSprint=!1),n.sprint=t.isDown(`KeyR`)||this.doubleTapSprint),this.player.tick(n);for(let e of this.player.events)this.handlePlayerEvent(e);this.player.events.length=0,this.player.dead&&this.hud.screen!==`death`&&this.openScreen(`death`);let r=this.drops.tick(this.player.box,this.player.pos);for(let e of r)this.inventory.add(e.id,e.count),this.audio.pop(),this.hud.xp=Math.min(1,this.hud.xp+.01);this.npcs&&this.npcs.tick(this.player,this.sky),this.animals&&this.animals.tick(this.player,this.sky),this.train&&this.train.tick(this.player),this.disasters&&!(this.net&&this.net.connected&&this.net.drivesDisasterClock)&&this.disasters.simTick(),this.net&&this.net.tick(),this.breakCooldown>0&&(this.breakCooldown-=Il),this.placeCooldown>0&&(this.placeCooldown-=Il)}handlePlayerEvent(e){switch(e.type){case`step`:e.inWater?this.audio.swim():this.audio.step(G[e.block].sound);break;case`land`:this.audio.step(G[e.block].sound,null,1.3);break;case`fallhurt`:this.audio.hurt(),this.audio.step(`stone`,null,1.4);break;case`hurt`:this.audio.hurt();break;case`death`:this.hud.addMessage(`You died!`)}}updateInteraction(e,t){let n=this.player,r=n.eyePos(1,new I),i=n.forwardDir(new I),a=t&&!n.dead?em(this.world,r,i,Fl):null;this.lookingAtName=null;let o=null;if(this.npcs&&t&&(o=this.npcs.raycast(r,i,a?a.dist:Fl+1.5),o&&(this.lookingAtName=o.npc.name,a&&o.dist<a.dist&&(a=null))),!o&&this.animals&&t){let e=this.animals.raycast(r,i,a?a.dist:Fl+1.5);e&&(this.lookingAtName=e.name)}if(this.highlight.update(this.world,a),this.lastHit=a,t&&this.input.mouseDown[0]&&!n.dead){if(a){let t=G[a.id];(!this.breakTarget||this.breakTarget.x!==a.x||this.breakTarget.y!==a.y||this.breakTarget.z!==a.z)&&(this.breakTarget={x:a.x,y:a.y,z:a.z},this.breakProgress=0,this.hitSoundTimer=0),this.hand.startSwing(),this.breakCooldown<=0&&t.hardness!==1/0&&(this.breakProgress+=e/t.hardness,this.hitSoundTimer-=e,this.hitSoundTimer<=0&&(this.hitSoundTimer=.25,this.audio.hit(t.sound,a.point),this.particles.blockHit(a,a.id)),this.breakProgress>=1&&this.breakBlock(a))}else this.breakTarget=null,this.breakProgress=0,this.input.mouseClicked[0]&&(this.hand.startSwing(),o&&this.npcs.poke(o.npc,this))}else this.breakTarget=null,this.breakProgress=0;this.crack.show(this.breakTarget?a:null,this.breakProgress),t&&!n.dead&&(this.input.mouseClicked[2]||this.input.mouseDown[2]&&this.placeCooldown<=0)&&(o&&!a?(this.npcs.talk(o.npc,this),this.hand.startSwing(),this.placeCooldown=.5):a&&this.placeBlock(a),this.placeCooldown=this.input.mouseClicked[2]?.25:.2)}breakBlock(e){let t=G[e.id],n=this.world;if(this.particles.blockBreak(e.x,e.y,e.z,e.id),this.audio.breakBlock(t.sound,e.point),n.setBlock(e.x,e.y,e.z,W.AIR),t.shape===U.DOOR&&(G[n.getBlock(e.x,e.y+1,e.z)].shape===U.DOOR&&n.setBlock(e.x,e.y+1,e.z,W.AIR),G[n.getBlock(e.x,e.y-1,e.z)].shape===U.DOOR&&n.setBlock(e.x,e.y-1,e.z,W.AIR)),t.shape===U.BED){let t=e.id===W.BED_HEAD?W.BED_FOOT:W.BED_HEAD;for(let[r,i]of[[1,0],[-1,0],[0,1],[0,-1]])if(n.getBlock(e.x+r,e.y,e.z+i)===t){n.setBlock(e.x+r,e.y,e.z+i,W.AIR);break}}let r=G[n.getBlock(e.x,e.y+1,e.z)];(r.shape===U.CROSS||r.shape===U.TORCH||r.shape===U.LANTERN&&!G[n.getBlock(e.x,e.y+2,e.z)].solid)&&(n.setBlock(e.x,e.y+1,e.z,W.AIR),r.drop&&this.drops.spawn(r.drop,e.x+.5,e.y+1.2,e.z+.5)),t.drop&&this.drops.spawn(t.drop,e.x+.5,e.y+.3,e.z+.5),this.terrain.remeshDirtyNear(this.player.pos.x,this.player.pos.z),this.breakProgress=0,this.breakTarget=null,this.breakCooldown=.25,this.hud.xp=Math.min(1,this.hud.xp+.004),this.npcs&&this.npcs.onWorldChanged(e.x,e.y,e.z),this.onPlayerEdit(e.x,e.y,e.z,W.AIR)}onPlayerEdit(e,t,n,r){this.save&&this.save.recordEdit(e,t,n,r),this.net&&this.net.connected&&this.net.sendBlock(e,t,n,r)}placeBlock(e){let t=this.inventory.held;if(!t)return;let n=this.world,r=G[e.id],i=e.x,a=e.y,o=e.z;if(!r.replaceable){let t=tm[e.face];i+=t[0],a+=t[1],o+=t[2]}if(!im(n,i,a,o)||!n.isLoaded(i,o))return;let s=nm(t.id,e),c=G[s],l=[this.player.box];if(this.npcs&&this.npcs.collectBoxes(l,i,o),this.animals&&this.animals.collectBoxes(l,i,o),!rm(s,i,a,o,l)){if(c.shape===U.DOOR){if(!im(n,i,a+1,o))return;n.setBlock(i,a,o,s),n.setBlock(i,a+1,o,s)}else if(c.shape===U.BED){let e=this.player.forwardDir(new I),t=Math.abs(e.x)>Math.abs(e.z)?Math.sign(e.x):0,r=t===0?Math.sign(e.z)||1:0;if(!im(n,i+t,a,o+r)||rm(W.BED_FOOT,i+t,a,o+r,l))return;n.setBlock(i,a,o,W.BED_FOOT),n.setBlock(i+t,a,o+r,W.BED_HEAD)}else if(c.shape===U.TORCH||c.shape===U.CROSS){if(!G[n.getBlock(i,a-1,o)].solid)return;n.setBlock(i,a,o,s)}else if(c.shape===U.LANTERN){if(!G[n.getBlock(i,a-1,o)].solid&&!G[n.getBlock(i,a+1,o)].solid)return;n.setBlock(i,a,o,s)}else if(c.shape===U.WALL_SIGN){let e=!1;for(let[t,r]of[[1,0],[-1,0],[0,1],[0,-1]])G[n.getBlock(i+t,a,o+r)].solid&&(e=!0);if(!e)return;n.setBlock(i,a,o,s)}else n.setBlock(i,a,o,s);this.inventory.consume(this.inventory.selected,1),this.audio.placeBlock(c.sound,new I(i+.5,a+.5,o+.5)),this.hand.startSwing(),this.terrain.remeshDirtyNear(this.player.pos.x,this.player.pos.z),this.npcs&&this.npcs.onWorldChanged(i,a,o),this.onPlayerEdit(i,a,o,this.world.getBlock(i,a,o)),c.shape===U.DOOR&&this.onPlayerEdit(i,a+1,o,this.world.getBlock(i,a+1,o))}}debugLines(){let e=this.player.pos,t=Math.floor(e.x),n=Math.floor(e.y),r=Math.floor(e.z),i=[`south (+z)`,`west (-x)`,`north (-z)`,`east (+x)`][Math.round((this.player.yaw%(Math.PI*2)+Math.PI*2)/(Math.PI/2))%4],a=[`Frontier Craft  ${this.fps} fps  (js ${(this.jsMs||0).toFixed(1)} ms)  T: ${this.terrain.stats.meshed} meshes / ${this.terrain.stats.chunks} chunks`,`XYZ: ${e.x.toFixed(3)} / ${e.y.toFixed(3)} / ${e.z.toFixed(3)}`,`Block: ${t} ${n} ${r}   Chunk: ${t>>4} ${r>>4}`,`Facing: ${i}  (yaw ${(this.player.yaw*180/Math.PI).toFixed(1)} / pitch ${(this.player.pitch*180/Math.PI).toFixed(1)})`,`Light: sky ${this.world.getSky(t,n,r)} block ${this.world.getLight(t,n,r)}   Time: ${this.sky.clockString()}`,`Speed: ${(Math.hypot(this.player.vel.x,this.player.vel.z)*20).toFixed(2)} m/s  ground ${this.player.onGround} sprint ${this.player.sprinting}`];return this.npcs&&a.push(`NPCs: ${this.npcs.list.length}  Animals: ${this.animals?this.animals.list.length:0}  Particles: ${this.particles.count}`),a.push(...this.perf.lines()),a}},Fh=document.getElementById(`error`);function Ih(e){Fh.style.display=`block`,Fh.textContent+=e+`
`}window.addEventListener(`error`,e=>Ih(e.error&&e.error.stack||e.message)),window.addEventListener(`unhandledrejection`,e=>Ih(`Unhandled rejection: `+(e.reason&&e.reason.stack?e.reason.stack:e.reason)));var Lh=new Ph;window.game=Lh,Lh.start().catch(e=>Ih(e.stack||String(e)));